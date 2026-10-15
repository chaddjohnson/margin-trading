# Trade reconciliation

**The dynamically sized run takes exactly the same 34 trades as the fixed-$100,000 control:** 33 closed
and 1 open at the end.

The control is the committed 1% / 2% / 38% reference,
`research/risk-management/allin-minute-conversion/results/current-params/minute-fullfile`. `run.sh`
regenerates it through the unchanged CLI and requires it to be byte-identical to the committed files.

## How sizing enters the strategy

The only production change is in `src/app/allIn.ts`:
- a new exported `runAllIn(options)` with an optional `sizePosition(context)` callback;
- the CLI default export now calls it with no callback, so every entry still buys $100,000;
- the callback gets the session date, the decision time, the decision price and the earlier positions,
  never the fill or later prices;
- the result returns the positions, fills, states and episodes.

The fixed control's five output files and its console output are byte-identical before and after the
change.

**Why the trades can't change.**
- Shares are `investment / price`, and the strategy's interest is `investment × 11% × days / 365`.
- So every profit test (stop activation, the 15-day loss exit) has the form `investment × (price ratio − 1 −
  interest rate × time)`, whose sign does not depend on the investment.
- Material-loss classification uses the price return, and the signals use prices only.

The validator confirms this field by field instead of relying on the argument.

## Checks (`results/validation-main.json`)

| Compared with the fixed control | Result |
|---|---|
| Trades: entry and exit dates and minute timestamps, decision times and prices, entry and exit prices and price sources, stop prices, reasons, 15-day flags | identical, all 34 |
| Shares, interest and profit | exactly the control's × (investment / $100,000), to 1e-9 |
| State log (restrictions, 1% material-loss classification, 2% lower levels, episode lows, 38% resets, signals, decision prices) | identical rows, except the dollar `trade_profit` |
| Restriction episodes | identical, except the dollar `loss` |
| Daily signal fields (close, 90-session reference high, decision price, signal, held/flat) | identical, every session |
| No same-session re-entry, flat at every entry | holds |

## Every trade, fixed against dynamic

{{reconciliation}}

## The account side of every exit

- Proceeds repay the debit first, and the rest becomes cash.
- "Account interest while open" is the account's actual accrual while the lot was open. It includes interest
  on residual debit carried in from earlier trades and month-end compounding, so it differs from the
  strategy's own per-trade formula, shown beside it.
- "Lot dividends" are the distributions the lot was entitled to. They were reinvested into the strategy
  DRIP inventory, not the lot.

{{exits}}
