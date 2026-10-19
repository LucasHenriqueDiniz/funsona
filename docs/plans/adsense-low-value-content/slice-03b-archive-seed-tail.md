---
status: done
---

# Slice 3b — Archive the seed tail

Pitch: [[adsense-low-value-content]] · why: [[2026-10-18-catalogue-origin/research|2026-10-18-catalogue-origin]].

Not in the original plan. Slice 4 opened with a check of the core's content shape, and that check
found the outcome images served from `quizpanda.com`. The research note above has the measurements.

## Delivers

Every seed quiz outside the curated core is `ARCHIVED`. It no longer resolves by slug, and its page
answers through `/404`. Published quizzes after this slice: the 70 in the core plus the 12 community
quizzes.

## Decision

The owner was asked twice:

1. **First:** "archive the 288 non-core quizzes with quizpanda images". That number was wrong, because
   it missed covers.
2. **Then, with the corrected numbers** (629 with quizpanda images, 51 without): "archive all 680
   outside the core". The 51 came out of the same pipeline in the same 16 days.

## Done (2026-10-18 / 19)

**Backup, before the write:**
- `wrangler d1 export --remote --table quizzes` at 2026-10-19 00:50 UTC;
- restored into a scratch sqlite and counted: 775 rows, 762 published, 70 flagged, matching
  production;
- D1 Time Travel bookmark before the write: `0000663e-00000000-00005109-c4cb77f0cf8ba0b202521e3c4f9c0fe9`.

**The script.** `scripts/adsense-core/pick_seed_tail.py` lists the tail in `seed-tail.csv`, with
each quiz's quizpanda image count, and generates `archive-seed-tail.sql`.

**Dry run** on the restored backup: ARCHIVED seed 693 · PUBLISHED community 12 · PUBLISHED seed 70.

**The write.** `wrangler d1 execute --remote --file archive-seed-tail.sql` reported `changes: 681`
and `rows_written: 1360`. The final counts match the dry run exactly, so the extra change is not an
extra quiz.

| check, right after | result |
|---|---|
| D1 by status, flag and author | ARCHIVED seed 693 (680 + the 13 archived before) · PUBLISHED community 12 · PUBLISHED seed flag=1 70 |
| four archived slugs on funsona.com, the three sensitive quizzes among them | 404 at `/404` |
| a core quiz, a community quiz | 200, 200 |
| `sitemap.xml` quiz URLs | 70 |

**Behaviour to know.** The 13 quizzes archived earlier by the duplicate cleanup still 301 to their
base quiz through `quiz_slug_redirects`. A base quiz that is now archived answers `/404` at the end
of that redirect.
