#!/bin/bash
# Engineering gates E4 and E3 of the risk-envelope pilot (non-official; PROTOCOL.md §13). Fail-fast: every step's status
# is tested explicitly. Run as its own unit: tools/vg-l0-risk-envelope-pilot/launch.sh vgl0rep-eng <log> -- /bin/bash <this>
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
ENG="$N $F src/gpu-backend/legacyRunner.ts vg-l0rep-eng tools/vg-l0-risk-envelope-pilot/engineering.ts"
E=research/vg-l0-risk-envelope-pilot/results/engineering
cd $R || exit 1
step() { echo "=== $(date -u +%FT%TZ) begin: $*"; "$@"; local s=$?; echo "=== $(date -u +%FT%TZ) end [$s]: $*"; return $s; }
must() { step "$@" || { echo "FAILED: $*"; exit 1; }; }
expect() { local want=$1; shift; step "$@"; local s=$?; [[ " $want " == *" $s "* ]] || { echo "FAILED (exit $s, expected $want): $*"; exit 1; }; }

START=${START:-1}
# E4: the pilot's tests, with the code digest they ran on
if [ "$START" -le 1 ]; then
  mkdir -p $E/E4
  D=$($N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning -e "import('./src/vg-l0-risk-envelope-pilot/records.ts').then(m=>console.log(m.codeDigest()))")
  { echo "codeDigest $D"; echo "head $(git rev-parse HEAD)"; echo "t $(date -u +%FT%TZ)"; $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-risk-envelope-pilot/tests/*.test.ts 2>&1; } > $E/E4/tests.txt
  grep -q '^ℹ fail 0$' $E/E4/tests.txt || { echo "FAILED: E4 tests"; exit 1; }
  echo "E4 ok"
fi
export GPU_POLICY_PURPOSE=parity-test
[ "$START" -le 2 ] && must $ENG mini --backend gpu --name gpu --a3
[ "$START" -le 3 ] && must $ENG mini --backend cpu --name cpu --a3
[ "$START" -le 4 ] && expect 75 $ENG mini --backend gpu --name gpu-stopped --a3 --stop-after 4000
[ "$START" -le 5 ] && must $ENG mini --backend gpu --name gpu-stopped --a3 --resume
# GNU timeout reports 124 when it had to kill the command (137 only when timeout itself is killed): either proves the
# SIGKILL (the first run of 2026-11-22 expected 137 and stopped there; the kill had happened: 615 rows, no result)
[ "$START" -le 6 ] && expect "124 137" timeout -s KILL 25 $ENG mini --backend gpu --name gpu-killed --a3
[ "$START" -le 7 ] && must $ENG mini --backend gpu --name gpu-killed --a3 --resume
[ "$START" -le 8 ] && must $ENG compare gpu cpu --out $E/E3/compare-gpu-vs-cpu.json
[ "$START" -le 9 ] && must $ENG compare gpu-stopped gpu --out $E/E3/compare-stopped-resumed-vs-gpu.json
[ "$START" -le 10 ] && must $ENG compare gpu-killed gpu --out $E/E3/compare-killed-resumed-vs-gpu.json
[ "$START" -le 11 ] && must $ENG a3check gpu --out $E/E3/a3check-gpu.json
[ "$START" -le 12 ] && must $ENG a3check cpu --out $E/E3/a3check-cpu.json
[ "$START" -le 13 ] && must $ENG edge --door D21 --out $E/E3/edge-D21.json
[ "$START" -le 14 ] && must $ENG edge --door D24 --out $E/E3/edge-D24.json
[ "$START" -le 15 ] && must $ENG identity gpu --out $E/E3/identity.json
[ "$START" -le 16 ] && must $ENG summary --out $E/E3/summary.json
echo "=== $(date -u +%FT%TZ) ENGINEERING CHAIN COMPLETE"
