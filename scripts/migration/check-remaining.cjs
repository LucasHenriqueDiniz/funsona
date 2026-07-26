const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const D1_DIR = path.join(__dirname, "..", "..", "apps", "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const f = fs.readdirSync(D1_DIR).find((x) => x.endsWith(".sqlite"));
const db = new Database(path.join(D1_DIR, f), { readonly: true });

const profiles = db.prepare("SELECT id, avatar_url, banner_url FROM profiles WHERE avatar_url LIKE '%supabase%' OR banner_url LIKE '%supabase%'").all();
console.log("profiles still referencing supabase:", JSON.stringify(profiles, null, 2));

const remaining = db.prepare("SELECT count(*) n FROM quizzes WHERE cover_url LIKE '%supabase%' OR content LIKE '%supabase%'").get();
console.log("quizzes still referencing supabase:", remaining.n);

const rewritten = db.prepare("SELECT count(*) n FROM quizzes WHERE cover_url LIKE '%/media/quiz-images/%' OR content LIKE '%/media/quiz-images/%'").get();
console.log("quizzes now using /media/quiz-images/:", rewritten.n);

const sample = db.prepare("SELECT id, cover_url FROM quizzes WHERE cover_url LIKE '%/media/quiz-images/%' LIMIT 1").get();
console.log("sample rewritten quiz:", sample);

const stuck = db.prepare("SELECT id, cover_url FROM quizzes WHERE cover_url LIKE '%supabase%' OR content LIKE '%supabase%'").all();
console.log("still-supabase quiz(zes):", JSON.stringify(stuck, null, 2));
db.close();
