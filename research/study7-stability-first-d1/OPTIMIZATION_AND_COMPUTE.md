# Optimization and compute

Sources:
- Phase B: `results/phaseB/<track>/<fold>/search.json` (sealed) and `-archive.csv.gz` (every configuration evaluated
  at rung 1).
- Tables: `results/tables/phaseB-*.md`.
- Phase D: `results/phaseD/*/*/validation.json`.

PROTOCOL.md §7–§9 define everything below. Nothing was changed after the freeze.

## 1. Objective formulation (stability-first from the first screen)

Every configuration promoted past the centre screen is scored on a **joint neighbourhood**: an N1 Latin hypercube over
all coordinates of all its books, clipped to the box, with common random numbers within a rung. Scoring uses
**constrained Pareto ranking**, not a weighted score:

- **Objectives:**
  - maximize centre net/yr;
  - maximize neighbourhood median net/yr;
  - maximize neighbourhood p10 net/yr;
  - minimize neighbourhood p90 minute DD.
- **Constraints**, combined into a normalized violation (feasible first, then infeasible ranked by violation):
  - C1: centre DD < $35k;
  - C2: neighbourhood share ≥ 0.90 and p90 < $35k;
  - C3: lots, episodes and lot-year floors;
  - C4: every book of a pool funds lots;
  - C5: median ≥ $10k/yr and p10 > 0;
  - C6: ≥ $11k per occupied $100k-year;
  - C7: top lot ≤ 25%, best year ≤ 75% and ex-best-year economy ≥ $5k/yr.

Promotion between rungs (16 → 64 → 128 points, each with fresh seeds) and the local refinement both use the same
neighbourhood fitness. The shortlist picks profit, robust, balanced and centre roles, then front members, at
normalized L∞ ≥ 0.10. They are sealed with two independent 128-point **selection** sets that were never used in the
search.

## 2. Search coverage, counts and compute

| Track | Fold | Screen centres | Promoted to rung 1 | Configurations at rung 1 | Rung-1 feasible | Rung 2 feasible / n | Rung 3 feasible / n | Islands | T1 | T2 | Fresh points | Minutes (wall) |
|---|---|---:|---:|---:|---:|---|---|---:|---|---|---:|---:|
| G | F19 | 8,192 | 1,024 | 9,216 | 2,996 | 189 / 192 | 49 / 49 | 4 | no | fired | 199,616 | 20.7 |
| G | F20 | 8,192 | 1,024 | 8,448 | 2,463 | 191 / 192 | 50 / 50 | 4 | no | no | 188,604 | 24.4 |
| G | M | 8,192 | 1,024 | 9,216 | 2,748 | 191 / 192 | 48 / 48 | 4 | no | no | 197,511 | 34.9 |
| G | L | 8,192 | 387 | 8,579 | 1,533 | 102 / 192 | 40 / 49 | 4 | no | fired | 189,782 | 44.1 |
| VG | F19 | 5,118 | 1,024 | 9,216 | 4,957 | 192 / 192 | 50 / 50 | 4 | no | fired | 220,607 | 38.2 |
| VG | F20 | 5,117 | 1,024 | 9,216 | 3,879 | 192 / 192 | 50 / 50 | 4 | no | fired | 221,473 | 55.1 |
| VG | M | 5,118 | 1,024 | 9,216 | 5,155 | 192 / 192 | 51 / 51 | 4 | no | no | 223,687 | 54.8 |
| VG | L | 5,084 | 1,024 | 9,216 | 4,307 | 186 / 192 | 51 / 51 | 4 | no | no | 222,306 | 63.5 |
| VXR | F19 | 5,120 | 1,024 | 9,216 | 2,271 | 192 / 192 | 50 / 50 | 4 | no | no | 236,497 | 48.6 |
| VXR | F20 | 5,120 | 1,024 | 13,312 | 6,010 | 192 / 192 | 50 / 50 | **6** | **fired** | no | 308,556 | 71.4 |
| VXR | M | 5,120 | 1,024 | 9,216 | 5,243 | 191 / 192 | 51 / 51 | 4 | no | fired | 243,946 | 76.2 |
| VXR | L | 5,120 | 1,024 | 9,216 | 4,519 | 192 / 192 | 49 / 49 | 4 | no | no | 233,342 | 79.2 |
| VXRG | F19 | 5,120 | 1,024 | 4,096 | 1,339 | 192 / 192 | 51 / 51 | 2 | no | fired | 164,598 | 37.6 |
| VXRG | F20 | 5,120 | 1,024 | 7,168 | 2,332 | 192 / 192 | 51 / 51 | **4** | **fired** | no | 214,480 | 62.1 |
| VXRG | M | 5,120 | 1,024 | 4,096 | 1,334 | 192 / 192 | 50 / 51 | 2 | no | fired | 163,785 | 56.4 |
| VXRG | L | 5,120 | 1,024 | 4,096 | 843 | 192 / 192 | 48 / 48 | 2 | no | fired | 140,141 | 60.6 |
| V (diag.) | M | 8,192 | 512 | 2,560 | 1,181 | 49 / 96 | 25 / 25 | 1 | — | fired | 70,134 | 13.1 |
| V (diag.) | L | 8,192 | 512 | 2,560 | 608 | 90 / 96 | 25 / 25 | 1 | — | no | 69,285 | 13.3 |

- **Multiplicity.**
  - 137,859 configurations were scored at rung 1, over 18 track-fold jobs, with search dimensions 8, 16, 24 and 32.
  - Above that sat 3,264 rung-2 and 849 rung-3 neighbourhood evaluations.
  - The 96 shortlist members (88 validated plus 8 Track V diagnostics) are the multiple-testing population at
    validation.
  - Effective search dimension: G and V 8-D; VG 16-D; VXR 24-D; VXRG 32-D.
- **Compute.**
  - Pre-freeze pilot: 29,356 points, 4.5 min.
  - Phase A: 122,170 points, 38 CPU-min, 3.6 min wall at 12 processes.
  - Phase B: 3,508,350 fresh points, 14.2 CPU-hours (single-thread per job), 1 h 19 min wall (23:54 → 01:14Z,
    14 processes on 8 physical cores).
  - Phase D: 263,851 points, 1.5 CPU-hours, 9 min wall.
- **Fresh points versus cache hits.**
  - Phase B built 6.1 M book traces (several per pooled point).
  - Point-cache hits were 2–4% per job: duplicates inside designs and across islands.
  - All caches are deterministic and semantics-preserving (parity C1, D1).

## 3. Did extra computation buy information? (§8.4 triggers; all training-only)

### T1 (island saturation): two of sixteen base track-folds extended

- VXR-F20: islands 5–6.
- VXRG-F20: islands 3–4.

Union feasible hypervolume after each island, relative to island 0 (from the sealed island records):

| Track-fold | After islands 1 … k | Reading |
|---|---|---|
| VXR-F20 | 1.000, 1.398, 1.398, 1.551, 1.551, 1.551 | T1 fired after island 4 (+11%); islands 5–6 added nothing |
| VXRG-F20 | 1.000, 1.395, 1.404, 1.408 | after T1, islands 3–4 added < 1% |
| G-L | 1.000, 5.168, 5.413, 5.677 | island 1 found the region that island 0 missed; islands 2–3 added ≈ 10% |
| VG-F20 | 1.000, 1.514, 1.514, 1.514 | saturated after 2 islands |
| VXRG-M, -L, -F19 | 1.000, 1.000 | the second island found nothing new |
| Others | ≤ 1.35 after 4 | saturating |

**Verdict on T1.**
- Within a fold, more islands mostly bought **more trials, not more information**. The training fronts saturated after
  one to three islands.
- The extra T1 islands changed no validated outcome. Every F20 candidate failed out of fold, whether or not T1 fired.
- G-L is the one case where a second island was clearly informative. A single island would have missed the dominant
  in-sample GDX region.

### T2 (ranking within Monte Carlo uncertainty): fired in 9 of 18 jobs

The top two rung-3 candidates differed by less than the bootstrap SE ($26–$819/yr against SEs of $284–$819/yr).
- **Action:** each re-scored top-8 configuration received 128 fresh points (256 pooled). This is variance reduction
  around fixed candidates and added no search candidates.
- **Effect:** it did not change which region was shortlisted. It confirms that leaders inside a region are not
  separable at 128 points; at 256 points they still differ by only a few hundred dollars a year.

### T3 (coverage): never fired

Every rung-2 feasible set spanned at least 2 distinct regions.

### Shortlist decay through the fidelity ladder (medians over each shortlist)

| Track-fold | Rung-3 median/yr | Selection median/yr | Confirmation median/yr (run to test end) | Test-window median | Rung-3 share → confirmation share |
|---|---:|---:|---:|---:|---|
| G-M | $30,457 | $30,179 | $21,604 | $3,166 | 1.000 → 0.025 |
| VG-M | $38,520 | $38,753 | $27,583 | $5,056 | 1.000 → 0.633 |
| VXR-M | $25,929 | $25,991 | $17,665 | −$11,722 | 1.000 → 0.012 |
| VXRG-M | $41,587 | $41,040 | $28,549 | −$836 | 1.000 → 0.069 |
| G-F20 | $35,019 | $34,044 | $21,697 | −$3,780 | 1.000 → 0.000 |
| VG-F20 | $46,578 | $47,093 | $27,602 | −$10,381 | 1.000 → 0.073 |
| VXR-F20 | $26,741 | $26,816 | $13,912 | −$16,766 | 1.000 → 0.057 |
| VXRG-F20 | $32,200 | $32,366 | $16,883 | −$28,986 | 0.992 → 0.020 |
| G-L (in-sample) | $18,211 | $18,095 | $17,971 | — | 1.000 → 1.000 |
| VG-L (in-sample) | $26,783 | $27,467 | $27,119 | — | 0.992 → 0.995 |
| VXR-L (in-sample) | $18,134 | $17,950 | $17,978 | — | 1.000 → 0.999 |
| VXRG-L (in-sample) | $26,717 | $26,613 | $26,678 | — | 0.992 → 0.999 |

The training-side figures are **stable across independent seed families**: rung 3, then selection, then confirmation
on the same window. The search therefore did not overfit its own perturbation samples; the neighbourhood estimates
generalize to new offsets. The collapse is **chronological**. Shares fall from 1.0 to 0–0.63 once a later market
period enters. This is the earlier studies' failure mode, now measured with neighbourhood fitness active from the
start.

## 4. Near-zero-trade guard and threshold sensitivity (§7.4)

- **No near-zero-trading solution.** The rung-3 configurations fund **9–51 lots** on their training windows; job
  minima are 9–25 and medians 16–33, all far above the floors of 4–10. The risk metric is not bought with inactivity.
- **Lots and share.**
  - Rank correlation of lots with share among rung-3 candidates: −0.23 to +0.54 in most track-folds.
  - **G-L is the exception (−0.95).** On 2017–2023 the more active GDX variants are the less robust ones: they
    re-enter through the 2022 bear.
- **Activity floors × 0.5 / × 1 / × 1.5:** same feasible counts at × 0.5 and × 1 everywhere. At × 1.5 the count drops
  in VXRG-M (50 → 3), VXRG-F20 (51 → 15), V-L (25 → 9), VXR-F20 (50 → 43) and VXRG-L (48 → 41). The floors bind only
  above their predeclared values.
- **Best-year cap 0.65 / 0.75 / 0.85 / none:** 0.85 and none give the same counts as 0.75 everywhere. **At 0.65 the DEV
  folds empty out** (G-M 2/48, G-F20 0/50, VG-F20 4/50, VXR-F20 3/50), because 2020 dominates every DEV-trained
  candidate. Fold L is far less affected (G-L 21/49; VG-L, VXR-L 100%).
  - The protocol's 75% cap was the binding choice for DEV-trained folds. It kept the M-fold search populated, and M
    still failed out of fold, so a stricter cap would not have produced a nominee.

## 5. VGT standalone diagnostic (Track V) and its trigger

- **Fold M, training only:** the best Track V shortlist member reached 1.07× VGT `primary`'s robust profit on the
  pooled selection sets ($11,352/yr vs $10,623/yr), with a higher p90 DD ($33,366 vs $28,146).
- **Rule:** the predeclared trigger (≥ 1.25× and p90 ≤ primary + $2,000) **did not fire**, so no challenger track
  (VC) ran.
- Fold L's diagnostic shows the same pattern: no V candidate beats `primary` on both robust profit and p90. See
  `VGT_CONTROL_AND_ROLE.md`.

## 6. Stop reason

Every track-fold ended its predeclared schedule. T1 extended two of them and then saturated. No training-only trigger
remained, and no extra search was run because of any validation or final result.
