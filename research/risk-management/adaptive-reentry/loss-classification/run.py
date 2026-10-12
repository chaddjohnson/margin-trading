"""Family A runner: register (append-only, before first evaluation), then run all configurations
through the frozen family runner. Writes results/ under this directory."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE))

import registry  # noqa: E402
from framework import AdaptiveStrategy  # noqa: E402
from runner import run_family  # noqa: E402

from strategies import ENTRIES, build_configs  # noqa: E402


def main():
    existing = registry.registered_names(HERE)
    new = [e for e in ENTRIES if e['name'] not in existing]
    if new:
        registry.register(HERE, new)
        print(f'registered {len(new)} configs: {[e["name"] for e in new]}')
    else:
        print('all configs already registered')
    configs = build_configs(AdaptiveStrategy)
    run_family('adaptive_loss_class', HERE, configs)


if __name__ == '__main__':
    main()
