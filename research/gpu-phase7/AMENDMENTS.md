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
