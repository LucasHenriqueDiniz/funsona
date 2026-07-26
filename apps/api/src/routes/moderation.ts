import { Hono } from "hono";
import type { Env } from "../index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { listUnresolvedReports } from "../db/client.js";

const moderationApp = new Hono<Env>();

// List unresolved reports (admin only), with the reported content attached
// so the moderator doesn't need a second round trip per report.
moderationApp.get("/reports", authMiddleware, requireAdmin, async (c) => {
  const data = await listUnresolvedReports(c.env, 100);
  return c.json({ success: true, data });
});

export { moderationApp };
