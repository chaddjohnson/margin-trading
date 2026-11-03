# Replay interpretation notes (written before any comparison with the study engine)

Sources read: `PROTOCOL.md` (frozen), `src/app/allIn.ts`, `src/lib/session.ts`, `src/lib/csv.ts`. Nothing under
`src/intraday-study/` was read. These notes fix how `replay.py` resolves points that PROTOCOL.md leaves
implicit. Each is my reading; none was chosen by looking at the study engine's output.

## Data and sessions
1. Bars are parsed from the raw CSV (quoted ISO UTC start, OHLCV). Times are converted to America/New_York with
   `zoneinfo`; a bar belongs to the NY calendar date of its start. Regular minutes are 09:30 <= minute < close
   (16:00, or 13:00 on the session.ts early-close list); the bar starting exactly at the close is the closing
   print (its open). Bars outside [09:30, close] are dropped. A closing print that would open a new date is
   dropped. Session open = first regular bar's open; high/low = regular bars' extremes, then widened by the
   official close (closing print, else last regular bar's close). `time` = midnight UTC of the NY date;
   `openTime`/`closeTime` = scheduled open/close as UTC epochs.
2. Warm start: all sessions in the file are loaded. `recentHigh(i)` = max high of `sessions[max(0,i-78):i]` in
   the full array. Sessions before 2016-10-07 are history only. The trading window is the closed date range
   2016-10-07..2025-10-13; sessions after it are ignored entirely (the open position is marked at the
   2025-10-13 close, interest through that session date).

## Decisions and fills
3. `dip(price)` is evaluated as the incumbent's expression `1 - price / recentHigh >= 0.025`. Band depth is the
   same `d = 1 - price / recentHigh`, compared as 0.025 <= d < 0.05 SHALLOW, < 0.10 MODERATE, < 0.15 DEEP, else
   EXTREME. Hence a dip bar always has a band.
4. Intraday eligible bars: bars with `E <= start + 60 <= closeTime - 60`, where E = scheduled NY wall time
   (09:35 or 10:00) converted with the session's offset (`openTime + (E - 09:30)`). The decision time is the
   bar's completion `c = start + 60`, decision price its close, fill = `firstTradeFrom(session, c)`.
5. `CLOSE_1M` decision: `decisionTime = closeTime - 60`, decision bar = last bar with `start + 60 <= decisionTime`
   (no E bound; may be stale or before 10:00); fill = `firstTradeFrom(session, decisionTime)`. No bar -> no decision.
6. The mechanism state of a session is independent of the gate (a blocked candidate does not reset it), so a
   session's candidate list is computed first, then the first candidate that passes the gate is filled. If
   that candidate has no later trade the session's attempts end (in practice impossible for a later candidate
   to fill when an earlier one could not).
7. Gaps: "previous eligible bar" = the previous bar in the session's eligible-bar sequence (not the previous
   bar of the run/episode). STABLE: on a gap the timer is set to 0 and then the bar is processed (new low ->
   timer 0; else timer += 1, so a non-new-low gap bar ends with timer = 1). PERSIST: on a gap the counter
   becomes 1 if the bar dips, else 0. The first eligible bar is never a gap.
8. STABLE fires on the episode's first bar only if timer (0) >= N, i.e. never for N >= 15. REBOUND threshold is
   `trough * (1 + x)` with trough = min over the episode's lows including the current bar; never on the
   episode's first bar.
9. BAND_STABILIZE: one band run state (trough, stable timer, bar count) is shared by the STABLE and REBOUND
   mechanisms (both are "trough = run's low"). A bar that does not dip, or whose band differs from the current
   run's band, ends the run; a dipping bar then starts a new run (trough = its low, timer 0) on that same bar.
   A non-dip bar leaves no run. SHALLOW bars never fire intraday. MODERATE: timer >= 15. DEEP: timer >= 30.
   EXTREME: timer >= 30 and (not the run's first bar) and close >= trough * 1.005 on the same bar. The final
   decision (CLOSE_1M branch) is appended after all eligible bars (so after the bar completing at
   closeTime - 60) and fires iff the incumbent's decision price dips and its band is SHALLOW.

## Positions, stops, restriction
10. Interest = `100000 * 0.11 * ((session.time - entry.time) / (365 * 86400))` (same operation order as allIn.ts);
    0 on the entry session. Profit = `shares * price - 100000 - interest`.
11. STOP_DAILY: exactly allIn.ts `evaluateSessionExit` with `stop` fill; entry-session high =
    max(fill, session close, highs of bars[fillIndex:]); stop = high * (1 - 0.021); after a held session
    without exit, high = max(high, session high), stop = max(stop, high * (1 - 0.021)). A max-hold due session
    without a later trade has no exit and no stop checks, and still updates high/stop.
12. STOP_MINUTE_CAUSAL: H = fill price, then after each completed bar from the fill's bar onwards H = max(H, high)
    and stop = max(stop, H * (1 - 0.021)) (the first stop is set after the fill's bar). After each session
    H = max(H, close), stop updated the same way. Held sessions: (a) gap check with the session-start stop and
    the session's interest; (b) due max hold -> firstTradeFrom(bars[0].start + 60) and nothing else that
    session (if none, no exit and no minute checks; H/stop still updated through the session); (c) for each
    bar: active iff shares*stop - 100000 - interest > 0 with the current stop; open <= stop -> exit at open
    ('trailing stop'), else low <= stop -> exit at stop; otherwise update H/stop with the bar. On the entry
    session the same loop starts at the bar after the fill's bar with interest 0. A closing-print fill has
    no intraday checks. Reason labels: the opening-gap exit is 'trailing stop gap', all bar triggers are
    'trailing stop' (including bar 0 if it were reached, which it cannot be with an active stop since (a)
    would have caught it).
13. Restriction: a material loss (`exit/entry - 1 <= -0.022`) creates {lossExit, refHigh = the losing entry's
    recentHigh, lower = lossExit * (1 - 0.04), episodeLow = exit session close}. Gate at each candidate:
    provisional low = min(episodeLow, decisionPrice); blocked if decisionPrice >= low + 0.367 * (refHigh - low)
    or decisionPrice > lower. An entry clears the restriction at the entry (lower-price re-entry). At each
    session end, if a restriction exists: episodeLow = min(episodeLow, close); then if flat at the end and
    close >= reset level it clears (recovery reset). This includes the exit session.
14. Same-session round trip under STOP_MINUTE_CAUSAL while restricted (protocol silent on ordering): the entry
    clears the old restriction at the entry; if the same-session exit is itself a material loss it creates a
    new restriction (episodeLow = that session's close), which is then subject to the end-of-session
    recovery check because the strategy is flat at the end. (allIn.ts cannot produce this case.)
15. The open position at the window end is reported with exit_reason 'open', exit price = last close,
    interest through the last session date.
