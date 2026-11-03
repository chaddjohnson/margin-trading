# Top candidate phenotypes per symbol

Experiment `main`, seed `20261015`. Each symbol's shortlist comes from its **final development run on 2014-01-01 to 2023-12-31 only** (4,096 sobol candidates, then 2 NSGA-II runs), ranked by the pre-declared policy in [OPTIMIZER_DESIGN.md](OPTIMIZER_DESIGN.md#selection-policy). N = 10.

**How to read this**

- **Rank 1 is the primary configuration**, frozen before any 2024–2026 data was read. Ranks 2–N are alternatives: visible, but not independently validated trading systems, and never promoted on holdout results.
- Every metric here is **development-period performance (2014–2023), in-sample for these candidates**. The years 2019–2023 helped choose them, so they are not fresh out-of-sample evidence for any fixed candidate. Out-of-sample evidence is the walk-forward policy result in [WALK_FORWARD_RESULTS.md](WALK_FORWARD_RESULTS.md), which is for the selection procedure, not for these exact vectors.
- Money is per $100,000 margin-financed trading allocation, net of 11% simple margin interest, with no commissions or spread (as in the original). Max DD is the largest fall of the daily mark-to-market P&L (unrealized losses and accrued interest included) from its running peak; the percentage is of the allocation. It is a strategy-level figure, not an account or portfolio drawdown.
- Merit = lower-quartile net P&L over the candidate and its 14 one-step parameter neighbours (robustness). "Nbr median" = their median. Pareto = front on (net P&L, drawdown) among gated candidates (1 = non-dominated). "+yrs" = share of calendar years with non-negative P&L.
- "diversity relaxed" marks an entry added after the distinct-parameter pass came up short: it trades differently but lies within 4 neighbourhood steps of a higher-ranked entry.
- Trade logs: `results/main/<SYMBOL>/final-2014-2023/rank<k>-<id>-trades.csv`; rank 1 also has an equity curve (`rank1-<id>-equity.csv`). Non-dominated archive: [nondominated_archive.csv](nondominated_archive.csv). Machine-readable: [top_candidates.json](top_candidates.json), [top_candidates.csv](top_candidates.csv).

## All symbols

| Symbol | Group | Status | Distinct feasible | Shortlist | Rank-1 parameters | Rank-1 dev net | Rank-1 dev max DD | Rank-1 trades | Original dev net | Original dev max DD |
|---|---|---|---|---|---|---|---|---|---|---|
| VGT | Technology-heavy / software ETFs | ranked | 122 | 10/10 | dip 2.5%, stop 2.1%, hold 8, lookback 78, material 2.2%, re-entry 4.0%, reset 36.7% | $213,441 | $16,564 | 187 | $117,461 | $23,723 |
| XLK | Technology-heavy / software ETFs | ranked | 114 | 10/10 | dip 10.1%, stop 7.4%, hold 10, lookback 161, material 0.1%, re-entry 0.1%, reset 53.6% | $176,856 | $26,087 | 37 | $92,753 | $24,633 |
| QQQ | Technology-heavy / software ETFs | ranked | 95 | 10/10 | dip 7.3%, stop 6.9%, hold 14, lookback 35, material 0.7%, re-entry 12.5%, reset 54.5% | $208,717 | $18,354 | 34 | $85,932 | $24,060 |
| IGV | Technology-heavy / software ETFs | ranked | 123 | 10/10 | dip 7.8%, stop 4.5%, hold 13, lookback 200, material 4.2%, re-entry 5.1%, reset 90.0% | $162,810 | $23,255 | 69 | $63,718 | $33,062 |
| VOOG | Broad US market / large-cap growth ETFs | ranked | 112 | 10/10 | dip 19.6%, stop 7.4%, hold 9, lookback 101, material 0.9%, re-entry 4.7%, reset 71.2% | $99,973 | $12,961 | 11 | $61,698 | $29,449 |
| VOO | Broad US market / large-cap growth ETFs | ranked | 96 | 10/10 | dip 8.6%, stop 6.3%, hold 10, lookback 202, material 0.4%, re-entry 7.3%, reset 36.4% | $112,169 | $17,777 | 30 | $13,311 | $33,020 |
| SPY | Broad US market / large-cap growth ETFs | ranked | 109 | 10/10 | dip 2.9%, stop 3.6%, hold 10, lookback 228, material 2.1%, re-entry 6.5%, reset 97.3% | $122,563 | $13,182 | 69 | $12,864 | $32,850 |
| SMH | Semiconductor ETFs | ranked | 114 | 10/10 | dip 2.3%, stop 2.1%, hold 14, lookback 178, material 9.0%, re-entry 12.6%, reset 49.8% | $236,931 | $27,883 | 225 | $78,883 | $34,747 |
| SOXX | Semiconductor ETFs | ranked | 120 | 10/10 | dip 3.5%, stop 3.1%, hold 14, lookback 160, material 2.6%, re-entry 8.4%, reset 78.5% | $194,610 | $25,056 | 125 | $104,186 | $31,441 |
| VUG | Diversified growth ETFs | ranked | 102 | 10/10 | dip 4.1%, stop 5.7%, hold 14, lookback 101, material 0.8%, re-entry 3.8%, reset 33.7% | $121,341 | $21,873 | 58 | $36,876 | $35,119 |
| SCHG | Diversified growth ETFs | ranked | 101 | 10/10 | dip 4.7%, stop 3.5%, hold 11, lookback 98, material 1.1%, re-entry 1.8%, reset 61.1% | $144,130 | $21,627 | 67 | $69,657 | $38,804 |
| IWF | Diversified growth ETFs | ranked | 111 | 10/10 | dip 4.9%, stop 3.1%, hold 10, lookback 152, material 2.9%, re-entry 3.6%, reset 74.2% | $148,505 | $16,856 | 83 | $85,220 | $37,771 |
| XLY | Consumer discretionary ETF | ranked | 113 | 10/10 | dip 5.7%, stop 2.1%, hold 4, lookback 209, material 1.6%, re-entry 2.3%, reset 50.1% | $115,734 | $15,294 | 141 | $51,722 | $29,188 |
| IWN | US small-cap value ETF | ranked | 704 | 10/10 | dip 22.5%, stop 2.8%, hold 26, lookback 239, material 0.2%, re-entry 0.1%, reset 59.9% | $121,525 | $13,601 | 24 | -$20,228 | $58,799 |
| NVDA | Individual stocks | ranked | 121 | 10/10 | dip 3.8%, stop 2.1%, hold 11, lookback 80, material 2.7%, re-entry 12.8%, reset 74.5% | $323,009 | $26,765 | 210 | $167,311 | $94,346 |
| AAPL | Individual stocks | ranked | 86 | 10/10 | dip 25.7%, stop 11.9%, hold 1, lookback 247, material 1.6%, re-entry 0.9%, reset 30.2% | $216,009 | $28,752 | 26 | $269,282 | $35,161 |
| MSFT | Individual stocks | ranked | 112 | 10/10 | dip 2.3%, stop 3.2%, hold 22, lookback 89, material 5.7%, re-entry 3.1%, reset 48.0% | $229,490 | $21,047 | 139 | $89,647 | $32,735 |
| AMD | Individual stocks | ranked | 214 | 10/10 | dip 39.8%, stop 2.8%, hold 72, lookback 110, material 1.8%, re-entry 9.4%, reset 37.8% | $191,217 | $14,617 | 35 | $235,525 | $115,828 |
| META | Individual stocks | ranked | 112 | 10/10 | dip 17.1%, stop 2.3%, hold 8, lookback 219, material 3.4%, re-entry 13.6%, reset 17.4% | $180,421 | $18,197 | 84 | $73,766 | $117,725 |
| GOOGL | Individual stocks | ranked | 103 | 10/10 | dip 8.8%, stop 2.5%, hold 8, lookback 199, material 6.2%, re-entry 2.0%, reset 62.1% | $215,236 | $25,628 | 150 | $16,031 | $42,911 |
| AMZN | Individual stocks | ranked | 94 | 10/10 | dip 25.1%, stop 8.8%, hold 10, lookback 96, material 6.0%, re-entry 7.9%, reset 79.4% | $136,285 | $23,293 | 18 | $140,441 | $67,576 |

## VGT (Technology-heavy / software ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,118 distinct candidates evaluated, 8,844 passed the gates, 122 were scored for robustness. Rejections (a candidate can fail several): drawdown 4,518, trades 4,636, profitable 1,119, yearConsistency 38, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 2.5%, stop 2.1%, hold 8, lookback 78, material 2.2%, re-entry 4.0%, reset 36.7%. Versus the original VGT defaults: dip 2.5% (original 10.0%); stop 2.1% (original 8.0%); hold (cal. days) 8 (original 15); lookback (sessions) 78 (original 90); material loss 2.2% (original 0.5%); re-entry decline 4.0% (original 3.0%); reset retrace 36.7% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: stop 2.1% (bound 2.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c8a13b9e75b27` | 2.5% | 2.1% | 8 | 78 | 2.2% | 4.0% | 36.7% | $213,441 | $284,233 | $70,792 | $16,564 (17%) | 187 | 65% | 2.39 | $846 | -$9,868 | 65% | 9 | 100% | $181,176 | $193,691 | 1 | 3 | GA run 1 gen 47 | merit |
| 2 | `c53d8d7a38462` | 3.2% | 2.3% | 8 | 70 | 1.2% | 2.4% | 51.1% | $215,619 | $277,942 | $62,323 | $15,495 (15%) | 154 | 66% | 2.68 | $1,070 | -$9,868 | 57% | 9 | 100% | $180,256 | $204,480 | 5 | 1 | GA run 0 gen 47 | merit |
| 3 | `c106e3f5216a3` | 2.5% | 2.1% | 8 | 118 | 2.3% | 4.0% | 36.5% | $210,758 | $282,454 | $71,696 | $16,564 (17%) | 189 | 65% | 2.36 | $762 | -$9,868 | 66% | 9 | 100% | $178,595 | $192,433 | 6 | 11 | GA run 1 gen 37 | merit |
| 4 | `ce67f42acf603` | 10.3% | 9.8% | 9 | 44 | 0.9% | 3.2% | 89.8% | $209,156 | $286,759 | $77,603 | $29,562 (30%) | 28 | 43% | 7.30 | -$252 | -$7,215 | 71% | 18 | 80% | $172,719 | $191,884 | 17 | 16 | GA run 1 gen 34 | merit |
| 5 | `cfdce6bf00308` | 10.1% | 9.8% | 11 | 49 | 1.0% | 4.0% | 66.0% | $209,754 | $292,511 | $82,756 | $25,123 (25%) | 28 | 46% | 6.67 | -$332 | -$7,436 | 75% | 18 | 80% | $167,948 | $207,355 | 39 | 12 | GA run 1 gen 32 | merit |
| 6 | `c4455ac147476` | 2.4% | 2.1% | 8 | 115 | 0.1% | 4.0% | 39.1% | $185,367 | $252,452 | $67,085 | $13,993 (14%) | 180 | 66% | 2.40 | $672 | -$9,868 | 61% | 9 | 90% | $161,680 | $174,833 | 43 | 1 | GA run 1 gen 44 | merit |
| 7 | `c0b2b24ac8cfa` | 3.1% | 2.1% | 8 | 215 | 1.0% | 2.4% | 51.6% | $181,601 | $240,820 | $59,219 | $14,403 (14%) | 172 | 65% | 2.33 | $810 | -$9,868 | 54% | 8 | 100% | $161,388 | $176,368 | 45 | 2 | GA run 0 gen 45 | merit |
| 8 | `c473b2dbe096d` | 10.1% | 9.8% | 9 | 45 | 1.0% | 3.5% | 38.3% | $209,953 | $294,066 | $84,112 | $28,435 (28%) | 31 | 42% | 6.56 | -$437 | -$7,215 | 77% | 13 | 80% | $159,183 | $191,331 | 48 | 12 | GA run 1 gen 38 | merit |
| 9 | `c10680551296d` | 10.3% | 9.8% | 9 | 39 | 0.9% | 4.0% | 74.9% | $208,919 | $286,491 | $77,573 | $29,562 (30%) | 28 | 43% | 7.18 | -$259 | -$7,215 | 71% | 18 | 80% | $152,064 | $179,640 | 55 | 17 | GA run 1 gen 33 | merit |
| 10 | `cca15068024e3` | 3.6% | 2.3% | 9 | 77 | 1.7% | 3.9% | 74.3% | $165,901 | $215,205 | $49,304 | $14,323 (14%) | 122 | 66% | 2.64 | $897 | -$6,675 | 45% | 10 | 100% | $137,688 | $165,893 | 65 | 2 | GA run 1 gen 45 | merit |

Original defaults over the same window (for reference): net $117,461, max DD $23,723, 33 trades, interest $51,866.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $16,030 | $5,097 | $8,731 | $1,576 | $4,778 | $44,249 | $71,135 | $16,946 | $30,341 | $14,559 |
| 2 | $18,021 | $15,702 | $10,669 | $2,294 | $22,553 | $14,333 | $63,967 | $27,990 | $20,866 | $19,224 |
| 3 | $16,030 | $5,097 | $7,800 | $1,576 | $4,778 | $44,249 | $71,135 | $16,946 | $30,341 | $12,807 |
| 4 | $0 | $9,511 | $11,775 | $37,310 | -$7,833 | $35,583 | $67,055 | $22,225 | -$13,236 | $46,766 |
| 5 | $0 | $9,511 | $11,775 | $37,310 | -$2,277 | $35,570 | $64,293 | $22,244 | -$14,658 | $45,985 |
| 6 | $8,495 | $1,058 | $12,523 | $2,751 | -$1,880 | $37,601 | $59,122 | $6,894 | $30,341 | $28,463 |
| 7 | $6,101 | $13,586 | $2,701 | $4,176 | $4,045 | $31,831 | $69,177 | $19,901 | $21,572 | $8,511 |
| 8 | $0 | $9,511 | $11,775 | $37,310 | -$2,471 | $35,583 | $67,055 | $22,225 | -$17,020 | $45,985 |
| 9 | $0 | $9,511 | $11,775 | $37,310 | -$7,833 | $35,583 | $67,055 | $22,225 | -$13,474 | $46,766 |
| 10 | $5,759 | $10,689 | $4,144 | $3,917 | $14,220 | $9,750 | $64,004 | $24,059 | $20,228 | $9,131 |
| original | $0 | $7,238 | -$12,642 | $0 | $5,943 | $15,380 | $57,597 | -$358 | -$165 | $44,468 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $213,441 | $194,741 | $176,041 | $232,748 | $194,134 |
| 2 | $215,619 | $200,219 | $184,819 | $232,616 | $198,622 |
| 3 | $210,758 | $191,858 | $172,958 | $230,312 | $191,205 |
| 4 | $209,156 | $206,356 | $203,556 | $230,321 | $187,992 |
| 5 | $209,754 | $206,954 | $204,154 | $232,324 | $187,185 |
| 6 | $185,367 | $167,367 | $149,367 | $203,663 | $167,071 |
| 7 | $181,601 | $164,401 | $147,201 | $197,751 | $165,450 |
| 8 | $209,953 | $206,853 | $203,753 | $232,893 | $187,014 |
| 9 | $208,919 | $206,119 | $203,319 | $230,075 | $187,762 |
| 10 | $165,901 | $153,701 | $141,501 | $179,347 | $152,454 |

Why each entry is included:

- **#1** `c8a13b9e75b27`: Highest merit (neighbourhood lower-quartile net P&L $181,176); recommended primary. 1 other pool members produced exactly the same trades.
- **#2** `c53d8d7a38462`: Merit rank 5; trades and parameters distinct from higher-ranked entries.
- **#3** `c106e3f5216a3`: Merit rank 6; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#4** `ce67f42acf603`: Merit rank 17; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#5** `cfdce6bf00308`: Merit rank 39; trades and parameters distinct from higher-ranked entries.
- **#6** `c4455ac147476`: Merit rank 43; trades and parameters distinct from higher-ranked entries.
- **#7** `c0b2b24ac8cfa`: Merit rank 45; trades and parameters distinct from higher-ranked entries.
- **#8** `c473b2dbe096d`: Merit rank 48; trades and parameters distinct from higher-ranked entries.
- **#9** `c10680551296d`: Merit rank 55; trades and parameters distinct from higher-ranked entries.
- **#10** `cca15068024e3`: Merit rank 65; trades and parameters distinct from higher-ranked entries.

## XLK (Technology-heavy / software ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,120 distinct candidates evaluated, 8,076 passed the gates, 114 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,979, trades 5,599, profitable 1,810, yearConsistency 13, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 10.1%, stop 7.4%, hold 10, lookback 161, material 0.1%, re-entry 0.1%, reset 53.6%. Versus the original VGT defaults: dip 10.1% (original 10.0%); stop 7.4% (original 8.0%); hold (cal. days) 10 (original 15); lookback (sessions) 161 (original 90); material loss 0.1% (original 0.5%); re-entry decline 0.1% (original 3.0%); reset retrace 53.6% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c56e3a3361ed3` | 10.1% | 7.4% | 10 | 161 | 0.1% | 0.1% | 53.6% | $176,856 | $246,412 | $69,556 | $26,087 (26%) | 37 | 43% | 4.26 | -$83 | -$10,367 | 63% | 20 | 80% | $167,569 | $168,543 | 1 | 3 | GA run 1 gen 44 | merit |
| 2 | `cda816120155d` | 7.9% | 7.4% | 10 | 88 | 1.7% | 0.9% | 67.3% | $181,763 | $271,631 | $89,868 | $28,002 (28%) | 43 | 42% | 3.89 | -$544 | -$10,367 | 82% | 18 | 80% | $164,585 | $180,392 | 5 | 4 | GA run 1 gen 45 | merit |
| 3 | `c32fb7622777f` | 8.0% | 7.4% | 10 | 181 | 1.0% | 1.0% | 71.1% | $183,871 | $272,926 | $89,055 | $28,002 (28%) | 42 | 43% | 4.02 | -$423 | -$10,367 | 81% | 16 | 80% | $161,220 | $182,271 | 21 | 1 | GA run 1 gen 46 | merit |
| 4 | `cb5d83e9ed19d` | 10.0% | 7.4% | 10 | 183 | 1.8% | 0.1% | 58.0% | $174,409 | $244,327 | $69,918 | $26,087 (26%) | 38 | 42% | 4.08 | -$176 | -$10,367 | 64% | 17 | 80% | $160,930 | $170,821 | 24 | 5 | GA run 1 gen 46 | merit |
| 5 | `cb135780ff963` | 5.1% | 7.4% | 10 | 185 | 0.3% | 0.1% | 58.0% | $175,281 | $279,404 | $104,123 | $28,595 (29%) | 51 | 41% | 3.17 | -$779 | -$10,367 | 95% | 17 | 80% | $160,243 | $168,323 | 25 | 15 | GA run 1 gen 46 | merit |
| 6 | `c609929e51bb3` | 8.0% | 7.5% | 10 | 159 | 1.4% | 0.1% | 67.1% | $181,408 | $271,548 | $90,140 | $28,002 (28%) | 45 | 42% | 3.81 | -$484 | -$10,367 | 82% | 14 | 80% | $158,702 | $180,446 | 27 | 5 | GA run 1 gen 41 | merit |
| 7 | `ce761933ff860` | 7.8% | 7.5% | 10 | 209 | 1.7% | 0.1% | 52.7% | $179,300 | $270,253 | $90,953 | $28,002 (28%) | 46 | 41% | 3.69 | -$561 | -$10,367 | 83% | 16 | 80% | $158,455 | $175,946 | 28 | 11 | GA run 1 gen 25 | merit |
| 8 | `c204406b7eeb5` | 10.1% | 9.3% | 10 | 160 | 0.2% | 0.1% | 54.5% | $178,992 | $255,601 | $76,608 | $27,974 (28%) | 35 | 37% | 4.49 | -$227 | -$7,312 | 70% | 17 | 70% | $157,769 | $178,992 | 30 | 1 | GA run 1 gen 46 | merit |
| 9 | `cbafb9bfbb7c0` | 10.2% | 9.3% | 10 | 98 | 0.2% | 0.1% | 58.5% | $175,707 | $246,529 | $70,822 | $27,974 (28%) | 34 | 35% | 4.42 | -$474 | -$7,312 | 65% | 16 | 70% | $153,853 | $171,897 | 47 | 5 | GA run 1 gen 43 | merit |
| 10 | `c9cec8d5fe3ab` | 7.8% | 7.8% | 10 | 51 | 0.1% | 0.1% | 35.9% | $174,395 | $261,672 | $87,277 | $28,002 (28%) | 45 | 40% | 3.71 | -$578 | -$10,367 | 80% | 17 | 90% | $152,894 | $162,530 | 48 | 16 | GA run 1 gen 12 | merit |

Original defaults over the same window (for reference): net $92,753, max DD $24,633, 29 trades, interest $45,688.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $0 | $9,481 | $8,681 | $32,591 | $3,721 | $28,818 | $51,093 | -$2,597 | -$3,004 | $48,072 |
| 2 | $9,416 | $1,293 | $9,485 | $32,591 | -$1,467 | $37,041 | $48,965 | $9,399 | -$5,498 | $40,539 |
| 3 | $9,416 | $1,293 | $9,485 | $32,591 | -$1,467 | $37,041 | $48,965 | $9,399 | -$5,498 | $42,648 |
| 4 | $0 | $9,481 | $8,681 | $32,591 | $1,274 | $28,818 | $51,093 | -$2,597 | -$3,004 | $48,072 |
| 5 | $12,192 | $1,293 | $9,485 | $32,591 | -$7,487 | $38,935 | $47,972 | $19,152 | -$17,980 | $39,127 |
| 6 | $9,416 | $1,173 | $9,485 | $32,591 | -$614 | $36,905 | $48,685 | $9,156 | -$7,886 | $42,498 |
| 7 | $9,416 | $1,173 | $9,485 | $32,591 | -$614 | $36,905 | $48,685 | $9,156 | -$7,886 | $40,389 |
| 8 | $0 | $9,481 | $7,338 | $32,591 | -$4,319 | $43,451 | $58,749 | -$5,246 | -$10,969 | $47,917 |
| 9 | $0 | $9,481 | $7,338 | $32,591 | -$7,604 | $43,451 | $58,749 | -$5,246 | -$10,969 | $47,917 |
| 10 | $9,416 | $815 | $9,485 | $32,591 | $578 | $36,498 | $49,031 | $261 | -$11,578 | $47,298 |
| original | $0 | $9,481 | -$8,644 | -$0 | $3,156 | $13,654 | $36,432 | -$3,619 | -$5,867 | $48,161 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $176,856 | $173,156 | $169,456 | $195,826 | $157,886 |
| 2 | $181,763 | $177,463 | $173,163 | $206,272 | $157,253 |
| 3 | $183,871 | $179,671 | $175,471 | $208,159 | $159,584 |
| 4 | $174,409 | $170,609 | $166,809 | $193,478 | $155,341 |
| 5 | $175,281 | $170,181 | $165,081 | $203,678 | $146,884 |
| 6 | $181,408 | $176,908 | $172,408 | $205,992 | $156,825 |
| 7 | $179,300 | $174,700 | $170,100 | $204,105 | $154,494 |
| 8 | $178,992 | $175,492 | $171,992 | $199,886 | $158,099 |
| 9 | $175,707 | $172,307 | $168,907 | $195,022 | $156,392 |
| 10 | $174,395 | $169,895 | $165,395 | $198,198 | $150,592 |

Why each entry is included:

- **#1** `c56e3a3361ed3`: Highest merit (neighbourhood lower-quartile net P&L $167,569); recommended primary. 21 other pool members produced exactly the same trades.
- **#2** `cda816120155d`: Merit rank 5; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#3** `c32fb7622777f`: Merit rank 21; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.
- **#4** `cb5d83e9ed19d`: Merit rank 24; trades and parameters distinct from higher-ranked entries.
- **#5** `cb135780ff963`: Merit rank 25; trades and parameters distinct from higher-ranked entries.
- **#6** `c609929e51bb3`: Merit rank 27; trades and parameters distinct from higher-ranked entries.
- **#7** `ce761933ff860`: Merit rank 28; trades and parameters distinct from higher-ranked entries.
- **#8** `c204406b7eeb5`: Merit rank 30; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.
- **#9** `cbafb9bfbb7c0`: Merit rank 47; trades and parameters distinct from higher-ranked entries.
- **#10** `c9cec8d5fe3ab`: Merit rank 48; trades and parameters distinct from higher-ranked entries.

## QQQ (Technology-heavy / software ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,119 distinct candidates evaluated, 8,721 passed the gates, 95 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,436, trades 5,451, profitable 1,872, yearConsistency 86, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 7.3%, stop 6.9%, hold 14, lookback 35, material 0.7%, re-entry 12.5%, reset 54.5%. Versus the original VGT defaults: dip 7.3% (original 10.0%); stop 6.9% (original 8.0%); hold (cal. days) 14 (original 15); lookback (sessions) 35 (original 90); material loss 0.7% (original 0.5%); re-entry decline 12.5% (original 3.0%); reset retrace 54.5% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c5aeb2312d3e1` | 7.3% | 6.9% | 14 | 35 | 0.7% | 12.5% | 54.5% | $208,717 | $292,950 | $84,233 | $18,354 (18%) | 34 | 65% | 9.36 | $2,672 | -$7,038 | 77% | 38 | 100% | $178,446 | $200,404 | 1 | 2 | GA run 1 gen 47 | merit |
| 2 | `c6f2c15e95724` | 7.3% | 8.6% | 14 | 24 | 0.7% | 12.2% | 67.4% | $197,172 | $282,882 | $85,710 | $22,917 (23%) | 24 | 63% | 7.82 | $3,686 | -$8,333 | 78% | 54 | 90% | $173,736 | $182,931 | 3 | 7 | GA run 1 gen 24 | merit |
| 3 | `ca07d76ea5d14` | 7.2% | 6.9% | 14 | 35 | 0.3% | 12.2% | 76.7% | $206,982 | $291,787 | $84,805 | $19,225 (19%) | 35 | 66% | 9.29 | $2,155 | -$7,038 | 77% | 35 | 100% | $163,299 | $187,690 | 7 | 4 | GA run 1 gen 38 | merit |
| 4 | `c5f69f15e7c1f` | 7.2% | 6.9% | 14 | 24 | 0.3% | 12.2% | 58.7% | $209,978 | $294,603 | $84,625 | $19,225 (19%) | 35 | 66% | 9.41 | $2,155 | -$7,038 | 77% | 35 | 100% | $163,268 | $199,360 | 8 | 2 | GA run 1 gen 45 | merit |
| 5 | `cb927ed348fc9` | 7.0% | 6.9% | 14 | 24 | 0.7% | 13.6% | 57.5% | $198,732 | $280,071 | $81,340 | $19,225 (19%) | 30 | 67% | 10.11 | $2,998 | -$7,038 | 74% | 48 | 100% | $157,398 | $188,614 | 20 | 5 | GA run 1 gen 33 | merit |
| 6 | `c5361a66109e4` | 10.6% | 8.9% | 1 | 208 | 0.0% | 11.4% | 67.5% | $173,952 | $230,308 | $56,356 | $16,802 (17%) | 18 | 50% | 16.74 | $1,627 | -$3,354 | 52% | 19 | 90% | $153,537 | $173,952 | 28 | 2 | GA run 0 gen 40 | merit |
| 7 | `c41ff763279bd` | 10.5% | 8.8% | 1 | 170 | 0.1% | 11.4% | 67.5% | $174,792 | $231,179 | $56,386 | $16,622 (17%) | 19 | 47% | 16.43 | -$4 | -$3,354 | 52% | 9 | 90% | $152,171 | $173,545 | 40 | 1 | GA run 0 gen 46 | merit |
| 8 | `ccd47a6f1ab50` | 7.0% | 6.2% | 14 | 24 | 0.7% | 12.2% | 51.1% | $199,062 | $281,426 | $82,364 | $17,517 (18%) | 37 | 65% | 7.96 | $2,926 | -$7,038 | 75% | 33 | 100% | $150,559 | $184,609 | 46 | 1 | GA run 1 gen 27 | merit |
| 9 | `ccb89c4311df4` | 7.0% | 4.2% | 14 | 24 | 0.7% | 12.2% | 51.1% | $157,137 | $202,041 | $44,904 | $14,978 (15%) | 39 | 64% | 6.03 | $2,725 | -$7,038 | 41% | 15 | 100% | $126,438 | $145,913 | 73 | 1 | GA run 1 gen 45 | merit |
| 10 | `cc6fb8698ef66` | 7.3% | 4.3% | 14 | 24 | 1.2% | 12.2% | 63.5% | $157,056 | $201,840 | $44,784 | $15,231 (15%) | 38 | 63% | 6.04 | $2,722 | -$7,038 | 41% | 15 | 100% | $117,692 | $144,909 | 74 | 2 | GA run 1 gen 45 | merit |

Original defaults over the same window (for reference): net $85,932, max DD $24,060, 30 trades, interest $47,858.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $15,434 | $7,698 | $2,363 | $27,092 | $18,617 | $14,425 | $61,282 | $13,847 | $9,894 | $38,065 |
| 2 | $14,389 | $5,226 | $2,647 | $27,092 | $5,678 | $29,337 | $68,352 | $18,764 | -$9,013 | $34,700 |
| 3 | $15,434 | $7,698 | $2,363 | $27,092 | $18,617 | $13,554 | $61,282 | $13,847 | $11,337 | $35,758 |
| 4 | $15,434 | $7,698 | $2,363 | $27,092 | $18,617 | $13,554 | $61,282 | $13,847 | $12,026 | $38,065 |
| 5 | $15,434 | $7,698 | $2,363 | $27,092 | $18,617 | $13,554 | $61,282 | $13,847 | $2,194 | $36,650 |
| 6 | $0 | $10,342 | $2,477 | $27,092 | $5,128 | $29,035 | $69,625 | $20,301 | -$7,522 | $17,473 |
| 7 | $0 | $10,342 | $2,595 | $27,092 | $5,017 | $29,169 | $69,945 | $20,427 | -$7,268 | $17,473 |
| 8 | $16,231 | $5,276 | $3,273 | $27,092 | $21,440 | $15,262 | $38,163 | $16,534 | $12,393 | $43,400 |
| 9 | $17,444 | $7,285 | $4,654 | $0 | $8,221 | $20,592 | $14,934 | $25,178 | $9,753 | $49,075 |
| 10 | $17,209 | $7,409 | $4,537 | $0 | $8,007 | $21,138 | $20,298 | $24,832 | $11,941 | $41,685 |
| original | $0 | $9,332 | -$7,861 | $0 | $1,276 | $6,977 | $53,686 | $7,046 | -$9,636 | $25,111 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $208,717 | $205,317 | $201,917 | $231,690 | $185,744 |
| 2 | $197,172 | $194,772 | $192,372 | $220,548 | $173,797 |
| 3 | $206,982 | $203,482 | $199,982 | $230,111 | $183,853 |
| 4 | $209,978 | $206,478 | $202,978 | $233,058 | $186,899 |
| 5 | $198,732 | $195,732 | $192,732 | $220,915 | $176,548 |
| 6 | $173,952 | $172,152 | $170,352 | $189,322 | $158,582 |
| 7 | $174,792 | $172,892 | $170,992 | $190,170 | $159,414 |
| 8 | $199,062 | $195,362 | $191,662 | $221,525 | $176,599 |
| 9 | $157,137 | $153,237 | $149,337 | $169,383 | $144,890 |
| 10 | $157,056 | $153,256 | $149,456 | $169,270 | $144,843 |

Why each entry is included:

- **#1** `c5aeb2312d3e1`: Highest merit (neighbourhood lower-quartile net P&L $178,446); recommended primary.
- **#2** `c6f2c15e95724`: Merit rank 3; trades and parameters distinct from higher-ranked entries.
- **#3** `ca07d76ea5d14`: Merit rank 7; trades and parameters distinct from higher-ranked entries.
- **#4** `c5f69f15e7c1f`: Merit rank 8; trades and parameters distinct from higher-ranked entries. 25 other pool members produced exactly the same trades.
- **#5** `cb927ed348fc9`: Merit rank 20; trades and parameters distinct from higher-ranked entries.
- **#6** `c5361a66109e4`: Merit rank 28; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades. Caveat: few trades.
- **#7** `c41ff763279bd`: Merit rank 40; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#8** `ccd47a6f1ab50`: Merit rank 46; trades and parameters distinct from higher-ranked entries.
- **#9** `ccb89c4311df4`: Merit rank 73; trades and parameters distinct from higher-ranked entries.
- **#10** `cc6fb8698ef66`: Merit rank 74; trades and parameters distinct from higher-ranked entries.

## IGV (Technology-heavy / software ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,115 distinct candidates evaluated, 9,724 passed the gates, 123 were scored for robustness. Rejections (a candidate can fail several): drawdown 4,226, trades 3,997, profitable 1,159, yearConsistency 8, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 7.8%, stop 4.5%, hold 13, lookback 200, material 4.2%, re-entry 5.1%, reset 90.0%. Versus the original VGT defaults: dip 7.8% (original 10.0%); stop 4.5% (original 8.0%); hold (cal. days) 13 (original 15); lookback (sessions) 200 (original 90); material loss 4.2% (original 0.5%); re-entry decline 5.1% (original 3.0%); reset retrace 90.0% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `cb4ee7170a324` | 7.8% | 4.5% | 13 | 200 | 4.2% | 5.1% | 90.0% | $162,810 | $219,528 | $56,718 | $23,255 (23%) | 69 | 57% | 2.75 | $409 | -$13,333 | 51% | 14 | 100% | $149,344 | $157,577 | 1 | 8 | GA run 1 gen 21 | merit |
| 2 | `c52e5cffa178f` | 9.4% | 4.5% | 13 | 200 | 4.6% | 7.8% | 88.8% | $164,048 | $208,470 | $44,422 | $21,720 (22%) | 57 | 65% | 4.07 | $893 | -$7,173 | 41% | 14 | 100% | $144,580 | $164,048 | 3 | 3 | GA run 1 gen 23 | merit |
| 3 | `c3e3487ec0c3c` | 9.1% | 4.5% | 13 | 204 | 4.8% | 5.1% | 88.8% | $170,042 | $218,985 | $48,942 | $23,086 (23%) | 64 | 61% | 3.51 | $720 | -$7,173 | 44% | 14 | 100% | $142,247 | $165,579 | 5 | 4 | GA run 1 gen 26 | merit |
| 4 | `cc165ef2ecddf` | 9.3% | 4.5% | 13 | 206 | 7.1% | 4.1% | 44.4% | $163,190 | $212,524 | $49,334 | $23,086 (23%) | 67 | 63% | 3.20 | $781 | -$9,470 | 45% | 14 | 100% | $136,798 | $163,190 | 9 | 7 | GA run 1 gen 24 | merit |
| 5 | `cb133427644b7` | 9.4% | 4.5% | 13 | 197 | 5.7% | 6.8% | 44.0% | $160,411 | $204,953 | $44,542 | $24,127 (24%) | 57 | 65% | 4.25 | $856 | -$7,173 | 41% | 14 | 90% | $135,269 | $154,081 | 10 | 9 | GA run 1 gen 26 | merit |
| 6 | `c14728cf271b0` | 9.3% | 4.5% | 13 | 61 | 2.5% | 7.8% | 94.9% | $182,349 | $226,680 | $44,332 | $17,368 (17%) | 59 | 66% | 5.55 | $893 | -$6,779 | 41% | 14 | 100% | $132,795 | $167,815 | 12 | 1 | GA run 1 gen 46 | merit |
| 7 | `ce62d432a1a5a` | 9.4% | 4.5% | 13 | 214 | 5.9% | 4.8% | 46.2% | $166,063 | $213,287 | $47,225 | $23,086 (23%) | 64 | 63% | 3.49 | $819 | -$7,173 | 43% | 14 | 100% | $131,036 | $166,063 | 16 | 5 | GA run 1 gen 16 | merit |
| 8 | `c2b66f1b44779` | 9.4% | 5.1% | 13 | 202 | 4.5% | 5.1% | 64.9% | $152,315 | $205,506 | $53,192 | $26,897 (27%) | 60 | 58% | 3.04 | $1,406 | -$7,783 | 48% | 15 | 100% | $130,001 | $152,315 | 17 | 12 | GA run 1 gen 14 | merit |
| 9 | `cc4712e0ee61b` | 9.3% | 5.1% | 13 | 200 | 7.2% | 4.4% | 67.6% | $147,851 | $203,725 | $55,874 | $26,897 (27%) | 63 | 57% | 2.84 | $936 | -$7,783 | 51% | 15 | 90% | $128,300 | $147,851 | 19 | 13 | GA run 1 gen 14 | merit |
| 10 | `c7530240c725b` | 9.4% | 4.5% | 13 | 122 | 4.6% | 5.1% | 63.7% | $157,295 | $200,782 | $43,488 | $23,086 (23%) | 59 | 64% | 3.60 | $856 | -$7,173 | 40% | 14 | 100% | $128,099 | $152,831 | 20 | 8 | GA run 1 gen 18 | merit |

Original defaults over the same window (for reference): net $63,718, max DD $33,062, 36 trades, interest $47,737.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $7,504 | $5,278 | $12,619 | $0 | $19,029 | $32,899 | $17,117 | $15,875 | $12,305 | $40,185 |
| 2 | $12,901 | $5,389 | $5,722 | $0 | $10,984 | $35,286 | $31,490 | $11,193 | $670 | $50,413 |
| 3 | $12,901 | $5,389 | $5,722 | $0 | $8,277 | $32,899 | $31,490 | $11,193 | $12,305 | $49,866 |
| 4 | $12,901 | $5,389 | $5,722 | $0 | $4,389 | $34,122 | $31,490 | $11,193 | $7,571 | $50,413 |
| 5 | $12,901 | $5,389 | $5,722 | $0 | $4,389 | $34,321 | $31,490 | $11,193 | -$1,737 | $56,743 |
| 6 | $12,901 | $5,389 | $13,562 | $0 | $10,984 | $35,087 | $31,490 | $11,193 | $26,413 | $35,330 |
| 7 | $12,901 | $5,389 | $5,722 | $0 | $4,389 | $34,321 | $31,490 | $11,193 | $10,244 | $50,413 |
| 8 | $12,300 | $5,984 | $4,848 | $0 | $3,841 | $33,330 | $29,444 | $14,772 | $108 | $47,688 |
| 9 | $12,300 | $5,984 | $4,848 | $0 | $3,841 | $33,130 | $29,444 | $14,772 | -$4,156 | $47,688 |
| 10 | $12,901 | $5,389 | $5,722 | $0 | $8,277 | $34,896 | $31,490 | $11,193 | $12,305 | $35,121 |
| original | $201 | $9,427 | $2,258 | $0 | -$5,242 | $12,582 | $35,800 | $4,940 | -$15,979 | $19,731 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $162,810 | $155,910 | $149,010 | $178,279 | $147,342 |
| 2 | $164,048 | $158,348 | $152,648 | $176,163 | $151,933 |
| 3 | $170,042 | $163,642 | $157,242 | $183,390 | $156,694 |
| 4 | $163,190 | $156,490 | $149,790 | $176,645 | $149,735 |
| 5 | $160,411 | $154,711 | $149,011 | $172,559 | $148,263 |
| 6 | $182,349 | $176,449 | $170,549 | $194,439 | $170,258 |
| 7 | $166,063 | $159,663 | $153,263 | $178,942 | $153,183 |
| 8 | $152,315 | $146,315 | $140,315 | $166,822 | $137,808 |
| 9 | $147,851 | $141,551 | $135,251 | $163,089 | $132,613 |
| 10 | $157,295 | $151,395 | $145,495 | $169,155 | $145,434 |

Why each entry is included:

- **#1** `cb4ee7170a324`: Highest merit (neighbourhood lower-quartile net P&L $149,344); recommended primary.
- **#2** `c52e5cffa178f`: Merit rank 3; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#3** `c3e3487ec0c3c`: Merit rank 5; trades and parameters distinct from higher-ranked entries.
- **#4** `cc165ef2ecddf`: Merit rank 9; trades and parameters distinct from higher-ranked entries.
- **#5** `cb133427644b7`: Merit rank 10; trades and parameters distinct from higher-ranked entries.
- **#6** `c14728cf271b0`: Merit rank 12; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#7** `ce62d432a1a5a`: Merit rank 16; trades and parameters distinct from higher-ranked entries.
- **#8** `c2b66f1b44779`: Merit rank 17; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#9** `cc4712e0ee61b`: Merit rank 19; trades and parameters distinct from higher-ranked entries. 9 other pool members produced exactly the same trades.
- **#10** `c7530240c725b`: Merit rank 20; trades and parameters distinct from higher-ranked entries.

## VOOG (Broad US market / large-cap growth ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,110 distinct candidates evaluated, 8,083 passed the gates, 112 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,243, trades 6,573, profitable 1,712, yearConsistency 20, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 19.6%, stop 7.4%, hold 9, lookback 101, material 0.9%, re-entry 4.7%, reset 71.2%. Versus the original VGT defaults: dip 19.6% (original 10.0%); stop 7.4% (original 8.0%); hold (cal. days) 9 (original 15); lookback (sessions) 101 (original 90); material loss 0.9% (original 0.5%); re-entry decline 4.7% (original 3.0%); reset retrace 71.2% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c132e2f4cacf9` | 19.6% | 7.4% | 9 | 101 | 0.9% | 4.7% | 71.2% | $99,973 | $126,132 | $26,159 | $12,961 (13%) | 11 | 55% | 21.97 | $849 | -$1,869 | 24% | 28 | 100% | $98,099 | $99,973 | 1 | 1 | GA run 0 gen 46 | merit |
| 2 | `cf9dedba59f59` | 19.6% | 7.7% | 8 | 145 | 0.6% | 4.3% | 32.9% | $102,219 | $134,767 | $32,548 | $15,606 (16%) | 11 | 55% | 10.70 | $1,516 | -$4,841 | 30% | 28 | 100% | $96,642 | $102,219 | 12 | 4 | GA run 1 gen 46 | merit |
| 3 | `c6492ff85a495` | 19.5% | 7.1% | 8 | 101 | 0.9% | 4.9% | 84.7% | $94,332 | $119,797 | $25,466 | $12,501 (13%) | 11 | 64% | 17.56 | $2,184 | -$1,869 | 23% | 28 | 100% | $93,291 | $94,332 | 15 | 2 | GA run 0 gen 36 | merit |
| 4 | `c19a425bd3f6d` | 19.6% | 7.4% | 5 | 249 | 0.7% | 4.3% | 32.6% | $98,254 | $131,254 | $33,000 | $14,346 (14%) | 15 | 40% | 8.91 | -$116 | -$3,293 | 30% | 23 | 100% | $92,804 | $97,992 | 18 | 7 | GA run 1 gen 42 | merit |
| 5 | `c6731016db781` | 19.5% | 7.9% | 6 | 151 | 0.5% | 4.3% | 89.7% | $101,659 | $134,448 | $32,789 | $13,928 (14%) | 11 | 55% | 11.80 | $2,115 | -$3,293 | 30% | 29 | 100% | $92,244 | $98,302 | 23 | 4 | GA run 1 gen 43 | merit |
| 6 | `ca0f924504a62` | 19.6% | 8.0% | 6 | 149 | 0.7% | 4.3% | 52.7% | $101,037 | $133,826 | $32,789 | $14,043 (14%) | 11 | 55% | 11.73 | $2,002 | -$3,293 | 30% | 29 | 100% | $91,801 | $97,555 | 28 | 5 | GA run 1 gen 25 | merit |
| 7 | `c79d8b629bb59` | 19.6% | 7.1% | 3 | 101 | 0.8% | 4.7% | 76.4% | $94,934 | $120,279 | $25,345 | $12,501 (13%) | 11 | 64% | 19.64 | $2,184 | -$1,798 | 23% | 28 | 100% | $90,049 | $94,038 | 58 | 1 | GA run 0 gen 39 | merit |
| 8 | `c202ebb96688b` | 19.5% | 7.6% | 2 | 207 | 0.9% | 4.3% | 25.8% | $101,272 | $133,880 | $32,608 | $13,703 (14%) | 16 | 44% | 9.19 | -$506 | -$3,405 | 30% | 6 | 100% | $88,811 | $95,368 | 62 | 3 | GA run 1 gen 44 | merit |
| 9 | `c9dd069c4f149` | 19.6% | 7.8% | 6 | 135 | 1.0% | 4.3% | 26.0% | $102,336 | $135,004 | $32,668 | $13,830 (14%) | 11 | 55% | 11.87 | $2,318 | -$3,293 | 30% | 28 | 100% | $88,122 | $98,986 | 69 | 3 | GA run 1 gen 43 | merit |
| 10 | `c09e0443341ba` | 19.6% | 7.6% | 6 | 139 | 0.6% | 2.7% | 24.3% | $98,828 | $131,617 | $32,789 | $15,171 (15%) | 12 | 50% | 10.81 | $486 | -$3,293 | 30% | 26 | 100% | $88,016 | $96,924 | 70 | 7 | GA run 1 gen 47 | merit |

Original defaults over the same window (for reference): net $61,698, max DD $29,449, 23 trades, interest $66,693.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $54,414 | $0 | $15,491 | $849 |
| 2 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $53,431 | $0 | $10,326 | $9,243 |
| 3 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $46,947 | $0 | $17,269 | $896 |
| 4 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $54,414 | $0 | $12,344 | $2,277 |
| 5 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $52,776 | $0 | $10,769 | $8,895 |
| 6 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $52,448 | $0 | $10,540 | $8,829 |
| 7 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $46,947 | $0 | $17,871 | $896 |
| 8 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $53,759 | $0 | $9,870 | $8,424 |
| 9 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $53,104 | $0 | $11,118 | $8,895 |
| 10 | $0 | $0 | $0 | $0 | $7,055 | $22,164 | $50,747 | $0 | $9,490 | $9,371 |
| original | $339 | $8,498 | $3,912 | $21,508 | -$15,812 | $15,601 | $48,033 | -$4,882 | -$15,501 | $0 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $99,973 | $98,873 | $97,773 | $107,108 | $92,839 |
| 2 | $102,219 | $101,119 | $100,019 | $111,096 | $93,343 |
| 3 | $94,332 | $93,232 | $92,132 | $101,277 | $87,386 |
| 4 | $98,254 | $96,754 | $95,254 | $107,254 | $89,254 |
| 5 | $101,659 | $100,559 | $99,459 | $110,602 | $92,717 |
| 6 | $101,037 | $99,937 | $98,837 | $109,980 | $92,095 |
| 7 | $94,934 | $93,834 | $92,734 | $101,846 | $88,022 |
| 8 | $101,272 | $99,672 | $98,072 | $110,165 | $92,379 |
| 9 | $102,336 | $101,236 | $100,136 | $111,245 | $93,426 |
| 10 | $98,828 | $97,628 | $96,428 | $107,770 | $89,885 |

Why each entry is included:

- **#1** `c132e2f4cacf9`: Highest merit (neighbourhood lower-quartile net P&L $98,099); recommended primary. 10 other pool members produced exactly the same trades. Caveat: few trades.
- **#2** `cf9dedba59f59`: Merit rank 12; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#3** `c6492ff85a495`: Merit rank 15; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades. Caveat: few trades.
- **#4** `c19a425bd3f6d`: Merit rank 18; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#5** `c6731016db781`: Merit rank 23; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades. Caveat: few trades.
- **#6** `ca0f924504a62`: Merit rank 28; trades and parameters distinct from higher-ranked entries. 10 other pool members produced exactly the same trades. Caveat: few trades.
- **#7** `c79d8b629bb59`: Merit rank 58; trades and parameters distinct from higher-ranked entries. 5 other pool members produced exactly the same trades. Caveat: few trades.
- **#8** `c202ebb96688b`: Merit rank 62; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades. Caveat: few trades.
- **#9** `c9dd069c4f149`: Merit rank 69; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#10** `c09e0443341ba`: Merit rank 70; trades and parameters distinct from higher-ranked entries. Caveat: few trades.

## VOO (Broad US market / large-cap growth ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,235 distinct candidates evaluated, 10,586 passed the gates, 96 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,800, trades 4,124, profitable 1,057, yearConsistency 32, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 8.6%, stop 6.3%, hold 10, lookback 202, material 0.4%, re-entry 7.3%, reset 36.4%. Versus the original VGT defaults: dip 8.6% (original 10.0%); stop 6.3% (original 8.0%); hold (cal. days) 10 (original 15); lookback (sessions) 202 (original 90); material loss 0.4% (original 0.5%); re-entry decline 7.3% (original 3.0%); reset retrace 36.4% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c1b5d48fca05d` | 8.6% | 6.3% | 10 | 202 | 0.4% | 7.3% | 36.4% | $112,169 | $182,750 | $70,581 | $17,777 (18%) | 30 | 43% | 5.68 | -$144 | -$7,468 | 64% | 29 | 90% | $106,501 | $112,169 | 1 | 11 | GA run 0 gen 36 | merit |
| 2 | `c9a49d88cab26` | 8.6% | 6.3% | 8 | 175 | 0.8% | 8.2% | 37.3% | $114,950 | $184,537 | $69,586 | $17,416 (17%) | 30 | 43% | 6.34 | -$231 | -$3,588 | 63% | 26 | 90% | $101,098 | $112,824 | 2 | 5 | GA run 0 gen 42 | merit |
| 3 | `c07fb69477ca2` | 8.5% | 6.3% | 10 | 226 | 0.7% | 7.0% | 33.8% | $111,920 | $182,682 | $70,762 | $17,777 (18%) | 30 | 43% | 5.61 | -$144 | -$7,468 | 64% | 29 | 90% | $97,051 | $107,336 | 7 | 12 | GA run 0 gen 31 | merit |
| 4 | `c3b8f21f114ce` | 8.6% | 6.1% | 10 | 154 | 1.3% | 8.2% | 33.8% | $116,374 | $188,191 | $71,816 | $17,390 (17%) | 33 | 45% | 5.57 | -$58 | -$7,468 | 65% | 27 | 100% | $95,524 | $103,331 | 10 | 1 | GA run 0 gen 34 | merit |
| 5 | `ce9c3a4eca89c` | 8.6% | 6.3% | 8 | 190 | 1.4% | 8.3% | 33.7% | $115,014 | $184,751 | $69,737 | $17,416 (17%) | 30 | 43% | 6.34 | -$231 | -$3,588 | 63% | 26 | 90% | $94,952 | $101,832 | 15 | 3 | GA run 0 gen 47 | merit |
| 6 | `c9dfa71ba27de` | 8.6% | 6.3% | 10 | 216 | 0.2% | 8.2% | 37.1% | $112,698 | $183,188 | $70,490 | $17,777 (18%) | 30 | 43% | 5.74 | -$88 | -$7,468 | 64% | 29 | 90% | $93,290 | $108,107 | 18 | 10 | GA run 0 gen 41 | merit |
| 7 | `c34aedbaced99` | 8.6% | 6.1% | 8 | 159 | 1.0% | 7.5% | 32.8% | $113,717 | $183,394 | $69,677 | $17,117 (17%) | 32 | 44% | 6.17 | -$144 | -$3,588 | 63% | 26 | 90% | $92,895 | $113,188 | 21 | 1 | GA run 0 gen 47 | merit |
| 8 | `c1eb6ce55873d` | 8.2% | 6.3% | 8 | 218 | 0.8% | 8.3% | 38.3% | $113,170 | $183,058 | $69,888 | $17,774 (18%) | 31 | 42% | 6.17 | -$292 | -$3,334 | 63% | 24 | 90% | $90,684 | $113,042 | 50 | 7 | GA run 0 gen 42 | merit |
| 9 | `c44ea29a91917` | 7.7% | 3.5% | 9 | 187 | 1.0% | 7.6% | 35.1% | $100,825 | $137,412 | $36,586 | $11,624 (12%) | 46 | 57% | 4.14 | $273 | -$5,004 | 34% | 12 | 100% | $84,485 | $96,897 | 64 | 1 | GA run 0 gen 43 | merit |
| 10 | `c0d06149643fe` | 7.5% | 3.6% | 9 | 158 | 1.0% | 8.3% | 35.0% | $100,124 | $135,505 | $35,381 | $11,728 (12%) | 45 | 53% | 4.39 | $74 | -$5,004 | 33% | 11 | 100% | $82,510 | $88,855 | 72 | 2 | GA run 0 gen 47 | merit |

Original defaults over the same window (for reference): net $13,311, max DD $33,020, 19 trades, interest $20,734.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $0 | $3,123 | $2,446 | $14,937 | $4,193 | $7,196 | $44,554 | $22,140 | -$5,633 | $19,213 |
| 2 | $0 | $3,123 | $2,446 | $14,937 | $2,554 | $7,196 | $50,287 | $22,140 | -$6,946 | $19,213 |
| 3 | $0 | $3,123 | $2,470 | $14,975 | $4,194 | $7,196 | $44,554 | $22,140 | -$5,945 | $19,213 |
| 4 | $0 | $3,123 | $2,470 | $14,975 | $4,723 | $7,583 | $40,898 | $22,140 | $804 | $19,658 |
| 5 | $0 | $3,123 | $2,470 | $14,975 | $2,555 | $7,196 | $50,287 | $22,140 | -$6,946 | $19,213 |
| 6 | $0 | $3,123 | $2,446 | $14,937 | $4,193 | $7,196 | $44,554 | $22,140 | -$5,104 | $19,213 |
| 7 | $0 | $3,123 | $2,470 | $14,975 | $3,085 | $7,583 | $46,632 | $22,140 | -$5,948 | $19,658 |
| 8 | $0 | $3,123 | $2,446 | $14,937 | $2,554 | $7,196 | $48,865 | $22,140 | -$7,303 | $19,213 |
| 9 | $6,354 | $5,001 | $371 | $0 | $632 | $11,056 | $42,193 | $0 | $9,853 | $25,366 |
| 10 | $6,155 | $4,786 | $261 | $0 | $2,018 | $10,932 | $41,642 | $0 | $9,205 | $25,125 |
| original | $0 | -$1,124 | -$2,409 | $0 | -$5,575 | $0 | $17,879 | $0 | -$9,446 | $13,987 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $112,169 | $109,169 | $106,169 | $131,419 | $92,920 |
| 2 | $114,950 | $111,950 | $108,950 | $133,929 | $95,972 |
| 3 | $111,920 | $108,920 | $105,920 | $131,219 | $92,621 |
| 4 | $116,374 | $113,074 | $109,774 | $135,961 | $96,788 |
| 5 | $115,014 | $112,014 | $109,014 | $134,033 | $95,995 |
| 6 | $112,698 | $109,698 | $106,698 | $131,922 | $93,473 |
| 7 | $113,717 | $110,517 | $107,317 | $132,720 | $94,715 |
| 8 | $113,170 | $110,070 | $106,970 | $132,231 | $94,110 |
| 9 | $100,825 | $96,225 | $91,625 | $110,803 | $90,847 |
| 10 | $100,124 | $95,624 | $91,124 | $109,773 | $90,474 |

Why each entry is included:

- **#1** `c1b5d48fca05d`: Highest merit (neighbourhood lower-quartile net P&L $106,501); recommended primary. 2 other pool members produced exactly the same trades.
- **#2** `c9a49d88cab26`: Merit rank 2; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#3** `c07fb69477ca2`: Merit rank 7; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#4** `c3b8f21f114ce`: Merit rank 10; trades and parameters distinct from higher-ranked entries. 12 other pool members produced exactly the same trades.
- **#5** `ce9c3a4eca89c`: Merit rank 15; trades and parameters distinct from higher-ranked entries. 6 other pool members produced exactly the same trades.
- **#6** `c9dfa71ba27de`: Merit rank 18; trades and parameters distinct from higher-ranked entries. 2 other pool members produced exactly the same trades.
- **#7** `c34aedbaced99`: Merit rank 21; trades and parameters distinct from higher-ranked entries. 14 other pool members produced exactly the same trades.
- **#8** `c1eb6ce55873d`: Merit rank 50; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#9** `c44ea29a91917`: Merit rank 64; trades and parameters distinct from higher-ranked entries. 16 other pool members produced exactly the same trades.
- **#10** `c0d06149643fe`: Merit rank 72; trades and parameters distinct from higher-ranked entries. 12 other pool members produced exactly the same trades.

## SPY (Broad US market / large-cap growth ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,120 distinct candidates evaluated, 10,470 passed the gates, 109 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,959, trades 3,880, profitable 1,172, yearConsistency 53, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 2.9%, stop 3.6%, hold 10, lookback 228, material 2.1%, re-entry 6.5%, reset 97.3%. Versus the original VGT defaults: dip 2.9% (original 10.0%); stop 3.6% (original 8.0%); hold (cal. days) 10 (original 15); lookback (sessions) 228 (original 90); material loss 2.1% (original 0.5%); re-entry decline 6.5% (original 3.0%); reset retrace 97.3% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c7ef266f40592` | 2.9% | 3.6% | 10 | 228 | 2.1% | 6.5% | 97.3% | $122,563 | $207,550 | $84,986 | $13,182 (13%) | 69 | 54% | 3.57 | $223 | -$5,713 | 77% | 20 | 90% | $91,133 | $107,201 | 1 | 2 | GA run 1 gen 44 | merit |
| 2 | `c1ec25a5e811c` | 3.0% | 3.6% | 10 | 196 | 2.2% | 6.5% | 99.5% | $120,467 | $201,777 | $81,310 | $13,182 (13%) | 67 | 52% | 3.53 | $135 | -$5,713 | 74% | 20 | 90% | $90,895 | $106,767 | 2 | 3 | GA run 1 gen 47 | merit |
| 3 | `ceeeafdff45e4` | 2.9% | 3.6% | 10 | 143 | 2.1% | 6.5% | 99.5% | $120,243 | $204,054 | $83,811 | $13,182 (13%) | 69 | 52% | 3.51 | $135 | -$5,713 | 76% | 20 | 90% | $89,296 | $107,201 | 5 | 4 | GA run 1 gen 37 | merit |
| 4 | `c1963f58359ba` | 3.9% | 3.6% | 10 | 36 | 1.4% | 6.4% | 97.2% | $113,769 | $182,119 | $68,351 | $15,224 (15%) | 56 | 52% | 3.69 | $136 | -$5,713 | 62% | 18 | 80% | $89,059 | $100,604 | 6 | 9 | GA run 1 gen 37 | merit |
| 5 | `c99f1ef75d18f` | 3.9% | 3.6% | 10 | 39 | 1.4% | 6.4% | 97.5% | $113,576 | $183,463 | $69,888 | $15,417 (15%) | 57 | 51% | 3.68 | $49 | -$5,713 | 64% | 19 | 80% | $87,371 | $98,917 | 8 | 10 | GA run 1 gen 32 | diversity relaxed |
| 6 | `c2235a59e68ec` | 3.0% | 3.6% | 10 | 173 | 2.1% | 6.4% | 97.4% | $122,604 | $205,511 | $82,907 | $13,182 (13%) | 68 | 53% | 3.57 | $179 | -$5,713 | 75% | 20 | 90% | $86,295 | $103,574 | 9 | 1 | GA run 1 gen 46 | diversity relaxed |
| 7 | `c3793ed32cbf4` | 3.4% | 3.6% | 10 | 173 | 2.1% | 6.4% | 97.4% | $111,939 | $189,361 | $77,422 | $13,094 (13%) | 62 | 52% | 3.33 | $92 | -$5,713 | 71% | 20 | 90% | $83,761 | $104,474 | 34 | 1 | GA run 1 gen 44 | merit |
| 8 | `cc745940113b1` | 4.2% | 3.4% | 11 | 197 | 2.1% | 3.5% | 98.9% | $114,339 | $187,783 | $73,444 | $17,399 (17%) | 65 | 54% | 2.76 | $647 | -$9,411 | 67% | 14 | 90% | $81,071 | $109,036 | 63 | 9 | GA run 0 gen 42 | merit |
| 9 | `c0447e7919ba6` | 4.2% | 3.3% | 11 | 219 | 1.8% | 4.7% | 99.2% | $113,574 | $184,275 | $70,701 | $16,151 (16%) | 68 | 56% | 2.88 | $708 | -$9,411 | 64% | 14 | 80% | $77,553 | $99,125 | 84 | 11 | GA run 0 gen 43 | merit |
| 10 | `c0283e8a9d706` | 2.9% | 3.6% | 10 | 35 | 2.0% | 6.6% | 97.3% | $117,639 | $199,431 | $81,792 | $15,333 (15%) | 67 | 54% | 3.49 | $223 | -$5,713 | 74% | 20 | 90% | $77,112 | $97,886 | 92 | 6 | GA run 1 gen 36 | merit |

Original defaults over the same window (for reference): net $12,864, max DD $32,850, 19 trades, interest $20,734.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $9,804 | -$5,936 | $14,558 | $12,305 | $3,513 | $23,041 | $28,646 | $8,566 | $11,003 | $17,063 |
| 2 | $9,804 | -$5,936 | $14,558 | $12,305 | $3,513 | $23,041 | $23,819 | $11,298 | $11,003 | $17,063 |
| 3 | $9,804 | -$5,936 | $14,558 | $12,305 | $3,513 | $23,041 | $25,358 | $9,534 | $11,003 | $17,063 |
| 4 | $2,018 | -$5,725 | $15,079 | $12,412 | -$125 | $23,356 | $32,597 | $12,671 | $4,424 | $17,063 |
| 5 | $2,018 | -$5,725 | $15,079 | $12,412 | -$318 | $23,356 | $32,597 | $12,671 | $4,424 | $17,063 |
| 6 | $9,804 | -$5,936 | $14,558 | $12,305 | $3,513 | $23,041 | $28,646 | $8,607 | $11,003 | $17,063 |
| 7 | $6,393 | -$5,847 | $14,558 | $12,305 | $3,513 | $23,041 | $23,819 | $12,671 | $4,424 | $17,063 |
| 8 | $6,862 | $1,371 | $9,572 | $12,412 | -$1,596 | $24,592 | $21,411 | $12,122 | $8,626 | $18,967 |
| 9 | $7,082 | -$6,808 | $13,047 | $12,412 | -$1,139 | $22,200 | $24,087 | $12,466 | $11,113 | $19,115 |
| 10 | $3,697 | -$5,931 | $14,558 | $12,305 | $4,400 | $23,041 | $28,646 | $8,566 | $11,294 | $17,063 |
| original | $0 | -$1,234 | -$2,414 | $0 | -$5,445 | $0 | $17,501 | $0 | -$9,485 | $13,940 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $122,563 | $115,663 | $108,763 | $145,741 | $99,385 |
| 2 | $120,467 | $113,767 | $107,067 | $142,643 | $98,292 |
| 3 | $120,243 | $113,343 | $106,443 | $143,100 | $97,385 |
| 4 | $113,769 | $108,169 | $102,569 | $132,410 | $95,128 |
| 5 | $113,576 | $107,876 | $102,176 | $132,636 | $94,515 |
| 6 | $122,604 | $115,804 | $109,004 | $145,215 | $99,993 |
| 7 | $111,939 | $105,739 | $99,539 | $133,054 | $90,824 |
| 8 | $114,339 | $107,839 | $101,339 | $134,370 | $94,309 |
| 9 | $113,574 | $106,774 | $99,974 | $132,856 | $94,292 |
| 10 | $117,639 | $110,939 | $104,239 | $139,946 | $95,333 |

Why each entry is included:

- **#1** `c7ef266f40592`: Highest merit (neighbourhood lower-quartile net P&L $91,133); recommended primary. 10 other pool members produced exactly the same trades.
- **#2** `c1ec25a5e811c`: Merit rank 2; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#3** `ceeeafdff45e4`: Merit rank 5; trades and parameters distinct from higher-ranked entries. 5 other pool members produced exactly the same trades.
- **#4** `c1963f58359ba`: Merit rank 6; trades and parameters distinct from higher-ranked entries. 8 other pool members produced exactly the same trades.
- **#5** `c99f1ef75d18f`: Merit rank 8; added in the relaxed pass (within 4 neighbourhood steps of a higher-ranked entry, but trades differently).
- **#6** `c2235a59e68ec`: Merit rank 9; added in the relaxed pass (within 4 neighbourhood steps of a higher-ranked entry, but trades differently).
- **#7** `c3793ed32cbf4`: Merit rank 34; trades and parameters distinct from higher-ranked entries. 39 other pool members produced exactly the same trades.
- **#8** `cc745940113b1`: Merit rank 63; trades and parameters distinct from higher-ranked entries.
- **#9** `c0447e7919ba6`: Merit rank 84; trades and parameters distinct from higher-ranked entries. 6 other pool members produced exactly the same trades.
- **#10** `c0283e8a9d706`: Merit rank 92; trades and parameters distinct from higher-ranked entries.

## SMH (Semiconductor ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,116 distinct candidates evaluated, 8,072 passed the gates, 114 were scored for robustness. Rejections (a candidate can fail several): drawdown 5,158, trades 4,735, profitable 1,311, yearConsistency 20, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 2.3%, stop 2.1%, hold 14, lookback 178, material 9.0%, re-entry 12.6%, reset 49.8%. Versus the original VGT defaults: dip 2.3% (original 10.0%); stop 2.1% (original 8.0%); hold (cal. days) 14 (original 15); lookback (sessions) 178 (original 90); material loss 9.0% (original 0.5%); re-entry decline 12.6% (original 3.0%); reset retrace 49.8% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: dip 2.3% (bound 2.0%); stop 2.1% (bound 2.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `cb967eac6e1c9` | 2.3% | 2.1% | 14 | 178 | 9.0% | 12.6% | 49.8% | $236,931 | $320,983 | $84,052 | $27,883 (28%) | 225 | 71% | 2.03 | $1,081 | -$13,746 | 77% | 12 | 80% | $221,084 | $236,212 | 1 | 12 | GA run 0 gen 38 | merit |
| 2 | `cad26a440b409` | 2.6% | 2.0% | 15 | 144 | 1.0% | 12.3% | 63.5% | $236,603 | $295,099 | $58,496 | $22,034 (22%) | 165 | 73% | 2.76 | $1,314 | -$17,557 | 53% | 11 | 90% | $220,896 | $229,188 | 2 | 3 | GA run 0 gen 43 | merit |
| 3 | `c0348091d88fa` | 2.3% | 2.1% | 14 | 178 | 10.0% | 11.9% | 49.8% | $236,542 | $322,824 | $86,282 | $27,883 (28%) | 233 | 71% | 1.99 | $1,063 | -$13,746 | 79% | 12 | 70% | $216,953 | $236,542 | 4 | 13 | GA run 0 gen 31 | merit |
| 4 | `c0b5c326dd925` | 3.7% | 2.8% | 13 | 137 | 0.7% | 6.1% | 57.1% | $241,177 | $303,682 | $62,504 | $25,521 (26%) | 148 | 66% | 2.74 | $1,066 | -$10,499 | 56% | 13 | 90% | $213,163 | $233,545 | 8 | 1 | GA run 1 gen 42 | merit |
| 5 | `cc4efa30b3c66` | 3.7% | 2.8% | 13 | 153 | 0.9% | 10.1% | 57.1% | $236,302 | $296,425 | $60,123 | $26,902 (27%) | 137 | 65% | 2.76 | $1,162 | -$10,499 | 54% | 13 | 90% | $211,372 | $225,553 | 19 | 6 | GA run 1 gen 32 | merit |
| 6 | `c604c7038947b` | 3.7% | 2.8% | 13 | 176 | 0.8% | 5.6% | 58.0% | $237,359 | $301,189 | $63,830 | $28,287 (28%) | 149 | 64% | 2.56 | $824 | -$10,499 | 57% | 13 | 90% | $210,256 | $224,723 | 21 | 12 | GA run 1 gen 21 | merit |
| 7 | `c16fd4945951e` | 2.8% | 2.0% | 14 | 114 | 0.7% | 12.1% | 57.0% | $231,151 | $286,060 | $54,910 | $17,181 (17%) | 164 | 69% | 2.67 | $1,088 | -$10,103 | 50% | 11 | 100% | $209,707 | $225,861 | 25 | 1 | GA run 0 gen 34 | merit |
| 8 | `c8d5b003fce8b` | 3.2% | 2.9% | 13 | 79 | 0.9% | 5.6% | 62.0% | $241,004 | $310,862 | $69,858 | $20,213 (20%) | 152 | 62% | 2.62 | $806 | -$11,435 | 63% | 13 | 100% | $200,309 | $227,844 | 42 | 1 | GA run 1 gen 45 | merit |
| 9 | `c548c2c750c95` | 3.7% | 3.0% | 12 | 143 | 0.7% | 12.0% | 57.1% | $246,597 | $308,890 | $62,293 | $26,073 (26%) | 135 | 63% | 3.19 | $824 | -$9,062 | 56% | 12 | 90% | $199,583 | $220,569 | 43 | 1 | GA run 1 gen 45 | merit |
| 10 | `c2c87017e425d` | 3.2% | 2.9% | 13 | 154 | 0.8% | 6.6% | 57.1% | $238,912 | $307,534 | $68,622 | $28,360 (28%) | 151 | 63% | 2.53 | $824 | -$10,499 | 62% | 13 | 90% | $197,997 | $211,985 | 44 | 12 | GA run 1 gen 42 | merit |

Original defaults over the same window (for reference): net $78,883, max DD $34,747, 43 trades, interest $49,455.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $22,335 | -$3,908 | $18,966 | $22,430 | $409 | $52,049 | $41,500 | $44,987 | -$11,987 | $50,151 |
| 2 | $16,446 | -$3,597 | $44,307 | $12,830 | $9,841 | $42,055 | $36,553 | $41,156 | $7,409 | $29,603 |
| 3 | $22,335 | -$3,908 | $18,966 | $22,430 | -$7,306 | $52,049 | $44,102 | $49,711 | -$11,987 | $50,151 |
| 4 | $7,808 | $13,380 | $28,630 | $2,469 | -$6,640 | $45,537 | $48,762 | $22,324 | $27,846 | $51,061 |
| 5 | $11,353 | $18,944 | $27,124 | $2,469 | -$2,184 | $46,548 | $48,762 | $19,864 | $34,167 | $29,253 |
| 6 | $11,353 | $13,380 | $27,011 | $2,469 | -$10,050 | $45,537 | $48,762 | $23,962 | $23,872 | $51,061 |
| 7 | $6,918 | $6,134 | $37,211 | $8,341 | $11,280 | $51,647 | $27,164 | $37,506 | $6,049 | $38,901 |
| 8 | $21,295 | $16,695 | $14,722 | $17,025 | $6,212 | $47,917 | $34,668 | $17,024 | $24,731 | $40,714 |
| 9 | $7,800 | $11,033 | $42,338 | $8,207 | -$7,362 | $46,151 | $47,395 | $32,860 | $28,939 | $29,235 |
| 10 | $21,295 | $14,794 | $14,144 | $17,685 | -$10,696 | $50,285 | $43,841 | $18,804 | $19,807 | $48,953 |
| original | $18,776 | -$3,264 | $514 | $0 | -$6,702 | $48,566 | $1,134 | $11,547 | -$13,408 | $21,720 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $236,931 | $214,431 | $191,931 | $259,854 | $214,007 |
| 2 | $236,603 | $220,103 | $203,603 | $252,556 | $220,649 |
| 3 | $236,542 | $213,242 | $189,942 | $260,074 | $213,011 |
| 4 | $241,177 | $226,377 | $211,577 | $258,224 | $224,131 |
| 5 | $236,302 | $222,602 | $208,902 | $252,699 | $219,905 |
| 6 | $237,359 | $222,459 | $207,559 | $254,767 | $219,951 |
| 7 | $231,151 | $214,751 | $198,351 | $246,126 | $216,175 |
| 8 | $241,004 | $225,804 | $210,604 | $260,056 | $221,952 |
| 9 | $246,597 | $233,097 | $219,597 | $263,586 | $229,608 |
| 10 | $238,912 | $223,812 | $208,712 | $257,627 | $220,197 |

Why each entry is included:

- **#1** `cb967eac6e1c9`: Highest merit (neighbourhood lower-quartile net P&L $221,084); recommended primary.
- **#2** `cad26a440b409`: Merit rank 2; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#3** `c0348091d88fa`: Merit rank 4; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#4** `c0b5c326dd925`: Merit rank 8; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#5** `cc4efa30b3c66`: Merit rank 19; trades and parameters distinct from higher-ranked entries.
- **#6** `c604c7038947b`: Merit rank 21; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.
- **#7** `c16fd4945951e`: Merit rank 25; trades and parameters distinct from higher-ranked entries.
- **#8** `c8d5b003fce8b`: Merit rank 42; trades and parameters distinct from higher-ranked entries.
- **#9** `c548c2c750c95`: Merit rank 43; trades and parameters distinct from higher-ranked entries.
- **#10** `c2c87017e425d`: Merit rank 44; trades and parameters distinct from higher-ranked entries.

## SOXX (Semiconductor ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,121 distinct candidates evaluated, 7,847 passed the gates, 120 were scored for robustness. Rejections (a candidate can fail several): drawdown 4,525, trades 5,744, profitable 970, yearConsistency 28, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 3.5%, stop 3.1%, hold 14, lookback 160, material 2.6%, re-entry 8.4%, reset 78.5%. Versus the original VGT defaults: dip 3.5% (original 10.0%); stop 3.1% (original 8.0%); hold (cal. days) 14 (original 15); lookback (sessions) 160 (original 90); material loss 2.6% (original 0.5%); re-entry decline 8.4% (original 3.0%); reset retrace 78.5% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `ceea67e5d2d0f` | 3.5% | 3.1% | 14 | 160 | 2.6% | 8.4% | 78.5% | $194,610 | $256,903 | $62,293 | $25,056 (25%) | 125 | 61% | 2.24 | $1,275 | -$16,346 | 56% | 14 | 90% | $183,094 | $193,738 | 1 | 5 | GA run 0 gen 34 | merit |
| 2 | `cc1e6b57c6cf8` | 3.3% | 3.1% | 14 | 90 | 2.9% | 8.5% | 98.2% | $185,538 | $244,003 | $58,466 | $25,056 (25%) | 121 | 60% | 2.26 | $1,275 | -$16,346 | 53% | 14 | 100% | $172,379 | $185,484 | 2 | 6 | GA run 0 gen 45 | merit |
| 3 | `c392c0543152e` | 3.3% | 3.1% | 8 | 90 | 2.9% | 5.1% | 98.4% | $178,607 | $242,859 | $64,252 | $22,097 (22%) | 170 | 55% | 1.94 | $653 | -$9,701 | 58% | 9 | 90% | $169,122 | $176,798 | 5 | 5 | GA run 0 gen 41 | merit |
| 4 | `c2c48e3958f2c` | 3.2% | 3.1% | 8 | 141 | 2.3% | 8.4% | 91.2% | $185,063 | $240,576 | $55,512 | $22,813 (23%) | 149 | 55% | 2.16 | $551 | -$8,519 | 50% | 9 | 80% | $167,694 | $185,063 | 6 | 5 | GA run 0 gen 38 | merit |
| 5 | `c7b379f1fcb07` | 5.2% | 3.1% | 16 | 151 | 3.3% | 8.3% | 47.1% | $178,949 | $241,484 | $62,534 | $29,021 (29%) | 121 | 69% | 2.06 | $1,800 | -$17,147 | 56% | 16 | 70% | $167,196 | $178,949 | 7 | 8 | GA run 0 gen 22 | merit |
| 6 | `c126190f05c4b` | 3.2% | 3.1% | 8 | 146 | 2.9% | 8.5% | 98.4% | $207,587 | $268,765 | $61,178 | $20,045 (20%) | 157 | 56% | 2.21 | $641 | -$9,311 | 56% | 9 | 90% | $166,666 | $198,911 | 8 | 2 | GA run 0 gen 36 | merit |
| 7 | `cbb45bf9f6363` | 3.0% | 2.1% | 21 | 27 | 0.2% | 5.4% | 34.6% | $194,503 | $264,210 | $69,707 | $29,311 (29%) | 172 | 74% | 1.94 | $1,316 | -$22,625 | 63% | 11 | 80% | $165,288 | $169,904 | 10 | 6 | GA run 0 gen 40 | merit |
| 8 | `c63bf3c6208ec` | 3.4% | 3.1% | 16 | 40 | 2.6% | 8.3% | 97.8% | $174,526 | $238,266 | $63,740 | $29,540 (30%) | 119 | 65% | 2.01 | $1,438 | -$17,816 | 57% | 16 | 90% | $165,104 | $171,543 | 11 | 11 | GA run 0 gen 26 | merit |
| 9 | `c223ad8e3daea` | 3.3% | 2.1% | 18 | 170 | 3.1% | 8.5% | 98.4% | $196,288 | $253,458 | $57,170 | $26,587 (27%) | 142 | 73% | 2.27 | $1,260 | -$17,890 | 51% | 12 | 90% | $162,432 | $186,188 | 13 | 5 | GA run 0 gen 43 | merit |
| 10 | `c30a281d05af5` | 3.4% | 3.1% | 20 | 141 | 2.6% | 8.3% | 98.1% | $186,248 | $250,259 | $64,011 | $29,536 (30%) | 113 | 70% | 2.15 | $2,315 | -$23,697 | 58% | 20 | 80% | $162,291 | $185,886 | 14 | 7 | GA run 0 gen 31 | merit |

Original defaults over the same window (for reference): net $104,186, max DD $31,441, 44 trades, interest $54,488.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $30,847 | $4,934 | $29,484 | $10,780 | -$4,647 | $31,926 | $45,509 | $18,339 | $10,253 | $17,186 |
| 2 | $22,955 | $3,025 | $19,876 | $10,780 | $3,113 | $29,785 | $40,694 | $19,004 | $10,253 | $26,054 |
| 3 | $7,532 | -$4,135 | $19,297 | $12,051 | $17,729 | $53,257 | $41,358 | $19,042 | $10,307 | $2,169 |
| 4 | -$1,864 | -$1,173 | $19,297 | $11,680 | $27,453 | $45,143 | $39,147 | $19,698 | $7,679 | $18,003 |
| 5 | $24,233 | -$1,543 | $19,338 | $9,432 | -$6,734 | $41,759 | $39,987 | $25,215 | -$1,906 | $29,169 |
| 6 | $13,068 | -$4,135 | $19,297 | $11,680 | $27,453 | $45,143 | $39,147 | $25,387 | $12,543 | $18,003 |
| 7 | -$1,262 | $2,319 | $22,288 | $15,656 | -$2,225 | $66,136 | $3,902 | $39,716 | $24,125 | $23,848 |
| 8 | $2,151 | $4,043 | $16,766 | $20,159 | $9,663 | $49,360 | $29,309 | $11,755 | -$8,605 | $39,924 |
| 9 | $1,738 | $8,334 | $50,324 | $11,522 | $6,141 | $42,859 | $20,394 | $32,009 | -$6,203 | $29,169 |
| 10 | $262 | -$2,868 | $18,587 | $28,007 | $12,675 | $51,261 | $38,538 | $14,382 | -$9,717 | $35,121 |
| original | $20,215 | -$4,058 | $524 | $16,842 | -$6,563 | $41,454 | $13,280 | $7,192 | -$8,901 | $24,202 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $194,610 | $182,110 | $169,610 | $211,599 | $177,621 |
| 2 | $185,538 | $173,438 | $161,338 | $201,483 | $169,592 |
| 3 | $178,607 | $161,607 | $144,607 | $196,130 | $161,083 |
| 4 | $185,063 | $170,163 | $155,263 | $200,203 | $169,923 |
| 5 | $178,949 | $166,849 | $154,749 | $196,004 | $161,895 |
| 6 | $207,587 | $191,887 | $176,187 | $224,272 | $190,902 |
| 7 | $194,503 | $177,303 | $160,103 | $213,514 | $175,492 |
| 8 | $174,526 | $162,626 | $150,726 | $191,909 | $157,142 |
| 9 | $196,288 | $182,088 | $167,888 | $211,880 | $180,696 |
| 10 | $186,248 | $174,948 | $163,648 | $203,705 | $168,790 |

Why each entry is included:

- **#1** `ceea67e5d2d0f`: Highest merit (neighbourhood lower-quartile net P&L $183,094); recommended primary.
- **#2** `cc1e6b57c6cf8`: Merit rank 2; trades and parameters distinct from higher-ranked entries.
- **#3** `c392c0543152e`: Merit rank 5; trades and parameters distinct from higher-ranked entries.
- **#4** `c2c48e3958f2c`: Merit rank 6; trades and parameters distinct from higher-ranked entries.
- **#5** `c7b379f1fcb07`: Merit rank 7; trades and parameters distinct from higher-ranked entries.
- **#6** `c126190f05c4b`: Merit rank 8; trades and parameters distinct from higher-ranked entries.
- **#7** `cbb45bf9f6363`: Merit rank 10; trades and parameters distinct from higher-ranked entries.
- **#8** `c63bf3c6208ec`: Merit rank 11; trades and parameters distinct from higher-ranked entries.
- **#9** `c223ad8e3daea`: Merit rank 13; trades and parameters distinct from higher-ranked entries.
- **#10** `c30a281d05af5`: Merit rank 14; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.

## VUG (Diversified growth ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,121 distinct candidates evaluated, 7,940 passed the gates, 102 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,422, trades 6,485, profitable 1,590, yearConsistency 11, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 4.1%, stop 5.7%, hold 14, lookback 101, material 0.8%, re-entry 3.8%, reset 33.7%. Versus the original VGT defaults: dip 4.1% (original 10.0%); stop 5.7% (original 8.0%); hold (cal. days) 14 (original 15); lookback (sessions) 101 (original 90); material loss 0.8% (original 0.5%); re-entry decline 3.8% (original 3.0%); reset retrace 33.7% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c500e0b8f43c7` | 4.1% | 5.7% | 14 | 101 | 0.8% | 3.8% | 33.7% | $121,341 | $223,083 | $101,742 | $21,873 (22%) | 58 | 45% | 2.56 | -$177 | -$8,459 | 92% | 24 | 90% | $108,906 | $111,092 | 1 | 1 | GA run 0 gen 46 | merit |
| 2 | `c4c6bad52edc2` | 22.1% | 7.6% | 5 | 247 | 0.9% | 4.0% | 34.4% | $109,411 | $132,104 | $22,693 | $15,332 (15%) | 14 | 50% | 9.20 | $793 | -$3,469 | 21% | 26 | 100% | $101,085 | $107,210 | 8 | 2 | GA run 1 gen 27 | merit |
| 3 | `cf20a01120bdd` | 4.1% | 5.9% | 14 | 110 | 0.3% | 3.7% | 38.0% | $108,731 | $209,509 | $100,778 | $29,534 (30%) | 56 | 46% | 2.47 | -$80 | -$8,459 | 92% | 23 | 70% | $96,392 | $108,731 | 14 | 5 | GA run 0 gen 29 | merit |
| 4 | `cce6b2d39d0d3` | 9.4% | 5.9% | 11 | 157 | 3.3% | 9.4% | 54.5% | $102,803 | $140,926 | $38,123 | $22,387 (22%) | 34 | 53% | 3.43 | $818 | -$7,236 | 35% | 19 | 100% | $95,040 | $102,297 | 15 | 7 | GA run 1 gen 19 | merit |
| 5 | `c6b819cc64cf7` | 5.0% | 3.7% | 14 | 90 | 4.5% | 8.9% | 46.1% | $104,501 | $175,413 | $70,912 | $25,112 (25%) | 70 | 60% | 2.44 | $306 | -$14,308 | 65% | 15 | 80% | $94,553 | $100,662 | 16 | 5 | GA run 0 gen 21 | merit |
| 6 | `c66016720f71c` | 21.6% | 7.7% | 9 | 101 | 0.9% | 4.6% | 95.2% | $99,368 | $116,546 | $17,178 | $14,721 (15%) | 10 | 70% | 11.91 | $4,470 | -$3,469 | 16% | 36 | 100% | $91,604 | $97,710 | 18 | 2 | GA run 0 gen 37 | merit |
| 7 | `c8d4e7bfd1ec1` | 21.6% | 7.5% | 9 | 99 | 0.1% | 3.4% | 93.7% | $99,198 | $116,467 | $17,268 | $16,115 (16%) | 10 | 70% | 11.89 | $4,699 | -$3,469 | 16% | 36 | 100% | $91,198 | $97,913 | 21 | 4 | GA run 0 gen 44 | merit |
| 8 | `cb0fa96f5e752` | 4.1% | 5.9% | 14 | 216 | 0.5% | 3.7% | 78.1% | $108,152 | $198,774 | $90,622 | $19,721 (20%) | 48 | 50% | 2.83 | $111 | -$8,459 | 83% | 23 | 80% | $91,170 | $108,152 | 22 | 3 | GA run 0 gen 27 | merit |
| 9 | `c481903b2b42e` | 4.1% | 5.6% | 13 | 110 | 1.6% | 3.7% | 26.1% | $102,920 | $204,632 | $101,712 | $28,005 (28%) | 62 | 45% | 2.21 | -$285 | -$11,778 | 92% | 22 | 80% | $90,750 | $100,406 | 24 | 8 | GA run 0 gen 24 | merit |
| 10 | `cbb7aab5e0ed2` | 5.2% | 3.8% | 12 | 203 | 4.5% | 8.9% | 89.3% | $103,301 | $177,528 | $74,227 | $26,146 (26%) | 67 | 51% | 2.21 | $113 | -$14,308 | 67% | 15 | 70% | $89,004 | $100,943 | 36 | 7 | GA run 0 gen 17 | merit |

Original defaults over the same window (for reference): net $36,876, max DD $35,119, 24 trades, interest $31,282.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $9,727 | $1,653 | $330 | $18,007 | $210 | $23,601 | $40,135 | $11,017 | -$12,080 | $28,739 |
| 2 | $0 | $0 | $0 | $0 | $7,403 | $9,895 | $57,676 | $0 | $12,543 | $21,893 |
| 3 | $9,500 | -$1,026 | $4,842 | $18,007 | -$12,203 | $22,322 | $51,511 | $15,270 | -$19,712 | $20,220 |
| 4 | $0 | $4,894 | $1,151 | $0 | $5,922 | $12,293 | $26,435 | $5,377 | $7,389 | $39,341 |
| 5 | $15,385 | -$962 | -$720 | $17,985 | $76 | $17,852 | $4,976 | $11,545 | $3,719 | $34,645 |
| 6 | $0 | $0 | $0 | $0 | $7,403 | $9,763 | $57,497 | $0 | $18,536 | $6,169 |
| 7 | $0 | $0 | $0 | $0 | $7,403 | $10,027 | $57,856 | $0 | $17,504 | $6,408 |
| 8 | $9,500 | -$1,026 | $4,842 | $18,007 | $1,444 | $23,180 | $51,511 | $15,270 | -$14,577 | $0 |
| 9 | $9,840 | $468 | $2,281 | $18,007 | -$11,017 | $23,074 | $32,343 | $15,220 | -$18,667 | $31,369 |
| 10 | $14,874 | -$1,292 | -$2,911 | $17,985 | $673 | $19,783 | $9,663 | $23,927 | -$16,062 | $36,660 |
| original | $0 | $2,656 | -$6,577 | $0 | -$11,419 | $3,970 | $57,761 | -$4,174 | -$21,139 | $15,799 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $121,341 | $115,541 | $109,741 | $149,089 | $93,593 |
| 2 | $109,411 | $108,011 | $106,611 | $115,600 | $103,222 |
| 3 | $108,731 | $103,131 | $97,531 | $136,216 | $81,246 |
| 4 | $102,803 | $99,403 | $96,003 | $113,200 | $92,406 |
| 5 | $104,501 | $97,501 | $90,501 | $123,840 | $85,161 |
| 6 | $99,368 | $98,368 | $97,368 | $104,053 | $94,683 |
| 7 | $99,198 | $98,198 | $97,198 | $103,908 | $94,489 |
| 8 | $108,152 | $103,352 | $98,552 | $132,867 | $83,437 |
| 9 | $102,920 | $96,720 | $90,520 | $130,659 | $75,180 |
| 10 | $103,301 | $96,601 | $89,901 | $123,545 | $83,057 |

Why each entry is included:

- **#1** `c500e0b8f43c7`: Highest merit (neighbourhood lower-quartile net P&L $108,906); recommended primary. 1 other pool members produced exactly the same trades.
- **#2** `c4c6bad52edc2`: Merit rank 8; trades and parameters distinct from higher-ranked entries. 9 other pool members produced exactly the same trades. Caveat: few trades.
- **#3** `cf20a01120bdd`: Merit rank 14; trades and parameters distinct from higher-ranked entries.
- **#4** `cce6b2d39d0d3`: Merit rank 15; trades and parameters distinct from higher-ranked entries.
- **#5** `c6b819cc64cf7`: Merit rank 16; trades and parameters distinct from higher-ranked entries.
- **#6** `c66016720f71c`: Merit rank 18; trades and parameters distinct from higher-ranked entries. 8 other pool members produced exactly the same trades. Caveat: few trades.
- **#7** `c8d4e7bfd1ec1`: Merit rank 21; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#8** `cb0fa96f5e752`: Merit rank 22; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.
- **#9** `c481903b2b42e`: Merit rank 24; trades and parameters distinct from higher-ranked entries.
- **#10** `cbb7aab5e0ed2`: Merit rank 36; trades and parameters distinct from higher-ranked entries.

## SCHG (Diversified growth ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,121 distinct candidates evaluated, 8,869 passed the gates, 101 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,707, trades 5,485, profitable 1,309, yearConsistency 35, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 4.7%, stop 3.5%, hold 11, lookback 98, material 1.1%, re-entry 1.8%, reset 61.1%. Versus the original VGT defaults: dip 4.7% (original 10.0%); stop 3.5% (original 8.0%); hold (cal. days) 11 (original 15); lookback (sessions) 98 (original 90); material loss 1.1% (original 0.5%); re-entry decline 1.8% (original 3.0%); reset retrace 61.1% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `cdb82c9a686c1` | 4.7% | 3.5% | 11 | 98 | 1.1% | 1.8% | 61.1% | $144,130 | $215,826 | $71,696 | $21,627 (22%) | 67 | 63% | 3.00 | $1,036 | -$11,576 | 65% | 16 | 80% | $128,794 | $140,024 | 1 | 3 | GA run 0 gen 40 | merit |
| 2 | `c423656b5e875` | 6.4% | 2.2% | 13 | 112 | 1.8% | 5.2% | 43.2% | $141,489 | $178,436 | $36,948 | $16,393 (16%) | 83 | 70% | 3.10 | $1,426 | -$11,576 | 33% | 13 | 100% | $124,371 | $132,619 | 3 | 1 | GA run 1 gen 29 | merit |
| 3 | `cd5fc1a0cd513` | 6.4% | 2.2% | 13 | 87 | 1.8% | 5.3% | 57.8% | $134,194 | $169,364 | $35,170 | $16,393 (16%) | 79 | 70% | 3.00 | $1,315 | -$11,576 | 32% | 13 | 100% | $119,345 | $122,940 | 12 | 4 | GA run 1 gen 33 | merit |
| 4 | `c8ccdf3709b8d` | 5.4% | 3.6% | 11 | 57 | 1.5% | 4.5% | 56.6% | $134,584 | $198,595 | $64,011 | $17,787 (18%) | 64 | 61% | 3.05 | $630 | -$8,710 | 58% | 13 | 90% | $117,845 | $125,897 | 16 | 5 | GA run 0 gen 44 | merit |
| 5 | `c3763d854102c` | 6.4% | 2.3% | 13 | 85 | 1.8% | 5.2% | 82.1% | $132,999 | $167,716 | $34,718 | $16,280 (16%) | 76 | 68% | 2.98 | $1,530 | -$11,576 | 31% | 13 | 100% | $114,597 | $118,554 | 24 | 4 | GA run 1 gen 29 | merit |
| 6 | `ccefd011d045e` | 7.4% | 4.5% | 9 | 63 | 1.0% | 4.6% | 61.4% | $135,757 | $177,527 | $41,770 | $15,714 (16%) | 47 | 57% | 4.93 | $796 | -$3,976 | 38% | 13 | 90% | $112,673 | $122,270 | 29 | 1 | GA run 0 gen 45 | merit |
| 7 | `c5a7b950b9440` | 6.4% | 2.1% | 14 | 72 | 0.9% | 5.3% | 45.1% | $128,479 | $160,032 | $31,553 | $13,783 (14%) | 75 | 75% | 3.27 | $1,284 | -$8,203 | 29% | 11 | 100% | $111,620 | $118,319 | 32 | 3 | GA run 1 gen 32 | merit |
| 8 | `cfb855174bdfb` | 4.7% | 3.5% | 11 | 52 | 1.4% | 1.8% | 61.5% | $133,086 | $205,415 | $72,329 | $21,627 (22%) | 68 | 60% | 2.73 | $738 | -$11,576 | 65% | 16 | 80% | $111,295 | $127,895 | 35 | 8 | GA run 0 gen 33 | merit |
| 9 | `c690376797631` | 6.4% | 2.3% | 13 | 216 | 1.8% | 5.2% | 46.1% | $130,526 | $169,372 | $38,847 | $16,280 (16%) | 82 | 67% | 2.81 | $1,450 | -$11,576 | 35% | 13 | 90% | $110,975 | $119,284 | 36 | 4 | GA run 1 gen 46 | merit |
| 10 | `c94581e7b626c` | 6.8% | 2.1% | 13 | 101 | 1.7% | 6.5% | 53.1% | $128,553 | $158,871 | $30,318 | $16,347 (16%) | 70 | 71% | 3.50 | $1,254 | -$11,576 | 28% | 12 | 100% | $110,333 | $120,250 | 41 | 5 | GA run 1 gen 20 | merit |

Original defaults over the same window (for reference): net $69,657, max DD $38,804, 24 trades, interest $51,866.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $16,903 | -$730 | $5,007 | $18,539 | $5,193 | $26,468 | $26,432 | $14,951 | -$10,214 | $41,582 |
| 2 | $8,633 | $4,361 | $2,234 | $0 | $10,620 | $20,116 | $28,590 | $27,347 | $16,113 | $23,474 |
| 3 | $8,633 | $2,959 | $2,899 | $0 | $10,620 | $17,484 | $28,590 | $27,347 | $16,113 | $19,548 |
| 4 | $12,407 | $2,442 | $10,472 | $18,742 | $8,467 | $13,850 | $20,575 | $19,084 | -$5,858 | $34,403 |
| 5 | $8,603 | $2,706 | $1,529 | $0 | $12,230 | $18,289 | $26,894 | $28,389 | $15,238 | $19,122 |
| 6 | $5,852 | $246 | $4,894 | $0 | -$1,065 | $16,434 | $35,338 | $19,577 | $5,465 | $49,016 |
| 7 | $8,633 | $1,306 | $755 | $0 | $12,514 | $16,840 | $25,412 | $27,883 | $20,889 | $14,248 |
| 8 | $16,903 | -$730 | $5,007 | $18,539 | $5,193 | $26,468 | $19,859 | $19,199 | -$13,866 | $36,514 |
| 9 | $8,603 | $4,108 | -$1,089 | $0 | $12,230 | $20,559 | $26,894 | $28,389 | $15,238 | $15,594 |
| 10 | $8,633 | $4,362 | $2,884 | $0 | $10,281 | $16,660 | $29,330 | $22,154 | $9,861 | $24,388 |
| original | $0 | $1,729 | $4,287 | $22,574 | -$13,843 | $2,778 | $43,182 | $4,520 | -$11,684 | $16,112 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $144,130 | $137,430 | $130,730 | $163,683 | $124,576 |
| 2 | $141,489 | $133,189 | $124,889 | $151,565 | $131,412 |
| 3 | $134,194 | $126,294 | $118,394 | $143,785 | $124,602 |
| 4 | $134,584 | $128,184 | $121,784 | $152,041 | $117,126 |
| 5 | $132,999 | $125,399 | $117,799 | $142,467 | $123,530 |
| 6 | $135,757 | $131,057 | $126,357 | $147,149 | $124,365 |
| 7 | $128,479 | $120,979 | $113,479 | $137,085 | $119,874 |
| 8 | $133,086 | $126,286 | $119,486 | $152,812 | $113,360 |
| 9 | $130,526 | $122,326 | $114,126 | $141,120 | $119,931 |
| 10 | $128,553 | $121,553 | $114,553 | $136,821 | $120,285 |

Why each entry is included:

- **#1** `cdb82c9a686c1`: Highest merit (neighbourhood lower-quartile net P&L $128,794); recommended primary.
- **#2** `c423656b5e875`: Merit rank 3; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#3** `cd5fc1a0cd513`: Merit rank 12; trades and parameters distinct from higher-ranked entries.
- **#4** `c8ccdf3709b8d`: Merit rank 16; trades and parameters distinct from higher-ranked entries.
- **#5** `c3763d854102c`: Merit rank 24; trades and parameters distinct from higher-ranked entries.
- **#6** `ccefd011d045e`: Merit rank 29; trades and parameters distinct from higher-ranked entries.
- **#7** `c5a7b950b9440`: Merit rank 32; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.
- **#8** `cfb855174bdfb`: Merit rank 35; trades and parameters distinct from higher-ranked entries.
- **#9** `c690376797631`: Merit rank 36; trades and parameters distinct from higher-ranked entries.
- **#10** `c94581e7b626c`: Merit rank 41; trades and parameters distinct from higher-ranked entries.

## IWF (Diversified growth ETFs)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,118 distinct candidates evaluated, 9,667 passed the gates, 111 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,930, trades 4,409, profitable 1,292, yearConsistency 18, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 4.9%, stop 3.1%, hold 10, lookback 152, material 2.9%, re-entry 3.6%, reset 74.2%. Versus the original VGT defaults: dip 4.9% (original 10.0%); stop 3.1% (original 8.0%); hold (cal. days) 10 (original 15); lookback (sessions) 152 (original 90); material loss 2.9% (original 0.5%); re-entry decline 3.6% (original 3.0%); reset retrace 74.2% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c3da8d0b09417` | 4.9% | 3.1% | 10 | 152 | 2.9% | 3.6% | 74.2% | $148,505 | $218,634 | $70,129 | $16,856 (17%) | 83 | 60% | 2.87 | $855 | -$6,008 | 63% | 12 | 100% | $125,255 | $136,086 | 1 | 10 | GA run 1 gen 34 | merit |
| 2 | `ca11a28b2b794` | 4.8% | 3.1% | 10 | 170 | 2.9% | 3.4% | 83.2% | $148,902 | $217,493 | $68,592 | $16,856 (17%) | 82 | 61% | 2.98 | $1,001 | -$6,008 | 62% | 12 | 100% | $125,010 | $132,455 | 10 | 9 | GA run 1 gen 35 | merit |
| 3 | `c9ce70d57e0a7` | 4.8% | 3.0% | 10 | 150 | 2.9% | 3.4% | 93.9% | $153,186 | $218,432 | $65,247 | $16,740 (17%) | 80 | 64% | 3.06 | $1,105 | -$6,008 | 59% | 12 | 90% | $124,738 | $136,347 | 11 | 2 | GA run 1 gen 46 | merit |
| 4 | `c841a6266ef57` | 4.8% | 3.1% | 10 | 138 | 2.8% | 3.5% | 64.3% | $149,289 | $219,839 | $70,551 | $16,856 (17%) | 84 | 61% | 2.88 | $1,001 | -$6,008 | 64% | 12 | 100% | $122,057 | $133,773 | 28 | 8 | GA run 1 gen 37 | merit |
| 5 | `c79fdd3f101d8` | 4.4% | 3.0% | 11 | 46 | 2.9% | 3.6% | 87.8% | $148,032 | $216,413 | $68,381 | $16,399 (16%) | 81 | 64% | 2.87 | $960 | -$9,855 | 62% | 13 | 80% | $121,339 | $139,827 | 32 | 1 | GA run 1 gen 45 | merit |
| 6 | `c32c10a109eda` | 4.8% | 3.0% | 11 | 47 | 2.9% | 3.6% | 67.4% | $145,344 | $211,976 | $66,633 | $16,399 (16%) | 73 | 64% | 2.93 | $1,139 | -$9,855 | 60% | 13 | 90% | $117,237 | $132,954 | 51 | 2 | GA run 1 gen 36 | merit |
| 7 | `cf64b8b923bd2` | 4.8% | 3.0% | 10 | 172 | 2.9% | 3.7% | 65.1% | $148,335 | $216,445 | $68,110 | $16,740 (17%) | 84 | 62% | 2.77 | $798 | -$6,008 | 62% | 12 | 90% | $114,468 | $134,422 | 57 | 4 | GA run 1 gen 45 | merit |
| 8 | `c64309bb53859` | 4.4% | 2.0% | 10 | 197 | 2.2% | 3.9% | 82.8% | $134,050 | $175,760 | $41,710 | $13,912 (14%) | 99 | 70% | 2.75 | $1,364 | -$11,152 | 37% | 11 | 100% | $112,592 | $122,789 | 62 | 1 | GA run 1 gen 39 | merit |
| 9 | `c0b5e6c265edb` | 4.4% | 2.9% | 10 | 83 | 1.7% | 4.0% | 82.8% | $144,544 | $202,708 | $58,164 | $15,217 (15%) | 71 | 68% | 3.23 | $1,147 | -$6,046 | 52% | 12 | 100% | $111,827 | $127,074 | 64 | 1 | GA run 1 gen 43 | merit |
| 10 | `c565aa93cb163` | 4.4% | 2.0% | 10 | 169 | 1.7% | 3.5% | 82.8% | $133,994 | $173,473 | $39,479 | $13,912 (14%) | 91 | 71% | 2.80 | $1,427 | -$11,152 | 35% | 11 | 100% | $110,809 | $126,945 | 67 | 2 | GA run 1 gen 43 | merit |

Original defaults over the same window (for reference): net $85,220, max DD $37,771, 24 trades, interest $58,586.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $10,477 | $1,444 | $11,278 | $20,670 | $3,437 | $27,609 | $20,268 | $21,886 | $746 | $30,690 |
| 2 | $10,477 | $1,444 | $10,564 | $20,465 | $3,431 | $27,609 | $18,822 | $24,654 | $746 | $30,690 |
| 3 | $10,586 | -$5,329 | $17,546 | $20,465 | $5,230 | $27,815 | $19,776 | $25,173 | $1,814 | $30,110 |
| 4 | $10,477 | $1,444 | $10,564 | $20,465 | $3,431 | $27,609 | $21,977 | $21,886 | $746 | $30,690 |
| 5 | $15,624 | -$496 | $11,504 | $20,670 | $8,116 | $22,853 | $16,820 | $24,667 | -$1,268 | $29,541 |
| 6 | $16,886 | $755 | $13,150 | $20,670 | $7,074 | $26,098 | $14,610 | $22,514 | -$3,508 | $27,094 |
| 7 | $10,586 | -$3,920 | $10,790 | $20,465 | $5,230 | $27,815 | $22,931 | $22,514 | $1,814 | $30,110 |
| 8 | $8,742 | $9,771 | $7,469 | $0 | $12,697 | $23,507 | $36,906 | $23,198 | $7,146 | $4,616 |
| 9 | $9,739 | $6,234 | $11,692 | $20,465 | $7,047 | $14,586 | $31,412 | $26,840 | $2,418 | $14,111 |
| 10 | $8,742 | $9,771 | $7,469 | $0 | $12,697 | $19,258 | $36,906 | $23,198 | $5,780 | $10,174 |
| original | $0 | -$758 | $7,832 | $24,353 | -$13,922 | $3,312 | $52,036 | $19,846 | -$23,715 | $16,235 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $148,505 | $140,205 | $131,905 | $167,631 | $129,379 |
| 2 | $148,902 | $140,702 | $132,502 | $167,608 | $130,195 |
| 3 | $153,186 | $145,186 | $137,186 | $170,980 | $135,391 |
| 4 | $149,289 | $140,889 | $132,489 | $168,530 | $130,048 |
| 5 | $148,032 | $139,932 | $131,832 | $166,682 | $129,383 |
| 6 | $145,344 | $138,044 | $130,744 | $163,516 | $127,171 |
| 7 | $148,335 | $139,935 | $131,535 | $166,910 | $129,760 |
| 8 | $134,050 | $124,150 | $114,250 | $145,426 | $122,675 |
| 9 | $144,544 | $137,444 | $130,344 | $160,407 | $128,681 |
| 10 | $133,994 | $124,894 | $115,794 | $144,761 | $123,227 |

Why each entry is included:

- **#1** `c3da8d0b09417`: Highest merit (neighbourhood lower-quartile net P&L $125,255); recommended primary. 2 other pool members produced exactly the same trades.
- **#2** `ca11a28b2b794`: Merit rank 10; trades and parameters distinct from higher-ranked entries. 5 other pool members produced exactly the same trades.
- **#3** `c9ce70d57e0a7`: Merit rank 11; trades and parameters distinct from higher-ranked entries.
- **#4** `c841a6266ef57`: Merit rank 28; trades and parameters distinct from higher-ranked entries. 6 other pool members produced exactly the same trades.
- **#5** `c79fdd3f101d8`: Merit rank 32; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#6** `c32c10a109eda`: Merit rank 51; trades and parameters distinct from higher-ranked entries.
- **#7** `cf64b8b923bd2`: Merit rank 57; trades and parameters distinct from higher-ranked entries.
- **#8** `c64309bb53859`: Merit rank 62; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#9** `c0b5e6c265edb`: Merit rank 64; trades and parameters distinct from higher-ranked entries.
- **#10** `c565aa93cb163`: Merit rank 67; trades and parameters distinct from higher-ranked entries. 18 other pool members produced exactly the same trades.

## XLY (Consumer discretionary ETF)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 15,723 distinct candidates evaluated, 8,950 passed the gates, 113 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,547, trades 5,055, profitable 1,580, yearConsistency 43, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 5.7%, stop 2.1%, hold 4, lookback 209, material 1.6%, re-entry 2.3%, reset 50.1%. Versus the original VGT defaults: dip 5.7% (original 10.0%); stop 2.1% (original 8.0%); hold (cal. days) 4 (original 15); lookback (sessions) 209 (original 90); material loss 1.6% (original 0.5%); re-entry decline 2.3% (original 3.0%); reset retrace 50.1% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: stop 2.1% (bound 2.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c7e8ba5c8e4b6` | 5.7% | 2.1% | 4 | 209 | 1.6% | 2.3% | 50.1% | $115,734 | $148,915 | $33,181 | $15,294 (15%) | 141 | 51% | 2.01 | $183 | -$7,915 | 29% | 6 | 90% | $93,585 | $107,762 | 1 | 1 | GA run 0 gen 35 | merit |
| 2 | `ca45ff4aa202d` | 5.4% | 2.5% | 4 | 122 | 1.6% | 1.7% | 50.7% | $110,012 | $152,023 | $42,011 | $21,716 (22%) | 143 | 49% | 1.76 | -$59 | -$9,717 | 38% | 6 | 90% | $92,693 | $98,832 | 2 | 4 | GA run 0 gen 19 | merit |
| 3 | `cb9be298421ad` | 5.4% | 2.3% | 4 | 204 | 2.7% | 3.0% | 50.0% | $99,557 | $136,716 | $37,159 | $28,682 (29%) | 146 | 46% | 1.71 | -$158 | -$7,915 | 33% | 6 | 80% | $84,245 | $96,400 | 19 | 10 | GA run 0 gen 47 | merit |
| 4 | `cbd1cb3830abb` | 5.4% | 2.1% | 4 | 204 | 1.8% | 2.8% | 58.5% | $98,939 | $131,999 | $33,060 | $23,227 (23%) | 143 | 48% | 1.79 | -$85 | -$7,915 | 29% | 6 | 70% | $81,654 | $94,438 | 22 | 9 | GA run 0 gen 27 | merit |
| 5 | `c2169eea45a8c` | 5.7% | 2.6% | 4 | 172 | 1.6% | 1.7% | 50.3% | $96,169 | $135,016 | $38,847 | $20,401 (20%) | 138 | 46% | 1.67 | -$144 | -$9,717 | 34% | 6 | 90% | $80,497 | $91,232 | 24 | 9 | GA run 0 gen 31 | merit |
| 6 | `c826d222e7c6e` | 7.0% | 2.7% | 13 | 207 | 9.0% | 0.2% | 61.4% | $89,505 | $134,018 | $44,512 | $29,542 (30%) | 87 | 63% | 1.74 | $831 | -$13,765 | 40% | 13 | 90% | $80,465 | $89,505 | 26 | 14 | GA run 0 gen 19 | merit |
| 7 | `c9e6c2149624c` | 5.7% | 2.1% | 5 | 204 | 1.6% | 1.7% | 60.0% | $97,683 | $131,285 | $33,603 | $22,602 (23%) | 135 | 56% | 1.71 | $448 | -$7,915 | 30% | 6 | 80% | $79,348 | $90,660 | 30 | 9 | GA run 0 gen 20 | merit |
| 8 | `c36355ef35197` | 5.7% | 2.6% | 4 | 123 | 1.7% | 1.7% | 65.7% | $99,449 | $139,321 | $39,871 | $20,948 (21%) | 137 | 46% | 1.69 | -$112 | -$9,717 | 36% | 6 | 90% | $78,339 | $85,011 | 35 | 8 | GA run 0 gen 16 | merit |
| 9 | `c8d5657c8f2b6` | 5.8% | 2.6% | 4 | 195 | 2.5% | 1.7% | 48.7% | $96,435 | $135,101 | $38,666 | $20,948 (21%) | 137 | 45% | 1.66 | -$195 | -$9,717 | 35% | 6 | 90% | $76,681 | $90,330 | 42 | 10 | GA run 0 gen 8 | merit |
| 10 | `c88cb59b2fce8` | 5.6% | 2.1% | 4 | 230 | 1.3% | 3.0% | 50.1% | $90,107 | $119,099 | $28,992 | $18,526 (19%) | 128 | 50% | 1.81 | $47 | -$7,915 | 25% | 6 | 80% | $73,775 | $87,987 | 50 | 6 | GA run 0 gen 45 | merit |

Original defaults over the same window (for reference): net $51,722, max DD $29,188, 28 trades, interest $53,674.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $6,591 | $1,810 | -$5,907 | $0 | $14,910 | $17,323 | $44,764 | $19,991 | $14,050 | $2,202 |
| 2 | $3,975 | $4,573 | -$661 | $0 | $15,631 | $23,321 | $37,904 | $17,791 | $6,494 | $983 |
| 3 | $4,609 | $5,128 | -$2,506 | $0 | $9,284 | $18,669 | $43,045 | $25,161 | -$5,734 | $1,901 |
| 4 | $4,455 | $1,810 | -$6,547 | -$0 | $14,422 | $18,990 | $44,764 | $19,991 | $9,334 | -$8,279 |
| 5 | $2,724 | $4,356 | -$5,233 | $0 | $9,589 | $22,298 | $37,380 | $17,909 | $2,598 | $4,547 |
| 6 | $10,761 | $7,890 | $4,700 | $0 | $1,449 | $22,710 | $12,977 | $14,979 | -$19,597 | $33,636 |
| 7 | $4,902 | -$1,164 | -$1,110 | $0 | $12,913 | $7,497 | $49,350 | $14,429 | $8,777 | $2,090 |
| 8 | $2,724 | $4,356 | -$1,406 | $0 | $9,589 | $22,298 | $37,380 | $17,909 | $2,598 | $4,000 |
| 9 | $8,370 | $3,847 | -$1,617 | $0 | $9,589 | $22,298 | $33,537 | $13,616 | $2,795 | $4,000 |
| 10 | $5,059 | $3,649 | -$5,907 | $0 | $14,910 | $13,281 | $29,866 | $19,991 | $9,543 | -$284 |
| original | $0 | $6,457 | $2,332 | $15,963 | -$5,763 | $8,658 | $19,982 | $10,472 | -$17,867 | $11,489 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $115,734 | $101,634 | $87,534 | $124,783 | $106,685 |
| 2 | $110,012 | $95,712 | $81,412 | $121,470 | $98,555 |
| 3 | $99,557 | $84,957 | $70,357 | $109,691 | $89,422 |
| 4 | $98,939 | $84,639 | $70,339 | $107,956 | $89,923 |
| 5 | $96,169 | $82,369 | $68,569 | $106,764 | $85,575 |
| 6 | $89,505 | $80,805 | $72,105 | $101,645 | $77,366 |
| 7 | $97,683 | $84,183 | $70,683 | $106,847 | $88,518 |
| 8 | $99,449 | $85,749 | $72,049 | $110,323 | $88,575 |
| 9 | $96,435 | $82,735 | $69,035 | $106,980 | $85,890 |
| 10 | $90,107 | $77,307 | $64,507 | $98,014 | $82,200 |

Why each entry is included:

- **#1** `c7e8ba5c8e4b6`: Highest merit (neighbourhood lower-quartile net P&L $93,585); recommended primary.
- **#2** `ca45ff4aa202d`: Merit rank 2; trades and parameters distinct from higher-ranked entries.
- **#3** `cb9be298421ad`: Merit rank 19; trades and parameters distinct from higher-ranked entries.
- **#4** `cbd1cb3830abb`: Merit rank 22; trades and parameters distinct from higher-ranked entries.
- **#5** `c2169eea45a8c`: Merit rank 24; trades and parameters distinct from higher-ranked entries. 2 other pool members produced exactly the same trades.
- **#6** `c826d222e7c6e`: Merit rank 26; trades and parameters distinct from higher-ranked entries.
- **#7** `c9e6c2149624c`: Merit rank 30; trades and parameters distinct from higher-ranked entries.
- **#8** `c36355ef35197`: Merit rank 35; trades and parameters distinct from higher-ranked entries.
- **#9** `c8d5657c8f2b6`: Merit rank 42; trades and parameters distinct from higher-ranked entries.
- **#10** `c88cb59b2fce8`: Merit rank 50; trades and parameters distinct from higher-ranked entries.

## IWN (US small-cap value ETF)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,216 distinct candidates evaluated, 11,078 passed the gates, 704 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,740, trades 3,371, profitable 2,045, yearConsistency 516, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 22.5%, stop 2.8%, hold 26, lookback 239, material 0.2%, re-entry 0.1%, reset 59.9%. Versus the original VGT defaults: dip 22.5% (original 10.0%); stop 2.8% (original 8.0%); hold (cal. days) 26 (original 15); lookback (sessions) 239 (original 90); material loss 0.2% (original 0.5%); re-entry decline 0.1% (original 3.0%); reset retrace 59.9% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `cb4e9083adf83` | 22.5% | 2.8% | 26 | 239 | 0.2% | 0.1% | 59.9% | $121,525 | $131,832 | $10,307 | $13,601 (14%) | 24 | 75% | 30.58 | $3,142 | -$2,376 | 9% | 9 | 100% | $109,844 | $115,140 | 1 | 3 | GA run 0 gen 29 | merit |
| 2 | `c373188e626d4` | 21.5% | 2.8% | 89 | 199 | 0.2% | 0.0% | 90.8% | $120,597 | $130,572 | $9,975 | $13,601 (14%) | 26 | 81% | 30.72 | $3,034 | -$2,376 | 9% | 8 | 100% | $108,916 | $117,391 | 2 | 5 | GA run 1 gen 43 | merit |
| 3 | `ce41a6d4ac2cd` | 22.4% | 2.8% | 23 | 239 | 0.0% | 0.0% | 46.6% | $120,410 | $130,657 | $10,247 | $13,601 (14%) | 24 | 75% | 24.05 | $3,142 | -$2,376 | 9% | 9 | 100% | $108,729 | $115,116 | 11 | 6 | GA run 0 gen 46 | merit |
| 4 | `c453f21846a50` | 22.6% | 2.8% | 62 | 240 | 0.0% | 0.2% | 39.3% | $122,589 | $132,504 | $9,915 | $13,601 (14%) | 24 | 79% | 31.21 | $3,034 | -$2,376 | 9% | 9 | 100% | $108,520 | $116,203 | 12 | 2 | GA run 1 gen 41 | merit |
| 5 | `c105b76b750e3` | 22.5% | 2.8% | 106 | 239 | 0.0% | 0.1% | 45.1% | $119,376 | $129,713 | $10,337 | $13,601 (14%) | 23 | 78% | 30.42 | $3,464 | -$2,376 | 9% | 9 | 100% | $107,695 | $119,376 | 19 | 8 | GA run 0 gen 43 | merit |
| 6 | `c1add75bb5d0e` | 21.9% | 2.8% | 90 | 223 | 0.0% | 0.0% | 47.7% | $117,994 | $128,361 | $10,367 | $13,601 (14%) | 23 | 78% | 30.08 | $3,464 | -$2,376 | 9% | 9 | 100% | $107,552 | $117,994 | 39 | 15 | GA run 0 gen 29 | merit |
| 7 | `c16c9c98db1c9` | 22.5% | 2.8% | 113 | 202 | 0.1% | 0.0% | 56.8% | $118,773 | $128,175 | $9,403 | $13,601 (14%) | 24 | 79% | 30.27 | $3,097 | -$2,376 | 9% | 8 | 100% | $107,091 | $118,773 | 52 | 11 | GA run 0 gen 22 | merit |
| 8 | `c04989db1c379` | 22.6% | 2.8% | 47 | 240 | 0.1% | 0.1% | 59.2% | $125,527 | $135,713 | $10,186 | $13,601 (14%) | 25 | 80% | 31.94 | $3,250 | -$2,376 | 9% | 9 | 100% | $106,980 | $119,141 | 59 | 1 | GA run 0 gen 27 | merit |
| 9 | `c1df6e540fb5a` | 22.6% | 2.9% | 101 | 240 | 0.1% | 0.0% | 52.2% | $120,807 | $131,144 | $10,337 | $13,601 (14%) | 23 | 87% | 33.79 | $3,358 | -$2,376 | 9% | 9 | 100% | $106,914 | $114,868 | 193 | 4 | GA run 0 gen 19 | merit |
| 10 | `c046eb5612a37` | 21.7% | 2.8% | 97 | 208 | 0.0% | 0.1% | 57.3% | $118,092 | $127,826 | $9,734 | $13,601 (14%) | 25 | 80% | 30.10 | $3,250 | -$2,376 | 9% | 8 | 100% | $106,411 | $118,092 | 211 | 13 | GA run 0 gen 17 | merit |

Original defaults over the same window (for reference): net -$20,228, max DD $58,799, 33 trades, interest $39,027.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $72,770 | $0 | $22,743 | $0 |
| 2 | $0 | $0 | $12,969 | $0 | $444 | $12,555 | $72,770 | $0 | $21,859 | $0 |
| 3 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $72,770 | $0 | $21,628 | $0 |
| 4 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $69,832 | $0 | $26,745 | $0 |
| 5 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $72,770 | $0 | $20,594 | $0 |
| 6 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $72,770 | $0 | $19,212 | $0 |
| 7 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $72,770 | $0 | $19,991 | $0 |
| 8 | $0 | $0 | $10,464 | $0 | $2,675 | $12,872 | $72,770 | $0 | $26,745 | $0 |
| 9 | $0 | $0 | $10,349 | $0 | $2,675 | $12,751 | $69,742 | $0 | $25,288 | $0 |
| 10 | $0 | $0 | $10,464 | $0 | $444 | $12,555 | $72,770 | $0 | $21,859 | $0 |
| original | -$3,396 | -$1,692 | $5,536 | $0 | -$15,837 | $10,647 | -$10,585 | $8,702 | -$16,595 | $2,991 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $121,525 | $119,125 | $116,725 | $124,336 | $118,714 |
| 2 | $120,597 | $117,997 | $115,397 | $123,317 | $117,876 |
| 3 | $120,410 | $118,010 | $115,610 | $123,205 | $117,615 |
| 4 | $122,589 | $120,189 | $117,789 | $125,293 | $119,884 |
| 5 | $119,376 | $117,076 | $114,776 | $122,195 | $116,557 |
| 6 | $117,994 | $115,694 | $113,394 | $120,821 | $115,167 |
| 7 | $118,773 | $116,373 | $113,973 | $121,337 | $116,208 |
| 8 | $125,527 | $123,027 | $120,527 | $128,305 | $122,749 |
| 9 | $120,807 | $118,507 | $116,207 | $123,626 | $117,988 |
| 10 | $118,092 | $115,592 | $113,092 | $120,747 | $115,437 |

Why each entry is included:

- **#1** `cb4e9083adf83`: Highest merit (neighbourhood lower-quartile net P&L $109,844); recommended primary. 1 other pool members produced exactly the same trades.
- **#2** `c373188e626d4`: Merit rank 2; trades and parameters distinct from higher-ranked entries. 7 other pool members produced exactly the same trades.
- **#3** `ce41a6d4ac2cd`: Merit rank 11; trades and parameters distinct from higher-ranked entries.
- **#4** `c453f21846a50`: Merit rank 12; trades and parameters distinct from higher-ranked entries. 21 other pool members produced exactly the same trades.
- **#5** `c105b76b750e3`: Merit rank 19; trades and parameters distinct from higher-ranked entries. 74 other pool members produced exactly the same trades.
- **#6** `c1add75bb5d0e`: Merit rank 39; trades and parameters distinct from higher-ranked entries. 26 other pool members produced exactly the same trades.
- **#7** `c16c9c98db1c9`: Merit rank 52; trades and parameters distinct from higher-ranked entries. 14 other pool members produced exactly the same trades.
- **#8** `c04989db1c379`: Merit rank 59; trades and parameters distinct from higher-ranked entries. 481 other pool members produced exactly the same trades.
- **#9** `c1df6e540fb5a`: Merit rank 193; trades and parameters distinct from higher-ranked entries. 32 other pool members produced exactly the same trades.
- **#10** `c046eb5612a37`: Merit rank 211; trades and parameters distinct from higher-ranked entries. 5 other pool members produced exactly the same trades.

## NVDA (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,114 distinct candidates evaluated, 10,208 passed the gates, 121 were scored for robustness. Rejections (a candidate can fail several): drawdown 5,152, trades 2,097, profitable 977, yearConsistency 11, neighbourhoodDrawdown 2.

**Primary (rank 1)**: dip 3.8%, stop 2.1%, hold 11, lookback 80, material 2.7%, re-entry 12.8%, reset 74.5%. Versus the original VGT defaults: dip 3.8% (original 10.0%); stop 2.1% (original 8.0%); hold (cal. days) 11 (original 15); lookback (sessions) 80 (original 90); material loss 2.7% (original 0.5%); re-entry decline 12.8% (original 3.0%); reset retrace 74.5% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: stop 2.1% (bound 2.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `cd26484c6e749` | 3.8% | 2.1% | 11 | 80 | 2.7% | 12.8% | 74.5% | $323,009 | $372,132 | $49,123 | $26,765 (27%) | 210 | 70% | 2.34 | $1,157 | -$12,909 | 44% | 7 | 100% | $288,553 | $309,703 | 1 | 2 | GA run 0 gen 44 | merit |
| 2 | `cfc549abce9a0` | 4.1% | 2.3% | 11 | 64 | 2.2% | 13.1% | 72.3% | $294,540 | $342,518 | $47,978 | $27,796 (28%) | 194 | 71% | 2.18 | $1,195 | -$15,102 | 43% | 8 | 80% | $285,593 | $289,172 | 2 | 3 | GA run 0 gen 43 | merit |
| 3 | `cdb6b623eed39` | 3.4% | 2.9% | 2 | 66 | 2.5% | 11.1% | 71.6% | $322,959 | $368,978 | $46,019 | $22,172 (22%) | 284 | 40% | 2.10 | -$262 | -$9,991 | 41% | 4 | 90% | $283,563 | $316,740 | 4 | 1 | GA run 0 gen 46 | merit |
| 4 | `c0c47c4afbe2d` | 6.0% | 2.0% | 11 | 92 | 2.5% | 13.6% | 61.9% | $265,584 | $303,737 | $38,153 | $29,288 (29%) | 169 | 74% | 2.14 | $1,694 | -$17,011 | 34% | 6 | 90% | $249,620 | $256,136 | 10 | 4 | GA run 0 gen 31 | merit |
| 5 | `cf44729d19f9b` | 5.6% | 2.2% | 11 | 80 | 2.6% | 12.8% | 71.1% | $262,686 | $303,491 | $40,805 | $26,655 (27%) | 175 | 70% | 2.21 | $1,271 | -$12,909 | 37% | 7 | 100% | $242,312 | $252,725 | 11 | 2 | GA run 0 gen 41 | merit |
| 6 | `cb4bc75694cd1` | 5.6% | 2.2% | 11 | 64 | 3.0% | 12.8% | 83.0% | $242,425 | $284,556 | $42,132 | $28,388 (28%) | 181 | 70% | 2.04 | $1,124 | -$23,707 | 38% | 7 | 100% | $225,746 | $241,956 | 16 | 6 | GA run 0 gen 44 | merit |
| 7 | `cca0856b40fe3` | 6.5% | 2.2% | 11 | 103 | 2.2% | 13.5% | 72.9% | $215,312 | $248,614 | $33,301 | $27,867 (28%) | 143 | 71% | 2.14 | $1,290 | -$15,102 | 30% | 7 | 90% | $207,205 | $215,312 | 19 | 8 | GA run 0 gen 26 | merit |
| 8 | `cb8f59a25d480` | 7.2% | 2.1% | 2 | 74 | 4.6% | 10.6% | 66.6% | $221,267 | $255,020 | $33,753 | $22,511 (23%) | 302 | 50% | 1.67 | $1 | -$10,689 | 30% | 3 | 70% | $202,290 | $212,138 | 20 | 3 | GA run 0 gen 42 | merit |
| 9 | `cea3b6f19f9bd` | 8.2% | 2.0% | 9 | 46 | 3.4% | 13.5% | 59.4% | $217,695 | $246,114 | $28,419 | $27,978 (28%) | 147 | 71% | 2.11 | $1,366 | -$22,607 | 26% | 6 | 80% | $194,584 | $204,203 | 22 | 8 | GA run 0 gen 22 | merit |
| 10 | `c7583af2718bc` | 7.6% | 2.0% | 9 | 46 | 2.5% | 14.3% | 62.9% | $190,845 | $217,516 | $26,671 | $27,680 (28%) | 143 | 72% | 1.95 | $1,333 | -$22,607 | 24% | 5 | 70% | $189,341 | $190,845 | 26 | 10 | GA run 0 gen 30 | merit |

Original defaults over the same window (for reference): net $167,311, max DD $94,346, 67 trades, interest $52,468.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $18,443 | $885 | $56,523 | $8,113 | $23,879 | $55,122 | $55,949 | $22,290 | $10,575 | $71,230 |
| 2 | $19,910 | -$655 | $65,176 | $15,398 | $22,476 | $43,039 | $62,249 | $11,446 | -$1,986 | $57,487 |
| 3 | $15,012 | $4,196 | $97,304 | $16,082 | $1,085 | $43,292 | $15,221 | $59,284 | -$5,639 | $77,122 |
| 4 | $29,852 | $11,314 | $49,314 | $12,289 | $21,534 | $58,567 | $30,106 | $35,051 | -$16,886 | $34,443 |
| 5 | $24,894 | $9,971 | $45,676 | $8,488 | $35,168 | $42,355 | $28,134 | $25,199 | $9,630 | $33,171 |
| 6 | $29,162 | $9,971 | $43,258 | $8,488 | $40,548 | $38,150 | $18,706 | $18,728 | $2,242 | $33,171 |
| 7 | $2,379 | $11,875 | $36,543 | $7,424 | $50,735 | $21,943 | $18,144 | $45,488 | -$11,042 | $31,823 |
| 8 | $6,563 | -$2,991 | $35,455 | $13,585 | $32,634 | $25,512 | -$5,639 | $75,739 | -$2,189 | $42,600 |
| 9 | $6,475 | $24,460 | -$8,977 | $8,536 | $43,209 | $27,794 | $32,615 | $69,382 | -$13,627 | $27,827 |
| 10 | -$2,167 | $20,793 | -$2,611 | $4,695 | $52,638 | $24,921 | $28,817 | $47,937 | -$8,995 | $24,817 |
| original | $497 | $50,953 | $12,715 | $60,298 | -$12,885 | -$11,077 | $29,274 | $17,213 | -$22,305 | $42,628 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $323,009 | $302,009 | $281,009 | $336,406 | $309,612 |
| 2 | $294,540 | $275,140 | $255,740 | $307,625 | $281,455 |
| 3 | $322,959 | $294,559 | $266,159 | $335,510 | $310,408 |
| 4 | $265,584 | $248,684 | $231,784 | $275,989 | $255,178 |
| 5 | $262,686 | $245,186 | $227,686 | $273,815 | $251,557 |
| 6 | $242,425 | $224,325 | $206,225 | $253,915 | $230,934 |
| 7 | $215,312 | $201,012 | $186,712 | $224,395 | $206,230 |
| 8 | $221,267 | $191,067 | $160,867 | $230,472 | $212,061 |
| 9 | $217,695 | $202,995 | $188,295 | $225,446 | $209,944 |
| 10 | $190,845 | $176,545 | $162,245 | $198,119 | $183,571 |

Why each entry is included:

- **#1** `cd26484c6e749`: Highest merit (neighbourhood lower-quartile net P&L $288,553); recommended primary.
- **#2** `cfc549abce9a0`: Merit rank 2; trades and parameters distinct from higher-ranked entries.
- **#3** `cdb6b623eed39`: Merit rank 4; trades and parameters distinct from higher-ranked entries.
- **#4** `c0c47c4afbe2d`: Merit rank 10; trades and parameters distinct from higher-ranked entries.
- **#5** `cf44729d19f9b`: Merit rank 11; trades and parameters distinct from higher-ranked entries.
- **#6** `cb4bc75694cd1`: Merit rank 16; trades and parameters distinct from higher-ranked entries.
- **#7** `cca0856b40fe3`: Merit rank 19; trades and parameters distinct from higher-ranked entries.
- **#8** `cb8f59a25d480`: Merit rank 20; trades and parameters distinct from higher-ranked entries.
- **#9** `cea3b6f19f9bd`: Merit rank 22; trades and parameters distinct from higher-ranked entries.
- **#10** `c7583af2718bc`: Merit rank 26; trades and parameters distinct from higher-ranked entries.

## AAPL (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,114 distinct candidates evaluated, 9,883 passed the gates, 86 were scored for robustness. Rejections (a candidate can fail several): drawdown 3,819, trades 4,102, profitable 562, yearConsistency 54, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 25.7%, stop 11.9%, hold 1, lookback 247, material 1.6%, re-entry 0.9%, reset 30.2%. Versus the original VGT defaults: dip 25.7% (original 10.0%); stop 11.9% (original 8.0%); hold (cal. days) 1 (original 15); lookback (sessions) 247 (original 90); material loss 1.6% (original 0.5%); re-entry decline 0.9% (original 3.0%); reset retrace 30.2% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: lookback (sessions) 247 (bound 250). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c1a2c8e412c2e` | 25.7% | 11.9% | 1 | 247 | 1.6% | 0.9% | 30.2% | $216,009 | $256,031 | $40,022 | $28,752 (29%) | 26 | 19% | 13.19 | -$531 | -$2,160 | 36% | 4 | 90% | $204,705 | $213,019 | 1 | 1 | GA run 0 gen 42 | merit |
| 2 | `c5d3e88fa8787` | 25.7% | 11.9% | 1 | 248 | 1.6% | 2.4% | 10.8% | $215,034 | $255,237 | $40,203 | $29,726 (30%) | 27 | 19% | 12.50 | -$569 | -$2,160 | 36% | 4 | 90% | $203,730 | $210,341 | 6 | 3 | GA run 0 gen 26 | merit |
| 3 | `c7045c342f64b` | 25.7% | 12.2% | 1 | 247 | 1.4% | 0.9% | 74.5% | $213,689 | $253,861 | $40,173 | $29,365 (29%) | 26 | 19% | 13.06 | -$531 | -$2,160 | 36% | 4 | 90% | $201,212 | $211,768 | 11 | 2 | GA run 0 gen 45 | merit |
| 4 | `c49d690c4a6b9` | 26.2% | 11.9% | 1 | 233 | 1.5% | 3.0% | 10.1% | $194,966 | $231,432 | $36,466 | $28,937 (29%) | 22 | 18% | 14.74 | -$428 | -$2,242 | 33% | 4 | 90% | $193,925 | $194,641 | 21 | 4 | GA run 0 gen 37 | merit |
| 5 | `cbd45754f225b` | 24.0% | 10.9% | 12 | 170 | 0.9% | 1.0% | 51.0% | $195,589 | $226,058 | $30,468 | $26,109 (26%) | 16 | 44% | 11.35 | -$828 | -$4,015 | 27% | 20 | 90% | $188,866 | $191,689 | 25 | 1 | GA run 1 gen 47 | merit |
| 6 | `c128c3ebbbc23` | 27.5% | 10.9% | 12 | 242 | 3.6% | 2.9% | 24.0% | $193,644 | $219,471 | $25,827 | $22,552 (23%) | 11 | 45% | 27.29 | -$133 | -$1,833 | 23% | 44 | 90% | $188,223 | $192,388 | 34 | 2 | GA run 1 gen 25 | merit |
| 7 | `cd1063f494550` | 23.9% | 10.9% | 12 | 171 | 0.4% | 1.6% | 46.3% | $195,455 | $225,953 | $30,499 | $26,244 (26%) | 16 | 44% | 11.27 | -$828 | -$4,015 | 27% | 21 | 90% | $185,928 | $191,689 | 47 | 2 | GA run 1 gen 30 | merit |
| 8 | `c0197fa5d6a15` | 27.5% | 10.9% | 12 | 212 | 0.1% | 2.8% | 23.4% | $195,356 | $221,244 | $25,888 | $22,810 (23%) | 10 | 50% | 31.25 | $5,985 | -$1,833 | 23% | 48 | 90% | $183,254 | $193,513 | 56 | 1 | GA run 1 gen 46 | merit |
| 9 | `c153017b1c575` | 27.5% | 10.9% | 12 | 211 | 5.4% | 2.8% | 23.4% | $182,347 | $203,955 | $21,608 | $21,226 (21%) | 10 | 40% | 25.76 | -$520 | -$1,833 | 20% | 30 | 80% | $181,130 | $182,347 | 59 | 1 | GA run 1 gen 38 | merit |
| 10 | `c1d38c485aa17` | 26.4% | 10.9% | 12 | 247 | 1.4% | 9.7% | 0.1% | $185,654 | $213,862 | $28,208 | $21,226 (21%) | 13 | 38% | 16.18 | -$907 | -$2,652 | 26% | 44 | 100% | $180,191 | $182,565 | 70 | 2 | GA run 1 gen 40 | merit |

Original defaults over the same window (for reference): net $269,282, max DD $35,161, 51 trades, interest $78,115.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $0 | $0 | $16,341 | $51,702 | -$17,965 | $29,179 | $95,764 | $0 | $7,757 | $33,231 |
| 2 | $0 | $0 | $16,341 | $51,702 | -$17,058 | $27,298 | $95,764 | $0 | $7,757 | $33,231 |
| 3 | $0 | $0 | $16,341 | $51,702 | -$18,578 | $29,179 | $95,075 | $0 | $7,215 | $32,754 |
| 4 | $0 | $0 | $16,341 | $51,702 | -$8,072 | $12,489 | $96,835 | $0 | $1,045 | $24,625 |
| 5 | $0 | $0 | $8,652 | $0 | -$4,873 | $37,981 | $107,802 | $0 | $12,477 | $33,549 |
| 6 | $0 | $0 | $7,379 | $0 | -$1,574 | $27,306 | $110,452 | $0 | $19,557 | $30,524 |
| 7 | $0 | $0 | $8,652 | $0 | -$5,008 | $37,981 | $107,802 | $0 | $12,477 | $33,549 |
| 8 | $0 | $0 | $9,092 | $0 | -$1,574 | $27,306 | $110,452 | $0 | $19,557 | $30,524 |
| 9 | $0 | $0 | -$3,918 | $0 | -$1,574 | $27,306 | $110,452 | $0 | $19,557 | $30,524 |
| 10 | $0 | $0 | $2,935 | $0 | $5,385 | $17,447 | $110,452 | $0 | $14,356 | $35,080 |
| original | $29,216 | $2,122 | $15,797 | $22,985 | $13,820 | $96,164 | $50,027 | $21,988 | -$6,397 | $23,561 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $216,009 | $213,409 | $210,809 | $226,924 | $205,094 |
| 2 | $215,034 | $212,334 | $209,634 | $225,999 | $204,070 |
| 3 | $213,689 | $211,089 | $208,489 | $224,645 | $202,732 |
| 4 | $194,966 | $192,766 | $190,566 | $204,911 | $185,021 |
| 5 | $195,589 | $193,989 | $192,389 | $203,899 | $187,280 |
| 6 | $193,644 | $192,544 | $191,444 | $200,688 | $186,600 |
| 7 | $195,455 | $193,855 | $192,255 | $203,772 | $187,137 |
| 8 | $195,356 | $194,356 | $193,356 | $202,416 | $188,296 |
| 9 | $182,347 | $181,347 | $180,347 | $188,240 | $176,454 |
| 10 | $185,654 | $184,354 | $183,054 | $193,347 | $177,961 |

Why each entry is included:

- **#1** `c1a2c8e412c2e`: Highest merit (neighbourhood lower-quartile net P&L $204,705); recommended primary. 4 other pool members produced exactly the same trades.
- **#2** `c5d3e88fa8787`: Merit rank 6; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades.
- **#3** `c7045c342f64b`: Merit rank 11; trades and parameters distinct from higher-ranked entries.
- **#4** `c49d690c4a6b9`: Merit rank 21; trades and parameters distinct from higher-ranked entries.
- **#5** `cbd45754f225b`: Merit rank 25; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades. Caveat: few trades.
- **#6** `c128c3ebbbc23`: Merit rank 34; trades and parameters distinct from higher-ranked entries. 7 other pool members produced exactly the same trades. Caveat: few trades.
- **#7** `cd1063f494550`: Merit rank 47; trades and parameters distinct from higher-ranked entries. 7 other pool members produced exactly the same trades. Caveat: few trades.
- **#8** `c0197fa5d6a15`: Merit rank 56; trades and parameters distinct from higher-ranked entries. 2 other pool members produced exactly the same trades. Caveat: few trades.
- **#9** `c153017b1c575`: Merit rank 59; trades and parameters distinct from higher-ranked entries. 11 other pool members produced exactly the same trades. Caveat: few trades.
- **#10** `c1d38c485aa17`: Merit rank 70; trades and parameters distinct from higher-ranked entries. Caveat: few trades.

## MSFT (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,119 distinct candidates evaluated, 9,433 passed the gates, 112 were scored for robustness. Rejections (a candidate can fail several): drawdown 4,502, trades 3,877, profitable 1,256, yearConsistency 13, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 2.3%, stop 3.2%, hold 22, lookback 89, material 5.7%, re-entry 3.1%, reset 48.0%. Versus the original VGT defaults: dip 2.3% (original 10.0%); stop 3.2% (original 8.0%); hold (cal. days) 22 (original 15); lookback (sessions) 89 (original 90); material loss 5.7% (original 0.5%); re-entry decline 3.1% (original 3.0%); reset retrace 48.0% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: dip 2.3% (bound 2.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c4713e72e0acc` | 2.3% | 3.2% | 22 | 89 | 5.7% | 3.1% | 48.0% | $229,490 | $319,901 | $90,411 | $21,047 (21%) | 139 | 65% | 2.43 | $1,210 | -$12,559 | 82% | 22 | 100% | $221,166 | $226,089 | 1 | 1 | GA run 1 gen 37 | merit |
| 2 | `c6684fbfcc52b` | 2.3% | 3.2% | 22 | 86 | 4.5% | 3.2% | 47.7% | $224,863 | $315,154 | $90,290 | $21,047 (21%) | 139 | 65% | 2.40 | $1,210 | -$12,559 | 82% | 22 | 100% | $213,608 | $223,130 | 4 | 2 | GA run 1 gen 33 | merit |
| 3 | `c4aaaa9295221` | 2.3% | 2.7% | 22 | 98 | 5.1% | 3.2% | 48.0% | $218,832 | $305,716 | $86,885 | $26,758 (27%) | 147 | 68% | 2.24 | $1,464 | -$12,559 | 80% | 22 | 80% | $212,461 | $217,063 | 8 | 14 | GA run 1 gen 42 | merit |
| 4 | `cac9896dc6ed0` | 2.6% | 3.3% | 22 | 147 | 6.0% | 3.2% | 48.2% | $220,231 | $311,998 | $91,767 | $24,179 (24%) | 132 | 63% | 2.38 | $1,243 | -$11,897 | 83% | 22 | 90% | $207,960 | $216,709 | 19 | 12 | GA run 1 gen 12 | merit |
| 5 | `c52ef7465d3ee` | 4.9% | 6.3% | 16 | 213 | 1.5% | 3.4% | 85.3% | $221,575 | $301,317 | $79,742 | $23,193 (23%) | 60 | 52% | 3.76 | $457 | -$9,793 | 73% | 22 | 90% | $206,206 | $221,575 | 23 | 8 | GA run 0 gen 47 | merit |
| 6 | `cccab30d709f7` | 4.5% | 6.3% | 16 | 157 | 1.5% | 3.3% | 85.9% | $219,514 | $299,678 | $80,164 | $23,193 (23%) | 60 | 52% | 3.71 | $457 | -$9,793 | 73% | 22 | 90% | $204,621 | $219,514 | 27 | 12 | GA run 0 gen 37 | merit |
| 7 | `c1f1af2924bd8` | 2.4% | 3.2% | 22 | 86 | 4.4% | 5.5% | 48.2% | $219,818 | $307,155 | $87,337 | $25,623 (26%) | 133 | 66% | 2.46 | $1,116 | -$12,559 | 79% | 22 | 100% | $203,120 | $216,840 | 32 | 13 | GA run 1 gen 33 | merit |
| 8 | `c3d935ceef424` | 2.6% | 3.3% | 22 | 57 | 6.0% | 3.2% | 48.2% | $221,411 | $312,756 | $91,345 | $22,956 (23%) | 131 | 63% | 2.40 | $1,371 | -$11,897 | 83% | 22 | 90% | $202,674 | $218,593 | 33 | 9 | GA run 1 gen 19 | merit |
| 9 | `cdc8dd52ae170` | 2.3% | 3.2% | 22 | 68 | 3.6% | 3.2% | 48.8% | $220,896 | $311,156 | $90,260 | $21,047 (21%) | 137 | 66% | 2.39 | $1,210 | -$12,559 | 82% | 22 | 100% | $198,666 | $219,334 | 47 | 5 | GA run 1 gen 33 | merit |
| 10 | `c82d8c63bd604` | 3.0% | 3.3% | 22 | 165 | 5.7% | 3.0% | 48.1% | $221,824 | $312,386 | $90,562 | $24,179 (24%) | 130 | 62% | 2.40 | $1,243 | -$11,897 | 82% | 22 | 90% | $197,383 | $218,303 | 50 | 8 | GA run 1 gen 19 | merit |

Original defaults over the same window (for reference): net $89,647, max DD $32,735, 39 trades, interest $47,978.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $10,957 | $18,939 | $15,123 | $23,026 | $23,849 | $29,572 | $42,705 | $33,160 | $3,455 | $28,703 |
| 2 | $10,957 | $18,939 | $15,123 | $23,026 | $23,849 | $29,572 | $42,705 | $28,534 | $3,455 | $28,703 |
| 3 | $10,749 | $19,110 | -$1,738 | $25,294 | $28,438 | $40,697 | $41,187 | $35,319 | -$12,562 | $32,337 |
| 4 | $25,712 | $16,451 | $10,452 | $21,094 | $22,559 | $24,651 | $43,764 | $32,720 | -$5,206 | $28,035 |
| 5 | $21,819 | $29,191 | -$3,099 | $19,301 | $21,382 | $41,538 | $16,601 | $20,253 | $1,611 | $52,978 |
| 6 | $21,115 | $29,191 | -$3,099 | $19,301 | $21,382 | $41,538 | $16,601 | $20,136 | $1,611 | $51,737 |
| 7 | $10,957 | $15,921 | $12,343 | $25,200 | $23,849 | $23,890 | $44,958 | $28,534 | $4,735 | $29,432 |
| 8 | $25,712 | $16,451 | $10,452 | $21,094 | $22,559 | $24,651 | $43,764 | $32,720 | -$3,228 | $27,236 |
| 9 | $10,957 | $18,939 | $16,383 | $23,026 | $23,849 | $29,572 | $42,705 | $28,534 | $3,455 | $23,476 |
| 10 | $25,712 | $16,451 | $6,822 | $24,102 | $23,796 | $24,651 | $43,764 | $32,636 | -$5,206 | $29,097 |
| original | $25,384 | -$5,220 | -$7,060 | $0 | $2,563 | $12,127 | $22,062 | $0 | -$10,611 | $50,401 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $229,490 | $215,590 | $201,690 | $254,147 | $204,832 |
| 2 | $224,863 | $210,963 | $197,063 | $249,488 | $200,239 |
| 3 | $218,832 | $204,132 | $189,432 | $242,527 | $195,136 |
| 4 | $220,231 | $207,031 | $193,831 | $245,258 | $195,203 |
| 5 | $221,575 | $215,575 | $209,575 | $243,322 | $199,827 |
| 6 | $219,514 | $213,514 | $207,514 | $241,377 | $197,651 |
| 7 | $219,818 | $206,518 | $193,218 | $243,638 | $195,999 |
| 8 | $221,411 | $208,311 | $195,211 | $246,323 | $196,499 |
| 9 | $220,896 | $207,196 | $193,496 | $245,512 | $196,279 |
| 10 | $221,824 | $208,824 | $195,824 | $246,523 | $197,125 |

Why each entry is included:

- **#1** `c4713e72e0acc`: Highest merit (neighbourhood lower-quartile net P&L $221,166); recommended primary. 1 other pool members produced exactly the same trades.
- **#2** `c6684fbfcc52b`: Merit rank 4; trades and parameters distinct from higher-ranked entries. 12 other pool members produced exactly the same trades.
- **#3** `c4aaaa9295221`: Merit rank 8; trades and parameters distinct from higher-ranked entries.
- **#4** `cac9896dc6ed0`: Merit rank 19; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#5** `c52ef7465d3ee`: Merit rank 23; trades and parameters distinct from higher-ranked entries.
- **#6** `cccab30d709f7`: Merit rank 27; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#7** `c1f1af2924bd8`: Merit rank 32; trades and parameters distinct from higher-ranked entries.
- **#8** `c3d935ceef424`: Merit rank 33; trades and parameters distinct from higher-ranked entries.
- **#9** `cdc8dd52ae170`: Merit rank 47; trades and parameters distinct from higher-ranked entries.
- **#10** `c82d8c63bd604`: Merit rank 50; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.

## AMD (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,226 distinct candidates evaluated, 11,196 passed the gates, 214 were scored for robustness. Rejections (a candidate can fail several): drawdown 4,818, trades 440, profitable 148, yearConsistency 124, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 39.8%, stop 2.8%, hold 72, lookback 110, material 1.8%, re-entry 9.4%, reset 37.8%. Versus the original VGT defaults: dip 39.8% (original 10.0%); stop 2.8% (original 8.0%); hold (cal. days) 72 (original 15); lookback (sessions) 110 (original 90); material loss 1.8% (original 0.5%); re-entry decline 9.4% (original 3.0%); reset retrace 37.8% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: dip 39.8% (bound 40.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c429edbf3d6e7` | 39.8% | 2.8% | 72 | 110 | 1.8% | 9.4% | 37.8% | $191,217 | $198,208 | $6,992 | $14,617 (15%) | 35 | 83% | 16.16 | $3,639 | -$4,165 | 6% | 4 | 90% | $179,175 | $186,173 | 1 | 1 | GA run 1 gen 38 | merit |
| 2 | `c04d565bc21b0` | 39.7% | 2.8% | 50 | 110 | 1.8% | 9.4% | 11.9% | $198,258 | $205,973 | $7,715 | $14,796 (15%) | 36 | 83% | 16.72 | $3,236 | -$4,165 | 7% | 5 | 90% | $174,733 | $192,293 | 18 | 1 | GA run 1 gen 32 | merit |
| 3 | `c38597cc8d99e` | 39.2% | 2.7% | 85 | 110 | 1.5% | 11.0% | 12.3% | $195,942 | $203,687 | $7,745 | $14,796 (15%) | 38 | 84% | 19.79 | $2,544 | -$4,165 | 7% | 5 | 90% | $174,110 | $192,818 | 25 | 2 | GA run 1 gen 25 | merit |
| 4 | `ce9b2043d063c` | 39.7% | 2.8% | 50 | 110 | 1.0% | 8.8% | 11.9% | $196,235 | $204,131 | $7,896 | $16,340 (16%) | 36 | 83% | 16.56 | $3,236 | -$4,165 | 7% | 5 | 90% | $172,718 | $194,318 | 27 | 2 | GA run 1 gen 43 | diversity relaxed |
| 5 | `c83b7c6821cb0` | 39.6% | 2.8% | 87 | 109 | 1.0% | 8.8% | 11.9% | $193,684 | $201,128 | $7,444 | $16,340 (16%) | 34 | 85% | 16.99 | $3,734 | -$4,165 | 7% | 5 | 90% | $171,720 | $191,767 | 33 | 3 | GA run 1 gen 40 | merit |
| 6 | `c31beb92f592e` | 39.2% | 2.7% | 99 | 110 | 1.8% | 9.5% | 12.4% | $189,983 | $197,758 | $7,775 | $14,796 (15%) | 38 | 84% | 19.22 | $2,544 | -$4,165 | 7% | 5 | 90% | $168,204 | $186,859 | 44 | 5 | GA run 1 gen 23 | merit |
| 7 | `c859906bef17b` | 39.1% | 2.7% | 53 | 109 | 1.6% | 11.0% | 12.4% | $193,409 | $200,763 | $7,353 | $14,796 (15%) | 37 | 84% | 19.55 | $2,555 | -$4,165 | 7% | 4 | 90% | $167,407 | $190,161 | 46 | 3 | GA run 1 gen 27 | merit |
| 8 | `c41a82a7e4fa4` | 39.3% | 2.6% | 10 | 105 | 2.6% | 8.6% | 79.7% | $191,477 | $197,987 | $6,510 | $16,189 (16%) | 45 | 78% | 11.63 | $2,633 | -$4,165 | 6% | 4 | 90% | $148,576 | $178,308 | 49 | 5 | GA run 0 gen 47 | merit |
| 9 | `c0863b06f7a00` | 39.3% | 2.6% | 9 | 105 | 1.3% | 10.7% | 80.1% | $189,872 | $195,718 | $5,847 | $12,679 (13%) | 39 | 79% | 11.71 | $2,834 | -$4,165 | 5% | 4 | 90% | $141,311 | $165,660 | 56 | 1 | GA run 0 gen 38 | merit |
| 10 | `c001076a6a1a6` | 39.3% | 2.6% | 9 | 105 | 2.8% | 11.3% | 80.2% | $189,936 | $196,475 | $6,540 | $16,189 (16%) | 44 | 80% | 11.71 | $2,703 | -$4,165 | 6% | 4 | 90% | $129,330 | $175,417 | 136 | 6 | GA run 0 gen 39 | merit |

Original defaults over the same window (for reference): net $235,525, max DD $115,828, 126 trades, interest $71,816.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | -$4,165 | $63,530 | $24,661 | $0 | $23,727 | $45,305 | $0 | $0 | $31,345 | $6,812 |
| 2 | -$4,165 | $63,530 | $24,661 | $0 | $14,939 | $38,423 | $0 | $0 | $54,057 | $6,812 |
| 3 | -$4,165 | $70,143 | $24,875 | $0 | $18,663 | $38,756 | $0 | $0 | $40,858 | $6,812 |
| 4 | -$4,165 | $61,507 | $24,661 | $0 | $14,939 | $38,423 | $0 | $0 | $54,057 | $6,812 |
| 5 | -$4,165 | $59,081 | $24,661 | $0 | $14,939 | $38,423 | $0 | $0 | $53,933 | $6,812 |
| 6 | -$4,165 | $64,183 | $24,875 | $0 | $18,663 | $38,756 | $0 | $0 | $40,858 | $6,812 |
| 7 | -$4,165 | $67,610 | $24,875 | $0 | $18,663 | $38,756 | $0 | $0 | $40,858 | $6,812 |
| 8 | -$4,165 | $59,723 | $25,088 | $0 | $20,502 | $46,007 | $0 | $0 | $37,509 | $6,812 |
| 9 | -$4,165 | $67,564 | $25,088 | $0 | $18,961 | $46,007 | $0 | $0 | $36,416 | $0 |
| 10 | -$4,165 | $59,723 | $25,088 | $0 | $18,961 | $46,007 | $0 | $0 | $37,509 | $6,812 |
| original | -$39,504 | -$22,099 | $78,656 | -$12,668 | $39,281 | $68,169 | $46,969 | $27,682 | -$56,025 | $105,063 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $191,217 | $187,717 | $184,217 | $193,123 | $189,310 |
| 2 | $198,258 | $194,658 | $191,058 | $200,362 | $196,154 |
| 3 | $195,942 | $192,142 | $188,342 | $198,054 | $193,829 |
| 4 | $196,235 | $192,635 | $189,035 | $198,389 | $194,082 |
| 5 | $193,684 | $190,284 | $186,884 | $195,714 | $191,654 |
| 6 | $189,983 | $186,183 | $182,383 | $192,103 | $187,862 |
| 7 | $193,409 | $189,709 | $186,009 | $195,415 | $191,404 |
| 8 | $191,477 | $186,977 | $182,477 | $193,252 | $189,702 |
| 9 | $189,872 | $185,972 | $182,072 | $191,466 | $188,277 |
| 10 | $189,936 | $185,536 | $181,136 | $191,719 | $188,152 |

Why each entry is included:

- **#1** `c429edbf3d6e7`: Highest merit (neighbourhood lower-quartile net P&L $179,175); recommended primary. 20 other pool members produced exactly the same trades.
- **#2** `c04d565bc21b0`: Merit rank 18; trades and parameters distinct from higher-ranked entries. 6 other pool members produced exactly the same trades.
- **#3** `c38597cc8d99e`: Merit rank 25; trades and parameters distinct from higher-ranked entries. 12 other pool members produced exactly the same trades.
- **#4** `ce9b2043d063c`: Merit rank 27; added in the relaxed pass (within 4 neighbourhood steps of a higher-ranked entry, but trades differently).
- **#5** `c83b7c6821cb0`: Merit rank 33; trades and parameters distinct from higher-ranked entries.
- **#6** `c31beb92f592e`: Merit rank 44; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#7** `c859906bef17b`: Merit rank 46; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#8** `c41a82a7e4fa4`: Merit rank 49; trades and parameters distinct from higher-ranked entries. 114 other pool members produced exactly the same trades.
- **#9** `c0863b06f7a00`: Merit rank 56; trades and parameters distinct from higher-ranked entries. 21 other pool members produced exactly the same trades.
- **#10** `c001076a6a1a6`: Merit rank 136; trades and parameters distinct from higher-ranked entries. 28 other pool members produced exactly the same trades.

## META (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,117 distinct candidates evaluated, 8,271 passed the gates, 112 were scored for robustness. Rejections (a candidate can fail several): drawdown 5,667, trades 4,003, profitable 1,830, yearConsistency 9, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 17.1%, stop 2.3%, hold 8, lookback 219, material 3.4%, re-entry 13.6%, reset 17.4%. Versus the original VGT defaults: dip 17.1% (original 10.0%); stop 2.3% (original 8.0%); hold (cal. days) 8 (original 15); lookback (sessions) 219 (original 90); material loss 3.4% (original 0.5%); re-entry decline 13.6% (original 3.0%); reset retrace 17.4% (original 38.0%).

> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: stop 2.3% (bound 2.0%). The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c6732eabb3c6f` | 17.1% | 2.3% | 8 | 219 | 3.4% | 13.6% | 17.4% | $180,421 | $196,816 | $16,395 | $18,197 (18%) | 84 | 69% | 3.24 | $1,254 | -$11,928 | 15% | 6 | 100% | $152,555 | $159,541 | 1 | 1 | GA run 1 gen 31 | merit |
| 2 | `cd503a8b8e804` | 17.2% | 2.5% | 9 | 224 | 3.0% | 13.6% | 87.8% | $162,687 | $179,021 | $16,334 | $24,597 (25%) | 74 | 70% | 3.05 | $1,394 | -$18,072 | 15% | 7 | 90% | $122,683 | $162,687 | 3 | 3 | GA run 1 gen 33 | merit |
| 3 | `c833288d50e4b` | 25.6% | 9.8% | 3 | 34 | 7.0% | 5.2% | 11.0% | $133,989 | $143,603 | $9,614 | $24,601 (25%) | 19 | 21% | 7.32 | -$537 | -$5,344 | 9% | 7 | 90% | $121,176 | $133,989 | 4 | 9 | GA run 1 gen 15 | merit |
| 4 | `c05e17e960d29` | 29.4% | 9.8% | 3 | 45 | 6.0% | 4.2% | 18.2% | $133,117 | $142,429 | $9,312 | $21,479 (21%) | 13 | 31% | 10.46 | -$158 | -$5,344 | 9% | 7 | 100% | $121,095 | $133,117 | 5 | 9 | GA run 1 gen 11 | merit |
| 5 | `c5ed90fea6876` | 17.1% | 2.3% | 8 | 219 | 2.4% | 13.6% | 91.8% | $158,045 | $173,325 | $15,279 | $18,197 (18%) | 76 | 70% | 3.40 | $1,120 | -$11,928 | 14% | 6 | 90% | $120,671 | $158,045 | 12 | 3 | GA run 1 gen 17 | merit |
| 6 | `ca2e7c8d74762` | 17.2% | 2.3% | 8 | 219 | 3.2% | 13.4% | 54.2% | $163,839 | $179,118 | $15,279 | $18,197 (18%) | 78 | 69% | 3.47 | $866 | -$11,928 | 14% | 6 | 100% | $119,016 | $146,792 | 15 | 2 | GA run 1 gen 37 | merit |
| 7 | `c754c65ca6477` | 31.2% | 5.1% | 11 | 80 | 5.7% | 14.4% | 20.8% | $128,742 | $137,090 | $8,348 | $13,259 (13%) | 25 | 68% | 5.16 | $1,271 | -$8,615 | 7% | 11 | 90% | $116,849 | $125,408 | 18 | 1 | GA run 1 gen 33 | merit |
| 8 | `c2d0d34c200d3` | 17.1% | 2.3% | 8 | 214 | 3.4% | 13.2% | 90.4% | $144,853 | $160,193 | $15,340 | $18,857 (19%) | 76 | 68% | 2.88 | $866 | -$11,928 | 14% | 6 | 90% | $111,565 | $131,026 | 25 | 5 | GA run 1 gen 12 | merit |
| 9 | `c492406d408af` | 30.2% | 4.4% | 11 | 80 | 5.5% | 14.1% | 9.3% | $135,119 | $144,250 | $9,132 | $13,394 (13%) | 31 | 61% | 5.17 | $1,410 | -$8,091 | 8% | 11 | 90% | $110,939 | $126,978 | 28 | 1 | GA run 1 gen 47 | merit |
| 10 | `c982a7435e677` | 30.0% | 9.8% | 3 | 47 | 5.6% | 5.2% | 16.4% | $134,373 | $143,715 | $9,342 | $21,479 (21%) | 14 | 29% | 10.84 | -$289 | -$5,344 | 9% | 7 | 100% | $110,873 | $134,373 | 29 | 8 | GA run 1 gen 15 | merit |

Original defaults over the same window (for reference): net $73,766, max DD $117,725, 57 trades, interest $54,668.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $22,517 | $4,281 | $0 | $0 | $18,379 | $43,589 | $9,926 | $16,367 | $28,153 | $37,209 |
| 2 | $21,832 | $4,067 | $0 | $0 | $17,358 | $27,493 | -$13,375 | $18,345 | $37,729 | $49,238 |
| 3 | $0 | $0 | $0 | $0 | -$537 | $0 | $32,628 | $0 | $39,628 | $62,270 |
| 4 | $0 | $0 | $0 | $0 | $0 | $0 | $37,241 | $0 | $33,605 | $62,270 |
| 5 | $22,517 | $4,281 | $0 | $0 | $18,379 | $43,589 | -$8,912 | $16,367 | $33,602 | $28,223 |
| 6 | $22,517 | $4,281 | $0 | $0 | $12,446 | $43,300 | $3,102 | $16,367 | $33,602 | $28,223 |
| 7 | $0 | $0 | $0 | $0 | -$7,345 | $0 | $18,135 | $0 | $63,866 | $54,086 |
| 8 | $22,517 | $4,281 | $0 | $0 | $12,446 | $43,300 | -$8,912 | $16,367 | $26,631 | $28,223 |
| 9 | $0 | $0 | $0 | $0 | $1,980 | -$1,741 | $16,796 | $0 | $64,542 | $53,542 |
| 10 | $0 | $0 | $0 | $0 | $0 | $0 | $37,241 | $0 | $34,861 | $62,270 |
| original | -$1,711 | $33,109 | $5,180 | $0 | -$13,614 | $37,135 | $28,032 | -$12,617 | -$62,632 | $60,884 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $180,421 | $172,021 | $163,621 | $184,892 | $175,950 |
| 2 | $162,687 | $155,287 | $147,887 | $167,142 | $158,232 |
| 3 | $133,989 | $132,089 | $130,189 | $136,611 | $131,367 |
| 4 | $133,117 | $131,817 | $130,517 | $135,657 | $130,577 |
| 5 | $158,045 | $150,445 | $142,845 | $162,213 | $153,878 |
| 6 | $163,839 | $156,039 | $148,239 | $168,006 | $159,672 |
| 7 | $128,742 | $126,242 | $123,742 | $131,019 | $126,465 |
| 8 | $144,853 | $137,253 | $129,653 | $149,036 | $140,669 |
| 9 | $135,119 | $132,019 | $128,919 | $137,609 | $132,629 |
| 10 | $134,373 | $132,973 | $131,573 | $136,921 | $131,825 |

Why each entry is included:

- **#1** `c6732eabb3c6f`: Highest merit (neighbourhood lower-quartile net P&L $152,555); recommended primary. 1 other pool members produced exactly the same trades.
- **#2** `cd503a8b8e804`: Merit rank 3; trades and parameters distinct from higher-ranked entries.
- **#3** `c833288d50e4b`: Merit rank 4; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#4** `c05e17e960d29`: Merit rank 5; trades and parameters distinct from higher-ranked entries. 13 other pool members produced exactly the same trades. Caveat: few trades.
- **#5** `c5ed90fea6876`: Merit rank 12; trades and parameters distinct from higher-ranked entries. 2 other pool members produced exactly the same trades.
- **#6** `ca2e7c8d74762`: Merit rank 15; trades and parameters distinct from higher-ranked entries.
- **#7** `c754c65ca6477`: Merit rank 18; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.
- **#8** `c2d0d34c200d3`: Merit rank 25; trades and parameters distinct from higher-ranked entries. 2 other pool members produced exactly the same trades.
- **#9** `c492406d408af`: Merit rank 28; trades and parameters distinct from higher-ranked entries.
- **#10** `c982a7435e677`: Merit rank 29; trades and parameters distinct from higher-ranked entries. Caveat: few trades.

## GOOGL (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,123 distinct candidates evaluated, 8,277 passed the gates, 103 were scored for robustness. Rejections (a candidate can fail several): drawdown 5,075, trades 4,129, profitable 1,718, yearConsistency 52, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 8.8%, stop 2.5%, hold 8, lookback 199, material 6.2%, re-entry 2.0%, reset 62.1%. Versus the original VGT defaults: dip 8.8% (original 10.0%); stop 2.5% (original 8.0%); hold (cal. days) 8 (original 15); lookback (sessions) 199 (original 90); material loss 6.2% (original 0.5%); re-entry decline 2.0% (original 3.0%); reset retrace 62.1% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c667c4c306fbe` | 8.8% | 2.5% | 8 | 199 | 6.2% | 2.0% | 62.1% | $215,236 | $260,351 | $45,115 | $25,628 (26%) | 150 | 63% | 2.62 | $1,016 | -$10,872 | 41% | 8 | 100% | $188,632 | $202,924 | 1 | 1 | GA run 1 gen 46 | merit |
| 2 | `c30087e18eb9a` | 10.5% | 2.1% | 53 | 233 | 9.1% | 13.4% | 61.0% | $190,960 | $227,667 | $36,707 | $26,055 (26%) | 80 | 85% | 5.19 | $1,687 | -$17,009 | 33% | 12 | 90% | $181,920 | $190,136 | 2 | 3 | GA run 0 gen 41 | merit |
| 3 | `c4796215bf9ba` | 8.6% | 2.5% | 8 | 199 | 8.4% | 10.1% | 45.2% | $188,008 | $234,178 | $46,170 | $25,130 (25%) | 150 | 61% | 2.31 | $756 | -$10,872 | 42% | 8 | 100% | $181,261 | $188,008 | 6 | 4 | GA run 1 gen 46 | merit |
| 4 | `c4a2bd442ca8d` | 8.8% | 2.5% | 8 | 194 | 8.4% | 6.9% | 78.3% | $196,368 | $242,899 | $46,532 | $26,224 (26%) | 154 | 60% | 2.40 | $755 | -$10,872 | 42% | 8 | 100% | $180,926 | $196,368 | 7 | 2 | GA run 1 gen 46 | merit |
| 5 | `c0de890a7ba31` | 8.8% | 2.5% | 8 | 207 | 8.3% | 5.1% | 61.8% | $194,841 | $241,554 | $46,712 | $27,750 (28%) | 154 | 60% | 2.38 | $755 | -$10,872 | 42% | 8 | 100% | $179,166 | $194,531 | 10 | 3 | GA run 1 gen 46 | merit |
| 6 | `c433856af15b7` | 10.5% | 2.1% | 53 | 231 | 8.5% | 15.0% | 61.0% | $189,906 | $226,553 | $36,647 | $27,109 (27%) | 79 | 85% | 5.17 | $1,835 | -$17,009 | 33% | 12 | 90% | $176,243 | $189,906 | 24 | 5 | GA run 0 gen 39 | merit |
| 7 | `c1dd9ce5034d7` | 8.8% | 2.5% | 8 | 208 | 8.0% | 10.1% | 72.4% | $192,130 | $237,727 | $45,597 | $25,130 (25%) | 148 | 61% | 2.39 | $872 | -$10,872 | 41% | 8 | 100% | $175,240 | $191,719 | 31 | 1 | GA run 1 gen 36 | merit |
| 8 | `ccbac507ff7e2` | 10.5% | 2.5% | 53 | 233 | 7.5% | 14.8% | 57.5% | $185,912 | $225,482 | $39,570 | $26,649 (27%) | 70 | 81% | 4.87 | $2,135 | -$17,009 | 36% | 14 | 100% | $174,287 | $185,912 | 34 | 6 | GA run 0 gen 40 | merit |
| 9 | `c7b344d465e39` | 10.5% | 2.4% | 53 | 249 | 8.0% | 14.8% | 64.0% | $187,882 | $227,121 | $39,238 | $28,481 (28%) | 74 | 81% | 4.91 | $2,082 | -$17,009 | 35% | 14 | 100% | $172,784 | $187,882 | 43 | 7 | GA run 0 gen 31 | merit |
| 10 | `c5952cd034574` | 8.8% | 2.7% | 8 | 196 | 6.2% | 2.2% | 44.5% | $191,404 | $237,243 | $45,838 | $23,415 (23%) | 145 | 59% | 2.39 | $801 | -$10,872 | 42% | 8 | 100% | $171,502 | $182,809 | 45 | 1 | GA run 1 gen 37 | merit |

Original defaults over the same window (for reference): net $16,031, max DD $42,911, 43 trades, interest $51,414.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $13,582 | $43,699 | $26,891 | $4,910 | $22,419 | $28,122 | $26,792 | $1,072 | $6,113 | $41,637 |
| 2 | $2,508 | $51,780 | $17,731 | $0 | $25,271 | $24,086 | $40,491 | $0 | -$10,279 | $39,373 |
| 3 | $5,212 | $43,143 | $26,891 | $4,569 | $17,934 | $27,597 | $21,460 | $3,475 | $9,489 | $28,238 |
| 4 | $5,212 | $43,699 | $26,891 | $4,910 | $22,419 | $28,122 | $26,792 | $1,072 | $9,013 | $28,238 |
| 5 | $5,212 | $43,699 | $26,891 | $4,910 | $22,419 | $28,122 | $26,792 | $1,072 | $7,487 | $28,238 |
| 6 | $2,508 | $51,780 | $17,731 | $0 | $25,271 | $24,086 | $40,491 | $0 | -$11,333 | $39,373 |
| 7 | $5,212 | $43,699 | $26,891 | $4,910 | $22,419 | $28,122 | $21,460 | $1,072 | $10,107 | $28,238 |
| 8 | $1,014 | $49,246 | $16,966 | $0 | $14,939 | $22,802 | $39,404 | $0 | $3,311 | $38,231 |
| 9 | $2,458 | $46,970 | $15,228 | $0 | $16,800 | $24,554 | $40,151 | $0 | $186 | $41,536 |
| 10 | $9,419 | $41,779 | $24,118 | $4,910 | $14,217 | $26,448 | $27,278 | $1,072 | $6,513 | $35,651 |
| original | -$7,113 | $24,014 | $4,081 | $12,410 | -$14,227 | $3,419 | $5,110 | $0 | -$18,182 | $6,520 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $215,236 | $200,236 | $185,236 | $227,540 | $202,931 |
| 2 | $190,960 | $182,960 | $174,960 | $200,971 | $180,949 |
| 3 | $188,008 | $173,008 | $158,008 | $200,599 | $175,416 |
| 4 | $196,368 | $180,968 | $165,568 | $209,058 | $183,677 |
| 5 | $194,841 | $179,441 | $164,041 | $207,581 | $182,102 |
| 6 | $189,906 | $182,006 | $174,106 | $199,901 | $179,912 |
| 7 | $192,130 | $177,330 | $162,530 | $204,566 | $179,694 |
| 8 | $185,912 | $178,912 | $171,912 | $196,704 | $175,120 |
| 9 | $187,882 | $180,482 | $173,082 | $198,584 | $177,181 |
| 10 | $191,404 | $176,904 | $162,404 | $203,906 | $178,903 |

Why each entry is included:

- **#1** `c667c4c306fbe`: Highest merit (neighbourhood lower-quartile net P&L $188,632); recommended primary. 1 other pool members produced exactly the same trades.
- **#2** `c30087e18eb9a`: Merit rank 2; trades and parameters distinct from higher-ranked entries. 14 other pool members produced exactly the same trades.
- **#3** `c4796215bf9ba`: Merit rank 6; trades and parameters distinct from higher-ranked entries.
- **#4** `c4a2bd442ca8d`: Merit rank 7; trades and parameters distinct from higher-ranked entries.
- **#5** `c0de890a7ba31`: Merit rank 10; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#6** `c433856af15b7`: Merit rank 24; trades and parameters distinct from higher-ranked entries. 5 other pool members produced exactly the same trades.
- **#7** `c1dd9ce5034d7`: Merit rank 31; trades and parameters distinct from higher-ranked entries. 10 other pool members produced exactly the same trades.
- **#8** `ccbac507ff7e2`: Merit rank 34; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.
- **#9** `c7b344d465e39`: Merit rank 43; trades and parameters distinct from higher-ranked entries.
- **#10** `c5952cd034574`: Merit rank 45; trades and parameters distinct from higher-ranked entries. 4 other pool members produced exactly the same trades.

## AMZN (Individual stocks)

Development window 2014-01-02 to 2023-12-29 (2516 sessions). 16,119 distinct candidates evaluated, 9,288 passed the gates, 94 were scored for robustness. Rejections (a candidate can fail several): drawdown 4,277, trades 4,012, profitable 887, yearConsistency 40, neighbourhoodDrawdown 0.

**Primary (rank 1)**: dip 25.1%, stop 8.8%, hold 10, lookback 96, material 6.0%, re-entry 7.9%, reset 79.4%. Versus the original VGT defaults: dip 25.1% (original 10.0%); stop 8.8% (original 8.0%); hold (cal. days) 10 (original 15); lookback (sessions) 96 (original 90); material loss 6.0% (original 0.5%); re-entry decline 7.9% (original 3.0%); reset retrace 79.4% (original 38.0%).

| Rank | ID | dip | stop | hold (cal. days) | lookback (sessions) | material loss | re-entry decline | reset retrace | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) | +yrs | Merit | Nbr median | Merit rank | Pareto | Origin | Inclusion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (primary) | `c110df10cabc8` | 25.1% | 8.8% | 10 | 96 | 6.0% | 7.9% | 79.4% | $136,285 | $160,153 | $23,868 | $23,293 (23%) | 18 | 67% | 5.08 | $5,312 | -$11,383 | 22% | 15 | 100% | $118,127 | $135,670 | 1 | 3 | GA run 1 gen 43 | merit |
| 2 | `ca9dff756d27f` | 24.7% | 8.8% | 5 | 94 | 9.7% | 10.2% | 62.7% | $133,362 | $157,713 | $24,351 | $23,042 (23%) | 30 | 43% | 3.76 | -$431 | -$11,711 | 22% | 9 | 80% | $117,647 | $133,362 | 2 | 3 | GA run 1 gen 20 | merit |
| 3 | `cd1e5296c6b50` | 25.1% | 8.8% | 5 | 95 | 6.6% | 8.0% | 45.5% | $133,977 | $158,298 | $24,321 | $23,042 (23%) | 30 | 43% | 3.77 | -$431 | -$11,711 | 22% | 9 | 90% | $116,298 | $133,362 | 3 | 2 | GA run 1 gen 37 | merit |
| 4 | `c3cfb45db5148` | 25.2% | 8.8% | 9 | 95 | 9.4% | 0.6% | 97.7% | $119,185 | $143,898 | $24,712 | $26,847 (27%) | 24 | 50% | 3.17 | $117 | -$11,383 | 22% | 11 | 100% | $114,383 | $119,185 | 5 | 8 | GA run 1 gen 38 | merit |
| 5 | `c53ce033b2170` | 25.0% | 8.8% | 11 | 96 | 8.8% | 7.9% | 96.3% | $141,822 | $165,631 | $23,808 | $23,413 (23%) | 17 | 71% | 5.42 | $4,746 | -$12,535 | 22% | 14 | 100% | $112,811 | $129,746 | 11 | 2 | GA run 1 gen 44 | merit |
| 6 | `cd2186c85ced8` | 23.1% | 8.8% | 16 | 96 | 6.5% | 7.2% | 47.9% | $124,557 | $146,044 | $21,488 | $27,326 (27%) | 23 | 57% | 3.90 | $3,784 | -$13,261 | 19% | 17 | 90% | $112,809 | $124,557 | 14 | 8 | GA run 1 gen 28 | merit |
| 7 | `ca7c8924a8761` | 25.0% | 8.8% | 11 | 96 | 4.8% | 6.2% | 96.5% | $138,024 | $162,556 | $24,532 | $27,571 (28%) | 19 | 63% | 4.87 | $4,260 | -$12,535 | 22% | 14 | 100% | $110,386 | $132,856 | 20 | 5 | GA run 1 gen 46 | merit |
| 8 | `c5d788d50be5d` | 24.2% | 8.8% | 5 | 97 | 6.6% | 12.1% | 97.9% | $137,830 | $162,362 | $24,532 | $23,042 (23%) | 29 | 45% | 3.86 | -$369 | -$11,711 | 22% | 9 | 90% | $110,100 | $134,917 | 21 | 2 | GA run 1 gen 42 | merit |
| 9 | `c37421f18ed61` | 24.4% | 8.9% | 11 | 96 | 6.2% | 8.0% | 46.3% | $139,916 | $163,754 | $23,838 | $23,526 (24%) | 17 | 71% | 5.37 | $4,631 | -$12,535 | 22% | 15 | 100% | $107,821 | $132,764 | 23 | 4 | GA run 1 gen 26 | merit |
| 10 | `c52838716f287` | 25.1% | 8.8% | 3 | 95 | 5.2% | 7.8% | 92.7% | $110,313 | $130,836 | $20,523 | $21,037 (21%) | 33 | 39% | 3.63 | -$313 | -$7,659 | 19% | 8 | 100% | $107,797 | $110,313 | 27 | 1 | GA run 1 gen 46 | merit |

Original defaults over the same window (for reference): net $140,441, max DD $67,576, 70 trades, interest $70,279.

Development net P&L by calendar year (in-sample):

| Rank | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $4,617 | $0 | $45,708 | $0 | $9,002 | $4,348 | $0 | $0 | $16,409 | $56,200 |
| 2 | -$2,548 | $0 | $43,157 | $0 | -$166 | $0 | $0 | $0 | $30,258 | $62,661 |
| 3 | -$2,548 | $0 | $43,157 | $0 | $449 | $0 | $0 | $0 | $30,258 | $62,661 |
| 4 | $4,617 | $0 | $45,708 | $0 | $1,893 | $0 | $0 | $0 | $4,939 | $62,028 |
| 5 | $4,617 | $0 | $45,708 | $0 | $8,701 | $4,260 | $0 | $0 | $16,233 | $62,302 |
| 6 | $214 | $0 | -$2,433 | $0 | $9,878 | $1,991 | $32,983 | $0 | $21,678 | $60,245 |
| 7 | $4,617 | $0 | $45,708 | $0 | $8,701 | $4,260 | $0 | $0 | $15,214 | $59,523 |
| 8 | $1,920 | $0 | $43,157 | $0 | -$166 | $0 | $0 | $0 | $30,258 | $62,661 |
| 9 | $4,617 | $0 | $45,540 | $0 | $7,971 | $4,144 | $0 | $0 | $15,637 | $62,007 |
| 10 | $5,820 | $0 | $49,023 | $0 | $9,231 | $1,909 | $0 | $0 | $28,379 | $15,950 |
| original | -$33,057 | $64,704 | $537 | $40,898 | $36,035 | -$2,482 | $28,868 | $1,315 | -$43,203 | $46,824 |

Sensitivity (approximate, from totals; not used for ranking):

| Rank | Net as modeled | 5 bps/side cost | 10 bps/side cost | Margin 8% | Margin 14% |
|---|---|---|---|---|---|
| 1 | $136,285 | $134,485 | $132,685 | $142,794 | $129,775 |
| 2 | $133,362 | $130,362 | $127,362 | $140,004 | $126,721 |
| 3 | $133,977 | $130,977 | $127,977 | $140,610 | $127,344 |
| 4 | $119,185 | $116,785 | $114,385 | $125,925 | $112,446 |
| 5 | $141,822 | $140,122 | $138,422 | $148,316 | $135,329 |
| 6 | $124,557 | $122,257 | $119,957 | $130,417 | $118,696 |
| 7 | $138,024 | $136,124 | $134,224 | $144,715 | $131,334 |
| 8 | $137,830 | $134,930 | $132,030 | $144,521 | $131,140 |
| 9 | $139,916 | $138,216 | $136,516 | $146,417 | $133,414 |
| 10 | $110,313 | $107,013 | $103,713 | $115,910 | $104,715 |

Why each entry is included:

- **#1** `c110df10cabc8`: Highest merit (neighbourhood lower-quartile net P&L $118,127); recommended primary. Caveat: few trades.
- **#2** `ca9dff756d27f`: Merit rank 2; trades and parameters distinct from higher-ranked entries. 5 other pool members produced exactly the same trades.
- **#3** `cd1e5296c6b50`: Merit rank 3; trades and parameters distinct from higher-ranked entries. 28 other pool members produced exactly the same trades.
- **#4** `c3cfb45db5148`: Merit rank 5; trades and parameters distinct from higher-ranked entries.
- **#5** `c53ce033b2170`: Merit rank 11; trades and parameters distinct from higher-ranked entries. 6 other pool members produced exactly the same trades. Caveat: few trades.
- **#6** `cd2186c85ced8`: Merit rank 14; trades and parameters distinct from higher-ranked entries.
- **#7** `ca7c8924a8761`: Merit rank 20; trades and parameters distinct from higher-ranked entries. Caveat: few trades.
- **#8** `c5d788d50be5d`: Merit rank 21; trades and parameters distinct from higher-ranked entries.
- **#9** `c37421f18ed61`: Merit rank 23; trades and parameters distinct from higher-ranked entries. 3 other pool members produced exactly the same trades. Caveat: few trades.
- **#10** `c52838716f287`: Merit rank 27; trades and parameters distinct from higher-ranked entries. 1 other pool members produced exactly the same trades.

