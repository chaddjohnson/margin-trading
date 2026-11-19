# Contributing

Read [CLAUDE.md](CLAUDE.md) first: it holds the repository's standing rules (GPU-only official optimization and
CPU/GPU parity, delivery, reporting, context recovery, the optimization standard).

The CUDA evaluator, the enforcement code (official gate, purpose gate, preflight §9 rules, policy tests) and the GPU
tools named below live on branch `research/gpu-phase2` until the user approves merging them into `main`.

## Changing strategy or evaluation code

The TypeScript/CPU engine is the **authoritative reference** and Strategy Lab's evaluator; the CUDA C++ evaluator
(`src/gpu-backend/cuda/`) is the accelerator that runs every official optimization
([OPTIMIZATION_STANDARD.md](docs/research/OPTIMIZATION_STANDARD.md) §9, from 3.0.0). Therefore:

1. Any change to D1, Growth, the allocator/pool, entries, exits, risk controls, fills, costs, interest, the records,
   the data loaders or any other evaluation dependency follows [docs/gpu/PARITY_CHECKLIST.md](docs/gpu/PARITY_CHECKLIST.md):
   the CPU change, its CUDA counterpart, the feature matrix, and Apollo GPU parity evidence **before** the change is
   merged or used for official research.
2. Parity means **bit-identical canonical records** (IEEE-754 binary64, the JavaScript operation order). A difference
   is a defect, never a tolerance.
3. A feature may exist on the CPU before its port (Strategy Lab, diagnostics); official optimization that can reach it
   stays blocked (its capability bit is refused) until the port and its evidence exist.
4. `npm test` includes the policy tests (`src/gpu-backend/tests/policy.test.ts`). A CPU-only CI pass is never parity:
   the Apollo GPU verification step and a new acceptance record are required (see the PR template).

## Running research

- Official optimization: only through `openOfficialGpuSession` (src/gpu-backend/official.ts); it is blocked until
  `config/gpu-backend/acceptance.json` is ACCEPTED and matches the tree.
- CPU evaluation: only with an explicit non-official purpose, e.g. `GPU_POLICY_PURPOSE=cpu-reference npm run <script>`.
  Such results are never official optimization evidence.
- Operations (build, server, preflight, telemetry, troubleshooting): [docs/gpu/README.md](docs/gpu/README.md).

## Frozen research

Completed studies under `research/` are frozen: their protocols, records, phenotypes and engine fingerprints are never
edited, re-hashed or rerun. A new question gets a new study namespace.
