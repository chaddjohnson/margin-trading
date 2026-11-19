#!/bin/bash
# The study chain (PROTOCOL.md §7.1, §10): C19 → C21 → C23 (search, qualify, commit the fold selection, fold evaluation)
# → sequential → C24 search → C24 qualification → transfers → diagnostics → frozen selection (sealed; committed by hand
# before the validation). Every heavy step is its own transient unit inside c4gdx.slice (MemoryHigh 44G, MemoryMax 48G,
# swap 0), one at a time; this chain only launches and waits. Fail-fast: every step's status is tested; a failure stops
# the chain (nothing restarts on its own). A completed, sealed step is skipped on a rerun (its record exists), so
# rerunning the chain resumes it at the first unfinished step; an interrupted step resumes from its job archive.
#
#   bash research/c4-gdx-growth-partner/chains/study.sh            (normally run as the transient unit c4gdx-chain)
R=/home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=$R/research/c4-gdx-growth-partner/results
W=${W:-14}
cd "$R" || exit 1
export PATH="$(dirname "$NODE"):$PATH"

c4g() { "$NODE" --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning src/c4-gdx-growth-partner/main.ts "$@"; }

step() { # step <record> <unit> <args...>: skip if the record exists, else run the unit and require exit 0 + the record
  local rec="$1"; shift
  local unit="$1"; shift
  if [ -e "$rec" ]; then echo "[$(date -u +%FT%TZ)] $unit: $(basename "$rec") exists, skipped"; return 0; fi
  echo "[$(date -u +%FT%TZ)] $unit: $*"
  c4g launch --unit "$unit" --wait -- "$@" --workers "$W"
  local st=$?
  echo "[$(date -u +%FT%TZ)] $unit: exit $st"
  [ "$st" = 0 ] || { echo "CHAIN STOPPED at $unit (exit $st)"; exit 1; }
  [ -e "$rec" ] || { echo "CHAIN STOPPED: $unit exited 0 but $rec is missing"; exit 1; }
}

commit_selection() { # the fold selection must be committed before its slice opens
  local cut="$1"
  local f="research/c4-gdx-growth-partner/results/folds/$cut/selection.json"
  if git ls-files --error-unmatch -- "$f" > /dev/null 2>&1 && git diff --quiet HEAD -- "$f"; then return 0; fi
  git add -- "$f" research/c4-gdx-growth-partner/results/seals.jsonl || { echo "CHAIN STOPPED: git add $cut"; exit 1; }
  git commit -q -m "c4-gdx-growth-partner: $cut fold selection sealed and committed before its slice opens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkPkToTVSLayMokJkzk" -- "$f" research/c4-gdx-growth-partner/results/seals.jsonl \
    || { echo "CHAIN STOPPED: git commit $cut"; exit 1; }
  echo "[$(date -u +%FT%TZ)] committed the $cut selection: $(git rev-parse --short HEAD)"
}

echo "[$(date -u +%FT%TZ)] chain start (workers $W)"
c4g verify || { echo "CHAIN STOPPED: seals do not verify"; exit 1; }

for cut in C19 C21 C23; do
  step "$OUT/search/$cut/search.json" "c4gdx-search-$cut" search --cutoff "$cut"
  step "$OUT/folds/$cut/selection.json" "c4gdx-qualify-$cut" qualify --cutoff "$cut"
  commit_selection "$cut"
  step "$OUT/folds/$cut/evaluation.json" "c4gdx-eval-$cut" fold-eval --cutoff "$cut"
done

step "$OUT/folds/sequential.json" c4gdx-sequential sequential
step "$OUT/search/C24/search.json" c4gdx-search-C24 search --cutoff C24
step "$OUT/folds/C24/selection.json" c4gdx-qualify-C24 qualify --cutoff C24
step "$OUT/transfers/transfers.json" c4gdx-transfers transfers
step "$OUT/diagnostics/D24/diagnostics.json" c4gdx-diagnostics diagnostics
step "$R/research/c4-gdx-growth-partner/FROZEN_SELECTION.json" c4gdx-freeze-selection freeze-selection

echo "[$(date -u +%FT%TZ)] CHAIN DONE (next, by hand: commit FROZEN_SELECTION.json, then the validation)"
