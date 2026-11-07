# Search C23 (training door D23; 2026-11-07T16:17:54.940Z → 2026-11-07T17:20:10.505Z)

- Evaluations: 369,005 fresh, 3,349 archive hits, 0 failed; 369,005 distinct configurations in the job archive; 19,618 fits. Peak job memory 8.99 GiB.

| cell | screen / seeds | rung-1 centres | islands | saturation | rung 2 | rung 3 | refinement | shortlist | fresh | hits |
|---|---|---|---|---|---|---|---|---|---|---|
| C23/global/rise | 4096 → 4096 distinct, 1189 plausible, 640 promoted; 2908 ledgers | 8320 (4404 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: not saturated; 3: saturated | 64 | 19 | moved, moved, moved | 5 | 160,509 | 1,246 |
| C23/global/breakout | 4096 → 4096 distinct, 1813 plausible, 640 promoted; 4041 ledgers | 5760 (4536 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: saturated | 64 | 19 | moved, moved, moved | 5 | 117,051 | 1,263 |
| C23/informed/rise | 6 seeds, 986 local designs | 2263 (1622 feasible) | 20 gen / 1280 new (budget) | — | 24 | 10 | moved, moved | 4 | 48,549 | 391 |
| C23/informed/breakout | 6 seeds, 824 local designs | 2103 (1451 feasible) | 20 gen / 1280 new (budget) | — | 24 | 10 | moved, moved | 4 | 42,896 | 449 |

## Shortlists

| cell | pick | id | switches | centre net | centre DD | r3 median | r3 p10 | r3 p90 | r3 ledgers |
|---|---|---|---|---|---|---|---|---|---|
| C23/global/rise | top | da5a7527c44ef5b6 | hold off, gate off, stop off, retain on, trend regression_slope, elig time_limited, cont ma_cross | $86,320.70 | $23,989.94 | $85,866.50 | $81,132.42 | $24,890.04 | 4 |
| C23/global/rise | hold-alternative | 029d1a7a9d52a58b | hold on (buffer on), gate off, stop on, retain on, trend rising_sma, elig time_limited, cont ma_cross | $125,154.56 | $23,474.58 | $75,731.16 | $32,503.85 | $33,013.08 | 128 |
| C23/global/rise | gate-alternative | 24dd566bab2c8003 | hold off, gate on, stop off, retain on, trend off, elig minimum_strength, cont off | $95,643.75 | $16,639.28 | $88,630.73 | $79,504.65 | $29,265.09 | 126 |
| C23/global/rise | profit | c2f306f33d90f5ac | hold off, gate on, stop off, retain on, trend off, elig reset_renew, cont classic_d1 | $107,577.89 | $22,828.48 | $87,505.98 | $55,092.80 | $32,628.67 | 126 |
| C23/global/rise | low-drawdown | 5735e09f55caa463 | hold off, gate off, stop off, retain on, trend regression_slope, elig time_limited, cont breakout | $90,624.35 | $24,205.75 | $89,413.35 | $85,083.82 | $25,432.72 | 10 |
| C23/global/breakout | top | 48c7c0e9cd500dfd | hold off, gate off, stop on, retain on, trend off, cont classic_d1 | $117,610.12 | $19,973.12 | $113,738.81 | $98,159.61 | $26,288.02 | 127 |
| C23/global/breakout | hold-alternative | 2353f0a7adab72f0 | hold on (buffer off), gate off, stop on, retain on, trend off, cont classic_d1 | $121,286.91 | $19,973.12 | $108,181.08 | $31,265.16 | $32,224.57 | 127 |
| C23/global/breakout | gate-alternative | 0b03622041d362a7 | hold off, gate on, stop off, retain on, trend regression_slope, cont classic_d1 | $109,211.78 | $27,862.25 | $106,108.38 | $95,969.94 | $28,924.40 | 119 |
| C23/global/breakout | profit | 935c3b4d2e2536a8 | hold off, gate off, stop on, retain on, trend off, cont classic_d1 | $120,750.86 | $19,973.12 | $108,892.16 | $90,556.89 | $27,965.97 | 126 |
| C23/global/breakout | low-drawdown | 2553bf32d0009a31 | hold off, gate on, stop off, retain on, trend off, cont classic_d1 | $65,668.82 | $13,864.91 | $66,147.94 | $59,687.97 | $15,820.19 | 108 |
| C23/informed/rise | top | 3886d486e9c64f98 | hold off, gate off, stop on, retain on, trend off, elig off, cont shallow_pullback | $112,761.94 | $29,148.94 | $111,416.00 | $103,055.61 | $30,136.45 | 128 |
| C23/informed/rise | hold-alternative | 1b2b7d0254c63b4d | hold on (buffer on), gate on, stop on, retain off, trend off, elig off, cont shallow_pullback | $67,391.00 | $15,288.04 | $41,331.12 | $19,270.13 | $19,760.01 | 128 |
| C23/informed/rise | profit | 2300f49449a58621 | hold off, gate off, stop on, retain on, trend off, elig time_limited, cont shallow_pullback | $117,912.66 | $29,404.45 | $111,457.26 | $98,789.40 | $31,879.82 | 127 |
| C23/informed/rise | low-drawdown | 57ae48d1fb6f5f2e | hold off, gate off, stop on, retain on, trend rising_sma, elig minimum_strength, cont breakout | $77,007.98 | $18,716.79 | $68,045.97 | $52,821.11 | $25,670.49 | 128 |
| C23/informed/breakout | top | 9fb4b0da95f0f712 | hold off, gate off, stop on, retain off, trend off, cont classic_d1 | $142,530.92 | $23,807.00 | $126,415.61 | $91,191.66 | $30,434.03 | 128 |
| C23/informed/breakout | gate-alternative | 8ddec5059d91b47a | hold off, gate on, stop off, retain on, trend off, cont ma_cross | $86,272.88 | $15,909.56 | $88,926.98 | $77,904.81 | $22,391.99 | 113 |
| C23/informed/breakout | profit | eae51138d2f24aa9 | hold off, gate off, stop on, retain off, trend off, cont classic_d1 | $160,339.74 | $22,822.33 | $118,581.61 | $76,562.50 | $31,257.05 | 128 |
| C23/informed/breakout | low-drawdown | c68a72eb254007a6 | hold off, gate on, stop off, retain on, trend off, cont ma_cross | $78,003.65 | $15,606.36 | $81,267.54 | $72,118.36 | $17,432.09 | 115 |

## Profitable centres that failed feasibility (visible)

| cell | id | centre net | centre DD | p90 | p10 | failed |
|---|---|---|---|---|---|---|
| C23/global/rise | 05cf7cb899e52907 | $118,162.62 | $27,761.91 | $36,397.22 | $34,220.90 | p90 |
| C23/informed/rise | 1726d6e36e20e5dd | $28,819.02 | $7,051.94 | $11,678.40 | $0.00 | p10 |
| C23/informed/rise | 6be05713b56421a8 | $20,701.96 | $7,469.10 | $12,727.57 | $0.00 | p10 |
| C23/informed/breakout | 0391bf2ed01cc677 | $159,819.67 | $22,822.33 | $35,031.22 | $93,062.87 | p90 |
| C23/informed/breakout | e607bbfff477c87b | $148,400.24 | $24,731.25 | $35,050.62 | $94,599.38 | p90 |

