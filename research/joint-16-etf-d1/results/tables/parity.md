# Parity tables

268 comparisons, 0 with any difference.

| Group | Comparisons | With differences | Books | Median full engine (ms) | Median trace + replay (ms) |
|---|---:|---:|---:|---:|---:|
| P0 B4 | 8 | 0 | 4 | 1557 | — |
| P0 B1 | 8 | 0 | 1 | 996 | — |
| P1 single book | 128 | 0 | 1 | 172 | 15 |
| P1 random 2-book subsets | 16 | 0 | 2 | 276 | 26 |
| P1 random 4-book subsets | 16 | 0 | 4 | 465 | 42 |
| P1 random 8-book subsets | 16 | 0 | 8 | 1011 | 88 |
| P1 random 12-book subsets | 16 | 0 | 12 | 1556 | 126 |
| P1 random 16-book subsets | 16 | 0 | 16 | 2135 | 160 |
| P1 B1 (frozen books) | 4 | 0 | 1 | 150 | 15 |
| P1 B4 (frozen books) | 4 | 0 | 4 | 480 | 46 |
| P1 B5 (frozen books) | 4 | 0 | 5 | 637 | 57 |
| P1 16 books, shortest stop (sobol:29) | 4 | 0 | 16 | 2131 | 158 |
| P1 16 books, widest stop (sobol:18) | 4 | 0 | 16 | 2135 | 156 |
| P1 16 books, longest hold (sobol:1) | 4 | 0 | 16 | 2149 | 162 |
| P1 16 books, longest continuation window (sobol:236) | 4 | 0 | 16 | 2127 | 156 |
| P1 16 books, shortest lookback (sobol:86) | 4 | 0 | 16 | 2141 | 163 |
| P1 16 books, longest lookback (sobol:81) | 4 | 0 | 16 | 2131 | 154 |
| P1 16 books, D1 constants on every ETF | 4 | 0 | 16 | 2176 | 167 |
| P2 16 books, D1 constants | 1 | 0 | 16 | 6788 | — |
| P2 VOOG alone, D1 constants | 1 | 0 | 1 | 1189 | — |
| P2 VOOG + VGT, D1 constants | 1 | 0 | 2 | 1408 | — |
| P2 B5 (search books) | 1 | 0 | 5 | 2616 | — |
