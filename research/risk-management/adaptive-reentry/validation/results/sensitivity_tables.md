## Center-point cross-check (validation re-implementation vs family results)

- V_A2_cut_050 == loss-classification/A2_material_05: IDENTICAL on all 4 datasets
- V_A2_cut_100 == loss-classification/A2_material_1: IDENTICAL on all 4 datasets
- V_D7_tiny_2000 == recovery-opportunities/D7_tiny_loss_exit_anchor: IDENTICAL on all 4 datasets
- V_B7_stall_a20_d60 == adaptive-discounts/B7_stall: IDENTICAL on all 4 datasets
- V_B2_inv_f050_s50 == adaptive-discounts/B2_inverse: IDENTICAL on all 4 datasets
- V_C6_retr_38 == recovery-resets/C6_retrace_38: IDENTICAL on all 4 datasets
- V_C11_r108_d150 == recovery-resets/C11_graduated: IDENTICAL on all 4 datasets

REF_lower3 (anchor) net: VGT05 26,384/54,279  QQQ99 40,258/91,469  VGT16 182,094/28,687  QQQ16 132,242/23,564

## Grid A2_cutoff (candidate: A2_material_05 / A2_material_1)

| config | params | VGT05 net/DD | QQQ99 net/DD | VGT16 net/DD | QQQ16 net/DD | Σnet | Σnet−ΣnetREF |
|---|---|---|---|---|---|---|---|
| V_A2_cut_025 | {'cutoff': 0.0025} | 28,363/54,279 | 51,812/93,720 | 148,160/29,336 | 129,839/26,133 | 358,174 | -22,805 |
| V_A2_cut_050 **(frozen)** | {'cutoff': 0.005} | 28,363/54,279 | 51,812/93,720 | 180,663/29,336 | 133,745/29,106 | 394,583 | +13,604 |
| V_A2_cut_075 | {'cutoff': 0.0075} | 28,363/54,279 | 63,612/81,920 | 180,663/29,336 | 133,745/29,106 | 406,383 | +25,404 |
| V_A2_cut_100 **(frozen)** | {'cutoff': 0.01} | 28,363/54,279 | 67,162/78,370 | 184,948/29,336 | 122,206/29,106 | 402,679 | +21,700 |
| V_A2_cut_150 | {'cutoff': 0.015} | 49,097/54,279 | 70,082/77,187 | 179,669/28,208 | 113,677/32,752 | 412,525 | +31,546 |
| V_A2_cut_200 | {'cutoff': 0.02} | 52,098/54,279 | 70,082/77,187 | 179,669/28,208 | 113,677/32,752 | 415,526 | +34,548 |

- FLIP on VGT16: vs-REF sign varies across the grid: A2_cut_025:-, A2_cut_050:-, A2_cut_075:-, A2_cut_100:+, A2_cut_150:-, A2_cut_200:-
- FLIP on QQQ16: vs-REF sign varies across the grid: A2_cut_025:-, A2_cut_050:+, A2_cut_075:+, A2_cut_100:-, A2_cut_150:-, A2_cut_200:-

## Grid D7_bound (candidate: D7_tiny_loss_exit_anchor)

| config | params | VGT05 net/DD | QQQ99 net/DD | VGT16 net/DD | QQQ16 net/DD | Σnet | Σnet−ΣnetREF |
|---|---|---|---|---|---|---|---|
| V_D7_tiny_500 | {'bound': 500.0} | 32,115/54,279 | 53,517/88,093 | 176,802/28,687 | 128,774/26,133 | 391,208 | +10,229 |
| V_D7_tiny_1000 | {'bound': 1000.0} | 10,683/58,645 | 70,245/71,365 | 173,505/28,687 | 132,772/31,157 | 387,205 | +6,226 |
| V_D7_tiny_2000 **(frozen)** | {'bound': 2000.0} | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 | 422,374 | +41,396 |
| V_D7_tiny_3000 | {'bound': 3000.0} | 37,806/51,573 | 73,678/69,850 | 156,988/28,436 | 97,006/31,157 | 365,478 | -15,501 |
| V_D7_tiny_5000 | {'bound': 5000.0} | 37,806/51,573 | 98,398/79,426 | 145,578/28,889 | 97,006/31,157 | 378,788 | -2,191 |

- FLIP on VGT05: vs-REF sign varies across the grid: D7_tiny_500:+, D7_tiny_1000:-, D7_tiny_2000:+, D7_tiny_3000:+, D7_tiny_5000:+
- FLIP on VGT16: vs-REF sign varies across the grid: D7_tiny_500:-, D7_tiny_1000:-, D7_tiny_2000:+, D7_tiny_3000:-, D7_tiny_5000:-
- FLIP on QQQ16: vs-REF sign varies across the grid: D7_tiny_500:-, D7_tiny_1000:+, D7_tiny_2000:-, D7_tiny_3000:-, D7_tiny_5000:-

## Grid B7_age_decay (candidate: B7_stall)

| config | params | VGT05 net/DD | QQQ99 net/DD | VGT16 net/DD | QQQ16 net/DD | Σnet | Σnet−ΣnetREF |
|---|---|---|---|---|---|---|---|
| V_B7_stall_a10_d40 | {'fresh_age': 10.0, 'decay': 40.0} | 43,602/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 | 419,364 | +38,385 |
| V_B7_stall_a10_d60 | {'fresh_age': 10.0, 'decay': 60.0} | 44,525/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 | 420,287 | +39,308 |
| V_B7_stall_a10_d80 | {'fresh_age': 10.0, 'decay': 80.0} | 26,384/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 | 402,146 | +21,167 |
| V_B7_stall_a20_d40 | {'fresh_age': 20.0, 'decay': 40.0} | 44,525/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 | 420,287 | +39,308 |
| V_B7_stall_a20_d60 **(frozen)** | {'fresh_age': 20.0, 'decay': 60.0} | 26,384/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 | 402,146 | +21,167 |
| V_B7_stall_a20_d80 | {'fresh_age': 20.0, 'decay': 80.0} | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 | 380,979 | +0 |
| V_B7_stall_a30_d40 | {'fresh_age': 30.0, 'decay': 40.0} | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 | 380,979 | +0 |
| V_B7_stall_a30_d60 | {'fresh_age': 30.0, 'decay': 60.0} | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 | 380,979 | +0 |
| V_B7_stall_a30_d80 | {'fresh_age': 30.0, 'decay': 80.0} | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 | 380,979 | +0 |


## Grid B2_floor_slope (candidate: B2_inverse)

| config | params | VGT05 net/DD | QQQ99 net/DD | VGT16 net/DD | QQQ16 net/DD | Σnet | Σnet−ΣnetREF |
|---|---|---|---|---|---|---|---|
| V_B2_inv_f025_s25 | {'floor': 0.0025, 'slope': 0.25} | 27,335/52,761 | -2,766/133,414 | 233,733/28,687 | 127,509/26,119 | 385,812 | +4,833 |
| V_B2_inv_f025_s50 | {'floor': 0.0025, 'slope': 0.5} | 26,602/52,761 | 24,365/107,541 | 225,680/29,493 | 93,608/29,423 | 370,254 | -10,724 |
| V_B2_inv_f025_s75 | {'floor': 0.0025, 'slope': 0.75} | 39,107/54,588 | 22,863/107,541 | 225,633/30,476 | 93,608/29,423 | 381,211 | +232 |
| V_B2_inv_f050_s25 | {'floor': 0.005, 'slope': 0.25} | 27,335/52,761 | 43,867/86,782 | 233,733/28,687 | 127,509/26,119 | 432,444 | +51,465 |
| V_B2_inv_f050_s50 **(frozen)** | {'floor': 0.005, 'slope': 0.5} | 26,602/52,761 | 54,819/72,722 | 228,043/28,687 | 93,608/29,423 | 403,072 | +22,093 |
| V_B2_inv_f050_s75 | {'floor': 0.005, 'slope': 0.75} | 39,107/54,588 | 49,352/76,688 | 228,043/28,687 | 93,608/29,423 | 410,110 | +29,131 |
| V_B2_inv_f100_s25 | {'floor': 0.01, 'slope': 0.25} | 28,385/51,712 | -13,674/94,601 | 233,733/28,687 | 127,509/26,119 | 375,954 | -5,025 |
| V_B2_inv_f100_s50 | {'floor': 0.01, 'slope': 0.5} | 27,651/51,712 | 9,093/68,203 | 228,043/28,687 | 94,685/28,840 | 359,473 | -21,506 |
| V_B2_inv_f100_s75 | {'floor': 0.01, 'slope': 0.75} | 40,156/53,538 | 1,038/75,064 | 228,043/28,687 | 94,685/28,840 | 363,923 | -17,056 |

- FLIP on QQQ99: vs-REF sign varies across the grid: B2_inv_f025_s25:-, B2_inv_f025_s50:-, B2_inv_f025_s75:-, B2_inv_f050_s25:+, B2_inv_f050_s50:+, B2_inv_f050_s75:+, B2_inv_f100_s25:-, B2_inv_f100_s50:-, B2_inv_f100_s75:-

## Grid C6_retrace (candidate: C6_retrace_38)

| config | params | VGT05 net/DD | QQQ99 net/DD | VGT16 net/DD | QQQ16 net/DD | Σnet | Σnet−ΣnetREF |
|---|---|---|---|---|---|---|---|
| V_C6_retr_30 | {'fraction': 0.3} | 35,116/50,606 | 12,697/111,488 | 208,575/28,687 | 133,889/27,499 | 390,278 | +9,299 |
| V_C6_retr_34 | {'fraction': 0.34} | 22,432/51,144 | 46,841/77,344 | 208,575/28,687 | 131,321/27,251 | 409,170 | +28,191 |
| V_C6_retr_38 **(frozen)** | {'fraction': 0.38} | 22,980/50,127 | 64,997/70,917 | 215,011/28,687 | 134,055/26,851 | 437,043 | +56,064 |
| V_C6_retr_42 | {'fraction': 0.42} | 20,410/50,956 | 53,758/76,737 | 213,441/28,687 | 123,813/29,723 | 411,421 | +30,443 |
| V_C6_retr_46 | {'fraction': 0.46} | 23,961/50,112 | 56,787/76,737 | 181,579/28,687 | 134,008/23,564 | 396,336 | +15,357 |
| V_C6_retr_50 | {'fraction': 0.5} | 25,682/50,080 | 59,300/76,737 | 204,370/28,687 | 132,129/23,564 | 421,481 | +40,502 |

- FLIP on VGT05: vs-REF sign varies across the grid: C6_retr_30:+, C6_retr_34:-, C6_retr_38:-, C6_retr_42:-, C6_retr_46:-, C6_retr_50:-
- FLIP on QQQ99: vs-REF sign varies across the grid: C6_retr_30:-, C6_retr_34:+, C6_retr_38:+, C6_retr_42:+, C6_retr_46:+, C6_retr_50:+
- FLIP on VGT16: vs-REF sign varies across the grid: C6_retr_30:+, C6_retr_34:+, C6_retr_38:+, C6_retr_42:+, C6_retr_46:-, C6_retr_50:+
- FLIP on QQQ16: vs-REF sign varies across the grid: C6_retr_30:+, C6_retr_34:-, C6_retr_38:+, C6_retr_42:-, C6_retr_46:+, C6_retr_50:0

## Grid C11_rebound_discount (candidate: C11_graduated)

| config | params | VGT05 net/DD | QQQ99 net/DD | VGT16 net/DD | QQQ16 net/DD | Σnet | Σnet−ΣnetREF |
|---|---|---|---|---|---|---|---|
| V_C11_r106_d100 | {'rebound': 1.06, 'stage2_discount': 0.01} | 40,598/56,219 | 65,097/64,522 | 176,077/28,687 | 132,242/23,564 | 414,015 | +33,036 |
| V_C11_r106_d150 | {'rebound': 1.06, 'stage2_discount': 0.015} | 42,538/54,279 | 22,895/94,925 | 177,898/28,687 | 132,242/23,564 | 375,573 | -5,405 |
| V_C11_r106_d200 | {'rebound': 1.06, 'stage2_discount': 0.02} | 24,397/54,279 | 32,201/88,318 | 177,898/28,687 | 132,242/23,564 | 366,738 | -14,240 |
| V_C11_r108_d100 | {'rebound': 1.08, 'stage2_discount': 0.01} | 40,598/56,219 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 | 410,389 | +29,410 |
| V_C11_r108_d150 **(frozen)** | {'rebound': 1.08, 'stage2_discount': 0.015} | 42,538/54,279 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 | 412,328 | +31,349 |
| V_C11_r108_d200 | {'rebound': 1.08, 'stage2_discount': 0.02} | 24,397/54,279 | 59,247/70,302 | 182,094/28,687 | 132,242/23,564 | 397,980 | +17,001 |
| V_C11_r110_d100 | {'rebound': 1.1, 'stage2_discount': 0.01} | 40,598/56,219 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 | 410,389 | +29,410 |
| V_C11_r110_d150 | {'rebound': 1.1, 'stage2_discount': 0.015} | 42,538/54,279 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 | 412,328 | +31,349 |
| V_C11_r110_d200 | {'rebound': 1.1, 'stage2_discount': 0.02} | 24,397/54,279 | 59,247/70,302 | 182,094/28,687 | 132,242/23,564 | 397,980 | +17,001 |

- FLIP on VGT05: vs-REF sign varies across the grid: C11_r106_d100:+, C11_r106_d150:+, C11_r106_d200:-, C11_r108_d100:+, C11_r108_d150:+, C11_r108_d200:-, C11_r110_d100:+, C11_r110_d150:+, C11_r110_d200:-
- FLIP on QQQ99: vs-REF sign varies across the grid: C11_r106_d100:+, C11_r106_d150:-, C11_r106_d200:-, C11_r108_d100:+, C11_r108_d150:+, C11_r108_d200:+, C11_r110_d100:+, C11_r110_d150:+, C11_r110_d200:+
