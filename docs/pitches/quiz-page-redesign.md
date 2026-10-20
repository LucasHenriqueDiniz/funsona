---
tags:
  - pitch
  - area/web
  - area/ux
status: draft
epic: quiz-page
kanban:
---

# Pitch — A quiz page that leads to the quiz

## Problem

The quiz landing page, `/quiz/<slug>`, stacks everything a quiz has, one block after another: a
hero, "Sobre este quiz", every question with every option, every possible outcome in full, the ad
slot, comments, and "Mais para jogar". A reader who lands from Google gets the whole quiz printed out
before playing it.

Measured on 2026-10-20 on `/quiz/que-arma-voce-tem-descubra-sua-arma-interior`, a core quiz already
rewritten in [[adsense-low-value-content]] slice 4, live on funsona.com, in the browser:

| block | words | height, mobile 375×812 |
|---|---|---|
| hero (title, description, Play, like, tags, disclaimer, cover card, author, metadata) | 83 | 1,185 px |
| Sobre este quiz | 155 | 750 px |
| As 10 perguntas, every option listed | 443 | 3,943 px |
| Os 8 resultados possíveis, full text | 1,409 | 6,485 px |
| ad slot | — | 0 px (no ad served while AdSense is not approved) |
| comments + Mais para jogar | 156 | 2,315 px |
| **page** | **2,359** | **14,867 px, 18.3 screens** |

- **Mobile is the page.** 113 of 153 Search clicks in 90 days came from mobile (74%,
  `sitestats gsc funsona --dim device --days 90`, 2026-07-21 → 10-18).
- **The page spoils the quiz.** The questions and their options come first, then every outcome.
  The outcome reveal is the reason anyone plays a personality quiz, and the page uses it up before
  the reader taps Play.
- **Comments start at 12,569 px, screen 15.5 on mobile.** Nobody gets there, and the section renders
  in full on every page while the site has 0 comments.
- **Smaller defects on the same page:**
  - at 1024 px the `lg:text-7xl` title runs under the cover card;
  - with the like count hidden below the threshold, the like button is an empty full-width bar on
    mobile;
  - the metadata repeats itself: a "Personalidade" chip, then "Tipo: Perfil", then "Criado em
    03/11/2025", which is the seed import date;
  - "Mais para jogar" is the same global top 3 by likes on every quiz (`/quizzes?limit=3&sort=likes`),
    though the API already filters by `tag`.

**Why it looks like this.** `d4949e8` (2026-07-31, "Fix AdSense/SEO blockers: publish quiz content")
put the questions and outcomes on the landing page as static HTML, because crawlers and the AdSense
reviewer saw only a title and a blurb. That fixed the crawler problem by putting the content in the
reader's way. **The text matters now:** the outcomes are where slices 4–5 of
[[adsense-low-value-content]] put 150–350 hand-reviewed words each. A redesign that drops them from
the HTML takes back the main thing the AdSense review will read.

Who it is wrong for: the reader from Google, mostly on a phone, who came to play. And the owner,
whose AdSense reviewer lands on this page.

## Solution

**One job above the fold, which is starting the quiz. The reference material sits below it, folded.**

1. **The hero is the quiz.** Full-width banner with the cover, or the gradient when there is none.
   Over it: title, one-line description, a meta line (`10 perguntas · ~3 min · Personalidade`) and
   one Play button. On a 375×812 screen it fits entirely in the first viewport. Author, like and
   report move to one small row under the banner.
2. **Playing opens the questions one at a time, as today,** never as a list. Whether it stays the
   separate `/quiz/<slug>/play` route or opens over the page is open (question 2).
3. **Below the hero, folded and in this order:**
   - **Sobre este quiz.** `intro_content`, the first part visible and the rest behind "ler mais".
   - **Os N resultados possíveis.** Closed by default, with each outcome title visible and its text
     behind a `<details>`. The full text stays in the server-rendered HTML.
   - **The questions list is removed.** The player is where questions belong. It carried 443 words
     of option labels, which are the thinnest text on the page.
4. **Comments collapse to one line when there are none** ("Seja o primeiro a comentar"). The full
   section renders only when there is something to read.
5. **"Mais para jogar" shows curated quizzes that share a tag,** and falls back to the global top 3
   only when there are none.
6. **The small defects go with it:** title overflow, the empty like bar, the repeated metadata.

### What must not change

- **The flag rule from slice 2.** `noindex={!curated} ads={curated}` on the landing, and the
  matching rule on `/play`. One flag decides index, ad code and listings.
- **Outcome and intro text stay in the HTML of `/quiz/<slug>`,** server-rendered. Folding is markup
  and CSS (`<details>`, `line-clamp`). Never a client fetch, never text injected on click.
- **At most one landing ad slot, and never next to Play.** Google asks for content ads to sit at
  least 150 px from the game, and says Play must not lead to an interstitial page dominated by ads
  ([AdSense for content ads on game play pages](https://support.google.com/adsense/answer/2768340)).

## Architecture

No new service. `apps/web/src/pages/quiz/[slug].astro` is 312 lines of one template. It gets split
into Astro components with the same data:

```
/quiz/[slug].astro            SSR; indexed and ad-carrying only when ads_eligible
  ├─ QuizHero.astro           banner, title, description, meta line, Play
  ├─ QuizByline.astro         author, like (island), report (island)
  ├─ QuizAbout.astro          intro_content, first part open
  ├─ QuizOutcomes.astro       <details> per outcome, full text in the HTML
  ├─ AdSlot quiz-landing      after About/outcomes, ≥150 px from Play
  ├─ CommentSection (island)  one line when empty, client:visible
  └─ QuizRelated.astro        curated quizzes sharing a tag, fallback top 3
/quiz/[slug]/play.astro       unchanged, unless question 2 decides otherwise
```

`QuizPlay.tsx` and `QuizResultScreen.tsx` change only if question 2 moves the player onto the
landing URL.

## Schema / Data Changes

None. Everything the page needs is in today's `/quizzes/:slug` payload.

## Interfaces / APIs

| Method | Route / Entry point | Auth | Change |
|---|---|---|---|
| GET | `/quizzes/:slug` | public | none |
| GET | `/quizzes?tag=<t>&limit=4` | public | none. Already supported (`routes/quizzes.ts:138`); the page starts calling it for "Mais para jogar". Must return curated quizzes only, as listings do since slice 2 |
| GET | comments for a quiz | public | none. `CommentSection` already knows when the list is empty |
| — | `/quiz/[slug]/play` | — | unchanged, or folded into the landing (question 2) |

## Scope

### In Scope
- [ ] Hero rebuilt mobile-first: banner, title, description, meta line, one Play
- [ ] Byline row: author, like, report
- [ ] "Sobre este quiz" with the first part open
- [ ] Outcomes folded per outcome, full text kept in the HTML
- [ ] Questions list removed from the landing
- [ ] Comments as one line when empty
- [ ] "Mais para jogar" by shared tag, curated only, with fallback
- [ ] Title overflow at 1024 px, empty like bar, repeated metadata
- [ ] `[slug].astro` split into components
- [ ] The slice 2 flag rule and the ad-distance rule held, and checked
- [ ] Play-screen ad, on `/play`: desktop keeps a sticky sidebar unit, capped at 300 px wide (the
      column is 22rem); mobile gets an inline, non-sticky banner **under the answers**. Today it sits
      between the progress bar and the question, because the sidebar comes first in the DOM
      (`QuizPlay.tsx:284-297`). AdSense allows sticky ads on desktop only
      ([[2026-10-20-folded-content-indexing/research|research]], finding 8)

### Out of Scope
- The question-by-question player (`QuizPlay.tsx`) and its visuals. Only how it opens is in question.
- The result screen (`QuizResultScreen.tsx`).
- **One indexable page per outcome** (`/quiz/<slug>/resultado/<outcome>`). That would add about 400
  pages of 150–350 words while AdSense is judging the site on scale. Revisit after approval.
- New ad formats, interstitials, Auto ads anchors. A mobile ad pinned to the screen is only
  possible as an Auto ads anchor, which Google places, and Auto ads is off.
- Home, Explore and quiz cards.
- en/es layouts beyond what the shared components give for free.
- The quiz editor and community quiz creation.

## Decisions

2026-10-20. Research in
[[2026-10-20-folded-content-indexing/research|2026-10-20-folded-content-indexing]].

| question | decision | by | what it rules out |
|---|---|---|---|
| Order against AdSense | **Before slice 7.** The owner fixes the site, this page included, then requests review | owner | Requesting review on today's page |
| Where the player lives | **`/quiz/<slug>/play` stays.** The play ad stays on a `noindex` URL, the start rate stays measurable from pageviews, and the cost is a 0.3–0.6 s load | agent recommendation, owner asked for it | The player opening over the indexed landing page |
| Outcomes on the landing | **Folded per outcome:** title visible, text in a closed `<details>`, full text in the server HTML | agent recommendation, owner undecided | Outcomes only on the result screen; text fetched on click |

## Research Needed

- [x] **Does text inside a closed `<details>` count?** For Search, yes, when it is in the HTML
      (Google documents accordions as indexed and as not spam). For the AdSense review there is no
      source, so that stays the open risk. Probe after deploy: URL Inspection
      (`sitestats inspect`) on one quiz shows the outcome text in the crawled HTML.
- [x] **Player: separate route or over the page?** Decided: separate route. Was:

      | | `/play` route (today) | over the landing page |
      |---|---|---|
      | navigation | full page load | none; the back button must close it |
      | start rate | already measurable: `/play` pageviews ÷ landing pageviews in GA4 | needs a `quiz_start` event, which nothing sends today |
      | what AdSense sees | the play ad lives on a `noindex` URL | the player's ad would sit on the indexed URL, next to the game |
      | cost | zero | the player becomes an island on the landing page, and history is managed by hand |

      Owner decision, with the start rate measured before and after either way.
- [x] **Outcomes on the landing at all?** Recommended: folded per outcome (see Decisions). Was:
      folded on the landing, open but under the fold, or only on the result screen. The last one is
      the best reveal and removes 1,409 words from the page AdSense reads.
- [ ] **Mockup before code.** One mobile and one desktop mockup of the new landing for the owner to
      pick from, before slice 1. A browser page is enough. A Figma file is not required.
- [x] **Sequencing with AdSense.** Decided: before [[slice-07-recrawl-and-reapply]]. It touches no
      database rows, so it can ship between slice 5 batches.

## Testing Strategy

The test is the live page on a phone-sized viewport, measured before and after on the same quizzes.
Today's figures are the baseline in the Problem table.

- **Length.** At 375×812, the page height and the screen where comments start, on the same 5 core
  quizzes. Before: 18.3 screens, comments at 15.5, on the weapons quiz. Report both numbers per
  quiz.
- **Play above the fold.** The Play button's top is under 812 px on all 5 at 375×812, and under
  768 px at 1024×768.
- **Text still in the HTML.** `curl` 10 curated quiz pages, then `grep` the first sentence of every
  outcome and of `intro_content.context`. Report N of N. Then revert check: render one quiz without
  `QuizOutcomes` and confirm the grep fails.
- **No questions list.** In the `curl` of the same 10 pages, count the question titles from
  `quizzes.content`. It must be 0.
- **Flag rule.** The slice 2 check, rerun. 10 curated pages have no `noindex` and load
  `adsbygoogle.js`. 10 non-curated pages (published, flag 0) have `noindex` and no loader.
  Report 20/20.
- **Ad distance.** On the curated pages, the `quiz-landing` slot is at least 150 px from the Play
  button at both viewports.
- **Related.** On 10 pages, "Mais para jogar" lists only slugs with `ads_eligible = 1` in D1, and
  none is the quiz itself.
- **No horizontal overflow** at 375 px, and no title under the cover card at 1024 px.
- **Play-screen ad.** On `/play` at 375×812 the slot's top is below the last answer button. At
  1024×768 the sidebar slot is at most 300 px wide and it is the only sticky element holding an ad.

## Success Criteria
- [ ] Mobile page height for the 5 sampled quizzes at most a third of today's (18.3 → ≤ 6 screens)
- [ ] Play in the first viewport on mobile and desktop, 5 of 5
- [ ] 100% of outcome and intro text still in the server HTML of curated quizzes
- [ ] Slice 2 flag check 20/20 after the change
- [ ] Start rate (`/play` ÷ landing pageviews, GA4) measured for the 28 days before and after. It is
      reported, not gated, since the traffic is small (153 Search clicks in 90 days)
