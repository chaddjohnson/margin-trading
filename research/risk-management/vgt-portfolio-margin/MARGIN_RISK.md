# Margin risk

**On the historical evidence, the account never came near any maintenance requirement from 25% to 50%.**
That is not a claim about Vanguard's actual house requirements, which this study could not verify; see
"Requirements".

## Collateral and debt

- One account: all VOOG and VGT shares (core, strategy DRIP and the open lot) are the collateral for one
  margin debit.
- Each entry adds 20% of NAV to the debit. Residual debits from losing exits and capitalized interest
  persist, so the total can exceed 20% of NAV.
- The trades file reports `principal / NAV` (always 20%) and `total debt / NAV` after every entry.

| Measure (daily closes) | Worst | Date |
|---|---:|---|
| Highest total debt (debit + accrued interest) | $442,207 | 2025-10-13 |
| Highest debt / NAV | 24.12% | 2025-04-08 |
| Highest gross securities / NAV | 1.220× | 2018-12-24 |
| Lowest equity / long market value | 81.98% | 2018-12-24 |
| Lowest equity / long market value, minute-sampled | 81.98% | 2018-12-24 12:59 ET |
| Sessions with debit while the strategy was flat (residual debit) | 937 | largest $29,771 |

## Requirements

- **Regulatory minimum (verified rule, not account-specific).** FINRA Rule 4210 requires equity of at
  least **25%** of the current market value of long securities in a margin account.
- **Reg T initial margin.** A new margin purchase needs 50% initial margin. The account met this at every
  entry with a wide margin: debt never exceeded about 20% of long market value after an entry.
- **Vanguard house requirements: not verified.** Brokers commonly require more than 25%, and more for
  concentrated or volatile positions, and Vanguard's historical house rules weren't available to this study.
  So 30%, 40% and 50% are shown as **hypothetical** requirements on the same denominator (equity ÷ long
  market value), and no margin call or forced liquidation is claimed or simulated.

| Requirement (equity ÷ long market value) | Status | Days breached | Smallest excess equity (date) | Smallest uniform fall in both ETFs that would breach it (date) |
|---|---:|---:|---:|---:|
| 25% | FINRA Rule 4210 regulatory minimum | 0 | $249,977 (2016-02-11) | 76.0% (2018-12-24) |
| 30% | hypothetical house requirement | 0 | $228,422 (2016-02-11) | 74.3% (2018-12-24) |
| 40% | hypothetical house requirement | 0 | $185,311 (2016-02-11) | 70.0% (2018-12-24) |
| 50% | hypothetical house requirement | 0 | $142,201 (2016-02-11) | 64.0% (2018-12-24) |

**The cushion is a uniform fall in both ETFs.** "Smallest uniform fall" is the one-day decline in both ETFs
that would have taken equity down to the requirement, from that day's balance sheet:

`fall = 1 − (debit + accrued − cash − receivables) / ((1 − m) × securities)`

- The tightest point was 2018-12-24, at the 2018 low with a lot open after three loss exits.
- Even then, a 76% fall would have been needed to reach 25%, and 64% to reach 50%.
- The smallest *dollar* excess comes in early 2016, only because the account was smallest then.

## Worst points by year

| Year | Lowest equity / securities | Highest debt / NAV | Highest gross / NAV | Smallest uniform fall to a 25% / 30% / 40% / 50% requirement |
|---|---:|---:|---:|---:|
| 2016 | 82.99% (2016-02-11) | 20.50% (2016-02-11) | 1.205× (2016-02-11) | 77.3% / 75.7% / 71.6% / 66.0% |
| 2018 | 81.98% (2018-12-24) | 23.56% (2018-12-24) | 1.220× (2018-12-24) | 76.0% / 74.3% / 70.0% / 64.0% |
| 2019 | 82.97% (2019-01-03) | 22.03% (2019-01-03) | 1.205× (2019-01-03) | 77.3% / 75.7% / 71.6% / 65.9% |
| 2020 | 83.81% (2020-03-09) | 23.63% (2020-03-23) | 1.193× (2020-03-09) | 78.4% / 76.9% / 73.0% / 67.6% |
| 2021 | 89.80% (2021-01-06) | 20.32% (2021-03-08) | 1.114× (2021-01-06) | 86.4% / 85.4% / 83.0% / 79.6% |
| 2022 | 88.19% (2022-01-27) | 22.86% (2022-10-14) | 1.134× (2022-01-27) | 84.3% / 83.1% / 80.3% / 76.4% |
| 2023 | 89.35% (2023-01-05) | 21.90% (2023-01-05) | 1.119× (2023-01-05) | 85.8% / 84.8% / 82.3% / 78.7% |
| 2024 | 91.89% (2024-01-05) | 21.48% (2024-08-07) | 1.088× (2024-01-05) | 89.2% / 88.4% / 86.5% / 83.8% |
| 2025 | 91.43% (2025-04-08) | 24.12% (2025-04-08) | 1.094× (2025-04-08) | 88.6% / 87.8% / 85.7% / 82.9% |

## Stress periods

See [`PORTFOLIO_COMPARISON.md`](PORTFOLIO_COMPARISON.md) for both books' trajectories.

- **COVID crash:** the lowest equity ratio was 83.8% (2020-03-09).
- **2022:** 88.2% (2022-01-27).
- **April 2025:** 91.4% (2025-04-08).

The ratio improves over time because the core grew much faster than any single 20% position.

## What would make this riskier than it looks

- **Concentration.** The account starts 40% VGT, VGT's share grows as it outperforms, and the lot is more
  VGT. A broker could apply higher house requirements to a concentrated technology position; that isn't
  modeled.
- **Gap risk is account-wide.** The strategy's losses come exactly when the core falls (0.987 correlation
  while a lot is open). Cushions are computed for a uniform fall in both ETFs for that reason.
- **Residual debt accumulates in choppy markets.** In 2022 a run of 15-day losses left up to $29,691 of
  debit outstanding between trades. Under the brief's gross rule, idle cash doesn't offset it.
- **Size grows with NAV.** The last trades were about $400k each. The rule keeps exposure at about 1.2×
  NAV, but the dollar loss on a bad trade grows with the account.
- **Intraday.** Measured minute by minute with both ETFs' trades, the lowest equity ratio was the same as
  at the close (81.98%, 2018-12-24 12:59 ET, an early-close day). VOOG's sparse trading limits that
  measurement's granularity.
