#!/bin/bash
# gpu-phase1-feasibility: the final S4 parity reruns (final binary) and the S5 benchmarks, fail-fast, one GPU job at a time.
# Launched with tools/gpu-phase1/launch.sh (gpup1.slice). Never edit while running (bash reads scripts incrementally).
set -euo pipefail
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
O=$R/research/gpu-phase1-feasibility/results
P="$N --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
mkdir -p $O/s4 $O/s5
echo "start $(date -u +%FT%TZ) binary $(sha256sum $R/research/gpu-phase1-feasibility/build/gp1 | cut -c1-16)"
$P $R/tools/gpu-phase1/parity.ts --door D24 --random 64 --neighbours 16 --batches 0,1,7,64 --out $O/s4/parity-D24.json
$P $R/tools/gpu-phase1/parity.ts --door FULL --random 64 --neighbours 16 --batches 0,13,128 --out $O/s4/parity-FULL.json
$P $R/tools/gpu-phase1/parity.ts --door D19 --random 64 --neighbours 16 --batches 0,32 --out $O/s4/parity-D19.json
for w in W-QUIET W-CRASH W-BEAR W-TREND; do
  $P $R/tools/gpu-phase1/parity.ts --door $w --random 128 --neighbours 16 --batches 0,50 --out $O/s4/parity-$w.json
done
for o in cost10 cost20 rate14 slip25 nextopen native; do
  $P $R/tools/gpu-phase1/parity.ts --door D24 --options $o --random 32 --neighbours 8 --batches 0,16 --out $O/s4/parity-D24-$o.json
done
echo "parity done $(date -u +%FT%TZ)"
B="$P $R/tools/gpu-phase1/bench.ts"
$B --mode slice --door D24 --n 4096 --batches 64,256,1024,2048,4096 --workers 12 --reps 2 --out $O/s5/slice-D24-median.json
$B --mode slice --door D24 --set heavy --n 4096 --batches 256,1024,4096 --workers 12 --reps 2 --out $O/s5/slice-D24-heavy.json
$B --mode slice --door FULL --n 4096 --batches 256,1024,4096 --workers 12 --reps 2 --out $O/s5/slice-FULL-median.json
$B --mode slice --door D19 --n 4096 --batches 256,1024,4096 --workers 12 --reps 2 --out $O/s5/slice-D19-median.json
$B --mode slice --door W-CRASH --n 4096 --batches 256,1024,4096 --workers 12 --reps 2 --out $O/s5/slice-W-CRASH-median.json
$B --mode hybrid --door D24 --n 4096 --hybrid-batch 1024 --workers 12 --out $O/s5/hybrid-D24-median-w12.json
$B --mode hybrid --door D24 --n 4096 --hybrid-batch 2048 --workers 14 --out $O/s5/hybrid-D24-median-w14.json
$B --mode hybrid --door D24 --set heavy --n 4096 --hybrid-batch 1024 --workers 12 --out $O/s5/hybrid-D24-heavy-w12.json
echo "CHAIN-DONE $(date -u +%FT%TZ)"
