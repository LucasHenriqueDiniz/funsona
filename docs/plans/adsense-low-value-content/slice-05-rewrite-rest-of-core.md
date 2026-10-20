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

### Batch 3 drafted (2026-10-20)

Ten drafts: keep rows 22–31 of `core.csv`, minus one, plus row 32. A read-only `SELECT` on remote
D1 confirmed all eleven candidates `PUBLISHED` with `ads_eligible = 1`. The local copy behind the
checks below was loaded from a full remote export taken at 12:35 UTC: 694 archived, 12 published
unflagged, 69 published flagged, the same as production.

**Held back:** `que-personagem-dxd-do-ensino-medio-sou-eu`. High School DxD is an ecchi series about
high-school students, and the live quiz leans on that framing: "sedutora", "atrair olhares", a
question about your love life. The proposal to the owner is the waifu quiz's treatment: out of the
core. `sera-que-conseguimos-adivinhar-seu-personagem-favorito-de-star-wars` (row 32) took its
place.

**Within the drafts,** the same screen as Hisoka in batch 2:
- Orochimaru left the Naruto arch-enemy quiz. Canon has him kidnapping children and experimenting on
  them.
- Dio Brando left the JoJo quiz. In the first part, he forcibly kisses a child to humiliate the
  hero.

**Rewritten whole, not trimmed:**
- The Japanese-name quiz had 60 outcomes and answers like "Opção visual A" with no image behind them.
  It now has 8 real names, each with its kanji, its meaning and which genders use it.
- JoJo went from 10 outcomes to 8.
- The girlfriend quiz points to 190, CVV 188 and the Central de Atendimento à Mulher 180. The
  sentence is worded apart from the boyfriend and husband quizzes, whose shared helpline paragraph is
  the largest overlap in batches 1 and 2.

**Template signature,** measured by `scripts/adsense-core/rewrite/signature.mjs`:
- openers: the first two words of an outcome's second and last paragraphs, repeated inside one quiz;
- overlap: 5-gram Jaccard between outcomes of different quizzes.

The second paragraph is new to the measure. With the last paragraph varied, "Como ele, você…"
opened the second paragraph of 7 of 8 JoJo outcomes, and "Combina com você porque…" all 8 of the
name quiz. 40 sentences were rewritten by hand.

| measure | batches 1 + 2 (20 drafts, 109 outcomes) | batch 3 (10 drafts, 65 outcomes) |
|---|---|---|
| outcomes sharing a second- or last-paragraph opener inside their quiz | 77 | **0** |
| last paragraphs opening with "O desafio…" | 14 | **0** |
| 5-gram Jaccard per outcome pair across quizzes | mean 0.017%, max 11.4% (5,621 pairs) | mean 0.006%, max 1.1% (8,979 pairs touching batch 3) |

Batch 2 reported 0.02% and 10.5% for the same twenty drafts. The recount differs slightly in the
maximum and agrees on the cause: the boyfriend and husband helpline paragraph.

| check | result |
|---|---|
| `check.mjs` on batch 3 | 10 ok: 157–212 words per outcome, 10 questions each, every rule but `reviewed` |
| `apply.mjs --target local` on the drafts themselves | refused, 10 of 10, nothing written: `reviewed` is false |
| local-only `reviewed: true` copies → `apply.mjs --target local` | written |
| `report.mjs --target local --baseline <the 12:35 export>` on the 10 | **10 of 10** meet the bar, all changed |
| `report.mjs --target local` on the whole core | 30 of 69 |
| `render.mjs` on the 10 pages from the local web app | **10 of 10**: title, intro 3/3, every outcome, 0 third-party media in the quiz body |
| same check on an untouched core quiz (cheese), as a negative control | FAIL: intro 0/3, 1 quizpanda image in the body |

Every page still shows 2 quizpanda images further down, in the "Mais para jogar" cards. They are
covers of core quizzes not yet rewritten (cheese, PC game), so they leave as later batches land.

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
node scripts/adsense-core/rewrite/report.mjs --target remote
```

prints `---- N of N quizzes meet the bar`, with N equal to the D1 count of `PUBLISHED` and
`ads_eligible = 1`. With no slugs, the script already reports exactly that set. It has no `--where`
flag: given one, it reads the clause as a slug and prints `0 of 0`.

The pages are checked with
`node scripts/adsense-core/rewrite/render.mjs https://funsona.com scripts/adsense-core/drafts/*.json`.
It prints `N of N pages pass`.

## If stuck

If review time runs out, stop adding batches and take the rest out of the core. A smaller site where
every page clears the bar is the bet of the whole pitch, and applying with half-rewritten quizzes
reverses it.
