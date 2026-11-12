#!/bin/bash
# The study chain (PROTOCOL.md order; reference method NL0's): the fixed-parameter comparison (commit); for C19 → C21 →
# C23: B1 search and selection, B2 step d1 → its finalists → step g and its selection (commit: sealed before the slice
# opens), the fold evaluation (commit); the sequential paths (commit); C24: B1, B2, A1, A2 (each search and selection),
# the controls and the final selection (commit); the ablation and the diagnostics (commit); the frozen selection (commit —
# the FULL guard); the validation on FULL once (commit). Fail-fast: every step's exit status is captured first and tested.
# Resume: bash chain1.sh <step id> (a sealed stage refuses to rerun; an interrupted job resumes from its archive).
R=/home/chad/projects/margin-trading
cd $R || exit 1
S=research/vg-l0-shadow-eligibility
FROM=${1:-a00}
run_from() { [[ "$1" > "$FROM" || "$1" == "$FROM" ]]; }
step() {
  local id=$1; shift
  local unit=$1; shift
  run_from "$id" || return 0
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start [$id] $unit: $*"
  timeout 86400 npm run -s vg-l0se -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
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
Claude-Session: https://claude.ai/code/session_01DuunkMLx8seL6m7ycaHehU"
  local st=$?
  if [ $st -ne 0 ]; then echo "CHAIN FAILED at commit [$id]: $1"; exit 1; fi
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) committed [$id] $(git rev-parse --short HEAD): $1"
}
step a01 vgl0se-phase2 phase2
commit a02 "vg-l0-shadow-eligibility: fixed-parameter comparison sealed (New L0 under the 8 toggle combinations, D24)"
n=0
for C in C19 C21 C23; do
  n=$((n+1))
  step b${n}1 vgl0se-$C-search-B1 search --cutoff $C --track B1
  step b${n}2 vgl0se-$C-qualify-B1 qualify --cutoff $C --track B1
  step b${n}3 vgl0se-$C-search-B2-d1 search --cutoff $C --track B2 --step d1
  step b${n}4 vgl0se-$C-qualify-B2-d1 qualify --cutoff $C --track B2 --step d1
  step b${n}5 vgl0se-$C-search-B2-g search --cutoff $C --track B2 --step g
  step b${n}6 vgl0se-$C-qualify-B2-g qualify --cutoff $C --track B2 --step g
  commit b${n}7 "vg-l0-shadow-eligibility: $C fresh-track searches and selections sealed (B1; B2 d1 → finalists → g), committed before the slice opens"
  step b${n}8 vgl0se-$C-fold fold-eval --cutoff $C
  commit b${n}9 "vg-l0-shadow-eligibility: $C fold evaluation sealed"
done
step c01 vgl0se-sequential sequential
commit c02 "vg-l0-shadow-eligibility: sequential paths sealed (B1, B2 procedures)"
step d01 vgl0se-C24-search-B1 search --cutoff C24 --track B1
step d02 vgl0se-C24-qualify-B1 qualify --cutoff C24 --track B1
step d03 vgl0se-C24-search-B2-d1 search --cutoff C24 --track B2 --step d1
step d04 vgl0se-C24-qualify-B2-d1 qualify --cutoff C24 --track B2 --step d1
step d05 vgl0se-C24-search-B2-g search --cutoff C24 --track B2 --step g
step d06 vgl0se-C24-qualify-B2-g qualify --cutoff C24 --track B2 --step g
commit d07 "vg-l0-shadow-eligibility: C24 fresh-track searches and selections sealed (B1, B2)"
step d08 vgl0se-C24-search-A1 search --cutoff C24 --track A1
step d09 vgl0se-C24-qualify-A1 qualify --cutoff C24 --track A1
step d10 vgl0se-C24-search-A2-d1 search --cutoff C24 --track A2 --step d1
step d11 vgl0se-C24-qualify-A2-d1 qualify --cutoff C24 --track A2 --step d1
step d12 vgl0se-C24-search-A2-g search --cutoff C24 --track A2 --step g
step d13 vgl0se-C24-qualify-A2-g qualify --cutoff C24 --track A2 --step g
step d14 vgl0se-C24-controls qualify-controls --cutoff C24
step d15 vgl0se-C24-final final-select --cutoff C24
commit d16 "vg-l0-shadow-eligibility: C24 informed-track searches, controls and the final selection sealed"
step e01 vgl0se-C24-ablation ablation --cutoff C24
step e02 vgl0se-diagnostics diagnostics
commit e03 "vg-l0-shadow-eligibility: C24 ablation (phenotype × toggles) and diagnostics sealed"
step f01 vgl0se-freeze-selection freeze-selection
commit f02 "vg-l0-shadow-eligibility: FROZEN_SELECTION.json sealed (nominee, track primaries, roles, frozen labels, validation plan), committed before FULL opens"
step f03 vgl0se-validate validate
commit f04 "vg-l0-shadow-eligibility: validation (FULL, once) sealed"
echo "CHAIN1 DONE"
