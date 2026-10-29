#!/usr/bin/env python3
"""Regenerates research/study3-vgt-momentum-stage1c/results/tables/ from the sealed records and payloads (read-only).

Usage: python3 -I research/study3-vgt-momentum-stage1c/scripts/report_tables.py (from any directory: the script
changes to the repository root it lives in, because the records quote payload paths relative to that root).
Every number in the reports' tables comes from here; nothing is hand-edited. Payload hashes are verified first and a
missing record or payload stops the script (fail closed). The git-ignored develop archives are needed only for
diag-2022.md: when an archive is absent (a fresh clone) that table is left as committed and a notice is printed.
"""
import csv
import gzip
import hashlib
import json
import math
import os
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

ROOT = 'research/study3-vgt-momentum-stage1c'
# STAGE1C_REPORT_RESULTS points the script at another results tree (synthetic dry runs, audit copies); relative paths
# resolve against the repository root
RES = os.environ.get('STAGE1C_REPORT_RESULTS', f'{ROOT}/results')
OUT = f'{RES}/tables'
HISTORIES = ['A', 'B', 'C', 'D', 'H']
FOLDS = ['A', 'B', 'C', 'D']
MASKS = ['000', '100', '010', '001', '110', '101', '011', '111']
MASK_NAME = {'000': 'none', '100': 'A', '010': 'B', '001': 'C', '110': 'A+B', '101': 'A+C', '011': 'B+C', '111': 'A+B+C'}
B0 = 100000


def record(stage):
    path = f'{RES}/records/{stage}.json'
    if not os.path.exists(path):
        raise SystemExit(f'missing sealed record {path}')
    return json.load(open(path))


def payload(stage, name):
    rec = record(stage)
    if name not in rec['payloads']:
        raise SystemExit(f'record {stage} has no payload {name}')
    p = rec['payloads'][name]
    data = open(p['file'], 'rb').read()
    if hashlib.sha256(data).hexdigest() != p['sha256']:
        raise SystemExit(f'payload {stage}/{name} does not verify')
    text = gzip.decompress(data).decode()
    if p['file'].endswith('.jsonl.gz'):
        return [json.loads(line) for line in text.splitlines() if line]
    return json.loads(text)


def num(x):
    if x is None:
        return math.nan
    if isinstance(x, str):
        return {'Infinity': math.inf, '-Infinity': -math.inf}.get(x, math.nan)
    return float(x)


def usd(x, sign=True):
    x = num(x)
    if math.isnan(x):
        return '—'
    if math.isinf(x):
        return '∞' if x > 0 else '−∞'
    s = f'{abs(x):,.0f}'
    return (('+' if x >= 0 else '−') if sign else ('' if x >= 0 else '−')) + '$' + s


def pct(x, digits=1):
    x = num(x)
    return '—' if math.isnan(x) else f'{100 * x:.{digits}f}%'


def f2(x, digits=2):
    x = num(x)
    return '—' if math.isnan(x) else f'{x:.{digits}f}'


def cell_text(c):
    return str(c).replace('|', '\\|')


def table(header, rows):
    out = ['| ' + ' | '.join(header) + ' |', '|' + '|'.join('---' for _ in header) + '|']
    out += ['| ' + ' | '.join(cell_text(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out) + '\n'


def write(name, text):
    os.makedirs(OUT, exist_ok=True)
    with open(f'{OUT}/{name}', 'w') as f:
        f.write(text)


def utc_date(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).strftime('%Y-%m-%d')


def quantile(values, q):
    v = sorted(x for x in values if not math.isnan(x))
    if not v:
        return math.nan
    pos = (len(v) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return v[lo] + (v[hi] - v[lo]) * (pos - lo)


def mask_of(cell_key):
    return cell_key.split('|')[3]


# ----- development tables -----

def develop_tables():
    lines = ['# Development: coverage, deep allocation and picks (sealed develop records)\n']
    picks_rows = []
    coverage_rows = []
    mask_rows = []
    by_dim_rows = []
    for h in HISTORIES:
        rec = record(f'develop-{h}')
        s = rec['summary']
        cells = payload(f'develop-{h}', 'cells')
        sel = payload(f'develop-{h}', 'selection')
        n = len(cells)
        champs = [c for c in cells if c['rodChampion']]
        coverage_rows.append([h, s['developmentEnd'], f"{s['used']:,}", f"{s['planned']:,}", f"{s['duplicates']:,}",
                              f"{s['firstPassEvaluations']:,}", f"{s['deepEvaluations']:,}",
                              f"{s['fixedParentEvaluations']:,}", n, len(champs), len(s['deepPairs']),
                              s.get('nearMiss', 0), f"{s['runtime']['seconds'] / 60:.1f} min"])
        reasons = Counter(c['noChampion'] for c in cells if c['noChampion'])
        lines.append(f'**{h}** no-champion reasons: ' + ', '.join(f'{k} {v}' for k, v in reasons.most_common()) + '\n')
        # mask effects (first pass): champion rate, median champion RoD, twin statistics
        for m in MASKS:
            mc = [c for c in cells if mask_of(c['cell']) == m]
            ch = [c for c in mc if c['rodChampion']]
            twins = [c['twins'] for c in mc if c.get('twins')]
            acted = defaultdict(list)
            for c in mc:
                for r, v in (c['firstPass']['ruleActed'] or {}).items():
                    if v is not None:
                        acted[r].append(v)
            mask_rows.append([h, m, MASK_NAME[m], len(mc), len(ch), pct(len(ch) / len(mc)),
                              f2(statistics.median([num(c['rodChampion']['score']) for c in ch])) if ch else '—',
                              pct(statistics.median([num(t['inertShare']) for t in twins])) if twins else '—',
                              usd(statistics.median([num(t['deltaNet']['median']) for t in twins])) if twins else '—',
                              usd(statistics.median([num(t['deltaMinuteDd']['median']) for t in twins])) if twins else '—',
                              ' '.join(f'{r} {pct(statistics.median(v))}' for r, v in sorted(acted.items())) or '—'])
        dims = defaultdict(list)
        for c in cells:
            d = len(c['distinctPerDim'])
            dims[d].append(c)
        for d in sorted(dims):
            cs = dims[d]
            phis = [num(sc['phi']) for c in cs for sc in c['scored']]
            by_dim_rows.append([h, d, len(cs), pct(sum(1 for c in cs if c['rodChampion']) / len(cs)),
                                f2(quantile(phis, 0.5))])
        for name, p in sel['picks'].items():
            if p is None:
                picks_rows.append([h, name, '—', '—', '—', '—', '—', '—'])
                continue
            c = p['champion']
            picks_rows.append([h, name, p['cell'], p['policy'], f2(c['rod']) + ' / ' + usd(c['netScore']),
                               pct(c['phi'], 0), usd(c['summary']['net']) + ' / ' + usd(c['summary']['minuteDd'], False),
                               json.dumps(c['values'], separators=(',', ':'))])
        for m, f in sel['fixedParent'].items():
            g = f.get('gated')
            fo = f.get('forced')
            picks_rows.append([h, f'FP-{m} gated', g['cell'] if g else '(parent kept)', g['policy'] if g else '—',
                               f2(g['champion']['rod']) if g else '—', pct(g['champion']['phi'], 0) if g else '—',
                               f"forced: {fo['policy'] if fo else '—'}", f"ΔRoD {f2(f.get('deltaCenterRod'))}"])
    lines.append('\n## Budget and coverage\n')
    lines.append(table(['History', 'Dev end', 'Used', 'Cap', 'Duplicates', 'First pass', 'Deep', 'Fixed parent', 'Cells',
                        'Cells with champion', 'Deep pairs', 'Near misses', 'Runtime'], coverage_rows))
    lines.append('\n## Masks (first pass; twins = the same design index in the pair\'s 000 cell)\n')
    lines.append(table(['History', 'Mask', 'Rules', 'Cells', 'Champions', 'Rate', 'Median champion RoD',
                        'Median inert share', 'Median Δnet vs twin', 'Median ΔDD vs twin', 'Rule acted (median share)'],
                       mask_rows))
    lines.append('\n## Champion rate and J17/J33 φ by dimension count\n')
    lines.append(table(['History', 'Dimensions', 'Cells', 'Champion rate', 'Median φ of scored centers'], by_dim_rows))
    lines.append('\n## Picks (sealed before any evaluation window)\n')
    lines.append(table(['History', 'Selector', 'Cell', 'Policy', 'RoD / NET score', 'φ', 'Center net / DD', 'Vector'],
                       picks_rows))
    write('develop.md', ''.join(x if x.endswith('\n') else x + '\n' for x in lines))


def deep_tables():
    lines = ['# Deep allocation (training-only) and widening\n']
    for h in HISTORIES:
        sel = payload(f'develop-{h}', 'selection')
        deep = sel['deep']
        rows = [[c['pair'], c['list'], f2(c['score']), ', '.join(deep['widening'].get(c['pair'], [])) or '—']
                for c in deep['chosen']]
        lines.append(f'\n## {h}\n')
        lines.append(table(['Pair', 'List', 'Score', 'Widened edges'], rows))
        if deep['nearMiss']:
            lines.append('Near misses (no champion in any mask; best feasible net above the weakest deep pair): ' +
                         ', '.join(f"{x['pair']} ({usd(x['bestFeasibleNet'])})" for x in deep['nearMiss']) + '\n')
    write('deep.md', ''.join(x if x.endswith('\n') else x + '\n' for x in lines))


def cell_csv():
    for h in HISTORIES:
        cells = payload(f'develop-{h}', 'cells')
        with open(f'{OUT}/cells-{h}.csv', 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['cell', 'deep', 'evaluations', 'duplicates', 'feasibleCenters', 'netMedian', 'netP90', 'netMax',
                        'ddMedian', 'positiveShare', 'withinDdShare', 'actedA', 'actedB', 'actedC', 'inertShare',
                        'twinDeltaNetMedian', 'twinDeltaDdMedian', 'rodChampion', 'rodPhi', 'netChampion', 'noChampion'])
            for c in cells:
                fp = c['firstPass']
                t = c.get('twins') or {}
                ra = fp['ruleActed'] or {}
                w.writerow([c['cell'], c['deep'], c['evaluations'], c['duplicates'], c['feasibleCenters'],
                            round(num(fp['net']['median']), 2), round(num(fp['net']['p90']), 2),
                            round(num(fp['net']['max']), 2), round(num(fp['minuteDd']['median']), 2),
                            round(num(fp['positiveShare']), 4), round(num(fp['withinDdShare']), 4),
                            ra.get('A'), ra.get('B'), ra.get('C'), t.get('inertShare'),
                            t.get('deltaNet', {}).get('median'), t.get('deltaMinuteDd', {}).get('median'),
                            c['rodChampion']['score'] if c['rodChampion'] else '', c['rodChampion']['phi'] if c['rodChampion'] else '',
                            c['netChampion']['score'] if c['netChampion'] else '', c['noChampion'] or ''])


# ----- evaluation tables -----

PATH_ORDER = ['Pi1', 'Pi1-off', 'Pi1-S2', 'Pi1-S3', 'Pi1-reset', 'Pi1-open', 'Pi1-Z1', 'Pi1-cross', 'Pi-NET'] + \
    [f'Pi-{m}' for m in MASKS] + [f'Pi-FP-gated-{m}' for m in MASKS[1:]] + [f'Pi-FP-forced-{m}' for m in MASKS[1:]] + \
    ['static-A', 'Stage1b-Pi1', 'Stage1-S1']
CONTROLS = ['C-AL', 'C-ALR', 'C-ALZ1', 'C-SMA', 'C-DON', 'C-TSM', 'C-STOP', 'C-IDLE']


def path_row(name, p):
    w = [x['increment'] for x in p['windows']]
    s = p['summary']
    m = p['minuteDd']
    dd = m['maximum']
    dates = f"{utc_date(m['peakTime'])} → {utc_date(m['troughTime'])}" if dd > 0 else '—'
    return [name] + [usd(x) for x in w] + [usd(p['end']), f"{usd(dd, False)} ({pct(dd / B0)})", dates, usd(p['dailyDd'], False),
                                           s['trades'], s['ownExits'], pct(s['sessionsLong'] / max(1, s['sessions'])),
                                           usd(s['interest'], False), usd(max(x['peakGross'] for x in p['windows']), False)]


def evaluation_tables():
    rec = record('evaluate')
    paths = payload('evaluate', 'paths')
    paths['Pi1-off'] = paths.get('Pi1-sub-000')
    header = ['Path', '2020', '2021', '2022', '2023', 'Σ W', 'Chained minute DD', 'DD peak → trough (UTC)', 'Daily DD',
              'Trades', 'Own exits',
              'Long share', 'Trade interest', 'Peak gross']
    rows = [path_row(n, paths[n]) for n in PATH_ORDER if paths.get(n)]
    # the C-ALR and C-ALZ1 annual-reset rows are degenerate (amendments A2, A3) and omitted
    rows += [path_row(f'{n} ({k})', paths[f'{n}|{k}']) for n in CONTROLS for k in ['flat', 'reset']
             if (n, k) not in (('C-ALR', 'reset'), ('C-ALZ1', 'reset'))]
    sub = [path_row(f'Pi1-sub-{m} ({MASK_NAME[m]})', paths[f'Pi1-sub-{m}']) for m in MASKS]
    text = '# Executable paths (net-debit, flat at 2019-12-31, liquidation-marked window increments)\n\n'
    text += table(header, rows)
    text += '\n## Π1 knock-outs (each fold pick keeps only the rules in the sub-mask; no reselection)\n\n'
    text += table(header, sub)
    a = rec['summary']['anchors']
    text += '\n## Frozen prior paths re-simulated with every rule off (parity anchors)\n\n'
    text += f"- Stage 1b Π1: sealed Σ {usd(a['stage1bPi1']['sealed']['end'])} / DD {usd(a['stage1bPi1']['sealed']['minuteDd'], False)}; reproduced {usd(a['stage1bPi1']['reproduced']['end'])} / {usd(a['stage1bPi1']['reproduced']['minuteDd'], False)}; equal: {a['stage1bPi1']['equal']}\n"
    text += f"- Stage 1 repaired S1 (net-debit): sealed {usd(a['stage1Repaired']['sealed']['net'])} / DD {usd(a['stage1Repaired']['sealed']['minuteDd'], False)}; reproduced {usd(a['stage1Repaired']['reproduced']['net'])} / {usd(a['stage1Repaired']['reproduced']['minuteDd'], False)}; equal: {a['stage1Repaired']['equal']}\n"
    s = rec['summary']
    wrows = []
    for name in ['Pi1', 'Pi1-off']:
        for w in paths[name]['windows']:
            m = w['minuteDd']
            wrows.append([name, w['endDate'][:4], usd(m['maximum'], False), utc_date(m['peakTime']) if m['maximum'] > 0 else '—',
                          utc_date(m['troughTime']) if m['maximum'] > 0 else '—'])
    text += '\n## Window minute drawdowns (restart at each boundary mark)\n\n' + table(['Path', 'Window', 'Minute DD', 'Peak', 'Trough'], wrows)
    text += '\nDrawdown dates are the minute bars of the chained peak and trough (UTC dates). The C-ALR and C-ALZ1 annual-reset rows are omitted: both are degenerate (amendments A2, A3).\n'
    text += f"\nGuards: failures {s['guardFailures']}; b-marks {[b['equal'] for b in s['bmarks']]}; fast = reference on {s['reference']['runs']} paths, differences {s['reference']['differences']}.\n"
    write('paths.md', text)

    # ledgers of Π1 and Π1-off, rule events
    out = '# Trade ledgers (Π1, Π1-off)\n'
    for name in ['Pi1', 'Pi1-off']:
        p = paths[name]
        trows = [[t['id'], t['policy'], t['kind'], t['rule'], t['entryDate'], t['exitDate'] or 'open', t['exitReason'],
                  t['stopComponent'] or '', f2(t['entryRaw']), f2(t['entryPrice']), f2(t['shares'], 3),
                  f2(t['exitRaw']), f2(t['exitPrice']), usd(t['friction'], False), usd(t['net']), usd(t['interest'], False),
                  usd(t['peakProfit']), f2(t['cLevel']) if t.get('cLevel') not in (None, 'NaN') else '',
                  'yes' if t.get('releaseEntry') else ''] for t in p['trades']]
        out += f'\n## {name}\n\n' + table(['#', 'Policy', 'Kind', 'Rule', 'Entry', 'Exit', 'Reason', 'Stop', 'Entry raw',
                                           'Entry fill', 'Shares', 'Exit raw', 'Exit fill', 'Friction', 'Net', 'Interest',
                                           'Peak profit', 'C level', 'Release'], trows)
        out += f"\nCounters: {json.dumps(p['counters'])}; carried-balance interest {usd(p['carriedInterest'])}; flat interest {usd(p['flatInterest'])}.\n"
        if p['blocks']:
            out += '\nBlocked decisions: ' + ', '.join(f"{b['date']} {b['kind']}{' (minute)' if b['minute'] else ''}" for b in p['blocks'][:80]) + '\n'
        due = [a for a in p['aEvents'] if a['due']]
        if due:
            out += '\nRule A due: ' + ', '.join(f"{a['date']} (trade {a['trade']}, net at open {usd(a['netOpen'])})" for a in due) + '\n'
    write('ledgers.md', out)

    # Π1 vs Π1-off trade classification per window
    classes = classify(paths['Pi1'], paths['Pi1-off'])
    write('knockout-classes.md', '# Π1 trades against Π1-off (same picks, rules removed)\n\n' +
          table(['Window', 'Class', 'Trades', 'Net (Π1)', 'Net (Π1-off)'], classes))

    # nulls
    nulls = payload('evaluate', 'nulls')
    pi1 = paths['Pi1']
    nrows = []
    for kind, runs in nulls.items():
        ends = [r['end'] for r in runs]
        w22 = [r['windows'][2]['increment'] for r in runs]
        dds = [r['minuteDd'] for r in runs]
        nrows.append([kind, len(runs), usd(quantile(ends, 0.1)), usd(quantile(ends, 0.5)), usd(quantile(ends, 0.9)),
                      pct(sum(1 for x in ends if x <= pi1['end']) / len(ends), 0),
                      pct(sum(1 for x in w22 if x <= pi1['windows'][2]['increment']) / len(w22), 0),
                      pct(sum(1 for x in dds if x >= pi1['minuteDd']['maximum']) / len(dds), 0)])
    write('nulls.md', '# Selection-skill nulls (random deep / any champion per fold, S1 paths)\n\n' +
          table(['Null', 'Paths', 'P10 Σ W', 'Median Σ W', 'P90 Σ W', 'Π1 Σ W percentile', 'Π1 2022 percentile',
                 'Share with DD ≥ Π1'], nrows))

    # 2022 counterfactuals on Stage 1b's Π1 (hindsight diagnostic)
    cf = payload('evaluate', 'counterfactuals')
    base = paths['Stage1b-Pi1']
    target = {'2022-04-05': '#11', '2022-07-27': '#12', '2022-11-11': '#13'}
    crow = []
    for name, p in cf.items():
        w = [x['increment'] for x in p['windows']]
        fate = []
        for d, label in target.items():
            bt = next(t for t in base['trades'] if t['entryDate'] == d)
            same = next((t for t in p['trades'] if t['entryDate'] == d), None)
            if same is None:
                later = [t for t in p['trades'] if t['entryDate'] > d and t['entryDate'] < '2023-01-01']
                fate.append(f"{label} blocked" + (f" (next entry {later[0]['entryDate']})" if later else ''))
            elif (same['exitDate'] or '9') < (bt['exitDate'] or '9'):
                fate.append(f"{label} exited sooner {same['exitDate']} ({same['exitReason']}, {usd(same['net'])})")
            else:
                fate.append(f"{label} unchanged")
        new = [t['entryDate'] for t in p['trades'] if '2022-01-01' <= t['entryDate'] <= '2022-12-30'
               and t['entryDate'] not in target and not any(b['entryDate'] == t['entryDate'] for b in base['trades'])]
        crow.append([name] + [usd(x) for x in w] + [usd(p['end']), usd(p['minuteDd']['maximum'], False), '; '.join(fate),
                                                   ', '.join(new) or '—'])
    bw = [x['increment'] for x in base['windows']]
    crow.insert(0, ['Stage 1b Π1 (rules off)'] + [usd(x) for x in bw] + [usd(base['end']), usd(base['minuteDd']['maximum'], False), '—', '—'])
    write('counterfactuals-2022.md', '# Rules added to Stage 1b\'s Π1 picks at reference values — hindsight diagnostic (target-year-informed)\n\n' +
          table(['Variant', '2020', '2021', '2022', '2023', 'Σ W', 'DD', 'The three 2022 losing entries', 'New 2022 entries'], crow))


def classify(p, off):
    out = []
    for w_index, w in enumerate(p['windows']):
        lo, hi = w['boundary'], w['end']
        mine = [t for t in p['trades'] if lo < t['entryIndex'] <= hi]
        theirs = [t for t in off['trades'] if lo < t['entryIndex'] <= hi]
        key = lambda t: (t['entryIndex'], t['entryBar'])
        tk = {key(t): t for t in theirs}
        mk = {key(t): t for t in mine}
        groups = defaultdict(lambda: [0, 0.0, 0.0])
        for k, t in mk.items():
            o = tk.get(k)
            if o is None:
                c = 'Π1 only (new or delayed entry)'
            elif (t['exitIndex'], t['exitBar']) == (o['exitIndex'], o['exitBar']):
                c = 'same entry, same exit'
            elif t['exitIndex'] >= 0 and (o['exitIndex'] < 0 or (t['exitIndex'], t['exitBar']) < (o['exitIndex'], o['exitBar'])):
                c = 'same entry, earlier exit'
            else:
                c = 'same entry, later exit'
            g = groups[c]
            g[0] += 1
            g[1] += t['net']
            g[2] += o['net'] if o else 0
        for k, o in tk.items():
            if k not in mk:
                g = groups['Π1-off only (blocked)']
                g[0] += 1
                g[2] += o['net']
        for c, (n, a, b) in sorted(groups.items()):
            out.append([['2020', '2021', '2022', '2023'][w_index], c, n, usd(a), usd(b)])
    return out


def robustness_tables():
    dev = payload('robustness', 'development')
    nxt = payload('robustness', 'nextWindow')
    rows = []
    for label, data in [('development', dev), ('next window (post-selection)', nxt)]:
        for k, v in data.items():
            nets = [r['net'] for r in v['rows']]
            dds = [r['minuteDd'] for r in v['rows']]
            both = sum(1 for r in v['rows'] if r['net'] > 0 and r['minuteDd'] <= 35000)
            paths_ = len(set(r['path'] for r in v['rows']))
            rows.append([k, label, usd(min(nets)), usd(quantile(nets, 0.1)), usd(quantile(nets, 0.25)), usd(quantile(nets, 0.5)),
                         usd(quantile(nets, 0.75)), usd(quantile(nets, 0.9)), usd(max(nets)),
                         pct(sum(1 for x in nets if x > 0) / len(nets), 0), pct(sum(1 for x in dds if x <= 35000) / len(dds), 0),
                         pct(both / len(nets), 0), paths_])
    text = '# Neighbourhoods (J128: 128 joint draws ±10%; development and next window)\n\n' + table(
        ['Pick', 'Data', 'Min', 'P10', 'P25', 'Median', 'P75', 'P90', 'Max', 'Net > 0', 'DD ≤ $35k', 'Both', 'Distinct paths'], rows)
    oat_rows = []
    for k, v in dev.items():
        for o in v['oat']:
            oat_rows.append([k, o['dim'], o['step'], usd(o['net']), usd(o['minuteDd'], False),
                             'same path' if o['path'] == v['center'].get('pathHash') else ''])
    text += '\n## One-at-a-time (development)\n\n' + table(['Pick', 'Dimension', 'Step', 'Net', 'Minute DD', ''], oat_rows)
    write('neighbourhoods.md', text)

    # rule × stop grids (development; net / minute DD per grid point)
    gtext = '# Rule × stop grids around each pick (development data; net / minute DD)\n'
    for k, v in dev.items():
        groups = defaultdict(list)
        for g in v.get('grid') or []:
            groups[(g['rule'], g['stop'])].append(g)
        for (rule, stop), gs in groups.items():
            rvals = sorted(set(g['ruleValue'] for g in gs))
            svals = sorted(set(g['stopValue'] for g in gs))
            at = {(g['ruleValue'], g['stopValue']): g for g in gs}
            grows = [[f2(r, 4)] + [f"{usd(at[(r, x)]['net'])} / {usd(at[(r, x)]['minuteDd'], False)}" if (r, x) in at else '·'
                                   for x in svals] for r in rvals]
            gtext += f'\n## {k}: {rule} (rows) × {stop} (columns)\n\n' + table([f'{rule} \\ {stop}'] + [f2(x, 4) for x in svals], grows)
        if not groups:
            gtext += f'\n## {k}: no rule × stop grid (no rule or no stop dimension in the pick)\n'
    write('rule-stop-grids.md', gtext)

    pert = payload('robustness', 'perturbed')
    prow = []
    for k, runs in pert.items():
        ends = [r['end'] for r in runs]
        ok = sum(1 for r in runs if r['end'] > 0 and r['minuteDd'] <= 35000)
        prow.append([k, len(runs), usd(quantile(ends, 0.1)), usd(quantile(ends, 0.5)), usd(quantile(ends, 0.9)),
                     pct(ok / len(runs), 0), usd(quantile([r['windows'][2]['increment'] for r in runs], 0.5))])
    if 'Pi1' in pert and 'Pi1-off' in pert:
        paired = sum(1 for a, b in zip(pert['Pi1'], pert['Pi1-off']) if a['end'] > b['end'])
        prow.append(['Π1 > Π1-off (paired)', len(pert['Pi1']), '', '', '', pct(paired / len(pert['Pi1']), 0), ''])
    st = payload('robustness', 'stresses')
    srows = []
    for name, row in st.items():
        srows.append([name] + [f"{usd(row[k]['end'])} / {usd(row[k]['minuteDd'], False)}" if k in row else '—'
                               for k in ['Pi1', 'Pi-NET', 'Pi-000', 'H']])
    text = '# Perturbed executable paths (draw j of every fold pick)\n\n' + table(
        ['Paths', 'Count', 'P10 Σ W', 'Median Σ W', 'P90 Σ W', 'Σ W > 0 and DD ≤ $35k', 'Median 2022'], prow)
    text += '\n# Stresses (Σ W / chained minute DD; H: continuous 2017–2023, in-sample)\n\n' + table(
        ['Stress', 'Π1', 'Π-NET', 'Π-000', 'P*_H'], srows)
    write('robustness.md', text)

    legs = payload('robustness', 'legCaptures')
    lrows = []
    for name, rows_ in legs.items():
        for r in rows_:
            lrows.append([name, r['from'], r['to'], pct(r['legGain']), pct(r['capture']), r['entryDelay'] if r['entryDelay'] is not None else '—',
                          pct(r['idleShare']), usd(r['net'])])
    write('legs.md', '# Up-legs (zigzag 10%, legs ≥ 15%) and capture\n\n' + table(
        ['Path', 'From', 'To', 'Leg gain', 'Capture', 'Entry delay (sessions)', 'Idle share', 'Mark change'], lrows))


def verdict_tables():
    s = record('analysis')['summary']
    text = f"# Verdict (frozen rubric, `results/records/analysis.json`)\n\n**Label: {s['label']}**; nomination: {s['nomination']}; configurations evaluated: {s['evaluations']:,}.\n\n"
    text += f"Failed items: {s['verdict']['failed']}; Π-NET label: {s['netLabel']['label']}; validity (a): {s['aPass']}.\n\n"
    text += f"Selection null: Π1 Σ W {usd(s['selection']['pi1Sum'])} vs deep-null median {usd(s['selection']['nullMedian'])} (percentile {pct(s['selection']['nullPercentile'], 0)}); selection-indistinguishable: {s['selection']['selectionIndistinguishable']}.\n\n"
    pr = s['protection']
    text += f"Protection (primary, Π1 vs Π1-off): ΔΣ W {usd(pr['primary']['deltaSum'])}, ΔDD {usd(pr['primary']['deltaDd'])}, paired perturbed share {pct(pr['primary']['pairedShare'], 0)} → holds: {pr['primary']['holds']}.\n\n"
    text += f"Procedure (Π1 vs Π-000): ΔΣ W {usd(pr['procedure']['deltaSum'])}, ΔDD {usd(pr['procedure']['deltaDd'])} → holds: {pr['procedure']['holds']}. Fixed parent (gated): {pr['fixedParent']['holds']} of {pr['fixedParent']['of']} masks. 2022 with trend retention: {pr['y2022']['holds']}.\n\n"
    it = s['items']['Pi1']
    text += '## Π1 items\n\n'
    text += table(['Item', 'Pass', 'Values'], [
        ['(e) evidence', it['ePass'], json.dumps(it['evidence'])],
        ['(c) risk', it['cPass'], f"window DD {[usd(x, False) for x in it['risk']['windowDd']]}; chained {usd(it['risk']['chainDd'], False)}"],
        ['(b) profit', it['bPass'], f"W {[usd(x) for x in it['profit']['W']]}; Σ {usd(it['profit']['sum'])}; positive {it['profit']['positive']}; min {usd(it['profit']['min'])}"],
        ['(d) protection vs Π1-off', it['dPass'], json.dumps(it['d'])],
        ['(g) exposure-matched, controls', it['gPass'], f"Σ excess {usd(it['g']['sumExcess'])}; excess windows {it['g']['excessWindows']}; margins " + ', '.join(f"{k} {usd(v)}" for k, v in it['g']['controlMargins'].items())],
        ['(f) perturbed paths', it['fPass'], json.dumps(it['f'])],
        ['(h) stresses', it['hPass'], json.dumps(it['h'])],
        ['(e2) winner / giveback', it['e2Pass'], json.dumps(it['e2'])],
    ])
    text += '\nNear misses (within 10%): ' + ('; '.join(s['nearMisses']) or 'none') + '\n'
    for name in ['Pi1-S2', 'Pi1-reset', 'Pi-NET']:
        o = s['items'][name]
        text += f"\n{name}: b {o['bPass']}, c {o['cPass']}, g {o['gPass']}, e {o['ePass']}, e2 {o['e2Pass']}, f {o['fPass']}, h {o['hPass']}; Σ {usd(o['profit']['sum'])}; chained DD {usd(o['risk']['chainDd'], False)}\n"
    desc = payload('analysis', 'descriptive')
    rows = [[k, v['label']['label'], ', '.join(v['label']['failed']), usd(v['items']['profit']['sum']), usd(v['items']['risk']['chainDd'], False),
             '; '.join(v['nearMisses']) or '—'] for k, v in desc.items()]
    text += '\n## Descriptive labels of the other paths (items computable without perturbed paths and stresses)\n\n' + table(
        ['Path', 'Label', 'Failed', 'Σ W', 'Chained DD', 'Near misses'], rows)
    write('verdict.md', text)


def matrix_tables():
    exits_order = ['XF', 'XF-T', 'XV', 'XS', 'XT', 'XRP', 'XRD', 'XD', 'XP', 'XO', 'XE', 'XU', 'XN']
    entries = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'E11', 'E12']
    text = '# Entry × exit-contract grids (first-pass RoD champion score; J17 for non-deep cells, J33 for deep cells)\n'
    fam = '# Families and contracts (first pass)\n'
    deep_text = '# Matched-budget mask comparison inside deep pairs (deep RoD champion score per mask; J33)\n'
    for h in HISTORIES:
        cells = payload(f'develop-{h}', 'cells')
        by = {c['cell']: c for c in cells}
        cols = [(x, c) for x in exits_order for c in (['ret'] if x == 'XO' else ['rep', 'or'])]
        for label, chooser in [('mask 000', lambda e, x, c: [k for k in [by.get(f'{e}|{x}|{c}|000')] if k]),
                               ('best over the 8 masks', lambda e, x, c: [k for k in (by.get(f'{e}|{x}|{c}|{m}') for m in MASKS) if k])]:
            rows = []
            for e in entries:
                row = [e]
                for x, c in cols:
                    sc = [num(k['rodChampion']['score']) for k in chooser(e, x, c) if k['rodChampion']]
                    row.append(f2(max(sc), 1) if sc else '·')
                rows.append(row)
            text += f'\n## {h} — {label}\n\n' + table(['Entry'] + [f'{x}.{c}' for x, c in cols], rows)
        frows = []
        for key, values in [('entry ' + e, [c for c in cells if c['cell'].split('|')[0] == e]) for e in entries] + \
                [('exit ' + x, [c for c in cells if c['cell'].split('|')[1] == x]) for x in exits_order] + \
                [('contract ' + k, [c for c in cells if c['cell'].split('|')[2] == k]) for k in ['rep', 'or', 'ret']]:
            ch = [c for c in values if c['rodChampion']]
            frows.append([key, len(values), pct(len(ch) / max(1, len(values))),
                          f2(quantile([num(c['rodChampion']['score']) for c in ch], 0.5)) if ch else '—',
                          usd(quantile([num(c['firstPass']['net']['median']) for c in values], 0.5)),
                          usd(quantile([num(c['firstPass']['net']['max']) for c in values], 0.5))])
        fam += f'\n## {h}\n\n' + table(['Group', 'Cells', 'Champion rate', 'Median champion RoD', 'Median of cell median net',
                                         'Median of cell max net'], frows)
        # rep vs or within family and entry, mask 000
        diffs = defaultdict(list)
        for e in entries:
            for x in exits_order:
                if x == 'XO':
                    continue
                a, b = by.get(f'{e}|{x}|rep|000'), by.get(f'{e}|{x}|or|000')
                if not a or not b:
                    continue
                diffs[x].append(num(b['firstPass']['net']['median']) - num(a['firstPass']['net']['median']))
        fam += '\nOwn-OUT contract, mask 000: median over entries of (or − rep) cell-median net: ' + ', '.join(
            f'{x} {usd(statistics.median(v))}' for x, v in diffs.items()) + '\n'
        sel = payload(f'develop-{h}', 'selection')
        drows = []
        for ch in sel['deep']['chosen']:
            row = [ch['pair'], ch['list']]
            for m in MASKS:
                c = by[f"{ch['pair']}|{m}"]
                row.append(f2(c['rodChampion']['score']) if c['rodChampion'] else '·')
            drows.append(row)
        deep_text += f'\n## {h}\n\n' + table(['Pair', 'List'] + [f'{m} {MASK_NAME[m]}' for m in MASKS], drows)
    write('matrix-grids.md', text)
    write('families.md', fam)
    write('deep-masks.md', deep_text)


def trade_stats_tables():
    paths = payload('evaluate', 'paths')
    paths['Pi1-off'] = paths.get('Pi1-sub-000')
    picks = payload('evaluate', 'picks')
    rows = []
    for name in ['Pi1', 'Pi1-off', 'Pi-NET', 'Pi-000', 'Stage1b-Pi1', 'C-SMA|flat', 'C-ALR|flat']:
        p = paths.get(name)
        if not p:
            continue
        closed = [t for t in p['trades'] if t['exitIndex'] >= 0]
        streak = best = 0
        for t in closed:
            streak = streak + 1 if t['net'] < 0 else 0
            best = max(best, streak)
        mae = [t['shares'] * (t['maeLow'] - t['entryRaw']) for t in p['trades']]
        maep = [t['maeLow'] / t['entryRaw'] - 1 for t in p['trades']]
        unreal = [num(t['peakProfit']) - t['net'] for t in p['trades'] if not math.isinf(num(t['peakProfit']))]
        release = [t for t in p['trades'] if t.get('releaseEntry')]
        losing_tr = [t for t in p['trades'] if t['exitReason'] == 'transition' and t['net'] < 0]
        gb = p.get('givebacks') or []
        rows.append([name, len(p['trades']), sum(1 for t in closed if t['net'] < 0), best,
                     usd(min(mae) if mae else math.nan), pct(min(maep) if maep else math.nan),
                     f2(statistics.median([t['calendarDays'] for t in p['trades']]) if p['trades'] else math.nan, 0),
                     pct(p['summary']['sessionsLong'] / max(1, p['summary']['sessions'])),
                     usd(max(t['peakGross'] for t in p['trades']) if p['trades'] else 0, False),
                     usd(max(unreal) if unreal else math.nan, False),
                     usd(max((g['giveback'] for g in gb), default=0), False),
                     f"{len(release)} / {usd(sum(t['net'] for t in release))}",
                     f"{len(losing_tr)} / {usd(sum(t['net'] for t in losing_tr))}"])
    text = '# Trade statistics (brief §8)\n\n' + table(
        ['Path', 'Trades', 'Losing', 'Longest losing streak', 'Worst MAE ($)', 'Worst MAE (%)', 'Median days held',
         'Time long', 'Peak gross', 'Largest unrealised giveback (trade)', 'Largest campaign giveback',
         'Release entries (n / net)', 'Losing transition exits (n / net)'], rows)
    # boundaries whose consecutive picks differ only in rule parameters (transitioned in Π1, not in Π1-off)
    rod = picks['rod']
    def base_key(k):
        if not k:
            return None
        return json.dumps({x: k[x] for x in ['entry', 'entryParams', 'exit', 'contract', 'exitParams']}, sort_keys=True)
    rule_only = []
    for i in range(1, len(rod)):
        a, b = rod[i - 1], rod[i]
        if a and b and base_key(a) == base_key(b) and json.dumps(a.get('protect'), sort_keys=True) != json.dumps(b.get('protect'), sort_keys=True):
            rule_only.append(FOLDS[i])
    p = paths['Pi1']
    if rule_only:
        text += '\nBoundaries whose consecutive Π1 picks differ only in rule parameters (Π1 transitions there, Π1-off does not): ' + ', '.join(rule_only) + '.\n'
        for fold in rule_only:
            w = FOLDS.index(fold)
            b_index = p['windows'][w]['boundary']
            tr = [t for t in p['trades'] if t['exitReason'] == 'transition' and t['exitIndex'] == b_index + 1]
            nx = [t for t in p['trades'] if t['entryIndex'] > b_index]
            if tr and nx:
                t0, t1 = tr[0], nx[0]
                cost = t0['shares'] * (t1['entryRaw'] - t0['exitRaw'])
                text += f"- {fold}: sold {t0['exitDate']} at {f2(t0['exitRaw'])}, re-bought {t1['entryDate']} at {f2(t1['entryRaw'])}: price difference × shares {usd(cost)} plus two-sided friction ≈ {usd(2 * 0.0005 * t0['shares'] * t0['exitRaw'], False)}.\n"
    else:
        text += '\nNo boundary of Π1 has consecutive picks that differ only in rule parameters.\n'
    write('trade-stats.md', text)


def diag_2022():
    """PROTOCOL §9.2(c): 2022 window increments inside develop-D / develop-H (2022 is development data there) —
    a forbidden-for-selection diagnostic. Yearly increments are continuous-run windows (index 5 = 2022)."""
    text = '# 2022 inside the development data of D and H — forbidden-for-selection diagnostic\n\n'
    text += 'Continuous runs from 2017-01-03; the 2022 increment of each point (not a flat start). Never used to select.\n'
    for h in ['D', 'H']:
        rec = record(f'develop-{h}')
        if rec is None:
            continue
        cells = payload(f'develop-{h}', 'cells')
        sessions = None
        champ = defaultdict(list)
        for c in cells:
            for sc in c['scored']:
                sessions = sessions or sc['center']['sessions']
            if c['rodChampion']:
                sc = next(x for x in c['scored'] if x['index'] == c['rodChampion']['index'])
                y = sc['center']['yearly']
                if len(y) > 5:
                    champ[mask_of(c['cell'])].append(num(y[5]))
        feas = defaultdict(list)
        arch = rec['payloads']['archive']
        if not os.path.exists(arch['file']):
            print(f"notice: {arch['file']} is absent (git-ignored; regenerated only by rerunning develop-{h}); "
                  'diag-2022.md left as committed', file=sys.stderr)
            return
        digest = hashlib.sha256()
        with open(arch['file'], 'rb') as f:
            for chunk in iter(lambda: f.read(1 << 20), b''):
                digest.update(chunk)
        if digest.hexdigest() != arch['sha256']:
            raise SystemExit(f'archive develop-{h} does not verify')
        if True:
            with gzip.open(arch['file'], 'rt') as f:
                for line in f:
                    r = json.loads(line)
                    if r[3] != 5 or not isinstance(r[0], str) or '|FP|' in r[0]:
                        continue
                    net, dd, closed, campaigns, years, slong, yearly = r[5], r[6], r[9], r[12], r[14], r[15], r[32]
                    if dd <= 35000 and closed >= 6 and campaigns >= 3 and years >= 3 and net > 0 and slong >= 0.2 * (sessions or 1) and len(yearly) > 5:
                        feas[mask_of(r[0])].append(yearly[5])
        rows = []
        for m in MASKS:
            fv, cv = feas.get(m, []), champ.get(m, [])
            rows.append([m, MASK_NAME[m], len(fv), usd(quantile(fv, 0.5)), usd(quantile(fv, 0.9)), usd(max(fv) if fv else math.nan),
                         len(cv), usd(quantile(cv, 0.5)), usd(quantile(cv, 0.9)), usd(max(cv) if cv else math.nan)])
        text += f'\n## develop-{h}\n\n' + table(['Mask', 'Rules', 'Feasible points', 'P50 2022', 'P90 2022', 'Max 2022',
                                                'Cell champions', 'P50 2022', 'P90 2022', 'Max 2022'], rows)
    write('diag-2022.md', text)


def pareto_h():
    """PROTOCOL §10: deep-cell RoD champions of history H non-dominated on (J33 median net ↑, J33 median minute DD ↓,
    φ ↑). Descriptive and in-sample; separate from the binding picks, never nominated."""
    cells = payload('develop-H', 'cells')
    sel = payload('develop-H', 'selection')
    binding = {name: p['cell'] for name, p in sel['picks'].items() if p}
    pts = []
    for c in cells:
        if not c['deep'] or not c['rodChampion']:
            continue
        sc = next(x for x in c['scored'] if x['index'] == c['rodChampion']['index'])
        nb = sc['neighbourhood']
        pts.append({'cell': c['cell'], 'policy': sc['policy'], 'net': statistics.median(n['net'] for n in nb),
                    'dd': statistics.median(n['minuteDd'] for n in nb), 'phi': num(sc['phi']), 'rod': num(sc['rod']),
                    'centerNet': sc['center']['net'], 'centerDd': sc['center']['minuteDd'], 'draws': len(nb)})
    def dominated(a):
        return any(b['net'] >= a['net'] and b['dd'] <= a['dd'] and b['phi'] >= a['phi'] and
                   (b['net'] > a['net'] or b['dd'] < a['dd'] or b['phi'] > a['phi']) for b in pts)
    front = sorted((a for a in pts if not dominated(a)), key=lambda a: -a['net'])
    rows = [[a['cell'], a['policy'], usd(a['net']), usd(a['dd'], False), f2(a['phi']), f2(a['rod']),
             usd(a['centerNet']) + ' / ' + usd(a['centerDd'], False),
             ', '.join(n for n, c in binding.items() if c == a['cell']) or '—'] for a in front]
    text = ('# H Pareto set (descriptive, in-sample 2017–2023; never nominated)\n\n'
            f'Deep-cell RoD champions of develop-H: {len(pts)}; non-dominated on (J33 median net ↑, J33 median minute DD ↓, φ ↑): '
            f'{len(front)}. J33 = the center and its 32 joint ±10% draws. "Selector" marks cells that are also an H pick.\n\n')
    text += table(['Cell', 'Policy', 'J33 median net', 'J33 median minute DD', 'φ', 'RoD', 'Center net / DD', 'Selector'], rows)
    write('pareto-H.md', text)


def main():
    os.makedirs(OUT, exist_ok=True)
    develop_tables()
    deep_tables()
    cell_csv()
    matrix_tables()
    evaluation_tables()
    trade_stats_tables()
    robustness_tables()
    verdict_tables()
    pareto_h()
    diag_2022()


if __name__ == '__main__':
    main()
