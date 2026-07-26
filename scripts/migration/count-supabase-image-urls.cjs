// Counts how many image URLs currently in D1 (quizzes.content + cover_url,
// profiles avatar/banner) actually point at Supabase Storage vs external
// hosts, to size the R2 migration realistically instead of trusting the
// flaky storage.list() API against a large bucket.
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const D1_DIR = path.join(__dirname, "..", "..", "apps", "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const sqliteFile = fs.readdirSync(D1_DIR).find((f) => f.endsWith(".sqlite"));
const db = new Database(path.join(D1_DIR, sqliteFile), { readonly: true });

const SUPA_MARKER = "supabase.co/storage/v1/object/public/";

function collectUrls(content) {
  const urls = [];
  const c = JSON.parse(content || "{}");
  for (const q of c.questions || []) {
    if (q.imageUrl) urls.push(q.imageUrl);
    for (const a of q.answers || []) {
      if (a.imageUrl) urls.push(a.imageUrl);
      if (a.image?.file) urls.push(a.image.file);
    }
  }
  for (const o of c.outcomes || []) {
    if (o.imageUrl) urls.push(o.imageUrl);
  }
  return urls;
}

let quizSupa = 0, quizExternal = 0, coverSupa = 0, coverExternal = 0;
const quizzes = db.prepare("SELECT cover_url, content FROM quizzes").all();
for (const q of quizzes) {
  if (q.cover_url) {
    if (q.cover_url.includes(SUPA_MARKER)) coverSupa++; else coverExternal++;
  }
  for (const u of collectUrls(q.content)) {
    if (u.includes(SUPA_MARKER)) quizSupa++; else quizExternal++;
  }
}

let profSupa = 0, profExternal = 0;
const profiles = db.prepare("SELECT avatar_url, banner_url FROM profiles").all();
for (const p of profiles) {
  for (const u of [p.avatar_url, p.banner_url]) {
    if (!u) continue;
    if (u.includes(SUPA_MARKER)) profSupa++; else profExternal++;
  }
}

console.log(`quiz cover_url: ${coverSupa} supabase, ${coverExternal} external`);
console.log(`quiz question/outcome images: ${quizSupa} supabase, ${quizExternal} external`);
console.log(`profile avatar/banner: ${profSupa} supabase, ${profExternal} external`);
db.close();
