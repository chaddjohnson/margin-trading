"""Family C verification: spot-checks of restriction episodes against raw prices, counter/episode
consistency, and trade-level divergence of the two most interesting configs vs the C1 anchor.
Output archived in tmp/spot_checks.txt.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import load  # noqa: E402

RES = HERE / 'results'
out = []


def p(s=''):
    out.append(s)
    print(s)


def df_of(ds):
    d = load(ds)
    d['date'] = d['date'].astype(str).str[:10]
    return d


def window(d, a, b, cols=('date', 'open', 'high', 'low', 'close')):
    return d[(d['date'] >= a) & (d['date'] <= b)][list(cols)]


def ev_of(ds, cfg):
    return pd.read_csv(RES / 'events' / f'{ds}__{cfg}.csv')


def tr_of(ds, cfg):
    return pd.read_csv(RES / 'trades' / f'{ds}__{cfg}.csv')


# ---------- A. C11_graduated, QQQ_1999_2015, episode exit 2002-08-05 ----------
p('=== A. C11_graduated QQQ_1999_2015 episode exit 2002-08-05 (stage-2 early re-entry) ===')
d = df_of('QQQ_1999_2015')
ev = ev_of('QQQ_1999_2015', 'C11_graduated')
e = ev[ev['exit_date'] == '2002-08-05'].iloc[0]
exit_p, ref = e['loss_exit_price'], e['ref_high']
p(f"frozen: exit_price {exit_p:.4f} ref_high {ref:.4f}; 3% level {exit_p*0.97:.4f}, 1.5% level {exit_p*0.985:.4f}")
w = window(d, '2002-08-05', '2002-09-20')
lows = w['close'].cummin()
stage2 = w['close'] >= 1.08 * lows
first2 = w[stage2].iloc[0] if stage2.any() else None
p(f"episode low path min {lows.min():.4f}; first stage-2 session {first2['date']} close {first2['close']:.4f} "
  f">= 1.08*low_so_far {1.08*lows[stage2].iloc[0]:.4f}" if first2 is not None else 'stage2 never')
re = w[w['date'] == '2002-09-19'].iloc[0]
p(f"2002-09-19 close {re['close']:.4f}: <= 1.5% level? {re['close'] <= exit_p*0.985}; "
  f"<= 3% level (C1 path)? {re['close'] <= exit_p*0.97}  -> C11 entered on stage 2 where C1 could not")
pre = w[(w['date'] >= '2002-09-10') & (w['date'] <= '2002-09-19')]
p('closes 09-10..09-19: ' + ', '.join(f"{r['date']}:{r['close']:.4f}" for _, r in pre.iterrows()))
# confirm no earlier session satisfied the active level (3% before stage2 date, 1.5% after)
viol = []
armed = False
low_so_far = None
for _, r in w.iterrows():
    if r['date'] == '2002-08-05':
        low_so_far = r['close']
        continue
    low_so_far = min(low_so_far, r['close'])
    if not armed and r['close'] >= 1.08 * low_so_far:
        armed = True
    lvl = exit_p * (0.985 if armed else 0.97)
    if r['close'] <= lvl and r['date'] < '2002-09-19':
        viol.append((r['date'], r['close'], lvl))
p(f"sessions before 09-19 whose close was at/below the then-active level: {viol} (signal requirement explains any)")

# ---------- B. C6_retrace_38, QQQ_1999_2015, episode exit 2002-10-08 -> reset 2002-11-01 ----------
p()
p('=== B. C6_retrace_38 QQQ_1999_2015 episode exit 2002-10-08 -> reset 2002-11-01 ===')
ev = ev_of('QQQ_1999_2015', 'C6_retrace_38')
e = ev[ev['exit_date'] == '2002-10-08'].iloc[0]
exit_p, ref = e['loss_exit_price'], e['ref_high']
w = window(d, '2002-10-08', '2002-11-04')
low = w['close'].min()
thr = low + 0.38 * (ref - low)
p(f"frozen ref_high {ref:.4f}; episode low (close) {low:.4f} on {w.loc[w['close'].idxmin(), 'date']}; "
  f"38% retrace threshold {thr:.4f}")
for dt in ['2002-10-31', '2002-11-01']:
    r = w[w['date'] == dt].iloc[0]
    p(f"  {dt} close {r['close']:.4f} {'>=' if r['close'] >= thr else '<'} {thr:.4f}")
c1lvl = 0.95 * ref
p(f"C1 reset level 0.95*ref = {c1lvl:.4f} (close never near it; C1 stayed restricted until 2003-07-08)")

# ---------- C. C4_rebound_10, VGT_2016_2026, the 2022-11 -> 2023-01 rescue chain ----------
p()
p('=== C. C4_rebound_10 VGT_2016_2026 rescue chain 2022-11-03 .. 2023-01-05 ===')
d2 = df_of('VGT_2016_2026')
ev = ev_of('VGT_2016_2026', 'C4_rebound_10')
for xd in ['2022-11-03', '2022-11-29', '2023-01-03']:
    e = ev[ev['exit_date'] == xd].iloc[0]
    p(f"episode exit {xd}: exit_price {e['loss_exit_price']:.4f} ref_high {e['ref_high']:.4f} -> "
      f"{e['resolution']} {e['resolution_date']}")
w = window(d2, '2022-11-03', '2022-11-14')
lows = w['close'].cummin()
p('close / 1.10*low_so_far: ' + ', '.join(f"{r['date']}:{r['close']:.4f}/{1.10*l:.4f}"
                                          for (_, r), l in zip(w.iterrows(), lows)))
e = ev[ev['exit_date'] == '2022-11-29'].iloc[0]
p(f"re-entry 2022-12-19: close {float(d2[d2['date'] == '2022-12-19']['close']):.4f} <= "
  f"0.97*exit {0.97*e['loss_exit_price']:.4f}? "
  f"{float(d2[d2['date'] == '2022-12-19']['close']) <= 0.97*e['loss_exit_price']}")
e = ev[ev['exit_date'] == '2023-01-03'].iloc[0]
p(f"re-entry 2023-01-05: close {float(d2[d2['date'] == '2023-01-05']['close']):.4f} <= "
  f"0.97*exit {0.97*e['loss_exit_price']:.4f}? "
  f"{float(d2[d2['date'] == '2023-01-05']['close']) <= 0.97*e['loss_exit_price']}")
ev1 = ev_of('VGT_2016_2026', 'C1_frozen95')
e1 = ev1[ev1['exit_date'] == '2022-11-03'].iloc[0]
mx = window(d2, '2022-11-03', '2023-01-05')['close'].max()
p(f"C1 in the same span: reset level 0.95*{e1['ref_high']:.4f} = {0.95*e1['ref_high']:.4f}; "
  f"max close 2022-11-03..2023-01-05 = {mx:.4f} -> C1 stayed restricted (reset only 2023-02-15)")

# ---------- D. C2 same-session reset on the arming exit (QQQ 2002-09-13) ----------
p()
p('=== D. C2_exit_price same-session reset, QQQ 2002-09-13 ===')
tr = tr_of('QQQ_1999_2015', 'C2_exit_price')
t = tr[tr['exit_date'] == '2002-09-13'].iloc[0]
r = d[d['date'] == '2002-09-13'].iloc[0]
p(f"losing exit {t['reason']} at {t['exit_price']:.4f} (open {r['open']:.4f}); close {r['close']:.4f} "
  f">= exit price? {r['close'] >= t['exit_price']} -> restriction cleared the same session (0s episode)")

# ---------- E. C12_timeout120 session arithmetic ----------
p()
p('=== E. C12_timeout120 VGT_2016_2026 episode 2022-11-03 ===')
dd = pd.read_csv(RES / 'daily' / 'VGT_2016_2026__C12_timeout120.csv')
dates = dd['date'].astype(str).tolist()
i0, i1 = dates.index('2022-11-03'), dates.index('2023-04-28')
p(f"exit index {i0}, reset index {i1}, difference {i1 - i0} sessions (should be 120)")

# ---------- F. counter / episode consistency for the three most interesting configs ----------
p()
p('=== F. counter/episode consistency (C6_retrace_38, C11_graduated, C4_rebound_10) ===')
import json
recs = json.load(open(RES / 'summary.json'))
R = {(r['dataset'], r['config']): r for r in recs}
for cfg in ['C6_retrace_38', 'C11_graduated', 'C4_rebound_10', 'C0_none']:
    for ds in ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']:
        sm = R[(ds, cfg)]['extra']['state_machine']
        ev = ev_of(ds, cfg)
        res = ev['resolution'].value_counts().to_dict()
        ok1 = sm['recovery_resets'] == res.get('recovery_reset', 0)
        ok2 = sm['lower_price_reentries'] == res.get('lower_price_reentry', 0)
        ok3 = sm['losing_exits_restricted'] == len(ev)
        assert ok1 and ok2 and ok3, (cfg, ds, sm, res)
    p(f'{cfg}: counters == events resolutions on all 4 datasets PASS')

# ---------- G. C1 vs C11 trade divergence (old datasets) ----------
p()
p('=== G. C1 vs C11 trade-level divergence ===')
for ds in ['VGT_2005_2015', 'QQQ_1999_2015']:
    a, b = tr_of(ds, 'C1_frozen95'), tr_of(ds, 'C11_graduated')
    sa = set(zip(a['entry_date'], a['profit'].round(2)))
    sb = set(zip(b['entry_date'], b['profit'].round(2)))
    p(f'-- {ds}: C1 {len(a)} trades, C11 {len(b)} trades --')
    p('  C1 only:  ' + ' | '.join(f'{d_}:{pr:+,.0f}' for d_, pr in sorted(sa - sb)))
    p('  C11 only: ' + ' | '.join(f'{d_}:{pr:+,.0f}' for d_, pr in sorted(sb - sa)))

# ---------- H. the C10/C9 2009 pre-bottom reset failure (QQQ) ----------
p()
p('=== H. C10_time_price QQQ 2008-11-24 episode: reset just before the March 2009 bottom ===')
ev = ev_of('QQQ_1999_2015', 'C10_time_price')
e = ev[ev['exit_date'] == '2008-11-24'].iloc[0]
p(f"exit 2008-11-24 at {e['loss_exit_price']:.4f} -> {e['resolution']} {e['resolution_date']}")
tr10 = tr_of('QQQ_1999_2015', 'C10_time_price')
nxt = tr10[tr10['entry_date'] > '2009-02-24'].head(3)
p('next C10 trades: ' + ' | '.join(f"{r['entry_date']}@{r['entry_price']:.2f}->{str(r['exit_date'])[:10]}:{r['profit']:+,.0f}"
                                   for _, r in nxt.iterrows()))
tr1 = tr_of('QQQ_1999_2015', 'C1_frozen95')
nx1 = tr1[tr1['entry_date'] > '2009-02-24'].head(2)
p('C1 trades:      ' + ' | '.join(f"{r['entry_date']}@{r['entry_price']:.2f}->{str(r['exit_date'])[:10]}:{r['profit']:+,.0f}"
                                  for _, r in nx1.iterrows()))

# ---------- I. C12_signal_gone15 2026 give-back ----------
p()
p('=== I. C12_signal_gone15 VGT 2026-02-05 episode: reset 2026-02-27, then the March dip ===')
w = window(d2, '2026-02-05', '2026-02-27')
hi = df_of('VGT_2016_2026')
# dd from rolling high
h = hi['high'].to_numpy()
c = hi['close'].to_numpy()
dts = hi['date'].tolist()
rh = np.array([h[max(0, i - 90):i].max() if i > 0 else np.nan for i in range(len(h))])
ddv = 1 - c / rh
i27 = dts.index('2026-02-27')
p('dd90 2026-02-06..27: ' + ', '.join(f'{dts[j]}:{ddv[j]:.3f}' for j in range(i27 - 14, i27 + 1)))
trS = tr_of('VGT_2016_2026', 'C12_signal_gone15')
nxt = trS[trS['entry_date'] >= '2026-02-27'].head(2)
p('next trades: ' + ' | '.join(f"{r['entry_date']}@{r['entry_price']:.2f}->{str(r['exit_date'])[:10]}:{r['profit']:+,.0f}"
                               for _, r in nxt.iterrows()))

(HERE / 'tmp' / 'spot_checks.txt').write_text('\n'.join(out))
print('\nwrote tmp/spot_checks.txt')
