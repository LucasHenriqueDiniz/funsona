// Copies every Supabase-Storage-hosted image referenced in the local D1
// database (quizzes.content/cover_url, profiles.avatar_url/banner_url) into
// the matching R2 bucket, then rewrites those URLs in D1 to point at the
// new /media/<bucket>/<path> route served by apps/api. External hotlinked
// images (quizpanda.com, giphy.com, cloudinary, etc.) are left untouched —
// only genuinely Supabase-hosted files are in scope.
//
// Usage: node migrate-images-to-r2.cjs [--remote] [--limit N] [--dry-run]
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const Database = require("better-sqlite3");

const SUPA_PREFIX_RE = /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/(quiz-images|profile-media)\/(.+)/;

const REMOTE = process.argv.includes("--remote");
const DRY_RUN = process.argv.includes("--dry-run");
const limitArgIdx = process.argv.indexOf("--limit");
const LIMIT = limitArgIdx !== -1 ? parseInt(process.argv[limitArgIdx + 1], 10) : Infinity;

const D1_DIR = path.join(__dirname, "..", "..", "apps", "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const sqliteFile = fs.readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite"));
const db = new Database(path.join(D1_DIR, sqliteFile));

const API_ORIGIN = REMOTE ? "https://api.funsona.com" : "http://localhost:8787";

function parseUrl(url) {
  const m = SUPA_PREFIX_RE.exec(url);
  if (!m) return null;
  return { bucket: m[1], objectPath: m[2] };
}

function rewrite(url) {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  return `${API_ORIGIN}/media/${parsed.bucket}/${parsed.objectPath}`;
}

async function copyToR2(bucket, objectPath, cache) {
  const cacheKey = `${bucket}/${objectPath}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const sourceUrl = `https://djfrxlzkyaxvapoiavrr.supabase.co/storage/v1/object/public/${bucket}/${objectPath}`;
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    cache.set(cacheKey, false);
    console.log(`  SKIP (${res.status}): ${sourceUrl}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());

  if (DRY_RUN) {
    cache.set(cacheKey, true);
    return true;
  }

  const tmpFile = path.join(os.tmpdir(), `r2up-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(tmpFile, buf);
  const ext = objectPath.split(".").pop().toLowerCase();
  const contentType = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif" }[ext] || "application/octet-stream";
  try {
    execFileSync(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "put",
        `${bucket === "quiz-images" ? "funsona-quiz-images" : "funsona-profile-media"}/${objectPath}`,
        `--file=${tmpFile}`,
        `--content-type=${contentType}`,
        REMOTE ? "--remote" : "--local",
      ],
      { cwd: path.join(__dirname, "..", "..", "apps", "api"), stdio: "pipe", shell: true }
    );
    cache.set(cacheKey, true);
    return true;
  } catch (e) {
    console.log(`  UPLOAD FAILED: ${bucket}/${objectPath}: ${e.message.slice(0, 200)}`);
    cache.set(cacheKey, false);
    return false;
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function collectQuizUrls(content) {
  const urls = [];
  const c = JSON.parse(content || "{}");
  for (const q of c.questions || []) {
    if (q.imageUrl) urls.push(["question", q.imageUrl]);
    for (const a of q.answers || []) {
      if (a.imageUrl) urls.push(["answer", a.imageUrl]);
      if (a.image?.file) urls.push(["answer.image.file", a.image.file]);
    }
  }
  for (const o of c.outcomes || []) {
    if (o.imageUrl) urls.push(["outcome", o.imageUrl]);
  }
  return urls;
}

async function main() {
  console.log(`Mode: ${REMOTE ? "REMOTE R2" : "LOCAL R2"}${DRY_RUN ? " (dry-run)" : ""}, limit=${LIMIT}`);
  const cache = new Map();
  let migrated = 0;

  const quizzes = db.prepare("SELECT id, cover_url, content FROM quizzes").all();
  for (const q of quizzes) {
    if (migrated >= LIMIT) break;
    let content = JSON.parse(q.content || "{}");
    let changed = false;
    let newCover = q.cover_url;

    if (q.cover_url) {
      const parsed = parseUrl(q.cover_url);
      if (parsed) {
        const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
        if (ok) {
          newCover = rewrite(q.cover_url);
          changed = true;
        }
      }
    }

    for (const question of content.questions || []) {
      if (question.imageUrl) {
        const parsed = parseUrl(question.imageUrl);
        if (parsed) {
          const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
          if (ok) { question.imageUrl = rewrite(question.imageUrl); changed = true; }
        }
      }
      for (const a of question.answers || []) {
        if (a.imageUrl) {
          const parsed = parseUrl(a.imageUrl);
          if (parsed) {
            const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
            if (ok) { a.imageUrl = rewrite(a.imageUrl); changed = true; }
          }
        }
        if (a.image?.file) {
          const parsed = parseUrl(a.image.file);
          if (parsed) {
            const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
            if (ok) { a.image.file = rewrite(a.image.file); changed = true; }
          }
        }
      }
    }
    for (const o of content.outcomes || []) {
      if (o.imageUrl) {
        const parsed = parseUrl(o.imageUrl);
        if (parsed) {
          const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
          if (ok) { o.imageUrl = rewrite(o.imageUrl); changed = true; }
        }
      }
    }

    if (changed) {
      migrated++;
      if (!DRY_RUN) {
        db.prepare("UPDATE quizzes SET cover_url = ?, content = ? WHERE id = ?").run(newCover, JSON.stringify(content), q.id);
      }
      console.log(`quiz ${q.id}: migrated`);
    }
  }

  const profiles = db.prepare("SELECT id, avatar_url, banner_url FROM profiles").all();
  for (const p of profiles) {
    let newAvatar = p.avatar_url;
    let newBanner = p.banner_url;
    let changed = false;

    if (p.avatar_url) {
      const parsed = parseUrl(p.avatar_url);
      if (parsed) {
        const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
        if (ok) { newAvatar = rewrite(p.avatar_url); changed = true; }
      }
    }
    if (p.banner_url) {
      const parsed = parseUrl(p.banner_url);
      if (parsed) {
        const ok = await copyToR2(parsed.bucket, parsed.objectPath, cache);
        if (ok) { newBanner = rewrite(p.banner_url); changed = true; }
      }
    }
    if (changed && !DRY_RUN) {
      db.prepare("UPDATE profiles SET avatar_url = ?, banner_url = ? WHERE id = ?").run(newAvatar, newBanner, p.id);
      console.log(`profile ${p.id}: migrated`);
    }
  }

  console.log(`\nDone. Unique objects copied: ${[...cache.values()].filter(Boolean).length}/${cache.size}. Quizzes rewritten: ${migrated}.`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
