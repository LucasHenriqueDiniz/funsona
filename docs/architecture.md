# Architecture

Technical decisions and system structure. Read this file before changing the stack or adding integrations.

## Diagram

```
Browser → Cloudflare CDN → Cloudflare Pages (Astro SSR)
                                    │
                                    ▼
                           Cloudflare Worker (Hono API)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                Supabase       Cloudflare KV      Stripe
                (Postgres)      (Cache)           (Payments)
```

## Decisions

### Astro + Cloudflare Pages (Frontend)

- **Why Astro**: it emits static HTML by default. React islands (`client:load`) only where interactivity is needed. Better for SEO than Next.js or Remix.
- **Adapter**: `@astrojs/cloudflare` with `output: "server"` for SSR on the edge.
- **Images**: Supabase Storage. Uploaded straight from the browser through `supabase-js`, with basic transforms via query params (`?width=800`).
- **i18n**: native Astro i18n routing. `pt` is the default, with no prefix on the default URL.

### Hono + Cloudflare Worker (API)

- **Why Hono**: ultralight (<20kb), runs natively on Workers, familiar middleware pattern, type-safe.
- **Auth**: Supabase Auth with PKCE. The Worker owns the httpOnly cookies (`FunSona_session`). JWTs are verified with `jose` (Web Crypto API).
- **CORS**: allowed origins are resolved dynamically. Dev allows any origin. Production filters by FunSona domain.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` and `JWT_SECRET` never reach the browser. They live only in `wrangler.toml` / `.dev.vars`.

### Supabase (Database + Auth)

- **Why Supabase (and not Cloudflare D1)**: Postgres has native full-text search (`to_tsvector`), rich JSONB for quiz content, PL/pgSQL triggers for XP/streaks/leaderboard, and built-in auth. D1 is SQLite and loses all of those.
- **Connection**: only through `supabase-js` (PostgREST). Never through a direct connection string.
- **RLS**: defined in plain SQL migrations (`002_rls.sql`). The API validates ownership before writing; RLS is the last line of defence.
- **Migrations**: `supabase/migrations/001_schema.sql`, `002_rls.sql`, `003_functions.sql`, `004_indexes.sql`. Order matters.

### Cloudflare KV (Cache)

- **Use for**: trending quizzes (TTL 1h), leaderboard snapshots (TTL 15min), search suggestions.
- **Do not use for**: user sessions (use cookies), relational data (use Postgres), anything needing strong consistency.

### Supabase Storage (Images)

- **Bucket**: `quiz-images` — uploaded straight from the browser through `supabase-js` with RLS.
- **Transforms**: basic ones via query params (`?width=800`). Simple transforms are enough for the MVP.
- **Why not Cloudinary**: it removes one more vendor. Supabase Storage is already in the stack, with RLS built in.

### Stripe (Payments)

- **Checkout Sessions**: created in the Worker. Redirects to Stripe hosted checkout.
- **Webhooks**: the `/api/stripe/webhook` endpoint on the Worker. Signature verified with `stripe.webhooks.constructEvent`.
- **Premium gates**: the Worker checks `profiles.is_premium` before serving premium features.

## Conventions

- **API responses**: always `{ success: boolean, data?: T, error?: string, meta?: object }`.
- **Database tables**: snake_case. TypeScript types: camelCase (converted by `supabase-js`).
- **File naming**: React components: PascalCase. Utilities: camelCase. Constants: UPPER_SNAKE_CASE.
- **Error handling**: never expose stack traces or secrets to the client. Log in the Worker, return a generic message to the client.
