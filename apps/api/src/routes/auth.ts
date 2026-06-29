import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { SignJWT } from "jose";
import { LoginSchema, RegisterSchema } from "@FunSona/shared";
import type { Env } from "../index.js";
import { createServiceClient, createAnonClient } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const authApp = new Hono<Env>();

function getSessionCookieOptions(env: string) {
  return {
    httpOnly: true,
    secure: env === "production",
    sameSite: "Strict" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    domain: env === "production" ? ".funsona.com" : undefined,
  };
}

async function signToken(payload: Record<string, unknown>, secret: string) {
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
}

function normalizeHandle(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

async function buildOAuthProfileUpsert(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  handle: string,
  displayName: string,
  externalAvatarUrl?: string
) {
  const { data: existingProfile } = await service
    .from("profiles")
    .select("avatar_url, avatar_source")
    .eq("id", userId)
    .single();

  const profile: Record<string, string | null> = {
    id: userId,
    handle,
    display_name: displayName,
  };

  const canUseExternalAvatar =
    externalAvatarUrl && (!existingProfile?.avatar_url || existingProfile.avatar_source === "external");

  if (canUseExternalAvatar) {
    profile.avatar_url = externalAvatarUrl;
    profile.avatar_source = "external";
    profile.avatar_path = null;
  }

  return profile;
}

authApp.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input", details: parsed.error.format() }, 400);
  }

  const { email, password, handle, display_name } = parsed.data;
  const supabase = createAnonClient(c.env);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { handle, display_name } },
  });

  if (authError || !authData.user) {
    return c.json({ success: false, error: authError?.message || "Registration failed" }, 400);
  }

  const service = createServiceClient(c.env);
  const { error: profileError } = await service.from("profiles").upsert({
    id: authData.user.id,
    handle,
    display_name,
  }, { onConflict: "id" });

  if (profileError) {
    return c.json({ success: false, error: profileError.message }, 500);
  }

  const token = await signToken({ sub: authData.user.id, email }, c.env.JWT_SECRET);
  setCookie(c, "FunSona_session", token, getSessionCookieOptions(c.env.ENVIRONMENT));

  return c.json({ success: true, data: { user: { id: authData.user.id, email, handle } } });
});

authApp.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid input" }, 400);
  }

  const { email, password } = parsed.data;
  const supabase = createAnonClient(c.env);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return c.json({ success: false, error: authError?.message || "Invalid credentials" }, 401);
  }

  if (!authData.user.email_confirmed_at) {
    return c.json({ success: false, error: "Email not verified. Please check your inbox." }, 403);
  }

  const token = await signToken({ sub: authData.user.id, email }, c.env.JWT_SECRET);
  setCookie(c, "FunSona_session", token, getSessionCookieOptions(c.env.ENVIRONMENT));

  return c.json({ success: true, data: { user: { id: authData.user.id, email } } });
});

authApp.post("/logout", async (c) => {
  deleteCookie(c, "FunSona_session", {
    path: "/",
    domain: c.env.ENVIRONMENT === "production" ? ".funsona.com" : undefined,
  });
  return c.json({ success: true });
});

authApp.get("/google", async (c) => {
  const redirectAfter = c.req.query("redirect") || "/profile/me";
  const supabase = createAnonClient(c.env);
  const callbackUrl = `${new URL(c.req.url).origin}/api/auth/google/callback?redirect=${encodeURIComponent(redirectAfter)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data?.url) {
    return c.json({ success: false, error: error?.message || "Google login init failed" }, 500);
  }

  return c.redirect(data.url, 302);
});

authApp.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const redirectAfter = c.req.query("redirect") || "/profile/me";
  const redirectTarget = /^\//.test(redirectAfter) ? redirectAfter : "/profile/me";

  if (!code) {
    return c.redirect(`${redirectTarget}?oauth_error=missing_code`, 302);
  }

  const supabase = createAnonClient(c.env);
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData?.user) {
    return c.redirect(`${redirectTarget}?oauth_error=exchange_failed`, 302);
  }

  const user = sessionData.user;
  const email = user.email || "";
  const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
  const emailPrefix = email.split("@")[0] || "user";
  const fallbackHandle = `user_${Date.now().toString(36)}`;
  const baseHandle = normalizeHandle(meta.preferred_username || meta.user_name || emailPrefix) || fallbackHandle;
  const displayName = meta.full_name || meta.name || baseHandle;

  const service = createServiceClient(c.env);

  let handle = baseHandle;
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? baseHandle : `${baseHandle}_${Math.random().toString(36).slice(2, 6)}`;
    const { data: existing } = await service.from("profiles").select("id").eq("handle", candidate).single();
    if (!existing || existing.id === user.id) {
      handle = candidate;
      break;
    }
  }

  const profileUpsert = await buildOAuthProfileUpsert(
    service,
    user.id,
    handle,
    displayName,
    meta.avatar_url || meta.picture
  );

  const { error: profileError } = await service.from("profiles").upsert(profileUpsert, { onConflict: "id" });

  if (profileError) {
    return c.redirect(`${redirectTarget}?oauth_error=profile_failed`, 302);
  }

  const token = await signToken({ sub: user.id, email }, c.env.JWT_SECRET);
  setCookie(c, "FunSona_session", token, getSessionCookieOptions(c.env.ENVIRONMENT));

  return c.redirect(redirectTarget, 302);
});

authApp.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const service = createServiceClient(c.env);
  const { data, error } = await service
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: error?.message || "Profile not found" }, 404);
  }

  return c.json({ success: true, data });
});

authApp.post("/oauth/finalize", async (c) => {
  const body = await c.req.json().catch(() => null);
  const accessToken = typeof body?.access_token === "string" ? body.access_token : "";

  if (!accessToken) {
    return c.json({ success: false, error: "Missing access_token" }, 400);
  }

  const anon = createAnonClient(c.env);
  const { data: userData, error: userError } = await anon.auth.getUser(accessToken);

  if (userError || !userData?.user) {
    return c.json({ success: false, error: "Invalid access token" }, 401);
  }

  const user = userData.user;
  const email = user.email || "";
  const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
  const emailPrefix = email.split("@")[0] || "user";
  const fallbackHandle = `user_${Date.now().toString(36)}`;
  const baseHandle = normalizeHandle(meta.preferred_username || meta.user_name || meta.handle || emailPrefix) || fallbackHandle;
  const displayName = meta.display_name || meta.full_name || meta.name || baseHandle;

  const service = createServiceClient(c.env);

  let handle = baseHandle;
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? baseHandle : `${baseHandle}_${Math.random().toString(36).slice(2, 6)}`;
    const { data: existing } = await service.from("profiles").select("id").eq("handle", candidate).single();
    if (!existing || existing.id === user.id) {
      handle = candidate;
      break;
    }
  }

  const profileUpsert = await buildOAuthProfileUpsert(
    service,
    user.id,
    handle,
    displayName,
    meta.avatar_url || meta.picture
  );

  const { error: profileError } = await service.from("profiles").upsert(profileUpsert, { onConflict: "id" });

  if (profileError) {
    return c.json({ success: false, error: profileError.message }, 500);
  }

  const token = await signToken({ sub: user.id, email }, c.env.JWT_SECRET);
  setCookie(c, "FunSona_session", token, getSessionCookieOptions(c.env.ENVIRONMENT));

  return c.json({ success: true });
});

export { authApp };
