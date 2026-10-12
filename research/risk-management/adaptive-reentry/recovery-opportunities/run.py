"""Family D runs: all registered configurations through the frozen runner (calibration-gated)."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

import runner  # noqa: E402

from strategies import CONFIGS  # noqa: E402

if __name__ == '__main__':
    records = runner.run_family('adaptive_recovery_opps', HERE, CONFIGS)
    print(f'{len(records)} records -> {HERE / "results" / "summary.json"}')
