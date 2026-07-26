import { Hono } from "hono";
import type { Env } from "../index.js";
import { getProfileByHandle } from "../db/client.js";

const profilesApp = new Hono<Env>();

profilesApp.get("/:handle", async (c) => {
  const handle = c.req.param("handle");
  if (!handle) {
    return c.json({ success: false, error: "Missing handle" }, 400);
  }

  const data = await getProfileByHandle(c.env, handle);
  if (!data) {
    return c.json({ success: false, error: "Profile not found" }, 404);
  }

  return c.json({ success: true, data });
});

export { profilesApp };
