# CPU/GPU parity checklist and merge gate (mandatory)

Normative source: [OPTIMIZATION_STANDARD.md](../research/OPTIMIZATION_STANDARD.md) §9 (from 3.0.0). This checklist is the
engineering procedure that implements it. **The TypeScript/CPU engine is the authoritative implementation; the CUDA C++
evaluator (`src/gpu-backend/cuda/`) is its parity-gated accelerator for official optimization.** Strategy Lab and every
diagnostic keep running on the CPU engine.

## 1. When this checklist applies

Any change to — or new dependency of — historical strategy evaluation:

- D1 entries, exits, trailing buy, continuation, holds, buffers, RC 1 / RC 2 risk controls, the decline gate;
- Growth 1.4.0 (entries, trend filters, eligibility, the drawdown recovery gate, exits, the initial stop, retention,
  continuation methods) and any new Growth version;
- the pooled allocator (funding, tie order, reservations, partial exits, marks, drawdown trackers, options);
- fills and same-bar semantics, costs, slippage, interest, the session clock, the data loader or adjustments;
- the compact or detailed record, risk metrics that an optimization reads (e.g. the risk-envelope inputs);
- a new conditional genome parameter or structural gene that an optimizer can generate.

The mechanical trigger: a change to any file of the **compatibility manifest** (`node --experimental-transform-types
src/gpu-backend/compat.ts --manifest`: the import closure of the canonical evaluation path, the CUDA sources and the GPU
host path). `npm test` (`src/gpu-backend/tests/policy.test.ts`, "MERGE GATE") fails while
`config/gpu-backend/acceptance.json` no longer matches the tree. A source digest is necessary, not sufficient: the
runtime comparison suites below are what prove semantic parity.

## 2. The change checklist (every item before merging or using the change for official research)

1. **CPU reference first.** Implement the change in TypeScript with its own unit tests (synthetic) and real-data tests.
2. **CUDA counterpart.** Port it line for line into `src/gpu-backend/cuda/` (same operation order, binary64, no FMA,
   JavaScript `Math.max/min` semantics, V8's `log/exp` from `v8math.cuh`, host-computed fractions by the CPU's own
   expressions). A per-candidate error status for every new CPU throw. A capability bit for every new feature
   (`gb.h` `GbFeature`, `layout.ts FEATURE`, `encode.ts`), refused by older servers.
3. **Encoder and domain.** Encode the new parameters in `src/gpu-backend/encode.ts`; extend `src/gpu-backend/domain.ts`
   so the preflight sees every new structure the search can reach.
4. **Layout.** If `gb.h` changes, update `layout.ts`; `src/gpu-backend/tests/layout.test.ts` must pass.
5. **Parity fixtures.** Extend the subject sets (`src/gpu-phase2/subjects.ts` strata, `fixtures.ts` adversarial doors)
   so the new feature and its edge cases occur many times.
6. **Run the Apollo GPU verification (required; CPU-only CI is never complete parity):**
   - `tools/gpu-backend/build.sh <binary> $(node --experimental-transform-types src/gpu-backend/compat.ts --digest)`;
   - the parity campaign `research/gpu-phase2/chains/parity.sh` (or a successor acceptance study's chain): every door,
     ≥ 100,000 seeded random genomes, every structural value, every option set, adversarial fixtures, determinism —
     **zero tolerance**;
   - `tools/gpu-phase2/sanitize.ts` (memcheck with leak check, racecheck, initcheck, synccheck: 0 errors);
   - the negative tests `tools/gpu-phase2/negative.ts`;
   - the fixed-seed mini-optimization on both backends (`tools/gpu-phase2/mini-opt.ts` + `mini-opt-compare.ts`):
     identical.
7. **Regenerate the acceptance record** (`tools/gpu-phase2/accept.ts`) only when every gate passed; it binds the new
   compatibility digest, the binary sha256, the device and the evidence hashes. Commit it with the change.
8. **Update the feature matrix** ([FEATURE_MATRIX.md](FEATURE_MATRIX.md)): the TypeScript feature, its CUDA
   counterpart, the capability bit, the tests and the evidence.
9. `npm test` (the merge gate passes again), the TypeScript/ESLint checks, Strategy Lab's suites.

## 3. A feature that is not ported yet

A new feature may exist for the CPU (Strategy Lab, diagnostics) before its CUDA port. Until the port and its parity
evidence exist, **official optimization involving it is blocked**: its capability bit is outside the server's supported
set, so the preflight of any search domain that can reach it refuses to start (`openOfficialGpuSession` "capability").
Never omit a feature silently from an optimization's reachable genome to get past the gate; a study that deliberately
excludes it declares the reduced domain in its protocol.

## 4. Official runs (summary of §9)

- Official optimization runs only through `openOfficialGpuSession` (src/gpu-backend/official.ts) and the attested
  `GpuPool` (src/gpu-backend/pool.ts) inside an `EvalLab` (src/gpu-backend/lab.ts). There is no CPU path; no `auto`
  backend; a resumed run passes the whole gate again.
- Every batch has a device receipt (UUID, nonce, device execution counters, output checksum) in the run's ledger; the
  conservation invariant (submitted = GPU-returned + failed + in flight; CPU-scored = 0) is checked per batch and at the end.
- Legacy CPU runners start only with an explicit non-official purpose (`GPU_POLICY_PURPOSE=cpu-reference|diagnostic|…`,
  `src/gpu-backend/legacyRunner.ts`); `official-optimization` is refused on the CPU.

## 5. Provenance

Every official archive row is bound to `(study, job, door, door pin, evaluation-code digest, backend)` where backend =
`gpu:<device uuid>:<binary sha256>:<compatibility digest>`; the attestation (`research/<study>/results/
gpu-attestations/*.json`) records the device, driver, runtime, compiler flags, dataset sha256 and data sha256 of both
symbols, the capability set, the smoke result and the parity mini-set. Completed studies keep their original engines and
records: nothing is ever re-hashed or rewritten to look GPU-compatible.
