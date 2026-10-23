# Data audit tables (generated 2026-10-23T12:53:58.909Z)

## Files

| Ticker | File | SHA-256 | Bytes | Rows | First row (UTC) | Last row (UTC) | Loader accepts |
|---|---|---|---:|---:|---|---|---|
| XBI | `data/XBI/XBI-2016-2025-1-minute.csv` | `ad5521e33b53fa15…` | 56,711,171 | 1,062,561 | 2016-01-04T09:00:00Z | 2025-10-16T23:57:00Z | yes |
| IWM | `data/IWM/IWM-2016-2025-1-minute.csv` | `e94869c669a5b0ad…` | 88,590,387 | 1,567,189 | 2016-01-04T09:00:00Z | 2025-10-16T23:59:00Z | yes |
| XRT | `data/XRT/XRT-2016-2025-1-minute.csv` | `c7c591557cc58576…` | 51,033,068 | 970,417 | 2016-01-04T14:30:00Z | 2025-10-16T23:53:00Z | yes |
| KRE | `data/KRE/KRE-2016-2025-1-minute.csv` | `5f8b2a284a862fdc…` | 54,242,088 | 1,021,018 | 2016-01-04T13:51:00Z | 2025-10-16T23:58:00Z | yes |
| XLY | `data/XLY/XLY-2016-2025-1-minute.csv` | `b58e2fbcd15d3b6a…` | 54,639,593 | 980,846 | 2016-01-04T13:44:00Z | 2025-10-16T20:35:00Z | yes |
| IWN | `data/IWN/IWN-2016-2025-1-minute.csv` | `aea1d2bb792bdc56…` | 49,610,795 | 890,198 | 2016-01-04T14:29:00Z | 2025-10-16T21:30:00Z | yes |
| XLF | `data/XLF/XLF-2016-2025-1-minute.csv` | `d6cc7fe9f0d4ebdf…` | 65,310,649 | 1,203,031 | 2016-01-04T09:00:00Z | 2025-10-16T23:53:00Z | yes |
| XLE | `data/XLE/XLE-2016-2025-1-minute.csv` | `e8adb598f40cdd95…` | 62,648,110 | 1,173,446 | 2016-01-04T11:39:00Z | 2025-10-16T23:50:00Z | yes |
| VGT | `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a…` | 46,207,832 | 809,490 | 2016-01-04T13:00:00Z | 2025-10-13T23:07:00Z | yes |

## Row sanity

| Ticker | Non-UTC | Unsorted | Duplicates | Unparsable | Non-positive price | Bad OHLC | Zero volume | Regular (9:30-16:00) | Closing (16:00) | Extended hours | Rows after 2025-12-31 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 954,692 | 2,445 | 105,424 | 0 |
| IWM | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 957,896 | 2,448 | 606,845 | 0 |
| XRT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 953,519 | 2,441 | 14,457 | 0 |
| KRE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 956,110 | 2,442 | 62,466 | 0 |
| XLY | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 956,162 | 2,441 | 22,243 | 0 |
| IWN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 883,405 | 2,439 | 4,354 | 0 |
| XLF | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 957,281 | 2,446 | 243,304 | 0 |
| XLE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 957,212 | 2,445 | 213,789 | 0 |
| VGT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 797,156 | 2,436 | 9,898 | 0 |

## Sessions and coverage

| Ticker | Sessions | First | Last | 2017-06-15 present | Development sessions (→ 2023) | Dev missing | Dev sparse | Dev mean coverage | Holdout sessions (2024 →) | Holdout first | Holdout last | Holdout missing | Holdout sparse | Holdout mean coverage |
|---|---:|---|---|---|---:|---:|---:|---:|---:|---|---|---:|---:|---:|
| XBI | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.7% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| IWM | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 100.0% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| XRT | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.6% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 99.8% |
| KRE | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.9% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| XLY | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.9% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 99.9% |
| IWN | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 92.8% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 90.2% |
| XLF | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 100.0% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| XLE | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 100.0% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| VGT | 2459 | 2016-01-04 | 2025-10-13 | yes (index 365) | 2012 | 0 | 0 | 83.8% | 447 | 2024-01-02 | 2025-10-13 | 3 | 0 | 81.7% |

Common holdout end: **2025-10-16** (the last session every one of the eight files has).

## Liquidity and bar quality

| Ticker | Window | Median bars/session | Min bars/session | Without closing print | Early closes | Zero-range bars | Median minute volume | Minutes < 100 shares |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| XBI | development | 390 | 205 | 1 | 15 | 0.9% | 9,108 | 0 |
| XBI | holdout | 390 | 210 | 0 | 4 | 0.0% | 14,421 | 0 |
| IWM | development | 390 | 210 | 1 | 15 | 0.0% | 38,679 | 0 |
| IWM | holdout | 390 | 210 | 0 | 4 | 0.0% | 46,550 | 0 |
| XRT | development | 390 | 207 | 2 | 15 | 3.3% | 5,750 | 0 |
| XRT | holdout | 390 | 208 | 0 | 4 | 1.8% | 5,737 | 0 |
| KRE | development | 390 | 209 | 2 | 15 | 1.1% | 11,228 | 0 |
| KRE | holdout | 390 | 210 | 0 | 4 | 0.2% | 18,160 | 0 |
| XLY | development | 390 | 209 | 2 | 15 | 1.0% | 7,162 | 0 |
| XLY | holdout | 390 | 207 | 0 | 4 | 0.4% | 6,053 | 0 |
| IWN | development | 372 | 162 | 2 | 15 | 13.1% | 1,522 | 0 |
| IWN | holdout | 356 | 191 | 2 | 4 | 17.2% | 1,098 | 0 |
| XLF | development | 390 | 210 | 1 | 15 | 0.0% | 73,786 | 0 |
| XLF | holdout | 390 | 210 | 0 | 4 | 0.0% | 57,632.5 | 0 |
| XLE | development | 390 | 210 | 1 | 15 | 0.0% | 32,058 | 0 |
| XLE | holdout | 390 | 210 | 0 | 4 | 0.0% | 22,348 | 0 |
| VGT | development | 327 | 134 | 3 | 15 | 26.3% | 803 | 0 |
| VGT | holdout | 315 | 175 | 2 | 4 | 28.9% | 861 | 0 |

## Overnight gaps of at least 10% (corporate-action candidates, both windows)

| Ticker | Window | Date | Previous close | Open | Gap | Session volume |
|---|---|---|---:|---:|---:|---:|
| IWM | development | 2020-03-16 | 119.71 | 105.47 | -11.9% | 52,296,492 |
| XRT | development | 2020-03-16 | 32.74 | 29.31 | -10.5% | 6,509,253 |
| XRT | development | 2021-01-27 | 81.43 | 89.76 | 10.2% | 31,695,460 |
| KRE | development | 2020-03-16 | 37.64 | 32.38 | -14.0% | 8,505,464 |
| KRE | development | 2023-03-13 | 50.69 | 44.32 | -12.6% | 91,278,623 |
| KRE | development | 2020-11-09 | 41.36 | 45.76 | 10.6% | 24,481,946 |
| KRE | development | 2023-03-14 | 44.45 | 49.15 | 10.6% | 62,223,999 |
| XLY | development | 2020-03-16 | 102.30 | 91.38 | -10.7% | 8,273,466 |
| XLF | development | 2016-09-19 | 23.62 | 19.35 | -18.1% | 44,024,443 |
| XLF | development | 2020-03-16 | 23.05 | 19.35 | -16.1% | 103,925,400 |
| XLE | development | 2020-03-09 | 42.50 | 35.07 | -17.5% | 57,213,381 |
| XLE | development | 2020-03-16 | 32.19 | 27.95 | -13.2% | 38,293,247 |
| XLE | development | 2020-11-09 | 28.93 | 32.23 | 11.4% | 95,374,217 |
| VGT | development | 2020-03-16 | 219.63 | 193.27 | -12.0% | 1,875,066 |

## Development-window price statistics (2016-01-04 → 2023-12-29; search-bound evidence, no strategy)

| Ticker | Deepest decline from rolling 74-session high | ≥10% | ≥15% | ≥20% | ≥25% | ≥30% | ≥40% | Median |daily return| | P95 |daily return| | Median intraday range | Gaps ≥ 5% | Minute outliers (>3%) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 36.7% on 2022-05-11 | 824 | 495 | 316 | 175 | 64 | 0 | 1.29% | 4.36% | 2.45% | 7 | 0 |
| IWM | 41.4% on 2020-03-23 | 428 | 196 | 77 | 42 | 22 | 3 | 0.76% | 2.85% | 1.40% | 9 | 2 |
| XRT | 42.0% on 2020-03-23 | 685 | 378 | 186 | 73 | 20 | 4 | 0.96% | 3.43% | 1.74% | 11 | 7 |
| KRE | 52.6% on 2020-03-23 | 659 | 379 | 214 | 149 | 125 | 45 | 1.00% | 4.17% | 1.95% | 19 | 5 |
| XLY | 34.1% on 2020-03-18 | 351 | 220 | 97 | 38 | 7 | 0 | 0.63% | 2.87% | 1.17% | 7 | 3 |
| IWN | 44.8% on 2020-03-23 | 410 | 176 | 73 | 56 | 43 | 9 | 0.73% | 2.87% | 1.37% | 7 | 2 |
| XLF | 43.9% on 2020-03-23 | 398 | 193 | 116 | 55 | 35 | 1 | 0.68% | 2.85% | 1.27% | 12 | 6 |
| XLE | 62.0% on 2020-03-23 | 673 | 327 | 212 | 117 | 62 | 36 | 0.93% | 3.71% | 1.79% | 12 | 5 |
| VGT | 32.2% on 2020-03-23 | 359 | 175 | 67 | 14 | 3 | 0 | 0.71% | 3.09% | 1.28% | 7 | 0 |

Deepest decline from the rolling 74-session high by development year:

| Ticker | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 33.8% | 13.9% | 34.0% | 27.0% | 33.2% | 29.9% | 36.7% | 26.2% |
| IWM | 14.5% | 6.5% | 26.8% | 23.0% | 41.4% | 13.2% | 22.8% | 18.4% |
| XRT | 13.8% | 15.3% | 26.5% | 21.0% | 42.0% | 23.3% | 30.8% | 21.6% |
| KRE | 20.3% | 13.4% | 30.6% | 25.0% | 52.6% | 16.8% | 23.1% | 44.8% |
| XLY | 11.2% | 4.6% | 22.1% | 17.4% | 34.1% | 10.8% | 29.9% | 19.7% |
| IWN | 11.6% | 7.0% | 25.2% | 21.4% | 44.8% | 12.4% | 19.5% | 18.2% |
| XLF | 22.7% | 9.5% | 23.3% | 19.2% | 43.9% | 9.0% | 23.2% | 16.6% |
| XLE | 14.8% | 13.0% | 31.3% | 26.1% | 62.0% | 19.2% | 27.7% | 17.4% |
| VGT | 12.1% | 5.8% | 24.3% | 22.4% | 32.2% | 11.3% | 26.4% | 13.7% |

## Verdicts

- **XBI**: valid; warnings: development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **IWM**: valid; warnings: development: overnight gap of -11.9% on 2020-03-16 (corporate-action candidate; verify); development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **XRT**: valid; warnings: development: overnight gap of -10.5% on 2020-03-16 (corporate-action candidate; verify); development: overnight gap of 10.2% on 2021-01-27 (corporate-action candidate; verify); development: 2 sessions without a closing print (the last regular minute's close is the official close)
- **KRE**: valid; warnings: development: overnight gap of -14.0% on 2020-03-16 (corporate-action candidate; verify); development: overnight gap of -12.6% on 2023-03-13 (corporate-action candidate; verify); development: overnight gap of 10.6% on 2020-11-09 (corporate-action candidate; verify); development: overnight gap of 10.6% on 2023-03-14 (corporate-action candidate; verify); development: 2 sessions without a closing print (the last regular minute's close is the official close)
- **XLY**: valid; warnings: development: overnight gap of -10.7% on 2020-03-16 (corporate-action candidate; verify); development: 2 sessions without a closing print (the last regular minute's close is the official close)
- **IWN**: valid; warnings: development: 2 sessions without a closing print (the last regular minute's close is the official close); holdout: 2 sessions without a closing print (the last regular minute's close is the official close)
- **XLF**: valid; warnings: development: overnight gap of -18.1% on 2016-09-19 (corporate-action candidate; verify); development: overnight gap of -16.1% on 2020-03-16 (corporate-action candidate; verify); development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **XLE**: valid; warnings: development: overnight gap of -17.5% on 2020-03-09 (corporate-action candidate; verify); development: overnight gap of -13.2% on 2020-03-16 (corporate-action candidate; verify); development: overnight gap of 11.4% on 2020-11-09 (corporate-action candidate; verify); development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **VGT**: valid; warnings: development: overnight gap of -12.0% on 2020-03-16 (corporate-action candidate; verify); development: 3 sessions without a closing print (the last regular minute's close is the official close); holdout: 3 calendar sessions missing (2025-10-14, 2025-10-15, 2025-10-16); holdout: 2 sessions without a closing print (the last regular minute's close is the official close)
