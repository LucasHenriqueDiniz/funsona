---
tags: [fetch, 2026-10-18-adsense-noindex-review]
source: https://support.google.com/adsense/answer/99376?hl=en
fetched: 2026-10-18
kind: primary
---

# About the AdSense ads crawler

> Fetched 2026-10-18 · AdSense Help. Read for when the AdSense crawler visits a page — the closest
> primary source to "which pages does AdSense look at".

## What it says

> "visits your site to determine its content in order to provide relevant ads."

> "Only pages displaying Google ads should be sending requests to our systems and being crawled."

> "The crawl is performed automatically and we're not able to accommodate requests for more frequent
> crawling."

> "it may take up to 1 or 2 weeks before the changes are reflected in our index."

> "The Google, AdSense Mediapartners-Google, and Google-Display-Ads-Bot crawlers honor your robots.txt
> file."

> "If your robot.txt file prohibits access to certain pages or directories, then they will not be
> crawled."

On `User-agent: *`: "the AdSense crawler will still crawl these pages." It has to be named explicitly.

> "our crawler must access the original pages to determine that a redirect is in place."

> "Our crawler will access site.com and www.site.com separately."

A separate bot is used "to verify your site when you add a site to AdSense."

## What it does not say

- Nothing about `noindex` or robots meta.
- Nothing about whether crawling feeds the **site review** for approval, or how the reviewer chooses
  pages. The crawler described here is the ad-targeting crawler.
