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

{{distributionsByYear}}

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

{{lotDividends}}

## Every distribution

{{distributions}}
