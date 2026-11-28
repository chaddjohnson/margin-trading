#!/bin/bash
# gpu-phase9 (copy of tools/gpu-phase7/launch-slice.sh for this study's slice; the working directory is this checkout,
# so the campaign can run in the Assignment 2 integration worktree): runs one command as a transient systemd user
# unit inside gpup9.slice, whose aggregate limits (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) are re-applied
# before every launch (standard §6.2). For the acceptance campaign's contained steps.
#   tools/gpu-phase9/launch-slice.sh <unit> <absolute log file> [--wait] -- <command> [args...]
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
unit=$1; log=$2; shift 2
wait=()
if [ "${1:-}" = "--wait" ]; then wait=(--wait); shift; fi
[ "${1:-}" = "--" ] && shift
systemctl --user set-property --runtime gpup9.slice MemoryHigh=44G MemoryMax=48G MemorySwapMax=0 2>/dev/null || true
mkdir -p "$(dirname "$log")"
exec systemd-run --user --unit="$unit" --slice=gpup9.slice --collect "${wait[@]}" \
  -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed -p TimeoutStopSec=120 -p Restart=no \
  -p StandardOutput=append:"$log" -p StandardError=append:"$log" \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory="$ROOT" "$@"
