# D1-first sequential: frozen D1, Growth searched in the shared slot (arm S)

**What it is.** At each cutoff, arm D's finalists (≤ 3 distinct: primary, robust-profit and balanced roles) are frozen
before any Growth result, unchanged in every evaluation. Growth is then searched against each of them in the one
$100,000 slot: 6 Growth cells per frozen D1. R_S(F) = max(4, ⌈160 ÷ 6F⌉) replicates: 14 at C19 (2 distinct frozen D1)
and 9 at C21 and C23 (3). S's broad lanes plus arm D's own 32 are therefore at least J's 192 (brief Stage E: no
architecture "win" from more evaluations). Over C19–C23, S's lanes requested 11.45 M evaluations and J's 12.98 M
(`SEARCH_AND_CONVERGENCE_REPORT.md` §B).

**Development.** C19 `S.C19F1.h1.s1/R104#1` $294,785 / DD $15,342; C21 `S.C21F3.h0.s1/R104#1` $542,170 / $32,292; C23
`S.C23F3.h2.s1/R102#1` $449,917 / $32,506. These are the highest development nets of any arm at C21 and C23:

| Cutoff | Frozen D1 used | D1 part (training lots, net) | Growth part |
|---|---|---:|---:|
| C19 | C19F1 = arm D's primary `D.B1/R102#1` | 20 lots, $210,046 (identical to arm D: no D1 trade displaced) | 9 lots, $84,739 |
| C21 | C21F3 = arm D's balanced role `D.D1/R103#3` | 29 lots, $255,727 | 11 lots, $286,443 |
| C23 | C23F3 = arm D's balanced role `D.B1/R101#2` | 34 lots, $137,757 | 26 lots, $312,161 |
| C24 | C24F1 = arm D's primary `D.B1/R103#1` | 48 lots, $300,958 (arm D alone: 50 lots, $319,654) | 21 lots, $239,683 |

At C24 the frozen D1 finalists were arm D's primary (C24F1), robust-profit (F2) and balanced (F3) roles. The selected
pairing was built on the primary this time, `S.C24F1.h1.s1/R101#1`, $540,641 / $26,288, the highest development net of
any arm. In the shared slot, Growth held it when D1 signalled 2 times, and D1 held it when Growth signalled 8 times.
Roles: robust-profit `S.C24F3.h0.s1/R102#2` $391,774 / $28,466, balanced `S.C24F3.h0.s1/R101#3` $374,505 / $21,031,
lower-drawdown `S.C24F3.h2.s1/R101#2` $263,271 / $19,113. The S-U primary is `S.C24F1.h0.s0/R103#1` $405,954 / $29,301.

At C19, Growth filled only the slot's idle time: the D1 ledger is identical to standalone D. At C21 and C23 the selected
pairing was not built on arm D's primary but on its balanced-role D1, with Growth earning most of the net. The highest
in-sample total came from letting the Growth search pick which frozen D1 to pair with.

**Chronology (the binding test).** Chained: +$92,527 (2020–2021), −$25,876 (2022–2023), +$17,654 (2024) = **$84,305 with
an $82,547 drawdown — unsupported**, the deepest of the five arms. The chain peaked at +$117,171 during 2022–2023, fell
to +$34,625 at its 2024 low, and its 2022–2023 slice alone had a $64,512 reset drawdown. Realized losses drove it: the
C21 frozen D1 lost −$20,385, −$18,557 and −$18,526 on three 2022 protective stops (8 D1 lots, −$37,395 in 2022–2023,
against +$11,520 from Growth). In 2024 a D1 stop cost −$15,305, and Growth netted +$32,959 over 7 lots despite two initial
stops (−$11,294, −$7,266). In 2020–2021 the S chain's D1 trades were exactly arm D's (+$20,368, including the two
−$24,400 stops), and Growth added +$72,159 on 6 lots.

**Unrestricted Growth inside S (S-U, report-only).** $183,722 chained with an $85,703 drawdown, the 2022–2023 reset
drawdown alone.

**C24 comparisons (PROTOCOL §12, development).**
- Against G's primary, S is a type-P material improvement, replicated in 9 replicate numbers: +$199,729 centre net,
  +$111,082 confirmation robust, −$2,367 centre DD, +$1,879 confirmation p90 DD.
- Against J, S is also material and replicated (+$105,090).

**Validation (once, retrospective).** −$2,412. The D1 side traded exactly arm D's primary's lots (−$8,979), and Growth
made +$6,567 on four. Reset DD $26,869; V1 fails. The roles lost $2,049 to $19,940. **Determination for S: not a
candidate** (b and c fail).

The largest in-sample architecture advantage of the study is S's. It was followed by the deepest sequential drawdown on
the folds ($82,547) and a validation loss.

---

_Sections A–I below are generated from the sealed records by `tools/tsla-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 168 / 48 | 14 | 1✗ | 4,098,341 | 3,914,309 | 1,894.5 | 2: 124, 3: 38, 4: 53, 5: 1 | triggers not met 216 | 12 / 12 | converged by the frozen rules |
| C21 | 162 / 48 | 9 | 1✗ | 3,783,168 | 3,606,233 | 2,199.9 | 2: 59, 3: 73, 4: 68, 5: 10 | triggers not met 210 | 18 / 18 | converged by the frozen rules |
| C23 | 162 / 48 | 9 | 1✗ | 3,571,373 | 3,386,799 | 2,651.3 | 2: 52, 3: 76, 4: 60, 5: 19, 6: 2, 8: 1 | triggers not met 210 | 18 / 18 | converged by the frozen rules |
| C24 | 162 / 48 | 9 | 1✗ | 3,635,410 | 3,456,065 | 2,739.6 | 2: 71, 3: 58, 4: 72, 5: 8, 6: 1 | triggers not met 210 | 18 / 18 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 504 | 503 | Q3 1 | — |
| C19 | refine | 263 | 263 | — | — |
| C21 | broad | 481 | 438 | Q3 43 | — |
| C21 | refine | 253 | 243 | Q3 10 | — |
| C23 | broad | 452 | 444 | Q3 7, Q5 1 | — |
| C23 | refine | 244 | 238 | Q3 6 | — |
| C24 | broad | 486 | 425 | Q3 61 | — |
| C24 | refine | 261 | 227 | Q3 34 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | S | 767 / 766 | `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` | $294,785 | $15,342 | 29 | $180,886 / $26,266 | $163,078 / $25,675 | no (`C19/S/refine/S.C19F1.h1.s0/R103#4 profit order`) |
| C19 | S-P | 636 / 635 | `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` | $294,785 | $15,342 | 29 | $180,886 / $26,266 | $163,078 / $25,675 | no (`C19/S/refine/S.C19F1.h1.s0/R103#4 profit order`) |
| C19 | S-U | 131 / 131 | `C19/S/refine/S.C19F1.h0.s0/R104#1 profit` | $265,964 | $15,892 | 23 | $183,405 / $25,263 | $160,192 / $24,946 | no (`C19/S/broad/S.C19F1.h0.s0/R101#2 Growth entry alternative`) |
| C21 | S | 734 / 681 | `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` | $542,170 | $32,292 | 40 | $400,499 / $34,511 | $363,758 / $34,204 | no (`C21/S/refine/S.C21F3.h0.s1/R102#4 profit order`) |
| C21 | S-P | 614 / 571 | `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` | $542,170 | $32,292 | 40 | $400,499 / $34,511 | $363,758 / $34,204 | no (`C21/S/refine/S.C21F3.h0.s1/R102#4 profit order`) |
| C21 | S-U | 120 / 110 | `C21/S/refine/S.C21F3.h0.s0/R103#1 profit` | $483,612 | $32,292 | 36 | $325,819 / $36,059 | $295,567 / $34,963 | no (`C21/S/broad/S.C21F3.h0.s0/R106#1 profit`) |
| C23 | S | 696 / 682 | `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | $449,917 | $32,506 | 60 | $325,670 / $32,506 | $303,243 / $32,506 | no (`C23/S/refine/S.C23F3.h0.s1/R101#1 profit`) |
| C23 | S-P | 600 / 588 | `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | $449,917 | $32,506 | 60 | $325,670 / $32,506 | $303,243 / $32,506 | no (`C23/S/refine/S.C23F3.h0.s1/R101#1 profit`) |
| C23 | S-U | 96 / 94 | `C23/S/broad/S.C23F1.h0.s0/R101#1 profit` | $397,456 | $26,288 | 37 | $234,924 / $34,534 | $212,957 / $34,521 | no (`C23/S/refine/S.C23F3.h0.s0/R103#2 Growth gate alternative`) |
| C24 | S | 747 / 652 | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $540,641 | $26,288 | 69 | $353,171 / $34,703 | $327,862 / $34,452 | no (`C24/S/refine/S.C24F1.h1.s1/R101#6 profit order`) |
| C24 | S-P | 666 / 579 | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $540,641 | $26,288 | 69 | $353,171 / $34,703 | $327,862 / $34,452 | no (`C24/S/refine/S.C24F1.h1.s1/R101#6 profit order`) |
| C24 | S-U | 81 / 73 | `C24/S/broad/S.C24F1.h0.s0/R103#1 profit` | $405,954 | $29,301 | 53 | $209,397 / $31,417 | $182,611 / $31,558 | no (`C24/S/broad/S.C24F1.h0.s0/R103#3 profit order`) |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/S/refine/S.C19F2.h2.s0/R103#2 robust` | `C19/S/refine/S.C19F2.h2.s1/R103#2 robust` | `C19/S/broad/S.C19F2.h0.s0/R108#3 Growth entry alternative` |
| C21 | `C21/S/refine/S.C21F3.h2.s1/R101#2 robust` | `C21/S/refine/S.C21F3.h2.s1/R102#3 balanced` | `C21/S/refine/S.C21F3.h2.s1/R103#4 Growth gate alternative` |
| C23 | `C23/S/refine/S.C23F3.h0.s1/R102#2 robust` | `C23/S/refine/S.C23F3.h0.s1/R102#2 robust` | `C23/S/broad/S.C23F3.h2.s1/R102#3 Growth gate alternative` |
| C24 | `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` |

- C19: frozen D1 finalists `C19F1` = `C19/D/refine/D.B1/R102#1 profit`, `C19F2` = `C19/D/refine/D.B1/R103#2 robust`
- C21: frozen D1 finalists `C21F1` = `C21/D/refine/D.C1/R102#1 profit`, `C21F2` = `C21/D/refine/D.C1/R102#2 robust`, `C21F3` = `C21/D/refine/D.D1/R103#3 balanced`
- C23: frozen D1 finalists `C23F1` = `C23/D/refine/D.D1/R102#1 profit`, `C23F2` = `C23/D/refine/D.A1/R104#2 robust`, `C23F3` = `C23/D/refine/D.B1/R101#2 robust`
- C24: frozen D1 finalists `C24F1` = `C24/D/refine/D.B1/R103#1 profit`, `C24F2` = `C24/D/refine/D.C1/R103#2 robust`, `C24F3` = `C24/D/refine/D.C1/R102#2 robust`

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` | primary S/original; primary S-P/original; role S/actual-profit; role S-P/actual-profit | $294,785 | $92,527 | $43,801 | $43,801 | 20 (6 losing) | −$24,507 | 253 / 256 (training 2.7 %) |
| C19 | `C19/S/refine/S.C19F1.h0.s0/R104#1 profit` | primary S-U/original; role S-U/actual-profit | $265,964 | $197,940 | $50,137 | $50,137 | 14 (2 losing) | −$39,830 | 256 / 256 (training 4.3 %) |
| C19 | `C19/S/refine/S.C19F2.h2.s0/R103#2 robust` | role S/robust-profit; role S-P/robust-profit | $246,492 | $151,237 | $68,575 | $68,575 | 17 (6 losing) | −$37,553 | 256 / 256 (training 5.5 %) |
| C19 | `C19/S/refine/S.C19F2.h2.s1/R103#2 robust` | role S/balanced; role S-P/balanced | $245,005 | $109,788 | $56,136 | $56,136 | 17 (7 losing) | −$22,010 | 256 / 256 (training 0.0 %) |
| C19 | `C19/S/broad/S.C19F2.h0.s0/R108#3 Growth entry alternative` | role S/lower-drawdown; role S-U/lower-drawdown | $198,308 | $65,167 | $47,829 | $47,829 | 6 (2 losing) | −$10,134 | 254 / 256 (training 0.0 %) |
| C19 | `C19/S/broad/S.C19F2.h1.s1/R102#2 robust` | role S-P/lower-drawdown | $205,730 | $55,378 | $41,705 | $41,705 | 16 (7 losing) | −$22,010 | 236 / 256 (training 0.0 %) |
| C19 | `C19/S/refine/S.C19F2.h0.s0/R102#2 robust` | role S-U/robust-profit | $242,431 | $202,921 | $74,225 | $74,225 | 10 (2 losing) | −$38,960 | 256 / 256 (training 3.5 %) |
| C19 | `C19/S/refine/S.C19F2.h0.s0/R103#2 robust` | role S-U/balanced | $231,687 | $142,795 | $48,026 | $48,026 | 16 (5 losing) | −$22,010 | 256 / 256 (training 0.4 %) |
| C21 | `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` | primary S/original; primary S-P/original; role S/actual-profit; role S-P/actual-profit | $542,170 | −$25,876 | $64,512 | $64,512 | 11 (5 losing) | −$20,385 | 256 / 256 (training 9.4 %) |
| C21 | `C21/S/refine/S.C21F3.h0.s0/R103#1 profit` | primary S-U/original; role S-U/actual-profit | $483,612 | −$43,191 | $85,703 | $85,703 | 9 (3 losing) | −$33,814 | 256 / 256 (training 11.3 %) |
| C21 | `C21/S/refine/S.C21F3.h2.s1/R101#2 robust` | role S/robust-profit; role S-P/robust-profit | $523,868 | −$44,914 | $79,041 | $79,041 | 10 (6 losing) | −$20,385 | 256 / 256 (training 1.6 %) |
| C21 | `C21/S/refine/S.C21F3.h2.s1/R102#3 balanced` | role S/balanced; role S-P/balanced | $516,840 | −$25,832 | $62,284 | $62,284 | 11 (5 losing) | −$20,385 | 256 / 256 (training 0.8 %) |
| C21 | `C21/S/refine/S.C21F3.h2.s1/R103#4 Growth gate alternative` | role S/lower-drawdown; role S-P/lower-drawdown | $321,007 | −$37,395 | $71,523 | $71,523 | 8 (4 losing) | −$20,385 | 256 / 256 (training 0.4 %) |
| C21 | `C21/S/refine/S.C21F3.h0.s0/R104#2 robust` | role S-U/robust-profit | $456,947 | −$37,395 | $71,523 | $71,523 | 8 (4 losing) | −$20,385 | 256 / 256 (training 4.3 %) |
| C21 | `C21/S/refine/S.C21F3.h0.s0/R101#3 balanced` | role S-U/balanced | $452,651 | −$56,674 | $98,431 | $98,431 | 8 (3 losing) | −$36,146 | 256 / 256 (training 6.6 %) |
| C21 | `C21/S/refine/S.C21F3.h0.s0/R104#3 balanced` | role S-U/lower-drawdown | $378,723 | −$37,395 | $71,523 | $71,523 | 8 (4 losing) | −$20,385 | 256 / 256 (training 0.4 %) |
| C23 | `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | primary S/original; primary S-P/original; role S/actual-profit; role S-P/actual-profit | $449,917 | $17,654 | $32,166 | $37,877 | 8 (3 losing) | −$15,305 | 51 / 256 (training 1.2 %) |
| C23 | `C23/S/broad/S.C23F1.h0.s0/R101#1 profit` | primary S-U/original; role S-U/actual-profit | $397,456 | $29,072 | $12,740 | $26,288 | 5 (2 losing) | −$3,749 | 0 / 256 (training 6.3 %) |
| C23 | `C23/S/refine/S.C23F3.h0.s1/R102#2 robust` | role S/robust-profit; role S/balanced; role S-P/robust-profit; role S-P/balanced | $396,461 | $12,523 | $28,873 | $38,879 | 6 (4 losing) | −$15,305 | 21 / 256 (training 0.4 %) |
| C23 | `C23/S/broad/S.C23F3.h2.s1/R102#3 Growth gate alternative` | role S/lower-drawdown; role S-P/lower-drawdown | $208,130 | −$8,723 | $17,796 | $22,559 | 2 (1 losing) | −$15,305 | 0 / 256 (training 0.0 %) |
| C23 | `C23/S/refine/S.C23F3.h0.s0/R101#3 profit order` | role S-U/robust-profit | $380,321 | $13,864 | $16,429 | $32,506 | 3 (1 losing) | −$15,305 | 0 / 256 (training 7.0 %) |
| C23 | `C23/S/refine/S.C23F3.h0.s0/R104#2 balanced` | role S-U/balanced; role S-U/lower-drawdown | $243,246 | $3,139 | $17,134 | $21,897 | 2 (1 losing) | −$15,305 | 0 / 256 (training 0.0 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| S/original | `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` → `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` → `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | $84,305 | $82,547 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S-P/original (report-only) | `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` → `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` → `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | $84,305 | $82,547 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S-U/original (report-only) | `C19/S/refine/S.C19F1.h0.s0/R104#1 profit` → `C21/S/refine/S.C21F3.h0.s0/R103#1 profit` → `C23/S/broad/S.C23F1.h0.s0/R101#1 profit` | $183,722 | $85,703 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| S: role robust-profit (descriptive) | `C19/S/refine/S.C19F2.h2.s0/R103#2 robust` → `C21/S/refine/S.C21F3.h2.s1/R101#2 robust` → `C23/S/refine/S.C23F3.h0.s1/R102#2 robust` | $118,796 | $98,291 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S: role balanced (descriptive) | `C19/S/refine/S.C19F2.h2.s1/R103#2 robust` → `C21/S/refine/S.C21F3.h2.s1/R102#3 balanced` → `C23/S/refine/S.C23F3.h0.s1/R102#2 robust` | $96,479 | $79,209 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| S: role lower-drawdown (descriptive) | `C19/S/broad/S.C19F2.h0.s0/R108#3 Growth entry alternative` → `C21/S/refine/S.C21F3.h2.s1/R103#4 Growth gate alternative` → `C23/S/broad/S.C23F3.h2.s1/R102#3 Growth gate alternative` | $18,998 | $79,695 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | primary S | pass | $540,641.31 | $576,275 | $28,449 | $7,185 | $26,287.97 (26.3 %) | 69 49/20 | −$2,411.85 | $26,869.48 | $538,229.46 | $26,869.48 | ✗ ✓ ✓ |
| finalist | `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | role S/robust-profit | pass | $391,774.37 | $419,107 | $21,126 | $6,207 | $28,466.47 (28.5 %) | 60 41/19 | −$4,418.30 | $26,438.30 | $387,356.07 | $28,466.47 | ✗ ✓ ✓ |
| finalist | `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | role S/balanced | pass | $374,505.43 | $397,357 | $18,555 | $4,297 | $21,030.69 (21.0 %) | 41 32/9 | −$2,049.13 | $15,996.29 | $372,456.30 | $21,030.69 | ✗ ✓ ✓ |
| finalist | `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | role S/lower-drawdown | pass | $263,271.38 | $282,159 | $15,448 | $3,439 | $19,112.70 (19.1 %) | 33 25/8 | −$19,939.87 | $29,885.73 | $243,331.52 | $29,885.73 | ✗ ✓ ✓ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $26,288 | $10,332 / $10,332 | $16,246 / $16,295 | −$10,332 | −$10,332 | 32.1 % | 0.0 % | 20.9 % | $300,958 / $239,683 |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | $28,466 | $11,294 / $11,294 | $18,562 / $18,562 | −$11,294 | −$11,294 | 23.8 % | 0.0 % | 19.2 % | $191,135 / $200,640 |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | $21,031 | $9,971 / $9,971 | $13,653 / $13,702 | −$9,971 | −$9,971 | 27.3 % | 0.0 % | 19.4 % | $191,796 / $182,710 |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | $19,113 | $9,971 / $9,971 | $10,124 / $10,174 | −$9,971 | −$9,971 | 23.2 % | 0.0 % | 22.9 % | $186,177 / $77,094 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $383,476 / $327,862 / $355,669 | $34,452 / $37,354 | $37,414 / $45,742 | 8.1 % (5.8 %–11.2 %) | $353,171 / $34,703 | $533,176 / $26,398 | $524,474 / $27,064 | $532,882 | $530,299 / $26,864 | $510,664 / $26,288 |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | $384,085 / $347,035 / $365,560 | $32,842 / $34,736 | $35,748 / $46,985 | 4.2 % (2.6 %–6.7 %) | $368,689 / $33,517 | $385,365 / $28,682 | $372,564 / $29,753 | $386,013 | $378,594 / $29,183 | $390,718 / $28,466 |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | $342,598 / $292,097 / $317,348 | $24,354 / $26,229 | $27,774 / $40,720 | 0.8 % (0.3 %–2.3 %) | $318,501 / $24,310 | $370,015 / $21,320 | $361,046 / $21,899 | $369,445 | $364,149 / $21,553 | $373,449 / $21,002 |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | $223,580 / $180,827 / $202,203 | $23,877 / $24,149 | $24,455 / $28,769 | 0.0 % (0.0 %–1.0 %) | $203,393 / $24,025 | $259,694 / $19,213 | $252,551 / $19,414 | $259,062 | $255,033 / $19,385 | $262,333 / $19,113 |

### Causal removals (development centre; the other book switched off)

| Label | Without D1: net / DD | Without Growth: net / DD | Participation (funded principal-days share) |
|---|---:|---:|---:|
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $318,721 / $28,655 | $319,654 / $25,587 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | $208,913 / $25,598 | $191,135 / $22,652 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | $205,570 / $14,716 | $191,135 / $22,652 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | $76,770 / $13,444 | $191,135 / $22,652 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $5,277 | $45,054 | $13,989 | $33,587 | $214,104 | $106,812 | −$7,509 | $53,283 | $76,045 | $5,085 | −$7,497 |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | $22,193 | $30,872 | $30,071 | $21,427 | $119,624 | $63,290 | −$2,197 | $49,059 | $57,435 | $9,769 | −$14,187 |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | $22,193 | $36,449 | $25,104 | $16,645 | $100,141 | $53,183 | −$2,197 | $45,894 | $77,094 | $7,784 | −$9,833 |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | $22,193 | $31,228 | $33,857 | $1,851 | $80,784 | $30,408 | −$2,197 | $36,027 | $29,122 | −$10,107 | −$9,833 |

### Parameter vectors

- `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` — cell `S.C24F1.h1.s1`
  - D1·TSLA: targetPercentChange 285, trailingBuyPercentage 12, trailingStopPercentage 70, maximumHoldDays 11, tickWindowSize 59, intradayLossBuffer 40, pullback 39, continuationWindow 166; controls {"d":58,"k":1,"r":500,"c":214}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 10, breakoutSlopeComparisonSessions 21, breakoutPriorHighSessions 94, trendFilterEnabled false, drawdownRecoveryGateEnabled false, trailingStopPercent 6, maximumHoldEnabled true, maximumHoldDays 18, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 26, initialStopAtrMultiple 1.6, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 147, uptrendSmaBars 128, uptrendSlopeBars 16, uptrendMinimumRisePercent 0, pullbackMinimumPercent 1.1, pullbackMaximumPercent 10, recoveryPercent 0.41
- `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` — cell `S.C24F3.h0.s1`
  - D1·TSLA: targetPercentChange 228, trailingBuyPercentage 33, trailingStopPercentage 61, maximumHoldDays 3, tickWindowSize 78, intradayLossBuffer 0, pullback 173, continuationWindow 65; controls {"d":92,"k":1,"r":990,"c":249}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 12, breakoutSlopeComparisonSessions 47, breakoutPriorHighSessions 64, trendFilterEnabled true, trendMethod price_change, trendChangeLookbackSessions 86, trendChangeMinimumReturnPercent 7.3, drawdownRecoveryGateEnabled false, trailingStopPercent 6.6, maximumHoldEnabled false, initialStopEnabled true, initialStopAtrSessions 45, initialStopAtrMultiple 1.1, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 133, uptrendSmaBars 19, uptrendSlopeBars 22, uptrendMinimumRisePercent 4.7, pullbackMinimumPercent 0.9, pullbackMaximumPercent 11.6, recoveryPercent 4.72
- `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` — cell `S.C24F3.h0.s1`
  - D1·TSLA: targetPercentChange 228, trailingBuyPercentage 33, trailingStopPercentage 61, maximumHoldDays 3, tickWindowSize 78, intradayLossBuffer 0, pullback 173, continuationWindow 65; controls {"d":92,"k":1,"r":990,"c":249}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 10, breakoutSlopeComparisonSessions 22, breakoutPriorHighSessions 87, trendFilterEnabled true, trendMethod price_change, trendChangeLookbackSessions 62, trendChangeMinimumReturnPercent 2.5, drawdownRecoveryGateEnabled false, trailingStopPercent 5, maximumHoldEnabled false, initialStopEnabled true, initialStopAtrSessions 6, initialStopAtrMultiple 2, retentionEnabled true, retentionSellPercent 90, retentionSmaSessions 10, retentionClosesBelow 1, continuationEnabled true, continuationMethod breakout, continuationWindowSessions 106, breakoutBufferPercent 2.5, breakoutFormationBars 10
- `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` — cell `S.C24F3.h2.s1`
  - D1·TSLA: targetPercentChange 228, trailingBuyPercentage 33, trailingStopPercentage 61, maximumHoldDays 3, tickWindowSize 78, intradayLossBuffer 0, pullback 173, continuationWindow 65; controls {"d":92,"k":1,"r":990,"c":249}; D1 arming from the first day: false
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 90, breakoutSlopeComparisonSessions 10, breakoutPriorHighSessions 55, trendFilterEnabled false, drawdownRecoveryGateEnabled true, dipLookbackSessions 50, dipThresholdPercent 4, recoveryRetracementPercent 90, recoveryConfirmationSessions 10, trailingStopPercent 6, maximumHoldEnabled true, maximumHoldDays 27, intradayLossBufferEnabled true, intradayLossBufferPercent 4, initialStopEnabled true, initialStopAtrSessions 40, initialStopAtrMultiple 1, retentionEnabled true, retentionSellPercent 90, retentionSmaSessions 20, retentionClosesBelow 4, continuationEnabled true, continuationMethod ma_cross, continuationWindowSessions 160, crossSmaBars 90, crossRisingBars 26, crossMinimumSlopePercent 1.7, crossMarginPercent 3

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` | C19 primary S | $435,109.65 | 96 | 67.4 % | 11.5 / 76 | 31.8 % (866 / 2,723) | $801,534 / $27,898 | −$24,507 | Growth refused (slot occupied) ← occupant D1: 13; D1 refused (slot occupied) ← occupant Growth: 2 | $43,381 / $47,155 / $62,254 |
| `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` | C21 primary S | $598,599.22 | 70 | 84.3 % | 12.5 / 70 | 29.5 % (803 / 2,723) | $654,694 / $25,679 | −$20,385 | Growth refused (slot occupied) ← occupant D1: 2 | $40,289 / $44,269 / $60,192 |
| `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | C23 primary S | $464,813.04 | 75 | 72.0 % | 10 / 43 | 22.2 % (605 / 2,723) | $584,348 / $25,679 | −$15,305 | Growth refused (slot occupied) ← occupant D1: 2; D1 refused (slot occupied) ← occupant Growth: 1 | $36,478 / $40,713 / $57,652 |
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | C24 primary S | $538,229.46 | 75 | 68.0 % | 10 / 66 | 26.3 % (715 / 2,723) | $656,712 / $25,679 | −$10,332 | D1 refused (slot occupied) ← occupant Growth: 2; Growth refused (slot occupied) ← occupant D1: 8 | $32,749 / $37,233 / $55,166 |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | C24 role S/robust-profit | $387,356.07 | 67 | 65.7 % | 8 / 104 | 20.1 % (546 / 2,723) | $567,833 / $22,622 | −$11,294 | Growth refused (slot occupied) ← occupant D1: 4 | $33,470 / $37,906 / $55,647 |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | C24 role S/balanced | $372,456.30 | 46 | 73.9 % | 14.5 / 104 | 22.8 % (622 / 2,723) | $354,763 / $14,759 | −$9,971 | Growth refused (slot occupied) ← occupant D1: 2; D1 refused (slot occupied) ← occupant Growth: 1 | $32,478 / $36,980 / $54,986 |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | C24 role S/lower-drawdown | $243,331.52 | 37 | 70.3 % | 12 / 104 | 18.9 % (515 / 2,723) | $296,651 / $14,759 | −$9,971 | Growth refused (slot occupied) ← occupant D1: 2; D1 refused (slot occupied) ← occupant Growth: 3 | $32,478 / $36,980 / $54,986 |

Worst closed trades of each subject (net after costs and interest):

- `C19/S/refine/S.C19F1.h1.s1/R104#1 profit`: D1·TSLA 2021-02-22 → 2021-03-05 (protective stop, 11 d) −$24,507.37; D1·TSLA 2020-03-06 → 2020-03-13 (protective stop, 7 d) −$24,386.82; D1·TSLA 2022-05-10 → 2022-05-23 (maximum hold, 13 d) −$18,860.40; D1·TSLA 2025-02-25 → 2025-03-10 (maximum hold, 13 d) −$17,515.47; D1·TSLA 2022-10-31 → 2022-11-14 (maximum hold, 14 d) −$15,676.66
  - largest giveback: D1·TSLA 2021-02-22 → 2021-03-05 best mark $3,390.19, final −$24,507.37 (giveback $27,897.56)
  - open at 2026-10-30: D1·TSLA from 2026-10-16 marked $12,560.89
- `C21/S/refine/S.C21F3.h0.s1/R104#1 profit`: D1·TSLA 2022-02-18 → 2022-02-24 (protective stop gap, 6 d) −$20,384.69; D1·TSLA 2022-05-06 → 2022-05-12 (protective stop gap, 6 d) −$18,557.26; D1·TSLA 2022-11-16 → 2022-12-14 (protective stop, 28 d) −$18,526.19; D1·TSLA 2025-02-11 → 2025-02-27 (protective stop, 16 d) −$18,164.55; Growth·TSLA 2024-12-26 → 2024-12-31 (initial stop, 5 d) −$12,390.51
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C23/S/refine/S.C23F3.h2.s1/R102#1 profit`: D1·TSLA 2024-01-16 → 2024-01-25 (protective stop gap, 9 d) −$15,304.65; Growth·TSLA 2024-07-23 → 2024-07-24 (initial stop gap, 1 d) −$11,293.58; D1·TSLA 2026-03-04 → 2026-03-27 (protective stop, 23 d) −$11,182.71; D1·TSLA 2022-02-03 → 2022-02-22 (protective stop, 19 d) −$11,062.16; D1·TSLA 2021-02-26 → 2021-03-04 (protective stop, 6 d) −$10,670.38
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C24/S/refine/S.C24F1.h1.s1/R101#1 profit`: D1·TSLA 2024-10-08 → 2024-10-11 (protective stop gap, 3 d) −$10,332.48; Growth·TSLA 2025-11-11 → 2025-11-13 (initial stop, 2 d) −$7,578.80; Growth·TSLA 2021-01-20 → 2021-01-29 (initial stop, 9 d) −$7,218.79; Growth·TSLA 2025-12-16 → 2026-01-02 (initial stop, 17 d) −$6,714.47; Growth·TSLA 2020-07-13 → 2020-07-13 (initial stop, 0 d) −$6,280.23
  - largest giveback: Growth·TSLA 2020-01-23 → 2020-02-05 best mark $71,179.07, final $45,500.25 (giveback $25,678.82)
- `C24/S/refine/S.C24F3.h0.s1/R102#2 robust`: Growth·TSLA 2024-07-23 → 2024-07-24 (initial stop gap, 1 d) −$11,293.58; D1·TSLA 2018-09-06 → 2018-09-07 (protective stop gap, 1 d) −$9,971.01; D1·TSLA 2026-03-09 → 2026-03-27 (protective stop, 18 d) −$9,833.22; D1·TSLA 2023-08-07 → 2023-08-16 (protective stop, 9 d) −$9,561.99; D1·TSLA 2025-02-03 → 2025-02-10 (protective stop, 7 d) −$9,501.71
  - largest giveback: Growth·TSLA 2020-01-31 → 2020-02-05 best mark $50,977.34, final $28,355.12 (giveback $22,622.22)
- `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced`: D1·TSLA 2018-09-06 → 2018-09-07 (protective stop gap, 1 d) −$9,971.01; D1·TSLA 2026-03-09 → 2026-03-27 (protective stop, 18 d) −$9,833.22; D1·TSLA 2023-08-07 → 2023-08-16 (protective stop, 9 d) −$9,561.99; D1·TSLA 2025-02-03 → 2025-02-10 (protective stop, 7 d) −$9,501.71; D1·TSLA 2021-02-26 → 2021-03-04 (protective stop, 6 d) −$9,471.58
  - largest giveback: D1·TSLA 2021-02-26 → 2021-03-04 best mark $5,287.52, final −$9,471.58 (giveback $14,759.10)
- `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative`: D1·TSLA 2018-09-06 → 2018-09-07 (protective stop gap, 1 d) −$9,971.01; D1·TSLA 2026-03-09 → 2026-03-27 (protective stop, 18 d) −$9,833.22; D1·TSLA 2023-08-07 → 2023-08-16 (protective stop, 9 d) −$9,561.99; D1·TSLA 2025-02-03 → 2025-02-10 (protective stop, 7 d) −$9,501.71; D1·TSLA 2021-02-26 → 2021-03-04 (protective stop, 6 d) −$9,471.58
  - largest giveback: D1·TSLA 2021-02-26 → 2021-03-04 best mark $5,287.52, final −$9,471.58 (giveback $14,759.10)

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 TSLA daily (Yahoo Finance, 2010-06-29 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` | B1 | 12 (calendar maximum hold) | 24.1 % | −$24,100 (2010-06-29) | −$16,474 | 0.0 % | 0.0 % below the stop () | −$27,364 (2020-03-10) | 0.0 % |
| `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` | D1 | 42 (adaptive hold: the extended bound) | 17.6 % | −$26,167 (2015-07-17) | −$17,600 | 0.0 % | 8.6 % below the stop (2015-08-24) | −$25,711 (2024-07-18) | 0.0 % |
| `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | B1 | 25 (calendar maximum hold) | 10.4 % | −$20,552 (2015-08-19) | −$10,400 | 0.0 % | 10.2 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | B1 | 11 (calendar maximum hold) | 5.8 % | −$16,599 (2015-08-14) | −$5,802 | 0.0 % | 10.8 % below the stop (2015-08-24) | −$16,325 (2020-03-05) | 0.0 % |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 9.2 % | −$19,849 (2015-07-27) | −$9,390 | 0.0 % | 10.7 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 9.2 % | −$19,849 (2015-07-27) | −$9,390 | 0.0 % | 10.7 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | C1 | 60 (hold disabled: a declared 60-calendar-day bound) | 9.2 % | −$19,849 (2015-07-27) | −$9,390 | 0.0 % | 10.7 % below the stop (2015-08-24) | −$19,111 (2020-03-04) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | small | 128 | $419,691 / $376,559 | $30,104 / $30,925 / $35,426 | $31,570 | 1 (0.8 %; 0.1 %–4.3 %) |
| `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | wide | 128 | $343,396 / $270,543 | $40,033 / $42,913 / $46,940 | $43,594 | 35 (27.3 %; 20.4 %–35.6 %) |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | small | 128 | $397,817 / $366,515 | $32,701 / $33,060 / $34,485 | $33,313 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | wide | 128 | $350,198 / $281,617 | $36,684 / $41,588 / $54,292 | $43,466 | 21 (16.4 %; 11.0 %–23.8 %) |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | small | 128 | $362,876 / $335,441 | $22,784 / $23,069 / $23,868 | $23,221 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | wide | 128 | $300,326 / $220,189 | $33,584 / $36,403 / $52,204 | $38,649 | 10 (7.8 %; 4.3 %–13.8 %) |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | small | 128 | $244,422 / $210,714 | $22,827 / $23,179 / $23,868 | $23,276 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | wide | 128 | $198,568 / $127,816 | $30,304 / $37,186 / $44,321 | $37,491 | 10 (7.8 %; 4.3 %–13.8 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/S/refine/S.C19F1.h1.s1/R104#1 profit` | $294,785 | 0.0 % | none open | none open | −$1,474 / −$4,721 / −$8,409 | −$6,305 / −$24,507 |
| C21 | `C21/S/refine/S.C21F3.h0.s1/R104#1 profit` | $542,170 | 0.0 % | none open | none open | −$2,726 / −$8,189 / −$14,037 | −$8,346 / −$20,385 |
| C23 | `C23/S/refine/S.C23F3.h2.s1/R102#1 profit` | $449,917 | 0.0 % | none open | none open | −$2,836 / −$7,891 / −$11,062 | −$3,620 / −$15,305 |
| C24 | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | $540,641 | 0.0 % | none open | none open | −$2,728 / −$5,968 / −$10,332 | −$6,380 / −$7,579 |

