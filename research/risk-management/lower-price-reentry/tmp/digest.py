import json
import pandas as pd

sm = json.load(open('results/summary.json'))
rows = []
for r in sm:
    m, mc, x = r['metrics'], r['matched_control'], r['extra']
    smx = x.get('state_machine', {})
    mt = x.get('matching', {})
    rows.append(dict(ds=r['dataset'], cfg=r['config'], net=m['net_profit'], mdd=m['max_drawdown'],
                     pdd=m['profit_to_drawdown'], trades=m['closed_trades'], w=m['winning_trades'], l=m['losing_trades'],
                     big_loss=m['largest_losing_trade'], consec=m['max_consecutive_losses'],
                     interest=m['margin_interest'], dd_mm=m['margin_dollar_days']/1e6, exposed=m['pct_sessions_exposed'],
                     uw=m['longest_underwater_days'], realized=m['realized_profit'], unreal=m['unrealized_profit'],
                     ctrl_size=mc['control_fixed_size'], ctrl_net=mc['control_profit'], ctrl_mdd=mc['control_max_drawdown'],
                     dprofit=mc['profit_difference'], ddd=mc['drawdown_difference'],
                     pdd_ctrl=mc['control_profit_to_drawdown'],
                     blocked=smx.get('entries_blocked_sessions'), reent=smx.get('lower_price_reentries'),
                     resets=smx.get('recovery_resets'), dual=smx.get('dual_trigger_sessions'),
                     rp_blocks=smx.get('reset_priority_blocks'),
                     missed=mt.get('baseline_entries_missed'), delayed=mt.get('baseline_entries_delayed')))
df = pd.DataFrame(rows)
pd.set_option('display.width', 250)
print(df.round(2).to_string(index=False))
print()
for r in sm:
    if r['config'] == 'A_baseline':
        continue
    x = r['extra']['matching']
    print(r['dataset'], r['config'],
          '| major winners >=10k:', x['major_winners_10k']['n'], 'missed', x['major_winners_10k']['eliminated'],
          'later', x['major_winners_10k']['later'], 'ident', x['major_winners_10k']['identical'],
          '| major rebound winners:', x['major_rebound_winners_10k']['n'], 'missed', x['major_rebound_winners_10k']['eliminated'],
          'later', x['major_rebound_winners_10k']['later'],
          '| repeated losers:', x['repeated_losers']['n'], 'elim', x['repeated_losers']['eliminated'],
          'base pnl', round(x['repeated_losers']['baseline_pnl']), 'var window pnl', round(x['repeated_losers']['variant_window_pnl']))
