#!/bin/bash
# The study chain (PROTOCOL.md §11, §14): C19 → C21 → C23 (arm D search, qualify, COMMIT the fold selection, evaluate),
# the sequential policies, then C24 (arm D, arm B, the Growth-pair selection, arm C, qualification) and the
# development diagnostics. It stops before the frozen selection (written, inspected and committed by hand before the
# validation). Fail-fast: every step's status is tested; host checks before every launch; one heavy unit at a time; a
# resumed chain skips the stages whose sealed record exists.
R=/home/chad/projects/margin-trading; cd $R || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
S=research/vg-d1-growth-joint/results
W=15
hostok() {
  for i in $(seq 1 120); do
    a=$(awk '/MemAvailable/ {print $2}' /proc/meminfo); p=$(awk -F'avg60=' '/^some/ {split($2,x," "); print x[1]}' /proc/pressure/memory)
    if [ "$a" -ge 16777216 ] && awk "BEGIN{exit !($p <= 10)}"; then echo "$(date -u +%T) host ok: MemAvailable ${a} kB, PSI avg60 ${p}"; return 0; fi
    echo "$(date -u +%T) host busy: MemAvailable ${a} kB, PSI avg60 ${p}; waiting"; sleep 30
  done; echo "CHAIN-FAILED host"; exit 1
}
L() { u=$1; shift; hostok; $NODE --experimental-transform-types --disable-warning=ExperimentalWarning src/vg-d1-growth-joint/main.ts launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; [ $s -eq 0 ] || { echo "CHAIN-FAILED at $u"; exit 1; }; }
X() { f=$1; shift; if [ -f "$f" ]; then echo "$(date -u +%T) skip $1 ($f exists)"; else L "$@"; fi; }
C() { if git diff --quiet HEAD -- "$@" 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard -- "$@")" ]; then echo "$(date -u +%T) already committed: $MSG"; return 0; fi; git add -- "$@" && git commit -q -m "vg-d1-growth-joint: $MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLnTmoSy7HAkgFL3kJ" -- "$@" || { echo "CHAIN-FAILED at commit: $MSG"; exit 1; }; echo "$(date -u +%T) committed $(git rev-parse --short HEAD): $MSG"; }
[ -f $S/parity/parity.json ] && [ -f $S/protocol-freeze.json ] || { echo "CHAIN-FAILED: parity or freeze missing"; exit 1; }
for F in C19 C21 C23; do
  X $S/search/$F/indep.json vgjoint-search-$F-indep search --cutoff $F --arm indep --workers $W
  X $S/folds/$F/selection.json vgjoint-qualify-$F qualify --cutoff $F --workers $W
  MSG="$F arm-D search and fold selection (sealed and committed before its evaluation slice)"; C $S/search/$F $S/folds/$F/selection.json $S/seals.jsonl $S/doors.jsonl
  X $S/folds/$F/evaluation.json vgjoint-eval-$F fold-eval --cutoff $F --workers $W
done
X $S/folds/sequential.json vgjoint-sequential sequential --workers $W
MSG="fold evaluations C19–C23 and the sequential policies"; C $S/folds $S/seals.jsonl $S/doors.jsonl
X $S/search/C24/indep.json vgjoint-search-C24-indep search --cutoff C24 --arm indep --workers $W
X $S/search/C24/gpair.json vgjoint-search-C24-gpair search --cutoff C24 --arm gpair --workers $W
X $S/gpair/C24/selection.json vgjoint-qualify-gpair-C24 qualify-gpair --cutoff C24 --workers $W
MSG="C24 arm-D and arm-B searches and the Growth-pair selection (the staged seeds)"; C $S/search/C24 $S/gpair $S/seals.jsonl $S/doors.jsonl
X $S/search/C24/informed.json vgjoint-search-C24-informed search --cutoff C24 --arm informed --workers $W
X $S/folds/C24/selection.json vgjoint-qualify-C24 qualify --cutoff C24 --workers $W
X $S/diagnostics/D24/diagnostics.json vgjoint-diagnostics diagnostics --workers $W
MSG="C24 informed search, qualification and development diagnostics (before the frozen selection)"; C $S/search/C24 $S/folds/C24 $S/diagnostics $S/seals.jsonl $S/doors.jsonl
echo "$(date -u +%T) CHAIN-DONE"
