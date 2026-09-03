---
status: todo
kanban: 080ca68d-6aaa-4002-9d3d-0abaedb78e17
---

# Slice 1 — Translate the quiz refactor report

## Delivers

`scripts/quiz-review/QUIZ_REFACTOR_COMPLETE_REPORT.md` is English. It currently has 32 lines carrying
Portuguese accents and is the last Portuguese document in the repo that nothing reads at runtime — a
finished report about a batch of quiz rewrites, with no consumer, no prompt role and no behaviour
attached to its wording.

This is the whole safe half of the language sweep. The rest of the Portuguese in
`scripts/quiz-review/` is prompt text and is deliberately excluded — see
`docs/plans/language-sweep/slice-02-prompt-language.md`.

## Needs

- Nothing. No dependency, no decision.
- 15 min. It is one file.

## Tests

- `grep -cE '(ã|õ|ç|é|á|í|ó|ú|ê|â)' scripts/quiz-review/QUIZ_REFACTOR_COMPLETE_REPORT.md` prints `0`.
- Quiz titles and quoted quiz copy inside the report stay in their original language — they are data
  the report is describing, not the report's own prose. If any survive, they are the one legitimate
  source of accents and the check above needs narrowing to the prose lines rather than the file.
- Nothing else changed: `git diff --name-only` lists exactly one file.

## Done when

```
grep -cE '(ã|õ|ç|é|á|í|ó|ú|ê|â)' scripts/quiz-review/QUIZ_REFACTOR_COMPLETE_REPORT.md
```

prints `0`.

## If stuck

If the report turns out to quote so much pt-BR quiz content that the file cannot reach zero accents,
translate the prose and leave the quotes, then say so in a line at the top of the file. Do not delete
the report to make the grep pass — it is the record of a batch that ran against the live catalogue.
