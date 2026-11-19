# GPU Phase 2 — feature matrix (final, with evidence)

The complete CPU/GPU capability matrix of the official optimization domain (Assignment 3's genome and stages, plus the
risk-envelope pilot's inputs), with the parity evidence of the FINAL campaign on the frozen binary `3fe09e67…13fc`.
The maintained copy (without the evidence counts) is [docs/gpu/FEATURE_MATRIX.md](../../docs/gpu/FEATURE_MATRIX.md);
the scope and the reachable genome with its ranges are in [PHASE2_SCOPE_AND_FEATURE_MATRIX.md](PHASE2_SCOPE_AND_FEATURE_MATRIX.md).

## Verdict per feature class

| Class | Status |
|---|---|
| Every reachable D1 / RC feature (families A–D, both activations, decline gate, every control gene, fills, costs, interest, stresses) | **GPU, bit-exact** |
| Every Growth 1.4.0 structure (8 structural genes: 2 entries × 6 trend filters × 6 eligibility policies × gate × 3 exit structures × initial stop × retention × 5 continuation methods = 8,640) and every conditional numeric gene | **GPU, bit-exact** (5,040 distinct structures and every value of every structural gene exercised in the campaign; all 8,640 encoded by the capability preflight) |
| Pool, every `EvalOptions` field, compact and detailed records, qualification stresses and removals | **GPU, bit-exact** |
| Risk-envelope inputs (banked-capital DD, trade principal loss; marked and liquidation) | **GPU, bit-exact** (64,063 envelopes) |
| Outside the domain: L1/L2 lifecycles, shadow-position eligibility, trading-session hold unit, D1 swing/breakeven modes, non-1d Growth signal resolutions, minute-mark recording | **refused by capability bit** (official runs that could reach them are blocked; never CPU-fallback-compliant) |

No reachable official optimization feature is unported.

## Evidence per capability (FINAL campaign)

Campaign: 54 runs, 144,795 candidates, 144,795 identical, 0 mismatches; 141,600 seeded random genomes; 5040 of 8,640 Growth structures; 8,379,431 virtual trades, 5,384,434 funded lots, 2,918,811 funding records, 199,087 partial fills.

| Capability bit | Candidates exercising it |
|---|---:|
| `D1_BOOK` | 143,234 |
| `RC_CONTROLS` | 140,639 |
| `NEXT_OPEN` | 7,812 |
| `SLIPPAGE` | 6,779 |
| `ARM_START` | 6,779 |
| `G_RISE` | 73,436 |
| `G_BREAKOUT` | 73,159 |
| `G_TREND_PRICE_CHANGE` | 24,763 |
| `G_TREND_REGRESSION` | 24,618 |
| `G_TREND_RISING_SMA` | 25,085 |
| `G_TREND_HHL` | 24,909 |
| `G_TREND_MOMENTUM` | 24,666 |
| `G_ELIG_TIME_LIMITED` | 12,498 |
| `G_ELIG_MIN_STRENGTH` | 12,433 |
| `G_ELIG_MAX_EXTENSION` | 12,240 |
| `G_ELIG_DETERIORATION` | 12,553 |
| `G_ELIG_RESET_RENEW` | 12,532 |
| `G_DRAWDOWN_GATE` | 73,861 |
| `G_MAX_HOLD` | 96,886 |
| `G_BUFFER` | 49,054 |
| `G_INITIAL_STOP` | 73,576 |
| `G_RETENTION` | 73,325 |
| `G_CONT_CLASSIC` | 29,953 |
| `G_CONT_BREAKOUT` | 29,716 |
| `G_CONT_SHALLOW` | 29,753 |
| `G_CONT_MA_CROSS` | 29,475 |
| `POOL` | 144,795 |
| `POOL_FUND_FROM` | 6,779 |
| `POOL_ENABLED` | 138,016 |
| `POOL_WHOLE_SHARES` | 6,779 |
| `POOL_BLACKOUTS` | 6,779 |
| `POOL_PERIODS` | 7,812 |
| `POOL_TIE_ORDER` | 6,779 |
| `POOL_GROWTH_FIRST` | 6,779 |
| `POOL_DETAIL` | 64,074 |
| `RISK_METRICS` | 64,074 |

| Exit reason (book type) | Fills |
|---|---:|
| D1: buffered intraday loss | 207,405 |
| D1: maximum hold | 2,731,535 |
| D1: protective stop gap | 213,362 |
| D1: protective stop | 746,614 |
| D1: trailing stop gap | 708,094 |
| D1: trailing stop | 2,172,242 |
| Growth: buffered intraday loss | 44,667 |
| Growth: initial stop gap | 42,076 |
| Growth: initial stop | 180,576 |
| Growth: maximum hold | 809,723 |
| Growth: trailing stop gap | 96,826 |
| Growth: trailing stop | 343,565 |
| Growth: trend exit | 138,768 |

| Entry kind (book type) | Trades |
|---|---:|
| D1: continuation | 722,406 |
| D1: deep | 6,149,919 |
| Growth: breakout | 7,262 |
| Growth: continuation | 10,874 |
| Growth: ma_cross | 4,320 |
| Growth: rise | 396,515 |
| Growth: shallow_pullback | 10,928 |
| Growth: trend_breakout | 1,077,207 |

Doors and windows: D19, D21, D23, D24, E-2020, E-2022, E-2025, FULL, S0, S1, S2, S3, S4, S5, S6, S7, W-BEAR, W-CRASH, W-QUIET, W-TREND.

Option sets: all, base, blackout, cost0, cost10, cost20, d1only, fund, ggdx, gonly, native, nextopen, periods, rate14, slip25, tie, vgtonly, whole.


## The matrix

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
| Minute-mark change recording | PoolOptions recordMarks | — | `RECORD_MARKS` | refused (charts/slices diagnostics) |
| Funding lifecycles L1/L2, shadow-position eligibility | experimental study namespaces | — | `LIFECYCLE_L1_L2`, `SHADOW_ELIGIBILITY` | refused (outside the domain) |

## Data and numerics

| Item | Rule |
|---|---|
| Bars | the CPU loader's exact in-memory arrays (GB2 dataset v2, `src/gpu-backend/dataset.ts`); the CPU door's own daily signal bars; FULL's split adjustment included; no CSV parsing on the GPU |
| Refused datasets | an empty session, a non-positive or non-finite price, non-integer times, bars not one per session |
| Precision | binary64 only; `--fmad=false`, IEEE division/sqrt, `-ffp-contract=off`; JavaScript operation order; `Math.max/min` NaN/±0 semantics; V8 `log/exp` |
| Capacity | fixed per-candidate capacities raise explicit statuses; the pool re-evaluates such a candidate on the GPU with larger capacities |
| Errors | each CPU throw has a per-candidate status; loops have device-side bounds (`C_G_LOOP`) |
