---
tags: [measurement, 2026-11-17-search-cliff-2026-10-03]
source: Cloudflare API, read through the owner's logged-in dashboard session
fetched: 2026-11-17
kind: primary
---

# What was serving funsona.com, by the deploy record

> Read 2026-11-17 from Cloudflare's own records, not from `git log`. Times are UTC.

## Method

- **Web (Pages project `funsona-web`):** `GET /accounts/<id>/pages/projects/funsona-web/deployments?env=production&per_page=25&page=1..5`,
  116 production deployments in total (`result_info.total_count`). Each row: `created_on`,
  `latest_stage.status`, `deployment_trigger.metadata.commit_hash`. `wrangler pages deployment list`
  gives the same rows with relative ages only, so the paged API is the one that dates them.
- **API (Worker `funsona-api`):** `GET /accounts/<id>/workers/scripts/funsona-api/versions`, 86
  versions, the oldest uploaded 2026-05-07. `wrangler deployments list --name funsona-api --json`
  returns only the last 10 deployments (oldest 2026-10-19 01:02), so versions are the longer record.
  Versions include preview uploads, so a version is an upper bound on what could have gone live.

## Web production deployments, 2026-07-31 → 2026-11-13

| created (UTC) | status | commit | change |
|---|---|---|---|
| 2026-07-31 23:15 | success | `498302c` | |
| 2026-08-01 00:55, 01:02 | success | `9fced8a`, `36b73f1` | AdSense display units |
| 2026-08-20 15:56 → 22:41 | 8 × success, 1 × failure | `55d1e20` … `1ed54f7` | "Fix AdSense rejection blockers and gate ads behind admin review", Clerk BOM |
| 2026-08-21 19:55 → 20:18 | 5 × success | `d53a5dc` … `94ef3b0` | Clerk login fixes |
| 2026-09-01 00:52 | success | `9f2dce1` | pnpm 11 (#1) |
| 2026-09-01 16:21 | success / skipped | `56d3ddb` / `84ddce5` | #2, #3 |
| 2026-09-01 22:10 | success | `fd27b6b` | LICENSE (#4) |
| 2026-09-02 18:27 | success | `a01683f` | #5 |
| 2026-09-02 19:50 | success | `b837f42` | #6 |
| 2026-09-03 00:22 | success | `37dd664` | #7 |
| 2026-09-03 06:01 | success | `88d0214` | #8, docs |
| **2026-09-03 14:15** | success | **`f92717d`** | #9, last deploy before the drop |
| **2026-10-18 21:49** | success | **`8b54aad`** | #10, first deploy after the drop |
| 2026-10-18 23:25 | success | `38bb143` | #11 |
| 2026-10-19 01:01 | success | `8ecdd94` | #12, core picked, rest out of view |
| 2026-10-19 01:29 | success | `8bb94b1` | #13, seed tail archived |
| 2026-10-19 21:59 | success | `82cae31` | #15, service binding |
| 2026-10-19 22:40 | success | `085de5c` | #14, 503 instead of /404 |
| 2026-10-20 17:44 | success | `9116db5` | #16 |
| 2026-10-22 17:24 | success | `a0aab81` | #17 |
| 2026-10-22 20:47, 20:48, 20:51 | success | `e748f2d`, `2bf8f35`, `ce82f7b` | #20, #19, #18 |
| 2026-11-13 20:19 | success | `9920b74` | #21 |

**No production deployment of the web app between 2026-09-03 14:16 and 2026-10-18 21:49.**

## API Worker versions around the drop

| uploaded (UTC) | version | source |
|---|---|---|
| 2026-09-03 14:13, 14:15 | 53, 54 | wrangler (Workers Builds) |
| **(none)** | | |
| 2026-10-18 21:32 | 55 | wrangler |
| 2026-10-18 21:49 … 2026-10-19 00:46 | 56–59 | wrangler |

**No API version was uploaded between 2026-09-03 14:15 and 2026-10-18 21:32.** The account audit
log agrees: the only `funsona-api` script actions between 2026-09-17 and 2026-10-18 21:32 are none
(see `cloudflare-audit-log-2026-11-17.md`).

## What this does not cover

- **D1 data.** Quiz rows can change without a deploy. Nothing here says whether rows changed between
  09-03 and 10-18. The slices that changed the catalogue in bulk (#12, #13, #18) all date from
  10-18 onward.
