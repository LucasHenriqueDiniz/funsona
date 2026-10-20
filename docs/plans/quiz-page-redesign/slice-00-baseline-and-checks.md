---
status: todo
---

# Slice 0 — Measure today's page, and write the checks the redesign has to pass

Pitch: [[quiz-page-redesign]] · research: [[2026-10-20-folded-content-indexing/research|2026-10-20-folded-content-indexing]].

## Delivers

Three scripts under `scripts/quiz-page/`, and the baseline numbers for the five quizzes every later
slice is measured on.

- `measure-landing.js` — a snippet run in the page's own JavaScript context (devtools console, or the
  browser pane). Prints one JSON object: page height and the same in screens of the current viewport,
  the Play button's top and bottom, the top of the comments block and its screen, the top of the
  `quiz-landing` ad slot and its distance from Play, the `<h1>`'s right edge against its container,
  and `scrollWidth` against the viewport. One run per quiz per viewport.
- `measure-play.js` — the same for `/quiz/<slug>/play`: the last answer button's bottom, the
  Anterior/Próxima row's bottom, the ad slot's top and width, and how many sticky ancestors hold an
  `.adsbygoogle`.
- `check-landing-html.py <base-url>` — `curl` + `grep`, no browser. Picks the 10 curated quizzes
  with `intro_content` from `GET /quizzes?limit=50` (the API lists curated quizzes only), and for each
  landing page checks: the first sentence of `intro_content.context` and of every outcome is in the
  HTML; the number of question titles from `content.questions` found in the HTML; no `noindex` and
  the `adsbygoogle.js` loader present; every `/quiz/<slug>` linked under "Mais para jogar" is
  curated and is not the page itself. Then 10 published, non-curated slugs: `noindex` present and no
  loader, on the landing and on `/play`. Prints `PASS`/`FAIL` per check and a total, exit 1 on any
  FAIL, like `scripts/adsense/check-slice-02.py`.

Non-curated slugs come from a read-only query, never from a write:
`wrangler d1 execute funsona-db --remote --json --command "SELECT slug FROM quizzes WHERE status='PUBLISHED' AND ads_eligible=0"`,
or from the production copy in `apps/api/.wrangler/prod-copy` when it is present.

## The five sample quizzes

All curated, all rewritten (they carry `intro_content`), mixed covers and outcome counts:

| slug | cover | outcomes |
|---|---|---|
| `que-arma-voce-tem-descubra-sua-arma-interior` | none | 8 |
| `que-personagem-do-demon-slayer-e-descubra-com-este-questionario` | yes | 6 |
| `o-que-e-o-personagem-aquela-vez-em-que-me-reencarnei-como-um-lodo` | yes, long title | 6 |
| `qual-personagem-de-harry-potter-e-o-seu-arqui-inimigo` | yes | 8 |
| `que-tipo-de-cha-voce-e-descubra-com-nosso-quiz-divertido` | none | — |

## Needs

- Nothing in the code. This slice touches `scripts/` and this file only.
- A browser that can emulate 375×812 and 1024×768 (the browser pane, or Chrome's device mode).

## Tests

- `check-landing-html.py https://funsona.com` on today's page: text present 10/10, flag rule 20/20,
  **question titles > 0 on 10/10** (today prints them, so this check is red: that is the proof it
  sees them), related: linked slugs curated 10/10.
- The baseline table below, filled from `measure-landing.js` on the live site. The pitch's figure
  for the weapons quiz (14,867 px, 18.3 screens, comments at screen 15.5) must reproduce within 2%.

## Baseline (to fill)

| quiz | 375: height / screens | 375: comments at screen | 375: Play top | 1024: Play top | 1024: h1 under the cover card |
|---|---|---|---|---|---|
| arma | | | | | |
| demon slayer | | | | | |
| slime | | | | | |
| harry potter inimigo | | | | | |
| chá | | | | | |

## Done when

```
python3 scripts/quiz-page/check-landing-html.py https://funsona.com
```

prints its totals with the question-title check as the only FAIL, and the table above has all five
rows at both viewports.

## If stuck

If the browser pane cannot hold a 375 px viewport, Chrome's device toolbar can; paste the JSON the
snippet prints. If `wrangler d1 execute --remote` asks for a login the session does not have, the
local production copy's sqlite answers the same `SELECT`.
