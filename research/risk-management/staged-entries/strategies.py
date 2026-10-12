"""Staged-entry strategies (SPEC.md, experiment 5). Implemented only through the frozen engine's hooks.

Hooks used:
- entry_size: the initial tranche ($50,000 for B and C; the baseline $100,000 for A), bought at the close of the
  original 10%-dip signal session.
- add_on: the second tranche ($50,000), bought at the close of the first qualifying session j > entry in which
  the position did not exit. The engine calls add_on only for a position that existed before session j and did
  not exit in j, so the entry session itself is never a candidate, and an exit in j pre-empts the add.

Everything else (per-lot interest, aggregate stop activation and loss exit, the 15-day clock from the initial
entry, a stop that is never reset or lowered) is the frozen engine's behaviour.

The strategies are stateless: "at most one additional tranche" is enforced by the number of lots in the open
position, so the same instance can be reused across runs without leaking state.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from engine import Strategy  # noqa: E402

INITIAL_TRANCHE = 50000.0
SECOND_TRANCHE = 50000.0
RECOVERY_MULTIPLE = 1.03  # C: close_j >= 1.03 x the initial entry price


class Baseline(Strategy):
    """A_baseline: the frozen baseline ($100,000 at entry, no add-on)."""

    name = 'A_baseline'


class StagedTwoPositiveCloses(Strategy):
    """B_staged_two_positive_closes.

    $50,000 at the signal close. Then $50,000 at the close of the first session j such that sessions j-1 and j
    are both after the entry session and each has a positive close-to-close return:
        close_j > close_{j-1}  and  close_{j-1} > close_{j-2},  with  j-1 > entry_i  (so j >= entry_i + 2).
    The return of session j-1 = entry_i + 1 is measured against the entry close. Strict inequalities: an
    unchanged close is not a positive return. Decision at session j's close using closes through j only.
    """

    name = 'B_staged_two_positive_closes'

    def entry_size(self, e, i):
        return INITIAL_TRANCHE

    def add_on(self, e, i):
        p = e.pos
        if p is None or len(p.lots) != 1:
            return 0.0
        if i - 1 <= p.entry_i:  # session j-1 must come after the entry session
            return 0.0
        c = e.c
        if c[i] > c[i - 1] and c[i - 1] > c[i - 2]:
            return SECOND_TRANCHE
        return 0.0


class Staged3PctRecovery(Strategy):
    """C_staged_3pct_recovery.

    $50,000 at the signal close. Then $50,000 at the close of the first session j > entry_i with
    close_j >= 1.03 x the initial entry price (the entry session's close). Decision at session j's close.
    """

    name = 'C_staged_3pct_recovery'

    def entry_size(self, e, i):
        return INITIAL_TRANCHE

    def add_on(self, e, i):
        p = e.pos
        if p is None or len(p.lots) != 1 or i <= p.entry_i:
            return 0.0
        if e.c[i] >= RECOVERY_MULTIPLE * p.entry_price:
            return SECOND_TRANCHE
        return 0.0


CONFIGS = {
    'A_baseline': Baseline,
    'B_staged_two_positive_closes': StagedTwoPositiveCloses,
    'C_staged_3pct_recovery': Staged3PctRecovery,
}
