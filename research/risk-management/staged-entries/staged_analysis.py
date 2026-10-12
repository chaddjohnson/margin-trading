"""Experiment-specific analysis for staged entries: per-position lot decomposition, stop-activation effects of the
second tranche, and matching to baseline trades. Reads engine results; never changes engine behaviour."""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from engine import SECONDS_PER_DAY, YEAR_SECONDS, Params  # noqa: E402

PRM = Params()
MAJOR_WINNER = 10000.0   # baseline closed trade net profit >= $10,000 (same threshold as SPEC experiment 3)
MAJOR_LOSER = -5000.0    # baseline closed trade net profit <= -$5,000 (fixed before any variant was run)


def _arrays(df):
    return {k: df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low', 'close', 'time']}


def lot_indices(trade, date_to_i):
    """Session indices of the lots of a trade, from the engine's 'lots' column (date@price x investment)."""
    out = []
    for part in str(trade['lots']).split(';'):
        d, rest = part.split('@')
        inv = float(rest.split('x')[1])
        out.append((date_to_i[d], inv))
    return out


def activation_trace(a, entry_i, end_i, lots, exited):
    """Session-by-session stop/activation state for sessions entry_i+1 .. end_i, reconstructed from prices.

    lots: [(index, investment)]. A lot bought at the close of session j counts from session j+1.
    Returns a DataFrame with the stop level known before each session and, for both the aggregate position and
    the initial lot alone (the baseline condition, which is size-independent), whether the stop was active and
    whether the 15-day loss exit condition held at the open.
    """
    o, h, l, c, t = a['open'], a['high'], a['low'], a['close'], a['time']
    c0 = c[entry_i]
    post_high, stop = c0, c0 * (1 - PRM.trail)
    rows = []
    for k in range(entry_i + 1, end_i + 1):
        held = [(j, inv) for j, inv in lots if j < k]
        shares = sum(inv / c[j] for j, inv in held)
        invest = sum(inv for _, inv in held)
        accrued = sum(inv * PRM.rate * (t[k] - t[j]) / YEAR_SECONDS for j, inv in held)
        j0, inv0 = lots[0]
        acc0 = inv0 * PRM.rate * (t[k] - t[j0]) / YEAR_SECONDS
        sh0 = inv0 / c[j0]
        days = (t[k] - t[entry_i]) / SECONDS_PER_DAY
        rows.append(dict(i=k, stop=stop, n_lots=len(held), shares=shares, investment=invest, accrued=accrued,
                         breakeven=(invest + accrued) / shares, breakeven_initial=(inv0 + acc0) / sh0,
                         active_agg=shares * stop - invest - accrued > 0, active_init=sh0 * stop - inv0 - acc0 > 0,
                         loss_exit_agg=days >= PRM.loss_exit_days and shares * o[k] - invest - accrued < 0,
                         loss_exit_init=days >= PRM.loss_exit_days and sh0 * o[k] - inv0 - acc0 < 0,
                         open=o[k], low=l[k], high=h[k], close=c[k]))
        if k == end_i and exited:
            break
        post_high = max(post_high, h[k])
        stop = max(stop, post_high * (1 - PRM.trail))
    return pd.DataFrame(rows)


def positions_table(res, df, base_res=None):
    """One row per position (closed and open) with lot decomposition, add timing and baseline matching."""
    a = _arrays(df)
    t = a['time']
    date_to_i = {str(d.date()): k for k, d in enumerate(df['date'])}
    tr = res['trades']
    btr = base_res['trades'] if base_res is not None else None
    rows = []
    for _, r in tr.iterrows():
        exited = r['reason'] != 'open'
        end_i = int(r['exit_i']) if exited else len(df) - 1
        entry_i = int(r['entry_i'])
        lots = lot_indices(r, date_to_i)
        px = float(r['exit_price'])
        lot_pnl, lot_int = [], []
        for j, inv in lots:
            interest = inv * PRM.rate * (t[end_i] - t[j]) / YEAR_SECONDS
            lot_int.append(interest)
            lot_pnl.append(inv / a['close'][j] * px - inv - interest)
        row = dict(entry_i=entry_i, exit_i=end_i if exited else None, entry_date=r['entry_date'],
                   exit_date=r['exit_date'], reason=r['reason'], initial_price=a['close'][entry_i],
                   n_lots=len(lots), investment=float(r['investment']), avg_entry_price=float(r['avg_entry_price']),
                   exit_price=px, interest=float(r['interest']), profit=float(r['profit']),
                   lot1_interest=lot_int[0], lot1_pnl=lot_pnl[0],
                   lot2_i=None, lot2_date=None, lot2_price=None, add_ratio=None, sessions_to_add=None,
                   days_to_add=None, lot2_interest=0.0, lot2_pnl=0.0,
                   lot_pnl_reconciliation_error=sum(lot_pnl) - float(r['profit']),
                   sessions_held=int(r['sessions_held']), days_held=float(r['days_held']))
        if len(lots) > 1:
            j, _ = lots[1]
            row.update(lot2_i=j, lot2_date=str(df['date'].iloc[j].date()), lot2_price=a['close'][j],
                       add_ratio=a['close'][j] / a['close'][entry_i], sessions_to_add=j - entry_i,
                       days_to_add=(t[j] - t[entry_i]) / SECONDS_PER_DAY, lot2_interest=lot_int[1], lot2_pnl=lot_pnl[1])
        tr_ = activation_trace(a, entry_i, end_i, lots, exited)
        after = tr_[tr_['n_lots'] > 1] if len(lots) > 1 else tr_.iloc[0:0]
        first_init = tr_.loc[tr_['active_init'], 'i']
        first_agg = tr_.loc[tr_['active_agg'], 'i']
        row.update(
            blocked_activation_sessions=int((after['active_init'] & ~after['active_agg']).sum()),
            extra_activation_sessions=int((after['active_agg'] & ~after['active_init']).sum()),
            first_active_session_init=int(first_init.iloc[0]) if len(first_init) else None,
            first_active_session_agg=int(first_agg.iloc[0]) if len(first_agg) else None,
            stop_at_exit=float(tr_['stop'].iloc[-1]) if len(tr_) else None,
            breakeven_at_exit=float(tr_['breakeven'].iloc[-1]) if len(tr_) else None,
            breakeven_initial_at_exit=float(tr_['breakeven_initial'].iloc[-1]) if len(tr_) else None,
            # loss exit at the open that the initial lot alone would not have triggered (the add raised breakeven)
            loss_exit_caused_by_add=bool(exited and r['reason'] == 'maximum hold' and len(lots) > 1
                                         and not bool(tr_['loss_exit_init'].iloc[-1])),
            # aggregate stop inactive on the exit session although the initial lot alone would be active
            exit_session_stop_blocked=bool(len(lots) > 1 and len(tr_) and bool(tr_['active_init'].iloc[-1])
                                           and not bool(tr_['active_agg'].iloc[-1])),
        )
        if btr is not None:
            m = btr[btr['entry_i'] == entry_i]
            if len(m):
                b = m.iloc[0]
                b_exit = None if b['reason'] == 'open' else int(b['exit_i'])
                row.update(base_match=True, base_exit_date=b['exit_date'], base_reason=b['reason'],
                           base_exit_price=float(b['exit_price']), base_profit=float(b['profit']),
                           same_exit=(b_exit == row['exit_i']) and (b['reason'] == row['reason']),
                           diff_vs_base=row['profit'] - float(b['profit']))
            else:
                row.update(base_match=False, base_exit_date=None, base_reason=None, base_exit_price=None,
                           base_profit=None, same_exit=False, diff_vs_base=None)
        rows.append(row)
    return pd.DataFrame(rows)


def overlapping(pos, b_entry, b_exit):
    """Variant positions whose holding interval overlaps the baseline trade's [entry, exit] interval."""
    hi = b_exit if b_exit is not None else 10 ** 9
    ex = pos['exit_i'].fillna(10 ** 9)
    return pos[(pos['entry_i'] <= hi) & (ex >= b_entry)]


def baseline_trade_comparison(pos, base_res, which):
    """Rows for major baseline winners ('win') or losers ('loss') with the corresponding variant trade(s)."""
    b = base_res['trades']
    b = b[b['reason'] != 'open']
    sel = b[b['profit'] >= MAJOR_WINNER] if which == 'win' else b[b['profit'] <= MAJOR_LOSER]
    out = []
    for _, r in sel.iterrows():
        ov = overlapping(pos, int(r['entry_i']), int(r['exit_i']))
        same = ov[ov['entry_i'] == r['entry_i']]
        v = same.iloc[0] if len(same) else None
        out.append(dict(
            base_entry=str(r['entry_date']), base_exit=str(r['exit_date']), base_reason=r['reason'],
            base_entry_price=float(r['entry_price']), base_exit_price=float(r['exit_price']), base_profit=float(r['profit']),
            matched=v is not None,
            var_exit=None if v is None else str(v['exit_date']), var_reason=None if v is None else v['reason'],
            var_exit_price=None if v is None else float(v['exit_price']),
            add_date=None if v is None else v['lot2_date'], add_price=None if v is None else v['lot2_price'],
            add_ratio=None if v is None else v['add_ratio'], sessions_to_add=None if v is None else v['sessions_to_add'],
            avg_entry_price=None if v is None else float(v['avg_entry_price']),
            var_profit=None if v is None else float(v['profit']),
            lot1_pnl=None if v is None else float(v['lot1_pnl']), lot2_pnl=None if v is None else float(v['lot2_pnl']),
            overlapping_var_trades=int(len(ov)), overlapping_var_profit=float(ov['profit'].sum()),
            diff_vs_base=(float(ov['profit'].sum()) - float(r['profit'])),
        ))
    return out


def extra_stats(res, df, base_res):
    pos = positions_table(res, df, base_res)
    added = pos[pos['n_lots'] > 1]
    closed = pos[pos['reason'] != 'open']
    n = len(pos)
    d = res['daily']
    bal = d['borrowed'].to_numpy()
    matched = pos[pos['base_match']]
    same = pos[pos['same_exit']]
    exit_changed = pos[pos['base_match'] & ~pos['same_exit']]
    no_add_same = pos[(pos['n_lots'] == 1) & pos['same_exit']]
    ex = dict(
        positions=int(n), closed_positions=int(len(closed)), open_position_at_end=bool((pos['reason'] == 'open').any()),
        positions_with_second_tranche=int(len(added)),
        pct_positions_with_second_tranche=float(len(added) / n) if n else None,
        closed_positions_with_second_tranche=int((closed['n_lots'] > 1).sum()),
        avg_sessions_between_purchases=float(added['sessions_to_add'].mean()) if len(added) else None,
        median_sessions_between_purchases=float(added['sessions_to_add'].median()) if len(added) else None,
        avg_calendar_days_between_purchases=float(added['days_to_add'].mean()) if len(added) else None,
        median_calendar_days_between_purchases=float(added['days_to_add'].median()) if len(added) else None,
        max_sessions_between_purchases=int(added['sessions_to_add'].max()) if len(added) else None,
        avg_final_capital_per_position=float(pos['investment'].mean()) if n else None,
        avg_capital_deployed_while_invested=float(bal[bal > 0].mean()) if (bal > 0).any() else 0.0,
        avg_capital_deployed_all_sessions=float(bal.mean()),
        avg_add_price_vs_initial=float(added['add_ratio'].mean()) if len(added) else None,
        min_add_price_vs_initial=float(added['add_ratio'].min()) if len(added) else None,
        max_add_price_vs_initial=float(added['add_ratio'].max()) if len(added) else None,
        adds_below_initial_price=int((added['add_ratio'] < 1).sum()) if len(added) else 0,
        avg_entry_price_vs_initial_with_add=float((added['avg_entry_price'] / added['initial_price']).mean()) if len(added) else None,
        sum_lot1_pnl=float(pos['lot1_pnl'].sum()), sum_lot2_pnl=float(pos['lot2_pnl'].sum()),
        sum_lot1_interest=float(pos['lot1_interest'].sum()), sum_lot2_interest=float(pos['lot2_interest'].sum()),
        max_abs_lot_pnl_reconciliation_error=float(pos['lot_pnl_reconciliation_error'].abs().max()) if n else 0.0,
        # dollar-days of each lot = its interest / (rate / 365); P&L per $1M dollar-days of exposure
        lot1_dollar_days=float(pos['lot1_interest'].sum() / (PRM.rate / 365)),
        lot2_dollar_days=float(pos['lot2_interest'].sum() / (PRM.rate / 365)),
        lot1_pnl_per_1m_dollar_days=float(pos['lot1_pnl'].sum() / (pos['lot1_interest'].sum() / (PRM.rate / 365) / 1e6)),
        lot2_pnl_per_1m_dollar_days=(float(pos['lot2_pnl'].sum() / (pos['lot2_interest'].sum() / (PRM.rate / 365) / 1e6))
                                     if pos['lot2_interest'].sum() > 0 else None),
        positions_add_turned_winning_lot1_into_loss=int(((added['lot1_pnl'] > 0) & (added['profit'] < 0)).sum()) if len(added) else 0,
        profit_positions_with_add=float(added['profit'].sum()) if len(added) else 0.0,
        profit_positions_without_add=float(pos.loc[pos['n_lots'] == 1, 'profit'].sum()),
        positions_with_add_profitable=int((added['profit'] > 0).sum()) if len(added) else 0,
        positions_with_add_losing=int((added['profit'] < 0).sum()) if len(added) else 0,
        positions_without_add_losing=int((pos.loc[pos['n_lots'] == 1, 'profit'] < 0).sum()),
        exit_reasons={k: int(v) for k, v in pos['reason'].value_counts().items()},
        positions_with_blocked_activation=int((added['blocked_activation_sessions'] > 0).sum()) if len(added) else 0,
        total_blocked_activation_sessions=int(added['blocked_activation_sessions'].sum()) if len(added) else 0,
        positions_with_extra_activation=int((added['extra_activation_sessions'] > 0).sum()) if len(added) else 0,
        loss_exits_caused_by_add=int(pos['loss_exit_caused_by_add'].sum()),
        exits_with_stop_blocked_on_exit_session=int(pos['exit_session_stop_blocked'].sum()),
        baseline_match=dict(
            positions_with_same_entry_as_baseline=int(len(matched)),
            positions_with_same_entry_and_exit=int(len(same)),
            positions_with_same_entry_different_exit=int(len(exit_changed)),
            positions_with_entry_not_in_baseline=int((~pos['base_match']).sum()),
            baseline_positions=int(len(base_res['trades'])),
            no_add_same_exit_max_abs_dev_from_half_baseline=float(
                (no_add_same['profit'] - no_add_same['base_profit'] / 2).abs().max()) if len(no_add_same) else 0.0,
        ),
        major_baseline_winners=baseline_trade_comparison(pos, base_res, 'win'),
        major_baseline_losers=baseline_trade_comparison(pos, base_res, 'loss'),
        thresholds=dict(major_winner_baseline_profit_ge=MAJOR_WINNER, major_loser_baseline_profit_le=MAJOR_LOSER),
    )
    return ex, pos
