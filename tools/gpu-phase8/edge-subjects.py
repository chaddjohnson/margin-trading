#!/usr/bin/env python3
# gpu-phase8 (brief Phase B "numerical verification … pay particular attention to candidates close to risk thresholds"):
# selects THRESHOLD-EDGE parity subjects from a restored, read-only Assignment 3 search archive (tools/gpu-phase8/
# restore-archives.py) — ENGINEERING subjects for the CPU/GPU risk-delivery parity only, never research evidence and
# never a candidate. Deterministic, without random state: among the archived base-option records with net > 0,
#   near35  the 300 records nearest a marked DD of $35,000 (|dd − 35,000|, ties by id),
#   near40  the next 300 nearest $40,000,
#   band    400 more from 20,000 ≤ dd ≤ 60,000 in the order of sha256("gpu-phase8/edge/" + id).
# Each subject's configuration is the archive's own (configs table, keyed by the record's id), and its archived record
# (the store's JSON text, kept verbatim: the sealed-archive reproduction check of tools/gpu-phase8/risk-parity.ts). Writes
# research/gpu-phase8/results/risk-parity/edge-subjects-<door>.json (ids, archived dd/net, cfg) with its sha256 printed.
#   python3 -I tools/gpu-phase8/edge-subjects.py <restored archive> <door>
import hashlib, json, os, sqlite3, sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
archive, door = sys.argv[1], sys.argv[2]
db = sqlite3.connect(f'file:{os.path.abspath(archive)}?mode=ro&immutable=1', uri=True)
base = f'{door}|c5|r0.11|sstop|sl0|armharmonized|ff-|en1101|ws0|bo|bd|'
rows = []
for k, j in db.execute('SELECT key, json FROM points WHERE key LIKE ?', (base + '%',)):
    r = json.loads(j)
    if isinstance(r.get('net'), (int, float)) and isinstance(r.get('dd'), (int, float)) and r['net'] > 0 and not r.get('error'):
        rows.append((r['id'], r['dd'], r['net'], k, j))
ids = set()
out = []


def take(cands, n, sel):
    for c in cands:
        if len([x for x in out if x['sel'] == sel]) >= n:
            break
        if c[0] in ids:
            continue
        cfg = db.execute('SELECT json FROM configs WHERE key = ?', (c[0],)).fetchone()
        if not cfg:
            continue
        ids.add(c[0])
        out.append({'sel': sel, 'id': c[0], 'archivedDd': c[1], 'archivedNet': c[2], 'archiveKey': c[3], 'archivedRecord': c[4], 'cfg': json.loads(cfg[0])})


take(sorted(rows, key=lambda x: (abs(x[1] - 35000), x[0])), 300, 'near35')
take(sorted(rows, key=lambda x: (abs(x[1] - 40000), x[0])), 300, 'near40')
take(sorted([x for x in rows if 20000 <= x[1] <= 60000], key=lambda x: hashlib.sha256(f'gpu-phase8/edge/{x[0]}'.encode()).hexdigest()), 400, 'band')
rec = {
    'kind': 'gpu-phase8 threshold-edge parity subjects (engineering only)',
    'archive': os.path.relpath(archive, REPO),
    'archiveSha256': None,
    'door': door,
    'eligible': len(rows),
    'counts': {s: len([x for x in out if x['sel'] == s]) for s in ('near35', 'near40', 'band')},
    'subjects': out
}
o = os.path.join(REPO, 'research/gpu-phase8/results/risk-parity', f'edge-subjects-{door}.json')
os.makedirs(os.path.dirname(o), exist_ok=True)
text = json.dumps(rec, indent=0) + '\n'
open(o, 'w').write(text)
print(json.dumps({'door': door, 'eligible': len(rows), 'counts': rec['counts'], 'sha256': hashlib.sha256(text.encode()).hexdigest(),
                  'dd35': [min(x['archivedDd'] for x in out if x['sel'] == 'near35'), max(x['archivedDd'] for x in out if x['sel'] == 'near35')],
                  'dd40': [min(x['archivedDd'] for x in out if x['sel'] == 'near40'), max(x['archivedDd'] for x in out if x['sel'] == 'near40')]}))
