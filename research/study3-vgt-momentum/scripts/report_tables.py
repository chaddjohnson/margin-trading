#!/usr/bin/env python3
"""Read-only report tables for Study 3 Stage 1.

Reads only the sealed stage records under results/records/ and their payloads (every payload's sha256 is
verified before use), and writes Markdown tables to results/tables/. It never recomputes a strategy.

    python3 -I research/study3-vgt-momentum/scripts/report_tables.py
"""
import gzip
import hashlib
import json
import os
import sys

ROOT = os.environ.get('STUDY3_REPORT_ROOT', os.path.join('research', 'study3-vgt-momentum'))
RECORDS = os.path.join(ROOT, 'results', 'records')
TABLES = os.path.join(ROOT, 'results', 'tables')
FOLDS = ['A', 'B', 'C', 'D']
HISTORIES = ['A', 'B', 'C', 'D', 'H']


def sha256(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def record(stage):
    with open(os.path.join(RECORDS, f'{stage}.json')) as handle:
        return json.load(handle)


def payload(stage, name):
    rec = record(stage)
    meta = rec['payloads'][name]
    if sha256(meta['file']) != meta['sha256']:
        sys.exit(f'{stage} payload {name} does not verify')
    with gzip.open(meta['file'], 'rt') as handle:
        if meta['file'].endswith('.jsonl.gz'):
            return [json.loads(line) for line in handle if line.strip()]
        return json.load(handle)


def num(value):
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return value


def usd(value, signed=False):
    value = num(value)
    if value is None:
        return 'n/a'
    sign = '−' if value < 0 else ('+' if signed and value > 0 else '')
    return f'{sign}${abs(round(value)):,}'


def pct(value, digits=1):
    value = num(value)
    return 'n/a' if value is None else f'{value * 100:.{digits}f}%'


def table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join('---' for _ in headers) + '|']
    for row in rows:
        out.append('| ' + ' | '.join(str(cell) for cell in row) + ' |')
    return '\n'.join(out) + '\n'


def write(name, text):
    os.makedirs(TABLES, exist_ok=True)
    with open(os.path.join(TABLES, name), 'w') as handle:
        handle.write(text)


def params_of(candidate):
    parts = [f'{k}={v}' for k, v in candidate['params'].items()]
    return ', '.join(parts + [f"h={candidate['h']}", f"t={candidate['t']}"])


def main():
    develop = {h: record(f'develop-{h}')['summary'] for h in HISTORIES}
    selections = {h: payload(f'develop-{h}', 'selection') for h in HISTORIES}
    panels = {h: payload(f'develop-{h}', 'panel') for h in HISTORIES}
    evaluate = {f: record(f'evaluate-{f}')['summary'] for f in FOLDS}

    # --- gates and search per history
    rows = []
    for h in HISTORIES:
        s = develop[h]
        for g in s['gates']:
            fam = next((x for x in s['families'] if x['family'] == g['family']), None)
            rows.append([h, g['family'], 'pass' if g['pass'] else 'fail',
                         ''.join('✓' if g[k] else '✗' for k in ['g1', 'g2', 'g3', 'g4']),
                         usd(g['nets']['TPL'], True), usd(g['nets']['OX'], True), usd(g['nets']['CX1'], True),
                         usd(g['nets']['CX2'], True),
                         fam['evaluations'] if fam else '—', fam['feasible'] if fam else '—',
                         fam['champion'] or 'none' if fam else '—'])
    write('gates-and-search.md', table(
        ['History', 'Family', 'M1', 'g1 g2 g3 g4', 'TPL default net', 'OX', 'CX1', 'CX2', 'Evaluations',
         'Feasible', 'Champion'], rows))

    # --- selections
    rows = []
    for h in HISTORIES:
        sel = selections[h]
        for c in sel['champions']:
            rows.append([h, c['family'], c['id'], '**P\\***' if c['id'] == sel['pStar'] else '',
                         params_of(c['candidate']), usd(c['development'], True), usd(c['neighbourhoodMedian'], True),
                         pct(c['neighbourhoodFeasibility'], 0), usd(c['tenBpsNet'], True),
                         usd(c['summary']['minuteDD']), ', '.join(c['onBoundary']) or '—'])
    write('selections.md', table(
        ['History', 'Family', 'Champion', 'P*', 'Parameters', 'Dev net', 'Nbhd median', 'Nbhd feasible',
         'Dev net 10 bps', 'Dev minute DD', 'On boundary'], rows))

    # --- fold window ledger
    keys = []
    for f in FOLDS:
        keys.extend(k for k in evaluate[f]['runs'] if k not in keys)
    rows = []
    for key in keys:
        cells = [key]
        total = 0
        for f in FOLDS:
            run = evaluate[f]['runs'].get(key)
            if run is None:
                cells.append('—')
            else:
                total += run['V']
                cells.append(f"{usd(run['V'], True)} ({usd(run['windowMinuteDD'])})")
        cells.append(usd(total, True))
        rows.append(cells)
    rows.append(['D1 primary (context)'] + [
        f"{usd(evaluate[f]['d1']['V'], True)} ({usd(evaluate[f]['d1']['windowMinuteDD'])})" if evaluate[f]['d1'] else '—'
        for f in FOLDS] + [usd(sum(evaluate[f]['d1']['V'] for f in FOLDS if evaluate[f]['d1']), True)])
    write('fold-windows.md',
          'V = window increment (liquidation-equivalent), window minute drawdown in parentheses.\n\n' +
          table(['Run'] + [f'{f} {evaluate[f]["window"]["boundary"][:4]}→{evaluate[f]["window"]["end"][:4]}' for f in FOLDS] +
                ['Σ'], rows))

    # --- P* per fold with stresses and re-entry swaps
    rows = []
    for f in FOLDS:
        ev = evaluate[f]
        fam = ev['pStarFamily']
        if not fam:
            rows.append([f, 'none'] + ['—'] * 9)
            continue
        run = ev['runs'][f'champion:{fam}']
        var = ev['variants']
        rows.append([f, f"{fam} {ev['pStar']}", usd(run['V'], True), usd(run['windowMinuteDD']),
                     f"{run['lotsEntered']}+{run['lotsCarried']}", f"{run['firstEntries']}/{run['reentries']}",
                     pct(run['dollarDays'] / (100000 * run['calendarDays']) if run['calendarDays'] else 0, 0),
                     ' / '.join(usd(var[f'stress:{k}']['V'], True) for k in ['tenBps', 'rate14', 'slip25', 'delay1']),
                     ' / '.join(usd(var[f'reentry:{k}']['V'], True) for k in ['R1', 'R2', 'R0']),
                     usd(ev['runs'].get(f"default:{ev['p0']}", {}).get('V') if ev['p0'] else None, True),
                     ev['p0'] or '—'])
    write('pstar-folds.md', table(
        ['Fold', 'P*', 'V', 'Window minute DD', 'Lots entered+carried', 'First/re-entries', 'Exposure',
         'V at 10 bps / 14% / 25 bps slip / +1 min', 'V with R1 / R2 / R0', 'P0 V', 'P0 family'], rows))

    # --- analysis
    analysis = record('analysis')['summary']
    write('verdict.json', json.dumps(analysis['rubric'], indent=1) + '\n')
    rows = []
    for fam, info in analysis['families'].items():
        rows.append([fam, ' / '.join(usd(v, True) if v is not None else '—' for v in info['champion']), info['label'],
                     ' / '.join(usd(v, True) for v in analysis['defaults'][fam]['V']),
                     analysis['defaults'][fam]['label']])
    write('family-labels.md', table(['Family', 'Champion V A/B/C/D', 'Label', 'TPL default V A/B/C/D',
                                     'Default label'], rows))
    rows = [[cid, ' / '.join(usd(v, True) for v in info['V']), info['label'],
             ' / '.join(usd(v) for v in info['windowDD'])] for cid, info in analysis['controls'].items()]
    write('control-labels.md', table(['Control', 'V A/B/C/D', 'Label', 'Window minute DD A/B/C/D'], rows))

    # --- diagnostics
    diag = payload('diagnostics', 'rows')
    rows = []
    for row in diag:
        s = row['summary']
        rows.append([row['group'], row['id'], usd(s['net'], True), usd(s['priceGain'], True), usd(s['interest']),
                     usd(s['friction']), s['closed'] + s['open'], s['campaigns'], s['reentries'], usd(s['minuteDD']),
                     pct(s['exposure'], 0), usd(s['worstLot'], True), pct(s['worstMae']),
                     ' '.join(f"{y[2:]}:{usd(v, True)}" for y, v in row['yearly'].items()), s['exits']])
    write('diagnostics.md',
          'Full 2017-01-03 → 2023-12-29 history (in-sample, exploratory; defaults only).\n\n' + table(
              ['Group', 'Config', 'Net', 'Price gain', 'Interest', 'Friction', 'Lots', 'Campaigns', 'Re-entries',
               'Minute DD', 'Exposure', 'Worst lot', 'Worst MAE', 'Yearly', 'Exit mix'], rows))

    # --- robustness
    rob = record('robustness')['summary']
    rows = []
    for f in rob['finalists']:
        st = f['settings']
        rows.append([f['role'], f['id'], usd(f['baseline']['net'], True), usd(f['baseline']['minuteDD']),
                     ' / '.join(usd(st[f'cost:{c}']['net'], True) for c in [0, 2, 5, 10]),
                     ' / '.join(usd(st[f'rate:{r}']['net'], True) for r in ['0.08', '0.11', '0.14']),
                     ' / '.join(usd(st[f'stopSlip:{x}']['net'], True) for x in [10, 25, 50]),
                     ' / '.join(usd(st[f'entrySlip:{x}']['net'], True) for x in [10, 25]),
                     ' / '.join(usd(st[f'delay:{x}']['net'], True) for x in [1, 5]),
                     ' / '.join(usd(st[f'missing:{x}']['net'], True) for x in ['0.01', '0.05']),
                     ' / '.join(usd(st[f'reentry:{x}']['net'], True) for x in ['R1', 'R2', 'R0']),
                     pct(f['jointShare'], 0), pct(f['placeboPercentile'], 0),
                     usd(f['inverted'], True) if f['inverted'] is not None else '—', f['parityDifferences']])
    write('robustness.md', 'Full 2017-01-03 → 2023-12-29 (in-sample for H\'s picks).\n\n' + table(
        ['Role', 'Candidate', 'Net', 'Minute DD', '0/2/5/10 bps', '8/11/14%', 'Stop slip 10/25/50',
         'Entry slip 10/25', 'Delay +1/+5', 'Missing 1%/5%', 'R1/R2/R0', 'Joint ok', 'Placebo pct',
         'Inverted', 'Parity diffs'], rows))

    ledgers = payload('analysis', 'ledgers')
    rows = []
    for item in ledgers['finalists'] + ledgers['controls']:
        name = item.get('role', '') + ' ' + item['id']
        for leg in item['legs']:
            rows.append([name.strip(), f"{leg['from']}→{leg['to']}", pct(leg['legGain'], 0), pct(leg['capture'], 0),
                         leg['entryDelay'] if leg['entryDelay'] is not None else '—', pct(leg['idleShare'], 0),
                         pct(leg['lostPostStopGain'], 0), usd(leg['net'], True)])
    write('trend-legs.md',
          'Hindsight up-legs (10% zigzag on closes, gain ≥ 15%); descriptive only.\n\n' + table(
              ['Run', 'Leg', 'Leg gain', 'Capture', 'Entry delay (sessions)', 'Idle share', 'Lost post-stop gain',
               'Net in leg'], rows))
    rows = []
    for item in ledgers['finalists'] + ledgers['controls']:
        name = (item.get('role', '') + ' ' + item['id']).strip()
        for ep in item['episodes']:
            rows.append([name, ep['key'], usd(ep['net'], True), usd(ep['dailyDrawdown']), ep['lots'],
                         pct(ep['exposure'], 0)])
    write('episodes.md', table(['Run', 'Episode', 'Net', 'Daily DD', 'Lots entered', 'Exposure'], rows))
    rows = []
    for item in ledgers['finalists'] + ledgers['controls']:
        o = item['d1Overlap']
        rows.append([(item.get('role', '') + ' ' + item['id']).strip(), usd(o['changeWhileD1Idle'], True),
                     usd(o['changeWhileD1Holding'], True), o['d1IdleSessions'],
                     pct(o['candidateInvestedShareOfD1Idle'], 0),
                     pct(item['concentration']['topLot']) if item['concentration']['topLot'] is not None else '—',
                     pct(item['concentration']['topCampaign']) if item['concentration']['topCampaign'] is not None else '—'])
    write('d1-overlap-and-concentration.md',
          'Descriptive timing only (sealed VGT D1 primary ledger, Study 2); not a shared-capital simulation.\n\n' +
          table(['Run', 'Mark change while D1 idle', 'while D1 holding', 'D1-idle sessions',
                 'Invested share of D1-idle sessions', 'Top lot share', 'Top campaign share'], rows))
    # --- supplementary descriptive figures from sealed trade rows and daily marks (amendment A1)
    rob_payload = payload('robustness', 'finalists')
    ctl_payload = payload('robustness', 'controls')
    import csv
    with open('config/market-events/distributions.csv') as handle:
        dist = [r for r in csv.DictReader(handle) if r['etf'] == 'VGT' and '2017-01-03' < r['ex_date'] <= '2023-12-29']

    def dividends(trades):
        total = 0.0
        for t in trades:
            for r in dist:
                if t['entryDate'] < r['ex_date'] and (t['exitDate'] is None or r['ex_date'] <= t['exitDate']):
                    total += t['shares'] * float(r['amount'])
        return total

    def risk_extras(trades, daily):
        nets = [t['net'] for t in trades]
        by_campaign = {}
        for t in trades:
            by_campaign[t['campaign']] = by_campaign.get(t['campaign'], 0) + t['net']
        streak = worst_streak = 0
        for t in sorted(trades, key=lambda t: (t['entryIndex'], t['entryBar'])):
            streak = streak + 1 if t['net'] < 0 else 0
            worst_streak = max(worst_streak, streak)
        marks = [row[0] for row in daily]
        peak, under, longest, run = marks[0] if marks else 0, 0, 0, 0
        for m in marks:
            if m >= peak:
                peak, run = m, 0
            else:
                under += 1
                run += 1
                longest = max(longest, run)
        holds = sorted(t['sessionsHeld'] for t in trades if t['exitIndex'] >= 0)
        q = lambda f: holds[min(len(holds) - 1, int(f * len(holds)))] if holds else None
        return {
            'largestWinLot': max(nets) if nets else 0, 'largestLossLot': min(nets) if nets else 0,
            'largestWinCampaign': max(by_campaign.values()) if by_campaign else 0,
            'largestLossCampaign': min(by_campaign.values()) if by_campaign else 0,
            'consecutiveLosses': worst_streak, 'shareUnderwater': under / len(marks) if marks else 0,
            'longestUnderwaterSessions': longest, 'holdQuartiles': [q(0.25), q(0.5), q(0.75)],
            'dividendsNotBooked': dividends(trades),
        }

    extras = {f['role'] + ' ' + f['id']: risk_extras(f['trades'], f['daily']) for f in rob_payload}
    extras.update({c['id']: risk_extras(c['trades'], c['daily']) for c in ctl_payload if c['id'] in ('C-AL', 'C-ALR', 'C-SMA', 'C-DON', 'C-TSM', 'C-TSM/TPL')})
    loss = lambda v: usd(v, True) if v < 0 else 'none'
    rows = [[name, usd(x['largestWinLot'], True), loss(x['largestLossLot']), usd(x['largestWinCampaign'], True),
             loss(x['largestLossCampaign']), x['consecutiveLosses'], pct(x['shareUnderwater'], 0),
             x['longestUnderwaterSessions'],
             '/'.join(str(v) for v in x['holdQuartiles']) if x['holdQuartiles'][0] is not None else '— (no closed lot)',
             usd(x['dividendsNotBooked'], True)] for name, x in extras.items()]
    write('risk-extras.md', 'Full 2017-01-03 → 2023-12-29; descriptive, computed from sealed trade rows and daily marks '
          '(amendment A1). Dividends: VGT distributions (config/market-events/distributions.csv) on shares held at the '
          'close before each ex-date — not booked in any figure (price-only convention). "Underwater" = a daily mark below '
          'its running peak by any amount, flat sessions included; hold quartiles by an index rule (the engine median may '
          'differ).\n\n' + table(
              ['Run', 'Largest win (lot)', 'Largest loss (lot)', 'Largest win (campaign)', 'Largest loss (campaign)',
               'Max consecutive losing lots', 'Share of sessions underwater', 'Longest underwater (sessions)',
               'Hold quartiles (sessions)', 'Dividends not booked'], rows))
    z = {row['id']: row['summary'] for row in diag if row['group'] == 'M2Z'}
    z0, z1, z2 = z['E02/CX1/R3F/Z0'], z['E02/CX1/R3F/Z1'], z['E02/CX1/R3F/Z2']
    write('sizing.md', table(['Sizing', 'Net', 'Borrowed $-days', 'Net per $-day (×10⁶)', 'Z0 scaled to its $-days',
                              'Minute DD'], [
        [name, usd(v['net'], True), f"{v['dollarDays']:,.0f}", f"{v['net'] / v['dollarDays'] * 1e6:.2f}",
         usd(z0['net'] * v['dollarDays'] / z0['dollarDays'], True), usd(v['minuteDD'])]
        for name, v in [('Z0 full', z0), ('Z1 tranches', z1), ('Z2 vol target', z2)]]))

    # --- per-fold accounting of P* (amendment A2; whole-lot figures from the sealed window trade rows)
    rows = []
    for f in FOLDS:
        rec = record(f'evaluate-{f}')
        fam = rec['summary']['pStarFamily']
        runs = payload(f'evaluate-{f}', 'runs')
        run = runs[f'champion:{fam}']
        trades = run['trades']
        b = rec['summary']['window']['boundary']
        carried = [t for t in trades if t['entryDate'] <= b]
        entered = [t for t in trades if t['entryDate'] > b]
        closed = [t for t in trades if t['exitIndex'] >= 0]
        wins = sum(t['net'] for t in closed if t['net'] > 0)
        losses = -sum(t['net'] for t in closed if t['net'] < 0)
        carried_share = run['V'] - sum(t['net'] for t in entered)
        holds = sorted(t['sessionsHeld'] for t in closed)
        rows.append([f, f"{fam} {rec['summary']['pStar']}", usd(run['V'], True), len(entered), len(carried),
                     usd(carried_share, True) if carried else '—',
                     usd(sum(t['net'] for t in entered if t['exitIndex'] >= 0), True),
                     usd(sum(t['net'] for t in entered if t['exitIndex'] < 0), True),
                     usd(sum(t['priceGain'] for t in entered), True), usd(sum(t['interest'] for t in entered)),
                     usd(sum(t['friction'] for t in entered)),
                     f'{wins / losses:.2f}' if losses > 0 else ('∞' if wins > 0 else '—'),
                     '/'.join(str(h) for h in holds) or '—',
                     pct(min((t['maePct'] for t in trades), default=0)), pct(max((t['mfePct'] for t in trades), default=0)),
                     pct(run['dollarDays'] / (100000 * run['calendarDays']) if run['calendarDays'] else 0, 0)])
    write('pstar-accounting.md',
          'Per-fold accounting of the procedure pick (amendment A2, descriptive). The carried lot\'s window share = V − Σ '
          'net of the lots entered in the window. Price gain, interest and friction are those of the lots entered in the '
          'window (whole-lot); holds, MAE/MFE and profit factor cover every lot active in the window (whole-lot). '
          'Principal exposure = borrowed $-days ÷ ($100,000 × days); it does not see share-count drift.\n\n' + table(
              ['Fold', 'P*', 'V', 'Entered', 'Carried', 'Carried lot window share', 'Entered & closed net',
               'Entered & open net (liquidation)', 'Price gain (entered)', 'Interest (entered)', 'Friction (entered)',
               'Profit factor (closed lots)', 'Holds of closed lots (sessions)', 'Worst MAE', 'Best MFE',
               'Principal exposure'], rows))

    # --- P*-R and a Pareto report over development net, minute DD and exposure (amendment A2; PROTOCOL §8)
    rows = []
    for h in HISTORIES:
        champs = selections[h]['champions']
        if not champs:
            continue
        ratio = max(champs, key=lambda c: c['neighbourhoodMedian'] / max(c['summary']['minuteDD'], 5000))
        def dominated(c):
            a = c['summary']
            for o in champs:
                if o is c:
                    continue
                x = o['summary']
                if (o['development'] >= c['development'] and x['minuteDD'] <= a['minuteDD'] and x['exposure'] <= a['exposure']
                        and (o['development'] > c['development'] or x['minuteDD'] < a['minuteDD'] or x['exposure'] < a['exposure'])):
                    return True
            return False
        front = [c for c in champs if not dominated(c)]
        rows.append([h, selections[h]['pStarFamily'] or '—', ratio['family'],
                     f"{ratio['neighbourhoodMedian'] / max(ratio['summary']['minuteDD'], 5000):.2f}",
                     ', '.join(f"{c['family']} ({usd(c['development'], True)}, {usd(c['summary']['minuteDD'])}, {pct(c['summary']['exposure'], 0)})"
                               for c in sorted(front, key=lambda c: -c['development']))])
    write('pstar-r-and-pareto.md',
          'Secondary, descriptive (PROTOCOL §8; amendment A2). P*-R = highest neighbourhood median ÷ max(minute DD, $5,000). '
          'Pareto front = champions not dominated on (development net ↑, minute DD ↓, exposure ↓).\n\n' + table(
              ['History', 'P* family', 'P*-R family', 'P*-R ratio', 'Pareto front: family (dev net, minute DD, exposure)'],
              rows))

    # --- candidate register (research-only; ranks by the predeclared neighbourhood-median rule)
    register = []
    rob_by_id = {f['id']: f for f in rob['finalists']}
    for h in HISTORIES:
        sel = selections[h]
        ranked = sorted(sel['champions'], key=lambda c: (-c['neighbourhoodMedian'], c['family']))
        for rank, c in enumerate(ranked, 1):
            f = rob_by_id.get(c['id'])
            register.append({
                'history': h,
                'rank': rank,
                'id': c['id'],
                'family': c['family'],
                'parameters': c['candidate'],
                'role': 'P*' if c['id'] == sel['pStar'] else 'family champion',
                'developmentNet': c['development'],
                'neighbourhoodMedian': c['neighbourhoodMedian'],
                'neighbourhoodFeasibility': c['neighbourhoodFeasibility'],
                'tenBpsNet': c['tenBpsNet'],
                'onBoundary': c['onBoundary'],
                'finalist': f['role'] if f else None,
                'robustness': None if not f else {
                    'net': f['baseline']['net'], 'minuteDD': f['baseline']['minuteDD'],
                    'jointShare': f['jointShare'], 'placeboPercentile': f['placeboPercentile']},
                'status': 'research-only; not registered, not promoted to config/',
            })
    os.makedirs(TABLES, exist_ok=True)
    with open(os.path.join(ROOT, 'CANDIDATE_REGISTER.json'), 'w') as handle:
        json.dump({'study': 'study3-vgt-independent-momentum-v1', 'verdict': analysis['label'],
                   'candidates': register}, handle, indent=1)
        handle.write('\n')
    print('tables written to', TABLES)


if __name__ == '__main__':
    main()
