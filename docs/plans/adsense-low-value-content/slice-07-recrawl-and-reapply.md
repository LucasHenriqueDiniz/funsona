---
status: todo
---

# Slice 7 — Let Google see the smaller site, then ask again

Pitch: [[adsense-low-value-content]] · lag figures:
[[2026-10-18-adsense-noindex-review/research|2026-10-18-adsense-noindex-review]] (findings 8 and 10).

## Delivers

A review request sent on evidence that Google has already seen the new site, not on the day of the
last deploy. And a recorded outcome either way.

## Needs

- Slices 1–6 done.
- **Wait.** At least two weeks after slice 5's last batch. Google gives "up to 1 or 2 weeks" for the
  AdSense crawler index, and Search coverage moves no faster. Both documented figures are minimums,
  not promises.
- **Pre-flight, all measured on the day:**
  - Search Console shows indexed quiz pages trending towards the core size, and "Excluded by
    noindex" rising. The owner reads it, since coverage has no API.
  - The full `adsense-site-auditor` run (pre-flight gate, plus all 81 IDs) against the live site, with
    no Blocker left.
  - **Overlap.** For 10 core quizzes, compare their text against the top search results for their
    own titles, with `adsense_checks.duplicates.compare_against`. This closes `ADS-CONTENT-OVERLAP`,
    which no slice has measured so far. Over 60% on any of them sends that quiz out of the core.
  - **Owner-only questions** from the audit, answered: Auto ads on or off, `quizhub.com.br` serving
    the same catalogue or not, child-directed content.
- **The owner clicks Request review.** Sites → funsona.com → confirm code → Next → Request review.
  This is an account action and a form submission, so the agent does not do it.

## Tests

- The auditor report saved next to this slice, with the date, the three decidability counts, and 0
  Blockers.
- The overlap numbers for the 10 sampled quizzes, each under 60%.
- The request date recorded here.

## Done when

The AdSense Sites page shows funsona.com as **Ready**. The owner pastes the status line, as on
2026-10-18, and the date goes here.

## If stuck

**Rejected again on the smaller site.** Take the fallback the research held back: the non-core quizzes
answer **410**, so a reviewer working from Google's history meets no thin page at all. On 2026-10-18,
54 URLs held 80% of quiz clicks and the core contains them, so the measured cost is small. Then write
the postmortem (`hexagram:postmortem`) for this round before trying a third. Each review cycle costs
2–4 weeks, and a third attempt on an unexamined hypothesis spends another one.
