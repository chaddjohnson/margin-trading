#!/bin/bash
# Priority 4 report-only analyses after the last fold (purpose diagnostic; CPU reference; never official evidence; each
# reads only doors that doors.ts allows for diagnostics; selects nothing). Run from anywhere, after "FOLD C24 COMPLETE"
# and with no fold chain running (analyze writes results/analysis/summary.json).
#   /bin/bash tools/vg-l0-staged-stop/post.sh
set -uo pipefail
cd /home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
D=research/vg-l0-staged-stop/reports/diagnostics; T=research/vg-l0-staged-stop/reports/tables
NODE=($N --no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288)
step() { echo "=== $(date -u +%FT%TZ) $*"; "$@"; local s=$?; [ $s -eq 0 ] || { echo "=== FAILED [$s]: $*"; exit $s; }; }
export GPU_POLICY_PURPOSE=diagnostic
step npm run -s vg-l0ss-tools -- analyze
step npm run -s vg-l0ss-tools -- pairs selection --cutoff C24 --out $D/pairs-selection-C24.json
step npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-selection-C24.json --door D24 --out $D/selection-C24-D24.json
step "${NODE[@]}" tools/vg-l0-staged-stop/mechanism.ts --in $D/selection-C24-D24.json --out $T/selection-C24-mechanism.md --group none
step npm run -s vg-l0ss-tools -- pairs decomposition --out $D/pairs-decomposition.json
step npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-decomposition.json --door D24 --out $D/decomposition-D24.json
step npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-decomposition.json --door FULL --out $D/decomposition-FULL.json
step "${NODE[@]}" tools/vg-l0-staged-stop/mechanism.ts --in $D/decomposition-D24.json --out $T/decomposition-D24-mechanism.md --group none
step "${NODE[@]}" tools/vg-l0-staged-stop/mechanism.ts --in $D/decomposition-FULL.json --out $T/decomposition-FULL-mechanism.md --group none
step "${NODE[@]}" src/gpu-backend/legacyRunner.ts vg-l0ss-lots tools/vg-l0-staged-stop/lots.ts --record C24 --door FULL --out $D/lots-C24-FULL.json --md $T/lots-C24-FULL.md
step "${NODE[@]}" tools/vg-l0-staged-stop/tails.ts --out $T/tails.md --json $D/tails.json
step "${NODE[@]}" tools/vg-l0-staged-stop/census.ts --out $T/census-population.md
echo "=== $(date -u +%FT%TZ) POST COMPLETE"
