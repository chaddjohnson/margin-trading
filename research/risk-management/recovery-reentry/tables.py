"""Print the report's tables (markdown) from results/. Usage: python tables.py > tmp/tables.md"""
import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
OUT = HERE / 'results'
R = json.load(open(OUT / 'summary.json'))
REC = {(r['dataset'], r['config']): r for r in R}
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CF = ['A_baseline', 'B_two_positive_closes', 'C_close_above_sma10', 'D_recovery_3pct_from_low']
VAR = CF[1:]
SH = {'A_baseline': 'A', 'B_two_positive_closes': 'B', 'C_close_above_sma10': 'C', 'D_recovery_3pct_from_low': 'D'}


def f0(x):
    return '' if x is None or (isinstance(x, float) and pd.isna(x)) else f'{x:,.0f}'


def f2(x):
    return '' if x is None or (isinstance(x, float) and pd.isna(x)) else f'{x:.2f}'


def pct(x):
    return '' if x is None or (isinstance(x, float) and pd.isna(x)) else f'{x:.0%}'


def table(head, rows):
    print('| ' + ' | '.join(head) + ' |')
    print('|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|')
    for r in rows:
        print('| ' + ' | '.join(str(x) for x in r) + ' |')
    print()


def std_metrics():
    print('## 3. Standard metrics\n')
    for ds in DS:
        M = {c: REC[(ds, c)]['metrics'] for c in CF}
        print(f'### {ds}\n')
        rows = [
            ['Net profit'] + [f0(M[c]['net_profit']) for c in CF],
            ['Δ net vs A'] + [f0(M[c]['net_profit'] - M['A_baseline']['net_profit']) for c in CF],
            ['Realized / unrealized'] + [f"{f0(M[c]['realized_profit'])} / {f0(M[c]['unrealized_profit'])}" for c in CF],
            ['Margin interest'] + [f0(M[c]['margin_interest']) for c in CF],
            ['Closed trades (W/L)'] + [f"{M[c]['closed_trades']} ({M[c]['winning_trades']}/{M[c]['losing_trades']})" for c in CF],
            ['Win rate'] + [pct(M[c]['win_rate']) for c in CF],
            ['Avg win / avg loss'] + [f"{f0(M[c]['avg_winning_trade'])} / {f0(M[c]['avg_losing_trade'])}" for c in CF],
            ['Largest win / loss'] + [f"{f0(M[c]['largest_winning_trade'])} / {f0(M[c]['largest_losing_trade'])}" for c in CF],
            ['Max drawdown'] + [f0(M[c]['max_drawdown']) for c in CF],
            ['Peak → trough'] + [f"{M[c]['mdd_peak_date']} → {M[c]['mdd_trough_date']}" for c in CF],
            ['Profit / max DD'] + [f2(M[c]['profit_to_drawdown']) for c in CF],
            ['Max consecutive losses'] + [M[c]['max_consecutive_losses'] for c in CF],
            ['Lowest cumulative P&L'] + [f0(M[c]['min_cumulative_pnl']) for c in CF],
            ['Fell below −$100k'] + [M[c]['fell_below_minus_100k'] for c in CF],
            ['Longest underwater (days)'] + [f"{M[c]['longest_underwater_days']}{'' if M[c]['longest_underwater_recovered'] else ' (not recovered)'}" for c in CF],
            ['Worst day'] + [f"{f0(M[c]['worst_day_mtm_change'])} ({M[c]['worst_day_date']})" for c in CF],
            ['Avg borrowed (all sessions)'] + [f0(M[c]['avg_borrowed_all_sessions']) for c in CF],
            ['% sessions exposed'] + [pct(M[c]['pct_sessions_exposed']) for c in CF],
            ['Margin dollar-days ($M·d)'] + [f"{M[c]['margin_dollar_days'] / 1e6:,.1f}" for c in CF],
            ['Net per $1M dollar-days'] + [f0(M[c]['net_profit_per_1m_dollar_days']) for c in CF],
        ]
        table(['Metric'] + [SH[c] for c in CF], rows)


def matched():
    print('## 4. Matched-exposure control\n')
    rows = []
    for ds in DS:
        for c in VAR:
            m = REC[(ds, c)]['matched_control']
            rows.append([ds, SH[c], f"{m['exposure_vs_baseline']:.3f}", f0(m['control_fixed_size']),
                         f0(m['experiment_profit']), f0(m['control_profit']), f0(m['profit_difference']),
                         f0(m['experiment_max_drawdown']), f0(m['control_max_drawdown']), f0(m['drawdown_difference']),
                         f2(m['experiment_profit_to_drawdown']), f2(m['control_profit_to_drawdown']), f2(m['profit_to_drawdown_difference'])])
    table(['Dataset', 'Cfg', 'Exposure', 'Control size', 'Net', 'Ctrl net', 'Δ net', 'Max DD', 'Ctrl DD', 'Δ DD', 'P/DD', 'Ctrl P/DD', 'Δ P/DD'], rows)


def bears():
    print('## 5. Bear windows\n')
    rows = []
    for ds in DS:
        for w in REC[(ds, 'A_baseline')]['metrics']['bear_windows']:
            a = REC[(ds, 'A_baseline')]['metrics']['bear_windows'][w]
            for c in CF:
                b = REC[(ds, c)]['metrics']['bear_windows'][w]
                rows.append([ds, w, SH[c], f0(b['pnl']), f0(b['pnl'] - a['pnl']), f0(b['max_drawdown']), f0(b['max_drawdown'] - a['max_drawdown']),
                             f0(b['interest']), b['trades_closed'], b['losing_trades'], f0(b['largest_loss']), f0(b['avg_borrowed'])])
    table(['Dataset', 'Window', 'Cfg', 'Period P&L', 'Δ vs A', 'Max DD in window', 'Δ DD vs A', 'Interest', 'Closed', 'Losing', 'Largest loss', 'Avg borrowed'], rows)


def recoveries():
    print('## 6. Recovery windows\n')
    rows = []
    for ds in DS:
        for w in REC[(ds, 'A_baseline')]['metrics']['recovery_windows']:
            a = REC[(ds, 'A_baseline')]['metrics']['recovery_windows'][w]
            for c in CF:
                b = REC[(ds, c)]['metrics']['recovery_windows'][w]
                rows.append([ds, w, SH[c], f0(b['pnl']), f0(b['pnl'] - a['pnl']), f"{f0(b['pnl_of_trades_entered'])} ({b['trades_entered']})",
                             f0(b['max_drawdown']), f0(b['avg_borrowed'])])
    table(['Dataset', 'Window', 'Cfg', 'Period P&L', 'Δ vs A', 'P&L of trades entered (n)', 'Max DD in window', 'Avg borrowed'], rows)


def questions():
    print('## 7. Experiment questions\n')
    print('### 7.1a Confirmation events (variant path)\n')
    rows = []
    for ds in DS:
        for c in VAR:
            x = REC[(ds, c)]['extra']['confirmation']
            rows.append([ds, SH[c], x['losing_exits'], f"{x['sessions_to_confirm_mean']:.1f} / {x['sessions_to_confirm_median']:.0f} / {x['sessions_to_confirm_max']:.0f}",
                         x['events_first_signal_blocked'], x['blocked_signal_sessions'],
                         f"{x['mean_sessions_first_signal_to_entry_when_blocked']:.1f}", f"{x['median_entry_vs_first_signal_close_when_blocked']:+.1%}",
                         f"{x['blocked_events_entered_on_confirmation_session']} / {x['blocked_events_signal_lapsed']}",
                         f"{x['signal_lapsed_median_sessions_first_signal_to_entry']:g} / {x['signal_lapsed_max_sessions_first_signal_to_entry']:g}",
                         x['signal_lapsed_entries_more_than_10pct_above_first_signal_close'], x['losing_exits_with_loss_under_1000'],
                         x['events_never_reentered']])
    table(['Dataset', 'Cfg', 'Losing exits', 'Sessions exit→confirm (mean/med/max)', 'Events with first signal blocked',
           'Blocked signal sessions', 'Mean sessions first signal→entry (blocked events)', 'Median entry close vs first-signal close',
           'Blocked: entered on confirming session / signal lapsed', 'Lapsed: median / max sessions to entry', 'Lapsed entries >10% above first-signal close',
           'Losing exits with loss < $1k', 'No re-entry by end'], rows)
    print('### 7.1b Entry matching against the baseline\n')
    rows = []
    for ds in DS:
        for c in VAR:
            m = REC[(ds, c)]['extra']['matching']
            g = m['by_classification']
            rows.append([ds, SH[c], m['baseline_trades'], g['identical']['n'],
                         f"{g['later entry']['n']} ({g['later entry']['by_reason']['blocked']}/{g['later entry']['by_reason']['holding']}/{g['later entry']['by_reason']['exited']})",
                         f"{g['no entry']['n']} ({g['no entry']['by_reason']['blocked']}/{g['no entry']['by_reason']['holding']}/{g['no entry']['by_reason']['exited']})",
                         m['variant_trades'], m['variant_entries_not_on_a_baseline_entry']])
    table(['Dataset', 'Cfg', 'Baseline trades', 'Identical', 'Later entry (blocked/holding/exited)', 'No entry (blocked/holding/exited)',
           'Variant trades', 'Variant entries not on a baseline entry'], rows)
    print('### 7.1c First-order (baseline path): post-loss baseline entries the rule would block\n')
    rows = []
    for ds in DS:
        for c in VAR:
            s = REC[(ds, c)]['extra']['first_order_shadow']
            rows.append([ds, SH[c], s['baseline_entries_after_a_loss'], s['would_be_blocked'], f"{s['blocked_losers']} ({f0(s['blocked_losers_pnl'])})",
                         f"{s['blocked_winners']} ({f0(s['blocked_winners_pnl'])})", s['allowed_losers'], s['allowed_winners']])
    table(['Dataset', 'Cfg', 'Baseline entries after a loss', 'Would be blocked', 'Blocked losers (P&L)', 'Blocked winners (P&L)', 'Allowed losers', 'Allowed winners'], rows)

    def grp_rows(key, extra_cols):
        rows = []
        for ds in DS:
            for c in VAR:
                g = REC[(ds, c)]['extra']['matching'][key]
                rows.append([ds, SH[c], g['n']] + [g[k] if not isinstance(g[k], float) else f0(g[k]) for k in extra_cols] +
                            [f0(g['baseline_pnl']), f0(g['variant_window_pnl']), f0(g['variant_window_pnl'] - g['baseline_pnl']),
                             g['variant_flat_through_window'], pct(g['mean_coverage'])])
        return rows
    print('### 7.2 Repeated losing trades (baseline losers whose previous baseline trade also lost)\n')
    table(['Dataset', 'Cfg', 'n', 'Eliminated', 'Later', 'Identical', 'Baseline P&L', 'Variant P&L in same windows', 'Δ', 'Variant flat throughout', 'Mean coverage'],
          grp_rows('repeated_losers', ['eliminated', 'later', 'identical']))
    print('All closed baseline losers:\n')
    table(['Dataset', 'Cfg', 'n', 'Baseline P&L', 'Variant P&L in same windows', 'Δ', 'Variant flat throughout', 'Mean coverage'], grp_rows('all_baseline_losers', []))
    print('### 7.3 Profitable rebound entries (baseline winners entered right after a baseline loss)\n')
    table(['Dataset', 'Cfg', 'n', 'Eliminated', 'Later', 'Identical', 'Baseline P&L', 'Variant P&L in same windows', 'Δ', 'Variant flat throughout', 'Mean coverage'],
          grp_rows('rebound_winners', ['eliminated', 'later', 'identical']))
    print('All baseline winners (incl. an open winner at the end):\n')
    table(['Dataset', 'Cfg', 'n', 'Baseline P&L', 'Variant P&L in same windows', 'Δ', 'Variant flat throughout', 'Mean coverage'], grp_rows('all_baseline_winners', []))
    print('### 7.4 Entries delayed by the latch (classification "later entry", reason "blocked")\n')
    rows = []
    for ds in DS:
        for c in VAR:
            m = REC[(ds, c)]['extra']['matching']
            g, w, l_ = m['later_entries_due_to_block'], m['later_entries_due_to_block_winners'], m['later_entries_due_to_block_losers']
            rows.append([ds, SH[c], g['n'], f2(g['mean_delay_sessions']), f"{g['median_entry_price_premium']:+.1%}" if g['median_entry_price_premium'] is not None else '',
                         f"{w['n']}: {f0(w['baseline_pnl'])} → {f0(w['variant_window_pnl'])}", f"{l_['n']}: {f0(l_['baseline_pnl'])} → {f0(l_['variant_window_pnl'])}",
                         f0(g['variant_window_pnl'] - g['baseline_pnl'])])
    table(['Dataset', 'Cfg', 'n', 'Mean delay (sessions)', 'Median entry-price premium', 'Winners: baseline → variant', 'Losers: baseline → variant', 'Net Δ'], rows)
    print('### 7.0 Decomposition of the net difference\n')
    rows = []
    for ds in DS:
        for c in VAR:
            m = REC[(ds, c)]['extra']['matching']
            g = m['by_classification']
            rows.append([ds, SH[c], f0(m['net_difference']),
                         f0(m['all_baseline_winners']['variant_window_pnl'] - m['all_baseline_winners']['baseline_pnl']),
                         f0(m['all_baseline_losers']['variant_window_pnl'] - m['all_baseline_losers']['baseline_pnl']),
                         f0(m['variant_pnl_while_baseline_flat'])])
    table(['Dataset', 'Cfg', 'Net Δ vs A', 'Δ during baseline winners', 'Δ during baseline losers (closed)', 'Variant P&L while baseline flat'], rows)


def recovery_detail():
    print('### 7.6 Recovery participation: baseline trades held in each recovery window (coverage, variant P&L in the same window)\n')
    for ds in DS:
        frames = {c: pd.read_csv(OUT / 'recovery' / f'{ds}__{c}.csv') for c in VAR}
        base = frames[VAR[0]]
        if not len(base):
            continue
        rows = []
        for i, r in base.iterrows():
            row = [r['window'], f"{r['b_entry_date']} → {r['b_exit_date']}", f0(r['b_profit'])]
            for c in VAR:
                q = frames[c].iloc[i]
                assert q['b_entry_date'] == r['b_entry_date']
                d = '' if pd.isna(q['delay_sessions']) else f"+{q['delay_sessions']:.0f}"
                tag = {'identical': 'same', 'later entry': f'late{d}', 'no entry': 'none'}[q['classification']]
                row.append(f"{tag}, {q['v_coverage']:.0%}, {f0(q['v_window_pnl'])}")
            rows.append(row)
        print(f'**{ds}** (cell: entry match, coverage, variant P&L in the baseline trade\'s window)\n')
        table(['Window', 'Baseline trade', 'Baseline P&L'] + [SH[c] for c in VAR], rows)


def dependence():
    print('## 8. Dependence: largest baseline-trade windows by Δ (variant window P&L − baseline P&L)\n')
    for ds in DS:
        for c in VAR:
            m = pd.read_csv(OUT / 'matching' / f'{ds}__{c}.csv')
            tot = REC[(ds, c)]['extra']['matching']['net_difference']
            flat = REC[(ds, c)]['extra']['matching']['variant_pnl_while_baseline_flat']
            neg = m.sort_values('window_diff').head(3)
            pos = m.sort_values('window_diff', ascending=False).head(3)
            fmt = lambda t: '; '.join(f"{r.b_entry_date}→{r.b_exit_date} base {f0(r.b_profit)} var {f0(r.v_window_pnl)} (Δ {f0(r.window_diff)})" for r in t.itertuples())
            print(f"- **{ds} {SH[c]}**: total Δ {f0(tot)}; flat-period P&L {f0(flat)}; worst 3 Δ sum {f0(neg.window_diff.sum())}; best 3 Δ sum {f0(pos.window_diff.sum())}; "
                  f"Δ excluding the single worst window {f0(tot - neg.window_diff.iloc[0])}.")
            print(f"  - worst: {fmt(neg)}")
            print(f"  - best: {fmt(pos)}")
    print()


if __name__ == '__main__':
    std_metrics()
    matched()
    bears()
    recoveries()
    questions()
    recovery_detail()
    dependence()
