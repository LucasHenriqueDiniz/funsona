# Architecture Rules

## Stack

- **Frontend**: Astro 5 (SSG/SSR) + React islands + Tailwind CSS v4
- **API**: Hono + TypeScript on Cloudflare Workers
- **Database**: Supabase (Postgres + Auth via API)
- **Cache**: Cloudflare KV
- **Images**: Cloudinary
- **Payments**: Stripe

## Principles

1. **Edge-First**: All compute runs on Cloudflare edge. No Node.js-specific APIs.
2. **API-Only Database Access**: The web app never touches Postgres directly. It calls the Hono API, which uses `supabase-js` service role.
3. **SEO First**: Public pages must render real HTML with metadata. No client-side routing for content pages.
4. **Type Safety**: All API inputs/outputs validated with Zod. Types shared via `packages/shared`.
5. ** Stateless**: Workers are stateless. Session stored in httpOnly cookies. Auth state verified per request.

## Directory Conventions

```
apps/web/src/
  pages/         # Astro routes (SSG/SSR)
  layouts/       # Astro layouts
  components/    # React islands (client:load, client:visible)
  lib/           # Utilities (api client, supabase browser client)

apps/api/src/
  routes/        # Hono route handlers
  middleware/    # Auth, cache, CORS
  lib/           # Supabase service client, Stripe client

packages/shared/src/
  schemas.ts     # Zod schemas
  types.ts       # TypeScript types (if not inferred from schemas)
```

## API Design

- RESTful routes under `/api/<resource>`.
- JSON responses wrapped in `{ success: boolean, data?: T, error?: string, meta?: object }`.
- Auth via `FunSona_session` httpOnly cookie containing JWT.
- RLS policies in Supabase are the last line of defense; the API validates ownership before calling Supabase.

## Performance

- Use Cloudflare KV for semi-static data (trending quizzes, leaderboard).
- Use `Cache-Control` headers on API responses where appropriate.
- Astro images: use Cloudinary URLs directly; do not use Astro image optimization (noop service).
