// The first migration pass (migrate-images-to-r2.cjs) uploaded objects via
// `wrangler r2 object put` without --content-type, so R2 served them with no
// Content-Type header. This re-uploads every already-migrated object with
// the correct content-type inferred from its extension, re-fetching the
// bytes from the original Supabase source (D1 URLs are already correct and
// are NOT touched here — only the R2 object metadata changes).
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const Database = require("better-sqlite3");

const REMOTE = process.argv.includes("--remote");
// Bounded to non-quote/backslash characters: content is JSON text, and an
// unescaped `"` always ends the string value, so a greedy `.+` here would
// swallow everything up to the end of the whole blob instead of stopping at
// the URL that was matched.
const MEDIA_RE = /\/media\/(quiz-images|profile-media)\/([^"\\]+)/g;

const D1_DIR = path.join(__dirname, "..", "..", "apps", "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const sqliteFile = fs.readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite"));
const db = new Database(path.join(D1_DIR, sqliteFile), { readonly: true });

function contentTypeFor(objectPath) {
  const ext = objectPath.split(".").pop().toLowerCase();
  return { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif" }[ext] || "application/octet-stream";
}

function collectMediaPaths(str, set) {
  if (!str) return;
  MEDIA_RE.lastIndex = 0;
  let m;
  while ((m = MEDIA_RE.exec(str))) {
    set.add(`${m[1]} ${m[2]}`);
  }
}

async function main() {
  const paths = new Set();
  for (const q of db.prepare("SELECT cover_url, content FROM quizzes").all()) {
    collectMediaPaths(q.cover_url, paths);
    collectMediaPaths(q.content, paths);
  }
  for (const p of db.prepare("SELECT avatar_url, banner_url FROM profiles").all()) {
    collectMediaPaths(p.avatar_url, paths);
    collectMediaPaths(p.banner_url, paths);
  }

  console.log(`Found ${paths.size} unique migrated objects to fix. Mode: ${REMOTE ? "REMOTE" : "LOCAL"}`);
  let ok = 0, fail = 0;
  for (const key of paths) {
    const [bucket, objectPath] = key.split(" ");
    const sourceUrl = `https://djfrxlzkyaxvapoiavrr.supabase.co/storage/v1/object/public/${bucket}/${objectPath}`;
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) { console.log(`  SKIP (${res.status}): ${bucket}/${objectPath}`); fail++; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const tmpFile = path.join(os.tmpdir(), `r2fix-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.writeFileSync(tmpFile, buf);
      const bucketName = bucket === "quiz-images" ? "funsona-quiz-images" : "funsona-profile-media";
      execFileSync(
        "npx",
        ["wrangler", "r2", "object", "put", `${bucketName}/${objectPath}`, `--file=${tmpFile}`, `--content-type=${contentTypeFor(objectPath)}`, REMOTE ? "--remote" : "--local"],
        { cwd: path.join(__dirname, "..", "..", "apps", "api"), stdio: "pipe", shell: true }
      );
      fs.unlinkSync(tmpFile);
      ok++;
      if (ok % 50 === 0) console.log(`  ...${ok} fixed`);
    } catch (e) {
      console.log(`  FAILED: ${bucket}/${objectPath}: ${e.message.slice(0, 150)}`);
      fail++;
    }
  }
  console.log(`\nDone. Fixed ${ok}, failed ${fail}.`);
  db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
