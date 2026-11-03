# Account model

One Vanguard brokerage account, simulated session by session in `scripts/portfolio.ts`. The core-only
benchmark is the same ledger with no strategy.

## Start

At the 2016-01-04 close: $240,000 of VOOG at 101.89 (2,355.4814 shares) and $160,000 of VGT at 106.61
(1,500.7973 shares). There is no cash, no debit, and nothing owned earlier in that session. Fractional shares
are kept at full floating-point precision everywhere, with no rounding.

## Balance sheet

Every session close:

```
securities = VOOG shares × VOOG close + (VGT core + VGT strategy DRIP + lot shares) × VGT close
NAV        = securities + dividend receivables + cash − margin debit − accrued unpaid interest
```

Cash and debit are separate non-negative balances, so nothing is subtracted twice. Ratios reported:
- gross securities / NAV;
- (debit + accrued interest) / NAV;
- NAV / securities (the margin equity ratio).

## Order of events in a session

1. **Open:** shares held at the previous close are entitled to distributions going ex today; book the
   receivables.
2. **Strategy exit** (the lot's exit minute, from the unchanged engine):
   - `proceeds = lot shares × exit price`;
   - proceeds repay the debit first, and any remainder becomes cash;
   - if the proceeds fall short, the residual debit stays, interest keeps accruing, and no core share is
     sold.
3. **Strategy entry** (15:59, or 12:59 on early-close days): sized as below. `debit += principal`, and
   `lot shares = principal / fill price`. NAV is unchanged at that instant: the asset and the liability
   are equal.
4. **Close:**
   - distribution payments are reinvested at the close;
   - the account is marked;
   - interest accrues for each calendar day until the next session.

## Sizing: 20% of pre-entry NAV, at the decision

The strategy decides one minute before the close. The account is valued with only what is known then:

```
pre-entry NAV = VOOG shares × VOOG's last completed minute close before the decision
              + VGT shares (core + strategy DRIP) × the strategy's decision price (VGT's last completed minute)
              + receivables (including today's ex-date entitlements)
              + cash − debit − accrued interest (through the previous night)
principal     = 0.20 × pre-entry NAV
```

- VOOG has minute data, so its price comes from the same moment as VGT's. No same-day close is used.
- The size goes to the engine through a callback (`runAllIn({ sizePosition })`, the only production change)
  before the fill is known.
- Entries happen only when flat, so no trading lot is in the denominator.
- Sensitivity: sizing with VOOG's *previous* close instead changes the end NAV by $576.

## Interest

- 11% a year, accrued daily on the end-of-day debit for every calendar day (weekends and holidays included),
  on a 365-day year.
- The accrued interest is a liability in NAV. On the last calendar day of each month it is **charged to the
  debit**, so it compounds afterwards.
- Interest accrues whenever there is a debit, including flat periods after a losing exit.
- The strategy's own per-trade simple interest (`principal × 11% × calendar days / 365`, none on the entry
  day) still drives its decisions. It is reported per trade beside the account's actual accrual, never
  deducted a second time.

Over the run the account accrued **$164,299**, against **$154,860** under the strategy's formula. The
$9,439 difference is:
- interest on residual debits carried into later trades and flat days;
- month-end compounding.

$1,593 was still accrued and unpaid at the end. See the per-trade columns in
[`TRADE_RECONCILIATION.md`](TRADE_RECONCILIATION.md).

## The financing rule, and its cost

As the brief specifies, each entry is financed **entirely with new margin debit**: realized profits stay
as cash and are not used to buy, and only sale proceeds repay debit. That gives a single account in which
cash and a debit coexist.

The effect is large:
- cash reached **$258,900** while the account paid 11% on up to **$442,207** of debit;
- residual debit was outstanding on **937 flat sessions** (largest $29,771) while cash sat idle.

**Sensitivity: netted financing.** Cash funds entries first and offsets debit, as a single cash/margin
balance would. Same trades, same sizes. Interest falls from $164,299 to **$78,149**, and the uplift rises
from $415,349 to **$513,188**. Which convention a real Vanguard account follows (settlement-fund cash
versus margin purchases) was not verified, so both are reported.

{{sensitivities}}

## Marking conventions

- **Daily (exact):** both ETFs at their session closes, with the real receivable, cash, debit and interest
  ledger. All headline figures use this.
- **Minute-sampled (diagnostic):** at every minute either ETF traded, each ETF at its last observed trade
  (forward-filled, not interpolated), with the lot, cash and debit changing at their fill minutes.
  - Both funds have minute data, so this is a real combined-account intraday measure, not a stale-VOOG
    estimate.
  - Its granularity is limited by VOOG's sparse trading.

## Spot check: 2022-09-15 entry (15-day loss exit)

| Step | Value |
|---|---:|
| Pre-entry NAV (decision 15:59 ET) | $1,227,274.66 |
| Principal = 20% | $245,454.93 |
| Fill 335.47 → shares | 731.6748 |
| Exit 2022-09-30 at 312.21 → proceeds | $228,436.18 |
| Debit before exit: residual $10,487 from the previous trade + principal + capitalized interest | $255,942.25 |
| Debit after exit (proceeds all repay debit) | $27,506.08 |
| Strategy interest (15 days) / account interest while open | $1,109.59 / $1,157.00 |

The residual $27,506 is carried, and the next entry (2022-10-11) adds its own principal on top of it.
