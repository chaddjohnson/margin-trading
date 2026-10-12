"""Spot-check Family E episodes against raw price files (no engine, no framework).

SC1  QQQ 2000-04-14: E1 vs E2 anchor divergence (deep loss; E2 re-enters ABOVE the loss exit).
SC2  QQQ 2001 Feb-Apr: E3 ladder levels off the correction first entry and the 15% rebound reset.
SC3  QQQ 2008-11-24: E4 discount saturation at 8%, the missed 2009-03-06 entry, the 2009-12-24 reset.
SC4  VGT 2023-01 (E1 blocked / E2 captured) and VGT 2020-03 closes around both anchors' levels.
SC5  E5 streak arithmetic (QQQ 2024-09 -> 2025-04; VGT 2026-02-05) from the trades files.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[5]
RES = Path(__file__).resolve().parents[1] / 'results'


def px(file):
    df = pd.read_csv(REPO / file, sep='|', header=None,
                     names=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = df['date'].astype(str).str[:10]
    return df.set_index('date')

qqq = px('data/QQQ/QQQ-1999-2015.csv')
vgt = px('data/VGT/VGT-2016-2026.csv')
ok = []


def check(label, cond, detail=''):
    ok.append(bool(cond))
    print(f"[{'OK ' if cond else 'FAIL'}] {label} {detail}")


print('--- SC1: QQQ 2000-04-14 episode, E1 vs E2 anchors ---')
exit_p, entry_p = 72.9691, 90.9244
lvl1, lvl2 = exit_p * 0.97, entry_p * 0.97
check('E1 level 70.7800', abs(lvl1 - 70.780027) < 1e-4, f'{lvl1:.6f}')
check('E2 level 88.1967', abs(lvl2 - 88.196668) < 1e-4, f'{lvl2:.6f}')
c0417 = qqq.loc['2000-04-17', 'close']
check('2000-04-17 close 75.989 <= E2 level AND > exit price (re-entry ABOVE the loss exit)',
      c0417 <= lvl2 and c0417 > exit_p, f'close={c0417}')
seg = qqq.loc['2000-04-17':'2000-05-10', 'close']
check('no close in 04-17..05-09 at/below E1 level; 05-10 first <= 70.78',
      (seg.iloc[:-1] > lvl1).all() and seg.iloc[-1] <= lvl1, f'min before={seg.iloc[:-1].min():.4f}, 05-10={seg.iloc[-1]}')
# E1 blocked signal sessions: every close in between is also well below 0.95*ref_high (no reset)
check('no reset possible (max close << 0.95*102.191=97.08)', seg.max() < 0.95 * 102.191, f'max={seg.max():.4f}')

print('\n--- SC2: QQQ 2001 E3 ladder + 15% rebound reset ---')
first_entry = 56.8070
for n, lvl_logged in [(1, 55.102790), (2, 53.398580), (3, 51.694370), (4, 49.990160)]:
    lvl = first_entry * (1 - 0.03 * n)
    check(f'ladder n={n}: {lvl:.6f}', abs(lvl - lvl_logged) < 1e-4)
# 2001-04-04 (n=4) resolved by re-entry 2001-04-05 at 31.63, far below the stale ladder level 49.99:
ev3 = pd.read_csv(RES / 'events' / 'QQQ_1999_2015__E3_entry_count.csv')
epi = ev3[ev3['exit_date'] == '2001-04-04'].iloc[0]
check('E3 2001-04-04 (n=4) resolved by NEXT-SESSION re-entry at 31.63 << level 49.99 (stale-high ladder)',
      epi['resolution'] == 'lower_price_reentry' and epi['resolution_date'] == '2001-04-05'
      and abs(epi['reentry_close'] - 31.6279) < 1e-4 and abs(epi['required_level_at_entry'] - 49.990160) < 1e-4)
# A genuine E3 rebound reset: exit 2003-03-05 at 20.6819, reset logged 2003-04-22.
epi = ev3[ev3['exit_date'] == '2003-03-05'].iloc[0]
c = qqq.loc['2003-03-05':'2003-04-23', 'close']
hit = c >= 1.15 * c.cummin()
first_reset = hit.idxmax() if hit.any() else None
print(f"    2003 episode: low {c.cummin().iloc[-1]:.4f}, first close >= 1.15 x running low: {first_reset} "
      f"(close {c.loc[first_reset]:.4f} vs {1.15 * c.loc[:first_reset].min():.4f})")
check('E3 2003-03-05 episode resolved by recovery_reset on the first close >= 1.15 x running episode low',
      epi['resolution'] == 'recovery_reset' and epi['resolution_date'] == first_reset,
      f"logged {epi['resolution_date']} vs raw {first_reset}")

print('\n--- SC3: QQQ 2008-11-24 E4 episode (8% saturation, missed 2009-03-06, reset 2009-12-24) ---')
tr4 = pd.read_csv(RES / 'trades' / 'QQQ_1999_2015__E4_cum_loss.csv')
prev = tr4[tr4['exit_date'] < '2008-11-24'].iloc[-1]
check('previous exit (2008-11-06) was profitable => correction cleared, cum loss = single -13,229 loss',
      prev['exit_date'] == '2008-11-06' and prev['profit'] > 0, f"{prev['exit_date']} {prev['profit']:+.0f}")
d = min(max(0.01 + 13229.312134 / 1e5, 0.01), 0.08)
lvl = 23.5823 * (1 - d)
check('discount saturates at 8%; level 21.6957', abs(d - 0.08) < 1e-12 and abs(lvl - 21.695716) < 1e-4, f'{lvl:.6f}')
seg = qqq.loc['2008-11-24':'2009-12-24', 'close']
check('close NEVER <= 21.6957 in the whole episode (min 2008-11-20 was before arming)',
      seg.min() > lvl, f'min={seg.min():.4f} on {seg.idxmin()}')
check('2009-03-06 close 22.8139 above E4 level (E1 re-entered here; E4 blocked)',
      abs(qqq.loc['2009-03-06', 'close'] - 22.8139) < 1e-4 and qqq.loc['2009-03-06', 'close'] > lvl)
check('reset 2009-12-24: first close >= 0.95 x 42.0517 = 39.9491',
      qqq.loc['2009-12-24', 'close'] >= 0.95 * 42.0517 and (seg.loc[:'2009-12-23'] < 0.95 * 42.0517).all(),
      f"close={qqq.loc['2009-12-24', 'close']}")

print('\n--- SC4: VGT 2023-01 (E1 blocked / E2 captured) and VGT 2020-03 closes ---')
check('E1 level off 2022-11-03 exit 38.0568: 36.9151', abs(38.0568 * 0.97 - 36.915096) < 1e-4)
epi_closes = vgt.loc['2022-11-03':'2023-02-15', 'close']  # whole E1 episode (armed 2022-11-03)
check('E1: no close in the whole episode reaches 36.9151 (episode min 37.4855 => gap 1.55%)',
      epi_closes.min() > 36.915096 and abs(epi_closes.min() - 37.4855) < 1e-4,
      f'min={epi_closes.min()} on {epi_closes.idxmin()} gap={epi_closes.min()/36.915096-1:+.2%}')
check('E2 level off 2022-12-19 entry 39.3976: 38.2157; 2023-01-05 close 38.1436 fills it',
      abs(39.3976 * 0.97 - 38.215672) < 1e-4 and vgt.loc['2023-01-05', 'close'] <= 38.215672,
      f"close={vgt.loc['2023-01-05', 'close']}")
check('2023-01-04 close (the baseline +28k entry E1 missed) was above E1 level',
      vgt.loc['2023-01-04', 'close'] > 36.915096, f"close={vgt.loc['2023-01-04', 'close']}")
mar = vgt.loc['2020-03-16':'2020-03-20', 'close']
print('    VGT closes 03-16..03-20: ' + ', '.join(f'{d[5:]}={v:.4f}' for d, v in mar.items()))
check('E1 level 22.4700 and E2 level 23.0016 both first reached at the 2020-03-20 close',
      (mar.loc['2020-03-17':'2020-03-19'] > 23.001610).all() and mar.loc['2020-03-20'] <= 22.469953,
      f"03-20={mar.loc['2020-03-20']}")

print('\n--- SC5: E5 streak arithmetic from the trades files ---')
tq = pd.read_csv(RES / 'trades' / 'QQQ_2016_2026__E5_no_small_rearm.csv')
win = tq[(tq['exit_date'] > '2024-09-09') & (tq['exit_date'] < '2025-03-31')]
check('QQQ: no exits between 2024-09-09 (financing-only loss sets streak anchor 446.733) and 2025-03-31',
      len(win) == 0)
for ex, p in [(451.024, -184.676483), (461.92, -2773.860472), (449.03, -5459.459068)]:
    decl = ex / 446.733 - 1
    check(f'exit {ex}: streak decline {decl:+.2%} > -2% => correctly declined', decl > -0.02)
tv = pd.read_csv(RES / 'trades' / 'VGT_2016_2026__E5_no_small_rearm.csv')
r = tv[tv['exit_date'] == '2026-02-05'].iloc[0]
check('VGT 2026-02-05: financing-only (exit 89.4832 > entry 89.2790) => declined; E1 armed on it',
      r['exit_price'] > r['entry_price'] and r['profit'] < 0,
      f"ret={r['exit_price']/r['entry_price']-1:+.2%} p={r['profit']:+.0f}")

print(f'\n{sum(ok)}/{len(ok)} checks passed')
assert all(ok)
