# GPU parity, acceptance and engineering gates (brief Phase 0, Phase 4) — sealed in `results/engineering/gates.json`

`gates.json` sha256 `43b03b8b68452e02b761a29c2c54e93a5dd02861b5ff74690f7f4f8d8f6dfd77` (commit `3d734a96`): **E1–E9 all
pass**. The code-dependent gates E2–E6 ran on the final, frozen code closure: digest
`4c2c3fd45d07dd143316d457954beb539c1fa90e896ef76683cc8ecb7f4cd178`, 195 files. The protocol was frozen afterwards
(`results/protocol-freeze.json`, commit `2bd8153d`).

## 1. The evaluator in force (no change by this study)

| Item | Value |
|---|---|
| Acceptance record | `config/gpu-backend/acceptance.json`: GPU Phase 7 (`research/gpu-phase7`), ACCEPTED 2026-11-22, sha256 **`bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`**, equal to the out-of-band pin (`~/.local/share/margin-trading-gpu/acceptance-pins/pins.jsonl`) |
| Binary | `research/gpu-phase7/build/gb7`, sha256 `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82` (a reproducible rebuild was verified) |
| Device | NVIDIA GeForce RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4` |
| Changes to the evaluation manifest, the enforcement group, CUDA or the host path | **none**. The study lives in `src/gdx-d1-growth/`, an official entrypoint because it imports the official gate. Its non-official tools are in `tools/gdx-d1-growth/` and its own data under `research/gdx-d1-growth/`. No acceptance renewal was required |
| Phase 0 integration | `src/research-outcome/identityJoin.ts` (cherry-pick `a33c6ff1` of `aca31b5f`) is outside every evaluation and enforcement manifest. It does not change the evaluation digest, compatibility digest, policy pins or any study's guard: P6-TSLA's 163 seals still verify on this branch (`results/engineering/tests/tsla-verify.txt`) |
| Runtime | every Node process runs `node --no-maglev`; the attestations record Maglev as disabled |

## 2. Gates

| Gate | Result | Evidence |
|---|---|---|
| **E1** acceptance and entrypoints | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…`: **VERIFIED**. The record equals the out-of-band pin; 94 CPU, 7 CUDA, 12 host and 29 policy files hash to their pins; the evaluation digest was recomputed; the evidence is intact; the source revision is an ancestor of HEAD; the binary rebuilds reproducibly; the device matches. The entrypoint audit of `src/` is clean | `E1-acceptance.json` |
| **E2** the GDX doors | Every door (D19 1,006, D21 1,511, D23 2,012, D24 2,264, FULL 2,723 sessions) **equals the canonical partition load session by session and bar by bar**. Each shorter door is an exact prefix of the next. No split is applied: the central ledger has no GDX event. Both engine slots hold one GDX SymDoor. **This study's GDX door equals the GDX slot of N/original's own VGT/GDX door bar by bar on D24 and FULL** | `E2-data.json` |
| **E3** benchmarks, ablation and incumbents | (a) New L0 and N/original on their own data (D24 and FULL known-target doors): **GPU = CPU (0 differences) and = their sealed figures**: N/original FULL $482,700.73 / DD $20,385.99 / 44 lots / signature `54d1c2e07c2dbbfd`; New L0 $479,605.18 / $20,385.99 / 46 / `7b17578108747911`; development (D24) $388,031.02 and $382,721.46. (b) **The ablation.** N/original with both VGT books disabled (native, on its own door) **equals the projected control `N/original GDX D1 (ablation)`** (this study's trading slot, arm D) in every scalar, every year, the book's statistics and the detailed lot ledger, on D24 and FULL. The same holds for New L0's and VG #2's GDX D1 books. Projected CPU = projected GPU (0 differences). (c) 4A's five GDX Growth incumbents projected onto the trading slot reproduce **4A's sealed development figures to the cent**: 4A primary $139,668.45 / $17,483.62 / 11 lots; informed#2 $110,158.59 / $18,840.58 / 16; P08 $121,008.75 / $18,840.58 / 11; P09 $100,056.17 / $17,744.39 / 15; Appendix A $53,816.50 / $17,709.96 / 13. GPU = CPU on D24 and FULL. FULL was read for equality only | `E3-references.json`, `E3/*-receipts.jsonl` |
| **E4** CPU/GPU parity on the GDX domain | 251 configurations per door: arm D 67 (8 cells, coarse and fine), G 53 (6 cells, including the unrestricted `G.h0.s0`), J 101 (48 cells), S 6 (a hash-selected frozen D1), C 24 pairs, plus the 13 incumbent controls; 72 distinct cells. Per configuration: the detailed and compact records with the risk envelope, a stress (one of the 8, rotating), a causal removal (C, J, S), a cutoff boundary, and a 16-boundary session-close series for every fourth. **0 of 1,198 record comparisons differ on each of D19, D21, D23 and D24** | `E4-parity.json` |
| **E5** determinism and recoverability | A fixed-seed mini lane set of every arm on D19, with the frozen two-tier rule (a fixed-seed mini-optimization: candidate ordering, shortlists and thresholds included). Runs: GPU run A; GPU run B gracefully stopped after 300 fresh evaluations and resumed; GPU run C whose process was SIGKILLed and resumed; GPU run D whose server was SIGKILLed (it failed closed, exit 1) and resumed; the CPU reference. **All identical: 0 differences** | `E5-determinism.json` |
| **E6** identities on the GPU | (a) **Single-family:** 48 joint configurations with Growth·GDX disabled equal their D1 book in arm D, and with D1·GDX disabled equal their Growth book in arm G: 0 differ. (b) **The disabled second slot is inert:** another vector in it changes nothing, 0 differ. (c) **Causal data access:** 136 configurations across D19→D21→D23→D24 have the same boundary equity and the same funded lots up to each cutoff, 0 differ. (d) **Accounting** over 544 runs: Σ lot nets = net, net = realized + unrealized, peak principal ≤ $100,000, 0 violations | `E6-identities.json` |
| **E7** suites | The study's tests (24, including the identity join and its failure modes, the informed stages and the incumbents' fine-grid round trips), the identity-join module's 12, and the reused suites (Priority 5, Assignment 3, the pilot lane, Stage B, the GPU policy tests): **178 / 178 pass** | `E7-tests.json` |
| **E8** regression | `npm test`: **1,878 tests, 1,867 pass, 7 fail, which are exactly the 7 known pre-existing failures** (intraday-study ×1, minute-optimizer ×1, trailing-buy ×4: the lowercase `allin-original.ts`; study7-runners ×1: its sealed data end), 4 skipped. Root `tsc`: 0 errors. ESLint of the study: 0 errors. **Every study's research preflight passes.** Strategy Lab portfolio parity, typecheck, lint, Vitest and a scratch build pass; **Playwright e2e passes on the first attempt**; `state/strategy-lab` is unchanged | `E8-regression.json`, `tests/*.txt` |
| **E9** pilot | The study's schedules on D21 (68 broad lanes plus 4 J refinement lanes, BENCH seeds): **957 requested/s**, 4,159 bytes per fresh evaluation, cgroup peak 9.1 GB; every lane stopped on *triggers not met* | `pilot.json`, `pilot/lanes.json` |

## 3. Official runs (every evaluating stage)

Each official job opens the gate itself and runs these checks:
- the purpose, the runtime (no Maglev) and the acceptance record;
- an independent re-hash of the pinned files and the committed source;
- the job, the binary, the compatibility digest and the device, with no test hooks, and the accepted device;
- capability coverage of the risk-envelope pilot domain, which contains the GDX domain;
- a smoke kernel, VRAM and the 8-worker host path;
- a **live parity mini-set** on the job's own GDX door.

It then writes an attestation to `results/gpu-attestations/`. The first official job, `C19-D-broad`
(2026-11-26T16:03:35Z), passed **all 16 checks**. Every batch carries a device receipt, and the conservation invariant
(CPU-scored = 0) is checked per batch and at the end. The totals over every official job are in §4, filled in at the end
of the study.

## 4. Totals over every official job

From `tools/gdx-d1-growth/gpu-jobs.py` → `reports/tables/gpu-jobs.json` (per-job table: `reports/tables/GPU_JOBS.md`):

| Item | Value |
|---|---|
| Official jobs | **81**, all complete: 77 search, replicate-round, refinement, informed and qualification jobs, 3 fold slices and 1 validation (SEARCH_AND_CONVERGENCE_REPORT.md §C) |
| Attestations | 81 (one per job): **1,296 checks, 0 failed**. Every job was attested; Maglev was disabled in every attested process |
| Live parity mini-sets (each job's own GDX door) | **1,458 / 1,458 configurations identical** |
| Evaluations | **76,965,697 submitted, 76,965,697 GPU-returned**, 0 failed, **0 CPU-scored**, 0 capacity retries; 13,245 receipted batches, all official |
| Requested by the search lanes (archive hits included) | 72,769,496: 45.5 % of the 160 M hard ceiling. The ledger stood at 81,752,965 with qualification when the validation launched |
| Device, binary, acceptance | `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4` only; `cb2ff30b9cb720c0…` only; `bb0e3fcf6bde45cc…` only |
| GPU time | kernel 36,623 s (10.2 h); job wall 51,336 s (14.3 h); search lanes 12.4 h of wall time |
| VRAM | free device memory at each job's gate 30.07–30.12 GiB; the largest planned working set 5.18 GiB (the validation job). No job ran out of VRAM or needed a capacity retry |
| Host memory | the largest cgroup peak of any chain unit was 22.8 GB, under the 44 G / 48 G limits (MemoryHigh / MemoryMax) of `gdx8.slice`; no swap |
| Chain wall time | C19 2 h 50 m, C21 3 h 31 m, C23 4 h 16 m, C24 4 h 29 m (with the informed lanes, the frozen selection, the validation and the outcome) |

**Non-official evaluations after the outcome** (purpose `diagnostic`; never official evidence), all labelled report-only:
- the portfolio stage's CPU reference replays: every overlay equalled its sealed GPU figures to the cent;
- the buy-and-hold control, the tail stress and the lot replays (CPU);
- the small and wide neighbourhood families (non-official GPU, `reports/diagnostics/nbhd-D24-receipts.jsonl`).
