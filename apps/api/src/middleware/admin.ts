import type { MiddlewareHandler } from "hono";
import type { Env } from "../index.js";
import { isAdmin } from "../db/client.js";

// Must run after authMiddleware — relies on c.get("userId") being set.
export const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  if (!(await isAdmin(c.env, userId))) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  await next();
};
