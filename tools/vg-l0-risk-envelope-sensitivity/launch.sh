#!/bin/bash
# RES-A 1.0.0 containment (PROTOCOL.md §5; standard §6.2): runs one command as a transient systemd user unit inside
# vgl0res.slice (aggregate MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0, re-applied before every launch); the unit carries
# the same limits, KillMode=mixed, Restart=no. A copy of the pilot's tools/vg-l0-risk-envelope-pilot/launch.sh with this
# audit's slice.
#   tools/vg-l0-risk-envelope-sensitivity/launch.sh <unit> <absolute log file> [--wait] -- <command> [args...]
set -euo pipefail
unit=$1; log=$2; shift 2
wait=()
if [ "${1:-}" = "--wait" ]; then wait=(--wait); shift; fi
[ "${1:-}" = "--" ] && shift
systemctl --user set-property --runtime vgl0res.slice MemoryHigh=44G MemoryMax=48G MemorySwapMax=0 2>/dev/null || true
mkdir -p "$(dirname "$log")"
exec systemd-run --user --unit="$unit" --slice=vgl0res.slice --collect "${wait[@]}" \
  -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed -p TimeoutStopSec=120 -p Restart=no \
  -p StandardOutput=append:"$log" -p StandardError=append:"$log" \
  -E PATH="$PATH" -E HOME="$HOME" -E GPU_POLICY_PURPOSE=diagnostic --working-directory=/home/chad/projects/margin-trading "$@"
