# Feature matrix (draft for GPU_CPU_PARITY.md)

Legend: **CPU baseline** = implemented in the canonical CPU engine. **POC** = evaluated on the GPU and gated bit for bit.
**CPU→POC** = computed by the canonical CPU engine and consumed by the GPU pool (its trades are inputs). **Refused** = the
GPU path returns an explicit "unsupported feature" error (never silently altered logic). **Phase 2** = to be ported.

| # | Area | Feature | CPU code | CPU baseline | Phase 1 POC | Phase 2 |
|---|---|---|---|---|---|---|
| 1 | D1 entry | Deep entry: arm when 1 − close ÷ reference high ≥ X at a completed minute | strategy.ts EntryMachine | yes | POC | — |
| 2 | D1 entry | Reference high: max of the previous L sessions' highs (−∞ at the first session) | four-family/data.ts computeReferenceHighs | yes | POC (device table, L ≤ 300) | lift the L cap if boxes widen |
| 3 | D1 entry | Trailing buy: trailing low, rebound trigger × (1 + Y), the arming minute never buys | EntryMachine.processBar | yes | POC | — |
| 4 | D1 entry | Fill at the first trade at/after the decision (minute open), closing print, or carried overnight to the next opening trade | strategy.ts firstTradeAfterDecision; ShadowBook | yes | POC | — |
| 5 | D1 entry | Arming start (harmonized 2016-01-04 / native 2017-06-15) | evaluate.ts d1Arm | yes | POC | — |
| 6 | D1 entry | Post-exit continuation: window W sessions after a profitable exit, pullback P from the continuation high | EntryMachine | yes | POC | — |
| 7 | D1 entry | Flat-since-session-start rule (no arming with a position at the open, after an exit in the session, or with a pending order) | ShadowBook.processBar | yes | POC | — |
| 8 | D1 entry | Swing-low entry mode | strategy.ts 'swing' | yes (unused by current optimizers) | Refused (encoder) | port if a study uses it |
| 9 | D1 exit | Net-profit trailing stop: active iff shares × stop − investment − interest > 0; stop from the post-entry high, raised after each close (not on the entry session), never lowered; entry-session high from the fill minute | ExitManager | yes | POC | — |
| 10 | D1 exit | Gross-breakeven stop policy (latch) | ExitManager stopPolicy 'breakeven' | yes (unused) | Refused (encoder) | port if used |
| 11 | D1 exit | Trailing-stop gap at the session open (opening trade) | ExitManager.evaluate | yes | POC | — |
| 12 | D1 exit | Minute open through the stop; minute low reaching the stop: fill at the stop (`stop`) or the next minute's open / closing print / trigger close (`next-open`) | ExitManager.evaluate | yes | POC (both fills) | — |
| 13 | D1 exit | Maximum hold in calendar days, due only at a loss at the open, sold at the first trade ≥ open + 60 s | ExitManager.evaluate | yes | POC | — |
| 14 | D1 exit | Buffered intraday loss from the hold age; stop-versus-buffer precedence; the pending sale carried overnight | ExitManager.evaluate | yes | POC | — |
| 15 | D1 exit | Trading-session hold unit (`holdUnit = 'sessions'`) | research/vg-l0-session-hold branch only | not on this branch | not applicable | port with the engine if adopted |
| 16 | D1 costs | Per-side cost in every fill price; stop slippage on stop fills | ShadowBook buy/sellPrice, close | yes | POC (5, 10, 20 bps; 25 bps slippage gated) | — |
| 17 | D1 costs | Simple interest (rate × calendar days ÷ 365) on the notional from the entry session's midnight | strategy.ts interestOn | yes | POC (11%, 14% gated) | — |
| 18 | D1 book | Standalone figures: realized, marked net, strict minute and daily drawdown trackers | runD1BookRc2 | yes | POC | — |
| 19 | D1 book | End of data: open position marked at the last close with accrued interest, no exit cost; order unfilled at the end | ShadowBook.finish | yes | POC | — |
| 20 | RC 1 | Unconditional protective loss stop, level entry raw × (1 − d), next-session activation, gap / open / low triggers | d1-risk-controls/exit.ts | yes | POC | — |
| 21 | RC 2 | Entry-day activation, including an exit in the fill minute | d1-risk-controls-rc2 | yes | POC | — |
| 22 | RC 1 | Hold policy: legacy, disabled (with the stop), adaptive progress-extended (latched) | RiskExitManager.holdAt | yes | POC | — |
| 23 | RC 1 | Precedence of protective and legacy exits (gap, carried buffered sale, maximum hold, trailing stop, ties) | RiskExitManager.evaluate | yes | POC | — |
| 24 | RC 1 | Protective-fill slippage (stress) | RiskShadowBook.close | yes | POC | — |
| 25 | RC 1 | Prolonged-decline entry gate: episodes, K losses, block, recovery reset, block expiry, refusal counts | DeclineGate | yes | POC | — |
| 26 | RC 1/2 | RC summary counters used by the search record (protective, gap, entry-day, maximum hold, adaptive, episodes, blocks, blocked sessions) | vg-l0-risk-families evaluate (RcLite) | yes | POC | — |
| 27 | RC 1/2 | Per-trade RcTrade rows and the RcEvent log (dates, levels, reasons) | RcLog | yes | not produced | Phase 2 (detail mode) |
| 28 | Growth | Every Growth 1.4.0 rule: Rise and breakout entries, five trend filters, five eligibility policies, drawdown recovery gate, trailing stop, maximum hold, intraday loss buffer, ATR initial stop, retention partial sale, four continuation methods, stress handling | src/growth-trading/* (≈ 8,500 lines) | yes | CPU→POC: computed by the canonical CPU engine; its virtual trades (partial fills included) are consumed by the GPU pool | **Phase 2: the GPU Growth evaluator** |
| 29 | Pool | One exclusive $100,000 slot; grant iff flat and nothing reserved; refusal "slot occupied"; refusals never feed back (L0) | pool.ts decide | yes | POC | — |
| 30 | Pool | Same-instant tie order (D1 first or Growth first; GDX before VGT) | pool.ts tieOrderOf | yes | POC (both orders) | — |
| 31 | Pool | Reservation until the book's own fill; a new lot's exits in its fill minute | pool.ts | yes | POC | — |
| 32 | Pool | Order at one instant: decisions ≤ T, exits (VGT, GDX), fills, mark; the close | pool.ts timeline | yes | POC | — |
| 33 | Pool | Funded lot: fractional shares = budget ÷ fill price, interest on repaid principal, costs, partial exits (fraction of current shares and principal) | pool.ts openLot / exitFill | yes | POC | — |
| 34 | Pool | Marks at every minute the held symbol prints and at every close; quiet-session fast path; strict minute and session trackers with peak, trough and recovery instants | pool.ts record / Tracker | yes | POC | — |
| 35 | Pool | Daily closes; principal, value and held book at each close; peaks; sessions held; marks; decisions per book | PoolResult | yes | POC | — |
| 36 | Pool | End of data: the open lot marked with accrued interest; skipped-exit check | pool.ts | yes | POC | — |
| 37 | Pool | Options: blackouts, later funding start, whole shares, period (reset) drawdowns, explicit tie order, funding log and lot MAE marks (`detail`), mark recording | PoolOptions | yes | Refused (explicit error) | Phase 2 (periods and detail are needed by qualification/validation) |
| 38 | Pool | Funding lifecycles L1 / L2 (refusals feed back) | vg-growth-funding-lifecycle | yes (experimental) | not applicable (L0 only) | only if adopted |
| 39 | Pool | Shadow-position eligibility allocator option | vg-l0-shadow-eligibility | yes (experimental, own namespace) | not applicable | only if adopted |
| 40 | Record | Compact record (recordOf): per-book and family stats, years, episodes, ledger signature, virtual standalone figures | evaluate.ts recordOf | yes | CPU on GPU outputs (the unchanged function on a rebuilt PoolResult) | optional GPU reduction |
| 41 | Record | Detailed record (evaluateDetail: cutoff exposure, per-lot MAE) | vg-l0-risk-families | yes | not produced | Phase 2 (detail mode) |
| 42 | Search | Genome decoding, Sobol/Latin screens, NSGA-II, neighbourhoods, rungs, refinement, archive, caches, random streams, ranking, gates, selection | src/vg-l0-full-joint/* | yes | CPU (unchanged by design) | CPU (unchanged) |
| 43 | Data | Byte-prefix doors, FULL with forward split adjustment, session grouping | vg-d1-growth-joint/data.ts | yes | the CPU loader's exact in-memory arrays exported (dataset.ts); no CSV parsing on the GPU | — |
