---
status: done
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

## Baseline, measured 2026-10-20 on funsona.com

`measure-landing.js` in the browser pane, viewport emulated at 375×812 and 1024×768, dark theme.
Positions are document pixels. "h1 overflow" is the title text's right edge past the `<h1>` box;
"past the card" is how far that text runs past the cover card's left edge.

| quiz | 375: height / screens | 375: comments at screen | 375: Play top–bottom | 1024: Play top–bottom | 1024: h1 overflow / past the card |
|---|---|---|---|---|---|
| arma | 14,919 / 18.37 | 15.48 | 510–582 | 651–723, above the fold | +60 / +28 px |
| demon slayer | 12,829 / 15.80 | 12.91 | 510–582 | 792–864, **below** | −10 / none |
| slime | 13,036 / 16.05 | 13.16 | 545–617 | 901–973, **below** | −9 / none |
| harry potter inimigo | 14,586 / 17.96 | 15.07 | 545–617 | 863–935, **below** | −26 / none |
| chá | 13,389 / 16.49 | 13.60 | 475–547 | 651–723, above the fold | +60 / +28 px |

- The pitch's 14,867 px for the weapons quiz reproduces at 14,919 (+0.3%).
- Two things the pitch did not say: at 1024×768 Play is **below the fold on 3 of 5** today, pushed
  down by a 4–5-line title (the cover card does not push it; the title does), and the title runs
  under the cover card on the two short-titled quizzes, where one long word overflows the column
  by 60 px.
- No horizontal overflow on any of the 10 runs (`scrollWidth` 375 and 1016).
- The ad slot could not be positioned on production: the page carries no `quiz-landing` `<ins>` and
  no "Publicidade" label, only an AdSense-injected unfilled `<ins>` at 0×0. The measure snippet
  therefore reads the slot's wrapper, which exists on the local app built with `.env.production`.

`check-landing-html.py https://funsona.com`, same day, 26.5 s: **40 PASS, 10 FAIL**, the 10 FAILs
being the question-title checks (10/10 titles in the HTML on every page). Intro and outcome first
sentences present 10/10 (outcomes 6–8 per quiz); flag rule 20/20 (10 curated, 10 non-curated
confirmed through the API from the production copy's candidates); related 10/10 curated, never self.

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
