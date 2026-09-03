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
(
  cp apps/api/src/domain/streak.ts "${TMPDIR:-/tmp}/streak.orig" 2>/dev/null || { echo "mutant-planted=no"; exit; }
  grep -q 'currentStreak + 1' apps/api/src/domain/streak.ts || { echo "mutant-planted=no"; exit; }
  pnpm test >/dev/null 2>&1; clean=$?
  sed -i '' 's/currentStreak + 1/currentStreak + 2/' apps/api/src/domain/streak.ts
  grep -q 'currentStreak + 1' apps/api/src/domain/streak.ts && { echo "mutant-planted=no"; exit; }
  pnpm test >/dev/null 2>&1; mutated=$?
  echo "mutant-planted=yes suite-clean=$clean suite-mutated=$mutated"
)
cp "${TMPDIR:-/tmp}/streak.orig" apps/api/src/domain/streak.ts 2>/dev/null; rm -f "${TMPDIR:-/tmp}/streak.orig"
```

prints exactly `mutant-planted=yes suite-clean=0 suite-mutated=1`.

Read it as three separate claims. It takes two test runs because one exit code cannot carry them.

- `mutant-planted=yes` means the module exists, the increment was found under the parameter name this
  slice declares, and the file actually changed. `mutant-planted=no` means the gate never reached a
  test run: no `streak.ts`, or the rule is not spelled the way the grep expects. That is not a red
  test and does not count as one.
- `suite-clean=0` means `pnpm test` ran against the unmutated module and passed. This is the claim
  the gate used to skip, and the only one that establishes there is a runner at all. Anything
  non-zero means the suite was already red before the mutant was planted, so the run after it proves
  nothing about the increment.
- `suite-mutated=1` means the same suite went red once the rule added 2 instead of 1 — a test killed
  the mutant. `suite-mutated=0` means the suite passes whether the rule adds 1 or 2, so it asserts
  nothing about the increment and the slice is not done.

Write the rule as `currentStreak + 1`, spaces included; the gate greps for that literal, and
`currentStreak+1` reads as `mutant-planted=no`.

Today this prints `mutant-planted=no` — `apps/api/src/domain/` does not exist. It stays `no` until
the module lands. Once it lands it reads `suite-clean=1 suite-mutated=1` until `pnpm test` is a real
green suite, which is slice 1.

### Two earlier versions of this gate, and what each one measured instead

The first collapsed everything into a single `exit=$?` and measured neither claim: on today's tree it
printed `exit=1`, because `sed` failed on the file that does not exist yet, `&&` short-circuited
`pnpm test`, and `$?` was the sed's. It was green on an empty tree. It was also unsatisfiable in the
other direction — it grepped for `current_streak + 1`, the snake_case spelling of the D1 row in
`client.ts:570`, which cannot appear in a module whose signature this slice declares as
`nextStreak(lastActivityDate, currentStreak, today)`. The pattern never matched, no mutant was ever
planted, a correct test passed, and the gate printed `exit=0` — failure, by its own reading, for
doing the slice right.

The second fixed the grep and the short-circuit but kept one test run, and so moved the same defect
from the `sed` onto the `pnpm`. No `package.json` in this workspace declares a `test` script yet, so
`pnpm test` exits 1 with no output; `test-exit=1` then meant either "the streak test killed the
mutant" or "pnpm failed for any reason, including the script not existing", and the gate could not
tell which. `mkdir -p apps/api/src/domain` plus a three-line `streak.ts` containing
`currentStreak + 1` — no test, no runner — printed `mutant-planted=yes test-exit=1`, byte for byte
the approval string that a finished slice prints. The green-before run is what separates them.

## If stuck

If `insertQuizResult` turns out to depend on `yesterday` being recomputed mid-function in a way that
resists a pure signature, extract `calculateLevel` alone and stop. One function moved with a test that
kills a mutant is a finished slice; two functions moved with a test that passes regardless is not.
Open `slice-02b` for the streak rule with what was learned.
