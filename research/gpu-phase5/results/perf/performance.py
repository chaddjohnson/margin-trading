#!/usr/bin/env python3
# gpu-phase5 stage P: the machine-readable performance table (performance.json / performance.csv) from the job profiles
# of the benchmark groups (accepted configuration: binary gb3, default engine; the same under --no-maglev) and of the
# final campaign's replays (final binary gb5, --no-maglev). Read-only on the records.
#   python3 research/gpu-phase5/results/perf/performance.py
import csv, json, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
J = lambda f: json.load(open(os.path.join(R, f))) if os.path.exists(os.path.join(R, f)) else None
RUNS = [  # (run directory under optimizer/, workload, configuration, identity record)
    ('p3-a3-r1-j0', 'W-A3', 'accepted Phase 3 binary gb3, default engine (Maglev enabled)', 'bench/p3-a3-r1/verify.json'),
    ('p3-a3-r2-j0', 'W-A3', 'accepted Phase 3 binary gb3, default engine (Maglev enabled)', 'bench/p3-a3-r2/verify.json'),
    ('nm-a3-r1-j0', 'W-A3', 'accepted Phase 3 binary gb3, --no-maglev', 'bench/nm-a3-r1/verify.json'),
    ('final-a3-r1', 'W-A3', 'final binary gb5, --no-maglev', 'optimizer/compare-final-a3-r1-vs-sealed.json'),
    ('final-a3-r2', 'W-A3', 'final binary gb5, --no-maglev', 'optimizer/compare-final-a3-r2-vs-sealed.json'),
    ('p3-a2-r1-j0', 'W-A2', 'accepted Phase 3 binary gb3, default engine (Maglev enabled)', 'bench/p3-a2-r1/verify.json'),
    ('final-a2-r1', 'W-A2', 'final binary gb5, --no-maglev', 'optimizer/compare-final-a2-r1-vs-sealed.json'),
    ('p3-s-r1-j0', 'W-S', 'accepted Phase 3 binary gb3, default engine (Maglev enabled)', 'bench/p3-s-r1/verify.json'),
    ('final-mini-w8', 'W-S', 'final binary gb5, --no-maglev', 'optimizer/compare-final-mini-cpu-vs-gpu.json'),
]
rows = []
for run, workload, config, idf in RUNS:
    p = J(f'optimizer/{run}/gpu/profile.json'); r = J(f'optimizer/{run}/gpu/result.json'); v = J(idf)
    if not p: continue
    gc = p.get('gc', {})
    rows.append({
        'run': run, 'workload': workload, 'job': p['job'], 'configuration': config,
        'binarySha256': (r or {}).get('server', {}).get('binarySha256'), 'maglev': p['runtime']['maglev'],
        'start': p['times']['start'], 'wallSeconds': p['wallSeconds'], 'fresh': p['fresh'], 'archiveHits': p['archiveHits'],
        'evaluationsPerSecond': p['evaluationsPerSecond'], 'batches': p['batches']['n'], 'medianBatch': p['batches']['median'],
        'serverSeconds': round(p['batches']['serverSeconds'], 1), 'encodeSeconds': round(p['batches']['encodeSeconds'], 1),
        'decodeSeconds': round(p['batches']['decodeSeconds'], 1), 'mainThreadActiveSeconds': p['mainThread']['activeSeconds'],
        'mainThreadEventLoopUtilization': p['mainThread']['eventLoopUtilization'], 'archiveWriteSeconds': p['archive']['writeSeconds'],
        'gcSeconds': round(sum(x['seconds'] for x in gc.values()), 1), 'processCpuUserSeconds': p['processCpuSeconds']['user'],
        'peakRssMiB': p['peakRssMiB'], 'identicalToReference': None if v is None else v.get('identical'), 'identityRecord': idf,
    })
def mean(xs): return round(sum(xs) / len(xs), 1) if xs else None
wall = lambda w, pred: [x['wallSeconds'] for x in rows if x['workload'] == w and pred(x)]
cmp = {}
for w in ('W-A3', 'W-A2', 'W-S'):
    a = wall(w, lambda x: x['run'].startswith('p3-')); f = wall(w, lambda x: x['run'].startswith('final-'))
    if a and f: cmp[w] = {'acceptedMeanWallSeconds': mean(a), 'acceptedRuns': len(a), 'finalMeanWallSeconds': mean(f), 'finalRuns': len(f), 'finalOverAccepted': round(mean(f) / mean(a), 4)}
out = {'kind': 'gpu-phase5 performance table', 'note': 'one job at a time, batch 8,192, 8 host workers; every run verified against its reference', 'phase4Reference': J('../../gpu-phase4/results/optimizer/regression.json') and {k: J('../../gpu-phase4/results/optimizer/regression.json')[k] for k in ('accepted', 'final', 'meanWallSeconds')}, 'runs': rows, 'finalAgainstAccepted': cmp, 'retainedPerformanceChanges': []}
json.dump(out, open(os.path.join(R, 'perf', 'performance.json'), 'w'), indent=1)
with open(os.path.join(R, 'perf', 'performance.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(json.dumps({'runs': len(rows), 'finalAgainstAccepted': cmp}))
