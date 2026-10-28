#!/usr/bin/env python3
"""Read-only report helper: prints compact key figures from the sealed records (no record is written or changed).

Usage (repository root): python3 -I research/d1-wide-library-chronological-selection/scripts/summary.py [section]
Sections: census, search, libraries, verdicts, cells, nested, rolling, ablations, events, references (default: all).
"""
import gzip
import json
import os
import sys

ROOT = 'research/d1-wide-library-chronological-selection'
RES = os.path.join(ROOT, 'results')


def load(path):
    with open(path) as f:
        return json.load(f)


def money(x):
    return '—' if x is None or (isinstance(x, float) and x != x) else f"${x:,.0f}"


def census():
    for w in ['fold-a', 'fold-b', 'final']:
        p = os.path.join(RES, 'archive', w, 'CENSUS.json')
        if not os.path.exists(p):
            continue
        c = load(p)
        s = c['summary']
        rows = c['rows']
        d = lambda k: sum(r['discarded'][k] for r in rows)
        print(f"{w}: rows {sum(r['evaluated'] for r in rows)}, credible {sum(r['credible'] for r in rows)} "
              f"(local {sum(r['credibleLocal'] for r in rows)}), families {sum(r['families'] for r in rows)}, "
              f"median {s['medianFamilies']}, ETFs>=8/16/32/64 {[s['etfsWithAtLeast'][str(k)] for k in [8,16,32,64]]}, "
              f"reproduced {s['reproduced']}, T-a {s['triggerFewFamiliesShare']:.2f}, T-b {s['triggerDominanceShare']:.2f}")
        print(f"   discarded: nonpos {d('nonPositiveNet')}, DD {d('excessDrawdown')}, trades {d('lowTradeCount')}, both {d('lowTradesAndDrawdown')}, "
              f"outsideTop32 {d('credibleOutsideTop32')} (families {d('credibleFamiliesOutsideTop32')}), nearDup {d('top32NearDuplicates')}, "
              f"beyondCap {d('top32DistinctBeyondCap')}, crowdedOutTopT {d('crowdedOutTopTFamilies')}, J'-displaced {d('bestTradePenaltyDisplacedFamilies')} "
              f"in {s['bestTradePenaltyDisplacedEtfs']} ETFs, tBest=rep {s['tBestIsRepresentativeFamily']}")
        disp = [x for r in rows for x in r['discarded']['bestTradePenaltyDisplaced']]
        if disp:
            share = sorted(x['best'] / x['net'] for x in disp if x['net'] > 0)
            reps = sorted(r['oldPenalty']['representative']['best'] / r['oldPenalty']['representative']['net'] for r in rows if r['oldPenalty']['representative'] and r['oldPenalty']['representative']['net'] > 0)
            print(f"   J'-displaced median best/net {share[len(share)//2]:.2f} vs representatives {reps[len(reps)//2]:.2f}")


def search():
    for f in ['S18', 'S19', 'A', 'S20', 'B', 'S22']:
        p = os.path.join(RES, 'search', f, 'SEARCH.json')
        if not os.path.exists(p):
            continue
        s = load(p)
        ps = s['perSymbol'].values()
        print(f"{f}: evals {s['evaluations']}, sobol {sum(r['sobol'] for r in ps)}, refine {sum(r['refine'] for r in ps)}, credible {sum(r['credible'] for r in ps)}, "
              f"no-credible ETFs {sum(1 for r in ps if r['credible']==0)}, collisions {sum(r['collisionsDropped'] for r in ps)}, laterLocal {sum(len(r['laterLocalCollisionsKept']) for r in ps)}, "
              f"starts {sum(r['starts'] for r in ps)}, {s['startedAt'][11:19]}->{s['finishedAt'][11:19]}, workers {s['workers']}")


def libraries():
    for f in ['S18', 'S19', 'A', 'S20', 'B', 'S22']:
        p = os.path.join(RES, 'libraries', f, 'SELECTION.json')
        if not os.path.exists(p):
            continue
        s = load(p)
        print(f"{f}: draws {s['drawEvaluations']}, flags {len(s['flags'])}, {s['startedAt'][11:19]}->{s['finishedAt'][11:19]}")
        for pool, sel in s['selections'].items():
            v = list(sel.values())
            fam = sorted(x['families'] for x in v)
            noms = lambda arm, k: sum(1 for x in v if x['arms'][arm]['nominees'][str(k)])
            a0 = [x.get('a0') for x in v if x.get('a0')]
            print(f"   {pool}: credible ETFs {sum(1 for x in v if x['credible']>0)}, median families {fam[len(fam)//2]}, >=8/16/32/64 {[sum(1 for x in fam if x>=k) for k in [8,16,32,64]]}, "
                  f"A0r noms {sum(1 for x in v if x['a0r']['nominee'])}, A1/A1n/A2/A3(16) {[noms(a,16) for a in ['A1','A1n','A2','A3']]}"
                  + (f", A0 noms {sum(1 for x in a0 if x['nominee'])}, A0!=A0r {sum(1 for x in a0 if not x['equalsA0r'])}" if a0 else ''))
            pw = s['power'][pool]
            print(f"      identical-to-baseline at K=16: " + ', '.join(f"{a} {pw[a]['16']['identical']}" for a in ['A1', 'A1n', 'A2', 'A3']))


def analysis():
    p = os.path.join(RES, 'analysis', 'ANALYSIS.json')
    return load(p) if os.path.exists(p) else None


def verdicts(a):
    print('outcome:', a['outcome'], '| nested:', a['nestedVerdict'])
    for pool, v in a['verdicts'].items():
        print(f"  {pool}: {v}  across: {a['acrossVerdicts'][pool]}")
    print('  nested cells:', a['nestedCells'], '\n  nested across:', a['nestedAcross'])
    print('  rolling:', a['rolling'])


def cells(a, keys=('A', 'B'), k='16'):
    for cell in keys:
        print(f"== {cell}")
        for m in a['metrics']:
            if m['cell'] != cell or m['k'] not in ('-', k):
                continue
            c = a['comparisons'].get(cell, {}).get(m['pool'], {}).get(m['arm'], {}).get(k if m['k'] != '-' else '16')
            cs = '' if not c else (f" Δ5 {money(c['meanD5'])} Δ10 {money(c['meanD10'])} W/L/I {c['wins']}/{c['losses']}/{c['identical']} C {c['clusterWins']}/{c['clusterLosses']} "
                                   f"B {c['breachesArm']}/{c['breachesBase']} {'FAV' if c['favourable'] else 'unfav' if c['unfavourable'] else 'insuff' if not c['evaluable'] else '-'}")
            print(f"  {m['pool']:6} {m['arm']:4} K{m['k']:>2} noms {m['nominees']:2} lots {m['windowLots']:3} ΣV5 {money(m['v']['5']['sum'])} ΣV10 {money(m['v']['10']['sum'])} med {money(m['v']['5']['median'])} breach {m['breaches']}{cs}")


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if which in ('census', 'all'):
        census()
    if which in ('search', 'all'):
        search()
    if which in ('libraries', 'all'):
        libraries()
    a = analysis()
    if a and which in ('verdicts', 'all'):
        verdicts(a)
    if a and which in ('cells', 'all'):
        cells(a)
    if a and which == 'rolling':
        cells(a, ('S18', 'S19', 'S20', 'S21', 'S22'))
    if a and which == 'nested':
        cells(a, ('T1-later', 'T2-later'))


if __name__ == '__main__':
    main()
