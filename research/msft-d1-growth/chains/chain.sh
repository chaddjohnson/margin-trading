#!/bin/bash
# P9-MSFT's official stages in the frozen order (PROTOCOL.md §14). Fail-fast: every step's status is tested; each sealed
# block is committed (only the study's result paths and FROZEN_SELECTION.json) before the next stage and, for a selection,
# before its next door opens. Each official stage is its own transient unit in msft9.slice (launch.sh --wait).
# IDEMPOTENT: a stage whose sealed record exists is skipped; a stage whose job exists without a record is resumed
# (--resume: the official gate runs again and the job replays from its archive). After a cutoff's last record is committed,
# its completed job archives are preserved with zstd (verified, restorable; storage/tools/jobzstd.py) before the next cutoff.
# Usage (run as its own unit):
#   /bin/bash research/msft-d1-growth/chains/chain.sh [C19|C21|C23|C24 …]   (default: all cutoffs in order)
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/msft-d1-growth src/msft-d1-growth/main.ts"
L=$R/tools/msft-d1-growth/launch.sh
S=research/msft-d1-growth
RS=$R/$S/results
LOG=$R/$S/cache/logs/chain
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
  must "$n" $L "msft9-$n" "$LOG/$n.log" --wait -- $P $OFF "$@" "${res[@]}"
}
commit() {
  local paths=("$S/results")
  [ -f "$S/FROZEN_SELECTION.json" ] && paths+=("$S/FROZEN_SELECTION.json")
  [ -f "$S/storage/MSFT_JOB_ACTIONS.jsonl" ] && paths+=("$S/storage/MSFT_JOB_ACTIONS.jsonl")
  git add -- "${paths[@]}" || { echo "FAILED: git add"; exit 1; }
  if git diff --cached --quiet -- "${paths[@]}"; then echo "=== nothing to commit for: $1"; return 0; fi
  git commit -q -m "msft-d1-growth: $1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkQLVgyFrauQL2Z2NTf" -- "${paths[@]}" || { echo "FAILED: git commit ($1)"; exit 1; }
  echo "=== $(date -u +%FT%TZ) committed $(git rev-parse --short HEAD): $1"
}
sealed() { [ -f "$R/$1" ] && [ ! -w "$R/$1" ]; }
fired() { python3 -I -c "import json,sys; print(json.load(open(sys.argv[1]))['fired'])" "$1"; }
nolanes() { python3 -I -c "import json,sys; print(len(json.load(open(sys.argv[1]))['frozen']))" "$1"; }

# the replicate rounds of an arm: each `round` seals its decision and, if it fires, runs and seals its lanes
rounds() {
  local cut=$1 arm=$2
  for k in 1 2 3 4; do
    local dec=$S/results/rounds/$cut/$arm-$k.json lanes=$S/results/search/$cut/$arm-rx$k.json
    if ! sealed "$dec" || { [ "$(fired $R/$dec)" = True ] && ! sealed "$lanes"; }; then
      unit $cut-$arm-rx$k $cut-$arm-rx$k round --cutoff $cut --arm $arm --k $k
      commit "$cut arm $arm replicate round $k (decision sealed; lanes official GPU if it fired)"
    fi
    [ "$(fired $R/$dec)" = True ] || break
  done
}

# one search arm at a cutoff: broad → rounds → qualify broad → refine plan → refine → qualify refine → arm selection
arm() {
  local cut=$1 a=$2
  sealed $S/results/search/$cut/$a-broad.json || { unit $cut-$a-broad $cut-$a-broad search --cutoff $cut --arm $a --part broad; commit "$cut arm $a broad lanes (official GPU, sealed)"; }
  rounds $cut $a
  sealed $S/results/qualification/$cut/$a-broad.json || { unit $cut-$a-qualify-broad $cut-$a-qualify-broad qualify --cutoff $cut --arm $a --stage broad; commit "$cut arm $a broad qualification (official GPU, sealed)"; }
  sealed $S/results/refine-plan/$cut/$a.json || { must $cut-$a-refine-plan $P $OFF refine-plan --cutoff $cut --arm $a; commit "$cut arm $a refinement plan (sealed; no evaluation)"; }
  if [ "$(python3 -I -c "import json,sys; print(len(json.load(open(sys.argv[1]))['cells']))" $R/$S/results/refine-plan/$cut/$a.json)" != 0 ]; then
    sealed $S/results/search/$cut/$a-refine.json || { unit $cut-$a-refine $cut-$a-refine search --cutoff $cut --arm $a --part refine; commit "$cut arm $a refinement lanes (official GPU, sealed)"; }
    sealed $S/results/qualification/$cut/$a-refine.json || { unit $cut-$a-qualify-refine $cut-$a-qualify-refine qualify --cutoff $cut --arm $a --stage refine; commit "$cut arm $a refinement qualification (official GPU, sealed)"; }
  fi
  sealed $S/results/selection/$cut-$a.json || { must $cut-$a-select $P $OFF select-arm --cutoff $cut --arm $a; commit "$cut arm $a selection (sealed)"; }
}

for CUT in "${CUTS[@]}"; do
  echo "=== $(date -u +%FT%TZ) CUTOFF $CUT (free $(df -BG --output=avail $R | tail -1))"
  arm $CUT D
  arm $CUT G
  sealed $S/results/pairs/$CUT.json || { must $CUT-pairs $P $OFF pairs --cutoff $CUT; commit "$CUT arm C pairs of the D and G finalists (sealed; no evaluation)"; }
  sealed $S/results/qualification/$CUT/C-fixed.json || { unit $CUT-C-qualify-fixed $CUT-C-qualify-fixed qualify --cutoff $CUT --arm C --stage fixed; commit "$CUT arm C fixed pairs qualified (official GPU, sealed)"; }
  sealed $S/results/selection/$CUT-C.json || { must $CUT-C-select $P $OFF select-arm --cutoff $CUT --arm C; commit "$CUT arm C selection (sealed)"; }
  arm $CUT J
  sealed $S/results/frozen-d1/$CUT.json || { must $CUT-freeze-d1 $P $OFF freeze-d1 --cutoff $CUT; commit "$CUT arm S frozen D1 finalists (sealed; no evaluation)"; }
  if [ "$(nolanes $R/$S/results/frozen-d1/$CUT.json)" != 0 ]; then
    arm $CUT S
  else
    echo "=== arm S at $CUT: no frozen D1 (arm D has no qualified member) — the S procedure has no primary here"
    sealed $S/results/selection/$CUT-S.json || { must $CUT-S-select $P $OFF select-arm --cutoff $CUT --arm S; commit "$CUT arm S selection (sealed; empty: no frozen D1)"; }
  fi
  sealed $S/results/selection/$CUT.json || { must $CUT-select $P $OFF select --cutoff $CUT; commit "$CUT selection of every arm (sealed) — committed before the next door opens"; }
  if [ "$CUT" != C24 ]; then
    sealed $S/results/slices/$CUT.json || { unit $CUT-slice $CUT-slice slice --cutoff $CUT; commit "$CUT fold slice (official GPU, sealed; retrospective, previously examined history)"; }
    if [ "$CUT" = C23 ]; then
      sealed $S/results/sequential.json || { must sequential $P $OFF sequential; commit "sequential paths and frozen verdicts (sealed) — committed before D24 training opens"; }
    fi
  else
    sealed $S/FROZEN_SELECTION.json || { must freeze-selection $P $OFF freeze-selection; commit "FROZEN_SELECTION.json (sealed): finalists, pre-determination, validation plan"; }
    sealed $S/results/doors/FULL-authorization.json || { must authorize-full $P $OFF authorize-full; commit "FULL door authorization (sealed) — after the committed frozen selection"; }
    sealed $S/results/validation/validation.json || { unit C24-validation C24-validation validate; commit "C24 validation 2025-01-02 → 2026-10-30 on FULL, once (official GPU, sealed; previously examined history)"; }
    sealed $S/results/outcome.json || { must outcome $P $OFF outcome; commit "outcome (sealed): the precommitted determination"; }
  fi
  # preserve this cutoff's completed job archives (restartable; verified; originals removed only after every check)
  must $CUT-zstd python3 -I $R/$S/storage/tools/jobzstd.py compress --repo $R --cutoff $CUT --actions $R/$S/storage/MSFT_JOB_ACTIONS.jsonl --scratch $R/.cache/msft-d1-growth/storage-scratch
  commit "$CUT job archives preserved (zstd, verified)"
  echo "=== $(date -u +%FT%TZ) CUTOFF $CUT COMPLETE"
done
echo "=== $(date -u +%FT%TZ) CHAIN COMPLETE"
