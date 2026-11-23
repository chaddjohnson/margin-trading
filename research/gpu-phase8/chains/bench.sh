#!/bin/bash
# gpu-phase8: the pilot-shaped throughput benchmark (NON-OFFICIAL, purpose benchmark; after the record). 8-lane slices
# (lanes 0/8) of Assignment 3's C21 and C24 broad1 searches with the risk envelope requested on every evaluation — the
# pilot's job shape (8 lanes per cutoff job, batch 8,192, 8 host workers) — alone, then both at once (Mode A). Nothing of
# the pilot runs; timings select nothing. Fail-fast. Never edit while it runs.
#   tools/gpu-phase8/launch-slice.sh p8chain-bench <abs log> -- /bin/bash research/gpu-phase8/chains/bench.sh
cd /home/chad/projects/margin-trading || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning"
LOG=/home/chad/projects/margin-trading/research/gpu-phase8/results/logs/bench
mkdir -p "$LOG"
say() { echo "$(date -u +%FT%TZ) $*"; }
fail() { say "FAILED: $*"; exit 1; }
J() { echo /usr/bin/env GPU_POLICY_PURPOSE=benchmark "$NODE" $TS --max-old-space-size=12000 tools/gpu-phase8/job.ts --job "a3:$1:broad1" --lanes 0/8 --risk --job-name "$2" --host-workers 8 --batch 8192; }
for c in C21 C24; do
  say "start bench-$c-risk-l8"
  tools/gpu-phase8/launch-slice.sh "gpup8-bench-$c" "$LOG/bench-$c.txt" --wait -- $(J $c bench-$c-risk-l8) || fail "bench-$c"
  say "end bench-$c-risk-l8"
done
say "start concurrent pair"
tools/gpu-phase8/launch-slice.sh gpup8-bench-C21c "$LOG/bench-C21-conc.txt" --wait -- $(J C21 bench-C21-risk-l8-conc) & a=$!
tools/gpu-phase8/launch-slice.sh gpup8-bench-C24c "$LOG/bench-C24-conc.txt" --wait -- $(J C24 bench-C24-risk-l8-conc) & b=$!
wait $a; ra=$?; wait $b; rb=$?
[ $ra -eq 0 ] && [ $rb -eq 0 ] || fail "concurrent pair rc=$ra/$rb"
say "chain bench complete"
