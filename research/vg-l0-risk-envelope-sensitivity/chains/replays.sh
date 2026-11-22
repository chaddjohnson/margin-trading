#!/bin/bash
# RES-A 1.0.0 stage S3: the predeclared bounded CPU replays (PROTOCOL.md §5), sequential and fail-fast, run as one unit:
#   tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-replays <log> -- /bin/bash research/vg-l0-risk-envelope-sensitivity/chains/replays.sh
set -euo pipefail
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
run() { echo "[$(date -u +%FT%TZ)] start $*"; GPU_POLICY_PURPOSE=diagnostic "$NODE" --no-maglev --max-old-space-size=8192 --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-sensitivity/replay.ts "$@"; echo "[$(date -u +%FT%TZ)] end $*"; }
run g3 --cutoff C24
run g1 --cutoff C21
run g1 --cutoff C24
run g2 --cutoff C21
run g2 --cutoff C24
echo "[$(date -u +%FT%TZ)] chain complete"
