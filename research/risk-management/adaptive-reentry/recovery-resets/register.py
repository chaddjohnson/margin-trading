"""Pre-run registration for Family C (recovery resets). Run BEFORE run.py; append-only."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))

import registry  # noqa: E402

FAM = 'C'

ENTRIES = [
    dict(name='C0_none', family=FAM, description='No reset ever; only a qualifying 3%-lower entry clears a restriction. Mandatory diagnostic.', params={},
         hypothesis='Without a reset, any episode whose price runs upward away from the 3%-below-exit level never resolves: expect multi-year unresolved restrictions and forfeiture of most post-loss recoveries on the 2016-2026 datasets, while bear-market loss suppression (where the lower level IS reached) is retained. Quantifies the full opportunity cost of staying sidelined that every reset mechanism is buying back.'),
    dict(name='C1_frozen95', family=FAM, description='Reset when close >= 0.95 * frozen reference high (the verified rule; equals REF_lower3).', params=dict(fraction=0.95),
         hypothesis='Anchor. Known from lower-price-reentry: the frozen anchor is unreachable in deep bears (2001-02: reset level ~90% above price), every reset that fired rescued a deadlocked episode, and roughly half of resets on the old datasets were followed by a losing trade.'),
    dict(name='C2_exit_price', family=FAM, description='Reset when close >= frozen loss-exit price.', params={},
         hypothesis='Most permissive price reset: a bounce back to the price where the trade already failed clears the restriction. Expect near-baseline behavior, re-admission of repeated bear-rally losers (recreating the repeated-entry problem the restriction exists to fix) and little drawdown protection; can even reset on the arming exit session itself when the close recovers above the exit fill.'),
    dict(name='C3_entry_price', family=FAM, description='Reset when close >= frozen losing entry price.', params={},
         hypothesis='Permissive but stricter than C2 by the depth of the trade\'s own loss: price back at the failed entry shows the decline that caused the loss was fully repaired. Still expect substantial bear-rally false resets in 2000-02 because cascading entries step down with the market.'),
    dict(name='C4_rebound_10', family=FAM, description='Reset when close >= 1.10 * episode low (lowest close since the arming exit).', params=dict(x=0.10),
         hypothesis='Episode-anchored rebound adapts to decline depth, unlike the frozen peak anchor. 10% should fire early at V-bottoms (2020 rebounded >10% off the low within days) while the 10% entry signal is still live, buying back missed recoveries; cost: 2000-02 bear rallies exceeded 10% repeatedly, so expect the highest false-reset count of the C4 trio.'),
    dict(name='C4_rebound_15', family=FAM, description='Reset when close >= 1.15 * episode low.', params=dict(x=0.15),
         hypothesis='Middle rebound threshold: fewer bear-rally false resets than 10%, still fast enough for sharp V-bottoms; likely the best false-reset/rescue trade-off of the trio.'),
    dict(name='C4_rebound_20', family=FAM, description='Reset when close >= 1.20 * episode low.', params=dict(x=0.20),
         hypothesis='Strict rebound: only major rallies reset. Expect few false resets but late resets after V-bottoms (signal may have lapsed), approaching C1-like misses.'),
    dict(name='C5_atr_rebound_3', family=FAM, description='Reset when close >= episode low + 3 * ATR14[i]. NaN ATR -> frozen95 fallback, counted.', params=dict(k=3),
         hypothesis='Volatility-scaled rebound: in calm corrections a small absolute rebound suffices; in panics more is demanded. Because ATR is huge exactly at panic bottoms, k=3 may still reset quickly after V-bottoms; in low-vol grinds (2015, 2022) 3 ATR is a low bar, so expect more resets (and false resets) than C4_rebound_10 in quiet regimes.'),
    dict(name='C5_atr_rebound_5', family=FAM, description='Reset when close >= episode low + 5 * ATR14[i]. NaN ATR -> frozen95 fallback, counted.', params=dict(k=5),
         hypothesis='Stricter volatility-scaled rebound; expect behavior between C4_rebound_15 and _20 with regime-dependent effective percentage.'),
    dict(name='C6_retrace_38', family=FAM, description='Reset when close >= low + 0.38 * (frozen ref high - low).', params=dict(f=0.38),
         hypothesis='Retracement of the episode range: adapts partially to depth, but because the frozen reference high sits near the pre-cascade top, 38% of a deep-bear range is still far above price in cascades; expect behavior between C1 and C4 - shallow episodes reset easily, deep ones stay strict.'),
    dict(name='C6_retrace_50', family=FAM, description='Reset when close >= low + 0.50 * (frozen ref high - low).', params=dict(f=0.50),
         hypothesis='Stricter retracement; expect few false resets, deep-bear obsolescence closer to C1.'),
    dict(name='C7_rolling95', family=FAM, description='Reset when close >= 0.95 * rolling 90-session previous high (current market structure instead of the frozen anchor). NaN -> frozen95 fallback, counted.', params=dict(fraction=0.95, window=90),
         hypothesis='Fixes the obsolescence of C1: the rolling high decays toward price, so a reset path always exists after ~90 sessions. Expect resets "earned" by reference decay during prolonged bears (share reported), which re-admit entries during basing (could fix QQQ 2003) but also during ongoing declines (false resets). Equivalent to C1 early in an episode, more permissive later.'),
    dict(name='C8_breakout20', family=FAM, description='Reset when close > highest close of sessions i-20..i-1.', params=dict(window=20),
         hypothesis='Momentum confirmation: 20-session closing-high breakouts happen within days of a V-bottom (fast rescue) but also on every bear rally leg, so expect many resets and a high false-reset count in 2000-02; tests whether a cheap, fully adaptive reset simply recreates the baseline.'),
    dict(name='C9_base40', family=FAM, description='Reset when no new episode low for 40 sessions (i - min_close_i >= 40).', params=dict(sessions=40),
         hypothesis='Pure stabilization/basing detector, no price recovery required: directly aimed at the 2003-style basing problem where price never rebounds enough for recovery resets. Slow at V-bottoms (reset ~2 months after the low, signal may have lapsed); cascades keep making lows so mid-cascade false resets should be rare, but 40+ session bear rallies (2001-10 to 2002-01) will reset into the next leg down.'),
    dict(name='C10_time_price', family=FAM, description='Reset when sessions_restricted >= 60 AND close >= 1.05 * episode low.', params=dict(sessions=60, x=0.05),
         hypothesis='Conservative staleness valve: time gate plus mild price confirmation. Expect a low false-reset rate and rescue of stale restrictions and basing periods, but too slow for V-bottom rescues; should dominate C0 everywhere without approaching baseline permissiveness.'),
    dict(name='C11_graduated', family=FAM, description='Graduated severity via required_level: 3% discount until the close has reached 1.08x the episode low (sticky within the episode), then 1.5%; the C1 frozen-high 95% reset still clears to full normality. One config.', params=dict(stage2_rebound=0.08, discount1=0.03, discount2=0.015, reset_fraction=0.95),
         hypothesis='Direct attack on the sub-2% near-miss failures: after the market has confirmed an 8% rebound off the low, demand only 1.5% below the loss exit. Should rescue W-shaped retests; in pure V-shapes the 1.08x confirmation arrives only after price has left even the 1.5% level behind, so VGT 2023-01-style misses may persist. Bear-market risk: stage 2 admits entries only 1.5% below failed exits during cascades whose rallies exceed 8%.'),
    # ---- C12: agent-proposed resets aimed at recognizing a stale or substantively changed correction
    #      without requiring a return near the original peak ----
    dict(name='C12_sma100', family=FAM, description='Reset when close >= SMA100[i]. NaN -> frozen95 fallback, counted.', params=dict(window=100),
         hypothesis='Trend-regime reclaim: a close above the 100-session mean declares the correction regime over regardless of distance to the old peak, because the average itself falls during long declines (self-adapting anchor, unlike C1). Economic rationale: the restriction guards against re-entering a live downtrend; once price trades above its own 100-session average the downtrend is structurally over even if the old high is 40% away - exactly the stale-correction case (QQQ spring 2003 crossed SMA100 while still ~70% below the frozen highs). Risk: strong bear rallies (Dec 2001) pierce SMA100 and would reset into the next leg down.'),
    dict(name='C12_signal_gone15', family=FAM, description='Reset when the 10% entry signal has been absent (dd from rolling 90-high < 10%) for 15 consecutive sessions through i. Insufficient history/NaN -> frozen95 fallback, counted.', params=dict(sessions=15),
         hypothesis='Staleness by the strategy\'s own definition: while no 10% signal exists the restriction blocks nothing, so after 15 straight signal-free sessions the correction that armed it has lapsed and any future dip is a new event that deserves a fresh (unrestricted) first entry. By construction a reset is never immediately followed by an entry (none is possible without a new signal), so false resets can only come from genuinely new dips. Should fix the "signal lapsed, then the NEXT dip was still blocked" failures (2023-10, 2006-08, 2010-08 pattern); in 2000-02 the signal rarely disappeared for 15 sessions, so bear-market protection should be mostly preserved except after the largest rallies.'),
    dict(name='C12_vol_crush', family=FAM, description='Reset when NATR14[i] <= 0.66 * NATR14[arming exit session]. NaN -> frozen95 fallback, counted.', params=dict(frac=0.66, window=14),
         hypothesis='Regime change via volatility: corrections that arm restrictions are high-volatility events; when normalized ATR falls to two-thirds of its arming level, the panic that defined the episode has subsided and the market is a different regime, whatever the price level. Self-calibrating across eras. Risk: orderly grinds (2001-02 middle, 2015) see volatility decay while price still slides - expect mid-decline false resets there; after V-bottoms vol stays elevated for weeks, so rescues may be late.'),
    dict(name='C12_timeout120', family=FAM, description='Reset when sessions_restricted >= 120 (~6 months), unconditionally.', params=dict(sessions=120),
         hypothesis='Pure information decay: a single losing trade carries no information about the market ~6 months later, so the restriction simply expires. The cleanest test of "staleness alone" - every other mechanism adds a market condition. Expect mid-bear resets in 2001-02 (false) and reliable rescue of stale restrictions elsewhere; if C12_timeout120 matches the conditional mechanisms, their conditions add nothing.'),
    dict(name='C12_half_repair', family=FAM, description='Reset when close >= (episode low + frozen loss-exit price) / 2.', params=dict(fraction=0.5),
         hypothesis='Episode-geometry repair, anchored at the loss exit rather than the old peak: when half the post-exit damage is repaired, the decline that justified the restriction has substantively reversed. Self-limiting severity: a shallow episode (the -$143 VGT 2023-01 restriction) resets as soon as price recovers half its small dip - should rescue VGT 2023-01 - while deep episodes demand large absolute repair. Risk: in 2000-02 cascades each new episode\'s exit is near the current price, so bear rallies recross midpoints easily - expect many false resets; test whether it collapses toward C2/baseline.'),
    dict(name='C12_held_above', family=FAM, description='Reset when the minimum close of the last 20 sessions >= 1.05 * episode low (price has held at least 5% above the bottom for 20 consecutive sessions).', params=dict(window=20, x=0.05),
         hypothesis='Base formation, stricter than C9: not merely "no new low for N sessions" but a sustained hold >=5% above the low for a month - the market has accepted higher prices, the downtrend structure is broken. Because the episode-low close sits inside the window until it ages out, this implies the low is >=20 sessions old AND every close since stayed 5% above it. Expect very few false resets (bear rallies rarely hold 20 sessions without retesting), rescue of basing periods, but V-bottom rescues delayed ~1 month.'),
]

if __name__ == '__main__':
    path = registry.register(HERE, ENTRIES)
    print(f'registered {len(ENTRIES)} configs -> {path}')
