---
status: active
epic: naming
---

# Names that outlive the rename

> **The npm half is done, 2026-09-03.** The owner answered the first open question below with a yes,
> overruling `771ca18` himself. `package.json` is `funsona` and the scope is `@funsona/*` — see
> `docs/plans/naming/slice-01-workspace-scope.md`. The Cloudflare half is untouched and still needs
> the other two answers.
>
> The boundary sweep that decision required found four kinds of `FunSona` that were deliberately
> **not** renamed, because each is data rather than a folder name:
>
> - **The brand, as the reader sees it.** 138 lines across 47 files in `apps/web` and `apps/api`:
>   page titles, meta descriptions, the footer, `alt` text, the three translated guide sets,
>   `site.webmanifest`, `og-default.svg`, and the Stripe product name `"FunSona Premium"`. A regex over
>   the repo would have rewritten the product for its users. Renaming this is a rebrand, and nobody
>   asked for one.
> - **The `FunSona_session` cookie.** A live session key. Renaming it signs every current session out.
>   It survives only in prose now (`AGENTS.md`, `docs/architecture.md`, `.opencode/rules/`) because
>   auth moved to Clerk, and correcting that prose is `docs/pitches/supabase-leftovers.md`, not this.
> - **The Cloudflare resource names** — `funsona-web`, `funsona-api`, `funsona-api-dev`, `funsona-db`,
>   `funsona-quiz-images`, `funsona-profile-media`, and the `FUNSONA_CACHE` KV binding. Already
>   lowercase kebab-case, so the scope rename had nothing to do to them, and the environment-suffix
>   complaint below is the migration this pitch splits off.
> - **The public hostname**, including inside `PUBLIC_CLERK_PUBLISHABLE_KEY`, whose value base64-encodes
>   `clerk.funsona.com`. User-facing, and a documented exception in the naming skill.

## Problem

Two naming violations sit in this repo, and they look alike but cost completely different amounts to
fix. Confusing them is how a "quick rename" becomes an outage.

**The npm names are a text edit.** `package.json:2` is `"name": "FunSona-v2"` — a capitalised name
carrying a version, where the directory on disk is `funsona`, lowercase. The workspace scope is
`@FunSona/*`: `apps/api/package.json:2`, `apps/web/package.json:2`,
`packages/shared/package.json:2`, `scripts/migration/package.json:2`,
`scripts/quiz-review/package.json:2`. npm rejects an uppercase scope for publication, and the naming
skill asks for a kebab-case slug with no version in it. Nothing outside the repo knows these names:
every package is `"private": true`, and the only consumers are `pnpm --filter` invocations inside this
same tree (`package.json:8`).

Against that: the scope was not an accident. `771ca18` ("Bring the scripts packages into the
workspace, and give them the house scope", 2026-08-30) deliberately extended `@FunSona/*` to the two
scripts packages, days ago. Overruling a fresh, intentional choice is the owner's call, not a lint fix.

**The Cloudflare names are a data migration.** `apps/api/wrangler.toml` declares `name = "funsona-api"`,
`database_name = "funsona-db"`, `bucket_name = "funsona-quiz-images"` and
`bucket_name = "funsona-profile-media"` — no owner prefix, no environment suffix — while `[vars]`
right below sets `ENVIRONMENT = "production"`. The naming skill's point is that on a provider without
tags the name is the only metadata there is, so the environment has to be in it. But an R2 bucket and
a D1 database cannot be renamed: fixing this means creating the new resources, copying every object
and row, repointing the bindings, and cutting over a live site. The same file also carries an
`[env.dev]` block whose only override is `name = "funsona-api-dev"`, so the convention is half-present
already.

## Solution

Split them, and treat the second as a migration with a rollback rather than as a rename.

The npm rename is one commit: edit six `name` fields, edit the filters that reference them, reinstall,
typecheck. The Cloudflare rename is a sequenced cutover that needs a Cloudflare login and a maintenance
window, and it is worth doing only if the owner intends more than one environment.

## Surface

- `package.json` and the five workspace `package.json` files
- `apps/api/wrangler.toml`, `wrangler.toml`, and the CI workflow if it names a resource
- Cloudflare: the D1 database, both R2 buckets, the Worker

## Scope

**In**

- The root package name and the `@FunSona/*` scope, if the owner agrees to overrule `771ca18`.
- A written target convention for Cloudflare resource names, and the cutover order to reach it.

**Out**

- The KV namespace id and any other resource addressed by id rather than name — an id has no
  convention to violate.
- Renaming the repository or the Cloudflare Pages project.

## Open questions

- ~~Does the owner want the scope changed at all? `771ca18` says the current one was chosen on
  purpose.~~ **Answered 2026-09-03: yes.** Done.
- Will there ever be a staging environment? If production is the only environment forever, an `-prod`
  suffix buys nothing and the R2 cutover is not worth its risk.
- What is the owner prefix — the GitHub account (`lucashdo`) or the product?

## Done

For the npm half — **met 2026-09-03**: `git grep -l '@FunSona/' -- ':(exclude)docs'` returns nothing
(the pathspec is required, because this file quotes the old literal on purpose) and
`pnpm install --frozen-lockfile` succeeds. For the Cloudflare half: `wrangler d1 list` and `wrangler r2 bucket list` show only names
matching the agreed pattern, and the site still serves quiz images.
