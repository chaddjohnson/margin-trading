#!/bin/bash
# The study chain (PROTOCOL.md §11 order; reference method NL0's): for C19 → C21 → C23 → C24: the broad searches (base
# cells; onset cells in two jobs) → commit; the broad qualification (+ New L0) → the frozen refinement plan → the
# refinement searches → their qualification → the selection (every population × selector) → commit (sealed AND
# committed before the slice opens); for C19–C23 the fold evaluation on the next door → commit; after C23 the
# sequential paths and verdicts → commit; then the frozen selection → commit (the FULL guard) → the validation on FULL
# once → commit. Fail-fast: every step's exit status is captured first and tested. Resume: bash chain1.sh <step id> (a
# sealed stage refuses to rerun; an interrupted job resumes exactly from its archive). Never edit this file while it runs.
R=/home/chad/projects/margin-trading
cd $R || exit 1
S=research/vg-l0-risk-families
W="--workers 12"
FROM=${1:-c101}
run_from() { [[ "$1" > "$FROM" || "$1" == "$FROM" ]]; }
step() {
  local id=$1; shift
  local unit=$1; shift
  run_from "$id" || return 0
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start [$id] $unit: $*"
  timeout 172800 npm run -s vg-l0rf -- launch --unit "$unit" --wait -- "$@" $W > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end [$id] $unit exit $st"
  if [ $st -ne 0 ]; then echo "CHAIN FAILED at [$id] $unit"; exit 1; fi
}
commit() {
  local id=$1; shift
  run_from "$id" || return 0
  git add $S/results || { echo "CHAIN FAILED at commit [$id]"; exit 1; }
  [ -f $S/FROZEN_SELECTION.json ] && git add $S/FROZEN_SELECTION.json
  git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLKH9KE9AVwReov5uQ"
  local st=$?
  if [ $st -ne 0 ]; then echo "CHAIN FAILED at commit [$id]: $1"; exit 1; fi
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) committed [$id] $(git rev-parse --short HEAD): $1"
}
n=0
for C in C19 C21 C23 C24; do
  n=$((n+1))
  step c${n}01 vgl0rf-$C-search-base search --cutoff $C --part base
  step c${n}02 vgl0rf-$C-search-onset1 search --cutoff $C --part onset1
  step c${n}03 vgl0rf-$C-search-onset2 search --cutoff $C --part onset2
  commit c${n}04 "vg-l0-risk-families: $C broad searches sealed (196 cells x 2 replicates)"
  step c${n}05 vgl0rf-$C-qualify-broad qualify --cutoff $C --stage broad
  step c${n}06 vgl0rf-$C-refine-plan refine-plan --cutoff $C
  step c${n}07 vgl0rf-$C-search-refine search --cutoff $C --part refine
  step c${n}08 vgl0rf-$C-qualify-refine qualify --cutoff $C --stage refine
  step c${n}09 vgl0rf-$C-select select --cutoff $C
  commit c${n}10 "vg-l0-risk-families: $C qualification, refinement plan and searches, and the selection sealed (committed before the next door opens)"
  if [ $C != C24 ]; then
    step c${n}11 vgl0rf-$C-fold fold-eval --cutoff $C
    commit c${n}12 "vg-l0-risk-families: $C fold evaluation sealed"
  fi
  if [ $C == C23 ]; then
    step c${n}13 vgl0rf-sequential sequential
    commit c${n}14 "vg-l0-risk-families: sequential paths and chronological verdicts sealed (9 procedures)"
  fi
done
step f01 vgl0rf-freeze-selection freeze-selection
commit f02 "vg-l0-risk-families: FROZEN_SELECTION.json sealed (C24 primaries, finalists, verdicts, successor determination, validation plan), committed before FULL opens"
step f03 vgl0rf-validate validate
commit f04 "vg-l0-risk-families: validation (FULL, once) sealed"
echo "CHAIN1 DONE"
