# Verification — `allIn.ts` vs the frozen Python research implementation

The production strategy (0.5% material-loss trigger + 3% lower-price re-entry + 38% retracement reset)
is exactly the configuration `A2_material_05` + fixed 3% + `C6_retrace_38` of the adaptive-reentry
program. Its Python realization exists in two independent places, both used as references:

1. **The Stage 2 sensitivity grid point `V2_G8_c050_r38`** (cutoff −0.5%, retrace 0.38) in
   `adaptive-reentry/validation/results/stage2/results/` — produced before this implementation
   existed, on the four frozen datasets, with trades, daily series, state logs and episode tables.
2. **`reference_runs.py`** in this directory — the same framework components
   (`material_trigger(0.005)`, framework default 3% level, `retrace_reset(0.38)`, copied verbatim from
   `loss-classification/strategies.py` and `recovery-resets/strategies.py`), run on the four frozen
   datasets and on VGT 2016 through 2025-12-31. Its four full-dataset results equal reference 1 to the
   dollar, and its `lower3` / `material05` / `retrace38` / `g8` runs equal the family results.

`regression_test.py` runs the TypeScript strategy (`node … src/app.ts allIn <symbol> - <end> <file> <out>`)
and compares, at full stored precision (tolerance 10⁻⁶):

- every trade: entry session index, entry/exit dates, entry/exit prices, exit reason, shares,
  investment, margin interest, net P&L (the open position's valuation included);
- every session: close, borrowed balance, cumulative mark-to-market P&L; the derived drawdown path, its
  maximum and its peak/trough dates;
- every state-log row: date, previous/new state, reason kind (losing_exit / loss_not_restricted /
  profitable_exit / normal_entry / lower_price_reentry / recovery_reset / entry_blocked / restricted),
  frozen loss-exit price and reference high, the required (lower) level, close, 10% signal flag and
  entry flag — this covers restriction activation, material-loss exemptions, lower-price re-entries and
  retracement resets session by session;
- every restriction episode: exit date and reason, loss, price return, loss-exit price, losing entry
  price, frozen reference high, episode low, resolution kind and date;
- final realized/unrealized P&L and open-position flag.

## Results — all five cases match

| Case | Net profit | Max daily MTM drawdown | Trades | Daily rows | State rows | Episodes | Max abs diff |
|---|---:|---:|---:|---:|---:|---:|---:|
| VGT 2005–2015 (full file) | $26,599.77 | $50,882.51 | 33 | 2,672 | 283 | 13 | 7.3e-12 |
| QQQ 1999–2015 (full file) | $72,539.44 | $74,332.73 | 83 | 4,231 | 554 | 37 | 9.1e-12 |
| VGT 2016–2026 (to 2026-10-06) | $196,309.67 | $28,687.23 | 38 | 2,512 | 178 | 15 | 2.9e-11 |
| QQQ 2016–2026 (to 2026-10-07) | $138,791.01 | $24,059.98 | 32 | 2,513 | 135 | 11 | 2.9e-11 |
| VGT 2016 → 2025-12-31 | $172,882.66 | $28,687.23 | 34 | 2,321 | 167 | 14 | 2.9e-11 |

220 trades, 14,249 daily rows, 1,317 state rows and 90 restriction episodes compared; zero
discrepancies; differences are floating-point noise at the 10⁻¹¹ level. Trade sequences are
identical, not merely totals. Per-case detail: `results/regression.json`; TypeScript outputs:
`results/ts/<case>/`; Python references: `results/python/`.

The frozen Python implementation was not modified (checksums in
`adaptive-reentry/CHECKSUMS.txt` still verify for `engine.py`, `metrics.py` and `common/*`).

## Reproducing

```
cd research/risk-management/material-retrace-implementation
PY=<the research venv python; see adaptive-reentry/ADAPTIVE_SPEC.md rule 7>
$PY reference_runs.py      # Python references (6 strategies + 4x5 grid, 5 datasets) -> results/python/
$PY regression_test.py     # runs node 5 times, compares, exits nonzero on any difference
```
