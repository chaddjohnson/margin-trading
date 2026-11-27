#!/usr/bin/env python3
# P8-GDX — TOTAL_PORTFOLIO_COMPARISON.md = the hand-written narrative reports/narrative/PORTFOLIO.md followed by sections
# generated here from reports/portfolio/portfolio.json (tools/gdx-d1-growth/portfolio.ts; report-only, no evaluation) and
# reports/diagnostics/lots.json (overlay giveback). Usage: python3 -I tools/gdx-d1-growth/portfolio-md.py
import json
import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUDY = os.path.join(REPO, 'research', 'gdx-d1-growth')
P = json.load(open(os.path.join(STUDY, 'reports', 'portfolio', 'portfolio.json'), encoding='utf-8'))
LOTS = json.load(open(os.path.join(STUDY, 'reports', 'diagnostics', 'lots.json'), encoding='utf-8'))
NARR = os.path.join(STUDY, 'reports', 'narrative', 'PORTFOLIO.md')
OUT = os.path.join(STUDY, 'TOTAL_PORTFOLIO_COMPARISON.md')
PRIMARY_VARIANT = 'primary (quarterly rebalance, cash at 0 %)'
PRIMARY_CORE = 500000


def m(x, sign=False):
    if x is None:
        return '—'
    s = f'{abs(x):,.0f}'
    if x < 0:
        return f'−${s}'
    return f'+${s}' if sign and x > 0 else f'${s}'


def pct(x, d=1):
    return '—' if x is None else f'{x * 100:.{d}f} %'


def sp(x, d=1):
    return '—' if x is None else ('−' if x < 0 else '+') + f'{abs(x) * 100:.{d}f} %'


def res(key, lev=PRIMARY_CORE, variant=PRIMARY_VARIANT):
    r = [x for x in P['results'] if x['key'] == key and x['leverage'] == lev and x['variant'] == variant]
    assert len(r) == 1, (key, lev, variant, len(r))
    return r[0]


subjects = [{'key': 'S0', 'population': 'core only', 'label': '60 % VOOG / 40 % VGT core only', 'roles': ['matched core'], 'primary': True}] + P['subjects']
dec = {d['key']: d for d in P['decomposition']}
labels = {l['key']: l for l in P['labels']}
# the same overlay can appear under several populations (D and D+; C and C+): unique overlays keep their first key
seen = {}
for s in subjects:
    seen.setdefault((s.get('recordArm'), s.get('id'), s['label']), s['key'])
dup = {s['key']: seen[(s.get('recordArm'), s.get('id'), s['label'])] for s in subjects if seen[(s.get('recordArm'), s.get('id'), s['label'])] != s['key']}
primaries = ['S0', 'S1', 'S2', 'S3'] + [s['key'] for s in P['subjects'] if s['key'] not in ('S1', 'S2', 'S3') and s['primary']]


def name(s):
    k = s['key']
    pop = s['population']
    role = 'primary' if s['primary'] else '; '.join(r.split(' ', 1)[1] if r.startswith('role ') else r for r in s['roles'])
    return f"{k} {pop}: `{s['label']}`" + ('' if k in ('S0', 'S1', 'S2', 'S3') else f' ({role})') + (f' = {dup[k]}' if k in dup else '')


subj = {s['key']: s for s in subjects}
md = []
md += ['## A. Inputs, conventions and the matched account', '']
md += [f"Label: **{P['label']}**.", '']
md += ['| Item | Value |', '|---|---|']
for k, v in P['conventions'].items():
    md.append(f"| {k} | {'; '.join(v) if isinstance(v, list) else v} |")
for k in ('VOOG', 'VGT'):
    c = P['inputs']['core'][k]
    md.append(f"| core data {k} | `{c['file']}` sha256 `{c['sha256']}` ({c['sessions']:,} sessions) |")
md.append(f"| distribution ledger | `{P['inputs']['distributionsLedger']['file']}` sha256 `{P['inputs']['distributionsLedger']['sha256']}` |")
for k, v in P['inputs']['independent'].items():
    md.append(f"| independent distributions {k} | `{v['file']}` sha256 `{v['sha256']}` (git-ignored; Yahoo chart API, fetched 2026-11-27 after the sealed outcome) |")
for k in ('validation', 'outcome', 'frozenSelection'):
    md.append(f"| {k} | `{P['inputs'][k]['file']}` sha256 `{P['inputs'][k]['sha256']}` |")
md.append(f"| written | {P['written']} |")
md += ['']

d = P['distributions']
nonest = [c for c in d['checks'] if c['method'] != 'estimated' and c['relDiff'] is not None]
worst = sorted(nonest, key=lambda c: -abs(c['relDiff']))[:5]
md += ['## B. Core distributions: the ledger checked against the independent series', '']
md += [f"{len(d['checks'])} VOOG / VGT ledger distributions 2016-01-04 → 2026-10-30; every one has an independent event within ±10 days "
       f"(missing: {sum(1 for c in d['checks'] if c['independent'] is None)}). The Yahoo amounts are stated per current share (after the "
       "2026-04-21 splits) and are converted back to the ex-date share basis before any comparison or use. Non-estimated ledger "
       f"amounts vs independent: median |difference| {sorted(abs(c['relDiff']) for c in nonest)[len(nonest) // 2] * 100:.2f} %, maximum "
       f"{max(abs(c['relDiff']) for c in nonest) * 100:.2f} %. The ledger amounts are used unchanged (identical in every scenario).", '']
md += ['| Largest differences | Ledger | Independent (ex-date shares) | Difference |', '|---|---:|---:|---:|']
for c in worst:
    md.append(f"| {c['etf']} {c['ex']} ({c['method']}) | {c['ledger']:.4f} | {c['independent']:.4f} | {sp(c['relDiff'], 2)} |")
md += ['', 'The three VOOG 2016 amounts the ledger marks "estimated" are replaced by the independently observed amounts (PROTOCOL §15.3):', '']
md += ['| Ex-date | Ledger estimate | Independent (Yahoo, per current share) | Used (ex-date shares) |', '|---|---:|---:|---:|']
for r in d['replaced']:
    md.append(f"| {r['etf']} {r['ex']} | {r['ledgerEstimate']:.4f} | {r['independentYahooAdjusted']:.6f} | {r['independent']:.4f} |")
md += ['', f"Unverified amounts: {'none (no bound needed)' if d['unverifiedBound'] is None else 'see the record'}.", '']

md += ['## C. Overlay reconciliation (CPU reference replay = the sealed figures, to the cent)', '']
md += ['| Overlay | Replay net | Replay DD | Sealed net | Sealed DD | Equal |', '|---|---:|---:|---:|---:|:---:|']
for r in P['reconciliation']:
    s = r.get('sealed') or {}
    g = r.get('sealedGpu') or {}
    md.append(f"| `{r['subject']}` | {r['cpuNet']:,.2f} | {r['cpuDd']:,.2f} | {(s.get('net') or g.get('wholeNet')):,.2f} | {(s.get('dd') or g.get('wholeDd')):,.2f} | {'✓' if r['equal'] else '✗'} |")
md += ['', 'N/original and New L0 are replayed on their own VGT/GDX door against their sealed FULL figures; every GDX-only overlay against its sealed GPU validation record (whole-run net and DD).', '']


def table_main(lev, variant, keys, title):
    out = [title, '']
    out += ['| Scenario | Terminal wealth | Incremental vs core | Δ terminal vs N/original | Max marked DD | % of peak | Peak → trough → recovery (sessions) | Δ DD vs N/original | Dev max DD | Val max DD | Max debt | Max LTV | Min headroom 30 % | Min headroom concentrated | Interest on negative overlay cash |',
            '|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    n1 = res('S1', lev, variant)
    for k in keys:
        r = res(k, lev, variant)
        f = r['full']
        dd = f['maxDrawdown']
        mg = {x['requirement']: x for x in r['margin']}
        h30 = [x for x in r['margin'] if x['requirement'].startswith('30')][0]
        hc = [x for x in r['margin'] if 'concentrated' in x['requirement']][0]
        out.append(f"| {name(subj[k])} | {m(f['endEquity'])} | {m(f['incrementalVsCore'] or 0)} | {m(f['endEquity'] - n1['full']['endEquity'], True) if k != 'S1' else '—'} | "
                   f"{m(dd['dd'])} | {pct(dd['pct'])} | {dd['peak']} → {dd['trough']} → {dd['recovery'] or 'not recovered'} ({dd['sessions']}) | "
                   f"{m(dd['dd'] - n1['full']['maxDrawdown']['dd'], True) if k != 'S1' else '—'} | {m(r['development']['maxDrawdown']['dd'])} | {m(r['validation']['maxDrawdown']['dd'])} | "
                   f"{m(f['maxDebt'])} | {pct(f['maxLtv'])} | {m(h30['minHeadroom'])} ({h30['at']}) | {m(hc['minHeadroom'])} ({hc['at']}) | {m(r['negativeCashInterest'])} |")
    return out + ['']


allkeys = [s['key'] for s in subjects if s['key'] not in dup]
md += table_main(PRIMARY_CORE, PRIMARY_VARIANT, allkeys, '## D. The matched comparison — $500,000 initial core, $100,000 maximum overlay, quarterly rebalance (primary)')
md += ['"Max marked DD" is the total account\'s largest peak-to-trough decline of session-close equity over 2016-01-04 → 2026-10-30 (dollars; % of its running peak); '
       '"dev" = 2016-01-04 → 2024-12-31, "val" = 2025-01-02 → 2026-10-30 (each window\'s own running peak). Duplicated overlays (an informed population '
       'sharing an independent finalist) are listed once; the duplicate keys are named in §K. Headroom = equity − m × gross long value (illustrative).', '']

md += ['## E. Precommitted decision labels (PROTOCOL §15.8; report labels only)', '']
md += ['| Scenario | Δ terminal (full) | Δ max DD full | relative | Δ max DD development | relative | Δ max DD validation | Label |', '|---|---:|---:|---:|---:|---:|---:|---|']
for s in P['subjects']:
    k = s['key']
    if k in ('S1',) or k not in labels:
        continue
    l = labels[k]
    x = l['deltaVsNOriginal']
    md.append(f"| {name(subj[k])} | {m(x['terminalWealthFull'], True)} | {m(x['maxDdFull'], True)} | {sp(x['maxDdFullRelative'])} | {m(x['maxDdDevelopment'], True)} | {sp(x['maxDdDevelopmentRelative'])} | {m(x['maxDdValidation'], True)} | {l['label158']} |")
md += ['', f"Rule: {P['labels'][0]['rule']}. Δ = scenario − N/original: a positive Δ DD is a LARGER total-account drawdown than N/original's.", '']

lev_keys = primaries
for lev in (250000, 1000000):
    md += table_main(lev, PRIMARY_VARIANT, lev_keys, f'## F{1 if lev == 250000 else 2}. Leverage sensitivity — ${lev:,} initial core (overlay fixed at $100,000 = {100000 / lev * 100:.0f} % of the initial core)')
for v in [x for x in sorted(set(r['variant'] for r in P['results'])) if x != PRIMARY_VARIANT]:
    md += table_main(PRIMARY_CORE, v, lev_keys, f'## F{3 if "drift" in v else 4}. Convention sensitivity — {v} ($500,000 core)')

md += ['## G. Annual total-account results ($500,000 core, primary): incremental P&L vs core only, and the year\'s max DD', '']
years = [a['year'] for a in res('S0')['annual']]
md += ['| Scenario | ' + ' | '.join(years) + ' |', '|---|' + '---:|' * len(years)]
c0 = {a['year']: a for a in res('S0')['annual']}
md.append('| S0 core only: P&L (max DD) | ' + ' | '.join(f"{m(c0[y]['pnl'])} ({m(c0[y]['maxDrawdown'])}, {pct(c0[y]['maxDrawdownPct'])})" for y in years) + ' |')
for k in primaries[1:]:
    a = {x['year']: x for x in res(k)['annual']}
    md.append(f"| {name(subj[k])}: incremental (max DD) | " + ' | '.join(f"{m(a[y]['incrementalVsCore'], True)} ({m(a[y]['maxDrawdown'])})" for y in years) + ' |')
md += ['']

md += ['## H. The core\'s five worst drawdown episodes and each overlay\'s P&L inside them (overlapping episodes)', '']
eps = dec['S1']['overlayInCoreWorstEpisodes']
md += ['| Scenario | ' + ' | '.join(f"{e['peak']} → {e['trough']} (core −{m(e['dd'])[1:]}, {pct(e['pct'])})" for e in eps) + ' |', '|---|' + '---:|' * len(eps)]
for k in [x for x in allkeys if x != 'S0']:
    o = {(e['peak'], e['trough']): e['overlayPnl'] for e in dec[k]['overlayInCoreWorstEpisodes']}
    md.append(f"| {name(subj[k])} | " + ' | '.join(m(o.get((e['peak'], e['trough'])), True) for e in eps) + ' |')
md += ['', 'Each scenario\'s own worst five total-account episodes (dollars, % of peak, peak → trough → recovery):', '']
md += ['| Scenario | 1 | 2 | 3 |', '|---|---|---|---|']
for k in primaries:
    w = res(k)['worstEpisodes'][:3]
    md.append(f"| {name(subj[k])} | " + ' | '.join(f"{m(e['dd'])} ({pct(e['pct'])}) {e['peak']} → {e['trough']} → {e['recovery'] or 'open'}" for e in w) + ' |')
md += ['']

md += ['## I. Trading sleeve: absolute and time-in-market normalized (full 2016-01-04 → 2026-10-30)', '']
gb = {r['label']: r for r in LOTS['rows']}
md += ['| Scenario | Net | Dev net | Val net | Minute DD | Lots (by symbol) | Worst lot | Occupancy | Principal-days ($·days) | Net per $100k-year | Net per borrowing-$-day | Giveback total / max lot | Funding refusals (by occupant) |',
       '|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|']
for k in [x for x in allkeys if x != 'S0']:
    s = dec[k]['sleeve']
    g = gb.get(subj[k]['label'])
    by = ', '.join(f'{a} {b}' for a, b in s['lotsBySymbol'].items())
    # GDX-only overlays trade in the engine's VGT-named slot (it carries GDX): name their books by what they hold
    slot = (lambda t: t) if k in ('S1', 'S2') else (lambda t: t.replace('D1:VGT', 'D1·GDX').replace('G:VGT', 'Growth·GDX'))
    ref = '; '.join(f'{slot(a)}: {b}' for a, b in s['funding']['byOccupant'].items()) or '0'
    md.append(f"| {name(subj[k])} | {m(s['net'])} | {m(s['developmentNet'])} | {m(s['validationNet'])} | {m(s['minuteDd'])} | {s['lots']} ({by}) | {m(s['worstLot'])} | {pct(s['occupancy'])} | "
              f"{s['principalDays']:,.0f} | {m(s['netPer100kYear'])} | ${s['netPerBorrowingDollarDay']:.4f} | {(m(g['giveback']['total']) + ' / ' + m(g['giveback']['max'])) if g else '—'} | {ref} |")
md += ['', 'Giveback = Σ over lots of (the lot\'s best mark − its final net), from the CPU lot replays (`reports/diagnostics/lots.json`; N/original and New L0: their own committed per-lot ledgers, not replayed here). '
       'Worst lot = the most negative realized lot net. Net per borrowing-$-day = net ÷ Σ (outstanding principal × calendar days).', '']

md += ['## J. Exposure, correlation and the technology share', '']
md += ['| Scenario | Corr. with core (all sessions) | Corr. (sessions with a lot) | Beta to core | Mean tech share of gross | Max tech share | Mean GDX share | Sessions with a VGT lot | Sessions with a GDX lot | Mean core DD on VGT-lot sessions | Mean core DD on GDX-lot sessions |',
       '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for k in [x for x in allkeys if x != 'S0']:
    c = dec[k]['correlation']
    e = dec[k]['exposure']
    v = e['coreDrawdownOnVgtLotSessions']
    g = e['coreDrawdownOnGdxLotSessions']
    md.append(f"| {name(subj[k])} | {c['allSessions']['corr']:.3f} | {c['sessionsWithAnOpenLot']['corr']:.3f} | {c['allSessions']['beta']:.4f} | {pct(e['meanTechShareOfGross'])} | {pct(e['maxTechShareOfGross'])} | {pct(e['meanGdxShareOfGross'], 2)} | "
              f"{e['vgtLotSessions']:,} | {e['gdxLotSessions']:,} | {m(v['mean']) if v else '—'} | {m(g['mean']) if g else '—'} |")
md += ['', f"Basis: {dec['S1']['correlation']['basis']}. Technology share = (VGT core + VGT overlay lot) ÷ gross long value; VOOG is reported apart (a broad US growth fund with a large technology weight), never assumed non-technology.", '']

md += ['## K. Quarters of strongest VGT / GDX divergence: the overlay\'s P&L', '']
qs = dec['S1']['divergenceQuarters']
md += ['| Scenario | ' + ' | '.join(f"{q['quarter']} (VGT {sp(q['vgt'], 0)}, GDX {sp(q['gdx'], 0)})" for q in qs) + ' |', '|---|' + '---:|' * len(qs)]
for k in [x for x in allkeys if x != 'S0']:
    o = {q['quarter']: q['overlayPnl'] for q in dec[k]['divergenceQuarters']}
    md.append(f"| {name(subj[k])} | " + ' | '.join(m(o.get(q['quarter']), True) for q in qs) + ' |')
md += ['', f"Core-only P&L in those quarters: " + '; '.join(f"{q['quarter']} {m(q['corePnl'], True)}" for q in qs) + '.', '']
if dup:
    md += ['Duplicate overlays (identical configuration under an informed population): ' + '; '.join(f'{a} = {b}' for a, b in dup.items()) + '.', '']

md += ['## L. HYPOTHETICAL instantaneous stresses (not historical observations; margin figures illustrative)', '']
md += ['Shocks (PROTOCOL §15.6): technology decline VGT −30 %, VOOG −20 %, GDX −10 %; broad equity crash VOOG −30 %, VGT −35 %, GDX −25 %; gold-miner selloff GDX −40 %, core 0 %; combined VOOG −30 %, VGT −35 %, GDX −40 %. '
       'Applied at the close of the scenario\'s maximum overlay value and at the close of its maximum debt; the loss applies to every holding (core and overlay lot).', '']
md += ['| Scenario | Point | Date | Equity before | Tech decline loss (% eq.) | Broad crash | Gold-miner selloff | Combined | Headroom 25 % after combined | Headroom 40 % after combined |', '|---|---|---|---:|---:|---:|---:|---:|---:|---:|']
for k in [x for x in allkeys if x != 'S0']:
    for pt in ('atMaximumOverlayValue', 'atMaximumDebt'):
        h = dec[k]['hypotheticalStress'][pt]
        md.append(f"| {name(subj[k])} | {pt} | {h['combined']['at']} | {m(h['combined']['equityBefore'])} | " +
                  ' | '.join(f"{m(h[s]['loss'])} ({pct(h[s]['lossPctOfEquity'])})" for s in ('technologyDecline', 'broadEquityCrash', 'goldMinerSelloff', 'combined')) +
                  f" | {m(h['combined']['headroom25AfterShock'])} | {m(h['combined']['headroom40AfterShock'])} |")
md += ['']

md += ['## M. Distributions the overlay lots would have been entitled to (report-only, PROTOCOL §15.7; never added to the trading results)', '']
md += ['| Scenario | Lot ex-date events | Total cash |', '|---|---:|---:|']
for k in [x for x in allkeys if x != 'S0']:
    ld = dec[k]['lotDistributions']
    md.append(f"| {name(subj[k])} | {len(ld['rows'])} | {m(ld['total'])} |")
md += ['']

a = P['ablationChronology']
md += ['## N. The ablation against N/original\'s own GDX D1 book', '']
md += [f"N/original funded {a['nOriginalGdxD1Lots']} GDX D1 lots (net {m(a['nOriginalGdxD1Net'])}); the ablation (both VGT books disabled) funded {a['ablationLots']} (net {m(a['ablationNet'])}). "
       f"{a['sameEntryDateAndNet']} lots are identical (same entry date and net); {a['onlyInAblation']['lots']} lots exist only in the ablation (net {m(a['onlyInAblation']['net'])}); "
       f"{a['onlyInNOriginal']['lots']} only in N/original. N/original's GDX D1 refusals: " + '; '.join(f'{x}: {y}' for x, y in a['nOriginalRefusals'].items()) + f". {a['note']}.", '']
md += ['| Lot only in the ablation: entry → exit | Net |', '|---|---:|']
for e in a['onlyInAblation']['entries']:
    md.append(f"| {e['entry']} → {e['exit']} | {m(e['net'])} |")
md += ['']

narr = open(NARR, encoding='utf-8').read().rstrip() if os.path.exists(NARR) else '# Matched total-portfolio comparison\n\n_(narrative pending)_'
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(narr + '\n\n---\n\n_Sections A–N below are generated by `tools/gdx-d1-growth/portfolio-md.py` from `reports/portfolio/portfolio.json` (report-only; no evaluation)._\n\n' + '\n'.join(md) + '\n')
print(f'wrote {OUT} ({len(md)} generated lines)')
