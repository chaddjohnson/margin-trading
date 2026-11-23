#!/bin/bash
# gpu-phase8 parity campaign (gate A1): Phase 7's campaign (research/gpu-phase7/chains/parity.sh — itself Phase 5's) with
# this study's tools, the final binary gb8 and this study's seeds, plus the staged-stop strata (staged-stop@1, protocol
# v3): every door/window, ≥ 100,000 seeded random Assignment 3 genomes, every Growth structural value, the reference
# identities, branch-heavy D1 designs, neighbourhoods, every option set, the adversarial fixtures S0–S7 and the six
# exact-threshold fixtures T; the staged strata `mixed` (the 8 ON/OFF patterns of D1·GDX, D1·VGT and Growth·VGT equally
# often, one book in four at a boundary value), `edges` (every ON book at a boundary) and `all`, and OFF runs (`none`) so
# that ≥ 20,000 subjects check exact OFF parity on the new binary. On FULL-based doors the reference identities stay OFF.
# Determinism adds the host-worker counts 0, 1, 3, 12 and a reversed input order. Each run is its own sub-unit; the
# chain stops at the first failure (fail-fast).
#   tools/gpu-phase8/launch-slice.sh p8chain-parity <abs log> -- /bin/bash research/gpu-phase8/chains/parity.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=${PARITY_OUT:-research/gpu-phase8/results/parity/final}
LOG=${PARITY_LOG:-/home/chad/projects/margin-trading/research/gpu-phase8/results/logs/parity}
HW=${HW:-8}
mkdir -p "$OUT" "$LOG"
n=0
P() { # P <name> <args...>
  local name=$1; shift
  n=$((n+1))
  echo "$(date -u +%FT%TZ) start [$name]"
  tools/gpu-phase8/launch-slice.sh "gpup8-par-$n-$name" "$LOG/$name.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" --no-maglev --expose-gc --max-old-space-size=14000 \
    --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase8/parity.ts --host-workers "$HW" "$@" --out "$OUT/$name.json"
  local rc=$?
  if [ $rc -ne 0 ]; then echo "$(date -u +%FT%TZ) FAILED [$name] rc=$rc"; exit 1; fi
  echo "$(date -u +%FT%TZ) end [$name]"
}
DET="--batches 1,7,13,16,32,50,64,128 --determinism-subset 256 --worker-counts 0,1,3,12"
# the exact-threshold fixtures T (staged-stop@1 edges on the device: threshold equality and one ulp below, the entry
# session, placement, a later gap, an interest lapse; four option sets each)
for t in T-threshold-at T-threshold-below T-entry-session T-placement T-gap-later T-interest-lapse; do
  P "$t" --staged-fixture "$t" --label "T-$t" --detail --risk
done
# references, strata, branch-heavy designs and neighbourhoods on the main doors: OFF (exact OFF parity of the new binary)
P D24-core      --door D24  --options base --refs --strata 8 --branch --neighbours 32 --random 2000 --label A0 --staged none $DET
P FULL-core     --door FULL --options base --refs --strata 4 --branch --neighbours 32 --random 2000 --label A0 --staged none $DET
# the same sets with the staged strata (references ON only on the development doors)
P D24-core-st   --door D24  --options base --refs --strata 8 --branch --neighbours 32 --random 2000 --label A0S --staged mixed $DET
P D24-detail    --door D24  --options base --refs --strata 4 --fine 3000 --label A1 --detail --risk --staged mixed $DET
P FULL-detail   --door FULL --options base --refs --strata 2 --fine 2000 --label A1 --detail --risk --staged mixed
# the bulk of the random genomes (coarse and fine grids), every cutoff door
P D24-bulk      --door D24  --options base --random 26000 --label A2 --from 0 --staged mixed
P D24-bulk-fine --door D24  --options base --fine 8000 --label A3 --staged edges
P D24-bulk-off  --door D24  --options base --random 8000 --label A2X --from 0 --staged none
P FULL-bulk     --door FULL --options base --random 12000 --label A2 --staged mixed
P D19-bulk      --door D19  --options base --refs --random 9000 --fine 1000 --label A4 --strata 2 --staged mixed
P D21-bulk      --door D21  --options base --refs --random 9000 --fine 1000 --label A5 --strata 2 --staged mixed
P D23-bulk      --door D23  --options base --refs --random 9000 --fine 1000 --label A6 --strata 2 --staged mixed
P D21-bulk-off  --door D21  --options base --random 4000 --label A5X --staged none
# regime windows and episodes
for w in W-QUIET W-CRASH W-BEAR W-TREND E-2020 E-2022 E-2025; do
  P "$w" --door "$w" --options base --refs --random 3000 --strata 2 --label "A7-$w" --detail --risk --staged mixed
done
# every option set (D24), alone and all at once, with the staged strata
for o in cost0 cost10 cost20 rate14 slip25 nextopen native fund whole blackout periods tie ggdx d1only gonly vgtonly all; do
  P "D24-$o" --door D24 --options "$o" --refs --random 1500 --strata 2 --label "O-$o" --detail --risk --staged mixed
done
P D24-growth-first --door D24 --options base --growth-first --refs --random 1500 --strata 2 --label O-gfirst --detail --risk --staged all
for o in nextopen periods all; do
  P "FULL-$o" --door FULL --options "$o" --refs --random 1000 --strata 1 --label "OF-$o" --detail --risk --staged mixed
done
# adversarial synthetic doors (this study's seeds): staged mixed on the base options, every staged book ON with all options
for s in 0 1 2 3 4 5 6 7; do
  P "S$s-base" --fixture "$s" --sessions 420 --options base --random 400 --strata 2 --label "S-$s" --detail --risk --staged mixed $DET
  P "S$s-all"  --fixture "$s" --sessions 420 --options all  --random 300 --strata 1 --label "SA-$s" --detail --risk --staged all
done
echo "$(date -u +%FT%TZ) chain complete"
