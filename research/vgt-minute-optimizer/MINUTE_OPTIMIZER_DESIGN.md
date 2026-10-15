# VGT minute optimizer: design

This study optimizes the seven numerical parameters of the one-minute `allIn` strategy (`src/app/allIn.ts`) for VGT. The fitness evaluator replays that strategy's minute-level decisions and fills; it is not a daily approximation. The search uses 4,096 scrambled Sobol candidates and then NSGA-II, inside an expanding chronological walk-forward (2020–2023), with a locked final evaluation on 2024–2025.

**When this was fixed.** Everything below (bounds, objectives, gates, merit, ranking, protocol, seeds, budgets) was written **before the full-budget run**, on 2026-10-15. Only a small pilot had run at that point (256 Sobol candidates, population 32, 5 generations, fold-2020 only, experiment `pilot`). The pilot's fold-2020 validation numbers were therefore seen before the full run. **Nothing in this design was changed after the pilot.**

## Architecture

```
src/app/allIn.ts                   read-only original (sha256 71c5c327…, git blob 0d7af211…); never edited
src/app/allin-original.ts          read-only daily original (sha256 e8473085…); not used, never edited
src/app/allIn-minute-optimizable.ts literal working copy: typed parameters, warmup, separate cost layer, same CLI outputs
src/app/minuteOptimizer.ts         CLI entry (npm run minute-optimizer -- <command>)
src/minute-optimizer/
  data.ts                          load once (verified loader + groupMarketSessions) → immutable typed-array session index
                                   on SharedArrayBuffers; research view (≤ 2023-12-31); unlock capability for the final evaluation
  engine.ts                        fast evaluator: the original's rules over the index; O(1) per session plus a binary search
  reference.ts                     runs the literal copy and compares it field by field with the engine
  goldenMaster.ts, fixtures.ts     original ↔ copy ↔ engine equivalence; synthetic minute files for rare paths
  params.ts                        the minute search space (reuses src/optimizer/params.ts grid utilities)
  evaluate.ts, fitness.ts          metrics per window; objectives and constraints
  search.ts                        minute evaluation cache + the daily optimizer's Sobol/NSGA-II runSearch, reused unchanged
  selection.ts                     gates, neighbourhood + perturbation merit, diversity-aware top-N
  pool.ts, worker.ts               long-lived worker_threads pool (and in-process evaluator), request-order results
  experiment.ts, protocol.ts       walk-forward, final run, replicates, Sobol-vs-random control, checkpoints, replays
  report.ts, finalEvaluation.ts    reports; freeze; the one-time final evaluation
  benchmark.ts, provenance.ts      throughput; code/data/environment identifiers
  tests/*.test.ts                  node:test suite (npm test)
```

Reused unchanged from the daily study (`src/optimizer/`): `sobol.ts` (Joe–Kuo directions, Matoušek LMS + digital-shift scrambling), `rng.ts` (seeded sfc32, labelled seeds), `nsga2.ts` (constrained domination, fast non-dominated sort, crowding, SBX and polynomial mutation on grid indices, hypervolume), `params.ts` (grids, canonical IDs, neighbours, repair), `search.ts` (`explorationGenomes`, `seedPopulation`, `runSearch`), `args.ts`. None of those files was modified, so the daily study's checkpoints and code hash are untouched. The minute cache is passed to `runSearch` through a structural cast; `runSearch` only calls the cache's `evaluate()` and reads its simulation count.

## Engine: what is precomputed and why it is exact

The minute CSV is loaded once per process with `loadCsvMinuteBacktestData` and grouped with `groupMarketSessions`, exactly as `allIn.ts` does (New York sessions, DST, early closes, regular-session minutes plus the closing print). From those sessions, `data.ts` builds an index of every value that doesn't depend on parameters:

| Precomputed | Definition (as in `allIn.ts`) | Why it can't look ahead |
|---|---|---|
| Decision price | close of the last minute with `time + 60 ≤ close − 60` (the 15:58 minute, 12:58 on early closes) | only minutes completed before the decision |
| Entry fill | open of the first minute starting at or after the decision, else the closing print, else none | read only when an entry is decided |
| Post-entry high on the entry day | max(fill, session close, highs of the fill's minute onwards) | used only for the next session's stop, as in the original |
| Maximum-hold fill | first trade at or after one minute after the session's first minute | read only when the hold is due at the open |
| Stop trigger key | running minimum of min(open, low) within the session | binary search returns the **first** minute reaching the stop |
| Next-open fill | first trade at or after one minute after each minute | `next-open` stop fills only |
| Mark statistics | prefix min, max and largest fall of the marks (each minute's close, then the official close), and the same from the entry fill's minute onwards | used only for drawdown accounting |

Per session the engine then does the original's work in O(1): the reference high (sliding-window maximum of session highs over the previous *lookback* sessions, never the current one), the signal and re-entry tests, the entry, the profit-conditional stop activation, the gap and maximum-hold tests, the first-trigger search (O(log 390)), the once-a-day stop update from the session high, and the restriction's end-of-session update.

**Minute-sampled drawdown in closed form.** While a position is held, each minute mark is `realized + shares × price − investment − interest`, an increasing function of the price. Over a span of marks, the largest fall is `max(peak before the span − lowest mark, shares × largest price fall within the span)`, and the new peak is the highest mark. Flat spans are constant. This is mathematically equal to the original's minute loop. In practice it matched the literal copy exactly (difference 0) in all 415 engine cases.

**Verification.** The engine is accepted only because it matched the literal copy, and through it the original, on every case (`baseline/golden-master.json`; MINUTE_STRATEGY_BASELINE.md). Every shortlisted candidate is also replayed through the literal copy after the search, and the run fails if any field differs.

### Measured performance

Apple M1 Pro (10 cores, 16 GB), Node 24.21.0, 2016-10-07 → 2023-12-31 (1,819 traded sessions after 193 history sessions; 797,115 regular-session minutes in the whole file), 4,096 Sobol candidates (`baseline/benchmark.json`):

| Evaluator | Evaluations/s | Process RSS |
|---|---|---|
| literal working copy (`allIn-minute-optimizable.ts`) | 20 | — |
| fast engine, in-process | 6,517 | 528 MB |
| 1 worker | 6,115 | 609 MB |
| 2 workers | 11,407 | 728 MB |
| 4 workers | 20,335 | 907 MB |
| 8 workers | 31,039 | 1,140 MB |

That is about 320× the literal copy, with identical metrics across all evaluators. The shared dataset index is about 48 MB. Each worker adds only its reference-high cache, at most 96 lookback arrays of 2,012 doubles.

**Full-run estimate.** One training run is about 4,096 Sobol + up to 12,000 GA + up to about 30 × 1,024 neighbourhood probes, so at most about 47,000 distinct simulations. Shallow, high-turnover candidates cost up to about 1 ms each in-process. The study has 4 folds, the final run, 2 replicates and 6 control runs, so at most about 600,000 simulations, roughly 10 CPU-minutes, or a few minutes of wall time with 8 workers. **No budget reduction is needed.** The full research budget runs as specified.

## Parameter space and quantization

Genomes are integer grid indices; a value is `min + index × step`. Percentages are integer tenths of a percentage point (2.5% is representable, 2.54% is not), converted once as `tenths / 1000`, which gives the same double as the original's literal (25/1000 === 0.025). Durations are whole calendar days or trading sessions. Sampling, crossover, mutation, repair, IDs, the cache, persistence and reports all use the same integer vector.

| Gene (`MinuteParams`) | Incumbent | Min | Max | Step | Grid points | Neighbourhood radius | Units |
|---|---|---|---|---|---|---|---|
| `dipTenths`: decision price below the reference high | 2.5% | 0.5% | 25.0% | 0.1 pp | 246 | ±0.5 pp | percent |
| `trailingStopTenths`: stop below the post-entry high | 2.1% | 0.5% | 20.0% | 0.1 pp | 196 | ±0.5 pp | percent |
| `maximumHoldDays`: losing position sold after the opening trade | 8 | 1 | 60 | 1 | 60 | ±2 | **calendar days** |
| `lookbackSessions`: reference-high window | 78 | 10 | 250 | 1 | 241 | ±10 | **trading sessions** |
| `materialLossTenths`: ETF price loss that restricts re-entry | 2.2% | 0.0% | 10.0% | 0.1 pp | 101 | ±0.3 pp | percent (interest excluded) |
| `lowerReentryTenths`: extra decline below the loss exit | 4.0% | 0.0% | 15.0% | 0.1 pp | 151 | ±0.5 pp | percent |
| `retraceTenths`: recovery of the high-to-low decline that resets | 36.7% | 0.0% | 100.0% | 0.1 pp | 1,001 | ±5.0 pp | percent |

These are the brief's bounds, unchanged. The space holds about 1.06 × 10¹⁶ vectors. No combination is invalid, so nothing is rejected for semantic reasons; the only repairs are clamps of out-of-range GA children (counted in `gaRuns[].repairs`).

**Behaviourally degenerate regions** are handled as follows:

- A 0% retrace resets on the exit session itself (the restriction is off), and then the lower re-entry is inert.
- A material-loss threshold that no losing exit reaches also makes both re-entry genes inert.
- A maximum hold longer than any losing stretch is inert.
- A trailing stop wider than the moves after entry rarely activates (it is profit-conditional).

Such vectors produce identical trades. The shortlist treats them as one phenotype (identical trade signature = behavioural duplicate), and the reports show each finalist's share of neighbours and perturbations that trade identically.

## Objectives, constraints, costs

- **Fixed comparability assumptions (not genes):** $100,000 borrowed per entry, 11% simple annual margin interest per calendar day (365-day year, none on the entry day), one position at a time, default stop fill `stop`, raw Alpaca prices, no dividends.
- **Extra execution costs** are a separate accounting layer and never change a decision. Per side, `bps × notional` is charged at each fill: `bps × $100,000` at entry and `bps × shares × exit price` at exit. An open position is marked net of the cost of selling it (liquidation value) at every minute and daily mark, so drawdowns include costs consistently. Levels computed for every evaluation: 0, 5, 10 and 20 bp per side. The zero level reproduces the original exactly.
- **Selection cost: 5 bp per side.** Fitness and ranking use the 5 bp figures. VGT's quoted spread is typically a few basis points, and stop fills slip, so 5 bp/side is a conservative but plausible friction. The zero-cost figures are always reported beside them.
- **Objectives (NSGA-II, both minimized):** f1 = −net P&L / $100,000 and f2 = **minute-sampled** maximum drawdown / $100,000, both at 5 bp/side. Net P&L includes realized P&L, the open position marked at the window's last close, accrued interest, and the costs. The full minute drawdown is used during the search itself, not a daily screening proxy, because it is cheap in closed form. Daily-sampled drawdown is reported as well.
- **Constraints (Deb's constrained domination):**
  - minute drawdown ≤ $30,000 (30% of the allocation; a strategy-level figure, not an account or portfolio drawdown);
  - entries ≥ ⌈2 × years in the window⌉.

## Selection policy (rank 1 and top-N)

One deterministic procedure produces every fold's rank 1 and the final top-N. All money figures below are at 5 bp/side.

1. **Gates**, all required, on the training window:
   - G1 minute drawdown ≤ $30,000;
   - G2 entries ≥ ⌈2 × years⌉;
   - G3 net P&L > 0;
   - G4 at least half the calendar years have non-negative P&L;
   - G5 net P&L at **20 bp/side** > 0;
   - G6 exposure ≥ 5% of sessions;
   - G7 net P&L without the single best trade > 0.
2. **Pool:** the 64 gated candidates with the highest net P&L, plus gated members of the first two Pareto fronts (up to 64 more). If the shortlist comes out short, the pool grows by 64 at a time, up to 1,024.
3. **Neighbourhood**, evaluated on the same window for each pool member:
   - its 14 one-step neighbours (each gene moved by its radius to each side);
   - 16 joint perturbations: every gene moved at once by a uniform integer offset within its radius, seeded by the candidate ID.

   G8: the median minute drawdown over the candidate and its one-step neighbours must be ≤ $30,000.
4. **Merit** = the 25th percentile of net P&L over the candidate, its neighbours and its perturbations (31 points). An isolated spike scores low; a broad plateau scores high.
5. **Merit order:** merit, then own net P&L, own minute drawdown (ascending), candidate ID. **Rank 1 = first in merit order.**
6. **Shortlist (N = 10, configurable 5–10):** walk the merit order and skip:
   - behavioural duplicates (identical trade list = same phenotype), whose count is reported;
   - candidates within 4 neighbourhood steps (L1, in radii) of an accepted one.

   A relaxed second pass adds skipped near neighbours that trade differently, labelled. The list is never padded with gate failures.

Seeds: every random stream derives from `sha256(seed | "VGT" | run | purpose)`; master seed **20261016**. Nothing calls `Math.random()`. Ties are always broken by candidate ID. Results are independent of worker count (tested in-process, 1 and 3 workers; training records identical in-process and with 2 workers).

## Search budget (unchanged from the brief and the daily study)

| Setting | Value |
|---|---|
| Sobol candidates per training run | 4,096 distinct grid vectors (duplicates skipped and counted) |
| NSGA-II population | 128, seeded from Sobol results in NSGA-II order with a 2% (L∞) diversity filter |
| Independent GA runs | 2 seeds per training run, one shared cache |
| Generations / budget | up to 60, up to 6,000 new simulations per GA run |
| Early stop | 15 generations without a relative hypervolume gain above 1e-4 (reference point f1 = 0, f2 = 0.30) |
| Variation | SBX p = 0.9, η = 15; polynomial mutation η = 20, p = 1/7 per gene; duplicate children re-mutated |
| Replicates (diagnostic) | the final run repeated with 2 independent master seeds |
| Control | final window, 3 seeds × {Sobol, uniform random}, identical GA with early stopping off, identical selection |

Cached duplicates are never counted as new simulations.

## Protocol

| Window | Use |
|---|---|
| 2016-01-04 → 2016-10-06 (193 sessions) | reference-high history only, never traded |
| train 2016-10-07 → 2019-12-31, validate 2020 | fold-2020 |
| train 2016-10-07 → 2020-12-31, validate 2021 | fold-2021 |
| train 2016-10-07 → 2021-12-31, validate 2022 | fold-2022 |
| train 2016-10-07 → 2022-12-31, validate 2023 | fold-2023 |
| train 2016-10-07 → 2023-12-31 | final development run: shortlist and rank 1 that are frozen |
| 2024-01-02 → 2025-10-13 | locked final evaluation, frozen rank 1 vs incumbent, once |

**Boundary policy (independent flat-start tests).** Every training and validation window:

- starts flat, with no position and no restriction, on its first session;
- treats all earlier sessions in the file as reference-high history only;
- trades from its first session, which already has a reference high (the original skips only a session with no history at all).

A position open on a window's last session is marked to that close, net of interest through that session, and counts in P&L and drawdown. No state carries from training into validation. Validation receives parameters fixed by the training run.

The one limitation: lookbacks above 193 sessions see a truncated window for at most their first 57 training sessions (October–December 2016), because the file starts on 2016-01-04. This never affects a validation or the final evaluation.

**Continuous-run diagnostics.** These are additional and labelled as such: a fixed vector run continuously from 2016-10-07, with per-year P&L as the change in daily mark-to-market equity between year ends. That is never a sum of trades that happen to exit inside a year.

**Locks.** The search, the selection and the walk-forward receive only a *research view*: a dataset physically truncated at 2023-12-31, registered and checked on use. A full-range dataset can be built only through a capability that `finalEvaluation.ts` takes once. Before using it, it verifies the freeze record: its own hash, the frozen shortlist, rank 1, code hash and data hash.

The golden master is the one exception. It runs the **incumbent** over the full range, as the brief requires, and those results were known beforehand. Arbitrary vectors in the golden master run only on sessions up to 2023-12-31.

## Evidence rules (declared before the run)

The walk-forward *selection policy* (re-fit each year, trade the fold's rank 1 in the following year) **beats the incumbent** only if, at 5 bp/side, all three hold:

1. its total 2020–2023 validation P&L exceeds the incumbent's;
2. it is at least as good as the incumbent in 3 or more of the 4 folds;
3. its total advantage stays positive when the fold with the largest advantage is removed.

If any of these fails, the result is **not demonstrated**; if the policy's total is ≤ 0, it is **negative**.

**Biased comparison, stated up front.** The incumbent (2.5%/2.1%/8/78/2.2%/4.0%/36.7%) is the daily optimizer's VGT rank 1, fitted on 2014–2023 daily data. It is therefore in-sample for every validation year here, and the comparison is tilted in its favour. The deep-dip control (10%/8%/15 days/90 sessions/1.0%/2.0%/38.0%) was also hand-tuned on VGT over a period overlapping these years. Only 2024–2025 is out of sample for the incumbent, and even those dates have been inspected before.

## Reporting labels

- **Training (in-sample):** a fold's or the final run's training-window metrics.
- **Walk-forward validation (out-of-sample for the procedure):** the fold's rank 1 on the following year. This is evidence about the selection procedure, not about any fixed vector.
- **Development (in-sample for the finalists):** the final shortlist's 2016-10-07 → 2023-12-31 metrics.
- **Final evaluation (workflow-held-out, historically previously inspected):** frozen rank 1 vs incumbent on 2024-01-02 → 2025-10-13, once, after the freeze.

Execution sensitivities, never used for ranking:

- the `next-open` stop fill for all finalists, fold rank 1s and the final evaluation;
- costs of 0, 10 and 20 bp/side alongside the 5 bp selection level;
- transaction-cost break-even against the incumbent: (net₀(candidate) − net₀(incumbent)) / (turnover(candidate) − turnover(incumbent)), in bp per side.
