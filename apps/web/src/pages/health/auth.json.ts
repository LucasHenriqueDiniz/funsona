import type { APIContext } from "astro";

// Diagnostic for the SSR half of auth: says whether clerkMiddleware could
// verify the request's session and — crucially — whether the keys the Worker
// received are intact. Cloudflare's env injection has now corrupted keys with
// a BOM twice, and a prefix reading "﻿sk_live" instead of "sk_live_" is the
// whole answer, invisible everywhere else.
//
// Exposes prefixes and status only, never a key.
export const prerender = false;

export async function GET(context: APIContext) {
  const runtimeEnv =
    (context.locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env ?? {};
  const prefix = (value: unknown) => (typeof value === "string" ? value.slice(0, 8) : null);

  return new Response(
    JSON.stringify(
      {
        ok: true,
        // Deliberately unsanitized: this is what the runtime actually handed us.
        rawSecretPrefix: prefix(runtimeEnv.CLERK_SECRET_KEY),
        rawPublishablePrefix: prefix(runtimeEnv.PUBLIC_CLERK_PUBLISHABLE_KEY),
        authStatus: context.locals.authStatus ?? null,
        authReason: context.locals.authReason ?? null,
        signedIn: !!context.locals.auth?.()?.userId,
        hasAuthToken: !!context.locals.authToken,
      },
      null,
      2
    ),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
