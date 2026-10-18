---
status: todo
---

# Slice 5 — The rest of the core, in batches

Pitch: [[adsense-low-value-content]].

## Delivers

Every quiz with `ads_eligible = 1` meets the slice 4 bar, through the same draft → review → apply
path, in batches of 10. Each batch is a deploy of its own. The slice is done when the report covers
the whole core.

A quiz the owner decides is not worth rewriting leaves the core instead: `ads_eligible = 0`, and a
reason line in `core.csv`. The core shrinks rather than carrying a thin quiz into the review.

## Needs

- Slice 4's scripts working and gated.
- The owner's review time, which sets the pace. There is no point drafting batches faster than they
  are reviewed.

## Tests

- After each batch, the slice 4 report over the batch: 100% / 100% / 100% / N of N rendered.
- At the end, the same report over the whole core (`ads_eligible = 1`). No quiz under the bar.
- Sitemap = D1 still holds (the slice 2 `diff`), since quizzes may have left the core.

## Done when

```
node scripts/adsense-core/report.mjs --where "ads_eligible = 1"
```

prints `outcomes>=150w 100%  intro 100%  changed 100%  rendered N/N` with N equal to the D1 count of
`ads_eligible = 1`.

## If stuck

If review time runs out, stop adding batches and take the rest out of the core. A smaller site where
every page clears the bar is the bet of the whole pitch, and applying with half-rewritten quizzes
reverses it.
