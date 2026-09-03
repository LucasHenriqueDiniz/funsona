---
status: active
epic: language-sweep
---

# The last Portuguese in the repo

## Problem

The language rule is that everything landing in a repo is English. Most of this repo already complies:
`b837f42` translated `AGENTS.md`, `docs/*.md` and the CI comments, and the code comments in
`scripts/quiz-review/` are English today — `orchestrate.ts`'s 121 comment lines read as English from
`:12` to the end of the file.

What is left is not a translation job, and that is the whole point of writing it down instead of
sweeping it.

**Two markdown files are still Portuguese.** `scripts/quiz-review/QUIZ_REFACTOR_COMPLETE_REPORT.md`
(32 accented lines) is a finished report about a batch of quiz rewrites — a record, with no runtime
behaviour attached. `scripts/quiz-review/chatgpt-project-instructions.md` (23 accented lines) is not a
document at all: it is the text pasted into a ChatGPT project so that project produces pt-BR quiz copy.

**The prompts are Portuguese on purpose.** `scripts/quiz-review/export-batch.ts:139-198` and
`scripts/quiz-review/orchestrate.ts:213-350` build the review prompt in Portuguese —
`"Escreva no mesmo idioma do quiz"`, `"Resumo em português"`, the whole image-plan rule block. These
strings are sent to a model whose job is to rewrite Portuguese quiz content for Portuguese-speaking
players. Translating them is not a language fix; it is a change to what the model outputs, on a
pipeline that has already run over the live quiz catalogue. The same files also carry pt display
labels (`"Português"`, `"Título atual"`) inside the markdown the model reads.

`orchestrate.ts:684-685` is the case that settles it: a comment there explains that the rate-limit
phrases are matched against ChatGPT's own UI text and are deliberately kept in both pt and en.
Language purity there would break the matcher.

## Solution

Translate the record, and leave the prompts alone until the owner says what the pipeline is for.

The report is a clean violation with no downside — it describes work already finished and nothing
reads it programmatically. The prompts need a decision that is about product, not style: does the quiz
catalogue stay pt-first, or is the pipeline meant to be language-agnostic with the target language
passed in as a parameter?

## Surface

- `scripts/quiz-review/QUIZ_REFACTOR_COMPLETE_REPORT.md`
- `scripts/quiz-review/chatgpt-project-instructions.md`
- `scripts/quiz-review/export-batch.ts`, `scripts/quiz-review/orchestrate.ts`

## Scope

**In**

- The finished report, translated.
- A written answer for the prompts: translate, parameterise, or record them as a deliberate exception.

**Out**

- `apps/web/src/content/guides/pt/*.md`. That is published product copy for Portuguese readers, not
  repo prose, and the language rule was never about it.
- The rate-limit phrase list at `orchestrate.ts:684-685`, which is matched against a third party's UI.

## Open questions

- Is the quiz pipeline permanently pt-first, or should the prompt take the target language as an
  argument? The answer decides whether these strings are a violation or a feature.

## Done

`grep -rlE '(ã|õ|ç|é|á)' scripts/quiz-review --include='*.md'` returns nothing, and every remaining
Portuguese string in `scripts/quiz-review/*.ts` sits under a comment naming it as a deliberate
exception.
