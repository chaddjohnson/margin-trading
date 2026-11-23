# SOURCE_MAP — evidence map (file, function / lines, revision, what it establishes)

- **Base revision for all code lines:** `48090c55b4f78fad9a17be3c0b647f5ec5d4d5dc`, the tip of
  `research/vg-l0-risk-envelope-stage-b-diagnostics` and the parent of this audit's branch
  `research/vg-l0-trailing-stop-audit`.
- **CPU closure files** hash to their pins in `config/gpu-backend/acceptance.json` (`bb0e3fcf…`, VERIFIED 2026-11-23 by
  `tools/gpu-backend/verify-acceptance.sh`). sha256 prefixes are given; full hashes are in VERIFICATION_REPORT.md.
- **Labels:** **V** current verified behaviour; **H** historical behaviour (another engine, or an unmerged branch);
  **A** an archived record; **P** proposed (only in the design documents).

## 1. Current canonical exit code (V)

| File (sha256 prefix) | Function / lines | Establishes |
|---|---|---|
| `src/shared-margin-portfolio/strategy.ts` (`04075592…`) | `ExitManager` 173–392: `onEntry` 196–214, `afterSession` 228–233, `isStopActive` 239–245, `evaluate` 247–391 (gap 290–293, carried sale 295–306, hold 308–313, minute scan 315–347, buffer 349–390) | the one trailing-stop implementation of D1 and Growth: level = H(1 − τ), session-high ratchet, net-profit eligibility re-decided each session, precedence |
| same | `firstTradeFrom` 111, `firstTradeAfterDecision` 125, `interestOn` 150 | fills (first trade at or after a decision, closing-print rule), simple interest from the entry session's midnight |
| same | `EntryMachine.continuationOpen` 490, `onExit` 624–631, `afterSession` 634+ | a net-profitable exit opens the continuation window at the raw exit price; the window's high and expiry |
| `src/multi-etf-allocator/shadow.ts` (`d37332e9…`) | `beginSession` 131–147, `processBar` 155–166 (the flat-since-session-start guard at 156), `open` 240–270, `close` 273–303, `afterSession` 306–313, `markAt` 333 | exits are decided only for a position open at the session start; costs inside fill prices; stop slippage on trailing-stop fills; no H update on the entry session |
| `src/d1-risk-controls/exit.ts` (`04a895b8…`) | `protectiveTrigger` 55–97, `RiskExitManager` 112–214 (`holdAt` 129–136, precedence 176–212) | RC 1 protective stop and hold policies; precedence against legacy exits |
| `src/d1-risk-controls/book.ts` (`db32f859…`) | `DeclineGate` 94+ (`onExit` 129), `holdRuntime` 230–241 (progressPrice = raw × (1 + g/1000)), `RiskShadowBook.open` 315–340, `close` 342–377 | the protective level from the raw fill; the adaptive-hold activation anchor; decline-gate episodes |
| `src/d1-risk-controls/config.ts` (`d6b8e055…`) | `limits` 42, `controlErrors` 72–120, `canonicalControls` 168, `maskInactive` 211, `riskId` 225, `riskEvalKey` 234 | versioned, canonical, legacy-preserving control serialization (the precedent for a staged control) |
| `src/d1-risk-controls-rc2/` (`afe10600…` exit, `b0e83522…` book, `fbcf8612…` config) | `entryDayTrigger` exit.ts 23–70; `RiskShadowBook2` book.ts 45+, the same-minute close book.ts 214; `canonicalConfig2` 156, `riskId2` 175, `riskEvalKey2` 184 | entry-day activation; RC 2 identity only when used |
| `src/growth-trading/riseTrading.ts` (`78b3423c…`) | header 1–60 (exit semantics), `EXECUTION` 185–190, `exitParamsOf` 271–301, `simulateTrading` 496+ (rules 539–542, fill and `onFill` 960–975) | Growth maps onto the D1 ExitManager (net policy; OFF = ∞); the optional-rules path is active when the initial stop or retention is ON |
| `src/growth-trading/optionalRules.ts` (`2c0438f4…`) | header 1–49 (ATR stop, retention, exit order), `RulesExitManager` 436–455, `PositionRules` 457+ (stop-fill check 482, `onFill` 556–642, `evaluateSession` 658–898, `partialSale` 899+) | Growth initial stop from the fill; retention consumes the trailing stop; the candidate order |
| `src/vg-d1-growth-joint/pool.ts` (`8f5f2ec0…`) | header 1–27, `runPool` 160+, `decide` 209–247 ("slot occupied" 221), `openLot` 283–328, `exitFill` 330+ | one slot; funding only at the decision; a lot inherits the virtual exits (scale invariance); same-instant order |
| `src/vg-d1-growth-joint/context.ts` (`6a3c58ed…`) | `economics` 28–36 | $100,000 notional, 5 bps, 11 %, stop fill at the level, 0 slippage, $35,000 ceiling |
| `src/vg-d1-growth-joint/books.ts` (`f7a6fb0c…`) | `baseFriction` 102, `D1Grid` / `d1Keys` 110–134 | D1 genes in tenths and days |
| `src/vg-d1-growth-joint/evaluate.ts` (`51fe8605…`) | `growthNextOpenSupported` 107, `evalKey` 57 | the next-open stress is not applicable to Growth with the optional rules; evaluation keys |
| `src/vg-l0-risk-families/evaluate.ts` (`3e14ddb6…`) | `evaluate` 43–49 (RcLite) | the canonical evaluation path and its control counters |
| `src/vg-l0-risk-families/space.ts` (`602dcbbd…`) | header 1–27 | how RC genes are searched (cells, repair "hx ≥ hold + 3", masking) |
| `src/multi-etf-d1/context.ts` (`c4070230…`) | `box` 72–140 | D1 τ domain 3.0–15.0 % ("tighter than one day of sector-ETF noise") |
| `src/growth140-vgt-s8m/space.ts` (`d801a7d2…`) | `numericGenes` 58–109 | Growth τ 3–15 % (step 0.5), hold 3–30 d, initial stop and retention genes |

## 2. GPU evaluator (V)

| File | Lines | Establishes |
|---|---|---|
| `src/gpu-backend/cuda/gb_d1.cuh` (`35b9129d…`) | `D1State` 13–30; `exitEvaluate` 45–138; `protectiveTrigger` 142–163; `entryDayTrigger` 165–185; `riskEvaluate` 202–259; fill and onEntry 372–387 (progressPrice 386); ratchet 541–546 | the CUDA duplicate of the D1 exits |
| `src/gpu-backend/cuda/gb_growth.cuh` (`99c0efd6…`) | struct `G` 45+; `gOnEntry` 147–157; `gClose` 182–196; `gStopActive` 198–203; `gExitEvaluate` 205+; `gEvaluateSession` 336+; ratchet 1314–1320 | the CUDA duplicate of the Growth exits |
| `src/gpu-backend/cuda/gb_pool.cuh` (`a29f03bd…`) | `poolKernel` 18+; `openLotNow` 133; `exitFill` 160; same-minute exits after a fill 287, 325 | the pool on the GPU |
| `src/gpu-backend/cuda/gb.h` (`9221ca21…`) | protocol v2 (14); `GbD1In` 168–172 (128 bytes); `GbGrowthIn` 174–187 (328 bytes); `GbCandIn` 189–201; `GbBookOut` 214–218 (`pad[2]`); static asserts 281–289 | the input layout a staged stop would extend |
| `src/gpu-backend/layout.ts` (`681359c9…`) | `FEATURE` 357–401 (bits 0–35, 48–54) | capability bits; free bits for new features |
| `src/gpu-backend/encode.ts` (`34a9c5c3…`), `domain.ts` (`16fe18f1…`) | `encodeGrowth` 86, `encodeD1` 227; domain features 28–148 | where new genes and bits would be encoded and reached |
| `docs/gpu/FEATURE_MATRIX.md` (`9f1646e8…`), `PARITY_CHECKLIST.md` (`06613c50…`), `README.md` (`f67f301e…`) | — | the feature map; the mandatory change procedure; operations (`--no-maglev`, jobs) |
| `config/gpu-backend/acceptance.json` (`bb0e3fcf…`) | status ACCEPTED, binary `cb2ff30b…`, device RTX 5090 `GPU-ae5f222c…`, source `999f299e` | the accepted evaluator on this branch chain (`main` keeps `3610caaf…`) |

## 3. Related functionality elsewhere (H)

| Location | Establishes |
|---|---|
| `src/d1-refinement/engine.ts` (`def619ec…`) header 1–33; `research/vgt-d1-refinement/TRAILING_STOP_MECHANISMS.md` (`fc234f6a…`) | stop-activation variants B-A gross, B-B breakeven, B-C two-stage protective → trailing, B-D always; none improved VGT D1; one distance throughout. **Not** on the canonical or GPU path |
| `src/app/allIn-trailingBuy-postExitContinuation-stopTwoStage.ts` | the runnable B-C file (early 10 % protective stop, then the trailing stop once its level reaches the entry) |
| `research/study3-vgt-momentum-stage1b/EXIT_OPTIMIZATION.md` (`e9325d50…`) §3; `research/study3-vgt-momentum-stage1c/MECHANISM_CATALOG.md` (`f631d032…`) rows XT, XRP | profit ratchet (Hc ≥ E(1 + g) → trail t2) and staged price retention, on a retired momentum engine: in-sample best, fold pick lost $28,223 in 2022 |
| branch `research/vg-l0-session-hold` (`src/shared-margin-portfolio/strategy.ts` there) | the `holdUnit = 'sessions'` option exists only on that unmerged branch (GPU: `SESSION_HOLD_UNIT` refused) |
| `main` (`3606f4b3`) | contains RC 1 / RC 2 and the GPU engine through Phase 6; not `src/risk-envelope/` (Phase 7) |

## 4. Archived records used (A)

| Record (sha256) | Used for |
|---|---|
| `research/vg-l0-full-joint/FROZEN_SELECTION.json` (`4080d4b1ca4db932…`) | New L0 (`newL0`) and N/original (`rc1-f1a8b57cb02455c3`) configurations |
| `research/vg-l0-full-joint/results/diagnostics/ledgers.json` (`1c94a6407b8df5a9…`) | FULL lot ledger of New L0: raw entry and exit prices, reasons, interest |
| `research/vg-l0-full-joint/REPORT.md` (`575911d2c062579e…`) §1, §7 | N/original's controls inert; Growth exit-structure findings |
| `research/vg-l0-risk-metrics/results/tables/trades.csv` (`ea799fa1b6e097a1…`) | per-lot peak profit, giveback, principal loss for New L0 and N/original (FULL) |
| `research/vg-l0-risk-metrics/results/tables/gaps-through-stop.csv` (`e3e02d9178fa5006…`) | stop levels and the beyond-level cost of fills below the level (9 New L0 lots, $10,918.91) |
| `research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md` (`2ace94b8…`), `CANDIDATE_RISK_AUDIT.md` (`9a733120…`) | definitions; New L0 / N/original DD = GB + PL per window |
| `research/vg-l0-risk-envelope-stage-b-diagnostics/GIVEBACK_REPORT.md` (`f223e677…`), `REPORT.md` (`7ac0ca7f…`), `DECISION_REGISTER.md` (`80e3244d…`), `results/analysis/TABLES.md` (`7b36cfd6…`) §B6–B8, `results/giveback/giveback-C24.json` (`40035f9f…`) | U/E/F decomposition, exit-reason giveback tables, the recommendation R4 |
| `research/vg-l0-risk-envelope-stage-b/REPORT.md` (`a4f45c89…`) §3, `PROTOCOL.md` (`603f2515…`), `READ_FIRST.md` (`61a7d5e4…`) | measured GPU throughput; the paired-lane design; resolution ≈ $10k |
| `research/gpu-phase7/PREREQUISITES_READY.md` (`967703ad…`) | Phase 7 acceptance and pilot-shaped throughput |
| `docs/research/methods/NEW_L0_METHOD.md` (`9b387bb4…`), `docs/research/OPTIMIZATION_STANDARD.md` 3.0.0 (`4e8244e6…`) | the method and standard read for the proposal |
| `docs/canonical-dataset-migration.md` (`d796c9e7…`) addendum | the VGT 8:1 split on 2026-04-21, forward-adjusted in FULL |
| `apps/strategy-lab/catalog/pooled-candidates.json` (`9166e00a…`), `runner/portfolio-catalog.ts` (`db456a4b…`) | New L0 is viewable (`l0-primary`); N/original is not; no RC controls in the viewer |

## 5. Distinguishing current, historical and proposed behaviour

| Behaviour | Status |
|---|---|
| Net-profit-activated single-distance trailing stop, session-high ratchet, next-session action | **current** (V) |
| RC 1 / RC 2 protective stops, adaptive / disabled holds, decline gate | **current**, on `main` and this branch (V) |
| Growth initial stop, retention, continuation | **current** (V) |
| Gross / breakeven / two-stage / always activation variants | **historical**, non-canonical engine (H) |
| Profit ratchet / retention exits | **historical**, retired Study 3 engine (H) |
| Trading-session hold unit | **unmerged branch only** (H) |
| Profit-activated tightening (S1), ladder (S2), retained-profit floor (S3) | **proposed** (P), not implemented |
