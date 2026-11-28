#!/bin/bash
# Minimum checks after each cleanup group: Phase 6 integrity (tracked research files, 22 preflights, seal-protection
# counts, forward freeze, GPU digests) and the independent acceptance verifier with the out-of-repository pin.
#   after-group.sh <repo> <label>
R=$1; L=$2; O=$R/docs/storage-cleanup/2026-11-21/verify/post; mkdir -p "$O"
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
cd "$R" || exit 2
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase6/integrity.ts --out "$O/integrity-after-$L.json" > "$O/integrity-after-$L.txt" 2>&1; a=$?
tools/gpu-backend/verify-acceptance.sh --expect-record-sha256 3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3 > "$O/verify-after-$L.txt" 2>&1; b=$?
echo "after $L: integrity exit=$a ($(tail -1 "$O/integrity-after-$L.txt")); verifier exit=$b ($(tail -1 "$O/verify-after-$L.txt"))"
[ $a -eq 0 ] && [ $b -eq 0 ]
