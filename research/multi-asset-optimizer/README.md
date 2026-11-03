# Multi-asset optimizer for the daily `allIn` strategy

This optimizer searches the numerical parameters of the unchanged daily `allIn` rules (`src/app/allin-original.ts`) separately for each of 21 stocks and ETFs. It uses 4,096 scrambled Sobol candidates and then NSGA-II, in parallel worker threads, inside a 2014–2023 walk-forward. Each symbol gets a frozen top-N shortlist and one frozen rank-1 configuration, which is then tested once on 2024–2026.

## Results (experiment `main`, measured)

**Verdict: no symbol shows credible evidence that per-symbol re-optimized parameters beat the original parameters.** The optimizer reliably finds parameter sets with much better 2014–2023 *in-sample* results, but that advantage does not survive out of sample.

- **Walk-forward 2019–2023** (procedure re-fitted on data before each year, then tested on that year): $415,155 in total across the 21 symbols, against $1,586,357 for the unchanged original parameters over the same years. The policy beat the original on 2 of 21 symbols (GOOGL, AMZN) and was positive on 14. **None** met the pre-declared "consistent evidence" bar. The chosen parameters jumped around from year to year (stability scores 0.30–0.56).
- **Final holdout 2024-01-02 → 2026-09-08** (frozen rank 1, run once): profitable on 16 of 21 symbols, but better than the original parameters on only 5 (QQQ, VOO, SOXX, VUG, AMZN). In total, $374,844 against $1,015,848.
- **Why.** Many rank-1 configurations buy shallow 2–4% dips with 2–3% trailing stops and trade 100–225 times over 2014–2023. That works in-sample, under fills idealized at the signal close and exactly at the stop, and it fails to carry forward. Eight rank-1 vectors sit at a chosen search bound (mostly the 2% stop floor).
- **Caveats on the comparison.** The original parameters were themselves tuned by hand on VGT over roughly 2016–2025, so they are not a clean out-of-sample baseline either. That flatters them most on VGT and its correlated cluster. However, they also won on most of the stocks they were not tuned on. 14 of the 21 symbols form one correlation cluster (ρ ≥ 0.85), so the symbols are far from 21 independent tests. You had also seen 2024–2026 before this workflow, so the holdout is not pristine.
- **Sobol versus random seeding** made no material difference: Sobol had the higher mean on about half the symbols for each measure, and the gaps were mostly within seed noise.
- **Use of the shortlists.** They are in [TOP_CANDIDATES.md](TOP_CANDIDATES.md) as requested, rank 1 marked primary. Read them as descriptions of what fitted 2014–2023 best, not as recommendations to trade.

| Symbol | Data (2014–2023 / holdout) | Distinct feasible | Frozen rank 1 | Walk-forward OOS 2019–23: policy vs original | OOS class | Holdout: rank 1 vs original | Caveats |
|---|---|---|---|---|---|---|---|
| VGT | ok, full / to 2026-09-08 | 122 | dip 2.5%, stop 2.1%, hold 8, lookback 78, loss 2.2%, re-entry 4.0%, reset 36.7% | $32,538 vs $125,008 | mixed | $54,397 vs $74,419 | near bound: stop 2.1% (bound 2.0%); 187 dev trades (fill-sensitive) |
| XLK | ok, full / to 2026-09-08 | 114 | dip 10.1%, stop 7.4%, hold 10, lookback 161, loss 0.1%, re-entry 0.1%, reset 53.6% | $6,318 vs $99,071 | mixed | $2,774 vs $70,555 | - |
| QQQ | ok, full / to 2026-09-08 | 95 | dip 7.3%, stop 6.9%, hold 14, lookback 35, loss 0.7%, re-entry 12.5%, reset 54.5% | $41,119 vs $92,025 | mixed | $52,536 vs $51,341 | - |
| IGV | ok, full / to 2026-09-08 | 123 | dip 7.8%, stop 4.5%, hold 13, lookback 200, loss 4.2%, re-entry 5.1%, reset 90.0% | -$12,904 vs $56,230 | insufficient or negative | $16,580 vs $69,403 | - |
| VOOG | ok, full / to 2026-09-08 | 112 | dip 19.6%, stop 7.4%, hold 9, lookback 101, loss 0.9%, re-entry 4.7%, reset 71.2% | $36,795 vs $53,874 | mixed | $2,274 vs $32,634 | - |
| VOO | ok, full / to 2026-09-08 | 96 | dip 8.6%, stop 6.3%, hold 10, lookback 202, loss 0.4%, re-entry 7.3%, reset 36.4% | $10,282 vs $43,104 | mixed | $21,180 vs -$4,492 | - |
| SPY | ok, full / to 2026-09-08 | 109 | dip 2.9%, stop 3.6%, hold 10, lookback 228, loss 2.1%, re-entry 6.5%, reset 97.3% | $4,327 vs $42,473 | mixed | -$9,237 vs -$3,969 | - |
| SMH | ok, full / to 2026-09-08 | 114 | dip 2.3%, stop 2.1%, hold 14, lookback 178, loss 9.0%, re-entry 12.6%, reset 49.8% | $86,669 vs $89,293 | mixed | $65,903 vs $121,633 | near bound: dip 2.3% (bound 2.0%); near bound: stop 2.1% (bound 2.0%); 225 dev trades (fill-sensitive) |
| SOXX | ok, full / to 2026-09-08 | 120 | dip 3.5%, stop 3.1%, hold 14, lookback 160, loss 2.6%, re-entry 8.4%, reset 78.5% | $27,452 vs $99,595 | mixed | $30,696 vs $27,127 | 125 dev trades (fill-sensitive) |
| VUG | ok, full / to 2026-09-08 | 102 | dip 4.1%, stop 5.7%, hold 14, lookback 101, loss 0.8%, re-entry 3.8%, reset 33.7% | -$40,471 vs $68,586 | insufficient or negative | $32,389 vs $28,478 | - |
| SCHG | ok, full / to 2026-09-08 | 101 | dip 4.7%, stop 3.5%, hold 11, lookback 98, loss 1.1%, re-entry 1.8%, reset 61.1% | -$24,617 vs $65,389 | insufficient or negative | $13,123 vs $13,318 | - |
| IWF | ok, full / to 2026-09-08 | 111 | dip 4.9%, stop 3.1%, hold 10, lookback 152, loss 2.9%, re-entry 3.6%, reset 74.2% | -$24,526 vs $88,391 | insufficient or negative | $18,546 vs $31,821 | - |
| XLY | ok, full / to 2026-09-08 | 113 | dip 5.7%, stop 2.1%, hold 4, lookback 209, loss 1.6%, re-entry 2.3%, reset 50.1% | $17,088 vs $48,563 | mixed | -$23,335 vs $29,551 | near bound: stop 2.1% (bound 2.0%); 141 dev trades (fill-sensitive) |
| IWN | ok, full / to 2026-09-08 | 704 | dip 22.5%, stop 2.8%, hold 26, lookback 239, loss 0.2%, re-entry 0.1%, reset 59.9% | -$17,873 vs $15,875 | insufficient or negative | $614 vs $8,819 | - |
| NVDA | ok, full / to 2026-09-08 | 121 | dip 3.8%, stop 2.1%, hold 11, lookback 80, loss 2.7%, re-entry 12.8%, reset 74.5% | $29,892 vs $95,311 | mixed | $73,133 vs $148,217 | near bound: stop 2.1% (bound 2.0%); 210 dev trades (fill-sensitive) |
| AAPL | ok, full / to 2026-09-08 | 86 | dip 25.7%, stop 11.9%, hold 1, lookback 247, loss 1.6%, re-entry 0.9%, reset 30.2% | $95,725 vs $156,329 | mixed | -$8,626 vs $21,908 | near bound: lookback (sessions) 247 (bound 250) |
| MSFT | ok, full / to 2026-09-08 | 112 | dip 2.3%, stop 3.2%, hold 22, lookback 89, loss 5.7%, re-entry 3.1%, reset 48.0% | $56,891 vs $64,568 | mixed | -$21,250 vs $31,863 | near bound: dip 2.3% (bound 2.0%); 139 dev trades (fill-sensitive) |
| AMD | ok, full / to 2026-09-08 | 214 | dip 39.8%, stop 2.8%, hold 72, lookback 110, loss 1.8%, re-entry 9.4%, reset 37.8% | -$22,929 vs $200,551 | insufficient or negative | -$10,651 vs $128,295 | near bound: dip 39.8% (bound 40.0%) |
| META | ok, full / to 2026-09-08 | 112 | dip 17.1%, stop 2.3%, hold 8, lookback 219, loss 3.4%, re-entry 13.6%, reset 17.4% | -$17,120 vs $38,260 | insufficient or negative | $3,590 vs $27,186 | near bound: stop 2.3% (bound 2.0%) |
| GOOGL | ok, full / to 2026-09-08 | 103 | dip 8.8%, stop 2.5%, hold 8, lookback 199, loss 6.2%, re-entry 2.0%, reset 62.1% | $67,618 vs -$2,564 | mixed | $40,009 vs $113,558 | 150 dev trades (fill-sensitive) |
| AMZN | ok, full / to 2026-09-08 | 94 | dip 25.1%, stop 8.8%, hold 10, lookback 96, loss 6.0%, re-entry 7.9%, reset 79.4% | $62,881 vs $46,425 | mixed | $20,198 vs -$5,818 | - |

"OOS class" follows the definitions in [WALK_FORWARD_RESULTS.md](WALK_FORWARD_RESULTS.md). Holdout figures are per $100,000 allocation; see [FINAL_HOLDOUT_RESULTS.md](FINAL_HOLDOUT_RESULTS.md) for drawdowns, trades and caveats. The stress test (2005–2013, informational) is in [STRESS_TEST_RESULTS.md](STRESS_TEST_RESULTS.md).

**Status.** Everything is complete and measured: the data, the golden master (100/100 cases before the unlock, plus 22/22 full-range cases after it), the test suite (72/72), all 21 walk-forwards with full budgets, the freeze (2026-10-15T10:02Z, `results/main/freeze/`, with a source snapshot), the one-time holdout, and the stress test. A second, independent full run reproduced every result byte for byte ([baseline/reproducibility.json](baseline/reproducibility.json)). Nothing is committed.

## Reports

| File | Contents |
|---|---|
| [STRATEGY_BASELINE.md](STRATEGY_BASELINE.md) | What the original rules do, the parameter inventory, discrepancies with the brief, golden-master equivalence |
| [OPTIMIZER_DESIGN.md](OPTIMIZER_DESIGN.md) | Architecture, bounds and quantization, Sobol and NSGA-II, objectives, selection policy, protocol, holdout lock, resources |
| [DATA_AUDIT.md](DATA_AUDIT.md) | Stooq acquisition outcome for all 21 symbols, coverage, parity, adjustments, eligibility ([manifest](data/stooq-manifest.json)) |
| [WALK_FORWARD_RESULTS.md](WALK_FORWARD_RESULTS.md) | Out-of-sample results of the selection procedure 2019–2023, stability, Sobol vs random |
| [TOP_CANDIDATES.md](TOP_CANDIDATES.md) | Per-symbol top-N leaderboards ([JSON](top_candidates.json), [CSV](top_candidates.csv), [non-dominated archive](nondominated_archive.csv)) |
| [FINAL_HOLDOUT_RESULTS.md](FINAL_HOLDOUT_RESULTS.md) | Frozen rank 1 on 2024 to the last available session (written only by the `holdout` command) |
| [STRESS_TEST_RESULTS.md](STRESS_TEST_RESULTS.md) | Frozen rank 1 and the original on 2005–2013, informational |

Machine-readable results are in `results/<experiment>/`:

- `experiment.json` (configuration) and `run-manifest.json` (git revision, code hash, data hashes, runtime, environment);
- per symbol and run, `run.json` (search summary, selection, shortlist, validation), `evaluations.csv.gz` (every evaluated vector) and trade and equity CSVs;
- `freeze/` and `holdout/`.

## Commands

All commands go through the repository's existing runner. `npm run optimizer -- …` is `npm run app -- optimizer …` without the lint and type-check step. Node 24 (`.node-version`).

```sh
# Data: acquire from Stooq (page → CSV link; falls back to browser downloads in data/stooq/inbox, then the
# local Stooq bulk archive), keep raw copies, convert, re-read with the optimizer's loader, write DATA_AUDIT.md
npm run optimizer -- prepare-data                          # all 21 required symbols, missing only
npm run optimizer -- prepare-data --symbols VGT,QQQ --refresh
npm run optimizer -- prepare-data --offline                 # no network: cache, inbox, archive
npm run optimizer -- prepare-data --regenerate              # rebuild processed files from saved raw files
npm run optimizer -- validate-data                          # hashes and re-transform check, no network
npm run optimizer -- audit-data                             # rewrite DATA_AUDIT.md

# Equivalence gate and tests
npm run optimizer -- golden-master                          # original vs working copy, 100 cases
npm test                                                    # 72 tests

# Optimization (reads nothing after 2023-12-31)
npm run optimizer -- walk-forward --smoke                   # tiny budgets, VGT, experiment "smoke"
npm run optimizer -- walk-forward --symbols VGT --experiment pilot-vgt
npm run optimizer -- walk-forward                           # all 21, experiment "main" (resumes completed runs)
npm run optimizer -- walk-forward --top-n 5 --workers 6 --seed 42 --experiment alt
npm run optimizer -- report --experiment main               # regenerate reports (refused once frozen)
npm run optimizer -- benchmark                              # in-process vs 1/2/4/8 workers

# Freeze, then the one-time holdout, then the stress test
npm run optimizer -- freeze --experiment main
npm run optimizer -- holdout --experiment main              # refuses a second run without --rerun-reason
npm run optimizer -- stress --experiment main
```

Other options: `--samples`, `--population`, `--generations`, `--ga-runs`, `--max-evals`, `--control-seeds`, `--ticker-concurrency`, `--no-folds`, `--local` (no worker threads), `--protocol file.json` (dates), `--start`/`--end`, `--stooq-archive PATH`, `--no-archive`. `npm run optimizer -- help` lists them all.

To **reproduce** a completed experiment, rerun the same `walk-forward` command with the same seed, on the same data (the manifest hashes) and code (`run-manifest.json` records the git revision and a code hash). Records are byte-identical whatever the worker count. Delete a symbol's run folders to force recomputation; any change to code or configuration recomputes automatically.

## Data source note

Stooq's live endpoints refused every automated request during this work: a JavaScript proof-of-work "verify your browser" page, or HTTP 403. The pipeline does not try to get around that. All 21 series were taken from the Stooq bulk daily archive already on this machine (`~/development/personal/trading/data/d_us_txt.zip`, dated 2026-09-09), so they end on **2026-09-08**.

To extend the holdout through mid-October 2026, before running `holdout`:

1. Save each symbol's CSV from its Stooq page's "Download data in csv file..." link into `data/stooq/inbox/`.
2. Run `prepare-data --refresh --offline`.

Changing the data after the freeze is detected and refused.

## Working copy and files changed

- New: `src/app/allIn-optimizable.ts`, `src/app/optimizer.ts`, `src/optimizer/**`, `research/multi-asset-optimizer/**`. Prepared data goes under `data/stooq/` (gitignored, like all of `data/`).
- `package.json`: added the `optimizer` and `test` scripts; no new dependencies.
- `eslint.config.js`: ignores `research/**/tmp/**`, the gitignored scratch folder where the golden master writes generated variants of the original.
- Not modified: `src/app/allin-original.ts`, `src/app/allIn.ts` (minute strategy), `src/lib`, `src/types`, existing files under `data/`.
