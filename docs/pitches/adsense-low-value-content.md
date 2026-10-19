---
tags:
  - pitch
  - area/content
  - area/monetization
status: active
epic: adsense
kanban:
---

# Pitch — Clear the AdSense "low value content" rejection

## Problem

AdSense has held funsona.com at **"Requires attention — Low value content"** since the review of
2026-08-16. `ads.txt` is authorized and the ad code is on the page, so this is not a technical
failure: Google looked at the site and decided it is not worth monetizing. The product README sets
"AdSense approval within 30 days of launch" as a success metric; that window is long gone, and until
this clears the site earns nothing from the traffic it does get.

The work done so far aimed at the wrong thing. The 2026-07-15, 07-16 and 08-20 commits fixed page
depth, trust pages and crawlability, and the 2026-08-20 audit
(`scripts/quiz-audit-2026-08-20/README.md`) concluded the catalogue was "structurally fine". It is
structurally fine. Every sampled quiz page has 779–1536 words, robots and the sitemap pass, About and
Contact are real. **Length was never the problem.**

What the production database shows (D1, read-only `SELECT`, 2026-10-18):

| measurement | value |
|---|---|
| published quizzes | 762 |
| authored by the seed account `@admin` | **750 (98.4%)** |
| creation window of those 750 | **2025-10-22 → 2025-11-06, 16 days, ~47/day** |
| `@admin` quizzes with zero attempts | 652 of 750 |
| attempts across the whole site | 245 (`quiz_results`: 36, comments: 0) |
| words per outcome, PERSONALITY (median of per-quiz medians) | **38** (p90: 47) |
| quizzes with any outcome of 200+ words | **1 of 749** |
| `intro_content` filled in | 0 of 750 |
| titles starting with the "which/what/who are you" template | 502 of 750 |
| `ads_eligible = 1` | exactly the 750 `@admin` quizzes |

The catalogue came out of a generation pipeline (the unresolved `%GIPHY: …` image placeholders in 16
quizzes are its fingerprint, and `0004_ads_eligible.sql` itself calls it content "vetted at generation
time") and then went through a mass LLM rewrite ([[quiz-refactor-pilot-2026-06-30]]). Several titles
are recognisable adaptations of well-known viral quizzes
(`quantas-criancas-de-cinco-anos-voce-pode-lutar-…`, the `qual-jogo-de-<console>-voce-deve-jogar-a-seguir`
series). The payoff of a personality quiz, the outcome, is one or two sentences.

That is the profile a reviewer calls low value: hundreds of pages from one author in two weeks, built
on a template, with a thin result, which nobody plays. And the 2026-08-20 gate made it worse. It
turned ads **on** for exactly those 750 pages and **off** for the 12 written by real people.

On top of that, the site makes claims a reviewer can check and refute. The home page shows a
hardcoded `+10k` plays stat (`apps/web/src/pages/index.astro:130`) against 245 in the database. About
claims more than 1,000 quizzes (762), "one of the biggest quiz portals in Brazil" and an "active
community" (0 comments) (`apps/web/src/pages/about.astro:50-55`). "The biggest quiz platform on the
internet" sits in `Footer.astro:48`, `index.astro:86`, `about.astro:7` and `contact.astro:108`.

Who it is wrong for: the owner, who cannot monetize. The reader landing from Google gets a generic
result. And so does any future reapplication, because every request for review on the same catalogue
spends another 2–4 week cycle for the same answer.

## Solution

**Shrink what Google sees to what is worth seeing, then make that part good.** Rewriting 750 quizzes
is not feasible and would repeat the scale problem with a different pen. The proposal:

1. **A curated core.** Pick a subset of the catalogue (size and criterion open, see Research Needed)
   and bring each quiz up to a bar: outcomes rewritten by hand at 150–300 words each, `intro_content`
   filled, images checked, title not a copy of a known viral format.
2. **Everything else leaves the index and the ads, but stays playable.** Non-curated quizzes get
   `noindex, follow`, drop out of `sitemap.xml` and out of the public listings (home, explore,
   categories, "more to play"). They carry **no ad code at all**: no `AdSlot`, and no `adsbygoogle.js`
   loader, which today `Layout.astro:130` puts on every page, `/login` included. A direct link still
   works. Nothing is archived or deleted. `noindex` alone was shown not to be enough, see
   [[2026-10-18-adsense-noindex-review/research|2026-10-18-adsense-noindex-review]].
3. **Stop claiming what is not true.** Stats come from the API or are removed. The superlatives go.
   Play and like counters are hidden below a threshold instead of printing zero on every page.
4. **Close the remaining audit findings.** The privacy policy gets Google's third-party-vendor cookie
   paragraph and opt-out links. The three guides go past 1200 words and two or three more are added,
   built on data only this site has. `/explore/<unknown>` answers 404 instead of 200. Cloudflare Email
   Obfuscation stops producing the `/cdn-cgi/l/email-protection` link that 404s for crawlers.
5. **Reapply only after Google has re-crawled the smaller site**, with the coverage drop visible in
   Search Console.

## Architecture

No new component. The change is one boolean deciding three things that today are decided separately
or not at all:

```
quizzes.<curated flag>
   ├─ apps/web/src/pages/quiz/[slug].astro   → Layout noindex when false (prop already exists)
   ├─ apps/web/src/pages/sitemap.xml.ts      → only curated quizzes listed
   ├─ apps/api/src/routes/quizzes.ts GET /   → public listings return curated only
   ├─ AdSlot in [slug].astro, QuizPlay.tsx, QuizResultScreen.tsx → render only when true
   └─ adsbygoogle.js loader in Layout.astro  → loaded only when true (and never on login/settings)
```

Whether that flag **is** `ads_eligible` or a new column next to it is open (Research Needed). Either
way, there is one place an admin flips, and noindex and ads can never disagree.

The editorial half (picking the core, writing outcomes, expanding guides) is content work in the
database and in `apps/web/src/pages/guides/`, not code.

## Schema / Data Changes

- **Backfill reversing 0004's.** Set the flag to `0` on the non-curated `@admin` quizzes. Reversible:
  the original set is recoverable from `author_id = '00000000-0000-0000-0000-000000000000'`, so this
  is not a one-way migration.
- **Possibly a new column** (`indexable` or `curated_at`) if the flag is split from `ads_eligible`.
  An additive `ALTER TABLE … ADD COLUMN` with a default; reversible.
- **Outcome text and `intro_content` rewritten in `quizzes.content`** for the curated set. ⚠️ **This
  one is one-way** unless the previous `content` is exported first. The 2026-06-30 rewrite already
  overwrote the originals once with no copy kept.
- **Seed profile display name** (`Administrador` / `@admin`) renamed to something a reader can
  understand, such as a team name. ⚠️ Check the `naming` skill first: `@admin` is a handle, and handles
  end up in URLs (`/profile/admin`). Renaming it may need a redirect.

## Interfaces / APIs

| Method | Route / Entry point | Auth | Description |
|--------|---------------------|------|-------------|
| GET | `/quizzes` | public | Listings return curated quizzes only (or accept a filter the web passes) |
| GET | `/quizzes/:slug` | public | Payload carries the curated flag, so the page can set noindex and ads |
| POST | `/quizzes/:id/approve-ads` | admin | Exists. Becomes "curate", or gains a sibling, depending on the flag decision |
| POST | `/quizzes/:id/revoke-ads` | admin | Exists. Same |
| — | `sitemap.xml.ts` | — | Lists curated quizzes plus static pages and guides |
| — | `/explore/[category]` | — | Unknown category returns 404 |

## Scope

### In Scope
- [ ] One flag driving noindex, sitemap inclusion, public listings and ads
- [ ] Backfill: non-curated `@admin` quizzes off the index and off ads
- [ ] Curated core: outcomes 150–300 words, `intro_content`, images checked
- [ ] Export of current `content` for the curated set before it is rewritten
- [ ] False stats and superlatives removed (home, About, Footer, Contact, meta descriptions)
- [ ] Counters hidden below a threshold
- [ ] Privacy policy: third-party vendor / Google cookie paragraph and opt-out links; stale "RLS"
      wording fixed
- [ ] Guides: the existing three past 1200 words, plus two or three new ones with site-only data
- [ ] `/explore/<unknown>` returns 404
- [ ] AdSense loader conditional: only on curated quizzes and content pages, never on auth/settings
- [ ] `www.funsona.com` 301 to the apex (today 200 + canonical; the AdSense crawler visits both)
- [ ] Cloudflare Email Obfuscation off (dashboard, owner action)
- [x] Decide on the sensitive quizzes (decided: outside the core): `qual-personagem-yaoi-voce-e-…`,
      `quantas-pessoas-querem-que-voce-morra-…`, `descubra-quao-atraente-voce-e`
- [ ] Reapply in AdSense once Search Console shows the smaller index

### Out of Scope
- Deleting or archiving the non-curated quizzes. They stay playable by direct link.
- Rewriting all 750. The core is the whole bet.
- Any new generation pipeline, LLM-driven or otherwise, to "fix at scale". That is how the catalogue
  got here.
- Moderating or curating community quizzes. They keep today's behaviour (no ads) and additionally get
  noindex. A review flow for them is separate work.
- en/es versions of the curated quizzes.
- The `good/generic/wrong` visual classification of all 9,110 images. Only the curated set is checked.
- Premium, Stripe, gamification, or anything else on the roadmap.

## Decisions

Taken by the owner on 2026-10-18, after
[[2026-10-18-adsense-noindex-review/research|2026-10-18-adsense-noindex-review]]. The plan is
[[plans/adsense-low-value-content/slice-01-true-claims-cheap-fixes|adsense-low-value-content]].

| question | decision | what it rules out |
|---|---|---|
| Curation criterion | **Clicks first.** Start from the quiz URLs with at least one Search click in 90 days (82 on 2026-10-18) | A fixed cut by plays in D1; hand-picking by theme alone |
| Who writes the core's outcomes | **An LLM drafts, the owner reviews and edits every outcome** before it is written to D1 | Unreviewed machine text; a hand-only rewrite that would force a much smaller core |
| One flag or two | **One: `ads_eligible`** decides noindex, ad code, listings and sitemap | A separate `indexable` column, and so the state "indexed without ads" |
| The three sensitive quizzes | **Outside the core.** They stay up by link, `noindex`, no ad code | Bringing restricted-adjacent content into what Google evaluates |
| Catalogue taken from quizpanda.com (found 2026-10-18, [[2026-10-18-catalogue-origin/research\|catalogue-origin]]) | **Archive all 680 seed quizzes outside the core** (slice 3b) | Keeping the tail up by link, as the original plan had it |
| How deep slice 4 rewrites the core | **Everything:** new questions, new outcomes, no third-party images | Rewriting outcomes only, on top of translated questions and hotlinked images |

## Research Needed
- [x] **Does `noindex` keep a page out of the AdSense review?** No. It is a Search directive. A page
      leaves AdSense's view by carrying no ad code, which means no `AdSlot` **and** no `adsbygoogle.js`
      loader, plus being unlinked. 404/410 is the fallback if a second review fails. See
      [[2026-10-18-adsense-noindex-review/research|2026-10-18-adsense-noindex-review]].
- [x] **Curation criterion and size.** Decided: clicks first (see Decisions). Was: Most played? Original themes over adapted viral formats? A
      number (80? 150?) or a bar any number may clear? Owner decision. Data point from the research:
      in 90 days 82 quiz URLs got at least one Search click and 54 of them hold 80% of quiz clicks,
      so a click-first shortlist keeps the traffic.
- [ ] **Is Auto ads on in the AdSense dashboard?** If it is, the loader alone places ads on any page,
      whatever the flag says. Owner check.
- [x] **One flag or two.** Decided: one, `ads_eligible`. Was: Reuse `ads_eligible` as "curated", or add `indexable` beside it? One flag
      is simpler. Two allow "indexed, no ads" for community quizzes later.
- [x] **Who writes the outcomes.** Decided: LLM draft, owner edits each. Was: By hand, or LLM-drafted and human-edited? The rejection is about
      machine-made content at scale, so this needs an explicit answer, not a default.
- [ ] **Text overlap with the web (ADS-CONTENT-OVERLAP).** Not measured. For each candidate in the
      core, how close is it to the top search results for its own title? Needs a method before it
      gates anything.
- [ ] **Google's required privacy-policy wording.** Fetch the current AdSense "required content"
      page and quote it, rather than paraphrasing from memory.
- [ ] **How long to wait before reapplying.** Is a Search Console coverage drop the right signal, and
      how long does a ~650-URL drop take to register?
- [ ] **Child-directed content.** Community quizzes include school-class ones (`6-ano`,
      `quizz-juju-e-miguel-…`). Does any of this make the site child-directed for AdSense/COPPA
      purposes?
- [ ] Store the 2026-10-18 audit (81-item checklist, D1 numbers, script outputs) as
      `research/adsense-low-value-content/research.md` with its fetches, so this pitch's numbers have
      a source on disk.

## Testing Strategy

The test is the live site and the live database, measured at both ends. A green suite proves nothing
here: the site already passes every depth check and was still rejected.

- **Index surface.** After deploy, the count of quiz URLs in `sitemap.xml` equals the count of
  curated rows in D1. Report both numbers.
- **Per page, both kinds.** For a sample of 10 curated and 10 non-curated slugs, `curl` the page.
  Curated has no `robots noindex` meta and renders an ad slot. Non-curated has `noindex, follow` and
  no slot. Report 20/20 or which failed.
- **Listings.** Home, `/explore` and each `/explore/<category>` link only curated quizzes. Count
  non-curated slugs found in their HTML: must be 0.
- **Revert check.** Flip one curated quiz's flag off and back on, then confirm `noindex` and the ad
  slot follow it both ways. A check that passes with the flag ignored is not a check.
- **Content bar.** A script over `quizzes.content` for the curated set: share of outcomes at 150+
  words, share with `intro_content` filled. Both must be 100%. Report the number.
- **Auditor re-run.** `check_technical.py`, `check_completeness.py` and `analyze_text_depth.py`
  against the live site, plus the guides at 1200+. Zero WARN/FAIL.
- **Claims.** `grep` for the removed superlatives and the hardcoded stat in `apps/web/src`: 0 hits.
  The home stats match a D1 query run the same minute.
- `/explore/does-not-exist` returns 404.

## Success Criteria
- [ ] AdSense site status for funsona.com leaves "Low value content" and reaches "Ready"
- [ ] Quiz URLs in the sitemap = curated rows in D1, and both are well under 762
- [ ] 100% of curated outcomes at 150+ words, 100% with `intro_content`
- [ ] 0 non-curated quizzes in any public listing or the sitemap; 0 with an ad slot
- [ ] 0 unverifiable claims (hardcoded stats, superlatives) left in `apps/web/src`
- [ ] Auditor scripts: no WARN or FAIL on the live site
