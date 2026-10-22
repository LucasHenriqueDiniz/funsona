---
status: done
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

## Before / after, 2026-10-20

Before: funsona.com on 2026-10-20 (slice 0). After: the branch at slice 5, local app against the
production API (`web-prod-api`), browser pane, viewport emulated at 375×812.

| quiz | height before → after (px) | screens before → after | comments screen before → after |
|---|---|---|---|
| arma | 14,919 → **2,932** | 18.37 → **3.61** | 15.48 → **2.00** |
| demon slayer | 12,829 → **2,826** | 15.80 → **3.48** | 12.91 → **1.87** |
| slime | 13,036 → **2,826** | 16.05 → **3.48** | 13.16 → **1.87** |
| harry potter inimigo | 14,586 → **2,932** | 17.96 → **3.61** | 15.07 → **2.00** |
| chá | 13,389 → **2,826** | 16.49 → **3.48** | 13.60 → **1.87** |

Every row at a fifth of its baseline, under the 6-screen target on 5 of 5.

### The checks, rerun on the final tree

| check | result |
|---|---|
| Play above the fold, 375×812 | 5 of 5, bottom at 520 px |
| Play above the fold, 1024×768 | 5 of 5, bottom at 481 px (was 3 of 5 below the fold) |
| ad slot ≥ 150 px from Play | 10 of 10: 939–1,045 px at 375, 839–969 px at 1024 |
| horizontal overflow at 375 / title overflow at 1024 | none, 5 of 5 each (title text overflow −2 to −105 px) |
| `check-landing-html.py http://localhost:4322` | **53 PASS, 0 FAIL**, 25 s |
| → intro and outcome first sentences in the HTML | 10 of 10 pages |
| → question titles in the HTML | 0 on 10 of 10 |
| → flag rule, 10 curated + 10 non-curated, landing and play | 20 of 20 |
| → related: curated, never self; tagged quizzes | 10 of 10; 3 of 3 (fallback, no sibling shares a tag) |
| play ad, 375 | top 1,040 px, under the last answer (938) and the controls (1,020), 0 sticky ancestors |
| play ad, 1024 | 300 px wide, inside the only sticky element holding an ad |
| `pnpm lint`, `pnpm typecheck` (root) | exit 0, 0 errors |
| `pnpm --filter @funsona/web build` | `[build] Complete!`, exit 0 |

Not run: the expand-by-itself path of the comment section (no quiz in the production catalogue has
a comment) and the tag path with siblings (no two curated quizzes share a tag). Both are read, not
measured.

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
