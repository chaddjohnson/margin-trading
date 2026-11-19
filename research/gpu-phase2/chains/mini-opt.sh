#!/bin/bash
# gpu-phase2 gate G7: the fixed-seed mini-optimization on both backends, plus an interrupted-and-resumed GPU run.
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
RUN=${RUN:-g7}
ARGS="--door D19 --cells GA0.VA0,GB1.VD0,GC0.VB1,GD1.VC0,GA1.VD1,GB0.VC1,GC1.VA1,GD0.VB0 --replicates 2"
M() { "$NODE" --expose-gc --max-old-space-size=14000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/mini-opt.ts "$@"; }
set -u
echo "$(date -u +%FT%TZ) start [cpu]";  GPU_POLICY_PURPOSE=parity-test M --backend cpu --run "$RUN" $ARGS || { echo "FAILED [cpu]"; exit 1; }
echo "$(date -u +%FT%TZ) start [gpu]";  M --backend gpu --run "$RUN" $ARGS || { echo "FAILED [gpu]"; exit 1; }
echo "$(date -u +%FT%TZ) start [gpu interrupted]"; M --backend gpu --run "$RUN-resume" $ARGS --stop-after 2000; rc=$?
[ $rc -eq 75 ] || { echo "FAILED [gpu interrupted] rc=$rc (expected 75)"; exit 1; }
echo "$(date -u +%FT%TZ) start [gpu resumed]"; M --backend gpu --run "$RUN-resume" $ARGS || { echo "FAILED [gpu resumed]"; exit 1; }
C() { "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/mini-opt-compare.ts "$1" "$2" --out "research/gpu-phase2/results/optimizer/$3.json" || { echo "FAILED [compare $3]"; exit 1; }; }
C "$RUN/cpu" "$RUN/gpu" "compare-$RUN-cpu-vs-gpu"
C "$RUN/gpu" "$RUN-resume/gpu" "compare-$RUN-gpu-vs-resumed"
echo "$(date -u +%FT%TZ) chain complete"
