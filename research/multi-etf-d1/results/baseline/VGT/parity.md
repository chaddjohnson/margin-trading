# VGT regression control (generated 2026-10-23T12:59:49.026Z)

File: `src/app/allIn-trailingBuy-postExitContinuation.ts` on `data/VGT/VGT-2016-2025-1-minute.csv` (sha256 `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f`), 2459 sessions 2016-01-04 → 2025-10-13, stop fills, 11%, $100,000 per entry.

| Figure | File (this run) | Prior reference | Match |
|---|---:|---:|---|
| Net profit | $183043.82 | $183043.82 | yes |
| Minute-sampled maximum drawdown | $19330.69 | $19330.69 | yes |
| Entries (including the open one) | 20 | 20 | yes |

Engine, arming from session 74 as the file: identical on every trade field, the totals and both drawdowns (20 trades).

Engine, arming from the common eligibility session 2017-06-15 (index 365): identical to the file (20 trades).

Development window (2017-06-15 → 2023-12-29): net $137,223, minute DD $19,331, 17 entries. 2024-01-02 → 2025-10-13 (previously inspected by earlier programs, not a holdout of this one): net $45,821.

## Trades (engine, eligibility run)

1. 2018-12-21 160.42 → 2019-05-13 200.02 (trailing stop) $20,375
2. 2019-08-05 203.65 → 2020-02-24 252.18 (trailing stop gap) $17,713
3. 2020-02-28 226.94 → 2020-03-06 232.86 (trailing stop) $2,398
4. 2020-03-12 205.22 → 2020-03-20 198.64 (maximum hold) −$3,447
5. 2020-03-23 185.73 → 2020-04-01 203.18 (trailing stop) $9,125
6. 2020-04-02 202.36 → 2020-09-04 315.87 (trailing stop) $51,420
7. 2020-10-28 304.01 → 2021-02-23 354.79 (trailing stop) $13,147
8. 2021-03-05 337.17 → 2021-05-11 355.50 (trailing stop gap) $3,419
9. 2022-03-14 367.27 → 2022-04-07 398.20 (trailing stop) $7,698
10. 2022-04-26 366.26 → 2022-05-06 363.42 (maximum hold) −$1,077
11. 2022-05-12 332.71 → 2022-06-10 342.66 (trailing stop) $2,116
12. 2022-06-13 328.51 → 2022-06-21 325.72 (maximum hold) −$1,092
13. 2022-06-22 324.92 → 2022-07-01 326.24 (maximum hold) $135
14. 2022-07-05 322.29 → 2022-08-26 363.01 (trailing stop) $11,068
15. 2022-09-16 329.27 → 2022-09-26 319.77 (maximum hold) −$3,187
16. 2022-10-10 306.40 → 2022-11-03 310.69 (trailing stop) $676
17. 2022-11-04 306.91 → 2022-12-15 331.37 (trailing stop) $6,736
18. 2025-04-04 491.58 → 2025-04-10 498.62 (trailing stop) $1,252
19. 2025-04-11 507.00 → 2025-04-21 497.68 (maximum hold) −$2,141
20. 2025-04-22 497.19 → open $46,709
