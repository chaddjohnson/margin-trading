"""Family G spot checks against raw prices (spec rule 8) + remaining episode details."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parents[1]
RES = HERE / 'results'
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
from engine import load  # noqa: E402

pd.set_option('display.width', 250)


def closes(ds):
    df = load(ds)
    return df['date'].astype(str).str[:10].to_numpy(), df['close'].to_numpy(), df['high'].to_numpy()


def idx(dates, d):
    return int(np.flatnonzero(dates == d)[0])


print('SPOT CHECK 1 — G9a guard decision: QQQ_2016_2026 reset on 2022-11-15 (episode armed 2022-11-03)')
dates, c, h = closes('QQQ_2016_2026')
i_exit = idx(dates, '2022-11-03')
i_res = idx(dates, '2022-11-15')
exit_price = 258.790  # from events; verify against trades below
seg = c[i_exit:i_res + 1]
min_close = seg[:i_res - i_exit + 1].min()
ev = pd.read_csv(RES / 'events' / 'QQQ_2016_2026__G9a_retrace_guard.csv')
row = ev[ev['exit_date'] == '2022-11-03'].iloc[0]
rh = row['ref_high']
retrace_pt = min_close + 0.38 * (rh - min_close)
guard = 0.97 * 1.02 * row['loss_exit_price']
print(f'  raw closes {dates[i_exit]}..{dates[i_res]}: exit-day close {c[i_exit]:.3f}, episode min close {min_close:.3f}')
print(f'  events row: loss_exit_price {row["loss_exit_price"]:.3f}, ref_high {rh:.3f}, min_close_in_episode {row["min_close_in_episode"]:.3f}')
print(f'  retrace point = {min_close:.3f} + 0.38*({rh:.3f} - {min_close:.3f}) = {retrace_pt:.3f}')
print(f'  close 2022-11-15 = {c[i_res]:.3f} >= retrace point? {c[i_res] >= retrace_pt}')
print(f'  guard level = 0.9894 * {row["loss_exit_price"]:.3f} = {guard:.3f}; close > guard? {c[i_res] > guard}  -> reset legitimately fired under the guard')
prev_ok = [(dates[j], c[j], c[j] >= min(c[i_exit:j + 1]) + 0.38 * (rh - min(c[i_exit:j + 1]))) for j in range(i_exit, i_res)]
viol = [p for p in prev_ok if p[2]]
print(f'  sessions before 11-15 already satisfying the retrace condition: {viol} (expect only possibly none)')

print('\nSPOT CHECK 2 — G5/G3 tiny-loss anchoring: QQQ_2016_2026 episode armed 2022-02-28, re-entry 2022-03-01')
tr3 = pd.read_csv(RES / 'trades' / 'QQQ_2016_2026__G3_tiny_retrace.csv')
t = tr3[tr3['exit_date'] == '2022-02-28'].iloc[0]
print(f'  arming trade: entry {t["entry_date"]} @{t["entry_price"]}, exit 2022-02-28 @{t["exit_price"]}, net {t["profit"]:.2f}')
print(f'  |net loss| = {abs(t["profit"]):.2f} < 2000 -> tiny; price return = {t["exit_price"]/t["entry_price"]-1:.4%}')
i0 = idx(dates, '2022-02-28')
i1 = idx(dates, '2022-03-01')
print(f'  raw close 2022-02-28 = {c[i0]:.3f} (= frozen exit price {t["exit_price"]}), raw close 2022-03-01 = {c[i1]:.3f}')
print(f'  anchor admits: close {c[i1]:.3f} <= exit {t["exit_price"]:.3f}? {c[i1] <= t["exit_price"]}; '
      f'3% rule would demand <= {0.97*t["exit_price"]:.3f} -> {c[i1] <= 0.97*t["exit_price"]} (anchor-DECISIVE)')
print(f'  10% signal on 2022-03-01: prev-90-session high = {h[max(0,i1-90):i1].max():.3f}, '
      f'close/high - 1 = {c[i1]/h[max(0,i1-90):i1].max()-1:.4%} (<= -10% required)')

print('\nSPOT CHECK 3 — G4 stall-decay entry: QQQ_1999_2015, episode armed 2002-08-05, decayed re-entry 2002-09-19')
dq, cq, hq = closes('QQQ_1999_2015')
i_exit = idx(dq, '2002-08-05')
i_re = idx(dq, '2002-09-19')
seg = cq[i_exit:i_re + 1]
min_i_rel = int(np.argmin(seg))
min_close = seg[min_i_rel]
min_i = i_exit + min_i_rel
age = i_re - min_i
exit_price = 18.7474
d = 0.03 if age < 20 else 0.03 * max(0.0, 1 - (age - 20) / 60)
level = exit_price * (1 - d)
print(f'  episode min close since 2002-08-05: {min_close:.4f} on {dq[min_i]} (index {min_i}); age at 2002-09-19 = {age} sessions')
print(f'  stall discount = 3% * (1 - ({age}-20)/60) = {d:.4%}; level = {exit_price} * {1-d:.5f} = {level:.4f}')
print(f'  close 2002-09-19 = {cq[i_re]:.4f} <= level? {cq[i_re] <= level}; fixed 3% level would be {exit_price*0.97:.4f} -> close above it? {cq[i_re] > exit_price*0.97}')
print(f'  (so the decayed level, not the 3% rule, admitted this entry — matches G4 trades CSV entry 2002-09-19 @{cq[i_re]:.4f})')

print('\nSPOT CHECK 4 — G2 tiny anchoring: VGT_2016_2026 episode armed 2025-04-14 (loss -1752.74)')
dv, cv, hv = closes('VGT_2016_2026')
ev2 = pd.read_csv(RES / 'events' / 'VGT_2016_2026__G2_tiny_stall.csv')
row = ev2[ev2['exit_date'] == '2025-04-14'].iloc[0]
print(row[['exit_date', 'loss', 'price_return', 'loss_exit_price', 'resolution', 'resolution_date', 'reentry_date',
           'reentry_close', 'required_level_at_entry']].to_string())
i_exit = idx(dv, '2025-04-14')
i_re = idx(dv, str(row['reentry_date']))
print(f'  raw close on exit 2025-04-14 = {cv[i_exit]:.4f}; raw close on re-entry {row["reentry_date"]} = {cv[i_re]:.4f}')
print(f'  tiny (|{row["loss"]:.2f}| < 2000) -> level = exit price {row["loss_exit_price"]:.4f}; close <= level? {cv[i_re] <= row["loss_exit_price"]}')
print(f'  3% level would be {0.97*row["loss_exit_price"]:.4f}; close above it? {cv[i_re] > 0.97*row["loss_exit_price"]} (anchor-DECISIVE if True)')
# What REF did in the same stretch
trR = pd.read_csv(RES / 'trades' / 'VGT_2016_2026__REF_lower3.csv')
tr2 = pd.read_csv(RES / 'trades' / 'VGT_2016_2026__G2_tiny_stall.csv')
print('  REF trades Mar-Jun 2025:')
print(trR[(trR['entry_date'] >= '2025-03-01') & (trR['entry_date'] <= '2025-06-30')][['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))
print('  G2 trades Mar-Jun 2025:')
print(tr2[(tr2['entry_date'] >= '2025-03-01') & (tr2['entry_date'] <= '2025-06-30')][['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))

print('\nDETAIL — VGT 2026 window: REF vs G_A2m1 vs G_D7tiny trades Jan-Oct 2026')
for cfg in ['REF_lower3', 'G_A2m1', 'G_D7tiny']:
    t = pd.read_csv(RES / 'trades' / f'VGT_2016_2026__{cfg}.csv')
    t = t[(t['entry_date'] >= '2026-01-01')]
    print(f'  {cfg}:')
    print(t[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))

print('\nDETAIL — QQQ-new 2023 window: REF vs G_D7tiny (D7 +7,638)')
for cfg in ['REF_lower3', 'G_D7tiny']:
    t = pd.read_csv(RES / 'trades' / f'QQQ_2016_2026__{cfg}.csv')
    t = t[(t['entry_date'] >= '2022-12-01') & (t['entry_date'] <= '2023-12-31')]
    print(f'  {cfg}:')
    print(t[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'profit', 'reason']].to_string(index=False))
