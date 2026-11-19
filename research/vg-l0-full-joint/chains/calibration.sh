#!/bin/bash
# Study-fidelity cost calibration (PROTOCOL.md §8.3–§8.4; engineering only, cache only): the study's per-lane schedules
# (VGL0FJ_PILOT_BUDGET=study) on the pilot structures (4 cells, 2 family pairs, 1 replicate) of the pseudo-fold P18 (D19):
# broad → qualification → refinement plan → refinement → qualification → informed. Only per-lane requested and fresh
# evaluations, islands, stops, wall time and memory are read — never a net, a drawdown or a ranking. Fail-fast.
R=/home/chad/projects/margin-trading
cd $R || exit 1
step() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit: $*"
  timeout 28800 npm run -s vg-l0fj -- launch --unit "$unit" --env VGL0FJ_PILOT_BUDGET=study --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st"
  if [ $st -ne 0 ]; then echo "CALIBRATION FAILED at $unit"; exit 1; fi
}
P="--pilot calib --workers 12"
step vgl0fj-pilot-calib-s01 search --cutoff P18 --part pilot $P
step vgl0fj-pilot-calib-s02 qualify --cutoff P18 --stage broad $P
step vgl0fj-pilot-calib-s03 refine-plan --cutoff P18 $P
step vgl0fj-pilot-calib-s04 search --cutoff P18 --part refine $P
step vgl0fj-pilot-calib-s05 qualify --cutoff P18 --stage refine $P
step vgl0fj-pilot-calib-s06 search --cutoff P18 --part pilot-informed $P
echo "CALIBRATION DONE"
