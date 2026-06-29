import { Hono } from "hono";
import type { Env } from "../index.js";
import { createServiceClient } from "../lib/supabase.js";

const profilesApp = new Hono<Env>();

profilesApp.get("/:handle", async (c) => {
  const handle = c.req.param("handle");
  if (!handle) {
    return c.json({ success: false, error: "Missing handle" }, 400);
  }

  const service = createServiceClient(c.env);
  const { data, error } = await service
    .from("profiles")
    .select("id, handle, display_name, avatar_url, banner_url, bio, level, xp, is_premium, created_at")
    .eq("handle", handle)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: "Profile not found" }, 404);
  }

  return c.json({ success: true, data });
});

export { profilesApp };
