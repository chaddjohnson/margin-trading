# Decision register — Priority 6 (P6-TSLA)

Three parts: **P** — decisions precommitted in the frozen protocol (with where they are enforced); **A** — adaptations and
operational choices made before the freeze, with their reasons; **U** — decisions that belong to the user (nothing here
adopts, deploys or merges anything).

## P. Precommitted (PROTOCOL.md; enforced in code)

| ID | Decision | Where |
|---|---|---|
| P1 | The study trades only TSLA: arms D (D1 standalone), G (Growth standalone), C (fixed pairs of the D and G finalists, no tuning), J (joint), S (D1-first sequential: D's finalists frozen, Growth searched in the shared slot) | PROTOCOL §1, §7; `context.ts`, `stages.ts` |
| P2 | One exclusive $100,000 slot; D1 first at a same instant; 5 bps per side; 11 % simple interest; calendar-day holds; no compounding; S1 absent; shadow eligibility OFF | §5; the accepted engine |
| P3 | P0: the marked minute DD ≤ $35,000 = 35 % of the fixed $100,000 allocation (never of peak equity); gates Q1–Q6 with Q6 = the arm's families funded | §9; `qualify.ts` |
| P4 | NL0's original rule (actual-profit role) is THE selector; RA1 is a report-only experimental selector on identical populations | §10; `select.ts` |
| P5 | Original parameter domains (Study 8's D1 box, Assignment 2's controls, growth140's Growth boxes); every supported D1 / Growth option reachable; protected and unrestricted Growth as separate cells | §6; `space.ts`; `FUNCTIONALITY_AUDIT.md` |
| P6 | Budgets: NL0's per-lane schedules; base replicates D 4, G 8, J 4, S R_S(F) = max(4, ⌈160 ÷ 6F⌉); refinement 4 lanes per refined cell (quotas D 8, G 6, J 16, S 12; ≤ 24 seeds); two-tier islands (≤ 16); replicate rounds ≤ 4 at 2 %; hard ceiling 120 M requested | §7; `budget.ts`, `lanes.ts` |
| P7 | Folds C19 → C21 → C23 → C24 with commits before each next door; continuous runs; per-arm sequential verdicts; the §1.8 default consequence | §11; `stages.ts`, `doors.ts` |
| P8 | Finalists and the determination (research candidate iff Q1–Q6 at C24, the arm's verdict supported, V1–V3 pass); architecture comparisons with $10,000 / $5,000 / $2,500 bands and replication | §12; `outcome.ts` |
| P9 | FULL (2025-01-02 → 2026-10-30) opens once, after the committed frozen selection and the FULL authorization; previously examined broader-market history, not a pristine holdout | §3, §11; `doors.ts` |

## A. Adaptations and operational choices (before the freeze)

| ID | Choice | Reason / evidence |
|---|---|---|
| A1 | **Slot binding**: both engine slots carry one TSLA SymDoor; the VGT-slot books trade; GDX books disabled; no evaluation file changed | the accepted engine is symbol-agnostic in its arrays; gates E1 (acceptance VERIFIED), E4 (CPU = GPU, 0 of 4,660 differ), E6 (single-family identities, the disabled slot inert) |
| A2 | **TSLA split ledger in the study** (`data/TSLA-splits.json`, central schema, canonical function) | `config/market-events/splits.json` is sha256-pinned by ≥ 45 frozen records and three code pins (fail-closed guards); see U2 |
| A3 | **Endpoint 2026-10-30**; later TSLA sessions not downloaded | the program's common endpoint (brief §2); keeps no unexamined data partially read |
| A4 | **Lane derivation** from Priority 5's lane with 11 declared substitutions (no algorithm change; arm S's design neighbourhoods never move its frozen D1) | `derive.ts`; test "search.ts equals a fresh derivation" |
| A5 | **R_S rule replaced before the freeze**: a cost-based draft would have given R_S = 22 from the pilot's S lanes, which ran on a hash-selected frozen D1 with mostly implausible proposals (2,801 requested per lane vs 7,197 for J) — about twice J's effort; the lane-count rule gives S + its D1 step ≥ J's 192 base lanes | brief §6 Stage E ("avoid claiming the architecture itself won merely because it received more evaluations"); `results/engineering/pilot.json` |
| A6 | **Refinement seeds ≤ 24 per cell** (NL0's original order) | Priority 5's maximum (8 replicates × 3); keeps highly replicated cells (G, S) comparable |
| A7 | External controls only (New L0 / N/original's VGT books on TSLA); no informed lane | brief §3 |
| A8 | Priority 5 archive compressor: a smoke-test attribution fix (Priority 5's copied incumbent rows) after one conservative blocker | `STORAGE_PRESERVATION_REPORT.md` §4 |
| A9 | `npm test` (gate E8) run in the main checkout: it reads whole data files and feeds no decision (Priority 5's precedent) | `results/engineering/E8-regression.json` |

## U. Outstanding decisions for the user

| ID | Decision |
|---|---|
| U1 | The other Priority 5 caches: 20.97 GB of removal candidates (pilot archives, superseded engineering runs, exported datasets, a scratch build) — delete, compress or keep (`STORAGE_PRESERVATION_REPORT.md` §6) |
| U2 | Register TSLA's two splits in the central `config/market-events/splits.json` (which would change its sha256 and require acknowledging the frozen pins) or keep the study-local ledger |
| U3 | (after the outcome) whether any TSLA candidate warrants further investigation — never deployment from this study |
| U4 | Whether to start the MSFT study (not started here, per the brief) |
