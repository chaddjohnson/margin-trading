"""Stage 2, task 2 — run the authorized joint sensitivity grids (18 G8 points + 12 G4 points, the
frozen candidates included as the grid centers) on the four frozen datasets via the frozen runner
(experiment `validation_stage2`).

The runner writes to <family_dir>/results/ and reads <family_dir>/registry.jsonl. Stage 1 already
owns validation/results/summary.json, which must not be overwritten; the stage-2 family dir is
therefore validation/results/stage2/ with registry.jsonl a symlink to ../../registry.jsonl (the one
append-only validation registry, where every stage-2 config was registered before this run). The
runner tree lands at validation/results/stage2/results/."""
from __future__ import annotations

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
sys.path.insert(0, str(HERE))

import runner  # noqa: E402

from strategies_stage2 import stage2_grid_configs  # noqa: E402

FAMILY_DIR = HERE / 'results' / 'stage2'


def main():
    FAMILY_DIR.mkdir(parents=True, exist_ok=True)
    link = FAMILY_DIR / 'registry.jsonl'
    if not link.exists():
        os.symlink('../../registry.jsonl', link)
    configs = {name: factory for name, (factory, _g, _p) in stage2_grid_configs().items()}
    print(f'{len(configs)} configs x 4 datasets')
    runner.run_family('validation_stage2', FAMILY_DIR, configs)


if __name__ == '__main__':
    main()
