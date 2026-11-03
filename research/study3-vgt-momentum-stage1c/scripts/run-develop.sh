#!/bin/sh
# Runs the five develop stages in order, one process per history (one data door per process), stopping at the first
# failure. Run from the repository root after `freeze-code`:
#   sh research/study3-vgt-momentum-stage1c/scripts/run-develop.sh
# Each stage logs to results/logs/develop-<h>.log (git-ignored) and is write-once: a sealed history is skipped.
set -e
cd "$(dirname "$0")/../../.."
STUDY=research/study3-vgt-momentum-stage1c
for h in A B C D H; do
  if [ -f "$STUDY/results/records/develop-$h.json" ]; then
    echo "develop-$h already sealed; skipped"
    continue
  fi
  echo "develop-$h start $(date -u +%FT%TZ)"
  sh "$STUDY/scripts/study3-momentum-stage1c.sh" stage develop "$h" > "$STUDY/results/logs/develop-$h.log" 2>&1
  echo "develop-$h sealed $(date -u +%FT%TZ)"
done
echo "all develop stages sealed $(date -u +%FT%TZ)"
