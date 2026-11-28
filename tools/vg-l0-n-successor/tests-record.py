#!/usr/bin/env python3
# Records gates E7 and E8 from the outputs of research/vg-l0-n-successor/chains/tests.sh (results/engineering/tests/).
# E7: the study's and the reused modules' suites, 0 failures. E8: npm test with only the 7 known pre-existing failures
# (memory: lowercase allin-original.ts × 6, Study 7's sealed data end), root tsc 0 errors, eslint 0 errors, every study
# preflight PASS, Strategy Lab portfolio parity, typecheck, lint, Vitest, build and Playwright (or its rerun: known timing
# races) exit 0, state/strategy-lab unchanged.
import json, os, re, datetime

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
d = os.path.join(root, 'research/vg-l0-n-successor/results/engineering')
t = os.path.join(d, 'tests')
rd = lambda n: open(os.path.join(t, n), encoding='utf8', errors='replace').read() if os.path.exists(os.path.join(t, n)) else ''
rc = lambda n: int((re.findall(r'^exit=(\d+)$', rd(n), re.M) or ['-1'])[-1])
def counts(text):
    out = {}
    for k in ('tests', 'pass', 'fail', 'skipped', 'cancelled'):
        m = re.findall(rf'^(?:# |ℹ )({k}) (\d+)$', text, re.M)
        out[k] = int(m[-1][1]) if m else None
    return out
def failing(text):
    return sorted(set(re.findall(r'^not ok \d+ - (.+)$', text, re.M)))[:40]
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

e7 = counts(rd('e7-suites.txt'))
rec7 = {'gate': 'E7', 'what': "the study's unit tests and the reused modules' suites (Assignment 3, the pilot's lane, Stage B, the GPU policy tests), TAP", 'counts': e7, 'failing': failing(rd('e7-suites.txt')), 'exit': rc('e7-suites.txt'), 'pass': e7['fail'] == 0 and (e7['tests'] or 0) > 0, 'finished': now}
json.dump(rec7, open(os.path.join(d, 'E7-tests.json'), 'w'), indent=1); open(os.path.join(d, 'E7-tests.json'), 'a').write('\n')

npm = counts(rd('npm-test.txt'))
known = 7
e2e_ok = rc('strategy-lab-e2e.txt') == 0 or rc('strategy-lab-e2e-rerun.txt') == 0
state_same = rd('strategy-lab-state-before.txt').strip() == rd('strategy-lab-state-after.txt').strip()
items = {
    'npm test (failures ≤ the 7 known pre-existing)': npm['fail'] is not None and npm['fail'] <= known,
    'root tsc': rc('root-tsc.txt') == 0,
    'eslint (study code)': rc('eslint.txt') == 0,
    'every study preflight': rc('preflight-all.txt') == 0,
    'Strategy Lab portfolio parity': rc('portfolio-parity.txt') == 0,
    'Strategy Lab typecheck': rc('strategy-lab-typecheck.txt') == 0,
    'Strategy Lab lint': rc('strategy-lab-lint.txt') == 0,
    'Strategy Lab Vitest': rc('strategy-lab-vitest.txt') == 0,
    'Strategy Lab build (scratch dir)': rc('strategy-lab-build.txt') == 0,
    'Strategy Lab Playwright e2e (or its rerun)': e2e_ok,
    'state/strategy-lab unchanged': state_same,
}
rec8 = {'gate': 'E8', 'what': 'regression of the repository and Strategy Lab on this branch (chains/tests.sh)', 'npmTest': {**npm, 'failing': failing(rd('npm-test.txt')), 'knownPreExisting': known}, 'items': items, 'e2eFirstExit': rc('strategy-lab-e2e.txt'), 'pass': all(items.values()), 'finished': now}
json.dump(rec8, open(os.path.join(d, 'E8-regression.json'), 'w'), indent=1); open(os.path.join(d, 'E8-regression.json'), 'a').write('\n')
print(json.dumps({'E7': rec7['pass'], 'E7counts': e7, 'E8': rec8['pass'], 'npm': npm, 'items': items}))
