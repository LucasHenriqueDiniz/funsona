---
status: todo
kanban: b91520f9-6685-40aa-9c26-d07e4fdfeb74
---

# Slice 2 — Move the two pure rules out of client.ts into a domain module

## Delivers

`apps/api/src/domain/` exists, holds no I/O and imports nothing but the standard library, and contains
the two rules that are already pure:

- `calculateLevel(xp)` — today `apps/api/src/db/client.ts:511-513`, already a pure function that just
  happens to live in the file that owns the database handle.
- `nextStreak(lastActivityDate, currentStreak, today)` — today it is not a function at all. It is
  `client.ts:570`, `const nextStreak = streak.last_activity_date === yesterday ?
  streak.current_streak + 1 : 1`, a local inside `insertQuizResult` between two D1 writes. There is
  currently no way to ask what a streak does after a two-day gap without a database.

`client.ts` imports both instead of defining them. Behaviour does not change; the call sites move.

## Needs

- `docs/plans/safety-net/slice-01-test-runner.md` done. Extracting logic from an untested production
  write path with no runner to catch the extraction is the thing this plan exists to avoid.
- 20 min on `insertQuizResult` (`client.ts:515-582`) to be sure `yesterday` (`:563`) is computed from
  wall-clock `Date.now()` and not from the row — the extracted function has to take `today` as an
  argument rather than read the clock, or it cannot be tested.

## Tests

`calculateLevel`, in `apps/api/src/domain/level.test.ts`:

- the level floor: `calculateLevel(0) === 1`, and no input returns less than 1.
- a boundary either side of a level-up, read off `Math.floor(Math.sqrt(xp / 50)) + 1` rather than
  guessed.

`nextStreak`, in `apps/api/src/domain/streak.test.ts` — the four cases the ternary at `:570` encodes:

- last activity was yesterday → `current + 1`.
- last activity was two days ago → `1`, the reset. This is the case that is impossible to test today
  and the reason this slice exists.
- last activity was today → the caller does not reach the rule at all (`:569` guards it); assert the
  guard's condition separately.
- no streak row → the insert path at `:564-568` seeds `1`, not `nextStreak`.

## Done when

```
sed -i '' 's/current_streak + 1/current_streak + 2/' apps/api/src/domain/streak.ts && pnpm test; echo "exit=$?"; git checkout apps/api/src/domain/streak.ts
```

prints `exit=1` — the streak test kills the mutant. A green run here means the test asserts nothing
and the slice is not done.

## If stuck

If `insertQuizResult` turns out to depend on `yesterday` being recomputed mid-function in a way that
resists a pure signature, extract `calculateLevel` alone and stop. One function moved with a test that
kills a mutant is a finished slice; two functions moved with a test that passes regardless is not.
Open `slice-02b` for the streak rule with what was learned.
