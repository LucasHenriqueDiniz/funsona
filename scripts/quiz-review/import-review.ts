import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
config();

// ─── CLI args ─────────────────────────────────────────────────────────────────
// Usage:
//   tsx import-review.ts --batch 1                   → finds the file automatically
//   tsx import-review.ts --file batches/foo.json     → a specific file
//   Get-Clipboard | tsx import-review.ts --stdin     → pastes JSON from the clipboard
//   All of them accept: --dry-run  --only-id <uuid>

const args      = process.argv.slice(2);
const fileIdx   = args.indexOf("--file");
const batchIdx  = args.indexOf("--batch");
const idIdx     = args.indexOf("--only-id");
const DRY_RUN   = args.includes("--dry-run");
const USE_STDIN = args.includes("--stdin");
const ONLY_ID   = idIdx !== -1 ? args[idIdx + 1] : null;

const SUPABASE_URL              = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewEntry {
  id: string;
  new_title: string;
  new_description: string;
  score: number;
  issues: string[];
  missing_images?: { cover: boolean; questions: string[]; options: string[]; outcomes: string[] };
  new_questions: Array<{ id: string; text: string; options: Array<{ id: string; text: string }> }>;
  new_outcomes?: Array<{ key: string; title: string; description: string }>;
  summary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

async function findBatchFile(batchNum: number): Promise<string> {
  const batchesDir = path.join(process.cwd(), "batches");
  const padded = String(batchNum).padStart(3, "0");
  const entries = await fs.readdir(batchesDir).catch(() => [] as string[]);
  const matches = entries
    .filter((f) => f.includes(`B${padded}`) && f.endsWith("reviewed.json"))
    .sort();

  if (matches.length === 0) {
    console.error(`\n❌ No file found for batch ${batchNum}`);
    console.error(`   Looked in: batches/*B${padded}*reviewed.json`);
    console.error(`\n   Paste GPT's response and save it as:`);
    console.error(`   batches/funsona-quizzes-B${padded}de???-????-??-??-reviewed.json`);
    console.error(`\n   Or paste straight from the clipboard:`);
    console.error(`   Get-Clipboard | npx tsx import-review.ts --stdin --dry-run`);
    process.exit(1);
  }

  if (matches.length > 1) {
    console.log(`⚠️  Several files — using the most recent: ${matches.at(-1)}`);
  }
  return path.join(batchesDir, matches.at(-1)!);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  // ── Resolver fonte do JSON ────────────────────────────────────────────────────

  let raw: string;
  let sourceName: string;

  if (USE_STDIN) {
    console.log("📋 Lendo JSON do stdin...");
    raw = await readStdin();
    sourceName = "stdin";
    if (!raw.trim()) { console.error("❌ No data received."); process.exit(1); }
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    const filePath = args[fileIdx + 1];
    raw = await fs.readFile(filePath, "utf-8");
    sourceName = path.basename(filePath);
  } else if (batchIdx !== -1 && args[batchIdx + 1]) {
    const filePath = await findBatchFile(parseInt(args[batchIdx + 1]));
    raw = await fs.readFile(filePath, "utf-8");
    sourceName = path.basename(filePath);
  } else {
    console.error("❌ Usage:");
    console.error("   tsx import-review.ts --batch 1              → finds the file automatically");
    console.error("   tsx import-review.ts --file batches/foo.json");
    console.error("   Get-Clipboard | tsx import-review.ts --stdin");
    console.error("   All of them accept: --dry-run  --only-id <uuid>");
    process.exit(1);
  }

  // Strip markdown fences, in case GPT wrapped it in ```json
  raw = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();

  let entries: ReviewEntry[] = JSON.parse(raw);
  console.log(`📂 ${entries.length} entradas de: ${sourceName}`);

  if (ONLY_ID) {
    entries = entries.filter((e) => e.id === ONLY_ID);
    if (!entries.length) { console.error(`❌ ID "${ONLY_ID}" not found`); process.exit(1); }
  }

  if (DRY_RUN) console.log("🔍 DRY RUN — nothing will be saved\n");

  // ── Flag the quizzes recommended for unpublishing ───────────────────────────

  const toUnpublish = entries.filter((e) =>
    e.issues?.some((i) => i.includes("RECOMENDO_DESPUBLICAR"))
  );
  if (toUnpublish.length) {
    console.log(`\n⚠️  ${toUnpublish.length} quiz(zes) recommended for UNPUBLISHING:`);
    toUnpublish.forEach((e) => console.log(`   - "${e.new_title}" (${e.id})`));
    console.log("");
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let applied = 0, failed = 0, skipped = 0;

  for (const entry of entries) {
    const num = applied + failed + skipped + 1;
    const prefix = `[${num}/${entries.length}]`;

    if (!entry.id || !entry.new_title) {
      console.log(`${prefix} ⏭️  invalid entry, skipping`);
      skipped++; continue;
    }

    const { data: current, error: fetchErr } = await db
      .from("quizzes")
      .select("title, description, content")
      .eq("id", entry.id)
      .single();

    if (fetchErr || !current) {
      console.log(`${prefix} ❌ Quiz ${entry.id} not found`);
      failed++; continue;
    }

    // ── Merge textos melhorados no content ────────────────────────────────────
    const updatedContent = structuredClone(current.content);
    const qMap = new Map((entry.new_questions ?? []).map((q) => [q.id, q]));
    const oMap = new Map((entry.new_outcomes  ?? []).map((o) => [o.key, o]));

    // The DB uses question.title + answer.label (schema migrated from v1)
    updatedContent.questions = (updatedContent.questions ?? []).map((q: any) => {
      const sq = qMap.get(q.id);
      if (!sq) return q;
      const optMap = new Map(sq.options.map((o: any) => [o.id, o]));
      return {
        ...q,
        title: sq.text,
        answers: (q.answers ?? []).map((a: any) => {
          const so = optMap.get(a.id);
          return so ? { ...a, label: so.text } : a;
        }),
      };
    });

    if (updatedContent.outcomes?.length && entry.new_outcomes?.length) {
      updatedContent.outcomes = updatedContent.outcomes.map((o: any) => {
        const so = oMap.get(o.key);
        return so ? { ...o, title: so.title, description: so.description } : o;
      });
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    console.log(`${prefix} "${current.title}" → score ${entry.score}/10`);
    if (entry.new_title !== current.title)
      console.log(`  📝 "${current.title}" → "${entry.new_title}"`);
    if ((entry.new_questions ?? []).length)
      console.log(`  📝 ${entry.new_questions.length} questions improved`);
    const flagged = entry.issues?.filter((i) => i.includes("RECOMENDO_DESPUBLICAR")).length;
    if (flagged) console.log(`  🚨 RECOMENDADO DESPUBLICAR`);
    else if (entry.issues?.length)
      console.log(`  ⚠️  ${entry.issues.length} issues`);

    if (DRY_RUN) { console.log(`  ✅ [DRY RUN]\n`); applied++; continue; }

    // ── Save ──────────────────────────────────────────────────────────────────
    const { error: updateErr } = await db
      .from("quizzes")
      .update({ title: entry.new_title, description: entry.new_description, content: updatedContent })
      .eq("id", entry.id);

    if (updateErr) { console.log(`  ❌ ${updateErr.message}\n`); failed++; }
    else           { console.log(`  ✅ Saved\n`); applied++; }
  }

  console.log("─".repeat(50));
  console.log(`✅ ${applied} applied | ❌ ${failed} failed | ⏭️  ${skipped} skipped`);
  if (toUnpublish.length) console.log(`🚨 ${toUnpublish.length} quiz(zes) to unpublish by hand`);
  if (DRY_RUN) console.log("\n💡 Run without --dry-run to save.");
}

main().catch(console.error);
