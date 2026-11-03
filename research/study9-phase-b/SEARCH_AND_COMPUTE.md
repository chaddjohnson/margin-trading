# Study 9 Phase B — search and compute

All figures come from the 35 sealed search records `results/search/<TRACK>/<FOLD>/search.json` (chain entry 5
`search`, `72b9f43b2d4d…`) and their archives; the generated tables are `results/tables/search-*.md`
(`tools/build_tables.py search`). **Training-window evidence only:** each job loaded the Phase A training projection
only up to its fold's training end (2019-12-31, 2020-12-31, 2021-12-31, 2023-12-29, 2024-12-31); every record's seed
namespace is `study9-phase-b`.

## 1. Execution

- **Orchestration:** `scripts/run_jobs.sh scripts/jobs-search.txt 12` — 12 parallel jobs, longest first (32-D, then
  24-D, then 16-D), on 8 physical cores (16 logical) and 59 GB. The search jobs' memory was not logged; the timing pilot's jobs used
  1.8–1.9 GB resident each (`results/pilot/pilot.json`, `rssGb`).
- **Wall time:** 2026-11-03T00:31:39Z → 05:48:42Z (**5 h 17 min**; `results/runlogs/orchestrator-search.txt`).
- **Exits:** all 35 jobs `exit 0`; no watchdog stop, no crash, no resume; each job's door opened exactly once (checked
  by `seal search`).
- **Totals:** **35 jobs; 498,579 configurations evaluated at rung 1; 11,427,952 fresh point evaluations; 60.9
  CPU-hours** (one thread per job). The planning estimate was ≈ 60 CPU-hours for the search alone (of ≈ 77 including
  qualification and tests).
- **Per job:** 0.27 CPU-h (N2-EDV-F19, no eligible region) to 5.18 CPU-h (G4-ILF-F24, six islands). The 32-D jobs took
  1.8–5.2 CPU-h, the 24-D jobs 1.0–2.3, the 16-D jobs 0.3–1.3.
- **Caches:** 35 persistent search point caches, 15,928,085,660 bytes (15.9 GB = 14.8 GiB), retained (git-ignored),
  plus 35 qualification caches (0.86 GB). Their sha256, line counts and sizes are sealed in
  `results/search/cache-manifest.json` and `results/qualify/cache-manifest.json`.
- **Seal:** the first automatic `seal search` failed on the manifest's line count for caches above 512 MB; fixed as
  amendment E2 (chain `code-E2`) before the seal; no record was affected.

## 2. Budgets as frozen (PROTOCOL.md §7.1; Study 8's schedule, s(d) = max(1, d/16))

| Pool size | d | s(d) | Combinations + joint LHS | Rung-1 cap | Population | New per island |
|---|---:|---:|---:|---:|---:|---:|
| 2 books | 16 | 1 | 4,096 + 1,024 | 1,024 | 64 | 2,048 |
| 3 books | 24 | 1.5 | 6,144 + 1,536 | 1,536 | 96 | 3,072 |
| 4 books | 32 | 2 | 8,192 + 2,048 | 2,048 | 128 | 4,096 |

Unchanged across tracks: per-book Sobol screens of 4,096; four islands (up to eight under T1); rung 2 of 192 at n = 64;
rung 3 of 48 at n = 128; 6 refinement starts × ≤ 2 passes; shortlists of ≤ 6.

## 3. Per job (`results/tables/search-overview.md`)

- **Feasible regions exist on every fold for every track except the two EDV pools on F19.** On the F19 window
  (2016-01 → 2019-12, y = 2.54) N3-EDV and N2-EDV found no rung-1-feasible configuration ("no eligible region"); N3-EDV
  reached 6/54 rung-3-feasible candidates and filled 2 shortlist places with infeasible ones; N2-EDV's shortlist is 6
  infeasible-on-training members, which cannot qualify. EDV's sparse early minute history (Phase A: 40.8% median
  coverage, thin until 2022) limits the activity it can contribute.
- **Rung-3 feasibility is otherwise near-complete:** 44/51 to 53/53 per job.
- **Shortlists:** 6 members in each of the 35 track-folds (210 in all), at L∞ ≥ 0.10.

## 4. Triggers and saturation (PROTOCOL.md §7.2)

- **T1 (island saturation)** fired in 3 of 35 jobs: G4-ILF-F24, N2-EDV-F20 and VG3-IWM-F21. Each ran two more islands
  (six in all); the next check did not fire; no job reached the cap of eight.
- **Stop reasons:** 144 of 146 islands stopped on their new-configuration **budget**, 2 on stagnation. As in Study 8,
  budget-limited islands could still move individual points; the frozen T1 rule judges the fronts saturated.
- **T2 (Monte Carlo uncertainty)** fired in 21 of 35 jobs (the top two rung-3-feasible candidates within one bootstrap
  standard error); the top 8 were re-scored with 128 more points.
- **T3 (coverage)** never fired.
- **Refinement:** 0–10 accepted moves per job, 88 in all.
- **Fronts and diversity (what is and is not reported):**
  - Each island's constrained-Pareto front is summarised by its hypervolume trajectory (`search-islands.md`).
  - Population diversity is summarised by duplicates: 21,217 of 445,344 island offspring (4.8%) duplicated an earlier
    configuration.
  - Distinct regions enter through the shortlist's L∞ ≥ 0.10 spacing.
  - The individual front members and a per-generation diversity statistic are in the sealed records and archives but
    are not tabulated here.

## 5. Multiplicity

About 0.5 million configurations were scored at rung 1 and 11.4 million neighbourhood points evaluated, on training
windows that overlap heavily (every fold starts in 2016). Fresh perturbation seeds are not fresh market histories:
the shortlists are the survivors of very many comparisons on one history. CSCV/PBO per track-fold is reported with the
qualification evidence (§6).

## 6. Overfitting probability (CSCV/PBO) and the fidelity ladder

From the sealed qualification records (`results/qualify/<TRACK>/<FOLD>/qualification.json`; table
`results/tables/qualify-pbo.md`): CSCV over each track-fold's 64 best rung-2 configurations on half-year blocks from
2018H1 to the fold's training end (4 blocks on F19 … 14 on F24).

| Track | F19 | F20 | F21 | F23 | **F24** |
|---|---:|---:|---:|---:|---:|
| G4-ILF | 0.000 | 0.850 | 0.343 | 0.433 | **0.862** |
| G4-EWW | 1.000 | 0.350 | 0.457 | 0.709 | **0.843** |
| N3-EDV | 1.000 | 0.550 | 0.386 | 0.430 | **0.920** |
| N2-SMH | 0.833 | 0.650 | 0.386 | 0.741 | **0.758** |
| V3-IWM | 0.000 | 0.450 | 0.486 | 0.780 | **0.699** |
| N2-EDV | 0.500 | 1.000 | 0.500 | 0.328 | **0.609** |
| VG3-IWM | 0.667 | 0.600 | 0.357 | 0.549 | **0.818** |

- **PBO > 0.5 in 20 of 35 track-folds, and in all seven F24 track-folds (0.61–0.92).** Within each F24 rung-2 set,
  the in-sample best half-year combination usually ranks below the median on the held-out halves: the training-best
  ordering among near-equivalent configurations is mostly noise. F19's 4 blocks give very coarse estimates (0 or 1).
- **Fidelity ladder:** Spearman(selection-family robust profit, confirmation-family robust profit) over each
  shortlist is 0.89–1.00 in every track-fold. Fresh perturbation seeds reproduce the training order; they cannot
  detect overfitting to the one 2016–2024 history (PBO can, and does).
- **On the test windows** (retrospective: 2025–2026 was inspected before Phase B; `CHRONOLOGICAL_VALIDATION.md` §1): Spearman(training robust, test centre net) over 42 members was
  0.08 / 0.19 / 0.44 / −0.14 on F19–F23 and 0.57 on F24; the F24 training #1 failed its test.

## 7. Compute and wall time (measured; 16 logical CPUs, single-threaded processes)

| Stage | Wall (UTC, 2026-11-03) | CPU | Source |
|---|---|---:|---|
| Parity, attempt 2 (19 gates) | 00:03:19 → 00:31:22 (1,684 s) | ≈ 0.5 h | `results/parity/parity.json` (`seconds`); attempt 1 (failed N2, E1) in `results/parity/run-2026-11-02T233235904Z/` |
| Search, 35 jobs | 00:31:39 → 05:48:42 (5 h 17 min) | **60.9 h** | §1; `results/runlogs/orchestrator-search.txt` |
| Qualification, 35 jobs | 05:50:04 → 06:08:04 (18 min) | 3.1 h | per-job "(… min)" in `results/runlogs/qualify-*.txt` (186.2 min) |
| Tests F19, F20, F21, F23, F24 | 06:26:48 → 08:21:55 (12.2, 15.4, 22.7, 26.9, 38.0 min) | 1.9 h | `results/runlogs/orchestrator-test.txt` |
| F24 confirmation | 08:21:55 → 09:00:31 (38.6 min) | 0.6 h | same |
| Slice, diagnostics, preference | 09:00:48 → 09:11:06 (0.8, 8.9, 0.7 min) | 0.2 h | `results/runlogs/orchestrator-post.txt` |

**Total ≈ 67 CPU-hours across the sealed stages** (each test and post-test stage is one single-threaded process, so
its wall time is its CPU time). Not included: parity attempt 1, the pre-freeze smoke runs, the runner reconciliation
and the inherited `npm test`. The planning estimate was ≈ 77 CPU-hours.
