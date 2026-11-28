# AMENDMENTS — P8-GDX (append-only)

Pre-freeze entries `E*` refine the implementation before `results/protocol-freeze.json` exists. After the freeze:
disclosures `D*`, operational changes `O*` and code amendments `A*` (each a sealed record of the changed code digest). No
criterion is ever loosened; nothing is deleted.

## Pre-freeze

- **E1 (2026-11-26, before any official evaluation).** Phase 0: the reusable identity-join module (`src/research-outcome/
  identityJoin.ts` and its 12 tests) was integrated by cherry-picking `aca31b5fd595850050ca629ef3ac9208a84c9894` alone onto
  the study base `421e4c87` (commit `a33c6ff1`; byte-identical; the TSLA research history, its sealed records and the TSLA
  `outcome.ts` patch were not merged). The study's own `outcome.ts` joins by (population, id) and fails closed (PROTOCOL
  §12); the GPU acceptance is unaffected (the module is outside every manifest; E1).
- **E2 (2026-11-26).** Data finding disclosed before the freeze: the canonical closing-print proxy differs from the
  official auction close on 2020-03-18 (5.2 %) and 2020-03-17 (1.2 %) (`GDX_DATA_AUDIT.json` `findings`); kept (the frozen
  data path of every study and of the accepted evaluator), not repaired.
