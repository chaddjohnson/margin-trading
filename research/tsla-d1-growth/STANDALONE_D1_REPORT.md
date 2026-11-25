# Standalone D1·TSLA (arm D)

**What it is.** D1 alone on TSLA (Growth off) in the one $100,000 slot: Study 8's D1 box (families A–D) with Assignment
2's control families, the decline gate OFF or ON — 8 protected cells with identical budgets, 4 base replicates per cell,
NL0's lanes, then 4 informed refinement lanes in up to 8 cells. Its finalists also feed arm C (pairs) and arm S (the
frozen D1).

**Development.** Every cutoff produced a qualified primary with a large in-sample net: C19 `D.B1/R102#1` $210,046 / DD
$15,892 (2016–2019); C21 `D.C1/R102#1` $297,254 / $25,375 (2016–2021); C23 `D.D1/R102#1` $235,330 / $20,969 (2016–2023).
C24 (2016–2024, the final selection): `D.B1/R103#1` **$319,654 / $25,587** (50 lots, 34 winners; protective stop 5.8 %
of entry, decline gate on), with 76.5 % of its development net from lots entered in 2020–2021. Roles: robust-profit
`D.C1/R103#2` $200,866 / $26,049, balanced `D.C1/R102#2` $191,135 / $22,652, lower-drawdown `D.B1/R101#6` $77,732 /
$13,189. 150 of 155 members qualified, and again only the 4 gate-ON cells had a feasible fit.

**Structure.** Once 2020–2021 entered the training data (C21 and later), **only the decline-gate-ON cells had any feasible
fit** (D.A1, D.B1, D.C1, D.D1): no gate-OFF fit met the search's P0 constraint (centre and neighbourhood drawdown
≤ $35,000 with a positive net) in any replicate. The report-only
D-A procedure (family A without the gate, the plain original D1 structure) therefore had no qualified candidate at C21
or C23. The primary changed family at every fold (B → C → D), and seeds disagreed materially within a cell (across replicates, a
typical cell's best feasible net varied by 31–43 % of its median; `SEARCH_AND_CONVERGENCE_REPORT.md` §D).

**Chronology (the binding test).** Chained out of sample, D's procedure earned +$20,368 (2020–2021), −$7,376 (2022–2023)
and +$12,231 (2024): **$25,172 over five years with a $40,170 drawdown — unsupported** (drawdown > $35,000). The
drawdown is realized: two D1 protective stops of about −$24,400 each (2020-03-06 → 03-13 and 2021-02-22 → 03-05), much
deeper than any training lot (worst training lot MAE −$8,409 at C19). Training robustness did not carry over: 243 of the
C19 primary's 256 confirmation draws breached $35,000 on 2020–2021, against 2.3 % on its training data.

**Reading.** D1 on TSLA is a small-edge, stop-dominated strategy whose in-sample profit (≈ $30,000–$52,000 a year of
data) shrank to ≈ $5,000 a year out of sample, with single-lot losses near a quarter of the slot. Its stop distances admit
−24 % lots on a stock that gaps through them.

**Validation (2025-01-02 → 2026-10-30, once, retrospective).** −$8,979 on 2 lots: a −$2,934 maximum-hold exit (February
2025) and a −$6,045 protective stop (July 2026). Reset DD $13,924, whole-run DD $27,742. V1 fails. The three roles also
lost, $6,544 to $16,974. **Determination for D: not a candidate**: no chronological support (b), and V1 fails (c).
Arm D's C24 finalists remain the D1 inputs to arms C (DF1–DF3) and S (C24F1–F3).

---

_Sections A–I below are generated from the sealed records by `tools/tsla-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 32 / 32 | 4 | 1✗ | 1,796,673 | 1,711,043 | 728.5 | 2: 8, 3: 10, 4: 33, 5: 9, 6: 4 | triggers not met 64 | 8 / 8 | converged by the frozen rules |
| C21 | 48 / 16 | 6 | 1✓ 2✓ 3✗ | 1,029,181 | 978,675 | 887.5 | 2: 30, 3: 9, 4: 20, 5: 5 | triggers not met 64 | 4 / 8 | converged by the frozen rules |
| C23 | 32 / 16 | 4 | 1✗ | 864,226 | 810,631 | 715.8 | 2: 20, 3: 5, 4: 14, 5: 8, 6: 1 | triggers not met 48 | 4 / 8 | converged by the frozen rules |
| C24 | 48 / 16 | 6 | 1✓ 2✓ 3✗ | 1,002,937 | 947,799 | 1,361.1 | 2: 31, 3: 6, 4: 16, 5: 8, 6: 2, 8: 1 | triggers not met 64 | 4 / 8 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 96 | 96 | — | New L0: no (Q2 Q3 Q5); N/original: no (Q2 Q3 Q4 Q5) |
| C19 | refine | 172 | 168 | Q3 4 | — |
| C21 | broad | 72 | 65 | Q5 1, Q4 2, Q3 4 | New L0: no (Q2 Q3 Q5); N/original: no (Q2 Q3 Q5) |
| C21 | refine | 76 | 66 | Q3 10 | — |
| C23 | broad | 48 | 45 | Q4 1, Q3 2 | New L0: no (Q2 Q3 Q5); N/original: no (Q2 Q3 Q5) |
| C23 | refine | 84 | 79 | Q3 5 | — |
| C24 | broad | 71 | 66 | Q3 2, Q4 3 | New L0: no (Q2 Q3 Q5); N/original: no (Q2 Q3 Q5) |
| C24 | refine | 84 | 84 | — | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | D | 268 / 264 | `C19/D/refine/D.B1/R102#1 profit` | $210,046 | $15,892 | 20 | $146,628 / $24,157 | $129,154 / $24,296 | no (`C19/D/refine/D.B1/R103#4 profit order`) |
| C19 | D-A | 33 / 33 | `C19/D/refine/D.A0/R101#1 profit` | $196,296 | $30,052 | 11 | $86,365 / $33,276 | $75,081 / $33,415 | no (`C19/D/refine/D.A0/R103#3 profit order`) |
| C21 | D | 148 / 131 | `C21/D/refine/D.C1/R102#1 profit` | $297,254 | $25,375 | 30 | $143,894 / $33,105 | $100,159 / $33,765 | no (`C21/D/refine/D.D1/R102#3 control alternative`) |
| C21 | D-A | 0 / 0 | **none qualified** | — | — | — | — / — | — / — | — |
| C23 | D | 132 / 124 | `C23/D/refine/D.D1/R102#1 profit` | $235,330 | $20,969 | 30 | $56,365 / $35,145 | $28,773 / $33,924 | no (`C23/D/refine/D.D1/R101#1 profit`) |
| C23 | D-A | 0 / 0 | **none qualified** | — | — | — | — / — | — / — | — |
| C24 | D | 155 / 150 | `C24/D/refine/D.B1/R103#1 profit` | $319,654 | $25,587 | 50 | $110,667 / $35,592 | $79,447 / $34,819 | no (`C24/D/refine/D.B1/R101#1 profit`) |
| C24 | D-A | 0 / 0 | **none qualified** | — | — | — | — / — | — / — | — |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/D/refine/D.B1/R103#2 robust` | `C19/D/refine/D.B1/R103#2 robust` | `C19/D/refine/D.B1/R103#5 profit order` |
| C21 | `C21/D/refine/D.C1/R102#2 robust` | `C21/D/refine/D.D1/R103#3 balanced` | `C21/D/refine/D.B1/R103#6 profit order` |
| C23 | `C23/D/refine/D.A1/R104#2 robust` | `C23/D/refine/D.B1/R101#2 robust` | `C23/D/refine/D.B1/R102#6 profit order` |
| C24 | `C24/D/refine/D.C1/R103#2 robust` | `C24/D/refine/D.C1/R102#2 robust` | `C24/D/refine/D.B1/R101#6 profit order` |

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/D/refine/D.B1/R102#1 profit` | primary D/original; role D/actual-profit | $210,046 | $20,368 | $40,170 | $40,170 | 14 (5 losing) | −$24,507 | 243 / 256 (training 2.3 %) |
| C19 | `C19/D/refine/D.A0/R101#1 profit` | primary D-A/original; role D-A/actual-profit | $196,296 | $228,852 | $99,712 | $99,712 | 10 (4 losing) | −$55,964 | 256 / 256 (training 5.5 %) |
| C19 | `C19/D/refine/D.B1/R103#2 robust` | role D/robust-profit; role D/balanced | $188,585 | $4,464 | $41,757 | $41,757 | 12 (5 losing) | −$22,010 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.B1/R103#5 profit order` | role D/lower-drawdown | $183,365 | $8,017 | $55,857 | $55,857 | 13 (5 losing) | −$27,455 | 251 / 256 (training 1.6 %) |
| C19 | `C19/D/refine/D.A0/R104#2 profit order` | role D-A/robust-profit | $152,991 | −$8,400 | $59,045 | $61,181 | 5 (2 losing) | −$43,548 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A0/R102#2 robust` | role D-A/balanced | $147,798 | $1,941 | $58,636 | $59,088 | 5 (2 losing) | −$42,884 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A0/R102#6 profit order` | role D-A/lower-drawdown | $93,640 | $58,573 | $70,723 | $70,723 | 26 (7 losing) | −$45,695 | 256 / 256 (training 0.0 %) |
| C19 | `control: New L0 on TSLA (arm D; external VGT phenotype)` | control control: New L0 on TSLA (arm D; external VGT phenotype) | $29,055 | $66,044 | $75,933 | $92,796 | 23 (6 losing) | −$45,695 | 256 / 256 (training 100.0 %) |
| C19 | `control: N/original on TSLA (arm D; external VGT phenotype)` | control control: N/original on TSLA (arm D; external VGT phenotype) | $18,813 | $83,032 | $74,761 | $95,081 | 34 (13 losing) | −$22,959 | 256 / 256 (training 100.0 %) |
| C21 | `C21/D/refine/D.C1/R102#1 profit` | primary D/original; role D/actual-profit | $297,254 | −$7,376 | $13,332 | $28,921 | 4 (3 losing) | −$6,462 | 0 / 256 (training 3.5 %) |
| C21 | `C21/D/refine/D.C1/R102#2 robust` | role D/robust-profit | $203,523 | −$11,309 | $17,561 | $25,375 | 5 (3 losing) | −$5,117 | 0 / 256 (training 3.1 %) |
| C21 | `C21/D/refine/D.D1/R103#3 balanced` | role D/balanced | $255,727 | −$37,395 | $71,523 | $71,523 | 8 (4 losing) | −$20,385 | 256 / 256 (training 0.8 %) |
| C21 | `C21/D/refine/D.B1/R103#6 profit order` | role D/lower-drawdown | $106,463 | −$5,561 | $15,710 | $17,172 | 6 (3 losing) | −$6,774 | 0 / 256 (training 0.0 %) |
| C21 | `control: New L0 on TSLA (arm D; external VGT phenotype)` | control control: New L0 on TSLA (arm D; external VGT phenotype) | $95,099 | $24,725 | $97,606 | $97,606 | 31 (15 losing) | −$25,307 | 256 / 256 (training 100.0 %) |
| C21 | `control: N/original on TSLA (arm D; external VGT phenotype)` | control control: N/original on TSLA (arm D; external VGT phenotype) | $101,845 | −$657 | $98,507 | $98,507 | 43 (20 losing) | −$18,908 | 256 / 256 (training 100.0 %) |
| C23 | `C23/D/refine/D.D1/R102#1 profit` | primary D/original; role D/actual-profit | $235,330 | $12,231 | $11,051 | $20,969 | 4 (2 losing) | −$3,749 | 0 / 256 (training 10.9 %) |
| C23 | `C23/D/refine/D.A1/R104#2 robust` | role D/robust-profit | $153,260 | $582 | $20,052 | $32,001 | 5 (1 losing) | −$19,023 | 0 / 256 (training 6.3 %) |
| C23 | `C23/D/refine/D.B1/R101#2 robust` | role D/balanced | $137,757 | −$15,305 | $15,445 | $22,523 | 1 (1 losing) | −$15,305 | 0 / 256 (training 0.0 %) |
| C23 | `C23/D/refine/D.B1/R102#6 profit order` | role D/lower-drawdown | $50,652 | $410 | $6,531 | $12,054 | 5 (2 losing) | −$3,387 | 0 / 256 (training 0.0 %) |
| C23 | `control: New L0 on TSLA (arm D; external VGT phenotype)` | control control: New L0 on TSLA (arm D; external VGT phenotype) | $119,825 | −$1,315 | $37,888 | $97,606 | 14 (6 losing) | −$18,811 | 201 / 256 (training 100.0 %) |
| C23 | `control: N/original on TSLA (arm D; external VGT phenotype)` | control control: N/original on TSLA (arm D; external VGT phenotype) | $101,187 | $799 | $34,114 | $98,507 | 15 (6 losing) | −$16,890 | 209 / 256 (training 100.0 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| D/original | `C19/D/refine/D.B1/R102#1 profit` → `C21/D/refine/D.C1/R102#1 profit` → `C23/D/refine/D.D1/R102#1 profit` | $25,172 | $40,170 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| D-A/original (report-only) | `C19/D/refine/D.A0/R101#1 profit` → (none) → (none) | $228,852 | $99,712 | chronologically incomplete: C21, C23 had no qualified candidate (flat) — no chronological support |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| D: role robust-profit (descriptive) | `C19/D/refine/D.B1/R103#2 robust` → `C21/D/refine/D.C1/R102#2 robust` → `C23/D/refine/D.A1/R104#2 robust` | −$6,263 | $45,508 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| D: role balanced (descriptive) | `C19/D/refine/D.B1/R103#2 robust` → `C21/D/refine/D.D1/R103#3 balanced` → `C23/D/refine/D.B1/R101#2 robust` | −$48,236 | $77,344 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| D: role lower-drawdown (descriptive) | `C19/D/refine/D.B1/R103#5 profit order` → `C21/D/refine/D.B1/R103#6 profit order` → `C23/D/refine/D.B1/R102#6 profit order` | $2,866 | $55,857 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist | `C24/D/refine/D.B1/R103#1 profit` | primary D | pass | $319,654.09 | $343,750 | $18,926 | $5,169 | $25,587.28 (25.6 %) | 50 34/16 | −$8,978.57 | $13,923.62 | $310,675.52 | $27,742.34 | ✗ ✓ ✓ |
| finalist | `C24/D/refine/D.C1/R103#2 robust` | role D/robust-profit | pass | $200,866.18 | $216,631 | $12,658 | $3,107 | $26,048.97 (26.1 %) | 30 23/7 | −$16,973.99 | $27,237.18 | $183,892.19 | $27,237.18 | ✗ ✓ ✓ |
| finalist | `C24/D/refine/D.C1/R102#2 robust` | role D/balanced | pass | $191,134.78 | $206,202 | $12,266 | $2,802 | $22,651.90 (22.7 %) | 27 20/7 | −$15,883.65 | $25,829.51 | $175,251.13 | $25,829.51 | ✗ ✓ ✓ |
| finalist | `C24/D/refine/D.B1/R101#6 profit order` | role D/lower-drawdown | pass | $77,731.65 | $83,856 | $2,984 | $3,140 | $13,189.33 (13.2 %) | 31 17/14 | −$6,544.39 | $6,623.53 | $71,187.26 | $13,189.33 | ✗ ✓ ✓ |
| control | `control: New L0 on TSLA (arm D; external VGT phenotype)` | external control | fails Q2 Q3 Q5 | $118,509.47 | $174,326 | $46,381 | $9,436 | $97,605.64 (97.6 %) | 94 54/39 | −$6,797.43 | $57,153.81 | $111,712.04 | $97,605.64 | ✗ ✗ ✗ |
| control | `control: N/original on TSLA (arm D; external VGT phenotype)` | external control | fails Q2 Q3 Q5 | $101,986.24 | $162,101 | $47,586 | $12,528 | $98,506.56 (98.5 %) | 125 71/53 | $5,059.95 | $58,046.59 | $107,046.19 | $98,506.56 | ✓ ✗ ✗ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.B1/R103#1 profit` | $25,587 | $10,332 / $10,332 | $16,246 / $16,295 | −$10,332 | −$10,332 | 21.6 % | 0.0 % | 36.4 % | $319,654 / $0 |
| `C24/D/refine/D.C1/R103#2 robust` | $26,049 | $9,862 / $9,862 | $19,533 / $19,583 | −$9,862 | −$9,862 | 14.1 % | 0.0 % | 20.2 % | $200,866 / $0 |
| `C24/D/refine/D.C1/R102#2 robust` | $22,652 | $9,971 / $9,971 | $15,815 / $15,862 | −$9,971 | −$9,971 | 13.6 % | 0.0 % | 20.3 % | $191,135 / $0 |
| `C24/D/refine/D.B1/R101#6 profit order` | $13,189 | $3,911 / $3,911 | $9,890 / $9,940 | −$3,911 | −$3,911 | 4.5 % | 0.0 % | 29.8 % | $77,732 / $0 |
| `control: New L0 on TSLA (arm D; external VGT phenotype)` | $97,606 | $45,695 / $45,722 | $87,009 / $87,057 | −$45,695 | −$24,563 | 51.4 % | -5.8 % | 45.7 % | $118,509 / $0 |
| `control: N/original on TSLA (arm D; external VGT phenotype)` | $98,507 | $22,959 / $22,959 | $87,625 / $87,673 | −$22,959 | −$22,959 | 54.2 % | -7.4 % | 35.0 % | $101,986 / $0 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.B1/R103#1 profit` | $148,203 / $79,447 / $113,825 | $34,819 / $38,513 | $38,422 / $46,624 | 9.6 % (7.1 %–13.0 %) | $110,667 / $35,592 | $314,318 / $26,080 | $309,869 / $27,064 | $314,492 | $313,695 / $26,864 | $246,882 / $25,172 |
| `C24/D/refine/D.C1/R103#2 robust` | $164,464 / $130,418 / $147,441 | $33,204 / $35,046 | $36,807 / $43,721 | 5.2 % (3.4 %–7.9 %) | $150,158 / $32,712 | $181,727 / $26,328 | $193,267 / $26,886 | $199,130 | $177,080 / $26,760 | $181,915 / $26,125 |
| `C24/D/refine/D.C1/R102#2 robust` | $165,154 / $133,483 / $149,319 | $30,306 / $31,490 | $32,215 / $41,069 | 0.8 % (0.3 %–2.3 %) | $149,651 / $30,487 | $188,233 / $22,837 | $182,438 / $23,359 | $187,790 | $183,876 / $23,245 | $190,078 / $22,680 |
| `C24/D/refine/D.B1/R101#6 profit order` | $75,481 / $57,176 / $66,328 | $20,559 / $22,054 | $22,407 / $26,968 | 0.0 % (0.0 %–1.0 %) | $65,935 / $21,026 | $82,005 / $12,196 | $74,841 / $13,075 | $76,918 | $69,780 / $14,428 | $77,448 / $13,183 |
| `control: New L0 on TSLA (arm D; external VGT phenotype)` | $148,195 / $87,861 / $118,028 | $110,247 / $115,942 | $117,010 / $131,301 | 100.0 % (99.0 %–100.0 %) | $121,411 / $114,266 | $115,792 / $99,138 | $56,147 / $102,198 | $83,155 | $89,671 / $99,546 | $121,843 / $96,237 |
| `control: N/original on TSLA (arm D; external VGT phenotype)` | $109,668 / $63,016 / $86,342 | $124,038 / $128,919 | $129,717 / $145,020 | 100.0 % (99.0 %–100.0 %) | $85,362 / $125,748 | $67,851 / $100,739 | $44,300 / $105,695 | $67,427 | $74,439 / $103,907 | $105,088 / $96,825 |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.B1/R103#1 profit` | $5,277 | $0 | $19,421 | −$466 | $142,384 | $94,852 | −$7,509 | $53,283 | $12,412 | −$2,934 | −$6,045 |
| `C24/D/refine/D.C1/R103#2 robust` | $23,787 | $34,795 | $36,191 | $0 | $30,907 | $11,891 | −$6,051 | $42,748 | $26,597 | −$6,690 | −$10,284 |
| `C24/D/refine/D.C1/R102#2 robust` | $22,193 | $28,423 | $33,857 | $0 | $38,209 | $11,168 | −$2,197 | $36,027 | $23,455 | −$6,050 | −$9,833 |
| `C24/D/refine/D.B1/R101#6 profit order` | −$3,227 | −$339 | $13,555 | −$722 | $25,195 | $11,532 | −$6,485 | $31,434 | $6,789 | −$3,197 | −$3,348 |
| `control: New L0 on TSLA (arm D; external VGT phenotype)` | $14,165 | $752 | $35,592 | −$21,454 | $66,675 | −$630 | −$24,650 | $49,375 | −$1,315 | −$10,582 | $3,784 |
| `control: N/original on TSLA (arm D; external VGT phenotype)` | $10,862 | $1,740 | $33,211 | −$27,001 | $81,428 | $1,604 | −$42,952 | $42,295 | $799 | −$5,850 | $10,910 |

### Parameter vectors

- `C24/D/refine/D.B1/R103#1 profit` — cell `D.B1`
  - D1·TSLA: targetPercentChange 285, trailingBuyPercentage 12, trailingStopPercentage 70, maximumHoldDays 11, tickWindowSize 59, intradayLossBuffer 40, pullback 39, continuationWindow 166; controls {"d":58,"k":1,"r":500,"c":214}; D1 arming from the first day: false
- `C24/D/refine/D.C1/R103#2 robust` — cell `D.C1`
  - D1·TSLA: targetPercentChange 227, trailingBuyPercentage 31, trailingStopPercentage 58, maximumHoldDays 3, tickWindowSize 81, intradayLossBuffer 0, pullback 173, continuationWindow 87; controls {"d":95,"k":1,"r":940,"c":248}; D1 arming from the first day: false
- `C24/D/refine/D.C1/R102#2 robust` — cell `D.C1`
  - D1·TSLA: targetPercentChange 228, trailingBuyPercentage 33, trailingStopPercentage 61, maximumHoldDays 3, tickWindowSize 78, intradayLossBuffer 0, pullback 173, continuationWindow 65; controls {"d":92,"k":1,"r":990,"c":249}; D1 arming from the first day: false
- `C24/D/refine/D.B1/R101#6 profit order` — cell `D.B1`
  - D1·TSLA: targetPercentChange 225, trailingBuyPercentage 41, trailingStopPercentage 30, maximumHoldDays 25, tickWindowSize 61, intradayLossBuffer 27, pullback 163, continuationWindow 10; controls {"d":31,"k":1,"r":850,"c":114}; D1 arming from the first day: true
- `control: New L0 on TSLA (arm D; external VGT phenotype)` — cell `D.A0`
  - D1·TSLA: targetPercentChange 237, trailingBuyPercentage 9, trailingStopPercentage 73, maximumHoldDays 15, tickWindowSize 72, intradayLossBuffer 42, pullback 103, continuationWindow 41; controls {}; D1 arming from the first day: false
- `control: N/original on TSLA (arm D; external VGT phenotype)` — cell `D.B0`
  - D1·TSLA: targetPercentChange 237, trailingBuyPercentage 2, trailingStopPercentage 73, maximumHoldDays 15, tickWindowSize 70, intradayLossBuffer 42, pullback 103, continuationWindow 41; controls {"d":120}; D1 arming from the first day: false

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/D/refine/D.B1/R102#1 profit` | C19 primary D | $296,776.15 | 66 | 64.6 % | 12 / 76 | 23.0 % (626 / 2,723) | $595,433 / $27,898 | −$24,507 | none | $43,381 / $47,155 / $62,254 |
| `C21/D/refine/D.C1/R102#1 profit` | C21 primary D | $337,961.45 | 42 | 61.9 % | 8 / 92 | 16.8 % (456 / 2,723) | $368,938 / $25,375 | −$10,889 | none | $33,167 / $37,623 / $55,445 |
| `C23/D/refine/D.D1/R102#1 profit` | C23 primary D | $235,440.07 | 37 | 54.0 % | 6 / 77 | 8.6 % (234 / 2,723) | $280,196 / $16,388 | −$9,068 | none | $31,801 / $36,347 / $54,534 |
| `C24/D/refine/D.B1/R103#1 profit` | C24 primary D | $310,675.52 | 52 | 65.4 % | 10 / 64 | 16.6 % (451 / 2,723) | $446,290 / $16,388 | −$10,332 | none | $32,749 / $37,233 / $55,166 |
| `C24/D/refine/D.C1/R103#2 robust` | C24 role D/robust-profit | $183,892.19 | 33 | 72.7 % | 9 / 104 | 11.6 % (316 / 2,723) | $270,380 / $15,287 | −$10,772 | none | $33,079 / $37,541 / $55,386 |
| `C24/D/refine/D.C1/R102#2 robust` | C24 role D/balanced | $175,251.13 | 30 | 70.0 % | 8.5 / 104 | 11.1 % (303 / 2,723) | $253,022 / $14,759 | −$9,971 | none | $32,478 / $36,980 / $54,986 |
| `C24/D/refine/D.B1/R101#6 profit order` | C24 role D/lower-drawdown | $71,187.26 | 33 | 51.5 % | 2 / 11 | 2.7 % (73 / 2,723) | $133,774 / $10,437 | −$3,911 | none | $27,933 / $32,737 / $51,955 |
| `control: New L0 on TSLA (arm D; external VGT phenotype)` | control | $111,712.04 | 108 | 57.4 % | 15 / 65 | 45.9 % (1,251 / 2,723) | $1,148,412 / $34,740 | −$45,695 | none | $59,271 / $61,987 / $72,848 |
| `control: N/original on TSLA (arm D; external VGT phenotype)` | control | $107,046.19 | 147 | 57.8 % | 10 / 65 | 47.1 % (1,284 / 2,723) | $1,597,637 / $26,465 | −$22,959 | none | $42,219 / $46,071 / $61,480 |

Worst closed trades of each subject (net after costs and interest):

- `C19/D/refine/D.B1/R102#1 profit`: D1·TSLA 2021-02-22 → 2021-03-05 (protective stop, 11 d) −$24,507.37; D1·TSLA 2020-03-06 → 2020-03-13 (protective stop, 7 d) −$24,386.82; D1·TSLA 2022-05-10 → 2022-05-23 (maximum hold, 13 d) −$18,860.40; D1·TSLA 2025-02-25 → 2025-03-10 (maximum hold, 13 d) −$17,515.47; D1·TSLA 2022-10-31 → 2022-11-14 (maximum hold, 14 d) −$15,676.66
  - largest giveback: D1·TSLA 2021-02-22 → 2021-03-05 best mark $3,390.19, final −$24,507.37 (giveback $27,897.56)
  - open at 2026-10-30: D1·TSLA from 2026-10-16 marked $12,560.89
- `C21/D/refine/D.C1/R102#1 profit`: D1·TSLA 2020-02-27 → 2020-02-28 (protective stop gap, 1 d) −$10,889.43; D1·TSLA 2022-06-09 → 2022-06-10 (protective stop gap, 1 d) −$6,461.96; D1·TSLA 2017-10-03 → 2017-10-25 (protective stop, 22 d) −$5,558.17; D1·TSLA 2021-02-01 → 2021-02-17 (protective stop gap, 16 d) −$5,531.07; D1·TSLA 2019-01-31 → 2019-02-21 (protective stop, 21 d) −$5,528.03
  - largest giveback: D1·TSLA 2020-01-28 → 2020-02-05 best mark $69,300.78, final $43,925.33 (giveback $25,375.45)
- `C23/D/refine/D.D1/R102#1 profit`: D1·TSLA 2025-02-11 → 2025-02-12 (protective stop gap, 1 d) −$5,515.38; D1·TSLA 2021-03-04 → 2021-03-05 (protective stop gap, 1 d) −$5,405.17; D1·TSLA 2023-02-21 → 2023-02-22 (protective stop gap, 1 d) −$4,312.35; D1·TSLA 2024-01-11 → 2024-01-12 (protective stop gap, 1 d) −$3,748.66; D1·TSLA 2018-03-28 → 2018-03-29 (protective stop gap, 1 d) −$3,717.56
  - largest giveback: D1·TSLA 2020-04-21 → 2020-05-01 best mark $26,739.67, final $10,351.67 (giveback $16,388.00)
- `C24/D/refine/D.B1/R103#1 profit`: D1·TSLA 2024-10-08 → 2024-10-11 (protective stop gap, 3 d) −$10,332.48; D1·TSLA 2020-10-23 → 2020-10-30 (protective stop, 7 d) −$6,105.11; D1·TSLA 2022-10-07 → 2022-10-12 (protective stop, 5 d) −$6,044.84; D1·TSLA 2026-07-23 → 2026-07-28 (protective stop, 5 d) −$6,044.84; D1·TSLA 2016-08-31 → 2016-09-02 (protective stop, 2 d) −$5,954.43
  - largest giveback: D1·TSLA 2020-04-21 → 2020-05-01 best mark $26,739.67, final $10,351.67 (giveback $16,388.00)
- `C24/D/refine/D.C1/R103#2 robust`: D1·TSLA 2025-02-03 → 2025-02-11 (protective stop gap, 8 d) −$10,772.31; D1·TSLA 2026-03-04 → 2026-03-27 (protective stop, 23 d) −$10,283.61; D1·TSLA 2023-08-07 → 2023-08-16 (protective stop, 9 d) −$9,861.69; D1·TSLA 2021-02-26 → 2021-03-04 (protective stop, 6 d) −$9,771.28; D1·TSLA 2022-01-21 → 2022-01-24 (protective stop, 3 d) −$9,680.87
  - largest giveback: D1·TSLA 2021-02-26 → 2021-03-04 best mark $5,516.07, final −$9,771.28 (giveback $15,287.34)
- `C24/D/refine/D.C1/R102#2 robust`: D1·TSLA 2018-09-06 → 2018-09-07 (protective stop gap, 1 d) −$9,971.01; D1·TSLA 2026-03-09 → 2026-03-27 (protective stop, 18 d) −$9,833.22; D1·TSLA 2023-08-07 → 2023-08-16 (protective stop, 9 d) −$9,561.99; D1·TSLA 2025-02-03 → 2025-02-10 (protective stop, 7 d) −$9,501.71; D1·TSLA 2021-02-26 → 2021-03-04 (protective stop, 6 d) −$9,471.58
  - largest giveback: D1·TSLA 2021-02-26 → 2021-03-04 best mark $5,287.52, final −$9,471.58 (giveback $14,759.10)
- `C24/D/refine/D.B1/R101#6 profit order`: D1·TSLA 2020-09-02 → 2020-09-03 (trailing stop gap, 1 d) −$3,910.55; D1·TSLA 2019-02-25 → 2019-02-26 (protective stop gap, 1 d) −$3,507.12; D1·TSLA 2026-03-04 → 2026-03-09 (protective stop, 5 d) −$3,347.54; D1·TSLA 2016-05-11 → 2016-05-12 (protective stop, 1 d) −$3,226.99; D1·TSLA 2018-05-21 → 2018-05-22 (protective stop, 1 d) −$3,226.99
  - largest giveback: D1·TSLA 2020-09-02 → 2020-09-03 best mark $6,525.98, final −$3,910.55 (giveback $10,436.53)
- `control: New L0 on TSLA (arm D; external VGT phenotype)`: D1·TSLA 2025-02-24 → 2025-03-11 (maximum hold, 15 d) −$34,720.69; D1·TSLA 2022-12-06 → 2022-12-21 (maximum hold, 15 d) −$24,562.67; D1·TSLA 2022-12-22 → 2023-01-06 (maximum hold, 15 d) −$23,063.55; D1·TSLA 2020-02-24 → 2020-03-10 (maximum hold, 15 d) −$21,659.21; D1·TSLA 2022-11-04 → 2022-11-21 (maximum hold, 17 d) −$19,930.09
  - largest giveback: D1·TSLA 2025-02-24 → 2025-03-11 best mark $19.04, final −$34,720.69 (giveback $34,739.72)
- `control: N/original on TSLA (arm D; external VGT phenotype)`: D1·TSLA 2020-03-13 → 2020-03-16 (protective stop gap, 3 d) −$22,959.27; D1·TSLA 2022-02-14 → 2022-02-24 (protective stop gap, 10 d) −$18,907.87; D1·TSLA 2024-07-24 → 2024-08-05 (protective stop gap, 12 d) −$16,889.94; D1·TSLA 2020-03-05 → 2020-03-09 (protective stop gap, 4 d) −$16,832.04; D1·TSLA 2018-03-19 → 2018-03-28 (protective stop gap, 9 d) −$15,261.67
  - largest giveback: D1·TSLA 2022-02-14 → 2022-02-24 best mark $7,556.77, final −$18,907.87 (giveback $26,464.64)

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 TSLA daily (Yahoo Finance, 2010-06-29 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/D/refine/D.B1/R102#1 profit` | B1 | 12 (calendar maximum hold) | 24.1 % | −$24,100 (2010-06-29) | −$16,474 | 0.0 % | 0.0 % below the stop () | −$27,364 (2020-03-10) | 0.0 % |
| `C21/D/refine/D.C1/R102#1 profit` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 4.8 % | −$15,904 (2015-08-10) | −$5,371 | 0.0 % | 11.1 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `C23/D/refine/D.D1/R102#1 profit` | D1 | 26 (adaptive hold: the extended bound) | 3.1 % | −$14,568 (2015-08-11) | −$3,843 | 0.0 % | 11.5 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `C24/D/refine/D.B1/R103#1 profit` | B1 | 11 (calendar maximum hold) | 5.8 % | −$16,599 (2015-08-14) | −$5,802 | 0.0 % | 10.8 % below the stop (2015-08-24) | −$16,325 (2020-03-05) | 0.0 % |
| `C24/D/refine/D.C1/R103#2 robust` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 9.5 % | −$19,849 (2015-07-27) | −$9,575 | 0.0 % | 10.3 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |
| `C24/D/refine/D.C1/R102#2 robust` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 9.2 % | −$19,849 (2015-07-27) | −$9,390 | 0.0 % | 10.7 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |
| `C24/D/refine/D.B1/R101#6 profit order` | B1 | 25 (calendar maximum hold) | 3.1 % | −$14,568 (2015-08-11) | −$3,843 | 0.0 % | 11.5 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `control: New L0 on TSLA (arm D; external VGT phenotype)` | A0 | 15 (calendar maximum hold) | none (family A) | −$37,296 (2010-06-29) | −$17,738 | 0.1 % | — | −$53,234 (2020-03-04) | 0.5 % |
| `control: N/original on TSLA (arm D; external VGT phenotype)` | B0 | 15 (calendar maximum hold) | 12.0 % | −$22,219 (2015-08-18) | −$12,000 | 0.0 % | 10.2 % below the stop (2015-08-24) | −$20,239 (2024-07-29) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.B1/R103#1 profit` | small | 128 | $185,120 / $128,942 | $31,619 / $32,914 / $33,462 | $32,816 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/refine/D.B1/R103#1 profit` | wide | 128 | $128,984 / $26,046 | $39,772 / $45,566 / $56,364 | $45,773 | 29 (22.7 %; 16.3 %–30.6 %) |
| `C24/D/refine/D.C1/R103#2 robust` | small | 128 | $171,322 / $147,148 | $30,797 / $31,071 / $39,877 | $31,994 | 1 (0.8 %; 0.1 %–4.3 %) |
| `C24/D/refine/D.C1/R103#2 robust` | wide | 128 | $139,364 / $85,218 | $41,811 / $46,587 / $52,574 | $47,458 | 28 (21.9 %; 15.6 %–29.8 %) |
| `C24/D/refine/D.C1/R102#2 robust` | small | 128 | $181,868 / $147,977 | $27,862 / $28,395 / $29,054 | $28,431 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/refine/D.C1/R102#2 robust` | wide | 128 | $136,282 / $73,251 | $41,740 / $44,684 / $50,774 | $45,070 | 25 (19.5 %; 13.6 %–27.2 %) |
| `C24/D/refine/D.B1/R101#6 profit order` | small | 128 | $83,853 / $70,922 | $19,456 / $20,508 / $20,729 | $20,381 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/refine/D.B1/R101#6 profit order` | wide | 128 | $60,428 / $38,672 | $23,517 / $25,515 / $37,076 | $26,884 | 1 (0.8 %; 0.1 %–4.3 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/D/refine/D.B1/R102#1 profit` | $210,046 | 0.0 % | none open | none open | −$2,142 / −$6,133 / −$8,409 | −$6,305 / −$24,507 |
| C21 | `C21/D/refine/D.C1/R102#1 profit` | $297,254 | 0.0 % | none open | none open | −$2,164 / −$5,528 / −$10,889 | −$4,925 / −$6,462 |
| C23 | `C23/D/refine/D.D1/R102#1 profit` | $235,330 | 2.0 % | D1·TSLA from 2023-12-01: unrealized $4,761 (market value 1.056× the lot's principal) | trailing stop 2024-01-02: lot net $4,761 at the cutoff (partial exits included) → final $4,110; change on the slice −$651 | −$2,690 / −$5,342 / −$9,068 | −$2,719 / −$3,749 |
| C24 | `C24/D/refine/D.B1/R103#1 profit` | $319,654 | 0.0 % | none open | none open | −$3,106 / −$5,961 / −$10,332 | −$6,411 / −$6,777 |

