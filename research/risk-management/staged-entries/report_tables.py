"""Build the markdown tables used in STAGED_ENTRIES.md from results/ (writes tmp/tables.md). Read-only analysis.

Matched-control window statistics come from a complete FixedSize(control size) run evaluated with the frozen
metrics.window_stats (the same control that metrics.matched_control builds)."""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'baseline'))
from engine import FixedSize, run  # noqa: E402
from metrics import BEAR_WINDOWS, RECOVERY_WINDOWS, window_stats  # noqa: E402
RES = HERE / 'results'
DS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CF = ['A_baseline', 'B_staged_two_positive_closes', 'C_staged_3pct_recovery']
SHORT = {'A_baseline': 'A', 'B_staged_two_positive_closes': 'B', 'C_staged_3pct_recovery': 'C'}
S = {(r['config'], r['dataset']): r for r in json.load(open(RES / 'summary.json'))}
L = []


def w(s=''):
    L.append(s)


def f0(x):
    return '—' if x is None or (isinstance(x, float) and np.isnan(x)) else f'{x:,.0f}'


def f2(x):
    return '—' if x is None or (isinstance(x, float) and np.isnan(x)) else f'{x:,.2f}'


def pct(x):
    return '—' if x is None else f'{x:.0%}'


def table(head, rows):
    w('| ' + ' | '.join(head) + ' |')
    w('|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|')
    for r in rows:
        w('| ' + ' | '.join(str(x) for x in r) + ' |')
    w()


def trades(cfg, ds):
    return pd.read_csv(RES / 'trades' / f'{ds}__{cfg}.csv')


def positions(cfg, ds):
    return pd.read_csv(RES / 'positions' / f'{ds}__{cfg}.csv')


# ---------------------------------------------------------------- A-C standard metrics
w('## Standard metrics')
for ds in DS:
    w(f'### {ds}')
    rows = []
    M = {c: S[(c, ds)]['metrics'] for c in CF}
    spec = [
        ('Net profit', lambda m: f0(m['net_profit'])),
        ('Realized / unrealized', lambda m: f"{f0(m['realized_profit'])} / {f0(m['unrealized_profit'])}"),
        ('Margin interest', lambda m: f0(m['margin_interest'])),
        ('Closed trades (W/L)', lambda m: f"{m['closed_trades']} ({m['winning_trades']}/{m['losing_trades']})"),
        ('Win rate', lambda m: pct(m['win_rate'])),
        ('Avg win / avg loss', lambda m: f"{f0(m['avg_winning_trade'])} / {f0(m['avg_losing_trade'])}"),
        ('Largest win / loss', lambda m: f"{f0(m['largest_winning_trade'])} / {f0(m['largest_losing_trade'])}"),
        ('Max drawdown', lambda m: f0(m['max_drawdown'])),
        ('Peak → trough', lambda m: f"{m['mdd_peak_date']} → {m['mdd_trough_date']}"),
        ('Profit / max DD', lambda m: f2(m['profit_to_drawdown'])),
        ('Max consecutive losses', lambda m: m['max_consecutive_losses']),
        ('Lowest cumulative P&L', lambda m: f0(m['min_cumulative_pnl'])),
        ('Longest underwater (days)', lambda m: f"{m['longest_underwater_days']}{'' if m['longest_underwater_recovered'] else ' (not recovered)'}"),
        ('Worst day', lambda m: f"{f0(m['worst_day_mtm_change'])} ({m['worst_day_date']})"),
        ('Avg borrowed, all sessions', lambda m: f0(m['avg_borrowed_all_sessions'])),
        ('Avg borrowed, while invested', lambda m: f0(m['avg_borrowed_while_invested'])),
        ('% sessions exposed', lambda m: pct(m['pct_sessions_exposed'])),
        ('Margin dollar-days ($M·d)', lambda m: f"{m['margin_dollar_days'] / 1e6:,.1f}"),
        ('Net profit per $1M dollar-days', lambda m: f0(m['net_profit_per_1m_dollar_days'])),
    ]
    for name, fn in spec:
        rows.append([name] + [fn(M[c]) for c in CF])
    table(['Metric', 'A baseline', 'B two positive closes', 'C 3% recovery'], rows)

# ---------------------------------------------------------------- matched control
w('## Matched-exposure comparison')
rows = []
for ds in DS:
    for c in CF[1:]:
        mc = S[(c, ds)]['matched_control']
        rows.append([ds, SHORT[c], f"{mc['exposure_vs_baseline']:.3f}", f0(mc['control_fixed_size']),
                     f0(mc['experiment_profit']), f0(mc['control_profit']), f0(mc['profit_difference']),
                     f0(mc['experiment_max_drawdown']), f0(mc['control_max_drawdown']), f0(mc['drawdown_difference']),
                     f2(mc['experiment_profit_to_drawdown']), f2(mc['control_profit_to_drawdown']),
                     f2(mc['profit_to_drawdown_difference'])])
table(['Dataset', 'Cfg', 'Exposure', 'Control size', 'Exp profit', 'Ctrl profit', 'Δ profit', 'Exp max DD',
       'Ctrl max DD', 'Δ DD', 'Exp P/DD', 'Ctrl P/DD', 'Δ P/DD'], rows)

# ---------------------------------------------------------------- control-run windows
CTRL = {}
for ds in DS:
    for c in CF[1:]:
        size = S[(c, ds)]['matched_control']['control_fixed_size']
        r = run(ds, FixedSize(size))
        assert abs(r['net'] - S[(c, ds)]['matched_control']['control_profit']) < 1e-6
        CTRL[(c, ds)] = r
w('## Bear and recovery windows: variant vs its matched control (complete FixedSize run)')
rows = []
for ds in DS:
    for kind, W in [('bear', BEAR_WINDOWS), ('recovery', RECOVERY_WINDOWS)]:
        for wk, win in W.items():
            sect = 'bear_windows' if kind == 'bear' else 'recovery_windows'
            if wk not in S[('A_baseline', ds)]['metrics'][sect]:
                continue
            for c in CF[1:]:
                v = S[(c, ds)]['metrics'][sect][wk]
                k = window_stats(CTRL[(c, ds)], win)
                rows.append([ds, f'{kind} {wk}', SHORT[c], f0(v['pnl']), f0(k['pnl']), f0(v['pnl'] - k['pnl']),
                             f0(v['max_drawdown']), f0(k['max_drawdown']), f0(v['max_drawdown'] - k['max_drawdown'])])
table(['Dataset', 'Window', 'Cfg', 'Variant P&L', 'Control P&L', 'Δ P&L', 'Variant window DD', 'Control window DD', 'Δ DD'], rows)

# ---------------------------------------------------------------- lot efficiency
w('## Lot-level exposure efficiency')
rows = []
for ds in DS:
    bm = S[('A_baseline', ds)]['metrics']
    for c in CF[1:]:
        e = S[(c, ds)]['extra']
        rows.append([ds, SHORT[c], f"{e['lot1_dollar_days'] / 1e6:,.1f}", f0(e['sum_lot1_pnl']), f0(e['lot1_pnl_per_1m_dollar_days']),
                     f"{e['lot2_dollar_days'] / 1e6:,.1f}", f0(e['sum_lot2_pnl']), f0(e['lot2_pnl_per_1m_dollar_days']),
                     f0(bm['net_profit_per_1m_dollar_days']), e['positions_add_turned_winning_lot1_into_loss']])
table(['Dataset', 'Cfg', 'Lot-1 $M·d', 'Σ lot-1 P&L', 'Lot-1 P&L per $1M·d', 'Lot-2 $M·d', 'Σ lot-2 P&L',
       'Lot-2 P&L per $1M·d', 'Baseline P&L per $1M·d', 'Adds turning a winning lot 1 into a losing position'], rows)

# ---------------------------------------------------------------- bear windows
w('## Bear windows')
rows = []
for ds in DS:
    for wk in ['2000-2002', '2007-2009', '2022']:
        if wk not in S[('A_baseline', ds)]['metrics']['bear_windows']:
            continue
        for c in CF:
            b = S[(c, ds)]['metrics']['bear_windows'][wk]
            base = S[('A_baseline', ds)]['metrics']['bear_windows'][wk]
            rows.append([ds, wk, SHORT[c], f0(b['pnl']), f0(b['pnl'] - base['pnl']) if c != 'A_baseline' else '',
                         f0(b['max_drawdown']), f0(b['interest']), b['trades_closed'], b['losing_trades'],
                         f0(b['largest_loss']), f0(b['avg_borrowed']),
                         f"{f0(b['pnl_of_trades_entered'])} ({b['trades_entered']})"])
table(['Dataset', 'Window', 'Cfg', 'Period P&L', 'Δ vs A', 'Max DD in window', 'Interest', 'Trades closed', 'Losing',
       'Largest loss', 'Avg borrowed', 'P&L of trades entered (n)'], rows)

# ---------------------------------------------------------------- recovery windows
w('## Recovery windows')
rows = []
for ds in DS:
    for wk in ['2003', '2009', '2020', '2023', '2025']:
        if wk not in S[('A_baseline', ds)]['metrics']['recovery_windows']:
            continue
        base = S[('A_baseline', ds)]['metrics']['recovery_windows'][wk]
        for c in CF:
            r = S[(c, ds)]['metrics']['recovery_windows'][wk]
            rel = '' if c == 'A_baseline' else f"{f0(r['pnl'] - base['pnl'])} ({r['pnl'] / base['pnl']:.0%})"
            rel2 = '' if c == 'A_baseline' else f0(r['pnl_of_trades_entered'] - base['pnl_of_trades_entered'])
            rows.append([ds, wk, SHORT[c], f0(r['pnl']), rel, f"{f0(r['pnl_of_trades_entered'])} ({r['trades_entered']})",
                         rel2, f0(r['avg_borrowed'])])
table(['Dataset', 'Window', 'Cfg', 'Period P&L', 'Δ vs A (ratio)', 'P&L of trades entered (n)', 'Δ entered vs A',
       'Avg borrowed'], rows)

# ---------------------------------------------------------------- staged-specific
w('## Staged-entry statistics')
rows = []
for ds in DS:
    for c in CF[1:]:
        e = S[(c, ds)]['extra']
        rows.append([ds, SHORT[c], e['positions'], f"{e['positions_with_second_tranche']} ({e['pct_positions_with_second_tranche']:.0%})",
                     f"{e['avg_sessions_between_purchases']:.2f} / {e['median_sessions_between_purchases']:.0f} / {e['max_sessions_between_purchases']}",
                     f"{e['avg_calendar_days_between_purchases']:.2f} / {e['median_calendar_days_between_purchases']:.0f}",
                     f0(e['avg_final_capital_per_position']), f0(e['avg_capital_deployed_while_invested']),
                     f0(e['avg_capital_deployed_all_sessions'])])
table(['Dataset', 'Cfg', 'Positions', 'With 2nd tranche', 'Sessions to add (mean/median/max)', 'Calendar days (mean/median)',
       'Avg final capital per position', 'Avg borrowed while invested', 'Avg borrowed all sessions'], rows)
rows = []
for ds in DS:
    for c in CF[1:]:
        e = S[(c, ds)]['extra']
        rows.append([ds, SHORT[c], f"{e['avg_add_price_vs_initial']:.4f} ({e['min_add_price_vs_initial']:.3f}–{e['max_add_price_vs_initial']:.3f})",
                     e['adds_below_initial_price'], f"{e['avg_entry_price_vs_initial_with_add'] - 1:+.2%}",
                     f0(e['sum_lot1_pnl']), f0(e['sum_lot2_pnl']), f0(e['sum_lot2_interest']),
                     f"{e['positions_with_add_profitable']}/{e['positions_with_add_losing']}",
                     f0(e['profit_positions_with_add']), f0(e['profit_positions_without_add'])])
table(['Dataset', 'Cfg', 'Add price / initial (mean, range)', 'Adds below initial', 'Avg cost shift (with add)',
       'Σ lot-1 P&L', 'Σ lot-2 P&L', 'Σ lot-2 interest', 'Positions with add W/L', 'P&L of positions with add',
       'P&L of positions without add'], rows)
rows = []
for ds in DS:
    for c in CF[1:]:
        e = S[(c, ds)]['extra']
        bm = e['baseline_match']
        rows.append([ds, SHORT[c], e['positions_with_blocked_activation'], e['total_blocked_activation_sessions'],
                     e['positions_with_extra_activation'], e['loss_exits_caused_by_add'],
                     e['exits_with_stop_blocked_on_exit_session'],
                     f"{bm['positions_with_same_entry_as_baseline']} / {bm['positions_with_same_entry_and_exit']} / "
                     f"{bm['positions_with_same_entry_different_exit']} / {bm['positions_with_entry_not_in_baseline']}",
                     ', '.join(f'{k} {v}' for k, v in e['exit_reasons'].items())])
table(['Dataset', 'Cfg', 'Positions where add blocked activation', 'Blocked sessions', 'Positions where add enabled activation',
       'Loss exits caused by add', 'Exit with stop blocked by add', 'Same entry / same exit / diff exit / new entry',
       'Exit reasons'], rows)

# exit changes of matched positions with an add
w('### Exit changes among positions with the same entry as a baseline trade')
rows = []
for ds in DS:
    for c in CF[1:]:
        p = positions(c, ds)
        m = p[p['base_match'] == True]  # noqa: E712
        ch = m[~m['same_exit'].astype(bool)]
        b = trades('A_baseline', ds).set_index('entry_i')
        bex = ch['entry_i'].map(lambda k: b.loc[k, 'exit_i'] if b.loc[k, 'reason'] != 'open' else 1e9)
        vex = ch['exit_i'].fillna(1e9)
        e_, l_ = int((vex < bex).sum()), int((vex > bex).sum())
        lot1_eff = float((ch['lot1_pnl'] - ch['base_profit'] / 2).sum())
        rows.append([ds, SHORT[c], len(m), int((m['n_lots'] > 1).sum()), len(ch), e_, l_,
                     f0(lot1_eff), f0(float(ch['diff_vs_base'].sum())),
                     f0(float((m.loc[m['same_exit'].astype(bool) & (m['n_lots'] > 1), 'lot2_pnl']
                               - m.loc[m['same_exit'].astype(bool) & (m['n_lots'] > 1), 'base_profit'] / 2).sum()))])
table(['Dataset', 'Cfg', 'Matched positions', 'of which with add', 'Exit changed', 'Earlier exit', 'Later exit',
       'Lot-1 effect of exit change (Σ lot1 − base/2)', 'Σ variant − baseline (changed exits)',
       'Same exit: Σ (lot2 − base/2)'], rows)

# ---------------------------------------------------------------- major winners / losers
for which, key in [('Major baseline winners (net ≥ $10,000)', 'major_baseline_winners'),
                   ('Major baseline losers (net ≤ −$5,000)', 'major_baseline_losers')]:
    w(f'## {which}')
    for ds in DS:
        rows = []
        for c in CF[1:]:
            for r in S[(c, ds)]['extra'][key]:
                rows.append([SHORT[c], f"{r['base_entry']} → {r['base_exit']}", f0(r['base_profit']),
                             (f"{r['var_exit']} ({r['var_reason']})" if r['matched'] else 'no same-entry trade'),
                             r['add_date'] or ('—' if r['matched'] else ''),
                             f"{r['add_ratio']:.3f}" if r['add_ratio'] is not None else '—',
                             r['sessions_to_add'] if r['sessions_to_add'] is not None else '—',
                             f0(r['var_profit']), f0(r['lot1_pnl']), f0(r['lot2_pnl']),
                             f"{f0(r['overlapping_var_profit'])} ({r['overlapping_var_trades']})", f0(r['diff_vs_base'])])
        if rows:
            w(f'### {ds}')
            table(['Cfg', 'Baseline trade', 'Base P&L', 'Variant exit', 'Add date', 'Add / initial', 'Sessions to add',
                   'Variant P&L', 'Lot 1', 'Lot 2', 'Overlapping variant P&L (n)', 'Δ vs base'], rows)
    for c in CF[1:]:
        tot = []
        for ds in DS:
            rr = S[(c, ds)]['extra'][key]
            tot.append(f"{ds}: n={len(rr)}, matched={sum(r['matched'] for r in rr)}, no add={sum(r['matched'] and r['add_date'] is None for r in rr)}, "
                       f"Σbase={f0(sum(r['base_profit'] for r in rr))}, Σoverlapping variant={f0(sum(r['overlapping_var_profit'] for r in rr))}, "
                       f"Σ Δ={f0(sum(r['diff_vs_base'] for r in rr))}")
        w(f'- {SHORT[c]}: ' + '; '.join(tot))
    w()

# ---------------------------------------------------------------- episode decomposition (dependence)
w('## Episode decomposition of variant − control and variant − baseline')
w('Episodes: connected components of overlapping holding intervals across the variant and baseline sequences. '
  'Control P&L of an episode = exposure × baseline P&L (the control is the baseline scaled, same trades).')
w()


def episodes(v, b):
    iv = [(int(r.entry_i), int(r.exit_i) if r.reason != 'open' else 10 ** 9, 'v', float(r.profit), str(r.entry_date)) for r in v.itertuples()]
    iv += [(int(r.entry_i), int(r.exit_i) if r.reason != 'open' else 10 ** 9, 'b', float(r.profit), str(r.entry_date)) for r in b.itertuples()]
    iv.sort()
    eps, cur, hi = [], [], -1
    for x in iv:
        if cur and x[0] > hi:
            eps.append(cur)
            cur, hi = [], -1
        cur.append(x)
        hi = max(hi, x[1])
    if cur:
        eps.append(cur)
    return eps


DEP = {}
for ds in DS:
    b = trades('A_baseline', ds)
    for c in CF[1:]:
        v = trades(c, ds)
        k = S[(c, ds)]['matched_control']['exposure_vs_baseline']
        rows = []
        for ep in episodes(v, b):
            vp = sum(x[3] for x in ep if x[2] == 'v')
            bp = sum(x[3] for x in ep if x[2] == 'b')
            nv, nb = sum(x[2] == 'v' for x in ep), sum(x[2] == 'b' for x in ep)
            start = min(x[4] for x in ep)
            rows.append(dict(start=start, nv=nv, nb=nb, var=vp, base=bp, d_ctrl=vp - k * bp, d_base=vp - bp))
        df = pd.DataFrame(rows)
        DEP[(c, ds)] = df
        tot_c, tot_b = df['d_ctrl'].sum(), df['d_base'].sum()
        mc = S[(c, ds)]['matched_control']
        w(f'### {ds} {SHORT[c]}: Σ Δ vs control {f0(tot_c)} (summary {f0(mc["profit_difference"])}), Σ Δ vs baseline {f0(tot_b)}, '
          f'episodes {len(df)}')
        top = pd.concat([df.nlargest(4, 'd_ctrl'), df.nsmallest(4, 'd_ctrl')])
        table(['Episode start', 'Variant trades', 'Baseline trades', 'Variant P&L', 'Baseline P&L', 'Δ vs control', 'Δ vs baseline'],
              [[r.start, r.nv, r.nb, f0(r.var), f0(r.base), f0(r.d_ctrl), f0(r.d_base)] for r in top.itertuples()])
        srt = df.sort_values('d_ctrl', ascending=False)
        ex1 = tot_c - srt['d_ctrl'].iloc[0]
        ex1n = tot_c - srt['d_ctrl'].iloc[-1]
        w(f'- Δ vs control excluding the single best episode: {f0(ex1)}; excluding the single worst: {f0(ex1n)}; '
          f'positive episodes {int((df["d_ctrl"] > 0).sum())}, negative {int((df["d_ctrl"] < 0).sum())}')
        w()

(HERE / 'tmp').mkdir(exist_ok=True)
(HERE / 'tmp' / 'tables.md').write_text('\n'.join(L) + '\n')
print('\n'.join(L))
