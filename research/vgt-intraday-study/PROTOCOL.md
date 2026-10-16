# VGT intraday-entry, trailing-stop and correction-size study — frozen protocol

Status: **FROZEN** before any study code, golden-master output or comparative result existed. Frozen at
2026-10-15 (UTC; the exact time and SHA-256 of this file are in `PROTOCOL.sha256`). Any later change is an
amendment, appended at the end with a timestamp and a statement of whether comparative results had been seen.

This is an experimental-design and backtesting study. **No parameter is optimized and no production setting
is selected.** The finite policy catalogue below is a set of hypothesis tests fixed in advance.

## 1. Sources (read-only)

| Item | Path | SHA-256 at start |
|---|---|---|
| Incumbent strategy (authoritative, working tree) | `src/app/allIn.ts` | `71c5c327e8ef018066ad598ccc8532f68d28fa387b16577815f6782cf9ba70de` |
| Historical daily strategy (not used for signals) | `src/app/allin-original.ts` | `38bd247be9ef6472eac30b866e88662783907c7fa63a5821a91e172f32fc7538` (uncommitted working-tree edit, pre-existing) |
| Minute data | `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f` |
| Loader / session grouping | `src/lib/csv.ts` (`loadCsvMinuteBacktestData`), `src/lib/session.ts` (`groupMarketSessions`) | see `provenance/protected-hashes-start.txt` |

Every strategy run in this study loads the data once through `loadCsvMinuteBacktestData` +
`groupMarketSessions` (the incumbent's own loader) and never mutates the resulting sessions.

## 2. Incumbent rules, as read from the code (the source wins over any comment or brief)

Constants (verified in `runAllIn`): `targetPercentChange = 0.025`, `trailingStopPercentage = 0.021`,
`maximumHoldDays = 8` (calendar days), `tickWindowSize = 78` (trading sessions), `materialLossThreshold =
0.022`, `lowerPriceReentry = 0.04`, `retraceFraction = 0.367`, `investmentAmount = 100000` (fixed),
`marginInterestRate = 0.11` (simple, 365-day year, calendar days from the entry session's date; no
entry-day interest). These values are **fixed in every experiment**.

Source facts that contradict comments: the file header (10% dip, 8% stop, 90 sessions, 15-day hold, 1% /
2% / 38%) and `strategyName = 'material1-lower2-retrace38'` are stale; the constants above govern.

Incumbent execution semantics (reproduced exactly by the study engine in its control configuration):

1. `recentHigh` of session *i* = max session high (regular minutes + closing print) of the previous 78
   sessions **in the run's session array**; index 0 is skipped entirely.
2. Entry decision at `closeTime − 60 s` on the close of the last minute bar with `start + 60 ≤ decision`
   (`decisionPrice`). Signal: `1 − decisionPrice / recentHigh ≥ 0.025`, and no position open at the
   **start** of the session.
3. Restriction gate (when restricted): with `episodeLow' = min(episodeLow, decisionPrice)` (not stored), the
   entry is blocked if `decisionPrice ≥ episodeLow' + 0.367 × (frozenRefHigh − episodeLow')` (reset
   priority) or `decisionPrice > lossExitPrice × 0.96`.
4. Fill: first observed trade at or after the decision (open of the first bar with `start ≥ decision`, else
   the closing print, else no entry). Shares = 100,000 / fill. `entryTimestamp` = the session's date.
5. Entry-session post-entry high = max(fill, session close, highs of the fill's bar onwards); stop for the
   next session = high × 0.979. After every later held session without exit: high = max(high, session high),
   stop = max(stop, high × 0.979).
6. Each held session (never the entry session): interest accrued through the session date; stop active iff
   `shares × stop − 100,000 − interest > 0`; max hold due iff `(sessionDate − entryDate) ≥ 8 days` and
   `shares × open − 100,000 − interest < 0`. Order: (a) active stop and open ≤ stop → sell at the opening
   trade; (b) max hold due → sell at the first trade at/after `firstBar.start + 60` (none → hold);
   (c) active stop → first bar with `open ≤ stop` (fill at that open) or `low ≤ stop` (fill at stop price
   [`stop`] or next observed trade after the bar, else the bar's close [`next-open`]). The closing print is
   never a stop trigger.
7. Material loss: `exit / entry − 1 ≤ −0.022` (price only) freezes `lossExitPrice` (actual fill),
   `referenceHigh` (= the losing entry's `recentHigh`), lower level `lossExitPrice × 0.96`, `episodeLow =
   exit session close`. At each session end while restricted: `episodeLow = min(episodeLow, close)`; an entry
   in that session clears it (lower-price re-entry); else if flat and `close ≥ reset level` it clears
   (recovery reset).
8. Marks: daily = realized + open position at the official close net of interest through that date; minute
   = each regular bar's close and the official close, the position counted from its fill's bar index to its
   exit's bar index (exclusive), realized switching at the exit's bar index.

## 3. History policies and windows

* **Legacy start (LS)** — the session array is filtered to `[start, end]` exactly as `allIn.ts` does with a
  start date, so the 78-session window is truncated and the first session is skipped. Used **only** for the
  golden master.
* **Warm start (WS, the research history policy for every comparison)** — all sessions from 2016-01-04 are
  loaded; sessions before the window start are reference-high history only (no entries, no accounting); the
  strategy is flat and unrestricted at the window's first session, which **is** tradable.

Windows (all WS):

| ID | Trading window | Use |
|---|---|---|
| `continuous` | 2016-10-07 → 2025-10-13 | primary; year-end marked-equity changes; development-window and forward-segment slices |
| `dev` (slice) | 2016-10-07 → 2023-12-29 | slice of `continuous` (identical to a run ending 2023-12-29 because the engine is causal and marks the open position at that close); diagnostic only |
| `forward_flat` | 2024-01-02 → 2025-10-13 | separate flat-start run; previously inspected, **not** out-of-sample |
| `forward_cont` (slice) | 2024-01-02 → 2025-10-13 | the same period's change on the continuous run |
| ensemble | quarterly flat starts (first session of each quarter, 2016-Q4 [= 2016-10-07] … 2023-Q4), each to 2025-10-13 | descriptive path-dependence check (§9) |

Difficult regimes (declared now; analysis labels only, never signals): `Q4_2018` 2018-10-01…2018-12-31;
`COVID_2020` 2020-02-01…2020-04-30; `Y2022` 2022-01-01…2022-12-31; `SPRING_2025` 2025-02-01…2025-04-30. Two
objective session labels computed from information through the previous close: `DD15` (previous close ≥ 15%
below the max close of the previous 252 sessions) and `HIVOL` (annualized stdev of the previous 20
close-to-close log returns ≥ 30%). Regime P&L = sum of daily marked-equity changes on the labelled sessions.

## 4. Clock, decision and fill conventions (all policies)

* A bar with start `s` covers `[s, s+60)` and is **completed at** `c = s + 60`. All times are America/New_York
  via the repository's session grouping (DST, early closes and the closing print as in `src/lib/session.ts`).
* An **intraday decision event** occurs at the completion of an observed bar, using only bars completed by
  then. The order is a marketable buy filled by the incumbent's `firstTradeFrom(session, c)`: the open of the
  first bar with `start ≥ c`, else the closing print, else no entry. A decision never fills inside the bar
  that produced it.
* **Eligible bars** for an intraday policy with earliest time `E`: observed bars with `E ≤ c ≤ closeTime − 60`.
  The last eligible completion equals the incumbent's decision time, so no intraday fill is later than the
  incumbent's (the 15:59 / 12:59 bar's open or the closing print). On early-close days `E` is never moved; if
  no bar qualifies, the policy has no eligible window that session (counted).
* `dip(bar)`: `bar.close ≤ 0.975 × recentHigh` — algebraically the incumbent's `1 − close/recentHigh ≥ 0.025`;
  the code evaluates the incumbent's exact expression. `recentHigh` is fixed for the session (prior 78
  completed sessions); the current session's own high/low/close are never used for a decision.
* **One entry per session.** An entry is possible only in a session that starts flat, at most once, and
  never after an exit in the same session.
* **Restriction gate** (item 3 of §2) is evaluated at each candidate decision with that decision's
  completed-minute close as `decisionPrice`. A blocked candidate does not reset the policy's setup; the policy
  keeps evaluating later eligible bars. The episode low itself only ever takes session closes; the recovery
  reset is only evaluated at session closes and can never authorize an earlier buy.
* Unfilled decisions (no later trade) end the session's entry attempts; nothing carries to the next session.
  All setup state is reset at every session start.

## 5. Entry policies (Phase 1; 11 fixed)

Setup state is per session. "Gap" = the current eligible bar's start ≠ previous eligible bar's start + 60.

| ID | Rule (fires at the first eligible bar where the condition holds and the gate passes) |
|---|---|
| `CLOSE_1M` | Incumbent: single decision at `closeTime − 60` on the last completed bar (which may complete before 10:00 or be stale); no other events. |
| `FIRST_0935` / `FIRST_1000` / `FIRST_1200` / `FIRST_1400` | `E` = 09:35 / 10:00 / 12:00 / 14:00. Fire on any eligible bar with `dip`. |
| `PERSIST_15` / `PERSIST_30` | `E` = 10:00. Counter of consecutive eligible bars with `dip`; reset to 0 by a non-dip bar; on a gap the counter restarts at the current bar (1 if it dips). Fire when counter ≥ N. |
| `STABLE_15` / `STABLE_30` | `E` = 10:00. The episode starts at the first eligible `dip` bar: trough = its low, timer = 0. Each later eligible bar: gap → timer = 0, then if `low < trough` → trough = low, timer = 0, else timer += 1. Fire when timer ≥ N and the current bar `dip`s. The episode lasts until the session ends (losing the dip does not end it). |
| `REBOUND_03` / `REBOUND_05` | `E` = 10:00. The episode starts at the first eligible `dip` bar: trough = its low. Each later eligible bar: trough = min(trough, low) (this bar's low included; its close follows its low by construction); fire when `close ≥ trough × (1 + x)` and `dip`. Never on the episode's first bar. Gaps do not reset (no timer). x = 0.003 / 0.005. |

## 6. Stop models (Phase 2)

* `STOP_DAILY` — exactly §2 items 5–6 for every entry policy. An intraday entry's entry-session high uses only
  the fill and later prices (max of fill, session close, highs of the fill's bar onwards). No exit on the
  entry session.
* `STOP_MINUTE_CAUSAL` (experimental exit rule, a different strategy) — `H` = highest price observed since
  the fill: initialised to the fill; after each **completed** bar from the fill's bar onwards `H = max(H,
  bar.high)`; after each session `H = max(H, session close)`. Stop for the **next** bar = max(previous stop,
  `H × 0.979`); a bar's own high never moves its own stop. Activation is re-evaluated **at every minute
  boundary** with the then-current stop and the interest accrued through the session date (0 on the entry
  session): active iff `shares × stop − 100,000 − interest > 0`. Within a held session the order of §2.6 is
  kept: (a) gap at the open through an active stop → opening trade; (b) due max hold → next observed trade
  (takes precedence over any minute trigger, as in the incumbent); (c) then bar by bar: active and `open ≤
  stop` → that open; active and `low ≤ stop` → stop price (`stop`) or next observed trade after the bar,
  else the bar's close (`next-open`). On the entry session, minute triggers are checked from the first bar
  **after** the fill's bar (the fill's bar can only raise `H`). The closing print never triggers. At session
  starts the stop equals the `STOP_DAILY` level for the same position and price history. Same-session exits
  are allowed; re-entry in that session is not.
* Fees never enter activation or max-hold tests in the primary experiment (interest-only, as the incumbent).
  A cost-adjusted activation sensitivity is **not** implemented.

## 7. Correction-depth bands and conditional policies (Phase 3)

Band of a decision = depth `d = 1 − completedMinuteClose / recentHigh` at the decision instant:
`SHALLOW` 2.5% ≤ d < 5%; `MODERATE` 5% ≤ d < 10%; `DEEP` 10% ≤ d < 15%; `EXTREME` d ≥ 15%. (For `CLOSE_1M`
the band of the final decision price.) These are descriptive hypothesis boundaries, not tuned values.

Conditional policies (exactly three):

| Policy | SHALLOW | MODERATE | DEEP | EXTREME |
|---|---|---|---|---|
| `BAND_STABILIZE` | `CLOSE_1M` | `STABLE_15` | `STABLE_30` | `STABLE_30` ∧ `REBOUND_05` |
| `BAND_PERSIST` | `CLOSE_1M` | `PERSIST_15` | `PERSIST_30` | `STABLE_30` |
| `BAND_LATE_DEEP` | `CLOSE_1M` | `STABLE_15` | `CLOSE_1M` | `CLOSE_1M` |

State machine: intraday branches use eligible bars with `E` = 10:00. A **band run** is a sequence of eligible
bars in the same band; it ends when a bar is in a different band or does not `dip`. A new run starts with
fresh state from its first bar (trough = its low, timers = 0, persistence counter = 1); nothing from an
earlier run or band is credited. Within a run, a gap resets timers/counters (stable timer = 0 then the bar is
processed; persistence counter restarts at 1) but keeps the run's trough. The run's mechanism is evaluated on
each of its bars exactly as in §5 (`STABLE` timer from the run's first bar; `PERSIST` counter = consecutive
observed bars of the run; `REBOUND_05` trough over the run, never on the run's first bar; the EXTREME
`BAND_STABILIZE` branch needs both on the same bar). `CLOSE_1M` branches fire only at the incumbent's final
decision, using the band of that decision's price; intraday bars of a `CLOSE_1M` band never fire. The final
decision event is processed after the bar completing at that instant (same fill either way). Gate,
one-entry-per-session, fill, exits and restriction rules are those of §§4, 6.

## 8. Costs, fills, accounting

* Fees: `bps × 100,000` at entry and `bps × shares × exitPrice` at exit, at 0 / **5 (primary)** / 10 / 20 bp
  per side; same-session round trips pay both; an open position at a window end is marked net of interest
  and an assumed liquidation fee at the mark. Fees are accounting only (never change a signal, so the path
  is identical across cost levels). At 0 bp the `CLOSE_1M` + `STOP_DAILY` run must reproduce `allIn.ts`.
* Stop fills: `stop` (incumbent default, optimistic) and `next-open` (sensitivity) for every run.
* Metrics per run and cost level: net P&L (realized + open mark, after interest and fees), gross price P&L,
  interest, fees, turnover (entry notional + exit proceeds), trades, win rate, mean/median/quantiles and
  max loss of trade net P&L, hold lengths, exposure (sessions with a position; minutes held), minute-sampled
  max DD (primary risk) and daily max DD, year-end equity changes, regime P&L, no-fill counts.
* Risk gate: $30,000 minute DD per $100,000 borrowed allocation — an evaluation criterion only.

## 9. Diagnostics

* **Divergence decomposition** vs a reference run (same window, fill, cost): a session is divergent if its
  end-of-session state signature (position entry date/price/shares/stop, restriction fields) differs or its
  marked-equity change differs; episodes are maximal runs of divergent sessions; the sum of episode
  differences equals the total difference exactly. Report the first divergence and the largest positive and
  negative episodes with paired timelines.
* Trade classes vs `CLOSE_1M` (same stop mode): **reversal capture** = entry on a session whose final decision
  price did not `dip`; **same-opportunity entry** = the final decision price also `dip`s, with price
  improvement = (benchmark − entry) / benchmark where benchmark = the incumbent-style fill of that session
  (first trade at/after `closeTime − 60`); **premature entry followed by continued selling** = same-opportunity
  entry with benchmark < entry and a losing trade; **avoided exposure** = `CLOSE_1M` trades on entry dates the
  variant does not trade. Rising/falling path: session close above/below the fill.
* Missed opportunities: sessions flat at the start in the `CLOSE_1M` run where some bar completed in
  [09:35, close − 60] `dip`s but the final decision price does not (with and without the restriction gate).
* Band diagnostics (Phase 3A): per policy × stop mode × band — setups (sessions whose first `dip` eligible bar
  is in the band), entries, fills missing, blocked candidates, win/loss, P&L, holds, price improvement vs the
  benchmark, worst intra-trade minute mark (MAE), contribution to the max minute DD window, follow-on
  restrictions and their resolutions; year × band and regime × band counts. Bands with < 10 entries are
  flagged "insufficient sample"; 0 entries are "no sample".
* Leave-outs (descriptive only, not new simulations): net minus the best single trade; Δ minus the largest
  positive divergence episode; Δ minus the best calendar-year difference.
* Ensemble: 29 quarterly flat starts (§3), Δnet at 5 bp vs `CLOSE_1M` with the same stop mode and fill.

## 10. Predeclared interpretation (reporting categories, not selection)

For each policy P vs reference R (`CLOSE_1M` with the same stop mode for entries; the same entry policy with
`STOP_DAILY` for the stop-mode effect), on `continuous`, 5 bp:

* **O (opportunity)** — entries only: ≥ 10 reversal-capture trades with positive aggregate net P&L.
  Stop effect: ≥ 10 trades whose exit was triggered by a minute-raised stop level.
* **E (economic)** — Δnet ≥ +$5,000 under both stop fills; Δminute-DD ≤ +$5,000 under both; minute DD <
  $30,000 under both.
* **Rp (repeatability)** — Δ positive in ≥ 6 of the 10 calendar years (2016 and 2025 partial); Δ > 0 after
  removing the largest positive divergence episode; Δ > 0 after removing the best calendar year; ensemble
  median Δ > 0 with ≥ 60% of starts positive (`stop` fill).
* Category: **supports further optimization** if O, E and Rp all hold; **argues against** if Δnet ≤ 0 under
  both fills, or minute DD ≥ $30,000 under either fill, or Δminute-DD > $5,000 under both fills; otherwise
  **inconclusive**. Always disclosed: Δnet < $5,000, ΔDD > $5,000, DD ≥ $30,000.
* Mechanism families (FIRST, PERSIST, STABLE, REBOUND, minute stop, depth-conditional) are shortlisted for a
  future, separate optimization study only if at least one member "supports"; disagreement in sign across
  members or fills is reported as fragility. For the stop mode, "supports" requires ≥ 6 of 11 entry policies
  to support; "argues against" ≥ 6 of 11 to argue against.
* The `forward_flat` segment is reported for every policy but never used to choose or modify anything.
  No result is called optimal, validated or suitable for live trading.

## 11. Run matrix

14 entry policies (11 + 3 conditional) × 2 stop modes × 2 stop fills × {`continuous`, `forward_flat`} (+ the
29-start ensemble for both fills), each run reporting all four cost levels. Golden master: LS runs of
`allIn.ts` and the study engine on 2016-10-07 → 2025-10-13 and on the whole file, both fills, compared on
trades/daily/states/episodes CSVs and summary values; a WS run with the window start at the file's first
session must equal the whole-file `allIn.ts` run.

## Amendments

(none)
