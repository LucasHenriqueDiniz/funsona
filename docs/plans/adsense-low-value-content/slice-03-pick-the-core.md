---
status: todo
---

# Slice 3 — Pick the core and turn the rest off

Pitch: [[adsense-low-value-content]] · decisions: clicks first, sensitive quizzes outside the core.

## Delivers

`ads_eligible = 1` on the curated core only. Every other seed quiz drops to `0`, and with slice 2
deployed that one `UPDATE` takes ~650 pages out of the sitemap, the listings, the ad code and the
index in one move. Google starts re-crawling the smaller site from here, which is why this slice
ships **before** the core is rewritten: the recrawl clock is the longest wait in the plan.

The core list itself is committed as data the decision can be audited against:
`scripts/adsense-core/core.csv` (slug, clicks, impressions, reason kept/dropped).

## Needs

- Slice 2 deployed. Without it the `UPDATE` changes ads only, not the index.
- **Candidates.** Quiz URLs with at least one click in the last 90 days, from
  `~/.claude/skills/site-stats/bin/sitestats gsc funsona --dim page --days 90 --limit 1000 --json`.
  `www.` and apex rows merge by slug. On 2026-10-18 this gave 82 URLs; recount on the day.
- **Removed from candidates**, each with its reason in `core.csv`:
  - the three sensitive quizzes (`qual-personagem-yaoi-voce-e-…`,
    `quantas-pessoas-querem-que-voce-morra-…`, `descubra-quao-atraente-voce-e`);
  - the 13 `paraphrased` duplicates in `scripts/duplicate-quizzes.md`;
  - any quiz with an unresolved `%GIPHY` placeholder or a broken image in
    `scripts/quiz-audit-2026-08-20/quiz-audit.csv`, unless the image is fixed in this slice;
  - slugs that no longer resolve (GSC keeps old URLs; 9 such rows on 2026-10-18).
- **Backup first, two ways:**
  - `wrangler d1 export funsona-db --remote --table quizzes --output <dated file outside the repo>`;
  - the D1 Time Travel bookmark for "now", from `wrangler d1 time-travel info funsona-db`, recorded
    in this slice.
  Both commands exist in the wrangler 3.114.17 installed here. The 2026-06-30 rewrite overwrote the
  originals with no copy kept; this plan does not repeat that.

## Tests

- **Before and after.** D1 `SELECT ads_eligible, count(*) FROM quizzes WHERE status='PUBLISHED' GROUP BY 1`,
  before and after the `UPDATE`. After: the `1` count equals the rows marked kept in `core.csv`.
- **Sitemap = D1.** The slice 2 `diff` prints `SITEMAP=D1`.
- **Traffic kept.** The 90-day Search clicks of the kept slugs, divided by all quiz clicks in the same
  window. Report the share. By construction it should be well above 80%; if it is not, the exclusions
  cut deeper than expected, and that is worth seeing before the rewrite.
- **Exclusions held.** None of the three sensitive slugs, the 13 duplicates or the placeholder quizzes
  has `ads_eligible = 1`. 0 rows.
- **A dropped quiz still plays.** `curl` a dropped slug → 200, `noindex`, no loader.
- **Restore is real.** The export file loads into a local D1 (`wrangler d1 execute --local --file`),
  and the local `quizzes` row count equals production's.

## Done when

```
wrangler d1 execute funsona-db --remote --command \
  "SELECT ads_eligible, count(*) n FROM quizzes WHERE status='PUBLISHED' GROUP BY ads_eligible"
```

shows the `1` row equal to the kept count in `core.csv`, and the slice 2 sitemap `diff` prints
`SITEMAP=D1`.

## If stuck

- **The core comes out tiny** (say under 40 after exclusions): add the next quizzes by impressions
  (they rank but are not clicked yet), not by plays. Record the cut-off in `core.csv`.
- **Owner submits the sitemap.** Re-submitting it in Search Console is an account action. The owner
  does it after the deploy; the slice only records the date.
