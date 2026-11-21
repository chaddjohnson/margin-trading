#!/bin/bash
# gpu-phase6 amendment A2: the bounded re-run of the process audit — the mini schedule on the GPU and on the CPU arm
# (12 forked workers) at the same time, every Node process of their units sampled each second with the user-unit field.
#   tools/gpu-phase6/launch-slice.sh p6chain-audit <abs log> -- /bin/bash research/gpu-phase6/chains/process-audit.sh
cd /home/chad/projects/margin-trading || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning"
R=research/gpu-phase6/results
LOG=/home/chad/projects/margin-trading/$R/logs/campaign
S=$R/runtime/process-samples-a2.txt
mkdir -p "$LOG" "$R/runtime"
say() { echo "$(date -u +%FT%TZ) $*"; }
( while :; do ps -eo pid=,ppid=,uunit:60=,args= | awk '$3 ~ /^gpup6-/ && $4 ~ /node$/' | sed "s/^/$(date -u +%FT%TZ) /"; sleep 1; done ) >> "$S" &
SAMPLER=$!
trap 'kill $SAMPLER 2>/dev/null' EXIT
JOB() { echo /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=12000 tools/gpu-phase6/job.ts "$@"; }
tools/gpu-phase6/launch-slice.sh gpup6-a2-gpu "$LOG/A2-audit-mini-gpu.txt" -- $(JOB --job mini --job-name a2-audit-mini-gpu --host-workers 8 --batch 8192) || exit 1
tools/gpu-phase6/launch-slice.sh gpup6-a2-cpu "$LOG/A2-audit-mini-cpu.txt" -- $(JOB --job mini --job-name a2-audit-mini-cpu --backend cpu --workers 12) || exit 1
sleep 3
while [ "$(systemctl --user is-active gpup6-a2-gpu gpup6-a2-cpu 2>/dev/null | grep -c '^active$')" -gt 0 ]; do sleep 5; done
for j in a2-audit-mini-gpu a2-audit-mini-cpu; do [ -f "$R/jobs/$j/complete.json" ] || { say "FAILED: $j did not complete"; exit 1; }; done
for j in a2-audit-mini-gpu a2-audit-mini-cpu; do
  "$NODE" $TS tools/gpu-phase6/compare.ts arms c1-ref-mini $j --out "$R/compare/a2-$j-vs-ref.json" > "$LOG/compare-a2-$j.txt" 2>&1 || { say "FAILED: compare $j"; exit 1; }
  say "compare [$j] $(tail -1 "$LOG/compare-a2-$j.txt")"
done
say "process audit re-run complete: $(wc -l < "$S") samples"
