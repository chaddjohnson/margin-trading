# Validation

`run.sh` reruns everything from the saved inputs and fails on any mismatch. `scripts/validate.ts` checks
each run from its output files, recomputing from first principles instead of reusing the ledger's code.

| Run | Checks | Failures |
|---|---:|---:|
| Main (gross financing, VOOG minute sizing) | 41,463 | 0 |
| Netted financing | 43,922 | 0 |
| VOOG prior-close sizing | 41,463 | 0 |

**Negative controls**, to show the validator can fail:
- checking the main run as if netted: 11,389 failures;
- as if sized with VOOG's prior close: 68 failures;
- with one VOOG share count altered in one row: 2 failures.

## What is checked

| Area | Checks |
|---|---|
| **Control** | The fixed-$100,000 CLI output is byte-identical to the committed 1% / 2% / 38% reference (all five files), before and after the production change. |
| **Initialization** | $240,000 VOOG / $160,000 VGT / $0 cash / $0 debit at the 2016-01-04 close; NAV $400,000 in both books. |
| **Balance sheet** | Every session, both books: securities = Σ shares × close; NAV = securities + receivables + cash − debit − accrued; no negative balance. A loan never changes NAV at the purchase. |
| **Core identity** | The integrated account's core VOOG and VGT shares equal the core-only book's on every session, and every core distribution receivable is identical. |
| **Trade identity** | See [`TRADE_RECONCILIATION.md`](TRADE_RECONCILIATION.md): every trade, state row, episode and daily signal against the control, dollar fields scaled exactly. |
| **Sizing, no look-ahead** | Each entry's pre-entry NAV is rebuilt independently from the previous close's ledger row, the overnight interest, the day's new entitlements, VOOG's last minute completed before the decision (read from the raw CSV) and the decision price. Principal = 20% of it. VOOG's minute completed before the decision; the decision precedes the fill. |
| **Dividends** | Entitled shares = holdings at the previous close, by source. A lot is entitled only if held overnight into the ex-date, including lots sold before payment; every expected lot entitlement is found. Receivable = amount × shares; reinvested at the pay date's close; new shares = receivable / price. |
| **Debit and interest** | Debit, cash and accrued interest recomputed day by day from the trades: proceeds repay the debit first, entries add principal, daily accrual on calendar days, month-end charge to the debit. Charged + still accrued = total accrued. |
| **End** | One open lot marked at the last close; pending receivables and unpaid interest in NAV; summary values equal the ledgers. |
| **Distributions** | 4 a year per fund; steps ≥ 28× noise; no split-sized step; ex-date agreement between the funds (`data/manifest.json`). |
| **Spot checks** | 2018-11-12, 2020-03-12, 2022-09-15 and 2025-03-03 entries recomputed by hand: shares = principal / fill, residual debit = debit − min(proceeds, debit). |

## No look-ahead

| Decision | Uses |
|---|---|
| Strategy signals and fills | The unchanged engine: completed minutes before 15:59 ET, fills at the next trade. |
| Position size | VOOG's and VGT's last completed minutes before the decision, the ledger through the previous close, and today's ex-date entitlements (declared beforehand). |
| Entitlements | Holdings at the previous close. |
| DRIP | At the pay date's close, after the event. |
| Interest | The end-of-day debit. |
| Marks | Daily marks use same-day closes only for end-of-day results, never for decisions. |

## Caveats

These are limitations, not failures.

- **Distribution data:** amounts and ex-dates are derived from local adjusted files, accurate to about ±1%.
  Three 2016 VOOG distributions and every payment date are estimated, and the DRIP price is a close-based
  proxy. See [`DATA_AND_DIVIDENDS.md`](DATA_AND_DIVIDENDS.md).
- **Initial VOOG price:** VOOG has no 2016-01-04 closing print, so its initial price is that day's last
  regular trade.
- **Financing:** Vanguard's house margin requirements, its actual settlement-fund and margin interaction,
  and its historical margin rates were not verified. The 11% rate is the assumption from the brief.
- **Cash:** cash earns nothing.
- **Strategy execution:** the same execution limitations as the minute strategy (see
  `research/risk-management/allin-minute-conversion/IMPLEMENTATION.md`): no spreads, latency or impact, and
  stop fills at the stop level within the triggering minute.
- **Taxes:** none are modeled. Realized short-term gains would be taxable in a taxable account.
