import { Hono } from "hono";
import { CreateQuizSchema, UpdateQuizSchema, CreateQuizResultSchema } from "@FunSona/shared";
import type { Env } from "../index.js";
import { createServiceClient } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

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

type PlayedQuizRow = {
  quiz_id?: string | null;
  quiz?: { id?: string; tags?: string[] | null } | Array<{ id?: string; tags?: string[] | null }> | null;
};

function uniqueById(items: QuizSummary[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// Generate slug from title
function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
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

async function syncQuizTags(
  service: ReturnType<typeof createServiceClient>,
  quizId: string,
  tags: string[]
) {
  const { error } = await service.rpc("sync_quiz_tags", {
    p_quiz_id: quizId,
    p_tags: tags,
  });
  return error;
}

// List / Search quizzes
quizzesApp.get("/", async (c) => {
  const { search, tag, page = "1", limit = "20", sort, min_attempts } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  const minAttemptsNum = Math.max(0, parseInt(min_attempts || "0") || 0);

  const service = createServiceClient(c.env);
  let query = service
    .from("quizzes")
    .select("*, author:profiles!quizzes_author_id_fkey(handle, display_name, avatar_url)", { count: "exact" })
    .eq("status", "PUBLISHED")
    .range(offset, offset + limitNum - 1);

  // Sorting
  if (sort === "likes") {
    query = query.order("likes_count", { ascending: false });
  } else if (sort === "plays") {
    query = query.order("attempts_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (minAttemptsNum > 0) {
    query = query.gte("attempts_count", minAttemptsNum);
  }

  if (search) {
    query = query.textSearch("search_vector", search, { type: "websearch", config: "portuguese" });
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({
    success: true,
    data,
    meta: { page: pageNum, limit: limitNum, total: count ?? 0 },
  });
});

// Get single quiz by slug
quizzesApp.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const service = createServiceClient(c.env);

  const { data, error } = await service
    .from("quizzes")
    .select("*, author:profiles!quizzes_author_id_fkey(handle, display_name, avatar_url)")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .single();

  if (error || !data) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  return c.json({ success: true, data });
});

// Recommended quizzes for authenticated users
quizzesApp.get("/recommended/for-me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);

  const { data: playedRows, error: playedError } = await service
    .from("quiz_results")
    .select("quiz_id, created_at, quiz:quizzes(id, tags)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (playedError) {
    return c.json({ success: false, error: playedError.message }, 500);
  }

  const playedIds = new Set<string>(
    ((playedRows || []) as PlayedQuizRow[])
      .map((row) => row.quiz_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  const tagCounts = new Map<string, number>();
  for (const row of (playedRows || []) as PlayedQuizRow[]) {
    const rawQuiz = row.quiz;
    const quiz = Array.isArray(rawQuiz) ? rawQuiz[0] : rawQuiz;
    const tags = Array.isArray(quiz?.tags) ? quiz.tags : [];
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
    const { data, error } = await service
      .from("quizzes")
      .select(baseSelect)
      .eq("status", "PUBLISHED")
      .overlaps("tags", preferredTags)
      .order("attempts_count", { ascending: false })
      .limit(48);

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    personalized = data || [];
  }

  const { data: popularData, error: popularError } = await service
    .from("quizzes")
    .select(baseSelect)
    .eq("status", "PUBLISHED")
    .order("attempts_count", { ascending: false })
    .limit(80);

  if (popularError) {
    return c.json({ success: false, error: popularError.message }, 500);
  }

  const merged = uniqueById([...(personalized || []), ...((popularData || []) as QuizSummary[])])
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
quizzesApp.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const parsed = CreateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input", details: parsed.error.format() }, 400);
  }

  const service = createServiceClient(c.env);
  const slug = parsed.data.slug || `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;

  // Check slug uniqueness
  const { data: existing } = await service.from("quizzes").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    return c.json({ success: false, error: "Slug already exists" }, 409);
  }

  const normalizedTags = normalizeTags(parsed.data.tags);
  const payload = {
    ...parsed.data,
    slug,
    author_id: userId,
    tags: normalizedTags,
    settings: normalizeSettings(parsed.data.settings),
  };

  const { data, error } = await service
    .from("quizzes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const syncError = await syncQuizTags(service, data.id, normalizedTags);
  if (syncError) {
    await service.from("quizzes").delete().eq("id", data.id);
    return c.json({ success: false, error: syncError.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

// Update quiz (auth required)
quizzesApp.patch("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input" }, 400);
  }

  const service = createServiceClient(c.env);

  // Verify ownership
  const { data: quiz } = await service.from("quizzes").select("author_id").eq("id", id).maybeSingle();
  if (!quiz || quiz.author_id !== userId) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const normalizedTags = parsed.data.tags !== undefined ? normalizeTags(parsed.data.tags) : undefined;
  const updates = {
    ...parsed.data,
    ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
    ...(parsed.data.settings !== undefined ? { settings: normalizeSettings(parsed.data.settings) ?? {} } : {}),
  };

  const { data, error } = await service.from("quizzes").update(updates).eq("id", id).select().single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  if (normalizedTags !== undefined) {
    const syncError = await syncQuizTags(service, id, normalizedTags);
    if (syncError) {
      return c.json({ success: false, error: syncError.message }, 500);
    }
  }

  return c.json({ success: true, data });
});

// Delete quiz (auth required)
quizzesApp.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const service = createServiceClient(c.env);

  const { data: quiz } = await service.from("quizzes").select("author_id").eq("id", id).maybeSingle();
  if (!quiz || quiz.author_id !== userId) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { error } = await service.from("quizzes").delete().eq("id", id);
  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

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

  const service = createServiceClient(c.env);

  if (!userId) {
    const { error } = await service.rpc("increment_quiz_attempts", { quiz_id: quizId });
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: null }, 201);
  }

  const { data: quiz, error: quizError } = await service
    .from("quizzes")
    .select("type")
    .eq("id", quizId)
    .single();

  if (quizError || !quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  const canonicalResultType = quiz.type === "TRIVIA" ? "TRIVIA_SUM" : "PERSONALITY_TALLY";

  const { data, error } = await service
    .from("quiz_results")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      quiz_type: quiz.type,
      result_type: canonicalResultType,
      result_value: parsed.data.result_value || null,
      xp_gained: parsed.data.xp_gained,
    })
    .select()
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // attempts_count is incremented by the handle_quiz_result trigger on insert

  return c.json({ success: true, data }, 201);
});

// Like a quiz
quizzesApp.post("/:id/like", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const quizId = c.req.param("id");
  const service = createServiceClient(c.env);

  const { error } = await service.from("quiz_likes").insert({ quiz_id: quizId, user_id: userId });
  if (error?.code === "23505") {
    return c.json({ success: true });
  }
  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Update likes count
  const { error: likeRpcError } = await service.rpc("increment_quiz_likes", { quiz_id: quizId });
  if (likeRpcError) {
    return c.json({ success: false, error: likeRpcError.message }, 500);
  }

  return c.json({ success: true });
});

// Unlike a quiz
quizzesApp.delete("/:id/like", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const quizId = c.req.param("id");
  const service = createServiceClient(c.env);

  const { data, error } = await service
    .from("quiz_likes")
    .delete()
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .select("quiz_id");
  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  if (!data?.length) {
    return c.json({ success: true });
  }

  // Update likes count
  const { error: unlikeRpcError } = await service.rpc("decrement_quiz_likes", { quiz_id: quizId });
  if (unlikeRpcError) {
    return c.json({ success: false, error: unlikeRpcError.message }, 500);
  }

  return c.json({ success: true });
});

// Check if user liked a quiz
quizzesApp.get("/:id/like", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, liked: false });

  const quizId = c.req.param("id");
  const service = createServiceClient(c.env);

  const { data } = await service
    .from("quiz_likes")
    .select("quiz_id")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  return c.json({ success: true, liked: !!data });
});

export { quizzesApp };
