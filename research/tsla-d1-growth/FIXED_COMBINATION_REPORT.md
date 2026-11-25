# Fixed D1 + Growth combination (arm C)

**What it is.** No search. At each cutoff, every pair of arm D's frozen finalists (≤ 3: primary, robust-profit and
balanced roles; `DF1–DF3`) and arm G's (`GF1–GF3`) is run with both vectors unchanged in the one $100,000 slot on the
common TSLA chronology. D1 decides first at a shared instant, and nobody preempts an open lot. The pairs are qualified
with the same gates Q1–Q6 (Q6: both families funded), and NL0's original rule picks the primary pair.

**Development.** Qualified pairs: C19 5 of 6, C21 2 of 9, C23 1 of 6 (most failures were Q3, the confirmation p90
drawdown; at C23 also Q2 and Q5). Two individually qualified strategies often do not make a qualified pair: their
drawdowns can stack in one slot. The selected pair was never the two primaries together:

| Cutoff | Primary pair | Centre net / DD | D1 part (training lots, net) | Growth part |
|---|---|---:|---:|---:|
| C19 | DF1 × GF3 (D primary × G balanced) | $242,090 / $15,892 | 20 lots, $210,046 (identical to arm D's primary) | 4 lots, $32,044 at the cutoff (one still open) |
| C21 | DF2 × GF1 (D robust × G primary) | $329,170 / $32,292 | 29 lots, $141,269 | 6 lots, $187,901 |
| C23 | DF3 × GF2 (D balanced × G robust) | $403,641 / $32,506 | 34 lots, $137,757 | 13 lots, $265,884 |
| C24 | DF1 × GF3 (D primary × G balanced) | $498,120 / $26,288 | 47 lots, $263,023 (arm D's primary alone: 50 lots, $319,654) | 22 lots, $235,097 (arm G's balanced role alone: 28 lots, $311,583) |

At C24, 1 of 9 pairs qualified. The other eight failed Q3 (8), Q2 (3) and Q5 (3). In development the qualified pair
earned $133,117 less than its two parts alone ($631,237): Growth held the slot when D1 signalled 3 times, and D1 held it
when Growth signalled 6 times.

**Displacement on the folds.** In 2020–2021 the C19 pair's Growth lots occupied the slot when D1 signalled. Its D1 made 11
lots and $354, against 14 lots and $20,368 for the same D1 vector alone in arm D. The Growth side made $36,108 on the 9 lots it
entered, plus $9,003 on the lot carried from 2019 (most of it already sold before the cutoff). The C21 pair's Growth side (G's C21 primary) never entered in
2022–2023, so the pair was its D1 side alone (−$11,309). In 2024 the C23 pair lost −$7,567: a D1 stop of −$15,305, and
Growth +$7,737 on four lots.

**Chronology (the binding test).** Chained: +$45,465, −$11,309, −$7,567 = **$26,589 with a $61,092 drawdown —
unsupported**. Out of sample the fixed pair did worse than the better of its two standalone parts in 2022–2023 and in
2024. It deepened the 2024 drawdown ($37,608 reset, against $11,051 for D and $26,796 for G). The folds show no
combination benefit.

**C24 comparison (PROTOCOL §12, development, C24).** Against the better standalone primary (G's, $340,913), the pair is
a type-P material improvement:
- +$157,207 centre net;
- +$83,324 confirmation robust net;
- −$2,367 centre DD;
- −$116 confirmation p90 DD.

Replication does not apply (fixed pairs, no seeds).

**Validation (once, retrospective).** +$71, reset DD $25,953, whole-run DD $26,288: V1–V3 pass, by $71. The two sides
never collided in 2025–2026, so the pair is exactly arm D's primary (−$8,979) plus arm G's balanced role (+$9,050).

**Determination for C: development-qualified, no chronological support: not deployment-qualified without an explicit
user decision** (omitted from the sealed outcome's list by the join defect, `AMENDMENTS.md` D1). In development the pair
looks much better than either part. Out of sample, on the folds and on the validation, it never beat the better part.

---

_Sections A–I below are generated from the sealed records by `tools/tsla-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

Arm C is never searched: at each cutoff it pairs arm D’s and arm G’s finalists (primary, robust-profit, balanced; ≤ 3 × 3), vectors unchanged, and qualifies the pairs with the joint instrument.

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | fixed | 6 | 5 | Q3 1 | — |
| C21 | fixed | 9 | 2 | Q3 7 | — |
| C23 | fixed | 6 | 1 | Q3 5, Q2 2, Q5 2 | — |
| C24 | fixed | 9 | 1 | Q3 8, Q2 3, Q5 3 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | C | 6 / 5 | `C19/C/pair DF1×GF3` | $242,090 | $15,892 | 24 | $182,639 / $24,157 | $161,130 / $24,329 | yes |
| C21 | C | 9 / 2 | `C21/C/pair DF2×GF1` | $329,170 | $32,292 | 35 | $247,993 / $35,579 | $224,291 / $34,910 | yes |
| C23 | C | 6 / 1 | `C23/C/pair DF3×GF2` | $403,641 | $32,506 | 47 | $364,832 / $32,506 | $342,107 / $32,506 | yes |
| C24 | C | 9 / 1 | `C24/C/pair DF1×GF3` | $498,120 | $26,288 | 69 | $322,585 / $33,064 | $298,234 / $32,456 | yes |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/C/pair DF2×GF3` | `C19/C/pair DF2×GF3` | `C19/C/pair DF2×GF3` |
| C21 | `C21/C/pair DF2×GF3` | `C21/C/pair DF2×GF3` | `C21/C/pair DF2×GF3` |
| C23 | `C23/C/pair DF3×GF2` | `C23/C/pair DF3×GF2` | `C23/C/pair DF3×GF2` |
| C24 | `C24/C/pair DF1×GF3` | `C24/C/pair DF1×GF3` | `C24/C/pair DF1×GF3` |

- C19: 6 pairs — `C19/C/pair DF1×GF1` = D1 `C19/D/refine/D.B1/R102#1 profit` × Growth `C19/G/refine/G.h1.s1/R102#1 profit`; `C19/C/pair DF1×GF2` = D1 `C19/D/refine/D.B1/R102#1 profit` × Growth `C19/G/refine/G.h0.s1/R103#2 robust`; `C19/C/pair DF1×GF3` = D1 `C19/D/refine/D.B1/R102#1 profit` × Growth `C19/G/refine/G.h1.s1/R104#3 balanced`; `C19/C/pair DF2×GF1` = D1 `C19/D/refine/D.B1/R103#2 robust` × Growth `C19/G/refine/G.h1.s1/R102#1 profit`; `C19/C/pair DF2×GF2` = D1 `C19/D/refine/D.B1/R103#2 robust` × Growth `C19/G/refine/G.h0.s1/R103#2 robust`; `C19/C/pair DF2×GF3` = D1 `C19/D/refine/D.B1/R103#2 robust` × Growth `C19/G/refine/G.h1.s1/R104#3 balanced`
- C21: 9 pairs — `C21/C/pair DF1×GF1` = D1 `C21/D/refine/D.C1/R102#1 profit` × Growth `C21/G/refine/G.h1.s1/R101#1 profit`; `C21/C/pair DF1×GF2` = D1 `C21/D/refine/D.C1/R102#1 profit` × Growth `C21/G/refine/G.h0.s0/R104#2 robust`; `C21/C/pair DF1×GF3` = D1 `C21/D/refine/D.C1/R102#1 profit` × Growth `C21/G/refine/G.h0.s0/R103#3 balanced`; `C21/C/pair DF2×GF1` = D1 `C21/D/refine/D.C1/R102#2 robust` × Growth `C21/G/refine/G.h1.s1/R101#1 profit`; `C21/C/pair DF2×GF2` = D1 `C21/D/refine/D.C1/R102#2 robust` × Growth `C21/G/refine/G.h0.s0/R104#2 robust`; `C21/C/pair DF2×GF3` = D1 `C21/D/refine/D.C1/R102#2 robust` × Growth `C21/G/refine/G.h0.s0/R103#3 balanced`; `C21/C/pair DF3×GF1` = D1 `C21/D/refine/D.D1/R103#3 balanced` × Growth `C21/G/refine/G.h1.s1/R101#1 profit`; `C21/C/pair DF3×GF2` = D1 `C21/D/refine/D.D1/R103#3 balanced` × Growth `C21/G/refine/G.h0.s0/R104#2 robust`; `C21/C/pair DF3×GF3` = D1 `C21/D/refine/D.D1/R103#3 balanced` × Growth `C21/G/refine/G.h0.s0/R103#3 balanced`
- C23: 6 pairs — `C23/C/pair DF1×GF1` = D1 `C23/D/refine/D.D1/R102#1 profit` × Growth `C23/G/refine/G.h1.s1/R103#1 profit`; `C23/C/pair DF1×GF2` = D1 `C23/D/refine/D.D1/R102#1 profit` × Growth `C23/G/refine/G.h0.s1/R102#2 robust`; `C23/C/pair DF2×GF1` = D1 `C23/D/refine/D.A1/R104#2 robust` × Growth `C23/G/refine/G.h1.s1/R103#1 profit`; `C23/C/pair DF2×GF2` = D1 `C23/D/refine/D.A1/R104#2 robust` × Growth `C23/G/refine/G.h0.s1/R102#2 robust`; `C23/C/pair DF3×GF1` = D1 `C23/D/refine/D.B1/R101#2 robust` × Growth `C23/G/refine/G.h1.s1/R103#1 profit`; `C23/C/pair DF3×GF2` = D1 `C23/D/refine/D.B1/R101#2 robust` × Growth `C23/G/refine/G.h0.s1/R102#2 robust`
- C24: 9 pairs — `C24/C/pair DF1×GF1` = D1 `C24/D/refine/D.B1/R103#1 profit` × Growth `C24/G/refine/G.h2.s1/R101#1 profit`; `C24/C/pair DF1×GF2` = D1 `C24/D/refine/D.B1/R103#1 profit` × Growth `C24/G/refine/G.h2.s1/R102#2 robust`; `C24/C/pair DF1×GF3` = D1 `C24/D/refine/D.B1/R103#1 profit` × Growth `C24/G/refine/G.h2.s1/R101#3 balanced`; `C24/C/pair DF2×GF1` = D1 `C24/D/refine/D.C1/R103#2 robust` × Growth `C24/G/refine/G.h2.s1/R101#1 profit`; `C24/C/pair DF2×GF2` = D1 `C24/D/refine/D.C1/R103#2 robust` × Growth `C24/G/refine/G.h2.s1/R102#2 robust`; `C24/C/pair DF2×GF3` = D1 `C24/D/refine/D.C1/R103#2 robust` × Growth `C24/G/refine/G.h2.s1/R101#3 balanced`; `C24/C/pair DF3×GF1` = D1 `C24/D/refine/D.C1/R102#2 robust` × Growth `C24/G/refine/G.h2.s1/R101#1 profit`; `C24/C/pair DF3×GF2` = D1 `C24/D/refine/D.C1/R102#2 robust` × Growth `C24/G/refine/G.h2.s1/R102#2 robust`; `C24/C/pair DF3×GF3` = D1 `C24/D/refine/D.C1/R102#2 robust` × Growth `C24/G/refine/G.h2.s1/R101#3 balanced`

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/C/pair DF1×GF3` | primary C/original; role C/actual-profit | $242,090 | $45,465 | $34,558 | $34,558 | 20 (9 losing) | −$24,507 | 193 / 256 (training 2.3 %) |
| C19 | `C19/C/pair DF2×GF3` | role C/robust-profit; role C/balanced; role C/lower-drawdown | $220,629 | $36,521 | $37,411 | $37,411 | 20 (9 losing) | −$22,010 | 256 / 256 (training 0.0 %) |
| C21 | `C21/C/pair DF2×GF1` | primary C/original; role C/actual-profit | $329,170 | −$11,309 | $17,561 | $32,292 | 5 (3 losing) | −$5,117 | 3 / 256 (training 11.3 %) |
| C21 | `C21/C/pair DF2×GF3` | role C/robust-profit; role C/balanced; role C/lower-drawdown | $306,555 | −$7,816 | $20,223 | $32,292 | 6 (3 losing) | −$7,779 | 137 / 256 (training 4.3 %) |
| C23 | `C23/C/pair DF3×GF2` | primary C/original; role C/actual-profit; role C/robust-profit; role C/balanced; role C/lower-drawdown | $403,641 | −$7,567 | $37,608 | $44,973 | 5 (3 losing) | −$15,305 | 113 / 256 (training 6.6 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| C/original | `C19/C/pair DF1×GF3` → `C21/C/pair DF2×GF1` → `C23/C/pair DF3×GF2` | $26,589 | $61,092 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| C: role robust-profit (descriptive) | `C19/C/pair DF2×GF3` → `C21/C/pair DF2×GF3` → `C23/C/pair DF3×GF2` | $21,138 | $59,107 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| C: role balanced (descriptive) | `C19/C/pair DF2×GF3` → `C21/C/pair DF2×GF3` → `C23/C/pair DF3×GF2` | $21,138 | $59,107 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| C: role lower-drawdown (descriptive) | `C19/C/pair DF2×GF3` → `C21/C/pair DF2×GF3` → `C23/C/pair DF3×GF2` | $21,138 | $59,107 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist | `C24/C/pair DF1×GF3` | primary C; role C/robust-profit; role C/balanced; role C/lower-drawdown | pass | $498,119.50 | $531,863 | $26,581 | $7,162 | $26,287.97 (26.3 %) | 69 48/21 | $71.05 | $25,953.17 | $498,190.55 | $26,287.97 | ✓ ✓ ✓ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF1×GF3` | $26,288 | $11,197 / $11,197 | $16,246 / $16,295 | −$11,197 | −$11,197 | 30.1 % | 0.0 % | 22.0 % | $263,023 / $235,097 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF1×GF3` | $357,589 / $298,234 / $327,911 | $32,456 / $33,809 | $34,421 / $40,607 | 2.3 % (1.2 %–4.4 %) | $322,585 / $33,064 | $490,699 / $26,398 | $482,085 / $27,064 | $490,870 | $488,108 / $26,864 | $479,815 / $26,288 |

### Causal removals (development centre; the other book switched off)

| Label | Without D1: net / DD | Without Growth: net / DD | Participation (funded principal-days share) |
|---|---:|---:|---:|
| `C24/C/pair DF1×GF3` | $311,583 / $28,655 | $319,654 / $25,587 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF1×GF3` | $5,277 | $22,155 | $19,421 | $29,173 | $210,993 | $107,489 | −$7,509 | $53,283 | $57,837 | $7,143 | −$7,072 |

### Parameter vectors

- `C24/C/pair DF1×GF3` — cell `C.B1.h2.s1`
  - D1·TSLA: targetPercentChange 285, trailingBuyPercentage 12, trailingStopPercentage 70, maximumHoldDays 11, tickWindowSize 59, intradayLossBuffer 40, pullback 39, continuationWindow 166; controls {"d":58,"k":1,"r":500,"c":214}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 10, breakoutSlopeComparisonSessions 100, breakoutPriorHighSessions 82, trendFilterEnabled false, drawdownRecoveryGateEnabled false, trailingStopPercent 5.9, maximumHoldEnabled true, maximumHoldDays 27, intradayLossBufferEnabled true, intradayLossBufferPercent 1.7, initialStopEnabled true, initialStopAtrSessions 23, initialStopAtrMultiple 1.5, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 49, uptrendSmaBars 96, uptrendSlopeBars 7, uptrendMinimumRisePercent 1, pullbackMinimumPercent 1.2, pullbackMaximumPercent 10.6, recoveryPercent 2.6

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/C/pair DF1×GF3` | C19 primary C | $364,245.16 | 82 | 63.0 % | 12.5 / 79 | 33.2 % (903 / 2,723) | $652,730 / $27,898 | −$24,507 | Growth refused (slot occupied) ← occupant D1: 6; D1 refused (slot occupied) ← occupant Growth: 3 | $43,381 / $47,155 / $62,254 |
| `C21/C/pair DF2×GF1` | C21 primary C | $379,474.87 | 55 | 65.5 % | 8 / 69 | 16.6 % (452 / 2,723) | $479,344 / $25,375 | −$10,889 | Growth refused (slot occupied) ← occupant D1: 4; D1 refused (slot occupied) ← occupant Growth: 4 | $33,167 / $37,623 / $55,445 |
| `C23/C/pair DF3×GF2` | C23 primary C | $382,557.83 | 58 | 74.1 % | 10 / 90 | 22.1 % (602 / 2,723) | $536,583 / $25,679 | −$15,305 | Growth refused (slot occupied) ← occupant D1: 1 | $36,478 / $40,713 / $57,652 |
| `C24/C/pair DF1×GF3` | C24 primary C; C24 role C/robust-profit; C24 role C/balanced; C24 role C/lower-drawdown | $498,190.55 | 75 | 66.7 % | 10 / 64 | 24.5 % (666 / 2,723) | $656,306 / $25,679 | −$11,197 | D1 refused (slot occupied) ← occupant Growth: 3; Growth refused (slot occupied) ← occupant D1: 6 | $33,398 / $37,838 / $55,599 |

Worst closed trades of each subject (net after costs and interest):

- `C19/C/pair DF1×GF3`: D1·TSLA 2021-02-22 → 2021-03-05 (protective stop, 11 d) −$24,507.37; D1·TSLA 2020-03-06 → 2020-03-13 (protective stop, 7 d) −$24,386.82; D1·TSLA 2022-05-10 → 2022-05-23 (maximum hold, 13 d) −$18,860.40; D1·TSLA 2025-02-25 → 2025-03-10 (maximum hold, 13 d) −$17,515.47; D1·TSLA 2022-10-31 → 2022-11-14 (maximum hold, 14 d) −$15,676.66
  - largest giveback: D1·TSLA 2021-02-22 → 2021-03-05 best mark $3,390.19, final −$24,507.37 (giveback $27,897.56)
  - open at 2026-10-30: D1·TSLA from 2026-10-16 marked $12,560.89
- `C21/C/pair DF2×GF1`: D1·TSLA 2020-02-27 → 2020-02-28 (protective stop gap, 1 d) −$10,889.43; D1·TSLA 2024-07-22 → 2024-07-24 (protective stop gap, 2 d) −$9,651.19; Growth·TSLA 2025-12-16 → 2026-01-07 (maximum hold, 22 d) −$8,939.87; D1·TSLA 2017-10-03 → 2017-10-25 (protective stop, 22 d) −$5,358.37; D1·TSLA 2023-10-04 → 2023-10-18 (protective stop, 14 d) −$5,117.27
  - largest giveback: D1·TSLA 2020-01-28 → 2020-02-05 best mark $69,300.78, final $43,925.33 (giveback $25,375.45)
- `C23/C/pair DF3×GF2`: D1·TSLA 2024-01-16 → 2024-01-25 (protective stop gap, 9 d) −$15,304.65; Growth·TSLA 2025-12-16 → 2026-01-20 (initial stop, 35 d) −$11,581.25; D1·TSLA 2026-03-04 → 2026-03-27 (protective stop, 23 d) −$11,182.71; D1·TSLA 2022-02-03 → 2022-02-22 (protective stop, 19 d) −$11,062.16; D1·TSLA 2021-02-26 → 2021-03-04 (protective stop, 6 d) −$10,670.38
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C24/C/pair DF1×GF3`: Growth·TSLA 2024-07-17 → 2024-07-24 (initial stop gap, 7 d) −$11,197.02; D1·TSLA 2024-10-08 → 2024-10-11 (protective stop gap, 3 d) −$10,332.48; Growth·TSLA 2024-12-26 → 2024-12-27 (initial stop, 1 d) −$7,243.64; Growth·TSLA 2025-11-11 → 2025-11-13 (initial stop, 2 d) −$7,122.18; Growth·TSLA 2021-01-21 → 2021-01-29 (initial stop, 8 d) −$6,678.44
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 TSLA daily (Yahoo Finance, 2010-06-29 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/C/pair DF1×GF3` | B1 | 12 (calendar maximum hold) | 24.1 % | −$24,100 (2010-06-29) | −$16,474 | 0.0 % | 0.0 % below the stop () | −$27,364 (2020-03-10) | 0.0 % |
| `C21/C/pair DF2×GF1` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 4.6 % | −$15,904 (2015-08-10) | −$5,177 | 0.0 % | 11.3 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `C23/C/pair DF3×GF2` | B1 | 25 (calendar maximum hold) | 10.4 % | −$20,552 (2015-08-19) | −$10,400 | 0.0 % | 10.2 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |
| `C24/C/pair DF1×GF3` | B1 | 11 (calendar maximum hold) | 5.8 % | −$16,599 (2015-08-14) | −$5,802 | 0.0 % | 10.8 % below the stop (2015-08-24) | −$16,325 (2020-03-05) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF1×GF3` | small | 128 | $388,172 / $356,506 | $30,154 / $31,188 / $33,008 | $31,500 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/C/pair DF1×GF3` | wide | 128 | $318,621 / $232,747 | $36,656 / $39,304 / $49,107 | $41,230 | 25 (19.5 %; 13.6 %–27.2 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/C/pair DF1×GF3` | $242,090 | 0.9 % | Growth·TSLA from 2019-12-10: unrealized $2,236 (market value 0.123× the lot's principal) | trend exit 2020-02-27: lot net $23,367 at the cutoff (partial exits included) → final $32,370; change on the slice $9,003 | −$1,645 / −$5,459 / −$8,409 | −$4,306 / −$24,507 |
| C21 | `C21/C/pair DF2×GF1` | $329,170 | 0.0 % | none open | none open | −$2,388 / −$4,936 / −$10,889 | −$4,816 / −$5,117 |
| C23 | `C23/C/pair DF3×GF2` | $403,641 | 0.0 % | none open | none open | −$2,968 / −$9,091 / −$11,062 | −$10,547 / −$15,305 |
| C24 | `C24/C/pair DF1×GF3` | $498,120 | 0.0 % | none open | none open | −$2,977 / −$6,057 / −$11,197 | −$6,167 / −$7,122 |

