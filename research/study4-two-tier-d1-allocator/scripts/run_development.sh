#!/usr/bin/env bash
# Runs the development stages of the given windows one after another (each its own process and door), logging to
# research/study4-two-tier-d1-allocator/results/logs/develop-<window>.log; stops at the first failure. Run from the
# repository root: research/study4-two-tier-d1-allocator/scripts/run_development.sh F20 F21 F22 F23
set -u
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
logs=research/study4-two-tier-d1-allocator/results/logs
mkdir -p "$logs"
for window in "$@"; do
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) START develop $window"
  if npm run -s study4-allocator -- develop "$window" 14 >> "$logs/develop-$window.log" 2>&1; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) DONE develop $window"
  else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) FAILED develop $window (see $logs/develop-$window.log)"
    exit 1
  fi
done
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ALL DONE $*"
