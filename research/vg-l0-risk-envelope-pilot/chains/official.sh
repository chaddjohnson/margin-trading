#!/bin/bash
# The official stages of the risk-envelope pilot in the frozen order (PROTOCOL.md §12; EXECUTION_PLAN.md §2). Fail-fast:
# every step's status is tested; each sealed block is committed before the next door opens. Each official stage is its
# own transient unit in vgl0rep.slice (launch.sh --wait). Resume after a failure: START=<step> (sealed stages refuse to
# rerun; an interrupted job resumes with --resume — add RESUME=1 for the failed step only).
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-pilot src/vg-l0-risk-envelope-pilot/main.ts"
L=$R/tools/vg-l0-risk-envelope-pilot/launch.sh
LOG=$R/research/vg-l0-risk-envelope-pilot/results/logs
P="/usr/bin/env GPU_POLICY_PURPOSE=official-optimization"
cd $R || exit 1
START=${START:-1}
RES=${RESUME:+--resume}
step() { echo "=== $(date -u +%FT%TZ) begin $1: ${*:2}"; "${@:2}"; local s=$?; echo "=== $(date -u +%FT%TZ) end [$s] $1"; return $s; }
must() { step "$@" || { echo "FAILED: $1"; exit 1; }; }
unit() { local n=$1; shift; must "$n" $L "vgl0rep-$n" "$LOG/$n.log" --wait -- $P $OFF "$@"; }
commit() {
  git add research/vg-l0-risk-envelope-pilot/results || { echo "FAILED: git add"; exit 1; }
  [ -f research/vg-l0-risk-envelope-pilot/FROZEN_SELECTION.json ] && { git add research/vg-l0-risk-envelope-pilot/FROZEN_SELECTION.json || { echo "FAILED: git add"; exit 1; }; }
  git commit -q -m "vg-l0-risk-envelope-pilot: $1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkMZPFD3PtHKZ3wou6m" || { echo "FAILED: git commit ($1)"; exit 1; }
  echo "=== $(date -u +%FT%TZ) committed $(git rev-parse --short HEAD): $1"
}
[ "$START" -le 1 ] && unit C21-search-CTRL search --cutoff C21 --arm CTRL $RES
[ "$START" -le 2 ] && unit C24-search-CTRL search --cutoff C24 --arm CTRL $RES
[ "$START" -le 3 ] && { must e2 $P $OFF e2; commit "official CTRL phases C21, C24 (sealed) and E2: CTRL = Assignment 3"; }
[ "$START" -le 4 ] && unit C21-search-EXP search --cutoff C21 --arm EXP $RES
[ "$START" -le 5 ] && { unit C24-search-EXP search --cutoff C24 --arm EXP $RES; commit "official EXP phases C21, C24 (sealed)"; }
[ "$START" -le 6 ] && unit C21-qualify qualify --cutoff C21 $RES
[ "$START" -le 7 ] && unit C24-qualify qualify --cutoff C24 $RES
[ "$START" -le 8 ] && { must e2q-C21 $P $OFF e2-qualification --cutoff C21; must e2q-C24 $P $OFF e2-qualification --cutoff C24; commit "official qualification C21, C24 (sealed) and E2 qualification: CTRL evidence = Assignment 3"; }
[ "$START" -le 9 ] && { must select-C21 $P $OFF select --cutoff C21; commit "C21 selection (sealed) — committed before D23 opens"; }
[ "$START" -le 10 ] && { unit C21-interval interval --cutoff C21 $RES; commit "C21 next interval 2022-2023 on D23 (sealed; retrospective)"; }
[ "$START" -le 11 ] && { must select-C24 $P $OFF select --cutoff C24; commit "C24 selection (sealed)"; }
[ "$START" -le 12 ] && { must freeze-selection $P $OFF freeze-selection; commit "FROZEN_SELECTION.json (sealed): both cutoffs' selections and the validation plan"; }
[ "$START" -le 13 ] && { must authorize-full $P $OFF authorize-full; commit "FULL door authorization (sealed) — after the committed frozen selection"; }
[ "$START" -le 14 ] && { unit C24-validate validate $RES; commit "C24 validation 2025-2026 on FULL, once (sealed; retrospective, previously inspected history)"; }
echo "=== $(date -u +%FT%TZ) OFFICIAL CHAIN COMPLETE"
