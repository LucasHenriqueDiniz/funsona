# Near-duplicate quizzes (audit 2026-07-31)

> **Correction.** An earlier version of this file claimed these 22 pairs had
> "byte-identical question sets". That was wrong — the audit script read
> `question.text`, but this data uses the legacy `question.title` / `answers` /
> `label` shape, so every field compared as `null` and everything scored 100%
> similar. The numbers below come from a corrected audit that uses the same
> legacy-aware accessors as `QuizPlay.tsx`.

## What is actually there

Across all 769 published quizzes, 22 pairs share a base slug (`x` and `x-1` /
`x-5` / `x-6`). None are exact copies. They are **paraphrased variants of the
same quiz**: same topic, same outcome structure, questions reworded.

The strongest signal is not the wording but the shape — **every single pair has
an identical question count** (14v14, 18v18, 29v29, 25v25, 8v8 …). These were
generated from the same template or prompt and then reworded.

| duplicate slug | exact-match Q | word similarity | option match | verdict |
|---|---|---|---|---|
| `qual-e-o-seu-alinhamento-moral-1` | 29% | 76% | 19% | paraphrased |
| `quao-facilmente-voce-se-deixa-seduzir-...-5` | 30% | 82% | 25% | paraphrased |
| `voce-e-mais-acucar-ou-sal-5` | 30% | 80% | 23% | paraphrased |
| `qual-classe-voce-deve-escolher-5` | 17% | 70% | 40% | paraphrased |
| `quem-e-voce-5` | 30% | 69% | 49% | paraphrased |
| `qual-pokemon-inicial-voce-deve-escolher-5` | 13% | 66% | 42% | paraphrased |
| `que-tipo-de-macaco-voce-e-5` | 20% | 65% | 7% | paraphrased |
| `qual-e-o-seu-alinhamento-moral-5` | 29% | 65% | 24% | paraphrased |
| `qual-casa-voce-deve-escolher-1` | 40% | 61% | 56% | paraphrased |
| `descubra-quao-atraente-voce-e-5` | 22% | 60% | 54% | paraphrased |
| `que-criatura-sobrenatural-guarda-seus-sonhos-5` | 25% | 56% | 43% | paraphrased |
| `qual-e-o-meu-fetiche-...-5` | 0% | 45% | 11% | paraphrased |
| `como-sera-seu-2024-6` | 13% | 41% | 63% | paraphrased |
| `qual-e-a-minha-ideologia-politica-5` | 6% | 43% | 18% | distinct-ish |
| `descubra-se-voce-conhece-bem-o-nosso-planeta-5` | 20% | 41% | 39% | distinct-ish |
| `voce-e-kira-ou-l-5` | 0% | 41% | 0% | distinct-ish |
| `descubra-o-que-as-pessoas-...-atraente-...-5` | 0% | 40% | 5% | distinct-ish |
| `qual-personagem-voce-e-1` | 0% | 35% | 2% | distinct-ish |
| `qual-e-o-meu-estilo-de-apego-5` | 0% | 32% | 0% | distinct-ish |
| `o-que-diz-sua-mensagem-...-biscoito-da-sorte-5` | 0% | 29% | 20% | distinct-ish |
| `quem-e-voce-descubra-seu-arquetipo-6` | 0% | 27% | 0% | distinct-ish |
| `em-que-pais-voce-deve-morar-1` | 0% | 27% | 0% | distinct-ish |

Summary: **0 identical, 13 paraphrased, 9 distinct-ish**. Every duplicate has
**0 plays**; only `que-tipo-de-macaco-voce-e` (the keeper) has any, at 4.

## Judgement needed

This is not a mechanical dedupe. Two defensible reads:

- **Conservative** — retire only the 13 paraphrased ones. They are the clearest
  "same quiz twice" cases and the ones a reviewer would spot.
- **Aggressive** — retire all 22. The identical question counts mean even the
  low-similarity pairs came off the same template, which is the pattern AdSense
  flags as scaled content.

Either way the keeper is the unsuffixed slug, and the retired one should get a
`quiz_slug_redirects` row so its URL 301s rather than 404s.

## Not a problem

- `internet-das-coisas-iot` vs `internet-das-coisas-iot-1777921094606` —
  genuinely different quizzes (PERSONALITY/12q vs TRIVIA/20q). This was the
  **only** timestamp-suffixed slug in the entire database, so the "slug with a
  timestamp" concern is a single row, not a systemic problem.
- One other exact title collision exists between two quizzes with different
  content.

## Applying a decision

`scripts/cleanup-duplicate-quizzes.mjs` archives a reviewed list and writes the
redirects. It is dry-run by default and refuses to touch anything with plays.
Production still runs the Supabase backend, so it targets Supabase — retarget it
at D1 after the cutover.
