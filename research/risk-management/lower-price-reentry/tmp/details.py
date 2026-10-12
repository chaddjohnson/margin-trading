import pandas as pd
pd.set_option('display.width', 250)

print('=== Major baseline winners (>=10k): what each variant did ===')
for ds in ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']:
    for cfg in ['B_lower_3pct', 'C_lower_5pct', 'D_lower_8pct']:
        m = pd.read_csv(f'results/matching/{ds}__{cfg}.csv')
        mw = m[m.b_profit >= 10000]
        print(f'\n-- {ds} {cfg}')
        print(mw[['b_entry_date','b_exit_date','b_profit','b_prev_losing','classification','reason_at_entry',
                  'delay_sessions','v_first_entry_date','v_window_pnl','window_diff','v_overlapping_trades']]
              .round(0).to_string(index=False))

print('\n=== Resets followed by a losing entry (did temporary recoveries re-admit losers?) ===')
for ds in ['QQQ_1999_2015', 'VGT_2005_2015', 'VGT_2016_2026', 'QQQ_2016_2026']:
    for cfg in ['B_lower_3pct', 'C_lower_5pct', 'D_lower_8pct']:
        ev = pd.read_csv(f'results/events/{ds}__{cfg}.csv')
        tr = pd.read_csv(f'results/trades/{ds}__{cfg}.csv')
        resets = ev[ev.resolution == 'recovery_reset']
        n_reset_then_loss = 0
        for _, r in resets.iterrows():
            nxt = tr[tr.entry_date > r.resolution_date].head(1)
            if len(nxt) and float(nxt.profit.iloc[0]) < 0:
                n_reset_then_loss += 1
        print(f'{ds:14s} {cfg:14s} resets {len(resets):>2d}  next-trade-after-reset was a loss: {n_reset_then_loss}')

print('\n=== Unresolved episodes at end of data ===')
for ds in ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']:
    for cfg in ['B_lower_3pct', 'C_lower_5pct', 'D_lower_8pct']:
        ev = pd.read_csv(f'results/events/{ds}__{cfg}.csv')
        u = ev[ev.resolution == 'unresolved_at_end']
        if len(u):
            print(f'{ds} {cfg}:')
            print(u[['exit_date','loss','loss_exit_price','ref_high','lower_level','reset_level',
                     'sessions_restricted','blocked_sessions','min_close_in_episode','max_close_in_episode']].round(3).to_string(index=False))
