# Search C19 (training door D19; 2026-11-07T14:53:26.545Z → 2026-11-07T15:27:02.914Z)

- Evaluations: 364,211 fresh, 2,694 archive hits, 0 failed; 364,211 distinct configurations in the job archive; 19,474 fits. Peak job memory 6.17 GiB.

| cell | screen / seeds | rung-1 centres | islands | saturation | rung 2 | rung 3 | refinement | shortlist | fresh | hits |
|---|---|---|---|---|---|---|---|---|---|---|
| C19/global/rise | 4096 → 4096 distinct, 1597 plausible, 640 promoted; 2312 ledgers | 8320 (6523 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: not saturated; 3: saturated | 64 | 19 | moved, moved, moved | 5 | 159,307 | 1,161 |
| C19/global/breakout | 4096 → 4096 distinct, 2758 plausible, 640 promoted; 3842 ledgers | 5760 (5403 feasible) | 20 gen / 2560 new (budget); 20 gen / 2560 new (budget) | 2: saturated | 64 | 19 | moved, moved, moved | 5 | 116,450 | 1,083 |
| C19/informed/rise | 6 seeds, 986 local designs | 2266 (1903 feasible) | 20 gen / 1280 new (budget) | — | 24 | 8 | stay, stay | 4 | 45,065 | 129 |
| C19/informed/breakout | 6 seeds, 824 local designs | 2104 (1871 feasible) | 20 gen / 1280 new (budget) | — | 24 | 10 | moved, moved | 4 | 43,389 | 321 |

## Shortlists

| cell | pick | id | switches | centre net | centre DD | r3 median | r3 p10 | r3 p90 | r3 ledgers |
|---|---|---|---|---|---|---|---|---|---|
| C19/global/rise | top | f9593d0302262402 | hold off, gate off, stop off, retain on, trend off, elig maximum_extension, cont classic_d1 | $92,547.52 | $27,951.09 | $89,972.45 | $80,002.79 | $28,296.06 | 102 |
| C19/global/rise | gate-alternative | 2a4536db77895eba | hold off, gate on, stop off, retain on, trend off, elig time_limited, cont breakout | $17,370.24 | $5,221.91 | $17,457.77 | $12,787.38 | $5,701.49 | 105 |
| C19/global/rise | profit | e3b30d0c3e59d50f | hold off, gate off, stop off, retain on, trend off, elig minimum_strength, cont classic_d1 | $94,475.16 | $18,505.86 | $71,740.25 | $55,119.35 | $26,115.16 | 109 |
| C19/global/rise | low-drawdown | e5d03a9124abb3e3 | hold off, gate off, stop off, retain on, trend off, elig minimum_strength, cont classic_d1 | $58,120.02 | $10,059.57 | $56,404.10 | $33,484.28 | $12,318.85 | 110 |
| C19/global/rise | banded | 1bb3bb4bf78b2466 | hold off, gate off, stop off, retain on, trend off, elig maximum_extension, cont classic_d1 | $93,283.93 | $27,951.09 | $90,352.17 | $80,049.86 | $28,311.05 | 102 |
| C19/global/breakout | top | e6bd6602562b2d6a | hold off, gate off, stop on, retain on, trend off, cont classic_d1 | $90,528.99 | $19,058.72 | $84,799.57 | $79,978.58 | $19,599.43 | 87 |
| C19/global/breakout | hold-alternative | 5d979fcaa40735da | hold on (buffer on), gate off, stop on, retain on, trend off, cont classic_d1 | $81,795.17 | $18,276.60 | $80,670.05 | $77,037.80 | $18,587.82 | 65 |
| C19/global/breakout | gate-alternative | 939fb85dad069eb1 | hold on (buffer off), gate on, stop off, retain on, trend off, cont ma_cross | $30,013.47 | $6,663.44 | $25,611.81 | $11,802.23 | $8,228.61 | 31 |
| C19/global/breakout | profit | 4f97353ba26772ef | hold off, gate off, stop on, retain on, trend off, cont classic_d1 | $90,264.81 | $19,561.63 | $87,984.32 | $83,968.43 | $21,342.50 | 77 |
| C19/global/breakout | low-drawdown | c9e4ebdbaee1b48e | hold on (buffer on), gate off, stop off, retain on, trend off, cont classic_d1 | $68,394.01 | $13,168.09 | $66,086.17 | $33,875.39 | $14,503.77 | 58 |
| C19/informed/rise | top | 6b4b904d4cdb19dc | hold off, gate on, stop off, retain on, trend off, elig minimum_strength, cont shallow_pullback | $69,756.44 | $26,569.11 | $68,509.48 | $64,476.04 | $28,209.53 | 119 |
| C19/informed/rise | hold-alternative | 84767a8a5e80e9ff | hold on (buffer on), gate off, stop on, retain on, trend off, elig off, cont shallow_pullback | $78,776.41 | $31,837.95 | $76,734.33 | $54,980.35 | $33,781.53 | 120 |
| C19/informed/rise | gate-alternative | f22da065b54e1d94 | hold on (buffer on), gate off, stop on, retain on, trend off, elig time_limited, cont shallow_pullback | $72,302.64 | $15,341.40 | $63,338.04 | $51,581.96 | $29,065.23 | 114 |
| C19/informed/rise | profit | 9688409d1d86558e | hold off, gate on, stop off, retain on, trend off, elig time_limited, cont breakout | $71,082.32 | $27,699.33 | $69,801.34 | $62,678.10 | $33,578.22 | 111 |
| C19/informed/breakout | top | 61807ebd83f9673f | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $85,931.96 | $17,943.76 | $78,312.76 | $72,845.46 | $18,469.38 | 98 |
| C19/informed/breakout | profit | 3c8f056e0b745b9c | hold off, gate off, stop on, retain on, trend off, cont classic_d1 | $84,970.38 | $16,917.56 | $71,900.83 | $45,950.13 | $17,759.90 | 101 |
| C19/informed/breakout | low-drawdown | ccc0ac49bd480452 | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $61,182.37 | $10,402.28 | $55,450.23 | $26,865.78 | $14,497.92 | 116 |
| C19/informed/breakout | banded | a3b0e354f61dbd33 | hold off, gate off, stop off, retain on, trend off, cont classic_d1 | $82,582.32 | $17,770.79 | $76,138.17 | $67,138.58 | $18,064.41 | 103 |

## Profitable centres that failed feasibility (visible)

| cell | id | centre net | centre DD | p90 | p10 | failed |
|---|---|---|---|---|---|---|
| C19/global/rise | fc573c97a5bd5162 | $26,296.76 | $6,138.47 | $7,519.05 | $0.00 | p10 |

