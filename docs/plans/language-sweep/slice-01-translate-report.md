---
status: todo
kanban: 080ca68d-6aaa-4002-9d3d-0abaedb78e17
---

# Slice 1 — Translate the quiz refactor report

**The file moved.** `scripts/quiz-review/` was removed with the ChatGPT pipeline; this report was kept,
because this slice's own "If stuck" says not to delete it to make a check pass. It is now
`docs/postmortem/quiz-refactor-pilot-2026-06-30.md`, content unchanged. The job below is the same job
against the new path.

## Delivers

`docs/postmortem/quiz-refactor-pilot-2026-06-30.md` is English. It currently has 32 lines carrying
Portuguese accents and is the last Portuguese document in the repo that nothing reads at runtime — a
finished report about a batch of quiz rewrites, with no consumer, no prompt role and no behaviour
attached to its wording.

This is the whole safe half of the language sweep. The other half — the Portuguese prompt text — no
longer exists: see `docs/plans/language-sweep/slice-02-prompt-language.md`.

## Needs

- Nothing. No dependency, no decision.
- 15 min. It is one file.

## Tests

- `grep -cE '(ã|õ|ç|é|á|í|ó|ú|ê|â)' docs/postmortem/quiz-refactor-pilot-2026-06-30.md` prints `0`.
- Quiz titles and quoted quiz copy inside the report stay in their original language — they are data
  the report is describing, not the report's own prose. If any survive, they are the one legitimate
  source of accents and the check above needs narrowing to the prose lines rather than the file.
- Nothing else changed: `git diff --name-only` lists exactly one file.

## Done when

```
grep -cE '(ã|õ|ç|é|á|í|ó|ú|ê|â)' docs/postmortem/quiz-refactor-pilot-2026-06-30.md
```

prints `0`.

## If stuck

If the report turns out to quote so much pt-BR quiz content that the file cannot reach zero accents,
translate the prose and leave the quotes, then say so in a line at the top of the file. Do not delete
the report to make the grep pass — it is the record of a batch that ran against the live catalogue.
