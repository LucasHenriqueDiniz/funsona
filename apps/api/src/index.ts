import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { authApp } from "./routes/auth.js";
import { quizzesApp } from "./routes/quizzes.js";
import { commentsApp } from "./routes/comments.js";
import { leaderboardApp } from "./routes/leaderboard.js";
import { stripeApp } from "./routes/stripe.js";
import { usersApp } from "./routes/users.js";
import { settingsApp } from "./routes/settings.js";
import { profilesApp } from "./routes/profiles.js";
import { moderationApp } from "./routes/moderation.js";
import { clerkWebhookApp } from "./routes/webhooks/clerk.js";
import { mediaApp } from "./routes/media.js";
import { isAllowedOrigin } from "./lib/origins.js";
import { secret } from "./lib/env.js";
import type { AuthState } from "./middleware/auth.js";

export type Env = {
  Bindings: {
    CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    CLERK_WEBHOOK_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    FUNSONA_CACHE: KVNamespace;
    DB: D1Database;
    QUIZ_IMAGES: R2Bucket;
    PROFILE_MEDIA: R2Bucket;
    ENVIRONMENT: string;
  };
  Variables: {
    userId?: string;
    session?: Record<string, unknown>;
    authState?: AuthState;
  };
};

const app = new Hono<Env>();

app.use(logger());
app.use(prettyJSON());
app.use(
  cors({
    // The allowlist lives in lib/origins.ts because Clerk's authorizedParties
    // check in middleware/auth.ts has to agree with it exactly.
    origin: (origin, c) => (isAllowedOrigin(origin, c.env.ENVIRONMENT) ? origin : ""),
    // Authorization is listed explicitly: Hono echoes whatever the preflight
    // asks for when allowHeaders is empty, so Bearer worked only by accident.
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
    credentials: true,
  })
);

app.use(async (c, next) => {
  const required = ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
  for (const key of required) {
    if (!secret(c.env, key)) {
      console.error(`Missing required environment variable: ${key}`);
      return c.json({ success: false, error: "Server configuration error" }, 500);
    }
  }
  await next();
});

app.get("/health", (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }));

// Answers "are the frontend and this worker talking to the same Clerk
// instance?" without exposing a secret — only key prefixes and the Frontend
// API host encoded in the publishable key. A `pk_live_` paired with an
// `sk_test_` rejects every real session and is otherwise invisible.
app.get("/health/auth", (c) => {
  const pk = secret(c.env, "CLERK_PUBLISHABLE_KEY");
  const sk = secret(c.env, "CLERK_SECRET_KEY");
  let frontendApi: string | null = null;
  try {
    // pk_(live|test)_<base64 of "fapi.host$">
    frontendApi = atob(pk.replace(/^pk_(live|test)_/, "")).replace(/\$$/, "") || null;
  } catch {
    frontendApi = null;
  }
  const kind = (key: string) => (key.startsWith("sk_live_") || key.startsWith("pk_live_") ? "live" : key ? "test" : null);
  return c.json({
    ok: true,
    environment: c.env.ENVIRONMENT,
    publishableKeyPrefix: pk.slice(0, 8) || null,
    secretKeyPrefix: sk.slice(0, 8) || null,
    frontendApi,
    instanceKindMatches: !!pk && !!sk && kind(pk) === kind(sk),
  });
});

app.route("/api/auth", authApp);
app.route("/api/quizzes", quizzesApp);
app.route("/api/quizzes/:slug/comments", commentsApp);
app.route("/api/leaderboard", leaderboardApp);
app.route("/api/users", usersApp);
app.route("/api/profiles", profilesApp);
app.route("/api/settings", settingsApp);
app.route("/api/stripe", stripeApp);
app.route("/api/moderation", moderationApp);
app.route("/api/webhooks/clerk", clerkWebhookApp);
app.route("/media", mediaApp);

app.onError((err, c) => {
  console.error("[ERROR]", err.message, err.stack);
  const message = c.env.ENVIRONMENT === "production" ? "Internal Server Error" : (err.message || "Internal Server Error");
  return c.json({ success: false, error: message }, 500);
});

export default app;
