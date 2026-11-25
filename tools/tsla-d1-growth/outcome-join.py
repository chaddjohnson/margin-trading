#!/usr/bin/env python3
"""Report-only: the PROTOCOL §12 determination with the validation rows joined to the finalists by id.

The sealed `results/outcome.json` (outcome.ts) joins the validation rows to the finalists by `label`, but
`preDetermination` had replaced each finalist's `label` with its governance label, so no row matched: every finalist
there carries `validation: null`, and `developmentOnly` is empty (disclosure D1 in AMENDMENTS.md). This tool changes no
sealed record. It re-applies the frozen rule — (a) Q1–Q6 at C24 and (b) primary with a supported verdict, both as
sealed in FROZEN_SELECTION.json / outcome.json, plus (c) V1–V3 as sealed per row in the validation record — joining on
the finalist `id` (and arm), which both sealed files carry unchanged. It evaluates nothing.

Run from the repository root:  python3 -I tools/tsla-d1-growth/outcome-join.py
Writes research/tsla-d1-growth/reports/tables/outcome-join.json; exits 1 if any finalist fails to match exactly once.
"""
import hashlib
import json
import pathlib
import sys

study = pathlib.Path('research/tsla-d1-growth')
outcome_f = study / 'results/outcome.json'
validation_f = study / 'results/validation/validation.json'
out_f = study / 'reports/tables/outcome-join.json'


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


outcome = json.loads(outcome_f.read_text())
validation = json.loads(validation_f.read_text())
rows = [r for r in validation['rows'] if r['kind'] == 'selected']

problems = []
finalists = []
for f in outcome['finalists']:
    m = [r for r in rows if r['id'] == f['id'] and r['arm'] == f['arm']]
    if len(m) != 1:
        problems.append(f"{f['arm']} {f['id']}: {len(m)} validation rows")
        continue
    r = m[0]
    v = r['validation']
    c = bool(v['V1'] and v['V2'] and v['V3'])
    finalists.append({
        'arm': f['arm'],
        'id': f['id'],
        'candidateLabel': r['label'],
        'roles': f['roles'],
        'primary': f['primary'],
        'a': f['a'],
        'b': f['b'],
        'validation': v,
        'validationPnl': r['sliceNet'],
        'validationResetDd': r['sliceDd'],
        'wholeRunDd': r['wholeDd'],
        'c': c,
        'candidate': bool(f['a'] and f['b'] and c),
        'developmentOnly': bool(f['a'] and f['primary'] and not f['b'] and c),
        'sealedOutcomeHad': {'validation': f['validation'], 'c': f['c'], 'developmentOnly': f['developmentOnly']},
    })

if problems:
    print('\n'.join(problems), file=sys.stderr)
    sys.exit(1)

candidates = [x for x in finalists if x['candidate']]
dev_only = [x for x in finalists if x['developmentOnly']]
record = {
    'kind': 'report-only join of the sealed validation rows to the sealed finalists by id (PROTOCOL §12; disclosure D1)',
    'inputs': {
        'outcome': {'file': str(outcome_f), 'sha256': sha(outcome_f)},
        'validation': {'file': str(validation_f), 'sha256': sha(validation_f)},
    },
    'finalists': finalists,
    'candidates': [{'arm': x['arm'], 'label': x['candidateLabel'], 'id': x['id']} for x in candidates],
    'developmentOnly': [{'arm': x['arm'], 'label': x['candidateLabel'], 'id': x['id']} for x in dev_only],
    'determination': (
        'TSLA RESEARCH CANDIDATE(S) FOR THE USER\'S REVIEW: ' + '; '.join(f"{x['arm']} {x['candidateLabel']}" for x in candidates)
        if candidates else
        'NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3'
        + ('; development-qualified without chronological support (not deployment-qualified without an explicit user decision): '
           + '; '.join(f"{x['arm']} {x['candidateLabel']}" for x in dev_only) if dev_only else '')
    ),
    'sealedOutcome': outcome['outcome'],
    'candidateListUnchanged': [c['id'] for c in outcome['candidates']] == [x['id'] for x in candidates],
}
out_f.write_text(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
print(json.dumps({'candidates': record['candidates'], 'developmentOnly': record['developmentOnly'],
                  'candidateListUnchanged': record['candidateListUnchanged']}, ensure_ascii=False))
