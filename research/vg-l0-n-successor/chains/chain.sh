#!/bin/bash
# P5-NS's official stages in the frozen order (PROTOCOL.md §7.3, §14). Fail-fast: every step's status is tested; each
# sealed block is committed (only the study's result paths and FROZEN_SELECTION.json) before the next stage and, for a
# selection, before its next door opens. Each official stage is its own transient unit in vgl0ns.slice (launch.sh
# --wait). IDEMPOTENT: a stage whose sealed record exists is skipped; a stage whose job exists without a record is resumed
# (--resume: the official gate runs again and the job replays from its archive). Usage (run as its own unit):
#   /bin/bash research/vg-l0-n-successor/chains/chain.sh [C19|C21|C23|C24 …]   (default: all cutoffs in order)
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-n-successor src/vg-l0-n-successor/main.ts"
L=$R/tools/vg-l0-n-successor/launch.sh
S=research/vg-l0-n-successor
RS=$R/$S/results
LOG=$RS/logs
P="/usr/bin/env GPU_POLICY_PURPOSE=official-optimization"
cd $R || exit 1
mkdir -p "$LOG"
CUTS=("$@")
[ ${#CUTS[@]} -eq 0 ] && CUTS=(C19 C21 C23 C24)

step() { echo "=== $(date -u +%FT%TZ) begin $1: ${*:2}"; "${@:2}"; local s=$?; echo "=== $(date -u +%FT%TZ) end [$s] $1"; return $s; }
must() { step "$@" || { echo "FAILED: $1"; exit 1; }; }
# an official stage as its own unit; --resume when its job already exists (an interrupted run)
unit() {
  local n=$1 job=$2; shift 2
  local res=()
  [ -f "$RS/jobs/$job/job.json" ] && res=(--resume)
  must "$n" $L "vgl0ns-$n" "$LOG/$n.log" --wait -- $P $OFF "$@" "${res[@]}"
}
commit() {
  local paths=("$S/results")
  [ -f "$S/FROZEN_SELECTION.json" ] && paths+=("$S/FROZEN_SELECTION.json")
  git add -- "${paths[@]}" || { echo "FAILED: git add"; exit 1; }
  if git diff --cached --quiet -- "${paths[@]}"; then echo "=== nothing to commit for: $1"; return 0; fi
  git commit -q -m "vg-l0-n-successor: $1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLSwmFR8FPtAgn27Nb" -- "${paths[@]}" || { echo "FAILED: git commit ($1)"; exit 1; }
  echo "=== $(date -u +%FT%TZ) committed $(git rev-parse --short HEAD): $1"
}
sealed() { [ -f "$R/$1" ] && [ ! -w "$R/$1" ]; }
fired() { python3 -I -c "import json,sys; print(json.load(open(sys.argv[1]))['fired'])" "$1"; }

# the replicate rounds of a track: each `round` seals its decision and, if it fires, runs and seals its lanes
rounds() {
  local cut=$1 tr=$2 pre=$3
  for k in 1 2 3 4; do
    local dec=$S/results/rounds/$cut/$tr-$k.json lanes=$S/results/search/$cut/$pre$k.json
    if ! sealed "$dec" || { [ "$(fired $R/$dec)" = True ] && ! sealed "$lanes"; }; then
      unit $cut-$pre$k $cut-$pre$k round --cutoff $cut --track $tr --k $k
      commit "$cut replicate round $tr-$k (decision sealed; lanes official GPU if it fired)"
    fi
    [ "$(fired $R/$dec)" = True ] || break
  done
}

for CUT in "${CUTS[@]}"; do
  echo "=== $(date -u +%FT%TZ) CUTOFF $CUT"
  sealed $S/results/search/$CUT/broad1.json || { unit $CUT-broad1 $CUT-broad1 search --cutoff $CUT --part broad1; commit "$CUT Track F broad1: 128 lanes (official GPU, sealed)"; }
  sealed $S/results/search/$CUT/broad2.json || { unit $CUT-broad2 $CUT-broad2 search --cutoff $CUT --part broad2; commit "$CUT Track F broad2: 128 lanes (official GPU, sealed)"; }
  rounds $CUT F rx
  sealed $S/results/qualification/$CUT/broad.json || { unit $CUT-qualify-broad $CUT-qualify-broad qualify --cutoff $CUT --stage broad; commit "$CUT broad qualification (official GPU, sealed)"; }
  sealed $S/results/refine-plan/$CUT.json || { must $CUT-refine-plan $P $OFF refine-plan --cutoff $CUT; commit "$CUT refinement plan (sealed; no evaluation)"; }
  sealed $S/results/search/$CUT/refine.json || { unit $CUT-refine $CUT-refine search --cutoff $CUT --part refine; commit "$CUT Track F refinement lanes (official GPU, sealed)"; }
  sealed $S/results/qualification/$CUT/refine.json || { unit $CUT-qualify-refine $CUT-qualify-refine qualify --cutoff $CUT --stage refine; commit "$CUT refinement qualification (official GPU, sealed)"; }
  if [ "$CUT" = C24 ]; then
    sealed $S/results/search/C24/informed1.json || { unit C24-informed1 C24-informed1 search --cutoff C24 --part informed1; commit "C24 Track N informed1 (official GPU, sealed; incumbent-informed)"; }
    sealed $S/results/search/C24/informed2.json || { unit C24-informed2 C24-informed2 search --cutoff C24 --part informed2; commit "C24 Track N informed2 (official GPU, sealed; incumbent-informed)"; }
    rounds C24 N nrx
    sealed $S/results/qualification/C24/informed.json || { unit C24-qualify-informed C24-qualify-informed qualify --cutoff C24 --stage informed; commit "C24 Track N qualification (official GPU, sealed)"; }
  fi
  sealed $S/results/selection/$CUT.json || { must $CUT-select $P $OFF select --cutoff $CUT; commit "$CUT selection (sealed) — committed before the next door opens"; }
  if [ "$CUT" != C24 ]; then
    sealed $S/results/slices/$CUT.json || { unit $CUT-slice $CUT-slice slice --cutoff $CUT; commit "$CUT fold slice (official GPU, sealed; retrospective, previously examined history)"; }
    if [ "$CUT" = C23 ]; then
      sealed $S/results/sequential.json || { must sequential $P $OFF sequential; commit "sequential paths and frozen verdicts (sealed) — committed before D24 training opens"; }
    fi
  else
    sealed $S/FROZEN_SELECTION.json || { must freeze-selection $P $OFF freeze-selection; commit "FROZEN_SELECTION.json (sealed): finalists, successor pre-determination, validation plan"; }
    sealed $S/results/doors/FULL-authorization.json || { must authorize-full $P $OFF authorize-full; commit "FULL door authorization (sealed) — after the committed frozen selection"; }
    sealed $S/results/validation/validation.json || { unit C24-validation C24-validation validate; commit "C24 validation 2025-2026 on FULL, once (official GPU, sealed; previously examined history)"; }
    sealed $S/results/outcome.json || { must outcome $P $OFF outcome; commit "outcome (sealed): the precommitted successor determination"; }
  fi
  echo "=== $(date -u +%FT%TZ) CUTOFF $CUT COMPLETE"
done
echo "=== $(date -u +%FT%TZ) CHAIN COMPLETE"
