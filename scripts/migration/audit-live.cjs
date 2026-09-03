// Read-only audit against the live Supabase `quizzes` table.
// Ranks quizzes by real completeness/quality problems, derived from the row itself.
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function analyze(quiz) {
  const content = quiz.content || {};
  const questions = content.questions || [];
  const outcomes = content.outcomes || [];
  const issues = [];

  const isTrivia = quiz.type === "TRIVIA";

  if (questions.length === 0) issues.push("NO_QUESTIONS");
  else if (questions.length < 4) issues.push("TOO_FEW_QUESTIONS");

  if (!isTrivia) {
    if (outcomes.length === 0) issues.push("NO_OUTCOMES");
    else if (outcomes.length < 2) issues.push("TOO_FEW_OUTCOMES");
  }

  const emptyOptionQuestions = questions.filter(
    (q) => !q.answers || q.answers.length < 2 || q.answers.some((a) => !a.label || !a.label.trim())
  );
  if (emptyOptionQuestions.length > 0) issues.push(`EMPTY_OR_FEW_OPTIONS(${emptyOptionQuestions.length})`);

  const titles = questions.map((q) => (q.title || "").trim().toLowerCase()).filter(Boolean);
  const dupTitles = titles.length - new Set(titles).size;
  if (dupTitles > 0) issues.push(`DUPLICATE_QUESTIONS(${dupTitles})`);

  const emptyOutcomeDesc = outcomes.filter((o) => !o.description || !o.description.trim());
  if (emptyOutcomeDesc.length > 0) issues.push(`OUTCOME_MISSING_DESC(${emptyOutcomeDesc.length})`);

  const outcomeKeys = outcomes.map((o) => o.key);
  const answersWithWeights = questions.flatMap((q) => q.answers || []).filter((a) => a.outcomeWeights);
  const referencesUnknownOutcome = answersWithWeights.some((a) =>
    Object.keys(a.outcomeWeights || {}).some((k) => !outcomeKeys.includes(k))
  );
  if (outcomes.length > 0 && referencesUnknownOutcome) issues.push("WEIGHT_REFERENCES_UNKNOWN_OUTCOME");

  if (!quiz.cover_url) issues.push("NO_COVER");
  else if (!/supabase/i.test(quiz.cover_url) && /^https?:\/\//.test(quiz.cover_url)) {
    issues.push("EXTERNAL_COVER:" + new URL(quiz.cover_url).hostname);
  }

  let severity = 0;
  if (issues.includes("NO_QUESTIONS")) severity += 100;
  if (issues.includes("NO_OUTCOMES")) severity += 50;
  if (issues.includes("TOO_FEW_QUESTIONS")) severity += 20;
  if (issues.includes("TOO_FEW_OUTCOMES")) severity += 10;
  severity += emptyOptionQuestions.length * 5;
  severity += dupTitles * 3;
  severity += emptyOutcomeDesc.length * 3;
  if (issues.includes("WEIGHT_REFERENCES_UNKNOWN_OUTCOME")) severity += 15;
  if (issues.includes("NO_COVER")) severity += 5;
  // External hotlinked covers are cosmetic/legacy (scraped source), not content defects — don't rank on them.

  return {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    status: quiz.status,
    type: quiz.type,
    questionCount: questions.length,
    outcomeCount: outcomes.length,
    issues,
    severity,
  };
}

async function main() {
  const onlyPublished = process.argv.includes("--published-only");
  const limit = (() => {
    const i = process.argv.indexOf("--limit");
    return i !== -1 ? parseInt(process.argv[i + 1], 10) : 40;
  })();

  let page = 0;
  const pageSize = 1000;
  let all = [];
  while (true) {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id, slug, title, status, type, cover_url, content")
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const contentIssue = (issue) => !issue.startsWith("EXTERNAL_COVER") && issue !== "NO_COVER";
  let results = all.map(analyze).filter((r) => r.issues.some(contentIssue));
  if (onlyPublished) results = results.filter((r) => r.status === "PUBLISHED");
  results.sort((a, b) => b.severity - a.severity);

  console.log(`Total quizzes: ${all.length}, with issues: ${results.length}\n`);
  for (const r of results.slice(0, limit)) {
    console.log(
      `[sev ${r.severity}] ${r.id} | ${r.status} | "${r.title}" | q=${r.questionCount} o=${r.outcomeCount} | ${r.issues.join(", ")}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
