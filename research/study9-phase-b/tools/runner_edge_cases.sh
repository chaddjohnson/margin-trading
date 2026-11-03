#!/usr/bin/env bash
# Study 9 Phase B runner acceptance checks (execution tooling only; nothing here is sealed or selects anything).
# Usage (repository root): research/study9-phase-b/tools/runner_edge_cases.sh <OUT_ROOT>
#   OUT_ROOT: a new directory under evaluations/study9b-runs/ (git-ignored) for the run outputs.
# Every case prints its command, its exit status and the runner's summary lines; refusals must exit non-zero.
set -u
cd "$(dirname "$0")/../../.." || exit 1
OUT_ROOT=${1:?usage: runner_edge_cases.sh <OUT_ROOT>}
[ -e "$OUT_ROOT" ] && { echo "refusing: $OUT_ROOT exists"; exit 1; }
mkdir -p "$OUT_ROOT/logs"
RUN="node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 src/study9b-runners/main.ts"

case_() {
  local name=$1 expect=$2
  shift 2
  echo "=== $name (expect $expect) $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "\$ $RUN $*   (= npm run study9b-run -- $*)"
  $RUN "$@" > "$OUT_ROOT/logs/$name.log" 2>&1
  local status=$?
  if [ $status -ne 0 ]; then head -5 "$OUT_ROOT/logs/$name.log"; fi
  grep -iE "reconciliation|LATER LOCAL|COMPARATOR|refus|error:|cost|RESEARCH ONLY|PASS|FAIL|not applicable" "$OUT_ROOT/logs/$name.log" | head -40
  echo "exit $status"
  if [ "$expect" = refuse ] && [ $status -eq 0 ]; then echo "UNEXPECTED: accepted"; fi
  if [ "$expect" = ok ] && [ $status -ne 0 ]; then echo "UNEXPECTED: failed"; fi
  echo
}

echo "node $(node --version); HEAD $(git rev-parse HEAD); started $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo
case_ future-date refuse run s9b-nominee --end 2026-11-02 --out "$OUT_ROOT/future"
case_ invalid-date refuse run s9b-nominee --end 2026-02-30 --out "$OUT_ROOT/invalid"
case_ unknown-member refuse run s9b-g4-ilf-7 --out "$OUT_ROOT/unknown"
case_ empty-role refuse run s9b-n3-edv-extra2 --out "$OUT_ROOT/empty"
case_ best-all-failed refuse run s9b-n3-edv-best --out "$OUT_ROOT/best-all-failed"
case_ sealed-end ok run s9b-nominee --end 2026-10-29 --out "$OUT_ROOT/nominee-2026-10-29"
case_ duplicate-out refuse run s9b-nominee --end 2026-10-29 --out "$OUT_ROOT/nominee-2026-10-29"
case_ default-end ok run s9b-nominee --out "$OUT_ROOT/nominee-default"
case_ cost-10 ok run s9b-nominee --end 2026-10-29 --cost-bps 10 --out "$OUT_ROOT/nominee-10bps"
case_ end-2024 ok run s9b-vg3-iwm-profit --end 2024-12-31 --out "$OUT_ROOT/vg3-iwm-profit-2024"
case_ comparator ok run s8-vg-balanced --end 2026-10-29 --out "$OUT_ROOT/s8-vg-balanced-2026-10-29"
case_ compare-all ok compare --all --out "$OUT_ROOT/compare-all"
echo "finished $(date -u +%Y-%m-%dT%H:%M:%SZ)"
