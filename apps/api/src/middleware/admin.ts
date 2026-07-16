import type { MiddlewareHandler } from "hono";
import type { Env } from "../index.js";
import { createServiceClient } from "../lib/supabase.js";

// Must run after authMiddleware — relies on c.get("userId") being set.
export const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);
  const { data: profile } = await service.from("profiles").select("is_admin").eq("id", userId).maybeSingle();

  if (!profile?.is_admin) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  await next();
};
