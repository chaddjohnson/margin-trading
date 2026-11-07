# Search C21 (training door D21; 2026-11-07T15:29:56.736Z → 2026-11-07T16:14:04.272Z)

- Evaluations: 360,304 fresh, 2,887 archive hits, 0 failed; 360,304 distinct configurations in the job archive; 19,367 fits. Peak job memory 7.43 GiB.

| cell | screen / seeds | rung-1 centres | islands | saturation | rung 2 | rung 3 | refinement | shortlist | fresh | hits |
|---|---|---|---|---|---|---|---|---|---|---|
| C21/global/rise | 4096 → 4096 distinct, 1644 plausible, 640 promoted; 2680 ledgers | 8319 (5568 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: not saturated; 3: saturated | 64 | 18 | stay, moved, moved | 5 | 158,265 | 1,129 |
| C21/global/breakout | 4096 → 4096 distinct, 2162 plausible, 640 promoted; 4028 ledgers | 5760 (4980 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: saturated | 64 | 19 | moved, moved, moved | 5 | 114,036 | 1,385 |
| C21/informed/rise | 6 seeds, 986 local designs | 2263 (1892 feasible) | 20 gen / 1280 new (budget) | — | 24 | 10 | moved, moved | 4 | 47,671 | 123 |
| C21/informed/breakout | 6 seeds, 824 local designs | 2102 (1790 feasible) | 20 gen / 1280 new (budget) | — | 24 | 8 | stay, stay | 4 | 40,332 | 250 |

## Shortlists

| cell | pick | id | switches | centre net | centre DD | r3 median | r3 p10 | r3 p90 | r3 ledgers |
|---|---|---|---|---|---|---|---|---|---|
| C21/global/rise | top | 8d5718573b5d0733 | hold off, gate off, stop off, retain on, trend off, elig time_limited, cont shallow_pullback | $162,078.16 | $29,907.23 | $158,649.59 | $147,851.60 | $30,477.21 | 50 |
| C21/global/rise | hold-alternative | c1a95a82d568480b | hold on (buffer on), gate off, stop on, retain off, trend off, elig time_limited, cont classic_d1 | $31,799.19 | $7,635.04 | $17,560.04 | $1,353.69 | $9,730.44 | 98 |
| C21/global/rise | gate-alternative | c72827372439d3f9 | hold off, gate on, stop off, retain off, trend rising_sma, elig maximum_extension, cont classic_d1 | $33,605.94 | $8,119.69 | $38,857.45 | $29,762.61 | $12,851.52 | 128 |
| C21/global/rise | profit | 4a06652659a0ad50 | hold off, gate off, stop off, retain on, trend off, elig time_limited, cont breakout | $178,558.58 | $33,164.26 | $161,382.19 | $152,242.87 | $33,325.10 | 43 |
| C21/global/rise | low-drawdown | 90458057c71c7a19 | hold off, gate off, stop off, retain on, trend off, elig maximum_extension, cont classic_d1 | $96,707.55 | $17,731.90 | $129,520.05 | $75,286.94 | $21,108.15 | 124 |
| C21/global/breakout | top | 24da107fc8b9ba04 | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $189,484.91 | $28,997.90 | $187,471.96 | $176,549.03 | $30,777.14 | 76 |
| C21/global/breakout | gate-alternative | d2c022e988e01c6f | hold off, gate on, stop off, retain on, trend off, cont breakout | $93,640.97 | $14,453.13 | $86,821.09 | $74,582.34 | $17,908.03 | 50 |
| C21/global/breakout | profit | 3c00e2670bbe6d50 | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $152,452.94 | $20,839.30 | $148,852.29 | $117,027.31 | $22,118.89 | 104 |
| C21/global/breakout | low-drawdown | 04da752976d1001d | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $107,485.57 | $15,484.30 | $100,285.79 | $87,896.63 | $17,931.78 | 121 |
| C21/global/breakout | banded | d6cb3fbb8cbab02a | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $150,899.32 | $20,863.80 | $144,761.22 | $112,439.35 | $22,058.02 | 93 |
| C21/informed/rise | top | 3bd8dba188107826 | hold off, gate off, stop off, retain on, trend off, elig time_limited, cont breakout | $114,214.43 | $21,296.01 | $113,753.76 | $106,905.07 | $23,149.76 | 23 |
| C21/informed/rise | hold-alternative | cd9d79f7c30cf19a | hold on (buffer on), gate on, stop on, retain off, trend price_change, elig time_limited, cont shallow_pullback | $15,108.38 | $10,004.07 | $16,882.81 | $8,299.08 | $11,889.98 | 128 |
| C21/informed/rise | gate-alternative | 5dd01693ee3bcd41 | hold off, gate on, stop on, retain off, trend price_change, elig time_limited, cont shallow_pullback | $34,672.04 | $8,685.07 | $15,008.84 | $6,816.67 | $12,038.86 | 128 |
| C21/informed/rise | profit | d2d46b61204ddb5b | hold off, gate off, stop on, retain on, trend off, elig time_limited, cont breakout | $124,801.95 | $32,247.26 | $72,120.51 | $29,874.44 | $34,965.43 | 128 |
| C21/informed/breakout | top | def6c323c5d0cb84 | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $125,457.53 | $24,993.43 | $124,699.09 | $92,253.92 | $26,706.86 | 121 |
| C21/informed/breakout | profit | 2a50d77857f5e8e0 | hold off, gate off, stop on, retain off, trend off, cont classic_d1 | $151,276.62 | $22,387.59 | $116,436.36 | $83,039.55 | $26,703.97 | 127 |
| C21/informed/breakout | low-drawdown | 8b4c46495cb55c89 | hold off, gate off, stop off, retain off, trend rising_sma, cont breakout | $73,243.07 | $15,976.64 | $73,464.18 | $65,505.25 | $18,151.72 | 125 |
| C21/informed/breakout | banded | 6a76116dfd3556a2 | hold off, gate off, stop on, retain on, trend off, cont classic_d1 | $118,821.47 | $20,088.90 | $109,189.92 | $93,686.60 | $23,035.70 | 127 |

## Profitable centres that failed feasibility (visible)

| cell | id | centre net | centre DD | p90 | p10 | failed |
|---|---|---|---|---|---|---|

