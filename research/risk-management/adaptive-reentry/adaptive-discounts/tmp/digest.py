"""Digest results/summary.json into compact tables for the report."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
recs = json.load(open(HERE / 'results' / 'summary.json'))

DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
by = {(r['dataset'], r['config']): r for r in recs}
configs = []
for r in recs:
    if r['config'] not in configs:
        configs.append(r['config'])


def f(x):
    return f'{x:,.0f}' if x is not None else 'n/a'


print('== A. net / mdd / p-dd / trades(W-L) / blocked / lowReentries / resets(false) / fallbacks ==')
for ds in DS:
    print(f'--- {ds} ---')
    for c in configs:
        r = by[(ds, c)]
        m, sm = r['metrics'], r['extra']['state_machine']
        print(f"{c:24s} net {f(m['net_profit']):>9} mdd {f(m['max_drawdown']):>8} "
              f"pdd {m['profit_to_drawdown'] if m['profit_to_drawdown'] else float('nan'):6.2f} "
              f"tr {m['closed_trades']:3d} ({m['winning_trades']}/{m['losing_trades']}) "
              f"blk {sm['blocked_sessions']:4d} low {sm['lower_price_reentries']:3d} "
              f"rst {sm['recovery_resets']:2d}({sm['false_resets']}) fb {sm['indicator_fallbacks']:3d}")

print()
print('== B. vs references and matched controls (dNet/dMDD, positive dNet good, negative dMDD good) ==')
for ds in DS:
    print(f'--- {ds} ---')
    for c in configs:
        r = by[(ds, c)]
        v, mc, ml = r['extra']['vs_reference'], r['matched_control'], r['matched_lower3_control']
        print(f"{c:24s} vsBase {f(v['net_vs_baseline']):>8}/{f(v['mdd_vs_baseline']):>8}  "
              f"vsL3 {f(v['net_vs_lower3']):>8}/{f(v['mdd_vs_lower3']):>8}  "
              f"mCtl {f(mc['profit_difference']):>8}/{f(mc['drawdown_difference']):>8}  "
              f"mL3Ctl {f(ml['profit_difference']):>8}/{f(ml['drawdown_difference']):>8}")

print()
print('== C. bear windows pnl / in-window mdd / trades(losing) ==')
for ds in DS:
    print(f'--- {ds} ---')
    for c in configs:
        r = by[(ds, c)]
        rows = []
        for w, st in r['metrics']['bear_windows'].items():
            rows.append(f"{w}: {f(st['pnl'])}/{f(st['max_drawdown'])}/{st['trades_closed']}({st['losing_trades']})")
        print(f"{c:24s} " + '  '.join(rows))

print()
print('== D. recovery windows pnl (ext incl 2026) ==')
for ds in DS:
    print(f'--- {ds} ---')
    hdr = None
    for c in configs:
        r = by[(ds, c)]
        rw = r['extra']['recovery_windows_ext']
        if hdr is None:
            hdr = list(rw)
            print('windows: ' + ' | '.join(hdr))
        print(f"{c:24s} " + ' | '.join(f(rw[w]['pnl']) for w in hdr))

print()
print('== E. near-miss blocked winners (close within 2% of required level) ==')
for ds in DS:
    for c in configs:
        r = by[(ds, c)]
        nm = r['extra']['near_miss_blocked_winners']
        if nm:
            s = '; '.join(f"{x['b_entry_date']} +{f(x['b_profit'])} gap {x['min_gap']:.3%}" for x in nm)
            print(f'{ds:14s} {c:24s} {s}')

print()
print('== F. matching: major winners >=10k blocked (eliminated) and repeated losers eliminated ==')
for ds in DS:
    print(f'--- {ds} ---')
    for c in configs:
        r = by[(ds, c)]
        mt = r['extra']['matching']
        mw, rl, rb = mt['major_winners_10k'], mt['repeated_losers'], mt['rebound_winners']
        print(f"{c:24s} majW n{mw['n']} elim {mw['eliminated']} later {mw['later']} "
              f"winPnl b{f(mw['baseline_pnl'])}->v{f(mw['variant_window_pnl'])}  "
              f"repL n{rl['n']} elim {rl['eliminated']} pnl b{f(rl['baseline_pnl'])}->v{f(rl['variant_window_pnl'])}  "
              f"rebW n{rb['n']} elim {rb['eliminated']} pnl b{f(rb['baseline_pnl'])}->v{f(rb['variant_window_pnl'])}")
