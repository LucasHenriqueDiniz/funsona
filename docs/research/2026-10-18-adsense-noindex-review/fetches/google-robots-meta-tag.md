---
tags: [fetch, 2026-10-18-adsense-noindex-review]
source: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
fetched: 2026-10-18
kind: primary
---

# Robots meta tag, data-nosnippet, and X-Robots-Tag specifications

> Fetched 2026-10-18 · Google Search Central's spec for `noindex`. Read to establish which crawlers
> `noindex` binds.

## What it says

`noindex`: "Do not show this page, media, or resource in search results."

> "The `<meta name="robots" content="noindex">` rule applies to search engine crawlers."

> "To block non-search crawlers, such as `AdsBot-Google`, you might need to add rules targeted to the
> specific crawler."

Example given: `<meta name="AdsBot-Google" content="noindex">`.

> "Google supports two user agent tokens in the robots `meta` tag; other values are ignored:"
> `googlebot` and `googlebot-news`.

> "If indexing or serving rules must be followed, the URLs containing those rules cannot be disallowed
> from crawling."

A page blocked in robots.txt has its rules "will not be found and will therefore be ignored."

> "Last updated 2026-03-24 UTC."

## What it does not say

- It never names `Mediapartners-Google`. It does not say the AdSense crawler honours `noindex`, nor that
  it ignores it. The scope sentence ("applies to search engine crawlers") plus the AdsBot example imply
  a generic `noindex` does not bind ad crawlers, and the "two tokens; other values are ignored" line
  implies a `<meta name="Mediapartners-Google">` would be ignored too. Both are inferences.
