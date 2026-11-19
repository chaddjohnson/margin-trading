# Canonical D1 audit (for the Intraday D1 VGT study)

- Written: 2026-11-06T16:55:48Z (UTC, from `date -u`). Read-only audit: no strategy, test, optimizer or backtest was
  run, and no file other than this one was written.
- Repository: `/home/chad/projects/margin-trading`, branch `feature/strategy-entry-explorer-ui`, HEAD
  `353e33f21c1539dccf58d2827b92003aa7f61d11`. The working tree was clean except for the untracked
  `research/intraday-d1-vgt/`.
- Data discipline: market data was not read. `data/VGT/data.csv` was inspected only through `head -3`. Data coverage
  comes from the metadata file `data/VGT/dataset-report.json`, which holds row counts, dates and hashes and no prices.
  The audit did read D1's sealed historical results (`research/vgt-d1-refinement/results/baseline/baseline.json`,
  `docs/vgt-d1-primary-discrepancy.md`). Those files contain D1's own 2025–2026 figures. They are about D1, not about
  any new candidate.
- Labels: **[code]** means verified by reading the source at the cited lines. **[doc]** means taken from documentation
  or research records and not re-executed. **[record]** means read from a sealed research JSON.

## 1. What "D1" is

**[doc]** The name comes from `research/vgt-recovery-eligibility`:

- That program studied four "eligibility mechanisms" (A, B, C, D) on top of **file 4**
  (`src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts`) at the parameter set it calls **Set 2**.
- Mechanism **D** is *post-exit continuation*. **D1** is its first phenotype, P 9% and W 60
  (`research/vgt-recovery-eligibility/IMPLEMENTATION_AUDIT.md:29`, `STRATEGY_COMPARISON.md:18`).
- `research/vgt-d1-refinement` later kept D1 as a local maximum ("D1 is the maximum of its own local box").

**[code]** In code, D1 is a named **architecture** with one reference file:

- `src/phenotype/architectures.ts:37-109` defines `architectures.D1` with
  `reference: 'src/app/allIn-trailingBuy-postExitContinuation.ts'` (line 42) and eight parameters:
  - `targetPercentChange` (X)
  - `trailingBuyPercentage` (Y)
  - `trailingStopPercentage` (stop)
  - `maximumHoldDays` (hold, unit `calendarDays`)
  - `tickWindowSize` (L, unit `sessions`)
  - `intradayLossBuffer` (buffer)
  - `pullback` (P)
  - `continuationWindow` (W, unit `sessions`)
- `src/phenotype/strategies.ts:57-64` lists `allIn-trailingBuy-postExitContinuation` as "D1 itself: file 4 plus
  post-exit continuation", with no ignorable parameters and no extra strategy constants.
- The multi-ETF allocator pins exactly this file as `d1Source` (`src/multi-etf-allocator/context.ts:24`).

### 1.1 Canonical file and canonical VGT phenotype

| Item | Value |
|---|---|
| Canonical D1 source | `src/app/allIn-trailingBuy-postExitContinuation.ts`, 1,535 lines, sha256 `de0935c3f402a42b41227c5fb362e9b37fb68fdfe01c14d020ea073dce795dc0` (HEAD) |
| Canonical VGT phenotype ("VGT D1 primary") | `config/phenotypes/D1/VGT.json`, phenotype `primary`, sha256 `3e77a419943b6a066c5467494947dfd4e1212a436ea79f6777c99764ca6c5f70` |
| Execution profile it names | `config/execution/multi-etf-d1.json`, sha256 `c0d5d5eb063bb1d220b667cafcc1cbdb0ce211f6088ec686215c49d7dc3c6d3b` |
| Candidate id | `d1-ebc9f639b3` (the "D1 control vector" of `research/multi-etf-d1/FROZEN_CANDIDATES.json`) |

**[code]** The `primary` parameters equal the file's shipped literals exactly:

| Parameter | Phenotype `primary` | File literal (line) | Unit as the code uses it |
|---|---|---|---|
| X `targetPercentChange` | "21.6%" | `0.216` (550) | fraction of the L-session reference high |
| Y `trailingBuyPercentage` | "0.3%" | `0.003` (551) | fraction above the trailing minute low |
| stop `trailingStopPercentage` | "7.3%" | `0.073` (591) | fraction below the post-entry high |
| hold `maximumHoldDays` | 8 | `8` (592) | **calendar days** between session dates |
| L `tickWindowSize` | 74 | `74` (580) | **trading sessions** (previous sessions only) |
| buffer `intradayLossBuffer` | "2.9%" | `0.029` (552) | fraction of the investment ($2,900 on $100,000), net of interest |
| P `pullback` | "9.0%" | `0.09` (553) | fraction below the post-exit high |
| W `continuationWindow` | 60 | `60` (554) | **trading sessions** after the exit session |

**[code]** The execution profile (`multi-etf-d1.json`) supplies the following, injected by the runner
(`src/phenotype/run.ts:162-173`, `src/phenotype/strategies.ts:49`):

- `investmentPerEntry` 100000 goes to `investmentAmount`.
- `marginInterestRate` "11%" goes to `marginInterestRate`.
- `stopFill` is "stop".
- `firstEligibleDate` 2017-06-15 is added to the arming guard by `src/phenotype/injection.ts:197-201`, as
  `|| phenotypeIneligible(session.time)`.
- The reporting periods are development 2017-06-15 → 2023-12-29 and holdout 2024-01-02 → 2025-10-16.

The file's own literals match the profile: `investmentAmount = 100000` (590) and `marginInterestRate = 0.11` (593).

**[code]** For VGT, the 2017-06-15 eligibility date and the file's native eligibility (arming from the session after
74 sessions of history) give the same trades. `src/phenotype/tests/reproduction.test.ts:235-260` asserts that the
file-native convention gives the same 20 trades and $183,043.82. That test was not run here.

### 1.2 Stale comments

**[code]** The file's header (lines 18-95) is inherited from file 4 and quotes **file-4 constants that are no longer
the values**: "10% (X)", "previous 90 trading sessions", "3% (Y)", "an 8% trailing stop", "the 15-day loss exit" and
"net loss of 0.5%". Line 776 also says "The 10% condition".

The executable constants are the ones in the table above. The header's *rules* are accurate; only its numbers are
stale. The line 10-14 comment, "pullback 9%, window 60 sessions", is current.

### 1.3 The D1 family of files (variants)

All of these are separate files. None is canonical D1. Each was checked by `diff` against the canonical file.

| File | Relation to D1 [code] |
|---|---|
| `allIn-trailingBuy-bufferedLoss-noReentry.ts` ("file 4") | D1 without post-exit continuation. Its arming guard is `warmup + index < tickWindowSize \|\| !isDip(bar.close)`, and it has no `pullback` or `continuationWindow`. |
| `allIn-trailingBuy-postExitContinuation-stopAlways.ts` (B-D) | D1 with `isStopActive = true` from the session after entry. The net-profit test is removed. |
| `…-stopGrossBreakeven.ts` (B-B) | Stop eligible once `stopPrice >= entryPrice`, as a **latch** set at the daily update. |
| `…-stopGrossThreshold.ts` (B-A) | Stop eligible once `postEntryHigh >= entry × (1 + activationGain)`, with `activationGain = 0.08`. Latched. |
| `…-stopTwoStage.ts` (B-C) | Fixed protective stop at `entry × (1 − 0.10)` until the trailing stop level reaches the entry price, then the trailing stop always. Adds the exit reasons `protective stop` and `protective stop gap`. |
| `allIn-trailingBuy-troughRecovery-postExitContinuation.ts` ("BD1") | D1 plus mechanism B, recovery-from-trough episodes. Its constants are troughRecovery 17%, reset 60% and expiry 250. |
| `allIn-trailingBuy-troughRecovery.ts` | File 4 plus mechanism B, without continuation. |
| `allIn-trailingBuy.ts` (base) | Has the **re-entry restriction**: material loss 1% (line 467), lower re-entry 2% (468) and recovery reset 38% (469). D1 does **not** have it. |
| `allIn-trailingBuy-D1-swingLow-P2s.ts` | Not D1. It is a shared-allocation runner of D1 plus swing-low via `src/shared-margin-portfolio/`. Its `--d1-only` regression must print $183,044 / $19,331 [doc]. |

**[doc]** `research/vgt-d1-refinement/README.md` reports two findings on D1's VGT history. B-B and gross thresholds up
to 9.4% give exactly D1's 20 trades. B-C and B-D are worse.

## 2. Rules, precisely (all **[code]**, `src/app/allIn-trailingBuy-postExitContinuation.ts` unless noted)

### 2.1 Data, sessions and regular-hours filtering (`src/lib/session.ts`)

- **Bar format.** Bars are Alpaca 1-minute OHLCV rows, timestamped at the start of the minute in UTC. Prices are raw
  (`src/lib/csv.ts:5-8, 102-133`). The loader requires strictly ascending timestamps.
- **Which minutes count** (`groupMarketSessions`, `session.ts:59-123`):
  - Only New York minutes from 09:30 through the scheduled close are kept: 16:00, or 13:00 on early-close days from
    `src/lib/calendar.ts`.
  - Extended-hours bars are dropped (line 71).
  - The bar that starts *at* the close is not a minute bar. Its **open** becomes `closingPrint` (104-105), and its
    high, low, close and volume are ignored.
  - A session needs at least one regular bar; a lone closing print starts none (81-83).
  - Minutes without trades have no bar, so `bars` can have gaps.
- **Session fields:**
  - `session.time` is `Date.parse(date)/1000`, i.e. **UTC midnight of the NY date** (85). Differences between
    sessions are therefore whole calendar days, with no DST artefacts.
  - `open` is the first regular bar's open (94).
  - `close` is the closing print, or the last bar's close if there is none (117).
  - `high` and `low` cover all regular bars **and the closing print** (118-119).
- **Calendar coverage.** The calendar covers 2016-01-01 → 2026-12-31 (`calendar.ts:3`). Any bar outside it throws
  (`session.ts:75-77`).
- **Splits** (`src/lib/evaluation.ts:139-208`, `src/lib/corporateActions.ts:104-140`):
  - A **partition** run forward-adjusts recorded splits: later prices × ratio, volumes ÷ ratio.
  - An **explicit data file** run is *not* adjusted (`evaluation.ts:145-152`).
  - VGT has an 8:1 split effective 2026-04-21 (`config/market-events/splits.json`). It lies inside the new study's
    validation window.
- **Dividends** are not modelled; ex-dividend drops are price moves (header line 89).

### 2.2 Evaluation window and warm-up (`src/lib/evaluation.ts`, file lines 577-588)

- **Whole-file parse.** The file parses the **whole** data file (`loadCsvMinuteBacktestData(symbol, file)`, line 579).
  It then selects the window with `strategyRunSessions(..., { warmupSessions: tickWindowSize })` (588).
- **Partition runs.** A partition run gets up to L warm-up sessions before the window. These are used only for the
  reference high: no trades, marks, interest or inherited state (evaluation.ts header lines 1-19).
- **Training runs.** `training` starts at the file's first row, so it has no warm-up.
- **Phenotype runner.** `src/phenotype/run.ts:221-262` also parses the whole file (230) and hashes it. It hands the
  strategy only the sessions up to the window's end (244).
- **Data-door consequence.** Any CLI run of D1, even on `training`, parses the 2025–2026 rows into memory. Those rows
  never influence the result, but the bytes are read.

### 2.3 Reference high and arming eligibility

- **Window and units.** The reference high is computed per session (743-746):
  `recentHigh = max(session.high)` over `history[warmup+index−L … warmup+index−1]`.
  - The unit is **the previous L trading sessions, excluding the current one**.
  - It uses the **session high**: the maximum of the regular-minute highs and the closing print. It does not use closes.
  - It is fixed for the whole session; intraday highs never raise it.
  - `xLevel = recentHigh × (1 − X)` (746).
- **Warm-up and eligibility guard.** No arming happens while `warmup + index < L` (800). The phenotype runner adds
  `|| session.time < firstEligibleTime`. The very first history session is skipped outright (749-774).
- **Deep test.** `isDip(price) = 1 − price/recentHigh >= X` (777). It is evaluated on each **completed minute's
  close** (808). The `signal` flag (779) is reporting only.
- **Who may arm.** Only a strategy that is **flat at the session start** may arm (`openPositions.length === 0`,
  780/788), and only when there is no setup (798).
- **Path precedence.** The deep path is tested first, then continuation (804-818).

### 2.4 Trailing buy (states FLAT → ARMED → PENDING_FILL → LONG)

1. **Arming** (825-845) happens on the completed minute whose close satisfies a path.
   - The setup records the activation close, `referenceHigh` (frozen), `kind` (`deep` or `continuation`) and
     `anchorHigh`.
   - The **trailing low starts at that minute's close, not its low**, and `reboundTrigger = close × (1 + Y)`.
   - The activating minute never buys (`continue`, 854).
   - **Any arming closes the continuation window** (850).
2. **Armed, each later completed minute** (857-868), including on later sessions:
   - If `bar.low < trailingLow`, then `trailingLow = bar.low`.
   - Then `reboundTrigger = trailingLow × (1 + Y)`.
   - It **triggers when `bar.close >= reboundTrigger`**.
   - The low is applied before the close test. A minute can therefore set a new low and trigger on its own close if
     the close is Y above that low.
   - There is no requirement that the X condition still hold, and no expiry, cancellation or re-arming. A setup
     persists until it fills or the data ends.
3. **Decision and sizing** (871-899). The decision time is the end of the minute (`bar.time + 60`). Position size is
   decided at the decision: `sizePosition` callback if given, else `investmentAmount` ($100,000). The status becomes
   `pending`.
4. **Fill** (900, `firstTradeAfterDecision`, 155-183):
   - The fill is the **open of the first regular minute with `time >= decisionTime`**. That is normally the next
     minute's open, or a later minute's if minutes are missing.
   - If there is no later minute, the fill is the closing print, but only when the decision came *before* the close.
   - A decision known only at the close, i.e. the last minute's end (`decisionTime >= closeTime`), **cannot take the
     closing print**. It is carried overnight (970-976) and fills at the **next session's first trade** (789-793,
     labelled `opening trade`).
   - The loop `break`s after a rebound (909), so nothing else is evaluated for entries that session.
5. **Position** (913-953):
   - `shares = investment / fill.price`, **fractional** ("Vanguard allows partial shares", 870).
   - `entryTimestamp = session.time`, the session's date and not the fill minute (924).
   - `entryPrice = fill.price`.

### 2.5 Trailing stop and its profit-conditioned activation

- **Initial level** (956-960), set after the entry session. `postEntryHigh = max(fill.price, session.close, highs of
  bars from the fill's minute on)` and `stopPrice = postEntryHigh × (1 − stop)`. The same session's earlier minutes
  are excluded.
- **Daily update, only after a session without an exit** (1080-1084):
  - `postEntryHigh = max(postEntryHigh, session.high)` (the session high includes the closing print).
  - `stopPrice = max(stopPrice, postEntryHigh × (1 − stop))`, so the stop **never moves down**.
  - It changes **once per session**; a session's own prices never move that session's stop (header 62-64).
- **Activation** (199):
  - `isStopActive = shares × stopPrice − investment − interest(through this session's date) > 0`.
  - It is decided **before the open of every session**, afresh, and **is not latched**: accruing interest can switch
    it off again. **[doc]** That happened once on D1's VGT history (`vgt-d1-refinement/README.md`, conclusion 2).
  - An inactive stop never executes, not even on a gap.
- **Execution when active** (`evaluateSessionExit`, 206-254):
  - **Gap:** `session.open <= stopPrice` exits at the opening trade (`trailing stop gap`).
  - **Intraday**, the first minute in order:
    - If `bar.open <= stop`, it fills at that minute's open (`minute open through stop`).
    - Else, if `bar.low <= stop`, it fills **at the stop price** (`stop level`) with `stopFill = 'stop'`, the
      canonical setting.
    - With `next-open`, it fills at the next minute's open or the closing print, else the trigger minute's close.

### 2.6 Maximum (losing) hold and buffered intraday loss

- **Maximum hold** (200-201, 220-224):
  - `daysHeld = (session.time − entryTimestamp)/86400` is whole **calendar days** between session dates.
  - `isMaximumHoldDue = daysHeld >= hold && net profit at session.open < 0`. The net profit includes interest through
    the session's date.
  - It is decided on the opening trade. The sale fills at the **next observed trade after the first minute**
    (`firstTradeFrom(session, bars[0].time + 60)`), i.e. normally the 09:31 bar's open.
  - It is a *losing-hold* exit: a position that is profitable at the open on day ≥ 8 is not sold by it. It is
    re-tested at every later session's open.
- **Buffered intraday loss** (`evaluateBufferedSessionExit`, 291-358):
  - It applies only on sessions with `daysHeld >= hold` that the maximum hold did not already sell at the open (323).
  - The signal is the **first completed minute whose close gives net profit ≤ −investment × buffer** ($−2,900),
    with interest through the session's date (328).
  - It fills like an entry: next minute's open, the closing print only if decided before the close, otherwise
    carried overnight as `pendingBufferedExit` (348-357, 1004-1011).
  - At the next open, a carried sale takes the opening trade ahead of the maximum hold (314-320). A gapping active
    stop still beats it (308-310).
- **Stop versus buffer.** Inside a session, an active stop wins when it triggers in a minute at or before the signal
  minute, or in the next minute by opening through the stop (338-346). Since an active stop sits above breakeven, the
  buffer in practice acts only while the stop is inactive (header 79-81).

### 2.7 Mechanisms absent from canonical D1

- **No material-loss rule, no lower-price re-entry and no recovery reset.** These live in `allIn-trailingBuy.ts`
  (467-469) and were removed by file 4.
  - D1 keeps the schema fields only: `State = 'NORMAL' | 'RESTRICTED'` is always `NORMAL` (259-260, 1066-1078).
  - The summary reports `reentryRestriction: false` and nulls (1446-1450).
  - A loss of any size is logged and gates nothing (1062-1064).
- **No episodes or latches.** `episodes` stays empty (615) and `suppressedSignals` is always 0.
- **No trough-recovery path, no always-armed or swing path, no early or protective stop, no take-profit, no
  end-of-day flattening.**
- **No commissions, slippage or spread** (header 70: "The bid-ask spread isn't modeled").
  - **[code]** Pools and the Study 8 engine add `costBpsPerSide` friction outside the D1 file
    (`src/pools/report.ts:181`, `src/pools/schema.ts:41`). The D1 file itself has none.

### 2.8 Post-exit continuation (the "D" mechanism)

- **Opening** (1021-1027). Only a **net-profitable exit** opens a window: `position.profit > 0` after interest.
  - `continuationHigh = exit.price`.
  - `continuationStart = index`, the exit session.
- **Arming test** (810-818). The strategy is flat at session start with no setup, and:
  - `continuationActive`
  - `index > continuationStart`
  - `index − continuationStart <= W`
  - `bar.close <= continuationHigh × (1 − P)`, where `continuationHigh` excludes the current session.
  - The trailing buy is then identical to a deep one, with `anchorHigh = continuationHigh`.
- **End of each session** (1110-1120):
  - If the window is active and `index > start`, then `continuationHigh = max(continuationHigh, session.high)`.
  - If `index − start >= W`, the window closes (an expiry).
  - Eligible sessions are therefore start+1 … start+W.
- **Other closings.** Any arming, deep or continuation, closes the window (850). A losing exit opens none.
- **Floating-point detail.** The deep test is written `1 − close/high >= X` and the continuation test
  `close <= high × (1 − P)`. A bit-exact port must keep both forms.

### 2.9 Session-level exclusivity and overnight holding

- **Exits** are evaluated only on sessions that **start** with the position open (`openPositions` captured at 780,
  used at 984). There is **no exit on the entry session**.
- **Entries** happen only on sessions that **start** flat, so there is **no re-entry on an exit session** (header
  83-85; 788).
- Consequences:
  - Every trade is held at least overnight.
  - At most one entry or exit event happens per session.
  - Positions are held across nights and weekends with no end-of-day flattening.
  - A sale or buy whose decision has no eligible trade left carries to the next session's opening trade.
- **Exactly one position.** Exits run only when exactly one position is open (984). There is no pyramiding or
  overlap, and capital never compounds.

### 2.10 Interest, P&L and drawdown

- **Interest** (686-690): `investment × rate × (session.time − entryTimestamp)/(365 × 86400)`.
  - It is simple interest on the **full $100,000 borrowed**, by **calendar days between session dates**, with
    **none on the entry day**.
  - A Friday→Monday hold costs 3 days ($90.41). The rate is 11%/365 per day, i.e. $30.14 per day.
  - Intraday timestamps are deliberately unused (header 86-88).
  - Interest is charged at exit, through the exit date (1017-1018), and accrued on an open position at the end
    (1155).
- **Profit** = `shares × exitPrice − investment − interest` (1018).
- **Minute-sampled drawdown** (1087-1102):
  - Marks are taken at every regular minute's close plus the official close.
  - Each mark is realized profit plus the held position, net of interest through the session date. The position
    counts from its fill minute until its exit minute.
  - Drawdown is the peak-to-trough fall of cumulative marked P&L, with the peak starting at 0 (458-480).
- **Daily drawdown** uses the close marks (1104-1108).
- **Reporting.** Both drawdowns are reported in dollars and as a percentage of the fixed $100,000 allocation
  (1213-1221).
- **End of run** (1151-1182):
  - An open position is **marked at the last close**, net of accrued interest, and its unrealized profit is included
    in "Total net profit".
  - An armed or pending setup stays unfilled (`armed_at_end` / `pending_at_end`).
  - A pending buffered sale leaves the position open.
- **Outputs** (1243-1492): `trades.csv`, `daily.csv`, `states.csv`, `episodes.csv` (empty), `setups.csv` and
  `summary.json`.
- **Periods.** The phenotype runner adds periods, attributed within one continuous run with no reset
  (`src/phenotype/periods.ts:1-6`, accounting `src/trailing-buy-variants/accounting.ts`). It refuses an output
  directory under `research/` [doc: `config/phenotypes/README.md`].

## 3. Order of operations (per session, with the per-minute order inside)

The canonical file is **session-structured, not a single per-minute loop**. In any one session it runs either the
entry pass or the exit pass, never both.

```text
for each window session s (index i; history index h = warmup + i):                          # 743
  recentHigh = max(high of history[h-L .. h-1]); xLevel = recentHigh*(1-X)                 # 744-746
  if h == 0: record daily row, next session                                                  # 749-774
  openAtStart = positions open now                                                           # 780
  realizedAtStart = realizedProfit                                                           # 781

  # ---- ENTRY PASS: only if flat at session start ----                                      # 788
  if openAtStart is empty:
    if setup.status == pending (decided in an earlier session):                              # 789-793
      fill = first bar with time >= setup.signal.time  (=> bar 0 open, "opening trade")
    else:
      for bar k in session.bars (chronological):                                            # 795
        decisionTime = bar.time + 60
        if no setup:
          if h < L or (phenotype) s.time < firstEligible: continue                           # 800
          if 1 - bar.close/recentHigh >= X:                kind = deep                       # 808
          elif contActive and i > contStart and i-contStart <= W
               and bar.close <= contHigh*(1-P):            kind = continuation               # 810-817
          else: continue
          setup = {trailingLow = bar.close, trigger = bar.close*(1+Y), ...}                  # 825-845
          contActive = false                                                                 # 850
          continue                       # the activating minute never buys                  # 854
        if bar.low < setup.trailingLow: setup.trailingLow = bar.low                          # 859-862
        setup.trigger = setup.trailingLow*(1+Y)                                              # 864
        if bar.close < setup.trigger: continue                                               # 866
        investment = sizePosition(...) or $100,000                                           # 871-881
        setup.status = pending; signal.time = decisionTime                                   # 887-899
        fill = open of first bar with time >= decisionTime,
               else closing print if decisionTime < closeTime, else none                     # 900
        break                                                                                # 909
    if fill: open position (shares = inv/fill.price, entryTimestamp = s.time);               # 913-953
             postEntryHigh = max(fill.price, s.close, highs from fill bar);
             stopPrice = postEntryHigh*(1-stop); setup = none                                # 956-969
    elif pending and not yet carried: mark carriedOvernight                                  # 970-976

  # ---- EXIT PASS: only if exactly one position was open at session start ----              # 984
  if openAtStart has one position p:
    interest = 0.11 * $100k * calendarDays(p.entry date -> s.date)/365                       # 985
    -- pre-open (no prices of s except its opening trade) --
    stopActive = shares*stopPrice - inv - interest > 0                                       # 199
    holdDue   = daysHeld >= hold and net(s.open) < 0                                         # 200-201
    1. stopActive and s.open <= stopPrice        -> exit at s.open ("trailing stop gap")     # 206-216, 308
    2. pending buffered sale from earlier session -> exit at s's opening trade               # 314-320
    3. holdDue                                    -> exit at next trade after first minute    # 220-224
    4. if daysHeld < hold: intraday stop only (if stopActive):                               # 323, 231-254
         first bar with open <= stop -> its open;  else low <= stop -> stop price
    5. else (daysHeld >= hold, not due at open):
         sig = first bar with net(bar.close) <= -inv*buffer                                  # 328
         stopBar = first bar with open<=stop or low<=stop (if stopActive)                    # 338
         if stopBar <= sig or (stopBar == sig+1 and opens through stop): stop exit           # 340-345
         elif sig: buffered sale at first trade after sig end (or carry to next open)        # 348-357
         else: stop exit if any
    if exit: close p, profit = shares*exitPx - inv - interest;
             if profit > 0: contActive = true, contHigh = exitPx, contStart = i              # 1013-1027
    else:    postEntryHigh = max(postEntryHigh, s.high);
             stopPrice = max(stopPrice, postEntryHigh*(1-stop))                              # 1080-1084

  # ---- MARKS ----
  for each bar close, then the official close: minute drawdown update                        # 1087-1102
  daily mark at the close: daily drawdown update                                             # 1104-1108

  # ---- END OF SESSION: continuation window ----
  if contActive: if i > contStart: contHigh = max(contHigh, s.high)
                 if i - contStart >= W: contActive = false                                    # 1110-1120
```

### 3.1 Same-bar ambiguity and look-ahead (how D1 resolves them)

- **Arming or trigger, then buy.** A decision uses only the completed minute. The buy fills at a later minute's open
  or the closing print, never inside the decision minute.
- **Low before close.** Using a minute's low and then its close in the trailing test is causal, since the close is the
  minute's last trade.
- **Entry versus exit.** These cannot meet in one bar or one session (§2.9).
- **Stop level.** The level is fixed before the session, so intraday highs cannot create an intrabar ordering
  question.
- **Stop optimism.** A minute that trades through the stop without opening through it fills **at the stop price**,
  an optimistic assumption the header acknowledges (67-70). The `next-open` mode bounds it.
- **Stop versus buffered loss in the same minute.** The stop wins.

## 4. Frozen pins, reusable code and non-regression candidates

### 4.1 Frozen and pinned

- **The D1 definition check.**
  - `checkStrategyDefinition(d1Source, a520cfcf…, 'c636e40e')` is in `src/lib/frozenSource.ts:191-238`. It is called
    by `src/multi-etf-allocator/phenotypes.ts:121-131` and `src/multi-etf-allocator/dataset.ts:287`.
  - The pin is set in `src/multi-etf-allocator/context.ts:37-48`.
  - The current file must equal the pinned bytes, plus the documented dataset plumbing (`withDatasetPlumbing`) and the
    drawdown report edit (`withDrawdownReporting`). Any other byte change, **including comments**, fails.
  - The allocator also requires VGT's phenotype values to equal the file's shipped constants.
- **Hash lineage of the D1 file.** All of these were verified with `git show | sha256sum`:

  | Revision | sha256 prefix | Note |
  |---|---|---|
  | `c636e40` | `a520cfcf` | the pin |
  | `53ca8f5` | `c767063b` | |
  | `e8bfe39` | `f44cf412` | |
  | `121cd34` | `de0935c3` | equals HEAD |

- **Other research pins of the same file** (each verifies at its own commit):
  - `src/study4-two-tier-d1-allocator/verify.ts:45-46` pins `de0935c3…` exactly.
  - Hash manifests:
    - `src/complementary-etf-d1/freeze.ts:93`
    - `src/joint-16-etf-d1/audit.ts:85`
    - `src/portfolio-aware-d1/audit.ts:69`
  - `src/study3-vgt-momentum-stage1c/stages.ts:41-46` protects the D1 file, `config/phenotypes/D1/VGT.json`,
    `data/partitions.json` and `data/VGT/dataset-report.json`.
  - `src/d1-ranked-preemption/freeze.ts:59` hashes **every `src/**/*.ts`**. Adding new source files changes that
    manifest; check that study at its own commit, as CLAUDE.md §4 says.
- **Shared library files are NOT covered by the D1 file pin.** These include `src/lib/session.ts`, `evaluation.ts`,
  `csv.ts`, `calendar.ts`, `corporateActions.ts` and `src/phenotype/*`. Changing them could change D1's output
  without tripping `checkStrategyDefinition`. **Do not edit them**; add new code beside them.
- **Hashes at HEAD:**

  | File | sha256 |
  |---|---|
  | `session.ts` | `319b069c…` |
  | `evaluation.ts` | `770ca4ac…` |
  | `calendar.ts` | `3a2a564c…` |
  | `corporateActions.ts` | `ebdae50b…` |
  | `data/partitions.json` | `43893f3d…` |
  | `config/market-events/splits.json` | `e5bde427…` |

### 4.2 Reusable by import, read-only

- **`#lib`:**
  - `groupMarketSessions` and `formatNewYorkTime`
  - `loadCsvMinuteBacktestData`, which supports `fromTime`/`toTime` bounds but still parses every row
  - `resolveDataset`, `selectRunSessions`/`strategyRunSessions` and `loadDatasetSessions` (warm-up, splits)
  - `assertOptimizationPartition`, which **accepts `training` only**, i.e. ≤ 2023-12-31
- **From the D1 file:** its exported pure helpers `firstTradeFrom`, `firstTradeAfterDecision`, `evaluateSessionExit`
  and `evaluateBufferedSessionExit`. Importing does not modify the file.
- **Minute-stepped D1 ports with parity tests:**
  - `src/shared-margin-portfolio/strategy.ts` has `EntryMachine` and `ExitManager` (646 lines). They are parity-checked
    against the files.
  - `src/multi-etf-allocator/shadow.ts` has `ShadowBook`, the per-bar D1 book used by the Study 8 pools engine. Its
    calls per session are `beginSession`, `exitAt`/`fillAt`/`processBar` per bar, then `afterSession`.
  - `src/d1-refinement/engine.ts` is a parameterized D1 decision engine, "the D1 file statement for statement".
- **Caution.** These ports are pinned by research manifests as well, so they are usable by import only.

### 4.3 Tests and golden masters that pin D1 output

Command form (Node 24.21.0, `.node-version`):
`node --experimental-transform-types --disable-warning=ExperimentalWarning --test <file>`. Never run `npm test` in the
main checkout during the embargo (auto-memory: it reads post-2023 data).

| Test | What it pins | Data read |
|---|---|---|
| `src/lib/tests/frozenSource.test.ts` | D1 file = pin `a520cfcf@c636e40e` + plumbing + report text, byte for byte | **none** (git only): safe |
| `src/phenotype/tests/splitRun.test.ts` | D1 `primary` through the phenotype runner on synthetic bars, held across a split | **none** (temp synthetic root): safe |
| `src/multi-etf-allocator/tests/crossPath.test.ts` | D1 phenotype via the standalone runner and the allocator path agree trade for trade | **none** (synthetic): safe |
| `src/shared-margin-portfolio/tests/engine.test.ts` | minute-stepped machines vs the D1-refinement engine | synthetic: safe |
| `src/phenotype/tests/injection.test.ts` | every compatible file, D1 included: the derived module equals the original | reads **all of** `data/VGT/data.csv` into memory, uses only 2019-01 → 2020-07 lines: **byte-level embargo breach** |
| `src/d1-refinement/tests/equivalence.test.ts` | engine = D1: $183,044 / $19,331 / 20 trades | its `describe` loads the legacy file **to 2025-10-13** even for the synthetic case: **post-freeze only** |
| `src/phenotype/tests/reproduction.test.ts` | VGT `primary` trade by trade vs `research/vgt-d1-refinement/results/baseline/baseline.json`: net $183,043.82, minute DD $19,330.69, daily DD $15,611.46 | legacy archive **to 2025-10-13**: **post-freeze only** |
| `src/multi-etf-allocator/tests/regression.test.ts` | the allocator's fixed $100k controls | minute files on `all`: **post-freeze only** |

**Embargo-safe extra check (proposal, not run).** Make a copy of `data/VGT/data.csv` truncated before 2025:

```sh
awk '{ if ($0 >= "\"2025-01-01T05") exit; print }' data/VGT/data.csv > <scratch>/VGT-to-2024.csv
```

- The `exit` stops at the first 2025 row. awk's input buffer may hold a few unprocessed bytes past it.
- Verify the copy's last timestamp and row count afterwards. An unquoted timestamp would compare high and stop the
  copy early, which fails safe.
- Cutting at 05:00 UTC keeps every NY 2024-12-31 bar.
- Training rows alone are the first 663,135 rows (`dataset-report.json`), so `head -n 663135` gives them.

Then run D1 on the copy as an explicit file:

```sh
npm run app -- allIn-trailingBuy-postExitContinuation VGT - - <scratch>/VGT-to-2024.csv <scratch-out> --phenotype primary
```

- `npm run app` runs `eslint && tsc --noEmit` first.
- An explicit file has no split adjustment, which is harmless before 2026.

Expected development figures **[record]** (`baseline.json` development segment, 2017-06-15 → 2023-12-29):

| Figure | Expected |
|---|---|
| Net | **$137,222.97** |
| Minute DD | **$19,330.69** |
| Daily DD | **$15,611.46** |
| Interest | **$27,635.62** |
| Entries and exits | **17 / 17** |
| Wins / losses | **13 / 4** |

- **[record]** D1 has 0 entries and is flat throughout 2023 and 2024, so a run ending 2024-12-31 should report the
  same totals.
- Trades can be compared row by row with `baseline.json` `trades` filtered to `entryDate <= 2024-12-31`. That file
  also lists D1's 2025 trades.
- **[doc]** The development row is identical on the canonical file (`docs/vgt-d1-primary-discrepancy.md` §1).

## 5. `docs/vgt-d1-primary-discrepancy.md`, summarized [doc]

- **What changed.** `npm run app -- allIn-trailingBuy-postExitContinuation VGT all --phenotype primary` once printed
  **$195,186.28** (26 closed trades plus 1 open) and now prints **$178,574.30** (21 trades, flat).
- **Cause.** VGT's raw 8:1 split on **2026-04-21** was unadjusted:
  - The stale pre-split reference high of 809.32 made every post-split minute look 85–88% below it.
  - That armed six artefact `deep` trades (#22–27, +$16,612) from 2026-04-21 09:31 ET.
  - With the split forward-adjusted, D1 correctly stays flat after its 2026-02-05 loss exit.
  - No code changed. A synthetic split regression was added to `splitRun.test.ts`.
- **What did not change.**
  - The strategy hash lineage: `c767063b` → `f44cf412`, both giving identical trades. The phenotype hash `3e77a419…`
    and profile `c0d5d5eb…` are the same.
  - The development and holdout rows: $137,222.97 and $44,696.62 to 2025-10-16.
  - Frozen research: the legacy archive still reproduces $183,043.82 (to 2025-10-13).
- **Limitations named then.** XLE, XLU, XLY and XOP splits were unrecorded. **[code]** They are now recorded in
  `config/market-events/splits.json` (sha256 `e5bde427…`, no longer the doc's `7c98f4a7…`).
- **Other differences.** The full-history figure ($178,574.30, to 2026-10-13) differs from $183,043.82 only after
  2025-10-13. The standalone period table has no `final` row, by profile definition.
- **For this study.** The 2026 split lies inside validation. Use partition runs, or apply the split explicitly. An
  explicit-file run is **not** adjusted.

## 6. Time-clocked rules an intraday port must map (facts, not a design)

| D1 rule | Clock in canonical code |
|---|---|
| Reference high L | previous L **sessions'** highs, fixed per session |
| Arming, trailing low, rebound | **completed minutes**, already minute-native |
| Entry fill | next minute's open, already minute-native |
| Stop level update | **once per session**, after it closes |
| Stop activation | decided **pre-open per session** |
| Maximum hold | **calendar days** between session dates, tested at the open only |
| Buffered loss | from hold day on, any completed minute |
| Continuation window W | **sessions**; high updated at session end |
| No exit on the entry session, no entry on an exit session | **session** |
| Interest | **calendar days** between session dates, 0 on the entry day |
| Warm-up | L sessions |

Taken literally, the session-exclusivity rules (§2.9) forbid same-day round trips and cap D1 at one event per
session. An intraday interpretation has to decide this deliberately and record it as a deviation.

**[record]** D1's VGT history (`baseline.json`, to 2025-10-13):

- 20 entries: 14 deep and 6 continuation.
- Exit reasons: trailing stop 11, gap 2, maximum hold 6, buffered loss 0, 1 open at the end.
- 0 overnight-carried orders.
- 6 trades whose stop never became active.
