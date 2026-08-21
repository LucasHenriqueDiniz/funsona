import type { Env } from "../index.js";

type Bindings = Env["Bindings"];

// Cloudflare's environment injection prepends a UTF-8 BOM (U+FEFF) to the
// values it hands the Worker. It is invisible everywhere you'd look — the
// dashboard, `wrangler secret list`, a console.log — but it is part of the
// string, so `"﻿sk_live_…"` is not a key any SDK recognises.
//
// This is not hypothetical: it silently broke every Clerk session
// verification in production. clerk.authenticateRequest rejected every real
// token, the failure was swallowed, and the whole site rendered as logged
// out. The same BOM had already been caught on the frontend publishable key
// (see apps/web/astro.config.mjs). Read every secret through here.
export function secret<K extends keyof Bindings>(env: Bindings, key: K): string {
  const value = env[key];
  return typeof value === "string" ? value.replace(/^﻿/, "").trim() : "";
}
