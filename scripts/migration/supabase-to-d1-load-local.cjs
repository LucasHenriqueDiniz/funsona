// Loads live Supabase data directly into the local D1 sqlite file using
// better-sqlite3 with parameterized statements (avoids the "statement too
// long" SQLITE_TOOBIG error that wrangler's --file text-based executor hits
// on the large `quizzes.content` JSON blobs). Local-only — for the eventual
// production cutover, use the Cloudflare D1 HTTP query API with the same
// parameterized approach, not a raw SQL file dump.
require("dotenv").config({ path: require("path").join(__dirname, "..", "quiz-review", ".env") });
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const D1_DIR = path.join(__dirname, "..", "..", "apps", "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const sqliteFile = fs.readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite"));
if (!sqliteFile) throw new Error(`No local D1 sqlite file found in ${D1_DIR} — run 'wrangler d1 migrations apply funsona-db --local' first.`);
const db = new Database(path.join(D1_DIR, sqliteFile));

function toJson(v) {
  return v === null || v === undefined ? null : JSON.stringify(v);
}
function toBool(v) {
  return v ? 1 : 0;
}

async function fetchAll(table) {
  let all = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) {
      if (error.message.includes("Could not find the table")) return null;
      throw new Error(`${table}: ${error.message}`);
    }
    all = all.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

function loadTable(table, cols, mapRow) {
  return (async () => {
    const rows = await fetchAll(table);
    if (rows === null) {
      console.log(`${table}: SKIPPED (table absent in Supabase)`);
      return;
    }
    const placeholders = cols.map(() => "?").join(", ");
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`);
    const insertMany = db.transaction((items) => {
      for (const item of items) stmt.run(...cols.map((c) => item[c]));
    });
    insertMany(rows.map(mapRow));
    console.log(`${table}: ${rows.length}`);
  })();
}

async function main() {
  await loadTable("profiles", ["id", "handle", "display_name", "avatar_url", "avatar_path", "avatar_source", "banner_url", "banner_path", "banner_source", "bio", "email", "xp", "level", "is_premium", "is_admin", "created_at", "updated_at"], (r) => ({
    id: r.id, handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url, avatar_path: r.avatar_path,
    avatar_source: r.avatar_source ?? "external", banner_url: r.banner_url, banner_path: r.banner_path,
    banner_source: r.banner_source ?? "storage", bio: r.bio, email: r.email, xp: r.xp ?? 0, level: r.level ?? 1,
    is_premium: toBool(r.is_premium), is_admin: toBool(r.is_admin), created_at: r.created_at, updated_at: r.updated_at,
  }));

  await loadTable("quizzes", ["id", "slug", "title", "description", "cover_url", "type", "status", "content", "intro_content", "settings", "author_id", "language", "tags", "likes_count", "favorites_count", "attempts_count", "completions_count", "created_at", "updated_at"], (r) => ({
    id: r.id, slug: r.slug, title: r.title, description: r.description, cover_url: r.cover_url, type: r.type, status: r.status,
    content: toJson(r.content), intro_content: toJson(r.intro_content), settings: toJson(r.settings ?? {}),
    author_id: r.author_id, language: r.language ?? "pt", tags: toJson(r.tags ?? []),
    likes_count: r.likes_count ?? 0, favorites_count: r.favorites_count ?? 0, attempts_count: r.attempts_count ?? 0,
    completions_count: r.completions_count ?? 0, created_at: r.created_at, updated_at: r.updated_at,
  }));

  await loadTable("tags", ["id", "slug", "name", "description", "quiz_count", "created_at"], (r) => ({
    id: r.id, slug: r.slug, name: r.name ?? r.slug, description: r.description, quiz_count: r.quiz_count ?? 0, created_at: r.created_at,
  }));

  await loadTable("quiz_tags", ["quiz_id", "tag_id"], (r) => ({ quiz_id: r.quiz_id, tag_id: r.tag_id }));

  await loadTable("quiz_likes", ["quiz_id", "user_id", "created_at"], (r) => ({ quiz_id: r.quiz_id, user_id: r.user_id, created_at: r.created_at }));

  await loadTable("quiz_favorites", ["quiz_id", "user_id", "created_at"], (r) => ({ quiz_id: r.quiz_id, user_id: r.user_id, created_at: r.created_at }));

  await loadTable("quiz_results", ["id", "quiz_id", "user_id", "result_type", "result_value", "xp_gained", "created_at"], (r) => ({
    id: r.id, quiz_id: r.quiz_id, user_id: r.user_id, result_type: r.result_type, result_value: r.result_value ?? "", xp_gained: r.xp_gained ?? 0, created_at: r.created_at,
  }));

  await loadTable("user_streaks", ["user_id", "current_streak", "longest_streak", "last_activity_date", "updated_at"], (r) => ({
    user_id: r.user_id, current_streak: r.current_streak ?? 0, longest_streak: r.longest_streak ?? 0, last_activity_date: r.last_activity_date, updated_at: r.updated_at,
  }));

  await loadTable("leaderboard", ["user_id", "xp_all_time", "xp_weekly", "xp_monthly", "updated_at"], (r) => ({
    user_id: r.user_id, xp_all_time: r.xp_all_time ?? 0, xp_weekly: r.xp_weekly ?? 0, xp_monthly: r.xp_monthly ?? 0, updated_at: r.updated_at,
  }));

  await loadTable("quiz_comments", ["id", "quiz_id", "user_id", "content", "hidden", "deleted_at", "created_at", "updated_at"], (r) => ({
    id: r.id, quiz_id: r.quiz_id, user_id: r.user_id, content: r.content, hidden: toBool(r.hidden), deleted_at: r.deleted_at, created_at: r.created_at, updated_at: r.updated_at,
  }));

  await loadTable("user_achievements", ["user_id", "achievement_id", "earned_at"], (r) => ({
    user_id: r.user_id, achievement_id: r.achievement_id, earned_at: r.earned_at,
  }));

  await loadTable("quiz_slug_redirects", ["old_slug", "quiz_id", "new_slug", "created_at"], (r) => ({
    old_slug: r.old_slug, quiz_id: r.quiz_id, new_slug: r.new_slug, created_at: r.created_at,
  }));

  await loadTable("content_reports", ["id", "target_type", "target_id", "reporter_id", "reason", "created_at", "resolved_at", "resolved_action"], (r) => ({
    id: r.id, target_type: r.target_type, target_id: r.target_id, reporter_id: r.reporter_id, reason: r.reason, created_at: r.created_at, resolved_at: r.resolved_at, resolved_action: r.resolved_action,
  }));

  db.close();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
