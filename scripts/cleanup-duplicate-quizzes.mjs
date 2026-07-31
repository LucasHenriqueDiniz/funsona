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
 *   node scripts/cleanup-duplicate-quizzes.mjs            # report only
 *   node scripts/cleanup-duplicate-quizzes.mjs --apply    # actually write
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (production still runs the
 * Supabase-backed API; once the D1 cutover lands, point this at D1 instead).
 *
 * Talks to PostgREST over plain fetch so it has no npm dependencies and can run
 * from the repo root without an install step.
 */
const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** [keeper slug, duplicate slug] — from scripts/duplicate-quizzes.md */
const PAIRS = [
  ["qual-e-o-seu-alinhamento-moral", "qual-e-o-seu-alinhamento-moral-1"],
  ["qual-e-o-seu-alinhamento-moral", "qual-e-o-seu-alinhamento-moral-5"],
  ["quem-e-voce-descubra-seu-arquetipo", "quem-e-voce-descubra-seu-arquetipo-6"],
  ["qual-e-a-minha-ideologia-politica", "qual-e-a-minha-ideologia-politica-5"],
  ["qual-pokemon-inicial-voce-deve-escolher", "qual-pokemon-inicial-voce-deve-escolher-5"],
  ["como-sera-seu-2024", "como-sera-seu-2024-6"],
  ["que-tipo-de-macaco-voce-e", "que-tipo-de-macaco-voce-e-5"],
  ["quem-e-voce", "quem-e-voce-5"],
  [
    "quao-facilmente-voce-se-deixa-seduzir-descubra-seu-perfil-de-seducao",
    "quao-facilmente-voce-se-deixa-seduzir-descubra-seu-perfil-de-seducao-5",
  ],
  [
    "descubra-o-que-as-pessoas-que-voce-acha-atraente-revelam-sobre-voce",
    "descubra-o-que-as-pessoas-que-voce-acha-atraente-revelam-sobre-voce-5",
  ],
  [
    "o-que-diz-sua-mensagem-personalizada-de-biscoito-da-sorte",
    "o-que-diz-sua-mensagem-personalizada-de-biscoito-da-sorte-5",
  ],
  ["descubra-se-voce-conhece-bem-o-nosso-planeta", "descubra-se-voce-conhece-bem-o-nosso-planeta-5"],
  ["que-criatura-sobrenatural-guarda-seus-sonhos", "que-criatura-sobrenatural-guarda-seus-sonhos-5"],
  ["qual-classe-voce-deve-escolher", "qual-classe-voce-deve-escolher-5"],
  ["voce-e-kira-ou-l", "voce-e-kira-ou-l-5"],
  ["qual-e-o-meu-fetiche-descubra-seu-fetiche-sexual", "qual-e-o-meu-fetiche-descubra-seu-fetiche-sexual-5"],
  ["descubra-quao-atraente-voce-e", "descubra-quao-atraente-voce-e-5"],
  ["qual-e-o-meu-estilo-de-apego", "qual-e-o-meu-estilo-de-apego-5"],
  ["voce-e-mais-acucar-ou-sal", "voce-e-mais-acucar-ou-sal-5"],
  ["qual-casa-voce-deve-escolher", "qual-casa-voce-deve-escolher-1"],
  ["qual-personagem-voce-e", "qual-personagem-voce-e-1"],
  ["em-que-pais-voce-deve-morar", "em-que-pais-voce-deve-morar-1"],
];

const normalize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{Nd}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const questionFingerprint = (quiz) => {
  const questions = quiz?.content?.questions ?? [];
  return JSON.stringify(questions.map((q) => normalize(q?.text ?? q?.title)));
};

async function fetchQuiz(slug) {
  const rows = await rest(
    `quizzes?slug=eq.${encodeURIComponent(slug)}&select=id,slug,title,status,content,attempts_count`
  );
  return rows?.[0] ?? null;
}

async function main() {
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
    if (questionFingerprint(keeper) !== questionFingerprint(duplicate)) {
      console.log(`SKIP ${duplicateSlug} — questions no longer identical, needs a human`);
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

    await rest(`quizzes?id=eq.${encodeURIComponent(duplicate.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ARCHIVED" }),
    });

    await rest("quiz_slug_redirects", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ old_slug: duplicate.slug, new_slug: keeper.slug, quiz_id: keeper.id }),
    });
  }

  console.log(`\n${retired} to retire, ${skipped} skipped.`);
  if (!APPLY && retired > 0) console.log("Re-run with --apply to write these changes.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
