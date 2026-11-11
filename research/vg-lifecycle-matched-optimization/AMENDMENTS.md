# Amendments — Priority 5B: matched L0/L1/L2 lifecycle optimization (vg-lifecycle-matched-optimization)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze (edits of the draft, listed so that the adopted text is traceable); after it, `A*` (substantive) or
`O*` (operational). Criteria are never loosened by amendment once results they govern exist.

## Before the freeze

### R1 — 2026-11-11T10:00Z — refinement passes and the job caps sized from the pilot (draft edit before the freeze)

- **What.** §7.1, §7.3, §7.4: every refinement start makes one pass (the informed focus starts at C4 and C4-refined
  two) instead of the draft's two (three); the per-job caps become engineering 260,000, independent search 430,000 per
  cutoff, informed 370,000 (sum 2,865,000 ≤ 3,000,000); the finishing reserve of the resource guard is 8,000 per
  independent lane and 30,000 per informed lane. The pilot schedule uses small neighbourhoods (r1 4, r2 8, r3 16,
  refinement 4) so that the interruption tests stay within the engineering cap.
- **Why.** The straight pilot's independent search (P18, pilot budgets) spent 51,096 of its 77,477 fresh evaluations on
  refinement neighbourhoods (≈ 11 evaluations per move, ≈ 120–200 moves per start and pass); at study budgets two passes
  would have needed ≈ 160,000 evaluations per cutoff for refinement alone, beyond the 3,000,000 ceiling with the planned
  proposals. The reduction is identical in every arm.
- **Results that existed.** Engineering only: stage V dry runs, the bench, the straight pilot (P18, mechanics and
  counts; no study result).
- **Effect.** Fewer local refinement moves per start (stated in §7.3); no gate, role, window or instrument changes.

### R2 — 2026-11-11T10:13Z — engineering cap and the fold primary of the fold evaluation (draft edit before the freeze)

- **What.** (1) §7.4: the engineering cap becomes 320,000 and each independent search cap 415,000 (sum still 2,865,000).
  (2) Code: the fold evaluation records the arm's **independent** primary as its fold primary explicitly
  (`folds.ts`; at C19–C23 it equals the selection's primary by §9.3, so the rule is unchanged).
- **Why.** (1) The straight pilot's actual costs (independent search 77,477, informed 42,963, qualification 46,956,
  cross-test 11,342 evaluations, plus the bench ≈ 16,000) and the planned interruption tests (≈ 4 × 23,000 on the cheap
  pilot schedule) exceed 260,000. (2) The pilot's pseudo-fold P18 is also its final cutoff, where the selection's
  primary is the final (informed-inclusive) one; the sequential path then found no row for it.
- **Results that existed.** Engineering only (the straight pilot, P18 on D19; no study result).
- **Effect.** None on any study rule; the independent caps leave slightly less extension headroom (§7.4).

## After the freeze

(none)
