# D1-first sequential (arm S: frozen GDX D1 finalists + a Growth search beside them)

**Verdict: development-qualified at C24, chronologically UNSUPPORTED (net $69,432, DD $48,177 — the highest sequential net
of the five arms, with the same breach as D), and the C24 primary FAILS V2 and V3 on 2025–2026 (validation reset DD
$59,792).** Not a candidate. Research only; nothing adopted.

## What the arm is

At each cutoff the D arm's finalists (F = 3 at C19–C23, F = 2 at C24) are frozen and a Growth·GDX book is searched beside
each (cells = finalist × 6 Growth structures), R_S = max(6, ⌈240 / (6F)⌉) replicates (14, then 20 at C24). S is scored
against the full pool of every S configuration (not only within its frozen D1).

## Findings

1. **Chronology.** C19 `S.C19F1.h1.s1/R103#1` → 2020–2021 +$26,271, **DD $48,177 (breach: the frozen D1 book's March-2020
   lot, identical to D's)**; C21 `S.C21F1.h2.s1/R104#1` → 2022–2023 +$26,414 / $26,031; C23 `S.C23F1.h2.s0/R104#1` → 2024
   +$16,747 / $9,858. Chained: **$69,432 / $48,177 → unsupported**. The Growth book improved each slice's P&L over D's
   (2020–2021: +$26,271 vs −$14,659) but could not remove the D1 book's drawdown.
2. **C24 primary `C24/S/refine/S.C24F1.h0.s0/R106#1 profit`** (`rc1-259e15b855bdd8b8`) = the D primary + an unrestricted
   Growth book: development $336,819 (the highest development net of any GDX-only primary), DD $28,008; confirmation robust
   $178,012, p90 / p95 DD $34,369 / $36,986, breach share 8.6 % (Wilson 6.2–11.8 %). The Growth book adds +$66,040 with
   **two lots** (both in 2016) and +$10,413 DD (causal removal: without Growth = the D primary, $270,780 / $17,595).
3. **Validation (FULL, once): +$21,640 but a reset DD of $59,792** (+$46,638 in 2025, −$24,998 in 2026). 64.5 % of its
   validation neighbourhood breaches (training 9.0 %).
4. **Against D:** +$66,040 centre net, +$10,413 DD, +$40,101 confirmation robust — a single-episode Growth increment.
   Against J: +$106,409 (see JOINT_REPORT.md).
5. **The balanced role `S.C24F2.h2.s0/R105#3`** passes V1–V3 (+$34,298 / $27,398) — a role holder, not a nominee.

Sections A–I below carry every figure.

---

_Sections A–I below are generated from the sealed records by `tools/gdx-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 252 / 72 | 14 | 1✗ | 5,927,998 | 5,690,455 | 2,589.2 | 2: 136, 3: 85, 4: 95, 5: 7, 6: 1 | triggers not met 324 | 18 / 18 | converged by the frozen rules |
| C21 | 252 / 72 | 14 | 1✗ | 5,884,466 | 5,604,820 | 3,207.4 | 2: 183, 3: 57, 4: 79, 5: 5 | triggers not met 324 | 18 / 18 | converged by the frozen rules |
| C23 | 252 / 72 | 14 | 1✗ | 5,360,358 | 5,116,068 | 3,864.2 | 2: 186, 3: 54, 4: 76, 5: 7, 6: 1 | triggers not met 324 | 18 / 18 | converged by the frozen rules |
| C24 | 240 / 72 | 20 | 1✗ | 5,374,868 | 5,103,973 | 4,037.1 | 2: 173, 3: 62, 4: 76, 5: 1 | triggers not met 312 | 12 / 12 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 755 | 749 | Q3 5, Q5 1 | — |
| C19 | refine | 386 | 381 | Q3 5 | — |
| C21 | broad | 756 | 749 | Q3 7 | — |
| C21 | refine | 386 | 381 | Q3 5 | — |
| C23 | broad | 754 | 729 | Q3 25 | — |
| C23 | refine | 383 | 371 | Q3 12 | — |
| C24 | broad | 720 | 699 | Q3 21 | — |
| C24 | refine | 401 | 395 | Q3 6 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | S | 1,141 / 1,130 | `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` | $164,981 | $16,043 | 36 | $72,451 / $33,691 | $56,081 / $33,801 | no (`C19/S/refine/S.C19F1.h2.s0/R104#4 profit order`) |
| C19 | S-P | 950 / 942 | `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` | $164,981 | $16,043 | 36 | $72,451 / $33,691 | $56,081 / $33,801 | no (`C19/S/refine/S.C19F1.h2.s0/R104#4 profit order`) |
| C19 | S-U | 191 / 188 | `C19/S/broad/S.C19F1.h0.s0/R106#1 profit` | $130,618 | $18,134 | 27 | $52,882 / $23,114 | $38,900 / $23,649 | no (`C19/S/broad/S.C19F1.h0.s0/R107#1 profit`) |
| C21 | S | 1,142 / 1,130 | `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` | $308,988 | $17,281 | 52 | $174,982 / $27,421 | $154,925 / $26,802 | no (`C21/S/refine/S.C21F1.h2.s0/R101#1 profit`) |
| C21 | S-P | 983 / 973 | `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` | $308,988 | $17,281 | 52 | $174,982 / $27,421 | $154,925 / $26,802 | no (`C21/S/refine/S.C21F1.h2.s0/R101#1 profit`) |
| C21 | S-U | 159 / 157 | `C21/S/broad/S.C21F1.h0.s0/R106#1 profit` | $275,224 | $27,702 | 37 | $158,336 / $29,859 | $142,899 / $29,678 | no (`C21/S/broad/S.C21F1.h0.s0/R101#3 profit order`) |
| C23 | S | 1,137 / 1,100 | `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | $303,153 | $19,299 | 53 | $152,125 / $33,842 | $133,728 / $34,056 | no (`C23/S/refine/S.C23F1.h2.s0/R103#4 Growth gate alternative`) |
| C23 | S-P | 943 / 910 | `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | $303,153 | $19,299 | 53 | $152,125 / $33,842 | $133,728 / $34,056 | no (`C23/S/refine/S.C23F1.h2.s0/R103#4 Growth gate alternative`) |
| C23 | S-U | 194 / 190 | `C23/S/broad/S.C23F1.h0.s0/R111#1 profit` | $268,768 | $19,299 | 41 | $144,954 / $34,226 | $120,972 / $33,947 | no (`C23/S/refine/S.C23F3.h0.s0/R102#1 profit`) |
| C24 | S | 1,121 / 1,094 | `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $336,819 | $28,008 | 44 | $178,709 / $34,140 | $149,291 / $34,369 | no (`C24/S/broad/S.C24F1.h1.s0/R108#2 robust`) |
| C24 | S-P | 936 / 912 | `C24/S/refine/S.C24F1.h2.s0/R103#1 profit` | $336,819 | $28,008 | 44 | $163,166 / $33,805 | $134,223 / $33,574 | no (`C24/S/broad/S.C24F1.h1.s0/R108#2 robust`) |
| C24 | S-U | 185 / 182 | `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $336,819 | $28,008 | 44 | $178,709 / $34,140 | $149,291 / $34,369 | no (`C24/S/refine/S.C24F2.h0.s0/R102#1 profit`) |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/S/refine/S.C19F2.h2.s1/R103#2 robust` | `C19/S/refine/S.C19F2.h0.s0/R104#3 balanced` | `C19/S/broad/S.C19F3.h2.s1/R101#3 balanced` |
| C21 | `C21/S/refine/S.C21F2.h2.s0/R105#3 balanced` | `C21/S/refine/S.C21F3.h2.s1/R104#3 balanced` | `C21/S/broad/S.C21F3.h0.s0/R109#3 balanced` |
| C23 | `C23/S/refine/S.C23F2.h1.s0/R104#2 robust` | `C23/S/refine/S.C23F3.h1.s1/R101#2 balanced` | `C23/S/broad/S.C23F3.h0.s0/R102#3 balanced` |
| C24 | `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` |

- C19: frozen D1 finalists `C19F1` = `C19/D/refine/D.A1/R103#1 profit`, `C19F2` = `C19/D/refine/D.A1/R106#2 robust`, `C19F3` = `C19/D/refine/D.A1/R104#3 balanced`
- C21: frozen D1 finalists `C21F1` = `C21/D/refine/D.A0/R101#1 profit`, `C21F2` = `C21/D/refine/D.C1/R105#6 profit order`, `C21F3` = `C21/D/refine/D.D1/R106#3 balanced`
- C23: frozen D1 finalists `C23F1` = `C23/D/refine/D.B1/R106#1 profit`, `C23F2` = `C23/D/refine/D.A1/R101#2 robust`, `C23F3` = `C23/D/refine/D.B1/R104#2 robust`
- C24: frozen D1 finalists `C24F1` = `C24/D/refine/D.D1/R103#1 profit`, `C24F2` = `C24/D/refine/D.B1/R106#2 robust`

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` | primary S/original; primary S-P/original; role S/actual-profit; role S-P/actual-profit | $164,981 | $26,271 | $48,177 | $48,177 | 15 (6 losing) | −$44,743 | 243 / 256 (training 8.2 %) |
| C19 | `C19/S/broad/S.C19F1.h0.s0/R106#1 profit` | primary S-U/original; role S-U/actual-profit | $130,618 | −$32,741 | $48,690 | $48,690 | 8 (3 losing) | −$44,743 | 256 / 256 (training 0.4 %) |
| C19 | `C19/S/refine/S.C19F2.h2.s1/R103#2 robust` | role S/robust-profit; role S-P/robust-profit | $119,608 | −$31,533 | $48,527 | $48,527 | 17 (10 losing) | −$44,951 | 256 / 256 (training 1.2 %) |
| C19 | `C19/S/refine/S.C19F2.h0.s0/R104#3 balanced` | role S/balanced; role S-U/balanced | $91,148 | −$51,857 | $70,353 | $70,353 | 11 (6 losing) | −$44,951 | 256 / 256 (training 0.8 %) |
| C19 | `C19/S/broad/S.C19F3.h2.s1/R101#3 balanced` | role S/lower-drawdown; role S-P/lower-drawdown | $60,115 | −$435 | $42,961 | $42,961 | 12 (4 losing) | −$39,528 | 256 / 256 (training 0.0 %) |
| C19 | `C19/S/refine/S.C19F2.h1.s1/R102#3 balanced` | role S-P/balanced | $98,942 | −$34,190 | $48,274 | $48,274 | 10 (7 losing) | −$44,951 | 256 / 256 (training 0.0 %) |
| C19 | `C19/S/refine/S.C19F2.h0.s0/R105#2 robust` | role S-U/robust-profit | $99,042 | −$27,989 | $48,274 | $48,274 | 11 (5 losing) | −$44,951 | 256 / 256 (training 0.0 %) |
| C19 | `C19/S/broad/S.C19F3.h0.s0/R102#3 balanced` | role S-U/lower-drawdown | $39,664 | −$16,573 | $49,368 | $52,682 | 4 (1 losing) | −$49,368 | 256 / 256 (training 0.0 %) |
| C21 | `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` | primary S/original; primary S-P/original; role S/actual-profit; role S-P/actual-profit | $308,988 | $26,414 | $26,031 | $26,031 | 26 (17 losing) | −$6,315 | 57 / 256 (training 0.8 %) |
| C21 | `C21/S/broad/S.C21F1.h0.s0/R106#1 profit` | primary S-U/original; role S-U/actual-profit | $275,224 | $24,823 | $20,744 | $27,716 | 21 (15 losing) | −$6,315 | 31 / 256 (training 2.3 %) |
| C21 | `C21/S/refine/S.C21F2.h2.s0/R105#3 balanced` | role S/robust-profit; role S-P/robust-profit | $255,389 | −$25,234 | $50,175 | $51,344 | 15 (8 losing) | −$10,449 | 256 / 256 (training 0.0 %) |
| C21 | `C21/S/refine/S.C21F3.h2.s1/R104#3 balanced` | role S/balanced; role S-P/balanced | $172,499 | −$2,474 | $48,986 | $48,986 | 9 (4 losing) | −$21,139 | 252 / 256 (training 0.0 %) |
| C21 | `C21/S/broad/S.C21F3.h0.s0/R109#3 balanced` | role S/lower-drawdown; role S-U/lower-drawdown | $161,483 | −$2,474 | $48,986 | $48,986 | 9 (4 losing) | −$21,139 | 252 / 256 (training 0.0 %) |
| C21 | `C21/S/broad/S.C21F3.h0.s1/R105#3 balanced` | role S-P/lower-drawdown | $161,193 | −$3,489 | $48,986 | $48,986 | 10 (4 losing) | −$21,139 | 252 / 256 (training 0.0 %) |
| C21 | `C21/S/broad/S.C21F2.h0.s0/R107#1 profit` | role S-U/robust-profit | $219,300 | −$25,234 | $50,175 | $51,344 | 15 (8 losing) | −$10,449 | 256 / 256 (training 1.2 %) |
| C21 | `C21/S/broad/S.C21F3.h0.s0/R112#3 balanced` | role S-U/balanced | $163,721 | −$2,474 | $48,986 | $48,986 | 9 (4 losing) | −$21,139 | 252 / 256 (training 0.4 %) |
| C23 | `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | primary S/original; primary S-P/original; role S/actual-profit; role S-P/actual-profit | $303,153 | $16,747 | $9,858 | $19,299 | 4 (3 losing) | −$4,860 | 0 / 256 (training 7.4 %) |
| C23 | `C23/S/broad/S.C23F1.h0.s0/R111#1 profit` | primary S-U/original; role S-U/actual-profit | $268,768 | $16,747 | $9,858 | $19,299 | 4 (3 losing) | −$4,860 | 0 / 256 (training 9.0 %) |
| C23 | `C23/S/refine/S.C23F2.h1.s0/R104#2 robust` | role S/robust-profit; role S-P/robust-profit | $268,742 | $22,786 | $11,115 | $32,839 | 2 (1 losing) | −$3,412 | 0 / 256 (training 6.6 %) |
| C23 | `C23/S/refine/S.C23F3.h1.s1/R101#2 balanced` | role S/balanced; role S-P/balanced | $175,920 | $29,487 | $9,192 | $17,744 | 2 (0 losing) | −$1,876 | 0 / 256 (training 0.0 %) |
| C23 | `C23/S/broad/S.C23F3.h0.s0/R102#3 balanced` | role S/lower-drawdown; role S-U/lower-drawdown | $166,380 | $29,487 | $9,192 | $17,744 | 2 (0 losing) | −$1,876 | 0 / 256 (training 0.0 %) |
| C23 | `C23/S/broad/S.C23F3.h0.s1/R111#3 balanced` | role S-P/lower-drawdown | $166,066 | $29,487 | $9,192 | $17,744 | 2 (0 losing) | −$1,876 | 0 / 256 (training 0.0 %) |
| C23 | `C23/S/refine/S.C23F2.h0.s0/R106#2 robust` | role S-U/robust-profit | $218,710 | $22,786 | $11,115 | $32,839 | 2 (1 losing) | −$3,412 | 0 / 256 (training 4.3 %) |
| C23 | `C23/S/broad/S.C23F3.h0.s0/R103#2 balanced` | role S-U/balanced | $172,275 | $29,487 | $9,192 | $17,744 | 2 (0 losing) | −$1,876 | 0 / 256 (training 0.0 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| S/original | `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` → `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` → `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | $69,432 | $48,177 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S-P/original (report-only) | `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` → `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` → `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | $69,432 | $48,177 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S-U/original (report-only) | `C19/S/broad/S.C19F1.h0.s0/R106#1 profit` → `C21/S/broad/S.C21F1.h0.s0/R106#1 profit` → `C23/S/broad/S.C23F1.h0.s0/R111#1 profit` | $8,779 | $56,872 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| S: role robust-profit (descriptive) | `C19/S/refine/S.C19F2.h2.s1/R103#2 robust` → `C21/S/refine/S.C21F2.h2.s0/R105#3 balanced` → `C23/S/refine/S.C23F2.h1.s0/R104#2 robust` | −$34,031 | $85,767 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S: role balanced (descriptive) | `C19/S/refine/S.C19F2.h0.s0/R104#3 balanced` → `C21/S/refine/S.C21F3.h2.s1/R104#3 balanced` → `C23/S/refine/S.C23F3.h1.s1/R101#2 balanced` | −$24,944 | $106,029 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S: role lower-drawdown (descriptive) | `C19/S/broad/S.C19F3.h2.s1/R101#3 balanced` → `C21/S/broad/S.C21F3.h0.s0/R109#3 balanced` → `C23/S/broad/S.C23F3.h0.s0/R102#3 balanced` | $26,528 | $56,091 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind (population) | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist (S) | `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | primary S | pass | $336,819.26 | $375,610 | $34,205 | $4,586 | $28,007.62 (28.0 %) | 44 28/16 | $21,639.68 | $59,791.70 | $358,458.94 | $59,791.70 | ✓ ✗ ✗ |
| finalist (S) | `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | role S/robust-profit | pass | $246,822.69 | $271,387 | $22,030 | $2,534 | $25,241.43 (25.2 %) | 24 20/4 | $48,352.35 | $42,043.72 | $295,175.04 | $42,043.72 | ✓ ✗ ✗ |
| finalist (S) | `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | role S/balanced | pass | $216,457.46 | $237,490 | $18,515 | $2,518 | $18,640.92 (18.6 %) | 24 20/4 | $34,298.19 | $27,397.97 | $250,755.65 | $27,397.97 | ✓ ✓ ✓ |
| finalist (S) | `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | role S/lower-drawdown | pass | $182,993.87 | $201,095 | $15,701 | $2,399 | $18,640.92 (18.6 %) | 23 19/4 | $26,233.68 | $51,985.85 | $209,227.56 | $51,985.85 | ✓ ✗ ✗ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $28,008 | $6,786 / $6,833 | $10,048 / $10,097 | −$6,786 | −$5,069 | 36.3 % | 0.0 % | 28.7 % | $270,780 / $66,040 |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | $25,241 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 25.7 % | 0.0 % | 39.6 % | $175,537 / $71,286 |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 25.0 % | 0.0 % | 45.1 % | $175,537 / $40,921 |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 16.9 % | 0.0 % | 53.4 % | $175,537 / $7,457 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $206,733 / $149,291 / $178,012 | $34,369 / $36,986 | $37,233 / $42,458 | 8.6 % (6.2 %–11.8 %) | $178,709 / $34,140 | $333,038 / $28,120 | $323,513 / $28,345 | $328,496 | $328,817 / $28,390 | $336,468 / $28,008 |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | $235,540 / $194,224 / $214,882 | $26,187 / $26,440 | $26,773 / $30,486 | 0.0 % (0.0 %–1.0 %) | $215,392 / $26,144 | $245,400 / $25,267 | $240,473 / $25,319 | $242,237 | $241,734 / $25,432 | $245,754 / $25,241 |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | $209,281 / $186,572 / $197,926 | $19,225 / $19,562 | $20,513 / $28,033 | 0.0 % (0.0 %–1.0 %) | $198,388 / $19,225 | $215,082 / $18,739 | $210,223 / $18,935 | $212,994 | $211,332 / $18,928 | $215,389 / $18,641 |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | $185,777 / $174,993 / $180,385 | $19,102 / $19,332 | $19,360 / $20,045 | 0.0 % (0.0 %–1.0 %) | $180,724 / $19,102 | $181,741 / $18,739 | $177,154 / $18,935 | $180,134 | $177,967 / $18,928 | $181,795 / $18,641 |

### Causal removals (development centre; the other book switched off)

| Label | Without D1: net / DD | Without Growth: net / DD | Participation (funded principal-days share) |
|---|---:|---:|---:|
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $80,105 / $28,008 | $270,780 / $17,595 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | $71,032 / $25,241 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | $41,581 / $16,655 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | $7,457 / $7,600 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"token"} |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $75,064 | $13,629 | $15,791 | $1,886 | $138,809 | −$1,848 | $33,382 | $16,357 | $43,750 | $46,638 | −$24,998 |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | $63,026 | $6,393 | −$4,746 | $0 | $115,510 | $3,075 | $4,634 | $31,636 | $27,295 | $57,213 | −$8,861 |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | $35,892 | $6,393 | −$4,746 | $0 | $112,279 | $3,075 | $4,634 | $31,636 | $27,295 | $32,569 | $1,729 |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | $1,055 | $6,393 | −$4,746 | $0 | $113,652 | $3,075 | $4,634 | $31,636 | $27,295 | $45,628 | −$19,394 |

### Parameter vectors

- `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` — cell `S.C24F1.h0.s0`
  - D1·GDX: targetPercentChange 278, trailingBuyPercentage 6, trailingStopPercentage 66, maximumHoldDays 5, tickWindowSize 246, intradayLossBuffer 35, pullback 77, continuationWindow 82; controls {"d":219,"hx":59,"g":47,"k":2,"r":1000,"c":83}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 5.2, recentLowLookbackBars 10, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy reset_renew, eligibilityMaxAgeSessions 14, eligibilityResetDropPercent 5.4, eligibilityRenewalReboundPercent 9.9, drawdownRecoveryGateEnabled true, dipLookbackSessions 10, dipThresholdPercent 14.9, recoveryRetracementPercent 100, recoveryConfirmationSessions 5, trailingStopPercent 12, maximumHoldEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled true, continuationMethod breakout, continuationWindowSessions 115, breakoutBufferPercent 2, breakoutFormationBars 10
- `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` — cell `S.C24F2.h1.s0`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 10.9, recentLowLookbackBars 10, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy time_limited, eligibilityMaxAgeSessions 27, drawdownRecoveryGateEnabled true, dipLookbackSessions 10, dipThresholdPercent 15, recoveryRetracementPercent 99.1, recoveryConfirmationSessions 3, trailingStopPercent 12.5, maximumHoldEnabled true, maximumHoldDays 28, intradayLossBufferEnabled false, initialStopEnabled false, retentionEnabled true, retentionSellPercent 50, retentionSmaSessions 86, retentionClosesBelow 3, continuationEnabled true, continuationMethod ma_cross, continuationWindowSessions 182, crossSmaBars 105, crossRisingBars 15, crossMinimumSlopePercent 1, crossMarginPercent 1.5
- `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` — cell `S.C24F2.h2.s0`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 10.9, recentLowLookbackBars 10, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 26, eligibilityMinimumAdvancePercent 5, drawdownRecoveryGateEnabled true, dipLookbackSessions 10, dipThresholdPercent 9.9, recoveryRetracementPercent 99.9, recoveryConfirmationSessions 6, trailingStopPercent 5.9, maximumHoldEnabled true, maximumHoldDays 26, intradayLossBufferEnabled true, intradayLossBufferPercent 2.8, initialStopEnabled false, retentionEnabled true, retentionSellPercent 66, retentionSmaSessions 80, retentionClosesBelow 2, continuationEnabled false
- `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` — cell `S.C24F2.h0.s0`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod trend_breakout, breakoutSmaSessions 120, breakoutSlopeComparisonSessions 90, breakoutPriorHighSessions 35, trendFilterEnabled true, trendMethod higher_highs_lows, trendStructureLookbackSessions 116, trendStructureMinimumIncreasePercent 2.75, drawdownRecoveryGateEnabled true, dipLookbackSessions 80, dipThresholdPercent 2, recoveryRetracementPercent 100, recoveryConfirmationSessions 8, trailingStopPercent 6.5, maximumHoldEnabled false, initialStopEnabled false, retentionEnabled false, continuationEnabled true, continuationMethod ma_cross, continuationWindowSessions 20, crossSmaBars 100, crossRisingBars 17, crossMinimumSlopePercent 1.3, crossMarginPercent 0.75

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` | C19 primary S | $295,502.48 | 88 | 71.6 % | 13 / 84 | 38.8 % (1,057 / 2,723) | $509,389 / $22,003 | −$44,743 | Growth refused (slot occupied) ← occupant D1: 3; D1 refused (slot occupied) ← occupant Growth: 1 | $58,557 / $61,320 / $72,372 |
| `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` | C21 primary S | $343,327.37 | 107 | 61.3 % | 7 / 108 | 38.2 % (1,041 / 2,723) | $614,633 / $13,423 | −$13,254 | Growth refused (slot occupied) ← occupant D1: 16; D1 refused (slot occupied) ← occupant Growth: 1 | $34,940 / $39,278 / $56,627 |
| `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | C23 primary S | $359,974.37 | 85 | 56.5 % | 8 / 108 | 33.4 % (908 / 2,723) | $488,721 / $11,076 | −$18,822 | Growth refused (slot occupied) ← occupant D1: 4 | $39,117 / $43,175 / $59,411 |
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | C24 primary S | $358,458.94 | 48 | 66.0 % | 18.5 / 246 | 41.2 % (1,123 / 2,723) | $411,930 / $42,320 | −$42,754 | Growth refused (slot occupied) ← occupant D1: 1; D1 refused (slot occupied) ← occupant Growth: 4 | $57,066 / $59,928 / $71,377 |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | C24 role S/robust-profit | $295,175.04 | 30 | 83.3 % | 25.5 / 300 | 30.8 % (838 / 2,723) | $291,760 / $36,233 | −$17,420 | Growth refused (slot occupied) ← occupant D1: 1; D1 refused (slot occupied) ← occupant Growth: 1 | $38,065 / $42,194 / $58,710 |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | C24 role S/balanced | $250,755.65 | 32 | 81.3 % | 25.5 / 222 | 29.4 % (801 / 2,723) | $263,025 / $18,777 | −$17,420 | Growth refused (slot occupied) ← occupant D1: 1 | $38,065 / $42,194 / $58,710 |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | C24 role S/lower-drawdown | $209,227.56 | 27 | 84.6 % | 25 / 245 | 24.6 % (671 / 2,723) | $241,021 / $41,775 | −$43,680 | D1 refused (slot occupied) ← occupant Growth: 5 | $57,760 / $60,576 / $71,840 |

Worst closed trades of each subject (net after costs and interest):

- `C19/S/refine/S.C19F1.h1.s1/R103#1 profit`: D1·GDX 2020-03-05 → 2020-03-18 (maximum hold, 13 d) −$19,932.85; D1·GDX 2026-03-03 → 2026-03-16 (maximum hold, 13 d) −$12,053.67; Growth·GDX 2022-06-16 → 2022-07-11 (maximum hold, 25 d) −$11,277.73; D1·GDX 2024-10-31 → 2024-11-13 (maximum hold, 13 d) −$9,821.35; D1·GDX 2022-04-21 → 2022-05-04 (maximum hold, 13 d) −$8,964.05
  - largest giveback: D1·GDX 2020-03-05 → 2020-03-18 best mark $2,069.72, final −$19,932.85 (giveback $22,002.56)
- `C21/S/refine/S.C21F1.h2.s1/R104#1 profit`: Growth·GDX 2026-03-04 → 2026-03-13 (initial stop, 9 d) −$13,253.96; Growth·GDX 2026-09-03 → 2026-09-24 (initial stop, 21 d) −$9,913.10; Growth·GDX 2025-05-06 → 2025-05-14 (initial stop, 8 d) −$9,790.70; D1·GDX 2026-06-05 → 2026-06-10 (maximum hold, 5 d) −$8,300.58; Growth·GDX 2025-06-13 → 2025-06-27 (initial stop, 14 d) −$7,312.40
  - largest giveback: Growth·GDX 2026-03-04 → 2026-03-13 best mark $168.71, final −$13,253.96 (giveback $13,422.67)
  - open at 2026-10-30: D1·GDX from 2026-10-29 marked −$5,484.04
- `C23/S/refine/S.C23F1.h2.s0/R104#1 profit`: D1·GDX 2026-06-02 → 2026-06-08 (maximum hold, 6 d) −$8,251.09; D1·GDX 2026-06-22 → 2026-06-29 (maximum hold, 7 d) −$7,143.46; Growth·GDX 2026-01-29 → 2026-03-03 (maximum hold, 33 d) −$6,557.51; D1·GDX 2017-02-28 → 2017-03-06 (maximum hold, 6 d) −$5,068.73; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71
  - largest giveback: D1·GDX 2020-03-30 → 2020-04-15 best mark $36,309.52, final $25,233.16 (giveback $11,076.36)
- `C24/S/refine/S.C24F1.h0.s0/R106#1 profit`: D1·GDX 2017-02-28 → 2017-03-06 (maximum hold, 6 d) −$5,068.73; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71; D1·GDX 2022-10-28 → 2022-11-02 (buffered intraday loss, 5 d) −$3,707.38; D1·GDX 2022-06-24 → 2022-06-30 (maximum hold, 6 d) −$2,800.71; D1·GDX 2020-11-09 → 2020-11-16 (maximum hold, 7 d) −$2,616.10
  - largest giveback: Growth·GDX 2026-02-26 → open best mark $2,852.66, final −$39,467.07 (giveback $42,319.73)
  - open at 2026-10-30: Growth·GDX from 2026-02-26 marked −$39,467.07
- `C24/S/refine/S.C24F2.h1.s0/R104#2 robust`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52; D1·GDX 2017-04-24 → 2017-05-19 (maximum hold, 25 d) −$2,398.22
  - largest giveback: Growth·GDX 2025-05-27 → 2026-03-23 best mark $87,009.86, final $50,776.67 (giveback $36,233.19)
- `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; Growth·GDX 2025-06-02 → 2025-06-30 (maximum hold, 28 d) −$5,119.36; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)
- `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced`: D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52; D1·GDX 2017-04-24 → 2017-05-19 (maximum hold, 25 d) −$2,398.22; D1·GDX 2017-02-28 → 2017-03-28 (maximum hold, 28 d) $47.88
  - largest giveback: Growth·GDX 2026-02-27 → open best mark $1,282.64, final −$40,492.79 (giveback $41,775.43)
  - open at 2026-10-30: Growth·GDX from 2026-02-27 marked −$40,492.79

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 GDX daily (Yahoo Finance, 2006-05-22 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` | A1 | 13 (calendar maximum hold) | none (family A) | −$42,205 (2008-10-14) | −$15,427 | 0.2 % | — | −$45,723 (2020-03-05) | 0.4 % |
| `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` | A0 | 5 (calendar maximum hold) | none (family A) | −$34,560 (2008-10-20) | −$9,235 | 0.0 % | — | −$39,934 (2020-03-10) | 0.1 % |
| `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | B1 | 5 (calendar maximum hold) | 13.4 % | −$15,587 (2014-10-28) | −$9,235 | 0.0 % | 2.2 % below the stop (2014-10-31) | −$16,309 (2020-03-10) | 0.0 % |
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | D1 | 59 (adaptive hold: the extended bound) | 21.9 % | −$25,076 (2014-09-18) | −$21,900 | 0.0 % | 3.2 % below the stop (2014-10-31) | −$25,958 (2020-02-24) | 0.0 % |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | small | 128 | $258,947 / $214,061 | $31,289 / $31,576 / $32,905 | $31,822 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | wide | 128 | $172,415 / $105,129 | $42,010 / $88,755 / $111,499 | $80,983 | 35 (27.3 %; 20.4 %–35.6 %) |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | small | 128 | $243,811 / $201,505 | $25,628 / $25,704 / $25,968 | $25,783 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | wide | 128 | $201,105 / $164,720 | $29,279 / $31,997 / $63,865 | $37,152 | 4 (3.1 %; 1.2 %–7.8 %) |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | small | 128 | $217,045 / $193,431 | $18,732 / $18,883 / $19,280 | $18,925 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | wide | 128 | $189,003 / $156,741 | $23,626 / $25,096 / $31,369 | $25,685 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | small | 128 | $187,728 / $182,285 | $18,732 / $18,883 / $19,280 | $18,925 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | wide | 128 | $170,746 / $139,872 | $23,463 / $25,096 / $91,385 | $44,987 | 4 (3.1 %; 1.2 %–7.8 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/S/refine/S.C19F1.h1.s1/R103#1 profit` | $164,981 | 4.9 % | Growth·GDX from 2019-11-13: unrealized $8,154 (market value 1.096× the lot's principal) | trailing stop 2020-01-13: lot net $8,154 at the cutoff (partial exits included) → final $2,468; change on the slice −$5,686 | −$1,847 / −$4,288 / −$8,456 | −$3,922 / −$44,743 |
| C21 | `C21/S/refine/S.C21F1.h2.s1/R104#1 profit` | $308,988 | 0.0 % | none open | none open | −$1,301 / −$4,889 / −$8,439 | −$2,666 / −$6,315 |
| C23 | `C23/S/refine/S.C23F1.h2.s0/R104#1 profit` | $303,153 | 0.0 % | none open | none open | −$2,076 / −$5,579 / −$8,439 | −$1,650 / −$4,860 |
| C24 | `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $336,819 | 0.0 % | none open | none open | −$2,039 / −$4,874 / −$6,786 | −$10,674 / −$42,754 |

