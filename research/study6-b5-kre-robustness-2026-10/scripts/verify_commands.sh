#!/usr/bin/env bash
# Runs every user-facing command of RUN_COMMANDS.md that is safe to repeat (read-only or writing only under
# evaluations/), records its output and exit status under results/logs/commands/, and writes index.txt.
# Usage (from the repository root): bash research/study6-b5-kre-robustness-2026-10/scripts/verify_commands.sh
set -u
root="$(git rev-parse --show-toplevel)"
cd "$root"
export PATH="$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH"
out="research/study6-b5-kre-robustness-2026-10/results/logs/commands"
mkdir -p "$out"
index="$out/index.txt"
: > "$index"
n=0

run() {
  n=$((n + 1))
  local name
  name=$(printf '%02d' "$n")
  local started
  started=$(date -u +%FT%TZ)
  "$@" > "$out/$name.log" 2>&1
  local status=$?
  printf '%s  exit %s  %s  %s\n' "$name" "$status" "$started" "$*" | tee -a "$index"
}

run npm run pools -- fixed B5 --end 2026-10-13 --out evaluations/study6/commands/B5-fixed-2026-10-13
run npm run pools -- fixed B5 --out evaluations/study6/commands/B5-fixed-2026-10-29
run npm run study6 -- verify-records
run npm run study6 -- nbhd B5
run npm run study6 -- nbhd B5 --window W13
run npm run study6 -- trace B5
run npm run study6 -- pool fixed S6-K3
run npm run study6 -- pool fixed S6-J1 --end 2026-10-13 --out evaluations/study6/commands/S6-J1-fixed-2026-10-13
run npm run study6 -- pool fixed S6-O-PA-S
run npm run study6 -- pool fixed S6-O-ME-lowDd
run npm run study6 -- nbhd S6-J1
run npm run study6 -- nbhd S6-O-PA-S
run npm run study6 -- trace S6-K3
run npm run study6 -- trace S6-J1
run node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study6-b5-kre-robustness/tests/study6.test.ts src/pools/tests/pools.test.ts src/pools/tests/forward.test.ts
echo "commands: $n (see $index)"
