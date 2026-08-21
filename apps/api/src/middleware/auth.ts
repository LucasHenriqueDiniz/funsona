import type { Context, MiddlewareHandler } from "hono";
import { createClerkClient } from "@clerk/backend";
import type { Env } from "../index.js";
import { findProfileIdByClerkUserId, resolveProfileIdForClerkUser } from "../db/client.js";
import { authorizedPartiesFor } from "../lib/origins.js";
import { secret } from "../lib/env.js";

// Verifies the Clerk session for the incoming request (cookie or Bearer
// token — authenticateRequest handles both) and resolves that Clerk user to a
// local `profiles` row, creating one lazily if needed (e.g. before the
// user.created webhook lands, or if it's ever missed).
//
// `userId` in the context is the internal profile id, NOT the Clerk id. Users
// carried over from Supabase are keyed by their original Supabase UUID, which
// is what author_id/user_id/reporter_id reference throughout the schema — so
// every ownership check downstream compares against the internal id.

/**
 * Why three states instead of a boolean: "no credential was sent" and "a
 * credential was sent and rejected" are completely different problems, and
 * collapsing them is what let a Clerk key/instance mismatch masquerade as
 * "the user is logged out" — the site rendered a signed-out navbar and nobody
 * could tell it was a config error.
 */
export type AuthState =
  | { state: "anonymous" }
  | { state: "signed-in"; clerkUserId: string; profileId: string }
  | { state: "failed"; reason: string };

const PROFILE_CACHE_TTL_SECONDS = 3600;

const profileCacheKey = (clerkUserId: string) => `clerk:profile:${clerkUserId}`;

/** Exported so the user.deleted webhook can drop a stale mapping. */
export async function invalidateProfileCache(env: Env["Bindings"], clerkUserId: string) {
  await env.FUNSONA_CACHE.delete(profileCacheKey(clerkUserId));
}

type ClerkIdentity = Parameters<typeof resolveProfileIdForClerkUser>[2];

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const clerk = createClerkClient({
    secretKey: secret(c.env, "CLERK_SECRET_KEY"),
    publishableKey: secret(c.env, "CLERK_PUBLISHABLE_KEY"),
  });

  const bearer = c.req.header("Authorization")?.startsWith("Bearer ") ?? false;
  const sessionCookie = (c.req.header("Cookie") ?? "").includes("__session");
  const hasCredential = bearer || sessionCookie;

  const fail = (reason: string) => {
    // One structured line per rejection. The key prefixes are the whole point:
    // an `sk_test_` sitting next to a `pk_live_` is a deployed-secret/instance
    // mismatch, and this makes it self-diagnosing in `wrangler tail` instead of
    // an opaque 401.
    console.error(
      JSON.stringify({
        evt: "auth_verification_failed",
        reason,
        path: new URL(c.req.url).pathname,
        origin: c.req.header("Origin") ?? null,
        transport: bearer ? "bearer" : "cookie",
        keyKind: secret(c.env, "CLERK_PUBLISHABLE_KEY").slice(0, 8) || null,
        secretKind: secret(c.env, "CLERK_SECRET_KEY").slice(0, 8) || null,
      })
    );
    c.set("authState", { state: "failed", reason });
  };

  let clerkUserId: string | null = null;

  try {
    const { isSignedIn, toAuth, reason } = await clerk.authenticateRequest(c.req.raw, {
      authorizedParties: authorizedPartiesFor(c.req.header("Origin"), c.env.ENVIRONMENT),
    });

    if (isSignedIn) {
      clerkUserId = toAuth().userId ?? null;
      if (!clerkUserId) fail("signed-in-without-user-id");
    } else if (hasCredential) {
      fail(reason ?? "not-signed-in");
    } else {
      c.set("authState", { state: "anonymous" });
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "verification-threw");
  }

  if (clerkUserId) {
    // Deliberately outside the try above: a D1/KV failure here is a 500, not a
    // silent downgrade to "signed out". The old code wrapped both and turned
    // any database blip into a 401.
    const userId = clerkUserId;

    // Resolution order is cheapest-first. The Clerk Backend API call used to
    // run on EVERY authenticated request; it now only runs for a user we have
    // never seen, which in practice means never (routes/webhooks/clerk.ts
    // creates the row on user.created).
    const cacheKey = profileCacheKey(userId);
    let profileId = await c.env.FUNSONA_CACHE.get(cacheKey);

    if (!profileId) {
      profileId = await findProfileIdByClerkUserId(c.env, userId);
    }

    if (!profileId) {
      const user = await clerk.users.getUser(userId);
      const primaryEmail = user.primaryEmailAddress ?? user.emailAddresses[0] ?? null;
      const email = primaryEmail?.emailAddress ?? null;
      const identity: ClerkIdentity = {
        handleSeed: user.username || email?.split("@")[0] || `user_${userId.slice(-8)}`,
        displayName:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          email?.split("@")[0] ||
          "user",
        email,
        emailVerified: primaryEmail?.verification?.status === "verified",
        avatarUrl: user.imageUrl || null,
      };
      profileId = await resolveProfileIdForClerkUser(c.env, userId, identity);
    }

    c.executionCtx.waitUntil(
      c.env.FUNSONA_CACHE.put(cacheKey, profileId, { expirationTtl: PROFILE_CACHE_TTL_SECONDS })
    );

    c.set("userId", profileId);
    c.set("session", { userId: profileId });
    c.set("authState", { state: "signed-in", clerkUserId: userId, profileId });
  }

  await next();
};

/**
 * Hard gate for routes that need a user. Must run after `authMiddleware`.
 *
 * The 503 matters: telling a client "you are not signed in" when we simply
 * couldn't verify the token is a lie that the UI then renders as a logout.
 * The reason stays in the logs — the client only gets a discriminator.
 */
export const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
  if (c.get("userId")) return next();

  if (c.get("authState")?.state === "failed") {
    return c.json(
      { success: false, error: "Authentication temporarily unavailable", code: "auth_unavailable" },
      503
    );
  }

  return c.json({ success: false, error: "Unauthorized", code: "unauthenticated" }, 401);
};

/**
 * Reads the profile id a handler is guaranteed to have because `requireAuth`
 * (or `requireAdmin`) ran before it. Exists so handlers don't sprinkle `!`
 * assertions: if the middleware is ever forgotten this throws into the app's
 * error handler as a 500 — a bug — instead of silently treating the request
 * as belonging to `undefined`.
 */
export function currentUserId(c: Context<Env>): string {
  const userId = c.get("userId");
  if (!userId) throw new Error("currentUserId() used on a route without requireAuth");
  return userId;
}
