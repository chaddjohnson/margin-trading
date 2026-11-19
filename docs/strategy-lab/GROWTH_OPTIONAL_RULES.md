# Growth optional rules: initial risk stop, trend-breakout entry, trend retention (Growth 1.3.0)

Growth 1.3.0 (`rise-from-recent-low-trading@1.3.0`) adds three research options. (Since 2026-11-06 the current version
is 1.4.0, which adds the Drawdown Recovery Gate — [GROWTH_DRAWDOWN_GATE.md](GROWTH_DRAWDOWN_GATE.md); with that gate
OFF it reproduces 1.3.0 exactly, so everything below holds for 1.4.0, and 1.3.0 is now a legacy version.) Each is **OFF by default** (the entry
method defaults to the existing Rise entry), and each can be tested alone or combined with the others. This is an
implementation, **not a claim that any of them improves returns**. The defaults are the brief's starting hypotheses,
not optimised values. Candidate A stays the unchanged research control (§10).

- **Code:** `src/growth-trading/optionalRules.ts` (the rules), `src/growth-trading/riseTrading.ts` (the engine),
  `apps/strategy-lab/shared/strategies.ts` (the parameter schema), `apps/strategy-lab/runner/growth-params.ts` and
  `runner/trading-run.ts` (the runner).
- **Brief:** `brief/2026-11-05-growth-optional-rules-brief.md`.
- **Tests:** §12.

## 1. Versions and compatibility

| | |
| --- | --- |
| **With all three OFF** | The 1.3.0 engine and runner reproduce Growth 1.2.0 exactly: every signal, fill, exit, financing figure, mark, drawdown, decision-log entry and metric. Evidence: `src/growth-trading/tests/offParity-1.2.0.test.ts` (9 real-data cases captured from the unchanged 1.2.0 code at `8d2800e`, Candidate A among them) and `apps/strategy-lab/tests/growth-parity.test.ts` (runner artifacts byte for byte). With an option OFF, none of its code runs: the engine keeps its 1.2.0 code paths. |
| **1.2.0 runs** | Kept exactly as recorded. 1.2.0 is now a legacy version: `launch: phenotype`, so its catalogue phenotypes still rerun as 1.2.0. Its stored parameter schema is byte-identical (sha256 `f43f8510…`; 1.1.0 and 1.0.0 are unchanged too). It replays as 1.3.0 with the three options OFF (`npm --prefix apps/strategy-lab run replay -- R-…`, mode `legacy-1.2.0`). |
| **New Test** | Offers 1.3.0. A clone of a 1.2.0 run starts a 1.3.0 test with the three options OFF. |
| **Interactive Preview** | Runs only the current version. A 1.2.0 run is not previewed directly; its *Preview with Growth 1.3.0* button seeds the same values with the three options OFF and says it is a new execution. The cache identity includes the strategy version, the schema hash and the implementation fingerprint, so no old cached preview is ever reused for 1.3.0. |
| **Migration** | None. The live server needs a restart to offer 1.3.0. Until then it validates requests with its in-memory 1.2.0 registry and runs them through the new runner, which gives identical results (above). |

**Fixed with this version: the "buffer OFF" preview failure.** Interactive Preview sends only the effective
values. With the buffered loss switched OFF (or the maximum hold OFF), 1.2.0 refused such a request ("intradayLossBufferPercent must be in [0, 100)"). Two fixes:

- The runner now maps every request from its effective values (`growth-params.ts paramsOf`).
- The engine validation checks only values that apply (`tradingParamErrors`).

A request with the drafts and the same request without them now execute identically: R-920004 = R-920005 and R-920006
= R-920007, byte for byte, in `growth-parity.test.ts`.

## 2. Parameters (three namespaces)

| Group | Key | Default | Range | Applies when |
| --- | --- | --- | --- | --- |
| Entry | `entryMethod` | `rise_from_recent_low` | `rise_from_recent_low` \| `trend_breakout` | always |
| Entry | `advanceFromRecentLowPercent` (X), `recentLowLookbackBars` (N) | 5, 20 | as before | the Rise entry |
| Entry | `breakoutSmaSessions` (L, intrinsic) | 50 | 2–500 sessions | the breakout |
| Entry | `breakoutSlopeComparisonSessions` (K, intrinsic) | 40 | 1–250 sessions | the breakout |
| Entry | `breakoutPriorHighSessions` (N) | 20 | 1–250 sessions | the breakout |
| Initial risk stop | `initialStopEnabled` | OFF | switch | always |
| Initial risk stop | `initialStopAtrSessions` (L) | 20 | 1–250 sessions | the stop ON |
| Initial risk stop | `initialStopAtrMultiple` (m) | 3 | 0.1–20 × ATR | the stop ON |
| Retain part of profitable trend | `retentionEnabled` | OFF | switch | always |
| Retain part of profitable trend | `retentionSellPercent` (f) | 50 | 1–99 % | retention ON |
| Retain part of profitable trend | `retentionSmaSessions` (L) | 50 | 2–500 sessions | retention ON |
| Retain part of profitable trend | `retentionClosesBelow` (K) | 2 | 1–20 closes | retention ON |
| Persistent entry eligibility | `eligibilityEnabled` (unchanged) | OFF | switch | **the Rise entry only** |

- **Inactive values are drafts.** A value that does not apply (a switch OFF, the other entry method's inputs,
  eligibility under the breakout) is kept with the run, labelled "saved, not applied". It never enters the effective
  configuration, the variation identity or the preview cache key (`tests/optional-rules.test.ts`,
  `tests/preview-identity.test.ts`).
- **The two trend horizons are separate.** The breakout's L and K are **intrinsic**: part of the method, required even
  with the optional *Entry trend filter* OFF. That filter keeps its own inputs and meaning, relabelled "an additional
  gate" for either entry method.
- **Initial stop OFF.** Its inputs are hidden.
- **The breakout selected.**
  - X and N are hidden.
  - The eligibility switch is disabled, with the note *Not applicable with the breakout entry method*.
  - The run records "Persistent entry eligibility: not applicable" in its assumptions.

## 3. Observations and timing

Every rule reads **completed trading sessions** of the dataset (the NYSE sessions present in the data), whatever the
bar resolution.

- Session *s* has high H, low L and close C. The close is the regular-session close: the closing print, or the last
  regular trade.
- A decision at a completed close is first knowable at the scheduled close (16:00 ET, 13:00 on early-close days). Its
  order fills at the **next eligible trade**: the next session's opening trade.
- No rule reads a price before it exists. The breakout and the trend counter read sessions ≤ *s* at the close of *s*.
  The ATR reads only sessions completed before the fill session.

## 4. Rule 1: the initial risk stop

### 4.1 Definition

- **ATR convention.** True range TR_i = max(H_i, C_{i−1}) − min(L_i, C_{i−1}) (Wilder's true range, so gaps count).
  ATR_L is the **simple mean** of the L true ranges of the L sessions completed immediately before the **fill
  session**.
  - There is no Wilder or exponential smoothing. The value depends on those L + 1 sessions only, never on where the
    loaded history starts.
  - The fill session's own high, low and close are never used.
- **Level.** Stop = actual raw fill price − m × ATR_L. The fill is the observed trade, before the per-side cost. The
  level is fixed for the position and never moves.
- **Active from the fill.** The stop applies on the entry session too, from the fill minute on, whatever the position's
  estimated profit, accrued interest or age.
  - The profit trailing stop keeps its own rules: it becomes active only while a sale at it would be profitable after
    interest, and first applies at the session after the entry.
  - That trailing stop becoming ineligible never deactivates the initial stop.
- **History.** The fill session is known at the decision: the decision's own session when a trade follows the decision
  in it, otherwise the next session (the book's own fill rule).
  - If fewer than L + 1 completed sessions exist before that session, the decision is **blocked** and recorded as
    `insufficient_history`. If a price among them is not positive and finite, it is blocked as `invalid_data`.
  - A position is never opened without the requested protection.
  - This applies to every entry source: the Rise crossing, the breakout, a latched opportunity (which keeps waiting,
    state `blocked_by_protection`), a renewal signal, and a continuation trigger (whose episode ends, as with a trend
    veto).
  - The run's warm-up loads L + 1 sessions, so inside a normal window only a symbol's first sessions can be blocked.

### 4.2 Fills (observed execution conventions)

- **Gap.** A session that opens at or below the stop sells at that **opening trade** (reason `initial stop gap`), not at
  the inaccessible stop level.
- **Inside a minute.**
  - A minute that opens at or below the stop sells at that minute's opening trade.
  - A minute that only trades through it sells **at the stop level**, an **assumed** intraminute fill (execution
    `stop level`), exactly as the existing trailing stop does.
- **Entry session.** The stop is checked from the fill minute on. That minute's opening trade is the fill, so only its
  later prices count.
- **Closing print.** As for the trailing stop, the session's minute bars are scanned. A close below the stop without a
  minute through it is caught by the next session's opening gap check.

### 4.3 Which stop governs

Both stops are resting sell stops, and a falling price reaches the higher one first. While the trailing stop is
active it is above the fill (a sale at it would be profitable), so it is above the initial stop.

- **Inside one minute that crosses both:** the trailing stop executes first at its level, at the assumed intraminute
  fill.
- **One trade below both** (a gap, or a minute opening below both):
  - without retention, the higher stop governs: `trailing stop gap`, and the initial stop is recorded as also due
    (`sameTrade`);
  - with retention ON, a full risk exit takes precedence over the partial sale (§6.4): `initial stop gap`, one fill.

### 4.4 Logs

| Record | Contents |
| --- | --- |
| Decision log entry `initial_stop_set` | Level, fill, ATR, L, m, the ATR window, the decision instant |
| Executed entry's values | The fixed stop, ATR, multiple, distance, the ATR sessions, active-from |
| Exit | Rule, stop level, ATR, active-from, decision instant, `sameTrade` |
| Blocked decisions | Their decision event (`protection.*` values) and `decisions.json optionalRules.initialStopBlocked` |

## 5. Rule 2: the trend-breakout entry

### 5.1 The signal

At the completed daily close of session *s*, all three conditions, each strict:

1. C_s > SMA_L(s), where SMA_L(s) = mean(C_{s−L+1} … C_s), this session's close included.
2. SMA_L(s) > SMA_L(s − K): the SMA as it stood at the close K sessions earlier.
3. C_s > max(H_{s−N} … H_{s−1}): the highest high of the N completed sessions **before** the signal session. Its own
   high is excluded.

### 5.2 Timing and fills

- The decision is taken at the scheduled close. The order fills at the next session's opening trade.
- The parameter help states this observation timing.
- The breakout reads daily sessions whatever the run's bar resolution. The resolution still applies to the chart and
  to bar-based continuation methods.

### 5.3 One position, no replay, no cooldown

- Each qualifying close is its own signal (id = its close instant).
- While invested, or with an order pending, it is recorded as **ignored** (`position_open` / `order_pending`).
  - It is never replayed, and its id cannot trigger again.
- After an exit, the next qualifying completed close enters, even the exit session's own close.
  - Its window is that session's own preceding N highs. It is never reset to the exit fill, and there is no implicit
    cooldown.
- No pyramiding, no duplicate pending orders.

### 5.4 History

A window session with fewer than max(L + K − 1, N) earlier sessions, or invalid prices, is not evaluated. It is
recorded in `decisions.json optionalRules.breakout.unavailableSessions` with its reason. The warm-up loads that
history.

### 5.5 Gates and other options

- **The optional entry trend filter** is an additional gate, recorded with its values. A blocked breakout signal is not
  taken later.
- **Persistent eligibility** is Rise-specific (its predicate is the Rise scanner's), so it is **not applicable**. The
  engine refuses the combination; the form disables the switch and records it as not applicable.
- **Continuation entries** remain an independent option, OFF unless switched on.
  - A base entry keeps its priority at the same instant.
  - Neither persistence nor continuation is ever enabled implicitly.

## 6. Rule 3: trend retention

### 6.1 Stages

- **Full.** The existing exits: the profit trailing stop, the maximum losing hold and the buffered intraday loss (plus
  the initial risk stop, if ON).
- **The first profit trailing-stop event** (a gap or an intraday crossing) sells f × the current shares at that
  actual fill. If the stop gapped, the fill can be a loss, and that loss is recorded.
  - This is **one** transition to the remainder stage, never repeated fractional selling.
  - The trailing stop is then **consumed**: never re-armed for this position.
- **Remainder.** The remaining shares exit by the **trend-retention exit**, or earlier by the initial risk stop, the
  maximum losing hold or the buffered loss.

### 6.2 The trend counter

- At each completed close in the remainder stage: if C_s < SMA_L(s) (strictly) the count goes up by one; otherwise it
  resets to 0.
- An SMA without enough history or with invalid data also resets the count, and is logged.
- **The partial-sale session's own close is the first one counted.** It is complete after the sale; closes before the
  sale never count.
- The K-th consecutive close decides the exit at that close. The remainder sells at the next eligible trade.
- Every count change and the decision are logged (`trend_count`, `trend_exit_decision`, with the closes and SMAs).
- A decision at the window's last close stays pending and is reported as such.

### 6.3 Financing gates on the remaining position

The maximum losing hold and the buffered loss judge the **remaining** shares against the **remaining** principal and
its interest:

- the hold's age still counts from the entry session;
- the buffer threshold is −buffer % × the remaining principal (2.9 % of $50,000 after a 50 % sale = −$1,450), never the
  original dollar threshold.

With proportional repayment this is the same condition as on the whole position at the same price (every figure scales
by the same factor), so the remainder is neither tighter nor looser than before.

### 6.4 Precedence and no double sale

All exit candidates of a session are compared in one deterministic order (§7). A full exit due at the same trade as
the partial sale wins:

- the initial stop gapped through;
- a buffered sale left pending overnight;
- a maximum-hold sale.

So one trade is never both a partial and a full sale. A partial sale removes its shares and principal before anything
else is evaluated; the remainder is then evaluated from that very trade on. For example, a lower initial stop crossed
later in the same minute sells the remainder, and the two fills add up to the position.

### 6.5 Accounting (the existing debt-funded model)

| Item | At each exit fill |
| --- | --- |
| Shares | f × the current shares (partial), the rest at the final fill |
| Principal repaid | Proportional: shares sold ÷ shares held × the principal outstanding |
| Interest | That principal × 11 % × calendar days between the entry and the fill session dates ÷ 365 (weekends and holidays included); the remaining principal keeps accruing from the entry date |
| Costs | The per-side bps on every fill; each fill carries its share of the entry cost |
| Net | Proceeds − principal repaid − interest |
| Realized | A partial fill's net is realized at its fill |
| Unrealized | The remainder, marked at each minute and session close net of its own accrued interest (exit cost not charged) |

- **Marks.** Marks = realized (partial fills included) + the remainder's mark. A partial sale changes the mark only by
  its exit cost and its price, with no double counting.
- **Reconciliation.** Each fill is re-booked independently in the shared `FixedLedger`, as one lot per fill. The fills
  must add up to the position's shares, principal and net; a run whose accounting does not reconcile fails.
- **One logical position, several exit fills.** It is **one trade**: a closed trade, a win or a loss by its **total
  net** (all its fills), and only when its last share is sold.
  - Partial fills are shown separately (their own events, rows and nets).
  - An open remainder is an open trade. Its partial fills count as realized and the remainder as unrealized; the
    whole position's net is shown with it.
- **Continuation.** The continuation qualification (net > 0) is judged on the whole position's net at its final fill.
  This includes classic_d1, whose D1 window follows the total, not the remainder.

## 7. The exit order inside a session

These rules apply only when the initial stop or retention is ON. With both OFF, the unchanged `ExitManager` runs.

Every candidate is an observed trade: the session's or a minute's opening trade (phase 0), or a level crossed inside a
minute (phase 1, an assumed fill). The earliest wins, decided in this order:

1. **Bar.** The earlier minute wins.
2. **Phase.** A minute's opening trade comes before anything inside that minute.
3. **Inside a minute.** The higher stop level comes first.
4. **At one opening trade,** the precedence:

| Stage | Precedence at one trade |
| --- | --- |
| Full with retention ON (a partial sale pending) | initial stop > maximum hold > buffered loss > trailing stop (the partial) |
| Otherwise | trailing stop > initial stop > maximum hold > buffered loss > trend exit |

- **Maximum hold.** It is decided at the open and sells at the next trade (09:31). An initial stop crossed inside the
  09:30 minute therefore sells first.
- **Buffered loss.** It is decided at a minute's close and sells at the next trade. A stop reached at or before that
  minute, or gapped through at the next minute's open, sells first, as before.
- **Trend exit.** It is decided at a close and sells at the next session's opening trade, unless a stop gapped through
  that same trade or a pending buffered sale is due there.
- **Ties and `sameTrade`.** Every rule also due at the winning trade is recorded with the exit (`sameTrade`).
- **Equivalence.** A never-reached initial stop (100 × ATR) reproduces the version without it trade for trade, mark
  for mark (`optionalRules.test.ts`): this evaluator equals the `ExitManager` on the shared rules.

## 8. Records, chart and exports

### 8.1 Run artifacts

| Artifact | What it records |
| --- | --- |
| Events | The event contract is unchanged (four kinds).<br>• Breakout signals: `entry_signal` / `rejected_signal` events with `meta.entryMethod: trend_breakout` and their close, SMA, earlier SMA, prior high and window.<br>• A partial fill: an `executed_exit` of the same trade, id `SYM:T-n:partial-k`, `meta.partial: true`, with its own `fillNet`.<br>• The final exit: keeps the id `SYM:T-n:exit` and carries the **position's** `net`.<br>• Blocked decisions: `rejected_signal` with the protection values. |
| `trades.json` | One row per position, as before. With the initial stop or retention ON a row adds `exitFills[]` (every fill: rule, reason, times, raw and after-cost price, shares, principal repaid, interest paid and its days, proceeds, gross, cost shares, net, what remains, the decision instant, the level, `sameTrade`), `partialFillsNet`, `remainderOpen`, `initialStop` and `averageExitRawPrice`. |
| `decisions.json` | The decision log (with `initial_stop_set`, `partial_exit`, `trend_count`, `trend_exit_decision`) and, per symbol, `optionalRules`: the breakout scan, the blocked decisions, every position's stop and fills. |
| `metrics.json` | The run-level `entryMethod`, `initialStop`, `retention` (`{enabled: false}` when OFF). Per symbol `optionalRules` (descriptive counts) only when an option is ON. With retention, `pnl.unrealized` of an open position adds `remainderShares`, `partialFillsNetUsd` and `positionNetUsd`. |

### 8.2 Chart and UI

| Where | What it shows |
| --- | --- |
| Chart | A partial exit is a **half-filled ▼**, coloured by its trade's outcome. The legend names it when present. |
| Trades | One row per position; `+ n partial` on positions with a partial sale |
| Trade detail | Each partial fill (shares sold and kept, its net, why), the final exit and the fixed initial stop |
| Analysis | "Optional rules" (entry method, protected positions, stop exits, blocked decisions, partial fills and their net, remainder exits, closed positions with a partial sale and their W/L) |
| Parameters | Every value with ON/OFF and "saved, not applied" |

### 8.3 Research bundle

| Bundle file | Contents |
| --- | --- |
| `exit-fills.csv` | One row per fill, with the accounting needed to re-book it |
| `optional-rules.md` | The configuration, conventions and counts |
| `trades.csv` | Unchanged columns; its `source` column says when a row is one position closed in several fills |
| `README.md` | Explains all of the above ([EXPORTS.md](EXPORTS.md)) |

Old and full-position results stay distinguishable: without these options there is no `exit-fills.csv` and no partial
event, and the rows are unchanged.

## 9. Interactive Preview

- **One configuration at a time.** It still executes one unsaved configuration at a time. All three options are in
  the panel; inactive drafts never change the cache key.
- **A failed preview** (refused, or the runner failed) is not applied:
  - The panel's error says *Not applied: the chart and Analysis still show …*, naming the previous successful preview
    or the saved run.
  - A red banner above the chart says the same: *Preview failed — not applied … NOT the configuration that failed;
    none of their figures describe it*.
  - No metric of a rejected configuration is ever shown. *Reset to displayed* clears it.

## 10. Reproducing Candidate A with all new options OFF

Candidate A is the configuration the user explored as the control in Interactive Preview on 2026-11-05 (inferred from
the preview cache; it is not a saved run):

- Growth, VGT, 1d, 2016-01-04 → 2026-10-30, 5 bps;
- X 8 %, N 60;
- trailing stop 4 %;
- maximum losing hold ON, 15 days; buffered loss ON, 2.9 %;
- entry trend filter ON, method C (rising SMA), 50 sessions, slope comparison 40;
- persistent eligibility OFF, continuation OFF.

**In the browser:**

1. **+ New test → Growth (v1.3.0)**, set the values above.
2. Leave **Entry method = Rise from recent low**, **Initial risk stop OFF** and **Retain part of profitable trend
   OFF**.
3. Run Test.
   - Alternatively, clone any of the user's 1.2.0 runs, set the values and keep the three options OFF.

**Through the API:**

```json
{
  "strategyKey": "rise-from-recent-low-trading", "strategyVersion": "1.3.0",
  "params": {
    "entryMethod": "rise_from_recent_low", "advanceFromRecentLowPercent": 8, "recentLowLookbackBars": 60,
    "trendFilterEnabled": true, "trendMethod": "rising_sma", "trendSmaSessions": 50, "trendSmaComparisonSessions": 40,
    "eligibilityEnabled": false, "trailingStopPercent": 4, "maximumHoldEnabled": true, "maximumHoldDays": 15,
    "intradayLossBufferEnabled": true, "intradayLossBufferPercent": 2.9,
    "initialStopEnabled": false, "retentionEnabled": false, "continuationEnabled": false, "costBpsPerSide": 5
  },
  "symbols": ["VGT"], "from": "2016-01-04", "to": "2026-10-30", "resolution": "1d"
}
```

**Evidence.** The result equals Growth 1.2.0's: 88 raw signals, 28 trades (13 wins, 15 losses), realized net
+$39,561.83, minute drawdown $19,282 at 5 bps.

- Exactly (engine): case `candidate-a` of `offParity-1.2.0.test.ts`.
- Byte for byte (runner artifacts): R-920001 in `growth-parity.test.ts`.
- These are exploratory figures of one configuration, not evidence of an edge.

**To compare one option against the control,** clone Candidate A and switch ON only that option (or select the
breakout). Then compare the two runs (Strategy Lab's comparison names each option's state and treats the entry method
as the option under study).

## 11. Combinations

Every combination of the three is supported and tested: 8 combinations on one synthetic path in
`optionalRules.test.ts`, plus Candidate A + each on real data. Constraints and conventions to keep in mind:

| Topic | Convention or constraint |
| --- | --- |
| Breakout + persistent eligibility | **Not applicable** (refused by the engine; disabled in the form and recorded as not applicable) |
| Breakout + continuation, breakout + trend filter | Supported, as independent options |
| The breakout at an intraday resolution | Signals at daily closes only (§5) |
| Stop slippage | The initial stop has none, like the trailing stop (`EXECUTION.stopSlippageBps` is 0) |
| Closing print | Not scanned for stops (existing convention); a close below a stop is caught at the next open |
| Assumed fills | Intraminute fills at a stop level are assumed (the actual fill could be worse); labelled `stop level` |

## 12. Tests and evidence

| Test | What it covers |
| --- | --- |
| `src/growth-trading/tests/optionalRules.test.ts` (29) | ATR convention and completed-data timing; warm-up blocking; stops while unprofitable and before the hold age; gaps; the entry session and the fill minute; the higher stop; precedence with the hold; the inert-stop equivalence; the strict breakout conditions and the window without the signal session; no replay and no cooldown; one partial sale; the trend counter and its reset; simultaneous triggers; no double sale; remaining-principal gates; weekend interest, per-fill costs and identities; marks without double counting; logical trade counts and net classification; continuation (incl. classic_d1) on the whole net; valid OFF states; every combination |
| `src/growth-trading/tests/offParity-1.2.0.test.ts` | Exact 1.2.0 parity with the three OFF (9 cases × 2 OFF forms) |
| `apps/strategy-lab/tests/growth-parity.test.ts` | Runner byte parity with 1.2.0 (replay and as 1.3.0 OFF; effective-only requests) |
| `apps/strategy-lab/tests/optional-rules.test.ts` | Registry, applicability, validation, identity and snapshots; the unchanged legacy schemas; the effective-value mapping; the browser trade model of partial fills; a real-data run (events, ledger, decision records, bundle, exact replay, comparison with Candidate A); previews of the new options and of the effective-only OFF states; a refused configuration |
| `apps/strategy-lab/e2e/optional-rules.spec.ts` | The form, a run with partial exits on the chart / Trades / Analysis, a failed preview's banner |

## 13. Limitations

- **Real-data checks.** Retrospective historical data only. The real-data checks are on VGT, GDX and XBI windows; no
  option was tuned.
- **Fill assumptions.** The fills are observed minute-bar proxies; intraminute stop fills are assumed at the level.
- **Fractional shares.** Shares are fractional, so a partial sale can sell exactly f of them.
- **Descriptive counts.** The Analysis counts are descriptive. The effect of an option is an ON run compared with an
  otherwise identical OFF run, because an option changes every later decision (path dependence).
