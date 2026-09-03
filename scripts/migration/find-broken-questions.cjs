require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const ids = process.argv.slice(2);
  for (const id of ids) {
    const { data, error } = await supabase.from("quizzes").select("id, title, type, content").eq("id", id).single();
    if (error) { console.log(id, "ERROR", error.message); continue; }
    console.log(`\n=== ${id} | ${data.title} | outcomes=${(data.content.outcomes||[]).map(o=>o.key).join(",")} ===`);
    for (const q of data.content.questions) {
      const bad = !q.answers || q.answers.length < 2 || q.answers.some((a) => !a.label || !a.label.trim());
      if (bad) {
        console.log(JSON.stringify(q, null, 1));
      }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
