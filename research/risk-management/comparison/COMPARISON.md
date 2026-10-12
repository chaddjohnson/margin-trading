# Consolidated comparison — five risk-management approaches (initial screening)

Coordinator report. These are exploratory, in-sample backtests on data that had already been examined; none of
it is validation. Every configuration was fixed in `SPEC.md` before any experiment ran. Nothing was optimized,
combined or refined.

## How this was done, and what was verified

**Shared baseline** (`baseline/BASELINES.md`)
- The Python engine reproduces `allIn.ts` trade for trade on all four datasets, matching the reference
  values exactly. QQQ 2016–2026 uses the full file through 2026-10-07: $116,388, against $116,710 through
  2026-10-06.
- The engine and metrics were frozen and made read-only, with checksums. The checksums still match after
  all experiments.

**Five agents, each confined to its own directory**
- No file was written outside the assigned directories, and nothing in `src/` changed.
- Every experiment used the frozen engine's hooks; none modified the engine.

**Coordinator checks**
1. **Independent re-implementation** of all 10 experimental configurations, written from `SPEC.md` alone:
   net profit, max drawdown, closed trades and margin dollar-days match the agents' results in **40 of 40**
   configuration × dataset cases (`independent_verification.json`).
2. **Reproducibility:** each agent's `run.py` was re-run from scratch, and every `summary.json`, trade file
   and daily file came out **byte-identical**.
3. **Baseline reproduction:** each agent also confirmed that its `A_baseline` reproduces the frozen baseline
   byte for byte.

**Process note.** The harness blocked research agent 3 from writing its report file. It returned the report as
text instead, and the coordinator saved it unedited as `protective-exits/PROTECTIVE_EXITS.md`.

**How to read the matched-exposure control.**
- Each experiment is compared with an independent full baseline run at a fixed position size, chosen to give
  the same total margin dollar-days.
- Because the baseline's trade sequence does not depend on position size, the control scales profit and
  drawdown exactly, and its profit/drawdown always equals the baseline's.
- So an experiment adds risk management beyond deleveraging only if it earns more **and** draws down less than
  its control.

## Headline

**No approach delivers a convincing improvement beyond simply borrowing less.**

- **Only SMA200 sizing beats its control on both profit and drawdown** (3 of 4 datasets).
  - The margin is small: 3.5–15% less drawdown than the control.
  - Its agent's chance check shows that arbitrary halvings of the same number of trades do as well 15–38% of
    the time.
- **Every approach that changes *which* trades happen or *when* fares worse than its control** on nearly every
  dataset: protective stops, recovery-confirmed re-entry, staged entries.
- **The circuit breaker** cuts drawdown hard, but no more than an equally deleveraged fixed size.
- **Old periods stay unattractive.** No approach makes the 1999–2015 periods attractive after 11% interest. The
  best old-period result is about +$11.6k over 17 years (SMA sizing, QQQ) on an average of $47k borrowed.

---

## A. Results by dataset

Net profit includes the unrealized P&L of an open final position. Exposure = margin dollar-days relative to the baseline. Matched control = an independent full baseline run with a fixed size giving the same dollar-days; its profit/DD always equals the baseline ratio.

### QQQ_1999_2015

| Strategy | Net profit | Max DD | Profit/DD | Avg borrowed (all sessions) | Exposure vs baseline | Matched-control profit | Matched-control DD | Profit − control | DD − control | Lowest cum. P&L | Longest underwater (days) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | -2,886 | 149,561 | -0.02 | 67,620 | 100% | -2,886 | 149,561 | +0 | +0 | -102,735 | 5757* |
| SMA sizing | 11,574 | 99,953 | 0.12 | 46,857 | 69% | -1,999 | 103,588 | +13,573 | -3,635 | -53,127 | 5757* |
| Circuit breaker | 9,764 | 62,025 | 0.16 | 19,517 | 29% | -831 | 43,058 | +10,595 | +18,967 | -15,199 | 5757* |
| Protective stop 8% | -103,557 | 235,055 | -0.44 | 67,124 | 100% | -2,877 | 149,092 | -100,680 | +85,963 | -188,229 | 5757* |
| Protective stop 10% | -64,608 | 196,770 | -0.33 | 67,289 | 100% | -2,877 | 149,092 | -61,731 | +47,679 | -149,945 | 5757* |
| Early deterioration exit | -37,660 | 165,371 | -0.23 | 66,675 | 99% | -2,850 | 147,720 | -34,810 | +17,651 | -124,190 | 5757* |
| Two positive closes | -57,975 | 176,975 | -0.33 | 58,780 | 87% | -2,514 | 130,284 | -55,461 | +46,691 | -130,149 | 5757* |
| Recovery above SMA10 | -120,547 | 222,137 | -0.54 | 52,730 | 78% | -2,249 | 116,566 | -118,298 | +105,571 | -175,311 | 5757* |
| Recovery 3% from low | -80,458 | 194,407 | -0.41 | 52,399 | 78% | -2,246 | 116,422 | -78,212 | +77,985 | -147,581 | 5757* |
| Staged: two positive closes | -59,470 | 160,423 | -0.37 | 53,285 | 79% | -2,268 | 117,559 | -57,201 | +42,864 | -119,461 | 5757* |
| Staged: 3% recovery | -16,509 | 121,738 | -0.14 | 54,195 | 80% | -2,312 | 119,833 | -14,197 | +1,905 | -76,582 | 5757* |

\* not recovered by the end of the dataset.

### VGT_2005_2015

| Strategy | Net profit | Max DD | Profit/DD | Avg borrowed (all sessions) | Exposure vs baseline | Matched-control profit | Matched-control DD | Profit − control | DD − control | Lowest cum. P&L | Longest underwater (days) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 11,602 | 73,404 | 0.16 | 61,340 | 100% | 11,602 | 73,404 | +0 | +0 | -49,713 | 3002* |
| SMA sizing | 11,315 | 46,482 | 0.24 | 45,621 | 74% | 8,635 | 54,628 | +2,681 | -8,146 | -26,626 | 2438 |
| Circuit breaker | -606 | 39,900 | -0.02 | 35,376 | 58% | 6,699 | 42,381 | -7,305 | -2,481 | -20,045 | 3556* |
| Protective stop 8% | -14,862 | 95,147 | -0.16 | 61,228 | 100% | 11,598 | 73,373 | -26,460 | +21,775 | -71,457 | 3002* |
| Protective stop 10% | -16,667 | 94,952 | -0.18 | 61,265 | 100% | 11,602 | 73,404 | -28,269 | +21,548 | -71,262 | 3002* |
| Early deterioration exit | 6,306 | 87,566 | 0.07 | 61,115 | 100% | 11,573 | 73,218 | -5,267 | +14,348 | -63,876 | 3002* |
| Two positive closes | 5,024 | 66,689 | 0.08 | 58,383 | 95% | 11,070 | 70,035 | -6,046 | -3,345 | -31,999 | 3002* |
| Recovery above SMA10 | -7,850 | 75,633 | -0.10 | 55,651 | 91% | 10,513 | 66,511 | -18,363 | +9,122 | -51,080 | 3002* |
| Recovery 3% from low | -49,486 | 103,711 | -0.48 | 50,449 | 82% | 9,565 | 60,515 | -59,051 | +43,195 | -78,619 | 3002* |
| Staged: two positive closes | -13,233 | 66,512 | -0.20 | 51,254 | 83% | 9,687 | 61,288 | -22,920 | +5,224 | -41,294 | 3002* |
| Staged: 3% recovery | -4,060 | 65,743 | -0.06 | 51,123 | 83% | 9,685 | 61,273 | -13,745 | +4,470 | -43,098 | 3002* |

\* not recovered by the end of the dataset.

### VGT_2016_2026

| Strategy | Net profit | Max DD | Profit/DD | Avg borrowed (all sessions) | Exposure vs baseline | Matched-control profit | Matched-control DD | Profit − control | DD − control | Lowest cum. P&L | Longest underwater (days) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 161,772 | 38,323 | 4.22 | 66,640 | 100% | 161,772 | 38,323 | +0 | +0 | -7,070 | 790 |
| SMA sizing | 128,121 | 30,863 | 4.15 | 55,573 | 83% | 135,010 | 31,983 | -6,889 | -1,121 | -8,110 | 970 |
| Circuit breaker | 103,542 | 29,283 | 3.54 | 49,861 | 75% | 121,146 | 28,699 | -17,605 | +583 | -1,631 | 1009 |
| Protective stop 8% | 122,956 | 64,530 | 1.91 | 66,401 | 100% | 161,306 | 38,213 | -38,350 | +26,317 | -26,723 | 824 |
| Protective stop 10% | 119,107 | 57,257 | 2.08 | 66,561 | 100% | 161,906 | 38,355 | -42,799 | +18,903 | -27,835 | 960 |
| Early deterioration exit | 110,447 | 47,841 | 2.31 | 66,162 | 99% | 160,907 | 38,118 | -50,460 | +9,723 | -24,362 | 972 |
| Two positive closes | 104,522 | 34,363 | 3.04 | 54,857 | 82% | 132,880 | 31,479 | -28,358 | +2,884 | -1,978 | 1153 |
| Recovery above SMA10 | 84,228 | 63,748 | 1.32 | 53,941 | 81% | 130,949 | 31,021 | -46,721 | +32,726 | 0 | 1384 |
| Recovery 3% from low | 108,987 | 43,444 | 2.51 | 52,588 | 79% | 127,221 | 30,138 | -18,234 | +13,306 | 0 | 1656 |
| Staged: two positive closes | 129,096 | 47,114 | 2.74 | 57,146 | 86% | 138,505 | 32,811 | -9,409 | +14,303 | -14,856 | 1036 |
| Staged: 3% recovery | 125,983 | 40,445 | 3.11 | 55,076 | 83% | 134,012 | 31,747 | -8,029 | +8,699 | -12,576 | 1034 |

\* not recovered by the end of the dataset.

### QQQ_2016_2026

| Strategy | Net profit | Max DD | Profit/DD | Avg borrowed (all sessions) | Exposure vs baseline | Matched-control profit | Matched-control DD | Profit − control | DD − control | Lowest cum. P&L | Longest underwater (days) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 116,388 | 39,237 | 2.97 | 57,023 | 100% | 116,388 | 39,237 | +0 | +0 | -8,254 | 1395 |
| SMA sizing | 102,023 | 30,456 | 3.35 | 47,931 | 84% | 97,840 | 32,984 | +4,182 | -2,528 | -10,885 | 906 |
| Circuit breaker | 81,194 | 30,283 | 2.68 | 40,758 | 71% | 83,089 | 28,011 | -1,895 | +2,272 | -4,789 | 1688 |
| Protective stop 8% | 81,210 | 61,321 | 1.32 | 56,864 | 100% | 116,220 | 39,180 | -35,011 | +22,142 | -16,174 | 1702 |
| Protective stop 10% | 97,228 | 37,728 | 2.58 | 56,944 | 100% | 116,388 | 39,237 | -19,160 | -1,509 | -19,548 | 1409 |
| Early deterioration exit | 91,988 | 50,203 | 1.83 | 61,401 | 108% | 125,522 | 42,316 | -33,534 | +7,888 | -12,480 | 1492 |
| Two positive closes | 97,758 | 58,362 | 1.68 | 53,681 | 94% | 108,992 | 36,743 | -11,233 | +21,619 | 0 | 1702 |
| Recovery above SMA10 | 86,311 | 53,173 | 1.62 | 50,617 | 88% | 102,996 | 34,722 | -16,684 | +18,451 | 0 | 1701 |
| Recovery 3% from low | 81,063 | 59,020 | 1.37 | 52,925 | 93% | 107,703 | 36,308 | -26,640 | +22,711 | 0 | 1722 |
| Staged: two positive closes | 83,414 | 44,545 | 1.87 | 43,852 | 77% | 89,042 | 30,018 | -5,629 | +14,528 | -14,908 | 1680 |
| Staged: 3% recovery | 100,500 | 32,461 | 3.10 | 46,817 | 82% | 95,487 | 32,190 | +5,013 | +271 | -14,130 | 1398 |

\* not recovered by the end of the dataset.

## B. Bear markets (calendar windows): period P&L / max drawdown inside the window

| Strategy | QQQ_1999_2015 2000-2002 | QQQ_1999_2015 2007-2009 | VGT_2005_2015 2007-2009 | VGT_2016_2026 2022 | QQQ_2016_2026 2022 |
|---|---:|---:|---:|---:|---:|
| Baseline | -91,629 / 149,561 | 20,931 / 70,759 | -38,496 / 73,404 | -23,643 / 34,856 | -26,320 / 33,932 |
| SMA sizing | -45,808 / 93,548 | 4,597 / 50,669 | -23,534 / 40,988 | -16,473 / 25,354 | -18,654 / 25,151 |
| Circuit breaker | -19,381 / 62,025 | 5,233 / 17,690 | -24,592 / 39,316 | -16,935 / 24,179 | -18,481 / 23,633 |
| Protective stop 8% | -152,094 / 203,835 | -13,150 / 101,808 | -60,239 / 95,147 | -29,613 / 38,359 | -48,405 / 50,635 |
| Protective stop 10% | -136,254 / 192,660 | 12,326 / 79,364 | -60,044 / 94,952 | -30,356 / 41,569 | -24,071 / 31,683 |
| Early deterioration exit | -108,802 / 164,988 | 14,923 / 76,767 | -42,071 / 87,566 | -32,386 / 43,697 | -37,286 / 42,334 |
| Two positive closes | -127,709 / 174,632 | 37,760 / 46,878 | -30,692 / 66,689 | -19,939 / 26,150 | -45,445 / 47,803 |
| Recovery above SMA10 | -156,685 / 213,494 | 8,781 / 74,973 | -36,563 / 75,633 | -48,907 / 52,944 | -42,114 / 42,615 |
| Recovery 3% from low | -116,735 / 163,825 | 11,388 / 65,730 | -66,980 / 103,711 | -31,607 / 36,296 | -47,961 / 48,462 |
| Staged: two positive closes | -77,570 / 120,130 | 1,286 / 79,799 | -27,030 / 66,512 | -31,992 / 38,337 | -31,298 / 35,324 |
| Staged: 3% recovery | -52,556 / 103,978 | 9,521 / 74,608 | -25,322 / 65,743 | -27,823 / 32,193 | -21,065 / 28,436 |

Interest paid inside each bear window and trades closed / losing:

| Strategy | QQQ_1999_2015 2000-2002 | QQQ_1999_2015 2007-2009 | VGT_2005_2015 2007-2009 | VGT_2016_2026 2022 | QQQ_2016_2026 2022 |
|---|---:|---:|---:|---:|---:|
| Baseline | 28,630; 56/36 | 32,066; 21/15 | 21,879; 23/16 | 9,644; 13/10 | 9,764; 13/10 |
| SMA sizing | 18,293; 56/36 | 19,062; 21/15 | 11,663; 23/16 | 6,208; 13/10 | 6,299; 13/10 |
| Circuit breaker | 10,013; 56/36 | 8,016; 21/15 | 12,673; 23/16 | 5,628; 13/10 | 5,703; 13/10 |
| Protective stop 8% | 28,178; 73/49 | 32,066; 25/19 | 21,759; 27/20 | 9,734; 14/11 | 9,764; 15/12 |
| Protective stop 10% | 28,268; 67/43 | 31,975; 24/17 | 21,789; 26/19 | 9,734; 14/11 | 9,825; 13/10 |
| Early deterioration exit | 27,515; 88/61 | 31,644; 30/23 | 21,608; 30/24 | 9,614; 16/13 | 9,644; 17/14 |
| Two positive closes | 22,784; 45/29 | 29,595; 15/11 | 20,523; 17/12 | 7,715; 11/9 | 7,926; 12/10 |
| Recovery above SMA10 | 24,351; 45/30 | 29,414; 15/11 | 20,312; 17/14 | 8,047; 14/13 | 7,504; 13/12 |
| Recovery 3% from low | 24,592; 47/31 | 23,115; 14/10 | 20,132; 20/16 | 7,142; 12/11 | 7,444; 13/11 |
| Staged: two positive closes | 22,738; 54/36 | 21,819; 23/21 | 19,212; 23/17 | 8,453; 14/11 | 8,152; 14/11 |
| Staged: 3% recovery | 21,638; 54/37 | 27,575; 24/21 | 18,821; 24/21 | 7,338; 15/12 | 7,112; 15/12 |

## C. Recovery participation: period P&L in each recovery window (and % of baseline)

| Strategy | QQQ 2003 | QQQ 2009 | VGT 2009 | VGT 2020 | QQQ 2020 | VGT 2023 | QQQ 2023 | VGT 2025 | QQQ 2025 | Sum | Sum % of baseline |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 18,291 (100%) | 66,522 (100%) | 15,518 (100%) | 48,081 (100%) | 63,718 (100%) | 44,468 (100%) | 25,111 (100%) | 39,671 (100%) | 19,964 (100%) | 341,343 | 100% |
| SMA sizing | 9,145 (50%) | 33,261 (50%) | 7,759 (50%) | 48,081 (100%) | 63,718 (100%) | 30,066 (68%) | 21,292 (85%) | 21,814 (55%) | 7,252 (36%) | 242,389 | 71% |
| Circuit breaker | 4,573 (25%) | 16,630 (25%) | 3,879 (25%) | 26,567 (55%) | 47,788 (75%) | 26,150 (59%) | 12,556 (50%) | 30,801 (78%) | 8,617 (43%) | 177,562 | 52% |
| Protective stop 8% | 18,291 (100%) | 59,998 (90%) | 15,518 (100%) | 42,699 (89%) | 46,006 (72%) | 44,468 (100%) | 25,111 (100%) | 39,671 (100%) | 18,534 (93%) | 310,296 | 91% |
| Protective stop 10% | 18,291 (100%) | 66,522 (100%) | 15,518 (100%) | 38,022 (79%) | 48,139 (76%) | 44,468 (100%) | 25,111 (100%) | 39,671 (100%) | 16,534 (83%) | 312,276 | 91% |
| Early deterioration exit | 18,291 (100%) | 66,522 (100%) | 29,314 (189%) | 35,688 (74%) | 53,250 (84%) | 44,468 (100%) | 25,111 (100%) | 34,530 (87%) | 19,223 (96%) | 326,396 | 96% |
| Two positive closes | 3,055 (17%) | 56,925 (86%) | 15,832 (102%) | 61,933 (129%) | 57,690 (91%) | 16,462 (37%) | 23,335 (93%) | 31,266 (79%) | 16,029 (80%) | 282,529 | 83% |
| Recovery above SMA10 | 12,646 (69%) | 59,400 (89%) | 25,190 (162%) | 45,924 (96%) | 43,430 (68%) | 42,756 (96%) | 23,177 (92%) | 27,534 (69%) | 15,222 (76%) | 295,279 | 87% |
| Recovery 3% from low | 9,767 (53%) | 51,515 (77%) | 17,930 (116%) | 46,893 (98%) | 47,592 (75%) | 14,711 (33%) | 23,177 (92%) | 20,382 (51%) | 13,055 (65%) | 245,022 | 72% |
| Staged: two positive closes | 13,362 (73%) | 61,724 (93%) | 23,157 (149%) | 49,476 (103%) | 62,503 (98%) | 42,476 (96%) | 22,957 (91%) | 35,927 (91%) | 20,312 (102%) | 331,895 | 97% |
| Staged: 3% recovery | 7,169 (39%) | 62,961 (95%) | 26,179 (169%) | 42,205 (88%) | 64,564 (101%) | 39,324 (88%) | 20,393 (81%) | 34,904 (88%) | 18,853 (94%) | 316,552 | 93% |

## D. Exposure-adjusted summary (difference vs the matched fixed-size control)

Positive profit difference and negative drawdown difference both favour the experiment. "Beats control on both" = more profit AND less drawdown than the same-exposure fixed size.

| Strategy | QQQ_1999_2015: Δprofit / ΔDD | VGT_2005_2015: Δprofit / ΔDD | VGT_2016_2026: Δprofit / ΔDD | QQQ_2016_2026: Δprofit / ΔDD | Datasets beating control on both | Datasets with lower DD than baseline |
|---|---:|---:|---:|---:|---:|---:|
| SMA sizing | +13,573 / -3,635 | +2,681 / -8,146 | -6,889 / -1,121 | +4,182 / -2,528 | 3/4 | 4/4 |
| Circuit breaker | +10,595 / +18,967 | -7,305 / -2,481 | -17,605 / +583 | -1,895 / +2,272 | 0/4 | 4/4 |
| Protective stop 8% | -100,680 / +85,963 | -26,460 / +21,775 | -38,350 / +26,317 | -35,011 / +22,142 | 0/4 | 0/4 |
| Protective stop 10% | -61,731 / +47,679 | -28,269 / +21,548 | -42,799 / +18,903 | -19,160 / -1,509 | 0/4 | 1/4 |
| Early deterioration exit | -34,810 / +17,651 | -5,267 / +14,348 | -50,460 / +9,723 | -33,534 / +7,888 | 0/4 | 0/4 |
| Two positive closes | -55,461 / +46,691 | -6,046 / -3,345 | -28,358 / +2,884 | -11,233 / +21,619 | 0/4 | 2/4 |
| Recovery above SMA10 | -118,298 / +105,571 | -18,363 / +9,122 | -46,721 / +32,726 | -16,684 / +18,451 | 0/4 | 0/4 |
| Recovery 3% from low | -78,212 / +77,985 | -59,051 / +43,195 | -18,234 / +13,306 | -26,640 / +22,711 | 0/4 | 0/4 |
| Staged: two positive closes | -57,201 / +42,864 | -22,920 / +5,224 | -9,409 / +14,303 | -5,629 / +14,528 | 0/4 | 1/4 |
| Staged: 3% recovery | -14,197 / +1,905 | -13,745 / +4,470 | -8,029 / +8,699 | +5,013 / +271 | 0/4 | 3/4 |

## E. Concentration of the change vs baseline (by calendar year)

For each dataset: total P&L difference vs baseline, and the single calendar year contributing the largest absolute share of the yearly differences (|best year| ÷ Σ|yearly differences|). High shares mean the result rests on one period.

| Strategy | QQQ_1999_2015 | VGT_2005_2015 | VGT_2016_2026 | QQQ_2016_2026 |
|---|---|---|---|---|
| SMA sizing | +14,460; 2009: -27,777 (24%) | -287; 2008: +20,763 (46%) | -33,652; 2025: -17,857 (37%) | -14,366; 2025: -12,712 (43%) |
| Circuit breaker | +12,649; 2009: -41,665 (20%) | -12,208; 2008: +21,985 (37%) | -58,231; 2020: -24,261 (31%) | -35,194; 2020: -13,558 (22%) |
| Protective stop 8% | -100,671; 2001: -38,443 (38%) | -26,465; 2008: -21,744 (82%) | -38,816; 2020: -37,343 (67%) | -35,179; 2022: -22,085 (42%) |
| Protective stop 10% | -61,722; 2001: -51,872 (47%) | -28,269; 2008: -21,548 (76%) | -42,666; 2020: -35,953 (84%) | -19,160; 2020: -17,978 (76%) |
| Early deterioration exit | -34,774; 2002: -16,312 (38%) | -5,296; 2008: -8,669 (56%) | -51,326; 2020: -26,536 (52%) | -24,400; 2022: -10,967 (29%) |
| Two positive closes | -55,089; 2008: +21,677 (20%) | -6,579; 2006: +10,013 (24%) | -57,251; 2026: -31,094 (38%) | -18,630; 2022: -19,125 (44%) |
| Recovery above SMA10 | -117,662; 2000: -37,621 (29%) | -19,453; 2010: -8,500 (23%) | -77,544; 2026: -31,094 (32%) | -30,077; 2020: -20,288 (36%) |
| Recovery 3% from low | -77,573; 2009: -20,135 (17%) | -61,088; 2008: -30,051 (40%) | -52,786; 2023: -29,758 (31%) | -35,326; 2022: -21,641 (37%) |
| Staged: two positive closes | -56,584; 2001: +32,171 (26%) | -24,835; 2011: -13,681 (25%) | -32,676; 2022: -8,349 (26%) | -32,975; 2021: -9,975 (30%) |
| Staged: 3% recovery | -13,624; 2002: +19,402 (18%) | -15,663; 2010: -13,847 (27%) | -35,790; 2018: -8,036 (22%) | -15,889; 2021: -9,641 (22%) |

---

## Interpretation by section

### A. Results (backtest calculations)

- **Drawdown below the baseline on all four datasets:** only SMA sizing and the circuit breaker. Staged entry
  with 3% recovery manages 3 of 4, and the others at most 2 of 4. The two exposure rules reduce drawdown mainly
  because they borrow less: 69–84% and 29–75% of the baseline's dollar-days respectively.
- **Against the matched control:**
  - SMA sizing has less drawdown than its control in all four datasets, by $1.1k–$8.1k, and more profit in
    three.
  - The circuit breaker has more drawdown than its control in three datasets. On QQQ 1999–2015, its $62k max
    drawdown compares with $43k for a fixed $28.8k position with the same exposure.
- **Protective stops leave exposure unchanged (99–108%)** but are worse on profit and drawdown in nearly every
  case. Their matched control is essentially the baseline.
- **Recovery confirmation and staged entries** reduce exposure by 5–24%, and still trail their controls on
  profit in 19 of 20 config × dataset cases and on drawdown in 19 of 20.

### B. Bear markets (2000–2002, 2007–2009, 2022)

- **The two exposure rules are the only approaches that consistently shrink bear-window losses.**
  - In QQQ 2000–2002, SMA sizing cuts the window loss from −$91.6k to −$45.8k, and the circuit breaker to
    −$19.4k.
  - Both cut losses by more than they cut interest paid in the window (64% and 35% of the baseline's interest).
    So inside the bear window they do better than proportional deleveraging.
  - **The circuit breaker pays for this afterwards.** It stays at reduced size into the recovery (§C), which
    is why its full-period result trails the control.
- **Protective stops make bear windows worse in 14 of 15 window × config cases.** Each stop-out is followed by
  an immediate re-entry, so one large loss becomes a chain of smaller ones (chains of up to 9).
- **Recovery confirmation helps in some windows and hurts in others.**
  - Two positive closes: QQQ 2007–09 +$37.8k vs +$20.9k, but QQQ 2022 −$45.4k vs −$26.3k.
  - A delayed re-entry can just as easily land deeper in the decline.
- **Staged entry with 3% recovery** reduces window losses in 3 of 5 windows. It does so by holding $50k in
  positions that never bounce, but its full-period drawdown is never below its control's.

### C. Recovery participation

- **The exposure rules give up the most recovery profit:** SMA sizing keeps 71% of the baseline's
  recovery-window P&L, and the circuit breaker 52%.
  - SMA sizing halves the first rebound entry after most V-shaped bottoms (2002–03, 2009, Dec 2018, 2023, Apr
    2025), because the 200-day average is still falling.
  - The circuit breaker is still in a reduced tier when the recovery comes. It took VGT's largest winner (Apr
    2020) at $50k because the drawdown was $446 over a tier threshold.
- **Protective stops and staged entries keep 91–97% of recovery P&L.** Their damage comes elsewhere: stop-out
  chains, and add-ons that raise the cost basis and fire the 15-day loss exit.
- **Recovery confirmation keeps 72–87%,** with large misses.
  - VGT January 2023 with two positive closes kept 37%, and with 3% from the low 33%.
  - With two positive closes on VGT 2016–2026, two big winners were skipped entirely after tiny
    interest-driven losses (−$143 and −$111), because the confirming bounce lifted the price out of the 10%
    entry zone.
- **Inference:** there is a structural tension. The strategy's profits come from entries near bottoms, which is
  exactly where trend, drawdown and confirmation rules are most cautious.

### D. Exposure-adjusted comparison

- **Only SMA sizing shows any measurable advantage beyond deleveraging,** and it is weak.
  - It beats its control on both profit and drawdown in 3 of 4 datasets.
  - Summed across datasets, that is +$13.5k of profit and −$15.4k of drawdown against matched-exposure fixed
    sizes.
  - Its agent's chance check finds the same or better improvement from arbitrary selections of trades to halve
    in 15–38% (drawdown) and 28–70% (profit) of cases.
- **For every other configuration, the matched control performs as well or better.**
  - The circuit breaker beats its control on both counts in 0 of 4 datasets.
  - All protective-stop, recovery-confirmation and staged configurations: 0 of 4.
  - The only exception to "control wins on profit" is staged entry with 3% recovery on QQQ 2016–2026, which
    earns $5k more but has $0.3k more drawdown. Its agent traces that to one March 2020 episode.

### E. Robustness assessment

| Approach (best config) | Consistency across the 4 datasets | Dependence on a few trades | Addresses the known failure mode? | Complexity | Overfitting risk | Suitable for more research? |
|---|---|---|---|---|---|---|
| **SMA200 sizing** | Lower DD 4/4; beats control on both 3/4 (VGT 2016–26 −$6.9k profit) | High: profit effect hinges on 1–3 bottom-recovery trades whose SMA slope sits within ±0.4% of zero | Partly: trims bear-market chains (QQQ 2000–02), but halves rebound entries | Low | Moderate: slope threshold is knife-edge; one rule tested | **Yes, narrowly:** an out-of-sample check only |
| Circuit breaker | Lower DD 4/4; beats control 0/4 | Moderate: result depends on where the data starts (just before the 2000 top) | Reduces bear losses, but gets trapped (QQQ: $25k tier for the last 15.2 years) | Low | Low (thresholds not tuned) | No |
| Protective stops (8/10%, early 5%) | Worse than baseline and control on almost everything | Damage concentrated in fast crashes (2000–01, 2008, 2020, 2022), which recur in every dataset | **No:** makes cumulative bear losses worse via immediate re-entry | Low | Low | No |
| Recovery-confirmed re-entry | Worse than control 12/12 on profit | Misses depend on interest-driven tiny losses that trigger confirmation | No: blocks winners and losers alike; delayed entries cost 0.9–3.2% in price | Moderate | Low | No |
| Staged entries | Worse than control on DD in 8/8 config × dataset cases | 3% variant's one gain is a single 2020 episode | No: add-on raises cost basis, delaying the profit stop and firing the loss exit | Moderate | Low | No |

**Limitations that apply to every result**
- **Two correlated histories, not four independent tests.** VGT and QQQ are highly correlated and share most
  entry dates in 2016–2026; the evidence amounts to roughly two histories and four or five distinct bear
  episodes.
- **Data examined before.** The periods had already been inspected before this phase.
- **Idealised execution:**
  - fills at the same close used in the decision;
  - stops fill exactly at their level, with no slippage or commissions;
  - a constant 11% rate;
  - adjusted prices.
- **Open positions at the end.** Three datasets end with a position open; its unrealized P&L is included
  consistently.
