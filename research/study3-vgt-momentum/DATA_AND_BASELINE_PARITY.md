# Data, baseline and execution parity

## 1. Data quality (S0 `audit`, `results/records/audit.json`)

- **File.** `data/VGT/data.csv` (canonical Alpaca SIP raw minute bars; local and git-ignored), sha256
  `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09`, read only through the shared loader
  (training partition, access `optimization`) with an explicit end of 2023-12-29. Loaded-bar sha256 (2016-01-04 →
  2023-12-29) `4dc6544d5451ac0f398a9ac49dbc8a77e0ddf0bb816e61b742a39b5335035460`.
- **Sessions.** 2,012 regular sessions (2016: 252, 2017: 251, 2018: 251, 2019: 252, 2020: 253, 2021: 252, 2022: 251,
  2023: 250), New York dates, 15 early closes (13:00), 3 sessions without a closing print (the close is the last
  regular minute's close).
- **Minutes.** 655,270 regular-session bars, 134–390 per session (median 327). VGT trades thinly at the minute level:
  most sessions have minutes with no trade and therefore no bar. Missing minutes are never imputed — a fill waits for
  the next existing trade, a minute rule can only decide on an existing bar, and minute drawdowns are sampled at the
  bars that exist. The M5 missing-bar stress removes a further 1% / 5% of non-first minutes.
- **Corporate actions.** No VGT split falls in 2016–2023 (the 8-for-1 split of 2026-04-21 is outside every window);
  no overnight move exceeds ±40%; the largest overnight gap is −12.0% (2020-03-16).
- **Calendar.** `src/lib/calendar.ts` early-close list; the first decision close 2017-01-03 exists.

## 2. Accounting conventions (identical for candidates and controls)

- **Price-only.** Fixed-slot results book no distributions (the frozen fixed-slot convention). A distribution
  diagnostic for C-AL/C-ALR and the finalists is reported in `STANDALONE_RISK_AND_EXECUTION_STRESS.md`; it never enters
  a decision. VGT's yield (~0.6–1% a year) on the exposure is the size of the omission.
- **Friction.** 5 bps per side on every fill (buy at raw × 1.0005, sell at raw × 0.9995) — the frozen engine's model.
- **Interest.** 11% simple on each lot's principal, calendar days from its entry session's date to its exit session's
  date over 365 (`interestOn`); a same-session round trip pays none.
- **Marks.** Minute and daily marks without exit friction (the frozen `FixedLedger.mark` and `Tracker.updateStrict`);
  window increments and horizon values liquidation-equivalent (exit friction deducted).

## 3. Execution parity with the frozen D1 conventions

| Primitive | Source | Study 3 |
|---|---|---|
| fill after a minute decision | `firstTradeAfterDecision`, `priceAt`, `timeAt` (`src/shared-margin-portfolio/strategy.ts`) | imported unchanged (minute rules E09/E10; delayed fills via `firstTradeFrom`) |
| stop at the open below the level | ExitManager: opening trade | same (gap stop) |
| minute opening through the stop | ExitManager: that minute's open | same |
| minute low through the stop | ExitManager (`stopFill: 'stop'`): the stop level | same |
| closing print below the stop | not a trigger | same (the next open's gap check applies) |
| per-side cost | ShadowBook `buyPrice`/`sellPrice` | same formula |
| interest | `interestOn` | same formula |
| minute drawdown | `Tracker.updateStrict` on fixed-slot marks | the frozen `Tracker`, imported |
| differences (disclosed) | D1 checks stops only from the session after entry and trails from session highs; decisions on completed minutes | Study 3 checks resting stops from the fill bar and trails from closes; daily rules decide at the close and fill at the next opening trade |

## 4. S2 parity (sealed `results/records/parity.json`, PASS; run 2026-10-28 after the protocol freeze, before the code freeze)

- **D1 anchor (read-only context).** VGT `primary` (`config/phenotypes/D1/VGT.json`) run by Study 2's frozen path
  (`loadUniverse(['VGT'], '2023-12-29', ['U'])`, `standaloneRun`) equals Study 2's sealed View-U VGT ledger
  (`research/d1-all61-signal-capital-complementarity/results/signals/signals-2023-12-29.json.gz`) in every compared
  field of all 17 trades (entry/exit times and raw prices, reasons, interest, net) and in the summary: **net $135,359.04,
  minute drawdown $19,534.41, daily drawdown $15,817.01**, 17 trades 2018-12-21 → 2022-12-15, none in 2017 or 2023.
  The D1 window figures used as context in `CHRONOLOGICAL_RESULTS.md` come from the same frozen path with each fold
  boundary.
- **Fast engine = independent reference on market data (fold A development data, ≤ 2019-12-31, redacted).** 840 runs —
  every panel default × OX/CX1/CX2/TPL (incl. X-CS), C-SMA/C-DON/C-TSM × {own exit, TPL}, C-AL, C-ALR (independent
  restatement), Z1 on every family, and 64 seeded random TPL vectors per family — **0 differences** in any trade field,
  daily mark, horizon value or minute drawdown; largest absolute money difference 2.9 × 10⁻¹¹. 751 of the 840 runs
  traded (5,503 lots), so the comparison was not vacuous. Only counts and |Δ| were recorded.
- **Synthetic adversarial paths.** 1,428 runs (six fixtures incl. an early close, missing minutes and a session
  without a closing print, × 17 signals × 14 exits): 0 differences.
- **Doors.** An end of 2024-01-02 is refused before reading; an evaluation before its fold's seal is refused.
- **The fold picks over their windows (after all seals; amendment A2).** Engine = reference for P\*_A–P\*_D on data
  through 2020-12-31, 2021-12-31, 2022-12-30 and 2023-12-29: 0 differences, largest |Δ| 1.5 × 10⁻¹¹
  (`audit/fold-pick-parity.json`).
- **Full-history parity after all seals (S7).** Every finalist and every trading control on 2017-01-03 → 2023-12-29:
  0 differences (`robustness.json` `parityDifferences`, `controlParity`).
- **Default trigger rates on synthetic walks** (before the freeze, `audit/trigger-rates-synthetic.txt`): E09 9.0
  entries/year at 75% exposure; the other families 1.3–4.8 entries/year at 16–44%.
