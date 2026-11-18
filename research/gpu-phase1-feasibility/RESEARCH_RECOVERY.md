# RESEARCH_RECOVERY — gpu-phase1-feasibility (GPU acceleration Phase 1: feasibility and proof of concept)

## Top screen

- **Updated:** 2026-11-18T18:14:16Z (UTC, from `date -u`)
- **Status:** INCOMPLETE — stage S0 (context and inventory) in progress.
- **Authority:** `research/gpu-phase1-feasibility/brief/BRIEF.md` (sha256 `5b95c198d5c1ae8ad8d4e8df9c7896b268fbd7123b63fed858317bd985a68ad4`,
  the user's Phase 1 brief, 193 lines, verified complete). Protocol: not yet written.
- **Complete:** branch created; CUDA 13.2 user-space toolchain installed and smoke-tested.
- **Running processes:** none.
- **Next command:** write PROTOCOL.md / STANDARD_ADOPTION.json (scope `diagnostic`), then the CPU baseline profiler.

## Environment

- Checkout: main checkout `/home/chad/projects/margin-trading` (no extra worktree, by the user's standing preference;
  the branch starts at the same commit, so switching changed no file and `data/` stays readable in place).
- Branch `research/gpu-phase1-feasibility`, created from `research/vg-l0-risk-metrics` HEAD
  `6afbfe67af63ced8b93958c5130d00d7a65aebc2` (clean tree).
- Node v24.21.0 (`.node-version`). Host apollo, Ubuntu 26.04.1, kernel 7.0.0-38-generic, Ryzen 7 9800X3D 8C/16T,
  64 GB RAM (59 GiB visible), RTX 5090 32 GB (cc 12.0, 170 SMs), driver 595.91.07 (open kernel module), CUDA 13.2 driver API.
- GPU co-tenants at start: Docker `ai-trading-qwen` (vLLM, ~27.9 GB VRAM, idle), gnome-remote-desktop (0.5 GB),
  gnome-shell/Xwayland. Free VRAM ≈ 2.8 GiB. Docker `ai-trading-mongodb`. No research unit or Strategy Lab server running.
- CUDA toolchain (user space, no root, no driver/apt change): uv venv
  `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv` with nvidia-cuda-nvcc / -runtime / -crt / -nvrtc / -cccl
  13.2.86, nvidia-nvvm 13.2.86, nvidia-cuda-sanitizer-api 13.2.87. Prefix `…/site-packages/nvidia/cu13`
  (bin/nvcc, bin/compute-sanitizer, include, lib). Removal: `rm -rf /home/chad/.local/share/margin-trading-gpu`.
- Smoke test (scratch): FP64 FMA ≈ 1.6 TFLOP/s, FP32 ≈ 105–113 TFLOP/s on sm_120 with nvcc 13.2.86 + gcc 15.2.

## Data fingerprints

| File | sha256 | rows |
|---|---|---:|
| data/VGT/data.csv | 2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e | 935,608 |
| data/GDX/data.csv | 77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049 | 1,490,494 |

## Stage table

| Stage | Status | Notes |
|---|---|---|
| S0 context, inventory, toolchain | running | |
| S1 CPU baseline profiling | not started | |
| S2 architecture analysis | not started | |
| S3 CUDA POC implementation | not started | |
| S4 parity gates | not started | |
| S5 benchmarks | not started | |
| S6 reports, ZIP, commit, push | not started | |

## Guards

- Do not run the deferred 40% marked-DD / 25% trade-principal-loss / 25% banked-capital-DD envelope pilot.
- Do not modify production simulator/optimizer code, sealed studies or Strategy Lab; do not touch `state/strategy-lab/`.
- Do not stop vLLM or other user services; do not change display routing, BIOS, driver or boot configuration.
- No visuals (CLAUDE.md reporting preference).
