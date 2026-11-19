## Summary

<!-- What changes and why. Link the brief, study or issue. -->

## Evaluation dependencies (standard 3.0.0 §9 — mandatory)

Does this change touch D1, Growth, the allocator/pool, entries, exits, risk controls, fills, costs, interest, the
records, the data loaders or any other file in the compatibility manifest
(`node --experimental-transform-types src/gpu-backend/compat.ts --manifest`)?

- [ ] **No** — `compat.ts --digest` is unchanged by this PR.
- [ ] **Yes** — every item below is done ([docs/gpu/PARITY_CHECKLIST.md](../docs/gpu/PARITY_CHECKLIST.md)):
  - [ ] the CUDA counterpart is implemented (or the feature's capability bit stays refused and the reachable-domain
        effect is stated)
  - [ ] [docs/gpu/FEATURE_MATRIX.md](../docs/gpu/FEATURE_MATRIX.md) updated
  - [ ] Apollo GPU verification run and recorded: parity campaign (zero mismatches), determinism, compute-sanitizer,
        negative tests, fixed-seed mini-optimization — paths: `<research/…/results/…>`
  - [ ] new acceptance record written by the acceptance tool (`config/gpu-backend/acceptance.json`) — or the PR states
        that official GPU optimization stays blocked until it is

A CPU-only CI pass is **never** parity evidence.

## Official optimization (standard §9)

- [ ] No CPU path can score an official evaluation (no fallback, no `auto` backend, no hybrid)
- [ ] Any new search entrypoint uses `openOfficialGpuSession` or is registered as a legacy/non-official runner
      (`node --experimental-transform-types src/gpu-backend/entrypoints.ts --write`)
- [ ] Any new research npm script goes through `src/gpu-backend/legacyRunner.ts` (or is a utility)

## Tests

- [ ] `npm test` (known pre-existing failures listed separately)
- [ ] `npm run research-preflight -- --all`
- [ ] Strategy Lab regression where the UI or its evaluator is touched

## Frozen research

- [ ] No frozen study's protocol, records, phenotypes or engine fingerprints are edited, re-hashed or rerun
