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
  };
};

const app = new Hono<Env>();

app.use(logger());
app.use(prettyJSON());
app.use(
  cors({
    origin: (origin, c) => {
      const env = c.env.ENVIRONMENT;
      if (env === "development") {
        const devOrigins = new Set(["http://localhost:4321", "http://localhost:3000"]);
        return devOrigins.has(origin) ? origin : "";
      }
      if (!origin) return "";
      try {
        const { hostname } = new URL(origin);
        const allowedHosts = new Set([
          "funsona.com",
          "www.funsona.com",
          "api.funsona.com",
          "funsona-v2.pages.dev",
        ]);
        const allowed =
          allowedHosts.has(hostname) ||
          hostname.endsWith(".funsona.com") ||
          hostname.endsWith(".funsona-v2.pages.dev");
        if (allowed) return origin;
      } catch {
        return "";
      }
      return "";
    },
    credentials: true,
  })
);

app.use(async (c, next) => {
  const required = ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
  for (const key of required) {
    if (!c.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      return c.json({ success: false, error: "Server configuration error" }, 500);
    }
  }
  await next();
});

app.get("/health", (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }));

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

app.onError((err, c) => {
  console.error("[ERROR]", err.message, err.stack);
  const message = c.env.ENVIRONMENT === "production" ? "Internal Server Error" : (err.message || "Internal Server Error");
  return c.json({ success: false, error: message }, 500);
});

export default app;
