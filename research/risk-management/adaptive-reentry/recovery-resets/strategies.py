"""Family C — recovery reset mechanisms (experiment `adaptive_resets`).

Every configuration varies ONLY the `reset` component of `framework.AdaptiveStrategy`:
trigger = default (any net loss), required_level = framework default (fixed 3% below the frozen
loss-exit price). The single exception the spec defines is C11_graduated, whose staged severity is
expressed through `required_level` (3% until the close has reached 1.08x the episode low, then
1.5%, sticky within the episode) while its reset stays the C1 frozen-high 95%.

Reset definitions (all compare session i's CLOSE, per the frozen chronology: reset priority on a
same-session close, no entry on the reset session, entries resume the next session; the reset is
also evaluated on the arming exit session itself):

  C0_none            never resets (diagnostic).
  C1_frozen95        close >= 0.95 * frozen ref high (REF anchor = REF_lower3).
  C2_exit_price      close >= frozen loss-exit price.
  C3_entry_price     close >= frozen losing entry price.
  C4_rebound_x       close >= (1 + x) * episode low (x = 10/15/20%).
  C5_atr_rebound_k   close >= episode low + k * ATR14[i] (k = 3/5).
  C6_retrace_f       close >= low + f * (frozen ref high - low) (f = 0.38/0.50).
  C7_rolling95       close >= 0.95 * rolling 90-session previous high.
  C8_breakout20      close > highest close of sessions i-20..i-1.
  C9_base40          no new episode low for 40 sessions (i - min_close_i >= 40).
  C10_time_price     sessions_restricted >= 60 AND close >= 1.05 * episode low.
  C11_graduated      reset = C1; required_level staged as above.
  C12_sma100         close >= SMA100[i] (trend-regime reclaim).
  C12_signal_gone15  no 10% entry signal (dd90 < 10%) for 15 consecutive sessions through i.
  C12_vol_crush      NATR14[i] <= 0.66 * NATR14[arming exit session].
  C12_timeout120     sessions_restricted >= 120 (pure information decay).
  C12_half_repair    close >= (episode low + frozen loss-exit price) / 2.
  C12_held_above     min close of the last 20 sessions >= 1.05 * episode low.

Indicator fallback (spec rule 5 / the family's stated fallback): where a reset reads an indicator
that is NaN (only possible near a dataset's start), the reset falls back to the C1 frozen-high 95%
condition and increments ctx.counters['indicator_fallbacks']. The required_level is the fixed 3%
everywhere already, so no level fallback arises. Note the reset can be evaluated twice on a signal
session (entry gate + session end), so fallback counts are per evaluation, not per session.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))

from framework import AdaptiveStrategy, frozen_high_reset, no_reset  # noqa: E402

_FROZEN95 = frozen_high_reset(0.95)


def _fallback(ctx, st, i):
    ctx.counters['indicator_fallbacks'] += 1
    return _FROZEN95(ctx, st, i)


# ---- spec-defined resets ----

def exit_price_reset(ctx, st, i):
    return ctx.e.c[i] >= st.exit_price


def entry_price_reset(ctx, st, i):
    return ctx.e.c[i] >= st.entry_price


def rebound_reset(x):
    def reset(ctx, st, i):
        return ctx.e.c[i] >= (1 + x) * st.min_close
    reset.__name__ = f'rebound_reset_{x:g}'
    return reset


def atr_rebound_reset(k):
    def reset(ctx, st, i):
        atr = ctx.ind.atr(14)[i]
        if np.isnan(atr):
            return _fallback(ctx, st, i)
        return ctx.e.c[i] >= st.min_close + k * atr
    reset.__name__ = f'atr_rebound_reset_{k:g}'
    return reset


def retrace_reset(f):
    def reset(ctx, st, i):
        return ctx.e.c[i] >= st.min_close + f * (st.ref_high - st.min_close)
    reset.__name__ = f'retrace_reset_{f:g}'
    return reset


def rolling95_reset(ctx, st, i):
    rh = ctx.ind.roll_high_prev(90)[i]
    if np.isnan(rh):
        return _fallback(ctx, st, i)
    return ctx.e.c[i] >= 0.95 * rh


def breakout20_reset(ctx, st, i):
    if i < 1:
        return _fallback(ctx, st, i)
    return ctx.e.c[i] > ctx.ind.max_close(20)[i - 1]


def base40_reset(ctx, st, i):
    return i - st.min_close_i >= 40


def time_price_reset(ctx, st, i):
    return st.sessions_restricted >= 60 and ctx.e.c[i] >= 1.05 * st.min_close


def graduated_level(ctx, st, i):
    """C11 stage machine: 3% discount until the close has (ever, within this episode) reached
    1.08x the episode low known at that time; from then on 1.5% (sticky). Reset stays C1."""
    if not getattr(st, 'c11_stage2', False) and ctx.e.c[i] >= 1.08 * st.min_close:
        st.c11_stage2 = True
    return st.exit_price * (1 - (0.015 if getattr(st, 'c11_stage2', False) else 0.03))


# ---- C12 agent-proposed resets (registered with hypotheses before any run) ----

def sma100_reset(ctx, st, i):
    s = ctx.ind.sma(100)[i]
    if np.isnan(s):
        return _fallback(ctx, st, i)
    return ctx.e.c[i] >= s


def signal_gone_reset(n):
    def reset(ctx, st, i):
        lo = i - n + 1
        if lo < 1:  # dd90[0] is NaN (no previous high); insufficient history
            return _fallback(ctx, st, i)
        dd = ctx.ind.dd_from_high(90)[lo:i + 1]
        if np.isnan(dd).any():
            return _fallback(ctx, st, i)
        return bool((dd < 0.10).all())
    reset.__name__ = f'signal_gone_reset_{n}'
    return reset


def vol_crush_reset(frac):
    def reset(ctx, st, i):
        natr = ctx.ind.natr(14)
        cur, arm = natr[i], natr[st.exit_i]
        if np.isnan(cur) or np.isnan(arm):
            return _fallback(ctx, st, i)
        return cur <= frac * arm
    reset.__name__ = f'vol_crush_reset_{frac:g}'
    return reset


def timeout_reset(n):
    def reset(ctx, st, i):
        return st.sessions_restricted >= n
    reset.__name__ = f'timeout_reset_{n}'
    return reset


def half_repair_reset(ctx, st, i):
    return ctx.e.c[i] >= 0.5 * (st.min_close + st.exit_price)


def held_above_reset(ctx, st, i):
    return ctx.ind.min_close(20)[i] >= 1.05 * st.min_close


# ---- configurations ----

def _make(reset=None, required_level=None):
    def factory():
        return AdaptiveStrategy('tmp', reset=reset, required_level=required_level)
    return factory


CONFIGS = {
    'C0_none': _make(reset=no_reset),
    'C1_frozen95': _make(reset=frozen_high_reset(0.95)),
    'C2_exit_price': _make(reset=exit_price_reset),
    'C3_entry_price': _make(reset=entry_price_reset),
    'C4_rebound_10': _make(reset=rebound_reset(0.10)),
    'C4_rebound_15': _make(reset=rebound_reset(0.15)),
    'C4_rebound_20': _make(reset=rebound_reset(0.20)),
    'C5_atr_rebound_3': _make(reset=atr_rebound_reset(3.0)),
    'C5_atr_rebound_5': _make(reset=atr_rebound_reset(5.0)),
    'C6_retrace_38': _make(reset=retrace_reset(0.38)),
    'C6_retrace_50': _make(reset=retrace_reset(0.50)),
    'C7_rolling95': _make(reset=rolling95_reset),
    'C8_breakout20': _make(reset=breakout20_reset),
    'C9_base40': _make(reset=base40_reset),
    'C10_time_price': _make(reset=time_price_reset),
    'C11_graduated': _make(reset=frozen_high_reset(0.95), required_level=graduated_level),
    'C12_sma100': _make(reset=sma100_reset),
    'C12_signal_gone15': _make(reset=signal_gone_reset(15)),
    'C12_vol_crush': _make(reset=vol_crush_reset(0.66)),
    'C12_timeout120': _make(reset=timeout_reset(120)),
    'C12_half_repair': _make(reset=half_repair_reset),
    'C12_held_above': _make(reset=held_above_reset),
}
