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

async function uploadImagesForQuiz(quizId: string): Promise<{ banner?: string; questions: string[]; outcomes: string[] }> {
  const quizDir = path.join(REFACTORED_DIR, quizId);
  const urls: { banner?: string; questions: string[]; outcomes: string[] } = { questions: [], outcomes: [] };

  try {
    // Upload banner
    const bannerPath = path.join(quizDir, "banner.png");
    if (await fileExists(bannerPath)) {
      const buffer = await fs.readFile(bannerPath);
      const fileName = `${quizId}/banner.png`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
        upsert: true,
        contentType: "image/png",
      });
      if (error) throw error;
      urls.banner = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
    }

    // Upload questions
    const questionsDir = path.join(quizDir, "questions");
    try {
      const questions = await fs.readdir(questionsDir);
      for (const file of questions) {
        if (file.endsWith(".png")) {
          const filePath = path.join(questionsDir, file);
          const buffer = await fs.readFile(filePath);
          const fileName = `${quizId}/questions/${file}`;
          const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
            upsert: true,
            contentType: "image/png",
          });
          if (error) throw error;
          urls.questions.push(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`);
        }
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }

    // Upload outcomes
    const outcomesDir = path.join(quizDir, "outcomes");
    try {
      const outcomes = await fs.readdir(outcomesDir);
      for (const file of outcomes) {
        if (file.endsWith(".png")) {
          const filePath = path.join(outcomesDir, file);
          const buffer = await fs.readFile(filePath);
          const fileName = `${quizId}/outcomes/${file}`;
          const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
            upsert: true,
            contentType: "image/png",
          });
          if (error) throw error;
          urls.outcomes.push(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`);
        }
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }

    return urls;
  } catch (err) {
    console.error(`Failed to upload ${quizId}:`, err);
    throw err;
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
  console.log("🚀 Uploading images to Supabase Storage...\n");

  const refactDir = path.join(process.cwd(), "refactored-quizzes");
  const quizzes = await fs.readdir(refactDir);

  let uploaded = 0;
  let failed = 0;

  for (const quizId of quizzes) {
    const quizPath = path.join(refactDir, quizId);
    const stat = await fs.stat(quizPath);

    if (stat.isDirectory()) {
      try {
        const urls = await uploadImagesForQuiz(quizId);
        const imageCount = (urls.banner ? 1 : 0) + urls.questions.length + urls.outcomes.length;
        console.log(`✅ ${quizId}: ${imageCount} images uploaded`);
        uploaded += imageCount;
      } catch (err) {
        console.error(`❌ ${quizId}: failed`);
        failed++;
      }
    }
  }

  console.log(`\n=== UPLOAD COMPLETE ===`);
  console.log(`✅ Uploaded: ${uploaded} images`);
  console.log(`❌ Failed: ${failed} quizzes`);
  console.log(`\nNext: Run 'npx tsx update-quiz-urls.ts' to update database`);
}

main().catch(console.error);
