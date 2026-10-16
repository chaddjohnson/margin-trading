# Baseline audit: the daily allIn strategy

## Which file is the baseline

- The brief names `src/app/allIn-original.ts`. The file is committed and on disk as **`src/app/allin-original.ts`** (lowercase *i*; macOS resolves both spellings). It is the daily strategy, last changed in `b7abde6`, sha256 `42f2b7e7be4ef99e1af6c4fe113dd8da9ed4d329d2fe0564463db80b87f449e2`. It was only read. A test fails if one byte changes.
- `src/app/allIn.ts` is the separate one-minute strategy (different parameters). It was not touched or used.
- This study's working copy is `src/drawdown-entry/engine.ts`: the original's state machine with one change, a pluggable entry decision.

## What the original does (read from the code)

Where this differs from the brief's description, the code wins.

| Item | Code | Brief's description |
|---|---|---|
| Reference high | Highest **intraday high** of the **90 sessions before** today (today excluded); within the loaded/filtered range, so a cold start has a shorter window for 90 sessions. A rolling peak, not an all-time high. | "relevant recent high" |
| Signal | `1 − close / referenceHigh ≥ 10%`, evaluated at the close | ≈ |
| Entry fill | **Same close** as the signal; $100,000 / close shares (fractional), $100,000 borrowed; one position at a time; no entry on a session that had an exit | ≈ |
| Maximum hold | From **15 calendar days** after entry (timestamp difference), sells **at the open** if that sale loses money after interest; re-checked every session | "15 calendar days" ✓ |
| Trailing stop | 8% below the highest high since entry (initialised at the entry close), updated after each session (a session's own high never moves its own stop); **active only if a fill at the stop is profitable after interest**, decided before each open; fills at the stop, or at the open on a gap through it (even at a loss) | ≈ |
| Material-loss threshold | **Price return ≤ −0.5%** (exit price / entry price − 1, interest excluded) | brief says 1.0% |
| Re-entry after a material loss | Close **≤ 97%** of the losing exit's fill price (**3%** lower), plus the 10% signal | brief says 2.0% |
| Recovery reset | Clears the restriction when a flat close ≥ episode low + **38%** × (frozen reference high − episode low); never buys on the reset session | 38% ✓ |
| Interest | Simple, 11% a year, `$100,000 × 0.11 × calendar days / 365`, none on the entry day, charged through the exit session | ≈ |
| Costs | None (no commissions, spread or slippage) | – |
| Mark-to-market | Realized P&L + open position at the close − accrued interest; max drawdown from a running peak starting at $0 | – |
| Prices | As given (Stooq back-adjusted for splits and distributions) | – |

There is **no hard stop at −3%**; the 3% is only the re-entry discount after a material loss. The 1.0% / 2.0% values in the brief match neither this file nor its history; they are not used.

## Data

| Series | File | Coverage used | Notes |
|---|---|---|---|
| VGT | `data/VGT/VGT-2005-2026.csv` | 2005-02-25 → **2026-10-13** | Equal to the repository default `VGT-2016-2026.csv` over its range (2016-10-07 → 2026-10-06) and to the Stooq file through 2026-09-05; one differing row (2026-09-08, the Stooq bulk archive's last, partial day) is taken from the extended file. |
| QQQ, SOXX, IGV, SPY, IWN, VOOG, XLY | `data/stooq/processed/*` | through **2026-09-08** | Audited in `research/multi-asset-optimizer/DATA_AUDIT.md`. Cross-ETF features are missing (NaN, never forward-filled) for VGT sessions after 2026-09-08. |
| VIX | `data/raw/cboe/VIX_History.csv` (CBOE, sha 142da967…, copied from the regime-filters branch) | through 2026-10-15 | Lagged one session: CBOE's close prints after the equity close. |

- Research period: signals from **2014-01-02**; earlier bars are warm-up history only (90-session reference high, 200-session SMA). Development 2014-01-02 → 2022-12-30; holdout 2023-01-03 → 2026-10-13.
- **Data quirk to keep in mind:** on 2015-08-24 the VGT daily low is about 23% below the prior close (the ETF opening dislocation of that morning). It drives the −23% "MAE" of the 2015 episode; it did not trigger any stop (the stop was inactive).

## Reproduction

`node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts drawdownEntry golden` runs the untouched original through its own default export and the study engine with the baseline policy, same-close execution and zero costs, and compares all five output files (`trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`, `summary.json`) by SHA-256. No tolerance is applied. Result in `results/golden_master.json`:

| Case | Data | Closed trades | Net P&L | Identical |
|---|---|---:|---:|---|
| Repository default | `VGT-2016-2026.csv` (2016-10-07 → 2026-10-06) | 38 | $196,310 | ✓ all 5 files |
| VGT full | `VGT-2005-2026.csv` | 74 | $212,114 | ✓ |
| VGT from 2014 (cold start) | 2014-01-02 → 2026-10-13 | 43 | $190,905 | ✓ |
| VGT development | 2014-01-02 → 2022-12-30 | 29 (+1 open) | $72,993 | ✓ |
| VGT 2020 only | 2020 | 5 | $57,597 | ✓ |
| QQQ, SOXX, IWN (Stooq) | from 2014-01-02 | 35 / 59 / 39 | $135,186 / $122,040 / −$20,295 | ✓ |

The automated tests repeat the default and development cases and add four volatile synthetic walks with forced gap-downs (stop-gap and maximum-hold paths, restrictions and resets): all identical.

**Warm versus cold start.** Study runs start on 2014-01-02 with the previous 90 sessions available for the reference high ("warm"); the original run with a start date sees only the filtered range ("cold"). On 2014-01-02 → 2022-12-30 the two give the same trades and the same $72,993 (the first 2014 signal comes after the 90-session window has filled). Full-period warm results are in ENTRY_COMPARISON.md.

**Discrepancies found: none in the reproduction.** The differences are between the brief's description and the code (table above).

## Execution conventions used in this study

- **Research convention (all selection):** the original's same-close signal and fill.
- **Executable sensitivity:** the decision at session t's close becomes a market order filled at t+1's open. No exit is evaluated on the fill session (the stop cannot be active at entry and the maximum hold needs 15 days); that session's high and low after the fill feed the post-entry high/low. Open data quality was checked: in all eight series (VGT and the seven Stooq ETFs) every open and close since mid-2005 lies within its session's high–low range and is positive. Results are reported separately and never blended.
- **Costs** (5 and 10 bp per side) are cash deductions only: shares are bought at the market price and every decision uses market prices, so costs never change which trades happen. **Margin rate** sensitivities: 8% and 14%.
- What would need minute data: whether a pre-close decision using a 3:50 p.m. price reproduces same-close results (studied for the incumbent in `research/vgt-intraday-study/`), and stop fills worse than the stop price in fast markets.

## Account-level margin risk

The repository models a $100,000 borrowed allocation, not an account (no equity, other holdings or maintenance requirement). Margin-call thresholds are therefore **not simulated**. A margin-call simulation would need: account equity and its other holdings over time, the broker's maintenance requirement for VGT (and house surcharges in volatile periods), whether the $100,000 is the only borrowing, and how interest is debited. What is reported instead: financing interest, mark-to-market drawdown of the trading book, the worst open-trade mark, and adverse excursion per entry.
