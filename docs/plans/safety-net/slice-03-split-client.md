---
status: todo
kanban: 1da2ac88-4687-4f62-82ba-f82ab54dbe32
---

# Slice 3 — Split client.ts along the sections it already has

## Delivers

`apps/api/src/db/client.ts` stops being one 886-line file with 54 exports. The file already draws its
own seams — ten section banners at `:31` Profiles, `:245` Quizzes, `:447` Tags, `:475` Likes, `:507`
Quiz results and XP, `:628` Leaderboard windows, `:704` Comments, `:764` Content reports, `:831`
Achievements, `:844` User activity — and this slice turns those comments into files.

The eleven importers keep working unchanged: `apps/api/src/routes/{quizzes,profiles,comments,leaderboard,moderation,stripe,users,auth}.ts`,
`apps/api/src/middleware/{admin,auth}.ts` and `apps/api/src/routes/webhooks/clerk.ts` all import from
`db/client`, so `client.ts` remains as a re-export barrel and no call site moves in this slice.

## Needs

- `docs/plans/safety-net/slice-02-extract-domain.md` done. The section carrying the most rules is
  `:507-:626`, and moving it before the rules inside it are covered is the blind refactor this plan is
  ordered to prevent.
- The shared helpers first: `getDb`, `newId` and `nowIso` are used across sections and have to land
  somewhere both halves can import before anything is cut.

## Tests

- `pnpm typecheck` exits 0. With 54 exports and eleven importers, this is the check that catches a
  missed re-export, and it is not a weak one.
- `pnpm test` exits 0 — the domain tests from slice 2 still pass, unchanged. If a test needed editing,
  behaviour changed and this stopped being a refactor.
- `git diff --stat` shows no change under `apps/api/src/routes/` or `apps/api/src/middleware/`. A
  route file in the diff means the barrel is incomplete.
- `pnpm lint` exits 0.

## Done when

```
wc -l apps/api/src/db/*.ts | sort -n | tail -3 && pnpm typecheck && pnpm test; echo "exit=$?"
```

shows no file over 500 lines (the clean-code soft limit `client.ts` is at 886 against today) and ends
with `exit=0`.

## If stuck

Do one section, not ten. `:704-:762` Comments is the smallest self-contained one and it touches no XP
logic — move that alone, prove the barrel re-export pattern works end to end, then repeat. If the
barrel turns out to create an import cycle, stop splitting and update the eleven importers to the new
paths instead; it is a bigger diff but a simpler graph, and `pnpm typecheck` will find every one of
them.
