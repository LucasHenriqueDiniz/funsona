// scripts/migration/import-from-backup.mjs
import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const headers = {
  "apikey": SUPABASE_SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=minimal,resolution=ignore-duplicates",
};

function readJson(name) {
  const path = resolve("backups", `${name}.json`);
  const buf = readFileSync(path);
  const content = buf.toString("utf-8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(content);
  return parsed.value ?? parsed;
}

async function batchInsert(table, rows, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers,
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Error inserting into ${table} batch ${i}: ${res.status} ${text}`);
      throw new Error(`Insert failed: ${text}`);
    }
    console.log(`Inserted ${table} batch ${i + 1}..${Math.min(i + batchSize, rows.length)}`);
  }
}

async function importProfiles() {
  const rows = readJson("profiles");
  const mapped = rows.map((p) => ({
    id: p.id,
    handle: p.handle,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    xp: p.xp ?? 0,
    level: p.level ?? 1,
    is_premium: p.is_premium ?? false,
    is_admin: p.is_admin ?? false,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  await batchInsert("profiles", mapped);
}

async function importQuizzes() {
  const rows = readJson("quizzes");
  const kindToType = {
    TRIVIA_SUM: "TRIVIA",
    PERSONALITY_TALLY: "PERSONALITY",
    PROFILE_AXIS: "PERSONALITY",
  };
  const mapped = rows.map((q) => ({
    id: q.id,
    slug: q.slug,
    title: q.title,
    description: q.description,
    cover_url: q.cover_url,
    type: kindToType[q.kind] ?? "PERSONALITY",
    status: q.visibility === "public" ? "PUBLISHED" : "DRAFT",
    content: q.content,
    settings: q.settings,
    author_id: q.author_id,
    language: q.language ?? "pt",
    tags: q.tags ?? [],
    likes_count: q.likes_count ?? 0,
    favorites_count: q.favorites_count ?? 0,
    attempts_count: q.attempts_count ?? 0,
    completions_count: q.completions_count ?? 0,
    created_at: q.created_at,
    updated_at: q.updated_at,
  }));
  await batchInsert("quizzes", mapped, 200);
}

async function importQuizLikes() {
  const rows = readJson("quiz_likes");
  const seen = new Set();
  const unique = rows.filter((r) => {
    const key = `${r.quiz_id}|${r.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await batchInsert("quiz_likes", unique);
}

async function importQuizResults() {
  const rows = readJson("quiz_results");
  const mapped = rows.map((r) => ({
    id: r.id,
    quiz_id: r.quiz_id,
    user_id: r.user_id,
    result_type: r.result_type ?? "default",
    result_value: r.result_value ?? "",
    xp_gained: r.xp_gained ?? 0,
    created_at: r.created_at,
  }));
  await batchInsert("quiz_results", mapped);
}

async function importTags() {
  const rows = readJson("tags");
  const mapped = rows
    .filter((t) => t.name || t.slug)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name ?? t.slug,
      description: t.description,
      quiz_count: t.quiz_count ?? 0,
      created_at: t.created_at,
    }));
  await batchInsert("tags", mapped);
}

async function importQuizTags() {
  const rows = readJson("quiz_tags");
  const quizIds = new Set(readJson("quizzes").map((q) => q.id));
  const tagIds = new Set(readJson("tags").map((t) => t.id));
  const valid = rows.filter((r) => quizIds.has(r.quiz_id) && tagIds.has(r.tag_id));
  await batchInsert("quiz_tags", valid);
}

async function main() {
  console.log("Starting import...");

  await importProfiles();
  console.log("Profiles imported");

  await importQuizzes();
  console.log("Quizzes imported");

  await importQuizLikes();
  console.log("Quiz likes imported");

  await importQuizResults();
  console.log("Quiz results imported");

  await importTags();
  console.log("Tags imported");

  await importQuizTags();
  console.log("Quiz tags imported");

  console.log("Import complete!");
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
