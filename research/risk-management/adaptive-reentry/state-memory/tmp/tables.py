"""Dump the report tables from results/summary.json."""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
recs = json.load(open(HERE / 'results' / 'summary.json'))
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CF = ['E1_exit_only', 'E2_entry_only', 'E3_entry_count', 'E4_cum_loss', 'E5_no_small_rearm']
R = {(r['dataset'], r['config']): r for r in recs}


def f(x, nd=0):
    return 'None' if x is None else f'{x:,.{nd}f}'


print('=' * 110)
print('MAIN TABLE')
for ds in DS:
    print(f'\n--- {ds} ---')
    print(f"{'config':20s} {'net':>9s} {'mdd':>8s} {'p/dd':>6s} {'tr':>3s} {'W/L':>6s} {'blk':>4s} "
          f"{'reent':>5s} {'rst':>3s} {'fRst':>4s} {'vsBase':>8s} {'vsLow3':>8s} "
          f"{'mCtl dP':>8s} {'mCtl dDD':>8s} {'m3Ctl dP':>8s} {'m3Ctl dDD':>8s} {'medDisc':>7s}")
    for cf in CF:
        r = R[(ds, cf)]
        m, sm = r['metrics'], r['extra']['state_machine']
        mc, m3 = r['matched_control'], r['matched_lower3_control']
        vr = r['extra']['vs_reference']
        md = sm['reentry_discount_vs_loss_exit_median']
        print(f"{cf:20s} {f(m['net_profit']):>9s} {f(m['max_drawdown']):>8s} "
              f"{m['profit_to_drawdown']:>6.2f} {m['closed_trades']:>3d} "
              f"{m['winning_trades']:>2d}/{m['losing_trades']:<3d} {sm['blocked_sessions']:>4d} "
              f"{sm['lower_price_reentries']:>5d} {sm['recovery_resets']:>3d} {sm['false_resets']:>4d} "
              f"{f(vr['net_vs_baseline']):>8s} {f(vr['net_vs_lower3']):>8s} "
              f"{f(mc['profit_difference']):>8s} {f(mc['drawdown_difference']):>8s} "
              f"{f(m3['profit_difference']):>8s} {f(m3['drawdown_difference']):>8s} "
              f"{('' if md is None else f'{md*100:+.1f}%'):>7s}")

print('\n' + '=' * 110)
print('EPISODES / RESOLUTIONS / INTEREST / EXPOSURE')
for ds in DS:
    print(f'\n--- {ds} ---')
    for cf in CF:
        r = R[(ds, cf)]
        m, sm = r['metrics'], r['extra']['state_machine']
        print(f"{cf:20s} episodes {sm['losing_exits_restricted']:>3d}  res {sm['episodes_by_resolution']}  "
              f"declined {sm['triggers_declined']:>2d}  sessRestr med/max {f(sm['sessions_restricted_median'])}/"
              f"{f(sm['sessions_restricted_max'])}  interest {f(m['margin_interest'])}  "
              f"exposed {m['pct_sessions_exposed']*100:.0f}%")

print('\n' + '=' * 110)
print('BEAR WINDOWS  (pnl / in-window mdd / closed trades (losing))')
for ds in DS:
    r0 = R[(ds, CF[0])]
    wins = list(r0['metrics']['bear_windows'])
    if not wins:
        continue
    print(f'\n--- {ds} ---')
    for cf in CF:
        m = R[(ds, cf)]['metrics']['bear_windows']
        row = '  '.join(f"{w}: {f(m[w]['pnl']):>8s}/{f(m[w]['max_drawdown']):>7s}/{m[w]['trades_closed']}({m[w]['losing_trades']})"
                        for w in wins)
        print(f'{cf:20s} {row}')

print('\n' + '=' * 110)
print('RECOVERY WINDOWS pnl (incl 2026 ext)')
for ds in DS:
    r0 = R[(ds, CF[0])]
    wins = list(r0['extra']['recovery_windows_ext'])
    print(f'\n--- {ds} ---   windows: {wins}')
    for cf in CF:
        e = R[(ds, cf)]['extra']['recovery_windows_ext']
        row = '  '.join(f"{w}: {f(e[w]['pnl']):>8s}" for w in wins)
        print(f'{cf:20s} {row}')

print('\n' + '=' * 110)
print('MATCHING: repeated losers / rebound winners / major winners (baseline pnl -> variant window pnl, eliminated)')
for ds in DS:
    print(f'\n--- {ds} ---')
    for cf in CF:
        mt = R[(ds, cf)]['extra']['matching']
        rl, rw, mj = mt['repeated_losers'], mt['rebound_winners'], mt['major_winners_10k']
        print(f"{cf:20s} repLose n{rl['n']:>2d} {f(rl['baseline_pnl']):>9s}->{f(rl['variant_window_pnl']):>9s} elim {rl['eliminated']:>2d} | "
              f"rebWin n{rw['n']:>2d} {f(rw['baseline_pnl']):>8s}->{f(rw['variant_window_pnl']):>8s} elim {rw['eliminated']} | "
              f"majWin n{mj['n']:>2d} {f(mj['baseline_pnl']):>8s}->{f(mj['variant_window_pnl']):>8s} elim {mj['eliminated']} | "
              f"missed {mt['baseline_entries_missed']:>2d} delayed {mt['baseline_entries_delayed']:>2d}")

print('\n' + '=' * 110)
print('NEAR-MISS BLOCKED WINNERS (close within 2% of required level)')
for ds in DS:
    for cf in CF:
        nm = R[(ds, cf)]['extra']['near_miss_blocked_winners']
        if nm:
            print(f'{ds} {cf}: ' + '; '.join(f"{x['b_entry_date']} +{x['b_profit']:,.0f} gap {x['min_gap']*100:.1f}%" for x in nm))

print('\n' + '=' * 110)
print('FALSE RESET DATES')
for ds in DS:
    for cf in CF:
        sm = R[(ds, cf)]['extra']['state_machine']
        if sm['false_reset_dates']:
            print(f"{ds} {cf}: {sm['false_reset_dates']}")
