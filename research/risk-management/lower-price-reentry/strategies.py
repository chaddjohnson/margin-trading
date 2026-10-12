"""Lower-price re-entry with recovery reset: Strategy subclasses for the frozen engine.

Fixed interpretation (experiment brief, 2026-10-12):
- The restriction applies only after a LOSING trade: closed-trade net profit < 0, margin interest included,
  exiting in session x. After a profitable (or exactly break-even) exit, and before a dataset's first entry,
  entries follow the baseline. A new position clears the restriction the moment it opens.
- Frozen at the losing exit (never updated during the episode, even as the rolling 90-day high changes):
  - loss_exit_price: the ACTUAL execution price of the losing exit (the open for a gap / maximum-hold fill,
    the stop level for an in-session stop fill);
  - ref_high: the 90-session reference high the engine used for the losing trade's ENTRY signal,
    max(high[entry_i-90 .. entry_i-1]) (shorter at the start of a dataset, exactly as the engine computes it).
    Recomputed here from the stored entry index; it is deterministic and identical to the engine's value.
- While RESTRICTED (always flat), at each session i with the original 10% signal (the engine calls
  entry_allowed only then):
  - if close_i >= 0.95 * ref_high: the recovery reset takes priority; NO entry at session i (the reset is
    applied at the end of the session and entries resume under NORMAL rules from the next session). If
    close_i also satisfies the lower-price trigger, the dual-trigger event is counted and documented
    (arithmetically this cannot happen: loss_exit_price <= ~1.03 x entry <= ~0.93 x ref_high, so
    0.97 x loss_exit_price < 0.95 x ref_high; the counter proves it empirically).
  - elif close_i <= loss_exit_price * (1 - threshold): lower-price re-entry at session i's close, $100,000.
    The restriction is cleared when the position opens (observed in on_session_end).
  - else: the entry is blocked.
- The recovery reset is evaluated at EVERY session's close while restricted and flat, in on_session_end,
  including the losing exit session itself (its close is known at the close; no look-ahead). A reset only
  clears the state; it never triggers a purchase.
- No timeout or alternative reset exists. An episode can last to the end of the data (reported, not fixed).
- Insufficient history needs no special handling: the rule uses only the frozen values and the current
  close; the 10% signal keeps the baseline's shorter-window behaviour at the start of a dataset.

Hooks used: on_exit (creates the restriction after a losing exit), entry_allowed (restricted-entry gate),
on_session_end (applies the recovery reset, observes the re-entry, writes the per-session state log).
Every decision at session i uses only data through session i's close.

State log (self.rows): one row per transition, per NORMAL entry/exit, and per session while RESTRICTED.
Episode records (self.events): one dict per losing exit.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

from engine import Strategy  # noqa: E402

RESET_FRACTION = 0.95  # recovery reset: close >= 95% of the frozen reference high (fixed, not tuned)


class A_baseline(Strategy):
    """Unmodified baseline (no hook overridden)."""

    name = 'A_baseline'


class LowerPriceReentry(Strategy):
    """Baseline entries, except that after a losing exit a new entry needs a meaningfully lower price,
    unless the market first recovers to within 5% of the losing trade's frozen reference high."""

    name = None
    threshold = None  # additional decline below the loss exit price (0.03 / 0.05 / 0.08 in subclasses)

    def __init__(self):
        self.restricted = False
        self.loss_exit_price = None
        self.ref_high = None
        self.episode = None      # the open episode dict (last element of self.events)
        self.events = []         # one dict per losing exit
        self.rows = []           # state log
        self.blocked_sessions = 0
        self.blocked_is = set()
        self.lower_price_reentries = 0
        self.recovery_resets = 0
        self.dual_trigger_sessions = 0
        self.reset_priority_blocks = 0  # sessions where the 10% signal was present but the reset took priority

    # -- helpers --
    def _levels(self):
        return self.loss_exit_price * (1 - self.threshold), RESET_FRACTION * self.ref_high

    def _signal(self, e, i):
        recent_high = e.h[max(0, i - e.params.window):i].max()
        return 1 - e.c[i] / recent_high >= e.params.target

    def _log(self, e, i, prev_state, new_state, reason, signal, entry_executed):
        lower, reset = self._levels() if self.loss_exit_price is not None else (None, None)
        self.rows.append(dict(
            i=i, date=str(e.dates.iloc[i].date()), prev_state=prev_state, new_state=new_state, reason=reason,
            loss_exit_price=self.loss_exit_price, ref_high=self.ref_high,
            lower_reentry_threshold=lower, recovery_reset_threshold=reset,
            close=e.c[i], signal_10pct=bool(signal), entry_executed=bool(entry_executed)))

    # -- hooks --
    def on_exit(self, e, i, trade):
        assert not self.restricted, 'an exit occurred while restricted (restriction should clear at entry)'
        if trade['profit'] < 0:
            entry_i = trade['entry_i']
            self.restricted = True
            self.loss_exit_price = float(trade['exit_price'])
            self.ref_high = float(e.h[max(0, entry_i - e.params.window):entry_i].max())
            lower, reset = self._levels()
            self.episode = dict(
                exit_i=i, entry_i=entry_i, loss=float(trade['profit']), exit_reason=trade['reason'],
                loss_exit_price=self.loss_exit_price, losing_entry_price=float(trade['entry_price']),
                ref_high=self.ref_high, lower_level=lower, reset_level=reset,
                blocked_is=[], dual_trigger_is=[], reset_priority_is=[],
                min_close=float(e.c[i]), max_close=float(e.c[i]),
                resolution=None, resolution_i=None, reentry_i=None)
            self.events.append(self.episode)
            self._log(e, i, 'NORMAL', 'RESTRICTED', f"losing_exit ({trade['reason']}, {trade['profit']:+.0f})",
                      self._signal(e, i), False)
        else:
            # Profitable exit: confirm NORMAL and that no restriction is outstanding (brief section 2.C).
            self._log(e, i, 'NORMAL', 'NORMAL', f"profitable_exit ({trade['reason']}, {trade['profit']:+.0f})",
                      self._signal(e, i), False)

    def entry_allowed(self, e, i):
        # The engine calls this only on a session with the 10% signal while flat.
        if not self.restricted:
            return True
        lower, reset = self._levels()
        c = e.c[i]
        if c >= reset:
            # Recovery reset takes priority over any entry at this close (brief section 2.D). Counted apart
            # from price blocks: the entry resumes under NORMAL rules from the next session.
            if c <= lower:
                self.dual_trigger_sessions += 1
                self.episode['dual_trigger_is'].append(i)
            self.reset_priority_blocks += 1
            self.episode['reset_priority_is'].append(i)
            self.blocked_is.add(i)  # the set feeds the matching assertion (any non-entry while flat with signal)
            return False
        if c <= lower:
            self.lower_price_reentries += 1
            return True
        self.blocked_sessions += 1
        self.blocked_is.add(i)
        self.episode['blocked_is'].append(i)
        return False

    def on_session_end(self, e, i):
        if not self.restricted:
            if e.pos is not None and e.pos.entry_i == i:
                self._log(e, i, 'NORMAL', 'NORMAL', 'normal_entry', True, True)
            return
        ep = self.episode
        c = float(e.c[i])
        ep['min_close'], ep['max_close'] = min(ep['min_close'], c), max(ep['max_close'], c)
        lower, reset = self._levels()
        signal = self._signal(e, i)
        if e.pos is not None:
            assert e.pos.entry_i == i, 'a position predates the restriction'
            self.restricted = False
            ep.update(resolution='lower_price_reentry', resolution_i=i, reentry_i=i)
            self._log(e, i, 'RESTRICTED', 'NORMAL', 'lower_price_reentry', signal, True)
            self.loss_exit_price = self.ref_high = self.episode = None
        elif c >= reset:
            self.restricted = False
            self.recovery_resets += 1
            ep.update(resolution='recovery_reset', resolution_i=i)
            self._log(e, i, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, False)
            self.loss_exit_price = self.ref_high = self.episode = None
        else:
            reason = 'restricted'
            if i in self.blocked_is:
                reason = 'entry_blocked (reset priority)' if c >= reset else 'entry_blocked (price not low enough)'
            self._log(e, i, 'RESTRICTED', 'RESTRICTED', reason, signal, False)
            if i == e.n - 1:  # episode still open at the end of the data
                ep.update(resolution='unresolved_at_end', resolution_i=i)


class B_lower_3pct(LowerPriceReentry):
    name = 'B_lower_3pct'
    threshold = 0.03


class C_lower_5pct(LowerPriceReentry):
    name = 'C_lower_5pct'
    threshold = 0.05


class D_lower_8pct(LowerPriceReentry):
    name = 'D_lower_8pct'
    threshold = 0.08


CONFIGS = {
    'A_baseline': A_baseline,
    'B_lower_3pct': B_lower_3pct,
    'C_lower_5pct': C_lower_5pct,
    'D_lower_8pct': D_lower_8pct,
}
