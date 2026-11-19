# RESEARCH_RECOVERY — gpu-phase1-feasibility (GPU acceleration Phase 1: feasibility and proof of concept)

## Top screen

- **Updated:** 2026-11-18T20:02:35Z (UTC, from `date -u`)
- **Status:** **COMPLETE** — all stages done; verdict **CONDITIONAL GO** (Phase 2 needs the user's authorization).
- **Authority:** `brief/BRIEF.md` sha256 `5b95c198…8ad4`; `PROTOCOL.md` FROZEN 2026-11-18T18:20:06Z, sha256
  `171761164313efad976edbefd12e4be4e43553b047e133ff39b4b09eabb31189` (`results/protocol-freeze.json`, sealed);
  standard 2.2.0 adopted, scope diagnostic, preflight PASS; `AMENDMENTS.md` head: none.
- **Final build:** binary `build/gp1` sha256 `b3bcccdbc87bd1a31f3a708e6f9870a7e23ea78a4305a7847f96e3d78a3d7051`
  (git-ignored); client `src/gpu-phase1/gpu.ts` `2f63ce37f927d99f…` (every final parity record carries the full hashes).
- **Running:** nothing (units `gpup1-*` finished; no GPU server left).
- **Commits:** `dcc70df7` (protocol), `9eb921ae92c5ab294eee2509d3b6e37a6119d616` (code, records, reports), then the
  bundle/handoff commit and the push record (see §Push).
- **Next (needs the user):** decide Phase 2 (U1–U4 in `GPU_PHASE2_PLAN.md` §1); nothing starts automatically.

### Deliverables (sha256)

| File | sha256 |
|---|---|
| GPU_PHASE1_REPORT.md | ed4b65be3e272b8cd679a6682b72bac5bdf9965d6afa3c96b0df16d92c537cd0 |
| GPU_CPU_PARITY.md | 4c20ac89164096666a5fa7d84c98c61f683fe6af4cd2b705a2f1accddd76cb8f |
| GPU_BENCHMARKS.md | 55119a06beac321753e45204c82edee27de74e3a8daa7fb6b5a9651ae73ccce7 |
| GPU_PHASE2_PLAN.md | 0669f5ba068d52127295d8449b09d45afe1815d184f8b5a834f2b4ecb47c9994 |
| GPU_RESEARCH_HANDOFF.md | 762a22bd939575869e45f7d6975583cfcd12014bcf93c71aa5d4db356021f949 |
| bundle/gpu-phase1-report-bundle.zip | 7285d6bfa1d352c2b1a348695e5bb39c950046c9e1c21d95391282e07e118cc9 |
| bundle/MANIFEST.json | 544ba67b28c81a2944e8b18d1854ca33718408b3e7f4966fe42b7e85f3471e87 |
| results/tables/summary.json | 8b589fcfbae87176507d5f94544e1afe6aa37cbfac91c523c3efd1711ace89a7 |

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
| S4 negative tests G6 | complete | `tools/gpu-phase1/negative.ts` → `results/s4/negative.json` | 28/28 PASS |
| S4 adversarial fixtures | complete | `tools/gpu-phase1/parity-fixtures.ts --doors 6 --subjects 160` → `results/s4/parity-fixtures.json` | 960/960 bit-exact (an early smoke collided with another GPU job: explicit OOM error, fail-closed) |
| S4 final rerun (1) | complete, superseded | unit `gpup1-final` (`chains/final.sh`) on binary `b3bcccdb…` with the old client: all parity PASS | its benchmarks were stopped: the client's quadratic response buffering (46.9 s round trip for a 4,096 batch); partial record kept in `results/s5/pre-fix/` |
| FINAL chain (S4) | complete | unit `gpup1-final2` (`chains/final2.sh`): parity 13 files / 1,658 subjects PASS, fixtures 960/960, negative 28/28; its compute-sanitizer step failed (the PyPI sanitizer cannot instrument processes on Apollo: recorded limitation) | one build for all final records |
| FINAL chain (S5) | complete | unit `gpup1-final3` (`chains/final3.sh`) → `results/s5/*.json`; `tools/gpu-phase1/check-capacity-8192.ts` | slice 4.7–5.9× (batch 4,096), 6.9× (8,192); hybrid 1.65–1.97×; 0 record mismatches except 4 explicit capacity refusals |
| S6 tables, reports, bundle | complete | `tools/gpu-phase1/tables.ts`; the five reports; `bundle/` | npm test 1,680 / 1,669 pass / 7 known failures / 4 skipped |



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

## Disclosures

- The first benchmark run exposed a quadratic response-buffering bug in the client (46.9 s round trip for a 4,096 batch);
  fixed (linear), all final records re-run on the fixed build; the pre-fix record is kept in `results/s5/pre-fix/`.
- First-pass parity records (an earlier binary: 8 KiB stack limit, unconditional series writes) are kept in
  `results/s4/first-pass/`; identical outcomes.
- compute-sanitizer (PyPI 13.2.87) could not instrument any process ("terminated before first instrumented API call");
  no sanitizer evidence is claimed.
- File listings on Apollo show CET (UTC+1); every time in this checkpoint is UTC.

## Push

- 2026-11-18T20:03:15Z: `git push -u origin research/gpu-phase1-feasibility` (new branch); verified with
  `git ls-remote origin research/gpu-phase1-feasibility` = `a4dfbe286e1b336da713b43bf95de1aa135d11e0` = local HEAD
  (commits `dcc70df7`, `9eb921ae`, `a4dfbe28`). Not merged into `main`; nothing deployed or published elsewhere.
- This push record is committed on top of `a4dfbe28` and pushed the same way.
