---
name: quiz-authoring
description: Rewrite FunSona core quizzes end to end, one batch of up to 10 at a time - pick, screen for sensitive content, fact-check canon with subagents, draft in pt-BR, measure the template signature, gate, prove locally, stop for owner review, write to production, check live, record. Also covers generating quiz images with fal. Use when the user asks for the next rewrite batch ("faz o lote N", "próximo lote"), to rewrite or fix a specific core quiz, to make quiz images or covers, or for any work in scripts/adsense-core/.
---

# Quiz authoring

AdSense rejected funsona.com for "low value content": hundreds of quizzes from one seed account,
built on a template, with one-line outcomes. The fix is a small curated core (`ads_eligible = 1`)
where every quiz is rewritten whole and **read by the owner before it reaches the database**. That
human read is what the policy asks for ("manual review or curation"), so this skill never removes it.

Background, if needed: `docs/pitches/adsense-low-value-content.md`, and the slices in
`docs/plans/adsense-low-value-content/` (4 built the pipeline, 5 records every batch).

## Hard stops

- **No remote write without the owner's go in chat**, for each batch. `apply.mjs --target remote`
  and anything that uploads to R2 wait for it.
- **At most 10 quizzes per batch.** The owner's review time sets the pace. Mass production is how
  the catalogue got rejected.
- **No URL in a draft.** The gate refuses it. Images reach the database only through the image
  step below, hosted on `api.funsona.com`.
- **No franchise character in a generated image.** A drawing of Tanjiro is still a copy of
  someone's character. Generate the theme (a katana in a misty forest), never the named character
  or a recognisable likeness.
- **Never drive ChatGPT or any other web UI through the browser to make images.** The OpenAI terms
  forbid extracting Output "automatically or programmatically". Use fal (below).
- **New quizzes are out of scope.** `apply.mjs` only updates curated, published slugs. There is no
  insert path, on purpose.

## Where things are

| what | where |
|---|---|
| the core, ranked by Search clicks | `scripts/adsense-core/core.csv` (`decision = keep`) |
| the bar, the gate, D1 access | `scripts/adsense-core/rewrite/lib.mjs`. **The numbers live here only** |
| gate without the review flag | `node scripts/adsense-core/rewrite/check.mjs <draft.json>…` |
| write | `node scripts/adsense-core/rewrite/apply.mjs --target local\|remote <draft.json>…` |
| measure | `node scripts/adsense-core/rewrite/report.mjs --target local\|remote [--baseline <sqlite>] [slug…]` |
| drafts (pt-BR, gitignored) | `scripts/adsense-core/drafts/<slug>.json` |
| batch log | `docs/plans/adsense-low-value-content/slice-05-rewrite-rest-of-core.md` |

A draft has `slug`, `title`, `description`, `intro_content` (`context`, `what_youll_learn`,
`how_scoring_works`), `questions`, `outcomes`, `reviewed`. Read two existing drafts before writing
the first one of a session.

## The path

1. **Pick.** The next `keep` rows of `core.csv` after the last batch in the slice-05 log. Confirm
   each is `PUBLISHED` with `ads_eligible = 1` in remote D1 (read-only `SELECT`).
2. **Screen**, before drafting a word. Take a quiz out of the batch and propose it to the owner,
   with the reason, when it has:
   - minors in a romantic or sexual frame, or a source known for it (the waifu quiz, batch 2);
   - a character canonically predatory towards children (Hisoka was left out of Hunter x Hunter);
   - anything near the three quizzes the owner already took out of the core (yaoi, "who wants you
     dead", attractiveness).
3. **Fact-check canon, in parallel.** For each quiz built on a franchise, start one subagent
   (`general-purpose`) with the quiz's characters or items. It reads the fandom wiki with WebFetch
   and returns, per character: the canon traits the outcome may use, and red flags (age, abuse,
   spoilers). The main session uses that list. A subagent does not draft.
4. **Draft** in the main session, so the batch has one voice. Rewrite the whole quiz: new questions,
   new answer weights, new outcomes, new intro. Keep `"reviewed": false`.
5. **Measure the template signature** with a scratch script (not committed):
   - the opener of each outcome's last paragraph, repeated inside one quiz. Batch 2 went from 54 of
     109 outcomes opening "O desafio de/do…" to 9 of 57. Rewrite repeats by hand;
   - cross-quiz 5-gram Jaccard against every existing draft. Batch 2: mean 0.02%, max 10.5%.
6. **Gate and local proof.**
   - `check.mjs` on the batch, all ok;
   - `apply.mjs --target local`, then `report.mjs --target local` on the batch, N of N;
   - at least 4 pages from the local web app on the local D1 copy (`.claude/launch.json`:
     `api-prod-copy` plus `web-local-api`): the new intro is there, and there is no third-party
     media in the quiz body.
7. **Stop. Hand the owner a short pt-BR summary:** the slugs, what was held back and why, the
   numbers from steps 5–6. Then wait.
8. **After the owner's go:**
   - set `"reviewed": true` on what they approved;
   - back up: `wrangler d1 export --remote --table quizzes`, restored and counted, plus a Time Travel
     bookmark (slice 4 records both);
   - `apply.mjs --target remote`, then `report.mjs --target remote` on the whole core;
   - check every page of the batch on funsona.com in the browser;
   - the sitemap's quiz URL count equals D1's count of `PUBLISHED` with `ads_eligible = 1`.
9. **Record** a "Batch N drafted" and a "Batch N in production" section in the slice-05 log, in
   English, with the measured numbers in tables. Commit (house rules: the `hexagram:git` skill).

## Agents

| job | who | why |
|---|---|---|
| canon facts and red flags, one quiz each | `general-purpose` subagents, in parallel | independent, and it keeps wiki pages out of the main context |
| drafting | main session | one voice across the batch |
| adversarial read of the finished batch | one `general-purpose` subagent | finds sensitive content, canon errors and repeated phrasing the author stops seeing |
| fact-check of the finished drafts, one quiz each | `general-purpose` subagents, in parallel, checking every factual claim in the draft against the wiki | batch 3 passed the gate and the local render, and this still found real errors in 4 reports (Shikamaru's shadow "costing no energy", *sora* given as a reading of "neve") |
| measuring, gating, writing | scripts | a number, not an opinion |

## Images (fal)

**Status:** the generation and upload step is
`docs/plans/adsense-low-value-content/slice-05b-generated-images.md`. Until that slice is built, a
quiz goes live with no images and renders the gradient fallback.

- **Access.** `FAL_KEY` in the environment serves both routes:
  - **MCP**, for discovery and one-off looks (`search_models`, `get_model_schema`, `get_pricing`,
    `run_model`…). The project's `.mcp.json` points at `https://mcp.fal.ai/mcp`. Its
    `headersHelper`, `scripts/fal-mcp-headers.sh`, reads the key from the Keychain and prints the
    `Authorization: Bearer` header. A plain `${FAL_KEY}` header failed in the desktop app
    (`AUTH_HEADER_REJECTED`, because the app does not inherit the shell profile). fal's own docs only
    describe the OAuth relay (`https://mcp.fal.ai/mcp-relay`). The key route was checked on
    2026-10-20: `initialize` returned 200, `tools/list` returned 60 tools, and `get_pricing`
    answered;
  - **REST**, for the slice 5b script that generates a batch and writes files to disk.

  If the key is missing, the MCP server fails to connect. Say so and stop the image step. Text
  still ships.
- **Models**, checked on 2026-10-20 on fal's model pages. Prices change, so run `get_pricing`
  before a batch:

  | endpoint | price | commercial use |
  |---|---|---|
  | `fal-ai/nano-banana-2` (default) | $0.08 per image at 1K | "Commercial use enabled through fal.ai" |
  | `openai/gpt-image-2` (fallback) | $0.037 at 1024×768, medium quality | "via fal Partner agreement" |

- **Prompts.** The theme, not the character. No text or logos. 4:3 for covers, since the landing
  card is `aspect-[4/3]`. One style suffix per quiz, so the outcomes look like a set.
- **Review.** The owner approves images like text: a local contact sheet per batch, before any
  upload.
- **Hosting.** Approved files go to R2 bucket `funsona-quiz-images` and are referenced as
  `https://api.funsona.com/media/quiz-images/<path>`. Never store a fal URL in D1.
- **Fallback order:** nano-banana-2 → gpt-image-2 → no image (gradient). There is no stock-photo
  search. Per-file licences and attribution are not worth it for this.

## Setup, once per machine

The owner creates the key at https://fal.ai/dashboard/keys and keeps it in the macOS Keychain. The
agent never sees or types the key:

```bash
security add-generic-password -a "$USER" -s fal.ai -w
```

That prompts for the key. Then `~/.zshrc` reads it:

```bash
export FAL_KEY="$(security find-generic-password -a "$USER" -s fal.ai -w 2>/dev/null)"
```

That covers scripts run from a shell. The MCP server does not need it, because its helper reads the
Keychain itself. Claude Code asks once to approve the project's `fal` server from `.mcp.json`. The
helper is macOS-only. On another OS, replace it with that OS's secret store.
