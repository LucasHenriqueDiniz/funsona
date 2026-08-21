import { Hono } from "hono";
import { Webhook } from "svix";
import type { Env } from "../../index.js";
import { upsertProfileFromClerk, deleteProfileByClerkUserId, resolveProfileIdForClerkUser } from "../../db/client.js";
import { invalidateProfileCache } from "../../middleware/auth.js";

const clerkWebhookApp = new Hono<Env>();

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    // `verification.status` gates claiming a pre-existing profile by email, so
    // an unverified address can never be used to take over another account.
    email_addresses: Array<{
      id: string;
      email_address: string;
      verification?: { status?: string } | null;
    }>;
    primary_email_address_id: string | null;
  };
};

clerkWebhookApp.post("/", async (c) => {
  const payload = await c.req.raw.text();
  const headers = {
    "svix-id": c.req.header("svix-id") ?? "",
    "svix-timestamp": c.req.header("svix-timestamp") ?? "",
    "svix-signature": c.req.header("svix-signature") ?? "",
  };

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(c.env.CLERK_WEBHOOK_SECRET);
    event = wh.verify(payload, headers) as ClerkUserEvent;
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err);
    return c.json({ success: false, error: "Invalid signature" }, 400);
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const user = event.data;
    const emailRecord = user.email_addresses.find((e) => e.id === user.primary_email_address_id)
      ?? user.email_addresses[0]
      ?? null;
    const primaryEmail = emailRecord?.email_address ?? null;
    const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || primaryEmail?.split("@")[0] || "user";

    // Resolve first so a returning Supabase-era user updates their existing
    // profile instead of getting a second, empty one keyed by the Clerk id.
    const profileId = await resolveProfileIdForClerkUser(c.env, user.id, {
      handleSeed: user.username || primaryEmail?.split("@")[0] || `user_${user.id.slice(-8)}`,
      displayName,
      email: primaryEmail,
      emailVerified: emailRecord?.verification?.status === "verified",
      avatarUrl: user.image_url || null,
    });

    await upsertProfileFromClerk(c.env, profileId, {
      handleSeed: user.username || primaryEmail?.split("@")[0] || `user_${user.id.slice(-8)}`,
      displayName,
      email: primaryEmail,
      avatarUrl: user.image_url || null,
    });
  } else if (event.type === "user.deleted") {
    await deleteProfileByClerkUserId(c.env, event.data.id);
    // authMiddleware caches the Clerk id -> profile id mapping in KV for an
    // hour; without this a deleted user keeps resolving until it expires.
    await invalidateProfileCache(c.env, event.data.id);
  }

  return c.json({ success: true });
});

export { clerkWebhookApp };
