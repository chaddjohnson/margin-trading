# Audit tables (generated 2026-10-24T11:46:23.658Z)

data/partitions.json sha256 `43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6`. Integrity facts only: no strategy result on any window.

## Coverage (npm run datasets -- verify)

| Symbol | Status | Rows | training / holdout / final rows | Every row once | Sessions (expected) | Missing | On closed days | Sparse (<50%) | Malformed / order / dup | First → last | sha256 |
|---|---|---:|---|---|---|---:|---:|---:|---|---|---|
| EWZ | verified | 1,198,263 | 888,710 / 196,014 / 113,539 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `b1cf63a676c2696c…` |
| GDX | verified | 1,481,880 | 1,047,761 / 264,574 / 169,545 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `86ce101fede1a412…` |
| GLD | verified | 1,485,247 | 1,038,957 / 255,106 / 191,184 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `d3dd1beb35bc9bee…` |
| IWM | verified | 1,759,157 | 1,230,727 / 336,462 / 191,968 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `44a919f997c1eeaf…` |
| IWN | verified | 970,861 | 730,920 / 159,278 / 80,663 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `34cc798c020a152a…` |
| KRE | verified | 1,126,493 | 821,957 / 199,061 / 105,475 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `40e7bd6c72c1dffb…` |
| TLT | verified | 1,478,738 | 982,849 / 323,446 / 172,443 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `f4df3690714ee876…` |
| VGT | verified | 928,192 | 663,135 / 147,391 / 117,666 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `d8e6991de7d49010…` |
| VOOG | verified | 483,645 | 290,213 / 98,270 / 95,162 | yes | 2710 (2710) | 0 | 0 | 1798 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `a7aa42aeebd9e83f…` |
| XBI | verified | 1,174,798 | 859,813 / 202,748 / 112,237 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `9afecc0606330d68…` |
| XLE | verified | 1,322,426 | 962,949 / 210,497 / 148,980 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `57d013b051ccb205…` |
| XLF | verified | 1,332,122 | 971,398 / 231,633 / 129,091 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `845e7b603edf0f4e…` |
| XLU | verified | 1,122,603 | 821,321 / 188,913 / 112,369 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `ab2787a419828931…` |
| XLY | verified | 1,081,319 | 800,191 / 180,655 / 100,473 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `7a80d7f22b5b9f79…` |
| XOP | verified | 1,163,994 | 875,087 / 182,466 / 106,441 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `cb8f4d8852b2f714…` |
| XRT | verified | 1,068,251 | 792,337 / 178,080 / 97,834 | yes | 2710 (2710) | 0 | 0 | 0 | 0 / 0 / 0 | 2016-01-04 → 2026-10-13 | `ca0fdc6a4c77a97d…` |

## Recorded splits before and after the forward adjustment

| Symbol | Effective | Ratio | Partition | Raw close → open | Raw overnight | Adjusted overnight | Depth below 74-session high, raw → adjusted | Median minute volume before / after raw / after adjusted | Median daily $ volume before / after | Factor (expected) |
|---|---|---:|---|---|---:|---:|---|---|---|---|
| VGT | 2026-04-21 | 8 | final | 809.13 → 101.57 | -87.45% | 0.42% | 87.6% → 0.5% | 857 / 6832 / 854 | $406.8M / $437.0M | 8.00000 (8) |
| VOOG | 2026-04-21 | 6 | final | 460.46 → 77.25 | -83.22% | 0.66% | 83.6% → 1.6% | 391 / 2020 / 337 | $108.6M / $117.1M | 6.00000 (6) |
| XOP | 2020-03-30 | 0.25 | training | 8.03 → 31.1 | 287.30% | -3.18% | -22.6% → 69.4% | 105448 / 22405 / 89618 | $548.1M / $488.5M | 0.250000 (0.25) |
| XLE | 2025-12-05 | 2 | final | 92.22 → 46.03 | -50.09% | -0.17% | 50.6% → 1.2% | 23556 / 43958 / 21979 | $1372.1M / $1142.5M | 2.00000 (2) |
| XLU | 2025-12-05 | 2 | final | 87.42 → 43.72 | -49.99% | 0.02% | 53.8% → 7.7% | 15695 / 26336 / 13168 | $885.5M / $746.6M | 2.00000 (2) |
| XLY | 2025-12-05 | 2 | final | 238.14 → 119.18 | -49.95% | 0.09% | 51.0% → 2.1% | 12128 / 13485 / 6743 | $1282.6M / $939.1M | 2.00000 (2) |

## Overnight moves ≥ 8% of the split-adjusted series

Market-wide: at least 4 of the 16 files moved ≥ 4% overnight the same night.

| Symbol | Date | Partition | Prev close → open | Overnight | Close to close | Files moving ≥ 4% | Class |
|---|---|---|---|---:|---:|---:|---|
| EWZ | 2017-05-18 | training | 39.1500 → 32.1900 | -17.78% | -16.30% | 1 | idiosyncratic |
| EWZ | 2020-03-09 | training | 35.1000 → 30.7800 | -12.31% | -14.50% | 14 | market-wide |
| EWZ | 2020-03-12 | training | 29.6800 → 24.9000 | -16.11% | -16.64% | 15 | market-wide |
| EWZ | 2020-03-13 | training | 24.7400 → 29.4000 | 18.84% | 17.62% | 14 | market-wide |
| EWZ | 2020-03-16 | training | 29.1000 → 24.4100 | -16.12% | -23.09% | 16 | market-wide |
| EWZ | 2020-03-17 | training | 22.3800 → 24.2300 | 8.27% | 13.05% | 1 | idiosyncratic |
| EWZ | 2020-03-18 | training | 25.3000 → 22.1400 | -12.49% | -15.69% | 14 | market-wide |
| EWZ | 2020-03-24 | training | 20.7800 → 22.8200 | 9.82% | 12.08% | 14 | market-wide |
| EWZ | 2020-04-07 | training | 23.4300 → 25.7100 | 9.73% | 4.52% | 7 | market-wide |
| EWZ | 2020-05-26 | training | 24.6300 → 27.0100 | 9.66% | 8.04% | 2 | idiosyncratic |
| EWZ | 2026-10-05 | final | 38.1900 → 42.7800 | 12.02% | 12.54% | 1 | idiosyncratic |
| GDX | 2016-06-24 | training | 25.2600 → 27.6700 | 9.54% | 5.86% | 7 | market-wide |
| GDX | 2020-03-12 | training | 25.2100 → 22.9900 | -8.81% | -11.50% | 15 | market-wide |
| GDX | 2020-03-16 | training | 18.9900 → 16.7500 | -11.80% | 18.43% | 16 | market-wide |
| GDX | 2020-03-24 | training | 21.9300 → 24.9300 | 13.68% | 14.73% | 14 | market-wide |
| GDX | 2026-01-30 | final | 107.8500 → 98.9100 | -8.29% | -12.61% | 2 | idiosyncratic |
| GDX | 2026-03-19 | final | 88.1100 → 80.8600 | -8.23% | -5.91% | 2 | idiosyncratic |
| IWM | 2020-03-16 | training | 119.7100 → 105.4700 | -11.90% | -13.71% | 16 | market-wide |
| IWN | 2020-03-16 | training | 89.1000 → 80.2200 | -9.97% | -13.12% | 16 | market-wide |
| IWN | 2020-11-09 | training | 107.9900 → 117.7800 | 9.07% | 6.99% | 9 | market-wide |
| KRE | 2020-03-09 | training | 43.8900 → 39.7800 | -9.36% | -15.52% | 14 | market-wide |
| KRE | 2020-03-12 | training | 36.9500 → 33.9400 | -8.15% | -8.39% | 15 | market-wide |
| KRE | 2020-03-16 | training | 37.6400 → 32.3800 | -13.97% | -13.66% | 16 | market-wide |
| KRE | 2020-06-05 | training | 42.1100 → 45.8700 | 8.93% | 5.79% | 7 | market-wide |
| KRE | 2020-11-09 | training | 41.3600 → 45.7600 | 10.64% | 15.43% | 9 | market-wide |
| KRE | 2023-03-13 | training | 50.6900 → 44.3200 | -12.57% | -12.31% | 2 | idiosyncratic |
| KRE | 2023-03-14 | training | 44.4500 → 49.1500 | 10.57% | 2.09% | 1 | idiosyncratic |
| VGT | 2020-03-16 | training | 219.6300 → 193.2700 | -12.00% | -13.49% | 16 | market-wide |
| VOOG | 2020-03-16 | training | 154.3800 → 138.0400 | -10.58% | -11.90% | 16 | market-wide |
| XBI | 2020-03-16 | training | 75.2400 → 68.0900 | -9.50% | -12.35% | 16 | market-wide |
| XLE | 2020-03-09 | training | 42.5000 → 35.0700 | -17.48% | -20.14% | 14 | market-wide |
| XLE | 2020-03-10 | training | 33.9400 → 36.6700 | 8.04% | 4.74% | 5 | market-wide |
| XLE | 2020-03-13 | training | 29.4600 → 31.9600 | 8.49% | 9.27% | 14 | market-wide |
| XLE | 2020-03-16 | training | 32.1900 → 27.9500 | -13.17% | -13.67% | 16 | market-wide |
| XLE | 2020-11-09 | training | 28.9300 → 32.2300 | 11.41% | 14.28% | 9 | market-wide |
| XLF | 2016-09-19 | training | 23.6200 → 19.3500 | -18.08% | -18.25% | 1 | idiosyncratic |
| XLF | 2020-03-09 | training | 25.5800 → 23.2700 | -9.03% | -10.83% | 14 | market-wide |
| XLF | 2020-03-16 | training | 23.0500 → 19.3500 | -16.05% | -13.71% | 16 | market-wide |
| XLF | 2020-11-09 | training | 24.9600 → 26.9800 | 8.09% | 8.21% | 9 | market-wide |
| XLU | 2020-03-16 | training | 57.6700 → 52.0000 | -9.83% | -11.36% | 16 | market-wide |
| XLY | 2020-03-16 | training | 102.3000 → 91.3800 | -10.67% | -12.67% | 16 | market-wide |
| XOP | 2019-09-16 | training | 23.4500 → 25.5200 | 8.83% | 10.66% | 2 | idiosyncratic |
| XOP | 2020-03-09 | training | 12.9200 → 9.7900 | -24.23% | -36.92% | 14 | market-wide |
| XOP | 2020-03-10 | training | 8.1500 → 10.4500 | 28.22% | 21.84% | 5 | market-wide |
| XOP | 2020-03-12 | training | 9.3200 → 8.2400 | -11.59% | -11.59% | 15 | market-wide |
| XOP | 2020-03-13 | training | 8.2400 → 9.0000 | 9.22% | 14.81% | 14 | market-wide |
| XOP | 2020-03-16 | training | 9.4600 → 8.1900 | -13.42% | -8.46% | 16 | market-wide |
| XOP | 2020-06-11 | training | 15.4375 → 14.1500 | -8.34% | -9.47% | 7 | market-wide |
| XOP | 2020-11-09 | training | 10.1475 → 11.2550 | 10.91% | 16.19% | 9 | market-wide |
| XRT | 2020-03-16 | training | 32.7400 → 29.3100 | -10.48% | -12.46% | 16 | market-wide |
| XRT | 2021-01-27 | training | 81.4300 → 89.7600 | 10.23% | 12.03% | 1 | idiosyncratic |
| XRT | 2021-01-29 | training | 82.9700 → 91.0500 | 9.74% | 6.07% | 1 | idiosyncratic |

## Single-minute moves ≥ 8% (regular session)

| Symbol | Date | Partition | Time (UTC) | From → to | Change |
|---|---|---|---|---|---:|
| GDX | 2020-03-13 | training | 2020-03-13T19:59:00.000Z | 17.56 → 18.975 | 8.06% |

## Shifts of the median daily volume (20 sessions after ÷ before, ≥ 3× or ≤ 1/3)

| Symbol | Most extreme date | Flagged run | Partition | Ratio |
|---|---|---|---|---:|
| GLD | 2020-02-19 | 2020-02-14 → 2020-02-25 | training | 3.93 |
| IWM | 2020-02-26 | 2020-02-20 → 2020-03-05 | training | 3.44 |
| IWN | 2019-01-18 | 2019-01-16 → 2019-01-24 | training | 0.32 |
| IWN | 2020-02-25 | 2020-02-20 → 2020-03-05 | training | 3.93 |
| KRE | 2023-02-28 | 2023-02-23 → 2023-03-16 | training | 8.90 |
| VGT | 2020-02-18 | 2020-02-18 → 2020-02-18 | training | 3.11 |
| VGT | 2020-02-20 | 2020-02-20 → 2020-02-24 | training | 3.17 |
| VOOG | 2019-07-31 | 2019-07-30 → 2019-08-01 | training | 3.43 |
| VOOG | 2020-02-26 | 2020-02-12 → 2020-03-06 | training | 5.98 |
| XLE | 2020-02-26 | 2020-02-25 → 2020-02-27 | training | 3.19 |
| XLF | 2020-02-26 | 2020-02-12 → 2020-03-03 | training | 3.96 |

## Liquidity per partition

| Symbol | Partition | Sessions | Median regular bars | Median daily $ volume | Median close (run units) |
|---|---|---:|---:|---:|---:|
| EWZ | training | 2012 | 390 | $727.6M | 33.96 |
| EWZ | holdout | 450 | 390 | $571.4M | 28.21 |
| EWZ | final | 248 | 390 | $842.0M | 35.99 |
| GDX | training | 2012 | 390 | $701.4M | 27.20 |
| GDX | holdout | 450 | 390 | $680.2M | 39.03 |
| GDX | final | 248 | 390 | $1575.2M | 88.08 |
| GLD | training | 2012 | 390 | $998.0M | 144.14 |
| GLD | holdout | 450 | 390 | $1735.7M | 245.48 |
| GLD | final | 248 | 390 | $3504.3M | 402.65 |
| IWM | training | 2012 | 390 | $3696.7M | 158.20 |
| IWM | holdout | 450 | 390 | $5675.6M | 212.64 |
| IWM | final | 248 | 390 | $7242.8M | 271.03 |
| IWN | training | 2012 | 372 | $147.0M | 125.38 |
| IWN | holdout | 450 | 356 | $144.7M | 158.99 |
| IWN | final | 248 | 326 | $118.3M | 203.20 |
| KRE | training | 2012 | 390 | $386.1M | 54.99 |
| KRE | holdout | 450 | 390 | $650.1M | 56.91 |
| KRE | final | 248 | 390 | $965.8M | 69.41 |
| TLT | training | 2012 | 390 | $1257.5M | 125.85 |
| TLT | holdout | 450 | 390 | $2573.2M | 90.64 |
| TLT | final | 248 | 390 | $2147.7M | 86.56 |
| VGT | training | 2012 | 327 | $125.6M | 231.73 |
| VGT | holdout | 450 | 315 | $256.7M | 583.69 |
| VGT | final | 248 | 390 | $412.5M | 803.55 |
| VOOG | training | 2012 | 134 | $15.8M | 165.93 |
| VOOG | holdout | 450 | 208.5 | $61.4M | 345.50 |
| VOOG | final | 248 | 373 | $101.2M | 456.94 |
| XBI | training | 2012 | 390 | $476.4M | 84.34 |
| XBI | holdout | 450 | 390 | $790.5M | 91.51 |
| XBI | final | 248 | 390 | $1112.2M | 129.63 |
| XLE | training | 2012 | 390 | $1106.6M | 67.08 |
| XLE | holdout | 450 | 390 | $1195.4M | 88.97 |
| XLE | final | 248 | 390 | $1794.6M | 113.11 |
| XLF | training | 2012 | 390 | $1332.5M | 28.02 |
| XLF | holdout | 450 | 390 | $1618.9M | 47.45 |
| XLF | final | 248 | 390 | $1902.4M | 53.43 |
| XLU | training | 2012 | 390 | $773.4M | 59.86 |
| XLU | holdout | 450 | 390 | $799.0M | 77.73 |
| XLU | final | 248 | 390 | $887.8M | 88.97 |
| XLY | training | 2012 | 390 | $532.1M | 121.50 |
| XLY | holdout | 450 | 390 | $706.5M | 198.25 |
| XLY | final | 248 | 390 | $921.8M | 234.37 |
| XOP | training | 2012 | 390 | $561.3M | 31.63 |
| XOP | holdout | 450 | 390 | $380.8M | 33.58 |
| XOP | final | 248 | 390 | $474.2M | 41.12 |
| XRT | training | 2012 | 390 | $223.4M | 46.66 |
| XRT | holdout | 450 | 390 | $365.8M | 76.34 |
| XRT | final | 248 | 390 | $363.2M | 85.68 |
