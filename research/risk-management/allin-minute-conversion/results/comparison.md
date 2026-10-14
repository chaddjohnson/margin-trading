## Headline metrics, 2016-10-07 to 2025-10-13 (2266 sessions)

| Run | Net profit | Realized | Unrealized | Margin interest | Max DD (daily) | Max DD (minute) | Trades | Wins / losses | Avg hold (days) | Restrictions (re-entries / resets) |
|---|---|---|---|---|---|---|---|---|---|---|
| A: original, daily file | $173,055 | $129,356 | $43,699 | $56,808 | $28,687 | n/a | 32 + 1 open | 14 / 18 | 53.3 | 14 (10 / 4) |
| B: original, minute sessions | $163,855 | $120,488 | $43,367 | $56,929 | $28,871 | n/a | 33 + 1 open | 14 / 19 | 51.8 | 14 (10 / 4) |
| M: minute implementation | $166,909 | $123,603 | $43,306 | $55,332 | $28,889 | $32,632 | 31 + 1 open | 12 / 19 | 53.4 | 16 (12 / 4) |
| M2: minute, next-open stop fills | $166,554 | $123,249 | $43,306 | $55,332 | $28,851 | $32,594 | 31 + 1 open | 12 / 19 | 53.4 | 16 (12 / 4) |

Drawdown windows: A 2024-07-10 → 2025-04-08; B 2024-07-10 → 2025-04-08; M 2024-07-10 → 2025-04-08 (minute: 2024-07-15T15:21:00.000Z → 2025-04-07T13:42:00.000Z).

## Exit reasons

| Run | trailing stop | trailing stop gap | maximum hold |
|---|---|---|---|
| A | 11 | 4 | 17 |
| B | 11 | 4 | 18 |
| M | 9 | 4 | 18 |
| M2 | 9 | 4 | 18 |

## Minute entry prices against the official close of the same session

| Measure | Fill (15:59 open) vs close, bps | Decision price (15:58 close) vs close, bps |
|---|---|---|
| Mean (signed) | 6.9 | 7.6 |
| Mean absolute | 9.8 | 10.3 |
| Median absolute | 4.4 | 5.7 |
| Largest absolute | 88.1 | 88.4 |
| Fills above the close | 21 of 32 |  |
| Fills below the close | 10 of 32 |  |

## Trade by trade: A (original daily file) against M

| Entry date | A exit | M exit (ET) | A price return | M price return | A profit | M profit | Δ profit | Category |
|---|---|---|---|---|---|---|---|---|
| 2018-02-08 | 2018-03-23 trailing stop | — | 6.69% | — | $5,395 | — |  | only in A: decision 9.88% vs close 10.31% below the high; M flat |
| 2018-03-28 | — | 2018-10-10 15:19 trailing stop | — | 12.25% | — | $6,342 |  | only in M: decision 10.02% vs close 10.16% below the high; A  |
| 2018-04-02 | 2018-10-10 trailing stop | — | 13.37% | — | $7,610 | — |  | only in A: decision 10.46% vs close 10.45% below the high; M held a position |
| 2018-10-11 | 2018-10-26 maximum hold | 2018-10-26 09:31 maximum hold | −1.45% | −1.29% | −$1,903 | −$1,746 | +$157 | same entry and exit dates |
| 2018-11-12 | 2018-11-27 maximum hold | 2018-11-27 09:31 maximum hold | −3.08% | −3.12% | −$3,532 | −$3,568 | −$37 | same entry and exit dates |
| 2018-12-17 | 2019-01-02 maximum hold | 2019-01-02 09:31 maximum hold | −3.15% | −2.90% | −$3,631 | −$3,380 | +$251 | same entry and exit dates |
| 2019-01-03 | — | 2019-05-13 13:00 trailing stop | — | 24.93% | — | $21,009 |  | only in M: decision 22.30% vs close 22.38% below the high; A  |
| 2019-01-22 | 2019-05-13 trailing stop | — | 14.53% | — | $11,183 | — |  | only in A: decision 15.30% vs close 14.97% below the high; M held a position |
| 2019-06-03 | 2019-08-05 trailing stop | 2019-08-05 10:41 trailing stop | 8.10% | 7.66% | $6,201 | $5,764 | −$436 | same entry and exit dates |
| 2020-02-25 | 2020-03-11 maximum hold | 2020-03-11 09:31 maximum hold | −8.39% | −9.01% | −$8,847 | −$9,463 | −$616 | same entry and exit dates |
| 2020-03-12 | 2020-03-16 trailing stop gap | 2020-03-16 09:30 trailing stop gap | −2.31% | −2.83% | −$2,432 | −$2,946 | −$514 | same entry and exit dates |
| 2020-03-20 | 2020-04-01 trailing stop | — | 7.78% | — | $7,420 | — |  | only in A: decision 31.51% vs close 31.63% below the high; M entry_blocked |
| 2020-03-23 | — | 2020-04-01 15:08 trailing stop | — | 7.79% | — | $7,523 |  | only in M: decision 31.64% vs close 32.24% below the high; A  |
| 2020-04-02 | 2020-09-04 trailing stop | 2020-09-04 09:47 trailing stop | 52.69% | 52.37% | $48,014 | $47,696 | −$318 | same entry and exit dates |
| 2020-09-08 | 2020-09-24 maximum hold | 2020-09-24 09:31 maximum hold | −2.07% | −1.88% | −$2,556 | −$2,360 | +$196 | same entry and exit dates |
| 2020-10-28 | 2021-02-23 trailing stop | 2021-02-23 09:46 trailing stop | 17.37% | 17.18% | $13,810 | $13,619 | −$191 | same entry and exit dates |
| 2021-03-04 | 2021-05-11 trailing stop gap | 2021-05-11 09:30 trailing stop gap | 3.88% | 3.69% | $1,830 | $1,636 | −$195 | same entry and exit dates |
| 2022-01-19 | 2022-02-04 maximum hold | 2022-02-04 09:31 maximum hold | −1.02% | −1.08% | −$1,501 | −$1,565 | −$63 | same entry and exit dates |
| 2022-02-18 | 2022-03-07 maximum hold | 2022-03-07 09:31 maximum hold | −1.99% | −1.61% | −$2,505 | −$2,117 | +$387 | same entry and exit dates |
| 2022-03-08 | 2022-04-11 trailing stop gap | 2022-04-11 09:30 trailing stop gap | 5.22% | 5.00% | $4,197 | $3,975 | −$221 | same entry and exit dates |
| 2022-04-12 | 2022-04-27 maximum hold | 2022-04-27 09:31 maximum hold | −5.29% | −4.62% | −$5,739 | −$5,070 | +$669 | same entry and exit dates |
| 2022-05-09 | 2022-05-24 maximum hold | 2022-05-24 09:31 maximum hold | −2.01% | −1.91% | −$2,457 | −$2,358 | +$99 | same entry and exit dates |
| 2022-06-13 | 2022-08-29 trailing stop gap | 2022-08-29 09:30 trailing stop gap | 11.32% | 11.20% | $9,000 | $8,884 | −$116 | same entry and exit dates |
| 2022-08-30 | 2022-09-14 maximum hold | 2022-09-14 09:31 maximum hold | −2.76% | −2.83% | −$3,207 | −$3,279 | −$72 | same entry and exit dates |
| 2022-09-21 | 2022-10-06 maximum hold | 2022-10-06 09:31 maximum hold | 0.11% | −0.04% | −$346 | −$489 | −$143 | same entry and exit dates |
| 2022-10-07 | 2022-11-03 maximum hold | 2022-11-03 09:31 maximum hold | −0.49% | −0.64% | −$1,306 | −$1,456 | −$150 | same entry and exit dates |
| 2022-11-04 | 2022-12-16 trailing stop | — | 5.91% | — | $4,640 | — |  | only in A: decision 20.83% vs close 20.70% below the high; M entry_blocked |
| 2022-11-14 | — | 2022-11-29 09:31 maximum hold | — | −1.45% | — | −$1,899 |  | only in M: decision 13.33% vs close 13.33% below the high; A  |
| 2022-12-19 | 2023-01-03 maximum hold | 2023-01-03 09:31 maximum hold | 0.31% | 0.16% | −$143 | −$293 | −$151 | same entry and exit dates |
| 2023-01-04 | 2023-08-09 trailing stop | 2023-08-09 11:00 trailing stop | 34.55% | 34.15% | $28,006 | $27,611 | −$395 | same entry and exit dates |
| 2023-09-21 | 2023-10-06 maximum hold | 2023-10-06 09:31 maximum hold | −0.05% | −0.12% | −$503 | −$568 | −$65 | same entry and exit dates |
| 2023-10-20 | 2024-04-18 trailing stop | 2024-04-18 09:38 trailing stop | 20.65% | 20.40% | $15,193 | $14,942 | −$250 | same entry and exit dates |
| 2024-04-19 | 2024-07-24 trailing stop | 2024-07-24 15:29 trailing stop | 16.94% | 16.74% | $14,049 | $13,844 | −$205 | same entry and exit dates |
| 2024-08-01 | 2024-09-04 maximum hold | 2024-09-04 09:31 maximum hold | −0.78% | −0.80% | −$1,806 | −$1,823 | −$16 | same entry and exit dates |
| 2025-03-03 | 2025-03-18 maximum hold | 2025-03-18 09:31 maximum hold | −2.57% | −2.78% | −$3,025 | −$3,229 | −$204 | same entry and exit dates |
| 2025-03-28 | 2025-04-14 maximum hold | 2025-04-14 09:31 maximum hold | −1.24% | −1.12% | −$1,753 | −$1,633 | +$120 | same entry and exit dates |
| 2025-04-16 | open open | open  open | 49.12% | 48.73% | $43,699 | $43,306 | −$394 | same entry and exit dates |

## Trade by trade: B (original on minute sessions) against M

| Entry date | B exit | M exit (ET) | B price return | M price return | B profit | M profit | Δ profit | Category |
|---|---|---|---|---|---|---|---|---|
| 2018-02-08 | 2018-03-23 trailing stop | — | 6.68% | — | $5,388 | — |  | only in B: decision 9.88% vs close 10.31% below the high; M flat |
| 2018-03-28 | 2018-10-10 trailing stop | 2018-10-10 15:19 trailing stop | 12.34% | 12.25% | $6,436 | $6,342 | −$94 | same entry and exit dates |
| 2018-10-11 | 2018-10-26 maximum hold | 2018-10-26 09:31 maximum hold | −1.45% | −1.29% | −$1,906 | −$1,746 | +$160 | same entry and exit dates |
| 2018-11-12 | 2018-11-27 maximum hold | 2018-11-27 09:31 maximum hold | −3.09% | −3.12% | −$3,539 | −$3,568 | −$29 | same entry and exit dates |
| 2018-12-17 | 2019-01-02 maximum hold | 2019-01-02 09:31 maximum hold | −3.14% | −2.90% | −$3,627 | −$3,380 | +$247 | same entry and exit dates |
| 2019-01-03 | — | 2019-05-13 13:00 trailing stop | — | 24.93% | — | $21,009 |  | only in M: decision 22.30% vs close 22.38% below the high; B entry_blocked |
| 2019-01-22 | 2019-05-13 trailing stop | — | 14.19% | — | $10,845 | — |  | only in B: decision 15.30% vs close 14.97% below the high; M held a position |
| 2019-06-03 | 2019-08-05 trailing stop | 2019-08-05 10:41 trailing stop | 7.78% | 7.66% | $5,883 | $5,764 | −$118 | same entry and exit dates |
| 2020-02-25 | 2020-03-11 maximum hold | 2020-03-11 09:31 maximum hold | −8.74% | −9.01% | −$9,196 | −$9,463 | −$267 | same entry and exit dates |
| 2020-03-12 | 2020-03-16 trailing stop gap | 2020-03-16 09:30 trailing stop gap | −2.31% | −2.83% | −$2,430 | −$2,946 | −$516 | same entry and exit dates |
| 2020-03-20 | 2020-04-01 trailing stop | — | 7.78% | — | $7,418 | — |  | only in B: decision 31.51% vs close 31.63% below the high; M entry_blocked |
| 2020-03-23 | — | 2020-04-01 15:08 trailing stop | — | 7.79% | — | $7,523 |  | only in M: decision 31.64% vs close 32.24% below the high; B held a position |
| 2020-04-02 | 2020-09-04 trailing stop | 2020-09-04 09:47 trailing stop | 52.30% | 52.37% | $47,630 | $47,696 | +$67 | same entry and exit dates |
| 2020-09-08 | 2020-09-24 maximum hold | 2020-09-24 09:31 maximum hold | −2.30% | −1.88% | −$2,782 | −$2,360 | +$422 | same entry and exit dates |
| 2020-10-28 | 2021-02-23 trailing stop | 2021-02-23 09:46 trailing stop | 17.13% | 17.18% | $13,572 | $13,619 | +$47 | same entry and exit dates |
| 2021-03-04 | 2021-05-11 trailing stop gap | 2021-05-11 09:30 trailing stop gap | 3.69% | 3.69% | $1,642 | $1,636 | −$6 | same entry and exit dates |
| 2022-01-19 | 2022-02-04 maximum hold | 2022-02-04 09:31 maximum hold | −1.02% | −1.08% | −$1,503 | −$1,565 | −$62 | same entry and exit dates |
| 2022-02-18 | 2022-03-07 maximum hold | 2022-03-07 09:31 maximum hold | −1.99% | −1.61% | −$2,504 | −$2,117 | +$387 | same entry and exit dates |
| 2022-03-08 | 2022-04-11 trailing stop gap | 2022-04-11 09:30 trailing stop gap | 5.03% | 5.00% | $4,006 | $3,975 | −$31 | same entry and exit dates |
| 2022-04-12 | 2022-04-27 maximum hold | 2022-04-27 09:31 maximum hold | −5.29% | −4.62% | −$5,739 | −$5,070 | +$669 | same entry and exit dates |
| 2022-05-09 | 2022-05-24 maximum hold | 2022-05-24 09:31 maximum hold | −2.01% | −1.91% | −$2,457 | −$2,358 | +$99 | same entry and exit dates |
| 2022-06-13 | 2022-07-05 maximum hold | 2022-08-29 09:30 trailing stop gap | 0.60% | 11.20% | −$63 | $8,884 | +$8,946 | exit moved 2022-07-05 → 2022-08-29 |
| 2022-07-06 | 2022-08-29 trailing stop gap | — | 6.68% | — | $5,050 | — |  | only in B: decision 22.08% vs close 22.05% below the high; M held a position |
| 2022-08-30 | 2022-09-14 maximum hold | 2022-09-14 09:31 maximum hold | −2.76% | −2.83% | −$3,208 | −$3,279 | −$72 | same entry and exit dates |
| 2022-09-21 | 2022-10-06 maximum hold | 2022-10-06 09:31 maximum hold | −0.07% | −0.04% | −$519 | −$489 | +$31 | same entry and exit dates |
| 2022-10-07 | 2022-11-03 maximum hold | 2022-11-03 09:31 maximum hold | −0.49% | −0.64% | −$1,306 | −$1,456 | −$150 | same entry and exit dates |
| 2022-11-04 | 2022-12-16 trailing stop | — | 5.91% | — | $4,641 | — |  | only in B: decision 20.83% vs close 20.70% below the high; M entry_blocked |
| 2022-11-14 | — | 2022-11-29 09:31 maximum hold | — | −1.45% | — | −$1,899 |  | only in M: decision 13.33% vs close 13.33% below the high; B held a position |
| 2022-12-19 | 2023-01-03 maximum hold | 2023-01-03 09:31 maximum hold | 0.31% | 0.16% | −$143 | −$293 | −$150 | same entry and exit dates |
| 2023-01-04 | 2023-08-09 trailing stop | 2023-08-09 11:00 trailing stop | 34.06% | 34.15% | $27,519 | $27,611 | +$92 | same entry and exit dates |
| 2023-09-21 | 2023-10-06 maximum hold | 2023-10-06 09:31 maximum hold | −0.27% | −0.12% | −$718 | −$568 | +$150 | same entry and exit dates |
| 2023-10-20 | 2024-04-18 trailing stop | 2024-04-18 09:38 trailing stop | 20.45% | 20.40% | $14,995 | $14,942 | −$53 | same entry and exit dates |
| 2024-04-19 | 2024-07-24 trailing stop | 2024-07-24 15:29 trailing stop | 16.78% | 16.74% | $13,885 | $13,844 | −$41 | same entry and exit dates |
| 2024-08-01 | 2024-09-04 maximum hold | 2024-09-04 09:31 maximum hold | −0.78% | −0.80% | −$1,806 | −$1,823 | −$16 | same entry and exit dates |
| 2025-03-03 | 2025-03-18 maximum hold | 2025-03-18 09:31 maximum hold | −2.77% | −2.78% | −$3,222 | −$3,229 | −$7 | same entry and exit dates |
| 2025-03-28 | 2025-04-14 maximum hold | 2025-04-14 09:31 maximum hold | −1.24% | −1.12% | −$1,755 | −$1,633 | +$122 | same entry and exit dates |
| 2025-04-16 | open open | open  open | 48.79% | 48.73% | $43,367 | $43,306 | −$62 | same entry and exit dates |

## Attribution of the B → M profit change (same prices, execution only)

| Component | Effect |
|---|---|
| Same entry and exit dates: entry prices (15:59 fill vs close) | −$1,264 |
| Same entry and exit dates: exit prices, trailing stop | −$18 |
| Same entry and exit dates: exit prices, maximum hold | +$2,098 |
| Same entry and exit dates: exit prices, trailing stop gap | $0 |
| Same entry and exit dates: exit prices, open at end (marked at the same close) | $0 |
| Same entry and exit dates: interest | $0 |
| Same entry date, different exit date (1 trade, whole profit change) | +$8,946 |
| Trades only in M (sequence) | +$26,633 |
| Trades only in B (sequence) | −$33,342 |
| Total | +$3,054 |
| Check: M − B net profit | +$3,054 |

Trades whose exit date changed (B → M):

- 2022-06-13: maximum hold 2022-07-05 → trailing stop gap 2022-08-29 (+$8,946)

## Minute trades (M)

| Entry (ET) | Decision price | Entry fill | Session close | Exit (ET) | Reason | Exit price source | Stop | Exit price | M2 exit price | Hold (calendar days) | Profit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018-03-28 15:59 | 167.69 | 167.56 | 167.42 | 2018-10-10 15:19 | trailing stop | stop level | 188.08 | 188.08 | 188.07 | 196 | $6,342 |
| 2018-10-11 15:59 | 183.95 | 183.95 | 183.60 | 2018-10-26 09:31 | maximum hold | first trade after decision | 177.50 | 181.57 | 181.57 | 15 | −$1,746 |
| 2018-11-12 15:59 | 180.28 | 180.34 | 180.44 | 2018-11-27 09:31 | maximum hold | first trade after decision | 168.99 | 174.72 | 174.72 | 15 | −$3,568 |
| 2018-12-17 15:59 | 168.74 | 168.75 | 168.86 | 2019-01-02 09:31 | maximum hold | first trade after decision | 159.16 | 163.86 | 163.86 | 16 | −$3,380 |
| 2019-01-03 15:59 | 158.84 | 158.90 | 158.68 | 2019-05-13 13:00 | trailing stop | stop level | 198.51 | 198.51 | 198.50 | 130 | $21,009 |
| 2019-06-03 15:59 | 191.19 | 191.13 | 190.92 | 2019-08-05 10:41 | trailing stop | stop level | 205.78 | 205.78 | 205.79 | 63 | $5,764 |
| 2020-02-25 15:59 | 245.88 | 245.94 | 245.78 | 2020-03-11 09:31 | maximum hold | first trade after decision | 231.74 | 223.78 | 223.78 | 15 | −$9,463 |
| 2020-03-12 15:59 | 198.90 | 198.89 | 197.84 | 2020-03-16 09:30 | trailing stop gap | opening trade | 202.30 | 193.27 | 193.27 | 4 | −$2,946 |
| 2020-03-23 15:59 | 187.13 | 187.12 | 185.49 | 2020-04-01 15:08 | trailing stop | stop level | 201.71 | 201.71 | 201.80 | 9 | $7,523 |
| 2020-04-02 15:59 | 205.90 | 205.74 | 205.83 | 2020-09-04 09:47 | trailing stop | stop level | 313.48 | 313.48 | 313.48 | 155 | $47,696 |
| 2020-09-08 15:59 | 299.93 | 299.92 | 299.64 | 2020-09-24 09:31 | maximum hold | first trade after decision | 289.05 | 294.29 | 294.29 | 16 | −$2,360 |
| 2020-10-28 15:59 | 300.62 | 300.50 | 300.62 | 2021-02-23 09:46 | trailing stop | stop level | 352.11 | 352.11 | 351.39 | 118 | $13,619 |
| 2021-03-04 15:59 | 342.62 | 342.87 | 342.85 | 2021-05-11 09:30 | trailing stop gap | opening trade | 357.63 | 355.50 | 355.50 | 68 | $1,636 |
| 2022-01-19 15:59 | 416.59 | 416.52 | 416.52 | 2022-02-04 09:31 | maximum hold | first trade after decision | 392.98 | 412.01 | 412.01 | 16 | −$1,565 |
| 2022-02-18 15:59 | 398.12 | 398.10 | 398.09 | 2022-03-07 09:31 | maximum hold | first trade after decision | 374.96 | 391.71 | 391.71 | 17 | −$2,117 |
| 2022-03-08 15:59 | 373.76 | 373.79 | 373.68 | 2022-04-11 09:30 | trailing stop gap | opening trade | 395.20 | 392.48 | 392.48 | 34 | $3,975 |
| 2022-04-12 15:59 | 387.36 | 387.32 | 387.17 | 2022-04-27 09:31 | maximum hold | first trade after decision | 366.64 | 369.43 | 369.43 | 15 | −$5,070 |
| 2022-05-09 15:59 | 347.25 | 347.25 | 347.13 | 2022-05-24 09:31 | maximum hold | first trade after decision | 328.53 | 340.63 | 340.63 | 15 | −$2,358 |
| 2022-06-13 15:59 | 321.29 | 321.22 | 321.47 | 2022-08-29 09:30 | trailing stop gap | opening trade | 360.27 | 357.21 | 357.21 | 77 | $8,884 |
| 2022-08-30 15:59 | 352.63 | 352.62 | 352.72 | 2022-09-14 09:31 | maximum hold | first trade after decision | 331.51 | 342.65 | 342.65 | 15 | −$3,279 |
| 2022-09-21 15:59 | 328.80 | 328.80 | 328.23 | 2022-10-06 09:31 | maximum hold | first trade after decision | 304.52 | 328.68 | 328.68 | 15 | −$489 |
| 2022-10-07 15:59 | 312.93 | 312.88 | 312.76 | 2022-11-03 09:31 | maximum hold | first trade after decision | 308.34 | 310.87 | 310.87 | 27 | −$1,456 |
| 2022-11-14 15:59 | 339.39 | 339.37 | 339.40 | 2022-11-29 09:31 | maximum hold | first trade after decision | 320.84 | 334.46 | 334.46 | 15 | −$1,899 |
| 2022-12-19 15:59 | 321.57 | 321.63 | 321.37 | 2023-01-03 09:31 | maximum hold | first trade after decision | 302.44 | 322.14 | 322.14 | 15 | −$293 |
| 2023-01-04 15:59 | 317.44 | 317.46 | 317.72 | 2023-08-09 11:00 | trailing stop | minute open through stop | 425.93 | 425.88 | 425.88 | 217 | $27,611 |
| 2023-09-21 15:59 | 414.32 | 414.18 | 414.04 | 2023-10-06 09:31 | maximum hold | first trade after decision | 386.75 | 413.70 | 413.70 | 15 | −$568 |
| 2023-10-20 15:59 | 410.10 | 410.06 | 409.88 | 2024-04-18 09:38 | trailing stop | stop level | 493.70 | 493.70 | 492.91 | 181 | $14,942 |
| 2024-04-19 15:59 | 480.00 | 480.07 | 479.90 | 2024-07-24 15:29 | trailing stop | stop level | 560.42 | 560.42 | 560.60 | 96 | $13,844 |
| 2024-08-01 15:59 | 547.79 | 547.63 | 547.48 | 2024-09-04 09:31 | maximum hold | first trade after decision | 539.28 | 543.26 | 543.26 | 34 | −$1,823 |
| 2025-03-03 15:59 | 578.15 | 578.05 | 578.36 | 2025-03-18 09:31 | maximum hold | first trade after decision | 541.57 | 562.00 | 562.00 | 15 | −$3,229 |
| 2025-03-28 15:59 | 543.24 | 543.23 | 543.24 | 2025-04-14 09:31 | maximum hold | first trade after decision | 511.73 | 537.14 | 537.14 | 17 | −$1,633 |
| 2025-04-16 15:59 | 508.05 | 507.96 | 507.75 | open, marked 2025-10-13 | open | last close |  | 755.49 |  | 180 | $43,306 |

## Re-entry restriction episodes

| Run | Episodes (exit date → resolution, date) |
|---|---|
| A | 2018-10-26 → recovery reset 2018-11-07; 2018-11-27 → lower price reentry 2018-12-17; 2019-01-02 → recovery reset 2019-01-18; 2020-03-11 → lower price reentry 2020-03-12; 2020-03-16 → lower price reentry 2020-03-20; 2020-09-24 → recovery reset 2020-10-01; 2022-02-04 → lower price reentry 2022-02-18; 2022-03-07 → lower price reentry 2022-03-08; 2022-04-27 → lower price reentry 2022-05-09; 2022-05-24 → lower price reentry 2022-06-13; 2022-09-14 → lower price reentry 2022-09-21; 2024-09-04 → recovery reset 2024-09-12; 2025-03-18 → lower price reentry 2025-03-28; 2025-04-14 → lower price reentry 2025-04-16 |
| B | 2018-10-26 → recovery reset 2018-11-07; 2018-11-27 → lower price reentry 2018-12-17; 2019-01-02 → recovery reset 2019-01-18; 2020-03-11 → lower price reentry 2020-03-12; 2020-03-16 → lower price reentry 2020-03-20; 2020-09-24 → recovery reset 2020-10-01; 2022-02-04 → lower price reentry 2022-02-18; 2022-03-07 → lower price reentry 2022-03-08; 2022-04-27 → lower price reentry 2022-05-09; 2022-05-24 → lower price reentry 2022-06-13; 2022-09-14 → lower price reentry 2022-09-21; 2024-09-04 → recovery reset 2024-09-12; 2025-03-18 → lower price reentry 2025-03-28; 2025-04-14 → lower price reentry 2025-04-16 |
| M | 2018-10-26 → recovery reset 2018-11-07; 2018-11-27 → lower price reentry 2018-12-17; 2019-01-02 → lower price reentry 2019-01-03; 2020-03-11 → lower price reentry 2020-03-12; 2020-03-16 → lower price reentry 2020-03-23; 2020-09-24 → recovery reset 2020-10-01; 2022-02-04 → lower price reentry 2022-02-18; 2022-03-07 → lower price reentry 2022-03-08; 2022-04-27 → lower price reentry 2022-05-09; 2022-05-24 → lower price reentry 2022-06-13; 2022-09-14 → lower price reentry 2022-09-21; 2022-11-03 → recovery reset 2022-11-11; 2022-11-29 → lower price reentry 2022-12-19; 2024-09-04 → recovery reset 2024-09-12; 2025-03-18 → lower price reentry 2025-03-28; 2025-04-14 → lower price reentry 2025-04-16 |
| M2 | 2018-10-26 → recovery reset 2018-11-07; 2018-11-27 → lower price reentry 2018-12-17; 2019-01-02 → lower price reentry 2019-01-03; 2020-03-11 → lower price reentry 2020-03-12; 2020-03-16 → lower price reentry 2020-03-23; 2020-09-24 → recovery reset 2020-10-01; 2022-02-04 → lower price reentry 2022-02-18; 2022-03-07 → lower price reentry 2022-03-08; 2022-04-27 → lower price reentry 2022-05-09; 2022-05-24 → lower price reentry 2022-06-13; 2022-09-14 → lower price reentry 2022-09-21; 2022-11-03 → recovery reset 2022-11-11; 2022-11-29 → lower price reentry 2022-12-19; 2024-09-04 → recovery reset 2024-09-12; 2025-03-18 → lower price reentry 2025-03-28; 2025-04-14 → lower price reentry 2025-04-16 |

## Profit by exit year (open position in 2025)

| Year | A | B | M | M − B | M − A |
|---|---|---|---|---|---|
| 2018 | $7,570 | $6,379 | $1,028 | −$5,351 | −$6,542 |
| 2019 | $13,753 | $13,101 | $23,393 | +$10,292 | +$9,640 |
| 2020 | $41,599 | $40,640 | $40,451 | −$189 | −$1,149 |
| 2021 | $15,641 | $15,214 | $15,255 | +$41 | −$386 |
| 2022 | $776 | −$3,601 | −$5,375 | −$1,774 | −$6,151 |
| 2023 | $27,360 | $26,658 | $26,750 | +$91 | −$610 |
| 2024 | $27,435 | $27,074 | $26,963 | −$110 | −$472 |
| 2025 | $38,922 | $38,390 | $38,444 | +$54 | −$478 |

## Largest daily mark-to-market drawdown from the running peak, on sessions in each year

| Year | A | B | M |
|---|---|---|---|
| 2018 | $23,723 | $24,024 | $23,826 |
| 2019 | $18,814 | $19,120 | $18,873 |
| 2020 | $21,841 | $22,154 | $22,823 |
| 2021 | $10,953 | $10,935 | $10,945 |
| 2022 | $20,570 | $23,186 | $21,619 |
| 2023 | $14,494 | $15,988 | $20,388 |
| 2024 | $16,328 | $16,315 | $16,337 |
| 2025 | $28,687 | $28,871 | $28,889 |
