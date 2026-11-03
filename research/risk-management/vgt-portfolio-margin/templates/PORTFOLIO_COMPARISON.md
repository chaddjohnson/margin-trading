# Portfolio comparison: core only against core + margin strategy

- **Window:** 2016-01-04 close to 2025-10-13 close, 2,459 sessions, 9.77 years.
- **Both books:** $400,000 in 60% VOOG / 40% VGT at the start, the same raw prices, the same 78
  distributions reinvested, no deposits, withdrawals, taxes or rebalancing.
- **Where they differ:** the integrated book adds the strategy's 34 margin trades, their financing, and
  the reinvestment of the strategy lots' dividends.

## Full period

{{headline}}

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

{{annual}}

## Major stress periods

{{stress}}

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

{{correlation}}

- With a lot open, the strategy's daily P&L moves almost one for one with the core (0.987 correlation).
- Each 1% move in the core moves the account a further 0.22% through the lot.
