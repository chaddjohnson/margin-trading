<!-- Rendered by `npm run vgt-robustness -- report` from templates/TRADES_YEARS_AND_REGIMES.md and results/analysis.json; edit the template, not this file. -->
# Trades, years and regimes

All ledgers are the base fixed runs: one $100,000 lot, 5 bps per side, 11% interest, on 2016-01-04 → 2026-10-13.

**Sources:**
- S: fresh, `results/detail/s_VGT-primary_cost_base_fixed/`.
- B4/B5: the prior audit's stored base ledgers (reproduced exactly).

**The chronological ledger of S's funded lots:**
- `results/T_trades_VGT-primary_fixed.csv` (and `.json`);
- the portfolio-mode ledger, `results/T_trades_VGT-primary_portfolio.csv`.

Year and regime figures are marked-to-market **attribution** within one continuous run. Leaving a year out is an
accounting subtraction, not an executable backtest.

## 1. Trade quality

| Ledger (fixed, base) | Lots | Won / lost | Win rate | Gross | Interest | Friction | Net | Profit factor | Median lot | Best lot | Worst lot | Top 1 / 3 / 5 / 10 share | Median hold (sessions) | Lot-days |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S (VGT-primary standalone) | 21 | 15 / 6 | 71% | $214,872 | $36,405 | $2,206 | $176,260 | 13.81 | $2,295 | $51,264 | −$3,544 | 29% / 66% / 83% / 104% | 18 | 1,208 |
| B4 (all books) | 76 | 47 / 29 | 62% | $339,024 | $47,014 | $7,766 | $284,245 | 5.83 | $634 | $51,264 | −$10,094 | 18% / 41% / 53% / 74% | 4 | 1,560 |
| B4: VGT book only | 14 | 11 / 3 | 79% | $198,091 | $30,077 | $1,498 | $166,516 | 25.86 | $6,164 | $51,264 | −$3,284 | 31% / 70% / 88% / 104% | 23 | 998 |
| B5 (all books) | 94 | 61 / 33 | 65% | $548,708 | $52,830 | $9,670 | $486,208 | 7.29 | $1,622 | $44,315 | −$8,258 | 9% / 23% / 34% / 55% | 4 | 1,753 |
| B5: VGT book only | 12 | 10 / 2 | 83% | $136,919 | $25,556 | $1,268 | $110,095 | 33.24 | $2,804 | $44,315 | −$2,239 | 40% / 75% / 96% / 103% | 28 | 848 |

**S's profit rests on a few large trailing-stop winners:**
- **Lots:** 21 lots, 15 won.
- **Concentration:** the best lot earns $51,264. The top 1 / 3 / 5 lots are 29.1% / 65.7% /
  83.1% of total net. The top 10 exceed 100% (104.4%): the other 11 lots lose money together.
- **Without the winners:** without the top 3 the total would be $60,431, and without the top 5 $29,812
  (descriptive only).
- **For comparison:** B4's top 3 lots are 40.7% of its net, and B5's 23.3%.
- **Conclusion:** S is the most trade-concentrated of the three. Its VGT book inside the pools is just as concentrated;
  the pools dilute it with other books.

**Exit reasons (S):**

| Exit reason | Lots | Won | Net |
|---|---:|---:|---:|
| trailing stop | 12 | 12 | $169,083 |
| trailing stop gap | 2 | 2 | $20,902 |
| maximum hold | 7 | 1 | −$13,724 |

- **Winners:** every stop exit was profitable, 14 of 14. The net-profit stop
  activates only once a stop fill would net a profit.
- **Losers:** all six losing lots are maximum-hold exits (6 losers, 1 winner).
  D1 has no protective stop. A lot's loss is bounded only by the 8-day hold (and the 2.9% buffer from day 8).
- **Worst figures:**
  - worst realised lot −$3,544;
  - worst intraday excursion (MAE, from legally observable minute bars) −10.8%, which is
    −$10,867 at $100,000 before interest;
  - worst minute mark of a lot, net of interest, −$11,047.
- **Typical excursions:** median MAE −1.6%, median MFE 11.1%.
- **Profit factor:** 13.81.
- **Holding:** median 18 sessions, maximum 139.

**S's full ledger:**

| # | Entry (ET) | Exit (ET) | Entry fill | Exit fill | Reason | Gross | Interest | Friction | Net | Cumulative | MAE | MFE | Held (sessions) |
|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2018-12-21 12:35 | 2019-05-13 09:54 | 160.42 | 200.02 | trailing stop | $24,672 | $4,310 | $112 | $20,250 | $20,250 | −3.6% | 34.5% | 96 |
| 2 | 2019-08-05 15:12 | 2020-02-24 09:30 | 203.65 | 252.18 | trailing stop gap | $23,819 | $6,118 | $112 | $17,589 | $37,839 | −0.2% | 34.4% | 139 |
| 3 | 2020-02-28 09:32 | 2020-03-06 09:30 | 226.94 | 232.86 | trailing stop | $2,608 | $211 | $101 | $2,295 | $40,134 | −0.9% | 10.7% | 5 |
| 4 | 2020-03-12 09:32 | 2020-03-20 09:31 | 205.22 | 198.64 | maximum hold | −$3,205 | $241 | $98 | −$3,544 | $36,590 | −10.8% | 7.1% | 6 |
| 5 | 2020-03-23 09:33 | 2020-04-01 12:49 | 185.73 | 203.18 | trailing stop | $9,391 | $271 | $105 | $9,015 | $45,606 | −3.4% | 18.0% | 7 |
| 6 | 2020-04-02 09:33 | 2020-09-04 09:30 | 202.36 | 315.87 | trailing stop | $56,063 | $4,671 | $128 | $51,264 | $96,870 | −1.2% | 68.4% | 108 |
| 7 | 2020-10-28 10:09 | 2021-02-23 09:38 | 304.01 | 354.79 | trailing stop | $16,695 | $3,556 | $108 | $13,031 | $109,900 | −3.0% | 25.9% | 79 |
| 8 | 2021-03-05 11:31 | 2021-05-11 09:30 | 337.17 | 355.50 | trailing stop gap | $5,435 | $2,019 | $103 | $3,313 | $113,214 | −0.2% | 15.3% | 46 |
| 9 | 2022-03-14 14:35 | 2022-04-07 12:45 | 367.27 | 398.20 | trailing stop | $8,417 | $723 | $104 | $7,590 | $120,804 | −0.4% | 17.0% | 18 |
| 10 | 2022-04-26 15:45 | 2022-05-06 09:31 | 366.26 | 363.42 | maximum hold | −$775 | $301 | $100 | −$1,176 | $119,628 | −1.1% | 5.7% | 8 |
| 11 | 2022-05-12 09:42 | 2022-06-10 09:36 | 332.71 | 342.66 | trailing stop | $2,988 | $874 | $101 | $2,013 | $121,640 | −1.7% | 11.1% | 20 |
| 12 | 2022-06-13 09:34 | 2022-06-21 09:31 | 328.51 | 325.72 | maximum hold | −$850 | $241 | $100 | −$1,191 | $120,449 | −4.5% | 2.1% | 5 |
| 13 | 2022-06-22 09:32 | 2022-07-01 09:31 | 324.92 | 326.24 | maximum hold | $406 | $271 | $100 | $35 | $120,484 | −1.2% | 6.6% | 7 |
| 14 | 2022-07-05 09:34 | 2022-08-26 15:12 | 322.29 | 363.01 | trailing stop | $12,629 | $1,567 | $106 | $10,956 | $131,440 | −0.2% | 21.5% | 38 |
| 15 | 2022-09-16 10:03 | 2022-09-26 09:31 | 329.27 | 319.77 | maximum hold | −$2,884 | $301 | $99 | −$3,284 | $128,156 | −4.2% | 3.3% | 6 |
| 16 | 2022-10-10 11:14 | 2022-11-03 09:32 | 306.40 | 310.69 | trailing stop | $1,399 | $723 | $101 | $575 | $128,731 | −4.8% | 9.4% | 18 |
| 17 | 2022-11-04 09:54 | 2022-12-15 11:15 | 306.91 | 331.37 | trailing stop | $7,967 | $1,236 | $104 | $6,628 | $135,359 | −1.1% | 16.5% | 28 |
| 18 | 2025-04-04 09:46 | 2025-04-10 12:17 | 491.58 | 498.62 | trailing stop | $1,432 | $181 | $101 | $1,151 | $136,510 | −8.3% | 9.4% | 4 |
| 19 | 2025-04-11 09:36 | 2025-04-21 09:31 | 507.00 | 497.68 | maximum hold | −$1,838 | $301 | $99 | −$2,239 | $134,271 | −2.0% | 6.0% | 5 |
| 20 | 2025-04-22 09:38 | 2025-11-07 10:45 | 497.19 | 748.08 | trailing stop | $50,438 | $5,997 | $125 | $44,315 | $178,586 | −0.0% | 62.3% | 139 |
| 21 | 2025-11-21 09:49 | 2026-02-05 09:31 | 714.53 | 714.99 | maximum hold | $65 | $2,290 | $100 | −$2,326 | $176,260 | −1.6% | 9.4% | 50 |

Prices after 2026-04-21 are in the forward-adjusted pre-split units of the canonical data (VGT split 8:1 that day).

**Limitations:**
- MAE/MFE come from one-minute OHLCV, not quotes. A gap is seen at the next bar's open.
- A stop fill at the stop level assumes the stop traded.

## 2. Years

| Year | Note | S fixed MTM (lots entered) | B4 fixed MTM (lots) | B5 fixed MTM (lots) | S portfolio | B4 portfolio | B5 portfolio | C0 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 2016 | no trading (arming 2017-06-15) | +$0 (0) | +$0 (0) | +$0 (0) | +11.5% | +11.5% | +11.5% | +11.5% |
| 2017 | partial eligibility | +$0 (0) | +$0 (0) | +$0 (0) | +31.3% | +31.3% | +31.3% | +31.3% |
| 2018 |  | +$3,642 (1) | +$3,642 (1) | +$3,642 (1) | +1.7% | +1.7% | +1.7% | +0.9% |
| 2019 |  | +$32,319 (1) | +$32,319 (1) | +$32,319 (1) | +46.4% | +46.4% | +46.4% | +38.7% |
| 2020 |  | +$75,296 (5) | +$77,765 (14) | +$165,888 (32) | +54.8% | +55.1% | +88.4% | +39.3% |
| 2021 |  | +$1,957 (1) | +$15,696 (6) | +$15,696 (6) | +31.8% | +35.4% | +35.5% | +31.2% |
| 2022 |  | +$22,145 (9) | +$57,017 (20) | +$84,884 (21) | −26.7% | −21.7% | −17.4% | −29.6% |
| 2023 |  | +$0 (0) | +$55,757 (29) | +$86,060 (21) | +40.8% | +56.0% | +64.9% | +41.1% |
| 2024 |  | +$0 (0) | −$419 (1) | +$24,162 (2) | +32.5% | +32.5% | +38.9% | +32.4% |
| 2025 |  | +$47,463 (4) | +$45,679 (4) | +$45,679 (4) | +30.3% | +29.9% | +29.9% | +21.9% |
| 2026 | partial: to 2026-10-13 | −$6,561 (0) | −$3,211 (0) | +$27,878 (6) | +24.6% | +25.0% | +32.1% | +26.5% |

- **2016–2019 are identical across the three.** Until 2020 only VGT ever held the pools' slot.
- **The divergence is all 2020 onwards.** From 2020 the other books fill time VGT leaves idle, and in 2020 GDX takes
  part of VGT's slot in B5 (`BASELINE_AND_COMPARABILITY.md` §4).

| Ledger | Top year (share) | Top two years | Worst year (eligible, with activity) | Negative years | Years with no lot entered (2017+) | Named years (share of total) |
|---|---|---|---|---|---|---|
| S (VGT-primary standalone) | 2020 42.7% | 2020 + 2025 69.6% | 2026 −$6,561 | 2026 | 2017, 2023, 2024, 2026 | 2020 42.7%; 2022 12.6%; 2023 0.0%; 2025 26.9%; 2026 −3.7% |
| B4 | 2020 27.4% | 2020 + 2022 47.4% | 2026 −$3,211 | 2024, 2026 | 2017, 2026 | 2020 27.4%; 2022 20.1%; 2023 19.6%; 2025 16.1%; 2026 −1.1% |
| B5 | 2020 34.1% | 2020 + 2023 51.8% | 2018 +$3,642 | none | 2017 | 2020 34.1%; 2022 17.5%; 2023 17.7%; 2025 9.4%; 2026 5.7% |

**S's dependence on a few years:**
- **Concentration:**
  - 2020 is 42.7% of S's total (+$75,296);
  - 2020 + 2025 are 69.6%;
  - 2022 contributes 12.6%.
- **Idle years.** S entered **no lot** in 2017, 2023, 2024, 2026. 2017 is partial eligibility. The 2026 lot was entered
  in November 2025, and the partial 2026 is −$6,561.
- **No mechanical regime holds more than half of S's net.** The largest is 18.9%; for B4 and B5
  it is 39.4% and 37.9%.
- **But S's profit is clustered in time.**
  - The calendar years 2020 and 2025 dominate.
  - The two years without entries mean that long stretches carry no exposure and no evidence.
- **The pools are steadier through 2023–2024.** They spread across more years: B5's 2023 is +$86,060 and its 2026
  partial is +$27,878.

**Leave-one-year-out** (attribution only: the total minus that year's marked-to-market change):

| Year left out (attribution only) | S | B4 | B5 |
|---|---:|---:|---:|
| 2018 | $172,618 | $280,602 | $482,565 |
| 2019 | $143,942 | $251,926 | $453,889 |
| 2020 | $100,964 | $206,479 | $320,320 |
| 2021 | $174,304 | $268,549 | $470,512 |
| 2022 | $154,115 | $227,228 | $401,323 |
| 2023 | $176,260 | $228,487 | $400,147 |
| 2024 | $176,260 | $284,663 | $462,046 |
| 2025 | $128,798 | $238,566 | $440,529 |
| 2026 | $182,822 | $287,456 | $458,330 |

## 3. Mechanical regimes

These are the prior protocol's VOOG windows, fixed before any audit run: R1 2018 Q4, R2 2020 crash, R3 2022 bear,
R4 2025 selloff. Each has a stress (peak → trough) and a rebound (trough → recovery), plus calendar 2023, the partial
2026 and the ≥ 10% corrections K1–K3 for context. "S − C0" etc. is the portfolio's return minus C0's in the same window.

| Window | From → to | S fixed (lots) | B4 fixed | B5 fixed | S worst MAE | C0 portfolio | S − C0 | B4 − C0 | B5 − C0 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| R1s 2018 Q4 selloff — stress | 2018-10-01 → 2018-12-24 | −$3,636 (1) | −$3,636 | −$3,636 | −3.6% | −22.0% | −0.6 pp | −0.6 pp | −0.6 pp |
| R1r 2018 Q4 selloff — rebound | 2018-12-24 → 2019-04-23 | +$32,932 (0) | +$32,932 | +$32,932 | — | +32.1% | +7.2 pp | +7.2 pp | +7.2 pp |
| R2s 2020 crash — stress | 2020-02-19 → 2020-03-23 | −$11,961 (3) | −$25,268 | +$32,609 | −10.8% | −31.6% | −1.2 pp | −3.0 pp | +4.8 pp |
| R2r 2020 crash — rebound | 2020-03-23 → 2020-07-02 | +$45,194 (1) | +$45,194 | +$85,327 | −1.2% | +49.1% | +10.6 pp | +10.6 pp | +24.4 pp |
| R3s 2022 bear market — stress | 2021-12-27 → 2022-10-14 | +$12,958 (8) | +$53,008 | +$59,578 | −4.8% | −33.9% | +1.5 pp | +6.9 pp | +7.9 pp |
| R3r 2022 bear market — rebound | 2022-10-14 → 2024-03-20 | +$9,187 (1) | +$58,975 | +$124,776 | −1.1% | +64.1% | +2.6 pp | +18.7 pp | +42.3 pp |
| R4s 2025 selloff — stress | 2025-02-19 → 2025-04-08 | −$4,483 (1) | −$4,483 | −$4,483 | −8.3% | −24.6% | −0.6 pp | −0.5 pp | −0.4 pp |
| R4r 2025 selloff — rebound | 2025-04-08 → 2025-06-24 | +$31,479 (2) | +$31,479 | +$31,479 | −2.0% | +33.7% | +6.8 pp | +6.6 pp | +6.5 pp |
| Y2023 2023 recovery (calendar 2023) | 2022-12-30 → 2023-12-29 | +$0 (0) | +$55,757 | +$86,060 | — | +41.1% | −0.3 pp | +15.0 pp | +23.8 pp |
| Y2026 2026 partial (to 2026-10-13) | 2025-12-31 → 2026-10-13 | −$6,561 (0) | −$3,211 | +$27,878 | — | +26.5% | −1.9 pp | −1.5 pp | +5.6 pp |
| K1 ≥10% correction 2020-09 | 2020-09-02 → 2020-09-23 | −$11,249 (0) | −$16,011 | −$4,495 | — | −11.7% | −0.8 pp | −1.7 pp | −0.8 pp |
| K2 ≥10% correction 2024-07/08 | 2024-07-10 → 2024-08-05 | +$0 (0) | +$0 | +$0 | — | −14.0% | +0.0 pp | +0.1 pp | +0.1 pp |
| K3 ≥10% correction 2025-10 → 2026-03 | 2025-10-29 → 2026-03-30 | −$13,415 (1) | −$11,849 | −$7,608 | −1.6% | −15.1% | −1.2 pp | −0.9 pp | −0.1 pp |

**By regime (stress + rebound together, fixed):**

| Regime (stress + rebound) | S | B4 | B5 |
|---|---:|---:|---:|
| R1 | +$29,296 | +$29,296 | +$29,296 |
| R2 | +$33,233 | +$19,926 | +$117,936 |
| R3 | +$22,145 | +$111,984 | +$184,354 |
| R4 | +$26,996 | +$26,996 | +$26,996 |

**Readings:**
- **R1 and R4 are identical for all three.** VGT alone traded then.
- **R2, the 2020 crash.**
  - In the stress leg, S lost less than B4. B4's March-2020 KRE lots lost more than the VGT lot they displaced
    (`BASELINE_AND_COMPARABILITY.md` §4).
  - B5 gained, because GDX held the slot.
- **R3, the 2022 bear and its rebound.**
  - S earned little across the window.
  - The pools earned much more, through XBI/XRT/KRE/GDX lots (B4 and B5) and the 2023 rebound. Those are the frozen
    2022 gains the prior audit found **not** reproduced by the pools' neighbours (median about $6–8k).
  - S's 2022 lots are VGT-only and small.
- **Portfolio excess over C0** is small in every stress leg for S, but positive in its rebounds.

## 4. The VGT book inside the pools (the prior ablation)

| Pool | VGT funded lots (of S’s 21) | VGT funded net | VGT share of pool net | Pool without VGT: fixed net (lots) | VGT fixed increment | Pool without VGT: end equity | VGT portfolio increment | Without VGT: daily % DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | 14 | $166,516 | 58.6% | $263,483 (98) | +$20,762 | $3,701,800 | −$93,316 | 34.01% |
| B5 | 12 | $110,095 | 22.6% | $439,596 (98) | +$46,612 | $5,126,846 | +$284,131 | 29.01% |

**B4:**
- VGT is the largest funded book ($166,516). Its **incremental** contribution, the pool against the pool
  without VGT, is only +$20,762 in fixed mode and −$93,316 in the portfolio.
  Removing VGT frees the slot for other books' signals. This is the prior `ETF_ABLATION.md` finding, reproduced
  from its records.
- It does **not** show that S is ineffective. S has no other books to displace, and alone it earns $176,260.
  It shows that inside B4 VGT's slot time is nearly as valuable to the other books as to VGT.

**B5:** VGT's increment is positive in both modes: +$46,612 fixed and +$284,131
portfolio.

## 5. In-sample uncertainty (paired stationary bootstrap)

The bootstrap resamples daily changes of the fixed strategy mark from arming to the end:
- mean block length 21 sessions;
- 5,000 resamples;
- seed `deriveSeed('vgt-standalone-vs-pooled-robustness-v1', 'bootstrap')`;
- the S, B4 and B5 series resampled on the same days.

It assumes stationarity and dependence shorter than the blocks, and it reuses the inspected history. It is **not**
validation.

| Series (daily fixed strategy-mark changes) | Actual total | Resampled median | P5 – P95 | P25 – P75 | Share ≤ 0 |
|---|---:|---:|---:|---:|---:|
| S | $176,260 | $175,187 | $94,732 – $263,547 | $140,689 – $208,930 | 0.02% |
| B4 | $284,245 | $282,320 | $185,844 – $380,992 | $241,680 – $323,784 | 0.00% |
| B5 | $486,208 | $478,541 | $317,451 – $670,936 | $410,694 – $549,970 | 0.00% |
| B4 − S | $107,984 | $106,631 | $38,823 – $176,276 | $78,240 – $134,574 | 0.36% |
| B5 − S | $309,947 | $304,170 | $168,045 – $462,251 | $245,323 – $364,271 | 0.00% |

**Findings:**
- **S's total is positive in all but 0.02% of resamples** (P5 $94,732).
- **The B5 − S difference is positive in every one of the 5,000 resamples** (P5 $168,045).
- **B4 − S is positive in all but 0.36%.**

On this history, then, the pools' extra profit over S is not a few-day accident. But the bootstrap cannot see the
selection of the pools' parameters on this same history.
