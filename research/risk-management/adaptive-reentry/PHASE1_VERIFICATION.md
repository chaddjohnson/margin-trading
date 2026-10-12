# Phase 1 verification — allIn.ts strategy configurations

Date: 2026-10-12. Scope: the mandatory implementation and verification phase of the adaptive-reentry
research brief. Production changes live in `src/app/allIn.ts` only (plus no other TypeScript files —
no supporting changes were needed). Nothing is committed.

## 1. What changed in `allIn.ts`

1. **Selectable strategies.** A fourth argument selects the configuration:
   - `baseline` — the original rules, code path unchanged (the original logic was not deleted or
     altered; the restriction mechanics are inert when no lower-price option is set).
   - `lower3` (default) — lower-price re-entry (3% below the frozen loss-exit price) **with** the
     recovery reset (close ≥ 95% of the frozen entry reference high). Internally the two mechanisms are
     independent options (`lowerPriceReentry`, `recoveryReset`) bundled into these named, verified
     configurations.
   The state machine is a line-for-line port of the verified research implementation
   (`research/risk-management/lower-price-reentry/strategies.py`), preserving its chronology: entry
   decision at the close before exit processing; restriction armed at the losing exit with the exit's
   actual execution price and the losing trade's entry-signal 90-session reference high (both frozen);
   reset evaluated at every close while restricted and flat, including the exit session itself; reset
   priority over a same-session entry; restriction cleared when a position opens; no entry on an exit
   session; profitable exits leave the strategy unrestricted.
2. **Data selection fixed.** The hardcoded `data/${symbol}/${symbol}-2016-2026.csv` became an explicit
   fifth argument (defaulting to the previous behaviour), so symbol, dataset file and date range are all
   selectable: `npm run app allIn QQQ 1999-03-10 2015-12-31 baseline data/QQQ/QQQ-1999-2015.csv`.
   `'-'` leaves any earlier argument at its default. No data file was altered, combined or interpolated.
3. **Machine-readable outputs.** An optional sixth argument (output directory) writes `trades.csv`,
   `daily.csv`, `states.csv` and `summary.json` at full floating-point precision, used by the regression
   test below. Console output is unchanged (plus state-transition lines when the restriction engages).

## 2. Verification method

`phase1/regression_test.py` runs the TypeScript implementation for **all four datasets × both
strategies** (full files; QQQ 2016–2026 therefore ends at the established 2026-10-07 endpoint,
VGT 2016–2026 at 2026-10-06) and compares against the frozen Python research outputs
(`baseline/results/` for `baseline`, `lower-price-reentry/results/` `B_lower_3pct` for `lower3`):

- per trade: entry/exit session index and date, entry/exit price, exit reason, shares, investment,
  margin interest, net P&L — at full precision (tolerance 10⁻⁶, observed ≤ 6·10⁻¹¹);
- per session: close, borrowed balance, cumulative mark-to-market P&L, derived running peak and
  drawdown, and the drawdown peak/trough dates;
- per state-log row (`lower3`): date, previous/new state, reason kind, frozen loss-exit price and
  reference high, both thresholds, the 10% signal flag, and whether an entry executed — row for row
  against the research state logs (2,025 rows across the four datasets);
- headline figures against the brief's tables (rounded dollars);
- open-position valuation: unrealized P&L and accrued interest of any position still open at the end.

## 3. Results — all eight cases match

| Dataset | Strategy | Net profit | Max daily MTM drawdown | Trades compared | Daily rows | State rows | Max abs diff |
|---|---|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | baseline | $11,602.49 | $73,403.62 | 48 | 2,672 | — | 7e-12 |
| VGT_2005_2015 | lower3 | $26,384.14 | $54,279.20 | 22 | 2,672 | 529 | 7e-12 |
| QQQ_1999_2015 | baseline | −$2,885.66 | $149,561.06 | 109 | 4,231 | — | 6e-11 |
| QQQ_1999_2015 | lower3 | $40,258.24 | $91,468.97 | 70 | 4,231 | 879 | 1e-11 |
| VGT_2016_2026 | baseline | $161,772.50 | $38,323.32 | 45 | 2,512 | — | 3e-11 |
| VGT_2016_2026 | lower3 | $182,094.06 | $28,687.23 | 33 | 2,512 | 337 | 6e-11 |
| QQQ_2016_2026 | baseline | $116,388.45 | $39,236.60 | 36 | 2,513 | — | 3e-11 |
| QQQ_2016_2026 | lower3 | $132,242.46 | $23,564.06 | 28 | 2,513 | 280 | 3e-11 |

- The two mandatory VGT 2016–2026 figures reproduce exactly: baseline **$161,772 / $38,323**, lower3
  **$182,094 / $28,687**, and the lower3 run ends with the open 2026-07-29 position carrying
  **$17,883.58 unrealized** net of $2,079 accrued interest, as required.
- Trade-by-trade agreement holds everywhere (identical dates, prices, reasons, interest, P&L), so this
  is trade-level verification, not a totals match. Detailed per-case output: `phase1/results/comparison.json`.

## 4. Reproducing

```
cd research/risk-management/adaptive-reentry/phase1
<python with pandas+numpy> regression_test.py     # runs node 8 times, compares, exits nonzero on any diff
```

Direct single runs, e.g.:

```
npm run app allIn VGT - - baseline data/VGT/VGT-2016-2026.csv
npm run app allIn VGT - - lower3   data/VGT/VGT-2016-2026.csv /tmp/out
```

## 5. Phase 1 gate

The specified results are reproduced trade for trade; Phase 2 may begin. The verified implementation is
frozen for the duration of Phase 2 (`CHECKSUMS.txt` at this directory's root); production code is not
modified again during Phase 2.
