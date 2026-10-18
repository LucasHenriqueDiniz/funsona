---
status: todo
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
