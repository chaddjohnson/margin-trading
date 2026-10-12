"""Protective loss exits (SPEC.md section 3), implemented only through the frozen engine's `extra_stops` hook.

Every protective level is a function of the entry price (the entry session's close) and of how many sessions
have elapsed since the entry session, so it is known before the session opens (no look-ahead).

The engine calls `extra_stops(e, i)` only while evaluating a position that was already open before session i,
so it is never consulted on the entry session itself: the first session on which a protective stop can fill is
entry+1. Fills (engine semantics, unchanged):
- open at or below the level -> sell at the open (stop-market gap fill), one fill together with any other
  open trigger; the engine records the first open trigger in the order maximum hold, trailing stop gap, extra
  stop gap, and lists the others in `also`;
- otherwise, if the low reaches the level -> sell at the level; when the trailing stop is also reached, the
  higher level fills (an active trailing stop is always above breakeven, hence above every protective level).
The trailing stop, the 15-day loss exit and the re-entry rule are untouched.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from engine import Strategy  # noqa: E402

PROTECTIVE = 'protective stop'


class Baseline(Strategy):
    """A_baseline: the frozen baseline, no hook overridden."""

    name = 'A_baseline'


class ProtectiveStop(Strategy):
    """Unconditional sell stop at entry price x (1 - pct) on every session after the entry session (B, C).

    The level never moves and does not depend on profitability, unlike the trailing stop.
    """

    def __init__(self, name, pct):
        self.name = name
        self.pct = pct

    def extra_stops(self, e, i):
        return [(PROTECTIVE, e.pos.entry_price * (1 - self.pct))]


class EarlyDeterioration(Strategy):
    """D: sell stop at entry price x 0.95, active only on sessions entry+1 ... entry+5 (inclusive)."""

    def __init__(self, name, pct=0.05, sessions=5):
        self.name = name
        self.pct = pct
        self.sessions = sessions

    def extra_stops(self, e, i):
        if 1 <= i - e.pos.entry_i <= self.sessions:
            return [(PROTECTIVE, e.pos.entry_price * (1 - self.pct))]
        return []


CONFIGS = {
    'A_baseline': lambda: Baseline(),
    'B_protective_stop_8pct': lambda: ProtectiveStop('B_protective_stop_8pct', 0.08),
    'C_protective_stop_10pct': lambda: ProtectiveStop('C_protective_stop_10pct', 0.10),
    'D_early_deterioration_5pct_5sessions': lambda: EarlyDeterioration('D_early_deterioration_5pct_5sessions', 0.05, 5),
}
