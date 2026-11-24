#!/bin/bash
# P5-NS gates E7 (the study's and the reused modules' suites) and E8 (regression: the full npm test, root tsc, eslint of
# the study's code, Strategy Lab's portfolio parity, typecheck, lint, Vitest, a scratch build and Playwright e2e) —
# GPU Phase 8's tests chain (research/gpu-phase8/chains/tests.sh on the Priority 4 branch) with this study's paths. The UI
# is built into a scratch directory (the live apps/strategy-lab/dist is never replaced); the e2e server uses its own
# temporary state; state/strategy-lab/ is fingerprinted before and after and must not change. The GPU must be free (the
# live GPU tests of npm test). The full npm test reads whole data files (as in every earlier study): it feeds no decision.
#   tools/vg-l0-n-successor/launch.sh vgl0ns-tests <abs log> --wait -- /bin/bash research/vg-l0-n-successor/chains/tests.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=research/vg-l0-n-successor/results/engineering/tests
SCRATCH=/home/chad/projects/margin-trading/research/vg-l0-n-successor/cache/strategy-lab-scratch
mkdir -p "$OUT" "$SCRATCH"
fp() { find state/strategy-lab -type f -printf '%p %s %T@\n' 2>/dev/null | sort | sha256sum | cut -d' ' -f1; }
fp > "$OUT/strategy-lab-state-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
T="$NODE --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap"
r e7-suites $T src/vg-l0-n-successor/tests/*.test.ts src/vg-l0-full-joint/tests/*.test.ts src/vg-l0-risk-envelope-pilot/tests/*.test.ts src/vg-l0-risk-envelope-stage-b/tests/*.test.ts src/gpu-backend/tests/policy.test.ts
r npm-test npm test
r root-tsc npx tsc --noEmit -p tsconfig.json
r eslint npx eslint src/vg-l0-n-successor tools/vg-l0-n-successor
r preflight-all npm run research-preflight
r portfolio-parity npm --prefix apps/strategy-lab run portfolio-parity -- --out research/vg-l0-n-successor/results/engineering/tests/portfolio-parity.json
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
python3 -I tools/vg-l0-n-successor/tests-record.py
echo "$(date -u +%FT%TZ) tests complete"
