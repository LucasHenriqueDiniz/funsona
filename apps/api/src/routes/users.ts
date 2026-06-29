import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index.js";
import { createServiceClient } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const usersApp = new Hono<Env>();

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  banner_url: z.string().url().nullable().optional(),
});

const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const PROFILE_MEDIA_PUBLIC_PREFIX = "/storage/v1/object/public/profile-media/";

type PlayedQuiz = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  type: string;
  likes_count?: number | null;
  attempts_count?: number | null;
};

type PlayedQuizRow = {
  quiz?: PlayedQuiz | PlayedQuiz[] | null;
};

function normalizePlayedQuizzes(rows: PlayedQuizRow[] | null | undefined) {
  const seen = new Set<string>();
  const playedQuizzes: PlayedQuiz[] = [];

  for (const row of rows || []) {
    const rawQuiz = row.quiz;
    const quiz = Array.isArray(rawQuiz) ? rawQuiz[0] : rawQuiz;
    if (!quiz || !quiz.id || seen.has(quiz.id)) continue;

    seen.add(quiz.id);
    playedQuizzes.push(quiz);
    if (playedQuizzes.length >= 6) break;
  }

  return playedQuizzes;
}

function getProfileMediaColumns(kind: "avatar" | "banner") {
  return kind === "avatar"
    ? { url: "avatar_url", path: "avatar_path", source: "avatar_source" }
    : { url: "banner_url", path: "banner_path", source: "banner_source" };
}

function extractProfileMediaPath(publicUrl: string | null | undefined) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const markerIndex = url.pathname.indexOf(PROFILE_MEDIA_PUBLIC_PREFIX);
    if (markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + PROFILE_MEDIA_PUBLIC_PREFIX.length);
    return objectPath || null;
  } catch {
    return null;
  }
}

usersApp.get("/me/streak", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);
  const { data, error } = await service
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If no streak record exists yet, return default
    if (error.code === "PGRST116") {
      return c.json({
        success: true,
        data: { current_streak: 0, longest_streak: 0, last_activity_date: null },
      });
    }
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

usersApp.get("/me/stats", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);

  const [profileRes, streakRes, resultsRes, createdRes] = await Promise.all([
    service.from("profiles").select("xp, level").eq("id", userId).single(),
    service.from("user_streaks").select("current_streak, longest_streak").eq("user_id", userId).single(),
    service.from("quiz_results").select("id", { count: "exact" }).eq("user_id", userId),
    service.from("quizzes").select("id", { count: "exact" }).eq("author_id", userId),
  ]);

  if (profileRes.error) {
    return c.json({ success: false, error: profileRes.error.message }, 500);
  }

  return c.json({
    success: true,
    data: {
      xp: profileRes.data?.xp || 0,
      level: profileRes.data?.level || 1,
      current_streak: streakRes.data?.current_streak || 0,
      longest_streak: streakRes.data?.longest_streak || 0,
      quizzes_played: resultsRes.count || 0,
      quizzes_created: createdRes.count || 0,
    },
  });
});

usersApp.get("/me/activity", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);

  const [createdRes, playedRes] = await Promise.all([
    service
      .from("quizzes")
      .select("id, slug, title, description, cover_url, type, likes_count, attempts_count, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    service
      .from("quiz_results")
      .select("quiz_id, created_at, quiz:quizzes(id, slug, title, description, cover_url, type, likes_count, attempts_count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (createdRes.error) {
    return c.json({ success: false, error: createdRes.error.message }, 500);
  }

  if (playedRes.error) {
    return c.json({ success: false, error: playedRes.error.message }, 500);
  }

  const playedQuizzes = normalizePlayedQuizzes(playedRes.data as PlayedQuizRow[]);

  return c.json({
    success: true,
    data: {
      created_quizzes: createdRes.data || [],
      played_quizzes: playedQuizzes,
    },
  });
});

usersApp.patch("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input", details: parsed.error.format() }, 400);
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    return c.json({ success: false, error: "No fields to update" }, 400);
  }

  const service = createServiceClient(c.env);
  const { data, error } = await service
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

usersApp.post("/me/media", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const body = await c.req.parseBody();
  const kindRaw = body.kind;
  const fileRaw = body.file;

  const kind = typeof kindRaw === "string" ? kindRaw : "";
  if (kind !== "avatar" && kind !== "banner") {
    return c.json({ success: false, error: "Invalid media kind" }, 400);
  }

  if (!(fileRaw instanceof File)) {
    return c.json({ success: false, error: "Missing file" }, 400);
  }

  if (!MEDIA_TYPES.has(fileRaw.type)) {
    return c.json({ success: false, error: "Unsupported media type" }, 400);
  }

  if (fileRaw.size > MAX_MEDIA_BYTES) {
    return c.json({ success: false, error: "File too large" }, 400);
  }

  const ext = (() => {
    const byType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    return byType[fileRaw.type] || "jpg";
  })();

  const path = `${userId}/${kind}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const fileBuffer = await fileRaw.arrayBuffer();

  const service = createServiceClient(c.env);
  const { url: urlColumn, path: pathColumn, source: sourceColumn } = getProfileMediaColumns(kind);

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("avatar_url, avatar_path, avatar_source, banner_url, banner_path, banner_source")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return c.json({ success: false, error: profileError?.message || "Profile not found" }, 500);
  }

  const previousUrl = profile[urlColumn as keyof typeof profile];
  const previousStoredPath = profile[pathColumn as keyof typeof profile];
  const previousSource = profile[sourceColumn as keyof typeof profile];
  const previousPath =
    (typeof previousStoredPath === "string" && previousStoredPath) ||
    (previousSource === "storage" && typeof previousUrl === "string" ? extractProfileMediaPath(previousUrl) : null);

  const { error } = await service.storage
    .from("profile-media")
    .upload(path, fileBuffer, {
      contentType: fileRaw.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const { data } = service.storage.from("profile-media").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await service
    .from("profiles")
    .update({
      [urlColumn]: publicUrl,
      [pathColumn]: path,
      [sourceColumn]: "storage",
    })
    .eq("id", userId);

  if (updateError) {
    await service.storage.from("profile-media").remove([path]).catch(() => null);
    return c.json({ success: false, error: updateError.message }, 500);
  }

  if (previousPath && previousPath !== path) {
    const { error: removeError } = await service.storage.from("profile-media").remove([previousPath]);
    if (removeError) {
      console.error("profile media cleanup failed", {
        userId,
        kind,
        previousPath,
        error: removeError.message,
      });
    }
  }

  return c.json({ success: true, data: { publicUrl, path, kind } });
});

// Get current user achievements
usersApp.get("/me/achievements", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);

  const { data: earned, error: earnedError } = await service
    .from("user_achievements")
    .select("achievement_id, earned_at")
    .eq("user_id", userId);

  if (earnedError) {
    return c.json({ success: false, error: earnedError.message }, 500);
  }

  const { data: all, error: allError } = await service
    .from("achievements")
    .select("id, slug, icon, criteria_type, criteria_value, xp_reward, created_at")
    .order("criteria_type", { ascending: true })
    .order("criteria_value", { ascending: true });

  if (allError) {
    return c.json({ success: false, error: allError.message }, 500);
  }

  const earnedIds = new Set(earned?.map((e) => e.achievement_id) || []);
  const earnedMap = new Map(earned?.map((e) => [e.achievement_id, e.earned_at]) || []);

  const achievements = all?.map((a) => ({
    ...a,
    earned: earnedIds.has(a.id),
    earned_at: earnedMap.get(a.id) || null,
  }));

  return c.json({ success: true, data: achievements });
});

// Get achievements for any user by ID (public)
usersApp.get("/:id/achievements", async (c) => {
  const userId = c.req.param("id");
  const service = createServiceClient(c.env);

  const { data: earned, error: earnedError } = await service
    .from("user_achievements")
    .select("achievement_id, earned_at")
    .eq("user_id", userId);

  if (earnedError) {
    return c.json({ success: false, error: earnedError.message }, 500);
  }

  const { data: all, error: allError } = await service
    .from("achievements")
    .select("id, slug, icon, criteria_type, criteria_value, xp_reward, created_at")
    .order("criteria_type", { ascending: true })
    .order("criteria_value", { ascending: true });

  if (allError) {
    return c.json({ success: false, error: allError.message }, 500);
  }

  const earnedIds = new Set(earned?.map((e) => e.achievement_id) || []);
  const earnedMap = new Map(earned?.map((e) => [e.achievement_id, e.earned_at]) || []);

  const achievements = all?.map((a) => ({
    ...a,
    earned: earnedIds.has(a.id),
    earned_at: earnedMap.get(a.id) || null,
  }));

  return c.json({ success: true, data: achievements });
});

usersApp.get("/:id/activity", async (c) => {
  const userId = c.req.param("id");
  const service = createServiceClient(c.env);

  const [createdRes, playedRes] = await Promise.all([
    service
      .from("quizzes")
      .select("id, slug, title, description, cover_url, type, likes_count, attempts_count, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    service
      .from("quiz_results")
      .select("quiz_id, created_at, quiz:quizzes(id, slug, title, description, cover_url, type, likes_count, attempts_count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (createdRes.error) {
    return c.json({ success: false, error: createdRes.error.message }, 500);
  }

  if (playedRes.error) {
    return c.json({ success: false, error: playedRes.error.message }, 500);
  }

  const playedQuizzes = normalizePlayedQuizzes(playedRes.data as PlayedQuizRow[]);

  return c.json({
    success: true,
    data: {
      created_quizzes: createdRes.data || [],
      played_quizzes: playedQuizzes,
    },
  });
});

export { usersApp };
