# GPU final parity and acceptance (GPU Phase 3)

**Standard: bit-identical, zero tolerance** (IEEE-754 binary64; PROTOCOL.md §6–§9). Every comparison is an exact
equality of canonical hashes or values; no tolerance, rounding or ULP allowance anywhere. Final binary
`research/gpu-phase3/build/gb3`, sha256 `06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23`
(compatibility digest `30824182b111fa12fadc23502ee08c8e60d10ed881767c9c64ab480c5f5c2998`), the final host path (8 worker
threads unless a row says otherwise), RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`.

## 1. What changed, and therefore what had to be re-proven

| Component | Changed in Phase 3? | Evidence that it is still exact |
|---|---|---|
| CUDA kernels and server | **no** — the device code (`.nv_fatbin`, 2,064,184 bytes) and its SASS (160,991 lines) are byte-identical to the accepted Phase 2 binary `3fe09e67…` (`results/final-binary.json`); only the compiled-in digest string differs | Phase 2's kernel evidence applies (incl. its 8 h endurance run); and every check below ran on the final binary |
| Canonical CPU engine (94 files) | **no** (digest `c8a9f416…` unchanged) | — |
| Host path: request encoding, response verification and decoding, record reductions, pool | **yes**: one batch codec (`batch.ts`) for both paths; worker threads (`hostPipeline.ts`, `hostWorker.ts`, `hostDoor.ts`); in-order release in `GpuPool` | §2–§6 |
| Enforcement and acceptance | **yes**: manifest v2, schema 2, gate checks (pins, source, host path), official runner, verifier | `GPU_ENFORCEMENT_INTEGRITY.md`; §7 |

## 2. Gate results (the final campaign, `chains/final.sh`, commit `d113e6c5`)

FILL.

## 3. The parity campaign through the final host path (H2)

FILL from `results/parity/final/SUMMARY.json`.

## 4. Optimizer identity (H3)

FILL.

## 5. Sanitizer (H4), negative and tamper tests (H5, P5), sustained run (H6)

FILL.

## 6. Repository and Strategy Lab (H7)

FILL.

## 7. The acceptance record

FILL.

## 8. CPU fallback policy (unchanged in substance, tightened in enforcement)

- Official optimization is GPU-only: no CPU fallback, `auto` backend or hybrid; a CPU-scored evaluation withholds the
  batch and fails the job (negative test "CPU-scored evaluation"); legacy CPU runners refuse `official-optimization`.
- The serial host path (`hostWorkers` 0) is a second *GPU* host path (the same codec on the main thread), never a CPU
  evaluation; a host-worker failure fails the job closed — it never falls back to the serial path or to the CPU.

## 9. Residual limitations

- The bounded sustained run lasted ≈ 45 min, not hours: faults rarer than about once per hour of operation are not
  excluded for the new host path; Phase 2's 8 h run covers the unchanged kernels and server.
- The device output checksum covers the fixed per-candidate structs, not the variable-length sections (trades, lots,
  funding, daily series) — unchanged Phase 2 design; parity evidence covers their correctness.
- Complete jobs were replayed on door D19 (both sealed jobs are C19 jobs); longer doors are covered by the parity
  campaign and the sustained run's rounds on D21, D23, D24 and FULL.
