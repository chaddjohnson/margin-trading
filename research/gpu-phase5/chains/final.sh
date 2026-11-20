#!/bin/bash
# gpu-phase5 stage A (PROTOCOL.md §7): the FINAL acceptance campaign, ONCE, on the committed final tree and the final
# binary research/gpu-phase5/build/gb5 — docs/gpu/PARITY_CHECKLIST.md §2 (adapted from research/gpu-phase4/chains/
# final.sh). Every Node process runs under --no-maglev (src/gpu-backend/runtime.ts). Strictly sequential (one GPU job at
# a time, except the declared concurrency tests), fail-fast; START=<n> resumes from step n without rerunning passed
# steps (each step writes its own record). Never edit this file while it runs.
#   tools/gpu-phase5/launch.sh p5chain-final <abs log> -- /usr/bin/env START=1 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase5/chains/final.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=parity-test
START=${START:-1}
HW=${HW:-8}
MODEA_K=${MODEA_K:?the Mode A job count}
MODEA_W=${MODEA_W:?the Mode A host workers per process}
L=/home/chad/projects/margin-trading/research/gpu-phase5/results/logs/final
O=research/gpu-phase5/results/optimizer
R=research/gpu-phase5/results
GB3=/home/chad/projects/margin-trading/research/gpu-phase3/build/gb3
mkdir -p "$L" "$R/final" "$R/rootcause"
N() { "$NODE" --no-maglev --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning "$@"; }
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
  tools/gpu-phase5/launch-slice.sh "$unit" "$L/$log.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$@"
}
RP() { # a replay in a contained sub-unit: RP <unit> <args…>
  local unit=$1; shift
  U "$unit" "$unit" "$NODE" --no-maglev --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/replay.ts "$@"
}
SUST() { # the bounded reliability run in the Mode A configuration: MODEA_K concurrent processes, 32 minutes each
  local i pids=()
  for ((i = 0; i < MODEA_K; i++)); do
    U "gpup5-final-sustained-p$i" "sustained-p$i" "$NODE" --no-maglev --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/sustained.ts --minutes 32 --out-dir $R/sustained/p$i --host-workers "$MODEA_W" --proc "$i" --ref-workers 2 &
    pids+=($!)
  done
  local rc=0
  for p in "${pids[@]}"; do wait "$p" || rc=1; done
  return $rc
}
BENCH() { # one benchmark group through lib.sh's bench (group → verify → summarize → gate) in a subshell
  ( source /home/chad/projects/margin-trading/research/gpu-phase5/chains/lib.sh; bench "$@" )
}
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "FAILED: the source is not committed"; exit 1; }

step build-final         tools/gpu-phase5/build-final.sh
step offline-check       N tools/gpu-phase5/offline-check.ts --workers 1,2,3,8,12 --out $R/final/offline-check.json
step host-soak           U gpup5-final-host-soak host-soak "$NODE" --no-maglev --expose-gc --max-old-space-size=14000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/host-soak.ts --cycles 150 --max-minutes 25 --mode full --load 12 --out $R/rootcause/host-soak-final.json
step parity-campaign     /usr/bin/env HW=$HW PARITY_OUT=$R/parity/final PARITY_LOG=$L/parity /bin/bash research/gpu-phase5/chains/parity.sh
step parity-summary      N tools/gpu-phase5/parity-summary.ts $R/parity/final
step finalists           U gpup5-final-finalists finalists "$NODE" --no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/parity-finalists.ts --host-workers $HW --out $R/parity/final-finalists.json
step a3-r1               RP gpup5-final-a3-r1 --backend gpu --run final-a3-r1 --job a3:C19:broad1 --batch 8192 --linger 30 --host-workers $HW
step cmp-a3-r1           N tools/gpu-phase5/compare.ts sealed final-a3-r1/gpu a3 C19 broad1 --out $O/compare-final-a3-r1-vs-sealed.json
step a3-r2               RP gpup5-final-a3-r2 --backend gpu --run final-a3-r2 --job a3:C19:broad1 --batch 8192 --linger 30 --host-workers $HW
step cmp-a3-r2           N tools/gpu-phase5/compare.ts sealed final-a3-r2/gpu a3 C19 broad1 --out $O/compare-final-a3-r2-vs-sealed.json
step a3-qualify          U gpup5-final-a3q final-a3q "$NODE" --no-maglev --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/a3-qualify-replay.ts --cutoff C19 --run final-a3q --host-workers $HW --out $O/compare-final-a3q.json
step a2-r1               RP gpup5-final-a2-r1 --backend gpu --run final-a2-r1 --job a2:C19:base --batch 8192 --linger 30 --host-workers $HW
step cmp-a2-r1           N tools/gpu-phase5/compare.ts sealed final-a2-r1/gpu a2 C19 base --out $O/compare-final-a2-r1-vs-sealed.json
step mini-cpu            RP gpup5-final-mini-cpu --backend cpu --run final-mini --job mini --workers 12
step mini-w8             N tools/gpu-phase5/replay.ts --backend gpu --run final-mini-w$HW --job mini --batch 8192 --linger 30 --host-workers $HW
step mini-w1             N tools/gpu-phase5/replay.ts --backend gpu --run final-mini-w1 --job mini --batch 8192 --linger 30 --host-workers 1
step mini-w0             N tools/gpu-phase5/replay.ts --backend gpu --run final-mini-w0 --job mini --batch 8192 --linger 30 --host-workers 0
step mini-interrupted    bash -c "GPU_POLICY_PURPOSE=parity-test $NODE --no-maglev --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/replay.ts --backend gpu --run final-mini-resume --job mini --batch 8192 --linger 30 --host-workers $HW --stop-after 6000; [ \$? -eq 75 ]"
step mini-resumed        N tools/gpu-phase5/replay.ts --backend gpu --run final-mini-resume --job mini --batch 8192 --linger 30 --host-workers $HW --resume
step cmp-mini-cpu        N tools/gpu-phase5/compare.ts arms final-mini/cpu final-mini-w$HW/gpu --out $O/compare-final-mini-cpu-vs-gpu.json
step cmp-mini-resume     N tools/gpu-phase5/compare.ts arms final-mini-w$HW/gpu final-mini-resume/gpu --out $O/compare-final-mini-gpu-vs-resumed.json
step cmp-mini-w1         N tools/gpu-phase5/compare.ts arms final-mini-w1/gpu final-mini-w$HW/gpu --out $O/compare-final-mini-w1-vs-w8.json
step cmp-mini-w0         N tools/gpu-phase5/compare.ts arms final-mini-w0/gpu final-mini-w$HW/gpu --out $O/compare-final-mini-w0-vs-w8.json
step sanitizer           U gpup5-final-sanitizer sanitizer-final "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final --host-workers 4
step negative            N tools/gpu-phase5/negative.ts --out $R/policy/negative-final.json --host-workers 3
step tamper              N tools/gpu-phase5/tamper.ts --out $R/policy/tamper-final.json
step isolation           /bin/bash research/gpu-phase5/chains/isolation.sh
step sustained           SUST
step fresh-loop          U gpup5-final-fresh-loop fresh-loop "$NODE" --no-maglev --expose-gc --max-old-space-size=14000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/fresh-loop.ts --out $R/rootcause/fresh-loop-final --cycles 170 --max-minutes 150
step base-p3-a3-r2       BENCH p3-a3-r2 K=1 MODE=ftw JOB=a3:C19:broad1 HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
step base-p3-s-r1        BENCH p3-s-r1 K=1 MODE=ftw JOB=mini HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
step base-p3-a2-r1       BENCH p3-a2-r1 K=1 MODE=ftw JOB=a2:C19:base HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
step regression          N tools/gpu-phase5/regression.ts
step tests               /bin/bash research/gpu-phase5/chains/tests.sh
echo "$(date -u +%FT%TZ) chain final complete"
