#!/bin/bash
# gpu-phase2: after the 24 h stress (one GPU job at a time): 1 npm test (contains Phase 1's live GPU test, so it waits
# for the stress), 2 the Assignment 3 finalists parity (G4), 3 run-log copies, 4 an acceptance dry run. Fail-fast for
# the GPU steps; the acceptance itself is written afterwards by hand (tools/gpu-phase2/accept.ts) once the records are
# reviewed.
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
L=/home/chad/projects/margin-trading/research/gpu-phase2/results/logs
T=research/gpu-phase2/results/tests
U() { local unit=$1 log=$2; shift 2; tools/gpu-phase2/launch.sh "$unit" "$log" --wait -- "$@"; }
echo "$(date -u +%FT%TZ) waiting for gpup2-stress"
while systemctl --user is-active --quiet gpup2-stress; do sleep 60; done
python3 -c "import json,sys;d=json.load(open('research/gpu-phase2/results/stress/summary.json'));print('stress pass',d['pass'],'finished',d['finished'],'hours',d['elapsedHours']);sys.exit(0 if d['pass'] and d['finished'] else 1)" || { echo "$(date -u +%FT%TZ) FAILED [stress]"; exit 1; }
echo "$(date -u +%FT%TZ) start [npm-test]"
U gpup2-npm-test "$L/npm-test.txt" /bin/bash -c "npm test > $PWD/$T/npm-test.txt 2>&1; echo exit=\$? >> $PWD/$T/npm-test.txt"
echo "$(date -u +%FT%TZ) end [npm-test] $(tail -1 $T/npm-test.txt)"
echo "$(date -u +%FT%TZ) start [finalists]"
U gpup2-finalists "$L/parity-finalists.txt" "$NODE" --expose-gc --max-old-space-size=14000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/parity-finalists.ts --out research/gpu-phase2/results/parity/final-finalists.json; rc=$?
[ $rc -eq 0 ] || { echo "$(date -u +%FT%TZ) FAILED [finalists] rc=$rc"; exit 1; }
echo "$(date -u +%FT%TZ) end [finalists]"
mkdir -p research/gpu-phase2/results/runlogs/final
for f in final-gates-chain parity-final-chain a3-replay-C19-broad1 a3-replay-C19-broad1-run1 a3-qualify-replay-C19 bench sanitizer-final negative-final mini-opt-g7f stress strategy-lab-regression parity-finalists npm-test; do
  [ -f "$L/$f.txt" ] && cp "$L/$f.txt" "research/gpu-phase2/results/runlogs/final/$f.txt"
done
[ -d "$L/parity-final" ] && mkdir -p research/gpu-phase2/results/runlogs/final/parity-final && cp "$L"/parity-final/*.txt research/gpu-phase2/results/runlogs/final/parity-final/
"$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/accept.ts --dry-run
echo "$(date -u +%FT%TZ) post-stress complete"
