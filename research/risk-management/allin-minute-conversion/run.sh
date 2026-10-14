#!/usr/bin/env bash
# Reproduces every run in this study from the repository root:
#   bash research/risk-management/allin-minute-conversion/run.sh
set -euo pipefail

R=research/risk-management/allin-minute-conversion
RESULTS=$R/results
MINUTE=data/VGT/VGT-2016-2025-1-minute.csv
DAILY=data/VGT/VGT-2016-2026.csv
START=2016-10-07 # first session of the daily file
END=2025-10-13   # last session of the minute file
NODE=(node --experimental-transform-types --disable-warning=ExperimentalWarning)
# The frozen original daily implementation (git HEAD at the start of this study), run through src/app.ts.
ORIGINAL=../../$R/original/allIn.daily

mkdir -p "$RESULTS"

"${NODE[@]}" $R/scripts/audit-data.ts "$MINUTE" "$DAILY" "$RESULTS/data-audit.json"
"${NODE[@]}" $R/scripts/aggregate-sessions.ts "$MINUTE" "$RESULTS/VGT-sessions-from-minute.csv"

# A: the original implementation on the original daily file, full file and common period.
"${NODE[@]}" src/app.ts $ORIGINAL VGT - - "$DAILY" "$RESULTS/original-daily-fullfile" > "$RESULTS/original-daily-fullfile.txt"
"${NODE[@]}" src/app.ts $ORIGINAL VGT $START $END "$DAILY" "$RESULTS/original-daily-common" > "$RESULTS/original-daily-common.txt"
# B: the original implementation on daily sessions aggregated from the minute file (same raw prices).
"${NODE[@]}" src/app.ts $ORIGINAL VGT $START $END "$RESULTS/VGT-sessions-from-minute.csv" "$RESULTS/original-aggregated-common" > "$RESULTS/original-aggregated-common.txt"
# M: the minute implementation, common period and whole minute file, plus the next-open stop-fill bound.
"${NODE[@]}" src/app.ts allIn VGT $START $END "$MINUTE" "$RESULTS/minute-common" > "$RESULTS/minute-common.txt"
"${NODE[@]}" src/app.ts allIn VGT $START $END "$MINUTE" "$RESULTS/minute-common-next-open" next-open > "$RESULTS/minute-common-next-open.txt"
"${NODE[@]}" src/app.ts allIn VGT - - "$MINUTE" "$RESULTS/minute-fullfile" > "$RESULTS/minute-fullfile.txt"

"${NODE[@]}" $R/scripts/validate.ts "$MINUTE" "$RESULTS/minute-common" "$RESULTS/validation-minute-common.json"
"${NODE[@]}" $R/scripts/validate.ts "$MINUTE" "$RESULTS/minute-common-next-open" "$RESULTS/validation-minute-common-next-open.json" next-open
"${NODE[@]}" $R/scripts/compare.ts "$RESULTS" > "$RESULTS/comparison.md"
