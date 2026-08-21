import type { MiddlewareHandler } from "hono";
import type { Env } from "../index.js";
import { isAdmin } from "../db/client.js";

// Must run after authMiddleware — relies on c.get("userId") being set.
// Mirrors requireAuth's distinction between "not signed in" and "we couldn't
// verify the credential you sent", so an admin never sees a config failure
// reported as a permissions problem.
export const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    if (c.get("authState")?.state === "failed") {
      return c.json(
        { success: false, error: "Authentication temporarily unavailable", code: "auth_unavailable" },
        503
      );
    }
    return c.json({ success: false, error: "Unauthorized", code: "unauthenticated" }, 401);
  }

  if (!(await isAdmin(c.env, userId))) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  await next();
};
