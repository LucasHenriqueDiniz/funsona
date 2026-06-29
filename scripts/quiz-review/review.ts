import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

config();

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AI_PROVIDER = (process.env.AI_PROVIDER ?? "openrouter") as "google" | "openrouter";
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (AI_PROVIDER === "google" && !GOOGLE_AI_API_KEY) {
  console.error("❌ Missing GOOGLE_AI_API_KEY");
  process.exit(1);
}
if (AI_PROVIDER === "openrouter" && !OPENROUTER_API_KEY) {
  console.error("❌ Missing OPENROUTER_API_KEY");
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizOption {
  id: string;
  text: string;
  image_url?: string | null;
  is_correct?: boolean;
  outcome_key?: string;
  points?: number;
}

interface QuizQuestion {
  id: string;
  text: string;
  image_url?: string | null;
  options: QuizOption[];
}

interface QuizOutcome {
  key: string;
  title: string;
  description: string;
  image_url?: string | null;
  min_score?: number;
  max_score?: number;
}

interface QuizContent {
  questions: QuizQuestion[];
  outcomes?: QuizOutcome[];
}

interface Quiz {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  type: "TRIVIA" | "PERSONALITY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  language: string;
  tags: string[];
  content: QuizContent;
}

interface ReviewSuggestionOption {
  id: string;
  text: string;
}

interface ReviewSuggestionQuestion {
  id: string;
  text: string;
  options: ReviewSuggestionOption[];
}

interface ReviewSuggestionOutcome {
  key: string;
  title: string;
  description: string;
}

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
    questions: ReviewSuggestionQuestion[];
    outcomes: ReviewSuggestionOutcome[];
  };
  score: number;
  summary: string;
  error?: string;
}

// ─── AI clients ───────────────────────────────────────────────────────────────

// Google: chamada HTTP direta (v1beta) igual ao Tampermonkey — evita problemas de SDK desatualizado
// gemini-2.0-flash: 10 req/min, 1500 req/dia (free tier) — adequado para 769 quizzes
// gemini-2.5-flash: 5 req/min, 20 req/dia (free tier) — inviável para volume alto
const GOOGLE_MODEL = "gemini-2.0-flash";

let openrouterClient: OpenAI | null = null;

if (AI_PROVIDER === "google") {
  console.log(`🤖 Usando Google AI direto: ${GOOGLE_MODEL}`);
} else {
  openrouterClient = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
  });
  console.log(`🤖 Usando OpenRouter: ${OPENROUTER_MODEL}`);
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(quiz: Quiz): string {
  const questions = quiz.content?.questions ?? [];
  const outcomes = quiz.content?.outcomes ?? [];
  const outcomeKeys = outcomes.map((o) => o.key);

  return `Você é um especialista em criação de quizzes educativos e de entretenimento. Revise o quiz abaixo e retorne um JSON com melhorias.

IDIOMA DO QUIZ: ${quiz.language === "pt" ? "Português" : quiz.language === "es" ? "Espanhol" : "Inglês"}
TIPO: ${quiz.type === "TRIVIA" ? "Trivia (tem resposta correta)" : "Personalidade (mapeia para resultados)"}

=== QUIZ ATUAL ===
Título: ${quiz.title}
Descrição: ${quiz.description ?? "(sem descrição)"}
Tags: ${(quiz.tags ?? []).join(", ") || "(sem tags)"}
Imagem de capa: ${quiz.cover_url ? "✅ tem" : "❌ sem imagem"}

Perguntas:
${questions
  .map(
    (q, i) => `
  [Q${i + 1}] ID: ${q.id}
  Texto: ${q.text}
  Imagem: ${q.image_url ? "✅" : "❌ sem imagem"}
  Opções:
${(q.options ?? [])
  .map(
    (o) =>
      `    - ID: ${o.id} | Texto: "${o.text}"${
        quiz.type === "TRIVIA"
          ? ` | Correta: ${o.is_correct ? "SIM" : "não"}`
          : ` | outcome_key: "${o.outcome_key ?? "?"}"`
      } | Imagem: ${o.image_url ? "✅" : "❌"}`
  )
  .join("\n")}`
  )
  .join("\n")}
${
  outcomes.length > 0
    ? `
Resultados (outcomes):
${outcomes
  .map(
    (o) => `  - key: "${o.key}" | Título: "${o.title}" | Desc: "${o.description}" | Imagem: ${o.image_url ? "✅" : "❌"}`
  )
  .join("\n")}`
    : ""
}

=== INSTRUÇÕES ===
1. Melhore o título para ser mais atrativo e engajante (max 200 chars, mesmo idioma do quiz)
2. Melhore a descrição para ser mais envolvente e deixar o usuário curioso (max 1000 chars)
3. Para cada pergunta: melhore a clareza, gramática e naturalidade do texto
4. Para cada opção: melhore o texto para ser mais claro e bem balanceado
   - Para TRIVIA: verifique se a opção marcada como correta realmente é a correta factualmente
   - Para PERSONALIDADE: verifique se os outcome_keys nas opções batem com os outcomes existentes: [${outcomeKeys.join(", ")}]
5. Para outcomes de PERSONALIDADE: melhore título e descrição
6. Liste todos os campos de imagem que estão ausentes (null/undefined)
7. Dê um score de 1-10 sobre a qualidade geral do quiz ANTES das melhorias
8. Liste os problemas encontrados (issues)
9. Escreva um resumo em português sobre o estado do quiz

IMPORTANTE: Retorne APENAS o JSON abaixo, sem markdown, sem explicação, sem \`\`\`json:

{
  "issues": ["lista de problemas encontrados"],
  "missing_images": {
    "cover": true/false,
    "questions": ["id das perguntas sem imagem"],
    "options": ["id das opções sem imagem"],
    "outcomes": ["key dos outcomes sem imagem"]
  },
  "suggestions": {
    "title": "título melhorado",
    "description": "descrição melhorada",
    "questions": [
      {
        "id": "id_da_pergunta",
        "text": "texto melhorado",
        "options": [
          { "id": "id_da_opcao", "text": "texto melhorado" }
        ]
      }
    ],
    "outcomes": [
      { "key": "chave", "title": "título melhorado", "description": "descrição melhorada" }
    ]
  },
  "score": 7,
  "summary": "Resumo do estado do quiz em português"
}`;
}

// ─── AI call ──────────────────────────────────────────────────────────────────

async function callGoogleDirect(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    });

    if (res.status === 429) {
      // Parse retry delay from response body
      const body = await res.text();
      const delayMatch = body.match(/"retryDelay":"(\d+)s"/);
      const waitSec = delayMatch ? parseInt(delayMatch[1]) + 5 : 65;
      process.stdout.write(`⏳ rate limit, aguardando ${waitSec}s... `);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google AI HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Google AI: resposta sem texto");
    return text;
  }

  throw new Error("Google AI: máximo de retries atingido após rate limit");
}

async function reviewWithAI(quiz: Quiz): Promise<Omit<ReviewResult, "quiz_id" | "quiz_slug" | "quiz_title" | "quiz_type" | "quiz_status">> {
  const prompt = buildPrompt(quiz);

  let rawText = "";

  if (AI_PROVIDER === "google") {
    rawText = await callGoogleDirect(prompt);
  } else if (openrouterClient) {
    const completion = await openrouterClient.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    rawText = completion.choices[0]?.message?.content ?? "";
  }

  // Strip markdown code fences if AI wrapped the JSON anyway
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract just the JSON object from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Last resort: retry once with a stricter prompt
        throw new Error(`JSON inválido retornado pela AI: ${cleaned.slice(0, 100)}`);
      }
    }
    throw new Error(`Sem JSON na resposta da AI: ${cleaned.slice(0, 100)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🔍 Buscando quizzes no Supabase...");

  const allQuizzes: Quiz[] = [];
  const PAGE_SIZE = 100;
  let page = 0;

  while (true) {
    const { data, error } = await db
      .from("quizzes")
      .select("id, slug, title, description, cover_url, type, status, language, tags, content")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Erro ao buscar quizzes:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allQuizzes.push(...(data as Quiz[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`✅ ${allQuizzes.length} quizzes encontrados\n`);

  const results: ReviewResult[] = [];
  // gemini-2.0-flash free tier: 10 req/min → 1 req a cada 7s para ficar seguro
  const DELAY_MS = 7000;

  for (let i = 0; i < allQuizzes.length; i++) {
    const quiz = allQuizzes[i];
    const prefix = `[${i + 1}/${allQuizzes.length}]`;
    process.stdout.write(`${prefix} Revisando "${quiz.title}"... `);

    try {
      if (!quiz.content?.questions?.length) {
        console.log("⏭️  sem perguntas, pulando");
        results.push({
          quiz_id: quiz.id,
          quiz_slug: quiz.slug,
          quiz_title: quiz.title,
          quiz_type: quiz.type,
          quiz_status: quiz.status,
          issues: ["Quiz sem perguntas"],
          missing_images: { cover: !quiz.cover_url, questions: [], options: [], outcomes: [] },
          suggestions: { title: quiz.title, description: quiz.description ?? "", questions: [], outcomes: [] },
          score: 0,
          summary: "Quiz sem conteúdo de perguntas.",
        });
        continue;
      }

      // Retry once on JSON parse failure
      let review: Awaited<ReturnType<typeof reviewWithAI>> | null = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          review = await reviewWithAI(quiz);
          break;
        } catch (err: any) {
          if (attempt === 1 && err.message.includes("JSON")) {
            process.stdout.write("🔄 retry... ");
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            throw err;
          }
        }
      }

      results.push({
        quiz_id: quiz.id,
        quiz_slug: quiz.slug,
        quiz_title: quiz.title,
        quiz_type: quiz.type,
        quiz_status: quiz.status,
        ...review!,
      });
      console.log(`✅ score ${review!.score}/10`);
    } catch (err: any) {
      console.log(`❌ erro: ${err.message}`);
      results.push({
        quiz_id: quiz.id,
        quiz_slug: quiz.slug,
        quiz_title: quiz.title,
        quiz_type: quiz.type,
        quiz_status: quiz.status,
        issues: ["Erro ao processar com AI"],
        missing_images: { cover: !quiz.cover_url, questions: [], options: [], outcomes: [] },
        suggestions: { title: quiz.title, description: quiz.description ?? "", questions: [], outcomes: [] },
        score: 0,
        summary: "",
        error: err.message,
      });
    }

    if (i < allQuizzes.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // ─── Save reports ──────────────────────────────────────────────────────────

  const exportsDir = path.join(process.cwd(), "exports");
  await fs.mkdir(exportsDir, { recursive: true });

  const timestamp = new Date().toISOString().split("T")[0];
  const jsonPath = path.join(exportsDir, `quiz-review-${timestamp}.json`);
  const mdPath = path.join(exportsDir, `quiz-review-${timestamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));

  // ─── Markdown summary ──────────────────────────────────────────────────────

  const noImage = results.filter((r) => r.missing_images.cover);
  const lowScore = results.filter((r) => r.score > 0 && r.score <= 5);
  const errors = results.filter((r) => r.error);
  const avgScore = results.filter((r) => r.score > 0).reduce((a, b) => a + b.score, 0) / results.filter((r) => r.score > 0).length;

  let md = `# Relatório de Revisão de Quizzes
Data: ${new Date().toLocaleDateString("pt-BR")}
Provider: ${AI_PROVIDER === "google" ? "Google Gemini 1.5 Flash" : `OpenRouter (${OPENROUTER_MODEL})`}

## Resumo Geral

| Métrica | Valor |
|---|---|
| Total de quizzes | ${results.length} |
| Score médio | ${avgScore.toFixed(1)}/10 |
| Sem imagem de capa | ${noImage.length} |
| Score baixo (≤5) | ${lowScore.length} |
| Erros de processamento | ${errors.length} |

---

## Quizzes sem Imagem de Capa (${noImage.length})

${noImage.map((r) => `- **${r.quiz_title}** (\`${r.quiz_slug}\`) — score ${r.score}/10`).join("\n") || "_Nenhum_"}

---

## Quizzes com Score Baixo ≤ 5 (${lowScore.length})

${
  lowScore
    .sort((a, b) => a.score - b.score)
    .map(
      (r) => `### ${r.quiz_title} — ${r.score}/10
- **Slug:** \`${r.quiz_slug}\`
- **Tipo:** ${r.quiz_type} | **Status:** ${r.quiz_status}
- **Problemas:** ${r.issues.join(", ") || "nenhum"}
- **Resumo:** ${r.summary}
`
    )
    .join("\n") || "_Nenhum_"
}

---

## Todos os Quizzes

${results
  .sort((a, b) => a.score - b.score)
  .map(
    (r) => `### [${r.score}/10] ${r.quiz_title}
- **Slug:** \`${r.quiz_slug}\` | **Tipo:** ${r.quiz_type} | **Status:** ${r.quiz_status}
- **Sem imagem:** capa=${r.missing_images.cover ? "❌" : "✅"} | perguntas sem img: ${r.missing_images.questions.length} | opções sem img: ${r.missing_images.options.length}
- **Problemas:** ${r.issues.join("; ") || "nenhum"}
- **Título sugerido:** ${r.suggestions.title !== r.quiz_title ? `_"${r.suggestions.title}"_` : "_sem alteração_"}
- **Resumo:** ${r.summary}
`
  )
  .join("\n")}
`;

  await fs.writeFile(mdPath, md);

  console.log(`\n📊 Relatório salvo em:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   MD:   ${mdPath}`);
  console.log(`\n📈 Score médio: ${avgScore.toFixed(1)}/10`);
  console.log(`🖼️  Sem capa: ${noImage.length} quizzes`);
  console.log(`⚠️  Score baixo (≤5): ${lowScore.length} quizzes`);
  if (errors.length) console.log(`❌ Erros: ${errors.length} quizzes`);
  console.log(`\n✅ Pronto! Revise o relatório .md e depois rode: tsx apply.ts --report exports/quiz-review-${timestamp}.json --dry-run`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
