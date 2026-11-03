# State machine: arm → trail → buy, with the original exits and restriction

This is the specification the engine implements (`src/trailing-buy/engine.ts`). Where the code and this text could disagree, the code was written first, and every rule below is covered by a test in `src/trailing-buy/tests/engine.test.ts`.

## Notation

For session *t* (one daily bar: open *O*, high *H*, low *Lo*, close *C*):

- `refHigh_t` = the highest **high** of the *L* sessions before *t* (today excluded; fewer at the start of the data).
- `drawdown_t = 1 − C_t / refHigh_t`; `signal_t = drawdown_t ≥ X`.
- Percentages are integers in tenths of a percentage point and become decimals as `n / 1000`, which equals the original's literals exactly (`100 / 1000 === 0.1`).
- `ATR_N` is Wilder's ATR (below). The ATR **known at session t** is `ATR_N[t − 1]`, computed through the previous completed session.

## State

| Variable | Meaning |
|---|---|
| `position` | the one open position, or none |
| `setup` | a pending (armed) trailing entry, only ever while flat; at most one |
| `order` | a next-open buy order placed at the previous close (next-open execution only) |
| `restriction` | the material-loss restriction: frozen loss-exit price, frozen reference high, lower level, running episode low |

## Per-session order of operations

Each session runs exactly one of the three blocks A, B or C, then D and E.

**A. A next-open order is waiting** (flat at the start of the session). It fills at this session's open. If the open is missing or not a positive number, the order is dropped and its setup is marked `order_invalid_open` (this never happens in the data). Nothing else is decided this session: no arming, no exit evaluation. After the fill, this session's high and low count as post-entry (they raise the stop for the next session and feed the lowest low).

**B. Flat at the start of the session** (no position, no order). The decision is made at the close:

1. **Episode low.** If restricted, `episodeLow = min(episodeLow, C_t)`.
2. **Recovery reset first.** If restricted and `C_t ≥ resetLevel = episodeLow + retrace × (frozenRefHigh − episodeLow)`, the reset takes precedence: a pending setup is **cancelled** (`cancelled_reset`, logged on the restriction episode), and nothing is armed or bought this session. The restriction clears at step E; normal eligibility resumes next session.
3. Otherwise, `lowerAllows = (not restricted) or C_t ≤ lowerLevel`.
4. **Legacy entry mode** (the original): if `signal_t` and `lowerAllows`, buy. If `signal_t` only, the entry is blocked (`entry_blocked`).
5. **Trailing modes, no setup pending:** if `signal_t` and `lowerAllows`, **arm**: freeze `armClose = C_t`, `armRefHigh = refHigh_t`, `trough = C_t`, and (snapshot ATR) `atrSnapshot = ATR_N[t − 1]`. Nothing is bought on the arming close. If `signal_t` only, arming is blocked (`entry_blocked`).
6. **Trailing modes, a setup pending** (armed on an earlier session):
   - If `C_t < trough`: new trough, `trough = C_t`; in snapshot ATR mode `atrSnapshot = ATR_N[t − 1]`. No purchase (the trigger is above the new trough by construction).
   - Else compute the trigger and buy if `C_t ≥ trigger`:

     | Mode | Trigger |
     |---|---|
     | `fixed` | `trough × (1 + Y)` |
     | `atrSnapshot` (primary ATR model) | `trough + K × atrSnapshot` |
     | `atrRolling` (robustness check) | `trough + K × ATR_N[t − 1]` |

     The drawdown is **not** re-tested: a rebound fill is allowed after the price has recovered above `X`.
   - **Restricted fill variant.** Variant **A** (primary): the lower level is checked only when arming, so a rebound fill can be above the frozen lower level, a semantic change from the original's lower-price *execution* rule. Variant **B** (sensitivity): while still restricted, the buy also needs `C_t ≤ lowerLevel`; a trigger above it is counted (`blockedTriggers`) and the setup keeps waiting.
   - Optional rule, off unless stated: **max-wait expiry** after *M* sessions (`t − armSession ≥ M`). After an expiry, eligibility resumes and a later close can arm a fresh setup.
7. **Execution of a buy decision.** `close` (research convention, the original's): fill at `C_t`. `nextOpen` (executable): place an order that fills at the next session's open (block A). Shares = $100,000 / fill price (fractional). The position's frozen reference high, used if it later exits at a material loss, is `armRefHigh` (the activation reference high; alternative `fill` = `refHigh` of the decision session).

**C. A position was open at the start of the session.** No arming and no entry this session, so there is never a same-session exit and re-entry. Exits are the original's, in its order, using interest accrued through this session:

1. `isStopActive = shares × stop − $100,000 − interest > 0` (decided before the open, from the stop set after the previous session).
2. **Maximum hold:** if calendar days held ≥ *holdDays* and selling at the open loses money after interest → sell at the open (`maximum hold`).
3. Else if the stop is active and `O_t ≤ stop` → sell at the open (`trailing stop gap`), even at a loss.
4. Else if the stop is active and `Lo_t ≤ stop` → sell at the stop price (`trailing stop`).
5. No exit → `postEntryHigh = max(postEntryHigh, H_t)`, `stop = max(stop, postEntryHigh × (1 − stopPct))` for the **next** session. A session's own high never moves its own stop.
6. On an exit, `priceReturn = exitPrice / entryPrice − 1` (interest excluded). If `priceReturn ≤ −materialLoss`, the strategy becomes **restricted**: `lossExitPrice = exitPrice`, `frozenRefHigh` = the position's frozen reference high, `lowerLevel = exitPrice × (1 − lowerReentry)`, `episodeLow = C_t`.

**D. Mark to market.** `mtm_t = realized P&L + (shares × C_t − $100,000 − accrued interest)`; maximum drawdown is the largest fall of `mtm` from its running peak (which starts at $0 at the run start).

**E. End of session, restriction resolution** (exactly the original's): extend the episode low with `C_t`; if a position opened in this session, the restriction clears (`lower_price_reentry`); else if flat with no order and `C_t ≥ resetLevel`, it clears (`recovery_reset`); otherwise it persists. This also runs on the exit session itself.

**End of data.** An open position is marked at the last close. A pending setup is reported `pending_at_end`; an unfilled next-open order `order_unfilled_at_end`. Neither changes P&L.

## Interest

Simple interest, `$100,000 × rate × (exit time − entry time) / 365 days`, none on the entry day, accrued through the exit session. Fixed at 11% a year except in the stated rate sensitivities.

## ATR

- True range: `TR_0 = H_0 − Lo_0` (first bar of the data file); afterwards `TR_t = max(H_t − Lo_t, |H_t − C_{t−1}|, |Lo_t − C_{t−1}|)`, so overnight gaps count.
- Wilder's ATR(N): undefined before `t = N − 1`; `ATR[N − 1] = mean(TR_0..TR_{N−1})`; then `ATR[t] = (ATR[t − 1] × (N − 1) + TR_t) / N`.
- The data are Stooq's back-adjusted series (splits and distributions scaled multiplicatively), so ATR and prices are on the same adjusted scale and `K × ATR / trough` (the effective rebound) is unaffected by the 2026 8:1 split. The series starts in 2005; with signals from 2014 every ATR is fully warmed up.
- If an ATR value is undefined (only possible in tests with short data) the trigger is undefined and cannot fire.

## Worked examples

**Fixed Y = 3% (the brief's check).** Prior high $100. Close $89.90 is 10.1% below → arm (no buy). Closes $80, $75 → trough $75, trigger $77.25. Closes $77.20, $77.24 → no. Close $78.00 → buy at **$78.00** (the actual close; never a fabricated $77.25 fill).

**Recovery reset while armed.** After a material loss exiting at $84 (lower level $82.32, frozen reference high $100): close $83 → signal but above the lower level, arming blocked; $82 → arm; $80 → trough; reset level = 80 + 0.38 × 20 = $87.60. Close $88 clears both the $82.40 trigger and the reset level: the **reset wins**, the setup is cancelled and nothing is bought. Next session $88.50 is still 11.5% below $100: unrestricted, a new setup arms (no buy).

**Variant A vs B.** Same episode, but the rebound from $80 to $82.50 clears the $82.40 trigger: A buys at $82.50 (above the $82.32 lower level); B waits, and buys later at $80.40 after a new $78 trough, because $80.40 ≤ $82.32.

## What the machine never does

- Uses a session's high, low or close before that session (reference highs exclude today; the ATR used is the previous session's).
- Fills at a computed threshold instead of a traded price, or infers intraday order from the daily bar (the trailing buy is close-to-close, not an intraday buy-stop).
- Holds two positions, pyramids, keeps two setups, or re-arms every day below *X* while a setup is pending.
- Buys on the arming close, on a reset session, or on a session that started with a position.
