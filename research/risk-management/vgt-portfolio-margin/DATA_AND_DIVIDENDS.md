# Data and dividends

All inputs are local files; no network source, paid data or brokerage record was used. Checksums are in
[`data/manifest.json`](data/manifest.json) and [`CHECKSUMS.txt`](CHECKSUMS.txt).

## Prices

| File | Use | Coverage | Basis |
|---|---|---|---|
| `data/VGT/VGT-2016-2025-1-minute.csv` | strategy signals and fills, VGT marks (core, lot, DRIP) | 2016-01-04 → 2025-10-13, 2,459 sessions | Alpaca, raw, UTC minute-start bars |
| `data/VOOG/VOOG-2016-2025-1-minute.csv` | VOOG marks, VOOG price at each sizing decision | 2016-01-04 → 2025-10-13, 2,459 sessions | Alpaca, raw, UTC minute-start bars |
| `data/VGT/VGT-2005-2026-2.csv` | distribution derivation only | 2005 → 2026 | daily, split- and dividend-adjusted |
| `data/VOOG/VOOG-2016-2026.csv` | distribution derivation only | 2016-10-07 → 2026 | daily, split- and dividend-adjusted |

- Both minute files are grouped into New York sessions by the same `groupMarketSessions` that the strategy
  uses (regular session plus the closing-auction print; early closes and DST handled; extended hours
  dropped: 3,452 VOOG rows).
- **The two funds have identical session sets.** The daily close is the closing-auction print, or the last
  regular trade when the minute starting at the close has no trade.
- VOOG is thinly traded: a median of 149 of 390 minutes trade, and **403 sessions have no closing print**,
  including **2016-01-04**. VOOG's initial price, 101.89, is therefore that day's last regular trade, not an
  official close. VGT's, 106.61, is its closing print.
- **Splits: none in the window.** A split would appear as a large step in the raw/adjusted ratio. The only
  steps are dividend-sized (≤ 0.45%), and the largest overnight raw moves (VOOG −11.2%, VGT −12.8%,
  2020-03-16) are real market moves.
- **The adjusted files are used for nothing but the distribution derivation.** Every price in the account
  is raw, so a dividend cannot be counted both in a price series and as a payment.

## Distributions

You had no dividend records, so the history is recovered from the files themselves
(`scripts/distributions.ts`).

- The adjusted daily close equals the raw close times a factor that is constant between ex-dates. On an
  ex-date the factor before it equals the factor after times `1 − D / C`.
- The raw/adjusted ratio therefore steps down at each ex-date, and the step gives the amount:

  `D = C_before × (1 − ratio_after / ratio_before)`

  where `C_before` is the raw close of the previous session. Each ratio level is the median of 5 sessions,
  and the exact ex-date is the session near the step's center with the sharpest 3-session change.

How good this is:
- **Coverage:** exactly 4 distributions a year for each fund, 3 in 2025 through 2025-10-13: 39 each.
- **Signal:** every derived step is at least 28× the surrounding day-to-day ratio noise.
- **Ex-dates:** the 36 quarters derived for both funds share Vanguard's quarterly schedule. 23 have the same
  ex-date and the rest differ by up to 10 days, mostly a later VOOG date in December.
- **Amounts:** the yields are plausible and decline over time (VOOG from about 1.4% to about 0.5% a year,
  VGT from about 1.4% to about 0.6%).
- **Precision:** the amounts depend on the provider's adjustment convention (`1 − D / C_before` is the
  standard one) and on the rounding of the adjusted prices. Treat them as accurate to about ±1% of each
  distribution, not to the cent.

### Estimated, not derived

| What | Records | Method | Effect |
|---|---|---|---|
| VOOG distributions before 2016-10-14 (Mar, Jun, Sep 2016) | 3 | ex-date: VGT's ex-date in that quarter; amount: VOOG's yield in the same quarter of 2017 × VOOG's raw close before the ex-date | $2,510 of the $89,857 core dividends, the same in both books, so **no effect on the uplift** |
| Every payment date | 78 | ex-date + 3 sessions before 2024-05-28 (T+2 settlement), + 2 sessions from then (T+1); Vanguard ETFs pay a few business days after the ex-date | moves each reinvestment by a day or two; receivables keep NAV whole until then |
| DRIP price | all | the pay date's close (closing print, else the last regular trade), a price-based proxy | not Vanguard's actual reinvestment fill |

| Year | VOOG distributions | VOOG $ / share | VOOG yield (sum) | VGT distributions | VGT $ / share | VGT yield (sum) | Estimated amounts |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2016 | 4 | $1.5563 | 1.45% | 4 | $1.5788 | 1.38% | 3 |
| 2017 | 4 | $1.7553 | 1.38% | 4 | $1.6487 | 1.12% | 0 |
| 2018 | 4 | $1.8045 | 1.22% | 4 | $2.1567 | 1.16% | 0 |
| 2019 | 4 | $2.2061 | 1.36% | 4 | $2.7241 | 1.26% | 0 |
| 2020 | 4 | $2.0362 | 1.06% | 4 | $2.9155 | 1.07% | 0 |
| 2021 | 4 | $1.6105 | 0.61% | 4 | $2.9405 | 0.73% | 0 |
| 2022 | 4 | $1.9682 | 0.88% | 4 | $2.9114 | 0.84% | 0 |
| 2023 | 4 | $3.0456 | 1.22% | 4 | $3.1239 | 0.74% | 0 |
| 2024 | 4 | $1.7913 | 0.52% | 4 | $3.7131 | 0.65% | 0 |
| 2025 | 3 | $1.5931 | 0.41% | 3 | $2.2914 | 0.35% | 0 |

## Entitlement and reinvestment conventions

- **Entitlement** is by the shares held at the close before the ex-date, in three inventories: core shares,
  the open strategy lot, and strategy-derived DRIP shares.
  - A lot bought on the ex-date (at 15:59) is not entitled.
  - A lot held overnight into the ex-date is entitled, even if it is sold that day or before the payment.
- **On the ex-date** a receivable of `D × shares` is booked, so NAV doesn't drop mechanically when the raw
  price goes ex.
- **On the payment date** the receivable buys shares of the same ETF at that day's close.
  - Shares from core dividends go to the core inventory.
  - Shares from the lot's dividends, and from strategy-derived DRIP shares, go to a separate long-term
    "strategy DRIP" inventory. They are never added to the strategy's financed lot, so its stop and its
    15-day exit never see them.
- **The core-only benchmark** books exactly the same core distributions. The validator checks every one.

Distributions the strategy lots were entitled to (the lot held overnight into the ex-date):

| Ex-date | Lot entered | Entitled shares | Receivable | Paid | Reinvest price | DRIP shares (strategy inventory) |
|---|---:|---:|---:|---:|---:|---:|
| 2016-03-21 | 2016-02-05 | 760.794 | $314 | 2016-03-24 | 107.30 | 2.9234 |
| 2016-06-21 | 2016-02-05 | 760.794 | $259 | 2016-06-24 | 104.69 | 2.4759 |
| 2018-06-28 | 2018-03-28 | 708.478 | $359 | 2018-07-03 | 181.26 | 1.9780 |
| 2018-09-24 | 2018-03-28 | 708.478 | $455 | 2018-09-27 | 201.66 | 2.2544 |
| 2019-03-21 | 2019-01-03 | 715.814 | $431 | 2019-03-26 | 199.04 | 2.1633 |
| 2019-06-21 | 2019-06-03 | 724.171 | $467 | 2019-06-26 | 209.51 | 2.2310 |
| 2020-03-10 | 2020-02-25 | 692.850 | $588 | 2020-03-13 | 219.63 | 2.6767 |
| 2020-06-22 | 2020-04-02 | 689.392 | $463 | 2020-06-25 | 276.08 | 1.6764 |
| 2020-09-11 | 2020-09-08 | 719.664 | $510 | 2020-09-16 | 304.53 | 1.6755 |
| 2020-12-17 | 2020-10-28 | 713.848 | $490 | 2020-12-22 | 353.77 | 1.3855 |
| 2021-03-26 | 2021-03-04 | 712.094 | $451 | 2021-03-31 | 358.49 | 1.2580 |
| 2022-03-24 | 2022-03-07 | 714.690 | $487 | 2022-03-29 | 428.92 | 1.1350 |
| 2022-06-23 | 2022-06-13 | 718.015 | $427 | 2022-06-28 | 330.98 | 1.2900 |
| 2022-09-28 | 2022-09-15 | 731.675 | $559 | 2022-10-03 | 316.70 | 1.7652 |
| 2022-12-15 | 2022-11-04 | 724.033 | $631 | 2022-12-20 | 322.08 | 1.9592 |
| 2023-03-24 | 2023-01-04 | 725.382 | $560 | 2023-03-29 | 375.52 | 1.4917 |
| 2023-06-29 | 2023-01-04 | 725.382 | $490 | 2023-07-05 | 438.67 | 1.1178 |
| 2023-09-28 | 2023-09-21 | 715.803 | $631 | 2023-10-03 | 410.76 | 1.5356 |
| 2023-12-19 | 2023-10-20 | 715.636 | $569 | 2023-12-22 | 483.61 | 1.1756 |
| 2024-03-22 | 2023-10-20 | 715.636 | $901 | 2024-03-27 | 525.08 | 1.7152 |
| 2024-06-28 | 2024-04-19 | 725.443 | $553 | 2024-07-02 | 586.12 | 0.9432 |
| 2024-09-27 | 2024-09-05 | 730.820 | $670 | 2024-10-01 | 571.78 | 1.1719 |
| 2024-12-18 | 2024-09-05 | 730.820 | $567 | 2024-12-20 | 631.61 | 0.8975 |
| 2025-06-26 | 2025-04-15 | 750.300 | $527 | 2025-06-30 | 663.28 | 0.7949 |
| 2025-09-24 | 2025-04-15 | 750.300 | $645 | 2025-09-26 | 738.70 | 0.8727 |

## Every distribution

| ETF | Ex-date | Pay date (est.) | $ / share | Yield | Amount | Step ÷ noise |
|---|---:|---:|---:|---:|---:|---:|
| VGT | 2016-03-21 | 2016-03-24 | $0.4123 | 0.382% | derived | 30 |
| VOOG | 2016-03-21 | 2016-03-24 | $0.2600 | 0.253% | estimated | — |
| VGT | 2016-06-21 | 2016-06-24 | $0.3407 | 0.315% | derived | 32 |
| VOOG | 2016-06-21 | 2016-06-24 | $0.3932 | 0.377% | estimated | — |
| VGT | 2016-09-20 | 2016-09-23 | $0.4020 | 0.338% | derived | 34 |
| VOOG | 2016-09-20 | 2016-09-23 | $0.4090 | 0.378% | estimated | — |
| VGT | 2016-12-14 | 2016-12-19 | $0.4238 | 0.342% | derived | 44 |
| VOOG | 2016-12-20 | 2016-12-23 | $0.4941 | 0.445% | derived | 73 |
| VOOG | 2017-03-22 | 2017-03-27 | $0.2963 | 0.253% | derived | 38 |
| VGT | 2017-03-24 | 2017-03-29 | $0.3576 | 0.266% | derived | 41 |
| VGT | 2017-06-28 | 2017-07-03 | $0.4186 | 0.295% | derived | 48 |
| VOOG | 2017-06-28 | 2017-07-03 | $0.4654 | 0.377% | derived | 65 |
| VGT | 2017-09-27 | 2017-10-02 | $0.4308 | 0.288% | derived | 47 |
| VOOG | 2017-09-27 | 2017-10-02 | $0.4825 | 0.378% | derived | 73 |
| VGT | 2017-12-14 | 2017-12-19 | $0.4416 | 0.267% | derived | 41 |
| VOOG | 2017-12-19 | 2017-12-22 | $0.5111 | 0.368% | derived | 40 |
| VGT | 2018-03-16 | 2018-03-21 | $0.3705 | 0.203% | derived | 44 |
| VOOG | 2018-03-26 | 2018-03-29 | $0.3629 | 0.265% | derived | 48 |
| VGT | 2018-06-28 | 2018-07-03 | $0.5061 | 0.282% | derived | 79 |
| VOOG | 2018-06-28 | 2018-07-03 | $0.3893 | 0.268% | derived | 28 |
| VGT | 2018-09-24 | 2018-09-27 | $0.6417 | 0.319% | derived | 61 |
| VOOG | 2018-09-26 | 2018-10-01 | $0.6610 | 0.417% | derived | 81 |
| VGT | 2018-12-13 | 2018-12-18 | $0.6385 | 0.359% | derived | 71 |
| VOOG | 2018-12-13 | 2018-12-18 | $0.3912 | 0.273% | derived | 42 |
| VGT | 2019-03-21 | 2019-03-26 | $0.6015 | 0.301% | derived | 57 |
| VOOG | 2019-03-25 | 2019-03-28 | $0.4308 | 0.282% | derived | 58 |
| VGT | 2019-06-21 | 2019-06-26 | $0.6455 | 0.303% | derived | 47 |
| VOOG | 2019-06-27 | 2019-07-02 | $0.5860 | 0.365% | derived | 43 |
| VGT | 2019-09-26 | 2019-10-01 | $0.8298 | 0.382% | derived | 92 |
| VOOG | 2019-09-26 | 2019-10-01 | $0.5954 | 0.366% | derived | 46 |
| VGT | 2019-12-16 | 2019-12-19 | $0.6473 | 0.271% | derived | 75 |
| VOOG | 2019-12-16 | 2019-12-19 | $0.5939 | 0.347% | derived | 58 |
| VGT | 2020-03-10 | 2020-03-13 | $0.8485 | 0.390% | derived | 104 |
| VOOG | 2020-03-10 | 2020-03-13 | $0.4410 | 0.285% | derived | 73 |
| VGT | 2020-06-22 | 2020-06-25 | $0.6714 | 0.246% | derived | 89 |
| VOOG | 2020-06-25 | 2020-06-30 | $0.5636 | 0.305% | derived | 78 |
| VGT | 2020-09-11 | 2020-09-16 | $0.7090 | 0.234% | derived | 103 |
| VOOG | 2020-09-11 | 2020-09-16 | $0.3774 | 0.183% | derived | 61 |
| VGT | 2020-12-17 | 2020-12-22 | $0.6866 | 0.198% | derived | 112 |
| VOOG | 2020-12-22 | 2020-12-28 | $0.6542 | 0.288% | derived | 154 |
| VGT | 2021-03-26 | 2021-03-31 | $0.6333 | 0.181% | derived | 108 |
| VOOG | 2021-03-26 | 2021-03-31 | $0.3450 | 0.150% | derived | 53 |
| VGT | 2021-06-24 | 2021-06-29 | $0.5955 | 0.152% | derived | 137 |
| VOOG | 2021-06-24 | 2021-06-29 | $0.3645 | 0.141% | derived | 54 |
| VGT | 2021-09-29 | 2021-10-04 | $0.8954 | 0.221% | derived | 209 |
| VOOG | 2021-09-29 | 2021-10-04 | $0.4341 | 0.161% | derived | 78 |
| VGT | 2021-12-16 | 2021-12-21 | $0.8163 | 0.178% | derived | 207 |
| VOOG | 2021-12-21 | 2021-12-27 | $0.4670 | 0.161% | derived | 134 |
| VGT | 2022-03-24 | 2022-03-29 | $0.6811 | 0.168% | derived | 433 |
| VOOG | 2022-03-24 | 2022-03-29 | $0.4328 | 0.160% | derived | 154 |
| VGT | 2022-06-23 | 2022-06-28 | $0.5946 | 0.182% | derived | 1000 |
| VOOG | 2022-06-23 | 2022-06-28 | $0.4465 | 0.206% | derived | 254 |
| VGT | 2022-09-28 | 2022-10-03 | $0.7641 | 0.240% | derived | 743 |
| VOOG | 2022-09-28 | 2022-10-03 | $0.5033 | 0.235% | derived | 447 |
| VGT | 2022-12-15 | 2022-12-20 | $0.8716 | 0.253% | derived | 631 |
| VOOG | 2022-12-20 | 2022-12-23 | $0.5856 | 0.276% | derived | 484 |
| VGT | 2023-03-24 | 2023-03-29 | $0.7722 | 0.208% | derived | 645 |
| VOOG | 2023-03-24 | 2023-03-29 | $0.6846 | 0.306% | derived | 1077 |
| VGT | 2023-06-29 | 2023-07-05 | $0.6760 | 0.155% | derived | 756 |
| VOOG | 2023-06-29 | 2023-07-05 | $0.6985 | 0.279% | derived | 552 |
| VGT | 2023-09-28 | 2023-10-03 | $0.8812 | 0.215% | derived | 768 |
| VOOG | 2023-09-28 | 2023-10-03 | $0.7515 | 0.305% | derived | 876 |
| VGT | 2023-12-19 | 2023-12-22 | $0.7945 | 0.164% | derived | 828 |
| VOOG | 2023-12-20 | 2023-12-26 | $0.9110 | 0.335% | derived | 655 |
| VGT | 2024-03-22 | 2024-03-27 | $1.2585 | 0.238% | derived | 1387 |
| VOOG | 2024-03-22 | 2024-03-27 | $0.3033 | 0.099% | derived | 183 |
| VGT | 2024-06-28 | 2024-07-02 | $0.7621 | 0.132% | derived | 665 |
| VOOG | 2024-06-28 | 2024-07-02 | $0.4327 | 0.128% | derived | 531 |
| VGT | 2024-09-27 | 2024-10-01 | $0.9169 | 0.155% | derived | 1041 |
| VOOG | 2024-09-27 | 2024-10-01 | $0.5208 | 0.150% | derived | 630 |
| VGT | 2024-12-18 | 2024-12-20 | $0.7757 | 0.120% | derived | 1528 |
| VOOG | 2024-12-23 | 2024-12-26 | $0.5345 | 0.144% | derived | 1043 |
| VGT | 2025-03-25 | 2025-03-27 | $0.7295 | 0.127% | derived | 958 |
| VOOG | 2025-03-25 | 2025-03-27 | $0.5472 | 0.156% | derived | 718 |
| VGT | 2025-06-26 | 2025-06-30 | $0.7027 | 0.108% | derived | 1322 |
| VOOG | 2025-06-26 | 2025-06-30 | $0.4919 | 0.126% | derived | 1138 |
| VGT | 2025-09-24 | 2025-09-26 | $0.8592 | 0.115% | derived | 1355 |
| VOOG | 2025-09-24 | 2025-09-26 | $0.5540 | 0.127% | derived | 1677 |
