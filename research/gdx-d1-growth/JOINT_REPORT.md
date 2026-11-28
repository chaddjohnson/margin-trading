# Fully joint GDX D1 + Growth (arm J)

**Verdict: development-qualified at C24, chronologically UNSUPPORTED (net $26,676, DD $45,938), and the C24 primary FAILS
V2 and V3 on 2025–2026 (validation reset DD $60,066).** Not a candidate. Research only; nothing adopted.

## What the arm is

One genome holding a D1·GDX and a Growth·GDX book searched together (48 protected cells = 8 D1 structures × 6 Growth
exit-protection structures), 6 replicates per cell, both books competing for the one slot under the accepted allocator.
Truly joint: neither book is frozen; every configuration is scored as the pair. Five descriptive controls (N/original's
GDX D1 ablation × each 4A GDX Growth incumbent) sit beside it; no informed J lane (no GDX D1 + Growth incumbent pair
exists).

## Findings

1. **Chronology.** C19 `J.B0.h1.s0/R102#1` → 2020–2021 +$13,601, **DD $45,938 (breach)**; C21 `J.D1.h1.s0/R102#1` →
   2022–2023 +$13,125, **DD $44,709 (breach)**; C23 `J.A1.h0.s1/R106#1` → 2024 no lot. Chained: **$26,676 / $45,938 →
   unsupported**. The report-only J-U sub-population chains $44,145 / $75,470.
2. **C24 primary `C24/J/refine/J.B1.h0.s0/R102#1 profit`** (`rc1-5b36825c3dd83028`): development $230,410, DD $20,510;
   confirmation robust $142,544, p90 DD $29,916, breach share 1.0 %. In practice a D1 strategy: 38 D1 lots booking
   $212,648 and **one** Growth lot ($17,762).
3. **Validation (FULL, once): +$8,078 but a reset DD of $60,066** (+$34,691 in 2025, −$26,613 in 2026). **Every one of its
   256 validation-neighbourhood draws breaches the ceiling** (training breach share 2.3 %) — the breach belongs to the
   region, not to the centre.
4. **Against S** (the outcome's joint-vs-sequential comparison): J's primary is $106,409 below S's in centre net with a
   $7,497 lower DD. Against D: −$40,369 centre net. Joint optimization found no Growth use that the D1-first sequence did
   not find with less search.
5. **The J controls** (chosen with later data; descriptive) earn $173k–$194k in development with a $27k DD and +$25,648 to
   +$112,989 in the validation with a $20,386 DD — they are N/original's GDX D1 book plus a 4A Growth book, not an
   independent result.

Sections A–I below carry every figure.

---

_Sections A–I below are generated from the sealed records by `tools/gdx-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 288 / 96 | 6 | 1✗ | 7,833,572 | 7,271,295 | 3,411.9 | 2: 72, 3: 117, 4: 137, 5: 47, 6: 8, 7: 2, 8: 1 | triggers not met 384 | 48 / 48 | converged by the frozen rules |
| C21 | 288 / 96 | 6 | 1✗ | 7,964,762 | 7,296,587 | 4,305.8 | 2: 81, 3: 129, 4: 144, 5: 24, 6: 5, 7: 1 | triggers not met 384 | 48 / 48 | converged by the frozen rules |
| C23 | 336 / 96 | 7 | 1✓ 2✗ | 7,892,560 | 7,180,877 | 5,610.6 | 2: 96, 3: 116, 4: 166, 5: 36, 6: 15, 7: 1, 8: 2 | triggers not met 431; coverage-limited (class only beyond NL0 cap) 1 | 48 / 48 | converged by the frozen rules |
| C24 | 288 / 96 | 6 | 1✗ | 6,926,578 | 6,294,028 | 4,905.3 | 2: 70, 3: 99, 4: 147, 5: 55, 6: 10, 7: 3 | triggers not met 384 | 48 / 48 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 864 | 804 | Q4 52, Q3 8 | N/original GDX D1 (ablation) + 4A primary indep-rise#1: no (Q4 Q5 Q6); N/original GDX D1 (ablation) + 4A informed#2 robust: no (Q4 Q5 Q6); N/original GDX D1 (ablation) + 4A/3C P08: no (Q4 Q5 Q6); N/original GDX D1 (ablation) + 4A/3C P09: no (Q4); N/original GDX D1 (ablation) + Appendix A: no (Q3 Q4) |
| C19 | refine | 507 | 493 | Q4 10, Q3 4 | — |
| C21 | broad | 863 | 854 | Q4 1, Q5 2, Q3 7 | N/original GDX D1 (ablation) + 4A primary indep-rise#1: yes; N/original GDX D1 (ablation) + 4A informed#2 robust: yes; N/original GDX D1 (ablation) + 4A/3C P08: yes; N/original GDX D1 (ablation) + 4A/3C P09: yes; N/original GDX D1 (ablation) + Appendix A: no (Q3) |
| C21 | refine | 532 | 531 | Q3 1 | — |
| C23 | broad | 1,004 | 983 | Q3 12, Q5 2, Q4 8 | N/original GDX D1 (ablation) + 4A primary indep-rise#1: yes; N/original GDX D1 (ablation) + 4A informed#2 robust: yes; N/original GDX D1 (ablation) + 4A/3C P08: yes; N/original GDX D1 (ablation) + 4A/3C P09: no (Q3); N/original GDX D1 (ablation) + Appendix A: no (Q3) |
| C23 | refine | 517 | 510 | Q3 7 | — |
| C24 | broad | 862 | 844 | Q3 13, Q4 5 | N/original GDX D1 (ablation) + 4A primary indep-rise#1: no (Q3); N/original GDX D1 (ablation) + 4A informed#2 robust: yes; N/original GDX D1 (ablation) + 4A/3C P08: yes; N/original GDX D1 (ablation) + 4A/3C P09: no (Q3); N/original GDX D1 (ablation) + Appendix A: no (Q3) |
| C24 | refine | 522 | 519 | Q3 3 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | J | 1,371 / 1,297 | `C19/J/refine/J.B0.h1.s0/R102#1 profit` | $135,219 | $26,407 | 15 | $63,944 / $31,690 | $47,543 / $31,144 | yes |
| C19 | J-P | 1,156 / 1,095 | `C19/J/refine/J.B0.h1.s0/R102#1 profit` | $135,219 | $26,407 | 15 | $63,944 / $31,690 | $47,543 / $31,144 | yes |
| C19 | J-U | 215 / 202 | `C19/J/refine/J.D0.h0.s0/R103#1 profit` | $120,099 | $23,743 | 10 | $66,745 / $26,388 | $48,585 / $26,390 | no (`C19/J/refine/J.D0.h0.s0/R103#4 control alternative`) |
| C21 | J | 1,395 / 1,385 | `C21/J/refine/J.D1.h1.s0/R102#1 profit` | $236,479 | $23,758 | 26 | $175,168 / $28,871 | $156,222 / $27,464 | no (`C21/J/refine/J.A1.h1.s0/R106#1 profit`) |
| C21 | J-P | 1,216 / 1,208 | `C21/J/refine/J.D1.h1.s0/R102#1 profit` | $236,479 | $23,758 | 26 | $175,168 / $28,871 | $156,222 / $27,464 | no (`C21/J/refine/J.A1.h1.s0/R106#1 profit`) |
| C21 | J-U | 179 / 177 | `C21/J/refine/J.B1.h0.s0/R101#1 profit` | $182,215 | $19,254 | 32 | $144,039 / $31,918 | $133,650 / $31,044 | no (`C21/J/refine/J.B1.h0.s0/R104#1 profit`) |
| C23 | J | 1,521 / 1,493 | `C23/J/refine/J.A1.h0.s1/R106#1 profit` | $246,576 | $18,097 | 56 | $132,596 / $33,907 | $116,023 / $33,931 | no (`C23/J/refine/J.A1.h0.s1/R104#1 profit`) |
| C23 | J-P | 1,288 / 1,268 | `C23/J/refine/J.A1.h0.s1/R106#1 profit` | $246,576 | $18,097 | 56 | $132,596 / $33,907 | $116,023 / $33,931 | no (`C23/J/refine/J.A1.h0.s1/R104#1 profit`) |
| C23 | J-U | 233 / 225 | `C23/J/refine/J.A0.h0.s0/R101#1 profit` | $188,770 | $17,281 | 21 | $91,711 / $25,602 | $78,383 / $25,636 | yes |
| C24 | J | 1,384 / 1,363 | `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $230,410 | $20,510 | 39 | $140,397 / $31,054 | $125,477 / $29,916 | no (`C24/J/refine/J.B0.h1.s0/R103#4 control alternative`) |
| C24 | J-P | 1,209 / 1,190 | `C24/J/refine/J.B1.h0.s1/R102#1 profit` | $227,621 | $19,860 | 51 | $135,955 / $31,953 | $115,299 / $32,045 | no (`C24/J/refine/J.B0.h1.s0/R103#4 control alternative`) |
| C24 | J-U | 175 / 173 | `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $230,410 | $20,510 | 39 | $140,397 / $31,054 | $125,477 / $29,916 | no (`C24/J/refine/J.B1.h0.s0/R102#4 profit order`) |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/J/refine/J.B0.h2.s1/R102#2 robust` | `C19/J/refine/J.C1.h1.s0/R104#2 robust` | `C19/J/refine/J.C1.h0.s1/R105#3 balanced` |
| C21 | `C21/J/refine/J.D1.h1.s0/R102#2 robust` | `C21/J/refine/J.A1.h2.s1/R104#2 robust` | `C21/J/broad/J.A1.h2.s1/R102#3 balanced` |
| C23 | `C23/J/refine/J.A1.h0.s1/R103#2 robust` | `C23/J/refine/J.A0.h1.s0/R105#2 robust` | `C23/J/broad/J.A0.h1.s0/R101#3 balanced` |
| C24 | `C24/J/refine/J.B1.h0.s0/R104#2 robust` | `C24/J/refine/J.A1.h2.s1/R104#2 robust` | `C24/J/broad/J.A0.h1.s0/R104#2 robust` |

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/J/refine/J.B0.h1.s0/R102#1 profit` | primary J/original; primary J-P/original; role J/actual-profit; role J-P/actual-profit | $135,219 | $13,601 | $45,938 | $57,283 | 25 (16 losing) | −$45,938 | 210 / 256 (training 2.7 %) |
| C19 | `C19/J/refine/J.D0.h0.s0/R103#1 profit` | primary J-U/original; role J-U/actual-profit; role J-U/robust-profit | $120,099 | $44,336 | $48,911 | $48,911 | 16 (8 losing) | −$18,112 | 255 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.B0.h2.s1/R102#2 robust` | role J/robust-profit; role J-P/robust-profit | $106,639 | $71,112 | $25,524 | $40,390 | 16 (7 losing) | −$23,496 | 46 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.C1.h1.s0/R104#2 robust` | role J/balanced; role J-P/balanced | $77,643 | $51,646 | $25,314 | $25,314 | 8 (1 losing) | −$21,546 | 0 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.C1.h0.s1/R105#3 balanced` | role J/lower-drawdown; role J-P/lower-drawdown | $41,667 | $33,455 | $25,200 | $25,200 | 8 (2 losing) | −$21,546 | 2 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.C0.h0.s0/R105#2 robust` | role J-U/balanced | $52,625 | $14,759 | $58,943 | $58,943 | 5 (1 losing) | −$16,619 | 234 / 256 (training 0.0 %) |
| C19 | `C19/J/refine/J.C0.h0.s0/R102#3 balanced` | role J-U/lower-drawdown | $49,674 | $43,557 | $24,174 | $24,174 | 12 (3 losing) | −$18,768 | 88 / 256 (training 0.0 %) |
| C19 | `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | control control: N/original GDX D1 (ablation) + 4A primary indep-rise#1 | $316 | $108,682 | $21,915 | $24,924 | 12 (4 losing) | −$7,748 | 0 / 256 (training 0.0 %) |
| C19 | `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | control control: N/original GDX D1 (ablation) + 4A informed#2 robust | $316 | $104,317 | $20,954 | $24,924 | 16 (5 losing) | −$8,550 | 2 / 256 (training 1.2 %) |
| C19 | `control: N/original GDX D1 (ablation) + 4A/3C P08` | control control: N/original GDX D1 (ablation) + 4A/3C P08 | $316 | $106,371 | $18,269 | $24,924 | 14 (4 losing) | −$8,550 | 0 / 256 (training 0.0 %) |
| C19 | `control: N/original GDX D1 (ablation) + 4A/3C P09` | control control: N/original GDX D1 (ablation) + 4A/3C P09 | $4,452 | $89,073 | $17,698 | $22,490 | 12 (3 losing) | −$7,748 | 0 / 256 (training 2.3 %) |
| C19 | `control: N/original GDX D1 (ablation) + Appendix A` | control control: N/original GDX D1 (ablation) + Appendix A | $31,363 | $100,569 | $18,557 | $24,924 | 15 (4 losing) | −$7,748 | 12 / 256 (training 17.2 %) |
| C21 | `C21/J/refine/J.D1.h1.s0/R102#1 profit` | primary J/original; primary J-P/original; role J/actual-profit; role J-P/actual-profit | $236,479 | $13,125 | $44,709 | $44,709 | 13 (6 losing) | −$9,570 | 170 / 256 (training 1.2 %) |
| C21 | `C21/J/refine/J.B1.h0.s0/R101#1 profit` | primary J-U/original; role J-U/actual-profit | $182,215 | −$141 | $49,004 | $49,004 | 17 (12 losing) | −$11,799 | 216 / 256 (training 4.3 %) |
| C21 | `C21/J/refine/J.D1.h1.s0/R102#2 robust` | role J/robust-profit; role J-P/robust-profit | $236,174 | $11,744 | $46,090 | $46,090 | 14 (7 losing) | −$9,570 | 171 / 256 (training 1.2 %) |
| C21 | `C21/J/refine/J.A1.h2.s1/R104#2 robust` | role J/balanced; role J-P/balanced | $168,933 | −$9,949 | $45,729 | $45,729 | 15 (8 losing) | −$14,421 | 255 / 256 (training 0.0 %) |
| C21 | `C21/J/broad/J.A1.h2.s1/R102#3 balanced` | role J/lower-drawdown; role J-P/lower-drawdown | $147,472 | $17,114 | $30,545 | $35,310 | 11 (4 losing) | −$14,520 | 31 / 256 (training 0.0 %) |
| C21 | `C21/J/refine/J.B1.h0.s0/R101#6 profit order` | role J-U/robust-profit | $163,570 | $35,167 | $34,326 | $34,326 | 15 (7 losing) | −$11,619 | 207 / 256 (training 0.0 %) |
| C21 | `C21/J/refine/J.B1.h0.s0/R105#3 balanced` | role J-U/balanced | $124,625 | $3,784 | $9,182 | $17,281 | 2 (0 losing) | −$3,148 | 0 / 256 (training 0.0 %) |
| C21 | `C21/J/refine/J.B1.h0.s0/R101#3 balanced` | role J-U/lower-drawdown | $118,937 | $27,791 | $18,100 | $18,692 | 7 (2 losing) | −$6,615 | 0 / 256 (training 0.0 %) |
| C21 | `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | control control: N/original GDX D1 (ablation) + 4A primary indep-rise#1 | $108,998 | $54,769 | $26,985 | $26,985 | 15 (5 losing) | −$12,321 | 24 / 256 (training 0.8 %) |
| C21 | `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | control control: N/original GDX D1 (ablation) + 4A informed#2 robust | $104,633 | $59,022 | $26,985 | $26,985 | 16 (6 losing) | −$12,321 | 9 / 256 (training 2.3 %) |
| C21 | `control: N/original GDX D1 (ablation) + 4A/3C P08` | control control: N/original GDX D1 (ablation) + 4A/3C P08 | $106,687 | $56,499 | $26,985 | $26,985 | 15 (6 losing) | −$12,321 | 6 / 256 (training 0.4 %) |
| C21 | `control: N/original GDX D1 (ablation) + 4A/3C P09` | control control: N/original GDX D1 (ablation) + 4A/3C P09 | $93,525 | $56,034 | $27,053 | $27,053 | 13 (5 losing) | −$12,321 | 39 / 256 (training 3.5 %) |
| C21 | `control: N/original GDX D1 (ablation) + Appendix A` | control control: N/original GDX D1 (ablation) + Appendix A | $131,932 | $51,668 | $27,053 | $27,053 | 12 (5 losing) | −$12,321 | 45 / 256 (training 30.5 %) |
| C23 | `C23/J/refine/J.A1.h0.s1/R106#1 profit` | primary J/original; primary J-P/original; role J/actual-profit; role J-P/actual-profit | $246,576 | $0 | $0 | $18,097 | 0 (0 losing) | — | 0 / 256 (training 6.3 %) |
| C23 | `C23/J/refine/J.A0.h0.s0/R101#1 profit` | primary J-U/original; role J-U/actual-profit | $188,770 | $0 | $0 | $17,281 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/J/refine/J.A1.h0.s1/R103#2 robust` | role J/robust-profit; role J-P/robust-profit | $202,046 | $0 | $0 | $26,010 | 0 (0 losing) | — | 0 / 256 (training 1.2 %) |
| C23 | `C23/J/refine/J.A0.h1.s0/R105#2 robust` | role J/balanced; role J-P/balanced | $144,041 | −$1,119 | $5,853 | $17,744 | 1 (1 losing) | −$1,119 | 0 / 256 (training 0.0 %) |
| C23 | `C23/J/broad/J.A0.h1.s0/R101#3 balanced` | role J/lower-drawdown; role J-P/lower-drawdown | $98,633 | $0 | $0 | $17,281 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/J/refine/J.A0.h0.s0/R102#2 robust` | role J-U/robust-profit | $163,077 | $0 | $0 | $19,563 | 0 (0 losing) | — | 0 / 256 (training 5.9 %) |
| C23 | `C23/J/refine/J.D0.h0.s0/R104#3 balanced` | role J-U/balanced | $148,431 | −$784 | $5,873 | $17,281 | 1 (1 losing) | −$784 | 0 / 256 (training 0.0 %) |
| C23 | `C23/J/refine/J.A0.h0.s0/R102#3 balanced` | role J-U/lower-drawdown | $115,413 | $0 | $0 | $17,281 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | control control: N/original GDX D1 (ablation) + 4A primary indep-rise#1 | $163,767 | $21,373 | $13,030 | $26,985 | 2 (1 losing) | −$7,803 | 0 / 256 (training 10.5 %) |
| C23 | `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | control control: N/original GDX D1 (ablation) + 4A informed#2 robust | $163,654 | $28,090 | $8,840 | $26,985 | 2 (1 losing) | −$1,976 | 0 / 256 (training 9.4 %) |
| C23 | `control: N/original GDX D1 (ablation) + 4A/3C P08` | control control: N/original GDX D1 (ablation) + 4A/3C P08 | $163,186 | $28,090 | $8,840 | $26,985 | 2 (1 losing) | −$1,976 | 0 / 256 (training 3.5 %) |
| C23 | `control: N/original GDX D1 (ablation) + 4A/3C P09` | control control: N/original GDX D1 (ablation) + 4A/3C P09 | $149,559 | $28,090 | $8,840 | $27,053 | 2 (1 losing) | −$1,976 | 0 / 256 (training 16.0 %) |
| C23 | `control: N/original GDX D1 (ablation) + Appendix A` | control control: N/original GDX D1 (ablation) + Appendix A | $183,600 | $41,535 | $11,335 | $27,053 | 5 (1 losing) | −$1,976 | 2 / 256 (training 44.5 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| J/original | `C19/J/refine/J.B0.h1.s0/R102#1 profit` → `C21/J/refine/J.D1.h1.s0/R102#1 profit` → `C23/J/refine/J.A1.h0.s1/R106#1 profit` | $26,676 | $45,938 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J-P/original (report-only) | `C19/J/refine/J.B0.h1.s0/R102#1 profit` → `C21/J/refine/J.D1.h1.s0/R102#1 profit` → `C23/J/refine/J.A1.h0.s1/R106#1 profit` | $26,676 | $45,938 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J-U/original (report-only) | `C19/J/refine/J.D0.h0.s0/R103#1 profit` → `C21/J/refine/J.B1.h0.s0/R101#1 profit` → `C23/J/refine/J.A0.h0.s0/R101#1 profit` | $44,145 | $75,470 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| J: role robust-profit (descriptive) | `C19/J/refine/J.B0.h2.s1/R102#2 robust` → `C21/J/refine/J.D1.h1.s0/R102#2 robust` → `C23/J/refine/J.A1.h0.s1/R103#2 robust` | $82,856 | $46,090 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J: role balanced (descriptive) | `C19/J/refine/J.C1.h1.s0/R104#2 robust` → `C21/J/refine/J.A1.h2.s1/R104#2 robust` → `C23/J/refine/J.A0.h1.s0/R105#2 robust` | $40,478 | $54,685 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| J: role lower-drawdown (descriptive) | `C19/J/refine/J.C1.h0.s1/R105#3 balanced` → `C21/J/broad/J.A1.h2.s1/R102#3 balanced` → `C23/J/broad/J.A0.h1.s0/R101#3 balanced` | $50,519 | $44,638 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind (population) | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist (J) | `C24/J/refine/J.B1.h0.s0/R102#1 profit` | primary J | pass | $230,410.14 | $259,060 | $24,622 | $4,028 | $20,510.18 (20.5 %) | 39 31/8 | $8,077.80 | $60,065.70 | $238,487.94 | $60,065.70 | ✓ ✗ ✗ |
| finalist (J) | `C24/J/refine/J.B1.h0.s0/R104#2 robust` | role J/robust-profit | pass | $190,251.62 | $219,475 | $25,315 | $3,908 | $27,047.80 (27.1 %) | 38 26/12 | $26,794.35 | $50,640.70 | $217,045.97 | $50,640.70 | ✓ ✗ ✗ |
| finalist (J) | `C24/J/refine/J.A1.h2.s1/R104#2 robust` | role J/balanced | pass | $175,796.07 | $191,247 | $13,256 | $2,195 | $17,744.39 (17.7 %) | 21 16/5 | $52,268.57 | $42,847.71 | $228,064.65 | $42,847.71 | ✓ ✗ ✗ |
| finalist (J) | `C24/J/broad/J.A0.h1.s0/R104#2 robust` | role J/lower-drawdown | pass | $87,568.42 | $91,447 | $2,833 | $1,045 | $17,280.74 (17.3 %) | 10 6/4 | $12,614.31 | $16,488.60 | $100,182.72 | $17,280.74 | ✓ ✓ ✓ |
| control (control:J) | `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | external control | fails Q3 | $185,139.47 | $218,683 | $29,336 | $4,207 | $26,984.82 (27.0 %) | 41 24/17 | $25,648.34 | $20,385.99 | $210,787.82 | $26,984.82 | ✓ ✓ ✓ |
| control (control:J) | `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | external control | pass | $191,743.86 | $223,516 | $27,063 | $4,709 | $26,984.82 (27.0 %) | 46 27/19 | $65,135.39 | $20,385.99 | $256,879.25 | $26,984.82 | ✓ ✓ ✓ |
| control (control:J) | `control: N/original GDX D1 (ablation) + 4A/3C P08` | external control | pass | $191,275.30 | $221,180 | $25,496 | $4,408 | $26,984.82 (27.0 %) | 43 25/18 | $25,648.34 | $20,385.99 | $216,923.64 | $26,984.82 | ✓ ✓ ✓ |
| control (control:J) | `control: N/original GDX D1 (ablation) + 4A/3C P09` | external control | fails Q3 | $177,648.28 | $208,189 | $26,038 | $4,502 | $27,053.38 (27.1 %) | 44 25/19 | $25,648.34 | $20,385.99 | $203,296.63 | $27,053.38 | ✓ ✓ ✓ |
| control (control:J) | `control: N/original GDX D1 (ablation) + Appendix A` | external control | fails Q3 | $225,135.78 | $266,602 | $36,436 | $5,031 | $27,053.38 (27.1 %) | 49 32/17 | $112,989.22 | $20,385.99 | $338,124.99 | $27,053.38 | ✓ ✓ ✓ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $20,510 | $7,170 / $7,217 | $11,500 / $11,549 | −$7,170 | −$4,997 | 26.7 % | 0.0 % | 47.7 % | $212,648 / $17,762 |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | $27,048 | $16,454 / $16,496 | $17,321 / $17,371 | −$16,454 | −$7,264 | 27.3 % | 0.0 % | 54.3 % | $179,265 / $10,986 |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | $17,744 | $10,141 / $10,186 | $10,141 / $10,186 | −$10,141 | −$6,643 | 14.4 % | 0.0 % | 54.5 % | $176,361 / −$565 |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | $17,281 | $6,272 / $6,319 | $7,832 / $7,879 | −$6,272 | −$4,655 | 3.2 % | 0.0 % | 108.1 % | $92,790 / −$5,222 |
| `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | $26,985 | $12,321 / $12,365 | $19,991 / $20,040 | −$12,321 | −$10,070 | 34.1 % | 0.0 % | 51.5 % | $90,348 / $94,791 |
| `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | $26,985 | $12,321 / $12,365 | $19,991 / $20,040 | −$12,321 | −$10,070 | 29.1 % | 0.0 % | 47.2 % | $122,572 / $69,171 |
| `control: N/original GDX D1 (ablation) + 4A/3C P08` | $26,985 | $12,321 / $12,365 | $19,991 / $20,040 | −$12,321 | −$10,070 | 27.4 % | 0.0 % | 46.9 % | $125,029 / $66,246 |
| `control: N/original GDX D1 (ablation) + 4A/3C P09` | $27,053 | $12,321 / $12,365 | $20,059 / $20,108 | −$12,321 | −$10,070 | 28.0 % | 0.0 % | 41.6 % | $125,029 / $52,619 |
| `control: N/original GDX D1 (ablation) + Appendix A` | $27,053 | $12,321 / $12,365 | $20,059 / $20,108 | −$12,321 | −$10,070 | 38.8 % | 0.0 % | 28.7 % | $163,925 / $61,211 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $159,611 / $125,477 / $142,544 | $29,916 / $31,630 | $32,232 / $43,939 | 1.0 % (0.4 %–2.6 %) | $140,397 / $31,054 | $226,257 / $20,911 | $215,489 / $19,802 | $223,695 | $217,644 / $19,651 | $228,683 / $20,495 |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | $184,496 / $162,501 / $173,499 | $33,269 / $34,629 | $35,768 / $42,425 | 4.4 % (2.8 %–7.0 %) | $175,872 / $33,283 | $186,238 / $27,249 | $181,360 / $27,650 | $183,348 | $183,301 / $27,617 | $189,162 / $27,136 |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | $167,871 / $143,340 / $155,605 | $20,636 / $21,515 | $23,024 / $30,612 | 0.0 % (0.0 %–1.0 %) | $155,918 / $20,636 | $173,508 / $17,736 | $171,046 / $17,718 | $174,294 | $171,132 / $17,744 | $173,742 / $17,744 |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | $93,184 / $64,520 / $78,852 | $17,281 / $17,786 | $18,224 / $21,532 | 0.0 % (0.0 %–1.0 %) | $78,001 / $17,281 | $86,479 / $17,272 | $84,302 / $17,255 | $86,796 | $85,825 / $17,281 | $85,881 / $17,281 |
| `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | $146,693 / $111,007 / $128,850 | $35,026 / $35,900 | $37,097 / $49,447 | 10.2 % (7.5 %–13.6 %) | $125,969 / $35,012 | $180,827 / $27,365 | $170,633 / $28,125 | $177,830 | $178,831 / $27,246 | $186,007 / $27,002 |
| `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | $158,654 / $123,068 / $140,861 | $33,451 / $37,440 | $39,235 / $61,203 | 7.0 % (4.9 %–10.0 %) | $139,439 / $32,714 | $184,226 / $27,365 | $173,159 / $28,125 | $182,461 | $184,539 / $27,246 | $192,667 / $27,002 |
| `control: N/original GDX D1 (ablation) + 4A/3C P08` | $161,908 / $125,609 / $143,758 | $31,377 / $34,263 | $34,228 / $40,866 | 4.2 % (2.6 %–6.7 %) | $143,311 / $30,883 | $187,241 / $27,365 | $176,569 / $28,125 | $185,509 | $184,580 / $27,246 | $192,239 / $27,002 |
| `control: N/original GDX D1 (ablation) + 4A/3C P09` | $156,910 / $118,190 / $137,550 | $35,728 / $36,679 | $37,355 / $44,193 | 18.0 % (14.4 %–22.1 %) | $136,407 / $35,875 | $173,047 / $27,434 | $162,002 / $28,194 | $171,238 | $170,728 / $27,314 | $178,612 / $27,071 |
| `control: N/original GDX D1 (ablation) + Appendix A` | $145,043 / $98,847 / $121,945 | $42,307 / $44,946 | $46,235 / $58,887 | 41.1 % (36.3 %–46.1 %) | $124,084 / $43,963 | $208,721 / $32,389 | $189,131 / $41,436 | $205,095 | $205,094 / $32,828 | $224,798 / $27,071 |

### Causal removals (development centre; the other book switched off)

| Label | Without D1: net / DD | Without Growth: net / DD | Participation (funded principal-days share) |
|---|---:|---:|---:|
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $17,762 / $19,157 | $212,648 / $17,528 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | $10,986 / $22,293 | $179,265 / $24,447 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | $1,646 / $14,574 | $176,361 / $17,744 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"token"} |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | −$5,222 / $10,344 | $92,790 / $17,281 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | $139,668 / $17,484 | $163,925 / $27,053 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | $110,159 / $18,841 | $163,925 / $27,053 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `control: N/original GDX D1 (ablation) + 4A/3C P08` | $121,009 / $18,841 | $163,925 / $27,053 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `control: N/original GDX D1 (ablation) + 4A/3C P09` | $100,056 / $17,744 | $163,925 / $27,053 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `control: N/original GDX D1 (ablation) + Appendix A` | $53,817 / $17,710 | $163,925 / $27,053 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $5,587 | $13,420 | $5,307 | $0 | $113,641 | $16,668 | $13,978 | $35,295 | $26,514 | $34,691 | −$26,613 |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | $1,071 | $5,546 | $2,792 | $0 | $105,783 | $14,016 | $16,929 | $17,867 | $26,248 | $49,122 | −$22,327 |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | $10,831 | $6,465 | −$6,509 | $0 | $104,640 | $2,250 | $4,542 | $27,180 | $26,398 | $55,790 | −$3,522 |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | −$993 | $0 | −$5,222 | $0 | $94,705 | $0 | −$922 | $0 | $0 | $0 | $12,614 |
| `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | −$188 | −$5,264 | $5,767 | $0 | $93,455 | $15,227 | $22,480 | $32,289 | $21,373 | $0 | $25,648 |
| `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | −$188 | −$5,264 | $5,767 | $0 | $91,388 | $12,929 | $25,275 | $33,746 | $28,090 | $39,487 | $25,648 |
| `control: N/original GDX D1 (ablation) + 4A/3C P08` | −$188 | −$5,264 | $5,767 | $0 | $91,144 | $15,227 | $26,038 | $30,460 | $28,090 | $0 | $25,648 |
| `control: N/original GDX D1 (ablation) + 4A/3C P09` | −$188 | $1,882 | $2,757 | $0 | $73,846 | $15,227 | $25,216 | $30,818 | $28,090 | $0 | $25,648 |
| `control: N/original GDX D1 (ablation) + Appendix A` | $24,314 | −$5,264 | $5,767 | $6,545 | $85,343 | $15,227 | $20,850 | $30,818 | $41,535 | $70,842 | $42,147 |

### Parameter vectors

- `C24/J/refine/J.B1.h0.s0/R102#1 profit` — cell `J.B1.h0.s0`
  - D1·GDX: targetPercentChange 267, trailingBuyPercentage 1, trailingStopPercentage 55, maximumHoldDays 26, tickWindowSize 158, intradayLossBuffer 10, pullback 184, continuationWindow 83; controls {"d":46,"k":2,"r":960,"c":76}; D1 arming from the first day: false
  - Growth·GDX: entryMethod trend_breakout, breakoutSmaSessions 106, breakoutSlopeComparisonSessions 107, breakoutPriorHighSessions 71, trendFilterEnabled true, trendMethod price_change, trendChangeLookbackSessions 13, trendChangeMinimumReturnPercent -4, drawdownRecoveryGateEnabled true, dipLookbackSessions 18, dipThresholdPercent 2.3, recoveryRetracementPercent 98, recoveryConfirmationSessions 6, trailingStopPercent 11, maximumHoldEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 74, uptrendSmaBars 179, uptrendSlopeBars 20, uptrendMinimumRisePercent 2.5, pullbackMinimumPercent 2.3, pullbackMaximumPercent 5, recoveryPercent 2.63
- `C24/J/refine/J.B1.h0.s0/R104#2 robust` — cell `J.B1.h0.s0`
  - D1·GDX: targetPercentChange 267, trailingBuyPercentage 1, trailingStopPercentage 67, maximumHoldDays 27, tickWindowSize 169, intradayLossBuffer 5, pullback 197, continuationWindow 108; controls {"d":41,"k":3,"r":980,"c":73}; D1 arming from the first day: false
  - Growth·GDX: entryMethod trend_breakout, breakoutSmaSessions 129, breakoutSlopeComparisonSessions 96, breakoutPriorHighSessions 61, trendFilterEnabled true, trendMethod price_change, trendChangeLookbackSessions 14, trendChangeMinimumReturnPercent -4.5, drawdownRecoveryGateEnabled true, dipLookbackSessions 10, dipThresholdPercent 2.1, recoveryRetracementPercent 100, recoveryConfirmationSessions 6, trailingStopPercent 5.5, maximumHoldEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 105, uptrendSmaBars 100, uptrendSlopeBars 19, uptrendMinimumRisePercent 3.25, pullbackMinimumPercent 2.4, pullbackMaximumPercent 10, recoveryPercent 1.51
- `C24/J/refine/J.A1.h2.s1/R104#2 robust` — cell `J.A1.h2.s1`
  - D1·GDX: targetPercentChange 266, trailingBuyPercentage 12, trailingStopPercentage 58, maximumHoldDays 23, tickWindowSize 244, intradayLossBuffer 19, pullback 193, continuationWindow 199; controls {"k":1,"r":910,"c":196}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.9, recentLowLookbackBars 128, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy reset_renew, eligibilityMaxAgeSessions 30, eligibilityResetDropPercent 5.5, eligibilityRenewalReboundPercent 5.2, drawdownRecoveryGateEnabled true, dipLookbackSessions 87, dipThresholdPercent 2.4, recoveryRetracementPercent 53.6, recoveryConfirmationSessions 9, trailingStopPercent 3.5, maximumHoldEnabled true, maximumHoldDays 14, intradayLossBufferEnabled true, intradayLossBufferPercent 0.2, initialStopEnabled true, initialStopAtrSessions 56, initialStopAtrMultiple 1.9, retentionEnabled true, retentionSellPercent 59, retentionSmaSessions 80, retentionClosesBelow 4, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 50, uptrendSmaBars 129, uptrendSlopeBars 13, uptrendMinimumRisePercent 5, pullbackMinimumPercent 2.2, pullbackMaximumPercent 10.1, recoveryPercent 4.06
- `C24/J/broad/J.A0.h1.s0/R104#2 robust` — cell `J.A0.h1.s0`
  - D1·GDX: targetPercentChange 257, trailingBuyPercentage 4, trailingStopPercentage 57, maximumHoldDays 7, tickWindowSize 26, intradayLossBuffer 9, pullback 155, continuationWindow 33; controls {}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4, recentLowLookbackBars 200, trendFilterEnabled true, trendMethod rising_sma, trendSmaSessions 160, trendSmaComparisonSessions 21, eligibilityEnabled true, eligibilityPolicy time_limited, eligibilityMaxAgeSessions 19, drawdownRecoveryGateEnabled false, trailingStopPercent 5.5, maximumHoldEnabled true, maximumHoldDays 10, intradayLossBufferEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 50, uptrendSmaBars 180, uptrendSlopeBars 11, uptrendMinimumRisePercent 4.5, pullbackMinimumPercent 2, pullbackMaximumPercent 14, recoveryPercent 2
- `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` — cell `J.D1.h1.s1`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 2, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 24, pullback 152, continuationWindow 10; controls {"d":159,"hx":28,"g":70,"k":3,"r":700,"c":60}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.2, recentLowLookbackBars 73, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 20, eligibilityMinimumAdvancePercent 8.9, drawdownRecoveryGateEnabled false, trailingStopPercent 7, maximumHoldEnabled true, maximumHoldDays 29, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 40, initialStopAtrMultiple 4.3, retentionEnabled true, retentionSellPercent 81, retentionSmaSessions 24, retentionClosesBelow 5, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 66, classicPullbackPercent 9.2, classicReboundPercent 0.8
- `control: N/original GDX D1 (ablation) + 4A informed#2 robust` — cell `J.D1.h2.s1`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 2, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 24, pullback 152, continuationWindow 10; controls {"d":159,"hx":28,"g":70,"k":3,"r":700,"c":60}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.1, recentLowLookbackBars 148, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 25, eligibilityMinimumAdvancePercent 7.3, drawdownRecoveryGateEnabled false, trailingStopPercent 5.8, maximumHoldEnabled true, maximumHoldDays 14, intradayLossBufferEnabled true, intradayLossBufferPercent 2.7, initialStopEnabled true, initialStopAtrSessions 47, initialStopAtrMultiple 3.7, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 103, classicPullbackPercent 7.7, classicReboundPercent 3.52
- `control: N/original GDX D1 (ablation) + 4A/3C P08` — cell `J.D1.h2.s1`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 2, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 24, pullback 152, continuationWindow 10; controls {"d":159,"hx":28,"g":70,"k":3,"r":700,"c":60}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.6, recentLowLookbackBars 138, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 24, eligibilityMinimumAdvancePercent 8.2, drawdownRecoveryGateEnabled false, trailingStopPercent 5.5, maximumHoldEnabled true, maximumHoldDays 14, intradayLossBufferEnabled true, intradayLossBufferPercent 2.8, initialStopEnabled true, initialStopAtrSessions 48, initialStopAtrMultiple 3.8, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 104, classicPullbackPercent 9.1, classicReboundPercent 3.5
- `control: N/original GDX D1 (ablation) + 4A/3C P09` — cell `J.D1.h1.s1`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 2, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 24, pullback 152, continuationWindow 10; controls {"d":159,"hx":28,"g":70,"k":3,"r":700,"c":60}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.5, recentLowLookbackBars 155, trendFilterEnabled true, trendMethod regression_slope, trendSlopeLookbackSessions 100, trendSlopeMinimumPercent -4.1, eligibilityEnabled true, eligibilityPolicy reset_renew, eligibilityMaxAgeSessions 10, eligibilityResetDropPercent 5.5, eligibilityRenewalReboundPercent 5.2, drawdownRecoveryGateEnabled false, trailingStopPercent 5.6, maximumHoldEnabled true, maximumHoldDays 6, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 32, initialStopAtrMultiple 3, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 17, classicPullbackPercent 11.7, classicReboundPercent 2.82
- `control: N/original GDX D1 (ablation) + Appendix A` — cell `J.D1.h0.s1`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 2, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 24, pullback 152, continuationWindow 10; controls {"d":159,"hx":28,"g":70,"k":3,"r":700,"c":60}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3, recentLowLookbackBars 22, trendFilterEnabled true, trendMethod price_change, trendChangeLookbackSessions 30, trendChangeMinimumReturnPercent -2, eligibilityEnabled true, eligibilityPolicy time_limited, eligibilityMaxAgeSessions 20, drawdownRecoveryGateEnabled true, dipLookbackSessions 60, dipThresholdPercent 10, recoveryRetracementPercent 49, recoveryConfirmationSessions 2, trailingStopPercent 7, maximumHoldEnabled false, initialStopEnabled true, initialStopAtrSessions 20, initialStopAtrMultiple 2, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 60, uptrendSmaBars 50, uptrendSlopeBars 10, uptrendMinimumRisePercent 0, pullbackMinimumPercent 1.5, pullbackMaximumPercent 8, recoveryPercent 2

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/J/refine/J.B0.h1.s0/R102#1 profit` | C19 primary J | $174,879.32 | 98 | 32.6 % | 8 / 206 | 55.7 % (1,517 / 2,723) | $705,234 / $20,375 | −$45,938 | Growth refused (slot occupied) ← occupant D1: 8; D1 refused (slot occupied) ← occupant Growth: 4 | $59,453 / $62,157 / $72,969 |
| `C21/J/refine/J.D1.h1.s0/R102#1 profit` | C21 primary J | $244,637.15 | 52 | 58.8 % | 15.5 / 211 | 38.8 % (1,057 / 2,723) | $464,206 / $20,384 | −$14,281 | Growth refused (slot occupied) ← occupant D1: 7 | $35,711 / $39,997 / $57,141 |
| `C23/J/refine/J.A1.h0.s1/R106#1 profit` | C23 primary J | $208,452.48 | 70 | 47.8 % | 6.5 / 65 | 21.7 % (591 / 2,723) | $397,882 / $16,065 | −$10,667 | none | $33,001 / $37,467 / $55,334 |
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | C24 primary J | $238,487.94 | 43 | 81.0 % | 20 / 245 | 32.6 % (889 / 2,723) | $359,963 / $41,775 | −$43,680 | D1 refused (slot occupied) ← occupant Growth: 8 | $57,760 / $60,576 / $71,840 |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | C24 role J/robust-profit | $217,045.97 | 43 | 71.4 % | 22 / 245 | 33.8 % (919 / 2,723) | $370,830 / $41,775 | −$43,680 | D1 refused (slot occupied) ← occupant Growth: 11 | $57,760 / $60,576 / $71,840 |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | C24 role J/balanced | $228,064.65 | 27 | 77.8 % | 22 / 427 | 23.4 % (636 / 2,723) | $242,390 / $40,131 | −$13,973 | Growth refused (slot occupied) ← occupant D1: 1 | $35,479 / $39,781 / $56,986 |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | C24 role J/lower-drawdown | $100,182.72 | 14 | 64.3 % | 7 / 28 | 3.2 % (86 / 2,723) | $90,674 / $11,109 | −$9,991 | none | $32,494 / $36,994 / $54,996 |
| `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | control | $210,787.82 | 51 | 58.0 % | 17 / 74 | 30.2 % (822 / 2,723) | $385,807 / $12,213 | −$12,321 | D1 refused (slot occupied) ← occupant Growth: 5; Growth refused (slot occupied) ← occupant D1: 2 | $34,241 / $38,625 / $56,160 |
| `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | control | $256,879.25 | 60 | 59.3 % | 14 / 53 | 28.3 % (770 / 2,723) | $426,440 / $12,213 | −$12,321 | Growth refused (slot occupied) ← occupant D1: 5; D1 refused (slot occupied) ← occupant Growth: 2 | $34,241 / $38,625 / $56,160 |
| `control: N/original GDX D1 (ablation) + 4A/3C P08` | control | $216,923.64 | 53 | 57.7 % | 14 / 50 | 24.6 % (669 / 2,723) | $385,929 / $12,213 | −$12,321 | D1 refused (slot occupied) ← occupant Growth: 1; Growth refused (slot occupied) ← occupant D1: 4 | $34,241 / $38,625 / $56,160 |
| `control: N/original GDX D1 (ablation) + 4A/3C P09` | control | $203,296.63 | 54 | 56.6 % | 14 / 50 | 25.0 % (680 / 2,723) | $382,699 / $12,213 | −$12,321 | Growth refused (slot occupied) ← occupant D1: 7; D1 refused (slot occupied) ← occupant Growth: 1 | $34,241 / $38,625 / $56,160 |
| `control: N/original GDX D1 (ablation) + Appendix A` | control | $338,124.99 | 65 | 67.2 % | 18 / 163 | 40.6 % (1,106 / 2,723) | $504,822 / $12,213 | −$12,321 | Growth refused (slot occupied) ← occupant D1: 1 | $34,241 / $38,625 / $56,160 |

Worst closed trades of each subject (net after costs and interest):

- `C19/J/refine/J.B0.h1.s0/R102#1 profit`: Growth·GDX 2020-03-06 → 2020-03-30 (maximum hold, 24 d) −$18,568.42; D1·GDX 2026-06-02 → 2026-06-08 (maximum hold, 6 d) −$8,684.22; Growth·GDX 2024-07-17 → 2024-08-12 (maximum hold, 26 d) −$8,587.75; D1·GDX 2026-07-14 → 2026-07-20 (maximum hold, 6 d) −$6,836.63; D1·GDX 2026-06-22 → 2026-06-26 (maximum hold, 4 d) −$6,378.38
  - largest giveback: Growth·GDX 2026-01-15 → 2026-03-16 best mark $17,473.66, final −$2,901.29 (giveback $20,374.95)
- `C21/J/refine/J.D1.h1.s0/R102#1 profit`: Growth·GDX 2026-02-24 → 2026-03-17 (maximum hold, 21 d) −$11,432.40; D1·GDX 2026-07-07 → 2026-07-17 (protective stop, 10 d) −$10,990.73; D1·GDX 2026-04-21 → 2026-05-04 (maximum hold, 13 d) −$9,662.57; D1·GDX 2022-08-19 → 2022-09-01 (maximum hold, 13 d) −$9,520.26; D1·GDX 2026-09-14 → 2026-10-05 (maximum hold, 21 d) −$7,665.45
  - largest giveback: Growth·GDX 2026-02-24 → 2026-03-17 best mark $8,951.53, final −$11,432.40 (giveback $20,383.93)
  - open at 2026-10-30: D1·GDX from 2026-10-22 marked −$6,618.41
- `C23/J/refine/J.A1.h0.s1/R106#1 profit`: Growth·GDX 2026-03-02 → 2026-03-03 (initial stop, 1 d) −$10,667.33; Growth·GDX 2026-01-23 → 2026-01-30 (initial stop, 7 d) −$8,890.96; D1·GDX 2026-07-14 → 2026-07-20 (maximum hold, 6 d) −$6,603.97; D1·GDX 2026-06-22 → 2026-06-26 (maximum hold, 4 d) −$6,378.38; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71
  - largest giveback: Growth·GDX 2026-01-23 → 2026-01-30 best mark $7,173.70, final −$8,890.96 (giveback $16,064.66)
  - open at 2026-10-30: D1·GDX from 2026-10-27 marked −$5,490.69
- `C24/J/refine/J.B1.h0.s0/R102#1 profit`: D1·GDX 2021-08-09 → 2021-08-19 (protective stop, 10 d) −$4,996.72; D1·GDX 2022-06-14 → 2022-06-23 (protective stop, 9 d) −$4,966.59; D1·GDX 2021-02-18 → 2021-02-26 (protective stop, 8 d) −$4,936.45; D1·GDX 2022-06-24 → 2022-06-30 (protective stop, 6 d) −$4,876.17; D1·GDX 2017-02-27 → 2017-03-02 (protective stop, 3 d) −$4,785.76
  - largest giveback: Growth·GDX 2026-02-27 → open best mark $1,282.64, final −$40,492.79 (giveback $41,775.43)
  - open at 2026-10-30: Growth·GDX from 2026-02-27 marked −$40,492.79
- `C24/J/refine/J.B1.h0.s0/R104#2 robust`: D1·GDX 2016-11-25 → 2016-12-15 (protective stop gap, 20 d) −$7,263.96; D1·GDX 2018-08-16 → 2018-09-11 (protective stop gap, 26 d) −$5,212.70; D1·GDX 2021-02-04 → 2021-02-26 (protective stop, 22 d) −$4,858.87; D1·GDX 2021-08-10 → 2021-08-19 (protective stop, 9 d) −$4,467.08; D1·GDX 2022-06-14 → 2022-06-23 (protective stop, 9 d) −$4,467.08
  - largest giveback: Growth·GDX 2026-02-27 → open best mark $1,282.64, final −$40,492.79 (giveback $41,775.43)
  - open at 2026-10-30: Growth·GDX from 2026-02-27 marked −$40,492.79
- `C24/J/refine/J.A1.h2.s1/R104#2 robust`: D1·GDX 2026-05-19 → 2026-06-11 (maximum hold, 23 d) −$13,240.94; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,642.53; D1·GDX 2018-08-15 → 2018-09-07 (maximum hold, 23 d) −$6,509.31; D1·GDX 2022-05-09 → 2022-06-01 (maximum hold, 23 d) −$3,247.42; D1·GDX 2017-02-28 → 2017-03-23 (buffered intraday loss, 23 d) −$2,000.87
  - largest giveback: Growth·GDX 2025-01-16 → 2026-03-19 best mark $89,469.71, final $49,338.38 (giveback $40,131.33)
- `C24/J/broad/J.A0.h1.s0/R104#2 robust`: Growth·GDX 2018-02-15 → 2018-02-26 (maximum hold, 11 d) −$4,655.33; D1·GDX 2026-06-05 → 2026-06-12 (maximum hold, 7 d) −$3,807.17; D1·GDX 2022-06-30 → 2022-07-07 (maximum hold, 7 d) −$2,205.69; D1·GDX 2016-12-15 → 2016-12-22 (maximum hold, 7 d) −$992.87; Growth·GDX 2018-01-04 → 2018-01-23 (maximum hold, 19 d) −$566.50
  - largest giveback: D1·GDX 2020-03-30 → 2020-04-15 best mark $36,716.32, final $25,607.11 (giveback $11,109.22)
- `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,070.26; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$9,068.17; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$8,021.00; D1·GDX 2021-02-17 → 2021-03-02 (maximum hold, 13 d) −$6,725.13
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,145.11, final −$9,068.17 (giveback $12,213.28)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76
- `control: N/original GDX D1 (ablation) + 4A informed#2 robust`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,070.26; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$9,068.17; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$8,021.00; D1·GDX 2021-02-17 → 2021-03-02 (maximum hold, 13 d) −$6,725.13
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,145.11, final −$9,068.17 (giveback $12,213.28)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76
- `control: N/original GDX D1 (ablation) + 4A/3C P08`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,070.26; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$9,068.17; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$8,021.00; D1·GDX 2021-02-17 → 2021-03-02 (maximum hold, 13 d) −$6,725.13
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,145.11, final −$9,068.17 (giveback $12,213.28)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76
- `control: N/original GDX D1 (ablation) + 4A/3C P09`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,070.26; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$9,068.17; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$8,021.00; D1·GDX 2021-02-17 → 2021-03-02 (maximum hold, 13 d) −$6,725.13
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,145.11, final −$9,068.17 (giveback $12,213.28)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76
- `control: N/original GDX D1 (ablation) + Appendix A`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,070.26; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$9,068.17; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$8,021.00; Growth·GDX 2020-03-04 → 2020-03-10 (initial stop, 6 d) −$6,910.38
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,145.11, final −$9,068.17 (giveback $12,213.28)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 GDX daily (Yahoo Finance, 2006-05-22 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/J/refine/J.B0.h1.s0/R102#1 profit` | B0 | 4 (calendar maximum hold) | 13.2 % | −$15,587 (2014-10-28) | −$8,347 | 0.0 % | 2.4 % below the stop (2014-10-31) | −$16,309 (2020-03-10) | 0.0 % |
| `C21/J/refine/J.D1.h1.s0/R102#1 profit` | D1 | 20 (adaptive hold: the extended bound) | 10.6 % | −$15,719 (2013-04-02) | −$10,600 | 0.0 % | 5.1 % below the stop (2013-04-15) | −$16,309 (2020-03-10) | 0.0 % |
| `C23/J/refine/J.A1.h0.s1/R106#1 profit` | A1 | 4 (calendar maximum hold) | none (family A) | −$34,560 (2008-10-20) | −$8,347 | 0.0 % | — | −$39,934 (2020-03-10) | 0.1 % |
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | B1 | 26 (calendar maximum hold) | 4.6 % | −$9,018 (2008-10-23) | −$4,986 | 0.0 % | 4.4 % below the stop (2008-10-24) | −$12,285 (2020-02-28) | 0.0 % |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | B1 | 27 (calendar maximum hold) | 4.1 % | −$9,018 (2008-10-23) | −$4,571 | 0.0 % | 4.9 % below the stop (2008-10-24) | −$11,796 (2020-03-13) | 0.0 % |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | A1 | 23 (calendar maximum hold) | none (family A) | −$53,124 (2008-10-01) | −$19,873 | 0.7 % | — | −$47,891 (2020-02-24) | 0.7 % |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | A0 | 7 (calendar maximum hold) | none (family A) | −$34,560 (2008-10-20) | −$11,601 | 0.0 % | — | −$43,858 (2020-03-06) | 0.2 % |
| `control: N/original GDX D1 (ablation) + 4A primary indep-rise#1` | D1 | 28 (adaptive hold: the extended bound) | 15.9 % | −$20,755 (2013-03-22) | −$15,900 | 0.0 % | 4.9 % below the stop (2013-04-15) | −$22,775 (2020-02-19) | 0.0 % |
| `control: N/original GDX D1 (ablation) + 4A informed#2 robust` | D1 | 28 (adaptive hold: the extended bound) | 15.9 % | −$20,755 (2013-03-22) | −$15,900 | 0.0 % | 4.9 % below the stop (2013-04-15) | −$22,775 (2020-02-19) | 0.0 % |
| `control: N/original GDX D1 (ablation) + 4A/3C P08` | D1 | 28 (adaptive hold: the extended bound) | 15.9 % | −$20,755 (2013-03-22) | −$15,900 | 0.0 % | 4.9 % below the stop (2013-04-15) | −$22,775 (2020-02-19) | 0.0 % |
| `control: N/original GDX D1 (ablation) + 4A/3C P09` | D1 | 28 (adaptive hold: the extended bound) | 15.9 % | −$20,755 (2013-03-22) | −$15,900 | 0.0 % | 4.9 % below the stop (2013-04-15) | −$22,775 (2020-02-19) | 0.0 % |
| `control: N/original GDX D1 (ablation) + Appendix A` | D1 | 28 (adaptive hold: the extended bound) | 15.9 % | −$20,755 (2013-03-22) | −$15,900 | 0.0 % | 4.9 % below the stop (2013-04-15) | −$22,775 (2020-02-19) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | small | 128 | $184,878 / $156,788 | $26,035 / $26,980 / $28,160 | $26,977 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | wide | 128 | $146,612 / $104,112 | $31,700 / $35,673 / $43,813 | $36,759 | 9 (7.0 %; 3.7 %–12.8 %) |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | small | 128 | $186,081 / $172,468 | $31,940 / $32,823 / $34,706 | $32,940 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | wide | 128 | $172,431 / $134,253 | $40,040 / $88,993 / $90,922 | $74,931 | 23 (18.0 %; 12.3 %–25.5 %) |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | small | 128 | $175,833 / $168,406 | $17,884 / $20,069 / $20,932 | $19,644 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | wide | 128 | $153,029 / $120,892 | $21,260 / $22,054 / $31,899 | $24,505 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | small | 128 | $89,319 / $64,954 | $17,281 / $17,281 / $17,281 | $17,281 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | wide | 128 | $93,412 / $65,242 | $18,311 / $20,731 / $57,749 | $23,510 | 1 (0.8 %; 0.1 %–4.3 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/J/refine/J.B0.h1.s0/R102#1 profit` | $135,219 | 0.0 % | none open | none open | −$1,026 / −$3,513 / −$6,585 | −$2,257 / −$45,938 |
| C21 | `C21/J/refine/J.D1.h1.s0/R102#1 profit` | $236,479 | 0.0 % | none open | none open | −$2,268 / −$6,964 / −$8,482 | −$6,395 / −$9,570 |
| C23 | `C23/J/refine/J.A1.h0.s1/R106#1 profit` | $246,576 | 0.0 % | none open | none open | −$2,052 / −$4,897 / −$6,582 | — / — |
| C24 | `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $230,410 | 0.0 % | none open | none open | −$2,749 / −$4,942 / −$7,170 | −$9,635 / −$43,680 |

