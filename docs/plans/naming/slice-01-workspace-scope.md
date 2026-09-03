---
status: done
kanban: d9c7d5b7-5512-4820-b616-e97bf6aede91
---

# Slice 1 — Rename the root package and the @FunSona scope

**Done 2026-09-03. The owner said yes, which is the only thing this was waiting for:** `771ca18`
("Bring the scripts packages into the workspace, and give them the house scope", 2026-08-30) chose
`@FunSona/*` deliberately, so overruling it was never a lint fix — it needed the owner, and it has him.

`package.json` is now `funsona`, and the scope is `@funsona/*`. Five names, not six: the sixth,
`@FunSona/quiz-review`, was deleted with the ChatGPT pipeline in the commit before this one.

The boundary check the pitch asks for came back clean. Nothing outside this repo knew these names —
every package is `"private": true`, none is published, and the only references were two TypeScript
imports, two `pnpm --filter` invocations and `.claude/launch.json`. That is what made this a text edit.
What was *not* renamed, because it does cross the boundary, is recorded in
`docs/pitches/naming.md`.

## Delivers

`package.json:2` becomes a kebab-case slug with no version in it — `funsona`, matching the directory
on disk — and the workspace scope becomes lowercase, so the names would be publishable if these
packages ever stopped being `"private": true`.

Six names change: `package.json:2` (`FunSona-v2`), `apps/api/package.json:2` (`@FunSona/api`),
`apps/web/package.json:2` (`@FunSona/web`), `packages/shared/package.json:2` (`@FunSona/shared`),
`scripts/migration/package.json:2` (`@FunSona/migration`), `scripts/quiz-review/package.json:2`
(`@FunSona/quiz-review`).

## Needs

- The owner's yes. Nothing else — this is a pure text edit. No published consumer exists: every
  package is `"private": true` and the only references are inside this tree.
- The one non-obvious reference: `package.json:8`,
  `"typecheck": "pnpm --filter @FunSona/shared build && pnpm -r typecheck"`. A rename that misses it
  leaves `pnpm typecheck` failing with "no projects matched the filters", which is also what CI runs.
- `pnpm-lock.yaml` will change. That is expected, not drift.

## Tests

- `git grep -lE '@FunSona/|FunSona-v2' -- ':(exclude)docs'` prints nothing. The pathspec matters:
  this file and `docs/pitches/naming.md` quote the old literals on purpose, as the record of what
  they used to be, and an unscoped grep would report its own documentation as a failure.
- `pnpm install` succeeds and `pnpm typecheck` exits 0 — the second one is what proves the
  `--filter` at `package.json:8` was updated, because it fails loudly if it was not.
- `pnpm lint` exits 0.
- `pnpm --filter @funsona/api dev --help` resolves, confirming the filters still address real packages.

## Done when

```
git grep -lE '@FunSona/|FunSona-v2' -- ':(exclude)docs' | wc -l && pnpm install && pnpm typecheck; echo "exit=$?"
```

prints `0` for the grep count, then ends with `exit=0`.

## If stuck

If `pnpm install` fights the lockfile after the rename, delete `pnpm-lock.yaml` and reinstall rather
than hand-editing it — the lockfile is derived and the versions are pinned in the manifests. If the
owner says no to the rename, close this slice as `done` with a one-line note recording the decision,
so the next audit does not raise it again.
