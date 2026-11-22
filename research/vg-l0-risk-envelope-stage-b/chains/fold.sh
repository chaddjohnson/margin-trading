#!/bin/bash
# One fold of Stage B's official stages in the frozen order (PROTOCOL.md §9, §11; EXECUTION_PLAN.md). Fail-fast: every
# step's status is tested; each sealed block is committed (only the study's results paths) before the next stage and,
# for the selection, before the interval door opens. Each official stage is its own transient unit in vgl0reb.slice
# (launch.sh --wait). Usage: CUT=C19|C21|C24 [START=<step>] [RESUME=1] /bin/bash chains/fold.sh
# Resume after a failure: START=<step> (sealed stages refuse to rerun; an interrupted job resumes with RESUME=1, which adds
# --resume to the first step run).
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-stage-b src/vg-l0-risk-envelope-stage-b/main.ts"
L=$R/tools/vg-l0-risk-envelope-stage-b/launch.sh
LOG=$R/research/vg-l0-risk-envelope-stage-b/results/logs
P="/usr/bin/env GPU_POLICY_PURPOSE=official-optimization"
S=research/vg-l0-risk-envelope-stage-b
cd $R || exit 1
CUT=${CUT:?CUT=C19|C21|C24}
START=${START:-1}
RES=${RESUME:+--resume}
step() { echo "=== $(date -u +%FT%TZ) begin $1: ${*:2}"; "${@:2}"; local s=$?; echo "=== $(date -u +%FT%TZ) end [$s] $1"; return $s; }
must() { step "$@" || { echo "FAILED: $1"; exit 1; }; }
unit() { local n=$1; shift; must "$n" $L "vgl0reb-$n" "$LOG/$n.log" --wait -- $P $OFF "$@"; RES=; }
commit() {
  local paths=("$S/results")
  [ -f "$S/FROZEN_SELECTION.json" ] && paths+=("$S/FROZEN_SELECTION.json")
  git add -- "${paths[@]}" || { echo "FAILED: git add"; exit 1; }
  git commit -q -m "vg-l0-risk-envelope-stage-b: $1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkPttonF9ibjkvbBh7q" -- "${paths[@]}" || { echo "FAILED: git commit ($1)"; exit 1; }
  echo "=== $(date -u +%FT%TZ) committed $(git rev-parse --short HEAD): $1"
}
[ "$START" -le 1 ] && unit $CUT-repro repro --cutoff $CUT $RES
[ "$START" -le 2 ] && { must $CUT-e2 $P $OFF e2 --cutoff $CUT; commit "$CUT E2 reproduction lanes (official GPU, sealed): CTRL R1/R2 = Assignment 3"; }
[ "$START" -le 3 ] && { unit $CUT-search search --cutoff $CUT $RES; commit "$CUT search, both arms, 64 lanes (official GPU, sealed)"; }
[ "$START" -le 4 ] && { unit $CUT-qualify qualify --cutoff $CUT $RES; commit "$CUT union qualification (official GPU, sealed)"; }
[ "$START" -le 5 ] && { must $CUT-select $P $OFF select --cutoff $CUT; commit "$CUT selection (sealed): lane values, paired statistic, pooled selectors — committed before the next door opens"; }
if [ "$CUT" != C24 ]; then
  [ "$START" -le 6 ] && { unit $CUT-interval interval --cutoff $CUT $RES; commit "$CUT next interval (official GPU, sealed; retrospective, previously inspected history)"; }
else
  [ "$START" -le 6 ] && { must freeze-selection $P $OFF freeze-selection; commit "FROZEN_SELECTION.json (sealed): every fold's selection and the validation plan"; }
  [ "$START" -le 7 ] && { must authorize-full $P $OFF authorize-full; commit "FULL door authorization (sealed) — after the committed frozen selection"; }
  [ "$START" -le 8 ] && { unit C24-validation validate $RES; commit "C24 validation 2025-2026 on FULL, once (official GPU, sealed; retrospective, previously inspected history)"; }
fi
echo "=== $(date -u +%FT%TZ) FOLD $CUT COMPLETE"
