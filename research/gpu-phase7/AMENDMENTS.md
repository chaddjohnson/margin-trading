# AMENDMENTS — GPU Phase 7 (append-only)

Each entry: ID, UTC time, the change, why, which results existed, its effect. Criteria are never loosened.

- **D0 (disclosure, before the freeze, 2026-11-21T20:4xZ).** Development runs before the protocol freeze, kept and NOT
  evidence: `results/dev/risk-parity-dev-smoke-D24.json` and its two jobs `results/jobs/riskpar-dev-smoke-D24-{gpu,cpu}/`
  (a 98-subject smoke of the risk-delivery parity on a development build `build/gb7-devtest` of the uncommitted tree;
  it passed). Two engineering corrections were made before the freeze: the risk-parity worker imports the envelope
  reference from a side-effect-free module (`src/gpu-phase7/envelope.ts`) so that the CPU evaluation worker does not
  register the reference worker's message handler; the pool contract test (`hostPipeline.test.ts`) expects
  `{ ...record, envelope }` for its risk tasks (the documented new contract).
