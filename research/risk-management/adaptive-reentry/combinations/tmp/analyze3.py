"""Family G analysis pass 3: A2-vs-D7 episode cells, guard distances, named edge episodes."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parents[1]
RES = HERE / 'results'
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
from engine import load  # noqa: E402

DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
pd.set_option('display.width', 250)


def tr(ds, c):
    return pd.read_csv(RES / 'trades' / f'{ds}__{c}.csv')


def ev(ds, c):
    return pd.read_csv(RES / 'events' / f'{ds}__{c}.csv')


# ---- 1) A2-vs-D7 2x2 classification of REF_lower3 armed episodes ----
print('=' * 120)
print('A2m1 vs D7tiny episode cells, from REF_lower3 events (tiny = |net loss| < $2,000; material = price return <= -1%)')
for ds in DS:
    e = ev(ds, 'REF_lower3')
    tiny = e['loss'].abs() < 2000.0
    mat = e['price_return'] <= -0.01
    print(f'\n--- {ds}: {len(e)} armed episodes ---')
    print(f'tiny & immaterial (A2: no arm | D7: exit anchor): {int((tiny & ~mat).sum())}')
    print(f'tiny & material   (A2: full 3% | D7: exit anchor): {int((tiny & mat).sum())}')
    print(f'big  & immaterial (A2: no arm | D7: full 3%):      {int((~tiny & ~mat).sum())}')
    print(f'big  & material   (identical: full 3%):            {int((~tiny & mat).sum())}')
    sub = e[tiny & mat]
    if len(sub):
        print('tiny&material episodes (divergent cell #1):')
        print(sub[['exit_date', 'loss', 'price_return', 'loss_exit_price']].to_string(index=False))
    sub = e[~tiny & ~mat]
    if len(sub):
        print('big&immaterial episodes (divergent cell #2):')
        print(sub[['exit_date', 'loss', 'price_return', 'loss_exit_price']].to_string(index=False))

# ---- 2) G9a guard: distance of every realized C6r38 reset above the guard level ----
print('\n' + '=' * 120)
print('G9a guard analysis: close at each G_C6r38 recovery reset vs guard level (0.9894 * loss exit price)')
for ds in DS:
    e = ev(ds, 'G_C6r38')
    df = load(ds)
    c = df['close'].to_numpy()
    dates = df['date'].astype(str).str[:10].to_numpy()
    resets = e[e['resolution'] == 'recovery_reset']
    rows = []
    for _, r in resets.iterrows():
        ri = int(np.flatnonzero(dates == r['resolution_date'])[0])
        guard = 0.97 * 1.02 * r['loss_exit_price']
        rows.append(dict(reset_date=r['resolution_date'], close=c[ri], exit_price=r['loss_exit_price'],
                         guard_level=round(guard, 4), close_over_guard=round(c[ri] / guard - 1, 4)))
    t = pd.DataFrame(rows)
    nbind = int((t['close_over_guard'] <= 0).sum()) if len(t) else 0
    print(f'\n--- {ds}: {len(t)} resets, guard-bound: {nbind}, min distance above guard: '
          f'{t["close_over_guard"].min() if len(t) else float("nan"):.4f}')
    print(t.to_string(index=False))

# reset_priority_blocks counters for C6-based configs
recs = json.load(open(RES / 'summary.json'))
R = {(r['dataset'], r['config']): r for r in recs}
print('\nreset_priority_blocks (reset fired at the entry gate on a signal session):')
for cfg in ['G_C6r38', 'G9a_retrace_guard', 'G9b_exitreset_guard', 'REF_lower3']:
    print(f'{cfg:22s} ' + '  '.join(f'{ds}:{R[(ds, cfg)]["extra"]["state_machine"]["reset_priority_blocks"]}' for ds in DS))

# ---- 3) C11's VGT-old edge episodes (G_C11grad vs REF divergence) ----
print('\n' + '=' * 120)
ta, tb = tr('VGT_2005_2015', 'G_C11grad'), tr('VGT_2005_2015', 'REF_lower3')
print('G_C11grad vs REF_lower3 VGT-old trades (full):')
cols = ['entry_date', 'exit_date', 'profit', 'reason']
m = pd.merge(ta[cols], tb[cols], on='entry_date', how='outer', suffixes=('_C11', '_REF'), sort=True)
print(m.to_string(index=False))

# ---- 4) G8 QQQ-old 2002-2003 trades (does it catch Oct-2002 / spring 2003?) ----
print('\n' + '=' * 120)
t8 = tr('QQQ_1999_2015', 'G8_A2m1_retrace')
t8m = t8[(t8['entry_date'] >= '2002-01-01') & (t8['entry_date'] <= '2003-12-31')]
print('G8_A2m1_retrace QQQ-old trades 2002-2003:')
print(t8m[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))
t4 = tr('QQQ_1999_2015', 'G4_A2m1_stall')
t4m = t4[(t4['entry_date'] >= '2002-01-01') & (t4['entry_date'] <= '2003-12-31')]
print('G4_A2m1_stall QQQ-old trades 2002-2003:')
print(t4m[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))

# ---- 5) G3 QQQ-new 2022 cascade: trades + events ----
print('\n' + '=' * 120)
t3 = tr('QQQ_2016_2026', 'G3_tiny_retrace')
t3m = t3[(t3['entry_date'] >= '2022-01-01') & (t3['entry_date'] <= '2022-12-31')]
print('G3_tiny_retrace QQQ-new 2022 trades:')
print(t3m[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))
e3 = ev('QQQ_2016_2026', 'G3_tiny_retrace')
e3m = e3[(e3['exit_date'] >= '2022-01-01') & (e3['exit_date'] <= '2022-12-31')]
print('G3 2022 episodes:')
print(e3m[['exit_date', 'loss', 'price_return', 'loss_exit_price', 'ref_high', 'resolution', 'resolution_date',
           'reentry_date', 'reentry_vs_loss_exit', 'min_close_in_episode']].to_string(index=False))

# ---- 6) G2 QQQ-new stall-decay interference episode ----
print('\n' + '=' * 120)
e2 = ev('QQQ_2016_2026', 'G2_tiny_stall')
e2m = e2[(e2['exit_date'] >= '2022-05-01') & (e2['exit_date'] <= '2022-12-31')]
print('G2_tiny_stall QQQ-new episodes mid/late 2022:')
print(e2m[['exit_date', 'loss', 'price_return', 'loss_exit_price', 'resolution', 'resolution_date',
           'reentry_date', 'reentry_close', 'required_level_at_entry', 'min_close_in_episode']].to_string(index=False))
