"""Register every validation configuration BEFORE evaluation (spec rule 3; append-only registry).

Two groups:
1. The eight frozen candidates, re-run unchanged for the fresh-instrument tests (task 3) and as
   calibration cross-checks inside the sensitivity run.
2. The authorized sensitivity grid points (task 2) — stability measurement around the frozen
   candidate parameters, explicitly NOT a search for new optima.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))

import registry  # noqa: E402

from strategies import candidate_configs, grid_configs  # noqa: E402

FAM = 'validation'

GRID_HYP = {
    'A2_cutoff': 'Stability of the A2 material-loss cutoff. The decisive VGT 2022-11-03 arming loss '
                 'has price return -0.4924%, a knife edge between the -0.25% and -0.5% cutoffs; if '
                 'performance is a plateau across -0.5%..-2% the mechanism is robust, if it swings at '
                 'one cutoff the candidate rides a single trade.',
    'D7_bound': 'Stability of the D7 tiny-loss dollar bound ($2k frozen). The bound classifies arming '
                'losses; a plateau across $1k-$5k means the mechanism (anchor at the loss exit for '
                'trivial losses) matters, not the dollar line; $500 should shade toward REF_lower3.',
    'B7_age_decay': 'Stability of B7_stall fresh-age/decay. The candidate was trade-identical to the '
                    '3% rule on three datasets and earned its whole edge on QQQ99-15; if that edge '
                    'survives only at (20,60) it is a knife edge, if it holds across the 3x3 grid the '
                    'stale-low decay mechanism is real.',
    'B2_floor_slope': 'Stability of B2_inverse floor/slope. The family flagged the floor as '
                      'load-bearing (0% floor -> DD 107k); the grid measures how fast performance '
                      'degrades as the floor drops to 0.25% or the slope moves off 0.5.',
    'C6_retrace': 'Stability of the C6 retracement fraction (0.38 frozen). Resets drive the QQQ-old '
                  'edge; a plateau across 0.30-0.50 would mean "reset on a substantial retrace" is '
                  'the mechanism, a peak at 0.38 would mean the Fibonacci number is doing the work.',
    'C11_rebound_discount': 'Stability of C11 stage-2 trigger (1.08x low) and stage-2 discount '
                            '(1.5%). The family edge rests on 2 trades; the grid tests whether '
                            'adjacent rebound/discount values keep the 2000-02-positive behaviour.',
}

CANDIDATE_DESC = {
    'REF_lower3': 'Anchor: the verified existing 3% rule (framework defaults). Validation rerun.',
    'A2_material_05': 'Family A candidate: arms only when price return <= -0.5%; 3% discount; '
                      'frozen-high 95% reset. Source: loss-classification/strategies.py.',
    'A2_material_1': 'Family A candidate: arms only when price return <= -1%. Source: '
                     'loss-classification/strategies.py.',
    'D7_tiny_loss_exit_anchor': 'Family D candidate: alt entry while restricted when |arming loss| '
                                '< $2,000 and close <= frozen loss-exit price. Source: '
                                'recovery-opportunities/strategies.py.',
    'B7_stall': 'Family B candidate: 3% discount while the episode low is < 20 sessions old, then '
                'linear decay to 0 over 60 sessions. Source: adaptive-discounts/strategies.py.',
    'B2_inverse': 'Family B candidate: discount = clip(3% - 0.5*|price return|, 0.5%, 3%). Source: '
                  'adaptive-discounts/strategies.py.',
    'C6_retrace_38': 'Family C candidate: reset when close >= low + 0.38*(frozen ref high - low). '
                     'Source: recovery-resets/strategies.py.',
    'C11_graduated': 'Family C candidate: 3% discount until close >= 1.08x episode low (sticky), '
                     'then 1.5%; C1 reset. Source: recovery-resets/strategies.py.',
}


def main():
    entries = []
    for name in candidate_configs():
        entries.append(dict(
            name=name, family=FAM, description=CANDIDATE_DESC[name],
            params=dict(role='frozen candidate, unchanged parameters',
                        used_for=['fresh-instrument transfer (QLD, SOXX, VOOG, SPY, XLK, IWM)',
                                  'episode-consistency tables']),
            hypothesis='Transfer test: if the candidate improvement is a real mechanism it should '
                       'also improve (or at least not harm) instruments that never influenced its '
                       'design, with NO parameter refitting; if it is dataset-fit noise it should '
                       'evaporate on SPY/XLK/IWM (2005+, incl. 2008) and QLD/SOXX/VOOG (2016-2026).'))
    for name, (_f, grid, params) in grid_configs().items():
        entries.append(dict(
            name=name, family=FAM,
            description=f'Sensitivity grid point ({grid}): {params}. Component semantics copied from '
                        f'the family source (see validation/strategies.py docstring).',
            params=dict(grid=grid, **params), hypothesis=GRID_HYP[grid]))
    path = registry.register(HERE, entries)
    print(f'registered {len(entries)} entries -> {path}')


if __name__ == '__main__':
    main()
