# RESEARCH_RECOVERY — gpu-phase2 (GPU acceleration Phase 2: complete parity, mandatory GPU optimization)

## Top screen

- **Updated:** 2026-11-19T00:57Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — S3/S5/S6 (evaluator v2 with the full Growth port) built and probing bit-exact; S7a
  pre-final parity campaign RUNNING; S2 (policy + enforcement) next.
- **Authority:** `brief/BRIEF.md` sha256 `25c1fa47…459d` (283 lines, read in full). `PROTOCOL.md` FROZEN
  2026-11-19T00:25Z (`results/protocol-freeze.json` sha256 `b274caab…f999`, sealed 0444; protocol commit `8dad359e`).
  Standard 2.2.0 adopted (scope diagnostic), preflight PASS. `AMENDMENTS.md`: none.
- **Running:** unit `gpup2-parity-prefinal` (chain `research/gpu-phase2/chains/parity.sh`, env PARITY_OUT=
  `results/parity/prefinal`, log `results/logs/parity-prefinal-chain.txt`; sub-units `gpup2-par-<n>-<name>`, logs
  `results/logs/parity-prefinal/<name>.txt`). Binary `build/gb2` sha256 `29607e4d…9606` (compat digest `206b9b64…d691`).
  It is the PRE-FINAL campaign (early detection); the FINAL campaign reruns the same chain on the frozen final binary
  (PARITY_OUT default `results/parity/final`). Check: `systemctl --user list-units 'gpup2*'`; chain log "end [" / "FAILED".
- **Next:** S2 policy/enforcement code (`src/gpu-backend/policy.ts`, GpuPool, official gate, preflight 3.0.0), then
  parallel decode, mini-optimization, negative tests, benchmarks, 24 h stress, docs.

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

- Development fixes before any gate record: FNV-64 offset-basis typo in the server (smoke/receipt checks caught it);
  sanitizer findings (leaks at exit; uninitialized padding copied by pack kernels; unwritten period slots) — none
  changed a result (all sanitized results were bit-identical), all fixed.
