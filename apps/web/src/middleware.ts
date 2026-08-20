import { defineMiddleware } from "astro:middleware";
import { PUBLIC_API_BASE_URL, PUBLIC_API_ORIGIN } from "@/lib/public-env";

// Astro's Cloudflare adapter builds a custom _worker.js, which puts Pages in
// "Advanced Mode" — Cloudflare then ignores public/_headers entirely for any
// route the worker handles (i.e. everything _routes.json doesn't exclude, which
// is nearly every route here). So security headers have to be set here instead.
//
// The CSP that used to live in public/_headers was dead code (never actually
// applied) and was wrong: it didn't allow Clerk, Google Fonts, or the API
// origin. Enforcing it as written would have broken login, fonts, and every
// API call. This version is scoped to what the site actually loads, checked
// against browser console errors while testing this change: Clerk's
// clerk-js/ui bundles and API, Google Fonts' stylesheet + font files, this
// site's own API origin, and the AdSense/GA domains already in use for ads
// and analytics (including the iframe/creative domains AdSense needs beyond
// just the loader script, since ad slots are already configured in prod).
const CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://*.clerk.accounts.dev https://clerk.funsona.com https://*.clerk.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: https:; " +
  `connect-src 'self' ${PUBLIC_API_ORIGIN} https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.clerk.accounts.dev https://clerk.funsona.com https://*.clerk.com; ` +
  "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://*.clerk.accounts.dev https://clerk.funsona.com; " +
  // Clerk spins up a Web Worker from a blob: URL for session refresh; without
  // this it silently falls back to script-src, which doesn't allow blob:.
  "worker-src 'self' blob:;";

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const protectedPaths = ["/profile/me", "/quiz/new", "/settings"];
  const path = context.url.pathname;

  // A quiz is authored in exactly one language (quizzes.language) and is never
  // translated, so it has no locale variants — yet Astro's i18n routing happily
  // served /en/quiz/x and /es/quiz/x as byte-identical copies of /quiz/x. That
  // tripled every quiz URL and reads as scaled/duplicate content. Collapse them
  // onto the single canonical URL. Static pages are genuinely translated, so
  // this deliberately only covers /quiz/*.
  const localizedQuizPath = path.match(/^\/(?:en|es)(\/quiz\/.+)$/);
  if (localizedQuizPath) {
    return context.redirect(`${localizedQuizPath[1]}${context.url.search}`, 301);
  }

  if (protectedPaths.some((p) => path.startsWith(p))) {
    // Try to fetch /auth/me to check session
    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/auth/me`, {
        credentials: "include",
        headers: {
          cookie: context.request.headers.get("cookie") || "",
        },
      });
      const data = await res.json();
      if (!data.success) {
        return context.redirect("/login");
      }
      // Attach user to locals for use in pages
      context.locals.user = data.data;
    } catch {
      return context.redirect("/login");
    }
  }

  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
});
