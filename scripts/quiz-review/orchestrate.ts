import { chromium, Browser, Page } from "playwright-core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { jsonrepair } from "jsonrepair";
import { getDb, upsertQuiz, upsertBatch, getBatch, getStats, getRefactorQueue, QuizRow } from "./db.js";
import fs from "fs/promises";
import readline from "readline";
import path from "path";
import { config } from "dotenv";
config();

// ─── CLI args ─────────────────────────────────────────────────────────────────
// tsx orchestrate.ts                        → todos os batches pendentes (size 3)
// tsx orchestrate.ts --batch 5             → só batch 5
// tsx orchestrate.ts --start 3 --end 20   → batches 3..20
// tsx orchestrate.ts --size 5             → batch de 5 quizzes
// tsx orchestrate.ts --dry-run            → exporta .md, não envia ao ChatGPT
// tsx orchestrate.ts --skip-import        → envia ao ChatGPT, salva JSON, não aplica no Supabase
// tsx orchestrate.ts --force              → reprocessa mesmo se já está no DB
// tsx orchestrate.ts --refactor           → só processa quizzes com needs_refactor=1
// tsx orchestrate.ts --status             → mostra estatísticas do DB e sai
// tsx orchestrate.ts --verbose            → mostra resposta bruta do ChatGPT

const args        = process.argv.slice(2);
const batchArg    = args.indexOf("--batch");
const startArg    = args.indexOf("--start");
const endArg      = args.indexOf("--end");
const sizeArg     = args.indexOf("--size");
const DRY_RUN     = args.includes("--dry-run");
const SKIP_IMPORT = args.includes("--skip-import");
const FORCE       = args.includes("--force");
const REFACTOR    = args.includes("--refactor");
const SHOW_STATUS = args.includes("--status");
const VERBOSE     = args.includes("--verbose");
const NEXT_BATCH  = args.includes("--next");
const REFACTOR_PENDING = args.includes("--refactor-pending");
const FIX_WEIGHTS   = args.includes("--fix-weights");
const FIX_QUESTIONS = args.includes("--fix-questions");

const BATCH_SZ   = sizeArg  !== -1 ? parseInt(args[sizeArg  + 1]) : 3;
const ONLY_BATCH = batchArg !== -1 ? parseInt(args[batchArg + 1]) : null;

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL              = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ChatGPT URL — use a project URL to reutilizar instruções salvas no projeto
// Ex: https://chatgpt.com/g/g-p-6a0a734ce5f48191a66e7037737eaa1b-funsona-quizzes
// Se não configurado, usa o ChatGPT padrão
const CHATGPT_BASE_URL = (process.env.CHATGPT_PROJECT_URL ?? "https://chatgpt.com").replace(/\/$/, "");

// Chrome profile permanente — loga uma vez, mantém sessão para sempre
const CHROME_PROFILE   = process.env.CHROME_PROFILE_DIR ?? path.join(process.cwd(), "chrome-profile");
const CDP_URL          = "http://localhost:9222";

// Quizzes com score <= este valor entram na fila de refactor
const REFACTOR_THRESHOLD = parseInt(process.env.REFACTOR_THRESHOLD ?? "4");

const BATCHES_DIR = path.join(process.cwd(), "batches");

// ─── Types ────────────────────────────────────────────────────────────────────

interface Answer {
  id: string; label: string; order?: number; imageUrl?: string;
  isCorrect?: boolean; outcomeWeights?: Record<string, number>;
}
interface Question {
  id: string; title: string; order?: number; imageUrl?: string; answers: Answer[];
}
interface Outcome {
  key: string; title: string; description: string; imageUrl?: string;
}
interface Quiz {
  id: string; slug: string; title: string; description: string | null;
  cover_url: string | null; type: "TRIVIA" | "PERSONALITY"; status: string;
  language: string; tags: string[];
  content: { questions: Question[]; outcomes?: Outcome[]; coverUrl?: string };
}
interface ReviewEntry {
  id: string; new_title: string; new_description: string; score: number;
  issues: string[];
  missing_images?: { cover: boolean; questions: string[]; options: string[]; outcomes: string[] };
  new_questions: Array<{ id: string; text: string; options: Array<{ id: string; text: string }> }>;
  new_outcomes?: Array<{ key: string; title: string; description: string }>;
  summary: string;
}
interface FixWeightsEntry {
  id: string;
  fixed_questions: Array<{
    id: string;
    fixed_answers: Array<{ id: string; outcomeWeights: Record<string, number> }>;
  }>;
}
interface FixQuestionsEntry {
  id: string;
  new_outcomes?: Array<{ key: string; title: string; description: string }>;
  new_questions: Array<{
    text: string;
    options: Array<{ text: string; outcomeWeights: Record<string, number> }>;
  }>;
}

// ─── Human-like helpers ───────────────────────────────────────────────────────

/** Delay aleatório para comportamento humano */
const sleep = (minMs: number, maxMs: number) =>
  new Promise<void>((r) => setTimeout(r, minMs + Math.floor(Math.random() * (maxMs - minMs))));

/** Simula tempo de leitura proporcional ao tamanho do texto */
const readDelay = (text: string) =>
  sleep(300 + text.length * 0.3, 600 + text.length * 0.6);

// ─── Markdown formatter ───────────────────────────────────────────────────────

function quizToMarkdown(quiz: Quiz, index: number, total: number): string {
  const questions = quiz.content?.questions ?? [];
  const outcomes  = quiz.content?.outcomes  ?? [];
  const hasCover  = !!(quiz.cover_url || quiz.content?.coverUrl);
  const LETTERS   = "ABCDEFGHIJ";
  const lang      = quiz.language === "pt" ? "Português" : quiz.language === "es" ? "Espanhol" : "Inglês";
  const lines: string[] = [];

  lines.push(`---`);
  lines.push(`## Quiz ${index + 1}/${total}`);
  lines.push(``);
  lines.push(`| Campo | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| **ID** | \`${quiz.id}\` |`);
  lines.push(`| **Tipo** | ${quiz.type} |`);
  lines.push(`| **Idioma** | ${lang} |`);
  lines.push(`| **Status** | ${quiz.status} |`);
  lines.push(`| **Imagem de capa** | ${hasCover ? "✅ tem" : "❌ FALTANDO"} |`);
  lines.push(`| **Título atual** | ${quiz.title} |`);
  lines.push(`| **Descrição atual** | ${quiz.description ?? "*(sem descrição)*"} |`);
  if (quiz.tags?.length) lines.push(`| **Tags** | ${quiz.tags.join(", ")} |`);
  lines.push(``);
  lines.push(`### Perguntas (${questions.length})`);
  lines.push(``);

  questions.forEach((q, qi) => {
    const hasImg = q.imageUrl && q.imageUrl.length > 0;
    lines.push(`**P${qi + 1}** — ID: \`${q.id}\` ${hasImg ? "🖼️" : "*(sem imagem)*"}`);
    lines.push(`> ${q.title ?? "*(sem texto)*"}`);
    lines.push(``);
    (q.answers ?? []).forEach((a, ai) => {
      const letter  = LETTERS[ai] ?? String(ai);
      const imgNote = (a.imageUrl && a.imageUrl.length > 0) ? " 🖼️" : "";
      let extra = "";
      if (quiz.type === "TRIVIA") {
        extra = a.isCorrect ? " **← CORRETA**" : "";
      } else if (a.outcomeWeights) {
        const validKeys = new Set(outcomes.map((o) => o.key));
        const allKeys = Object.entries(a.outcomeWeights).filter(([, w]) => w > 0).map(([k]) => k);
        const keys = allKeys.filter((k) => validKeys.has(k));
        const invalidCount = allKeys.length - keys.length;
        const MAX_KEYS_SHOWN = 5;
        const shown = keys.slice(0, MAX_KEYS_SHOWN);
        const extraCount = keys.length - shown.length;
        extra = shown.length ? ` *(→ ${shown.join(", ")}${extraCount > 0 ? ` … +${extraCount} outcomes` : ""})*` : "";
        if (invalidCount > 0) extra += ` *(+${invalidCount} outcome_keys órfãos/inválidos)*`;
      }
      lines.push(`- **${letter})** \`${a.id}\`${imgNote} ${a.label ?? "*(sem texto)*"}${extra}`);
    });
    lines.push(``);
  });

  if (outcomes.length > 0) {
    lines.push(`### Outcomes / Resultados (${outcomes.length})`);
    lines.push(``);
    const MAX_OUTCOMES_SHOWN = 12;
    if (outcomes.length > MAX_OUTCOMES_SHOWN) {
      lines.push(`> ⚠️ Este quiz tem ${outcomes.length} outcomes (gerados proceduralmente, ex: combinações de stats). Mostrando uma amostra de ${MAX_OUTCOMES_SHOWN} — os demais seguem o mesmo padrão de título/descrição. Não é necessário reescrever cada um individualmente; avalie o padrão geral.`);
      lines.push(``);
    }
    outcomes.slice(0, MAX_OUTCOMES_SHOWN).forEach((o) => {
      const hasImg = o.imageUrl && o.imageUrl.length > 0;
      lines.push(`**\`${o.key}\`** ${hasImg ? "🖼️" : "*(sem imagem)*"} — **${o.title}**`);
      lines.push(`> ${o.description}`);
      lines.push(``);
    });
    if (outcomes.length > MAX_OUTCOMES_SHOWN) {
      lines.push(`*(... +${outcomes.length - MAX_OUTCOMES_SHOWN} outcomes não mostrados, mesmo padrão)*`);
      lines.push(``);
    }
  }

  return lines.join("\n");
}

// Sempre manda o prompt completo — garante consistência mesmo que o projeto
// ainda não tenha as instruções configuradas. O projeto adiciona contexto extra
// mas cada conversa precisa ser auto-suficiente.
function buildMessage(
  quizzes: Quiz[],
  batchNum: number,
  totalBatches: number,
  mode: "review" | "refactor" = "review"
): string {
  const quizMd = quizzes.map((q, i) => quizToMarkdown(q, i, quizzes.length)).join("\n");

  const MAX_KEYS_LISTED = 12;
  const personalityInfo = quizzes
    .filter((q) => q.type === "PERSONALITY" && q.content?.outcomes?.length)
    .map((q) => {
      const keys = q.content.outcomes!.map((o) => o.key);
      const shown = keys.slice(0, MAX_KEYS_LISTED).join(", ");
      const extra = keys.length > MAX_KEYS_LISTED ? `, ... +${keys.length - MAX_KEYS_LISTED} outcomes` : "";
      return `- \`${q.id}\` — outcomes (${keys.length}): [${shown}${extra}]`;
    })
    .join("\n");

  const extra = mode === "refactor"
    ? `\n⚠️  ATENÇÃO: Estes quizzes tiveram score BAIXO na primeira revisão. Seja mais criterioso e reescreva de forma mais profunda.\n`
    : "";

  return `# Revisão de Quizzes Funsona — Batch ${String(batchNum).padStart(3,"0")} de ${String(totalBatches).padStart(3,"0")} (${quizzes.length} quizzes)
${extra}
Você é um especialista em criação de quizzes de entretenimento e educação. Revise os quizzes abaixo e retorne **apenas um array JSON** com as melhorias. Sem texto antes ou depois do JSON.

## Regras gerais

- Escreva **no mesmo idioma do quiz** (Português, Inglês ou Espanhol)
- **Não crie perguntas nem alternativas novas** — apenas melhore as existentes
- **Não remova perguntas** — mesmo que estejam ruins, inclua-as no output
- Preserve os IDs **exatamente** como estão
- Se uma pergunta está sem texto ou sem alternativas, melhore o que existe e sinalize nos issues

## O que fazer em cada quiz

1. **Título** — reescreva para ser irresistível e curioso (max 200 chars, mesmo idioma)
2. **Descrição** — reescreva para gerar vontade de jogar imediatamente (max 1000 chars)
3. **Perguntas** — melhore clareza, gramática e naturalidade; reescreva duplicadas de ângulos diferentes
4. **Alternativas** — texto claro, balanceado, sem opções absurdas ou óbvias
   - **TRIVIA**: verifique factualmente se a alternativa **← CORRETA** está correta
   - **PERSONALITY**: verifique se os outcome_keys existem nos outcomes listados
5. **Outcomes** (PERSONALITY) — título envolvente, descrição compartilhável
6. **Issues** — todos os problemas encontrados. Quiz publicado mas incompleto → "RECOMENDO_DESPUBLICAR"
7. **Score** — nota 1–10 da qualidade **antes** das suas melhorias
8. **Resumo** — 1–2 frases em português sobre o estado do quiz
${personalityInfo ? `\n## Outcomes válidos (PERSONALITY)\n${personalityInfo}\n` : ""}
## Formato de retorno (array JSON, sem markdown wrapper)

[{ "id":"uuid","new_title":"...","new_description":"...","score":7,"issues":[],"missing_images":{"cover":false,"questions":[],"options":[],"outcomes":[]},"new_questions":[{"id":"...","text":"...","options":[{"id":"...","text":"..."}]}],"new_outcomes":[{"key":"...","title":"...","description":"..."}],"summary":"..." }]

---

# Quizzes para revisar

${quizMd}`;
}

// ─── Apply review to Supabase ─────────────────────────────────────────────────

async function applyReview(db_sq: ReturnType<typeof getDb>, db: SupabaseClient, entry: ReviewEntry): Promise<"applied" | "failed" | "skipped"> {
  if (!entry.id || !entry.new_title) {
    console.log(`     ⏭️  entrada inválida`);
    return "skipped";
  }

  const { data: current, error: fetchErr } = await db
    .from("quizzes").select("title, description, content").eq("id", entry.id).single();

  if (fetchErr || !current) {
    console.log(`     ❌ ${entry.id} não encontrado no Supabase`);
    upsertQuiz(db_sq, entry.id, { status: "error", error: "Quiz não encontrado no Supabase" });
    return "failed";
  }

  const updatedContent = structuredClone(current.content);
  const qMap = new Map((entry.new_questions ?? []).map((q) => [q.id, q]));
  const oMap = new Map((entry.new_outcomes  ?? []).map((o) => [o.key, o]));

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

  const { error: updateErr } = await db
    .from("quizzes")
    .update({ title: entry.new_title, description: entry.new_description, content: updatedContent })
    .eq("id", entry.id);

  if (updateErr) {
    upsertQuiz(db_sq, entry.id, { status: "error", error: updateErr.message });
    return "failed";
  }

  const needsRefactor  = entry.score <= REFACTOR_THRESHOLD ? 1 : 0;
  const toUnpublish    = entry.issues?.some((i) => i.includes("RECOMENDO_DESPUBLICAR")) ? 1 : 0;
  const needsImage     = entry.missing_images?.cover ? 1 : 0;

  upsertQuiz(db_sq, entry.id, {
    new_title: entry.new_title,
    score: entry.score,
    status: needsRefactor ? "needs_refactor" : (needsImage ? "image_queued" : "applied"),
    needs_refactor: needsRefactor,
    recommended_unpublish: toUnpublish,
    issues_count: entry.issues?.length ?? 0,
    review_json: JSON.stringify(entry),
    applied_at: new Date().toISOString(),
  });

  return "applied";
}

// ─── Chrome helpers ───────────────────────────────────────────────────────────

function askUser(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (ans) => { rl.close(); resolve(ans); }));
}

async function connectChrome(): Promise<{ browser: Browser; page: Page }> {
  console.log(`🔌 Conectando ao Chrome (${CDP_URL})...`);
  let browser: Browser;

  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch {
    console.error(`\n❌ Chrome não está rodando com CDP.`);
    console.error(`   Iniciando Chrome com perfil persistente em: ${CHROME_PROFILE}`);

    // Try to launch Chrome automatically
    const { execSync } = await import("child_process");
    const chromePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    const chromePath = chromePaths.find((p) => {
      try { execSync(`if exist "${p}" echo ok`, { shell: "cmd.exe", stdio: "pipe" }); return true; } catch { return false; }
    });

    if (chromePath) {
      execSync(
        `start "" "${chromePath}" --remote-debugging-port=9222 --user-data-dir="${CHROME_PROFILE}" --no-first-run --no-default-browser-check "${CHATGPT_BASE_URL}"`,
        { shell: "cmd.exe", stdio: "ignore" }
      );
    }

    // Perfil persistente já tem a sessão logada — não bloqueia esperando ENTER
    // (precisa funcionar sem interação para rodar desacompanhado por horas).
    // Tenta reconectar por até ~30s enquanto o Chrome inicializa.
    console.error(`   Aguardando Chrome inicializar...`);
    let connected = false;
    for (let i = 0; i < 15; i++) {
      await sleep(2000, 2000);
      try {
        browser = await chromium.connectOverCDP(CDP_URL);
        connected = true;
        break;
      } catch { /* segue tentando */ }
    }
    if (!connected) {
      throw new Error("Não foi possível conectar ao Chrome via CDP após relançar (porta 9222)");
    }
  }

  const contexts = browser.contexts();
  const ctx  = contexts[0] ?? (await browser.newContext());
  const pages = ctx.pages();
  let page = pages.find((p) => p.url().includes("chatgpt.com")) ?? pages[0];
  if (!page) page = await ctx.newPage();

  console.log(`✅ Chrome conectado! (${pages.length} aba(s) abertas)`);
  return { browser, page };
}

async function ensureLoggedIn(page: Page): Promise<void> {
  console.log("🌐 Verificando login no ChatGPT...");
  await page.goto(CHATGPT_BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
  await sleep(1500, 3000);

  const loginTexts = ["Log in", "Sign in", "Fazer login", "Entrar"];
  for (const text of loginTexts) {
    const visible = await page.getByRole("button", { name: text }).isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      console.log("\n🔐 ChatGPT não está logado.");
      console.log(`   Perfil salvo em: ${CHROME_PROFILE}`);
      console.log("   Faça login na janela do Chrome e pressione ENTER aqui...");
      await askUser("");
      await sleep(2000, 4000);
      break;
    }
  }

  console.log("✅ ChatGPT pronto!");
}

// ─── ChatGPT interaction ──────────────────────────────────────────────────────

async function fillTextarea(page: Page, content: string): Promise<void> {
  const selectors = [
    "#prompt-textarea",
    "[data-testid='prompt-textarea']",
    "div[contenteditable='true'][data-lexical-editor]",
    "div[contenteditable='true']",
  ];

  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (!await el.isVisible({ timeout: 2000 }).catch(() => false)) continue;

    await el.click();
    await sleep(200, 500);

    // Set content via React/DOM hack (handles both textarea and contenteditable)
    const ok = await page.evaluate(([selector, text]) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return false;

      if (el.tagName === "TEXTAREA") {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(el, text);
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      } else {
        // contenteditable — use execCommand para manter undo stack e não travar React
        el.focus();
        document.execCommand("selectAll", false, undefined);
        document.execCommand("insertText", false, text);
      }
      return true;
    }, [sel, content] as [string, string]);

    if (ok) {
      await sleep(400, 800);
      return;
    }
  }

  throw new Error("Não encontrou o textarea do ChatGPT (UI pode ter mudado)");
}

async function clickSend(page: Page): Promise<void> {
  const sendSels = [
    "[data-testid='send-button']",
    "button[aria-label='Send message']",
    "button[aria-label='Enviar mensagem']",
    "button[aria-label='Enviar']",
  ];

  for (const sel of sendSels) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false) &&
        await btn.isEnabled({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      return;
    }
  }

  // Fallback: keyboard Enter
  await page.keyboard.press("Enter");
}

// Frases que indicam rate limit ou erro do ChatGPT (pt + en)
const RATE_LIMIT_PHRASES = [
  "you've reached your limit",
  "reached the usage limit",
  "atingiu o limite",
  "limite de uso",
  "you've hit the",
  "too many messages",
  "please try again",
  "tente novamente",
  "come back later",
  "volte mais tarde",
];

// Frases/seletores do modal "conversation history rate limit" (acesso ao histórico
// de conversas temporariamente limitado) — esse é RECUPERÁVEL com espera + reload,
// diferente do rate limit de mensagens (que é mais duradouro).
const HISTORY_RATE_LIMIT_SELECTOR =
  "#modal-conversation-history-rate-limit, [data-testid='modal-conversation-history-rate-limit']";
const HISTORY_RATE_LIMIT_PHRASES = [
  "fazendo solicitações",
  "solicitações rápido demais",
  "limitamos temporariamente",
  "aguarde alguns minutos antes de tentar novamente",
  "making requests too quickly",
  "temporarily limited access",
  "wait a few minutes before trying again",
];

class RateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "RateLimitError"; }
}

// Erro genérico do ChatGPT (ex: "Something went wrong... contact help center"), geralmente
// causado por uma mensagem grande demais ou instabilidade momentânea. É RECUPERÁVEL via
// reenvio do batch inteiro — NÃO é resposta truncada, então não deve disparar "continue".
const CHATGPT_ERROR_PHRASES = [
  "something went wrong",
  "algo deu errado",
  "help.openai.com",
];

class ChatGPTErrorResponse extends Error {
  constructor(msg: string) { super(msg); this.name = "ChatGPTErrorResponse"; }
}

/**
 * Detecta o modal de rate limit do HISTÓRICO de conversas (diferente do rate limit
 * de mensagens). Esse modal bloqueia cliques na página inteira (overlay), então
 * precisa ser tratado ANTES de tentar interagir com o textarea/botão de enviar.
 * Espera com backoff e recarrega a página até o modal sumir (até maxTotalMs).
 */
async function waitForHistoryRateLimit(page: Page, maxTotalMs = 20 * 60_000): Promise<void> {
  const deadline = Date.now() + maxTotalMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    const modalVisible = await page.locator(HISTORY_RATE_LIMIT_SELECTOR).first()
      .isVisible({ timeout: 1000 }).catch(() => false);

    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase()).catch(() => "");
    const phraseHit = HISTORY_RATE_LIMIT_PHRASES.some((p) => pageText.includes(p));

    if (!modalVisible && !phraseHit) return;

    attempt++;
    const waitMin = Math.min(3 * attempt, 15); // 3, 6, 9, 12, 15, 15, 15...
    console.log(`\n  ⏸️  Modal de limite do histórico de conversas detectado (tentativa ${attempt}).`);
    console.log(`     Aguardando ${waitMin}min e recarregando a página...`);
    await sleep(waitMin * 60_000, waitMin * 60_000 + 15_000);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
    await sleep(2000, 4000);
  }

  throw new RateLimitError("Modal de limite do histórico de conversas não desapareceu após o tempo máximo de espera");
}

async function waitForResponse(page: Page, timeoutMs = 15 * 60_000): Promise<string> {
  // Antes de esperar resposta, checar se há aviso de rate limit já visível
  await waitForHistoryRateLimit(page);
  await checkRateLimit(page);

  // Wait for stop button to appear (streaming started)
  await page.waitForSelector("[data-testid='stop-button'], button[aria-label='Stop streaming']", {
    timeout: 60_000,
  }).catch(() => {});

  // Wait for streaming to end
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const streaming = await page.locator("[data-testid='stop-button']").isVisible({ timeout: 500 }).catch(() => false);
    if (!streaming) break;
    await sleep(1200, 2000);
  }

  await sleep(1000, 2000); // buffer extra para render final

  // Extract last assistant message
  const msgs = page.locator("[data-message-author-role='assistant']");
  const count = await msgs.count();
  if (count === 0) throw new Error("Nenhuma resposta do assistente encontrada");

  const text = await msgs.nth(count - 1).innerText();

  // Checar se a resposta em si é um aviso de rate limit
  const lower = text.toLowerCase();
  if (RATE_LIMIT_PHRASES.some((p) => lower.includes(p))) {
    throw new RateLimitError(`ChatGPT retornou aviso de limite: "${text.slice(0, 120)}"`);
  }

  // Checar erro genérico do ChatGPT (resposta curta tipo "Something went wrong... Repetir")
  // Isso NÃO é uma resposta truncada — não deve disparar ensureCompleteJSON("continue")
  if (text.length < 500 && CHATGPT_ERROR_PHRASES.some((p) => lower.includes(p))) {
    throw new ChatGPTErrorResponse(`ChatGPT retornou erro genérico: "${text.slice(0, 150)}"`);
  }

  return text;
}

async function checkRateLimit(page: Page): Promise<void> {
  // Procura por indicadores de rate limit na página (fora das mensagens)
  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  if (RATE_LIMIT_PHRASES.some((p) => pageText.includes(p))) {
    throw new RateLimitError("Página indica limite de uso atingido");
  }
}

async function ensureCompleteJSON(page: Page, text: string, attempts = 0): Promise<string> {
  const clean = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  if (clean.endsWith("]")) return clean;

  if (attempts >= 3) {
    console.log("     ⚠️  Resposta incompleta após 3 tentativas — usando como está");
    return clean;
  }

  console.log(`     ⏩ Resposta incompleta (attempt ${attempts + 1}/3) — pedindo continuação...`);
  await sleep(1000, 2000);
  await fillTextarea(page, "continue");
  await sleep(300, 600);
  await clickSend(page);
  const continuation = await waitForResponse(page);
  const cleanCont = continuation.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  // Merge arrays: remove trailing ] from first part, remove leading [ from continuation
  const merged = clean.replace(/\]\s*$/, "") + "," + cleanCont.replace(/^\s*\[/, "");
  return ensureCompleteJSON(page, merged, attempts + 1);
}

async function sendToChatGPT(
  page: Page,
  content: string,
  batchLabel: string
): Promise<ReviewEntry[]> {
  // Navega sempre para a URL base do projeto (não uma conversa anterior)
  // O projeto redireciona para .../project que tem o textarea pronto
  // Isso garante uma nova conversa dentro do contexto do projeto
  const targetUrl = process.env.CHATGPT_PROJECT_URL
    ? process.env.CHATGPT_PROJECT_URL.replace(/\/$/, "") // URL do projeto
    : "https://chatgpt.com";

  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  // Aguarda a página do projeto carregar (pode redirecionar para .../project)
  await page.waitForFunction(
    () => !window.location.href.includes("/auth") && document.readyState === "complete",
    { timeout: 15_000 }
  ).catch(() => {});

  await sleep(1500, 3000);

  // Verifica e espera o modal de rate limit do histórico ANTES de tentar interagir
  // (esse modal cobre a página inteira e bloqueia cliques no textarea)
  await waitForHistoryRateLimit(page);

  // Human behavior: scroll down a tiny bit, then focus
  await page.mouse.move(
    400 + Math.floor(Math.random() * 200),
    300 + Math.floor(Math.random() * 100)
  );
  await sleep(300, 700);

  console.log(`     📤 Colando ${Math.round(content.length / 1024)}kb...`);
  await fillTextarea(page, content);
  await sleep(600, 1200);

  await clickSend(page);

  const start = Date.now();
  console.log(`     ↗ Enviado! Aguardando resposta...`);
  const rawText = await waitForResponse(page);
  console.log(`     ⏱  ${Math.round((Date.now() - start) / 1000)}s | ${rawText.length} chars`);

  if (VERBOSE) {
    console.log(`\n${"·".repeat(40)} RESPOSTA BRUTA (primeiros 1500 chars) ${"·".repeat(10)}`);
    console.log(rawText.slice(0, 1500) + (rawText.length > 1500 ? "\n  ..." : ""));
    console.log("·".repeat(90));
  }

  // Human: "read" the response before processing
  await readDelay(rawText.slice(0, 500));

  const jsonText = await ensureCompleteJSON(page, rawText);

  let entries: ReviewEntry[];
  try {
    entries = JSON.parse(jsonText);
  } catch (e: any) {
    // Tenta corrigir JSON malformado (ex: aspas internas não escapadas, vírgulas
    // sobrando) antes de desistir — comum quando o ChatGPT escreve apelidos
    // entre aspas dentro de um campo de texto, ex: "Miles "Tails" Prower".
    try {
      entries = JSON.parse(jsonrepair(jsonText));
      console.log(`     🔧 JSON corrigido automaticamente (jsonrepair)`);
    } catch {
      const rawPath = path.join(BATCHES_DIR, `${batchLabel}-raw.txt`);
      await fs.writeFile(rawPath, rawText, "utf-8");
      throw new Error(`JSON parse falhou (salvo em ${path.basename(rawPath)}): ${e.message}`);
    }
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("ChatGPT retornou formato inesperado (não é array)");
  }

  return entries;
}

// ─── Structural fix helpers ───────────────────────────────────────────────────

function buildFixWeightsMessage(quiz: Quiz): string {
  const outcomes = quiz.content?.outcomes ?? [];
  const questions = quiz.content?.questions ?? [];

  const outcomeList = outcomes.map((o) =>
    `  - key: "${o.key}" | Título: "${o.title}" | Descrição: "${o.description.slice(0, 120)}"`
  ).join("\n");

  const questionList = questions.map((q, qi) => {
    const answers = (q.answers ?? []).map((a, ai) =>
      `    A${ai + 1} (id:"${a.id}") — "${a.label}"`
    ).join("\n");
    return `P${qi + 1} (id:"${q.id}") — "${q.title}"\n${answers}`;
  }).join("\n\n");

  return `Você é especialista em design de quizzes de personalidade.

O quiz abaixo tem outcomeWeights distribuídos de forma GENÉRICA para todos os outcomes (sem discriminação real). Reatribua os pesos para que cada alternativa reflita semanticamente qual outcome ela favorece.

REGRAS:
- Use pesos de 0 a 5 (5 = muito relacionado, 0 = nada relacionado)
- Cada alternativa deve ter pesos DIFERENTES para diferentes outcomes
- Tipicamente 1-2 outcomes com peso alto (4-5) e os demais com peso baixo (0-1)
- Inclua TODOS os ${outcomes.length} outcome keys na resposta de cada alternativa

Quiz: "${quiz.title}"
Tipo: ${quiz.type}

Outcomes disponíveis:
${outcomeList}

Perguntas e alternativas:
${questionList}

Responda SOMENTE com JSON no formato:
[{
  "id": "${quiz.id}",
  "fixed_questions": [{
    "id": "question_id",
    "fixed_answers": [{
      "id": "answer_id",
      "outcomeWeights": { "outcome_key": weight_number }
    }]
  }]
}]`;
}

function buildFixQuestionsMessage(quiz: Quiz): string {
  const outcomes = quiz.content?.outcomes ?? [];
  const existingQs = quiz.content?.questions ?? [];
  const hasOutcomes = outcomes.length > 0;

  const outcomeSection = hasOutcomes
    ? `Outcomes existentes (use estas keys nos outcomeWeights):\n` +
      outcomes.map((o) => `  - key: "${o.key}" | Título: "${o.title}" | Descrição: "${o.description.slice(0, 150)}"`).join("\n")
    : `⚠️ Este quiz NÃO TEM outcomes. Gere também 3-5 outcomes coerentes com o tema.`;

  const existingSection = existingQs.length > 0
    ? `\nPerguntas JÁ existentes (não repita, só COMPLEMENTE):\n` +
      existingQs.map((q, i) => `  P${i + 1}: "${q.title}"`).join("\n")
    : `\nO quiz não tem nenhuma pergunta — gere tudo do zero.`;

  return `Você é especialista em design de quizzes de personalidade.

O quiz abaixo tem poucas ou nenhuma pergunta. Gere ${existingQs.length > 0 ? "mais " : ""}8-10 perguntas de personalidade com 4 alternativas cada.

REGRAS:
- Perguntas situacionais, comportamentais ou de preferência (não trivia/factual)
- Cada pergunta deve discriminar claramente entre os outcomes
- Cada alternativa: pesos de 0 a 5, com 1-2 outcomes dominantes (peso 4-5)
- Inclua TODOS os outcome keys em cada alternativa (mesmo com peso 0)
- Linguagem em português do Brasil, tom leve e engajante
${hasOutcomes ? "" : "- Para os outcomes: gere key no formato 'resultado1', 'resultado2', etc."}

Quiz: "${quiz.title}"
Descrição: "${(quiz.description ?? "").slice(0, 200)}"

${outcomeSection}
${existingSection}

Responda SOMENTE com JSON no formato:
[{
  "id": "${quiz.id}",${!hasOutcomes ? `
  "new_outcomes": [{ "key": "resultado1", "title": "...", "description": "..." }],` : ""}
  "new_questions": [{
    "text": "Texto da pergunta?",
    "options": [
      { "text": "Alternativa A", "outcomeWeights": { ${outcomes.slice(0, 2).map((o) => `"${o.key}": 5`).join(", ")}${outcomes.length > 2 ? ", ..." : ""} } }
    ]
  }]
}]`;
}

async function applyFixWeights(db: SupabaseClient, entry: FixWeightsEntry): Promise<void> {
  const { data: quiz, error } = await db.from("quizzes").select("content").eq("id", entry.id).single();
  if (error || !quiz) throw new Error(`Quiz ${entry.id} não encontrado`);

  const content = structuredClone(quiz.content) as Quiz["content"];
  const qMap = new Map(entry.fixed_questions.map((q) => [q.id, q]));

  content.questions = (content.questions ?? []).map((q: any) => {
    const fix = qMap.get(q.id);
    if (!fix) return q;
    const aMap = new Map(fix.fixed_answers.map((a) => [a.id, a]));
    return {
      ...q,
      answers: (q.answers ?? []).map((a: any) => {
        const fixA = aMap.get(a.id);
        return fixA ? { ...a, outcomeWeights: fixA.outcomeWeights } : a;
      }),
    };
  });

  const { error: updateErr } = await db.from("quizzes").update({ content }).eq("id", entry.id);
  if (updateErr) throw new Error(`Falha ao salvar: ${updateErr.message}`);
}

async function applyFixQuestions(db: SupabaseClient, entry: FixQuestionsEntry): Promise<void> {
  const { data: quiz, error } = await db.from("quizzes").select("content").eq("id", entry.id).single();
  if (error || !quiz) throw new Error(`Quiz ${entry.id} não encontrado`);

  const content = structuredClone(quiz.content) as Quiz["content"];
  const now = Date.now();

  if (entry.new_outcomes?.length) {
    content.outcomes = entry.new_outcomes.map((o) => ({
      key: o.key, title: o.title, description: o.description,
    }));
  }

  const newQs = entry.new_questions.map((q, qi) => ({
    id: `q_fix_${now}_${qi}`,
    title: q.text,
    answers: q.options.map((opt, ai) => ({
      id: `a_fix_${now}_${qi}_${ai}`,
      label: opt.text,
      outcomeWeights: opt.outcomeWeights,
    })),
  }));

  content.questions = [...(content.questions ?? []), ...newQs];

  const { error: updateErr } = await db.from("quizzes").update({ content }).eq("id", entry.id);
  if (updateErr) throw new Error(`Falha ao salvar: ${updateErr.message}`);
}

function detectBadWeightQuizzes(quizzes: Quiz[]): Quiz[] {
  return quizzes.filter((quiz) => {
    const questions = quiz.content?.questions ?? [];
    const outcomes = quiz.content?.outcomes ?? [];
    if (outcomes.length < 2 || questions.length === 0) return false;
    const outcomeCount = outcomes.length;
    let badQs = 0;
    for (const q of questions) {
      let badAnswers = 0;
      for (const a of (q.answers ?? [])) {
        const weights = (a as any).outcomeWeights ?? {};
        const active = Object.values(weights).filter((w: any) => w > 0).length;
        if (active >= outcomeCount) badAnswers++;
      }
      if (badAnswers >= Math.ceil((q.answers ?? []).length / 2)) badQs++;
    }
    return badQs >= Math.ceil(questions.length * 0.4);
  });
}

function detectFewQuestionQuizzes(quizzes: Quiz[]): Quiz[] {
  return quizzes.filter((q) => (q.content?.questions ?? []).length < 5 && q.type === "PERSONALITY");
}

// ─── Show DB stats ────────────────────────────────────────────────────────────

function showStats(db_sq: ReturnType<typeof getDb>) {
  const stats = getStats(db_sq);
  console.log(`\n📊 Estatísticas do banco (quiz-review.db)`);
  console.log(`${"─".repeat(50)}`);
  console.log(`   Total rastreados : ${stats.total}`);
  console.log(`   Aplicados        : ${stats.applied}`);
  console.log(`   Score médio      : ${stats.avgScore}/10`);
  console.log(`   Precisam refactor: ${stats.refactor}`);
  console.log(`   Para despublicar : ${stats.unpublish}`);
  console.log(`\n   Por status:`);
  stats.byStatus.forEach(({ status, c }) =>
    console.log(`   ${String(c).padStart(5)}  ${status}`)
  );
  if (stats.lowScore.length) {
    console.log(`\n   🔴 Piores quizzes (score ≤ ${REFACTOR_THRESHOLD}):`);
    stats.lowScore.forEach(({ score, original_title }) =>
      console.log(`   [${score}] ${original_title?.slice(0, 60)}`)
    );
  }
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  await fs.mkdir(BATCHES_DIR, { recursive: true });

  const db_sq = getDb();
  const db    = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── --status: mostra stats e sai ─────────────────────────────────────────────
  if (SHOW_STATUS) {
    showStats(db_sq);
    return;
  }

  // ── --next: imprime o próximo batch não aplicado (1..TOTAL_BATCHES) e sai ─────
  if (NEXT_BATCH) {
    const { count: totalQuizzes } = await db.from("quizzes").select("*", { count: "exact", head: true });
    const TOTAL_BATCHES = Math.ceil((totalQuizzes ?? 769) / BATCH_SZ);
    let next = TOTAL_BATCHES + 1; // sentinel: tudo aplicado
    for (let n = 1; n <= TOTAL_BATCHES; n++) {
      if (getBatch(db_sq, n)?.status !== "applied") { next = n; break; }
    }
    console.log(next);
    return;
  }

  // ── --refactor-pending: imprime quantos itens restam na fila de refactor ──────
  if (REFACTOR_PENDING) {
    console.log(getRefactorQueue(db_sq).length);
    return;
  }

  // ── --refactor: processa quizzes com score baixo ──────────────────────────────
  if (REFACTOR) {
    const queue = getRefactorQueue(db_sq);
    if (!queue.length) {
      console.log(`✅ Nenhum quiz na fila de refactor (threshold: score ≤ ${REFACTOR_THRESHOLD})`);
      return;
    }

    console.log(`\n🔁 Funsona Quiz Orchestrator — MODO REFACTOR`);
    console.log(`   ${queue.length} quizzes com score ≤ ${REFACTOR_THRESHOLD} para reprocessar`);

    const { browser, page } = await connectChrome();
    await ensureLoggedIn(page);

    // Agrupa em batches de BATCH_SZ
    const batches: QuizRow[][] = [];
    for (let i = 0; i < queue.length; i += BATCH_SZ) batches.push(queue.slice(i, i + BATCH_SZ));

    const { count: totalQuizzes } = await db.from("quizzes").select("*", { count: "exact", head: true });
    const TOTAL = totalQuizzes ?? 769;
    const TOTAL_BATCHES = Math.ceil(TOTAL / BATCH_SZ);

    for (let bi = 0; bi < batches.length; bi++) {
      const group = batches[bi];
      const ids   = group.map((r) => r.id);

      console.log(`\n${"─".repeat(60)}`);
      console.log(`🔁 Refactor group ${bi + 1}/${batches.length} (${group.length} quizzes)`);
      group.forEach((r) => console.log(`   [${r.score}/10] ${r.original_title?.slice(0, 60)}`));

      // Fetch current quiz data
      const { data: quizzes } = await db
        .from("quizzes")
        .select("id,slug,title,description,cover_url,type,status,language,tags,content")
        .in("id", ids);

      if (!quizzes?.length) { console.log("  ⚠️  Quizzes não encontrados no Supabase"); continue; }

      const message = buildMessage(quizzes as Quiz[], bi + 1, batches.length, "refactor");

      if (DRY_RUN) { console.log("  🔍 [DRY RUN] Pulando envio"); continue; }

      // Retry com backoff para rate limit e timeout — mesmo mecanismo do modo normal,
      // pra rodar desacompanhado por horas sem desistir no primeiro rate limit.
      const MAX_RETRIES = 10; // backoff 2,4,6,8,10,12,14,16,18,20 min
      let attemptNum = 0;
      let entries: ReviewEntry[] | null = null;

      while (true) {
        try {
          entries = await sendToChatGPT(page, message, `refactor-group-${bi + 1}`);
          break;
        } catch (e: any) {
          const isRetryable = e.name === "RateLimitError" || e.name === "TimeoutError" || e.name === "ChatGPTErrorResponse" || e.message.includes("Timeout");
          if (isRetryable) {
            attemptNum++;
            if (attemptNum > MAX_RETRIES) {
              console.log(`\n⏸️  TIMEOUT/RATE LIMIT no refactor group ${bi + 1} (${MAX_RETRIES} tentativas esgotadas)`);
              console.log(`   Progresso salvo no DB.`);
              console.log(`   Retome com: npx tsx orchestrate.ts --refactor`);
              showStats(db_sq);
              await browser.close().catch(() => {});
              process.exit(0);
            }
            const waitMin = Math.min(2 * attemptNum, 20);
            console.log(`\n  ⏸️  ${e.name} no refactor group ${bi + 1} (tentativa ${attemptNum}/${MAX_RETRIES}): ${e.message.slice(0, 60)}`);
            console.log(`     Aguardando ${waitMin}min antes de tentar de novo...`);
            await sleep(waitMin * 60_000, waitMin * 60_000 + 10_000);
            continue;
          }
          console.error(`  ❌ Erro: ${e.message}`);
          entries = null;
          break;
        }
      }

      if (entries) {
        for (let i = 0; i < entries.length; i++) {
          const entry  = entries[i];
          const prefix = `  [${i + 1}/${entries.length}]`;
          console.log(`${prefix} "${entry.new_title?.slice(0, 55)}" — score ${entry.score}/10`);
          const result = await applyReview(db_sq, db, entry);
          if (result === "applied") {
            upsertQuiz(db_sq, entry.id, { status: "refactored" });
            console.log(`  ✅ Refatorado e salvo`);
          } else {
            console.log(`  ❌ Falhou`);
          }
        }
      }

      if (bi < batches.length - 1) {
        const delay = 3000 + Math.floor(Math.random() * 4000); // 3–7s entre grupos
        process.stdout.write(`  ⏳ Aguardando ${Math.round(delay / 1000)}s...`);
        await sleep(delay, delay);
        console.log(" pronto");
      }
    }

    await browser.close().catch(() => {});
    showStats(db_sq);
    return;
  }

  // ── --fix-weights: redistribui outcomeWeights ruins via ChatGPT ───────────────
  if (FIX_WEIGHTS) {
    const { data: allQuizzes } = await db.from("quizzes")
      .select("id,title,description,type,content").range(0, 999);

    const targets = detectBadWeightQuizzes((allQuizzes ?? []) as unknown as Quiz[]);
    console.log(`\n🔧 Funsona Quiz Orchestrator — FIX WEIGHTS`);
    console.log(`   ${targets.length} quizzes com outcomeWeights ruins detectados`);
    if (!targets.length) { console.log("   Nada a fazer."); return; }

    if (DRY_RUN) {
      targets.forEach((q) => console.log(`  - [${(q.content?.questions ?? []).length}q, ${(q.content?.outcomes ?? []).length} outcomes] ${q.title}`));
      return;
    }

    const { browser, page } = await connectChrome();
    await ensureLoggedIn(page);

    let fixed = 0, failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const quiz = targets[i];
      console.log(`\n${"─".repeat(60)}`);
      console.log(`[${i + 1}/${targets.length}] "${quiz.title}" (${(quiz.content?.outcomes ?? []).length} outcomes, ${(quiz.content?.questions ?? []).length} perguntas)`);

      const message = buildFixWeightsMessage(quiz);
      let attemptNum = 0;
      let entries: FixWeightsEntry[] | null = null;

      while (true) {
        try {
          entries = (await sendToChatGPT(page, message, `fix-weights-${i + 1}`)) as unknown as FixWeightsEntry[];
          break;
        } catch (e: any) {
          const isRetryable = e.name === "RateLimitError" || e.name === "TimeoutError" || e.name === "ChatGPTErrorResponse" || e.message.includes("Timeout");
          if (isRetryable && ++attemptNum <= 10) {
            const waitMin = Math.min(2 * attemptNum, 20);
            console.log(`  ⏸️  ${e.name} (tentativa ${attemptNum}/10) — aguardando ${waitMin}min...`);
            await sleep(waitMin * 60_000, waitMin * 60_000 + 5000);
            continue;
          }
          console.error(`  ❌ ${e.message}`); entries = null; break;
        }
      }

      if (!entries?.length) { failed++; continue; }

      try {
        await applyFixWeights(db, entries[0]);
        console.log(`  ✅ Pesos redistribuídos`);
        fixed++;
      } catch (e: any) {
        console.error(`  ❌ ${e.message}`);
        failed++;
      }

      if (i < targets.length - 1) await sleep(3000, 6000);
    }

    await browser.close().catch(() => {});
    console.log(`\n${"═".repeat(60)}`);
    console.log(`✅ ${fixed} corrigidos | ❌ ${failed} falhas`);
    return;
  }

  // ── --fix-questions: gera perguntas para quizzes com <5 perguntas ─────────────
  if (FIX_QUESTIONS) {
    const { data: allQuizzes } = await db.from("quizzes")
      .select("id,title,description,type,content").range(0, 999);

    const targets = detectFewQuestionQuizzes((allQuizzes ?? []) as unknown as Quiz[]);
    console.log(`\n🔧 Funsona Quiz Orchestrator — FIX QUESTIONS`);
    console.log(`   ${targets.length} quizzes PERSONALITY com <5 perguntas`);
    if (!targets.length) { console.log("   Nada a fazer."); return; }

    if (DRY_RUN) {
      targets.forEach((q) => {
        const qc = (q.content?.questions ?? []).length;
        const oc = (q.content?.outcomes ?? []).length;
        console.log(`  - [${qc}q, ${oc} outcomes] ${q.title}`);
      });
      return;
    }

    const { browser, page } = await connectChrome();
    await ensureLoggedIn(page);

    let fixed = 0, failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const quiz = targets[i];
      const qCount = (quiz.content?.questions ?? []).length;
      const oCount = (quiz.content?.outcomes ?? []).length;
      console.log(`\n${"─".repeat(60)}`);
      console.log(`[${i + 1}/${targets.length}] "${quiz.title}" (${qCount}q, ${oCount} outcomes)`);

      const message = buildFixQuestionsMessage(quiz);
      let attemptNum = 0;
      let entries: FixQuestionsEntry[] | null = null;

      while (true) {
        try {
          entries = (await sendToChatGPT(page, message, `fix-questions-${i + 1}`)) as unknown as FixQuestionsEntry[];
          break;
        } catch (e: any) {
          const isRetryable = e.name === "RateLimitError" || e.name === "TimeoutError" || e.name === "ChatGPTErrorResponse" || e.message.includes("Timeout");
          if (isRetryable && ++attemptNum <= 10) {
            const waitMin = Math.min(2 * attemptNum, 20);
            console.log(`  ⏸️  ${e.name} (tentativa ${attemptNum}/10) — aguardando ${waitMin}min...`);
            await sleep(waitMin * 60_000, waitMin * 60_000 + 5000);
            continue;
          }
          console.error(`  ❌ ${e.message}`); entries = null; break;
        }
      }

      if (!entries?.length) { failed++; continue; }

      try {
        await applyFixQuestions(db, entries[0]);
        const addedQ = entries[0].new_questions?.length ?? 0;
        const addedO = entries[0].new_outcomes?.length ?? 0;
        console.log(`  ✅ +${addedQ} perguntas${addedO ? `, +${addedO} outcomes` : ""} gerados`);
        fixed++;
      } catch (e: any) {
        console.error(`  ❌ ${e.message}`);
        failed++;
      }

      if (i < targets.length - 1) await sleep(3000, 6000);
    }

    await browser.close().catch(() => {});
    console.log(`\n${"═".repeat(60)}`);
    console.log(`✅ ${fixed} corrigidos | ❌ ${failed} falhas`);
    return;
  }

  // ── Modo normal: processar batches ────────────────────────────────────────────

  const { count: totalQuizzes } = await db.from("quizzes").select("*", { count: "exact", head: true });
  const TOTAL         = totalQuizzes ?? 769;
  const TOTAL_BATCHES = Math.ceil(TOTAL / BATCH_SZ);

  const startBatch = ONLY_BATCH ?? (startArg !== -1 ? parseInt(args[startArg + 1]) : 1);
  const endBatch   = ONLY_BATCH ?? (endArg   !== -1 ? parseInt(args[endArg   + 1]) : TOTAL_BATCHES);

  const projectLabel = process.env.CHATGPT_PROJECT_URL ? ` → projeto: ${CHATGPT_BASE_URL.split("/").pop()}` : "";
  console.log(`\n🤖 Funsona Quiz Orchestrator${projectLabel}`);
  console.log(`   ${TOTAL} quizzes | ${TOTAL_BATCHES} batches de ${BATCH_SZ}`);
  console.log(`   Processando: ${startBatch}–${endBatch}`);
  console.log(`   Refactor threshold: score ≤ ${REFACTOR_THRESHOLD}`);
  if (DRY_RUN)     console.log("   🔍 DRY RUN");
  if (SKIP_IMPORT) console.log("   ⏭️  SKIP IMPORT");

  const { browser, page } = DRY_RUN ? { browser: null, page: null } : await connectChrome().then(async (r) => {
    await ensureLoggedIn(r.page);
    return r;
  });

  let totalApplied = 0, totalFailed = 0, totalSkipped = 0;
  const toUnpublishList: { id: string; title: string }[] = [];

  for (let batchNum = startBatch; batchNum <= endBatch; batchNum++) {
    const bId    = String(batchNum).padStart(3, "0");
    const bTotal = String(TOTAL_BATCHES).padStart(3, "0");
    const offset = (batchNum - 1) * BATCH_SZ;

    console.log(`\n${"─".repeat(60)}`);
    console.log(`📦 Batch ${batchNum}/${TOTAL_BATCHES}  (quizzes ${offset + 1}–${Math.min(offset + BATCH_SZ, TOTAL)})`);

    // Verificar se batch já está 100% aplicado no DB (pula se sim, a menos que --force)
    const batchRow = getBatch(db_sq, batchNum);
    if (batchRow?.status === "applied" && !FORCE) {
      console.log(`  ✅ Já aplicado (DB) — use --force para reprocessar`);
      continue;
    }

    // Buscar quizzes no Supabase
    const { data: quizzes, error } = await db
      .from("quizzes")
      .select("id,slug,title,description,cover_url,type,status,language,tags,content")
      .order("created_at", { ascending: false })
      .range(offset, offset + BATCH_SZ - 1);

    if (error || !quizzes?.length) {
      console.log(`  ⚠️  Sem dados nesse range`);
      continue;
    }

    upsertBatch(db_sq, batchNum, { quiz_count: quizzes.length, started_at: new Date().toISOString(), status: "exported" });

    // Inicializar quizzes no DB se não existirem
    for (const q of quizzes) {
      const existing = db_sq.prepare("SELECT id FROM quiz_reviews WHERE id = ?").get(q.id);
      if (!existing) {
        upsertQuiz(db_sq, q.id, { original_title: q.title, batch_num: batchNum, status: "pending" });
      }
    }

    // Verificar se já tem reviewed JSON salvo
    const existingFiles = await fs.readdir(BATCHES_DIR).catch(() => [] as string[]);
    const reviewedFile  = existingFiles.find((f) => f.includes(`B${bId}`) && f.endsWith("reviewed.json"));

    let entries: ReviewEntry[] | null = null;

    if (reviewedFile && !FORCE) {
      console.log(`  ✅ Já tem reviewed.json: ${reviewedFile}`);
      const raw = await fs.readFile(path.join(BATCHES_DIR, reviewedFile), "utf-8");
      entries = JSON.parse(raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim());
    } else {
      // Montar mensagem
      const message  = buildMessage(quizzes as Quiz[], batchNum, TOTAL_BATCHES, "review");
      const date     = new Date().toISOString().slice(0, 10);
      const baseName = `funsona-quizzes-B${bId}de${bTotal}-${date}`;
      const mdPath   = path.join(BATCHES_DIR, `${baseName}.md`);

      await fs.writeFile(mdPath, message, "utf-8");
      console.log(`  📄 Exportado: ${baseName}.md (${Math.round(message.length / 1024)}kb)`);
      upsertBatch(db_sq, batchNum, { md_file: `${baseName}.md` });

      if (DRY_RUN) {
        console.log(`  🔍 [DRY RUN] Pulando ChatGPT`);
        continue;
      }

      // Retry com backoff para rate limit e timeout — roda desacompanhado por horas,
      // então em vez de sair na primeira vez, espera e tenta de novo.
      const MAX_RETRIES = 10; // backoff 2,4,6,8,10,12,14,16,18,20 min
      let attemptNum = 0;

      while (true) {
        try {
          entries = await sendToChatGPT(page!, message, baseName);
          console.log(`  🎯 ${entries.length} quizzes revisados pelo ChatGPT`);
          upsertBatch(db_sq, batchNum, { status: "reviewed" });

          const reviewedPath = path.join(BATCHES_DIR, `${baseName}-reviewed.json`);
          await fs.writeFile(reviewedPath, JSON.stringify(entries, null, 2), "utf-8");
          console.log(`  💾 Salvo: ${baseName}-reviewed.json`);
          upsertBatch(db_sq, batchNum, { reviewed_file: `${baseName}-reviewed.json` });
          break;
        } catch (e: any) {
          const isRetryable = e.name === "RateLimitError" || e.name === "TimeoutError" || e.name === "ChatGPTErrorResponse" || e.message.includes("Timeout");
          if (isRetryable) {
            attemptNum++;
            if (attemptNum > MAX_RETRIES) {
              console.log(`\n⏸️  TIMEOUT/RATE LIMIT no batch ${batchNum} (${MAX_RETRIES} tentativas esgotadas)`);
              console.log(`   Progresso salvo no DB.`);
              console.log(`   Retome com: npx tsx orchestrate.ts --start ${batchNum} --end ${endBatch}`);
              showStats(db_sq);
              if (browser) await browser.close().catch(() => {});
              process.exit(0);
            }
            const waitMin = Math.min(2 * attemptNum, 20);
            console.log(`\n  ⏸️  ${e.name} no batch ${batchNum} (tentativa ${attemptNum}/${MAX_RETRIES}): ${e.message.slice(0, 60)}`);
            console.log(`     Aguardando ${waitMin}min antes de tentar de novo...`);
            await sleep(waitMin * 60_000, waitMin * 60_000 + 10_000);
            continue;
          }
          console.error(`  ❌ Erro no ChatGPT: ${e.message}`);
          upsertBatch(db_sq, batchNum, { status: "error", error: e.message });
          entries = null;
          break;
        }
      }

      if (!entries) continue;
    }

    if (SKIP_IMPORT || !entries) {
      console.log(`  ⏭️  Import pulado (--skip-import)`);
      continue;
    }

    // Aplicar no Supabase
    let applied = 0, failed = 0, skipped = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry  = entries[i];
      const prefix = `  [${i + 1}/${entries.length}]`;

      const score = entry.score ?? 0;
      const flag  = entry.issues?.some((iss) => iss.includes("RECOMENDO_DESPUBLICAR")) ? "🚨" : score <= REFACTOR_THRESHOLD ? "🔴" : score <= 6 ? "🟡" : "🟢";

      console.log(`${prefix} ${flag} "${entry.new_title?.slice(0, 55)}" — score ${score}/10`);

      if (entry.issues?.some((iss) => iss.includes("RECOMENDO_DESPUBLICAR"))) {
        toUnpublishList.push({ id: entry.id, title: entry.new_title });
        console.log(`       🚨 RECOMENDADO DESPUBLICAR`);
      }
      if (score <= REFACTOR_THRESHOLD) {
        console.log(`       🔴 Score baixo → entrará na fila de refactor`);
      }

      const result = await applyReview(db_sq, db, entry);
      if (result === "applied") { applied++; console.log(`       ✅ Salvo`); }
      else if (result === "failed") { failed++; }
      else skipped++;
    }

    totalApplied += applied;
    totalFailed  += failed;
    totalSkipped += skipped;

    upsertBatch(db_sq, batchNum, { status: "applied", completed_at: new Date().toISOString() });
    console.log(`  → ${applied} aplicados | ${failed} falhas | ${skipped} pulados`);

    // Delay aleatório entre batches (3–8 segundos) — comportamento humano
    if (batchNum < endBatch && !DRY_RUN) {
      const delay = 3000 + Math.floor(Math.random() * 5000);
      process.stdout.write(`  ⏳ Aguardando ${Math.round(delay / 1000)}s antes do próximo batch... `);
      await sleep(delay, delay);
      console.log("pronto");
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Concluído! ${totalApplied} aplicados | ${totalFailed} falhas | ${totalSkipped} pulados`);

  if (toUnpublishList.length) {
    console.log(`\n🚨 ${toUnpublishList.length} para DESPUBLICAR manualmente:`);
    toUnpublishList.forEach(({ id, title }) => console.log(`   - "${title.slice(0, 60)}" (${id})`));
  }

  showStats(db_sq);

  const nextBatch = endBatch + 1;
  if (nextBatch <= TOTAL_BATCHES) {
    const end = Math.min(nextBatch + 9, TOTAL_BATCHES);
    console.log(`▶  Próximo: npx tsx orchestrate.ts --start ${nextBatch} --end ${end}`);
    const refStats = getStats(db_sq);
    if (refStats.refactor > 0) {
      console.log(`🔁 Refactor pendente: npx tsx orchestrate.ts --refactor   (${refStats.refactor} quizzes)`);
    }
  }

  if (browser) await browser.close().catch(() => {});
}

main().catch(console.error);
