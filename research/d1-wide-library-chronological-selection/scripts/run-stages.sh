#!/usr/bin/env bash
# Runs the study's post-freeze stages in the calendar order of PROTOCOL.md §8.2, from the repository root, one step at a
# time, stopping at the first failure. Each stage is write-once and refuses to run twice; the calendar door refuses a
# step whose earlier seals are missing. Usage: scripts/run-stages.sh <first-step> [last-step]
set -u
cd "$(git rev-parse --show-toplevel)"
LOG=research/d1-wide-library-chronological-selection/results/logs
STEPS=(
  "search --fold S18" "sample-parity --fold S18" "libraries --fold S18"
  "search --fold S19" "sample-parity --fold S19" "libraries --fold S19"
  "census --window fold-a" "search --fold A" "sample-parity --fold A" "libraries --fold A"
  "search --fold S20" "sample-parity --fold S20" "libraries --fold S20"
  "evaluate --phase A" "nested-select --triple T1"
  "reconstruct --window fold-b" "census --window fold-b" "search --fold B" "sample-parity --fold B" "libraries --fold B"
  "evaluate --phase B-sel" "nested-select --triple T2"
  "search --fold S22" "sample-parity --fold S22" "libraries --fold S22"
  "evaluate --phase B" "evaluate --phase T1-later" "evaluate --phase S18" "evaluate --phase S19" "evaluate --phase S20" "evaluate --phase S22"
  "reconstruct --window final" "census --window final"
)
first=${1:-1}; last=${2:-${#STEPS[@]}}
for ((i = first; i <= last; i++)); do
  step=${STEPS[$((i - 1))]}
  name=$(echo "$step" | tr ' ' '_' | tr -d '-')
  echo "[$(date -u +%FT%TZ)] step $i: $step" | tee -a "$LOG/run-stages.log"
  case "$step" in
    search*|libraries*|evaluate*|census*|reconstruct*) extra="--workers 14" ;;
    *) extra="" ;;
  esac
  if ! npm run d1-library-study -- $step $extra > "$LOG/stage-$i-$name.log" 2>&1; then
    echo "[$(date -u +%FT%TZ)] step $i FAILED (see $LOG/stage-$i-$name.log)" | tee -a "$LOG/run-stages.log"
    exit 1
  fi
  echo "[$(date -u +%FT%TZ)] step $i done: $(tail -1 "$LOG/stage-$i-$name.log")" | tee -a "$LOG/run-stages.log"
done
