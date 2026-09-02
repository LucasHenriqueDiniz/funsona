# FunSona v2

SEO-first quiz platform, hosted on Cloudflare with Supabase.

## Stack

- **Frontend**: Astro 5 + React islands + Tailwind CSS v4 → Cloudflare Pages
- **API**: Hono + TypeScript → Cloudflare Worker
- **Database/Auth**: Supabase (Postgres + Auth via API)
- **Cache**: Cloudflare KV + Cache API
- **Images**: Supabase Storage
- **Payments**: Stripe

## Layout

```
FunSona-v2/
├── apps/
│   ├── web/         # Astro app (Cloudflare Pages)
│   └── api/         # Hono Worker (Cloudflare Worker)
├── packages/
│   └── shared/      # Zod schemas + TypeScript types
├── supabase/
│   └── migrations/  # Plain SQL (Supabase CLI)
├── scripts/
│   └── migration/   # One-off scripts
└── docs/            # Technical documentation for agents
    ├── architecture.md  # Technical decisions and diagrams
    ├── product.md       # Requirements and scope
    ├── roadmap.md       # Milestones and versions
    └── research.md      # Investigations and benchmarks
```

## Commands

```bash
# Install dependencies
pnpm install

# Dev (everything)
pnpm dev

# Dev, one app at a time
pnpm --filter web dev
pnpm --filter api dev

# Build
pnpm build

# Deploy
pnpm --filter web deploy
pnpm --filter api deploy

# Supabase
pnpm db:migrate    # push migrations
pnpm db:reset      # reset local db
```

## Implementation Rules

1. **SEO first**: public pages must be Astro Server Components or SSG. Use React islands (`client:load`, `client:visible`) only for interactivity (play, forms, modals).
2. **Never connect to Postgres directly**: use `supabase-js` (anon key in the browser, service role in the Worker). Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
3. **RLS through SQL migrations**: policies belong in `supabase/migrations/`. Never define policies in `.ts` files.
4. **Shared package**: every Zod validation and shared type belongs in `packages/shared/`. Never duplicate schemas between apps.
5. **i18n**: pt/en/es support through Astro i18n routing. `defaultLocale: "pt"`, `prefixDefaultLocale: false`.
6. **Zero fake data**: do not implement fake data seeding in production. Seeds are for local dev only.
7. **Agent References**: before implementing features, read `docs/product.md` (requirements) and `docs/architecture.md` (technical decisions). See `docs/roadmap.md` to know what belongs to the current version.

## Agent Notes

- Use `pnpm` for every command. Do not use `npm` or `yarn`.
- This is a monorepo. Use `--filter <workspace>` to target a specific app or package.
- Never edit `node_modules/`. This project does not use Next.js.
- Application cache uses Cloudflare KV, not Postgres.
- The Astro middleware (`apps/web/src/middleware.ts`) guards the `/profile/me`, `/quiz/new` and `/settings` routes by checking the session through the API.
- The auth flow uses a `FunSona_session` cookie (httpOnly, JWT). The Worker verifies the JWT with `jose`.
- **Supabase Storage**: the `quiz-images` bucket must be public. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Max file size: 5MB. RLS: INSERT for authenticated users, SELECT public.

## Environment Variables

### `apps/web/.env` (browser/public)
```bash
PUBLIC_API_URL=http://localhost:8787/api
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

### `apps/api/.dev.vars` (Worker secrets — never expose to the browser)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=generate-a-256-bit-secret-here
ENVIRONMENT=development
```

## Documentation for Agents

| File | When to read it |
|---|---|
| `docs/architecture.md` | Before changing the stack, adding an integration, or making infrastructure decisions |
| `docs/product.md` | To find out whether a feature is in scope, its functional requirements, or its success metrics |
| `docs/roadmap.md` | To find out what to implement now vs later. Do not implement features from future versions without approval. |
| `docs/research.md` | For context on decisions already made (benchmarks, alternatives evaluated) |
| `docs/production-readiness.md` | Before a production deploy: release gates, smoke tests, rollback triggers |

## House rules come from the `hexagram` plugin

**`.claude/rules/` does not exist here, and that is deliberate.** The house style is not copied
into this repo — it lives in the `hexagram` Claude Code plugin, installed once per machine, so a
clone picks up whatever version the person running it has installed rather than a snapshot frozen
at scaffold time.

These skills carry the rules, and none of them are on disk in this repo:

| skill | covers |
|---|---|
| `architecture` | the Deterministic Hexagon: where a file goes, ports, use-case wiring |
| `naming` | what to call a folder, repo, resource, state key, slug — and which renames are data migrations |
| `git` | commit-message policy, branching, submodule ordering, history rewrites |
| `language` | everything landing in the repo is English, and what counts as an exception |
| `testing` | what to test at which layer, fakes vs real infrastructure |
| `clean-code` | naming, function and file size, error handling, readability |
| `diagrams` | C4 notation, Excalidraw in an Obsidian vault, generator vs hand-owned files |
| `workflow` | pitch → research → decision → plan → implement → postmortem |
| `terraform` | stack layout, remote state, when a resource earns a module |
| `setup-machine` | machine-level toolchain setup |
| `research` | how to investigate an unknown before a decision depends on it |
| `postmortem` | recording what a finished piece of work cost to learn |
| `lint` | formatting, lint and type checks detected from the files present |

Read them through the plugin (`/hexagram:<skill>`, or let the skill trigger itself). If a returning
reader finds no local rules directory, this section is the answer: there is nothing missing.

## Commit hook

`.githooks/commit-msg` strips AI attribution trailers from commit messages. Git does not version
`.git/hooks`, so what makes the hook run is one line of local config — and a fresh clone does not
have it. The root `prepare` script sets it on `pnpm install`, and only when nothing else claims it:

```
git config --get core.hooksPath >/dev/null 2>&1 || git config core.hooksPath .githooks
```

If you already point `core.hooksPath` somewhere else, the script leaves your value alone and this
repo's hook stays inert — wire it by hand, or move the file into whatever directory you do use.
