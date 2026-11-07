# Search C24 (training door D24; 2026-11-07T17:24:59.422Z → 2026-11-07T18:23:25.575Z)

- Evaluations: 322,475 fresh, 2,698 archive hits, 0 failed; 322,475 distinct configurations in the job archive; 16,970 fits. Peak job memory 9.58 GiB.

| cell | screen / seeds | rung-1 centres | islands | saturation | rung 2 | rung 3 | refinement | shortlist | fresh | hits |
|---|---|---|---|---|---|---|---|---|---|---|
| C24/global/rise | 4096 → 4096 distinct, 1120 plausible, 640 promoted; 2938 ledgers | 5760 (2923 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: saturated | 64 | 19 | moved, moved, moved | 5 | 118,646 | 1,228 |
| C24/global/breakout | 4096 → 4096 distinct, 1371 plausible, 640 promoted; 4032 ledgers | 5760 (4373 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: saturated | 64 | 19 | moved, moved, moved | 5 | 115,497 | 1,091 |
| C24/informed/rise | 6 seeds, 986 local designs | 2266 (1597 feasible) | 20 gen / 1280 new (budget) | — | 24 | 9 | moved, stay | 4 | 46,471 | 203 |
| C24/informed/breakout | 6 seeds, 824 local designs | 2104 (1455 feasible) | 20 gen / 1280 new (budget) | — | 24 | 9 | moved, stay | 4 | 41,861 | 176 |

## Shortlists

| cell | pick | id | switches | centre net | centre DD | r3 median | r3 p10 | r3 p90 | r3 ledgers |
|---|---|---|---|---|---|---|---|---|---|
| C24/global/rise | top | 6aeb2e0f3918e574 | hold off, gate off, stop off, retain on, trend regression_slope, elig deterioration, cont breakout | $128,798.47 | $25,300.39 | $129,755.10 | $117,053.72 | $32,078.80 | 128 |
| C24/global/rise | hold-alternative | bab232860ac1b135 | hold on (buffer off), gate on, stop on, retain on, trend off, elig time_limited, cont ma_cross | $118,977.95 | $29,770.11 | $106,595.98 | $88,701.09 | $34,537.99 | 128 |
| C24/global/rise | gate-alternative | 08500a60ec56cfae | hold off, gate on, stop on, retain on, trend price_change, elig reset_renew, cont ma_cross | $115,509.15 | $19,344.80 | $101,373.75 | $66,033.66 | $24,916.76 | 128 |
| C24/global/rise | profit | e90d905f88689416 | hold on (buffer off), gate on, stop off, retain on, trend off, elig reset_renew, cont ma_cross | $120,637.99 | $20,164.60 | $94,793.24 | $43,904.85 | $29,292.76 | 128 |
| C24/global/rise | low-drawdown | 52adbcb40dd64bb9 | hold off, gate off, stop on, retain on, trend regression_slope, elig off, cont breakout | $75,150.08 | $21,319.89 | $74,112.04 | $71,405.15 | $22,221.05 | 3 |
| C24/global/breakout | top | 22d35c826fc0dc86 | hold on (buffer off), gate off, stop off, retain on, trend off, cont classic_d1 | $142,906.51 | $30,562.03 | $136,306.18 | $119,880.16 | $33,805.81 | 128 |
| C24/global/breakout | hold-alternative | d7306d1d4a485195 | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $136,521.03 | $29,558.80 | $123,508.86 | $104,014.98 | $31,125.82 | 128 |
| C24/global/breakout | gate-alternative | b191fe391fb172cf | hold off, gate on, stop off, retain on, trend off, cont shallow_pullback | $111,123.75 | $27,219.33 | $106,904.20 | $96,739.44 | $27,219.33 | 114 |
| C24/global/breakout | profit | 4813738e2478d47c | hold on (buffer off), gate off, stop off, retain on, trend off, cont classic_d1 | $146,608.92 | $30,590.32 | $127,784.88 | $117,459.33 | $34,139.24 | 128 |
| C24/global/breakout | low-drawdown | e4c6ba0ebc292053 | hold off, gate on, stop off, retain on, trend off, cont classic_d1 | $67,529.21 | $12,876.21 | $74,306.47 | $65,534.86 | $16,815.38 | 118 |
| C24/informed/rise | top | c4bfe70698b3b3f3 | hold off, gate off, stop off, retain on, trend off, elig time_limited, cont shallow_pullback | $113,170.35 | $31,404.29 | $102,852.88 | $90,643.26 | $34,621.04 | 74 |
| C24/informed/rise | hold-alternative | b19e72739b4d3399 | hold on (buffer on), gate on, stop on, retain off, trend price_change, elig time_limited, cont shallow_pullback | $66,308.43 | $11,567.79 | $37,374.34 | $7,023.16 | $17,635.74 | 127 |
| C24/informed/rise | gate-alternative | 0c65ec4758582177 | hold on (buffer on), gate on, stop on, retain on, trend price_change, elig maximum_extension, cont breakout | $18,871.24 | $4,604.01 | $18,470.93 | $4,059.33 | $9,707.37 | 119 |
| C24/informed/rise | profit | b61eea2a663caac5 | hold off, gate off, stop off, retain on, trend rising_sma, elig maximum_extension, cont shallow_pullback | $104,613.63 | $20,314.54 | $81,840.19 | $48,107.29 | $28,524.73 | 127 |
| C24/informed/breakout | top | fe457021bef9164d | hold off, gate off, stop on, retain off, trend off, cont classic_d1 | $170,866.20 | $23,458.02 | $139,371.85 | $103,061.65 | $29,760.53 | 128 |
| C24/informed/breakout | profit | c7f676b4957cc4c5 | hold off, gate off, stop on, retain off, trend off, cont classic_d1 | $184,212.29 | $22,822.33 | $127,604.46 | $92,694.87 | $30,863.95 | 128 |
| C24/informed/breakout | low-drawdown | e8d5495f771ada30 | hold off, gate off, stop on, retain on, trend off, cont breakout | $91,392.27 | $17,306.63 | $87,037.99 | $73,072.28 | $21,412.70 | 128 |
| C24/informed/breakout | banded | 1294ed4e8ef0a12e | hold off, gate off, stop on, retain off, trend off, cont classic_d1 | $173,908.10 | $23,180.65 | $137,982.58 | $98,482.37 | $32,407.04 | 128 |

## Profitable centres that failed feasibility (visible)

| cell | id | centre net | centre DD | p90 | p10 | failed |
|---|---|---|---|---|---|---|
| C24/informed/rise | 5ae4cfcbe7f3d86a | $120,866.74 | $31,843.91 | $35,285.93 | $106,266.91 | p90 |

