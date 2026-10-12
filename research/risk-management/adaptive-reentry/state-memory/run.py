"""Register (first) and run the Family E configurations through the frozen runner."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

import registry  # noqa: E402
import runner  # noqa: E402

from strategies import CONFIGS, ENTRIES  # noqa: E402


def main():
    already = registry.registered_names(HERE)
    new = [e for e in ENTRIES if e['name'] not in already]
    if new:
        registry.register(HERE, new)
        print(f"registered: {[e['name'] for e in new]}")
    records = runner.run_family('adaptive_state_memory', HERE, CONFIGS)
    print(f'\n{len(records)} records written to {HERE / "results"}')


if __name__ == '__main__':
    main()
