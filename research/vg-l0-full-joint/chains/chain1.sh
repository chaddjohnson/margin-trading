#!/bin/bash
# The study chain (PROTOCOL.md §11 order; reference method NL0's): for C19 → C21 → C23 → C24, Track I: the broad
# searches (64 cells × 2 replicates in two jobs) → commit; the broad qualification (+ New L0) → the frozen refinement
# plan → the refinement searches → their qualification; at C24 then Track N: the informed searches (16 family pairs × R_N
# replicates in two jobs) → their qualification (+ the incumbents); the selection (every population × selector) → commit
# (sealed AND committed before the slice opens); for C19–C23 the fold evaluation on the next door → commit; after C23 the
# sequential paths and verdicts → commit; then the frozen selection → commit (the FULL guard) → the validation on FULL
# once → commit. Fail-fast: every step's exit status is captured first and tested. Resume: bash chain1.sh <step id> (a
# sealed stage refuses to rerun; an interrupted job resumes exactly from its archive). Never edit this file while it runs.
R=/home/chad/projects/margin-trading
cd $R || exit 1
S=research/vg-l0-full-joint
W="--workers ${VGL0FJ_CHAIN_WORKERS:-12}"
FROM=${1:-c101}
run_from() { [[ "$1" > "$FROM" || "$1" == "$FROM" ]]; }
step() {
  local id=$1; shift
  local unit=$1; shift
  run_from "$id" || return 0
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start [$id] $unit: $*"
  timeout 259200 npm run -s vg-l0fj -- launch --unit "$unit" --wait -- "$@" $W > /dev/null 2>&1
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
Claude-Session: https://claude.ai/code/session_01DuunkQ5azUC5nSEXq1apmh"
  local st=$?
  if [ $st -ne 0 ]; then echo "CHAIN FAILED at commit [$id]: $1"; exit 1; fi
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) committed [$id] $(git rev-parse --short HEAD): $1"
}
n=0
for C in C19 C21 C23 C24; do
  n=$((n+1))
  step c${n}01 vgl0fj-$C-search-broad1 search --cutoff $C --part broad1
  step c${n}02 vgl0fj-$C-search-broad2 search --cutoff $C --part broad2
  commit c${n}03 "vg-l0-full-joint: $C Track I broad searches sealed (64 cells x 2 replicates)"
  step c${n}04 vgl0fj-$C-qualify-broad qualify --cutoff $C --stage broad
  step c${n}05 vgl0fj-$C-refine-plan refine-plan --cutoff $C
  step c${n}06 vgl0fj-$C-search-refine search --cutoff $C --part refine
  step c${n}07 vgl0fj-$C-qualify-refine qualify --cutoff $C --stage refine
  if [ $C == C24 ]; then
    commit c${n}08 "vg-l0-full-joint: C24 Track I qualification, refinement plan and refinement sealed"
    step c${n}09 vgl0fj-C24-search-informed1 search --cutoff C24 --part informed1
    step c${n}10 vgl0fj-C24-search-informed2 search --cutoff C24 --part informed2
    step c${n}11 vgl0fj-C24-qualify-informed qualify --cutoff C24 --stage informed
  fi
  step c${n}12 vgl0fj-$C-select select --cutoff $C
  commit c${n}13 "vg-l0-full-joint: $C qualification, refinement and the selection sealed (committed before the next door opens)"
  if [ $C != C24 ]; then
    step c${n}14 vgl0fj-$C-fold fold-eval --cutoff $C
    commit c${n}15 "vg-l0-full-joint: $C fold evaluation sealed"
  fi
  if [ $C == C23 ]; then
    step c${n}16 vgl0fj-sequential sequential
    commit c${n}17 "vg-l0-full-joint: sequential paths and chronological verdicts sealed (9 Track I procedures)"
  fi
done
step f01 vgl0fj-freeze-selection freeze-selection
commit f02 "vg-l0-full-joint: FROZEN_SELECTION.json sealed (C24 primaries of Track I and Track N, finalists, verdicts, successor determination, validation plan), committed before FULL opens"
step f03 vgl0fj-validate validate
commit f04 "vg-l0-full-joint: validation (FULL, once) sealed"
echo "CHAIN1 DONE"
