---
status: done
---

# Slice 6 — Guides that clear the bar

Pitch: [[adsense-low-value-content]]. Can run in parallel with slices 4–5. It touches content files
only, not the database.

## Delivers

- The three guides in `apps/web/src/content/guides/pt/` go past 1200 words each. On 2026-10-18 they
  measured 861, 986 and 1050 with the auditor's `analyze_text_depth.py`.
- Two or three new guides. Each is built on **examples taken from the curated quizzes themselves**,
  for instance how the scoring of one specific core quiz maps answers to outcomes. That is
  material no other site has.
- No invented statistics. With 36 rows in `quiz_results`, the site has no play data worth charting,
  and a guide that pretends otherwise is the same kind of false claim slice 1 removes.

Guide prose is pt-BR product copy, like the existing guides.

## Needs

- Slice 4 done, so the worked examples come from rewritten quizzes rather than the thin originals.
- Guides follow the same draft → owner review path as the outcomes, for the same reason.

## Tests

- `analyze_text_depth.py` over every `/guides/*` URL → each at 1200+ words. Report the numbers.
- Every new guide links at least one curated quiz, and that quiz's slug has `ads_eligible = 1` in D1.
  A guide must not point readers into the long tail.
- `sitemap.xml` lists every guide.

## Done when

```
python scripts/analyze_text_depth.py --min-words 1200 $(curl -s https://funsona.com/sitemap.xml | grep -o 'https://funsona.com/guides/[^<]*'); echo "exit=$?"
```

run from the `adsense-site-auditor` checkout prints `exit=0`.

## If stuck

If a guide only reaches 1200 by padding, merge it into another one instead. The threshold is the
auditor's heuristic, not a Google rule (no primary source gives a word count). The real bar is a
guide worth reading.

## Drafted (2026-10-22)

Owner approved the drafts in chat on 2026-10-22. Measured against the local preview
(`web-prod-api`, production API), before the deploy.

| guide | before (live, 2026-10-22) | after (local) |
|---|---|---|
| `categorias-de-quiz-mais-populares-explicadas`, retitled "Do anime ao queijo fedido", slug kept | 861 | 1473 |
| `como-criar-um-bom-quiz-de-personalidade` | 986 | 1334 |
| `como-funciona-a-pontuacao-dos-quizzes` | 1050 | 1293 |
| `as-contas-por-tras-de-um-resultado` (new) | — | 1291 |
| `testes-de-relacionamento-o-que-medem` (new) | — | 1249 |
| `personagem-rival-ou-par` (new) | — | 1382 |

Words are the auditor's `analyze_text_depth.py --min-words 1200` main-content count; it exits 0 over
all six.

**What the new guides are built on.** The RPG class quiz's weights, a full game tallied by hand, and
the exact outcome of all 1,048,576 answer paths, scored with the same code as `QuizPlay.tsx`; the two
"should I break up" quizzes, where the girlfriend one weighs control, threats and fear at 3 and
carries the safety line in all four outcomes; and how franchise quizzes map answers to characters by
likeness, by temperament contrast (Naruto rival) and by value contrast (Harry Potter rival). The only
percentages are computed from quiz design, labelled as random answering, never as player behaviour.

**Corrected in the old guides.** Ties do not go to the outcome registered first: the first outcome to
enter the tally wins. The trivia screen does not show the correct answers (`show_correct_answers` is
stored and never read). "Mais populares" had no data behind it, and the categories guide linked four
`/explore` categories that list no quiz.

**Checks.**

| check | result |
|---|---|
| `/quiz/` links in the six guides | 35 unique slugs, all among the 66 with `ads_eligible = 1` (public API), 35/35 answer 200 with no `noindex` |
| `sitemap.xml` and `/guides` | 6 guides in each |
| 5-gram Jaccard between guides | mean 0.349%, max 0.994% over 15 pairs; the shared grams are link titles |
| paragraphs opening with the same three words in two guides | 0 |

**Rendering.** `@tailwindcss/typography` is not installed, so the `prose` classes were inert and the
live guides rendered every `h2` at body size, with no paragraph spacing and unstyled links. The guide
page now uses a `.guide-body` class in `global.css`, built on the theme variables; checked at 375 px
and on desktop, dark and light.

## Done (2026-10-22)

#19 merged and deployed. The "Done when" command, run from the adsense-site-auditor checkout
against the six guide URLs in the live sitemap, ended in "nothing failed": 6 checks, all at 1200+
main-content words (1249 to 1473). The six guides link 46 quizzes and no category page.
