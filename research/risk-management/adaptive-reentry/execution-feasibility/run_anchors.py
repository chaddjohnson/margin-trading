"""Family F (intraday execution feasibility): register and run the three anchors.

REF_lower3 (framework defaults), lower5 (fixed_discount(0.05)), lower8 (fixed_discount(0.08)).
All three use trigger = net loss and reset = frozen-high 95% (framework defaults). These runs only
provide the states/events CSVs the daily-OHLC diagnostic reads; no new mechanism is evaluated here.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

import registry  # noqa: E402
import runner  # noqa: E402
from framework import AdaptiveStrategy, fixed_discount  # noqa: E402

ANCHORS = [
    dict(name='REF_lower3', family='F',
         description='Anchor: verified 3% lower-price re-entry (framework defaults; equals lower-price-reentry B_lower_3pct).',
         params=dict(discount=0.03, trigger='net_loss', reset='frozen_high_0.95'),
         hypothesis='Anchor only: reproduces the verified 3% rule so the diagnostic reads its states/events.'),
    dict(name='lower5', family='F',
         description='Anchor: 5% lower-price re-entry (fixed_discount(0.05); equals lower-price-reentry C_lower_5pct).',
         params=dict(discount=0.05, trigger='net_loss', reset='frozen_high_0.95'),
         hypothesis='Anchor only: the 5% threshold whose VGT 2020-03/04 and 2023-01 misses the diagnostic must resolve.'),
    dict(name='lower8', family='F',
         description='Anchor: 8% lower-price re-entry (fixed_discount(0.08); equals lower-price-reentry D_lower_8pct).',
         params=dict(discount=0.08, trigger='net_loss', reset='frozen_high_0.95'),
         hypothesis='Anchor only: the 8% threshold whose VGT 2020, VGT 2026-03 and 2009 misses the diagnostic must resolve.'),
]


def configs():
    return {
        'REF_lower3': lambda: AdaptiveStrategy('REF_lower3'),
        'lower5': lambda: AdaptiveStrategy('lower5', required_level=fixed_discount(0.05)),
        'lower8': lambda: AdaptiveStrategy('lower8', required_level=fixed_discount(0.08)),
    }


if __name__ == '__main__':
    names = registry.registered_names(HERE)
    todo = [e for e in ANCHORS if e['name'] not in names]
    if todo:
        registry.register(HERE, todo)
    runner.run_family('intraday_feasibility', HERE, configs())
