---
status: todo
kanban: 69c0e552-7aae-4941-98af-022f32cbbf6f
---

# Slice 2 — Make pnpm release:ready run to the end

## Delivers

`pnpm release:ready` completes instead of dying on step 4 of 7, and the migration step it runs
actually inspects `apps/api/src/db/migrations/` — the migrations this project applies — rather than a
Supabase project it no longer has.

Three steps in `scripts/release/check-readiness.mjs` currently cannot pass:

- `:105` runs `supabase db push --dry-run`. The `supabase` CLI is not on this machine's PATH, and
  `run()` at `:15` throws on any non-zero status, so the gate exits 1 before reaching the SEO checks.
- `:37-38` demand `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in `apps/web/.env.production`,
  which contains neither (it has `PUBLIC_CLERK_PUBLISHABLE_KEY` instead).
- `:56-58` demand `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` be named in
  `apps/api/wrangler.toml`, which names `CLERK_*` and `STRIPE_*`.

## Needs

- The answer to the pitch's first open question: does `pnpm db:migrate` stay on the Supabase CLI or
  become `wrangler d1 migrations apply`? The migration step has to call whichever one is real.
- `docs/plans/supabase-leftovers/slice-01-rewrite-docs.md` first, or at least alongside:
  `:129` prints "verify Supabase security advisor and production smoke matrix in
  docs/architecture/production-readiness.md", and that document is being rewritten in slice 1.

## Tests

- `grep -ci supabase scripts/release/check-readiness.mjs` prints `0`.
- The env contract at `:32-51` lists the keys that are actually in `apps/web/.env.production`:
  `PUBLIC_API_URL`, `PUBLIC_SITE_URL`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `PUBLIC_GOOGLE_ANALYTICS_ID`,
  `PUBLIC_GOOGLE_ADSENSE_CLIENT`.
- The secret contract at `:53-68` lists what `apps/api/wrangler.toml` documents:
  `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`.
- Negative check — the gate still refuses a broken release: delete `PUBLIC_SITE_URL` from
  `apps/web/.env.production`, run `pnpm release:ready`, confirm it exits 1 naming that key, restore the
  file. A gate that only ever passes is the failure mode this slice is fixing, not a fix.

## Done when

```
pnpm release:ready; echo "exit=$?"
```

ends with `Production readiness gates passed.` followed by `exit=0`.

## If stuck

If the migration step cannot be pointed at a real check within the slice, delete it rather than leave
it. A step that throws and a step that passes by accident are both worth zero, and one of them is
honest about it. Record the deletion in `docs/architecture/production-readiness.md` so the gap is visible, and open
a follow-up slice for a real D1 drift check.
