"""Family D registry. Run BEFORE the first evaluation (the runner refuses unregistered names).
Append-only; entries already present are skipped so the script is safe to re-run after a crash."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))

import registry  # noqa: E402

FAM = 'D_recovery_opportunities'

ENTRIES = [
    dict(name='REF_lower3', family=FAM,
         description='Anchor: the verified existing 3% rule (all default components). Used for the '
                     'D6 diagnostic at the 3% threshold and as the vs-existing-3% reference.',
         params=dict(discount=0.03, trigger='net_loss', reset='frozen_high_0.95'),
         hypothesis='Calibration anchor; must equal lower-price-reentry B_lower_3pct trade for trade.'),
    dict(name='lower5', family=FAM,
         description='D6 anchor: fixed_discount(0.05), everything else at REF.',
         params=dict(discount=0.05, trigger='net_loss', reset='frozen_high_0.95'),
         hypothesis='Reproduces lower-price-reentry C_lower_5pct; supplies the blocked-winner set for '
                    'the D6 failure-mechanism table at the 5% threshold.'),
    dict(name='lower8', family=FAM,
         description='D6 anchor: fixed_discount(0.08), everything else at REF.',
         params=dict(discount=0.08, trigger='net_loss', reset='frozen_high_0.95'),
         hypothesis='Reproduces lower-price-reentry D_lower_8pct; supplies the blocked-winner set for '
                    'the D6 failure-mechanism table at the 8% threshold (incl. the missed March 2009).'),
    dict(name='D1_reset_only_rebound12', family=FAM,
         description='ADDITIONAL reset when close >= 1.12 x episode low (lowest close since the arming '
                     'exit, inclusive); frozen-high 95% reset kept. No new entry path: after the reset '
                     'any entry still requires the baseline 10% signal. Baseline-compatible.',
         params=dict(rebound=1.12, keep_frozen95=True, discount=0.03),
         hypothesis='A 12% rebound off the episode low says the decline reversed while the frozen-high '
                    'reset is still unreachable (its anchor goes stale in deep bears). Clearing the '
                    'restriction then should rescue V-bottom misses where the 10% signal persists after '
                    'the rebound (VGT 2020-03/04 type) at modest bear-market cost, because the signal '
                    'requirement itself filters entries once a rally has carried price within 10% of the '
                    'rolling high. Risk: 2000-02 bear rallies exceed 12% with the signal still on, '
                    're-admitting cascade entries near local tops.'),
    dict(name='D1_alt_entry_rebound10', family=FAM,
         description='EXPLORATORY alt entry while restricted: close >= 1.10 x episode low AND close <= '
                     '0.85 x frozen ref high. Reported separately from baseline-compatible configs.',
         params=dict(rebound=1.10, ref_high_cap=0.85, discount=0.03),
         hypothesis='Buying the confirmed 10% turn directly (instead of waiting for a reset plus a fresh '
                    'signal) captures V-bottoms earlier and at known prices; the 0.85 x ref-high cap is '
                    'meant to refuse entries near bear-rally tops. Risk: in 2000-02 prices sat far below '
                    '0.85 x ref high for entire cascades, so the cap may not filter bear rallies at all; '
                    'expect good VGT 2016-26, bad QQQ 1999-2015.'),
    dict(name='D2_window', family=FAM,
         description='Alt entry when close <= required level x 1.02 AND close >= 1.03 x episode low '
                     '(near-miss rescue: almost reached the level, now turning up). Required level is '
                     'the REF 3% level.',
         params=dict(tolerance=1.02, rebound=1.03, discount=0.03),
         hypothesis='The decisive misses were 1.0-1.6% of price; a 2% tolerance band gated by a 3% '
                    'rebound off the episode low should buy turns rather than catch knives. Registered '
                    'caveat (arithmetic, noted before running): both conditions can only hold together '
                    'when the episode low closed at or below level x 1.02/1.03 ~ level - 0.97%, which in '
                    'a blocked episode requires a sub-level close on the arming exit session or on a '
                    'session without the 10% signal. The band therefore cannot fire in episodes whose '
                    'minimum close stayed above the level (the known VGT 2020/2023/2026 misses) and the '
                    'mechanism as specified is expected to fire rarely; the run measures how rarely.'),
    dict(name='D3_tolerance_deep', family=FAM,
         description='Required level = REF level x 1.02 only while dd252 >= 25% (else exact REF level). '
                     'dd252 = ind.dd_from_high(252); NaN falls back to the fixed 3% and is counted.',
         params=dict(tolerance=1.02, dd_window=252, dd_min=0.25, discount=0.03),
         hypothesis='In deep drawdowns the marginal 2% of discount is noise relative to the move already '
                    'suffered, and waiting for it causes basing-period misses (QQQ 2003). Relaxing only '
                    'when dd252 >= 25% should capture deep-bear re-entries slightly earlier WITHOUT '
                    'loosening shallow-correction discipline. Honesty check: compare against '
                    'D3_control_fixed_106 — if results are indistinguishable, the dd gate adds nothing '
                    'and D3 is just a smaller threshold in disguise.'),
    dict(name='D3_control_fixed_106', family=FAM,
         description='Control for D3: fixed_discount(0.0106) everywhere (0.97 x 1.02 = 0.9894), i.e. '
                     'D3\'s deep-bear level applied unconditionally.',
         params=dict(discount=0.0106),
         hypothesis='If D3 beats this control only where dd252 >= 25% episodes exist and matches it '
                    'elsewhere, the dd gate is doing real work; if the two are close everywhere, D3 is '
                    'not distinguishable from a smaller fixed threshold.'),
    dict(name='D4_score', family=FAM,
         description='Alt entry when >= 2 of: (a) close <= losing entry x 0.97; (b) close <= frozen loss '
                     'exit price; (c) dd252 >= 20% (NaN => false, counted as fallback); (d) close >= '
                     '1.05 x episode low. Exact definition fixed here before running.',
         params=dict(entry_disc=0.97, dd_window=252, dd_min=0.20, rebound=1.05, min_score=2),
         hypothesis='No single condition is reliable, but two independent lines of evidence (a better '
                    'price than the failed trade, a deep market, a confirmed turn) should justify entry. '
                    'Risk: conditions (b) and (c) hold together through entire bear cascades, so the '
                    'score may degenerate to "always enter on the next signal" in 2000-02 — that is the '
                    'main thing the run must measure.'),
    dict(name='D5_stabilized_relax', family=FAM,
         description='Required level discount drops 3% -> 1% at sessions where max_close(20)/'
                     'min_close(20) < 1.05 (trailing 20-session close range under 5%). Per-session '
                     'condition, no latch.',
         params=dict(range_window=20, range_max=1.05, relaxed_disc=0.01, discount=0.03),
         hypothesis='Post-crash V-bottoms stay volatile (range >> 5%) while post-bear bases tighten; '
                    'relaxing only in tight ranges should fix basing-period misses (QQQ 2003 type) '
                    'without loosening V-bottom discipline. Explicit measurement required: bear-market '
                    'false stability — 2000-02 had multi-week quiet ranges mid-decline; count relaxed '
                    'entries there and their P&L.'),
    dict(name='D7_confirm_near', family=FAM,
         description='Agent-proposed. Alt entry: close <= required level x 1.05 AND two consecutive '
                     'rising closes (c[i] > c[i-1] > c[i-2]).',
         params=dict(tolerance=1.05, up_closes=2, discount=0.03),
         hypothesis='The knife-edge misses happened because the market turned 1-2% above the level and '
                    'never looked back; two consecutive up closes within 5% of the level trade the last '
                    'few percent of discount for confirmation that the dip is ending. Unlike D2 this '
                    'does not reference the episode low, so it CAN fire when the low never undercut the '
                    'level — the honest version of the near-miss rescue. Risk: two up closes are cheap '
                    'in bear rallies; the 5% proximity gate (price near the old loss exit) must do the '
                    'filtering in 2000-02.'),
    dict(name='D7_signal_pressure', family=FAM,
         description='Agent-proposed. Alt entry: >= 10 previously blocked signal sessions in the '
                     'episode AND close <= required level x 1.03.',
         params=dict(min_blocked_signals=10, tolerance=1.03, discount=0.03),
         hypothesis='Each blocked 10%-signal session is a forgone baseline entry; ten of them with price '
                    'still within 3% of the level means a basing market where the discount demand is '
                    'costing real opportunities, not a cascade (cascades reach the level quickly). '
                    'Counting signal pressure rather than time distinguishes "market keeps offering the '
                    'dip" from mere calendar waiting. Risk: 2001-02 had long blocked stretches during '
                    'slow slides; the 3% proximity gate must prevent buying those.'),
    dict(name='D7_higher_low_base', family=FAM,
         description='Agent-proposed. Alt entry: no new episode-low close for >= 15 sessions '
                     '(i - min_close_i >= 15) AND close <= 0.90 x frozen ref high.',
         params=dict(floor_sessions=15, ref_high_cap=0.90, discount=0.03),
         hypothesis='A 15-session floor while price still sits >= 10% below the frozen reference high is '
                    'the signature of a post-decline base (QQQ spring 2003), where fixed discounts '
                    'never fill because the market refuses to go lower. Enter the base instead of '
                    'demanding a price the base will not give. Risk: multi-month bear rallies (Oct 2001 '
                    '- Jan 2002) also print 15-session floors well below the ref high; this config '
                    'will buy some of them — the run must price that cost.'),
    dict(name='D7_fresh_leg', family=FAM,
         description='Agent-proposed. Alt entry: episode max close >= 1.08 x loss exit AND close <= '
                     '0.92 x episode max close (post-exit rebound, then a fresh 8% decline from the '
                     'post-exit high).',
         params=dict(rebound_min=1.08, fresh_dip=0.92, discount=0.03),
         hypothesis='If price rebounded 8%+ above the loss exit and then fell 8% from that recovery '
                    'high, the market has started a NEW correction; holding the trader hostage to the '
                    'old episode\'s level conflates two different declines. This re-admits entries on '
                    'fresh legs at prices near (not necessarily below) the old exit. Risk: in 2000-02 '
                    'every bear rally was followed by a fresh leg DOWN that kept falling — this may '
                    'systematically buy the second leg of cascades; the bear-window table decides.'),
    dict(name='D7_tiny_loss_exit_anchor', family=FAM,
         description='Agent-proposed. Alt entry: |episode arming net loss| < $2,000 AND close <= the '
                     'frozen loss-exit price (0% discount, but never higher than where we sold).',
         params=dict(max_abs_loss=2000.0, anchor='loss_exit', discount_alt=0.0, discount=0.03),
         hypothesis='A -$143 loss currently imposes the same 3% restriction as a -$20k loss, which is '
                    'what blocked the +$28k VGT 2023-01 winner. Requiring only "at or below the exit" '
                    'after trivial losses preserves such recoveries while still refusing to pay up, and '
                    'leaves material-loss episodes untouched. Severity scaling belongs to Families A/B; '
                    'this is the minimal Family-D path version targeting the small-loss-trigger failure '
                    'mechanism directly. Risk: tiny losses cluster at regime tops (financing-only '
                    'exits), where re-entering at the exit price rebuys weakness early in declines.'),
]

if __name__ == '__main__':
    have = registry.registered_names(HERE)
    new = [e for e in ENTRIES if e['name'] not in have]
    if new:
        registry.register(HERE, new)
    print(f'registered {len(new)} new entries ({len(have)} already present) -> {HERE / "registry.jsonl"}')
