# Research

Investigations and benchmarks already done. Do not repeat research listed here unless the data has gone stale.

## SEO Benchmarks (2025-01)

| Competitor | Lighthouse Perf | Lighthouse SEO | Notes |
|---|---|---|---|
| QuizPanda | 45 | 85 | Heavy JS, slow LCP |
| Quizur | 55 | 80 | Decent, but dated UX |
| Sporcle | 60 | 90 | Good SEO, lots of ads |
| Kahoot | 70 | 95 | Excellent, but not UGC |

**FunSona's target**: 80+ Performance, 95+ SEO, 100 Best Practices.

## Astro vs Next.js for SEO

- Astro emits less JS by default (0kb with no islands).
- `output: "server"` with the Cloudflare adapter gives SSR on the edge.
- `client:*` directives control hydration precisely.
- **Decision**: Astro is better for content-heavy, SEO-first apps. Do not revisit unless we need something exclusive to Next.js.

## Supabase Auth on Workers

- `supabase-js` works on Cloudflare Workers.
- OAuth flow: callback handled by the Worker → exchange code → set httpOnly cookie.
- JWT verification in the Worker with `jose` (Web Crypto API).
- No need for `next/headers` or `cookies()`.
- **Decision**: keep auth in the Worker with cookies. Do not revisit.

## Cloudflare KV Limits

- Max key: 512 bytes
- Max value: 25 MB
- Max read: 120,000 req/min (free tier)
- Good for: trending quizzes, leaderboard snapshots, search suggestions
- Bad for: user sessions (use cookies), relational data, consistent data
- **Decision**: KV replaces the Postgres cache tables. Do not revisit.

## Stripe on Workers

- The `stripe` package works with the Node.js compat flag on Workers.
- Webhook verification needs the raw body (`c.req.raw.text()` in Hono).
- Checkout sessions are created in the Worker, redirecting to the Stripe hosted page.
- **Decision**: keep Stripe in the Worker. Do not revisit.

## Alternatives Evaluated and Rejected

### D1 (Cloudflare) instead of Supabase Postgres
- Rejected: SQLite has no native full-text search, limited JSONB, no complex triggers, single-writer.
- **Status**: do not revisit unless Supabase becomes indisputably expensive.

### Remix instead of Astro
- Rejected: Remix hydrates the whole page. Astro is leaner for content.
- **Status**: do not revisit unless we need something exclusive to Remix.

### Clerk instead of Supabase Auth
- Rejected: Clerk is paid and adds another vendor. Supabase Auth is free and integrated.
- **Status**: do not revisit.

## Open Research Notes

- **OG Image Generation**: evaluate the `@vercel/og` equivalent for Cloudflare (likely `@cloudflare/pages-plugin-vercel-og`, or generating SVG → PNG with resvg-wasm).
- **AdSense Approval**: requires real content, a privacy policy, terms of use, and CLS < 0.1.
- **i18n SEO**: hreflang tags, one sitemap per locale, translated content (not just the UI).
