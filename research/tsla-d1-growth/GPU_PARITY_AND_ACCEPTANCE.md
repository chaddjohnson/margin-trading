# GPU parity, acceptance and engineering regression (brief §5) — sealed in `results/engineering/gates.json`

`gates.json` sha256 `4bf79aa97d6ae00cf4d66d2ef672889a898fca731773fabaa568c13ef7a0923b` (commit `e7d9b7d0`): **E1–E9 all pass**;
the code-dependent gates E2–E6 ran on the final, frozen code closure (digest `418a87587f31d13c…`, rerun tag `final`; the first
runs on an earlier digest also passed and are in Git history).

## 1. The evaluator in force (no change by this study)

| Item | Value |
|---|---|
| Acceptance record | `config/gpu-backend/acceptance.json` — GPU Phase 7 (`research/gpu-phase7`), ACCEPTED 2026-11-22, sha256 **`bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`** (out-of-band pin: Priority 5's handoff) |
| Binary | `research/gpu-phase7/build/gb7`, sha256 `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82` (reproducible rebuild verified) |
| Device | NVIDIA GeForce RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4` |
| Change made by this study to the evaluation manifest, the enforcement group, CUDA or the host path | **none** — the TSLA study lives in `src/tsla-d1-growth/` (an official entrypoint: it imports the official gate), `tools/tsla-d1-growth/` and its own data; no renewal of the acceptance was required |
| Runtime | every Node process `node --no-maglev` (the attestations record Maglev disabled) |

## 2. Gates

| Gate | Result | Evidence |
|---|---|---|
| **E1** acceptance + entrypoints | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…`: **VERIFIED** (record = out-of-band pin; 94 CPU, 7 CUDA, 12 host, 29 policy files hash to their pins; evaluation digest recomputed; evidence intact; source revision an ancestor of HEAD; pinned files committed unmodified; reproducible rebuild; device); entrypoint audit: **0 problems** | `E1-acceptance.json` |
| **E2** TSLA doors | every door (D19 1,006, D21 1,511, D23 2,012, D24 2,264, FULL 2,723 sessions) **equals the canonical partition load with the TSLA ledger session by session and bar by bar**; each shorter door is an exact prefix of the next (D19 ⊂ D21 ⊂ D23 ⊂ D24 ⊂ FULL); both engine slots are one TSLA SymDoor; splits applied: none (D19), 2020 (D21), both (D23+); applying the ledger again would change the data (it is applied once); each split's adjusted overnight move within ±10 % | `E2-data.json` |
| **E3** the shared engine unchanged | New L0 and N/original on their OWN VGT/GDX data (Priority 3's D24 and FULL known-target doors): **GPU = CPU in every record field (0 differences) and = their sealed development and full-history figures** (net, DD, lots, ledger signature) | `E3-references.json` |
| **E4** CPU/GPU parity on the TSLA domain | 244 configurations per door — arm D 66 (8 cells, coarse + fine), G 50 (6 cells incl. the unrestricted G.h0.s0), J 98 (48 cells), S 6 (a hash-selected frozen D1), C 24 pairs, the 6 external controls — 72 distinct cells; per configuration the detailed and compact records with the risk envelope, a rotating stress (all 8), a removal (combined arms), a cutoff boundary and (every 4th) a 16-boundary session-close series: **0 of 1,165 evaluations differ on each of D19, D21, D23, D24 (0 / 4,660)**, every record field compared (`deepDiff`), zero tolerance | `E4-parity.json`, receipts `E4/*` |
| **E5** determinism and recoverability | a fixed-seed mini lane set of every arm (D `D.C1`, G `G.h0.s0`, J `J.D1.h2.s1`, S `S.ENGF1.h1.s0`, a seeded J refinement lane) on D19 with the two-tier rule: GPU run A; GPU run B **gracefully stopped** after 300 fresh evaluations and resumed; GPU run C whose **process was SIGKILLed** and resumed; GPU run D whose **GPU server was SIGKILLed** (the job failed closed, exit 1) and resumed; the **CPU reference** — **every lane result and extension decision identical (0 differences in each comparison)** | `E5-determinism.json` |
| **E6** identities on the GPU | (a) **single-family**: 48 joint configurations with Growth·TSLA disabled = their D1 book in arm D, with D1·TSLA disabled = their Growth book in arm G — 0 differ (every field but the identity); (b) **the disabled engine slot is inert**: another D1·GDX vector changes no field (0 / 48); (c) **causal data access**: 136 configurations of every arm — at D19's, D21's and D23's last close the longer door's run has exactly the shorter run's marked net and the same funded lots (0 differ in each pair); (d) **accounting**: Σ lot nets = net, net = realized + unrealized, peak principal ≤ $100,000 on 544 runs — 0 violations | `E6-identities.json` |
| **E7** suites | the study's tests (18) and the reused modules' suites (Priority 5, Assignment 3, the pilot lane, Stage B, the GPU policy tests): **160 / 160 pass** | `E7-tests.json` |
| **E8** regression | `npm test` **1,842 tests: 1,831 pass, 7 fail = exactly the 7 known pre-existing failures** (lowercase `allin-original.ts` × 6; Study 7's sealed data end), 4 skipped; root `tsc` 0 errors; ESLint of the study code 0 errors; **every study's research preflight passes**; **Strategy Lab portfolio parity, typecheck, lint, Vitest and a scratch build pass; `state/strategy-lab` unchanged** (Strategy Lab's CPU simulation path and saved results unaffected: this branch does not touch `apps/`). Playwright e2e reported beside the gate: 4 whole runs, each with one failure from two documented timing races in test code (`strategy-lab.spec.ts:311` once, `candles.spec.ts:439` three times); every one of the 81 tests passed in at least one run (`AMENDMENTS.md` E1) | `E8-regression.json`, `tests/*` |
| **E9** pilot | the study schedules on D21 (68 broad + 4 refinement lanes, BENCH seeds): 692 requested/s, 4,344 bytes per fresh evaluation, cgroup peak 7.7 GB, every lane stopped on *triggers not met* | `pilot.json`, `pilot/lanes.json` |

## 3. Official runs (every evaluating stage)

Each official job opens the gate itself — purpose, runtime (no Maglev), acceptance, an independent re-hash of the pinned
files, committed source, the job, binary, compatibility digest, device, no test hooks, the accepted device, capability
coverage of the risk-envelope pilot domain (⊇ the TSLA domain), a smoke kernel, VRAM, the 8-worker host path and a
**live parity mini-set** (18 subjects: New L0, IJ1, C4, C4R and 14 seeded genomes, on the job's own TSLA door, through the
host path) — and writes an attestation (`results/gpu-attestations/`). The first official job (`C19-D-broad`) passed all 16
checks with 18/18 parity subjects identical. Every batch has a device receipt; the conservation invariant (CPU-scored = 0)
is checked per batch and at the end. The totals over every official job are in §4 (filled at the end of the study).

## 4. Totals over every official job (`tools/tsla-d1-growth/gpu-jobs.py` → `reports/tables/gpu-jobs.json`, `GPU_JOBS.md`)

| Item | Value |
|---|---|
| Official jobs | **82**, all complete, each in one session (no resume was needed). Stages: 16 broad, 10 replicate-round, 16 refinement, 36 qualification (16 broad, 16 refinement, 4 fixed pairs), 3 slices, 1 validation |
| Attestations | 82, one per job: **1,312 checks, 0 failed**; every job attested |
| Live parity mini-sets | **1,476 / 1,476 subjects identical** (18 per job, on each job's own TSLA door) |
| Evaluations | submitted **44,161,845**, GPU-returned 44,161,845, **failed 0, CPU-scored 0**; 9,468 receipted batches, all official |
| Capacity retries | 15. Each is an evaluation re-submitted **on the GPU** with a larger result buffer (at most 4 times); never the CPU |
| Device, binary, acceptance | one device `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`; one binary `cb2ff30b9cb720c0…`; one acceptance record `bb0e3fcf6bde45cc…` |
| Runtime | Maglev disabled in every job |
| GPU time | kernel 24,221 s (6.73 h); job wall 34,444 s (9.57 h) |
| Code | A1 changed only study code outside the evaluation manifest (`AMENDMENTS.md` A1): code digest `418a8758…` → `fb7e6ddc…`. `verify-acceptance.sh` VERIFIED after it |

**Non-official runs, all report-only and labelled.**
- The small/wide neighbourhood diagnostic ran on the GPU with `official: false` receipts: 35 batches of 128, 0
  CPU-scored, door D24.
- The lot replays and the buy-and-hold control used the canonical CPU engine under `GPU_POLICY_PURPOSE=diagnostic`
  (gate E4: CPU = GPU on every record field).
- The engineering gates E2–E6 and the pilot E9 are recorded in §2.

None of these is official optimization evidence. Strategy Lab is unchanged (`apps/` untouched on this branch; gate E8).
