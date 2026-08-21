import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index.js";
import { authMiddleware, requireAuth, currentUserId } from "../middleware/auth.js";
import {
  getDb,
  getProfileById,
  updateProfile,
  getUserAchievements,
  getUserCreatedQuizzes,
  getUserPlayedQuizzes,
} from "../db/client.js";

const usersApp = new Hono<Env>();

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  banner_url: z.string().url().nullable().optional(),
});

const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

function getProfileMediaColumns(kind: "avatar" | "banner") {
  return kind === "avatar"
    ? { url: "avatar_url", path: "avatar_path", source: "avatar_source" }
    : { url: "banner_url", path: "banner_path", source: "banner_source" };
}

usersApp.get("/me/streak", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const row = await getDb(c.env)
    .prepare("SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?")
    .bind(userId)
    .first<{ current_streak: number; longest_streak: number; last_activity_date: string | null }>();

  if (!row) {
    return c.json({
      success: true,
      data: { current_streak: 0, longest_streak: 0, last_activity_date: null },
    });
  }

  return c.json({ success: true, data: row });
});

usersApp.get("/me/stats", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const db = getDb(c.env);
  const [profile, streak, resultsCount, createdCount] = await Promise.all([
    getProfileById(c.env, userId),
    db.prepare("SELECT current_streak, longest_streak FROM user_streaks WHERE user_id = ?").bind(userId).first<{ current_streak: number; longest_streak: number }>(),
    db.prepare("SELECT count(*) as n FROM quiz_results WHERE user_id = ?").bind(userId).first<{ n: number }>(),
    db.prepare("SELECT count(*) as n FROM quizzes WHERE author_id = ?").bind(userId).first<{ n: number }>(),
  ]);

  if (!profile) {
    return c.json({ success: false, error: "Profile not found" }, 500);
  }

  return c.json({
    success: true,
    data: {
      xp: profile.xp || 0,
      level: profile.level || 1,
      current_streak: streak?.current_streak || 0,
      longest_streak: streak?.longest_streak || 0,
      quizzes_played: resultsCount?.n || 0,
      quizzes_created: createdCount?.n || 0,
    },
  });
});

usersApp.get("/me/activity", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const [created, played] = await Promise.all([
    getUserCreatedQuizzes(c.env, userId, 6),
    getUserPlayedQuizzes(c.env, userId, 30, 6),
  ]);

  return c.json({
    success: true,
    data: { created_quizzes: created, played_quizzes: played },
  });
});

usersApp.patch("/me", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

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

  const data = await updateProfile(c.env, userId, updates);
  return c.json({ success: true, data });
});

usersApp.post("/me/media", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

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

  const objectPath = `${userId}/${kind}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const fileBuffer = await fileRaw.arrayBuffer();

  const { url: urlColumn, path: pathColumn, source: sourceColumn } = getProfileMediaColumns(kind);

  const profile = await getProfileById(c.env, userId);
  if (!profile) {
    return c.json({ success: false, error: "Profile not found" }, 500);
  }

  const previousPath = (profile as Record<string, unknown>)[pathColumn] as string | null;

  await c.env.PROFILE_MEDIA.put(objectPath, fileBuffer, {
    httpMetadata: { contentType: fileRaw.type, cacheControl: "public, max-age=3600" },
  });

  const publicUrl = `${new URL(c.req.url).origin}/media/profile-media/${objectPath}`;

  try {
    await updateProfile(c.env, userId, {
      [urlColumn]: publicUrl,
      [pathColumn]: objectPath,
      [sourceColumn]: "storage",
    });
  } catch (err) {
    await c.env.PROFILE_MEDIA.delete(objectPath).catch(() => null);
    return c.json({ success: false, error: err instanceof Error ? err.message : "Update failed" }, 500);
  }

  if (previousPath && previousPath !== objectPath) {
    await c.env.PROFILE_MEDIA.delete(previousPath).catch((err) => {
      console.error("profile media cleanup failed", { userId, kind, previousPath, error: String(err) });
    });
  }

  return c.json({ success: true, data: { publicUrl, path: objectPath, kind } });
});

// Get current user achievements
usersApp.get("/me/achievements", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const data = await getUserAchievements(c.env, userId);
  return c.json({ success: true, data });
});

// Get achievements for any user by ID (public)
usersApp.get("/:id/achievements", async (c) => {
  const userId = c.req.param("id");
  const data = await getUserAchievements(c.env, userId);
  return c.json({ success: true, data });
});

usersApp.get("/:id/activity", async (c) => {
  const userId = c.req.param("id");

  const [created, played] = await Promise.all([
    getUserCreatedQuizzes(c.env, userId, 6),
    getUserPlayedQuizzes(c.env, userId, 30, 6),
  ]);

  return c.json({
    success: true,
    data: { created_quizzes: created, played_quizzes: played },
  });
});

export { usersApp };
