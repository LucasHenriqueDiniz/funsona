# AdSense audit — funsona.com — 2026-10-22

Skill: `adsense-site-auditor` (checkout `/Users/maxter/dev/pessoal/adsense-site-auditor`, scripts run from its `.venv`).
Mode: Post-Fix Verification + Repo + Live URL (pre-flight for `docs/plans/adsense-low-value-content/slice-07-recrawl-and-reapply.md`).
Site type: Quiz/Entertainment (quiz rubric applied). Read-only: no repo edit, no deploy, no DB write, no form, no account touched.
Measured 2026-10-22 between 19:30 and 20:00 UTC, from Brazil.

## Decision

**Ready after fixes — do not request review on today's site.**

- Blockers: 1 independent (`ADS-CONTENT-01`, by the quiz rubric's 200-word result bar) plus `ADS-ELIG-03`, which is derived from it.
- High-risk fails: 7. Unknowns that block a `Ready`: 11 (3 auto, 1 judgement, 7 owner).
- Slice 7's own wait has not elapsed either: slice 5's last batch reached production on 2026-10-22, so the two-week minimum ends on 2026-11-05 at the earliest.

## Decidability counts (81 IDs)

| class | IDs | Pass | Fail | Unknown | N/A |
|---|---|---|---|---|---|
| `auto` (observed) | 35 | 28 | 4 | 3 | 0 |
| `judgement` (assessed) | 34 | 27 | 5 | 1 | 1 |
| `owner` (attested) | 12 | 3 | 0 | 7 | 2 |
| **total** | **81** | **58** | **9** | **11** | **3** |

`Ready` needs every `auto` at Pass (3 Unknown, 4 Fail), every `judgement` reviewed (done, 5 Fail, 1 Unknown) and every `owner` answered (7 open).

## Pre-flight gate

| item | result | evidence |
|---|---|---|
| 1. Site completeness (ADS-COMPLETE-01) | Pass (0 of 4 conditions fail) | `check_completeness.py`: About 494 visible words, Contact 248 + form, no unfinished markers on home, 15 of 15 nav links answer 200 on an honest-404 host. Exit 0 |
| 2. Publisher identity (ADS-AUTHOR-01) | Pass | `/about`: "O FunSona é criado e mantido por Lucas Henrique Diniz Ostroski", links to `lucashdo.com` (200) and `github.com/LucasHenriqueDiniz` (200), `support@funsona.com` |
| 3. Minimum content (ADS-COMPLETE-02) | **High risk** (soft gate, continue) | 3 guides at 861, 986, 1050 main-content words, all below 1200 |
| 4. Bulk page sample (ADS-CONTENT-03) | Pass | all 66 sitemap quiz URLs measured, not a sample of 10: 66/66 PASS, min 763, median 1321.5, max 1896 words |

Pre-flight: 0 Blockers → full audit run.

## Blockers

- **ADS-CONTENT-01** — Fail by the quiz rubric (`references/quiz-site-rubric.md`, step 4: "If <50% pass, flag ADS-CONTENT-01 as Fail"). The rubric's "Result pages unique" pass criterion is 200+ words per result. Live HTML of the 66 core quizzes: 412 outcomes, min 151, median 165, max 265 words; **405 of 412 (98.3%) are 151–199**; only 2 of 66 quizzes have every outcome at 200+. Every other rubric check passes (10 questions on 66/66, own covers on 66/66, cross-quiz boilerplate 11.9% mean). Basis caveat: the 200 is the rubric's heuristic, Google publishes no word count, and the project's own bar is 150 (pitch). Fix: either lengthen 405 outcomes by 1–49 words each, or the owner accepts 150 as the bar in writing and this row is re-decided.
- **ADS-ELIG-03** — Fail, derived: "comply with C–H" cannot pass while ADS-CONTENT-01 fails. Same fix.

## High risks

- **ADS-COMPLETE-02** — 3 guides, all under 1200: `/guides/categorias-de-quiz-mais-populares-explicadas` 861, `/guides/como-criar-um-bom-quiz-de-personalidade` 986, `/guides/como-funciona-a-pontuacao-dos-quizzes` 1050 (`analyze_text_depth.py --min-words 1200`, exit 1). Identical to the 2026-10-18 figures: slice 6 is still `todo`.
- **ADS-CONTENT-ADDED-VALUE** — no guide links a single core quiz (the only `/quiz/` href in each is `/quiz/new`); none uses an example from the 66 rewritten quizzes. The categories guide explains 8 categories, 4 of which list 0 quizzes live.
- **ADS-CONTENT-04** — 4 of 8 category pages render "0 quizzes encontrados … Nenhum quiz encontrado": `/explore/trivia`, `/explore/games`, `/explore/music`, `/explore/knowledge`. All 4 are in `sitemap.xml`, carry `adsbygoogle.js?client=ca-pub-2600827684802809`, and Trivia and Games are linked from the mobile menu and footer. Also `/leaderboard` (main-nav "Ranking", no `noindex`) lists test accounts by name: "abc", "dasasdasd" (@lucashdo2), "VEI POTRICA".
- **ADS-CONTENT-03** — list and utility pages below the 300-word bar: 6 of 8 category pages 260–284 words (trivia 274, games 261, movies 282, music 260, tv 284, knowledge 260); `/search` 3 words and listed in the sitemap with no `noindex`; `/guides` index 110 words with the AdSense loader. Quiz pages pass (see gate item 4).
- **ADS-UX-02** — taxonomy does not match content: all 66 core quizzes print "Personalidade" as their category, `/explore` says "66 quizzes encontrados", `/explore/personality` says "24 quizzes encontrados", and `/explore/games` is empty while the core holds PC, PS4, Overwatch, Diablo Immortal, Genshin and Resident Evil 4 quizzes.
- **ADS-PUB-05** — claims a reviewer can refute (`apps/web/src/pages/about.astro:50-51`): "Hoje o catálogo reúne centenas de quizzes de personalidade e trivia" against 66 listed and 0 trivia listed; "a interface está disponível em português, inglês e espanhol" against `/en` 404 and `/es` 404 and no language switcher in the public HTML. Quiz bylines read "Equipe FunSona @admin" while About names one person. Section G says a match is "normally a Blocker"; classified High because these are stale counts, not deception about identity or product. Two-line text fix.
- **ADS-PUB-10** — play screen at 375×812, `/quiz/que-arma-voce-tem-descubra-sua-arma-interior/play`: "Próxima" button bottom 1020 px, "Publicidade" label 1040 px, `<ins data-ad-slot="3283542953">` 1061 px, i.e. **41 px between the button a player taps 10 times and the ad**. The unit did request (`data-adsbygoogle-status="done"`, `data-ad-status="unfill-optimized"`, 368 px reserved). Google's Ad placement policies: "Be careful when placing links, play buttons, download buttons, navigation buttons … near ads because they might lead to accidental clicks", and "Even if the layout unintentionally leads to accidental clicks, publishers may still receive a violation notification." The project's own landing rule is ≥150 px from Play; the play screen does not apply it. The play page is `noindex`, so this is an ad-serving risk more than a review risk.

## Unknown with evidence (need an answer before `Ready`)

- **ADS-PROG-06 / ADS-PUB-11** — the loader is on pages with no manual slot (home, `/explore`, all 8 categories, `/guides`). On `/explore/trivia` (0 quizzes) the loader created `<ins class="adsbygoogle adsbygoogle-noablate" … data-ad-status="unfilled">` and sent `googleads.g.doubleclick.net/pagead/ads?…format=0x0…ifi=1`, plus a `gen_204?id=ach_evt&tn=HEADER` measurement of the fixed header. The same pair fires on quiz landings before the manual slot hydrates. This is consistent with page-level (Auto ads / overlay) logic running for the publisher; it does not prove Auto ads is on. If it is, an overlay ad can serve on an empty listing. Owner checks AdSense → Ads → By site → funsona.com, including overlay formats.
- **ADS-PRIV-04** — `fundingchoicesmessages.google.com/i/ca-pub-2600827684802809` loads on every loader page and Consent Mode v2 defaults to denied (`Layout.astro:108-114`); the EEA/UK message itself only renders for EEA/UK IPs and could not be seen from Brazil.
- **ADS-CRAWL-06** — DNS, TLS and response time pass (home 842 ms); uptime needs monitoring history, one run cannot observe it.

## Observations that are not requirement fails

- Archived quizzes answer **302 → `/404`**, which answers 404: 10 of 10 sampled from `scripts/adsense-core/seed-tail.csv`. Same for an invented slug and for `/explore/does-not-exist`. Not a direct 404/410.
- Non-core published quizzes are correctly isolated: 6 found by the crawl (e.g. `/quiz/internet-das-coisas-iot`, `/quiz/quizz-juju-e-miguel-mv4ocfl6`), all `noindex, follow`, 0 loader, 0 slot. `/play` pages of core quizzes are `noindex, follow` with 1 slot.
- `quizhub.com.br` answered **429** with `x-vercel-mitigated: challenge` to all 6 requests (home, www, two quiz paths, sitemap, ads.txt). Not bypassed; stays an owner question.
- Overlap measurement limit: quizpanda.com served English to the fetch (783 words, 0 Portuguese markers), so 5-gram overlap cannot detect translation from the original catalogue. The 0.0x% against quizpanda pages is not evidence about translation.

## Owner-only questions

1. Auto ads for funsona.com: on or off, and are overlay formats (anchor, vignette, side rail) off? (ADS-PROG-06, ADS-PUB-11)
2. Does `quizhub.com.br` serve the same catalogue, and under which AdSense account? (ADS-CONTENT-02 context, slice 7)
3. Is any part of the site or account tagged child-directed? Assessed here as general audience: Terms require 13+ for an account, the core includes breakup, marriage and 18+ cocktail quizzes; the community quiz "Quizz Juju e Miguel" is `noindex` with no ad code. (ADS-PRIV-06)
4. Is the European regulations (EEA/UK) message published in Privacy & messaging? (ADS-PRIV-04)
5. Accept 150 words as the outcome bar instead of the rubric's 200? Decides ADS-CONTENT-01.
6. Current Sites status line (last recorded 2026-10-18: "Requires attention — Low value content"). (ADS-SITE-01)
7. Account facts: holder 18+ and eligible (ADS-ELIG-01); pub-2600827684802809 is the only AdSense account (ADS-ELIG-02); no clicks on own ads (ADS-PROG-01); no paid/exchange traffic (ADS-PROG-04); no audience lists or remarketing built from the site (ADS-PRIV-08); personalized ads on, with rights to the audience data (ADS-PRIV-10).
8. Search Console: indexed quiz pages trending to 66 and "Excluded by noindex" rising (slice 7 pre-flight; no API).

## Exhaustive checklist

| ID | class | Status | Evidence | Next action |
|---|---|---|---|---|
| ADS-ELIG-01 | owner | Unknown | Not answered in this run | Owner confirms |
| ADS-ELIG-02 | owner | Unknown | Live account id pub-2600827684802809 in loader and ads.txt; uniqueness not attestable | Owner confirms |
| ADS-ELIG-03 | judgement | Fail | Derived from ADS-CONTENT-01 | Resolve ADS-CONTENT-01 |
| ADS-ELIG-04 | auto | Pass | Own domain on Cloudflare (`server: cloudflare`), not Blogger/YouTube | — |
| ADS-OWN-01 | owner | Pass | Repo `apps/web/src/layouts/Layout.astro:134-137` emits the loader seen live; deploy is Cloudflare Pages Git integration (research 2026-10-20) | — |
| ADS-OWN-02 | owner | Pass | ads.txt on the domain names the publisher; site already reviewed by AdSense (pitch, 2026-10-18 status) | — |
| ADS-OWN-03 | auto | Pass | Quiz landing and /play render in a browser, 0 console errors, islands hydrate | — |
| ADS-SITE-01 | owner | Unknown | Dashboard not accessible; last recorded "Requires attention — Low value content" | Owner pastes status |
| ADS-SITE-02 | owner | Pass | `/ads.txt`: `google.com, pub-2600827684802809, DIRECT, f08c47fec0942fa0`; pitch records ads.txt authorized | — |
| ADS-TXT-01 | auto | Pass | ads.txt line matches `data-ad-client="ca-pub-2600827684802809"` | — |
| ADS-TXT-02 | auto | Pass | ads.txt published, 1 line | — |
| ADS-CONTENT-01 | judgement | **Fail (Blocker)** | Rubric: 405/412 outcomes 151–199 words (<200); 2/66 quizzes fully pass | Lengthen or owner accepts 150 bar |
| ADS-CONTENT-02 | judgement | Pass | SERP overlap 10/10 quizzes <40% (max 0.37%, 54 sources); internal max containment 23.6%; 66/66 covers on api.funsona.com; questions and outcomes rewritten (slice 4/5) | — |
| ADS-CONTENT-03 | auto | Fail (High) | Quiz pages 66/66 ≥ bar; 6/8 categories 260–284, /search 3, /guides 110 | Add category prose; drop /search from sitemap or noindex it |
| ADS-CONTENT-04 | auto | Fail (High) | 4/8 categories "0 quizzes encontrados", in sitemap with loader; /leaderboard shows test accounts | Fill or hide empty categories; clean leaderboard |
| ADS-CONTENT-05 | auto | Pass | 1 manual slot per quiz landing (66/66), 1 on /play, 1 on result; 0 slots on listings; content 763–1896 words | — |
| ADS-CONTENT-06 | auto | Pass | `<html lang="pt">`, pt-BR text | — |
| ADS-CONTENT-07 | judgement | Pass | Comments carry a report action (`CommentSection.tsx:94`); API shows 0 comments on top quiz; community quizzes noindex, no ad code | — |
| ADS-CONTENT-08 | judgement | Pass | No doorway pattern; note 23/66 slugs keep "descubra"-style keyword tails and differ from the H1 (e.g. `qual-console-de-jogos-e-voce-5`) | Optional |
| ADS-UX-01 | judgement | Pass | 15/15 nav links 200; mobile menu opens and lists all sections | — |
| ADS-UX-02 | judgement | Fail (High) | Games/Trivia in nav are empty; all 66 labelled "Personalidade"; /explore/personality "24" vs /explore "66" | Fix categories |
| ADS-UX-03 | judgement | Pass | No fake buttons, no ads in nav positions, no unexpected redirects | — |
| ADS-UX-04 | auto | Pass | No popups/redirects observed; scripts: Clerk, GA4, AdSense; mobile overlay is `pointer-events-none` opacity 0 | — |
| ADS-UX-05 | auto | Pass | `check_completeness.py`: About, Contact pass; /privacy 512 words, /terms 431 | — |
| ADS-UX-06 | judgement | Pass | Every unit labelled "Publicidade", in its own block | — |
| ADS-CRAWL-01 | auto | Pass | `crawl_site.py --depth 3 --max-pages 250`: 182/182 pages 200, not truncated | — |
| ADS-CRAWL-02 | auto | Pass | robots.txt allows Mediapartners-Google, Googlebot, AdsBot at `/`; crawl ran as Mediapartners-Google | — |
| ADS-CRAWL-03 | auto | Pass | Ad pages are GET; only POST is quiz finish (`QuizPlay.tsx:204`) | — |
| ADS-CRAWL-04 | auto | Pass | Max 1 hop, stateless verified; www→apex 301, http→https 301 | — |
| ADS-CRAWL-05 | auto | Pass | 182 pages with canonical, stable across two sessions; `?sort=` variants canonicalise to the category | — |
| ADS-CRAWL-06 | auto | Unknown | DNS, TLS, 842 ms pass; uptime not observable | Monitoring |
| ADS-CRAWL-07 | auto | Pass | sitemap via robots.txt, 81 URLs (66 quiz), 5/5 sample 200 | — |
| ADS-PROG-01 | owner | Unknown | — | Owner confirms |
| ADS-PROG-02 | auto | Pass | Only copy near units is "Publicidade"; no click prompts | — |
| ADS-PROG-03 | judgement | Pass | Neutral label, units visually separated | — |
| ADS-PROG-04 | owner | Unknown | — | Owner confirms |
| ADS-PROG-05 | auto | Pass | `AdSlot.tsx`: standard `<ins>` + `adsbygoogle.push({})`, no modification | — |
| ADS-PROG-06 | auto | Unknown | Manual slots only on content pages; loader on listings sends a page-level 0x0 request on an empty category | Owner answers Auto ads |
| ADS-PROG-07 | owner | N/A | Website only, no app/WebView | — |
| ADS-PUB-01 | judgement | Pass | Entertainment quizzes, no illegal topics | — |
| ADS-PUB-02 | judgement | Pass | Covers are scenes without characters or logos (Sanrio, Disney, Mushoku Tensei checked); non-affiliation disclaimer on every quiz | — |
| ADS-PUB-03 | judgement | Pass | No hate/harassment; 0 matches for self-harm terms across 66 pages | — |
| ADS-PUB-04 | judgement | Pass | None | — |
| ADS-PUB-05 | judgement | Fail (High) | About: "centenas de quizzes", "português, inglês e espanhol" vs 66 listed, /en and /es 404 | Edit about.astro:50-51 |
| ADS-PUB-06 | judgement | Pass | No lead forms or offers; contact form only | — |
| ADS-PUB-07 | judgement | Pass | None | — |
| ADS-PUB-08 | judgement | Pass | Soulmate quizzes framed with adults ("já adultos", "personagem adulto da Disney"); cocktail quiz "para maiores de 18 anos"; 0 sexual terms | — |
| ADS-PUB-09 | auto | Pass | ads.txt and ad client agree; site identity consistent | — |
| ADS-PUB-10 | auto | Fail (High) | Play ad 41 px below "Próxima" on mobile | Move it ≥150 px or out of the control column |
| ADS-PUB-11 | judgement | Unknown | Depends on Auto ads (loader on empty listings) | Owner answers Auto ads |
| ADS-PUB-12 | auto | Pass | Units in content flow; desktop play unit sticky 300 px sidebar | — |
| ADS-PUB-13 | judgement | Pass | No election/health/climate claims | — |
| ADS-PUB-14 | judgement | Pass | Generated covers are scenery, no public-concern topics | — |
| ADS-PUB-15 | judgement | Pass | Waifu and DxD archived; remaining romance quizzes non-physical, adult versions | — |
| ADS-PUB-16 | judgement | Pass | No crisis content | — |
| ADS-REST-01 | judgement | Pass | 0 matches for sexo/sexual/sensual/erótic(a/o) in 66 pages | — |
| ADS-REST-02 | judgement | Pass | "sangue" only in lore context (6 pages), no gore | — |
| ADS-REST-03 | judgement | Pass | Weapon quiz is symbolic (espada, arco, escudo, pena); 0 firearm terms | — |
| ADS-REST-04 | judgement | Pass | 0 drug terms | — |
| ADS-REST-05 | judgement | Pass | Cocktail quiz: no sales, labelled 18+; expect restricted demand | — |
| ADS-REST-06 | judgement | Pass | No gambling ("apostar" only figurative, 2 pages) | — |
| ADS-REST-07 | judgement | Pass | None | — |
| ADS-REST-08 | auto | Pass | No video, no unit overlaps content | — |
| ADS-PRIV-01 | auto | Pass | /privacy (updated 18/10/2026) covers cookies, IP, identifiers, AdSense, GA; footer link | — |
| ADS-PRIV-02 | auto | Pass | "Fornecedores terceiros, incluindo o Google, usam cookies…" + links to google.com/settings/ads and aboutads.info | — |
| ADS-PRIV-03 | auto | Pass | No PII in URLs; GA `anonymize_ip`, `allow_google_signals: false` | — |
| ADS-PRIV-04 | auto | Unknown | Funding Choices loads; EEA message not observable from BR | Owner confirms message |
| ADS-PRIV-05 | auto | Pass | 0 `geolocation` in apps/web/src and apps/api/src | — |
| ADS-PRIV-06 | judgement | Pass | General audience; Terms 13+ | Owner confirms account setting |
| ADS-PRIV-07 | auto | Pass | 0 `document.cookie` writes in apps/web/src; no proxy code | — |
| ADS-PRIV-08 | owner | Unknown | No remarketing tag seen, GA signals off | Owner confirms |
| ADS-PRIV-09 | owner | N/A | Site does not advertise housing/employment/credit; no Ads conversion tag | — |
| ADS-PRIV-10 | owner | Unknown | Opt-out links present | Owner confirms |
| ADS-COMPLETE-01 | auto | Pass | 0 unfinished markers on home, 0 broken nav links | — |
| ADS-COMPLETE-02 | auto | Fail (High) | 861 / 986 / 1050 | Slice 6 |
| ADS-AUTHOR-01 | judgement | Pass | Real name on /about with site and GitHub | — |
| ADS-AUTHOR-02 | auto | Pass | mailto + contact form | — |
| ADS-AUTHOR-03 | auto | Pass | lucashdo.com 200, GitHub 200 | — |
| ADS-CONTENT-ORIGINAL | judgement | N/A | No public tool pages; quiz creator `/quiz/new` 302s to login and carries no ad code | — |
| ADS-CONTENT-ADDED-VALUE | judgement | Fail (High) | 0 core quizzes linked from guides; generic advice | Slice 6 |
| ADS-CONTENT-OVERLAP | auto | Pass | 10 top-clicked core quizzes × 5–6 SERP results (54 texts), `compare_against`: max 0.37%, all in the <40% band. Cross-language limit noted | — |

## Completeness check

- Requirement IDs in reference: 81 (`awk '/^## M\./{exit} /^\| ADS-/{print $2}'`)
- Requirement IDs in this report's checklist: 81
- Missing IDs: none

## Evidence files (this directory)

| file | what |
|---|---|
| `check_technical.txt` | exit 0 |
| `check_completeness.txt` | exit 0 |
| `crawl_site.txt` | depth 2, stopped at 50 pages (MISS) |
| `crawl_site_full.txt` | depth 3, 182 pages, exit 0 |
| `text_depth_quizzes.txt` | 66 quiz URLs, exit 0 |
| `text_depth_guides.txt` | 3 guides at 1200, exit 1 |
| `text_depth_other.txt` | home, explore, categories, search, guides index, trust pages, exit 1 |
| `check_duplicates.txt` | 11 quizzes, no groups; OVERLAP MISS by design |
| `pairwise_quiz.txt` | all 2,145 quiz pairs, 5-gram |
| `quiz_scan.json` | per-quiz outcomes, words, image hosts, slots |
| `overlap_serp.json`, `overlap_serp2.json` | SERP overlap, per source |
| `raw/` | fetched HTML (sitemap, pages, quizzes) |
