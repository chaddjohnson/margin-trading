# Phase B — proposal for full joint optimization (NOT executed; needs your approval)

**Phase A stops here.** Nothing below has been run:

- no NSGA-II and no other joint search;
- no post-2024 strategy computation;
- no claim that any pool passes Study 8's 384-point gate after optimization.

This document is the concrete plan the user can approve, change or stop.

## 1. What Phase A found (the evidence this plan rests on)

**One strong economy.** The KRE + GDX core of the G family: with **generic** vectors, KRE+GDX+ILF+MTUM earns
**$25.9k/yr** robust profit on Study 8's 384-point instrument. That is about the level of Study 8's *optimized* VG #2
($26.8k/yr) and VG #1 ($29.4k/yr) on the same training window. Its weak points:

- the share sits at the 90% edge (90.9%, Wilson bound 88.2%);
- p90 DD $31.6k;
- a thin book (ILF).

**Several safe, modest pools.** Five nominations in N2, N3 and V3: SMH+XHB, EDV+XHB, IWM+SMH, VGT+IWM+XLF and
EDV+IWM+XLF. Each earns $8–10k/yr robust with generic vectors at 92–98% shares.

**A negative family.** VG: no pool of size 2–5 is feasible with generic vectors.

**Weak predictive power of generic screens.** Across Study 8's six sets, optimization lifted robust profit
×1.45–×5, and the generic-to-optimized rank correlation was only about 0.26. Generic screens are a weak guide to
optimized rank, so Phase B, not Phase A, decides.

## 2. Candidate batches

All are drawn only from the frozen nominations. The predeclared rules give **three pools per batch**: the
near-identical rule (≥ 2 members differing) removes the rest.

| Option | Pools (dimension D = 8 × books) | Rationale |
|---|---|---|
| **A, profit-first** (the frozen recommended batch) | KRE+GDX+ILF+MTUM (32D) · EDV+IWM+XLF (24D) · SMH+XHB (16D) | the best of each nominating family by decisive robust profit, then the next by profit. V's best, VGT+IWM+XLF, was skipped by the near-identical rule: it differs by one member from EDV+IWM+XLF. A turns on a $1.07/yr tie between EDV+IWM+XLF ($10,030.88) and SMH+XHB ($10,029.81); option C is unaffected |
| **B, diversity-first** (the frozen alternate) | KRE+GDX+ILF+MTUM (32D) · VGT+IWM+XLF (24D) · EDV+XHB (16D) | adds a V-family pool and a second N2 economy; differs from A by 2 pools |
| **C, union of A and B** (recommended; within ≤ 8) | the 5 distinct pools above | covers G, V and N; spends little; tests both the strong economy and the safe-modest ones |
| **D = C + one G-family reserve** (optional) | C + KRE+EWW+GDX+MTUM (32D) | queue #1 ($27.2k/yr, 90%). It failed I1 only because MTUM adds $383 < $1,000/yr with generic vectors; a sensitivity test of whether joint optimization makes the fourth book pay |

**Missing family: VG.**

- **The reason:** with generic vectors, every VG pool exceeds the $35k risk ceiling before it adds median profit.
  That is a Phase A *negative*, not a claim about optimized VG (Study 8's optimized VG #1/#2 are among the strongest
  known configurations).
- **The cost of re-optimizing it:** {VGT, GDX} is a Study 8 track set and would repeat Study 8.
- **The alternative:** if you want a VG-family Phase B candidate anyway, the strongest VG pools of the queue are
  VGT+EWW+GDX+IYT+XLF ($18.4k/yr, 77%) and VGT+GDX+XHB ($14.4k/yr, 72%). They fail C2 with generic vectors.

**Reserve list** (not proposed unless you add them). The G-family queue:

- KRE+EWW+GDX+ILF+MTUM $25.5k;
- KRE+GDX+ILF+MTUM+SMH $25.5k;
- KRE+EWW+GDX+IWM+MTUM $24.1k;
- KRE+GDX+MTUM $19.7k.

Other families:

- N3 SMH+XHB+XLF $10.2k (95%, feasible, not complementary);
- V4 VGT+IJH+IWM+XLF $9.5k (93%, feasible, not complementary).

## 3. Method: Study 8 unchanged, fresh per-pool optimization from scratch

**The instrument (verbatim from Study 8 `PROTOCOL.md` §5–§8):**

- the four objectives, C1–C7, robust profit;
- the radius, box and grid;
- the multi-fidelity schedule with s(d) = max(1, d/16);
- 4 islands, extended to 8 under T1;
- rungs at 16 / 64 / 128 points;
- refinement;
- shortlists of ≤ 6;
- the roles profit / robust / balanced / extra;
- qualification Q1–Q8, E1–E3;
- the T1–T7 test gates;
- the CSCV/PBO, the count-matched and full-dimensional diagnostics;
- the stresses (10 bps, 14%, next-open, +25 bps);
- the expanding-window folds F19, F20, F21, F23 and F24.

**No fitness change** is proposed (a fitness change would need a separate report and your explicit decision).

**From scratch:**

- No Study 5–8 phenotype, incumbent, or Phase A vector seeds any search. Study 8's own per-book standalone screens of
  each fold's training window propose the starting points, as in Study 8.
- The incumbents (VG #2 balanced, VG #1, B1, B5 and the subsets) are immutable controls on the same doors.

**Seeds:** `deriveSeed('study9-phase-b', …)` with Study 8's label structure (`screen`, `combos`, `lhs`, `ga`,
`r1`–`r3`, `select`, `confirm`, `test`). A separate namespace from Study 8 and Phase A.

**Deterministic restart:** per-job persistent caches, the watchdog, resume giving identical output, crash disclosure
(Study 8 §7.3). A test stage reruns once, labelled.

## 4. Compute estimate (from this machine)

**The basis:**

- Study 8's measured CPU-hours per track (all 5 folds): VG 4.6, VXR 8.4, VXRG 16.8, VXRKG 21.3; 55.4 CPU-hours for 30
  jobs;
- scaled by the per-neighbour cost measured in Phase A's pilot on the same machine and data.

| Dimension | Study 8 cost per fresh neighbour | Phase A pilot cost per fresh neighbour |
|---|---:|---:|
| 16D | 12.1 ms | 12.5 ms |
| 24D | 18.1 ms | 14.9 ms |
| 32D | 25.3 ms | 22.8 ms |
| 40D | 30.9 ms | 33.2 ms |

| Pool size (D) | Search, 5 folds | + qualification and tests (≈ +25%) | Critical-path job (F24, under contention) |
|---|---:|---:|---:|
| 2 books (16D) | ≈ 4.8 CPU-h | ≈ 6 CPU-h | ≈ 1.5 h |
| 3 books (24D) | ≈ 6.9 CPU-h | ≈ 9 CPU-h | ≈ 2.5 h |
| 4 books (32D) | ≈ 15.1 CPU-h | ≈ 19 CPU-h | ≈ 4.5 h |
| 5 books (40D) | ≈ 22.8 CPU-h | ≈ 29 CPU-h | ≈ 5.5 h |

| Option | Search + qualification + tests | Wall time (12 parallel jobs, 8 physical cores, 59 GB) |
|---|---:|---:|
| A | ≈ 34 CPU-h | ≈ 5–6 h |
| B | ≈ 34 CPU-h | ≈ 5–6 h |
| **C (5 pools)** | **≈ 49 CPU-h** | **≈ 6–7 h** |
| D (6 pools) | ≈ 68 CPU-h | ≈ 7–9 h |

T1 extensions could add up to about 1.7× in the worst case, as in Study 8. Pools with more active books (ILF, KRE)
run slower per neighbour than the pilot average; the estimate is ± 30%.

**Memory:** about 4 GB per job. The data door holds only the pool's books.

## 5. Data doors and chronology (predefined, no post-test tuning)

| Window | Use |
|---|---|
| 2016-01-04 → 2024-12-31 (folds F19/F20/F21/F23 end earlier) | optimization, qualification, selection: training only |
| **2025-01-02 → 2026-10-29** | **exposed** retrospective one-time evaluation (T1–T7), block-only, opened only after selection and audit are sealed; previously inspected market history, not a holdout |
| **2026-10-30** (one session) | a separate later slice, reported apart. It is elapsed history: not prospective, and not meaningfully informative alone |
| sessions after the Phase B freeze | **the only genuinely prospective evidence**, accruing as they occur |

**Continuity:**

- every evaluation is one continuous run from 2016-01-04, carrying open lots, interest, high-water marks,
  continuation and shadow-book state through every boundary;
- reported separately: incremental period P&L, the test-window peak-to-trough minute DD, and the cumulative
  whole-run DD.

**No leakage loop:** no test result changes any bound, budget, seed or rule. Failures stay failures.

**A known exposure for the G-family pool.** Study 8's test reported the **2026 GDX drawdowns** (its diagnostic
period G2026) and GDX's 2025 behaviour. KRE is also a B5 / VXRKG book whose 2025–2026 path Study 8 inspected, and
KRE's 2023 regional-bank event is in training. So the 2025–2026 window is not blind for a pool holding GDX or KRE:
the analyst knows both books' broad 2025–2026 paths. Phase B must say so beside any G-family test result.

## 6. Data-vintage comparability

**Training bytes** (≤ 2024-12-31) are byte-identical to the pre-refresh vintage, for all 64 files (gate E1), and to
Study 8's pins, for the five B5 files. Other studies' vintages of the other 59 files were not re-checked.

Training figures cannot differ from Study 8's because of data: gate P3 reproduced all 61 sealed Study 8
training-door centres to the cent.

**The 2025-01-02 → 2026-10-13 test window** is identical to the prior vintage for all 64 files.

**2026-10-14 → 2026-10-29:**

- for the five B5 books, identical to Study 8's pinned files;
- for the other 56 ETFs, first downloaded in this refresh (2026-11-02), with no earlier vintage to compare. A Phase B
  test-window figure for a pool holding any of them uses bars no earlier study saw. That must be stated, not
  mistaken for an optimizer effect.

**2026-10-30** is new for every file.

## 7. What Phase B will report

**Per pool, role holder and control:**

- full-run net (realized and unrealized), interest and friction;
- incremental P&L per window (training, 2025, 2026 YTD, the 2026-10-30 slice);
- the minute and daily DD, the test-window peak-to-trough DD and the whole-run DD;
- the neighbourhood median and p10 (training and test);
- the 384-point share with its Wilson bound and band: **95% preferred; 93–95% only with a stated compelling
  advantage** in median and p10 net, centre net, validation, drawdown margin and stresses;
- per-book contribution: leave-one-out and Shapley over the ≤ 32 subsets, conditional;
- liquidity flags: ILF thin, with the $100k lot ≈ 2.9× the median minute's dollar volume;
- slot contention (refused and displaced lots);
- the comparison with VG #2 balanced, VG #1, B1 and B5, by bootstrap on the same doors.

## 8. Decisions for you (the gates)

1. **Proceed or stop.**
   - The Phase A evidence for proceeding is concentrated in one economy (KRE + GDX, G family). The other five
     nominees are safe but modest.
   - Stopping is a defensible choice. Outside the KRE + GDX core, Phase A found no *Study 8-feasible* generic-vector
     pool above about $11k/yr robust, and the earlier studies' negative findings hold. Infeasible VG pools and non-KRE
     G pools reach $14–18k/yr.
2. **The batch:** A, B, **C (recommended)** or D, or your own subset of the nominations and reserves.
3. **Families:** accept that VG has no new Phase B candidate (its Study 8 incumbents remain the controls), or name a
   VG reserve.
4. **The exploration quota:** Phase B as proposed has no extra exploratory search beyond Study 8's islands and LHS.
   Option D's reserve is the only exploratory pool.
5. **Fitness:** confirm Study 8's fitness unchanged (as proposed), with the 95% preference applied after it as a
   reporting filter.
6. **Compute:** approve about 49 CPU-hours (option C), or the option you choose, on this machine.
