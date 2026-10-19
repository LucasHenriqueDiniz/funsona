---
status: done
---

# Slice 2 — One flag decides index, ad code and listings

Pitch: [[adsense-low-value-content]] · decision: one flag, `ads_eligible` · why the loader matters:
[[2026-10-18-adsense-noindex-review/research|2026-10-18-adsense-noindex-review]].

## Delivers

`quizzes.ads_eligible` is the single switch. When it is `0`, the quiz:

- renders `noindex, follow` on `/quiz/<slug>` (`Layout.astro` already takes `noindex`; `[slug].astro:73`
  does not pass it today);
- loads **no** `adsbygoogle.js` and no `AdSlot`. The `Layout.astro` loader prop from slice 1 becomes
  **opt-in**, passed by the home, `/explore`, `/explore/<category>`, `/guides/*` and quiz pages whose
  flag is `1`;
- disappears from every public listing. All of them go through `GET /quizzes` (`routes/quizzes.ts:137` →
  `listQuizzes`, `db/client.ts:318`): home (`index.astro:35-37`), explore (`ExploreCatalog.astro:68`,
  `ExploreLoader.tsx:199`), carousel (`HeroCarousel.tsx:49`), related (`quiz/[slug].astro:30`),
  the result screen (`QuizResultScreen.tsx:44-45`), search (`search.astro:10`) and the sitemap
  (`sitemap.xml.ts:28,40`). So `listQuizzes` gains `ads_eligible = 1` in its `WHERE`;
- disappears from the seed account's public profile. `getUserCreatedQuizzes` (`db/client.ts:846`)
  has no status filter at all today, so drafts can leak too. The public call filters
  `status = 'PUBLISHED'`, and for the seed author also `ads_eligible = 1`.

Nothing changes for the 750 seed quizzes yet: their flag is still `1` from `0004_ads_eligible.sql`.
What changes on deploy is the 12 community quizzes. They gain `noindex`, lose the loader, and leave
listings, search and the sitemap. **That last part is a visible product change**: community quizzes
stop being discoverable through explore and search. It follows from the decision, and the pitch puts
community curation out of scope.

### Done on the live site (2026-10-18)

Merged as #11 (`38bb143`) at 23:25 UTC. Cloudflare Pages had the web build active within the minute,
and the Workers Build for the API finished at 23:26:34. Measured in the browser against funsona.com
right after, with D1 showing 750 flagged and 12 unflagged published quizzes:

| check | result |
|---|---|
| `/quiz/6-ano` (community) | 200, `noindex, follow`, no loader; `/play` has no loader either |
| curated quiz | no `noindex`, loader present |
| sitemap quiz URLs | **750 = 750** flagged rows in D1; none of the 12 community slugs |
| home, `/explore`, `/explore/personality`, `/explore/trivia`, `/explore?sort=plays` | 0 community slugs linked |
| search for the community quiz's title | not returned |
| loader present on `/`, `/explore`, `/guides`; absent on `/about`, `/privacy`, `/login`, `/leaderboard`, `/search` | 8 of 8 |
| `/profile/admin` | no archived quiz among its 7 quiz links |
| **total** | **23 PASS, 0 FAIL** |

The profile check on production is the weak form: the archived quizzes are older than the 6 a profile
shows, so it would pass without the filter. The strong form, which makes one the newest, ran only
against the local copy, as did the flag flip. The production flag was not flipped, because that is a
write to the live catalogue.

### Built and verified locally (2026-10-18), before the merge

Beyond what is listed above, two more listings went through the same rule:

- `GET /recommended/for-me` queries `quizzes` directly rather than through `listQuizzes`. Both of
  its queries gained `ads_eligible = 1`.
- The public profile's **played** list (`getUserPlayedQuizzes`) got the same filter as the created
  list, since it links quizzes too.

The loader prop is now opt-in. It is passed by the home, `/explore`, `/explore/<category>`, the
guides, and quiz and play pages whose flag is `1`. The dead-end pages lost their explicit
`ads={false}`, since off is the default now.

**How it was tested.** Testing this against the production API proves nothing, because the change is
in the API. So the stack ran locally on a copy of production:

- `wrangler d1 export --remote` produced an 11.6 MB dump. `wrangler d1 execute --local --file`
  rejected it (`SQLITE_TOOBIG`: some quiz `INSERT` exceeds the local statement limit), so the dump
  was loaded into miniflare's sqlite file with the `sqlite3` CLI. The copy matched production: 762
  published, 750 flagged, 117 profiles.
- The API ran with `wrangler dev --persist-to .wrangler/prod-copy` (`api-prod-copy` in
  `.claude/launch.json`). Its `.dev.vars` holds **placeholder** Clerk keys: the public routes this
  slice touches only check that the variables exist.
- The web app ran against that API (`web-local-api`).

| check | result |
|---|---|
| `scripts/adsense/check-slice-02.py` | **22 PASS, 0 FAIL** |
| flip of `verifique-sua-visao-de-cores` in the local copy: 1 → 0 → 1 | indexed, loader, sitemap, explore, profile, search: all six true, then all six false, then all six true |
| sitemap = D1 | 750 = 750 |
| `scripts/adsense/mutate-slice-02.py`: each fix reverted | **4 of 4** checks went red without their fix and green with it (listing filter, quiz noindex, opt-in loader, public profile filter) |
| `pnpm lint`, `pnpm typecheck` | pass, 0 errors |

**One check was vacuous at first.** The copy's 13 non-published quizzes are all `ARCHIVED`, and all
older than the 6 a profile shows, so "not listed on the profile" passed with no filter. The check now
makes one of them the newest for its duration. The mutation run proves it can fail.

**Not tested:** `/recommended/for-me` needs a signed-in user, and the local API has placeholder
Clerk keys. Its two `WHERE` clauses were read, not run.

`mutate-slice-01.py` reverts `ads={false}` on the login page, which this slice removed, so that
script only runs on the slice 1 tree.

## Needs

- Slice 1 merged (the loader prop exists).
- The existing admin routes `POST /quizzes/:id/approve-ads` and `/revoke-ads` (`routes/quizzes.ts:425,432`)
  are the switch used by the tests. No new route.
- `GET /quizzes/:slug` keeps returning non-curated quizzes. Direct links must keep working.

## Tests

On the deployed site and D1, both ends:

- **Community quiz** (`/quiz/6-ano`): `curl` shows `<meta name="robots" content="noindex, follow">`
  and `grep -c adsbygoogle.js` → `0`. HTTP 200.
- **Seed quiz** (`/quiz/quantas-criancas-de-cinco-anos-voce-pode-lutar-descubra-agora`): no robots
  meta, loader present.
- **Revert check.** `revoke-ads` on that seed quiz:
  - the page shows `noindex` with no loader;
  - its slug is absent from `sitemap.xml`, from `/explore/personality` and from `/search?q=<title word>`.
  `approve-ads`, then every one of those flips back. A check that passes with the flag ignored is not
  a check.
- **Sitemap = D1.** Count quiz URLs in `sitemap.xml` against
  `SELECT count(*) FROM quizzes WHERE status='PUBLISHED' AND ads_eligible=1`. Equal. Report both.
- **Profile.** `/profile/admin` lists only flag-`1` quizzes. Seed one draft on a test account in
  local dev and confirm it does not appear on that account's public profile.

## Done when

```
diff <(curl -s https://funsona.com/sitemap.xml | grep -o '/quiz/[^<]*' | sort) \
     <(wrangler d1 execute funsona-db --remote --json --command \
       "SELECT '/quiz/'||slug s FROM quizzes WHERE status='PUBLISHED' AND ads_eligible=1" \
       | jq -r '.[0].results[].s' | sort) && echo SITEMAP=D1
```

prints `SITEMAP=D1`, and the revert check above flipped both ways.

## If stuck

If filtering in `listQuizzes` breaks a caller that needs every quiz, add an explicit
`include=all` query parameter, admin-only. Do not make the default the unfiltered one. The point is
that a listing nobody thought about is curated by default.
