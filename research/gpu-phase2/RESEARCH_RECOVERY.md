# RESEARCH_RECOVERY — gpu-phase2 (GPU acceleration Phase 2: complete parity, mandatory GPU optimization)

## Top screen

- **Updated:** 2026-11-19T13:15Z (UTC, from `date -u`)
- **Status:** **COMPLETE** — verdict **ACCEPTED** (`config/gpu-backend/acceptance.json`, 2026-11-19T13:02:54Z, written
  by `tools/gpu-phase2/accept.ts` after T0, P1–P4, G1–G9 all passed; G8 at 8 h by amendment A1, user directive).
- **Authority:** `brief/BRIEF.md` sha256 `25c1fa47…459d`; `PROTOCOL.md` frozen 2026-11-19T00:25Z
  (`results/protocol-freeze.json` `b274caab…f999`); `AMENDMENTS.md` A1 (+ clarification): G8 = 8 h from the original
  start, the existing run is the completed endurance test, no other stress run. Standard: retained pinned standard
  2.2.0 (this study created 3.0.0).
- **Final binary:** `build/gb2` sha256 `3fe09e67…13fc`, compat `f67dcb3b…daea` (reproducible stripped build).
- **Gates (records):** T0 `results/sanitizer-final/`; P3 `results/policy/negative-final.json` 35/35; G1–G6
  `results/parity/final/SUMMARY.json` (54 runs, 144,795 candidates, 0 mismatches); G4 finalists
  `results/parity/final-finalists.json` (48; D24 96/96, FULL 96/96, sealed 48/48); G7 `results/optimizer/compare-g7f-*`
  + A3 replays `compare-a3-C19-broad1.json` (5.22×), `compare-a3-C19-broad-qualification.json` (5.24×); G8
  `results/stress/closure.json` (8.009 h, 731 rounds, 23,953,408 evaluations, 0 errors, parity 35,040/0, repeat 117/0);
  G9 `results/tests/npm-test.json` (1,690/1,679/7 known/4) and `strategy-lab.json`; B1 `results/bench/`; TR1
  `results/tr1-tranche-gate.json`.
- **Running:** nothing (no gpup2 unit active; GPU idle). **Do not rerun any gate; do not start an endurance run (A1).**
- **Delivery:** research branch commits through the final push (see "Push record" below); `main` documentation-only
  commit `10ca3422` (from `108c241b`), merged back into the branch (`ee13a497`).
- **Follow-up gate (user):** review the handoff; decide on merging the GPU engine/enforcement code into `main`;
  authorize (or not) the deferred risk-envelope pilot as a new 3.0.0 study (not started).

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/gpu-phase2` from `727681c0` (no worktree).
  Commits: `8dad359e` (protocol), `2f5bc24c` (evaluator v2 + first probes).
- Node v24.21.0; units use `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Apollo: RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, 31,342 MiB free at start, driver 595.91.07, CUDA 13.2;
  no vLLM, no containers (`results/inventory/s0-start.json`). Monitor on the RTX 5090.
- Toolkit: `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit` (redist 13.2.2: nvcc 13.2.86,
  compute-sanitizer 2026.1.1 (13.2.87), CUPTI, Nsight Compute 2026.1.1; `INSTALL_MANIFEST.json`; installer
  `tools/gpu-phase2/install-toolkit.sh`; uninstall = delete that dir and `…/downloads-13.2.2`). Build:
  `tools/gpu-backend/build.sh <out> <compat digest>` (flags -O3 sm_120 --fmad=false IEEE div/sqrt, -ffp-contract=off).
- Containment: `tools/gpu-phase2/launch.sh` (gpup2.slice 44G/48G/0).

## Code map

- `src/gpu-backend/` (durable backend): `cuda/gb.h` (protocol v2), `gb_common.cuh`, `gb_d1.cuh` (Phase 1 D1 port),
  `gb_growth.cuh` (Growth 1.4.0 port), `gb_pool.cuh` (pool + options + risk envelope), `gb_server.cu`, `v8math.cuh`
  (V8 log/exp); `layout.ts` (+ `tests/layout.test.ts`), `dataset.ts`, `encode.ts`, `client.ts`, `compat.ts`,
  `toolchain.ts`.
- `src/gpu-phase2/` (study harness): `context.ts`, `subjects.ts`, `fixtures.ts`, `doorSpec.ts`, `canon.ts`,
  `cpuRefWorker.ts`, `cpuRefPool.ts`. Tools: `tools/gpu-phase2/{probe,throughput-probe,sanitize,parity}.ts`,
  `tools/gpu-backend/{build.sh,layout-dump.cpp,v8math-check.cu,check-v8math.ts}`.

## Stage table

| Stage | Status | Command / output | Result |
|---|---|---|---|
| S0 setup, inventory | complete | `results/inventory/s0-start.json` | vLLM absent, 31.3 GiB free |
| S1 toolkit + sanitizer | complete | `tools/gpu-phase2/install-toolkit.sh`; control `results/sanitizer/control.txt` | full-layout sanitizer instruments processes (catches an injected OOB) |
| T0 sanitizer on real kernels (dev binary) | complete (re-run on final binary pending) | `tools/gpu-phase2/sanitize.ts --door W-QUIET --per 1` → `results/sanitizer/sanitizer.json` | memcheck(leak) 0, racecheck 0, initcheck 0, synccheck 0; 33/33 identical. Fixed on the way: full struct init (initcheck), device frees at exit (leaks), zeroed period slots |
| V8 math | complete | `tools/gpu-backend/check-v8math.ts` → `results/parity/v8math.json` | 10,000,000 inputs, 0 mismatches GPU and host |
| S3/S5/S6 evaluator v2 incl. full Growth | built | probes: W-CRASH 13/13, D24 125/125 (64 random + every Growth structural value), all-options W-CRASH 65/65 incl. detail, risk envelope, determinism 0 | — |
| S7a pre-final parity campaign | running | `chains/parity.sh` → `results/parity/prefinal/*.json` | — |
| S2 policy + enforcement | not started | — | — |
| S4 GpuPool/GpuLab, parallel decode | not started | — | — |
| S7 mini-optimization, negative tests, 24 h, npm test, Strategy Lab | not started | — | — |
| S8 benchmarks | not started (throughput probe: ~1,092 ev/s at batch 16,384 on D24, client decode-bound) | — | — |
| S9 reports, bundle, commit/push, docs-only main integration | not started | — | — |

## Guards

- Do not run the deferred 40% / 25% / 25% risk-envelope pilot or any official optimization; no strategy, fitness,
  budget, random-stream or selection change; no merge of GPU engine code into `main`; no deployment or broker access.
- Do not edit completed studies or Phase 1 code (imported only). Do not touch `state/strategy-lab/`. No model
  reinstall; no display/driver/BIOS/boot change; do not modify the `ai-trading` project.
- No visuals. AD7: no money figure for non-reference configurations.
- The parity evidence that counts for acceptance is the FINAL campaign on the frozen final binary; pre-final records are
  development evidence (kept, labelled).

## Disclosures

- One GPU job at a time (PROTOCOL §8) was not kept during development: the g7 mini-opt GPU arm and the dev negative
  tests overlapped the pre-final D24-core GPU stage (01:25–01:40Z). Effect: timing only (all of them passed; results do
  not depend on co-scheduling). The final gates run strictly sequentially.
- Investigated as a possible hang (00:5xZ–01:36Z): see the top screen; units stopped: gpup2-par-1-D24-core (first
  pre-final run), gpup2-repro-d24core; no record was sealed from them.
- Chain units: `gpup2-final-gates` (stopped in step 1 to insert the qualification replay), `gpup2-final-gates-2`
  (step 1 FAILED on the replay record's lossy ±Inf encoding), `gpup2-final-gates-3` (current).
- G7 runs g7 and g7p hashed archive rows with plain JSON.stringify (±Inf/NaN → null): their identity holds for finite
  values; the final G7 (g7f) hashes in the store's encoding.
- G7 resume attempt 1 (01:30Z) refused by the archive binding because host code (`pool.ts`) was edited between the
  interrupt and the resume (backend digest changed): the guard works; the resume test was rerun (g7p).
- Development fixes before any gate record: FNV-64 offset-basis typo in the server (smoke/receipt checks caught it);
  sanitizer findings (leaks at exit; uninitialized padding copied by pack kernels; unwritten period slots) — none
  changed a result (all sanitized results were bit-identical), all fixed.
