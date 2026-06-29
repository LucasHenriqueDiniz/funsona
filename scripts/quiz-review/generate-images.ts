import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
config();

// ─── CLI args ─────────────────────────────────────────────────────────────────
// tsx generate-images.ts                     → processa todos os reviewed.json
// tsx generate-images.ts --batch 1           → só o batch 1
// tsx generate-images.ts --only-id <uuid>    → só um quiz
// tsx generate-images.ts --dry-run           → mostra o que geraria, sem gerar
// tsx generate-images.ts --covers-only       → só capas (padrão)
// tsx generate-images.ts --all-types         → capas + outcomes

const args        = process.argv.slice(2);
const batchArg    = args.indexOf("--batch");
const idArg       = args.indexOf("--only-id");
const DRY_RUN     = args.includes("--dry-run");
const ALL_TYPES   = args.includes("--all-types");
const ONLY_BATCH  = batchArg !== -1 ? parseInt(args[batchArg + 1]) : null;
const ONLY_ID     = idArg   !== -1 ? args[idArg + 1] : null;

const SUPABASE_URL              = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY            = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY;

// DALL-E 3 dimensions
const IMAGE_SIZE    = "1792x1024" as const; // wide for covers
const IMAGE_QUALITY = "standard" as const;  // standard = ~$0.04/img; hd = ~$0.08/img
const IMAGE_STYLE   = "vivid" as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewEntry {
  id: string;
  new_title: string;
  new_description: string;
  score: number;
  missing_images?: {
    cover: boolean;
    questions: string[];
    options: string[];
    outcomes: string[];
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildCoverPrompt(title: string, description: string): string {
  // Extract key theme from title/description for a clean visual prompt
  return [
    `Digital illustration for a quiz titled: "${title}".`,
    `Theme context: ${description.slice(0, 200)}.`,
    `Style: clean, colorful, engaging, flat design with bold shapes.`,
    `No text, no letters, no words in the image.`,
    `Aspect ratio: wide banner, vibrant colors, suitable as a quiz cover image.`,
  ].join(" ");
}

function buildOutcomePrompt(title: string, description: string): string {
  return [
    `Digital illustration representing a personality quiz result: "${title}".`,
    `${description.slice(0, 150)}.`,
    `Style: friendly, colorful, flat design. No text in the image.`,
  ].join(" ");
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────

async function uploadToStorage(
  db: ReturnType<typeof createClient>,
  bucket: string,
  filePath: string,
  fileBuffer: Buffer,
  mimeType = "image/png"
): Promise<string> {
  const { data, error } = await db.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload error: ${error.message}`);

  const { data: urlData } = db.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── Image generation ─────────────────────────────────────────────────────────

async function generateAndUpload(
  openai: OpenAI,
  db: ReturnType<typeof createClient>,
  prompt: string,
  storagePath: string,
  bucket: string
): Promise<string> {
  // Generate image with DALL-E 3
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY,
    style: IMAGE_STYLE,
    response_format: "url",
  });

  const imageUrl = response.data[0]?.url;
  if (!imageUrl) throw new Error("DALL-E não retornou URL de imagem");

  // Download image
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Falha ao baixar imagem: ${imgResponse.status}`);
  const buffer = Buffer.from(await imgResponse.arrayBuffer());

  // Upload to Supabase Storage
  return await uploadToStorage(db, bucket, storagePath, buffer, "image/png");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  if (!OPENAI_API_KEY && !DRY_RUN) {
    console.error("❌ Missing OPENAI_API_KEY no .env (necessário para gerar imagens com DALL-E 3)");
    console.error("   Adicione: OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // ── Coletar todos reviewed.json ─────────────────────────────────────────────
  const batchesDir = path.join(process.cwd(), "batches");
  const files = await fs.readdir(batchesDir).catch(() => [] as string[]);

  let reviewedFiles = files.filter((f) => f.endsWith("reviewed.json"));

  if (ONLY_BATCH !== null) {
    const bId = String(ONLY_BATCH).padStart(3, "0");
    reviewedFiles = reviewedFiles.filter((f) => f.includes(`B${bId}`));
  }

  if (!reviewedFiles.length) {
    console.log("⚠️  Nenhum *reviewed.json encontrado em batches/");
    return;
  }

  console.log(`\n🎨 Funsona Image Generator`);
  console.log(`   ${reviewedFiles.length} arquivo(s) reviewed.json`);
  if (DRY_RUN) console.log("   🔍 DRY RUN — nenhuma imagem será gerada");

  // ── Coletar quizzes que precisam de imagem ──────────────────────────────────
  const needsCover: Array<{ id: string; title: string; description: string }> = [];

  for (const file of reviewedFiles.sort()) {
    const raw = await fs.readFile(path.join(batchesDir, file), "utf-8");
    const entries: ReviewEntry[] = JSON.parse(
      raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim()
    );

    for (const entry of entries) {
      if (ONLY_ID && entry.id !== ONLY_ID) continue;

      if (entry.missing_images?.cover) {
        needsCover.push({
          id: entry.id,
          title: entry.new_title,
          description: entry.new_description,
        });
      }
    }
  }

  console.log(`\n📊 Precisam de capa: ${needsCover.length} quizzes`);
  if (DRY_RUN) {
    needsCover.slice(0, 10).forEach(({ id, title }) => console.log(`   - "${title}" (${id})`));
    if (needsCover.length > 10) console.log(`   ... e mais ${needsCover.length - 10}`);
    const costEstimate = (needsCover.length * 0.04).toFixed(2);
    console.log(`\n💰 Custo estimado (DALL-E 3 standard): ~$${costEstimate}`);
    console.log(`\n💡 Rode sem --dry-run para gerar as imagens.`);
    return;
  }

  // ── Verificar bucket de storage ─────────────────────────────────────────────
  const BUCKET = "quiz-images";
  const { data: buckets } = await db.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);

  if (!bucketExists) {
    console.log(`\n⚠️  Bucket "${BUCKET}" não encontrado no Supabase Storage.`);
    console.log(`   Crie o bucket em: Supabase Dashboard → Storage → New bucket → "${BUCKET}"`);
    console.log(`   (público, 5MB max, image/*)`);
    process.exit(1);
  }

  // ── Gerar e salvar imagens ──────────────────────────────────────────────────
  let generated = 0, failed = 0;
  const COST_PER_IMAGE = 0.04; // DALL-E 3 standard

  for (let i = 0; i < needsCover.length; i++) {
    const { id, title, description } = needsCover[i];
    const prefix = `[${i + 1}/${needsCover.length}]`;
    console.log(`${prefix} "${title}"`);

    const prompt = buildCoverPrompt(title, description);
    const storagePath = `covers/${id}.png`;

    try {
      const publicUrl = await generateAndUpload(openai, db, prompt, storagePath, BUCKET);

      // Update quiz record
      const { error: updateErr } = await db
        .from("quizzes")
        .update({ cover_url: publicUrl })
        .eq("id", id);

      if (updateErr) {
        console.log(`  ❌ Erro ao salvar URL: ${updateErr.message}`);
        failed++;
      } else {
        console.log(`  ✅ ${publicUrl}`);
        generated++;
      }
    } catch (e: any) {
      console.log(`  ❌ ${e.message}`);
      failed++;

      // If rate limited, wait before continuing
      if (e.message?.includes("rate") || e.status === 429) {
        console.log("  ⏳ Rate limit — aguardando 60s...");
        await new Promise((r) => setTimeout(r, 60_000));
      }
    }

    // Small delay between images
    if (i < needsCover.length - 1) await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ ${generated} geradas | ❌ ${failed} falhas`);
  console.log(`💰 Custo real: ~$${(generated * COST_PER_IMAGE).toFixed(2)}`);
}

main().catch(console.error);
