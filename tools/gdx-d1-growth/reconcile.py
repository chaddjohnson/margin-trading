#!/usr/bin/env python3
# P8-GDX independent outcome reconciliation (brief Phase 7; PROTOCOL §12) — report-only; reads sealed JSON only and never
# imports the study's TypeScript. It re-derives, by a separate implementation:
#   1. the C24 finalist set of every nominating population (D, G, C, J, S; informed D+, G+, C+) from the sealed arm
#      selections (each population's primary and its non-actual-profit roles), and compares it with FROZEN_SELECTION.json
#      by the identity (population, id) — labels are compared only as a consistency check, never used to join;
#   2. each finalist's development flag a (= Q1–Q6 at C24 of its record-arm subject) and chronological flag b (= primary of
#      an INDEPENDENT population whose sequential procedure is supported; recomputed from the sequential record's own net,
#      drawdown and fold labels);
#   3. the join of every finalist to exactly one FULL validation row of kind 'selected' with the same record arm and id
#      whose `populations` holds the finalist's population (a missing, duplicate, cross-population or record-arm-conflicting
#      row fails); V1–V3 recomputed from the row's raw validation P&L, reset validation DD and whole-run DD;
#   4. c, the candidate set, the development-only and the informed development-only sets, and compares them with the
#      sealed outcome record (results/outcome.json);
#   5. every file hash quoted by the frozen selection and the outcome, and the seal log entries of those files.
# Any mismatch exits 1 with the list of failures (nothing is written as a pass). Usage:
#   python3 -I tools/gdx-d1-growth/reconcile.py [--root <study dir>] [--out <json>]
import hashlib
import json
import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
args = sys.argv[1:]
ROOT = args[args.index('--root') + 1] if '--root' in args else os.path.join(REPO, 'research', 'gdx-d1-growth')
OUT = args[args.index('--out') + 1] if '--out' in args else os.path.join(ROOT, 'reports', 'tables', 'outcome-reconciliation.json')
RES = os.path.join(ROOT, 'results')
VAL = os.path.join(RES, 'validation', 'validation.json')
CEILING = 35_000
INDEPENDENT = ['D', 'G', 'C', 'J', 'S']
INFORMED = {'D+': 'D', 'G+': 'G', 'C+': 'C'}
NOMINATING = INDEPENDENT + list(INFORMED)
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
    # sealed records quote repository-relative paths (research/gdx-d1-growth/…); a --root copy maps them into the copy
    pre = 'research/gdx-d1-growth/'
    return os.path.join(ROOT, rel[len(pre):]) if rel.startswith(pre) else os.path.join(REPO, rel)


record_arm = lambda p: INFORMED.get(p, p)

fz = load(os.path.join(ROOT, 'FROZEN_SELECTION.json'))
seq = load(os.path.join(RES, 'sequential.json'))
val = load(VAL)
out = load(os.path.join(RES, 'outcome.json'))
arm_sel = {a: load(os.path.join(RES, 'selection', f'C24-{a}.json')) for a in INDEPENDENT}

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
for rel, p in [('research/gdx-d1-growth/FROZEN_SELECTION.json', os.path.join(ROOT, 'FROZEN_SELECTION.json')),
               ('research/gdx-d1-growth/results/validation/validation.json', VAL),
               ('research/gdx-d1-growth/results/sequential.json', os.path.join(RES, 'sequential.json')),
               ('research/gdx-d1-growth/results/outcome.json', os.path.join(RES, 'outcome.json'))]:
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
check(sorted(supported) == sorted(INDEPENDENT), 'the sequential record has exactly the five independent procedures')

# ----- 1. the finalist set, re-derived -----
derived = {}
for pop in NOMINATING:
    a = record_arm(pop)
    s = arm_sel[a]
    if pop not in s['primaries']:
        check(False, f'C24-{a}.json has the population {pop}')
        continue
    subj = {}
    for e in s['subjects']:
        check(e['label'] not in subj, f'C24-{a}.json: subject label {e["label"]} is unique')
        subj[e['label']] = e
    entries = [(s['primaries'][pop], f'primary {pop}')]
    entries += [(l, f'role {pop}/{r}') for r, l in (s['roles'].get(pop, {}).get('roles', {}) or {}).items() if r != 'actual-profit']
    for label, role in entries:
        if not label:
            continue
        e = subj.get(label)
        if not check(e is not None, f'{pop}: {label} is a subject of C24-{a}.json'):
            continue
        k = (pop, e['id'])
        if k in derived:
            derived[k]['roles'].append(role)
            check(derived[k]['label'] == label, f'{pop}: one id {e["id"]} carries one label')
        else:
            derived[k] = {'arm': pop, 'recordArm': a, 'id': e['id'], 'label': label, 'roles': [role], 'qualified': e['qualified'],
                          'centreNet': e['centre']['net'], 'centreDd': e['centre']['dd']}

for (pop, _), d in derived.items():
    # computed for every derived finalist, independently of the frozen list (a finalist missing there must still be scored)
    d['primary'] = f'primary {pop}' in d['roles']
    d['informed'] = pop in INFORMED
    d['b'] = d['primary'] and not d['informed'] and supported.get(pop, False)

frozen = {}
for f in fz['preDetermination']['finalists']:
    k = (f['arm'], f['id'])
    check(k not in frozen, f'FROZEN_SELECTION: the finalist identity ({f["arm"]}, {f["id"]}) is unique')
    frozen[k] = f
check(set(frozen) == set(derived), f'the frozen finalist identities equal the re-derived set ({len(frozen)} vs {len(derived)})')
for k in sorted(set(frozen) & set(derived), key=lambda k: (NOMINATING.index(k[0]), k[1])):
    f, d = frozen[k], derived[k]
    check(f['label'] == d['label'], f'({k[0]}, {k[1]}): the frozen label equals the selection label (consistency only)')
    check(sorted(f['roles']) == sorted(d['roles']), f'({k[0]}, {k[1]}): roles equal')
    check(f['recordArm'] == d['recordArm'], f'({k[0]}, {k[1]}): record arm equals')
    check(f['qualified'] == d['qualified'] and f['a'] == d['qualified'], f'({k[0]}, {k[1]}): a = Q1–Q6 at C24 ({d["qualified"]})')
    check(f['primary'] == d['primary'] and f['informed'] == d['informed'], f'({k[0]}, {k[1]}): primary / informed flags')
    check(f['b'] == d['b'], f'({k[0]}, {k[1]}): b recomputed ({d["b"]}) equals the frozen flag ({f["b"]})')

# ----- 3. the validation join by (population, id) -----
rows = val['rows']
check(val.get('stage') == 'validation', 'results/validation/validation.json is the validation record')
joined = {}
for k, d in derived.items():
    pop, i = k
    hits = [r for r in rows if r.get('kind') == 'selected' and r.get('id') == i and pop in (r.get('populations') or [])]
    if not check(len(hits) == 1, f'({pop}, {i}): exactly one selected validation row claims this identity (found {len(hits)})'):
        continue
    r = hits[0]
    check(r['arm'] == d['recordArm'], f'({pop}, {i}): the row record arm {r["arm"]} equals the finalist record arm {d["recordArm"]}')
    check(isinstance(r.get('label'), str) and r['label'] == d['label'], f'({pop}, {i}): the row label equals the finalist label (consistency only)')
    v = r.get('validation')
    if not check(isinstance(v, dict) and all(isinstance(v.get(x), bool) for x in ('V1', 'V2', 'V3')), f'({pop}, {i}): V1–V3 present and boolean'):
        continue
    V1, V2, V3 = r['sliceNet'] > 0, r['sliceDd'] <= CEILING, r['wholeDd'] <= CEILING
    check((V1, V2, V3) == (v['V1'], v['V2'], v['V3']), f'({pop}, {i}): V1–V3 recomputed from the raw figures equal the row flags')
    joined[k] = {**d, 'validationNet': r['sliceNet'], 'validationResetDd': r['sliceDd'], 'fullNet': r['wholeNet'], 'fullDd': r['wholeDd'],
                 'V1': V1, 'V2': V2, 'V3': V3, 'c': V1 and V2 and V3}
claimed = {(p, r['id']) for r in rows if r.get('kind') == 'selected' for p in (r.get('populations') or [])}
unclaimed = sorted(claimed - set(derived))
check(all(p not in NOMINATING for p, _ in unclaimed), 'every validation identity of a nominating population is a finalist')

# ----- 4. the outcome sets -----
def ids(xs):
    return sorted((x['arm'], x['id']) for x in xs)


cand = sorted(k for k, j in joined.items() if j['qualified'] and j['b'] and j['c'])
dev = sorted(k for k, j in joined.items() if j['qualified'] and j['primary'] and not j['informed'] and not j['b'] and j['c'])
inf = sorted(k for k, j in joined.items() if j['qualified'] and j['primary'] and j['informed'] and j['c'])
check(ids(out['candidates']) == cand, f'the outcome candidates equal the recomputed set ({len(cand)})')
check(ids(out['developmentOnly']) == dev, f'the outcome development-only set equals the recomputed set ({len(dev)})')
check(ids(out['informedDevelopmentOnly']) == inf, f'the outcome informed development-only set equals the recomputed set ({len(inf)})')
check(out['outcome'].startswith('GDX RESEARCH CANDIDATE') == bool(cand), 'the outcome text matches the candidate set')
of = {(f['arm'], f['id']): f for f in out['finalists']}
check(set(of) == set(joined), 'the outcome lists every finalist exactly once')
for k, j in joined.items():
    f = of.get(k)
    if f is None:
        continue
    check((f['validation']['V1'], f['validation']['V2'], f['validation']['V3'], f['c']) == (j['V1'], j['V2'], j['V3'], j['c']),
          f'({k[0]}, {k[1]}): the outcome V1–V3 and c equal the recomputation')

result = {
    'kind': 'P8-GDX independent outcome reconciliation (report-only; tools/gdx-d1-growth/reconcile.py; a separate implementation that never imports the study code)',
    'ok': not failures,
    'checks': len(checks),
    'failed': failures,
    'identity': '(population, id); labels compared for consistency only',
    'sequential': seq_rows,
    'finalists': [joined.get(k, derived[k]) for k in sorted(derived, key=lambda k: (NOMINATING.index(k[0]), k[1]))],
    'unclaimedValidationIdentities': [{'population': p, 'id': i} for p, i in unclaimed],
    'candidates': [{'arm': a, 'id': i} for a, i in cand],
    'developmentOnly': [{'arm': a, 'id': i} for a, i in dev],
    'informedDevelopmentOnly': [{'arm': a, 'id': i} for a, i in inf],
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
print(json.dumps({'ok': result['ok'], 'checks': len(checks), 'failed': failures[:20], 'candidates': len(cand), 'developmentOnly': len(dev), 'informedDevelopmentOnly': len(inf)}))
sys.exit(0 if not failures else 1)
