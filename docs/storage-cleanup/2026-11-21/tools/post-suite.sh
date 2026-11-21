#!/bin/bash
# Post-cleanup verification (the same commands as the pre-cleanup baselines, outputs in verify/post/).
set -u
R=/home/chad/projects/margin-trading; cd "$R" || exit 2
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node; export PATH="$(dirname $N):$PATH"
P=$R/docs/storage-cleanup/2026-11-21/verify/post; L=$R/.cache/storage-cleanup-2026-11-21/logs
TS="--no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning"
echo "== $(date -u +%FT%TZ) verifier (rebuild, device, out-of-repository pin)"
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3 > $P/verify-acceptance.txt 2>&1; echo "verifier exit=$? $(tail -1 $P/verify-acceptance.txt)"
echo "== $(date -u +%FT%TZ) integrity"
$N $TS tools/gpu-phase6/integrity.ts --out $P/integrity.json > $P/integrity.txt 2>&1; echo "integrity exit=$? $(tail -1 $P/integrity.txt)"
echo "== $(date -u +%FT%TZ) Strategy Lab portfolio parity"
$N $TS --max-old-space-size=6144 apps/strategy-lab/scripts/portfolio-parity.ts --out $P/portfolio-parity.json > $P/portfolio-parity.txt 2>&1; echo "portfolio parity exit=$? $(tail -1 $P/portfolio-parity.txt)"
echo "== $(date -u +%FT%TZ) GPU fixture parity S3"
GPU_POLICY_PURPOSE=parity-test $N $TS --expose-gc --max-old-space-size=14000 tools/gpu-phase6/parity.ts --host-workers 8 --fixture 3 --sessions 420 --options all --random 300 --strata 1 --label P6S --detail --risk --out $P/gpu-parity-S3.json > $P/gpu-parity-S3.txt 2>&1; echo "gpu parity exit=$? $(tail -1 $P/gpu-parity-S3.txt)"
echo "== $(date -u +%FT%TZ) npm test"
npm test > $L/npm-test-post.log 2>&1; echo "npm test exit=$?"; grep -E "^ℹ " $L/npm-test-post.log > $P/npm-test-summary.txt; grep -E "^✖ " $L/npm-test-post.log | sed 's/ ([0-9.]*ms)$//' | sort -u > $P/npm-test-failing.txt; cat $P/npm-test-summary.txt
echo "== $(date -u +%FT%TZ) Strategy Lab Vitest, scratch build, Playwright"
/bin/bash $R/docs/storage-cleanup/2026-11-21/tools/sl-check.sh $R post $P; tail -1 $P/strategy-lab-vitest.txt; tail -1 $P/strategy-lab-build.txt; tail -3 $P/strategy-lab-e2e.txt
echo "== $(date -u +%FT%TZ) post suite complete"
