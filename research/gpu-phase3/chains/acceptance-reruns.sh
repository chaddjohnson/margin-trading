#!/bin/bash
# gpu-phase3 amendment A1 (AMENDMENTS.md): after the enforcement-only change 0f1bab17 (the type of an env array in
# src/gpu-backend/tests/policy.test.ts), docs/gpu/PARITY_CHECKLIST.md §2a on the committed tree: the negative suite, the
# source-tamper suite, npm test and the root type check. Sequential, fail-fast; START=<n> resumes. The GPU must be free.
#   tools/gpu-phase3/launch.sh gpup3-reruns <abs log> -- /usr/bin/env START=1 /bin/bash research/gpu-phase3/chains/acceptance-reruns.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=parity-test
START=${START:-1}
R=research/gpu-phase3/results
N() { "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning "$@"; }
k=0
step() {
  k=$((k+1))
  local name=$1; shift
  if [ $k -lt "$START" ]; then echo "skip $k [$name]"; return 0; fi
  echo "$(date -u +%FT%TZ) start $k [$name]"
  "$@"
  local st=$?
  echo "$(date -u +%FT%TZ) end $k [$name] status $st"
  [ $st -eq 0 ] || { echo "FAILED $k [$name]"; exit 1; }
}
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "FAILED: the source is not committed"; exit 1; }
git rev-parse HEAD > $R/tests/acceptance-reruns-head.txt
npmtest() { npm test > $R/tests/npm-test-acceptance-tree.txt 2>&1; echo "exit=$?" >> $R/tests/npm-test-acceptance-tree.txt; python3 - $R/tests/npm-test-acceptance-tree.txt <<'PY'
import re, sys
t = open(sys.argv[1]).read()
n = lambda k: int(re.search(rf'^ℹ {k} (\d+)$', t, re.M).group(1))
files = re.findall(r'test at (\S+?):\d+:\d+\n✖', t)
known = re.compile(r'src/(intraday-study/tests/study|minute-optimizer/tests/goldenMaster|trailing-buy/tests/goldenMaster|study7-runners/tests/runners)\.test\.ts')
bad = [f for f in files if not known.match(f)]
print(f"tests {n('tests')} pass {n('pass')} fail {n('fail')} cancelled {n('cancelled')} skipped {n('skipped')}; unexpected {bad}")
sys.exit(0 if n('fail') == 7 and len(files) == 7 and not bad and n('cancelled') == 0 else 1)
PY
}
tsc() { { npx tsc --noEmit -p tsconfig.json; echo "exit=$?"; } > $R/tests/root-tsc-acceptance-tree.txt 2>&1; cat $R/tests/root-tsc-acceptance-tree.txt; return 0; }
step negative   N tools/gpu-phase3/negative.ts --out $R/policy/negative-acceptance.json --host-workers 3
step tamper     N tools/gpu-phase3/tamper.ts --out $R/policy/tamper-acceptance.json
step npm-test   npmtest
step root-tsc   tsc
echo "$(date -u +%FT%TZ) chain complete"
