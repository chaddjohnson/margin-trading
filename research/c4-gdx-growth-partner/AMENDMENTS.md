# Amendments — Priority 3C (c4-gdx-growth-partner)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.

## Before the freeze

### R1 — 2026-11-10 (fix applied before the 13:02:26Z resume; entry written during the 13:11Z–13:19Z interruption tests, per the logs) — one in-flight evaluation per key across concurrent lanes (engineering; found by the pilot)

- **Change.** `src/c4-gdx-growth-partner/lab.ts` `evalMany` now submits each evaluation key to the worker pool once: a
  lane that asks for a key already in flight waits for that evaluation (counted as a hit) instead of submitting a
  duplicate task.
- **Why.** The first pilot run (`pilot-ref`, P18 on D19, pilot budgets) hung with every worker idle after 26,540 fresh
  evaluations: the three lanes of an arm evaluate the arm's baseline at the same moment, and the pool's per-key callback
  map (inherited from Priority 3B, where concurrent lanes never shared a key) kept only one of the duplicate tasks, so
  three lanes waited forever. The unit was stopped gracefully (SIGTERM → exit 75, archive committed) and the same command
  resumed it to completion with the fix; every lane that had finished before the stop replayed to an identical result.
- **Results that existed.** Pilot mechanics only (no study record; D19, pilot budgets).
- **Effect.** Engineering only: no evaluation, record or rule changes; the counts of fresh evaluations and hits are
  exact under concurrency.

### R2 — 2026-11-10T13:22Z (the re-adoption time) — the header cites the gates and the pilot; the evaluation caps; re-adoption

- **Change.** The protocol header now cites the sealed engineering gates (`results/parity/parity.json`, 146 checks, 0
  failed) and the pilot record (`results/pilot/PILOT.md`). §7.4's evaluation caps: search ≤ 1,000,000 per cutoff (draft
  900,000) and total ≤ 5,000,000 (draft 4,400,000), because the worst case at every extension cap with every rung-1
  centre measured is ≈ 0.9 M per cutoff. `STANDARD_ADOPTION.json` re-adopted with the new protocol sha256 and budget.
- **Results that existed.** Engineering only (bench, pilot mechanics, gates); no search, qualification or fold result of
  the study.
- **Effect.** A safety bound only; the proposal budgets, rules and gates are unchanged.

### R3 — 2026-11-10T13:23Z — formatting only (prettier) of the study's non-evaluation modules

- **Change.** `eslint --fix` (prettier line wrapping) on `src/c4-gdx-growth-partner/*.ts` except the two evaluation
  files (`worker.ts`, `doors.ts`, whose sha256 was checked unchanged), the tests and `tools/c4-gdx-growth-partner/tables.ts`
  (and one unused constant removed from the tables tool), after the pilot and the engineering gates had run.
- **Results that existed.** Engineering only (bench, pilot, gates).
- **Effect.** None on behaviour: line wrapping only; the evaluation digest is unchanged; the typecheck and the 9 unit
  tests pass on the formatted code. The freeze records the formatted code closure.
