# Limit-on-Close (LOC) execution feasibility — scripts and outputs

Isolated study of whether the production entry rule of `src/app/allIn.ts` (buy $100,000 at the close when
the close is at or below 90% of the previous 90 sessions' high, with the material-loss / 3% lower-price /
38% retracement re-entry state machine) could be executed with a buy Limit-on-Close order whose limit is
computed before the close. The report is `../LOC_FEASIBILITY.md`. Nothing outside this directory (and that
report) was modified; production code and the frozen research directories are read only.

## Scripts

- `loc_simulation.py` — self-contained re-implementation of the production loop (entries, exits, interest,
  mark-to-market, drawdown, restriction state machine) with the entry step replaced by an LOC model that is
  switched on piecewise. Variants: `ideal` (reference reproduction), `loc_frac` (LOC fill rule with the
  knowable limit, fractional shares), `loc_whole` (shares = floor(100000 / limit)), `loc_whole_b` (plus
  boundary fills within 0.05% of the limit treated as missed), `loc_whole_c` (illustrative
  floor(100000 / close) sizing), `loc_nocap` (limit without the reset-level cap). Verifies `ideal` against
  `../results/python/trades/<dataset>__new.csv` and `../results/ts/<case>/trades.csv` trade for trade.
- `conflict_quantification.py` — reads the production `../results/ts/<case>/states.csv` files and the price
  files and quantifies the same-session conflict between the knowable entry limit and the retracement reset
  (question 6 of the report).

Run both with a Python that has pandas and numpy (`from __future__ import annotations` keeps them
compatible with Python < 3.10):

```
python loc_simulation.py
python conflict_quantification.py
```

## Outputs (`results/`)

- `summary.csv`, `summary.json` — net, drawdown, interest, invested dollars and entry counts per dataset and
  variant, with deltas against `ideal`.
- `verification.json` — trade-for-trade reproduction checks (all identical).
- `<dataset>__<variant>__trades.csv` — trade lists; `<dataset>__<variant>__orders.csv` — one row per session
  on which an LOC would have been submitted (flat at the session start): limit, raw entry level, knowable reset
  level, whether the cap binds, close, fill flag, boundary-miss flag.
- `entry_differences.csv` — every entry whose eligibility differs from `ideal` in any variant.
- `whole_share_sizing.csv`, `sizing_stats.json` — per-entry investment under floor(100000/limit) and
  floor(100000/close), split into the limit-to-close gap and the whole-share rounding component.
- `conflict_sessions.csv`, `conflict_summary.json` — per restricted session: entry level, knowable reset
  level, cap-binding flag, conflict-band flag.
- `submission_stats.json` — LOC submissions per year, fill rates, entry size relative to the day's volume.

Prices are the adjusted prices of the data files; whole-share effects are in adjusted price units (see the
report for the real-price bound). No intraday or auction data was used or downloaded.
