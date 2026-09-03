---
status: active
epic: supabase
---

# Supabase leftovers

## Problem

The migration off Supabase finished in the code and stopped at the edges. `apps/api` reads and writes
D1 (`apps/api/wrangler.toml` binds `DB` to `funsona-db`, plus two R2 buckets), auth is Clerk
(`apps/api/src/routes/webhooks/clerk.ts`, `apps/web/astro.config.mjs`), and the API's migrations live in
`apps/api/src/db/migrations/`. Nothing outside the code was updated with it.

Two places still describe the old world, and each one hurts differently.

**The written record is wrong.** `AGENTS.md:3` opens with "hosted on Cloudflare with Supabase", `:9`
lists "Database/Auth: Supabase (Postgres + Auth via API)", `:11` lists "Images: Supabase Storage".
`docs/architecture.md:31` describes "Supabase Auth with PKCE", the `FunSona_session` cookie and JWTs
verified with `jose` — none of which is how a request is authenticated today. Worse,
`docs/research.md:49-59` records two decisions that reality reversed: "D1 (Cloudflare) instead of
Supabase Postgres — Rejected" and "Clerk instead of Supabase Auth — Rejected ... do not revisit". A
document whose job is to stop someone re-doing research is now instructing them to undo the migration.
`AGENTS.md:67` tells every agent to read those files before implementing anything.

**The production gate is wrong.** `pnpm release:ready` runs `scripts/release/check-readiness.mjs`, and
three of its seven steps assert Supabase. `:105` shells out to the `supabase` CLI, which is not
installed on this machine; `run()` at `:15` throws on a non-zero status, so the gate dies before it
reaches the SEO checks. `:37-38` require `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in
`apps/web/.env.production`, which holds neither. `:56-58` require `SUPABASE_URL`, `SUPABASE_ANON_KEY`
and `SUPABASE_SERVICE_ROLE_KEY` to be named in `apps/api/wrangler.toml`, which names Clerk and Stripe
secrets instead. The gate therefore cannot pass, and the migrations it claims to verify
(`apps/api/src/db/migrations/`) are never looked at by anything.

This is not cosmetic. A release gate that always fails is a gate nobody runs, and the D1 migration
drift it was supposed to catch is currently unguarded.

## Solution

Rewrite the documentation against the stack that is on disk, and repoint the readiness script at D1,
R2 and Clerk — or delete the steps that no longer have a subject, rather than leaving a check that
verifies nothing.

Rewrite, not translate and not patch. The Portuguese half of this problem is already gone (`b837f42`
translated `AGENTS.md` and `docs/*.md` to English), so what is left is purely factual: paragraphs
whose subject no longer exists cannot be fixed by editing nouns.

## Surface

- `AGENTS.md`
- `docs/architecture.md`, `docs/product.md`, `docs/roadmap.md`, `docs/research.md`,
  `docs/production-readiness.md`
- `scripts/release/check-readiness.mjs`, and the `db:*` scripts in `package.json` that call the
  Supabase CLI

## Scope

**In**

- Every factual claim in `AGENTS.md` and `docs/*.md` about database, auth, storage and secrets.
- The three Supabase steps of the readiness script.
- `docs/research.md`'s two reversed decisions, kept as superseded history rather than deleted — the
  reason a choice was reversed is worth more than the choice.

**Out**

- The `supabase/migrations/` directory itself. It is the history of the schema the D1 migrations were
  derived from; deleting it is a separate call.
- Any change to how the app authenticates or stores data. This work follows the code, it does not
  lead it.
- The `docs/` directory layout — see `docs/pitches/docs-layout.md`.

## Open questions

- Should `pnpm db:migrate` keep the Supabase CLI, or become `wrangler d1 migrations apply`? The
  readiness script's migration step depends on the answer.
- Is `supabase/migrations/` still needed to reproduce the schema, or is
  `apps/api/src/db/migrations/0001_initial.sql` self-contained?

## Done

`pnpm release:ready` exits 0 and prints `Production readiness gates passed.`, and a `grep -ril supabase`
over `AGENTS.md` and `docs/*.md` returns only `docs/research.md`, where the name survives inside a
section marked as superseded.
