---
tags: [research, area/seo, 2026-11-17-search-cliff-2026-10-03]
status: active
decided: 2026-11-17
---

# Why did Google stop showing funsona.com's quizzes on 2026-10-03?

> Not the Bot Fight Mode → `/404` defect, and not a deploy. That defect first reached Googlebot on
> 10-06 to 10-08, after the drop, and nothing was deployed between 09-03 and 10-18. The drop came on
> day 9 of Google's September 2026 spam update. Google moved pages it had last fetched with a 200
> into "crawled, currently not indexed", and stopped showing quiz pages it still indexes. That
> points at an algorithmic verdict on the quiz catalogue. This is an **inference**: Search Console
> does not report algorithmic actions.

Same method as [`heartopia-vite/docs/research/the-16-08-demotion-cause`](https://github.com/LucasHenriqueDiniz/heartopia-vite/blob/main/docs/research/the-16-08-demotion-cause/research.md)
and [`calculadoras-brasil/docs/research/2026-11-14-search-cliff-2026-07-25`](https://github.com/LucasHenriqueDiniz/calculadoras-brasil/blob/main/docs/research/2026-11-14-search-cliff-2026-07-25/research.md).
Corrects the causal reading in PRs #14 and #15. See the postmortem
[`search-cliff-2026-10-03`](../../postmortem/search-cliff-2026-10-03.md).

## What was blocking

PR #14 opened with "quiz impressions fell from 72–95 a day to 0–5 starting 2026-10-03". It then
showed Googlebot getting `302 → /404` on quiz pages because Bot Fight Mode challenged the
server-side calls to the API. #14 and #15 fixed that on 10-19. A month later the site still gets
0–5 impressions a day. If the defect caused the drop, the fix should have brought traffic back, and
it has not. Two other sites on the same account fell the same way: calculebrasil.com on 07-25 and
heartopia.guide on 08-16. Before planning a recovery or reading the AdSense review, the question is
which of the two this is.

## Findings

All numbers are **measured** unless marked otherwise. Group numbers come from
[`queries/split.py`](queries/split.py), run from the repo root over `measurements/gsc-*.json`.

### 1. The drop is one day, and it hit the quiz pages

Search Console, web search, all of funsona.com (`measurements/gsc-daily-2026-08-01-to-11-15.json`):

| | 09-29 | 09-30 | 10-01 | **10-02** | **10-03** | 10-04 | 10-05 | 10-06 |
|---|---|---|---|---|---|---|---|---|
| impressions | 78 | 72 | 76 | **78** | **1** | 1 | 0 | 1 |

September ran at 60–117 impressions a day, positions 6.8–10.5. Quiz paths with impressions:
**47 on 10-02, 0 on 10-03**.

Impressions per day by page group (`split.py groups`):

| group | before (09-03..10-02) | after (10-03..10-17) | after the fix (10-20..11-15) | after / before |
|---|---|---|---|---|
| quiz landing `/quiz/<slug>` | 73.7 | 0.7 | 1.3 | **0.01** |
| OG image `/og/...` | 6.3 | 0.1 | 0.3 | 0.01 |
| home `/` | 0.9 | 1.0 | 1.0 | 1.07 |
| guides | 0.6 | 0.5 | 0.4 | 0.89 |
| static (about, contact, premium, …) | 0.4 | 1.2 | 1.4 | 3.00 |
| explore | 0.2 | 0.6 | 1.0 | 2.57 |

By query (`split.py queries`): queries containing "funsona" had 21 impressions in the 30 days
before and 14 in the 15 days after. Every other query had **180 before and 0 after**.

The groups that held never ranked for anything but the brand. They had about one impression a day
before. So they cannot show whether the demotion stopped at the quiz template, and **"only the
quizzes fell" is not established.** What is established is that the brand still surfaces. That
differs from calculebrasil, which lost even its own name.

### 2. Nothing was deployed between 09-03 and 10-18

From Cloudflare's records, not git (`measurements/deploy-record-2026-11-17.md`):

| | last before the drop | first after the drop |
|---|---|---|
| web (`funsona-web`, Pages production, 116 deploys paged) | 2026-09-03 14:15 `f92717d` | 2026-10-18 21:49 `8b54aad` |
| API (`funsona-api` versions, 86) | 2026-09-03 14:15 | 2026-10-18 21:32 |

Every AdSense slice (#10–#21), including the "adsense rewrite" batches, shipped between 10-18 and
11-13, after the drop. **They are a response to the drop, not a candidate for it.** D1 rows can change
without a deploy. That is not ruled out, but the bulk catalogue changes (#12, #13, #18) all date
from 10-18 on.

### 3. Bot Fight Mode did not change, and its effect on Googlebot came after the drop

**Configuration** (`measurements/cloudflare-audit-log-2026-11-17.md`). Bot Fight Mode was switched on
on **2026-05-17 03:12 UTC**, the day the zone was created. It was never changed after that. The
query finds heartopia's 07-23 change as a positive control, so changes do show up in it. Between
09-17 and 10-18 the zone's only actions are system ACME records. A setting that held from May to
November cannot by itself produce a step on 10-03.

**What Googlebot received** (`measurements/search-console-ui-2026-11-17.md`, crawl stats,
2026-08-18 → 11-14):

| | 09-17 → 10-04 | 10-05 | 10-06 | 10-07 | 10-08 | 10-09 → 10-19 |
|---|---|---|---|---|---|---|
| 302 responses a day | 1–4 | 3 | 9 | 9 | 24 | 6–21 |
| 404 responses a day | **0** (one on 09-23) | 0 | 0 | 11 | 47 | 22–54 |

- **The first quiz 302 among the 283 example rows is dated 2026-10-08.** Every earlier 302 example
  is a `clerk.funsona.com` script (130) or `/profile` (5).
- **No quiz URL is among the 84 404 examples dated before 10-08.** Those are old `www…/og/*` slugs,
  `.well-known`, `/en` and `/es`.
- **Quiz pages answered 200 to Googlebot right through the drop.** The 200 examples include quiz
  landing pages on 10-01, 10-03 and each day from 10-05 to 10-08.

The examples are a sample: 283 of 329 302s, and 654 of 1,371 404s. So a handful of quiz 302s before
10-08 cannot be excluded. The daily series caps them at 1–4 a day.

**Inference:** the `302 → /404` defect that #14 and #15 fixed reached Googlebot at scale from
10-06 to 10-08, three to five days after the drop. It is real, it cost pages afterwards (finding
5), and it is not what happened on 10-03. Why it started then, whether through a Cloudflare-side
scoring change or a shift in where Googlebot crawled from, is not visible here.

**Volume.** Googlebot made **63 requests on 10-02 and 68 on 10-03**, across all four hosts and every
file type. Re-reading the 47 quiz pages that had impressions on 10-02, and finding each one broken,
would have used most of that. Even then it could not have removed them all within a day. Like
heartopia's, this step happened faster than Googlebot was re-reading the site.

### 4. Google dropped pages it had last fetched with a 200

Index counts, from the indexing report's tooltip (`measurements/search-console-ui-2026-11-17.md`):

| 08-20 | 09-20 | **09-21** | 10-03 | **10-04** | 10-23 | 11-12 |
|---|---|---|---|---|---|---|
| 1,427 | 1,349 | **990** | 990 | **772** | 269 | 187 |

Both steps landed in **"Rastreada, mas não indexada no momento"** (crawled, currently not indexed),
the bucket Search Console attributes to Google's systems:

| | 09-20 → 09-21 | 10-03 → 10-04 |
|---|---|---|
| indexed | −359 | −218 |
| crawled, currently not indexed | +333 (139 → 472) | +213 (472 → 685) |

Today that bucket holds 254 quiz landing URLs. Their last crawl dates are: **201 before 09-21, 48
between 09-21 and 10-02, 5 between 10-03 and 10-07, and none from 10-08 on.** Google took these out
of the index without a newer fetch. When it last fetched them, the fetch succeeded.

**Inference:** a removal decided on content Google already held, not on an error it saw. That is
the profile of a quality or spam system. The 09-21 step comes three days *before* the spam update's
announced start (09-24 16:15). The indexing report dates its snapshots, and whether those dates lag
the decision is undocumented. So the 09-21 step may or may not belong to the same event.

### 5. The quiz pages are still indexed, still fetched with a 200, and still not shown

URL Inspection on 2026-11-17 over 112 URLs (`measurements/url-inspection-input-2026-11-17.txt`):
the sitemap's 84, plus the 60 quiz pages with the most impressions before the drop, which held
1,636 of the 2,212 quiz impressions of 09-03..10-02 (`measurements/url-inspection-2026-11-17.json`,
`split.py inspect`). Those 60 quiz pages:

| state today | pages | impressions 09-03..10-02 | impressions 10-20..11-15 |
|---|---|---|---|
| **Submitted and indexed** | 28 | **1,177** | **16** |
| ↳ re-crawled on or after 10-20, after the fix | 22 | | |
| ↳ **last crawled on or before 10-02, so never saw a 404** | **4** | **95** | **0** |
| Crawled, currently not indexed (last crawl 07-26 → 09-30) | 9 | 187 | 5 |
| Not found (404), none in the sitemap (archived tail); last crawl 10-11 → 11-05 | 18 | 217 | 0 |
| URL unknown to Google (apex URL inspected) | 4 | 44 | 1 |
| Discovered, not indexed | 1 | 11 | 0 |

`reencarnacao-sem-emprego-sou-eu`, the top page, had 388 impressions in September. It is indexed,
was fetched successfully on 11-08, and has had 1 impression since 10-20.

The sitemap's 66 quizzes: 43 indexed (37 re-crawled since 10-20), 8 crawled-not-indexed, 6 404,
6 unknown, 3 discovered.

This is the finding that separates the two readings. A page that answers 200 and sits in the index
is not missing because of a 404. Four of these pages were last fetched before the drop. They never
showed Google an error, and they went from 95 impressions to 0. The "unknown" rows are probably the
`www.` variant having been the indexed one before the 301 of 10-18. That is an inference. The
Search Analytics rows do not say which host held them.

### 6. No manual action, no security issue, no removal

Search Console says "Nenhum problema foi detectado" for manual actions and for security issues.
Under removals it says "Nenhuma solicitação enviada nos últimos seis meses". As in the other two
sites, a clean manual-actions page excludes only a *manual* action.

### 7. The drop falls inside an announced spam update

Google's incident feed (`fetches/google-search-status-incidents-2026-11-17.md`) records the
**September 2026 spam update from 2026-09-24 16:15 to 2026-10-08 08:00 UTC**. The 10-03 drop is on
day 9 of it. Neither other site's drop matches an announced update. calculebrasil's 07-25 fell
between the June and August spam updates. heartopia's 08-16 came two days before the August spam
update began.

A 14-day window catches any drop inside it, so the match is suggestive and nothing more. What Google
documents is that spam systems "are constantly operating", that SpamBrain is one of them, and that
recovery may come "over a period of months" (`fetches/google-spam-updates.md`).

### 8. What the catalogue is, against the spam policies

From [`2026-10-18-catalogue-origin`](../2026-10-18-catalogue-origin/research.md) and the pitch
[`adsense-low-value-content`](../../pitches/adsense-low-value-content.md), both measured on
2026-10-18 against production D1:

| measurement | value |
|---|---|
| published quizzes | 762 |
| authored by the seed account | 750, created 2025-10-22 → 11-06 (16 days, ~47 a day) |
| serving at least one `quizpanda.com` image | 691 of 762 (638 by cover) |
| origin | quizpanda.com (PsyCat Games), translated, then LLM-rewritten (the 2026-06-30 pilot) |
| outcome length | median 38 words |

Google's policy names this pattern under scaled content abuse: "Scraping feeds, search results, or
other content to generate many pages (including through automated transformations like
synonymizing, translating, or other obfuscation techniques)" (`fetches/google-spam-policies.md`).
**Inference:** the catalogue that held the September traffic is the kind of content the September
spam update targets. That matches the timing. It does not prove the cause.

### 9. What the three sites have in common

| factor | calculebrasil.com (07-25) | heartopia.guide (08-16) | funsona.com (10-03) | shared? |
|---|---|---|---|---|
| shape | one day, every page | ~36 h, every group | one day, every ranking quiz | **yes** |
| deploy on the day | none (06-26 → 07-27) | none (08-14 12:13 → 08-20) | none (09-03 → 10-18) | **yes** |
| edge or config change | none in audit log | none since 07-30 | Bot Fight Mode constant since 05-17 | **yes, none** |
| manual action | none | none | none | **yes** |
| pages still indexed | 26 of 28 | 2,544 of 2,556 | partly: 1,349 → 772, the top pages still are | mostly |
| brand query | lost | home kept 58% | kept | **no** |
| announced update that day | none | none | September spam update | **no** |
| bulk machine-made or templated pages before the drop | 52 route files in 4 days, AI-written articles (June) | 596 GPT-assisted descriptions (08-09) across ~2.5k indexed templated pages | 750 seed quizzes in 16 days, scraped and translated, LLM-rewritten | **yes** |
| Google account and AdSense publisher | `pub-2600827684802809` | same | same | **yes** |
| AdSense verdict | NEEDS_ATTENTION (low value) | **READY** | NEEDS_ATTENTION since 08-16; GETTING_READY since 11-15 | no |
| links between the sites (home pages, `curl` 2026-11-17) | none | none | none | no |
| "adsense rewrite" batches before the drop | no (09-10, 10-18, after) | no | no (10-18 → 10-22, after) | no |

**Inference:** two things are common to all three, the account and the content profile. The account
is a weak candidate. The three drops fall on three dates. Nothing in Google's documentation links
Search ranking to an AdSense publisher ID or to sibling Search Console properties. And heartopia is
AdSense-READY yet was demoted all the same, so the AdSense verdict and the Search demotion do not
track each other. The content profile fits all three. Each site published many pages from one
template, mostly machine-written, in a short window, before it fell. That is a pattern, not a
proof. Each site is also young and small, and Google publishes no threshold.

funsona's AdSense review of 08-16 ("Low value content") fell on the day heartopia's Search traffic
dropped. Nothing ties the two products, and it is recorded here as a coincidence only.

## Verdict

**The 10-03 drop was not caused by the Bot Fight Mode → `/404` defect, and not by a deploy.**

| candidate | cause of 10-03? | how it was decided |
|---|---|---|
| a deploy (web or API) | **no** | none between 09-03 and 10-18 (finding 2) |
| the AdSense rewrite batches | **no** | all shipped 10-18 → 11-13 (finding 2) |
| Bot Fight Mode switched on or changed | **no** | on since 05-17, never changed (finding 3) |
| Googlebot getting `302 → /404` on quizzes | **no** | first quiz 302 on 10-08; 0 404s from 09-17 to 10-06 (finding 3) |
| a site-wide defect re-read everywhere at once | **no** | 63–68 requests a day, all hosts and types (finding 3) |
| manual action, security issue, removal | **no** | all clean (finding 6) |
| an algorithmic quality or spam verdict on the quiz catalogue | — | **consistent with findings 1, 4, 5, 7, 8; not provable** |

The defect is still part of the story: it cost pages *after* the drop. Indexed pages fell from 772
on 10-08 to 269 on 10-23. The quiz 404s and 302s in crawl stats run from 10-08 to 10-22. The
archive slices of 10-19 then added deliberate 404s on top. How much of that later loss was the
defect and how much the archive is not separable from the counts.

What this means for the plan:

- **The technical fix was necessary and is not sufficient.** Since 10-20, 37 sitemap quizzes have
  been re-crawled with a 200 and are indexed. The core still earns about one impression a day.
- **What is left is a site-level (or template-level) verdict.** Google says recovery after a spam
  update can come "over a period of months" once the site changes
  (`fetches/google-spam-updates.md`). The core rewrite of 10-22 and the archived tail are that kind
  of change. **Inference:** the earliest honest read is after the November 2026 core update finishes
  rolling out. It began 11-10, after both the rewrite and the archive. Compare the curated core's
  impressions before and after, not the whole site's.
- **For AdSense, almost no search traffic is a symptom of the same verdict.** It is not a separate
  problem to fix first.

## The strongest case against

**It was the defect after all, just earlier than the crawl stats show.** PR #15 counted Bot Fight
challenges on quiz API calls from US colos "at least" from 09-20, at 2–10 a day. If those were
Googlebot fetches, some quiz pages were already failing before 10-03. Against it:

- Search Console records no quiz 302 or 404 for Googlebot before 10-08 (finding 3). Who those
  challenged requests came from is not recorded. #14's own tail shows the AdSense crawler
  (Mediapartners-Google) arriving through the same Atlanta colo as Googlebot, so not every
  challenged call from a US colo was a Search fetch.
- Even if every one were Googlebot, 2–10 failures a day cannot remove 47 ranking pages in one day.
- It does not explain four pages that never showed Google an error and went to 0 (finding 5).
- It does not explain 22 top pages that have been indexed and re-crawled since 10-20 and are still
  not shown.

**It was the September spam update, full stop.** The timing is the only direct evidence. The
"crawled, not indexed" step on 09-21 comes before the update's announced start. An unannounced
system change, or the "constantly operating" spam systems outside any named update, fit the same
data. The plan does not change either way: the content is what Google re-scored.

## What this does not establish

- **The cause.** Google does not tell a site owner which system demoted it.
- **Whether the 09-21 index step and the 10-03 impression step are one event.** The indexing report
  dates are snapshots, and their lag is undocumented.
- **Why Googlebot started getting the Bot Fight challenge on 10-06 to 10-08,** after five months of
  the same setting.
- **How much the defect deepened the loss from 10-08 to 10-22,** next to the deliberate archive.
- **Per-URL index history.** Pages that went to "crawled, not indexed" on 10-04 may sit in another
  bucket today.
- **Bing.** No Bing data here.
- **AdSense pageviews as a second instrument.** They ran at 1–18 a day in late September, partly
  bots, too few to confirm or refute a step of ~3 clicks a day.

## Sources

- Search Console API, `sitestats gsc funsona --dim date|date,page|date,query|date,country|date,device`
  — `measurements/gsc-*.json` — daily totals, pages and queries
- URL Inspection API, `sitestats inspect` — `measurements/url-inspection-2026-11-17.json` — index
  state of 112 URLs today
- Search Console UI (crawl stats, page indexing, manual actions, security issues, removals) —
  `measurements/search-console-ui-2026-11-17.md`
- Cloudflare Pages deployments and Worker versions API — `measurements/deploy-record-2026-11-17.md`
- Cloudflare audit log v1 and v2 — `measurements/cloudflare-audit-log-2026-11-17.md`
- [Google Search Status Dashboard, incident feed](https://status.search.google.com/incidents.json) —
  `fetches/google-search-status-incidents-2026-11-17.md` — September 2026 spam update, 09-24 → 10-08
- [Spam updates](https://developers.google.com/search/docs/appearance/spam-updates) —
  `fetches/google-spam-updates.md` — systems run constantly; recovery over months
- [Spam policies for Google web search](https://developers.google.com/search/docs/essentials/spam-policies) —
  `fetches/google-spam-policies.md` — scaled content abuse names scraping plus translating
- The two sibling investigations linked at the top, for the calculebrasil and heartopia columns of
  finding 9
