/**
 * Generates SQL to load live Supabase data into a D1 database, local or remote.
 *
 * Why this exists: supabase-to-d1-load-local.cjs writes straight into the
 * miniflare sqlite file via better-sqlite3, so it can only ever populate a local
 * D1. Its header notes that the production cutover needs a different approach
 * because wrangler's file executor hits SQLITE_TOOBIG on the large
 * `quizzes.content` blobs — the biggest is ~776 KB.
 *
 * This script sidesteps that without needing a Cloudflare API token: any value
 * over CHUNK_THRESHOLD is inserted empty and then appended in pieces with
 * `UPDATE ... SET col = col || '...'`, so no single statement gets large. That
 * keeps the whole load runnable through the wrangler auth you already have.
 *
 *   node scripts/migration/supabase-to-d1-remote.mjs --out .migration-sql
 *   # then, in order:
 *   npx wrangler d1 execute funsona-db --remote --config apps/api/wrangler.toml --file .migration-sql/001-profiles.sql
 *   ...
 *
 * Pass --local to the wrangler commands first and diff the counts before going
 * near --remote.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Schema drift handled here (verified against the live Supabase project):
 *   - profiles.email          absent upstream; populated by backfill-profile-emails.mjs
 *   - quizzes.intro_content   absent upstream -> NULL
 *   - quizzes.favorites_count absent upstream -> 0
 *   - quiz_favorites, quiz_slug_redirects, content_reports: tables absent -> skipped
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = (() => {
  const i = process.argv.indexOf("--out");
  return i === -1 ? ".migration-sql" : process.argv[i + 1];
})();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };

/** Values longer than this are appended in pieces instead of inlined. */
const CHUNK_THRESHOLD = 20_000;
const CHUNK_SIZE = 20_000;

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const literal = (value) => (value === null || value === undefined ? "NULL" : quote(value));
const toJson = (value) => (value === null || value === undefined ? null : JSON.stringify(value));
const toBool = (value) => (value ? 1 : 0);

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + pageSize - 1}` },
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      const body = await response.text();
      if (body.includes("does not exist")) return null;
      throw new Error(`${table}: ${response.status} ${body.slice(0, 200)}`);
    }
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}

/**
 * Emits one row as SQL. Oversized column values are written as '' in the INSERT
 * and appended afterwards, so every statement stays well under D1's limit.
 * Requires the table to have a single-column key so the appends can target the
 * row — tables without one simply never have oversized values.
 */
function rowStatements(table, columns, row, keyColumn) {
  const deferred = [];
  const values = columns.map((column) => {
    const value = row[column];
    if (typeof value === "string" && value.length > CHUNK_THRESHOLD) {
      if (!keyColumn) throw new Error(`${table}.${column} is oversized but the table has no key column`);
      deferred.push(column);
      return "''";
    }
    return literal(value);
  });

  const statements = [
    `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
  ];

  for (const column of deferred) {
    const text = String(row[column]);
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const piece = text.slice(i, i + CHUNK_SIZE);
      statements.push(
        `UPDATE ${table} SET ${column} = ${column} || ${quote(piece)} WHERE ${keyColumn} = ${literal(row[keyColumn])};`
      );
    }
  }

  return statements;
}

const TABLES = [
  {
    name: "profiles",
    key: "id",
    columns: ["id","handle","display_name","avatar_url","avatar_path","avatar_source","banner_url","banner_path","banner_source","bio","email","xp","level","is_premium","is_admin","created_at","updated_at"],
    map: (r) => ({
      id: r.id, handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url, avatar_path: r.avatar_path,
      avatar_source: r.avatar_source ?? "external", banner_url: r.banner_url, banner_path: r.banner_path,
      banner_source: r.banner_source ?? "storage", bio: r.bio,
      // Not present upstream — backfill-profile-emails.mjs fills this from auth.users.
      email: null,
      xp: r.xp ?? 0, level: r.level ?? 1,
      is_premium: toBool(r.is_premium), is_admin: toBool(r.is_admin), created_at: r.created_at, updated_at: r.updated_at,
    }),
  },
  {
    name: "quizzes",
    key: "id",
    columns: ["id","slug","title","description","cover_url","type","status","content","intro_content","settings","author_id","language","tags","likes_count","favorites_count","attempts_count","completions_count","created_at","updated_at"],
    map: (r) => ({
      id: r.id, slug: r.slug, title: r.title, description: r.description, cover_url: r.cover_url, type: r.type, status: r.status,
      content: toJson(r.content),
      intro_content: toJson(r.intro_content ?? null),
      settings: toJson(r.settings ?? {}),
      author_id: r.author_id, language: r.language ?? "pt", tags: toJson(r.tags ?? []),
      likes_count: r.likes_count ?? 0, favorites_count: r.favorites_count ?? 0, attempts_count: r.attempts_count ?? 0,
      completions_count: r.completions_count ?? 0, created_at: r.created_at, updated_at: r.updated_at,
    }),
  },
  {
    name: "tags", key: "id",
    columns: ["id","slug","name","description","quiz_count","created_at"],
    map: (r) => ({ id: r.id, slug: r.slug, name: r.name ?? r.slug, description: r.description, quiz_count: r.quiz_count ?? 0, created_at: r.created_at }),
  },
  { name: "quiz_tags", columns: ["quiz_id","tag_id"], map: (r) => ({ quiz_id: r.quiz_id, tag_id: r.tag_id }) },
  { name: "quiz_likes", columns: ["quiz_id","user_id","created_at"], map: (r) => ({ quiz_id: r.quiz_id, user_id: r.user_id, created_at: r.created_at }) },
  { name: "quiz_favorites", columns: ["quiz_id","user_id","created_at"], map: (r) => ({ quiz_id: r.quiz_id, user_id: r.user_id, created_at: r.created_at }) },
  {
    name: "quiz_results", key: "id",
    columns: ["id","quiz_id","user_id","result_type","result_value","xp_gained","created_at"],
    map: (r) => ({ id: r.id, quiz_id: r.quiz_id, user_id: r.user_id, result_type: r.result_type, result_value: r.result_value ?? "", xp_gained: r.xp_gained ?? 0, created_at: r.created_at }),
  },
  {
    name: "user_streaks", key: "user_id",
    columns: ["user_id","current_streak","longest_streak","last_activity_date","updated_at"],
    map: (r) => ({ user_id: r.user_id, current_streak: r.current_streak ?? 0, longest_streak: r.longest_streak ?? 0, last_activity_date: r.last_activity_date, updated_at: r.updated_at }),
  },
  {
    name: "leaderboard", key: "user_id",
    columns: ["user_id","xp_all_time","xp_weekly","xp_monthly","updated_at"],
    map: (r) => ({ user_id: r.user_id, xp_all_time: r.xp_all_time ?? 0, xp_weekly: r.xp_weekly ?? 0, xp_monthly: r.xp_monthly ?? 0, updated_at: r.updated_at }),
  },
  {
    name: "quiz_comments", key: "id",
    columns: ["id","quiz_id","user_id","content","hidden","deleted_at","created_at","updated_at"],
    map: (r) => ({ id: r.id, quiz_id: r.quiz_id, user_id: r.user_id, content: r.content, hidden: toBool(r.hidden), deleted_at: r.deleted_at, created_at: r.created_at, updated_at: r.updated_at }),
  },
  {
    name: "user_achievements",
    columns: ["user_id","achievement_id","earned_at"],
    map: (r) => ({ user_id: r.user_id, achievement_id: r.achievement_id, earned_at: r.earned_at }),
  },
  {
    name: "quiz_slug_redirects", key: "old_slug",
    columns: ["old_slug","quiz_id","new_slug","created_at"],
    map: (r) => ({ old_slug: r.old_slug, quiz_id: r.quiz_id, new_slug: r.new_slug, created_at: r.created_at }),
  },
  {
    name: "content_reports", key: "id",
    columns: ["id","target_type","target_id","reporter_id","reason","created_at","resolved_at","resolved_action"],
    map: (r) => ({ id: r.id, target_type: r.target_type, target_id: r.target_id, reporter_id: r.reporter_id, reason: r.reason, created_at: r.created_at, resolved_at: r.resolved_at, resolved_action: r.resolved_action }),
  },
];

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const commands = [];
let fileIndex = 0;
const summary = [];

for (const table of TABLES) {
  const rows = await fetchAll(table.name);
  if (rows === null) {
    summary.push(`${table.name.padEnd(22)} SKIPPED (absent upstream)`);
    continue;
  }

  const statements = [
    `-- ${table.name}: ${rows.length} rows from Supabase`,
    ...rows.flatMap((row) => rowStatements(table.name, table.columns, table.map(row), table.key)),
  ];

  fileIndex += 1;
  const fileName = `${String(fileIndex).padStart(3, "0")}-${table.name}.sql`;
  writeFileSync(join(OUT_DIR, fileName), statements.join("\n") + "\n", "utf8");
  commands.push(fileName);
  summary.push(`${table.name.padEnd(22)} ${String(rows.length).padStart(5)} rows, ${statements.length} statements -> ${fileName}`);
}

console.log(summary.join("\n"));
console.log(`\nWrote ${commands.length} files to ${OUT_DIR}/`);
console.log("\nApply in this order (FK-safe). Run with --local first and compare counts:\n");
for (const file of commands) {
  console.log(`npx wrangler d1 execute funsona-db --local --config apps/api/wrangler.toml --file ${join(OUT_DIR, file)}`);
}
