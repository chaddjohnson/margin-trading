#!/bin/bash
# Strategy Lab regression for the storage cleanup (pre/post): Vitest, a scratch UI build (the live dist is never
# rebuilt), Playwright on a fresh temporary state directory (e2e/serve.ts) served from the scratch build.
#   sl-check.sh <repo> <pre|post> <out dir>
set -u
R=$1; PHASE=$2; O=$3; S=$R/.cache/storage-cleanup-2026-11-21/scratch/sl-dist-$PHASE
cd "$R/apps/strategy-lab" || exit 2
npm test > "$O/strategy-lab-vitest.txt" 2>&1; echo "vitest exit=$?" >> "$O/strategy-lab-vitest.txt"
npx vite build --outDir "$S" --emptyOutDir > "$O/strategy-lab-build.txt" 2>&1; echo "build exit=$?" >> "$O/strategy-lab-build.txt"
STRATEGY_LAB_STATIC_DIR="$S" npx playwright test > "$O/strategy-lab-e2e.txt" 2>&1; echo "e2e exit=$?" >> "$O/strategy-lab-e2e.txt"
