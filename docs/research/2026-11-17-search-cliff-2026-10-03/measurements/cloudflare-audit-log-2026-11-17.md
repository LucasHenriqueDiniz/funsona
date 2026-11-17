---
tags: [measurement, 2026-11-17-search-cliff-2026-10-03]
source: Cloudflare API, audit logs v1 and v2, read through the owner's logged-in dashboard session
fetched: 2026-11-17
kind: primary
---

# Cloudflare audit log for funsona.com

> Read-only, 2026-11-17. Times are UTC.

## Method

- **v2** (`/accounts/<id>/logs/audit?since=…&before=…&zone_name=funsona.com&action_type.not=view`),
  the endpoint the dashboard's Audit logs page calls. Read in 7-day windows from 2026-05-15 to
  2026-11-17, cursor-paged.
- **Positive control:** the same query for `heartopia.guide`, 2026-07-22 → 07-29, returns the four
  bot-management and ruleset actions of 2026-07-23 15:02 that
  `heartopia-vite/docs/research/the-16-08-demotion-cause/fetches/cloudflare-audit-log-2026-10-18.md`
  recorded. So bot-management changes do show up in this query.
- **v1** (`/accounts/<id>/audit_logs`), whole account, 2026-01-01 → 2026-11-17: 5,946 actions, the
  oldest 2026-03-06. Filtered to anything mentioning the zone id `b01e3a6a…` or "funsona".

## What it says

**Bot Fight Mode on funsona.com was switched on when the zone was created, and never changed.**

| when (UTC) | action | actor | request → response |
|---|---|---|---|
| 2026-05-17 03:10 | zone settings update | system | zone created |
| 2026-05-17 03:11:56 | `bot_management` update | user, dashboard | `crawler_protection: enabled` |
| 2026-05-17 03:11:57 | `rulesets` create | system | |
| **2026-05-17 03:12:21** | `bot_management` update | user, dashboard | `enable_js: true, fight_mode: true` → response `fight_mode: true, enable_js: true, crawler_protection: disabled, ai_bots_protection: disabled` |

From 2026-05-17 to 2026-11-17 there is **no other `bot_management`, `rulesets`, WAF or zone-setting
action** on funsona.com in v2. Per 7-day window, the zone's only other actions are:

| window | actions |
|---|---|
| 2026-07-10 → 07-17 | email routing created (user), 35 DNS records |
| 2026-07-31 → 08-07 | DNS records created (user) |
| 2026-09-12 → 09-16 | 20 system DNS records (ACME challenge TXT, certificate renewal) |
| 2026-11-10 → 11-11 | 44 system DNS records (ACME) |
| every other window | none |

v1, zone and Worker scope, 2026-09-17 → 2026-10-18 21:32: two system DNS records and a certificate
pack on 2026-10-10 (ACME), and nothing else. The next actions are the `funsona-api` script updates
of 2026-10-18 21:32 onward (the slice deploys).

## What this means for the drop

A setting that was constant from May to November cannot by itself produce a step on 2026-10-03.
Whether Cloudflare changed how Bot Fight Mode *scores* Worker subrequests from its own ASN 13335
is not visible in the audit log, which records configuration, not model behaviour.
