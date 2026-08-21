import { Hono } from "hono";
import { z } from "zod";
import { CreateQuizSchema, UpdateQuizSchema, CreateQuizResultSchema } from "@FunSona/shared";
import type { Env } from "../index.js";
import { authMiddleware, requireAuth, currentUserId } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  getDb,
  newId,
  getQuizBySlug,
  getQuizById,
  listQuizzes,
  insertQuiz,
  updateQuiz,
  deleteQuiz,
  slugExists,
  getSlugRedirect,
  syncQuizTags,
  incrementQuizAttempts,
  likeQuiz,
  unlikeQuiz,
  hasLiked,
  insertQuizResult,
  createReport,
  resolveOpenReports,
  serializeQuiz,
} from "../db/client.js";

const ReportQuizSchema = z.object({
  reason: z.string().max(500).optional(),
});

const quizzesApp = new Hono<Env>();
const DEFAULT_SETTINGS = {
  show_correct_answers: true,
  randomize_questions: false,
  time_limit_seconds: null,
} as const;

type QuizSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  type: string;
  likes_count?: number | null;
  attempts_count?: number | null;
  tags?: string[] | null;
};

function uniqueById(items: QuizSummary[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// Explicit transliteration map for characters common in pt/es titles.
// Applied before Unicode normalization so encoding quirks that break NFD
// decomposition (e.g. mojibake) can't silently drop the base letter.
const TRANSLITERATION_MAP: Record<string, string> = {
  á: "a", à: "a", â: "a", ã: "a", ä: "a", å: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", õ: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n", ý: "y", ÿ: "y",
};

// Generate slug from title
function slugify(title: string) {
  const transliterated = title
    .toLowerCase()
    .replace(/[áàâãäåéèêëíìîïóòôõöúùûüçñýÿ]/g, (char) => TRANSLITERATION_MAP[char] ?? char);

  const slug = transliterated
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  // Titles that are entirely emoji/symbols/non-Latin script can collapse to "".
  // Never return an empty slug — fall back to a short random suffix.
  return slug || `quiz-${Math.random().toString(36).slice(2, 8)}`;
}

// POST /quizzes stores a client-supplied slug verbatim, which is how
// machine-generated duplicates such as `internet-das-coisas-iot-1777921094606`
// (a clean slug plus a raw Date.now()) got published alongside the clean
// `internet-das-coisas-iot`. Google reads those pairs as scaled/duplicate
// content. Strip the timestamp and re-slugify so a duplicate now collides with
// the original and is rejected with 409 instead of silently becoming a twin.
function normalizeRequestedSlug(requested: string | undefined): string | undefined {
  if (!requested) return undefined;
  const withoutTimestamp = requested.trim().replace(/-\d{10,}$/, "");
  const normalized = slugify(withoutTimestamp || requested);
  return normalized || undefined;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  return [...new Set(normalized)];
}

function normalizeSettings(settings: unknown) {
  if (!settings || typeof settings !== "object") return undefined;
  const source = settings as Record<string, unknown>;
  const normalized = {
    show_correct_answers:
      typeof source.show_correct_answers === "boolean"
        ? source.show_correct_answers
        : DEFAULT_SETTINGS.show_correct_answers,
    randomize_questions:
      typeof source.randomize_questions === "boolean"
        ? source.randomize_questions
        : DEFAULT_SETTINGS.randomize_questions,
    time_limit_seconds:
      typeof source.time_limit_seconds === "number" && Number.isFinite(source.time_limit_seconds)
        ? Math.max(0, Math.floor(source.time_limit_seconds))
        : null,
  };
  const isDefault =
    normalized.show_correct_answers === DEFAULT_SETTINGS.show_correct_answers &&
    normalized.randomize_questions === DEFAULT_SETTINGS.randomize_questions &&
    normalized.time_limit_seconds === DEFAULT_SETTINGS.time_limit_seconds;
  return isDefault ? undefined : normalized;
}

// List / Search quizzes
quizzesApp.get("/", async (c) => {
  const { search, tag, page = "1", limit = "20", sort, min_attempts } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const minAttemptsNum = Math.max(0, parseInt(min_attempts || "0") || 0);

  const { data, total } = await listQuizzes(c.env, {
    search,
    tag,
    page: pageNum,
    limit: limitNum,
    sort,
    minAttempts: minAttemptsNum,
  });

  return c.json({
    success: true,
    data,
    meta: { page: pageNum, limit: limitNum, total },
  });
});

// Look up a redirect target for a slug that no longer resolves directly
// (e.g. after the slugify() transliteration fix corrected broken slugs).
quizzesApp.get("/redirect/:oldSlug", async (c) => {
  const oldSlug = c.req.param("oldSlug");
  const newSlug = await getSlugRedirect(c.env, oldSlug);

  if (!newSlug) {
    return c.json({ success: false, error: "No redirect found" }, 404);
  }

  return c.json({ success: true, data: { new_slug: newSlug } });
});

// Get single quiz by slug
quizzesApp.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const data = await getQuizBySlug(c.env, slug);

  if (!data) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  return c.json({ success: true, data });
});

// Recommended quizzes for authenticated users
quizzesApp.get("/recommended/for-me", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const db = getDb(c.env);

  const { results: playedRows } = await db
    .prepare("SELECT qr.quiz_id, q.tags FROM quiz_results qr JOIN quizzes q ON q.id = qr.quiz_id WHERE qr.user_id = ? ORDER BY qr.created_at DESC LIMIT 200")
    .bind(userId)
    .all<{ quiz_id: string; tags: string }>();

  const playedIds = new Set(playedRows.map((r) => r.quiz_id));

  const tagCounts = new Map<string, number>();
  for (const row of playedRows) {
    const tags: string[] = JSON.parse(row.tags || "[]");
    for (const tag of tags) {
      const key = String(tag || "").trim().toLowerCase();
      if (!key) continue;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    }
  }

  const preferredTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  const baseSelect = "id, slug, title, description, cover_url, type, likes_count, attempts_count, tags";

  let personalized: QuizSummary[] = [];
  if (preferredTags.length > 0) {
    const likeClauses = preferredTags.map(() => "tags LIKE ?").join(" OR ");
    const { results } = await db
      .prepare(`SELECT ${baseSelect} FROM quizzes WHERE status = 'PUBLISHED' AND (${likeClauses}) ORDER BY attempts_count DESC LIMIT 48`)
      .bind(...preferredTags.map((t) => `%"${t}"%`))
      .all<QuizSummary & { tags: string }>();
    personalized = results.map((r) => ({ ...r, tags: JSON.parse((r as unknown as { tags: string }).tags || "[]") }));
  }

  const { results: popularData } = await db
    .prepare(`SELECT ${baseSelect} FROM quizzes WHERE status = 'PUBLISHED' ORDER BY attempts_count DESC LIMIT 80`)
    .all<QuizSummary & { tags: string }>();
  const popular = popularData.map((r) => ({ ...r, tags: JSON.parse((r as unknown as { tags: string }).tags || "[]") }));

  const merged = uniqueById([...personalized, ...popular])
    .filter((quiz) => !playedIds.has(quiz.id))
    .slice(0, 12);

  return c.json({
    success: true,
    data: merged,
    meta: {
      based_on_tags: preferredTags,
      excluded_played_count: playedIds.size,
    },
  });
});

// Create quiz (auth required)
quizzesApp.post("/", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const body = await c.req.json();
  const parsed = CreateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input", details: parsed.error.format() }, 400);
  }

  const slug =
    normalizeRequestedSlug(parsed.data.slug) || `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;

  if (await slugExists(c.env, slug)) {
    return c.json({ success: false, error: "Slug already exists" }, 409);
  }

  const normalizedTags = normalizeTags(parsed.data.tags);
  const id = newId();

  const inserted = await insertQuiz(c.env, {
    id,
    slug,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    cover_url: parsed.data.cover_url ?? null,
    type: parsed.data.type,
    status: parsed.data.status ?? "DRAFT",
    content: parsed.data.content,
    intro_content: (parsed.data as Record<string, unknown>).intro_content ?? null,
    settings: normalizeSettings(parsed.data.settings) ?? {},
    author_id: userId,
    language: parsed.data.language ?? "pt",
    tags: normalizedTags,
  });

  await syncQuizTags(c.env, id, normalizedTags);

  return c.json({ success: true, data: serializeQuiz(inserted!) }, 201);
});

// Update quiz (auth required)
quizzesApp.patch("/:id", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input" }, 400);
  }

  const quiz = await getQuizById(c.env, id);
  if (!quiz || quiz.author_id !== userId) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const normalizedTags = parsed.data.tags !== undefined ? normalizeTags(parsed.data.tags) : undefined;
  const updates = {
    ...parsed.data,
    ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
    ...(parsed.data.settings !== undefined ? { settings: normalizeSettings(parsed.data.settings) ?? {} } : {}),
  };

  const updated = await updateQuiz(c.env, id, updates);

  if (normalizedTags !== undefined) {
    await syncQuizTags(c.env, id, normalizedTags);
  }

  return c.json({ success: true, data: serializeQuiz(updated!) });
});

// Delete quiz (auth required)
quizzesApp.delete("/:id", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const id = c.req.param("id");
  const quiz = await getQuizById(c.env, id);
  if (!quiz || quiz.author_id !== userId) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  await deleteQuiz(c.env, id);
  return c.json({ success: true });
});

// Submit quiz result
quizzesApp.post("/:id/results", authMiddleware, async (c) => {
  const quizId = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();
  const parsed = CreateQuizResultSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input" }, 400);
  }

  if (!userId) {
    await incrementQuizAttempts(c.env, quizId);
    return c.json({ success: true, data: null }, 201);
  }

  const quiz = await getQuizById(c.env, quizId);
  if (!quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  const canonicalResultType = quiz.type === "TRIVIA" ? "TRIVIA_SUM" : "PERSONALITY_TALLY";

  const data = await insertQuizResult(c.env, {
    quizId,
    userId,
    quizType: quiz.type,
    resultType: canonicalResultType,
    resultValue: parsed.data.result_value ?? null,
    xpGained: parsed.data.xp_gained,
  });

  return c.json({ success: true, data }, 201);
});

// Like a quiz
quizzesApp.post("/:id/like", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const quizId = c.req.param("id");
  await likeQuiz(c.env, quizId, userId);
  return c.json({ success: true });
});

// Unlike a quiz
quizzesApp.delete("/:id/like", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const quizId = c.req.param("id");
  await unlikeQuiz(c.env, quizId, userId);
  return c.json({ success: true });
});

// Check if user liked a quiz
quizzesApp.get("/:id/like", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: true, data: { liked: false } });

  const quizId = c.req.param("id");
  const liked = await hasLiked(c.env, quizId, userId);
  return c.json({ success: true, data: { liked } });
});

// Report a quiz (auth required)
quizzesApp.post("/:id/report", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const quizId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = ReportQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input" }, 400);
  }

  const quiz = await getQuizById(c.env, quizId);
  if (!quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  await createReport(c.env, "quiz", quizId, userId, parsed.data.reason || null);
  return c.json({ success: true }, 201);
});

// Hide a quiz by archiving it (admin only)
quizzesApp.post("/:id/hide", authMiddleware, requireAdmin, async (c) => {
  const quizId = c.req.param("id");
  await updateQuiz(c.env, quizId, { status: "ARCHIVED" });
  await resolveOpenReports(c.env, "quiz", quizId, "hidden");
  return c.json({ success: true });
});

// Community quizzes publish instantly with no review (see POST "/" above),
// so ads are gated separately: a quiz only shows AdSlot once an admin has
// looked at it and flipped this flag. See migration 0004_ads_eligible.sql.
quizzesApp.post("/:id/approve-ads", authMiddleware, requireAdmin, async (c) => {
  const quizId = c.req.param("id");
  const updated = await updateQuiz(c.env, quizId, { ads_eligible: 1 });
  if (!updated) return c.json({ success: false, error: "Quiz not found" }, 404);
  return c.json({ success: true, data: serializeQuiz(updated) });
});

quizzesApp.post("/:id/revoke-ads", authMiddleware, requireAdmin, async (c) => {
  const quizId = c.req.param("id");
  const updated = await updateQuiz(c.env, quizId, { ads_eligible: 0 });
  if (!updated) return c.json({ success: false, error: "Quiz not found" }, 404);
  return c.json({ success: true, data: serializeQuiz(updated) });
});

export { quizzesApp };
