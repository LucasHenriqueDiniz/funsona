---
status: done
kanban: eeb4b0d4-9009-41f9-b962-1aa3ff09be09
---

# Slice 2 — Decide what language the quiz pipeline speaks

**Closed 2026-09-03 without being done: the owner removed the pipeline instead of deciding what
language it speaks.** `scripts/quiz-review/` is gone, so every file named below is gone with it, and
the open question it was blocked on ("is the quiz catalogue permanently pt-first?") no longer has
anything hanging on it. `docs/language-exceptions.md` was never created and is no longer needed —
there are no deliberate non-English strings left outside published product copy, which was always out
of scope. Recorded here rather than deleted so the next audit does not re-derive the argument.

The original slice follows, unchanged, as the record of what was blocked and why.

## Delivers

An answer, written down and enforced by a check, for every Portuguese string left in
`scripts/quiz-review/`:

- `export-batch.ts:139-198` — the review prompt: `"Escreva no mesmo idioma do quiz"`,
  `"Resumo em português"`, the output-format block.
- `export-batch.ts:73,86-87` and `orchestrate.ts:143,156-157` — display labels
  (`"Português"`, `"Título atual"`, `"Descrição atual"`) inside the markdown the model reads.
- `orchestrate.ts:213-235` — the image-plan safety rules, and `:269,:287,:347` — the return-format
  headings.
- `chatgpt-project-instructions.md` — 23 accented lines, and not a document: it is the text pasted
  into a ChatGPT project so that project answers in pt-BR.

Three answers are possible and any of them ends the slice: translate to English; parameterise so the
target language is an argument; or record them as a deliberate exception. What is not acceptable is
the current state, where nobody can tell which of the three was intended.

`orchestrate.ts:684-685` is already the correct pattern and is out of scope: a comment there states
the rate-limit phrases are kept in pt and en on purpose, because they are matched against ChatGPT's
own UI text. That is an exception with its reason attached.

## Needs

- The owner's answer to the pitch's open question: is the quiz catalogue permanently pt-first, or
  should the prompt take the target language as an argument?
- `docs/language-exceptions.md`, created by this slice: a list of paths where non-English text is
  deliberate, one bullet per path in the form `` - `path` ``. It is what makes the check below
  possible.
- If the answer is "translate": a way to compare output before and after on the same quiz, because
  this pipeline has already run over the live catalogue and a prompt change is a behaviour change.

## Tests

- Every file with Portuguese in it is a file the exceptions list names, and every file the list names
  still has Portuguese in it. Both directions — a stale exception is as bad as an undeclared one.
- If the answer is "parameterise": running the exporter for a pt quiz and an en quiz produces prompts
  in the respective language, from the same code path.
- `orchestrate.ts:684-685` stays untouched under every answer. Changing it breaks the rate-limit
  matcher against a UI this repo does not control.

## Done when

```
diff <(grep -rlE '(ã|õ|ç|é|á|í|ó|ú|ê|â)' scripts/quiz-review --include='*.ts' --include='*.cjs' --include='*.md' | sort) \
     <(sed -n 's/^- `\(.*\)`$/\1/p' docs/language-exceptions.md | sort)
```

prints nothing: the set of files containing Portuguese is exactly the set declared deliberate.

## If stuck

If the owner will not decide, take the third answer — write the exceptions list describing today's
state and stop. It costs one file, it makes the next audit report zero findings here instead of
re-deriving this argument, and it leaves the prompts working. Translating them on a guess is the only
outcome that can silently damage the live quiz catalogue.
