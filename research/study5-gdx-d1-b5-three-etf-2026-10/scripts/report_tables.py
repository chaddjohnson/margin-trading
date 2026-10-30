#!/usr/bin/env python3
"""Markdown tables for the Study 5 reports, generated only from the sealed records under results/ (no data access).
Usage (repository root): python3 research/study5-gdx-d1-b5-three-etf-2026-10/scripts/report_tables.py
Writes results/tables/*.md."""
import json, os
from statistics import median

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
R = lambda *p: os.path.join(ROOT, 'results', *p)
load = lambda *p: json.load(open(R(*p)))
OUT = R('tables')
os.makedirs(OUT, exist_ok=True)


def m(v, d=0):
    if v is None or (isinstance(v, str)):
        return str(v) if v is not None else 'n/a'
    if v != v:
        return 'n/a'
    s = f'{abs(v):,.{d}f}'
    return ('−$' if v < 0 else '$') + s


def p(v, d=1):
    return 'n/a' if v is None or v != v else f'{v * 100:.{d}f}%'


def pct100k(v):
    return f'{v / 1000:.1f}%'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join('---' if i == 0 else '---:' for i in range(len(head))) + '|']
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out) + '\n'


def write(name, text):
    with open(os.path.join(OUT, name), 'w') as fh:
        fh.write(text)


final = load('final', 'final.json')
manifest = json.load(open(os.path.join(ROOT, 'FROZEN_SELECTION.json')))
aval = load('studyA', 'main', 'validation.json')
awf = load('studyA', 'wf20', 'validation.json')
asearch = load('studyA', 'main', 'search.json')
awfsearch = load('studyA', 'wf20', 'search.json')
bval = load('studyB', 'validation.json')
t1 = load('track1', 'main', 'track1.json')
t1wf = load('track1', 'wf20', 'track1.json')
t2 = load('track2', 'track2.json')
parity = load('parity', 'parity.json')

# ---------------- Study B controls and candidates (final) ----------------
fb = {item['key']: item for item in final['studyB']}
c5 = final['c5']['metrics']


def pool_row(key, mt, iso=None, extra=None):
    per = mt['periods']
    return [key, m(per.get('DEV')), m(per.get('VAL')), m(per.get('FX')), m(per.get('RECENT')), m(mt['net']),
            m(mt['gross']), m(mt['interest']), m(mt['costs']), f"{mt['lots']} ({mt['wins']}/{mt['losses']})",
            m(mt['medianLot']), m(mt['meanLot']), p(mt['exposure']), f"{m(mt['minuteDrawdown'])} / {pct100k(mt['minuteDrawdown'])}",
            f"{m(mt['dailyDrawdown'])} / {pct100k(mt['dailyDrawdown'])}", (mt['minuteDrawdownPeak'] or '')[:10] + ' → ' + (mt['minuteDrawdownTrough'] or '')[:10],
            m(iso['net']) if iso else 'n/a'] + (extra or [])


head = ['Config', 'DEV 2017-06-15→2021', 'VAL 2022–2023', 'FX 2024-01-02→2026-10-13 (exposed)', 'RECENT 10-14→10-29', 'FULL net',
        'gross', 'interest', 'friction', 'lots (W/L)', 'median lot', 'mean lot', 'time in market', 'max minute DD ($ / % of $100k)',
        'max daily DD', 'minute DD peak → trough', 'isolated FX run']
rows = [pool_row('C5 B5-original-frozen (5 ETFs)', c5, final['c5']['isolatedFx'])]
for key in ['C3', 'C2', 'C1', 'T1-P', 'T1-S', 'T2-s1-coord', 'T2-s1-joint', 'T2-s2-coord', 'T2-s2-joint', 'T2-s3-coord', 'T2-pareto-1']:
    it = fb[key]
    label = {'C3': 'C3 B5-3ETF-frozen-ablation', 'C2': 'C2 VGT primary + KRE lowDd', 'C1': 'C1 VGT primary alone'}.get(key, key)
    rows.append(pool_row(label, it['metrics'], it['isolatedFx']))
write('pool_final.md', table(head, rows) + '\nT2-pareto-2…8 trade identically to T2-s2-joint/T2-pareto-1 on DEV (disclosure D1); their full-history nets are $372,509–$373,967.\n')

# per-ETF breakdown
rows = []
for key, mt in [('C5', c5)] + [(k, fb[k]['metrics']) for k in ['C3', 'C2', 'T1-P', 'T1-S', 'T2-s2-joint', 'T2-s3-coord']]:
    for sym, v in sorted(mt['bySymbol'].items()):
        rows.append([key, sym, v['lots'], v['wins'], m(v['net']), m(v['interest']), m(v['costs']), p(v['net'] / mt['net'])])
write('pool_by_etf.md', table(['Config', 'ETF', 'funded lots', 'winners', 'net', 'interest', 'friction', 'share of net'], rows))

# refusal matrices
rows = []
for key, mt in [('C5', c5)] + [(k, fb[k]['metrics']) for k in ['C3', 'C2', 'T1-P', 'T1-S']]:
    rows.append([key, mt['decisions'], mt['granted'], mt['refused'], ', '.join(f'{k} {v}' for k, v in sorted(mt['refusalsBy'].items()))])
write('pool_refusals.md', table(['Config', 'decisions', 'funded', 'refused', 'refused decider<holder (count)'], rows))

# sensitivities
rows = []
sens_keys = ['cost0', 'cost2', 'cost10', 'cost20', 'rate8', 'rate14', 'nextOpen', 'slip10', 'slip25', 'arm2017-12-15', 'arm2018-06-15']
for key, s in [('C5', final['c5']['sensitivities'])] + [(k, fb[k]['sensitivities']) for k in ['C3', 'C2', 'T1-P', 'T1-S']]:
    rows.append([key] + [f"{m(s[k]['net'])} / {m(s[k]['dd'])}" for k in sens_keys])
write('pool_sensitivities.md', table(['Config'] + [k + ' (FULL net / minute DD)' for k in sens_keys], rows))

# neighbourhoods (validation evidence + final)
bev = {e['key']: e for e in bval['evidence']}
rows = []
for key in ['C3', 'C2', 'C1', 'T1-P', 'T1-S', 'T2-s1-coord', 'T2-s1-joint', 'T2-s2-coord', 'T2-s2-joint', 'T2-s3-coord', 'T2-pareto-1']:
    e = bev[key]
    j = e['jointSummary']
    failed = ','.join(k for k, ok in e['gates'].items() if not ok) or 'PASS'
    fin = fb[key].get('jointN1')
    rows.append([key, m(e['centre']['dev']), m(e['centre']['val']), m(e['centre']['metrics']['minuteDrawdown']),
                 f"{m(j['devMedian'])} [{m(j['devP10'])}, {m(j['devP90'])}]", f"{m(j['valMedian'])} [{m(j['valP10'])}, {m(j['valP90'])}]",
                 m(j['ddMedian']), m(j['ddP90']), p(j['share35'], 0), f"{j['centrePercentileDev']:.2f}/{j['centrePercentileVal']:.2f}",
                 f"{e['score']:,.0f}", failed,
                 (f"{m(fin['fxMedian'])} [{m(fin['fxP10'])}, {m(fin['fxP90'])}]; DD p90 {m(fin['ddP90'])}; <35k {p(fin['share35'], 0)}" if fin else '—')])
write('pool_neighbourhoods.md', table(['Config', 'DEV centre', 'VAL centre', 'centre minute DD →2023', 'joint N1 DEV median [p10, p90]',
                                       'joint N1 VAL median [p10, p90]', 'N1 DD median', 'N1 DD p90', 'N1 share DD<$35k',
                                       'centre percentile DEV/VAL', 'score S_P ($/yr)', 'failed gates', 'FX joint N1 (final)'], rows))
rows = []
for key in ['C3', 'C2', 'T1-P', 'T1-S', 'T2-s2-joint', 'T2-s3-coord']:
    for sym, s in bev[key]['perBook'].items():
        fin = (fb[key].get('perBookN1') or {}).get(sym)
        rows.append([key, sym, m(s['devMedian']), m(s['valMedian']), m(s['ddP90']), p(s['share35'], 0),
                     (f"{m(fin['fxMedian'])}; DD p90 {m(fin['ddP90'])}; <35k {p(fin['share35'], 0)}" if fin else '—')])
write('pool_perbook.md', table(['Config', 'perturbed book', 'N1 DEV median', 'N1 VAL median', 'N1 DD p90 (→2023)', 'share DD<$35k', 'final: FX median; DD p90; share'], rows))

# classification
rows = []
for key in ['T1-P', 'T1-S', 'T2-s1-coord', 'T2-s1-joint', 'T2-s2-coord', 'T2-s2-joint', 'T2-s3-coord', 'T2-pareto-1', 'C2', 'C1']:
    it = fb[key]
    rows.append([key, it['role'], m(it['metrics']['periods']['FX']), m(it['fxDeltaVsC3']), m(it['fxDeltaVsC5']), it['classification']['risk'], it['classification']['fxVsC3']])
write('pool_classification.md', table(['Config', 'status', 'FX net', 'FX Δ vs C3', 'FX Δ vs C5', 'FULL minute DD < $35k', 'FX vs C3'], rows))

# leave-one-year-out
rows = []
for key, it in [('C3', fb['C3']), ('T1-P', fb['T1-P']), ('T1-S', fb['T1-S'])]:
    rows.append([key] + [m(it['leaveOneYearOut'].get(str(y))) for y in range(2017, 2027)])
write('pool_leave_one_year_out.md', table(['Config'] + [f'FULL without {y}' for y in range(2017, 2027)], rows))

# ---------------- Track 1 ----------------
def t1_section(rec, label):
    out = [f'### {label}\n', f"Window {rec['window']['first']} → {rec['window']['last']}, arming {rec['window']['eligibility']}. Base C2 at 0/2/5/10 bps: "
           + ', '.join(f"{c}: {m(v['net'])} (DD {m(v['dd'])}, {v['lots']} lots)" for c, v in rec['base']['at'].items()) + '.\n']
    for tr in ['S', 'P']:
        t = rec['tracks'][tr]
        s = t['summary']
        sel = t['selected']
        out.append(f"- Track {tr}: {s['newVectors']} new vectors, {s['generations']} generations ({s['stopReason']}); {t['feasibleCount']} feasible; "
                   f"robust in shortlist: {sum(1 for c in t['checks'] if c['robust'])}/{len(t['checks'])}; selected "
                   + (f"`{sel['id']}` ({sel['origin']}) {sel['short']}: objective@0/2/5/10 {', '.join(m(sel['objective'][k]) for k in ['0', '2', '5', '10'])}, DD {m(sel['drawdown'])}, folds {', '.join(m(x) for x in sel['folds'])}, without best regime {m(sel['withoutBestRegime'])}" if sel else 'none') + '\n')
    rows = []
    for c in rec['configurations']:
        r5 = c['results']['5']
        rows.append([c['key'], c['vector']['short'], m(r5['pool']['net']), m(r5['pool']['delta']), m(r5['pool']['ownNet']), m(r5['pool']['gained']), m(r5['pool']['displaced']),
                     m(r5['pool']['dd']), f"{r5['pool']['lots']} in {r5['pool']['lotYears']} yrs", ', '.join(m(x) for x in r5['pool']['folds']),
                     ' '.join(f"{k}{'✓' if v else '✗'}" for k, v in c['gate'].items()), c['status'],
                     f"{m(r5['standalone']['net'])} / {m(r5['standalone']['dd'])} / {r5['standalone']['trades']}"])
    out.append('\n' + table(['Config', 'GDX vector', 'pool net @5', 'Δ vs C2', 'GDX lots net', '+ base lots gained', '− base lots displaced', 'pool DD',
                             'GDX lots', 'Δ by fold', 'T1 T2 T3', 'Track 1 status', 'GDX standalone net / DD / trades'], rows))
    if rec.get('substitution'):
        s = rec['substitution']
        out.append(f"\nSubstitution diagnostic ({s['label']}): net {m(s['net'])}, DD {m(s['dd'])}, Δ vs C2 {m(s['deltaVsC2'])} vs the addition's {m(s['additionDelta'])}; beats the addition by ≥ $5,000: {s['beatsAdditionBy5000']}.\n")
    return '\n'.join(out)


write('track1.md', t1_section(t1, 'Track 1 main (search ≤ 2021-12-31)') + '\n' + t1_section(t1wf, 'Track 1 WF20 (search ≤ 2019-12-31)'))

# ---------------- Track 2a ----------------
out = []
for run in t2['runs']:
    if 'skipped' in run:
        out.append(f"- {run['run']}: skipped ({run['skipped']})\n")
        continue
    out.append(f"\n**{run['run']}** (start {run['start']}, order {' → '.join(run['order'])} ×2)\n")
    rows = []
    for st in run['steps']:
        rows.append([st['step'], st['book'], m(st['incumbent']['net']), 'accepted' if st['accepted'] else 'kept',
                     m(st['accepted']['net']) if st['accepted'] else '', m(st['accepted']['dd']) if st['accepted'] else '',
                     st['accepted']['short'] if st['accepted'] else st['incumbent']['short'], st['summary']['newVectors'], len(st['checks'])])
    out.append(table(['step', 'book', 'incumbent pool DEV net', 'decision', 'new pool DEV net', 'new pool DD', 'book vector after the step', 'new vectors', 'acceptance checks'], rows))
    j = run['joint']
    out.append(f"Joint step: {'accepted' if j['accepted'] else 'kept the coordinate result'}; pool DEV net {m(j['net'])}, DD {m(j['dd'])} ({j['summary']['newVectors']} new vectors).\n")
out.append('\nPath dependence (joint normalized L∞ between runs): ' + '; '.join(f"{d['a']}–{d['b']}: coordinate {d['coordinateDistance']:.2f}, joint {d['jointDistance']:.2f}" for d in t2['pathDependence']) + '\n')
write('track2.md', '\n'.join(out))

# ---------------- Study A ----------------
fa = {item['id']: item for item in final['studyA']}
rows = []
for e in aval['evidence']:
    n1 = e['n1Summary']
    fin = fa[e['id']]
    failed = ','.join(k for k, ok in e['gates'].items() if not ok) or 'PASS'
    rows.append([e['id'] if not e['control'] else e['id'], e['list'], e['short'], m(e['centre']['dev']), m(e['centre']['val']), m(e['isolatedVal']['net']),
                 m(e['centre']['metrics']['minuteDrawdown']), f"{e['centre']['metrics']['closed']} ({e['centre']['metrics']['wins']} W)",
                 f"{m(n1['devMedian'])} [{m(n1['devP10'])}, {m(n1['devP90'])}]", f"{m(n1['valMedian'])} [{m(n1['valP10'])}, {m(n1['valP90'])}]",
                 m(n1['ddP90']), p(n1['share35'], 0), f"{e['probeSummary']['feasibleShare']:.2f} / {m(e['probeSummary']['devMedian'])}", f"{e['score']:,.0f}", failed,
                 m(fin['metrics']['periods'].get('FX')), m(fin['metrics']['minuteDrawdown'])])
write('studyA_shortlist.md', table(['Vector', 'list', 'parameters', 'DEV net', 'VAL net (chained)', 'VAL isolated', 'minute DD →2023', 'closed (wins) →2023',
                                     'N1 DEV median [p10, p90]', 'N1 VAL median [p10, p90]', 'N1 DD p90', 'N1 share <$35k', 'probes feasible / median DEV',
                                     'score S', 'failed gates', 'FX net (final, after freeze)', 'FULL minute DD (final)'], rows))

rows = []
for id_ in [n['id'] for n in manifest['studyA']['nearMisses']] + [c['id'] for c in aval['evidence'] if c['control']]:
    it = fa[id_]
    mt = it['metrics']
    n1 = it.get('n1') or {}
    rows.append([id_, it['short'], m(mt['periods'].get('DEV')), m(mt['periods'].get('VAL')), m(mt['periods'].get('FX')), m(mt['periods'].get('RECENT')), m(mt['net']),
                 m(mt['gross']), m(mt['interest']), m(mt['costs']), f"{mt['closed']} ({mt['wins']}/{mt['losses']}), open {mt['open']}", m(mt['medianLot']), m(mt['bestLot']), m(mt['worstLot']),
                 p(mt['top1Share']), p(mt['top3Share']), p(mt['exposure']), f"{m(mt['minuteDrawdown'])} ({mt['minuteDrawdownPeak'][:10]} → {mt['minuteDrawdownTrough'][:10]})",
                 m(mt['dailyDrawdown']), m(it['isolatedFx']['net']),
                 f"{m(n1.get('fxMedian'))} [{m(n1.get('fxP10'))}, {m(n1.get('fxP90'))}]", m(n1.get('ddP90')), p(n1.get('share35'), 0), it.get('classification', '')])
write('studyA_final.md', table(['Vector', 'parameters', 'DEV', 'VAL', 'FX (exposed)', 'RECENT', 'FULL net', 'gross', 'interest', 'friction', 'closed (W/L)', 'median trade',
                                'best trade', 'worst trade', 'top-1 share', 'top-3 share', 'time in market', 'max minute DD (peak → trough)', 'max daily DD',
                                'isolated FX', 'FX N1 median [p10, p90]', 'FULL N1 DD p90', 'N1 share <$35k', 'rule label (§7.3)'], rows))

rows = []
for id_ in [n['id'] for n in manifest['studyA']['nearMisses']] + [c['id'] for c in aval['evidence'] if c['control']]:
    s = fa[id_].get('sensitivities') or {}
    rows.append([id_] + [f"{m(s[k]['net'])} / {m(s[k]['dd'])}" for k in sens_keys])
write('studyA_sensitivities.md', table(['Vector'] + [k + ' (FULL net / minute DD)' for k in sens_keys], rows))

rows = []
for id_ in [n['id'] for n in manifest['studyA']['nearMisses']] + [c['id'] for c in aval['evidence'] if c['control']]:
    rows.append([id_] + [m(fa[id_]['leaveOneYearOut'].get(str(y))) for y in range(2017, 2027)])
write('studyA_leave_one_year_out.md', table(['Vector'] + [f'FULL without {y}' for y in range(2017, 2027)], rows))

rows = []
for id_ in [n['id'] for n in manifest['studyA']['nearMisses']] + [c['id'] for c in aval['evidence'] if c['control']]:
    for lot in fa[id_].get('march2020', []):
        rows.append([id_, lot['entry'], lot['exit'], lot['exitReason'], f"{lot['entryRawPrice']:.2f}", f"{lot['exitRawPrice']:.2f}", m(lot['gross']), m(lot['interest']), m(lot['net']), m(lot['worstMark']), lot['worstMarkTime']])
write('studyA_march2020.md', table(['Vector', 'entry (NY)', 'exit (NY)', 'exit reason', 'entry fill (raw)', 'exit fill (raw)', 'gross', 'interest', 'net', 'worst mark (MAE)', 'MAE time'], rows))

# search summaries and multiple testing
def search_summary(rec, label):
    rows = [[label, s['label'], s['newVectors'], s['generations'], s['stopReason'], f"{s['hypervolume'][-1]:.3g}" if s['hypervolume'] else ''] for s in rec['summaries']]
    return rows


rows = search_summary(asearch, 'main') + search_summary(awfsearch, 'wf20')
txt = table(['fold', 'replicate', 'new vectors', 'generations', 'stop', 'final hypervolume'], rows)
txt += f"\nmain: {asearch['evaluations']['unique']} unique vectors, {asearch['feasibleCount']} feasible; wf20: {awfsearch['evaluations']['unique']} unique, {awfsearch['feasibleCount']} feasible.\n"
txt += '\nReplicate best vectors (main): ' + '; '.join(f"r{b['replicate']} `{b['id']}` {m(b['net'])} DD {m(b['dd'])}" for b in asearch['replicateBest']) + '\n'
txt += 'Path dependence (normalized L∞ between replicate bests, main): ' + ', '.join(f"r{d['a']}–r{d['b']} {d['distance']:.2f}" for d in asearch['pathDependence']) + '\n'
mt = aval['multipleTesting']
txt += f"\nMultiple testing (main): {mt['runs']} validation-stage runs; shortlist {mt['shortlistSize']}; PBO (CSCV over {len(mt['halves'])} half-years) = {mt['pbo']['pbo'] if mt['pbo'] else 'n/a'}; median DEV $/yr of the shortlist {m(mt['decay']['devMedianOfShortlist'])} → median VAL $/yr {m(mt['decay']['valMedianOfShortlist'])}; the best DEV vector {mt['decay']['bestDevItemValPerYear']['id']}: DEV {m(mt['decay']['bestDevItemValPerYear']['devPerYear'])}/yr → VAL {m(mt['decay']['bestDevItemValPerYear']['valPerYear'])}/yr.\n"
mw = awf['multipleTesting']
txt += f"WF20: shortlist {mw['shortlistSize']}; PBO = {mw['pbo']['pbo'] if mw['pbo'] else 'n/a'}; median WF20-search $/yr {m(mw['decay']['devMedianOfShortlist'])} → median WF20-test $/yr {m(mw['decay']['valMedianOfShortlist'])}; picks {awf['picks']}.\n"
txt += f"\nRank correlation (Spearman) of the main shortlist's validation score with its FX net (after the freeze): {final['studyARankCorrelation']['valScoreVsFxNet']:.3f} (n = {final['studyARankCorrelation']['n']}).\n"
write('studyA_search.md', txt)

rows = []
for e in awf['evidence']:
    rows.append([e['id'], e['list'], m(e['centre']['dev']), m(e['centre']['val']), m(e['centre']['metrics']['minuteDrawdown']), m(e['n1Summary']['valMedian']), m(e['n1Summary']['ddP90']), p(e['n1Summary']['share35'], 0), ','.join(k for k, ok in e['gates'].items() if not ok) or 'PASS'])
write('studyA_wf20.md', table(['Vector', 'list', 'WF20-search net 2017-06-15→2019', 'WF20-test net 2020–2021', 'minute DD →2021', 'N1 test median', 'N1 DD p90', 'N1 share <$35k', 'failed gates'], rows))

# parity
rows = [[r['gate'], r.get('door', ''), r.get('key', r.get('track', '')), r.get('costBps', ''), len(r.get('differences', [])) if 'differences' in r else '', r.get('checks', '')] for r in parity['rows'] if r['gate'] == 'P1']
txt = table(['gate', 'door', 'config', 'bps', 'differences', 'checks'], rows)
p2 = next(r for r in parity['rows'] if r['gate'] == 'P2')
txt += f"\nP2: replay {m(p2['replay']['net'], 2)} / minute DD {m(p2['replay']['minute'], 2)} / daily {m(p2['replay']['daily'], 2)} vs app runner {m(p2['app']['net'], 2)} / {m(p2['app']['minute'], 2)} / {m(p2['app']['daily'], 2)} (GDX portfolioAware, training partition, 0 bps).\n"
for r in parity['rows']:
    if r['gate'] == 'P4':
        txt += f"P4 Track {r['track']}: selected {r['selectedId']} (sealed {r['sealedId']}), feasible {r['feasible']} (sealed {r['sealedFeasible']}), identical hypervolume trajectory {r['sameHypervolume']}, identical objectives at 0/2/5/10 bps {r['sameObjective']}.\n"
txt += f"\nPassed: {parity['passed']}\n"
write('parity.md', txt)

# audit
a = final['audit']
txt = f"XRT lot in C5: {a['xrtLot']}\n\n"
txt += table(['decider', 'holder', 'decision (NY)', 'setup', 'virtual entry', 'virtual exit', 'virtual exit reason', 'virtual net (NOT executed)'],
             [[r['decider'], r['holder'], r['decisionTime'], r['setupKind'], r['virtualEntry'], r['virtualExit'], r['virtualExitReason'], m(r['virtualNet'], 2)] for r in a['c5RefusedByXrtOrXbiAllHistory']])
write('audit_refused_by_xrt_xbi.md', txt)
print('tables written to', OUT)
