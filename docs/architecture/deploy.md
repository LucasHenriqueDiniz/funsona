# Deploy

Two Cloudflare projects, both deploying on a push to `main`, neither needing a
secret in CI.

| | project | root directory | build command |
| --- | --- | --- | --- |
| Web | Pages `funsona-web` | repo root | dashboard |
| API | Worker `funsona-api` | `apps/api` | `pnpm build` — defined here |

## The API deploy needs no build step, on purpose

`packages/shared` exports `./src/index.ts` rather than `./dist/index.js`. Every
consumer here is a bundler — wrangler's esbuild for the Worker, Vite for the web
app — and a bundler compiles TypeScript itself. So there is nothing to build
before deploying, and `wrangler deploy` resolves the import straight from source.

That is not a style preference; it is what makes the deploy survive a
configuration store we cannot trust.

### What it replaced, and why

The Workers Build used to run `pnpm --filter @FunSona/shared build`, a string
stored only in the Cloudflare dashboard. Renaming the package to
`@funsona/shared` on 2026-09-03 left the filter matching nothing:

```
Executing user build command: pnpm --filter @FunSona/shared build
No projects matched the filters in "/opt/buildhome/repo"
Success: Build command completed
Executing user deploy command: npx wrangler versions upload
✘ [ERROR] Could not resolve "@funsona/shared"
```

**`pnpm --filter` with no match exits 0.** Cloudflare logged the build step as a
success, `dist` was never produced, and the failure surfaced two steps later as
a bundler error pointing at `src/routes/quizzes.ts:3` rather than at the command
that did nothing.

Correcting the string in the dashboard did not fix it, twice. The settings page
accepted and persisted `pnpm build`, and three subsequent builds — including one
started with **Retry build** — still ran `pnpm --filter @FunSona/shared build`.
The builder reads a record that the settings form does not write. That is the
same failure another project on this account showed the same day, where four
saved settings were ignored until the Git connection was removed and remade.

So the fix stopped being "get the dashboard to hold the right command" and
became "need no command at all". Verified with `dist` deleted:
`wrangler deploy --dry-run` from `apps/api` exits 0 and uploads 1275.89 KiB.

⚠️ **The stale build command is still in that record.** It is harmless now —
it matches nothing, exits 0, and nothing depends on its output — but anyone
reading the dashboard will see a command referencing a package that no longer
exists under that name. Removing it needs the Git connection remade.

## Why the API's build command is one word

`apps/api`'s `build` script is `pnpm --filter ../../packages/shared build && tsc --noEmit`.
It builds its own dependency before typechecking, because `@funsona/shared`
publishes `./dist/index.js` and `apps/api` imports from it — an unbuilt `shared`
is an unresolvable import at bundle time.

That script exists because the alternative failed. The dashboard used to hold
`pnpm --filter @FunSona/shared build`, and when the package was renamed to
`@funsona/shared` on 2026-09-03 the filter matched nothing. The build log is
worth reading once:

```
Executing user build command: pnpm --filter @FunSona/shared build
No projects matched the filters in "/opt/buildhome/repo"
Success: Build command completed
Executing user deploy command: npx wrangler versions upload
✘ [ERROR] Could not resolve "@funsona/shared"
```

**`pnpm --filter` with no match exits 0.** Cloudflare reported the build step as
a success, and the failure surfaced two steps later as a bundler error about a
module — pointing at the import rather than at the command that never ran.

The dashboard command is now `pnpm build`, so the knowledge of what to build
lives next to the manifest that declares the dependency. A future rename touches
both in the same diff. The filter is by **path**, not by package name, so it
survives a rename even without that.

## What the dashboard still owns

- **Deploy command** `npx wrangler deploy`, and `npx wrangler versions upload`
  for non-production branches.
- **Root directory** `apps/api`. The Pages project builds from the repo root, so
  a `wrangler.toml` carrying `main` must never sit there — on a sibling project
  a root config was read by the Pages builder as its own and broke the deploy.
- **Build variables**: none.

Runtime bindings are in `apps/api/wrangler.toml` and visible here. Secrets are
set with `wrangler secret put` and never appear in a file.

## The pattern, stated once

Four times in one day, on this account, configuration split between a dashboard
and a repository failed silently: a build config orphaned from its script tag so
four saved settings were ignored, a root `wrangler.toml` claimed by a sibling's
Pages builder, a Worker serving production for two months with no Git connection
at all, and this one. The shape never changes — the repository cannot see the
setting, so nothing warns when they drift.

The defence is to keep as little in the dashboard as possible, and to write down
what has to stay.
