#!/usr/bin/env python3
# P9-MSFT independent outcome reconciliation (brief Phase 0 "Outcome identity and report correctness"; PROTOCOL.md §12) —
# report-only; reads sealed JSON only and never imports the study's TypeScript. It re-derives, by a separate
# implementation:
#   1. the C24 finalist set of every nominating arm (D, G, C, J, S) from the sealed arm selections (each arm's primary and
#      its non-actual-profit roles) and compares it with FROZEN_SELECTION.json by the identity (arm, id) — labels are
#      compared only as a consistency check, never used to join;
#   2. each finalist's development flag a (= Q1–Q6 at C24), chronological flag b (= the arm's primary AND the arm's
#      sequential procedure supported, recomputed from the sequential record's own net, drawdown and fold labels) and
#      sufficiency flag d (ES1–ES3 recomputed from the sealed C24 centre and lot rows: ≥ 10 lots, ≥ 3 per family for C/J/S;
#      ≥ 5 episodes and ≥ 4 entry years; top winning episode share ≤ 0.5);
#   3. the join of every finalist to exactly one FULL validation row of kind 'selected' with the same (arm, id) (a missing,
#      duplicate, cross-arm or label-conflicting row fails); V1–V3 recomputed from the row's raw validation P&L, reset
#      validation DD and whole-run DD;
#   4. c, the candidate, development-only and insufficient-evidence sets, compared with the sealed outcome (results/outcome.json);
#   5. every file hash quoted by the frozen selection and the outcome, and the seal-log entries of those files.
# Any mismatch exits 1 with the list of failures (nothing is written as a pass). Usage:
#   python3 -I tools/msft-d1-growth/reconcile.py [--root <study dir>] [--out <json>]
import hashlib
import json
import math
import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
args = sys.argv[1:]
ROOT = args[args.index('--root') + 1] if '--root' in args else os.path.join(REPO, 'research', 'msft-d1-growth')
OUT = args[args.index('--out') + 1] if '--out' in args else os.path.join(ROOT, 'reports', 'tables', 'outcome-reconciliation.json')
RES = os.path.join(ROOT, 'results')
VAL = os.path.join(RES, 'validation', 'validation.json')
CEILING = 35_000
ARMS = ['D', 'G', 'C', 'J', 'S']
COMBINED = {'C', 'J', 'S'}
ES = {'minLots': 10, 'minFamilyLots': 3, 'minEpisodes': 5, 'minYears': 4, 'maxTopEpisodeShare': 0.5}
DECODE = {'__Inf': float('inf'), '__-Inf': float('-inf'), '__NaN': float('nan')}

failures = []
checks = []


def check(ok, what):
    checks.append({'check': what, 'ok': bool(ok)})
    if not ok:
        failures.append(what)
    return ok


def load(p):
    def hook(o):
        return {k: DECODE.get(v, v) if isinstance(v, str) else v for k, v in o.items()}
    with open(p, encoding='utf-8') as f:
        return json.load(f, object_hook=hook)


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def repo_path(rel):
    # sealed records quote repository-relative paths (research/msft-d1-growth/…); a --root copy maps them into the copy
    pre = 'research/msft-d1-growth/'
    return os.path.join(ROOT, rel[len(pre):]) if rel.startswith(pre) else os.path.join(REPO, rel)


def sufficiency(arm, e):
    c = e['centre']
    fam = c.get('fam') or {}
    d1 = (fam.get('D1') or {}).get('lots', 0)
    g = (fam.get('G') or {}).get('lots', 0)
    years = sorted({r['entry'][:4] for r in (e.get('risk') or {}).get('rows', [])})
    share = c.get('topEpisodeShare')
    share = share if isinstance(share, (int, float)) and math.isfinite(share) else None
    es1 = c['lots'] >= ES['minLots'] and (arm not in COMBINED or (d1 >= ES['minFamilyLots'] and g >= ES['minFamilyLots']))
    es2 = c['episodes'] >= ES['minEpisodes'] and len(years) >= ES['minYears']
    es3 = share is not None and share <= ES['maxTopEpisodeShare']
    return {'lots': c['lots'], 'D1': d1, 'G': g, 'episodes': c['episodes'], 'years': len(years), 'topEpisodeShare': share,
            'ES1': es1, 'ES2': es2, 'ES3': es3, 'd': es1 and es2 and es3}


fz = load(os.path.join(ROOT, 'FROZEN_SELECTION.json'))
seq = load(os.path.join(RES, 'sequential.json'))
val = load(VAL)
out = load(os.path.join(RES, 'outcome.json'))
arm_sel = {a: load(os.path.join(RES, 'selection', f'C24-{a}.json')) for a in ARMS}

# ----- 5. hashes quoted by the sealed records -----
for s in fz['selections'] + fz['slices'] + [fz['sequential']]:
    check(sha(repo_path(s['file'])) == s['sha256'], f"frozen selection quotes {s['file']} sha256 {s['sha256'][:16]}…")
for k in ('frozenSelection', 'validation'):
    s = out[k]
    check(sha(repo_path(s['file'])) == s['sha256'], f"outcome quotes {s['file']} sha256 {s['sha256'][:16]}…")
check(repo_path(out['validation']['file']) == VAL, 'the outcome quotes the validation record read here')
check(repo_path(out['frozenSelection']['file']) == os.path.join(ROOT, 'FROZEN_SELECTION.json'), 'the outcome quotes the frozen selection read here')
c24 = [s for s in fz['selections'] if s.get('cutoff') == 'C24']
check(len(c24) == 1 and val.get('selection', {}).get('sha256') == c24[0]['sha256'] and val['selection']['file'] == c24[0]['file'],
      'the validation evaluated the C24 selection the frozen selection quotes')
check(val.get('door') == 'FULL' and val.get('cutoff') == 'C24', 'the validation ran on the FULL door from the C24 selection')
seals = {}
seal_log = os.path.join(RES, 'seals.jsonl')
if os.path.exists(seal_log):
    with open(seal_log, encoding='utf-8') as f:
        for line in f:
            if line.strip():
                e = json.loads(line)
                seals[e['file']] = e['sha256']
for rel, p in [('research/msft-d1-growth/FROZEN_SELECTION.json', os.path.join(ROOT, 'FROZEN_SELECTION.json')),
               ('research/msft-d1-growth/results/validation/validation.json', VAL),
               ('research/msft-d1-growth/results/sequential.json', os.path.join(RES, 'sequential.json')),
               ('research/msft-d1-growth/results/outcome.json', os.path.join(RES, 'outcome.json'))]:
    check(seals.get(rel) == sha(p), f'seal log entry of {rel} equals its sha256')

# ----- 2b. the sequential procedures, recomputed -----
supported = {}
seq_rows = []
for p in seq['procedures']:
    complete = all(l is not None for l in p['labels'])
    ok = complete and p['net'] > 0 and p['drawdown'] <= CEILING
    check(ok == p['supported'], f"sequential {p['population']}: supported recomputed ({ok}) equals the sealed flag ({p['supported']})")
    check(ok == p['verdict'].startswith('supported'), f"sequential {p['population']}: the verdict text agrees with the recomputed flag")
    supported[p['population']] = ok
    seq_rows.append({'population': p['population'], 'labels': p['labels'], 'net': p['net'], 'drawdown': p['drawdown'], 'supported': ok, 'verdict': p['verdict']})
check(sorted(supported) == sorted(ARMS), 'the sequential record has exactly the five arm procedures')

# ----- 1. the finalist set, re-derived -----
derived = {}
for a in ARMS:
    s = arm_sel[a]
    subj = {}
    for e in s['subjects']:
        check(e['label'] not in subj, f'C24-{a}.json: subject label {e["label"]} is unique')
        subj[e['label']] = e
    entries = [(s['primaries'].get(a), f'primary {a}')]
    entries += [(l, f'role {a}/{r}') for r, l in ((s['roles'].get(a) or {}).get('roles') or {}).items() if r != 'actual-profit']
    for label, role in entries:
        if not label:
            continue
        e = subj.get(label)
        if not check(e is not None, f'{a}: {label} is a subject of C24-{a}.json'):
            continue
        check(e['arm'] == a, f'{a}: {label} is an arm {a} subject')
        k = (a, e['id'])
        if k in derived:
            derived[k]['roles'].append(role)
            check(derived[k]['label'] == label, f'{a}: one id {e["id"]} carries one label')
        else:
            derived[k] = {'arm': a, 'id': e['id'], 'label': label, 'roles': [role], 'qualified': e['qualified'],
                          'centreNet': e['centre']['net'], 'centreDd': e['centre']['dd'], 'sufficiency': sufficiency(a, e)}

for (a, _), d in derived.items():
    # computed for every derived finalist, independently of the frozen list (a finalist missing there must still be scored)
    d['primary'] = f'primary {a}' in d['roles']
    d['b'] = d['primary'] and supported.get(a, False)
    d['d'] = d['sufficiency']['d']

frozen = {}
for f in fz['preDetermination']['finalists']:
    k = (f['arm'], f['id'])
    check(k not in frozen, f'FROZEN_SELECTION: the finalist identity ({f["arm"]}, {f["id"]}) is unique')
    frozen[k] = f
check(set(frozen) == set(derived), f'the frozen finalist identities equal the re-derived set ({len(frozen)} vs {len(derived)})')
for k in sorted(set(frozen) & set(derived), key=lambda k: (ARMS.index(k[0]), k[1])):
    f, d = frozen[k], derived[k]
    check(f['label'] == d['label'] and f['candidateLabel'] == d['label'], f'({k[0]}, {k[1]}): the frozen label equals the selection label (consistency only)')
    check(sorted(f['roles']) == sorted(d['roles']), f'({k[0]}, {k[1]}): roles equal')
    check(f['qualified'] == d['qualified'] and f['a'] == d['qualified'], f'({k[0]}, {k[1]}): a = Q1–Q6 at C24 ({d["qualified"]})')
    check(f['primary'] == d['primary'], f'({k[0]}, {k[1]}): primary flag')
    check(f['b'] == d['b'], f'({k[0]}, {k[1]}): b recomputed ({d["b"]}) equals the frozen flag ({f["b"]})')
    check(f['d'] == d['d'], f'({k[0]}, {k[1]}): d (ES1–ES3) recomputed ({d["d"]}) equals the frozen flag ({f["d"]})')
    fs_ = f.get('sufficiency') or {}
    check((fs_.get('ES1'), fs_.get('ES2'), fs_.get('ES3')) == (d['sufficiency']['ES1'], d['sufficiency']['ES2'], d['sufficiency']['ES3']),
          f'({k[0]}, {k[1]}): ES1–ES3 recomputed equal the frozen ones')

# ----- 3. the validation join by (arm, id) -----
rows = val['rows']
check(val.get('stage') == 'validation', 'results/validation/validation.json is the validation record')
joined = {}
for k, d in derived.items():
    a, i = k
    hits = [r for r in rows if r.get('kind') == 'selected' and r.get('id') == i and r.get('arm') == a]
    other = [r for r in rows if r.get('kind') == 'selected' and r.get('id') == i and r.get('arm') != a]
    if not check(len(hits) == 1, f'({a}, {i}): exactly one selected validation row has this identity (found {len(hits)}; cross-arm {len(other)})'):
        continue
    r = hits[0]
    check(isinstance(r.get('label'), str) and r['label'] == d['label'], f'({a}, {i}): the row label equals the finalist label (consistency only)')
    v = r.get('validation')
    if not check(isinstance(v, dict) and all(isinstance(v.get(x), bool) for x in ('V1', 'V2', 'V3')), f'({a}, {i}): V1–V3 present and boolean'):
        continue
    V1, V2, V3 = r['sliceNet'] > 0, r['sliceDd'] <= CEILING, r['wholeDd'] <= CEILING
    check((V1, V2, V3) == (v['V1'], v['V2'], v['V3']), f'({a}, {i}): V1–V3 recomputed from the raw figures equal the row flags')
    joined[k] = {**d, 'validationNet': r['sliceNet'], 'validationResetDd': r['sliceDd'], 'fullNet': r['wholeNet'], 'fullDd': r['wholeDd'],
                 'V1': V1, 'V2': V2, 'V3': V3, 'c': V1 and V2 and V3}
selected_ids = {(r.get('arm'), r.get('id')) for r in rows if r.get('kind') == 'selected'}
check(len(selected_ids) == len([r for r in rows if r.get('kind') == 'selected']), 'no two selected validation rows share an identity')

# ----- 4. the outcome sets -----
def ids(xs):
    return sorted((x['arm'], x['id']) for x in xs)


cand = sorted(k for k, j in joined.items() if j['qualified'] and j['b'] and j['c'] and j['d'])
dev = sorted(k for k, j in joined.items() if j['qualified'] and j['primary'] and not j['b'] and j['c'])
thin = sorted(k for k, j in joined.items() if j['qualified'] and j['primary'] and j['b'] and j['c'] and not j['d'])
check(ids(out['candidates']) == cand, f'the outcome candidates equal the recomputed set ({len(cand)})')
check(ids(out['developmentOnly']) == dev, f'the outcome development-only set equals the recomputed set ({len(dev)})')
check(ids(out['insufficientEvidence']) == thin, f'the outcome insufficient-evidence set equals the recomputed set ({len(thin)})')
check(out['outcome'].startswith('MSFT RESEARCH CANDIDATE') == bool(cand), 'the outcome text matches the candidate set')
of = {(f['arm'], f['id']): f for f in out['finalists']}
check(set(of) == set(joined), 'the outcome lists every finalist exactly once')
for k, j in joined.items():
    f = of.get(k)
    if f is None:
        continue
    check((f['validation']['V1'], f['validation']['V2'], f['validation']['V3'], f['c'], f['d']) == (j['V1'], j['V2'], j['V3'], j['c'], j['d']),
          f'({k[0]}, {k[1]}): the outcome V1–V3, c and d equal the recomputation')
    check(f.get('validation') is not None, f'({k[0]}, {k[1]}): never validation null (the P6-TSLA defect)')

result = {
    'kind': 'P9-MSFT independent outcome reconciliation (report-only; tools/msft-d1-growth/reconcile.py; a separate implementation that never imports the study code)',
    'ok': not failures,
    'checks': len(checks),
    'failed': failures,
    'identity': '(arm, id); labels compared for consistency only',
    'sufficiencyRule': ES,
    'sequential': seq_rows,
    'finalists': [joined.get(k, derived[k]) for k in sorted(derived, key=lambda k: (ARMS.index(k[0]), k[1]))],
    'candidates': [{'arm': a, 'id': i} for a, i in cand],
    'developmentOnly': [{'arm': a, 'id': i} for a, i in dev],
    'insufficientEvidence': [{'arm': a, 'id': i} for a, i in thin],
    'outcome': out['outcome'],
    'hashes': {'FROZEN_SELECTION.json': sha(os.path.join(ROOT, 'FROZEN_SELECTION.json')), 'results/validation/validation.json': sha(VAL),
               'results/sequential.json': sha(os.path.join(RES, 'sequential.json')), 'results/outcome.json': sha(os.path.join(RES, 'outcome.json'))},
    'checkList': checks
}


def finite(o):
    # the sealed records' non-finite encoding, kept for the reconciliation output
    if isinstance(o, float) and o != o:
        return '__NaN'
    if isinstance(o, float) and o in (float('inf'), float('-inf')):
        return '__Inf' if o > 0 else '__-Inf'
    if isinstance(o, dict):
        return {k: finite(v) for k, v in o.items()}
    if isinstance(o, list):
        return [finite(v) for v in o]
    return o


os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(finite(result), f, indent=1, allow_nan=False, default=str)
    f.write('\n')
print(json.dumps({'ok': result['ok'], 'checks': len(checks), 'failed': failures[:20], 'candidates': len(cand), 'developmentOnly': len(dev), 'insufficientEvidence': len(thin)}))
sys.exit(0 if not failures else 1)
