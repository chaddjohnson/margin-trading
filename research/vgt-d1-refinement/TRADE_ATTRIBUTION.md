# Trade attribution: what each candidate changes relative to D1

Source: `results/finalists/finalists.md` §5–8 (per-candidate trade lists with stop-activation columns, episode
attribution, differences from D1) and `results/baseline/baseline.md` §4. "Preserved" = same entry minute, fill price
and exit; "altered" = same entry, different exit; "gained" / "lost" = entries only one of the two makes.

## 1. D1's twenty trades

| # | Path | Entry | Exit | Reason | Net | Episode | Stop first active |
|---|---|---|---|---|---:|---|---|
| 1 | deep | 2018-12-21 160.42 | 2019-05-13 200.02 | trailing stop | +$20,375 | 2018 Q4 → 2019 | 2019-01-18 |
| 2 | continuation | 2019-08-05 203.65 | 2020-02-24 252.18 | trailing stop gap | +$17,713 | 2019 | 2019-11-04 |
| 3 | continuation | 2020-02-28 226.94 | 2020-03-06 232.86 | trailing stop | +$2,398 | 2020 | 2020-03-03 |
| 4 | deep | 2020-03-12 205.22 | 2020-03-20 198.64 | maximum hold | −$3,447 | 2020 | never |
| 5 | deep | 2020-03-23 185.73 | 2020-04-01 203.18 | trailing stop | +$9,125 | 2020 | 2020-03-25 |
| 6 | deep | 2020-04-02 202.36 | 2020-09-04 315.87 | trailing stop | **+$51,420** | 2020 | 2020-04-07 |
| 7 | continuation | 2020-10-28 304.01 | 2021-02-23 354.79 | trailing stop | +$13,147 | 2020 | 2020-11-10 |
| 8 | continuation | 2021-03-05 337.17 | 2021-05-11 355.50 | trailing stop gap | +$3,419 | other | 2021-03-17 (off on 2021-04-05) |
| 9 | deep | 2022-03-14 367.27 | 2022-04-07 398.20 | trailing stop | +$7,698 | 2022 bear | 2022-03-18 |
| 10 | continuation | 2022-04-26 366.26 | 2022-05-06 363.42 | maximum hold | −$1,077 | 2022 bear | never |
| 11 | deep | 2022-05-12 332.71 | 2022-06-10 342.66 | trailing stop | +$2,116 | 2022 bear | 2022-05-31 |
| 12 | deep | 2022-06-13 328.51 | 2022-06-21 325.72 | maximum hold | −$1,092 | 2022 bear | never |
| 13 | deep | 2022-06-22 324.92 | 2022-07-01 326.24 | maximum hold | +$135 | 2022 bear | never |
| 14 | deep | 2022-07-05 322.29 | 2022-08-26 363.01 | trailing stop | +$11,068 | 2022 bear | 2022-07-21 |
| 15 | continuation | 2022-09-16 329.27 | 2022-09-26 319.77 | maximum hold | −$3,187 | 2022 bear | never |
| 16 | deep | 2022-10-10 306.40 | 2022-11-03 310.69 | trailing stop | +$676 | 2022 bear | 2022-10-31 |
| 17 | deep | 2022-11-04 306.91 | 2022-12-15 331.37 | trailing stop | +$6,736 | 2022 bear | 2022-11-11 |
| 18 | deep | 2025-04-04 491.58 | 2025-04-10 498.62 | trailing stop | +$1,252 | 2025 | 2025-04-10 |
| 19 | deep | 2025-04-11 507.00 | 2025-04-21 497.68 | maximum hold | −$2,141 | 2025 | never |
| 20 | deep | 2025-04-22 497.19 | open (755.49) | — | +$46,709 | 2025 | 2025-04-25 |

Winners ≥ $10,000: 1, 2, 6, 7, 14, 20 (together $160,432 of the $183,044). Losers: 4, 10, 12, 15, 19 (−$10,944), all
hold-day exits with the stop never active. By episode: 2018 Q4 → 2019 +$38,088 (2), 2020 +$75,883 (5), 2021
+$3,419 (1), 2022 bear +$23,074 (9), 2023 none, 2025 +$45,821 (3). Drawdown driver: the 2020 selloff,
2020-02-19 → 2020-03-18 (trade 2's open gain evaporating into trade 4), $19,331 minute-sampled.

## 2. Preserved / altered / gained / lost, by candidate

| Candidate | Preserved | Altered | Gained (net) | Lost (D1 net) | Major winners lost or cut | Why |
|---|---:|---:|---|---|---|---|
| Set 2 | 14 | 0 | 0 | 6 (+$32,413) | #2, #7 | no continuation window |
| D3 (P 7%) | 14 | 0 | 6 (+$26,313) | 6 (+$32,413) | #2 (replaced by 2019-06-03 +$5,633), #7 (replaced by 2020-09-21 +$4,213) | arms on 7% pullbacks: earlier, weaker re-entries; gains 2023-03-13 +$19,542 and 2023-09-21 −$451 |
| A1-p86 | 18 | 0 | 2 (+$1,120) | 2 (+$1,321) | none | the 8.6% pullback is reached a session earlier (armed 2020-02-27): the 2020-02-28 fill is at 09:31 for 226.02 instead of 09:32 for 226.94 (+$2,816 vs +$2,398); the 2022-04-26 setup arms earlier in the session and fills at 11:23 for 368.56 instead of 15:45 for 366.26 (−$1,696 vs −$1,077) |
| A1-p92w69 | 17 | 0 | 5 (+$31,234) | 3 (+$24,265) | #7 replaced by the same session at another minute (+$13,623) | 2021-05-12 → 2021-10-01 +$8,751 instead of #8; 2022-01-10 +$51, 2022-01-24 +$2,436 and 2022-03-08 +$6,372 instead of #9 |
| A1-p89w169 | 18 | 0 | 6 (+$10,712) | 2 (+$10,096) | none | the 2020-02-28 fill a minute earlier (+$2,816 vs +$2,398); the 169-session window adds 2022-01-10 (+$51), 2022-01-24 (+$2,436), 2022-03-08 (+$6,372, displacing the 2022-03-14 deep trade +$7,698), 2023-08-17 (+$213) and 2023-09-26 (−$1,175) |
| A2-maxNet | 5 | 0 | 16 (+$134,234) | 15 (+$121,470) | #1, #2, #7, #20 replaced by entries minutes or days apart | X 23.8% / L 62 / Y 0.2% re-time every deep arming; the same episodes, +$12,764 in all |
| A2-lowDd | 0 | 0 | 19 (+$172,035) | 20 (+$183,044) | all six replaced | Y 0.8% shifts every fill; one more 2022 loser (4), −$11,009 |
| B-A 8%, B-B, B-C 16.3% | 20 | 0 | 0 | 0 | none | identical |
| B-A 9.5% | 15 | 2 | 0 | 3 (+$51,304) | #20 absorbed | #16 rides to 2022-12-15 (+$6,162, absorbing #17); #18 stays open to the end (+$47,900, absorbing #19, #20); +$829 |
| B-C 10% | 18 | 1 | 1 (+$6,545) | 1 (+$9,125) | none | #4 hits the protective stop on 2020-03-18 at 184.70 (−$10,181); 2020-03-19 re-entry +$6,545 displaces #5; −$9,313 |
| B-D | 16 | 4 | 4 (−$3,551) | 0 | none | #4 gapped out 2020-03-16 (−$5,944), #11 stopped 2022-05-20 (−$943), #18 gapped out 2025-04-07 at 451.00 (−$7,029), #19 gap (−$2,191); re-entries −$2,684, −$1,690, +$865, −$42; −$17,438 |
| C3-always10 | 20 | 0 | 21 (−$448) | 0 | none | D1 intact; the extra path adds 6 winners and 15 losers, DD $23,967 |
| C3-swing120 | 15 | 0 | 13 (+$13,755) | 5 (+$32,117) | #1 displaced (the swing path was long on 2018-12-21) | −$18,362 |
| C1-shipped / C2-shipped | 0 | 0–1 | 31–32 | 19–20 | all | different architectures; C2-shipped's 32 trades (26 winners) share none of D1's entries |

## 3. Retained and missed major winners, per candidate

| Candidate | #1 2018-12-21 +$20,375 | #2 2019-08-05 +$17,713 | #6 2020-04-02 +$51,420 | #7 2020-10-28 +$13,147 | #14 2022-07-05 +$11,068 | #20 2025-04-22 +$46,709 |
|---|---|---|---|---|---|---|
| D1, B-A-8, B-B, B-C-16.3, A1-p86, A1-p89w169, B-C-10, B-D, C3-always10 | kept | kept | kept | kept | kept | kept |
| A1-p92w69 | kept | kept | kept | same session, other minute (+$13,623) | kept | kept |
| B-A-9.5 | kept | kept | kept | kept | kept | absorbed into the open 2025-04-04 trade (+$47,900) |
| A2-maxNet | re-timed | re-timed | kept | re-timed | kept | re-timed |
| D3 | kept | lost (+$5,633 instead) | kept | lost (+$4,213 instead) | kept | kept |
| Set 2 | kept | lost | kept | lost | kept | kept |
| C3-swing120 | lost | kept | kept | kept | kept | kept |
| C1, C2 | — | — | — | — | — | — |

## 4. Losers and drawdown drivers

- D1's five losers are all hold-day exits of positions whose stop never became eligible; no stop design turns them
  into smaller losses (B-C and B-D make #4 larger: −$10,181 and −$5,944 vs −$3,447). The 2022 continuation losers (#10,
  #15) are the price of the mechanism: every A1 cell in the 8.5–9.4% band carries them.
- The $19,331 drawdown is the 2020 selloff for D1 and for every D1-family candidate; A1-p86 and A1-p89w169 trim it to
  $18,990 through the lower 2020-02-28 fill (226.02 instead of 226.94); A2-lowDd to $19,191. The structural alternatives raise it: B-C
  $24,077 and B-D $22,933 (both in March 2020), C3-always10 $23,967, the no-dip designs $26–34k (2022 strings of
  losses) except C2-shipped ($16,706, a 4% stop).
- Leave-one-recovery-out (`finalists.md` §5): without 2020, D1 nets $110,401 (Set 2 $93,533); without 2019 $144,956;
  without 2022 $159,970; without 2025 $137,223. No candidate depends on 2023 except D3 (+$19,542), T2 (+$29,374) and
  the no-dip designs (+$16k to +$43k), all inspected events. The best single trade is 26–31% of the net for every
  D1-family candidate, 12% for C2-shipped (26 small winners).
