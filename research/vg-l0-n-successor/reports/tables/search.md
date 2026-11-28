# Search execution and stopping (sealed search records)

## By track and cutoff
| Cutoff · track | Lanes | Requested | Fresh | Archive hits | Job wall | Converged | Coverage-limited | Budget-bound | Precommitted label (§7.5) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 F broad | 384 | 7,626,495 | 7,577,096 | 45,855 | 1.09 h | 289 | 95 (24.7 %) | 0 (0.0 %) | within the 10 % tolerance |
| C19 F refine | 56 | 2,926,956 | 2,520,916 | 405,022 | 0.39 h | 54 | 2 (3.6 %) | 0 (0.0 %) | within the 10 % tolerance |
| C21 F broad | 256 | 5,381,057 | 5,348,802 | 30,029 | 0.91 h | 187 | 69 (27.0 %) | 0 (0.0 %) | within the 10 % tolerance |
| C21 F refine | 56 | 2,950,458 | 2,521,276 | 428,182 | 0.52 h | 48 | 8 (14.3 %) | 0 (0.0 %) | within the 10 % tolerance |
| C23 F broad | 256 | 4,167,999 | 4,133,724 | 31,630 | 0.96 h | 178 | 78 (30.5 %) | 0 (0.0 %) | within the 10 % tolerance |
| C23 F refine | 52 | 2,609,617 | 2,240,036 | 368,803 | 0.58 h | 47 | 5 (9.6 %) | 0 (0.0 %) | within the 10 % tolerance |
| C24 F broad | 256 | 4,068,460 | 4,034,200 | 31,649 | 1.09 h | 188 | 68 (26.6 %) | 0 (0.0 %) | within the 10 % tolerance |
| C24 N | 128 | 8,531,052 | 7,345,283 | 1,184,850 | 1.83 h | 100 | 28 (21.9 %) | 0 (0.0 %) | within the 10 % tolerance |
| C24 F refine | 52 | 2,768,027 | 2,350,222 | 416,882 | 0.63 h | 45 | 7 (13.5 %) | 0 (0.0 %) | within the 10 % tolerance |

## By job
| Cutoff | Part | Kind | Lanes | Requested | Fresh | Hits | Wall s | Req/s | Islands | Lanes beyond NL0 cap | Converged | Coverage-limited | Budget-bound | Guard |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | broad1 | broad | 128 | 2,439,510 | 2,423,302 | 15,075 | 1180 | 2068 | 2–7 (mean 4.17) | 2 | 98 | 30 | 0 | 0 |
| C19 | broad2 | broad | 128 | 2,610,601 | 2,593,932 | 15,443 | 1223 | 2134 | 2–7 (mean 4.68) | 5 | 92 | 36 | 0 | 0 |
| C19 | refine | refine | 56 | 2,926,956 | 2,520,916 | 405,022 | 1409 | 2077 | 4–8 (mean 5.07) | 0 | 54 | 2 | 0 | 0 |
| C19 | rx1 | broad | 64 | 1,302,597 | 1,294,234 | 7,743 | 768 | 1696 | 2–8 (mean 4.56) | 2 | 50 | 14 | 0 | 0 |
| C19 | rx2 | broad | 64 | 1,273,787 | 1,265,628 | 7,594 | 751 | 1697 | 2–8 (mean 4.44) | 3 | 49 | 15 | 0 | 0 |
| C21 | broad1 | broad | 128 | 2,602,465 | 2,586,429 | 14,946 | 1649 | 1578 | 2–8 (mean 4.55) | 5 | 102 | 26 | 0 | 0 |
| C21 | broad2 | broad | 128 | 2,778,592 | 2,762,373 | 15,083 | 1642 | 1692 | 2–7 (mean 5.13) | 9 | 85 | 43 | 0 | 0 |
| C21 | refine | refine | 56 | 2,950,458 | 2,521,276 | 428,182 | 1865 | 1582 | 4–9 (mean 5.29) | 1 | 48 | 8 | 0 | 0 |
| C23 | broad1 | broad | 128 | 2,126,616 | 2,109,441 | 15,802 | 1708 | 1245 | 2–7 (mean 4.78) | 9 | 94 | 34 | 0 | 0 |
| C23 | broad2 | broad | 128 | 2,041,383 | 2,024,283 | 15,828 | 1747 | 1168 | 2–8 (mean 5.09) | 12 | 84 | 44 | 0 | 0 |
| C23 | refine | refine | 52 | 2,609,617 | 2,240,036 | 368,803 | 2071 | 1260 | 4–8 (mean 5.37) | 0 | 47 | 5 | 0 | 0 |
| C24 | broad1 | broad | 128 | 2,072,587 | 2,055,622 | 15,702 | 1987 | 1043 | 2–9 (mean 4.84) | 15 | 92 | 36 | 0 | 0 |
| C24 | broad2 | broad | 128 | 1,995,873 | 1,978,578 | 15,947 | 1928 | 1035 | 2–8 (mean 4.95) | 21 | 96 | 32 | 0 | 0 |
| C24 | informed1 | informed | 64 | 4,104,985 | 3,595,211 | 509,548 | 3117 | 1317 | 4–8 (mean 6.36) | 0 | 55 | 9 | 0 | 0 |
| C24 | informed2 | informed | 64 | 4,426,067 | 3,750,072 | 675,302 | 3464 | 1278 | 4–9 (mean 6.75) | 1 | 45 | 19 | 0 | 0 |
| C24 | refine | refine | 52 | 2,768,027 | 2,350,222 | 416,882 | 2280 | 1214 | 4–8 (mean 5.77) | 0 | 45 | 7 | 0 | 0 |

## Broad lanes by decline gates ON
| Cutoff · gates | Lanes | Converged | Coverage-limited | Budget-bound | Mean islands |
|---|---:|---:|---:|---:|---:|
| C19 · 0 gate(s) | 96 | 96 | 0 | 0 | 3.03 |
| C19 · 1 gate(s) | 192 | 179 | 13 | 0 | 4.41 |
| C19 · 2 gate(s) | 96 | 14 | 82 | 0 | 5.96 |
| C21 · 0 gate(s) | 64 | 64 | 0 | 0 | 3.64 |
| C21 · 1 gate(s) | 128 | 112 | 16 | 0 | 4.83 |
| C21 · 2 gate(s) | 64 | 11 | 53 | 0 | 6.05 |
| C23 · 0 gate(s) | 64 | 64 | 0 | 0 | 3.91 |
| C23 · 1 gate(s) | 128 | 98 | 30 | 0 | 4.98 |
| C23 · 2 gate(s) | 64 | 16 | 48 | 0 | 5.88 |
| C24 · 0 gate(s) | 64 | 63 | 1 | 0 | 3.66 |
| C24 · 1 gate(s) | 128 | 104 | 24 | 0 | 4.91 |
| C24 · 2 gate(s) | 64 | 21 | 43 | 0 | 6.11 |

## Extension islands beyond NL0’s cap (gain of the lane state across the island)
| Cutoff | Part | Islands | Median HV gain | Max HV gain | Median best-net gain | Max best-net gain | Islands with > 5 % net gain |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | broad1 | 2 | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 |
| C19 | broad2 | 5 | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 |
| C19 | rx1 | 3 | 0.8 % | 4.7 % | 0.0 % | 4.0 % | 0 |
| C19 | rx2 | 4 | 0.3 % | 3.7 % | 0.0 % | 8.8 % | 1 |
| C21 | broad1 | 6 | 1.2 % | 16.1 % | 0.0 % | 0.0 % | 0 |
| C21 | broad2 | 9 | 0.0 % | 4.9 % | 0.0 % | 1.4 % | 0 |
| C21 | refine | 1 | 0.8 % | 0.8 % | 0.0 % | 0.0 % | 0 |
| C23 | broad1 | 9 | 0.4 % | 4.8 % | 0.0 % | 0.0 % | 0 |
| C23 | broad2 | 16 | 1.3 % | 29.5 % | 0.0 % | 13.1 % | 2 |
| C24 | broad1 | 21 | 0.0 % | 10.3 % | 0.0 % | 5.2 % | 1 |
| C24 | broad2 | 25 | 0.0 % | 9.4 % | 0.0 % | 4.4 % | 0 |
| C24 | informed2 | 1 | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 |
