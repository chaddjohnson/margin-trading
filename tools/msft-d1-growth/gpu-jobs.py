#!/usr/bin/env python3
# Totals of this study's official GPU jobs from their committed job records (report-only; reads JSON only):
#   results/jobs/<job>/{job.json,complete.json,events.jsonl,receipts.jsonl}, results/gpu-attestations/<job>-<t>.json
# Writes reports/tables/gpu-jobs.json and reports/tables/GPU_JOBS.md (GPU_PARITY_AND_ACCEPTANCE.md §4 quotes them).
#   python3 -I tools/msft-d1-growth/gpu-jobs.py
import json
import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUDY = os.path.join(REPO, 'research', 'msft-d1-growth')
JOBS = os.path.join(STUDY, 'results', 'jobs')
ATT = os.path.join(STUDY, 'results', 'gpu-attestations')
OUT = os.path.join(STUDY, 'reports', 'tables')


def jl(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as f:
        return [json.loads(line) for line in f if line.strip()]


def rd(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


atts = {}
for name in sorted(os.listdir(ATT)) if os.path.isdir(ATT) else []:
    a = rd(os.path.join(ATT, name))
    atts.setdefault(a['job']['name'], []).append({'file': name, **a})

rows = []
for job in sorted(os.listdir(JOBS)):
    d = os.path.join(JOBS, job)
    complete = rd(os.path.join(d, 'complete.json'))
    events = jl(os.path.join(d, 'events.jsonl'))
    receipts = jl(os.path.join(d, 'receipts.jsonl'))
    closes = [r for r in receipts if r.get('event') == 'close']
    batches = [r for r in receipts if 'nonce' in r]
    a = atts.get(job, [])
    checks = [c for x in a for c in x['checks']]
    rows.append({
        'job': job,
        'complete': complete is not None,
        'stage': (complete or {}).get('stage'),
        'completed': (complete or {}).get('completed'),
        'sessions': sum(1 for e in events if e.get('event') == 'open'),
        'attestations': len(a),
        'attestationChecks': len(checks),
        'attestationChecksFailed': sum(1 for c in checks if not c.get('ok')),
        'parityIdentical': sum(x['parity']['identical'] for x in a),
        'paritySubjects': sum(x['parity']['subjects'] for x in a),
        'doors': sorted({x['dataset']['door'] for x in a}),
        'devices': sorted({x['device']['uuid'] for x in a}),
        'binaries': sorted({x['binary']['sha256'][:16] for x in a}),
        'acceptance': sorted({x['acceptance']['sha256'][:16] for x in a}),
        'heads': sorted({x['source']['head'][:8] for x in a}),
        'maglevDisabled': all(x['runtime']['maglev'] == 'disabled' for x in a),
        'batches': len(batches),
        'batchesOfficial': sum(1 for b in batches if b.get('official') is True),
        'batchDevices': sorted({b.get('uuid') for b in batches}),
        'submitted': sum(c.get('submitted', 0) for c in closes),
        'gpuReturned': sum(c.get('gpuReturned', 0) for c in closes),
        'failed': sum(c.get('failed', 0) for c in closes),
        'cpuScored': sum(c.get('cpuScored', 0) for c in closes) + sum(b.get('cpuScored', 0) for b in batches),
        'capacityRetries': sum(c.get('capacityRetries', 0) for c in closes),
        'kernelSeconds': round(sum(c.get('kernelMs', 0) for c in closes) / 1000, 1),
        'wallSeconds': round(sum(c.get('wallMs', 0) for c in closes) / 1000, 1),
        'closeFailures': [c.get('failure') for c in closes if c.get('failure')],
    })

keys = ['attestations', 'attestationChecks', 'attestationChecksFailed', 'parityIdentical', 'paritySubjects', 'batches', 'batchesOfficial',
        'submitted', 'gpuReturned', 'failed', 'cpuScored', 'capacityRetries', 'kernelSeconds', 'wallSeconds']
totals = {k: round(sum(r[k] for r in rows), 1) if isinstance(rows[0][k], float) else sum(r[k] for r in rows) for k in keys} if rows else {}
totals.update({
    'jobs': len(rows),
    'jobsComplete': sum(1 for r in rows if r['complete']),
    'devices': sorted({u for r in rows for u in r['devices'] + r['batchDevices']}),
    'binaries': sorted({b for r in rows for b in r['binaries']}),
    'acceptance': sorted({b for r in rows for b in r['acceptance']}),
    'everyJobAttested': all(r['attestations'] >= 1 for r in rows),
    'maglevDisabledEverywhere': all(r['maglevDisabled'] for r in rows),
})
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'gpu-jobs.json'), 'w', encoding='utf-8') as f:
    json.dump({'kind': 'P9-MSFT official GPU jobs (report-only aggregate of committed job records)', 'totals': totals, 'jobs': rows}, f, indent=1)
    f.write('\n')


def n(x):
    return f'{x:,}' if isinstance(x, int) else str(x)


md = ['# Official GPU jobs (generated from the committed job records; report-only)', '',
      f"{totals.get('jobs', 0)} jobs ({totals.get('jobsComplete', 0)} complete); {n(totals.get('attestations', 0))} attestations, "
      f"{n(totals.get('attestationChecks', 0))} checks ({n(totals.get('attestationChecksFailed', 0))} failed), parity mini-set "
      f"{n(totals.get('parityIdentical', 0))}/{n(totals.get('paritySubjects', 0))} identical; {n(totals.get('batches', 0))} receipted batches "
      f"({n(totals.get('batchesOfficial', 0))} official); submitted {n(totals.get('submitted', 0))}, GPU-returned {n(totals.get('gpuReturned', 0))}, "
      f"failed {n(totals.get('failed', 0))}, CPU-scored {n(totals.get('cpuScored', 0))}, capacity retries {n(totals.get('capacityRetries', 0))}; "
      f"kernel {n(totals.get('kernelSeconds', 0))} s, wall {n(totals.get('wallSeconds', 0))} s; devices {', '.join(totals.get('devices', []))}; "
      f"binary {', '.join(totals.get('binaries', []))}…; acceptance {', '.join(totals.get('acceptance', []))}…; Maglev disabled in every attested "
      f"process: {totals.get('maglevDisabledEverywhere')}.", '',
      '| Job | Stage | Sessions | Attestations (checks failed) | Parity | Door | Batches | Submitted | GPU-returned | Failed | CPU-scored | Kernel s | Wall s |',
      '|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|']
for r in rows:
    md.append(f"| {r['job']} | {r['stage'] or '(incomplete)'} | {r['sessions']} | {r['attestations']} ({r['attestationChecksFailed']}) | "
              f"{r['parityIdentical']}/{r['paritySubjects']} | {', '.join(r['doors'])} | {n(r['batches'])} | {n(r['submitted'])} | {n(r['gpuReturned'])} | "
              f"{n(r['failed'])} | {n(r['cpuScored'])} | {r['kernelSeconds']} | {r['wallSeconds']} |")
with open(os.path.join(OUT, 'GPU_JOBS.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(md) + '\n')
print(json.dumps(totals))
sys.exit(0 if all(r['complete'] for r in rows) and totals.get('cpuScored', 0) == 0 and totals.get('failed', 0) == 0 and totals.get('attestationChecksFailed', 0) == 0 else 1)
