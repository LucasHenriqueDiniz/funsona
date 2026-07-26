const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const D1_DIR = path.join(__dirname, "..", "..", "apps", "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const sqliteFile = fs.readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite"));
const db = new Database(path.join(D1_DIR, sqliteFile), { readonly: true });

const tables = ["profiles", "quizzes", "tags", "quiz_tags", "quiz_likes", "quiz_favorites", "quiz_results", "user_streaks", "leaderboard", "quiz_comments", "achievements", "user_achievements", "quiz_slug_redirects", "content_reports"];
for (const t of tables) {
  const { n } = db.prepare(`SELECT count(*) as n FROM ${t}`).get();
  console.log(t.padEnd(24), n);
}
db.close();
