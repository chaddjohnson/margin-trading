# Search budget and convergence (P6-TSLA)

**Effort.**
- **Search lanes:** 2,560 over the four cutoffs:
  - C19 608;
  - C21 602, including 16 replicate-round lanes;
  - C23 748, including 162 replicate-round lanes;
  - C24 602, including 16 replicate-round lanes.

  Together they requested **41,858,535 official evaluations, 34.9 % of the 120 M hard ceiling**, in 8.67 h of GPU wall
  time.
- **Every official job:** 82 jobs (search, qualification, fixed pairs, slices and the validation) submitted
  **44,161,845 evaluations**. All were returned by the attested GPU: 0 CPU-scored, 0 failed, 15 capacity retries on the
  GPU (§C).
- **Shares by arm:** J 38.8 %, S 36.0 %, G 13.9 %, D 11.2 %. Arm C has no search. S's lanes plus arm D's (19.78 M)
  exceed J's (16.25 M), as brief Stage E requires: no architecture "win" from more evaluations.

**Stopping (two-tier rule, PROTOCOL §7).**
- Every lane but one stopped on *triggers not met*. **No lane reached the 16-island cap**, so the budget-bound share is
  0 % in every arm and cutoff.
- 20 lanes (0.8 %) ran beyond NL0's own island cap because a performance component (> 5 %) still fired: C19 J 9, C21 J 3,
  C23 G, J and S 1 each, C24 D 1, G 3, J 1. The most islands in any lane was 9.
- One lane, `C19/J/broad/J.C1.h0.s1/R102`, is *coverage-limited*: performance had converged by NL0's rule, while its
  feasible behaviour classes were still growing.
- Replicate rounds fired at C21 D (2 rounds), C23 G (3), C23 J (3) and C24 D (2), and stopped on their own trigger each
  time. No arm reached the 4-round cap.
- So **every arm at every cutoff is "converged by the frozen rules"**, and hypothesis H4 holds.

**What "converged" does not mean.** Seeds found materially different optima in the same cell (§D). Across replicates,
the median relative range of a cell's best feasible broad-lane net is:

| Arm | Range |
|---|---:|
| S | 10–20 % |
| G | 19–25 % |
| D | 31–43 % |
| J | 33–66 % |

J's selected C24 cell `J.B1.h2.s1` ranged from $45,961 to $326,267 across its four replicates. Better in-sample vectors
probably exist. On the fold evidence they would shrink out of sample as these did.

**Coverage of the feasible region.**
- D: 8 of 8 cells had a feasible fit at C19. From C21 on, only the 4 decline-gate-ON cells did.
- J: 48 cells at C19, then 37, 24 and 23 at C24; from C23 on, gate-ON only.
- G and S: every cell, at every cutoff.

Qualification counts per stage are in `reports/tables/TABLES.md`. The search is reproducible from the sealed lane
records: seeds are `deriveSeed('tsla-d1-growth', …)` and replicate numbers start at R101.
