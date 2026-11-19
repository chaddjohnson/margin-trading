#!/bin/bash
# The study chain (PROTOCOL.md §7, §10, §11): for C19, C21, C23 — the screens of every eligible ETF, the cutoff
# selection, a commit of the cutoff's records before its slice opens, the fold evaluation — then the sequential
# policies, the C24 screens, the transfer lane, the final selection, the diagnostics and the frozen selection (sealed;
# committed by hand before the one-time validation). Every heavy step is its own transient unit inside getf.slice
# (MemoryHigh 44G, MemoryMax 48G, swap 0), one at a time; this chain only launches and waits. Fail-fast: every step's
# status is tested; a failure stops the chain (nothing restarts on its own). A completed, sealed step is skipped on a
# rerun, so rerunning the chain resumes it at the first unfinished step; an interrupted step resumes from its archives.
#
#   W=8 K=2 bash research/growth-etf-screening/chains/study.sh      (normally run as the transient unit getf-chain)
R=/home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=$R/research/growth-etf-screening/results
W=${W:-8}
K=${K:-2}
cd "$R" || exit 1
export PATH="$(dirname "$NODE"):$PATH"

getf() { "$NODE" --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning src/growth-etf-screening/main.ts "$@"; }

step() { # step <record> <unit> <args...>: skip if the record exists, else run the unit and require exit 0 + the record
  local rec="$1"; shift
  local unit="$1"; shift
  if [ -e "$rec" ]; then echo "[$(date -u +%FT%TZ)] $unit: $(basename "$rec") exists, skipped"; return 0; fi
  echo "[$(date -u +%FT%TZ)] $unit: $*"
  getf launch --unit "$unit" --wait -- "$@"
  local st=$?
  echo "[$(date -u +%FT%TZ)] $unit: exit $st"
  [ "$st" = 0 ] || { echo "CHAIN STOPPED at $unit (exit $st)"; exit 1; }
  [ -e "$rec" ] || { echo "CHAIN STOPPED: $unit exited 0 but $rec is missing"; exit 1; }
}

run_unless() { # run_unless <later record> <unit> <args...>: an idempotent stage (completed ETF jobs are skipped inside it),
  # skipped only once the record that follows it exists
  local later="$1"; shift
  local unit="$1"; shift
  if [ -e "$later" ]; then echo "[$(date -u +%FT%TZ)] $unit: $(basename "$later") exists, skipped"; return 0; fi
  echo "[$(date -u +%FT%TZ)] $unit: $*"
  getf launch --unit "$unit" --wait -- "$@"
  local st=$?
  echo "[$(date -u +%FT%TZ)] $unit: exit $st"
  [ "$st" = 0 ] || { echo "CHAIN STOPPED at $unit (exit $st)"; exit 1; }
}

commit_cutoff() { # the cutoff's selection (and its screens) must be committed before its slice opens
  local cut="$1"
  local d="research/growth-etf-screening/results"
  local f="$d/folds/$cut/selection.json"
  if git ls-files --error-unmatch -- "$f" > /dev/null 2>&1 && git diff --quiet HEAD -- "$f"; then return 0; fi
  git add -- "$f" "$d/search/$cut" "$d/qualify/$cut" "$d/seals.jsonl" "$d/budget-ledger.jsonl" "$d/doors.jsonl" || { echo "CHAIN STOPPED: git add $cut"; exit 1; }
  git commit -q -m "growth-etf-screening: $cut screens of every eligible ETF and the cutoff selection, sealed and committed before its slice opens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkQ8zdUak3hcdUpgA4o" || { echo "CHAIN STOPPED: git commit $cut"; exit 1; }
  echo "[$(date -u +%FT%TZ)] committed the $cut selection: $(git rev-parse --short HEAD)"
}

echo "[$(date -u +%FT%TZ)] chain start (workers $W, ETF jobs at a time $K)"
getf verify || { echo "CHAIN STOPPED: seals do not verify"; exit 1; }
getf plan | grep -q '"fits": true' || { echo "CHAIN STOPPED: the plan check does not fit the ceiling"; exit 1; }

for cut in C19 C21 C23; do
  run_unless "$OUT/folds/$cut/selection.json" "getf-screen-$cut" screen --cutoff "$cut" --concurrency "$K" --workers "$W"
  step "$OUT/folds/$cut/selection.json" "getf-select-$cut" select --cutoff "$cut"
  commit_cutoff "$cut"
  step "$OUT/folds/$cut/evaluation.json" "getf-eval-$cut" fold-eval --cutoff "$cut"
done

step "$OUT/folds/sequential.json" getf-sequential sequential
run_unless "$OUT/final/selection-C24.json" getf-screen-C24 screen --cutoff C24 --concurrency "$K" --workers "$W"
run_unless "$OUT/final/selection-C24.json" getf-transfer transfer --concurrency "$K" --workers "$W"
step "$OUT/final/selection-C24.json" getf-final-select final-select
step "$OUT/final/diagnostics.json" getf-diagnostics diagnostics --workers "$W"
step "$R/research/growth-etf-screening/FROZEN_SELECTION.json" getf-freeze-selection freeze-selection

echo "[$(date -u +%FT%TZ)] CHAIN DONE (next, by hand: verify and commit FROZEN_SELECTION.json, then the validation)"
