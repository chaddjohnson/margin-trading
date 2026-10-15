#!/usr/bin/env bash
# Reproduces the whole study from the repository root:
#   bash research/risk-management/vgt-portfolio-margin/run.sh
# Inputs: data/VGT/VGT-2016-2025-1-minute.csv, data/VOOG/VOOG-2016-2025-1-minute.csv (raw, Alpaca) and the
# dividend-adjusted daily files data/VGT/VGT-2005-2026-2.csv and data/VOOG/VOOG-2016-2026.csv.
set -euo pipefail

P=research/risk-management/vgt-portfolio-margin
R=$P/results
NODE=(node --experimental-transform-types --disable-warning=ExperimentalWarning)
REFERENCE=research/risk-management/allin-minute-conversion/results/current-params/minute-fullfile
CONTROL=$R/control-fixed-100k

mkdir -p "$R"

# 0. The fixed-$100,000 control through the unchanged CLI must still equal the committed reference.
"${NODE[@]}" src/app.ts allIn VGT - - data/VGT/VGT-2016-2025-1-minute.csv "$CONTROL" > "$CONTROL.txt"
for f in trades.csv daily.csv states.csv episodes.csv summary.json; do
  cmp "$CONTROL/$f" "$REFERENCE/$f"
done
echo "Fixed-\$100,000 control identical to $REFERENCE"

# 1. Distribution ledger from the local raw and adjusted files.
"${NODE[@]}" $P/scripts/distributions.ts $P/data > $R/distributions.log

# 2. The account: main run and two sensitivities, each validated.
"${NODE[@]}" $P/scripts/portfolio.ts $R/main gross minute > $R/main.log
"${NODE[@]}" $P/scripts/portfolio.ts $R/netted netted minute > $R/netted.log
"${NODE[@]}" $P/scripts/portfolio.ts $R/prior-close gross prior-close > $R/prior-close.log
"${NODE[@]}" $P/scripts/validate.ts $R/main $R/validation-main.json gross minute
"${NODE[@]}" $P/scripts/validate.ts $R/netted $R/validation-netted.json netted minute
"${NODE[@]}" $P/scripts/validate.ts $R/prior-close $R/validation-prior-close.json gross prior-close

# 3. Tables and reports.
"${NODE[@]}" $P/scripts/tables.ts $R
"${NODE[@]}" $P/scripts/assemble-reports.ts $P

# 4. Checksums of inputs and outputs.
shasum -a 256 data/VGT/VGT-2016-2025-1-minute.csv data/VOOG/VOOG-2016-2025-1-minute.csv data/VGT/VGT-2005-2026-2.csv \
  data/VOOG/VOOG-2016-2026.csv $P/data/distributions.csv $R/*/portfolio_daily.csv $R/*/trades_dynamic.csv \
  $R/*/dividends.csv $R/*/summary.json > $P/CHECKSUMS.txt
