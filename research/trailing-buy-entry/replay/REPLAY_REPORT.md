# Independent replay of the trailing-buy entry study

**Result: 25/25 configurations PASS**, every exported file byte-identical.

## Method

- `replay.py` is a standard-library-only Python 3 implementation written from
  `research/trailing-buy-entry/STATE_MACHINE.md` and `src/app/allin-original.ts` only. Nothing under
  `src/trailing-buy/` (the study engine) was read.
- It loads the whole data file (Unix-second session times from `calendar.timegm` of the date), computes
  reference highs over the `L` sessions before `t` and Wilder's ATR from absolute index 0 of the file, and
  trades from the first row on or after `startDate` through the last row on or before `endDate`. Absolute
  index 0 is skipped as in the original (only relevant to the `walk-*` fixtures).
- Each session runs block A (next-open fill), B (flat: episode low, recovery reset first, then
  legacy / arm / trough / trigger / variant B / max-wait) or C (the original's exits, in its order), then D
  (mark to market, peak from $0) and E (the original's restriction resolution). Percent settings are
  `n / 1000`, `K = n / 10`; interest, profit, stop, lower level, reset level and the drawdown signal use the
  same floating-point expression order as `allin-original.ts`.
- Numbers are written with a JavaScript `Number#toString` emulation, so files can be compared byte for byte.
- `compare.py` compares `out/` with `engine/`: trades and setups row by row (dates, reasons, outcomes and
  flags exactly; prices, interest and profit within 1e-9 relative or 1e-6 absolute), summaries within the
  same tolerance (counts exactly). It also records whether each file is byte-identical.
- Reproduce: `python3 -I research/trailing-buy-entry/replay/replay.py && python3 -I research/trailing-buy-entry/replay/compare.py`.

## Results

Counts are engine/replay. Max |Δ| is the largest absolute difference over the numeric fields (prices, interest, profit; summary money fields).

| config | trades | setups | max abs diff trades | max abs diff setups | max abs diff summary | net profit (engine) | max drawdown (engine) | byte-identical | result |
|---|---|---|---|---|---|---|---|---|---|
| B0_close | 30/30 | 0/0 | 0 | 0 | 0 | 78,777.91 | 23,723.07 | yes | PASS |
| B0_nextOpen | 28/28 | 0/0 | 0 | 0 | 0 | 32,890.21 | 31,683.83 | yes | PASS |
| fixedY30_close | 24/24 | 25/25 | 0 | 0 | 0 | 3,742.76 | 41,865.63 | yes | PASS |
| fixedY5_close | 27/27 | 27/27 | 0 | 0 | 0 | 60,140.56 | 44,010.73 | yes | PASS |
| fixedY30_nextOpen | 24/24 | 25/25 | 0 | 0 | 0 | -22,262.76 | 60,880.77 | yes | PASS |
| fixedY30_variantB | 24/24 | 26/26 | 0 | 0 | 0 | -15,485.24 | 45,917.42 | yes | PASS |
| fixedY30_fillHigh | 24/24 | 25/25 | 0 | 0 | 0 | 3,742.76 | 41,865.63 | yes | PASS |
| fixedY30_maxWait10 | 24/24 | 28/28 | 0 | 0 | 0 | -8,889.72 | 46,292.81 | yes | PASS |
| atrSnapshot_K20_N14 | 22/22 | 23/23 | 0 | 0 | 0 | -19,163.51 | 53,952.27 | yes | PASS |
| atrRolling_K15_N10_X12 | 17/17 | 18/18 | 0 | 0 | 0 | -9,631.04 | 48,601.75 | yes | PASS |
| fixedY12_custom | 34/34 | 34/34 | 0 | 0 | 0 | 8,204.12 | 35,799.56 | yes | PASS |
| legacy_custom | 34/34 | 0/0 | 0 | 0 | 0 | 47,197.73 | 29,216.36 | yes | PASS |
| fixedY12_custom_rate14 | 34/34 | 34/34 | 0 | 0 | 0 | -1,650.68 | 39,514.62 | yes | PASS |
| walk-a_fixedY20 | 24/24 | 24/24 | 0 | 0 | 0 | -120,225.60 | 125,445.98 | yes | PASS |
| walk-a_atrSnapshot_K10_N5 | 26/26 | 26/26 | 0 | 0 | 0 | -128,314.94 | 131,225.38 | yes | PASS |
| walk-a_fixedY20_nextOpen_B | 16/16 | 17/17 | 0 | 0 | 0 | -82,408.39 | 87,242.55 | yes | PASS |
| walk-b_fixedY20 | 29/29 | 29/29 | 0 | 0 | 0 | -120,815.15 | 123,652.08 | yes | PASS |
| walk-b_atrSnapshot_K10_N5 | 23/23 | 23/23 | 0 | 0 | 0 | -107,422.82 | 125,373.83 | yes | PASS |
| walk-b_fixedY20_nextOpen_B | 26/26 | 27/27 | 0 | 0 | 0 | -92,134.58 | 94,971.51 | yes | PASS |
| walk-c_fixedY20 | 28/28 | 28/28 | 0 | 0 | 0 | -57,758.47 | 119,482.72 | yes | PASS |
| walk-c_atrSnapshot_K10_N5 | 20/20 | 20/20 | 0 | 0 | 0 | 40,874.03 | 35,537.38 | yes | PASS |
| walk-c_fixedY20_nextOpen_B | 24/24 | 24/24 | 0 | 0 | 0 | -30,010.07 | 93,830.98 | yes | PASS |
| walk-d_fixedY20 | 23/23 | 23/23 | 0 | 0 | 0 | -19,828.40 | 68,248.18 | yes | PASS |
| walk-d_atrSnapshot_K10_N5 | 19/19 | 19/19 | 0 | 0 | 0 | -25,691.32 | 55,595.59 | yes | PASS |
| walk-d_fixedY20_nextOpen_B | 20/20 | 21/21 | 0 | 0 | 0 | -63,278.25 | 110,979.60 | yes | PASS |

## Mismatches

None. No engine-side discrepancy against `STATE_MACHINE.md` or `allin-original.ts` was found in these configurations.

## Spec readings and ambiguities

1. **Max-wait expiry timing** (`STATE_MACHINE.md` B.6: "**max-wait expiry** after *M* sessions
   (`t − armSession ≥ M`). After an expiry, eligibility resumes and a later close can arm a fresh setup.").
   The text does not say whether session `armSession + M` is still evaluated (trough update / trigger) before
   the setup expires, or whether the setup expires at the start of that session.
   *Implemented:* session `t` is evaluated first; an unfilled setup expires at the end of the first session
   with `t − armSession ≥ M` (so the setup gets `M` sessions to fill), and no new setup arms on the expiry
   session ("a later close"). This matches the engine exactly. The alternative reading
   (`replay.py --maxwait-before-eval`) leaves every trade and the summary unchanged in `fixedY30_maxWait10`
   but changes one setup row: the 2022-11-14 setup's recorded trough would be 40.9146 (2022-11-21) instead of
   the engine's 40.5647 (2022-11-29), the close of session `armSession + 10`. So the engine evaluates
   session `armSession + M` before expiring. All three expiry sessions (2018-11-27, 2022-04-27, 2022-11-29)
   had an active 10% signal and neither implementation re-armed on them; both re-armed on the next session,
   so the "no same-session re-arm" reading is exercised and agrees.
2. **Initial stop of a next-open fill** (A: "this session's high and low count as post-entry"). The spec
   does not state the post-entry high before the fill session's own high is applied. *Implemented:*
   `postEntryHigh = stop basis = fill (open) price`, then the fill session's high raises it, as at a close
   fill. Because every bar has `high ≥ open` (checked: no OHLC inconsistencies in any data file), this equals
   `high × (1 − stop)` and cannot change results here.
3. **Frozen reference high for legacy next-open entries.** Legacy mode has no arming session.
   *Implemented:* the reference high of the decision session (the entry signal's), for both `frozenHigh`
   values, consistent with `entryReferenceHigh = recentHigh` in the original.
4. **`frozenHigh: 'fill'`** is the decision session's reference high (B.7: "alternative `fill` = `refHigh`
   of the decision session"), not the next-open fill session's. In `fixedY30_fillHigh` the option is
   exercised once (decision 2022-09-09: activation high 48.5264 vs decision high 47.7709, followed by a
   material-loss exit on 2022-09-26), but that restriction resolved by a lower-price re-entry on 2022-10-03
   before the reset level mattered, so both implementations produce output identical to `fixedY30_close`.
   The option's effect is therefore not independently confirmed by a differing result in this replay set.
5. **Episode low updates.** B.1 extends the episode low on every flat restricted session, while the
   original only does so on signal sessions before the entry test; E then extends it unconditionally. Since
   `min` is idempotent and both use the same close, the reset level at the B.2 test equals the original's.
   *Implemented:* as written in the spec.
6. **`order_invalid_open`** is implemented but never occurs (every open is positive).
