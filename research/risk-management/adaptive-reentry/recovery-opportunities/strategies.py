"""Family D — recovery opportunity preservation: component definitions.

Every configuration keeps the reference components (trigger = net loss, required level = loss exit
x 0.97, reset = frozen-high 95%) except for the single documented change. All thresholds compare
CLOSES (shared mechanics; intraday alternatives belong to Family F). Exact semantics here match the
registry entries in registry.jsonl, registered before the first run.

Conventions used below (from the frozen framework):
- st.min_close / st.max_close: lowest/highest CLOSE since the arming exit session inclusive, updated
  through session i's close before any component runs (so they include session i itself).
- alt_entry is evaluated only on sessions with the 10% signal, while restricted and flat, after the
  reset priority check, and only when the close did NOT reach the required level (close <= level
  enters via the price path first).
- dd252 = ctx.ind.dd_from_high(252)[i] (NaN only at i=0 by the frozen convention; NaN falls back to
  the fixed 3% requirement and increments ctx.counters['indicator_fallbacks']).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from framework import AdaptiveStrategy, fixed_discount  # noqa: E402

REF_DISC = 0.03  # the reference (existing) 3% discount off the frozen loss-exit price


def _ref_level(st):
    return st.exit_price * (1 - REF_DISC)


# ---------------------------------------------------------------- anchors (D6 diagnostic)

def ref_lower3_cfg():
    return AdaptiveStrategy('REF_lower3')  # all defaults = the verified existing 3% rule


def lower5_cfg():
    return AdaptiveStrategy('lower5', required_level=fixed_discount(0.05))


def lower8_cfg():
    return AdaptiveStrategy('lower8', required_level=fixed_discount(0.08))


# ---------------------------------------------------------------- D1 — rebound paths

def d1_reset_only_rebound12():
    """ADDITIONAL reset: close >= 1.12 x episode low (frozen95 kept). Baseline-compatible: a reset
    never buys; any later entry still needs the 10% signal and baseline entry rules."""
    def reset(ctx, st, i):
        c = float(ctx.e.c[i])
        return c >= 0.95 * st.ref_high or c >= 1.12 * st.min_close
    reset.__name__ = 'frozen95_or_rebound12'
    return AdaptiveStrategy('D1_reset_only_rebound12', reset=reset)


def d1_alt_entry_rebound10():
    """Exploratory alt ENTRY while restricted: close >= 1.10 x episode low AND close <= 0.85 x frozen
    ref high (depth cap against buying near a bear-rally top)."""
    def alt(ctx, st, i):
        c = float(ctx.e.c[i])
        return c >= 1.10 * st.min_close and c <= 0.85 * st.ref_high
    alt.__name__ = 'rebound10_capped85'
    return AdaptiveStrategy('D1_alt_entry_rebound10', alt_entry=alt)


# ---------------------------------------------------------------- D2 — near-miss window

def d2_window():
    """Alt entry: close <= required level x 1.02 AND close >= 1.03 x episode low (exactly as
    specified). Note the arithmetic consequence reported in RECOVERY_OPPORTUNITIES.md: both
    conditions can only hold when the episode low already sits <= level x 1.02/1.03 ~ level - 0.97%,
    i.e. when some close reached the level on a session where no entry was possible (the arming exit
    session or a session without the 10% signal)."""
    def alt(ctx, st, i):
        c = float(ctx.e.c[i])
        return c <= _ref_level(st) * 1.02 and c >= 1.03 * st.min_close
    alt.__name__ = 'window_102_rebound103'
    return AdaptiveStrategy('D2_window', alt_entry=alt)


# ---------------------------------------------------------------- D3 — deep-drawdown tolerance

def d3_tolerance_deep():
    """Required level = ref level x 1.02 only while dd252 >= 25%, else the exact ref level."""
    def level(ctx, st, i):
        dd = ctx.ind.dd_from_high(252)[i]
        if np.isnan(dd):
            ctx.counters['indicator_fallbacks'] += 1
            return _ref_level(st)
        return _ref_level(st) * (1.02 if dd >= 0.25 else 1.0)
    level.__name__ = 'ref_level_tol2_deep25'
    return AdaptiveStrategy('D3_tolerance_deep', required_level=level)


def d3_control_fixed_106():
    """Honest comparison for D3: simply a smaller fixed threshold everywhere. 0.97 x 1.02 = 0.9894,
    i.e. a 1.06% fixed discount — what D3 uses in deep drawdowns, applied unconditionally."""
    return AdaptiveStrategy('D3_control_fixed_106', required_level=fixed_discount(0.0106))


# ---------------------------------------------------------------- D4 — score of conditions

def d4_score():
    """Alt entry when >= 2 of the four registered conditions hold:
    (a) close <= losing entry x 0.97; (b) close <= loss exit price; (c) dd252 >= 20%
    (NaN => condition false + indicator_fallbacks); (d) close >= 1.05 x episode low."""
    def alt(ctx, st, i):
        c = float(ctx.e.c[i])
        dd = ctx.ind.dd_from_high(252)[i]
        if np.isnan(dd):
            ctx.counters['indicator_fallbacks'] += 1
            cond_dd = False
        else:
            cond_dd = dd >= 0.20
        score = (c <= st.entry_price * 0.97) + (c <= st.exit_price) + cond_dd + (c >= 1.05 * st.min_close)
        return score >= 2
    alt.__name__ = 'score_2_of_4'
    return AdaptiveStrategy('D4_score', alt_entry=alt)


# ---------------------------------------------------------------- D5 — range stabilization

def d5_stabilized_relax():
    """Discount drops from 3% to 1% at sessions where max_close(20)/min_close(20) < 1.05 (the
    trailing 20-session close range has stabilized under 5%). Evaluated per session, no latch —
    a renewed range expansion restores the 3% requirement."""
    def level(ctx, st, i):
        mx = ctx.ind.max_close(20)[i]
        mn = ctx.ind.min_close(20)[i]
        disc = 0.01 if mx / mn < 1.05 else REF_DISC
        return st.exit_price * (1 - disc)
    level.__name__ = 'relax1_when_range20_lt_105'
    return AdaptiveStrategy('D5_stabilized_relax', required_level=level)


# ---------------------------------------------------------------- D7 — agent-proposed mechanisms

def d7_confirm_near():
    """Alt entry: close <= required level x 1.05 AND the last two closes are strictly rising
    (c[i] > c[i-1] > c[i-2]). Momentum confirmation substitutes for the last <=5% of discount."""
    def alt(ctx, st, i):
        if i < 2:
            return False
        c = ctx.e.c
        return float(c[i]) <= _ref_level(st) * 1.05 and c[i] > c[i - 1] > c[i - 2]
    alt.__name__ = 'two_up_closes_within5'
    return AdaptiveStrategy('D7_confirm_near', alt_entry=alt)


def d7_signal_pressure():
    """Alt entry: >= 10 previously blocked signal sessions in this episode AND close <= required
    level x 1.03. Persistent signal pressure near the level = basing market, rising opportunity cost."""
    def alt(ctx, st, i):
        return len(st.blocked_is) >= 10 and float(ctx.e.c[i]) <= _ref_level(st) * 1.03
    alt.__name__ = 'blocked10_within3'
    return AdaptiveStrategy('D7_signal_pressure', alt_entry=alt)


def d7_higher_low_base():
    """Alt entry: no new episode-low close for >= 15 sessions (i - st.min_close_i >= 15) AND close
    <= 0.90 x frozen ref high. A durable floor while still deep below the old top = enter the base."""
    def alt(ctx, st, i):
        return (i - st.min_close_i) >= 15 and float(ctx.e.c[i]) <= 0.90 * st.ref_high
    alt.__name__ = 'floor15_capped90'
    return AdaptiveStrategy('D7_higher_low_base', alt_entry=alt)


def d7_fresh_leg():
    """Alt entry: the episode's max close reached >= 1.08 x loss exit (a material post-exit rebound
    happened) AND close <= 0.92 x that episode max (a fresh 8% decline off the post-exit high).
    Treats 'rebound then fresh dip' as a NEW correction rather than the old cascade."""
    def alt(ctx, st, i):
        c = float(ctx.e.c[i])
        return st.max_close >= 1.08 * st.exit_price and c <= 0.92 * st.max_close
    alt.__name__ = 'rebound8_fresh_dip8'
    return AdaptiveStrategy('D7_fresh_leg', alt_entry=alt)


def d7_tiny_loss_exit_anchor():
    """Alt entry: |episode arming loss| < $2,000 AND close <= the frozen loss-exit price. Trivial
    losses keep a restriction but only demand 'no higher than where we sold', not a 3% discount."""
    def alt(ctx, st, i):
        return abs(st.loss) < 2000.0 and float(ctx.e.c[i]) <= st.exit_price
    alt.__name__ = 'tiny_loss_exit_anchor'
    return AdaptiveStrategy('D7_tiny_loss_exit_anchor', alt_entry=alt)


CONFIGS = {
    'REF_lower3': ref_lower3_cfg,
    'lower5': lower5_cfg,
    'lower8': lower8_cfg,
    'D1_reset_only_rebound12': d1_reset_only_rebound12,
    'D1_alt_entry_rebound10': d1_alt_entry_rebound10,
    'D2_window': d2_window,
    'D3_tolerance_deep': d3_tolerance_deep,
    'D3_control_fixed_106': d3_control_fixed_106,
    'D4_score': d4_score,
    'D5_stabilized_relax': d5_stabilized_relax,
    'D7_confirm_near': d7_confirm_near,
    'D7_signal_pressure': d7_signal_pressure,
    'D7_higher_low_base': d7_higher_low_base,
    'D7_fresh_leg': d7_fresh_leg,
    'D7_tiny_loss_exit_anchor': d7_tiny_loss_exit_anchor,
}
