# Amendments — New L0 trading-session re-optimization (vg-l0-session-hold)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze (edits of the draft, listed so that the adopted text is traceable); after it, `A*` (substantive) or
`O*` (operational). Criteria are never loosened by amendment once results they govern exist.

## Before the freeze

### R1 — 2026-11-12T03:15Z — the worker count from the bench (draft edit before the freeze)

- **What.** §13: the worker count is fixed at **14** (the draft deferred it to the bench).
- **Why.** The bench (`npm run vg-l0sh -- launch --unit vgl0sh-bench-w<N> --wait -- bench --door D24 --centres 96
  --workers <N> --label w<N> --warm 2 --units ses`; outputs `.cache/vg-l0-session-hold/pilot/bench/w<N>.json`) ran
  95.6 / 96.8 / 95.4 evaluations/s at 12 / 14 / 16 workers with peak job cgroup memory 7.5 / 8.8 / 10.0 GiB: throughput
  is CPU-bound and flat; 14 is the fastest measured setting and 5B's.
- **Results that existed.** Engineering only (stage V dry run, the bench, the running pilot; no study result).
- **Effect.** None on any rule, budget, seed, gate or instrument.

### R2 — 2026-11-12T03:23Z — pilot-driven code changes (no protocol rule changes)

- **What.** (1) `search.ts`: the refinement-start rule was extracted into the pure function `refinementStarts`
  (behaviour-preserving) with unit tests (`tests/study.test.ts`: `profit-2` takes the third distinct feasible rung-3 fit
  and never falls back to an infeasible one). (2) `final.ts`: the validation's full-history detail also computes the
  **within-calendar-year** maximum minute drawdowns from the minute marks (the engine's period drawdowns run from a
  boundary to the end of the run), for PROTOCOL.md §11.5 / §15's "annual reset drawdowns". (3) Formatting (prettier),
  two unused imports; the pilot helper `expect_stop` captures its exit status before logging.
- **Why.** The pilot's tiny rung-3 schedule (2 configurations) cannot exercise `profit-2`, so it is unit-tested; the
  annual drawdowns needed the year's own window.
- **Results that existed.** Engineering only. The pilot (`.cache/vg-l0-session-hold/pilot/`): every stage path passed;
  `pilot-compare straight sigterm wkill unitkill` against `ref` → identical lane results (the straight run used the
  pre-extraction text, the others the extracted function: equivalence shown). The pilot validation was rerun after (2)
  (`validation.v1-before-annual-dd` kept aside in the cache).
- **Effect.** None on any rule, budget, seed, gate, role or instrument.
