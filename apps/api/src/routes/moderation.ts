import { Hono } from "hono";
import type { Env } from "../index.js";
import { createServiceClient } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const moderationApp = new Hono<Env>();

// List unresolved reports (admin only), with the reported content attached
// so the moderator doesn't need a second round trip per report.
moderationApp.get("/reports", authMiddleware, requireAdmin, async (c) => {
  const service = createServiceClient(c.env);

  const { data: reports, error } = await service
    .from("content_reports")
    .select("id, target_type, target_id, reason, created_at, reporter:profiles!content_reports_reporter_id_fkey(handle, display_name)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const commentIds = (reports || []).filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const quizIds = (reports || []).filter((r) => r.target_type === "quiz").map((r) => r.target_id);

  const [{ data: comments }, { data: quizzes }] = await Promise.all([
    commentIds.length
      ? service.from("quiz_comments").select("id, content, quiz_id, hidden, deleted_at").in("id", commentIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
    quizIds.length
      ? service.from("quizzes").select("id, title, slug, status").in("id", quizIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const commentsById = new Map((comments || []).map((row: any) => [row.id, row]));
  const quizzesById = new Map((quizzes || []).map((row: any) => [row.id, row]));

  const enriched = (reports || []).map((report) => ({
    ...report,
    target:
      report.target_type === "comment"
        ? commentsById.get(report.target_id) || null
        : quizzesById.get(report.target_id) || null,
  }));

  return c.json({ success: true, data: enriched });
});

export { moderationApp };
