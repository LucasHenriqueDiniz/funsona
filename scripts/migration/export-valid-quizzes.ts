import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || "";
const OLD_SERVICE_ROLE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || "";

if (!OLD_SUPABASE_URL || !OLD_SERVICE_ROLE_KEY) {
  console.error("Missing OLD_SUPABASE_URL or OLD_SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const oldDb = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface QuizExport {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  type: "TRIVIA" | "PERSONALITY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  content: any;
  settings: any;
  author_id: string;
  language: string;
  tags: string[];
  created_at: string;
}

async function exportQuizzes() {
  console.log("Fetching quizzes from old database...");

  const { data: quizzes, error } = await oldDb
    .from("quizzes")
    .select("*")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quizzes:", error.message);
    process.exit(1);
  }

  console.log(`Found ${quizzes?.length || 0} published quizzes`);

  const validQuizzes: QuizExport[] = [];
  const invalidQuizzes: { id: string; reason: string }[] = [];

  for (const quiz of quizzes || []) {
    // Validation
    const reasons: string[] = [];

    if (!quiz.title || quiz.title.length < 1) {
      reasons.push("empty title");
    }

    if (!quiz.content?.questions || quiz.content.questions.length === 0) {
      reasons.push("no questions");
    } else {
      for (const q of quiz.content.questions) {
        if (!q.text || q.text.length < 1) {
          reasons.push("empty question text");
          break;
        }
        if (!q.options || q.options.length < 2) {
          reasons.push("question has < 2 options");
          break;
        }
      }
    }

    if (quiz.type === "TRIVIA") {
      for (const q of quiz.content.questions || []) {
        const hasCorrect = q.options?.some((o: any) => o.is_correct);
        if (!hasCorrect) {
          reasons.push("trivia question without correct answer");
          break;
        }
      }
    }

    if (quiz.type === "PERSONALITY") {
      if (!quiz.content?.outcomes || quiz.content.outcomes.length === 0) {
        reasons.push("personality quiz without outcomes");
      }
    }

    if (reasons.length > 0) {
      invalidQuizzes.push({ id: quiz.id, reason: reasons.join(", ") });
      continue;
    }

    validQuizzes.push({
      id: quiz.id,
      title: quiz.title,
      slug: quiz.slug,
      description: quiz.description,
      cover_url: quiz.cover_url,
      type: quiz.type,
      status: "PUBLISHED",
      content: quiz.content,
      settings: quiz.settings || {},
      author_id: quiz.author_id,
      language: quiz.language || "pt",
      tags: quiz.tags || [],
      created_at: quiz.created_at,
    });
  }

  console.log(`Valid quizzes: ${validQuizzes.length}`);
  console.log(`Invalid quizzes: ${invalidQuizzes.length}`);

  // Save export
  const exportDir = path.join(process.cwd(), "exports");
  await fs.mkdir(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().split("T")[0];
  
  await fs.writeFile(
    path.join(exportDir, `quizzes-valid-${timestamp}.json`),
    JSON.stringify(validQuizzes, null, 2)
  );

  await fs.writeFile(
    path.join(exportDir, `quizzes-invalid-${timestamp}.json`),
    JSON.stringify(invalidQuizzes, null, 2)
  );

  console.log(`\nExport saved to:`);
  console.log(`  - exports/quizzes-valid-${timestamp}.json`);
  console.log(`  - exports/quizzes-invalid-${timestamp}.json`);
}

exportQuizzes().catch(console.error);
