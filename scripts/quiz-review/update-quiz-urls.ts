import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "quiz-images";
const REFACTORED_DIR = path.join(process.cwd(), "refactored-quizzes");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateQuizUrls(quizId: string): Promise<void> {
  const quizDir = path.join(REFACTORED_DIR, quizId);

  // Get banner URL
  const bannerPath = path.join(quizDir, "banner.png");
  const bannerExists = await fileExists(bannerPath);
  const coverUrl = bannerExists ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${quizId}/banner.png` : null;

  // Get question image URLs
  const questionsDir = path.join(quizDir, "questions");
  const questionUrls: Record<string, string> = {};
  try {
    const files = await fs.readdir(questionsDir);
    for (const file of files) {
      if (file.endsWith(".png")) {
        const questionId = file.replace(".png", "");
        questionUrls[questionId] = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${quizId}/questions/${file}`;
      }
    }
  } catch (e) {
    // Directory doesn't exist
  }

  // Get outcome image URLs
  const outcomesDir = path.join(quizDir, "outcomes");
  const outcomeUrls: Record<string, string> = {};
  try {
    const files = await fs.readdir(outcomesDir);
    for (const file of files) {
      if (file.endsWith(".png")) {
        const outcomeId = file.replace(".png", "");
        outcomeUrls[outcomeId] = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${quizId}/outcomes/${file}`;
      }
    }
  } catch (e) {
    // Directory doesn't exist
  }

  // Update quiz cover_url
  if (coverUrl) {
    const { error } = await supabase.from("quizzes").update({ cover_url: coverUrl }).eq("id", quizId);
    if (error) throw error;
  }

  // Update question and outcome URLs in content JSONB
  const { data: quiz, error: fetchError } = await supabase
    .from("quizzes")
    .select("content")
    .eq("id", quizId)
    .single();

  if (fetchError) throw fetchError;

  const content = quiz?.content || {};
  let updated = false;

  // Update question URLs
  if (content.questions && Array.isArray(content.questions)) {
    for (const question of content.questions) {
      if (questionUrls[question.id]) {
        question.imageUrl = questionUrls[question.id];
        updated = true;
      }
    }
  }

  // Update outcome URLs
  if (content.outcomes && Array.isArray(content.outcomes)) {
    for (const outcome of content.outcomes) {
      if (outcomeUrls[outcome.key]) {
        outcome.imageUrl = outcomeUrls[outcome.key];
        updated = true;
      }
    }
  }

  if (updated || coverUrl) {
    const { error: updateError } = await supabase
      .from("quizzes")
      .update({ content })
      .eq("id", quizId);
    if (updateError) throw updateError;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("📝 Updating quiz URLs in database...\n");

  const refactDir = path.join(process.cwd(), "refactored-quizzes");
  const quizzes = await fs.readdir(refactDir);

  let updated = 0;
  let failed = 0;

  for (const quizId of quizzes) {
    const quizPath = path.join(refactDir, quizId);
    const stat = await fs.stat(quizPath);

    if (stat.isDirectory()) {
      try {
        await updateQuizUrls(quizId);
        console.log(`✅ ${quizId}: updated`);
        updated++;
      } catch (err) {
        console.error(`❌ ${quizId}: failed`, err);
        failed++;
      }
    }
  }

  console.log(`\n=== UPDATE COMPLETE ===`);
  console.log(`✅ Updated: ${updated} quizzes`);
  console.log(`❌ Failed: ${failed} quizzes`);
  console.log(`\n🎉 Images are now live on https://funsona.com!`);
}

main().catch(console.error);
