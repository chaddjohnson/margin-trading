# P0 — repository state, active research and cross-branch compatibility (Assignment 1 §3)

**Starting state (checked 2026-11-27T19:15Z).**
- **Branch:** `feature/research-date-boundaries` at `9d2eaec4`, equal to `origin`; working tree clean; main checkout
  only (no other worktree).
- **Processes:** no research or optimization process running, and no Strategy Lab server (nothing on 4317; no
  `strategy-lab` user service installed).
- **Other sessions:** one unrelated Claude session in another project.
- **GPU:** RTX 5090 idle (only the desktop compositor).
- **Canonical data:**
  - VGT 53,976,698 B (`dfde0f77…`) and GDX 80,741,665 B (`aa23522d…`), both through 2026-11-25;
  - every other symbol unchanged by the 2026-11-27 append.

## 1. Branch topology

- **One linear lineage ends at this branch.** Each branch below is an ancestor of HEAD, so none is ahead of it:
  1. `main` `3606f4b3` (GPU Phase 6);
  2. `cleanup/storage-2026-11-21`;
  3. `research/gpu-phase7-risk-envelope-readiness` `fc027eed`;
  4. `research/vg-l0-risk-envelope-pilot` `7f69d0d2`;
  5. `research/vg-l0-risk-envelope-sensitivity` `0c2f9dd5`;
  6. `research/vg-l0-risk-envelope-stage-b` `1c1f9e72`;
  7. `research/vg-l0-risk-envelope-stage-b-diagnostics` `48090c55`;
  8. `research/vg-l0-trailing-stop-audit` `5d587bb2`;
  9. `research/vg-l0-n-original-successor` `dc023c3b`;
  10. `research/tsla-d1-growth` `421e4c87`;
  11. `research/gdx-d1-growth` `03f3500c`;
  12. `feature/research-date-boundaries`.
- **Divergent, not in HEAD:**
  - `research/vg-l0-staged-trailing-stop` `4a89d02a` (Priority 4, staged stops): 57 own commits from `5d587bb2`.
    - It carries its own GPU Phase 8 acceptance (record `c02a8a92…`, binary gb8) and Growth engine 1.5.0, with 2
      declared Priority 5A test failures.
    - Outcome INCONCLUSIVE; nothing adopted.
  - `fix/tsla-outcome-identity-join` `b0a18659`: 3 own commits from `421e4c87` (the outcome identity join).
- **Older branches** (Studies 3–9, earlier priorities, GPU Phases 1–6, the storage audit) are history: complete, with
  nothing pending. Eleven remote-only branches are earlier research, not checked out here.
- **Active research:** none running. Every recent study's checkpoint says COMPLETE (gpu-phase7, the risk-envelope
  pilot, sensitivity, Stage B, Stage B diagnostics, the trailing-stop audit, staged stops, P5-NS, TSLA, P8-GDX). Their
  follow-up gates are the user's reviews.

## 2. GPU acceptance records

| Where | Record | State |
|---|---|---|
| `main` | GPU Phase 6 `3610caaf…` (binary f444c521…) | ACCEPTED there (not re-verified in this task) |
| Phase 7 lineage (gpu-phase7 → … → gdx-d1-growth) | GPU Phase 7 `bb0e3fcf…` (binary gb7 `cb2ff30b…`) | ACCEPTED on `research/gpu-phase7-risk-envelope-readiness` |
| **this branch** | the same Phase 7 record | **STALE**: pinned files changed (`src/lib/{csv,evaluation}.ts`, `src/vg-d1-growth-joint/{context,data}.ts` in the previous assignment; `src/research-standard/preflight.ts` and `config/gpu-backend/entrypoints.json` then and now) |
| `research/vg-l0-staged-trailing-stop` | GPU Phase 8 `c02a8a92…` (binary gb8) | ACCEPTED on that branch |

The appended data do not make any record stale by themselves: no acceptance record hashes a data file.

## 3. Effects of the appended VGT/GDX rows

| Affected | Effect | Category (§3 of the brief) |
|---|---|---|
| **This branch** | Priority 3's FULL door reads the pinned byte prefix: identical doors, replays, GPU dataset export (`6e977ccd…`, the accepted one) and Strategy Lab parity. | resolved here (previous assignment); verified again in this one |
| **`main` and every other branch with Priority 3's whole-file FULL check** (all of them except this one; the identical code at `main`, `03f3500c` and `vg-l0-staged-trailing-stop` refuses "the canonical … file changed") | FULL is unusable there with today's files. This breaks Strategy Lab Portfolios (`main` has Priority 6), every P3-family FULL stage, GPU parity or validation on FULL (`src/gpu-backend/doors.ts`) and the tests that open FULL. The D19–D24 door copies are unaffected. | needs **integration of this branch** (FULL's prefix verification), or a historical reproduction environment for work at an older commit |
| **Completed studies with their own whole-file checks** | They fail closed at HEAD and on every branch. | needs a **historical reproduction environment** (`HISTORICAL_COMPATIBILITY.md`; verified mechanism) |
| **`research/vg-l0-staged-trailing-stop`** | Its FULL stages and GPU parity would refuse with today's files. Its own acceptance (Phase 8) is unaffected as a record. | needs **changes to that branch** (this branch's FULL fix merged into it) **or** its integration into the final code state before Assignment 2's acceptance; **user decision** |
| **`fix/tsla-outcome-identity-join`** | Not data-related. It overlaps this lineage in `src/research-outcome/identityJoin.ts` and its test, a likely merge conflict. | **user decision** (integrate or leave) |
| **Ongoing optimization processes** | None exist. | n/a |
| **Historical whole-file hash checks** | Fail closed, never pass silently. Golden masters use `historicalPin` and run instead of skipping. | by design |
| **GPU acceptance verification** (`tools/gpu-backend/verify-acceptance.sh`) | Unaffected by data (it checks code, binary and record). On this branch it reports the changed pinned files: STALE. | Assignment 2 |
| **CPU/GPU parity checks** | On this branch they run on FULL's verified prefix (previous assignment: 204/204 bit-identical; repeated in this task, `TESTS_AND_INTEGRITY.md`). On other branches FULL refuses. | Assignment 2 (acceptance on the final code) |
| **Risk-envelope pilot** | The pilot itself (NL0-REP 1.0.0) is **COMPLETE** (2026-11-22, outcome "worse"); Stage A sensitivity, Stage B and the Stage B diagnostics are COMPLETE too (DECISION_REGISTER R1–R7: keep P0, close the envelope work; awaiting the user's review). Nothing is pending or startable here, and nothing was started. A reproduction of any of them at its commit needs the reproduction environment (FULL's whole-file check at those commits). | historical reproduction environment |

## 4. Merge and integration dependencies (for Assignment 2)

1. **Fast-forward possible to `main`.** `main` is an ancestor of this branch, so a merge into `main` (when
   authorized) is a fast-forward of 13 lineage branches' work.
   - It carries GPU Phase 7 (accepted on its own branch, never merged).
   - It carries standards 4.0.0 and 5.0.0.
2. **`research/vg-l0-staged-trailing-stop`:**
   - **Textual overlap:** only `config/gpu-backend/entrypoints.json` and `package.json`. `config/gpu-backend/acceptance.json`
     changed only there.
   - **Semantic overlap:** large. It adds evaluation code (staged stops, RC 3, Growth 1.5.0) with CUDA counterparts in
     its gb8 binary.
   - **Decision for the user:** if it is to be part of the final code state, it must be merged **before** Assignment
     2's re-acceptance, because the acceptance should be done once on the final code. Its 2 declared Priority 5A
     failures come with it.
3. **`fix/tsla-outcome-identity-join`:** a conflict in `src/research-outcome/identityJoin.ts` and its test. Integrate
   before or after the acceptance; it is not an evaluation dependency.
4. **Strategy Lab on `main`:** it stays broken for Portfolios with today's data until this branch is integrated. The
   user can run Strategy Lab from this branch meanwhile (`STRATEGY_LAB.md`).

## 5. Decisions for the user

- Whether `research/vg-l0-staged-trailing-stop` (and its Phase 8 acceptance line) is integrated before the Assignment 2
  re-acceptance.
- Whether `fix/tsla-outcome-identity-join` is integrated, and when.
- When to merge this branch into `main`, after Assignment 2's re-acceptance. Nothing was merged in this assignment.
