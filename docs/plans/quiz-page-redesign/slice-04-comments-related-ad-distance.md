---
status: done
---

# Slice 4 — Comments as one line when empty, related by tag, the ad far from Play

Pitch: [[quiz-page-redesign]], Solution 4 and 5, "What must not change" (ad distance) · owner's picks
on the mockup, 2026-10-20: desktop layout B (two columns), related as compact rows.

## Delivers

- `CommentSection.tsx` renders a single row while there is nothing to read: the icon, "Comentários",
  "Seja o primeiro a comentar", and a "Comentar" control. The control opens today's form (or the
  login prompt for anonymous visitors). The full list renders by itself when the fetch returns one
  or more comments. The island stays `client:visible`: nothing about comments is in the server HTML
  today either.
- `QuizRelated.astro` calls `GET /quizzes?tag=<first tag>&limit=4`, drops the quiz itself, shows
  three. When the quiz has no tag or the call returns nothing else, it falls back to
  `GET /quizzes?limit=4&sort=plays`, drops the quiz itself, shows three. Both calls list curated
  quizzes only, as every listing does since AdSense slice 2. Rendered as compact rows (thumbnail
  92×60 or the gradient, title, `N perguntas · Personalidade|Trivia`), stacked on mobile, in the
  right column from `lg`.
- The page's second grid from `lg`: `minmax(0,1fr) 20rem`, the reading column left, the byline card
  and "Mais para jogar" right, sticky at `top-28`.
- The `quiz-landing` `AdSlot` sits between the outcomes and the comments row, at least 150 px below
  the Play button at both viewports (it lands around 1,500 px on mobile in the mockup).

**A fact the pitch did not have:** on 2026-10-20, 65 of the 68 curated quizzes carry no tags
(`GET /quizzes?limit=50`, pages 1–2). The tag path is real code, but the fallback is what ships on
almost every page until the rewrite batches add tags. That is content work for the batch sessions,
not this plan. The three tagged quizzes (`quem-voce-teria-sido-na-idade-media-quiz-interativo`,
`responde-a-estas-perguntas-e-nos-dizemos-te-qual-e-o-teu-cocktail-de-…`,
`voce-e-mais-como-um-zumbi-ou-um-vampiro-quiz-divertido`) are the test of the tag path.

## Needs

- Slice 3 merged.
- `GET /quizzes?tag=` already filters on the JSON array (`db/client.ts:331`). No API change.

## Tests

- `check-landing-html.py http://localhost:4322`: on 10 pages, every slug linked under "Mais para
  jogar" has `ads_eligible = 1` (read from the API payload, or D1) and none is the page's own slug;
  on the 3 tagged quizzes, each related quiz shares the tag.
- `measure-landing.js`, five quizzes × two viewports: `adTop − playBottom ≥ 150`, 10 of 10.
- Comments: at 375×812 with 0 comments, the comments block is ≤ 80 px tall; click "Comentar" and the
  form appears (anonymous: the login prompt). On a quiz with one comment in the local copy, the list
  renders without a click.
- `pnpm --filter web lint && pnpm --filter web typecheck` exit 0.

## Done when

```
python3 scripts/quiz-page/check-landing-html.py http://localhost:4322
```

prints `related: 10/10 curated, 0 self, tagged 3/3`, and the measure table shows `adDistanceFromPlay`
≥ 150 on 10 of 10 and the comments block ≤ 80 px on 5 of 5.

### Done 2026-10-20

Local app against the production API (`web-prod-api`). `check-landing-html.py http://localhost:4322`,
29 s: **53 PASS, 0 FAIL**: related 3 slugs on 10 of 10 pages, every one curated and none the page
itself; the three tagged quizzes 3 of 3; flag 20/20; text 10/10; question titles 0 on 10/10.

**The tag path, measured.** `GET /quizzes?tag=art|food|trivia&limit=4` on the production API returns
exactly one quiz each: the tagged quiz itself. No curated quiz shares a tag with another, so on
every one of the 67 pages the list is the fallback (most played, not self). The check now expects
siblings sharing the first tag when the listing shows any, and the fallback when it shows none;
the branch with siblings has no data to run on until the rewrite batches tag quizzes.

`measure-landing.js`, five quizzes, both viewports:

| quiz | 375: height / screens | 375: comments at screen | 375: comments box | 375: ad − Play | 1024: ad − Play | 1024: height |
|---|---|---|---|---|---|---|
| arma | 2,932 / 3.61 | 2.00 | 78 px | 1,045 | 945 | 2,074 |
| demon slayer | 2,826 / 3.48 | 1.87 | 78 px | 939 | 863 | 1,992 |
| slime | 2,826 / 3.48 | 1.87 | 78 px | 939 | 839 | 1,968 |
| harry potter inimigo | 2,932 / 3.61 | 2.00 | 78 px | 1,045 | 969 | 2,098 |
| chá | 2,826 / 3.48 | 1.87 | 78 px | 939 | 839 | 1,968 |

- Ad slot at least 150 px from Play: **10 of 10** (839–1,045 px).
- Comments block with 0 comments: 78 px on 5 of 5 (≤ 80). "Comentar" opens the full block with the
  login prompt for an anonymous visitor (checked in the browser pane). The expand-by-itself path
  needs a quiz with a comment; the production catalogue has none, so it is read, not run.
- Related rows: 290 px for three on a phone (three `QuizCard`s measured about 1,000).
- From `lg`: the byline card at x = 685 and the related list at x = 664, `position: sticky`; "Sobre"
  at x = 65; the ad 600 px wide in the left column. No horizontal overflow at either width.
- Lint exit 0, typecheck 0 errors.

## If stuck

If `?tag=` returns only the quiz itself, treat it as "nothing else" and fall back. If the sticky
right column overlaps the footer at short heights, drop `sticky` on the column and keep the layout;
sticky is a nicety, the two columns are the decision.
