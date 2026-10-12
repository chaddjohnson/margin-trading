"""Recovery-confirmed re-entry (SPEC.md, experiment 4): Strategy subclasses for the frozen engine.

Fixed interpretation (SPEC.md section 4):
- Confirmation applies only after a LOSING trade: closed-trade net profit < 0, interest included, exiting in
  session x. After a profitable (or exactly break-even) exit, and before a dataset's first entry, entries follow
  the baseline.
- Confirmation is stateful and latched: once satisfied at some session j > x it stays satisfied until the next
  entry. An entry at session i needs the original 10% signal at i AND the latch satisfied by session i's close
  (it may be satisfied at session i's own close). There are no retroactive entries: a signal session that was
  blocked is simply skipped.
- B_two_positive_closes: sessions j-1 and j both after x, each with a positive close-to-close return
  (close_j > close_{j-1} and close_{j-1} > close_{j-2}); the earliest possible j is x+2.
- C_close_above_sma10: some j > x with close_j > SMA10_j (mean of closes j-9..j).
- D_recovery_3pct_from_low: some j > x with close_j >= 1.03 * min(close_x..close_j) (the exit session's close
  is included in the low).

Hooks used: `on_exit` (arms the requirement after a losing exit), `on_session_end` (evaluates the rule at each
session's close and latches it; clears the requirement once a new position exists), `entry_allowed` (called by
the engine only on a session with the 10% signal while flat; evaluates the current session's close first, then
allows the entry only if the latch is satisfied). Every rule uses closes through session j only (no look-ahead;
the entry is at session i's close, which is known when the decision is made).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from engine import Strategy  # noqa: E402


# ---- Confirmation rules: pure functions of the close array, the losing exit's session x and a session j > x ----

def rule_two_positive_closes(c, x, j):
    """B: close_j > close_{j-1} > close_{j-2}, with j-1 > x (so both returns are measured after session x)."""
    return j - 1 > x and c[j] > c[j - 1] and c[j - 1] > c[j - 2]


def rule_close_above_sma10(c, x, j):
    """C: close_j > mean(close_{j-9..j}). Returns None when SMA10 is unavailable (j < 9), which is not satisfied."""
    if j <= x:
        return False
    if j < 9:
        return None
    return c[j] > c[j - 9:j + 1].mean()


def rule_recovery_3pct(c, x, j):
    """D: close_j >= 1.03 * min(close_x..close_j)."""
    return j > x and c[j] >= 1.03 * c[x:j + 1].min()


RULES = {
    'B_two_positive_closes': rule_two_positive_closes,
    'C_close_above_sma10': rule_close_above_sma10,
    'D_recovery_3pct_from_low': rule_recovery_3pct,
}


class A_baseline(Strategy):
    """Unmodified baseline (no hook overridden)."""

    name = 'A_baseline'


class RecoveryConfirmed(Strategy):
    """Baseline entries, except that after a losing exit a new entry also needs the latched confirmation."""

    name = None
    rule = None  # staticmethod(rule function) in subclasses

    def __init__(self):
        self.pending = False  # a losing exit has armed the requirement and no entry has happened since
        self.x = None  # session index of that losing exit
        self.latched = False
        self.events = []  # one dict per losing exit (diagnostics only; never read by the decision logic)
        self.sma_unavailable = 0  # C only: sessions where SMA10 was needed but unavailable

    # -- state machine --
    def _evaluate(self, e, j):
        """Evaluate the rule at session j's close and latch it if satisfied."""
        if not self.pending or self.latched or j <= self.x:
            return
        ok = type(self).rule(e.c, self.x, j)
        if ok is None:
            self.sma_unavailable += 1
            ok = False
        if ok:
            self.latched = True
            self.events[-1]['confirm_i'] = j

    def on_exit(self, e, i, trade):
        if trade['profit'] < 0:
            self.pending, self.x, self.latched = True, i, False
            self.events.append(dict(exit_i=i, loss=float(trade['profit']), confirm_i=None, first_signal_i=None,
                                    blocked_signal_sessions=0, blocked_is=[], entry_i=None))
        else:
            self.pending, self.x, self.latched = False, None, False

    def entry_allowed(self, e, i):
        # The engine calls this only on a session with the 10% signal while flat.
        if not self.pending:
            return True
        self._evaluate(e, i)  # the latch may be satisfied at session i's own close
        ev = self.events[-1]
        if ev['first_signal_i'] is None:
            ev['first_signal_i'] = i
        if self.latched:
            return True
        ev["blocked_signal_sessions"] += 1
        ev["blocked_is"].append(i)
        return False

    def on_session_end(self, e, i):
        if self.pending and e.pos is not None and e.pos.entry_i == i:
            self.events[-1]['entry_i'] = i  # entry made at this close: the requirement is used up
            self.pending, self.x, self.latched = False, None, False
            return
        self._evaluate(e, i)


class B_two_positive_closes(RecoveryConfirmed):
    name = 'B_two_positive_closes'
    rule = staticmethod(rule_two_positive_closes)


class C_close_above_sma10(RecoveryConfirmed):
    name = 'C_close_above_sma10'
    rule = staticmethod(rule_close_above_sma10)


class D_recovery_3pct_from_low(RecoveryConfirmed):
    name = 'D_recovery_3pct_from_low'
    rule = staticmethod(rule_recovery_3pct)


CONFIGS = {
    'A_baseline': A_baseline,
    'B_two_positive_closes': B_two_positive_closes,
    'C_close_above_sma10': C_close_above_sma10,
    'D_recovery_3pct_from_low': D_recovery_3pct_from_low,
}
