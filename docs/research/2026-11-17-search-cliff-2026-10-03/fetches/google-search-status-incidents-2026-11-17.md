---
tags: [fetch, 2026-11-17-search-cliff-2026-10-03]
source: https://status.search.google.com/incidents.json
fetched: 2026-11-17
kind: primary
---

# Google Search Status Dashboard — incident feed, 2026

> Fetched 2026-11-17 with `curl` (HTTP 200, 12,608 bytes). Google's own log of announced ranking
> updates. Read to establish whether a confirmed update overlaps the 2026-10-03 drop.

## What it says

Every incident beginning on or after 2026-05-01:

| incident | begin (UTC) | end (UTC) |
|---|---|---|
| May 2026 core update | 2026-05-21 15:40 | 2026-06-02 12:40 |
| June 2026 spam update | 2026-06-24 16:00 | 2026-06-26 17:00 |
| August 2026 spam update | 2026-08-18 16:27 | 2026-08-21 08:49 |
| **September 2026 spam update** | **2026-09-24 16:15** | **2026-10-08 08:00** |
| November 2026 core update | 2026-11-10 18:06 | still open |

The September 2026 spam update, as posted:

- 2026-09-24 16:15:47 UTC: "Released the September 2026 spam update, which applies globally and to
  all languages. The rollout may take up to two weeks to complete." It links
  `developers.google.com/search/docs/appearance/spam-updates`.
- 2026-10-08 08:37:09 UTC: "The rollout was complete as of October 8, 2026."

## Against the three drops

| site | drop | announced update in progress that day |
|---|---|---|
| calculebrasil.com | 2026-07-25 | none (June spam ended 06-26, August spam began 08-18) |
| heartopia.guide | 2026-08-16 → 17 | none; the August spam update began 08-18 16:27, after the drop |
| **funsona.com** | **2026-10-03** | **September 2026 spam update, day 9 of 14** |

## What it does not say

Which sites an update touched, or why. The dashboard lists announced updates only, so its silence on
a date does not exclude unannounced system changes.
