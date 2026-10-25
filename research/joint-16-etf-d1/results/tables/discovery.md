# Discovery tables

26597 unique evaluations in 289 s; 1301 cache hits; 23465 behaviourally distinct; 16050 feasible.

## Greedy paths

| Start | Accepted steps | Evaluations | Final books | Path (additions) | Final net | Final minute DD | Stopped by |
|---|---:|---:|---:|---:|---:|---:|---:|
| EWZ | 5 | 233 | 6 | EWZ → VGT → VOOG → GDX → XLU → XLF | $122,515 | $33,470 | no qualifying addition |
| GDX | 1 | 95 | 2 | GDX → XLY | $56,928 | $16,853 | no qualifying addition |
| GLD | 2 | 134 | 3 | GLD → XLF → XRT | $73,365 | $21,170 | no qualifying addition |
| IWM | 1 | 95 | 2 | IWM → XLY | $105,835 | $29,423 | no qualifying addition |
| IWN | 3 | 170 | 4 | IWN → GDX → VGT → TLT | $156,767 | $29,763 | no qualifying addition |
| KRE | 0 | 53 | 1 | KRE | $8,147 | $32,881 | no qualifying addition |
| TLT | 4 | 203 | 5 | TLT → XLY → KRE → XBI → VOOG | $164,568 | $29,636 | no qualifying addition |
| VGT | 2 | 134 | 3 | VGT → XLF → XLY | $132,310 | $28,808 | no qualifying addition |
| VOOG | 2 | 134 | 3 | VOOG → VGT → GDX | $96,416 | $29,675 | no qualifying addition |
| XBI | 4 | 203 | 5 | XBI → IWN → XLU → IWM → GDX | $99,786 | $30,534 | no qualifying addition |
| XLE | 0 | 53 | 1 | XLE | $35,161 | $67,236 | no qualifying addition |
| XLF | 6 | 260 | 7 | XLF → IWM → VGT → XLY → KRE → VOOG → GDX | $182,803 | $30,275 | no qualifying addition |
| XLU | 1 | 95 | 2 | XLU → VGT | $47,742 | $20,078 | no qualifying addition |
| XLY | 0 | 53 | 1 | XLY | $54,248 | $26,510 | no qualifying addition |
| XOP | 0 | 53 | 1 | XOP | $90,769 | $77,126 | no qualifying addition |
| XRT | 0 | 53 | 1 | XRT | $5,188 | $39,464 | no qualifying addition |

## Islands

| Island | Initial population | Generations | New evaluations | Stopped by | Final front size | Final cardinality min / median / max |
|---|---:|---:|---:|---:|---:|---:|
| I1 uniform cardinality 1–16 (a) | 64 (64 new) | 50 | 3072 | budget | 64 | 1 / 1 / 5 |
| I2 uniform cardinality 1–16 (b) | 64 (64 new) | 50 | 3072 | budget | 64 | 1 / 2 / 5 |
| I3 sparse 1–3 | 64 (64 new) | 51 | 3072 | budget | 64 | 1 / 2 / 5 |
| I4 medium 4–8 | 64 (64 new) | 50 | 3072 | budget | 64 | 1 / 1 / 4 |
| I5 broad 10–16 | 64 (64 new) | 50 | 3072 | budget | 64 | 1 / 2 / 9 |
| I6 singletons (16 ETFs × 4 vectors) | 64 (63 new) | 50 | 3072 | budget | 64 | 1 / 1 / 8 |
| I7 greedy-path seeded | 64 (17 new) | 50 | 3072 | budget | 64 | 1 / 2 / 6 |
| I8 benchmark seeded (B1, B4, B5 and one-move mutants; half uniform) | 64 (64 new) | 50 | 3072 | budget | 64 | 1 / 2 / 5 |

## Cardinality of every evaluated configuration

| Books | Evaluations | Feasible |
|---|---:|---:|
| 1 | 9598 | 7589 |
| 2 | 7501 | 4222 |
| 3 | 4163 | 2349 |
| 4 | 2156 | 1129 |
| 5 | 1108 | 465 |
| 6 | 643 | 190 |
| 7 | 293 | 52 |
| 8 | 182 | 29 |
| 9 | 122 | 17 |
| 10 | 144 | 6 |
| 11 | 153 | 2 |
| 12 | 141 | 0 |
| 13 | 153 | 0 |
| 14 | 113 | 0 |
| 15 | 65 | 0 |
| 16 | 62 | 0 |

## Operators (child evaluations by the operator that produced them)

| Stage:operator | Evaluations |
|---|---:|
| D:paramOne | 10349 |
| D:add | 5954 |
| D:reset | 2480 |
| D:swap | 2286 |
| D:paramMulti | 2111 |
| D:remove | 1413 |
| D:crossoverOnly | 1412 |
| D:init | 464 |
| D:start | 128 |

## Per-ETF exploration (discovery only)

| ETF | Appearances | Feasible | On the Pareto front | Distinct vectors | Library vectors | With a funded lot | Singletons | Shortlisted | Nominated |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| EWZ | 1759 | 116 | 0 | 669 | 463 | 1741 | 80 | 0 | 0 |
| GDX | 7150 | 3312 | 56 | 2513 | 557 | 6995 | 752 | 0 | 0 |
| GLD | 10230 | 7183 | 2669 | 5790 | 731 | 3483 | 3899 | 0 | 0 |
| IWM | 3134 | 976 | 2 | 1082 | 495 | 2702 | 194 | 0 | 0 |
| IWN | 2410 | 683 | 2 | 795 | 472 | 2005 | 108 | 0 | 0 |
| KRE | 4678 | 2161 | 72 | 1374 | 499 | 4584 | 401 | 0 | 0 |
| TLT | 5018 | 2775 | 292 | 2249 | 563 | 3026 | 1004 | 0 | 0 |
| VGT | 5126 | 2402 | 18 | 1781 | 493 | 4599 | 476 | 0 | 0 |
| VOOG | 4889 | 2313 | 11 | 1854 | 528 | 4304 | 627 | 0 | 0 |
| XBI | 4843 | 2244 | 61 | 1503 | 530 | 4791 | 369 | 0 | 0 |
| XLE | 2286 | 237 | 1 | 899 | 500 | 2182 | 88 | 0 | 0 |
| XLF | 5470 | 2801 | 33 | 2003 | 524 | 5043 | 527 | 0 | 0 |
| XLU | 3206 | 1388 | 17 | 1309 | 489 | 2363 | 378 | 0 | 0 |
| XLY | 4094 | 1645 | 12 | 1488 | 527 | 3777 | 454 | 0 | 0 |
| XOP | 1749 | 36 | 0 | 665 | 476 | 1746 | 80 | 0 | 0 |
| XRT | 4027 | 1620 | 27 | 1301 | 498 | 3817 | 161 | 0 | 0 |
