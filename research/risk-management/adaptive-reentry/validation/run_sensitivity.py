"""Task 2 — run the authorized sensitivity grids on the four frozen datasets via the frozen runner
(experiment `validation_sensitivity`). Also re-runs the eight frozen candidates as registered
validation configs so the center grid points can be cross-checked against the family results.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

import runner  # noqa: E402

from strategies import candidate_configs, grid_configs  # noqa: E402


def main():
    configs = dict(candidate_configs())
    for name, (factory, _grid, _params) in grid_configs().items():
        configs[name] = factory
    print(f'{len(configs)} configs x 4 datasets')
    runner.run_family('validation_sensitivity', HERE, configs)


if __name__ == '__main__':
    main()
