# REPORT — New L0 trading-session re-optimization: VGT + GDX D1 + Growth under NYSE-session maximum holds

Research only, not deployed. **New L0 primary** (Priority 5B `C24/L0/informed/R1#1 profit`): D1·VGT + D1·GDX + VGT Growth
in **one shared $100,000 slot** (one exclusive funded slot, no compounding or preemption, same-instant order D1 → GDX →
VGT, 5 bps per side, 11% simple interest by calendar day, Growth lifecycle L0; Growth·GDX OFF). Its three maximum holds
(D1·VGT 15, D1·GDX 13, Growth·VGT 22) were measured in **calendar days**. This study measures them in **NYSE trading
sessions** and re-optimizes the same combination with the recovered method that produced New L0, at about three times
its effort. **DD** is the maximum minute drawdown of the marked net; % = ÷ the fixed $100,000; the ceiling is $35,000.
Development and every choice: 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30, **previously examined
history, not an untouched holdout** (2016–2026 was examined by Priorities 3–7A and Strategy Lab; New L0's own 2025–2026
result was known). Figures come from sealed records (`results/`); complete tables are in `results/tables/`. No charts
(standard §7.7).

- **A** — New L0, frozen parameters, calendar-day holds (the historical control).
- **B** — New L0, the same parameters and allocator, trading-session holds (no re-optimization).
- **C** — this study's frozen primary: re-optimized under trading-session holds (`C24/ses/informed/R3#1 profit`).

## 1. Bottom line

**Calendar-day holds remain preferable. Trading-session holds make the original phenotype worse, and a faithful
re-optimization with three times the original effort recovers most — but not all — of the loss; the re-optimized
candidate does not beat New L0 on development, validation or full history. New L0 stays the frozen benchmark; nothing
replaces it.**

| | A: New L0, calendar | B: New L0, sessions | C: re-optimized, sessions |
|---|---:|---:|---:|
| Training net 2016–2024 (D24) | **$382,721.46** | $340,857.79 | $373,676.67 |
| Training max minute DD | **$19,459.83** | $23,473.39 | $20,374.21 |
| Confirmation p10 / p90 DD (384 draws) | $201,551.68 / $30,684.44 | $191,186.37 / $37,684.14 (**fails Q3**) | **$203,987.88 / $27,574.23** |
| Validation P&L 2025-01-02 → 2026-10-30 | $96,883.72 | **$97,846.00** | $88,765.28 |
| Reset validation DD | **$20,385.99** | $21,572.15 | $23,972.72 |
| Full history net 2016-01-04 → 2026-10-30 | **$479,605.18** | $438,703.79 | $462,441.95 |
| Full history max minute DD | **$20,385.99** (20.4%) | $23,473.39 (23.5%) | $23,972.72 (24.0%) |

- **The convention itself (B − A):** −$41,863.67 on development. Longer holds kept losing D1·GDX trades open longer
  (every retimed exit was later, none earlier) and, by occupying the one slot longer, displaced four profitable later
  trades (−$62,585.38 on development). In 2025–2026 B was +$962.28 against A — within noise and with a deeper drawdown.
  Under sessions every incumbent fails the neighbourhood tail gate Q3 (New L0, C4, C4-refined, C85, IJ1: confirmation p90
  DD $37,684–$40,267).
- **Re-optimization (C − B):** +$32,818.88 on development, with a much better local tail (p90 DD $27,574.23 against
  $37,684.14). It recovered the session handicap only partly: C − A = −$9,044.79 on development. C's phenotype depends
  on sessions — under calendar days it earns $340,449.39 (phenotype −$42,272.07, interaction +$75,090.95).
- **Validation (reported beside the frozen labels, never relabelling):** C passed V1–V3 but earned $8,118.44 less than A
  in 2025–2026 with a $3,586.73 deeper reset drawdown; B earned $962.28 more than A.
- **Frozen labels** (computed before the validation door opened): **B vs A harmful; C vs A harmful** (development −$9,045
  beyond the $2,500 band, despite a better neighbourhood tail; chronology '0'); **C vs B conditional profit/risk
  trade-off** (development improvement replicated in all 6 informed replicates; no chronological test applies).
- **The procedure** (independent lanes under sessions, C19 → C21 → C23) earned +$25,237.54 over 2020–2024 with a
  $58,866.62 sequential drawdown — **chronologically unsupported**, like the original calendar procedure (−$29,358.01,
  DD $67,214.22).

## 2. What produced New L0, and what was preserved (Phases 1–2)

- **The run.** New L0 is Priority 5B's `C24/L0/informed/R1#1 profit` (cfg `67cfdd9b62d1e16f`, Priority 3 quad
  `a2e385640ca61012`): the L0 arm's informed C24 lane, replicate R1. It is an NSGA-II island child (not one of the 481
  seed designs — regenerated with 5B's code), the lane's best feasible rung-3 centre; its profit refinement start found
  no move gaining ≥ $2,000. It sits 7 genes from its seed, 3B's formal primary `informed-joint#1` ($382,163.79), and
  earns $557.67 more on development — the other informed replicate stopped at that seed itself.
- **Structure verified.** D1·VGT [237,9,73,15,72,42,103,41] + D1·GDX [277,1,61,13,232,25,152,10] + Growth·VGT
  `6b5f909b30cfa516`; **Growth·GDX OFF** (not all four components are enabled). Every enabled book uses a maximum hold.
- **Reproduced** through the unchanged engine before any change (D24): the centre equals 5B's sealed record in all 33
  fields, and 5B's own confirmation (p10 $209,723.47, p90 DD $30,182.14) and selection (robust $227,908.52) statistics
  reproduce to the cent (`recovery/original-recovery.json`). After the validation opened, its full-history figures
  reproduced exactly (validation $96,883.72, reset DD $20,385.99, full $479,605.18).
- **The method is locked in** as reference method **NL0 1.0.0** (`docs/research/methods/NEW_L0_METHOD.md`, sha256
  `9b387bb4…`, registry `docs/research/methods/methods.versions.json`), committed before any engine change or search: the
  executed stage order, every lane schedule, operators, promotion shares, refinement rules, instrument, gates, roles,
  primary rule, folds, validation, seeds, resources, the executed budget per lane (configured vs executed), lineage,
  lessons, and requirements for future reproductions, each labelled verified / reconstructed / new. **Standard 2.1.0**
  (minor; no mandatory rule changed) adds §3.5 (convention changes: A/B/C with the decomposition) and §4.8 (reproducing a
  reference method: pin, stage map, reassignment of omitted stages, proportional scaling, budget equivalence); the
  preflight checks a declared method pin.
- **What the recovery showed about the method** (NL0 §6): New L0's quality came from incumbent-informed search — 3B's
  large informed-joint lane, then 5B's small informed lane — not from independent discovery (5B's best independent V
  pool earned $181,497.86); the original independent procedure was chronologically unsupported; the executed allocation
  was rung-1 66–75% and refinement 15–19% of fresh simulations (5B's protocol had expected ≈ 2/3 refinement from a
  two-pass pilot).

## 3. The trading-session hold (Phase 3)

- **Definition.** A position's hold age is the number of NYSE trading sessions strictly after its entry (hold) session
  up to the current session: the entry session is age 0, the next trading session age 1; weekends and exchange holidays
  (including the 2018-12-05 and 2025-01-09 days of mourning) never count; a genuine session missing from a data file still
  counts (`src/lib/calendar.ts`; both canonical files hold exactly the NYSE sessions of 2016-01-04 → 2026-10-30, checked).
  The maximum hold applies from the first session whose age reaches the limit, with **unchanged conditions**: the loss
  exit at that session's open (sold at the first trade after the opening minute) and, where enabled, the buffered
  intraday loss from that age on. A limit of N sessions is never shorter than N calendar days (15 sessions ≈ 21 calendar
  days; around a holiday weekend more: 2024-11-27 + 15 sessions = 2024-12-19, 22 days).
- **Implementation:** `src/lib/tradingSessions.ts`; `strategy.ts` `holdAge` (D1's exit manager and Growth's plain exit
  path); `optionalRules.ts` (Growth's rule evaluator); `EvalOptions.holdUnit = 'sessions'` through Priority 3's
  `books.ts`/`evaluate.ts`, keyed apart in the archive and the book caches. The default is the calendar rule's identical
  expression; fail-closed on a non-session date. No change to entries, trailing stops, continuation, allocation or costs.
- **Backward compatibility:** 1,500 / 1,500 archived 5B records (D19–D24; V, G, B) identical at the default unit; stage V
  G2 another 1,000; interleaved calendar → session → calendar runs stable; New L0, C4, C4-refined, C85, D, IJ1 and VG #2
  native reproduce 5B to the cent; Strategy Lab's five pooled candidates still verify after the change (43/43 record
  checks each, ledgers pass; `results/post/strategy-lab-parity.json`).
- **Tests:** weekends, holidays incl. mourning days, an entry just before Independence Day (3 calendar days → Monday, 3
  sessions → Tuesday), exact boundaries (age N − 1 does not exit, N does), the loss-at-open condition kept, the buffered
  loss from the hold age, a missing genuine session, a data session on a holiday (fails closed under sessions only),
  default = explicit calendar, both Growth exit evaluators, keys, and an independent day-by-day count over 2016–2026.

## 4. The re-optimization: scope, method and budget (Phase 4)

- **Fixed scope (AD2–AD3):** VGT + GDX, D1·GDX + D1·VGT + Growth·VGT, Growth·GDX OFF; Priority 3's engine, L0, the same
  allocator, priorities, conflict rules, costs and interest. All existing tunable parameters of the three books were
  re-optimized on NL0's unchanged boxes and grids (holds 3–30, now in sessions); no new rule or parameter family.
- **Method preserved (NL0):** stage order (C19 → C21 → C23 folds with commits before each slice, then C24 independent and
  informed lanes, qualification, cross-test, diagnostics, frozen selection, FULL once); Sobol screen with strata;
  promotion shares; NSGA-II islands (population 32, operators, stagnation); 5% extension triggers, caps and resource
  guard; rungs 16 / 64 / 128; one refinement pass (two at focus starts); shortlists; the instrument (selection 2 × 128,
  fresh confirmation 3 × 128); gates Q1–Q6; roles; the actual-profit primary over the final selectable set with the
  incumbents as members (the qualifying-incumbent fallback).
- **Omitted discovery stage and its reassignment (AD3, AD4):** 5B's structure cells V, G and B chose the strategy
  combination; with it fixed, the G and B cells were omitted and their budgets reassigned through their own schedules to
  V sub-cells (V1 = 5B's V schedule, V2 = G's, V3 = B's); both-Growth protections became ordinary shares/islands and the
  both-Growth refinement start became a second profit start. The informed seeds are 5B's V seeds, its B seeds projected
  to V by 5B's own inclusion move, plus **New L0 as a third focus seed** (AD7).
- **Effort, side by side** (`results/tables/budget.md`; original from 5B's sealed records):

| Unit | Original 5B L0 arm (produced New L0) | Original whole 5B study (3 arms) | This study |
|---|---:|---:|---:|
| Distinct proposals (executed) | 49,346 | 148,038 | **132,890** (2.7× the L0 arm) |
| Refinement moves | 11,137 | 32,774 | **31,566** (2.8×) |
| Search evaluations requested | 489,695 | 1,463,415 | **1,459,667** (3.0×) |
| Islands run | 121 | 363 | **302** (2.5×) |
| Refinement starts | 70 | 207 | **222** (3.2×) |
| Qualification evaluations | 64,554 requested | 189,747 unique | 182,925 unique |
| Search unique fresh simulations | — (per job) | 1,464,394 | 1,381,000 |

  Per lane, every count is above the original L0 arm's (e.g. C24 informed: 12,570 proposals vs 4,034; 355,437 requested
  vs 91,030). Effort was scaled by **6 replicates** of 5B's unchanged per-lane schedules (= its 3 arms × 2 replicates),
  so the stage allocation is preserved: rung 1 64–80%, refinement 13–18% of fresh simulations (5B: 66–75%, 15–19%).
  Against the whole three-arm study the search is about equal (99.7% of requested evaluations, 90% of proposals: 5B's
  synchronized extensions added islands across arms). Lanes stopped on their triggers except: some C23/C24 independent
  lanes reached their island caps with a trigger still firing, and **the informed job's extension was stopped by the
  frozen resource guard** (budget-bound, not converged). Total ≈ 1.58 M fresh simulations (searches 1,381,000;
  qualifications 182,925; cross-tests 12,428; validation neighbours 512) + engineering, under the 3,000,000 ceiling;
  wall 3 h 41 min for the chain (03:24:46 → 07:05:17Z).
- **Not re-executed (disclosed):** the upstream lineage of New L0's seed (3B's informed-joint lane, 5.83 M evaluations
  for 3B overall). As in 5B, its outputs (IJ1, C4-refined) enter only as informed seeds — calendar-optimized seeds.

## 5. Results by window (`results/tables/abc.md`)

Training = the D24 run (no position was open at 2024-12-31 in A, B or C, so the windows add exactly). C under calendar
days is a cross row (report-only).

| Metric | A: Baseline | B: Conversion | C: Re-optimized | C under calendar |
|---|---:|---:|---:|---:|
| **Training** net | $382,721.46 | $340,857.79 | $373,676.67 | $340,449.39 |
| gross profit / gross loss | $391,601.38 / −$8,879.94 | $357,902.96 / −$17,045.18 | $385,961.90 / −$12,285.24 | $352,757.40 / −$12,308.03 |
| margin interest / costs | $62,112.35 / $3,622.50 | $59,520.58 / $3,200.26 | $63,619.19 / $3,518.73 | $63,317.81 / $3,601.95 |
| max minute DD | $19,459.83 | $23,473.39 | $20,374.21 | $19,459.83 |
| trades · win rate | 34 · 85.3% | 30 · 86.7% | 33 · 90.9% | 34 · 82.4% |
| average holding: sessions (calendar days) | 41.7 (60.6) | 45.4 (65.8) | 44.1 (64.0) | 42.6 (61.8) |
| capital utilization: sessions with a funded position / principal-days | 64.1% / 62.7% | 61.5% / 60.1% | 65.7% / 64.3% | 65.4% / 64.0% |
| **Validation** net | $96,883.72 | $97,846.00 | $88,765.28 | $90,268.29 |
| gross profit / gross loss | $115,610.58 / −$18,726.87 | $117,013.65 / −$19,167.65 | $111,017.67 / −$22,252.41 | $109,332.93 / −$19,064.66 |
| margin interest / costs | $11,030.14 / $1,206.64 | $10,909.59 / $1,107.07 | $11,813.70 / $1,202.37 | $11,753.42 / $1,303.70 |
| reset max minute DD | $20,385.99 | $21,572.15 | $23,972.72 | $20,385.99 |
| trades (open) · win rate | 12 (1) · 72.7% | 11 (1) · 80.0% | 12 (1) · 63.6% | 13 (1) · 66.7% |
| average holding: sessions (calendar days) | 21.5 (30.5) | 23.5 (32.9) | 23.1 (32.7) | 21.0 (30.0) |
| capital utilization (sessions with a funded position) | 58.8% | 58.6% | 63.0% | 62.3% |
| **Full** net | $479,605.18 | $438,703.79 | $462,441.95 | $430,717.68 |
| margin interest / costs | $73,142.49 / $4,829.14 | $70,430.17 / $4,307.33 | $75,432.89 / $4,721.10 | $75,071.23 / $4,905.65 |
| max minute DD | $20,385.99 (20.4%) | $23,473.39 (23.5%) | $23,972.72 (24.0%) | $20,385.99 (20.4%) |
| trades · win rate | 46 · 82.2% | 41 · 85.0% | 45 · 84.1% | 47 · 78.3% |
| worst lot (MAE of one lot) | −$9,113.94 (−$11,068.95) | −$12,118.02 (−$12,179.09) | −$9,501.16 (−$12,179.09) | −$9,113.94 (−$11,068.95) |

**Annual P&L / within-year maximum minute DD (FULL run):**

| Year | A | B | C |
|---:|---:|---:|---:|
| 2016 | $8,588.21 / $5,658.29 | $8,588.21 / $5,658.29 | $9,620.11 / $5,706.88 |
| 2017 | $23,852.14 / $9,100.67 | $23,852.14 / $9,100.67 | $30,059.85 / $9,146.82 |
| 2018 | $18,525.08 / $10,352.21 | $18,525.08 / $10,352.21 | $18,291.31 / $11,244.47 |
| 2019 | $29,004.74 / $10,633.06 | $29,004.74 / $10,633.06 | $29,023.28 / $13,330.52 |
| 2020 | $138,877.67 / $17,280.74 | $138,877.67 / $17,280.74 | $138,669.32 / $17,280.74 |
| 2021 | $32,525.03 / $12,107.02 | $20,888.98 / $14,090.67 | $31,113.30 / $10,880.37 |
| 2022 | $43,474.42 / $15,243.93 | $47,602.97 / $17,018.18 | $51,044.18 / $14,674.85 |
| 2023 | $43,764.07 / $19,459.83 | $38,057.43 / $23,473.39 | $28,198.64 / $20,374.21 |
| 2024 | $44,110.10 / $9,105.84 | $15,460.57 / $7,938.68 | $37,656.68 / $10,965.26 |
| 2025 | $47,530.51 / $12,324.36 | $47,530.51 / $12,324.36 | $44,958.72 / $13,800.44 |
| 2026 (to 10-30) | $49,353.21 / $20,385.99 | $50,315.49 / $21,572.15 | $43,806.55 / $23,972.72 |

- New L0's holds never bound in 2016–2020 (A = B to the cent); the convention mattered from 2021, most in 2021 and 2024.
- **By component (full history, booked):** A: D1·GDX 31 lots $221,780.72, D1·VGT 7 lots $146,898.43, Growth·VGT 8 lots
  $110,926.02; B: D1·GDX 26 lots $180,682.07 (−$41,098.65), the others unchanged ($147,095.71; $110,926.02); C: D1·GDX 28
  lots $217,135.69, D1·VGT 7 $146,246.79, Growth·VGT 10 $99,059.47. **The effect lives in D1·GDX** — the book whose
  maximum-hold exits fire (A: 7 of its 31 lots).
- **Worst trades:** all five worst lots of A, B and C are D1·GDX maximum-hold exits. The same 2023-02-06 entry lost
  −$6,455.48 (A, out 02-21), −$12,118.02 (B, out 02-24), −$9,501.16 (C, out 02-23).

## 6. Mechanism: which trades moved (`results/tables/abc.md`; `results/diagnostics/`)

- **Extended trades (B vs A, same entry, full history):** 6, all later, none earlier (a session hold is never shorter in
  calendar time): D1·GDX 2022-09-16 (+$4,547.29), 2022-10-10 (−$1,081.23), 2023-02-06 (−$5,662.54), 2026-06-22
  (−$5,603.77), 2026-10-07 (−$4,025.01), D1·VGT 2022-06-13 (−$269.17): −$12,094.43 in all. Extending a losing D1·GDX
  hold mostly let the loss run.
- **Chronology:** B vs A — 25 lots unchanged, 6 retimed exits (−$12,094.43), 10 retimed (+$34,224.67), 5 displaced
  (−$63,031.62); Δ −$40,901.38. The longer occupancy of the one slot changed which later decisions were funded: on
  development 4 profitable lots were displaced (−$62,585.38). C vs A: 16 unchanged, 11 retimed exits, 14 retimed, 4
  newly admitted (+$7,261.63), 5 displaced (−$69,711.46); Δ −$17,163.23 (C's retimed exits also reflect its different
  parameters).
- **Capital-pool conflicts** (refused decisions by occupant, full history): A 33 refusals (D1·GDX refused 23 times —
  11 of them while VGT Growth's first lot held the slot), B 28, C 24. Descriptively (`results/supplementary/missed-opportunities.json`,
  outside the frozen plan, never summed as achievable): the refused trades' own virtual outcomes were −$36,079.38 (A),
  −$14,072.38 (B), −$27,431.78 (C) in training and +$27,542.94 (A, 2 refusals), +$23,246.83 (B, 2), −$2,414.72 (C, 1) in
  2025–2026.
- **How C adapted** (C vs New L0): D1·VGT X 23.7 → 23.4%, stop 7.3 → 7.4%, **hold 15 → 17 sessions**, L 72 → 79, buffer
  4.2 → 4.4%, P 10.3 → 11.3%, W 41 → 57; D1·GDX **hold 13 → 12 sessions**, L 232 → 227, buffer 2.5 → 1.9%, P 15.2 → 14.8%,
  W 10 → 13; Growth·VGT advance 5.6 → 5.7%, lookback 84 → 77, recovery gate dip lookback 64 → 77, dip 11.9 → 12.5%,
  recovery 46.2 → 52.3%, confirmation 5 → 6, trailing stop 5.7 → 6.3%, **hold 22 → 20 sessions**, **initial stop OFF**
  (was ON, ATR 16 × 1.2), **intraday loss buffer ON 3.3%** (was OFF), continuation window 67 → 52, rebound 3.01 → 2.6%. C
  identity: cfg `787c566e42550ed4`, P3 quad `23e1af79d89776d2`, Growth `01ef2d86061fee85`; D1·VGT
  [234,9,74,17,79,44,113,57], D1·GDX [277,1,61,12,227,19,148,13]. The search did not shorten D1·GDX's hold to its
  calendar equivalent (≈ 9 sessions); it re-tuned around 12 sessions and the buffer.

## 7. Robustness, stability and overfitting evidence (`results/tables/robustness.md`, `folds.md`)

| | A | B | C | independent primary |
|---|---:|---:|---:|---:|
| Confirmation median / p10 net | $252,016.25 / $201,551.68 | $236,349.19 / $191,186.37 | $255,710.71 / $203,987.88 | $187,091.51 / $136,490.54 |
| p90 / p95 DD | $30,684.44 / $34,897.47 | $37,684.14 / $40,439.88 | $27,574.23 / $29,514.12 | $34,475.77 / $40,242.29 |
| worst-10% mean / worst DD | $35,456.44 / $49,782.20 | $41,501.50 / $51,932.49 | $31,985.52 / $49,299.70 | $40,593.43 / $58,529.86 |
| draws > $35,000 [Wilson 95%] | 4.7% [3.0%, 7.3%] | 17.2% [13.7%, 21.3%] | 2.1% [1.1%, 4.1%] | 9.6% [7.1%, 13.0%] |
| 20 bps / 14% interest centre net | $368,949.36 / $365,781.73 | $330,883.14 / $324,836.76 | $362,481.57 / $356,679.06 | $228,678.37 / $229,853.30 |

- **Locally, C is the most stable** of the three (best p10, p90, tail), but its 1.5×-radius family breaches $35,000 in
  20.3% of draws (p90 DD $42,428.97); the half-radius family is clean (p90 $24,426.42).
- **Search variability under sessions is larger than in the original:** the six informed replicates' bests span
  $354,129.54 – $373,676.67 ($19,547.13; the original's two replicates differed by $557.67). C beats B in all six, A in
  none.
- **Chronology** (independent procedure, the only chronological evidence): unsupported (+$25,237.54, DD $58,866.62;
  2020–2021 slice +$45,828.28 with a $55,449.12 DD; 2022–2023 −$25,018.62, DD $57,489.79; 2024 +$4,627.88). Every
  role and five of six replicate paths breached $35,000. The informed lane — which produced C, as it produced New L0 —
  has no chronological test (AD9). The same fold selections under calendar days: +$75,529.19, DD $47,761.66 (cross row).
- **One episode dominates:** C's leading winning episode is 2020-03-12 → 2020-09-04 ($120,179.70, 32% of its net);
  99% of its selection neighbours share it, with a median 36% of their net inside it. Local stability measured mostly
  that episode; it is not chronological reliability.
- **Validation neighbourhoods on FULL** (128 draws, report-only): median validation P&L A $83,557.50, B $84,240.22, C
  $82,281.34; p10 A $69,293.56, B $67,709.86, C $62,399.53; whole-run p90 DD A $32,776.45, B $37,584.10, C $31,872.99;
  draws above $35,000 over the whole run A 9, B 25, C 7 of 128.
- **Validation of all exported rows:** 37 of 40 rows pass V1–V3; failures are two independent replicate holders (R2
  under both units, R5 under calendar).

## 8. Selection details (`results/tables/selection-C24.md`)

- Final selectable set: 98 members (58 independent — two V2 shortlists, R3 and R5, filled 2 of 3 slots with distinct feasible ledgers —, 36
  informed, New L0 / C4 / C4-refined / C85 under sessions), 90 qualified. Roles: actual-profit **C** (`informed/R3#1`); robust-profit `informed/R1#2 robust`; balanced `informed/R5#2
  robust`; lower-drawdown `indep/R6/V2#3 balanced`. The independent primary `indep/R3/V3#1 profit` earned $247,744.92 (5B's
  best independent V pool: $181,497.86) — more search helped independent discovery, but it stayed far below the
  informed region, as in 3B and 5B.
- Every incumbent **failed Q3 under sessions** (p90 DD: New L0 $37,684.14, C4 $40,266.61, C4-refined $38,931.86, C85
  $39,649.87, IJ1 $37,684.14), while all qualified under calendar days with the same draws. The qualifying-incumbent
  fallback therefore had no qualified session incumbent; C is a searched configuration.

## 9. Recommendation (brief Phase 7.6)

1. **Calendar-day holding periods remain preferable** for this portfolio. Keep New L0 (A) as the frozen benchmark and the
   calendar unit as the default.
2. **Trading-session holds do not improve the original fixed phenotype** (B): −$41,863.67 on development, a failed
   neighbourhood tail gate, −$40,901.39 on full history; its +$962.28 in 2025–2026 is within noise.
3. **Trading-session re-optimization does not produce a meaningfully better portfolio.** C recovers +$32,818.88 against B
   but trails A by $9,044.79 on development, $8,118.44 in validation and $17,163.23 over full history, with a deeper
   drawdown in 2025–2026 ($23,972.72 vs $20,385.99). Its better local tail is the only point in its favour, and it rests
   on one 2016–2024 history dominated by the 2020 episode.
4. **Credibility across training and validation:** the convention's harm is consistent in training (and visible in the
   2021, 2023 and 2024 slices); validation is examined history and shows no improvement from either B or C; the
   independent procedure is chronologically unsupported under both conventions.
5. **Deployment:** C does not deserve consideration for deployment over New L0. If session-based holds are ever wanted
   for operational reasons, the evidence says to re-tune (C, not B), but to expect slightly lower profit. Further
   holding-period research is not indicated by this result; the one mechanism worth remembering is that in a one-slot pool
   a longer hold on a losing D1·GDX trade costs twice — the larger loss and the displaced next trade.

## 10. Verification, integrity and disclosures

- **Engineering gates (stage V, sealed before the freeze):** 705 checks, 0 failed (G1 calendar reproduction of six
  controls and VG #2 native; G2 1,000 archived 5B records identical; G3 fast = detail; G4 causal prefixes; G5 accounting
  on 540 runs; G6 unit separation; G7 hold-gated exits never before the hold age in either unit; G8 single-component
  identities; G9 keys). Pilot: every stage path; graceful stop, worker SIGKILL and unit SIGKILL resumed to identical lane
  results.
- **Protocol** frozen 2026-11-12T03:24:11Z (`50e441c3…`), amendments R1 (14 workers from the bench) and R2 (pilot-driven
  code: the refinement-start rule extracted and unit-tested, within-year drawdowns), both before the freeze. 27 sealed
  records verify (`npm run vg-l0sh -- verify`). Every fold selection was committed before its slice; `FROZEN_SELECTION.json`
  was committed (`8ae00df8`) before FULL opened; FULL opened once.
- **Tests:** this study's 17 tests, the engine's hold-unit tests and the preflight's 20 tests pass; the full `npm test`
  result is recorded in `RESEARCH_RECOVERY.md`.
- **Disclosures:** (1) the engine change alters Priority 3's evaluation digest (now `781d7e49…`, historically
  `147cad7c…`): completed studies' digest guards fail at HEAD by design and should be checked at their own commits;
  backward compatibility was proven on archived records instead (AD12). (2) Engineering incidents during the pilot (a
  protocol edit made the next pilot stage's preflight refuse, as designed; a pilot script edited while running read one
  harmless fragment) — no study stage was affected. (3) The informed C24 job's extension was stopped by the frozen
  resource guard. (4) The C vs A chronology compares this study's procedure (3× effort) with the original's path.
  (5) The supplementary refused-trade view and the post-validation calendar check are report-only, outside the frozen
  plan.
- **Limitations:** previously examined history; one history dominated by the 2020 episode; local stability is not
  chronological reliability; the informed seeds carry a calendar-optimized lineage (3B's informed-joint search was not
  re-executed under sessions); historical compliance with $35,000 is not a guarantee of future drawdown.

## 11. Reproduce

`RUN_COMMANDS.md` (from the repository root). Sealed stages refuse to rerun; each heavy stage resumes from its job archive
(`.cache/vg-l0-session-hold/jobs/`, local) when relaunched with the same command.

```
npm run research-preflight -- --study research/vg-l0-session-hold
npm run vg-l0sh -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-session-hold/tests/*.test.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 tools/vg-l0-session-hold/tables.ts
```
