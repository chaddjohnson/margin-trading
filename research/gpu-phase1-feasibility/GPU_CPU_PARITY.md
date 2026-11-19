# GPU / CPU parity — GPU acceleration Phase 1 (RTX 5090 proof of concept)

Self-contained record of what the Phase 1 CUDA proof of concept (POC) covers, how it was compared with the canonical CPU
engine, and the result. Study: `research/gpu-phase1-feasibility/` on branch `research/gpu-phase1-feasibility` of the
margin-trading repository (Apollo). Records: `results/s4/*.json`; tables: `results/tables/s4_*.csv`.

## 1. Summary

| Gate | What is compared | Result |
|---|---|---|
| G2 — D1 books | every virtual trade of both D1 books (decision session/time/price, entry session/bar/time/raw/after-cost price, exit session/bar/time/raw/after-cost price/reason, open flag, virtual net and interest), signals, first decision, the standalone net/realized/minute-DD/daily-DD, the RC counters | **bit-exact for every subject on every door and option set** (1,658 market-data subjects, each evaluated in ≥ 5 GPU runs, + 960 adversarial fixture subjects) |
| G3 — pool and record | the whole `PoolResult` (every funded lot and fill, decisions/grants/refusals per book, refusal reasons, marks count, minute and session drawdowns with peak/trough/recovery instants, daily closes, principal/value/held book at every close, peaks, sessions held, net/realized/unrealized) and the canonical compact record built by the unchanged `recordOf` (ledger signature, years, episodes, per-book stats) plus the RC summary | **bit-exact for every subject** |
| G4 — reference identities | New L0 and N/original against their sealed values (`research/vg-l0-risk-metrics/results/baseline/parity.json`, sha256 `83e610b9…`) | **exact** on FULL and D24: net, DD, the unrounded DD double, lots, ledger signature, per-year P&L, realized and unrealized |
| G5 — determinism | GPU output hashes across batch sizes (1, 7, 13, 16, 32, 50, 64, 128, all), a repeat in the same process, a server restart and a shuffled candidate order | **0 mismatches** in every run |
| G6 — failure behaviour | 28 negative cases (malformed input, unsupported features, VRAM, capacity, device fault, killed process) | **28/28 explicit errors; no plausible-but-wrong output** |

**Tolerance: zero.** Doubles are compared by `Object.is` (identical IEEE-754 bit pattern for every finite value;
NaN = NaN; +0 ≠ −0), integers and strings exactly, objects with the same key order (`src/gpu-phase1/compare.ts`). No
numeric tolerance was needed or applied anywhere: there is **no floating-point discrepancy to report** on the covered
slice. A sensitivity check confirms the comparator detects a 1-ULP change and a ±0 change.

**Scope of the claim.** Parity is proven for the declared slice only (§2): the two D1 books with RC 1/RC 2 controls and
the one-slot L0 pool with default options. Growth·VGT is computed by the canonical CPU engine and its virtual trades are
supplied to the GPU pool; **the Growth engine is not ported** (Phase 2). This is not full feature parity.

## 2. Feature matrix (CPU baseline / POC covered / Phase 2 remaining)

Legend: **POC** = evaluated on the GPU and gated bit for bit. **CPU→POC** = computed by the canonical CPU engine and
consumed by the GPU pool. **Refused** = the GPU path returns an explicit "unsupported feature" error (never silently
altered logic). **Phase 2** = to be ported.

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

## 3. Inputs: identical bars, identical candidate vectors

- **Bars.** The GPU never parses CSV. `src/gpu-phase1/dataset.ts` writes the CPU loader's in-memory `Dataset` typed
  arrays (both symbols, every session and regular-session minute, FULL's 8:1 VGT forward split adjustment included)
  byte for byte into a versioned file (`GP1DSET1`, v1) with a word checksum verified by the server; a sidecar records
  the door, calendar, canonical data sha256 and file sha256. Doors are opened through Priority 3's loaders with its door
  log silenced (`quietLog`) and logged in this study's `results/doors.jsonl`.
- **Candidates.** Each D1 book's parameters are the CPU's own doubles (`d1StrategyParams`: X, Y, stop, hold, buffer, P as
  `grid ÷ 1000` computed once in JavaScript), integers for L and W, and the canonical RC 2 controls
  (`canonicalConfig2`, validated by `validateAgainstGrids2`). Friction (cost, rate, stop fill, slippage) and arming start
  are per batch. The candidate ID is its batch index; results are matched by ID, never by arrival order.
- **Growth.** Computed by Priority 3's `booksOf` (the canonical Growth path, its bounded cache) and supplied as external
  virtual trades (up to 4 fills each, partial sales included).

## 4. Subject sets and doors

| Set | Content | Size |
|---|---|---|
| R | New L0 (5B R01, quad `a2e385640ca61012`) and N/original (A3 `rc1-f1a8b57cb02455c3`), from sealed sha256-pinned records | 2 |
| A | uniform random genomes of Assignment 3's 92-gene layout (`decode`, coarse grid): every cell (D1 families A–D × gate), control and Growth structure occurs | 64 (D24, FULL, D19), 128 (windows), 32 (stress sets) |
| B | branch-heavy D1 designs: box corners (X 8%, Y 0.1%, stop 3%, hold 3 d, L 20, W 200 …) × every RC 2 family, gate and activation, tight and wide controls | 32 |
| N | Assignment 3's own 'joint' neighbourhoods of New L0 and N/original (as rung fitting draws them) | 2 × 16 (2 × 8 for stress sets) |
| S | seeded synthetic two-symbol doors (§6) × random D1 grids × every RC 2 family, gate and activation × 4 frictions | 960 |

| Door / window | Sessions | Bars GDX / VGT |
|---|---:|---|
| D19 (2016-01-04 → 2019-12-31) | 1,006 | 390,619 / 317,256 |
| D24 (development, → 2024-12-31) | 2,264 | 879,521 / 734,112 |
| FULL (→ 2026-10-30, split-adjusted) | 2,723 | 1,057,991 / 897,566 |
| W-QUIET 2017 (low volatility) | 251 | 97,517 / 78,041 |
| W-CRASH 2019-10 → 2020-12 (crash and recovery) | 317 | 122,845 / 111,003 |
| W-BEAR 2021-11 → 2023-03 (extended drawdown) | 356 | 138,478 / 118,429 |
| W-TREND 2023-01 → 2024-12 (strong trend) | 502 | 194,863 / 159,589 |

## 5. Results by door and option set

All records produced by one build: binary `research/gpu-phase1-feasibility/build/gp1` sha256 `b3bcccdbc87bd1a3…`, client `src/gpu-phase1/gpu.ts` `2f63ce37f927d99f…`, comparator `compare.ts` `572b0141…` (the full hashes are in each record's `build`).

| Door | Options | Subjects (R/A/B/N) | G2 | G3 | G4 | G5 runs (mismatches) | Max D1 trades GDX/VGT | Max lots | Result |
|---|---|---|---:|---:|---|---|---|---:|---|
| D19 | base | 130 (2/64/32/32) | 130/130 | 130/130 | n/a | batch 32; repeat (same process); server restart; shuffled order (0) | 128/41 | 136 | PASS |
| D24 | cost10 | 82 (2/32/32/16) | 82/82 | 82/82 | n/a | batch 16; repeat (same process); server restart; shuffled order (0) | 369/147 | 385 | PASS |
| D24 | cost20 | 82 (2/32/32/16) | 82/82 | 82/82 | n/a | batch 16; repeat (same process); server restart; shuffled order (0) | 367/146 | 383 | PASS |
| D24 | native | 82 (2/32/32/16) | 82/82 | 82/82 | n/a | batch 16; repeat (same process); server restart; shuffled order (0) | 300/149 | 315 | PASS |
| D24 | nextopen | 82 (2/32/32/16) | 82/82 | 82/82 | n/a | batch 16; repeat (same process); server restart; shuffled order (0) | 371/150 | 377 | PASS |
| D24 | rate14 | 82 (2/32/32/16) | 82/82 | 82/82 | n/a | batch 16; repeat (same process); server restart; shuffled order (0) | 370/150 | 387 | PASS |
| D24 | slip25 | 82 (2/32/32/16) | 82/82 | 82/82 | n/a | batch 16; repeat (same process); server restart; shuffled order (0) | 368/150 | 376 | PASS |
| D24 | base | 130 (2/64/32/32) | 130/130 | 130/130 | true | batch 1; batch 7; batch 64; repeat (same process); server restart; shuffled order (0) | 371/154 | 380 | PASS |
| FULL | base | 130 (2/64/32/32) | 130/130 | 130/130 | true | batch 13; batch 128; repeat (same process); server restart; shuffled order (0) | 463/192 | 446 | PASS |
| W-BEAR | base | 194 (2/128/32/32) | 194/194 | 194/194 | n/a | batch 50; repeat (same process); server restart; shuffled order (0) | 74/56 | 86 | PASS |
| W-CRASH | base | 194 (2/128/32/32) | 194/194 | 194/194 | n/a | batch 50; repeat (same process); server restart; shuffled order (0) | 57/27 | 57 | PASS |
| W-QUIET | base | 194 (2/128/32/32) | 194/194 | 194/194 | n/a | batch 50; repeat (same process); server restart; shuffled order (0) | 24/0 | 24 | PASS |
| W-TREND | base | 194 (2/128/32/32) | 194/194 | 194/194 | n/a | batch 50; repeat (same process); server restart; shuffled order (0) | 84/20 | 74 | PASS |

**Total: 13 records, 1,658 subjects, 1,658 / 1,658 G2 and G3, 0 G5 mismatches.**

Execution-stress option sets on D24 (the qualification stresses of standard §5.1, plus native arming): `cost10` and
`cost20` (10 / 20 bps per side), `rate14` (14% interest), `slip25` (25 bps stop slippage, protective fills included),
`nextopen` (stops fill at the next minute's open), `native` (D1 arming from 2017-06-15).

### 5.1 Reference identities (G4)

| Identity | Door | Net (sealed = GPU) | Max minute DD | Unrounded DD double | Lots | Ledger signature | Other checks |
|---|---|---:|---:|---|---:|---|---|
| New L0 | FULL | $479,605.18 | $20,385.99 | 20385.993844331068 | 46 | `7b17578108747911` | per-year P&L 2016–2026, realized $485,169.93, unrealized −$5,564.76; 79 funding decisions (A3's sealed ledger: 79) |
| N/original | FULL | $482,700.73 | $20,385.99 | 20385.993844331068 | 44 | `54d1c2e07c2dbbfd` | per-year P&L, realized $488,265.48, unrealized −$5,564.76; 72 decisions |
| New L0 | D24 | $382,721.46 | $19,459.83 | 19459.83052084368 | 34 | `0cef34136977805a` | — |
| N/original | D24 | $388,031.02 | $19,459.83 | 19459.83052084368 | 32 | `7de7605a1a7ab4e4` | — |

Every check equal (`results/s4/parity-FULL.json` and `parity-D24.json`, field `g4`).

The GPU path reproduces both identities' **full ledgers**: the funded-lot ledger signature covers every lot's book, entry
time, principal and fill times; the per-year P&L, realized and unrealized amounts and the unrounded maximum minute
drawdown double all equal the sealed values. Because Growth·VGT is computed on the CPU, this is a **hybrid** reproduction:
it proves the GPU D1 books and pool, not a GPU Growth engine.

## 6. Adversarial synthetic fixtures (set S)

Six seeded two-symbol doors of ≈ 60 sessions (`tools/gpu-phase1/parity-fixtures.ts`): weekdays with random holidays
removed (longer calendar gaps for hold age and interest), 1–24 minute bars per session on a coarse 0.25 price grid (exact
ties at stop levels, rebound triggers, arming and continuation thresholds), opening gaps up to ±12% (gaps through stops),
missing minutes, early closes, sessions without a closing print, single-bar sessions, both symbols printing at the same
instants (same-minute decisions of both D1 books: the tie order), D1-first and Growth-first orders, and Growth·VGT on in
one subject of five. 160 random subjects per door under four frictions (base, next-open, 25 bps slippage, 20 bps).

**Result: 960 / 960 subjects bit-exact (G2 and G3).** Edge paths exercised (CPU-side counts):

| Edge path (CPU-side count over the 960 subjects) | Count |
|---|---:|
| virtual trades | 28,171 |
| exit: trailing stop gap | 4,879 |
| exit: maximum hold | 4,364 |
| closing-print entry | 1,698 |
| exit: protective stop gap | 2,502 |
| exit: protective stop | 11,569 |
| exit on the entry session | 5,443 |
| exit: trailing stop | 3,525 |
| continuation entry | 1,497 |
| decline-gate blocks | 4,526 |
| blocked sessions | 10,574 |
| adaptive extensions | 3,503 |
| entry-day exits | 5,443 |
| pool refusals (slot occupied) | 8,413 |
| pool lots | 19,752 |
| position open at end | 855 |
| pool lot open at end | 603 |
| exit: buffered intraday loss | 460 |
| order carried overnight | 98 |
| order never filled (at end) | 17 |

## 7. Failure behaviour (G6)

**Result: 28 / 28 cases behave as required** (`results/s4/negative.json`). Capacity overflows fail only the overflowing candidates, explicitly, while every other candidate of the same batch stays bit-exact; batch-level errors return no results at all; a device trap kills the server after reporting and the client refuses further work.

| Case | Expected | Outcome | Pass |
|---|---|---|---|
| EVAL before any dataset is loaded | GpuError status 104 | GPU evaluator: no dataset: no dataset loaded | yes |
| LOAD of a missing file | GpuError status 107 | GPU evaluator: dataset check failed: cannot open dataset /home/chad/projects/margin-trading/research/gpu-phase1-feasibility/cache/does-not-exist.gp1ds | yes |
| LOAD of a dataset with one flipped bit | GpuError status 107 | GPU evaluator: dataset check failed: dataset checksum mismatch | yes |
| LOAD of a truncated dataset | GpuError status 102 | GPU evaluator: bad size: dataset size mismatch | yes |
| unknown request type | GpuError status 100 | GPU evaluator: bad frame: unknown request type | yes |
| batch with a bad magic | GpuError status 100 | GPU evaluator: bad frame: bad batch magic | yes |
| batch with protocol version 2 | GpuError status 101 | GPU evaluator: bad version: unsupported batch version 2 | yes |
| truncated batch | GpuError status 102 | GPU evaluator: bad size: batch size 1231 != 1232 | yes |
| batch declaring 0 candidates | GpuError status 102 | GPU evaluator: bad size: batch size 64 != 624 | yes |
| batch evaluating to another end session | GpuError status 103 | GPU evaluator: unsupported feature: v1 evaluates through the dataset's last session only | yes |
| external book range out of bounds | GpuError status 102 | GPU evaluator: bad size: external book range out of bounds | yes |
| pool option wholeShares | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x800 (supported 0xff) | yes |
| pool option blackouts | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x200 (supported 0xff) | yes |
| pool option period boundaries | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x400 (supported 0xff) | yes |
| pool option explicit tie order | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x1000 (supported 0xff) | yes |
| pool option later funding start | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x2000 (supported 0xff) | yes |
| Growth evaluated on the GPU (not in the slice) | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x100 (supported 0xff) | yes |
| an unknown feature bit | GpuError status 103 | GPU evaluator: unsupported feature: candidate 0 requests unsupported features 0x40000000 (supported 0xff) | yes |
| batch above the VRAM budget | GpuError status 105 | GPU evaluator: GPU memory: batch needs 6720 MiB > VRAM budget 2048 MiB | yes |
| batch above the free device memory (budget lifted) | GpuError status 105 | GPU evaluator: GPU memory: batch needs 6720 MiB; free 2849 MiB | yes |
| D1 trade capacity 3 | 9 candidates 'trade capacity' with no outputs; the other 3 bit-exact | 9 failed, 3 bit-exact, 0 wrong | yes |
| pool lot capacity 2 | 8 candidates 'lot capacity' with no outputs; the other 4 bit-exact | 8 failed, 4 bit-exact, 0 wrong | yes |
| external Growth book with a duplicated (unordered) decision | candidate 0 'external book unordered'; candidate 1 ok | external book unordered / ok | yes |
| fault injection without the opt-in flag | GpuError status 108 | GPU evaluator: fault injection refused: fault injection is disabled | yes |
| a device trap (__trap) during a kernel | GpuError status 106 | GPU evaluator: CUDA error: CUDA error cudaErrorLaunchFailure: unspecified launch failure at cudaDeviceSynchronize() | yes |
| a request after the sticky device error | the client refuses (server exited) | GPU evaluator exited (3): gp1: sticky CUDA error, exiting | yes |
| server killed during a batch | the pending batch rejects | GPU evaluator exited (SIGKILL) | yes |
| garbage on the request pipe | status 100 (bad frame), then the server exits | status 100, exit 0 | yes |

Also in the benchmarks: with 256-trade / 256-lot capacities at batch 8,192, 4 of 8,192 candidates were refused with `trade capacity` — their CPU D1·GDX books have 261–293 trades (`results/s5/slice-D24-median-8192-capacity-check.json`); all others matched the CPU record hash.

**Not achieved:** NVIDIA `compute-sanitizer` 13.2.87 (PyPI build) could not instrument any process on Apollo, even a trivial kernel ("Target application terminated before first instrumented API call"); no sanitizer evidence is claimed. Memory-safety checking with the full toolkit's sanitizer is a Phase 2 item.

## 8. Numerical method

- IEEE-754 binary64 for every price, level, P&L, interest, mark and time (Unix seconds as doubles, as on the CPU);
  integers for session/bar indices and counters. **No FP32 anywhere.**
- Built with `--fmad=false` (no fused multiply-add: JavaScript never fuses), `-prec-div=true -prec-sqrt=true`, no
  fast-math. Every expression keeps the CPU code's evaluation order (e.g. `investment × rate × ((t − t0) ÷ 31,536,000)`,
  `((shares × price) − principal) − interest`, `raw × (1 − d ÷ 1000)`).
- JavaScript `Math.max`/`Math.min` semantics (NaN propagation, +0 > −0) are reproduced (`jsmax`/`jsmin`).
- One mark-interest value is reused within a session for the same position: the CPU recomputes it with identical
  operands, so the double is the same (bit-identical by construction, confirmed by the marks and drawdown parity).
- The reference highs for every lookback 1–300 are precomputed on the device; a maximum of doubles involves no rounding.

## 9. Commands to reproduce

```bash
# toolchain (user space; see GPU_PHASE1_REPORT.md §3)
CU=/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv/lib/python3.14/site-packages/nvidia/cu13
$CU/bin/nvcc -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true \
  -o research/gpu-phase1-feasibility/build/gp1 src/gpu-phase1/cuda/gp1.cu
NODE="node --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
$NODE tools/gpu-phase1/parity.ts --door D24 --random 64 --neighbours 16 --batches 0,1,7,64 --out research/gpu-phase1-feasibility/results/s4/parity-D24.json
$NODE tools/gpu-phase1/parity.ts --door FULL --random 64 --neighbours 16 --batches 0,13,128 --out research/gpu-phase1-feasibility/results/s4/parity-FULL.json
$NODE tools/gpu-phase1/parity.ts --door W-CRASH --random 128 --neighbours 16 --batches 0,50 --out research/gpu-phase1-feasibility/results/s4/parity-W-CRASH.json
$NODE tools/gpu-phase1/parity.ts --door D24 --options nextopen --random 32 --neighbours 8 --batches 0,16 --out research/gpu-phase1-feasibility/results/s4/parity-D24-nextopen.json
$NODE tools/gpu-phase1/parity-fixtures.ts --doors 6 --subjects 160 --out research/gpu-phase1-feasibility/results/s4/parity-fixtures.json
$NODE tools/gpu-phase1/negative.ts --out research/gpu-phase1-feasibility/results/s4/negative.json
# the whole final chain (parity reruns, then benchmarks), contained in a systemd unit:
tools/gpu-phase1/launch.sh gpup1-final $PWD/research/gpu-phase1-feasibility/results/logs/final-chain.log -- /bin/bash research/gpu-phase1-feasibility/chains/final.sh
```

Every parity record carries the sha256 of the binary and of the CUDA and client sources it was produced with
(`build`). The first-pass records (an earlier binary differing only in the stack limit and optional series writes)
are kept in `results/s4/first-pass/` with identical outcomes.
