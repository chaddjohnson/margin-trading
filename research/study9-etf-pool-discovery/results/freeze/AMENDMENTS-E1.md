# Amendments and disclosures — Study 9 Phase A

Append-only after the protocol freeze. Each entry has its time (UTC, from the clock), reason, exposure and effect.

## A0 — pre-freeze record (2026-11-02, before any S1 measurement)

Written before the freeze. It records what happened between the brief and the freeze.

1. **S0 executed first**, as the brief orders (§3 of the brief):
   - data refresh through 2026-10-30, the audit, and the training projection;
   - no strategy computation.
2. **Throughput pilot.** Timings only (`results/pilot/pilot.json`). It opened the training door on the 61 eligible
   ETFs; its door-log line is the first entry of `results/doors.jsonl`.
3. **Code-path smoke tests** (review m10: the full disclosure).
   - **Setup:** toy budgets (8 vectors, 4–8 neighbours, ≤ 12 proposals per stratum), 16 ETFs (AGG, EEM, EWZ, FXI, GDX,
     GLD, IWM, KRE, SLV, TLT, VGT, XBI, XLE, XLF, XLK, XRT), all door openings on the training projection, end
     2024-12-31. The outputs sat in a scratch folder outside the study and were deleted unread; no result was read.
   - **Runs 1–3, about 17:45–18:00Z** (their times were not logged exactly):
     - run 1 stopped at a missing module in the scratch script, before any door opened;
     - run 2 crashed in the S3 screen, when a beam stratum had no smaller stratum to expand;
     - run 3 completed.
     - Their door logs were deleted with their outputs: 16 S1 doors, 1 S2 door, and 1 (run 2) or 2 (run 3) S3 doors,
       each with 1 or 16 members.
   - **What runs 2–3 printed:**
     - S1 completion lines (seconds, points);
     - S2 counts: 120 pairs, 15 groups, 88 then 178 contention rows, candidate-list sizes "10,4,10,3" in run 2 and
       "12,12,12,12" in run 3;
     - per stratum, proposal counts and stream names;
     - the mid/high pool counts;
     - "batchA 0 batchB 0".
   - **Run 4, 18:35–18:46Z** (after the review fixes): 26 door openings, all on the projection, end 2024-12-31, 1 or
     16 members. It printed:
     - "groups>1 1", 178 contention rows, list sizes 12,12,12,12;
     - per stratum "12+4" proposals plus null pools;
     - "diagnostics 16";
     - the table builder's counts (181 proposals, 48 high records, 0 nominations).
   - **Outcome-derived information seen,** coarse but real:
     - at toy budgets, the G and N candidate lists of run 2 were short (4 and 3), which suggests feasible or
       risk-passing standalone vectors may be scarce;
     - at toy budgets, nothing was nominated.
   - **What the toy runs changed:**
     - the beam's fallback to base sets when no smaller stratum exists (the run 2 crash);
     - two fail-safes after run 2: the N seeds and the protected list use the full constrained order of each ETF's
       best vector (feasible first, then by violation), and a primary list short of risk-passing candidates is filled
       with risk-flagged ones, labelled.

     The fail-safes make the lists exist; they favour no ETF. No budget, threshold or rule changed because of a smoke
     count.
4. **The independent methodology review** (`reviews/METHODOLOGY_REVIEW.md`, received about 18:16Z) found one critical,
   ten major and nineteen minor issues. All are resolved before the freeze, in code and in `PROTOCOL.md` §13, which
   carries the full resolution table.
   - **The main design changes:**
     - complete-linkage groups and direct-proxy rules (C1, M3);
     - round-robin beams and swaps (M1);
     - a pre-registered complementarity gate, a null reference, track sets as controls and negative-family
       declarations (M2);
     - Study 8's per-pool joint decisive design (M4);
     - three non-standalone-selected assignments (M5);
     - TD3 and ex-2020 (M6);
     - a neighbourhood-statistic PBO (M7);
     - leave-one-out contention metrics for every proposal (M8);
     - chain and pin hardening (M9);
     - tie-heavy and boundary parity gates (M10).
   - **Smoke run 4** exercised the revised code end to end. No outcome informed these changes: the review read no
     results.
5. **The verification pass** (`reviews/METHODOLOGY_REVIEW_VERIFICATION.md`, about 18:54Z, same reviewer). It
   confirmed every resolution except C1, which was partial (N1), and found eight minor issues (N2–N9). All are
   resolved before the freeze; `PROTOCOL.md` §13 has the second resolution table.
   - **The code changes:**
     - kept proxies may sit beside their anchor;
     - iterative S1 re-measurement;
     - nomination as a pure, unit-tested function;
     - Q8 requires centre net > 0;
     - renamed rejected-children counts;
     - the clean-TD3 label;
     - direct parity checks and door-log checks in every stage;
     - a like-for-like 64-point null;
     - ex-2020 annualized from sessions.
   - **Tests:** 16 unit tests pass (three new: complete linkage, the kept-proxy group rule, and nomination, slots and
     batches).
   - **Smoke run 5** exercised the revised code (same toy setup as run 4; outputs deleted unread). Only completion
     lines and record counts were printed.

## E1 — 2026-11-02T19:15:16Z — the loader-caller check matched its own source (post-freeze code fix)

**What happened.** The first `npm run study9 -- parity` (about 19:15Z) stopped inside `requireIntegrity`, before any
door opened. The new loader-caller check (`records.ts` `verifyDoorLog`) searches the namespace for the string
`loadNUniverse(`, and that string also appears in `records.ts` itself, so the check named `records.ts` as a caller
and refused.

**Exposure: none.**
- No door opened: `results/doors.jsonl` still holds only the pilot's line.
- No strategy computation ran and no parity record was written.

**The fix.**
- The check now matches the call pattern `loadNUniverse({`, assembled from parts so the file cannot match itself.
- The callers are unchanged: `door.ts` and `parity.ts`.
- No rule, budget, threshold or design changes.

**Acknowledgement.** `npm run study9 -- acknowledge-code E1` seals the new code digest (chain `code-E1`). Parity then
runs as its first complete execution.
