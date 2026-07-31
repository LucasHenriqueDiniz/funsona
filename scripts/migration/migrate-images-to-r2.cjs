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
const { execFile } = require("child_process");
const { promisify } = require("util");

// Must be the async form: the uploads run through a worker pool, and
// execFileSync would block the event loop and serialise them anyway.
const execFileAsync = promisify(execFile);

const REMOTE = process.argv.includes("--remote");
const DRY_RUN = process.argv.includes("--dry-run");
const argValue = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const LIMIT = Number(argValue("--limit", Infinity));
const OUT_SQL = argValue("--out", "rewrite-image-urls.sql");
const CONCURRENCY = Number(argValue("--concurrency", 8));

const BUCKETS = { "quiz-images": "funsona-quiz-images", "profile-media": "funsona-profile-media" };
const API_ORIGIN = REMOTE ? "https://api.funsona.com" : "http://localhost:8787";

// Supabase storage URL, or one this script already rewrote (any origin).
const SUPABASE_RE = /https:\/\/([a-z0-9-]+)\.supabase\.co\/storage\/v1\/object\/public\/(quiz-images|profile-media)\/([^"'\s\\]+)/;
const MIGRATED_RE = /https?:\/\/[^/"'\s\\]+\/media\/(quiz-images|profile-media)\/([^"'\s\\]+)/;

const API_DIR = path.join(__dirname, "..", "..", "apps", "api");

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Pages a table out of Supabase. The object inventory is read from Supabase
 *  rather than D1 for two reasons: `wrangler d1 execute --remote --file`
 *  returns a summary rather than result rows, so remote reads come back empty;
 *  and a D1 that has already been rewritten no longer records which Supabase
 *  project each object came from, leaving nothing to fetch the bytes from.
 *  Supabase is the source of truth and always has the original URLs. */
async function fetchSupabase(table, columns) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — the image inventory is read from Supabase.");
  }
  const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
      headers: { ...headers, Range: `${from}-${from + pageSize - 1}` },
    });
    if (!response.ok) throw new Error(`${table}: ${response.status} ${(await response.text()).slice(0, 200)}`);
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
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
async function collectReferences() {
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

  for (const row of await fetchSupabase("quizzes", "cover_url,content")) {
    note(row.cover_url);
    note(typeof row.content === "string" ? row.content : JSON.stringify(row.content));
  }
  for (const row of await fetchSupabase("profiles", "avatar_url,banner_url")) {
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
    await execFileAsync(
      "npx",
      [
        "wrangler", "r2", "object", "put",
        `${BUCKETS[bucket]}/${objectPath}`,
        `--file=${tmpFile}`,
        `--content-type=${CONTENT_TYPES[ext] || "application/octet-stream"}`,
        // Remote is the default for `r2 object put`; only local needs a flag.
        // (Passing --remote errors with "Unknown argument" on the wrangler
        // version pinned in apps/api.)
        ...(REMOTE ? [] : ["--local"]),
      ],
      { cwd: API_DIR, shell: true }
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

  const references = await collectReferences();
  console.log(`${references.size} distinct hosted objects referenced in D1.`);

  const projectRefs = new Set([...references.values()].filter(Boolean));
  const tally = { ok: 0, "source-missing": 0, "upload-failed": 0, unresolvable: 0 };

  // Each upload spawns a wrangler process, so running 1,300 of them in series
  // takes about an hour. A small pool cuts that to minutes; keep it modest so
  // the Supabase fetches and the R2 API are not hammered.
  const queue = [...references].slice(0, LIMIT === Infinity ? undefined : LIMIT);
  const total = queue.length;
  let started = 0;
  let finished = 0;

  async function worker() {
    for (;;) {
      const index = started++;
      if (index >= total) return;
      const [key, projectRef] = queue[index];
      const slash = key.indexOf("/");
      const result = await uploadToR2(key.slice(0, slash), key.slice(slash + 1), projectRef);
      tally[result.status]++;
      finished++;
      if (result.status !== "ok") {
        console.log(`  ${result.status}: ${key}${result.detail ? ` (${result.detail})` : ""}`);
      } else if (finished % 50 === 0) {
        console.log(`  ${finished}/${total} uploaded`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));

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
