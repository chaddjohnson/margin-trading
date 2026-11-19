# Standalone neighbourhoods: input associations and the centres' trades (descriptive)

Spearman's ρ between an input's offset u and the draw's net or DD over the 384 confirmation draws of the common instrument (u from the frozen seeds), the share of draws above $35,000 DD by u tercile (top 8 inputs by |ρ|), and each centre's funded development ledger. Associations in one multivariate sample on 2016–2024, not causal effects or probabilities.

## SG — GDX Growth (Appendix A) alone
Draws 384; funded lots per draw: median 17, range 3–38 (centre 13).
| Input | Centre | ρ(u, net) | ρ(u, DD) | Breach share u < −⅓ | \|u\| ≤ ⅓ | u > ⅓ |
|---|---:|---:|---:|---:|---:|---:|
| recentLowLookbackBars | 22 | -0.047 | -0.644 | 86% | 46% | 23% |
| advanceFromRecentLowPercent | 3 | -0.195 | 0.230 | 42% | 52% | 63% |
| trailingStopPercent | 7 | -0.127 | 0.180 | 43% | 54% | 59% |
| recoveryConfirmationSessions | 2 | 0.111 | -0.171 | 56% | 55% | 45% |
| recoveryRetracementPercent | 49 | 0.085 | -0.126 | 57% | 53% | 47% |
| pullbackMinimumPercent | 1.5 | 0.002 | 0.096 | 44% | 56% | 56% |
| eligibilityMaxAgeSessions | 20 | -0.024 | 0.093 | 50% | 46% | 60% |
| continuationWindowSessions | 60 | -0.027 | 0.079 | 52% | 48% | 56% |

The development centre's funded ledger ($53,816.50):

| Entry | Source | Entry price | Exit | Reason | Net |
|---|---|---:|---|---|---:|
| 2016-04-08 | release | 21.4 | 2016-05-04 | trailing stop gap | $12,187.52 |
| 2016-06-07 | release | 25.13 | 2016-07-20 | trailing stop | $12,314.68 |
| 2019-06-24 | release | 25.34 | 2019-07-31 | trailing stop | $3,047.88 |
| 2019-08-21 | shallow_pullback | 28.6 | 2019-09-06 | trailing stop | $91.31 |
| 2019-09-17 | shallow_pullback | 27.48 | 2020-02-27 | trailing stop | $2,735.43 |
| 2020-03-04 | latched | 29.03 | 2020-03-10 | initial stop | −$6,910.38 |
| 2020-04-13 | latched | 28.65 | 2020-04-15 | trailing stop gap | $3,361.56 |
| 2020-04-23 | shallow_pullback | 33.21 | 2020-05-21 | trailing stop | $4,037.06 |
| 2020-06-24 | release | 35.01 | 2020-07-30 | trailing stop | $16,899.85 |
| 2023-04-06 | release | 34 | 2023-05-18 | initial stop | −$7,394.32 |
| 2024-06-21 | release | 33.84 | 2024-07-25 | trailing stop gap | $6,004.78 |
| 2024-08-09 | crossing | 35.84 | 2024-09-03 | trailing stop | $2,859.71 |
| 2024-09-11 | shallow_pullback | 36.99 | 2024-10-07 | trailing stop | $4,581.42 |

## S4 — VGT Growth #4 alone
Draws 384; funded lots per draw: median 11, range 3–30 (centre 11).
| Input | Centre | ρ(u, net) | ρ(u, DD) | Breach share u < −⅓ | \|u\| ≤ ⅓ | u > ⅓ |
|---|---:|---:|---:|---:|---:|---:|
| recentLowLookbackBars | 90 | -0.626 | -0.569 | 0% | 0% | 0% |
| trailingStopPercent | 6 | 0.403 | 0.197 | 0% | 0% | 0% |
| advanceFromRecentLowPercent | 5 | 0.248 | 0.156 | 0% | 0% | 0% |
| recoveryRetracementPercent | 45 | -0.030 | -0.155 | 0% | 0% | 0% |
| pullbackMinimumPercent | 1.5 | 0.091 | 0.130 | 0% | 0% | 0% |
| initialStopAtrMultiple | 1.5 | -0.037 | 0.128 | 0% | 0% | 0% |
| trendChangeLookbackSessions | 30 | -0.106 | 0.115 | 0% | 0% | 0% |
| uptrendSlopeBars | 10 | 0.110 | 0.096 | 0% | 0% | 0% |

The development centre's funded ledger ($92,575.71):

| Entry | Source | Entry price | Exit | Reason | Net |
|---|---|---:|---|---|---:|
| 2016-06-29 | crossing | 104.85 | 2018-02-05 | trailing stop | $42,826.37 |
| 2019-02-01 | release | 181.5402 | 2019-05-09 | trailing stop | $8,688.95 |
| 2019-05-15 | shallow_pullback | 200.48 | 2019-05-29 | initial stop | −$3,000.27 |
| 2020-04-21 | latched | 228.4849 | 2020-05-14 | trailing stop | $4,073.47 |
| 2020-06-01 | shallow_pullback | 259.98 | 2020-06-11 | trailing stop | $395.69 |
| 2020-06-26 | shallow_pullback | 275.5 | 2020-09-03 | trailing stop | $14,064.09 |
| 2021-05-14 | crossing | 360.03 | 2021-09-29 | trailing stop | $8,070.34 |
| 2022-03-29 | release | 429.56 | 2022-04-01 | initial stop | −$4,227.67 |
| 2023-09-29 | crossing | 418.1 | 2023-10-20 | maximum hold | −$1,155.75 |
| 2023-11-03 | crossing | 421.85 | 2024-04-15 | trailing stop | $14,514.22 |
| 2024-05-07 | release | 517.55 | 2024-07-19 | trailing stop | $8,326.27 |

## S85 — VGT Growth 08500a60 alone
Draws 384; funded lots per draw: median 7, range 4–13 (centre 7).
| Input | Centre | ρ(u, net) | ρ(u, DD) | Breach share u < −⅓ | \|u\| ≤ ⅓ | u > ⅓ |
|---|---:|---:|---:|---:|---:|---:|
| recentLowLookbackBars | 80 | -0.595 | -0.767 | 2% | 0% | 0% |
| retentionSellPercent | 50 | -0.148 | -0.256 | 2% | 0% | 0% |
| recoveryConfirmationSessions | 4 | -0.078 | 0.165 | 0% | 0% | 2% |
| eligibilityMaxAgeSessions | 24 | 0.139 | 0.040 | 2% | 0% | 1% |
| trailingStopPercent | 9 | -0.107 | 0.065 | 2% | 0% | 1% |
| recoveryRetracementPercent | 30 | -0.103 | 0.051 | 0% | 0% | 2% |
| advanceFromRecentLowPercent | 1 | -0.078 | 0.097 | 2% | 0% | 1% |
| crossMinimumSlopePercent | 0.4 | -0.093 | -0.011 | 2% | 0% | 1% |

The development centre's funded ledger ($115,509.15):

| Entry | Source | Entry price | Exit | Reason | Net |
|---|---|---:|---|---|---:|
| 2016-07-06 | release | 105.94 | 2018-10-12 | trend exit | $44,456.96 |
| 2019-01-18 | release | 174.86 | 2020-03-10 | trend exit | $12,298.59 |
| 2020-04-13 | release | 224 | 2022-01-20 | trend exit | $50,974.41 |
| 2022-03-24 | release | 407.0289 | 2022-04-11 | initial stop gap | −$4,213.26 |
| 2023-09-26 | crossing | 414.06 | 2023-09-27 | initial stop | −$1,833.45 |
| 2023-09-28 | crossing | 408.27 | 2023-10-26 | initial stop | −$2,698.22 |
| 2023-11-01 | latched | 408.43 | 2024-08-06 | trend exit | $16,524.12 |
