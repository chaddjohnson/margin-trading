# Intraday D1 (VGT) — generated tables

Generated from the sealed records by `npm run intraday-d1 -- report`. Report-only; nothing here selects.

## Search funnel (development door, Study 8 V-track budget)

| stage | value |
|---|---|
| Sobol screen centres | 8192 |
| plausible (DD < $35k, net > 0, lots ≥ ⌈C3/2⌉) | 594 |
| promoted to rung 1 | 594 |
| rung-1 archive (configurations) | 7890 |
| rung-1 feasible | 0 |
| rung 2 evaluated / feasible | 192 / 0 |
| rung 3 evaluated / feasible | 54 / 0 |
| islands run | 4 |
| point evaluations | 182054 |
| minutes | 0.81 |
| T1 / T2 / T3 | 4 islands / not fired / not fired |

## Shortlist and qualification (development door; confirm 3 × 128)

| # | pick | id | parameters | centre net | nb share | nb median/yr | nb p10/yr | p90 DD | qualified | failed gates |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | infeasible on training | id-5.1v.e.1f.1y.t.1y.6.1f | B130 X4.9601% Y0.0452% S0.9763% H3948.73m L158.63m U0.7% P0.0709% W1291.3m | 71,246 | 99.7% | 6,444 | 3,595 | 27,031 | no | E1, infeasible on training |
| 2 | infeasible on training | id-5.1v.a.1f.1y.s.1q.6.1r | B130 X4.9601% Y0.0358% S0.9763% H3948.73m L144.21m U0.62% P0.0709% W4052.65m | 70,902 | 100.0% | 6,296 | 3,275 | 27,173 | no | E1, infeasible on training |
| 3 | infeasible on training | id-5.1v.e.1f.1y.r.2o.5.1f | B130 X4.9601% Y0.0452% S0.9763% H3948.73m L131.1m U0.96% P0.0669% W1291.3m | 71,208 | 100.0% | 6,351 | 3,117 | 26,574 | no | E1, infeasible on training |
| 4 | infeasible on training | id-5.1v.d.1f.1y.l.1f.4.1h | B130 X4.9601% Y0.0427% S0.9763% H3948.73m L74m U0.51% P0.0631% W1562.47m | 71,243 | 100.0% | 6,272 | 740 | 23,289 | no | E1, infeasible on training |

B1 (daily D1 primary, session clock, same economics) on the development door: centre net 135,359, confirmation share 100.0%, median/yr 8,364, robust/yr 6,758.

PBO (report-only, CSCV over the 64 best rung-2 configurations × 14 half-years): 0.57; selection → confirmation Spearman 0.80.

## Frozen ranking

No role holder: no shortlist member qualified on the development door.

## Validation (once, 2025-01-02 → 2026-10-30)

Recommendation (pre-registered mapping): **no robust edge (no development-qualified role holder)**.

| candidate | status | failed | DEV net | VAL net | 2025 | 2026 (partial) | whole-run min DD | test share | test median VAL | break-even bps DEV / VAL |
|---|---|---|---|---|---|---|---|---|---|---|
| shortlist infeasible on training (diagnostic, not a holder) id-5.1v.e.1f.1y.t.1y.6.1f | diagnostic (fail) | T3, T5 | 71,246 | 6,184 | 7,415 | -1,231 | 17,280 | 98.2% | 5,765 | 81.87 / 81.51 |
| shortlist infeasible on training (diagnostic, not a holder) id-5.1v.a.1f.1y.s.1q.6.1r | diagnostic (fail) | T3, T5 | 70,902 | 6,084 | 7,255 | -1,171 | 17,280 | 99.2% | 5,666 | 82.12 / 80.64 |
| shortlist infeasible on training (diagnostic, not a holder) id-5.1v.e.1f.1y.r.2o.5.1f | diagnostic (fail) | T3, T5 | 71,208 | 6,184 | 7,415 | -1,231 | 17,280 | 99.5% | 5,765 | 81.83 / 81.51 |
| shortlist infeasible on training (diagnostic, not a holder) id-5.1v.d.1f.1y.l.1f.4.1h | diagnostic (fail) | T3, T5 | 71,243 | 6,197 | 7,415 | -1,218 | 17,280 | 100.0% | 5,595 | 81.93 / 81.51 |

B1 (daily D1 primary) on the same run: DEV 135,359, VAL 40,901, 2025 47,463, 2026 -6,561.

### shortlist infeasible on training (diagnostic, not a holder) id-5.1v.e.1f.1y.t.1y.6.1f: B130 X4.9601% Y0.0452% S0.9763% H3948.73m L158.63m U0.7% P0.0709% W1291.3m

| year | window | trades | win % | avg win | avg loss | median | expectancy | gross pre-cost | costs | financing | net (by entry) | attributed | min DD in yr | daily DD in yr | PF | exposure % | worst | max loss streak |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2016 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2017 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2018 | development | 9 | 88.89 | 983 | -6,189 | 367 | 186 | 4,202 | 902 | 1,627 | 1,672 | 1,672 | 13,788 | 13,003 | 1.27 | 80.26 | -6,189 | 1 |
| 2019 | development | 12 | 91.67 | 1,222 | -123 | 1,149 | 1,110 | 16,762 | 1,208 | 2,230 | 13,324 | 13,324 | 4,834 | 2,800 | 109.10 | 108.47 | -123 | 1 |
| 2020 | development | 35 | 74.29 | 1,937 | -2,320 | 1,169 | 842 | 37,790 | 3,517 | 4,792 | 29,481 | 29,465 | 17,280 | 15,881 | 2.41 | 231.85 | -11,889 | 3 |
| 2021 | development | 4 | 75.00 | 1,119 | -192 | 1,032 | 791 | 4,171 | 402 | 603 | 3,166 | 3,181 | 8,838 | 7,679 | 17.53 | 29.42 | -192 | 1 |
| 2022 | development | 18 | 72.22 | 1,812 | -2,541 | 428 | 603 | 15,577 | 1,807 | 2,923 | 10,847 | 10,846 | 9,472 | 8,763 | 1.85 | 143.48 | -6,482 | 2 |
| 2023 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2024 | development | 5 | 80.00 | 3,365 | -702 | 1,592 | 2,551 | 13,685 | 507 | 422 | 12,756 | 12,756 | 3,772 | 2,521 | 19.16 | 21.26 | -702 | 1 |
| 2025 | validation | 8 | 62.50 | 2,113 | -1,049 | 1,289 | 927 | 9,214 | 804 | 995 | 7,415 | 7,415 | 15,466 | 11,184 | 3.36 | 49.19 | -1,860 | 2 |
| 2026 (partial, to 2026-10-30) | validation | 5 | 80.00 | 1,288 | -6,382 | 1,181 | -246 | 143 | 500 | 874 | -1,231 | -1,231 | 8,311 | 6,432 | 0.81 | 50.19 | -6,382 | 1 |

| window | trades | win % | expectancy | net (by entry) | attributed | PF | median hold (min) | overnight trades | stop-level fills |
|---|---|---|---|---|---|---|---|---|---|
| development 2016–2024 (by entry) | 83 | 78.31 | 858 | 71,246 | 71,246 | 2.75 | 4185.00 | 66 | 37 |
| validation 2025-01-02 → 2026-10-30 (by entry) | 13 | 69.23 | 476 | 6,184 | 6,184 | 1.65 | 4395.00 | 12 | 6 |
| 2025 | 8 | 62.50 | 927 | 7,415 | 7,415 | 3.36 | 3688.00 | 7 | 4 |
| 2026 (partial, to 2026-10-30) | 5 | 80.00 | -246 | -1,231 | -1,231 | 0.81 | 5501.00 | 5 | 2 |

| execution setting | DEV net | VAL net | whole-run min DD |
|---|---|---|---|
| cost0 | 82,619 | 7,493 | 16,994 |
| cost2 | 74,203 | 6,969 | 17,109 |
| cost10 | 57,386 | 4,877 | 16,581 |
| cost20 | 50,502 | 2,266 | 21,110 |
| rate8 | 74,753 | 6,694 | 17,157 |
| rate14 | 74,299 | 5,674 | 17,403 |
| nextOpen | 53,892 | 6,472 | 17,392 |
| slip10 | 55,454 | 4,970 | 17,479 |
| slip25 | 46,069 | 3,149 | 17,778 |
| cost1 | 76,001 | 7,231 | 17,051 |
| cost3 | 74,600 | 6,707 | 17,166 |
| minuteLow | 53,047 | 5,782 | 17,416 |

Pro-rata (exposure-time) interest instead of calendar nights: DEV net 71,245, VAL net 6,198.

Development P&L by regime of the entry month (VGT monthly return sign; realized-volatility terciles of 2016–2024 months):

| regime | trades | net | expectancy |
|---|---|---|---|
| bear month | 35 | -8,464 | -242 |
| bull month | 48 | 79,710 | 1,661 |
| high vol | 67 | 44,906 | 670 |
| low vol | 9 | 10,445 | 1,161 |
| mid vol | 7 | 15,895 | 2,271 |

Frequency (development): {"sessionsWithEntry":77,"sessionsInWindow":2245,"shareOfSessionsWithEntry":3.43,"entriesPerActiveSession":{"units":77,"median":1,"p90":1,"max":2},"entriesPerActiveWeek":{"units":50,"median":1,"p90":3,"max":6},"entriesPerActiveMonth":{"units":23,"median":3,"p90":5.800000000000001,"max":11},"entryHourET":{"10":6,"11":21,"12":4,"13":15,"14":8,"15":5,"09":24},"exitHourET":{"10":6,"11":25,"12":4,"13":12,"14":8,"15":7,"09":21}}

Frequency (validation): {"sessionsWithEntry":13,"sessionsInWindow":459,"shareOfSessionsWithEntry":2.83,"entriesPerActiveSession":{"units":13,"median":1,"p90":1,"max":1},"entriesPerActiveWeek":{"units":8,"median":1,"p90":3,"max":3},"entriesPerActiveMonth":{"units":3,"median":5,"p90":5,"max":5},"entryHourET":{"10":1,"11":6,"12":1,"13":2,"14":1,"09":2},"exitHourET":{"11":3,"13":3,"09":7}}

Concentration (development): {"net":71245.65,"top1TradeShare":0.1,"top5TradesShare":0.39,"top10TradesShare":0.62,"top5DaysShare":0.36,"worst5Trades":[-3474.83,-4874.17,-6188.94,-6482.15,-11889.15],"worst5Days":[-3474.83,-4874.17,-6188.94,-6482.15,-10899.45]}

Concentration (validation): {"net":6183.92,"top1TradeShare":0.51,"top5TradesShare":1.91,"top10TradesShare":2.52,"top5DaysShare":1.91,"worst5Trades":[490.14,-157.82,-1130.18,-1859.72,-6382.47],"worst5Days":[490.14,-157.82,-1130.18,-1859.72,-6382.47]}

### shortlist infeasible on training (diagnostic, not a holder) id-5.1v.a.1f.1y.s.1q.6.1r: B130 X4.9601% Y0.0358% S0.9763% H3948.73m L144.21m U0.62% P0.0709% W4052.65m

| year | window | trades | win % | avg win | avg loss | median | expectancy | gross pre-cost | costs | financing | net (by entry) | attributed | min DD in yr | daily DD in yr | PF | exposure % | worst | max loss streak |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2016 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2017 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2018 | development | 9 | 88.89 | 983 | -6,189 | 367 | 186 | 4,202 | 902 | 1,627 | 1,672 | 1,672 | 13,788 | 13,003 | 1.27 | 80.26 | -6,189 | 1 |
| 2019 | development | 12 | 91.67 | 1,217 | -70 | 1,146 | 1,110 | 16,754 | 1,208 | 2,230 | 13,316 | 13,316 | 4,834 | 2,800 | 189.96 | 108.48 | -70 | 1 |
| 2020 | development | 35 | 74.29 | 1,938 | -2,320 | 1,169 | 843 | 37,822 | 3,517 | 4,792 | 29,513 | 29,498 | 17,280 | 15,881 | 2.41 | 231.86 | -11,889 | 3 |
| 2021 | development | 4 | 75.00 | 1,111 | -192 | 1,019 | 785 | 4,145 | 402 | 603 | 3,141 | 3,156 | 8,838 | 7,678 | 17.40 | 29.43 | -192 | 1 |
| 2022 | development | 18 | 72.22 | 1,812 | -2,518 | 428 | 609 | 15,692 | 1,807 | 2,923 | 10,961 | 10,961 | 9,472 | 8,763 | 1.87 | 143.49 | -6,482 | 2 |
| 2023 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2024 | development | 5 | 80.00 | 3,250 | -702 | 1,134 | 2,460 | 13,226 | 506 | 422 | 12,298 | 12,298 | 4,210 | 2,960 | 18.51 | 21.27 | -702 | 1 |
| 2025 | validation | 8 | 62.50 | 2,081 | -1,049 | 1,289 | 907 | 9,054 | 804 | 995 | 7,255 | 7,255 | 15,466 | 11,184 | 3.30 | 49.19 | -1,860 | 2 |
| 2026 (partial, to 2026-10-30) | validation | 5 | 80.00 | 1,291 | -6,336 | 1,181 | -234 | 203 | 500 | 874 | -1,171 | -1,171 | 8,264 | 6,435 | 0.82 | 50.19 | -6,336 | 1 |

| window | trades | win % | expectancy | net (by entry) | attributed | PF | median hold (min) | overnight trades | stop-level fills |
|---|---|---|---|---|---|---|---|---|---|
| development 2016–2024 (by entry) | 83 | 78.31 | 854 | 70,902 | 70,902 | 2.75 | 4185.00 | 66 | 37 |
| validation 2025-01-02 → 2026-10-30 (by entry) | 13 | 69.23 | 468 | 6,084 | 6,084 | 1.64 | 4395.00 | 12 | 6 |
| 2025 | 8 | 62.50 | 907 | 7,255 | 7,255 | 3.30 | 3688.00 | 7 | 4 |
| 2026 (partial, to 2026-10-30) | 5 | 80.00 | -234 | -1,171 | -1,171 | 0.82 | 5502.00 | 5 | 2 |

| execution setting | DEV net | VAL net | whole-run min DD |
|---|---|---|---|
| cost0 | 84,538 | 7,393 | 20,547 |
| cost2 | 76,759 | 6,869 | 17,109 |
| cost10 | 57,340 | 4,777 | 16,581 |
| cost20 | 50,468 | 2,166 | 21,110 |
| rate8 | 74,409 | 6,594 | 17,157 |
| rate14 | 72,997 | 5,575 | 17,403 |
| nextOpen | 68,679 | 6,373 | 17,392 |
| slip10 | 55,185 | 4,871 | 17,479 |
| slip25 | 45,801 | 3,050 | 17,778 |
| cost1 | 77,852 | 7,131 | 20,643 |
| cost3 | 77,022 | 6,608 | 17,166 |
| minuteLow | 56,689 | 5,683 | 17,416 |

Pro-rata (exposure-time) interest instead of calendar nights: DEV net 70,901, VAL net 6,098.

Development P&L by regime of the entry month (VGT monthly return sign; realized-volatility terciles of 2016–2024 months):

| regime | trades | net | expectancy |
|---|---|---|---|
| bear month | 35 | -8,425 | -241 |
| bull month | 48 | 79,326 | 1,653 |
| high vol | 67 | 44,573 | 665 |
| low vol | 9 | 10,381 | 1,153 |
| mid vol | 7 | 15,948 | 2,278 |

Frequency (development): {"sessionsWithEntry":77,"sessionsInWindow":2245,"shareOfSessionsWithEntry":3.43,"entriesPerActiveSession":{"units":77,"median":1,"p90":1,"max":2},"entriesPerActiveWeek":{"units":50,"median":1,"p90":3,"max":6},"entriesPerActiveMonth":{"units":23,"median":3,"p90":5.800000000000001,"max":11},"entryHourET":{"10":6,"11":21,"12":4,"13":16,"14":7,"15":5,"09":24},"exitHourET":{"10":6,"11":25,"12":4,"13":12,"14":8,"15":7,"09":21}}

Frequency (validation): {"sessionsWithEntry":13,"sessionsInWindow":459,"shareOfSessionsWithEntry":2.83,"entriesPerActiveSession":{"units":13,"median":1,"p90":1,"max":1},"entriesPerActiveWeek":{"units":8,"median":1,"p90":3,"max":3},"entriesPerActiveMonth":{"units":3,"median":5,"p90":5,"max":5},"entryHourET":{"10":1,"11":6,"12":1,"13":2,"14":1,"09":2},"exitHourET":{"11":3,"13":3,"09":7}}

Concentration (development): {"net":70901.6,"top1TradeShare":0.1,"top5TradesShare":0.39,"top10TradesShare":0.62,"top5DaysShare":0.36,"worst5Trades":[-3474.83,-4759.39,-6188.94,-6482.15,-11889.15],"worst5Days":[-3474.83,-4759.39,-6188.94,-6482.15,-10899.45]}

Concentration (validation): {"net":6084.36,"top1TradeShare":0.52,"top5TradesShare":1.92,"top10TradesShare":2.53,"top5DaysShare":1.92,"worst5Trades":[490.14,-157.82,-1130.18,-1859.72,-6335.55],"worst5Days":[490.14,-157.82,-1130.18,-1859.72,-6335.55]}

### shortlist infeasible on training (diagnostic, not a holder) id-5.1v.e.1f.1y.r.2o.5.1f: B130 X4.9601% Y0.0452% S0.9763% H3948.73m L131.1m U0.96% P0.0669% W1291.3m

| year | window | trades | win % | avg win | avg loss | median | expectancy | gross pre-cost | costs | financing | net (by entry) | attributed | min DD in yr | daily DD in yr | PF | exposure % | worst | max loss streak |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2016 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2017 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2018 | development | 9 | 88.89 | 983 | -6,189 | 367 | 186 | 4,202 | 902 | 1,627 | 1,672 | 1,672 | 13,788 | 13,003 | 1.27 | 80.26 | -6,189 | 1 |
| 2019 | development | 12 | 91.67 | 1,222 | -123 | 1,149 | 1,110 | 16,762 | 1,208 | 2,230 | 13,324 | 13,324 | 4,834 | 2,800 | 109.10 | 108.47 | -123 | 1 |
| 2020 | development | 35 | 74.29 | 1,936 | -2,320 | 1,169 | 841 | 37,752 | 3,517 | 4,792 | 29,443 | 29,428 | 17,280 | 15,881 | 2.41 | 231.86 | -11,889 | 3 |
| 2021 | development | 4 | 75.00 | 1,119 | -192 | 1,032 | 791 | 4,171 | 402 | 603 | 3,166 | 3,181 | 8,838 | 7,679 | 17.53 | 29.42 | -192 | 1 |
| 2022 | development | 18 | 72.22 | 1,812 | -2,541 | 428 | 603 | 15,577 | 1,807 | 2,923 | 10,847 | 10,846 | 9,472 | 8,763 | 1.85 | 143.48 | -6,482 | 2 |
| 2023 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2024 | development | 5 | 80.00 | 3,365 | -702 | 1,592 | 2,551 | 13,685 | 507 | 422 | 12,756 | 12,756 | 3,772 | 2,521 | 19.16 | 21.26 | -702 | 1 |
| 2025 | validation | 8 | 62.50 | 2,113 | -1,049 | 1,289 | 927 | 9,214 | 804 | 995 | 7,415 | 7,415 | 15,466 | 11,184 | 3.36 | 49.19 | -1,860 | 2 |
| 2026 (partial, to 2026-10-30) | validation | 5 | 80.00 | 1,288 | -6,382 | 1,181 | -246 | 143 | 500 | 874 | -1,231 | -1,231 | 8,311 | 6,432 | 0.81 | 50.19 | -6,382 | 1 |

| window | trades | win % | expectancy | net (by entry) | attributed | PF | median hold (min) | overnight trades | stop-level fills |
|---|---|---|---|---|---|---|---|---|---|
| development 2016–2024 (by entry) | 83 | 78.31 | 858 | 71,208 | 71,208 | 2.75 | 4185.00 | 66 | 37 |
| validation 2025-01-02 → 2026-10-30 (by entry) | 13 | 69.23 | 476 | 6,184 | 6,184 | 1.65 | 4395.00 | 12 | 6 |
| 2025 | 8 | 62.50 | 927 | 7,415 | 7,415 | 3.36 | 3688.00 | 7 | 4 |
| 2026 (partial, to 2026-10-30) | 5 | 80.00 | -246 | -1,231 | -1,231 | 0.81 | 5501.00 | 5 | 2 |

| execution setting | DEV net | VAL net | whole-run min DD |
|---|---|---|---|
| cost0 | 82,581 | 7,493 | 16,994 |
| cost2 | 74,165 | 6,969 | 17,109 |
| cost10 | 57,349 | 4,877 | 16,581 |
| cost20 | 50,465 | 2,266 | 21,110 |
| rate8 | 74,716 | 6,694 | 17,157 |
| rate14 | 74,261 | 5,674 | 17,403 |
| nextOpen | 53,855 | 6,472 | 17,392 |
| slip10 | 55,416 | 4,970 | 17,479 |
| slip25 | 46,032 | 3,149 | 17,778 |
| cost1 | 75,963 | 7,231 | 17,051 |
| cost3 | 74,562 | 6,707 | 17,166 |
| minuteLow | 53,009 | 5,782 | 17,416 |

Pro-rata (exposure-time) interest instead of calendar nights: DEV net 71,208, VAL net 6,198.

Development P&L by regime of the entry month (VGT monthly return sign; realized-volatility terciles of 2016–2024 months):

| regime | trades | net | expectancy |
|---|---|---|---|
| bear month | 35 | -8,464 | -242 |
| bull month | 48 | 79,672 | 1,660 |
| high vol | 67 | 44,906 | 670 |
| low vol | 9 | 10,445 | 1,161 |
| mid vol | 7 | 15,857 | 2,265 |

Frequency (development): {"sessionsWithEntry":77,"sessionsInWindow":2245,"shareOfSessionsWithEntry":3.43,"entriesPerActiveSession":{"units":77,"median":1,"p90":1,"max":2},"entriesPerActiveWeek":{"units":50,"median":1,"p90":3,"max":6},"entriesPerActiveMonth":{"units":23,"median":3,"p90":5.800000000000001,"max":11},"entryHourET":{"10":6,"11":21,"12":4,"13":15,"14":8,"15":5,"09":24},"exitHourET":{"10":6,"11":25,"12":4,"13":12,"14":8,"15":7,"09":21}}

Frequency (validation): {"sessionsWithEntry":13,"sessionsInWindow":459,"shareOfSessionsWithEntry":2.83,"entriesPerActiveSession":{"units":13,"median":1,"p90":1,"max":1},"entriesPerActiveWeek":{"units":8,"median":1,"p90":3,"max":3},"entriesPerActiveMonth":{"units":3,"median":5,"p90":5,"max":5},"entryHourET":{"10":1,"11":6,"12":1,"13":2,"14":1,"09":2},"exitHourET":{"11":3,"13":3,"09":7}}

Concentration (development): {"net":71208.1,"top1TradeShare":0.1,"top5TradesShare":0.39,"top10TradesShare":0.62,"top5DaysShare":0.36,"worst5Trades":[-3474.83,-4874.17,-6188.94,-6482.15,-11889.15],"worst5Days":[-3474.83,-4874.17,-6188.94,-6482.15,-10899.45]}

Concentration (validation): {"net":6183.92,"top1TradeShare":0.51,"top5TradesShare":1.91,"top10TradesShare":2.52,"top5DaysShare":1.91,"worst5Trades":[490.14,-157.82,-1130.18,-1859.72,-6382.47],"worst5Days":[490.14,-157.82,-1130.18,-1859.72,-6382.47]}

### shortlist infeasible on training (diagnostic, not a holder) id-5.1v.d.1f.1y.l.1f.4.1h: B130 X4.9601% Y0.0427% S0.9763% H3948.73m L74m U0.51% P0.0631% W1562.47m

| year | window | trades | win % | avg win | avg loss | median | expectancy | gross pre-cost | costs | financing | net (by entry) | attributed | min DD in yr | daily DD in yr | PF | exposure % | worst | max loss streak |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2016 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2017 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2018 | development | 9 | 88.89 | 983 | -6,189 | 367 | 186 | 4,202 | 902 | 1,627 | 1,672 | 1,672 | 13,788 | 13,003 | 1.27 | 80.26 | -6,189 | 1 |
| 2019 | development | 12 | 91.67 | 1,217 | -123 | 1,149 | 1,106 | 16,707 | 1,208 | 2,230 | 13,269 | 13,269 | 4,834 | 2,800 | 108.66 | 108.47 | -123 | 1 |
| 2020 | development | 35 | 74.29 | 1,936 | -2,320 | 1,169 | 841 | 37,752 | 3,517 | 4,792 | 29,443 | 29,428 | 17,280 | 15,881 | 2.41 | 231.86 | -11,889 | 3 |
| 2021 | development | 4 | 75.00 | 1,111 | -192 | 1,019 | 785 | 4,145 | 402 | 603 | 3,141 | 3,156 | 8,838 | 7,678 | 17.40 | 29.43 | -192 | 1 |
| 2022 | development | 18 | 72.22 | 1,812 | -2,518 | 428 | 609 | 15,692 | 1,807 | 2,923 | 10,961 | 10,961 | 9,472 | 8,763 | 1.87 | 143.49 | -6,482 | 2 |
| 2023 | development | 0 | NaN | NaN | NaN | NaN | NaN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NaN | 0.00 | NaN | 0 |
| 2024 | development | 5 | 80.00 | 3,365 | -702 | 1,592 | 2,551 | 13,685 | 507 | 422 | 12,756 | 12,756 | 3,772 | 2,521 | 19.16 | 21.26 | -702 | 1 |
| 2025 | validation | 8 | 62.50 | 2,113 | -1,049 | 1,289 | 927 | 9,214 | 804 | 995 | 7,415 | 7,415 | 15,466 | 11,184 | 3.36 | 49.19 | -1,860 | 2 |
| 2026 (partial, to 2026-10-30) | validation | 5 | 80.00 | 1,291 | -6,382 | 1,181 | -244 | 156 | 500 | 874 | -1,218 | -1,218 | 8,311 | 6,432 | 0.81 | 50.19 | -6,382 | 1 |

| window | trades | win % | expectancy | net (by entry) | attributed | PF | median hold (min) | overnight trades | stop-level fills |
|---|---|---|---|---|---|---|---|---|---|
| development 2016–2024 (by entry) | 83 | 78.31 | 858 | 71,243 | 71,243 | 2.75 | 4185.00 | 66 | 37 |
| validation 2025-01-02 → 2026-10-30 (by entry) | 13 | 69.23 | 477 | 6,197 | 6,197 | 1.65 | 4395.00 | 12 | 6 |
| 2025 | 8 | 62.50 | 927 | 7,415 | 7,415 | 3.36 | 3688.00 | 7 | 4 |
| 2026 (partial, to 2026-10-30) | 5 | 80.00 | -244 | -1,218 | -1,218 | 0.81 | 5502.00 | 5 | 2 |

| execution setting | DEV net | VAL net | whole-run min DD |
|---|---|---|---|
| cost0 | 85,517 | 7,506 | 16,994 |
| cost2 | 77,101 | 6,982 | 17,109 |
| cost10 | 57,516 | 4,890 | 16,581 |
| cost20 | 50,586 | 2,279 | 21,110 |
| rate8 | 74,750 | 6,707 | 17,157 |
| rate14 | 74,429 | 5,687 | 17,403 |
| nextOpen | 53,626 | 6,485 | 17,392 |
| slip10 | 55,451 | 4,983 | 17,479 |
| slip25 | 46,067 | 3,162 | 17,778 |
| cost1 | 78,899 | 7,244 | 17,051 |
| cost3 | 77,364 | 6,720 | 17,166 |
| minuteLow | 53,044 | 5,795 | 17,416 |

Pro-rata (exposure-time) interest instead of calendar nights: DEV net 71,242, VAL net 6,211.

Development P&L by regime of the entry month (VGT monthly return sign; realized-volatility terciles of 2016–2024 months):

| regime | trades | net | expectancy |
|---|---|---|---|
| bear month | 35 | -8,350 | -239 |
| bull month | 48 | 79,592 | 1,658 |
| high vol | 67 | 44,995 | 672 |
| low vol | 9 | 10,390 | 1,154 |
| mid vol | 7 | 15,857 | 2,265 |

Frequency (development): {"sessionsWithEntry":77,"sessionsInWindow":2245,"shareOfSessionsWithEntry":3.43,"entriesPerActiveSession":{"units":77,"median":1,"p90":1,"max":2},"entriesPerActiveWeek":{"units":50,"median":1,"p90":3,"max":6},"entriesPerActiveMonth":{"units":23,"median":3,"p90":5.800000000000001,"max":11},"entryHourET":{"10":6,"11":21,"12":4,"13":15,"14":8,"15":5,"09":24},"exitHourET":{"10":6,"11":25,"12":4,"13":12,"14":8,"15":7,"09":21}}

Frequency (validation): {"sessionsWithEntry":13,"sessionsInWindow":459,"shareOfSessionsWithEntry":2.83,"entriesPerActiveSession":{"units":13,"median":1,"p90":1,"max":1},"entriesPerActiveWeek":{"units":8,"median":1,"p90":3,"max":3},"entriesPerActiveMonth":{"units":3,"median":5,"p90":5,"max":5},"entryHourET":{"10":1,"11":6,"12":1,"13":2,"14":1,"09":2},"exitHourET":{"11":3,"13":3,"09":7}}

Concentration (development): {"net":71242.74,"top1TradeShare":0.1,"top5TradesShare":0.39,"top10TradesShare":0.62,"top5DaysShare":0.36,"worst5Trades":[-3474.83,-4759.39,-6188.94,-6482.15,-11889.15],"worst5Days":[-3474.83,-4759.39,-6188.94,-6482.15,-10899.45]}

Concentration (validation): {"net":6197.02,"top1TradeShare":0.51,"top5TradesShare":1.91,"top10TradesShare":2.51,"top5DaysShare":1.91,"worst5Trades":[490.14,-157.82,-1130.18,-1859.72,-6382.47],"worst5Days":[490.14,-157.82,-1130.18,-1859.72,-6382.47]}

