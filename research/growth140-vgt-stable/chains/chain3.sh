#!/bin/bash
# The chronological chain (PROTOCOL.md §7): fail-fast, host checks before every launch.
R=/home/chad/projects/margin-trading; cd $R
hostok() {
  for i in $(seq 1 120); do
    a=$(awk '/MemAvailable/ {print $2}' /proc/meminfo); p=$(awk -F'avg60=' '/^some/ {split($2,x," "); print x[1]}' /proc/pressure/memory)
    if [ "$a" -ge 16777216 ] && awk "BEGIN{exit !($p <= 10)}"; then echo "$(date -u +%T) host ok: MemAvailable ${a} kB, PSI avg60 ${p}"; return 0; fi
    echo "$(date -u +%T) host busy: MemAvailable ${a} kB, PSI avg60 ${p}; waiting"; sleep 30
  done; echo "CHAIN-FAILED host"; exit 1
}
L() { u=$1; shift; hostok; npm run -s growth140-stable -- launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; [ $s -eq 0 ] || { echo "CHAIN-FAILED at $u"; exit 1; }; }
N() { npm run -s growth140-stable -- "$@" || { echo "CHAIN-FAILED at $*"; exit 1; }; }
S=research/growth140-vgt-stable/results
for C in C19 C21 C23; do
  L growth140-stable-search-$C search --cutoff $C --workers 14
  L growth140-stable-qualify-$C qualify --cutoff $C --workers 14
  N freeze-fold --cutoff $C
  git add $S/search/$C.json $S/qualify/$C.json $S/folds/$C/FOLD_SELECTION.json $S/seals.jsonl && git commit -q -m "growth140-vgt-stable: $C search, qualification and fold selection (frozen before its evaluation slice)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkNagAbVYwFVY6ZTcH7" -- $S/search/$C.json $S/qualify/$C.json $S/folds/$C/FOLD_SELECTION.json $S/seals.jsonl || { echo "CHAIN-FAILED at commit $C"; exit 1; }
  echo "$(date -u +%T) committed $C fold selection $(git rev-parse --short HEAD)"
  L growth140-stable-evaluate-$C evaluate-fold --cutoff $C --workers 14
done
N sequential
L growth140-stable-search-C24 search --cutoff C24 --workers 14
L growth140-stable-qualify-C24 qualify --cutoff C24 --workers 14
echo "$(date -u +%T) CHAIN-DONE"
