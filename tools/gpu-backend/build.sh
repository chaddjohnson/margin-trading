#!/usr/bin/env bash
# gpu-backend: builds the CUDA evaluator server with the parity flags (binary64, no FMA contraction, IEEE div/sqrt).
#   tools/gpu-backend/build.sh <output binary> [compat digest]
# The compatibility digest (src/gpu-backend/compat.ts) is compiled in, so a binary always reports the mirrored
# TypeScript sources it was built against.
set -euo pipefail
OUT=${1:?output binary}
DIGEST=${2:-unset}
TK=${GPU_BACKEND_CUDA_HOME:-/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit}
SRC=$(cd "$(dirname "$0")/../../src/gpu-backend/cuda" && pwd)
FLAGS="-O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true -Xcompiler -ffp-contract=off"
mkdir -p "$(dirname "$OUT")"
"$TK/bin/nvcc" $FLAGS -diag-suppress 39,222 -I"$TK/include" -L"$TK/lib" \
  ${GB_EXTRA_DEFINES:-} -DGB_COMPAT_DIGEST="\"$DIGEST\"" -DGB_BUILD_FLAGS="\"$FLAGS nvcc-13.2.86\"" -o "$OUT.tmp.$$" "$SRC/gb_server.cu"
# nvcc names a static initializer after its PID-numbered temp file (tmpxft_<pid>_…) in the symbol table: strip it so
# the same sources, flags and digest always give the same sha256 (a reproducible, re-verifiable acceptance binary)
strip "$OUT.tmp.$$"
mv -f "$OUT.tmp.$$" "$OUT"  # an atomic replace: a running server keeps its own (old) file
sha256sum "$OUT"
