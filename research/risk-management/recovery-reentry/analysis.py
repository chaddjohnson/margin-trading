"""Experiment-specific analysis for recovery-confirmed re-entry (no standard metric is re-implemented here).

Matching variant trades to baseline trades (sequences diverge)
--------------------------------------------------------------
1. Entry matching (which baseline entries were kept, delayed or eliminated).
   With a fixed $100k size, no extra stops and no add-ons, a trade's exit and P&L are a function of its entry
   session alone. So a variant trade that enters on the same session as a baseline trade IS that baseline trade
   (identical exit and P&L; asserted below).
   Each baseline trade k occupies a span [entry_k, end_k], where end_k is its exit session (or the last session if
   it is still open). Spans are disjoint because the engine never re-enters on an exit session. The 10% signal
   depends only on prices, so on any session where the baseline is flat and did not just exit, the baseline
   enters. Hence every variant entry falls inside exactly one baseline span (asserted), and each variant trade is
   ASSIGNED to the span containing its entry session. Each baseline trade is classified:
   - identical: the variant entered on the same session (same trade, same P&L);
   - later entry: the variant's first entry inside the span came later (a delayed counterpart);
   - no entry: the variant made no entry inside the span (the baseline entry is eliminated).
   The variant's state at the baseline entry session says why it did not enter then:
   - blocked: flat, the 10% signal was present, and the latch was not satisfied (direct effect of the rule);
   - holding: still in an earlier, divergent position (indirect effect);
   - exited: it exited that session, and the engine never re-enters on an exit session (indirect effect).
   The P&L of the assigned variant trades (`v_assigned_pnl`) is kept for reference only: a variant trade that
   straddles several baseline trades has its whole P&L attributed to the first span, which creates offsetting
   artifacts (e.g. +$49k on one span, -$51k on the next).

2. P&L comparison by time window (used for every P&L statement in the report).
   The baseline's cumulative mark-to-market P&L changes only while it holds a trade, so baseline trade k's P&L
   equals mtm_base[end_k] - mtm_base[entry_k] (asserted). Over the same window the variant earned
   `v_window_pnl` = mtm_var[end_k] - mtm_var[entry_k] (realized + unrealized - accrued interest, whatever positions
   it held). The remaining variant P&L was earned while the baseline was flat (`variant_pnl_while_baseline_flat`).
   Then, exactly (asserted):
       variant net - baseline net = sum_k (v_window_pnl_k - baseline P&L_k) + variant P&L while baseline flat.
   Coverage = share of the baseline trade's held sessions (closes) at which the variant also held a position.

First-order (shadow) analysis
-----------------------------
On the BASELINE path, for every baseline entry that follows a baseline losing exit at session x, would the rule's
latch have been satisfied by the entry session's close? This measures the rule's selectivity without the path
dependence of the variant run, and complements the variant-path matching.
"""
import numpy as np
import pandas as pd


def _spans(tr, n):
    ent = tr['entry_i'].astype(int).to_numpy()
    ex = tr['exit_i'].to_numpy(dtype=float)
    end = np.where(np.isnan(ex), n - 1, ex).astype(int)
    return ent, ex, end


def _fmt_trade(row):
    ex = row['exit_date'] if isinstance(row['exit_date'], str) or pd.notna(row['exit_date']) else 'open'
    return f"{row['entry_date']}->{ex}:{row['profit']:+.0f}"


def match_to_baseline(base, var, blocked_set):
    """Per-baseline-trade table: entry matching + time-window P&L (see module docstring)."""
    n = len(base['daily'])
    btr, vtr = base['trades'].reset_index(drop=True), var['trades'].reset_index(drop=True)
    b_ent, b_ex, b_end = _spans(btr, n)
    v_ent, v_ex, v_end = _spans(vtr, n)
    v_held = var['daily']['borrowed'].to_numpy() > 0  # holding at the close of each session
    mb, mv = base['daily']['mtm_pnl'].to_numpy(), var['daily']['mtm_pnl'].to_numpy()
    dates = base['daily']['date'].astype(str).to_numpy()
    close = base['daily']['close'].to_numpy()
    assigned = np.full(len(vtr), -1)
    rows = []
    for k in range(len(btr)):
        be, bend, is_open = b_ent[k], b_end[k], bool(np.isnan(b_ex[k]))
        bp = float(btr.loc[k, 'profit'])
        assert abs((mb[bend] - mb[be]) - bp) < 1e-6
        idx = np.flatnonzero((v_ent >= be) & (v_ent <= bend))
        assigned[idx] = k
        if (v_ent == be).any():
            reason = 'same'
            j = int(np.flatnonzero(v_ent == be)[0])
            same_exit = (np.isnan(v_ex[j]) and is_open) or v_ex[j] == b_ex[k]
            assert abs(vtr.loc[j, 'profit'] - bp) < 1e-6 and same_exit, 'identical entry, different trade'
        elif be > 0 and v_held[be - 1]:
            reason = 'exited' if (v_ex == be).any() else 'holding'
        else:
            reason = 'blocked'
            assert be in blocked_set, (dates[be], 'flat with the signal but not recorded as blocked')
        cls = 'identical' if reason == 'same' else ('later entry' if len(idx) else 'no entry')
        prev_losing = k > 0 and btr.loc[k - 1, 'profit'] < 0
        streak, m = 0, k - 1
        while prev_losing and m >= 0 and btr.loc[m, 'profit'] < 0:
            streak, m = streak + 1, m - 1
        first = int(idx[0]) if len(idx) else None
        last_held = bend if is_open else bend - 1
        held = int(v_held[be:last_held + 1].sum())
        ov = np.flatnonzero((v_ent <= bend) & (v_end >= be))
        vw = float(mv[bend] - mv[be])
        rows.append(dict(
            k=k, b_entry_date=dates[be], b_exit_date='open' if is_open else dates[bend], b_last_held_date=dates[last_held],
            b_entry_price=close[be],
            b_profit=bp, b_open=is_open, b_prev_losing=bool(prev_losing), b_losses_before=int(streak),
            reason_at_entry=reason, classification=cls, n_variant_entries_in_span=int(len(idx)),
            v_first_entry_date=dates[v_ent[first]] if first is not None else '',
            v_first_entry_price=close[v_ent[first]] if first is not None else np.nan,
            delay_sessions=int(v_ent[first] - be) if first is not None else np.nan,
            b_sessions=int(last_held - be + 1), v_sessions_held=held, v_coverage=held / (last_held - be + 1),
            v_window_pnl=vw, window_diff=vw - bp,
            v_overlapping_trades=' | '.join(_fmt_trade(vtr.loc[j]) for j in ov),
            v_assigned_pnl=float(vtr.loc[idx, 'profit'].sum()) if len(idx) else 0.0))
    assert (assigned >= 0).all(), 'a variant entry fell outside every baseline span'
    m = pd.DataFrame(rows)
    # variant P&L while the baseline was flat, computed directly over the flat intervals
    flat, prev_end = 0.0, 0
    for k in range(len(btr)):
        flat += mv[b_ent[k]] - mv[prev_end]
        prev_end = b_end[k]
    flat += mv[n - 1] - mv[prev_end]
    m.attrs['variant_pnl_while_baseline_flat'] = float(flat)
    assert abs(m['window_diff'].sum() + flat - (var['net'] - base['net'])) < 1e-6
    assert abs(m['v_assigned_pnl'].sum() - var['net']) < 1e-6
    return m


def shadow(base, rule):
    """First-order: on the baseline path, is each post-loss baseline entry confirmed by its own close?"""
    c = base['daily']['close'].to_numpy()
    dates = base['daily']['date'].astype(str).to_numpy()
    n = len(c)
    tr = base['trades'].reset_index(drop=True)
    rows = []
    for k in range(1, len(tr)):
        prev = tr.loc[k - 1]
        if pd.isna(prev['exit_i']) or prev['profit'] >= 0:
            continue
        x, be = int(prev['exit_i']), int(tr.loc[k, 'entry_i'])
        j = next((j for j in range(x + 1, n) if rule(c, x, j)), None)
        rows.append(dict(k=k, exit_date=dates[x], b_entry_date=dates[be], b_profit=float(tr.loc[k, 'profit']),
                         b_open=bool(pd.isna(tr.loc[k, 'exit_i'])), confirm_date=dates[j] if j is not None else '',
                         sessions_exit_to_confirm=(j - x) if j is not None else np.nan,
                         sessions_exit_to_entry=be - x, allowed=bool(j is not None and j <= be)))
    return pd.DataFrame(rows)


def events_table(strategy, var):
    dates = var['daily']['date'].astype(str).to_numpy()
    close = var['daily']['close'].to_numpy()
    out = []
    for ev in strategy.events:
        x, cj, fs, ei = ev['exit_i'], ev['confirm_i'], ev['first_signal_i'], ev['entry_i']
        out.append(dict(
            exit_date=dates[x], exit_close=close[x], loss=ev['loss'],
            confirm_date=dates[cj] if cj is not None else '', sessions_to_confirm=(cj - x) if cj is not None else np.nan,
            first_signal_date=dates[fs] if fs is not None else '', first_signal_blocked=bool(ev['blocked_signal_sessions'] > 0),
            blocked_signal_sessions=ev['blocked_signal_sessions'],
            blocked_dates=';'.join(dates[b] for b in ev['blocked_is']),
            entry_date=dates[ei] if ei is not None else '', entry_close=close[ei] if ei is not None else np.nan,
            sessions_first_signal_to_entry=(ei - fs) if (ei is not None and fs is not None) else np.nan,
            entry_vs_first_signal_close=(close[ei] / close[fs] - 1) if (ei is not None and fs is not None) else np.nan))
    return pd.DataFrame(out)


def recovery_participation(match, windows, first_date, last_date):
    """Baseline trades held at any close inside each recovery window, with the variant's coverage and window P&L."""
    rows = []
    d0, d1 = pd.Timestamp(first_date).date(), pd.Timestamp(last_date).date()
    for w, (a, b) in windows.items():
        a, b = pd.Timestamp(a).date(), pd.Timestamp(b).date()
        if not (d0 <= a and d1 >= b):
            continue
        for _, r in match.iterrows():
            if pd.Timestamp(r['b_entry_date']).date() > b or pd.Timestamp(r['b_last_held_date']).date() < a:
                continue  # not held at any close inside the window
            rows.append(dict(window=w, b_entry_date=r['b_entry_date'], b_exit_date=r['b_exit_date'], b_profit=r['b_profit'],
                             classification=r['classification'], reason_at_entry=r['reason_at_entry'],
                             delay_sessions=r['delay_sessions'], b_sessions=r['b_sessions'], v_sessions_held=r['v_sessions_held'],
                             v_coverage=r['v_coverage'], v_window_pnl=r['v_window_pnl'], window_diff=r['window_diff'],
                             v_overlapping_trades=r['v_overlapping_trades']))
    return pd.DataFrame(rows)


def summarize(cfg, strategy, base, var, match, shad, ev):
    """Experiment-specific `extra` for summary.json."""
    def s(x):
        return float(x.sum()) if len(x) else 0.0
    if strategy is None:  # A_baseline
        tr = base['trades']
        closed = tr[tr['reason'] != 'open']
        return dict(rule='none (baseline)', losing_exits=int((closed['profit'] < 0).sum()))
    out = dict(rule=type(strategy).rule.__doc__.strip())
    out['confirmation'] = dict(
        losing_exits=int(len(ev)), confirmed=int((ev['confirm_date'] != '').sum()) if len(ev) else 0,
        sessions_to_confirm_mean=float(ev['sessions_to_confirm'].mean()) if len(ev) else None,
        sessions_to_confirm_median=float(ev['sessions_to_confirm'].median()) if len(ev) else None,
        sessions_to_confirm_max=float(ev['sessions_to_confirm'].max()) if len(ev) else None,
        events_first_signal_blocked=int(ev['first_signal_blocked'].sum()) if len(ev) else 0,
        blocked_signal_sessions=int(ev['blocked_signal_sessions'].sum()) if len(ev) else 0,
        events_never_reentered=int((ev['entry_date'] == '').sum()) if len(ev) else 0,
        mean_sessions_first_signal_to_entry_when_blocked=float(ev.loc[ev['first_signal_blocked'], 'sessions_first_signal_to_entry'].mean())
        if len(ev) and ev['first_signal_blocked'].any() else None,
        median_entry_vs_first_signal_close_when_blocked=float(ev.loc[ev['first_signal_blocked'], 'entry_vs_first_signal_close'].median())
        if len(ev) and ev['first_signal_blocked'].any() else None,
        sma10_unavailable_sessions=int(strategy.sma_unavailable),
        losing_exits_with_loss_under_1000=int((ev['loss'] > -1000).sum()) if len(ev) else 0)
    if len(ev) and ev['first_signal_blocked'].any():
        bl = ev[ev['first_signal_blocked']]
        on_conf = bl['entry_date'] == bl['confirm_date']
        lapsed = bl[~on_conf]  # the signal was gone by the confirmation session: entry waited for a NEW 10% signal
        out['confirmation'].update(
            blocked_events_entered_on_confirmation_session=int(on_conf.sum()),
            blocked_events_signal_lapsed=int(len(lapsed)),
            signal_lapsed_median_sessions_first_signal_to_entry=float(lapsed['sessions_first_signal_to_entry'].median()) if len(lapsed) else None,
            signal_lapsed_max_sessions_first_signal_to_entry=float(lapsed['sessions_first_signal_to_entry'].max()) if len(lapsed) else None,
            signal_lapsed_entries_more_than_10pct_above_first_signal_close=int((lapsed['entry_vs_first_signal_close'] > 0.10).sum()))
    cls = {}
    for c in ['identical', 'later entry', 'no entry']:
        sub = match[match['classification'] == c]
        cls[c] = dict(n=int(len(sub)), by_reason={r: int((sub['reason_at_entry'] == r).sum()) for r in ['same', 'blocked', 'holding', 'exited']},
                      baseline_pnl=s(sub['b_profit']), variant_window_pnl=s(sub['v_window_pnl']))
    win, lose, closed = match['b_profit'] > 0, match['b_profit'] < 0, ~match['b_open']
    ne, le = match['classification'] == 'no entry', match['classification'] == 'later entry'
    later_blocked = le & (match['reason_at_entry'] == 'blocked')

    def grp(mask):
        sub = match[mask]
        return dict(n=int(len(sub)), baseline_pnl=s(sub['b_profit']), variant_window_pnl=s(sub['v_window_pnl']),
                    variant_flat_through_window=int((sub['v_sessions_held'] == 0).sum()),
                    mean_coverage=float(sub['v_coverage'].mean()) if len(sub) else None)
    rep = match['b_prev_losing'] & lose & closed
    rebound = match['b_prev_losing'] & win
    out['matching'] = dict(
        baseline_trades=int(len(match)), variant_trades=int(len(var['trades'])),
        variant_entries_not_on_a_baseline_entry=int(len(var['trades']) - (match['classification'] == 'identical').sum()),
        by_classification=cls, net_difference=float(var['net'] - base['net']),
        variant_pnl_while_baseline_flat=match.attrs['variant_pnl_while_baseline_flat'],
        all_baseline_losers=grp(lose & closed), all_baseline_winners=grp(win),
        repeated_losers=dict(grp(rep), eliminated=int((rep & ne).sum()), later=int((rep & le).sum()),
                             identical=int((rep & (match['classification'] == 'identical')).sum())),
        rebound_winners=dict(grp(rebound), eliminated=int((rebound & ne).sum()), later=int((rebound & le).sum()),
                             identical=int((rebound & (match['classification'] == 'identical')).sum())),
        later_entries_due_to_block=dict(grp(later_blocked),
                                        mean_delay_sessions=float(match.loc[later_blocked, 'delay_sessions'].mean()) if later_blocked.any() else None,
                                        median_entry_price_premium=float((match.loc[later_blocked, 'v_first_entry_price'] / match.loc[later_blocked, 'b_entry_price'] - 1).median())
                                        if later_blocked.any() else None),
        later_entries_due_to_block_winners=grp(later_blocked & win),
        later_entries_due_to_block_losers=grp(later_blocked & lose & closed))
    if len(shad):
        bl = ~shad['allowed']
        out['first_order_shadow'] = dict(
            baseline_entries_after_a_loss=int(len(shad)), would_be_blocked=int(bl.sum()),
            blocked_losers=int((bl & (shad['b_profit'] < 0)).sum()), blocked_losers_pnl=s(shad.loc[bl & (shad['b_profit'] < 0), 'b_profit']),
            blocked_winners=int((bl & (shad['b_profit'] > 0)).sum()), blocked_winners_pnl=s(shad.loc[bl & (shad['b_profit'] > 0), 'b_profit']),
            allowed_losers=int((~bl & (shad['b_profit'] < 0)).sum()), allowed_winners=int((~bl & (shad['b_profit'] > 0)).sum()))
    out['events'] = ev.drop(columns=['blocked_dates']).to_dict(orient='records') if len(ev) else []
    return out
