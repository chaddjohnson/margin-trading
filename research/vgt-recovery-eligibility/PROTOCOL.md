# Protocol: VGT trailing-buy recovery eligibility

Pre-registered on 2026-10-21 before the targeted sweeps and the joint optimization were run. The diagnostic
stages (root cause, lookback/threshold controls, mechanism counterfactuals at predeclared settings) were run
before this file was written and are reported in ROOT_CAUSE.md, LOOKBACK_CONTROLS.md and COUNTERFACTUALS.md;
their one amendment (resets of 60–100% and the flat-only reset policy, added after the 50% reset proved inert)
is recorded in COUNTERFACTUALS.md. Nothing below was changed after a search result was seen; amendments, if
any, are appended at the end with their date and reason.

## 1. Scope and fixed settings

- Instrument and data: VGT only, `data/VGT/VGT-2016-2025-1-minute.csv` (sha256
  `600322af…`), raw Alpaca prices, 2,459 sessions 2016-01-04 → 2025-10-13. No newer minute data exists in the
  repository (the 2026 daily files are split/dividend-adjusted and are not used).
- Architecture under study: `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` (file 4) at the **Set 2**
  phenotype: X 21.6%, Y 0.3%, stop 7.3%, hold 8 calendar days, L 74 sessions, buffer 2.9%. Baseline on the
  file: $150,630 net, $21,183 minute-sampled drawdown, 13 closed trades plus one open (reproduced exactly by
  the research engine, `src/recovery-eligibility/engine.ts`, and asserted by
  `src/recovery-eligibility/tests/equivalence.test.ts`).
- Execution and accounting as the file: $100,000 borrowed per entry, 11% simple annual margin interest by
  calendar day, idealized stop fills at the stop price (`next-open` as a sensitivity), minute-sampled and daily
  mark-to-market drawdowns of the cumulative strategy P&L, open position marked at the last close net of
  accrued interest.
- Common eligibility: every engine evaluation arms from session index 365 (2017-06-15) so that lookbacks up
  to 365 sessions are comparable; Set 2's first trade (2018-12-21) is unaffected. The user's own L runs
  (arming from session L) are reported separately in LOOKBACK_CONTROLS.md.
- Drawdown ceiling: a candidate with a minute-sampled drawdown above **$35,000** on the window it is judged
  on is infeasible, whatever its profit.
- Comparators, unchanged: `src/app/allIn.ts` at its checked-in constants (its own code), the Trades2 phenotype
  of file 4 (X 20.0 / Y 0.5 / stop 7.8 / hold 11 / L 104 / buffer 0.2), and Set 2 itself.

## 2. Mechanisms (engine flags; MECHANISMS.md)

All keep the deep-correction trailing buy intact; each adds one way for a flat strategy to arm without a fresh
X decline from the rolling high. One setup exists at a time; the deep path has precedence on the same minute;
an exit session never arms; everything else (rebound, fills, stops, hold, buffer, interest) is file 4's.

| Key | Mechanism | New parameters (grid) |
|---|---|---|
| `latch` | Correction-episode latch (A at latch depth = X; E at shallower depths). An episode starts at a deep arming with the rolling reference high as its anchor (`anchorPolicy` 0: highest of the episode's deep armings; 1: latest) and tracks its trough from session lows. It ends when a session close recovers `episodeReset` of the anchor-to-trough decline (`resetPolicy` 0: tested at every close; 1: only at closes with no position) or `episodeExpiry` sessions after its last deep arming. While active and flat, a close at or below anchor × (1 − `latchDepth`) arms. | U 0–30.0% (0.1), reset 20–100% (0.1), resetPolicy {0,1}, expiry 20–500 sessions |
| `trough` | Recovery-from-trough (B): same episode; while active and flat, a close at least `troughRecovery` above the episode trough through the previous session (and, if `troughRetrace` > 0, at least that fraction of the decline recovered) arms, once per trough (re-enabled only by a lower trough). | T 1.0–30.0%, F 0–80% (0 unused), reset, resetPolicy, expiry as above |
| `dual` | Dual-mode entry (C): a second arming level `shallowDepth` < X with its own rebound `shallowRebound`; a shallow setup reaching the X level is re-armed as a deep one at that close. Control: the base with X lowered globally. | X2 3.0–25.0%, Y2 0.1–10.0% |
| `postExit` | Post-exit continuation (D): a profitable exit opens a window of `continuationWindow` sessions during which a close at or below the post-exit high (the exit price, then session highs) × (1 − `pullback`) arms; one arming per window; any arming or the window's end closes it. | P 1.0–20.0%, W 5–250 sessions |

Combinations (`latch + postExit`, `trough + postExit`) are searched only in the joint stage and are reported
against both components.

## 3. Stages and budgets

1. **Targeted sweeps** (OPTIMIZATION.md section 2): each mechanism's parameters on a predeclared lattice with
   Set 2's six parameters frozen, on the full common run. Grids: latch U {0, 2.5, …, 20, 21.6, 25} × reset
   {20, 25, …, 100} × resetPolicy {0, 1} × expiry {60, 120, 250, 500}; trough T {1, 2, …, 30} × F {0, 10, 20,
   30, 40} × reset {50, 60, 70, 80, 100} × resetPolicy {0, 1} × expiry {120, 250, 500}; dual X2 {3, 3.5, …,
   25} × Y2 {0.1, 0.3, 0.5, 1, 2, 3, 5, 10}; postExit P {1, 1.5, …, 20} × W {10, 20, 30, 45, 60, 90, 120,
   180, 250}. Sweeps are descriptive (in-sample); they decide which mechanisms go to the joint stage only in
   the sense that a mechanism whose whole sweep is dominated by Set 2 is reported as such.
2. **Joint optimization** per family (base as the control, four single mechanisms, two combinations) and per
   fit: scrambled Sobol 4,096 unique lattice points plus the anchors (Set 2 with the mechanism defaults), then
   NSGA-II (population 128, 60 generations, two seeds) on (maximize net, minimize minute drawdown) with the
   feasibility constraint (drawdown ≤ $35,000, entries ≥ one per training year). Seeds derive from
   `'recovery-eligibility'`, the fit and the family. Every evaluation is checkpointed.
3. **Walk-forward**: fits fold1 (train 2017-06-15 → 2019-12-31, validate 2020–2021), fold2 (→ 2021,
   validate 2022), fold3 (→ 2022, validate 2023) and final (→ 2023-12-29). Validation is the continuous run
   from the eligibility session attributed to the window. 2023 is the inspected problem window and 2024–2025
   was examined by the earlier programs: neither is untouched, and the reports say so.
4. **Selection policies** (per family and fit, from the feasible Pareto front): `maxNet` (highest net),
   `balanced` (highest net with minute drawdown ≤ $25,000), `lowDd` (lowest drawdown with net ≥ 75% of
   `maxNet`'s), and `top10` (the ten highest-net feasible candidates with distinct trade signatures, for a
   median).
5. **Credit rule** for a mechanism family against the base family optimized with the same budget: its
   `balanced` pick's validation net beats the base's in at least 2 of 3 folds, its stitched validation total is
   higher, its worst validation minute drawdown is at most 1.25 × the base's, and the median of its `top10`
   beats the base's median on the stitched total. A family that fails is reported as not credited; its
   full-history frontier is still reported as an in-sample trade-off.
6. **Sensitivity**: every finalist's one-parameter neighbours (the grid probes in `families.ts`); a finalist
   is "wide" if at least 75% of its probes stay within 20% of its net and under the ceiling.
7. **Event exclusion**: for Set 2 and every finalist, the net with each recovery episode's trades removed
   (leave-one-recovery-out), to show how much depends on single episodes.
8. **Runnable files**: one `src/app/allIn-trailingBuy-<mechanism>.ts` per mechanism family retained in the
   final comparison (credited or a useful trade-off within the ceiling), with parity against the engine on the
   file's defaults and 40 random lattice vectors (research view) and the file's defaults on the whole file.

## 4. Reporting

Every candidate in a table is reported with net, minute and daily drawdown, entries, wins/losses, worst trade,
worst losing streak, interest and exposure, and its trades are listed with recovery-episode attribution and the
share of each episode's move captured. Multiple phenotypes per architecture are retained along the frontier;
no single universal winner is declared. Counts of architectures, candidate vectors and evaluations are
recorded in OPTIMIZATION.md.
