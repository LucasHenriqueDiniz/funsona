require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const id = process.argv[2];
  const { data, error } = await supabase.from("quizzes").select("id, title, content").eq("id", id).single();
  if (error) throw error;
  const missing = (data.content.outcomes || []).filter((o) => !o.description || !o.description.trim());
  console.log(`=== ${id} | ${data.title} | missing: ${missing.length} ===`);
  console.log(JSON.stringify(missing.map((o) => o.key + "::" + o.title)));
}
main().catch((e) => { console.error(e); process.exit(1); });
