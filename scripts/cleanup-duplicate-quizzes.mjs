/**
 * Retires reviewed near-duplicate quizzes (see scripts/duplicate-quizzes.md).
 *
 * These pairs are NOT exact copies — they are paraphrased variants of the same
 * quiz, generated from the same template (every pair has an identical question
 * count) and then reworded. That is a judgement call, not a mechanical dedupe,
 * so the list below is a reviewed decision rather than an audit output.
 *
 * Set TIER to choose how aggressive to be:
 *   "paraphrased" — the 13 clearest same-quiz-twice cases (default)
 *   "all"         — all 22 pairs sharing a base slug
 *
 * For every pair this script:
 *   1. verifies the duplicate is still PUBLISHED and still has 0 attempts,
 *   2. sets its status to ARCHIVED,
 *   3. inserts a quiz_slug_redirects row so the retired URL 301s to the keeper
 *      instead of 404ing.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   node scripts/cleanup-duplicate-quizzes.mjs                          # report only, tier=paraphrased
 *   node scripts/cleanup-duplicate-quizzes.mjs --apply                  # write, tier=paraphrased
 *   node scripts/cleanup-duplicate-quizzes.mjs --tier=all --apply       # write, all 22 pairs
 *
 * Talks to production D1 (`funsona-db`) via `wrangler d1 execute --remote`,
 * run from apps/api where wrangler.toml declares the binding. Reversible:
 * archived rows can be flipped back to status='PUBLISHED' and the redirect
 * row deleted — nothing is ever DELETEd.
 */
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const TIER = (process.argv.find((a) => a.startsWith("--tier="))?.split("=")[1]) || "paraphrased";

function d1Query(sql) {
  const quotedSql = `"${sql.replace(/"/g, '\\"')}"`;
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "funsona-db", "--remote", "--json", "--command", quotedSql],
    {
      cwd: new URL("../apps/api", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 16,
      shell: true,
    }
  );
  const parsed = JSON.parse(out);
  return parsed[0]?.results ?? [];
}

const esc = (s) => String(s).replace(/'/g, "''");

async function fetchQuiz(slug) {
  const rows = d1Query(
    `SELECT id, slug, title, status, content, attempts_count FROM quizzes WHERE slug = '${esc(slug)}'`
  );
  return rows[0] ?? null;
}

/** [keeper slug, duplicate slug, verdict] — from scripts/duplicate-quizzes.md */
const PAIRS = [
  ["qual-e-o-seu-alinhamento-moral", "qual-e-o-seu-alinhamento-moral-1", "paraphrased"],
  ["qual-e-o-seu-alinhamento-moral", "qual-e-o-seu-alinhamento-moral-5", "paraphrased"],
  ["quem-e-voce-descubra-seu-arquetipo", "quem-e-voce-descubra-seu-arquetipo-6", "distinct-ish"],
  ["qual-e-a-minha-ideologia-politica", "qual-e-a-minha-ideologia-politica-5", "distinct-ish"],
  ["qual-pokemon-inicial-voce-deve-escolher", "qual-pokemon-inicial-voce-deve-escolher-5", "paraphrased"],
  ["como-sera-seu-2024", "como-sera-seu-2024-6", "paraphrased"],
  ["que-tipo-de-macaco-voce-e", "que-tipo-de-macaco-voce-e-5", "paraphrased"],
  ["quem-e-voce", "quem-e-voce-5", "paraphrased"],
  [
    "quao-facilmente-voce-se-deixa-seduzir-descubra-seu-perfil-de-seducao",
    "quao-facilmente-voce-se-deixa-seduzir-descubra-seu-perfil-de-seducao-5",
    "paraphrased",
  ],
  [
    "descubra-o-que-as-pessoas-que-voce-acha-atraente-revelam-sobre-voce",
    "descubra-o-que-as-pessoas-que-voce-acha-atraente-revelam-sobre-voce-5",
    "distinct-ish",
  ],
  [
    "o-que-diz-sua-mensagem-personalizada-de-biscoito-da-sorte",
    "o-que-diz-sua-mensagem-personalizada-de-biscoito-da-sorte-5",
    "distinct-ish",
  ],
  ["descubra-se-voce-conhece-bem-o-nosso-planeta", "descubra-se-voce-conhece-bem-o-nosso-planeta-5", "distinct-ish"],
  ["que-criatura-sobrenatural-guarda-seus-sonhos", "que-criatura-sobrenatural-guarda-seus-sonhos-5", "paraphrased"],
  ["qual-classe-voce-deve-escolher", "qual-classe-voce-deve-escolher-5", "paraphrased"],
  ["voce-e-kira-ou-l", "voce-e-kira-ou-l-5", "distinct-ish"],
  ["qual-e-o-meu-fetiche-descubra-seu-fetiche-sexual", "qual-e-o-meu-fetiche-descubra-seu-fetiche-sexual-5", "paraphrased"],
  ["descubra-quao-atraente-voce-e", "descubra-quao-atraente-voce-e-5", "paraphrased"],
  ["qual-e-o-meu-estilo-de-apego", "qual-e-o-meu-estilo-de-apego-5", "distinct-ish"],
  ["voce-e-mais-acucar-ou-sal", "voce-e-mais-acucar-ou-sal-5", "paraphrased"],
  ["qual-casa-voce-deve-escolher", "qual-casa-voce-deve-escolher-1", "paraphrased"],
  ["qual-personagem-voce-e", "qual-personagem-voce-e-1", "distinct-ish"],
  ["em-que-pais-voce-deve-morar", "em-que-pais-voce-deve-morar-1", "distinct-ish"],
].filter(([, , verdict]) => TIER === "all" || verdict === TIER);

// Paraphrased pairs never have identical question text by definition (that's
// why they're "paraphrased" and not exact copies) — see duplicate-quizzes.md.
// The invariant the audit actually verified, and the one worth re-checking
// here as a staleness guard, is identical question COUNT: "every single pair
// has an identical question count... generated from the same template".
const questionCount = (quiz) => (JSON.parse(quiz?.content ?? "{}")?.questions ?? []).length;

async function main() {
  console.log(`TIER: ${TIER} (${PAIRS.length} pairs)`);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: DRY RUN (no writes)\n");

  let retired = 0;
  let skipped = 0;

  for (const [keeperSlug, duplicateSlug] of PAIRS) {
    const keeper = await fetchQuiz(keeperSlug);
    const duplicate = await fetchQuiz(duplicateSlug);

    if (!keeper || !duplicate) {
      console.log(`SKIP ${duplicateSlug} — one of the pair no longer exists`);
      skipped++;
      continue;
    }
    if (duplicate.status !== "PUBLISHED") {
      console.log(`SKIP ${duplicateSlug} — already ${duplicate.status}`);
      skipped++;
      continue;
    }
    if (questionCount(keeper) !== questionCount(duplicate)) {
      console.log(`SKIP ${duplicateSlug} — question count no longer matches, needs a human`);
      skipped++;
      continue;
    }
    if (Number(duplicate.attempts_count ?? 0) > 0) {
      console.log(`SKIP ${duplicateSlug} — has ${duplicate.attempts_count} plays, needs a human`);
      skipped++;
      continue;
    }

    console.log(`RETIRE ${duplicateSlug}  ->  ${keeperSlug}`);
    retired++;
    if (!APPLY) continue;

    d1Query(`UPDATE quizzes SET status = 'ARCHIVED', updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = '${esc(duplicate.id)}'`);

    d1Query(
      `INSERT INTO quiz_slug_redirects (old_slug, quiz_id, new_slug) VALUES ('${esc(duplicate.slug)}', '${esc(keeper.id)}', '${esc(keeper.slug)}')
       ON CONFLICT(old_slug) DO UPDATE SET quiz_id = excluded.quiz_id, new_slug = excluded.new_slug`
    );
  }

  console.log(`\n${retired} to retire, ${skipped} skipped.`);
  if (!APPLY && retired > 0) console.log("Re-run with --apply to write these changes.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
