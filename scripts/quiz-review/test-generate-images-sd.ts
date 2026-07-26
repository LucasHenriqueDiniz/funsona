import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

config();

const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SD_URL = "http://127.0.0.1:7860"; // Forge API: /sdapi/v1/txt2img
const QUIZ_ID = "3918ecda-7185-4a14-9d25-548a54858a5f";
const BASE_DIR = path.join(process.cwd(), "refactored-quizzes", QUIZ_ID);

const NEGATIVE_PROMPT = "text, words, letters, watermark, low quality, blurry, deformed";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateImageSD(prompt: string, type: string, itemId: string): Promise<string> {
  console.log(`  🎨 Gerando ${type}/${itemId}...`);

  const res = await fetch(`${SD_URL}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      steps: 20,
      width: 1024,
      height: 1024,
      cfg_scale: 7,
      sampler_name: "DPM++ 2M Karras",
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(180000), // 3min timeout
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SD HTTP ${res.status}: ${err.slice(0, 100)}`);
  }

  const data = (await res.json()) as any;
  const b64 = data.images?.[0];
  if (!b64) throw new Error("SD não retornou imagem");

  const buffer = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");

  let localPath: string;
  if (type === "banner") {
    localPath = path.join(BASE_DIR, "banner.png");
  } else if (type.startsWith("question")) {
    await ensureDir(path.join(BASE_DIR, "questions"));
    localPath = path.join(BASE_DIR, "questions", `${itemId}.png`);
  } else if (type.startsWith("outcome")) {
    await ensureDir(path.join(BASE_DIR, "outcomes"));
    localPath = path.join(BASE_DIR, "outcomes", `${itemId}.png`);
  } else {
    localPath = path.join(BASE_DIR, `${type}_${itemId}.png`);
  }

  await fs.writeFile(localPath, buffer);
  console.log(`    ✅ Salvo: ${path.relative(process.cwd(), localPath)}`);
  return localPath;
}

async function main() {
  const { data: quiz } = await supa.from("quizzes").select("*").eq("id", QUIZ_ID).single();

  if (!quiz) {
    console.error("❌ Quiz não encontrado");
    process.exit(1);
  }

  console.log(`\n🧪 TEST: Gerando 6 imagens via Stable Diffusion Local\n`);
  console.log(`   Quiz: "${quiz.title}"`);
  console.log(`   ID: ${QUIZ_ID}`);
  console.log(`   Destino: ${BASE_DIR}\n`);

  let generated = 0;
  let failed = 0;

  // 1. BANNER
  try {
    const prompt = `Digital illustration for a personality quiz: "${quiz.title}". Theme: ${(quiz.description || "").slice(0, 100)}. Style: vibrant, colorful, flat design, fun.`;
    await generateImageSD(prompt, "banner", "cover");
    generated++;
  } catch (e: any) {
    console.log(`    ❌ ${e.message}`);
    failed++;
  }

  // 2-4. QUESTIONS (3)
  const questions = quiz.content?.questions || [];
  for (let i = 0; i < Math.min(questions.length, 3); i++) {
    const q = questions[i];
    try {
      const prompt = `Personality quiz illustration for: "${q.title}". Quiz about pasta types and personality. Colorful, engaging, flat design.`;
      await generateImageSD(prompt, "question", `q${i + 1}`);
      generated++;
    } catch (e: any) {
      console.log(`    ❌ ${e.message}`);
      failed++;
    }
  }

  // 5-7. OUTCOMES (3)
  const outcomes = quiz.content?.outcomes || [];
  for (let i = 0; i < Math.min(outcomes.length, 3); i++) {
    const o = outcomes[i];
    try {
      const prompt = `Personality result illustration: "${o.title}". ${(o.description || "").slice(0, 80)}. Colorful, cheerful, flat design, fun.`;
      await generateImageSD(prompt, "outcome", `outcome${i + 1}`);
      generated++;
    } catch (e: any) {
      console.log(`    ❌ ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ ${generated} imagens geradas | ❌ ${failed} falhas`);
  console.log(`\n📁 Pasta: ${BASE_DIR}\n`);
}

main().catch(console.error);
