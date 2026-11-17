---
tags: [measurement, 2026-11-17-search-cliff-2026-10-03]
source: Search Console UI, property sc-domain:funsona.com, read in the owner's logged-in Chrome
fetched: 2026-11-17
kind: primary
---

# Search Console screens the API does not expose

> Read-only, 2026-11-17. Nothing was submitted, validated or requested.

## How the chart numbers were read

Search Console draws its charts as SVG. Each daily value was recovered from the plotted path,
scaled against the chart's own axis labels. **Check:** the 404 series summed this way gives
**1,371**, and the report's header says "1,37 mil". Index counts at the dates that matter were then
read exactly from the chart's hover tooltip, which is the number quoted wherever one is given.

## Manual actions, security issues, removals

| screen | what it says |
|---|---|
| Ações manuais | "Nenhum problema foi detectado" |
| Problemas de segurança | "Nenhum problema foi detectado" |
| Remoções | "Nenhuma solicitação enviada nos últimos seis meses" |

## Crawl stats (Configurações → Estatísticas de rastreamento), 2026-08-18 → 2026-11-14

Totals for the 89 days: 10.3k requests, 396 ms average. By host: funsona.com 5,912,
www.funsona.com 2,259, api.funsona.com 1,113, clerk.funsona.com 1,016. By response: 200 77%,
404 13%, 301 6%, 302 3%, 401/407 < 1%, other 4XX < 1%, 5XX < 1%, unreachable < 1%.

Requests per day, all hosts, all file types:

| 09-26 | 09-27 | 09-28 | 09-29 | 09-30 | 10-01 | 10-02 | 10-03 | 10-04 | 10-05 | 10-06 | 10-07 | 10-08 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 80 | 99 | 58 | 123 | 98 | 86 | 63 | 68 | 19 | 37 | 102 | 77 | 119 |

**404 responses per day** (header total 1.37k):

| 09-13 → 09-16 | 09-17 → 10-06 | 10-07 | 10-08 | 10-09 → 11-09 | 11-10 → 11-14 |
|---|---|---|---|---|---|
| 7, 3, 2, 1 | **0 on every day but one** (1 on 09-23) | 11 | 47 | 16–60 a day | 0–5 |

**302 responses per day** (329 in the window):

| 09-17 → 10-04 | 10-05 | 10-06 | 10-07 | 10-08 | 10-09 → 10-19 | 10-20 → 11-12 |
|---|---|---|---|---|---|---|
| 1–4 a day | 3 | 9 | 9 | 24 | 6–21 a day | 0–4 a day |

**301 responses per day:** 0–7 a day until 10-16, then 15–26 a day from 10-17 (www → apex 301,
slice 1, deployed 10-18).

### The examples tables

Each drilldown lists sample requests with time and URL.

- **302 drilldown, 283 example rows** (of 329). **146 are quiz URLs, and the earliest is
  2026-10-08**: 2 on 10-08, then 11–21 a day to 10-19, the last on 10-22. Every 302 example before
  10-08 is a `clerk.funsona.com/npm/@clerk/*` script (130 in all) or `/profile` (5).
- **404 drilldown, 654 example rows** (of 1,371). The 84 examples dated before 10-08 are
  `www.funsona.com/og/<old-slug>` (73), `/.well-known/*` (5), `/apple-app-site-association` (2) and
  `/en`, `/es` (4). **None is a quiz page.** The first quiz 404 example is dated 2026-10-22, after the
  seed tail was archived. `/404` itself appears 37 times, all from 10-08 on.
- **200 drilldown, 926 example rows** (of ~7.9k), oldest 08-19. Quiz landing pages answered 200 on
  most days, including 4 on 10-01, 1 on 10-03 and 1 on each of 10-05 → 10-08. Per day in September:
  1–9.

## Page indexing (Indexação → Páginas), last updated 2026-11-12

Today: 187 indexed, 2.59k not indexed. Reasons: 404 1,015; robots.txt 312; alternate with proper
canonical 208; redirect 171; noindex 114; **crawled, currently not indexed 710**; duplicate, Google
chose a different canonical 45; discovered, not indexed 13. One page "indexed without content".

Indexed pages over time (tooltip values):

| 08-20 | 09-20 | **09-21** | 10-03 | **10-04** | 10-08 | 10-23 | 11-12 |
|---|---|---|---|---|---|---|---|
| 1,427 | 1,349 | **990** | 990 | **772** | 772 | 269 | 187 |

Between the steps, the chart read off the plotted bars gives 687 (10-09), 578 (10-12), 524 (10-16),
470 (10-19), 253 (10-23 by bar; 269 by tooltip, the tooltip wins), 217 (11-06), 163 (11-09).

**"Rastreada, mas não indexada no momento"** (crawled, currently not indexed) over time:

| 09-18 | 09-20 | **09-21** | 10-03 | **10-04** | 10-09 | 11-09 |
|---|---|---|---|---|---|---|
| ≈140 | 139 | **472** | 472 | **685** | ≈700 | ≈714 |

So the two index steps landed in this bucket: **−359 indexed / +333 crawled-not-indexed on 09-21**,
and **−218 / +213 on 10-04**.

Its 710 examples today, by URL group: `www.funsona.com/og/*` 396, `funsona.com/og/*` 22,
`funsona.com/quiz/*` 138, `www.funsona.com/quiz/*` 116, `/en` and `/es` 14, `/explore` 4, others 4.
Of the **254 quiz landing URLs**, the "last crawled" date is before 09-21 for 201, between 09-21 and
10-02 for 48, between 10-03 and 10-07 for 5, and **never on or after 10-08**.

**None of the 66 quiz slugs that had impressions on 10-01 or 10-02** (from the Search Analytics
API, `gsc-date-page-*.json`) is in today's crawled-not-indexed list. Where they are now is in
`url-inspection-2026-11-17.json`.

## What this does not establish

- **Per-URL index history.** The report keeps today's state per URL and only counts over time. Pages
  that went to "crawled, not indexed" on 10-04 may have moved to 404, noindex or redirect since the
  slices of 10-18 → 10-22.
- **The 46 302s with no example row** (329 − 283). They fall on days the series shows, so a handful
  of quiz 302s before 10-08 cannot be excluded outright. The series caps them at 1–4 a day.
