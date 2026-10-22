---
tags: [research, area/web, area/monetization, 2026-10-20-folded-content-indexing]
status: active
decided:
---

# Can the quiz page fold its outcomes without losing them?

> **For Search, yes,** as long as the text is in the server HTML and not fetched on click. Google
> documents accordions as indexed and as not being hidden-text spam. How much weight folded text
> gets has no primary source. **For the AdSense review, unknown.** No Google page says how a
> reviewer treats folded text.

## What was blocking

[[quiz-page-redesign]] wants to stop the quiz landing page printing every outcome in full (1,409
words, 6,485 px on mobile, on the weapons quiz) before the reader plays. Those outcomes are the
150–350 hand-reviewed words per outcome that [[adsense-low-value-content]] slices 4–5 are writing,
and the main text the AdSense review will read. Folding them is only safe if folded text still
counts.

The pitch also had to choose whether the player stays on its own `noindex` route or opens over the
indexed landing page. One AdSense page bears on that, so it is kept here too.

## Findings

| # | finding | source | kind |
|---|---|---|---|
| 1 | Google suggests "moving content into accordions or tabs to save space" instead of removing it on mobile | `google-mobile-first-indexing.md` | primary |
| 2 | "Google won't load content that requires user interactions (for example, swiping, clicking, or typing) to load." So text fetched on click is not indexed | `google-mobile-first-indexing.md` | primary |
| 3 | Accordion or tabbed content is listed as **not** hidden-text abuse | `google-spam-policies-hidden-text.md` | primary |
| 4 | 2018, Gary Illyes: folded content is indexed and "its weight is fully considered for ranking", though it may not be bolded in snippets | `seroundtable-illyes-accordions-2018.md` | secondary, a tweet |
| 5 | 2022, one SEO reports a ranking gain after unfolding accordion FAQ text. Mueller: "I'm not convinced by these kinds of anecdotes" | `seroundtable-shure-accordion-test-2022.md` | secondary, anecdote |
| 6 | AdSense recommends content ads "at least 150 pixels away from the game", and says Play must not lead to an interstitial page dominated by ads | `adsense-game-play-pages.md` | primary |
| 7 | Nothing found on how an AdSense reviewer treats folded text | — | absence, not evidence |
| 8 | Sticky ads are allowed on desktop only, at most 300 px wide, one in view, overlapping nothing. "ads should not be sticky on tablet or mobile" | `adsense-sticky-ads.md` | primary |

## Measured

| measurement | how | value |
|---|---|---|
| `/quiz/<slug>/play` load, 5 runs | `curl -w` from the owner's machine, 2026-10-20 | TTFB 0.33–0.56 s, 52.8 KB HTML |
| Outcome names already in the description | read on `que-arma-voce-tem-…` | yes: "Espada, arco, escudo ou pena?" Only this one quiz was checked |

## Verdict

- **Outcomes: one `<details>` per outcome, title visible, text folded, full text in the server
  HTML.** Findings 1–3 cover Search. The outcome titles are a small spoiler, and at least one
  description already names them. The text, which is the payoff, stays closed.
- **Never load the outcome text on click** (finding 2). A client fetch would take the text out of
  the index.
- **AdSense is the open risk** (finding 7). If the next review rejects the site again, unfolding the
  outcomes (`<details open>`) is a one-attribute lever. But changing it together with other levers
  makes the next rejection unreadable, so record which levers changed between reviews.
- **The player stays on `/play`.** It keeps the play ad on a `noindex` URL away from the indexed
  page (finding 6), keeps the start rate measurable from pageviews, and costs a 0.3–0.6 s load.
- **An ad while playing does not need the player on the landing page.** On `/play`: a sticky
  sidebar unit of at most 300 px on desktop, and an inline, non-sticky banner under the answers on
  mobile (finding 8). A mobile banner pinned to the screen is only possible as an Auto ads anchor,
  which Google places.
