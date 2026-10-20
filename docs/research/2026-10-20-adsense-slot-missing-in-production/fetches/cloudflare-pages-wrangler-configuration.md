---
tags: [fetch, 2026-10-20-adsense-slot-missing-in-production]
source: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
fetched: 2026-10-20
kind: vendor
---

# Configuration · Cloudflare Pages docs (Pages Functions, Wrangler configuration file)

> Fetched 2026-10-20 · Cloudflare's own page on using a `wrangler.toml` with a Pages project. Read to
> settle what the dashboard still manages once the repo-root `wrangler.toml` exists, and whether the
> file or the dashboard says anything about build-time injection or value encoding.

## What it says

On the dashboard once a Wrangler file is in use:

> "you can not edit the same fields in the dashboard once you are using this file."

> "You will be able to see, but not edit, the same fields when you log into the Cloudflare dashboard."

On `vars`:

> "A map of environment variables to set when deploying your Function."

On environment-specific overrides:

> "`[[env.production.vars]]` is set to override `[vars]`."

On `pages_build_output_dir`:

> "introduces a new key, `pages_build_output_dir`, which is only used for Pages projects."

> "Add the `pages_build_output_dir` key with the appropriate value of your build output directory."

On stopping to use the file:

> "Configuration values from your last deployment will still apply and you will be able to edit them
> from the dashboard."

On local use:

> "The Wrangler configuration file applies locally when using `wrangler pages dev`."

Section headings: Example Wrangler file · Requirements (V2 build system, Wrangler) · Migrate from
dashboard configuration · Differences using a Wrangler configuration file for Pages Functions and
Workers · Configure environments (Local development, Production and preview deployments,
Environment-specific overrides) · Inheritable keys · Non-inheritable keys · Limits · Bindings
(D1 databases, Durable Objects, Environment variables, Hyperdrive, KV namespaces, Queues Producers,
R2 buckets, Vectorize indexes, Service bindings, Analytics Engine Datasets, Workers AI) · Local
development settings · Source of truth.

## What it does not say

- Nothing about whether `[vars]` or dashboard variables reach the **build** step, or how they are
  injected into the build's `process.env`.
- Nothing about secrets as distinct from plain-text variables.
- Nothing about encoding, byte-order marks, or any sanitization of values.
