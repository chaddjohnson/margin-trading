"""Validation stage 2 — the two promising Family-G combinations (COMBINATIONS.md §9 flags 1 and 2)
and their authorized joint sensitivity grids.

Candidates (compositions of components whose semantics were already copied verbatim from the family
sources into validation/strategies.py and replay-verified in stage 1; the combination wiring matches
combinations/strategies.py exactly):

  G8_A2m1_retrace = material_trigger(0.01) + fixed 3% level + retrace_reset(0.38)
                    (combinations/strategies.py: material_trigger_1 + framework default level +
                     retrace38_reset)
  G4_A2m1_stall   = material_trigger(0.01) + b7_stall level (fresh_age 20, decay 60) + C1 frozen95
                    (combinations/strategies.py: material_trigger_1 + b7_stall_level + default reset)

Grids (fixed by the stage-2 brief; registered before any run; stability measurement only, no new
optimum is selected):

  G8: A2 cutoff {0.5%, 1%, 1.5%} x retrace fraction {0.30, 0.34, 0.38, 0.42, 0.46, 0.50} = 18 points
      names V2_G8_c{050,100,150}_r{30,34,38,42,46,50}; center = (1%, 0.38) = the frozen G8.
  G4: A2 cutoff fixed at 1% x stall fresh_age {15, 20, 25, 30} x decay {40, 60, 80} = 12 points
      names V2_G4_a{15,20,25,30}_d{40,60,80}; center = (20, 60) = the frozen G4.

Center points must reproduce combinations/results G8/G4 trade for trade (checked in
tmp/stage2_tables.py)."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
sys.path.insert(0, str(HERE))

from framework import AdaptiveStrategy  # noqa: E402

from strategies import material_trigger, retrace_reset, stall_level  # noqa: E402  (stage-1 verified components)

G8_CUTS = [0.005, 0.01, 0.015]          # A2 material-loss cutoff
G8_FRACS = [0.30, 0.34, 0.38, 0.42, 0.46, 0.50]  # C6 retrace fraction
G4_CUT = 0.01                            # fixed per the brief
G4_AGES = [15, 20, 25, 30]               # B7 stall fresh_age
G4_DECAYS = [40, 60, 80]                 # B7 stall decay


def stage2_candidates():
    """The two frozen G-combinations, exact parameters (= combinations/strategies.py)."""
    return {
        'G8_A2m1_retrace': lambda: AdaptiveStrategy('G8_A2m1_retrace', trigger=material_trigger(0.01),
                                                    reset=retrace_reset(0.38)),
        'G4_A2m1_stall': lambda: AdaptiveStrategy('G4_A2m1_stall', trigger=material_trigger(0.01),
                                                  required_level=stall_level(20, 60)),
    }


def stage2_grid_configs():
    """{name: (factory, grid, params)} for every authorized stage-2 grid point."""
    out = {}
    for cut in G8_CUTS:
        for f in G8_FRACS:
            name = f'V2_G8_c{cut * 10000:03.0f}_r{f * 100:.0f}'
            out[name] = (
                (lambda cut=cut, f=f: AdaptiveStrategy('tmp', trigger=material_trigger(cut),
                                                       reset=retrace_reset(f))),
                'G8_cut_retrace', dict(cutoff=cut, fraction=f, center=(cut, f) == (0.01, 0.38)))
    for a in G4_AGES:
        for d in G4_DECAYS:
            name = f'V2_G4_a{a}_d{d}'
            out[name] = (
                (lambda a=a, d=d: AdaptiveStrategy('tmp', trigger=material_trigger(G4_CUT),
                                                   required_level=stall_level(a, d))),
                'G4_age_decay', dict(cutoff=G4_CUT, fresh_age=a, decay=d, center=(a, d) == (20, 60)))
    return out
