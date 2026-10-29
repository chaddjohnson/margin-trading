#!/usr/bin/env python3
"""Readable tables for the Stage 1b reports, generated read-only from the sealed records and payloads
(research/study3-vgt-momentum-stage1b/results). Verifies every payload's sha256 before reading it and writes
results/tables/*.md. Run from the repository root: python3 -I research/study3-vgt-momentum-stage1b/scripts/report_tables.py
"""
import gzip
import hashlib
import json
import os

ROOT = 'research/study3-vgt-momentum-stage1b'
REC = f'{ROOT}/results/records'
OUT = f'{ROOT}/results/tables'


def record(stage):
    with open(f'{REC}/{stage}.json') as f:
        return json.load(f)


def payload(stage, name):
    r = record(stage)
    p = r['payloads'][name]
    data = open(p['file'], 'rb').read()
    assert hashlib.sha256(data).hexdigest() == p['sha256'], f'{stage}/{name} does not verify'
    text = gzip.decompress(data).decode()
    if p['file'].endswith('.jsonl.gz'):
        return [json.loads(line) for line in text.splitlines() if line]
    return json.loads(text)


def usd(x, sign=True):
    if x is None:
        return '—'
    if isinstance(x, str):
        return x
    s = f'{abs(x):,.0f}'
    return (('+' if x >= 0 else '−') if sign else ('' if x >= 0 else '−')) + '$' + s


def pct(x):
    return '—' if x is None else f'{100 * x:.0f}%'


def table(headers, rows):
    lines = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join('---' for _ in headers) + '|']
    for row in rows:
        lines.append('| ' + ' | '.join(str(c) for c in row) + ' |')
    return '\n'.join(lines) + '\n'


def write(name, text):
    os.makedirs(OUT, exist_ok=True)
    with open(f'{OUT}/{name}', 'w') as f:
        f.write(text)
    print('wrote', name)


def params(key):
    e = ', '.join(f'{k}={v}' for k, v in sorted(key['entryParams'].items()))
    x = key['exit']
    xs = (x['family'] + '{' + ', '.join(f'{k}={v}' for k, v in sorted(x['params'].items())) + '}') if 'family' in x else x.get('fixed', 'own')
    s = key['sizing']
    sz = s['kind'] if s['kind'] in ('Z0', 'ZR', 'Z1') else (f"Z2({s['u']},{s['v']})" if s['kind'] == 'Z2' else f"Z3({s['G']})")
    return f"{key['entry']}{{{e}}} × {xs} · {key['reentry']} · {sz}"


def picks():
    rows = []
    for h in ['A', 'B', 'C', 'D', 'H']:
        sel = payload(f'develop-{h}', 'selection')
        summ = record(f'develop-{h}')['summary']
        for kind in ['rod', 'net', 'p0', 'noE06']:
            p = sel['picks'].get(kind)
            if not p:
                rows.append([h, kind, '—', '—', '—', '—', '—', '—'])
                continue
            s = p['summary']
            rows.append([h, kind, p['pairing'], params(p['key']), usd(s['net']), usd(s['minuteDd'], False),
                         s['closedTrades'], usd(p['score']) if kind in ('net', 'p0') else f"{p['score']:.3f}"])
        rows.append([h, 'counts', f"planned {summ['planned']:,}", f"used {summ['used']:,} (duplicates {summ['duplicates']:,})", '', '', '', ''])
    write('picks.md', table(['History', 'Pick', 'Pairing', 'Policy', 'Dev net', 'Dev minute DD', 'Closed trades', 'Score'], rows))


def exit_cells():
    rows = []
    for h in ['A', 'B', 'C', 'D', 'H']:
        sel = payload(f'develop-{h}', 'selection')
        for c in sel['exitCells']:
            r = c['widened'] if c.get('usedWidened') else c['result']
            ch = r.get('rodChampion')
            nc = r.get('netChampion')
            bt = r.get('bestTraining')
            rows.append([h, r['cell'].replace('LB|', ''), r['globalDistinct'], r['feasibleGlobal'],
                         usd(bt['net']) if bt else '—',
                         usd(ch['summary']['net']) if ch else '—', usd(ch['summary']['minuteDd'], False) if ch else '—',
                         f"{ch['rod']:.3f}" if ch else '—', pct(ch['phi']) if ch else '—',
                         usd(nc['netScore']) if nc else '—', 'yes' if c.get('usedWidened') else ('tried' if c.get('widened') else '')])
    write('exit-cells.md', table(['History', 'Entry|exit', 'Distinct global', 'Feasible global', 'Best training net',
                                  'RoD champion net', 'its DD', 'RoD score', 'φ', 'NET score', 'Widened'], rows))


def pairings():
    rows = []
    for h in ['A', 'B', 'C', 'D', 'H']:
        sel = payload(f'develop-{h}', 'selection')
        for p in sel['pairings']:
            r = p['selectors'].get('rod')
            if not r:
                rows.append([h, p['id'], f"{p['entry']}×{p['exit']}", p.get('eliminated', '—'), '', '', '', '', '', ''])
                continue
            f = r['final']
            rows.append([h, p['id'], f"{p['entry']}×{p['exit']}", 'adaptive' if p['adaptive'] else '',
                         f"{r['reentryGate']['opportunities']}", r['reentryChoice'], r['sizingChoice'],
                         usd(f['summary']['net']), usd(f['summary']['minuteDd'], False), f"{f['score']:.3f}"])
    write('pairings.md', table(['History', 'ID', 'Pairing', 'Note', 'Re-entry opps', 'Re-entry', 'Sizing', 'Dev net',
                                'Dev minute DD', 'RoD'], rows))


def screening():
    rows = []
    sel = payload('develop-H', 'selection')
    for r in sel['screening']:
        s = r['summary']
        rows.append([r['entry'], r['exit'], r['reentry'], usd(s['net']), usd(s['minuteDd'], False), s['closedTrades'],
                     s['campaigns'], s['reentryOpportunities'], s['reentries'], f"{s['sessionsLong'] / max(1, s['sessions']):.0%}",
                     usd(s['avgGross'], False), 'yes' if r['feasible'] else ''])
    write('screening-H.md', table(['Entry', 'Exit', 'Re-entry', 'Net 2017–23', 'Minute DD', 'Closed', 'Campaigns',
                                   'Re-entry opps', 'Re-entries', 'Time long', 'Avg gross', 'Feasible'], rows))


def paths():
    ev = record('evaluate')['summary']
    rows = []
    for name, p in ev['paths'].items():
        w = p['windows']
        rows.append([name] + [usd(x) for x in w] + [usd(p['end']), usd(p['minuteDd'], False)])
    write('paths.md', table(['Path', '2020', '2021', '2022', '2023', 'Σ (end)', 'Chained minute DD'], rows))


def main():
    for fn in [picks, exit_cells, pairings, screening, paths]:
        try:
            fn()
        except (FileNotFoundError, KeyError) as e:
            print('skipped', fn.__name__, e)



FOLDS = ['A', 'B', 'C', 'D']
YEARS = ['2020', '2021', '2022', '2023']


def window_row(name, p):
    w = [x['increment'] for x in p['windows']]
    dd = [x['minuteDd']['maximum'] for x in p['windows']]
    return [name] + [f"{usd(a)} ({usd(b, False)})" for a, b in zip(w, dd)] + [usd(sum(w)), usd(p['minuteDd']['maximum'], False)]


def stage1_repair():
    s = record('repair')['summary']
    out = '## Stage 1 picks: continuous runs (Stage 1 engine vs Stage 1b fixed-slot) and the splice\n\n'
    out += table(['Fold', 'Pick', 'Sealed V', 'Stage 1 engine V', 'Stage 1b V', 'Window DD (S1 / S1b)'],
                 [[c['fold'], c['id'], usd(c['sealedV']), usd(c['stage1V']), usd(c['stage1bV']),
                   f"{usd(c['stage1WindowDd'], False)} / {usd(c['stage1bWindowDd'], False)}"] for c in s['continuous']])
    sp = s['splice']
    out += f"\nSplice Σ V {usd(sp['sumV'])} (sealed {usd(sp['sealedSum'])}); chained minute DD exact {usd(sp['exactChainDd'], False)}, Stage 1 method {usd(sp['stage1ChainDd'], False)}, sealed {usd(sp['sealedPiDd'], False)}.\n\n"
    paths = payload('repair', 'paths')
    out += '## Stage 1 picks as executable paths\n\n'
    out += table(['Path', '2020 (DD)', '2021 (DD)', '2022 (DD)', '2023 (DD)', 'Σ', 'Chained minute DD'],
                 [window_row(n, p) for n, p in paths.items()])
    for n in ['net|S1', 'slot|S1']:
        out += f'\n### Trades, {n}\n\n'
        out += table(['#', 'Policy', 'Kind', 'Entry', 'Exit', 'Reason', 'Entry raw', 'Exit raw', 'Net', 'Interest'],
                     [[t['id'], t['policy'].replace('s1:', ''), t['kind'], t['entryDate'], t['exitDate'] or 'open', t['exitReason'],
                       f"{t['entryRaw']:.2f}", f"{t['exitRaw']:.2f}", usd(t['net']), usd(t['interest'], False)] for t in paths[n]['trades']])
    lot = s['lotTrace']
    out += '\n## The fold-C pick\'s March 2020 lot (fixed-slot, as Stage 1)\n\n' + table(['Field', 'Value'], [[k, json.dumps(v) if isinstance(v, dict) else (f'{v:,.2f}' if isinstance(v, float) else v)] for k, v in lot.items()])
    cf = payload('repair', 'counterfactuals')
    out += '\n## Counterfactual sizing on the fold-C pick (continuous from 2017; counterfactuals, not trades)\n\n'
    out += table(['Financing', 'Sizing', '2020', '2021', '2022', '2023', 'Net 2017–23', 'Lot net', 'Lot trims', 'Lot exit', 'Lot peak gross'],
                 [[c['financing'], c['sizing']] + [usd(w['increment']) for w in c['windows'][:4]] + [usd(c['net']),
                   usd(c['lot']['net']) if c['lot'] else '—', c['lot']['trims'] if c['lot'] else '—', c['lot']['exitDate'] if c['lot'] else '—',
                   usd(c['lot']['peakGross'], False) if c['lot'] else '—'] for c in cf])
    write('stage1-repair.md', out)


def evaluate_tables():
    runs = payload('evaluate', 'runs')
    out = '## Executable paths and controls (net-debit; window increment W and window minute DD)\n\n'
    out += table(['Path', '2020', '2021', '2022', '2023', 'Σ W', 'Chained minute DD'], [window_row(n, p) for n, p in runs.items()])
    out += '\n## Policies by window\n\n'
    out += table(['Path', 'A (2020)', 'B (2021)', 'C (2022)', 'D (2023)'],
                 [[n] + [x['policy'] for x in p['policies']] for n, p in runs.items() if n.startswith('Pi') or n.startswith('static')])
    write('paths-full.md', out)
    for name in ['Pi1-S1', 'Pi1-S2', 'Pi-NET']:
        p = runs[name]
        o = f'## {name}: trades\n\n'
        o += table(['#', 'Policy', 'Kind', 'Rule', 'Entry', 'Exit', 'Reason', 'Stop', 'Entry raw', 'Exit raw', 'Trims', 'Net', 'Interest', 'Peak profit', 'Giveback', 'Peak gross'],
                   [[t['id'], t['policy'], t['kind'], t['rule'], t['entryDate'], t['exitDate'] or 'open', t['exitReason'], t['stopComponent'] or '',
                     f"{t['entryRaw']:.2f}", f"{t['exitRaw']:.2f}", len(t['trims']), usd(t['net']), usd(t['interest'], False),
                     usd(t['peakProfit']) if isinstance(t['peakProfit'], (int, float)) else '—',
                     usd(t['peakProfit'] - t['net']) if isinstance(t['peakProfit'], (int, float)) else '—', usd(t['peakGross'], False)] for t in p['trades']])
        o += '\n## Window decomposition (trade contributions; carried = open at the boundary)\n\n'
        o += table(['Window', 'Trade', 'Policy', 'Carried', 'Start value', 'End value', 'Contribution', 'Exit'],
                   [[YEARS[c['window']], c['trade'], c['policy'], 'yes' if c['carried'] else '', usd(c['startValue']), usd(c['endValue']), usd(c['contribution']), c['exitReason']] for c in p['contributions']])
        o += '\n## Windows\n\n'
        o += table(['Window', 'W', 'Minute DD', 'Daily DD', 'Interest', 'Avg gross (f_MV)', 'Peak gross', 'Sessions long', 'Debit $-days'],
                   [[YEARS[i], usd(w['increment']), usd(w['minuteDd']['maximum'], False), usd(w['dailyDd'], False), usd(w['interest'], False),
                     f"{usd(w['grossDollarDays'] / w['calendarDays'], False)} ({w['grossDollarDays'] / w['calendarDays'] / 100000:.2f})", usd(w['peakGross'], False),
                     f"{w['sessionsLong']}/{w['sessions']}", f"{w['debitDollarDays']:,.0f}"] for i, w in enumerate(p['windows'])])
        o += f"\nCarried-balance interest {usd(p['carriedInterest'])}; flat interest {usd(p['flatInterest'])}; transitions: " + '; '.join(f"{t['date']} {t['kind']} {t['detail']}" for t in p['transitions']) + '\n'
        o += '\n## Campaigns (giveback = peak cumulative P&L − final)\n\n'
        o += table(['Campaign', 'From', 'To', 'Peak', 'Final', 'Giveback'], [[c['campaign'], c['from'], c['to'], usd(c['peak']), usd(c['final']), usd(c['giveback'])] for c in p['campaigns']])
        write(f'ledger-{name}.md', o)
    legs = payload('evaluate', 'legs')
    o = '## Up-legs (Stage 1 §13 zigzag) overlapping 2020–2023\n\n'
    for name, rows in legs['stats'].items():
        o += f'\n### {name}\n\n' + table(['From', 'To', 'Leg gain', 'Capture', 'Entry delay', 'Idle share', 'Net in leg'],
                                         [[r['from'], r['to'], pct(r['legGain']), pct(r['capture']), r['entryDelay'], pct(r['idleShare']), usd(r['net'])] for r in rows])
    write('legs.md', o)
    y = payload('evaluate', 'yearly')
    o = '## Fold picks: development-year increments from a flat start each year (descriptive)\n\n'
    o += table(['Fold', 'Year', 'Increment', 'Minute DD'], [[f, r['year'], usd(r['increment']), usd(r['minuteDd'], False)] for f, rows in y.items() for r in rows])
    sp = payload('evaluate', 'splice')
    o += f"\nStage 1b RoD picks, non-executable splice: increments {[round(x) for x in sp['increments']]}, Σ {usd(sum(sp['increments']))}, chained minute DD {usd(sp['chained']['minuteDrawdown'], False)}.\n"
    d = payload('evaluate', 'distributions')
    o += '\n## Distributions ledger (separate; never in a decision)\n\n' + table(['Run', 'Ex-dates', 'Amount on shares held'], [[k, v['exDates'], usd(v['amount'])] for k, v in d.items()])
    write('evaluate-extras.md', o)


def analysis_tables():
    s = record('analysis')['summary']
    o = f"**Label: {s['label']}** (primary {s['primary']}; Π-NET {s['netLabel']}); nomination: {s['nomination']}\n\n"
    o += table(['Path', 'Label', 'Failed'], [[k, v['label'], ', '.join(v['failed'])] for k, v in s['descriptive'].items()])
    for name, it in s['items'].items():
        o += f"\n### {name}\n\n"
        o += f"- (b) {'pass' if it['bPass'] else 'FAIL'}: W {[round(x) for x in it['b']['W']]}, Σ {usd(it['b']['sum'])}, positive {it['b']['positive']}, min {usd(it['b']['min'])}\n"
        o += f"- (c) {'pass' if it['cPass'] else 'FAIL'}: window minute DD {[round(x) for x in it['c']['windowDd']]}, chained {usd(it['c']['chainDd'], False)}\n"
        o += f"- (d) {'pass' if it['dPass'] else 'FAIL'}: {json.dumps(it['d'])}\n"
        e = it['e']
        o += f"- (e) {'pass' if it['ePass'] else 'FAIL'}: f_MV {[round(b['fMv'], 2) for b in e['benchmark']]}, B_F {[round(b['B']) for b in e['benchmark']]}, excess {[round(x) for x in e['excess']]} (Σ {usd(e['sumExcess'])}, windows ≥ $2k {e['excessWindows']}); control margins {{{', '.join(f'{k}: {usd(v)}' for k, v in e['controlMargins'].items())}}}\n"
        if it.get('f'):
            f = it['f']
            o += f"- (f) {'pass' if it['fPass'] else 'FAIL'}: perturbed share {pct(f['perturbedShareOk'])}, median {usd(f['perturbedMedian'])}; stresses {{{', '.join(f'{k}: {usd(v['end'])}/{usd(v['minuteDd'], False)}' for k, v in f['stresses'].items())}}}\n"
        else:
            o += '- (f) not computed (descriptive path)\n'
        g = it['g']
        o += f"- (g) {'pass' if it['gPass'] else 'FAIL'}: largest campaign {usd(g['largestCampaign'])} (Σ − it {usd(g['sumMinusCampaign'])}), largest up-leg {usd(g['largestLeg'])} (Σ − it {usd(g['sumMinusLeg'])}), giveback share {pct(g['givebackShare'])}\n"
    o += '\n## Stage 1 picks as executable paths: Stage 1\'s own T and E items\n\n'
    o += table(['Path', 'V', 'Σ', 'Chained DD', 'T items', 'T', 'Σ excess (E)', 'E'],
               [[n, [round(x) for x in v['V']], usd(v['sum']), usd(v['chainDd'], False), json.dumps(v['T']), v['tPass'], usd(v['E']['sumExcess']), v['ePass']] for n, v in s['stage1'].items()])
    write('verdict.md', o)


def robustness_tables():
    s = record('robustness')['summary']
    o = '## Stresses (no reselection): Π1 and P*_H (P*_H in-sample 2017–2023)\n\n'
    o += table(['Stress', 'Π1 W by window', 'Π1 Σ', 'Π1 chained DD', 'P*_H net', 'P*_H minute DD'],
               [[r['name'], [round(w['increment']) for w in r['pi1']['windows']], usd(r['pi1']['end']), usd(r['pi1']['minuteDd'], False),
                 usd(r['hPick']['net']) if r['hPick'] else '—', usd(r['hPick']['minuteDd'], False) if r['hPick'] else '—'] for r in s['stresses']])
    o += f"\nPerturbed Π1 paths: n {s['perturbed']['n']}, share Σ W > 0 and DD ≤ $35k {pct(s['perturbed']['shareOk'])}, Σ W {json.dumps({k: round(v) for k, v in s['perturbed']['sum'].items()})}, chained DD {json.dumps({k: round(v) for k, v in s['perturbed']['minuteDd'].items()})}.\n"
    o += f"Perturbed Π-NET paths: share ok {pct(s['perturbedNet']['shareOk'])}, median {usd(s['perturbedNet']['median'])}; Π-NET stresses {[(x['name'], round(x['end']), round(x['minuteDd'])) for x in s['netStresses']]}.\n"
    fold = payload('robustness', 'foldNeighbourhoods')
    def nb(label, n):
        if not n:
            return [label] + ['—'] * 9
        j, a = n['joint'], n['oat']
        return [label, n['policy'], usd(n['center']['net']), f"{usd(j['net']['p10'])} / {usd(j['net']['median'])} / {usd(j['net']['p90'])}",
                pct(j['shareNetPositive']), pct(j['shareDdOk']), pct(j['shareBoth']), f"{j['retention']:.2f}" if j['retention'] == j['retention'] else '—',
                f"{usd(a['net']['min'])} / {usd(a['net']['median'])} / {usd(a['net']['max'])} ({a['n']})", pct(j['pathIdenticalShare'])]
    hdr = ['Neighbourhood', 'Policy', 'Center', 'J128 P10 / median / P90', 'Net > 0', 'DD ≤ $35k', 'Both', 'Retention', 'OAT min / median / max (n)', 'Path-identical']
    rows = []
    for f in fold:
        rows.append(nb(f"fold {f['fold']} development", f['development']))
        rows.append(nb(f"fold {f['fold']} next window (post-selection)", f['postSelection']))
    for n in payload('robustness', 'netFoldNeighbourhoods'):
        if n:
            rows.append(nb(f"fold {n['fold']} P*-NET development", n))
    for n in payload('robustness', 'hNeighbourhoods'):
        rows.append(nb('H ' + n['policy'][:28], n))
    o += '\n## Neighbourhoods (J128 ±10%; OAT ±1, ±2 steps of 5%)\n\n' + table(hdr, rows)
    write('robustness.md', o)


def sizing_reentry():
    rows, rr = [], []
    for h in ['A', 'B', 'C', 'D', 'H']:
        sel = payload(f'develop-{h}', 'selection')
        for p in sel['pairings']:
            r = p['selectors'].get('rod')
            if not r:
                continue
            for v in r['reentry']:
                sc = v['scored']
                rr.append([h, p['id'], v['label'], usd(sc['summary']['net']), usd(sc['summary']['minuteDd'], False), sc['summary']['reentries'],
                           f"{sc['rod']:.3f}", pct(sc['phi']), 'yes' if v['eligible'] else '', '**chosen**' if v['label'] == r['reentryChoice'] else ''])
            base = r['final']['summary'] if r['sizingChoice'] == 'Z0' else None
            for v in r['sizing']:
                sc = v['scored']
                rows.append([h, p['id'], v['label'], usd(sc['summary']['net']), usd(sc['summary']['minuteDd'], False), usd(sc['summary']['avgGross'], False),
                             f"{v['pricePerDollarDay'] * 1e6:.1f}", f"{sc['rod']:.3f}", pct(sc['phi']), 'yes' if v['eligible'] else '', '**chosen**' if v['label'] == r['sizingChoice'] else ''])
    write('sizing-ld.md', table(['History', 'Pairing', 'Sizing', 'Dev net', 'Minute DD', 'Avg gross', 'Price gain per $1M notional-day', 'RoD', 'φ', 'Eligible', ''], rows))
    write('reentry-lc.md', table(['History', 'Pairing', 'Rule', 'Dev net', 'Minute DD', 'Re-entries', 'RoD', 'φ', 'Eligible', ''], rr))


for fn in [stage1_repair, evaluate_tables, analysis_tables, robustness_tables, sizing_reentry]:
    try:
        fn()
    except (FileNotFoundError, KeyError, TypeError) as e:
        print('skipped', fn.__name__, repr(e))

if __name__ == '__main__':
    main()


def diagnostics():
    """Descriptive diagnostics computed read-only from sealed payloads after the final audit (no new run)."""
    runs = payload('evaluate', 'runs')
    pi, calr = runs['Pi1-S1'], runs['C-ALR|flat']
    o = '## Π1: drawdown-matched and principal-day benchmarks (C-ALR flat-start; diagnostics, ex-post)\n\n'
    rows, s_dd, s_pd = [], 0, 0
    for i, (w, c) in enumerate(zip(pi['windows'], calr['windows'])):
        dd = c['increment'] * w['minuteDd']['maximum'] / c['minuteDd']['maximum']
        fl = w['loanDollarDays'] / (100000 * w['calendarDays'])
        pd = fl * c['increment']
        s_dd += dd
        s_pd += pd
        rows.append([YEARS[i], usd(w['increment']), usd(dd), usd(w['increment'] - dd), f'{fl:.3f}', usd(pd), usd(w['increment'] - pd)])
    rows.append(['Σ', usd(sum(w['increment'] for w in pi['windows'])), usd(s_dd), usd(sum(w['increment'] for w in pi['windows']) - s_dd), '', usd(s_pd), usd(sum(w['increment'] for w in pi['windows']) - s_pd)])
    o += table(['Window', 'Π1 W', 'DD-matched C-ALR', 'Π1 − it', 'f_L', 'Principal-day C-ALR', 'Π1 − it'], rows)
    sp = payload('evaluate', 'splice')
    o += '\n## Splice (continuous runs) minus executable path, per window (Stage 1b RoD picks)\n\n'
    o += table(['Window', 'Splice', 'Π1 (S1)', 'Splice − Π1'], [[YEARS[i], usd(x), usd(pi['windows'][i]['increment']), usd(x - pi['windows'][i]['increment'])] for i, x in enumerate(sp['increments'])])
    rp = payload('repair', 'paths')
    s1 = record('repair')['summary']['continuous']
    o += '\n## Stage 1 picks: splice minus executable S1, per window\n\n'
    o += table(['Window', 'Splice V', 'S1 slot', 'S1 net', 'Splice − S1 net'], [[YEARS[i], usd(c['stage1bV']), usd(rp['slot|S1']['windows'][i]['increment']), usd(rp['net|S1']['windows'][i]['increment']), usd(c['stage1bV'] - rp['net|S1']['windows'][i]['increment'])] for i, c in enumerate(s1)])
    from collections import Counter
    rules = Counter((t['kind'], t['rule']) for t in pi['trades'])
    o += '\n## Π1 entries by kind and rule\n\n' + table(['Kind', 'Rule', 'Trades'], [[k, r, n] for (k, r), n in sorted(rules.items())])
    traded = sum(t['principal'] + sum(x['proceeds'] for x in t['trims']) + (t['proceeds'] - sum(x['proceeds'] for x in t['trims'])) for t in pi['trades'])
    gdd = sum(w['grossDollarDays'] for w in pi['windows'])
    days = sum(w['calendarDays'] for w in pi['windows'])
    total = sum(w['increment'] for w in pi['windows'])
    o += f"\nΠ1 turnover: traded value {usd(traded, False)} over {days / 365:.2f} years on average gross {usd(gdd / days, False)} = {traded / (gdd / days) / (days / 365):.1f}× a year; net per $1M notional dollar-days {usd(total / gdd * 1e6)}; chained minute DD per $1M notional dollar-days {usd(pi['minuteDd']['maximum'] / gdd * 1e6, False)}.\n"
    write('diagnostics.md', o)


if __name__ == '__main__':
    diagnostics()
