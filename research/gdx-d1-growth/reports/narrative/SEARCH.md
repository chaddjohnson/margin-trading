# Search budget and convergence

**Summary.** Every precommitted search, replicate round, refinement and informed lane ran on the accepted GPU evaluator
(GPU Phase 7, binary `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`), with no CPU fallback: 81 official jobs, all attested (1,296
attestation checks, 0 failed), 1,458 / 1,458 live parity mini-set configurations identical, 76,965,697 evaluations submitted
and GPU-returned, 0 CPU-scored, 0 failed, 0 capacity retries. The search lanes requested **72,769,496** evaluations (45.5 %
of the 160 M hard ceiling; ledger 81,752,965 including qualification when the validation launched) in 12.4 GPU-hours of
search wall time; the study's official jobs took 14.3 h of wall time in all.

**Convergence by the frozen rules: yes, at every cutoff and arm.** Every lane but one stopped on *triggers not met*
(Priority 5's two-tier island rule: no performance component > 5 % and no coverage component firing); one C23 J lane was
labelled *coverage-limited* (a class seen only beyond NL0's island cap). No lane reached the hard cap of 16 islands
(budget-bound share 0.0 % everywhere); 12 lanes ran beyond NL0's own cap because a tier-1 component still fired. Replicate
rounds (≤ 4, the 2 % rule) fired once each for G at C19 and C21 and for D and J at C23, then stopped.

**What convergence does not mean.** The stopping rules are local. Independent seeds of the same cell still found
materially different optima: the median relative range of a cell's best feasible centre net across replicates was D
15–25 %, J 17–30 %, S 10–22 % and **G 49–63 %** (section D). The G arm, in particular, is seed-dependent: its fold and
final primaries should be read as one draw from a wide distribution of local optima, which is consistent with its weak
neighbourhoods and its unsupported chronology. Nothing here suggests that a larger budget would rescue the outcome — the
binding failures are out-of-sample drawdowns of the D1 books in March 2020 and of the combined books in 2025–2026, not a
shortage of search — but the location of the Growth optimum is not well determined.

**Coverage.** Every cell of every arm had a feasible fit at every cutoff (D 8/8, G 6/6, J 48/48, S 18/18 and 12/12 at C24).
Effort shares: J 42 %, S 31 %, D 16 %, G 11 % (C has no search). The budget was P6-TSLA's executed allocation × 1.5 in every
stage (standard §4.8 proportional scaling), fixed before the freeze; no stage was enlarged after any result.

Sections A–F below are generated from the sealed records.
