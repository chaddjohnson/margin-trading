# Recommendation

## Verdict: no change to the entry rule

**Keep entering at the −10% signal exactly as `allin-original.ts` does.** None of the 58 pre-specified entry rules, nor the composed two-stage rule, passed validation:

- every family's selection procedure lost to the baseline in the 2018–2022 walk-forward (ΔJ −$28k to −$81k);
- every frozen pick lost to the baseline on the untouched 2023–2026 holdout (ΔJ −$9k to −$65k);
- every pick's in-sample gain came from one 2016 trade;
- the picks are indistinguishable from random 0–5-day entry delays.

There is no ranked shortlist of changes, because nothing earned a place on one.

## Required summary table

Same-close research convention. "Best validated" = the family's frozen pick; **none validated**. Definitions in ENTRY_COMPARISON.md.

**Development 2014-01-02 → 2022-12-30 (in-sample; picks chosen here)**

<!-- table:summary_development_close -->
| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $72,993 | $42,644 | $23,723 | 30 | 57% (17/30) | 0/2 | 0 | 979 |
| B — Velocity gate: B_skipSlow_60 | $73,136 | $42,644 | $23,723 | 30 | 57% (17/30) | 0/2 | 0 | 978 |
| C — Deterioration gate: C_gate_accel_3 | $99,022 | $55,301 | $30,513 | 24 | 63% (15/24) | 0/2 | 2 | 1264 |
| D — Stabilization confirmation: D_upClose_rebound | $88,411 | $59,701 | $31,887 | 30 | 53% (16/30) | 0/2 | 0 | 1368 |
| E — Adaptive threshold: E_ret5_15_stab | $115,958 | $50,118 | $25,415 | 20 | 75% (15/20) | 0/2 | 3 | 1150 |
| F — Simple combination: F_accel_3+upClose | $110,537 | $59,400 | $27,760 | 28 | 64% (18/28) | 0/2 | 1 | 1360 |
<!-- /table -->

**Holdout 2023-01-03 → 2026-10-13 (out-of-sample, evaluated once)**

<!-- table:summary_holdout_close -->
| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $117,912 | $30,107 | $28,687 | 13 | 23% (3/13) | 0/1 | 0 | 680 |
| B — Velocity gate: B_skipSlow_60 | $58,812 | $21,427 | $28,687 | 11 | 27% (3/11) | 0/1 | 2 | 482 |
| C — Deterioration gate: C_gate_accel_3 | $47,807 | $13,441 | $23,163 | 8 | 25% (2/8) | 0/1 | 1 | 308 |
| D — Stabilization confirmation: D_upClose_rebound | $99,324 | $29,534 | $19,248 | 15 | 23% (3/13) | 0/1 | 0 | 671 |
| E — Adaptive threshold: E_ret5_15_stab | $105,136 | $25,858 | $28,753 | 10 | 30% (3/10) | 0/1 | 1 | 586 |
| F — Simple combination: F_accel_3+upClose | $91,217 | $21,849 | $17,801 | 10 | 30% (3/10) | 0/1 | 1 | 499 |
<!-- /table -->

Full rule specifications are in ENTRY_COMPARISON.md ("The rules"), with each pick's behaviour in the 2016, 2020, 2022 and 2025 declines. The executable next-open versions are there too; under them the picks lose to the baseline in the holdout by $21k–$63k of J.

## The best candidate against the baseline

`E_ret5_15_stab`: if the 5-session return at the first −10% close is ≤ −6%, require a −15% drawdown and two sessions without a new closing low; otherwise enter at −10%.

| | Net P&L vs A | Max MTM DD vs A | ΔJ |
|---|---:|---:|---:|
| Development, same-close (in-sample) | +$42,965 | +$1,692 | +$41,273 |
| Development, next open | | | −$29,395 |
| Walk-forward 2018–2022 (family procedure) | | | −$51,017 |
| Development without the 2016 episode | −$18,749 | | |
| Holdout, same-close | −$12,776 | +$66 | −$12,842 |
| Holdout, next open | | | −$21,194 |

Its whole development edge is one entry, on 2016-02-11, held to February 2018. Even with that edge, its development drawdown is slightly worse than A's.

## Established findings vs hypotheses

**Established (on this data):**

1. **Speed of the decline does not separate a short correction from a deep one.** 2/9 fast (≤15 sessions) and 1/6 slower first signals reached −20% within 40 sessions. The three severe crashes were fast (2020, velocity 4), medium (2022, 15) and slow-to-start (2025, 25). Rejecting fast declines (B_skipFast_15) gave up $69k of the $73k development profit and $28k of the $118k holdout profit.
2. **No indicator gives early warning at the first −10% close.** Acceleration, volume, volatility, VIX, cross-ETF proxies and failed-rally counts: none clears the unconditional rate in a way that holds out of sample. The features that rank sessions well (depth, distance below the 200-day average, broad proxy drawdown) describe declines that are already deep or old.
3. **Waiting for stabilization into a fast crash makes the first loss bigger.** In 2020 every deferral rule bought lower but before the bottom, and the unchanged 15-day exit sold it for −$17.6k to −$20.9k, against A's −$8.8k.
4. **Requiring a deeper discount mostly means missing trades.** A flat −15% or −20% threshold lost $37k–$101k of J in the holdout, with or without a stabilization requirement.
5. **The baseline already handles the brief's failure mode.** In all three severe episodes the first −10% trade lost between $1.5k and $9k (the maximum-hold exit), and the episode as a whole made money: +$44k, +$43k and +$35k. That came from cheaper re-entries under the 3% / 38% rules.
6. **P&L is dominated by which long hold an entry catches.** A one-session execution shift alone moves the baseline by $30k in 2014–2022. Entry-timing "improvements" of this size are indistinguishable from noise.

**Hypotheses (not established, untested out of sample):**

- High relative volume (≥2× the 20-day average) on the entry day marked mostly losing trades in development (10 of 18 losers, 2 of 12 winners). The holdout had only 2 flagged trades, and they were net profitable.
- D and F cut the holdout mark-to-market drawdown to about $18–19k from $29k, and E won on IWN's slow 2022–2023 grind. These would need a fresh, independent sample; on the existing data they came with lower profit or the opposite result elsewhere.

## Answers to the closing questions

1. **Rapid corrections vs prolonged bear markets.** The data cannot tell them apart at the first −10% close. VGT's 15 corrections since 2014 include fast declines that stopped at −10% to −14% (2018-02, 2020-09, 2026-06) and fast ones that went to −32% (2020-02). One reached −10% at medium speed and then took 201 sessions to reach −35% (2022). One reached −10% slowly and then crashed (2025). What distinguishes a prolonged bear market (falling far below the 200-day average, broad cross-ETF drawdowns, rolled-window signals months after the peak) is only visible once the bear market is already established.
2. **Early-warning indicators.** None with evidence that survives. With 3 severe episodes in 12 years, a reliable classifier cannot be built from VGT's own history.
3. **Enter at −10%, wait, require deeper, or skip?** Enter at −10% as now. Waiting for stabilization, requiring −15%/−20%, and skipping on velocity, acceleration, volume, volatility, VIX or breadth were all tested as precisely defined rules (ENTRY_COMPARISON.md). None was better out of sample, and most were materially worse.
4. **Best candidate vs baseline.** See the table above: +$41k J in-sample, −$13k J out-of-sample, negative under executable fills.
5. **What next.**
   - **Do not add any of these entry factors to the per-ticker Sobol/NSGA-II optimizer.** None showed an out-of-sample effect, and the multi-asset study already found that optimizer's in-sample gains don't carry forward. Adding dimensions would increase overfitting.
   - If downside in severe episodes is still the concern, the lever is **position management after entry**, not entry timing. For example, the size of the first −10% position, or the 15-day hold in a fast crash. That would be a different study, changing the rules this one held fixed.
   - To test regime ideas properly, get **more independent crashes**: a longer tech/Nasdaq-100 history back to the 1990s (2000–2002 and 2008 would add two long bear markets) and true constituent breadth. Pre-specify the rules again before looking.
   - **Account-level margin risk** needs account equity, other holdings and the broker's maintenance requirements (BASELINE_AUDIT.md). Until then, only financing cost and trading-book drawdown can be reported.
