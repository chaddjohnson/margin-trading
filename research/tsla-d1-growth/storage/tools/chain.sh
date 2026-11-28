#!/bin/bash
# Phase 0A chain: the smallest archive first (end-to-end check of the pipeline), then every archive (restartable;
# archives with a z-removed record are skipped), then the read-only post-cleanup verification.
#   chain.sh <repo>
set -u
R=$1
S=$R/research/tsla-d1-growth/storage
T=$S/tools/p5zstd.py
SCR=$R/.cache/tsla-d1-growth/storage-scratch
echo "=== $(date -u +%FT%TZ) first: C19-slice"
python3 -I "$T" compress --repo "$R" --inventory "$S/INVENTORY.json" --actions "$S/ACTIONS.jsonl" --scratch "$SCR" --job C19-slice
rc=$?; [ $rc -eq 0 ] || { echo "STOP: C19-slice exit $rc"; exit $rc; }
grep -q '"event": "z-removed", "ok": true, "archive": "research/vg-l0-n-successor/cache/jobs/C19-slice/archive.sqlite"' "$S/ACTIONS.jsonl" \
  || { echo "STOP: C19-slice was not verified and removed"; exit 3; }
echo "=== $(date -u +%FT%TZ) all archives"
python3 -I "$T" compress --repo "$R" --inventory "$S/INVENTORY.json" --actions "$S/ACTIONS.jsonl" --scratch "$SCR"
rc=$?; [ $rc -eq 0 ] || { echo "STOP: all exit $rc"; exit $rc; }
echo "=== $(date -u +%FT%TZ) final verification"
python3 -I "$T" final --repo "$R" --inventory "$S/INVENTORY.json" --actions "$S/ACTIONS.jsonl" --out "$S/POST_VERIFY.json"
rc=$?
echo "=== $(date -u +%FT%TZ) chain end rc=$rc"
exit $rc
