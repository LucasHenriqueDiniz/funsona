---
status: todo
kanban: 81dbf37d-8adb-44aa-ae3a-bd67ab9d4284
---

# Slice 1 — A test runner that CI can fail on

## Delivers

`pnpm test` exists and runs, and `.github/workflows/ci.yml` fails when a test fails. Today neither is
true: no `package.json` in the workspace declares a `test` script, `git ls-files | grep -iE
'\.(test|spec)\.|__tests__|vitest|jest'` returns nothing, and CI runs Lint and Typecheck only —
neither of which executes application logic.

The slice ships with exactly one real test, not a placeholder: `calculateLevel`
(`apps/api/src/db/client.ts:511-513`) is already pure, already exported, and takes a number. It needs
no seam invented for it, so it proves the runner works without pre-empting slice 2.

## Needs

- `vitest` as a dev dependency in `apps/api`, and a root `"test": "pnpm -r --if-present test"` matching
  the shape of the existing `lint` script at `package.json:7`.
- No Workers pool yet. `@cloudflare/vitest-pool-workers` is for tests that need D1 bindings; a pure
  function does not, and pulling in the pool here would make the first green run depend on
  `workerd` booting.
- 20 min reading vitest's workspace docs, because this is a pnpm workspace and the config has to live
  where the tests do.

## Tests

- `pnpm test` exits 0 and its output contains `1 passed`.
- `calculateLevel(0)` is `1`, `calculateLevel(50)` is `2`, `calculateLevel(200)` is `3` — derived from
  `Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1)`. Verify these against the running code before
  committing them; a test that encodes a misread of the formula is worse than no test.
- The runner actually fails: change the expected value to a wrong one, confirm `pnpm test` exits
  non-zero, change it back.
- CI runs it: `grep -n "pnpm test" .github/workflows/ci.yml` prints the new step.

## Done when

```
pnpm test; echo "exit=$?"
```

prints a vitest summary containing `1 passed` and then `exit=0`.

## If stuck

If `@cloudflare/vitest-pool-workers` gets pulled in and fights the Astro build or the workerd version,
drop it — it is not needed by this slice and nothing here depends on it. If vitest cannot be made to
see the workspace, run it from `apps/api` alone (`pnpm --filter @funsona/api test`) and widen later. A
runner covering one package beats a runner covering none.
