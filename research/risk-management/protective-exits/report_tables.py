"""Render the markdown tables used in PROTECTIVE_EXITS.md from results/summary.json (no new calculations of
standard metrics; experiment-specific numbers come from each record's `extra`).

Usage: PYTHONDONTWRITEBYTECODE=1 <python> report_tables.py > tmp/tables.md
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = json.load(open(HERE / 'results' / 'summary.json'))
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CF = ['A_baseline', 'B_protective_stop_8pct', 'C_protective_stop_10pct', 'D_early_deterioration_5pct_5sessions']
SHORT = {'A_baseline': 'A', 'B_protective_stop_8pct': 'B 8%', 'C_protective_stop_10pct': 'C 10%',
         'D_early_deterioration_5pct_5sessions': 'D 5%/5s'}
REC = {(r['config'], r['dataset']): r for r in R}


def n0(x):
    return '–' if x is None else f'{x:,.0f}'


def n2(x):
    return '–' if x is None else f'{x:.2f}'


def pct(x):
    return '–' if x is None else f'{100 * x:.0f}%'


def sgn(x):
    return '–' if x is None else f'{x:+,.0f}'


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|']
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def standard():
    print('## Standard metrics\n')
    for ds in DS:
        ms = [REC[(c, ds)]['metrics'] for c in CF]
        rows = [
            ['Net profit'] + [n0(m['net_profit']) for m in ms],
            ['Δ net vs A'] + [sgn(m['net_profit'] - ms[0]['net_profit']) for m in ms],
            ['Realized / unrealized'] + [f"{n0(m['realized_profit'])} / {n0(m['unrealized_profit'])}" for m in ms],
            ['Margin interest'] + [n0(m['margin_interest']) for m in ms],
            ['Closed trades (W/L)'] + [f"{m['closed_trades']} ({m['winning_trades']}/{m['losing_trades']})" for m in ms],
            ['Win rate'] + [pct(m['win_rate']) for m in ms],
            ['Avg win / avg loss'] + [f"{n0(m['avg_winning_trade'])} / {n0(m['avg_losing_trade'])}" for m in ms],
            ['Largest win / loss'] + [f"{n0(m['largest_winning_trade'])} / {n0(m['largest_losing_trade'])}" for m in ms],
            ['Max drawdown'] + [n0(m['max_drawdown']) for m in ms],
            ['Max DD / $100k'] + [pct(m['max_drawdown_pct_of_100k']) for m in ms],
            ['Peak → trough'] + [f"{m['mdd_peak_date']} → {m['mdd_trough_date']}" for m in ms],
            ['Profit / max DD'] + [n2(m['profit_to_drawdown']) for m in ms],
            ['Max consecutive losses'] + [m['max_consecutive_losses'] for m in ms],
            ['Lowest cumulative P&L'] + [n0(m['min_cumulative_pnl']) for m in ms],
            ['Fell below −$100k'] + [m['fell_below_minus_100k'] for m in ms],
            ['Longest underwater (days)'] + [f"{m['longest_underwater_days']}{'' if m['longest_underwater_recovered'] else ' (nr)'}" for m in ms],
            ['Worst day'] + [f"{n0(m['worst_day_mtm_change'])} ({m['worst_day_date']})" for m in ms],
            ['Avg borrowed (all sessions)'] + [n0(m['avg_borrowed_all_sessions']) for m in ms],
            ['% sessions exposed'] + [pct(m['pct_sessions_exposed']) for m in ms],
            ['Margin dollar-days ($M·d)'] + [f"{m['margin_dollar_days'] / 1e6:,.1f}" for m in ms],
            ['Net per $1M dollar-days'] + [n0(m['net_profit_per_1m_dollar_days']) for m in ms],
        ]
        print(f'### {ds}\n')
        print(table(['Metric'] + [SHORT[c] for c in CF], rows) + '\n')


def matched():
    print('## Matched-exposure control\n')
    rows = []
    for ds in DS:
        for c in CF[1:]:
            mc = REC[(c, ds)]['matched_control']
            rows.append([ds, SHORT[c], f"{mc['exposure_vs_baseline']:.3f}", n0(mc['control_fixed_size']),
                         n0(mc['experiment_profit']), n0(mc['control_profit']), sgn(mc['profit_difference']),
                         n0(mc['experiment_max_drawdown']), n0(mc['control_max_drawdown']), sgn(mc['drawdown_difference']),
                         n2(mc['experiment_profit_to_drawdown']), n2(mc['control_profit_to_drawdown']),
                         f"{mc['profit_to_drawdown_difference']:+.2f}"])
    print(table(['Dataset', 'Config', 'Exposure', 'Control size', 'Profit', 'Ctrl profit', 'Δ profit', 'Max DD',
                 'Ctrl DD', 'Δ DD', 'P/DD', 'Ctrl P/DD', 'Δ P/DD'], rows) + '\n')


def bears():
    print('## Bear windows\n')
    rows = []
    for ds in DS:
        for w in REC[('A_baseline', ds)]['metrics']['bear_windows']:
            for c in CF:
                b = REC[(c, ds)]['metrics']['bear_windows'][w]
                e = REC[(c, ds)]['extra']['bear_windows'][w]
                rows.append([ds, w, SHORT[c], n0(b['pnl']), n0(b['max_drawdown']), n0(b['interest']), b['trades_closed'],
                             b['losing_trades'], n0(b['largest_loss']), n0(e['avg_loss']), n0(e['sum_of_losses']),
                             n0(e['sum_of_wins']), e['protective_exits'], n0(b['avg_borrowed'])])
    print(table(['Dataset', 'Window', 'Config', 'Period P&L', 'Max DD in window', 'Interest', 'Closed', 'Losing',
                 'Largest loss', 'Avg loss', 'Sum of losses', 'Sum of wins', 'Prot. exits', 'Avg borrowed'], rows) + '\n')


def recoveries():
    print('## Recovery windows\n')
    rows = []
    for ds in DS:
        for w in REC[('A_baseline', ds)]['metrics']['recovery_windows']:
            a = REC[('A_baseline', ds)]['metrics']['recovery_windows'][w]
            for c in CF:
                r = REC[(c, ds)]['metrics']['recovery_windows'][w]
                rows.append([ds, w, SHORT[c], n0(r['pnl']), sgn(r['pnl'] - a['pnl']),
                             f"{n0(r['pnl_of_trades_entered'])} ({r['trades_entered']})",
                             sgn(r['pnl_of_trades_entered'] - a['pnl_of_trades_entered']), n0(r['max_drawdown'])])
    print(table(['Dataset', 'Window', 'Config', 'Period P&L', 'Δ vs A', 'P&L of trades entered (n)', 'Δ vs A', 'Max DD in window'], rows) + '\n')


def questions():
    print('## Q1 protective exits\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            e = REC[(c, ds)]['extra']
            p = e['protective_exits']
            rows.append([SHORT[c], ds, p['count'], f"{p['gap_fills_at_open']} / {p['intraday_fills_at_level']}", n0(p['total_pnl']),
                         n0(p['avg_pnl']), n0(p['largest_loss']), pct(p['avg_return_pct']) if p['avg_return_pct'] is not None else '–',
                         n2(p['avg_sessions_held']), len(e['coincident_protective_triggers']),
                         ', '.join(f"{k} {v}" for k, v in e['exit_reasons'].items())])
    print(table(['Config', 'Dataset', 'Exits', 'Gap / intraday', 'Total P&L', 'Avg', 'Largest loss', 'Avg exit vs entry',
                 'Avg sessions held', 'Coincident (other reason)', 'All exit reasons'], rows) + '\n')
    print('## cut baseline trades\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            k = REC[(c, ds)]['extra']['cut_baseline_trades']
            rows.append([SHORT[c], ds, k['protective_exits'], k['baseline_flat_at_exit'], k['baseline_trade_later_won'],
                         k['baseline_trade_later_won_10k'], k['baseline_trade_later_lost']])
    print(table(['Config', 'Dataset', 'Prot. exits', 'Baseline flat', 'Baseline trade later won', 'of which ≥$10k', 'Baseline trade later lost'], rows) + '\n')
    print('## Q2 re-entries\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            q = REC[(c, ds)]['extra']['reentry']
            rows.append([SHORT[c], ds, q['protective_exits'], q['reentered_within_5_sessions'], q['reentered_next_session'],
                         pct(q['share_within_5']), q['reentry_below_exit_price'],
                         f"{100 * q['avg_reentry_vs_exit_pct']:+.1f}% / {100 * q['median_reentry_vs_exit_pct']:+.1f}%", n0(q['pnl_of_reentry_trades_within_5']),
                         f"{q['reentry_trades_won']} / {q['reentry_trades_lost']}", q['reentry_trades_protective_again']])
    print(table(['Config', 'Dataset', 'Prot. exits', 'Re-entered ≤5 sessions', 'Next session', 'Share', 'Re-entry price < exit price',
                 'Avg / median re-entry vs exit', 'P&L of those re-entry trades', 'W / L', 'Re-entry ended by prot. stop'], rows) + '\n')
    print('## Q3 repeated stop-outs\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            q = REC[(c, ds)]['extra']['repeated_stopouts']
            longest = [ch for ch in q['chains'] if ch['length'] == q['longest_chain']]
            rows.append([SHORT[c], ds, q['pairs'], q['chains_of_2_or_more'], q['longest_chain'],
                         '; '.join(f"{ch['first_entry']}→{ch['last_exit']} ({n0(ch['total_profit'])})" for ch in longest) or '–'])
    print(table(['Config', 'Dataset', 'Consecutive pairs', 'Chains ≥2', 'Longest chain', 'Longest chain(s): span (total P&L)'], rows) + '\n')
    print('## all chains\n')
    for c in CF[1:]:
        for ds in DS:
            q = REC[(c, ds)]['extra']['repeated_stopouts']
            print(f"- {SHORT[c]} {ds}: " + '; '.join(f"{ch['length']}× {ch['first_entry']}→{ch['last_exit']} ({n0(ch['total_profit'])})" for ch in q['chains']))
    print()
    print('## Q5 interrupted major winners\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            for w in REC[(c, ds)]['extra']['interrupted_major_winners']:
                rows.append([SHORT[c], ds, f"{w['baseline_entry']}→{w['baseline_exit']}", n0(w['baseline_profit']),
                             ', '.join(w['protective_exit_dates']) + (' (missed entry)' if w['missed_baseline_entry'] else ''),
                             '; '.join(f"{v['entry']}→{v['exit']} {v['reason']} {n0(v['profit'])}" for v in w['variant_trades']),
                             n0(w['variant_overlapping_profit']), sgn(w['difference'])])
    print(table(['Config', 'Dataset', 'Baseline winner', 'Baseline P&L', 'Protective exit(s)', 'Overlapping variant trades',
                 'Variant P&L', 'Δ'], rows) + '\n')
    print('## all major baseline winners\n')
    rows = []
    for ds in DS:
        for c in CF[1:]:
            for w in REC[(c, ds)]['extra']['all_major_baseline_winners']:
                if w['status'] != 'identical':
                    rows.append([SHORT[c], ds, f"{w['baseline_entry']}→{w['baseline_exit']}", n0(w['baseline_profit']), w['status'],
                                 '; '.join(w['variant_trades']), n0(w['variant_overlapping_profit']), sgn(w['difference'])])
    print(table(['Config', 'Dataset', 'Baseline winner', 'Baseline P&L', 'Status', 'Overlapping variant trades', 'Variant P&L', 'Δ'], rows) + '\n')
    rows = []
    for ds in DS:
        for c in CF[1:]:
            ws = REC[(c, ds)]['extra']['all_major_baseline_winners']
            rows.append([SHORT[c], ds, len(ws), sum(w['status'] == 'identical' for w in ws), sum(w['status'] == 'interrupted' for w in ws),
                         sum(w['status'] == 'displaced' for w in ws)])
    print(table(['Config', 'Dataset', 'Baseline winners ≥$10k', 'Identical', 'Interrupted', 'Displaced'], rows) + '\n')
    print('## Q6 financing\n')
    rows = []
    for ds in DS:
        for c in CF:
            fz = REC[(c, ds)]['extra']['financing'] if c != 'A_baseline' else None
            m = REC[(c, ds)]['metrics']
            gross = m['net_profit'] + m['margin_interest']
            a = REC[('A_baseline', ds)]['metrics']
            rows.append([ds, SHORT[c], n0(gross), sgn(gross - a['net_profit'] - a['margin_interest']), n0(m['margin_interest']),
                         sgn(m['margin_interest'] - a['margin_interest']), n0(m['net_profit']), sgn(m['net_profit'] - a['net_profit']),
                         n0(m['max_drawdown']), sgn(m['max_drawdown'] - a['max_drawdown']), n2(m['profit_to_drawdown'])])
    print(table(['Dataset', 'Config', 'Gross (before interest)', 'Δ vs A', 'Interest', 'Δ vs A', 'Net', 'Δ vs A', 'Max DD', 'Δ vs A', 'P/DD'], rows) + '\n')


def episodes():
    print('## Divergence episodes\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            dv = REC[(c, ds)]['extra']['divergence']
            eps = dv['episode_list']
            worst = eps[0] if eps else None
            neg = sum(e['delta'] for e in eps if e['delta'] < 0)
            pos = sum(e['delta'] for e in eps if e['delta'] > 0)
            rows.append([SHORT[c], ds, sgn(dv['net_difference_vs_baseline']), dv['episodes'], f"{dv['episodes_worse']} / {dv['episodes_better']}",
                         sgn(neg), sgn(pos), f"{worst['start']}→{worst['end']} {sgn(worst['delta'])}" if worst else '–',
                         f"{eps[-1]['start']}→{eps[-1]['end']} {sgn(eps[-1]['delta'])}" if eps and eps[-1]['delta'] > 0 else '–'])
    print(table(['Config', 'Dataset', 'Net Δ', 'Episodes', 'Worse / better', 'Sum of worse', 'Sum of better', 'Worst episode', 'Best episode'], rows) + '\n')
    print('\n## Concentration of the net difference\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            dv = REC[(c, ds)]['extra']['divergence']
            eps = sorted(dv['episode_list'], key=lambda e: e['delta'])
            tot = dv['net_difference_vs_baseline']
            w1 = eps[0]['delta'] if eps else 0
            w3 = sum(e['delta'] for e in eps[:3])
            crash = sum(e['delta'] for e in eps if e['start'][:7] in ('2020-02', '2020-03') or e['start'][:7] in ('2008-09', '2008-10', '2008-11'))
            rows.append([SHORT[c], ds, sgn(tot), sgn(w1), sgn(tot - w1), sgn(w3), sgn(tot - w3), sgn(crash), sgn(tot - crash)])
    print(table(['Config', 'Dataset', 'Net Δ', 'Worst episode', 'Net Δ excl. worst', 'Worst 3', 'Net Δ excl. worst 3',
                 'Episodes starting Sep–Nov 2008 or Feb–Mar 2020', 'Net Δ excl. those'], rows) + '\n')
    print('## First-trade vs sequence effect\n')
    rows = []
    for c in CF[1:]:
        for ds in DS:
            dv = REC[(c, ds)]['extra']['divergence']
            rows.append([SHORT[c], ds, sgn(dv['net_difference_vs_baseline']), dv['episodes'], dv['first_trades_protective'],
                         f"{dv['first_trade_stop_saved']} / {dv['first_trade_stop_cost']}", sgn(dv['sum_first_trade_effect']), sgn(dv['sum_sequence_effect'])])
    print(table(['Config', 'Dataset', 'Net Δ', 'Episodes', 'First trade ended by prot. stop', 'Stop saved / cost on that trade',
                 'Σ first-trade effect', 'Σ sequence (re-entry) effect'], rows) + '\n')
    print('## Bear-window tally (variant vs A)\n')
    rows = []
    for c in CF[1:]:
        pnl_w = dd_w = ll_b = sl_w = nl_w = tot = 0
        for ds in DS:
            for w, e in REC[(c, ds)]['extra']['bear_windows'].items():
                tot += 1
                pnl_w += e['period_pnl'] < e['baseline_period_pnl']
                dd_w += e['max_drawdown'] > e['baseline_max_drawdown']
                ll_b += e['largest_loss'] > e['baseline_largest_loss']
                sl_w += e['sum_of_losses'] < e['baseline_sum_of_losses']
                nl_w += e['losing_trades'] > e['baseline_losing_trades']
        rows.append([SHORT[c], tot, ll_b, nl_w, sl_w, pnl_w, dd_w])
    print(table(['Config', 'Windows', 'Largest loss smaller', 'More losing trades', 'Larger sum of losses', 'Worse period P&L', 'Larger window DD'], rows) + '\n')
    for c in CF[1:]:
        for ds in DS:
            eps = REC[(c, ds)]['extra']['divergence']['episode_list']
            print(f"\n### {SHORT[c]} {ds}")
            for e in eps:
                if abs(e['delta']) >= 3000:
                    print(f"- {e['start']}→{e['end']}{' (open)' if e['ends_open'] else ''}: Δ {sgn(e['delta'])} (variant {n0(e['variant_profit'])} in {e['variant_trades']} trades, "
                          f"{e['variant_protective_exits']} prot.; baseline {n0(e['baseline_profit'])} in {e['baseline_trades']}) | B: {' / '.join(e['baseline_trade_list'])} | V: {' / '.join(e['variant_trade_list'])}")


if __name__ == '__main__':
    standard()
    matched()
    bears()
    recoveries()
    questions()
    episodes()
