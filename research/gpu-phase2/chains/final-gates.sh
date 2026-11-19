#!/bin/bash
# gpu-phase2 FINAL gates on the frozen final binary (results/final-binary.json), one GPU job at a time (PROTOCOL.md §8),
# fail-fast. START=<n> skips steps before n on a relaunch (completed steps' records stay; never rerun a passed gate).
#   1 replay-compare  A3 C19 broad1 GPU replay (run 2) vs the sealed record
#   2 qualify-replay  A3 C19 broad qualification replayed on the GPU vs its sealed record (benchmark + identity)
#   3 bench           B1 benchmarks (exclusive)
#   4 sanitizer       T0 on the final binary (W-CRASH, every Growth structural value, references, 64 random)
#   5 negative        P3 negative tests on the final binary
#   6 mini-opt        G7 (CPU arm, GPU arm, interrupted + resumed GPU arm, comparisons), RUN=g7f
#   7 parity          G1-G6 FINAL campaign (chains/parity.sh) + SUMMARY.json
#   8 stress          G8 ≥ 24 h
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
L=/home/chad/projects/margin-trading/research/gpu-phase2/results/logs
START=${START:-1}
N() { "$NODE" --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning "$@"; }
U() { # U <unit> <log> <command...>: a contained sub-unit, waited for
  local unit=$1 log=$2; shift 2
  tools/gpu-phase2/launch.sh "$unit" "$log" --wait -- "$@"
}
step() { echo "$(date -u +%FT%TZ) start [$1]"; }
ok() { echo "$(date -u +%FT%TZ) end [$1]"; }
die() { echo "$(date -u +%FT%TZ) FAILED [$1] rc=$2"; exit 1; }
EXPECT=$(python3 -c "import json;print(json.load(open('research/gpu-phase2/results/final-binary.json'))['binary']['sha256'])")
[ "$(sha256sum research/gpu-phase2/build/gb2 | cut -d' ' -f1)" = "$EXPECT" ] || die "binary identity" 9

if [ "$START" -le 1 ]; then
  step replay-compare
  while systemctl --user is-active --quiet gpup2-a3-c19b1; do sleep 30; done
  # run 2 (run 1 is kept as a timing sample: its record lost the sign of non-finite values)
  rm -rf research/gpu-phase2/cache/mini-opt/a3-C19-broad1
  U gpup2-a3-c19b1-r2 "$L/a3-replay-C19-broad1.txt" "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/mini-opt.ts --backend gpu --run a3-C19-broad1 --a3-job C19:broad1; rc=$?
  [ $rc -eq 0 ] || die replay $rc
  [ -f research/gpu-phase2/results/optimizer/a3-C19-broad1/gpu/result.json ] || die replay-missing 8
  N tools/gpu-phase2/a3-replay-compare.ts a3-C19-broad1/gpu C19 broad1 --out research/gpu-phase2/results/optimizer/compare-a3-C19-broad1.json; rc=$?
  [ $rc -eq 0 ] || die replay-compare $rc
  ok replay-compare
fi
if [ "$START" -le 2 ]; then
  step qualify-replay
  rm -rf research/gpu-phase2/cache/a3-qualify
  U gpup2-a3-qualify "$L/a3-qualify-replay-C19.txt" "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/a3-qualify-replay.ts --cutoff C19 --out research/gpu-phase2/results/optimizer/compare-a3-C19-broad-qualification.json; rc=$?
  [ $rc -eq 0 ] || die qualify-replay $rc
  ok qualify-replay
fi
if [ "$START" -le 3 ]; then
  step bench
  U gpup2-bench "$L/bench.txt" "$NODE" --expose-gc --max-old-space-size=16000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/bench.ts --out research/gpu-phase2/results/bench/bench.json; rc=$?
  [ $rc -eq 0 ] || die bench $rc
  ok bench
fi
if [ "$START" -le 4 ]; then
  step sanitizer
  U gpup2-sanitizer "$L/sanitizer-final.txt" "$NODE" --max-old-space-size=8000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final; rc=$?
  [ $rc -eq 0 ] || die sanitizer $rc
  python3 -c "
import json,sys;d=json.load(open('research/gpu-phase2/results/sanitizer-final/sanitizer.json'))
bad=[r for r in d['rows'] if r['errors']!=0 or r['identical']!=r['subjects'] or not r['smoke']]
print('sanitizer rows', [(r['tool'],r['errors'],r['identical'],r['subjects']) for r in d['rows']]); sys.exit(1 if bad else 0)" || die sanitizer-result 2
  ok sanitizer
fi
if [ "$START" -le 5 ]; then
  step negative
  U gpup2-negative "$L/negative-final.txt" "$NODE" --max-old-space-size=8000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/negative.ts --out research/gpu-phase2/results/policy/negative-final.json; rc=$?
  [ $rc -eq 0 ] || die negative $rc
  ok negative
fi
if [ "$START" -le 6 ]; then
  step mini-opt
  rm -rf research/gpu-phase2/cache/mini-opt/g7f research/gpu-phase2/cache/mini-opt/g7f-resume
  U gpup2-mini-opt-f "$L/mini-opt-g7f.txt" /usr/bin/env RUN=g7f /bin/bash research/gpu-phase2/chains/mini-opt.sh; rc=$?
  [ $rc -eq 0 ] || die mini-opt $rc
  grep -q "chain complete" "$L/mini-opt-g7f.txt" || die mini-opt-incomplete 3
  ok mini-opt
fi
if [ "$START" -le 7 ]; then
  step parity
  PARITY_OUT=research/gpu-phase2/results/parity/final PARITY_LOG=$L/parity-final /bin/bash research/gpu-phase2/chains/parity.sh >> "$L/parity-final-chain.txt" 2>&1; rc=$?
  [ $rc -eq 0 ] || die parity $rc
  N tools/gpu-phase2/parity-summary.ts research/gpu-phase2/results/parity/final; rc=$?
  [ $rc -eq 0 ] || die parity-summary $rc
  ok parity
fi
if [ "$START" -le 8 ]; then
  step stress
  U gpup2-stress "$L/stress.txt" "$NODE" --expose-gc --max-old-space-size=16000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/stress.ts --hours 24.05 --out-dir research/gpu-phase2/results/stress; rc=$?
  [ $rc -eq 0 ] || die stress $rc
  ok stress
fi
echo "$(date -u +%FT%TZ) chain complete"
