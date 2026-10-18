---
status: todo
---

# Slice 1 — Say only what is true, and close the cheap crawl findings

Pitch: [[adsense-low-value-content]]. Needs no decision and no database change beyond one display
name, so it ships first.

## Delivers

A reviewer opening the home, About, Contact or footer reads nothing the database contradicts, and the
four mechanical audit findings are closed:

- **Claims.** The hardcoded `+10k` plays stat goes (`apps/web/src/pages/index.astro:130`), and so do
  the superlatives:
  - "biggest quiz platform": `index.astro:86`, `Footer.astro:48`, `about.astro:7`, `contact.astro:108`
  - "more than 1,000 quizzes", "one of the biggest portals in Brazil", "active community":
    `about.astro:50-55`
- **No invented numbers on the home page.**
  - `quizzesStat` falls back to a hardcoded `+700` when the total is under 100
    (`index.astro:50`). Once slice 3 shrinks what `GET /quizzes` returns, that fallback fires and lies.
    Show the real count, or no stat.
  - `SAMPLE_QUIZZES` (`index.astro:17`, used at `:40-42`) renders invented quizzes when the API
    fails, against rule 6 of `AGENTS.md`. On failure, render no section.
- **Counters.** Play and like counts are hidden below a threshold on quiz pages and cards (`QuizCard.astro`,
  `quiz/[slug].astro`, `HeroCarousel.tsx`, `QuizGridLoader.tsx`, `ExploreLoader.tsx`,
  `ExploreCatalog.astro`), so pages stop printing "0 plays · 0 likes".
- **Seed author.** `profiles.display_name` of the seed account changes from `Administrador` to a team
  name. **The handle `admin` stays**: it is in `/profile/admin` URLs, and the `naming` skill treats a
  handle rename as a URL migration.
- **Privacy.** `/privacy` gains Google's required third-party vendor cookie paragraph and opt-out
  links, quoted from Google rather than paraphrased. The stale line naming RLS goes, since the
  database is D1.
- **Crawl.**
  - `/explore/<unknown>` returns 404, not 200.
  - `www.funsona.com/*` 301s to the apex (`middleware.ts` already issues 301s at `:132`).
  - The AdSense loader no longer renders on dead-end screens: `login`, `register`, `settings`,
    `sso-callback`, `moderation`, `quiz/new`, `profile/me`.
- **Email.** The obfuscated email no longer produces a `/cdn-cgi/l/email-protection` link that 404s.

## Needs

- 20 min: fetch Google's AdSense help page on required privacy-policy content into
  `docs/research/2026-10-18-adsense-noindex-review/fetches/` (or a sibling research directory), and
  quote the paragraph from it.
- A threshold for counters. Proposal: hide below 10. Owner can override.
- The loader change here is a `Layout.astro` prop that **defaults to on**, turned off on the
  dead-end pages listed above. Slice 2 flips the default to opt-in. Keeping the default on here means
  this slice cannot accidentally strip the loader from the home page, which AdSense needs for
  verification.

## Tests

Run against the deployed site, both ends:

- `grep -rnE '10k|maior plataforma|maiores portais|comunidade ativa|mais de 1\.000|SAMPLE_QUIZZES' apps/web/src`
  → 0 hits.
- The home quiz count equals `SELECT count(*) FROM quizzes WHERE status='PUBLISHED'` run the same
  minute, or the stat is absent. Report both numbers.
- `curl -s -o /dev/null -w '%{http_code}' https://funsona.com/explore/does-not-exist` → `404`. And
  `/explore/personality` → `200`.
- `curl -sI https://www.funsona.com/quiz/<any>` → `301` with `location: https://funsona.com/quiz/<any>`.
- For each of the 7 dead-end pages: `curl -s <url> | grep -c adsbygoogle.js` → `0`. For `/` and
  one quiz page → `1`. Report 9/9.
- A quiz page with fewer plays than the threshold shows no counter. One above it shows it.
- `/privacy` contains the quoted Google paragraph and both opt-out links.
- `check_completeness.py https://funsona.com` from `adsense-site-auditor` → no WARN on navigation.
- Revert check: comment out the `/explore` 404 guard locally, confirm the curl returns 200, restore.

## Done when

```
python scripts/check_completeness.py https://funsona.com; echo "exit=$?"
```

run from the `adsense-site-auditor` checkout prints `exit=0`, and the claims `grep` above prints
nothing.

## If stuck

- **Cloudflare keeps obfuscating the email:** if `<!--email_off-->` markers are stripped by Astro's
  HTML compression, the owner switches Email Obfuscation off in the Cloudflare dashboard (Scrape
  Shield). Or the email becomes a link to `/contact`.
- **The `www` redirect fights Pages routing in middleware:** do it as a Cloudflare redirect rule in
  the dashboard, and record that here.
