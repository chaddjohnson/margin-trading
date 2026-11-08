#!/bin/bash
# The study chain (PROTOCOL.md §8): C19 → C21 → C23 (search, qualify, commit the fold selection, evaluate), the
# sequential policies, then C24 (search, qualify) and the development diagnostics. Fail-fast: every step's status is
# tested; host checks before every launch; one heavy unit at a time.
R=/home/chad/projects/margin-trading; cd $R || exit 1
S=research/vgt-d1-growth-joint/results
hostok() {
  for i in $(seq 1 120); do
    a=$(awk '/MemAvailable/ {print $2}' /proc/meminfo); p=$(awk -F'avg60=' '/^some/ {split($2,x," "); print x[1]}' /proc/pressure/memory)
    if [ "$a" -ge 16777216 ] && awk "BEGIN{exit !($p <= 10)}"; then echo "$(date -u +%T) host ok: MemAvailable ${a} kB, PSI avg60 ${p}"; return 0; fi
    echo "$(date -u +%T) host busy: MemAvailable ${a} kB, PSI avg60 ${p}; waiting"; sleep 30
  done; echo "CHAIN-FAILED host"; exit 1
}
L() { u=$1; shift; hostok; npm run -s vgt-joint -- launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; [ $s -eq 0 ] || { echo "CHAIN-FAILED at $u"; exit 1; }; }
# run a stage unless its sealed record exists (a resumed chain skips completed stages)
X() { f=$1; shift; if [ -f "$f" ]; then echo "$(date -u +%T) skip $1 ($f exists)"; else L "$@"; fi; }
C() { if git diff --quiet HEAD -- "$@" 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard -- "$@")" ]; then echo "$(date -u +%T) already committed: $MSG"; return 0; fi; git add "$@" && git commit -q -m "vgt-d1-growth-joint: $MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkNQq5BqVK55cHMZikk" -- "$@" || { echo "CHAIN-FAILED at commit: $MSG"; exit 1; }; echo "$(date -u +%T) committed $(git rev-parse --short HEAD): $MSG"; }
[ -f $S/parity/parity.json ] && [ -f $S/protocol-freeze.json ] || { echo "CHAIN-FAILED: parity or freeze missing"; exit 1; }
for F in C19 C21 C23; do
  X $S/search/$F/search.json vgtj-search-$F search --cutoff $F --workers 14
  X $S/folds/$F/selection.json vgtj-qualify-$F qualify --cutoff $F --workers 14
  MSG="$F search and fold selection (sealed and committed before its evaluation slice)"; C $S/search/$F/search.json $S/folds/$F/selection.json $S/seals.jsonl $S/doors.jsonl
  X $S/folds/$F/evaluation.json vgtj-eval-$F fold-eval --cutoff $F
done
X $S/folds/sequential.json vgtj-sequential sequential
MSG="fold evaluations C19–C23 and the sequential policies"; C $S/folds/C19/evaluation.json $S/folds/C21/evaluation.json $S/folds/C23/evaluation.json $S/folds/sequential.json $S/seals.jsonl $S/doors.jsonl
X $S/search/C24/search.json vgtj-search-C24 search --cutoff C24 --workers 14
X $S/folds/C24/selection.json vgtj-qualify-C24 qualify --cutoff C24 --workers 14
X $S/diagnostics/D24/diagnostics.json vgtj-diagnostics diagnostics
MSG="C24 search, qualification and development diagnostics (before the frozen selection)"; C $S/search/C24/search.json $S/folds/C24/selection.json $S/diagnostics $S/seals.jsonl $S/doors.jsonl
echo "$(date -u +%T) CHAIN-DONE"
