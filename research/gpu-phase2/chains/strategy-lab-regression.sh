#!/bin/bash
# gpu-phase2 G9 (Strategy Lab part): Strategy Lab still evaluates on its CPU engine and its suites pass. The UI is built
# into a scratch directory (the live apps/strategy-lab/dist is never replaced) and the e2e server uses its own temporary
# state directory and port 5299 (state/strategy-lab/ is never touched). CPU only.
cd /home/chad/projects/margin-trading/apps/strategy-lab
OUT=/home/chad/projects/margin-trading/research/gpu-phase2/results/tests
SCRATCH=${SCRATCH:?SCRATCH}
mkdir -p "$OUT" "$SCRATCH"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/strategy-lab-$name.txt" 2>&1; local rc=$?; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return $rc; }
r typecheck npm run typecheck; T=$?
r lint npm run lint; L=$?
r vitest npm run test; V=$?
r build npx vite build --outDir "$SCRATCH/dist" --emptyOutDir; B=$?
STRATEGY_LAB_STATIC_DIR="$SCRATCH/dist" r e2e npx playwright test; E=$?
if [ $E -ne 0 ]; then STRATEGY_LAB_STATIC_DIR="$SCRATCH/dist" r e2e-rerun npx playwright test; E2=$?; else E2=skipped; fi
echo "typecheck=$T lint=$L vitest=$V build=$B e2e=$E e2eRerun=$E2"
