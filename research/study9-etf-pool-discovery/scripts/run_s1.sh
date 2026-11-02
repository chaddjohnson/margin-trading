#!/usr/bin/env bash
# Study 9 S1 in parallel: N worker processes, the 61 eligible ETFs dealt round-robin (each worker runs
# `npm run study9 -- s1 <its symbols>`; a finished ETF's record is never recomputed, so a rerun resumes).
#   research/study9-etf-pool-discovery/scripts/run_s1.sh [N=8]
set -euo pipefail
R=/home/chad/projects/margin-trading
L=$R/research/study9-etf-pool-discovery/results/logs/s1
N=${1:-8}
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
mkdir -p "$L"
mapfile -t SYMBOLS < <(python3 -c "import json; print('\n'.join(json.load(open('$R/research/study9-etf-pool-discovery/results/s0/symbols.json'))['eligible']))")
for ((w = 0; w < N; w++)); do
  GROUP=()
  for ((i = w; i < ${#SYMBOLS[@]}; i += N)); do GROUP+=("${SYMBOLS[$i]}"); done
  (cd "$R" && npm run study9 -- s1 "${GROUP[@]}" > "$L/worker-$w.log" 2>&1; echo "exit $?" >> "$L/worker-$w.log") &
  echo "worker $w pid $! : ${GROUP[*]}"
done
wait
grep -h "^exit" "$L"/worker-*.log | sort | uniq -c
