# Fixed GDX D1 + Growth pair (arm C: standalone selections, no re-optimization)

**Verdict: the C24 primary `C24/C/pair DF2×GF1` is DEVELOPMENT-QUALIFIED AND PASSES V1–V3, but the arm's chronological
procedure is UNSUPPORTED (net $11,183, DD $52,065).** It is the second development-only entry of the sealed outcome.
Research only; nothing adopted.

## What the arm is

No search: every pair of the cutoff's D finalists (DF1–DF3) and G finalists (GF1–GF3) shares the one slot under the
accepted allocator (first-come funding; a book is refused while the other holds the slot), qualified by Q1–Q6 exactly as
searched configurations are. C+ pairs the informed finalists D+ × G+ (no independent chronological test).

## Findings

1. **Chronology.** C19 `DF3×GF1` → 2020–2021 **−$14,776, DD $42,961 (breach)**; C21 `DF1×GF1` → 2022–2023 +$9,261, **DD
   $42,452 (breach)**; C23 `DF1×GF1` → 2024 +$16,747 / $9,858. Chained: **$11,183 / $52,065 → unsupported**.
2. **C24 primary** (`rc1-5beecb91ea91c775`) = D's robust-profit finalist `D.B1/R106#2` × G's primary `G.h1.s1/R105#1`:
   development $273,035, DD $18,641, 50 lots; confirmation median $198,041, p10 $162,027, **robust $180,034 (the highest
   robust net of any independent primary)**; p90 / p95 DD $30,096 / $33,105; breach share 2.3 %. Causal removals: without
   Growth $175,537 (the D book alone), without D1 $161,457 (the G book alone). The pair earns $63,959 less than the sum
   of its books run alone ($336,994): shared-slot contention (over the full run the allocator refused 5 Growth·GDX
   decisions while D1·GDX held the slot and 1 D1·GDX decision while Growth·GDX held it) and the changed paths that follow.
3. **Validation (FULL, once): +$5,210, reset DD $27,398 — V1–V3 pass.** Its validation neighbourhood breaches the
   ceiling in **29.7 %** of 256 draws (Wilson 24.4–35.6 %; training 4.7 %), and at 20 bps per side the validation slice is
   −$8,084 with a $34,431 DD. The pass is thin.
4. **Against the D primary** (the outcome's combined-vs-standalone comparison): +$2,255 centre net, +$1,046 DD, +$42,122
   confirmation robust; fixed pairs have no seeds, so "replicated" does not apply. Most of the Growth book's development
   contribution is one episode (the 2016 gold-miner rally: +$81,087 of the pair's total-account increment in 2016).
5. **Lower-risk roles** (`DF2×GF2`, `DF2×GF3`) lose −$2,747 in the validation (the D book's 2026 loss, no Growth lot).

Sections A–I below carry every figure.

---

_Sections A–I below are generated from the sealed records by `tools/gdx-d1-growth/arm-reports.ts` (report-only; no evaluation)._

## A. Search effort, coverage and convergence per cutoff

Arm C is never searched: at each cutoff it pairs arm D’s and arm G’s finalists (primary, robust-profit, balanced; ≤ 3 × 3), vectors unchanged, and qualifies the pairs with the joint instrument.

## B. Qualification (Q1–Q6) per cutoff and stage

| Cutoff | Stage | Members | Qualified | Failed gates (count) | External controls (qualified? failed gates) |
|---|---:|---:|---:|---:|---:|
| C19 | fixed | 9 | 8 | Q3 1 | — |
| C21 | fixed | 9 | 9 | — | — |
| C23 | fixed | 9 | 8 | Q3 1 | — |
| C24 | fixed-informed | 4 | 4 | — | — |
| C24 | fixed | 6 | 5 | Q3 1 | — |

## C. Primaries (NL0 original rule) and roles per cutoff

| Cutoff | Population | Members / qualified | Primary | Centre net | Centre DD | Lots | Sel. robust / p90 DD | Conf. p10 / p90 DD | RA1 (report-only) agrees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | C | 9 / 8 | `C19/C/pair DF3×GF1` | $120,834 | $15,906 | 36 | $51,942 / $28,136 | $40,306 / $28,232 | no (`C19/C/pair DF1×GF3`) |
| C21 | C | 9 / 9 | `C21/C/pair DF1×GF1` | $269,886 | $17,281 | 41 | $141,649 / $29,323 | $126,784 / $28,698 | yes |
| C23 | C | 9 / 8 | `C23/C/pair DF1×GF1` | $260,677 | $18,411 | 47 | $134,475 / $35,523 | $114,680 / $34,939 | no (`C23/C/pair DF2×GF1`) |
| C24 | C | 6 / 5 | `C24/C/pair DF2×GF1` | $273,035 | $18,641 | 50 | $177,068 / $31,612 | $162,027 / $30,096 | no (`C24/C/pair DF2×GF3`) |
| C24 | C+ | 10 / 9 | `C24/C+/pair D+F1×G+F2` | $297,262 | $17,977 | 47 | $151,986 / $33,763 | $127,413 / $33,437 | no (`C24/C+/pair D+F2×G+F2`) |

Roles of the arm’s population (actual-profit = the primary):

| Cutoff | robust-profit | balanced | lower-drawdown |
|---|---:|---:|---:|
| C19 | `C19/C/pair DF2×GF3` | `C19/C/pair DF2×GF3` | `C19/C/pair DF3×GF3` |
| C21 | `C21/C/pair DF2×GF3` | `C21/C/pair DF3×GF3` | `C21/C/pair DF3×GF3` |
| C23 | `C23/C/pair DF2×GF2` | `C23/C/pair DF3×GF3` | `C23/C/pair DF3×GF3` |
| C24 | `C24/C/pair DF2×GF2` | `C24/C/pair DF2×GF3` | `C24/C/pair DF2×GF3` |

- C19: 9 pairs — `C19/C/pair DF1×GF1` = D1 `C19/D/refine/D.A1/R103#1 profit` × Growth `C19/G/refine/G.h1.s1/R106#1 profit`; `C19/C/pair DF1×GF2` = D1 `C19/D/refine/D.A1/R103#1 profit` × Growth `C19/G/refine/G.h0.s0/R104#2 robust`; `C19/C/pair DF1×GF3` = D1 `C19/D/refine/D.A1/R103#1 profit` × Growth `C19/G/refine/G.h0.s1/R102#3 balanced`; `C19/C/pair DF2×GF1` = D1 `C19/D/refine/D.A1/R106#2 robust` × Growth `C19/G/refine/G.h1.s1/R106#1 profit`; `C19/C/pair DF2×GF2` = D1 `C19/D/refine/D.A1/R106#2 robust` × Growth `C19/G/refine/G.h0.s0/R104#2 robust`; `C19/C/pair DF2×GF3` = D1 `C19/D/refine/D.A1/R106#2 robust` × Growth `C19/G/refine/G.h0.s1/R102#3 balanced`; `C19/C/pair DF3×GF1` = D1 `C19/D/refine/D.A1/R104#3 balanced` × Growth `C19/G/refine/G.h1.s1/R106#1 profit`; `C19/C/pair DF3×GF2` = D1 `C19/D/refine/D.A1/R104#3 balanced` × Growth `C19/G/refine/G.h0.s0/R104#2 robust`; `C19/C/pair DF3×GF3` = D1 `C19/D/refine/D.A1/R104#3 balanced` × Growth `C19/G/refine/G.h0.s1/R102#3 balanced`
- C21: 9 pairs — `C21/C/pair DF1×GF1` = D1 `C21/D/refine/D.A0/R101#1 profit` × Growth `C21/G/refine/G.h2.s0/R101#1 profit`; `C21/C/pair DF1×GF2` = D1 `C21/D/refine/D.A0/R101#1 profit` × Growth `C21/G/refine/G.h1.s0/R102#2 robust`; `C21/C/pair DF1×GF3` = D1 `C21/D/refine/D.A0/R101#1 profit` × Growth `C21/G/refine/G.h1.s1/R103#2 robust`; `C21/C/pair DF2×GF1` = D1 `C21/D/refine/D.C1/R105#6 profit order` × Growth `C21/G/refine/G.h2.s0/R101#1 profit`; `C21/C/pair DF2×GF2` = D1 `C21/D/refine/D.C1/R105#6 profit order` × Growth `C21/G/refine/G.h1.s0/R102#2 robust`; `C21/C/pair DF2×GF3` = D1 `C21/D/refine/D.C1/R105#6 profit order` × Growth `C21/G/refine/G.h1.s1/R103#2 robust`; `C21/C/pair DF3×GF1` = D1 `C21/D/refine/D.D1/R106#3 balanced` × Growth `C21/G/refine/G.h2.s0/R101#1 profit`; `C21/C/pair DF3×GF2` = D1 `C21/D/refine/D.D1/R106#3 balanced` × Growth `C21/G/refine/G.h1.s0/R102#2 robust`; `C21/C/pair DF3×GF3` = D1 `C21/D/refine/D.D1/R106#3 balanced` × Growth `C21/G/refine/G.h1.s1/R103#2 robust`
- C23: 9 pairs — `C23/C/pair DF1×GF1` = D1 `C23/D/refine/D.B1/R106#1 profit` × Growth `C23/G/refine/G.h2.s0/R104#1 profit`; `C23/C/pair DF1×GF2` = D1 `C23/D/refine/D.B1/R106#1 profit` × Growth `C23/G/refine/G.h2.s0/R105#2 robust`; `C23/C/pair DF1×GF3` = D1 `C23/D/refine/D.B1/R106#1 profit` × Growth `C23/G/refine/G.h2.s0/R103#3 balanced`; `C23/C/pair DF2×GF1` = D1 `C23/D/refine/D.A1/R101#2 robust` × Growth `C23/G/refine/G.h2.s0/R104#1 profit`; `C23/C/pair DF2×GF2` = D1 `C23/D/refine/D.A1/R101#2 robust` × Growth `C23/G/refine/G.h2.s0/R105#2 robust`; `C23/C/pair DF2×GF3` = D1 `C23/D/refine/D.A1/R101#2 robust` × Growth `C23/G/refine/G.h2.s0/R103#3 balanced`; `C23/C/pair DF3×GF1` = D1 `C23/D/refine/D.B1/R104#2 robust` × Growth `C23/G/refine/G.h2.s0/R104#1 profit`; `C23/C/pair DF3×GF2` = D1 `C23/D/refine/D.B1/R104#2 robust` × Growth `C23/G/refine/G.h2.s0/R105#2 robust`; `C23/C/pair DF3×GF3` = D1 `C23/D/refine/D.B1/R104#2 robust` × Growth `C23/G/refine/G.h2.s0/R103#3 balanced`
- C24: 6 pairs — `C24/C/pair DF1×GF1` = D1 `C24/D/refine/D.D1/R103#1 profit` × Growth `C24/G/refine/G.h1.s1/R105#1 profit`; `C24/C/pair DF1×GF2` = D1 `C24/D/refine/D.D1/R103#1 profit` × Growth `C24/G/refine/G.h2.s1/R105#2 robust`; `C24/C/pair DF1×GF3` = D1 `C24/D/refine/D.D1/R103#1 profit` × Growth `C24/G/refine/G.h1.s1/R101#2 robust`; `C24/C/pair DF2×GF1` = D1 `C24/D/refine/D.B1/R106#2 robust` × Growth `C24/G/refine/G.h1.s1/R105#1 profit`; `C24/C/pair DF2×GF2` = D1 `C24/D/refine/D.B1/R106#2 robust` × Growth `C24/G/refine/G.h2.s1/R105#2 robust`; `C24/C/pair DF2×GF3` = D1 `C24/D/refine/D.B1/R106#2 robust` × Growth `C24/G/refine/G.h1.s1/R101#2 robust`

## D. Chronological evidence (retrospective, previously examined broader-market history)

| Fold | Subject | Roles | Net at the cutoff | Next-slice P&L | Next-slice reset DD | Whole-run DD | Next-slice lots | Worst next-slice lot MAE | Training nbhd breaching on the slice (training breach share) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/C/pair DF3×GF1` | primary C/original; role C/actual-profit | $120,834 | −$14,776 | $42,961 | $42,961 | 25 (14 losing) | −$39,528 | 256 / 256 (training 1.9 %) |
| C19 | `C19/C/pair DF2×GF3` | role C/robust-profit; role C/balanced | $89,644 | −$39,552 | $49,828 | $49,828 | 13 (9 losing) | −$44,951 | 256 / 256 (training 0.0 %) |
| C19 | `C19/C/pair DF3×GF3` | role C/lower-drawdown | $63,477 | −$23,004 | $42,961 | $42,961 | 13 (7 losing) | −$39,528 | 233 / 256 (training 0.0 %) |
| C21 | `C21/C/pair DF1×GF1` | primary C/original; role C/actual-profit | $269,886 | $9,261 | $42,452 | $42,452 | 26 (17 losing) | −$16,797 | 212 / 256 (training 1.6 %) |
| C21 | `C21/C/pair DF2×GF3` | role C/robust-profit | $170,158 | −$25,234 | $50,175 | $51,344 | 15 (8 losing) | −$10,449 | 256 / 256 (training 0.0 %) |
| C21 | `C21/C/pair DF3×GF3` | role C/balanced; role C/lower-drawdown | $155,057 | −$2,474 | $48,986 | $48,986 | 9 (4 losing) | −$21,139 | 252 / 256 (training 0.0 %) |
| C23 | `C23/C/pair DF1×GF1` | primary C/original; role C/actual-profit | $260,677 | $16,747 | $9,858 | $18,411 | 4 (3 losing) | −$4,860 | 0 / 256 (training 11.3 %) |
| C23 | `C23/C/pair DF2×GF2` | role C/robust-profit | $209,735 | $22,786 | $11,115 | $26,704 | 2 (1 losing) | −$3,412 | 0 / 256 (training 6.6 %) |
| C23 | `C23/C/pair DF3×GF3` | role C/balanced; role C/lower-drawdown | $161,486 | $29,487 | $9,192 | $17,744 | 2 (0 losing) | −$1,876 | 0 / 256 (training 0.0 %) |

Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):

| Procedure | Fold primaries (C19 → C21 → C23) | Sequential net 2020–2024 | Sequential DD | Verdict |
|---|---:|---:|---:|---:|
| C/original | `C19/C/pair DF3×GF1` → `C21/C/pair DF1×GF1` → `C23/C/pair DF1×GF1` | $11,183 | $52,065 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

| Descriptive path | Subjects | Net | DD | Verdict (descriptive only) |
|---|---:|---:|---:|---:|
| C: role robust-profit (descriptive) | `C19/C/pair DF2×GF3` → `C21/C/pair DF2×GF3` → `C23/C/pair DF2×GF2` | −$42,050 | $94,902 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| C: role balanced (descriptive) | `C19/C/pair DF2×GF3` → `C21/C/pair DF3×GF3` → `C23/C/pair DF3×GF3` | −$12,589 | $93,673 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |
| C: role lower-drawdown (descriptive) | `C19/C/pair DF3×GF3` → `C21/C/pair DF3×GF3` → `C23/C/pair DF3×GF3` | $3,959 | $80,157 | unsupported (sequential net ≤ 0 or sequential drawdown > $35,000) |

## E. C24 finalists and external controls: development, validation and full history

Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.

| Kind (population) | Label | Roles | Q1–Q6 | Dev net | Gross | Interest | Costs | Dev DD (% of $100k) | Lots W/L | Val. P&L | Val. reset DD | Full net | Full DD | V1 V2 V3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| finalist (C) | `C24/C/pair DF2×GF1` | primary C | pass | $273,035.02 | $299,881 | $21,699 | $5,147 | $18,640.92 (18.6 %) | 50 43/7 | $5,210.41 | $27,397.97 | $278,245.43 | $27,397.97 | ✓ ✓ ✓ |
| finalist (C) | `C24/C/pair DF2×GF2` | role C/robust-profit | pass | $193,468.20 | $218,727 | $22,151 | $3,108 | $18,640.92 (18.6 %) | 30 24/6 | −$2,746.81 | $27,397.97 | $190,721.39 | $27,397.97 | ✗ ✓ ✓ |
| finalist (C) | `C24/C/pair DF2×GF3` | role C/balanced; role C/lower-drawdown | pass | $185,197.39 | $204,794 | $16,696 | $2,901 | $18,640.92 (18.6 %) | 28 22/6 | −$2,746.81 | $27,397.97 | $182,450.58 | $27,397.97 | ✗ ✓ ✓ |
| finalist (C+, informed) | `C24/C+/pair D+F1×G+F2` | primary C+ | pass | $297,262.28 | $333,921 | $31,795 | $4,865 | $17,976.68 (18.0 %) | 47 30/17 | −$15,254.70 | $30,362.06 | $282,007.58 | $30,362.06 | ✗ ✓ ✓ |
| finalist (C+, informed) | `C24/C+/pair D+F2×G+F2` | role C+/robust-profit | pass | $205,706.60 | $229,464 | $20,644 | $3,113 | $18,640.92 (18.6 %) | 30 24/6 | −$2,746.81 | $27,397.97 | $202,959.79 | $27,397.97 | ✗ ✓ ✓ |
| finalist (C+, informed) | `C24/C/pair DF2×GF3` | role C+/balanced | pass | $185,197.39 | $204,794 | $16,696 | $2,901 | $18,640.92 (18.6 %) | 28 22/6 | −$2,746.81 | $27,397.97 | $182,450.58 | $27,397.97 | ✗ ✓ ✓ |
| finalist (C+, informed) | `C24/C+/pair D+F2×G+F1` | role C+/lower-drawdown | pass | $204,588.59 | $230,342 | $23,039 | $2,714 | $18,640.92 (18.6 %) | 26 21/5 | −$2,746.81 | $27,397.97 | $201,841.79 | $27,397.97 | ✗ ✓ ✓ |

### Risk decomposition (development; dollars of the fixed $100,000 allocation)

| Label | Marked minute DD | Principal loss marked / liquidation | Banked-capital DD marked / liquidation | Worst lot MAE | Worst realized lot | Occupancy | Open-lot share | Top episode share | D1 / Growth booked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF2×GF1` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 24.1 % | 0.0 % | 42.5 % | $149,312 / $123,723 |
| `C24/C/pair DF2×GF2` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$9,546 | 23.7 % | 0.0 % | 55.2 % | $88,220 / $105,248 |
| `C24/C/pair DF2×GF3` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 18.0 % | 0.0 % | 57.6 % | $110,565 / $74,633 |
| `C24/C+/pair D+F1×G+F2` | $17,977 | $8,550 / $8,596 | $8,784 / $8,831 | −$8,550 | −$5,069 | 33.9 % | 0.0 % | 46.7 % | $209,917 / $87,345 |
| `C24/C+/pair D+F2×G+F2` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 22.2 % | 0.0 % | 50.1 % | $88,220 / $117,486 |
| `C24/C/pair DF2×GF3` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 18.0 % | 0.0 % | 57.6 % | $110,565 / $74,633 |
| `C24/C+/pair D+F2×G+F1` | $18,641 | $11,619 / $11,663 | $11,619 / $11,663 | −$11,619 | −$6,306 | 30.9 % | 0.0 % | 49.7 % | $26,066 / $178,523 |

### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses

| Label | Conf. median / p10 / robust | Conf. p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Sel. robust / p90 DD | 10 bps net / DD | 20 bps net / DD | 14 % interest | +25 bps slippage | Next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF2×GF1` | $198,041 / $162,027 / $180,034 | $30,096 / $33,105 | $34,164 / $46,496 | 2.3 % (1.2 %–4.4 %) | $177,068 / $31,612 | $268,988 / $18,739 | $258,819 / $18,935 | $268,540 | $261,757 / $18,929 | $271,966 / $18,896 |
| `C24/C/pair DF2×GF2` | $192,143 / $171,897 / $182,020 | $22,616 / $24,881 | $25,641 / $36,577 | 0.3 % (0.1 %–1.5 %) | $179,056 / $23,275 | $191,499 / $18,739 | $185,481 / $18,935 | $188,850 | $187,119 / $18,928 | $192,939 / $18,641 |
| `C24/C/pair DF2×GF3` | $183,971 / $168,294 / $176,132 | $22,220 / $23,624 | $25,141 / $44,978 | 0.5 % (0.1 %–1.9 %) | $177,259 / $21,996 | $183,442 / $18,739 | $177,850 / $18,935 | $182,067 | $179,150 / $18,928 | $185,282 / $18,825 |
| `C24/C+/pair D+F1×G+F2` | $177,478 / $127,413 / $152,446 | $33,437 / $37,022 | $37,763 / $45,765 | 8.1 % (5.8 %–11.2 %) | $151,986 / $33,763 | $293,223 / $18,076 | $283,184 / $18,274 | $289,596 | $288,864 / $18,267 | $297,580 / $17,977 |
| `C24/C+/pair D+F2×G+F2` | $191,031 / $168,719 / $179,875 | $28,910 / $31,391 | $31,673 / $40,943 | 0.8 % (0.3 %–2.3 %) | $181,759 / $24,748 | $203,727 / $18,739 | $197,687 / $18,935 | $201,499 | $199,347 / $18,928 | $205,177 / $18,641 |
| `C24/C/pair DF2×GF3` | $183,971 / $168,294 / $176,132 | $22,220 / $23,624 | $25,141 / $44,978 | 0.5 % (0.1 %–1.9 %) | $177,259 / $21,996 | $183,442 / $18,739 | $177,850 / $18,935 | $182,067 | $179,150 / $18,928 | $185,282 / $18,825 |
| `C24/C+/pair D+F2×G+F1` | $169,474 / $142,011 / $155,742 | $21,388 / $23,554 | $24,341 / $35,824 | 0.3 % (0.1 %–1.5 %) | $156,002 / $20,961 | $203,007 / $18,739 | $197,763 / $18,935 | $199,728 | $199,738 / $18,928 | $204,529 / $18,641 |

### Causal removals (development centre; the other book switched off)

| Label | Without D1: net / DD | Without Growth: net / DD | Participation (funded principal-days share) |
|---|---:|---:|---:|
| `C24/C/pair DF2×GF1` | $161,457 / $17,744 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/C/pair DF2×GF2` | $135,665 / $18,071 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/C/pair DF2×GF3` | $102,167 / $17,744 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/C+/pair D+F1×G+F2` | $145,002 / $17,451 | $270,780 / $17,595 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/C+/pair D+F2×G+F2` | $145,002 / $17,451 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/C/pair DF2×GF3` | $102,167 / $17,744 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |
| `C24/C+/pair D+F2×G+F1` | $178,523 / $16,155 | $175,537 / $18,641 | {"D1:GDX":"disabled","D1:VGT":"funded","G:GDX":"disabled","G:VGT":"funded"} |

### Annual results (development centre; validation years from the FULL run)

| Label | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF2×GF1` | $81,087 | $6,393 | −$4,746 | $0 | $124,472 | $3,075 | $3,823 | $31,636 | $27,295 | $3,372 | $1,839 |
| `C24/C/pair DF2×GF2` | $1,055 | $6,393 | −$4,746 | $0 | $111,654 | $3,075 | $29,537 | $19,205 | $27,295 | $0 | −$2,747 |
| `C24/C/pair DF2×GF3` | $1,055 | $6,393 | −$4,746 | $0 | $115,179 | $3,075 | $5,311 | $31,636 | $27,295 | $0 | −$2,747 |
| `C24/C+/pair D+F1×G+F2` | $9,025 | $13,629 | $15,791 | $1,886 | $139,110 | −$152 | $41,244 | $32,980 | $43,750 | $0 | −$15,255 |
| `C24/C+/pair D+F2×G+F2` | $1,055 | $6,393 | −$4,746 | $0 | $111,636 | $3,075 | $28,578 | $32,420 | $27,295 | $0 | −$2,747 |
| `C24/C/pair DF2×GF3` | $1,055 | $6,393 | −$4,746 | $0 | $115,179 | $3,075 | $5,311 | $31,636 | $27,295 | $0 | −$2,747 |
| `C24/C+/pair D+F2×G+F1` | $1,055 | $6,393 | −$4,746 | $0 | $109,667 | $3,075 | $29,013 | $35,342 | $24,789 | $0 | −$2,747 |

### Parameter vectors

- `C24/C/pair DF2×GF1` — cell `C.B1.h1.s1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 20, recentLowLookbackBars 10, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 27, eligibilityMinimumAdvancePercent 5.6, drawdownRecoveryGateEnabled false, trailingStopPercent 3.5, maximumHoldEnabled true, maximumHoldDays 12, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 14, initialStopAtrMultiple 3.3, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 122, classicPullbackPercent 3, classicReboundPercent 1.83
- `C24/C/pair DF2×GF2` — cell `C.B1.h2.s1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.4, recentLowLookbackBars 94, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 23, eligibilityMinimumAdvancePercent 9, drawdownRecoveryGateEnabled false, trailingStopPercent 6.1, maximumHoldEnabled true, maximumHoldDays 29, intradayLossBufferEnabled true, intradayLossBufferPercent 5.9, initialStopEnabled true, initialStopAtrSessions 58, initialStopAtrMultiple 3.4, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 63, classicPullbackPercent 4.6, classicReboundPercent 2.62
- `C24/C/pair DF2×GF3` — cell `C.B1.h1.s1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.5, recentLowLookbackBars 152, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 28, eligibilityMinimumAdvancePercent 9.5, drawdownRecoveryGateEnabled false, trailingStopPercent 4.7, maximumHoldEnabled true, maximumHoldDays 11, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 14, initialStopAtrMultiple 3.7, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 135, classicPullbackPercent 3, classicReboundPercent 1.56
- `C24/C+/pair D+F1×G+F2` — cell `C.D1.h2.s1`
  - D1·GDX: targetPercentChange 278, trailingBuyPercentage 6, trailingStopPercentage 66, maximumHoldDays 5, tickWindowSize 246, intradayLossBuffer 35, pullback 77, continuationWindow 82; controls {"d":219,"hx":59,"g":47,"k":2,"r":1000,"c":83}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.9, recentLowLookbackBars 153, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 27, eligibilityMinimumAdvancePercent 7.8, drawdownRecoveryGateEnabled false, trailingStopPercent 6.1, maximumHoldEnabled true, maximumHoldDays 16, intradayLossBufferEnabled true, intradayLossBufferPercent 2.7, initialStopEnabled true, initialStopAtrSessions 48, initialStopAtrMultiple 3.8, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 98, classicPullbackPercent 3.3, classicReboundPercent 3.57
- `C24/C+/pair D+F2×G+F2` — cell `C.B1.h2.s1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3.9, recentLowLookbackBars 153, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 27, eligibilityMinimumAdvancePercent 7.8, drawdownRecoveryGateEnabled false, trailingStopPercent 6.1, maximumHoldEnabled true, maximumHoldDays 16, intradayLossBufferEnabled true, intradayLossBufferPercent 2.7, initialStopEnabled true, initialStopAtrSessions 48, initialStopAtrMultiple 3.8, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 98, classicPullbackPercent 3.3, classicReboundPercent 3.57
- `C24/C/pair DF2×GF3` — cell `C.B1.h1.s1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 4.5, recentLowLookbackBars 152, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 28, eligibilityMinimumAdvancePercent 9.5, drawdownRecoveryGateEnabled false, trailingStopPercent 4.7, maximumHoldEnabled true, maximumHoldDays 11, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 14, initialStopAtrMultiple 3.7, retentionEnabled false, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 135, classicPullbackPercent 3, classicReboundPercent 1.56
- `C24/C+/pair D+F2×G+F1` — cell `C.B1.h1.s1`
  - D1·GDX: targetPercentChange 265, trailingBuyPercentage 8, trailingStopPercentage 62, maximumHoldDays 25, tickWindowSize 250, intradayLossBuffer 37, pullback 199, continuationWindow 167; controls {"d":173,"k":1,"r":780,"c":188}; D1 arming from the first day: false
  - Growth·GDX: entryMethod rise_from_recent_low, advanceFromRecentLowPercent 3, recentLowLookbackBars 59, trendFilterEnabled false, eligibilityEnabled true, eligibilityPolicy minimum_strength, eligibilityMaxAgeSessions 17, eligibilityMinimumAdvancePercent 8.4, drawdownRecoveryGateEnabled false, trailingStopPercent 6.9, maximumHoldEnabled true, maximumHoldDays 28, intradayLossBufferEnabled false, initialStopEnabled true, initialStopAtrSessions 40, initialStopAtrMultiple 4.1, retentionEnabled true, retentionSellPercent 77, retentionSmaSessions 30, retentionClosesBelow 5, continuationEnabled true, continuationMethod classic_d1, continuationWindowSessions 38, classicPullbackPercent 9.9, classicReboundPercent 0.37

## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)

Basis: each subject’s continuous run 2016-01-04 → 2026-10-30 on FULL with the 2024-12-31 boundary, the canonical CPU engine in detail mode (gate E4: CPU = GPU on every record field); giveback = the lot’s best mark − its final net; worst = the lot’s lowest mark (realized fills + remainder, after costs and interest); refusals with their occupant; margin rows are ILLUSTRATIVE (the lot fully financed; maintenance m of market value; no broker’s house rules).

| Subject | Roles | Net 2016–2026 | Lots | Win rate | Median / max days | Occupancy (sessions) | Total / max giveback | Worst marked lot | Refused decisions by occupant | Illustrative cash at the worst mark (25 / 30 / 50 % maintenance) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/C/pair DF3×GF1` | C19 primary C | $129,043.24 | 112 | 47.3 % | 12 / 133 | 65.7 % (1,788 / 2,723) | $607,704 / $22,251 | −$39,528 | D1 refused (slot occupied) ← occupant Growth: 9; Growth refused (slot occupied) ← occupant D1: 20 | $54,646 / $57,669 / $69,764 |
| `C21/C/pair DF1×GF1` | C21 primary C | $296,138.24 | 80 | 53.2 % | 10 / 108 | 38.1 % (1,038 / 2,723) | $522,078 / $13,200 | −$16,797 | Growth refused (slot occupied) ← occupant D1: 13; D1 refused (slot occupied) ← occupant Growth: 6 | $37,598 / $41,758 / $58,398 |
| `C23/C/pair DF1×GF1` | C23 primary C | $292,625.57 | 70 | 48.6 % | 8 / 108 | 29.9 % (813 / 2,723) | $443,581 / $10,783 | −$9,554 | D1 refused (slot occupied) ← occupant Growth: 3; Growth refused (slot occupied) ← occupant D1: 7 | $32,166 / $36,688 / $54,777 |
| `C24/C/pair DF2×GF1` | C24 primary C | $278,245.43 | 62 | 82.3 % | 12 / 62 | 21.7 % (591 / 2,723) | $343,039 / $18,777 | −$17,420 | Growth refused (slot occupied) ← occupant D1: 5; D1 refused (slot occupied) ← occupant Growth: 1 | $38,065 / $42,194 / $58,710 |
| `C24/C/pair DF2×GF2` | C24 role C/robust-profit | $190,721.39 | 35 | 80.0 % | 25 / 62 | 20.7 % (563 / 2,723) | $273,915 / $18,777 | −$17,420 | D1 refused (slot occupied) ← occupant Growth: 3; Growth refused (slot occupied) ← occupant D1: 2 | $38,065 / $42,194 / $58,710 |
| `C24/C/pair DF2×GF3` | C24 role C/balanced; C24 role C/lower-drawdown; C24 role C+/balanced | $182,450.58 | 33 | 78.8 % | 20 / 62 | 16.0 % (436 / 2,723) | $241,650 / $18,777 | −$17,420 | D1 refused (slot occupied) ← occupant Growth: 2; Growth refused (slot occupied) ← occupant D1: 2 | $38,065 / $42,194 / $58,710 |
| `C24/C+/pair D+F1×G+F2` | C24 primary C+ | $282,007.58 | 51 | 60.8 % | 10 / 108 | 28.4 % (774 / 2,723) | $354,806 / $25,627 | −$19,102 | D1 refused (slot occupied) ← occupant Growth: 3; Growth refused (slot occupied) ← occupant D1: 7 | $39,326 / $43,371 / $59,551 |
| `C24/C+/pair D+F2×G+F2` | C24 role C+/robust-profit | $202,959.79 | 35 | 80.0 % | 21 / 62 | 19.4 % (529 / 2,723) | $271,313 / $18,777 | −$17,420 | D1 refused (slot occupied) ← occupant Growth: 3; Growth refused (slot occupied) ← occupant D1: 4 | $38,065 / $42,194 / $58,710 |
| `C24/C+/pair D+F2×G+F1` | C24 role C+/lower-drawdown | $201,841.79 | 31 | 80.7 % | 27 / 127 | 26.8 % (729 / 2,723) | $246,411 / $18,777 | −$17,420 | D1 refused (slot occupied) ← occupant Growth: 8 | $38,065 / $42,194 / $58,710 |

Worst closed trades of each subject (net after costs and interest):

- `C19/C/pair DF3×GF1`: D1·GDX 2020-03-10 → 2020-03-23 (maximum hold, 13 d) −$19,933.47; Growth·GDX 2026-03-17 → 2026-03-19 (initial stop gap, 2 d) −$14,823.19; Growth·GDX 2026-09-03 → 2026-09-14 (initial stop gap, 11 d) −$7,129.83; Growth·GDX 2022-06-27 → 2022-06-30 (initial stop, 3 d) −$6,661.19; D1·GDX 2023-08-04 → 2023-08-17 (maximum hold, 13 d) −$6,495.18
  - largest giveback: D1·GDX 2020-03-10 → 2020-03-23 best mark $2,317.32, final −$19,933.47 (giveback $22,250.79)
- `C21/C/pair DF1×GF1`: Growth·GDX 2022-06-03 → 2022-06-29 (maximum hold, 26 d) −$12,217.86; Growth·GDX 2022-04-25 → 2022-05-23 (maximum hold, 28 d) −$8,713.01; Growth·GDX 2024-01-16 → 2024-02-12 (maximum hold, 27 d) −$8,711.39; D1·GDX 2026-06-05 → 2026-06-10 (maximum hold, 5 d) −$8,300.58; D1·GDX 2026-06-22 → 2026-06-29 (maximum hold, 7 d) −$7,143.46
  - largest giveback: Growth·GDX 2022-06-03 → 2022-06-29 best mark $982.32, final −$12,217.86 (giveback $13,200.17)
  - open at 2026-10-30: D1·GDX from 2026-10-29 marked −$5,484.04
- `C23/C/pair DF1×GF1`: D1·GDX 2026-06-02 → 2026-06-08 (maximum hold, 6 d) −$8,251.09; D1·GDX 2026-06-22 → 2026-06-29 (maximum hold, 7 d) −$7,143.46; D1·GDX 2017-02-28 → 2017-03-06 (maximum hold, 6 d) −$5,068.73; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71; D1·GDX 2021-02-23 → 2021-03-01 (maximum hold, 6 d) −$4,390.39
  - largest giveback: D1·GDX 2026-05-05 → 2026-05-15 best mark $13,195.07, final $2,412.28 (giveback $10,782.79)
- `C24/C/pair DF2×GF1`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; Growth·GDX 2026-09-10 → 2026-09-22 (maximum hold, 12 d) −$3,107.55; Growth·GDX 2020-08-07 → 2020-08-19 (maximum hold, 12 d) −$3,026.69
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)
- `C24/C/pair DF2×GF2`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; Growth·GDX 2023-05-05 → 2023-05-18 (initial stop gap, 13 d) −$9,545.61; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; Growth·GDX 2020-07-29 → 2020-08-27 (maximum hold, 29 d) −$3,647.14
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)
- `C24/C/pair DF2×GF3`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; Growth·GDX 2022-10-07 → 2022-10-18 (maximum hold, 11 d) −$5,464.41; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)
- `C24/C+/pair D+F1×G+F2`: D1·GDX 2026-05-19 → 2026-07-17 (maximum hold, 59 d) −$19,101.77; D1·GDX 2017-02-28 → 2017-03-06 (maximum hold, 6 d) −$5,068.73; Growth·GDX 2023-05-01 → 2023-05-17 (maximum hold, 16 d) −$4,588.05; D1·GDX 2022-04-25 → 2022-05-02 (maximum hold, 7 d) −$4,572.71; D1·GDX 2022-06-24 → 2022-06-30 (maximum hold, 6 d) −$2,800.71
  - largest giveback: D1·GDX 2026-05-19 → 2026-07-17 best mark $6,525.03, final −$19,101.77 (giveback $25,626.80)
- `C24/C+/pair D+F2×G+F2`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; Growth·GDX 2023-05-01 → 2023-05-17 (maximum hold, 16 d) −$4,588.05; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)
- `C24/C+/pair D+F2×G+F1`: D1·GDX 2026-06-16 → 2026-07-13 (maximum hold, 27 d) −$14,732.44; D1·GDX 2021-02-04 → 2021-03-01 (maximum hold, 25 d) −$6,305.72; D1·GDX 2018-08-15 → 2018-09-10 (maximum hold, 26 d) −$4,746.46; D1·GDX 2022-05-09 → 2022-06-03 (maximum hold, 25 d) −$2,613.52; D1·GDX 2017-04-24 → 2017-05-19 (maximum hold, 25 d) −$2,398.22
  - largest giveback: D1·GDX 2026-06-16 → 2026-07-13 best mark $4,044.46, final −$14,732.44 (giveback $18,776.90)

## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)

Basis: loss of a $100,000 lot bought at each daily close and marked at the daily lows of the next H calendar days (H = the book’s maximum hold; family C: a declared 60-day bound; D: the extended bound); for a book with a protective stop, the lot exits at the stop or — gapped through — at the open, and the worst excess of the gap fill below the stop is reported; no interest or costs; DAILY resolution (labelled). Reference: pre-2016 GDX daily (Yahoo Finance, 2006-05-22 → 2015-12-31, split-adjusted; disjoint from every door) and, labelled in-sample stress, 2016-01-04 → 2024-12-31 (D24).

| Subject | D1 structure | Hold window (days) | Protective stop | Pre-2016 worst (date) | Pre-2016 p5 | Pre-2016 share beyond $35k | Worst gap through the stop | 2016–2024 worst (date) | 2016–2024 share beyond $35k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `C19/C/pair DF3×GF1` | A1 | 13 (calendar maximum hold) | none (family A) | −$42,205 (2008-10-14) | −$15,427 | 0.2 % | — | −$45,723 (2020-03-05) | 0.4 % |
| `C21/C/pair DF1×GF1` | A0 | 5 (calendar maximum hold) | none (family A) | −$34,560 (2008-10-20) | −$9,235 | 0.0 % | — | −$39,934 (2020-03-10) | 0.1 % |
| `C23/C/pair DF1×GF1` | B1 | 5 (calendar maximum hold) | 13.4 % | −$15,587 (2014-10-28) | −$9,235 | 0.0 % | 2.2 % below the stop (2014-10-31) | −$16,309 (2020-03-10) | 0.0 % |
| `C24/C/pair DF2×GF1` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/C/pair DF2×GF2` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/C/pair DF2×GF3` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/C+/pair D+F1×G+F2` | D1 | 59 (adaptive hold: the extended bound) | 21.9 % | −$25,076 (2014-09-18) | −$21,900 | 0.0 % | 3.2 % below the stop (2014-10-31) | −$25,958 (2020-02-24) | 0.0 % |
| `C24/C+/pair D+F2×G+F2` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |
| `C24/C+/pair D+F2×G+F1` | B1 | 25 (calendar maximum hold) | 17.3 % | −$21,311 (2013-03-21) | −$17,300 | 0.0 % | 4.0 % below the stop (2013-04-15) | −$23,290 (2020-02-25) | 0.0 % |

## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)

| Finalist | Family | Draws | Median / p10 net | p90 / p95 / worst DD | Worst-10 % mean DD | Breaches (share; Wilson 95 %) |
|---|---:|---:|---:|---:|---:|---:|
| `C24/C/pair DF2×GF1` | small | 128 | $222,522 / $179,423 | $25,315 / $27,576 / $31,985 | $28,046 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/C/pair DF2×GF1` | wide | 128 | $172,313 / $124,181 | $36,858 / $41,677 / $49,321 | $41,894 | 15 (11.7 %; 7.2 %–18.4 %) |
| `C24/C/pair DF2×GF2` | small | 128 | $199,502 / $189,033 | $21,642 / $23,039 / $26,347 | $23,544 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/C/pair DF2×GF2` | wide | 128 | $171,647 / $141,094 | $26,643 / $30,117 / $63,297 | $35,975 | 5 (3.9 %; 1.7 %–8.8 %) |
| `C24/C/pair DF2×GF3` | small | 128 | $187,601 / $179,502 | $19,410 / $19,410 / $20,553 | $19,660 | 0 (0.0 %; 0.0 %–2.9 %) |
| `C24/C/pair DF2×GF3` | wide | 128 | $167,519 / $136,780 | $29,368 / $32,815 / $42,029 | $34,099 | 4 (3.1 %; 1.2 %–7.8 %) |

## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)

| Cutoff | Primary | Training net | Open-lot share | Largest open lot at the cutoff | Its outcome on the next slice | Training lot MAE median / p90 / worst | Next-slice MAE median / worst |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | `C19/C/pair DF3×GF1` | $120,834 | 7.6 % | Growth·GDX from 2019-11-27: unrealized $9,154 (market value 1.102× the lot's principal) | trend exit 2020-02-18: lot net $9,154 at the cutoff (partial exits included) → final $5,373; change on the slice −$3,780 | −$1,539 / −$4,308 / −$5,305 | −$3,543 / −$39,528 |
| C21 | `C21/C/pair DF1×GF1` | $269,886 | 0.0 % | none open | none open | −$1,142 / −$3,992 / −$8,131 | −$2,780 / −$16,797 |
| C23 | `C23/C/pair DF1×GF1` | $260,677 | 0.0 % | none open | none open | −$2,069 / −$5,045 / −$8,985 | −$1,650 / −$4,860 |
| C24 | `C24/C/pair DF2×GF1` | $273,035 | 0.0 % | none open | none open | −$2,267 / −$8,492 / −$11,619 | −$1,879 / −$17,420 |

