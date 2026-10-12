"""Family G analysis pass 1: metric tables, window tables, control comparisons, identity checks."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parents[1]
RES = HERE / 'results'
recs = json.load(open(RES / 'summary.json'))
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CFG = ['REF_lower3', 'G_A2m1', 'G_D7tiny', 'G_B7stall', 'G_B2inv', 'G_C6r38', 'G_C11grad',
       'G2_tiny_stall', 'G3_tiny_retrace', 'G4_A2m1_stall', 'G5_tiny_stall_retrace',
       'G6_stall_grad', 'G7_tiny_grad', 'G8_A2m1_retrace', 'G9a_retrace_guard',
       'G9b_exitreset_guard', 'G10_bimodal']

R = {(r['dataset'], r['config']): r for r in recs}

print('=' * 140)
print('FULL METRICS per dataset/config')
for ds in DS:
    print(f'\n--- {ds} ---')
    rows = []
    for c in CFG:
        r = R[(ds, c)]
        m, e = r['metrics'], r['extra']
        sm = e['state_machine']
        mc, ml = r['matched_control'], r['matched_lower3_control']
        rows.append(dict(
            config=c, net=round(m['net_profit']), mdd=round(m['max_drawdown']),
            pdd=round(m['profit_to_drawdown'], 2) if m['profit_to_drawdown'] is not None else None,
            tr=m['closed_trades'], W=m['winning_trades'], L=m['losing_trades'],
            blk=sm['blocked_sessions'], low=sm['lower_price_reentries'], alt=sm['alt_entries'],
            rst=sm['recovery_resets'], fRst=sm['false_resets'],
            vsBase_net=round(e['vs_reference']['net_vs_baseline']),
            vsL3_net=round(e['vs_reference']['net_vs_lower3']),
            vsL3_mdd=round(e['vs_reference']['mdd_vs_lower3']),
            mCtl_dNet=round(mc['profit_difference']), mCtl_dMdd=round(mc['drawdown_difference']),
            mL3_dNet=round(ml['profit_difference']), mL3_dMdd=round(ml['drawdown_difference'])))
    print(pd.DataFrame(rows).to_string(index=False))

print('\n' + '=' * 140)
print('BEAR WINDOWS (pnl / max_drawdown within window)')
for ds in DS:
    print(f'\n--- {ds} ---')
    rows = []
    for c in CFG:
        m = R[(ds, c)]['metrics']
        row = dict(config=c)
        for w, s in (m.get('bear_windows') or {}).items():
            row[f'{w}_pnl'] = round(s['pnl'])
            row[f'{w}_mdd'] = round(s['max_drawdown'])
            row[f'{w}_losers'] = s['losing_trades']
        rows.append(row)
    print(pd.DataFrame(rows).to_string(index=False))

print('\n' + '=' * 140)
print('RECOVERY WINDOWS (pnl)')
for ds in DS:
    print(f'\n--- {ds} ---')
    rows = []
    for c in CFG:
        e = R[(ds, c)]['extra']
        row = dict(config=c)
        for w, s in (e.get('recovery_windows_ext') or {}).items():
            row[w] = round(s['pnl'])
        rows.append(row)
    print(pd.DataFrame(rows).to_string(index=False))

print('\n' + '=' * 140)
print('TRADE-IDENTITY CHECKS (exact trades CSV equality)')
import numpy as np


def trades_equal(ds, a, b):
    ta = pd.read_csv(RES / 'trades' / f'{ds}__{a}.csv')
    tb = pd.read_csv(RES / 'trades' / f'{ds}__{b}.csv')
    if len(ta) != len(tb):
        return f'DIFFER (n {len(ta)} vs {len(tb)})'
    for col in ['entry_date', 'exit_date']:
        if not (ta[col].astype(str) == tb[col].astype(str)).all():
            return 'DIFFER (dates)'
    if not np.allclose(ta['profit'], tb['profit'], atol=1e-6):
        return 'DIFFER (profit)'
    return 'IDENTICAL'


pairs = [('G9a_retrace_guard', 'G_C6r38'), ('G5_tiny_stall_retrace', 'G3_tiny_retrace'),
         ('G6_stall_grad', 'G_C11grad'), ('G2_tiny_stall', 'G_D7tiny'),
         ('G4_A2m1_stall', 'G_A2m1'), ('G_B7stall', 'REF_lower3'), ('G_C11grad', 'REF_lower3'),
         ('G7_tiny_grad', 'G_D7tiny'), ('G10_bimodal', 'G_D7tiny'), ('G8_A2m1_retrace', 'G_A2m1'),
         ('G3_tiny_retrace', 'G_D7tiny')]
for a, b in pairs:
    print(f'{a:24s} vs {b:16s}: ' + '  '.join(f'{ds.split("_")[0]}{ds.split("_")[1][2:]}-{ds.split("_")[2][2:]}:{trades_equal(ds, a, b)}' for ds in DS))

# G9b vs family C's C2_exit_price (cross-family)
CRES = HERE.parent / 'recovery-resets' / 'results'


def cross_equal(ds):
    ta = pd.read_csv(RES / 'trades' / f'{ds}__G9b_exitreset_guard.csv')
    tb = pd.read_csv(CRES / 'trades' / f'{ds}__C2_exit_price.csv')
    if len(ta) != len(tb):
        return f'DIFFER (n {len(ta)} vs {len(tb)})'
    ok = (ta['entry_date'].astype(str) == tb['entry_date'].astype(str)).all() and np.allclose(ta['profit'], tb['profit'], atol=1e-6)
    return 'IDENTICAL' if ok else 'DIFFER'


print('\nG9b_exitreset_guard vs Family C C2_exit_price: ' + '  '.join(f'{ds}:{cross_equal(ds)}' for ds in DS))
