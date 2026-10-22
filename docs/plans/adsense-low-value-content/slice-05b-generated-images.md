---
status: done
---

# Slice 5b — Generated images for the core

Pitch: [[adsense-low-value-content]]. The how-to lives in the project skill
`.claude/skills/quiz-authoring/` (section "Images").

## Delivers

Core quizzes get images again, after slice 4 stripped every third-party one. Each image is generated
with fal, approved by the owner, hosted on our own R2, and referenced from
`https://api.funsona.com/media/quiz-images/<path>`. That keeps slice 4's rule of no third-party
media in the quiz body.

The cover also feeds [[quiz-page-redesign]], whose hero is the cover banner.

**Owner decision, 2026-10-22.** Covers and outcomes. A licensed image found on the web comes first,
downloaded and rehosted. Generation covers only what search cannot find, with **at most $10 on
fal**. OpenRouter ($5 of credit) is a second generator if the owner stores its key. The order and
the licence rule are in the skill. The table below was the cost estimate if every image were
generated, extrapolated from the 20 drafts of batches 1–2 (109 outcomes, 200 questions) to the
69-quiz core:

| scope | images | at $0.08 (`fal-ai/nano-banana-2`, 1K) | at $0.037 (`openai/gpt-image-2`, 1024×768 medium) |
|---|---|---|---|
| covers | 69 | ~$6 | ~$3 |
| covers + outcomes | ~445 | ~$36 | ~$16 |
| covers + outcomes + questions | ~1,135 | ~$91 | ~$42 |

Prices are from fal's model pages on 2026-10-20. Regenerations come on top.

### Covers in production (2026-10-22)

The owner approved the 66-cover contact sheet in chat ("1 pode").

| source | covers | how | cost |
|---|---|---|---|
| Wikimedia Commons, `pd` or `cc0` with `AttributionRequired: false` | 26 | one query per quiz, eight landscape candidates of 1200 px or more on a numbered sheet, one picked by hand, fetched as the 1280 px thumbnail | $0 |
| fal `fal-ai/nano-banana-2`, 1K, 4:3 | 40 | the theme, never the character: franchise quizzes, plus 8 where search gave only nudity in baroque painting (the deities), branded product shots (consoles) or the wrong city (US skylines) | $3.20 |

Openverse was tried first and dropped: 5 queries in several minutes, and the `size=large` filter emptied
some of them.

**Before the write:**
- export at 18:52 UTC, restored: 775 rows, 78 published, 66 curated, 12 of them with a cover (the
  `api.funsona.com` covers of unknown origin, now replaced);
- Time Travel bookmark `00006dbc-00000000-0000510c-e3c7b948894751c2d5282e395ed3cb3e`.

**The write.** `images.mjs upload-covers` put each file in R2 as
`editorial/<slug>/cover-<sha256:10>.webp`, `immutable`, then set `cover_url` with one `UPDATE` per
slug, guarded by `status = 'PUBLISHED' AND ads_eligible = 1`. The first run passed the SQL file's
path where `executeFile` takes SQL text. SQLite rejected it at offset 0 and nothing was written. The
second run wrote everything.

| check, right after | result |
|---|---|
| D1, curated and published | **66 of 66** `cover_url` under `/media/quiz-images/editorial/`, 0 empty |
| D1, every other row | 0 with an editorial cover |
| every `cover_url` fetched | **66 of 66** answer 200 with `image/*` |
| every landing page on funsona.com | **66 of 66** carry their `cover_url` |
| `report.mjs --target remote` | still 66 of 66 meet the bar, so no cover counts as third-party media |

Not done: the revert check (one `cover_url` emptied renders the gradient). It needs a write to
production for no new information, because the gradient is the state 54 of the 66 were in this
morning.

### Outcome images in production (2026-10-22)

**The model.** Outcome images show in a box of at most 208 px (`QuizResultScreen.tsx`). A four-image
pilot rendered the same two prompts at `low` and `medium` quality with `openai/gpt-image-2`; at that
size they look the same. On fal's model page the square 1024 px image costs $0.006 at `low` and $0.053
at `medium`. The owner chose `low` for every outcome, generated rather than searched: at that price,
licence-checking 412 files one by one saves half a cent each and loses the one-style-per-quiz set.
Question images stay out. That is 660 more images to review, for a screen that reads fine as text.

**The prompts.** Six subagents wrote one prompt per outcome, 11 quizzes each, under the skill's rules:
the theme, never the character or a likeness, no people at all, no franchise marks, and calm symbols
for the relationship quizzes. A character became its element or object: Tanjiro is water around a
katana, Superman a wheat field at sunrise, a Pokémon only its element. A grep for 40 character names
over the prompt column found none.

| check | result |
|---|---|
| generated | **412 of 412**, 0 failed, $2.47 |
| owner review | 11 contact sheets, approved in chat ("aprovado") |
| export before the write | 19:16 UTC: 775 rows, 66 curated, all 66 with an editorial cover |
| Time Travel bookmark | `00006dc5-00000000-0000510c-7d6898c4b450bf798981e595a011c5cf` |
| the write | one `json_set(content, '$.outcomes[i].image_url', …)` per outcome, guarded by the key at that slot |
| D1 after | **412 of 412** curated outcomes carry an editorial `image_url`; 0 rows outside the core touched |
| every `image_url` fetched | **412 of 412** answer 200 with `image/*` |
| a quiz played end to end on funsona.com | the weapons quiz, ten answers, result "Lança": its image loaded, 1024 px shown at 206 px |
| `report.mjs --target remote` | still 66 of 66 meet the bar |

**Spend for the slice:** $3.20 covers + $2.47 outcomes + about $0.12 of pilots = **about $5.79 of
the $10 cap**.

**A rewrite would have erased them.** `toContent` builds outcomes from the draft, and drafts carry no
URLs, so re-applying any core quiz dropped its outcome images. `apply.mjs` now carries each
`image_url` over by outcome key. Checked on the local D1 copy, with the weapons quiz's production row
and a draft built from it: 8 of 8 images kept after `apply.mjs --target local`. With the previous
`apply.mjs`, the same run left 0 of 8.

## Needs

- `FAL_KEY` set, and the fal MCP authenticated (the skill's Setup).
- Rules held from the skill: the theme, never a franchise character; no text in the image; 4:3 for
  covers; one style per quiz.
- The owner approves every image before upload, from a local contact sheet.

## Build

- Drafts gain `cover_prompt`, and `image_prompt` per outcome (and per question, if in scope). These
  are text, so the gate's no-URL rule still holds.
- `scripts/adsense-core/rewrite/images.mjs`: for each draft, generate through fal's REST API,
  download to `scripts/adsense-core/images/<slug>/` (gitignored), and append endpoint, prompt, seed
  and request id to a manifest. Then write a contact sheet HTML for review.
- Upload approved files to R2 bucket `funsona-quiz-images` (`wrangler r2 object put`, flags checked
  against the repo's wrangler version), and set `cover_url` and the outcome image fields to the
  `api.funsona.com` URL. `apply.mjs` keeps clearing any cover that is not on `api.funsona.com`.

## Tests

- D1: core quizzes with `cover_url` on `api.funsona.com` = N of 69; with any other host = 0.
- Every image URL in D1 answers 200 with an `image/*` content type. Report N of N.
- `report.mjs --target remote`: third-party media still 0 on every core quiz.
- 5 pages in the browser show the cover on the landing page, and the outcome image on the result
  screen.
- Revert check: one quiz's `cover_url` set back to empty renders the gradient fallback.
- Spend: fal's dashboard total for the slice, recorded here.

## Done when

The query below prints 0 rows:

```sql
SELECT slug FROM quizzes WHERE ads_eligible = 1 AND status = 'PUBLISHED'
  AND (cover_url IS NULL OR cover_url NOT LIKE 'https://api.funsona.com/media/quiz-images/%');
```

## If stuck

If an image cannot be made without the franchise character, the quiz keeps the gradient. If fal
is down or the key is missing, text batches carry on without this slice.
