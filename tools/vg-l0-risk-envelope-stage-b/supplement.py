# Stage B supplementary report-only analysis (PROTOCOL.md §1 items 3-5, §10; brief §6) — ZERO evaluations: reads only
# the sealed selection, qualification, search and interval records and writes results/analysis/supplement.json and
# results/analysis/SUPPLEMENT.md. Written after the official stages (not pinned in the freeze); nothing here is a
# decision input. Bootstraps here use Python's random.Random with a fixed, stated seed (report-only).
#   python3 -I tools/vg-l0-risk-envelope-stage-b/supplement.py
import csv, json, math, os, random, statistics
from collections import Counter

R = '/home/chad/projects/margin-trading'
P = f'{R}/research/vg-l0-risk-envelope-stage-b/results'
A = ('CTRL', 'EXP30')
CUTS = ('C19', 'C21', 'C24')

def dec(x):
    if isinstance(x, str) and x in ('__Inf', '__-Inf', '__NaN'): return {'__Inf': math.inf, '__-Inf': -math.inf, '__NaN': math.nan}[x]
    if isinstance(x, list): return [dec(v) for v in x]
    if isinstance(x, dict): return {k: dec(v) for k, v in x.items()}
    return x
load = lambda f: dec(json.load(open(f)))
usd = lambda x: '—' if x is None or (isinstance(x, float) and not math.isfinite(x)) else (f"−${abs(round(x)):,}" if x < 0 else f"${round(x):,}")

def boot(groups, q, seed, B=20000):
    rng = random.Random(seed); n = sum(len(g) for g in groups); out = []
    for _ in range(B):
        s = 0.0
        for g in groups:
            for _ in range(len(g)): s += g[rng.randrange(len(g))]
        out.append(s / n)
    out.sort(); pos = (B - 1) * q; lo = math.floor(pos); hi = math.ceil(pos)
    return out[lo] + (out[hi] - out[lo]) * (pos - lo)

def summ(pairs, key, label):
    groups = [[p[key] for p in pairs if p['cell'] == c] for c in sorted({p['cell'] for p in pairs})]
    xs = [p[key] for p in pairs]
    return {'n': len(xs), 'mean': statistics.fmean(xs), 'lo80': boot(groups, 0.1, f'{label}|lo'), 'hi80': boot(groups, 0.9, f'{label}|hi')}

def wilson(k, n, z=1.959963984540054):
    if n == 0: return [0.0, 1.0]
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return [(c - h) / d, (c + h) / d]

out = {'kind': 'Stage B supplementary report-only analysis (zero evaluations)', 'cutoffs': {}}
md = ['# Stage B — supplementary report-only tables (tools/vg-l0-risk-envelope-stage-b/supplement.py; sealed records only)', '']
for cut in CUTS:
    sel = load(f'{P}/selection/{cut}.json'); q = load(f'{P}/qualification/{cut}.json'); s = load(f'{P}/search/{cut}.json'); iv = load(f'{P}/intervals/{cut}.json')
    ev = {e['id']: e for e in q['evidence']}
    rows = {r['id']: r for r in iv['rows']}
    # per lane: members shortlisted by the arm in that lane
    members = {}
    for e in q['evidence']:
        for b in e['shortlistedBy']:
            if b['arm'] in A: members.setdefault((b['arm'], b['lane']), []).append(e)
    def V(arm, lane, pol):
        xs = [e['centre']['net'] for e in members.get((arm, lane), []) if e['arms'][pol]['qualified']]
        return max(xs) if xs else 0.0
    pairs = []
    for p in sel['pairs']:
        lane = f"{cut}/broad/{p['cell']}/R{p['replicate']}"
        rep = {a: next(v for v in sel['laneValues'][a] if v['lane'] == lane)['representative'] for a in A}
        vC0, vC3, vE0, vE3 = V('CTRL', lane, 'CTRL'), V('CTRL', lane, 'EXP30'), V('EXP30', lane, 'CTRL'), V('EXP30', lane, 'EXP30')
        assert abs(vC0 - p['ctrl']) < 1e-9 and abs(vE3 - p['exp']) < 1e-9, (cut, lane)
        iv_ = {a: rows[rep[a]['id']] if rep[a] else None for a in A}
        pairs.append({'cell': p['cell'], 'replicate': p['replicate'], 'D': p['d'],
                      'eligCTRL': vC3 - vC0, 'pathUnderP3': vE3 - vC3, 'pathUnderP0': vE0 - vC0, 'eligEXP': vE3 - vE0,
                      'expRepFailsP0': bool(rep['EXP30'] and not ev[rep['EXP30']['id']]['arms']['CTRL']['qualified']),
                      'ctrlRepFailsP3': bool(rep['CTRL'] and not ev[rep['CTRL']['id']]['arms']['EXP30']['qualified']),
                      'sameRep': bool(rep['CTRL'] and rep['EXP30'] and rep['CTRL']['id'] == rep['EXP30']['id']),
                      'ivNetC': iv_['CTRL']['sliceNet'] if iv_['CTRL'] else 0.0, 'ivNetE': iv_['EXP30']['sliceNet'] if iv_['EXP30'] else 0.0,
                      'ivDdC': iv_['CTRL']['sliceDd'] if iv_['CTRL'] else 0.0, 'ivDdE': iv_['EXP30']['sliceDd'] if iv_['EXP30'] else 0.0,
                      'expRepDdOver35': bool(rep['EXP30'] and ev[rep['EXP30']['id']]['centre']['dd'] > 35000),
                      'expRepConfP90DdOver35': bool(rep['EXP30'] and ev[rep['EXP30']['id']]['envelope']['confirm']['markedDd']['p90'] > 35000)})
    dec_ = {k: summ(pairs, k, f'{cut}|{k}') for k in ('D', 'eligCTRL', 'pathUnderP3', 'pathUnderP0', 'eligEXP')}
    # breaches among the representatives' confirmation draws
    br = {}
    for a in A:
        reps = [ev[v['representative']['id']] for v in sel['laneValues'][a] if v['representative']]
        tot = {k: sum(e['envelope']['confirmBreach'][k] for e in reps) for k in ('markedDd35', 'markedDd40', 'pl25', 'bd25', 'bd30', 'n')}
        br[a] = {**tot, **{f'{k}Share': tot[k] / tot['n'] for k in ('markedDd35', 'markedDd40', 'pl25', 'bd25', 'bd30')}, 'wilsonDd35': wilson(tot['markedDd35'], tot['n']), 'wilsonBd30': wilson(tot['bd30'], tot['n'])}
    # search coverage from the sealed lanes
    cov = {}
    for a in A:
        L = s['lanes'][a]; reasons = Counter()
        for l in L: reasons.update(l['failure']['screenReasons'])
        cov[a] = {'lanes': len(L), 'requested': sum(l['requested'] for l in L), 'maxLaneRequested': max(l['requested'] for l in L), 'medianLaneRequested': statistics.median(l['requested'] for l in L),
                  'islands': Counter(l['extension']['islands'] for l in L), 'stops': Counter(l['extension']['stop'][:22] for l in L), 'screenPlausible': sum(l['failure']['screenPlausible'] for l in L),
                  'screenReasons': dict(reasons.most_common()), 'r3Feasible': sum(sum(1 for x in l['r3'] if x['feasible']) for l in L), 'r3': sum(len(l['r3']) for l in L), 'shortlisted': sum(len(l['shortlist']) for l in L)}
    # interval distributions per arm of the lane representatives; benchmarks
    ivd = {}
    for a in A:
        reps = [rows[v['representative']['id']] for v in sel['laneValues'][a] if v['representative']]
        nets = sorted(r['sliceNet'] for r in reps); dds = sorted(r['sliceDd'] for r in reps)
        ivd[a] = {'n': len(reps), 'netMean': statistics.fmean(nets), 'netMedian': statistics.median(nets), 'netMin': nets[0], 'netMax': nets[-1], 'positive': sum(x > 0 for x in nets),
                  'ddMean': statistics.fmean(dds), 'ddMedian': statistics.median(dds), 'ddMax': dds[-1], 'wholeRunPassesOwn': sum(r['wholeAssessment'][a] for r in reps),
                  'nbAbove35Share': statistics.fmean(r['neighbourhood']['above35pctC0']['share'] for r in reps)}
    bench = [{'label': r['label'], 'sliceNet': r['sliceNet'], 'sliceDd': r['sliceDd'], 'wholeNet': r['wholeNet'], 'wholeDd': r['wholeDd']} for r in iv['rows'] if r['kind'] == 'benchmark']
    bq = [{'label': b['label'], 'CTRL': b['arms']['CTRL'], 'EXP30': b['arms']['EXP30'], 'centreNet': ev[b['id']]['centre']['net'], 'centreDd': ev[b['id']]['centre']['dd']} for b in sel['benchmarks']]
    T = lambda k: summ(pairs, k, f'{cut}|{k}')
    for p in pairs: p['ivNetD'] = p['ivNetE'] - p['ivNetC']; p['ivDdD'] = p['ivDdE'] - p['ivDdC']
    out['cutoffs'][cut] = {'decomposition': dec_, 'counts': {'pairs': len(pairs), 'sameRepresentative': sum(p['sameRep'] for p in pairs), 'expRepFailsP0': sum(p['expRepFailsP0'] for p in pairs),
                           'ctrlRepFailsP3': sum(p['ctrlRepFailsP3'] for p in pairs), 'expRepCentreDdOver35k': sum(p['expRepDdOver35'] for p in pairs), 'expRepConfP90DdOver35k': sum(p['expRepConfP90DdOver35'] for p in pairs)},
                           'breaches': br, 'coverage': cov, 'intervalByArm': ivd, 'benchmarksInterval': bench, 'benchmarksQualification': bq, 'pairs': pairs}
    md += [f'## {cut} ({"secondary" if cut == "C19" else "primary"})', '',
           '**Decomposition of D (report-only; exact identities on the sealed verdicts):** D = [V_P3(CTRL lane) − V_P0(CTRL lane)] (P3 eligibility applied to CTRL\'s own candidates) + [V_P3(EXP-30 lane) − V_P3(CTRL lane)] (search path, compared under P3); and in the other order D = [V_P0(EXP-30) − V_P0(CTRL)] (search path under P0) + [V_P3(EXP-30) − V_P0(EXP-30)] (eligibility on EXP-30\'s candidates).', '',
           '| Component | Mean | 80 % interval (stratified bootstrap) |', '|---|---:|---|']
    names = {'D': 'D (primary)', 'eligCTRL': 'eligibility on CTRL candidates', 'pathUnderP3': 'search path under P3', 'pathUnderP0': 'search path under P0', 'eligEXP': 'eligibility on EXP-30 candidates'}
    for k, v in dec_.items(): md.append(f"| {names[k]} | {usd(v['mean'])} | {usd(v['lo80'])} … {usd(v['hi80'])} |")
    c = out['cutoffs'][cut]['counts']
    md += ['', f"Pairs with the same representative in both arms: {c['sameRepresentative']}/32. EXP-30 representatives that P0 would reject: {c['expRepFailsP0']}/32 (centre DD > $35k: {c['expRepCentreDdOver35k']}; confirmation p90 DD > $35k: {c['expRepConfP90DdOver35k']}). CTRL representatives that P3 would reject: {c['ctrlRepFailsP3']}/32.", '',
           '| Arm | Lanes | Requested | Median / max lane requested | Islands (count: lanes) | Stop reasons | Screen plausible (of 16,384) | Rung-3 feasible / fitted | Top screen rejection reasons |', '|---|---:|---:|---|---|---|---:|---|---|']
    for a in A:
        x = cov[a]
        md.append(f"| {a} | {x['lanes']} | {x['requested']:,} | {x['medianLaneRequested']:,.0f} / {x['maxLaneRequested']:,} | {', '.join(f'{k}: {v}' for k, v in sorted(x['islands'].items()))} | {'; '.join(f'{k}…: {v}' for k, v in x['stops'].items())} | {x['screenPlausible']} | {x['r3Feasible']} / {x['r3']} | {'; '.join(f'{k} {v}' for k, v in list(x['screenReasons'].items())[:4])} |")
    md += ['', '| Arm | Representatives\' confirmation draws | > 35 % DD | > 40 % DD | PL > 25 % | BD > 25 % | BD > 30 % |', '|---|---:|---:|---:|---:|---:|---:|']
    for a in A:
        b = br[a]; md.append(f"| {a} | {b['n']:,} | {b['markedDd35']:,} ({100*b['markedDd35Share']:.1f} %) | {b['markedDd40']:,} ({100*b['markedDd40Share']:.1f} %) | {b['pl25']:,} ({100*b['pl25Share']:.1f} %) | {b['bd25']:,} ({100*b['bd25Share']:.1f} %) | {b['bd30']:,} ({100*b['bd30Share']:.1f} %) |")
    md += ['', '| Arm | Interval net mean / median / min / max | Positive | Interval DD mean / median / max | Whole run passes own policy | Mean training-nbhd draws > 35 % on the interval |', '|---|---|---:|---|---:|---:|']
    for a in A:
        x = ivd[a]; md.append(f"| {a} | {usd(x['netMean'])} / {usd(x['netMedian'])} / {usd(x['netMin'])} / {usd(x['netMax'])} | {x['positive']}/{x['n']} | {usd(x['ddMean'])} / {usd(x['ddMedian'])} / {usd(x['ddMax'])} | {x['wholeRunPassesOwn']}/{x['n']} | {100*x['nbAbove35Share']:.1f} % |")
    md += ['', 'Benchmarks (descriptive, never selectable): ' + '; '.join(f"{b['label']}: qualified CTRL {b['CTRL']} / EXP-30 {b['EXP30']}, centre {usd(b['centreNet'])} / DD {usd(b['centreDd'])}" for b in bq) + '. Interval: ' + '; '.join(f"{b['label']} {usd(b['sliceNet'])} / DD {usd(b['sliceDd'])}" for b in bench) + '.', '']

# historical R1/R2 context (comparison only; the pilot's EXP arm searched under 40/25/25, not P3)
hist = []
for cut in ('C21', 'C24'):
    rows_ = list(csv.DictReader(open(f'{R}/research/vg-l0-risk-envelope-sensitivity/results/qualification-{cut}.csv')))
    by = {}
    for r in rows_:
        if r['member'].startswith('benchmark'): continue
        arm, rest = r['member'].split(' ', 1); by.setdefault((arm, rest.split('#')[0]), []).append(r)
    V_ = lambda rs, pol: max([float(r['centreNet']) for r in rs if r[pol] == 'Q'] or [0.0])
    for cell in ('GA0.VA0', 'GB0.VD1'):
        for rr in (1, 2):
            lane = f'{cut}/broad/{cell}/R{rr}'
            c0 = V_(by[('CTRL', lane)], 'P0'); e2 = V_(by[('EXP', lane)], 'P2'); e3 = V_(by[('EXP', lane)], 'P3'); c3 = V_(by[('CTRL', lane)], 'P3')
            hist.append({'cutoff': cut, 'lane': lane, 'ctrlP0': c0, 'ctrlP3': c3, 'pilotExpP2': e2, 'pilotExpP3': e3, 'pilotD': e2 - c0})
out['historicalR1R2'] = hist
md += ['## Historical R1/R2 context (comparison only — never in D; the pilot\'s EXP lanes were searched under 40/25/25, then requalified by Stage A)', '',
       '| Lane | CTRL V under P0 | CTRL members under P3 (Stage A) | pilot EXP V under P2 | pilot EXP members under P3 (Stage A) | pilot D (EXP P2 − CTRL P0) |', '|---|---:|---:|---:|---:|---:|']
for h in hist: md.append(f"| {h['lane']} | {usd(h['ctrlP0'])} | {usd(h['ctrlP3'])} | {usd(h['pilotExpP2'])} | {usd(h['pilotExpP3'])} | {usd(h['pilotD'])} |")
for cut in ('C21', 'C24'):
    hs = [h['pilotD'] for h in hist if h['cutoff'] == cut]; md.append(f"\nPilot mean D at {cut} over its 4 R1/R2 pairs: {usd(statistics.fmean(hs))}.")
os.makedirs(f'{P}/analysis', exist_ok=True)
json.dump(out, open(f'{P}/analysis/supplement.json', 'w'), indent=1, default=lambda o: dict(o)); open(f'{P}/analysis/supplement.json', 'a').write('\n')
open(f'{P}/analysis/SUPPLEMENT.md', 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
