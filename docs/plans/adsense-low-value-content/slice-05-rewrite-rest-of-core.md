---
status: doing
---

# Slice 5 — The rest of the core, in batches

Pitch: [[adsense-low-value-content]].

## Delivers

Every quiz with `ads_eligible = 1` meets the slice 4 bar, through the same draft → review → apply
path, in batches of 10. Each batch is a deploy of its own. The slice is done when the report covers
the whole core.

A quiz the owner decides is not worth rewriting leaves the core instead: `ads_eligible = 0`, and a
reason line in `core.csv`. The core shrinks rather than carrying a thin quiz into the review.

### Batch 2 drafted (2026-10-19)

Ten drafts: keep rows 11–20 of `core.csv`, minus one, plus row 21.

**Held back:** `qual-garota-de-anime-e-o-seu-verdadeiro-amor-descubra-sua-waifu-ideal`. It is a
"your ideal romantic partner" quiz built on anime characters, several of them teenagers and one from
an ecchi series. With romantic framing, that sits against the child-sexualization policy, the most
severe one AdSense has. The proposal to the owner is the same treatment as the three sensitive
quizzes: out of the core. `qual-time-da-nfl-…` (row 21) took its place.

**Within the drafts:** Hisoka was left out of the Hunter x Hunter quiz. Canon gives him an unsettling
interest in child characters. Biscuit Krueger takes the slot.

**A template signature, measured and reduced.** Across the 20 drafts of batches 1 and 2, cross-quiz
text overlap was negligible: 5-gram Jaccard mean 0.02%, max 10.5%, which is the shared helpline
sentence in the two relationship quizzes. But "O desafio de/do…" opened the last paragraph of 54 of
109 outcomes, and inside one quiz page, where every outcome shows together, that reads as a form.
Batch 2's openers were rewritten by hand: 40 sentences, down to 9 of 57.

Batch 1, already in production, still carries the pattern. Re-applying it with varied openers needs
the owner's go.

| check | result |
|---|---|
| `check.mjs` on batch 2 | 10 ok. The opener edit pushed one Steelers outcome to 149 words, so it was lengthened |
| applied to the local copy, then `report.mjs --target local` | 10 of 10 meet the bar |
| four batch 2 pages from the local web app | new intro present, 0 third-party media in the quiz body |

### Batch 2 in production, batch 1 re-applied, waifu archived (2026-10-19)

**The owner's three answers in chat:**
- write batch 2 as it is;
- archive the waifu quiz;
- vary batch 1's openers and re-apply.

As with batch 1, the agent set `reviewed: true`, with no owner edits.

**Batch 1 openers.** 19 sentences rewritten by hand where an opener repeated inside one quiz: "O
risco" ×5 in the weapons quiz, "O lado sombrio" ×5 in Magic, "O desafio" ×4 in Demon Slayer, and a
few more.

**Before the writes:**
- export at 02:18 UTC, restored: 775 rows, 82 published, 70 curated;
- Time Travel bookmark `00006661-00000000-00005109-05bc3533743cdc8c98ddd3dc6ddeba0f`.

**The writes:**
- `apply.mjs --target remote` on 20 drafts: the 10 of batch 1 again, plus the 10 of batch 2;
- `scripts/adsense-core/archive-waifu.sql` (status `ARCHIVED`, flag 0). Wrangler reported
  `changes: 2` for the one row; the counts below show one quiz moved.

| check, right after | result |
|---|---|
| D1 by status and flag | PUBLISHED flag=1 **69** · PUBLISHED flag=0 12 · ARCHIVED 694 |
| `report.mjs --target remote` on the whole core | **20 of 69** meet the bar |
| same report against the pre-write export, on the 20 | 16 changed. The other 4 are the batch 1 quizzes whose openers were not touched (werewolf, ex, breakup, horsemen), so they equal the export, as expected |
| the 20 pages on funsona.com (browser) | **20 of 20**: new text found, indexed, loader present, 0 third-party media in the quiz body |
| waifu quiz | 404 at `/404`; not in the sitemap |
| `sitemap.xml` quiz URLs | **69** |

Next: batch 3, keep rows 22 onwards of `core.csv`.

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
