# Phase 2 scope and feature matrix (gpu-phase2)

The scope of the GPU evaluator: **every feature the current official optimizer (Assignment 3,
`src/vg-l0-full-joint/`) and the deferred risk-envelope pilot can reach** — search, qualification, robustness,
stresses and validation — traced through its CPU source, its CUDA implementation, its capability bit and its parity
fixture. Phase 1's 43-item matrix (`research/gpu-phase1-feasibility/notes/feature-matrix.md`, a D1 + pool slice) was
the starting point; every one of its items maps to a row below. The maintained, durable copy of the matrix is
[docs/gpu/FEATURE_MATRIX.md](../../docs/gpu/FEATURE_MATRIX.md); the final evidence counts are in
[GPU_PHASE2_FEATURE_MATRIX.md](GPU_PHASE2_FEATURE_MATRIX.md).

## 1. Scope decisions

| Item | Decision |
|---|---|
| Authoritative engine | the TypeScript/CPU engine (unchanged); CUDA C++ mirrors it (no Python, no shared generated source) |
| Evaluation path covered | `vg-l0-risk-families/evaluate.ts` (A3's `evaluate` / `evaluateDetail`) → `d1-risk-controls-rc2/run.ts` → `vg-d1-growth-joint/{books,pool,evaluate}.ts` → `growth-trading/` (+ `entry-signals/`, `multi-etf-allocator/shadow.ts`, `shared-margin-portfolio/strategy.ts`); risk inputs `vg-l0-risk-metrics/{engine,metrics}.ts` — the 94-file import closure in the compatibility manifest |
| Phase 2a (D1/RC/allocator) | complete on the GPU: both D1 books with RC 1/RC 2 families A–D, both activations, the decline gate; the one-slot L0 pool with every `EvalOptions` field |
| Phase 2b (Growth 1.4.0) | **complete**: tranche 1 (references and their structures, timing) passed the tranche gate TR1 (measured ≈ 12× on large batches; see GPU_PHASE2_BENCHMARKS.md), tranches 2–3 (every structural and conditional variant) were implemented, and the strata of the parity campaign exercise every value of every structural gene |
| Hybrid (Growth on CPU) | never built as an official path; no CPU fallback exists anywhere in the official path |
| Records | the GPU produces the books and the pooled replay (GPU evidence); the canonical record (`recordOf`) and detailed record (`riskInputsOf`) are the UNCHANGED CPU reductions applied to that evidence in the client, so the fitness inputs are computed by the same code as on the CPU |
| Outside the domain | refused explicitly by capability bit (official runs reaching them are blocked): L1/L2 funding lifecycles, shadow-position eligibility, the trading-session hold unit (not on this branch), D1 swing / breakeven modes (not in the genome), Growth signal resolutions other than 1d, minute-mark recording (`recordMarks`) |

## 2. The reachable genome (A3; the pilot adds the risk inputs)

92 genes: 14 categorical + 78 ordinal (`src/vg-l0-full-joint/space.ts`). 64 portfolio cells (D1·GDX family/gate ×
D1·VGT family/gate) × activation genes × 8,640 Growth structures.

| Group | Genes and ranges (grid) | Conditional on |
|---|---|---|
| D1 books (×2 symbols) | X `targetPercentChange` 80–300 (tenths), Y `trailingBuyPercentage` 1–50, stop `trailingStopPercentage` 30–150, hold `maximumHoldDays` 3–30, L `tickWindowSize` 20–250, buffer `intradayLossBuffer` 0–60, P `pullback` 30–200, W `continuationWindow` 10–200 (integer grids) | hold and buffer inactive under family C |
| RC 2 controls (×2) | family A/B/C/D, gate off/on, activation next-session/entry-day; d 30–250 tenths, hx 6–60 days (≥ hold + 3), g 10–150 tenths, K 1–4, r 100–1000 tenths (step 10), c 5–250 sessions | d on B/C/D; hx, g on D; K, r, c with the gate on; activation on B/C/D |
| Growth·VGT structure (8) | entry {rise_from_recent_low, trend_breakout}; trend {off, price_change, regression_slope, rising_sma, higher_highs_lows, momentum}; elig {off, time_limited, minimum_strength, maximum_extension, deterioration, reset_renew}; gate {off, on}; exits {hold_off, hold_on_buffer_off, hold_on_buffer_on}; istop {off, on}; retain {off, on}; cont {off, classic_d1, breakout, shallow_pullback, ma_cross} — 8,640 structures | elig only with Rise |
| Growth·VGT numeric (50) | Rise 1–20 % / 10–250 bars; trailing stop 3–15 %; max hold 3–30 d; buffer 0–6 %; gate dip lookback 10–120, dip 2–15 %, retracement 30–100 %, confirmation 0–10; breakout SMA 10–200, slope comparison 5–120, prior high 5–120; ATR 5–60 × 1–5; retention sell 10–90 %, SMA 10–200, closes below 1–5; eligibility age 1–30, min advance 0–10 %, max extension 0.5–10 %, deterioration 0.5–10 %, reset 1–10 %, renewal 0.5–10 %; continuation window 10–200; trend price change 5–120 / −5–10 %, slope 5–120 / −5–10 %, SMA 10–200 / 1–30, structure 4–120 / 0–5 %, momentum 2–30, 20–250, −2–10 %, −15–10 %; classic pullback 3–20 %, rebound 0.2–5 %; breakout buffer 0–5 %, formation 1–20; shallow pullback SMA 10–200, slope 1–30, min rise 0–5 %, pullback 0.5–4 % / 5–15 %, recovery 0.25–5 %; MA cross SMA 10–200, rising 1–30, slope 0–2 %, margin 0–3 % (coarse and fine grids, `growth140-vgt-s8m/space.ts`) | each gene iff its structure uses it |
| Options used by the stages | V structure (Growth·GDX disabled); stresses cost 0/10/20 bps, interest 14 %, stop slippage +25 bps, next-open stops; removal reruns (`enabled`); fold/validation boundaries (period drawdowns); detailed record; blackouts, whole shares, funding start, tie order (report/stress options); native arming | — |
| Risk-envelope pilot (NL0-R 0.1.0) | banked-capital drawdown and maximum trade principal loss (marked and liquidation bases) from the pooled replay | the pilot's arms (35 % control; 40 / 25 / 25 % constraints) differ only in how these inputs are judged, not in what is evaluated |

The capability preflight derives the reachable features by **encoding every structure** under every option set
(`src/gpu-backend/domain.ts`): 8,640 Growth structures and 14 D1 book structures → 35 capability bits, all inside the
server's supported set (`policy.test.ts` asserts it).

## 3. Feature tracing

Fixture codes (the parity campaign, `chains/parity.sh`): **R** references; **A** seeded random A3 genomes; **G**
Growth-structure strata (every value of each structural gene); **B** branch-heavy D1 designs and box corners; **N**
neighbourhoods of R; **S** synthetic adversarial doors; **O-x** option set x; **W/E** regime windows and episodes;
**det** detailed record; **risk** risk-envelope inputs.

### 3.1 D1 books and RC controls

| Feature | CPU source | CUDA | Bit | Fixtures |
|---|---|---|---|---|
| Deep entry vs reference high of L sessions, completed minute | `shared-margin-portfolio/strategy.ts` EntryMachine; `four-family/data.ts` | `gb_d1.cuh` armingKind; server refHighKernel | D1_BOOK | R A B N S W/E |
| Trailing buy, rebound trigger (arming minute never buys) | EntryMachine.processBar | d1ProcessBar | D1_BOOK | R A B S |
| Fills: next minute open / closing print / next session's open | firstTradeAfterDecision | gb_common firstTradeAfterDecision | D1_BOOK | S (no closing print, holidays, missing minutes) |
| Arming start harmonized / native | `vg-d1-growth-joint/evaluate.ts` d1Arm | armStart | ARM_START | O-native, O-all |
| Post-exit continuation (W, P), flat-since-open | EntryMachine, ShadowBook | armingKind, d1Close, d1ProcessBar | D1_BOOK | R A B |
| Net-profit trailing stop, never lowered | ExitManager | exitEvaluate | D1_BOOK | all |
| Gap / open / low stop fills; `stop` and `next-open` | ExitManager.evaluate | exitEvaluate | NEXT_OPEN | O-nextopen, O-all, S |
| Calendar maximum hold (loss at the open; first trade ≥ open + 60 s) | ExitManager.evaluate | exitEvaluate | D1_BOOK | R A B |
| Buffered intraday loss, precedence, overnight carry | ExitManager.evaluate | exitEvaluate | D1_BOOK | B S |
| Costs per side, stop slippage, simple interest | ShadowBook, interestOn | d1Fill, d1Close, interestOn | SLIPPAGE | O-cost0/10/20, O-rate14, O-slip25 |
| RC 1 protective stop (next-session) and RC 2 entry-day activation | `d1-risk-controls/exit.ts`, `d1-risk-controls-rc2/` | protectiveTrigger, entryDayTrigger, riskEvaluate | RC_CONTROLS | R (C4, C4R, IJ1) A B N |
| Hold legacy / disabled / adaptive progress-extended | RiskExitManager.holdAt | riskEvaluate | RC_CONTROLS | A B (families A–D) |
| Prolonged-decline gate (episodes, K losses, block, recovery, expiry) | DeclineGate | gateOnExit, gateAfterClose | RC_CONTROLS | A B N |
| RC counters of the record | RcLite | GbBookOut counters | RC_CONTROLS | all (record hash) |

### 3.2 Growth 1.4.0 books

| Feature | CPU source (`growth-trading/`, `entry-signals/`) | CUDA (`gb_growth.cuh`) | Bit | Fixtures |
|---|---|---|---|---|
| Rise-from-recent-low (edge-triggered, rolling low, 1e-12 tolerance) | riseFromRecentLow.ts | gSessionDecision (sparse-table min) | G_RISE | R A G |
| Trend breakout (rising SMA over K, prior N-session high) | optionalRules scanTrendBreakout | gSessionDecision | G_BREAKOUT | A G |
| Five trend filters (price change, regression slope with V8 log/exp, rising SMA, HH/HL partial session, momentum) | entryGates TrendGate | trendPass + v8math.cuh | G_TREND_* | A G; V8 math 10 M inputs |
| Five eligibility policies + reset/renew watch | EntryGates | gValidity, gEvaluateOpportunity, gGatesEvaluate, gStepWatch | G_ELIG_* | A G |
| Drawdown Recovery Gate (open/reopen/minute/close observations, trough, recovery, confirmation, latched releases) | drawdownGate.ts | ddStep, ddCheck, gWake | G_DRAWDOWN_GATE | A G E-2020/2022 |
| Trailing stop, maximum hold, intraday buffer (net policy) | riseTrading exitParamsOf + ExitManager | gExitEvaluate | G_MAX_HOLD, G_BUFFER | all |
| ATR initial stop (decision-time availability, fill-minute activation) | PositionRules | gProtection, gAttach, gRulesOnFill | G_INITIAL_STOP | A G |
| Retention partial sale + remainder SMA exit | PositionRules | gPartialSale, gRulesAfterSession, gExitsAtRules | G_RETENTION | A G (partial fills counted) |
| Exit precedence of optional rules (stable sort) | evaluateSession | gEvaluateSession | G_INITIAL_STOP, G_RETENTION | A G |
| Continuation classic_d1 / breakout / shallow pullback / MA cross; base priority, veto, lifecycle, expiry | continuation.ts, ContinuationController | gClassicProcessBar, gContEvaluate, gBeforeBaseEntry, gContAfterExit, gContAfterSession | G_CONT_* | A G |
| Next-open stops where supported (`growthNextOpenSupported`) | evaluate.ts | encodeGrowth + gExitEvaluate | NEXT_OPEN | O-nextopen, O-all |
| Growth·GDX (disabled in V; supported) | books.ts | growthKernel book 0 | POOL_ENABLED | O-ggdx, O-all |

### 3.3 Pool, records, risk inputs

| Feature | CPU source | CUDA / host | Bit | Fixtures |
|---|---|---|---|---|
| One-slot L0 funding, refusals, reservation to the fill | `vg-d1-growth-joint/pool.ts` | gb_pool poolKernel | POOL | all |
| Tie order D1-first / Growth-first / explicit | tieOrderOf | cin.tie, cin.first | POOL_GROWTH_FIRST, POOL_TIE_ORDER | O-tie, D24-growth-first, O-all |
| Enabled books (V structure, removal reruns) | isEnabled | cin.present | POOL_ENABLED | O-d1only, O-gonly, O-vgtonly |
| Funding start, blackouts, whole shares | PoolOptions | decide, openLotNow | POOL_FUND_FROM, POOL_BLACKOUTS, POOL_WHOLE_SHARES | O-fund, O-blackout, O-whole |
| Period (fold/validation) drawdowns | PoolOptions boundaries | period trackers | POOL_PERIODS | O-periods, FULL-periods |
| Marks, strict trackers, daily closes, peaks | pool.ts | record, lotMark | POOL | all |
| Detail: funding log, lots' worst/best marks | PoolOptions detail | GbFunding, lotMark | POOL_DETAIL | det |
| Compact and detailed records | recordOf, riskInputsOf | unchanged CPU reductions of GPU evidence | — | all (record hash) |
| Banked-capital DD and trade principal loss (marked, liquidation) | `vg-l0-risk-metrics/{engine,metrics}.ts` | riskMark, riskPoint | RISK_METRICS | risk |

### 3.4 Data

| Item | Rule | Fixtures |
|---|---|---|
| Prices, times, sessions | the CPU loader's exact in-memory arrays (dataset v2), FULL's split adjustment, per-session New York offsets, the CPU's own daily signal bars | every door/window |
| Refused data | empty session, non-positive/non-finite price, non-integer or non-increasing times | negative tests |
| Adversarial | gaps, holidays, missing minutes, no closing print, threshold equalities | S0–S7 |

## 4. Tranche record

| Tranche | Content | Gate |
|---|---|---|
| 1 | New L0 and N/original structures, complete D24/FULL books and pooled records, measured Growth kernel cost | TR1: bit-exact references; ≈ 12× end-to-end at batch 16,384 on D24 (dev probe) vs the 12-worker CPU (≥ 3× required) → continue |
| 2 | prevalent conditional structures (eligibility, trend filters, recovery gate, exits) | strata + random genomes bit-exact |
| 3 | breakout, retention/partial fills, continuation methods, stress/diagnostic options | strata, option sets, fixtures bit-exact; no reachable feature unported |
