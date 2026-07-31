# Supabase → Cloudflare (D1 / R2 / Clerk) cutover

`apps/api/src` no longer reads Supabase at all — the code migration landed on
2026-07-26. What has not happened is the **deploy**: `funsona-api` in production
is still the Supabase-backed build from 2026-05-24, and the remote `funsona-db`
D1 database is empty.

This directory holds the scripts for the data half of that cutover.

## Scale (measured 2026-07-31, live)

| | |
|---|---|
| Published quizzes | 769 |
| Profiles / auth users | 90 / 96 |
| Premium users | **0** |
| Admins | **0** |
| Profiles with XP > 0 | 20 (highest 250) |
| Quizzes owned by real humans | 6, across 5 users |
| Quizzes owned by the synthetic `admin` account | 763 |
| Total data | ~11 MB JSON |

Useful context: the blast radius of getting auth wrong is about a dozen users
with modest XP, not a paying customer base.

## Schema drift

The D1 schema in `apps/api/src/db/migrations/0001_initial.sql` was written ahead
of the data. Verified against the live Supabase project:

| | |
|---|---|
| `profiles.email` | absent upstream — fill with `backfill-profile-emails.mjs` |
| `quizzes.intro_content` | absent upstream → always NULL (the "Sobre este quiz" block never renders) |
| `quizzes.favorites_count` | absent upstream → 0 |
| `quiz_favorites` | table absent upstream |
| `quiz_slug_redirects` | table absent upstream — its Supabase migration was never applied |
| `content_reports` | table absent upstream |
| `quizzes.search_vector` | exists upstream, intentionally not carried over |

## Scripts

| script | what it does |
|---|---|
| `supabase-to-d1-remote.mjs` | **Use this for the cutover.** Generates FK-ordered SQL files from live Supabase, loadable into local *or* remote D1. |
| `supabase-to-d1-load-local.cjs` | Older, local-only (writes the miniflare sqlite via better-sqlite3). Superseded. |
| `backfill-profile-emails.mjs` | Fills `profiles.email` from Supabase `auth.users`. Confirmed emails only. |
| `migrate-images-to-r2.cjs` | Copies quiz/profile images to R2 and emits the URL rewrite as SQL. Works against local or remote. |
| `check-remaining.cjs`, `count-supabase-image-urls.cjs`, `verify-local-counts.cjs` | Read the *local* sqlite. Verification helpers. |

### Why the SQL-file approach works now

The old loader was local-only because `wrangler d1 execute --file` hits
SQLITE_TOOBIG on the large `quizzes.content` blobs — the biggest is 787 KB.
`supabase-to-d1-remote.mjs` inserts any oversized value as `''` and then appends
it in 20 KB pieces with `UPDATE ... SET col = col || '...'`, so no statement
gets large. Verified: the 787 KB blob round-trips byte-for-byte with valid JSON.

That means the cutover needs no Cloudflare API token beyond the wrangler auth
you already have.

## Runbook

Steps marked ⚠ are hard to reverse.

**1. Rehearse locally.** Everything below works against `--local` first; do that
and compare counts before touching `--remote`.

```bash
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
node scripts/migration/supabase-to-d1-remote.mjs --out .migration-sql
# prints the wrangler commands in FK-safe order
```

**2. ⚠ Apply the D1 schema to the remote database.**

```bash
npx wrangler d1 migrations apply funsona-db --remote --config apps/api/wrangler.toml
```

No down migrations exist. The raw `.sql` files are not idempotent (`CREATE TABLE`
without `IF NOT EXISTS`, unguarded achievement seeds) — always go through
`migrations apply`, never `d1 execute --file`.

**3. ⚠ Load the data,** in the order the generator prints (profiles → quizzes →
tags → …). Statements are `INSERT OR REPLACE`, so a re-run is safe.

**4. Backfill emails.** Required before anyone signs in — without it, migration
`0003`'s claim-by-email path has nothing to match and returning users get empty
profiles.

```bash
node scripts/migration/backfill-profile-emails.mjs > .migration-sql/900-emails.sql
npx wrangler d1 execute funsona-db --remote --config apps/api/wrangler.toml --file .migration-sql/900-emails.sql
```

**5. Verify** row counts per table, and specifically that
`user_achievements.achievement_id` values match the `ach_*` ids seeded by 0001 —
upstream they are Supabase UUIDs and will not join. (Currently 0 rows, so this is
free today.)

**6. Set the API secrets** — only these five are read by the code:

```
CLERK_PUBLISHABLE_KEY  CLERK_SECRET_KEY  CLERK_WEBHOOK_SECRET
STRIPE_SECRET_KEY      STRIPE_WEBHOOK_SECRET
```

`JWT_SECRET` and every `SUPABASE_*` are dead — `SUPABASE` appears nowhere in
`apps/api/src`. Do not carry them over.

**7. ⚠ Deploy the API,** then the web app. Web needs `CLERK_SECRET_KEY` as a
Pages secret and a real `PUBLIC_CLERK_PUBLISHABLE_KEY` — `apps/web/.env.production`
still has the literal placeholder `pk_live_REPLACE_ME`.

**8. Smoke test:** sign up (webhook creates a profile), sign in as an existing
user (should claim their legacy row — check XP and quiz ownership survive),
play a quiz, load an image, Stripe checkout.

**9. Grant someone admin.** There are currently zero admins, so `/moderation`
is unreachable by anyone after cutover.

**10. ⚠ Only after 8 passes:** retire the Supabase project. It is the only
remaining copy of the pre-migration data.

## Known gaps

- **Images.** Remote R2 is still empty — the blobs exist only under
  `apps/api/.wrangler/state/v3/r2/`. Loading from Supabase (as this runbook
  does) keeps the original `supabase.co` image URLs, which keep working while
  the Supabase project is alive, so images do not block the cutover — but they
  are the reason not to do step 10 yet.

  To move them, after step 3:

  ```bash
  node scripts/migration/migrate-images-to-r2.cjs --remote --out rewrite-urls.sql
  npx wrangler d1 execute funsona-db --remote --config apps/api/wrangler.toml --file rewrite-urls.sql
  ```

  1,309 distinct objects are referenced. Add `--dry-run` to check which ones
  still resolve upstream before uploading anything.
- **`scripts/release/check-readiness.mjs` is stale** — it still requires
  `PUBLIC_SUPABASE_*`, expects Supabase secret names in `wrangler.toml`, and runs
  `supabase db push --dry-run`. It cannot pass against the migrated repo.
- **`docs/research.md` still lists Clerk as rejected**, contradicting the last
  three commits.
- **Two `wrangler.toml` files** define the Pages project with different
  `pages_build_output_dir`, and `apps/web/wrangler.toml` reuses the API's KV
  namespace id for its `SESSION` binding (nothing reads it).
