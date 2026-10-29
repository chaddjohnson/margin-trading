# Entry × exit × contract × mask matrix and its optimisation

The full structural matrix — 12 entries × 25 exit contracts × 8 rule masks = **2,400 cells** — was searched in every
history (A–D, H): 256 Sobol points + references (defaults; N = 8 and 15 for rule A) + up to 4 centers × J17 per cell,
then training-only deep refinement of 13 (entry, exit-contract) pairs per history, all 8 masks of each (2,048 Sobol
points on a per-pair widened box, 4 × 64 local points, 8 shortlisted centers × J33), and the fixed-parent rule-only
search. No cell was skipped; cells without a champion stay in every denominator with their reason. In total the study
evaluated 5,114,598 configurations: 5,111,641 in development, 338 in `evaluate` and 2,619 in `robustness`.

| History | Evaluations (cap 1,328,684) | First pass | Deep | Fixed parent | Cells with champion | Runtime |
|---|---:|---:|---:|---:|---:|---:|
| A (≤ 2019) | 1,007,842 | 761,774 | 245,342 | 726 | 2,178 | 8.4 min |
| B (≤ 2020) | 1,025,047 | 777,647 | 246,642 | 758 | 2,312 | 11.3 min |
| C (≤ 2021) | 1,026,807 | 778,484 | 247,554 | 769 | 2,312 | 14.7 min |
| D (≤ 2022) | 1,025,853 | 777,829 | 247,323 | 701 | 2,187 | 15.2 min |
| H (≤ 2023) | 1,026,092 | 778,232 | 247,089 | 771 | 2,125 | 17.6 min |

(Per-history splits, duplicates, coverage per dimension, champion rates by mask and by dimension count, reasons for no
champion and the picks: `results/tables/develop.md`; per-cell rows: `results/tables/cells-<h>.csv`; entry × exit grids
of champion scores per history, with mask 000 and best-of-masks: `matrix-grids.md`; family and contract marginals:
`families.md`; deep pairs, lists and widened edges: `deep.md`; matched-budget mask scores inside deep pairs:
`deep-masks.md`.) The per-evaluation archives (≈ 1M rows per history) are git-ignored; their sha256 is in each record.

**Findings (training data only; selection noise is large).**
- Champions are common: 2,178 of 2,400 cells in A have a champion. Cells with rule A have higher champion rates (A:
  97% with A alone vs 89% for mask 000) — A makes the ±10% neighbourhood feasibility easier — while B and C masks are
  similar or slightly lower; champion rates rise with the number of searched dimensions because those cells carry rules.
- The deep lists overlap heavily across masks (13 pairs per history instead of up to 28): the same few pairs top most
  mask lists. Picks came from E09, E04, E02 and E11 entries and XT, XRP, XE exits; E06 (Stage 1/1b's favourite) did
  not win a fold in Stage 1c.
- Best point vs neighbourhood: the binding selection uses only J33-median champions (RoD), never a best single point, and
  requires φ ≥ 0.75 on J33. The picks' J128 development neighbourhoods then turned out 100% positive — an empirical
  result, not a consequence of the selection rule (`NEIGHBORHOODS_AND_GENERALIZATION.md`).
- Edge optima: every binding pick lies in a training-only widened part of its box, one at a natural limit — A t2 =
  0.005 (declared 0.03–0.25), B ρ = 1.00 (declared 0.2–0.9; 1 is the limit), C ρ = 0.98, D γ = 2.57 (declared 0–2);
  H's ρ = 0.97 too. Optima at box edges are consistent with the perturbation item (f) failing.
- **H Pareto set** (descriptive, in-sample, never nominated; `pareto-H.md`): of 104 deep-cell RoD champions in H, 21
  are non-dominated on (J33 median net ↑, J33 median minute DD ↓, φ ↑), J33 median net +$87k to +$134k at median DD
  $15.7k–$33.2k. The H pick E11 × XRP OR + A (+$134,093 / $17,712, φ 0.82) is one of them; E06 (XT, XD, XP, XRD) and
  E11 × XRP/XRD cells make up 17 of the 21; four pairs of members differ only by rule C and have identical J33
  statistics (C inert there).
- Contracts: `families.md` reports, per exit family, the median over entries of (OR − replace) cell-median net with
  rules off.
