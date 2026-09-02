import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { jsonrepair } from "jsonrepair";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { getImageQueueDb, enqueueImage, DEFAULT_NEGATIVE_PROMPT } from "./db-image-queue.js";

config();

const QUIZ_ID = "3918ecda-7185-4a14-9d25-548a54858a5f";
const CDP_URL = "http://localhost:9222";
const CHATGPT_PROJECT_URL = process.env.CHATGPT_PROJECT_URL ?? "https://chatgpt.com";
const SD_URL = "http://127.0.0.1:7860";
const BASE_DIR = path.join(process.cwd(), "refactored-quizzes", QUIZ_ID);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildImagePlanPrompt(quiz: any): string {
  const questions = quiz.content?.questions ?? [];
  const outcomes = quiz.content?.outcomes ?? [];

  const qList = questions.slice(0, 3).map((q: any, i: number) => `  Q${i + 1} (id:"${q.id}"): "${q.title}"`).join("\n");
  const oList = outcomes.map((o: any) => `  outcome_key:"${o.key}" — "${o.title}": ${o.description.slice(0, 150)}`).join("\n");

  return `Você é um diretor de arte responsável por gerar prompts de imagem seguros e específicos para Stable Diffusion local, usados em um site público de quizzes (Funsona).

Gere um \`image_plan\` para o quiz abaixo. Retorne **apenas um objeto JSON**, sem markdown, sem texto antes/depois.

## Regras de segurança (OBRIGATÓRIAS)
- A imagem deve representar o TEMA do quiz (aqui: tipos de macarrão / comida), não personagens genéricos
- Para este quiz, **NÃO use personagens humanos** — é sobre comida. Use o estilo \`editorial_flat_vector_no_people\`
- Proibido: sexualização, poses sensuais, foco em corpo, decote, bikini, lingerie, nudez, roupa transparente, anime girl, personagem sexy
- Não gerar texto legível, logos ou marcas dentro da imagem
- Cada prompt deve ser ESPECÍFICO ao item (cena/prato/comida daquele item), nunca um prompt genérico repetido

## Quiz
Título: "${quiz.title}"
Descrição: "${quiz.description}"

Perguntas (gerar imagem só para as 3 primeiras):
${qList}

Outcomes (gerar imagem para todos):
${oList}

## negative_prompt obrigatório a usar
"${DEFAULT_NEGATIVE_PROMPT}, anime girl, sexy character, human model"

## Formato de retorno
{
  "image_generation_strategy": "light",
  "visual_style": "editorial_flat_vector_no_people",
  "safety_notes": ["..."],
  "image_settings": { "width": 1024, "height": 1024, "steps": 20, "cfg_scale": 6.5, "sampler": "DPM++ 2M Karras", "seed": -1 },
  "negative_prompt": "...",
  "cover": { "filename": "banner.png", "prompt": "..." },
  "questions": [{ "question_id": "...", "filename": "q1.png", "prompt": "..." }],
  "outcomes": [{ "outcome_key": "...", "filename": "outcome1.png", "prompt": "..." }]
}`;
}

async function fillTextarea(page: any, content: string, retries = 5): Promise<void> {
  const selectors = [
    "#prompt-textarea",
    "[data-testid='prompt-textarea']",
    "div[contenteditable='true'][data-lexical-editor]",
    "div[contenteditable='true']",
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (!(await el.isVisible({ timeout: 3000 }).catch(() => false))) continue;
    await el.click();
    await sleep(300);
    const ok = await page.evaluate(([selector, text]: [string, string]) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === "TEXTAREA") {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(el, text);
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      } else {
        el.focus();
        document.execCommand("selectAll", false, undefined);
        document.execCommand("insertText", false, text);
      }
      return true;
    }, [sel, content] as [string, string]);
    if (ok) { await sleep(500); return; }
  }

  if (retries > 0) {
    console.log(`     ⏳ Textarea not there yet — waiting for the page to load (retries left: ${retries})...`);
    console.log(`     URL atual: ${page.url()}`);
    await sleep(3000);
    return fillTextarea(page, content, retries - 1);
  }

  throw new Error(`Could not find ChatGPT's textarea (URL: ${page.url()})`);
}

async function clickSend(page: any): Promise<void> {
  const sendSels = [
    "[data-testid='send-button']",
    "button[aria-label='Send message']",
    "button[aria-label='Enviar mensagem']",
  ];
  for (const sel of sendSels) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false) && await btn.isEnabled({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      return;
    }
  }
  await page.keyboard.press("Enter");
}

async function waitForResponse(page: any): Promise<string> {
  await page.waitForSelector("[data-testid='stop-button'], button[aria-label='Stop streaming']", { timeout: 60_000 }).catch(() => {});
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const streaming = await page.locator("[data-testid='stop-button']").isVisible({ timeout: 500 }).catch(() => false);
    if (!streaming) break;
    await sleep(1500);
  }
  await sleep(1500);
  const msgs = page.locator("[data-message-author-role='assistant']");
  const count = await msgs.count();
  if (count === 0) throw new Error("No assistant response");
  return await msgs.nth(count - 1).innerText();
}

async function generateImage(prompt: string, negativePrompt: string, settings: any, localPath: string): Promise<void> {
  const res = await fetch(`${SD_URL}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      steps: settings.steps ?? 20,
      width: settings.width ?? 1024,
      height: settings.height ?? 1024,
      cfg_scale: settings.cfg_scale ?? 6.5,
      sampler_name: settings.sampler ?? "DPM++ 2M Karras",
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`SD HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = (await res.json()) as any;
  const b64 = data.images?.[0];
  if (!b64) throw new Error("SD returned no image");
  await fs.writeFile(localPath, Buffer.from(b64, "base64"));
}

async function main() {
  console.log(`\n🎨 TESTE: image_plan inteligente para "${QUIZ_ID}"\n`);

  const { data: quiz } = await supa.from("quizzes").select("*").eq("id", QUIZ_ID).single();
  if (!quiz) throw new Error("Quiz not found");

  console.log(`Quiz: "${quiz.title}"`);
  console.log(`Conectando ao Chrome via CDP...`);

  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0] ?? (await browser.newContext());
  const pages = ctx.pages();
  let page = pages.find((p) => p.url().includes("chatgpt.com")) ?? pages[0];
  if (!page) page = await ctx.newPage();

  console.log(`Aba atual: ${page.url()}`);

  const projectSlug = CHATGPT_PROJECT_URL.split("/").pop() ?? "";
  if (!page.url().includes(projectSlug)) {
    console.log(`Navegando para o projeto...`);
    await page.goto(CHATGPT_PROJECT_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } else {
    console.log(`Already on the project page — reusing the tab.`);
  }
  await page.bringToFront();
  await sleep(3000);

  const prompt = buildImagePlanPrompt(quiz);
  console.log(`Enviando prompt (${prompt.length} chars)...`);
  await fillTextarea(page, prompt);
  await sleep(800);
  await clickSend(page);

  console.log(`Waiting for ChatGPT's response...`);
  const rawText = await waitForResponse(page);
  console.log(`Resposta recebida (${rawText.length} chars)`);

  const clean = rawText.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  let plan: any;
  try {
    plan = JSON.parse(clean);
  } catch {
    plan = JSON.parse(jsonrepair(clean));
    console.log(`(JSON corrigido via jsonrepair)`);
  }

  await fs.writeFile(path.join(BASE_DIR, "image-plan.json"), JSON.stringify(plan, null, 2));
  console.log(`\n✅ image_plan saved to image-plan.json`);
  console.log(`   Estilo: ${plan.visual_style}`);
  console.log(`   Strategy: ${plan.image_generation_strategy}`);

  await browser.close();

  // Enqueue it in the DB (for the record, even though we generate inline below)
  const db_img = getImageQueueDb();
  const negativePrompt = plan.negative_prompt || DEFAULT_NEGATIVE_PROMPT;
  if (plan.cover?.prompt) {
    enqueueImage(db_img, QUIZ_ID, "banner", "cover_v2", plan.cover.prompt, { negativePrompt, visualStyle: plan.visual_style, settings: plan.image_settings });
  }
  for (const q of plan.questions ?? []) {
    enqueueImage(db_img, QUIZ_ID, "question", `${q.question_id}_v2`, q.prompt, { negativePrompt, visualStyle: plan.visual_style, settings: plan.image_settings });
  }
  for (const o of plan.outcomes ?? []) {
    enqueueImage(db_img, QUIZ_ID, "outcome", `${o.outcome_key}_v2`, o.prompt, { negativePrompt, visualStyle: plan.visual_style, settings: plan.image_settings });
  }

  // Gera as imagens agora (pasta v2/ para comparar lado a lado com as antigas)
  const v2Dir = path.join(BASE_DIR, "v2");
  await fs.mkdir(v2Dir, { recursive: true });
  await fs.mkdir(path.join(v2Dir, "questions"), { recursive: true });
  await fs.mkdir(path.join(v2Dir, "outcomes"), { recursive: true });

  console.log(`\n🖼️  Generating images from the item-specific prompts...\n`);

  if (plan.cover?.prompt) {
    console.log(`  🎨 banner (v2)...`);
    console.log(`     prompt: ${plan.cover.prompt.slice(0, 100)}...`);
    await generateImage(plan.cover.prompt, negativePrompt, plan.image_settings, path.join(v2Dir, "banner.png"));
    console.log(`     ✅ saved`);
  }

  for (const [i, q] of (plan.questions ?? []).entries()) {
    console.log(`  🎨 question q${i + 1} (v2)...`);
    console.log(`     prompt: ${q.prompt.slice(0, 100)}...`);
    await generateImage(q.prompt, negativePrompt, plan.image_settings, path.join(v2Dir, "questions", `q${i + 1}.png`));
    console.log(`     ✅ saved`);
  }

  for (const [i, o] of (plan.outcomes ?? []).entries()) {
    console.log(`  🎨 outcome outcome${i + 1} (v2)...`);
    console.log(`     prompt: ${o.prompt.slice(0, 100)}...`);
    await generateImage(o.prompt, negativePrompt, plan.image_settings, path.join(v2Dir, "outcomes", `outcome${i + 1}.png`));
    console.log(`     ✅ saved`);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Imagens v2 (smart image_plan) salvas em: ${v2Dir}`);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
