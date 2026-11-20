#!/bin/bash
# gpu-phase5 stage D (adapted from research/gpu-phase3/chains/post-merge.sh; the live gate on the Assignment 3 domain): the verification of `main` after the merge (run with `main` checked out; the GPU free). Every
# output goes to research/gpu-phase5/results/integration/ (logs) and is summarized in post-merge-verification.json.
#   RECORD_SHA=<sha256 of config/gpu-backend/acceptance.json from the acceptance commit> /bin/bash research/gpu-phase5/chains/post-merge.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
O=research/gpu-phase5/results/integration
mkdir -p $O
: "${RECORD_SHA:?the record sha256 kept outside the repository}"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$O/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$O/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; }
r branch git rev-parse --abbrev-ref HEAD
r tree-equal git diff --stat research/gpu-phase5 HEAD --
r merge-gate-tests env GPU_POLICY_PURPOSE=parity-test "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts src/gpu-backend/tests/hostPipeline.test.ts src/gpu-backend/tests/layout.test.ts
r verify-acceptance tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 "$RECORD_SHA"
r research-preflight-all npm run --silent research-preflight -- --all
r apps-unchanged git diff --stat 3a52cc635c95f74fc6cf3c22aa30bf4507293fa3 HEAD -- apps
r official-preflight env GPU_POLICY_PURPOSE=official-optimization "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/gpu-phase5 --door D24 --domain assignment3 --batch 8192
python3 - "$O" <<'PY'
import json, re, sys, datetime, subprocess
O = sys.argv[1]
t = lambda n: open(f'{O}/{n}.txt').read()
ok = lambda n: re.search(r'^exit=0$', t(n), re.M) is not None
rec = {
  'kind': 'gpu-phase5 post-merge verification of main',
  't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'head': subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(),
  'branch': t('branch').split('\n')[0],
  'treeEqualToAcceptedBranch': t('tree-equal').strip() == 'exit=0',
  'mergeGateTests': {'pass': '# fail 0' in t('merge-gate-tests') and ok('merge-gate-tests'), 'summary': [l for l in t('merge-gate-tests').split('\n') if l.startswith('# ')]},
  'verifyAcceptance': {'pass': ok('verify-acceptance') and 'VERIFIED' in t('verify-acceptance').split('\n'), 'lines': [l for l in t('verify-acceptance').split('\n') if l.startswith(('PASS', 'FAIL', 'SKIP', 'VERIFIED', 'NOT'))]},
  'researchPreflightAll': {'pass': ok('research-preflight-all') and '\nFAIL' not in t('research-preflight-all'), 'studies': len(re.findall(r'^PASS ', t('research-preflight-all'), re.M))},
  'officialPreflight': {'pass': ok('official-preflight') and 'GATE OPEN' in t('official-preflight'), 'lines': [l for l in t('official-preflight').split('\n') if l.startswith(('ok', 'GATE', 'REFUSED'))]},
  'strategyLabUnchanged': {'pass': t('apps-unchanged').strip() == 'exit=0', 'diff': t('apps-unchanged').strip()[:400]},
  'canonicalCpuClosureUnchanged': (lambda a, b: {'pass': a['compat']['cpu']['digest'] == b['compat']['cpu']['digest'] and len(a['compat']['cpu']['files']) == len(b['compat']['cpu']['files']), 'digest': a['compat']['cpu']['digest'], 'files': len(a['compat']['cpu']['files'])})(json.load(open('config/gpu-backend/acceptance.json')), json.load(open('research/gpu-phase5/results/superseded/acceptance-gpu-phase3.json'))),
}
rec['pass'] = all(v['pass'] if isinstance(v, dict) else v for k, v in rec.items() if k in ('treeEqualToAcceptedBranch', 'mergeGateTests', 'verifyAcceptance', 'researchPreflightAll', 'officialPreflight', 'strategyLabUnchanged', 'canonicalCpuClosureUnchanged'))
open(f'{O}/post-merge-verification.json', 'w').write(json.dumps(rec, indent=1) + '\n')
print(json.dumps({k: (v['pass'] if isinstance(v, dict) and 'pass' in v else v) for k, v in rec.items() if k not in ('kind',)}))
PY
