# Baseline audit (Phase 0)

**Gate: passed.** The study engine in legacy mode reproduces the immutable original byte for byte (all five output files, SHA-256, no tolerance) in 11 of 11 cases, for both the checked-in settings and the brief's settings. No later phase ran before this.

## 1. Which file is the baseline

- `src/app/allin-original.ts` is the daily OHLCV strategy (lowercase *i*; last changed in `b7abde6`; sha256 `42f2b7e7…f87449e2`). It was only read, never edited; a test fails if one byte changes. `src/app/allIn.ts` is the separate one-minute strategy and was not used or touched.
- **Configuration discrepancy.** The brief's reference (an uploaded `allin-original(2).ts`) has executable defaults material loss **1.0%** / lower re-entry **2.0%**, with introductory comments still describing 0.5% / 3%. The checked-in file is different: its code *and* its comments both say **0.5% / 3.0%** (lines 18–23 and 163–164). The uploaded file is not in the repository or on disk, so it was matched by behaviour, not by name: it equals the checked-in file with those two constants changed (the brief's other settings, 10% / 90 sessions / 8% / 15 days / 38% / 11%, all match the checked-in code).
- Resolution, following the brief's rule that executable code wins and that the 0.5% / 3% control must stay reconstructable:
  - **B0** (primary baseline) = the checked-in logic with **1.0% / 2.0%**. Parity is checked against a generated literal copy of the original with exactly two lines changed (`const materialLossThreshold = 0.005;` → `0.01;`, `const lowerPriceReentry = 0.03;` → `0.02;`; each must occur exactly once). The copy is written to the git-ignored `data/trailing-buy-entry/reference/allin-original-1pct-2pct.ts` (sha256 `3d271d69…`) on every run.
  - **B0c** (control) = the checked-in file unchanged, **0.5% / 3.0%**.
  - The repository's latest commit (`101756b`, "Using sane, safer parameters") set the minute `allIn.ts` to 10% / 8% / 15 / 90 / 1% / 2% / 38%, which supports 1% / 2% as the user's current intent.

## 2. Rules verified in the code

| Component | Code (both baselines) | Brief | Note |
|---|---|---|---|
| Entry signal | `1 − close / max(high of the 90 sessions before today) ≥ 10%` | 10% vs 90-session high, today excluded | ✓ intraday **high**, rolling window; a cold start has a shorter window until 90 sessions exist |
| Entry fill | the signal close; $100,000 / close shares (fractional) | ✓ | idealized |
| Positions | one at a time; the entry session is never checked for exits | ✓ | |
| Same-session re-entry | impossible: an entry needs a flat start of session | ✓ | |
| Trailing stop | 8% below the highest high since entry (initialised at the entry close), raised after each session for the next | ✓ | a session's own high never moves its own stop |
| Stop activation | `shares × stop − $100,000 − interest > 0`, decided before each open | ✓ | growing interest can deactivate it |
| Stop fills | at the open if the open is at or below an active stop (even at a loss), else at the stop when the low reaches it | ✓ | |
| Maximum hold | from 15 **calendar** days (timestamp difference), sell at the open if that sale loses money after interest; checked before the stop gap | ✓ | if both fire at the open, one fill credited to the maximum hold |
| Material loss | `exit price / entry price − 1 ≤ −threshold` (interest excluded) | 1.0% | B0 1.0%, B0c 0.5% |
| Restriction | freezes the loss-exit fill price, the losing trade's entry reference high; tracks the lowest close; a new entry needs the 10% signal **and** close ≤ exit × (1 − lower) | 2.0% | B0 2.0%, B0c 3.0% |
| Recovery reset | flat close ≥ episode low + 38% × (frozen high − episode low), checked every flat restricted close including the exit session; the reset session never buys | 38% ✓ | precedence over a lower-price entry on the same close |
| Interest | simple, 11% × $100,000 × calendar days / 365; none on the entry day; through the exit session | ✓ | not optimized |
| Mark to market | realized + open position at the close − accrued interest; drawdown from a running peak that starts at $0 | ✓ | |
| Costs | none (no commission, spread, slippage) | out of scope | kept at zero |

## 3. Data

| Item | Value |
|---|---|
| Primary file (derived, git-ignored) | `data/trailing-buy-entry/VGT-daily-2005-02-25_2026-10-14.csv`, sha256 `2850e669…`, 5,442 sessions |
| Inputs | `data/VGT/VGT-2005-2026.csv` (sha256 `3aaf182b…`, 5,441 rows to 2026-10-13) + 2026-10-14 from `data/VGT/VGT-2026.csv` (sha256 `734409cf…`); the 94 shared rows are identical |
| Provider / adjustment | Stooq daily history (bulk archive), back-adjusted for splits and, judging by the data, distributions (Stooq does not document the method; see `research/multi-asset-optimizer/DATA_AUDIT.md`). Rows after 2026-09-08 come from the user's `VGT-2026.csv` (provider not recorded), which matches the Stooq-based file exactly on every overlapping row. The 8:1 split of 2026-04-21 is back-adjusted (no jump in the series). |
| Timezone / timestamps | session dates (New York trading days); time = midnight UTC of the date, as in the original |
| Missing sessions | none: the only gaps over 4 calendar days are 2006-12-29 → 2007-01-03 (national day of mourning) and 2012-10-26 → 2012-10-31 (Hurricane Sandy); 250–253 sessions in each full year |
| Invalid bars | none: every bar has positive prices with low ≤ min(open, close) and high ≥ max(open, close) |
| Anomalous lows | 2010-05-06 (−20.7% vs the prior close, flash crash), **2015-08-24 (−23.2%, the ETF opening dislocation)**, 2020-03-16 (−13.5%, a real close-to-low move). Only 2015-08-24 is in the research window; it did not trigger a stop (no active stop) but it enters ATR(N) and the lowest-low statistics; a data-quality sensitivity replaces that low by min(open, close) (VALIDATION_ROBUSTNESS.md). |
| Research window | signals from 2014-01-02; history from 2005 for reference highs (L up to 180) and ATR warm-up |
| Cross-asset files | `data/stooq/processed/<SYMBOL>/` for QQQ, VOOG, SOXX, IGV, XLY, IWN, all ending 2026-09-08 (the archive's partial last day, dropped in the cross-asset check), no invalid bars |
| Minute file (pre-close model) | `data/VGT/VGT-2016-2025-1-minute.csv` (sha256 `600322af…`), Alpaca raw (unadjusted) bars 2016-01-04 → 2025-10-13 |

## 4. Parity (byte-identical, SHA-256 of every file)

Every case runs the original module itself (the checked-in file, or its two-constant copy) through its own default export, and the engine over exactly the same bars (`results/phase0/golden_master.json`).

| Case | Reference | Window | Closed trades | Open at end | Net P&L | Max MTM DD | Interest | 5 files identical |
|---|---|---|---:|---|---:|---:|---:|---|
| repo-default | checked-in | `VGT-2016-2026.csv` whole | 38 | no | $196,310 | $28,687 | $64,041 | ✓ |
| repo-default | 1% / 2% | `VGT-2016-2026.csv` whole | 39 | no | $206,380 | $28,208 | $69,737 | ✓ |
| research file whole | checked-in | 2005-02-25 → 2026-10-14 | 74 | no | $212,114 | $50,883 | $127,479 | ✓ |
| research file whole | 1% / 2% | 2005-02-25 → 2026-10-14 | 76 | no | $235,850 | $50,509 | $140,348 | ✓ |
| research window | checked-in | 2014-01-02 → 2026-10-14 | 43 | no | $190,905 | $28,687 | $72,751 | ✓ |
| research window | 1% / 2% | 2014-01-02 → 2026-10-14 | 44 | no | $200,975 | $28,208 | $78,447 | ✓ |
| development | 1% / 2% | 2014-01-02 → 2022-12-30 | 29 | yes | $78,778 | $23,723 | $43,066 | ✓ |
| 2020 | 1% / 2% | 2020 | 5 | yes | $57,597 | $15,660 | $8,016 | ✓ |
| QQQ (Stooq) | 1% / 2% | 2014-01-02 → 2026-09-08 | 36 | yes | $111,261 | $35,220 | $62,956 | ✓ |
| SOXX (Stooq) | 1% / 2% | same | 64 | yes | $104,631 | $59,812 | $72,389 | ✓ |
| IWN (Stooq) | 1% / 2% | same | 44 | no | $2,412 | $46,270 | $66,090 | ✓ |

The automated tests (`src/trailing-buy/tests/goldenMaster.test.ts`) repeat the repository-default and research cases and add four volatile synthetic walks with forced gaps, for both reference files. Together they exercise every exit path (maximum hold, stop, stop gap, open at end), restrictions, lower-price re-entries, recovery resets and unrestricted losses; all byte-identical.

**Warm versus cold start.** Study runs start on 2014-01-02 with earlier bars available as history ("warm"); the original with a start date sees only the filtered range ("cold"). For B0 and B0c, over both the development and the research window, the two give identical trades and identical net and drawdown to the last bit (the first 2014 signal comes after the 90-session window has filled). The research-window baseline numbers below are therefore the original's own.

## 5. Saved baseline runs

- `results/phase0/baseline/B0_original_2014-01-02_2026-10-14/` and `B0c_original_…/`: the original's own five files (`trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`, `summary.json`) at full precision.
- `results/phase0/baseline/<B0|B0c>_engine_<development|research>/`: the engine's extended files (trades with adverse excursion, the daily curve with cumulative interest).
- `results/phase0/baseline_summaries.json`: window metrics including annual P&L.

| Baseline | Window | Net | Max MTM DD (peak → trough) | DD / $100k allocation | Interest | Entries | Win rate | Time in market | Worst open-trade mark |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| B0 | development 2014–2022 | $78,778 | $23,723 (2018-09-04 → 2018-12-24) | 23.7% | $43,066 | 30 | 45% | 43.7% | −$11,840 |
| B0c | development 2014–2022 | $72,993 | $23,723 (same) | 23.7% | $42,644 | 30 | 41% | 43.2% | −$11,840 |

(Full-window figures appear above in the parity table; per-window holdout breakdowns are reported only after the freeze.) The drawdown is of the $100,000 borrowed trading allocation's P&L, not of an account or portfolio.

## 6. Idealizations kept from the original (documented, not modelled)

- **Same-close fills**: the signal uses the official close and fills at it. Phase 5 adds next-open and pre-close execution.
- **Stop fills at the stop price** when the low reaches it (or at the open on a gap); real stop-market orders can fill lower in fast markets.
- **Interest** accrues through the exit session even for a sale at the open, slightly overstating it; the 11% rate is applied to every year although broker rates varied with policy rates. Actual historical broker rates are not available locally, and FRED could not be reached from this environment (connection reset), so only constant-rate sensitivities are run.
- **Dividends** are only reflected through the back-adjusted prices.
- **Spreads, slippage and commissions** are deliberately out of scope and zero in every model; this is a simplifying assumption, not a claim that execution is frictionless.
- **Daily bars carry no intraday order**: exits use the fixed open-then-session order; the new entry logic is close-to-close and never infers intraday sequence.

## 7. Repository test state

`npm test` (2026-10-17, with this study's files present): 180 tests, 160 pass, 20 fail. All 20 failures are pre-existing and in other studies' suites that pin the one-minute `src/app/allIn.ts`: `src/minute-optimizer/tests/scenarios.test.ts` (12, "Variant pattern not found: /const tickWindowSize = 78;/"), `src/minute-optimizer/tests/goldenMaster.test.ts` (3), `src/intraday-study/tests/engine.test.ts` (3) and `study.test.ts` (2, protected-file hashes). They come from commit `101756b` ("Using sane, safer parameters"), which changed `allIn.ts` constants. This study modifies no tracked file (`git status` shows only its new, untracked files), and none of those suites imports its code. All 45 of this study's tests pass.
