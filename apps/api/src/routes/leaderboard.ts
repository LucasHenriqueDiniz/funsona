import { Hono } from "hono";
import type { Env } from "../index.js";
import { authMiddleware } from "../middleware/auth.js";
import { getLeaderboardWindow, getMyLeaderboardRank } from "../db/client.js";

const leaderboardApp = new Hono<Env>();

leaderboardApp.get("/", async (c) => {
  const { window = "all_time", page = "1", limit = "50" } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const rows = await getLeaderboardWindow(c.env, window, limitNum, offset);

  const normalized = rows.map((row) => ({
    user_id: row.user_id,
    xp_all_time: window === "all_time" ? Number(row.xp || 0) : 0,
    xp_weekly: window === "weekly" ? Number(row.xp || 0) : 0,
    xp_monthly: window === "monthly" ? Number(row.xp || 0) : 0,
    profiles: {
      handle: row.handle,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      level: row.level,
    },
  }));

  return c.json({
    success: true,
    data: normalized,
    meta: { page: pageNum, limit: limitNum, total: normalized.length, window },
  });
});

leaderboardApp.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const { window = "weekly" } = c.req.query();
  const meRow = await getMyLeaderboardRank(c.env, userId, window);

  if (!meRow) {
    return c.json({ success: true, data: null });
  }

  return c.json({
    success: true,
    data: {
      rank: Number(meRow.rank || 0),
      xp: Number(meRow.xp || 0),
      window,
      profile: {
        handle: meRow.handle,
        display_name: meRow.display_name,
        avatar_url: meRow.avatar_url,
        level: meRow.level,
      },
    },
  });
});

export { leaderboardApp };
