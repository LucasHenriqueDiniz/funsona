require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const tables = ["profiles", "quizzes", "quiz_results", "quiz_comments", "quiz_likes", "quiz_favorites", "user_streaks", "user_achievements", "content_reports", "quiz_slug_redirects", "tags", "quiz_tags", "achievements", "leaderboard"];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    console.log(t.padEnd(24), error ? "ERROR: " + error.message : count);
  }
}
main();
