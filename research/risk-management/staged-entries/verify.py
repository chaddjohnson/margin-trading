"""Verification for the staged-entry experiment. Writes results/verification.txt.

1. A_baseline reproduces baseline/results (summary metrics, matched control, trades and daily CSVs) exactly.
2. An independent replica of all three configurations, written from SPEC.md against the raw CSV files (plain
   Python, no engine code), reproduces every engine trade: entry, add-on session, exit session, reason, fill price
   and net P&L.
3. Lot-level P&L sums to the aggregate trade P&L for every position.
4. Detailed hand-check traces of selected staged positions (lot prices and sizes, average price, per-lot interest,
   stop level and activation, exit fill, per-lot P&L).
"""
import csv
import filecmp
import json
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'baseline'
REPO = HERE.parents[2]
sys.path.insert(0, str(BASE))

import pandas as pd  # noqa: E402

FILES = {
    'VGT_2005_2015': 'data/VGT/VGT-2004-2015.csv',
    'QQQ_1999_2015': 'data/QQQ/QQQ-1999-2015.csv',
    'VGT_2016_2026': 'data/VGT/VGT-2016-2026.csv',
    'QQQ_2016_2026': 'data/QQQ/QQQ-2016-2026.csv',
}
CONFIGS = ['A_baseline', 'B_staged_two_positive_closes', 'C_staged_3pct_recovery']
RATE, TRAIL, TARGET, WINDOW, LOSS_DAYS = 0.11, 0.08, 0.10, 90, 15
lines = []


def out(s=''):
    lines.append(s)
    print(s)


def read_raw(ds):
    rows = []
    with open(REPO / FILES[ds]) as f:
        for r in csv.reader(f, delimiter='|'):
            rows.append((date.fromisoformat(r[0]), float(r[1]), float(r[2]), float(r[3]), float(r[4])))
    return rows


def days_between(d1, d0):
    return (d1 - d0).days


def replica(rows, config):
    """Independent implementation of SPEC.md: baseline signal/exit rules plus the staged tranches."""
    n = len(rows)
    first = 100000.0 if config == 'A_baseline' else 50000.0
    trades, pos = [], None
    for i in range(1, n):
        d, o, h, l, c = rows[i]
        exited = False
        if pos is not None:
            shares = sum(lt['inv'] / lt['px'] for lt in pos['lots'])
            inv = sum(lt['inv'] for lt in pos['lots'])
            accrued = sum(lt['inv'] * RATE * days_between(d, lt['d']) / 365 for lt in pos['lots'])
            pnl = lambda px: shares * px - inv - accrued  # noqa: E731
            active = pnl(pos['stop']) > 0
            fill = None
            if days_between(d, pos['entry_d']) >= LOSS_DAYS and pnl(o) < 0:
                fill = (o, 'maximum hold')
            elif active and o <= pos['stop']:
                fill = (o, 'trailing stop gap')
            elif active and l <= pos['stop']:
                fill = (pos['stop'], 'trailing stop')
            if fill:
                trades.append(dict(entry_i=pos['entry_i'], add_i=pos['lots'][1]['i'] if len(pos['lots']) > 1 else None,
                                   exit_i=i, reason=fill[1], exit_price=fill[0], profit=pnl(fill[0])))
                pos, exited = None, True
            else:
                if len(pos['lots']) == 1 and config != 'A_baseline':
                    e = pos['entry_i']
                    if config == 'B_staged_two_positive_closes':
                        ok = i - 1 > e and rows[i][4] > rows[i - 1][4] > rows[i - 2][4]
                    else:
                        ok = rows[i][4] >= 1.03 * rows[e][4]
                    if ok:
                        pos['lots'].append(dict(i=i, d=d, px=c, inv=50000.0))
                pos['high'] = max(pos['high'], h)
                pos['stop'] = max(pos['stop'], pos['high'] * (1 - TRAIL))
            continue
        if not exited:
            hi = max(r[2] for r in rows[max(0, i - WINDOW):i])
            if 1 - c / hi >= TARGET:
                pos = dict(entry_i=i, entry_d=d, lots=[dict(i=i, d=d, px=c, inv=first)], high=c, stop=c * (1 - TRAIL))
    if pos is not None:
        d, c = rows[-1][0], rows[-1][4]
        shares = sum(lt['inv'] / lt['px'] for lt in pos['lots'])
        inv = sum(lt['inv'] for lt in pos['lots'])
        accrued = sum(lt['inv'] * RATE * days_between(d, lt['d']) / 365 for lt in pos['lots'])
        trades.append(dict(entry_i=pos['entry_i'], add_i=pos['lots'][1]['i'] if len(pos['lots']) > 1 else None,
                           exit_i=None, reason='open', exit_price=c, profit=shares * c - inv - accrued))
    return trades


def check_baseline_reproduction():
    out('## 1. A_baseline reproduces the frozen baseline')
    b = {r['dataset']: r for r in json.load(open(BASE / 'results' / 'summary.json'))}
    s = [r for r in json.load(open(HERE / 'results' / 'summary.json')) if r['config'] == 'A_baseline']
    ok = True
    for r in s:
        ds = r['dataset']
        m_eq = r['metrics'] == b[ds]['metrics']
        c_eq = r['matched_control'] == b[ds]['matched_control']
        t_eq = filecmp.cmp(BASE / 'results' / 'trades' / f'{ds}__baseline.csv', HERE / 'results' / 'trades' / f'{ds}__A_baseline.csv', shallow=False)
        d_eq = filecmp.cmp(BASE / 'results' / 'daily' / f'{ds}__baseline.csv', HERE / 'results' / 'daily' / f'{ds}__A_baseline.csv', shallow=False)
        ok &= m_eq and c_eq and t_eq and d_eq
        out(f'{ds}: metrics identical={m_eq}, matched control identical={c_eq}, trades CSV byte-identical={t_eq}, '
            f'daily CSV byte-identical={d_eq}; net {r["metrics"]["net_profit"]:,.2f}, max DD {r["metrics"]["max_drawdown"]:,.2f}')
    out(f'RESULT: {"PASS" if ok else "FAIL"}')
    return ok


def check_replica():
    out('\n## 2. Independent replica vs engine (every trade, every config, every dataset)')
    ok = True
    for ds in FILES:
        rows = read_raw(ds)
        idx = {r[0].isoformat(): k for k, r in enumerate(rows)}
        for cfg in CONFIGS:
            rep = replica(rows, cfg)
            eng = pd.read_csv(HERE / 'results' / 'trades' / f'{ds}__{cfg}.csv')
            mism = 0
            if len(rep) != len(eng):
                mism = abs(len(rep) - len(eng)) + 1
            for a, (_, b) in zip(rep, eng.iterrows()):
                lots = str(b['lots']).split(';')
                add_i = idx[lots[1].split('@')[0]] if len(lots) > 1 else None
                b_exit = None if b['reason'] == 'open' else int(b['exit_i'])
                same = (a['entry_i'] == b['entry_i'] and a['add_i'] == add_i and a['exit_i'] == b_exit
                        and a['reason'] == b['reason'] and abs(a['exit_price'] - b['exit_price']) < 1e-9
                        and abs(a['profit'] - b['profit']) < 1e-6)
                mism += not same
            tot_rep = sum(t['profit'] for t in rep)
            tot_eng = float(eng['profit'].sum())
            ok &= mism == 0 and abs(tot_rep - tot_eng) < 1e-6
            out(f'{ds} {cfg}: trades replica {len(rep)} / engine {len(eng)}, mismatches {mism}, '
                f'net replica {tot_rep:,.4f} / engine {tot_eng:,.4f}')
    out(f'RESULT: {"PASS" if ok else "FAIL"}')
    return ok


def check_lots():
    out('\n## 3. Lot-level P&L reconciliation (sum of per-lot P&L == aggregate trade P&L)')
    ok = True
    for ds in FILES:
        for cfg in CONFIGS[1:]:
            p = pd.read_csv(HERE / 'results' / 'positions' / f'{ds}__{cfg}.csv')
            err = float(p['lot_pnl_reconciliation_error'].abs().max())
            tot = float((p['lot1_pnl'] + p['lot2_pnl']).sum())
            s = json.load(open(HERE / 'results' / 'summary.json'))
            net = [r for r in s if r['config'] == cfg and r['dataset'] == ds][0]['metrics']['net_profit']
            ok &= err < 1e-6 and abs(tot - net) < 1e-6
            out(f'{ds} {cfg}: max |sum(lot P&L) - trade P&L| = {err:.2e}; sum of all lot P&L {tot:,.4f} vs net profit {net:,.4f}')
    out(f'RESULT: {"PASS" if ok else "FAIL"}')
    return ok


def trace(ds, cfg, entry_date):
    """Hand-check one staged position from the raw CSV."""
    rows = read_raw(ds)
    idx = {r[0].isoformat(): k for k, r in enumerate(rows)}
    eng = pd.read_csv(HERE / 'results' / 'trades' / f'{ds}__{cfg}.csv')
    b = eng[eng['entry_date'] == entry_date].iloc[0]
    e = idx[entry_date]
    x = len(rows) - 1 if b['reason'] == 'open' else int(b['exit_i'])
    lots = str(b['lots']).split(';')
    j = idx[lots[1].split('@')[0]] if len(lots) > 1 else None
    out(f'\n### {ds} {cfg} position entered {entry_date}')
    c0 = rows[e][4]
    out(f'Signal: close {c0} on {entry_date}; 90-session high before it {max(r[2] for r in rows[max(0, e - 90):e])} '
        f'-> dip {1 - c0 / max(r[2] for r in rows[max(0, e - 90):e]):.4%} (>= 10%)')
    sh1 = 50000 / c0
    out(f'Lot 1: $50,000 at {c0} = {sh1:.6f} shares')
    if j is not None:
        cj = rows[j][4]
        if cfg.startswith('B'):
            out(f'Add rule B: closes {rows[j - 2][0]} {rows[j - 2][4]} < {rows[j - 1][0]} {rows[j - 1][4]} < {rows[j][0]} {cj} '
                f'(j-1 = entry+{j - 1 - e} > entry)')
            for k in range(e + 2, j):
                assert not (rows[k][4] > rows[k - 1][4] > rows[k - 2][4]), 'earlier qualifying session'
            out(f'  no earlier session in entry+2..j-1 had two consecutive positive closes (checked)')
        else:
            out(f'Add rule C: close {cj} on {rows[j][0]} >= 1.03 x {c0} = {1.03 * c0:.6f}')
            for k in range(e + 1, j):
                assert rows[k][4] < 1.03 * c0, 'earlier qualifying session'
            out(f'  closes in entry+1..j-1 all below {1.03 * c0:.6f} (checked)')
        sh2 = 50000 / cj
        out(f'Lot 2: $50,000 at {cj} on {rows[j][0]} (session entry+{j - e}, {(rows[j][0] - rows[e][0]).days} calendar days) '
            f'= {sh2:.6f} shares; add price / initial = {cj / c0:.4f}')
        avg = 100000 / (sh1 + sh2)
        out(f'Average entry price = $100,000 / {sh1 + sh2:.6f} shares = {avg:.6f} (engine {b["avg_entry_price"]:.6f}); '
            f'shift vs initial {avg / c0 - 1:+.3%}')
    else:
        sh2, cj = 0.0, None
        out('No second tranche.')
    dx, o, h, l, c = rows[x]
    hh = max([c0] + [r[2] for r in rows[e + 1:x]])
    hh_d = [r[0] for r in rows[e + 1:x] if r[2] == hh]
    stop = max(c0 * (1 - TRAIL), hh * (1 - TRAIL))
    n1 = (dx - rows[e][0]).days
    i1 = 50000 * RATE * n1 / 365
    n2 = (dx - rows[j][0]).days if j is not None else 0
    i2 = 50000 * RATE * n2 / 365 if j is not None else 0.0
    sh = sh1 + sh2
    inv = 50000 + (50000 if j is not None else 0)
    pa = lambda px: sh * px - inv - i1 - i2  # noqa: E731
    pa1 = lambda px: sh1 * px - 50000 - i1  # noqa: E731
    out(f'Exit session {dx} ({"open position marked at last close" if b["reason"] == "open" else "session entry+" + str(x - e)}): '
        f'O {o} H {h} L {l} C {c}')
    out(f'Interest: lot 1 {n1} days x $50,000 x 11%/365 = {i1:,.2f}; lot 2 {n2} days -> {i2:,.2f}; total {i1 + i2:,.2f} '
        f'(engine {b["interest"]:,.2f})')
    out(f'Stop level before exit session = 0.92 x max(entry close, highs entry+1..exit-1) = 0.92 x {hh} '
        f'({hh_d[0] if hh_d else "entry close"}) = {stop:.6f}')
    be = (inv + i1 + i2) / sh
    be1 = (50000 + i1) / sh1
    out(f'Breakeven incl. interest: aggregate {be:.6f}; initial lot alone {be1:.6f} '
        f'-> stop active (aggregate) = {pa(stop) > 0} (P&L at stop {pa(stop):,.2f}); initial lot alone would be {pa1(stop) > 0}')
    days_held = (dx - rows[e][0]).days
    out(f'Loss exit at open: days held {days_held} (>= 15: {days_held >= 15}); aggregate P&L at open {pa(o):,.2f}; '
        f'initial lot alone {pa1(o):,.2f}')
    if b['reason'] == 'open':
        fill, why = c, 'open position, marked at the last close'
    elif days_held >= LOSS_DAYS and pa(o) < 0:
        fill, why = o, 'maximum hold (loss exit at the open)'
    elif pa(stop) > 0 and o <= stop:
        fill, why = o, 'trailing stop gap (open at/below active stop)'
    elif pa(stop) > 0 and l <= stop:
        fill, why = stop, 'trailing stop (low reached active stop)'
    else:
        fill, why = None, 'NO EXIT (inconsistent)'
    out(f'Hand fill: {fill} ({why}); engine: {b["exit_price"]} ({b["reason"]})')
    p1 = sh1 * fill - 50000 - i1
    p2 = sh2 * fill - (50000 if j is not None else 0) - i2
    out(f'Per-lot P&L: lot 1 {sh1:.6f} x {fill} - 50,000 - {i1:,.2f} = {p1:,.2f}; lot 2 = {p2:,.2f}; sum {p1 + p2:,.2f}; '
        f'engine aggregate {b["profit"]:,.2f}; difference {p1 + p2 - b["profit"]:.2e}')
    ok = abs(fill - b['exit_price']) < 1e-9 and abs(p1 + p2 - b['profit']) < 1e-6 and abs(i1 + i2 - b['interest']) < 1e-6
    bt = pd.read_csv(BASE / 'results' / 'trades' / f'{ds}__baseline.csv')
    m = bt[bt['entry_date'] == entry_date]
    if len(m):
        r = m.iloc[0]
        out(f'Baseline trade with the same entry: exit {r["exit_date"]} at {r["exit_price"]} ({r["reason"]}), '
            f'P&L {r["profit"]:,.2f}; variant - baseline = {b["profit"] - r["profit"]:,.2f}')
    else:
        out('No baseline trade with the same entry session (sequence diverged).')
    out(f'CHECK: {"PASS" if ok else "FAIL"}')
    return ok


SPOT_CHECKS = [
    # chosen to cover each mechanic: a large winner with a late add (B and C), an add below the initial price (B),
    # an exit caused by the add raising the breakeven (loss exit at the open), a stop blocked by the add,
    # an open position at the end, and a position without an add.
]


def pick_spot_checks():
    picks = []
    for ds, cfg in [('VGT_2016_2026', 'B_staged_two_positive_closes'), ('QQQ_2016_2026', 'C_staged_3pct_recovery'),
                    ('QQQ_1999_2015', 'B_staged_two_positive_closes'), ('VGT_2005_2015', 'C_staged_3pct_recovery')]:
        p = pd.read_csv(HERE / 'results' / 'positions' / f'{ds}__{cfg}.csv')
        a = p[p['n_lots'] > 1]
        picks.append((ds, cfg, str(a.loc[a['profit'].idxmax(), 'entry_date']), 'largest winner with an add'))
        if cfg.startswith('B') and (a['add_ratio'] < 1).any():
            picks.append((ds, cfg, str(a.loc[a['add_ratio'].idxmin(), 'entry_date']), 'add below the initial price'))
        le = a[a['loss_exit_caused_by_add']]
        if len(le):
            picks.append((ds, cfg, str(le.loc[le['profit'].idxmin(), 'entry_date']), 'loss exit caused by the add'))
        sb = a[a['exit_session_stop_blocked']]
        if len(sb):
            picks.append((ds, cfg, str(sb.iloc[0]['entry_date']), 'stop blocked by the add on the exit session'))
        op = p[p['reason'] == 'open']
        if len(op):
            picks.append((ds, cfg, str(op.iloc[0]['entry_date']), 'open position at the end'))
        na = p[p['n_lots'] == 1]
        if len(na) and ds == 'QQQ_1999_2015':
            picks.append((ds, cfg, str(na.iloc[0]['entry_date']), 'no second tranche'))
    seen, uniq = set(), []
    for x in picks:
        if x[:3] not in seen:
            seen.add(x[:3])
            uniq.append(x)
    return uniq


def main():
    ok = check_baseline_reproduction()
    ok &= check_replica()
    ok &= check_lots()
    out('\n## 4. Hand-check traces of staged positions')
    for ds, cfg, d, why in pick_spot_checks():
        out(f'\n[{why}]')
        ok &= trace(ds, cfg, d)
    out(f'\nOVERALL: {"PASS" if ok else "FAIL"}')
    (HERE / 'results' / 'verification.txt').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
