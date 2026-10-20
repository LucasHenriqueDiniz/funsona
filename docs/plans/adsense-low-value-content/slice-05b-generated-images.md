---
status: todo
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

**Scope, owner decision pending.** Counts are extrapolated from the 20 drafts of batches 1–2 (109
outcomes, 200 questions) to the 69-quiz core:

| scope | images | at $0.08 (`fal-ai/nano-banana-2`, 1K) | at $0.037 (`openai/gpt-image-2`, 1024×768 medium) |
|---|---|---|---|
| covers | 69 | ~$6 | ~$3 |
| covers + outcomes | ~445 | ~$36 | ~$16 |
| covers + outcomes + questions | ~1,135 | ~$91 | ~$42 |

Prices are from fal's model pages on 2026-10-20. Regenerations come on top.

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
