---
status: doing
---

# Slice 4 — Review-gated rewrite, first 10 quizzes

Pitch: [[adsense-low-value-content]] · decision: an LLM drafts, the owner reviews and edits every
outcome.

## Delivers

The 10 most-clicked quizzes in `scripts/adsense-core/core.csv` go live with outcomes of 150–300 words
each and `intro_content` filled. They get there through a path that **cannot write unreviewed text to
production**.

The path, in three steps:

1. **Draft.** For each quiz, Claude (in a session, not an API pipeline) writes a review file from the
   live `content`:
   - one outcome text per outcome, in pt-BR;
   - an `intro_content` object with the three keys `quiz/[slug].astro:187-206` already renders:
     `context`, `what_youll_learn`, `how_scoring_works`;
   - `"reviewed": false`.
2. **Review.** The owner edits each file and flips `reviewed` to `true`. That flag is the human act
   the policy asks for ("manual review or curation"), made explicit.
3. **Apply.** A script reads the review files and **refuses any file with `reviewed: false`**, or
   with an outcome under 150 words. For the rest it generates the `UPDATE quizzes SET content = …,
   intro_content = …` statements and runs them through `wrangler d1 execute --remote`.

Review files are pt-BR product copy. They live outside the repo, or in a gitignored directory, so the
repo's English rule is untouched. The apply script and its prompt-free logic are English and
committed under `scripts/adsense-core/`.

### Scope widened (2026-10-18)

The content check this slice opened with found the core's images served from `quizpanda.com`
([[2026-10-18-catalogue-origin/research|catalogue-origin]]). The owner widened the slice: each core
quiz is rewritten **whole**, with new questions, new answer weights, new outcomes and a new intro,
and it carries **no third-party image**.

- Drafts carry no image fields. The gate refuses any draft containing a URL.
- On write, `apply.mjs` clears a cover unless it lives on `api.funsona.com`. Covers there (12 core
  quizzes) have an unknown origin, which is an open question in the research note.
- A quiz without a cover renders the gradient fallback already in `QuizCard.astro` and `[slug].astro`.

### Built so far (2026-10-18)

The pipeline lives in `scripts/adsense-core/rewrite/`. `lib.mjs` holds the gate and D1 access,
`apply.mjs` writes, `report.mjs` measures. Drafts go in `scripts/adsense-core/drafts/`, which is
gitignored: pt-BR product copy under review.

**The gate.** A draft is refused unless all of these hold:
- `reviewed: true`;
- every outcome has 150–350 words;
- all three intro keys have at least 25 words;
- at least 8 questions, each with 3 or more answers;
- every answer points to a known outcome, and every outcome is reachable from at least 3 answers;
- the draft contains no URL.

On top of the gate, only curated, published slugs can be written.

**Tested against the local copy of production, never against production:**

| test | result |
|---|---|
| first draft (`que-arma-voce-tem-…`) as written, `reviewed: false` | refused, exit 1, nothing written; it was the only error, so the draft clears every other rule |
| same draft, `reviewed: true`, one outcome cut to 120 words | refused, exit 1, nothing written |
| a local-only copy with `reviewed: true` → `apply.mjs --target local` | written |
| `report.mjs --target local --baseline <pre-write copy>` on that quiz and an untouched one | rewritten: PASS (8/8 outcomes in range, intro ok, 0 third-party media, changed). Untouched: FAIL (0/6, intro missing, 36 third-party media, unchanged) |
| the page from the local web app | new title, intro, questions and all 8 outcomes rendered; gradient instead of the quizpanda cover; "Equipe FunSona" as author |

`report.mjs` crashed on its first run: an untouched quiz stores `intro_content` as the JSON text
`"null"`. Fixed before the numbers above.

**Waiting on the owner:** reading and editing the first draft, then setting `reviewed: true`. Nothing
reaches production before that.

## Needs

- Slice 3 done. The core list and the backup both exist.
- 15 min: confirm how `quizzes.content` stores outcomes for PERSONALITY quizzes (`outcomes` vs
  `results`, `description` vs `text`). The 2026-08-20 audit warns about legacy accessors
  (`question.title || question.text`). The apply script must write the key `QuizPlay.tsx` reads.
- The owner's time. Ten quizzes at ~8 outcomes is ~80 outcome texts to read and edit.

## Tests

- **Gate holds.** Run apply on a file with `reviewed: false` → exits non-zero and writes nothing.
  Then on a file with one 120-word outcome → same. Confirm with a D1 `SELECT` that nothing changed.
- **Landed.** For the 10 quizzes, a script over D1 `content` reports:
  - outcomes at 150+ words: 100%;
  - `intro_content` with all three keys: 100%;
  - outcomes changed compared with the slice 3 export: 100%. This proves the write happened.
  Report the three numbers.
- **Renders.** `curl` each of the 10 live pages. The intro `context` text and one outcome's first
  sentence appear in the HTML. Report 10/10.
- **Plays.** Play one quiz end to end in the browser and confirm the result screen shows the new
  outcome text.

## Done when

```
node scripts/adsense-core/report.mjs --slugs-from core.csv --top 10
```

prints `outcomes>=150w 100%  intro 100%  changed 100%  rendered 10/10`.

## If stuck

- **The `content` JSON shape varies across quizzes:** have the apply script read with the same
  fallbacks as `QuizPlay.tsx` and write the canonical key. Log every quiz where it had to fall back.
- **Owner review becomes the bottleneck:** shrink the batch, not the bar. Five reviewed quizzes are
  worth more than ten unreviewed.
