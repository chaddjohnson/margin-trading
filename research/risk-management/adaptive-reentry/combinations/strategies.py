"""Family G — combinations (experiment `adaptive_combinations`).

Combines the promising mechanisms from the completed standalone families A-F. Every component
below is COPIED semantically unchanged from the frozen family code; the source file is cited per
component. Combos are pure compositions of `framework.AdaptiveStrategy` components (no subclassing,
no engine changes). All thresholds compare CLOSES (shared mechanics).

Component sources (exact copies; do not reinterpret):
- material_trigger(0.01)            loss-classification/strategies.py  (A2_material_1)
- tiny-loss exit anchor ($2,000)    recovery-opportunities/strategies.py (D7_tiny_loss_exit_anchor)
- b7_stall level                    adaptive-discounts/strategies.py   (B7_stall)
- b2_inverse level                  adaptive-discounts/strategies.py   (B2_inverse)
- retrace_reset(0.38)               recovery-resets/strategies.py      (C6_retrace_38)
- graduated_level (C11 stage machine) recovery-resets/strategies.py    (C11_graduated)
- fixed 3% level / frozen95 reset   common/framework.py                (REF_lower3 defaults)

The D7 tiny-loss mechanism appears in two equivalent forms:
- G_D7tiny (standalone ablation leg) uses the verbatim Family D ALT-ENTRY form:
  alt when |st.loss| < $2,000 AND close <= st.exit_price (required_level stays the default 3%).
- The combos express the same admission set through required_level: |st.loss| < $2,000 =>
  level = st.exit_price; else the combo's base level. For tiny episodes both forms admit exactly
  {close <= exit_price}; for others exactly {close <= base level}. The trade sequences are
  therefore identical; only the entry_path label and counters differ (alt vs lower_price).

G9 reset guard (Family C's proposed inversion fix, coordinator notes): a reset may fire ONLY if
close > required level x 1.02 — it must never surrender a pending discount entry. Both G9 configs
keep the fixed 3% level, so the guard constant is st.exit_price * 0.97 * 1.02. Analytic note,
stated before running: 0.97 * 1.02 = 0.9894 < 1, so for G9b (reset close >= exit price) the guard
can never bind — G9b is expected to be trade-identical to Family C's C2_exit_price. The run is the
empirical confirmation of exactly that diagnostic.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from framework import AdaptiveStrategy, frozen_high_reset  # noqa: E402

TINY = 2000.0  # D7 tiny-loss bound, dollars of |net P&L| (recovery-opportunities/strategies.py)


def _clip(x, lo, hi):
    """adaptive-discounts/strategies.py."""
    return min(max(x, lo), hi)


# ------------------------------------------------------------------ triggers

def material_trigger_1(ctx, trade):
    """A2_material_1: arms only when price return <= -1% (loss-classification/strategies.py,
    material_trigger(0.01)). Financing-only and hairline price losses never restrict."""
    return trade['exit_price'] / trade['entry_price'] - 1 <= -0.01


# ------------------------------------------------------------------ required levels

def fixed3_level(ctx, st, i):
    """Framework default made explicit: 3% below the frozen loss-exit price."""
    return st.exit_price * 0.97


def b7_stall_level(ctx, st, i):
    """B7_stall (adaptive-discounts/strategies.py, b7_stall, verbatim): 3% while the episode low is
    < 20 sessions old, then the discount decays linearly to 0 over the next 60 sessions."""
    age = i - st.min_close_i
    d = 0.03 if age < 20 else 0.03 * max(0.0, 1 - (age - 20) / 60)
    return st.exit_price * (1 - d)


def b2_inverse_level(ctx, st, i):
    """B2_inverse (adaptive-discounts/strategies.py, b2_inverse, verbatim): discount =
    clip(3% - 0.5*|price return|, 0.5%, 3%) off the loss exit."""
    d = _clip(0.03 - 0.5 * abs(st.price_return), 0.005, 0.03)
    return st.exit_price * (1 - d)


def graduated_level(ctx, st, i):
    """C11 stage machine (recovery-resets/strategies.py, graduated_level, verbatim): 3% discount
    until the close has (ever, within this episode) reached 1.08x the episode low known at that
    time; from then on 1.5% (sticky). Reset stays C1."""
    if not getattr(st, 'c11_stage2', False) and ctx.e.c[i] >= 1.08 * st.min_close:
        st.c11_stage2 = True
    return st.exit_price * (1 - (0.015 if getattr(st, 'c11_stage2', False) else 0.03))


def tiny_else(base_level):
    """D7 tiny-loss branch as a required_level: |arming net loss| < $2,000 => level = frozen loss
    exit price (no extra discount; recovery-opportunities/strategies.py d7_tiny_loss_exit_anchor
    semantics); else the combo's base level. st.loss is frozen at arming, so each episode follows
    exactly one branch."""
    def required_level(ctx, st, i):
        if abs(st.loss) < TINY:
            return st.exit_price
        return base_level(ctx, st, i)
    required_level.__name__ = f'tiny_else_{base_level.__name__}'
    return required_level


def g6_min_stall_grad(ctx, st, i):
    """G6 double relaxation: discount = min(d_stall(t), d_graduated(rebound)) off the loss exit.
    d_stall from b7_stall (adaptive-discounts/strategies.py); d_graduated from graduated_level
    (recovery-resets/strategies.py), including its sticky per-episode stage flag."""
    age = i - st.min_close_i
    d_stall = 0.03 if age < 20 else 0.03 * max(0.0, 1 - (age - 20) / 60)
    if not getattr(st, 'c11_stage2', False) and ctx.e.c[i] >= 1.08 * st.min_close:
        st.c11_stage2 = True
    d_grad = 0.015 if getattr(st, 'c11_stage2', False) else 0.03
    return st.exit_price * (1 - min(d_stall, d_grad))


# ------------------------------------------------------------------ alt entries

def d7_tiny_alt(ctx, st, i):
    """D7_tiny_loss_exit_anchor (recovery-opportunities/strategies.py, verbatim): alt entry when
    |episode arming loss| < $2,000 AND close <= the frozen loss-exit price."""
    return abs(st.loss) < 2000.0 and float(ctx.e.c[i]) <= st.exit_price


# ------------------------------------------------------------------ resets

def retrace38_reset(ctx, st, i):
    """C6_retrace_38 (recovery-resets/strategies.py, retrace_reset(0.38), verbatim): close >=
    low + 0.38 * (frozen ref high - low)."""
    return ctx.e.c[i] >= st.min_close + 0.38 * (st.ref_high - st.min_close)


GUARD_TOL = 1.02  # reset guard: reset only if close > required level * 1.02


def retrace38_guarded_reset(ctx, st, i):
    """G9a: C6_retrace_38 reset gated by the reset guard — may fire ONLY if close > required level
    x 1.02 (fixed 3% level here, so the guard constant is exit * 0.97 * 1.02 = exit * 0.9894)."""
    c = float(ctx.e.c[i])
    return (c >= st.min_close + 0.38 * (st.ref_high - st.min_close)) and \
        (c > st.exit_price * 0.97 * GUARD_TOL)


def exitprice_guarded_reset(ctx, st, i):
    """G9b (diagnostic): C2-style reset (close >= frozen loss-exit price;
    recovery-resets/strategies.py exit_price_reset) WITH the same guard. Since
    exit >= exit * 0.9894 always, the guard is analytically vacuous here (see module docstring)."""
    c = float(ctx.e.c[i])
    return (c >= st.exit_price) and (c > st.exit_price * 0.97 * GUARD_TOL)


def tiny_else_fixed3(ctx, st, i):
    """G3/G5 tiny branch over the fixed 3% (named for clean registry/params)."""
    return st.exit_price if abs(st.loss) < TINY else st.exit_price * 0.97


# ------------------------------------------------------------------ configurations

CONFIGS = {
    # standalone ablation legs (clean reruns inside this family's results)
    'REF_lower3': lambda: AdaptiveStrategy('REF_lower3'),  # all framework defaults
    'G_A2m1': lambda: AdaptiveStrategy('G_A2m1', trigger=material_trigger_1),
    'G_D7tiny': lambda: AdaptiveStrategy('G_D7tiny', alt_entry=d7_tiny_alt),
    'G_B7stall': lambda: AdaptiveStrategy('G_B7stall', required_level=b7_stall_level),
    'G_B2inv': lambda: AdaptiveStrategy('G_B2inv', required_level=b2_inverse_level),
    'G_C6r38': lambda: AdaptiveStrategy('G_C6r38', reset=retrace38_reset),
    'G_C11grad': lambda: AdaptiveStrategy('G_C11grad', required_level=graduated_level,
                                          reset=frozen_high_reset(0.95)),
    # combos
    'G2_tiny_stall': lambda: AdaptiveStrategy('G2_tiny_stall', required_level=tiny_else(b7_stall_level)),
    'G3_tiny_retrace': lambda: AdaptiveStrategy('G3_tiny_retrace', required_level=tiny_else_fixed3,
                                                reset=retrace38_reset),
    'G4_A2m1_stall': lambda: AdaptiveStrategy('G4_A2m1_stall', trigger=material_trigger_1,
                                              required_level=b7_stall_level),
    'G5_tiny_stall_retrace': lambda: AdaptiveStrategy('G5_tiny_stall_retrace',
                                                      required_level=tiny_else(b7_stall_level),
                                                      reset=retrace38_reset),
    'G6_stall_grad': lambda: AdaptiveStrategy('G6_stall_grad', required_level=g6_min_stall_grad),
    'G7_tiny_grad': lambda: AdaptiveStrategy('G7_tiny_grad', required_level=tiny_else(graduated_level)),
    'G8_A2m1_retrace': lambda: AdaptiveStrategy('G8_A2m1_retrace', trigger=material_trigger_1,
                                                reset=retrace38_reset),
    'G9a_retrace_guard': lambda: AdaptiveStrategy('G9a_retrace_guard', reset=retrace38_guarded_reset),
    'G9b_exitreset_guard': lambda: AdaptiveStrategy('G9b_exitreset_guard', reset=exitprice_guarded_reset),
    'G10_bimodal': lambda: AdaptiveStrategy('G10_bimodal', required_level=tiny_else(b2_inverse_level)),
}
