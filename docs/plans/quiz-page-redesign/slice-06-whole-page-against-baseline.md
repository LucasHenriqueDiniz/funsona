---
status: todo
---

# Slice 6 — The whole page against the baseline, and the hand-over for the deploy

Pitch: [[quiz-page-redesign]], Testing Strategy and Success Criteria.

## Delivers

Every check from slices 0–5 rerun on one build of the branch, the before/after table filled, and
the Success Criteria in the pitch ticked with numbers. The deploy itself is the owner's
(`pnpm --filter web deploy`), as is the AdSense review request after it.

## Needs

- Slices 1–5 merged on the branch.
- `pnpm --filter web build` green: the Cloudflare adapter build, not only `astro dev`.

## Tests

| check | source | target |
|---|---|---|
| page height at 375×812, 5 quizzes | `measure-landing.js` | ≤ 6 screens each (baseline 18.3 on arma) |
| comments' screen at 375×812 | same | reported per quiz |
| Play above the fold, 5 quizzes × 2 viewports | same | 10 of 10 |
| ad slot ≥ 150 px from Play, 5 × 2 | same | 10 of 10 |
| no horizontal overflow at 375, no h1 overflow at 1024 | same | 5 of 5 each |
| intro and outcome first sentences in the HTML | `check-landing-html.py` | 10 of 10 pages |
| question titles in the HTML | same | 0 on 10 of 10 |
| flag rule, curated and non-curated, landing and play | same | 20 of 20 |
| related: curated only, never self | same | 10 of 10 |
| play ad placement, both viewports | `measure-play.js` | as slice 5 |
| `pnpm lint`, `pnpm typecheck`, `pnpm --filter web build` | — | exit 0 |

## Before / after (to fill)

| quiz | height before → after (px) | screens before → after | comments screen before → after |
|---|---|---|---|
| arma | 14,867 → | 18.3 → | 15.5 → |
| demon slayer | | | |
| slime | | | |
| harry potter inimigo | | | |
| chá | | | |

## After the deploy (owner), reported not gated

- URL Inspection on one curated quiz (`sitestats inspect`): the crawled HTML carries an outcome's
  first sentence. That is the probe the research left open for the AdSense side.
- Start rate: `/play` pageviews ÷ landing pageviews in GA4, 28 days before and after. The pitch
  reports it, it does not gate on it.
- Postmortem in `docs/postmortem/`, `kind/plan`, once the deploy is live: what the numbers were,
  what the mockup got wrong, what changed so the page cannot grow back.

## Done when

```
pnpm --filter web build && python3 scripts/quiz-page/check-landing-html.py http://localhost:4322
```

exits 0 printing `0 FAIL`, and the before/after table is full with every row at or under 6 screens.

## If stuck

A quiz still over 6 screens after the fold has too much open text, not a layout bug: say which block
and how many words, and leave it. Clamping outcome text would take back what AdSense is meant to read.
