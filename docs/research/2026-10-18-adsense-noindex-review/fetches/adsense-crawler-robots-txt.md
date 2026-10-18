---
tags: [fetch, 2026-10-18-adsense-noindex-review]
source: https://support.google.com/adsense/answer/10532?hl=en
fetched: 2026-10-18
kind: primary
---

# Give access to the AdSense crawler in your robots.txt file

> Fetched 2026-10-18 · AdSense Help. Read for the crawler's documented controls.

## What it says

- If robots.txt disallows the AdSense crawler, "we can't serve Google ads on the site."
- The blocking lines are `User-agent: Mediapartners-Google` / `Disallow: /`. Removing them "allows our
  crawler to index the content of your site and provide you with Google ads."
- Changes "might not be reflected in our index until our crawlers attempt to visit your site again."

## What it does not say

- Nothing about `noindex` or robots meta.
- Nothing about site review or approval.
