# Protocol: eight-ETF D1 parameter research with a sealed 2024–2025 holdout

Written on **2026-10-23** (UTC, see the timestamps of `results/audit/summary.json`, `results/baseline/benchmark.json` and
`results/profile/profile.json`, all produced before this file), after the data audit, the VGT regression control, the
unchanged-D1 development benchmark and the throughput profile, and **before** any search, selection or holdout run.
No strategy performance after 2023-12-29 has been computed or read for any of the eight tickers at the time of
writing: the development commands build a dataset that physically ends on the last 2023 session. Amendments made
after this point are appended in section 10 with their reason and timestamp; everything else is fixed here.

The constants below are declared in `src/multi-etf-d1/context.ts` (`protocol`), which every command reads.

## 1. Scope

- Architecture: the shipped **D1** strategy, `src/app/allIn-trailingBuy-postExitContinuation.ts`, unchanged
  (git HEAD `2693818d`). No trading rule is added, removed or re-ordered; only its eight numerical parameters are
  searched, per ticker, with their existing meaning and units. No swing-low / P2s path, no shared pool, no allocator,
  no compounding, no leverage beyond the file's fixed principal.
- Tickers: XBI, IWM, XRT, KRE, XLY, IWN, XLF, XLE, each standalone. VGT is the regression control only.
- Engine: `src/d1-refinement/engine.ts` + `src/trailing-buy-variants/accounting.ts` through
  `src/d1-refinement/evaluate.ts` (parity with the D1 file asserted by that program's tests and by this program's
  `parity` and `benchmark` commands on every ticker through the last 2023 session). One additive option was added to
  the engine for this program: an optional per-side transaction cost (`costPerSide`, default off, bit-identical when
  off) for the predeclared cost sensitivity of section 8.

## 2. Data (from `DATA_AUDIT.md` / `results/audit/`)

| Ticker | File | SHA-256 |
|---|---|---|
| XBI | `data/XBI/XBI-2016-2025-1-minute.csv` | `ad5521e33b53fa1590c07de5a4f5f6ca6738b06aae8bcb6224606901a5a56f7b` |
| IWM | `data/IWM/IWM-2016-2025-1-minute.csv` | `e94869c669a5b0ad51a3114ca372207a174e8d0f935c101c16841b6021c1f090` |
| XRT | `data/XRT/XRT-2016-2025-1-minute.csv` | `c7c591557cc58576eb16da29ef5278643da0b0c23c183fe24cfb1c8f4bf79dc8` |
| KRE | `data/KRE/KRE-2016-2025-1-minute.csv` | `5f8b2a284a862fdc15c1ba82649fbb749ce3dbbd66046c0f4c4c0f3f4c9e7e0b` |
| XLY | `data/XLY/XLY-2016-2025-1-minute.csv` | `b58e2fbcd15d3b6a0c6b115fb6017490c3f2ed04d41fc61da4e74ca85b42155e` |
| IWN | `data/IWN/IWN-2016-2025-1-minute.csv` | `aea1d2bb792bdc562940f88edde146bed674ed6adc0c79f03cfbdeaaf652d947` |
| XLF | `data/XLF/XLF-2016-2025-1-minute.csv` | `d6cc7fe9f0d4ebdffb47e576f28e54373b40da909f411bdc7aca682d7fe445ed` |
| XLE | `data/XLE/XLE-2016-2025-1-minute.csv` | `e8adb598f40cdd95297b6dbda255ee0888a2a41e636734139ce04ff395c1922a` |
| VGT (control) | `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f` |

Alpaca SIP one-minute bars, raw prices (no split or dividend adjustment), 2,462 sessions 2016-01-04 → 2025-10-16 on
every one of the eight files, no missing or sparse session, every session's bars sorted and UTC-stamped. Every command
verifies the hash of each file against `results/audit/hashes.json` and refuses a changed file. Price basis: price-only
for every ticker, as the D1 baseline defines it; ex-dividend drops are price moves; the only material corporate action
in the data (XLF's 2016-09-19 real-estate distribution, −18.1% overnight) lies before the eligibility session and never
sets a rolling high after it for any lookback in the search box (`results/baseline/benchmark.md`).

## 3. Windows and eligibility (exact session boundaries)

- **Eligibility**: every run arms from the first session on or after **2017-06-15** (session index 365 on every
  file, the same as the VGT convention of the previous programs). Reason: every lookback the search can reach
  (L ≤ 250) is complete before it; it makes the eight tickers and the VGT control comparable; and it keeps the XLF
  distribution gap out of every arming decision (the file's own convention, arming from session 74, arms XLF on that
  artificial −18% gap: two trades, `benchmark.md`). Earlier sessions are warm-up only.
- **Development**: sessions with a New York date **≤ 2023-12-31**, i.e. the last development session is
  **2023-12-29** (index 2011). The development dataset is physically truncated there (`researchDataset`); no later
  price exists in any development process.
- **Holdout**: the first session **2024-01-02** through the last session common to the eight files,
  **2025-10-16** (inclusive; its 16:00 ET closing print is the last price used). This is the "most recent valid
  common endpoint": every file ends on 2025-10-16 and holds no later bar. The intended end 2025-12-31 is therefore
  truncated to 2025-10-16 by data availability, not by choice. 450 sessions. VGT ends 2025-10-13 and is not a holdout
  instrument of this program.
- The holdout run is **one continuous run from the eligibility session**: the state at the 2024 boundary (open
  position, armed setup, continuation window, trailing highs, time in trade, pending sales) is carried. The holdout
  window is a segment of that run; its net is the change of the marked equity between the 2023-12-29 close and the
  2025-10-16 close. Positions spanning the boundary are reported separately (lifetime P&L, the part accrued inside the
  holdout, entry cohort).

## 4. Backtest and accounting contract

$100,000 borrowed per entry, no compounding, simple 11% annual interest per calendar day from the entry session's
date (none on that date), D1's execution rules on minute bars (rebound at a completed minute's close, fill at the next
observed trade; stop level from the post-entry high updated once a day; stop eligible only while a fill at the level
nets a profit after interest, re-decided every session; gaps through an active stop fill at the opening trade; the
maximum-hold loss exit at the open from the hold day; the buffered intraday loss exit from the hold day; intraday stop
fills at the stop level when the minute opened above it — `stop` — with `next-open` as the adverse-fill sensitivity).
Drawdowns: minute-sampled (every regular-session minute close and the official close) and daily (official close)
falls of the cumulative strategy P&L from an earlier peak, peak starting at 0 at the run's first session. No slippage,
spread or commission in any headline figure. One ticker per run, one position at a time.

## 5. Regression control (done before this protocol; `BASELINE_REPRODUCTION.md`)

The D1 file on the full VGT file reproduces $183,043.82 net / $19,330.69 minute-sampled drawdown / 20 entries
(one open) to the cent; the engine reproduces the file trade for trade under both arming conventions. On the eight
tickers the engine reproduces the file (arming from session 74) trade for trade through 2023-12-29.

## 6. Search (per ticker, development data only)

### 6.1 Parameters, quantization, box

Integer grid: percentages in tenths of a percentage point, days and sessions whole. Every candidate any stage
produces (Sobol, crossover, mutation, probes) is an integer vector inside the box; IDs, deduplication, caching and
reports use the same integers (216 = 21.6%, and 216 / 1000 is the same double as the file literal 0.216).

| Parameter | D1 | Box | Why |
|---|---:|---|---|
| X `targetPercentChange` | 21.6% | 8.0–30.0% | deepest development declines from the rolling 74-session high: 34% (XLY) to 62% (XLE); 2018/2022 declines 20–37% on every ticker; 30.0% is the engine grid ceiling and still arms in 2020 on every ticker; 8% admits ordinary sector pullbacks |
| Y `trailingBuyPercentage` | 0.3% | 0.1–5.0% | immediate confirmation up to more than a typical day's move (median daily moves 0.6–1.3%) |
| stop `trailingStopPercentage` | 7.3% | 3.0–15.0% | tighter than a day of sector noise up to twice D1 |
| hold `maximumHoldDays` | 8 | 3–30 calendar days | |
| L `tickWindowSize` | 74 | 20–250 sessions | up to one trading year, complete at eligibility |
| buffer `intradayLossBuffer` | 2.9% | 0.0–6.0% | |
| P `pullback` | 9.0% | 3.0–20.0% | |
| W `continuationWindow` | 60 | 10–200 sessions | |

The box is the same for every ticker (no per-ticker bounds). Space size ≈ 1.6 × 10¹⁴ vectors.

### 6.2 Stages and budget

Throughput (`results/profile/profile.json`, 9 worker threads on 10 cores): 120–380 exact-minute development runs
per second depending on the ticker (14–29 ms per run in-process).

1. **Coverage**: a scrambled Sobol design of **4,096 unique** quantized candidates per ticker (seed derived from
   `multi-etf-d1|<ticker>|sobol-scramble`), plus the frozen D1 vector as the control. Evaluated once each on the
   continuous development run with every window of section 6.3 as a segment.
2. **Chronological refinement**: for each fold in order, **one NSGA-II run** (population 96, ≤ 40 generations, ≤
   3,000 new simulations, patience 12 generations on the 2-D hypervolume against the reference (net 0, DD $35,000),
   SBX η 15 / polynomial mutation η 20 / crossover 0.9, seed `multi-etf-d1|<ticker>|ga|<fold>`), objectives =
   (maximize net, minimize minute-sampled DD) **on the fold's training window only**, constraints = DD ≤ $35,000 and
   entries ≥ the fold's minimum (section 7). Seeded from every candidate evaluated in earlier stages (Sobol, D1,
   earlier folds' GA and probes), ranked on the training window.
3. **Selection + probes** per fold (section 7), then the next fold.

Upper budget per ticker: 4,096 + 5 × 3,000 + probes (≤ 32 probes × 30 candidates × 2 lists × 5 folds = 9,600) =
**28,696 runs**, about 15 minutes for the eight tickers. The budget is identical for every ticker and is not changed
after results are seen. Evaluations are cached by candidate ID (`results/search/<ticker>/evaluations.jsonl`), so a
vector is simulated once; a rerun resumes from the checkpoint and reproduces the same decisions.

### 6.3 Folds (all inside 2016–2023; training windows start at the eligibility session)

| Fold | Training (continuous from 2017-06-15) | Validation (the continuous run attributed to the window) |
|---|---|---|
| fold1 | → 2019-12-31 | 2020-01-02 → 2020-12-31 |
| fold2 | → 2020-12-31 | 2021-01-04 → 2021-12-31 |
| fold3 | → 2021-12-31 | 2022-01-03 → 2022-12-30 |
| fold4 | → 2022-12-30 | 2023-01-03 → 2023-12-29 |
| final | → 2023-12-29 | none: its picks are the nominations |

A training window is a prefix segment of the single continuous development run; because the engine is causal and
the accounting carries nothing across a segment start, the segment's net, drawdown and entries equal those of a run
truncated at the segment's end (`src/multi-etf-d1/tests/segments.test.ts`). The GA of fold *k* therefore sees only
training-*k* figures. Candidates bred in fold *j* are only in the pools of folds ≥ *j*.

## 7. Selection rule (fixed; applied identically on every fold and ticker)

Views: a candidate's **training view** on fold *k* = net, minute DD, entries of the `train:k` segment; its
**validation view** = the same on `valid:k`. On the final fold the training view is the development window.

1. **Feasible**: minute DD ≤ **$35,000** on the window judged (screening constraint, not a loss cap) and entries ≥
   ⌈0.75 × years of the training window⌉ (fold1 2, fold2 3, fold3 4, fold4 5, final 5).
2. **Beats D1**: training net strictly above frozen D1's training net on the same ticker and window.
3. **Shortlists** (distinct trade signatures only): the **net list** = feasible, beats-D1 candidates by net
   descending; the **drawdown list** = those with net ≥ 75% of the best feasible net, by DD ascending. Each list is
   probed 10 at a time (up to 30) until one candidate passes the plateau check.
4. **Plateau check** (one-parameter perturbations inside the box: X ±0.5/±1.0 pt, Y ±0.1/±0.2, stop ±0.5/±1.0, hold
   ±1/±2, L ±5/±10, buffer ±0.5/±1.0, P ±0.5/±1.0, W ±10/±20, i.e. up to 32 probes): pass iff ≥ 75% of the in-box
   probes are feasible **and** the median probe net ≥ 70% of the candidate's net (and the net is positive).
5. **Primary**: the highest-net plateau candidate of the net list with minute DD ≤ **$25,000**; if none, the
   highest-net plateau candidate of the net list. **None** if nothing feasible beats D1 or nothing passes the plateau.
6. **Alternate `maxNet`**: the highest-net plateau candidate of the net list with a higher net than the primary and a
   distinct trade signature (only exists when the primary came from the preferred DD band).
7. **Alternate `lowDd`**: the lowest-DD plateau candidate of the drawdown list with DD below the primary's, net ≥ 75%
   of the primary's, and a signature distinct from the primary's and maxNet's.
8. **Sparse** flag: fewer than 10 closed trades on the development window (candidate or control) = insufficient
   evidence; reported, never used to re-select.
9. **Walk-forward**: the rule run on fold1–fold4; a policy "passes" for a ticker when its picks' validation net is ≥
   D1's in at least half the folds with a pick and the stitched validation net exceeds D1's stitched net. This is
   evidence about the rule, reported with the nominations; it is not a gate and nothing is re-selected from it.
10. Ties: candidate ID. Exploration (Sobol/GA) and the locked validation (the walk-forward of the rule above) are
    distinct; no fold is re-run after inspection.

## 8. Freeze and holdout

- `freeze` writes `FROZEN_CANDIDATES.json`: per ticker the control (D1) and the nominations with exact integer
  parameters and fractions, candidate IDs, trade signatures, development metrics, the walk-forward summary; the data
  hashes, the hashes of the decision code and the D1 source, this protocol's hash, the git HEAD; and a SHA-256 of the
  body (`manifestHash`). It refuses to overwrite an existing manifest.
- `holdout` runs **once**: it verifies the manifest hash, the data, code and protocol hashes, records the attempt
  (`results/holdout/attempts.json`; a second attempt needs `--rerun-reason`, which is recorded and reported), builds
  the full dataset with the one unlock capability, and evaluates **only** the frozen control and nominations of each
  ticker on the continuous run (segments: combined, development, holdout, each calendar year). No parameter is
  changed, no candidate added, no ticker dropped. Reported per ticker: holdout net (period equity change), realized
  and unrealized parts, interest, minute and daily DD inside the holdout, entries, exits, wins/losses, exposure, worst
  trade, worst adverse excursion, boundary-spanning positions, and the full-horizon figures.
- **Predeclared sensitivities on the frozen candidates only**, in the same holdout run: per-side costs of 2, 5 and
  10 bps applied causally (every fill worsened, every net-profit test counting the sale's cost), and `next-open`
  stop fills. These are reported next to the base figures, never used to rank.
- Any analysis of 2024–2025 that departs from this section is labelled exploratory and not an independent holdout.

## 9. Reports

`README.md`, `PROTOCOL.md` (this file), `DATA_AUDIT.md`, `BASELINE_REPRODUCTION.md`, `OPTIMIZATION_RESULTS.md`,
`FROZEN_SELECTION.md` + `FROZEN_CANDIDATES.json`, `HOLDOUT_RESULTS.md`, `STRATEGY_COMPARISON.md`,
`ROBUSTNESS_AND_RISK.md`, `IMPLEMENTATION_AUDIT.md`, `RECOMMENDATIONS.md`; per ticker and per candidate
`trades.csv`, `daily.csv`, `summary.json` (development under `results/selection/`, holdout under
`results/holdout/`). Every number in the reports comes from a file under `results/`.

## 10. Amendments

(none at the time of writing)

Appended after the search, the freeze and the holdout (each item dated; none changed a decision):

- 2026-10-23, before the budget run: one mechanics smoke test of the `search` command on XLF with a 64-point Sobol
  design (same GA settings) to check the pipeline end to end; its outputs under `results/search/XLF` and
  `results/selection/XLF` were deleted before the full run and nothing was changed as a result.
- 2026-10-23, noted while testing the rule before the freeze: section 7.3's drawdown list keeps candidates with net ≥
  75% of the *best feasible* net, which may be a needle that fails the plateau check, so the `lowDd` alternate's
  effective floor is the stricter of that and 75% of the primary's net. The rule was kept exactly as written and
  `src/multi-etf-d1/tests/selection.test.ts` exercises it as written.
- 2026-10-23, between the search and the freeze: two non-decision code edits — the manifest also lists untracked
  files, and the holdout's minute-level curves became opt-in (`--minute-curves`). Neither file is a decision file.
- 2026-10-23T13:22:49Z: holdout attempt 1 on manifest `d3645e1e8b8dafbdbf5ca6b7ef3b78745a3389b7730b19f68df0647377f4ca7e`;
  13:23:55Z: attempt 2 with `--rerun-reason "determinism check"`, identical results. The protocol hash recorded in the
  manifest is that of this file *before* this appended section; a further holdout run would now be refused by the
  protocol-hash check, which is intended: the preregistered evaluation is complete.
