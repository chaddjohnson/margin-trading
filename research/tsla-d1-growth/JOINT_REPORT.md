# Fully joint D1 + Growth (arm J)

**What it is.** D1 and Growth searched together in the one $100,000 slot, with each candidate scored on the full shared-slot
result: 48 protected cells (8 D1 family × gate cells × 6 Growth exit cells), 4 base replicates per cell, NL0's lanes,
then 4 informed refinement lanes in up to 16 cells. 192 base lanes per cutoff, the most of any arm.

**Development.** C19 `J.B1.h1.s0/R102#1` $238,403 / DD $15,352; C21 `J.D1.h2.s1/R104#1` $410,874 / $31,918; C23
`J.C1.h0.s0/R104#1` $401,482 / $31,670. The primaries were D1-led:

| Cutoff | D1 part (training lots, net) | Growth part | Arm D's best standalone D1 (centre net) |
|---|---:|---:|---:|
| C19 | 18 lots, $193,794 | 9 lots, $44,609 | $210,046 |
| C21 | 38 lots, $380,777 | 8 lots, $30,097 | $297,254 |
| C23 | 24 lots, $332,204 | 4 lots, $69,278 | $235,330 |
| C24 | 25 lots, $178,970 | 22 lots, $256,581 | $319,654 |

At C24 the joint primary `J.B1.h2.s1/R104#1` ($435,551 / $27,882) was Growth-led. Its D1 part earned less than arm D's
primary, and its two books never collided: no signal of either was refused. Its D1 vector has a 7.1 % protective stop
active from the entry day and the decline gate. Roles: robust-profit `J.B1.h2.s1/R103#2` $378,636 / $26,868, balanced
`J.B1.h2.s1/R101#3` $378,031 / $29,746, lower-drawdown `J.D1.h1.s1/R102#2` $202,289 / $17,335. 23 of 48 cells had a
feasible fit, all with the D1 decline gate on.

At C21 and C23 the joint primary's D1 component earned more in sample than anything arm D found alone, with the same D1
box available to both. The shared slot changes D1's chronology: Growth's occupancy suppresses some D1 entries, which
lets a more aggressive D1 vector stay within the $35,000 limit. That is profit from the allocator's chronology as much as
from better D1 parameters. The lots diagnostic of the C24 finalists separates the two (displacement attribution,
`ROBUSTNESS_AND_RISK.md`). The feasible region narrowed with each fold: 48/48 cells had a feasible fit at C19, 37/48 at
C21, and 24/48 at C23 (only the D1 decline-gate-ON cells, as in arm D). J's best results were also the most dependent on
the seed of any arm: a typical cell's best feasible net varied by 33–66 % of its median across replicates
(`SEARCH_AND_CONVERGENCE_REPORT.md` §D).

**Chronology (the binding test).** Chained: +$82,512 (2020–2021), −$16,452 (2022–2023), +$33,520 (2024) = **$99,581,
the highest sequential net of the five arms, with a $67,635 drawdown — unsupported**. The drawdown lies inside 2020–2021.
Two Growth lots ran to their maximum hold at a loss: −$31,799 (2020-02-20 → 03-09; worst mark −$32,077) and −$27,600
(2021-02-16 → 03-08; worst mark −$34,632). A D1 stop added −$16,444 (2020-03-11 → 03-13). These are realized principal
losses of about 30 % of the slot on single lots; the worst training lot of the C19 primary had an adverse excursion of
−$8,365. All 256 of the C19 primary's confirmation draws breached $35,000 on 2020–2021, against 2.7 % in training. In
2022–2023 the Growth side lost −$13,400 on 3 lots and D1 −$3,052 on 7; in 2024 two D1 lots made +$26,011 and one Growth
lot +$7,509.

**Unrestricted Growth inside J (J-U, report-only).** $386,935 chained, with a $105,479 drawdown: unrestricted Growth held
TSLA through 2020–2021 (+$348,674 that slice) and gave most of the marked gain back.

**C24 comparisons (PROTOCOL §12, development).**
- Against G's primary, J is a type-P material improvement, replicated in R101–R104: +$94,638 centre net, +$40,025
  confirmation robust, −$774 centre DD, +$667 confirmation p90 DD.
- J is not a material improvement over S (S is $105,090 higher). S's advantage over J is material and replicated.

**Validation (once, retrospective).** −$10,751. D1 lost −$20,342 on three lots (stops of −$7,223 and −$7,344, and a
−$5,776 maximum-hold exit). Growth made +$9,592 on two (+$18,167 and an initial stop of −$8,575). Reset DD $29,253;
V1 fails. 56 of the 256 neighbourhood draws breached $35,000 on the validation. The roles lost $915 to $25,035; the
robust-profit role's whole-run DD of $42,923 also fails V3. **Determination for J: not a candidate** (b and c fail).

---

_Sections A–I below are generated from the sealed records by `tools/tsla-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 192 / 64 | 4 | 1✗ | 5,354,683 | 4,979,754 | 2,292 | 2: 41, 3: 60, 4: 90, 5: 36, 6: 20, 7: 6, 8: 3 | triggers not met 255; coverage-limited (class only beyond NL0 cap) 1 | 48 / 48 | converged by the frozen rules |
| C21 | 192 / 64 | 4 | 1✗ | 3,535,206 | 3,205,339 | 2,359.4 | 2: 128, 3: 38, 4: 61, 5: 20, 6: 5, 7: 3, 9: 1 | triggers not met 256 | 37 / 48 | converged by the frozen rules |
| C23 | 336 / 64 | 7 | 1✓ 2✓ 3✓ 4✗ | 4,092,873 | 3,704,722 | 4,313.4 | 2: 265, 3: 46, 4: 60, 5: 21, 6: 5, 7: 2, 8: 1 | triggers not met 400 | 24 / 48 | converged by the frozen rules |
| C24 | 192 / 64 | 4 | 1✗ | 3,264,739 | 2,910,581 | 2,959.6 | 2: 146, 3: 31, 4: 53, 5: 20, 6: 4, 7: 2 | triggers not met 256 | 23 / 48 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 575 | 555 | Q3 14, Q4 6 | New L0: no (Q2 Q3 Q4 Q5 Q6); N/original: no (Q2 Q3 Q4 Q5 Q6) |
| C19 | refine | 350 | 346 | Q4 2, Q3 2 | — |
| C21 | broad | 294 | 265 | Q3 23, Q4 7 | New L0: no (Q2 Q3 Q5 Q6); N/original: no (Q2 Q3 Q5 Q6) |
| C21 | refine | 353 | 345 | Q3 8 | — |
| C23 | broad | 336 | 300 | Q3 22, Q4 15 | New L0: no (Q2 Q3 Q5 Q6); N/original: no (Q2 Q3 Q5 Q6) |
| C23 | refine | 369 | 352 | Q4 4, Q3 12, Q5 2 | — |
| C24 | broad | 183 | 156 | Q3 19, Q4 10 | New L0: no (Q2 Q3 Q5 Q6); N/original: no (Q2 Q3 Q5 Q6) |
| C24 | refine | 367 | 355 | Q3 12 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | J | 925 / 901 | `C19/J/refine/J.B1.h1.s0/R102#1 profit` | $238,403 | $15,352 | 27 | $126,561 / $30,283 | $99,642 / $28,646 | yes |
| C19 | J-P | 809 / 787 | `C19/J/refine/J.B1.h1.s0/R102#1 profit` | $238,403 | $15,352 | 27 | $126,561 / $30,283 | $99,642 / $28,646 | yes |
| C19 | J-U | 116 / 114 | `C19/J/refine/J.D1.h0.s0/R104#1 profit` | $224,332 | $22,321 | 21 | $106,656 / $26,917 | $91,971 / $27,016 | yes |
| C21 | J | 647 / 610 | `C21/J/refine/J.D1.h2.s1/R104#1 profit` | $410,874 | $31,918 | 46 | $175,437 / $31,085 | $143,761 / $30,700 | yes |
| C21 | J-P | 569 / 538 | `C21/J/refine/J.D1.h2.s1/R104#1 profit` | $410,874 | $31,918 | 46 | $175,437 / $31,085 | $143,761 / $30,700 | yes |
| C21 | J-U | 78 / 72 | `C21/J/refine/J.A1.h0.s0/R102#1 profit` | $340,411 | $21,262 | 44 | $209,490 / $33,824 | $174,524 / $33,660 | no (`C21/J/refine/J.B1.h0.s0/R104#5 control alternative`) |
| C23 | J | 705 / 652 | `C23/J/refine/J.C1.h0.s0/R104#1 profit` | $401,482 | $31,670 | 28 | $149,268 / $32,246 | $112,009 / $32,360 | no (`C23/J/refine/J.D1.h1.s1/R102#1 profit`) |
| C23 | J-P | 602 / 556 | `C23/J/refine/J.D1.h1.s1/R103#1 profit` | $391,212 | $32,292 | 48 | $305,104 / $34,337 | $263,308 / $34,546 | no (`C23/J/refine/J.D1.h2.s0/R103#1 profit`) |
| C23 | J-U | 103 / 96 | `C23/J/refine/J.C1.h0.s0/R104#1 profit` | $401,482 | $31,670 | 28 | $149,268 / $32,246 | $112,009 / $32,360 | yes |
| C24 | J | 550 / 511 | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $435,551 | $27,882 | 47 | $289,823 / $32,566 | $254,243 / $33,240 | yes |
| C24 | J-P | 494 / 458 | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $435,551 | $27,882 | 47 | $289,823 / $32,566 | $254,243 / $33,240 | yes |
| C24 | J-U | 56 / 53 | `C24/J/refine/J.D1.h0.s0/R102#1 profit` | $329,697 | $30,674 | 41 | $203,512 / $33,915 | $183,659 / $33,423 | no (`C24/J/refine/J.D1.h0.s0/R103#5 profit order`) |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/J/refine/J.D0.h0.s1/R101#2 robust` | `C19/J/refine/J.D1.h1.s0/R102#3 balanced` | `C19/J/refine/J.C0.h0.s1/R104#3 balanced` |
| C21 | `C21/J/refine/J.D1.h2.s1/R101#1 profit` | `C21/J/refine/J.D1.h2.s1/R101#1 profit` | `C21/J/refine/J.B1.h0.s0/R104#4 Growth gate alternative` |
| C23 | `C23/J/refine/J.D1.h1.s1/R103#1 profit` | `C23/J/refine/J.A1.h0.s1/R104#1 profit` | `C23/J/refine/J.D1.h0.s1/R104#4 Growth gate alternative` |
| C24 | `C24/J/refine/J.B1.h2.s1/R103#2 robust` | `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | `C24/J/refine/J.D1.h1.s1/R102#2 balanced` |

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/J/refine/J.B1.h1.s0/R102#1 profit` | primary J/original; primary J-P/original; role J/actual-profit; role J-P/actual-profit | $238,403 | $82,512 | $67,635 | $67,635 | 32 (9 losing) | −$34,632 | 256 / 256 (training 2.7 %) |
| C19 | `C19/J/refine/J.D1.h0.s0/R104#1 profit` | primary J-U/original; role J-U/actual-profit | $224,332 | $348,674 | $105,479 | $105,479 | 9 (1 losing) | −$57,013 | 256 / 256 (training 0.8 %) |
| C19 | `C19/J/refine/J.D0.h0.s1/R101#2 robust` | role J/robust-profit; role J-P/robust-profit | $208,132 | $267,851 | $84,910 | $84,910 | 20 (6 losing) | −$24,572 | 256 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.D1.h1.s0/R102#3 balanced` | role J/balanced; role J-P/balanced | $190,869 | $100,137 | $62,614 | $62,614 | 33 (12 losing) | −$20,003 | 255 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.C0.h0.s1/R104#3 balanced` | role J/lower-drawdown; role J-P/lower-drawdown | $87,091 | $100,194 | $77,937 | $77,937 | 41 (19 losing) | −$22,959 | 256 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.D1.h0.s0/R101#2 robust` | role J-U/robust-profit | $148,724 | $255,166 | $168,255 | $168,255 | 9 (2 losing) | −$16,280 | 256 / 256 (training 1.2 %) |
| C19 | `C19/J/refine/J.D1.h0.s0/R101#3 balanced` | role J-U/balanced; role J-U/lower-drawdown | $126,998 | $50,880 | $36,925 | $45,604 | 19 (5 losing) | −$17,843 | 240 / 256 (training 0.0 %) |
| C19 | `control: New L0 on TSLA (arm J; external VGT phenotype)` | control control: New L0 on TSLA (arm J; external VGT phenotype) | $29,055 | $66,044 | $75,933 | $92,796 | 23 (6 losing) | −$45,695 | 256 / 256 (training 100.0 %) |
| C19 | `control: N/original on TSLA (arm J; external VGT phenotype)` | control control: N/original on TSLA (arm J; external VGT phenotype) | $18,813 | $83,032 | $74,761 | $95,081 | 34 (13 losing) | −$22,959 | 256 / 256 (training 100.0 %) |
| C21 | `C21/J/refine/J.D1.h2.s1/R104#1 profit` | primary J/original; primary J-P/original; role J/actual-profit; role J-P/actual-profit | $410,874 | −$16,452 | $30,242 | $37,891 | 10 (8 losing) | −$6,363 | 33 / 256 (training 0.0 %) |
| C21 | `C21/J/refine/J.A1.h0.s0/R102#1 profit` | primary J-U/original; role J-U/actual-profit | $340,411 | $4,841 | $45,296 | $45,296 | 12 (5 losing) | −$36,146 | 250 / 256 (training 8.2 %) |
| C21 | `C21/J/refine/J.D1.h2.s1/R101#1 profit` | role J/robust-profit; role J/balanced; role J-P/robust-profit; role J-P/balanced | $374,787 | −$8,363 | $53,481 | $53,481 | 12 (4 losing) | −$24,818 | 226 / 256 (training 4.3 %) |
| C21 | `C21/J/refine/J.B1.h0.s0/R104#4 Growth gate alternative` | role J/lower-drawdown; role J-U/lower-drawdown | $112,338 | −$3,695 | $15,184 | $18,250 | 6 (4 losing) | −$7,740 | 0 / 256 (training 1.6 %) |
| C21 | `C21/J/refine/J.C1.h0.s1/R104#2 Growth gate alternative` | role J-P/lower-drawdown | $182,124 | −$7,653 | $8,983 | $19,997 | 2 (2 losing) | −$3,826 | 0 / 256 (training 0.0 %) |
| C21 | `C21/J/refine/J.A1.h0.s0/R103#2 robust` | role J-U/robust-profit | $312,027 | $2,196 | $68,734 | $68,734 | 32 (13 losing) | −$36,146 | 255 / 256 (training 9.0 %) |
| C21 | `C21/J/refine/J.A1.h0.s0/R102#2 robust` | role J-U/balanced | $307,786 | $2,928 | $51,651 | $55,725 | 26 (10 losing) | −$27,263 | 256 / 256 (training 4.3 %) |
| C21 | `control: New L0 on TSLA (arm J; external VGT phenotype)` | control control: New L0 on TSLA (arm J; external VGT phenotype) | $95,099 | $24,725 | $97,606 | $97,606 | 31 (15 losing) | −$25,307 | 256 / 256 (training 100.0 %) |
| C21 | `control: N/original on TSLA (arm J; external VGT phenotype)` | control control: N/original on TSLA (arm J; external VGT phenotype) | $101,845 | −$657 | $98,507 | $98,507 | 43 (20 losing) | −$18,908 | 256 / 256 (training 100.0 %) |
| C23 | `C23/J/refine/J.C1.h0.s0/R104#1 profit` | primary J/original; primary J-U/original; role J/actual-profit; role J-U/actual-profit | $401,482 | $33,520 | $17,490 | $31,670 | 3 (1 losing) | −$4,416 | 0 / 256 (training 0.0 %) |
| C23 | `C23/J/refine/J.D1.h1.s1/R103#1 profit` | primary J-P/original; role J/robust-profit; role J-P/actual-profit; role J-P/robust-profit | $391,212 | $13,699 | $19,900 | $32,292 | 3 (1 losing) | −$18,540 | 0 / 256 (training 3.1 %) |
| C23 | `C23/J/refine/J.A1.h0.s1/R104#1 profit` | role J/balanced; role J-P/balanced | $337,503 | $23,052 | $20,351 | $28,655 | 6 (3 losing) | −$18,149 | 3 / 256 (training 2.3 %) |
| C23 | `C23/J/refine/J.D1.h0.s1/R104#4 Growth gate alternative` | role J/lower-drawdown | $165,895 | $7,883 | $6,004 | $16,595 | 1 (0 losing) | −$2,351 | 0 / 256 (training 0.0 %) |
| C23 | `C23/J/refine/J.C1.h2.s0/R104#3 balanced` | role J-P/lower-drawdown | $212,472 | $29,933 | $12,155 | $19,038 | 6 (2 losing) | −$4,516 | 0 / 256 (training 0.4 %) |
| C23 | `C23/J/refine/J.D1.h0.s0/R103#2 robust` | role J-U/robust-profit; role J-U/balanced | $314,412 | $859 | $23,380 | $28,326 | 6 (2 losing) | −$13,451 | 2 / 256 (training 5.5 %) |
| C23 | `C23/J/refine/J.C1.h0.s0/R101#4 control alternative` | role J-U/lower-drawdown | $83,171 | −$4,712 | $20,070 | $31,663 | 3 (2 losing) | −$11,467 | 0 / 256 (training 0.0 %) |
| C23 | `control: New L0 on TSLA (arm J; external VGT phenotype)` | control control: New L0 on TSLA (arm J; external VGT phenotype) | $119,825 | −$1,315 | $37,888 | $97,606 | 14 (6 losing) | −$18,811 | 201 / 256 (training 100.0 %) |
| C23 | `control: N/original on TSLA (arm J; external VGT phenotype)` | control control: N/original on TSLA (arm J; external VGT phenotype) | $101,187 | $799 | $34,114 | $98,507 | 15 (6 losing) | −$16,890 | 209 / 256 (training 100.0 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| J/original | `C19/J/refine/J.B1.h1.s0/R102#1 profit` → `C21/J/refine/J.D1.h2.s1/R104#1 profit` → `C23/J/refine/J.C1.h0.s0/R104#1 profit` | $99,581 | $67,635 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J-P/original (report-only) | `C19/J/refine/J.B1.h1.s0/R102#1 profit` → `C21/J/refine/J.D1.h2.s1/R104#1 profit` → `C23/J/refine/J.D1.h1.s1/R103#1 profit` | $79,760 | $67,635 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J-U/original (report-only) | `C19/J/refine/J.D1.h0.s0/R104#1 profit` → `C21/J/refine/J.A1.h0.s0/R102#1 profit` → `C23/J/refine/J.C1.h0.s0/R104#1 profit` | $386,935 | $105,479 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| J: role robust-profit (descriptive) | `C19/J/refine/J.D0.h0.s1/R101#2 robust` → `C21/J/refine/J.D1.h2.s1/R101#1 profit` → `C23/J/refine/J.D1.h1.s1/R103#1 profit` | $273,187 | $84,910 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J: role balanced (descriptive) | `C19/J/refine/J.D1.h1.s0/R102#3 balanced` → `C21/J/refine/J.D1.h2.s1/R101#1 profit` → `C23/J/refine/J.A1.h0.s1/R104#1 profit` | $114,826 | $62,614 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J: role lower-drawdown (descriptive) | `C19/J/refine/J.C0.h0.s1/R104#3 balanced` → `C21/J/refine/J.B1.h0.s0/R104#4 Growth gate alternative` → `C23/J/refine/J.D1.h0.s1/R104#4 Growth gate alternative` | $104,381 | $77,937 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | primary J | pass | $435,550.93 | $459,736 | $19,258 | $4,928 | $27,881.50 (27.9 %) | 47 34/13 | −$10,750.75 | $29,252.99 | $424,800.18 | $29,252.99 | ✗ ✓ ✓ |
| finalist | `C24/J/refine/J.B1.h2.s1/R103#2 robust` | role J/robust-profit | pass | $378,636.23 | $400,020 | $16,786 | $4,598 | $26,868.19 (26.9 %) | 44 33/11 | −$25,034.98 | $28,923.42 | $353,601.25 | $42,923.40 | ✗ ✓ ✗ |
| finalist | `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | role J/balanced | pass | $378,031.43 | $399,545 | $16,816 | $4,698 | $29,746.04 (29.8 %) | 45 33/12 | −$915.09 | $22,765.48 | $377,116.33 | $29,746.04 | ✗ ✓ ✓ |
| finalist | `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | role J/lower-drawdown | pass | $202,289.33 | $216,410 | $9,615 | $4,506 | $17,334.87 (17.3 %) | 44 32/12 | −$3,902.12 | $13,260.41 | $198,387.21 | $17,334.87 | ✗ ✓ ✓ |
| control | `control: New L0 on TSLA (arm J; external VGT phenotype)` | external control | fails Q2 Q3 Q5 Q6 | $118,509.47 | $174,326 | $46,381 | $9,436 | $97,605.64 (97.6 %) | 94 54/39 | −$6,797.43 | $57,153.81 | $111,712.04 | $97,605.64 | ✗ ✗ ✗ |
| control | `control: N/original on TSLA (arm J; external VGT phenotype)` | external control | fails Q2 Q3 Q5 Q6 | $101,986.24 | $162,101 | $47,586 | $12,528 | $98,506.56 (98.5 %) | 125 71/53 | $5,059.95 | $58,046.59 | $107,046.19 | $98,506.56 | ✓ ✗ ✗ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $27,882 | $9,140 / $9,140 | $12,664 / $12,714 | −$9,140 | −$9,140 | 21.5 % | 0.0 % | 14.9 % | $178,970 / $256,581 |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | $26,868 | $8,788 / $8,788 | $11,289 / $11,336 | −$8,788 | −$8,788 | 19.0 % | 0.0 % | 19.1 % | $135,759 / $242,877 |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | $29,746 | $8,788 / $8,788 | $11,937 / $11,985 | −$8,788 | −$8,788 | 19.0 % | 0.0 % | 16.7 % | $137,733 / $240,298 |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | $17,335 | $9,459 / $9,459 | $10,668 / $10,717 | −$9,459 | −$9,459 | 17.0 % | 0.0 % | 29.4 % | $122,348 / $79,942 |
| `control: New L0 on TSLA (arm J; external VGT phenotype)` | $97,606 | $45,695 / $45,722 | $87,009 / $87,057 | −$45,695 | −$24,563 | 51.4 % | -5.8 % | 45.7 % | $118,509 / $0 |
| `control: N/original on TSLA (arm J; external VGT phenotype)` | $98,507 | $22,959 / $22,959 | $87,625 / $87,673 | −$22,959 | −$22,959 | 54.2 % | -7.4 % | 35.0 % | $101,986 / $0 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $314,983 / $254,243 / $284,613 | $33,240 / $34,260 | $34,814 / $44,149 | 2.9 % (1.6 %–5.1 %) | $289,823 / $32,566 | $430,399 / $27,990 | $420,110 / $28,208 | $430,299 | $424,337 / $28,246 | $436,156 / $27,882 |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | $344,214 / $292,210 / $318,212 | $31,681 / $35,868 | $35,100 / $39,749 | 6.0 % (4.0 %–8.8 %) | $318,293 / $31,741 | $373,843 / $26,978 | $364,271 / $27,196 | $374,058 | $367,827 / $27,233 | $378,069 / $26,868 |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | $322,092 / $281,164 / $301,628 | $29,795 / $30,675 | $31,105 / $38,729 | 0.3 % (0.1 %–1.5 %) | $303,437 / $29,841 | $373,139 / $29,854 | $363,369 / $30,070 | $373,445 | $367,707 / $30,111 | $381,337 / $29,746 |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | $172,682 / $128,400 / $150,541 | $19,980 / $21,528 | $22,570 / $28,712 | 0.0 % (0.0 %–1.0 %) | $153,303 / $20,163 | $201,006 / $17,528 | $188,312 / $17,913 | $199,667 | $194,801 / $17,810 | $200,970 / $17,347 |
| `control: New L0 on TSLA (arm J; external VGT phenotype)` | $146,565 / $81,892 / $114,229 | $110,430 / $116,510 | $117,415 / $131,301 | 100.0 % (99.0 %–100.0 %) | $117,184 / $114,284 | $115,792 / $99,138 | $56,147 / $102,198 | $83,155 | $89,671 / $99,546 | $121,843 / $96,237 |
| `control: N/original on TSLA (arm J; external VGT phenotype)` | $105,187 / $59,098 / $82,142 | $126,062 / $131,194 | $131,447 / $144,527 | 100.0 % (99.0 %–100.0 %) | $83,532 / $126,683 | $67,851 / $100,739 | $44,300 / $105,695 | $67,427 | $74,439 / $103,907 | $105,088 / $96,825 |

### Causal removals (development centre; the other book switched off)

| Label | Without D1: net / DD | Without Growth: net / DD | Participation (funded principal-days share) |
|---|---:|---:|---:|
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $256,581 / $25,679 | $178,970 / $26,112 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | $242,877 / $29,746 | $135,759 / $24,075 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | $240,298 / $29,746 | $137,733 / $23,039 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | $84,868 / $18,551 | $112,731 / $30,506 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `control: New L0 on TSLA (arm J; external VGT phenotype)` | −$5,531 / $11,869 | $118,509 / $97,606 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"unfunded"} |
| `control: N/original on TSLA (arm J; external VGT phenotype)` | −$5,669 / $11,852 | $101,986 / $98,507 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"unfunded"} |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $5,272 | $31,276 | $820 | $576 | $134,983 | $81,151 | $4,401 | $128,049 | $49,023 | $5,681 | −$16,432 |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | $9,629 | $19,759 | $2,062 | $5,916 | $150,553 | $72,288 | $7,829 | $60,805 | $49,796 | −$8,003 | −$17,032 |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | $10,744 | $21,330 | $25,157 | $1,049 | $134,025 | $76,754 | $13,962 | $49,000 | $46,010 | $5,829 | −$6,744 |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | −$3,988 | $12,245 | $29,093 | $10,015 | $105,387 | $10,881 | $5,616 | $4,996 | $28,045 | −$4 | −$3,898 |
| `control: New L0 on TSLA (arm J; external VGT phenotype)` | $14,165 | $752 | $35,592 | −$21,454 | $66,675 | −$630 | −$24,650 | $49,375 | −$1,315 | −$10,582 | $3,784 |
| `control: N/original on TSLA (arm J; external VGT phenotype)` | $10,862 | $1,740 | $33,211 | −$27,001 | $81,428 | $1,604 | −$42,952 | $42,295 | $799 | −$5,850 | $10,910 |

### Parameter vectors

- `C24/J/refine/J.B1.h2.s1/R104#1 profit` — cell `J.B1.h2.s1`
  - D1·TSLA: targetPercentChange 277, trailingBuyPercentage 23, trailingStopPercentage 77, maximumHoldDays 9, tickWindowSize 69, intradayLossBuffer 48, pullback 193, continuationWindow 10; controls {"d":71,"k":1,"r":620,"c":165}; D1 arming from the first day: true
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 191, breakoutSlopeComparisonSessions 57, breakoutPriorHighSessions 79, trendFilterEnabled false, drawdownRecoveryGateEnabled false, trailingStopPercent 6.3, maximumHoldEnabled true, maximumHoldDays 26, intradayLossBufferEnabled true, intradayLossBufferPercent 3.6, initialStopEnabled true, initialStopAtrSessions 54, initialStopAtrMultiple 1.9, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 70, uptrendSmaBars 184, uptrendSlopeBars 22, uptrendMinimumRisePercent 3.7, pullbackMinimumPercent 2.5, pullbackMaximumPercent 10.7, recoveryPercent 3.89
- `C24/J/refine/J.B1.h2.s1/R103#2 robust` — cell `J.B1.h2.s1`
  - D1·TSLA: targetPercentChange 278, trailingBuyPercentage 19, trailingStopPercentage 75, maximumHoldDays 12, tickWindowSize 81, intradayLossBuffer 40, pullback 197, continuationWindow 10; controls {"d":62,"k":1,"r":650,"c":177}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 199, breakoutSlopeComparisonSessions 46, breakoutPriorHighSessions 111, trendFilterEnabled true, trendMethod momentum, trendMomentumShortSessions 25, trendMomentumLongSessions 163, trendMomentumMinimumShortReturnPercent 3.1, trendMomentumMinimumLongReturnPercent -8.2, drawdownRecoveryGateEnabled false, trailingStopPercent 6.3, maximumHoldEnabled true, maximumHoldDays 24, intradayLossBufferEnabled true, intradayLossBufferPercent 4.4, initialStopEnabled true, initialStopAtrSessions 59, initialStopAtrMultiple 2.1, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 61, uptrendSmaBars 177, uptrendSlopeBars 28, uptrendMinimumRisePercent 4.1, pullbackMinimumPercent 2.2, pullbackMaximumPercent 10.8, recoveryPercent 3.46
- `C24/J/refine/J.B1.h2.s1/R101#3 balanced` — cell `J.B1.h2.s1`
  - D1·TSLA: targetPercentChange 286, trailingBuyPercentage 20, trailingStopPercentage 66, maximumHoldDays 11, tickWindowSize 62, intradayLossBuffer 59, pullback 192, continuationWindow 16; controls {"d":65,"k":1,"r":640,"c":175}; D1 arming from the first day: true
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 195, breakoutSlopeComparisonSessions 56, breakoutPriorHighSessions 101, trendFilterEnabled true, trendMethod regression_slope, trendSlopeLookbackSessions 62, trendSlopeMinimumPercent 2.5, drawdownRecoveryGateEnabled false, trailingStopPercent 6.4, maximumHoldEnabled true, maximumHoldDays 24, intradayLossBufferEnabled true, intradayLossBufferPercent 4.6, initialStopEnabled true, initialStopAtrSessions 60, initialStopAtrMultiple 2.2, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 78, uptrendSmaBars 171, uptrendSlopeBars 29, uptrendMinimumRisePercent 4.15, pullbackMinimumPercent 2.3, pullbackMaximumPercent 10.6, recoveryPercent 3.46
- `C24/J/refine/J.D1.h1.s1/R102#2 balanced` — cell `J.D1.h1.s1`
  - D1·TSLA: targetPercentChange 231, trailingBuyPercentage 50, trailingStopPercentage 49, maximumHoldDays 13, tickWindowSize 192, intradayLossBuffer 53, pullback 170, continuationWindow 184; controls {"d":35,"hx":35,"g":120,"k":1,"r":690,"c":250}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 95, breakoutSlopeComparisonSessions 5, breakoutPriorHighSessions 118, trendFilterEnabled false, drawdownRecoveryGateEnabled true, dipLookbackSessions 65, dipThresholdPercent 8.5, recoveryRetracementPercent 89.3, recoveryConfirmationSessions 5, trailingStopPercent 3, maximumHoldEnabled true, maximumHoldDays 6, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 8, initialStopAtrMultiple 3.2, retentionEnabled true, retentionSellPercent 88, retentionSmaSessions 15, retentionClosesBelow 3, continuationEnabled false
- `control: New L0 on TSLA (arm J; external VGT phenotype)` — cell `J.A0.h1.s1`
  - D1·TSLA: targetPercentChange 237, trailingBuyPercentage 9, trailingStopPercentage 73, maximumHoldDays 15, tickWindowSize 72, intradayLossBuffer 42, pullback 103, continuationWindow 41; controls {}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 5.6, recentLowLookbackBars 84, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy time_limited, eligibilityMaxAgeSessions 20, drawdownRecoveryGateEnabled true, dipLookbackSessions 64, dipThresholdPercent 11.9, recoveryRetracementPercent 46.2, recoveryConfirmationSessions 5, trailingStopPercent 5.7, maximumHoldEnabled true, maximumHoldDays 22, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 16, initialStopAtrMultiple 1.2, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 67, classicPullbackPercent 11.5, classicReboundPercent 3.01
- `control: N/original on TSLA (arm J; external VGT phenotype)` — cell `J.B0.h1.s1`
  - D1·TSLA: targetPercentChange 237, trailingBuyPercentage 2, trailingStopPercentage 73, maximumHoldDays 15, tickWindowSize 70, intradayLossBuffer 42, pullback 103, continuationWindow 41; controls {"d":120}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 5.6, recentLowLookbackBars 84, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy time_limited, eligibilityMaxAgeSessions 20, drawdownRecoveryGateEnabled true, dipLookbackSessions 64, dipThresholdPercent 11.9, recoveryRetracementPercent 44.9, recoveryConfirmationSessions 5, trailingStopPercent 5.7, maximumHoldEnabled true, maximumHoldDays 22, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 16, initialStopAtrMultiple 1.2, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 67, classicPullbackPercent 11.2, classicReboundPercent 2.96

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/J/refine/J.B1.h1.s0/R102#1 profit` | C19 primary J | $393,487.59 | 107 | 70.8 % | 10 / 76 | 33.8 % (919 / 2,723) | $889,353 / $33,364 | −$34,632 | Growth refused (slot occupied) ← occupant D1: 3; D1 refused (slot occupied) ← occupant Growth: 5 | $50,974 / $54,242 / $67,316 |
| `C21/J/refine/J.D1.h2.s1/R104#1 profit` | C21 primary J | $438,551.60 | 76 | 62.7 % | 7 / 56 | 21.6 % (589 / 2,723) | $511,675 / $26,367 | −$8,485 | D1 refused (slot occupied) ← occupant Growth: 3; Growth refused (slot occupied) ← occupant D1: 7 | $31,364 / $35,939 / $54,242 |
| `C23/J/refine/J.C1.h0.s0/R104#1 profit` | C23 primary J | $407,319.71 | 34 | 66.7 % | 9 / 317 | 24.8 % (674 / 2,723) | $332,872 / $29,580 | −$45,781 | Growth refused (slot occupied) ← occupant D1: 4; D1 refused (slot occupied) ← occupant Growth: 2 | $59,336 / $62,047 / $72,891 |
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | C24 primary J | $424,800.18 | 52 | 67.3 % | 9.5 / 69 | 17.5 % (477 / 2,723) | $507,062 / $25,679 | −$9,140 | none | $31,855 / $36,398 / $54,570 |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | C24 role J/robust-profit | $353,601.25 | 49 | 69.4 % | 8 / 64 | 15.5 % (421 / 2,723) | $463,167 / $25,679 | −$9,346 | none | $32,009 / $36,542 / $54,673 |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | C24 role J/balanced | $377,116.33 | 50 | 70.0 % | 9.5 / 63 | 15.1 % (412 / 2,723) | $449,526 / $25,679 | −$8,788 | none | $31,591 / $36,152 / $54,394 |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | C24 role J/lower-drawdown | $198,387.21 | 48 | 70.8 % | 8 / 71 | 13.0 % (355 / 2,723) | $282,270 / $15,069 | −$9,459 | D1 refused (slot occupied) ← occupant Growth: 4; Growth refused (slot occupied) ← occupant D1: 1 | $32,094 / $36,621 / $54,730 |
| `control: New L0 on TSLA (arm J; external VGT phenotype)` | control | $111,712.04 | 108 | 57.4 % | 15 / 65 | 45.9 % (1,251 / 2,723) | $1,148,412 / $34,740 | −$45,695 | Growth refused (slot occupied) ← occupant D1: 1 | $59,271 / $61,987 / $72,848 |
| `control: N/original on TSLA (arm J; external VGT phenotype)` | control | $107,046.19 | 147 | 57.8 % | 10 / 65 | 47.1 % (1,284 / 2,723) | $1,597,637 / $26,465 | −$22,959 | Growth refused (slot occupied) ← occupant D1: 1 | $42,219 / $46,071 / $61,480 |

Worst closed trades of each subject (net after costs and interest):

- `C19/J/refine/J.B1.h1.s0/R102#1 profit`: Growth·TSLA 2020-02-20 → 2020-03-09 (maximum hold, 18 d) −$31,798.99; Growth·TSLA 2021-02-16 → 2021-03-08 (maximum hold, 20 d) −$27,599.93; D1·TSLA 2023-02-21 → 2023-03-09 (protective stop, 16 d) −$16,865.85; D1·TSLA 2023-04-04 → 2023-04-20 (protective stop, 16 d) −$16,865.85; D1·TSLA 2025-02-11 → 2025-02-26 (protective stop, 15 d) −$16,835.71
  - largest giveback: Growth·TSLA 2020-02-20 → 2020-03-09 best mark $1,564.75, final −$31,798.99 (giveback $33,363.74)
  - open at 2026-10-30: D1·TSLA from 2026-10-16 marked $12,831.46
- `C21/J/refine/J.D1.h2.s1/R104#1 profit`: Growth·TSLA 2020-09-15 → 2020-09-23 (initial stop, 8 d) −$8,484.78; Growth·TSLA 2020-06-11 → 2020-06-12 (initial stop, 1 d) −$6,685.32; D1·TSLA 2022-01-21 → 2022-01-24 (protective stop gap, 3 d) −$6,362.50; Growth·TSLA 2025-12-16 → 2026-01-02 (initial stop, 17 d) −$6,354.21; Growth·TSLA 2025-10-21 → 2025-10-23 (initial stop gap, 2 d) −$5,912.22
  - largest giveback: D1·TSLA 2020-01-27 → 2020-02-05 best mark $75,902.16, final $49,535.17 (giveback $26,366.99)
  - open at 2026-10-30: D1·TSLA from 2026-10-30 marked $1,924.43
- `C23/J/refine/J.C1.h0.s0/R104#1 profit`: D1·TSLA 2020-09-03 → 2020-09-04 (protective stop gap, 1 d) −$3,909.45; D1·TSLA 2020-02-20 → 2020-02-24 (protective stop gap, 4 d) −$3,835.22; D1·TSLA 2017-06-29 → 2017-07-05 (protective stop, 6 d) −$3,377.67; D1·TSLA 2021-02-26 → 2021-03-03 (protective stop, 5 d) −$3,347.54; D1·TSLA 2023-08-02 → 2023-08-07 (protective stop, 5 d) −$3,347.54
  - largest giveback: Growth·TSLA 2025-12-17 → open best mark $1,879.35, final −$27,700.94 (giveback $29,580.29)
  - open at 2026-10-30: Growth·TSLA from 2025-12-17 marked −$27,700.94
- `C24/J/refine/J.B1.h2.s1/R104#1 profit`: D1·TSLA 2018-09-06 → 2018-09-07 (protective stop gap, 1 d) −$9,140.43; D1·TSLA 2020-02-27 → 2020-02-28 (protective stop gap, 1 d) −$8,787.93; Growth·TSLA 2025-12-16 → 2026-01-06 (initial stop, 21 d) −$8,575.25; Growth·TSLA 2021-01-26 → 2021-01-28 (initial stop gap, 2 d) −$8,200.37; Growth·TSLA 2024-12-26 → 2024-12-27 (initial stop, 1 d) −$7,569.49
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C24/J/refine/J.B1.h2.s1/R103#2 robust`: Growth·TSLA 2025-12-16 → 2026-01-06 (initial stop, 21 d) −$9,345.72; D1·TSLA 2020-02-27 → 2020-02-28 (protective stop gap, 1 d) −$8,787.93; Growth·TSLA 2021-01-26 → 2021-01-28 (initial stop gap, 2 d) −$8,200.37; D1·TSLA 2018-09-05 → 2018-09-07 (protective stop gap, 2 d) −$8,141.47; Growth·TSLA 2024-12-26 → 2024-12-27 (initial stop, 1 d) −$8,067.19
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C24/J/refine/J.B1.h2.s1/R101#3 balanced`: D1·TSLA 2020-02-27 → 2020-02-28 (protective stop gap, 1 d) −$8,787.93; Growth·TSLA 2024-12-26 → 2024-12-27 (initial stop, 1 d) −$8,428.23; Growth·TSLA 2025-11-06 → 2025-11-07 (initial stop, 1 d) −$8,336.16; Growth·TSLA 2021-01-26 → 2021-01-28 (initial stop gap, 2 d) −$8,200.37; Growth·TSLA 2020-07-13 → 2020-07-13 (initial stop, 0 d) −$6,968.90
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C24/J/refine/J.D1.h1.s1/R102#2 balanced`: D1·TSLA 2018-09-19 → 2018-09-28 (trailing stop gap, 9 d) −$9,459.12; D1·TSLA 2020-09-02 → 2020-09-03 (trailing stop gap, 1 d) −$4,540.27; D1·TSLA 2016-11-08 → 2016-11-09 (protective stop gap, 1 d) −$4,399.06; D1·TSLA 2026-03-09 → 2026-03-19 (protective stop, 10 d) −$3,897.82; D1·TSLA 2021-02-26 → 2021-03-03 (protective stop, 5 d) −$3,747.14
  - largest giveback: D1·TSLA 2018-09-19 → 2018-09-28 best mark $5,609.74, final −$9,459.12 (giveback $15,068.86)
- `control: New L0 on TSLA (arm J; external VGT phenotype)`: D1·TSLA 2025-02-24 → 2025-03-11 (maximum hold, 15 d) −$34,720.69; D1·TSLA 2022-12-06 → 2022-12-21 (maximum hold, 15 d) −$24,562.67; D1·TSLA 2022-12-22 → 2023-01-06 (maximum hold, 15 d) −$23,063.55; D1·TSLA 2020-02-24 → 2020-03-10 (maximum hold, 15 d) −$21,659.21; D1·TSLA 2022-11-04 → 2022-11-21 (maximum hold, 17 d) −$19,930.09
  - largest giveback: D1·TSLA 2025-02-24 → 2025-03-11 best mark $19.04, final −$34,720.69 (giveback $34,739.72)
- `control: N/original on TSLA (arm J; external VGT phenotype)`: D1·TSLA 2020-03-13 → 2020-03-16 (protective stop gap, 3 d) −$22,959.27; D1·TSLA 2022-02-14 → 2022-02-24 (protective stop gap, 10 d) −$18,907.87; D1·TSLA 2024-07-24 → 2024-08-05 (protective stop gap, 12 d) −$16,889.94; D1·TSLA 2020-03-05 → 2020-03-09 (protective stop gap, 4 d) −$16,832.04; D1·TSLA 2018-03-19 → 2018-03-28 (protective stop gap, 9 d) −$15,261.67
  - largest giveback: D1·TSLA 2022-02-14 → 2022-02-24 best mark $7,556.77, final −$18,907.87 (giveback $26,464.64)

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 TSLA daily (Yahoo Finance, 2010-06-29 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/J/refine/J.B1.h1.s0/R102#1 profit` | B1 | 17 (calendar maximum hold) | 16.3 % | −$22,219 (2015-08-18) | −$16,300 | 0.0 % | 5.9 % below the stop (2015-08-24) | −$22,779 (2022-02-07) | 0.0 % |
| `C21/J/refine/J.D1.h2.s1/R104#1 profit` | D1 | 41 (adaptive hold: the extended bound) | 3.7 % | −$14,855 (2015-08-12) | −$4,340 | 0.0 % | 11.2 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `C23/J/refine/J.C1.h0.s0/R104#1 profit` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 3.1 % | −$14,568 (2015-08-11) | −$3,878 | 0.0 % | 11.5 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | B1 | 9 (calendar maximum hold) | 7.1 % | −$16,265 (2015-08-20) | −$7,100 | 0.0 % | 9.2 % below the stop (2015-08-24) | −$16,325 (2020-03-05) | 0.0 % |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | B1 | 12 (calendar maximum hold) | 6.2 % | −$16,599 (2015-08-14) | −$6,234 | 0.0 % | 10.4 % below the stop (2015-08-24) | −$16,325 (2020-03-05) | 0.0 % |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | B1 | 11 (calendar maximum hold) | 6.5 % | −$16,599 (2015-08-14) | −$6,500 | 0.0 % | 10.1 % below the stop (2015-08-24) | −$16,325 (2020-03-05) | 0.0 % |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | D1 | 35 (adaptive hold: the extended bound) | 3.5 % | −$14,855 (2015-08-12) | −$4,209 | 0.0 % | 11.3 % below the stop (2015-08-24) | −$14,818 (2020-09-04) | 0.0 % |
| `control: New L0 on TSLA (arm J; external VGT phenotype)` | A0 | 15 (calendar maximum hold) | none (family A) | −$37,296 (2010-06-29) | −$17,738 | 0.1 % | — | −$53,234 (2020-03-04) | 0.5 % |
| `control: N/original on TSLA (arm J; external VGT phenotype)` | B0 | 15 (calendar maximum hold) | 12.0 % | −$22,219 (2015-08-18) | −$12,000 | 0.0 % | 10.2 % below the stop (2015-08-24) | −$20,239 (2024-07-29) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | small | 128 | $356,501 / $286,514 | $32,101 / $33,224 / $34,251 | $33,156 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.B1.h2.s1/R104#1 profit` | wide | 128 | $272,698 / $210,967 | $35,401 / $37,713 / $43,411 | $38,001 | 16 (12.5 %; 7.8 %–19.3 %) |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | small | 128 | $362,503 / $320,923 | $29,663 / $30,139 / $31,531 | $30,417 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.B1.h2.s1/R103#2 robust` | wide | 128 | $297,468 / $238,584 | $37,481 / $38,848 / $42,378 | $39,478 | 23 (18.0 %; 12.3 %–25.5 %) |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | small | 128 | $343,337 / $312,965 | $29,746 / $29,746 / $31,134 | $29,925 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | wide | 128 | $288,488 / $238,176 | $32,643 / $34,544 / $40,170 | $35,187 | 5 (3.9 %; 1.7 %–8.8 %) |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | small | 128 | $183,757 / $146,446 | $18,790 / $18,790 / $18,996 | $18,850 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | wide | 128 | $160,793 / $126,719 | $27,172 / $29,658 / $37,718 | $30,200 | 1 (0.8 %; 0.1 %–4.3 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/J/refine/J.B1.h1.s0/R102#1 profit` | $238,403 | 0.0 % | none open | none open | −$1,440 / −$4,849 / −$8,365 | −$2,661 / −$34,632 |
| C21 | `C21/J/refine/J.D1.h2.s1/R104#1 profit` | $410,874 | 0.0 % | none open | none open | −$1,815 / −$3,856 / −$8,485 | −$3,939 / −$6,363 |
| C23 | `C23/J/refine/J.C1.h0.s0/R104#1 profit` | $401,482 | 0.0 % | none open | none open | −$2,672 / −$4,044 / −$8,206 | −$2,351 / −$4,416 |
| C24 | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | $435,551 | 0.0 % | none open | none open | −$2,203 / −$7,307 / −$9,140 | −$7,223 / −$8,575 |

