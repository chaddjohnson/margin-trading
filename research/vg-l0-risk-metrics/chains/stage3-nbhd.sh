#!/bin/bash
# Stage 3 neighbourhoods (PROTOCOL.md §8 S3): each key candidate's sealed C24 selection family, regenerated and replayed.
# Run from the repository root as its own systemd unit; fail-fast per step. Usage: stage3-nbhd.sh <key>... (door D24 unless key ends with @FULL)
R=/home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
cd "$R" || exit 2
for spec in "$@"; do
  key="${spec%@*}"; door="D24"; [[ "$spec" == *@FULL ]] && door="FULL"
  echo "[$(date -u +%FT%TZ)] start nbhd $key $door"
  "$NODE" --max-old-space-size=16384 --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-metrics/audit.ts nbhd "$key" "$door"
  st=$?
  echo "[$(date -u +%FT%TZ)] end [$key $door] status $st"
  if [ $st -ne 0 ]; then echo "FAILED $key $door"; exit $st; fi
done
echo "[$(date -u +%FT%TZ)] chain done"
