# Deploy

Two Cloudflare projects, both deploying on a push to `main`, neither needing a
secret in CI.

| | project | root directory | source of the build command |
| --- | --- | --- | --- |
| Web | Pages `funsona-web` | repo root | dashboard |
| API | Worker `funsona-api` | `apps/api` | dashboard |

## The build command is not in this repository, and it names a package

⚠️ **`funsona-api`'s Workers Build runs `pnpm --filter @funsona/shared build`,
and that string lives in the Cloudflare dashboard.** Nothing here references it,
`grep` will not find it, and no test covers it.

That matters because it hardcodes a package name. When `@FunSona/shared` was
renamed to `@funsona/shared` on 2026-09-03, the filter stopped matching any
package and the build failed — with the code compiling fine locally, because
`wrangler deploy --dry-run` from `apps/api` never runs the dashboard's command.

So: **renaming a workspace package is a two-place change.** The manifest is
here; the filter is there. Check the dashboard before assuming a rename is done.

This is the fourth time in one day that configuration split between a dashboard
and a repository failed silently across this account — an orphaned build config
on one project, a root `wrangler.toml` a sibling's Pages builder claimed as its
own, a Worker that was never connected to Git at all, and this. The pattern is
always the same: the repository cannot see the setting, so nothing warns when
they diverge.

## What else the dashboard owns

- **Deploy command** `npx wrangler deploy`, and `npx wrangler versions upload`
  for non-production branches.
- **Root directory** `apps/api`. The Pages project builds from the root, so a
  `wrangler.toml` carrying `main` must never sit there — a sibling project's
  Pages build read one as its own configuration and broke.
- **Build variables**: none. Runtime bindings are in `apps/api/wrangler.toml`
  and visible here.

Secrets are set with `wrangler secret put` and never appear in a file.
