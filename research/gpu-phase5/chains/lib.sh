#!/bin/bash
# gpu-phase5 chains: shared helpers. Each benchmark group: group.sh → verify → summarize → gate (fail-fast), then the
# group's job archives and key maps (git-ignored scratch) are deleted once verified (PROTOCOL.md §12).
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
T() { "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning "$@"; }
ts() { date -u +%FT%TZ; }
# bench <group> [KEY=VALUE ...]: one group through every check; exits the chain on any failure
bench() {
  local g=$1; shift
  echo "$(ts) ==== group $g: $*"
  env G="$g" "$@" /bin/bash tools/gpu-phase5/group.sh 2>&1 | grep -v '^Running as unit'
  local st=${PIPESTATUS[0]}
  [ "$st" -eq 0 ] || { echo "$(ts) FAILED group $g (group.sh status $st)"; exit 1; }
  local tool=replay
  grep -q '"tool": "poolbench"' "research/gpu-phase5/results/bench/$g/group.json" && tool=poolbench
  if [ "$tool" = poolbench ]; then
    T tools/gpu-phase5/verify-pool.ts --group "$g" ${AGAINST:+--against "$AGAINST"}
  else
    T --max-old-space-size=12000 tools/gpu-phase5/verify.ts --group "$g"
  fi
  local vs=$?
  T tools/gpu-phase5/summarize.ts --group "$g" || { echo "$(ts) FAILED summary $g"; exit 1; }
  T tools/gpu-phase5/gate.ts --group "$g"
  local gs=$?
  if [ $vs -ne 0 ] || [ $gs -ne 0 ]; then echo "$(ts) STOP: group $g verify $vs gate $gs"; exit 1; fi
  if [ "$tool" = replay ] && [ -z "${KEEP:-}" ]; then
    for r in $(T -e 'const g=require("./research/gpu-phase5/results/bench/'"$g"'/group.json"); console.log(g.runs.join(" "))'); do
      rm -rf "research/gpu-phase5/cache/replay/$r" "research/gpu-phase5/results/raw-large/optimizer/$r"
    done
  fi
  echo "$(ts) ==== group $g passed"
}
