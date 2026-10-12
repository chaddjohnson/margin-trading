"""Frozen research engine for the margin ETF strategy: a replica of src/app/allIn.ts with extension hooks.

With the default `Strategy` (no hook overridden), it reproduces allIn.ts trade for trade on all four datasets
(see BASELINES.md). Experiments subclass `Strategy` in their own directories. They must not modify this file.

Execution model (unchanged from allIn.ts):
- Entry: when flat, at the close of a session whose close is >= 10% below the highest high of the previous
  90 sessions (fewer at the start of a dataset). No entry on a session in which a position exited.
- Before each session the trailing stop is active only if selling at the stop would be profitable after
  interest accrued through that session. Its level is 8% below the highest high through the previous session
  (the entry close on the first session) and never moves down.
- At the open: the 15-calendar-day loss exit sells if a sale at the open would lose money; an active stop
  that the open gaps through fills at the open. One fill only.
- During the session: an active stop fills at its level once the low reaches it.
- Interest: simple, 11%/yr on the amount borrowed, per calendar day from the purchase date to the exit date,
  none on the purchase day.
- Daily mark-to-market P&L = realized P&L + open position at the close net of accrued interest. Drawdown is
  measured from a running peak that starts at 0.

Extension semantics (documented assumptions; inert by default):
- extra_stops: additional sell-stop levels, known before the session. If the open is at or below any of them,
  the position sells at the open (one fill, together with any other open trigger). Otherwise, during the
  session, every stop whose level the low reaches is a candidate, and the HIGHEST level fills first: price
  starts at the open (above all levels) and must pass through higher levels before lower ones. This needs no
  assumption about whether the high or the low came first.
- add_on: dollars to add at the close of a session in which the open position did not exit. A lot added at a
  close cannot trigger an exit in that session. It accrues its own interest from its purchase date. The stop
  level is never reset or lowered by an addition; activation uses the aggregate position.
"""

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

SECONDS_PER_DAY = 24 * 60 * 60
YEAR_SECONDS = 365 * SECONDS_PER_DAY
REPO = Path(__file__).resolve().parents[3]

DATASETS = {
    'VGT_2005_2015': dict(symbol='VGT', file='data/VGT/VGT-2004-2015.csv'),
    'QQQ_1999_2015': dict(symbol='QQQ', file='data/QQQ/QQQ-1999-2015.csv'),
    'VGT_2016_2026': dict(symbol='VGT', file='data/VGT/VGT-2016-2026.csv'),
    'QQQ_2016_2026': dict(symbol='QQQ', file='data/QQQ/QQQ-2016-2026.csv'),
}


def load(dataset, start=None, end=None):
    """Full date range of the dataset file unless start/end are given (used only for reproduction checks)."""
    spec = DATASETS[dataset]
    df = pd.read_csv(REPO / spec['file'], sep='|', header=None, names=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'])
    if start is not None:
        df = df[df['date'] >= start]
    if end is not None:
        df = df[df['date'] <= end]
    df = df.reset_index(drop=True)
    df['time'] = (df['date'] - pd.Timestamp('1970-01-01')) // pd.Timedelta(seconds=1)
    return df


@dataclass(frozen=True)
class Params:
    window: int = 90
    target: float = 0.10
    trail: float = 0.08
    loss_exit_days: int = 15
    rate: float = 0.11
    base_size: float = 100000.0


@dataclass
class Lot:
    index: int
    time: float
    price: float
    shares: float
    investment: float


@dataclass
class Position:
    lots: list
    entry_i: int
    entry_time: float
    entry_price: float
    post_high: float
    post_low: float
    stop: float

    @property
    def shares(self):
        return sum(lot.shares for lot in self.lots)

    @property
    def investment(self):
        return sum(lot.investment for lot in self.lots)

    def interest(self, ts, rate):
        return sum(lot.investment * rate * ((ts - lot.time) / YEAR_SECONDS) for lot in self.lots)


class Strategy:
    """Baseline behaviour. Override hooks in experiment code; `e` is the running Engine, `i` the session index."""

    name = 'baseline'

    def entry_size(self, e, i):
        return e.params.base_size

    def entry_allowed(self, e, i):
        return True

    def extra_stops(self, e, i):
        return []  # list of (name, level)

    def add_on(self, e, i):
        return 0.0

    def on_exit(self, e, i, trade):
        pass

    def on_session_end(self, e, i):
        pass


class Engine:
    def __init__(self, df, strategy=None, params=Params()):
        self.df = df
        self.strategy = strategy or Strategy()
        self.params = params
        self.o, self.h, self.l, self.c, self.t = (df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low', 'close', 'time'])
        self.dates = df['date']
        n = len(df)
        self.n = n
        self.pos = None
        self.trades = []
        self.realized = 0.0
        self.mtm = np.zeros(n)
        self.borrowed = np.zeros(n)
        self.peak = 0.0
        self.peak_prev = 0.0  # running peak as of the previous completed session
        self.dd_prev = 0.0  # drawdown as of the previous completed session
        self.exited_this_session = False

    def _close(self, i, price, reason, also):
        p = self.pos
        accrued = p.interest(self.t[i], self.params.rate)
        profit = p.shares * price - p.investment - accrued
        trade = dict(entry_i=p.entry_i, exit_i=i, entry_date=self.dates.iloc[p.entry_i].date(),
                     exit_date=self.dates.iloc[i].date(), entry_price=p.entry_price,
                     avg_entry_price=p.investment / p.shares, exit_price=price, reason=reason, also=';'.join(also),
                     investment=p.investment, initial_investment=p.lots[0].investment, n_lots=len(p.lots),
                     shares=p.shares, interest=accrued, profit=profit,
                     days_held=(self.t[i] - p.entry_time) / SECONDS_PER_DAY,
                     sessions_held=i - p.entry_i, lowest_low=min(p.post_low, price), highest_high=max(p.post_high, price),
                     lots=';'.join(f'{self.dates.iloc[lot.index].date()}@{lot.price:.4f}x{lot.investment:.0f}' for lot in p.lots))
        self.realized += profit
        self.trades.append(trade)
        self.pos = None
        self.exited_this_session = True
        self.strategy.on_exit(self, i, trade)

    def _evaluate_exit(self, i):
        p, prm = self.pos, self.params
        o, l = self.o[i], self.l[i]
        accrued = p.interest(self.t[i], prm.rate)

        def profit_at(price):
            return p.shares * price - p.investment - accrued

        stop_active = profit_at(p.stop) > 0
        days_held = (self.t[i] - p.entry_time) / SECONDS_PER_DAY
        extras = list(self.strategy.extra_stops(self, i))
        open_triggers = []
        if days_held >= prm.loss_exit_days and profit_at(o) < 0:
            open_triggers.append('maximum hold')
        if stop_active and o <= p.stop:
            open_triggers.append('trailing stop gap')
        for name, level in extras:
            if o <= level:
                open_triggers.append(f'{name} gap')
        if open_triggers:
            return o, open_triggers[0], open_triggers[1:]
        candidates = []
        if stop_active and l <= p.stop:
            candidates.append((p.stop, 'trailing stop'))
        for name, level in extras:
            if l <= level:
                candidates.append((level, name))
        if candidates:
            level, name = max(candidates, key=lambda x: x[0])  # first (highest) level reached on the way down
            return level, name, [nm for lv, nm in candidates if nm != name]
        return None

    def run(self):
        prm, s = self.params, self.strategy
        for i in range(self.n):
            if i == 0:
                continue
            self.exited_this_session = False
            recent_high = self.h[max(0, i - prm.window):i].max()
            pct = 1 - self.c[i] / recent_high
            prior = self.pos
            if prior is None and pct >= prm.target and s.entry_allowed(self, i):
                inv = float(s.entry_size(self, i))
                if inv > 0:
                    c = self.c[i]
                    self.pos = Position(lots=[Lot(i, self.t[i], c, inv / c, inv)], entry_i=i, entry_time=self.t[i],
                                        entry_price=c, post_high=c, post_low=c, stop=c * (1 - prm.trail))
            if prior is not None:
                ex = self._evaluate_exit(i)
                if ex:
                    self._close(i, *ex)
                else:
                    add = float(s.add_on(self, i))
                    if add > 0:
                        c = self.c[i]
                        prior.lots.append(Lot(i, self.t[i], c, add / c, add))
                    prior.post_high = max(prior.post_high, self.h[i])
                    prior.stop = max(prior.stop, prior.post_high * (1 - prm.trail))
                    prior.post_low = min(prior.post_low, self.l[i])
            marked = self.realized
            if self.pos is not None:
                p = self.pos
                marked += p.shares * self.c[i] - p.investment - p.interest(self.t[i], prm.rate)
                self.borrowed[i] = p.investment
            self.mtm[i] = marked
            if marked > self.peak:
                self.peak = marked
            self.peak_prev, self.dd_prev = self.peak, self.peak - marked
            s.on_session_end(self, i)
        return self._result()

    def _result(self):
        prm = self.params
        trades = list(self.trades)
        open_trade = None
        if self.pos is not None:
            p, i = self.pos, self.n - 1
            accrued = p.interest(self.t[i], prm.rate)
            open_trade = dict(entry_i=p.entry_i, exit_i=None, entry_date=self.dates.iloc[p.entry_i].date(), exit_date=None,
                              entry_price=p.entry_price, avg_entry_price=p.investment / p.shares, exit_price=self.c[i],
                              reason='open', also='', investment=p.investment, initial_investment=p.lots[0].investment,
                              n_lots=len(p.lots), shares=p.shares, interest=accrued,
                              profit=p.shares * self.c[i] - p.investment - accrued,
                              days_held=(self.t[i] - p.entry_time) / SECONDS_PER_DAY, sessions_held=i - p.entry_i,
                              lowest_low=min(p.post_low, self.l[i]), highest_high=max(p.post_high, self.h[i]),
                              lots=';'.join(f'{self.dates.iloc[lot.index].date()}@{lot.price:.4f}x{lot.investment:.0f}' for lot in p.lots))
            trades.append(open_trade)
        tr = pd.DataFrame(trades)
        peak = np.maximum.accumulate(np.r_[0.0, self.mtm[1:]])
        days = np.r_[0, np.diff(self.t) / SECONDS_PER_DAY]
        daily = pd.DataFrame(dict(date=self.dates.dt.date, close=self.c, borrowed=self.borrowed, mtm_pnl=self.mtm,
                                  peak_pnl=peak, drawdown=peak - self.mtm, calendar_days=days))
        dd = daily['drawdown'].to_numpy()
        trough = int(np.argmax(dd))
        peak_i = int(np.argmax(self.mtm[:trough + 1] >= peak[trough] - 1e-9)) if trough > 0 else 0
        interest = float(tr['interest'].sum()) if len(tr) else 0.0
        net = self.realized + (open_trade['profit'] if open_trade else 0.0)
        return dict(trades=tr, daily=daily, net=net, realized=self.realized,
                    unrealized=open_trade['profit'] if open_trade else 0.0, interest=interest,
                    mdd=float(dd.max()), mdd_peak=str(self.dates.iloc[peak_i].date()), mdd_trough=str(self.dates.iloc[trough].date()),
                    closed=len(self.trades), open=open_trade is not None,
                    dollar_days=float((np.r_[0.0, self.borrowed[:-1]] * days).sum()),
                    first_date=str(self.dates.iloc[0].date()), last_date=str(self.dates.iloc[-1].date()), sessions=self.n)


def run(dataset_or_df, strategy=None, params=Params(), **load_kw):
    df = load(dataset_or_df, **load_kw) if isinstance(dataset_or_df, str) else dataset_or_df
    return Engine(df, strategy, params).run()


class FixedSize(Strategy):
    """Baseline with a different fixed position size (matched-exposure control)."""

    def __init__(self, size):
        self.size = size
        self.name = f'fixed_{size:.0f}'

    def entry_size(self, e, i):
        return self.size
