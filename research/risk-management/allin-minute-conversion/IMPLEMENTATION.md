# `allIn.ts` on one-minute VGT bars: implementation report

`src/app/allIn.ts` now runs on `data/VGT/VGT-2016-2025-1-minute.csv`. The strategy, its parameters and its
re-entry state machine are unchanged. What changed is *when* each decision is made and *which observed
price* each order gets:

- **Entries** are decided at 3:59 p.m. ET (one minute before the actual close, 12:59 p.m. on early-close
  days). The decision uses only minutes completed by then and fills at the first trade after the decision
  (the open of the 3:59 p.m. minute).
- **The trailing stop** keeps its once-daily update. It is now checked minute by minute.
- **The 15-day loss exit** is decided on the opening trade and fills at the next minute's opening trade.

Over the identical sessions from 2016-10-07 to 2025-10-13:

| | Original (daily file) | Minute implementation | Change |
|---|---:|---:|---:|
| Total net profit | $173,055 | $166,909 | −$6,146 (−3.6%) |
| Max daily mark-to-market drawdown | $28,687 | $28,889 | +$202 (+0.7%) |
| Max minute-sampled drawdown | n/a | $32,632 | |
| Trades | 32 + 1 open | 31 + 1 open | |
| Reproduced with the same entry and exit dates | | 28 of 33 | |

About **−$9,200 of the change comes from the data source**, not from execution: raw Alpaca prices with
no dividends instead of the dividend-adjusted daily file. Run on the *same* raw prices, the minute
implementation earns **$3,054 more** than the original daily logic.

Reproduce everything from the repository root with
`bash research/risk-management/allin-minute-conversion/run.sh`. It takes under a minute. The full
generated tables are in [`results/comparison.md`](results/comparison.md).

---

## 1. Method

The original implementation (git `HEAD` `d7b6108` at the start of this work) is frozen at
[`original/allIn.daily.ts`](original/allIn.daily.ts) and runs unmodified through `src/app.ts`. Four runs
cover exactly the same 2,266 sessions, 2016-10-07 (the daily file's first session) to 2025-10-13 (the
minute file's last):

| Run | Code | Data | Purpose |
|---|---|---|---|
| **A** | original | `data/VGT/VGT-2016-2026.csv` (split- and dividend-adjusted daily) | the baseline as it stood |
| **B** | original | daily sessions aggregated from the minute file (raw) | same prices as M: B → M isolates execution |
| **M** | minute `allIn.ts` | minute file | the converted strategy |
| **M2** | minute `allIn.ts`, `next-open` stop fills | minute file | bound on the stop-fill assumption |

A → B measures the change of data source and B → M the change of execution. The aggregated sessions in
B come from the same `groupMarketSessions` used by M (`scripts/aggregate-sessions.ts`). The original CSV
is not modified.

Command: `npm run app allIn VGT 2016-10-07 2025-10-13 data/VGT/VGT-2016-2025-1-minute.csv <out dir> [stop|next-open]`.
With no arguments, the run covers the whole minute file (2016-01-04 to 2025-10-13): $168,374 net, 32 + 1
trades, $28,889 daily drawdown. The original over its whole daily file (2016-10-07 to 2026-10-06) made
$196,310. That figure covers a different period and is not comparable.

## 2. The minute data (`results/data-audit.json`)

| Property | Finding |
|---|---|
| Format | No header, comma-separated: `"ISO timestamp",open,high,low,close,volume`. No trade counts. |
| Rows / coverage | 809,490 rows, `2016-01-04T13:00:00Z` to `2025-10-13T23:07:00Z`. 2,459 sessions, 2016-01-04 to 2025-10-13. |
| Time zone | Every timestamp is UTC (`Z`). New York time is derived with `America/New_York`. All 19 DST transitions show the 9:30 open moving between 14:30Z and 13:30Z. |
| Bar labeling | **Start of minute.** The regular session runs from the 09:30 bar to the 15:59 bar. The bar labeled 16:00 opens with the closing-auction print: its open tracks the daily file's close to a median 1.0e-5 day over day, against 2.5e-4 for the 15:59 bar's close. |
| Hours | 797,115 regular-session bars, 2,454 closing-print bars and 9,921 extended-hours bars (dropped). |
| Duplicates / order / OHLCV | None, strictly ascending, 0 inconsistent rows. The loader throws on a duplicate or out-of-order row. |
| Sessions vs. daily file | Identical session sets over the common range: no missing or extra dates. The 2018-12-05 and 2025-01-09 closures have no data, as they should. |
| Early closes | All 19 NYSE 1:00 p.m. closes from 2016 to 2025 show their last regular minute at 12:59, with the closing print at 13:00 (except 2016-11-25, which has none). The 495k-share print at 13:02 on 2023-07-03 is an after-close block trade and is excluded. No normal session has less than 6.9% of its volume after 1:00 p.m., so no unlisted early close exists. |
| Missing minutes | Minutes without trades have no bar. The median session has 325 of 390 bars (286 in 2016, 371 in 2020), and only 28 sessions are complete. |
| Decision-critical gaps | The **15:58 decision minute** is missing on 16 sessions; the previous completed minute is used instead. The **15:59 fill minute** is missing only on 2019-08-12. The **closing print** is missing on 5 sessions (2016-04-06, 2016-11-25, 2019-08-12, 2025-08-29, 2025-09-05); the last regular trade stands in as the close. The 9:31 minute is missing on 195 sessions; the 15-day exit then uses the next minute with trades. |
| Data gap | **2019-08-12 has no bars after 15:29.** That session's close is its 15:29 trade. It wasn't a signal session and no position was open, so no trade is affected. |
| Adjustment | **The minute file is raw and the daily file is split- and dividend-adjusted.** The daily-file/minute ratio falls from 8.707 (2016) to 8.045 (2025) in 38 persistent steps, almost all on quarterly ex-dividend dates (mid/late March, June, September, December, −0.11% to −0.38%). The roughly 8× factor is a split adjustment for a split after the minute file ends. There is no split inside the minute file: the largest overnight raw gap is −12.0% on 2020-03-16, a real move. |

**Price convention.** The minute implementation uses only the raw minute prices: signals, stops, the
restriction and the marks to market all come from the same series. Nothing is converted, and adjusted
and raw prices are never mixed. The strategy is percentage-based with a fixed $100,000 position, so the
price scale doesn't matter. The dividend adjustment does: see §6.

**Session aggregates** (`src/lib/session.ts`):
- open: the first regular-session trade;
- high/low: the regular-session minutes plus the closing print, which matches the daily file's high/low
  more often than minutes alone (1,622 vs. 1,567 exact matches);
- close: the closing print, or the last regular trade when there is none.

## 3. Execution model

A normal session (early closes shift everything to 1:00 p.m.):

| Time (ET) | What happens | Prices used |
|---|---|---|
| before 9:30 | The stop level comes from the post-entry high through the previous session. The stop is **activated** only if filling at it would be profitable after interest through today's date (unchanged). | previous sessions only |
| 9:30 (opening trade) | An active stop the open gaps through fills at the **opening trade** (resting stop-market order, unchanged price). | 9:30 bar open |
| 9:30 → 9:31 | **15-day loss exit:** after at least 15 calendar days, if a sale at the opening trade would lose money after interest, a sell order goes in after that trade is seen. It fills at the **next minute's opening trade**. | decision: 9:30 open; fill: 9:31 open (or the next minute with trades) |
| 9:30–16:00 | Each minute in order: the first minute whose low reaches an active stop triggers it. The fill is the **stop level** when the minute opened above the stop (assumed, as before), or the **minute's open** when it opened at or below the stop. | minute bars |
| 15:59:00 | **Entry decision**, on the 15:58 minute's close (the last completed minute) against the high of the previous 90 sessions, plus the restriction checks. Nothing from 15:59 onward is seen. | ≤ 15:58 bar |
| 15:59 → | A marketable buy fills at the **first trade at or after 15:59:00**: the 15:59 bar's open, else the closing print, else no entry. | 15:59 bar open |
| 16:00 (close) | Session aggregates are final. The once-daily stop update (post-entry prices only on the entry session), the restriction's episode low and recovery reset, and the daily mark to market all use the official close. | closing print |

There is no same-session re-entry after an exit, as in the original. An entry is only evaluated when no
position was open at the start of the session.

## 4. Retained parameters (unchanged)

| Parameter | Value |
|---|---|
| Entry dip from the reference high | 10% |
| Reference high | highest high of the previous 90 trading sessions (sessions, not minutes; window within the run's date range, as before) |
| Trailing stop | 8% below the post-entry high, updated once a day, never lowered |
| Stop activation | only when a fill at the stop would be profitable after interest, decided before each session |
| Loss exit | after ≥ 15 calendar days, only when a sale at the open would lose money after interest |
| Material loss | price return ≤ −0.5% |
| Lower-price re-entry | at or below 97% of the frozen loss-exit price |
| Recovery reset | a close recovering 38% of the frozen-reference-high-to-episode-low decline |
| Position | $100,000 borrowed per position, fractional shares |
| Margin interest | 11% a year, simple, per calendar day, none on the entry day |

No indicator, filter, parameter or rule was added or tuned. The original has no moving average or other
indicator beyond the 90-session high.

## 5. Every change to the strategy's implementation

Each entry gives: **Original** / **Now** / **Why** / **Type** (strategy rule or execution assumption) /
**Effect** on these results. Effects are measured B → M (same prices) unless stated.

### Data loading

1. **New minute loader** `loadCsvMinuteBacktestData` (`src/lib/csv.ts`).
   - Original: `loadCsvBacktestData` read the pipe-separated daily file.
   - Now: a streaming parser for the Alpaca schema. It requires UTC timestamps and strictly ascending rows.
     `loadCsvBacktestData` is untouched; `ladderUp.ts` and `ladderDown.ts` still use it.
   - Why: different schema, timestamps and size.
   - Type: data only.
   - Effect: none by itself.
2. **Sessions aggregated from minutes** (`groupMarketSessions`, `MarketSession` type).
   - Original: official daily OHLC from the file.
   - Now: regular-session minutes plus the closing print, as described in §2. `MarketSession` extends
     `Tick`, so session-level code reads `open/high/low/close/time` as before.
   - Why: session-based rules (the 90-session high, closes for the restriction, daily marks) must stay
     session-based.
   - Type: data/execution.
   - Effect: part of A → B.
3. **Raw instead of dividend-adjusted prices.**
   - Original: the adjusted daily file, which embeds dividends (about 0.9% a year) in returns.
   - Now: raw prices. Dividends aren't credited, and ex-dividend drops (0.1–0.4%) are price moves for
     signals and stops.
   - Why: the minute file is raw, and adjusting it would require an external dividend history and would
     no longer match tradable prices.
   - Type: data.
   - Effect: together with item 2, **A → B = −$9,200**. The two can't be separated without a dividend
     series. Examples: the 2020-04-02 trade returns 52.69% adjusted vs. 52.30% raw. Two sequence
     differences come from the data source alone: 2018-03-28 vs. 2018-04-02, and 2022-06-13's exit date.
4. **Default data file** is now `data/<symbol>/<symbol>-2016-2025-1-minute.csv`.
   - Type: configuration.

### Timestamps and market sessions

5. **New York sessions and the real schedule** (`src/lib/session.ts`).
   - Original: dates only, with no intraday times.
   - Now: `America/New_York` via `Intl`, cached per UTC hour, so DST is exact. The scheduled close is
     4:00 p.m., or 1:00 p.m. on the listed NYSE early closes. Full closures are recognized by having no
     bars.
   - The early-close list covers 2016–2025, and sessions outside it **throw** rather than silently
     assuming 4:00 p.m.
   - Type: execution infrastructure.
   - Effect: no entry fell on an early-close day, but the decision and fill times there are 12:59.
6. **Session timestamps keep the daily convention.**
   - `MarketSession.time` and `position.entryTimestamp` are midnight UTC of the session date, as with
     daily ticks.
   - The exact fill times are recorded separately (`entry_time`, `exit_time`).
   - Why: so that interest and the 15-day count keep counting calendar days (item 15).
   - Type: none (preservation).

### Entry execution

7. **Decision one minute before the close, on the last completed minute.**
   - Original: the signal used the session's close, and the order filled at that close. That was knowingly
     impossible (the signal used the fill price).
   - Now: the decision runs at close − 1 minute on the close of the last bar completed by then. That is
     the 15:58 bar, or an earlier one when 15:58 had no trades (16 sessions).
   - Why: the requested change, and it removes look-ahead.
   - Type: execution timing; the rule is the same.
   - Effect: one missed entry (2018-02-08, −$5,388) and one shifted entry (2020-03-20 → 03-23, +$105).
     See §8.
8. **Fill at the first trade after the decision.**
   - Original: the close.
   - Now: the open of the first minute at or after 15:59:00. The fallback is the closing print, then no
     entry (counted as `entriesWithoutTrade`; 0 here).
   - Type: execution price.
   - Effect: −$1,264 on the 28 trades with the same dates. Through 2022-06-13's loss exit, +$3,896
     (§8). On average the fills sit 6.9 bps above the close (§7).
9. **Restriction checks at the decision use the decision price.**
   - Original: today's close extended the episode low *before* the reset and lower-level checks.
   - Now: the decision price counts towards the episode low **for the decision only**. The stored episode
     low still takes only closes, at the end of the session.
   - A decision price at or above the provisional reset level blocks the entry (the reset keeps
     priority). The recovery reset itself is still decided on the official close, so a reset can never
     authorize a purchase earlier in the same session.
   - Why: no look-ahead, and closes keep their meaning in the episode low.
   - Type: execution timing.
   - Effect: the reset-priority block occurred once (2022-11-11), and that close also reset, so the
     provisional and close-based outcomes never disagreed.
10. **The entry session's post-entry high counts only prices after the fill.**
    - Original: the next session's stop came from the entry close (no prices after the fill existed).
    - Now: the maximum of the fill, the highs of the fill minute onward and the closing print. Pre-entry
      minutes are excluded.
    - Why: the spec ("track only prices occurring after the position was opened").
    - Type: execution.
    - Effect: the first stop can be marginally higher. That is included in the −$18 stop effect; it
      changed no exit date.

### Exit execution

11. **Stop triggers found minute by minute.**
    - Original: the daily low reaching the stop meant a fill at the stop price.
    - Now: the first minute whose low reaches the stop. If that minute **opened at or below** the stop
      (a gap between minutes), it fills at that minute's open, which is observed. Otherwise it fills at
      the stop level, which is assumed, as before.
    - Type: execution.
    - Effect: −$18 across the 8 stop exits with the same dates. One exit (2023-08-09) filled at the
      minute's open, 5¢ below its stop.
12. **Gap through the stop at the open.**
    - The price is unchanged: the opening trade, which equals the aggregated session open.
    - When a gap and a due 15-day exit coincide, the original labeled the exit `maximum hold`; it is now
      `trailing stop gap` with `maximum_hold_due = true`, because the resting stop executes before an
      order placed in reaction to the open could.
    - Type: labeling.
    - Effect: none; the coincidence never occurred.
13. **The 15-day loss exit is decided on the opening trade and fills at the next minute's opening trade.**
    - Original: decided and filled at the same opening price.
    - Now: the opening trade (9:30 bar open) decides; the fill is the first trade at or after 9:31:00 (or
      a later minute when 9:31 had no trades).
    - Why: an order can't fill at the price that triggered it. The 9:30 bar's close was rejected as a
      proxy because a single-trade bar's close *is* the opening trade.
    - Type: execution. The 15-day threshold and the "sale would lose money" condition are unchanged; it
      is not a mandatory exit.
    - Effect: +$2,098 on the 15 same-date loss exits. No loss exit became profitable.
    - Through the re-entry restriction: +$10,164 (2019-01) and −$6,540 (2022-11). See §8.
14. **`next-open` stop-fill option** (6th CLI argument; the default `stop` keeps the original fill).
    - Type: a sensitivity bound, not a strategy.
    - Effect: M2 − M = −$355.

### Interest and accounting

15. **Interest: unchanged.** Calendar days from the entry session's date to the exit session's date, none
    on the entry day, 11%.
    - Exact elapsed time would have reduced closed-trade interest by **$228** (1,656 calendar days vs.
      1,648.4 elapsed). That correction was deliberately *not* made.
    - Effect: none.
16. **Marks to market.**
    - The daily mark is unchanged: realized profit plus the open position at the official close, net of
      interest.
    - Because the fill is no longer the close, the entry session's mark is no longer exactly −$0.
    - **New:** a minute-sampled mark (each minute's close, then the official close), reported as a
      second drawdown.

### Changes required to eliminate look-ahead

17. The entry signal no longer sees its own fill price or the close (item 7).
18. The restriction checks no longer see the close (item 9), and the episode low isn't contaminated by
    intraday prices.
19. The 15-day loss exit no longer fills at the price it was decided on (item 13).
20. The entry session's pre-entry minutes no longer count towards the post-entry high (item 10).

### Other

21. **`evaluateSessionExit`'s signature** now takes the `session` (with minutes) and `stopFill`, and
    returns the fill minute and price source. `firstTradeFrom` is new and exported. There are no other
    callers.
22. **Output.**
    - `trades.csv` appends `entry_time, entry_execution, decision_time, decision_price,
      entry_session_close, exit_time, exit_execution, exit_stop_price, maximum_hold_due`.
    - `daily.csv` appends `recent_high, decision_price, signal`, and `states.csv` appends
      `decision_price`.
    - `summary.json` adds `stopFill`, `minuteMaximumDrawdown` (with its times) and
      `entriesWithoutTrade`.
    - The console shows ET fill times, the decision minute and price source, and the session's close.
      The existing lines are kept.
23. **The "lowest low" log line** now includes the exit session's minutes before the exit minute
    (logging only).

## 6. Execution limitations and remaining uncertainty

- **A minute's open is an observed trade, not a fill.** The first trade at or after 15:59:00 may come
  before an order submitted when the 15:58 bar completes. Alpaca publishes a bar shortly after its minute
  ends, so the modeled entry is slightly optimistic in timing. It doesn't use unknown *information*.
- **Stop fills at the stop level are assumed** for the 8 exits whose trigger minute opened above the stop.
  Bounds:
  - filling at the next minute's open (M2) changes profit by −$355;
  - filling at the triggering minute's close, −$717;
  - filling at its low (worst case), −$806 (lows 0.1–29 bps below the stops).
- **The 15-day exit's fill** is the next minute's first trade, up to about a minute after the open.
  A real order would fill within seconds, at a price the bars can't show.
- **No bid-ask spread, slippage or market impact.** VGT's spread (typically a few cents on a $150–750
  price) is roughly 0.2–3 bps per side. $100,000 is 130–800 shares.
- **Dividends are not credited** (about 0.9% a year while invested). That understates long-holding
  trades relative to a real account, and ex-dividend drops can marginally move signals and stops.
- **Missing minutes** are handled deterministically ("last completed minute" and "first trade at or
  after"), never by inventing prices. 2019-08-12's missing last half hour affects only that session's
  aggregates.
- **The early-close calendar is a hard-coded list,** validated against the data for 2016–2025. Later
  data needs the list extended (the code refuses to guess).
- **Small execution differences flip discrete decisions.** The decisions in §8 turned on 0.8¢, 3.6¢,
  $16 of profit, and 0.15 percentage points of return around the −0.5% material-loss threshold. The
  sequence effects are about ±$30,000 gross for +$2,237 net. Results at this precision are fragile, and
  the $3,054 B → M improvement should not be read as an edge.

## 7. Results

| Run | Net profit | Realized | Unrealized | Margin interest | Max DD (daily) | Max DD (minute) | Trades | Wins / losses | Avg hold (days) | Restrictions (re-entries / resets) |
|---|---|---|---|---|---|---|---|---|---|---|
| A: original, daily file | $173,055 | $129,356 | $43,699 | $56,808 | $28,687 | n/a | 32 + 1 open | 14 / 18 | 53.3 | 14 (10 / 4) |
| B: original, minute sessions | $163,855 | $120,488 | $43,367 | $56,929 | $28,871 | n/a | 33 + 1 open | 14 / 19 | 51.8 | 14 (10 / 4) |
| M: minute implementation | $166,909 | $123,603 | $43,306 | $55,332 | $28,889 | $32,632 | 31 + 1 open | 12 / 19 | 53.4 | 16 (12 / 4) |
| M2: minute, next-open stop fills | $166,554 | $123,249 | $43,306 | $55,332 | $28,851 | $32,594 | 31 + 1 open | 12 / 19 | 53.4 | 16 (12 / 4) |

Drawdown windows: A 2024-07-10 → 2025-04-08; B 2024-07-10 → 2025-04-08; M 2024-07-10 → 2025-04-08 (minute: 2024-07-15T15:21:00.000Z → 2025-04-07T13:42:00.000Z).

Exit reasons:

| Run | trailing stop | trailing stop gap | maximum hold |
|---|---|---|---|
| A | 11 | 4 | 17 |
| B | 11 | 4 | 18 |
| M | 9 | 4 | 18 |
| M2 | 9 | 4 | 18 |

**Entry prices against the official close of the same session (M, 32 entries):**

| Measure | Fill (15:59 open) vs close, bps | Decision price (15:58 close) vs close, bps |
|---|---|---|
| Mean (signed) | 6.9 | 7.6 |
| Mean absolute | 9.8 | 10.3 |
| Median absolute | 4.4 | 5.7 |
| Largest absolute | 88.1 | 88.4 |
| Fills above the close | 21 of 32 |  |
| Fills below the close | 10 of 32 |  |

The largest gaps were on 2020-03-23 (+88 bps) and 2020-03-12 (+53 bps), in the COVID crash's closing
minutes. Fills average 6.9 bps *above* the close, so the late-day drift was against the buyer more often
than not (21 of 32).

**Drawdown.**
- The daily drawdown window is the same in A, B and M: peak 2024-07-10, trough 2025-04-08.
- M's daily maximum is $202 above A's and $18 above B's.
- Sampling each minute adds $3,743 ($32,632): the intraday trough came at 9:42 a.m. on 2025-04-07,
  during the tariff sell-off, from a peak at 11:21 a.m. on 2024-07-15.

## 8. Trade-by-trade differences

**Attribution of B → M.** Both runs use the same raw prices, so this is execution only, and the
decomposition is exact.

| Component | Effect |
|---|---|
| Same entry and exit dates: entry prices (15:59 fill vs close) | −$1,264 |
| Same entry and exit dates: exit prices, trailing stop | −$18 |
| Same entry and exit dates: exit prices, maximum hold | +$2,098 |
| Same entry and exit dates: exit prices, trailing stop gap | $0 |
| Same entry and exit dates: exit prices, open at end (marked at the same close) | $0 |
| Same entry and exit dates: interest | $0 |
| Same entry date, different exit date (1 trade, whole profit change) | +$8,946 |
| Trades only in M (sequence) | +$26,633 |
| Trades only in B (sequence) | −$33,342 |
| Total | +$3,054 |
| Check: M − B net profit | +$3,054 |

Trades whose exit date changed (B → M):

- 2022-06-13: maximum hold 2022-07-05 → trailing stop gap 2022-08-29 (+$8,946)

**The five trade-sequence divergences** (B → M; A shares all of them except where noted):

| # | Sessions | Trigger | Mechanism | Δ profit |
|---|---|---|---|---:|
| 1 | 2018-02-08 | entry timing | The close was 10.31% below the 90-session high (179.19), but the 15:58 decision price (161.49) was only 9.88% below, so there was no signal. The +$5,388 trade (2018-02-08 → 03-23) is missed. Both then enter 2018-03-28 (A enters 2018-04-02 because of its dividend-adjusted prices). | −$5,388 |
| 2 | 2019-01-02 → 01-03 | exit timing → restriction | The 15-day exit filled at the 9:31 open, 163.86, instead of the opening trade, 163.55. That raised the frozen lower level from 158.644 to 158.944. On 2019-01-03 the decision price, 158.842, qualifies; B's close, 158.68, missed by 3.6¢. M's 01-03 entry (+$21,009) replaces B's 01-22 entry (+$10,845). | +$10,164 |
| 3 | 2020-03-20 → 03-23 | entry timing | Restricted after the 2020-03-16 gap exit, with lower level 187.472. On 03-20 B's close, 187.15, qualifies; M's decision price, 187.48, is 0.8¢ above. M enters 03-23 instead (+$7,523 vs. +$7,418). | +$105 |
| 4 | 2022-06-13 → 07-05 | entry price → exit timing | M's fill (321.22) was 25¢ below B's close (321.47). On 2022-07-05, a sale at the opening trade (323.40) gives M +$16 after $663 interest, against B's −$63. So M's 15-day exit doesn't fire, and M holds until the 2022-08-29 gap exit (+$8,884 vs. −$63). B's next trade, 2022-07-06 (+$5,050), is lost. A also held to 2022-08-29. | +$3,896 |
| 5 | 2022-11-03 → 11-04 | exit timing → classification | The 15-day exit filled at 310.87 instead of 311.22, and the entry was at 312.88 instead of 312.76. The price return is −0.64% instead of −0.49%, crossing the −0.5% material-loss threshold. M is restricted: the 11-04 entry is blocked (+$4,641 lost), the close resets the restriction on 11-11, M enters 11-14 (−$1,899) and then re-enters 12-19 as B does. | −$6,540 |

The five chains net +$2,237. With the +$816 of direct price effects on the 28 same-date trades
(−$1,264 entries, +$2,098 loss exits, −$18 stops), they make the +$3,054 total.

By trigger:
- **entry timing** −$2,651 (−$1,264 − $5,388 + $105 + $3,896);
- **exit timing** +$5,704 (+$2,098 − $18 + $10,164 − $6,540).

**Restriction episodes.**
- A and B have the same 14 episodes. M has 16.
- M's 2019-01-02 episode ends with a lower-price re-entry on 01-03, where A and B reset on 01-18.
- M's 2020-03-16 episode ends on 03-23 instead of 03-20.
- M adds the 2022-11-03 episode (reset 11-11) and the 2022-11-29 episode (re-entry 12-19).

**A (original daily file) against M**, by entry date:

| Entry date | A exit | M exit (ET) | A price return | M price return | A profit | M profit | Δ profit | Category |
|---|---|---|---|---|---|---|---|---|
| 2018-02-08 | 2018-03-23 trailing stop | — | 6.69% | — | $5,395 | — |  | only in A: decision 9.88% vs close 10.31% below the high; M flat |
| 2018-03-28 | — | 2018-10-10 15:19 trailing stop | — | 12.25% | — | $6,342 |  | only in M: decision 10.02% vs close 10.16% below the high; A  |
| 2018-04-02 | 2018-10-10 trailing stop | — | 13.37% | — | $7,610 | — |  | only in A: decision 10.46% vs close 10.45% below the high; M held a position |
| 2018-10-11 | 2018-10-26 maximum hold | 2018-10-26 09:31 maximum hold | −1.45% | −1.29% | −$1,903 | −$1,746 | +$157 | same entry and exit dates |
| 2018-11-12 | 2018-11-27 maximum hold | 2018-11-27 09:31 maximum hold | −3.08% | −3.12% | −$3,532 | −$3,568 | −$37 | same entry and exit dates |
| 2018-12-17 | 2019-01-02 maximum hold | 2019-01-02 09:31 maximum hold | −3.15% | −2.90% | −$3,631 | −$3,380 | +$251 | same entry and exit dates |
| 2019-01-03 | — | 2019-05-13 13:00 trailing stop | — | 24.93% | — | $21,009 |  | only in M: decision 22.30% vs close 22.38% below the high; A  |
| 2019-01-22 | 2019-05-13 trailing stop | — | 14.53% | — | $11,183 | — |  | only in A: decision 15.30% vs close 14.97% below the high; M held a position |
| 2019-06-03 | 2019-08-05 trailing stop | 2019-08-05 10:41 trailing stop | 8.10% | 7.66% | $6,201 | $5,764 | −$436 | same entry and exit dates |
| 2020-02-25 | 2020-03-11 maximum hold | 2020-03-11 09:31 maximum hold | −8.39% | −9.01% | −$8,847 | −$9,463 | −$616 | same entry and exit dates |
| 2020-03-12 | 2020-03-16 trailing stop gap | 2020-03-16 09:30 trailing stop gap | −2.31% | −2.83% | −$2,432 | −$2,946 | −$514 | same entry and exit dates |
| 2020-03-20 | 2020-04-01 trailing stop | — | 7.78% | — | $7,420 | — |  | only in A: decision 31.51% vs close 31.63% below the high; M entry_blocked |
| 2020-03-23 | — | 2020-04-01 15:08 trailing stop | — | 7.79% | — | $7,523 |  | only in M: decision 31.64% vs close 32.24% below the high; A  |
| 2020-04-02 | 2020-09-04 trailing stop | 2020-09-04 09:47 trailing stop | 52.69% | 52.37% | $48,014 | $47,696 | −$318 | same entry and exit dates |
| 2020-09-08 | 2020-09-24 maximum hold | 2020-09-24 09:31 maximum hold | −2.07% | −1.88% | −$2,556 | −$2,360 | +$196 | same entry and exit dates |
| 2020-10-28 | 2021-02-23 trailing stop | 2021-02-23 09:46 trailing stop | 17.37% | 17.18% | $13,810 | $13,619 | −$191 | same entry and exit dates |
| 2021-03-04 | 2021-05-11 trailing stop gap | 2021-05-11 09:30 trailing stop gap | 3.88% | 3.69% | $1,830 | $1,636 | −$195 | same entry and exit dates |
| 2022-01-19 | 2022-02-04 maximum hold | 2022-02-04 09:31 maximum hold | −1.02% | −1.08% | −$1,501 | −$1,565 | −$63 | same entry and exit dates |
| 2022-02-18 | 2022-03-07 maximum hold | 2022-03-07 09:31 maximum hold | −1.99% | −1.61% | −$2,505 | −$2,117 | +$387 | same entry and exit dates |
| 2022-03-08 | 2022-04-11 trailing stop gap | 2022-04-11 09:30 trailing stop gap | 5.22% | 5.00% | $4,197 | $3,975 | −$221 | same entry and exit dates |
| 2022-04-12 | 2022-04-27 maximum hold | 2022-04-27 09:31 maximum hold | −5.29% | −4.62% | −$5,739 | −$5,070 | +$669 | same entry and exit dates |
| 2022-05-09 | 2022-05-24 maximum hold | 2022-05-24 09:31 maximum hold | −2.01% | −1.91% | −$2,457 | −$2,358 | +$99 | same entry and exit dates |
| 2022-06-13 | 2022-08-29 trailing stop gap | 2022-08-29 09:30 trailing stop gap | 11.32% | 11.20% | $9,000 | $8,884 | −$116 | same entry and exit dates |
| 2022-08-30 | 2022-09-14 maximum hold | 2022-09-14 09:31 maximum hold | −2.76% | −2.83% | −$3,207 | −$3,279 | −$72 | same entry and exit dates |
| 2022-09-21 | 2022-10-06 maximum hold | 2022-10-06 09:31 maximum hold | 0.11% | −0.04% | −$346 | −$489 | −$143 | same entry and exit dates |
| 2022-10-07 | 2022-11-03 maximum hold | 2022-11-03 09:31 maximum hold | −0.49% | −0.64% | −$1,306 | −$1,456 | −$150 | same entry and exit dates |
| 2022-11-04 | 2022-12-16 trailing stop | — | 5.91% | — | $4,640 | — |  | only in A: decision 20.83% vs close 20.70% below the high; M entry_blocked |
| 2022-11-14 | — | 2022-11-29 09:31 maximum hold | — | −1.45% | — | −$1,899 |  | only in M: decision 13.33% vs close 13.33% below the high; A  |
| 2022-12-19 | 2023-01-03 maximum hold | 2023-01-03 09:31 maximum hold | 0.31% | 0.16% | −$143 | −$293 | −$151 | same entry and exit dates |
| 2023-01-04 | 2023-08-09 trailing stop | 2023-08-09 11:00 trailing stop | 34.55% | 34.15% | $28,006 | $27,611 | −$395 | same entry and exit dates |
| 2023-09-21 | 2023-10-06 maximum hold | 2023-10-06 09:31 maximum hold | −0.05% | −0.12% | −$503 | −$568 | −$65 | same entry and exit dates |
| 2023-10-20 | 2024-04-18 trailing stop | 2024-04-18 09:38 trailing stop | 20.65% | 20.40% | $15,193 | $14,942 | −$250 | same entry and exit dates |
| 2024-04-19 | 2024-07-24 trailing stop | 2024-07-24 15:29 trailing stop | 16.94% | 16.74% | $14,049 | $13,844 | −$205 | same entry and exit dates |
| 2024-08-01 | 2024-09-04 maximum hold | 2024-09-04 09:31 maximum hold | −0.78% | −0.80% | −$1,806 | −$1,823 | −$16 | same entry and exit dates |
| 2025-03-03 | 2025-03-18 maximum hold | 2025-03-18 09:31 maximum hold | −2.57% | −2.78% | −$3,025 | −$3,229 | −$204 | same entry and exit dates |
| 2025-03-28 | 2025-04-14 maximum hold | 2025-04-14 09:31 maximum hold | −1.24% | −1.12% | −$1,753 | −$1,633 | +$120 | same entry and exit dates |
| 2025-04-16 | open open | open  open | 49.12% | 48.73% | $43,699 | $43,306 | −$394 | same entry and exit dates |

**All minute trades:**

| Entry (ET) | Decision price | Entry fill | Session close | Exit (ET) | Reason | Exit price source | Stop | Exit price | M2 exit price | Hold (calendar days) | Profit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018-03-28 15:59 | 167.69 | 167.56 | 167.42 | 2018-10-10 15:19 | trailing stop | stop level | 188.08 | 188.08 | 188.07 | 196 | $6,342 |
| 2018-10-11 15:59 | 183.95 | 183.95 | 183.60 | 2018-10-26 09:31 | maximum hold | first trade after decision | 177.50 | 181.57 | 181.57 | 15 | −$1,746 |
| 2018-11-12 15:59 | 180.28 | 180.34 | 180.44 | 2018-11-27 09:31 | maximum hold | first trade after decision | 168.99 | 174.72 | 174.72 | 15 | −$3,568 |
| 2018-12-17 15:59 | 168.74 | 168.75 | 168.86 | 2019-01-02 09:31 | maximum hold | first trade after decision | 159.16 | 163.86 | 163.86 | 16 | −$3,380 |
| 2019-01-03 15:59 | 158.84 | 158.90 | 158.68 | 2019-05-13 13:00 | trailing stop | stop level | 198.51 | 198.51 | 198.50 | 130 | $21,009 |
| 2019-06-03 15:59 | 191.19 | 191.13 | 190.92 | 2019-08-05 10:41 | trailing stop | stop level | 205.78 | 205.78 | 205.79 | 63 | $5,764 |
| 2020-02-25 15:59 | 245.88 | 245.94 | 245.78 | 2020-03-11 09:31 | maximum hold | first trade after decision | 231.74 | 223.78 | 223.78 | 15 | −$9,463 |
| 2020-03-12 15:59 | 198.90 | 198.89 | 197.84 | 2020-03-16 09:30 | trailing stop gap | opening trade | 202.30 | 193.27 | 193.27 | 4 | −$2,946 |
| 2020-03-23 15:59 | 187.13 | 187.12 | 185.49 | 2020-04-01 15:08 | trailing stop | stop level | 201.71 | 201.71 | 201.80 | 9 | $7,523 |
| 2020-04-02 15:59 | 205.90 | 205.74 | 205.83 | 2020-09-04 09:47 | trailing stop | stop level | 313.48 | 313.48 | 313.48 | 155 | $47,696 |
| 2020-09-08 15:59 | 299.93 | 299.92 | 299.64 | 2020-09-24 09:31 | maximum hold | first trade after decision | 289.05 | 294.29 | 294.29 | 16 | −$2,360 |
| 2020-10-28 15:59 | 300.62 | 300.50 | 300.62 | 2021-02-23 09:46 | trailing stop | stop level | 352.11 | 352.11 | 351.39 | 118 | $13,619 |
| 2021-03-04 15:59 | 342.62 | 342.87 | 342.85 | 2021-05-11 09:30 | trailing stop gap | opening trade | 357.63 | 355.50 | 355.50 | 68 | $1,636 |
| 2022-01-19 15:59 | 416.59 | 416.52 | 416.52 | 2022-02-04 09:31 | maximum hold | first trade after decision | 392.98 | 412.01 | 412.01 | 16 | −$1,565 |
| 2022-02-18 15:59 | 398.12 | 398.10 | 398.09 | 2022-03-07 09:31 | maximum hold | first trade after decision | 374.96 | 391.71 | 391.71 | 17 | −$2,117 |
| 2022-03-08 15:59 | 373.76 | 373.79 | 373.68 | 2022-04-11 09:30 | trailing stop gap | opening trade | 395.20 | 392.48 | 392.48 | 34 | $3,975 |
| 2022-04-12 15:59 | 387.36 | 387.32 | 387.17 | 2022-04-27 09:31 | maximum hold | first trade after decision | 366.64 | 369.43 | 369.43 | 15 | −$5,070 |
| 2022-05-09 15:59 | 347.25 | 347.25 | 347.13 | 2022-05-24 09:31 | maximum hold | first trade after decision | 328.53 | 340.63 | 340.63 | 15 | −$2,358 |
| 2022-06-13 15:59 | 321.29 | 321.22 | 321.47 | 2022-08-29 09:30 | trailing stop gap | opening trade | 360.27 | 357.21 | 357.21 | 77 | $8,884 |
| 2022-08-30 15:59 | 352.63 | 352.62 | 352.72 | 2022-09-14 09:31 | maximum hold | first trade after decision | 331.51 | 342.65 | 342.65 | 15 | −$3,279 |
| 2022-09-21 15:59 | 328.80 | 328.80 | 328.23 | 2022-10-06 09:31 | maximum hold | first trade after decision | 304.52 | 328.68 | 328.68 | 15 | −$489 |
| 2022-10-07 15:59 | 312.93 | 312.88 | 312.76 | 2022-11-03 09:31 | maximum hold | first trade after decision | 308.34 | 310.87 | 310.87 | 27 | −$1,456 |
| 2022-11-14 15:59 | 339.39 | 339.37 | 339.40 | 2022-11-29 09:31 | maximum hold | first trade after decision | 320.84 | 334.46 | 334.46 | 15 | −$1,899 |
| 2022-12-19 15:59 | 321.57 | 321.63 | 321.37 | 2023-01-03 09:31 | maximum hold | first trade after decision | 302.44 | 322.14 | 322.14 | 15 | −$293 |
| 2023-01-04 15:59 | 317.44 | 317.46 | 317.72 | 2023-08-09 11:00 | trailing stop | minute open through stop | 425.93 | 425.88 | 425.88 | 217 | $27,611 |
| 2023-09-21 15:59 | 414.32 | 414.18 | 414.04 | 2023-10-06 09:31 | maximum hold | first trade after decision | 386.75 | 413.70 | 413.70 | 15 | −$568 |
| 2023-10-20 15:59 | 410.10 | 410.06 | 409.88 | 2024-04-18 09:38 | trailing stop | stop level | 493.70 | 493.70 | 492.91 | 181 | $14,942 |
| 2024-04-19 15:59 | 480.00 | 480.07 | 479.90 | 2024-07-24 15:29 | trailing stop | stop level | 560.42 | 560.42 | 560.60 | 96 | $13,844 |
| 2024-08-01 15:59 | 547.79 | 547.63 | 547.48 | 2024-09-04 09:31 | maximum hold | first trade after decision | 539.28 | 543.26 | 543.26 | 34 | −$1,823 |
| 2025-03-03 15:59 | 578.15 | 578.05 | 578.36 | 2025-03-18 09:31 | maximum hold | first trade after decision | 541.57 | 562.00 | 562.00 | 15 | −$3,229 |
| 2025-03-28 15:59 | 543.24 | 543.23 | 543.24 | 2025-04-14 09:31 | maximum hold | first trade after decision | 511.73 | 537.14 | 537.14 | 17 | −$1,633 |
| 2025-04-16 15:59 | 508.05 | 507.96 | 507.75 | open, marked 2025-10-13 | open | last close |  | 755.49 |  | 180 | $43,306 |

### The major corrections and recoveries

The minute file covers all of them. Profit is by exit year, with the open position in 2025:

| Year | A | B | M | M − B | M − A |
|---|---|---|---|---|---|
| 2018 | $7,570 | $6,379 | $1,028 | −$5,351 | −$6,542 |
| 2019 | $13,753 | $13,101 | $23,393 | +$10,292 | +$9,640 |
| 2020 | $41,599 | $40,640 | $40,451 | −$189 | −$1,149 |
| 2021 | $15,641 | $15,214 | $15,255 | +$41 | −$386 |
| 2022 | $776 | −$3,601 | −$5,375 | −$1,774 | −$6,151 |
| 2023 | $27,360 | $26,658 | $26,750 | +$91 | −$610 |
| 2024 | $27,435 | $27,074 | $26,963 | −$110 | −$472 |
| 2025 | $38,922 | $38,390 | $38,444 | +$54 | −$478 |

- **2018** (February correction; Q4 sell-off): M misses the February trade (#1, −$5,388), and A's
  dividend adjustment moves its spring entry to 04-02. The three Q4 15-day losses (10-11, 11-12, 12-17)
  reproduce on the same dates. The 9:31 fills differ by −$37 to +$251.
- **2019** (recovery): divergence #2 gives M the 2019-01-03 → 05-13 trade (+24.9%, $21,009) in place
  of the original's 2019-01-22 → 05-13 trade (+14.5% in A, $11,183).
- **2020** (COVID):
  - the same 02-25 15-day loss (M −$9,463 vs. A −$8,847: the 9:31 fill on 03-11 was lower);
  - the same 03-12 entry and 03-16 gap exit (M's fill was 53 bps above the close);
  - entry #3 shifts by one session;
  - the 04-02 → 09-04 recovery trade reproduces (+52.4% vs. +52.7%).
- **2022** (bear market): the run of 15-day losses reproduces on the same dates (seven exits in 2022 in
  A, eight in M; M's extra one is the 2022-11-14 trade from #5). In B, divergence #4 cuts the June trade
  short; in A and M it rides the summer rally to the 08-29 gap exit. #5 replaces November's profitable
  trade (+$4,641) with a loss (−$1,899).
- **2023** (recovery): the 2023-01-04 → 08-09 trade reproduces (+34.15% vs. +34.55% in A). The
  2023-09-21 loss exit reproduces.
- **2025** (tariff sell-off and recovery):
  - the 03-03 and 03-28 15-day losses and the 04-16 lower-price re-entry reproduce;
  - the open position is marked at +48.7% vs. +49.1%;
  - the drawdown trough is 2025-04-08 (daily) or 9:42 a.m. on 2025-04-07 (minute).

## 9. Validation (`scripts/validate.ts`, `results/validation-*.json`)

**12,067 checks, 0 failures** on the common-period run, and the same for M2 (13,054 for the full-file
run). The checks fall into three groups.

1. **Synthetic exit paths** through `evaluateSessionExit` and `firstTradeFrom`:
   - a gap through an active stop;
   - a gap with the 15-day exit also due;
   - the 15-day exit at the next minute, at the closing print, or with no later trade;
   - fewer than 15 days, or a profitable open (no exit);
   - an intraday trigger at the stop level, and at the next open in `next-open` mode;
   - a minute opening through the stop;
   - an inactive stop reached by the low;
   - an entry falling back to the closing print, or finding no trade.
2. **An independent re-simulation from the raw CSV.** It has its own line parser, DST from the US rule
   (second Sunday of March to first Sunday of November, not `Intl`), its own session grouping and its
   own strategy loop. It reproduces every trade exactly:
   - entry and exit dates, timestamps and prices, reasons, interest and profit;
   - the restriction events;
   - every daily mark;
   - both drawdowns and the net profit.

   It also agrees with `groupMarketSessions` on every session's date, close time (DST and early closes),
   bar count and close.
3. **Chronological assertions on the output, against the raw bars:**
   - **Entries:**
     - every decision is at close − 60 s and uses only completed minutes;
     - the decision price equals that minute's close;
     - every fill is at or after the decision and before the close (all 32 at 15:59 ET);
     - the 90-session window has 90 sessions (or all prior sessions in the run);
     - the signal holds;
     - no entry falls on an exit session.
   - **Stops:**
     - every stop level equals 92% of the post-entry high through the previous session, counting only
       post-fill prices on the entry session;
     - every stop was active before its session;
     - every stop exit is in the first minute that reached it.
   - **15-day exits:** ≥ 15 days, a loss at the opening trade, and a fill after the opening minute.
   - **Accounting and state:**
     - interest is 11% × calendar days / 365;
     - material-loss classification matches the −0.5% rule;
     - every recovery reset is on a close at or above its level;
     - the open position is marked at the last close, with its accrued interest.

A negative control confirms the validator can fail: checking the `next-open` run as if it used stop-level
fills gives 1,795 failures.

The data audit (§2) covers session boundaries, DST, early closes and missing minutes. `npm run app`'s
`eslint && tsc --noEmit` passes for the whole repository.

## 10. Answers

1. **Does it reproduce most of the original entries?**
   - Yes. 28 of the original's 33 positions have the same entry *and* exit dates, and so does the open
     position.
   - Against the original logic on the same raw prices (B), 29 of 34 share the entry date and 28 the
     exit date too.
2. **How close are entry prices to the closing prices?**
   - Mean absolute 9.8 bps, median 4.4 bps, mean signed +6.9 bps (fills above the close 21 times out
     of 32).
   - The largest gaps were 88 bps and 53 bps, both in March 2020.
3. **How much does total profitability change?**
   - **−$6,146 (−3.6%)** against the original as it stood: $173,055 → $166,909.
   - Of that, −$9,200 is the data source (raw prices without dividends) and **+$3,054** is execution
     (B → M).
   - Realized profit is −$5,753, unrealized −$393, and interest is $1,476 lower (one fewer closed trade).
4. **How much does maximum drawdown change?**
   - Daily: +$202 (+0.7%), $28,687 → $28,889, over the same 2024-07-10 → 2025-04-08 window.
   - Minute-sampled: $32,632, which the daily figure couldn't show.
5. **What is attributable to entry timing?**
   - **−$2,651** in total.
   - Direct: −$1,264 in fill prices.
   - Through the sequence: the 2018-02-08 missed entry (−$5,388), the 2020-03 one-session shift (+$105),
     and the 2022-06-13 entry price that kept the 15-day exit from firing (+$3,896).
6. **What is attributable to exit timing?**
   - **+$5,704** in total.
   - Direct: +$2,098 from the 15-day exits' 9:31 fills and −$18 from stops.
   - Through the re-entry restriction: the 2019-01-02 fill's higher lower level enabled the 2019-01-03
     entry (+$10,164), and the 2022-11-03 fill crossed the material-loss threshold (−$6,540).
7. **What is attributable to the changed trade sequence?**
   - Five chains (§8), worth +$26,633 of trades only in M and −$33,342 of trades only in B, plus the
     moved exit (+$8,946). That nets **+$2,237**, against +$816 of direct price effects.
   - The gross amounts are about ten times the net: the outcome is path-dependent at the cent level.
8. **Are all entry decisions based only on information available before the modeled execution?**
   - Yes. Each decision uses the previous 90 sessions' aggregates, restriction state from earlier
     sessions, and minutes completed by close − 1 minute. The provisional episode low is never stored.
     The fill is the first trade at or after the decision time.
   - The validator checks this for every entry, and the independent re-simulation, which only ever reads
     earlier bars, reproduces it.
   - The residual caveat is timing, not information: the first trade after 15:59:00 may come before a
     real order could arrive (§6).
9. **Are all exit decisions causally defensible from the minute data?**
   - Yes:
     - stop levels and activation use only previous sessions and interest through the known date;
     - gaps fill at the opening trade that triggers them;
     - intraday triggers are found in the first minute that reaches the stop;
     - the 15-day exit is decided on the opening trade and fills on a later one.
   - The one non-observed price is the stop level on 8 intraday triggers. It is an assumption with a
     bounded effect (−$355 to −$806), not look-ahead.
10. **What execution uncertainties remain?**
    - the exact stop-market fill inside the triggering minute (bounded above);
    - order latency against the first trade of the 15:59 and 9:31 minutes;
    - the bid-ask spread and impact (not modeled);
    - uncredited dividends;
    - the 5 sessions without a closing print and 2019-08-12's missing half hour (no trade affected);
    - the hard-coded early-close calendar beyond 2025;
    - the strategy's sensitivity to cent-level differences at its discrete thresholds.

## Files

- `src/app/allIn.ts`: the minute implementation. `src/lib/csv.ts`: `loadCsvMinuteBacktestData`.
  `src/lib/session.ts`: sessions, New York time and the early-close calendar.
  `src/types/session.ts`: `MarketSession`.
- `original/allIn.daily.ts`: the frozen original.
- `run.sh`: reproduces everything.
- `scripts/`: `audit-data.ts`, `aggregate-sessions.ts`, `validate.ts`, `compare.ts`.
- `results/`:
  - `comparison.md`: all generated tables;
  - `data-audit.json`, `validation-*.json`;
  - per-run directories with `trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`, `summary.json`,
    and the console output as `<run>.txt`;
  - `VGT-sessions-from-minute.csv`, derived from the minute file for run B.
