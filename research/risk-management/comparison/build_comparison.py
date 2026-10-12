"""Build the data-driven tables for COMPARISON.md from every experiment's results/summary.json and daily
series. Writes comparison/comparison_tables.md and comparison/all_results.csv."""

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATASETS = ['QQQ_1999_2015', 'VGT_2005_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
ROWS = [
    ('Baseline', 'baseline', 'baseline'),
    ('SMA sizing', 'sma-sizing', 'B_bearish_sma200_sizing'),
    ('Circuit breaker', 'circuit-breaker', 'B_drawdown_tiers'),
    ('Protective stop 8%', 'protective-exits', 'B_protective_stop_8pct'),
    ('Protective stop 10%', 'protective-exits', 'C_protective_stop_10pct'),
    ('Early deterioration exit', 'protective-exits', 'D_early_deterioration_5pct_5sessions'),
    ('Two positive closes', 'recovery-reentry', 'B_two_positive_closes'),
    ('Recovery above SMA10', 'recovery-reentry', 'C_close_above_sma10'),
    ('Recovery 3% from low', 'recovery-reentry', 'D_recovery_3pct_from_low'),
    ('Staged: two positive closes', 'staged-entries', 'B_staged_two_positive_closes'),
    ('Staged: 3% recovery', 'staged-entries', 'C_staged_3pct_recovery'),
]


def load():
    recs = {}
    for label, d, cfg in ROWS:
        for r in json.load(open(ROOT / d / 'results' / 'summary.json')):
            if r['config'] == cfg:
                daily = pd.read_csv(ROOT / d / 'results' / 'daily' / f"{r['dataset']}__{cfg}.csv", parse_dates=['date'])
                recs[(label, r['dataset'])] = (r, daily)
    return recs


def f0(x):
    return '—' if x is None else f'{x:,.0f}'


def f2(x):
    return '—' if x is None else f'{x:.2f}'


if __name__ == '__main__':
    recs = load()
    L, flat = [], []
    L.append('## A. Results by dataset\n')
    L.append('Net profit includes the unrealized P&L of an open final position. Exposure = margin dollar-days relative to the '
             'baseline. Matched control = an independent full baseline run with a fixed size giving the same dollar-days; its '
             'profit/DD always equals the baseline ratio.\n')
    for ds in DATASETS:
        L.append(f'### {ds}\n')
        L.append('| Strategy | Net profit | Max DD | Profit/DD | Avg borrowed (all sessions) | Exposure vs baseline | Matched-control profit | Matched-control DD | Profit − control | DD − control | Lowest cum. P&L | Longest underwater (days) |')
        L.append('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
        for label, _, _ in ROWS:
            if (label, ds) not in recs:
                L.append(f'| {label} | missing |')
                continue
            r, _ = recs[(label, ds)]
            m, mc = r['metrics'], r['matched_control']
            L.append(f"| {label} | {f0(m['net_profit'])} | {f0(m['max_drawdown'])} | {f2(m['profit_to_drawdown'])} | "
                     f"{f0(m['avg_borrowed_all_sessions'])} | {mc['exposure_vs_baseline']:.0%} | {f0(mc['control_profit'])} | "
                     f"{f0(mc['control_max_drawdown'])} | {mc['profit_difference']:+,.0f} | {mc['drawdown_difference']:+,.0f} | "
                     f"{f0(m['min_cumulative_pnl'])} | {m['longest_underwater_days']}{'' if m['longest_underwater_recovered'] else '*'} |")
            flat.append(dict(strategy=label, dataset=ds, net=m['net_profit'], mdd=m['max_drawdown'], ratio=m['profit_to_drawdown'],
                             exposure=mc['exposure_vs_baseline'], control_net=mc['control_profit'], control_mdd=mc['control_max_drawdown'],
                             profit_minus_control=mc['profit_difference'], dd_minus_control=mc['drawdown_difference'],
                             interest=m['margin_interest'], closed=m['closed_trades'], win_rate=m['win_rate'],
                             max_consec_losses=m['max_consecutive_losses'], min_cum_pnl=m['min_cumulative_pnl'],
                             below_minus_100k=m['fell_below_minus_100k'], underwater_days=m['longest_underwater_days'],
                             worst_day=m['worst_day_mtm_change'], avg_borrowed=m['avg_borrowed_all_sessions'],
                             avg_borrowed_invested=m['avg_borrowed_while_invested'], pct_exposed=m['pct_sessions_exposed'],
                             profit_per_1m_dd=m['net_profit_per_1m_dollar_days']))
        L.append('\n\\* not recovered by the end of the dataset.\n')

    L.append('## B. Bear markets (calendar windows): period P&L / max drawdown inside the window\n')
    bears = [('QQQ_1999_2015', '2000-2002'), ('QQQ_1999_2015', '2007-2009'), ('VGT_2005_2015', '2007-2009'),
             ('VGT_2016_2026', '2022'), ('QQQ_2016_2026', '2022')]
    L.append('| Strategy | ' + ' | '.join(f'{ds} {w}' for ds, w in bears) + ' |')
    L.append('|---|' + '---:|' * len(bears))
    for label, _, _ in ROWS:
        cells = []
        for ds, w in bears:
            b = recs[(label, ds)][0]['metrics']['bear_windows'][w]
            cells.append(f"{b['pnl']:,.0f} / {b['max_drawdown']:,.0f}")
        L.append(f'| {label} | ' + ' | '.join(cells) + ' |')
    L.append('\nInterest paid inside each bear window and trades closed / losing:\n')
    L.append('| Strategy | ' + ' | '.join(f'{ds} {w}' for ds, w in bears) + ' |')
    L.append('|---|' + '---:|' * len(bears))
    for label, _, _ in ROWS:
        cells = []
        for ds, w in bears:
            b = recs[(label, ds)][0]['metrics']['bear_windows'][w]
            cells.append(f"{b['interest']:,.0f}; {b['trades_closed']}/{b['losing_trades']}")
        L.append(f'| {label} | ' + ' | '.join(cells) + ' |')

    L.append('\n## C. Recovery participation: period P&L in each recovery window (and % of baseline)\n')
    recs_w = [('QQQ_1999_2015', '2003'), ('QQQ_1999_2015', '2009'), ('VGT_2005_2015', '2009'), ('VGT_2016_2026', '2020'),
              ('QQQ_2016_2026', '2020'), ('VGT_2016_2026', '2023'), ('QQQ_2016_2026', '2023'), ('VGT_2016_2026', '2025'),
              ('QQQ_2016_2026', '2025')]
    L.append('| Strategy | ' + ' | '.join(f'{ds[:3]} {w}' for ds, w in recs_w) + ' | Sum | Sum % of baseline |')
    L.append('|---|' + '---:|' * (len(recs_w) + 2))
    base_sum = sum(recs[('Baseline', ds)][0]['metrics']['recovery_windows'][w]['pnl'] for ds, w in recs_w)
    for label, _, _ in ROWS:
        cells, tot = [], 0
        for ds, w in recs_w:
            p = recs[(label, ds)][0]['metrics']['recovery_windows'][w]['pnl']
            bp = recs[('Baseline', ds)][0]['metrics']['recovery_windows'][w]['pnl']
            tot += p
            cells.append(f'{p:,.0f} ({p / bp:.0%})' if bp else f'{p:,.0f}')
        L.append(f'| {label} | ' + ' | '.join(cells) + f' | {tot:,.0f} | {tot / base_sum:.0%} |')

    L.append('\n## D. Exposure-adjusted summary (difference vs the matched fixed-size control)\n')
    L.append('Positive profit difference and negative drawdown difference both favour the experiment. '
             '"Beats control on both" = more profit AND less drawdown than the same-exposure fixed size.\n')
    L.append('| Strategy | ' + ' | '.join(f'{ds}: Δprofit / ΔDD' for ds in DATASETS) + ' | Datasets beating control on both | Datasets with lower DD than baseline |')
    L.append('|---|' + '---:|' * (len(DATASETS) + 2))
    for label, _, _ in ROWS[1:]:
        cells, both, lower = [], 0, 0
        for ds in DATASETS:
            r = recs[(label, ds)][0]
            mc = r['matched_control']
            cells.append(f"{mc['profit_difference']:+,.0f} / {mc['drawdown_difference']:+,.0f}")
            both += mc['profit_difference'] > 0 and mc['drawdown_difference'] < 0
            lower += r['metrics']['max_drawdown'] < recs[('Baseline', ds)][0]['metrics']['max_drawdown']
        L.append(f'| {label} | ' + ' | '.join(cells) + f' | {both}/4 | {lower}/4 |')

    L.append('\n## E. Concentration of the change vs baseline (by calendar year)\n')
    L.append('For each dataset: total P&L difference vs baseline, and the single calendar year contributing the largest absolute '
             'share of the yearly differences (|best year| ÷ Σ|yearly differences|). High shares mean the result rests on one '
             'period.\n')
    L.append('| Strategy | ' + ' | '.join(DATASETS) + ' |')
    L.append('|---|' + '---|' * len(DATASETS))
    for label, _, _ in ROWS[1:]:
        cells = []
        for ds in DATASETS:
            _, d = recs[(label, ds)]
            _, b = recs[('Baseline', ds)]
            ye = d.groupby(d['date'].dt.year)['mtm_pnl'].last().diff().fillna(d.groupby(d['date'].dt.year)['mtm_pnl'].last())
            yb = b.groupby(b['date'].dt.year)['mtm_pnl'].last().diff().fillna(b.groupby(b['date'].dt.year)['mtm_pnl'].last())
            diff = (ye - yb)
            tot = diff.sum()
            top = diff.abs().idxmax()
            share = abs(diff[top]) / diff.abs().sum() if diff.abs().sum() > 0 else 0
            cells.append(f'{tot:+,.0f}; {top}: {diff[top]:+,.0f} ({share:.0%})')
        L.append(f'| {label} | ' + ' | '.join(cells) + ' |')
    (Path(__file__).parent / 'comparison_tables.md').write_text('\n'.join(L) + '\n')
    pd.DataFrame(flat).to_csv(Path(__file__).parent / 'all_results.csv', index=False)
    print('\n'.join(L))
