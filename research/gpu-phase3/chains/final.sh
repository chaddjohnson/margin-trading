#!/bin/bash
# gpu-phase3 Stage 5: the FINAL acceptance campaign (PROTOCOL.md §7), once, on the committed final tree and the final
# binary. Strictly sequential (one GPU job at a time), fail-fast; START=<n> resumes from step n without rerunning passed
# steps (every step writes its own record). Never edit this file while it runs (copy it instead).
#   tools/gpu-phase3/launch.sh gpup3-final <abs log> -- /usr/bin/env START=1 /bin/bash research/gpu-phase3/chains/final.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=parity-test
START=${START:-1}
HW=${HW:-8}
L=/home/chad/projects/margin-trading/research/gpu-phase3/results/logs
O=research/gpu-phase3/results/optimizer
R=research/gpu-phase3/results
N() { "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning "$@"; }
k=0
step() { # step <name> <command...>   (skipped below START)
  k=$((k+1))
  local name=$1; shift
  if [ $k -lt "$START" ]; then echo "skip $k [$name]"; return 0; fi
  echo "$(date -u +%FT%TZ) start $k [$name]"
  "$@"
  local st=$?
  echo "$(date -u +%FT%TZ) end $k [$name] status $st"
  [ $st -eq 0 ] || { echo "FAILED $k [$name]"; exit 1; }
}
U() { # a contained sub-unit for a heavy step: U <unit> <log name> <command...>
  local unit=$1 log=$2; shift 2
  tools/gpu-phase3/launch.sh "$unit" "$L/$log.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$@"
}
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "FAILED: the source is not committed"; exit 1; }

step offline-check       N tools/gpu-phase3/offline-check.ts --workers 1,2,3,8,12 --out $R/final/offline-check.json
step parity-campaign     /usr/bin/env HW=$HW PARITY_OUT=$R/parity/final PARITY_LOG=$L/parity-final /bin/bash research/gpu-phase3/chains/parity.sh
step parity-summary      N tools/gpu-phase3/parity-summary.ts $R/parity/final
step finalists           U gpup3-finalists finalists "$NODE" --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/parity-finalists.ts --host-workers $HW --out $R/parity/final-finalists.json
step a3-r1               U gpup3-final-a3-r1 final-a3-r1 "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend gpu --run final-a3-r1 --job a3:C19:broad1 --host-workers $HW
step cmp-a3-r1           N tools/gpu-phase3/compare.ts sealed final-a3-r1/gpu a3 C19 broad1 --out $O/compare-final-a3-r1-vs-sealed.json
step a3-r2               U gpup3-final-a3-r2 final-a3-r2 "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend gpu --run final-a3-r2 --job a3:C19:broad1 --host-workers $HW
step cmp-a3-r2           N tools/gpu-phase3/compare.ts sealed final-a3-r2/gpu a3 C19 broad1 --out $O/compare-final-a3-r2-vs-sealed.json
step a3-qualify          U gpup3-final-a3q final-a3q "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/a3-qualify-replay.ts --cutoff C19 --run final-a3q --host-workers $HW --out $O/compare-final-a3q.json
step a2-r1               U gpup3-final-a2-r1 final-a2-r1 "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend gpu --run final-a2-r1 --job a2:C19:base --host-workers $HW
step cmp-a2-r1           N tools/gpu-phase3/compare.ts sealed final-a2-r1/gpu a2 C19 base --out $O/compare-final-a2-r1-vs-sealed.json
step a2-r2               U gpup3-final-a2-r2 final-a2-r2 "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend gpu --run final-a2-r2 --job a2:C19:base --host-workers $HW
step cmp-a2-r2           N tools/gpu-phase3/compare.ts sealed final-a2-r2/gpu a2 C19 base --out $O/compare-final-a2-r2-vs-sealed.json
step mini-cpu            U gpup3-final-mini-cpu final-mini-cpu "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend cpu --run final-mini --job mini --workers 12
for i in 1 2 3; do
  step mini-w$HW-r$i     N tools/gpu-phase3/replay.ts --backend gpu --run final-mini-w$HW-r$i --job mini --host-workers $HW
done
step mini-w1             N tools/gpu-phase3/replay.ts --backend gpu --run final-mini-w1 --job mini --host-workers 1
step mini-w0             N tools/gpu-phase3/replay.ts --backend gpu --run final-mini-w0 --job mini --host-workers 0
step mini-interrupted    bash -c "GPU_POLICY_PURPOSE=parity-test $NODE --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/replay.ts --backend gpu --run final-mini-resume --job mini --host-workers $HW --stop-after 6000; [ \$? -eq 75 ]"
step mini-resumed        N tools/gpu-phase3/replay.ts --backend gpu --run final-mini-resume --job mini --host-workers $HW
step cmp-mini-cpu        N tools/gpu-phase3/compare.ts arms final-mini/cpu final-mini-w$HW-r1/gpu --out $O/compare-final-mini-cpu-vs-gpu.json
step cmp-mini-resume     N tools/gpu-phase3/compare.ts arms final-mini-w$HW-r1/gpu final-mini-resume/gpu --out $O/compare-final-mini-gpu-vs-resumed.json
step cmp-mini-w1         N tools/gpu-phase3/compare.ts arms final-mini-w1/gpu final-mini-w$HW-r1/gpu --out $O/compare-final-mini-w1-vs-w8.json
step cmp-mini-w0         N tools/gpu-phase3/compare.ts arms final-mini-w0/gpu final-mini-w$HW-r1/gpu --out $O/compare-final-mini-w0-vs-w8.json
step cmp-mini-p2         N tools/gpu-phase3/compare.ts arms p2-mini-r1/gpu final-mini-w$HW-r1/gpu --out $O/compare-final-mini-p2-vs-final.json
step sanitizer           U gpup3-final-sanitizer sanitizer-final "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final --host-workers 4
step negative            N tools/gpu-phase3/negative.ts --out $R/policy/negative-final.json --host-workers 3
step tamper              N tools/gpu-phase3/tamper.ts --out $R/policy/tamper-final.json
step sustained           U gpup3-final-sustained sustained "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase3/sustained.ts --minutes 45 --out-dir research/gpu-phase3/results/sustained --host-workers $HW
step bench-summary       N tools/gpu-phase3/bench-summary.ts
echo "$(date -u +%FT%TZ) chain complete"
