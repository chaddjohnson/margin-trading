"""Register every stage-2 validation configuration BEFORE evaluation (spec rule 3; the registry
validation/registry.jsonl is append-only and already holds the 52 stage-1 entries)."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE))

import registry  # noqa: E402

from strategies_stage2 import stage2_candidates, stage2_grid_configs  # noqa: E402

FAM = 'validation_stage2'

CAND_DESC = {
    'G8_A2m1_retrace': 'Stage-2 candidate (COMBINATIONS.md §9.1): A2_material_1 trigger (arm only '
                       'when price return <= -1%) + fixed 3% level + C6_retrace_38 reset. Wiring = '
                       'combinations/strategies.py G8_A2m1_retrace; component semantics = stage-1 '
                       'verified validation/strategies.py.',
    'G4_A2m1_stall': 'Stage-2 candidate (COMBINATIONS.md §9.2): A2_material_1 trigger + B7_stall '
                     'level (fresh_age 20, decay 60) + C1 frozen-high 95% reset. Wiring = '
                     'combinations/strategies.py G4_A2m1_stall.',
}

GRID_HYP = {
    'G8_cut_retrace': 'Joint stability of G8 (A2 cutoff x retrace fraction). The combination was '
                      'selected as the best Σ-net of Family G; its QQQ-old edge rests on the '
                      '2002-11/2003-03 reset chain and its costs on the 2000-02 stacking of A2 '
                      'micro-exemptions with C6 false resets. If the QQQ-old edge survives only at '
                      '(-1%, 0.38) it is a knife edge; watch the QQQ-new 2022 and 2000-02 windows '
                      'for the stacking-permissiveness effect across the whole grid.',
    'G4_age_decay': 'Joint stability of G4 (stall fresh_age x decay at the fixed -1% cutoff). '
                    'COMBINATIONS.md §9.2 predicts the honest null: G4 collapses to G_A2m1 wherever '
                    'the single 2002-09-19 stall-decisive decision disappears (stage 1 found the '
                    'standalone stall edge vanishes at (20,80) and all age-30 points). The grid '
                    'tests that prediction on the composed path.',
}


def main():
    entries = []
    for name in stage2_candidates():
        entries.append(dict(
            name=name, family=FAM, description=CAND_DESC[name],
            params=dict(role='stage-2 frozen G-combination, unchanged parameters',
                        used_for=['independent replay (task 1)',
                                  'fresh-instrument transfer QLD/SOXX/VOOG/SPY/XLK/IWM (task 3)']),
            hypothesis='Transfer test: if the combination is a real additive mechanism it should '
                       'improve on REF_lower3 and on its own standalone legs on instruments that '
                       'never influenced its design, with no refitting; if its edge is the QQQ-old '
                       'path (G4: one trade; G8: the 2003 reset chain) it should evaporate.'))
    for name, (_f, grid, params) in stage2_grid_configs().items():
        entries.append(dict(
            name=name, family=FAM,
            description=f'Stage-2 joint sensitivity grid point ({grid}): {params}. Components from '
                        f'validation/strategies.py (stage-1 verified copies of the family sources).',
            params=dict(grid=grid, **params), hypothesis=GRID_HYP[grid]))
    path = registry.register(HERE, entries)
    print(f'registered {len(entries)} stage-2 entries -> {path}')


if __name__ == '__main__':
    main()
