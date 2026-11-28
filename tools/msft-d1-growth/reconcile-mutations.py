#!/usr/bin/env python3
# P9-MSFT mutation tests of the independent outcome reconciliation (tools/msft-d1-growth/reconcile.py) — report-only.
# Copies the sealed records the reconciler reads into a scratch directory, applies one deliberately forged or misaligned
# change per case, runs the reconciler on the copy (--root) and requires (1) exit 1 and (2) a failure of the named
# SEMANTIC check — not only the file-hash checks, which every mutation also trips. The unmodified copy must pass. The cases
# are written so that each forges an inconsistency whatever the sealed outcome is (no case assumes a particular result).
#   python3 -I tools/msft-d1-growth/reconcile-mutations.py <scratch dir> [--out <json>]
import json
import os
import shutil
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUDY = os.path.join(REPO, 'research', 'msft-d1-growth')
RECONCILE = os.path.join(REPO, 'tools', 'msft-d1-growth', 'reconcile.py')
args = sys.argv[1:]
if not args or args[0].startswith('--'):
    sys.exit('usage: reconcile-mutations.py <scratch dir> [--out <json>]')
SCRATCH = os.path.abspath(args[0])
OUT = args[args.index('--out') + 1] if '--out' in args else os.path.join(STUDY, 'reports', 'tables', 'outcome-reconciliation-mutations.json')
FILES = ['FROZEN_SELECTION.json', 'results/sequential.json', 'results/validation/validation.json', 'results/outcome.json',
         'results/seals.jsonl'] + [f'results/selection/C{c}.json' for c in (19, 21, 23, 24)] + \
        [f'results/selection/C24-{a}.json' for a in 'DGCJS'] + [f'results/slices/C{c}.json' for c in (19, 21, 23)]
CEILING = 35_000


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


with open(os.path.join(STUDY, 'results', 'outcome.json'), encoding='utf-8') as f:
    OUTCOME = json.load(f)
FIN = OUTCOME['finalists']
PRIM = [f for f in FIN if f['primary']]
P0 = PRIM[0]                                  # a primary finalist (every case below targets identities that exist)
OTHER_ARM = [a for a in 'DGCJS' if a != P0['arm']][0]


def prow(v, f=P0):
    rs = [r for r in v['rows'] if r.get('kind') == 'selected' and r['arm'] == f['arm'] and r['id'] == f['id']]
    assert len(rs) == 1, (f['arm'], f['id'], len(rs))
    return rs[0]


def m_flip_v(v):                # validation row: V1 flag flipped, raw figures kept
    r = prow(v)
    r['validation']['V1'] = not r['validation']['V1']


def m_raw_net(v):               # validation row: raw P&L sign flipped, flags kept
    r = prow(v)
    r['sliceNet'] = -r['sliceNet'] if r['sliceNet'] != 0 else 1.0


def m_dup_row(v):               # validation: a finalist's row duplicated
    v['rows'].append(json.loads(json.dumps(prow(v))))


def m_cross_arm(v):             # validation: a finalist's row moved to another arm (cross-arm identity)
    prow(v)['arm'] = OTHER_ARM


def m_control(v):               # validation: a finalist's row re-kinded as a control (never eligible)
    prow(v)['kind'] = 'control'


def m_label(v):                 # validation: a finalist's row carries another candidate label (misaligned record)
    prow(v)['label'] = prow(v)['label'] + ' (forged)'


def m_drop_row(v):              # validation: a finalist's row removed (the P6-TSLA "validation: null" situation)
    r = prow(v)
    v['rows'] = [x for x in v['rows'] if x is not r]


def m_drop_finalist(fz):        # FROZEN_SELECTION: one finalist removed from the immutable identity list
    fz['preDetermination']['finalists'] = fz['preDetermination']['finalists'][1:]


def m_frozen_id(fz):            # FROZEN_SELECTION: a primary's id replaced
    f = [f for f in fz['preDetermination']['finalists'] if f['primary']][0]
    f['id'] = 'rc1-0000000000000000'


def m_frozen_d(fz):             # FROZEN_SELECTION: a finalist's sufficiency flag d flipped
    f = fz['preDetermination']['finalists'][0]
    f['d'] = not f['d']


def m_seq_flag(s):              # sequential: a procedure's supported flag flipped
    p = s['procedures'][0]
    p['supported'] = not p['supported']


def m_seq_dd(s):                # sequential: a procedure's drawdown moved across the ceiling (flags unchanged)
    p = s['procedures'][0]
    p['drawdown'] = 30000.0 if p['drawdown'] > CEILING else 40000.0
    if all(l is not None for l in p['labels']) and p['net'] > 0:
        return
    p['net'] = 1.0 if p['net'] <= 0 else p['net']          # make the recomputed flag depend on the forged drawdown
    p['labels'] = [l if l is not None else 'forged' for l in p['labels']]


def m_candidate(o):             # outcome: a candidate inserted (or the candidate list emptied)
    if o['candidates']:
        o['candidates'] = []
    else:
        o['candidates'] = [{'arm': P0['arm'], 'label': P0['candidateLabel'], 'id': P0['id'], 'sufficient': True}]


def m_devonly(o):               # outcome: the development-only list changed (an entry added or removed)
    if o['developmentOnly']:
        o['developmentOnly'] = o['developmentOnly'][1:]
    else:
        o['developmentOnly'] = [{'arm': P0['arm'], 'label': P0['candidateLabel'], 'id': P0['id'], 'sufficient': P0['d']}]


def m_outcome_c(o):             # outcome: a finalist's c flipped
    f = o['finalists'][0]
    f['c'] = not f['c']


def m_outcome_null(o):          # outcome: a finalist's validation set to null (the P6-TSLA defect)
    o['finalists'][0]['validation'] = None


def m_subject_lots(s):          # arm selection: the C24 primary's lot count forged across the ES1 threshold
    lab = s['primaries'][P0['arm']]
    e = [x for x in s['subjects'] if x['label'] == lab][0]
    e['centre']['lots'] = 0 if e['centre']['lots'] >= 10 else 100
    e['centre']['episodes'] = max(e['centre']['episodes'], 100)


CASES = [
    ('flip a V flag (validation row)', 'results/validation/validation.json', m_flip_v, 'V1–V3 recomputed from the raw figures'),
    ('raw validation P&L changed, flags kept', 'results/validation/validation.json', m_raw_net, 'V1–V3 recomputed from the raw figures'),
    ('duplicate a validation row', 'results/validation/validation.json', m_dup_row, 'exactly one selected validation row'),
    ('cross-arm validation row', 'results/validation/validation.json', m_cross_arm, 'exactly one selected validation row'),
    ('validation row re-kinded as a control', 'results/validation/validation.json', m_control, 'exactly one selected validation row'),
    ('validation row with a forged candidate label', 'results/validation/validation.json', m_label, 'the row label equals the finalist label'),
    ('validation row removed (missing identity)', 'results/validation/validation.json', m_drop_row, 'exactly one selected validation row'),
    ('finalist removed from FROZEN_SELECTION', 'FROZEN_SELECTION.json', m_drop_finalist, 'frozen finalist identities equal the re-derived set'),
    ('frozen finalist id replaced', 'FROZEN_SELECTION.json', m_frozen_id, 'frozen finalist identities equal the re-derived set'),
    ('frozen sufficiency flag forged', 'FROZEN_SELECTION.json', m_frozen_d, 'd (ES1–ES3) recomputed'),
    ('sequential supported flag forged', 'results/sequential.json', m_seq_flag, 'supported recomputed'),
    ('sequential drawdown forged', 'results/sequential.json', m_seq_dd, 'supported recomputed'),
    ('candidate list forged in the outcome', 'results/outcome.json', m_candidate, 'outcome candidates equal'),
    ('development-only list forged in the outcome', 'results/outcome.json', m_devonly, 'development-only set equals'),
    ('outcome c flag flipped', 'results/outcome.json', m_outcome_c, 'the outcome V1–V3, c and d equal'),
    ('outcome validation set to null (P6-TSLA defect)', 'results/outcome.json', m_outcome_null, 'never validation null'),
    ('arm-selection lot count forged across ES1', f'results/selection/C24-{P0["arm"]}.json', m_subject_lots, 'd (ES1–ES3) recomputed'),
]

os.makedirs(SCRATCH, exist_ok=True)
results = []
base = fresh('unmodified')
code, failed, err = run(base)
results.append({'case': 'unmodified copy', 'exit': code, 'expected': 'exit 0, no failure', 'pass': code == 0 and not failed, 'failed': failed, 'stderr': err})
for name, rel, fn, needle in CASES:
    root = fresh(name.replace(' ', '-').replace('/', '-').replace('(', '').replace(')', ''))
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
    json.dump({'kind': 'P9-MSFT reconciliation mutation tests (report-only; tools/msft-d1-growth/reconcile-mutations.py)', 'ok': ok,
               'cases': len(results), 'passed': sum(r['pass'] for r in results), 'results': results}, f, indent=1)
    f.write('\n')
for r in results:
    print(('PASS ' if r['pass'] else 'FAIL ') + r['case'] + ' — exit ' + str(r['exit']) + ' — ' + '; '.join((r.get('semanticFailures') or r.get('failed') or [])[:2])[:200])
sys.exit(0 if ok else 1)
