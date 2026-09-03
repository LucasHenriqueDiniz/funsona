---
status: todo
kanban: af9622ba-ab12-4def-943d-1978e84fa424
---

# Slice 1 — Rewrite AGENTS.md and docs/ against the stack on disk

## Delivers

An agent that reads `AGENTS.md` and the five documents the vault holds is told about D1, R2 and
Clerk, and is
no longer instructed to use `supabase-js`, the `FunSona_session` cookie or `jose`. Today it is told the
opposite: `AGENTS.md:67` makes reading `docs/product/README.md` and
`docs/architecture/ARCHITECTURE.md` mandatory before implementing anything, and
`docs/research/README.md:59` says Clerk was "Rejected ... do not revisit".

## Needs

- Nothing. This slice reads code that is already merged and writes prose.
- 30 min reading `apps/api/src/index.ts`, `apps/api/src/middleware/auth.ts`,
  `apps/api/src/routes/webhooks/clerk.ts` and `apps/api/wrangler.toml` to get the current stack right
  rather than guessed.

## Tests

There is no test runner in this repo yet (see `docs/plans/safety-net/`), so the checks here are greps
and they are the whole definition of done:

- `git grep -ril supabase -- AGENTS.md docs/architecture docs/product docs/roadmap docs/research`
  prints exactly `docs/research/README.md` and nothing else.
- `grep -n "Superseded" docs/research/README.md` prints a line — the two reversed decisions at `:49-59` are
  kept as history under that heading, not deleted.
- `grep -c "D1" AGENTS.md` prints a number greater than 0.
- `grep -n "FunSona_session\|jose" docs/architecture/ARCHITECTURE.md` prints nothing.
- Every `docs/` path named anywhere in `AGENTS.md` exists:
  `for f in $(grep -oE 'docs/[a-zA-Z0-9/_.-]+\.md' AGENTS.md | sort -u); do test -f "$f" || echo "MISSING $f"; done`
  prints nothing.

## Done when

```
git grep -ril supabase -- AGENTS.md docs/architecture docs/product docs/roadmap docs/research
```

prints exactly one line, `docs/research/README.md`, and nothing else.

## If stuck

If the current auth flow cannot be described confidently from the code in under an hour, do not invent
it: replace the wrong paragraph with a one-line pointer to `apps/api/src/middleware/auth.ts` and a
`TODO` naming what is unknown. A doc that says "read the code here" is worse than a good doc and much
better than a confident lie, which is what is there now.
