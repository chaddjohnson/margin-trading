#!/bin/bash
# Containment (PROTOCOL.md §10; standard §6.2): runs one `npm run opa -- <args>` stage as a transient systemd user unit
# inside opa.slice, whose aggregate limits (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) are re-applied before every
# launch; the unit carries the same limits, KillMode=mixed, Restart=no. Claude and tmux stay outside. One unit at a time.
#
#   bash research/optimization-process-audit/chains/unit.sh <unit-name> [--wait] <opa args...>
R=/home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
LOGS=$R/research/optimization-process-audit/results/logs
UNIT="$1"; shift
WAIT=""
if [ "${1:-}" = "--wait" ]; then WAIT="--wait"; shift; fi
mkdir -p "$LOGS"
systemctl --user set-property --runtime opa.slice MemoryHigh=44G MemoryMax=48G MemorySwapMax=0 || { echo "slice limits not set"; exit 1; }
systemd-run --user --unit="$UNIT" --slice=opa.slice --description="optimization-process-audit $*" --collect \
  -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed -p TimeoutStopSec=120 -p Restart=no \
  -p StandardOutput=append:"$LOGS/$UNIT.log" -p StandardError=append:"$LOGS/$UNIT.log" \
  -E PATH="$(dirname "$NODE"):/usr/bin:/bin" --working-directory="$R" $WAIT \
  "$NODE" --expose-gc --max-old-space-size=8192 --experimental-transform-types --disable-warning=ExperimentalWarning \
  "$R/src/optimization-process-audit/main.ts" "$@"
