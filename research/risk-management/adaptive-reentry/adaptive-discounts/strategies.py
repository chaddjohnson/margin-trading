"""Family B — Adaptive lower-price requirements (experiment `adaptive_discounts`).

Every configuration varies ONLY `required_level`; trigger = net loss (framework default), reset =
frozen-high 95% (framework default). All discounts are off the frozen loss-exit price unless the spec
states another anchor. Computed discounts are clipped to [1%, 10%] unless the spec states the config's
own bounds (B2_inverse, B4, B7 state their own; B3/B8/B9/B10 anchor-level configs have no discount to
clip). Indicator NaN => fall back to the fixed 3%-off-exit level and count via
ctx.counters['indicator_fallbacks'].

CONFIGS maps registered name -> factory() -> AdaptiveStrategy. REGISTRY_ENTRIES carries the
pre-evaluation hypotheses (registered via registry.register before any run; append-only).
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[0] / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from framework import AdaptiveStrategy  # noqa: E402

FALLBACK_DISCOUNT = 0.03


def _clip(x, lo, hi):
    return min(max(x, lo), hi)


def _fallback(ctx, st):
    ctx.counters['indicator_fallbacks'] += 1
    return st.exit_price * (1 - FALLBACK_DISCOUNT)


# ---- B1: volatility-scaled discount off the loss exit ----

def b1_vol(k):
    def required_level(ctx, st, i):
        natr = ctx.ind.natr(14)[i]
        if math.isnan(natr):
            return _fallback(ctx, st)
        d = _clip(k * natr, 0.01, 0.10)
        return st.exit_price * (1 - d)
    required_level.__name__ = f'b1_vol_k{k:g}'
    return required_level


# ---- B2: loss-magnitude-scaled discount ----

def b2_loss(k):
    def required_level(ctx, st, i):
        d = _clip(0.01 + k * abs(st.price_return), 0.01, 0.10)
        return st.exit_price * (1 - d)
    required_level.__name__ = f'b2_loss_k{k:g}'
    return required_level


def b2_inverse(ctx, st, i):
    d = _clip(0.03 - 0.5 * abs(st.price_return), 0.005, 0.03)
    return st.exit_price * (1 - d)


# ---- B3: fixed discount off the LOSING ENTRY price ----

def b3_entry_anchor(pct):
    def required_level(ctx, st, i):
        return st.entry_price * (1 - pct)
    required_level.__name__ = f'b3_entry_anchor_{pct:g}'
    return required_level


# ---- B4: the failed trade's own decline credits toward the 3% requirement ----

def b4_credit(credit):
    def required_level(ctx, st, i):
        d = max(0.0, 0.03 - credit * max(0.0, -st.price_return))
        return st.exit_price * (1 - d)
    required_level.__name__ = f'b4_credit_{credit:g}'
    return required_level


# ---- B5: regime-dependent discount via 252-session drawdown ----

def b5_regime(deep_discount):
    def required_level(ctx, st, i):
        dd = ctx.ind.dd_from_high(252)[i]
        if math.isnan(dd):
            return _fallback(ctx, st)
        d = 0.03 if dd < 0.20 else deep_discount
        return st.exit_price * (1 - d)
    required_level.__name__ = f'b5_deep_{deep_discount:g}'
    return required_level


# ---- B6: discount ladder on the correction's failure count ----

def b6_ladder(d1, d2, d3plus):
    def required_level(ctx, st, i):
        n = ctx.correction.n_failed if ctx.correction is not None else 1
        d = d1 if n <= 1 else (d2 if n == 2 else d3plus)
        return st.exit_price * (1 - d)
    required_level.__name__ = f'b6_ladder_{d1:g}_{d2:g}_{d3plus:g}'
    return required_level


# ---- B7: time decay ----

def b7_decay120(ctx, st, i):
    d = 0.03 * max(0.0, 1 - st.sessions_restricted / 120)
    return st.exit_price * (1 - d)


def b7_stall(ctx, st, i):
    age = i - st.min_close_i
    d = 0.03 if age < 20 else 0.03 * max(0.0, 1 - (age - 20) / 60)
    return st.exit_price * (1 - d)


# ---- B8: correction-level anchors ----

def b8_first_entry_ladder(ctx, st, i):
    co = ctx.correction
    if co is None:
        return st.entry_price * (1 - 0.03)
    return co.first_entry_price * (1 - 0.03 * co.n_failed)


def b8_min_entry(ctx, st, i):
    co = ctx.correction
    if co is None:
        return st.entry_price * 0.97
    lo = min(ev.entry_price for ev in ctx.events if ev.entry_i >= co.first_entry_i)
    return lo * 0.97


# ---- B9: ATR distance below the losing entry ----

def b9_atr_below_entry(k):
    def required_level(ctx, st, i):
        a = ctx.ind.atr(14)[i]
        if math.isnan(a):
            return _fallback(ctx, st)
        return st.entry_price - k * a
    required_level.__name__ = f'b9_atr_below_entry_k{k:g}'
    return required_level


# ---- B10: agent-proposed mechanisms (rationales in REGISTRY_ENTRIES, registered before any run) ----

def b10_near_low(ctx, st, i):
    """3% rule, additionally accepting any close within 1% of the episode's running minimum close
    provided it still improves >= 1% on the failed exit: level = max(exit*0.97,
    min(exit*0.99, min_close*1.01)). min_close is updated through session i (includes today)."""
    base = st.exit_price * 0.97
    rescue = min(st.exit_price * 0.99, st.min_close * 1.01)
    return max(base, rescue)


def b10_fresh_crash(ctx, st, i):
    """1.5% discount when the market is >= 20% below a 252-session high that was set within the last
    ~90 sessions (a fast crash from a fresh high); 3% otherwise (grinding bears have stale highs)."""
    dd = ctx.ind.dd_from_high(252)[i]
    rh90 = ctx.ind.roll_high_prev(90)[i]
    rh252 = ctx.ind.roll_high_prev(252)[i]
    if math.isnan(dd) or math.isnan(rh90) or math.isnan(rh252):
        return _fallback(ctx, st)
    fresh = rh90 == rh252
    d = 0.015 if (dd >= 0.20 and fresh) else 0.03
    return st.exit_price * (1 - d)


def b10_ref_high(d):
    """Correction-top anchor: level = frozen ref_high * (1 - d). The anchor is the losing trade's own
    entry-signal 90-session high, so cascades ratchet it down with each re-armed episode."""
    def required_level(ctx, st, i):
        return st.ref_high * (1 - d)
    required_level.__name__ = f'b10_ref_high_{d:g}'
    return required_level


def b10_persist2(ctx, st, i):
    """Path-dependent requirement: 1% below the failed exit suffices if the PREVIOUS session's close
    was already at/below that level (two consecutive closes below exit*0.99); else the full 3%."""
    l1 = st.exit_price * 0.99
    if i >= 1 and float(ctx.e.c[i - 1]) <= l1:
        return l1
    return st.exit_price * 0.97


def b10_deeper_signal(ctx, st, i):
    """Market-structure anchor: require a dip 3% deeper than the entry signal's own threshold —
    level = 0.97 * 0.90 * rolling 90-session previous high at i (the signal's reference), i.e. a
    ~12.7% dip instead of 10%. The anchor follows the market, not the failed trade."""
    rh = ctx.ind.roll_high_prev(90)[i]
    if math.isnan(rh):
        return _fallback(ctx, st)
    return 0.97 * 0.90 * rh


# ---- configuration table ----

def _mk(req):
    return lambda: AdaptiveStrategy('tmp', required_level=req)


CONFIGS = {
    'B1_vol_k1': _mk(b1_vol(1.0)),
    'B1_vol_k2': _mk(b1_vol(2.0)),
    'B1_vol_k3': _mk(b1_vol(3.0)),
    'B2_loss_k05': _mk(b2_loss(0.5)),
    'B2_loss_k10': _mk(b2_loss(1.0)),
    'B2_inverse': _mk(b2_inverse),
    'B3_entry_anchor_3': _mk(b3_entry_anchor(0.03)),
    'B3_entry_anchor_5': _mk(b3_entry_anchor(0.05)),
    'B4_credit_50': _mk(b4_credit(0.5)),
    'B4_credit_100': _mk(b4_credit(1.0)),
    'B5_shallow3_deep15': _mk(b5_regime(0.015)),
    'B5_shallow3_deep6': _mk(b5_regime(0.06)),
    'B6_up': _mk(b6_ladder(0.03, 0.05, 0.08)),
    'B6_down': _mk(b6_ladder(0.05, 0.03, 0.02)),
    'B7_decay120': _mk(b7_decay120),
    'B7_stall': _mk(b7_stall),
    'B8_first_entry_ladder': _mk(b8_first_entry_ladder),
    'B8_min_entry': _mk(b8_min_entry),
    'B9_atr_below_entry_k1': _mk(b9_atr_below_entry(1.0)),
    'B9_atr_below_entry_k2': _mk(b9_atr_below_entry(2.0)),
    'B10_near_low': _mk(b10_near_low),
    'B10_fresh_crash': _mk(b10_fresh_crash),
    'B10_ref_high_12': _mk(b10_ref_high(0.12)),
    'B10_ref_high_15': _mk(b10_ref_high(0.15)),
    'B10_persist2': _mk(b10_persist2),
    'B10_deeper_signal': _mk(b10_deeper_signal),
}

FAM = 'B'

REGISTRY_ENTRIES = [
    dict(name='B1_vol_k1', family=FAM, description='discount = clip(1*NATR14, 1%, 10%) off the loss exit; NaN -> 3% fallback',
         params=dict(k=1.0, clip=[0.01, 0.10]),
         hypothesis='Scaling the required discount to current volatility makes 3% "cheap" in calm markets and keeps it binding in crashes; k=1 (~1-3% typical NATR) should behave near the fixed 3% in panics but looser in quiet corrections.'),
    dict(name='B1_vol_k2', family=FAM, description='discount = clip(2*NATR14, 1%, 10%) off the loss exit; NaN -> 3% fallback',
         params=dict(k=2.0, clip=[0.01, 0.10]),
         hypothesis='k=2 demands roughly a 2-sigma-of-daily-range improvement; in V-bottoms NATR explodes (5%+), so the requirement may widen exactly when the rebound comes - the risk is it reproduces the -8% misses at 2020/2026.'),
    dict(name='B1_vol_k3', family=FAM, description='discount = clip(3*NATR14, 1%, 10%) off the loss exit; NaN -> 3% fallback',
         params=dict(k=3.0, clip=[0.01, 0.10]),
         hypothesis='k=3 nearly always clips to 10% in panics; expected to maximize bear protection and to miss every V-bottom - included to map the frontier.'),
    dict(name='B2_loss_k05', family=FAM, description='discount = clip(1% + 0.5*|price return|, 1%, 10%) off the loss exit',
         params=dict(k=0.5, base=0.01, clip=[0.01, 0.10]),
         hypothesis='Severity-proportional waiting: trivial losses (the VGT 2023-01 -$143 case) should impose ~1% and stop blocking +$28k winners, while cascade losses (-8%+) impose ~5%. Direction not prejudged vs B2_inverse.'),
    dict(name='B2_loss_k10', family=FAM, description='discount = clip(1% + 1.0*|price return|, 1%, 10%) off the loss exit',
         params=dict(k=1.0, base=0.01, clip=[0.01, 0.10]),
         hypothesis='Same as B2_loss_k05 with full-weight scaling; big-loss episodes approach the -8% behaviour that missed 2009/2026, so the bear benefit may cost the recoveries.'),
    dict(name='B2_inverse', family=FAM, description='discount = clip(3% - 0.5*|price return|, 0.5%, 3%) off the loss exit',
         params=dict(base=0.03, k=-0.5, clip=[0.005, 0.03]),
         hypothesis='Inverse scaling: a severe loss means the market already delivered a large decline, so demanding further depth prices you out at capitulation lows; small losses keep the full 3%. Tests the opposite direction honestly.'),
    dict(name='B3_entry_anchor_3', family=FAM, description='level = losing ENTRY price * (1 - 3%)',
         params=dict(pct=0.03, anchor='losing_entry'),
         hypothesis='"Materially better purchase than the last failed one" arguably means better than the failed ENTRY, not the exit; since exits sit below entries, this is stricter than 3%-off-exit and should hold up in cascades while possibly missing shallow V-bottoms.'),
    dict(name='B3_entry_anchor_5', family=FAM, description='level = losing ENTRY price * (1 - 5%)',
         params=dict(pct=0.05, anchor='losing_entry'),
         hypothesis='Stricter entry-anchored variant; maps how fast the entry anchor degrades at the known near-miss episodes.'),
    dict(name='B4_credit_50', family=FAM, description='level = exit * (1 - max(0, 3% - 0.5*max(0, -price return)))',
         params=dict(credit=0.5, base=0.03),
         hypothesis='The failed trade already "paid for" part of the decline: crediting half its own price loss against the 3% requirement relaxes exactly after big-loss crashes (2020-style) while keeping 3% after financing-only losses.'),
    dict(name='B4_credit_100', family=FAM, description='level = exit * (1 - max(0, 3% - 1.0*max(0, -price return)))',
         params=dict(credit=1.0, base=0.03),
         hypothesis='Full credit: any trade that lost >= 3% of price imposes no further discount (level = exit price). Strong V-bottom rescue, but in cascades it may re-admit entries at barely-lower prices and re-open repeated losses.'),
    dict(name='B5_shallow3_deep15', family=FAM, description='discount = 3% while dd_from_high(252) < 20%, else 1.5%; NaN -> 3% fallback',
         params=dict(dd_threshold=0.20, shallow=0.03, deep=0.015),
         hypothesis='Deep-drawdown relaxation: once the market is already 20%+ down, further depth demands cause the V-bottom misses, so halve the requirement there; shallow corrections keep the verified 3%.'),
    dict(name='B5_shallow3_deep6', family=FAM, description='discount = 3% while dd_from_high(252) < 20%, else 6%; NaN -> 3% fallback',
         params=dict(dd_threshold=0.20, shallow=0.03, deep=0.06),
         hypothesis='Deep-drawdown tightening (the opposite): deep bears are where repeated losses happened, so demand more depth there. Tests the regime-conditioning direction without prejudging it.'),
    dict(name='B6_up', family=FAM, description='discount by correction failure count: 3% / 5% / 8% for 1st / 2nd / >=3rd failed trade',
         params=dict(ladder=[0.03, 0.05, 0.08]),
         hypothesis='Escalating discipline: each repeated failure in the same correction is stronger evidence of a cascade, so demand progressively more - should approximate 3% at V-bottoms (single failure) and 8% deep in 2000-02.'),
    dict(name='B6_down', family=FAM, description='discount by correction failure count: 5% / 3% / 2% for 1st / 2nd / >=3rd failed trade',
         params=dict(ladder=[0.05, 0.03, 0.02]),
         hypothesis='De-escalating: by the 2nd-3rd failure the correction is mature and closer to its bottom, so relax; the first failure (often early in a decline) gets the strict 5%. Opposite direction, tested honestly.'),
    dict(name='B7_decay120', family=FAM, description='discount = 3% * max(0, 1 - sessions_restricted/120) off the loss exit',
         params=dict(base=0.03, horizon=120),
         hypothesis='Stale restrictions should fade: information in a months-old loss decays. Key question is whether this just becomes a ~120-session cooldown (level -> exit price) rather than a price rule.'),
    dict(name='B7_stall', family=FAM, description='discount = 3% while the episode low is < 20 sessions old, then decays linearly to 0 over the next 60 sessions (age = i - min_close_i)',
         params=dict(base=0.03, fresh_age=20, decay=60),
         hypothesis='Decay keyed to the LOW going stale, not the restriction: while new lows keep coming (cascade) the full 3% holds; once the low stops falling (basing, 2003-style) the requirement fades and re-admits basing-period entries.'),
    dict(name='B8_first_entry_ladder', family=FAM, description='level = correction first entry price * (1 - 3% * n_failed)',
         params=dict(step=0.03, anchor='correction_first_entry'),
         hypothesis='A single stable correction anchor (the first failed entry) with an escalating ladder removes the drifting-anchor effect of per-episode exits; in cascades it ratchets like B6_up, at V-bottoms it equals B3_entry_anchor_3.'),
    dict(name='B8_min_entry', family=FAM, description='level = (lowest losing entry price in the correction) * 0.97',
         params=dict(pct=0.03, anchor='correction_min_entry'),
         hypothesis='"Better than the best attempt so far": requiring 3% below the cheapest failed entry is the literal reading of the objective; stricter than B3 only after multiple failures.'),
    dict(name='B9_atr_below_entry_k1', family=FAM, description='level = losing entry - 1*ATR14[i]; NaN -> 3%-off-exit fallback',
         params=dict(k=1.0, anchor='losing_entry'),
         hypothesis='Volatility-denominated improvement on the entry anchor: one average true range below the failed entry is "materially better" in units the market itself sets; should loosen in panics (big ATR already implies big declines) relative to fixed %.'),
    dict(name='B9_atr_below_entry_k2', family=FAM, description='level = losing entry - 2*ATR14[i]; NaN -> 3%-off-exit fallback',
         params=dict(k=2.0, anchor='losing_entry'),
         hypothesis='Two-ATR variant; maps the ATR-anchored frontier - in high-vol crashes 2*ATR14 can exceed 10% of price, so this may reproduce the deep-threshold V-bottom misses.'),
    # ---- agent-proposed B10 mechanisms (structurally distinct; rationales below; registered before any run) ----
    dict(name='B10_near_low', family=FAM, description='level = max(exit*0.97, min(exit*0.99, episode min close * 1.01)) - the 3% rule, additionally accepting any close within 1% of the running episode low that still improves >= 1% on the failed exit',
         params=dict(base=0.03, floor_improvement=0.01, near_low=0.01, anchor='episode_low'),
         hypothesis='Economic rationale: the fixed 3% demands a price the market may simply never print again (the 1.0-1.6% V-bottom misses at VGT 2020-03/2023-01/2026-03). The episode minimum close is the only evidence-based anchor for "the best price this correction has actually offered"; accepting closes within 1% of it - provided they are still at least 1% cheaper than the failed exit - means we never hold out for an unprinted price, while in cascades the running low keeps falling and keeps the requirement binding. Risk, stated in advance: near the lows of a grinding bear it behaves like a ~1% rule and may re-admit repeated losers.'),
    dict(name='B10_fresh_crash', family=FAM, description='discount = 1.5% when dd_from_high(252) >= 20% AND the 252-session high lies within the last 90 sessions (roll_high_prev(90) == roll_high_prev(252)); else 3%; NaN -> 3% fallback',
         params=dict(dd_min=0.20, relaxed=0.015, base=0.03, fresh_window=90),
         hypothesis='Economic rationale: V-rebounds (2020-03, 2026-03) follow FAST declines from recent highs, while grinding bears (2001-02, late 2008) trade far below highs set long ago. Depth alone (B5) cannot distinguish them; recency of the high can. When >= 20% has been lost from a high set within ~4 months, demanding the full 3% below a days-old exit prices us out at capitulation; when the high is stale, the full discount stays. Honest prediction of the cost: the FIRST leg of every bear (spring 2000, early 2022) also looks like a fresh crash and will be relaxed into.'),
    dict(name='B10_ref_high_12', family=FAM, description='level = frozen ref_high * (1 - 12%) - the losing trade entry-signal 90-session high as the correction anchor',
         params=dict(d=0.12, anchor='ref_high'),
         hypothesis='Economic rationale: exit and entry prices are artifacts of stop mechanics and gaps; the structurally meaningful anchor of a correction is its top. The failed entry fired at ~10% below the reference high; requiring ~12% demands the correction has deepened materially beyond the stage that failed, in units of the correction itself. In cascades each re-armed episode re-freezes ref_high at a lower 90-session high, so the level ratchets down; after a crash the level sits a fixed, reachable distance below the old top instead of chasing the exit price down. d=12% is the mild variant.'),
    dict(name='B10_ref_high_15', family=FAM, description='level = frozen ref_high * (1 - 15%)',
         params=dict(d=0.15, anchor='ref_high'),
         hypothesis='Same mechanism as B10_ref_high_12 with a materially deeper stage requirement (15% below the correction top); registered together to measure knife-edge sensitivity of the top-anchor at the known near-miss episodes without post-hoc tuning.'),
    dict(name='B10_persist2', family=FAM, description='level = exit*0.99 if the previous session close was already <= exit*0.99, else exit*0.97 (two consecutive closes 1% below the failed exit substitute for one close 3% below)',
         params=dict(relaxed=0.01, base=0.03, persistence=2),
         hypothesis='Economic rationale: the 3% depth demand is really a guard against buying a one-session downtick that immediately mean-reverts. Persistence is an alternative guard: two CONSECUTIVE closes at least 1% below the failed exit demonstrate a sustained, genuinely lower price regime without demanding an arbitrary extra depth the market may never print (the 2020/2023 misses were 1.0-1.6%). Risk, stated in advance: in grinding bears price sits persistently below the old exit, so this degrades toward a 1% rule exactly where depth was protective.'),
    dict(name='B10_deeper_signal', family=FAM, description='level = 0.97 * 0.90 * roll_high_prev(90)[i] - i.e. require the dip to be ~12.7% below the CURRENT rolling 90-session high (3% deeper than the 10% entry signal itself); NaN -> 3%-off-exit fallback',
         params=dict(extra=0.03, signal=0.10, anchor='rolling_90_high'),
         hypothesis='Economic rationale: the entry edge is defined relative to the rolling 90-session high (the 10% dip); a failed post-loss entry means that dip depth was insufficient, so require the SAME measure to deepen by 3% rather than referencing trade prices at all. The anchor adapts in both regimes: in long bears the rolling high itself declines, keeping the requirement binding all the way down; after a V-crash the rolling high stays at the pre-crash peak for ~90 sessions, so the level is generous near the bottom and the signal lapse - not an unprinted price - becomes the only way to miss. Risk: it ignores loss severity entirely and may re-enter quickly after small further declines mid-bear.'),
]

assert set(c['name'] for c in REGISTRY_ENTRIES) == set(CONFIGS), 'registry/config name mismatch'
