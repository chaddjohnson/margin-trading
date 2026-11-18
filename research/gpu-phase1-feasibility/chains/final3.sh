#!/bin/bash
# gpu-phase1-feasibility: the FINAL chain on one consistent build (binary b3bcccdb…, client with linear response
# buffering): S4 parity reruns, adversarial fixtures, negative tests, compute-sanitizer checks, then the S5 benchmarks.
# Fail-fast; one GPU job at a time. Never edit while running (bash reads scripts incrementally): run a copy.
set -euo pipefail
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
O=$R/research/gpu-phase1-feasibility/results
P="$N --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
# final3: the S5 benchmarks of final2.sh (whose S4 part completed; its sanitizer step failed: the PyPI compute-sanitizer
# 13.2.87 cannot instrument any process on this host — a recorded limitation), on the same build.
echo "start $(date -u +%FT%TZ) binary $(sha256sum $R/research/gpu-phase1-feasibility/build/gp1 | cut -c1-16) client $(sha256sum $R/src/gpu-phase1/gpu.ts | cut -c1-16)"
B="$P $R/tools/gpu-phase1/bench.ts"
$B --mode slice --door D24 --n 4096 --batches 64,256,1024,2048,4096 --workers 12 --reps 2 --out $O/s5/slice-D24-median.json
$B --mode slice --door D24 --n 8192 --batches 4096,8192 --workers 12 --reps 2 --trade-cap 256 --lot-cap 256 --out $O/s5/slice-D24-median-8192.json
$B --mode slice --door D24 --set heavy --n 4096 --batches 1024,4096 --workers 12 --reps 2 --out $O/s5/slice-D24-heavy.json
$B --mode slice --door FULL --n 4096 --batches 1024,4096 --workers 12 --reps 2 --out $O/s5/slice-FULL-median.json
$B --mode slice --door D19 --n 4096 --batches 1024,4096 --workers 12 --reps 2 --out $O/s5/slice-D19-median.json
$B --mode slice --door W-CRASH --n 4096 --batches 1024,4096 --workers 12 --reps 2 --out $O/s5/slice-W-CRASH-median.json
$B --mode hybrid --door D24 --n 6144 --hybrid-batch 1024 --workers 12 --out $O/s5/hybrid-D24-median-w12-b1024.json
$B --mode hybrid --door D24 --n 6144 --hybrid-batch 2048 --workers 14 --out $O/s5/hybrid-D24-median-w14-b2048.json
$B --mode hybrid --door D24 --set heavy --n 6144 --hybrid-batch 1024 --workers 12 --out $O/s5/hybrid-D24-heavy-w12-b1024.json
echo "CHAIN-DONE $(date -u +%FT%TZ)"
