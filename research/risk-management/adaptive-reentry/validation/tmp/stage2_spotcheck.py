"""Stage-2 raw-price spot checks (spec rule 8; stage-2 brief requires >= 3, including the G8
QQQ-old 2002-11/2003-03 reset chain and the G4 2002-09-19 decision at a neighboring grid point).
Everything below is recomputed from the raw price files + trades CSVs only.
Writes results/stage2/spot_checks.txt."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parents[1]
AR = HERE.parent
sys.path.insert(0, str(AR.parents[0] / 'baseline'))
from engine import Params, load  # noqa: E402

PRM = Params()
out = []


def say(s=''):
    out.append(s)
    print(s)


def check(ok, msg):
    say(f'  {"OK  " if ok else "FAIL"} {msg}')
    assert ok, msg


q = load('QQQ_1999_2015')
qc = q['close'].to_numpy(float)
qh = q['high'].to_numpy(float)
qd = q['date'].dt.date.astype(str).to_numpy()
qi = {d: i for i, d in enumerate(qd)}


def retrace_threshold(mn, ref):
    return mn + 0.38 * (ref - mn)


# ---------------------------------------------------------------- 1. G8 QQQ-old 2002-11/2003-03
say('SPOT CHECK 1 — G8_A2m1_retrace, QQQ_1999_2015: the 2002-10..2003-03 reset chain (raw closes)')
tr = pd.read_csv(AR / 'combinations/results/trades/QQQ_1999_2015__G8_A2m1_retrace.csv')

# Episode armed 2002-10-08: the 2002-09-23 -> 10-08 trade lost materially
t = tr[tr['exit_date'] == '2002-10-08'].iloc[0]
pr = t['exit_price'] / t['entry_price'] - 1
check(pr <= -0.01, f'arming trade 2002-09-23->2002-10-08 price return {pr:+.4%} <= -1% (material)')
pe = int(t['entry_i'])
ref = qh[max(0, pe - PRM.window):pe].max()
check(abs(ref - 28.5103) < 1e-4, f'ref_high from raw highs = {ref:.4f} (logged 28.5103)')
i0 = qi['2002-10-08']
ir = qi['2002-11-01']
mn = qc[i0:ir + 1].min()
check(abs(mn - 17.0068) < 1e-4, f'episode min close through 2002-11-01 = {mn:.4f} (logged 17.0068)')
mn_run = qc[i0]
first = None
for j in range(i0, ir + 1):
    mn_run = min(mn_run, qc[j])
    if qc[j] >= retrace_threshold(mn_run, ref) and first is None:
        first = j
check(first == ir, f'first session whose close >= low+0.38*(ref-low) is {qd[first]} (= logged reset '
                   f'2002-11-01; close {qc[ir]:.4f} >= threshold {retrace_threshold(mn, ref):.4f}); '
                   f'no earlier session qualifies')
# Post-reset probes: the -712.68 loss on 2002-12-27 is immaterial and must NOT re-arm
t2 = tr[tr['exit_date'] == '2002-12-27'].iloc[0]
pr2 = t2['exit_price'] / t2['entry_price'] - 1
check(pr2 > -0.01 and t2['profit'] < 0,
      f'2002-12-27 loss {t2["profit"]:+.0f} has price return {pr2:+.4%} > -1% -> declined, no episode')
nxt = tr[tr['entry_date'] == '2002-12-30']
check(len(nxt) == 1, 'unrestricted re-entry already on 2002-12-30 (next signal session)')
# Episode armed 2003-02-05 (-3,238, -2.79%), reset 2003-03-14
t3 = tr[tr['exit_date'] == '2003-02-05'].iloc[0]
pr3 = t3['exit_price'] / t3['entry_price'] - 1
check(pr3 <= -0.01, f'arming trade 2003-01-21->2003-02-05 price return {pr3:+.4%} <= -1%')
pe3 = int(t3['entry_i'])
ref3 = qh[max(0, pe3 - PRM.window):pe3].max()
check(abs(ref3 - 24.4097) < 1e-4, f'ref_high = {ref3:.4f} (logged 24.4097)')
i3 = qi['2003-02-05']
ir3 = qi['2003-03-14']
mn3 = qc[i3:ir3 + 1].min()
check(abs(mn3 - 20.1776) < 1e-4, f'episode min close = {mn3:.4f} (logged 20.1776)')
mn_run, first = qc[i3], None
for j in range(i3, ir3 + 1):
    mn_run = min(mn_run, qc[j])
    if qc[j] >= retrace_threshold(mn_run, ref3) and first is None:
        first = j
check(first == ir3, f'first qualifying session is {qd[first]} (= logged reset 2003-03-14; close '
                    f'{qc[ir3]:.4f} >= threshold {retrace_threshold(mn3, ref3):.4f})')
t4 = tr[tr['entry_date'] == '2003-03-31'].iloc[0]
rh4 = qh[max(0, qi['2003-03-31'] - PRM.window):qi['2003-03-31']].max()
sig = 1 - qc[qi['2003-03-31']] / rh4
check(sig >= PRM.target, f'2003-03-31 entry (post-reset, unrestricted) has the 10% signal '
                         f'({sig:.2%} below the 90-session high); trade earned {t4["profit"]:+,.0f}')

# ---------------------------------------------------------------- 2. G4 2002-09-19 at neighbors
say('\nSPOT CHECK 2 — G4 stall decision 2002-09-19 (QQQ-old) at the frozen point vs neighbor (20,80)')
i_arm = qi['2002-08-05']
i_dec = qi['2002-09-19']
# arming trade: exit 2002-08-05 @ 18.7474
ta = pd.read_csv(AR / 'combinations/results/trades/QQQ_1999_2015__G4_A2m1_stall.csv')
ta_arm = ta[ta['exit_date'] == '2002-08-05'].iloc[0]
check(abs(ta_arm['exit_price'] - 18.7474) < 1e-4, f'arming exit price {ta_arm["exit_price"]:.4f} = 18.7474')
seg = qc[i_arm:i_dec + 1]
mni = i_arm + int(seg.argmin())
check(mni == i_arm and abs(qc[mni] - 18.1787) < 1e-4,
      f'episode low {qc[mni]:.4f} set on the arming day {qd[mni]} (= 18.1787 on 2002-08-05)')
age = i_dec - mni
check(age == 32, f'age of the low on 2002-09-19 = {age} sessions')
lv60 = 18.7474 * (1 - 0.03 * max(0.0, 1 - (age - 20) / 60))
lv80 = 18.7474 * (1 - 0.03 * max(0.0, 1 - (age - 20) / 80))
c_dec = qc[i_dec]
check(abs(c_dec - 18.2941) < 1e-4, f'2002-09-19 close {c_dec:.4f} = 18.2941')
check(c_dec <= lv60, f'(20,60): level {lv60:.4f} (discount 2.400%) >= close -> ENTRY (the frozen G4 decision)')
check(c_dec > lv80, f'(20,80): level {lv80:.4f} (discount 2.550%) < close -> BLOCKED (one step slower decay '
                    f'erases the decision)')
g60 = pd.read_csv(HERE / 'results/stage2/results/trades/QQQ_1999_2015__V2_G4_a20_d60.csv')
g80 = pd.read_csv(HERE / 'results/stage2/results/trades/QQQ_1999_2015__V2_G4_a20_d80.csv')
a2 = pd.read_csv(AR / 'combinations/results/trades/QQQ_1999_2015__G_A2m1.csv')
check((g60['entry_date'] == '2002-09-19').any(), 'grid (20,60) trades contain the 2002-09-19 entry')
check(not (g80['entry_date'] == '2002-09-19').any(), 'grid (20,80) trades do NOT contain it')
check((g60['entry_date'] == '2002-10-07').any() and not (g80['entry_date'] == '2002-10-07').any(),
      'the re-phased 2002-10-07 bottom catch exists only at (20,60)')
check(len(g80) == len(a2) and (g80['entry_date'].values == a2['entry_date'].values).all(),
      f'(20,80) trade dates identical to G_A2m1 ({len(g80)} trades) — the predicted collapse to the A2m1 leg')

# ---------------------------------------------------------------- 3. G8 fresh IWM 2008-09 chain
say('\nSPOT CHECK 3 — G8_A2m1_retrace on fresh IWM: the 2008-09-23 arming -> 2008-10-09 restricted '
    're-entry, and the 2008-11-21 arming -> 2009-03-02 resolution (raw closes)')
iw = pd.read_csv(HERE / 'data/IWM-2005-2026.csv', sep='|', header=None,
                 names=['date', 'open', 'high', 'low', 'close', 'volume'])
ic = iw['close'].to_numpy(float)
ih = iw['high'].to_numpy(float)
idt = iw['date'].astype(str).str[:10].to_numpy()
ii = {d: i for i, d in enumerate(idt)}
tf = pd.read_csv(HERE / 'results/stage2/fresh/trades/IWM__G8_A2m1_retrace.csv')
t17 = tf[tf['exit_date'] == '2008-10-08'].iloc[0]
pr17 = t17['exit_price'] / t17['entry_price'] - 1
check(pr17 <= -0.01, f'2008-09-23->10-08 loss {t17["profit"]:+,.0f}, price return {pr17:+.2%} -> arms')
pe17 = int(t17['entry_i'])
ref17 = ih[max(0, pe17 - PRM.window):pe17].max()
lv17 = t17['exit_price'] * 0.97
i_a = ii['2008-10-08']
i_e = ii['2008-10-09']
thr = retrace_threshold(min(ic[i_a], ic[i_e]), ref17)
check(ic[i_e] <= lv17, f'2008-10-09 close {ic[i_e]:.4f} <= level {lv17:.4f} (3% below exit '
                       f'{t17["exit_price"]:.4f}) -> restricted re-entry next session')
check(ic[i_e] < thr, f'close below the retrace threshold {thr:.4f} (ref_high {ref17:.4f}) -> reset '
                     f'priority not violated')
t20 = tf[tf['exit_date'] == '2008-11-21'].iloc[0]
pr20 = t20['exit_price'] / t20['entry_price'] - 1
check(pr20 <= -0.01, f'2008-11-06->11-21 loss {t20["profit"]:+,.0f}, price return {pr20:+.2%} -> arms')
pe20 = int(t20['entry_i'])
ref20 = ih[max(0, pe20 - PRM.window):pe20].max()
lv20 = t20['exit_price'] * 0.97
i_b = ii['2008-11-21']
i_r = ii['2009-03-02']
mn_run, first_reset, first_entry = ic[i_b], None, None
for j in range(i_b, i_r + 1):
    mn_run = min(mn_run, ic[j])
    thr = retrace_threshold(mn_run, ref20)
    if ic[j] >= thr and first_reset is None:
        first_reset = j
    rh = ih[max(0, j - PRM.window):j].max()
    sig = 1 - ic[j] / rh >= PRM.target
    if j > i_b and sig and ic[j] <= lv20 and first_entry is None and (first_reset is None or ic[j] < retrace_threshold(mn_run, ref20)):
        first_entry = j
check(first_reset is None, f'no session 2008-11-21..2009-03-02 reached the 38% retrace '
                           f'(ref_high {ref20:.4f}; the Dec-2008 rally topped out below it)')
check(first_entry == i_r, f'first signal session with close <= level {lv20:.4f} is {idt[first_entry]} '
                          f'(= the recorded 2009-03-02 re-entry @ {ic[i_r]:.4f}, +9,915 trade)')

say(f'\nALL STAGE-2 SPOT CHECKS PASSED ({len([l for l in out if l.startswith("  OK")])} assertions '
    f'recomputed from raw prices).')
(HERE / 'results/stage2/spot_checks.txt').write_text('\n'.join(out) + '\n')
print('wrote results/stage2/spot_checks.txt')
