// Copies every Supabase-Storage-hosted image referenced in D1
// (quizzes.cover_url/content, profiles.avatar_url/banner_url) into the matching
// R2 bucket, then emits SQL that repoints those URLs at the /media/<bucket>/
// route served by apps/api. External hotlinked images (quizpanda.com, giphy,
// cloudinary, ...) are left untouched — only Supabase-hosted files are in scope.
//
// Two things this used to get wrong, both of which made --remote useless:
//
//   1. It rewrote the LOCAL sqlite directly, so with --remote it would upload
//      to remote R2 and then update the wrong database. It now writes the URL
//      rewrite to a .sql file you apply to whichever D1 you mean.
//   2. Its URL matcher only recognised supabase.co links, so once a local run
//      had rewritten a row to localhost:8787 that row stopped matching and its
//      object was never uploaded anywhere else. Already-rewritten URLs are now
//      recognised too, which also makes re-runs idempotent.
//
// The rewrite is a pure prefix swap, so it goes out as REPLACE() over the whole
// column rather than re-writing each blob. That keeps every statement tiny —
// quizzes.content reaches 787 KB and would otherwise blow D1's statement limit.
//
// Usage:
//   node migrate-images-to-r2.cjs --dry-run
//   node migrate-images-to-r2.cjs                      # upload to local R2
//   node migrate-images-to-r2.cjs --remote              # upload to remote R2
//   node migrate-images-to-r2.cjs --remote --out rewrite-urls.sql
//   npx wrangler d1 execute funsona-db --remote --config apps/api/wrangler.toml --file rewrite-urls.sql
//
// The object inventory is read through `wrangler d1 execute`, so the same
// script works against the local or the remote database and needs no native
// sqlite dependency (better-sqlite3 was required here but never declared in
// any package.json).
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const REMOTE = process.argv.includes("--remote");
const DRY_RUN = process.argv.includes("--dry-run");
const argValue = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const LIMIT = Number(argValue("--limit", Infinity));
const OUT_SQL = argValue("--out", "rewrite-image-urls.sql");

const BUCKETS = { "quiz-images": "funsona-quiz-images", "profile-media": "funsona-profile-media" };
const API_ORIGIN = REMOTE ? "https://api.funsona.com" : "http://localhost:8787";

// Supabase storage URL, or one this script already rewrote (any origin).
const SUPABASE_RE = /https:\/\/([a-z0-9-]+)\.supabase\.co\/storage\/v1\/object\/public\/(quiz-images|profile-media)\/([^"'\s\\]+)/;
const MIGRATED_RE = /https?:\/\/[^/"'\s\\]+\/media\/(quiz-images|profile-media)\/([^"'\s\\]+)/;

const API_DIR = path.join(__dirname, "..", "..", "apps", "api");

/** Runs a read-only query through wrangler and returns the result rows.
 *  The SQL goes via a temp file — passing it as --command would need shell
 *  quoting, and the queries here contain spaces, quotes and % wildcards. */
function queryD1(sql) {
  const tmpFile = path.join(os.tmpdir(), `d1q-${process.pid}-${Math.random().toString(36).slice(2)}.sql`);
  fs.writeFileSync(tmpFile, sql, "utf8");
  try {
    const raw = execFileSync(
      "npx",
      ["wrangler", "d1", "execute", "funsona-db", REMOTE ? "--remote" : "--local", "--file", tmpFile, "--json"],
      { cwd: API_DIR, stdio: ["ignore", "pipe", "pipe"], shell: true, maxBuffer: 512 * 1024 * 1024 }
    ).toString();
    // wrangler prefixes the JSON with banner lines; take from the first bracket.
    const start = raw.indexOf("[");
    if (start === -1) throw new Error(`Unexpected wrangler output: ${raw.slice(0, 300)}`);
    return JSON.parse(raw.slice(start))[0]?.results ?? [];
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

/** Returns { bucket, objectPath, projectRef|null } for anything we host. */
function parseUrl(url) {
  const supabase = SUPABASE_RE.exec(url);
  if (supabase) return { projectRef: supabase[1], bucket: supabase[2], objectPath: supabase[3] };
  const migrated = MIGRATED_RE.exec(url);
  if (migrated) return { projectRef: null, bucket: migrated[1], objectPath: migrated[2] };
  return null;
}

/** Every hosted image URL anywhere in the database, scanned as raw text so
 *  nested shapes (question/answer/outcome images, legacy `image.file`) are all
 *  covered without having to know the JSON schema. */
function collectReferences() {
  const found = new Map(); // `${bucket}/${objectPath}` -> projectRef|null
  const note = (text) => {
    if (!text) return;
    const source = String(text);
    for (const re of [SUPABASE_RE, MIGRATED_RE]) {
      const global = new RegExp(re.source, "g");
      let match;
      while ((match = global.exec(source)) !== null) {
        const parsed = parseUrl(match[0]);
        if (!parsed) continue;
        const key = `${parsed.bucket}/${parsed.objectPath}`;
        if (!found.has(key) || (parsed.projectRef && !found.get(key))) found.set(key, parsed.projectRef);
      }
    }
  };

  // Filter in SQL so only rows that actually reference a hosted image come
  // back — quizzes.content alone is ~11 MB across the table.
  const hosted = (column) =>
    [
      "/storage/v1/object/public/",
      "/media/quiz-images/",
      "/media/profile-media/",
    ]
      .map((needle) => `${column} LIKE '%${needle}%'`)
      .join(" OR ");

  for (const row of queryD1(`SELECT cover_url, content FROM quizzes WHERE ${hosted("cover_url")} OR ${hosted("content")}`)) {
    note(row.cover_url);
    note(row.content);
  }
  for (const row of queryD1(`SELECT avatar_url, banner_url FROM profiles WHERE ${hosted("avatar_url")} OR ${hosted("banner_url")}`)) {
    note(row.avatar_url);
    note(row.banner_url);
  }
  return found;
}

const CONTENT_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif", svg: "image/svg+xml" };

async function uploadToR2(bucket, objectPath, projectRef) {
  if (!projectRef) {
    // Already-rewritten URL with no surviving Supabase origin to fetch from.
    return { status: "unresolvable" };
  }
  const sourceUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${objectPath}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) return { status: "source-missing", detail: response.status };

  if (DRY_RUN) return { status: "ok" };

  const buffer = Buffer.from(await response.arrayBuffer());
  const tmpFile = path.join(os.tmpdir(), `r2up-${process.pid}-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(tmpFile, buffer);
  const ext = objectPath.split(".").pop().toLowerCase();
  try {
    execFileSync(
      "npx",
      [
        "wrangler", "r2", "object", "put",
        `${BUCKETS[bucket]}/${objectPath}`,
        `--file=${tmpFile}`,
        `--content-type=${CONTENT_TYPES[ext] || "application/octet-stream"}`,
        REMOTE ? "--remote" : "--local",
      ],
      { cwd: API_DIR, stdio: "pipe", shell: true }
    );
    return { status: "ok" };
  } catch (error) {
    return { status: "upload-failed", detail: String(error.message).slice(0, 200) };
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function main() {
  console.log(`Mode: ${REMOTE ? "REMOTE R2" : "LOCAL R2"}${DRY_RUN ? " (dry-run)" : ""}`);

  const references = collectReferences();
  console.log(`${references.size} distinct hosted objects referenced in D1.`);

  const projectRefs = new Set([...references.values()].filter(Boolean));
  const tally = { ok: 0, "source-missing": 0, "upload-failed": 0, unresolvable: 0 };
  let processed = 0;

  for (const [key, projectRef] of references) {
    if (processed >= LIMIT) break;
    processed++;
    const slash = key.indexOf("/");
    const result = await uploadToR2(key.slice(0, slash), key.slice(slash + 1), projectRef);
    tally[result.status]++;
    if (result.status !== "ok") console.log(`  ${result.status}: ${key}${result.detail ? ` (${result.detail})` : ""}`);
  }

  console.log(`\nuploaded=${tally.ok} sourceMissing=${tally["source-missing"]} failed=${tally["upload-failed"]} unresolvable=${tally.unresolvable}`);

  // Prefix swap, applied column-wide. Tiny statements regardless of blob size,
  // and a no-op on a second run.
  const lines = [
    "-- Repoints Supabase Storage image URLs at the /media route served by apps/api.",
    `-- Generated by migrate-images-to-r2.cjs (${REMOTE ? "remote" : "local"} mode).`,
    "-- Idempotent: REPLACE() finds nothing on a second run.",
    "",
  ];
  // Guarded with instr() rather than LIKE: a `%<85-char url>%` pattern against
  // a 787 KB content blob makes SQLite give up with "LIKE or GLOB pattern too
  // complex". instr() is a literal substring search with no such limit.
  const swap = (from, to) => [
    `UPDATE quizzes  SET content    = REPLACE(content,    '${from}', '${to}') WHERE instr(content,    '${from}') > 0;`,
    `UPDATE quizzes  SET cover_url  = REPLACE(cover_url,  '${from}', '${to}') WHERE instr(cover_url,  '${from}') > 0;`,
    `UPDATE profiles SET avatar_url = REPLACE(avatar_url, '${from}', '${to}') WHERE instr(avatar_url, '${from}') > 0;`,
    `UPDATE profiles SET banner_url = REPLACE(banner_url, '${from}', '${to}') WHERE instr(banner_url, '${from}') > 0;`,
  ];

  for (const projectRef of projectRefs) {
    for (const bucket of Object.keys(BUCKETS)) {
      lines.push(
        ...swap(
          `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/`,
          `${API_ORIGIN}/media/${bucket}/`
        )
      );
    }
  }
  // Repoint anything a previous local run already rewrote.
  if (REMOTE) {
    lines.push("", "-- Fixes rows a previous local run rewrote to localhost.", ...swap("http://localhost:8787/media/", `${API_ORIGIN}/media/`));
  }

  fs.writeFileSync(OUT_SQL, lines.join("\n") + "\n", "utf8");
  console.log(`\nURL rewrite written to ${OUT_SQL} — apply it to the D1 you uploaded to:`);
  console.log(`  npx wrangler d1 execute funsona-db --${REMOTE ? "remote" : "local"} --config apps/api/wrangler.toml --file ${OUT_SQL}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
