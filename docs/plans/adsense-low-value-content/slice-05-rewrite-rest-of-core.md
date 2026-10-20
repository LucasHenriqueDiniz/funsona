---
status: doing
---

# Slice 5 — The rest of the core, in batches

Pitch: [[adsense-low-value-content]].

## Delivers

Every quiz with `ads_eligible = 1` meets the slice 4 bar, through the same draft → review → apply
path, in batches of 10. Each batch is a deploy of its own. The slice is done when the report covers
the whole core.

A quiz the owner decides is not worth rewriting leaves the core instead: `ads_eligible = 0`, and a
reason line in `core.csv`. The core shrinks rather than carrying a thin quiz into the review.

### Batch 2 drafted (2026-10-19)

Ten drafts: keep rows 11–20 of `core.csv`, minus one, plus row 21.

**Held back:** `qual-garota-de-anime-e-o-seu-verdadeiro-amor-descubra-sua-waifu-ideal`. It is a
"your ideal romantic partner" quiz built on anime characters, several of them teenagers and one from
an ecchi series. With romantic framing, that sits against the child-sexualization policy, the most
severe one AdSense has. The proposal to the owner is the same treatment as the three sensitive
quizzes: out of the core. `qual-time-da-nfl-…` (row 21) took its place.

**Within the drafts:** Hisoka was left out of the Hunter x Hunter quiz. Canon gives him an unsettling
interest in child characters. Biscuit Krueger takes the slot.

**A template signature, measured and reduced.** Across the 20 drafts of batches 1 and 2, cross-quiz
text overlap was negligible: 5-gram Jaccard mean 0.02%, max 10.5%, which is the shared helpline
sentence in the two relationship quizzes. But "O desafio de/do…" opened the last paragraph of 54 of
109 outcomes, and inside one quiz page, where every outcome shows together, that reads as a form.
Batch 2's openers were rewritten by hand: 40 sentences, down to 9 of 57.

Batch 1, already in production, still carries the pattern. Re-applying it with varied openers needs
the owner's go.

| check | result |
|---|---|
| `check.mjs` on batch 2 | 10 ok. The opener edit pushed one Steelers outcome to 149 words, so it was lengthened |
| applied to the local copy, then `report.mjs --target local` | 10 of 10 meet the bar |
| four batch 2 pages from the local web app | new intro present, 0 third-party media in the quiz body |

### Batch 2 in production, batch 1 re-applied, waifu archived (2026-10-19)

**The owner's three answers in chat:**
- write batch 2 as it is;
- archive the waifu quiz;
- vary batch 1's openers and re-apply.

As with batch 1, the agent set `reviewed: true`, with no owner edits.

**Batch 1 openers.** 19 sentences rewritten by hand where an opener repeated inside one quiz: "O
risco" ×5 in the weapons quiz, "O lado sombrio" ×5 in Magic, "O desafio" ×4 in Demon Slayer, and a
few more.

**Before the writes:**
- export at 02:18 UTC, restored: 775 rows, 82 published, 70 curated;
- Time Travel bookmark `00006661-00000000-00005109-05bc3533743cdc8c98ddd3dc6ddeba0f`.

**The writes:**
- `apply.mjs --target remote` on 20 drafts: the 10 of batch 1 again, plus the 10 of batch 2;
- `scripts/adsense-core/archive-waifu.sql` (status `ARCHIVED`, flag 0). Wrangler reported
  `changes: 2` for the one row; the counts below show one quiz moved.

| check, right after | result |
|---|---|
| D1 by status and flag | PUBLISHED flag=1 **69** · PUBLISHED flag=0 12 · ARCHIVED 694 |
| `report.mjs --target remote` on the whole core | **20 of 69** meet the bar |
| same report against the pre-write export, on the 20 | 16 changed. The other 4 are the batch 1 quizzes whose openers were not touched (werewolf, ex, breakup, horsemen), so they equal the export, as expected |
| the 20 pages on funsona.com (browser) | **20 of 20**: new text found, indexed, loader present, 0 third-party media in the quiz body |
| waifu quiz | 404 at `/404`; not in the sitemap |
| `sitemap.xml` quiz URLs | **69** |

Next: batch 3, keep rows 22 onwards of `core.csv`.

### Batch 3 drafted (2026-10-20)

Ten drafts: keep rows 22–31 of `core.csv`, minus one, plus row 32. A read-only `SELECT` on remote
D1 confirmed all eleven candidates `PUBLISHED` with `ads_eligible = 1`. The local copy behind the
checks below was loaded from a full remote export taken at 12:35 UTC: 694 archived, 12 published
unflagged, 69 published flagged, the same as production.

**Held back, then archived by the owner:** `que-personagem-dxd-do-ensino-medio-sou-eu`. High School
DxD is an ecchi series about high-school students, and the live quiz leans on that framing:
"sedutora", "atrair olhares", a question about your love life. The owner asked whether a clean
"which character are you" rewrite would do. It would fix the text but not the page's subject, and
the quiz had 1 click. The owner chose to archive it, as with the waifu quiz:
`scripts/adsense-core/archive-dxd.sql`, run with the batch 3 write. `core.csv` now marks it and the
waifu quiz `drop` with the reason. That shifts the keep-row numbers above, so the next batch is
pointed at by slug. `sera-que-conseguimos-adivinhar-seu-personagem-favorito-de-star-wars` (row 32)
took its place.

**Within the drafts,** the same screen as Hisoka in batch 2:
- Orochimaru left the Naruto arch-enemy quiz. Canon has him kidnapping children and experimenting on
  them.
- Dio Brando left the JoJo quiz. In the first part, he forcibly kisses a child to humiliate the
  hero.

**Rewritten whole, not trimmed:**
- The Japanese-name quiz had 60 outcomes and answers like "Opção visual A" with no image behind them.
  It now has 8 real names, each with its kanji, its meaning and which genders use it.
- JoJo went from 10 outcomes to 8.
- The girlfriend quiz takes its own angle: the reader's own jealousy and control, not only the
  partner's. Every one of its four results points to 190, and the last one also points to CVV 188,
  the Central de Atendimento à Mulher 180, and the UBS for a reader who sees the controlling is
  theirs.

**Review pass, after drafting.** The `quiz-authoring` skill reached this session after the drafts
were written. It asks for a canon check per franchise and one adversarial read, so both ran on the
finished drafts: four `general-purpose` subagents checked facts against the fandom wikis and
Wikipedia, and a fifth read the whole batch as a hostile reviewer. One finding was serious, the
safety routing in the girlfriend quiz; the rest was smaller, and nearly all of it was real:

| found | count | example | fix |
|---|---|---|---|
| canon or fact wrong or imprecise | 25 | a name-quiz intro said one sound could mean "sky, happiness or snow"; Shikamaru's shadow "without spending energy"; Iron Man's cave is the 2008 film, not the comics | each sentence rewritten to what the source says |
| lines breaking the quiz's own spoiler promise | 7, in JoJo and Star Wars | JoJo's time stop, revealed at the end of part 3; lines hinting at Vader's redemption | rewritten or swapped |
| safety routing in the girlfriend quiz | 1 | three abuse answers plus four "conversa" answers landed on "Falta uma conversa franca", which advised talking and had no safety pointer | abuse answers weigh 3, every result points to 190, the last one leads with safety |
| answers scoring the wrong outcome, or saying the opposite | 3 | "boas fotos para postar" scored envy, not vanity; "Orgulho de admitir que me importo" | relabelled |
| template feel | | the reader counted 21 of 61 results closing on "your trait stays, it only gains X"; 4 questions repeated word for word across quizzes; all 10 descriptions shaped "[lista]? Responda dez perguntas…" | 10 closings, the 4 questions and all 10 descriptions rewritten |
| answers that assume a male reader | 19 | "Fico ofendido", "eu estava certo", "Sensato e equilibrado" | neutral forms |

**Template signature,** measured with a scratch script, not committed:
- openers: the first two words of an outcome's second and last paragraphs, repeated inside one quiz;
- overlap: 5-gram Jaccard between outcomes of different quizzes.

The second paragraph is new to the measure. With the last paragraph varied, "Como ele, você…"
opened the second paragraph of 7 of 8 JoJo outcomes, and "Combina com você porque…" all 8 of the
name quiz. 40 sentences were rewritten by hand.

| measure | batches 1 + 2 (20 drafts, 109 outcomes) | batch 3 (10 drafts, 65 outcomes) |
|---|---|---|
| outcomes sharing a second- or last-paragraph opener inside their quiz | 77 | **0** |
| last paragraphs opening with "O desafio…" | 14 | **0** |
| 5-gram Jaccard per outcome pair across quizzes | mean 0.017%, max 11.4% (5,621 pairs) | mean 0.005%, max 1.1% (8,979 pairs touching batch 3) |
| 5-gram overlap, girlfriend quiz against the boyfriend quiz in production | | 9 of 1,461 shared |

Batch 2 reported 0.02% and 10.5% for the same twenty drafts. The recount differs slightly in the
maximum and agrees on the cause: the boyfriend and husband helpline paragraph.

All numbers below are after the review pass.

| check | result |
|---|---|
| `check.mjs` on batch 3 | 10 ok: 151–265 words per outcome, 10 questions each, every rule but `reviewed` |
| `apply.mjs --target local` on the drafts themselves | refused, 10 of 10, nothing written: `reviewed` is false |
| local-only `reviewed: true` copies → `apply.mjs --target local` | written |
| `archive-dxd.sql` on the local copy | published flagged 69 → 68; the DxD page redirects to `/404`; local sitemap 68 quiz URLs |
| `report.mjs --target local --baseline <the 12:35 export>` on the 10 | **10 of 10** meet the bar, all changed |
| `report.mjs --target local` on the whole core | 30 of 68 |
| `render.mjs` on the 10 pages from the local web app | **10 of 10**: title, intro 3/3, every outcome, 0 third-party media in the quiz body |
| same check on an untouched core quiz (cheese), as a negative control | FAIL: intro 0/3, 1 quizpanda image in the body |

Every page still shows 2 quizpanda images further down, in the "Mais para jogar" cards. They are
covers of core quizzes not yet rewritten (cheese, PC game), so they leave as later batches land.

For the image step (slice 5b): Milim Nava looks about 14 in canon and dresses in a swimsuit-like
outfit, and Jolyne's prison scenes include sexual content. Neither is in the text. Any image for
those outcomes should be an emblem or a theme, never the character.

### Batch 3 in production, DxD archived (2026-10-20)

**Approval.** The owner wrote in chat: "pode gravar". As in batches 1 and 2, the agent set
`reviewed: true` on the 10 drafts as written after the review pass, with no owner edits. Archiving the
DxD quiz was the owner's earlier answer in the same conversation ("vamos tirar ele então").

**Before the writes:**
- `wrangler d1 export --remote --table quizzes` at 14:17 UTC, restored and counted: 775 rows, 81
  published, 69 curated;
- Time Travel bookmark `00006a03-00000000-0000510a-0a1fab0759f5f93a7ea55484f471e591`.

**The writes:**
- `apply.mjs --target remote` on the 10 drafts, one per call;
- `scripts/adsense-core/archive-dxd.sql`.

| check, right after | result |
|---|---|
| D1 by status and flag | PUBLISHED flag=1 **68** · PUBLISHED flag=0 12 · ARCHIVED 695 |
| `report.mjs --target remote --baseline <the 14:17 export>` on the 10 | **10 of 10** meet the bar, all changed |
| `report.mjs --target remote` on the whole core | **30 of 68** meet the bar |
| `render.mjs https://funsona.com` on the 10 | **10 of 10**: title, intro 3/3, every outcome, 0 third-party media in the quiz body |
| the 10 pages in the browser | **10 of 10**: new title, intro and last outcome on screen, AdSense loader present, 0 third-party images above "Mais para jogar" |
| robots on the 10 | no robots meta (indexable). A flag-0 page, `internet-das-coisas-iot`, shows `noindex, follow` and no loader, so the check can tell them apart |
| DxD quiz | 302 to `/404`; not in the sitemap |
| `sitemap.xml` quiz URLs against D1 `PUBLISHED` and `ads_eligible = 1` | 68 = 68, the same slugs (`diff` empty) |

Next: batch 4, starting at `qual-personagem-sanrio-voce-e-descubra-seu-personagem-sanrio-favorito`
and taking the next `keep` rows of `core.csv`. Four of the remaining 38 need the same screen as DxD
before any drafting: the Naruto and Harry Potter "soulmate" quizzes (a romantic match among teenage
characters), the Disney soulmate quiz (several princesses are teenagers), and "Que tipo de atração
você desperta nos outros?", which is close to the attractiveness quiz the owner already removed.

### Batch 4 drafted (2026-10-20)

Ten drafts: the next `keep` rows of `core.csv` from
`qual-personagem-sanrio-voce-e-descubra-seu-personagem-sanrio-favorito`, minus one. A read-only
`SELECT` on remote D1 confirmed all eleven candidates `PUBLISHED` with `ads_eligible = 1`. The local
copy was rebuilt from a full remote export at 14:22 UTC, after batch 3: 695 archived, 12 published
unflagged, 68 published flagged, 30 of 68 at the bar.

| quiz | outcomes |
|---|---|
| Sanrio | 8 |
| stinky cheeses | 6 |
| My Hero Academia, class 1-A | 7 |
| superhero codename | 8, down from 36 |
| Resident Evil 4 | 6 |
| RPG class | 8 |
| Pokémon Unite | 10, down from 25 |
| The Lion King | 7 |
| game console | 5, up from 3 |
| love or friendship | 4 |

**Held back, proposed out of the core:** `como-sou-atraente-teste-de-atracao-e-autoconfianca`. It asks
the reader's height, face, body, hair and eye colour to score how attractive they are, which is close
to the attractiveness quiz the owner already removed. `e-amor-ou-amizade-desvende-suas-verdadeiras-emocoes`
took its place.

**Canon checked before drafting this time.** Five `general-purpose` subagents read the fandom wikis,
Wikipedia and official sites (sanrio.co.jp, unite.pokemon.com) for every character, item and date, and
returned red flags the drafts then stayed clear of:
- My Hero Academia: the cast are 15; no Mineta, no romance, no detail of Todoroki's family; seasons 1–2 only.
- Resident Evil 4, rated 18 in Brazil: no gore, no character fates; Ada described by competence, not looks.
- The Lion King: Mufasa's death is never described.
- Sanrio: Aggretsuko from Sanrio's official profile only; Gudetama is lazy, never depressed.
- Love or friendship: built on Sternberg's triangular theory of love (1986), nothing sexual, since teenagers read it.

**Rewritten whole, not trimmed.** The superhero quiz had 36 English codenames ("The Torturess",
"Lifesucker") and a first question asking the reader's gender. It now gives 8 Portuguese codenames
that suit anyone, each tied to a power archetype and the comics heroes behind it. Pokémon Unite went
from 25 outcomes to 10, two per official role: seven questions set the role and three set the style.

**Adversarial read, after drafting.** One subagent read the whole batch as a hostile reviewer. All of
it was fixed in the gitignored drafts:

| found | example | fix |
|---|---|---|
| facts overstated | Vieux-Boulogne "in the Guinness"; Pompompurin "back to first place" in 2026 (his second win in a row); Kirishima's self-doubt is a season 4 arc | sentences cut to what the sources say |
| Brazilian names | "Timon e Pumbaa" | "Timão e Pumba" |
| answer logic | "Lembre de quem você é" (Mufasa's line) scored Simba; the Pokémon style question tied "classic" to generation and "bold" to melee | relabelled |
| a promise the page broke | the superhero intro said "any gender" while every result said "Seu nome de herói" and used masculine adjectives | "Seu codinome é", neutral wording |
| answers that assume a male reader | 17, e.g. "Fico furioso", "Ser tratado como criança" | neutral forms |
| cross-quiz formulas | "[X] demais pode…" 11 times; "Quem … às vezes …" 20; the same intro sentence in 7 of 10 | at most one of each per quiz; 5 intros rewritten |
| ties | in the 8-outcome quizzes, a reader who answers consistently tied 19% of the time; QuizPlay breaks ties by question order | below |

**Ties, measured and reduced.** A scratch simulation runs QuizPlay's own tally (stable sort, so the
earliest outcome wins a tie). Each answer now also gives 1 point to the best-fitting outcome absent
from that question. Every outcome gets the same number of those points, so the balance holds.

| quiz | ties for a consistent reader, before → after | reader lands on their own outcome, before → after |
|---|---|---|
| RPG, superhero, Sanrio (8 outcomes) | 19% → 5–7% | 79% → 88–91% |
| My Hero Academia, Lion King (7) | 12% → 5–6% | 87% → 89–92% |
| Resident Evil 4, cheeses (6) | 7–8% → 3–4% | 92% → 93–94% |
| consoles (5) | 5% → 2% | 95% → 96% |

The Pokémon quiz was played end to end on the local web app: always the first answer gives Pikachu,
and the role answers plus the "bold" style answers give Cinderace, as designed.

**Template signature,** same scratch measure as batch 3, against the 30 earlier drafts:

| measure | batch 4 (10 drafts, 69 outcomes) |
|---|---|
| outcomes sharing a second- or last-paragraph opener inside their quiz | **0** |
| last paragraphs opening with "O desafio…" | **0** |
| 5-gram Jaccard per outcome pair across quizzes | mean 0.004%, max 1.6% (14,135 pairs) |

| check | result |
|---|---|
| `check.mjs` on batch 4 | 10 ok: 151–202 words per outcome, 10 questions each, every rule but `reviewed` |
| `apply.mjs --target local` on the drafts themselves | refused, 10 of 10, nothing written |
| local-only `reviewed: true` copies → `apply.mjs --target local` | written |
| `report.mjs --target local --baseline <the 14:22 export>` on the 10 | **10 of 10** meet the bar, all changed |
| `report.mjs --target local` on the whole core | 40 of 68 |
| `render.mjs` on the 10 pages from the local web app | **10 of 10** |

## Needs

- Slice 4's scripts working and gated.
- The owner's review time, which sets the pace. There is no point drafting batches faster than they
  are reviewed.

## Tests

- After each batch, the slice 4 report over the batch: 100% / 100% / 100% / N of N rendered.
- At the end, the same report over the whole core (`ads_eligible = 1`). No quiz under the bar.
- Sitemap = D1 still holds (the slice 2 `diff`), since quizzes may have left the core.

## Done when

```
node scripts/adsense-core/rewrite/report.mjs --target remote
```

prints `---- N of N quizzes meet the bar`, with N equal to the D1 count of `PUBLISHED` and
`ads_eligible = 1`. With no slugs, the script already reports exactly that set. It has no `--where`
flag: given one, it reads the clause as a slug and prints `0 of 0`.

The pages are checked with
`node scripts/adsense-core/rewrite/render.mjs https://funsona.com scripts/adsense-core/drafts/*.json`.
It prints `N of N pages pass`.

## If stuck

If review time runs out, stop adding batches and take the rest out of the core. A smaller site where
every page clears the bar is the bet of the whole pitch, and applying with half-rewritten quizzes
reverses it.
