# Assignment 3 handoff — full joint optimization of D1·VGT + D1·GDX + Growth·VGT (proposal for the user's review)

**Status: a proposal. Nothing here is precommitted, executed or binding.** Assignment 3's own frozen protocol (standard
2.2.0 or later) decides. It builds on Assignment 2's evidence (`REPORT.md`), which found **no qualifying successor**:
every one of nine procedures was chronologically unsupported, while the risk-aware selector RA1 gave the strongest
retrospective chronology on identical candidate populations.

## 1. What Assignment 2 supports carrying forward

| Item | Evidence (retrospective) | Recommendation |
|---|---|---|
| RC 2 (`src/d1-risk-controls-rc2/`) | verified (35 tests; stage V 0 failures); RC 1 unchanged | use as the controls engine; review for merging separately (never automatic) |
| All four D1 families (A legacy, B protected, C unlimited-hold, D adaptive) on both books, gate OFF/ON | every family pair and both gate states qualified at every cutoff; the 16 family pairs' best members span ≈ $97k at C24, inside replicate noise; asymmetric pairs led | **keep every family on both books**; do not prune a region |
| Entry-day activation | no detectable effect on 132 balanced pairs per cutoff (median Δ ≈ ±$2k against $9–16k replicate noise) | keep as a **per-book categorical gene** (protected equal screen coverage, as the shadow study's toggles), not as separate cells: halves the cell count |
| The decline gate's K | strata worked; gated cells trailed slightly at C24 | keep K stratified; widen nothing |
| Selection: NL0's actual-profit rule | F/original sequential −$29,466 / DD $80,622 | keep as the faithful reference procedure |
| Selection: **RA1** (screens S1–S4, conservative-net band, lowest occupancy) | F/RA1 sequential +$100,002 / DD $39,855 (still a $4,855 breach in March 2020); label "risk improvement" against the original rule in F and B; RA2 (valuation only) was worse | carry forward as a **precommitted experimental selector beside NL0's rule**, with its thresholds unchanged (no tuning on this evidence); a user decision whether it may become the primary rule |
| The stage-2 same-cutoff refinement | produced most fold and C24 primaries | keep (it is part of the independent procedure at every cutoff) |

**Which mechanisms did the work (C24 finalists' ablations, `REPORT.md` §8):** the hold policies (reverting a disabled
hold cost $32.8–64.5k on development in 10 of 10 tests) and the gate with its K (K ± 1 up to −$80k); the protective stops
of 9–25% and their activation were almost never reached. Assignment 3 should therefore (a) keep the hold-policy and gate
genes with protected coverage, (b) report every finalist's holding-time distribution and its exposure under an unlimited
hold, and (c) not read a stop that never fired as tested protection.

**Do not justify pruning:** the gate, the adaptive and unlimited holds, entry-day activation, legacy family A and any
asymmetric combination all remain plausible; nothing here shows one is inferior beyond search noise.

## 2. The joint genome

- D1·GDX and D1·VGT: the 8 D1 genes each, the RC 2 control genes of the book's family (d, hx, g; K, r, cooldown), the
  per-book family (A–D) and gate as structure, entry-day activation as a categorical gene on protected books.
- **Growth·VGT's full genome** (Growth 1.4.0: 8 structural + 50 conditional numeric genes) — frozen in Assignment 2,
  free in Assignment 3. Growth·GDX stays OFF unless the user decides otherwise; shadow-entry eligibility stays OFF.
- Cells: 4 × 4 D1 family pairs × gate (2 × 2) = 64 structural cells (activation and K as protected categorical genes),
  each with the Growth strata of NL0 (Rise × gate × eligibility, breakout × gate).

## 3. Lanes and budgets (proposal; size with a pilot first)

| Lane | Seeds | Purpose | Budget (proposal) |
|---|---|---|---|
| **Independent** (every cutoff C19, C21, C23, C24) | none (fresh screens) | the chronological evidence; with Growth free it removes AD4's caveat | NL0's V-cell schedule × ≥ 2 replicates per cell (64 cells × 2 = 128 lanes per cutoff ≈ 2.5–3 M evaluations per cutoff on D24-scale doors, the Growth genes raising the cost per evaluation ≈ 3–4×: measure) |
| **Informed** (C24 only) | New L0, C4, C4-refined, IJ1, each projected onto every family, controls from a precommitted grid of starting points (e.g. d ∈ {8, 12, 16, 20}%) | the region the informed lineage found | NL0's informed schedule × ≥ 4 replicates, budgeted apart; labelled "no independent chronological test" |
| Stage-2 refinement | the same cutoff's qualified members | local search inside the independent procedure | NL0's informed schedule, ≤ 16 cells + legacy, 2 replicates |

- Equal budgets for the independent and informed lanes at C24; promotion shares reserved for the independent lane's
  centres; New L0 in the C24 selectable set under the qualifying-incumbent fallback (standard §3.2); lane provenance in
  every role and table.
- More replicates of the unchanged per-lane schedules where noise matters (Assignment 2's replicate noise was $9–16k
  median per cell); the resource guard bound 117–155 lanes per cutoff from C21 on, so the job caps should be sized from a
  study-fidelity pilot.

## 4. Selection, chronology and consequence (proposal)

- Two frozen procedures on identical populations, as here: NL0's actual-profit rule and RA1 (unchanged thresholds:
  1.50×, 25%, −$17,500, $35,000; the 5% band; occupancy). The user decides beforehand which is the primary, or whether
  both are reported with equal standing.
- Folds C19 → C21 → C23 with commits before slices; the 2.2.0 default consequence; "no qualifying successor" remains a
  valid outcome. Consider additional, shorter folds only if each gets a full comparable search (the 2024 slice carried no
  D1 information here).
- Report §5.9 for every fold primary and finalist, and the activation and family coverage per cutoff.

## 5. What Assignment 2 could not establish (and Assignment 3 alone cannot either)

- **Chronological support:** two breaking events (2020, 2022) in one examined history; RA1 was designed after the
  walk-forward diagnostic examined them. Genuinely new evidence needs data that did not exist at the freeze (a
  prospective shadow comparison from the freeze date, precedent `research/prospective-b4-b5-shadow/`) or disjoint
  pre-2016 history.
- **Loss bounds:** protective stops gapped through by up to 7.4 points; no stop or historical DD bounds a future loss.

## 6. Decisions for the user before Assignment 3

1. Approve or edit the genome (§2), the cell design (activation and K as categorical genes) and the lanes (§3).
2. The primary selection rule (NL0's rule, RA1, or both reported equally) — a scoped departure for RA1's §5.9-type inputs
   would again be needed under 2.2.0 (or a new standard version).
3. **Pre-2016 data:** none exists on this machine; free daily sources exist publicly but their licence and price basis
   need your decision (no download or purchase was made). Disjoint history would turn the tail stress from in-sample into
   real evidence.
4. Whether to start a prospective shadow comparison of the frozen candidates (New L0, the C24 F/original and F/RA1
   primaries) from now on.
5. When to review `src/d1-risk-controls/` and `src/d1-risk-controls-rc2/` for merging (never automatic).

Out of scope here and kept separate: the TSLA/MSFT research, the Strategy Lab drag-to-measure chart bug, and the
calendar-day versus trading-session from-scratch comparison.
