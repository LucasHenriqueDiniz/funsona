import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  getQuizBySlug,
  listQuizComments,
  createQuizComment,
  getCommentOwner,
  deleteComment,
  hideComment,
  createReport,
  isAdmin,
} from "../db/client.js";

const commentsApp = new Hono<Env>();

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const ReportSchema = z.object({
  reason: z.string().max(500).optional(),
});

// List comments for a quiz
commentsApp.get("/", async (c) => {
  const quizSlug = c.req.param("slug");
  const { page = "1", limit = "20" } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const quiz = quizSlug ? await getQuizBySlug(c.env, quizSlug) : null;
  if (!quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  const { data, total } = await listQuizComments(c.env, quiz.id, limitNum, offset);

  return c.json({
    success: true,
    data,
    meta: { page: pageNum, limit: limitNum, total },
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

  const quiz = quizSlug ? await getQuizBySlug(c.env, quizSlug) : null;
  if (!quiz) {
    return c.json({ success: false, error: "Quiz not found" }, 404);
  }

  const data = await createQuizComment(c.env, quiz.id, userId, parsed.data.content);
  return c.json({ success: true, data }, 201);
});

// Delete comment (auth required)
commentsApp.delete("/:commentId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const commentId = c.req.param("commentId");
  const ownerId = await getCommentOwner(c.env, commentId);

  if (!ownerId) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  if (ownerId !== userId && !(await isAdmin(c.env, userId))) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  await deleteComment(c.env, commentId);
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

  const ownerId = await getCommentOwner(c.env, commentId);
  if (!ownerId) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  await createReport(c.env, "comment", commentId, userId, parsed.data.reason || null);
  return c.json({ success: true }, 201);
});

// Hide a comment (admin only)
commentsApp.post("/:commentId/hide", authMiddleware, requireAdmin, async (c) => {
  const commentId = c.req.param("commentId");
  await hideComment(c.env, commentId);
  return c.json({ success: true });
});

export { commentsApp };
