# VGT minute optimizer

A parameter optimization of the **one-minute** `allIn` strategy (`src/app/allIn.ts`) for VGT. The fitness evaluator replays that strategy's own decisions and fills on `data/VGT/VGT-2016-2025-1-minute.csv`:

- the entry decision one minute before the close, filled at the next trade;
- once-a-day, profit-conditional trailing stops, triggered and filled minute by minute;
- maximum-hold exits after the opening trade;
- the re-entry restriction;
- minute-sampled drawdowns.

It is not a daily approximation. The search uses 4,096 scrambled Sobol candidates followed by NSGA-II (two GA seeds), with the full budget, inside an expanding walk-forward (validation 2020–2023). A ranked top 10 and a frozen rank 1 come from 2016-10-07 → 2023-12-31. The rank 1 was then evaluated once on 2024-01-02 → 2025-10-13.

## Executive summary

**Does a minute-optimized VGT parameter set beat the incumbent 2.5% / 2.1% / 8 d / 78 s / 2.2% / 4.0% / 36.7%? No. Neither test shows it, and both point the other way.**

- **Walk-forward 2020–2023** (re-fit on all data before each year, trade the fold's rank 1 for that year, 5 bp/side): the policy made **−$4,056** in total, against **$72,671** for the incumbent. It was ahead in 1 of 4 folds (2023, by $207). In 2022 it lost $27,197 while the incumbent made $13,796. Under the pre-declared rule the verdict is **negative**. At 0 bp it is "not demonstrated": +$1,059 against $81,525. In 3 of the 4 folds, none of the ten shortlisted candidates beat the incumbent out of sample.
- **Final evaluation 2024–2025** (frozen rank 1, run once after the freeze, 5 bp/side): rank 1 made **$10,268**, against **$47,053** for the incumbent. Its minute-sampled drawdown was **$33,102** (above the $30,000 limit), against $25,914. Rank 1 is behind at every cost level and under both stop fills.
- **Why it doesn't transfer.**
  - In-sample, the optimizer finds parameter sets about $15k–$39k better than the incumbent over 2016–2023 at 5 bp ($154k–$178k vs $139k), but the advantage doesn't carry forward.
  - The selected parameters are unstable. The fold rank 1s range over 0.6%–3.8% dips, 2.1%–6.3% stops, 9–37-day holds and 144–210-session lookbacks (stability score 0.39). Two independent seeds of the final run picked lookbacks of 204 and 136 sessions, where the main run picked 10.
  - The frozen rank 1 sits at the lookback lower bound (10 sessions), and only 43% of its neighbourhood is feasible.
  - Every shortlisted set is a shallow-dip, tight-stop variant. Seven of the ten sit in the incumbent's own region (dip 2.3%–2.6%, stop 2.1%–2.2%, 8-day hold) and differ mainly in the lookback and re-entry genes.
- **Caveats, which cut both ways.**
  - The incumbent is the earlier daily optimizer's VGT rank 1, fitted on 2014–2023. It is in-sample for every walk-forward year here, so that comparison favours it.
  - The 2024–2025 dates were held out of this workflow, but they are **not pristine**: they had been inspected in earlier daily and minute backtests.
  - Each result is a single historical path. Earlier minute research found single-path totals knife-edge on individual stop fills.
  - Cash dividends are not modeled (raw prices), for any strategy.
- **What this supports.** There is no evidence that changing the incumbent's numbers based on this optimization would improve forward results. As a labelled diagnostic, not a recommendation: the old deep-dip family (10% / 8% / 15 d / 90 s / 1.0% / 2.0% / 38.0%) earned $94,393 over the 2020–2023 validation years and $48,779 in 2024–2025 at 5 bp, with far fewer trades. It too was hand-tuned on VGT with hindsight. The only genuinely new evidence would come from sessions after 2025-10-13.

## Status

Everything in the brief was executed, at the full budget:

- protected files verified unchanged before and after;
- golden master: 116/116 byte-identical file cases and 415/415 engine cases;
- tests: 30/30 for this study;
- benchmark and pilot;
- 4 walk-forward folds, the final development run, 2 seed replicates and the 6-run Sobol-vs-random control;
- reports, then the freeze (2026-10-15T14:10:25Z, freeze hash `96c0339ad74ed4eb…`), then the final evaluation, run once (attempt 1);
- an independent recomputation of the whole experiment with 4 workers instead of 8, byte-identical in all 163 result files (`baseline/reproducibility.json`).

Nothing is pending except genuinely future data. Nothing is committed.

## Reports

| File | Contents |
|---|---|
| [MINUTE_STRATEGY_BASELINE.md](MINUTE_STRATEGY_BASELINE.md) | Parameter inventory and exact minute semantics, file hashes, discrepancies with the brief, golden-master equivalence |
| [MINUTE_OPTIMIZER_DESIGN.md](MINUTE_OPTIMIZER_DESIGN.md) | Architecture, engine acceleration, search space, objectives, costs, gates, ranking, protocol, measured performance (fixed before the full run) |
| [MINUTE_WALK_FORWARD_RESULTS.md](MINUTE_WALK_FORWARD_RESULTS.md) | Per-fold selections and validation results vs the incumbent, aggregate verdict, stability ([walk_forward.json](walk_forward.json)) |
| [MINUTE_TOP_CANDIDATES.md](MINUTE_TOP_CANDIDATES.md) | Ranked top 10 (pre-holdout) with costs, both drawdowns, years, neighbourhoods, stop-fill sensitivity, break-even, seed and sampler diagnostics ([JSON](minute_top_candidates.json), [CSV](minute_top_candidates.csv), [Pareto archive](minute_pareto_archive.csv)) |
| [MINUTE_FINAL_EVALUATION.md](MINUTE_FINAL_EVALUATION.md) | Frozen rank 1 vs incumbent on 2024–2025 (written only by `final-evaluation`) |

Machine-readable evidence:

- **`baseline/`**:
  - `golden-master.json`, `benchmark.json` and `reproducibility.json`;
  - `protected-hashes-{before,after}.txt`;
  - `allIn-full-range-original/`: the unmodified original's full-range outputs.
- **`results/main/`**:
  - `experiment.json` (configuration, code hash, dataset) and `run-manifest.json` (environment, timings, data hash);
  - per run, `run.json`: search summary, gate counts, the top 50 by merit, the shortlist with full metrics, and the controls on the training window;
  - per run, `evaluations.csv.gz`: every evaluated vector, with origin, all cost levels and both drawdowns;
  - per fold, `validation.json` and `validation-trades-*.csv`;
  - `final-2016-2023/replays/`: literal-copy trades.csv, daily.csv (daily marked equity and exposure), states.csv, episodes.csv and summary.json for each finalist and control, under both stop fills;
  - `final-2016-2023/control-diagnostics.json`;
  - `freeze/`: the record, the frozen reports and a source snapshot;
  - `final-evaluation/`: the result JSON, `attempts.json`, and per-strategy trade and equity files.
- **`results/repro/`**: the independent recomputation.
- **`results/pilot/`**: the pilot.
- **`logs/`**: console logs of the golden master and the runs.

## Commands

Node 24.21.0 (`.node-version`). `npm run minute-optimizer -- …` is `npm run app -- minuteOptimizer …` without the lint and type-check step.

```sh
# Protected files and equivalence
npm run minute-optimizer -- verify-protected
npm run minute-optimizer -- golden-master             # ~3 min; writes baseline/golden-master.json
npm test                                              # includes src/minute-optimizer/tests (30 tests)

# Original strategy, unmodified, for reference
npm run app allIn VGT 2016-10-07 2025-10-13 data/VGT/VGT-2016-2025-1-minute.csv <out dir> [stop|next-open]

# Benchmark and pilot
npm run minute-optimizer -- benchmark                 # in-process and 1/2/4/8 workers
npm run minute-optimizer -- run --pilot               # 256 Sobol, small GA, fold-2020 only (experiment "pilot")

# Full study: 4 folds + final run + 2 replicates + Sobol/random control (~35 s with 8 workers); resumes
npm run minute-optimizer -- run                       # experiment "main", seed 20261016, top-N 10
npm run minute-optimizer -- run --experiment repro --workers 4   # independent recomputation
npm run minute-optimizer -- diagnose                  # incumbent and deep-dip scored by the selection policy
npm run minute-optimizer -- report                    # reports and candidate files (refused once frozen)

# Lock, then the one-time final evaluation (refuses a second run without --rerun-reason)
npm run minute-optimizer -- freeze
npm run minute-optimizer -- final-evaluation
```

Other `run` options: `--workers N`, `--local`, `--seed N`, `--top-n 5..10`, `--samples`, `--population`, `--generations`, `--ga-runs`, `--max-evals`, `--folds fold-2020,...`, `--no-final`, `--control-seeds N`, `--replicates N`.

## Files added or changed

- **New code:**
  - `src/app/allIn-minute-optimizable.ts`: the parameterized literal copy of `allIn.ts`;
  - `src/app/minuteOptimizer.ts`: CLI entry;
  - `src/minute-optimizer/**`: data index, engine, search, selection, workers, experiment, reports, freeze, final evaluation, golden master, tests.
- **New research outputs:** `research/vgt-minute-optimizer/**`.
- **`package.json`:** added the `minute-optimizer` script; no new dependencies.
- **`eslint.config.js`:** ignores `research/**/freeze/source/**`, the frozen source snapshot.
- **Not modified:** `src/app/allIn.ts`, `src/app/allin-original.ts`, `src/lib`, `src/types`, everything in `src/optimizer/` (reused read-only: Sobol, RNG, NSGA-II, grid utilities, `runSearch`), the daily study's `research/multi-asset-optimizer/`, and `data/`.
- **`src/app/allin-original.ts`:** during the study it held an uncommitted edit, which made the daily study's own golden-master tests fail (5 tests, pre-existing). It was later reverted to its committed version; the whole `npm test` suite now passes.
