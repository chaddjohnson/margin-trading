#!/bin/bash
# gpu-phase4: runs a chain as a transient systemd user unit OUTSIDE the job slice (the chain itself only launches and
# checks; its jobs run in gpup4.slice through group.sh). Like tools/gpu-phase3/launch.sh.
#   tools/gpu-phase4/launch.sh <unit> <absolute log file> [--wait] -- <command> [args...]
set -euo pipefail
unit=$1; log=$2; shift 2
wait=()
if [ "${1:-}" = "--wait" ]; then wait=(--wait); shift; fi
[ "${1:-}" = "--" ] && shift
mkdir -p "$(dirname "$log")"
exec systemd-run --user --unit="$unit" --collect "${wait[@]}" -p Restart=no -p KillMode=mixed -p TimeoutStopSec=300 \
  -p StandardOutput=append:"$log" -p StandardError=append:"$log" \
  -E PATH="$PATH" -E HOME="$HOME" -E GPUP4_SELF_UNIT="$unit.service" --working-directory=/home/chad/projects/margin-trading "$@"
