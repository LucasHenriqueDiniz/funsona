---
status: todo
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
