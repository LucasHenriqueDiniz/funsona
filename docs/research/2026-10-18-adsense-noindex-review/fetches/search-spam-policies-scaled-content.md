---
tags: [fetch, 2026-10-18-adsense-noindex-review]
source: https://developers.google.com/search/docs/essentials/spam-policies
fetched: 2026-10-18
kind: primary
---

# Spam policies for Google web search — Scaled content abuse

> Fetched 2026-10-18 · Google Search, not AdSense. Read because the catalogue (750 quizzes from one
> account in 16 days, mass LLM rewrite) fits this policy's description, and because the policy names
> its own remedy.

## What it says

> "Scaled content abuse is when many pages are generated for the primary purpose of manipulating search
> rankings"

The content is typically unoriginal, gives users little or no value, whatever the method of
production. Examples listed:

- > "Using generative AI tools or other similar tools to generate many pages without adding value for
  > users"
- Scraping feeds, search results or other content to create many pages, including through
  synonymizing, translating or similar transformations, where users gain little.
- Stitching or combining content from different pages without adding value.
- Creating multiple sites to hide how scaled the content is.
- Creating many pages that make little sense to a reader but contain search keywords.

The remedy for hosted content of this kind:

> "If you're hosting such content on your site, exclude it from Search."

> "Last updated 2026-08-28 UTC."

## What it does not say

- Anything about AdSense. It is a Search policy.
- Whether "exclude it from Search" means `noindex` specifically, though `noindex` is Google's
  documented mechanism for excluding a page from Search (see `google-robots-meta-tag.md`).
