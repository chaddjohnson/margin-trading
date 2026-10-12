"""Composable re-entry state machine over the frozen engine (Phase 2 shared infrastructure; frozen after
the calibration gate passes — research agents import it and must not modify it).

Chronology (identical to the verified lower-price-reentry implementation and production allIn.ts):
within session i: entry decision at the close (only while flat and only with the 10% signal) -> exit
evaluation -> mark-to-market -> end of session (restriction resolution: an entry clears the restriction;
otherwise, while flat, the reset is evaluated — including on the arming exit session itself). A session
whose close satisfies the reset never buys that session (reset priority); entries resume from the next
session. No entry ever happens on an exit session (engine property).

Components (plain functions; every value they read is available at session i's close — no look-ahead):
- trigger(ctx, trade) -> bool: whether a closed trade arms a restriction. Default: net P&L < 0 (A0).
- required_level(ctx, st, i) -> float: the highest close at which a restricted entry may fill at session
  i. Default: st.exit_price * 0.97 (the verified 3% rule). Return -inf to block all price-path entries.
- reset(ctx, st, i) -> bool: whether the restriction clears at session i's close. Default:
  close >= 0.95 * st.ref_high (the verified frozen-high reset). Return False always for "no reset" (C0).
- alt_entry(ctx, st, i) -> bool: optional second entry path while restricted (Family D). Evaluated only
  on sessions with the 10% signal, after the reset priority check and after the price path: the entry is
  allowed when close <= required_level OR alt_entry(...). Default: none.

`ctx` is the running AdaptiveStrategy instance: ctx.e (engine), ctx.ind (IndicatorBundle on the same
arrays), ctx.correction (see below), ctx.params. `st` is the EpisodeState.

EpisodeState fields frozen at arming: exit_i, exit_price, exit_reason, loss (net P&L), entry_i,
entry_price, price_return (exit/entry - 1), ref_high (the losing trade's entry-signal 90-session high).
Evolving fields, updated through session i's close before any component runs at i: min_close (lowest
close from the exit session through i), min_close_i, sessions_restricted (i - exit_i).

Correction state (ctx.correction, for Families B6/B8/E): starts when a restriction arms while no
correction is active; each arming loss extends it (n_failed, cum_loss, latest entry/exit prices); it
keeps the FIRST failed entry's price and reference high as stable anchors. A profitable exit always
clears it. A non-arming loss (e.g. financing-only under Family A triggers) leaves it unchanged. A
recovery reset clears it when correction_ends_on_reset (default True).

Entry size is `size` (default $100,000) for every entry; the trade sequence is size-invariant (all
rules are price/sign based), which the matched-exposure controls rely on.

With every default component, AdaptiveStrategy reproduces lower-price-reentry B_lower_3pct exactly, and
with restrict=False it reproduces the baseline exactly (asserted by common/selftest.py).
"""
from __future__ import annotations

import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'baseline'))

from engine import Strategy  # noqa: E402

from indicators import IndicatorBundle  # noqa: E402

NEG_INF = float('-inf')


def default_trigger(ctx, trade):
    """A0: any net loss (margin interest included) arms the restriction."""
    return trade['profit'] < 0


def fixed_discount(pct):
    """B0-style: close must be `pct` below the frozen loss-exit price (0.03 = the verified 3% rule)."""
    def required_level(ctx, st, i):
        return st.exit_price * (1 - pct)
    required_level.__name__ = f'fixed_discount_{pct:g}'
    return required_level


def frozen_high_reset(fraction=0.95):
    """C1: reset when the close recovers to `fraction` of the frozen entry reference high."""
    def reset(ctx, st, i):
        return ctx.e.c[i] >= fraction * st.ref_high
    reset.__name__ = f'frozen_high_reset_{fraction:g}'
    return reset


def no_reset(ctx, st, i):
    """C0: the restriction never resets; only a qualifying entry clears it."""
    return False


@dataclass
class EpisodeState:
    exit_i: int
    exit_price: float
    exit_reason: str
    loss: float
    entry_i: int
    entry_price: float
    price_return: float
    ref_high: float
    min_close: float
    min_close_i: int
    sessions_restricted: int = 0
    updated_through: int = -1
    # bookkeeping
    blocked_is: list = field(default_factory=list)
    resolution: str | None = None
    resolution_i: int | None = None
    reentry_i: int | None = None
    entry_path: str = ''
    max_close: float = 0.0
    required_level_at_entry: float = float('nan')
    # The closest the close ever came to the (possibly time-varying) required level, as close/level - 1;
    # negative means the level was reached. inf when no finite level was ever in force.
    min_gap: float = float('inf')


@dataclass
class Correction:
    first_entry_i: int
    first_entry_price: float
    ref_high: float  # the first failed entry's reference high (stable anchor)
    n_failed: int = 0
    cum_loss: float = 0.0
    last_entry_price: float = float('nan')
    last_exit_price: float = float('nan')
    last_exit_i: int = -1


class AdaptiveStrategy(Strategy):
    """The composed state machine. Pass component functions; defaults reproduce the verified 3% rule."""

    def __init__(self, name, trigger=None, required_level=None, reset=None, alt_entry=None,
                 size=100000.0, restrict=True, correction_ends_on_reset=True):
        self.name = name
        self.trigger = trigger or default_trigger
        self.required_level = required_level or fixed_discount(0.03)
        self.reset = reset or frozen_high_reset(0.95)
        self.alt_entry = alt_entry
        self.size = float(size)
        self.restrict = restrict
        self.correction_ends_on_reset = correction_ends_on_reset
        self.st: EpisodeState | None = None
        self.correction: Correction | None = None
        self.events: list[EpisodeState] = []
        self.rows = []
        self.ind: IndicatorBundle | None = None
        self.blocked_is = set()
        self.counters = dict(blocked_sessions=0, lower_price_reentries=0, alt_entries=0,
                             recovery_resets=0, reset_priority_blocks=0, triggers_declined=0,
                             indicator_fallbacks=0)

    # -- plumbing --
    def entry_size(self, e, i):
        return self.size

    def _prepare(self, e):
        if self.ind is None:
            self.ind = IndicatorBundle(e)
            self.e = e

    def _signal(self, e, i):
        recent_high = e.h[max(0, i - e.params.window):i].max()
        return 1 - e.c[i] / recent_high >= e.params.target

    def _update(self, e, i):
        st = self.st
        if st is None or st.updated_through >= i:
            return
        c = float(e.c[i])
        if c < st.min_close:
            st.min_close, st.min_close_i = c, i
        st.max_close = max(st.max_close, c)
        st.sessions_restricted = i - st.exit_i
        st.updated_through = i

    def _log(self, e, i, prev, new, reason, signal, entry, level=float('nan')):
        st = self.st
        self.rows.append(dict(
            i=i, date=str(e.dates.iloc[i].date()), prev_state=prev, new_state=new, reason=reason,
            loss_exit_price=st.exit_price if st else None, ref_high=st.ref_high if st else None,
            required_level=None if math.isnan(level) else level,
            close=float(e.c[i]), signal_10pct=bool(signal), entry_executed=bool(entry),
            n_failed=self.correction.n_failed if self.correction else 0))

    def _track_gap(self, st, c, level):
        if level > 0 and not math.isinf(level) and not math.isnan(level):
            st.min_gap = min(st.min_gap, c / level - 1)

    def _resolve(self, st, how, i):
        st.resolution, st.resolution_i = how, i
        self.st = None

    # -- hooks --
    def on_exit(self, e, i, trade):
        self._prepare(e)
        assert self.st is None, 'an exit occurred while restricted'
        signal = self._signal(e, i)
        if self.restrict and self.trigger(self, trade):
            entry_i = trade['entry_i']
            ref_high = float(e.h[max(0, entry_i - e.params.window):entry_i].max())
            if self.correction is None:
                self.correction = Correction(first_entry_i=entry_i, first_entry_price=float(trade['entry_price']),
                                             ref_high=ref_high)
            co = self.correction
            co.n_failed += 1
            co.cum_loss += float(trade['profit'])
            co.last_entry_price, co.last_exit_price, co.last_exit_i = float(trade['entry_price']), float(trade['exit_price']), i
            self.st = EpisodeState(
                exit_i=i, exit_price=float(trade['exit_price']), exit_reason=trade['reason'],
                loss=float(trade['profit']), entry_i=entry_i, entry_price=float(trade['entry_price']),
                price_return=float(trade['exit_price']) / float(trade['entry_price']) - 1,
                ref_high=ref_high, min_close=float(e.c[i]), min_close_i=i, max_close=float(e.c[i]))
            self.events.append(self.st)
            self._log(e, i, 'NORMAL', 'RESTRICTED', f"losing_exit ({trade['reason']}, {trade['profit']:+.0f})",
                      signal, False)
        elif trade['profit'] < 0:
            self.counters['triggers_declined'] += 1
            self._log(e, i, 'NORMAL', 'NORMAL', f"loss_not_restricted ({trade['reason']}, {trade['profit']:+.0f})",
                      signal, False)
        else:
            self.correction = None
            self._log(e, i, 'NORMAL', 'NORMAL', f"profitable_exit ({trade['reason']}, {trade['profit']:+.0f})",
                      signal, False)

    def entry_allowed(self, e, i):
        self._prepare(e)
        if self.st is None:
            return True
        st = self.st
        self._update(e, i)
        if self.reset(self, st, i):
            self.counters['reset_priority_blocks'] += 1
            self.blocked_is.add(i)
            st.blocked_is.append(i)
            return False
        level = float(self.required_level(self, st, i))
        c = float(e.c[i])
        self._track_gap(st, c, level)
        if c <= level:
            self.counters['lower_price_reentries'] += 1
            st.entry_path, st.required_level_at_entry = 'lower_price', level
            return True
        if self.alt_entry is not None and self.alt_entry(self, st, i):
            self.counters['alt_entries'] += 1
            st.entry_path, st.required_level_at_entry = 'alt', level
            return True
        self.counters['blocked_sessions'] += 1
        self.blocked_is.add(i)
        st.blocked_is.append(i)
        return False

    def on_session_end(self, e, i):
        self._prepare(e)
        st = self.st
        if st is None:
            if e.pos is not None and e.pos.entry_i == i:
                self._log(e, i, 'NORMAL', 'NORMAL', 'normal_entry', True, True)
            return
        self._update(e, i)
        signal = self._signal(e, i)
        if e.pos is not None:
            assert e.pos.entry_i == i, 'a position predates the restriction'
            st.reentry_i = i
            how = 'alt_entry' if st.entry_path == 'alt' else 'lower_price_reentry'
            self._log(e, i, 'RESTRICTED', 'NORMAL', how, signal, True, st.required_level_at_entry)
            self._resolve(st, how, i)
        elif self.reset(self, st, i):
            self.counters['recovery_resets'] += 1
            self._log(e, i, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, False)
            self._resolve(st, 'recovery_reset', i)
            if self.correction_ends_on_reset:
                self.correction = None
        else:
            level = float(self.required_level(self, st, i))
            self._track_gap(st, float(e.c[i]), level)
            reason = 'entry_blocked' if i in st.blocked_is else 'restricted'
            self._log(e, i, 'RESTRICTED', 'RESTRICTED', reason, signal, False, level)
            if i == e.n - 1:
                st.resolution, st.resolution_i = 'unresolved_at_end', i


def ref_baseline(size=100000.0):
    return AdaptiveStrategy('A_baseline' if size == 100000.0 else f'baseline_{size:.0f}', restrict=False, size=size)


def ref_lower3(size=100000.0):
    return AdaptiveStrategy('REF_lower3' if size == 100000.0 else f'lower3_{size:.0f}', size=size)
