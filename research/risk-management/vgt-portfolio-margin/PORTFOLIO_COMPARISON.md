# Portfolio comparison: core only against core + margin strategy

- **Window:** 2016-01-04 close to 2025-10-13 close, 2,459 sessions, 9.77 years.
- **Both books:** $400,000 in 60% VOOG / 40% VGT at the start, the same raw prices, the same 78
  distributions reinvested, no deposits, withdrawals, taxes or rebalancing.
- **Where they differ:** the integrated book adds the strategy's 34 margin trades, their financing, and
  the reinvestment of the strategy lots' dividends.

## Full period

|  | Core only | Core + strategy | Difference |
|---|---:|---:|---:|
| Start (2016-01-04 close) | $400,000 | $400,000 | $0 |
| End (2025-10-13 close) | $2,379,451 | $2,794,800 | +$415,349 |
| Total return | 494.9% | 598.7% | +103.8 pts |
| CAGR | 20.01% | 22.01% | +1.99 pts |
| Max drawdown, $ (daily close) | $515,698 (2021-12-27 → 2022-10-14) | $626,006 (2025-01-23 → 2025-04-08) | +$110,307 |
| Max drawdown, % (daily close) | 33.89% (2021-12-27 → 2022-10-14) | 33.34% (2021-12-27 → 2022-10-14) | -0.55 pts |
| Largest $ drawdown, minute-sampled (its % of peak) | $579,298 (28.04%) | $712,964 (29.83%) | +$133,666 |
| Longest time underwater | 753 days | 711 days |  |
| Annualized volatility (daily) | 22.39% | 24.51% |  |
| Return / volatility (0% rate) | 0.929 | 0.936 |  |
| CAGR / max % drawdown | 0.591 | 0.660 |  |
| Dividends reinvested | $89,857 | $103,449 | +$13,592 |
| Margin interest (accrued) | $0 | $164,299 |  |
| Highest gross securities / NAV | 1.000× | 1.220× (2018-12-24) |  |
| Highest total debt / NAV | 0 | 24.12% (2025-04-08) |  |
| Lowest equity / securities (daily close) | 100% | 81.98% (2018-12-24) |  |
| Days below a 25%–50% maintenance requirement | 0 | 0 |  |

**Where the extra $415,349 comes from** (exactly):

| Component | Amount |
|---|---:|
| Realized gains on the 33 closed lots, before financing | +$375,829 |
| Unrealized gain on the open lot (bought 2025-04-15, 750.30 shares, $394,838 principal) | +$172,006 |
| Margin interest accrued by the account | −$164,299 |
| Value of strategy-derived DRIP shares (lot dividends $13,002 + their own $590, reinvested in VGT) | +$31,812 |
| **Integrated NAV − core-only NAV** | **+$415,349** |

At the end:
- $258,900 is cash from realized profits;
- the open lot ($566,844 of VGT) is still financed: debit $440,614 plus $1,593 accrued interest;
- **about $124k of the uplift is the open lot's value in excess of the account's total debt.** It would
  change with VGT's price before any sale.

**Risk-adjusted.**
- The strategy raised the CAGR by 1.99 points, with about 2.1 points more annualized volatility.
- Return per unit of volatility barely moved (0.929 → 0.936).
- CAGR per unit of maximum percentage drawdown improved (0.591 → 0.660), because the deepest percentage
  drawdown (2022) was slightly shallower with the strategy: its cash and its gains from the 2020–21 trades
  sat outside the market.
- In dollars, every large drawdown was deeper. The largest grew by $110,307, and in 2025 the account fell
  $626,006 against $515,698 for the core's worst.

**Strategy against account drawdown.** The strategy's own mark-to-market P&L (realized plus the open lot,
after its per-trade interest) had a maximum drawdown of **$115,637** (2024-12-16 → 2025-04-08). That is a
drawdown of a leveraged position's P&L, not of the account. The account's drawdown over the same months
was $626,006, mostly the core.

## By year

- "Strategy contribution" is the change in (integrated − core) NAV during the year: trade gains, interest,
  and the strategy DRIP shares' growth.
- Max DD is the deepest peak-to-trough decline within the year, starting from the prior year's close.

| Year | Core-only NAV | Core return | Core max DD | Integrated NAV | Integrated return | Integrated max DD | Strategy contribution | Interest | Dividends (integrated) | Lowest equity / securities |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2016 | $445,966 | 11.49% | 10.16% | $447,613 | 11.90% | 10.56% ($42,247) | +$1,647 | $3,244 | $6,647 | 82.99% |
| 2017 | $585,361 | 31.26% | 3.34% | $587,181 | 31.18% | 3.34% ($17,570) | +$173 | $72 | $6,747 | 100.15% |
| 2018 | $590,920 | 0.95% | 21.99% | $591,914 | 0.81% | 25.31% ($183,826) | −$826 | $9,107 | $8,555 | 81.98% |
| 2019 | $819,679 | 38.71% | 8.29% | $851,682 | 43.89% | 9.45% ($72,139) | +$31,009 | $7,639 | $10,635 | 82.97% |
| 2020 | $1,141,921 | 39.31% | 31.62% | $1,262,731 | 48.26% | 32.93% ($307,896) | +$88,808 | $14,434 | $11,805 | 83.81% |
| 2021 | $1,498,267 | 31.21% | 9.73% | $1,621,046 | 28.38% | 10.57% ($143,057) | +$1,969 | $8,509 | $9,275 | 89.80% |
| 2022 | $1,054,999 | −29.59% | 33.39% | $1,158,481 | −28.53% | 32.87% ($536,825) | −$19,298 | $22,856 | $11,856 | 88.19% |
| 2023 | $1,488,349 | 41.08% | 10.66% | $1,708,021 | 47.44% | 11.65% ($187,833) | +$116,190 | $24,653 | $15,225 | 89.35% |
| 2024 | $1,970,575 | 32.40% | 14.02% | $2,276,838 | 33.30% | 14.92% ($329,101) | +$86,592 | $39,065 | $13,533 | 91.89% |
| 2025 (to 10-13) | $2,379,451 | 20.75% | 24.70% | $2,794,800 | 22.75% | 26.29% ($626,006) | +$109,085 | $34,720 | $9,171 | 91.43% |

## Major stress periods

| Period | Book | Start NAV | Lowest NAV (date) | End NAV | Peak-to-trough in period | Highest debt | Lowest equity / securities | Smallest excess over 30% | Smallest fall to a 30% call |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| COVID crash (2020-02-19 → 2020-04-30) | Core only | $902,690 | $617,258 (2020-03-23) | $807,126 | 31.62% | $0 | 100% |  |  |
|  | Core + strategy | $935,097 | $627,202 (2020-03-23) | $852,385 | 32.93% | $171,300 (2020-03-10) | 83.81% (2020-03-09) | $403,174 (2020-03-23) | 76.9% (2020-03-09) |
| 2022 bear market (2022-01-03 → 2022-12-30) | Core only | $1,510,179 | $1,005,916 (2022-10-14) | $1,054,999 | 33.39% | $0 | 100% |  |  |
|  | Core + strategy | $1,633,047 | $1,096,222 (2022-10-14) | $1,158,481 | 32.87% | $300,047 (2022-02-03) | 88.19% (2022-01-27) | $726,039 (2022-10-14) | 83.1% (2022-01-27) |
| April 2025 tariff sell-off (2025-02-19 → 2025-05-30) | Core only | $2,055,579 | $1,550,627 (2025-04-08) | $1,966,884 | 24.56% | $0 | 100% |  |  |
|  | Core + strategy | $2,372,302 | $1,755,527 (2025-04-08) | $2,280,685 | 26.00% | $435,189 (2025-03-17) | 91.43% (2025-04-08) | $1,179,502 (2025-04-08) | 87.8% (2025-04-08) |

- **March 2020:**
  - the account entered on 2020-02-25 with $170,400, lost $15,355 on the 2020-03-11 loss exit, then
    re-entered on 03-12, 03-20 and 04-02;
  - the debit peaked at $171,300 with equity at 83.8% of securities;
  - the 04-02 → 09-04 trade made $74,276 before financing.
- **2022:**
  - eleven trades, mostly 15-day loss exits, each sized at 20% of a shrinking NAV;
  - the residual debit built up to $29,691 by October;
  - the strategy cost $19,298 for the year, but the account's percentage drawdown was still slightly
    smaller than the core's (−32.87% against −33.39% within the year).
- **April 2025:**
  - two 15-day losses (03-18, 04-14) left a $22,336 residual debit;
  - the 2025-04-15 re-entry ($394,838) was bought into the sell-off;
  - the account's largest dollar drawdown ended at the 04-08 close ($626,006, 26.3% of its January peak);
  - the open lot was up 43.6% by the end.

## Correlation

The strategy is extra VGT exposure, so it is not a diversifier.

| Sessions | Days | Correlation with the core portfolio | Beta (strategy % of NAV per 1% core move) |
|---|---:|---:|---:|
| All | 2458 | 0.843 | 0.160 |
| With a lot open | 1498 | 0.987 | 0.221 |

- With a lot open, the strategy's daily P&L moves almost one for one with the core (0.987 correlation).
- Each 1% move in the core moves the account a further 0.22% through the lot.
