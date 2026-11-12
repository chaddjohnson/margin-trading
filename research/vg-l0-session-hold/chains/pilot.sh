#!/bin/bash
# Engineering pilot (PROTOCOL.md §13): every stage path on the pseudo-fold P18 (search on D19, "slice" 2019 inside D19)
# with pilot budgets, `pilot-<name>-` job names and outputs in the git-ignored cache; then the interruption tests on the
# independent P18 search (graceful SIGTERM, worker SIGKILL, unit SIGKILL), each resumed, and the identical-lane check.
# Fail-fast: every step's exit status is tested.
R=/home/chad/projects/margin-trading
cd $R || exit 1
step() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit: $*"
  timeout 14400 npm run -s vg-l0sh -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st"
  if [ $st -ne 0 ]; then echo "PILOT FAILED at $unit"; exit 1; fi
}
expect_stop() { # a run that must stop early (exit 75: stopped, or 1: a failed worker) and then resume
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit (interrupted): $*"
  timeout 14400 npm run -s vg-l0sh -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st (expected non-zero)"
}
FROM=${1:-s1} # resume point: s1 … s9 (an earlier step's sealed pilot record makes it refuse to rerun)
run_from() { [[ "$1" > "$FROM" || "$1" == "$FROM" ]]; }
run_from s1 && step vgl0sh-pilot-s1 search --cutoff P18 --arm indep --pilot straight
run_from s2 && step vgl0sh-pilot-s2 search --cutoff P18 --arm informed --pilot straight
run_from s3 && step vgl0sh-pilot-s3 qualify --cutoff P18 --pilot straight
run_from s4 && step vgl0sh-pilot-s4 crosstest --cutoff P18 --pilot straight
step vgl0sh-pilot-s5 fold-eval --cutoff P18 --pilot straight
step vgl0sh-pilot-s6 sequential --pilot straight
step vgl0sh-pilot-s7 diagnostics --pilot straight
step vgl0sh-pilot-s8 freeze-selection --pilot straight
step vgl0sh-pilot-s9 validate --pilot straight
echo "STRAIGHT PILOT DONE"
# interruption tests on the independent P18 search
step vgl0sh-pilot-ref search --cutoff P18 --arm indep --pilot ref
expect_stop vgl0sh-pilot-sigterm-1 search --cutoff P18 --arm indep --pilot sigterm --stop-after 6000
step vgl0sh-pilot-sigterm-2 search --cutoff P18 --arm indep --pilot sigterm
expect_stop vgl0sh-pilot-wkill-1 search --cutoff P18 --arm indep --pilot wkill --kill-worker-after 400
step vgl0sh-pilot-wkill-2 search --cutoff P18 --arm indep --pilot wkill
( sleep 60; systemctl --user kill --signal=SIGKILL vgl0sh-pilot-unitkill-1.service ) &
expect_stop vgl0sh-pilot-unitkill-1 search --cutoff P18 --arm indep --pilot unitkill
step vgl0sh-pilot-unitkill-2 search --cutoff P18 --arm indep --pilot unitkill
timeout 600 npm run -s vg-l0sh -- pilot-compare ref straight sigterm wkill unitkill || { echo "PILOT FAILED at pilot-compare"; exit 1; }
echo "PILOT DONE"
