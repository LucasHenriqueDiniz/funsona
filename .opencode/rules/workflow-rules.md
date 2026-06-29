# Workflow Rules

## Development Flow

1. **Research**: Before any significant feature, check `docs/research/` or create a new note.
2. **Pitch**: Write a brief pitch in `docs/pitches/` describing what will be built and why.
3. **Plan**: Outline implementation steps in this chat or in `docs/architecture/`.
4. **Implement**: Write code following the stack and architecture decisions.
5. **Postmortem**: After completion, update `docs/postmortem/` with lessons learned.

## Code Organization

- **Monorepo**: Use `pnpm --filter <workspace>` for scoped commands.
- **Shared Code**: Any type, schema, or utility used by both `web` and `api` goes in `packages/shared/`.
- **No Code Duplication**: If you find yourself copying types between apps, extract to `shared`.

## Git & Commits

- Commit messages in English, imperative mood: "Add user streak table", "Fix quiz slug generation".
- One logical change per commit.
- Do not commit `.env`, `.dev.vars`, or secrets.

## Environment

- Local dev: `apps/api` runs on Wrangler dev server (port 8787), `apps/web` on Astro dev server (port 4321).
- API URL for web: set `PUBLIC_API_URL=http://localhost:8787/api` in `apps/web/.env`.
