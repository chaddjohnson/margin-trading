#!/bin/bash
# Engineering pilot (PROTOCOL.md §13): every stage path on the pseudo-fold P18 (searches on D19, "slice" 2019 inside D19)
# with pilot budgets (1 replicate per track and step), `pilot-<name>-` job names and outputs in the git-ignored cache;
# then the interruption tests on the B1 P18 search (graceful SIGTERM, worker SIGKILL, unit SIGKILL), each resumed, and the
# identical-lane check. Fail-fast: every step's exit status is captured before anything else and tested.
R=/home/chad/projects/margin-trading
cd $R || exit 1
step() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit: $*"
  timeout 14400 npm run -s vg-l0se -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st"
  if [ $st -ne 0 ]; then echo "PILOT FAILED at $unit"; exit 1; fi
}
expect_stop() { # a run that must stop early (exit 75: stopped, or 1: a failed worker) and then resume
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit (interrupted): $*"
  timeout 14400 npm run -s vg-l0se -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st (expected non-zero)"
}
FROM=${1:-s01} # resume point: s01 … s21, then i (the interruption tests)
run_from() { [[ "$1" > "$FROM" || "$1" == "$FROM" ]]; }
PILOT=${PILOT:-straight}
P="--pilot $PILOT"
run_from s01 && step vgl0se-pilot-$PILOT-s01 phase2 $P
run_from s02 && step vgl0se-pilot-$PILOT-s02 search --cutoff P18 --track B1 $P
run_from s03 && step vgl0se-pilot-$PILOT-s03 qualify --cutoff P18 --track B1 $P
run_from s04 && step vgl0se-pilot-$PILOT-s04 search --cutoff P18 --track B2 --step d1 $P
run_from s05 && step vgl0se-pilot-$PILOT-s05 qualify --cutoff P18 --track B2 --step d1 $P
run_from s06 && step vgl0se-pilot-$PILOT-s06 search --cutoff P18 --track B2 --step g $P
run_from s07 && step vgl0se-pilot-$PILOT-s07 qualify --cutoff P18 --track B2 --step g $P
run_from s08 && step vgl0se-pilot-$PILOT-s08 search --cutoff P18 --track A1 $P
run_from s09 && step vgl0se-pilot-$PILOT-s09 qualify --cutoff P18 --track A1 $P
run_from s10 && step vgl0se-pilot-$PILOT-s10 search --cutoff P18 --track A2 --step d1 $P
run_from s11 && step vgl0se-pilot-$PILOT-s11 qualify --cutoff P18 --track A2 --step d1 $P
run_from s12 && step vgl0se-pilot-$PILOT-s12 search --cutoff P18 --track A2 --step g $P
run_from s13 && step vgl0se-pilot-$PILOT-s13 qualify --cutoff P18 --track A2 --step g $P
run_from s14 && step vgl0se-pilot-$PILOT-s14 qualify-controls --cutoff P18 $P
run_from s15 && step vgl0se-pilot-$PILOT-s15 final-select --cutoff P18 $P
run_from s16 && step vgl0se-pilot-$PILOT-s16 fold-eval --cutoff P18 $P
run_from s17 && step vgl0se-pilot-$PILOT-s17 sequential $P
run_from s18 && step vgl0se-pilot-$PILOT-s18 ablation --cutoff P18 $P
run_from s19 && step vgl0se-pilot-$PILOT-s19 diagnostics $P
run_from s20 && step vgl0se-pilot-$PILOT-s20 freeze-selection $P
run_from s21 && step vgl0se-pilot-$PILOT-s21 validate $P
echo "STRAIGHT PILOT DONE"
[ -n "$SKIP_INTERRUPT" ] && { echo "PILOT DONE (interruption tests skipped)"; exit 0; }
# interruption tests on the B1 P18 search
step vgl0se-pilot-ref search --cutoff P18 --track B1 --pilot ref
expect_stop vgl0se-pilot-sigterm-1 search --cutoff P18 --track B1 --pilot sigterm --stop-after 1500
step vgl0se-pilot-sigterm-2 search --cutoff P18 --track B1 --pilot sigterm
expect_stop vgl0se-pilot-wkill-1 search --cutoff P18 --track B1 --pilot wkill --kill-worker-after 150
step vgl0se-pilot-wkill-2 search --cutoff P18 --track B1 --pilot wkill
( sleep 15; systemctl --user kill --signal=SIGKILL vgl0se-pilot-unitkill-1.service ) &
expect_stop vgl0se-pilot-unitkill-1 search --cutoff P18 --track B1 --pilot unitkill
step vgl0se-pilot-unitkill-2 search --cutoff P18 --track B1 --pilot unitkill
timeout 600 npm run -s vg-l0se -- pilot-compare ref straight sigterm wkill unitkill
st=$?
if [ $st -ne 0 ]; then echo "PILOT FAILED at pilot-compare"; exit 1; fi
echo "PILOT DONE"
