# Protocol (pre-registration)

Written and hashed (`PROTOCOL.sha256`) on 2026-10-17, after the Phase 0 parity check and before any trailing-buy result on VGT was computed. Changes after that are dated amendments at the end; the original text is never edited.

## 1. Question and objectives

Does replacing the original immediate 10%-drawdown entry with **arm at X → trail the lowest close → buy after a rebound** (fixed `Y%` or `K × ATR(N)`) improve the daily VGT margin strategy, with the original exit and re-entry mechanisms unchanged?

Two co-primary objectives, never merged into one weighted score: **net P&L** after margin interest (open position marked at the close), and **maximum drawdown** of the daily mark-to-market P&L in dollars. Drawdown is also shown as a fraction of the $100,000 borrowed allocation; it is not an account, portfolio or equity drawdown.

## 2. Baseline and controls

- **B0 (primary baseline):** the logic of `src/app/allin-original.ts` with the brief's settings: L = 90 sessions, X = 10.0%, immediate same-close entry, $100,000 borrowed, 11% simple interest, 8.0% trailing stop (active only when profitable at the stop after interest), 15-calendar-day loss exit at the open, material loss 1.0% (price), lower re-entry 2.0% below the loss exit, recovery reset 38.0%.
- **B0c (control):** the checked-in file's own settings, identical except material loss 0.5% and lower re-entry 3.0%.
- Parity: the study engine in legacy mode reproduces the untouched original (B0c) and a generated literal copy with only the two constants changed (B0) byte for byte on every output file. Done in Phase 0 before this protocol was hashed.
- Spreads, slippage and commissions are out of scope and set to zero, as in the original.

## 3. Data

- `data/trailing-buy-entry/VGT-daily-2005-02-25_2026-10-14.csv`: `data/VGT/VGT-2005-2026.csv` (sha256 `3aaf182b…`) plus the single later session (2026-10-14) from `data/VGT/VGT-2026.csv` (sha256 `734409cf…`); the 94 shared rows are identical. Stooq back-adjusted daily OHLCV (splits and distributions); see BASELINE_AUDIT.md.
- Research universe: signals and trading from **2014-01-02**; earlier bars are history only (reference highs, ATR warm-up). Pre-2014 data is not used for any selection.
- **Development:** 2014-01-02 → 2022-12-30. **Holdout:** 2023-01-03 → 2026-10-14, the latest tail.
- Development phases load the bars truncated at 2022-12-30, so holdout prices are not in memory. Only the holdout command loads the full series, and only after `results/freeze/freeze.json` exists.

**Known contamination of the holdout** (stated now, before any result): a prior study on this repository (`research/vgt-drawdown-entry-risk`) already evaluated entry-timing rules on the same daily strategy over 2023–2026, including a rebound-confirmation rule; the multi-asset optimizer used 2024+ as its holdout; and the 2025 and 2026 sell-offs are public events the researcher knows about. The holdout is untouched by this study's selection, not untouched by the world.

## 4. Folds

Anchored (expanding) walk-forward; every training window starts 2014-01-02.

| Fold | Training | Validation |
|---|---|---|
| WF1 | 2014-01-02 → 2017-12-29 | 2018-01-02 → 2019-12-31 |
| WF2 | 2014-01-02 → 2019-12-31 | 2020-01-02 → 2021-12-31 |
| WF3 | 2014-01-02 → 2021-12-31 | 2022-01-03 → 2022-12-30 |
| FINAL | 2014-01-02 → 2022-12-30 | holdout 2023-01-03 → 2026-10-14 |

By the fixed episode definition of §10, the development period has 11 activation episodes (2 before 2018) and the holdout 9. WF1 trains on 2 episodes, so its fit is expected to be poor; that is part of what the walk-forward measures.

**Window accounting (primary): continuous attribution.** A candidate runs continuously from 2014-01-02 to the end of the window being scored; the window's P&L is the change in mark-to-market P&L across it, its drawdown is measured from a running peak that starts at the window's opening value, and trades crossing a boundary are attributed by what they earned inside the window. Training runs stop at the training end (open positions marked there). **Secondary: flat start**, a fresh run from the window's first session with history-only indicators; reported, and flagged where it changes a conclusion.

## 5. Execution models

1. **Close (idealized, research convention):** fill at the signal close, as the original. Optimistic: the signal uses the official close.
2. **Next open (executable):** the decision at the close fills at the next session's open; no exit is evaluated on the fill session; its high and low are post-entry. The restricted-fill variant B checks the decision close.
3. **Pre-close (separate model, VGT minute data 2016-01-04 → 2025-10-13 only):** the entry decision and fill use the last trade before 15:55 New York time (the close of the minute bar starting 15:54; 12:54 on 1 p.m. early-close days; the latest earlier bar if that minute has no trade) instead of the official close, against the state as of the previous close (trough, reference high, restriction); the official close then updates the trailing state but never buys. The minute file is raw (unadjusted) while the daily series is back-adjusted, so the pre-close price is multiplied by the **previous** session's ratio of adjusted daily close to the minute file's official close (no same-day information). Runs start flat on 2016-01-04 and are compared with close and next-open runs over the same window. Reported only for its coverage window; never inferred from daily bars.

All selection uses model 1. Models 2–3 are applied to frozen candidates.

## 6. Phases and grids

All grids are full (every grid point evaluated), so "refinement around stable regions" is the full 0.1-pp grid rather than an adaptive search. Exits and re-entry stay at B0 in Phases 1–3.

- **Phase 1:** X = 10.0%, Y = 0.5% … 8.0% in 0.1-pp steps (the 0.5-pp points are the initial sweep), plus legacy (immediate) as the control. Sensitivities on development: restricted-fill variant B; frozen reference high `fill`; B0c exits; optional max-wait expiry M ∈ {10, 20, 40} sessions (an optional new rule, never adopted silently).
- **Phase 2:** X = 7.0% … 20.0% × Y = 0.5% … 8.0% (0.1 pp; 9,956 points), and legacy X = 7.0% … 20.0% (131 points) as the fair immediate-entry comparator. Activation depth (X = 10/15/20%) is analysed by episode speed (§10); no speed filter is added.
- **Phase 3:** ATR snapshot (primary) and ATR rolling (robustness): N ∈ {5, 10, 14, 20, 30}, K = 0.5 … 4.0 (0.1), X = 7.0% … 20.0% (0.1 pp). Effective rebound `K × ATR / trough` is reported by regime.
- **Phase 4:** separate Sobol + NSGA-II optimization per family over every strategy-controlled number:

  | Parameter | Domain |
  |---|---|
  | L | 45–180 sessions |
  | X | 7.0%–20.0% |
  | Y (fixed family) | 0.5%–8.0% |
  | K (ATR family) | 0.5–4.0 |
  | N (ATR family) | 5–30 sessions |
  | Trailing stop | 4.0%–12.0% |
  | Loss exit age | 5–30 calendar days |
  | Material loss | 0.5%–3.0% |
  | Lower re-entry | 0.5%–6.0% |
  | Recovery retrace | 20.0%–70.0% |

  Percentages and K on 0.1 grids, integers otherwise; B0 and B0c are on every grid. Not optimized: the $100,000 notional, the 11% rate, dates, costs. The ATR family is the snapshot model; it enters Phase 4 only if it passes §8.

## 7. Objectives, constraint and selection rule

- NSGA-II objectives: minimize `−net / $100,000` and `drawdown / $100,000` on the training window.
- **Minimum activity** (constraint): entries ≥ ceil(calendar years of the window) (4 for WF1, 9 for FINAL). Infeasible candidates never win; sparse candidates are reported.
- **Robust statistics.** For each candidate, its neighbourhood is itself plus: in grids (Phases 1–3) every grid point within ±3 steps on each swept dimension (±0.3 pp, ±0.3 K; N: the adjacent listed periods); in Phase 4 the one-step neighbours, each parameter moved by its radius to each side (percentages and K ±3 steps, L ±5, loss-exit age ±2, N ±2). Robust net = 25th percentile of net; robust drawdown = 75th percentile of drawdown.
- **Picks** on the robust Pareto front (robust net ↑, robust drawdown ↓), with the baseline = B0 on the same training window:
  - **profit:** highest robust net;
  - **balanced:** highest robust net with robust drawdown ≤ B0's drawdown (fallback: lowest robust drawdown);
  - **lowDD:** lowest robust drawdown with robust net ≥ 75% of B0's net (fallback: highest robust net).
- Phase 4 pool: the first non-dominated fronts of the feasible (and net > 0) archive, at least 64 and at most 256 candidates, front by front. Shortlist: up to 10 distinct front members (behavioural duplicates removed) including the picks.
- **Search budget, identical for every family and fold:** 4,096 unique quantized scrambled-Sobol candidates, plus anchors (legacy: B0, B0c; fixed: B0 exits with X = 10%, Y = 3%; ATR: B0 exits with X = 10%, K = 2.0, N = 14), then 2 independent NSGA-II runs × 100 generations × population 128 (SBX η = 15, p = 0.9; polynomial mutation η = 20, p = 1/dimensions), no early stopping. Duplicates are simulated once (cache keyed by dataset, fold, run options and the full parameter vector). Diagnostic: an equal-budget seeded uniform-random initial sample on the FINAL fold. Seeds derive from `trailing-buy-entry|v1|<family>|<fold>|<sampler>`.

## 8. ATR continuation criterion (Phase 3 → Phase 4)

The ATR snapshot family continues only if, for at least 2 of the 3 picks, its walk-forward validation (sum of net over WF1–3, worst window drawdown) beats the same pick of the fixed-percent joint X/Y grid (Phase 2) by the dominance-with-margin test of §9 (Dominant class). Otherwise the simpler fixed-percent model is retained and the ATR family is not optimized in Phase 4.

## 9. Acceptance standard

Compare candidate C with B0 on the same window and execution model. C is **Dominant** if (net ≥ B0 net + $5,000 and DD ≤ B0 DD) or (DD ≤ 0.90 × B0 DD and net ≥ B0 net). C is a **Risk trade-off** if DD ≤ 0.85 × B0 DD and net ≥ 0.90 × B0 net.

A candidate earns a recommendation only if it is Dominant or a Risk trade-off on **all** of:

1. walk-forward validation aggregate (its fold-by-fold picks under the same rule: sum of net over WF1–3, worst window drawdown), close execution;
2. the holdout, close execution;
3. 1 and 2 under next-open execution, each against B0 under next-open;
4. 1 and 2 at 8% and 14% margin rates (B0 at the same rate);
5. parameter robustness on development: the median net and median drawdown of its one-at-a-time perturbations (§10) still pass the Risk trade-off test against B0.

Each result is also compared with the same-rule **optimized legacy** pick; a trailing-entry candidate that fails to beat it is credited to re-optimization, not to the trailing mechanism. If no candidate passes, the recommendation is to keep the original (or optimized legacy) entry, stated as such.

## 10. Robustness and attribution (Phase 6)

- **Episodes (analysis only, never a trading signal).** An episode starts at the first close ≥ 10% below the highest high of the previous 90 sessions (when not already in an episode); its reference high is frozen there; it ends at the first close ≥ 95% of that reference high, or at the end of the data. Depth = 1 − lowest close / reference high; descent = sessions from the reference-high session to the lowest close; **fast** if descent ≤ 25 sessions, else gradual; depth classes 10–15%, 15–20%, 20–25%, ≥ 25%; **V-shaped** if it ends within 40 sessions of its trough; **failed rallies** = rebounds of ≥ 3% above the running lowest close that are followed by a new lower close before the trough.
- **Attribution blocks:** block *k* runs from episode *k*'s start to the session before episode *k*+1's start (the last to the window end). Per-block P&L difference C − B0 from continuous runs. **Event-level bootstrap:** 10,000 resamples of blocks with replacement (seed `trailing-buy-entry|bootstrap|<window>`), reporting the mean difference's 90% interval and P(sum > 0). Adjacent days are never treated as independent.
- **Named events:** 2018 Q4 (2018-10-01 → 2019-04-30), 2020 (2020-02-19 → 2020-06-30), 2022 (2022-01-03 → 2022-12-30), early 2025 (2025-02-18 → 2025-06-30), 2026 (2026-01-20 → 2026-05-29 and 2026-06-01 → 2026-10-14). Holdout events are examined only after the freeze.
- **Perturbations:** one parameter at a time — percentages and K ±1, ±3, ±5 steps (±0.1/0.3/0.5 pp); L ±2, ±5, ±10; loss-exit age ±1, ±2, ±3; N ±1, ±2, ±4.
- **Start dates:** the first session of each month from 2014-01 to 2015-12 (development); of each month in 2023 (holdout, flat start).
- **Margin rates:** 8%, 9.5%, 11%, 12.5%, 14%. Actual historical broker rates are not available locally and FRED could not be reached; no historical-rate series is fabricated.
- **Data quality:** 2015-08-24's dislocated low (≈ 23% below the prior close) replaced by min(open, close).
- **Cross-asset sanity check:** QQQ, VOOG, SOXX, IGV, XLY, IWN (Stooq, 2014-01-02 → 2026-09-04; the archive's partial 2026-09-08 row is dropped), frozen VGT candidates vs B0 with no re-optimization.

## 11. Freeze and holdout

After Phase 4 (and the development-only parts of Phases 5–6), `results/freeze/freeze.json` records every frozen candidate (each phase's FINAL-fold picks, the Phase 4 shortlists, B0, B0c), the protocol hash, the code hash and the data hash. The holdout command refuses to run without it, records each run, and refuses a second run unless given a written reason. Nothing is re-selected after the holdout.

## Amendments

**Amendment 1 (2026-10-17, after Phase 4, before the freeze and before any holdout result).** The robust Pareto fronts of the FINAL fold are small (legacy 1, fixed 4, ATR 1 members), so the §7 shortlist cannot reach the brief's 5–10 candidates per family. For reporting and for the freeze only, each family's FINAL shortlist is extended to 10 by taking the Phase 4 pool members in robust-front rank order (rank 0, 1, 2, … on robust net ↑ / robust drawdown ↓), within a rank by robust net, skipping behavioural duplicates (identical training net, drawdown and entry count). The three picks are unchanged. Extended-shortlist members have no walk-forward counterpart (each fold selects its own), so they cannot satisfy §9 criterion 1 and are reported as decision-relevant alternatives, not as recommendable candidates.

**Amendment 2 (2026-10-17, after a first freeze, before any holdout result).** A first freeze was written at 2026-10-16T22:35:16Z. Building its extended shortlists showed that the Phase 4 pools of the legacy and ATR families were degenerate: all 256 members of each were **behavioural clones** with an identical training trade list (NSGA-II converges on clusters of genomes that differ only in parameters that never bind, and every exact duplicate shares Pareto front 0, so the cap of 256 was filled by one strategy). The §7 pool rule ("the first non-dominated fronts … at least 64 and at most 256 candidates") was therefore implemented in a way that defeated its own purpose, and the robust selection saw a single distinct strategy. Correction: a candidate whose training trade list (entry/exit sessions and prices) equals one already in the pool is skipped, so the pool holds at least 64 *distinct* strategies, front by front. Nothing else changes (objectives, budgets, seeds, neighbourhoods, picks rule). Phase 4 and the development battery were re-run; the first freeze is kept unchanged in `results/freeze/superseded/`, and the as-run Phase 4 and validation results in `results/as-run-before-amendment-2/`. The holdout had not been run when this was found; both versions of the walk-forward results are reported in PHASE4_OPTIMIZATION.md.

**Amendment 3 (2026-10-17, after the holdout; clarifications only, no rule or result changes).** The independent replay (`replay/REPLAY_REPORT.md`) noted points that STATE_MACHINE.md leaves implicit; the engine's reading, which the replay matched byte for byte, is recorded here (STATE_MACHINE.md itself is left as hashed): (1) max-wait expiry is tested after that session's trough update and trigger test, so a setup can still fill or record a new trough on its expiry session, and nothing new arms on that session; (2) a next-open fill starts its stop from the fill price before that session's high raises it; (3) a legacy next-open entry freezes the decision session's reference high; (4) the episode low is extended on every flat restricted session (the original does so only on signal sessions and again at the session end; the reset levels are identical).

**Amendment 4 (2026-10-17, after the holdout; disclosures from the independent lookahead review, `LOOKAHEAD_REVIEW.md`; no rule or result changes).** (a) Phase 0 ran before this protocol was hashed and loaded the full series to reproduce the original on its whole file and research window (the brief requires that parity). Its outputs contain B0's full-window figures, from which B0's holdout result follows by subtraction. No selection code reads them and B0 is never selected, but §3's statement that only the holdout command loads the full series is true only from Phase 1 on. (b) The §8 gate admitted the ATR family on walk-forward *validation* results, so those windows are not fully out of sample for the ATR family's later C1 test; the holdout is unaffected, and every ATR candidate fails both C1 and C2 regardless. (c) After the single holdout attempt, `charts.ts`, `events.ts`, `cli.ts` and `holdout.ts` (chart drawing moved out) were edited and the development pipeline was re-run to redraw charts. Every non-chart result file was verified byte-identical, the reviewer re-derived the frozen candidates and shortlists from the files on disk with 0 differences, and the freeze's code hash records the code as it was when frozen.
