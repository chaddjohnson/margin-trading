#!/bin/bash
# Priority 4's engineering gates E0, E1, E4, E5 (PROTOCOL.md §15): their evidence files under
# research/vg-l0-staged-stop/results/engineering/ (E2/E3 are the ACCEPTED research/gpu-phase8 record itself). Run after the
# Phase 8 record is ACCEPTED and committed, as its own unit:
#   REC=<acceptance record sha256> tools/vg-l0-staged-stop/launch.sh vgl0ss-eng <log> -- /bin/bash tools/vg-l0-staged-stop/engineering.sh
# Fail-fast: every step's status is tested. The gates record itself is sealed afterwards by `npm run vg-l0ss -- gates`.
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
X="--experimental-transform-types --disable-warning=ExperimentalWarning"
F="--no-maglev --expose-gc $X --max-old-space-size=12288"
OFF="src/gpu-backend/officialRunner.ts research/vg-l0-staged-stop src/vg-l0-staged-stop/main.ts"
E=$R/research/vg-l0-staged-stop/results/engineering
REC=${REC:?REC=<the ACCEPTED record sha256>}
cd $R || exit 1
mkdir -p $E/E0 $E/E1 $E/E4 $E/E5
fail() { echo "FAILED: $1"; exit 1; }

echo "=== $(date -u +%FT%TZ) E0"
{
  echo "t $(date -u +%FT%TZ) head $(git rev-parse HEAD)"
  git merge-base --is-ancestor 3aa51963 HEAD && echo "ok the rule commit 3aa51963 is an ancestor of HEAD" || echo "FAIL not an ancestor"
  git diff --quiet 3aa51963 HEAD -- research/vg-l0-staged-stop/RULE_SPECIFICATION.md && echo "ok RULE_SPECIFICATION.md unchanged since 3aa51963 (sha256 $(sha256sum research/vg-l0-staged-stop/RULE_SPECIFICATION.md | cut -c1-64))" || echo "FAIL changed"
  first=$(git log --reverse --format=%h 3aa51963..HEAD -- src/staged-stop | head -1)
  [ -n "$first" ] && echo "ok the implementation (src/staged-stop) starts after the rule: $first" || echo "FAIL no implementation commit after the rule"
} > $E/E0/rule.txt 2>&1
grep -q '^FAIL' $E/E0/rule.txt && fail E0
echo "PASS E0" >> $E/E0/rule.txt

echo "=== $(date -u +%FT%TZ) E1"
{
  echo "t $(date -u +%FT%TZ) head $(git rev-parse HEAD)"
  echo "codeDigest $($N --no-maglev $X -e "import('./src/vg-l0-staged-stop/records.ts').then((r) => console.log(r.codeDigest()))")"
  $N --no-maglev $X --test \
    src/staged-stop/tests/config.test.ts \
    src/d1-risk-controls-rc3/tests/book.test.ts src/d1-risk-controls-rc3/tests/pooled.test.ts \
    src/growth-trading/tests/stagedStop.test.ts src/growth-trading/tests/offParity-1.4.0.test.ts \
    src/vg-l0-staged-stop/tests/space.test.ts src/vg-l0-staged-stop/tests/study.test.ts 2>&1 | grep -E '^(✔|✖|ℹ (tests|pass|fail))'
} > $E/E1/tests.txt 2>&1
grep -q '^ℹ fail 0$' $E/E1/tests.txt || fail E1

echo "=== $(date -u +%FT%TZ) E4 verify-acceptance"
{ tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 $REC 2>&1; echo "exit $?"; } > $E/E4/verify-acceptance.txt
grep -q '^VERIFIED$' $E/E4/verify-acceptance.txt || fail "E4 verify-acceptance"
{
  echo "t $(date -u +%FT%TZ) head $(git rev-parse HEAD) record $REC"
  echo "--- 1. the official runner refuses a process without --no-maglev (expected exit 3)"
  GPU_POLICY_PURPOSE=official-optimization $N $X $OFF bound 2>&1 | head -3; s=${PIPESTATUS[0]}
  [ "$s" = 3 ] && echo "PASS refused without --no-maglev (exit $s)" || echo "FAIL exit $s"
  echo "--- 2. the official runner refuses a non-official purpose (expected exit 3)"
  GPU_POLICY_PURPOSE=diagnostic $N --no-maglev $X $OFF bound 2>&1 | head -3; s=${PIPESTATUS[0]}
  [ "$s" = 3 ] && echo "PASS refused purpose diagnostic (exit $s)" || echo "FAIL exit $s"
  echo "--- 3. the official runner with --no-maglev and the official purpose (bound, no evaluation)"
  GPU_POLICY_PURPOSE=official-optimization $N $F $OFF bound 2>&1 | grep -E '"ctrlWorstIsA3"|"ctrlCapIsStageB"'; s=${PIPESTATUS[0]}
  [ "$s" = 0 ] && echo "PASS bound (exit 0)" || echo "FAIL exit $s"
  echo "--- 4. the GPU policy, enforcement and record-in-force tests"
  $N --no-maglev $X --test src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts src/gpu-backend/tests/layout.test.ts 2>&1 | grep -E '^(✔|✖|ℹ (pass|fail))'
} > $E/E4/runtime.txt 2>&1
if grep -q '^FAIL' $E/E4/runtime.txt || ! grep -q '^ℹ fail 0$' $E/E4/runtime.txt; then fail "E4 runtime"; fi
echo "PASS E4 runtime" >> $E/E4/runtime.txt
for D in D19 D21 D24; do
  echo "=== $(date -u +%FT%TZ) E4 official preflight $D"
  GPU_POLICY_PURPOSE=official-optimization $N $F $OFF preflight --door $D > $E/E4/official-preflight-$D.txt 2>&1
  s=$?; echo "exit $s" >> $E/E4/official-preflight-$D.txt
  grep -q 'GATE OPEN' $E/E4/official-preflight-$D.txt || fail "E4 official preflight $D"
done

echo "=== $(date -u +%FT%TZ) E5 benchmark"
GPU_POLICY_PURPOSE=benchmark $N $F src/gpu-backend/legacyRunner.ts vg-l0ss-bench tools/vg-l0-staged-stop/bench.ts --out $E/E5/bench.json > $E/E5/bench.txt 2>&1 || fail "E5 bench"
grep -q '"pass": true' $E/E5/bench.json || fail "E5 bench pass"
{ $N --no-maglev $X src/research-standard/main.ts --study research/vg-l0-staged-stop 2>&1; echo "exit $?"; } > $E/E5/preflight.txt
grep -q '^PASS' $E/E5/preflight.txt || fail "E5 preflight"
echo "=== $(date -u +%FT%TZ) ENGINEERING EVIDENCE COMPLETE"
