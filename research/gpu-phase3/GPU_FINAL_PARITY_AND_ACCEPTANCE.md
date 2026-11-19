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

`chains/parity.sh` with `PARITY_OUT=results/parity/final`, 2026-11-19 17:23 → 19:14Z, every run a contained sub-unit,
fail-fast, each run's GPU side through the parallel host path with 8 workers; summary `results/parity/final/SUMMARY.json`
(every check true). This study's own seeds (`deriveSeed('gpu-phase3', …)`): the random genomes and adversarial fixtures
are **new** relative to Phase 2's campaign.

| Coverage | Value |
|---|---|
| Runs / candidates / identical / mismatches | 54 / 144,795 / 144,795 / **0** |
| Seeded random Assignment 3 genomes (coarse and fine grids) | 141,600 (≥ 100,000 required) |
| By set | R 175, A 141,600, G 2,828, B 64, N 128 |
| Distinct Growth structures exercised | 5,040 of 8,640 (every value of every structural gene; the capability preflight covers all 8,640) |
| Doors, windows, episodes, fixtures | D19, D21, D23, D24, E-2020, E-2022, E-2025, FULL, S0, S1, S2, S3, S4, S5, S6, S7, W-BEAR, W-CRASH, W-QUIET, W-TREND |
| Option sets | all, base, blackout, cost0, cost10, cost20, d1only, fund, ggdx, gonly, native, nextopen, periods, rate14, slip25, tie, vgtonly, whole |
| Risk-envelope inputs compared | 64,054 |
| Virtual trades / funded lots / funding decisions / partial fills compared | 8,368,126 / 5,376,421 / 2,919,392 / 199,227 |
| Determinism runs (batch sizes 1, 7, 13, 16, 32, 50, 64, 128, shuffled, reversed, repeat, host workers 0/1/3/12, server and host-path restart) | 176, every one 0 |
| Binary / compat / device / host workers | one each: `06a4a04a…dc23` / `30824182…2998` / GPU-ae5f222c / 8 |
| CPU reference / GPU time (sum over runs) | 3,658 s / 444 s |

| Run | Door | Options | Detail + risk | Candidates | Identical | Mismatches | Envelopes | Determinism |
|---|---|---|---|---:|---:|---:|---:|---|
| D19-bulk | D19 | base | — | 10,061 | 10,061 | 0 | 0 | — |
| D21-bulk | D21 | base | — | 10,061 | 10,061 | 0 | 0 | — |
| D23-bulk | D23 | base | — | 10,061 | 10,061 | 0 | 0 | — |
| D24-all | D24 | all | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-blackout | D24 | blackout | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-bulk-fine | D24 | base | — | 8,000 | 8,000 | 0 | 0 | — |
| D24-bulk | D24 | base | — | 26,000 | 26,000 | 0 | 0 | — |
| D24-core | D24 | base | — | 2,325 | 2,325 | 0 | 0 | all 0 (16 runs) |
| D24-cost0 | D24 | cost0 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-cost10 | D24 | cost10 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-cost20 | D24 | cost20 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-d1only | D24 | d1only | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-detail | D24 | base | yes | 3,117 | 3,117 | 0 | 3,117 | all 0 (16 runs) |
| D24-fund | D24 | fund | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-ggdx | D24 | ggdx | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-gonly | D24 | gonly | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-growth-first | D24 | base (Growth first) | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-native | D24 | native | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-nextopen | D24 | nextopen | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-periods | D24 | periods | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-rate14 | D24 | rate14 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-slip25 | D24 | slip25 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-tie | D24 | tie | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-vgtonly | D24 | vgtonly | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-whole | D24 | whole | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| E-2020 | E-2020 | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| E-2022 | E-2022 | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| E-2025 | E-2025 | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| FULL-all | FULL | all | yes | 1,033 | 1,033 | 0 | 1,033 | — |
| FULL-bulk | FULL | base | — | 12,000 | 12,000 | 0 | 0 | — |
| FULL-core | FULL | base | — | 2,213 | 2,213 | 0 | 0 | all 0 (16 runs) |
| FULL-detail | FULL | base | yes | 2,061 | 2,061 | 0 | 2,061 | — |
| FULL-nextopen | FULL | nextopen | yes | 1,033 | 1,033 | 0 | 1,033 | — |
| FULL-periods | FULL | periods | yes | 1,033 | 1,033 | 0 | 1,033 | — |
| S0-all | S0 | all | yes | 328 | 328 | 0 | 328 | — |
| S0-base | S0 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S1-all | S1 | all | yes | 328 | 328 | 0 | 317 | — |
| S1-base | S1 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S2-all | S2 | all | yes | 328 | 328 | 0 | 326 | — |
| S2-base | S2 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S3-all | S3 | all | yes | 328 | 328 | 0 | 328 | — |
| S3-base | S3 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S4-all | S4 | all | yes | 328 | 328 | 0 | 328 | — |
| S4-base | S4 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S5-all | S5 | all | yes | 328 | 328 | 0 | 328 | — |
| S5-base | S5 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S6-all | S6 | all | yes | 328 | 328 | 0 | 321 | — |
| S6-base | S6 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| S7-all | S7 | all | yes | 328 | 328 | 0 | 328 | — |
| S7-base | S7 | base | yes | 456 | 456 | 0 | 456 | all 0 (16 runs) |
| W-BEAR | W-BEAR | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| W-CRASH | W-CRASH | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| W-QUIET | W-QUIET | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| W-TREND | W-TREND | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |

Twenty candidates (S1-all 11, S2-all 2, S6-all 7: the adversarial fixtures with every option at once) are
configurations that **both** engines refuse identically — the CPU throws its invariant "a profitable protective exit",
the GPU returns the matching per-candidate status 13 — and count as identical refusals, as in Phase 2 (where the
fixtures' other seeds gave 11); no envelope exists for them. In an official run such a candidate stops the job on either
engine.

## 4. Optimizer identity (H3)

| Comparison (final binary, host workers 8 unless stated) | Compared | Result |
|---|---|---|
| Assignment 3 C19 broad1 search, run 1 vs its sealed record (`research/vg-l0-full-joint/results/search/C19/broad1.json`) | 64 lanes (screens, promotions, islands and trigger logs, rung fits, refinements, shortlists, frontiers, failure reasons), extension rounds, fresh 1,242,714 / archive hits 7,607 | **identical** (583.9 s) |
| same, run 2 | same | **identical** (581.8 s) |
| Assignment 3 C19 broad qualification vs its sealed evidence (`…/folds/C19/broad-qualification.json`) | 385 members (detailed centres, five stresses, removal reruns, selection and confirmation neighbourhoods), 377 qualified, 251,405 evaluations | **identical** (163.7 s) |
| Assignment 2 C19 base search (Growth fixed), run 1 vs its sealed record (`research/vg-l0-risk-families/results/search/C19/base.json`) | 128 lanes, extension rounds, fresh 2,196,920 / hits 15,979 | **identical** (724.8 s) |
| same, run 2 | same | **identical** (726.5 s) |
| Fixed-seed mini-optimization: CPU arm (12 workers) vs GPU | 16 lanes, 30,749 archived evaluations (record hash per row), 5,746 configurations | **identical** |
| GPU vs GPU interrupted after 6,000 fresh evaluations (exit 75) and resumed | same | **identical** |
| host workers 1 vs 8 | same | **identical** |
| host workers 0 (the serial path) vs 8 | same | **identical** |
| the accepted Phase 2 path (Stage 1 `p2-mini-r1`, binary `3fe09e67…`) vs the final path | same | **identical** |

The fitness inputs, gates, ranks, promotions, extension decisions, refinement endpoints, shortlists, qualification
verdicts and every archived record are reproduced exactly; worker scheduling and completion order did not change any
optimization decision.

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
