---
status: todo
---

# Slice 2 — The hero is the quiz: banner, title, one Play, and a byline under it

Pitch: [[quiz-page-redesign]], Solution 1 and 6 · mockup (owner's pick, 2026-10-20): the Design canvas
linked from the pitch, boards "Landing · mobile 375" and "Landing · 1024 · layout B".

## Delivers

`QuizHero.astro` rebuilt mobile-first:

- a banner, full-bleed under the floating navbar on mobile, contained and rounded (`max-w-7xl`) from
  `lg`; the cover as `object-cover` with a bottom scrim, or the brand gradient when `cover_url` is
  empty (26 of 68 curated quizzes today);
- over it, bottom-aligned: `<h1>` (never clamped), the description, one meta line
  `N perguntas · ~M min · Personalidade|Trivia` with `M = max(1, round(N × 0.3))`, and one Play
  button, full width on mobile;
- gone from the hero: the type and language chips, the like next to Play, the tag chips, the
  disclaimer, the cover card with its "jogadas / curtidas" stats, the "Criado em" and "Tipo" cards.
  The type survives in the meta line; the language in `<html lang>`; the counts were below the
  `publicCount` threshold on 652 of 750 quizzes anyway.

New `QuizByline.astro`, one row under the banner: author avatar and name linking to the profile,
`LikeButton`, `QuizReportButton`. `LikeButton` renders an icon-only button when `publicCount` hides
the count, instead of today's empty full-width bar; `QuizReportButton` becomes an icon with a label
for assistive tech. From `lg`, layout B: the byline becomes the card at the top of the right column,
with the meta as two small tiles.

The disclaimer (`BRAND_DISCLAIMER`) moves to the end of the page, above the footer; the tags stop
rendering as chips (their job is "Mais para jogar", slice 4).

Fixed on the way: the `lg:text-7xl` title running under the cover card at 1024 px. There is no card
beside the title any more; the title sits inside the banner with its own `max-w`.

## Needs

- Slice 1 merged.
- The mockup's measurements as targets: Play at 468–524 px on 375×812 (banner 548 px), 428–484 px
  on 1024×768 (banner 420 px).

## Tests

`measure-landing.js` on the five sample quizzes, both viewports:

- Play bottom ≤ 812 at 375×812, 5 of 5; Play bottom ≤ 768 at 1024×768, 5 of 5.
- `scrollWidth` = 375 at 375 px, 5 of 5 (no horizontal overflow).
- `<h1>` right edge ≤ its container's right edge at 1024 px, 5 of 5, including the Slime quiz's
  76-character title.
- The banner shows the cover on the three covered quizzes and the gradient on the two without
  (screenshot, one each).
- `check-landing-html.py http://localhost:4322`: flag 20/20, text 10/10. Question titles are still
  present until slice 3.
- `pnpm --filter web lint && pnpm --filter web typecheck` exit 0.

## Done when

The measure table in this file holds `playBottom` for 5 quizzes × 2 viewports, all under the fold,
and `overflowX: false` 5 of 5.

| quiz | 375: Play top–bottom | 1024: Play top–bottom | 375: scrollWidth | 1024: h1 overflow |
|---|---|---|---|---|

## If stuck

A long title plus a long description can push Play under 812 px on a phone. Clamp the description
to three lines (`line-clamp-3`) first; the title is never clamped and the Play button never shrinks.
If that is not enough on one quiz, report the quiz, since a 5-line title is a content problem.
