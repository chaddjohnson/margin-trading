#!/bin/bash
# Engineering pilot (PROTOCOL.md §13): every stage path on the pseudo-fold P18 (searches on D19, "slice" 2019 inside D19)
# with pilot budgets (4 cells and 2 family pairs, 1 replicate), `pilot-<name>-` job names and outputs in the git-ignored
# cache: Track I broad → qualification → refinement plan → refinement → qualification → Track N informed → qualification
# → selection → fold evaluation → sequential → frozen selection → validation stand-in (D19); then the interruption tests
# on the P18 pilot broad search (graceful SIGTERM, worker SIGKILL, unit SIGKILL), each resumed, and the identical-lane
# check. Engineering only: only timings, counts and pass/fail are read. Fail-fast: every step's exit status is captured
# before anything else and tested. Never edit this file while it runs.
R=/home/chad/projects/margin-trading
cd $R || exit 1
step() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit: $*"
  timeout 14400 npm run -s vg-l0fj -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st"
  if [ $st -ne 0 ]; then echo "PILOT FAILED at $unit"; exit 1; fi
}
expect_stop() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit (interrupted): $*"
  timeout 14400 npm run -s vg-l0fj -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st (expected non-zero)"
}
FROM=${1:-s01}
run_from() { [[ "$1" > "$FROM" || "$1" == "$FROM" ]]; }
PILOT=${PILOT:-straight}
P="--pilot $PILOT --workers 12"
run_from s01 && step vgl0fj-pilot-$PILOT-s01 search --cutoff P18 --part pilot $P
run_from s02 && step vgl0fj-pilot-$PILOT-s02 qualify --cutoff P18 --stage broad $P
run_from s03 && step vgl0fj-pilot-$PILOT-s03 refine-plan --cutoff P18 $P
run_from s04 && step vgl0fj-pilot-$PILOT-s04 search --cutoff P18 --part refine $P
run_from s05 && step vgl0fj-pilot-$PILOT-s05 qualify --cutoff P18 --stage refine $P
run_from s06 && step vgl0fj-pilot-$PILOT-s06 search --cutoff P18 --part pilot-informed $P
run_from s07 && step vgl0fj-pilot-$PILOT-s07 qualify --cutoff P18 --stage informed $P
run_from s08 && step vgl0fj-pilot-$PILOT-s08 select --cutoff P18 $P
run_from s09 && step vgl0fj-pilot-$PILOT-s09 fold-eval --cutoff P18 $P
run_from s10 && step vgl0fj-pilot-$PILOT-s10 sequential $P
run_from s11 && step vgl0fj-pilot-$PILOT-s11 freeze-selection $P
run_from s12 && step vgl0fj-pilot-$PILOT-s12 validate $P
echo "STRAIGHT PILOT DONE"
[ -n "$SKIP_INTERRUPT" ] && { echo "PILOT DONE (interruption tests skipped)"; exit 0; }
step vgl0fj-pilot-ref search --cutoff P18 --part pilot --pilot ref --workers 12
expect_stop vgl0fj-pilot-sigterm-1 search --cutoff P18 --part pilot --pilot sigterm --workers 12 --stop-after 1500
step vgl0fj-pilot-sigterm-2 search --cutoff P18 --part pilot --pilot sigterm --workers 12
expect_stop vgl0fj-pilot-wkill-1 search --cutoff P18 --part pilot --pilot wkill --workers 12 --kill-worker-after 150
step vgl0fj-pilot-wkill-2 search --cutoff P18 --part pilot --pilot wkill --workers 12
( sleep 20; systemctl --user kill --signal=SIGKILL vgl0fj-pilot-unitkill-1.service ) &
expect_stop vgl0fj-pilot-unitkill-1 search --cutoff P18 --part pilot --pilot unitkill --workers 12
step vgl0fj-pilot-unitkill-2 search --cutoff P18 --part pilot --pilot unitkill --workers 12
timeout 600 npm run -s vg-l0fj -- pilot-compare ref straight sigterm wkill unitkill
st=$?
if [ $st -ne 0 ]; then echo "PILOT FAILED at pilot-compare"; exit 1; fi
echo "PILOT DONE"
