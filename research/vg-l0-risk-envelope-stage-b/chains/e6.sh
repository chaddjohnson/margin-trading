#!/bin/bash
# Engineering gate E6 of Stage B: the live official gate opens on D19, D21 and D24 for this study on the committed lineage.
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
E=$R/research/vg-l0-risk-envelope-stage-b/results/engineering/E6
cd $R || exit 1
mkdir -p $E
for D in D19 D21 D24; do
  echo "=== $(date -u +%FT%TZ) official-preflight $D"
  GPU_POLICY_PURPOSE=official-optimization $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-stage-b --door $D > $E/official-preflight-$D.txt 2>&1
  s=$?; echo "exit $s" >> $E/official-preflight-$D.txt
  grep -q 'GATE OPEN' $E/official-preflight-$D.txt || { echo "FAILED: E6 $D"; exit 1; }
done
echo "=== $(date -u +%FT%TZ) E6 COMPLETE"
