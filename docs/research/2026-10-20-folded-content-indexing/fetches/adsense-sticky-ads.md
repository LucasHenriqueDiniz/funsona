---
tags: [fetch, 2026-10-20-folded-content-indexing]
source: https://support.google.com/adsense/answer/10734935?hl=en
fetched: 2026-10-20
kind: primary
---

# AdSense Ad formats FAQ: sticky ads

> Fetched 2026-10-20 · AdSense Help, no last-updated date shown. Read for whether the play screen can
> keep an ad in view: a sidebar on desktop, a banner on mobile.

## What it says

- "Sticky ads are permitted in AdSense."
- "These implementations are for desktop only and ads should not be sticky on tablet or mobile
  optimized versions of a site."
- "Only ad formats with width of 300px or less are allowed." It lists 160x600, 300x600, 300x250,
  300x50 and 120x600, and rules out 728x90.
- "There can only be one sticky ad visible in the viewport at a time."
- "Sticky ads must not overlap or underlap any other page content."
- "Sticky units are not allowed to float elsewhere on the page or follow the cursor."

## Related

Anchor ads ([AdSense Help 15484692](https://support.google.com/adsense/answer/15484692)) are the
format Google offers for an ad pinned to the screen edge, on mobile and desktop. They are listed
under Auto ads overlay formats, and Google decides top or bottom unless the ad code forces bottom.
`apps/web/.env.production` records that Auto ads is off for funsona.com.
