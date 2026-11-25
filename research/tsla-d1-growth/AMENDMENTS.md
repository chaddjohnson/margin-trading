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

(none)
