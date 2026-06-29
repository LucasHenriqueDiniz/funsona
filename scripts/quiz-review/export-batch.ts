import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
config();

// ─── CLI args ─────────────────────────────────────────────────────────────────
// tsx export-batch.ts                        → batch 1, 10 quizzes
// tsx export-batch.ts --batch 2              → batch 2
// tsx export-batch.ts --batch 1 --size 5     → batch 1, 5 quizzes

const args      = process.argv.slice(2);
const batchFlag = args.indexOf("--batch");
const sizeFlag  = args.indexOf("--size");
const BATCH_NUM  = batchFlag !== -1 ? parseInt(args[batchFlag + 1]) : 1;
const BATCH_SIZE = sizeFlag  !== -1 ? parseInt(args[sizeFlag  + 1]) : 10;
const OFFSET     = (BATCH_NUM - 1) * BATCH_SIZE;

const SUPABASE_URL              = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── Types (schema real do DB, migrado do v1) ─────────────────────────────────

interface Answer {
  id: string;
  label: string;
  order?: number;
  imageUrl?: string;
  isCorrect?: boolean;
  outcomeWeights?: Record<string, number>;
}

interface Question {
  id: string;
  title: string;
  order?: number;
  imageUrl?: string;
  answers: Answer[];
}

interface Outcome {
  key: string;
  title: string;
  description: string;
  imageUrl?: string;
}

interface Quiz {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  type: "TRIVIA" | "PERSONALITY";
  status: string;
  language: string;
  tags: string[];
  content: { questions: Question[]; outcomes?: Outcome[]; coverUrl?: string };
}

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
      const letter   = LETTERS[ai] ?? String(ai);
      const aHasImg  = a.imageUrl && a.imageUrl.length > 0;
      const imgNote  = aHasImg ? " 🖼️" : "";
      let extra = "";
      if (quiz.type === "TRIVIA") {
        extra = a.isCorrect ? " **← CORRETA**" : "";
      } else if (a.outcomeWeights) {
        const keys = Object.entries(a.outcomeWeights)
          .filter(([, w]) => w > 0).map(([k]) => k).join(", ");
        extra = keys ? ` *(→ ${keys})*` : "";
      }
      lines.push(`- **${letter})** \`${a.id}\`${imgNote} ${a.label ?? "*(sem texto)*"}${extra}`);
    });
    lines.push(``);
  });

  if (outcomes.length > 0) {
    lines.push(`### Outcomes / Resultados`);
    lines.push(``);
    outcomes.forEach((o) => {
      const hasImg = o.imageUrl && o.imageUrl.length > 0;
      lines.push(`**\`${o.key}\`** ${hasImg ? "🖼️" : "*(sem imagem)*"} — **${o.title}**`);
      lines.push(`> ${o.description}`);
      lines.push(``);
    });
  }

  return lines.join("\n");
}

// ─── Prompt instruction ───────────────────────────────────────────────────────

function buildPrompt(total: number, batchNum: number, totalBatches: number, quizzes: Quiz[]): string {
  const personalityInfo = quizzes
    .filter((q) => q.type === "PERSONALITY" && q.content?.outcomes?.length)
    .map((q) => `- \`${q.id}\` — outcomes: [${q.content.outcomes!.map((o) => o.key).join(", ")}]`)
    .join("\n");

  return `# Revisão de Quizzes Funsona — Batch ${String(batchNum).padStart(3, "0")} de ${String(totalBatches).padStart(3, "0")} (${total} quizzes)

Você é um especialista em criação de quizzes de entretenimento e educação. Revise os quizzes abaixo e retorne **apenas um array JSON** com as melhorias. Sem texto antes ou depois do JSON.

## Regras gerais

- Escreva **no mesmo idioma do quiz** (Português, Inglês ou Espanhol)
- **Não crie perguntas nem alternativas novas** — apenas melhore as existentes
- **Não remova perguntas** — mesmo que estejam ruins, inclua-as no output
- Preserve os IDs **exatamente** como estão (não altere nenhum ID)
- Se uma pergunta está sem texto ou sem alternativas, melhore o que existe e sinalize nos issues

## O que fazer em cada quiz

1. **Título** — reescreva para ser irresistível e curioso (max 200 chars, mesmo idioma)
2. **Descrição** — reescreva para gerar vontade de jogar imediatamente (max 1000 chars)
3. **Perguntas** — melhore clareza, gramática e naturalidade; elimine perguntas duplicadas reescrevendo-as de ângulos diferentes
4. **Alternativas** — texto claro, balanceado, sem opções absurdas demais ou óbvias demais
   - **TRIVIA**: verifique factualmente se a alternativa **← CORRETA** está correta; se não estiver, corrija e aponte nos issues
   - **PERSONALITY**: verifique se os outcome_keys das alternativas existem nos outcomes listados do quiz
5. **Outcomes** (PERSONALITY) — título envolvente, descrição que faça o usuário querer compartilhar
6. **Issues** — liste todos os problemas encontrados, incluindo:
   - Quiz PERSONALITY se comportando como TRIVIA (ou vice-versa)
   - Perguntas duplicadas ou muito parecidas
   - Alternativas idênticas ou sem sentido
   - Outcomes faltando ou sem imagem
   - Quiz publicado mas incompleto → adicione: "RECOMENDO_DESPUBLICAR" no array de issues
7. **Score** — nota 1–10 da qualidade **antes** das suas melhorias
8. **Resumo** — 1–2 frases em português descrevendo o estado geral do quiz
${personalityInfo ? `\n## Outcomes válidos (PERSONALITY)\n${personalityInfo}\n` : ""}
## Formato de retorno

Retorne exatamente este formato JSON, sem markdown em volta:

[
  {
    "id": "uuid-exato-do-quiz",
    "new_title": "Título melhorado",
    "new_description": "Descrição melhorada",
    "score": 7,
    "issues": ["problema 1", "problema 2"],
    "missing_images": {
      "cover": false,
      "questions": ["id-da-pergunta-sem-imagem"],
      "options": [],
      "outcomes": ["key-sem-imagem"]
    },
    "new_questions": [
      {
        "id": "id-exato-da-pergunta",
        "text": "Texto melhorado",
        "options": [
          { "id": "id-exato-da-opcao", "text": "Texto melhorado" }
        ]
      }
    ],
    "new_outcomes": [
      { "key": "chave-exata", "title": "Título melhorado", "description": "Descrição melhorada" }
    ],
    "summary": "Resumo em português"
  }
]

---

# Quizzes para revisar

`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`📦 Exportando batch ${BATCH_NUM} (quizzes ${OFFSET + 1}–${OFFSET + BATCH_SIZE})...`);

  const { data: quizzes, error } = await db
    .from("quizzes")
    .select("id,slug,title,description,cover_url,type,status,language,tags,content")
    .order("created_at", { ascending: false })
    .range(OFFSET, OFFSET + BATCH_SIZE - 1);

  if (error) { console.error("❌", error.message); process.exit(1); }
  if (!quizzes?.length) { console.log("⚠️ Nenhum quiz nesse range."); return; }

  const total = quizzes.length;
  console.log(`✅ ${total} quizzes carregados`);

  // Contar total de quizzes no banco para calcular total de batches
  const { count } = await db.from("quizzes").select("*", { count: "exact", head: true });
  const TOTAL_QUIZZES  = count ?? 769;
  const TOTAL_BATCHES  = Math.ceil(TOTAL_QUIZZES / BATCH_SIZE);

  const prompt  = buildPrompt(total, BATCH_NUM, TOTAL_BATCHES, quizzes as Quiz[]);
  const quizMd  = (quizzes as Quiz[]).map((q, i) => quizToMarkdown(q, i, total)).join("\n");
  const fullMd  = prompt + quizMd;

  // ── Save files ────────────────────────────────────────────────────────────────

  const batchesDir = path.join(process.cwd(), "batches");
  await fs.mkdir(batchesDir, { recursive: true });

  const date    = new Date().toISOString().slice(0, 10);            // 2026-05-25
  const bId     = String(BATCH_NUM).padStart(3, "0");               // 001
  const bTotal  = String(TOTAL_BATCHES).padStart(3, "0");           // 077
  // funsona-quizzes-B001de077-2026-05-25.md
  const baseName = `funsona-quizzes-B${bId}de${bTotal}-${date}`;
  const mdPath   = path.join(batchesDir, `${baseName}.md`);
  const idPath   = path.join(batchesDir, `${baseName}-ids.json`);

  await fs.writeFile(mdPath, fullMd, "utf-8");
  await fs.writeFile(idPath, JSON.stringify(quizzes.map((q: any) => q.id), null, 2));

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const nocover = (quizzes as Quiz[]).filter((q) => !q.cover_url && !q.content?.coverUrl).length;
  const nodesc  = (quizzes as Quiz[]).filter((q) => !q.description).length;
  const chars   = fullMd.length;
  const tokens  = Math.ceil(chars / 4);

  const reviewedFile = `${baseName}-reviewed.json`;

  console.log(`\n📄 ${mdPath}`);
  console.log(`📊 ${total} quizzes | ${chars.toLocaleString()} chars | ~${tokens.toLocaleString()} tokens`);
  console.log(`🖼️  Sem capa: ${nocover} | Sem descrição: ${nodesc}`);
  console.log(`\n📋 Fluxo:`);
  console.log(`   1. Abra    → batches/${baseName}.md`);
  console.log(`   2. Cole tudo no ChatGPT`);
  console.log(`   3. Salve a resposta → batches/${reviewedFile}`);
  console.log(`   4. Teste   → npx tsx import-review.ts --file batches/${reviewedFile} --dry-run`);
  console.log(`   5. Aplique → npx tsx import-review.ts --file batches/${reviewedFile}`);
  console.log(`\n   Próximo  → npx tsx export-batch.ts --batch ${BATCH_NUM + 1} --size ${BATCH_SIZE}`);
  console.log(`   Progresso: batch ${BATCH_NUM}/${TOTAL_BATCHES} (${BATCH_SIZE} quizzes cada)`);
}

main().catch(console.error);
