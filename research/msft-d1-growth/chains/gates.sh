#!/bin/bash
# P9-MSFT engineering gates E4, E5, E6 and the pilot (non-official), each as its own contained unit, fail-fast.
#   /bin/bash research/msft-d1-growth/chains/gates.sh
R=/home/chad/projects/margin-trading
cd $R || exit 1
NPM=$(command -v npm)
L=$R/tools/msft-d1-growth/launch.sh
LOG=$R/research/msft-d1-growth/cache/logs
mkdir -p $LOG
for g in e4 e5 e6; do
  echo "=== $(date -u +%FT%TZ) begin $g"
  $L msft9-$g $LOG/$g.log --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test $NPM run msft9-eng -- $g
  s=$?
  echo "=== $(date -u +%FT%TZ) end [$s] $g: $(tail -1 $LOG/$g.log | cut -c1-400)"
  [ $s -eq 0 ] || { echo "FAILED: $g"; exit 1; }
done
echo "=== $(date -u +%FT%TZ) begin pilot"
$L msft9-pilot $LOG/pilot.log --wait -- /usr/bin/env GPU_POLICY_PURPOSE=benchmark $NPM run msft9-eng -- pilot --step lanes
s=$?
echo "=== $(date -u +%FT%TZ) end [$s] pilot lanes"
[ $s -eq 0 ] || { echo "FAILED: pilot"; exit 1; }
GPU_POLICY_PURPOSE=benchmark $NPM run msft9-eng -- pilot --step summary 2>&1 | tail -1
echo "=== $(date -u +%FT%TZ) GATES COMPLETE"
