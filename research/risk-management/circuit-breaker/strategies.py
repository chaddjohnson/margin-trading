"""Circuit-breaker experiment (SPEC.md, section 2): Strategy subclasses for the frozen engine.

A_baseline       -- the unmodified baseline (every hook inert).
B_drawdown_tiers -- the size of each NEW entry depends on the strategy's own cumulative drawdown as of the latest
                    completed session (the engine's `e.dd_prev`, which during session i holds session i-1's value):

                        drawdown < $10,000            -> $100,000
                        $10,000 <= drawdown < $20,000 -> $75,000
                        $20,000 <= drawdown < $30,000 -> $50,000
                        drawdown >= $30,000           -> $25,000

The drawdown is measured by the engine on the continuous daily mark-to-market P&L (realized + open position at the
close - accrued interest), from a running peak that starts at 0 and never resets. The size is fixed at entry (no
add-ons, no resizing while a position is open). Trading is never suspended: every entry signal is taken.

Only `entry_size` is overridden for sizing. `on_session_end` is used purely for logging (it records the tier implied
by each session's closing drawdown, i.e. the tier a decision in the NEXT session would use); it never changes state
that the engine reads.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from engine import Strategy  # noqa: E402

# (lower bound inclusive, size); evaluated from the deepest tier upwards.
TIERS = ((30000.0, 25000.0), (20000.0, 50000.0), (10000.0, 75000.0), (0.0, 100000.0))
TIER_SIZES = (100000.0, 75000.0, 50000.0, 25000.0)


def tier_size(drawdown):
    """Entry size implied by a drawdown in dollars (predefined thresholds, SPEC.md section 2)."""
    for lower, size in TIERS:
        if drawdown >= lower:
            return size
    return TIER_SIZES[0]  # drawdown is never negative; kept for completeness


class _Logged(Strategy):
    """Shared logging: the drawdown/peak each entry decision saw, and the tier implied by every session's close."""

    def __init__(self):
        self.entries = []  # one dict per entry decision that produced an entry
        self.close_dd = {}  # session index -> drawdown at that session's close (engine's dd after the session)

    def _log_entry(self, e, i, size):
        self.entries.append(dict(entry_i=i, entry_date=str(e.dates.iloc[i].date()),
                                 prior_session_date=str(e.dates.iloc[i - 1].date()),
                                 prior_dd=float(e.dd_prev), prior_peak=float(e.peak_prev),
                                 implied_tier=tier_size(e.dd_prev), size=float(size)))

    def on_session_end(self, e, i):
        self.close_dd[i] = float(e.dd_prev)  # set by the engine just before this hook: session i's closing drawdown


class Baseline(_Logged):
    """A_baseline: fixed $100,000 entries (the frozen baseline). Logs the tier its drawdown WOULD imply."""

    name = 'A_baseline'

    def entry_size(self, e, i):
        size = e.params.base_size
        self._log_entry(e, i, size)
        return size


class DrawdownTiers(_Logged):
    """B_drawdown_tiers: entry size from the prior completed session's drawdown (see module docstring)."""

    name = 'B_drawdown_tiers'

    def entry_size(self, e, i):
        # e.dd_prev is the drawdown at the close of session i-1 (the engine updates it only at the end of a session,
        # after marking that session's close). entry_size is called only when flat and the entry signal fires.
        size = tier_size(e.dd_prev)
        self._log_entry(e, i, size)
        return size


CONFIGS = {'A_baseline': Baseline, 'B_drawdown_tiers': DrawdownTiers}
