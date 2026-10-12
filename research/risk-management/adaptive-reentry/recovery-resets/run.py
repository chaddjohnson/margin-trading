"""Family C runner: evaluates the registered recovery-reset configs through the frozen runner."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))

from runner import run_family  # noqa: E402

from strategies import CONFIGS  # noqa: E402

if __name__ == '__main__':
    run_family('adaptive_resets', HERE, CONFIGS)
