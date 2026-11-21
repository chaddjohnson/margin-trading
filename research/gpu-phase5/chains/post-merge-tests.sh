#!/bin/bash
# gpu-phase5 integration (brief §5 item 4): the repository suite and Strategy Lab's suites repeated on the MERGED tree.
# Same commands as chains/tests.sh, but every output goes to results/integration/tests/ — the acceptance record binds
# the sha256 of results/tests/{npm-test,strategy-lab}.json, which must never be rewritten. The UI is built into a
# scratch directory; the e2e server uses its own temporary state; state/strategy-lab/ is fingerprinted before and after.
cd /home/chad/projects/margin-trading
OUT=research/gpu-phase5/results/integration/tests
SCRATCH=${SCRATCH:-/home/chad/projects/margin-trading/research/gpu-phase5/cache/strategy-lab-scratch}
mkdir -p "$OUT" "$SCRATCH"
fp() { find state/strategy-lab -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1; }
{ date -u +%FT%TZ; git rev-parse --abbrev-ref HEAD; git rev-parse HEAD; git rev-parse main; echo "diff main..HEAD outside research/gpu-phase5: $(git diff --name-only main HEAD -- . ':!research/gpu-phase5' | wc -l) files"; echo "uncommitted outside research/gpu-phase5: $(git status --porcelain -- . ':!research/gpu-phase5' | wc -l) files"; } > "$OUT/tree.txt"
fp > "$OUT/strategy-lab-state-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
r npm-test npm test
r root-tsc npx tsc --noEmit -p tsconfig.json
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
python3 - "$OUT" <<'PY'
import json, os, re, sys, datetime
O = sys.argv[1]
t = lambda n: open(f'{O}/{n}.txt').read() if os.path.exists(f'{O}/{n}.txt') else ''
ok = lambda n: re.search(r'^exit=0$', t(n), re.M) is not None
num = lambda k: int((re.search(rf'ℹ {k} (\d+)', t('npm-test')) or [0, -1])[1])
fails = re.findall(r'test at (\S+?):\d+:\d+\n✖ (.+?) \(\d', t('npm-test'))
known = lambda f: bool(re.search(r'src/intraday-study/tests/study\.test\.ts|src/minute-optimizer/tests/goldenMaster\.test\.ts|src/trailing-buy/tests/goldenMaster\.test\.ts', f[0])) or (f[0] == 'src/study7-runners/tests/runners.test.ts' and 'parity with the sealed Study 7 final door' in f[1])
unexpected = [f for f in fails if not known(f)]
p = lambda s, k: int((re.search(rf'(\d+) {k}', t(s)) or [0, 0])[1])
e2e_ok = ok('strategy-lab-e2e') or (t('strategy-lab-e2e-rerun') != '' and ok('strategy-lab-e2e-rerun'))
before, after = t('strategy-lab-state-before').strip(), t('strategy-lab-state-after').strip()
rec = {
  'kind': 'gpu-phase5 post-merge tests (the merged tree)', 't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'tree': t('tree').strip().split('\n'),
  'npmTest': {'tests': num('tests'), 'pass': num('pass'), 'fail': num('fail'), 'cancelled': num('cancelled'), 'skipped': num('skipped'), 'knownFailures': len(fails) - len(unexpected), 'unexpected': unexpected,
              'ok': len(unexpected) == 0 and len(fails) == num('fail') == 7 and num('cancelled') == 0},
  'rootTsc': ok('root-tsc'),
  'strategyLab': {'typecheck': ok('strategy-lab-typecheck'), 'lint': ok('strategy-lab-lint'), 'vitest': ok('strategy-lab-vitest'), 'build': ok('strategy-lab-build'),
                  'e2e': {'passed': p('strategy-lab-e2e', 'passed'), 'failed': p('strategy-lab-e2e', 'failed'), 'rerun': None if t('strategy-lab-e2e-rerun') == '' else {'passed': p('strategy-lab-e2e-rerun', 'passed'), 'failed': p('strategy-lab-e2e-rerun', 'failed')}, 'ok': e2e_ok},
                  'stateUnchanged': before == after and len(before) == 64},
}
s = rec['strategyLab']
rec['pass'] = rec['npmTest']['ok'] and rec['rootTsc'] and s['typecheck'] and s['lint'] and s['vitest'] and s['build'] and s['e2e']['ok'] and s['stateUnchanged']
open(f'{O}/post-merge-tests.json', 'w').write(json.dumps(rec, indent=1) + '\n')
print(json.dumps(rec))
PY
echo "$(date -u +%FT%TZ) post-merge tests complete"
