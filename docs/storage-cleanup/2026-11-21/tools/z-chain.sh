#!/bin/bash
# Z chain: per group, the representative job first (with the isolated restore test), then every other job.
#   z-chain.sh <repo> <manifest> <actions> <group> <representative job> [<group> <job> ...]
# Each zcompress.py call is restartable (ACTIONS.jsonl); the chain stops at the first failing call.
set -u
R=$1; M=$2; A=$3; shift 3
T=$R/docs/storage-cleanup/2026-11-21/tools/zcompress.py
while [ $# -ge 2 ]; do
  G=$1; J=$2; shift 2
  echo "=== $(date -u +%FT%TZ) $G representative $J"
  python3 -I "$T" --repo "$R" --manifest "$M" --group "$G" --actions "$A" --job "$J" --restore-test "$R/.cache/storage-cleanup-2026-11-21/scratch/restore-$G"
  rc=$?; [ $rc -eq 0 ] || { echo "STOP: $G representative exit $rc"; exit $rc; }
  echo "=== $(date -u +%FT%TZ) $G all jobs"
  python3 -I "$T" --repo "$R" --manifest "$M" --group "$G" --actions "$A"
  rc=$?; [ $rc -eq 0 ] || { echo "STOP: $G exit $rc"; exit $rc; }
done
echo "=== $(date -u +%FT%TZ) chain complete"
