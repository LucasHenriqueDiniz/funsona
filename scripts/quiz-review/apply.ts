import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import { config } from "dotenv";

config();

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const reportFlag = args.indexOf("--report");
const onlyIdFlag = args.indexOf("--only-id");
const isDryRun = args.includes("--dry-run");
const skipNoImage = args.includes("--skip-no-image");

if (reportFlag === -1 || !args[reportFlag + 1]) {
  console.error("❌ Usage: tsx apply.ts --report <path> [--dry-run] [--only-id <uuid>] [--skip-no-image]");
  process.exit(1);
}

const reportPath = args[reportFlag + 1];
const onlyId = onlyIdFlag !== -1 ? args[onlyIdFlag + 1] : null;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewResult {
  quiz_id: string;
  quiz_slug: string;
  quiz_title: string;
  quiz_type: string;
  quiz_status: string;
  issues: string[];
  missing_images: {
    cover: boolean;
    questions: string[];
    options: string[];
    outcomes: string[];
  };
  suggestions: {
    title: string;
    description: string;
    questions: Array<{
      id: string;
      text: string;
      options: Array<{ id: string; text: string }>;
    }>;
    outcomes: Array<{ key: string; title: string; description: string }>;
  };
  score: number;
  summary: string;
  error?: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const raw = await fs.readFile(reportPath, "utf-8");
  let results: ReviewResult[] = JSON.parse(raw);

  if (onlyId) {
    results = results.filter((r) => r.quiz_id === onlyId);
    if (results.length === 0) {
      console.error(`❌ Quiz ID "${onlyId}" não encontrado no relatório`);
      process.exit(1);
    }
  }

  if (skipNoImage) {
    results = results.filter(
      (r) =>
        !r.missing_images.cover ||
        r.issues.some((i) => !i.toLowerCase().includes("imagem"))
    );
  }

  // Skip quizzes that had errors during review
  const toProcess = results.filter((r) => !r.error);
  const skipped = results.filter((r) => r.error);

  console.log(`📋 ${toProcess.length} quizzes para processar${isDryRun ? " (DRY RUN — nada será salvo)" : ""}`);
  if (skipped.length) console.log(`⏭️  ${skipped.length} pulados (erro na revisão)`);
  if (onlyId) console.log(`🎯 Modo: apenas ID ${onlyId}`);
  console.log("");

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let applied = 0;
  let failed = 0;

  for (const result of toProcess) {
    const prefix = `[${applied + failed + 1}/${toProcess.length}]`;
    console.log(`${prefix} "${result.quiz_title}" (score ${result.score}/10)`);

    // Fetch current quiz content to merge suggestions into it
    const { data: current, error: fetchError } = await db
      .from("quizzes")
      .select("content")
      .eq("id", result.quiz_id)
      .single();

    if (fetchError || !current) {
      console.log(`  ❌ Erro ao buscar quiz: ${fetchError?.message}`);
      failed++;
      continue;
    }

    // Merge suggested question/option texts into current content
    const updatedContent = { ...current.content };
    const questionMap = new Map(result.suggestions.questions.map((q) => [q.id, q]));
    const outcomeMap = new Map(result.suggestions.outcomes.map((o) => [o.key, o]));

    updatedContent.questions = updatedContent.questions.map((q: any) => {
      const suggested = questionMap.get(q.id);
      if (!suggested) return q;

      const optionMap = new Map(suggested.options.map((o) => [o.id, o]));
      return {
        ...q,
        text: suggested.text,
        options: q.options.map((o: any) => {
          const suggestedOpt = optionMap.get(o.id);
          return suggestedOpt ? { ...o, text: suggestedOpt.text } : o;
        }),
      };
    });

    if (updatedContent.outcomes && result.suggestions.outcomes.length > 0) {
      updatedContent.outcomes = updatedContent.outcomes.map((o: any) => {
        const suggested = outcomeMap.get(o.key);
        return suggested ? { ...o, title: suggested.title, description: suggested.description } : o;
      });
    }

    const patch: Record<string, any> = {
      title: result.suggestions.title,
      description: result.suggestions.description,
      content: updatedContent,
    };

    // Log what would change
    const titleChanged = result.suggestions.title !== result.quiz_title;
    const questionsChanged = result.suggestions.questions.length > 0;
    const outcomesChanged = result.suggestions.outcomes.length > 0;
    console.log(`  📝 Título: ${titleChanged ? `"${result.quiz_title}" → "${result.suggestions.title}"` : "sem alteração"}`);
    console.log(`  📝 Perguntas: ${questionsChanged ? `${result.suggestions.questions.length} melhoradas` : "sem alteração"}`);
    if (outcomesChanged) console.log(`  📝 Outcomes: ${result.suggestions.outcomes.length} melhorados`);

    if (isDryRun) {
      console.log(`  ✅ [DRY RUN] pulando gravação\n`);
      applied++;
      continue;
    }

    const { error: updateError } = await db
      .from("quizzes")
      .update(patch)
      .eq("id", result.quiz_id);

    if (updateError) {
      console.log(`  ❌ Erro ao atualizar: ${updateError.message}\n`);
      failed++;
    } else {
      console.log(`  ✅ Atualizado com sucesso\n`);
      applied++;
    }
  }

  console.log("─".repeat(50));
  console.log(`✅ Aplicados: ${applied} | ❌ Falhas: ${failed} | ⏭️  Pulados: ${skipped.length}`);
  if (isDryRun) console.log("\n💡 Rode sem --dry-run para aplicar as mudanças.");
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
