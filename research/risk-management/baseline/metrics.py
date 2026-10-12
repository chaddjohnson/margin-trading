"""Standardized metrics, matched-exposure controls and output writing, shared by every experiment (frozen).

Definitions:
- Net profit = realized P&L + unrealized P&L of any position still open at the last close, net of all margin
  interest (accrued interest on the open position included).
- Winning/losing trade: net profit > 0 / < 0. Closed trades only (the open position is reported separately).
- Drawdown: daily mark-to-market, from a running peak of cumulative P&L that starts at 0. Dollars are the
  primary measure; "% of $100k" is a reference only, not an account-equity drawdown.
- Longest time underwater: the longest span, in calendar days, from a running peak to the first close that
  regains it (or to the last date if never regained).
- Margin dollar-days: sum over sessions of (borrowed balance at the previous close × calendar days since that
  close). This equals total interest ÷ (11% ÷ 365), and uses actual daily balances for varying sizes or tranches.
- Window P&L: cumulative P&L at the window's last session minus cumulative P&L at the close before its first
  session. Window drawdown: peak-to-trough within the window, with the peak starting at the pre-window level.
  Window interest: interest accrued on days inside the window. Trades in a window: trades that CLOSED inside it.
- Matched-exposure control: a COMPLETE, independent baseline run with a fixed position size X chosen so that
  its margin dollar-days equal the experiment's: X = $100,000 × experiment dollar-days ÷ baseline dollar-days.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from engine import DATASETS, FixedSize, Params, Strategy, load, run

RATE = Params().rate
BEAR_WINDOWS = {  # calendar boundaries, inclusive
    '2000-2002': ('2000-01-01', '2002-12-31'),
    '2007-2009': ('2007-01-01', '2009-12-31'),
    '2022': ('2022-01-01', '2022-12-31'),
}
RECOVERY_WINDOWS = {  # from (approximately) the market low to year end
    '2003': ('2003-01-01', '2003-12-31'),
    '2009': ('2009-03-01', '2009-12-31'),
    '2020': ('2020-03-16', '2020-12-31'),
    '2023': ('2023-01-01', '2023-12-31'),
    '2025': ('2025-04-01', '2025-12-31'),
}
_BASE_CACHE = {}


def covered(daily, window):
    a, b = (pd.Timestamp(x).date() for x in window)
    return daily['date'].iloc[0] <= a and daily['date'].iloc[-1] >= b


def window_stats(res, window):
    d, tr = res['daily'], res['trades']
    a, b = (pd.Timestamp(x).date() for x in window)
    m = (d['date'] >= a) & (d['date'] <= b)
    idx = np.flatnonzero(m.to_numpy())
    pre = float(d['mtm_pnl'].iloc[idx[0] - 1]) if idx[0] > 0 else 0.0
    path = np.r_[pre, d['mtm_pnl'].to_numpy()[idx]]
    run_peak = np.maximum.accumulate(path)
    prev_bal = np.r_[0.0, d['borrowed'].to_numpy()[:-1]]
    interest = float((prev_bal[idx] * d['calendar_days'].to_numpy()[idx]).sum() * RATE / 365)
    closed = tr[tr['exit_date'].notna()].copy() if len(tr) else tr
    if len(closed):
        ed = pd.to_datetime(closed['exit_date']).dt.date
        closed = closed[(ed >= a) & (ed <= b)]
    entered = pd.DataFrame()
    if len(tr):
        en = pd.to_datetime(tr['entry_date']).dt.date
        entered = tr[(en >= a) & (en <= b)]
    return dict(window=f'{a}..{b}', pnl=float(path[-1] - pre), max_drawdown=float((run_peak - path).max()),
                interest=interest, trades_closed=int(len(closed)), losing_trades=int((closed['profit'] < 0).sum()) if len(closed) else 0,
                largest_loss=float(closed['profit'].min()) if len(closed) else 0.0,
                avg_borrowed=float(d['borrowed'].to_numpy()[idx].mean()),
                trades_entered=int(len(entered)), pnl_of_trades_entered=float(entered['profit'].sum()) if len(entered) else 0.0)


def standard_metrics(res, dataset):
    tr, d = res['trades'], res['daily']
    closed = tr[tr['reason'] != 'open'] if len(tr) else tr
    wins, losses = closed[closed['profit'] > 0], closed[closed['profit'] < 0]
    streak = best = 0
    for p in closed['profit']:
        streak = streak + 1 if p < 0 else 0
        best = max(best, streak)
    mtm, peak = d['mtm_pnl'].to_numpy(), d['peak_pnl'].to_numpy()
    dates = pd.to_datetime(d['date'])
    longest, start, recovered = 0, None, True
    for k in range(len(mtm)):
        if mtm[k] < peak[k] - 1e-9:
            if start is None:
                start = k - 1
        elif start is not None:
            longest = max(longest, (dates.iloc[k] - dates.iloc[start]).days)
            start = None
    if start is not None:
        span = (dates.iloc[-1] - dates.iloc[start]).days
        if span >= longest:
            longest, recovered = span, False
    daily_chg = np.diff(mtm)
    worst_k = int(np.argmin(daily_chg)) + 1
    bal = d['borrowed'].to_numpy()
    invested = bal > 0
    bears = {k: window_stats(res, w) for k, w in BEAR_WINDOWS.items() if covered(d, w)}
    recs = {k: window_stats(res, w) for k, w in RECOVERY_WINDOWS.items() if covered(d, w)}
    return dict(
        dataset=dataset, first_date=res['first_date'], last_date=res['last_date'], sessions=res['sessions'],
        # A. Profitability
        net_profit=res['net'], realized_profit=res['realized'], unrealized_profit=res['unrealized'],
        open_position_at_end=res['open'], margin_interest=res['interest'], closed_trades=int(len(closed)),
        winning_trades=int(len(wins)), losing_trades=int(len(losses)),
        win_rate=float(len(wins) / len(closed)) if len(closed) else None,
        avg_winning_trade=float(wins['profit'].mean()) if len(wins) else None,
        avg_losing_trade=float(losses['profit'].mean()) if len(losses) else None,
        largest_winning_trade=float(closed['profit'].max()) if len(closed) else None,
        largest_losing_trade=float(closed['profit'].min()) if len(closed) else None,
        # B. Risk
        max_drawdown=res['mdd'], max_drawdown_pct_of_100k=res['mdd'] / 100000, mdd_peak_date=res['mdd_peak'],
        mdd_trough_date=res['mdd_trough'], max_consecutive_losses=int(best),
        max_bear_episode_drawdown=max([b['max_drawdown'] for b in bears.values()], default=None),
        longest_underwater_days=int(longest), longest_underwater_recovered=recovered,
        min_cumulative_pnl=float(mtm.min()), fell_below_minus_100k=bool(mtm.min() < -100000),
        worst_day_mtm_change=float(daily_chg.min()), worst_day_date=str(d['date'].iloc[worst_k]),
        profit_to_drawdown=res['net'] / res['mdd'] if res['mdd'] > 0 else None,
        # C. Exposure
        avg_borrowed_all_sessions=float(bal.mean()), avg_borrowed_while_invested=float(bal[invested].mean()) if invested.any() else 0.0,
        margin_dollar_days=res['dollar_days'], pct_sessions_exposed=float(invested.mean()), max_borrowed=float(bal.max()),
        net_profit_per_1m_dollar_days=res['net'] / (res['dollar_days'] / 1e6) if res['dollar_days'] > 0 else None,
        # D/E. Windows
        bear_windows=bears, recovery_windows=recs,
    )


def baseline_result(dataset):
    if dataset not in _BASE_CACHE:
        _BASE_CACHE[dataset] = run(dataset, Strategy())
    return _BASE_CACHE[dataset]


def matched_control(res, dataset):
    base = baseline_result(dataset)
    size = 100000.0 * res['dollar_days'] / base['dollar_days']
    ctrl = run(dataset, FixedSize(size))
    exp_ratio = res['net'] / res['mdd'] if res['mdd'] > 0 else None
    ctl_ratio = ctrl['net'] / ctrl['mdd'] if ctrl['mdd'] > 0 else None
    return dict(control_fixed_size=size, exposure_vs_baseline=res['dollar_days'] / base['dollar_days'],
                experiment_profit=res['net'], control_profit=ctrl['net'], experiment_max_drawdown=res['mdd'],
                control_max_drawdown=ctrl['mdd'], profit_difference=res['net'] - ctrl['net'],
                drawdown_difference=res['mdd'] - ctrl['mdd'],
                experiment_profit_to_drawdown=exp_ratio, control_profit_to_drawdown=ctl_ratio,
                profit_to_drawdown_difference=(exp_ratio - ctl_ratio) if exp_ratio is not None and ctl_ratio is not None else None,
                control_dollar_days=ctrl['dollar_days'])


def run_config(experiment, config, strategy, dataset, out_dir, extra=None):
    """Run one configuration on one dataset; write trades and daily series; return the standard record."""
    res = run(dataset, strategy)
    out = Path(out_dir)
    (out / 'trades').mkdir(parents=True, exist_ok=True)
    (out / 'daily').mkdir(parents=True, exist_ok=True)
    res['trades'].to_csv(out / 'trades' / f'{dataset}__{config}.csv', index=False)
    res['daily'].to_csv(out / 'daily' / f'{dataset}__{config}.csv', index=False)
    rec = dict(experiment=experiment, config=config, dataset=dataset, metrics=standard_metrics(res, dataset),
               matched_control=matched_control(res, dataset), extra=extra or {})
    return rec, res


def write_summary(records, out_dir):
    def clean(x):
        if isinstance(x, dict):
            return {k: clean(v) for k, v in x.items()}
        if isinstance(x, (list, tuple)):
            return [clean(v) for v in x]
        if isinstance(x, (np.floating, np.integer)):
            return x.item()
        if isinstance(x, np.bool_):
            return bool(x)
        return x
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    json.dump(clean(records), open(Path(out_dir) / 'summary.json', 'w'), indent=1, default=str)
