import json
import pandas as pd
pd.set_option('display.width', 250)

print('=== VGT closes 2020-03-09..2020-04-07 ===')
df = pd.read_csv('../../../data/VGT/VGT-2016-2026.csv', sep='|', header=None,
                 names=['date','open','high','low','close','volume'])
w = df[(df.date >= '2020-03-09') & (df.date <= '2020-04-07')]
print(' '.join(f"{d[5:]}:{c:.2f}" for d, c in zip(w.date, w.close)))

print('\n=== VGT_2016_2026 events in Feb-Jun 2020 per config ===')
for cfg in ['B_lower_3pct','C_lower_5pct','D_lower_8pct']:
    ev = pd.read_csv(f'results/events/VGT_2016_2026__{cfg}.csv')
    sel = ev[(ev.exit_date >= '2020-02-01') & (ev.exit_date <= '2020-06-30')]
    print(f'-- {cfg}')
    print(sel[['exit_date','loss','loss_exit_price','lower_level','reset_level','resolution','resolution_date',
               'sessions_restricted','blocked_sessions','reentry_close','min_close_in_episode']].round(3).to_string(index=False))

print('\n=== QQQ_1999_2015 C_lower_5pct trades 2000-2002 (vs baseline 56 closed / 36 losing) ===')
tr = pd.read_csv('results/trades/QQQ_1999_2015__C_lower_5pct.csv')
sel = tr[(tr.exit_date >= '2000-01-01') & (tr.exit_date <= '2002-12-31')]
print(sel[['entry_date','exit_date','entry_price','exit_price','reason','profit']].round(2).to_string(index=False))
print('closed:', len(sel), 'losing:', (sel.profit < 0).sum(), 'sum pnl:', round(sel.profit.sum()))

print('\n=== C events during 2000-2002: were replacement entries meaningfully lower? ===')
ev = pd.read_csv('results/events/QQQ_1999_2015__C_lower_5pct.csv')
sel = ev[(ev.exit_date >= '2000-01-01') & (ev.exit_date <= '2002-12-31')]
print(sel[['exit_date','loss','loss_exit_price','resolution','resolution_date','sessions_restricted',
           'blocked_sessions','reentry_close','reentry_vs_loss_exit','reentry_vs_losing_entry']].round(3).to_string(index=False))

print('\n=== Shadow (first-order) summary ===')
sm = json.load(open('results/summary.json'))
for r in sm:
    fo = r['extra'].get('first_order_shadow')
    if fo:
        print(f"{r['dataset']:14s} {r['config']:14s} post-loss baseline entries {fo['baseline_entries_after_a_loss']:>3d}  "
              f"blocked {fo['would_be_blocked']:>3d}  (losers {fo['blocked_losers']:>2d} pnl {fo['blocked_losers_pnl']:>9,.0f} | "
              f"winners {fo['blocked_winners']:>2d} pnl {fo['blocked_winners_pnl']:>9,.0f})  "
              f"allowed: reset {fo['allowed_after_reset']:>2d} lower {fo['allowed_lower_price']:>2d}")

print('\n=== State-machine summary (episode durations, discounts) ===')
for r in sm:
    x = r['extra'].get('state_machine')
    if x:
        print(f"{r['dataset']:14s} {r['config']:14s} episodes {x['losing_exits']:>2d}  restricted sessions total "
              f"{x['sessions_restricted_total']:>6.0f} median {x['sessions_restricted_median']:>5.1f} max {x['sessions_restricted_max']:>5.0f} "
              f"(max {x['days_restricted_max']:>5.0f}d)  reentry discount med {x['reentry_discount_vs_loss_exit_median'] if x['reentry_discount_vs_loss_exit_median'] is None else round(x['reentry_discount_vs_loss_exit_median'],4)}  "
              f"vs losing entry med {x['reentry_vs_losing_entry_median'] if x['reentry_vs_losing_entry_median'] is None else round(x['reentry_vs_losing_entry_median'],4)}  "
              f"resets never saw lower px {x['resets_that_never_got_lower_price']}")
