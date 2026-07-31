import type { MiddlewareHandler } from "hono";
import { createClerkClient } from "@clerk/backend";
import type { Env } from "../index.js";
import { resolveProfileIdForClerkUser } from "../db/client.js";

// Verifies the Clerk session for the incoming request (cookie or Bearer
// token — authenticateRequest handles both) and resolves that Clerk user to a
// local `profiles` row, creating one lazily if needed (e.g. before the
// user.created webhook lands, or if it's ever missed).
//
// `userId` in the context is the internal profile id, NOT the Clerk id. Users
// carried over from Supabase are keyed by their original Supabase UUID, which
// is what author_id/user_id/reporter_id reference throughout the schema — so
// every ownership check downstream compares against the internal id.
export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY, publishableKey: c.env.CLERK_PUBLISHABLE_KEY });

  try {
    const { isSignedIn, toAuth } = await clerk.authenticateRequest(c.req.raw);

    if (isSignedIn) {
      const auth = toAuth();
      const clerkUserId = auth.userId;
      if (clerkUserId) {
        const user = await clerk.users.getUser(clerkUserId);
        const primaryEmail = user.primaryEmailAddress ?? user.emailAddresses[0] ?? null;
        const email = primaryEmail?.emailAddress ?? null;
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email?.split("@")[0] || "user";

        const userId = await resolveProfileIdForClerkUser(c.env, clerkUserId, {
          handleSeed: user.username || email?.split("@")[0] || `user_${clerkUserId.slice(-8)}`,
          displayName,
          email,
          emailVerified: primaryEmail?.verification?.status === "verified",
          avatarUrl: user.imageUrl || null,
        });

        c.set("userId", userId);
        c.set("session", { userId });
      }
    }
  } catch (err) {
    console.error("Clerk auth check failed", err);
  }

  await next();
};
