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
host path — the batch codec, the client, the encoder, the parallel host path and its worker, the pool; their combined
*evaluation digest* is compiled into the binary) or of the **enforcement group** (`compat.ts --policy`: the official
gate, the acceptance validator and generator, purposes and runner gates, the domain derivation, the entrypoint audit and
registry, the Lab, the preflight rules, the tools and the merge-gate tests; pinned by the acceptance record, see §2a).
`npm test` (`src/gpu-backend/tests/policy.test.ts`, "MERGE GATE"; `enforcement.test.ts`) fails while
`config/gpu-backend/acceptance.json` no longer matches the tree, and every GPU-backend file must belong to one of the two
groups. A source digest is necessary, not sufficient: the runtime comparison suites below are what prove semantic parity;
and a digest is not a signature (see `research/gpu-phase3/GPU_ENFORCEMENT_INTEGRITY.md` for the root of trust).

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
   - the parity campaign `research/gpu-phase3/chains/parity.sh` (or a successor acceptance study's chain; Phase 2's
     `research/gpu-phase2/chains/parity.sh` is the original): every door, ≥ 100,000 seeded random genomes, every
     structural value, every option set, adversarial fixtures, determinism across batch sizes, input order and
     host-worker counts — through the host path the official pool uses — **zero tolerance**;
   - `tools/gpu-phase3/sanitize.ts` (memcheck with leak check, racecheck, initcheck, synccheck: 0 errors);
   - the negative tests `tools/gpu-phase3/negative.ts` and the source-tamper suite `tools/gpu-phase3/tamper.ts`;
   - the fixed-seed mini-optimization on both backends and interrupted/resumed (`tools/gpu-phase3/replay.ts --job
     mini` + `compare.ts arms`), and replays of sealed optimizer jobs (`replay.ts --job a3:C19:broad1`, `a2:C19:base`,
     `compare.ts sealed`): identical.
7. **Regenerate the acceptance record** (the acceptance study's generator, e.g. `tools/gpu-phase3/accept.ts`) only when
   every gate passed, on a committed tree; it binds the evaluation digest, the enforcement group, the source revision,
   the binary sha256 (reproducible: `tools/gpu-backend/build.sh`), the device and the evidence hashes (schema 2). Commit
   it, and keep its sha256 and the commit SHA outside the repository (the handoff) as the out-of-band pin.
8. **Update the feature matrix** ([FEATURE_MATRIX.md](FEATURE_MATRIX.md)): the TypeScript feature, its CUDA
   counterpart, the capability bit, the tests and the evidence.
9. `npm test` (the merge gate passes again), the TypeScript/ESLint checks, Strategy Lab's suites.

## 2a. An enforcement-only change (policy group) — proportionate re-verification

A change that touches only the enforcement group (and no file of the evaluation manifest: the binary and its digest stay
the same) does not need new kernel evidence, but the acceptance is STALE until it is re-verified:

1. the change with its tests (`src/gpu-backend/tests/policy.test.ts`, `enforcement.test.ts`), `npm test`;
2. on Apollo: the negative tests (`tools/gpu-phase3/negative.ts`) and the source-tamper suite (`tools/gpu-phase3/tamper.ts`,
   a sandbox clone; it never modifies the main checkout), the live official preflight
   (`tools/gpu-backend/official-preflight.ts`) and the independent verifier (`tools/gpu-backend/verify-acceptance.sh`);
3. the acceptance generator (`tools/gpu-phase3/accept.ts` or a successor study's) writes a new record: the evaluation
   evidence of the previous record is still valid only while every evaluation file and the binary are unchanged (the
   generator checks each evidence file against the binary), the enforcement evidence is fresh;
4. a change to the host path, the CUDA sources or a mirrored CPU source is never "enforcement-only": it follows §2.

## 3. A feature that is not ported yet

A new feature may exist for the CPU (Strategy Lab, diagnostics) before its CUDA port. Until the port and its parity
evidence exist, **official optimization involving it is blocked**: its capability bit is outside the server's supported
set, so the preflight of any search domain that can reach it refuses to start (`openOfficialGpuSession` "capability").
Never omit a feature silently from an optimization's reachable genome to get past the gate; a study that deliberately
excludes it declares the reduced domain in its protocol.

## 4. Official runs (summary of §9)

- Official optimization runs only through `openOfficialGpuSession` (src/gpu-backend/official.ts) and the attested
  `GpuPool` (src/gpu-backend/pool.ts) inside an `EvalLab` (src/gpu-backend/lab.ts). There is no CPU path; no `auto`
  backend; a resumed run passes the whole gate again. The gate starts the run's host path (worker threads that encode
  and decode batches, `hostPipeline.ts`; `hostWorkers` 0 = the serial path), runs its parity mini-set through it, and
  the pool uses that attested pipeline. An official study's npm script starts its runner through
  `src/gpu-backend/officialRunner.ts` (purpose official-optimization, the study's preflight, a module that imports the
  gate), never through the legacy runner gate.
- Every batch has a device receipt (UUID, nonce, device execution counters, output checksum) in the run's ledger; the
  conservation invariant (submitted = GPU-returned + failed + in flight; CPU-scored = 0) is checked per batch and at the end.
- Legacy CPU runners start only with an explicit non-official purpose (`GPU_POLICY_PURPOSE=cpu-reference|diagnostic|…`,
  `src/gpu-backend/legacyRunner.ts`); `official-optimization` is refused on the CPU.

## 5. Provenance

Every official archive row is bound to `(study, job, door, door pin, evaluation-code digest, backend)` where backend =
`gpu:<device uuid>:<binary sha256>:<compatibility digest>`; the attestation (`research/<study>/results/
gpu-attestations/*.json`) records the device, driver, runtime, compiler flags, dataset sha256 and data sha256 of both
symbols, the capability set, the smoke result, the host path and the parity mini-set, the acceptance record's sha256 and
the Git HEAD the run started from (pinned files committed and unmodified). Completed studies keep their original engines and
records: nothing is ever re-hashed or rewritten to look GPU-compatible.
