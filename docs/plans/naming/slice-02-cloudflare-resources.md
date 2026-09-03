---
status: blocked
kanban: b3aaace9-0242-4160-af02-f71a27818f69
---

# Slice 2 — Give the Cloudflare resources an owner prefix and an environment suffix

**Blocked on the owner twice over: renaming an R2 bucket and a D1 database is impossible in place —
it means creating new resources, copying every object and row, and cutting over a live site, which
needs a Cloudflare login I do not have — and it is only worth doing if a second environment is ever
going to exist, which is a product question.**

## Delivers

Resource names that carry their environment, so a name read in the Cloudflare dashboard says which
environment it belongs to without opening anything.

Today `apps/api/wrangler.toml` declares `name = "funsona-api"`, `database_name = "funsona-db"`,
`bucket_name = "funsona-quiz-images"` and `bucket_name = "funsona-profile-media"`, with `[vars]`
setting `ENVIRONMENT = "production"` immediately below — the environment is in a variable but not in
any name. The root `wrangler.toml:1` is `name = "funsona-web"`, same shape. The convention is already
half-present: `[env.dev]` overrides `name = "funsona-api-dev"` and nothing else, so the Worker has an
environment suffix in dev and none in prod.

## Needs

- The owner's answer to the pitch's second open question. If production is the only environment this
  project will ever have, this slice should be closed unbuilt: an `-prod` suffix on a singleton buys
  nothing and the R2 cutover risks the live image catalogue for it.
- The owner prefix, decided. `lucashdo-funsona-api-prod` or `funsona-api-prod` are different answers
  and the naming skill does not pick for us.
- A Cloudflare account login with D1 and R2 write access.
- A maintenance window. The bucket copy is not instant and writes during it are lost.

## Tests

- `npx wrangler d1 list` shows the new database name and the old one, until the old one is deleted
  deliberately as a separate step.
- `npx wrangler r2 bucket list` shows both new buckets.
- Object parity before cutover: the object count in `funsona-quiz-images` equals the count in its
  replacement, and the same for `funsona-profile-media`. A copy that silently dropped objects is the
  failure mode here.
- Row parity: `SELECT count(*) FROM quizzes` returns the same number against the old and new D1
  databases.
- Live smoke after cutover: `curl -sI https://funsona.com | head -1` returns `HTTP/2 200`, and a quiz
  page renders its cover image rather than a broken one.

## Done when

```
npx wrangler d1 list && npx wrangler r2 bucket list && curl -o /dev/null -s -w '%{http_code}\n' https://funsona.com
```

lists only resources matching the agreed `<owner>-funsona-<resource>-<env>` pattern, and prints `200`.

## If stuck

Split it: rename the Worker and the D1 database first, both of which can be re-pointed with a deploy,
and leave the two R2 buckets alone. A bucket rename is the only irreversible half, and half the
convention applied deliberately is better than a half-finished copy of the image catalogue. If the
copy is already underway and diverging, stop and keep the old bucket as the live one — the bindings in
`apps/api/wrangler.toml` are the only thing pointing at it, so rolling back is one deploy.
