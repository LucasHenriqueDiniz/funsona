---
tags:
  - kind/incident
  - kind/wrong-claim
  - area/seo
  - attribution-by-coincidence
  - crawl-stats
---

# The 2026-10-03 search cliff, and the defect it was blamed on

## What happened

On 2026-10-03 funsona.com went from 78 Google impressions a day to 1. Every quiz page that ranked
lost its impressions on the same day: 47 had impressions on 10-02, none on 10-03. Six weeks later
it is still at 0–5 a day.

On 10-19, PRs #14 and #15 opened with that drop, then showed Googlebot getting `302 → /404` on quiz
pages. Bot Fight Mode was challenging the server-side calls from the web Worker to
`api.funsona.com`. Both fixes shipped the same day. The 11-13 audit then recorded the chain as cause
and effect: Bot Fight Mode blocked Googlebot, and the site was deindexed from 10-03.

## The wrong claim

**The defect did not cause the drop. It reached Googlebot three to five days after it.**
[`2026-11-17-search-cliff-2026-10-03`](../research/2026-11-17-search-cliff-2026-10-03/research.md)
measured:

| claim | measured |
|---|---|
| Googlebot saw quiz pages as 404 from 10-03 | the first quiz 302 in crawl stats is on **10-08**; Googlebot got zero 404s from 09-17 to 10-06; quiz pages answered 200 on 10-01, 10-03 and 10-05 → 10-08 |
| the 404s deindexed the site | both index steps (09-21: −359, 10-04: −218) went to "crawled, currently not indexed", for pages last fetched with a 200 |
| fixing the 404 restores traffic | 22 of the top 60 pre-drop quizzes are indexed and re-crawled since 10-20; 1,177 impressions before, 16 after |
| nothing was deployed 09-03 → 10-18 | **true**: confirmed against the Pages and Worker records |

What the evidence supports instead is an algorithmic verdict on the quiz catalogue. That is an
inference, not a measurement. The drop came on day 9 of the September 2026 spam update. The
catalogue is 750 seed quizzes taken from quizpanda.com and translated.

## Why it was believed

The two events touch the same pages, the defect was real, and it was found while the drop was being
investigated. The dates that disproved the link were already in #15's own text. It counted
challenges at 2–10 a day, then 80–150 a day "from 2026-10-08", against a drop "from 2026-10-03".
Nobody put the defect's start next to the drop's start on one axis.

## What it cost

- The remedy that followed was a recrawl. The 11-13 audit's first AdSense item was "request
  indexing" for the pages Search Console still showed as 404. A recrawl does not undo a verdict on
  content Google had already fetched with a 200.

## What changed so it cannot recur

| was | is now |
|---|---|
| a defect found during the investigation was taken as the cause because it touched the same pages | a cause has to reach Googlebot **before** the drop: check the defect's first appearance in crawl stats (302/404 drilldown examples, by date and URL) |
| "deindexed" read from the index total | read the index steps **by reason**: "not found (404)" is an error Google saw, "crawled, currently not indexed" is Google's decision |
| the fix was expected to bring traffic back | after a fix, re-inspect the pages that ranked: indexed + fetched 200 + no impressions means the fix was not the cause |
| deploy history from `git log` | the paged Pages deployments API and the Worker versions list, as heartopia and calculebrasil learned |
| no check for announced updates | the Search Status incident feed, every time |

## What is still open

- Why the challenge began reaching Googlebot on 10-06 → 10-08, after five months of the same
  setting.
- How much the defect (10-08 → 10-22) deepened the loss, next to the deliberate archive of 10-19.
- Whether the curated core recovers after the November 2026 core update. It began 11-10, after the
  rewrite. Read the core's impressions after it completes.
