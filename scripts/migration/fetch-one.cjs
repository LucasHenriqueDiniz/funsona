require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const id = process.argv[2];
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).single();
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
