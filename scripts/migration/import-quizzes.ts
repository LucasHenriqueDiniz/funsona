import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || "";
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || "";

if (!NEW_SUPABASE_URL || !NEW_SERVICE_ROLE_KEY) {
  console.error("Missing NEW_SUPABASE_URL or NEW_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const newDb = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function importQuizzes() {
  const exportDir = path.join(process.cwd(), "exports");
  const files = await fs.readdir(exportDir);
  const validFile = files.find((f) => f.startsWith("quizzes-valid-"));

  if (!validFile) {
    console.error("No valid quizzes export found. Run export-valid-quizzes.ts first.");
    process.exit(1);
  }

  const quizzes = JSON.parse(await fs.readFile(path.join(exportDir, validFile), "utf-8"));
  console.log(`Importing ${quizzes.length} quizzes...`);

  let imported = 0;
  let failed = 0;

  for (const quiz of quizzes) {
    // Check if slug already exists
    const { data: existing } = await newDb
      .from("quizzes")
      .select("id")
      .eq("slug", quiz.slug)
      .single();

    if (existing) {
      // Generate new slug
      quiz.slug = `${quiz.slug}-imported-${Date.now().toString(36)}`;
    }

    const { error } = await newDb.from("quizzes").insert({
      title: quiz.title,
      slug: quiz.slug,
      description: quiz.description,
      cover_url: quiz.cover_url,
      type: quiz.type,
      status: quiz.status,
      content: quiz.content,
      settings: quiz.settings,
      author_id: quiz.author_id, // Note: user must exist in new db or this will fail
      language: quiz.language,
      tags: quiz.tags,
    });

    if (error) {
      console.error(`Failed to import quiz "${quiz.title}":`, error.message);
      failed++;
    } else {
      imported++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Failed: ${failed}`);
}

importQuizzes().catch(console.error);
