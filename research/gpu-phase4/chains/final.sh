#!/bin/bash
# gpu-phase4 stage C (PROTOCOL.md §10): the FINAL acceptance campaign, ONCE, on the committed final tree (CC1–CC3
# applied) and the final binary research/gpu-phase4/build/gb4 — docs/gpu/PARITY_CHECKLIST.md §2 (adapted from
# research/gpu-phase3/chains/final.sh). Strictly sequential (one GPU job at a time), fail-fast; START=<n> resumes from
# step n without rerunning passed steps (each step writes its own record). Never edit this file while it runs.
#   MODEA_K=<k> MODEA_W=<host workers per process> tools/gpu-phase4/launch.sh p4chain-final <abs log> -- /usr/bin/env START=1 /bin/bash research/gpu-phase4/chains/final.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=parity-test
START=${START:-1}
HW=${HW:-8}
MODEA_K=${MODEA_K:?the Mode A job count (PROTOCOL.md §10.7)}
MODEA_W=${MODEA_W:?the Mode A host workers per process}
L=/home/chad/projects/margin-trading/research/gpu-phase4/results/logs/final
O=research/gpu-phase4/results/optimizer
R=research/gpu-phase4/results
mkdir -p "$L"
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
  tools/gpu-phase4/launch-slice.sh "$unit" "$L/$log.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$@"
}
RP() { # a replay in a contained sub-unit: RP <unit> <args…>
  local unit=$1; shift
  U "$unit" "$unit" "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/replay.ts "$@"
}
SUST() { # the bounded reliability run in the Mode A configuration: MODEA_K concurrent processes, 32 minutes each
  local i pids=()
  if [ "$MODEA_K" -eq 1 ]; then
    U gpup4-final-sustained sustained "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/sustained.ts --minutes 32 --out-dir $R/sustained --host-workers "$MODEA_W"
    return $?
  fi
  for ((i = 0; i < MODEA_K; i++)); do
    U "gpup4-final-sustained-p$i" "sustained-p$i" "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/sustained.ts --minutes 32 --out-dir $R/sustained/p$i --host-workers "$MODEA_W" --proc "$i" --ref-workers 2 &
    pids+=($!)
  done
  local rc=0
  for p in "${pids[@]}"; do wait "$p" || rc=1; done
  return $rc
}
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "FAILED: the source is not committed"; exit 1; }

step build-final         tools/gpu-phase4/build-final.sh
step offline-check       N tools/gpu-phase4/offline-check.ts --workers 1,2,3,8,12 --out $R/final/offline-check.json
step parity-campaign     /usr/bin/env HW=$HW PARITY_OUT=$R/parity/final PARITY_LOG=$L/parity /bin/bash research/gpu-phase4/chains/parity.sh
step parity-summary      N tools/gpu-phase4/parity-summary.ts $R/parity/final
step finalists           U gpup4-final-finalists finalists "$NODE" --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/parity-finalists.ts --host-workers $HW --out $R/parity/final-finalists.json
step a3-r1               RP gpup4-final-a3-r1 --backend gpu --run final-a3-r1 --job a3:C19:broad1 --batch 8192 --linger 30 --host-workers $HW
step cmp-a3-r1           N tools/gpu-phase4/compare.ts sealed final-a3-r1/gpu a3 C19 broad1 --out $O/compare-final-a3-r1-vs-sealed.json
step a3-r2               RP gpup4-final-a3-r2 --backend gpu --run final-a3-r2 --job a3:C19:broad1 --batch 8192 --linger 30 --host-workers $HW
step cmp-a3-r2           N tools/gpu-phase4/compare.ts sealed final-a3-r2/gpu a3 C19 broad1 --out $O/compare-final-a3-r2-vs-sealed.json
step a3-qualify          U gpup4-final-a3q final-a3q "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/a3-qualify-replay.ts --cutoff C19 --run final-a3q --host-workers $HW --out $O/compare-final-a3q.json
step a2-r1               RP gpup4-final-a2-r1 --backend gpu --run final-a2-r1 --job a2:C19:base --batch 8192 --linger 30 --host-workers $HW
step cmp-a2-r1           N tools/gpu-phase4/compare.ts sealed final-a2-r1/gpu a2 C19 base --out $O/compare-final-a2-r1-vs-sealed.json
step mini-cpu            RP gpup4-final-mini-cpu --backend cpu --run final-mini --job mini --workers 12
step mini-w8             N tools/gpu-phase4/replay.ts --backend gpu --run final-mini-w$HW --job mini --batch 8192 --linger 30 --host-workers $HW
step mini-w1             N tools/gpu-phase4/replay.ts --backend gpu --run final-mini-w1 --job mini --batch 8192 --linger 30 --host-workers 1
step mini-w0             N tools/gpu-phase4/replay.ts --backend gpu --run final-mini-w0 --job mini --batch 8192 --linger 30 --host-workers 0
step mini-interrupted    bash -c "GPU_POLICY_PURPOSE=parity-test $NODE --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/replay.ts --backend gpu --run final-mini-resume --job mini --batch 8192 --linger 30 --host-workers $HW --stop-after 6000; [ \$? -eq 75 ]"
step mini-resumed        N tools/gpu-phase4/replay.ts --backend gpu --run final-mini-resume --job mini --batch 8192 --linger 30 --host-workers $HW --resume
step cmp-mini-cpu        N tools/gpu-phase4/compare.ts arms final-mini/cpu final-mini-w$HW/gpu --out $O/compare-final-mini-cpu-vs-gpu.json
step cmp-mini-resume     N tools/gpu-phase4/compare.ts arms final-mini-w$HW/gpu final-mini-resume/gpu --out $O/compare-final-mini-gpu-vs-resumed.json
step cmp-mini-w1         N tools/gpu-phase4/compare.ts arms final-mini-w1/gpu final-mini-w$HW/gpu --out $O/compare-final-mini-w1-vs-w8.json
step cmp-mini-w0         N tools/gpu-phase4/compare.ts arms final-mini-w0/gpu final-mini-w$HW/gpu --out $O/compare-final-mini-w0-vs-w8.json
step sanitizer           U gpup4-final-sanitizer sanitizer-final "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase4/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final --host-workers 4
step negative            N tools/gpu-phase4/negative.ts --out $R/policy/negative-final.json --host-workers 3
step tamper              N tools/gpu-phase4/tamper.ts --out $R/policy/tamper-final.json
step sustained           SUST
step regression          N tools/gpu-phase4/regression.ts
step tests               /bin/bash research/gpu-phase4/chains/tests.sh
echo "$(date -u +%FT%TZ) chain final complete"
