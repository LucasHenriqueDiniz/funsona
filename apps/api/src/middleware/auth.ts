import type { MiddlewareHandler } from "hono";
import { createClerkClient } from "@clerk/backend";
import type { Env } from "../index.js";
import { ensureProfileExists, getProfileById } from "../db/client.js";

// Verifies the Clerk session for the incoming request (cookie or Bearer
// token — authenticateRequest handles both) and, on success, ensures a
// local `profiles` row exists for that Clerk user (lazily created here so
// the rest of the app keeps working even before the user.created webhook
// has landed, or if it's ever missed).
export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY, publishableKey: c.env.CLERK_PUBLISHABLE_KEY });

  try {
    const { isSignedIn, toAuth } = await clerk.authenticateRequest(c.req.raw);

    if (isSignedIn) {
      const auth = toAuth();
      const userId = auth.userId;
      if (userId) {
        c.set("userId", userId);
        c.set("session", { userId });

        const existing = await getProfileById(c.env, userId);
        if (!existing) {
          const user = await clerk.users.getUser(userId);
          const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
          const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email?.split("@")[0] || "user";
          await ensureProfileExists(c.env, userId, {
            handleSeed: user.username || email?.split("@")[0] || `user_${userId.slice(-8)}`,
            displayName,
            email,
            avatarUrl: user.imageUrl || null,
          });
        }
      }
    }
  } catch (err) {
    console.error("Clerk auth check failed", err);
  }

  await next();
};
