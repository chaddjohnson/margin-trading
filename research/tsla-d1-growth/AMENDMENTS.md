# Amendments — P6-TSLA 1.0.0 (append-only)

Every change after the protocol freeze is recorded here: ID, UTC time, the change, why, which results existed, and its
effect (standard §0.2 [A]). Pre-freeze implementation refinements are `E*`; after the freeze: disclosures `D*`, operational
`O*` and code `A*` (defect fixes that change no rule, each with a sealed record of the changed code digest in
`results/amendments/`). Criteria are never loosened once a result they govern exists.

## Pre-freeze implementation notes

- **E1 — 2026-11-25T12:25Z — Playwright e2e reported beside gate E8.** Four whole Strategy Lab e2e runs each had one
  failure from two documented timing races in the test code (run 1 `strategy-lab.spec.ts:311`; runs 2–4
  `candles.spec.ts:439`, "Expected < 58, Received 698": the width read right after the resize); every one of the 81 tests
  passed in at least one run; `apps/` is unchanged on this branch and the candles test uses VGT only;
  `state/strategy-lab` unchanged. The protocol's E8 (§13, written before these runs) and the brief name Strategy Lab
  typecheck, Vitest and portfolio parity, which passed; Priority 5's recorder had also required one green e2e run, so the
  TSLA recorder reports the e2e attempts beside the gate (`results/engineering/E8-regression.json`
  `playwrightE2eReported`). No test was edited or skipped.
- **E2 — 2026-11-25T11:42Z — R_S rule and refinement seeds (before the freeze).** See `DECISION_REGISTER.md` A5–A6: the
  cost-based draft (R_S = 22 from an unrepresentative pilot frozen D1) was replaced by the lane-count rule R_S(F) =
  max(4, ⌈160 ÷ 6F⌉); refinement seeds ≤ 24 per cell. The code-dependent gates E2–E6 were rerun on the final code
  (`TSLA_ENG_TAG=final`; the first runs, on an earlier digest, also passed and remain in Git history).

## After the freeze

- **A1 — 2026-11-25T14:01Z — arm S refinement lanes register the frozen D1 finalists (code defect; no rule changed).**
  The chain stopped at `C19-S-refine` (13:58:13Z, exit 1, 0.4 s): `partSpecs(…, 'refine')` in
  `src/tsla-d1-growth/stages.ts` canonicalized the sealed broad members' S configurations without first registering the
  cutoff's sealed frozen D1 finalists (`results/frozen-d1/C19.json`), so `cellOf('S.C19F1.…')` threw "frozen D1 C19F1 is
  not registered". It failed before any job was opened and before any evaluation was requested (no job directory, no
  ledger use). Every other reader of S cells already registers them first (`ensureFrozen`: broad lanes, replicate rounds,
  qualification, the refinement plan, the selection, the slices). The fix adds that call for arm S at the top of the
  refinement branch (3 lines). **Results that existed:** C19 arms D, G and J complete and sealed through their arm
  selections, C19 arm S frozen D1, broad lanes, replicate round 1 decision, broad qualification and refinement plan
  sealed (commits `9870392d` … `a7d23b89`). **Effect:** none on any rule, cell, lane, seed, replicate, budget, statistic or
  existing result. A fresh-process check builds the same refinement specs for D, G and J (32, 24 and 64 lanes) and arm S's
  48 lanes (the sealed plan's 12 cells × 4 replicates, 1,152 seed slots). Checks: tsc, ESLint (no new warning), the
  study's 18 tests, the research preflight (PASS) and `tools/gpu-backend/verify-acceptance.sh` (VERIFIED: the GPU
  evaluator, the acceptance record and its pinned files are untouched; the study code is outside the evaluation
  manifest). Code digest `418a8758…` → `fb7e6ddc…`, sealed in `results/amendments/A1.json`. The chain was relaunched with
  its unchanged idempotent command and resumes at `C19-S-refine`.
