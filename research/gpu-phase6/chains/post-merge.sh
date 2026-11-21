#!/bin/bash
# gpu-phase6 post-merge verification on main (PROTOCOL.md §7). Writes research/gpu-phase6/results/integration/.
cd /home/chad/projects/margin-trading || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning"
O=research/gpu-phase6/results/integration
say() { echo "$(date -u +%FT%TZ) $*"; }
say "branch $(git rev-parse --abbrev-ref HEAD) HEAD $(git rev-parse HEAD) tree $(git rev-parse 'HEAD^{tree}') phase6-tree $(git rev-parse 'research/gpu-phase6^{tree}')" | tee $O/state.txt
"$NODE" $TS --test --test-reporter=tap src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts src/gpu-backend/tests/layout.test.ts src/gpu-jobs/tests/jobs.test.ts > $O/merge-gate-tests.txt 2>&1; say "merge-gate tests rc=$? $(grep -E '^# (pass|fail)' $O/merge-gate-tests.txt | tr '\n' ' ')"
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3 > $O/verify-acceptance.txt 2>&1; say "verifier rc=$? $(tail -1 $O/verify-acceptance.txt)"
GPU_POLICY_PURPOSE=official-optimization "$NODE" $TS tools/gpu-backend/official-preflight.ts --study research/gpu-phase6 --door D24 > $O/official-preflight.txt 2>&1; say "live official gate rc=$? $(grep -o 'GATE OPEN — job [^,]*' $O/official-preflight.txt)"
"$NODE" $TS tools/gpu-phase6/integrity.ts --out $O/integrity-main.json > $O/integrity-main.txt 2>&1; say "integrity rc=$? $(tail -1 $O/integrity-main.txt)"
npm test > $O/npm-test.txt 2>&1; say "npm test rc=$? $(grep -E '^ℹ (tests|pass|fail|skipped)' $O/npm-test.txt | tr '\n' ' ')"
grep -B1 '^✖ ' $O/npm-test.txt | grep '^test at' | sort -u > $O/npm-test-failures.txt
say "post-merge complete"
