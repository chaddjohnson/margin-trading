#!/bin/bash
# The study chain (PROTOCOL.md §7.1, §10): C19 → C21 → C23 (search, qualify, commit the fold selection, fold evaluation)
# → sequential → C24 independent and informed searches → C24 qualification. Every heavy step is its own transient unit
# inside vgexp.slice (MemoryHigh 44G, MemoryMax 48G, swap 0), one at a time; this chain only launches and waits.
# Fail-fast: every step's status is tested; a failure stops the chain (nothing restarts on its own). A completed,
# sealed step is skipped on a rerun (its record exists), so rerunning the chain resumes it at the first unfinished step;
# an interrupted step resumes from its job archive.
#
#   bash research/vg-d1-growth-expanded/chains/study.sh            (normally run as the transient unit vgexp-chain)
R=/home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=$R/research/vg-d1-growth-expanded/results
W=${W:-14}
cd "$R" || exit 1
export PATH="$(dirname "$NODE"):$PATH"

vgx() { "$NODE" --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning src/vg-d1-growth-expanded/main.ts "$@"; }

step() { # step <record> <unit> <args...>: skip if the record exists, else run the unit and require exit 0 + the record
  local rec="$1"; shift
  local unit="$1"; shift
  if [ -e "$rec" ]; then echo "[$(date -u +%FT%TZ)] $unit: $(basename "$rec") exists, skipped"; return 0; fi
  echo "[$(date -u +%FT%TZ)] $unit: $*"
  vgx launch --unit "$unit" --wait -- "$@" --workers "$W"
  local st=$?
  echo "[$(date -u +%FT%TZ)] $unit: exit $st"
  [ "$st" = 0 ] || { echo "CHAIN STOPPED at $unit (exit $st)"; exit 1; }
  [ -e "$rec" ] || { echo "CHAIN STOPPED: $unit exited 0 but $rec is missing"; exit 1; }
}

commit_selection() { # the fold selection must be committed before its slice opens
  local cut="$1"
  local f="research/vg-d1-growth-expanded/results/folds/$cut/selection.json"
  if git ls-files --error-unmatch -- "$f" > /dev/null 2>&1 && git diff --quiet HEAD -- "$f"; then return 0; fi
  git add -- "$f" research/vg-d1-growth-expanded/results/seals.jsonl || { echo "CHAIN STOPPED: git add $cut"; exit 1; }
  git commit -q -m "vg-d1-growth-expanded: $cut fold selection sealed and committed before its slice opens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkLENyR6Hzrqx2dWwHD" -- "$f" research/vg-d1-growth-expanded/results/seals.jsonl \
    || { echo "CHAIN STOPPED: git commit $cut"; exit 1; }
  echo "[$(date -u +%FT%TZ)] committed the $cut selection: $(git rev-parse --short HEAD)"
}

echo "[$(date -u +%FT%TZ)] chain start (workers $W)"
vgx verify || { echo "CHAIN STOPPED: seals do not verify"; exit 1; }

for cut in C19 C21 C23; do
  step "$OUT/search/$cut/indep.json" "vgexp-search-$cut-indep" search --cutoff "$cut" --arm indep
  step "$OUT/folds/$cut/selection.json" "vgexp-qualify-$cut" qualify --cutoff "$cut"
  commit_selection "$cut"
  step "$OUT/folds/$cut/evaluation.json" "vgexp-eval-$cut" fold-eval --cutoff "$cut"
done

step "$OUT/folds/sequential.json" vgexp-sequential sequential
step "$OUT/search/C24/indep.json" vgexp-search-C24-indep search --cutoff C24 --arm indep
step "$OUT/search/C24/informed.json" vgexp-search-C24-informed search --cutoff C24 --arm informed
step "$OUT/folds/C24/selection.json" vgexp-qualify-C24 qualify --cutoff C24

echo "[$(date -u +%FT%TZ)] CHAIN DONE (next, by hand after inspection of integrity only: diagnostics, freeze-selection)"
