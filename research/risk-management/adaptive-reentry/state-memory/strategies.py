"""Family E — correction memory and state management (experiment `adaptive_state_memory`).

Five state machines over the frozen framework, ordered by what they remember. All five share the
verified trigger convention (net loss arms, except E5) and differ ONLY in the quantities their
components read. No shared infrastructure is modified; E5 is the one permitted subclass (Family E may
subclass when a composition cannot express the design) and its override is bookkeeping-only, after the
frozen chronology has run — documented on the class.

Remembered quantities per config (beyond the framework's standard evolving episode fields
min_close/sessions_restricted, which every config carries):

  E1_exit_only      exit_price, ref_high                       (2)  = REF anchor (verified 3% rule)
  E2_entry_only     entry_price, ref_high                      (2)  anchor = what the failed trade PAID
  E3_entry_count    first_entry_price, n_failed, episode low   (3)  ladder off the correction's 1st entry
  E4_cum_loss       exit_price, cum_loss, ref_high             (3)  severity-scaled discount
  E5_no_small_rearm streak_first_entry, exit_price, ref_high   (3)  small losses accumulate, never arm alone

`correction_ends_on_reset` is True for every config (deliberate; per-config rationale in the registry
and CORRECTION_MEMORY.md): a recovery reset is the machine's statement that the correction has ended,
so correction memory (ladder count, cumulative loss, E5's streak anchor) must not leak into the next
correction. For E1/E2 the flag is behaviourally inert (no component reads ctx.correction).
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from framework import AdaptiveStrategy  # noqa: E402


# ---- E2: entry-price anchor ----

def entry_anchor_3pct(ctx, st, i):
    """E2 level: last losing ENTRY price x 0.97 (st.entry_price, frozen when the restriction armed).

    After a deep price loss the loss exit already sits >= 3% below the entry, so the level is above the
    exit price and the next 10%-signal session re-enters immediately; after a small price loss it is as
    strict as E1. The exit price is never read."""
    return st.entry_price * 0.97


# ---- E3: first-entry ladder + 15% rebound reset ----

def first_entry_ladder_3pct(ctx, st, i):
    """E3 level: correction first entry x (1 - 0.03 * n_failed) — n_failed counts the correction's
    arming losses including the current one, so the 1st failure requires 3% below the FIRST failed
    entry, the 2nd 6%, the 3rd 9%, ... No clip (3% * n >= 100% would need 34 failures; never occurs).
    ctx.correction is always set while an episode is active (created on the arming exit)."""
    co = ctx.correction
    return co.first_entry_price * (1 - 0.03 * co.n_failed)


def rebound_reset_15pct(ctx, st, i):
    """E3 reset (C4-style): close >= 1.15 x episode low, where the episode low is the lowest CLOSE
    since the arming exit session inclusive (st.min_close, updated through session i before this
    runs — the arming session itself can never satisfy it since close == min_close there)."""
    return ctx.e.c[i] >= 1.15 * st.min_close


# ---- E4: cumulative-loss-scaled discount ----

def cum_loss_discount(ctx, st, i):
    """E4 level: loss-exit price x (1 - d), d = clip(1% + |correction cum loss| / $100k, 1%, 8%).

    cum_loss is the sum of net P&L (interest included) of the correction's arming losses, including
    the current one. A -$143 loss gives d = 1.14% (nearly no restriction); d saturates at 8% once the
    correction has lost >= $7,000. The lower clip is arithmetically inert (1% + |x| >= 1%); kept for
    fidelity to the registered formula."""
    d = min(max(0.01 + abs(ctx.correction.cum_loss) / 100000.0, 0.01), 0.08)
    return st.exit_price * (1 - d)


# ---- E5: no re-arm on single small losses ----

def streak_trigger_2pct(ctx, trade):
    """E5 trigger: a losing exit arms the restriction only when the losing STREAK's cumulative price
    decline from its first entry reaches 2%: exit_price / streak_first_entry - 1 <= -0.02.

    streak_first_entry is the entry price of the first trade of the current run of consecutive
    net-loss exits. It is set here on the first loss while empty, kept by non-arming losses (small
    losses accumulate toward the 2% threshold instead of each arming a restriction), and cleared by
    any profitable (net P&L >= 0) exit here and by a recovery reset in E5NoSmallRearm.on_session_end.
    A single financing-only loss (exit >= entry) can therefore never arm; neither can any single
    price loss shallower than 2% measured from the streak's first entry."""
    if trade['profit'] >= 0:
        ctx.streak_first_entry = None
        return False
    if ctx.streak_first_entry is None:
        ctx.streak_first_entry = float(trade['entry_price'])
    return float(trade['exit_price']) / ctx.streak_first_entry - 1 <= -0.02


class E5NoSmallRearm(AdaptiveStrategy):
    """E5: REF level (exit x 0.97) and REF reset (frozen-high 95%); only the trigger changes, carrying
    one extra remembered float, streak_first_entry (see streak_trigger_2pct).

    Override semantics (the one subclass hook Family E uses): `on_session_end` first runs the frozen
    implementation unchanged — reset priority, entry resolution, logging, correction lifecycle — and
    only afterwards, if that frozen logic resolved the active episode by `recovery_reset` at this very
    session, clears streak_first_entry, mirroring correction_ends_on_reset=True onto the trigger's own
    memory. No decision, log row, counter or state transition is altered; the chronology contract is
    preserved exactly."""

    def __init__(self):
        super().__init__('E5_no_small_rearm', trigger=streak_trigger_2pct)
        self.streak_first_entry = None

    def on_session_end(self, e, i):
        st_before = self.st
        super().on_session_end(e, i)
        if st_before is not None and st_before.resolution == 'recovery_reset' and st_before.resolution_i == i:
            self.streak_first_entry = None


# ---- configuration factories (names must match the registry) ----

CONFIGS = {
    'E1_exit_only': lambda: AdaptiveStrategy('E1_exit_only'),
    'E2_entry_only': lambda: AdaptiveStrategy('E2_entry_only', required_level=entry_anchor_3pct),
    'E3_entry_count': lambda: AdaptiveStrategy('E3_entry_count', required_level=first_entry_ladder_3pct,
                                               reset=rebound_reset_15pct),
    'E4_cum_loss': lambda: AdaptiveStrategy('E4_cum_loss', required_level=cum_loss_discount),
    'E5_no_small_rearm': E5NoSmallRearm,
}

ENTRIES = [
    dict(
        name='E1_exit_only', family='E',
        description='REF anchor. Trigger: any net loss. Level: loss-exit price x 0.97. Reset: close >= '
                    '0.95 x frozen ref high. Remembered: exit_price, ref_high (2). '
                    'correction_ends_on_reset=True (inert: no component reads the correction).',
        params=dict(anchor='exit', discount=0.03, reset='frozen95', correction_ends_on_reset=True),
        hypothesis='Reference point: the verified 3% rule (identical to REF_lower3 / B_lower_3pct). '
                   'Every other Family E machine is judged against it; its known failure is that the '
                   'anchor is an arbitrary exit date (the -$143 VGT 2023-01 episode).'),
    dict(
        name='E2_entry_only', family='E',
        description='Entry-price anchor. Trigger: any net loss. Level: last losing ENTRY price x 0.97 '
                    '(st.entry_price). Reset: close >= 0.95 x frozen ref high. "No other memory" read '
                    'as: no correction-level memory (no failure count, no ladder, no cumulative loss); '
                    'the episode remembers only the arming trade\'s entry price for the level and '
                    'ref_high for the reset (2 quantities, same count as E1). '
                    'correction_ends_on_reset=True (inert).',
        params=dict(anchor='entry', discount=0.03, reset='frozen95', correction_ends_on_reset=True),
        hypothesis='Anchoring to what the failed trade PAID removes the arbitrary exit-date dependence '
                   'of E1: after a deep loss the exit is already >=3% below entry, so re-entry is '
                   'immediate at the next signal (no deep-bear spacing), while small losses are as '
                   'restricted as E1. Expected to fix V-bottom misses at the cost of re-opening the '
                   '2000-02 repeated-loss problem — a diagnostic for question 5, not a candidate.'),
    dict(
        name='E3_entry_count', family='E',
        description='First-entry ladder + rebound reset. Trigger: any net loss. Level: correction '
                    'first entry x (1 - 0.03 x n_failed), n_failed = arming losses in the correction '
                    'including the current one (1st failure 3%, 2nd 6%, 3rd 9%, ... below the FIRST '
                    'failed entry; no clip). Reset: close >= 1.15 x episode low (lowest close since '
                    'the arming exit, st.min_close — C4_rebound_15 form). Remembered: '
                    'first_entry_price, n_failed, episode low (3). correction_ends_on_reset=True '
                    '(deliberate: a 15% rebound from the low declares the correction over, so the '
                    'ladder resets; keeping it would anchor the next correction to a stale entry).',
        params=dict(anchor='correction_first_entry', ladder_step=0.03, reset='rebound_15pct_episode_low',
                    correction_ends_on_reset=True),
        hypothesis='One stable anchor per correction plus a failure count spaces repeated attempts '
                   'down a cascade without referencing any exit price, and the rebound reset ends the '
                   'correction from the LOW (reachable in deep bears, unlike frozen95) — testing '
                   'whether correction-level memory plus a recovery-defined ending beats both '
                   'per-trade anchors.'),
    dict(
        name='E4_cum_loss', family='E',
        description='Severity-scaled discount. Trigger: any net loss. Level: loss-exit price x (1 - d), '
                    'd = clip(1% + |correction cum loss| / $100k, 1%, 8%); cum loss = sum of net P&L '
                    '(interest included) of the correction\'s arming losses including the current one. '
                    'Reset: close >= 0.95 x frozen ref high. Remembered: exit_price, cum_loss, '
                    'ref_high (3). correction_ends_on_reset=True (deliberate: frozen95 fires only near '
                    'full recovery; a finished correction\'s losses must not scale the next one).',
        params=dict(anchor='exit', discount='clip(0.01 + |cum_loss|/1e5, 0.01, 0.08)', reset='frozen95',
                    correction_ends_on_reset=True),
        hypothesis='Restriction severity should scale with the damage done: a -$143 loss gets a 1.14% '
                   'discount (nearly no restriction — directly targets the VGT 2023-01 failure) while '
                   'a cascade saturates at 8% (2000-02 spacing preserved). Tests whether cumulative '
                   'dollars are the right memory, independent of any individual loss size.'),
    dict(
        name='E5_no_small_rearm', family='E',
        description='Cumulative arming threshold. Trigger: a net-loss exit arms ONLY when '
                    'exit_price / streak_first_entry - 1 <= -0.02, where streak_first_entry is the '
                    'entry price of the first trade of the current run of consecutive net-loss exits '
                    '(set on the first loss, kept by non-arming losses, cleared by any profitable exit '
                    'and by a recovery reset). Single small losses never arm. Level: loss-exit x 0.97; '
                    'reset: frozen95 (both REF). Remembered: streak_first_entry, exit_price, ref_high '
                    '(3). correction_ends_on_reset=True, mirrored onto streak_first_entry via a '
                    'bookkeeping-only on_session_end override (subclass E5NoSmallRearm; frozen logic '
                    'runs first, unchanged).',
        params=dict(arm_threshold=-0.02, measure='exit/streak_first_entry - 1', anchor='exit',
                    discount=0.03, reset='frozen95', correction_ends_on_reset=True),
        hypothesis='The restriction exists to stop cascades, and a cascade is a CUMULATIVE decline — '
                   'so arm on cumulative price damage, not on any single loss. Micro-losses '
                   '(financing-only, or < 2% from the streak start) stay unrestricted (fixing '
                   'VGT 2023-01) while chained small losses still arm once their sum exceeds 2% '
                   '(keeping 2000-02 protection). Tests whether the TRIGGER, not the discount, is the '
                   'right place for loss-size memory.'),
]
