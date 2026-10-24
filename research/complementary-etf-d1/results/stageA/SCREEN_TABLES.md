# Stage A screen tables (generated 2026-10-24T11:47:21.851Z)

Window 2017-06-15 → 2023-12-31 (training partition). Baseline pool: F-all-lowDd-shadow@training, 71 funded lots, net $249,174, 66 refused virtual trades. Daily proxies, not D1 fills; returns are retrospective diagnostics.

## Episodes (74-session reference high)

| ETF | Priority | 10–15% | 15–20% | 20–30% | 30%+ | Episodes ≥ 15% | Years with one | Deepest | L = 230: episodes (≥ 15%) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| GDX | high | 2 | 5 | 2 | 4 | 11 | 7 | 49.2% | 11 (9) |
| XOP | high | 8 | 5 | 5 | 4 | 14 | 7 | 73.7% | 16 (12) |
| EWZ | high | 3 | 5 | 1 | 4 | 10 | 7 | 58.5% | 14 (10) |
| TLT | high | 1 | 0 | 3 | 1 | 4 | 3 | 40.8% | 8 (6) |
| XLE | lower | 11 | 2 | 3 | 2 | 7 | 6 | 63.4% | 15 (7) |
| XLU | lower | 4 | 2 | 2 | 1 | 5 | 4 | 38.9% | 10 (5) |
| GLD | lower | 2 | 1 | 1 | 0 | 2 | 2 | 22.1% | 8 (2) |

## Proxy p15 against the baseline pool (5 bps per side, 11% interest)

| ETF | Proxies (years) | Idle at entry | Clean | Blocks lots (VGT) | Blocked baseline net | Overlap VGT / XBI / XRT / KRE funded | Overlap refused virtual | Net all | Clean net | Clean net w/o best | Wins | Worst | Best share of gains |
|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| GDX | 38 (7) | 15 | 8 | 38 (5) | $112,520 | 18 / 6 / 4 / 10 | 19 | $25,674 | $6,578 | −$758 | 19/38 | −$18,632 | 24% |
| XOP | 47 (7) | 14 | 10 | 32 (6) | $154,285 | 24 / 3 / 4 / 10 | 24 | $12,228 | −$5,104 | −$14,163 | 22/47 | −$17,162 | 13% |
| EWZ | 35 (7) | 15 | 10 | 25 (5) | $138,634 | 14 / 4 / 5 / 8 | 17 | −$940 | −$19,257 | −$33,445 | 18/35 | −$24,732 | 16% |
| TLT | 10 (4) | 4 | 0 | 16 (5) | $84,850 | 4 / 4 / 2 / 3 | 9 | −$31,947 | $0 | $0 | 3/10 | −$11,822 | 44% |
| XLE | 27 (6) | 7 | 5 | 20 (5) | $82,202 | 14 / 2 / 2 / 8 | 16 | $29,718 | −$12,798 | −$19,209 | 10/27 | −$28,224 | 23% |
| XLU | 9 (4) | 1 | 1 | 7 (2) | $74,974 | 4 / 1 / 2 / 2 | 7 | $3,338 | $1,126 | $0 | 5/9 | −$11,537 | 61% |
| GLD | 1 (1) | 0 | 0 | 0 (0) | $0 | 1 / 0 / 0 / 0 | 1 | $33 | $0 | $0 | 1/1 | $33 | 100% |

## Sensitivities: proxy p20, and p15 on the 230-session reference high

| ETF | p20 proxies | p20 clean | p20 clean net (5 bps) | p15/L230 proxies | p15/L230 clean | p15/L230 clean net |
|---|---:|---:|---:|---:|---:|---:|
| GDX | 21 | 4 | $3,134 | 52 | 15 | −$29,332 |
| XOP | 37 | 8 | −$8,737 | 56 | 13 | −$11,532 |
| EWZ | 22 | 6 | −$12,889 | 46 | 12 | −$8,725 |
| TLT | 4 | 0 | $0 | 21 | 0 | $0 |
| XLE | 16 | 1 | −$1,519 | 39 | 9 | −$6,212 |
| XLU | 5 | 0 | $0 | 20 | 2 | $1,086 |
| GLD | 0 | 0 | $0 | 6 | 0 | $0 |

## Liquidity and correlations (training daily returns; secondary descriptors)

| ETF | Median daily $ volume | Median bars | Splits adjusted | ρ VOOG | ρ VGT | ρ XBI | ρ XRT | ρ KRE |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| GDX | $701M | 390 | none | 0.16 | 0.14 | 0.14 | 0.10 | -0.01 |
| XOP | $561M | 390 | 0.25:1 2020-03-30 | 0.47 | 0.44 | 0.40 | 0.49 | 0.61 |
| EWZ | $728M | 390 | none | 0.52 | 0.49 | 0.33 | 0.42 | 0.47 |
| TLT | $1257M | 390 | none | -0.16 | -0.15 | -0.10 | -0.16 | -0.34 |
| XLE | $1107M | 390 | none | 0.51 | 0.47 | 0.37 | 0.50 | 0.65 |
| XLU | $773M | 390 | none | 0.52 | 0.45 | 0.25 | 0.35 | 0.38 |
| GLD | $998M | 390 | none | 0.05 | 0.04 | 0.03 | -0.00 | -0.14 |

## Gates, rank scores and the composite

| ETF | Priority | Data | Liquidity | Breadth | Timing | Economics | T | B | E | Composite |
|---|---|---|---|---|---|---|---:|---:|---:|---:|
| XOP | high | pass | pass | pass | pass | **fail** | 0.83 | 1.00 | 0.33 | 0.733 |
| GDX | high | pass | pass | pass | pass | **fail** | 0.67 | 0.83 | 0.50 | 0.667 |
| EWZ | high | pass | pass | pass | pass | **fail** | 1.00 | 0.67 | 0.00 | 0.600 |
| XLU | lower | pass | pass | pass | **fail** | **fail** | 0.33 | 0.33 | 0.83 | 0.483 |
| XLE | lower | pass | pass | pass | pass | **fail** | 0.50 | 0.50 | 0.17 | 0.400 |
| TLT | high | pass | pass | pass | **fail** | **fail** | 0.08 | 0.17 | 0.83 | 0.333 |
| GLD | lower | pass | pass | **fail** | **fail** | **fail** | 0.08 | 0.00 | 0.83 | 0.283 |

## Candidate correlations (training daily returns)

| | GDX | XOP | EWZ | TLT | XLE | XLU | GLD |
|---|---:|---:|---:|---:|---:|---:|---:|
| GDX | 1.00 | 0.15 | 0.22 | 0.24 | 0.17 | 0.24 | 0.77 |
| XOP | 0.15 | 1.00 | 0.48 | -0.27 | 0.91 | 0.23 | 0.00 |
| EWZ | 0.22 | 0.48 | 1.00 | -0.14 | 0.54 | 0.37 | 0.12 |
| TLT | 0.24 | -0.27 | -0.14 | 1.00 | -0.27 | -0.01 | 0.33 |
| XLE | 0.17 | 0.91 | 0.54 | -0.27 | 1.00 | 0.36 | 0.04 |
| XLU | 0.24 | 0.23 | 0.37 | -0.01 | 0.36 | 1.00 | 0.18 |
| GLD | 0.77 | 0.00 | 0.12 | 0.33 | 0.04 | 0.18 | 1.00 |

## Selection

Selected: **none**

- GDX not selected: fails economics
- XOP not selected: fails economics
- EWZ not selected: fails economics
- TLT not selected: fails timing, economics
- XLE not selected: fails economics
- XLU not selected: fails timing, economics
- GLD not selected: fails breadth, timing, economics
