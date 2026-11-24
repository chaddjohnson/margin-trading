# GPU PARITY AND ACCEPTANCE — P5-NS

The TypeScript/CPU engine is the correctness reference; the CUDA evaluator is the accepted official accelerator
(standard 3.0.0 §9). This file records the acceptance in force, this study's own CPU/GPU parity and reproduction gates
(PROTOCOL.md §13), the negative checks and the regression. Engineering outputs are equality counts, hashes, the
references' sealed figures and pass/fail only.

## 1. The acceptance in force

| Item | Value |
|---|---|
| Record | `config/gpu-backend/acceptance.json`, schema 2, status ACCEPTED, study `research/gpu-phase7` (the risk-envelope delivery; full §2 cycle), accepted 2026-11-22T00:16:00Z |
| Record sha256 | `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` = the out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json` |
| Binary | `research/gpu-phase7/build/gb7`, sha256 `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82` (reproducible rebuild from the pinned sources: PASS) |
| Device | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07 |
| Source revision | `999f299e5069` (an ancestor of this branch's HEAD); every pinned file committed and unchanged (94 CPU-closure, 7 CUDA, 12 host-path, 29 policy files) |
| Why this record | this branch's evaluation code is GPU Phase 7's accepted tree: between Phase 7's delivery (`fc027eed`) and the branch base (`5d587bb2`) only new study directories were added; the Priority 4 branch's Phase 8 record (`c02a8a92…`, S1 engine) does not apply and is not used |
| Independent verification (E1) | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` → **VERIFIED** (all 19 checks PASS, including the reproducible rebuild and the device); entrypoint audit: 0 problems (`src/vg-l0-n-successor/` imports `src/gpu-backend/official.ts`: an official entrypoint; no registry or pinned file changed) |

Official runs: `npm run vg-l0ns` → `src/gpu-backend/officialRunner.ts` (purpose official-optimization, the study preflight,
`--no-maglev`) → each stage opens `openOfficialGpuSession` (purpose, acceptance, pins, committed source, job, binary,
compatibility digest, device, no test hooks, accepted device, capability coverage of the risk-envelope pilot domain =
Assignment 3's domain + the envelope, smoke kernel, memory, host path, live parity mini-set) → `GpuPool` → `EvalLab`, with
an attestation per gate opening, a receipt per batch and the conservation invariant (CPU-scored = 0). There is no CPU path.

## 2. This study's gates (non-official; before the freeze)

| Gate | What | Result |
|---|---|---|
| E1 | acceptance verification and entrypoint audit | **PASS** |
| E2 | New L0 and N/original through this study's path on D19, D21, D23, D24 and FULL (known-target reproduction, AD5): GPU = CPU in every field of the detailed and compact records and the envelope (0 differences in 10 of 10 reference × door comparisons); D24 = the sealed development figures (N/original $388,031.02 / $19,459.83 / 32 lots; New L0 $382,721.46 / $19,459.83 / 34 lots); FULL = the sealed full-history figures (N/original $482,700.73 / $20,385.99 / 44 lots / `54d1c2e07c2dbbfd`; New L0 $479,605.18 / $20,385.99 / 46 lots / `7b17578108747911`); their C24 qualification evidence on the GPU (centre, selection and confirmation families, tails, gates) = Assignment 3's sealed evidence, 0 differences | **PASS** |
| E3 | Assignment 3's sealed CPU lanes reproduced by this study's lane runner (`lanes.ts runLanes` over the pilot's lane, P0) on the GPU with Assignment 3's own schedules and caps: 8 broad lanes of 8 structurally different cells (GA0.VA0, GB0.VD1, GD1.VB0, GC1.VD1, GB1.VB1, GA1.VC0, GD0.VA1, GC0.VC0; C19, R1, D19), the legacy refinement lane C19/refine/GA0.VA0/R1 (seeded from Assignment 3's sealed plan and broad evidence) and **N/original's own lane** C24/informed/GD.VB/R2 on D24 (Assignment 3's projected seeds) — **10 of 10 lane results identical in every field** (envelopes removed); the reproduced Track N lane shortlists N/original | **PASS** |
| E4 | CPU/GPU parity on 258 random configurations per door (64 cells × 3 coarse + 64 fine) and the references × base, every one of the 8 stresses, every causal removal, a cutoff boundary and a 16-boundary session-close series: 1,355 evaluations per door; **0 differing of 5,420** on D19, D21, D23, D24 | **PASS** |
| E5 | determinism on D19 with the two-tier rule (3 broad cells — the legacy cell and two gated, protected cells — and one N/original-seeded informed lane, mini schedule, NL0 cap 3 / cap 5): GPU run A; GPU run B stopped after 400 fresh evaluations and resumed from its archive; the CPU reference run — **0 differences** A vs resumed B and **0** A vs CPU in every lane result and extension decision. (A first attempt's resume was refused because the interrupted archive was bound to an earlier code digest — the archive binding working as designed; the gate was rerun on the final code.) | **PASS** |
| E6 | the sequential statistic vs Assignment 3's exact CPU minute chain on 10 paths: a lower bound in every path; nets and slice figures equal; gap $0 for both references, ≤ $3,762.36 on random engineering configurations | **PASS** |
| E7 | the study's unit tests (seed projection, door guards, budget bounds, two-tier rule, replicate trigger, sequential statistic vs a brute-force tracker, refinement plan, successor rule) and the reused suites (Assignment 3, the pilot's lane, Stage B, the GPU policy tests): **142 / 142** | **PASS** |
| E8 | full `npm test` 1,824 tests: 1,813 pass, 4 skipped, **7 fail = the 7 known pre-existing** (lowercase `allin-original.ts` ×6: intraday-study, minute-optimizer, trailing-buy ×4; Study 7's sealed data end ×1; the suite reads whole data files and fed no decision); root `tsc` 0 errors; eslint of the study's code 0 errors; **29 / 29** study preflights PASS; Strategy Lab: portfolio parity (the five frozen pooled candidates), typecheck, lint, Vitest, a scratch build and Playwright e2e (first attempt) all exit 0; `state/strategy-lab/` fingerprint unchanged | **PASS** |
| E9 | pilot (non-official, BENCH seed keys): 128 broad lanes on D21 and 16 Track N lanes on D24 under the frozen two-tier rule — 106 triggers not met, 38 coverage-limited, **0 budget-bound**, 0 errors; 2,701,244 + 1,043,379 requested; 4,741 bytes per fresh evaluation; peak memory 20.3 GB; R_N = 8 by the frozen rule (= the code) | **PASS** |

**Final-code reruns.** The study code changed once after the first gate runs (Track N's replicate count from the pilot;
the C24 finalist subjects). E2–E6 were rerun on the final committed code (job tag `final`); every rerun gave the identical
result (E2 0 differences, E3 10/10 identical, E4 0 / 5,420, E5 0 / 0, E6 the same gaps) and records the code digest it ran
under; the `gates` command accepts E2–E6 only if that digest equals the frozen code digest.
