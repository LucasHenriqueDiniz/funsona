// Third batch: de-duplicate repeated question titles (content/answers untouched, only wording
// varied on repeat occurrences so the same phrasing doesn't appear multiple times per quiz).
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

async function getQuiz(id) {
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function updateContent(id, content) {
  console.log(`Updating ${id}...`);
  if (DRY_RUN) return;
  const { error } = await supabase.from("quizzes").update({ content }).eq("id", id);
  if (error) throw error;
}

function retitle(content, map) {
  return {
    ...content,
    questions: content.questions.map((q) => (map[q.id] ? { ...q, title: map[q.id] } : q)),
  };
}

async function fixHogwarts() {
  const id = "0730ba47-234a-424e-a185-6a90d60f858b";
  const quiz = await getQuiz(id);
  const content = retitle(quiz.content, {
    q11: "Entre estes dois perfis, qual combina mais com você?",
  });
  await updateContent(id, content);
}

async function fixTriviaTitles() {
  const id = "a5b7605d-9d40-4d66-b417-7303088fe83b";
  const quiz = await getQuiz(id);
  const content = retitle(quiz.content, {
    q13: "Qual destas outras afirmações históricas é verdadeira?",
    q8: "Qual destas outras afirmações curiosas é verdadeira?",
    q14: "E qual destas afirmações curiosas também é verdadeira?",
    q17: "Entre estas afirmações curiosas, qual é verdadeira?",
    q12: "E qual destas outras afirmações curiosas não é verdadeira?",
    q19: "Entre estas afirmações curiosas, qual não é verdadeira?",
    q20: "E qual destas outras afirmações de química é verdadeira?",
  });
  await updateContent(id, content);
}

async function main() {
  if (DRY_RUN) console.log("=== DRY RUN — no writes will be made ===\n");
  await fixHogwarts();
  await fixTriviaTitles();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
