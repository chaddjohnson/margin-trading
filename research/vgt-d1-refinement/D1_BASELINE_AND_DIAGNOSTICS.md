# D1 baseline, trade attribution and the exact trailing-stop semantics

Generated inputs: `results/baseline/baseline.md` (+ `.json`) from `npm run d1-refinement -- baseline` and
`results/diagnostics/stop_semantics.md` (+ `d1_stop_trace.json`) from `npm run d1-refinement -- stop-diagnostic`.
Both ran before any sweep of this program.

## 1. Parity with the reported figures (A0)

| Candidate | Parameters | Reported | Engine (this program) | File (`npm run app`) |
|---|---|---:|---:|---:|
| D1 | X 21.6 Y 0.3 stop 7.3 hold 8 L 74 buffer 2.9 + P 9.0 W 60 | $183,044 / $19,331 / 20 entries | $183,044 / $19,331 / 20 | $183,044 / $19,331 / 19 closed + 1 open (rerun 2026-10-22) |
| Set 2 | file 4 as checked in | $150,630 / $21,183 / 14 | $150,630 / $21,183 / 14 | — (reproduced by the previous program) |
| Trades2 | X 20.0 Y 0.5 stop 7.8 hold 11 L 104 buffer 0.2 | $154,213 / $27,408 / 18 | $154,213 / $27,408 / 18 | — |
| D3 | D1 with P 7.0% | $176,943 / $19,705 / 20 | $176,943 / $19,705 / 20 | — |
| `allIn.ts` | checked-in constants | $169,090 / $32,084 | n/a (its own code) | $169,090 / $32,084 / 33 closed + 1 open (rerun 2026-10-22) |

Every figure matches to the dollar. The engine reproduces the shipped D1 file trade for trade (entry minute, fill
price, exit minute, reason, profit, interest), asserted in `src/d1-refinement/tests/equivalence.test.ts` against
the previous program's engine on Set 2, D1, 24 random vectors (both fills, 8/11/14%) and 120 synthetic scenarios, and
by the parity harness against the generated files ([IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md)).

Full metrics on the common run (arming from 2017-06-15; the files arm from session 74 and give the same trades):

| Candidate | Net | Minute DD | Daily DD | Net/DD | Entries | W/L | Worst trade | Worst excursion | Interest | Exposure | Avg hold |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 | $183,044 | $19,331 | $15,611 | 9.47 | 20 (1 open) | 14/5 | −$3,447 | −$11,003 | $33,362 | 36% | 55 d |
| Set 2 | $150,630 | $21,183 | $16,577 | 7.11 | 14 (1 open) | 10/3 | −$3,447 | −$11,003 | $20,855 | 23% | 49 d |
| Trades2 | $154,213 | $27,408 | $23,010 | 5.63 | 18 (1 open) | 9/8 | −$9,460 | −$16,550 | $29,142 | 32% | 54 d |
| D3 | $176,943 | $19,705 | $16,180 | 8.98 | 20 (1 open) | 13/6 | −$3,447 | −$11,003 | $29,082 | 32% | 48 d |

Fill and interest sensitivity (`baseline.md` §6): D1 $183,757 / $18,983 with next-open fills, $192,142 / $19,183 at
8%, $173,945 / $19,479 at 14%; no trade changes at any rate (section 4 below).

## 2. D1 explained and attributed

Mechanism, as the source does it (`runAllIn` of the D1 file): a **profitable** exit sets `continuationActive`, the
post-exit high to the exit price and the window start to the exit session. At each later session end the post-exit
high takes the session's high. While the window is open (sessions `start + 1 .. start + W`) and the strategy is flat
with no setup, a completed minute closing at or below post-exit high × (1 − P) arms a trailing buy of kind
`continuation`; the ordinary Y rebound from the setup's trailing low then buys at the next observed trade. **Any
arming** (deep or continuation) closes the window, and the window expires at the session end of `start + W`. Deep and
continuation setups never coexist: the minute loop tests the deep condition first and arms the first path that holds,
so the deep path has precedence on a shared minute. On D1's run no minute ever satisfied both conditions (14 windows:
6 closed by a continuation arming, 2 expired, 6 closed by a deep arming); the precedence rule was never exercised.

D1 against Set 2: all 14 Set 2 trades preserved unchanged (same entries and exits); 6 continuation trades gained:

| Continuation trade | Armed (depth below the post-exit high) | Net | Episode |
|---|---|---:|---|
| 2019-08-05 15:12 → 2020-02-24 (trailing stop gap) | 2019-08-05, 9.0% below 223.67 (after the 2019-05-13 exit) | +$17,713 | 2018 Q4 → 2019 |
| 2020-02-28 09:32 → 2020-03-06 (trailing stop) | 11.9% below 256.88 (after the February 24 exit) | +$2,398 | 2020 |
| 2020-10-28 10:09 → 2021-02-23 (trailing stop) | 9.1% below 333.46 (after the 2020-09-04 exit) | +$13,147 | 2020 |
| 2021-03-05 11:31 → 2021-05-11 (trailing stop gap) | 9.1% below 369.57 | +$3,419 | other |
| 2022-04-26 15:45 → 2022-05-06 (maximum hold) | 9.0% below 402.25 | −$1,077 | 2022 bear |
| 2022-09-16 10:03 → 2022-09-26 (maximum hold) | 9.1% below 363.01 | −$3,187 | 2022 bear |

The six net +$32,414 = D1 − Set 2. The improvement is concentrated in 2019–2021 re-entries after profitable exits
(+$36,677), 2022 costs −$4,264, 2023 and 2024–2025 are untouched (no window was open: the 2022-12-15 exit's window
expired in March 2023 without a 9% pullback, and the April 2025 exit's window was closed by the April 11 deep arming).
By episode (net of the trades entered in it): 2018 Q4 → 2019 +$38,088 (2 trades), 2020 +$75,883 (5), 2021 +$3,419,
2022 bear +$23,074 (9 trades, 3 losses), 2023 none, 2025 +$45,821 (3, one open). The largest single trade
(2020-04-02 → 2020-09-04, +$51,420) is 28% of the net; without the 2020 episode D1 nets $107,161.

Trade frequency: 20 entries in 8.3 eligible years, 55-day average hold, 36% of sessions invested; 6 of 19 closed
trades were maximum-hold exits with the stop never active, 13 were trailing-stop exits, no buffered-loss exit.

## 3. The trailing stop: exact eligibility, latching and update rules (B0)

From `evaluateSessionExit` / `evaluateBufferedSessionExit` of the D1 file (inherited unchanged from file 4):

```ts
const profitAt = (price: number) => position.shares * price - position.investment - interest;
const isStopActive = profitAt(stopPrice) > 0;
```

with `interest` accrued through the session's date (calendar days since the entry session's date, none on that date)
and `stopPrice` set after the previous session as `postEntryHigh × (1 − trailingStopPercentage)`, never lowered.

1. **Eligibility is the net result of a hypothetical fill at the stop level**, not the current price, not the mark,
   and not a historical state: `shares × stop − investment − interest(date) > 0`. Strict inequality: a stop exactly at
   net breakeven is inactive.
2. **No latch.** The test is re-evaluated before every session. The level only rises and interest only grows, so the
   stop can switch off again only through interest, when the level has not risen for long enough that accrued interest
   exceeds the gross profit at the stop. On D1's 20 trades this happened on **one session** (2021-04-05, trade 8: stop
   340.27, net breakeven 340.32, net at the stop −$14; the next session's new high re-activated it). Making the rule
   irreversible (`netLatched`) changes **none** of D1's trades (`stop_semantics.md` §3).
3. **The trailing high is the highest observed print**: on the entry session `max(fill price, session close, highs of
   the minutes from the fill's minute onwards)`; afterwards each session's high (highest minute high, including the
   closing print). It is updated **once, after each session**, together with the level; a session's own high never
   moves that session's stop.
4. **The level is always maintained; only the check is gated.** The gap check at the open (`session.open <= stop`) and
   the minute walk (`bar.open <= stop`, then `bar.low <= stop`) both run only when `isStopActive`. Activation is a
   pre-open fact of the session (previous level, the date's interest), so activation and a breach cannot occur in the
   same bar; a breach on an inactive session is simply not acted on, and the first active session starts with the gap
   check. There is no intraminute activation.
5. **Interactions.** Interest advances by calendar days at each session date (a weekend adds three days to Monday's
   breakeven). Order within a session: gap through an active stop at the open → pending buffered sale at the open →
   maximum hold (`daysHeld ≥ hold && profitAt(open) < 0`, sold at the next trade) → minute walk for the stop → from the
   hold day, the buffered loss at the first completed minute closing at or below −2.9% of the investment, the stop
   winning if it triggers in that minute or earlier or at the same opening trade. An inactive stop gives no gap
   protection at all: an unprofitable position's only exits are the hold-day rule and the buffer. Fill: the stop level
   when the minute opened above it (idealized), the minute's open when it opened through it.
6. **The 2023 sensitivity reproduced** (`stop_semantics.md` §4): the trough-recovery entry of 2023-01-18 at 340.06
   (B1 of the previous program) replayed under D1's exits. The stop level in the March pullback was 345.04 at every
   rate; net breakeven on 2023-03-13 was 344.08 at 8% (active → stopped at 345.04, +$280), 345.59 at 11% (inactive
   → rode to 2023-08-08, +$20,117) and 347.10 at 14% (inactive; the hold rule sold at the open for −$207). At 11% the
   rule had already switched off on 2023-03-08 after 23 active sessions. Nothing about this is a latch; it is the
   per-session net test. Under every alternative policy (latched net, gross 8%, breakeven, two-stage, always) the same
   fill is stopped on 2023-03-13 at 345.04 for −$164 (§5 of the diagnostic): the 2023 trade of the previous program
   existed only because the rule was *off* that week.

Verdict: intended policy, not a bug; the file's own comment states it. Its risk consequences (no stop while
unprofitable; protection can lapse in a long flat stretch) are what Track B tests.

Boundary and ordering tests (`src/d1-refinement/tests/mechanisms.test.ts`): activation at exactly the breakeven level
(B-B's ≥ at equality), gross threshold not reached vs reached, gap through an active stop at the open, the minute that
opens through the stop vs trades through it (stop-level fill), protective-stop stage vs established stage, net
switch-off vs latch, `replayPosition` = engine exit, the hold exit under every policy; entry-side tests for the
always and swing paths, the C3 arbitration (upgrade to deep on the exact minute) and path causality.
