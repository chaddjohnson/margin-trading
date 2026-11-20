#!/bin/bash
# gpu-phase5 (PROTOCOL.md §3–§5): ONE benchmark group — K independent optimizer jobs started together (a file barrier
# after each job's start-up), each a transient systemd user unit inside gpup5.slice (aggregate MemoryHigh 44G /
# MemoryMax 48G / no swap; per-job MemoryMax so that a runaway job hits its own cap, never a neighbour's), each with its
# own namespace (archive, dataset, records, lock). NON-OFFICIAL (GPU_POLICY_PURPOSE=benchmark). Before the group: the
# safety admission check (tools/gpu-phase5/admit.ts; a refusal is reported, never forced). During it: the system
# monitor. After it: research/gpu-phase5/results/bench/<G>/group.json (configuration, units, exit statuses, times).
#   G=<group> K=<jobs> MODE=<ss|ftw> JOB=<a3:C19:broad1|a2:C19:base|mini> HW=<host workers per job> [B=8192]
#   [STOP=<fresh per job>] [VRAM=<MiB per job, admission>] [RSS=<MiB per job, admission>] [MEMMAX=<GiB per job>]
#   [VB=<per-server VRAM budget MiB; default 28000/K for K ≥ 2, none for K = 1>] [EXTRA="<tool args>"] [TAG=<label>]
#   [TOOL=replay|poolbench (poolbench: JOB is a label, EXTRA gives --door --mix --tasks --rounds)]
#   [GPU_BACKEND_BINARY=<binary> (passed into the job units; default: src/gpu-backend/toolchain.ts)]
#   [ENGINE=<node engine options of the job; default --no-maglev (src/gpu-backend/runtime.ts); ENGINE="" = the
#    configuration the Phase 3 engine was accepted under (V8's Maglev enabled): baselines only]
#   [NODE_EXTRA=<further node options of the job, e.g. --cpu-prof --cpu-prof-dir <dir>>]
#   /bin/bash tools/gpu-phase5/group.sh
set -uo pipefail
cd /home/chad/projects/margin-trading
REPO=$PWD
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
: "${G:?}" "${K:?}" "${MODE:?}" "${JOB:?}" "${HW:?}"
ENGINE=${ENGINE---no-maglev}; NODE_EXTRA=${NODE_EXTRA:-}
TOOL=${TOOL:-replay}; B=${B:-8192}; STOP=${STOP:-}; VRAM=${VRAM:-7000}; RSS=${RSS:-7168}; MEMMAX=${MEMMAX:-11}; EXTRA=${EXTRA:-}; TAG=${TAG:-$G}
if [ -z "${VB+x}" ]; then if [ "$K" -ge 2 ]; then VB=$((28000 / K)); else VB=""; fi; fi
R=$REPO/research/gpu-phase5/results/bench/$G
L=$REPO/research/gpu-phase5/results/logs/$G
BAR=$REPO/research/gpu-phase5/cache/barrier/$G
[ -e "$R/group.json" ] && { echo "group $G already ran ($R/group.json)"; exit 4; }
mkdir -p "$R" "$L"
ts() { date -u +%FT%T.%3NZ; }
T0=$(ts)
echo "$T0 group $G: TOOL=$TOOL K=$K MODE=$MODE JOB=$JOB HW=$HW B=$B STOP=${STOP:-complete} VB=${VB:-none} MEMMAX=${MEMMAX}G EXTRA=$EXTRA ENGINE=${ENGINE:-(maglev enabled)} NODE_EXTRA=$NODE_EXTRA BINARY=${GPU_BACKEND_BINARY:-default}"
systemctl --user set-property --runtime gpup5.slice MemoryHigh=44G MemoryMax=48G MemorySwapMax=0 || { echo "slice limits not set"; exit 5; }
"$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/admit.ts \
  --jobs "$K" --vram-mib "$VRAM" --rss-mib "$RSS" --out "$R/admission.json"
adm=$?
write_group() {
  "$NODE" -e '
    const fs = require("fs"); const [R, G, K, MODE, JOB, HW, B, STOP, VB, MEMMAX, EXTRA, TAG, T0, T1, adm, TOOL, ENGINE, NODE_EXTRA, BINARY] = process.argv.slice(1);
    const st = []; for (let i = 0; i < Number(K); i++) { const f = `${R}/j${i}.status`; st.push(fs.existsSync(f) ? Number(fs.readFileSync(f, "utf8").trim()) : null); }
    fs.writeFileSync(`${R}/group.json`, JSON.stringify({ kind: "gpu-phase5 benchmark group", group: G, tool: TOOL, jobs: Number(K), mode: MODE, job: JOB,
      hostWorkersPerJob: Number(HW), batch: Number(B), stopAfter: STOP ? Number(STOP) : null, vramBudgetMbPerJob: VB ? Number(VB) : null,
      memoryMaxGiBPerJob: Number(MEMMAX), extra: EXTRA, tag: TAG, engineOptions: ENGINE, nodeExtra: NODE_EXTRA, binary: BINARY || null, started: T0, ended: T1, admitted: adm === "0",
      runs: Array.from({ length: Number(K) }, (_, i) => `${G}-j${i}`), exitStatus: st }, null, 1) + "\n");
  ' "$R" "$G" "$K" "$MODE" "$JOB" "$HW" "$B" "$STOP" "$VB" "$MEMMAX" "$EXTRA" "$TAG" "$T0" "$(ts)" "$adm" "$TOOL" "$ENGINE" "$NODE_EXTRA" "${GPU_BACKEND_BINARY:-}"
}
if [ $adm -ne 0 ]; then echo "$(ts) group $G REFUSED by the admission check (see admission.json)"; write_group; exit 3; fi
systemd-run --user --unit="gpup5-mon-$G" --collect -p Restart=no -p StandardOutput=append:"$L/monitor.log" \
  -p StandardError=append:"$L/monitor.log" -E PATH="$PATH" -E HOME="$HOME" --working-directory="$REPO" \
  "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/monitor.ts \
  --out "$R/monitor.jsonl" --stop-file "$R/.stop-monitor" --slice gpup5.slice >/dev/null || { echo "monitor did not start"; exit 6; }
sleep 3
rm -rf "$BAR"; mkdir -p "$BAR"
for ((i = 0; i < K; i++)); do
  if [ "$TOOL" = poolbench ]; then
    args=(--run "$G-j$i" --batch "$B" --host-workers "$HW" --barrier "$BAR" --group "$K" --tag "$TAG")
  else
    lanes="0/1"; [ "$MODE" = ftw ] && lanes="$i/$K"
    args=(--backend gpu --run "$G-j$i" --job "$JOB" --lanes "$lanes" --batch "$B" --linger 30 --host-workers "$HW"
          --barrier "$BAR" --group "$K" --tag "$TAG")
    [ -n "$STOP" ] && args+=(--stop-after "$STOP")
  fi
  [ -n "$VB" ] && args+=(--vram-budget-mb "$VB")
  # shellcheck disable=SC2206
  [ -n "$EXTRA" ] && args+=($EXTRA)
  systemd-run --user --unit="gpup5-$G-j$i" --slice=gpup5.slice --collect \
    -p MemoryHigh=$((MEMMAX - 1))G -p MemoryMax="${MEMMAX}G" -p MemorySwapMax=0 -p KillMode=mixed -p TimeoutStopSec=120 \
    -p Restart=no -p StandardOutput=append:"$L/j$i.log" -p StandardError=append:"$L/j$i.log" \
    -E PATH="$PATH" -E HOME="$HOME" -E GPU_POLICY_PURPOSE=benchmark ${GPU_BACKEND_BINARY:+-E GPU_BACKEND_BINARY="$GPU_BACKEND_BINARY"} \
    --working-directory="$REPO" /bin/bash "$REPO/tools/gpu-phase5/job.sh" "$R/j$i.status" "$NODE" $ENGINE $NODE_EXTRA --expose-gc --max-old-space-size=20000 \
    --experimental-transform-types --disable-warning=ExperimentalWarning "tools/gpu-phase5/$TOOL.ts" "${args[@]}" >/dev/null \
    || { echo "unit gpup5-$G-j$i did not start"; touch "$R/.stop-monitor"; write_group; exit 6; }
done
echo "$(ts) group $G: $K unit(s) started"
deadline=$(( $(date +%s) + ${TIMEOUT_S:-10800} ))
while :; do
  active=0
  for ((i = 0; i < K; i++)); do systemctl --user is-active --quiet "gpup5-$G-j$i" && active=$((active + 1)); done
  [ $active -eq 0 ] && break
  if [ "$(date +%s)" -gt "$deadline" ]; then
    echo "$(ts) group $G: timeout — stopping its units"
    for ((i = 0; i < K; i++)); do systemctl --user stop "gpup5-$G-j$i" 2>/dev/null; done
    break
  fi
  sleep 2
done
sleep 2
touch "$R/.stop-monitor"
for _ in $(seq 1 30); do systemctl --user is-active --quiet "gpup5-mon-$G" || break; sleep 1; done
rm -f "$R/.stop-monitor"
write_group
echo "$(ts) group $G done: statuses $(for ((i = 0; i < K; i++)); do printf '%s ' "$(cat "$R/j$i.status" 2>/dev/null || echo none)"; done)"
