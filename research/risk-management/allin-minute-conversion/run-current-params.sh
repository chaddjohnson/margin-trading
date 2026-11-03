#!/usr/bin/env bash
# Runs and validates the minute allIn with its current re-entry parameters (1% material loss, 2% lower
# re-entry, 38% reset), writing to results/current-params so the original-parameter study is untouched:
#   bash research/risk-management/allin-minute-conversion/run-current-params.sh
set -euo pipefail

R=research/risk-management/allin-minute-conversion
OUT=$R/results/current-params
MINUTE=data/VGT/VGT-2016-2025-1-minute.csv
NODE=(node --experimental-transform-types --disable-warning=ExperimentalWarning)

mkdir -p "$OUT"
"${NODE[@]}" src/app.ts allIn VGT 2016-10-07 2025-10-13 "$MINUTE" "$OUT/minute-common" > "$OUT/minute-common.txt"
"${NODE[@]}" src/app.ts allIn VGT - - "$MINUTE" "$OUT/minute-fullfile" > "$OUT/minute-fullfile.txt"
for run in minute-common minute-fullfile; do
  "${NODE[@]}" $R/scripts/validate.ts "$MINUTE" "$OUT/$run" "$OUT/validation-$run.json" stop 0.01 0.02 0.38
done
