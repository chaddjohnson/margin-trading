# Selects Stage B's P0 / P3 threshold-edge ENGINEERING subjects (gate E3; never candidates) read-only from Stage A's
# replayed pilot populations (.cache/vg-l0-risk-envelope-sensitivity/population-C2x.json.gz: every centre the pilot's
# two arms evaluated on D21 / D24, with its archived official GPU record and envelope). Per door: the centres with no
# error and a valid envelope nearest to BD (liquidation) $30,000, PL (liquidation) $25,000, marked DD $40,000 and $35,000
# (ties by id), de-duplicated. Writes research/vg-l0-risk-envelope-stage-b/results/engineering/E3/edge-subjects-<door>.json.
import gzip, hashlib, json, sys
R = '/home/chad/projects/margin-trading'
plan = [('nearBD30', lambda r: r['envelope']['bankedDdLiquidation'], 30000.0, 150),
        ('nearPL25', lambda r: r['envelope']['principalLossLiquidation'], 25000.0, 150),
        ('nearDD40', lambda r: r['dd'], 40000.0, 100),
        ('nearDD35', lambda r: r['dd'], 35000.0, 100)]
for cut, door in (('C21', 'D21'), ('C24', 'D24')):
    src = f'{R}/.cache/vg-l0-risk-envelope-sensitivity/population-{cut}.json.gz'
    sha = hashlib.sha256(open(src, 'rb').read()).hexdigest()
    d = json.load(gzip.open(src))
    assert d['door'] == door
    ok = [c for c in d['centres'] if c['rec'].get('error') is None and isinstance(c['rec'].get('envelope'), dict)]
    seen, subjects = set(), []
    for name, f, target, n in plan:
        ranked = sorted(ok, key=lambda c: (abs(f(c['rec']) - target), c['id']))
        k = 0
        for c in ranked:
            if k >= n: break
            if c['id'] in seen: continue
            seen.add(c['id']); k += 1
            subjects.append({'id': c['id'], 'sel': name, 'cfg': c['cfg'], 'archived': {'net': c['rec']['net'], 'dd': c['rec']['dd'], 'envelope': c['rec']['envelope']}})
    out = {'kind': 'Stage B E3 threshold-edge engineering subjects (never candidates)', 'door': door, 'source': {'file': src.replace(R + '/', ''), 'sha256': sha, 'pilotArchive': d['archive']}, 'eligible': len(ok), 'counts': {p[0]: p[3] for p in plan}, 'subjects': subjects}
    p = f'{R}/research/vg-l0-risk-envelope-stage-b/results/engineering/E3/edge-subjects-{door}.json'
    import os; os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(out, open(p, 'w'), indent=0); open(p, 'a').write('\n')
    print(door, len(subjects), sha[:12])
