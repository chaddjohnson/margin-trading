#!/bin/bash
# gpu-phase9 gates E7 (Strategy Lab part), E8, E9, E10 on the final committed tree (a copy of research/gpu-phase7/chains/tests.sh with
# this study's paths). The campaign checkout is the Assignment 2 integration worktree: the UI is built into a scratch
# directory; the e2e server uses its own temporary state, so the worktree must have no state/strategy-lab/ before or after;
# the user's live server runs from the main checkout ($MAIN), whose apps/strategy-lab/dist is fingerprinted before and
# after (never written). The GPU must be free (Phase 1's live GPU test).
#   tools/gpu-phase9/launch-slice.sh p9chain-tests <abs log> -- /bin/bash research/gpu-phase9/chains/tests.sh
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT" || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=research/gpu-phase9/results/tests
SCRATCH=$ROOT/research/gpu-phase9/cache/strategy-lab-scratch
mkdir -p "$OUT" "$SCRATCH"
MAIN=${MAIN_CHECKOUT:-/home/chad/projects/margin-trading}
fp() { if [ -e state/strategy-lab ]; then find state/strategy-lab -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1; else echo absent; fi; }
dist() { (cd "$MAIN/apps/strategy-lab/dist" && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1); }
fp > "$OUT/strategy-lab-state-before.txt"
dist > "$OUT/strategy-lab-live-dist-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
r npm-test npm test
r root-tsc npx tsc --noEmit -p tsconfig.json
r eslint-gpu npx eslint src/gpu-backend src/gpu-jobs src/gpu-phase9 src/risk-envelope tools/gpu-phase9 tools/gpu-backend/official-preflight.ts
r portfolio-parity npm --prefix apps/strategy-lab run portfolio-parity -- --out research/gpu-phase9/results/tests/portfolio-parity.json
cd apps/strategy-lab
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "../../$OUT/strategy-lab-$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "../../$OUT/strategy-lab-$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return $rc; }
r typecheck npm run typecheck
r lint npm run lint
r vitest npm run test
r build npx vite build --outDir "$SCRATCH/dist" --emptyOutDir
STRATEGY_LAB_STATIC_DIR="$SCRATCH/dist" r e2e npx playwright test; E=$?
if [ $E -ne 0 ]; then STRATEGY_LAB_STATIC_DIR="$SCRATCH/dist" r e2e-rerun npx playwright test; fi
cd ../..
fp > "$OUT/strategy-lab-state-after.txt"
dist > "$OUT/strategy-lab-live-dist-after.txt"
"$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase9/tests-record.ts
"$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase9/integrity.ts --out research/gpu-phase9/results/integrity/integrity.json
echo "$(date -u +%FT%TZ) tests complete"
