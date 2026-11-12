#!/bin/bash
# The study chain (PROTOCOL.md §7.1 order, reference method NL0's): C19 → C21 → C23 (search, qualify, commit the fold
# selection, cross-test, fold evaluation, commit), the sequential path, then C24 (independent and informed searches,
# qualification, commit), the unit cross-test and the diagnostics (commit), the frozen selection (commit — the FULL
# guard), and the validation on FULL once (commit). Fail-fast: every step's exit status is tested.
R=/home/chad/projects/margin-trading
cd $R || exit 1
S=research/vg-l0-session-hold
step() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit: $*"
  timeout 86400 npm run -s vg-l0sh -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st"
  if [ $st -ne 0 ]; then echo "CHAIN FAILED at $unit"; exit 1; fi
}
commit() {
  git add $S/results $S/FROZEN_SELECTION.json 2>/dev/null; git add $S/results || exit 1
  git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLvBs8LQLn1i3xS29k" || { echo "CHAIN FAILED at commit: $1"; exit 1; }
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) committed $(git rev-parse --short HEAD): $1"
}
for C in C19 C21 C23; do
  step vgl0sh-$C-search search --cutoff $C --arm indep
  step vgl0sh-$C-qualify qualify --cutoff $C
  commit "vg-l0-session-hold: $C search and selection sealed (session hold unit), committed before the slice opens"
  step vgl0sh-$C-crosstest crosstest --cutoff $C
  step vgl0sh-$C-fold fold-eval --cutoff $C
  commit "vg-l0-session-hold: $C unit cross-test (training door) and fold evaluation sealed"
done
step vgl0sh-sequential sequential
commit "vg-l0-session-hold: sequential path sealed (session independent procedure; calendar cross rows)"
step vgl0sh-C24-search-indep search --cutoff C24 --arm indep
step vgl0sh-C24-search-informed search --cutoff C24 --arm informed
step vgl0sh-C24-qualify qualify --cutoff C24
commit "vg-l0-session-hold: C24 searches and selection sealed"
step vgl0sh-C24-crosstest crosstest --cutoff C24
step vgl0sh-diagnostics diagnostics
commit "vg-l0-session-hold: C24 unit cross-test (A/B/C) and diagnostics sealed"
step vgl0sh-freeze-selection freeze-selection
git add $S/FROZEN_SELECTION.json $S/results || exit 1
git commit -q -m "vg-l0-session-hold: FROZEN_SELECTION.json sealed (C, A, B, roles, frozen comparison labels, validation plan), committed before FULL opens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLvBs8LQLn1i3xS29k" || { echo "CHAIN FAILED at the frozen-selection commit"; exit 1; }
echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) committed $(git rev-parse --short HEAD): frozen selection"
step vgl0sh-validate validate
commit "vg-l0-session-hold: validation (FULL, once) sealed"
echo "CHAIN1 DONE"
