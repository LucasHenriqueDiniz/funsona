---
status: done
---

# Slice 1 — Split the page into components that render the same page

Pitch: [[quiz-page-redesign]], Architecture section.

## Delivers

`apps/web/src/pages/quiz/[slug].astro` (312 lines, one template) becomes a page that fetches, decides
`curated`, sets `<Layout noindex={!curated} ads={curated}>` and the JSON-LD, and composes:

```
components/quiz/landing/
  QuizHero.astro        title, description, Play, like, tags, disclaimer, cover card   (today's hero)
  QuizAbout.astro       intro_content, all three parts open                             (today's block)
  QuizQuestions.astro   the questions list                                              (deleted in slice 3)
  QuizOutcomes.astro    the outcomes list, open                                         (today's block)
  QuizRelated.astro     "Mais para jogar", global top 3 by likes                        (today's block)
```

Same markup, same data, same order. The byline does not exist yet; it arrives with the new hero in
slice 2. The point of this slice is that every later diff is one component wide.

The `any`-typed quiz payload is not threaded through five components whole: each component declares
the props it reads, and the page passes those. The `LandingQuestion`/`LandingOutcome` normalising
that lives in the page today moves next to the component that renders it.

## Needs

- Slice 0's `check-landing-html.py`, to prove the HTML still carries the same text.
- The local web app against the production API: `web-prod-api` in `.claude/launch.json`
  (port 4322, read-only).

## Tests

- **Text parity.** For the five sample quizzes, dump the visible text of the page before and after
  (`curl -s <url> | python3 -c 'strip tags, collapse whitespace'`), and `diff`. Empty on 5 of 5.
- **Flag parity.** `check-landing-html.py http://localhost:4322`: flag rule 20/20, text 10/10,
  question titles still present (this slice removes nothing).
- `pnpm --filter web lint` and `pnpm --filter web typecheck` exit 0.

## Done when

```
for s in $SAMPLE; do diff <(text before) <(text after) && echo "SAME $s"; done
pnpm --filter web typecheck
```

prints `SAME` five times and typecheck exits 0.

### Done 2026-10-20

Five components under `components/quiz/landing/`, the normalisers and the page's view type in
`lib/quiz-landing.ts`, the page down to composition. Verified on the local app against the
production API (`web-prod-api`), the five sample quizzes curled before and after the split and
their visible text diffed (tags stripped, entities unescaped, one line per text node):

| check | result |
|---|---|
| text parity, 5 quizzes | **SAME 5/5** (181–191 text lines each) |
| flag parity on the weapons quiz | no `noindex`, loader 1, `quiz-landing` slot 1, as before |
| `pnpm --filter @funsona/web lint` | exit 0 |
| `pnpm --filter @funsona/web typecheck` | 0 errors, 0 warnings, 8 hints (all pre-existing: the deprecated `ViewTransitions` import and astro-check's "never read" on early-return imports) |

The worktree needed `apps/web/.dev.vars` (gitignored, holds `CLERK_SECRET_KEY`) copied from the
main checkout before `astro dev` would render any page: without it every route answers 500.

## If stuck

If an Astro component cannot take a slice of the payload cleanly, pass the whole `quiz` to that one
component and say so in a comment, rather than inventing a type the API does not have. The split is
for readable diffs, not for a type system.
