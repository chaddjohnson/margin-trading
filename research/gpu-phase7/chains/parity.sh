#!/bin/bash
# gpu-phase7 parity campaign (a copy of research/gpu-phase5/chains/parity.sh with this study's tools, binary gb7 and fresh seeds; gate A1; Phase 2's campaign, chains/parity.sh of research/gpu-phase2, re-run on the FINAL
# binary with the GPU side going through the parallel host path, this study's own seeds): every door/window, ≥ 100,000
# seeded random Assignment 3 genomes, every Growth structural value, the reference identities, branch-heavy D1 designs,
# neighbourhoods, every option set and the adversarial fixtures; determinism adds the host-worker counts 0, 1, 3, 12 and
# a reversed input order. Each run is its own sub-unit; the chain stops at the first failure (fail-fast).
#   tools/gpu-phase7/launch-slice.sh p7chain-parity <abs log> -- /bin/bash research/gpu-phase7/chains/parity.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=${PARITY_OUT:-research/gpu-phase7/results/parity/final}
LOG=${PARITY_LOG:-/home/chad/projects/margin-trading/research/gpu-phase7/results/logs/parity}
HW=${HW:-8}
mkdir -p "$OUT" "$LOG"
n=0
P() { # P <name> <args...>
  local name=$1; shift
  n=$((n+1))
  echo "$(date -u +%FT%TZ) start [$name]"
  tools/gpu-phase7/launch-slice.sh "gpup7-par-$n-$name" "$LOG/$name.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" --no-maglev --expose-gc --max-old-space-size=14000 \
    --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase7/parity.ts --host-workers "$HW" "$@" --out "$OUT/$name.json"
  local rc=$?
  if [ $rc -ne 0 ]; then echo "$(date -u +%FT%TZ) FAILED [$name] rc=$rc"; exit 1; fi
  echo "$(date -u +%FT%TZ) end [$name]"
}
DET="--batches 1,7,13,16,32,50,64,128 --determinism-subset 256 --worker-counts 0,1,3,12"
# references, strata, branch-heavy designs and neighbourhoods on the main doors (records and detailed records)
P D24-core      --door D24  --options base --refs --strata 8 --branch --neighbours 32 --random 2000 --label A0 $DET
P FULL-core     --door FULL --options base --refs --strata 4 --branch --neighbours 32 --random 2000 --label A0 $DET
P D24-detail    --door D24  --options base --refs --strata 4 --fine 3000 --label A1 --detail --risk $DET
P FULL-detail   --door FULL --options base --refs --strata 2 --fine 2000 --label A1 --detail --risk
# the bulk of the random genomes (coarse and fine grids), every cutoff door
P D24-bulk      --door D24  --options base --random 26000 --label A2 --from 0
P D24-bulk-fine --door D24  --options base --fine 8000 --label A3
P FULL-bulk     --door FULL --options base --random 12000 --label A2
P D19-bulk      --door D19  --options base --refs --random 9000 --fine 1000 --label A4 --strata 2
P D21-bulk      --door D21  --options base --refs --random 9000 --fine 1000 --label A5 --strata 2
P D23-bulk      --door D23  --options base --refs --random 9000 --fine 1000 --label A6 --strata 2
# regime windows and episodes
for w in W-QUIET W-CRASH W-BEAR W-TREND E-2020 E-2022 E-2025; do
  P "$w" --door "$w" --options base --refs --random 3000 --strata 2 --label "A7-$w" --detail --risk
done
# every option set (D24), alone and all at once
for o in cost0 cost10 cost20 rate14 slip25 nextopen native fund whole blackout periods tie ggdx d1only gonly vgtonly all; do
  P "D24-$o" --door D24 --options "$o" --refs --random 1500 --strata 2 --label "O-$o" --detail --risk
done
P D24-growth-first --door D24 --options base --growth-first --refs --random 1500 --strata 2 --label O-gfirst --detail --risk
for o in nextopen periods all; do
  P "FULL-$o" --door FULL --options "$o" --refs --random 1000 --strata 1 --label "OF-$o" --detail --risk
done
# adversarial synthetic doors (this study's seeds)
for s in 0 1 2 3 4 5 6 7; do
  P "S$s-base" --fixture "$s" --sessions 420 --options base --random 400 --strata 2 --label "S-$s" --detail --risk $DET
  P "S$s-all"  --fixture "$s" --sessions 420 --options all  --random 300 --strata 1 --label "SA-$s" --detail --risk
done
echo "$(date -u +%FT%TZ) chain complete"
