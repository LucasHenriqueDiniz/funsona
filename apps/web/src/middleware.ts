import { defineMiddleware, sequence } from "astro:middleware";
import { clerkMiddleware } from "@clerk/astro/server";
import { PUBLIC_API_ORIGIN } from "@/lib/public-env";

// Astro's Cloudflare adapter builds a custom _worker.js, which puts Pages in
// "Advanced Mode" — Cloudflare then ignores public/_headers entirely for any
// route the worker handles (i.e. everything _routes.json doesn't exclude, which
// is nearly every route here). So security headers have to be set here instead.
//
// Every host below is here because something the site actually loads was seen
// being blocked in the browser console. The Clerk entries follow Clerk's own
// CSP guide (clerk.com/docs/security/clerk-csp): the FAPI host, the bot
// protection proxy, and Cloudflare Turnstile — which needs BOTH script-src and
// frame-src, since it loads a script that then renders in an iframe. Allowing
// only one of the two is what made every sign-up fail with
// "Failed to load the CAPTCHA script" and a 400 from /v1/client/sign_ups.
//
// Directives are a list rather than one concatenated string so a missing space
// can't silently merge two directives into one.
const CSP = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    // Clerk: FAPI, bot protection proxy, Turnstile.
    "https://clerk.funsona.com https://*.clerk.com https://*.clerk.accounts.dev",
    "https://*.protect.clerk.com https://challenges.cloudflare.com",
    // Cloudflare Web Analytics injects this from the dashboard, not the repo.
    "https://static.cloudflareinsights.com",
    // AdSense loader, GA/GTM, and the ad-traffic-quality (sodar) hosts.
    "https://pagead2.googlesyndication.com https://tpc.googlesyndication.com",
    "https://googleads.g.doubleclick.net https://www.googletagmanager.com",
    "https://www.google-analytics.com https://ep1.adtrafficquality.google",
    "https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com",
  ].join(" "),
  // Clerk styles at runtime via CSS-in-JS, so 'unsafe-inline' is required here.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // blob: covers the local preview in components/ui/ImageUpload.tsx.
  "img-src 'self' data: blob: https:",
  [
    `connect-src 'self' ${PUBLIC_API_ORIGIN}`,
    "https://clerk.funsona.com https://*.clerk.com https://*.clerk.accounts.dev",
    "https://*.protect.clerk.com https://challenges.cloudflare.com",
    "https://cloudflareinsights.com https://static.cloudflareinsights.com",
    "https://www.google-analytics.com https://*.google-analytics.com",
    "https://analytics.google.com https://www.googletagmanager.com",
    "https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
    "https://*.adtrafficquality.google https://fundingchoicesmessages.google.com",
    // AdSense's client-side timing beacon.
    "https://csi.gstatic.com",
  ].join(" "),
  [
    "frame-src 'self'",
    "https://challenges.cloudflare.com https://*.protect.clerk.com",
    "https://clerk.funsona.com https://*.clerk.accounts.dev https://accounts.funsona.com",
    "https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "https://www.google.com https://*.adtrafficquality.google",
  ].join(" "),
  // Clerk spins up a Web Worker from a blob: URL for session refresh; without
  // this it silently falls back to script-src, which doesn't allow blob:.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // Clerk posts sign-in forms to its own FAPI/account portal.
  "form-action 'self' https://clerk.funsona.com https://accounts.funsona.com",
  // Modern equivalent of the X-Frame-Options header below; both are kept so
  // browsers that only understand one are still covered.
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
};

// Protected routes are gated by Clerk directly. They used to be gated by
// fetching /auth/me on the API with the browser's cookie replayed — a
// cross-origin round-trip on every render whose failure logged the user out.
// clerkMiddleware also populates locals.authToken, which lib/api-server.ts
// sends as a Bearer token.
const PROTECTED_PATHS = ["/profile/me", "/quiz/new", "/settings"];

const auth = clerkMiddleware((authFn, context, next) => {
  const path = context.url.pathname;
  if (PROTECTED_PATHS.some((p) => path.startsWith(p)) && !authFn().userId) {
    return context.redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }
  return next();
});

// A quiz is authored in exactly one language (quizzes.language) and is never
// translated, so it has no locale variants — yet Astro's i18n routing happily
// served /en/quiz/x and /es/quiz/x as byte-identical copies of /quiz/x. That
// tripled every quiz URL and reads as scaled/duplicate content. Collapse them
// onto the single canonical URL. Static pages are genuinely translated, so
// this deliberately only covers /quiz/*.
const canonicalQuizUrl = defineMiddleware((context, next) => {
  const localizedQuizPath = context.url.pathname.match(/^\/(?:en|es)(\/quiz\/.+)$/);
  if (localizedQuizPath) {
    return context.redirect(`${localizedQuizPath[1]}${context.url.search}`, 301);
  }
  return next();
});

const securityHeaders = defineMiddleware(async (_context, next) => {
  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
});

export const onRequest = sequence(auth, canonicalQuizUrl, securityHeaders);
