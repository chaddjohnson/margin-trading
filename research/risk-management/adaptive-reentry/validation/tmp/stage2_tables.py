"""Stage-2 analysis digest: sensitivity tables (task 2) + fresh-instrument tables (task 3).
Writes tmp/stage2_tables.txt. Also performs the center-point cross-checks (grid centers must equal
the combinations G8/G4 trades) and the G4-collapse test (per grid point: trades identical to
combinations G_A2m1?)."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parents[1]
AR = HERE.parent
S2 = json.load(open(HERE / 'results' / 'stage2' / 'results' / 'summary.json'))
FRESH2 = json.load(open(HERE / 'results' / 'stage2' / 'fresh' / 'summary.json'))
FRESH1 = json.load(open(HERE / 'results' / 'fresh' / 'summary.json'))
COMBJ = json.load(open(AR / 'combinations' / 'results' / 'summary.json'))
DATASETS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
out = []


def say(s=''):
    out.append(s)
    print(s)


def rec2(ds, cfg):
    for r in S2:
        if r['dataset'] == ds and r['config'] == cfg:
            return r
    raise KeyError((ds, cfg))


def comb(ds, cfg):
    for r in COMBJ:
        if r['dataset'] == ds and r['config'] == cfg:
            return r
    raise KeyError((ds, cfg))


def trades_equal(a, b):
    ta, tb = pd.read_csv(a), pd.read_csv(b)
    if len(ta) != len(tb):
        return False
    for col in ['entry_i', 'entry_date', 'exit_date', 'reason']:
        if not (ta[col].astype(str).fillna('') == tb[col].astype(str).fillna('')).all():
            return False
    for col in ['entry_price', 'exit_price', 'profit']:
        if (abs(ta[col].astype(float) - tb[col].astype(float)) > 1e-6).any():
            return False
    return True


T2 = HERE / 'results' / 'stage2' / 'results' / 'trades'
TC = AR / 'combinations' / 'results' / 'trades'

# ---------------------------------------------------------------- center cross-checks
say('## Center-point cross-checks (trade-for-trade vs combinations results)')
for ds in DATASETS:
    ok8 = trades_equal(T2 / f'{ds}__V2_G8_c100_r38.csv', TC / f'{ds}__G8_A2m1_retrace.csv')
    ok4 = trades_equal(T2 / f'{ds}__V2_G4_a20_d60.csv', TC / f'{ds}__G4_A2m1_stall.csv')
    say(f'  {ds:14s}  V2_G8_c100_r38 == G8: {ok8}   V2_G4_a20_d60 == G4: {ok4}')

# ---------------------------------------------------------------- G8 grid
say('\n## G8 grid (A2 cutoff x retrace fraction) — net / DD per dataset')
CUTS = ['050', '100', '150']
FRACS = ['30', '34', '38', '42', '46', '50']
for ds in DATASETS:
    say(f'\n### {ds}')
    say('| cutoff \\ f | ' + ' | '.join(FRACS) + ' |')
    say('|---' * 7 + '|')
    for cu in CUTS:
        cells = []
        for fr in FRACS:
            m = rec2(ds, f'V2_G8_c{cu}_r{fr}')['metrics']
            cells.append(f"{m['net_profit']:,.0f}/{m['max_drawdown']:,.0f}")
        say(f'| -{int(cu)/100:.1f}% | ' + ' | '.join(cells) + ' |')

say('\n## G8 grid — key windows')
say('QQQ_1999_2015: 2000-2002 window pnl | 2003 window pnl | resets | false resets')
for cu in CUTS:
    row = []
    for fr in FRACS:
        r = rec2('QQQ_1999_2015', f'V2_G8_c{cu}_r{fr}')
        w0 = r['metrics']['bear_windows']['2000-2002']['pnl']
        w3 = r['metrics']['recovery_windows']['2003']['pnl']
        sm = r['extra']['state_machine']
        row.append(f'{w0:,.0f}|{w3:,.0f}|{sm["recovery_resets"]}|{sm["false_resets"]}')
    say(f'  -{int(cu)/100:.1f}%: ' + '   '.join(row))
say('\nQQQ_2016_2026: 2022 window pnl | window DD | resets | false resets')
for cu in CUTS:
    row = []
    for fr in FRACS:
        r = rec2('QQQ_2016_2026', f'V2_G8_c{cu}_r{fr}')
        w = r['metrics']['bear_windows']['2022']
        sm = r['extra']['state_machine']
        row.append(f'{w["pnl"]:,.0f}|{w["max_drawdown"]:,.0f}|{sm["recovery_resets"]}|{sm["false_resets"]}')
    say(f'  -{int(cu)/100:.1f}%: ' + '   '.join(row))
say('\nVGT_2016_2026: 2022 window pnl / 2023 / 2026 window pnl')
for cu in CUTS:
    row = []
    for fr in FRACS:
        r = rec2('VGT_2016_2026', f'V2_G8_c{cu}_r{fr}')
        w22 = r['metrics']['bear_windows']['2022']['pnl']
        w23 = r['metrics']['recovery_windows']['2023']['pnl']
        w26 = r['extra']['recovery_windows_ext'].get('2026', {}).get('pnl', float('nan'))
        row.append(f'{w22:,.0f}/{w23:,.0f}/{w26:,.0f}')
    say(f'  -{int(cu)/100:.1f}%: ' + '   '.join(row))

# vs the legs on the frozen datasets (cited from combinations summary)
say('\n## Frozen-dataset reference (combinations results, cited): net/DD')
for cfg in ['G8_A2m1_retrace', 'G4_A2m1_stall', 'G_A2m1', 'G_C6r38', 'G_B7stall', 'REF_lower3']:
    row = [f"{comb(ds, cfg)['metrics']['net_profit']:,.0f}/{comb(ds, cfg)['metrics']['max_drawdown']:,.0f}"
           for ds in DATASETS]
    say(f'  {cfg:16s}: ' + ' | '.join(row))

# ---------------------------------------------------------------- G4 grid
say('\n## G4 grid (stall fresh_age x decay, cutoff -1%) — net / DD per dataset, and == G_A2m1?')
AGES = [15, 20, 25, 30]
DECAYS = [40, 60, 80]
for ds in DATASETS:
    say(f'\n### {ds}  (G_A2m1 = {comb(ds, "G_A2m1")["metrics"]["net_profit"]:,.0f}/'
        f'{comb(ds, "G_A2m1")["metrics"]["max_drawdown"]:,.0f})')
    say('| age \\ decay | ' + ' | '.join(str(d) for d in DECAYS) + ' |')
    say('|---' * 4 + '|')
    for a in AGES:
        cells = []
        for d in DECAYS:
            name = f'V2_G4_a{a}_d{d}'
            m = rec2(ds, name)['metrics']
            eq = trades_equal(T2 / f'{ds}__{name}.csv', TC / f'{ds}__G_A2m1.csv')
            cells.append(f"{m['net_profit']:,.0f}/{m['max_drawdown']:,.0f}{' =A2m1' if eq else ''}")
        say(f'| {a} | ' + ' | '.join(cells) + ' |')

say('\n## G4 grid — QQQ_1999_2015 Oct-2002 chain: is the 2002-10-07 entry present? 2000-02 window')
for a in AGES:
    row = []
    for d in DECAYS:
        name = f'V2_G4_a{a}_d{d}'
        tr = pd.read_csv(T2 / f'QQQ_1999_2015__{name}.csv')
        has = (tr['entry_date'] == '2002-10-07').any()
        w0 = rec2('QQQ_1999_2015', name)['metrics']['bear_windows']['2000-2002']['pnl']
        row.append(f'd{d}:{"Y" if has else "n"}|{w0:,.0f}')
    say(f'  age {a}: ' + '   '.join(row))

# ---------------------------------------------------------------- fresh instruments
say('\n## Fresh instruments — stage-2 candidates vs baseline, REF_lower3 and legs (stage-1 reused)')
INSTS = ['QLD', 'SOXX', 'VOOG', 'SPY', 'XLK', 'IWM']


def f1(inst, cfg):
    for r in FRESH1:
        if r['instrument'] == inst and r['config'] == cfg:
            return r
    raise KeyError((inst, cfg))


def f2(inst, cfg):
    for r in FRESH2:
        if r['instrument'] == inst and r['config'] == cfg:
            return r
    raise KeyError((inst, cfg))


for inst in INSTS:
    say(f'\n### {inst}')
    say('| config | net | DD | P/DD | tr | vs REF net | vs REF DD | matched ctl Δnet/Δdd |')
    say('|---|---|---|---|---|---|---|---|')
    ref = f1(inst, 'REF_lower3')['metrics']
    for cfg, src in [('baseline', 'f1'), ('REF_lower3', 'f1'), ('A2_material_1', 'f1'),
                     ('A2_material_05', 'f1'), ('C6_retrace_38', 'f1'), ('B7_stall', 'f1'),
                     ('G8_A2m1_retrace', 'f2'), ('G4_A2m1_stall', 'f2')]:
        r = f1(inst, cfg) if src == 'f1' else f2(inst, cfg)
        m = r['metrics']
        pdd = m['net_profit'] / m['max_drawdown'] if m['max_drawdown'] > 0 else float('nan')
        if cfg == 'baseline':
            say(f"| {cfg} | {m['net_profit']:,.0f} | {m['max_drawdown']:,.0f} | {pdd:.2f} | "
                f"{m['closed_trades']} | — | — | — |")
            continue
        mc = r['matched_control']
        say(f"| {cfg} | {m['net_profit']:,.0f} | {m['max_drawdown']:,.0f} | {pdd:.2f} | "
            f"{m['closed_trades']} | {m['net_profit'] - ref['net_profit']:+,.0f} | "
            f"{m['max_drawdown'] - ref['max_drawdown']:+,.0f} | "
            f"{mc['profit_difference']:+,.0f}/{mc['drawdown_difference']:+,.0f} |")

say('\n## Fresh: G8/G4 vs their legs (net deltas; + = combo better)')
say('| inst | G8−A2m1 | G8−C6r38 | G8 beats both legs? | G4−A2m1 | G4−B7 | G4==A2m1 trades? |')
say('|---|---|---|---|---|---|---|')
T2F = HERE / 'results' / 'stage2' / 'fresh' / 'trades'
T1F = HERE / 'results' / 'fresh' / 'trades'
for inst in INSTS:
    g8 = f2(inst, 'G8_A2m1_retrace')['metrics']['net_profit']
    g4 = f2(inst, 'G4_A2m1_stall')['metrics']['net_profit']
    a2 = f1(inst, 'A2_material_1')['metrics']['net_profit']
    c6 = f1(inst, 'C6_retrace_38')['metrics']['net_profit']
    b7 = f1(inst, 'B7_stall')['metrics']['net_profit']
    eq = trades_equal(T2F / f'{inst}__G4_A2m1_stall.csv', T1F / f'{inst}__A2_material_1.csv')
    say(f'| {inst} | {g8 - a2:+,.0f} | {g8 - c6:+,.0f} | {"YES" if g8 > a2 and g8 > c6 else "no"} | '
        f'{g4 - a2:+,.0f} | {g4 - b7:+,.0f} | {"YES" if eq else "no"} |')

say('\n## Fresh: 2022 window pnl (grind tax) and 2008 window where covered')
for inst in INSTS:
    r8, r4 = f2(inst, 'G8_A2m1_retrace'), f2(inst, 'G4_A2m1_stall')
    ref, a2, c6 = f1(inst, 'REF_lower3'), f1(inst, 'A2_material_1'), f1(inst, 'C6_retrace_38')

    def w(r, key):
        bw = r['metrics'].get('bear_windows', {})
        return f"{bw[key]['pnl']:,.0f}" if key in bw else 'n/a'
    say(f'  {inst:5s} 2022: REF {w(ref, "2022")}  A2m1 {w(a2, "2022")}  C6 {w(c6, "2022")}  '
        f'G8 {w(r8, "2022")}  G4 {w(r4, "2022")}   | 2007-09: REF {w(ref, "2007-2009")}  '
        f'A2m1 {w(a2, "2007-2009")}  C6 {w(c6, "2007-2009")}  G8 {w(r8, "2007-2009")}  G4 {w(r4, "2007-2009")}')

(Path(__file__).parent / 'stage2_tables.txt').write_text('\n'.join(out) + '\n')
print('\nwrote tmp/stage2_tables.txt')
