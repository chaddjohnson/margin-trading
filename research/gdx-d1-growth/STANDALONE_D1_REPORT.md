# Standalone D1·GDX (arm D)

**Verdict: development-qualified at C24, chronologically UNSUPPORTED, and the C24 primary FAILS V1 on 2025–2026.** Not a
candidate, not development-only (the outcome lists only primaries that pass V1–V3). Research only; nothing adopted.

## What the arm is

One D1 book on GDX in the single $100,000 margin-funded slot (the engine's VGT-named slot carries GDX; Growth off). Eight
protected D1 structures (cells D.A0 … D.D1), Study 8's D1 box on the fine grid, NL0's unchanged lane schedule at 6
replicates per cell (P6-TSLA × 1.5), plus — at C24 only — 12 informed lanes (cells D.A0 and D.D1, seeded by the three GDX
D1 incumbents; population D+, no independent chronological test).

## Findings

1. **Chronology (the procedure, not one configuration).** The fold primaries over their next, previously examined slices:
   C19 `D.A1/R103#1` → 2020–2021 **−$14,659, reset DD $48,177 (a 35 % breach)**; C21 `D.A0/R101#1` → 2022–2023 +$24,823 /
   $20,744; C23 `D.B1/R106#1` → 2024 +$16,747 / $9,858. Chained with the 5 bps switch charge: **net $26,912, DD $48,177 →
   unsupported** (DD > $35,000). The breach is one lot: a maximum-hold D1 lot entered 2020-03-05 and closed 2020-03-18,
   marked as low as −$44,743 before exiting at −$19,933 (the March-2020 crash). The report-only D-A sub-population
   (family A only) chains $80,437 / $36,931: also unsupported, by $1,931.
2. **C24 primary `C24/D/refine/D.D1/R103#1 profit`** (`rc1-c4014158d334248d`): development $270,780, DD $17,595 (17.6 % of
   the allocation), 42 lots (26 W / 16 L), occupancy 30 %. Neighbourhood: confirmation median $165,729, p10 $110,093,
   robust $137,911; p90 / p95 DD $30,392 / $33,225; worst-10 % mean DD $33,954; breach share 3.1 % (Wilson 1.8–5.4 %).
   The centre ($270,780) sits far above its own neighbourhood's median ($165,729): the optimum is a sharp peak.
3. **Validation 2025-01-02 → 2026-10-30 (FULL, once):** **no lot in 2025** — GDX more than doubled (a fresh $100,000 bought
   2025-01-02 was worth +$123,597 unfinanced at 2026-10-30) without the dip this book waits for — then **−$15,255** in 2026
   with a reset DD of $30,362 (below the ceiling). V1 fails. Its validation neighbourhood: median −$5,171, p10 −$12,388 —
   the loss is not a centre accident.
4. **Against the incumbents.** N/original's own GDX D1 book run alone (the ablation) earned $163,925 in development with a
   $27,053 DD (it fails Q3 on GDX alone) and +$25,648 in the validation. The study's primary beats it in development by
   $106,855 and loses to it in the validation by $40,903 — the familiar pattern of a development optimum that does not
   carry forward. The incumbents were chosen with 2016–2026 in view and are not an independent test (labelled).
5. **Lower-risk roles.** `C24/D/broad/D.B0/R101#3 balanced` (lower-drawdown role; 13 lots, occupancy 5 %) passes V1–V3
   (+$4,769 / $14,512) but is a role holder, not a nominee; the robust-profit role `D.B1/R106#2` loses −$2,747.
6. **Cost and execution stresses** are benign in development (10 bps: $267,271 / $18,186; 14 % interest: $264,091; next-open
   stops: $270,536) and do not change the validation sign.

Sections A–I below carry every figure; FINAL_CANDIDATES.md and CHRONOLOGICAL_VALIDATION.md put the arm beside the others.

---

_Sections A–I below are generated from the sealed records by `tools/gdx-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

| Cutoff | Lanes (broad / refine) | Replicates | Rounds (✓ fired) | Requested | Fresh | GPU wall (s) | Islands per lane (count) | Stop reasons | Cells with a feasible fit | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 48 / 48 | 6 | 1✗ | 2,661,298 | 2,528,042 | 889.6 | 2: 16, 3: 20, 4: 51, 5: 6, 6: 3 | triggers not met 96 | 8 / 8 | converged by the frozen rules |
| C21 | 48 / 48 | 6 | 1✗ | 2,766,177 | 2,621,063 | 986.5 | 2: 21, 3: 24, 4: 50, 5: 1 | triggers not met 96 | 8 / 8 | converged by the frozen rules |
| C23 | 56 / 48 | 7 | 1✓ 2✗ | 2,906,000 | 2,743,440 | 1,323.6 | 2: 25, 3: 25, 4: 52, 5: 2 | triggers not met 104 | 8 / 8 | converged by the frozen rules |
| C24 | 48 / 60 | 6 | 1✗ | 3,114,870 | 2,912,864 | 1,567.9 | 2: 22, 3: 21, 4: 58, 5: 6, 6: 1 | triggers not met 108 | 8 / 8 | converged by the frozen rules |

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | broad | 144 | 131 | Q4 13 | N/original GDX D1 (ablation): no (Q4 Q5); New L0 GDX D1: yes; VG #2 GDX D1: yes |
| C19 | refine | 249 | 246 | Q4 3 | — |
| C21 | broad | 144 | 143 | Q3 1 | N/original GDX D1 (ablation): yes; New L0 GDX D1: yes; VG #2 GDX D1: yes |
| C21 | refine | 265 | 265 | — | — |
| C23 | broad | 168 | 167 | Q3 1 | N/original GDX D1 (ablation): no (Q3); New L0 GDX D1: no (Q2 Q3 Q5); VG #2 GDX D1: no (Q2 Q3 Q5) |
| C23 | refine | 252 | 249 | Q3 2, Q4 1 | — |
| C24 | broad | 144 | 141 | Q3 1, Q4 2 | N/original GDX D1 (ablation): no (Q3); New L0 GDX D1: no (Q2 Q3 Q5); VG #2 GDX D1: no (Q2 Q3 Q5) |
| C24 | informed | 45 | 43 | Q5 1, Q3 1 | — |
| C24 | refine | 245 | 241 | Q3 4 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | D | 393 / 377 | `C19/D/refine/D.A1/R103#1 profit` | $96,779 | $10,319 | 26 | $40,153 / $23,354 | $27,923 / $23,279 | no (`C19/D/refine/D.A1/R106#1 profit`) |
| C19 | D-A | 46 / 46 | `C19/D/refine/D.A0/R101#1 profit` | $72,268 | $15,496 | 12 | $23,041 / $22,725 | $15,032 / $22,619 | no (`C19/D/refine/D.A0/R104#1 profit`) |
| C21 | D | 409 / 408 | `C21/D/refine/D.A0/R101#1 profit` | $221,676 | $17,281 | 35 | $148,034 / $20,358 | $135,046 / $20,251 | no (`C21/D/refine/D.A1/R105#1 profit`) |
| C21 | D-A | 48 / 48 | `C21/D/refine/D.A0/R101#1 profit` | $221,676 | $17,281 | 35 | $148,034 / $20,358 | $135,046 / $20,251 | no (`C21/D/refine/D.A0/R104#2 robust`) |
| C23 | D | 420 / 416 | `C23/D/refine/D.B1/R106#1 profit` | $236,968 | $19,299 | 40 | $122,369 / $33,922 | $103,958 / $33,745 | no (`C23/D/refine/D.B1/R104#1 profit`) |
| C23 | D-A | 50 / 50 | `C23/D/refine/D.A0/R104#1 profit` | $194,829 | $20,227 | 22 | $112,218 / $26,242 | $95,517 / $25,996 | no (`C23/D/refine/D.A0/R105#4 profit order`) |
| C24 | D | 389 / 382 | `C24/D/refine/D.D1/R103#1 profit` | $270,780 | $17,595 | 42 | $142,829 / $31,678 | $110,093 / $30,392 | no (`C24/D/refine/D.D1/R101#3 control alternative`) |
| C24 | D-A | 50 / 50 | `C24/D/refine/D.A0/R103#1 profit` | $205,056 | $21,092 | 22 | $101,784 / $23,716 | $89,250 / $23,447 | no (`C24/D/refine/D.A0/R102#3 profit order`) |
| C24 | D+ | 437 / 425 | `C24/D/refine/D.D1/R103#1 profit` | $270,780 | $17,595 | 42 | $142,829 / $31,678 | $110,093 / $30,392 | no (`C24/D/refine/D.D1/R101#3 control alternative`) |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/D/refine/D.A1/R106#2 robust` | `C19/D/refine/D.A1/R104#3 balanced` | `C19/D/refine/D.A1/R104#6 profit order` |
| C21 | `C21/D/refine/D.C1/R105#6 profit order` | `C21/D/refine/D.D1/R106#3 balanced` | `C21/D/broad/D.A0/R102#3 balanced` |
| C23 | `C23/D/refine/D.A1/R101#2 robust` | `C23/D/refine/D.B1/R104#2 robust` | `C23/D/broad/D.A0/R101#3 balanced` |
| C24 | `C24/D/refine/D.B1/R106#2 robust` | `C24/D/refine/D.B1/R106#2 robust` | `C24/D/broad/D.B0/R101#3 balanced` |

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/D/refine/D.A1/R103#1 profit` | primary D/original; role D/actual-profit | $96,779 | −$14,659 | $48,177 | $48,177 | 7 (4 losing) | −$44,743 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A0/R101#1 profit` | primary D-A/original; role D-A/actual-profit | $72,268 | $55,614 | $36,931 | $41,770 | 6 (1 losing) | −$30,151 | 92 / 256 (training 0.4 %) |
| C19 | `C19/D/refine/D.A1/R106#2 robust` | role D/robust-profit | $72,155 | −$24,017 | $48,274 | $48,274 | 8 (5 losing) | −$44,951 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A1/R104#3 balanced` | role D/balanced | $37,016 | $4,547 | $42,961 | $42,961 | 9 (3 losing) | −$39,528 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A1/R104#6 profit order` | role D/lower-drawdown | $22,099 | −$15,689 | $41,718 | $41,718 | 8 (2 losing) | −$38,395 | 160 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A0/R101#6 profit order` | role D-A/robust-profit | $56,763 | −$14,564 | $51,468 | $57,518 | 21 (16 losing) | −$28,858 | 256 / 256 (training 0.0 %) |
| C19 | `C19/D/refine/D.A0/R106#3 balanced` | role D-A/balanced | $61,249 | $13,546 | $35,638 | $39,970 | 22 (13 losing) | −$28,858 | 193 / 256 (training 0.0 %) |
| C19 | `C19/D/broad/D.A0/R101#1 profit` | role D-A/lower-drawdown | $56,059 | −$4,898 | $35,638 | $39,703 | 11 (6 losing) | −$28,858 | 138 / 256 (training 0.0 %) |
| C19 | `control: N/original GDX D1 (ablation)` | control control: N/original GDX D1 (ablation) | $316 | $83,851 | $17,698 | $24,924 | 11 (3 losing) | −$7,748 | 0 / 256 (training 0.0 %) |
| C19 | `control: New L0 GDX D1` | control control: New L0 GDX D1 | $10,712 | $83,259 | $17,485 | $21,700 | 11 (3 losing) | −$7,538 | 0 / 256 (training 0.0 %) |
| C19 | `control: VG #2 GDX D1` | control control: VG #2 GDX D1 | $20,800 | $112,471 | $18,318 | $20,801 | 13 (3 losing) | −$7,041 | 0 / 256 (training 0.0 %) |
| C21 | `C21/D/refine/D.A0/R101#1 profit` | primary D/original; primary D-A/original; role D/actual-profit; role D-A/actual-profit | $221,676 | $24,823 | $20,744 | $27,716 | 21 (15 losing) | −$6,315 | 31 / 256 (training 0.0 %) |
| C21 | `C21/D/refine/D.C1/R105#6 profit order` | role D/robust-profit | $173,446 | −$25,234 | $50,175 | $51,344 | 15 (8 losing) | −$10,449 | 256 / 256 (training 0.0 %) |
| C21 | `C21/D/refine/D.D1/R106#3 balanced` | role D/balanced | $158,379 | −$2,474 | $48,986 | $48,986 | 9 (4 losing) | −$21,139 | 252 / 256 (training 0.0 %) |
| C21 | `C21/D/broad/D.A0/R102#3 balanced` | role D/lower-drawdown; role D-A/lower-drawdown | $166,432 | −$4,767 | $37,387 | $39,146 | 14 (9 losing) | −$13,254 | 218 / 256 (training 0.0 %) |
| C21 | `C21/D/refine/D.A0/R106#2 robust` | role D-A/robust-profit; role D-A/balanced | $180,369 | $17,255 | $31,129 | $39,139 | 24 (18 losing) | −$6,385 | 40 / 256 (training 0.0 %) |
| C21 | `control: N/original GDX D1 (ablation)` | control control: N/original GDX D1 (ablation) | $84,167 | $51,668 | $27,053 | $27,053 | 12 (5 losing) | −$12,321 | 38 / 256 (training 0.4 %) |
| C21 | `control: New L0 GDX D1` | control control: New L0 GDX D1 | $93,971 | $40,723 | $35,975 | $35,975 | 18 (8 losing) | −$12,380 | 192 / 256 (training 0.0 %) |
| C21 | `control: VG #2 GDX D1` | control control: VG #2 GDX D1 | $133,271 | $32,445 | $36,160 | $36,160 | 20 (9 losing) | −$12,380 | 234 / 256 (training 0.0 %) |
| C23 | `C23/D/refine/D.B1/R106#1 profit` | primary D/original; role D/actual-profit | $236,968 | $16,747 | $9,858 | $19,299 | 4 (3 losing) | −$4,860 | 0 / 256 (training 7.4 %) |
| C23 | `C23/D/refine/D.A0/R104#1 profit` | primary D-A/original; role D-A/actual-profit | $194,829 | $0 | $0 | $20,227 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/D/refine/D.A1/R101#2 robust` | role D/robust-profit | $189,470 | $22,786 | $11,115 | $32,839 | 2 (1 losing) | −$3,412 | 0 / 256 (training 4.3 %) |
| C23 | `C23/D/refine/D.B1/R104#2 robust` | role D/balanced | $160,773 | $29,487 | $9,192 | $17,744 | 2 (0 losing) | −$1,876 | 0 / 256 (training 0.0 %) |
| C23 | `C23/D/broad/D.A0/R101#3 balanced` | role D/lower-drawdown; role D-A/lower-drawdown | $145,585 | $0 | $0 | $17,281 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `C23/D/refine/D.A0/R105#2 robust` | role D-A/robust-profit | $177,700 | $0 | $0 | $20,997 | 0 (0 losing) | — | 0 / 256 (training 3.5 %) |
| C23 | `C23/D/refine/D.A0/R104#3 balanced` | role D-A/balanced | $128,704 | $0 | $0 | $17,744 | 0 (0 losing) | — | 0 / 256 (training 0.0 %) |
| C23 | `control: N/original GDX D1 (ablation)` | control control: N/original GDX D1 (ablation) | $135,835 | $28,090 | $8,840 | $27,053 | 2 (1 losing) | −$1,976 | 0 / 256 (training 14.4 %) |
| C23 | `control: New L0 GDX D1` | control control: New L0 GDX D1 | $134,694 | $28,070 | $8,840 | $35,975 | 2 (1 losing) | −$1,995 | 0 / 256 (training 78.1 %) |
| C23 | `control: VG #2 GDX D1` | control control: VG #2 GDX D1 | $165,716 | $28,625 | $8,840 | $36,160 | 2 (1 losing) | −$1,995 | 0 / 256 (training 84.0 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| D/original | `C19/D/refine/D.A1/R103#1 profit` → `C21/D/refine/D.A0/R101#1 profit` → `C23/D/refine/D.B1/R106#1 profit` | $26,912 | $48,177 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| D-A/original (report-only) | `C19/D/refine/D.A0/R101#1 profit` → `C21/D/refine/D.A0/R101#1 profit` → `C23/D/refine/D.A0/R104#1 profit` | $80,437 | $36,931 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| D: role robust-profit (descriptive) | `C19/D/refine/D.A1/R106#2 robust` → `C21/D/refine/D.C1/R105#6 profit order` → `C23/D/refine/D.A1/R101#2 robust` | −$26,514 | $79,367 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| D: role balanced (descriptive) | `C19/D/refine/D.A1/R104#3 balanced` → `C21/D/refine/D.D1/R106#3 balanced` → `C23/D/refine/D.B1/R104#2 robust` | $31,510 | $52,633 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| D: role lower-drawdown (descriptive) | `C19/D/refine/D.A1/R104#6 profit order` → `C21/D/broad/D.A0/R102#3 balanced` → `C23/D/broad/D.A0/R101#3 balanced` | −$20,506 | $62,359 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind (population) | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist (D) | `C24/D/refine/D.D1/R103#1 profit` | primary D | pass | $270,779.57 | $303,337 | $28,208 | $4,350 | $17,594.58 (17.6 %) | 42 26/16 | −$15,254.70 | $30,362.06 | $255,524.87 | $30,362.06 | ✗ ✓ ✓ |
| finalist (D) | `C24/D/refine/D.B1/R106#2 robust` | role D/robust-profit; role D/balanced | pass | $175,536.65 | $192,870 | $15,038 | $2,295 | $18,640.92 (18.6 %) | 22 18/4 | −$2,746.81 | $27,397.97 | $172,789.84 | $27,397.97 | ✗ ✓ ✓ |
| finalist (D) | `C24/D/broad/D.B0/R101#3 balanced` | role D/lower-drawdown | pass | $119,656.88 | $125,509 | $4,490 | $1,362 | $17,280.74 (17.3 %) | 13 10/3 | $4,769.09 | $14,512.35 | $124,425.97 | $17,280.74 | ✓ ✓ ✓ |
| finalist (D+, informed) | `C24/D/refine/D.D1/R103#1 profit` | primary D+ | pass | $270,779.57 | $303,337 | $28,208 | $4,350 | $17,594.58 (17.6 %) | 42 26/16 | −$15,254.70 | $30,362.06 | $255,524.87 | $30,362.06 | ✗ ✓ ✓ |
| finalist (D+, informed) | `C24/D/refine/D.B1/R106#2 robust` | role D+/robust-profit; role D+/balanced | pass | $175,536.65 | $192,870 | $15,038 | $2,295 | $18,640.92 (18.6 %) | 22 18/4 | −$2,746.81 | $27,397.97 | $172,789.84 | $27,397.97 | ✗ ✓ ✓ |
| finalist (D+, informed) | `C24/D/broad/D.B0/R101#3 balanced` | role D+/lower-drawdown | pass | $119,656.88 | $125,509 | $4,490 | $1,362 | $17,280.74 (17.3 %) | 13 10/3 | $4,769.09 | $14,512.35 | $124,425.97 | $17,280.74 | ✓ ✓ ✓ |
| control (control:D) | `control: N/original GDX D1 (ablation)` | external control | fails Q3 | $163,924.96 | $190,834 | $23,115 | $3,794 | $27,053.38 (27.1 %) | 37 21/16 | $25,648.34 | $20,385.99 | $189,573.30 | $27,053.38 | ✓ ✓ ✓ |
| control (control:D) | `control: New L0 GDX D1` | external control | fails Q2 Q3 Q5 | $162,764.37 | $194,865 | $27,605 | $4,495 | $35,975.28 (36.0 %) | 44 25/19 | $25,500.55 | $20,385.99 | $188,264.92 | $35,975.28 | ✓ ✓ ✗ |
| control (control:D) | `control: VG #2 GDX D1` | external control | fails Q2 Q3 Q5 | $194,340.61 | $227,581 | $28,329 | $4,911 | $36,160.34 (36.2 %) | 48 28/20 | $27,449.46 | $21,303.61 | $221,790.07 | $36,160.34 | ✓ ✓ ✗ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.D1/R103#1 profit` | $17,595 | $6,786 / $6,833 | $10,048 / $10,097 | −$6,786 | −$5,069 | 30.1 % | 0.0 % | 35.6 % | $270,780 / $0 |
| `C24/D/refine/D.B1/R106#2 robust` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 16.1 % | 0.0 % | 55.6 % | $175,537 / $0 |
| `C24/D/broad/D.B0/R101#3 balanced` | $17,281 | $8,860 / $8,860 | $9,362 / $9,412 | −$8,860 | −$8,860 | 5.2 % | 0.0 % | 81.4 % | $119,657 / $0 |
| `C24/D/refine/D.D1/R103#1 profit` | $17,595 | $6,786 / $6,833 | $10,048 / $10,097 | −$6,786 | −$5,069 | 30.1 % | 0.0 % | 35.6 % | $270,780 / $0 |
| `C24/D/refine/D.B1/R106#2 robust` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 16.1 % | 0.0 % | 55.6 % | $175,537 / $0 |
| `C24/D/broad/D.B0/R101#3 balanced` | $17,281 | $8,860 / $8,860 | $9,362 / $9,412 | −$8,860 | −$8,860 | 5.2 % | 0.0 % | 81.4 % | $119,657 / $0 |
| `control: N/original GDX D1 (ablation)` | $27,053 | $12,321 / $12,365 | $20,059 / $20,108 | −$12,321 | −$10,070 | 24.8 % | 0.0 % | 41.9 % | $163,925 / $0 |
| `control: New L0 GDX D1` | $35,975 | $12,380 / $12,424 | $28,972 / $29,018 | −$12,380 | −$10,131 | 29.8 % | 0.0 % | 42.2 % | $162,764 / $0 |
| `control: VG #2 GDX D1` | $36,160 | $12,380 / $12,424 | $29,602 / $29,648 | −$12,380 | −$10,131 | 30.7 % | 0.0 % | 48.0 % | $194,341 / $0 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.D1/R103#1 profit` | $165,729 / $110,093 / $137,911 | $30,392 / $33,225 | $33,954 / $41,068 | 3.1 % (1.8 %–5.4 %) | $142,829 / $31,678 | $267,271 / $18,186 | $258,289 / $19,366 | $264,091 | $263,457 / $18,119 | $270,536 / $17,281 |
| `C24/D/refine/D.B1/R106#2 robust` | $178,015 / $167,796 / $172,905 | $19,102 / $19,332 | $19,360 / $20,045 | 0.0 % (0.0 %–1.0 %) | $173,161 / $19,102 | $174,392 / $18,739 | $170,020 / $18,935 | $172,858 | $170,780 / $18,928 | $174,468 / $18,641 |
| `C24/D/broad/D.B0/R101#3 balanced` | $108,866 / $76,794 / $92,830 | $17,744 / $18,837 | $18,969 / $21,299 | 0.0 % (0.0 %–1.0 %) | $96,168 / $17,281 | $118,233 / $17,421 | $118,393 / $17,810 | $121,451 | $116,817 / $17,514 | $118,480 / $17,281 |
| `C24/D/refine/D.D1/R103#1 profit` | $165,729 / $110,093 / $137,911 | $30,392 / $33,225 | $33,954 / $41,068 | 3.1 % (1.8 %–5.4 %) | $142,829 / $31,678 | $267,271 / $18,186 | $258,289 / $19,366 | $264,091 | $263,457 / $18,119 | $270,536 / $17,281 |
| `C24/D/refine/D.B1/R106#2 robust` | $178,015 / $167,796 / $172,905 | $19,102 / $19,332 | $19,360 / $20,045 | 0.0 % (0.0 %–1.0 %) | $173,161 / $19,102 | $174,392 / $18,739 | $170,020 / $18,935 | $172,858 | $170,780 / $18,928 | $174,468 / $18,641 |
| `C24/D/broad/D.B0/R101#3 balanced` | $108,866 / $76,794 / $92,830 | $17,744 / $18,837 | $18,969 / $21,299 | 0.0 % (0.0 %–1.0 %) | $96,168 / $17,281 | $118,233 / $17,421 | $118,393 / $17,810 | $121,451 | $116,817 / $17,514 | $118,480 / $17,281 |
| `control: N/original GDX D1 (ablation)` | $153,027 / $112,746 / $132,886 | $35,513 / $36,477 | $36,630 / $40,866 | 16.2 % (12.8 %–20.2 %) | $130,116 / $35,549 | $160,040 / $27,434 | $150,425 / $28,194 | $158,312 | $158,055 / $27,314 | $163,587 / $27,071 |
| `control: New L0 GDX D1` | $154,668 / $112,866 / $133,767 | $40,934 / $42,007 | $42,094 / $45,095 | 75.0 % (70.4 %–79.1 %) | $133,160 / $40,763 | $158,176 / $36,752 | $148,166 / $38,302 | $156,962 | $155,866 / $37,002 | $162,555 / $35,851 |
| `control: VG #2 GDX D1` | $157,464 / $111,403 / $134,433 | $41,967 / $42,827 | $42,996 / $45,625 | 87.8 % (84.1 %–90.7 %) | $138,839 / $41,557 | $189,320 / $36,936 | $177,300 / $38,486 | $187,176 | $186,618 / $37,182 | $192,850 / $36,135 |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.D1/R103#1 profit` | $9,025 | $13,629 | $15,791 | $1,886 | $138,809 | −$1,848 | $33,382 | $16,357 | $43,750 | $0 | −$15,255 |
| `C24/D/refine/D.B1/R106#2 robust` | $1,055 | $6,393 | −$4,746 | $0 | $106,194 | $3,075 | $4,634 | $31,636 | $27,295 | $0 | −$2,747 |
| `C24/D/broad/D.B0/R101#3 balanced` | $9,743 | −$4,105 | $0 | $0 | $115,925 | $0 | −$1,906 | $0 | $0 | $0 | $4,769 |
| `C24/D/refine/D.D1/R103#1 profit` | $9,025 | $13,629 | $15,791 | $1,886 | $138,809 | −$1,848 | $33,382 | $16,357 | $43,750 | $0 | −$15,255 |
| `C24/D/refine/D.B1/R106#2 robust` | $1,055 | $6,393 | −$4,746 | $0 | $106,194 | $3,075 | $4,634 | $31,636 | $27,295 | $0 | −$2,747 |
| `C24/D/broad/D.B0/R101#3 balanced` | $9,743 | −$4,105 | $0 | $0 | $115,925 | $0 | −$1,906 | $0 | $0 | $0 | $4,769 |
| `control: N/original GDX D1 (ablation)` | −$188 | −$5,264 | $5,767 | $0 | $68,625 | $15,227 | $20,850 | $30,818 | $28,090 | $0 | $25,648 |
| `control: New L0 GDX D1` | $271 | $4,404 | $6,037 | $0 | $68,625 | $14,635 | $9,947 | $30,776 | $28,070 | $0 | $25,501 |
| `control: VG #2 GDX D1` | $9,257 | $7,423 | $4,119 | $0 | $93,264 | $19,207 | −$677 | $33,122 | $28,625 | $0 | $27,449 |

### Parameter vectors

- `C24/D/refine/D.D1/R103#1 profit` — cell `D.D1`
  - D1·GDX: targetPercentChange 278, trailingBuyPercentage 6, trailingStopPercentage 66, maximumHoldDays 5, tickWindowSize 246, intradayLossBuffer 35, pullback 77, continuationWindow 82; controls {"d":219,"hx":59,"g":47,"k":2,"r":1000,"c":83}; D1 arming from the first day: false
- `C24/D/refine/D.B1/R106#2 robust` — cell `D.B1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
- `C24/D/broad/D.B0/R101#3 balanced` — cell `D.B0`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 6, trailingStopPercentage 62, maximumHoldDays 8, tickWindowSize 28, intradayLossBuffer 45, pullback 96, continuationWindow 178; controls {"d":88}; D1 arming from the first day: false
- `C24/D/refine/D.D1/R103#1 profit` — cell `D.D1`
  - D1·GDX: targetPercentChange 278, trailingBuyPercentage 6, trailingStopPercentage 66, maximumHoldDays 5, tickWindowSize 246, intradayLossBuffer 35, pullback 77, continuationWindow 82; controls {"d":219,"hx":59,"g":47,"k":2,"r":1000,"c":83}; D1 arming from the first day: false
- `C24/D/refine/D.B1/R106#2 robust` — cell `D.B1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
- `C24/D/broad/D.B0/R101#3 balanced` — cell `D.B0`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 6, trailingStopPercentage 62, maximumHoldDays 8, tickWindowSize 28, intradayLossBuffer 45, pullback 96, continuationWindow 178; controls {"d":88}; D1 arming from the first day: false
- `control: N/original GDX D1 (ablation)` — cell `D.D1`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 2, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 24, pullback 152, continuationWindow 10; controls {"d":159,"hx":28,"g":70,"k":3,"r":700,"c":60}; D1 arming from the first day: false
- `control: New L0 GDX D1` — cell `D.A0`
  - D1·GDX: targetPercentChange 277, trailingBuyPercentage 1, trailingStopPercentage 61, maximumHoldDays 13, tickWindowSize 232, intradayLossBuffer 25, pullback 152, continuationWindow 10; controls {}; D1 arming from the first day: false
- `control: VG #2 GDX D1` — cell `D.A0`
  - D1·GDX: targetPercentChange 276, trailingBuyPercentage 1, trailingStopPercentage 57, maximumHoldDays 12, tickWindowSize 243, intradayLossBuffer 29, pullback 152, continuationWindow 12; controls {}; D1 arming from the first day: false

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/D/refine/D.A1/R103#1 profit` | C19 primary D | $114,036.12 | 58 | 74.1 % | 10.5 / 25 | 14.7 % (401 / 2,723) | $273,947 / $22,003 | −$44,743 | none | $58,557 / $61,320 / $72,372 |
| `C21/D/refine/D.A0/R101#1 profit` | C21 primary D | $264,662.60 | 67 | 50.0 % | 7 / 108 | 29.8 % (811 / 2,723) | $427,484 / $11,209 | −$9,554 | none | $32,166 / $36,688 / $54,777 |
| `C23/D/refine/D.B1/R106#1 profit` | C23 primary D | $268,916.64 | 63 | 46.0 % | 7 / 108 | 25.9 % (705 / 2,723) | $395,671 / $11,076 | −$9,554 | none | $32,166 / $36,688 / $54,777 |
| `C24/D/refine/D.D1/R103#1 profit` | C24 primary D; C24 primary D+ | $255,524.87 | 46 | 58.7 % | 8 / 108 | 25.4 % (691 / 2,723) | $320,273 / $25,627 | −$19,102 | none | $39,326 / $43,371 / $59,551 |
| `C24/D/refine/D.B1/R106#2 robust` | C24 role D/robust-profit; C24 role D/balanced; C24 role D+/robust-profit; C24 role D+/balanced | $172,789.84 | 27 | 81.5 % | 25 / 62 | 14.6 % (399 / 2,723) | $211,268 / $18,777 | −$17,420 | none | $38,065 / $42,194 / $58,710 |
| `C24/D/broad/D.B0/R101#3 balanced` | C24 role D/lower-drawdown; C24 role D+/lower-drawdown | $124,425.97 | 16 | 75.0 % | 8 / 29 | 4.4 % (120 / 2,723) | $123,352 / $11,109 | −$8,860 | none | $31,645 / $36,202 / $54,430 |
| `control: N/original GDX D1 (ablation)` | control | $189,573.30 | 47 | 56.5 % | 14 / 50 | 22.6 % (616 / 2,723) | $348,287 / $12,213 | −$12,321 | none | $34,241 / $38,625 / $56,160 |
| `control: New L0 GDX D1` | control | $188,264.92 | 54 | 56.6 % | 14 / 69 | 26.5 % (721 / 2,723) | $394,742 / $12,273 | −$12,380 | none | $34,285 / $38,666 / $56,190 |
| `control: VG #2 GDX D1` | control | $221,790.07 | 58 | 57.9 % | 14 / 65 | 27.0 % (734 / 2,723) | $399,478 / $11,276 | −$12,380 | none | $34,285 / $38,666 / $56,190 |

Worst closed trades of each subject (net after costs and interest):

- `C19/D/refine/D.A1/R103#1 profit`: D1·GDX 2020-03-05 → 2020-03-18 (maximum hold, 13 d) −$19,932.85; D1·GDX 2026-03-03 → 2026-03-16 (maximum hold, 13 d) −$12,053.67; D1·GDX 2024-10-31 → 2024-11-13 (maximum hold, 13 d) −$9,821.35; D1·GDX 2022-04-21 → 2022-05-04 (maximum hold, 13 d) −$8,964.05; D1·GDX 2023-05-17 → 2023-05-30 (maximum hold, 13 d) −$7,638.31
  - largest giveback: D1·GDX 2020-03-05 → 2020-03-18 best mark $2,069.72, final −$19,932.85 (giveback $22,002.56)
- `C21/D/refine/D.A0/R101#1 profit`: D1·GDX 2026-06-05 → 2026-06-10 (maximum hold, 5 d) −$8,300.58; D1·GDX 2026-06-22 → 2026-06-29 (maximum hold, 7 d) −$7,143.46; D1·GDX 2022-08-25 → 2022-08-30 (maximum hold, 5 d) −$5,755.72; D1·GDX 2022-10-18 → 2022-11-03 (maximum hold, 16 d) −$4,283.70; D1·GDX 2017-02-27 → 2017-03-06 (maximum hold, 7 d) −$4,060.98
  - largest giveback: D1·GDX 2020-03-30 → 2020-04-15 best mark $37,950.19, final $26,741.32 (giveback $11,208.88)
  - open at 2026-10-30: D1·GDX from 2026-10-29 marked −$5,484.04
- `C23/D/refine/D.B1/R106#1 profit`: D1·GDX 2026-06-02 → 2026-06-08 (maximum hold, 6 d) −$8,251.09; D1·GDX 2026-06-22 → 2026-06-29 (maximum hold, 7 d) −$7,143.46; D1·GDX 2017-02-28 → 2017-03-06 (maximum hold, 6 d) −$5,068.73; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71; D1·GDX 2021-02-23 → 2021-03-01 (maximum hold, 6 d) −$4,390.39
  - largest giveback: D1·GDX 2020-03-30 → 2020-04-15 best mark $36,309.52, final $25,233.16 (giveback $11,076.36)
- `C24/D/refine/D.D1/R103#1 profit`: D1·GDX 2026-05-19 → 2026-07-17 (maximum hold, 59 d) −$19,101.77; D1·GDX 2017-02-28 → 2017-03-06 (maximum hold, 6 d) −$5,068.73; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71; D1·GDX 2022-10-28 → 2022-11-02 (buffered intraday loss, 5 d) −$3,707.38; D1·GDX 2022-06-24 → 2022-06-30 (maximum hold, 6 d) −$2,800.71
  - largest giveback: D1·GDX 2026-05-19 → 2026-07-17 best mark $6,525.03, final −$19,101.77 (giveback $25,626.80)
- `C24/D/refine/D.B1/R106#2 robust`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52; D1·GDX 2017-04-24 → 2017-05-19 (maximum hold, 25 d) −$2,398.22
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)
- `C24/D/broad/D.B0/R101#3 balanced`: D1·GDX 2017-02-28 → 2017-03-08 (maximum hold, 8 d) −$8,860.16; D1·GDX 2026-04-23 → 2026-05-01 (maximum hold, 8 d) −$3,892.39; D1·GDX 2022-06-14 → 2022-06-24 (maximum hold, 10 d) −$3,376.39; D1·GDX 2020-09-23 → 2020-10-02 (maximum hold, 9 d) −$434.83; D1·GDX 2026-03-19 → 2026-03-26 (trailing stop, 7 d) $376.64
  - largest giveback: D1·GDX 2020-03-30 → 2020-04-15 best mark $36,713.41, final $25,604.42 (giveback $11,108.98)
- `control: N/original GDX D1 (ablation)`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,070.26; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$9,068.17; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$8,021.00; D1·GDX 2021-02-17 → 2021-03-02 (maximum hold, 13 d) −$6,725.13
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,145.11, final −$9,068.17 (giveback $12,213.28)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76
- `control: New L0 GDX D1`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,131.21; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2016-12-02 → 2016-12-15 (maximum hold, 13 d) −$8,609.80; D1·GDX 2022-08-18 → 2022-08-31 (maximum hold, 13 d) −$8,108.29; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$7,817.59
  - largest giveback: D1·GDX 2016-12-02 → 2016-12-15 best mark $3,663.56, final −$8,609.80 (giveback $12,273.37)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76
- `control: VG #2 GDX D1`: D1·GDX 2022-06-28 → 2022-07-11 (maximum hold, 13 d) −$10,131.21; D1·GDX 2026-07-07 → 2026-07-20 (maximum hold, 13 d) −$9,113.94; D1·GDX 2017-06-27 → 2017-07-10 (maximum hold, 13 d) −$7,817.59; D1·GDX 2017-04-25 → 2017-05-08 (maximum hold, 13 d) −$6,612.52; D1·GDX 2023-02-06 → 2023-02-21 (maximum hold, 15 d) −$6,455.48
  - largest giveback: D1·GDX 2020-04-01 → 2020-04-15 best mark $38,847.45, final $27,570.98 (giveback $11,276.48)
  - open at 2026-10-30: D1·GDX from 2026-10-23 marked −$5,564.76

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 GDX daily (Yahoo Finance, 2006-05-22 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/D/refine/D.A1/R103#1 profit` | A1 | 13 (calendar maximum hold) | none (family A) | −$42,205 (2008-10-14) | −$15,427 | 0.2 % | — | −$45,723 (2020-03-05) | 0.4 % |
| `C21/D/refine/D.A0/R101#1 profit` | A0 | 5 (calendar maximum hold) | none (family A) | −$34,560 (2008-10-20) | −$9,235 | 0.0 % | — | −$39,934 (2020-03-10) | 0.1 % |
| `C23/D/refine/D.B1/R106#1 profit` | B1 | 5 (calendar maximum hold) | 13.4 % | −$15,587 (2014-10-28) | −$9,235 | 0.0 % | 2.2 % below the stop (2014-10-31) | −$16,309 (2020-03-10) | 0.0 % |
| `C24/D/refine/D.D1/R103#1 profit` | D1 | 59 (adaptive hold: the extended bound) | 21.9 % | −$25,076 (2014-09-18) | −$21,900 | 0.0 % | 3.2 % below the stop (2014-10-31) | −$25,958 (2020-02-24) | 0.0 % |
| `C24/D/refine/D.B1/R106#2 robust` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/D/broad/D.B0/R101#3 balanced` | B0 | 8 (calendar maximum hold) | 8.8 % | −$12,727 (2013-04-08) | −$8,800 | 0.0 % | 3.9 % below the stop (2013-04-15) | −$15,818 (2020-03-09) | 0.0 % |
| `control: N/original GDX D1 (ablation)` | D1 | 28 (adaptive hold: the extended bound) | 15.9 % | −$20,755 (2013-03-22) | −$15,900 | 0.0 % | 4.9 % below the stop (2013-04-15) | −$22,775 (2020-02-19) | 0.0 % |
| `control: New L0 GDX D1` | A0 | 13 (calendar maximum hold) | none (family A) | −$42,205 (2008-10-14) | −$15,427 | 0.2 % | — | −$45,723 (2020-03-05) | 0.4 % |
| `control: VG #2 GDX D1` | A0 | 12 (calendar maximum hold) | none (family A) | −$42,205 (2008-10-14) | −$14,750 | 0.1 % | — | −$45,723 (2020-03-05) | 0.4 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/D/refine/D.D1/R103#1 profit` | small | 128 | $213,028 / $175,744 | $27,253 / $29,277 / $32,905 | $30,002 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/refine/D.D1/R103#1 profit` | wide | 128 | $143,520 / $88,073 | $37,417 / $40,088 / $52,762 | $42,184 | 18 (14.1 %; 9.1 %–21.1 %) |
| `C24/D/refine/D.B1/R106#2 robust` | small | 128 | $180,341 / $174,444 | $18,732 / $18,883 / $19,280 | $18,925 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/refine/D.B1/R106#2 robust` | wide | 128 | $165,905 / $136,528 | $23,170 / $23,489 / $27,721 | $24,312 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/broad/D.B0/R101#3 balanced` | small | 128 | $120,555 / $107,266 | $17,281 / $17,281 / $17,294 | $17,283 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/D/broad/D.B0/R101#3 balanced` | wide | 128 | $102,290 / $65,294 | $19,735 / $21,550 / $27,945 | $22,205 | 0 (0.0 %; 0.0 %–2.9 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/D/refine/D.A1/R103#1 profit` | $96,779 | 0.0 % | none open | none open | −$1,884 / −$4,288 / −$6,996 | −$4,735 / −$44,743 |
| C21 | `C21/D/refine/D.A0/R101#1 profit` | $221,676 | 0.0 % | none open | none open | −$1,172 / −$4,471 / −$5,798 | −$2,781 / −$6,315 |
| C23 | `C23/D/refine/D.B1/R106#1 profit` | $236,968 | 0.0 % | none open | none open | −$1,816 / −$4,723 / −$6,786 | −$1,650 / −$4,860 |
| C24 | `C24/D/refine/D.D1/R103#1 profit` | $270,780 | 0.0 % | none open | none open | −$2,039 / −$4,800 / −$6,786 | −$4,503 / −$19,102 |

