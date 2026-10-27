# BTC clock and execution — what D1 means on BTCUSDT spot

The ETF D1 strategy file (`src/app/allIn-trailingBuy-postExitContinuation.ts`) is not run for BTC; its rules are
re-implemented twice for the BTC clock and a spot cash account — the reference event engine
`src/btcusdt-d1/engine.ts` (authoritative, full ledger) and the fast replay `src/btcusdt-d1/fast.ts` (the search) —
and the two are proven equal (ENGINE_PARITY_AND_TESTS.md). Nothing in the ETF code was edited.

## 1. ETF D1 versus BTC D1

| Element | ETF D1 (Vanguard, NYSE sessions) | BTC D1 (this study) |
|---|---|---|
| Day | NYSE trading session, regular minutes + closing print | UTC calendar day 00:00:00–24:00:00, every traded minute |
| Session open / close | 9:30 opening trade / closing auction print | first traded minute's open / last traded minute's close of the UTC day |
| L (`tickWindowSize`) | sessions | completed UTC calendar days d-L … d-1 |
| Maximum hold | calendar days between session dates | UTC calendar days between the entry day and the day (`d - entryDay`) |
| W (`continuationWindow`) | sessions | UTC calendar days |
| Overnight / weekend gap | yes | none by default; data outages (≤ 10 h after 2018-02-11) are the only gaps |
| Entry size | $100,000 borrowed per entry (margin) | min(100,000, cash / (1 + fee)) USDT of the cash account; no borrowing |
| Carrying cost | 11% margin interest, simple, daily | none: interest and funding 0 (not applicable), cash earns 0 |
| Profit tests | net of interest | net of both sides' fees and impact |
| Trading costs | none in the strategy file (research engines: 5 bps per side) | fee + impact per side (principal 10 + 5 bps) |
| Intraday stop fill | the stop level | min(stop, next traded minute's open), recorded at that minute (next day's first trade if needed) |
| Units | USD, shares | USDT (unit of account), BTC quantity |

## 2. The clock

- Every bar is a minute; its timestamp is the start of the minute (UNIX seconds, UTC). A minute's open, high, low
  and close are known when it ends (time + 60 s); that is when a decision on it is made.
- Day d's bars are those with timestamps in [d × 86,400, (d + 1) × 86,400). A bar at 23:59 belongs to day d and its
  decision is known at 00:00:00 of day d + 1.
- The reference high on day d is max(high of each completed day d − L … d − 1). The current day is never included
  (tested: a same-day high of 200 does not raise a reference high of 100).
- Calendar arithmetic is integer UTC day numbers, so leap days count (tested: entry 2024-02-27 with hold 3 is due on
  2024-03-01; in 2023 on 2023-03-02). There is no business-day, holiday or NYSE calendar anywhere in the BTC code.
- No candidate arms before 2019-02-11 (history start + 365 = the largest L), so every rolling high is complete.

## 3. The state machine on each UTC day d

1. **Day starts flat.** A buy order pending from day d − 1 (its decision came on d − 1's last minute) fills at the
   open of d's first traded minute. Otherwise, from 2019-02-11, each completed minute:
   - no setup: arms *deep* if 1 − close / refHigh ≥ X; else arms *continuation* if a continuation window is open,
     d > its exit day, d − exit day ≤ W and close ≤ windowHigh × (1 − P). Arming closes the window. The arming
     minute never buys; the trailing low starts at its close.
   - armed: trailingLow = min(trailingLow, low); if close ≥ trailingLow × (1 + Y) the buy is decided now, sized now
     (min(100,000, cash / (1 + fee)) USDT; refused below 10 USDT), and fills at the open of the next traded minute of
     day d, or at the next day's first trade if none is left.
   - after an entry on d: postEntryHigh = max(the observed entry price (before impact), d's close, highs from the
     fill minute on); stop = postEntryHigh × (1 − stop%).
2. **Day starts long.** Before any minute: stopActive = net(stop) > 0; holdDue = d − entryDay ≥ hold and
   net(d's opening trade) < 0, where net(p) = quantity × p × (1 − impact) × (1 − fee) − notional − entry fee. Then,
   in D1's order:
   0. a stop sale carried from d − 1 (triggered on d − 1's last minute) → sell at min(its limit, the opening trade);
   a. stopActive and the day opens at or below the stop → sell at that opening trade (*trailing stop gap*);
   b. a buffered sale carried from d − 1 → sell at the opening trade;
   c. holdDue → sell at the open of the next traded minute (*maximum hold*); on a day with a single traded minute
      there is no next minute, so nothing sells that day and the test repeats the next day (the ETF engine would have
      used the closing print; no such day exists in this history);
   d. otherwise the first minute with open ≤ stop or low ≤ stop (only if stopActive) competes with the first minute,
      from the hold day, whose close gives net ≤ −notional × buffer. The stop wins at or before the signal minute,
      or at the next minute if that minute opens through the stop (D1's rule; with an active stop above breakeven, a
      buffer close has already traded through the stop, so in practice the buffer only acts while the stop is
      inactive). A buffered sale fills at the next traded minute's open, or at the next day's opening trade.
   e. survives the day (and no stop sale is carried) → postEntryHigh = max(postEntryHigh, d's high); stop =
      max(stop, postEntryHigh × (1 − stop%)).
3. **End of day:** a continuation window's high takes d's high (only for days after its exit day); it closes once
   d − exit day ≥ W.

A position is never exited on its entry day and nothing is entered on an exit day (D1).

## 4. Account and accounting (USDT)

- Start: 100,000 USDT, 0 BTC. Long only, one position, no borrowing, no shorting, no negative cash (the engine throws
  if cash falls below −1e-6 USDT; the test suite checks every ledger).
- Entry: notional N decided at the decision; fill price p_e = observed open × (1 + impact); quantity = N / p_e; fee
  N × fee; cash −= N + fee. With 100,000 USDT of cash, N = 100,000 / (1 + fee): the cap is never exceeded and the fee
  is always funded. Profits are never reinvested above 100,000 USDT of notional; after losses N shrinks with cash.
- Exit at observed price p: fill p × (1 − impact); proceeds = quantity × fill; fee = proceeds × fee; cash +=
  proceeds − fee. Net = proceeds − exit fee − N − entry fee = gross price P&L − both fees − both impacts.
- Marks: at every traded minute's close, equity = cash + quantity × close × (1 − impact) × (1 − fee) (liquidation
  value); daily marks are each day's last close. An open position at the end of a window is marked the same way
  (status "open (marked)"), never given an invented exit.
- Drawdowns: the largest USDT fall from a running peak of the minute (or daily) marks, and separately the largest
  fraction 1 − equity / running peak (peak-to-trough % of the account's own equity). Both are tracked inside each
  reporting window, starting from the equity at the window's start.
- Analytical fixed-notional mode (`--mode fixed`, reporting only): every entry is 100,000 USDT; any shortfall of cash
  (including the first trade's fee) is a recorded outside top-up. Its P&L and drawdowns are net of top-ups and it is
  never described as executable from the account.
- Not modelled: USDT counterparty or depeg risk, exchange/venue risk, order-book depth, lot size and minimum notional
  (no local metadata), taxes.

## 5. Fills and their limits

| Event | Price | Recorded at |
|---|---|---|
| Rebound buy | open of the next traded minute (+ impact) | that minute |
| Buy carried past midnight | open of the next day's first traded minute | that minute |
| Stop gap at the day's open | the opening trade | the day's first minute |
| Minute opens through the stop | that minute's open | that minute |
| Minute trades through the stop (principal "adverse") | min(stop, next traded minute's open) | the next minute |
| — trigger is the day's last minute | min(stop, the next day's first trade) | that first minute of the next day |
| — sensitivity "stop" | the stop level | the trigger minute |
| — worst case "low" | min(stop, the trigger minute's low, the next traded minute's open) | the next minute (next day if needed) |
| Maximum hold | open of the next traded minute after the opening trade | that minute |
| Buffered loss | open of the next traded minute, or the next day's opening trade | that minute |

All exits then apply the impact (sells lower) and the fee. A minute's open is an observed trade used as a proxy, not
proof of a fill at that price. Minute bars cannot say where inside the trigger minute a stop-market order would have filled;
"adverse" never fills above the stop and uses the next observed trade when the price stayed lower; after a V-shaped
trigger minute that recovers above the stop it fills at the stop (plus impact), which is where such an order
triggers — the unresolved intraminute limit. "low" never fills above "adverse" (it takes the lower of the trigger
minute's low and the next open) and bounds the damage; selection gate G5 and the fold gate require profit under it.
"stop" is the optimistic ETF assumption. Each fill's notional as a share of
its minute's quote volume is reported (100,000 USDT is a sizeable share of a quiet 2018–2019 minute).

## 6. Causality guarantees (tested)

- A decision at a minute uses only that minute and earlier bars and the completed earlier days.
- A fill or exit recorded at a minute uses only that minute's open and earlier data (the adverse stop is recorded at
  the minute whose open prices it).
- The rolling high, stop and continuation high only change after a day ends.
- Selections run on a series sliced at their cutoff; the lookahead mutation tests replace every bar from a cutoff on
  and require every earlier signal, fill, exit and window result to stay identical (and catch a deliberately cheating
  runner).
