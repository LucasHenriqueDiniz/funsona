---
status: todo
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
