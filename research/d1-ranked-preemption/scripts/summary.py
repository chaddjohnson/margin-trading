# Descriptive summaries for the reports, read only from the sealed records (no recomputation, no market data).
# Usage (repository root): python3 -I research/d1-ranked-preemption/scripts/summary.py > research/d1-ranked-preemption/results/tables/summary.json
import json, sys
R = 'research/d1-ranked-preemption'
W = ['fold-a', 'fold-b', 'final']
load = lambda p: json.load(open(p))
out = {}

def spearman(a, b):
    common = [s for s in a if s in b]
    ra = {s: i for i, s in enumerate(common)}
    bb = [s for s in b if s in common]
    rb = {s: i for i, s in enumerate(bb)}
    n = len(common)
    d2 = sum((ra[s] - rb[s]) ** 2 for s in common)
    return 1 - 6 * d2 / (n * (n * n - 1)) if n > 1 else None

rank = {(w, k): load(f'{R}/rankings/{w}/{k}.json') for w in W for k in ['R1', 'R2']}
out['spearman'] = {
    'R1_vs_R2': {w: spearman(rank[(w, 'R1')]['order'], rank[(w, 'R2')]['order']) for w in W},
    'R1_fold-a_vs_fold-b': spearman(rank[('fold-a', 'R1')]['order'], rank[('fold-b', 'R1')]['order']),
    'R1_fold-b_vs_final': spearman(rank[('fold-b', 'R1')]['order'], rank[('final', 'R1')]['order']),
    'R1_fold-a_vs_final': spearman(rank[('fold-a', 'R1')]['order'], rank[('final', 'R1')]['order']),
    'R2_fold-a_vs_fold-b': spearman(rank[('fold-a', 'R2')]['order'], rank[('fold-b', 'R2')]['order']),
    'R2_fold-b_vs_final': spearman(rank[('fold-b', 'R2')]['order'], rank[('final', 'R2')]['order']),
    'R2_fold-a_vs_final': spearman(rank[('fold-a', 'R2')]['order'], rank[('final', 'R2')]['order']),
}
b5 = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']
out['b5_order'] = {f'{w}/{k}': [s for s in rank[(w, k)]['order'] if s in b5] for w in W for k in ['R1', 'R2']}
out['b5_positions'] = {f'{w}/{k}': {e['symbol']: e['position'] for e in rank[(w, k)]['entries'] if e['symbol'] in b5} for w in W for k in ['R1', 'R2']}
out['top10'] = {f'{w}/{k}': [(e['symbol'], e['score'], e['trades'], e['sample'], e['status']) for e in rank[(w, k)]['entries'][:10]] for w in W for k in ['R1', 'R2']}

for w in W:
    a = load(f'{R}/results/standalone/{w}/STAGE_A.json')
    out[f'stageA/{w}'] = {'counts': a['counts'], 'evaluations': a['evaluations'], 'minTrades': a['minTrades'],
        'rejected': [s for s, v in a['symbols'].items() if v['status'] == 'rejected'],
        'screenedDown': [s for s, v in a['symbols'].items() if v['status'] == 'screened-down'],
        'reserve': [s for s, v in a['symbols'].items() if v['status'] == 'reserve'],
        'uncertain': [s for s, v in a['symbols'].items() if v['uncertain']],
        'b5': {s: {k: a['symbols'][s]['representative']['metrics'].get(k) for k in ['trades', 'net', 'meanNet', 'netPerDay', 'minuteDrawdown', 'bestTrade']} | {'status': a['symbols'][s]['status']} for s in b5}}
    d = load(f'{R}/results/diagnostic/{w}/DIAGNOSTIC.json')
    out[f'diagnostic/{w}'] = {'materiality': d['materiality'], 'pools': {n: {k: p[k] for k in ['members', 'decisions', 'refused', 'lots', 'actionable', 'higher', 'estimateNonNegative', 'ties']} | {'refusedWhileHeld': len(p['overlaps'])} for n, p in d['pools'].items()}}
    c = load(f'{R}/results/controls/{w}/CONTROLS.json')
    out[f'controls/{w}'] = {cid: {'net5': c['fixed'][cid]['5']['net'], 'dd5': c['fixed'][cid]['5']['minuteDrawdown'], 'lots': c['fixed'][cid]['5']['lots'],
        'net0': c['fixed'][cid].get('0', {}).get('net'), 'net2': c['fixed'][cid].get('2', {}).get('net'), 'net10': c['fixed'][cid].get('10', {}).get('net'),
        'bestLot': c['fixed'][cid]['5']['bestLot'], 'top2': c['fixed'][cid]['5']['top2'], 'preemptions': c['fixed'][cid]['5']['preemptions'],
        'preemptedNet': c['fixed'][cid]['5']['preemptedNet'], 'replacementNet': c['fixed'][cid]['5']['replacementNet'], 'hindsight': c['fixed'][cid]['5']['hindsightContinuation'],
        'netBySymbol': c['fixed'][cid]['5']['netBySymbol'], 'lotsBySymbol': c['fixed'][cid]['5']['lotsBySymbol'], 'interest': c['fixed'][cid]['5']['interest'],
        'portfolio': c['portfolio'].get(cid), 'engine': c['engine'].get(cid)} for cid in [x['id'] for x in c['configurations']]}
    out[f'controls/{w}/neighbourhoods'] = c['neighbourhoods']
    for k in ['R1', 'R2']:
        j = load(f'{R}/results/joint/{w}/{k}/JOINT.json')
        out[f'joint/{w}/{k}'] = {'budgetShare': j['budgetShare'], 'universe': len(j['universe']), 'pick': j['pick'] and {'arm': j['pick']['arm'], 'members': j['pick']['metrics']['members'], 'net': j['pick']['metrics']['net'], 'dd': j['pick']['metrics']['minuteDrawdown'], 'score': j['pick']['metrics']['score'], 'assessment': j['pick']['assessment']},
            'arms': [{'arm': a['arm'], 'evaluations': a['evaluations'], 'generations': a['generations'], 'feasible': a['feasible'], 'symbolsTried': len(a['coverage']['symbols']), 'minSymbolCount': min(a['coverage']['symbols'].values()), 'sizes': a['coverage']['sizes'],
                      'finalist': a['finalist'] and {'members': a['finalist']['metrics']['members'], 'net': a['finalist']['metrics']['net'], 'score': a['finalist']['metrics']['score'], 'J_nbB': a['finalist']['assessment']['medianScore'], 'shareDD': a['finalist']['assessment']['shareDrawdownOk']},
                      'promotedMemberships': len({tuple(p['members']) for p in a['promoted']})} for a in j['arms']]}
for f in ['fold-a', 'fold-b']:
    v = load(f'{R}/results/walkforward/{f}/VALIDATION.json')
    out[f'validation/{f}'] = {'gates': v['gates'], 'boundary': v['boundary'], 'continuity': v['continuity'],
        'fixed': {cid: {'V5': x['5']['validation']['net'], 'V10': x.get('10', {}).get('validation', {}).get('net'), 'Vdd': x['5']['validation']['minuteDrawdown'], 'Vlots': x['5']['validation']['lots'], 'netBySymbolWhole': x['5']['netBySymbol']} for cid, x in v['fixed'].items()},
        'portfolio': {cid: p['validation'] for cid, p in v['portfolio'].items()}, 'engine': {cid: {'validationPreemptions': e['validationPreemptions']} for cid, e in v['engine'].items()}}
out['procedureGate'] = load(f'{R}/results/walkforward/PROCEDURE_GATE.json')['result']
sel = load(f'{R}/FROZEN_SELECTION.json')
out['selection'] = {'decision': sel['decision'], 'nominees': sel['nominees'], 'gates': sel['gates']}
json.dump(out, sys.stdout, indent=1, default=str)
