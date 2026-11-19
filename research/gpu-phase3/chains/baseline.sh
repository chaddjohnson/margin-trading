#!/bin/bash
# gpu-phase3 Stage 1: the ACCEPTED PHASE 2 host path (unmodified code at research/gpu-phase2 a1836407 + the Phase 3
# replay tool) on the Phase 2 binary 3fe09e67…, real optimizer jobs, sequential (one GPU job at a time). Fail-fast.
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=benchmark
R() { "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts "$@"; }
C() { "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/compare.ts "$@"; }
step() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@"; local st=$?; echo "$(date -u +%FT%TZ) end [$name] status $st"; [ $st -eq 0 ] || { echo "FAILED [$name]"; exit 1; }; }
O=research/gpu-phase3/results/optimizer
step p2-a3-r1 R --backend gpu --run p2-a3-r1 --job a3:C19:broad1 --batch 8192 --linger 30
step cmp-p2-a3-r1 C sealed p2-a3-r1/gpu a3 C19 broad1 --out $O/compare-p2-a3-r1-vs-sealed.json
step p2-a3-r2 R --backend gpu --run p2-a3-r2 --job a3:C19:broad1 --batch 8192 --linger 30
step cmp-p2-a3-r2 C sealed p2-a3-r2/gpu a3 C19 broad1 --out $O/compare-p2-a3-r2-vs-sealed.json
step p2-a2-r1 R --backend gpu --run p2-a2-r1 --job a2:C19:base --batch 8192 --linger 30
step cmp-p2-a2-r1 C sealed p2-a2-r1/gpu a2 C19 base --out $O/compare-p2-a2-r1-vs-sealed.json
for i in 1 2 3; do step p2-mini-r$i R --backend gpu --run p2-mini-r$i --job mini --batch 8192 --linger 30; done
step cmp-p2-mini C arms p2-mini-r1/gpu p2-mini-r2/gpu --out $O/compare-p2-mini-r1-vs-r2.json
echo "$(date -u +%FT%TZ) chain complete"
