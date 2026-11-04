# Growth trading backtest — D1 exit audit and mapping

What `rise-from-recent-low-trading@1.0.0` takes from the D1 family, from which code, with what chronology and units, and
what is deliberately left out. The user guide is [GROWTH_TRADING.md](GROWTH_TRADING.md). Audited 2026-11-04 at
`711bbab`.

## 1. The authoritative code

| Role | File | What it is |
| --- | --- | --- |
| D1, the strategy file | `src/app/allIn-trailingBuy-postExitContinuation.ts` | Shipped constants (lines 550–593): X 21.6%, Y 0.3%, L 74, **stop 7.3%**, **hold 8 days**, **buffer 2.9%**, P 9%, W 60, 11% interest, $100,000. `evaluateSessionExit` (186–257) and `evaluateBufferedSessionExit` (291–358) |
| D1 as minute-stepped machines | `src/shared-margin-portfolio/strategy.ts` | `ExitManager` (173–392), `EntryMachine` (454–646), `firstTradeAfterDecision` (125–129). Parity with the files is checked by `parity.ts` |
| Study 8's per-symbol D1 book | `src/multi-etf-allocator/shadow.ts` `ShadowBook` | `EntryMachine` + `ExitManager` + per-side costs on a fixed notional. The pools/N-book engine (`src/portfolio-aware-d1/nbook/engine.ts`) drives one per book |
| `s8-vg-balanced` | `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json` | Two D1 books in one shared $100,000 slot. **VGT:** stop 7.4%, hold 15, buffer 4.4%. **GDX:** stop 5.7%, hold 12, buffer 2.9%. 5 bps per side, 11%, stop fill at the stop |
| VGT D1 baseline (registry) | `config/phenotypes/D1/VGT.json` `primary` | "the shipped constants of …postExitContinuation.ts": stop 7.3%, hold 8, buffer 2.9% |

**D1 has no material-loss restriction, lower-price re-entry or recovery reset.**

- `allIn-trailingBuy-postExitContinuation.ts` lines 91–95: "No re-entry restriction … no frozen loss-exit price, no 2%
  lower level, no 38% recovery reset".
- Those three exist only in the older restricted files (`allIn-trailingBuy.ts`, `allIn-trailingBuy-bufferedLoss.ts`).
- They are not used here, as the brief requires. Those files are untouched.

## 2. Inherited rules

The new strategy **reuses the code above unchanged**. It constructs a `ShadowBook` per symbol and drives it with
`commit()` from Rise-from-Recent-Low decisions (`src/growth-trading/riseTrading.ts` `simulateTrading`). The book's
`processBar`, D1's dip and continuation entry machine, is never called, and `postExit` is off.

### Trailing stop (mandatory)

| Aspect | Rule | Source |
| --- | --- | --- |
| Level | `postEntryHigh × (1 − stop)`. On the entry session: max(fill, close, highs from the fill minute on). After each later session: raised with that session's high, never lowered. A session's own prices never move its own stop | `ExitManager.onEntry`, `afterSession`; `ShadowBook.afterSession` (not on the entry session) |
| Activation (policy `net`) | Before each session: active iff `shares × stop − investment − interest(through the session date) > 0`. Decided afresh each session. **A losing position has no active stop** | `ExitManager.isStopActive` |
| Gap | Active and the session's open ≤ stop → sells at the **opening trade** (`trailing stop gap`), even at a loss, ahead of any other exit | `evaluate`, first branch |
| Intraday | The first minute with open ≤ stop fills at that open (`minute open through stop`); else the first minute with low ≤ stop fills at **the stop price** (`stop level`, the `stop` fill convention: an assumption) | `evaluate`, stop loop |
| Units | Fraction of price; the UI's percent → fraction by decimal shift (`percentToFraction`, 7.3 → 0.073, the registry's tenths ÷ 1000 double) | `riseTrading.ts` |

### Maximum losing hold (switch, ON by default)

| Aspect | Rule | Source |
| --- | --- | --- |
| Age | `(session date − fill session date)` in **calendar days** (midnights UTC of the New York dates) ≥ hold | `evaluate`: `daysHeld`, `holdTimestamp` |
| Condition | `shares × open − investment − interest < 0` at the session's **opening trade**: raw price, entry cost in the shares, exit cost not included, interest through the session date | `isMaximumHoldDue` |
| Fill | The next observed trade after the opening trade (the next minute's open, else the closing print) | `firstTradeFrom(…, bTime[0] + 60)` |
| Precedence | An active stop gapped through takes the opening trade first. A carried buffered sale fills at the open ahead of it. A profitable open is kept: **no fixed-duration liquidation** | `evaluate` order |
| OFF | `maximumHoldDays = ∞` in the unchanged `ExitManager`: never due. The buffer, which applies only from that age, cannot apply either | `exitParamsOf` |

### Buffered intraday loss (switch, ON by default; requires the hold)

| Aspect | Rule | Source |
| --- | --- | --- |
| When | Only on sessions with `daysHeld ≥ hold`, and not when the hold exit is due at the open | `evaluate`: `if (daysHeld < maximumHoldDays) return stopExit` |
| Trigger | The first **completed minute** whose close gives `shares × close − investment − interest ≤ −investment × buffer`: **net P&L after interest**, as a fraction of the $100,000 notional (2.9% → −$2,900), not a price move | `evaluate`: `threshold` |
| Fill | The first trade after the minute's end: the next minute's open; the closing print only for a decision before the close. Otherwise the sale is **carried** to the next session's opening trade (`pendingSignalTime`) | `firstTradeAfterDecision` |
| Versus the stop | An active stop reached in the signal minute or earlier, or opening through the stop in the minute after it, wins | `evaluate` stop/buffer comparison |
| OFF | `intradayLossBuffer = ∞`: the threshold is −∞ and never reached | `exitParamsOf` |
| Dependency | Buffer ON with hold OFF is refused (registry `crossParamErrors`, engine `tradingParamErrors`). The form unticks and disables it | `shared/strategies.ts`, `riseTrading.ts` |

### Chronology, fills, interest and accounting

- **Exits.** They are decided only for a position open at a session's **start** (`ShadowBook.beginSession` →
  `ExitManager.evaluate`), so a position never exits on its entry session. This is D1's rule, inherited.
- **Entry fills.**
  - `firstTradeAfterDecision`: the next minute's open; the closing print only for a decision before the close; else
    the next session's opening trade.
  - The cost is applied per side; shares = $100,000 ÷ the cost-adjusted price (`ShadowBook.open`).
- **Interest.** `investment × 11% × (session date − entry session date) / 365 days`: none on the entry day, paid at the
  exit (`interestOn`).
- **Net.** `shares × exit after cost − investment − interest` (`ShadowBook.close`). An open position is marked at the
  last close by `ShadowBook.finish`.
- **Marks and drawdowns.** At every minute bar (its close) and the session close: realized + `ShadowBook.markAt`, into
  the frozen `Tracker` with strict new peaks. The daily tracker is updated at each session's date. This follows the
  N-book engine's fixed mode.

## 3. Adapted or new behaviour (the entry differs)

| Point | D1 | This strategy | Why |
| --- | --- | --- | --- |
| Entry trigger | Deep dip X below the L-session high arms a trailing buy, which buys on a Y rebound; or the continuation pullback | The Rise-from-Recent-Low signal only. Its decision time is the signal bar's end; its decision price is the bar's close | The brief: the only positive entry is Rise from Recent Low |
| Entry eligibility | Entries only on sessions that **start flat** (no re-entry on an exit session) | A decision is taken whenever flat with no order pending, **including later in an exit session** after the exit instant | That D1 rule belongs to its entry machine, which is not used. The fill chronology does not require it: exits are evaluated only for positions open at a session's start, so a re-entered position first exits next session, like any entry |
| Same-instant order | Bar k completes (decisions at T+60), then bar k+1's exits and fills | Identical: decisions known at an instant are judged **before** trades at that instant (a decision at an exit's instant sees the position still open) | Causal and conservative |
| Signals while invested | n/a (the machine does not run) | Recorded as ignored (`position_open` / `order_pending`), never replayed | The brief |
| Re-arming | The setup machine | The scanner's own edge trigger: a false → true crossing of "close ≥ X% over the N-bar low". A state that stays true gives one signal | No cooldown or extra state needed |
| Defaults | The VGT D1 baseline (exits), **not** the per-symbol VG Balanced values | 7.3% / 8 days / 2.9% / 5 bps | Illustrative, not optimised |

## 4. Evidence

- **Exit parity with Study 8 (real data, `src/growth-trading/tests/parity.test.ts`).**
  - The pools engine (`runPoolOn` → `runNAllocator`, fixed mode, 5 bps, 11%, 2016-01-04 → 2026-10-29) runs:
    - **B1** (`config/research-pools/study7-local-runners/S7R-B1.json`, VGT D1 primary);
    - the **`s8-vg-balanced`** pool (`S8-VG-F24-3`, both books).
  - Each book's own D1 entry decisions are fed into `simulateTrading` with that book's exit parameters.
  - Every standalone shadow trade is identical, field by field: decision, entry and exit session/minute/time, raw and
    cost-adjusted prices, fill type, exit reason, stop level, stop activity, hold-due flag, buffer decision
    time/price, interest, gross, net, stop activation counts.
  - Counts: B1 21 trades; VG Balanced VGT 13 and GDX 49 (1 open).
  - B1's minute and daily drawdowns are identical too.
  - This proves the execution and exit side only: the entry mechanism differs by design.
- **Rules on synthetic minute data (`src/growth-trading/tests/riseTrading.test.ts`, 24 tests).**
  - Stop: no exit on the entry session; gap fill at a loss; a losing trade's inactive stop; the ratchet (a session's
    own high does not move its stop; a lower high does not lower it); the stop-price fill.
  - Hold: a losing open at the age; a profitable open kept.
  - Buffer: the exact −$2,000 boundary; net after interest versus price; the closing print; the overnight carry;
    nothing before the age.
  - Switches, the dependency, re-entry, `order_pending`, absence of restriction state, determinism, and cent-level
    accounting reconciled with `FixedLedger`.
- **Same raw signals.** In `apps/strategy-lab/tests/real-data.test.ts`, the trading run's taken + ignored signals equal
  the signal-only runner's `entry_signal` events exactly (instants and prices), for VGT+GDX at 1d and VGT at 60m.
  `runner/entry-signal-run.ts` is unchanged.

## 5. Not inherited (and not exposed)

- Material-loss restriction, lower-price re-entry, recovery reset, frozen reference high, episodes.
- D1's deep-dip trailing buy and post-profitable-exit continuation (P/W).
- The gross-breakeven stop policy (`d1.breakeven`), staged entries, hard stop-losses, profit targets.
- Shared-capital allocation across symbols: each symbol is a standalone backtest.
