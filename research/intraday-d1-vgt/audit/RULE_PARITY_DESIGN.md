# Intraday D1 — rule-parity design (canonical D1 → 1-minute clock)

Canonical D1: `src/app/allIn-trailingBuy-postExitContinuation.ts` (sha256 `de0935c3…`, 1,535 lines; pinned by
`checkStrategyDefinition` at `a520cfcf@c636e40e`). Line numbers below refer to that file. The new strategy lives in
`src/intraday-d1/` and never imports or edits anything that changes D1's behaviour.

## 1. The observation that drives the design

Canonical D1 **already reads 1-minute bars**: arming, the trailing low, the rebound trigger, entry fills, stop
triggers and the buffered-loss signal are all evaluated on completed minutes. What makes it "daily" is (a) its
magnitudes (21.6% dip, 7.3% stop) and (b) a set of rules clocked by the **session**:

| D1 rule | Clock in D1 |
|---|---|
| Reference high over the previous L sessions, fixed for the session (743-746) | session |
| Arming guard: no arming until L sessions of history (800) | session count |
| Stop level raised once, after a session without an exit; never lowered (1080-1084) | session |
| Stop activation decided before each session's open, afresh (199) | session |
| Maximum hold: tested at the session's opening trade, elapsed calendar days (200-201, 220-224) | calendar days, session open |
| Buffered loss: only on sessions at or past the hold (323) | session |
| No exit on the entry session; no entry on an exit session (780, 788, 984) | session |
| Pending buy / pending buffered sale carried to the next session's opening trade (970-976, 348-357) | session |
| Continuation window: W sessions after the exit session; high updated at session end (810-818, 1110-1120) | session count |
| Interest: calendar days between session dates, none on the entry day (686-690) | calendar date |

## 2. The mapping: session → period

**Period.** Each regular session (09:30 ET to its scheduled close, 16:00 or 13:00 on early-close days, as
`groupMarketSessions` defines it) is cut into consecutive clock-aligned blocks of **B regular-session minutes**
starting at 09:30 ET; the last block ends at the scheduled close (shorter if B does not divide the session). A block
without any bar is not a period (as a session without bars is not a session). The **last period of a session** also
carries the session's closing print (its high includes it and its close is it), exactly as D1's session does; other
periods have none. Periods never span sessions, so overnight and weekend gaps appear only between a session's last
period and the next session's first.

**Every session-clocked rule of §1 is applied, unchanged, to the period.** When B equals the whole session (the
`session` clock) the engine *is* D1; that is the parity mode. Time units:

| D1 parameter | D1 unit | Intraday unit | Engine form |
|---|---|---|---|
| L `tickWindowSize` | previous L sessions | lookback duration `L_min` in regular-session trading minutes | previous `max(1, round(L_min/B))` periods (counted as D1 counts sessions: previous non-empty periods) |
| W `continuationWindow` | W sessions after the exit session | `W_min` trading minutes | `max(1, round(W_min/B))` periods after the exit period |
| hold `maximumHoldDays` | calendar days between session dates | `H_min` regular-session **trading minutes** between the entry period's start and the current period's start (overnight and closed days do not count) | `t(period) − t(entry period) ≥ H_min·60`, where t is the cumulative scheduled-trading-minute clock (seconds) |
| X, Y, stop, buffer, P | fractions | fractions (intraday magnitudes) | unchanged |
| interest | calendar days between session dates | **unchanged**: calendar days between the entry session's date and the current session's date (0 for a same-day round trip, 1 per night, 3 over a weekend) | identical formula |
| B | (the session) | period length in minutes, ordinal grid | new clock parameter |

Why trading minutes for the hold (a deviation, disclosed): D1 counts calendar days because at session granularity
calendar and trading time differ only by weekends (≈ ×1.4). At minute granularity wall-clock time is dominated by
the 17.5-hour overnight and 65.5-hour weekend closures, so any hold shorter than a night would make every overnight
position "due" at the next open whatever its length; a trading-minute clock keeps H a measure of time *in the
market*. The mechanism (a losing position is sold at the first period open at or after the hold; the buffered loss
applies from then on) is unchanged. In parity mode the hold is calendar days exactly as D1.

Why interest keeps D1's convention: calendar days between session dates is the broker end-of-day-debit convention
(interest on the debit balance carried overnight; none on an intraday round trip; three days over a weekend). It
charges no full day for a minutes-long position. A pro-rata (exposure-time) accrual is reported as a sensitivity.

## 3. Execution and cost convention (Study 8's, unchanged)

$100,000 notional per entry, fractional shares, one position at a time, never compounded; 11% simple interest
(365-day year); 5 bps per side: entry fill price × (1 + 5 bps) (so `shares` and every D1 net test see it), exit
price × (1 − 5 bps) × (1 − stop slippage, stop exits only); continuation opens on a trade whose net after interest
and costs is > 0 (`src/multi-etf-allocator/shadow.ts:117-123, 244-308`). Stops fill at the stop level (or the opening
trade through it), with next-open fills and +25 bps slippage as gating stresses (Q7/T4). With costs 0 the engine
reproduces D1's own accounting.

## 4. Same-bar and look-ahead policy (inherited from D1's structure)

- Decisions use completed minutes only; buys fill at the next observed trade (the open of the first later minute
  with a bar), never inside the decision minute; a decision with no later bar in its period carries to the next
  period's opening trade (the closing print only for a decision before the close in the session's last period).
- The trailing low takes a minute's low before its close is tested: causal (the close is the minute's last trade).
- The stop level and its activation are fixed before the period opens, so no intrabar high/low ordering question
  arises for the stop; entry and exit can never occur in one period, hence never in one bar.
- Stop fills at the stop level when a minute trades through it without opening through it (D1's `stop` mode) are
  optimistic intrabar; bounded by `next-open` (gating stress), +25 bps slippage (gating stress) and a report-only
  "trigger-minute low" worst case.
- Sparse minutes (no trade → no bar) are never fabricated; "next minute" always means the next observed bar.

## 5. Rule-parity matrix

| # | Canonical D1 rule | Source (D1 file) | Intraday implementation (`src/intraday-d1/engine.ts`) | Parameter / time-unit mapping | Test | Deviation |
|---|---|---|---|---|---|---|
| 1 | Reference high = max high of previous L sessions (incl. closing print), fixed per session | 743-746 | max high of previous Lp periods, fixed per period | L_min → Lp periods | parity P1/P2; unit `reference high` | none |
| 2 | Skip first history session; arming guard index ≥ L | 749-774, 800 | skip first period; arm only when period index ≥ Lp and on/after the study arming date | sessions → periods | unit `warm-up guard` | common arming date (Study 8 convention) |
| 3 | Deep arm: `1 − close/high ≥ X` on a completed minute close; deep before continuation | 777, 804-818 | identical expression | — | parity; unit `deep precedence` | none |
| 4 | Continuation arm: active, index > start, index − start ≤ W, `close ≤ contHigh·(1−P)` | 810-818 | identical with period indexes | W_min → Wp periods | parity; unit `continuation window` | none |
| 5 | Arming minute never buys; trailing low = arming close; any arming closes the window | 825-854 | identical | — | unit `arming minute` | none |
| 6 | Armed: low lowers trailing low, then close ≥ low·(1+Y) triggers; no expiry/re-arm; persists across sessions | 857-868 | identical, persists across periods | — | parity; unit `trailing buy` | none |
| 7 | Fill at first observed trade after decision; closing print only if decided before the close; else carried to next session's opening trade | 155-183, 900, 970-976, 789-793 | identical per period (closing print only in a session's last period) | — | unit `entry fill and carry` | none |
| 8 | Entries only on sessions that start flat; exits only on sessions that start long | 780, 788, 984 | per period | — | unit `exclusivity` | none (same-period round trips impossible, as same-session ones are in D1) |
| 9 | Initial stop after the entry session: max(fill, close, highs from fill bar) × (1 − stop) | 956-960 | identical at the entry period's end | — | parity; unit `initial stop` | none |
| 10 | Stop raised after a session without exit, never lowered | 1080-1084 | after a period without exit | — | parity; unit `stop ratchet` | none |
| 11 | Stop active iff shares·stop − inv − interest > 0, decided pre-open, not latched | 199 | identical, pre-period | — | parity; unit `activation not latched` | none |
| 12 | Gap: active and open ≤ stop → exit at opening trade | 206-216 | period open ≤ stop → period's opening trade | — | unit `gap` | none |
| 13 | Max hold: held ≥ hold and net at open < 0 → next trade after first minute | 200-201, 220-224 | identical at period open | hold days → H_min trading minutes | unit `maximum hold` | **clock: trading minutes** (§2) |
| 14 | Intraday stop: first minute open ≤ stop → its open; low ≤ stop → stop level (or next-open) | 231-254 | identical | — | parity; unit `stop fills` | none |
| 15 | Buffered loss after hold: first minute close net ≤ −inv·buffer, stop precedence, carry | 291-358, 1004-1011 | identical per period | — | unit `buffered loss` | none |
| 16 | Profitable exit opens continuation at exit price; window high at session end, expiry at index − start ≥ W | 1021-1027, 1110-1120 | identical per period; "profitable" = net after interest and costs (Study 8) | — | parity; unit `continuation expiry` | none (Study 8 cost convention) |
| 17 | Interest: calendar days between session dates | 686-690 | identical (session dates of the periods) | — | unit `interest` | none |
| 18 | Marks: every minute close + official close; strict minute DD from peak 0; daily DD at closes | 1087-1108 | identical | — | parity (DD) | none |
| 19 | End of run: open position marked at last close net of interest | 1151-1182 | identical; exit cost not deducted from the mark (Study 8 `markAt`) | — | unit `end mark` | none |
| 20 | Absent in D1: material-loss rule, lower-price re-entry, recovery reset, episodes/latches, take-profit, EOD flattening | 2.7 of D1 audit | not implemented | — | — | none |

**Parity tests planned.**

- **P1 (canonical file):** the engine in `session` clock mode with D1 `primary` parameters, costs 0, on the
  development prefix, reproduces the canonical D1 file's run on the same bytes trade by trade (entry/exit
  date-times, prices, reasons, profit, interest) and its minute and daily drawdown.
- **P2 (verified machines, intraday clock):** for random intraday parameter vectors on period-structured
  development data, the engine (interest rate 0, costs 0, hold in trading minutes) matches the repository's verified
  minute-stepped machines (`src/shared-margin-portfolio/strategy.ts` `EntryMachine`/`ExitManager`, via
  `fixtureDataset` with each period as a session and the trading-minute clock as its timestamp) trade by trade.
- **P3 (Study 8 cost convention):** session mode with 5 bps/side and the stresses equals Study 8's
  `ShadowBook`-based standalone trace for VGT `primary` over the development window (where the Study 8 lab can be
  driven without opening a Study 8 door), or else an explicit unit test of the cost arithmetic.
- **Non-regression of D1:** `src/lib/tests/frozenSource.test.ts` (pin), synthetic D1 suites, and a run of the
  canonical D1 CLI on the development prefix compared with the sealed development record
  (`research/vgt-d1-refinement/results/baseline/baseline.json`: 17 entries, $137,222.97, minute DD $19,330.69,
  daily DD $15,611.46); the data-reading regression suites after the freeze.
