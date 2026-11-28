# Stage B — generated tables (tools/vg-l0-risk-envelope-stage-b/analyze.ts; from the sealed records only)

**Precommitted outcome label: P3 non-inferior and superior** — non-inferiority and superiority at C21 and C24

## 1. The paired lane statistic D = V(EXP-30) − V(CTRL) (PROTOCOL.md §1)

| Cutoff | Role | Pairs | Mean D | L90 (stratified bootstrap) | 80 % interval | NI (L90 > −$5,000) | Superiority (mean > $2,500 ∧ L90 > 0) | D > 0 / = 0 / < 0 | V = $0 lanes (CTRL / EXP-30) |
|---|---|---:|---:|---:|---|---|---|---|---|
| C19 | secondary | 32 | −$750 | −$2,759 | −$2,759 … $1,230 | yes | no | 14 / 0 / 18 | 0 / 0 |
| C21 | primary | 32 | $10,729 | $6,276 | $6,276 … $15,426 | yes | yes | 26 / 0 / 6 | 0 / 0 |
| C24 | primary | 32 | $16,387 | $9,892 | $9,892 … $22,780 | yes | yes | 23 / 0 / 9 | 0 / 0 |

Sensitivity (report-only):

| Cutoff | Unstratified L90 | t L90 | Mean D GA0.VA0 | Mean D GB0.VD1 | Without V = $0 pairs: n / mean / L90 |
|---|---:|---:|---:|---:|---|
| C19 | −$2,747 | −$2,829 | $93 | −$1,592 | 32 / −$750 / −$2,750 |
| C21 | $6,181 | $5,842 | $15,764 | $5,695 | 32 / $10,729 / $6,290 |
| C24 | $9,915 | $9,691 | $17,492 | $15,282 | 32 / $16,387 / $9,893 |

## 2. Per-arm distributions of the lane value V and of the representatives

| Cutoff | Arm | V min | V median | V mean | V max | Lanes w/o qualified | Qualified / shortlisted | Rep. centre DD median | Rep. PL (liq) median | Rep. BD (liq) median | Rep. conf. p90 DD median | Rep. conf. p90 BD (liq) median | Rep. occupancy median |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | $87,791 | $95,935 | $97,030 | $127,622 | 0 | 94 / 96 | $19,981 | $3,805 | $4,930 | $27,740 | $10,599 | 84.5 % |
| C19 | EXP30 | $82,515 | $95,008 | $96,280 | $111,862 | 0 | 94 / 96 | $23,039 | $2,960 | $3,805 | $29,152 | $13,248 | 84.0 % |
| C21 | CTRL | $134,402 | $202,047 | $201,227 | $231,149 | 0 | 94 / 96 | $21,573 | $6,771 | $6,789 | $29,135 | $19,047 | 75.6 % |
| C21 | EXP30 | $194,613 | $212,014 | $211,957 | $247,284 | 0 | 94 / 96 | $23,837 | $5,638 | $6,073 | $34,142 | $22,703 | 78.5 % |
| C24 | CTRL | $114,671 | $178,748 | $177,117 | $227,874 | 0 | 96 / 96 | $21,486 | $9,329 | $12,026 | $30,971 | $21,983 | 57.3 % |
| C24 | EXP30 | $137,647 | $191,582 | $193,504 | $248,578 | 0 | 92 / 96 | $23,512 | $9,355 | $12,457 | $33,538 | $23,915 | 65.4 % |

## 3. Paired risk differences of the representatives (EXP-30 − CTRL; pairs where both lanes have one; report-only)

| Cutoff | Metric | n | CTRL mean | EXP-30 mean | Mean diff | 80 % interval |
|---|---|---:|---:|---:|---:|---|
| C19 | centreDd | 32 | 21,020 | 22,888 | 1,868 | 507 … 3,195 |
| C19 | plLiq | 32 | 4,098 | 3,951 | -146 | -1,012 … 725 |
| C19 | plMarked | 32 | 4,051 | 3,903 | -148 | -1,012 … 731 |
| C19 | bdLiq | 32 | 4,586 | 4,402 | -184 | -1,141 … 772 |
| C19 | bdMarked | 32 | 4,538 | 4,354 | -184 | -1,140 … 781 |
| C19 | confirmP10Net | 32 | 54,272 | 57,499 | 3,227 | -2,550 … 8,944 |
| C19 | confirmP90Dd | 32 | 26,468 | 28,654 | 2,186 | 618 … 3,722 |
| C19 | confirmP95Dd | 32 | 28,838 | 31,867 | 3,029 | 808 … 5,328 |
| C19 | confirmWorstDd | 32 | 40,703 | 44,402 | 3,699 | -534 … 7,982 |
| C19 | confirmWorst10Dd | 32 | 30,100 | 33,138 | 3,038 | 774 … 5,379 |
| C19 | confirmP90PlLiq | 32 | 9,916 | 9,545 | -371 | -1,630 … 920 |
| C19 | confirmWorstPlLiq | 32 | 14,178 | 14,710 | 531 | -1,152 … 2,229 |
| C19 | confirmP90BdLiq | 32 | 13,153 | 13,684 | 531 | -1,455 … 2,526 |
| C19 | confirmWorstBdLiq | 32 | 30,026 | 33,521 | 3,495 | -2,131 … 9,171 |
| C19 | confirmP90BdMarked | 32 | 13,106 | 13,637 | 531 | -1,448 … 2,528 |
| C19 | selectRobust | 32 | 67,797 | 70,368 | 2,571 | -1,471 … 6,575 |
| C19 | selectP90Dd | 32 | 26,391 | 28,615 | 2,225 | 601 … 3,822 |
| C19 | occupancy | 32 | 84.3 % | 83.7 % | -0.6 % | -2.2 % … 1.0 % |
| C19 | lots | 32 | 6 | 7 | 0 | -1 … 2 |
| C21 | centreDd | 32 | 21,988 | 23,577 | 1,589 | 110 … 3,076 |
| C21 | plLiq | 32 | 6,445 | 6,739 | 294 | -411 … 1,047 |
| C21 | plMarked | 32 | 6,404 | 6,692 | 288 | -421 … 1,041 |
| C21 | bdLiq | 32 | 7,008 | 7,126 | 118 | -614 … 860 |
| C21 | bdMarked | 32 | 6,961 | 7,079 | 118 | -619 … 867 |
| C21 | confirmP10Net | 32 | 123,781 | 127,321 | 3,540 | -4,100 … 11,121 |
| C21 | confirmP90Dd | 32 | 28,065 | 32,627 | 4,562 | 3,445 … 5,686 |
| C21 | confirmP95Dd | 32 | 30,727 | 34,712 | 3,985 | 2,264 … 5,688 |
| C21 | confirmWorstDd | 32 | 37,964 | 39,983 | 2,020 | -77 … 4,140 |
| C21 | confirmWorst10Dd | 32 | 31,203 | 35,013 | 3,810 | 2,169 … 5,446 |
| C21 | confirmP90PlLiq | 32 | 12,533 | 15,737 | 3,204 | 1,749 … 4,651 |
| C21 | confirmWorstPlLiq | 32 | 17,581 | 19,277 | 1,696 | 128 … 3,228 |
| C21 | confirmP90BdLiq | 32 | 17,917 | 20,241 | 2,324 | 694 … 3,928 |
| C21 | confirmWorstBdLiq | 32 | 28,510 | 28,850 | 340 | -2,120 … 2,757 |
| C21 | confirmP90BdMarked | 32 | 17,871 | 20,197 | 2,325 | 681 … 3,936 |
| C21 | selectRobust | 32 | 141,182 | 147,345 | 6,163 | -146 … 12,417 |
| C21 | selectP90Dd | 32 | 27,992 | 32,671 | 4,679 | 3,622 … 5,748 |
| C21 | occupancy | 32 | 75.2 % | 77.5 % | 2.3 % | -0.5 % … 5.0 % |
| C21 | lots | 32 | 14 | 12 | -2 | -4 … -1 |
| C24 | centreDd | 32 | 21,551 | 24,514 | 2,963 | 1,798 … 4,149 |
| C24 | plLiq | 32 | 9,474 | 10,215 | 741 | -96 … 1,589 |
| C24 | plMarked | 32 | 9,428 | 10,178 | 749 | -78 … 1,595 |
| C24 | bdLiq | 32 | 12,025 | 12,617 | 592 | -604 … 1,779 |
| C24 | bdMarked | 32 | 11,978 | 12,571 | 593 | -608 … 1,796 |
| C24 | confirmP10Net | 32 | 95,155 | 105,619 | 10,464 | 2,646 … 18,251 |
| C24 | confirmP90Dd | 32 | 29,806 | 33,374 | 3,568 | 2,449 … 4,704 |
| C24 | confirmP95Dd | 32 | 32,303 | 36,207 | 3,904 | 2,527 … 5,355 |
| C24 | confirmWorstDd | 32 | 43,231 | 46,521 | 3,290 | 1,467 … 5,138 |
| C24 | confirmWorst10Dd | 32 | 33,327 | 36,972 | 3,645 | 2,359 … 4,985 |
| C24 | confirmP90PlLiq | 32 | 13,443 | 14,400 | 957 | -165 … 2,105 |
| C24 | confirmWorstPlLiq | 32 | 16,849 | 19,258 | 2,409 | 465 … 4,441 |
| C24 | confirmP90BdLiq | 32 | 21,497 | 22,572 | 1,075 | -131 … 2,299 |
| C24 | confirmWorstBdLiq | 32 | 33,849 | 35,143 | 1,294 | -707 … 3,299 |
| C24 | confirmP90BdMarked | 32 | 21,451 | 22,526 | 1,076 | -126 … 2,294 |
| C24 | selectRobust | 32 | 115,195 | 126,170 | 10,975 | 4,329 … 17,537 |
| C24 | selectP90Dd | 32 | 29,735 | 33,283 | 3,548 | 2,387 … 4,712 |
| C24 | occupancy | 32 | 53.8 % | 60.3 % | 6.5 % | 1.4 % … 11.4 % |
| C24 | lots | 32 | 29 | 24 | -5 | -8 … -3 |

## 4. Pooled-shortlist statistic (the pilot’s Δ; $2,500 margin; reported beside D, never in its place)

| Cutoff | CTRL P0 primary | centre net | EXP-30 P0 primary | centre net | Δ | Label | CTRL RA1 | EXP-30 RA1 | EXP-30 RA1-adapted (descriptive) | RA1 = adapted |
|---|---|---:|---|---:|---:|---|---|---|---|---|
| C19 | CTRL C19/broad/GA0.VA0/R15#1 profit | $127,622 | EXP30 C19/broad/GB0.VD1/R10#1 profit | $111,862 | −$15,760 | worse | CTRL C19/broad/GA0.VA0/R17#1 profit | EXP30 C19/broad/GB0.VD1/R13#2 robust | EXP30 C19/broad/GB0.VD1/R13#2 robust | true |
| C21 | CTRL C21/broad/GB0.VD1/R12#1 profit | $231,149 | EXP30 C21/broad/GA0.VA0/R13#1 profit | $247,284 | $16,135 | better | CTRL C21/broad/GB0.VD1/R5#1 profit | EXP30 C21/broad/GB0.VD1/R13#1 profit | EXP30 C21/broad/GB0.VD1/R13#1 profit | true |
| C24 | CTRL C24/broad/GB0.VD1/R18#1 profit | $227,874 | EXP30 C24/broad/GA0.VA0/R5#1 profit | $248,578 | $20,703 | better | CTRL C24/broad/GB0.VD1/R18#1 profit | EXP30 C24/broad/GA0.VA0/R5#1 profit | EXP30 C24/broad/GA0.VA0/R5#1 profit | true |

## 5. Common-candidate counterfactual (every union member under both policies)

| Cutoff | Members | Both qualify | CTRL-only | EXP-30-only | Neither | Centre DD in ($35k, $40k] | … of which offset by PL / BD |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | 192 | 183 | 0 | 6 | 3 | 0 | 0 |
| C21 | 192 | 160 | 0 | 30 | 2 | 6 | 0 |
| C24 | 192 | 152 | 0 | 36 | 4 | 9 | 1 |

Failure reasons (counts over union members; a member can have several):

- C19 CTRL: Q3 p90 DD > limit 8; Q4 p10 ≤ 0 1
- C19 EXP30: Q3 p90 BD > limit 2; Q4 p10 ≤ 0 1
- C21 CTRL: Q3 p90 DD > limit 32; Q5 10 bps DD > limit 7; Q2 DD > limit 6
- C21 EXP30: Q3 p90 DD > limit 2
- C24 CTRL: Q3 p90 DD > limit 40; Q2 DD > limit 9; Q5 10 bps DD > limit 9
- C24 EXP30: Q3 p90 DD > limit 4; Q3 p90 PL > limit 1; Q3 p90 BD > limit 1

## 6. Retrospective next intervals (previously inspected history; descriptive)

| Cutoff → interval | T1: CTRL P0 interval net / DD | EXP-30 P0 interval net / DD | T1 holds (DD ≤ CTRL + $5,000) | T2: mean paired interval DD diff | U90 | T2 holds (U90 < $5,000) | T3: mean paired interval net diff | 80 % interval |
|---|---|---|---|---:|---:|---|---:|---|
| C19 → 2020-01-02…2021-12-31 | −$23,584 / $63,636 | $122,358 / $37,790 | yes | −$516 | $3,576 | yes | $9,329 | −$3,153 … $21,592 |
| C21 → 2022-01-03…2023-12-29 | −$11,831 / $44,109 | −$39,808 / $74,337 | no | $2,933 | $7,113 | no | −$4,048 | −$10,556 … $2,542 |
| C24 → 2025-01-02…2026-10-30 | $36,167 / $12,792 | $58,819 / $25,520 | no | $7,180 | $9,270 | no | −$12,381 | −$17,955 … −$6,793 |

## 7. Compute accounting (requested includes archive hits)

| Cutoff | E2 identical | Repro requested | Search requested (CTRL / EXP-30) | Fresh | Archive hits | Search wall | Qualification members / requested | Interval requested |
|---|---|---:|---|---:|---:|---:|---|---:|
| C19 | true | 66,697 | 1,168,140 (571,767 / 596,373) | 1,120,604 | 46,923 | 10.8 min | 194 / 126,682 | 17,688 |
| C21 | true | 71,314 | 1,184,121 (602,894 / 581,227) | 1,142,375 | 41,164 | 14.7 min | 194 / 126,682 | 17,424 |
| C24 | true | 62,488 | 977,430 (458,526 / 518,904) | 948,677 | 28,194 | 18.4 min | 194 / 126,682 | 17,424 |
