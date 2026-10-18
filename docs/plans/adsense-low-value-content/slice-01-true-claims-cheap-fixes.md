---
status: done
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

### Found while doing it (2026-10-18)

The `grep` for claims turned up more than the audit had listed:

- **`login.astro`** showed `+18k` daily plays, `+3k` creators and new quizzes "24/7". D1 has 117
  profiles. These became claims nobody can refute: free to play, three interface languages, weekly and
  all-time ranking.
- **Home FAQ** said most quizzes come from the community and that the editorial ones are mostly
  trivia. On 2026-10-18, 750 of 762 come from the seed account, and 749 of those are personality
  quizzes.
- **Footer** had three social icons (Twitter, Instagram, TikTok) pointing at `href="#"`: links to
  nothing, on every page. Removed. Its "Contact" entry was a `mailto:` that Cloudflare turns into the
  404ing `/cdn-cgi/l/email-protection` link. That is the one the auditor caught from the home page. It
  now points at `/contact`.
- **`/explore/<unknown>`** was not a 200: it was a 302 to `/explore`. The auditor followed the redirect
  and saw 200, which is a soft 404 either way. Quiz, profile and guide pages already redirect to
  `/404`, and this one now does the same.
- **`.env.production`** says "Auto Ads stays off for funsona.com". That is the repo's claim, and the
  dashboard still has to confirm it.
- **The seed display name** is a migration (`0005_seed_display_name.sql`), not a manual `UPDATE`. It
  takes effect when someone runs `wrangler d1 migrations apply funsona-db --remote`. The root
  `db:migrate` script still points at Supabase.

### Done on the live site (2026-10-18)

Merged as #10 (`8b54aad`) and deployed by Cloudflare Pages. Measured on funsona.com the same evening:

| check | result |
|---|---|
| the slice's checks, re-run in the browser against funsona.com (same-origin `fetch`, since this machine's shell had lost outbound network) | **34 PASS, 0 FAIL**. The 31 local checks, plus `email_off` honoured on `/about`, `/privacy`, `/terms` and `/contact`, and the author shown as "Equipe FunSona" |
| `www.funsona.com/quiz/…?ref=www-check` opened in the browser | landed on `funsona.com/quiz/…?ref=www-check`, path and query kept. The browser hides the status of a cross-origin redirect; the 301 was measured locally |
| **Done when:** `check_completeness.py https://funsona.com` (run from the user's terminal) | **PASS=5, `exit=0`**. Before this slice: PASS=4, WARN=2. It now also finds the email as a contact channel, since Cloudflare no longer rewrites it |

### Verified locally (2026-10-18), before the merge

What ran: `astro dev --mode production`, the `web-prod-api` entry in `.claude/launch.json`, against
the production API at `api.funsona.com`, with a real Clerk key in the gitignored `apps/web/.dev.vars`.

| check | result |
|---|---|
| `scripts/adsense/check-slice-01.sh http://localhost:4322` | **31 PASS, 0 FAIL** |
| `scripts/adsense/mutate-slice-01.py`: each fix reverted, then restored | **5 of 5** checks went red without their fix and green with it (explore 404, counter threshold, login loader, home stat, `www` 301) |
| claims `grep` over `apps/web/src` | 0 hits |
| `pnpm lint`, `pnpm typecheck` | pass, 0 errors |
| home quiz stat | `+700`, computed from the API's `meta.total` (762 published, rounded down). Replacing the total with 0 removes the stat, which is what the mutation run checks |
| `www.localhost` with a Host header | 301 to the same path and query on the apex |
| screenshots of `/` and a 0-play quiz | layout intact, no counters on the quiz, stats row shows quizzes and "100% free" |

The first run of the check script was wrong in both directions. Dev mode adds
`data-astro-source-*` attributes, so the counter `grep` matched nothing, and it reported a false FAIL
on the 21-play quiz and a false PASS on the 0-play one. The pattern was fixed before any of the
numbers above.

**Not testable locally, so still open until deploy:** Cloudflare honouring `<!--email_off-->` (the
markers are in the HTML; only Cloudflare acts on them), the real `www.funsona.com` route, and
`check_completeness.py https://funsona.com` (the Done-when command).

**`0005` applied by the owner on 2026-10-18 21:30 UTC.** D1 shows `handle = admin`,
`display_name = Equipe FunSona`. The page rendered against the production API shows "Equipe FunSona"
twice and "Administrador" zero times. Quiz responses are not cached (KV holds only the auth profile
lookup), so the live site shows the new name already, ahead of the code deploy.

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
