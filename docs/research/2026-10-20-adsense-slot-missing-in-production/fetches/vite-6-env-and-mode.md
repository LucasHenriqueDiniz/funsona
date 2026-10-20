---
tags: [fetch, 2026-10-20-adsense-slot-missing-in-production]
source: https://v6.vite.dev/guide/env-and-mode
fetched: 2026-10-20
kind: primary
---

# Env Variables and Modes · Vite 6 guide

> Fetched 2026-10-20 · The Vite major the web app builds with (vite 6.4.2 under astro 5.18.1). Read
> for the precedence between `.env.production` and a variable already present in the environment.

## What it says

Under `.env` Files:

> "Vite uses dotenv to load additional environment variables from the following files"

```
.env                # loaded in all cases
.env.local          # loaded in all cases, ignored by git
.env.[mode]         # only loaded in specified mode
.env.[mode].local   # only loaded in specified mode, ignored by git
```

Under Env Loading Priorities:

> "An env file for a specific mode (e.g. `.env.production`) will take higher priority than a generic
> one (e.g. `.env`)."

> "environment variables that already exist when Vite is executed have the highest priority"

Under Modes:

> "As `vite build` runs a production build by default"

> "This means when running `vite build`, it will load the env variables from `.env.production` if
> there is one:"

Cross-checked against the installed source, `vite@6.4.2` `dist/node/chunks/dep-Dq2t6Dq0.js`,
`function loadEnv(mode, envDir, prefixes)`: the loop over the parsed env files runs first, then
`for (const key in process.env)` overwrites every prefixed key with the process value. Astro sets
`envPrefix` to `PUBLIC_` (`astro/dist/core/create-vite.js:147`).

## What it does not say

- Nothing about what a host's build pipeline does to the values before Vite sees them. The BOM is
  upstream of Vite.
