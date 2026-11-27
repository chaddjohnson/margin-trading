#!/usr/bin/env python3
# P8-GDX mutation tests of the independent outcome reconciliation (tools/gdx-d1-growth/reconcile.py) — report-only.
# Copies the sealed records the reconciler reads into a scratch directory, applies one mutation per case, runs the
# reconciler on the copy (--root) and requires (1) exit 1 and (2) a failure of the named SEMANTIC check — not only the
# file-hash checks, which every mutation also trips. The unmodified copy must pass. Usage:
#   python3 -I tools/gdx-d1-growth/reconcile-mutations.py <scratch dir> [--out <json>]
import json
import os
import shutil
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUDY = os.path.join(REPO, 'research', 'gdx-d1-growth')
RECONCILE = os.path.join(REPO, 'tools', 'gdx-d1-growth', 'reconcile.py')
args = sys.argv[1:]
if not args or args[0].startswith('--'):
    sys.exit('usage: reconcile-mutations.py <scratch dir> [--out <json>]')
SCRATCH = os.path.abspath(args[0])
OUT = args[args.index('--out') + 1] if '--out' in args else os.path.join(STUDY, 'reports', 'tables', 'outcome-reconciliation-mutations.json')
FILES = ['FROZEN_SELECTION.json', 'results/sequential.json', 'results/validation/validation.json', 'results/outcome.json',
         'results/seals.jsonl'] + [f'results/selection/C{c}.json' for c in (19, 21, 23, 24)] + \
        [f'results/selection/C24-{a}.json' for a in 'DGCJS'] + [f'results/slices/C{c}.json' for c in (19, 21, 23)]


def fresh(case):
    root = os.path.join(SCRATCH, case)
    if os.path.exists(root):
        shutil.rmtree(root)
    for rel in FILES:
        os.makedirs(os.path.dirname(os.path.join(root, rel)), exist_ok=True)
        shutil.copyfile(os.path.join(STUDY, rel), os.path.join(root, rel))  # real copies, never links
    return root


def rw(root, rel, fn):
    p = os.path.join(root, rel)
    with open(p, encoding='utf-8') as f:
        o = json.load(f)
    fn(o)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(o, f)


def run(root):
    out = os.path.join(root, 'reconciliation.json')
    p = subprocess.run([sys.executable, '-I', RECONCILE, '--root', root, '--out', out], capture_output=True, text=True)
    failed = []
    if os.path.exists(out):  # the reconciler writes its output only after every check ran; a crash leaves none (a FAIL here)
        with open(out, encoding='utf-8') as f:
            failed = json.load(f)['failed']
    return p.returncode, failed, p.stderr.strip()[-400:] if not os.path.exists(out) else ''


def row(v, pop, primary=True):
    rs = [r for r in v['rows'] if r['kind'] == 'selected' and pop in r['populations'] and any(x.startswith(f'primary {pop}/') for x in r['roles'])]
    assert len(rs) == 1, (pop, len(rs))
    return rs[0]


def m_swap_dev_id(o):          # outcome.json: the development-only G entry points at another G finalist's id
    g = [f for f in o['finalists'] if f['arm'] == 'G' and not f['primary']][0]
    o['developmentOnly'][0]['id'] = g['id']


def m_flip_v(v):               # validation.json: D primary's V1 flag flipped (its raw P&L is negative)
    r = row(v, 'D')
    r['validation']['V1'] = not r['validation']['V1']


def m_dup_row(v):              # validation.json: G primary's row duplicated
    v['rows'].append(json.loads(json.dumps(row(v, 'G'))))


def m_cross_pop(v):            # validation.json: G primary's row re-labelled as a C row (cross-population)
    r = row(v, 'G')
    r['populations'] = ['C']


def m_arm_conflict(v):         # validation.json: C primary's record arm changed to J
    row(v, 'C')['arm'] = 'J'


def m_raw_net(v):              # validation.json: D primary's raw P&L made positive while the flags stay
    row(v, 'D')['sliceNet'] = 1.0


def m_drop_finalist(fz):       # FROZEN_SELECTION.json: one finalist removed from the immutable identity list
    fs = fz['preDetermination']['finalists']
    drop = [i for i, f in enumerate(fs) if f['arm'] == 'S' and not f['primary']][0]
    fz['preDetermination']['finalists'] = fs[:drop] + fs[drop + 1:]


def m_frozen_id(fz):           # FROZEN_SELECTION.json: J primary's id replaced
    f = [f for f in fz['preDetermination']['finalists'] if f['arm'] == 'J' and f['primary']][0]
    f['id'] = 'rc1-0000000000000000'


def m_seq_flag(s):             # sequential.json: S procedure marked supported although its DD > $35,000
    p = [p for p in s['procedures'] if p['population'] == 'S'][0]
    p['supported'] = True


def m_seq_dd(s):               # sequential.json: S drawdown lowered under the ceiling (flags unchanged)
    p = [p for p in s['procedures'] if p['population'] == 'S'][0]
    p['drawdown'] = 30000.0


def m_candidate(o):            # outcome.json: a candidate inserted
    o['candidates'] = [{'arm': 'C', 'label': o['developmentOnly'][1]['label'], 'id': o['developmentOnly'][1]['id']}]


def m_outcome_c(o):            # outcome.json: S primary's c flipped
    f = [f for f in o['finalists'] if f['arm'] == 'S' and f['primary']][0]
    f['c'] = not f['c']


CASES = [
    ('swap a development-only id (outcome)', 'results/outcome.json', m_swap_dev_id, 'development-only set equals'),
    ('flip a V flag (validation row)', 'results/validation/validation.json', m_flip_v, 'V1–V3 recomputed from the raw figures'),
    ('duplicate a validation row', 'results/validation/validation.json', m_dup_row, 'exactly one selected validation row'),
    ('cross-population validation row', 'results/validation/validation.json', m_cross_pop, 'exactly one selected validation row'),
    ('record-arm conflict in a validation row', 'results/validation/validation.json', m_arm_conflict, 'the row record arm'),
    ('raw validation P&L changed, flags kept', 'results/validation/validation.json', m_raw_net, 'V1–V3 recomputed from the raw figures'),
    ('finalist removed from FROZEN_SELECTION', 'FROZEN_SELECTION.json', m_drop_finalist, 'frozen finalist identities equal the re-derived set'),
    ('frozen finalist id replaced', 'FROZEN_SELECTION.json', m_frozen_id, 'frozen finalist identities equal the re-derived set'),
    ('sequential supported flag forged', 'results/sequential.json', m_seq_flag, 'supported recomputed'),
    ('sequential drawdown forged', 'results/sequential.json', m_seq_dd, 'supported recomputed'),
    ('candidate inserted into the outcome', 'results/outcome.json', m_candidate, 'outcome candidates equal'),
    ('outcome c flag flipped', 'results/outcome.json', m_outcome_c, 'the outcome V1–V3 and c equal'),
]

os.makedirs(SCRATCH, exist_ok=True)
results = []
base = fresh('unmodified')
code, failed, err = run(base)
results.append({'case': 'unmodified copy', 'exit': code, 'expected': 'exit 0, no failure', 'pass': code == 0 and not failed, 'failed': failed})
for name, rel, fn, needle in CASES:
    root = fresh(name.replace(' ', '-').replace('/', '-'))
    rw(root, rel, fn)
    code, failed, err = run(root)
    semantic = [f for f in failed if needle in f]
    results.append({'case': name, 'file': rel, 'exit': code, 'expected': f'exit 1 and a failure containing "{needle}"',
                    'pass': code == 1 and bool(semantic), 'semanticFailures': semantic,
                    'hashFailures': [f for f in failed if 'sha256' in f], 'stderr': err})
    shutil.rmtree(root)
shutil.rmtree(base)
ok = all(r['pass'] for r in results)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump({'kind': 'P8-GDX reconciliation mutation tests (report-only; tools/gdx-d1-growth/reconcile-mutations.py)', 'ok': ok,
               'cases': len(results), 'passed': sum(r['pass'] for r in results), 'results': results}, f, indent=1)
    f.write('\n')
for r in results:
    print(('PASS ' if r['pass'] else 'FAIL ') + r['case'] + ' — exit ' + str(r['exit']) + ' — ' + '; '.join((r.get('semanticFailures') or r.get('failed') or [])[:2])[:200])
sys.exit(0 if ok else 1)
