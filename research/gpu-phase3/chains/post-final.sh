#!/bin/bash
# gpu-phase3: after the final campaign (chains/final.sh) — the repository and Strategy Lab suites (H7, GPU free), then
# the protocol's 12-worker CPU baseline of the Assignment 3 C19 broad1 job, once (PROTOCOL.md §2; non-official,
# purpose benchmark; nothing else runs meanwhile), its identity check against the sealed record, and the benchmark
# summary of every run (H8). Fail-fast per step; START=<n> resumes.
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
START=${START:-1}
O=research/gpu-phase3/results/optimizer
k=0
step() { k=$((k+1)); local name=$1; shift; if [ $k -lt "$START" ]; then echo "skip $k [$name]"; return 0; fi; echo "$(date -u +%FT%TZ) start $k [$name]"; "$@"; local st=$?; echo "$(date -u +%FT%TZ) end $k [$name] status $st"; [ $st -eq 0 ] || { echo "FAILED $k [$name]"; exit 1; }; }
step tests        /bin/bash research/gpu-phase3/chains/tests.sh
step cpu-a3       env GPU_POLICY_PURPOSE=benchmark "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend cpu --run final-a3-cpu --job a3:C19:broad1 --workers 12
step cmp-cpu-a3   "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/compare.ts sealed final-a3-cpu/cpu a3 C19 broad1 --out $O/compare-final-a3-cpu-vs-sealed.json
step bench        "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/bench-summary.ts
echo "$(date -u +%FT%TZ) chain complete"
