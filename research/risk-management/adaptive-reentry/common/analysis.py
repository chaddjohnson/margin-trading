"""Shared analysis for Phase 2 (frozen with the framework).

`match_to_baseline` and `recovery_participation` are the validated functions from
lower-price-reentry/analysis.py (verbatim; see that module for the derivation and the exact assertions).
They rely only on properties every Phase 2 configuration preserves: one position, fixed size per run, no
extra stops/add-ons (a trade is a function of its entry session), and no entry on an exit session.

`events_table` / `states_table` serialize the framework's EpisodeState/state-log. `false_resets` counts
resets whose next trade lost (the brief's "false or premature resets"). `near_miss_blocks` lists blocked
baseline winners where the close came within 2% of the required level (the brief's "<2% miss" metric).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'baseline'))

from metrics import RECOVERY_WINDOWS, covered, window_stats  # noqa: E402

RECOVERY_WINDOWS_EXT = dict(RECOVERY_WINDOWS, **{'2026': ('2026-03-20', '2026-10-06')})
MAJOR_WIN = 10000.0


# ---- validated matching (copied from lower-price-reentry/analysis.py) ----

def _spans(tr, n):
    ent = tr['entry_i'].astype(int).to_numpy()
    ex = tr['exit_i'].to_numpy(dtype=float)
    end = np.where(np.isnan(ex), n - 1, ex).astype(int)
    return ent, ex, end


def _fmt_trade(row):
    ex = row['exit_date'] if isinstance(row['exit_date'], str) or pd.notna(row['exit_date']) else 'open'
    return f"{row['entry_date']}->{ex}:{row['profit']:+.0f}"


def match_to_baseline(base, var, blocked_set):
    n = len(base['daily'])
    btr, vtr = base['trades'].reset_index(drop=True), var['trades'].reset_index(drop=True)
    b_ent, b_ex, b_end = _spans(btr, n)
    v_ent, v_ex, v_end = _spans(vtr, n)
    v_held = var['daily']['borrowed'].to_numpy() > 0
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
            scale = vtr.loc[j, 'investment'] / btr.loc[k, 'investment']
            assert abs(vtr.loc[j, 'profit'] - bp * scale) < 1e-6 and same_exit, 'identical entry, different trade'
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
    rows = []
    d0, d1 = pd.Timestamp(first_date).date(), pd.Timestamp(last_date).date()
    for w, (a, b) in windows.items():
        a, b = pd.Timestamp(a).date(), pd.Timestamp(b).date()
        if not (d0 <= a and d1 >= b):
            continue
        for _, r in match.iterrows():
            if pd.Timestamp(r['b_entry_date']).date() > b or pd.Timestamp(r['b_last_held_date']).date() < a:
                continue
            rows.append(dict(window=w, **{k: r[k] for k in [
                'b_entry_date', 'b_exit_date', 'b_profit', 'classification', 'reason_at_entry', 'delay_sessions',
                'b_entry_price', 'v_first_entry_date', 'v_first_entry_price', 'b_sessions', 'v_sessions_held',
                'v_coverage', 'v_window_pnl', 'window_diff', 'v_overlapping_trades']}))
    return pd.DataFrame(rows)


# ---- framework serialization ----

def states_table(strategy):
    return pd.DataFrame(strategy.rows)


def events_table(strategy, var):
    dates = var['daily']['date'].astype(str).to_numpy()
    close = var['daily']['close'].to_numpy()
    out = []
    for st in strategy.events:
        ri, ei = st.resolution_i, st.reentry_i
        out.append(dict(
            exit_date=dates[st.exit_i], exit_reason=st.exit_reason, loss=st.loss,
            loss_exit_price=st.exit_price, losing_entry_price=st.entry_price, price_return=st.price_return,
            ref_high=st.ref_high, resolution=st.resolution or '',
            resolution_date=dates[ri] if ri is not None else '',
            sessions_restricted=(ri - st.exit_i) if ri is not None else np.nan,
            blocked_sessions=len(st.blocked_is),
            entry_path=st.entry_path,
            reentry_date=dates[ei] if ei is not None else '',
            reentry_close=close[ei] if ei is not None else np.nan,
            reentry_vs_loss_exit=(close[ei] / st.exit_price - 1) if ei is not None else np.nan,
            reentry_vs_losing_entry=(close[ei] / st.entry_price - 1) if ei is not None else np.nan,
            required_level_at_entry=st.required_level_at_entry,
            min_close_in_episode=st.min_close, max_close_in_episode=st.max_close,
            min_gap_to_required=st.min_gap))
    return pd.DataFrame(out)


def false_resets(ev, trades):
    """Resets whose next trade lost (count, dates). `trades` is the variant's trades DataFrame."""
    if not len(ev):
        return 0, []
    out = []
    resets = ev[ev['resolution'] == 'recovery_reset']
    for _, r in resets.iterrows():
        nxt = trades[trades['entry_date'].astype(str) > str(r['resolution_date'])].head(1)
        if len(nxt) and float(nxt['profit'].iloc[0]) < 0:
            out.append(str(r['resolution_date']))
    return len(out), out


def near_miss_blocks(match, ev, threshold=0.02):
    """Blocked baseline winners in episodes whose close came within `threshold` of the required level."""
    if not len(ev):
        return []
    rows = []
    blocked_majors = match[(match['classification'] == 'no entry') & (match['reason_at_entry'] == 'blocked')
                           & (match['b_profit'] > 0)]
    for _, r in blocked_majors.iterrows():
        epi = ev[(ev['exit_date'] <= r['b_entry_date']) & ((ev['resolution_date'] >= r['b_entry_date'])
                                                           | (ev['resolution_date'] == ''))]
        if len(epi):
            gap = float(epi['min_gap_to_required'].iloc[-1])
            if 0 <= gap <= threshold:
                rows.append(dict(b_entry_date=r['b_entry_date'], b_profit=float(r['b_profit']), min_gap=gap))
    return rows


def recovery_window_stats(res):
    return {k: window_stats(res, w) for k, w in RECOVERY_WINDOWS_EXT.items() if covered(res['daily'], w)}
