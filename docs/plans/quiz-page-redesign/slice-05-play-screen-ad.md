---
status: done
---

# Slice 5 — The play-screen ad: sticky sidebar of 300 px on desktop, inline under the answers on mobile

Pitch: [[quiz-page-redesign]], In Scope, last item · research finding 8 (sticky ads on desktop only,
at most 300 px wide, one in view) · owner's pick on the mockup, 2026-10-20: on mobile the unit goes
**below the Anterior/Próxima row**, not between the answers and the buttons.

## Delivers

`QuizPlay.tsx` only. `play.astro`, `QuizResultScreen.tsx` and the `quiz-play-interval` unit id are
untouched; the `quiz.ads_eligible` guard stays.

Today the sidebar (`lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1`) holds the progress bar, the
title card and the `AdSlot`, and it comes first in the DOM, so on a phone the ad sits between the
progress bar and the question. After this slice:

- the `AdSlot` is its own grid item, rendered **once**, placed after the question section in the
  DOM: on mobile it is the last block, under the Anterior/Próxima row, not sticky;
- from `lg` it goes to `col-start-2 row-start-2`, in a `max-w-[300px] mx-auto` box with
  `lg:sticky` and a `top` that clears the sidebar's height, so the sidebar holds no ad and the ad is
  the only sticky element that does. One push, one `<ins>`, never a hidden duplicate: AdSense counts
  a hidden unit as a request with no size.

## Needs

- Nothing from slices 1–4; this one is independent and can run in parallel with them.
- `measure-play.js` from slice 0.

## Tests

- `measure-play.js` on the weapons quiz:
  - 375×812: `adTop > lastAnswerBottom` and `adTop > navRowBottom`; no ancestor of the `.adsbygoogle`
    is `position: sticky` or `fixed`.
  - 1024×768: the ad's width ≤ 300; exactly one sticky ancestor chain holds an `.adsbygoogle`;
    the progress bar and title card are still in view at the top after scrolling.
- `/quiz/<non-curated>/play`: `curl` shows no `adsbygoogle.js` and no `<ins class="adsbygoogle"`.
- The question flow still works at both widths: answer, Próxima, Anterior, last question → Ver
  resultado (browser pane, once).
- `pnpm --filter web lint && pnpm --filter web typecheck` exit 0.

## Done when

`measure-play.js` prints `mobileAdBelowAnswers: true`, `mobileStickyAdAncestors: 0`,
`desktopAdWidth: ≤300`, `desktopStickyAdCount: 1` on the weapons quiz, recorded here with the raw
numbers.

### Done 2026-10-20

The plan's first cut (ad as its own grid item under a sticky sidebar) does not work: with the
question section spanning two rows, CSS grid splits the span's height across both rows, so the ad's
cell starts halfway down the page, and a sidebar tall enough to hold the clamped title card leaves
no room above the fold for a unit pinned under it. What shipped instead: DOM order progress →
question → answers → controls → aside; the progress bar pins alone at `top-28`, the aside (title
card plus the ad, `lg:max-w-[300px]`) pins under it at `14.25rem`, the section spans both rows with
`grid-rows-[auto_1fr]` so the aside's cell starts right under the progress bar. One `AdSlot`, one
`<ins>`.

`measure-play.js` on `/quiz/que-arma-voce-tem-descubra-sua-arma-interior/play`, local app against
the production API:

| | 375×812 | 1024×768 |
|---|---|---|
| answers found | 4 | 4 |
| last answer bottom | 938 px | 1,149 px |
| Anterior/Próxima row bottom | 1,020 px | 1,231 px |
| ad slot top | **1,040 px** (below both) | 547 px, natural; pins at 228 px |
| ad slot width | 343 px (full width) | **300 px** |
| sticky ancestors of the ad | **0** | **1** (the aside) |
| sticky elements holding an ad | 0 | **1** of 2 sticky elements (the progress box holds none) |
| horizontal overflow | none (375) | none (1,016) |

- `/quiz/6-ano/play` (not curated): `grep -c adsbygoogle` → 0, no `<ins>`. The curated play page
  carries the loader, one `data-ad-slot`, one "Publicidade" label.
- Flow at 1024: selecting answer A enables Próxima; Próxima shows "Pergunta 2 de 10" with Anterior
  enabled and the ad still in place (driven from the page's own JavaScript, since the pane's
  coordinate click landed on the question card).
- Lint exit 0, typecheck 0 errors.

## If stuck

If the grid placement fights the sidebar's `lg:row-start-1`, give up the desktop sticky unit rather
than render the slot twice: one `AdSlot` after the nav row at every width, no sticky. One honest
placement beats a sticky one that double-pushes.
