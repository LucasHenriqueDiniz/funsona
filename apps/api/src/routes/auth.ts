import { Hono } from "hono";
import type { Env } from "../index.js";
import { authMiddleware, requireAuth, currentUserId } from "../middleware/auth.js";
import { getProfileById } from "../db/client.js";

// Sign-up/sign-in/sign-out are handled entirely by Clerk's frontend SDK in
// apps/web — the browser talks to Clerk directly and Clerk manages its own
// session cookie. This app no longer mints or verifies its own session
// token; authMiddleware verifies the Clerk session instead. The only thing
// left here is exposing the local profile for the current Clerk user
// (profiles.id == Clerk user id, kept in sync by routes/webhooks/clerk.ts
// and the lazy-create fallback in authMiddleware).
const authApp = new Hono<Env>();

authApp.get("/me", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const data = await getProfileById(c.env, userId);
  if (!data) {
    return c.json({ success: false, error: "Profile not found" }, 404);
  }

  return c.json({ success: true, data });
});

export { authApp };
