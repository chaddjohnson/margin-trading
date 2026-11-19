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

## 2. Gate results (the final campaign `chains/final.sh`, commit `d113e6c5`, 2026-11-19 17:22:05 → 21:05:34Z, all 31 steps status 0; then `chains/post-final.sh`)

| Gate | Requirement (PROTOCOL.md §9) | Result | Evidence |
|---|---|---|---|
| H1 | offline codec and pipeline equivalence on every captured Phase 2 batch | **pass** — 7/7 captures, serial codec and 1/2/3/8/12 workers: request bytes and every result hash identical; every refusal correct | `results/final/offline-check.json` |
| H2 | live parity through the final host path, zero mismatches, determinism | **pass** — 144,795/144,795 identical, 176 determinism runs 0; Assignment 3's 48 sealed finalists D24 96/96 (sealed figures 48/48 to the cent) and FULL 96/96 | `results/parity/final/SUMMARY.json`, `results/parity/final-finalists.json` |
| H3 | sealed-job replays identical; CPU = GPU = GPU resumed; worker counts | **pass** — §4 | `results/optimizer/compare-final-*.json` |
| H4 | sanitizer 0 errors under 4 tools, results identical | **pass** — §5 | `results/sanitizer-final/sanitizer.json` |
| H5 | negative tests all refused, CPU-scored 0 | **pass** — 45/45; rerun after the enforcement-only change (amendment A1) 45/45 | `results/policy/negative-final.json`, `negative-acceptance.json` |
| P5 | enforcement coverage and tamper tests | **pass** — 14/14 + baseline, rerun (A1) 14/14 + baseline; policy, enforcement, host-pipeline and layout tests at acceptance 19/19 | `results/policy/tamper-final.json`, `tamper-acceptance.json`, `policy-tests.txt` |
| H6 | bounded 30–60 min sustained run: 0 errors, 0 parity mismatches, stable memory and throughput | **pass** — §5 | `results/sustained/summary.json` |
| H7 | `npm test` = baseline + new; Strategy Lab suites; `state/strategy-lab/` untouched | **pass** — §6, `npm test` rerun (A1) identical; one type-check regression disclosed (A2) | `results/tests/` |
| H8 | benchmarks, every run reported | **done** — `GPU_PERFORMANCE_BEFORE_AFTER.md` | `results/bench/before-after.json` |

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

**Sanitizer** (`tools/gpu-phase3/sanitize.ts` → `results/sanitizer-final/sanitizer.json`; compute-sanitizer
Version 2026.1.1.0 (build 38000597) (public-release)) on the final binary, door W-CRASH, 97 subjects (references, every Growth structural
value, 64 random; detail + risk, blackouts and period boundaries), the request built and the response decoded by the
host pipeline (4 workers) — the host workers change host buffers that become device inputs, so the full device-side
scope ran even though the kernels are byte-identical:

| Tool | Errors | Identical to the CPU | Smoke | Time |
|---|---:|---:|---|---:|
| memcheck (leak check) | 0 | 97/97 | ok | 25 s |
| racecheck | 0 | 97/97 | ok | 5 s |
| initcheck | 0 | 97/97 | ok | 14 s |
| synccheck | 0 | 97/97 | ok | 4 s |

**Negative tests** 45/45 and **source-tamper suite** 14/14 (baseline ok): every case refused,
terminated or detected with no CPU-scored evaluation and no result released; details in `GPU_ENFORCEMENT_INTEGRITY.md` §6.

**Sustained run (H6, one bounded run, `tools/gpu-phase3/sustained.ts --minutes 45` → `results/sustained/summary.json`):**
2026-11-19 20:20:15 → 21:05:33Z (45.3 min), the production pool on 8 host workers, rounds of 32,768 fresh seeded
Assignment 3 genomes rotating doors D19, D21, D23, D24, FULL and five mixes (joint, detail + risk, all options, D1-only,
Growth-only), the whole round queued at once (backpressure): **115 rounds, 3,768,320 GPU evaluations, 0 GPU or host-path
failures, 0 restarts, 0 CPU-scored; 5,520 CPU parity samples (canonical record hashes) and 15 repeatability checks of
fixed batches — 0 mismatches**. Peaks: 58 °C, 221 W (of 600), VRAM 7,394 MiB, host RSS 8,977 MiB (transient, FULL
rounds); mean host RSS by third of the run 5.6 / 6.6 / 6.5 GiB (no growth after warm-up); no clock throttling. This is
45 minutes of operation, not a long-run guarantee: Phase 2's 8 h run (23.95 M evaluations, 0 errors) is reused only
for the byte-identical kernels and server; faults of the new host path rarer than about once an hour are not excluded.

## 6. Repository and Strategy Lab (H7)

`chains/tests.sh` (2026-11-19 21:05–21:16Z, GPU free, in a contained unit with PATH):

| Suite | Result |
|---|---|
| `npm test` (all `src/**/*.test.ts`, incl. the GPU merge gate and Phase 1's live GPU test) | 1,699 tests: 1,688 pass, **7 fail — exactly the 7 known pre-existing failures** (six open the lowercase `src/app/allin-original.ts`; the Study 7 runner's data end), 4 skipped. Phase 2's baseline 1,690 / 1,679 / 7 / 4 + **9 new tests, all passing** (host pipeline 6, enforcement 2, official runner 1) |
| ESLint on the GPU code (`src/gpu-backend`, `src/gpu-phase3`, `tools/gpu-phase3`, the preflight tool) | 0 problems (Phase 2's one error and 130 warnings in pinned files fixed in this change cycle) |
| Root TypeScript (`tsc --noEmit`) | **regression, type-only: 1 error** — `src/gpu-backend/hostPipeline.ts:196` names the DOM type `Transferable`, absent from Node's typings (`TransferListItem` from `node:worker_threads` is the fix). No runtime effect (Node strips types; every test and campaign above ran this code). Not fixed now: the file is in the binary's evaluation digest, so even a type annotation means a new binary and a new full campaign; queued for the next acceptance cycle. A second type error (`policy.test.ts` env typing) was fixed before the acceptance (enforcement group only; negative and tamper suites rerun on that tree). `results/tests/root-tsc.txt`, `root-tsc-after-policy-fix.txt` |
| Strategy Lab typecheck / lint / vitest / UI build / Playwright e2e | 0 / 0 / **314 of 314** / built into a scratch directory / **81 of 81** (no rerun needed) |
| Strategy Lab's CPU engine | unchanged (no file under `apps/` changed by the GPU program; `results/integration/merge-audit.json`) |
| `state/strategy-lab/` | fingerprint before = after (sha256 of every file's path, size, mtime) |
| Live `apps/strategy-lab/dist` | no file newer than the protocol freeze |

## 7. The acceptance record

`config/gpu-backend/acceptance.json` — **ACCEPTED**, schema 2, written 2026-11-19T23:02:38.195Z by
`tools/gpu-phase3/accept.ts` (every gate passed, no blocker); committed in `ce24a977`. **Record sha256
`b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214`** — keep this value outside the repository; it is the
out-of-band pin (`tools/gpu-backend/verify-acceptance.sh --expect-record-sha256 <it>`), the one check a malicious
committer who regenerates the record cannot pass (`GPU_ENFORCEMENT_INTEGRITY.md`).

| Field | Value |
|---|---|
| Binary | `research/gpu-phase3/build/gb3` sha256 `06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23` (git-ignored; rebuilt reproducibly from the pinned sources by `tools/gpu-backend/build.sh`) |
| Device | NVIDIA GeForce RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, compute capability 12.0 |
| Evaluation digest (compiled into the binary) | `30824182b111fa12fadc23502ee08c8e60d10ed881767c9c64ab480c5f5c2998` — CPU closure 94 files, CUDA 7, host path 12; nvcc 13.2.86, protocol v2 |
| Enforcement group (pinned in the record only) | digest `2bb80f072807e3aa99bab8151ec951d5aecd74b0ff843e659cd870b8ddff0065`, 21 files incl. the generator `tools/gpu-phase3/accept.ts` |
| Source revision | commit `e33da74f41a87c75d6aee0d5747065412f9bf9a7` (tree `0da3d4b2a85a2ea004472041d43d8c349762be7f`, branch `research/gpu-phase3`); must be an ancestor of HEAD, and every pinned file committed and unchanged since |
| Host path | default 8 worker threads; modes serial (hostWorkers 0), parallel (worker threads) |
| Domain | Assignment 3 genome ∪ risk-envelope pilot domain (NL0 controls grid); features `dffffffff` ⊆ capabilities `fffffffff` |
| Standard | 3.0.0 (sha256 `4e8244e65bf1dd7c…`) |
| Supersedes | `research/gpu-phase2` record of 2026-11-19T13:02:54.147Z (sha256 `b7df366a847a4655…`, kept at `research/gpu-phase3/results/superseded/acceptance-gpu-phase2.json`) |

Evidence (each file's sha256 is in the record; `verify-acceptance.sh` re-hashes them):

| Gate | Evidence | sha256 |
|---|---|---|
| final binary (reproducible; built from this tree; kernels identical to Phase 2) | `research/gpu-phase3/results/final-binary.json` | `e60e91e237e532d3…` |
| H1 offline codec and host-pipeline equivalence (captured Phase 2 batches) | `research/gpu-phase3/results/final/offline-check.json` | `2dc0bbc93b31b17f…` |
| H2 parity campaign through the final host path (zero mismatches, coverage, determinism) | `research/gpu-phase3/results/parity/final/SUMMARY.json` | `45d77a1c2f0fa7e5…` |
| H2 Assignment 3 sealed finalists (GPU = CPU reference; D24 = sealed figures) | `research/gpu-phase3/results/parity/final-finalists.json` | `b61025b372578de1…` |
| H3 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path) | `research/gpu-phase3/results/optimizer/compare-final-a3-r1-vs-sealed.json` | `ef48ad06f4911119…` |
| H3 Assignment 2 C19 base search replay = sealed record (Growth fixed; final binary, host path) | `research/gpu-phase3/results/optimizer/compare-final-a2-r1-vs-sealed.json` | `86a2e7186841b9cd…` |
| H3 Assignment 3 C19 broad qualification replay = sealed evidence (final binary, host path) | `research/gpu-phase3/results/optimizer/compare-final-a3q.json` | `12781b02cd790f2a…` |
| H3 fixed-seed mini-optimization CPU = GPU (final binary, host path) | `research/gpu-phase3/results/optimizer/compare-final-mini-cpu-vs-gpu.json` | `19da8b5bdbc3395b…` |
| H3 fixed-seed mini-optimization GPU = interrupted + resumed GPU | `research/gpu-phase3/results/optimizer/compare-final-mini-gpu-vs-resumed.json` | `1e8fcbb106a208b8…` |
| H3 fixed-seed mini-optimization host workers 1 = serial path = 8 workers | `research/gpu-phase3/results/optimizer/compare-final-mini-w1-vs-w8.json` | `f606cba6f8fcde3b…` |
| H3 fixed-seed mini-optimization serial path (host workers 0) = 8 workers | `research/gpu-phase3/results/optimizer/compare-final-mini-w0-vs-w8.json` | `306dd0436ad020d0…` |
| H4 compute-sanitizer (memcheck, racecheck, initcheck, synccheck) on the final binary, requests from the host path | `research/gpu-phase3/results/sanitizer-final/sanitizer.json` | `3761dee5f543de1d…` |
| H5 negative tests rerun on the accepted pinned files | `research/gpu-phase3/results/policy/negative-acceptance.json` | `69ee26cb39e1cf3d…` |
| P5 source-tamper tests rerun on the accepted pinned files | `research/gpu-phase3/results/policy/tamper-acceptance.json` | `b039113c20ad635e…` |
| H5 negative tests (Phase 2 cases + host path; final binary) | `research/gpu-phase3/results/policy/negative-final.json` | `97540dbc3b3e0c21…` |
| P5 source-tamper tests in a sandbox clone (every mechanism; out-of-band pin) | `research/gpu-phase3/results/policy/tamper-final.json` | `8348d22fe2c37373…` |
| H6 bounded 30–60 min sustained run (no failure, parity samples, repeatability) | `research/gpu-phase3/results/sustained/summary.json` | `283e94fb0143e534…` |
| H7 npm test (= baseline + new tests; known failures only) | `research/gpu-phase3/results/tests/npm-test.json` | `3656db6a4b5442f4…` |
| H7 Strategy Lab regression (CPU engine, suites, state untouched) | `research/gpu-phase3/results/tests/strategy-lab.json` | `28a2c24f22bba17c…` |
| H8 end-to-end benchmarks recorded (every run reported) | `research/gpu-phase3/results/bench/before-after.json` | `8d27e491633921a4…` |
| P5 policy, enforcement and host-pipeline tests | `research/gpu-phase3/results/policy/policy-tests.txt` | `b4dd17b3fc5ffa3d…` |

Verified on `research/gpu-phase3` right after the commit: the merge-gate tests 19/19 and `verify-acceptance.sh --device
--expect-record-sha256 b08738be…` → **VERIFIED** (every group re-hashed, evidence intact, source ancestor, pinned files
committed and unchanged, binary, device). On `main` after the merge: `GPU_INTEGRATION_AND_OPERATIONS.md` §2.

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
