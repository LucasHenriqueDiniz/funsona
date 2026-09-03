---
status: active
epic: safety-net
---

# A safety net before the refactor

## Problem

There are no tests in this repo. `git ls-files | grep -iE '\.(test|spec)\.|__tests__|vitest|jest'`
returns nothing, no `package.json` in the workspace declares a `test` script, and
`.github/workflows/ci.yml` runs exactly two steps: Lint and Typecheck. Neither of those executes a
single line of application logic.

That is a problem on its own, and it is a blocker for the one structural change this codebase actually
needs. `apps/api/src/db/client.ts` is 886 lines with 54 exports across ten hand-drawn section
banners, and eleven files import from it — every route (`quizzes.ts`, `profiles.ts`, `comments.ts`,
`leaderboard.ts`, `moderation.ts`, `stripe.ts`, `users.ts`, `auth.ts`), two middlewares and the Clerk
webhook. It is the whole data layer in one file.

The worst of it is `insertQuizResult` (`:515-:582`): six SQL statements — the result row, the quiz
counters, the profile XP and level, the leaderboard row, the streak row, then achievements — with the
business rules wedged between them. `calculateLevel` (`:511-:513`) is already a pure function of `xp`
and nothing else. The streak rule is not: `const nextStreak = streak.last_activity_date === yesterday
? streak.current_streak + 1 : 1` (`:570`) is a pure decision that exists only as a local inside a
function that also writes to D1. There is no way to ask "what happens to a streak after a two-day
gap?" without a database.

So the write path for XP, levels, streaks and achievements — the parts of a live site that users would
notice being wrong, and that no error would report — is untested and untestable in its current shape.

## Solution

Add the runner first, then extract what is already pure, then split the file.

In that order specifically. Extracting logic out of a file nobody can test is a refactor performed
blind on a production write path; extracting it *into* a unit test is the same edit with a witness.
`calculateLevel` and the streak rule are the first two because they need no seam invented for them —
they are already pure, one of them just happens to be spelled as a local variable.

The runner is `vitest`, with `@cloudflare/vitest-pool-workers` where a test needs the Workers runtime.
Pure domain functions do not, so the first tests run on plain vitest and nothing about the Workers
pool blocks slice 1 from landing.

## Surface

- a new `apps/api/src/domain/` directory: no I/O, standard library only
- `apps/api/src/db/client.ts`
- `apps/api/package.json` (a `test` script), the root `package.json`
- `.github/workflows/ci.yml`

## Scope

**In**

- A test runner that runs in CI and fails the build.
- `calculateLevel` and the streak rule moved to `apps/api/src/domain/`, with unit tests.
- Breaking `client.ts` along its existing section banners, once there are tests covering the part that
  carries rules rather than SQL.

**Out**

- Ports and adapters. The architecture audit put this repo "far" from the hexagon; this pitch is the
  first step toward it, not the arrival.
- Changing any SQL, any schema, or any observable behaviour. A test that has to be written differently
  because the behaviour changed proves nothing about the refactor.
- End-to-end or browser tests.

## Open questions

- Does the owner accept `vitest` plus a CI step, or is the D1-backed half of the testing worth doing
  with a real `wrangler dev --local` instead?
- Should `insertQuizResult`'s six statements become one D1 batch while it is being touched? That is a
  behaviour change (atomicity), so it is out of scope here — but it is the obvious next question.

## Done

`pnpm test` runs in CI and fails when a domain rule is broken: mutating the `+ 1` in the streak rule
turns a green run red.
