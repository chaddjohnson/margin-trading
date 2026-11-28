# GPU evaluator feature matrix (maintained)

The single maintained map from every TypeScript trading feature of the official optimization domain to its CUDA
counterpart, its capability bit and its parity evidence. Update it with every change (checklist step 8,
[PARITY_CHECKLIST.md](PARITY_CHECKLIST.md)). Snapshot and evidence of the first acceptance study:
`research/gpu-phase2/GPU_PHASE2_FEATURE_MATRIX.md`.

- TypeScript (authoritative): the canonical evaluation path `src/vg-l0-risk-families/evaluate.ts` → `src/d1-risk-controls-rc2/`
  → `src/vg-d1-growth-joint/{books,pool,evaluate}.ts` → `src/growth-trading/` (+ `src/entry-signals/`,
  `src/multi-etf-allocator/shadow.ts`, `src/shared-margin-portfolio/strategy.ts`); risk-envelope reference
  `src/vg-l0-risk-metrics/{engine,metrics}.ts`. The exact file list and digests: `src/gpu-backend/compat.ts --manifest`.
- CUDA (accelerator): `src/gpu-backend/cuda/` — `gb_d1.cuh` (D1 + RC), `gb_growth.cuh` (Growth 1.4.0), `gb_pool.cuh`
  (pool, options, risk envelope), `gb_common.cuh`, `v8math.cuh`, `gb_server.cu`, interface `gb.h` (protocol v2).
- Status legend: **GPU** = implemented and bit-exact in the parity suite; **refused** = an explicit capability refusal
  (the server rejects the batch; official runs reaching it are blocked); **CPU only** = outside the official domain.

## D1 books (both symbols)

| Feature | TypeScript | CUDA | Bit | Status |
|---|---|---|---|---|
| Deep entry: 1 − close ÷ reference high ≥ X at a completed minute | strategy.ts EntryMachine | gb_d1 `armingKind`, refHigh table | `D1_BOOK` | GPU |
| Reference high of the previous L sessions | four-family/data.ts computeReferenceHighs | server `refHighKernel` (L ≤ 300) | `D1_BOOK` | GPU |
| Trailing buy, rebound trigger, arming minute never buys | EntryMachine.processBar | `d1ProcessBar` | `D1_BOOK` | GPU |
| Fill: next minute open / closing print / next session's opening trade | firstTradeAfterDecision | `firstTradeAfterDecision` | `D1_BOOK` | GPU |
| Arming start (harmonized / native 2017-06-15) | evaluate.ts d1Arm | `armStart` | `ARM_START` | GPU |
| Post-exit continuation (window W, pullback P) | EntryMachine | `armingKind`, `d1Close` | `D1_BOOK` | GPU |
| Flat-since-session-start rule | ShadowBook.processBar | `d1ProcessBar` | `D1_BOOK` | GPU |
| Net-profit trailing stop (post-entry high, raised after closes, never lowered) | ExitManager | `exitEvaluate`, kernel afterSession | `D1_BOOK` | GPU |
| Stop gap at the open; minute open/low through the stop; `stop` / `next-open` fills | ExitManager.evaluate | `exitEvaluate` | `NEXT_OPEN` | GPU |
| Maximum hold (calendar days, loss at the open, first trade ≥ open + 60 s) | ExitManager.evaluate | `exitEvaluate` | `D1_BOOK` | GPU |
| Buffered intraday loss, precedence, overnight carry | ExitManager.evaluate | `exitEvaluate` | `D1_BOOK` | GPU |
| Costs per side; stop slippage | ShadowBook | `d1Fill`, `d1Close` | `SLIPPAGE` | GPU |
| Simple interest from the entry session's midnight | interestOn | `interestOn` | `D1_BOOK` | GPU |
| Standalone figures (realized, marked net, minute/daily DD) | runD1BookRc2 | `d1Kernel` | `D1_BOOK` | GPU |
| RC 1 protective stop, next-session activation, gap/open/low | d1-risk-controls/exit.ts | `protectiveTrigger`, `riskEvaluate` | `RC_CONTROLS` | GPU |
| RC 2 entry-day activation (exit in the fill minute) | d1-risk-controls-rc2 | `entryDayTrigger` | `RC_CONTROLS` | GPU |
| Hold policy legacy / disabled / adaptive progress-extended | RiskExitManager.holdAt | `riskEvaluate` | `RC_CONTROLS` | GPU |
| Prolonged-decline entry gate (episodes, K losses, block, recovery, expiry) | DeclineGate | `gateOnExit`, `gateAfterClose` | `RC_CONTROLS` | GPU |
| RC counters of the search record (RcLite) | vg-l0-risk-families RcLite | GbBookOut counters | `RC_CONTROLS` | GPU |
| Swing-low entry mode; gross-breakeven stop policy | strategy.ts 'swing', 'breakeven' | — | `D1_SWING`, `D1_BREAKEVEN` | refused (not reachable by the optimizer's genome) |
| RC per-trade rows and event log (RcLog2 detail) | RcLog2 | — | — | CPU only (diagnostic detail; the records read only the counters) |
| Trading-session hold unit | research/vg-l0-session-hold branch | — | `SESSION_HOLD_UNIT` | refused (not on this branch) |

## Growth 1.4.0 books (both symbols)

| Feature | TypeScript | CUDA (gb_growth.cuh) | Bit | Status |
|---|---|---|---|---|
| Rise-from-recent-low scanner (edge-triggered; rolling N-bar low; 1e-12 tolerance) | entry-signals/riseFromRecentLow.ts | `gSessionDecision` (sparse-table minimum; same values) | `G_RISE` | GPU |
| Trend-breakout entry (SMA_L rising over K, prior N-session high) | optionalRules.ts scanTrendBreakout | `gSessionDecision` (naive SMA sums; sparse-table max) | `G_BREAKOUT` | GPU |
| Trend filter: price change | entryGates.ts TrendGate | `trendPass` | `G_TREND_PRICE_CHANGE` | GPU |
| Trend filter: regression slope (Math.log / Math.exp) | TrendGate | `trendPass` + `v8math.cuh` (V8's fdlibm) | `G_TREND_REGRESSION` | GPU |
| Trend filter: rising SMA | TrendGate | `trendPass` | `G_TREND_RISING_SMA` | GPU |
| Trend filter: higher highs/lows (partial current session) | TrendGate.partialHighLow | `partialHighLow`, `trendPass` | `G_TREND_HHL` | GPU |
| Trend filter: momentum | TrendGate | `trendPass` | `G_TREND_MOMENTUM` | GPU |
| Eligibility: time-limited, minimum strength, maximum extension, deterioration | EntryGates | `gValidity`, `gEvaluateOpportunity`, `gGatesEvaluate` | `G_ELIG_*` | GPU |
| Eligibility: reset & renew (renewal watch) | EntryGates.stepWatch | `gStepWatch` | `G_ELIG_RESET_RENEW` | GPU |
| Drawdown Recovery Gate (open/reopen/minute/close observations, detection, trough, recovery, confirmation clock, releases waking a latched opportunity) | drawdownGate.ts | `ddStep`, `ddCheck`, `gWake`, release in `gGatesEvaluate` (discovery max from a sparse table over full observations; New York minute from the CPU's newYorkOffset) | `G_DRAWDOWN_GATE` | GPU |
| Trailing stop, maximum hold, intraday loss buffer (ExitManager, net policy; OFF = ∞) | riseTrading.ts exitParamsOf + ExitManager | `gExitEvaluate` | `G_MAX_HOLD`, `G_BUFFER` | GPU |
| ATR initial risk stop (decision-time availability, fill-minute activation) | optionalRules.ts PositionRules | `gProtection`, `gAttach`, `gRulesOnFill`, `gEvaluateSession` | `G_INITIAL_STOP` | GPU |
| Trend retention (partial sale at the first profit trailing-stop event; remainder's SMA exit) | PositionRules | `gPartialSale`, `gRulesAfterSession`, `gEvaluateSession`, `gExitsAtRules` | `G_RETENTION` | GPU |
| Exit precedence of the optional rules (bar, phase, level, rank; stable sort) | evaluateSession | `gEvaluateSession` (stable insertion sort, same comparator) | `G_INITIAL_STOP`, `G_RETENTION` | GPU |
| Continuation: classic_d1 (D1's EntryMachine inside the book) | continuation.ts + EntryMachine | `gClassicProcessBar`, `gContEvaluate` | `G_CONT_CLASSIC` | GPU |
| Continuation: breakout, shallow pullback, MA cross | continuation.ts assessBar | `gContEvaluate` | `G_CONT_*` | GPU |
| Base priority, veto, episode lifecycle, window expiry | ContinuationController | `gBeforeBaseEntry`, `gContTrigger`, `gContAfterExit`, `gContAfterSession` | — | GPU |
| Next-open stops where supported; stop-level fills with the optional rules | evaluate.ts growthNextOpenSupported | encoder (`encodeGrowth`) + `gExitEvaluate` | `NEXT_OPEN` | GPU |
| Standalone figures (minute / session trackers on every minute and close) | simulateTrading | `growthKernel` | — | GPU |
| Signal resolutions other than 1d | entry-signals/bars.ts | — | `G_INTRADAY_RESOLUTION` | refused (the optimizer's resolution is 1d) |

## Pool, records and risk inputs

| Feature | TypeScript | CUDA / host | Bit | Status |
|---|---|---|---|---|
| One-slot L0 funding, refusal "slot occupied", reservation to the fill | pool.ts runPool | gb_pool `poolKernel` | `POOL` | GPU |
| Tie order D1-first / Growth-first / explicit | pool.ts tieOrderOf, options.tieOrder | `cin.tie`, `cin.first` | `POOL_GROWTH_FIRST`, `POOL_TIE_ORDER` | GPU |
| Enabled books (V structure, removal reruns) | evaluate.ts isEnabled | `cin.present` | `POOL_ENABLED` | GPU |
| Funding start, blackouts | PoolOptions fundFrom, blackouts | `decide` | `POOL_FUND_FROM`, `POOL_BLACKOUTS` | GPU |
| Whole shares (report sensitivity) | PoolOptions wholeShares | `openLotNow`, `exitFill` | `POOL_WHOLE_SHARES` | GPU |
| Period (reset) drawdowns | PoolOptions periods | period trackers | `POOL_PERIODS` | GPU |
| Marks, strict minute/session trackers with instants, daily closes, principal/value/held at each close, peaks | pool.ts | `record`, `lotMark`, series | `POOL` | GPU |
| Detail mode: funding log, every lot's worst/best mark | PoolOptions detail | `GbFunding`, `lotMark` | `POOL_DETAIL` | GPU |
| Compact record (recordOf) and detailed record (riskInputsOf) | vg-d1-growth-joint/evaluate.ts, vg-l0-risk-families/evaluate.ts | the UNCHANGED CPU functions on the GPU's books and PoolResult (a reduction of GPU evidence) | — | GPU evidence + canonical CPU reduction |
| Risk-envelope inputs: banked-capital DD (marked, liquidation), trade principal loss (marked, liquidation) | vg-l0-risk-metrics engine.ts remark + metrics.ts | `riskMark`, `riskPoint`, exit points | `RISK_METRICS` | GPU |
| Risk-envelope DELIVERY to a search (GPU Phase 7): EvalLab items `risk: true` → `{ ...record, envelope }` under the `|risk` key; validated (`checkEnvelope`); interpreted only by `src/risk-envelope/policy.ts` | CPU reference: src/gpu-phase7/envelope.ts (= Phases 2–6's envelopeOf) through src/gpu-phase7/cpuEvalWorker.ts | `pool.ts` (value + mismatch check), `lab.ts` (key, validation) | `RISK_METRICS` | GPU (research/gpu-phase7: risk-delivery parity R1–R3, Q1, sealed replay with the envelope requested) |
| Minute-mark change recording | PoolOptions recordMarks | — | `RECORD_MARKS` | refused (charts/slices diagnostics) |
| Funding lifecycles L1/L2, shadow-position eligibility | experimental study namespaces | — | `LIFECYCLE_L1_L2`, `SHADOW_ELIGIBILITY` | refused (outside the domain) |

## Data and numerics

| Item | Rule |
|---|---|
| Bars | the CPU loader's exact in-memory arrays (GB2 dataset v2, `src/gpu-backend/dataset.ts`); the CPU door's own daily signal bars; FULL's split adjustment included; no CSV parsing on the GPU |
| Refused datasets | an empty session, a non-positive or non-finite price, non-integer times, bars not one per session |
| Doors after appends (GPU Phase 9) | the CPU closure's loaders read a pinned historical input as its verified byte prefix (`src/lib/canonicalPrefix.ts`, `src/lib/researchRanges.ts`, the loaders' `pin` / `maxBytes`, Priority 3's FULL door): no CUDA counterpart is needed, because the GPU receives the exported door arrays. Evidence: `research/gpu-phase9/results/dataset-identity.json` (every real-data door's GB2 dataset = GPU Phase 7's, 38/38) and the parity campaign (0 mismatches) |
| Precision | binary64 only; `--fmad=false`, IEEE division/sqrt, `-ffp-contract=off`; JavaScript operation order; `Math.max/min` NaN/±0 semantics; V8 `log/exp` |
| Capacity | fixed per-candidate capacities raise explicit statuses; the pool re-evaluates such a candidate on the GPU with larger capacities |
| Errors | each CPU throw has a per-candidate status; loops have device-side bounds (`C_G_LOOP`) |

## Host path (GPU Phase 3)

Not a trading feature: where the request is built and the response is turned into the CPU engine's objects. It changes
no number of any result (bit-identical by construction and by the parity suite through it); every file is in the
evaluation digest compiled into the binary.

| Item | TypeScript | Role | Evidence |
|---|---|---|---|
| Batch codec | `batch.ts` (`encodeShard`, `assembleBatch`, `verifyResponse`, `candHashes`/`combineChecksum`, `layoutOf`, `decodeRange`) | one implementation of the request and the response for both paths | captured Phase 2 batches: request bytes and every result hash identical (`research/gpu-phase3/results/final/offline-check.json`) |
| Serial path | `client.ts` `prepare` / `complete` (`hostWorkers` 0) | one shard on the calling thread (Phase 2's path) | parity determinism "host workers 0"; mini-optimization w0 = w8 |
| Parallel path | `hostPipeline.ts`, `hostWorker.ts`, `hostDoor.ts` | contiguous shards on worker threads; receipt verified on the main thread; results in candidate order; fail closed | the parity campaign through it, determinism across 0/1/3/12 workers and reversed order, sealed-job replays, negative tests |
