---
status: todo
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

## If stuck

If `?tag=` returns only the quiz itself, treat it as "nothing else" and fall back. If the sticky
right column overlaps the footer at short heights, drop `sticky` on the column and keep the layout;
sticky is a nicety, the two columns are the decision.
