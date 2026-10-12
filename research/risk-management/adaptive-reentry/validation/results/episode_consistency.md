# Episode-level consistency vs REF_lower3 (window P&L deltas)

Columns are instruments; each row is ONE market episode. VGT/QQQ/SPY/XLK/IWM/QLD/SOXX/VOOG columns within a row are correlated replications of the same event, not independent evidence. 2007-2009 includes the 2009 recovery; 2020/2023/2025/2026 are the frozen recovery windows; 2026 is truncated at 2026-09-08 for SPY/XLK/IWM.


## A2_material_05

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | -6.1k | . | . | . | . | . | . | . | . | harm |
| 2007-2009 | ~(+0.0k) | ~(+0.0k) | . | . | . | . | . | +25.7k | ~(-0.0k) | -5.1k | MIXED (1+ / 1-) |
| 2020 | . | . | ~(+0.0k) | ~(+0.0k) | +32.2k | +9.1k | +12.2k | ~(+0.0k) | ~(-0.0k) | ~(-0.0k) | improve |
| 2022 | . | . | +3.7k | ~(+0.3k) | ~(-0.0k) | ~(+0.0k) | -3.4k | -7.2k | ~(+0.5k) | ~(+0.0k) | MIXED (1+ / 2-) |
| 2023 | . | . | +25.6k | +7.6k | ~(-0.0k) | -3.6k | ~(+0.0k) | ~(-0.1k) | +48.4k | ~(+0.0k) | MIXED (3+ / 1-) |
| 2025 | . | . | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | ~(+0.0k) | ~(+0.0k) | -30.2k | ~(+0.0k) | ~(+0.0k) | harm |
| 2026 | . | . | -21.9k | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | +3.8k | +3.7k | ~(+0.0k) | MIXED (2+ / 1-) |

Independent episodes covered: 7; improve: 1, harm: 2, neutral: 0, mixed: 4

## A2_material_1

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | -6.1k | . | . | . | . | . | . | . | . | harm |
| 2007-2009 | ~(+0.0k) | +2.6k | . | . | . | . | . | +25.7k | ~(-0.0k) | -5.4k | MIXED (2+ / 1-) |
| 2020 | . | . | ~(+0.0k) | ~(+0.0k) | +32.2k | ~(-0.1k) | +12.2k | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | improve |
| 2022 | . | . | +3.7k | -3.6k | ~(-0.0k) | ~(-0.7k) | -3.4k | -7.2k | ~(+0.5k) | +6.2k | MIXED (2+ / 3-) |
| 2023 | . | . | +25.6k | ~(+0.0k) | ~(-0.0k) | -3.6k | ~(+0.0k) | ~(-0.1k) | +48.4k | -5.2k | MIXED (2+ / 2-) |
| 2025 | . | . | ~(+0.0k) | ~(-0.0k) | ~(-0.0k) | ~(-0.0k) | ~(+0.0k) | -30.2k | -5.1k | ~(+0.0k) | harm |
| 2026 | . | . | -21.9k | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | ~(-0.0k) | +3.8k | +3.7k | ~(+0.0k) | MIXED (2+ / 1-) |

Independent episodes covered: 7; improve: 1, harm: 2, neutral: 0, mixed: 4

## D7_tiny_loss_exit_anchor

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | -4.8k | . | . | . | . | . | . | . | . | harm |
| 2007-2009 | ~(-1.8k) | +2.7k | . | . | . | . | . | +27.4k | ~(-0.0k) | ~(+0.0k) | improve |
| 2020 | . | . | ~(+0.0k) | ~(+0.0k) | +32.2k | ~(+0.0k) | +12.2k | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | improve |
| 2022 | . | . | -2.2k | -8.7k | ~(-0.0k) | -3.8k | -5.1k | -2.6k | -2.8k | -6.1k | harm |
| 2023 | . | . | +25.6k | +7.6k | ~(-0.0k) | -3.6k | +7.9k | ~(-0.0k) | +48.4k | -3.9k | MIXED (4+ / 2-) |
| 2025 | . | . | -5.0k | ~(-0.0k) | ~(-0.0k) | ~(-0.0k) | ~(+0.0k) | -30.2k | -5.1k | ~(+0.0k) | harm |
| 2026 | . | . | -4.6k | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | ~(-0.0k) | +3.8k | ~(-0.0k) | ~(+0.0k) | MIXED (1+ / 1-) |

Independent episodes covered: 7; improve: 2, harm: 3, neutral: 0, mixed: 2

## B7_stall

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | +21.2k | . | . | . | . | . | . | . | . | improve |
| 2007-2009 | ~(+0.0k) | ~(+0.0k) | . | . | . | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | neutral |
| 2020 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | neutral |
| 2022 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | neutral |
| 2023 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | -3.4k | harm |
| 2025 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | neutral |
| 2026 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | neutral |

Independent episodes covered: 7; improve: 1, harm: 1, neutral: 5, mixed: 0

## B2_inverse

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | +2.8k | . | . | . | . | . | . | . | . | improve |
| 2007-2009 | ~(+1.0k) | -12.7k | . | . | . | . | . | -13.4k | -8.8k | -9.3k | harm |
| 2020 | . | . | ~(+0.0k) | ~(+0.0k) | +40.6k | ~(-0.0k) | ~(+0.0k) | ~(+0.0k) | +54.2k | ~(+0.0k) | improve |
| 2022 | . | . | -6.1k | -8.6k | -13.3k | -10.7k | -3.4k | -3.3k | ~(+0.0k) | +7.4k | MIXED (1+ / 6-) |
| 2023 | . | . | +31.7k | ~(+0.0k) | +29.0k | ~(-1.5k) | ~(+0.0k) | ~(-0.1k) | ~(-0.0k) | -9.4k | MIXED (2+ / 1-) |
| 2025 | . | . | ~(+0.0k) | -30.1k | ~(+0.0k) | ~(-0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | harm |
| 2026 | . | . | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | -19.2k | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | ~(+0.0k) | harm |

Independent episodes covered: 7; improve: 2, harm: 3, neutral: 0, mixed: 2

## C6_retrace_38

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | ~(-0.7k) | . | . | . | . | . | . | . | . | neutral |
| 2007-2009 | +4.2k | ~(+0.0k) | . | . | . | . | . | +24.4k | -23.5k | +30.1k | MIXED (3+ / 1-) |
| 2020 | . | . | ~(+0.0k) | ~(-0.0k) | +29.7k | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | +37.5k | ~(-0.0k) | improve |
| 2022 | . | . | -2.7k | -4.0k | -8.0k | ~(+0.0k) | -3.7k | -3.9k | -8.0k | -9.1k | harm |
| 2023 | . | . | +31.7k | ~(+0.8k) | -31.7k | ~(-0.0k) | ~(+0.0k) | ~(-0.0k) | +32.6k | -5.2k | MIXED (2+ / 2-) |
| 2025 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | +64.5k | +24.3k | ~(+0.0k) | ~(-0.0k) | ~(-0.4k) | improve |
| 2026 | . | . | -3.0k | ~(+0.0k) | -2.2k | ~(-0.0k) | ~(+0.0k) | ~(+0.0k) | ~(-0.7k) | ~(+0.0k) | harm |

Independent episodes covered: 7; improve: 2, harm: 2, neutral: 1, mixed: 2

## C11_graduated

| episode | VGT05 | QQQ99 | VGT16 | QQQ16 | QLD | SOXX | VOOG | SPY | XLK | IWM | episode verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2000-2002 | . | +17.4k | . | . | . | . | . | . | . | . | improve |
| 2007-2009 | ~(-2.0k) | -2.3k | . | . | . | . | . | -2.2k | -77.0k | -3.6k | harm |
| 2020 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | neutral |
| 2022 | . | . | ~(+0.0k) | ~(+0.0k) | ~(-0.5k) | -8.4k | ~(+0.0k) | -4.5k | -4.0k | ~(-0.6k) | harm |
| 2023 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(-1.5k) | ~(+0.0k) | ~(-0.1k) | ~(-0.0k) | -8.3k | harm |
| 2025 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | +64.5k | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | improve |
| 2026 | . | . | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(-0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | ~(+0.0k) | neutral |

Independent episodes covered: 7; improve: 2, harm: 3, neutral: 2, mixed: 0


# Fresh-instrument transfer (unchanged parameters)

| instrument | baseline net/DD | REF_lower3 net/DD | lower3 vs matched-exposure baseline (net / DD) | best candidate vs lower3 | worst candidate vs lower3 |
|---|---|---|---|---|---|
| QLD | 264,067/71,553 | -21,552/88,403 | -158,815 / +51,209 | D7_tiny_loss_exit_anchor +98,398 | C11_graduated -483 |
| SOXX | 118,020/57,878 | 71,855/53,395 | -7,560 / +14,450 | C6_retrace_38 +40,937 | B2_inverse -23,057 |
| VOOG | 56,668/45,222 | 63,258/27,401 | +29,473 / +440 | D7_tiny_loss_exit_anchor +10,056 | B2_inverse -25,226 |
| SPY | 19,456/83,535 | -19,097/93,047 | -27,339 / +57,661 | C6_retrace_38 +30,029 | B2_inverse -4,441 |
| XLK | 229,270/80,743 | 107,647/50,243 | +9,361 / +15,629 | A2_material_05 +78,128 | C11_graduated -69,235 |
| IWM | 22,237/88,852 | -6,848/76,783 | -17,229 / +35,303 | C11_graduated +11,669 | B2_inverse -13,969 |


## Candidate net vs REF_lower3 per fresh instrument (positive = candidate better)

| candidate | QLD | SOXX | VOOG | SPY | XLK | IWM | #improve/#harm (of 6) |
|---|---|---|---|---|---|---|---|
| A2_material_05 | +85,933 | +5,673 | +3,902 | +13,498 | +78,128 | +4,813 | 6/0 |
| A2_material_1 | +85,933 | -4,196 | +3,902 | +12,275 | +67,866 | -4,899 | 4/2 |
| D7_tiny_loss_exit_anchor | +98,398 | -8,115 | +10,056 | +8,580 | +61,390 | +11,627 | 5/1 |
| B7_stall | +0 | +0 | +0 | +0 | +0 | -3,159 | 0/1 |
| B2_inverse | +67,937 | -23,057 | -25,226 | -4,441 | +65,682 | -13,969 | 2/4 |
| C6_retrace_38 | +12,210 | +40,937 | -4,360 | +30,029 | +44,169 | +1,604 | 4/1 |
| C11_graduated | -483 | +22,674 | +0 | +5,609 | -69,235 | +11,669 | 3/1 |


## Candidate vs its own matched-exposure baseline control per fresh instrument (net diff / DD diff; negative DD diff = candidate has smaller drawdown)

| candidate | QLD | SOXX | VOOG | SPY | XLK | IWM |
|---|---|---|---|---|---|---|
| REF_lower3 | -158,815 / +51,209 | -7,560 / +14,450 | +29,473 / +440 | -27,339 / +57,661 | +9,361 / +15,629 | -17,229 / +35,303 |
| A2_material_05 | -97,251 / +37,074 | -3,425 / +13,406 | +30,091 / -2,576 | -13,913 / +17,769 | +30,668 / -4,411 | -14,523 / +33,088 |
| A2_material_1 | -97,251 / +37,074 | -15,089 / +12,526 | +30,091 / -2,576 | -15,136 / +17,986 | +13,353 / -6,895 | -25,656 / +31,440 |
| D7_tiny_loss_exit_anchor | -90,069 / +35,642 | -17,469 / +13,280 | +27,102 / -9,872 | -17,598 / +31,741 | +18,179 / -2,915 | -9,372 / +15,042 |
| B7_stall | -158,815 / +51,209 | -7,560 / +14,450 | +29,473 / +440 | -27,339 / +57,661 | +9,361 / +15,629 | -20,419 / +35,178 |
| B2_inverse | -118,590 / +24,681 | -34,462 / +21,438 | +14,598 / +9,695 | -32,131 / +57,144 | +63,663 / +20,895 | -31,897 / +46,192 |
| C6_retrace_38 | -192,971 / +64,181 | +12,767 / +11,049 | +16,023 / -6,814 | -1,031 / +7,774 | +20,092 / +27,309 | -18,601 / +10,007 |
| C11_graduated | -159,621 / +51,604 | +13,935 / +13,425 | +29,473 / +440 | -21,926 / +46,594 | -47,753 / +46,023 | -7,147 / +24,634 |


# Multiple-testing accounting

| registry | configurations |
|---|---|
| loss-classification | 10 |
| adaptive-discounts | 26 |
| recovery-resets | 22 |
| recovery-opportunities | 15 |
| state-memory | 5 |
| execution-feasibility | 9 |
| validation | 52 |
| **total** | **139** |
