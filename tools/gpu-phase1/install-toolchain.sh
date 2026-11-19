#!/bin/bash
# gpu-phase1-feasibility: the user-space CUDA toolchain used by the proof of concept (installed 2026-11-18 on Apollo).
# NVIDIA's official CUDA 13.2 wheels (PyPI) in a dedicated uv virtual environment under the user's home: no root, no apt,
# no driver, display, Docker or system-path change. Pinned to the CUDA 13.2 line the installed driver (595.91.07,
# CUDA 13.2 driver API) supports; nvidia-nvvm is pinned explicitly because it otherwise floats to the newest release.
# Footprint ≈ 464 MB. Removal (complete rollback): rm -rf "$T".
set -euo pipefail
T=${GPUP1_TOOLCHAIN_DIR:-/home/chad/.local/share/margin-trading-gpu}
mkdir -p "$T"
uv venv --python /usr/bin/python3 "$T/cuda-13.2-venv"
uv pip install --python "$T/cuda-13.2-venv/bin/python" \
  "nvidia-cuda-nvcc==13.2.86" "nvidia-cuda-runtime==13.2.86" "nvidia-cuda-crt==13.2.86" "nvidia-cuda-nvrtc==13.2.86" \
  "nvidia-cuda-cccl==13.2.86" "nvidia-nvvm==13.2.86" "nvidia-cuda-sanitizer-api==13.2.87"
CU="$T/cuda-13.2-venv/lib/python3.14/site-packages/nvidia/cu13"
"$CU/bin/nvcc" --version
# build the evaluator (from the repository root)
"$CU/bin/nvcc" -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true \
  -o research/gpu-phase1-feasibility/build/gp1 src/gpu-phase1/cuda/gp1.cu
echo "built research/gpu-phase1-feasibility/build/gp1 (run with LD_LIBRARY_PATH=$CU/lib)"
