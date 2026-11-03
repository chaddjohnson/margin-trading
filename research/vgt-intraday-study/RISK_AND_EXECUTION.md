# Risk, execution realism and causality safeguards

## 1. Clock, decision and fill conventions (all policies)

All times are America/New_York, through the repository's own session grouping (`src/lib/session.ts`):

- DST is handled per UTC hour.
- The NYSE early closes (13:00) are listed for 2016–2025.
- The closing print is the open of the bar that starts at the scheduled close.
- Extended-hours bars are dropped.

Decision and fill rules:

- **Completion and decision.** A bar that starts at `s` is **completed at `s + 60`**. A decision at time `T` uses only bars completed by `T`.
- **The incumbent's decision** is at `close − 60 s`, on the last completed bar. That is normally the 15:58 bar (12:58 on early closes).
- **Intraday decisions** happen at the completion of an observed bar between the policy's earliest time `E` and `close − 60 s`. So the latest intraday decision is the incumbent's own decision instant.
- **Every fill** is the incumbent's `firstTradeFrom(session, T)`: the open of the first bar starting at or after `T`, else the closing print, else **no entry**.
  - A decision never fills inside the minute that produced it, and never at that minute's close.
  - An intraday fill can never be later than the incumbent's (the 15:59 bar's open or the closing print).
- **Early closes.** `FIRST_1400` has no eligible minute on early-close days. The rule is not moved to another clock time.

Unfilled decisions:

- On the warm continuous run the only unfilled decision is `CLOSE_1M`'s 2019-08-12 signal, for every policy that reaches it.
- No intraday policy ever had an unfilled decision: an intraday decision always has later bars.

## 2. Same-minute causality safeguards

1. **Entry decisions:**
   - The reference high is the prior 78 *completed* sessions, frozen for the whole session.
   - The current session's high, low and close are never used.
   - Setup state (persistence counters, stabilization timers, troughs, band runs) only takes completed bars.
   - A REBOUND trough may include the deciding bar's own low. That low necessarily precedes that bar's close, which is the decision price.
2. **Daily stop after an intraday entry.** The entry session's post-entry high uses only the fill price and bars from the fill's bar onwards, plus the session close. Pre-entry prices never enter the stop. Test: `engine.test.ts`, "sets an intraday entry's daily stop from post-fill prices only".
3. **Minute stop:**
   - A completed bar raises the stop for the **next** bar only.
   - A bar's high never sets a stop that its own low then fills. Test: `exits.test.ts`, "never uses a minute's high to stop that same minute".
   - The fill's bar cannot trigger.
   - Each bar's open is checked before its low.
4. **Recovery reset and episode low.**
   - The recovery reset is evaluated only at session closes, so it can never authorize an earlier buy.
   - The episode low takes session closes only. At a decision, the decision price counts provisionally, as in the incumbent.
5. **Property tests:**
   - Changing every minute after a decision never changes that decision (`policies.test.ts`, "decisions do not depend on any later minute").
   - Every fill is at or after its decision, and in a later bar.
   - There is at most one entry per session, and no re-entry after an exit in the same session (`engine.test.ts`, "obeys the session rules", for all 14 policies × both stop models on a synthetic file).
6. **Independent replay.** A separately written Python replay ([replay/REPLAY_REPORT.md](replay/REPLAY_REPORT.md)) uses the standard library only and reads the raw CSV. It was built from PROTOCOL.md, `allIn.ts` and `session.ts`, without access to the study engine.
   - It reproduces **8 configurations exactly**, with every compared field equal: entries, exits, prices, reasons, profits, decision prices and interest. The configurations cover four entry families, both stop models, and every BAND_STABILIZE branch.
   - Four alternative readings of ambiguous rules each change the trades, so the match is a real test.

**Protocol interpretation disclosed.** The protocol says an entry clears a restriction (§2.7). The incumbent can never produce an entry and a materially losing exit in the same session; the minute stop can. In that case this study clears the old restriction at the entry, and the same-session losing exit creates a new one. The replay followed the same reading independently. It matters for 6 of the 13 same-session round trips the replay saw under the minute stop.

## 3. Stop fills and why `next-open` is still a proxy

Every run is reported under two intraday stop fills:

- **`stop`** (the incumbent's default, primary). When a bar that opened above an active stop trades through it, the fill is the stop price. This is **optimistic**: the bar shows that trading crossed the level, not the price a stop-market order received.
- **`next-open`**. The fill is the next observed trade after the trigger bar, or that bar's close if none follows.

In both models, a bar that *opens* at or below an active stop fills at its open, and a session that opens through an active stop fills at the opening trade. Neither ever fills at the stop.

`next-open` is still only a proxy:

- It is the first *recorded* minute-bar open after the trigger. In a fast market the real queue can be worse.
- At the regular open the first print can differ from a marketable order's fill.
- One-minute OHLCV carries no bid/ask, so the spread is not modeled, and no fill model here uses bid/ask information.

Entry fills are always observed next-trade opens, never the signalling bar's close.

The fill model barely matters here:

- On the main window, the fill choice moves any policy's Δ by less than about $1.3k under the daily stop.
- The minute stop shifts its own Δ by $0.4k–$2.6k against itself under `next-open`. That is the expected direction, because it triggers intraday more often.

## 4. Costs and financing

- **Fees.** 5 bp/side is primary, with 0, 10 and 20 bp as sensitivities. The fee is charged on the $100,000 entry notional and on the exit proceeds (shares × exit price). An open position at a window end is marked net of interest and an assumed liquidation fee at the mark.
  - **Fees never change a signal.** Activation, the maximum hold and the material-loss test use the incumbent's interest-only and price-only tests. Every path is identical across cost levels; this is tested.
  - **At 0 bp** the control reproduces `allIn.ts` exactly.
  - **Cost-adjusted activation** (a stop active only if profitable after fees) was **not implemented**. Mentioning it does not mean it was tested.
- **Interest.** Simple interest at 11%, 365-day year, on calendar days from the entry session's *date*. That is `allIn.ts`'s convention, including **no entry-day interest**.
  - A same-session round trip (minute stop only) therefore pays **zero interest but two fees**: about $100 at 5 bp on $100k, and $400 at 20 bp.
  - Intraday entries pay the same interest as a 15:59 entry made that day, because the convention ignores clock time. This slightly *favours* early entries, which hold the position for more hours without being charged for them.
- **Taxes are excluded.** Frequent trading can change tax outcomes materially (short-term gains, wash sales), and most early-entry rules trade up to 19% more often than the incumbent.
- **Dividends are excluded.** Prices are raw Alpaca prices. VGT's ex-dividend drops appear as price moves, and the cash distributions a holder would have received are **not** credited, for any policy. Policies that hold more sessions are slightly disadvantaged by this. The exposure differences are small (1,390–1,775 held sessions against 1,604 for the incumbent).

## 5. Drawdown and the $30,000 research gate

The primary risk metric is the **minute-sampled** mark-to-market drawdown. It is marked at every regular minute's close and the official close, net of interest, fees and assumed liquidation. Daily-sampled drawdown is secondary.

These figures are per **one $100,000 borrowed allocation**, one position at a time:

- They are **not** a drawdown of the full portfolio.
- They are **not** a margin-call analysis. Equity, maintenance requirements and other holdings are not modeled.

The $30,000 gate is an evaluation criterion only. No stop, sizing or filter was added to enforce it.

<!-- include: tables/risk_gate.md -->
| Policy | Stop | Minute DD 5 bp stop fill | Peak → trough | Daily DD 5 bp | Worst minute DD (scenario) | Scenarios ≥ $30k (of 8) | 2024–25 flat-start minute DD |
|---|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | daily | $25,914 | 2025-01-24 → 2025-04-07 | $21,934 | $27,078 (stop, 20 bp) | 0 | $25,914 |
| `CLOSE_1M` | minute | $27,721 | 2020-02-19 → 2020-03-18 | $24,285 | $28,762 (next-open, 20 bp) | 0 | $25,914 |
| `FIRST_0935` | daily | $34,328 | 2021-12-27 → 2022-10-13 | $31,648 | $47,910 (next-open, 20 bp) | 8 | $25,848 |
| `FIRST_0935` | minute | $30,600 | 2020-02-19 → 2020-03-23 | $27,469 | $39,236 (next-open, 20 bp) | 8 | $26,511 |
| `FIRST_1000` | daily | $35,557 | 2021-02-16 → 2022-10-13 | $33,478 | $48,745 (next-open, 20 bp) | 8 | $25,571 |
| `FIRST_1000` | minute | $28,670 | 2024-12-06 → 2025-04-08 | $26,630 | $46,185 (next-open, 20 bp) | 4 | $28,670 |
| `FIRST_1200` | daily | $30,737 | 2025-01-24 → 2025-04-30 | $28,639 | $32,706 (next-open, 20 bp) | 8 | $30,737 |
| `FIRST_1200` | minute | $30,737 | 2025-01-24 → 2025-04-30 | $28,639 | $33,302 (next-open, 20 bp) | 8 | $30,737 |
| `FIRST_1400` | daily | $30,264 | 2020-02-19 → 2020-03-23 | $27,942 | $32,283 (next-open, 20 bp) | 7 | $30,155 |
| `FIRST_1400` | minute | $23,518 | 2018-08-09 → 2019-01-23 | $22,290 | $35,381 (stop, 20 bp) | 2 | $22,673 |
| `PERSIST_15` | daily | $36,022 | 2025-01-24 → 2025-04-30 | $33,970 | $38,831 (next-open, 20 bp) | 8 | $36,022 |
| `PERSIST_15` | minute | $29,922 | 2025-01-24 → 2025-04-30 | $27,871 | $32,804 (next-open, 20 bp) | 5 | $29,922 |
| `PERSIST_30` | daily | $37,225 | 2020-09-04 → 2023-01-19 | $35,471 | $55,251 (next-open, 20 bp) | 8 | $33,866 |
| `PERSIST_30` | minute | $39,026 | 2021-02-16 → 2023-01-19 | $38,211 | $54,443 (next-open, 20 bp) | 8 | $33,866 |
| `STABLE_15` | daily | $31,272 | 2025-01-24 → 2025-04-30 | $29,200 | $33,476 (next-open, 20 bp) | 8 | $31,272 |
| `STABLE_15` | minute | $31,272 | 2025-01-24 → 2025-04-30 | $29,200 | $37,037 (stop, 20 bp) | 8 | $31,272 |
| `STABLE_30` | daily | $27,646 | 2025-01-24 → 2025-04-07 | $24,966 | $37,268 (stop, 20 bp) | 2 | $27,646 |
| `STABLE_30` | minute | $26,727 | 2021-12-27 → 2023-10-26 | $26,592 | $39,609 (stop, 20 bp) | 4 | $26,524 |
| `REBOUND_03` | daily | $30,739 | 2021-02-16 → 2022-10-13 | $28,767 | $44,697 (stop, 20 bp) | 6 | $27,143 |
| `REBOUND_03` | minute | $28,870 | 2025-01-24 → 2025-04-08 | $26,751 | $40,763 (next-open, 20 bp) | 3 | $28,870 |
| `REBOUND_05` | daily | $34,286 | 2025-01-24 → 2025-04-30 | $32,316 | $36,785 (next-open, 20 bp) | 8 | $34,286 |
| `REBOUND_05` | minute | $27,792 | 2025-01-24 → 2025-04-30 | $25,822 | $30,314 (next-open, 20 bp) | 2 | $27,792 |
| `BAND_STABILIZE` | daily | $25,625 | 2025-01-24 → 2025-04-07 | $22,970 | $28,833 (next-open, 20 bp) | 0 | $25,625 |
| `BAND_STABILIZE` | minute | $28,091 | 2021-12-27 → 2022-12-28 | $28,018 | $36,926 (next-open, 20 bp) | 4 | $25,782 |
| `BAND_PERSIST` | daily | $27,906 | 2021-04-15 → 2022-10-13 | $27,113 | $41,363 (next-open, 20 bp) | 4 | $25,221 |
| `BAND_PERSIST` | minute | $25,270 | 2021-04-15 → 2023-01-19 | $24,830 | $40,061 (next-open, 20 bp) | 2 | $24,553 |
| `BAND_LATE_DEEP` | daily | $25,914 | 2025-01-24 → 2025-04-07 | $21,934 | $27,078 (stop, 20 bp) | 0 | $25,914 |
| `BAND_LATE_DEEP` | minute | $27,721 | 2020-02-19 → 2020-03-18 | $24,285 | $28,762 (next-open, 20 bp) | 0 | $25,914 |
<!-- /include -->

**Violations:**

| Group | Gate breaches |
|---|---|
| Incumbent, both stop models | none in any of the 8 cost/fill scenarios (worst $28,762) |
| `BAND_LATE_DEEP` | none |
| `BAND_STABILIZE`, daily stop | none (worst $28,833) |
| Every unconditional early-entry policy | at least one scenario; with the daily stop, most breach in all 8 |
| `BAND_STABILIZE` with the minute stop; `BAND_PERSIST` | at 10–20 bp |

How cost levels change drawdown:

- At higher cost levels, drawdowns lengthen and deepen. Fees accrue through the losing streaks.
- The policies that trade most are hit hardest. For example, `PERSIST_30` with the daily stop reaches $55,251 at 20 bp + `next-open`.
- For several early-entry policies the worst drawdown window is the 2022 bear market (2021 → October 2022 / January 2023). For the incumbent it is January–April 2025.

## 6. Data

The minute file was hashed and loaded through the repository's verified loader. It was not re-downloaded, reformatted or re-audited.

- No material anomaly affecting this study was encountered.
- The 2019-08-12 session without a trade after the decision is a known property of the file, handled as the incumbent handles it.
- Missing minute bars are not filled. They reset the persistence and stabilization timers, as the protocol specifies.
- The data ends on 2025-10-13. No later observations exist in the file, and none were used or invented. **No result in this study is out-of-sample.** The 2024–25 segment was inspected in earlier studies.

## 7. Tests

The study's own suite has 33 tests in `src/intraday-study/tests/`. It covers:

- **Causality and clock:** chronological causality, the decision and fill clock (09:35/10:00/12:00/14:00/15:59), closing-print and no-trade fallbacks, early closes, and missing minutes.
- **Entry mechanisms:** PERSIST/STABLE/REBOUND and the gate.
- **Bands:** band boundaries, band transitions with no credit across bands, and the EXTREME double confirmation.
- **Exits:** minute-stop same-bar causality, the fill bar, activation with interest, opening gaps, maximum-hold precedence, `next-open` fallbacks, and equivalence with the incumbent's evaluator where no intrasession raise occurs.
- **Engine rules:** same-session exits without re-entry, post-fill-only daily stops, the 8-day boundary, the restriction and lower-price re-entry, cost arithmetic, path invariance across costs, and determinism.
- **Equivalence and protection:** byte-identical equivalence with `allIn.ts` on three seeded synthetic files under both fills, the real-data golden master, and protected-file hashes.

Results are recorded in [provenance/test-results.md](provenance/test-results.md), where pre-existing failures are reported separately from this study's.
