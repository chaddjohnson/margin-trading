# Signal overlap, collisions, independent episodes and denials

## Virtual (standalone) trades, funded trades and independent episodes

| Configuration | Virtual trades | Funded | Σ standalone nets per $100k (HYPOTHETICAL: never simultaneously executable) | Funded trades' nets per $100k notional (split lots borrowed $50,000: the pool earned about half) | Episodes | Episodes with ≥ 2 symbols | Trades with distinct timing (their net) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| all-primary/shadow | 146 | 74 | $745,710 | $249,580 | 48 | 12 | 36 ($71,347) |
| all-primary/split | 146 | 97 | $745,710 | $462,403 | 48 | 12 | 36 ($71,347) |
| all-lowDd/shadow | 145 | 75 | $623,683 | $294,676 | 52 | 14 | 38 ($106,722) |
| all-lowDd/split | 145 | 125 | $623,683 | $462,744 | 52 | 14 | 38 ($106,722) |

## Virtual trades by market episode (entry date in a named window)

| Configuration | 2018 Q4 sell-off | 2020 COVID crash and rebound | 2022 bear market | 2023 regional-bank stress | 2025 tariff shock |
| --- | ---: | ---: | ---: | ---: | ---: |
| all-primary/shadow | 5 ($60,051) | 43 ($257,598) | 39 ($72,633) | 15 ($11,747) | 8 ($130,880) |
| all-primary/split | 5 ($60,051) | 43 ($257,598) | 39 ($72,633) | 15 ($11,747) | 8 ($130,880) |
| all-lowDd/shadow | 3 ($43,572) | 49 ($188,073) | 34 ($80,374) | 17 ($9,746) | 7 ($82,505) |
| all-lowDd/split | 3 ($43,572) | 49 ($188,073) | 34 ($80,374) | 17 ($9,746) | 7 ($82,505) |

## Pairwise overlap of virtual holdings

| Configuration | Pair | Trades | Overlapping pairs | Trades overlapping (a / b) | Overlap days | Share of held time concurrent (a / b) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| all-primary/shadow | VGT–XBI | 20 / 25 | 22 | 15 / 16 | 665 | 60.1% / 77.5% |
| all-primary/shadow | VGT–XRT | 20 / 26 | 21 | 15 / 17 | 550 | 49.7% / 77.7% |
| all-primary/shadow | VGT–KRE | 20 / 75 | 41 | 11 / 39 | 287 | 26.0% / 50.8% |
| all-primary/shadow | XBI–XRT | 25 / 26 | 27 | 16 / 21 | 438 | 51.0% / 61.9% |
| all-primary/shadow | XBI–KRE | 25 / 75 | 41 | 10 / 40 | 284 | 33.0% / 50.1% |
| all-primary/shadow | XRT–KRE | 26 / 75 | 35 | 12 / 34 | 153 | 21.7% / 27.1% |
| all-lowDd/shadow | VGT–XBI | 20 / 29 | 20 | 7 / 20 | 115 | 10.4% / 64.3% |
| all-lowDd/shadow | VGT–XRT | 20 / 19 | 18 | 13 / 13 | 568 | 51.3% / 78.6% |
| all-lowDd/shadow | VGT–KRE | 20 / 77 | 39 | 10 / 38 | 242 | 21.8% / 47.9% |
| all-lowDd/shadow | XBI–XRT | 29 / 19 | 18 | 18 / 10 | 70 | 39.0% / 9.7% |
| all-lowDd/shadow | XBI–KRE | 29 / 77 | 19 | 13 / 18 | 71 | 39.7% / 14.1% |
| all-lowDd/shadow | XRT–KRE | 19 / 77 | 36 | 11 / 36 | 161 | 22.2% / 31.9% |

## How many books hold a virtual position at each close (eligible sessions)

| Configuration | 0 | 1 | 2 | 3 | 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| all-primary/shadow | 979 | 452 | 291 | 299 | 73 |
| all-lowDd/shadow | 1059 | 487 | 423 | 113 | 12 |

## Who was refused while whom held the pool (shadow policy; refused trades are HYPOTHETICAL)

| Configuration | Refused symbol | Pool held by | Refusals | Hypothetical net per $100k | Hypothetical winners |
| --- | ---: | ---: | ---: | ---: | ---: |
| all-primary/shadow | VGT | XBI | 4 | +$83,035 | 4 |
| all-primary/shadow | KRE | XBI | 26 | +$91,187 | 17 |
| all-primary/shadow | KRE | VGT | 8 | +$45,517 | 7 |
| all-primary/shadow | VGT | KRE | 1 | −$3,447 | 0 |
| all-primary/shadow | XRT | KRE | 2 | −$11,390 | 1 |
| all-primary/shadow | XBI | KRE | 3 | +$41,953 | 1 |
| all-primary/shadow | XRT | XBI | 6 | +$51,264 | 4 |
| all-primary/shadow | KRE | XRT | 2 | +$9,052 | 1 |
| all-primary/shadow | XRT | VGT | 6 | +$80,190 | 3 |
| all-primary/shadow | VGT | XRT | 4 | +$21,899 | 4 |
| all-primary/shadow | XBI | XRT | 6 | +$3,062 | 1 |
| all-primary/shadow | XBI | VGT | 4 | +$83,809 | 3 |
| all-primary/split | KRE | VGT | 5 | +$36,065 | 5 |
| all-primary/split | XRT | KRE | 1 | −$15,167 | 0 |
| all-primary/split | XBI | KRE | 2 | +$4,884 | 1 |
| all-primary/split | KRE | XBI | 27 | +$106,840 | 17 |
| all-primary/split | XRT | XBI | 7 | +$120,529 | 5 |
| all-primary/split | XRT | VGT | 3 | +$19,704 | 2 |
| all-primary/split | XBI | VGT | 3 | −$616 | 0 |
| all-primary/split | VGT | XBI | 1 | +$11,068 | 1 |
| all-lowDd/shadow | KRE | VGT | 34 | +$105,710 | 21 |
| all-lowDd/shadow | VGT | KRE | 1 | −$3,447 | 0 |
| all-lowDd/shadow | XRT | KRE | 2 | −$8,647 | 0 |
| all-lowDd/shadow | XBI | KRE | 2 | +$14,521 | 2 |
| all-lowDd/shadow | XBI | VGT | 10 | +$61,855 | 8 |
| all-lowDd/shadow | XRT | VGT | 8 | +$142,085 | 7 |
| all-lowDd/shadow | KRE | XRT | 1 | +$575 | 1 |
| all-lowDd/shadow | XRT | XBI | 4 | −$1,310 | 1 |
| all-lowDd/shadow | KRE | XBI | 3 | +$1,531 | 2 |
| all-lowDd/shadow | VGT | XBI | 3 | +$8,722 | 2 |
| all-lowDd/shadow | VGT | XRT | 2 | +$7,412 | 2 |
| all-lowDd/split | XRT | KRE | 1 | −$8,060 | 0 |
| all-lowDd/split | XBI | VGT | 5 | +$28,148 | 5 |
| all-lowDd/split | KRE | VGT | 4 | +$2,776 | 2 |
| all-lowDd/split | XRT | VGT | 8 | +$133,843 | 7 |
| all-lowDd/split | KRE | XBI | 1 | +$2,830 | 1 |
| all-lowDd/split | KRE | XRT | 1 | +$1,403 | 1 |

## Daily return correlations, 2017-06-15 → 2025-10-13

|  | VOOG | VGT | XBI | XRT | KRE |
| --- | ---: | ---: | ---: | ---: | ---: |
| VOOG | 1.00 | 0.97 | 0.65 | 0.65 | 0.54 |
| VGT | 0.97 | 1.00 | 0.65 | 0.63 | 0.51 |
| XBI | 0.65 | 0.65 | 1.00 | 0.58 | 0.44 |
| XRT | 0.65 | 0.63 | 0.58 | 1.00 | 0.65 |
| KRE | 0.54 | 0.51 | 0.44 | 0.65 | 1.00 |

## Episodes of all-primary/shadow (connected components of overlapping virtual holdings)

| # | Start | End | Market window | Virtual trades | Symbols | Virtual net per $100k | Funded | Funded net per $100k |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 2018-12-20 | 2019-05-13 | 2018 Q4 sell-off | 5 | XBI×2 VGT×1 KRE×2 | $60,051 | 2 | $16,685 |
| 2 | 2019-08-05 | 2020-02-24 | other | 2 | VGT×1 KRE×1 | $15,423 | 1 | $17,713 |
| 3 | 2020-02-28 | 2020-03-06 | 2020 COVID crash and rebound | 1 | VGT×1 | $2,398 | 1 | $2,398 |
| 4 | 2020-03-09 | 2021-02-23 | 2020 COVID crash and rebound | 49 | KRE×34 VGT×4 XRT×8 XBI×3 | $363,454 | 11 | $58,161 |
| 5 | 2021-02-23 | 2021-02-26 | other | 1 | XRT×1 | $3,653 | 1 | $3,653 |
| 6 | 2021-02-26 | 2021-03-03 | other | 1 | XBI×1 | −$103 | 1 | −$103 |
| 7 | 2021-03-04 | 2021-07-19 | other | 8 | XRT×3 VGT×1 KRE×2 XBI×2 | $18,672 | 4 | $15,145 |
| 8 | 2021-07-20 | 2021-07-22 | other | 1 | KRE×1 | $575 | 1 | $575 |
| 9 | 2021-09-22 | 2021-10-06 | other | 1 | KRE×1 | $8,616 | 1 | $8,616 |
| 10 | 2021-12-21 | 2022-01-21 | other | 2 | KRE×1 XBI×1 | $6,441 | 1 | $11,911 |
| 11 | 2022-01-21 | 2022-02-18 | 2022 bear market | 4 | XRT×2 XBI×2 | $4,003 | 2 | $275 |
| 12 | 2022-02-22 | 2022-04-18 | 2022 bear market | 9 | XBI×3 XRT×2 KRE×3 VGT×1 | $12,632 | 4 | $3,698 |
| 13 | 2022-04-22 | 2022-04-25 | 2022 bear market | 1 | XBI×1 | −$2,753 | 1 | −$2,753 |
| 14 | 2022-04-26 | 2022-05-06 | 2022 bear market | 1 | VGT×1 | −$1,077 | 1 | −$1,077 |
| 15 | 2022-05-06 | 2022-05-09 | 2022 bear market | 1 | XBI×1 | −$4,353 | 1 | −$4,353 |
| 16 | 2022-05-10 | 2022-06-13 | 2022 bear market | 7 | XBI×5 VGT×1 XRT×1 | −$2,261 | 3 | −$3,761 |
| 17 | 2022-06-13 | 2022-08-26 | 2022 bear market | 8 | VGT×3 XBI×2 XRT×3 | $48,801 | 4 | $13,085 |
| 18 | 2022-08-29 | 2022-09-26 | 2022 bear market | 3 | XRT×1 XBI×1 VGT×1 | −$8,671 | 2 | −$8,620 |
| 19 | 2022-09-30 | 2022-12-15 | 2022 bear market | 3 | XRT×1 VGT×2 | $15,532 | 1 | $8,120 |
| 20 | 2022-12-23 | 2023-02-09 | 2022 bear market | 1 | XRT×1 | $16,251 | 1 | $16,251 |
| 21 | 2023-02-23 | 2023-03-06 | other | 1 | XRT×1 | −$1,613 | 1 | −$1,613 |
| 22 | 2023-03-13 | 2023-03-14 | 2023 regional-bank stress | 1 | KRE×1 | $5,995 | 1 | $5,995 |
| 23 | 2023-03-15 | 2023-03-17 | 2023 regional-bank stress | 1 | KRE×1 | $2,572 | 1 | $2,572 |
| 24 | 2023-03-21 | 2023-03-27 | 2023 regional-bank stress | 1 | KRE×1 | −$1,325 | 1 | −$1,325 |
| 25 | 2023-03-30 | 2023-04-04 | 2023 regional-bank stress | 1 | KRE×1 | −$3,157 | 1 | −$3,157 |
| 26 | 2023-04-06 | 2023-04-13 | 2023 regional-bank stress | 1 | KRE×1 | −$586 | 1 | −$586 |
| 27 | 2023-04-17 | 2023-04-20 | 2023 regional-bank stress | 1 | KRE×1 | $680 | 1 | $680 |
| 28 | 2023-04-26 | 2023-05-02 | 2023 regional-bank stress | 1 | KRE×1 | −$1,922 | 1 | −$1,922 |
| 29 | 2023-05-04 | 2023-05-09 | 2023 regional-bank stress | 1 | KRE×1 | $3,008 | 1 | $3,008 |
| 30 | 2023-05-15 | 2023-05-19 | 2023 regional-bank stress | 1 | KRE×1 | $5,420 | 1 | $5,420 |
| 31 | 2023-05-22 | 2023-05-24 | 2023 regional-bank stress | 1 | KRE×1 | $586 | 1 | $586 |
| 32 | 2023-05-26 | 2023-05-31 | 2023 regional-bank stress | 1 | KRE×1 | −$1,095 | 1 | −$1,095 |
| 33 | 2023-06-01 | 2023-06-05 | 2023 regional-bank stress | 1 | KRE×1 | $2,989 | 1 | $2,989 |
| 34 | 2023-06-06 | 2023-06-08 | 2023 regional-bank stress | 1 | KRE×1 | $3,419 | 1 | $3,419 |
| 35 | 2023-06-12 | 2023-06-20 | 2023 regional-bank stress | 1 | KRE×1 | −$4,586 | 1 | −$4,586 |
| 36 | 2023-06-26 | 2023-07-06 | 2023 regional-bank stress | 1 | KRE×1 | −$252 | 1 | −$252 |
| 37 | 2023-07-10 | 2023-07-14 | other | 1 | KRE×1 | $2,070 | 1 | $2,070 |
| 38 | 2023-07-17 | 2023-08-01 | other | 1 | KRE×1 | $8,654 | 1 | $8,654 |
| 39 | 2023-08-24 | 2023-09-06 | other | 1 | KRE×1 | $471 | 1 | $471 |
| 40 | 2023-09-11 | 2023-09-18 | other | 1 | KRE×1 | −$1,834 | 1 | −$1,834 |
| 41 | 2023-09-26 | 2023-10-02 | other | 1 | KRE×1 | −$800 | 1 | −$800 |
| 42 | 2023-10-05 | 2023-10-12 | other | 1 | KRE×1 | $1,129 | 1 | $1,129 |
| 43 | 2023-10-16 | 2023-10-18 | other | 1 | KRE×1 | $289 | 1 | $289 |
| 44 | 2023-10-26 | 2023-11-06 | other | 1 | KRE×1 | $9,994 | 1 | $9,994 |
| 45 | 2023-11-14 | 2023-11-22 | other | 1 | KRE×1 | $1,655 | 1 | $1,655 |
| 46 | 2023-11-29 | 2023-12-15 | other | 1 | KRE×1 | $17,228 | 1 | $17,228 |
| 47 | 2024-02-01 | 2024-02-06 | other | 1 | KRE×1 | −$850 | 1 | −$850 |
| 48 | 2025-04-04 | 2025-10-13 | 2025 tariff shock | 10 | VGT×3 KRE×4 XRT×2 XBI×1 | $140,286 | 3 | $45,821 |
