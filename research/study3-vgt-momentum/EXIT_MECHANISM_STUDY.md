# Exit mechanism study (M2, brief §6)

**Status: descriptive.** Every run here is a fixed default configuration on the full 2017-01-03 → 2023-12-29 history
(sealed `results/records/diagnostics.json`; table `results/tables/diagnostics.md`). By design (`FIRST_PRINCIPLES_AND_HYPOTHESES.md` §5.5,
`PROTOCOL.md` §12), none of these results could change the frozen search template, so they explain the selected results rather than
produce new candidates. In-sample; one bull market with three declines.

## 1. Common entries, different exits (E02 financing-hurdle drift and E07 breakout acceptance at their defaults)

| Exit family (brief §6) | Config | E02 net | E02 minute DD | E02 2022 | E07 net | E07 minute DD | E07 2022 | Lots (E02/E07) |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 hard stop + fixed trailing | CX1 (= X1 = X6c = X8P): hard 8%, trail 10% | +$31,017 | $45,153 | −$10,718 | +$18,690 | $38,743 | −$16,810 | 10 / 12 |
| 2 volatility-scaled trailing | X2: 3·ATR20 clamped to [4%, 15%] + hard 8% | +$37,730 | **$19,320** | −$4,730 | +$25,977 | $28,946 | −$6,922 | 20 / 22 |
| 3 structural + emergency | X3: rising-floor break (θ 5%) + hard 10% | **+$86,081** | $32,797 | −$12,616 | **+$80,080** | $32,912 | −$23,490 | 5 / 6 |
| 4 two-layer | X4: catastrophic 15% + 50-session low close | +$47,557 | $29,725 | −$7,505 | +$35,773 | $37,189 | −$19,697 | 9 / 10 |
| 5 profit stages | X5a: break-even at +4%, trail 8% at +10%, 5% at +25% | +$50,089 | $27,556 | −$8,013 | +$46,756 | $34,802 | −$6,036 | 12 / 15 |
| 5b probation (M12) | X5b: 3% stop for 10 sessions, promote at +5% to a 12% trail | −$9,266 | $27,204 | −$1,300 | +$10,704 | $27,020 | −$4,095 | 65 / 56 |
| 6 time / progress | X6a maximum hold 60 sessions | +$18,724 | $39,862 | −$9,558 | +$15,834 | $33,745 | −$15,821 | 21 / 20 |
| 6 time / progress | X6b stall vs financing (20 sessions) | +$16,981 | $26,336 | −$6,895 | +$2,896 | $35,796 | −$14,265 | 27 / 29 |
| 8 trend damage only | CX2 (= X8T): 20-session low close + catastrophic 15% | +$26,737 | $25,457 | −$6,895 | +$9,709 | $38,925 | −$11,856 | 19 / 21 |
| 8 price OR trend | X8OR | +$27,095 | $25,457 | −$6,895 | +$10,067 | $38,568 | −$11,856 | 19 / 21 |
| 8 price AND trend | X8AND | +$41,213 | $35,025 | −$10,504 | +$36,453 | $28,613 | −$18,668 | 9 / 10 |
| own exit | OX: family own OUT + catastrophic 15% | +$85,240 | $31,787 | −$26,435 | +$9,709 | $38,925 | −$11,856 | 4 / 21 |
| hard stop only | HS: 8% below the fill | +$217,504 | $150,794 | −$124,029 | +$210,174 | $148,067 | −$121,858 | 1 / 1 |
| (7 renewable campaign) | re-entry rules: `REENTRY_AND_CAMPAIGN_ANALYSIS.md` | | | | | | | |

**Findings.**
- **Exit tightness dominates entry choice.** For both entries the slow structural exit X3 earned 2.8–4.3× the fixed
  trail CX1 at a lower drawdown. The reason is that tight price stops cut long advances into short trades that had to
  be re-bought higher. HS (no real exit) shows the other extreme: one lot held from 2017 earns +$217,504 with a
  $150,794 drawdown, the exposure-drift effect of `CHRONOLOGICAL_RESULTS.md` §4.
- **The volatility-scaled trail (X2) had the lowest drawdown for E02** ($19,320) and small 2022 losses for both, at
  moderate net. Crisis trace (brief §6.2, `diagnostics.json` `x2Traces`): in late 2018 and early 2020 the
  ATR-scaled distance sat at its 4% floor through the calm run-ups; the 2018 lot exited at that floor (2018-10-05 by
  stop, −$1,066) and the 2020 lot after it had widened to 5.7% (2020-02-24 at the opening gap, +$8,826 for E02). On 9 sessions of the 2020 lot the
  un-ratcheted level fell below the ratcheted one: volatility expansion would have widened the stop, but the ratchet
  held it. Neither crisis was held through, because the 4% floor makes X2 a tight trail in calm markets.
- **Profit-retention stages (X5a) did not cut the right tail here**: +$50,089 / +$46,756, between CX1 and X3; the
  largest lots kept most of their gains.
- **Probation (X5b, M12) failed**: a 3% initial stop is about two daily standard deviations for VGT, so most entries
  were stopped in probation (45 and 41 probation exits) and the 61 / 35 re-entries paid friction ($6,510 / $5,619).
- **Time and progress exits (X6a, X6b) lowered net** against CX1. The stall exit (X6b) reduced E02's drawdown to $26,336
  but exited healthy trends early. Financing drag was better controlled by being out of the market than by timing
  out of positions.
- **Price damage vs trend damage (X8).** For E02, trend damage alone (CX2) cut the drawdown of price damage alone
  (CX1) by 44%, at a lower net. "OR" behaved like trend-only (the 20-session low usually fires first). "AND" exited later
  and earned more, at a higher drawdown. For E07 "AND" was the best X8 variant on both measures (+$36,453, $28,613). The
  incremental contribution of combining the two is therefore positive only in the AND form, and only in-sample.

## 2. Common exits, different entries

The twelve entries at CX1 and CX2 are in `STANDALONE_DISCOVERY_AND_OPTIMIZATION.md` §2 (and `diagnostics.md` M2E). Under
the trend-damage exit CX2, E06 (calm advance) was best (+$55,249, minute DD $20,466); under the price exit CX1, E09
earned most (+$58,942) at the largest drawdown ($55,128) because it is almost always invested (exposure 0.96). Across
the twelve entries under one common exit, net ranged over about $50–60k (CX1 +$7,994 to +$58,942; CX2 −$4,809 to
+$55,249); changing the exit moved a single entry by up to $61k against CX1 (E07: X3 +$80,080 vs CX1 +$18,690) and by $95k
across all exits except HS (E02: X3 +$86,081 vs X5b −$9,266).

## 3. Implications (descriptive)

The exit that holds long through a bull market wins in-sample. That is the regime bet that lost in 2022 in the
chronological replay of the frozen procedure. No exit tested here avoided a 2022 loss on either entry (only the no-re-entry rules R1/R5 on E02 sat
out 2022 entirely — `REENTRY_AND_CAMPAIGN_ANALYSIS.md`). The smallest 2022
losses came from tight stops (X5b −$1,300, X2 −$4,730), which also gave the smallest gains in the advances.
