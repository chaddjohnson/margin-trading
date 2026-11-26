#!/bin/bash
# TSLA outcome identity fix — regression and integrity chain (modelled on research/tsla-d1-growth/chains/tests.sh, with
# this task's paths). Every step runs and records its exit code; nothing under research/ is written. The Strategy Lab UI
# is built into a scratch directory (the live apps/strategy-lab/dist is never replaced); the e2e server uses its own
# temporary state; state/strategy-lab/ is fingerprinted before and after. The GPU must be free (npm test's live GPU
# tests). The full npm test reads whole data files (as in every earlier study): it feeds no decision.
#   systemd-run --user --unit=tslafix-tests --collect --wait -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 \
#     -E PATH="$PATH" -E HOME="$HOME" --working-directory=/home/chad/projects/margin-trading \
#     -p StandardOutput=append:<abs log> -p StandardError=append:<abs log> \
#     /bin/bash /home/chad/projects/margin-trading/docs/engineering/tsla-outcome-identity-fix/chains/tests.sh <scratch dir>
cd /home/chad/projects/margin-trading || exit 2
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
E=docs/engineering/tsla-outcome-identity-fix
OUT=$E/evidence/tests
SCRATCH=${1:?usage: tests.sh <absolute scratch dir>}
mkdir -p "$OUT" "$SCRATCH"
fp() { find state/strategy-lab -type f -printf '%p %s %T@\n' 2>/dev/null | sort | sha256sum | cut -d' ' -f1; }
fp > "$OUT/strategy-lab-state-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
T="$NODE --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap"
X="$NODE --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning"
# focused: the new suites, the study's own suite, the reused modules' suites (the study's E7 list) and the merge gate
r focused $T src/research-outcome/tests/*.test.ts src/tsla-d1-growth/tests/*.test.ts src/vg-l0-n-successor/tests/*.test.ts src/vg-l0-full-joint/tests/*.test.ts src/vg-l0-risk-envelope-pilot/tests/*.test.ts src/vg-l0-risk-envelope-stage-b/tests/*.test.ts src/gpu-backend/tests/policy.test.ts
r npm-test npm test
r root-tsc npx tsc --noEmit -p tsconfig.json
r tools-tsc npx tsc --noEmit -p "$E/chains/tsconfig.tools.json"
r eslint npx eslint src/research-outcome src/tsla-d1-growth tools/tsla-outcome-identity-fix
r preflight-all npm run research-preflight -- --all
r preflight-tsla npm run research-preflight -- --study research/tsla-d1-growth
r tsla-verify env GPU_POLICY_PURPOSE=official-optimization npm run tsla -- verify
r acceptance bash tools/gpu-backend/verify-acceptance.sh
r fingerprint-after $X tools/tsla-outcome-identity-fix/fingerprint.ts
r replay-rerun $X tools/tsla-outcome-identity-fix/replay.ts --out "$SCRATCH/replay-rerun.json"
r portfolio-parity npm --prefix apps/strategy-lab run portfolio-parity -- --out "$(pwd)/$OUT/portfolio-parity.json"
cd apps/strategy-lab || exit 2
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "../../$OUT/strategy-lab-$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "../../$OUT/strategy-lab-$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return $rc; }
r typecheck npm run typecheck
r lint npm run lint
r vitest npm run test
r build npx vite build --outDir "$SCRATCH/dist" --emptyOutDir
STRATEGY_LAB_STATIC_DIR="$SCRATCH/dist" r e2e npx playwright test; RC=$?
if [ $RC -ne 0 ]; then STRATEGY_LAB_STATIC_DIR="$SCRATCH/dist" r e2e-rerun npx playwright test; fi
cd ../.. || exit 2
fp > "$OUT/strategy-lab-state-after.txt"
echo "$(date -u +%FT%TZ) tests complete"
