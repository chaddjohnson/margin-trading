#!/bin/bash
# One fold of Priority 4's official stages in the frozen order (PROTOCOL.md §14). Fail-fast: every step's status is
# tested; each sealed block is committed (only the study's results paths) before the next stage and, for the selection,
# before the interval door opens. Each official stage is its own transient unit in vgl0ss.slice (launch.sh --wait).
# Usage: CUT=C19|C21|C24 [START=<step>] [RESUME=1] /bin/bash research/vg-l0-staged-stop/chains/fold.sh
# Resume after a failure: START=<step> (sealed stages refuse to rerun; an interrupted job resumes with RESUME=1, which
# adds --resume to the first step run). CUT=ABLATE runs Stage A (the ablations) alone.
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-staged-stop src/vg-l0-staged-stop/main.ts"
L=$R/tools/vg-l0-staged-stop/launch.sh
LOG=$R/research/vg-l0-staged-stop/results/logs
P="/usr/bin/env GPU_POLICY_PURPOSE=official-optimization"
S=research/vg-l0-staged-stop
cd $R || exit 1
CUT=${CUT:?CUT=ABLATE|C19|C21|C24}
START=${START:-1}
RES=${RESUME:+--resume}
step() { echo "=== $(date -u +%FT%TZ) begin $1: ${*:2}"; "${@:2}"; local s=$?; echo "=== $(date -u +%FT%TZ) end [$s] $1"; return $s; }
must() { step "$@" || { echo "FAILED: $1"; exit 1; }; }
unit() { local n=$1; shift; must "$n" $L "vgl0ss-$n" "$LOG/$n.log" --wait -- $P $OFF "$@"; RES=; }
commit() {
  local paths=("$S/results")
  [ -f "$S/FROZEN_SELECTION.json" ] && paths+=("$S/FROZEN_SELECTION.json")
  git add -- "${paths[@]}" || { echo "FAILED: git add"; exit 1; }
  git commit -q -m "vg-l0-staged-stop: $1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkKyqNH8NPWFEoNoCbF" -- "${paths[@]}" || { echo "FAILED: git commit ($1)"; exit 1; }
  echo "=== $(date -u +%FT%TZ) committed $(git rev-parse --short HEAD): $1"
}
if [ "$CUT" = ABLATE ]; then
  [ "$START" -le 1 ] && { unit ablation ablate $RES; commit "Stage A fixed-parameter ablations on D24 (official GPU, sealed; report-only)"; }
  echo "=== $(date -u +%FT%TZ) ABLATIONS COMPLETE"; exit 0
fi
[ "$START" -le 1 ] && { unit $CUT-search search --cutoff $CUT $RES; commit "$CUT search, both arms, 128 lanes (official GPU, sealed)"; }
[ "$START" -le 2 ] && { must $CUT-gate-r $P $OFF gate-r --cutoff $CUT; commit "$CUT gate R (sealed): CTRL R3-R18 = Stage B's sealed lanes"; }
[ "$START" -le 3 ] && { unit $CUT-extend extend --cutoff $CUT $RES; commit "$CUT extension block decision / lanes (sealed)"; }
if [ "$CUT" = C24 ]; then
  [ "$START" -le 4 ] && { unit C24-informed informed $RES; commit "C24 informed lanes I1-I4 (official GPU, sealed; diagnostics)"; }
fi
[ "$START" -le 5 ] && { unit $CUT-qualify qualify --cutoff $CUT $RES; commit "$CUT union qualification (official GPU, sealed)"; }
[ "$START" -le 6 ] && { must $CUT-select $P $OFF select --cutoff $CUT; commit "$CUT selection (sealed): lane values, paired statistics, pooled P0 - committed before the next door opens"; }
if [ "$CUT" != C24 ]; then
  [ "$START" -le 7 ] && { unit $CUT-interval interval --cutoff $CUT $RES; commit "$CUT next interval (official GPU, sealed; retrospective, previously inspected history)"; }
else
  [ "$START" -le 7 ] && { unit C24-decomposition decompose $RES; commit "C24 decomposition rows on D24 (official GPU, sealed; report-only)"; }
  [ "$START" -le 8 ] && { must freeze-selection $P $OFF freeze-selection; commit "FROZEN_SELECTION.json (sealed): every fold's selection and the validation plan"; }
  [ "$START" -le 9 ] && { must authorize-full $P $OFF authorize-full; commit "FULL door authorization (sealed) - after the committed frozen selection"; }
  [ "$START" -le 10 ] && { unit C24-validation validate $RES; commit "C24 validation 2025-2026 on FULL, once (official GPU, sealed; retrospective, previously inspected history)"; }
  [ "$START" -le 11 ] && { must outcome $P $OFF outcome; commit "outcome (sealed): the precommitted label"; }
fi
echo "=== $(date -u +%FT%TZ) FOLD $CUT COMPLETE"
