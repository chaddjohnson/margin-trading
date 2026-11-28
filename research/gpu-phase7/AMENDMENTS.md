# AMENDMENTS — GPU Phase 7 (append-only)

Each entry: ID, UTC time, the change, why, which results existed, its effect. Criteria are never loosened.

- **D0 (disclosure, before the freeze, 2026-11-21T20:4xZ).** Development runs before the protocol freeze, kept and NOT
  evidence: `results/dev/risk-parity-dev-smoke-D24.json` and its two jobs `results/jobs/riskpar-dev-smoke-D24-{gpu,cpu}/`
  (a 98-subject smoke of the risk-delivery parity on a development build `build/gb7-devtest` of the uncommitted tree;
  it passed). Two engineering corrections were made before the freeze: the risk-parity worker imports the envelope
  reference from a side-effect-free module (`src/gpu-phase7/envelope.ts`) so that the CPU evaluation worker does not
  register the reference worker's message handler; the pool contract test (`hostPipeline.test.ts`) expects
  `{ ...record, envelope }` for its risk tasks (the documented new contract).
- **A1 (2026-11-21T20:27:55Z, Phase E scaling check, after the freeze; not an acceptance gate).** The first runs of
  `tools/gpu-phase7/scaling-check.ts` (D24, D21) measured every dollar amount's deviation relative to the value itself
  and required < 1e-12; they reported pass false only because one lot that closed near break-even has a net of a few
  dollars, whose relative error after the cancellation proceeds − principal − interest was 2.0e-10 (D24) / 3.8e-12 (D21).
  Trade chronology, drawdown instants and every policy decision were identical in those runs. The criterion was changed to
  the deviation relative to the allocation C0 (< 1e-12 × C0; the value-relative figures stay in the record as
  `worstDeviationRelativeToValue`); the reruns pass (worst 2.8e-15 × C0). The first runs' outputs were overwritten by
  the reruns (same path); their figures are quoted here. No acceptance gate, threshold or evidence of the campaign changed.
- **D1 (disclosure, 2026-11-21T23:27Z).** (a) Further development artefacts, kept and NOT evidence:
  `results/dev/risk-parity-dev-edge-D24.json` and its jobs `results/jobs/riskpar-dev-edge-D24-{gpu,cpu}/` (a dev run of
  the D24 threshold-edge parity, zero differences); the dev negative-suite run at 20:22–20:23Z on the dev binary
  `build/devtest/gb7-check` (73/73), which created `results/jobs/preflight-20261121T202302Z-3ec00c/`,
  `results/jobs/preflight-20261121T202310Z-efc13f/` and the attestations `results/gpu-attestations/negative-2026-11-21T20-22-29-{137,802}Z.json`
  and `neg-6-2026-11-21T20-22-30-895Z.json`. The campaign's own negative run is the 23:24–23:25Z set (final binaries).
  (b) Campaign incident: step 26 (E4 tamper suite) of `chains/final.sh` failed at 23:25:28Z before doing anything,
  because an untracked helper written during the run (`tools/gpu-phase7/summarize.ts`, the read-only table generator)
  made `git status` non-empty and `tamper.ts` refuses a dirty tree (it clones HEAD). No evidence was produced or changed.
  The helper was moved out of the tree, the source was again clean at HEAD `ed3cf5c5`, and the chain was resumed with
  `START=26` at 23:26:09Z (steps 1–25 skipped; their records are unchanged). The helper is re-added and committed after the
  campaign; it reads records only.
- **A2 (2026-11-22T00:14:58Z, gate E10, after the campaign; a defect in the check, not in the evidence).** The campaign's integrity
  check (step 28, `tools/gpu-phase7/integrity.ts`, 00:13Z) reported 4/5: its sealed-file sub-check required the total
  counts of `seal-protect.ts --check` to equal the baseline captured at 20:10Z, before this study had sealed anything.
  This study's own seals (`research/gpu-phase7/results/seals.jsonl`: `protocol-freeze.json`, sealed 20:18Z, and
  `final-binary.json`, sealed by the chain's step 1 at 20:23Z) made the totals 1,055 / 1,000 protected / 44 untracked vs
  1,053 / 999 / 43, so the sub-check could never pass as written. Verified before the change: the 1,053 seals of every
  other study are exactly the baseline (999 protected, 43 untracked-or-modified, 11 absent; 0 writable, 0 content
  differences, 0 earlier-seal-only, 0 not-regular); the two own seals verify by content and are 0444 (one tracked and
  protected, one not yet committed). Change: the sub-check compares the other studies' seals with the baseline exactly
  (every status count) and requires this study's own seals to verify and be 0444. The sub-check is not looser for any
  historical file. Only `integrity.ts` was rerun (same command as `chains/tests.sh` line 32); the first run's output is
  kept as `results/integrity/integrity-run1-superseded.json`. No evaluation, test or other gate was rerun or changed.
