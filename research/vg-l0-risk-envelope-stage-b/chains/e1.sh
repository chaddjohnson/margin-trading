#!/bin/bash
# Engineering gate E1 of Stage B (PROTOCOL.md §12): the independent acceptance verifier on this branch and the runtime
# refusals. Run as its own unit: tools/vg-l0-risk-envelope-stage-b/launch.sh vgl0reb-e1 <log> -- /bin/bash <this>
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
E=$R/research/vg-l0-risk-envelope-stage-b/results/engineering/E1
OFF="src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-stage-b src/vg-l0-risk-envelope-stage-b/main.ts"
X="--experimental-transform-types --disable-warning=ExperimentalWarning"
cd $R || exit 1
mkdir -p $E
echo "=== $(date -u +%FT%TZ) verify-acceptance"
{ tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7 2>&1; echo "exit $?"; } > $E/verify-acceptance.txt
grep -q '^VERIFIED$' $E/verify-acceptance.txt || { echo "FAILED: verify-acceptance"; exit 1; }
{
  echo "t $(date -u +%FT%TZ) head $(git rev-parse HEAD)"
  echo "--- 1. the official runner refuses a process without --no-maglev (expected exit 3, runtime-maglev)"
  GPU_POLICY_PURPOSE=official-optimization $N $X $OFF bound 2>&1 | head -3; s=${PIPESTATUS[0]}
  [ "$s" = 3 ] && echo "PASS refused without --no-maglev (exit $s)" || echo "FAIL exit $s"
  echo "--- 2. the official runner refuses a non-official purpose (expected exit 3)"
  GPU_POLICY_PURPOSE=diagnostic $N --no-maglev $X $OFF bound 2>&1 | head -3; s=${PIPESTATUS[0]}
  [ "$s" = 3 ] && echo "PASS refused purpose diagnostic (exit $s)" || echo "FAIL exit $s"
  echo "--- 3. the official runner with --no-maglev and official purpose opens the runner (bound, no evaluation)"
  GPU_POLICY_PURPOSE=official-optimization $N --no-maglev $X $OFF bound 2>&1 | grep -E '"total"|"fits"'; s=${PIPESTATUS[0]}
  [ "$s" = 0 ] && echo "PASS bound (exit 0)" || echo "FAIL exit $s"
  echo "--- 4. the GPU policy and enforcement tests (runtime, merge gate, entrypoint audit)"
  $N --no-maglev $X --test src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts 2>&1 | grep -E '^(✔|✖|ℹ (pass|fail))'
} > $E/runtime.txt 2>&1
cat $E/runtime.txt
if grep -q '^FAIL' $E/runtime.txt || ! grep -q '^ℹ fail 0$' $E/runtime.txt; then echo "FAILED: runtime"; exit 1; fi
echo "PASS E1 runtime" >> $E/runtime.txt
echo "=== $(date -u +%FT%TZ) E1 COMPLETE"
