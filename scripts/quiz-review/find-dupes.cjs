require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const id = process.argv[2];
  const { data, error } = await supabase.from("quizzes").select("id, title, content").eq("id", id).single();
  if (error) throw error;
  const seen = new Map();
  data.content.questions.forEach((q, i) => {
    const key = (q.title || "").trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(i);
  });
  console.log(`=== ${id} | ${data.title} | total questions: ${data.content.questions.length} ===`);
  for (const [key, idxs] of seen) {
    if (idxs.length > 1) {
      console.log(`DUP (${idxs.length}x) idx=[${idxs.join(",")}]: "${key}"`);
      idxs.forEach((i) => console.log("  ", JSON.stringify(data.content.questions[i])));
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
