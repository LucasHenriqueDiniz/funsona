import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index.js";
import { createServiceClient } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const commentsApp = new Hono<Env>();

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const ReportSchema = z.object({
  reason: z.string().max(500).optional(),
});

async function isAdmin(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await service.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return !!data?.is_admin;
}

// List comments for a quiz
commentsApp.get("/", async (c) => {
  const quizSlug = c.req.param("slug");
  const { page = "1", limit = "20" } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const service = createServiceClient(c.env);

  // First resolve slug -> quiz id
  const { data: quiz } = await service
    .from("quizzes")
    .select("id")
    .eq("slug", quizSlug)
    .eq("status", "PUBLISHED")
    .single();
  if (!quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  const { data, error, count } = await service
    .from("quiz_comments")
    .select(
      "id, content, created_at, updated_at, user:profiles!quiz_comments_user_id_fkey(id, handle, display_name, avatar_url)",
      { count: "exact" }
    )
    .eq("quiz_id", quiz.id)
    .eq("hidden", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({
    success: true,
    data,
    meta: { page: pageNum, limit: limitNum, total: count ?? 0 },
  });
});

// Create comment (auth required)
commentsApp.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const quizSlug = c.req.param("slug");
  const body = await c.req.json();
  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input", details: parsed.error.format() }, 400);
  }

  const service = createServiceClient(c.env);

  const { data: quiz } = await service
    .from("quizzes")
    .select("id")
    .eq("slug", quizSlug)
    .eq("status", "PUBLISHED")
    .single();
  if (!quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  const { data, error } = await service
    .from("quiz_comments")
    .insert({ quiz_id: quiz.id, user_id: userId, content: parsed.data.content })
    .select(
      "id, content, created_at, updated_at, user:profiles!quiz_comments_user_id_fkey(id, handle, display_name, avatar_url)"
    )
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

// Delete comment (auth required)
commentsApp.delete("/:commentId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const commentId = c.req.param("commentId");
  const service = createServiceClient(c.env);

  const { data: comment } = await service
    .from("quiz_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  if (comment.user_id !== userId && !(await isAdmin(service, userId))) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { error } = await service.from("quiz_comments").delete().eq("id", commentId);
  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true });
});

// Report a comment (auth required)
commentsApp.post("/:commentId/report", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const commentId = c.req.param("commentId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input" }, 400);
  }

  const service = createServiceClient(c.env);

  const { data: comment } = await service.from("quiz_comments").select("id").eq("id", commentId).maybeSingle();
  if (!comment) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  const { error } = await service.from("content_reports").insert({
    target_type: "comment",
    target_id: commentId,
    reporter_id: userId,
    reason: parsed.data.reason || null,
  });

  // Unique index blocks a second open report from the same user for the same
  // target — treat that as a success rather than an error.
  if (error && error.code !== "23505") {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true }, 201);
});

// Hide a comment (admin only)
commentsApp.post("/:commentId/hide", authMiddleware, requireAdmin, async (c) => {
  const commentId = c.req.param("commentId");
  const service = createServiceClient(c.env);

  const { error } = await service.from("quiz_comments").update({ hidden: true }).eq("id", commentId);
  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  await service
    .from("content_reports")
    .update({ resolved_at: new Date().toISOString(), resolved_action: "hidden" })
    .eq("target_type", "comment")
    .eq("target_id", commentId)
    .is("resolved_at", null);

  return c.json({ success: true });
});

export { commentsApp };
