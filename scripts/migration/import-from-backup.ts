// scripts/migration/import-from-backup.ts
// Imports data from JSON backups into the new schema
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function readJson<T>(name: string): T[] {
  const path = resolve("backups", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function batchInsert<T>(table: string, rows: T[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`Error inserting into ${table} batch ${i}:`, error.message);
      throw error;
    }
    console.log(`Inserted ${table} batch ${i + 1}..${Math.min(i + batchSize, rows.length)}`);
  }
}

async function importProfiles() {
  const rows = readJson<any>("profiles");
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
  const rows = readJson<any>("quizzes");
  const kindToType: Record<string, string> = {
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
    tags: [],
    likes_count: 0,
    favorites_count: 0,
    attempts_count: 0,
    completions_count: 0,
    created_at: q.created_at,
    updated_at: q.updated_at,
  }));
  await batchInsert("quizzes", mapped);
}

async function importQuizLikes() {
  const rows = readJson<any>("quiz_likes");
  await batchInsert("quiz_likes", rows);
}

async function importQuizResults() {
  const rows = readJson<any>("quiz_results");
  // Schema antigo pode ter campos diferentes — precisamos mapear
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

async function importAchievements() {
  const rows = readJson<any>("achievements");
  const mapped = rows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    xp_reward: a.xp_reward ?? 0,
    condition_type: a.condition_type ?? "default",
    condition_value: a.condition_value ?? 0,
    created_at: a.created_at,
  }));
  await batchInsert("achievements", mapped);
}

async function importUserAchievements() {
  const rows = readJson<any>("user_achievements");
  await batchInsert("user_achievements", rows);
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

  await importAchievements();
  console.log("Achievements imported");

  await importUserAchievements();
  console.log("User achievements imported");

  // Update counts via triggers / manual recalc
  console.log("Recalculating counts...");
  const { error } = await supabase.rpc("recalculate_quiz_counts");
  if (error) {
    console.warn("recalculate_quiz_counts failed:", error.message);
  }

  console.log("Import complete!");
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
