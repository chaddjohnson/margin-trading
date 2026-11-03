# Library coverage

1045 vectors per ETF (1024 Sobol + 21 controls, 0 duplicates); traced in 230 s.

| ETF | Vectors | Inert (no training trade) | Closed trades in ≥ 3 years | Virtual trades min / median / max | Signals | Median fill delay (s) | Max fill delay (s) |
|---|---:|---:|---:|---:|---:|---:|---:|
| EWZ | 1045 | 0 | 1031 | 1 / 41 / 211 | 48276 | 0 | 235800 |
| GDX | 1045 | 0 | 965 | 2 / 42 / 215 | 47827 | 0 | 239400 |
| GLD | 1045 | 526 | 372 | 0 / 0 / 57 | 5132 | 0 | 0 |
| IWM | 1045 | 0 | 812 | 1 / 17 / 115 | 21505 | 0 | 322200 |
| IWN | 1045 | 0 | 715 | 1 / 16 / 128 | 21978 | 0 | 235800 |
| KRE | 1045 | 0 | 994 | 2 / 36 / 194 | 41651 | 0 | 235800 |
| TLT | 1045 | 131 | 618 | 0 / 10 / 84 | 13717 | 0 | 235800 |
| VGT | 1045 | 0 | 804 | 1 / 16 / 117 | 18737 | 0 | 322200 |
| VOOG | 1045 | 0 | 670 | 1 / 13 / 92 | 15372 | 0 | 239400 |
| XBI | 1045 | 0 | 1030 | 4 / 40 / 239 | 47412 | 0 | 322200 |
| XLE | 1045 | 0 | 1017 | 1 / 31 / 183 | 37950 | 0 | 322200 |
| XLF | 1045 | 0 | 743 | 1 / 16 / 102 | 19432 | 0 | 239400 |
| XLU | 1045 | 0 | 550 | 1 / 8 / 91 | 13087 | 0 | 235800 |
| XLY | 1045 | 0 | 907 | 1 / 18 / 104 | 21091 | 0 | 63000 |
| XOP | 1045 | 0 | 1045 | 9 / 60 / 276 | 69872 | 0 | 239400 |
| XRT | 1045 | 0 | 981 | 1 / 32 / 181 | 36777 | 0 | 322200 |

## Controls (the same set on every ETF)

| Origin | ID | Source symbol | Post-2023 inspected |
|---|---:|---:|---:|
| D1 shipped constants (VGT primary) | `d1-ebc9f639b3` | VGT | yes |
| XBI eight-ETF primary | `d1-1899af7fc2` | XBI | yes |
| XBI eight-ETF alternate-lowDd | `d1-0aabdaab89` | XBI | yes |
| IWM eight-ETF primary | `d1-00ba45a827` | IWM | yes |
| IWM eight-ETF alternate-lowDd | `d1-fe526c994c` | IWM | yes |
| XRT eight-ETF primary | `d1-1ef686e749` | XRT | yes |
| XRT eight-ETF alternate-lowDd | `d1-15c387627c` | XRT | yes |
| KRE eight-ETF primary | `d1-1956f5b4ca` | KRE | yes |
| KRE eight-ETF alternate-lowDd | `d1-a389037400` | KRE | yes |
| XLY eight-ETF primary | `d1-4190574172` | XLY | yes |
| XLY eight-ETF alternate-lowDd | `d1-a83284695c` | XLY | yes |
| IWN eight-ETF primary | `d1-32701b9d19` | IWN | yes |
| IWN eight-ETF alternate-lowDd | `d1-08f3867d64` | IWN | yes |
| XLF eight-ETF primary | `d1-901123307b` | XLF | yes |
| XLF eight-ETF alternate-lowDd | `d1-ce32ec913a` | XLF | yes |
| XLE eight-ETF primary | `d1-008ac96b01` | XLE | yes |
| XLE eight-ETF alternate-lowDd | `d1-034134b5a9` | XLE | yes |
| GDX previous-study Track P (P-add-GDX) | `d1-51ea8d4bd6` | GDX | yes |
| GDX previous-study Track S (S-add-GDX) | `d1-68ebf55a55` | GDX | yes |
| XOP previous-study Track P (P-add-XOP) | `d1-890902e16e` | XOP | yes |
| XOP previous-study Track S (S-add-XOP) | `d1-ede1165b0d` | XOP | yes |
