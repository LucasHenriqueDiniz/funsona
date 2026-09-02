# Audit of the 769 published quizzes (Phase 1) — 2026-08-20

Read-only. Nothing was written to the database.

## How the data was read

`wrangler d1 execute funsona-db --remote` (production, D1) — a dump of
`id, slug, title, description, cover_url, type, content, attempts_count,
completions_count, created_at` for the 769 quizzes with `status = 'PUBLISHED'`.

`content` was parsed with **the same legacy accessors `QuizPlay.tsx` uses**
(`question.title || question.text`, `question.options || question.answers`,
`option.label || option.text`, `option.imageUrl || option.image_url`,
`outcome.imageUrl || outcome.image_url`). Before running anything at scale, a
sample of 3 quizzes confirmed that `title` comes populated and `text` comes back
`null` — exactly the trap you described. Confirmed; that discussion does not
need reopening.

All 9,110 distinct image URLs (cover + questions + outcomes) were checked over
HTTP (HEAD, with a GET fallback, 2 attempts, 10-20s timeout).

## What the audit found — and what it did NOT find

The starting hypothesis was "uneven quality" in the content. What the mechanical
script found is far narrower than that:

- **0** quizzes with no questions, with a single-option question, or with too
  few questions.
- **0** empty titles, **0** empty descriptions.
- **0** cases of AI text leaking through (`as an AI`, raw markdown, `lorem
  ipsum`, prompt placeholders).
- **628 of 769 (82%)** have no structural, image or duplicate problem at all —
  the only flag they carry is `ZERO_ATTEMPTS`.

In other words: **the content itself is structurally fine in the overwhelming
majority of cases.** That changes the reading of the problem — "769 quizzes of
uneven quality" is not what the data shows. What the data shows is a much more
concentrated problem, described below.

## Findings by category

### A) Images

| category | quizzes affected |
|---|---|
| Missing cover | 2 |
| Broken cover (the URL errors) | 0 |
| At least 1 broken image (question/outcome) or a broken cover | 70 |
| At least 1 image with a **placeholder token that was never resolved** (see below) | 16 |
| **Union** (any image problem) | **70** |

**Unexpected finding:** 91 `image_url` fields across 16 quizzes are not URLs —
they are literal strings like `%GIPHY: Neville Longbottom` and `%GIPHY: Kanye
West`. An old generation pipeline left the Giphy search placeholder behind
without ever resolving it to a real URL. Those 16 quizzes carry between 2 and 18
broken images each — they are the worst cases in the audit (see "20 worst"
below). This is a pipeline bug, not a "low-quality image", and it is worth
recording separately because the fix is different (a placeholder-resolution
script, not generating new images).

The full visual classification (`good` / `generic` / `wrong` — whether the image
suits the subject) **was not done for the 9,110 images** — that needs
per-image visual judgement and is not mechanizable at scale without a high cost
in time and tokens. What the script covers with mechanical certainty is
`missing` and `broken`. If you want the `good/generic/wrong` classification, it
has to run as a second pass, sampled or complete — tell me the scope before I
run it (769 image-analysis calls carry a real cost).

### B) Content quality

| category | quizzes affected |
|---|---|
| No questions / too few questions (<4) | 0 |
| Question with <2 options | 0 |
| `PERSONALITY` with <2 possible outcomes | 0 |
| Outcome with no description (`RESULT_NO_DESC`) | 2 (but 56 occurrences — these are quizzes with dozens of possible outcomes, most of them without a description) |
| Possible truncation (heuristic: the text ends in `...` or a comma) | 30 — **a weak heuristic, it has false positives**; treat these as "worth checking", not as fact |
| AI text leak / raw markdown / prompt placeholder | 0 |
| Title duplicated inside the quiz's own questions | 0 |

### C) Signals for retiring a quiz

| category | quizzes affected |
|---|---|
| `attempts_count = 0` | **718 of 769 (93%)** |
| Duplicates (from `duplicate-quizzes.md`, audited earlier) | 22 (13 `paraphrased`, 9 `distinct-ish`) — the dedup release is already mapped, not redone here |

`attempts_count = 0` on 93% of the quizzes is the biggest number in the table,
but on its own it is **not evidence of low quality** — it is precisely the
symptom that prompted the audit (indexed, ignored). Cutting on that alone would
remove nearly everything, and it does not separate "a bad quiz" from "a good
quiz nobody ever saw". It only becomes a retirement signal **combined** with
another real problem (a broken image, a duplicate).

## The 20 worst cases (by combined severity)

Ranked by `severity_score` (weighting zero plays, broken images ×1, unresolved
placeholders ×2, duplicate ×4, outcome with no description ×2, and so on — the
full formula is in `quiz-audit.json`, field `severity_score`).

1. `qual-personagem-de-star-wars-voce-e-teste-divertido` — 18 images with an unresolved `%GIPHY` placeholder, 0 plays
2. `que-personagem-do-harry-potter-e-teste-de-personalidade` — 10 `%GIPHY` placeholders, 0 plays
3. `com-qual-celebridade-eu-me-pareco-questionario-divertido-sobre-sosias-de-celebridades` — 10 placeholders, 0 plays
4. `qual-e-a-sua-cor-de-mms-descubra-sua-personalidade-mm` — 10 placeholders, 0 plays
5. `qual-e-a-sua-cor-do-arco-iris` — 10 placeholders, 0 plays
6. `podemos-adivinhar-seu-emoji-favorito-quiz-divertido` — 9 placeholders, 0 plays
7. `qual-muppet-e-voce-descubra-seu-personagem-dos-muppets` — 7 placeholders, 0 plays
8. `quao-ma-pessoa-voce-realmente-e` — 6 placeholders, 0 plays
9. `devo-virar-vegano-quiz-para-descobrir` — 5 placeholders, 0 plays
10. `qual-e-o-teu-digimon-descubra-seu-digimon-ideal` — 9 broken images (real URL, 404), 0 plays
11. `qual-e-o-meu-superpoder` — 3 placeholders
12. `quantas-pessoas-querem-que-voce-morra-descubra-seu-destino` — 3 broken images, 0 plays
13. `o-que-diz-sua-mensagem-personalizada-de-biscoito-da-sorte-5` — 28 outcomes with no description, duplicate (distinct-ish), 0 plays
14. `qual-personagem-de-gravity-falls-voce-e-descubra-seu-alter-ego` — 2 placeholders, 0 plays
15. `qual-personagem-de-owl-house-voce-e-quiz-divertido-e-magico` — 2 placeholders, 0 plays
16. `conseguimos-adivinhar-seu-personagem-favorito-de-one-piece-quiz-divertido` — 4 broken images, 0 plays
17. `qual-e-o-seu-alinhamento-moral-1` — duplicate (paraphrased), 0 plays
18. `descubra-se-voce-conhece-bem-o-nosso-planeta-5` — duplicate (distinct-ish), 0 plays
19. `qual-e-o-meu-estilo-de-apego-5` — duplicate (distinct-ish), 0 plays
20. `voce-e-kira-ou-l-5` — duplicate (distinct-ish), 0 plays

## My retirement recommendation

**I do not recommend a mass cut on `attempts_count = 0`.** The data does not
support "769 quizzes of uneven quality" — it supports a much narrower problem:
~70 quizzes with a broken image (16 of them from one specific pipeline bug, not
from lack of effort) and 22 already-known duplicates.

The criteria I would apply:

1. **Archive the 13 `paraphrased` duplicates** from `duplicate-quizzes.md` —
   already audited, with criteria already validated (identical question count,
   high similarity). The `cleanup-duplicate-quizzes.mjs` script exists and
   already writes the redirect; it only needs retargeting at D1.
2. **Do not archive for a broken image.** That is fixable (Phase 2) and is not
   the quiz content's fault — it is a missing asset. Fixing it makes more sense
   than discarding 70 quizzes over it.
3. **The 9 `distinct-ish` duplicates stay open** — `duplicate-quizzes.md`
   already recorded that this is a judgement call, not a mechanical one. I would
   not archive them without you looking at least at the titles/preview of each
   pair.
4. **Nothing else in the dataset justifies a cut** on content grounds — the
   audit found no empty, truncated or prompt-leaking quizzes.

That gives an initial cut of **13 quizzes** (1.7% of 769), not a large slice. If
the goal is to shrink the Google index more aggressively because the suspicion
is "the content is too thin even when structurally fine", that is an editorial
decision of yours, not something the script can prove — the content it read is
structurally valid in 82% of cases.

## Files delivered

- `quiz-audit.csv` — one row per quiz, with every mechanical classification.
- `quiz-audit.json` — the same dataset, with the full list of images checked per
  quiz (`images_to_check`) and the `flags` array.

## What is still open before Phase 2

- The `good/generic/wrong` visual classification of the images that do load —
  not done here, needs a defined scope.
- A decision on the 9 `distinct-ish` pairs.
- Confirming whether you want the 13 `paraphrased` archived now, or together
  with the full Phase 2.
