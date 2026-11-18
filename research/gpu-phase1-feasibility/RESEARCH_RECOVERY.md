# RESEARCH_RECOVERY — gpu-phase1-feasibility (GPU acceleration Phase 1: feasibility and proof of concept)

## Top screen

- **Updated:** 2026-11-18T19:20:30Z (UTC, from `date -u`)
- **Status:** INCOMPLETE — the FINAL chain is running (one consistent build); reports drafted with placeholders.
- **Authority:** `brief/BRIEF.md` sha256 `5b95c198…8ad4`; `PROTOCOL.md` FROZEN 2026-11-18T18:20:06Z, sha256
  `171761164313efad976edbefd12e4be4e43553b047e133ff39b4b09eabb31189` (`results/protocol-freeze.json`, sealed);
  standard 2.2.0 adopted, scope diagnostic, preflight PASS; `AMENDMENTS.md` head: none.
- **Final build:** binary `research/gpu-phase1-feasibility/build/gp1` sha256 `b3bcccdbc87bd1a31f3a708e6f9870a7e23ea78a4305a7847f96e3d78a3d7051`;
  client `src/gpu-phase1/gpu.ts` sha256 prefix `2f63ce37f927d99f` (linear response buffering).
- **Running:** unit `gpup1-final2` = `/bin/bash research/gpu-phase1-feasibility/chains/final2.run.sh` (copy of
  `chains/final2.sh`), log `results/logs/final2-chain.log`; prints `parity done` after S4 and `CHAIN-DONE` at the end.
  Outputs: `results/s4/*.json` (overwritten with the final build), `results/s5/*.json`.
- **Next:** when `CHAIN-DONE`: `node --experimental-transform-types tools/gpu-phase1/tables.ts`; check sanitizer logs
  (`results/logs/sanitizer-*.log`: "ERROR SUMMARY: 0 errors"); fill the report placeholders from the records; lint fixes
  for bench.ts / cpuPool.ts / cpuWorker.ts / context.ts / subjects.ts / dataset.ts (formatting only, after the chain);
  `npm test` (GPU test included); ZIP; commit; push.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/gpu-phase1-feasibility` from `6afbfe67`
  (protocol commit `dcc70df7`). No extra worktree (user preference); `data/` read in place, never written.
- Node v24.21.0 (absolute path for units: `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`).
- Host apollo: Ubuntu 26.04.1, kernel 7.0.0-38, Ryzen 7 9800X3D 8C/16T, 59 GiB visible RAM; RTX 5090 32 GB, cc 12.0,
  170 SMs, 96 MiB L2, driver 595.91.07 (open), CUDA 13.2 driver API; kernel watchdog OFF (`cudaDevAttrKernelExecTimeout` 0).
- GPU co-tenants: Docker `ai-trading-qwen` (vLLM ≈ 27.97 GB VRAM, idle), gnome-remote-desktop 0.5 GB. Free ≈ 2.8 GiB.
  Never stopped or reconfigured. Display untouched.
- CUDA toolchain (user space; nothing system-wide): uv venv `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv`,
  pip wheels nvidia-cuda-nvcc / -runtime / -crt / -nvrtc / -cccl 13.2.86, nvidia-nvvm 13.2.86 (pinned down from a
  floating 13.5.37), nvidia-cuda-sanitizer-api 13.2.87. Prefix `…/site-packages/nvidia/cu13`. Removal: delete that directory.
- Build: `$CU/bin/nvcc -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true -o research/gpu-phase1-feasibility/build/gp1 src/gpu-phase1/cuda/gp1.cu`
  (binary git-ignored). Containment: `tools/gpu-phase1/launch.sh <unit> <abs log> [--wait] -- <cmd>` (gpup1.slice 44G/48G/0).

## Data fingerprints

| File | sha256 | rows |
|---|---|---:|
| data/VGT/data.csv | 2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e | 935,608 |
| data/GDX/data.csv | 77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049 | 1,490,494 |

## Stage table

| Stage | Status | Command / output | Result |
|---|---|---|---|
| S0 inventory, toolchain | complete | see Environment | GPU computes (FP64 ≈ 1.6, FP32 ≈ 105–113 TFLOP/s) |
| S1a component profile | complete | unit `gpup1-s1-profile`: `tools/gpu-phase1/profile-components.ts --doors D24,FULL,D19,W-QUIET,W-CRASH,W-BEAR,W-TREND --random 48 --reps 3` → `results/s1/components.json` (`5b0f817f…`) | D24 mean ms: D1·GDX 12.4, D1·VGT 10.0, Growth 43.6, pool 20.8, record 0.45; composed = evaluate record for all |
| S1b CPU pool bench | complete | unit `gpup1-s1-bench`: `bench-cpu-pool.ts` → `results/s1/cpu-pool-D24.json` (`d3860c4e…`), `-D19` (`153a37a8…`), `-FULL` (`ecbe0e38…`) | D24: 12.0 / 88.2 / 92.0 / 90.3 / 90.4 ev/s at 1/8/12/14/16 workers; D19 194.3, FULL 74.4 at 12 |
| S3 CUDA POC v1 | built | `src/gpu-phase1/cuda/{gp1.h,gp1_device.cuh,gp1_kernels.cuh,gp1.cu}` | first-pass binary sha256 `692d2547…` |
| S4 parity (first pass) | running | unit `gpup1-s4-parity-chain` → `results/s4/parity-*.json` | D24, FULL 130/130; D19 130/130; windows 194/194 each; G4 New L0 + N/original exact on D24 and FULL; G5 0 mismatches |
| S4 negative tests G6 | not started | `tools/gpu-phase1/negative.ts` | |
| S4 adversarial fixtures | not started | `tools/gpu-phase1/parity-fixtures.ts` (smoke collided with the chain's GPU use: explicit OOM error, fail-closed) | |
| S4 final rerun (1) | complete, superseded | unit `gpup1-final` (`chains/final.sh`) on binary `b3bcccdb…` with the old client: all parity PASS | its benchmarks were stopped: the client's quadratic response buffering (46.9 s round trip for a 4,096 batch); partial record kept in `results/s5/pre-fix/` |
| FINAL chain | running | unit `gpup1-final2` (`chains/final2.sh`): parity, fixtures, negative, sanitizer, benchmarks | |
| S5 benchmarks | not started | `tools/gpu-phase1/bench.ts --mode slice|hybrid` | |
| S6 reports, ZIP, commit, push | not started | | |

## Findings so far (on disk in the records above)

- Growth ≈ 50–61% of a D24 evaluation's CPU time; D1 books + pool ≈ 41–50%; record ≈ 0.5%.
- A single GPU thread needs ≈ 0.7 s to walk one D24 book; batches of 130 take ≈ 2.8 s of kernel time: throughput needs
  thousands of candidates per batch (S5 will measure the scaling).
- An 8 KiB per-thread stack limit reserves ≈ 2 GiB of VRAM: removed in source (default 1 KiB; kernels use ≤ 144 B).

## Guards

- Do not run the deferred 40% marked-DD / 25% trade-principal-loss / 25% banked-capital-DD envelope pilot.
- Do not modify production simulator/optimizer code (`src/` outside `src/gpu-phase1/`), sealed studies or Strategy Lab;
  do not touch `state/strategy-lab/`. Doors only through `src/gpu-phase1/context.ts openDoor` (quiet; own doors.jsonl).
- Do not stop vLLM or other services; no display, BIOS, driver, apt or boot change.
- No GPU job concurrently with another GPU job of this study (VRAM ≈ 2.8 GiB).
- No visuals (CLAUDE.md). AD7: no money figure for non-reference configurations.
