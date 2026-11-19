#!/bin/bash
# gpu-phase3 Stage 2 measurement (PROTOCOL.md §5 Priority A variants): the real Assignment 3 C19 broad1 job on the
# parallel host path with host workers 4, 8, 12 (batch 8,192) and 8 workers at batch 16,384; each run checked against
# the sealed record. Sequential, fail-fast; every run is kept and reported.
#   VARIANTS="w8-b8192 w4-b8192 w12-b8192 w8-b16384" /bin/bash research/gpu-phase3/chains/sweep.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=benchmark
O=research/gpu-phase3/results/optimizer
TAG=${TAG:-s2}
R() { "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts "$@"; }
C() { "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/compare.ts "$@"; }
step() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@"; local st=$?; echo "$(date -u +%FT%TZ) end [$name] status $st"; [ $st -eq 0 ] || { echo "FAILED [$name]"; exit 1; }; }
for v in ${VARIANTS:-w8-b8192 w4-b8192 w12-b8192 w8-b16384}; do
  w=${v%%-*}; w=${w#w}; b=${v##*-b}
  run="$TAG-a3-$v"
  step "$run" R --backend gpu --run "$run" --job a3:C19:broad1 --batch "$b" --linger 30 --host-workers "$w"
  step "cmp-$run" C sealed "$run/gpu" a3 C19 broad1 --out "$O/compare-$run-vs-sealed.json"
done
echo "$(date -u +%FT%TZ) chain complete"
