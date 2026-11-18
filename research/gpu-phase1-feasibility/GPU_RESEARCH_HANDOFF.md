# Handoff for the original Margin Trading conversation — GPU acceleration Phase 1 (RTX 5090)

Written to stand alone: it assumes no access to Apollo or to the Claude Code session that did the work. Everything
here is backed by records in `research/gpu-phase1-feasibility/` on branch `research/gpu-phase1-feasibility`
(repository `margin-trading`); details in `GPU_PHASE1_REPORT.md`, `GPU_CPU_PARITY.md`, `GPU_BENCHMARKS.md`,
`GPU_PHASE2_PLAN.md`.

## 1. Bottom line

- **Verdict: CONDITIONAL GO** for a Phase 2, which has **not** started and needs the user's authorization.
- **Accuracy:** on the part ported to the GPU (both D1 books with all RC 1/RC 2 risk controls, and the one-slot L0
  shared-capital pool), the GPU reproduces the canonical CPU engine **bit for bit** — trades, funded lots, funding
  decisions, drawdowns and the full search record — including the full ledgers of New L0 and N/original. No tolerance
  was needed; no discrepancy exists to explain.
- **Speed (measured against the production CPU setting, 12 workers, on the same candidates, same records):**
  - Growth fixed (Assignment 2-shaped searches): **4.7–5.9×** at the batch size today's free VRAM allows, **6.9×** at a
    larger batch; kernel-only 7.5–15×.
  - Joint genome (Assignment 3-shaped searches): **1.65–1.97× end to end**, because Growth (50–64% of the work) is not
    on the GPU yet.
- **What would make Phase 2 worthwhile:** a memory-lean layout so batches are not VRAM-capped, GPU support for the
  options qualification uses, integration into the optimizer with proof that a fixed-seed mini-optimization is identical
  on both backends, and — for big gains on joint searches — a Growth port, gated on the measured cost of its first
  tranche.

## 2. What was built and tested

- A research-only CUDA evaluator (`src/gpu-phase1/cuda/`, ≈ 1,570 lines) that runs, on the RTX 5090, a line-for-line
  port of the **D1 virtual books with the RC 1/RC 2 risk controls** (protective stop next-session and entry-day, hold
  legacy/disabled/adaptive, prolonged-decline gate) and of the **one-slot L0 shared-capital pool** (Priority 3's
  `runPool`, default options). It is a separate server process driven by a Node client (`src/gpu-phase1/gpu.ts`)
  through a versioned binary interface; the CPU engine is untouched and stays the reference.
- **Growth·VGT is not on the GPU:** the canonical CPU engine computes it and the GPU pool consumes its virtual trades.
- The compact record is computed by the unchanged CPU `recordOf` from the GPU's pool result, so search records are the
  CPU's records.

## 3. Accuracy (decisive for any further step)

| Evidence | Result |
|---|---|
| Market-data subjects (D19, D24, FULL 2016–2026, quiet / crash / bear / trend windows, six execution stresses: 10 and 20 bps, 14% interest, 25 bps stop slippage, next-open stops, native arming) | **1,658 / 1,658 bit-exact** for the D1 books (every virtual trade field), the pool (every lot, fill, decision, mark-derived drawdown and instant, daily close) and the canonical record |
| Adversarial synthetic doors (gaps through stops, exact ties, missing minutes, early closes, missing closing prints, holidays, same-minute decisions, positions open at the end; 28,171 virtual trades) | **960 / 960 bit-exact** |
| New L0 on FULL | net $479,605.18, DD $20,385.99 (unrounded 20385.993844331068), 46 lots, signature `7b17578108747911`, every year's P&L — **all equal to the sealed record** |
| N/original on FULL | net $482,700.73, DD $20,385.99, 44 lots, signature `54d1c2e07c2dbbfd` — **equal** |
| Both on D24 (development) | New L0 $382,721.46 / 34 lots / `0cef34136977805a`; N/original $388,031.02 / 32 lots / `7de7605a1a7ab4e4` — **equal** |
| Determinism | identical across batch sizes 1–8,192, repeats, restarts, shuffled order |
| Failure behaviour | 28 / 28 explicit errors (malformed input, unsupported features, VRAM, capacity, device fault, killed process); never plausible-but-wrong output |
| Not shown | compute-sanitizer memory checking (the PyPI tool could not instrument processes on Apollo) — a Phase 2 item |

Precision: IEEE-754 binary64 everywhere, no fused multiply-add, the CPU's operation order; FP32 was rejected because it
would move trading decision boundaries.

## 4. Speed

| Workload | CPU (12 workers) | GPU / hybrid | Speed-up |
|---|---:|---:|---:|
| Growth fixed, D24, batch 4,096 | 200.2 ev/s | 977.4 ev/s | 4.88× (kernel-only 7.78×) |
| Growth fixed, D24, batch 8,192 | 202.6 | 1,394.6 | 6.88× (kernel-only 14.69×) |
| Growth fixed, FULL / D19 / crash window, batch 4,096 | 166.3 / 450.3 / 826.2 | 812.6 / 2,120.6 / 4,111.5 | 4.89× / 4.71× / 4.98× |
| Growth fixed, heavy D1 books, D24 | 140.5 | 824.2 | 5.87× |
| **Joint genome, hybrid end to end, D24** | 93.9 / 94.3 (14 workers) / 76.6 (heavy) | 154.6 / 157.0 / 151.1 | **1.65× / 1.67× / 1.97×** |

- GPU totals include encoding, IPC, copies, kernels, decoding and the canonical record; all GPU records equalled the CPU's.
- The GPU needs thousands of candidates per call (break-even ≈ 600–700 on D24); its kernel time per call is ≈ 2.6 s
  almost regardless of batch size, so throughput is limited by how many candidates fit in the ≈ 2.8 GB of VRAM that
  vLLM leaves free.
- Whole-study projection (measured fractions): an Assignment 3-sized study (44.4 h) → ≈ 22.5–27 h with the hybrid;
  ≈ 4.5–8 h **only if** Growth is ported at the D1 book's measured GPU efficiency (an extrapolation); an Assignment
  2-sized study (31 h) → ≈ 4.5–6.6 h.

## 5. Exactly what is covered and what is not

| Covered on the GPU (bit-exact) | Supplied by the CPU engine | Not supported (explicit error) / Phase 2 |
|---|---|---|
| D1 deep entry, reference highs, trailing buy, fills (minute open / closing print / carried overnight), harmonized and native arming, continuation; net-profit trailing stop (gap, open-through, low touch; `stop` and `next-open` fills), maximum hold (calendar days), buffered intraday loss with overnight carry; costs, slippage, interest; standalone figures; end-of-data marking | Growth·VGT's virtual trades (all Growth 1.4.0 rules), including partial (retention) fills | **Growth engine on the GPU** (Phase 2, the main work) |
| RC 1/RC 2: protective stop (next-session, entry-day), hold legacy/disabled/adaptive, precedence rules, protective slippage, prolonged-decline gate and its counters | the compact record (`recordOf`) and RC summary, computed from GPU outputs | pool options: period (reset) drawdowns, detail mode (funding log, lot MAE), blackouts, later funding start, whole shares, explicit tie order, mark recording |
| L0 one-slot pool: decisions and tie order (D1-first and Growth-first), reservations, fills, partial exits, lot accounting, minute and session marks, both drawdown trackers with their instants, daily closes, per-close principal/value/held, peaks, decision and refusal counts | all search logic (unchanged, CPU) | RC event logs and per-trade RC rows; the detailed record; swing / breakeven D1 variants; L1/L2 lifecycles; shadow eligibility; the trading-session hold unit |
| execution stresses: 10/20 bps, 14% interest, 25 bps stop slippage, next-open stops | | |

**Not claimed:** full feature parity, a GPU Growth engine, GPU support for qualification/validation pool options, or a
GPU-capable optimizer. **Full New L0 / N/original reproduction with Growth on the GPU is deferred to Phase 2**; their full
ledgers were reproduced exactly through the hybrid path (GPU D1 + pool, CPU Growth).

## 6. Decisions needed from the user

1. **Authorize Phase 2 or not**, and in which form: (a) Phase 2a only — the hybrid production backend (≈ 1.7–2× on joint
   searches, ≈ 5–7× on Growth-fixed searches); (b) Phase 2a then a gated Growth port (Phase 2b), stopping if its first
   tranche cannot deliver the agreed end-to-end target (for example ≥ 3×); (c) stop here.
2. **VRAM policy:** keep vLLM resident (≈ 2.8 GB for research; smaller batches) or stop/limit it during GPU research
   runs (a user action; never automatic).
3. **Maintenance:** accept a second, parity-guarded implementation of the D1/RC/pool (and possibly Growth) engines that
   must follow every future engine change.
4. **The deferred 40% marked-DD / 25% trade-principal-loss / 25% banked-capital-DD envelope pilot:** it was **not run**.
   Its estimated ≈ 0.3–0.5 M simulations take ≈ 0.6–1.3 h on today's CPU, so it does not need to wait for the GPU unless
   the user prefers that; its fitness, constraints, budgets, inputs and methodology stay unchanged either way.
5. Display: no change needed (no kernel watchdog; the monitor stays on the RTX 5090).

## 7. State of the project and identifiers

| Item | Value |
|---|---|
| Repository / branch | `margin-trading`, branch **`research/gpu-phase1-feasibility`** (pushed to `origin`; **not merged into `main`**) |
| Base | `6afbfe67af63ced8b93958c5130d00d7a65aebc2` (tip of `research/vg-l0-risk-metrics`) |
| Commits | `dcc70df7` brief, frozen protocol, standard adoption · **`9eb921ae92c5ab294eee2509d3b6e37a6119d616`** code, records, reports · a final commit adds this section and the report bundle (its ID is printed in the session's final summary and recorded in `RESEARCH_RECOVERY.md`) |
| Study directory | `research/gpu-phase1-feasibility/` (reports, protocol, records `results/`, tables `results/tables/`) |
| Code | `src/gpu-phase1/` (Node client, dataset export, comparator, CPU reference pool, tests), `src/gpu-phase1/cuda/` (CUDA evaluator, interface v1), `tools/gpu-phase1/` (profiling, parity, fixtures, negative tests, benchmarks, tables, containment launcher, toolchain installer) |
| Evaluator build | `research/gpu-phase1-feasibility/build/gp1`, sha256 `b3bcccdbc87bd1a31f3a708e6f9870a7e23ea78a4305a7847f96e3d78a3d7051` (git-ignored; rebuild with `RUN_COMMANDS.md`) |
| Report bundle | `research/gpu-phase1-feasibility/bundle/gpu-phase1-report-bundle.zip` (+ `MANIFEST.json` inside and beside it) |
| Apollo changes | user-space CUDA 13.2 toolchain at `/home/chad/.local/share/margin-trading-gpu/` (464 MB; remove that directory to roll back); nothing else (driver, apt, display, Docker, vLLM, boot unchanged); no process left running |
| Test suite | `npm test`: 1,680 tests, 1,669 pass, the 7 known pre-existing failures, 4 skipped |
| Optimization standard / method | standard 2.2.0 adopted with scope `diagnostic` (preflight PASS); no reference method reproduced |
| Not done | no optimization, no runner integration, no Strategy Lab change, no risk-envelope pilot, no merge, no deployment |
