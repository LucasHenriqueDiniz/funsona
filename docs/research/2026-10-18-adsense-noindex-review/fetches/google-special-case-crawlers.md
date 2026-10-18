---
tags: [fetch, 2026-10-18-adsense-noindex-review]
source: https://developers.google.com/search/docs/crawling-indexing/google-special-case-crawlers
fetched: 2026-10-18
kind: primary
---

# List of Google's special-case crawlers

> Fetched 2026-10-18 · Google Search Central's crawler reference. Read for what controls the AdSense
> crawler (`Mediapartners-Google`) and whether it honours anything besides robots.txt.

## What it says

Intro:

> "The special-case crawlers are used by specific Google products where there's an agreement between
> the crawled site and the product about the crawl process."

> "The special-case crawlers may ignore robots.txt rules and so they operate from a different IP range
> than the common crawlers."

> "The IP ranges are published in the special-crawlers.json object."

`Mediapartners-Google` entry:

- robots.txt token: `Mediapartners-Google`
- mobile user agent: `(compatible; Mediapartners-Google/2.1; +http://www.google.com/bot.html)`
- > "The global user agent (`*`) is ignored."
- > "The `Mediapartners-Google` crawler visits participating sites in order to provide them with
  > relevant ads."
- Affects ad products including Google AdSense and Google Ad Manager.
- Example group:

  ```
  user-agent: Mediapartners-Google
  allow: /archive/1Q84
  disallow: /archive/
  ```

> "Last updated 2026-09-17 UTC."

## What it does not say

- Nothing about robots `meta` tags or `noindex`, for this crawler or any special-case crawler. The only
  documented control is robots.txt addressed to the `Mediapartners-Google` token.
- Nothing about AdSense site review or approval.
