#!/bin/bash
# Regression suites of the risk-envelope pilot on the final committed tree (after the sealed FULL validation, so the
# whole-file reads of other studies' tests cannot touch an open door): the full `npm test` (known pre-existing failures
# compared by name), the root tsc, ESLint on the pilot's code, the study preflights of every study, the sealed-file check,
# the integrity diff against the Phase 7 base, Strategy Lab's portfolio parity, typecheck, lint, Vitest, a build into a
# scratch directory (the live dist is never replaced) and Playwright (its own temporary state; state/strategy-lab
# fingerprinted before and after). The GPU must be free (one test runs a live GPU parity check).
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=research/vg-l0-risk-envelope-pilot/results/regression
SCRATCH=/home/chad/projects/margin-trading/research/vg-l0-risk-envelope-pilot/cache/strategy-lab-scratch
mkdir -p "$OUT" "$SCRATCH"
echo "head $(git rev-parse HEAD) t $(date -u +%FT%TZ)" > "$OUT/head.txt"
fp() { find state/strategy-lab -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1; }
fp > "$OUT/strategy-lab-state-before.txt"
find apps/strategy-lab/dist -type f -newer research/vg-l0-risk-envelope-pilot/results/protocol-freeze.json | wc -l > "$OUT/strategy-lab-dist-newer-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
r npm-test npm test
r root-tsc npx tsc --noEmit -p tsconfig.json
r eslint-pilot npx eslint src/vg-l0-risk-envelope-pilot tools/vg-l0-risk-envelope-pilot
r preflight-all npm run --silent research-preflight -- --all
r seals "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/seal-protect.ts --check --out "$OUT/seals.json"
r integrity-diff git diff --stat fc027eed1efb7e7b8b67022d8f9553f5bf27c394 HEAD -- . ':(exclude)research/vg-l0-risk-envelope-pilot' ':(exclude)src/vg-l0-risk-envelope-pilot' ':(exclude)tools/vg-l0-risk-envelope-pilot'
r portfolio-parity npm --prefix apps/strategy-lab run portfolio-parity -- --out research/vg-l0-risk-envelope-pilot/results/regression/portfolio-parity.json
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
find apps/strategy-lab/dist -type f -newer research/vg-l0-risk-envelope-pilot/results/protocol-freeze.json | wc -l > "$OUT/strategy-lab-dist-newer-after.txt"
echo "$(date -u +%FT%TZ) REGRESSION COMPLETE"
