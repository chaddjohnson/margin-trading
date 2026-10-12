"""Family B runner: register all configurations (append-only; BEFORE any evaluation), then run them
through the frozen family runner. Usage: python run.py [register-only]"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[0] / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

import registry  # noqa: E402

from strategies import CONFIGS, REGISTRY_ENTRIES  # noqa: E402


def main():
    existing = registry.registered_names(HERE)
    new = [e for e in REGISTRY_ENTRIES if e['name'] not in existing]
    if new:
        registry.register(HERE, new)
        print(f'registered {len(new)} configs: {[e["name"] for e in new]}')
    else:
        print('all configs already registered')
    if len(sys.argv) > 1 and sys.argv[1] == 'register-only':
        return
    from runner import run_family  # noqa: E402  (import after registration so the gate message is clean)
    run_family('adaptive_discounts', HERE, CONFIGS)


if __name__ == '__main__':
    main()
