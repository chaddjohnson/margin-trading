#!/usr/bin/env python3
# gpu-phase5 stage P: attributes the parameter-schema self time of a V8 CPU profile (apps/strategy-lab/shared/params.ts,
# apps/strategy-lab/runner/growth-params.ts, and effectiveOf/configId of src/growth140-vgt-s8m/space.ts) to its nearest
# non-schema callers, and gives the inclusive time of selected frames. Read-only on the profiles.
#   python3 cpuprof-callers.py <profile dir> <out.json>
import collections, glob, json, os, sys
D, OUT = sys.argv[1], sys.argv[2]
repo = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')) + '/'
PARAMS = ('apps/strategy-lab/shared/params.ts', 'apps/strategy-lab/runner/growth-params.ts')
WANT = ['evalMany', 'evalKeyOf', 'quadOf', 'quadId', 'growthKeyOf', 'd1KeyOf', 'encodeTask', 'decodeRange', 'recordOf', 'riskInputsOf', 'configId', 'dispatch', 'prepare', 'complete', 'write', 'commit', 'read', 'iterate', 'decode', 'encode', 'evalKey', 'riskEvalKey2', 'riskId2', 'neighbourhood', 'encodeShard', 'growthParamsOf', 'cfgId']
def analyze(f):
    p = json.load(open(f))
    nodes = {n['id']: n for n in p['nodes']}
    parent = {c: n['id'] for n in p['nodes'] for c in n.get('children', [])}
    selfus = collections.Counter()
    for i, s in enumerate(p['samples']): selfus[s] += p['timeDeltas'][i]
    frame = lambda n: (n['callFrame']['functionName'] or '(anon)', n['callFrame']['url'].replace(repo, ''), n['callFrame']['lineNumber'] + 1)
    is_params = lambda n: any(x in n['callFrame']['url'] for x in PARAMS) or ('growth140-vgt-s8m/space.ts' in n['callFrame']['url'] and n['callFrame']['functionName'] in ('effectiveOf', 'configId'))
    total = sum(selfus.values()); idle = sum(v for k, v in selfus.items() if nodes[k]['callFrame']['functionName'] == '(idle)')
    attr = collections.Counter(); incl = collections.Counter(); ptotal = 0
    for nid, us in selfus.items():
        chain = []; cur = nid
        while True:
            chain.append(frame(nodes[cur]))
            if cur not in parent: break
            cur = parent[cur]
        for fr in set(chain): incl[fr] += us
        if is_params(nodes[nid]):
            ptotal += us; out = []; cur = nid
            while cur in parent:
                cur = parent[cur]
                if not is_params(nodes[cur]):
                    out.append(frame(nodes[cur]))
                    if len(out) >= 3: break
            attr[' <- '.join('%s@%s:%d' % (a, b, c) for a, b, c in out)] += us
    active = total - idle
    return {'file': os.path.basename(f), 'activeSeconds': round(active / 1e6, 2), 'parameterSchemaSelfSeconds': round(ptotal / 1e6, 2), 'parameterSchemaShareOfActive': round(ptotal / active, 4),
            'parameterSchemaByCallers': [{'seconds': round(v / 1e6, 2), 'callers': k} for k, v in attr.most_common(12) if v > 5e4],
            'inclusiveSeconds': [{'seconds': round(v / 1e6, 2), 'function': k[0], 'source': '%s:%d' % (k[1], k[2])} for v, k in sorted(((v, k) for k, v in incl.items() if k[0] in WANT and v > 3e5), reverse=True)[:40]]}
files = sorted(glob.glob(os.path.join(D, '*.cpuprofile')))
json.dump({'kind': 'gpu-phase5 CPU profile: parameter-schema time by callers (profiled prefix prof-a3-nm; estimates, never a timing)', 'profiles': [analyze(f) for f in files]}, open(OUT, 'w'), indent=1)
