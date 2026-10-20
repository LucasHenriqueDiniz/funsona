---
status: todo
---

# Slice 3 — Fold the reading: "Sobre" first part open, one `<details>` per outcome, no questions list

Pitch: [[quiz-page-redesign]], Solution 3 and "What must not change" · research verdict:
[[2026-10-20-folded-content-indexing/research|folded text counts for Search when it is in the HTML]].

## Delivers

- `QuizAbout.astro`: `intro_content.context` open; `what_youll_learn` and `how_scoring_works` inside
  one `<details>` whose `<summary>` reads "Ler mais". Same text, same order.
- `QuizOutcomes.astro`: heading "Os N resultados possíveis", one line of help, then one `<details>`
  per outcome, the title in the `<summary>`, the description inside, server-rendered. Closed by
  default. Paragraph breaks become `<p>`s split on blank lines (the text is unchanged).
- `QuizQuestions.astro` deleted, with the "Responder as N perguntas" link it carried. The questions
  belong to `/play`.
- Nothing is fetched on click. No script touches these blocks. The `quiz-landing` `AdSlot` keeps its
  place after the outcomes, still behind `quiz.ads_eligible`.

## Needs

- Slice 2 merged (the hero no longer carries the second Play).
- `check-landing-html.py` from slice 0.

## Tests

- `check-landing-html.py http://localhost:4322`: first sentence of `intro_content.context` and of
  every outcome present, 10 of 10 pages; **question titles found: 0** on 10 of 10; flag rule 20/20.
- **Revert check.** Comment out `<QuizOutcomes … />` in the page, rerun: the outcome check goes red
  on 10 of 10. Restore, rerun: green. A check that stays green without the component tests nothing.
- `curl -s <landing> | grep -c '<details'` = outcomes + 1 (the "Ler mais"), on the five sample quizzes.
- `measure-landing.js` at 375×812 on the five: page height in screens, comments' screen. Target from
  the pitch: at most 6 screens (today 18.3 on the weapons quiz).
- `pnpm --filter web lint && pnpm --filter web typecheck` exit 0.

## Done when

```
python3 scripts/quiz-page/check-landing-html.py http://localhost:4322
```

prints `0 FAIL` with the question-title check now passing, the revert run above printed it red and
the restore printed it green, and this table is full:

| quiz | height px | screens (÷812) | comments at screen | `<details>` count |
|---|---|---|---|---|

## If stuck

If a `<details>` cannot hold the markup cleanly inside Tailwind's reset (no marker, the chevron
rotating on `[open]`), style the `<summary>` with `list-none` and `[&::-webkit-details-marker]:hidden`
and keep going. Never replace `<details>` with a React island: the text would still be in the HTML,
but the fold would stop working without JavaScript, and the point of the element is that it does.
