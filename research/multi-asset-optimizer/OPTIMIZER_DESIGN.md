# Optimizer design

Daily-OHLCV parameter optimizer for the `allIn` margin strategy: 4,096 scrambled Sobol candidates per training run, then NSGA-II, evaluated in parallel on Node.js `worker_threads`, inside a chronological walk-forward with a locked final holdout. Everything in this document was fixed **before** the full 21-symbol run. The one change made after the VGT pilot is listed under [Changes after the pilot](#changes-after-the-pilot).

## Architecture

```
src/app/allin-original.ts        read-only original (never edited; sha256 42f2b7e7…, git blob 6cdebca1…)
src/app/allIn-optimizable.ts     working copy: typed parameters, pure simulateAllIn(), same CLI outputs
src/app/optimizer.ts             CLI entry (npm run optimizer -- <command>)
src/optimizer/
  data/stooq.ts                  Stooq page → "Download data in csv file..." link → CSV; response classification, retries
  data/transform.ts              header removal, ';' → '|', bulk-archive field mapping, validation
  data/zip.ts                    read-only ZIP reader for Stooq's bulk archive
  data/prepare.ts                acquisition modes, immutable raw copies, atomic writes, loader parity, manifest
  data/audit.ts                  DATA_AUDIT.md: coverage, calendar, structure, adjustment evidence, eligibility
  series.ts                      research views (≤ research end) and the holdout capability
  protocol.ts                    folds, final window, holdout, stress window
  params.ts                      parameter grid, quantization, candidate IDs, neighbourhoods
  sobol.ts, rng.ts               Sobol (Joe–Kuo) with LMS + digital-shift scrambling; seeded sfc32
  evaluate.ts, fitness.ts        window backtests → metrics; objectives and constraints
  nsga2.ts, search.ts            NSGA-II; Sobol/random exploration + GA runs + evaluation cache
  selection.ts                   gates, neighbourhood merit, diversity-aware top-N
  pool.ts, worker.ts             long-lived worker pool (and an in-process evaluator with the same interface)
  experiment.ts                  walk-forward orchestration, checkpoints, trade/equity exports
  report.ts, holdout.ts          reports; freeze, holdout, stress
  goldenMaster.ts, fixtures.ts   original-vs-copy equivalence harness, synthetic edge cases
  benchmark.ts, provenance.ts    speed measurement; git/code/data identifiers
  tests/*.test.ts                node:test suite (npm test)
```

The coordinator owns sampling, NSGA-II, caching, selection and persistence. Workers only run backtests. Each worker receives a symbol's bars once, as typed arrays, and keeps them until the symbol is released. Candidates go out in batches of 48. Results come back in request order whatever the completion order, so the worker count cannot change a result. This is tested at small scale (in-process, 1 and 3 workers) and was checked at full scale on VGT (1 vs 8 workers: byte-identical records, archives and trade logs).

## Strategy interface and the working copy

The working copy reproduces the original exactly at the default parameters: 100/100 golden-master cases are byte-identical in every output file and console line (STRATEGY_BASELINE.md). The rules are unchanged. Two adaptations are structural only:

1. **Parameters.** The seven decision constants come from an `AllInParams` object. Percentages are integer tenths of a percentage point and are converted once at the interface as `tenths / 1000`, which is the same double as the original's literal (`100 / 1000 === 0.1`).
2. **Warmup (`startIndex`).** A window's first traded session can have earlier sessions behind it that serve only as history for the reference high: nothing is traded, marked or logged before `startIndex`. With `startIndex = 0` the behaviour is the original's. It is needed because the original, when given a start date, computes its 90-session high only from sessions on or after that date, which would silently shorten the window at every fold boundary.

Fixed operational assumptions (not tuned): $100,000 borrowed per position, 11% simple annual margin interest per calendar day (365-day year, none on the entry day), entry at the signal close, stop fills at the stop price or at the open on a gap, maximum-hold exits at the open, no commissions or spread, prices as given (Stooq back-adjusted), one position at a time.

## Parameter space and quantization

Genomes are integer grid indices; a value is `min + index × step`. Percentages therefore can only be whole tenths of a percentage point (10.5% is index-representable, 10.59% is not), durations whole days or sessions. Sobol mapping, initial populations, crossover, mutation, repair, candidate IDs, the cache, persistence and reports all work on the same integer vector. The simulator receives exactly that vector (tested), and nothing is rounded for display only.

| Parameter (`AllInParams`) | Original | Min | Max | Step | Grid points | Neighbourhood radius | Rationale |
|---|---|---|---|---|---|---|---|
| `dipTenths`: entry dip below the reference high | 10.0% | 2.0% | 40.0% | 0.1 pp | 381 | ±0.5 pp | From shallow index pullbacks to deep single-stock drawdowns; 0% would buy at every close at the high |
| `trailingStopTenths`: stop below the post-entry high | 8.0% | 2.0% | 40.0% | 0.1 pp | 381 | ±0.5 pp | Tighter than a day's index noise up to wider than a typical single-stock correction |
| `maximumHoldDays`: calendar days before a losing position is sold | 15 | 1 | 120 | 1 day | 120 | ±2 days | 0 behaves like 1 (the entry session is never checked for exits); 120 ≈ two quarters |
| `lookbackSessions`: reference-high window | 90 | 10 | 250 | 1 session | 241 | ±10 sessions | Two weeks to about a year |
| `materialLossTenths`: price loss that restricts re-entry | 0.5% | 0.0% | 10.0% | 0.1 pp | 101 | ±0.3 pp | 0% restricts after any non-positive price return; at 10% few exits restrict |
| `lowerReentryTenths`: extra decline below the loss exit to re-enter | 3.0% | 0.0% | 15.0% | 0.1 pp | 151 | ±0.5 pp | 0% allows re-entry at or below the loss-exit price |
| `retraceTenths`: recovery that resets the restriction | 38.0% | 0.0% | 100.0% | 0.1 pp | 1,001 | ±5.0 pp | 0% resets on the exit session itself (restriction off); 100% waits for a full recovery |

The space holds about 6.4 × 10¹⁶ vectors, so 4,096 unique Sobol candidates are always available. **No combination is invalid**, so no candidate is rejected or repaired for semantic reasons; the only repairs are clamps of out-of-range GA children, which are counted per GA run (`gaRuns[].repairs` in each `run.json`). Some regions are behaviourally degenerate: a 0% retrace or a material-loss threshold no loss reaches switches the restriction off, which makes the re-entry decline inert. Such vectors produce identical trades, and the shortlist treats them as behavioural duplicates (below).

## Exploration: Sobol

- Sobol sequence, Gray-code construction, direction numbers from Joe & Kuo (`new-joe-kuo-6.21201`, dimensions 1–16; seven are used).
- Deterministic scrambling: a random lower-triangular linear matrix scramble (Matoušek) plus a digital shift, seeded from `sha256(seed | symbol | run | "sobol-scramble")`. Both preserve the (t, m, s)-net structure. Tests check the known unscrambled points, the per-dimension stratification of the first 4,096 points, and the (0, m, 2)-net property of the first two dimensions with and without scrambling.
- Each point maps dimension-wise to a grid index `floor(u × gridPoints)`. Duplicate grid vectors are skipped and the stream continues deterministically until 4,096 unique candidates exist. Draw and duplicate counts are recorded (`sampler` in each `run.json`). If the space ever holds fewer vectors than requested, it is exhausted and reported as such.
- Every evaluated vector, its origin and its training metrics, plus the gates it failed, is saved in `results/<experiment>/<SYMBOL>/<run>/evaluations.csv.gz`.

## Refinement: NSGA-II

| Setting | Value |
|---|---|
| Population | 128, seeded from the Sobol results in NSGA-II order (front, then crowding), skipping candidates within 2% of the grid span (L∞) of one already chosen, then topped up in order |
| Independent GA runs per training window | 2 (separate seeds), sharing one evaluation cache |
| Generations | up to 60 |
| Budget | up to 6,000 new (uncached) simulations per GA run |
| Early stop | 15 generations without a relative hypervolume gain above 1e-4 |
| Selection | binary crowded tournament (rank, then crowding distance, then candidate ID) |
| Crossover | SBX, probability 0.9, η = 15, per gene with probability 0.5, on grid indices, rounded and clamped |
| Mutation | polynomial, η = 20, probability 1/7 per gene, on grid indices; a mutation that rounds back to the same index moves one step instead |
| Duplicates | a child equal to an existing population member or earlier child is re-mutated up to 5 times |
| Survivors | (μ + λ) elitism: whole fronts, last front by crowding distance, ties by candidate ID |
| Constraint handling | Deb's constrained domination (feasible beats infeasible; lower total violation beats higher) |

Cache: candidates are keyed by `sha256(space name | canonical integer vector)`, so a discrete vector is simulated once per training window, whichever stage produces it. All randomness comes from seeded sfc32 streams; nothing calls `Math.random()`.

## Objectives and constraints

Minimized: **f1 = −net P&L / $100,000** and **f2 = maximum drawdown / $100,000**.

- *Net P&L*: realized P&L plus the open position marked at the window's last close, net of margin interest accrued through that close. Gross P&L = net + interest.
- *Maximum drawdown*: the largest fall of the daily mark-to-market P&L (unrealized P&L and accrued interest included) below its running peak, starting from $0 on the window's first session. This is a strategy-level figure on a $100,000 margin allocation. It is **not** an account or portfolio drawdown: a 30% figure here says nothing about the drawdown of an account that also holds other assets, posts collateral, or meets margin calls.

Constraints (violation = sum of the normalized shortfalls):

- drawdown ≤ 30% of the allocation;
- trades opened ≥ ⌈1.0 × calendar years in the window⌉ (5 for 2014–2018, 10 for 2014–2023), so "never trade" can't look safe; zero-trade candidates are always infeasible.

Hypervolume, for early stopping and for the control experiment, is computed on feasible points against the reference point (0, 0.30): only profitable, within-limit points count.

## Selection policy

The same deterministic policy produces rank 1 and the ordered top-N, for every symbol, every fold and the final run.

1. **Gates**, on the training window: (G1) drawdown ≤ 30%; (G2) trades ≥ the minimum above; (G3) net P&L > 0; (G4) at least half the calendar years in the window have non-negative P&L.
2. **Pool**: the 64 gated candidates with the highest training net P&L, plus gated members of the first two Pareto fronts on (net P&L, drawdown), up to 64 more by net P&L.
3. **Neighbourhood**: each pool member's 14 one-step neighbours (each parameter moved by its neighbourhood radius to each side; off-grid ones omitted) are simulated on the same window. (G5) the median drawdown over the candidate and its neighbours must be within 30%.
4. **Merit** = the lower quartile (25th percentile) of net P&L over the candidate and its neighbours. An isolated spike scores low; a plateau scores high. Merit order: merit, then own net P&L, own drawdown (ascending), candidate ID. **Rank 1 is the first in merit order.** Merit is a scalar, so a Pareto tie is resolved by these keys.
5. **Shortlist** (N = 10 by default; `--top-n` 5–10): walk the merit order and accept a candidate unless (a) its trade list is identical to an accepted one (behavioural duplicate: same entry and exit sessions and reasons) or (b) it lies within 4 neighbourhood steps of an accepted one (L1 distance in units of each parameter's radius). If that leaves fewer than N, a second pass adds the skipped near neighbours that trade differently, labelled *diversity relaxed*. A candidate failing any gate is never shortlisted, and the list is not padded.
6. **Pool growth** (decided after the VGT pilot, before the full run): if the shortlist is still short of N, the pool grows by 64 more gated candidates by net P&L and steps 3–5 are repeated, up to 1,024.

Each entry keeps its merit rank (position in merit order) and its shortlist rank, so the effect of diversity is visible. A diversity choice can never admit a candidate that fails a risk gate.

## Walk-forward protocol

| Window | Use |
|---|---|
| 2005–2013 (where available) | Stress test after the freeze; informational only |
| 2014–2018 → validate 2019 | fold-2019 |
| 2014–2019 → validate 2020 | fold-2020 |
| 2014–2020 → validate 2021 | fold-2021 |
| 2014–2021 → validate 2022 | fold-2022 |
| 2014–2022 → validate 2023 | fold-2023 |
| 2014–2023 | final development run: the shortlist that is frozen |
| 2024 → last available session | final holdout, frozen rank 1 only, once |

**Boundary policy.** Every window starts flat (no position, no restriction) on its first session. The preceding sessions are visible only as reference-high history, and a fold is eligible only if at least 250 sessions (the largest lookback) precede 2014-01-01. A position still open on a window's last session is marked to that close, net of interest accrued through it; it is never dropped. No state carries from training into validation. Validation simulations receive parameters that were fixed by the training run before the validation window was simulated. Indicator values (the reference high) only ever use sessions before the current one. Tests check that changing every price after a window's end leaves the window's result unchanged, and that dropping history older than the lookback changes nothing.

**Holdout lock, enforced in code.** The optimizer accepts only *research views* of a series: copies physically truncated at 2023-12-31, registered in a private set and checked on entry. Sessions after that date can be read only through a capability that `holdout.ts` takes when it is first loaded (a second request throws). `holdout.ts` uses it only after verifying the freeze: the record's own hash, the hashes of the frozen reports, the final shortlist order in every run record, and the processed-data hashes. The holdout runs each frozen rank 1 once, plus the original parameters as a labelled baseline. A second run needs `--rerun-reason`, which is printed in the report. A freeze cannot be replaced after the holdout has run. The data audit reads only counts, dates and structural validity after 2023, and examines price moves only up to 2023.

**Evidence classes** (WALK_FORWARD_RESULTS.md):

- *Consistent out-of-sample evidence*: all five folds evaluated, at least four with positive out-of-sample P&L, total out-of-sample P&L above the original parameters' total over the same years, and a parameter-stability score ≤ 0.30.
- *Mixed*: positive total but not all of the above.
- *Insufficient or negative*: total ≤ 0.

The stability score is the mean over parameters of (max − min of the five fold rank-1 values) / (parameter range).

## Control: Sobol versus random

On each symbol's final window there are 3 seeds × {4,096 scrambled Sobol, 4,096 uniform pseudo-random} candidates. Each is followed by the identical NSGA-II with early stopping off, so both spend the same generation and evaluation caps, and then the identical selection. The comparison covers exploration-stage hypervolume, final archive hypervolume and rank-1 merit, with mean ± standard deviation across seeds.

## Resources and reproducibility

Measured on an Apple M1 Pro (10 cores), Node 24.21.0, VGT 2014–2023 (2,516 sessions), 4,096 evaluations (`baseline/benchmark.json`):

| Evaluator | Best time | Evaluations / s | Process RSS |
|---|---|---|---|
| in-process | 0.45 s | 9,118 | 383 MB |
| 1 worker | 0.46 s | 8,823 | 441 MB |
| 2 workers | 0.25 s | 16,670 | 557 MB |
| 4 workers | 0.13 s | 31,873 | 683 MB |
| 8 workers | 0.08 s | 53,640 | 875 MB |

The default worker count is `availableParallelism() − 2` (8 here): one core for the coordinator, one for the OS. Override it with `--workers`. Three symbols run concurrently by default (`--ticker-concurrency`), so the pool stays busy between NSGA-II generations. Each worker keeps reference highs for at most 64 lookbacks per symbol, and symbols are released when done. A VGT walk-forward (5 folds, the final run and 6 control runs; about 210,000 simulations) took 17 s with 8 workers, and 13 s with 2 control runs instead of 6.

**Checkpoints.** Each training run writes `run.json` when it completes, keyed by a configuration hash. The hash covers the data hash, window, parameter space, search, fitness and selection settings, seed labels, and a hash of the source files on the evaluation path (`resultFiles` in `provenance.ts`; reports, the audit, the CLI and the holdout module are excluded). A rerun with the same command resumes and skips completed runs. Any code or configuration change recomputes. Elapsed time goes to `timing.json`, so `run.json` is byte-identical across reruns.

**Seeds.** Every stream derives from `sha256(seed | symbol | run | purpose)`. The default seed is `20261015`.

## Reporting

- *In-sample*: a fold's training metrics.
- *Out-of-sample*: the fold's rank-1 on the following year. This is evidence about the procedure, not about any fixed vector.
- *Development*: the final shortlist's 2014–2023 metrics, in-sample for those candidates.
- *Holdout*: frozen rank 1 on 2024–2026.

Reports also give approximate sensitivities that the original does not model and that are not used for ranking: a 5 or 10 bp per-side cost on the $100,000 notional, and margin rates of 8% and 14%. "Annualized performance" is given only as average yearly P&L per $100,000 allocation. A compound annual return isn't meaningful for a fully margin-financed position with no equity base.

## Changes after the pilot

The VGT pilot (full budgets, research data only) showed that a fixed 64-member pool could be filled almost entirely with behavioural clones of the leader: fold-2022 produced only 2 distinct candidates although many existed. Step 6 (pool growth) was added. No gate, objective, bound, radius or threshold changed. The pilot did read VGT's 2014–2023 results, so VGT's policy was finalized with knowledge of its research-period behaviour. No holdout data was involved.
