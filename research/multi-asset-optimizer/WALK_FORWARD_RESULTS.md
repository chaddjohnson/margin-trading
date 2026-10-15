# Walk-forward results

Experiment `main`. For each validation year Y in 2019, 2020, 2021, 2022, 2023, the full search (4,096 Sobol candidates plus 2 NSGA-II runs) and the selection policy were run on 2014-01-01 to Y-1 only; the resulting rank-1 parameters were then simulated on year Y. Each validation year starts flat (no position, no restriction), with earlier sessions used only as reference-high history; a position open on the last session is marked to market net of accrued interest.

**What this measures.** These are out-of-sample results for the *selection procedure* (re-optimizing each year), not for any single fixed parameter set. The final shortlist in [TOP_CANDIDATES.md](TOP_CANDIDATES.md) was chosen after using all of 2014–2023, so its 2019–2023 numbers are development (in-sample) numbers and must not be read as this table's out-of-sample results.

**Evidence classes (declared before the full run).** *Consistent out-of-sample evidence*: all five folds evaluated, at least four with positive out-of-sample P&L, total out-of-sample P&L above the original parameters' total over the same years, and a parameter-stability score ≤ 0.30. *Mixed*: positive total but not all of that. *Insufficient or negative*: total ≤ 0. The stability score is the mean, over the seven parameters, of (max − min of the fold rank-1 values) / (parameter range); 0 = identical every year, 1 = spanning the whole range.

## Summary across symbols

| Symbol | Group | Policy OOS net 2019–2023 | Original OOS net | Positive folds | Folds beating original | Policy OOS trades | Worst OOS-year max DD | Stability score | Classification |
|---|---|---|---|---|---|---|---|---|---|
| VGT | Technology-heavy / software ETFs | $32,538 | $125,008 | 3/5 | 1/5 | 61 | $27,490 | 0.41 | mixed |
| XLK | Technology-heavy / software ETFs | $6,318 | $99,071 | 2/5 | 1/5 | 43 | $40,461 | 0.49 | mixed |
| QQQ | Technology-heavy / software ETFs | $41,119 | $92,025 | 3/5 | 2/5 | 11 | $24,156 | 0.41 | mixed |
| IGV | Technology-heavy / software ETFs | -$12,904 | $56,230 | 1/5 | 2/5 | 48 | $36,232 | 0.39 | insufficient or negative |
| VOOG | Broad US market / large-cap growth ETFs | $36,795 | $53,874 | 3/5 | 2/5 | 32 | $21,774 | 0.33 | mixed |
| VOO | Broad US market / large-cap growth ETFs | $10,282 | $43,104 | 1/5 | 1/5 | 24 | $31,569 | 0.37 | mixed |
| SPY | Broad US market / large-cap growth ETFs | $4,327 | $42,473 | 1/5 | 1/5 | 30 | $31,291 | 0.40 | mixed |
| SMH | Semiconductor ETFs | $86,669 | $89,293 | 4/5 | 2/5 | 39 | $27,210 | 0.56 | mixed |
| SOXX | Semiconductor ETFs | $27,452 | $99,595 | 3/5 | 1/5 | 50 | $36,407 | 0.47 | mixed |
| VUG | Diversified growth ETFs | -$40,471 | $68,586 | 1/5 | 1/5 | 37 | $53,882 | 0.40 | insufficient or negative |
| SCHG | Diversified growth ETFs | -$24,617 | $65,389 | 2/5 | 1/5 | 31 | $45,789 | 0.30 | insufficient or negative |
| IWF | Diversified growth ETFs | -$24,526 | $88,391 | 1/5 | 1/5 | 55 | $32,743 | 0.33 | insufficient or negative |
| XLY | Consumer discretionary ETF | $17,088 | $48,563 | 3/5 | 1/5 | 41 | $31,190 | 0.46 | mixed |
| IWN | US small-cap value ETF | -$17,873 | $15,875 | 2/5 | 1/5 | 6 | $43,791 | 0.37 | insufficient or negative |
| NVDA | Individual stocks | $29,892 | $95,311 | 2/5 | 2/5 | 126 | $37,373 | 0.50 | mixed |
| AAPL | Individual stocks | $95,725 | $156,329 | 4/5 | 2/5 | 22 | $19,360 | 0.40 | mixed |
| MSFT | Individual stocks | $56,891 | $64,568 | 4/5 | 2/5 | 60 | $35,955 | 0.51 | mixed |
| AMD | Individual stocks | -$22,929 | $200,551 | 3/5 | 0/5 | 28 | $58,481 | 0.42 | insufficient or negative |
| META | Individual stocks | -$17,120 | $38,260 | 3/5 | 2/5 | 66 | $89,712 | 0.43 | insufficient or negative |
| GOOGL | Individual stocks | $67,618 | -$2,564 | 3/5 | 4/5 | 57 | $38,724 | 0.51 | mixed |
| AMZN | Individual stocks | $62,881 | $46,425 | 4/5 | 2/5 | 82 | $49,235 | 0.39 | mixed |

Across 21 symbols (measured): the re-optimizing policy earned $415,155 out of sample in total, against $1,586,357 for the unchanged original parameters over the same validation years. The policy beat the original on 2 of 21 symbols, was positive on 14, and met the "consistent" bar on 0.

## Correlation: the symbols are not independent

Daily close-to-close return correlations over 2014-01-01 to 2023-12-31; symbols joined when any pair in a chain has ρ ≥ 0.85. Agreement within a cluster is close to a single observation, not several.

- VGT, XLK, QQQ, IGV, VOOG, VOO, SPY, SMH, SOXX, VUG, SCHG, IWF, XLY, MSFT
- IWN
- NVDA
- AAPL
- AMD
- META
- GOOGL
- AMZN

## Sobol versus random exploration (control)

On each symbol's final 2014–2023 window, 3 independent seeds each of (a) 4,096 scrambled Sobol candidates and (b) 4,096 uniform pseudo-random candidates, each followed by the identical NSGA-II (same population, generations and per-run evaluation cap; early stopping off so both use the full budget) and the identical selection. Hypervolume is the area dominated by feasible, profitable points in (net P&L / allocation, drawdown / allocation) with reference point (0, 0.3). Means ± standard deviation across seeds.

| Symbol | Exploration HV Sobol | Exploration HV random | Final HV Sobol | Final HV random | Rank-1 merit Sobol | Rank-1 merit random | Simulations Sobol / random |
|---|---|---|---|---|---|---|---|
| VGT | 0.1288 ± 0.0087 | 0.1235 ± 0.0100 | 0.3334 ± 0.0038 | 0.3652 ± 0.0278 | $169,272 ± $12,773 | $176,227 ± $14,948 | 17603 / 17501 |
| XLK | 0.0990 ± 0.0036 | 0.1030 ± 0.0117 | 0.3198 ± 0.0189 | 0.3122 ± 0.0141 | $171,056 ± $6,041 | $165,954 ± $9,853 | 17771 / 17470 |
| QQQ | 0.1435 ± 0.0103 | 0.1281 ± 0.0182 | 0.3488 ± 0.0104 | 0.3610 ± 0.0200 | $169,289 ± $1,733 | $158,990 ± $5,340 | 18906 / 17945 |
| IGV | 0.1678 ± 0.0265 | 0.1567 ± 0.0222 | 0.3709 ± 0.0186 | 0.3780 ± 0.0494 | $164,816 ± $11,339 | $174,117 ± $11,730 | 17650 / 17634 |
| VOOG | 0.1093 ± 0.0161 | 0.1159 ± 0.0523 | 0.2686 ± 0.0161 | 0.2680 ± 0.0278 | $123,882 ± $4,825 | $119,699 ± $3,564 | 17587 / 17768 |
| VOO | 0.0941 ± 0.0089 | 0.0857 ± 0.0035 | 0.2050 ± 0.0059 | 0.1996 ± 0.0107 | $99,679 ± $8,853 | $101,975 ± $11,804 | 22455 / 23369 |
| SPY | 0.0932 ± 0.0035 | 0.0842 ± 0.0200 | 0.2073 ± 0.0053 | 0.1892 ± 0.0070 | $89,102 ± $274 | $85,834 ± $4,827 | 19120 / 21847 |
| SMH | 0.1395 ± 0.0273 | 0.1321 ± 0.0131 | 0.4220 ± 0.0253 | 0.3983 ± 0.0126 | $223,738 ± $6,255 | $225,601 ± $24,767 | 17609 / 17699 |
| SOXX | 0.1517 ± 0.0079 | 0.1367 ± 0.0121 | 0.3961 ± 0.0439 | 0.4202 ± 0.0289 | $221,083 ± $9,049 | $217,627 ± $13,959 | 17578 / 17569 |
| VUG | 0.1154 ± 0.0151 | 0.1052 ± 0.0027 | 0.2237 ± 0.0162 | 0.2633 ± 0.0274 | $110,348 ± $11,027 | $116,320 ± $3,508 | 17657 / 17476 |
| SCHG | 0.1046 ± 0.0115 | 0.1155 ± 0.0164 | 0.3061 ± 0.0183 | 0.2851 ± 0.0152 | $132,221 ± $4,308 | $120,369 ± $5,911 | 17483 / 17521 |
| IWF | 0.1049 ± 0.0189 | 0.0805 ± 0.0040 | 0.2733 ± 0.0044 | 0.2536 ± 0.0089 | $123,580 ± $7,770 | $121,386 ± $11,631 | 17683 / 17568 |
| XLY | 0.1012 ± 0.0110 | 0.1205 ± 0.0135 | 0.2206 ± 0.0051 | 0.2558 ± 0.0114 | $79,547 ± $6,421 | $95,407 ± $13,864 | 17612 / 17711 |
| IWN | 0.1426 ± 0.0258 | 0.1462 ± 0.0118 | 0.2324 ± 0.0002 | 0.2333 ± 0.0166 | $110,078 ± $1,373 | $113,568 ± $9,727 | 18732 / 19145 |
| NVDA | 0.0856 ± 0.0075 | 0.0977 ± 0.0104 | 0.3070 ± 0.0358 | 0.3362 ± 0.0890 | $144,177 ± $57,722 | $181,904 ± $92,482 | 17551 / 17637 |
| AAPL | 0.1535 ± 0.0289 | 0.1599 ± 0.0512 | 0.3835 ± 0.0166 | 0.3753 ± 0.0182 | $219,997 ± $8,650 | $212,473 ± $7,084 | 17479 / 17527 |
| MSFT | 0.1642 ± 0.0105 | 0.1835 ± 0.0135 | 0.4144 ± 0.0189 | 0.3943 ± 0.0227 | $253,941 ± $24,034 | $215,894 ± $5,554 | 17611 / 17482 |
| AMD | 0.2250 ± 0.0184 | 0.1838 ± 0.0105 | 0.3851 ± 0.0343 | 0.4120 ± 0.0229 | $187,713 ± $12,410 | $189,420 ± $16,213 | 17587 / 17897 |
| META | 0.0822 ± 0.0179 | 0.1015 ± 0.0123 | 0.4066 ± 0.1264 | 0.4596 ± 0.0754 | $238,051 ± $89,687 | $270,912 ± $50,787 | 17595 / 17712 |
| GOOGL | 0.1535 ± 0.0050 | 0.1393 ± 0.0109 | 0.3269 ± 0.0163 | 0.3095 ± 0.0131 | $178,818 ± $1,915 | $157,747 ± $15,972 | 17371 / 17663 |
| AMZN | 0.1430 ± 0.0260 | 0.1209 ± 0.0084 | 0.3132 ± 0.0418 | 0.3185 ± 0.0205 | $166,215 ± $22,801 | $189,791 ± $8,148 | 17501 / 17591 |

Sobol had the higher mean on: exploration hypervolume 12/21 symbols, final hypervolume 10/21, rank-1 merit 10/21. Differences larger than twice their standard error: exploration 3, final 4, merit 4 (with 3 seeds this is a coarse check, not a significance test).

## Per symbol

### VGT (Technology-heavy / software ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 9.0%, stop 5.9%, hold 1, lookback 177, material 0.0%, re-entry 13.1%, reset 52.5% | $84,928 / $10,860 / 10 | -$4,116 / $5,357 / 3 | $21,521 / 2 | $6,550 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 5.0%, stop 4.7%, hold 32, lookback 65, material 0.8%, re-entry 4.1%, reset 31.3% | $114,640 / $17,742 / 23 | $7,903 / $27,490 / 8 | $57,597 / 6 | -$10,575 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 7.3%, stop 7.3%, hold 14, lookback 210, material 0.2%, re-entry 13.9%, reset 53.3% | $160,110 / $22,210 / 18 | $8,683 / $9,781 / 3 | $1,830 / 1 | $8,683 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 3.6%, stop 2.3%, hold 9, lookback 206, material 2.3%, re-entry 3.9%, reset 11.5% | $183,418 / $13,421 / 109 | -$2,272 / $23,832 / 28 | -$165 / 11 | -$2,272 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 2.1%, stop 2.2%, hold 14, lookback 203, material 1.7%, re-entry 1.2%, reset 73.1% | $175,257 / $26,689 / 149 | $22,340 / $13,190 / 19 | $44,224 / 3 | $9,644 (10) |

Out-of-sample total $32,538 from 61 trades (original parameters $125,008 from 23). Parameter stability score 0.41 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 9.0% | 5.0% | 7.3% | 3.6% | 2.1% | 0.18 |
| stop | 5.9% | 4.7% | 7.3% | 2.3% | 2.2% | 0.13 |
| hold (cal. days) | 1 | 32 | 14 | 9 | 14 | 0.26 |
| lookback (sessions) | 177 | 65 | 210 | 206 | 203 | 0.60 |
| material loss | 0.0% | 0.8% | 0.2% | 2.3% | 1.7% | 0.23 |
| re-entry decline | 13.1% | 4.1% | 13.9% | 3.9% | 1.2% | 0.85 |
| reset retrace | 52.5% | 31.3% | 53.3% | 11.5% | 73.1% | 0.62 |

Trade logs: `results/main/VGT/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### XLK (Technology-heavy / software ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 6.6%, stop 5.5%, hold 29, lookback 196, material 0.6%, re-entry 11.0%, reset 84.1% | $72,778 / $13,217 / 12 | $36,141 / $10,507 / 3 | $20,962 / 2 | $35,883 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 6.9%, stop 5.5%, hold 29, lookback 173, material 0.2%, re-entry 12.7%, reset 60.9% | $109,104 / $11,324 / 13 | -$13,500 / $28,052 / 4 | $36,432 / 5 | -$14,807 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 10.7%, stop 9.7%, hold 3, lookback 115, material 2.2%, re-entry 7.8%, reset 80.4% | $147,291 / $22,531 / 17 | $0 / $0 / 0 | $0 / 0 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 4.7%, stop 7.4%, hold 10, lookback 107, material 9.0%, re-entry 3.6%, reset 24.4% | $152,927 / $27,825 / 30 | -$32,911 / $40,461 / 20 | -$5,867 / 12 | -$24,187 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 2.7%, stop 2.2%, hold 9, lookback 237, material 0.2%, re-entry 1.3%, reset 52.7% | $183,515 / $16,640 / 149 | $16,588 / $12,518 / 16 | $47,545 / 3 | $9,067 (10) |

Out-of-sample total $6,318 from 43 trades (original parameters $99,071 from 22). Parameter stability score 0.49 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 6.6% | 6.9% | 10.7% | 4.7% | 2.7% | 0.21 |
| stop | 5.5% | 5.5% | 9.7% | 7.4% | 2.2% | 0.20 |
| hold (cal. days) | 29 | 29 | 3 | 10 | 9 | 0.22 |
| lookback (sessions) | 196 | 173 | 115 | 107 | 237 | 0.54 |
| material loss | 0.6% | 0.2% | 2.2% | 9.0% | 0.2% | 0.88 |
| re-entry decline | 11.0% | 12.7% | 7.8% | 3.6% | 1.3% | 0.76 |
| reset retrace | 84.1% | 60.9% | 80.4% | 24.4% | 52.7% | 0.60 |

Trade logs: `results/main/XLK/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### QQQ (Technology-heavy / software ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 6.7%, stop 5.9%, hold 57, lookback 17, material 0.7%, re-entry 12.6%, reset 43.5% | $72,171 / $16,952 / 9 | $13,448 / $12,417 / 2 | $13,503 / 2 | $14,218 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 6.7%, stop 6.2%, hold 64, lookback 19, material 1.7%, re-entry 10.2%, reset 54.4% | $97,468 / $17,292 / 11 | $12,276 / $24,156 / 3 | $53,686 / 5 | $4,652 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 9.7%, stop 8.4%, hold 9, lookback 162, material 1.2%, re-entry 9.2%, reset 51.7% | $145,957 / $17,945 / 16 | $22,353 / $10,404 / 1 | $9,632 / 1 | $22,353 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 10.1%, stop 8.4%, hold 11, lookback 185, material 0.9%, re-entry 9.6%, reset 53.5% | $162,142 / $18,626 / 17 | -$6,958 / $19,330 / 5 | -$9,636 / 11 | -$7,097 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 21.9%, stop 7.4%, hold 3, lookback 76, material 0.6%, re-entry 0.5%, reset 30.3% | $100,903 / $12,831 / 9 | $0 / $0 / 0 | $24,840 / 2 | $0 (10) |

Out-of-sample total $41,119 from 11 trades (original parameters $92,025 from 21). Parameter stability score 0.41 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 6.7% | 6.7% | 9.7% | 10.1% | 21.9% | 0.40 |
| stop | 5.9% | 6.2% | 8.4% | 8.4% | 7.4% | 0.07 |
| hold (cal. days) | 57 | 64 | 9 | 11 | 3 | 0.51 |
| lookback (sessions) | 17 | 19 | 162 | 185 | 76 | 0.70 |
| material loss | 0.7% | 1.7% | 1.2% | 0.9% | 0.6% | 0.11 |
| re-entry decline | 12.6% | 10.2% | 9.2% | 9.6% | 0.5% | 0.81 |
| reset retrace | 43.5% | 54.4% | 51.7% | 53.5% | 30.3% | 0.24 |

Trade logs: `results/main/QQQ/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### IGV (Technology-heavy / software ETFs): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 5.2%, stop 3.8%, hold 8, lookback 230, material 1.6%, re-entry 9.3%, reset 53.9% | $123,153 / $10,148 / 35 | $17,709 / $12,524 / 11 | $12,805 / 2 | $17,709 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 5.2%, stop 3.3%, hold 8, lookback 87, material 4.5%, re-entry 9.2%, reset 98.8% | $126,274 / $13,892 / 48 | -$680 / $22,569 / 10 | $35,800 / 5 | $5,928 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 9.2%, stop 11.0%, hold 12, lookback 152, material 0.7%, re-entry 9.7%, reset 65.4% | $181,827 / $29,908 / 14 | -$8,567 / $18,906 / 7 | $4,940 / 5 | -$8,567 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 4.6%, stop 3.2%, hold 11, lookback 172, material 3.2%, re-entry 3.5%, reset 59.0% | $180,654 / $15,452 / 81 | -$21,366 / $36,232 / 20 | -$23,021 / 15 | -$23,979 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 21.6%, stop 10.7%, hold 22, lookback 58, material 2.4%, re-entry 5.5%, reset 56.0% | $166,427 / $27,702 / 10 | $0 / $0 / 0 | $25,705 / 3 | $0 (10) |

Out-of-sample total -$12,904 from 48 trades (original parameters $56,230 from 30). Parameter stability score 0.39 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 5.2% | 5.2% | 9.2% | 4.6% | 21.6% | 0.45 |
| stop | 3.8% | 3.3% | 11.0% | 3.2% | 10.7% | 0.21 |
| hold (cal. days) | 8 | 8 | 12 | 11 | 22 | 0.12 |
| lookback (sessions) | 230 | 87 | 152 | 172 | 58 | 0.72 |
| material loss | 1.6% | 4.5% | 0.7% | 3.2% | 2.4% | 0.38 |
| re-entry decline | 9.3% | 9.2% | 9.7% | 3.5% | 5.5% | 0.41 |
| reset retrace | 53.9% | 98.8% | 65.4% | 59.0% | 56.0% | 0.45 |

Trade logs: `results/main/IGV/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### VOOG (Broad US market / large-cap growth ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.8%, stop 2.7%, hold 26, lookback 34, material 0.0%, re-entry 1.9%, reset 73.2% | $68,055 / $11,098 / 19 | $13,605 / $4,352 / 4 | $20,168 / 1 | $13,605 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 4.3%, stop 2.7%, hold 11, lookback 120, material 3.8%, re-entry 3.8%, reset 56.0% | $83,030 / $11,880 / 37 | $13,884 / $21,774 / 17 | $49,270 / 4 | $3,341 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 9.6%, stop 7.4%, hold 12, lookback 126, material 0.7%, re-entry 5.3%, reset 79.6% | $123,791 / $18,069 / 13 | $0 / $0 / 0 | $0 / 0 | $0 (1) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 8.9%, stop 8.1%, hold 9, lookback 241, material 0.7%, re-entry 4.9%, reset 94.3% | $130,711 / $20,992 / 15 | -$3,248 / $16,430 / 9 | -$15,501 / 11 | -$1,591 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 8.9%, stop 7.5%, hold 13, lookback 53, material 0.4%, re-entry 4.8%, reset 78.9% | $129,869 / $18,218 / 24 | $12,554 / $8,863 / 2 | -$63 / 1 | $12,115 (10) |

Out-of-sample total $36,795 from 32 trades (original parameters $53,874 from 17). Parameter stability score 0.33 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.8% | 4.3% | 9.6% | 8.9% | 8.9% | 0.14 |
| stop | 2.7% | 2.7% | 7.4% | 8.1% | 7.5% | 0.14 |
| hold (cal. days) | 26 | 11 | 12 | 9 | 13 | 0.14 |
| lookback (sessions) | 34 | 120 | 126 | 241 | 53 | 0.86 |
| material loss | 0.0% | 3.8% | 0.7% | 0.7% | 0.4% | 0.38 |
| re-entry decline | 1.9% | 3.8% | 5.3% | 4.9% | 4.8% | 0.23 |
| reset retrace | 73.2% | 56.0% | 79.6% | 94.3% | 78.9% | 0.38 |

Trade logs: `results/main/VOOG/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### VOO (Broad US market / large-cap growth ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.3%, stop 2.1%, hold 29, lookback 112, material 0.1%, re-entry 10.6%, reset 17.3% | $52,529 / $10,777 / 26 | $17,935 / $3,965 / 9 | $20,328 / 1 | $17,777 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 4.3%, stop 2.1%, hold 61, lookback 180, material 0.3%, re-entry 7.9%, reset 49.9% | $69,122 / $12,342 / 32 | -$1,447 / $31,569 / 7 | $17,879 / 3 | -$806 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 12.8%, stop 10.6%, hold 2, lookback 147, material 4.0%, re-entry 10.9%, reset 69.3% | $90,811 / $21,420 / 7 | $0 / $0 / 0 | $0 / 0 | $0 (2) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 11.0%, stop 11.1%, hold 4, lookback 122, material 0.2%, re-entry 7.0%, reset 50.3% | $134,021 / $20,456 / 8 | -$6,206 / $12,088 / 8 | -$9,446 / 9 | -$6,959 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 12.4%, stop 10.6%, hold 2, lookback 64, material 0.0%, re-entry 7.0%, reset 68.1% | $122,674 / $24,640 / 11 | $0 / $0 / 0 | $14,343 / 1 | $0 (10) |

Out-of-sample total $10,282 from 24 trades (original parameters $43,104 from 14). Parameter stability score 0.37 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.3% | 4.3% | 12.8% | 11.0% | 12.4% | 0.22 |
| stop | 2.1% | 2.1% | 10.6% | 11.1% | 10.6% | 0.24 |
| hold (cal. days) | 29 | 61 | 2 | 4 | 2 | 0.50 |
| lookback (sessions) | 112 | 180 | 147 | 122 | 64 | 0.48 |
| material loss | 0.1% | 0.3% | 4.0% | 0.2% | 0.0% | 0.40 |
| re-entry decline | 10.6% | 7.9% | 10.9% | 7.0% | 7.0% | 0.26 |
| reset retrace | 17.3% | 49.9% | 69.3% | 50.3% | 68.1% | 0.52 |

Trade logs: `results/main/VOO/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### SPY (Broad US market / large-cap growth ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.2%, stop 2.1%, hold 31, lookback 205, material 0.0%, re-entry 8.7%, reset 9.2% | $49,264 / $10,632 / 24 | $17,110 / $4,766 / 9 | $20,149 / 1 | $17,110 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 4.1%, stop 3.4%, hold 31, lookback 237, material 0.5%, re-entry 7.5%, reset 14.2% | $64,268 / $12,012 / 22 | -$5,664 / $31,291 / 7 | $17,501 / 3 | -$5,664 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 8.6%, stop 7.6%, hold 8, lookback 174, material 1.2%, re-entry 7.0%, reset 36.0% | $90,442 / $16,215 / 18 | $0 / $0 / 0 | $0 / 0 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 12.3%, stop 10.6%, hold 2, lookback 238, material 4.8%, re-entry 11.3%, reset 41.9% | $125,602 / $22,918 / 8 | -$7,119 / $19,760 / 14 | -$9,485 / 9 | -$12,704 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 13.0%, stop 3.6%, hold 45, lookback 75, material 1.5%, re-entry 5.2%, reset 48.4% | $62,711 / $12,344 / 13 | $0 / $0 / 0 | $14,308 / 1 | $0 (10) |

Out-of-sample total $4,327 from 30 trades (original parameters $42,473 from 14). Parameter stability score 0.40 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.2% | 4.1% | 8.6% | 12.3% | 13.0% | 0.23 |
| stop | 2.1% | 3.4% | 7.6% | 10.6% | 3.6% | 0.22 |
| hold (cal. days) | 31 | 31 | 8 | 2 | 45 | 0.36 |
| lookback (sessions) | 205 | 237 | 174 | 238 | 75 | 0.68 |
| material loss | 0.0% | 0.5% | 1.2% | 4.8% | 1.5% | 0.48 |
| re-entry decline | 8.7% | 7.5% | 7.0% | 11.3% | 5.2% | 0.41 |
| reset retrace | 9.2% | 14.2% | 36.0% | 41.9% | 48.4% | 0.39 |

Trade logs: `results/main/SPY/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### SMH (Semiconductor ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 14.7%, stop 9.9%, hold 48, lookback 26, material 6.8%, re-entry 14.0%, reset 69.0% | $118,974 / $25,312 / 5 | $34,247 / $17,069 / 2 | $51,102 / 4 | $33,517 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 14.7%, stop 10.0%, hold 6, lookback 27, material 2.8%, re-entry 7.6%, reset 26.5% | $149,932 / $26,683 / 8 | $25,918 / $23,847 / 4 | $4,622 / 6 | $16,886 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 3.2%, stop 3.0%, hold 13, lookback 100, material 1.4%, re-entry 3.1%, reset 93.6% | $187,200 / $20,151 / 88 | $29,851 / $8,539 / 18 | $11,547 / 2 | $23,180 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 3.1%, stop 2.0%, hold 14, lookback 146, material 4.5%, re-entry 10.4%, reset 51.5% | $223,607 / $24,449 / 150 | -$17,968 / $27,210 / 14 | -$13,408 / 14 | -$17,968 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 22.2%, stop 9.8%, hold 15, lookback 248, material 5.0%, re-entry 5.7%, reset 45.9% | $144,835 / $26,762 / 15 | $14,620 / $13,451 / 1 | $35,429 / 3 | $14,620 (10) |

Out-of-sample total $86,669 from 39 trades (original parameters $89,293 from 29). Parameter stability score 0.56 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 14.7% | 14.7% | 3.2% | 3.1% | 22.2% | 0.50 |
| stop | 9.9% | 10.0% | 3.0% | 2.0% | 9.8% | 0.21 |
| hold (cal. days) | 48 | 6 | 13 | 14 | 15 | 0.35 |
| lookback (sessions) | 26 | 27 | 100 | 146 | 248 | 0.93 |
| material loss | 6.8% | 2.8% | 1.4% | 4.5% | 5.0% | 0.54 |
| re-entry decline | 14.0% | 7.6% | 3.1% | 10.4% | 5.7% | 0.73 |
| reset retrace | 69.0% | 26.5% | 93.6% | 51.5% | 45.9% | 0.67 |

Trade logs: `results/main/SMH/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### SOXX (Semiconductor ETFs): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 16.4%, stop 11.2%, hold 24, lookback 28, material 6.9%, re-entry 5.3%, reset 48.5% | $127,868 / $29,744 / 6 | $7,068 / $13,935 / 1 | $46,516 / 4 | $5,156 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 3.0%, stop 2.1%, hold 45, lookback 160, material 4.3%, re-entry 3.3%, reset 94.4% | $160,302 / $22,355 / 68 | -$4,418 / $34,411 / 12 | $16,603 / 7 | -$4,909 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 9.9%, stop 10.6%, hold 7, lookback 41, material 0.2%, re-entry 4.0%, reset 64.4% | $213,417 / $26,921 / 21 | $33,413 / $15,987 / 2 | $7,192 / 2 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 15.1%, stop 3.6%, hold 50, lookback 95, material 0.2%, re-entry 3.0%, reset 1.5% | $116,153 / $16,501 / 25 | -$17,028 / $36,407 / 13 | -$8,901 / 13 | -$14,804 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 3.7%, stop 2.0%, hold 14, lookback 67, material 2.6%, re-entry 4.6%, reset 99.1% | $227,111 / $20,045 / 160 | $8,417 / $12,316 / 22 | $38,185 / 4 | $22,472 (10) |

Out-of-sample total $27,452 from 50 trades (original parameters $99,595 from 30). Parameter stability score 0.47 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 16.4% | 3.0% | 9.9% | 15.1% | 3.7% | 0.35 |
| stop | 11.2% | 2.1% | 10.6% | 3.6% | 2.0% | 0.24 |
| hold (cal. days) | 24 | 45 | 7 | 50 | 14 | 0.36 |
| lookback (sessions) | 28 | 160 | 41 | 95 | 67 | 0.55 |
| material loss | 6.9% | 4.3% | 0.2% | 0.2% | 2.6% | 0.67 |
| re-entry decline | 5.3% | 3.3% | 4.0% | 3.0% | 4.6% | 0.15 |
| reset retrace | 48.5% | 94.4% | 64.4% | 1.5% | 99.1% | 0.98 |

Trade logs: `results/main/SOXX/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### VUG (Diversified growth ETFs): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.6%, stop 3.4%, hold 30, lookback 38, material 0.8%, re-entry 5.6%, reset 35.8% | $61,367 / $14,044 / 19 | $24,009 / $7,213 / 5 | $8,469 / 1 | $24,009 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 4.8%, stop 3.3%, hold 30, lookback 108, material 0.6%, re-entry 10.7%, reset 33.7% | $81,959 / $10,343 / 25 | -$11,776 / $28,420 / 9 | $57,761 / 4 | -$11,776 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 13.2%, stop 12.7%, hold 3, lookback 92, material 5.2%, re-entry 9.2%, reset 62.7% | $121,041 / $27,164 / 8 | $0 / $0 / 0 | $0 / 0 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 13.4%, stop 12.7%, hold 3, lookback 220, material 4.0%, re-entry 9.2%, reset 34.4% | $160,849 / $27,164 / 8 | -$52,703 / $53,882 / 23 | -$21,139 / 11 | -$37,639 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 21.8%, stop 9.1%, hold 8, lookback 147, material 0.6%, re-entry 4.9%, reset 38.1% | $100,742 / $19,627 / 9 | $0 / $0 / 0 | $23,496 / 2 | $0 (10) |

Out-of-sample total -$40,471 from 37 trades (original parameters $68,586 from 18). Parameter stability score 0.40 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.6% | 4.8% | 13.2% | 13.4% | 21.8% | 0.45 |
| stop | 3.4% | 3.3% | 12.7% | 12.7% | 9.1% | 0.25 |
| hold (cal. days) | 30 | 30 | 3 | 3 | 8 | 0.23 |
| lookback (sessions) | 38 | 108 | 92 | 220 | 147 | 0.76 |
| material loss | 0.8% | 0.6% | 5.2% | 4.0% | 0.6% | 0.46 |
| re-entry decline | 5.6% | 10.7% | 9.2% | 9.2% | 4.9% | 0.39 |
| reset retrace | 35.8% | 33.7% | 62.7% | 34.4% | 38.1% | 0.29 |

Trade logs: `results/main/VUG/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### SCHG (Diversified growth ETFs): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.6%, stop 3.3%, hold 24, lookback 121, material 0.3%, re-entry 9.2%, reset 91.1% | $64,160 / $11,233 / 18 | $26,178 / $7,071 / 6 | $7,132 / 1 | $17,612 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 4.8%, stop 3.1%, hold 24, lookback 124, material 0.4%, re-entry 10.1%, reset 66.4% | $91,080 / $9,415 / 24 | -$18,224 / $28,935 / 8 | $43,182 / 3 | -$19,088 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 14.0%, stop 12.4%, hold 3, lookback 84, material 3.8%, re-entry 9.8%, reset 82.8% | $121,089 / $25,942 / 8 | $0 / $0 / 0 | $4,520 / 1 | $15,002 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 13.1%, stop 12.4%, hold 3, lookback 83, material 3.7%, re-entry 10.2%, reset 60.0% | $165,865 / $26,911 / 8 | -$40,350 / $45,789 / 16 | -$11,684 / 11 | -$15,210 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 20.9%, stop 7.7%, hold 10, lookback 97, material 1.6%, re-entry 5.7%, reset 47.3% | $93,271 / $14,611 / 11 | $7,779 / $9,591 / 1 | $22,239 / 2 | $0 (10) |

Out-of-sample total -$24,617 from 31 trades (original parameters $65,389 from 18). Parameter stability score 0.30 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.6% | 4.8% | 14.0% | 13.1% | 20.9% | 0.43 |
| stop | 3.3% | 3.1% | 12.4% | 12.4% | 7.7% | 0.24 |
| hold (cal. days) | 24 | 24 | 3 | 3 | 10 | 0.18 |
| lookback (sessions) | 121 | 124 | 84 | 83 | 97 | 0.17 |
| material loss | 0.3% | 0.4% | 3.8% | 3.7% | 1.6% | 0.35 |
| re-entry decline | 9.2% | 10.1% | 9.8% | 10.2% | 5.7% | 0.30 |
| reset retrace | 91.1% | 66.4% | 82.8% | 60.0% | 47.3% | 0.44 |

Trade logs: `results/main/SCHG/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### IWF (Diversified growth ETFs): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.7%, stop 2.9%, hold 4, lookback 94, material 2.7%, re-entry 9.6%, reset 26.4% | $63,062 / $8,729 / 35 | $19,295 / $5,452 / 8 | $7,541 / 1 | $25,742 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 5.2%, stop 3.0%, hold 4, lookback 202, material 2.5%, re-entry 9.1%, reset 24.8% | $88,339 / $9,369 / 41 | -$9,453 / $21,254 / 19 | $52,036 / 4 | -$9,453 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 10.8%, stop 9.5%, hold 10, lookback 34, material 2.5%, re-entry 12.0%, reset 64.8% | $111,363 / $26,013 / 10 | $0 / $0 / 0 | $24,607 / 1 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 4.4%, stop 2.4%, hold 12, lookback 159, material 3.4%, re-entry 3.0%, reset 53.1% | $115,257 / $21,823 / 62 | -$31,014 / $32,743 / 14 | -$15,119 / 11 | -$14,565 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 3.0%, stop 2.0%, hold 9, lookback 171, material 1.7%, re-entry 3.8%, reset 56.5% | $141,782 / $16,043 / 113 | -$3,354 / $11,705 / 14 | $19,327 / 2 | -$3,354 (10) |

Out-of-sample total -$24,526 from 55 trades (original parameters $88,391 from 19). Parameter stability score 0.33 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.7% | 5.2% | 10.8% | 4.4% | 3.0% | 0.21 |
| stop | 2.9% | 3.0% | 9.5% | 2.4% | 2.0% | 0.20 |
| hold (cal. days) | 4 | 4 | 10 | 12 | 9 | 0.07 |
| lookback (sessions) | 94 | 202 | 34 | 159 | 171 | 0.70 |
| material loss | 2.7% | 2.5% | 2.5% | 3.4% | 1.7% | 0.17 |
| re-entry decline | 9.6% | 9.1% | 12.0% | 3.0% | 3.8% | 0.60 |
| reset retrace | 26.4% | 24.8% | 64.8% | 53.1% | 56.5% | 0.40 |

Trade logs: `results/main/IWF/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### XLY (Consumer discretionary ETF): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 4.5%, stop 2.2%, hold 29, lookback 178, material 0.4%, re-entry 3.8%, reset 88.7% | $55,553 / $17,015 / 30 | $13,783 / $6,246 / 8 | $7,463 / 1 | $12,551 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 4.5%, stop 2.4%, hold 35, lookback 201, material 3.1%, re-entry 5.7%, reset 79.8% | $75,062 / $13,367 / 36 | $13,629 / $31,190 / 12 | $19,982 / 3 | $12,476 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 7.5%, stop 2.0%, hold 9, lookback 168, material 0.3%, re-entry 3.9%, reset 51.2% | $97,243 / $11,767 / 40 | $6,029 / $6,201 / 3 | $10,472 / 2 | $12,286 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 3.5%, stop 2.2%, hold 9, lookback 107, material 3.8%, re-entry 3.6%, reset 52.2% | $130,680 / $13,552 / 97 | -$16,354 / $19,546 / 18 | -$12,571 / 14 | -$14,199 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 21.6%, stop 10.2%, hold 18, lookback 77, material 8.3%, re-entry 13.1%, reset 63.7% | $82,544 / $26,973 / 9 | $0 / $0 / 0 | $23,216 / 4 | $0 (10) |

Out-of-sample total $17,088 from 41 trades (original parameters $48,563 from 24). Parameter stability score 0.46 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 4.5% | 4.5% | 7.5% | 3.5% | 21.6% | 0.48 |
| stop | 2.2% | 2.4% | 2.0% | 2.2% | 10.2% | 0.22 |
| hold (cal. days) | 29 | 35 | 9 | 9 | 18 | 0.22 |
| lookback (sessions) | 178 | 201 | 168 | 107 | 77 | 0.52 |
| material loss | 0.4% | 3.1% | 0.3% | 3.8% | 8.3% | 0.80 |
| re-entry decline | 3.8% | 5.7% | 3.9% | 3.6% | 13.1% | 0.63 |
| reset retrace | 88.7% | 79.8% | 51.2% | 52.2% | 63.7% | 0.38 |

Trade logs: `results/main/XLY/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### IWN (US small-cap value ETF): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 5.8%, stop 2.1%, hold 14, lookback 157, material 0.1%, re-entry 14.3%, reset 75.7% | $68,688 / $7,014 / 27 | $9,926 / $5,475 / 3 | $15,419 / 2 | $3,655 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 5.8%, stop 2.2%, hold 55, lookback 96, material 1.0%, re-entry 11.7%, reset 81.0% | $85,021 / $12,652 / 29 | -$30,323 / $43,791 / 2 | -$916 / 7 | -$30,114 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 22.4%, stop 2.8%, hold 61, lookback 159, material 0.0%, re-entry 0.3%, reset 62.4% | $99,321 / $13,601 / 18 | $0 / $0 / 0 | $8,702 / 4 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 22.4%, stop 2.8%, hold 11, lookback 160, material 0.1%, re-entry 0.0%, reset 79.3% | $102,260 / $13,601 / 19 | $2,523 / $1,704 / 1 | -$10,212 / 8 | $5,845 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 21.5%, stop 2.8%, hold 66, lookback 207, material 0.1%, re-entry 0.1%, reset 67.5% | $120,597 / $13,601 / 26 | $0 / $0 / 0 | $2,881 / 4 | $0 (10) |

Out-of-sample total -$17,873 from 6 trades (original parameters $15,875 from 25). Parameter stability score 0.37 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 5.8% | 5.8% | 22.4% | 22.4% | 21.5% | 0.44 |
| stop | 2.1% | 2.2% | 2.8% | 2.8% | 2.8% | 0.02 |
| hold (cal. days) | 14 | 55 | 61 | 11 | 66 | 0.46 |
| lookback (sessions) | 157 | 96 | 159 | 160 | 207 | 0.46 |
| material loss | 0.1% | 1.0% | 0.0% | 0.1% | 0.1% | 0.10 |
| re-entry decline | 14.3% | 11.7% | 0.3% | 0.0% | 0.1% | 0.95 |
| reset retrace | 75.7% | 81.0% | 62.4% | 79.3% | 67.5% | 0.19 |

Trade logs: `results/main/IWN/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### NVDA (Individual stocks): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 5.3%, stop 4.3%, hold 1, lookback 187, material 3.3%, re-entry 10.4%, reset 21.0% | $279,207 / $19,976 / 154 | $34,789 / $14,417 / 48 | $20,939 / 8 | $30,197 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 5.0%, stop 4.5%, hold 1, lookback 92, material 3.6%, re-entry 11.1%, reset 17.3% | $340,520 / $18,471 / 208 | $11,662 / $33,564 / 40 | $29,274 / 8 | $2,667 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 34.2%, stop 10.6%, hold 11, lookback 239, material 6.0%, re-entry 11.7%, reset 31.6% | $116,200 / $29,411 / 11 | $0 / $0 / 0 | $25,580 / 8 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 14.3%, stop 4.8%, hold 2, lookback 131, material 0.4%, re-entry 12.3%, reset 9.8% | $288,790 / $19,482 / 74 | -$16,559 / $37,373 / 38 | -$21,274 / 18 | -$53,251 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 34.3%, stop 4.3%, hold 46, lookback 90, material 0.1%, re-entry 12.3%, reset 94.6% | $127,110 / $24,688 / 24 | $0 / $0 / 0 | $40,792 / 6 | $0 (10) |

Out-of-sample total $29,892 from 126 trades (original parameters $95,311 from 48). Parameter stability score 0.50 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 5.3% | 5.0% | 34.2% | 14.3% | 34.3% | 0.77 |
| stop | 4.3% | 4.5% | 10.6% | 4.8% | 4.3% | 0.17 |
| hold (cal. days) | 1 | 1 | 11 | 2 | 46 | 0.38 |
| lookback (sessions) | 187 | 92 | 239 | 131 | 90 | 0.62 |
| material loss | 3.3% | 3.6% | 6.0% | 0.4% | 0.1% | 0.59 |
| re-entry decline | 10.4% | 11.1% | 11.7% | 12.3% | 12.3% | 0.13 |
| reset retrace | 21.0% | 17.3% | 31.6% | 9.8% | 94.6% | 0.85 |

Trade logs: `results/main/NVDA/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### AAPL (Individual stocks): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 7.6%, stop 8.3%, hold 16, lookback 202, material 2.5%, re-entry 9.7%, reset 70.3% | $121,006 / $24,568 / 25 | $15,570 / $19,360 / 3 | $62,011 / 5 | $15,214 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 9.5%, stop 7.1%, hold 6, lookback 105, material 1.8%, re-entry 2.9%, reset 51.3% | $203,417 / $24,817 / 38 | $41,223 / $19,233 / 11 | $49,428 / 7 | $36,394 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 20.6%, stop 13.1%, hold 7, lookback 247, material 2.8%, re-entry 14.9%, reset 32.1% | $247,961 / $29,663 / 13 | $0 / $0 / 0 | $26,715 / 4 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 6.0%, stop 8.4%, hold 13, lookback 119, material 1.7%, re-entry 14.6%, reset 64.9% | $276,696 / $24,820 / 41 | $5,860 / $18,153 / 7 | -$6,397 / 11 | $2,374 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 27.4%, stop 12.0%, hold 6, lookback 241, material 1.3%, re-entry 13.3%, reset 22.5% | $211,271 / $26,220 / 12 | $33,072 / $18,158 / 1 | $24,571 / 4 | $33,231 (10) |

Out-of-sample total $95,725 from 22 trades (original parameters $156,329 from 31). Parameter stability score 0.40 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 7.6% | 9.5% | 20.6% | 6.0% | 27.4% | 0.56 |
| stop | 8.3% | 7.1% | 13.1% | 8.4% | 12.0% | 0.16 |
| hold (cal. days) | 16 | 6 | 7 | 13 | 6 | 0.08 |
| lookback (sessions) | 202 | 105 | 247 | 119 | 241 | 0.59 |
| material loss | 2.5% | 1.8% | 2.8% | 1.7% | 1.3% | 0.15 |
| re-entry decline | 9.7% | 2.9% | 14.9% | 14.6% | 13.3% | 0.80 |
| reset retrace | 70.3% | 51.3% | 32.1% | 64.9% | 22.5% | 0.48 |

Trade logs: `results/main/AAPL/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### MSFT (Individual stocks): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 8.6%, stop 3.2%, hold 20, lookback 194, material 8.6%, re-entry 14.1%, reset 77.4% | $109,995 / $10,334 / 28 | $692 / $5,660 / 3 | $15,464 / 1 | $2,921 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 11.5%, stop 11.0%, hold 7, lookback 60, material 8.8%, re-entry 4.6%, reset 35.7% | $150,783 / $20,518 / 14 | $44,846 / $20,130 / 5 | $22,062 / 6 | $34,711 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 2.8%, stop 2.6%, hold 11, lookback 127, material 2.6%, re-entry 8.4%, reset 1.0% | $171,705 / $24,639 / 132 | $23,131 / $11,762 / 15 | $0 / 0 | $33,675 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 3.5%, stop 2.6%, hold 8, lookback 237, material 4.7%, re-entry 2.5%, reset 88.5% | $207,670 / $21,484 / 151 | -$30,320 / $35,955 / 24 | -$10,611 / 12 | -$37,831 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 2.4%, stop 3.2%, hold 22, lookback 133, material 6.3%, re-entry 3.0%, reset 88.5% | $203,468 / $21,047 / 128 | $18,541 / $12,381 / 13 | $37,653 / 5 | $18,541 (10) |

Out-of-sample total $56,891 from 60 trades (original parameters $64,568 from 24). Parameter stability score 0.51 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 8.6% | 11.5% | 2.8% | 3.5% | 2.4% | 0.24 |
| stop | 3.2% | 11.0% | 2.6% | 2.6% | 3.2% | 0.22 |
| hold (cal. days) | 20 | 7 | 11 | 8 | 22 | 0.13 |
| lookback (sessions) | 194 | 60 | 127 | 237 | 133 | 0.74 |
| material loss | 8.6% | 8.8% | 2.6% | 4.7% | 6.3% | 0.62 |
| re-entry decline | 14.1% | 4.6% | 8.4% | 2.5% | 3.0% | 0.77 |
| reset retrace | 77.4% | 35.7% | 1.0% | 88.5% | 88.5% | 0.88 |

Trade logs: `results/main/MSFT/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### AMD (Individual stocks): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 37.4%, stop 6.4%, hold 8, lookback 216, material 6.0%, re-entry 11.0%, reset 11.4% | $168,404 / $24,583 / 32 | $15,117 / $14,688 / 3 | $75,022 / 12 | $15,117 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 38.9%, stop 3.1%, hold 44, lookback 186, material 1.3%, re-entry 12.1%, reset 20.1% | $159,514 / $18,006 / 30 | $0 / $0 / 0 | $46,969 / 13 | $1,879 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 19.6%, stop 2.7%, hold 5, lookback 198, material 4.8%, re-entry 11.2%, reset 49.2% | $242,779 / $26,181 / 111 | $13,410 / $8,333 / 10 | $27,682 / 11 | $13,410 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 24.8%, stop 2.2%, hold 25, lookback 154, material 3.6%, re-entry 13.4%, reset 44.6% | $245,201 / $29,837 / 74 | -$55,384 / $58,481 / 14 | -$55,163 / 19 | -$41,552 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 36.5%, stop 2.8%, hold 85, lookback 103, material 1.8%, re-entry 13.4%, reset 66.0% | $200,266 / $22,864 / 36 | $3,928 / $3,670 / 1 | $106,039 / 10 | $3,928 (10) |

Out-of-sample total -$22,929 from 28 trades (original parameters $200,551 from 65). Parameter stability score 0.42 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 37.4% | 38.9% | 19.6% | 24.8% | 36.5% | 0.51 |
| stop | 6.4% | 3.1% | 2.7% | 2.2% | 2.8% | 0.11 |
| hold (cal. days) | 8 | 44 | 5 | 25 | 85 | 0.67 |
| lookback (sessions) | 216 | 186 | 198 | 154 | 103 | 0.47 |
| material loss | 6.0% | 1.3% | 4.8% | 3.6% | 1.8% | 0.47 |
| re-entry decline | 11.0% | 12.1% | 11.2% | 13.4% | 13.4% | 0.16 |
| reset retrace | 11.4% | 20.1% | 49.2% | 44.6% | 66.0% | 0.55 |

Trade logs: `results/main/AMD/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### META (Individual stocks): insufficient or negative

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 8.6%, stop 5.0%, hold 10, lookback 239, material 5.1%, re-entry 14.6%, reset 18.6% | $147,120 / $27,479 / 38 | $39,337 / $13,576 / 15 | $31,960 / 5 | $25,016 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 8.6%, stop 5.3%, hold 10, lookback 227, material 7.2%, re-entry 12.7%, reset 33.0% | $203,634 / $17,856 / 50 | $22,394 / $20,967 / 17 | $28,373 / 9 | $22,394 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 6.7%, stop 2.9%, hold 9, lookback 231, material 1.8%, re-entry 13.3%, reset 26.3% | $218,214 / $13,394 / 96 | -$9,057 / $25,491 / 17 | -$18,736 / 6 | $12,261 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 11.8%, stop 4.1%, hold 75, lookback 190, material 7.9%, re-entry 11.7%, reset 86.1% | $178,174 / $27,349 / 38 | -$76,183 / $89,712 / 5 | -$58,638 / 16 | -$37,728 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 5.3%, stop 2.0%, hold 8, lookback 76, material 3.2%, re-entry 13.2%, reset 70.9% | $199,579 / $25,882 / 159 | $6,388 / $13,795 / 12 | $55,302 / 4 | $10,435 (10) |

Out-of-sample total -$17,120 from 66 trades (original parameters $38,260 from 40). Parameter stability score 0.43 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 8.6% | 8.6% | 6.7% | 11.8% | 5.3% | 0.17 |
| stop | 5.0% | 5.3% | 2.9% | 4.1% | 2.0% | 0.09 |
| hold (cal. days) | 10 | 10 | 9 | 75 | 8 | 0.56 |
| lookback (sessions) | 239 | 227 | 231 | 190 | 76 | 0.68 |
| material loss | 5.1% | 7.2% | 1.8% | 7.9% | 3.2% | 0.61 |
| re-entry decline | 14.6% | 12.7% | 13.3% | 11.7% | 13.2% | 0.19 |
| reset retrace | 18.6% | 33.0% | 26.3% | 86.1% | 70.9% | 0.68 |

Trade logs: `results/main/META/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### GOOGL (Individual stocks): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 10.0%, stop 2.0%, hold 7, lookback 236, material 7.2%, re-entry 5.6%, reset 77.0% | $111,649 / $11,176 / 70 | $20,831 / $9,201 / 21 | $5,323 / 4 | $14,920 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 10.0%, stop 2.0%, hold 11, lookback 236, material 7.1%, re-entry 14.1%, reset 15.2% | $123,388 / $15,288 / 75 | $38,734 / $21,437 / 18 | $5,110 / 5 | $25,676 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 10.1%, stop 2.0%, hold 35, lookback 222, material 0.2%, re-entry 3.0%, reset 10.2% | $174,547 / $22,418 / 68 | $0 / $0 / 0 | $0 / 0 | $0 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 15.6%, stop 10.4%, hold 51, lookback 185, material 6.4%, re-entry 13.5%, reset 99.7% | $170,635 / $29,915 / 10 | -$16,585 / $38,724 / 5 | -$18,182 / 9 | -$37,403 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 10.5%, stop 2.0%, hold 36, lookback 205, material 9.4%, re-entry 14.9%, reset 93.7% | $133,329 / $23,406 / 71 | $24,638 / $9,180 / 13 | $5,185 / 3 | $27,435 (10) |

Out-of-sample total $67,618 from 57 trades (original parameters -$2,564 from 21). Parameter stability score 0.51 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 10.0% | 10.0% | 10.1% | 15.6% | 10.5% | 0.15 |
| stop | 2.0% | 2.0% | 2.0% | 10.4% | 2.0% | 0.22 |
| hold (cal. days) | 7 | 11 | 35 | 51 | 36 | 0.37 |
| lookback (sessions) | 236 | 236 | 222 | 185 | 205 | 0.21 |
| material loss | 7.2% | 7.1% | 0.2% | 6.4% | 9.4% | 0.92 |
| re-entry decline | 5.6% | 14.1% | 3.0% | 13.5% | 14.9% | 0.79 |
| reset retrace | 77.0% | 15.2% | 10.2% | 99.7% | 93.7% | 0.90 |

Trade logs: `results/main/GOOGL/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

### AMZN (Individual stocks): mixed

| Fold | Training (in-sample) | Rank-1 chosen on training | In-sample net / max DD / trades | OOS year net / max DD / trades | Original OOS net / trades | Shortlist OOS median (N) |
|---|---|---|---|---|---|---|
| fold-2019 | 2014-01-02 – 2018-12-31 | dip 13.1%, stop 9.0%, hold 1, lookback 98, material 6.7%, re-entry 6.6%, reset 34.8% | $201,693 / $19,807 / 59 | $9,601 / $16,059 / 15 | $15,986 / 9 | $11,186 (10) |
| fold-2020 | 2014-01-02 – 2019-12-31 | dip 9.8%, stop 9.8%, hold 2, lookback 96, material 3.2%, re-entry 14.8%, reset 12.9% | $231,270 / $25,591 / 73 | $78,373 / $14,877 / 17 | $28,868 / 7 | $80,230 (10) |
| fold-2021 | 2014-01-02 – 2020-12-31 | dip 11.0%, stop 8.9%, hold 26, lookback 160, material 4.6%, re-entry 11.1%, reset 72.2% | $312,383 / $27,054 / 32 | $288 / $18,261 / 8 | $1,712 / 10 | $288 (10) |
| fold-2022 | 2014-01-02 – 2021-12-31 | dip 13.3%, stop 9.5%, hold 3, lookback 136, material 9.4%, re-entry 13.5%, reset 14.3% | $267,067 / $28,217 / 69 | -$40,034 / $49,235 / 38 | -$43,776 / 16 | -$40,683 (10) |
| fold-2023 | 2014-01-02 – 2022-12-30 | dip 12.8%, stop 8.3%, hold 6, lookback 77, material 0.3%, re-entry 13.5%, reset 64.5% | $232,954 / $22,005 / 39 | $14,652 / $16,010 / 4 | $43,635 / 5 | $12,997 (10) |

Out-of-sample total $62,881 from 82 trades (original parameters $46,425 from 47). Parameter stability score 0.39 (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good):

| Parameter | 2019 | 2020 | 2021 | 2022 | 2023 | Normalized range |
|---|---|---|---|---|---|---|
| dip | 13.1% | 9.8% | 11.0% | 13.3% | 12.8% | 0.09 |
| stop | 9.0% | 9.8% | 8.9% | 9.5% | 8.3% | 0.04 |
| hold (cal. days) | 1 | 2 | 26 | 3 | 6 | 0.21 |
| lookback (sessions) | 98 | 96 | 160 | 136 | 77 | 0.35 |
| material loss | 6.7% | 3.2% | 4.6% | 9.4% | 0.3% | 0.91 |
| re-entry decline | 6.6% | 14.8% | 11.1% | 13.5% | 13.5% | 0.55 |
| reset retrace | 34.8% | 12.9% | 72.2% | 14.3% | 64.5% | 0.59 |

Trade logs: `results/main/AMZN/fold-<year>/validation-rank1-trades.csv` (and `-equity.csv`, `validation-original-trades.csv`).

## Limitations

- **The baseline is not clean either.** The original parameters (10% / 8% / 15 days / 90 sessions / 0.5% / 3% / 38%) were chosen by hand in earlier research on VGT and related ETFs over roughly 2016–2025, so their 2019–2023 results are partly in-sample. That favours the original in this comparison, most for VGT and the funds correlated with it; it does not rescue the re-optimizing policy, which loses to the baseline on most symbols, including ones the baseline was never tuned on.
- **Few independent events.** Each validation year holds a handful of trades for most configurations; one or two trades can decide a year. Year counts of 5 are far too few for statistical confidence.
- **Multiple testing and winner's curse.** 21 symbols × 6 training runs × roughly 17,000–20,000 candidates each were searched. Some symbols will look good out of sample by chance, and the correlated clusters above make "several symbols agree" weaker than it sounds.
- **Execution idealization.** Entries fill at the signal close (same-close look-ahead) and stops fill exactly at the stop price; there are no commissions or spread. Configurations with tight stops and many trades are the most exposed to this; see the cost sensitivity in TOP_CANDIDATES.md.
- **Adjusted prices.** Stooq back-adjusts for distributions, so P&L includes dividends as if they were price; see DATA_AUDIT.md.
- **Financing.** A constant 11% simple rate is assumed throughout, as in the original; real margin rates varied a lot between 2014 and 2023.
- **Survivorship.** The symbols were picked in 2026 with hindsight (notably the single stocks).

