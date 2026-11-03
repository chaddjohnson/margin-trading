#!/usr/bin/env python3
"""Study 4 report tables, generated from the sealed records only (read-only; run from the repository root):

    python3 -I research/study4-two-tier-d1-allocator/scripts/report.py

Writes results/tables/*.csv (machine-readable) and results/tables/*.md (the tables quoted by the reports). Every number
in the reports' tables comes from here; nothing is typed by hand.
"""
import csv
import hashlib
import json
import os
import statistics

ROOT = 'research/study4-two-tier-d1-allocator'
RES = os.path.join(ROOT, 'results')
TAB = os.path.join(RES, 'tables')
FOLDS = ['F20', 'F21', 'F22', 'F23']
WINDOWS = FOLDS + ['H']
STAGES = ['4B', '4C', '4D-A', '4D-A0P', '4D-B', '4D-B0', '4D-C', '4D-C0']
EXPERIMENTS = ['4D-A', '4D-A0P', '4D-B', '4D-B0', '4D-C', '4D-C0']
EVAL_YEAR = {'F20': '2020', 'F21': '2021', 'F22': '2022', 'F23': '2023'}

os.makedirs(TAB, exist_ok=True)


def load(*parts):
    path = os.path.join(RES, *parts)
    return json.load(open(path)) if os.path.exists(path) else None


def money(x):
    return '—' if x is None or (isinstance(x, float) and x != x) else f"{'-' if x < 0 else ''}${abs(x):,.0f}"


def dd(x):
    """A drawdown in dollars and in % of the $100,000 slot (PROTOCOL §9.2)."""
    return '—' if x is None else f"{money(x)} ({100 * x / 100000:.1f}%)"


def pct(x, digits=1):
    return '—' if x is None else f'{100 * x:.{digits}f}%'


def write_csv(name, rows):
    if not rows:
        return
    keys = list(rows[0].keys())
    with open(os.path.join(TAB, name), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in keys})


def md_table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join('---' if i == 0 else '---:' for i in range(len(headers))) + '|']
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out) + '\n'


def describe(d):
    if not d:
        return 'B5 unchanged (no-fill)'
    deep = [b for b in d['deep'] if b['origin'] != 'B5']
    deep_txt = ('deep ' + ', '.join(f"{b['symbol']}[{b['gridKey']}]" for b in deep) + '; ') if deep else ''
    b5_kept = [b['symbol'] for b in d['deep'] if b['origin'] == 'B5']
    shallow = ', '.join(f"{b['symbol']}[{b['gridKey']}]" for b in d['shallow']) or 'none'
    p = d['policy']
    pol = p['kind'] + (f"({p['budget']},{p['filter']})" if p['kind'] == 'P3' else f"({p['deadline']})" if p['kind'] == 'P4' else '')
    gate = p['gate'] + (f"({p['lambda']})" if p['gate'] == 'G2' else '')
    return f"{deep_txt}B5 kept: {'/'.join(b5_kept) or 'none'}; shallow: {shallow}; {pol}, {gate}"


md = {}

# ----- SPEC and 4A -----
spec_rows, lib_rows, sym_rows = [], [], []
for w in WINDOWS:
    spec = load(w, 'SPEC', 'RECORD.json')
    a = load(w, '4A', 'RECORD.json')
    if not spec or not a:
        continue
    b5 = spec['b5Development']
    spec_rows.append({
        'window': w, 'end': spec['door']['end'], 'sessions': spec['door']['sessions'], 'rho': spec['spec']['rho'],
        'b5_net': b5['net'], 'b5_minute_dd': b5['minuteDrawdown']['maximum'], 'b5_daily_dd': b5['dailyDrawdown']['maximum'],
        'b5_lots': b5['lots'], 'b5_refused': b5['refused'], 'b5_interest': b5['interest'],
        'symbols_with_band': sum(1 for s in a['symbols'] if not s['band']['empty']), 'evaluated_4A': a['evaluated'],
        'library': len(a['library']), 'library_symbols': len({m['symbol'] for m in a['library']})})
    for s in a['symbols']:
        tops = s['top']
        sym_rows.append({
            'window': w, 'symbol': s['symbol'], 'sigma': round(s['sigma'], 4), 'band_lo_pct': s['band']['lo'] / 10,
            'band_hi_pct': s['band']['hi'] / 10, 'band_empty': s['band']['empty'], 'evaluated': s['evaluated'],
            'role_feasible': s['roleFeasible'], 'library': len(s['library']),
            'best_net': max((t['net'] for t in tops), default=None),
            'best_idle_clean_net': max((t['idleCleanNet'] for t in tops), default=None),
            'reason': s['noLibraryReason']})
    for m in a['library']:
        lib_rows.append({'window': w, 'symbol': m['symbol'], 'slot': m['slot'], 'x_pct': m['grid']['targetPercentChange'] / 10,
                         'grid': '.'.join(str(m['grid'][k]) for k in ['targetPercentChange', 'trailingBuyPercentage', 'trailingStopPercentage', 'maximumHoldDays', 'tickWindowSize', 'intradayLossBuffer', 'pullback', 'continuationWindow']),
                         'standalone_net': m['net'], 'idle_clean_net': m['idleCleanNet']})
write_csv('spec_and_4A_summary.csv', spec_rows)
write_csv('4A_symbols.csv', sym_rows)
write_csv('4A_library.csv', lib_rows)
md['spec'] = md_table(
    ['Window', 'Dev. end', 'Sessions', 'B5 dev. net', 'B5 minute DD', 'B5 daily DD', 'B5 lots', 'ρ', 'Symbols with a shallow band', '4A vectors', 'Library (symbols)'],
    [[r['window'], r['end'], r['sessions'], money(r['b5_net']), dd(r['b5_minute_dd']), dd(r['b5_daily_dd']), r['b5_lots'], f"{r['rho']:.3f}", r['symbols_with_band'], f"{r['evaluated_4A']:,}", f"{r['library']} ({r['library_symbols']})"] for r in spec_rows])
top_lib = {}
for w in WINDOWS:
    rows = sorted([r for r in lib_rows if r['window'] == w], key=lambda r: -r['idle_clean_net'])[:8]
    top_lib[w] = md_table(['Symbol', 'Slot', 'X', 'Vector', 'Standalone dev. net', 'B5-idle-clean dev. net'],
                          [[r['symbol'], r['slot'], f"{r['x_pct']:.1f}%", r['grid'], money(r['standalone_net']), money(r['idle_clean_net'])] for r in rows])
md['library_top'] = top_lib
lib_sum = []
for w in WINDOWS:
    rows = [r for r in lib_rows if r['window'] == w]
    if not rows:
        continue
    sn = sorted(r['standalone_net'] for r in rows)
    lib_sum.append([w, len(rows), sum(1 for v in sn if v > 0), sum(1 for r in rows if r['idle_clean_net'] > 0), money(statistics.median(sn)),
                    money(max(r['idle_clean_net'] for r in rows)), ', '.join(r['symbol'] for r in sym_rows if r['window'] == w and r['band_empty']) or '—'])
# 4A coverage against the SEARCH_PLAN §3 floor of 5,120 vectors per symbol with a band (final review finding 1)
cov_rows = []
for w in WINDOWS:
    a = load(w, '4A', 'RECORD.json')
    if not a:
        continue
    band = [x for x in a['symbols'] if not x['band']['empty']]
    under = [x for x in band if x['evaluated'] < 5120]
    cov_rows.append({'window': w, 'symbols_with_band': len(band), 'floor': 5120 * len(band), 'evaluated': sum(x['evaluated'] for x in band),
                     'symbols_below_floor': len(under), 'shortfall': sum(5120 - x['evaluated'] for x in under),
                     'below_floor': ', '.join(f"{x['symbol']} {x['evaluated']:,}" for x in under)})
write_csv('4A_floor_coverage.csv', cov_rows)
tot_floor, tot_short = sum(r['floor'] for r in cov_rows), sum(r['shortfall'] for r in cov_rows)
md['4A_coverage'] = md_table(['Window', 'Symbols with a band', 'Floor (5,120 each)', 'Evaluated', 'Coverage', 'Symbols below the floor', 'Shortfall'],
                             [[r['window'], r['symbols_with_band'], f"{r['floor']:,}", f"{r['evaluated']:,}", f"{100 * r['evaluated'] / r['floor']:.2f}%", r['symbols_below_floor'], f"{r['shortfall']:,}"] for r in cov_rows]
                             + [['All', '', f'{tot_floor:,}', f'{tot_floor - tot_short:,}', f'{100 * (tot_floor - tot_short) / tot_floor:.2f}%', sum(r['symbols_below_floor'] for r in cov_rows), f'{tot_short:,}']])
md['library_summary'] = md_table(['Window', 'Library members', 'Standalone net > 0', 'B5-idle-clean net > 0', 'Median standalone net', 'Best B5-idle-clean net', 'Symbols without a shallow band'], lib_sum)

# ----- 4B, 4C, 4D development records and selections -----
sel_rows, search_rows = [], []
for w in WINDOWS:
    for stage in STAGES:
        rec = load(w, stage, 'RECORD.json')
        if not rec:
            continue
        sel = rec['selection']
        pick = sel['pick']
        row = {'window': w, 'stage': stage, 'evaluated': sel['evaluated'], 'feasible': sel['feasible'], 'no_fill': sel['noFill'],
               'pick': describe(pick) if pick else 'B5 unchanged (no-fill)',
               'dev_delta': pick['evaluation']['delta'] if pick else 0.0,
               'dev_minute_dd': pick['evaluation']['minuteDD'] if pick else None,
               'dev_pnl_preservation': pick['evaluation']['pnlWeighted'] if pick else None,
               'dev_retention': pick['evaluation']['retention'] if pick else None,
               'perturb_median': pick['perturbations']['median'] if pick else None,
               'perturb_positive_share': pick['perturbations']['positiveShare'] if pick else None,
               'shallow_lots_dev': pick['evaluation']['shallowLots'] if pick else 0,
               'switches_dev': pick['evaluation']['switchesExecuted'] if pick else 0,
               's_raw_delta': sel['sRaw']['evaluation']['delta'] if sel['sRaw'] else None,
               's_risk_delta': sel['sRisk']['evaluation']['delta'] if sel['sRisk'] else None,
               'best_feasible_delta': max((c['evaluation']['delta'] for c in sel['candidates']), default=None)}
        sel_rows.append(row)
        if 'search' in rec:
            s = rec['search']
            b = s['budget']
            floor = b['initial'] + b['generations'] * b['population'] * b['islands'] + b['refinement']
            islands = []
            for ip in rec.get('islandPicks', []):
                islands.append(describe(ip['pick']) if ip and ip['pick'] else 'no-fill')
            search_rows.append({'window': w, 'experiment': stage, 'evaluated': s['evaluated'], 'floor': floor, 'duplicates': s['duplicates'],
                                'role_failures': s['roleFailures'], 'feasible': s['feasible'], 'extended': s['extended'],
                                'final_hypervolume': [hv[-1] if hv else 0 for hv in s['hypervolume']],
                                'island_picks': ' || '.join(islands)})
write_csv('selections.csv', sel_rows)

# seed stability (PROTOCOL §10.5): each island's own pick (the §8 rule on its own evaluations), from the sealed 4D records;
# mean pairwise Jaccard of the islands' book sets (tier:symbol:vector, B5 books by id), of their tier:symbol sets, and
# the share of island pairs that agree on the policy kind; across folds the same statistics over the four fold picks.
def books_of(g, exact=True):
    return {f"{t}:{b['symbol']}:{b['gridKey'] if exact and b['origin'] != 'B5' else ('B5' if b['origin'] == 'B5' else '')}" for t in ['deep', 'shallow'] for b in g[t]}


def jaccard(a, b):
    return len(a & b) / len(a | b) if a | b else 1.0


def pairwise(items, f):
    pairs = [(i, j) for i in range(len(items)) for j in range(i + 1, len(items))]
    return sum(f(items[i], items[j]) for i, j in pairs) / len(pairs) if pairs else None


island_rows = []
for w in WINDOWS:
    for stage in EXPERIMENTS:
        rec = load(w, stage, 'RECORD.json')
        if not rec or 'islandPicks' not in rec:
            continue
        picks = [ip['pick'] for ip in rec['islandPicks'] if ip and ip.get('pick')]
        island_rows.append({'window': w, 'experiment': stage, 'islands_filled': len(picks), 'islands': len(rec['islandPicks']),
                            'jaccard_books': pairwise(picks, lambda a, b: jaccard(books_of(a), books_of(b))),
                            'jaccard_symbols': pairwise(picks, lambda a, b: jaccard(books_of(a, False), books_of(b, False))),
                            'policy_agreement': pairwise(picks, lambda a, b: float(a['policy']['kind'] == b['policy']['kind']))})
for stage in STAGES:
    picks = [load('selections', f, 'SELECTION.json') for f in FOLDS]
    picks = [p['picks'][stage]['pick'] for p in picks if p and p['picks'][stage]['pick']]
    island_rows.append({'window': 'across folds', 'experiment': stage, 'islands_filled': len(picks), 'islands': len(FOLDS),
                        'jaccard_books': pairwise(picks, lambda a, b: jaccard(books_of(a), books_of(b))),
                        'jaccard_symbols': pairwise(picks, lambda a, b: jaccard(books_of(a, False), books_of(b, False))),
                        'policy_agreement': pairwise(picks, lambda a, b: float(a['policy']['kind'] == b['policy']['kind']))})
write_csv('seed_stability.csv', island_rows)
f2 = lambda x: '—' if x is None else f'{x:.2f}'
md['seed_stability'] = md_table(['Window', 'Experiment', 'Filled picks / islands (or folds)', 'Jaccard (books)', 'Jaccard (tier:symbol)', 'Policy agreement'],
                                [[r['window'], r['experiment'], f"{r['islands_filled']} / {r['islands']}", f2(r['jaccard_books']), f2(r['jaccard_symbols']), f2(r['policy_agreement'])] for r in island_rows])

# one row per selected book (window × experiment × pick kind × tier × book), with a phenotype hash
# (sha256 of the book's canonical JSON: symbol, grid, tier) so identical phenotypes can be joined across records
book_rows = []
GRID_KEYS = ['targetPercentChange', 'trailingBuyPercentage', 'trailingStopPercentage', 'maximumHoldDays', 'tickWindowSize', 'intradayLossBuffer', 'pullback', 'continuationWindow']
for w in WINDOWS:
    sel = load('selections', w, 'SELECTION.json')
    if not sel:
        continue
    for stage, entry in sel['picks'].items():
        for kind in ['pick', 'sRaw', 'sRisk']:
            g = entry.get(kind)
            if not g:
                continue
            pol = g['policy']
            for tier in ['deep', 'shallow']:
                for b in g[tier]:
                    canon = json.dumps({'symbol': b['symbol'], 'tier': tier, 'grid': {k: b['grid'][k] for k in GRID_KEYS}}, sort_keys=True, separators=(',', ':'))
                    book_rows.append({'window': w, 'experiment': stage, 'pick_kind': kind, 'selection_body': sel['bodyHash'], 'tier': tier, 'book_id': b['id'],
                                      'symbol': b['symbol'], 'origin': b.get('origin'), 'deep_mode': b.get('deepMode'), 'rank': b.get('rank'),
                                      **{k: b['grid'][k] for k in GRID_KEYS}, 'x_pct': b['grid']['targetPercentChange'] / 10,
                                      'phenotype_sha256': hashlib.sha256(canon.encode()).hexdigest(),
                                      'policy': pol['kind'], 'p3_budget': pol['budget'] if pol['kind'] == 'P3' else None, 'p3_filter': pol['filter'] if pol['kind'] == 'P3' else None,
                                      'p4_deadline': pol['deadline'] if pol['kind'] == 'P4' else None, 'gate': pol['gate'], 'g2_lambda': pol['lambda'] if pol['gate'] == 'G2' else None,
                                      'dev_delta': g['evaluation']['delta'], 'dev_minute_dd': g['evaluation']['minuteDD'], 'dev_daily_dd': g['evaluation']['dailyDD']})
write_csv('selection_books.csv', book_rows)
write_csv('4D_search_coverage.csv', search_rows)
md['selections'] = {stage: md_table(
    ['Window', 'Evaluated', 'Feasible', 'Pick (development)', 'Dev. Δnet', 'Dev. minute DD', 'Perturb. median Δ', 'Share Δ>0'],
    [[r['window'], f"{r['evaluated']:,}", f"{r['feasible']:,}", r['pick'], money(r['dev_delta']), dd(r['dev_minute_dd']), money(r['perturb_median']), pct(r['perturb_positive_share'], 0)]
     for r in sel_rows if r['stage'] == stage]) for stage in STAGES}
md['h_picks'] = md_table(['Experiment', 'H pick (all 2016–2023 data; in-sample)', 'H Δnet vs B5', 'H minute DD', 'Perturb. median Δ', 'Share Δ>0'],
                         [[r['stage'], r['pick'], money(r['dev_delta']), dd(r['dev_minute_dd']), money(r['perturb_median']), pct(r['perturb_positive_share'], 0)] for r in sel_rows if r['window'] == 'H'])
md['coverage'] = md_table(['Window', 'Experiment', 'Evaluated', 'Floor', 'Duplicates skipped', 'Role-infeasible', 'Feasible', 'Extended'],
                          [[r['window'], r['experiment'], f"{r['evaluated']:,}", f"{r['floor']:,}", f"{r['duplicates']:,}", f"{r['role_failures']:,}", f"{r['feasible']:,}", 'yes' if r['extended'] else 'no'] for r in search_rows])

# ----- evaluation -----
def date_of(t):
    from datetime import date
    return date.fromisoformat(t)


def exposure(lots):
    """2020–2023 funded lots of a chained account: count, interest, costs, calendar days held (an open lot to 2023-12-29)."""
    from datetime import date
    d = lambda t: date.fromisoformat(t)
    days = sum((d(l['exitDate'] if l['exitDate'] != 'open' else '2023-12-29') - d(l['entryDate'])).days for l in lots)
    return {'lots_2020_23': len(lots), 'interest_2020_23': sum(l['interest'] for l in lots), 'costs_2020_23': sum(l['costs'] for l in lots),
            'days_held_2020_23': days, 'share_of_days_held': days / (d('2023-12-29') - d('2019-12-31')).days}


ev = load('evaluation', 'RECORD.json')
if ev:
    res = ev['results']
    b5y = ev['b5']['years']
    fold_rows, chain_rows, abl_rows, cost_rows, stress_rows, pert_rows, rub_rows = [], [], [], [], [], [], []
    for stage in STAGES:
        r = res[stage]
        for fold in FOLDS:
            f = r['folds'][fold]
            fold_rows.append({'stage': stage, 'fold': fold, 'year': EVAL_YEAR[fold], 'no_fill': f['noFill'], 'pick': f['pick'],
                              'dev_delta_sealed': f['devDeltaSealed'], 'dev_delta_recomputed': f['devDeltaRecomputed'],
                              'v': f['v'], 'v_b5': f['vB5'], 'delta': f['delta'], 'windowed_minute_dd': f['windowedMinuteDD'],
                              'windowed_daily_dd': f['windowedDailyDD'], 'pnl_preservation': f['preservation']['pnlWeighted'],
                              'count_preservation': f['preservation']['countWeighted'], 'shallow_net': f['attribution']['shallowNet'],
                              'idle_clean_net': f['attribution']['idleClean']['net']})
        c = r['chained']
        chain_rows.append({'stage': stage, **{f'delta_{y}': c['delta'][y] for y in ['2020', '2021', '2022', '2023']}, 'sum_delta': c['sumDelta'],
                           'minute_dd': c['minuteDD']['maximum'], 'daily_dd': c['dailyDD']['maximum'], 'b5_minute_dd': c['b5MinuteDD']['maximum'],
                           'pnl_preservation': c['preservation']['pnlWeighted'], 'count_preservation': c['preservation']['countWeighted'],
                           'retention': c['preservation']['retention'], 'top10_missed': c['preservation']['topMissed'],
                           'shallow_lots': c['shallowLots'], 'shallow_net': c['attribution']['shallowNet'], 'idle_clean_net': c['attribution']['idleClean']['net'],
                           'reset_sum_delta': r['reset']['sumDelta'], 'largest_paired': c['largestPaired'], 'largest_cluster': c['largestCluster'],
                           **exposure(c['lots']), 'label': ev['rubric'][stage]['label']})
        for k, v in r['ablations'].items():
            abl_rows.append({'stage': stage, 'ablation': k, 'sum_delta': v['sumDelta'], **{f'delta_{y}': v['delta'][y] for y in ['2020', '2021', '2022', '2023']}})
        cost_rows.append({'stage': stage, **r['costs']})
        stress_rows.append({'stage': stage, **r['stresses']})
        p = r['perturbations']
        pert_rows.append({'stage': stage, 'n': p['pick']['n'], 'eval_positive_share': p['pick']['evalPositiveShare'], 'eval_median': p['pick']['evalMedian'],
                          'eval_p10': p['pick']['evalP10'], 'shallow_off_n': p['shallowOff']['n'], 'shallow_off_positive_share': p['shallowOff']['evalPositiveShare'],
                          'shallow_off_median': p['shallowOff']['evalMedian'], 'spearman_best': r['skill']['spearmanBest'], 'null_p75': r['null']['p75']})
        rub_rows.append({'stage': stage, 'label': ev['rubric'][stage]['label'], **ev['rubric'][stage]['criteria']})
    write_csv('evaluation_folds.csv', fold_rows)
    write_csv('evaluation_chained.csv', chain_rows)
    write_csv('evaluation_ablations.csv', abl_rows)
    write_csv('evaluation_costs.csv', cost_rows)
    write_csv('evaluation_stresses.csv', stress_rows)
    write_csv('evaluation_perturbations.csv', pert_rows)
    write_csv('rubric.csv', rub_rows)
    md['b5_years'] = md_table(['', '2020', '2021', '2022', '2023', 'Σ'], [['B5 (continuous run)'] + [money(b5y[y]) for y in ['2020', '2021', '2022', '2023']] + [money(sum(b5y.values()))],
                                                                          ['B4'] + [money(ev['b4']['years'][y]) for y in ['2020', '2021', '2022', '2023']] + [money(sum(ev['b4']['years'].values()))],
                                                                          ['B1 (VGT D1)'] + [money(ev['b1']['years'][y]) for y in ['2020', '2021', '2022', '2023']] + [money(sum(ev['b1']['years'].values()))]])
    md['chained'] = md_table(['Procedure', 'Δ 2020', 'Δ 2021', 'Δ 2022', 'Δ 2023', 'ΣΔ (carry)', 'ΣΔ (reset)', 'Minute DD', 'Daily DD', 'P&L pres.', 'Count pres.', 'Retention', 'Top-10 missed', 'Shallow lots', 'Shallow net', 'Idle-clean net', 'Label'],
                             [[r['stage']] + [money(r[f'delta_{y}']) for y in ['2020', '2021', '2022', '2023']] + [money(r['sum_delta']), money(r['reset_sum_delta']), dd(r['minute_dd']), dd(r['daily_dd']), pct(r['pnl_preservation']), pct(r['count_preservation']), pct(r['retention']), r['top10_missed'], r['shallow_lots'], money(r['shallow_net']), money(r['idle_clean_net']), r['label']] for r in chain_rows])
    b5x = exposure(ev['b5']['lots'])
    md['b5_chained'] = md_table(['Account', 'Net 2020–23', 'Minute DD', 'Daily DD', 'Lots 2020–23', 'Interest', 'Costs', 'Calendar days held', 'Share of days held'],
                                [['B5 continuous run', money(sum(b5y.values())), dd(ev['b5']['minuteDD']['maximum']), dd(ev['b5']['dailyDD']['maximum']), b5x['lots_2020_23'], money(b5x['interest_2020_23']), money(b5x['costs_2020_23']), b5x['days_held_2020_23'], pct(b5x['share_of_days_held'])]])
    md['exposure'] = md_table(['Procedure', 'Lots 2020–23', 'Shallow lots', 'Interest', 'Costs', 'Calendar days held', 'Share of days held', 'Minute DD', 'Daily DD'],
                              [[r['stage'], r['lots_2020_23'], r['shallow_lots'], money(r['interest_2020_23']), money(r['costs_2020_23']), r['days_held_2020_23'], pct(r['share_of_days_held']), dd(r['minute_dd']), dd(r['daily_dd'])] for r in chain_rows]
                              + [['B5', b5x['lots_2020_23'], 0, money(b5x['interest_2020_23']), money(b5x['costs_2020_23']), b5x['days_held_2020_23'], pct(b5x['share_of_days_held']), dd(ev['b5']['minuteDD']['maximum']), dd(ev['b5']['dailyDD']['maximum'])]])
    trade_rows = []
    for i, lot in enumerate(ev['b5']['lots']):
        row = {'b5_book': lot['bookId'], 'trade': lot['tradeId'], 'entry': lot['entryDate'], 'exit': lot['exitDate'], 'b5_net': lot['net']}
        for stage in STAGES:
            t = res[stage]['chained']['b5Trades'][i]
            assert t['bookId'] == lot['bookId'] and t['tradeId'] == lot['tradeId']
            row[f'{stage}_status'] = t['status']
            row[f'{stage}_net'] = t['candidateNet']
        trade_rows.append(row)
    write_csv('b5_trade_preservation.csv', trade_rows)
    short = {'exact': '=', 'delayed': 'delayed', 'altered': 'altered', 'missed': 'MISSED'}
    md['b5_trades'] = md_table(['B5 lot (book, trade)', 'Entry', 'Exit', 'B5 net'] + STAGES,
                               [[f"{r['b5_book']} #{r['trade']}", r['entry'], r['exit'], money(r['b5_net'])] + [short[r[f'{st}_status']] + ('' if r[f'{st}_status'] in ('exact', 'missed') or r[f'{st}_net'] is None else f" ({money(r[f'{st}_net'])})") for st in STAGES] for r in trade_rows])
    md['folds'] = {stage: md_table(['Fold', 'Year', 'Pick', 'Dev. Δ (sealed)', 'Dev. Δ (recomputed)', 'V', 'V (B5)', 'Δ', 'Windowed minute DD', 'P&L pres.', 'Shallow net', 'Idle-clean net'],
                                   [[r['fold'], r['year'], r['pick'][:90], money(r['dev_delta_sealed']), money(r['dev_delta_recomputed']), money(r['v']), money(r['v_b5']), money(r['delta']), dd(r['windowed_minute_dd']), pct(r['pnl_preservation']), money(r['shallow_net']), money(r['idle_clean_net'])] for r in fold_rows if r['stage'] == stage]) for stage in STAGES}
    md['ablations'] = md_table(['Procedure', 'Ablation / variant', 'Δ 2020', 'Δ 2021', 'Δ 2022', 'Δ 2023', 'ΣΔ'],
                               [[r['stage'], r['ablation']] + [money(r[f'delta_{y}']) for y in ['2020', '2021', '2022', '2023']] + [money(r['sum_delta'])] for r in abl_rows])
    cost_keys = [k for k in cost_rows[0].keys() if k != 'stage']
    md['costs'] = md_table(['Procedure'] + [f'ΣΔ {k}' for k in cost_keys], [[r['stage']] + [money(r[k]) for k in cost_keys] for r in cost_rows])
    stress_keys = [k for k in stress_rows[0].keys() if k != 'stage']
    md['stresses'] = md_table(['Procedure'] + stress_keys, [[r['stage']] + [money(r[k]) for k in stress_keys] for r in stress_rows])
    md['perturbations'] = md_table(['Procedure', 'Perturbations', 'Eval. share Δ>0', 'Eval. median Δ', 'Eval. P10 Δ', 'Shallow-off share Δ>0', 'Shallow-off median', 'Spearman(dev, eval) top-100', 'Null P75 ΣΔ'],
                                   [[r['stage'], r['n'], pct(r['eval_positive_share'], 0), money(r['eval_median']), money(r['eval_p10']), pct(r['shallow_off_positive_share'], 0), money(r['shallow_off_median']), '—' if r['spearman_best'] is None else f"{r['spearman_best']:.2f}", money(r['null_p75'])] for r in pert_rows])
    crit = [k for k in rub_rows[0].keys() if k not in ('stage', 'label')]
    md['rubric'] = md_table(['Procedure'] + crit + ['Label'], [[r['stage']] + [('pass' if r[k] is True else 'FAIL' if r[k] is False else 'n/e') for k in crit] + [r['label']] for r in rub_rows])

# ----- ledgers and event diagnostics of the chained verdict accounts -----
if ev:
    LED = os.path.join(RES, 'ledgers')
    os.makedirs(LED, exist_ok=True)
    regimes = {'COVID crash 2020-02-19→03-23': ('2020-02-19', '2020-03-23'), 'COVID recovery →2020-08-31': ('2020-03-24', '2020-08-31'),
               '2021 trend': ('2021-01-01', '2021-12-31'), '2022 bear →10-12': ('2022-01-03', '2022-10-12'), '2023 rebound': ('2023-01-01', '2023-12-31')}
    regime_rows, worst_rows, pres_rows = [], [], []
    for stage in STAGES:
        c = ev['results'][stage]['chained']
        lots, switches = c['lots'], c['switches']
        with open(os.path.join(LED, f'{stage}_chained_lots.csv'), 'w', newline='') as f:
            keys = ['id', 'bookId', 'symbol', 'tier', 'kind', 'tradeId', 'setupKind', 'entryDate', 'entryBar', 'entryRawPrice', 'exitDate', 'exitBar', 'exitRawPrice', 'exitReason', 'shares', 'interest', 'costs', 'net', 'worstMark', 'switchId', 'virtualEntryRawPrice', 'virtualNet']
            w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
            w.writeheader()
            for lot in lots:
                w.writerow(lot)
        with open(os.path.join(LED, f'{stage}_chained_switches.csv'), 'w', newline='') as f:
            keys = ['id', 'policy', 'decisionDate', 'deepBookId', 'deepTradeId', 'deepSetupKind', 'shallowBookId', 'estimatePrice', 'estimateNet', 'outcome', 'waited', 'late', 'saleIndex', 'saleBar', 'saleRawPrice', 'saleNet', 'attemptRawPrice', 'attemptNet', 'purchaseIndex', 'purchaseBar', 'purchaseRawPrice', 'mirrorLotId', 'mirrorKind']
            w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
            w.writeheader()
            for sw in switches:
                w.writerow(sw)
        for label, (a, b) in regimes.items():
            inside = [l for l in lots if a <= l['entryDate'] <= b]
            sws = [x for x in switches if a <= x['decisionDate'] <= b]
            regime_rows.append({'stage': stage, 'regime': label, 'shallow_lots': sum(1 for l in inside if l['tier'] == 'shallow'),
                                'shallow_net': sum(l['net'] for l in inside if l['tier'] == 'shallow'), 'deep_net': sum(l['net'] for l in inside if l['tier'] == 'deep'),
                                'switches': len(sws), 'executed': sum(1 for x in sws if x['outcome'] == 'executed'),
                                'forced_loss_net': sum(min(0, x['saleNet'] or 0) for x in sws if x['outcome'] == 'executed' and x['saleNet'] is not None)})
        for x in sorted([x for x in switches if x['outcome'] == 'executed' and x['saleNet'] is not None], key=lambda x: x['saleNet'])[:5]:
            worst_rows.append({'stage': stage, 'date': x['decisionDate'], 'deep': x['deepBookId'], 'shallow': x['shallowBookId'], 'policy': x['policy'], 'estimate_net': x['estimateNet'], 'sale_net': x['saleNet']})
        pr = c['preservation']
        pres_rows.append({'stage': stage, 'b5_lots': pr['b5Lots'], 'b5_profitable': pr['b5Profitable'], 'b5_profitable_net': pr['b5ProfitableNet'], 'exact': pr['exact'], 'delayed': pr['delayed'],
                          'altered': pr['altered'], 'missed': pr['missed'], 'missed_net': pr['missedNet'], 'count_weighted': pr['countWeighted'], 'pnl_weighted': pr['pnlWeighted'],
                          'retention': pr['retention'], 'top10_missed': pr['topMissed'], 'gained': pr['gained'], 'gained_net': pr['gainedNet'], 'delayed_net_change': pr['delayedNetChange'],
                          'idle_clean_lots': c['attribution']['idleClean']['lots'], 'idle_clean_net': c['attribution']['idleClean']['net'],
                          'idle_then_conflicting_net': c['attribution']['idleThenConflicting']['net'], 'busy_start_net': c['attribution']['busyStart']['net'], 'preempted_net': c['attribution']['preempted']['net']})
    # B5's longest idle gaps in 2020–2023 (exit of one B5 lot to the entry of the next) and what each procedure's shallow
    # tier funded inside them (PROTOCOL §10.7)
    b5l = sorted(ev['b5']['lots'], key=lambda l: l['entryDate'])
    gaps = sorted([(b5l[i]['exitDate'], b5l[i + 1]['entryDate']) for i in range(len(b5l) - 1) if b5l[i]['exitDate'] != 'open'],
                  key=lambda g: (date_of(g[0]) - date_of(g[1])).days)[:6]
    gap_rows = []
    for a, b in gaps:
        row = {'from': a, 'to': b, 'days': (date_of(b) - date_of(a)).days}
        for stage in STAGES:
            inside = [l for l in ev['results'][stage]['chained']['lots'] if l['tier'] == 'shallow' and a <= l['entryDate'] <= b]
            row[f'{stage}_lots'] = len(inside)
            row[f'{stage}_net'] = sum(l['net'] for l in inside)
        gap_rows.append(row)
    write_csv('b5_idle_gaps.csv', gap_rows)
    md['b5_idle_gaps'] = md_table(['B5 idle from', 'to', 'Days'] + STAGES,
                                  [[r['from'], r['to'], r['days']] + [f"{r[f'{st}_lots']} ({money(r[f'{st}_net'])})" if r[f'{st}_lots'] else '—' for st in STAGES] for r in gap_rows])
    write_csv('regimes.csv', regime_rows)
    write_csv('worst_forced_sales.csv', worst_rows)
    write_csv('preservation.csv', pres_rows)
    md['regimes'] = md_table(['Procedure', 'Regime', 'Shallow lots', 'Shallow net', 'Deep net', 'Switch records', 'Executed', 'Forced-sale losses'],
                             [[r['stage'], r['regime'], r['shallow_lots'], money(r['shallow_net']), money(r['deep_net']), r['switches'], r['executed'], money(r['forced_loss_net'])] for r in regime_rows])
    md['worst_forced'] = md_table(['Procedure', 'Decision date', 'Deep book', 'Shallow book', 'Policy', 'Estimate net', 'Sale net'],
                                  [[r['stage'], r['date'], r['deep'], r['shallow'], r['policy'], money(r['estimate_net']), money(r['sale_net'])] for r in worst_rows])
    md['preservation'] = md_table(['Procedure', 'B5 lots 2020–23', 'Profitable', 'Exact', 'Delayed', 'Altered', 'Missed', 'Missed profitable net', 'Count pres.', 'P&L pres.', 'Retention', 'Top-10 missed', 'Gained (net)', 'Idle-clean shallow net', 'Idle→conflicting net', 'Busy-start net', 'Preempted shallow net'],
                                  [[r['stage'], r['b5_lots'], r['b5_profitable'], r['exact'], r['delayed'], r['altered'], r['missed'], money(r['missed_net']), pct(r['count_weighted']), pct(r['pnl_weighted']), pct(r['retention']), r['top10_missed'], f"{r['gained']} ({money(r['gained_net'])})", money(r['idle_clean_net']), money(r['idle_then_conflicting_net']), money(r['busy_start_net']), money(r['preempted_net'])] for r in pres_rows])

# ----- the door log (every opening of Study 4's bounded market-data reader) -----
door_path = os.path.join(RES, 'doors.jsonl')
if os.path.exists(door_path):
    doors = [json.loads(line) for line in open(door_path) if line.strip()]
    write_csv('door_input_hashes.csv', [{'opened': d['at'], 'pid': d['pid'], 'purpose': d['purpose'], 'window': d['window'], 'end': d['end'], 'symbol': sym,
                                          'prefix_sha256': d['prefixSha256'][sym], 'loaded_bars_sha256': d['loadedBarsSha256'][sym]} for d in doors for sym in d['symbols']])
    md['doors'] = md_table(['Opened (UTC)', 'PID', 'Purpose', 'Window', 'Bars through', 'Symbols'],
                           [[d['at'], d['pid'], d['purpose'], d['window'] or '—', d['end'], len(d['symbols'])] for d in doors])

# ----- the final verdict record -----
fin = load('FINAL.json')
if fin:
    md['final'] = md_table(['Experiment', 'Chained label', 'Nominee rule'], [[k, fin['labels'][k], fin['reasons'].get(k, 'control (never nominated)')] for k in fin['labels']])
    md['final_statement'] = f"**{fin['statement']}** (FINAL.json body `{fin['bodyHash'][:16]}…`; completeness V2 incl. H: {'pass' if fin['completeness']['ok'] else 'FAIL'})\n"

json.dump(md, open(os.path.join(TAB, 'report_tables.json'), 'w'), indent=1)
for key, value in md.items():
    if isinstance(value, dict):
        for sub, text in value.items():
            open(os.path.join(TAB, f'{key}_{sub}.md'), 'w').write(text)
    else:
        open(os.path.join(TAB, f'{key}.md'), 'w').write(value)
print('tables written:', sorted(os.listdir(TAB)))

# ----- reports from templates: research/study4-two-tier-d1-allocator/report_templates/<NAME>.md → <NAME>.md -----
# A line `<!-- TABLE key -->` or `<!-- TABLE key/sub -->` is replaced by the generated table (missing → a note).
TEMPLATES = os.path.join(ROOT, 'report_templates')
if os.path.isdir(TEMPLATES):
    for name in sorted(os.listdir(TEMPLATES)):
        if not name.endswith('.md'):
            continue
        out = []
        for line in open(os.path.join(TEMPLATES, name)):
            stripped = line.strip()
            if stripped.startswith('<!-- TABLE ') and stripped.endswith('-->'):
                key = stripped[len('<!-- TABLE '):-3].strip()
                parts = key.split('/')
                value = md.get(parts[0])
                if isinstance(value, dict) and len(parts) > 1:
                    value = value.get(parts[1])
                out.append(value if isinstance(value, str) else f'*(table {key} not available)*\n')
            else:
                out.append(line)
        open(os.path.join(ROOT, name), 'w').write(''.join(out))
    print('reports written from templates:', sorted(n for n in os.listdir(TEMPLATES) if n.endswith('.md')))
