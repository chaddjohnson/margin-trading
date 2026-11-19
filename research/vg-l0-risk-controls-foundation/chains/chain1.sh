#!/bin/bash
# The real-data gate stages, one contained unit at a time, fail-fast (run from the repository root).
cd "$(dirname "$0")/../../.." || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
LOGS="$PWD/research/vg-l0-risk-controls-foundation/results/logs"
mkdir -p "$LOGS"
for stage in "$@"; do
  echo "start [$stage] $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  systemd-run --user --unit="vgrcf-$stage" --slice=vgrcf.slice --collect --wait \
    -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed \
    --working-directory="$PWD" -p StandardOutput=append:"$LOGS/$stage.log" -p StandardError=append:"$LOGS/$stage.log" \
    "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning \
    tools/vg-l0-risk-controls-foundation/gates.ts "$stage"
  status=$?
  echo "end [$stage] status $status $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [ "$status" -ne 0 ]; then echo "FAILED [$stage]"; exit "$status"; fi
done
