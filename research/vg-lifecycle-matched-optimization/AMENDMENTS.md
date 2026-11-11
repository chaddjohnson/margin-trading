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

### A1 — 2026-11-11T10:43Z — engine failure in the first C19 search: an L2 retained order granted at the door's last session had no pool record; completed in a study-local book; stage V re-sealed; the C19 search restarted

- **What happened.** Chain 1 started the C19 independent search at 2026-11-11T10:31:59Z (protocol frozen and committed,
  `1c43f722`). At 10:33:51Z one evaluation failed explicitly: `L2|D19|…|en1111|…|34fa81fd38cbda69` — "60 requests but 59
  pool records" (the coupled run's consistency check, Priority 5A's `runCoupled` logic). As the protocol prescribes
  (§5.3, §12) the job failed at once, nothing was sealed, and the chain stopped (`results/logs/chain1.log`).
- **Diagnosis** (engineering reproduction, no record): the configuration is the C19 R2/B screen centre #970 (a B pool:
  GDX breakout with retention and a classic-D1 continuation; VGT breakout with the recovery gate and a breakout
  continuation). Under L2 its GDX book retained a breakout refused on 2019-12-30 and reassessed it at the next completed
  close, **2019-12-31 — the last session of door D19** — where the slot was available: the request was granted and an
  order placed for the next eligible trade, which does not exist inside the door. Priority 5A's `lifeBookOf` records a
  canonical order left unfilled at the door's end (from the simulation's log entries) but not an L2 retained order, so
  the granted request had no record and the consistency check fired. 5A's runs (doors D23, D24, FULL) and this study's
  stage V never met the case. It has no economic effect (nothing follows the order inside the door), but every L2 run
  whose retained reassessment is granted at a door's last session would fail.
- **Change (evaluation code; 5A's code untouched).** `src/vg-lifecycle-matched-optimization/lifeBook.ts` wraps 5A's
  unchanged `lifeBookOf`: a granted request without a record whose order is unfilled and was decided at the door's last
  session becomes its record exactly as 5A records a canonical order unfilled at the end (no fill, eS = −1, the slot
  reserved from the decision to the end); any other granted request without a record still throws. `life.ts` and
  `diagnostics.ts` use it. Without the case the book is 5A's, record for record (synthetic test
  `tests/lifecycle.test.ts` "A1"; stage V V2/V3 compare with 5A's `runCoupled` on every non-case run). Harness: stage V
  gains V10 (the failing configuration converges under L2 on D19 with the completed record; L1 there equals 5A's
  `runCoupled`; a convergence scan of 192 random configurations × L1, L2 × D19, D21, D23, D24 = 1,536 runs) and writes
  `results/parity/parity-A1.json`; the guards accept the new evaluation digest `3f902532…e3b` only as acknowledged in
  `results/code-acknowledgements.jsonl` together with that sealed record with 0 failures (`freeze.ts`, `stages.ts`).
- **Why.** The brief and §12: a mismatched evaluation is an explicit engine failure, never a fitness or a skipped
  candidate, and stops dependent stages until fixed and re-verified. The completion implements 5A's specified behaviour
  for orders committed but never filled by the door's end.
- **Results that existed.** No sealed result of any stage after the freeze. The failed job's archive (11,761 fresh
  evaluations of the C19 search, all three arms, base phase) was bound to the old evaluation digest; it is moved aside
  unread (`.cache/…/jobs/search-C19-indep.discarded-A1/`), its evaluations are counted against the 3,000,000 ceiling as
  discarded work, and the C19 search reruns from its start with the identical frozen configuration and seeds. No
  outcome of it was read.
- **Effect.** No rule, budget, seed, gate, role, window or instrument changes; the evaluation of every configuration
  outside the case is unchanged. The dry run of the new stage V: 1,425 checks, 0 failed, 2 end-of-door completions.
