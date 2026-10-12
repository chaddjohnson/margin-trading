"""Experiment-specific analysis for lower-price re-entry with recovery reset.

Matching variant trades to baseline trades: the method (and `match_to_baseline` / `recovery_participation`,
copied verbatim) is the one validated in recovery-reentry/analysis.py. It relies only on properties shared by
this experiment: fixed $100k size, no extra stops, no add-ons, so a trade's exit and P&L are a function of its
entry session alone; and the engine never re-enters on an exit session, so baseline spans are disjoint and
every variant entry falls inside exactly one baseline span (asserted). P&L statements use the time-window
decomposition: variant net - baseline net = sum over baseline trades of (variant window P&L - baseline P&L)
+ variant P&L while the baseline was flat (asserted exactly).

First-order (shadow) analysis: on the BASELINE path, for every baseline entry that follows a losing baseline
exit at session x (exit price px, the losing trade's frozen entry reference high rh), replay the restriction:
the first session j >= x with close_j >= 0.95 rh is the reset; the baseline entry at session be was allowed if
the reset came before be, or (still restricted) close_be <= px (1 - threshold); a reset AT be blocks be (reset
priority). This measures the rule's selectivity without the path dependence of the variant run. Beyond the
next baseline entry the baseline path is no longer flat, so dates after be are indicative only.

The 2026 recovery window (2026-03-20 .. 2026-10-06, the March 2026 correction low of 2026-03-30 to the end of
the data) is experiment-specific and supplements the frozen windows in metrics.py.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from metrics import RECOVERY_WINDOWS, covered, window_stats  # noqa: E402

RECOVERY_WINDOWS_EXT = dict(RECOVERY_WINDOWS, **{'2026': ('2026-03-20', '2026-10-06')})
MAJOR_WIN = 10000.0  # "major" profitable trade, the >= $10k convention of SPEC.md


# ---------------------------------------------------------------------------------------------------------
# Generic matching (copied verbatim from recovery-reentry/analysis.py; see that module for the derivation)
# ---------------------------------------------------------------------------------------------------------

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
    flat, prev_end = 0.0, 0
    for k in range(len(btr)):
        flat += mv[b_ent[k]] - mv[prev_end]
        prev_end = b_end[k]
    flat += mv[n - 1] - mv[prev_end]
    m.attrs['variant_pnl_while_baseline_flat'] = float(flat)
    assert abs(m['window_diff'].sum() + flat - (var['net'] - base['net'])) < 1e-6
    assert abs(m['v_assigned_pnl'].sum() - var['net']) < 1e-6
    return m


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
                continue
            rows.append(dict(window=w, b_entry_date=r['b_entry_date'], b_exit_date=r['b_exit_date'], b_profit=r['b_profit'],
                             classification=r['classification'], reason_at_entry=r['reason_at_entry'],
                             delay_sessions=r['delay_sessions'], b_entry_price=r['b_entry_price'],
                             v_first_entry_date=r['v_first_entry_date'], v_first_entry_price=r['v_first_entry_price'],
                             b_sessions=r['b_sessions'], v_sessions_held=r['v_sessions_held'],
                             v_coverage=r['v_coverage'], v_window_pnl=r['v_window_pnl'], window_diff=r['window_diff'],
                             v_overlapping_trades=r['v_overlapping_trades']))
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------------------------------------
# Experiment-specific tables
# ---------------------------------------------------------------------------------------------------------

def states_table(strategy):
    return pd.DataFrame(strategy.rows)


def events_table(strategy, var, df):
    """One row per restriction episode (losing exit)."""
    dates = var['daily']['date'].astype(str).to_numpy()
    close = var['daily']['close'].to_numpy()
    h = df['high'].to_numpy(dtype=float)
    t = df['time'].to_numpy(dtype=float)
    out = []
    for ev in strategy.events:
        x, ri, ei = ev['exit_i'], ev['resolution_i'], ev['reentry_i']
        rolling_high_at_res = h[max(0, ri - 90):ri].max() if ri is not None and ri > 0 else np.nan
        out.append(dict(
            exit_date=dates[x], exit_reason=ev['exit_reason'], loss=ev['loss'],
            loss_exit_price=ev['loss_exit_price'], losing_entry_price=ev['losing_entry_price'],
            ref_high=ev['ref_high'], lower_level=ev['lower_level'], reset_level=ev['reset_level'],
            resolution=ev['resolution'], resolution_date=dates[ri] if ri is not None else '',
            sessions_restricted=(ri - x) if ri is not None else np.nan,
            days_restricted=(t[ri] - t[x]) / 86400 if ri is not None else np.nan,
            blocked_sessions=len(ev['blocked_is']), blocked_dates=';'.join(dates[b] for b in ev['blocked_is']),
            dual_trigger_sessions=len(ev['dual_trigger_is']), reset_priority_sessions=len(ev['reset_priority_is']),
            reentry_date=dates[ei] if ei is not None else '', reentry_close=close[ei] if ei is not None else np.nan,
            reentry_vs_loss_exit=(close[ei] / ev['loss_exit_price'] - 1) if ei is not None else np.nan,
            reentry_vs_losing_entry=(close[ei] / ev['losing_entry_price'] - 1) if ei is not None else np.nan,
            min_close_in_episode=ev['min_close'], max_close_in_episode=ev['max_close'],
            min_close_vs_lower_level=(ev['min_close'] / ev['lower_level'] - 1),
            max_close_vs_reset_level=(ev['max_close'] / ev['reset_level'] - 1),
            rolling_90d_high_at_resolution=rolling_high_at_res,
            frozen_ref_high_vs_rolling_high_at_resolution=(ev['ref_high'] / rolling_high_at_res - 1)
            if not np.isnan(rolling_high_at_res) else np.nan))
    return pd.DataFrame(out)


def shadow(base, df, threshold, window=90, reset_fraction=0.95):
    """First-order: on the baseline path, is each post-loss baseline entry allowed by the rule?"""
    c = base['daily']['close'].to_numpy()
    h = df['high'].to_numpy(dtype=float)
    dates = base['daily']['date'].astype(str).to_numpy()
    n = len(c)
    tr = base['trades'].reset_index(drop=True)
    rows = []
    for k in range(1, len(tr)):
        prev = tr.loc[k - 1]
        if pd.isna(prev['exit_i']) or prev['profit'] >= 0:
            continue
        x, px = int(prev['exit_i']), float(prev['exit_price'])
        pe = int(prev['entry_i'])
        rh = h[max(0, pe - window):pe].max()
        reset_level, lower_level = reset_fraction * rh, px * (1 - threshold)
        be = int(tr.loc[k, 'entry_i'])
        first_reset = next((j for j in range(x, n) if c[j] >= reset_level), None)
        first_lower = next((j for j in range(x + 1, n) if c[j] <= lower_level
                            and (first_reset is None or j < first_reset)), None)
        if first_reset is not None and first_reset < be:
            status = 'allowed (after reset)'
        elif first_reset is not None and first_reset == be:
            status = 'blocked (reset priority at entry session)'
        elif c[be] <= lower_level:
            status = 'allowed (lower price)'
        else:
            status = 'blocked'
        rows.append(dict(k=k, exit_date=dates[x], loss_exit_price=px, ref_high=rh,
                         lower_level=lower_level, reset_level=reset_level,
                         b_entry_date=dates[be], b_entry_close=float(c[be]), b_profit=float(tr.loc[k, 'profit']),
                         b_open=bool(pd.isna(tr.loc[k, 'exit_i'])), status=status,
                         allowed=status.startswith('allowed'),
                         first_reset_date=dates[first_reset] if first_reset is not None else '',
                         sessions_exit_to_reset=(first_reset - x) if first_reset is not None else np.nan,
                         first_lower_date=dates[first_lower] if first_lower is not None else '',
                         sessions_exit_to_lower=(first_lower - x) if first_lower is not None else np.nan,
                         sessions_exit_to_entry=be - x))
    return pd.DataFrame(rows)


def summarize(cfg, strategy, base, var, match, shad, ev):
    """Experiment-specific `extra` for summary.json."""
    def s(x):
        return float(x.sum()) if len(x) else 0.0
    if strategy is None:  # A_baseline
        tr = base['trades']
        closed = tr[tr['reason'] != 'open']
        return dict(rule='none (baseline)', losing_exits=int((closed['profit'] < 0).sum()))
    thr = type(strategy).threshold
    out = dict(rule=f'after a losing exit, re-enter only at close <= {1 - thr:.2f} x loss exit price; '
                    f'reset at close >= 0.95 x frozen entry reference high')
    res_counts = ev['resolution'].value_counts().to_dict() if len(ev) else {}
    reent = ev[ev['resolution'] == 'lower_price_reentry'] if len(ev) else ev
    resets = ev[ev['resolution'] == 'recovery_reset'] if len(ev) else ev
    out['state_machine'] = dict(
        losing_exits=int(len(ev)),
        entries_blocked_sessions=int(strategy.blocked_sessions),
        lower_price_reentries=int(strategy.lower_price_reentries),
        recovery_resets=int(strategy.recovery_resets),
        dual_trigger_sessions=int(strategy.dual_trigger_sessions),
        reset_priority_blocks=int(strategy.reset_priority_blocks),
        episodes_by_resolution=res_counts,
        episodes_with_blocked_sessions=int((ev['blocked_sessions'] > 0).sum()) if len(ev) else 0,
        sessions_restricted_total=float(ev['sessions_restricted'].sum()) if len(ev) else 0.0,
        sessions_restricted_median=float(ev['sessions_restricted'].median()) if len(ev) else None,
        sessions_restricted_max=float(ev['sessions_restricted'].max()) if len(ev) else None,
        days_restricted_max=float(ev['days_restricted'].max()) if len(ev) else None,
        reentry_discount_vs_loss_exit_median=float(reent['reentry_vs_loss_exit'].median()) if len(reent) else None,
        reentry_vs_losing_entry_median=float(reent['reentry_vs_losing_entry'].median()) if len(reent) else None,
        sessions_to_reset_median=float(resets['sessions_restricted'].median()) if len(resets) else None,
        sessions_to_reset_max=float(resets['sessions_restricted'].max()) if len(resets) else None,
        resets_that_never_got_lower_price=int((resets['min_close_vs_lower_level'] > 0).sum()) if len(resets) else 0)
    cls = {}
    for c in ['identical', 'later entry', 'no entry']:
        sub = match[match['classification'] == c]
        cls[c] = dict(n=int(len(sub)), by_reason={r: int((sub['reason_at_entry'] == r).sum()) for r in ['same', 'blocked', 'holding', 'exited']},
                      baseline_pnl=s(sub['b_profit']), variant_window_pnl=s(sub['v_window_pnl']))
    win, lose, closed = match['b_profit'] > 0, match['b_profit'] < 0, ~match['b_open']
    ne, le = match['classification'] == 'no entry', match['classification'] == 'later entry'
    later_blocked = le & (match['reason_at_entry'] == 'blocked')
    major = match['b_profit'] >= MAJOR_WIN

    def grp(mask):
        sub = match[mask]
        return dict(n=int(len(sub)), baseline_pnl=s(sub['b_profit']), variant_window_pnl=s(sub['v_window_pnl']),
                    variant_flat_through_window=int((sub['v_sessions_held'] == 0).sum()),
                    mean_coverage=float(sub['v_coverage'].mean()) if len(sub) else None)
    rep = match['b_prev_losing'] & lose & closed
    rebound = match['b_prev_losing'] & win
    major_rebound = rebound & major
    out['matching'] = dict(
        baseline_trades=int(len(match)), variant_trades=int(len(var['trades'])),
        baseline_entries_missed=int(ne.sum()), baseline_entries_delayed=int(le.sum()),
        by_classification=cls, net_difference=float(var['net'] - base['net']),
        variant_pnl_while_baseline_flat=match.attrs['variant_pnl_while_baseline_flat'],
        all_baseline_losers=grp(lose & closed), all_baseline_winners=grp(win),
        repeated_losers=dict(grp(rep), eliminated=int((rep & ne).sum()), later=int((rep & le).sum()),
                             identical=int((rep & (match['classification'] == 'identical')).sum())),
        rebound_winners=dict(grp(rebound), eliminated=int((rebound & ne).sum()), later=int((rebound & le).sum()),
                             identical=int((rebound & (match['classification'] == 'identical')).sum())),
        major_winners_10k=dict(grp(major), eliminated=int((major & ne).sum()), later=int((major & le).sum()),
                               identical=int((major & (match['classification'] == 'identical')).sum())),
        major_rebound_winners_10k=dict(grp(major_rebound), eliminated=int((major_rebound & ne).sum()),
                                       later=int((major_rebound & le).sum()),
                                       identical=int((major_rebound & (match['classification'] == 'identical')).sum())),
        later_entries_due_to_block=dict(grp(later_blocked),
                                        mean_delay_sessions=float(match.loc[later_blocked, 'delay_sessions'].mean()) if later_blocked.any() else None,
                                        median_entry_price_discount=float((match.loc[later_blocked, 'v_first_entry_price'] / match.loc[later_blocked, 'b_entry_price'] - 1).median())
                                        if later_blocked.any() else None),
        later_entries_due_to_block_winners=grp(later_blocked & win),
        later_entries_due_to_block_losers=grp(later_blocked & lose & closed))
    if len(shad):
        bl = ~shad['allowed']
        out['first_order_shadow'] = dict(
            baseline_entries_after_a_loss=int(len(shad)),
            would_be_blocked=int(bl.sum()),
            allowed_after_reset=int((shad['status'] == 'allowed (after reset)').sum()),
            allowed_lower_price=int((shad['status'] == 'allowed (lower price)').sum()),
            blocked_losers=int((bl & (shad['b_profit'] < 0)).sum()), blocked_losers_pnl=s(shad.loc[bl & (shad['b_profit'] < 0), 'b_profit']),
            blocked_winners=int((bl & (shad['b_profit'] > 0)).sum()), blocked_winners_pnl=s(shad.loc[bl & (shad['b_profit'] > 0), 'b_profit']),
            allowed_losers=int((~bl & (shad['b_profit'] < 0)).sum()), allowed_winners=int((~bl & (shad['b_profit'] > 0)).sum()))
    out['events'] = ev.drop(columns=['blocked_dates']).to_dict(orient='records') if len(ev) else []
    return out


def recovery_window_stats(res):
    """Standard window stats over the frozen recovery windows plus the 2026 window."""
    return {k: window_stats(res, w) for k, w in RECOVERY_WINDOWS_EXT.items() if covered(res['daily'], w)}
