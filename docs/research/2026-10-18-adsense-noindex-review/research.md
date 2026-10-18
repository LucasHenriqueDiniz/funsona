---
tags: [research, area/monetization, area/content, 2026-10-18-adsense-noindex-review]
status: active
decided: 2026-10-18
---

# Does `noindex` keep a page out of the AdSense review?

> **No.** `noindex` is a Search directive. What takes a page out of AdSense's view, by Google's own
> description, is the page not carrying ad code. The long tail needs both, and it has to be unlinked
> too.

## What was blocking

[[adsense-low-value-content]] proposes keeping a curated core indexed and monetized, and taking the
other ~650 machine-made quizzes out of Google's view without deleting them: `noindex`, out of the
sitemap, out of the listings, no ad slots. That only works if hiding a page from Search also hides it
from whoever reviews the site for AdSense. If it does not, the long tail has to go further (no ad
code at all, 404/410, or a robots.txt block), and the plan changes.

## Findings

### From the documentation

| # | finding | source | kind |
|---|---|---|---|
| 1 | `noindex` "applies to search engine crawlers". Non-search crawlers "might need" rules addressed to them by name | `google-robots-meta-tag.md` | primary |
| 2 | The robots `meta` tag recognises two tokens, `googlebot` and `googlebot-news`; "other values are ignored". So a `<meta name="Mediapartners-Google">` would not be read either (inference) | `google-robots-meta-tag.md` | primary |
| 3 | The only documented control for `Mediapartners-Google` is robots.txt addressed to its own token. `*` is ignored. Nothing documents it honouring `noindex` | `google-special-case-crawlers.md`, `adsense-about-ads-crawler.md`, `adsense-crawler-robots-txt.md` | primary |
| 4 | "Only pages displaying Google ads should be sending requests to our systems and being crawled." The ad code on the page is what brings the AdSense crawler | `adsense-about-ads-crawler.md` | primary |
| 5 | The policy behind "low value content" is phrased per screen that carries ads: "We do not allow Google-served ads on screens … with low-value content", and "Don't place ads on automatically generated content without manual review or curation" | `publisher-policy-screens-without-content.md` | primary |
| 6 | Dead-end screens (Thank You, Exit, Error) must not carry ads | `publisher-policy-screens-without-content.md` | primary |
| 7 | For scaled, machine-made content the Search spam policy names its own remedy: "exclude it from Search". `noindex` is that mechanism | `search-spam-policies-scaled-content.md` | primary |
| 8 | Sites with "relatively high amounts of unhelpful content overall" do worse in Search. "removing unhelpful content could help the rankings of your other content", with the signal applied "over a period of months" (2022 post, flagged by Google as possibly outdated) | `helpful-content-update-2022.md` | primary |
| 9 | The AdSense crawler visits `site.com` and `www.site.com` separately | `adsense-about-ads-crawler.md` | primary |
| 10 | Re-review takes "a few days, but in some cases can take 2-4 weeks". Crawler index changes take "up to 1 or 2 weeks" | `adsense-site-not-ready.md`, `adsense-about-ads-crawler.md` | primary |

### Measured on funsona.com, 2026-10-18

| measurement | how | value |
|---|---|---|
| Pages loading `adsbygoogle.js` | `curl` of a seed quiz, two community quizzes, `/about`, `/login`, counting the loader `<script>` | **5 of 5**. It is unconditional in `apps/web/src/layouts/Layout.astro:130` |
| Pages with a `robots` meta | same `curl`, `<meta name="robots">` | 0 of 5 (only `/quiz/<slug>/play` sets `noindex` today) |
| `ads_eligible` gates | code read | only the three manual `AdSlot` placements, never the loader |
| Search clicks, 90 days (2026-07-19 → 10-16) | `sitestats summary --site funsona --days 90` | 155 clicks, 3,920 impressions |
| Clicks landing on seed-account quizzes | `sitestats gsc funsona --dim page --days 90` joined to the D1 dump by slug | **141 of 156** (page-level rows sum to 156) |
| Quiz URLs with at least 1 click | same | 82 |
| Quiz URLs holding 80% of quiz clicks | same | **54** |
| `www.funsona.com` | `curl -I` | 200 with `canonical` to the apex. No redirect |

So the loader, and with it whatever AdSense does on a page that carries ad code, sits on every page
of the site today, including `/login` (finding 6) and the community quizzes the 2026-08-20 gate meant
to protect. Whether Auto ads is switched on in the dashboard is not visible from outside. If it is,
the loader on its own places ads on any page, whatever `ads_eligible` says.

## Verdict

`noindex` on its own does **not** take the long tail out of AdSense's view. Nothing documents the AdSense
crawler honouring it, and the policy that produced the rejection is about pages that carry ads, not
pages that rank.

For a non-curated quiz, the design that matches what Google documents is all four of these:

1. **`noindex, follow`** takes it out of Search. That is the spam policy's own remedy (finding 7), and
   it should also help the curated pages rank (finding 8).
2. **No ad code at all.** No `AdSlot` and **no `adsbygoogle.js` loader**. By finding 4, a page without ad
   code gives the AdSense crawler no reason to request it. And by finding 5, it is not a "screen with
   Google-served ads" for the policy to judge. This means the loader in `Layout.astro` has to become
   conditional, driven by the same flag. It also comes off `/login`, `/register`, `/settings` and the
   other dead-end screens (finding 6).
3. **Not linked** from home, `/explore`, categories, "more to play", or the sitemap, so nobody reaches
   it by browsing the site, a reviewer included.
4. **Still served (200) by direct link.** No source requires deletion. The pages stay playable for
   anyone holding a shared link.

**404/410 and a robots.txt block are not needed now.** Both are the fallback if a second review fails
on the smaller site:

- **410:** the measured cost is small, since 54 URLs hold 80% of quiz clicks and the curated core
  should contain them.
- **robots.txt:** a `Mediapartners-Google` disallow needs the long tail under its own path prefix. That
  is a URL migration with redirects, so it is the costlier of the two.

Also from this research:

- **301 `www` → apex.** The AdSense crawler treats them as two sites (finding 9), and GSC and AdSense
  both show traffic on `www.funsona.com` today.
- **Pick the core by clicks first.** The 82 quiz URLs with any click are the natural candidate list,
  and that answers part of the pitch's "curation criterion" question with data.

### The strongest case against

The site review is not the ad crawler, and no primary source says how the reviewer picks pages.
Google has known all 762 quiz URLs for months: they were in the sitemap, carried the loader and are
indexed. A reviewer, or a classifier, working from that history could still open a long-tail URL.
It would get a 200 and a thin page, with no ads and a `noindex`. Whether that page counts against the
site is undocumented.

The policy text says it should not, because it is scoped to screens carrying ads. But "low value
content" at application time is a site-level verdict whose method Google does not publish. That
residual risk is real. Only 410 removes it, and 410 is what the fallback above is for.

## What this does not establish

- **How the AdSense site review samples pages.** Not found in any primary source. The four AdSense
  Help pages read are silent on it.
- **Whether `Mediapartners-Google` ignores `noindex`.** It is undocumented either way. "It is not
  documented to honour it" is the finding; "it ignores it" would be a claim.
- **Whether a `noindex` page counts as "removed"** for the site-wide helpfulness signal. The 2022 post
  says "removing", and Google's newer FAQ, which supersedes it, was not read.
- **Whether Auto ads is enabled** for funsona.com. This is owner and dashboard information.
- **`quizhub.com.br`** appears in the same AdSense report (20 page views in 90 days) and in the
  Search Console properties. The spam policy lists "creating multiple sites to hide how scaled the
  content is". Whether quizhub serves the same catalogue was not checked: it answered HTTP 429 to
  `curl`.
- **What the Policy Center says** at page level for funsona.com. It has no API and was not opened.

## Sources

- [List of Google's special-case crawlers](https://developers.google.com/search/docs/crawling-indexing/google-special-case-crawlers) — `fetches/google-special-case-crawlers.md` — `Mediapartners-Google` is controlled by robots.txt to its own token; nothing on meta/noindex
- [Robots meta tag specifications](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) — `fetches/google-robots-meta-tag.md` — `noindex` scope is search crawlers; only two meta tokens recognised
- [Give access to the AdSense crawler in your robots.txt file](https://support.google.com/adsense/answer/10532?hl=en) — `fetches/adsense-crawler-robots-txt.md` — robots.txt is the crawler's control
- [About the AdSense ads crawler](https://support.google.com/adsense/answer/99376?hl=en) — `fetches/adsense-about-ads-crawler.md` — only pages with ad code are crawled; www and apex crawled separately; 1–2 week lag
- [Google-served ads on screens without publisher-content](https://support.google.com/publisherpolicies/answer/11112688?hl=en) — `fetches/publisher-policy-screens-without-content.md` — the policy is per ad-bearing screen; auto-generated content needs manual review
- [Make sure your site's pages are ready for AdSense](https://support.google.com/adsense/answer/7299563?hl=en) — `fetches/adsense-pages-ready.md` — silent on review method
- [Site not ready to show ads](https://support.google.com/adsense/answer/9061852?hl=en) — `fetches/adsense-site-not-ready.md` — re-review procedure and 2–4 week window
- [Spam policies for Google web search](https://developers.google.com/search/docs/essentials/spam-policies) — `fetches/search-spam-policies-scaled-content.md` — scaled content: "exclude it from Search"
- [What creators should know about Google's August 2022 helpful content update](https://developers.google.com/search/blog/2022/08/helpful-content-update) — `fetches/helpful-content-update-2022.md` — site-wide signal; removal helps other pages; months to clear

Seen in search results only, **not read** (no fetch file):

- [How can you solve the "low value content" AdSense disapproval challenge](https://support.google.com/adsense/community-guide/241032356/how-can-you-solve-the-low-value-content-adsense-disapproval-challenge?hl=en) — community guide; the fetch returned navigation only
- Lumar Office Hours summaries and eiway.com / monetizemore.com guides — secondary and vendor; their snippets advise noindex for thin navigational pages and deletion for leftovers, and none cites a Google source for AdSense review behaviour
- Google's newer helpful-content FAQ, which supersedes the 2022 post
