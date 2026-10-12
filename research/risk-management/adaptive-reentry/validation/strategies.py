"""Validation stage — parameterized components for the sensitivity grids (task 2) and the exact
candidate configurations for the fresh-instrument runs (task 3).

Semantics are copied EXACTLY from the family sources and parameterized only where the authorized grid
varies a value; at the center grid point every component reduces to the family's code:

  material trigger      loss-classification/strategies.py  material_trigger(threshold)
  fixed 3% level        framework.fixed_discount(0.03) (= loss-classification fixed3)
  tiny-loss alt entry   recovery-opportunities/strategies.py d7_tiny_loss_exit_anchor (bound $2,000)
  stall decay level     adaptive-discounts/strategies.py   b7_stall (fresh_age 20, decay 60)
  inverse-loss level    adaptive-discounts/strategies.py   b2_inverse (slope 0.5, floor 0.5%)
  retrace reset         recovery-resets/strategies.py      retrace_reset(f) (f = 0.38)
  graduated level       recovery-resets/strategies.py      graduated_level (rebound 1.08, stage-2 1.5%)

The sensitivity grids measure STABILITY around the frozen candidate parameters (plateau vs isolated
peak); they do not select new optima. Grid definitions are fixed in the validation brief and
registered in registry.jsonl before any run.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from framework import AdaptiveStrategy, fixed_discount  # noqa: E402


def _clip(x, lo, hi):
    return min(max(x, lo), hi)


# ---------------------------------------------------------------- parameterized components

def material_trigger(threshold):
    """loss-classification/strategies.py L29-34, verbatim."""
    def trigger(ctx, trade):
        return trade['exit_price'] / trade['entry_price'] - 1 <= -threshold
    trigger.__name__ = f'material_trigger_{threshold:g}'
    return trigger


def tiny_loss_alt(bound):
    """recovery-opportunities/strategies.py d7_tiny_loss_exit_anchor L186-192; bound parameterized
    (family value $2,000): alt entry while restricted when |arming loss| < bound AND close <= the
    frozen loss-exit price."""
    def alt(ctx, st, i):
        return abs(st.loss) < bound and float(ctx.e.c[i]) <= st.exit_price
    alt.__name__ = f'tiny_loss_exit_anchor_{bound:g}'
    return alt


def stall_level(fresh_age, decay):
    """adaptive-discounts/strategies.py b7_stall L115-118; (fresh_age, decay) parameterized (family
    values 20, 60): 3% while the episode low is younger than fresh_age sessions, then decays
    linearly to 0 over the next `decay` sessions (age = i - st.min_close_i)."""
    def required_level(ctx, st, i):
        age = i - st.min_close_i
        d = 0.03 if age < fresh_age else 0.03 * max(0.0, 1 - (age - fresh_age) / decay)
        return st.exit_price * (1 - d)
    required_level.__name__ = f'stall_level_a{fresh_age}_d{decay}'
    return required_level


def inverse_level(slope, floor):
    """adaptive-discounts/strategies.py b2_inverse L60-62; (slope, floor) parameterized (family
    values 0.5, 0.005): discount = clip(3% - slope*|price return|, floor, 3%) off the loss exit."""
    def required_level(ctx, st, i):
        d = _clip(0.03 - slope * abs(st.price_return), floor, 0.03)
        return st.exit_price * (1 - d)
    required_level.__name__ = f'inverse_level_s{slope:g}_f{floor:g}'
    return required_level


def retrace_reset(f):
    """recovery-resets/strategies.py retrace_reset L85-89, verbatim (family value f = 0.38):
    reset when close >= episode low + f * (frozen ref high - episode low)."""
    def reset(ctx, st, i):
        return ctx.e.c[i] >= st.min_close + f * (st.ref_high - st.min_close)
    reset.__name__ = f'retrace_reset_{f:g}'
    return reset


def graduated_level(rebound, stage2_discount):
    """recovery-resets/strategies.py graduated_level L113-118; (rebound, stage-2 discount)
    parameterized (family values 1.08, 0.015): 3% discount until the close has (ever, within the
    episode) reached rebound x the episode low known at that time; from then on stage2_discount
    (sticky). Reset stays the C1 frozen-high 95%."""
    def required_level(ctx, st, i):
        if not getattr(st, 'v_stage2', False) and ctx.e.c[i] >= rebound * st.min_close:
            st.v_stage2 = True
        return st.exit_price * (1 - (stage2_discount if getattr(st, 'v_stage2', False) else 0.03))
    required_level.__name__ = f'graduated_level_r{rebound:g}_d{stage2_discount:g}'
    return required_level


# ---------------------------------------------------------------- the frozen candidates (task 3)

def candidate_configs():
    """The eight candidates with their EXACT family parameters (plus the baseline separately)."""
    return {
        'REF_lower3': lambda: AdaptiveStrategy('REF_lower3'),
        'A2_material_05': lambda: AdaptiveStrategy('A2_material_05', trigger=material_trigger(0.005)),
        'A2_material_1': lambda: AdaptiveStrategy('A2_material_1', trigger=material_trigger(0.01)),
        'D7_tiny_loss_exit_anchor': lambda: AdaptiveStrategy('D7_tiny_loss_exit_anchor',
                                                             alt_entry=tiny_loss_alt(2000.0)),
        'B7_stall': lambda: AdaptiveStrategy('B7_stall', required_level=stall_level(20, 60)),
        'B2_inverse': lambda: AdaptiveStrategy('B2_inverse', required_level=inverse_level(0.5, 0.005)),
        'C6_retrace_38': lambda: AdaptiveStrategy('C6_retrace_38', reset=retrace_reset(0.38)),
        'C11_graduated': lambda: AdaptiveStrategy('C11_graduated', required_level=graduated_level(1.08, 0.015)),
    }


# ---------------------------------------------------------------- sensitivity grids (task 2)

A2_CUTS = [0.0025, 0.005, 0.0075, 0.01, 0.015, 0.02]
D7_BOUNDS = [500.0, 1000.0, 2000.0, 3000.0, 5000.0]
B7_AGES, B7_DECAYS = [10, 20, 30], [40, 60, 80]
B2_FLOORS, B2_SLOPES = [0.0025, 0.005, 0.01], [0.25, 0.5, 0.75]
C6_FRACS = [0.30, 0.34, 0.38, 0.42, 0.46, 0.50]
C11_REBOUNDS, C11_DISCOUNTS = [1.06, 1.08, 1.10], [0.01, 0.015, 0.02]


def _pct(x):  # 0.0075 -> '075'
    return f'{x * 10000:03.0f}'


def grid_configs():
    """{name: (factory, grid, params)} for every authorized grid point. Center points are marked and
    must reproduce the family candidate trade for trade (checked in analyze_sensitivity.py)."""
    out = {}
    for cut in A2_CUTS:
        out[f'V_A2_cut_{_pct(cut)}'] = (
            (lambda cut=cut: AdaptiveStrategy('tmp', trigger=material_trigger(cut))),
            'A2_cutoff', dict(cutoff=cut, center=cut in (0.005, 0.01)))
    for b in D7_BOUNDS:
        out[f'V_D7_tiny_{b:.0f}'] = (
            (lambda b=b: AdaptiveStrategy('tmp', alt_entry=tiny_loss_alt(b))),
            'D7_bound', dict(bound=b, center=b == 2000.0))
    for a in B7_AGES:
        for d in B7_DECAYS:
            out[f'V_B7_stall_a{a}_d{d}'] = (
                (lambda a=a, d=d: AdaptiveStrategy('tmp', required_level=stall_level(a, d))),
                'B7_age_decay', dict(fresh_age=a, decay=d, center=(a, d) == (20, 60)))
    for f in B2_FLOORS:
        for s in B2_SLOPES:
            out[f'V_B2_inv_f{_pct(f)}_s{s * 100:.0f}'] = (
                (lambda f=f, s=s: AdaptiveStrategy('tmp', required_level=inverse_level(s, f))),
                'B2_floor_slope', dict(floor=f, slope=s, center=(f, s) == (0.005, 0.5)))
    for f in C6_FRACS:
        out[f'V_C6_retr_{f * 100:.0f}'] = (
            (lambda f=f: AdaptiveStrategy('tmp', reset=retrace_reset(f))),
            'C6_retrace', dict(fraction=f, center=f == 0.38))
    for r in C11_REBOUNDS:
        for d in C11_DISCOUNTS:
            out[f'V_C11_r{r * 100:.0f}_d{_pct(d)}'] = (
                (lambda r=r, d=d: AdaptiveStrategy('tmp', required_level=graduated_level(r, d))),
                'C11_rebound_discount', dict(rebound=r, stage2_discount=d, center=(r, d) == (1.08, 0.015)))
    return out
