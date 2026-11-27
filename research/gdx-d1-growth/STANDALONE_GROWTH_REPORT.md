# Standalone Growth·GDX (arm G)

**Verdict: the C24 primary is DEVELOPMENT-QUALIFIED AND PASSES V1–V3, but the arm's chronological procedure is
UNSUPPORTED (net −$36,677, DD $62,458).** It is one of the two development-only entries of the sealed outcome — "not a
deployment-qualified candidate without an explicit user decision". Research only; nothing adopted.

## What the arm is

One Growth 1.4.0 book on GDX in the single $100,000 slot (D1 off): six protected exit-protection structures (G.h0.s0 …
G.h2.s1, including the unrestricted `G.h0.s0`), growth140's boxes on the fine grid, 12 replicates per cell (P6-TSLA × 1.5),
replicate round rx1 fired at C19 and C21. At C24, 18 informed lanes (cells G.h0.s1, G.h1.s1, G.h2.s1 seeded by 4A's five
GDX Growth incumbents; population G+, no independent chronological test).

## Findings

1. **Chronology.** C19 `G.h1.s1/R106#1` → 2020–2021 **−$24,021, reset DD $39,800 (breach)**; C21 `G.h2.s0/R101#1` →
   2022–2023 **−$12,606, DD $42,828 (breach)**; C23 `G.h2.s0/R104#1` → 2024 no lot. Chained: **net −$36,677, DD $62,458 →
   unsupported**, the weakest of the five procedures. Report-only sub-populations: G-U $46,320 / $39,790 (unsupported);
   the descriptive robust-profit role path is the only Growth path under the ceiling ($21,009 / $25,960; descriptive only,
   never a nomination).
2. **C24 primary `C24/G/refine/G.h1.s1/R105#1 profit`** (`f13f3e1d64379748`): development $161,457, DD $17,744, but a
   **neighbourhood much weaker than its centre**: confirmation median $87,458, p10 $55,341, robust $71,400; p90 DD $28,618;
   worst-10 % mean DD $34,035; breach share 2.9 %. **Its result is not monotone in costs**: at 0 or 2 bps per side the
   development net falls to $81,563 / $80,809 (vs $161,457 at the 5 bps base and $157,989 at 10 bps) — a single large 2016
   Growth trade depends on the exact cost path. The profit is concentrated: 51 % of it in the top episode; +$80,032 of the
   arm's total-account increment in 2016 and +$82,419 in 2020, nothing in most other years.
3. **Validation (FULL, once): +$10,294, reset DD $10,279 — V1, V2, V3 pass.** The validation neighbourhood, however,
   breaches the ceiling in **21.1 %** of 256 draws (Wilson 16.5–26.5 %) against 6.3 % in training: the centre's pass is
   not representative of its neighbourhood. At 20 bps per side its validation slice turns negative (−$1,810).
4. **Seed dependence is the largest of any arm**: the median relative range of a cell's best feasible net across its
   replicates was 49–63 % at every cutoff (D 15–25 %). "Converged by the frozen rules" here means the stopping rules were
   met, not that the optimum is well located.
5. **Against 4A's incumbents** (chosen with 2016–2026 in view): in the validation the 4A primary, P08 and P09 made no
   trade; informed#2 +$39,487; Appendix A +$87,341. The informed population's primary `C24/G/informed/G.h1.s1/R101#1`
   (dev $178,523 / $16,155) made no validation trade (V1 fails).

The development-only label is the precommitted outcome rule's, unchanged after seeing 2025–2026; it carries no deployment
meaning. Sections A–I below carry every figure.

---

_Sections A–I below are generated from the sealed records by `tools/gdx-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 78 / 36 | 13 | 1✓ 2✗ | 2,119,870 | 1,998,344 | 1,419.5 | 2: 18, 3: 31, 4: 49, 5: 12, 6: 4 | triggers not met 114 | 6 / 6 | converged by the frozen rules |
| C21 | 78 / 36 | 13 | 1✓ 2✗ | 1,934,356 | 1,815,911 | 1,796.1 | 2: 23, 3: 31, 4: 44, 5: 11, 6: 4, 7: 1 | triggers not met 114 | 6 / 6 | converged by the frozen rules |
| C23 | 72 / 36 | 12 | 1✗ | 1,774,368 | 1,666,960 | 1,896.2 | 2: 22, 3: 25, 4: 45, 5: 11, 6: 4, 7: 1 | triggers not met 108 | 6 / 6 | converged by the frozen rules |
| C24 | 72 / 54 | 12 | 1✗ | 2,327,395 | 2,124,418 | 2,733.9 | 2: 18, 3: 26, 4: 54, 5: 22, 6: 6 | triggers not met 126 | 6 / 6 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 234 | 184 | Q4 49, Q3 2 | 4A primary indep-rise#1: no (Q1 Q4 Q5 Q6); 4A informed#2 robust: no (Q1 Q4 Q5 Q6); 4A/3C P08: no (Q1 Q4 Q5 Q6); 4A/3C P09: no (Q4); Appendix A: no (Q4) |
| C19 | refine | 194 | 152 | Q4 37, Q3 5 | — |
| C21 | broad | 233 | 167 | Q4 63, Q3 3 | 4A primary indep-rise#1: yes; 4A informed#2 robust: yes; 4A/3C P08: yes; 4A/3C P09: yes; Appendix A: no (Q3 Q4) |
| C21 | refine | 198 | 160 | Q4 37, Q5 1, Q3 3 | — |
| C23 | broad | 216 | 140 | Q4 74, Q3 2 | 4A primary indep-rise#1: yes; 4A informed#2 robust: yes; 4A/3C P08: yes; 4A/3C P09: yes; Appendix A: no (Q3 Q4) |
| C23 | refine | 191 | 155 | Q4 32, Q3 4, Q5 1 | — |
| C24 | broad | 216 | 138 | Q4 76, Q3 3 | 4A primary indep-rise#1: yes; 4A informed#2 robust: yes; 4A/3C P08: yes; 4A/3C P09: yes; Appendix A: no (Q3 Q4) |
| C24 | informed | 96 | 70 | Q4 24, Q3 3, Q5 1 | — |
| C24 | refine | 192 | 151 | Q4 36, Q3 7 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | G | 428 / 336 | `C19/G/refine/G.h1.s1/R106#1 profit` | $108,264 | $15,906 | 36 | $26,256 / $35,141 | $12,919 / $34,035 | no (`C19/G/refine/G.h0.s1/R104#1 profit`) |
| C19 | G-P | 357 / 282 | `C19/G/refine/G.h1.s1/R106#1 profit` | $108,264 | $15,906 | 36 | $26,256 / $35,141 | $12,919 / $34,035 | no (`C19/G/refine/G.h0.s1/R104#1 profit`) |
| C19 | G-U | 71 / 54 | `C19/G/refine/G.h0.s0/R102#1 profit` | $78,791 | $22,946 | 7 | $39,768 / $27,316 | $24,175 / $29,189 | no (`C19/G/refine/G.h0.s0/R106#1 profit`) |
| C21 | G | 431 / 327 | `C21/G/refine/G.h2.s0/R101#1 profit` | $164,606 | $17,656 | 21 | $45,394 / $27,606 | $26,989 / $27,594 | no (`C21/G/refine/G.h2.s0/R104#1 profit`) |
| C21 | G-P | 357 / 263 | `C21/G/refine/G.h2.s0/R101#1 profit` | $164,606 | $17,656 | 21 | $45,394 / $27,606 | $26,989 / $27,594 | no (`C21/G/refine/G.h2.s0/R104#1 profit`) |
| C21 | G-U | 74 / 64 | `C21/G/refine/G.h0.s0/R101#1 profit` | $140,960 | $25,791 | 20 | $48,276 / $32,758 | $1,094 / $32,531 | no (`C21/G/refine/G.h0.s0/R105#1 profit`) |
| C23 | G | 407 / 295 | `C23/G/refine/G.h2.s0/R104#1 profit` | $158,651 | $17,451 | 17 | $85,326 / $24,375 | $76,524 / $23,141 | no (`C23/G/refine/G.h2.s0/R105#3 balanced`) |
| C23 | G-P | 342 / 238 | `C23/G/refine/G.h2.s0/R104#1 profit` | $158,651 | $17,451 | 17 | $85,326 / $24,375 | $76,524 / $23,141 | no (`C23/G/refine/G.h2.s0/R105#3 balanced`) |
| C23 | G-U | 65 / 57 | `C23/G/refine/G.h0.s0/R103#1 profit` | $91,531 | $29,035 | 2 | $44,249 / $30,490 | $27,046 / $30,495 | no (`C23/G/refine/G.h0.s0/R105#5 profit order`) |
| C24 | G | 408 / 289 | `C24/G/refine/G.h1.s1/R105#1 profit` | $161,457 | $17,744 | 33 | $70,899 / $29,767 | $55,341 / $28,618 | no (`C24/G/refine/G.h2.s1/R105#1 profit`) |
| C24 | G-P | 337 / 236 | `C24/G/refine/G.h1.s1/R105#1 profit` | $161,457 | $17,744 | 33 | $70,899 / $29,767 | $55,341 / $28,618 | no (`C24/G/refine/G.h2.s1/R105#1 profit`) |
| C24 | G-U | 71 / 53 | `C24/G/refine/G.h0.s0/R104#1 profit` | $108,006 | $28,994 | 17 | $69,882 / $34,179 | $54,769 / $34,373 | no (`C24/G/refine/G.h0.s0/R101#5 profit order`) |
| C24 | G+ | 509 / 363 | `C24/G/informed/G.h1.s1/R101#1 profit` | $178,523 | $16,155 | 12 | $69,406 / $22,913 | $49,002 / $22,125 | yes |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/G/refine/G.h0.s0/R104#2 robust` | `C19/G/refine/G.h0.s1/R102#3 balanced` | `C19/G/refine/G.h2.s0/R104#3 balanced` |
| C21 | `C21/G/refine/G.h1.s0/R102#2 robust` | `C21/G/refine/G.h1.s1/R103#2 robust` | `C21/G/broad/G.h2.s0/R112#1 profit` |
| C23 | `C23/G/refine/G.h2.s0/R105#2 robust` | `C23/G/refine/G.h2.s0/R103#3 balanced` | `C23/G/broad/G.h1.s1/R103#2 robust` |
| C24 | `C24/G/refine/G.h2.s1/R105#2 robust` | `C24/G/refine/G.h1.s1/R101#2 robust` | `C24/G/refine/G.h0.s0/R101#3 balanced` |

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/G/refine/G.h1.s1/R106#1 profit` | primary G/original; primary G-P/original; role G/actual-profit; role G-P/actual-profit | $108,264 | −$24,021 | $39,800 | $39,800 | 24 (14 losing) | −$11,447 | 172 / 256 (training 10.2 %) |
| C19 | `C19/G/refine/G.h0.s0/R102#1 profit` | primary G-U/original; role G-U/actual-profit | $78,791 | $38,170 | $32,531 | $32,531 | 5 (1 losing) | −$15,628 | 49 / 256 (training 5.5 %) |
| C19 | `C19/G/refine/G.h0.s0/R104#2 robust` | role G/robust-profit; role G-U/robust-profit | $66,628 | $21,009 | $25,960 | $25,960 | 5 (1 losing) | −$13,354 | 36 / 256 (training 1.2 %) |
| C19 | `C19/G/refine/G.h0.s1/R102#3 balanced` | role G/balanced; role G-P/balanced | $28,869 | −$6,583 | $37,842 | $37,842 | 6 (4 losing) | −$15,053 | 156 / 256 (training 0.0 %) |
| C19 | `C19/G/refine/G.h2.s0/R104#3 balanced` | role G/lower-drawdown; role G-P/lower-drawdown | $21,293 | −$11,580 | $15,025 | $16,911 | 1 (1 losing) | −$13,470 | 14 / 256 (training 0.0 %) |
| C19 | `C19/G/refine/G.h1.s1/R104#2 robust` | role G-P/robust-profit | $51,382 | −$27,217 | $42,180 | $42,180 | 10 (7 losing) | −$7,323 | 128 / 256 (training 0.0 %) |
| C19 | `C19/G/refine/G.h0.s0/R105#2 balanced` | role G-U/balanced | $46,069 | $88,706 | $24,994 | $24,994 | 12 (1 losing) | −$16,963 | 37 / 256 (training 3.9 %) |
| C19 | `C19/G/refine/G.h0.s0/R103#5 profit order` | role G-U/lower-drawdown | $20,134 | −$323 | $23,145 | $23,145 | 3 (1 losing) | −$16,963 | 0 / 255 (training 2.0 %) |
| C19 | `control: 4A primary indep-rise#1` | control control: 4A primary indep-rise#1 | $0 | $91,706 | $17,484 | $17,484 | 4 (1 losing) | −$6,663 | 0 / 256 (training 0.0 %) |
| C19 | `control: 4A informed#2 robust` | control control: 4A informed#2 robust | $0 | $74,423 | $18,841 | $18,841 | 9 (2 losing) | −$8,550 | 1 / 256 (training 0.4 %) |
| C19 | `control: 4A/3C P08` | control control: 4A/3C P08 | $0 | $73,431 | $18,841 | $18,841 | 5 (1 losing) | −$8,550 | 0 / 256 (training 0.0 %) |
| C19 | `control: 4A/3C P09` | control control: 4A/3C P09 | $4,136 | $58,160 | $17,744 | $17,744 | 5 (1 losing) | −$3,934 | 0 / 256 (training 0.0 %) |
| C19 | `control: Appendix A` | control control: Appendix A | $31,047 | $16,718 | $17,431 | $17,431 | 4 (1 losing) | −$6,910 | 7 / 256 (training 8.6 %) |
| C21 | `C21/G/refine/G.h2.s0/R101#1 profit` | primary G/original; primary G-P/original; role G/actual-profit; role G-P/actual-profit | $164,606 | −$12,606 | $42,828 | $42,828 | 9 (4 losing) | −$16,797 | 144 / 256 (training 1.6 %) |
| C21 | `C21/G/refine/G.h0.s0/R101#1 profit` | primary G-U/original; role G-U/actual-profit | $140,960 | $8,251 | $39,790 | $39,790 | 3 (0 losing) | −$29,714 | 251 / 256 (training 0.0 %) |
| C21 | `C21/G/refine/G.h1.s0/R102#2 robust` | role G/robust-profit; role G-P/robust-profit | $94,595 | $0 | $0 | $25,478 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C21 | `C21/G/refine/G.h1.s1/R103#2 robust` | role G/balanced; role G-P/balanced | $89,966 | −$2,568 | $13,995 | $17,744 | 2 (1 losing) | −$7,533 | 0 / 256 (training 0.0 %) |
| C21 | `C21/G/broad/G.h2.s0/R112#1 profit` | role G/lower-drawdown; role G-P/lower-drawdown | $37,137 | $3,289 | $3,909 | $10,801 | 1 (0 losing) | −$1,239 | 0 / 256 (training 1.2 %) |
| C21 | `C21/G/refine/G.h0.s0/R103#2 robust` | role G-U/robust-profit | $84,063 | −$18,101 | $53,100 | $53,100 | 1 (0 losing) | −$43,023 | 187 / 256 (training 3.1 %) |
| C21 | `C21/G/refine/G.h0.s0/R105#1 profit` | role G-U/balanced | $133,755 | −$20,296 | $54,634 | $54,634 | 1 (0 losing) | −$44,576 | 187 / 256 (training 3.9 %) |
| C21 | `C21/G/refine/G.h0.s0/R103#6 profit order` | role G-U/lower-drawdown | $45,327 | $4,518 | $6,909 | $13,187 | 1 (0 losing) | −$1,589 | 0 / 256 (training 0.0 %) |
| C21 | `control: 4A primary indep-rise#1` | control control: 4A primary indep-rise#1 | $91,706 | $55,239 | $16,421 | $17,484 | 6 (0 losing) | −$6,870 | 0 / 256 (training 0.0 %) |
| C21 | `control: 4A informed#2 robust` | control control: 4A informed#2 robust | $74,423 | $35,736 | $12,938 | $18,841 | 7 (1 losing) | −$3,907 | 0 / 256 (training 1.2 %) |
| C21 | `control: 4A/3C P08` | control control: 4A/3C P08 | $73,431 | $47,578 | $10,505 | $18,841 | 6 (1 losing) | −$3,872 | 0 / 256 (training 0.0 %) |
| C21 | `control: 4A/3C P09` | control control: 4A/3C P09 | $62,296 | $13,305 | $8,352 | $17,744 | 3 (1 losing) | −$1,993 | 0 / 256 (training 0.0 %) |
| C21 | `control: Appendix A` | control control: Appendix A | $47,765 | −$7,394 | $13,292 | $17,431 | 1 (1 losing) | −$7,394 | 0 / 256 (training 21.9 %) |
| C23 | `C23/G/refine/G.h2.s0/R104#1 profit` | primary G/original; primary G-P/original; role G/actual-profit; role G-P/actual-profit | $158,651 | $0 | $0 | $17,451 | 0 (0 losing) | — | 0 / 256 (training 0.4 %) |
| C23 | `C23/G/refine/G.h0.s0/R103#1 profit` | primary G-U/original; role G-U/actual-profit | $91,531 | $0 | $0 | $29,035 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/G/refine/G.h2.s0/R105#2 robust` | role G/robust-profit; role G-P/robust-profit | $130,858 | $0 | $0 | $20,105 | 0 (0 losing) | — | 0 / 256 (training 7.4 %) |
| C23 | `C23/G/refine/G.h2.s0/R103#3 balanced` | role G/balanced; role G-P/balanced | $92,514 | $0 | $0 | $17,744 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/G/broad/G.h1.s1/R103#2 robust` | role G/lower-drawdown; role G-P/lower-drawdown | $52,139 | −$2,389 | $4,510 | $13,187 | 1 (1 losing) | −$2,512 | 0 / 256 (training 0.0 %) |
| C23 | `C23/G/refine/G.h0.s0/R102#2 robust` | role G-U/robust-profit | $83,043 | $0 | $0 | $27,640 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/G/refine/G.h0.s0/R101#4 profit order` | role G-U/balanced; role G-U/lower-drawdown | $82,468 | $0 | $0 | $26,062 | 0 (0 losing) | — | 0 / 256 (training 1.2 %) |
| C23 | `control: 4A primary indep-rise#1` | control control: 4A primary indep-rise#1 | $146,945 | −$7,277 | $13,030 | $17,484 | 1 (1 losing) | −$7,803 | 0 / 256 (training 0.8 %) |
| C23 | `control: 4A informed#2 robust` | control control: 4A informed#2 robust | $110,159 | $0 | $0 | $18,841 | 0 (0 losing) | — | 0 / 256 (training 1.9 %) |
| C23 | `control: 4A/3C P08` | control control: 4A/3C P08 | $121,009 | $0 | $0 | $18,841 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `control: 4A/3C P09` | control control: 4A/3C P09 | $75,601 | $24,455 | $8,648 | $17,744 | 2 (1 losing) | −$2,652 | 0 / 256 (training 0.0 %) |
| C23 | `control: Appendix A` | control control: Appendix A | $40,371 | $13,446 | $11,335 | $17,710 | 3 (0 losing) | −$1,751 | 0 / 256 (training 28.9 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| G/original | `C19/G/refine/G.h1.s1/R106#1 profit` → `C21/G/refine/G.h2.s0/R101#1 profit` → `C23/G/refine/G.h2.s0/R104#1 profit` | −$36,677 | $62,458 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| G-P/original (report-only) | `C19/G/refine/G.h1.s1/R106#1 profit` → `C21/G/refine/G.h2.s0/R101#1 profit` → `C23/G/refine/G.h2.s0/R104#1 profit` | −$36,677 | $62,458 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| G-U/original (report-only) | `C19/G/refine/G.h0.s0/R102#1 profit` → `C21/G/refine/G.h0.s0/R101#1 profit` → `C23/G/refine/G.h0.s0/R103#1 profit` | $46,320 | $39,790 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| G: role robust-profit (descriptive) | `C19/G/refine/G.h0.s0/R104#2 robust` → `C21/G/refine/G.h1.s0/R102#2 robust` → `C23/G/refine/G.h2.s0/R105#2 robust` | $21,009 | $25,960 | supported (every fold produced a primary; sequential net > 0 and sequential drawdown ≤ $35,000) |
| G: role balanced (descriptive) | `C19/G/refine/G.h0.s1/R102#3 balanced` → `C21/G/refine/G.h1.s1/R103#2 robust` → `C23/G/refine/G.h2.s0/R103#3 balanced` | −$9,152 | $37,842 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| G: role lower-drawdown (descriptive) | `C19/G/refine/G.h2.s0/R104#3 balanced` → `C21/G/broad/G.h2.s0/R112#1 profit` → `C23/G/broad/G.h1.s1/R103#2 robust` | −$10,680 | $15,025 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind (population) | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist (G) | `C24/G/refine/G.h1.s1/R105#1 profit` | primary G | pass | $161,456.75 | $172,496 | $7,655 | $3,385 | $17,744.39 (17.7 %) | 33 29/4 | $10,294.11 | $10,279.18 | $171,750.86 | $17,744.39 | ✓ ✓ ✓ |
| finalist (G) | `C24/G/refine/G.h2.s1/R105#2 robust` | role G/robust-profit | pass | $135,665.35 | $146,109 | $9,071 | $1,372 | $18,070.66 (18.1 %) | 13 11/2 | $0.00 | $0.00 | $135,665.35 | $18,070.66 | ✗ ✓ ✓ |
| finalist (G) | `C24/G/refine/G.h1.s1/R101#2 robust` | role G/balanced | pass | $102,166.71 | $105,509 | $2,290 | $1,052 | $17,744.39 (17.7 %) | 10 8/2 | $0.00 | $0.00 | $102,166.71 | $17,744.39 | ✗ ✓ ✓ |
| finalist (G) | `C24/G/refine/G.h0.s0/R101#3 balanced` | role G/lower-drawdown | pass | $39,248.35 | $39,679 | $211 | $220 | $10,800.57 (10.8 %) | 2 2/0 | $0.00 | $0.00 | $39,248.35 | $10,800.57 | ✗ ✓ ✓ |
| finalist (G+, informed) | `C24/G/informed/G.h1.s1/R101#1 profit` | primary G+ | pass | $178,522.74 | $193,335 | $13,516 | $1,296 | $16,154.78 (16.2 %) | 12 11/1 | $0.00 | $0.00 | $178,522.74 | $16,154.78 | ✗ ✓ ✓ |
| finalist (G+, informed) | `C24/G/informed/G.h2.s1/R105#1 profit` | role G+/robust-profit | pass | $145,002.06 | $154,555 | $8,077 | $1,477 | $17,451.20 (17.4 %) | 14 11/3 | −$4,589.70 | $12,988.66 | $140,412.36 | $25,424.65 | ✗ ✓ ✓ |
| finalist (G+, informed) | `C24/G/refine/G.h1.s1/R101#2 robust` | role G+/balanced | pass | $102,166.71 | $105,509 | $2,290 | $1,052 | $17,744.39 (17.7 %) | 10 8/2 | $0.00 | $0.00 | $102,166.71 | $17,744.39 | ✗ ✓ ✓ |
| finalist (G+, informed) | `C24/G/refine/G.h0.s0/R101#3 balanced` | role G+/lower-drawdown | pass | $39,248.35 | $39,679 | $211 | $220 | $10,800.57 (10.8 %) | 2 2/0 | $0.00 | $0.00 | $39,248.35 | $10,800.57 | ✗ ✓ ✓ |
| control (control:G) | `control: 4A primary indep-rise#1` | external control | pass | $139,668.45 | $151,825 | $10,981 | $1,175 | $17,483.62 (17.5 %) | 11 9/2 | $0.00 | $0.00 | $139,668.45 | $17,483.62 | ✗ ✓ ✓ |
| control (control:G) | `control: 4A informed#2 robust` | external control | pass | $110,158.59 | $119,683 | $7,866 | $1,659 | $18,840.58 (18.8 %) | 16 12/4 | $39,487.05 | $11,730.77 | $149,645.63 | $18,840.58 | ✓ ✓ ✓ |
| control (control:G) | `control: 4A/3C P08` | external control | pass | $121,008.75 | $127,808 | $5,636 | $1,163 | $18,840.58 (18.8 %) | 11 9/2 | $0.00 | $0.00 | $121,008.75 | $18,840.58 | ✗ ✓ ✓ |
| control (control:G) | `control: 4A/3C P09` | external control | pass | $100,056.17 | $107,456 | $5,847 | $1,553 | $17,744.39 (17.7 %) | 15 9/6 | $0.00 | $0.00 | $100,056.17 | $17,744.39 | ✗ ✓ ✓ |
| control (control:G) | `control: Appendix A` | external control | fails Q3 Q4 | $53,816.50 | $69,737 | $14,586 | $1,334 | $17,709.96 (17.7 %) | 13 11/2 | $87,340.87 | $17,709.24 | $141,157.37 | $17,709.96 | ✓ ✓ ✓ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/G/refine/G.h1.s1/R105#1 profit` | $17,744 | $10,199 / $10,244 | $10,199 / $10,244 | −$10,199 | −$3,027 | 9.2 % | 0.0 % | 51.0 % | $0 / $161,457 |
| `C24/G/refine/G.h2.s1/R105#2 robust` | $18,071 | $10,719 / $10,764 | $10,719 / $10,764 | −$10,719 | −$9,546 | 9.9 % | 0.0 % | 77.0 % | $0 / $135,665 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | $17,744 | $10,222 / $10,267 | $10,222 / $10,267 | −$10,222 | −$5,464 | 2.8 % | 0.0 % | 99.3 % | $0 / $102,167 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | $10,801 | $2,795 / $2,843 | $2,795 / $2,843 | −$2,795 | $0 | 0.3 % | 0.0 % | 81.1 % | $0 / $39,248 |
| `C24/G/informed/G.h1.s1/R101#1 profit` | $16,155 | $6,584 / $6,631 | $6,584 / $6,631 | −$6,584 | −$643 | 20.8 % | 0.0 % | 54.3 % | $0 / $178,523 |
| `C24/G/informed/G.h2.s1/R105#1 profit` | $17,451 | $8,550 / $8,596 | $8,550 / $8,596 | −$8,550 | −$4,588 | 8.9 % | 0.0 % | 67.8 % | $0 / $145,002 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | $17,744 | $10,222 / $10,267 | $10,222 / $10,267 | −$10,222 | −$5,464 | 2.8 % | 0.0 % | 99.3 % | $0 / $102,167 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | $10,801 | $2,795 / $2,843 | $2,795 / $2,843 | −$2,795 | $0 | 0.3 % | 0.0 % | 81.1 % | $0 / $39,248 |
| `control: 4A primary indep-rise#1` | $17,484 | $7,803 / $7,850 | $7,825 / $7,871 | −$7,803 | −$2,655 | 16.6 % | 0.0 % | 67.0 % | $0 / $139,668 |
| `control: 4A informed#2 robust` | $18,841 | $8,550 / $8,596 | $8,550 / $8,596 | −$8,550 | −$2,298 | 8.5 % | 0.0 % | 67.2 % | $0 / $110,159 |
| `control: 4A/3C P08` | $18,841 | $8,550 / $8,596 | $8,550 / $8,596 | −$8,550 | −$1,234 | 6.1 % | 0.0 % | 59.6 % | $0 / $121,009 |
| `control: 4A/3C P09` | $17,744 | $3,934 / $3,982 | $6,298 / $6,347 | −$3,934 | −$2,605 | 6.4 % | 0.0 % | 59.3 % | $0 / $100,056 |
| `control: Appendix A` | $17,710 | $7,394 / $7,394 | $9,507 / $9,556 | −$7,394 | −$7,394 | 15.3 % | 0.0 % | 31.4 % | $0 / $53,817 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/G/refine/G.h1.s1/R105#1 profit` | $87,458 / $55,341 / $71,400 | $28,618 / $31,586 | $34,035 / $51,132 | 2.9 % (1.6 %–5.1 %) | $70,899 / $29,767 | $157,989 / $17,736 | $151,065 / $17,718 | $159,369 | $153,774 / $17,744 | $161,457 / $17,744 |
| `C24/G/refine/G.h2.s1/R105#2 robust` | $110,832 / $91,778 / $101,305 | $24,111 / $27,685 | $30,450 / $53,816 | 2.1 % (1.1 %–4.1 %) | $98,888 / $24,080 | $134,221 / $18,167 | $131,338 / $18,360 | $133,191 | $132,524 / $18,347 | $135,665 / $18,071 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | $98,460 / $83,851 / $91,155 | $18,023 / $23,986 | $26,050 / $41,551 | 1.8 % (0.9 %–3.7 %) | $92,031 / $17,744 | $101,063 / $17,736 | $98,858 / $17,718 | $101,542 | $99,643 / $17,744 | $102,167 / $17,744 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | $39,248 / $31,838 / $35,543 | $13,187 / $17,061 | $18,803 / $41,626 | 1.0 % (0.4 %–2.6 %) | $35,543 / $12,374 | $39,009 / $10,795 | $38,531 / $10,784 | $39,191 | $38,650 / $10,801 | $39,248 / $10,801 |
| `C24/G/informed/G.h1.s1/R101#1 profit` | $94,679 / $49,002 / $71,841 | $22,125 / $25,340 | $26,975 / $42,658 | 0.5 % (0.1 %–1.9 %) | $69,406 / $22,913 | $177,131 / $16,201 | $174,353 / $16,295 | $174,837 | $176,042 / $16,426 | $178,523 / $16,155 |
| `C24/G/informed/G.h2.s1/R105#1 profit` | $116,747 / $88,392 / $102,570 | $26,031 / $28,522 | $28,928 / $35,118 | 0.3 % (0.1 %–1.5 %) | $104,185 / $25,129 | $143,450 / $17,442 | $140,350 / $17,425 | $142,799 | $141,857 / $17,451 | $145,002 / $17,451 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | $98,460 / $83,851 / $91,155 | $18,023 / $23,986 | $26,050 / $41,551 | 1.8 % (0.9 %–3.7 %) | $92,031 / $17,744 | $101,063 / $17,736 | $98,858 / $17,718 | $101,542 | $99,643 / $17,744 | $102,167 / $17,744 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | $39,248 / $31,838 / $35,543 | $13,187 / $17,061 | $18,803 / $41,626 | 1.0 % (0.4 %–2.6 %) | $35,543 / $12,374 | $39,009 / $10,795 | $38,531 / $10,784 | $39,191 | $38,650 / $10,801 | $39,248 / $10,801 |
| `control: 4A primary indep-rise#1` | $96,360 / $63,794 / $80,077 | $24,011 / $28,521 | $30,206 / $56,490 | 2.3 % (1.2 %–4.4 %) | $80,211 / $23,870 | $138,418 / $17,590 | $135,922 / $17,802 | $136,674 | $137,540 / $17,748 | $139,668 / $17,484 |
| `control: 4A informed#2 robust` | $107,785 / $83,053 / $95,419 | $26,139 / $30,180 | $32,185 / $60,682 | 2.3 % (1.2 %–4.4 %) | $97,587 / $25,057 | $105,740 / $18,937 | $102,718 / $19,130 | $105,420 | $107,108 / $19,121 | $110,159 / $18,841 |
| `control: 4A/3C P08` | $101,906 / $73,310 / $87,608 | $19,487 / $20,164 | $21,154 / $27,243 | 0.0 % (0.0 %–1.0 %) | $88,325 / $19,487 | $120,263 / $18,937 | $118,015 / $19,130 | $119,967 | $118,691 / $19,121 | $121,009 / $18,841 |
| `control: 4A/3C P09` | $64,200 / $52,303 / $58,251 | $18,154 / $19,772 | $20,316 / $26,616 | 0.0 % (0.0 %–1.0 %) | $59,084 / $18,579 | $99,492 / $17,736 | $86,860 / $17,718 | $99,511 | $97,525 / $17,744 | $100,056 / $17,744 |
| `control: Appendix A` | −$8,766 / −$28,742 / −$18,754 | $56,912 / $62,987 | $65,955 / $96,309 | 51.8 % (46.8 %–56.8 %) | −$17,539 / $54,259 | $41,193 / $26,314 | $31,030 / $34,541 | $39,043 | $39,645 / $26,659 | $53,817 / $17,710 |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/G/refine/G.h1.s1/R105#1 profit` | $80,032 | −$183 | $0 | $0 | $82,419 | $0 | −$811 | $0 | $0 | $3,372 | $6,923 |
| `C24/G/refine/G.h2.s1/R105#2 robust` | $0 | $0 | $0 | $0 | $100,849 | $0 | $24,903 | $9,914 | $0 | $0 | $0 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | $0 | $0 | $0 | $0 | $101,490 | $0 | $676 | $0 | $0 | $0 | $0 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | $0 | $0 | $0 | $0 | $31,838 | $0 | $7,410 | $0 | $0 | $0 | $0 |
| `C24/G/informed/G.h1.s1/R101#1 profit` | $0 | $0 | $0 | $0 | $96,300 | $0 | $24,379 | $35,342 | $22,502 | $0 | $0 |
| `C24/G/informed/G.h2.s1/R105#1 profit` | $0 | $0 | $0 | $0 | $98,255 | $1,696 | $21,922 | $23,129 | $0 | $0 | −$4,590 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | $0 | $0 | $0 | $0 | $101,490 | $0 | $676 | $0 | $0 | $0 | $0 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | $0 | $0 | $0 | $0 | $31,838 | $0 | $7,410 | $0 | $0 | $0 | $0 |
| `control: 4A primary indep-rise#1` | $0 | $0 | $0 | $0 | $91,706 | $0 | $23,907 | $31,332 | −$7,277 | $0 | $0 |
| `control: 4A informed#2 robust` | $0 | $0 | $0 | $0 | $75,024 | −$602 | $4,947 | $30,789 | $0 | $39,487 | $0 |
| `control: 4A/3C P08` | $0 | $0 | $0 | $0 | $73,431 | $0 | $16,903 | $30,675 | $0 | $0 | $0 |
| `control: 4A/3C P09` | $0 | $7,146 | −$3,010 | $0 | $59,365 | −$1,205 | $13,305 | $0 | $24,455 | $0 | $0 |
| `control: Appendix A` | $24,502 | $0 | $0 | $6,545 | $16,718 | $0 | $0 | −$7,394 | $13,446 | $70,842 | $16,499 |

### Parameter vectors

- `C24/G/refine/G.h1.s1/R105#1 profit` — cell `G.h1.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 20, recentLowLookbackBars 10, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 27, eligibilityMinimumAdvancePercent 5.6, drawdownRecoveryGateEnabled false, trailingStopPercent 3.5, maximumHoldEnabled true, maximumHoldDays 12, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 14, initialStopAtrMultiple 3.3, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 122, classicPullbackPercent 3, classicReboundPercent 1.83
- `C24/G/refine/G.h2.s1/R105#2 robust` — cell `G.h2.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.4, recentLowLookbackBars 94, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 23, eligibilityMinimumAdvancePercent 9, drawdownRecoveryGateEnabled false, trailingStopPercent 6.1, maximumHoldEnabled true, maximumHoldDays 29, intradayLossBufferEnabled true, intradayLossBufferPercent 5.9, initialStopEnabled true, initialStopAtrSessions 58, initialStopAtrMultiple 3.4, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 63, classicPullbackPercent 4.6, classicReboundPercent 2.62
- `C24/G/refine/G.h1.s1/R101#2 robust` — cell `G.h1.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.5, recentLowLookbackBars 152, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 28, eligibilityMinimumAdvancePercent 9.5, drawdownRecoveryGateEnabled false, trailingStopPercent 4.7, maximumHoldEnabled true, maximumHoldDays 11, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 14, initialStopAtrMultiple 3.7, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 135, classicPullbackPercent 3, classicReboundPercent 1.56
- `C24/G/refine/G.h0.s0/R101#3 balanced` — cell `G.h0.s0`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.2, recentLowLookbackBars 107, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 26, eligibilityMinimumAdvancePercent 8.5, drawdownRecoveryGateEnabled false, trailingStopPercent 3, maximumHoldEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled false
- `C24/G/informed/G.h1.s1/R101#1 profit` — cell `G.h1.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3, recentLowLookbackBars 59, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 17, eligibilityMinimumAdvancePercent 8.4, drawdownRecoveryGateEnabled false, trailingStopPercent 6.9, maximumHoldEnabled true, maximumHoldDays 28, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 40, initialStopAtrMultiple 4.1, retentionEnabled true, retentionSellPercent 77, retentionSmaSessions 30, retentionClosesBelow 5, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 38, classicPullbackPercent 9.9, classicReboundPercent 0.37
- `C24/G/informed/G.h2.s1/R105#1 profit` — cell `G.h2.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.9, recentLowLookbackBars 153, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 27, eligibilityMinimumAdvancePercent 7.8, drawdownRecoveryGateEnabled false, trailingStopPercent 6.1, maximumHoldEnabled true, maximumHoldDays 16, intradayLossBufferEnabled true, intradayLossBufferPercent 2.7, initialStopEnabled true, initialStopAtrSessions 48, initialStopAtrMultiple 3.8, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 98, classicPullbackPercent 3.3, classicReboundPercent 3.57
- `C24/G/refine/G.h1.s1/R101#2 robust` — cell `G.h1.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.5, recentLowLookbackBars 152, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 28, eligibilityMinimumAdvancePercent 9.5, drawdownRecoveryGateEnabled false, trailingStopPercent 4.7, maximumHoldEnabled true, maximumHoldDays 11, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 14, initialStopAtrMultiple 3.7, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 135, classicPullbackPercent 3, classicReboundPercent 1.56
- `C24/G/refine/G.h0.s0/R101#3 balanced` — cell `G.h0.s0`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.2, recentLowLookbackBars 107, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 26, eligibilityMinimumAdvancePercent 8.5, drawdownRecoveryGateEnabled false, trailingStopPercent 3, maximumHoldEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled false
- `control: 4A primary indep-rise#1` — cell `G.h1.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.2, recentLowLookbackBars 73, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 20, eligibilityMinimumAdvancePercent 8.9, drawdownRecoveryGateEnabled false, trailingStopPercent 7, maximumHoldEnabled true, maximumHoldDays 29, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 40, initialStopAtrMultiple 4.3, retentionEnabled true, retentionSellPercent 81, retentionSmaSessions 24, retentionClosesBelow 5, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 66, classicPullbackPercent 9.2, classicReboundPercent 0.8
- `control: 4A informed#2 robust` — cell `G.h2.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.1, recentLowLookbackBars 148, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 25, eligibilityMinimumAdvancePercent 7.3, drawdownRecoveryGateEnabled false, trailingStopPercent 5.8, maximumHoldEnabled true, maximumHoldDays 14, intradayLossBufferEnabled true, intradayLossBufferPercent 2.7, initialStopEnabled true, initialStopAtrSessions 47, initialStopAtrMultiple 3.7, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 103, classicPullbackPercent 7.7, classicReboundPercent 3.52
- `control: 4A/3C P08` — cell `G.h2.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.6, recentLowLookbackBars 138, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 24, eligibilityMinimumAdvancePercent 8.2, drawdownRecoveryGateEnabled false, trailingStopPercent 5.5, maximumHoldEnabled true, maximumHoldDays 14, intradayLossBufferEnabled true, intradayLossBufferPercent 2.8, initialStopEnabled true, initialStopAtrSessions 48, initialStopAtrMultiple 3.8, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 104, classicPullbackPercent 9.1, classicReboundPercent 3.5
- `control: 4A/3C P09` — cell `G.h1.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.5, recentLowLookbackBars 155, trendFilterEnabled true, trendMethod regression_slope, trendSlopeLookbackSessions 100, trendSlopeMinimumPercent -4.1, eligibilityEnabled true, eligibilityPolicy reset_renew, eligibilityMaxAgeSessions 10, eligibilityResetDropPercent 5.5, eligibilityRenewalReboundPercent 5.2, drawdownRecoveryGateEnabled false, trailingStopPercent 5.6, maximumHoldEnabled true, maximumHoldDays 6, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 32, initialStopAtrMultiple 3, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 17, classicPullbackPercent 11.7, classicReboundPercent 2.82
- `control: Appendix A` — cell `G.h0.s1`
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3, recentLowLookbackBars 22, trendFilterEnabled true, trendMethod price_change, trendChangeLookbackSessions 30, trendChangeMinimumReturnPercent -2, eligibilityEnabled true, eligibilityPolicy time_limited, eligibilityMaxAgeSessions 20, drawdownRecoveryGateEnabled true, dipLookbackSessions 60, dipThresholdPercent 10, recoveryRetracementPercent 49, recoveryConfirmationSessions 2, trailingStopPercent 7, maximumHoldEnabled false, initialStopEnabled true, initialStopAtrSessions 20, initialStopAtrMultiple 2, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 60, uptrendSmaBars 50, uptrendSlopeBars 10, uptrendMinimumRisePercent 0, pullbackMinimumPercent 1.5, pullbackMaximumPercent 8, recoveryPercent 2

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/G/refine/G.h1.s1/R106#1 profit` | C19 primary G | $115,059.37 | 109 | 44.0 % | 11 / 167 | 69.3 % (1,888 / 2,723) | $618,307 / $16,155 | −$14,823 | none | $36,117 / $40,376 / $57,412 |
| `C21/G/refine/G.h2.s0/R101#1 profit` | C21 primary G | $150,828.29 | 32 | 71.9 % | 26 / 64 | 18.6 % (507 / 2,723) | $225,953 / $13,200 | −$16,797 | none | $37,598 / $41,758 / $58,398 |
| `C23/G/refine/G.h2.s0/R104#1 profit` | C23 primary G | $158,650.55 | 17 | 88.2 % | 14 / 49 | 7.9 % (216 / 2,723) | $126,726 / $10,329 | −$9,137 | none | $31,853 / $36,396 / $54,569 |
| `C24/G/refine/G.h1.s1/R105#1 profit` | C24 primary G | $171,750.86 | 41 | 82.9 % | 7 / 17 | 8.0 % (217 / 2,723) | $169,914 / $10,463 | −$10,199 | none | $32,649 / $37,139 / $55,099 |
| `C24/G/refine/G.h2.s1/R105#2 robust` | C24 role G/robust-profit | $135,665.35 | 13 | 84.6 % | 20 / 62 | 7.8 % (211 / 2,723) | $110,140 / $10,601 | −$10,719 | none | $33,039 / $37,503 / $55,359 |
| `C24/G/refine/G.h1.s1/R101#2 robust` | C24 role G/balanced; C24 role G+/balanced | $102,166.71 | 10 | 80.0 % | 7 / 19 | 1.9 % (53 / 2,723) | $66,408 / $10,463 | −$10,222 | none | $32,666 / $37,155 / $55,111 |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | C24 role G/lower-drawdown; C24 role G+/lower-drawdown | $39,248.35 | 2 | 100.0 % | 3.5 / 6 | 0.2 % (5 / 2,723) | $9,066 / $5,049 | −$2,795 | none | $27,096 / $31,956 / $51,397 |
| `C24/G/informed/G.h1.s1/R101#1 profit` | C24 primary G+ | $178,522.74 | 12 | 91.7 % | 41.5 / 127 | 16.8 % (458 / 2,723) | $105,508 / $10,981 | −$6,584 | none | $29,938 / $34,609 / $53,292 |
| `C24/G/informed/G.h2.s1/R105#1 profit` | C24 role G+/robust-profit | $140,412.36 | 15 | 73.3 % | 16 / 50 | 7.3 % (199 / 2,723) | $114,407 / $10,378 | −$12,636 | none | $34,477 / $38,845 / $56,318 |
| `control: 4A primary indep-rise#1` | control | $139,668.45 | 11 | 81.8 % | 41 / 99 | 13.4 % (364 / 2,723) | $95,480 / $10,821 | −$7,803 | none | $30,852 / $35,462 / $53,902 |
| `control: 4A informed#2 robust` | control | $149,645.63 | 20 | 75.0 % | 14 / 53 | 8.9 % (243 / 2,723) | $130,452 / $10,378 | −$8,550 | none | $31,412 / $35,985 / $54,275 |
| `control: 4A/3C P08` | control | $121,008.75 | 11 | 81.8 % | 14 / 48 | 4.7 % (127 / 2,723) | $77,129 / $10,378 | −$8,550 | none | $31,412 / $35,985 / $54,275 |
| `control: 4A/3C P09` | control | $100,056.17 | 15 | 60.0 % | 7 / 50 | 4.8 % (131 / 2,723) | $85,616 / $10,463 | −$3,934 | none | $27,951 / $32,754 / $51,967 |
| `control: Appendix A` | control | $141,157.37 | 19 | 89.5 % | 29 / 163 | 19.1 % (519 / 2,723) | $169,827 / $13,292 | −$7,394 | none | $30,546 / $35,176 / $53,697 |

Worst closed trades of each subject (net after costs and interest):

- `C19/G/refine/G.h1.s1/R106#1 profit`: Growth·GDX 2026-03-17 → 2026-03-19 (initial stop gap, 2 d) −$14,823.19; Growth·GDX 2020-03-13 → 2020-03-13 (initial stop, 0 d) −$11,446.69; Growth·GDX 2026-09-03 → 2026-09-14 (initial stop gap, 11 d) −$7,129.83; Growth·GDX 2022-06-27 → 2022-06-30 (initial stop, 3 d) −$6,661.19; Growth·GDX 2020-11-23 → 2020-11-24 (initial stop gap, 1 d) −$6,175.26
  - largest giveback: Growth·GDX 2026-03-17 → 2026-03-19 best mark $1,331.63, final −$14,823.19 (giveback $16,154.82)
- `C21/G/refine/G.h2.s0/R101#1 profit`: Growth·GDX 2022-06-03 → 2022-06-29 (maximum hold, 26 d) −$12,217.86; Growth·GDX 2022-04-25 → 2022-05-23 (maximum hold, 28 d) −$8,713.01; Growth·GDX 2024-01-16 → 2024-02-12 (maximum hold, 27 d) −$8,711.39; Growth·GDX 2023-12-14 → 2024-01-09 (maximum hold, 26 d) −$6,168.38; Growth·GDX 2022-10-04 → 2022-10-31 (maximum hold, 27 d) −$6,161.24
  - largest giveback: Growth·GDX 2022-06-03 → 2022-06-29 best mark $982.32, final −$12,217.86 (giveback $13,200.17)
- `C23/G/refine/G.h2.s0/R104#1 profit`: Growth·GDX 2023-05-02 → 2023-05-16 (maximum hold, 14 d) −$2,612.19; Growth·GDX 2020-08-26 → 2020-09-09 (maximum hold, 14 d) −$642.93; Growth·GDX 2020-05-28 → 2020-06-11 (maximum hold, 14 d) $282.66; Growth·GDX 2022-10-13 → 2022-11-02 (trailing stop, 20 d) $900.47; Growth·GDX 2020-08-12 → 2020-08-19 (trailing stop, 7 d) $1,826.79
  - largest giveback: Growth·GDX 2020-03-27 → 2020-04-15 best mark $26,964.98, final $16,636.08 (giveback $10,328.90)
- `C24/G/refine/G.h1.s1/R105#1 profit`: Growth·GDX 2026-09-10 → 2026-09-22 (maximum hold, 12 d) −$3,107.55; Growth·GDX 2020-08-07 → 2020-08-19 (maximum hold, 12 d) −$3,026.69; Growth·GDX 2016-07-07 → 2016-07-19 (maximum hold, 12 d) −$1,489.78; Growth·GDX 2026-04-09 → 2026-04-21 (maximum hold, 12 d) −$1,412.16; Growth·GDX 2022-11-11 → 2022-11-23 (maximum hold, 12 d) −$811.20
  - largest giveback: Growth·GDX 2020-03-19 → 2020-03-20 best mark $24,361.09, final $13,898.00 (giveback $10,463.09)
- `C24/G/refine/G.h2.s1/R105#2 robust`: Growth·GDX 2023-05-05 → 2023-05-18 (initial stop gap, 13 d) −$9,545.61; Growth·GDX 2020-07-29 → 2020-08-27 (maximum hold, 29 d) −$3,647.14; Growth·GDX 2022-10-13 → 2022-11-02 (trailing stop, 20 d) $2,633.24; Growth·GDX 2020-04-24 → 2020-05-21 (trailing stop, 27 d) $3,172.16; Growth·GDX 2023-01-03 → 2023-02-03 (trailing stop gap, 31 d) $4,110.72
  - largest giveback: Growth·GDX 2020-03-30 → 2020-04-15 best mark $30,420.39, final $19,819.70 (giveback $10,600.69)
- `C24/G/refine/G.h1.s1/R101#2 robust`: Growth·GDX 2022-10-07 → 2022-10-18 (maximum hold, 11 d) −$5,464.41; Growth·GDX 2020-05-27 → 2020-06-03 (trailing stop gap, 7 d) −$130.64; Growth·GDX 2020-04-28 → 2020-05-11 (trailing stop, 13 d) $607.05; Growth·GDX 2020-05-13 → 2020-05-21 (trailing stop, 8 d) $4,844.60; Growth·GDX 2022-09-29 → 2022-10-05 (trailing stop, 6 d) $6,140.65
  - largest giveback: Growth·GDX 2020-03-19 → 2020-03-20 best mark $24,361.09, final $13,898.00 (giveback $10,463.09)
- `C24/G/refine/G.h0.s0/R101#3 balanced`: Growth·GDX 2022-09-29 → 2022-10-05 (trailing stop gap, 6 d) $7,410.42; Growth·GDX 2020-03-16 → 2020-03-17 (trailing stop gap, 1 d) $31,837.93
  - largest giveback: Growth·GDX 2020-03-16 → 2020-03-17 best mark $36,886.78, final $31,837.93 (giveback $5,048.85)
- `C24/G/informed/G.h1.s1/R101#1 profit`: Growth·GDX 2020-09-23 → 2020-10-22 (maximum hold, 29 d) −$642.96; Growth·GDX 2022-09-29 → 2022-10-17 (trend exit, 18 d) $1,523.68; Growth·GDX 2023-06-28 → 2023-08-03 (maximum hold, 36 d) $2,139.17; Growth·GDX 2023-12-12 → 2024-01-10 (trend exit, 29 d) $2,299.33; Growth·GDX 2023-09-27 → 2023-11-13 (maximum hold, 47 d) $2,861.87
  - largest giveback: Growth·GDX 2023-02-24 → 2023-05-18 best mark $33,420.57, final $22,439.33 (giveback $10,981.24)
- `C24/G/informed/G.h2.s1/R105#1 profit`: Growth·GDX 2026-07-06 → 2026-07-22 (maximum hold, 16 d) −$4,589.70; Growth·GDX 2023-05-01 → 2023-05-17 (maximum hold, 16 d) −$4,588.05; Growth·GDX 2020-05-27 → 2020-06-12 (maximum hold, 16 d) −$1,632.79; Growth·GDX 2021-12-17 → 2022-01-03 (maximum hold, 17 d) −$325.48; Growth·GDX 2022-10-13 → 2022-11-02 (trailing stop, 20 d) $1,658.04
  - largest giveback: Growth·GDX 2020-03-27 → 2020-04-15 best mark $27,573.13, final $17,195.10 (giveback $10,378.02)
- `control: 4A primary indep-rise#1`: Growth·GDX 2024-01-19 → 2024-02-20 (maximum hold, 32 d) −$2,655.21; Growth·GDX 2020-09-21 → 2020-10-20 (maximum hold, 29 d) −$1,854.88; Growth·GDX 2023-09-27 → 2023-11-09 (maximum hold, 43 d) $658.19; Growth·GDX 2023-06-22 → 2023-08-02 (maximum hold, 41 d) $1,240.65; Growth·GDX 2022-09-29 → 2022-10-17 (trend exit, 18 d) $1,629.52
  - largest giveback: Growth·GDX 2020-06-15 → 2020-08-26 best mark $38,992.56, final $28,171.64 (giveback $10,820.92)
- `control: 4A informed#2 robust`: Growth·GDX 2021-02-02 → 2021-02-16 (maximum hold, 14 d) −$2,297.61; Growth·GDX 2020-05-27 → 2020-06-10 (maximum hold, 14 d) −$1,233.53; Growth·GDX 2025-07-01 → 2025-07-15 (maximum hold, 14 d) −$1,174.07; Growth·GDX 2023-08-23 → 2023-09-06 (maximum hold, 14 d) −$380.52; Growth·GDX 2021-12-17 → 2022-01-03 (maximum hold, 17 d) −$325.48
  - largest giveback: Growth·GDX 2020-03-27 → 2020-04-15 best mark $27,573.13, final $17,195.10 (giveback $10,378.02)
- `control: 4A/3C P08`: Growth·GDX 2020-05-27 → 2020-06-10 (maximum hold, 14 d) −$1,233.53; Growth·GDX 2023-08-23 → 2023-09-06 (maximum hold, 14 d) −$380.52; Growth·GDX 2023-05-31 → 2023-06-14 (maximum hold, 14 d) $23.16; Growth·GDX 2020-05-01 → 2020-05-11 (trailing stop, 10 d) $2,581.29; Growth·GDX 2022-09-29 → 2022-10-07 (trailing stop, 8 d) $5,187.85
  - largest giveback: Growth·GDX 2020-03-27 → 2020-04-15 best mark $27,573.13, final $17,195.10 (giveback $10,378.02)
- `control: 4A/3C P09`: Growth·GDX 2018-07-25 → 2018-07-31 (maximum hold, 6 d) −$2,604.56; Growth·GDX 2024-02-16 → 2024-02-23 (maximum hold, 7 d) −$1,998.41; Growth·GDX 2021-12-17 → 2021-12-23 (maximum hold, 6 d) −$1,204.89; Growth·GDX 2018-03-02 → 2018-03-08 (maximum hold, 6 d) −$877.33; Growth·GDX 2018-03-22 → 2018-03-29 (maximum hold, 7 d) −$678.53
  - largest giveback: Growth·GDX 2020-03-19 → 2020-03-20 best mark $24,361.09, final $13,898.00 (giveback $10,463.09)
- `control: Appendix A`: Growth·GDX 2023-04-06 → 2023-05-18 (initial stop, 42 d) −$7,394.32; Growth·GDX 2020-03-04 → 2020-03-10 (initial stop, 6 d) −$6,910.38; Growth·GDX 2019-08-21 → 2019-09-06 (trailing stop, 16 d) $91.31; Growth·GDX 2025-05-27 → 2025-06-24 (trailing stop, 28 d) $694.93; Growth·GDX 2019-09-17 → 2020-02-27 (trailing stop, 163 d) $2,735.43
  - largest giveback: Growth·GDX 2023-04-06 → 2023-05-18 best mark $5,897.75, final −$7,394.32 (giveback $13,292.07)

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/G/refine/G.h1.s1/R105#1 profit` | small | 128 | $107,117 / $65,668 | $23,426 / $26,197 / $35,048 | $26,570 | 1 (0.8 %; 0.1 %–4.3 %) |
| `C24/G/refine/G.h1.s1/R105#1 profit` | wide | 128 | $71,605 / $33,317 | $46,779 / $52,523 / $75,959 | $58,508 | 24 (18.8 %; 12.9 %–26.4 %) |
| `C24/G/refine/G.h2.s1/R105#2 robust` | small | 128 | $130,247 / $113,151 | $19,766 / $20,137 / $22,527 | $20,418 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/G/refine/G.h2.s1/R105#2 robust` | wide | 128 | $98,172 / $0 | $32,560 / $40,112 / $72,218 | $45,782 | 10 (7.8 %; 4.3 %–13.8 %) |
| `C24/G/refine/G.h1.s1/R101#2 robust` | small | 128 | $99,313 / $93,805 | $17,744 / $17,744 / $19,456 | $18,073 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/G/refine/G.h1.s1/R101#2 robust` | wide | 128 | $96,075 / $62,836 | $29,086 / $39,872 / $54,227 | $40,192 | 10 (7.8 %; 4.3 %–13.8 %) |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | small | 128 | $39,248 / $39,248 | $10,801 / $11,231 / $11,231 | $11,198 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | wide | 128 | $39,248 / $0 | $34,650 / $46,159 / $81,645 | $50,081 | 11 (8.6 %; 4.9 %–14.7 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/G/refine/G.h1.s1/R106#1 profit` | $108,264 | 8.5 % | Growth·GDX from 2019-11-27: unrealized $9,154 (market value 1.102× the lot's principal) | trend exit 2020-02-18: lot net $9,154 at the cutoff (partial exits included) → final $5,373; change on the slice −$3,780 | −$1,563 / −$3,978 / −$5,305 | −$2,815 / −$11,447 |
| C21 | `C21/G/refine/G.h2.s0/R101#1 profit` | $164,606 | 0.0 % | none open | none open | −$1,900 / −$6,234 / −$8,131 | −$8,259 / −$16,797 |
| C23 | `C23/G/refine/G.h2.s0/R104#1 profit` | $158,651 | 0.0 % | none open | none open | −$2,795 / −$6,665 / −$9,137 | — / — |
| C24 | `C24/G/refine/G.h1.s1/R105#1 profit` | $161,457 | 0.0 % | none open | none open | −$2,180 / −$5,908 / −$10,199 | −$1,677 / −$6,557 |

