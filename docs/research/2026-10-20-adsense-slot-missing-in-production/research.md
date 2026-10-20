---
tags: [research, area/monetization, area/infra, 2026-10-20-adsense-slot-missing-in-production]
status: active
decided: 2026-10-20
---

# Why does the production build render no AdSense slot on curated quiz pages?

> **The slot ids are in the deployed bundle, each with a leading U+FEFF.** Cloudflare Pages' build
> injects the project's variables into `process.env` with a byte-order mark in front of the value,
> Vite lets that copy win over `.env.production`, and `AdSlot` tests the id against `^\d+$`, so it
> renders nothing. The same defect that broke the Clerk key on 2026-08-20, whose fix sanitized one
> variable by name. The fix on this branch sanitizes every `PUBLIC_*` variable; the owner merges, and
> the push to `main` is the deploy.

## What was blocking

On 2026-10-20 `https://funsona.com/quiz/que-arma-voce-tem-descubra-sua-arma-interior` carried the
`adsbygoogle.js?client=ca-pub-…` loader and no `data-ad-slot`, on the landing and on `/play`. The
curated core is supposed to be the part of the site that shows ads, and the quiz landing redesign
(`claude/quiz-page-redesign-dc792a`) sizes its ad-distance rules around slots that exist. Locally,
`astro dev --mode production` renders the "Publicidade" label and the `<ins data-ad-slot>`, so the
question was which of three things was wrong: the build not loading `.env.production`, the deploy
pipeline building without it, or the values being expected from Cloudflare Pages project variables
that were never set.

None of the three. The values reach the build twice, and the wrong copy wins.

## Findings

### Measured, 2026-10-20

The deploy is Cloudflare Pages' Git integration building at the repo root (`.github/workflows/ci.yml`
says so, and the root `wrangler.toml` with `pages_build_output_dir = "./apps/web/dist"` exists for it,
commit ccb2811). The web app builds with astro 5.18.1 on vite 6.4.2.

| # | measurement | how | value |
|---|---|---|---|
| 1 | `SLOT_IDS` in the chunk production serves | `curl` of `/_astro/AdSlot.DYbUm9I1.js`, the `component-url` of the island on the live page | `{"quiz-landing":"﻿2214003867","quiz-play-interval":"﻿3283542953","quiz-result":"﻿8587840529"}`. `od -c` shows the six bytes `﻿` as a JS escape in the file |
| 2 | Client id in the same chunk | same file | `"ca-pub-2600827684802809"`, **no BOM**. It is not a Cloudflare variable; it only lives in `.env.production` |
| 3 | Clerk key in the live HTML | same page | `pk_live_…`, no BOM. The 2026-08-20 sanitizer works in production |
| 4 | BOM bytes inside `apps/web/.env.production` | `od -c … \| grep '357 273 277'` | 0 |
| 5 | Clean local build | `pnpm --filter @funsona/web build`, no slot vars in the shell | ids inlined **clean** in 6 files: `dist/_astro/AdSlot.CDlbcJB5.js` and 5 chunks under `dist/_worker.js/` |
| 6 | Local build with BOM-prefixed slot vars in the shell | `PUBLIC_ADSENSE_SLOT_QUIZ_LANDING=$'\xEF\xBB\xBF2214003867' …` ×3, then the same build | the `SLOT_IDS` line is **byte-identical to production** (measurement 1) |
| 7 | Same BOM build, plus a BOM on the Clerk key, after the fix in `astro.config.mjs` | same shell, `git diff` applied | 0 files with a BOM-prefixed id, 6 with the clean ids; 0 with a BOM Clerk key, 5 with the clean key |
| 8 | Built Worker served locally after the fix | `wrangler pages dev ./dist --compatibility-flags nodejs_compat`, `curl` of the quiz landing and `/play` | **Not run.** wrangler 3.114.17, the version pinned in `apps/web`, ships a Workers runtime whose latest compatibility date is 2025-07-18, and the built Worker fails to start under it with `ReferenceError: MessageChannel is not defined` from React's server renderer, before any request. Production runs on compatibility date 2026-05-22. The render path is the same `isConfigured` check that `astro dev --mode production` passed with these values earlier on 2026-10-20 (quiz page redesign session) |
| 9 | Vite precedence | `vite@6.4.2` `dist/node/chunks/dep-Dq2t6Dq0.js`, `loadEnv` | the loop over `.env*` files runs first; then `for (const key in process.env)` overwrites every `PUBLIC_`-prefixed key (Astro's `envPrefix`, `astro/dist/core/create-vite.js:147`) |
| 10 | Cloudflare's own build of this branch, after the fix (PR #16 preview, deployment `06db8125`) | `curl` of `/_astro/AdSlot.CDlbcJB5.js` on the preview host, the hash the clean local build produced | ids **clean**, 0 `\uFEFF`. Production has no chunk by that hash (404), as expected. The rendered page could not be checked there: every route on the preview host answers 500 with an empty body, and so do the previews of PRs #13, #14 and #15 while production answers 200, so the Preview environment is broken on its own |

Measurement 8 is the one gap: the built Worker was not served locally, so the proof for the fix is the bundle bytes (measurements 7 and 10), not a rendered page.

Measurements 5 and 6 together are the reproduction: the file loads, and a BOM-prefixed copy in the
environment is the one and only way to produce what production serves.

### From the documentation

| # | finding | source | kind |
|---|---|---|---|
| 10 | "environment variables that already exist when Vite is executed have the highest priority"; `vite build` is a production build and loads `.env.production` | `vite-6-env-and-mode.md` | primary |
| 11 | Once a Pages project uses a Wrangler file, "you can not edit the same fields in the dashboard"; `vars` is "A map of environment variables to set when deploying your Function" | `cloudflare-pages-wrangler-configuration.md` | vendor |
| 12 | Build-time variables are set under **Settings > Environment variables** of the Pages project; Cloudflare injects `CI`, `CF_PAGES`, `CF_PAGES_BRANCH` and friends into the build | `cloudflare-pages-build-configuration.md` | vendor |
| 13 | Neither Cloudflare page mentions encoding, a byte-order mark, or any sanitization. A web search for the BOM behaviour found no report of it, on Cloudflare's docs, forums, or the `workers-sdk` issues | search only, no fetch | — |

### From the repo history

- 36b73f1 (2026-07-31) added the three ids to `.env.production` and says "Verified live: the quiz
  page now emits one ins.adsbygoogle carrying data-ad-slot=2214003867". So the build read the file
  then, and nothing injected a BOM then.
- 2689abd and d895963 (2026-08-20) put `PUBLIC_CLERK_PUBLISHABLE_KEY` in the root `wrangler.toml`
  `[vars]` and found the BOM: "Cloudflare Pages' env-var injection pipeline prepends a UTF-8 BOM
  (U+FEFF) to it, and Vite keeps an already-set process.env value as-is rather than falling back to
  .env.production". The sanitizer that commit added names that one variable.
- The three slot ids are not in any `wrangler.toml`. Measurement 1 says they reach the build through
  the environment all the same, so they are defined on the Cloudflare side of the project, in its
  variables or secrets (finding 12). That is also why the client id (measurement 2), which nobody
  ever put there, is clean.

## Verdict

**The build loads `.env.production`. Cloudflare's copy of the three slot ids overrides it, and that
copy carries a BOM.** Of the three hypotheses, the closest is "values expected from Cloudflare Pages
project variables", inverted: the variables exist there, and their existence is the problem.

The fix is in the repo, on this branch, in `apps/web/astro.config.mjs`: the sanitizer that stripped
the BOM from one named variable now runs over every `PUBLIC_*` key in `process.env`, which is exactly
the set Vite inlines at build time. Measurement 7 shows it on the AdSense ids and the Clerk key at
once. `AdSlot.tsx` is untouched, and so is the `^\d+$` check: an id that is not a number should still
render nothing.

**What the owner does, one step:** merge this branch into `main`. Cloudflare Pages builds and
publishes on the push. The check afterwards is the same `curl` as measurement 1: the chunk linked
from a curated quiz page must show `"quiz-landing":"2214003867"` with no `﻿`, and the page
HTML must carry `data-ad-slot="2214003867"` under the "Publicidade" label.

Optional hygiene, in the Pages project under **Settings > Variables and secrets**, Production: the
three `PUBLIC_ADSENSE_SLOT_*` entries are redundant with `.env.production` and can go. With the fix
in place they are harmless either way, and the dashboard is the only place that shows whether they
are plain-text variables or secrets. Removing them alone would also fix the site, since the build
would then fall back to the file (measurement 5), but it leaves the next variable anyone adds there
to break the same way.

### The strongest case against

The BOM could come from somewhere other than Cloudflare's injection: the file itself, or the build
command. Measurement 4 rules out the file, and measurements 5 and 6 rule out the build command, since
the same command produces clean output with a clean environment and the production bytes with a
BOM-prefixed one. What remains undetermined is the mechanism inside Cloudflare, and the fix does not
depend on it.

## What this does not establish

- **Where exactly the three values sit on the Cloudflare side**, plain-text variable or secret, and
  since when. No dashboard access from here; the owner sees it in one glance.
- **When the regression started.** Between 2026-07-31 (verified live) and 2026-10-20. Either the three
  entries were added to the project after 07-31, or they were there and the injection started adding
  the BOM when the project switched to a Wrangler-file configuration on 08-20. The Wayback Machine was
  offline during this research, so no snapshot brackets it.
- **Whether Cloudflare documents the BOM.** No primary source found (finding 13). The two commits of
  2026-08-20 and measurements 1 and 6 are the evidence.
- **A rendered page from the fixed Worker.** The pinned wrangler cannot start it locally (measurement 8) and the Pages Preview environment answers 500 on every route, for every PR (measurement 10); the check after the production deploy covers it.
- **Whether the Preview environment carries the BOM-prefixed variables too.** Measurement 10 shows clean ids from Cloudflare's build with the fix, which is what matters, but it cannot tell a stripped BOM from a variable that was never set for Preview. The Clerk key, which `[vars]` sets for both environments, would tell, and it only shows on a rendered page.
- **Why the Preview environment answers 500.** Pre-existing and outside this note; bindings or secrets set for Production only are the usual reason.
- **The exact build command** configured in the Pages project (`pnpm build` or the web filter). Both
  run `astro build`, and the finding does not depend on which.

## Sources

- [Env Variables and Modes, Vite 6](https://v6.vite.dev/guide/env-and-mode) — `fetches/vite-6-env-and-mode.md` — existing environment variables win over `.env.production`; `vite build` loads `.env.production`
- [Configuration, Cloudflare Pages Functions Wrangler file](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) — `fetches/cloudflare-pages-wrangler-configuration.md` — the dashboard stops editing fields the file owns; silent on build-time injection and encoding
- [Build configuration, Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/) — `fetches/cloudflare-pages-build-configuration.md` — where build-time variables are set; silent on encoding
- [funsona.com `AdSlot` chunk, 2026-10-20](https://funsona.com/_astro/AdSlot.DYbUm9I1.js) — `fetches/funsona-live-adslot-chunk.md` — the BOM-prefixed ids production served, and the clean client id and Clerk key beside them

Seen in search results only, **not read** (no fetch file):

- [cloudflare/workers-sdk#7976](https://github.com/cloudflare/workers-sdk/issues/7976) and a Cloudflare Community thread on build variables for Workers Builds — about where variables are set, nothing on a BOM
