# Trailing-buy entries for the daily VGT margin strategy

Can VGT's daily margin dip-buy (`src/app/allin-original.ts`) do better if, after the 10% drawdown signal, it **arms** a trailing buy and purchases only after a rebound of Y% (or K × ATR) from the lowest close, keeping the original exits?

**Answer: no. Keep the immediate entry.** Across a Y-only sweep, a 9,956-point X × Y grid, two ATR variants on 23,580 points each, and an equal-budget Sobol + NSGA-II optimization of every parameter for three entry families, no candidate passed the pre-registered acceptance standard. Every trailing-entry pick lost to the original in the 2018–2022 walk-forward (B0 $84,183 / $23,723 drawdown; trailing −$39k … $19k) and on the untouched-by-this-study 2023-01-03 → 2026-10-14 holdout (B0 $122,197 / $28,208; trailing −$9.5k … $83.7k). The trailing buy pays more for its entries than the decline it avoids, its rebound fills are often failed rallies, and the unchanged 15-day loss exit then sells them. Re-optimizing the original's own numbers did not help out of sample either. See [RECOMMENDATION.md](RECOMMENDATION.md).

## Reports

| File | Contents |
|---|---|
| [RECOMMENDATION.md](RECOMMENDATION.md) | Decision, the required summary comparison table, candidates, operational rules, failure cases, next research |
| [PROTOCOL.md](PROTOCOL.md) | Pre-registration (hashed in `PROTOCOL.sha256` before any trailing-buy result), two dated pre-holdout amendments and two post-holdout clarification / disclosure amendments |
| [BASELINE_AUDIT.md](BASELINE_AUDIT.md) | Which file is the baseline (and the 0.5%/3% vs 1%/2% discrepancy), verified rules, data audit, byte-identical parity |
| [STATE_MACHINE.md](STATE_MACHINE.md) | The arm → trail → buy machine, its interaction with the restriction and reset, ATR, worked examples |
| [PHASE1_FIXED_Y.md](PHASE1_FIXED_Y.md) | X = 10%, Y swept: why it buys higher; sensitivities (variant B, frozen high, B0c exits, max-wait) |
| [PHASE2_XY.md](PHASE2_XY.md) | Joint X × Y map, the legacy-X comparator, activation depth by episode speed |
| [PHASE3_ATR.md](PHASE3_ATR.md) | ATR snapshot vs rolling; effective rebound by regime; the continuation test |
| [PHASE4_OPTIMIZATION.md](PHASE4_OPTIMIZATION.md) | Optimizer design and budgets, Sobol vs random, walk-forward, all FINAL shortlists (every parameter), Amendment 2 |
| [EXECUTION_SENSITIVITY.md](EXECUTION_SENSITIVITY.md) | Close vs next-open vs pre-close (minute data) fills; margin rates 8–14% |
| [EVENT_ATTRIBUTION.md](EVENT_ATTRIBUTION.md) | All 20 correction episodes; deep corrections; V-shapes vs failed rallies; entry traces |
| [VALIDATION_ROBUSTNESS.md](VALIDATION_ROBUSTNESS.md) | Acceptance table, walk-forward, holdout, bootstrap, perturbations, start dates, data quality, cross-asset |
| [replay/REPLAY_REPORT.md](replay/REPLAY_REPORT.md) | Independent stdlib-Python replay written from the spec: 25 / 25 configurations byte-identical |
| [LOOKAHEAD_REVIEW.md](LOOKAHEAD_REVIEW.md) | Independent code review for lookahead and holdout leakage |

The brief's suggested `src/` inside this folder follows the repository convention instead: the code is in `src/trailing-buy/`, with the entry point `src/app/trailingBuy.ts`.

## Reproduce

```sh
# every development step in order: parity gate, Phases 1–4, the pre-freeze battery (≈ 2 minutes on 8 threads)
node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts trailingBuy development

# post-holdout explanatory reporting (episode attribution, traces, curves)
node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts trailingBuy events

# independent replay (stdlib Python)
python3 -I research/trailing-buy-entry/replay/replay.py && python3 -I research/trailing-buy-entry/replay/compare.py

# tests (45 for this study)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/trailing-buy/tests/*.test.ts'
```

Individual commands: `phase0` (data build and audit, parity; later phases refuse to run until it passes), `phase1` … `phase4`, `prefreeze`, `replayExport`, `freeze`, `holdout`, `events`. `TBE_WORKERS=<n>` sets the worker-thread count (0 = in-process); results do not depend on it.

**Do not re-run `freeze` or `holdout` casually.** The freeze was written once (2026-10-16T22:37:39Z, `results/freeze/freeze.json`, sha256 in `freeze.json.sha256`; an earlier, superseded freeze is in `results/freeze/superseded/`, see Amendment 2), and `freeze` refuses to overwrite it. The holdout ran once (`results/holdout/attempts.json`, attempt 1 at 22:37:45Z); `holdout` refuses a second run unless given `--rerun-reason "<why>"`, and records it.

Tested with Node v23.6.1 (`/opt/homebrew/bin/node`; the repository's `engines` field asks for ≥ 24.21, which is not installed on this machine). The whole development pipeline reproduces byte-identically on 3 and 8 worker threads.

## Data manifest

| Item | Value |
|---|---|
| Primary series (derived, git-ignored) | `data/trailing-buy-entry/VGT-daily-2005-02-25_2026-10-14.csv`, sha256 `2850e669d67ecbd7c935056e800a5ae1b445798ddef60173f6064a8b9cffff4c`, 5,442 sessions; built by `phase0` |
| Inputs | `data/VGT/VGT-2005-2026.csv` (sha256 `3aaf182bf188ba6f3967185102dc5dfc34e8dbd46794192428b2e88bc19dbb9d`) + the 2026-10-14 row of `data/VGT/VGT-2026.csv` (sha256 `734409cff831388d6c338e11109cf9eb92e3fccbc4ebb36bd950dd3af17800c9`), identical on all 94 shared rows |
| Provider / adjustment | Stooq back-adjusted daily OHLCV (splits, distributions); details in BASELINE_AUDIT.md §3 |
| Windows | signals from 2014-01-02; development 2014-01-02 → 2022-12-30 (walk-forward WF1–WF3); holdout 2023-01-03 → 2026-10-14 |
| Pre-close model | `data/VGT/VGT-2016-2025-1-minute.csv` (sha256 `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f`), Alpaca raw minute bars 2016-01-04 → 2025-10-13 |
| Cross-asset | `data/stooq/processed/<SYMBOL>/<SYMBOL>-stooq-daily.csv` for QQQ, VOOG, SOXX, IGV, XLY, IWN (through 2026-09-04) |
| Not available | actual historical broker margin rates (FRED unreachable from this environment); only constant-rate sensitivities were run |

All inputs are under the git-ignored `data/`; `phase0` checks their hashes before deriving anything.

## Code (`src/trailing-buy/`)

| Module | Role |
|---|---|
| `engine.ts` | The original's daily state machine, parameterized: legacy / fixed / ATR snapshot / ATR rolling entries; close, next-open and pre-close execution; restricted-fill variants A/B; frozen-high option; optional max-wait |
| `indicators.ts`, `episodes.ts`, `metrics.ts` | Reference highs, true range and Wilder ATR; price-only analysis episodes and attribution blocks; window metrics by mark-to-market attribution |
| `goldenMaster.ts`, `phase0.ts`, `data.ts`, `export.ts` | Data build and audit; runs the untouched original (and its generated 1%/2% copy) and compares all five output files by SHA-256 |
| `params.ts`, `search.ts`, `selection.ts`, `pool.ts`, `worker.ts`, `evaluate.ts` | Quantized parameter spaces; Sobol + NSGA-II search (reusing `src/optimizer/sobol.ts`, `nsga2.ts`, `rng.ts` unchanged); robust selection; worker threads |
| `grids.ts`, `phase1.ts` … `phase4.ts` | The phases |
| `candidates.ts`, `validation.ts`, `prefreeze.ts`, `freeze.ts`, `holdout.ts`, `events.ts`, `preclose.ts` | Candidate registry, robustness battery, freeze, run-once holdout, post-holdout reporting, minute-data pre-close prices |
| `charts.ts`, `format.ts`, `cli.ts`, `replayExport.ts` | SVG charts, tables, commands, replay inputs |

Nothing outside `src/trailing-buy/`, `src/app/trailingBuy.ts` and this folder was changed. `src/app/allin-original.ts` (sha256 `42f2b7e7…`, checked by a test) and the minute strategy `src/app/allIn.ts` are untouched.

### Tests and the brief's required test areas

| Brief § 5 item | Where |
|---|---|
| 1 legacy reproduces the original exactly | `goldenMaster.test.ts` (real files, both settings, synthetic walks covering every exit and restriction path; warm vs cold start) |
| 2 arms at X without filling; lower closes move the trough | `engine.test.ts` "arms at X…", "even a tiny rebound…" |
| 3 fills at the actual close / open, not the threshold | `engine.test.ts` ($78.00 not $77.25; next-open gap up / down) |
| 4 the drawdown need not be ≥ X at the fill | `engine.test.ts` |
| 5 extended declines, sub-threshold rebounds, gaps, missing sessions, end-of-data pending, overlapping activations | `engine.test.ts` |
| 6 restricted arming; variants A / B; reset cancels the setup; no same-day reset-and-entry | `engine.test.ts` "material-loss restriction…" |
| 7 frozen activation high feeds the restriction | `engine.test.ts` |
| 8 exit priority (15-day open exit, stop activation, gap fill, prior-session stop, no same-day exit and re-entry) | `engine.test.ts` "exit rules", plus the golden walks |
| 9 ATR warm-up, true range, lag, snapshots, exact triggers | `indicators.test.ts`, `engine.test.ts` "ATR trailing entry" |
| 10 quantization, worker reproducibility, invariance across core counts and seeds | `indicators.test.ts` "quantization", `determinism.test.ts` |
| 11 held-out dates never enter selection | `isolation.test.ts`, plus the structural truncation in `study.ts` |
| – pool clones and the pick rules; pre-close execution | `selection.test.ts`, `isolation.test.ts` |

`npm test` for the whole repository: 180 tests, 160 pass. This study's 45 all pass; the 20 failures are pre-existing, in the minute-optimizer and intraday-study suites, which pin `src/app/allIn.ts` and broke when commit `101756b` changed its constants (details in BASELINE_AUDIT.md §7).

## Results layout (`results/`)

`phase0/` (manifest, audit, golden master, the original's own baseline files), `phase1/`…`phase3/` (per-fold grids, picks, validation, development detail incl. every trade and setup), `phase4/<family>/<fold>/` (search, selection, pool; FINAL archives with every evaluated candidate), `validation/development/` (pre-freeze battery), `freeze/`, `holdout/` (scores, acceptance, shortlists, bootstrap, start dates, perturbations, pre-close, cross-asset, full-period runs and annual P&L), `events/` (post-holdout attribution; full-precision daily MTM curves and every trade of B0, the intuitive fixed settings and the frozen picks, 2014–2026), `as-run-before-amendment-2/` (the superseded Phase 4 and validation results). Each folder's `tables.md` holds the tables quoted in the reports. Charts are in `charts/`.

### Changes after the freeze (reporting only)

After the holdout run, `charts.ts` gained a label halo, a y-axis range fix and an entry-trace chart, `events.ts` and its `cli.ts` command were added, and the two holdout curve charts moved from `holdout.ts` to `events.ts`. These four are the only code files modified after the freeze (by modification time). A full re-run of the development pipeline after these changes reproduced every result file byte for byte (only the SVGs changed). The freeze's code hash (`ea8bcf65…`) is of the code as frozen, and the engine, selection and evaluation modules are unchanged since.
