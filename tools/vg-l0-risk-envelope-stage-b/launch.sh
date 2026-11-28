#!/bin/bash
# Stage B's containment (PROTOCOL.md §15; standard §6.2): runs one command as a transient systemd user unit inside
# vgl0reb.slice, whose aggregate limits (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) are re-applied before every
# launch; the unit carries the same limits, KillMode=mixed, Restart=no (no automatic restart).
#   tools/vg-l0-risk-envelope-stage-b/launch.sh <unit> <absolute log file> [--wait] -- <command> [args...]
set -euo pipefail
unit=$1; log=$2; shift 2
wait=()
if [ "${1:-}" = "--wait" ]; then wait=(--wait); shift; fi
[ "${1:-}" = "--" ] && shift
systemctl --user set-property --runtime vgl0reb.slice MemoryHigh=44G MemoryMax=48G MemorySwapMax=0 2>/dev/null || true
mkdir -p "$(dirname "$log")"
exec systemd-run --user --unit="$unit" --slice=vgl0reb.slice --collect "${wait[@]}" \
  -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed -p TimeoutStopSec=120 -p Restart=no \
  -p StandardOutput=append:"$log" -p StandardError=append:"$log" \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory=/home/chad/projects/margin-trading "$@"
