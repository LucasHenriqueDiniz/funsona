---
tags: [fetch, 2026-10-20-adsense-slot-missing-in-production]
source: https://developers.cloudflare.com/pages/configuration/build-configuration/
fetched: 2026-10-20
kind: vendor
---

# Build configuration · Cloudflare Pages docs

> Fetched 2026-10-20 · Cloudflare's page on the Git-integration build. Read for where build-time
> environment variables are set and whether anything documents how they are injected.

## What it says

> "If your project makes use of environment variables to build your site, you can provide custom
> environment variables:"

> "In the Cloudflare dashboard, go to the **Workers & Pages** page."
> "Select your Pages project."
> "Select **Settings** > **Environment variables**."

> "The following system environment variables are injected by default (but can be overridden):"

System variables listed, by their use-case column: `CI` ("Changing build behaviour when run on CI
versus locally"), `CF_PAGES` ("Changing build behaviour when run on Pages versus locally"),
`CF_PAGES_COMMIT_SHA`, `CF_PAGES_BRANCH` ("Customizing build based on branch, for example, disabling
debug logging on `production`"), `CF_PAGES_URL`.

Section headings: Build configuration · Build commands and directories · Framework presets ·
Environment variables.

## What it does not say

- Nothing about `wrangler.toml`.
- Nothing about encoding or a byte-order mark on injected values.
- It does not state in so many words that project variables are available during the build; the
  "to build your site" sentence and the system-variable use cases are what imply it.
