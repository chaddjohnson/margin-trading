#!/bin/bash
# Chain 1 (PROTOCOL.md §7.1 order): C19 → C21 → C23 (search, qualify, commit the fold selection, cross-test, fold
# evaluation), the sequential paths, then C24 (independent and informed searches, qualification, cross-test) and the
# diagnostics. Fail-fast: every step's exit status is tested; the chain stops before the frozen selection.
R=/home/chad/projects/margin-trading
cd $R || exit 1
S=research/vg-lifecycle-matched-optimization
step() {
  local unit=$1; shift
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $unit: $*"
  timeout 86400 npm run -s vg-lmo -- launch --unit "$unit" --wait -- "$@" > /dev/null 2>&1
  local st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $unit exit $st"
  if [ $st -ne 0 ]; then echo "CHAIN FAILED at $unit"; exit 1; fi
}
commit() {
  git add $S/results || exit 1
  git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLSt3gzKVLMyjz7W5P" || { echo "CHAIN FAILED at commit: $1"; exit 1; }
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) committed $(git rev-parse --short HEAD): $1"
}
for C in C19 C21 C23; do
  step vglmo-$C-search search --cutoff $C --arm indep
  step vglmo-$C-qualify qualify --cutoff $C
  commit "vg-lifecycle-matched-optimization: $C search and selection sealed (all three lifecycle arms), committed before the slice opens"
  step vglmo-$C-crosstest crosstest --cutoff $C
  step vglmo-$C-fold fold-eval --cutoff $C
  commit "vg-lifecycle-matched-optimization: $C cross-test (training door) and fold evaluation sealed"
done
step vglmo-sequential sequential
commit "vg-lifecycle-matched-optimization: sequential paths sealed (one per lifecycle)"
step vglmo-C24-search-indep search --cutoff C24 --arm indep
step vglmo-C24-search-informed search --cutoff C24 --arm informed
step vglmo-C24-qualify qualify --cutoff C24
commit "vg-lifecycle-matched-optimization: C24 searches and selection sealed"
step vglmo-C24-crosstest crosstest --cutoff C24
step vglmo-diagnostics diagnostics
commit "vg-lifecycle-matched-optimization: C24 cross-test matrix and diagnostics sealed"
echo "CHAIN1 DONE"
