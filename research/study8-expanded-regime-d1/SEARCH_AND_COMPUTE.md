# Study 8 — search and compute

All figures come from the 30 sealed search records `results/search/<TRACK>/<FOLD>/search.json` (chain entry 4
`search`, `e1befdcb…`). The generated tables are in `results/tables/search-*.md` (`scripts/build_tables.py search`).

**Everything here is training-window evidence only.** Each job loaded data only up to its fold's cutoff:
- 2019-12-31 (F19);
- 2020-12-31 (F20);
- 2021-12-31 (F21);
- 2023-12-29 (F23);
- 2024-12-31 (F24, primary).

## 1. Execution

- **Orchestration:** `scripts/run_jobs.sh` with 12 parallel jobs, longest first, on 8 physical cores (16 logical) and
  59 GB of memory.
- **Wall time:** 16:06:28Z → 21:08:30Z (5.0 h).
- **Exits:** every job exited 0. No watchdog stop, no crash, no resume; each job's data door opened exactly once (the
  door log, checked by `seal search`).
- **Totals:** 30 jobs; **440,126** configurations evaluated at rung 1; **9,983,389** fresh point evaluations;
  **55.4 CPU-hours** (one thread per job). That is more than the protocol's estimate of ≈ 40 CPU-hours without T1,
  because T1 fired in 5 jobs.
- **Per-job wall time:** from 11 min (V-F19) to 301.5 min (VXRKG-F24, the critical path), as expected. Job times
  under contention: VXRKG 210–302 min, VXRG 117–264, VXR 64–129, VG 34–88, G 20–42, V 11–29.

## 2. Budgets as frozen (PROTOCOL.md §7.1)

The dimension scale s(d) = max(1, d/16) applied to the joint-proposal budgets:

| Track | d | GA new / island | population | combinations + joint LHS (screen) | rung-1 cap |
|---|---:|---:|---:|---:|---:|
| G, V | 8 | 2,048 | 64 | — (8,192 Sobol vectors) | 1,024 |
| VG | 16 | 2,048 | 64 | 4,096 + 1,024 | 1,024 |
| VXR | 24 | 3,072 | 96 | 6,144 + 1,536 | 1,536 |
| VXRG | 32 | 4,096 | 128 | 8,192 + 2,048 | 2,048 |
| VXRKG | 40 | 5,120 | 160 | 10,240 + 2,560 | 2,560 |

**Unchanged across tracks:**
- four islands (up to 8 under T1);
- rung 2 of 192 at n = 64; rung 3 of 48 at n = 128;
- 6 refinement starts × ≤ 2 passes;
- a shortlist of ≤ 6.

**Fair, not equal, coverage.** The five-book track got 2.5× the joint proposals of VG, plus 10,240 combinations of
plausible per-book vectors and 2,560 joint Latin-hypercube points. Its refinement tried 160 single-coordinate moves
per pass, against 32 for G.

## 3. Per job (generated: `results/tables/search-overview.md`)

The overview table lists, per track and fold:
- the training years y and the activity floors;
- screen size, plausible and promoted centres;
- rung-1 archive size and feasible count;
- rung-2 and rung-3 feasible / evaluated;
- islands run, and the T1/T2/T3 triggers;
- fresh points and CPU-hours.

**Main facts:**
- **Feasible regions exist on every training window, for every track.** No job reported "no eligible region".
  - Rung-3 feasibility is near-complete for G, VG, VXR, VXRG and VXRKG on every fold, e.g. VXRKG-F24 52/52 and
    VXRG-F24 49/49.
  - The exception is **V (VGT alone)**: rung-3 feasible 2/51 on F19 and **11/48 on F24**. The binding constraint is
    economic: the neighbourhood median must be ≥ $10,000/yr (C5), which fails for 49 of 51 F19 and 32 of 48 F24
    rung-3 candidates. On F24 the neighbourhood share and p90 DD (C2) also bind (17 and 15 candidates).
  - Frozen B1 itself is infeasible on the F24 training window: it fails C7, its top lot being more than 25% of net
    (`search-controls.md`).
- **Feasibility is not plateau robustness of the frozen controls.** On the F24 training window, the selection-family
  share of neighbours below $35k is:
  - B1 100%; frozen VXR 95.3%;
  - frozen VG 70.3%; frozen VXRG 62.9%; **B5 27.0%**;
  - G-PA 18.8%; the GDX near-misses 52–65%.
  The searched candidates were selected for that share; the frozen controls were not.
- **Shortlists:** 6 per track-fold (180 in all), at L∞ ≥ 0.10. The picks are profit, robust, balanced, centre, then
  the Pareto front. V-F24's shortlist has 4 training-feasible members; the other feasible rung-3 configurations were within
  L∞ 0.10 of them. Two places were filled with infeasible ones (picks "infeasible on training"), which cannot qualify.
  V-F19's shortlist has 2 feasible and 4 infeasible members.

## 4. Triggers, saturation, extensions (PROTOCOL.md §7.2)

- **T1 (island saturation)** fired in 5 of 30 jobs: G-F20, VG-F24, VXRG-F20, VXRG-F21 and VXRKG-F19. In each, the
  4th island had raised the union feasible hypervolume by ≥ 10%. Two more islands ran, the next check did not fire,
  and the search stopped at 6 islands.
  - Union feasible hypervolume (×10⁶), after islands 3 → 4, then 5 → 6: G-F20 554 → 629, then 629 → 629;
    VG-F24 415 → 460, then 485 → 485; VXRG-F20 518 → 907, then 907 → 907; VXRG-F21 658 → 751, then 769 → 769;
    VXRKG-F19 408 → 511, then 583 → 583. No job reached the cap of 8.
- **Stop reasons:** nearly every island stopped on its new-configuration **budget**, not on stagnation. Stagnation
  stops occurred only in G-F20, V-F19, V-F23 and V-F24. Under the protocol's T1 rule (≥ 10% hypervolume from the last
  island) the fronts were saturated. Budget-limited islands mean more islands could still have moved individual
  points, which the T1 rule judges not to be material.
- **T2 (Monte Carlo uncertainty)** fired in 18 jobs: the top two rung-3-feasible candidates differed by less than one
  standard error. The top 8 were re-scored with 128 more points, and 1–3 re-scored configurations reached each such
  shortlist.
- **T3 (coverage)** never fired: every job had ≥ 2 rung-2-feasible regions.
- **Limitation:** the search records keep no per-configuration island origin. So whether the *extension* islands
  contributed shortlist members cannot be determined from the sealed records; the hypervolume increments above are
  what is reported.
- **Refinement:** 0–9 accepted moves per job. Refined endpoints reached the shortlist in 18 of 30 jobs (1–4 members
  each); none in any V job.

## 5. Multiplicity

- **Scale:** 440,126 configurations were scored at rung 1 across the 30 searches. About 9.98 million neighbourhood
  points were evaluated, all on training windows that overlap heavily (every fold starts in 2016).
- **Selection pressure:** fresh perturbation seeds are not fresh market histories. The shortlists are the survivors
  of very many comparisons on the same data. CSCV/PBO over each track-fold's 64 best rung-2 configurations is
  reported with the qualification evidence (`results/tables/qualify-pbo.md`).

## 6. Threshold sensitivity (report-only; `results/tables/search-threshold-sensitivity.md`)

For each track-fold, from the sealed rung-3 records:
- the feasible count under activity floors × 0.5 / 1 / 1.5 and best-year caps 0.65 / 0.75 / 0.85 / none;
- whether the top rung-3 configuration by robust profit changes;
- the Spearman correlation of lots with share.

On F24 the top configuration is unchanged at the frozen thresholds. The lots–share correlation is negative for G
(−0.75), VG (−0.46) and VXRKG (−0.39): among rung-3 candidates, fewer lots tends to buy a higher share. That is why the
activity floors and T6 matter.
