#!/bin/bash
# gpu-phase5 gate A8 (a copy of research/gpu-phase3/chains/tests.sh with this study's paths): the repository suite and Strategy Lab on the final tree. npm test (all src/**/*.test.ts, includes
# the GPU merge gate), the root TypeScript check, ESLint on the GPU code, and Strategy Lab's typecheck, lint, unit and e2e
# suites (the UI is built into a scratch directory: the live apps/strategy-lab/dist is never replaced; the e2e server
# uses its own temporary state, so state/strategy-lab/ is never touched — fingerprinted before and after). The GPU must be
# free (Phase 1's live GPU test runs when its binary exists).
cd /home/chad/projects/margin-trading
OUT=research/gpu-phase5/results/tests
SCRATCH=${SCRATCH:-/home/chad/projects/margin-trading/research/gpu-phase5/cache/strategy-lab-scratch}
mkdir -p "$OUT" "$SCRATCH"
fp() { find state/strategy-lab -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1; }
fp > "$OUT/strategy-lab-state-before.txt"
find apps/strategy-lab/dist -type f -newer research/gpu-phase5/results/protocol-freeze.json | wc -l > "$OUT/strategy-lab-dist-newer-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
r npm-test npm test
r root-tsc npx tsc --noEmit -p tsconfig.json
r eslint-gpu npx eslint src/gpu-backend src/gpu-phase5 tools/gpu-phase5 tools/gpu-backend/official-preflight.ts
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
find apps/strategy-lab/dist -type f -newer research/gpu-phase5/results/protocol-freeze.json | wc -l > "$OUT/strategy-lab-dist-newer-after.txt"
/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/tests-record.ts
echo "$(date -u +%FT%TZ) tests complete"
