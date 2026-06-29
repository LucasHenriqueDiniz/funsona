import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

// ─── CLI args ─────────────────────────────────────────────────────────────────
// tsx generate-question-images.ts --dry-run        → só conta/lista perguntas "nuas"
// tsx generate-question-images.ts --check          → testa conexão com o SD WebUI
// tsx generate-question-images.ts --limit 5        → gera no máximo N imagens
// tsx generate-question-images.ts --id <quizId>    → só um quiz

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes("--dry-run");
const CHECK     = args.includes("--check");
const idArg     = args.indexOf("--id");
const limitArg  = args.indexOf("--limit");
const ONLY_ID   = idArg    !== -1 ? args[idArg + 1] : null;
const LIMIT     = limitArg !== -1 ? parseInt(args[limitArg + 1]) : Infinity;

const SUPABASE_URL              = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SD_API_URL                = process.env.SD_API_URL ?? "http://127.0.0.1:7860";
const SD_STEPS                  = parseInt(process.env.SD_STEPS ?? "20");
const SD_WIDTH                  = parseInt(process.env.SD_WIDTH ?? "1024");
const SD_HEIGHT                 = parseInt(process.env.SD_HEIGHT ?? "1024");
const SD_CFG                    = parseFloat(process.env.SD_CFG ?? "7");
const SD_SAMPLER                = process.env.SD_SAMPLER ?? "DPM++ 2M Karras";

const BUCKET = "quiz-images";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Answer { id: string; label: string; imageUrl?: string; }
interface Question { id: string; title: string; imageUrl?: string; answers: Answer[]; }
interface Quiz {
  id: string; title: string; type: "TRIVIA" | "PERSONALITY"; language: string;
  content: { questions: Question[]; outcomes?: any[]; coverUrl?: string };
}

interface BareQuestion {
  quizId: string; quizTitle: string; quizType: string;
  questionIndex: number; questionId: string; questionText: string;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

const NEGATIVE_PROMPT =
  "text, words, letters, watermark, signature, logo, low quality, blurry, deformed, ugly, extra limbs";

function buildPrompt(quizTitle: string, questionText: string): string {
  return [
    `Digital illustration related to the question "${questionText}", from a quiz titled "${quizTitle}".`,
    `Style: clean, colorful, engaging, flat design with bold shapes, vibrant colors.`,
    `No text, no letters, no words, no UI elements in the image.`,
    `Square composition, social media quiz aesthetic.`,
  ].join(" ");
}

// ─── SD WebUI client ────────────────────────────────────────────────────────────

const SD_TIMEOUT_MS = parseInt(process.env.SD_TIMEOUT_MS ?? "180000"); // 3min por imagem

async function sdTxt2Img(prompt: string): Promise<Buffer> {
  const res = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      steps: SD_STEPS,
      width: SD_WIDTH,
      height: SD_HEIGHT,
      cfg_scale: SD_CFG,
      sampler_name: SD_SAMPLER,
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(SD_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`SD WebUI HTTP ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const b64 = data.images?.[0];
  if (!b64) throw new Error("SD WebUI não retornou imagem");

  return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
}

async function checkSdAlive(): Promise<boolean> {
  try {
    const res = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────

async function uploadToStorage(
  db: ReturnType<typeof createClient>,
  filePath: string,
  fileBuffer: Buffer
): Promise<string> {
  const { data, error } = await db.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Storage upload error: ${error.message}`);

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  if (CHECK) {
    try {
      const res = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const models = await res.json();
      console.log(`✅ SD WebUI respondeu em ${SD_API_URL} — ${models.length} modelo(s) carregado(s).`);
    } catch (e: any) {
      console.error(`❌ Não foi possível conectar em ${SD_API_URL}: ${e.message}`);
      console.error(`   Confirme que o WebUI Forge está rodando com a flag --api.`);
      process.exit(1);
    }
    return;
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Coletar quizzes ─────────────────────────────────────────────────────────
  let query = db.from("quizzes").select("id, title, type, language, content");
  if (ONLY_ID) query = query.eq("id", ONLY_ID);

  const { data: quizzes, error } = await query.range(0, 999);
  if (error) { console.error("❌ Erro ao buscar quizzes:", error.message); process.exit(1); }

  console.log(`\n🎨 Funsona Question Image Generator`);
  console.log(`   ${quizzes!.length} quiz(zes) carregado(s)`);

  // ── Detectar perguntas "nuas" (sem imagem na pergunta E sem imagem em nenhuma opção) ──
  const bare: BareQuestion[] = [];

  for (const quiz of quizzes! as unknown as Quiz[]) {
    const questions = quiz.content?.questions ?? [];
    questions.forEach((q, qi) => {
      const hasQuestionImg = !!(q.imageUrl && q.imageUrl.length > 0);
      const hasAnyOptionImg = (q.answers ?? []).some((a) => a.imageUrl && a.imageUrl.length > 0);
      if (!hasQuestionImg && !hasAnyOptionImg) {
        bare.push({
          quizId: quiz.id, quizTitle: quiz.title, quizType: quiz.type,
          questionIndex: qi, questionId: q.id, questionText: q.title,
        });
      }
    });
  }

  console.log(`\n📊 Perguntas 100% sem imagem: ${bare.length}`);

  if (DRY_RUN) {
    bare.slice(0, 30).forEach((b, i) => {
      console.log(`   ${i + 1}. [${b.quizType}] "${b.quizTitle}" → P${b.questionIndex + 1}: "${b.questionText}"`);
    });
    if (bare.length > 30) console.log(`   ... e mais ${bare.length - 30}`);
    console.log(`\n💡 Rode sem --dry-run para gerar (use --limit N para testar com poucas).`);
    return;
  }

  // ── Checagem prévia: SD WebUI precisa estar de pé antes de começar ────────────
  if (!(await checkSdAlive())) {
    console.error(`\n❌ SD WebUI não respondeu em ${SD_API_URL}.`);
    console.error(`   Inicie o WebUI Forge com a flag --api e rode de novo (ou use --check pra testar).`);
    process.exit(1);
  }

  // ── Gerar e salvar imagens ──────────────────────────────────────────────────
  const toProcess = bare.slice(0, LIMIT);
  console.log(`\n🚀 Gerando ${toProcess.length} imagem(ns) via ${SD_API_URL}\n`);

  let generated = 0, failed = 0;
  const MAX_RETRIES = 2;

  for (let i = 0; i < toProcess.length; i++) {
    const b = toProcess[i];
    const prefix = `[${i + 1}/${toProcess.length}]`;
    console.log(`${prefix} "${b.quizTitle}" → P${b.questionIndex + 1}: "${b.questionText}"`);

    let attempt = 0;
    while (true) {
      try {
        const prompt = buildPrompt(b.quizTitle, b.questionText);
        const buffer = await sdTxt2Img(prompt);

        const storagePath = `questions/${b.quizId}_${b.questionId}.png`;
        const publicUrl = await uploadToStorage(db, storagePath, buffer);

        // Re-fetch quiz para evitar sobrescrever mudanças concorrentes
        const { data: quiz, error: fetchErr } = await db
          .from("quizzes").select("content").eq("id", b.quizId).single();
        if (fetchErr || !quiz) throw new Error(`Falha ao reler quiz: ${fetchErr?.message}`);

        const content = quiz.content as Quiz["content"];
        const q = content.questions[b.questionIndex];
        if (q?.id !== b.questionId) throw new Error(`Pergunta ${b.questionId} não encontrada no índice esperado`);
        q.imageUrl = publicUrl;

        const { error: updateErr } = await db.from("quizzes").update({ content }).eq("id", b.quizId);
        if (updateErr) throw new Error(`Falha ao salvar content: ${updateErr.message}`);

        console.log(`  ✅ ${publicUrl}`);
        generated++;
        break;
      } catch (e: any) {
        attempt++;
        if (attempt > MAX_RETRIES) {
          console.log(`  ❌ ${e.message} (desistindo após ${MAX_RETRIES} tentativas)`);
          failed++;

          // Se o SD caiu no meio do processo, para tudo em vez de falhar 1421x em sequência
          if (!(await checkSdAlive())) {
            console.error(`\n❌ SD WebUI parou de responder em ${SD_API_URL}. Abortando.`);
            console.error(`   ${generated} geradas até aqui — rode de novo para continuar de onde parou.`);
            console.log(`\n${"─".repeat(50)}`);
            console.log(`✅ ${generated} geradas | ❌ ${failed} falhas | ${bare.length - i - 1} restantes`);
            process.exit(1);
          }
          break;
        }
        console.log(`  ⚠️  ${e.message} — tentativa ${attempt}/${MAX_RETRIES}, retry em 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ ${generated} geradas | ❌ ${failed} falhas | ${bare.length - toProcess.length} restantes`);
}

main().catch(console.error);
