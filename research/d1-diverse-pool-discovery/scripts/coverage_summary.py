"""Descriptive coverage and diversity summary for COVERAGE_AND_DIVERSITY.md and FAMILY_SELECTION.md.

Reads only this study's records (search.json per arm, the archive logs they hash, promotion.json and assessment.json);
decides nothing. Verifies each archive log against the sha256 its search record bound before reading it.

    python3 -I research/d1-diverse-pool-discovery/scripts/coverage_summary.py > research/d1-diverse-pool-discovery/results/tables/coverage-summary.json
"""
import hashlib
import json
import os
import sys
from collections import Counter

ROOT = 'research/d1-diverse-pool-discovery/results/rounds'
BANDS = [('A1', 1, 1), ('A2', 2, 3), ('A3', 4, 6), ('A4', 7, 11), ('A5', 12, 16), ('A6', 17, 24)]


def band(n):
    return next(name for name, lo, hi in BANDS if lo <= n <= hi)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def jaccard(a, b):
    a, b = set(a), set(b)
    return 1 - len(a & b) / len(a | b)


out = {}

for window in ['fold-a', 'fold-b', 'final']:
    wdir = os.path.join(ROOT, window)
    if not os.path.exists(os.path.join(wdir, 'search.json')):
        continue
    for arm in sorted(d for d in os.listdir(wdir) if os.path.isdir(os.path.join(wdir, d)) and d != 'select'):
        search = json.load(open(os.path.join(wdir, arm, 'search.json')))
        log = os.path.join(wdir, arm, 'archive.jsonl')
        if sha256(log) != search['logSha256']:
            sys.exit(f'{log} does not hash to its search record')
        cov = search['coverage']
        checks = {}
        for c in cov['checks']:
            item = checks.setdefault(c['name'], {'required': c['required'], 'minActual': None, 'count': 0, 'pass': True})
            item['count'] += 1
            item['pass'] = item['pass'] and c['pass']
            if isinstance(c['actual'], (int, float)):
                item['minActual'] = c['actual'] if item['minActual'] is None else min(item['minActual'], c['actual'])

        stage = Counter()
        bands = Counter()
        memberships = set()
        fresh = 0
        with open(log) as f:
            for line in f:
                if not line.strip():
                    continue
                e = json.loads(line)
                stage[e['meta']['stage']] += 1
                members = tuple(sorted(b['symbol'] for b in e['config']))
                bands[band(len(members))] += 1
                memberships.add(members)
                fresh += 1

        row = {
            'configurations': cov['configurations'],
            'archiveLines': fresh,
            'byStage': dict(stage),
            'shareByStage': {k: v / fresh for k, v in stage.items()},
            'bySizeBand': {name: bands.get(name, 0) for name, _, _ in BANDS},
            'distinctMemberships': len(memberships),
            'hits': search['hits'],
            'feasible': search['feasible'],
            'credible': search['credible'],
            'library': search['library'],
            'budgets': search['budgets'],
            'checks': checks,
            'failures': len(cov['failures']),
            'contractsPass': cov['pass'],
            'protectedExamples': cov.get('protectedExamples'),
            'perSymbolConfigurations': {
                'min': min(s['configurations'] for s in cov['symbols'].values()),
                'median': sorted(s['configurations'] for s in cov['symbols'].values())[len(cov['symbols']) // 2],
                'max': max(s['configurations'] for s in cov['symbols'].values()),
                'minSymbol': min(cov['symbols'], key=lambda k: cov['symbols'][k]['configurations']),
                'maxSymbol': max(cov['symbols'], key=lambda k: cov['symbols'][k]['configurations']),
            },
            'perSymbolVectorsMin': min(s['vectors'] for s in cov['symbols'].values()),
        }

        promo_file = os.path.join(wdir, 'select', arm, 'promotion.json')
        if os.path.exists(promo_file):
            promo = json.load(open(promo_file))
            fams = promo['families']
            sizes = sorted((f['size'] for f in fams), reverse=True)
            promoted = promo['promoted']
            reps = [tuple(sorted(p['representative']['members'] if 'members' in p['representative'] else [b['symbol'] for b in p['representative']['books']])) for p in promoted]
            row['families'] = {
                'count': len(fams),
                'largest': sizes[:5],
                'singletons': sum(1 for s in sizes if s == 1),
                'largestShareOfCredible': sizes[0] / promo['credible'] if sizes and promo['credible'] else None,
                'distinctLeaderMemberships': len({tuple(sorted(f['members'])) for f in fams}),
            }
            row['shortlist'] = {
                'slots': [{'slot': s['slot'], 'outcome': s['outcome']} for s in promo['slots']],
                'promoted': [{'slot': p['slot'], 'familySize': p['familySize'], 'members': list(m)} for p, m in zip(promoted, reps)],
                'distinctMemberships': len(set(reps)),
                'minPairwiseJaccardDistance': min((jaccard(a, b) for i, a in enumerate(reps) for b in reps[i + 1:]), default=None),
            }

        refinements = []
        sel = os.path.join(wdir, 'select', arm)
        for name in sorted(n for n in (os.listdir(sel) if os.path.isdir(sel) else []) if n.startswith('refine-')):
            r = json.load(open(os.path.join(sel, name)))
            pruned = []
            for step in r['pruneSteps']:
                if step.get('removed'):
                    m = next((x for x in step.get('marginals', []) if x['symbol'] == step['removed']), None)
                    pruned.append({'phase': step['phase'], 'removed': step['removed'],
                                   'marginal': m['marginal'] if m else None,
                                   'lower90': m['interval']['lower'] if m and 'interval' in m else None})  # Q prunes on centre marginals
            members = lambda key: sorted(part.split(':')[0] for part in key.split('|')) if key else []
            refinements.append({
                'family': r['family'], 'slot': r['slot'],
                'start': members(r['start']), 'result': members(r['result']),
                'startValue': r['startState']['value'], 'refinedValue': r['refinedState']['value'],
                'resultValue': r['resultState']['value'] if r.get('resultState') else None,
                'moves': Counter(f"{m['phase']}:{m['pass']}" for m in r['moves']),
                'membershipMoves': [m['move'] for m in r['moves'] if m['pass'] == 'membership'],
                'pruned': pruned, 'pruneBlocked': r['pruneBlocked'], 'walkedBack': r['walkedBack'],
                'stoppedBy': r.get('stoppedBy'),
            })
        if refinements:
            row['refinements'] = refinements

        assess_file = os.path.join(wdir, 'select', arm, 'assessment.json')
        if os.path.exists(assess_file):
            fin = json.load(open(assess_file))['finalists']
            mems = [tuple(sorted(f['members'])) for f in fin]
            row['finalists'] = {
                'count': len(fin),
                'passing': sum(1 for f in fin if f.get('pass')),
                'memberships': [' '.join(m) for m in mems],
                'distinctMemberships': len(set(mems)),
                'minPairwiseJaccardDistance': min((jaccard(a, b) for i, a in enumerate(mems) for b in mems[i + 1:]), default=None),
            }

        out[f'{window}/{arm}'] = row

json.dump(out, sys.stdout, indent=1)
