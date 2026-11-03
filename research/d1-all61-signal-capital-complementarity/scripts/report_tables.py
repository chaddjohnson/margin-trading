#!/usr/bin/env python3
"""Read-only reporting for Study 2 (d1-all61-signal-capital-complementarity-v1).

Reads only the sealed records under results/ (verifying every payload's sha256 against the record that lists it) and
writes readable tables, CSV exports and SVG heatmaps under results/tables/, plus results/tables/MANIFEST.json with the
sha256 of every file written. It never writes a sealed record, never reads market data and never recomputes an engine
figure. Run from the repository root:

    python3 -I research/d1-all61-signal-capital-complementarity/scripts/report_tables.py
"""
import gzip
import hashlib
import json
import math
import os
import sys

ROOT = 'research/d1-all61-signal-capital-complementarity'
RES = os.path.join(ROOT, 'results')
OUT = os.path.join(RES, 'tables')
written = {}


def sha(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def load(path):
    with open(path) as handle:
        return json.load(handle)


def gz(payload):
    if sha(payload['file']) != payload['sha256']:
        sys.exit(f"{payload['file']} does not hash as sealed")
    with gzip.open(payload['file'], 'rt') as handle:
        return json.load(handle)


def write(name, text):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as handle:
        handle.write(text)
    written[name] = sha(path)


def money(value):
    if value is None or (isinstance(value, float) and (math.isnan(value) or math.isinf(value))):
        return 'NA'
    sign = '−' if value < 0 else ''
    return f'{sign}${abs(value):,.0f}'


def pct(value, digits=1):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 'NA'
    return f'{100 * value:.{digits}f}%'


def num(value, digits=2):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 'NA'
    return f'{value:.{digits}f}'


def csv(rows, header):
    def cell(value):
        text = '' if value is None else str(value)
        return f'"{text}"' if (',' in text or '"' in text) else text
    return '\n'.join([','.join(header)] + [','.join(cell(row.get(key)) for key in header) for row in rows]) + '\n'


def md_table(header, rows):
    lines = ['| ' + ' | '.join(header) + ' |', '|' + '|'.join('---' for _ in header) + '|']
    lines += ['| ' + ' | '.join(str(cell) for cell in row) + ' |' for row in rows]
    return '\n'.join(lines) + '\n'


SEEN = {'GDX', 'XOP', 'XLE', 'EWZ', 'TLT', 'XLU', 'GLD'}
F7 = {'DBC', 'EDV', 'ILF', 'IYT', 'KIE', 'VOOG', 'VPU'}


def tag(symbol):
    marks = []
    if symbol in SEEN:
        marks.append('°')
    if symbol in F7:
        marks.append('ᵗ')
    return symbol + ''.join(marks)


# ----- screens -----

def screens():
    text = ['# Sealed ex-ante screens (PROTOCOL §7.1)\n',
            'Inputs end at the cutoff (fold A 2020-06-30, fold B 2021-12-31). ° designer-seen (T, B4); ᵗ F7 thin.\n']
    rows_csv = []
    for fold in ('A', 'B'):
        record = load(os.path.join(RES, 'screen', f'SCREEN-{fold}.json'))
        text.append(f"\n## Fold {fold} (cutoff {record['cutoff']}; SRC order after the filter: {' '.join(record['sourceOrderR2Filtered'][:8])} …)\n")
        for cell in record['screens']:
            roles = ', '.join(f"{role['role']} = {role['symbol'] or '—'}" for role in cell['roles'])
            passing = sorted([row for row in cell['rows'] if row['passes']], key=lambda row: row['order'])
            text.append(f"\n### {cell['baseline']} × View {cell['view']}: {cell['candidates']} candidates, {len(passing)} pass every gate — **{roles}**\n")
            show = passing[:8]
            body = [[row['order'], tag(row['symbol']), row['n_dec'], row['years'], row['n_idle'], row['n_clean'], money(row['idle_net']), money(row['fo_net']), money(row['sa_net']), money(row['sa_dd']), row['fam_idle'], num(row['score'], 2)] for row in show]
            if body:
                text.append(md_table(['#', 'ETF', 'n_dec', 'years', 'n_idle', 'n_clean', 'idle_net', 'fo_net', 'sa_net', 'sa_dd', 'fam_idle', 'score'], body))
            gates = {}
            for row in cell['rows']:
                for gate, ok in row['gates'].items():
                    gates.setdefault(gate, 0)
                    gates[gate] += 0 if ok else 1
            text.append('Candidates failing each gate: ' + ', '.join(f'{gate} {count}' for gate, count in gates.items()) + '\n')
            for row in cell['rows']:
                rows_csv.append({'fold': fold, 'baseline': cell['baseline'], 'view': cell['view'], **{k: row[k] for k in ('symbol', 'n_dec', 'years', 'n_idle', 'n_clean', 'idle_net', 'fo_net', 'sa_net', 'sa_dd', 'fam_idle', 'indep_pos', 'passes', 'economicFailure')}, 'score': row.get('score'), 'order': row.get('order')})
    write('screens.md', '\n'.join(text))
    write('screens.csv', csv(rows_csv, ['fold', 'baseline', 'view', 'symbol', 'n_dec', 'years', 'n_idle', 'n_clean', 'idle_net', 'fo_net', 'sa_net', 'sa_dd', 'fam_idle', 'indep_pos', 'passes', 'economicFailure', 'score', 'order']))


# ----- Level D -----

def heatmap(name, symbols, pairs, value, title, lo=0.0, hi=1.0):
    cell = 11
    pad = 46
    size = pad + cell * len(symbols) + 10
    index = {(row['a'], row['b']): row for row in pairs}
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{size + 120}" height="{size + 30}" font-family="sans-serif" font-size="8">',
             f'<rect width="100%" height="100%" fill="#ffffff"/>',
             f'<text x="4" y="12" font-size="11">{title}</text>']
    for i, a in enumerate(symbols):
        parts.append(f'<text x="{pad - 3}" y="{pad + cell * i + 8}" text-anchor="end">{a}</text>')
        parts.append(f'<text x="{pad + cell * i + 8}" y="{pad - 3}" transform="rotate(-90 {pad + cell * i + 8} {pad - 3})">{a}</text>')
        for j, b in enumerate(symbols):
            v = value(index[(a, b)])
            if v is None:
                fill = '#d9d9d9'
            else:
                t = max(0.0, min(1.0, (v - lo) / (hi - lo)))
                r = int(247 - t * (247 - 8))
                g = int(251 - t * (251 - 69))
                bl = int(255 - t * (255 - 148))
                fill = f'#{r:02x}{g:02x}{bl:02x}'
            parts.append(f'<rect x="{pad + cell * j}" y="{pad + cell * i}" width="{cell - 1}" height="{cell - 1}" fill="{fill}"/>')
    parts.append(f'<text x="{size}" y="{pad + 10}">{lo:g} light</text><text x="{size}" y="{pad + 22}">{hi:g} dark</text><text x="{size}" y="{pad + 34}">grey = NA</text>')
    parts.append('</svg>')
    write(f'heatmaps/{name}.svg', '\n'.join(parts))


def leveld():
    record = load(os.path.join(RES, 'leveld', 'LEVELD.json'))
    data = {key: gz(payload) for key, payload in record['payloads'].items()}
    symbols = data['U-T']['symbols']
    text = ['# Level D tables (descriptive; PROTOCOL §6)\n', '° designer-seen (T, B4); ᵗ F7 thin. Costs 5 bps, 11%.\n']

    # Occupancy
    text.append('\n## Baseline occupancy\n')
    rows = []
    for key in ('U-T', 'U-A', 'U-B'):
        for baseline in ('B4', 'B5'):
            occ = data[key]['perBaseline'][baseline]['occupancy']
            q7 = data[key]['perBaseline'][baseline]['q7']
            rows.append([key[2:], baseline, occ['lots'], pct(occ['heldShare']), pct(occ['reservedShare'], 2), pct(occ['idleShare']), f"{occ['sessionsWithLotAtClose']} / {occ['sessions']}", occ['idleStretchCount'], pct(q7['idleWithNoEtfArmedOrHolding'] / q7['idleMinutes'] if q7['idleMinutes'] else None)])
    text.append(md_table(['window', 'pool', 'lots entered', 'held (minutes)', 'reserved', 'idle', 'sessions with a lot at close', 'idle stretches', 'idle minutes with no U ETF armed or holding'], rows))
    for key in ('U-T',):
        for baseline in ('B4', 'B5'):
            occ = data[key]['perBaseline'][baseline]['occupancy']
            text.append(f'\n### Longest idle stretches of {baseline} (training era) and the View U decisions inside them\n')
            text.append(md_table(['start', 'end', 'sessions', 'U decisions', 'ETFs deciding'], [[s['start'], s['end'], s['sessions'], s['decisions'], ' '.join(s['symbols'][:14]) + (' …' if len(s['symbols']) > 14 else '')] for s in occ['idleStretches'][:10]]))

    # Per-ETF summaries
    all_rows = []
    for key, payload in data.items():
        for baseline in ('B4', 'B5'):
            for s in payload['perBaseline'][baseline]['summaries']:
                dips = payload['dips'][s['symbol']]
                all_rows.append({'viewWindow': key, 'baseline': baseline, 'symbol': s['symbol'], 'member': s['member'], 'dipEpisodes': dips['episodes'], 'majorDips': dips['major'], 'setups': s['setupsArmed'], 'decisions': s['decisions'], 'fills': s['fills'], 'wins': s['wins'], 'losses': s['losses'], 'net': round(s['all']['net'], 2), 'busy': s['busy']['count'], 'busyHeld': s['busyHeld'], 'busyReserved': s['busyReserved'], 'busyDuringProfitable': s['busyDuringProfitableHolding'], 'busyDuringLosing': s['busyDuringLosingHolding'], 'idleClean': s['idleClean']['count'], 'idleCleanNet': round(s['idleClean']['net'], 2), 'idleCleanWorst': s['idleClean']['worst'], 'idleCleanNetPerDay': s['idleClean']['netPerOccupiedDay'], 'idleDisplacing': s['idleDisplacing']['count'], 'idleDisplacingNet': round(s['idleDisplacing']['net'], 2), 'firstOrderDelta': round(s['firstOrder']['delta'], 2), 'years': s['years'], 'idleCleanYears': ' '.join(s['idleCleanYears']), 'idleCleanShock': s['idleCleanShock'], 'idleCleanOffShock': s['idleCleanOffShock'], 'idleCleanPositiveOffShock': s['idleCleanPositiveOffShock'], 'families': s['families'], 'soloFamilies': s['soloFamilies'], 'independentIdleClean': s['independentIdleClean'], 'independentIdleCleanPositive': s['independentIdleCleanPositive'], 'largestFamilyShare': s['largestFamilyShareOfIdleCleanNet'], 'idleCleanNetWithoutBestEpisode': s['idleCleanNetWithoutBestEpisode'], 'competingShare': s['positiveNetShareCompeting'], 'leadingShare': payload['leading'][s['symbol']]})
    header = list(all_rows[0].keys())
    write('leveld-per-etf.csv', csv(all_rows, header))
    for key in ('U-T', 'P-A-A', 'P-B-B'):
        for baseline in ('B5', 'B4'):
            rows = [row for row in all_rows if row['viewWindow'] == key and row['baseline'] == baseline]
            rows.sort(key=lambda row: (-row['idleCleanNet'], row['symbol']))
            text.append(f'\n## Per-ETF opportunity against {baseline}, {key} (sorted by idle-clean net)\n')
            text.append(md_table(['ETF', 'dips (major)', 'setups', 'decisions', 'W/L', 'standalone net', 'busy (held/res; during win/loss)', 'idle-clean (net)', 'idle-displacing (net)', 'first-order Δ', 'indep. idle-clean (pos.)', 'off-shock pos.', 'solo fam.'],
                                 [[tag(r['symbol']) + ('' if r['member'] else ' NA'), f"{r['dipEpisodes']} ({r['majorDips']})", r['setups'], r['decisions'], f"{r['wins']}/{r['losses']}", money(r['net']), f"{r['busy']} ({r['busyHeld']}/{r['busyReserved']}; {r['busyDuringProfitable']}/{r['busyDuringLosing']})", f"{r['idleClean']} ({money(r['idleCleanNet'])})", f"{r['idleDisplacing']} ({money(r['idleDisplacingNet'])})", money(r['firstOrderDelta']), f"{r['independentIdleClean']} ({r['independentIdleCleanPositive']})", r['idleCleanPositiveOffShock'], r['soloFamilies']] for r in rows]))

    # Families
    text.append('\n## Cross-ETF event families (anchor window 10 sessions; sensitivities 5 and 20)\n')
    rows = []
    for key, payload in data.items():
        v = record['viewWindows'][key]
        rows.append([key, v['families'], v['solo'], v['marketWide'], f"{v['sensitivities']['w5']['families']} / {v['sensitivities']['w5']['solo']} / {v['sensitivities']['w5']['marketWide']}", f"{v['sensitivities']['w20']['families']} / {v['sensitivities']['w20']['solo']} / {v['sensitivities']['w20']['marketWide']}"])
    text.append(md_table(['view-window', 'families', 'solo', 'market-wide (≥ 10 ETFs)', 'w5: fam / solo / mkt', 'w20: fam / solo / mkt'], rows))
    for key in ('U-T', 'P-B-B', 'P-A-A'):
        fams = sorted(data[key]['families'], key=lambda f: -len(f['symbols']))[:12]
        text.append(f'\n### Largest families, {key}\n')
        text.append(md_table(['family', 'start', 'end', 'regime', 'ETFs', 'decisions', 'first'], [[f['id'], f['start'], f['end'], f['regime'], len(f['symbols']), f['decisions'], f['first']] for f in fams]))
        by_regime = {}
        for f in data[key]['families']:
            entry = by_regime.setdefault(f['regime'], [0, 0, 0])
            entry[0] += 1
            entry[1] += len(f['symbols'])
            entry[2] += 1 if len(f['symbols']) == 1 else 0
        text.append(f'\nFamilies by regime ({key}): ' + '; '.join(f"{k}: {v[0]} families, mean {v[1] / v[0]:.1f} ETFs, {v[2]} solo" for k, v in sorted(by_regime.items(), key=lambda item: int(item[0][1:]) if item[0][1:].isdigit() else 99)) + '\n')

    # Pair matrices
    text.append('\n## Pair matrices: summary\n')
    rows = []
    for key, payload in data.items():
        pairs = [p for p in payload['pairs'] if p['a'] < p['b']]
        def defined(field, sub=None):
            values = [(p[field][sub] if sub else p[field]) for p in pairs]
            return [v for v in values if v is not None]
        s5 = defined('matchShare', 's5')
        rho = defined('returnCorrelation')
        hold = defined('holdJaccard')
        rows.append([key, len(pairs), len(s5), num(sum(s5) / len(s5)) if s5 else 'NA', sum(1 for v in s5 if v >= 0.5), num(sum(rho) / len(rho)) if rho else 'NA', len(hold), num(sum(hold) / len(hold), 3) if hold else 'NA'])
    text.append(md_table(['view-window', 'unordered pairs', 'pairs with s5 defined', 'mean s5 match share', 'pairs with s5 ≥ 0.5', 'mean return ρ', 'pairs with holding Jaccard defined', 'mean holding Jaccard'], rows))
    q1 = record['q1']
    text.append(f"\n### Q1 lists (U-T; n_dec ≥ 4 both)\n\n- Low return correlation (ρ ≤ 0.3) but colliding at entry (±5-session match share ≥ 0.5): {len(q1['lowCorrelationColliding'])} ordered pairs: " + ', '.join(f"{p['a']}→{p['b']} (ρ {p['rho']:.2f}, s5 {p['s5']:.2f})" for p in q1['lowCorrelationColliding'][:40]) + '\n')
    text.append(f"- Correlated (ρ ≥ 0.7) but asynchronous (s5 ≤ 0.2): {len(q1['correlatedAsynchronous'])} ordered pairs: " + ', '.join(f"{p['a']}→{p['b']} (ρ {p['rho']:.2f}, s5 {p['s5']:.2f})" for p in q1['correlatedAsynchronous'][:40]) + '\n')
    for baseline, items in q1['asynchronousRelativeTo'].items():
        text.append(f"- Asynchronous relative to {baseline} (≥ 50% of U-T decisions idle): {len(items)} ETFs: " + ', '.join(f"{i['symbol']} ({i['idleShare']:.0%} of {i['decisions']})" for i in sorted(items, key=lambda i: -i['idleShare'])) + '\n')
    h3 = record['h3']
    for window, item in h3.items():
        text.append(f"- H3 window {window}: Spearman of ±5-session match shares, U vs P, over {item['pairs']} pairs with both defined: {num(item['spearmanS5'])}\n")
    write('leveld.md', '\n'.join(text))

    for key in ('U-T', 'U-A', 'U-B', 'P-A-A', 'P-B-B'):
        pairs = data[key]['pairs']
        heatmap(f'{key}-decision-match-s5', symbols, pairs, lambda r: r['matchShare']['s5'], f'{key}: share of row ETF decisions matched within ±5 sessions (one-to-one)')
        heatmap(f'{key}-holding-jaccard', symbols, pairs, lambda r: r['holdJaccard'], f'{key}: capital-holding Jaccard')
    heatmap('U-T-return-correlation', symbols, data['U-T']['pairs'], lambda r: r['returnCorrelation'], 'U-T: daily return correlation (secondary contrast)', -0.2, 1.0)
    return data


# ----- Level C, risk, analysis -----

def replays():
    path = os.path.join(RES, 'replays', 'REPLAYS.json')
    if not os.path.exists(path):
        return
    record = load(path)
    text = ['# Exact shared-pool replays (Level C; PROTOCOL §7)\n', 'ΔV = window increment of B + candidate − the same of B (liquidation-equivalent), every cost fully re-simulated. ° designer-seen.\n']
    rows = []
    rows_csv = []
    for result in record['results']:
        item, s = result['item'], result['summary']
        costs = {c['cost']: c for c in s['costs']}
        a = s['attribution']
        p = a['parts']
        port = s['portfolio']
        rows.append([item['id'].replace(item['candidate'], tag(item['candidate']), 1), money(costs['5']['baseline']), money(costs['0']['delta']), money(costs['2']['delta']), money(costs['5']['delta']), money(costs['10']['delta']), money(costs['s25']['delta']), money(a['firstOrder']['delta']), money(p['candidateIdleClean']), money(p['candidateIdleDisplacing'] + p['candidateBusyAgainstBaseline']), money(p['incumbentGained']), money(p['incumbentLostDirect'] + p['incumbentLostCascade']), money(s['risk']['scenarioMinuteDD'] - s['risk']['baselineMinuteDD']), pct(port['scenario']['windowedDailyPercentDrawdown'] - port['baseline']['windowedDailyPercentDrawdown'], 2)])
        rows_csv.append({'id': item['id'], 'kind': item['kind'], 'baseline': item['baseline'], 'view': item['view'], 'fold': item['fold'], 'role': item['role'], 'candidate': item['candidate'], **{f'delta{c}': round(costs[c]['delta'], 2) for c in costs}, 'baselineV5': round(costs['5']['baseline'], 2), 'firstOrder': round(a['firstOrder']['delta'], 2), 'signAgreement': a['signAgreement'], **{k: round(v, 2) for k, v in p.items()}, 'complementShare': a['complementShare'], 'largestScenarioOnlyShare': round(a['largestScenarioOnlyShare'], 2), 'byRegime': ' '.join(f'{k}:{v:.0f}' for k, v in sorted(a['byRegime'].items())), 'scenarioMinuteDD': round(s['risk']['scenarioMinuteDD'], 2), 'baselineMinuteDD': round(s['risk']['baselineMinuteDD'], 2), 'portfolioScenarioDailyDD': port['scenario']['windowedDailyPercentDrawdown'], 'portfolioBaselineDailyDD': port['baseline']['windowedDailyPercentDrawdown'], 'portfolioCoreDailyDD': port['core']['windowedDailyPercentDrawdown'], 'equityIncrementScenario': round(port['scenario']['equityIncrement'], 2), 'equityIncrementBaseline': round(port['baseline']['equityIncrement'], 2), 'equityIncrementCore': round(port['core']['equityIncrement'], 2)})
    text.append(md_table(['replay', 'B V@5', 'ΔV@0', 'ΔV@2', 'ΔV@5', 'ΔV@10', 'ΔV s25', 'first-order Δ', 'own idle-clean', 'own other', 'incumbents gained', 'incumbents lost', 'Δ minute DD', 'Δ portfolio daily DD'], rows))
    write('replays.md', '\n'.join(text))
    write('replays.csv', csv(rows_csv, list(rows_csv[0].keys())))


def risk():
    path = os.path.join(RES, 'risk', 'RISK.json')
    if not os.path.exists(path):
        return
    record = load(path)
    payload = gz(record['payload'])
    text = ['# Matched-horizon risk (PROTOCOL §8)\n']
    rows = []
    for window in ('T', 'A', 'B'):
        for pool in ('S', 'B4', 'B5'):
            r = record['pools'][f'{pool}-{window}']['risk']
            rows.append([window, pool, money(r['increment']), r['lotsEntered'], f"{r['wins']}/{r['losses']}", money(r['worstClosed']), money(r['lossSum']), money(r['worstMaeDollars']), r['maxConsecutiveLosses'], money(min(x['worst'] for x in r['rolling'])), money(r['minuteDrawdown']['maximum']), money(r['dailyDrawdown']['maximum']), r['fallingKnifeEpisodes'], money(r['fallingKnifeNet']), pct(r['timeInMarket'])])
    text.append('\n## Fixed $100,000 slot\n')
    text.append(md_table(['window', 'pool', 'V', 'lots', 'W/L', 'worst closed lot', 'sum of losses', 'worst MAE', 'max consecutive losses', 'worst 30/60/90-day', 'minute DD', 'daily DD', 'falling-knife episodes', 'their net', 'time in market'], rows))
    rows = []
    for window in ('T', 'A', 'B'):
        for pool in ('B4', 'B5'):
            c = record['pools'][f'{pool}-{window}']['capacity']
            rows.append([window, pool, c['fundedLots'], c['losingLots'], money(c['losingLotNet']), pct(c['losingSlotMinutes'] / c['allSlotMinutes'] if c['allSlotMinutes'] else None), c['refusedWhileLosingLotHeld'], c['refusedWhileLosingLotHeldPositive'], money(c['refusedWhileLosingLotHeldNet'])])
    text.append('\n## Capacity cost of losing lots\n')
    text.append(md_table(['window', 'pool', 'funded lots', 'losing lots', 'their net', 'share of slot time', 'decisions refused while a losing lot held the slot', 'of which profitable standalone', 'their standalone net'], rows))
    rows = []
    for window in ('T', 'A', 'B'):
        for pool in ('C0', 'S', 'B4', 'B5'):
            r = record['portfolios'][f'{pool}-{window}']
            rows.append([window, pool, money(r['startEquity']), money(r['endEquity']), money(r['equityIncrement']), pct(r['windowedDailyPercentDrawdown'], 2), r['windowedDailyPeak'], r['windowedDailyTrough'], pct(r['wholeRunDailyPercentDrawdown'], 2), pct(r['wholeRunMinutePercentDrawdown'], 2)])
    text.append('\n## 20% portfolio overlay ($300,000 60/40 VOOG/VGT core)\n')
    text.append(md_table(['window', 'run', 'equity at start', 'at end', 'increment', 'windowed max daily % DD', 'peak', 'trough', 'whole-run daily % DD to window end', 'whole-run minute % DD to window end'], rows))
    # standalone U table
    rows_csv = []
    for key, table in payload['standalone'].items():
        for symbol, r in table.items():
            rows_csv.append({'viewWindow': key, 'symbol': symbol, 'increment': round(r['increment'], 2), 'lots': r['lotsEntered'], 'wins': r['wins'], 'losses': r['losses'], 'worstClosed': r['worstClosed'], 'lossSum': round(r['lossSum'], 2), 'worstMae': r['worstMaeDollars'], 'maxConsecutiveLosses': r['maxConsecutiveLosses'], 'minuteDD': round(r['minuteDrawdown']['maximum'], 2), 'dailyDD': round(r['dailyDrawdown']['maximum'], 2), 'fallingKnifeEpisodes': r['fallingKnifeEpisodes'], 'fallingKnifeNet': round(r['fallingKnifeNet'], 2), 'timeInMarket': r['timeInMarket']})
    write('risk-standalone.csv', csv(rows_csv, list(rows_csv[0].keys())))
    for key in ('U-T', 'U-B', 'P-B-B'):
        sub = [r for r in rows_csv if r['viewWindow'] == key]
        if not sub:
            continue
        sub.sort(key=lambda r: r['minuteDD'], reverse=True)
        over = sum(1 for r in sub if r['minuteDD'] > 35000)
        knives = sum(r['fallingKnifeEpisodes'] for r in sub)
        text.append(f'\n## Standalone slots, {key}: {len(sub)} separate $100,000 slots (never one account); minute DD > $35,000 in {over}; falling-knife episodes summed over separate slots {knives}\n')
        text.append(md_table(['ETF', 'V', 'lots', 'W/L', 'worst closed', 'worst MAE', 'minute DD', 'falling knives'], [[tag(r['symbol']), money(r['increment']), r['lots'], f"{r['wins']}/{r['losses']}", money(r['worstClosed']), money(r['worstMae']), money(r['minuteDD']), r['fallingKnifeEpisodes']] for r in sub[:15]]))
    write('risk.md', '\n'.join(text))


def analysis():
    path = os.path.join(RES, 'analysis', 'ANALYSIS-2.json')
    if not os.path.exists(path):
        path = os.path.join(RES, 'analysis', 'ANALYSIS.json')
    if not os.path.exists(path):
        return
    record = load(path)
    text = [f"# Rubric outcome (PROTOCOL §9)\n\nSource: `{path}` (code freeze v{record.get('codeFreezeVersion', 1)}; amendment C1 supersedes ANALYSIS.json for labels and the reshuffle count; the verdict is identical).\n\n**Verdict: {record['verdict']}** {' '.join(record['verdictQualifiers'])}\n",
            '\n## k of n (fold replays)\n', md_table(['criterion', 'k'], [[k, v if not isinstance(v, list) else ', '.join(v) or 'none'] for k, v in record['kOfN'].items()])]
    text.append('\n## Fold replay flags\n')
    text.append(md_table(['replay', 'ΔV 0/2/5/10', 'all costs > 0', 'floor', 'material', 'complement share', 'complement-type', 'not thin', 'beats NC', 'C', 'R', 'first-order vs full sign agree'],
                         [[f['id'], ' / '.join(money(f['deltas'][c]) for c in ('0', '2', '5', '10')), f['allCostsPositive'], money(f['materialityFloor']), f['material'], pct(f['complementShare']) if f['complementShare'] is not None else 'NA', f['complementType'], f['notThin'], f['beatsNc'], f['C'], f['R'], f['signAgreement']] for f in record['replayFlags']]))
    text.append('\n## Other replays (incumbent diagnostic, in-sample; never in the verdict)\n')
    text.append(md_table(['replay', 'ΔV 0/2/5/10', 'complement share', 'first-order Δ', 'full-path Δ@5'], [[f['id'], ' / '.join(money(f['deltas'][c]) for c in ('0', '2', '5', '10')), pct(f['complementShare']) if f['complementShare'] is not None else 'NA', money(f['firstOrderDelta']), money(f['fullPathDelta'])] for f in record['otherReplayFlags']]))
    rows_csv = []
    for view, by_baseline in record['labels'].items():
        for baseline, by_symbol in by_baseline.items():
            for symbol, label in by_symbol.items():
                rows_csv.append({'view': view, 'baseline': baseline, 'symbol': symbol, 'label': label['label'], 'qualifiers': ' '.join(label['qualifiers']), 'designerSeen': label['designerSeen'], 'category': label['category'], 'f7': label['f7'], 'decisions': label['decisions'], 'idleClean': label['idleClean'], 'idleCleanNet': round(label['idleCleanNet'], 2), 'independentIdleClean': label['independentIdleClean'], 'independentIdleCleanPositive': label['independentIdleCleanPositive']})
    write('labels.csv', csv(rows_csv, list(rows_csv[0].keys())))
    for view in ('U', 'P-A', 'P-B'):
        counts = {}
        for row in rows_csv:
            if row['view'] == view:
                counts.setdefault((row['baseline'], row['label']), []).append(tag(row['symbol']) + (f" [{row['qualifiers']}]" if row['qualifiers'] else ''))
        text.append(f'\n## Labels, view {view}\n')
        text.append(md_table(['baseline', 'label', 'n', 'ETFs'], [[b, l, len(v), ', '.join(v)] for (b, l), v in sorted(counts.items())]))
    write('labels.md', '\n'.join(text))


# ----- additions after the results review (reporting only) -----

def spearman(xs, ys):
    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        ranks = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                ranks[order[k]] = (i + j) / 2
            i = j + 1
        return ranks
    rx, ry = rank(xs), rank(ys)
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(rx) / n, sum(ry) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sxx = sum((a - mx) ** 2 for a in rx)
    syy = sum((b - my) ** 2 for b in ry)
    return sxy / math.sqrt(sxx * syy) if sxx > 0 and syy > 0 else None


def pair_statistics():
    record = load(os.path.join(RES, 'leveld', 'LEVELD.json'))
    text = ['# Pair statistics (reporting script; orientations stated)\n']
    rows = []
    for key, payload in record['payloads'].items():
        data = gz(payload)
        ordered = [p for p in data['pairs'] if p['a'] != p['b'] and p['matchShare']['s5'] is not None]
        s5 = [p['matchShare']['s5'] for p in ordered]
        rows.append([key, len(ordered), num(sum(s5) / len(s5)) if s5 else 'NA', sum(1 for v in s5 if v >= 0.5)])
    text.append('\n## Ordered pairs (a ≠ b) with a defined ±5-session match share\n')
    text.append(md_table(['view-window', 'ordered pairs defined', 'mean share (both orientations)', 'ordered pairs ≥ 0.5'], rows))
    data = gz(record['payloads']['U-T'])
    pairs = data['pairs']
    index = {(p['a'], p['b']): p for p in pairs}
    decisions = {p['a']: p['decisionsA'] for p in pairs if p['a'] == p['b']}
    active = {k for k, v in decisions.items() if v >= 4}
    unordered = [p for p in pairs if p['a'] < p['b'] and p['a'] in active and p['b'] in active and p['matchShare']['s5'] is not None and p['returnCorrelation'] is not None]
    rho = [p['returnCorrelation'] for p in unordered]
    first = [p['matchShare']['s5'] for p in unordered]
    other = [index[(p['b'], p['a'])]['matchShare']['s5'] for p in unordered]
    text.append(f"\n## U-T: return correlation vs ±5-session entry overlap ({len(unordered)} unordered pairs, both ETFs ≥ 4 decisions)\n")
    text.append(md_table(['orientation of the share', 'Spearman with ρ'], [
        ['row = alphabetically first ETF', num(spearman(rho, first), 3)],
        ['minimum of the two shares', num(spearman(rho, [min(a, b) for a, b in zip(first, other)]), 3)],
        ['maximum of the two shares', num(spearman(rho, [max(a, b) for a, b in zip(first, other)]), 3)],
        ['mean of the two shares', num(spearman(rho, [(a + b) / 2 for a, b in zip(first, other)]), 3)]]))
    both = [(p['a'], p['b'], p['matchShare']['s5'], index[(p['b'], p['a'])]['matchShare']['s5'], p['returnCorrelation']) for p in unordered]
    top = sorted(both, key=lambda t: -min(t[2], t[3]))[:12]
    low = sorted(both, key=lambda t: (max(t[2], t[3]), t[4]))[:12]
    text.append('\n### Most coincident (by the smaller share)\n')
    text.append(md_table(['a', 'b', 'share of a matched', 'share of b matched', 'ρ'], [[a, b, num(x), num(y), num(r)] for a, b, x, y, r in top]))
    text.append('\n### Least coincident (by the larger share)\n')
    text.append(md_table(['a', 'b', 'share of a matched', 'share of b matched', 'ρ'], [[a, b, num(x), num(y), num(r)] for a, b, x, y, r in low]))
    write('pair-statistics.md', '\n'.join(text))


def idle_stretch_decisions():
    record = load(os.path.join(RES, 'leveld', 'LEVELD.json'))
    data = gz(record['payloads']['U-T'])
    signals = load(os.path.join(RES, 'signals', 'SIGNALS-2023-12-29.json'))
    runs = gz(signals['payload'])
    dates = runs['calendar']['dates']
    trades = {f"{t['symbol']}@{t['decisionTime']}": t for r in runs['views']['U'] for t in r['trades']}
    members = {'B4': {'VGT', 'XBI', 'XRT', 'KRE'}, 'B5': {'VGT', 'XBI', 'XRT', 'KRE', 'GDX'}}
    text = ['# Decisions that arrived while the pool was idle, by idle stretch (U-T; minute-precise: decisions not busy against the pool, non-members)\n']
    for baseline in ('B4', 'B5'):
        classes = {}
        for summary in data['perBaseline'][baseline]['summaries']:
            if summary['symbol'] in members[baseline]:
                continue
            for item in summary['classified']:
                classes[item['key']] = item['class']
        rows = []
        for stretch in data['perBaseline'][baseline]['occupancy']['idleStretches'][:10]:
            inside = [k for k, c in classes.items() if c != 'busy' and stretch['start'] <= dates[trades[k]['decisionIndex']] <= stretch['end']]
            nets = [trades[k]['net'] for k in inside]
            rows.append([stretch['start'], stretch['end'], stretch['sessions'], len(inside), sum(1 for v in nets if v > 0), money(sum(nets))])
        text.append(f'\n## {baseline}\n')
        text.append(md_table(['start', 'end', 'sessions', 'idle-at-decision decisions', 'winners', 'their standalone net'], rows))
    write('idle-stretch-decisions.md', '\n'.join(text))


def scenario_risk():
    path = os.path.join(RES, 'replays', 'REPLAYS.json')
    record = load(path)
    rows = []
    rows_csv = []
    for result in record['results']:
        payload = gz(result['payload'])
        for side in ('baseline', 'scenario'):
            r = payload['risk'][side]
            port = payload['portfolio'][side]
            label = result['item']['id'] + (' [B]' if side == 'baseline' else ' [B+c]')
            rows.append([label, money(r['increment']), r['lotsEntered'], f"{r['wins']}/{r['losses']}", money(r['worstClosed']), money(r['worstMaeDollars']), r['maxConsecutiveLosses'], ' / '.join(money(x['worst']) for x in r['rolling']), money(r['minuteDrawdown']['maximum']), money(r['dailyDrawdown']['maximum']), r['fallingKnifeEpisodes'], pct(r['timeInMarket']), money(port['startEquity']), money(port['equityIncrement']), pct(port['windowedDailyPercentDrawdown'], 2)])
            rows_csv.append({'replay': result['item']['id'], 'side': side, 'V': round(r['increment'], 2), 'lots': r['lotsEntered'], 'wins': r['wins'], 'losses': r['losses'], 'worstClosed': r['worstClosed'], 'worstMae': r['worstMaeDollars'], 'maxConsecutiveLosses': r['maxConsecutiveLosses'], 'worst30': round(r['rolling'][0]['worst'], 2), 'worst60': round(r['rolling'][1]['worst'], 2), 'worst90': round(r['rolling'][2]['worst'], 2), 'minuteDD': round(r['minuteDrawdown']['maximum'], 2), 'dailyDD': round(r['dailyDrawdown']['maximum'], 2), 'fallingKnives': r['fallingKnifeEpisodes'], 'timeInMarket': r['timeInMarket'], 'portfolioStartEquity': round(port['startEquity'], 2), 'portfolioEquityIncrement': round(port['equityIncrement'], 2), 'portfolioWindowedDailyDD': port['windowedDailyPercentDrawdown'], 'portfolioWholeRunDailyDD': port['wholeRunDailyPercentDrawdown'], 'portfolioWholeRunMinuteDD': port['wholeRunMinutePercentDrawdown']})
    text = ['# Side-by-side risk of every replay (baseline [B] and baseline + candidate [B+c]; 5 bps fixed slot; portfolio 20% overlay)\n',
            'Portfolio windows start from different equity in B and B+c (each run is continuous from 2016, so the candidate already traded before the window); the start equity is shown.\n',
            md_table(['replay', 'V', 'lots', 'W/L', 'worst closed', 'worst MAE', 'max consec. losses', 'worst 30 / 60 / 90 days', 'minute DD', 'daily DD', 'falling knives', 'time in market', 'portfolio start equity', 'equity increment', 'windowed daily % DD'], rows)]
    write('scenario-risk.md', '\n'.join(text))
    write('scenario-risk.csv', csv(rows_csv, list(rows_csv[0].keys())))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    screens()
    if os.path.exists(os.path.join(RES, 'leveld', 'LEVELD.json')):
        leveld()
    replays()
    risk()
    analysis()
    pair_statistics()
    idle_stretch_decisions()
    scenario_risk()
    manifest = {'generatedBy': 'scripts/report_tables.py', 'files': dict(sorted(written.items()))}
    with open(os.path.join(OUT, 'MANIFEST.json'), 'w') as handle:
        json.dump(manifest, handle, indent=2)
    print(f'{len(written)} files written under {OUT}')
