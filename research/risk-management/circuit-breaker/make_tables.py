"""Print the markdown tables used in CIRCUIT_BREAKER.md from results/summary.json (no computation beyond formatting
and differences). Usage: PYTHONDONTWRITEBYTECODE=1 <python> make_tables.py > tmp/tables.md"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
S = json.load(open(HERE / 'results' / 'summary.json'))
R = {(r['dataset'], r['config']): r for r in S}
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CF = ['A_baseline', 'B_drawdown_tiers']


def f(x, nd=0):
    if x is None:
        return 'n/a'
    if isinstance(x, bool):
        return str(x)
    return f'{x:,.{nd}f}'


def k(x):
    return f'${x / 1000:.0f}k'


def table(header, rows):
    print('| ' + ' | '.join(header) + ' |')
    print('|' + '|'.join('---' if j == 0 else '---:' for j in range(len(header))) + '|')
    for r in rows:
        print('| ' + ' | '.join(str(c) for c in r) + ' |')
    print()


print('## Standard metrics\n')
rows_def = [
    ('Net profit', lambda m: f(m['net_profit'])),
    ('Realized / unrealized', lambda m: f"{f(m['realized_profit'])} / {f(m['unrealized_profit'])}"),
    ('Margin interest', lambda m: f(m['margin_interest'])),
    ('Closed trades (W/L)', lambda m: f"{m['closed_trades']} ({m['winning_trades']}/{m['losing_trades']})"),
    ('Win rate', lambda m: f"{m['win_rate'] * 100:.0f}%"),
    ('Avg win / avg loss', lambda m: f"{f(m['avg_winning_trade'])} / {f(m['avg_losing_trade'])}"),
    ('Largest win / loss', lambda m: f"{f(m['largest_winning_trade'])} / {f(m['largest_losing_trade'])}"),
    ('Max drawdown', lambda m: f(m['max_drawdown'])),
    ('Peak -> trough', lambda m: f"{m['mdd_peak_date']} -> {m['mdd_trough_date']}"),
    ('Profit / max DD', lambda m: f(m['profit_to_drawdown'], 2)),
    ('Max consecutive losses', lambda m: m['max_consecutive_losses']),
    ('Max bear-episode DD', lambda m: f(m['max_bear_episode_drawdown'])),
    ('Lowest cumulative P&L', lambda m: f(m['min_cumulative_pnl'])),
    ('Fell below -$100k', lambda m: m['fell_below_minus_100k']),
    ('Longest underwater (days)', lambda m: f"{m['longest_underwater_days']}{'' if m['longest_underwater_recovered'] else ' (not recovered)'}"),
    ('Worst day', lambda m: f"{f(m['worst_day_mtm_change'])} ({m['worst_day_date']})"),
    ('Avg borrowed (all sessions)', lambda m: f(m['avg_borrowed_all_sessions'])),
    ('Avg borrowed (while invested)', lambda m: f(m['avg_borrowed_while_invested'])),
    ('% sessions exposed', lambda m: f"{m['pct_sessions_exposed'] * 100:.0f}%"),
    ('Margin dollar-days ($M·d)', lambda m: f(m['margin_dollar_days'] / 1e6, 1)),
    ('Net profit per $1M dollar-days', lambda m: f(m['net_profit_per_1m_dollar_days'])),
]
for ds in DS:
    print(f'### {ds}\n')
    table(['Metric', 'A_baseline', 'B_drawdown_tiers'],
          [[name, fn(R[(ds, 'A_baseline')]['metrics']), fn(R[(ds, 'B_drawdown_tiers')]['metrics'])] for name, fn in rows_def])

print('## Matched-exposure control (B vs fixed-size control with equal margin dollar-days)\n')
rows = []
for ds in DS:
    mc = R[(ds, 'B_drawdown_tiers')]['matched_control']
    rows.append([ds, f"{mc['exposure_vs_baseline']:.3f}", f(mc['control_fixed_size']), f(mc['experiment_profit']), f(mc['control_profit']),
                 f(mc['profit_difference']), f(mc['experiment_max_drawdown']), f(mc['control_max_drawdown']), f(mc['drawdown_difference']),
                 f(mc['experiment_profit_to_drawdown'], 2), f(mc['control_profit_to_drawdown'], 2), f(mc['profit_to_drawdown_difference'], 2)])
table(['Dataset', 'Exposure vs A', 'Control size', 'B net', 'Ctrl net', 'Δ net', 'B max DD', 'Ctrl max DD', 'Δ DD (B-ctrl)',
       'B P/DD', 'Ctrl P/DD', 'Δ P/DD'], rows)

print('## Bear windows\n')
rows = []
for ds in DS:
    for w in R[(ds, 'A_baseline')]['metrics']['bear_windows']:
        for cf in CF:
            b = R[(ds, cf)]['metrics']['bear_windows'][w]
            rows.append([ds, w, cf, f(b['pnl']), f(b['max_drawdown']), f(b['interest']), b['trades_closed'], b['losing_trades'],
                         f(b['largest_loss']), f(b['avg_borrowed'])])
table(['Dataset', 'Window', 'Config', 'Period P&L', 'Max DD in window', 'Interest', 'Trades closed', 'Losing', 'Largest loss', 'Avg borrowed'], rows)

print('## Recovery windows\n')
rows = []
for ds in DS:
    for w in R[(ds, 'A_baseline')]['metrics']['recovery_windows']:
        a = R[(ds, 'A_baseline')]['metrics']['recovery_windows'][w]
        b = R[(ds, 'B_drawdown_tiers')]['metrics']['recovery_windows'][w]
        rows.append([ds, w, f(a['pnl']), f(b['pnl']), f(b['pnl'] - a['pnl']), f"{b['pnl'] / a['pnl'] * 100:.0f}%" if a['pnl'] else 'n/a',
                     f"{f(a['pnl_of_trades_entered'])} ({a['trades_entered']})", f"{f(b['pnl_of_trades_entered'])} ({b['trades_entered']})",
                     f(b['avg_borrowed'])])
table(['Dataset', 'Window', 'A period P&L', 'B period P&L', 'B - A', 'B / A', 'A P&L of entries (n)', 'B P&L of entries (n)', 'B avg borrowed'], rows)

print('## Tier time (B; decision tier = drawdown at previous close)\n')
rows = []
for ds in DS:
    for cf in CF:
        tt = R[(ds, cf)]['extra']['tier_time']
        rows.append([ds, cf + (' (implied only)' if cf == 'A_baseline' else '')] +
                    [f"{tt[s]['sessions']} ({tt[s]['pct'] * 100:.1f}%)" for s in ('100000', '75000', '50000', '25000')])
table(['Dataset', 'Config', '$100k', '$75k', '$50k', '$25k'], rows)

print('## Entries per tier (B)\n')
rows = []
for ds in DS:
    ept = R[(ds, 'B_drawdown_tiers')]['extra']['entries_per_tier']
    rows.append([ds] + [f"{ept[s]['entries']} ({ept[s]['wins']}W/{ept[s]['losses']}L, {f(ept[s]['pnl_including_open'])})" for s in ('100000', '75000', '50000', '25000')])
table(['Dataset', '$100k', '$75k', '$50k', '$25k'], rows)

print('## Trap spells (B and A-implied)\n')
rows = []
for ds in DS:
    for cf in CF:
        ts = R[(ds, cf)]['extra']['trap_spells']
        for key in ('reduced_50k_25k', 'tier_25k'):
            L = ts[key]['longest']
            if L:
                rows.append([ds, cf, key, ts[key]['n_spells'], ts[key]['total_sessions'], L['first_session'], L['last_session'],
                             L['first_session_out'] or 'never', L['sessions'], L['calendar_days'], f(L['max_drawdown_in_spell']),
                             ts[key]['all_exited']])
            else:
                rows.append([ds, cf, key, 0, 0, '', '', '', '', '', '', ''])
        rows.append([ds, cf, 'tier at data end', k(ts['tier_at_data_end']), '', '', '', '', '', '', '', ''])
table(['Dataset', 'Config', 'Spell type', 'n spells', 'Total sessions', 'Longest: first session', 'last session', 'first session out',
       'sessions', 'calendar days', 'max DD in spell', 'all exited'], rows)

print('## Drawdown episodes >= $10k\n')
rows = []
for ds in DS:
    for cf in CF:
        for e in R[(ds, cf)]['extra']['drawdown_episodes_ge_10k']:
            rows.append([ds, cf, e['peak_date'], f(e['peak_pnl']), e['trough_date'], f(e['depth']), e['recovery_date'] or 'not recovered',
                         e['peak_to_trough_days'], e['trough_to_recovery_days'], e['peak_to_recovery_days'],
                         e['back_below_10k_dd_date'] or 'never', e['trough_to_back_below_10k_days'] if e['trough_to_back_below_10k_days'] is not None else 'n/a'])
table(['Dataset', 'Config', 'Peak', 'Peak P&L', 'Trough', 'Depth', 'Recovered', 'Peak→trough d', 'Trough→recovery d', 'Peak→recovery d',
       'DD back < $10k', 'Trough→<$10k d'], rows)

print('## Positions held during recovery windows (B)\n')
rows = []
for ds in DS:
    for w, v in R[(ds, 'B_drawdown_tiers')]['extra']['recovery_window_positions'].items():
        for p in v['positions']:
            rows.append([ds, w, f(v['drawdown_at_window_start']), p['entry_date'], p['exit_date'] or 'open', 'yes' if p['entered_in_window'] else 'no',
                         k(p['size']), f(p['profit']), f(p['baseline_profit']), f(p['foregone_vs_baseline'])])
table(['Dataset', 'Window', 'B DD at window start', 'Entry', 'Exit', 'Entered in window', 'B size', 'B P&L', 'A P&L', 'B - A'], rows)

print('## Attribution of B - A by trade (identical trade sequence; B P&L = A P&L x size/$100k)\n')
rows = []
for ds in DS:
    at = R[(ds, 'B_drawdown_tiers')]['extra']['attribution_vs_baseline']
    rows.append([ds, at['reduced_trades'], f(at['total_delta']), f(at['delta_from_losing_baseline_trades']), f(at['delta_from_winning_baseline_trades'])])
table(['Dataset', 'Reduced-size trades', 'Total B - A', 'from A-losing trades (saved)', 'from A-winning trades (forgone)'], rows)
for ds in DS:
    at = R[(ds, 'B_drawdown_tiers')]['extra']['attribution_vs_baseline']
    print(f'### {ds}\n')
    table(['Kind', 'Entry', 'Exit', 'B size', 'A P&L', 'B P&L', 'B - A'],
          [['gain', x['entry_date'], x['exit_date'], k(x['size']), f(x['profit_a']), f(x['profit_b']), f(x['delta'])] for x in at['largest_gains'][:5]] +
          [['cost', x['entry_date'], x['exit_date'], k(x['size']), f(x['profit_a']), f(x['profit_b']), f(x['delta'])] for x in at['largest_costs'][:5]])

print('## Entries per tier with per-$100k profitability (baseline P&L of the same trades)\n')
rows = []
for ds in DS:
    for cf, key in (('B_drawdown_tiers', 'entries_per_tier'), ('A_baseline', 'implied_entries_per_tier')):
        ept = R[(ds, cf)]['extra'][key]
        rows.append([ds, 'B actual tier' if cf != 'A_baseline' else 'A implied tier'] +
                    [f"{ept[s]['entries']}: {f(ept[s]['baseline_pnl'])} ({f(ept[s]['baseline_pnl'] / ept[s]['entries']) if ept[s]['entries'] else 'n/a'}/trade)"
                     for s in ('100000', '75000', '50000', '25000')])
table(['Dataset', 'Grouping', '$100k tier', '$75k tier', '$50k tier', '$25k tier'], rows)

print('## Losing streaks\n')
rows = []
for ds in DS:
    for cf in CF:
        ls = R[(ds, cf)]['extra']['losing_streaks']
        for kind in ('longest', 'costliest'):
            x = ls[kind]
            rows.append([ds, cf, kind, x['n'], f"{x['first_entry']} -> {x['last_exit']}", f(x['total_loss']), '/'.join(k(s) for s in x['sizes'])])
table(['Dataset', 'Config', 'Streak', 'n', 'Span', 'Total loss', 'Sizes'], rows)

print('## Max-drawdown path split by size held at the previous close\n')
rows = []
for ds in DS:
    for cf in CF:
        x = R[(ds, cf)]['extra']['max_dd_by_size_held']
        parts = '; '.join(f"{k(float(s))}: {f(v['mtm_change'])} ({v['sessions']} sess)" for s, v in x['by_size_held'].items() if float(s) > 0)
        rows.append([ds, cf, f"{x['peak']} -> {x['trough']}", f(x['total']), parts])
table(['Dataset', 'Config', 'Peak -> trough', 'Total', 'By size held'], rows)

print('## Checks\n')
rows = []
for ds in DS:
    for cf in CF:
        c = R[(ds, cf)]['extra']['checks']
        rows.append([ds, cf, f"{c['continuity']['max_abs_diff_engine_vs_rebuilt']:.1e}", c['continuity']['exit_sessions'],
                     f"{c['continuity']['max_abs_diff_exit_day_change_vs_price_move']:.1e}", f"{c['continuity']['final_mtm_minus_net']:.1e}",
                     f"{c['continuity']['max_abs_diff_flat_mtm_vs_cum_realized']:.1e}", c['scaling_vs_A']['identical_entry_exit_sequence'],
                     f"{c['scaling_vs_A']['max_abs_profit_scaling_error']:.1e}", len(c['tier']['entries_with_wrong_tier']),
                     f"{c['tier']['max_abs_dd_change_prior_close_to_entry_close']:.1e}"])
table(['Dataset', 'Config', 'max |engine - rebuilt| MTM', 'exit sessions', 'max |exit-day Δ - price move|', 'final MTM - net',
       'max |flat MTM - cum realized|', 'same trades as A', 'max scaling error', 'wrong tiers', 'max DD change prior→entry close'], rows)
