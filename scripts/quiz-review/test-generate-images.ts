import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const QUIZ_ID = "3918ecda-7185-4a14-9d25-548a54858a5f";
const BASE_DIR = path.join(process.cwd(), "refactored-quizzes", QUIZ_ID);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateImage(prompt: string, type: string, itemId: string): Promise<string> {
  console.log(`  🎨 Gerando ${type}/${itemId}...`);

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt.slice(0, 1000),
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const imageUrl = response.data[0]?.url;
  if (!imageUrl) throw new Error("DALL-E não retornou URL");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Falha ao baixar: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

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

  console.log(`\n🧪 TEST: Gerando 15 imagens para "${quiz.title}"\n`);
  console.log(`   ID: ${QUIZ_ID}`);
  console.log(`   Destino: ${BASE_DIR}\n`);

  let generated = 0;
  let failed = 0;

  // 1. BANNER
  try {
    const prompt = `Digital illustration for a personality quiz: "${quiz.title}". Theme: ${(quiz.description || "").slice(0, 150)}. Style: vibrant, engaging, flat design, no text.`;
    await generateImage(prompt, "banner", "cover");
    generated++;
  } catch (e: any) {
    console.log(`    ❌ ${e.message}`);
    failed++;
  }

  // 2. QUESTIONS
  const questions = quiz.content?.questions || [];
  for (let i = 0; i < Math.min(questions.length, 3); i++) {
    const q = questions[i];
    try {
      const prompt = `Digital illustration for a personality quiz question: "${q.title}". Quiz theme: "${quiz.title}". Style: colorful, engaging, flat design, no text.`;
      await generateImage(prompt, "question", `q${i + 1}`);
      generated++;
    } catch (e: any) {
      console.log(`    ❌ ${e.message}`);
      failed++;
    }
  }

  // 3. OUTCOMES
  const outcomes = quiz.content?.outcomes || [];
  for (let i = 0; i < Math.min(outcomes.length, 3); i++) {
    const o = outcomes[i];
    try {
      const prompt = `Digital illustration representing personality quiz result: "${o.title}". Description: ${(o.description || "").slice(0, 150)}. Style: friendly, colorful, flat design, no text.`;
      await generateImage(prompt, "outcome", `outcome${i + 1}`);
      generated++;
    } catch (e: any) {
      console.log(`    ❌ ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ ${generated} imagens geradas | ❌ ${failed} falhas`);
  console.log(`\n📁 Pasta: ${BASE_DIR}`);
  console.log(`\n🌐 Abra no navegador:`);
  console.log(`   file:///${BASE_DIR}`);
}

main().catch(console.error);
