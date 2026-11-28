#!/usr/bin/env python3
# P8-GDX — FINAL_CANDIDATES.md and OUTCOME_IDENTITY_RECONCILIATION.md: each = its hand-written narrative
# (reports/narrative/FINAL.md, RECON.md) followed by tables generated here from the sealed outcome, the frozen selection, the
# sealed validation and the independent reconciliation outputs (reports/tables/outcome-reconciliation*.json). Report-only.
#   python3 -I tools/gdx-d1-growth/final-md.py
import json
import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ST = os.path.join(REPO, 'research', 'gdx-d1-growth')
J = lambda *p: json.load(open(os.path.join(ST, *p), encoding='utf-8'))
O = J('results', 'outcome.json')
V = J('results', 'validation', 'validation.json')
FZ = J('FROZEN_SELECTION.json')
SEQ = J('results', 'sequential.json')
REC = J('reports', 'tables', 'outcome-reconciliation.json')
MUT = J('reports', 'tables', 'outcome-reconciliation-mutations.json')


def m(x):
    if x is None:
        return '—'
    return ('−$' if x < 0 else '$') + f'{abs(x):,.2f}'


def ok(b):
    return '✓' if b else '✗'


rows = {(r['id'], p): r for r in V['rows'] if r['kind'] == 'selected' for p in r['populations']}

fin = ['## A. Every finalist, joined by (population, id) — the sealed outcome record', '',
       'a = Q1–Q6 at C24; b = the primary of an independent population whose sequential procedure is supported; c = V1 ∧ V2 ∧ V3 on '
       'the single 2025-01-02 → 2026-10-30 evaluation (V1 validation P&L > 0; V2 validation reset DD ≤ $35,000; V3 whole-run DD ≤ $35,000). '
       'Candidate = a ∧ b ∧ c; development-only = a primary of an independent population with a ∧ ¬b ∧ c; informed development-only = an '
       'informed primary with a ∧ c.', '',
       '| Population | Identity (id) | Label | Roles | Governance | Dev net / DD | Val. P&L | Val. reset DD | Whole-run net / DD | a | b | V1 V2 V3 | c | Result |',
       '|---|---|---|---|---|---:|---:|---:|---:|:---:|:---:|:---:|:---:|---|']
for f in O['finalists']:
    r = rows[(f['id'], f['arm'])]
    v = f['validation']
    res = 'CANDIDATE' if f['candidate'] else 'development-only' if f['developmentOnly'] else 'informed development-only' if f['informedDevelopmentOnly'] else '—'
    fin.append(f"| {f['arm']}{' (informed)' if f['informed'] else ''} | `{f['id']}` | `{f['label']}` | {'; '.join(f['roles'])} | {f['governanceLabel']} | "
               f"{m(f['centreNet'])} / {m(f['centreDd'])} | {m(r['sliceNet'])} | {m(r['sliceDd'])} | {m(r['wholeNet'])} / {m(r['wholeDd'])} | {ok(f['a'])} | {ok(f['b'])} | "
               f"{ok(v['V1'])} {ok(v['V2'])} {ok(v['V3'])} | {ok(f['c'])} | {res} |")
fin += ['', f"**Sealed outcome:** {O['outcome']}", '', f"Ceiling: {O['ceiling']}.", '',
        f"Candidates: {len(O['candidates'])}. Development-only: " + ('; '.join(f"{x['arm']} `{x['id']}` `{x['label']}`" for x in O['developmentOnly']) or 'none') +
        f". Informed development-only: {'; '.join(x['arm'] + ' `' + x['id'] + '`' for x in O['informedDevelopmentOnly']) or 'none'}.", '']
fin += ['## B. The chronological procedures (sealed `results/sequential.json`)', '',
        '| Population | Fold primaries C19 → C21 → C23 | Net 2020–2024 | DD | Supported |', '|---|---|---:|---:|:---:|']
for p in SEQ['procedures']:
    fin.append(f"| {p['population']} | {' → '.join('`' + (l or 'none') + '`' for l in p['labels'])} | {m(p['net'])} | {m(p['drawdown'])} | {ok(p['supported'])} |")
fin += ['', '## C. External controls on the same validation (descriptive; chosen with 2016–2026 in view — never candidates)', '',
        '| Control | Arm | Val. P&L | Val. reset DD | Whole-run net | Whole-run DD |', '|---|---|---:|---:|---:|---:|']
for r in V['rows']:
    if r['kind'] == 'control':
        fin.append(f"| `{r['label']}` | {r['arm']} | {m(r['sliceNet'])} | {m(r['sliceDd'])} | {m(r['wholeNet'])} | {m(r['wholeDd'])} |")
fin += ['', '## D. The validation evaluation', '',
        f"Door {V['door']}, slice from {V['slice']} (boundary {V['boundary']}), job `{V['job']}`, attestation `{V['attestation']}`, backend `{V['backend']}`, "
        f"head `{V['head']}`, {V['requested']:,} requested ({V['compute']['fresh']:,} fresh, {V['compute']['archiveHits']} archive hits, {V['compute']['wallSeconds']} s), "
        f"finished {V['finished']}. Label: {V['label']}. Basis: {V['basis']}", '']

rec = ['## A. Independent reconciliation (`tools/gdx-d1-growth/reconcile.py`; a separate Python implementation that never imports the study code)', '',
       f"Result: **{'PASS' if REC['ok'] else 'FAIL'}** — {REC['checks']} checks, {len(REC['failed'])} failed. Identity: {REC['identity']}.", '',
       '| Record | sha256 |', '|---|---|'] + [f'| `{k}` | `{v}` |' for k, v in REC['hashes'].items()] + ['']
rec += ['| Population | id | Label | Record arm | Primary | Informed | a | b | Val. P&L | Val. reset DD | Whole-run DD | V1 V2 V3 | c |', '|---|---|---|---|:---:|:---:|:---:|:---:|---:|---:|---:|:---:|:---:|']
for f in REC['finalists']:
    rec.append(f"| {f['arm']} | `{f['id']}` | `{f['label']}` | {f['recordArm']} | {ok(f['primary'])} | {ok(f['informed'])} | {ok(f['qualified'])} | {ok(f['b'])} | {m(f.get('validationNet'))} | "
               f"{m(f.get('validationResetDd'))} | {m(f.get('fullDd'))} | {ok(f.get('V1'))} {ok(f.get('V2'))} {ok(f.get('V3'))} | {ok(f.get('c'))} |")
rec += ['', f"Recomputed sets: candidates {REC['candidates'] or 'none'}; development-only {', '.join(x['arm'] + ' ' + x['id'] for x in REC['developmentOnly'])}; informed development-only "
        f"{REC['informedDevelopmentOnly'] or 'none'} — equal to the sealed outcome. Validation identities of non-nominating populations (sub-populations and report-only "
        f"rows, never finalists): {len(REC['unclaimedValidationIdentities'])}.", '']
rec += ['## B. Mutation tests (`tools/gdx-d1-growth/reconcile-mutations.py`): each forged record must fail on its own semantic check', '',
        f"Result: **{'PASS' if MUT['ok'] else 'FAIL'}** — {MUT['passed']} / {MUT['cases']} cases. Every mutated copy also trips the file-hash checks; a case passes only if the named semantic check fails as well (a crash is a failure).", '',
        '| Case | Mutated file | Exit | Semantic failure(s) observed | Hash failures | Pass |', '|---|---|---:|---|---:|:---:|']
for r in MUT['results']:
    rec.append(f"| {r['case']} | {('`' + r['file'] + '`') if r.get('file') else '—'} | {r['exit']} | {'; '.join(r.get('semanticFailures') or []) or '—'} | {len(r.get('hashFailures') or [])} | {ok(r['pass'])} |")
rec += ['', '## C. The full check list', '', '| # | Check | OK |', '|---:|---|:---:|'] + [f"| {i + 1} | {c['check']} | {ok(c['ok'])} |" for i, c in enumerate(REC['checkList'])] + ['']

for name, body, narr in (('FINAL_CANDIDATES.md', fin, 'FINAL.md'), ('OUTCOME_IDENTITY_RECONCILIATION.md', rec, 'RECON.md')):
    nf = os.path.join(ST, 'reports', 'narrative', narr)
    n = open(nf, encoding='utf-8').read().rstrip() if os.path.exists(nf) else f'# {name[:-3]}\n\n_(narrative pending)_'
    with open(os.path.join(ST, name), 'w', encoding='utf-8') as f:
        f.write(n + '\n\n---\n\n_Sections below are generated by `tools/gdx-d1-growth/final-md.py` from the sealed records (report-only)._\n\n' + '\n'.join(body) + '\n')
    print('wrote', name, len(body), 'generated lines')
