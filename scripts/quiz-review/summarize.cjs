require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const ids = process.argv.slice(2);
  for (const id of ids) {
    const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).single();
    if (error) { console.log(id, "ERROR", error.message); continue; }
    console.log(`\n=== ${id} ===`);
    console.log(data.type, "|", data.title);
    console.log("desc:", data.description);
    console.log("questions:", data.content.questions.length, "outcomes:", (data.content.outcomes || []).length);
    console.log(JSON.stringify(data.content.questions, null, 1));
    console.log("OUTCOMES:", JSON.stringify(data.content.outcomes, null, 1));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
