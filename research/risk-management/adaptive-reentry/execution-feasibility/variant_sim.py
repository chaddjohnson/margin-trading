"""Family F exploratory EXECUTION-MODEL variant: resting-limit fills for the restricted re-entry.

THIS IS AN EXECUTION-MODEL CHANGE, NOT A SIGNAL CHANGE. The strategy's rules (net-loss trigger, fixed
discount off the frozen loss-exit price, frozen-high 95% reset, close-based 10% entry signal for normal
entries, the engine's exits) are untouched. The only change: while restricted and FLAT, with the
restriction and level frozen as of the PRIOR close, a resting limit order sits at the frozen level L
during session i, but only when the order is legitimately placeable before the open:

    L <= 0.90 * max(high[i-90 .. i-1])   (the dip condition holds AT THE LIMIT PRICE ITSELF,
                                          computable before the open from prior sessions only)

The CLOSE-based 10% signal is NOT knowable intraday; the gate above is the only dip condition a resting
limit can honour, and it is stricter at the fill price than the engine's close-based signal would be.

Fill rules (daily bars, no session-low fills, no same-session-close information):
  - open < L            -> the limit fills at the OPEN (gap-through).
  - low  <= L * sens    -> the limit fills at L (sens = 1.0 base; 0.999 sensitivity run requires 0.1%
                           penetration so a bare touch at the level is not assumed filled).
  - No order rests on the arming exit session (the restriction arms intra-session; engine chronology
    keeps 'no entry on an exit session').
  - A fill opens the position intraday: entry price = fill, stop = 0.92 * fill, and the ENTRY SESSION'S
    OWN HIGH IS EXCLUDED from the trailing reference (the engine's convention for close entries; for an
    intraday fill the high's position relative to the fill is unknowable from daily bars, so excluding it
    is the conservative, engine-consistent choice). No exit evaluation on the fill session (engine
    property; the 8% stop cannot be profit-active on its entry day anyway).
  - A fill clears the restriction (engine rule: restriction clears when a position opens). The
    close-based reset cannot pre-empt an intraday fill (the fill happens first in time); the daily-OHLC
    diagnostic found ZERO sessions where low <= L and close >= reset level, so this ordering choice is
    counterfactual-free historically.
  - The engine's close-based restricted entry path is RETAINED (close <= L with the 10% signal, reset
    priority at the close) for sessions where no limit was resting or it did not fill. When a resting
    limit fills on a session whose close also satisfied the engine's entry, the variant pays L (or the
    open) instead of the close — a real property of limit orders, counted in `fills_engine_would_enter`.

Everything else reimplements the frozen engine's semantics EXACTLY (verified: with the limit model off,
trades reproduce the runner's REF_lower3 / lower5 / lower8 results trade for trade on all four datasets —
run with --verify). This standalone replica exists because the frozen engine structurally cannot express
intraday fills (entries happen only at the close of 10%-signal sessions, at the close price); it is the
"careful post-hoc trade simulation from the daily bars" the family brief allows, and it lives only in
this family directory.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import DATASETS, Params, load  # noqa: E402

SECONDS_PER_DAY = 86400.0
YEAR_SECONDS = 365 * SECONDS_PER_DAY
PRM = Params()
RESET_FRACTION = 0.95
DIP_FRACTION = 0.90
CONFIGS = {'REF_lower3': 0.03, 'lower5': 0.05, 'lower8': 0.08}


def roll_high_prev(h, window=PRM.window):
    out = np.full(len(h), np.nan)
    for i in range(1, len(h)):
        out[i] = h[max(0, i - window):i].max()
    return out


def simulate(df, pct, limit=False, sens=1.0, start_i=1, init_pos=None, init_st=None, end_i=None):
    """Defaults reproduce the anchors (verified). start_i/init_pos/init_st let episode_sim.py replay a
    single episode mid-stream: init_pos is an already-open position dict (opened BEFORE start_i, so it is
    exit-evaluated from start_i on, matching the engine's no-exit-on-entry-session rule); init_st is an
    already-armed restriction dict. end_i truncates the run (open position marked at end_i's close)."""
    o, h, l, c, t = (df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low', 'close', 'time'])
    dates = df['date']
    n = len(df) if end_i is None else min(len(df), end_i + 1)
    rhp = roll_high_prev(h)
    pos = init_pos        # dict(entry_i, entry_time, entry_price, investment, shares, post_high, post_low, stop, path)
    st = init_st          # dict(exit_i, exit_price, ref_high, level)
    trades, episodes = [], []
    if init_st is not None:
        episodes.append(dict(exit_date=init_st.get('exit_date', ''), loss=np.nan,
                             loss_exit_price=init_st['exit_price'], level=init_st['level'],
                             ref_high=init_st['ref_high'], resolution='', resolution_date='',
                             fill_price=np.nan))
    realized = 0.0
    mtm = np.zeros(n)
    borrowed = np.zeros(n)
    counters = dict(limit_fills=0, gap_fills=0, fills_engine_would_enter=0, limit_blocked_by_dip_gate=0,
                    close_reentries=0, resets=0)

    def interest(p, ts):
        return p['investment'] * PRM.rate * (ts - p['entry_time']) / YEAR_SECONDS

    def close_trade(i, price, reason, path):
        nonlocal pos, realized, st
        p = pos
        accrued = interest(p, t[i])
        profit = p['shares'] * price - p['investment'] - accrued
        trades.append(dict(entry_i=p['entry_i'], exit_i=i, entry_date=str(dates.iloc[p['entry_i']].date()),
                           exit_date=str(dates.iloc[i].date()), entry_price=p['entry_price'], exit_price=price,
                           reason=reason, interest=accrued, profit=profit, entry_path=p['path'],
                           sessions_held=i - p['entry_i']))
        realized += profit
        pos = None
        if profit < 0:
            entry_i = p['entry_i']
            ref_high = float(h[max(0, entry_i - PRM.window):entry_i].max())
            st = dict(exit_i=i, exit_price=price, ref_high=ref_high, level=price * (1 - pct),
                      exit_date=str(dates.iloc[i].date()))
            episodes.append(dict(exit_date=st['exit_date'], loss=profit, loss_exit_price=price,
                                 level=st['level'], ref_high=ref_high, resolution='', resolution_date='',
                                 fill_price=np.nan))
        return path  # unused

    def open_position(i, price, path):
        nonlocal pos, st
        inv = PRM.base_size
        pos = dict(entry_i=i, entry_time=t[i], entry_price=price, investment=inv, shares=inv / price,
                   post_high=price, post_low=price, stop=price * (1 - PRM.trail), path=path)
        if st is not None:
            episodes[-1]['resolution'] = path
            episodes[-1]['resolution_date'] = str(dates.iloc[i].date())
            episodes[-1]['fill_price'] = price
            st = None

    for i in range(start_i, n):
        pos_at_open = pos
        # --- intraday resting limit (variant only): flat, restricted, armed BEFORE this session ---
        if limit and pos_at_open is None and st is not None and st['exit_i'] < i:
            L = st['level']
            if L <= DIP_FRACTION * rhp[i]:
                fill = None
                if o[i] < L:
                    fill = o[i]
                    counters['gap_fills'] += 1
                elif l[i] <= L * sens:
                    fill = L
                    counters['limit_fills'] += 1
                if fill is not None:
                    signal_at_close = 1 - c[i] / rhp[i] >= PRM.target
                    if c[i] <= L and signal_at_close:
                        counters['fills_engine_would_enter'] += 1
                    open_position(i, fill, 'gap_fill_open' if fill == o[i] and o[i] < L else 'limit_fill')
            else:
                counters['limit_blocked_by_dip_gate'] += 1
        # --- close-based entry decision (engine order; only if flat the whole session so far) ---
        if pos_at_open is None and pos is None:
            recent_high = rhp[i]
            if 1 - c[i] / recent_high >= PRM.target:
                if st is None:
                    open_position(i, c[i], 'normal')
                elif c[i] >= RESET_FRACTION * st['ref_high']:
                    pass                      # reset priority: no entry; reset resolves at session end
                elif c[i] <= st['level']:
                    counters['close_reentries'] += 1
                    open_position(i, c[i], 'lower_price_reentry')
        # --- exit evaluation of a position held from before this session ---
        if pos_at_open is not None:
            p = pos
            accrued = interest(p, t[i])

            def profit_at(price):
                return p['shares'] * price - p['investment'] - accrued

            stop_active = profit_at(p['stop']) > 0
            days_held = (t[i] - p['entry_time']) / SECONDS_PER_DAY
            exit_px = exit_reason = None
            if days_held >= PRM.loss_exit_days and profit_at(o[i]) < 0:
                exit_px, exit_reason = o[i], 'maximum hold'
            elif stop_active and o[i] <= p['stop']:
                exit_px, exit_reason = o[i], 'trailing stop gap'
            elif stop_active and l[i] <= p['stop']:
                exit_px, exit_reason = p['stop'], 'trailing stop'
            if exit_px is not None:
                close_trade(i, exit_px, exit_reason, p['path'])
            else:
                p['post_high'] = max(p['post_high'], h[i])
                p['stop'] = max(p['stop'], p['post_high'] * (1 - PRM.trail))
                p['post_low'] = min(p['post_low'], l[i])
        # --- mark-to-market ---
        marked = realized
        if pos is not None:
            marked += pos['shares'] * c[i] - pos['investment'] - interest(pos, t[i])
            borrowed[i] = pos['investment']
        mtm[i] = marked
        # --- session end: restriction resolution (an entry already cleared it; else reset at close) ---
        if st is not None and pos is None and c[i] >= RESET_FRACTION * st['ref_high']:
            counters['resets'] += 1
            episodes[-1]['resolution'] = 'recovery_reset'
            episodes[-1]['resolution_date'] = str(dates.iloc[i].date())
            st = None
    open_profit = 0.0
    if pos is not None:
        i = n - 1
        open_profit = pos['shares'] * c[i] - pos['investment'] - interest(pos, t[i])
        trades.append(dict(entry_i=pos['entry_i'], exit_i=None, entry_date=str(dates.iloc[pos['entry_i']].date()),
                           exit_date=None, entry_price=pos['entry_price'], exit_price=c[i], reason='open',
                           interest=interest(pos, t[i]), profit=open_profit, entry_path=pos['path'],
                           sessions_held=i - pos['entry_i']))
    if st is not None:
        episodes[-1]['resolution'] = 'unresolved_at_end'
    peak = np.maximum.accumulate(np.r_[0.0, mtm[1:]])
    daily = pd.DataFrame(dict(date=dates.dt.date.iloc[:n].reset_index(drop=True), close=c[:n],
                              mtm_pnl=mtm, borrowed=borrowed))
    return dict(trades=pd.DataFrame(trades), daily=daily, net=realized + open_profit,
                mdd=float((peak - np.r_[0.0, mtm[1:]]).max()), counters=counters,
                episodes=pd.DataFrame(episodes), sessions=n)


def verify():
    """Limit model OFF must reproduce the runner's anchor trades exactly."""
    ok = 0
    for ds in DATASETS:
        df = load(ds)
        for cfg, pct in CONFIGS.items():
            ref = pd.read_csv(HERE / 'results' / 'trades' / f'{ds}__{cfg}.csv')
            res = simulate(df, pct, limit=False)
            tr = res['trades']
            assert len(tr) == len(ref), (ds, cfg, len(tr), len(ref))
            for col in ['entry_date', 'exit_date', 'reason']:
                a = tr[col].astype(str).replace({'None': '', 'nan': '', 'NaT': ''})
                b = ref[col].astype(str).replace({'None': '', 'nan': '', 'NaT': ''})
                assert (a == b).all(), (ds, cfg, col)
            for col in ['entry_price', 'exit_price', 'interest', 'profit']:
                assert np.allclose(tr[col].astype(float), ref[col].astype(float), atol=1e-6), (ds, cfg, col)
            ok += 1
    print(f'verify: {ok}/12 dataset x config anchor reproductions passed (limit model off)')


def run_variants():
    out = HERE / 'results' / 'variant'
    (out / 'trades').mkdir(parents=True, exist_ok=True)
    (out / 'episodes').mkdir(parents=True, exist_ok=True)
    rows = []
    anchors = {}
    for ds in DATASETS:
        df = load(ds)
        for cfg, pct in CONFIGS.items():
            anchors[(ds, cfg)] = simulate(df, pct, limit=False)
            for sens, tag in [(1.0, 'limit'), (0.999, 'limit_s999')]:
                name = f'F_{tag}_{cfg}'
                res = simulate(df, pct, limit=True, sens=sens)
                res['trades'].to_csv(out / 'trades' / f'{ds}__{name}.csv', index=False)
                res['episodes'].to_csv(out / 'episodes' / f'{ds}__{name}.csv', index=False)
                a = anchors[(ds, cfg)]
                rows.append(dict(dataset=ds, config=cfg, model=tag, net=res['net'], mdd=res['mdd'],
                                 trades=len(res['trades']), anchor_net=a['net'], anchor_mdd=a['mdd'],
                                 net_vs_anchor=res['net'] - a['net'], mdd_vs_anchor=res['mdd'] - a['mdd'],
                                 **res['counters']))
    summary = pd.DataFrame(rows)
    summary.to_csv(out / 'summary.csv', index=False)
    pd.set_option('display.width', 250)
    print(summary.to_string(index=False))
    return summary


if __name__ == '__main__':
    if '--verify' in sys.argv:
        verify()
    else:
        verify()
        run_variants()
