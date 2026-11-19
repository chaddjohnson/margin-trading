# GPU acceleration Phase 1 — feasibility and proof of concept on Apollo's RTX 5090

Study `research/gpu-phase1-feasibility/` · branch `research/gpu-phase1-feasibility` · optimization standard 2.2.0
(scope diagnostic) · protocol frozen 2026-11-18T18:20:06Z (sha256 `17176116…`) · completed 2026-11-18.
Companion reports: `GPU_CPU_PARITY.md` (parity), `GPU_BENCHMARKS.md` (timings), `GPU_PHASE2_PLAN.md` (next phase),
`GPU_RESEARCH_HANDOFF.md` (handoff for the original conversation).

## 1. Verdict

**CONDITIONAL GO.**

- **Correctness: demonstrated for everything the POC claims.** The CUDA evaluator reproduces the canonical CPU engine
  **bit for bit** — every virtual trade, funded lot, fill, funding decision, mark-derived drawdown (with its instants),
  daily close and the full compact record — on 1,658 market-data subjects (D19, D24, FULL, four regime windows, six
  execution stresses), 960 adversarial synthetic subjects, and the full ledgers of **New L0 and N/original** (hybrid:
  Growth computed on the CPU). Zero tolerance was needed. Outputs are deterministic across batch sizes, repeats, process
  restarts and candidate order; 28/28 failure cases produce explicit errors.
- **Speed: real but conditional.** Where Growth is fixed (Assignment 2-shaped searches), the GPU slice is **4.7–5.9×
  the production 12-worker CPU** at the batch size today's free VRAM allows (4,096), **6.9× at 8,192**, kernel-only
  7.5–15×. For Assignment 3-shaped joint searches the measured end-to-end gain of the hybrid is **1.65–1.97×**, because
  the Growth engine — 50–64% of a joint evaluation — still runs on the CPU. The 3–5× aspiration is therefore met for
  Growth-fixed work and **not** met for joint searches without porting Growth.
- **Conditions for Phase 2** (details in `GPU_PHASE2_PLAN.md`): (1) a memory-lean device layout so batch size is not
  capped by VRAM (or the user's VRAM decision about vLLM); (2) GPU support for the pool options that qualification and
  validation use, and a batched GPU pool in the optimizer, proven by a fixed-seed mini-optimization that is identical on
  both backends; (3) **porting Growth in tranches with a hard go/no-go after the first tranche**, on its measured GPU
  cost — only that can lift joint searches beyond ≈ 2×; (4) independent CPU verification of shortlisted and borderline
  candidates; (5) acceptance of the maintenance cost of a second, parity-guarded engine.
- The POC is **research-only and not production-ready**; nothing was integrated into a runner or merged into `main`.

## 2. Executive summary

1. **Baseline.** One D24 evaluation of the current optimizer (Assignment 3) costs ≈ 87 ms on one CPU thread: Growth
   43.6 ms, D1 books 22.4 ms, pool 20.8 ms, record 0.45 ms. The production setting (12 workers) runs 92 joint
   evaluations/s (200/s when Growth is fixed and cached); throughput is saturated at the 8 physical cores. In
   Assignment 3's real 44-hour run, workers were 98.7% busy: evaluation is essentially the whole runtime.
2. **Suitability.** The work is chronological, branchy, binary64 state-machine logic per candidate, with ample
   parallelism across candidates. FP32 is unacceptable (it would move decision boundaries); the RTX 5090's weak FP64
   (≈ 1.6 TFLOP/s measured) does not matter because the kernels are latency-bound, not FLOP-bound. A wide batched
   evaluator in a separate server process was chosen; the CPU keeps all search logic.
3. **Environment.** CUDA 13.2 was installed in user space from NVIDIA's PyPI wheels (464 MB, pinned, removable by
   deleting one directory); no driver, apt, display, Docker or boot change; vLLM kept its 28 GB of VRAM, leaving
   ≈ 2.8 GB for this work.
4. **Proof of concept.** ≈ 1,570 lines of CUDA port the D1 books with all RC 1/RC 2 risk controls and the one-slot L0
   pool line for line; Growth trades come from the canonical CPU engine; records come from the canonical `recordOf`.
5. **Parity.** Bit-exact everywhere it was tested (G2–G5), explicit failures everywhere else (G6). The reference
   identities' full ledgers reproduce to the last bit of the drawdown double.
6. **Performance.** GPU kernel time per call is ≈ 2.6 s on D24 almost regardless of batch size (64 → 8,192), so
   throughput grows linearly with the candidates in flight, and VRAM — ≈ 575 KB per candidate in the v1 layout — is the
   binding limit. Measured: Growth-fixed 4.7–5.9× (batch 4,096), 6.9× (8,192); joint hybrid 1.65–1.97×; every GPU
   record hash-identical to the CPU's.
7. **Projection.** An Assignment 3-sized study (44.4 h today) would take ≈ 22.5–27 h with the hybrid as measured, and an
   extrapolated ≈ 4.5–8 h if Growth ports at the D1 book's measured GPU efficiency (≈ 10–13 h at half of it) — the
   latter unproven. An Assignment 2-sized study (31 h) would take ≈ 4.5–6.6 h.
8. **Recommendation.** Proceed to Phase 2 only as a gated programme: first the hybrid production backend
   (memory-lean D1 + pool, qualification options, batched optimizer pool, mini-optimization identity), then a Growth
   port whose first tranche must prove its GPU cost before the rest is built.

## 3. Context, isolation and what was not done

- **Authority:** the user's Phase 1 brief (`brief/BRIEF.md`, sha256 `5b95c198…`, read in full, 193 lines). Repository
  rules (`CLAUDE.md`, the context-recovery procedure), the optimization standard 2.2.0 (read in full and adopted with
  scope `diagnostic`, preflight PASS), the NL0 1.0.0 reference method and the latest optimizer's code (Assignment 3,
  `src/vg-l0-full-joint/`, evaluating through Assignment 2's path `src/vg-l0-risk-families/evaluate.ts` → RC 2's
  controlled D1 books `src/d1-risk-controls-rc2/` → Priority 3's Growth books, pool and record `src/vg-d1-growth-joint/`)
  were inspected before any change. Verified on Apollo: Ryzen 7 9800X3D (8C/16T), 64 GB, RTX 5090 32 GB, Ubuntu 26.04.1.
- **Isolation:** a dedicated branch `research/gpu-phase1-feasibility` created in the main checkout from
  `research/vg-l0-risk-metrics` (`6afbfe67`, clean tree). The brief preferred a worktree; the user's standing preference
  is no extra worktree folders, the branch started at the same commit (no file changed), and the git-ignored market data
  are read in place, read-only. All new code is in `src/gpu-phase1/` and `tools/gpu-phase1/`; all outputs in
  `research/gpu-phase1-feasibility/`. No file outside them was edited except `.gitignore` (three ignore lines for this
  study's build/cache directories).
- **Concurrent work and services:** no other research job, Strategy Lab server or session was running; vLLM (Docker,
  ≈ 28 GB VRAM), MongoDB and the desktop were left untouched. Doors were opened through Priority 3's loaders with its
  door log silenced and logged in this study's `results/doors.jsonl`; no sealed record of any study was written.
- **Not done (by the brief):** no wholesale port, no GPU backend in any research runner, no official optimization, no
  change to any strategy, optimizer rule, random stream, data adjustment or sealed artifact, no Strategy Lab change,
  **the deferred 40% marked-DD / 25% trade-principal-loss / 25% banked-capital-DD envelope pilot was not run**, no merge
  to `main`, no display/BIOS/driver/boot change.

## 4. Environment setup (what changed on Apollo)

| Item | State |
|---|---|
| NVIDIA driver | 595.91.07 (open kernel module), CUDA 13.2 driver API — **unchanged** |
| CUDA toolkit before | none installed (`nvcc` absent; Ubuntu's apt candidate is CUDA 12.4, which predates Blackwell's sm_120) |
| Installed | NVIDIA's CUDA 13.2 wheels from PyPI in a **user-space** uv venv `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv` (≈ 464 MB): nvidia-cuda-nvcc, -runtime, -crt, -nvrtc, -cccl 13.2.86, nvidia-nvvm 13.2.86 (pinned down from a floating 13.5.37), nvidia-cuda-sanitizer-api 13.2.87. Script: `tools/gpu-phase1/install-toolchain.sh` |
| Not changed | apt packages, `/usr/local`, PATH, the driver, Docker, vLLM, the display routing (monitor stays on the RTX 5090), BIOS, boot configuration; no reboot |
| Rollback | `rm -rf /home/chad/.local/share/margin-trading-gpu` (and the git-ignored `research/gpu-phase1-feasibility/{build,cache}`) |
| Proof the GPU computes | a smoke kernel built with nvcc 13.2 + gcc 15.2 for sm_120: FP64 FMA ≈ 1.6 TFLOP/s, FP32 ≈ 105–113 TFLOP/s; then the evaluator itself |
| Device facts that shaped the design | 170 SMs, 1,536 threads/SM, 65,536 registers/SM, 96 MiB L2, **no kernel watchdog**, ≈ 2.8 GiB VRAM free beside vLLM |

## 5. Baseline profiling (the CPU engine, unchanged)

See `GPU_BENCHMARKS.md` §2 for the tables. Key measured facts:

1. **One evaluation on D24 (development door, 2,264 sessions) costs ≈ 87 ms on one thread:** D1·GDX 12.4 ms, D1·VGT
   10.0 ms, **Growth·VGT 43.6 ms**, pool 20.8 ms, record 0.45 ms (82 subjects; median-of-3; composed record identical to
   `evaluate()`). Growth is 50–64% of the time; D1 books + pool 36–56%.
2. **Production throughput:** 12 workers (Assignment 3's setting) = **92.0 evaluations/s** on D24 (88.2 at 8, 90.3 at 14,
   90.4 at 16: saturated at the 8 physical cores), 194 on D19, 74.4 on FULL. 1 worker = 12.0/s.
3. **In a real optimization, evaluation is ≈ 98.7% of the runtime:** Assignment 3's sealed records (17.53 M fresh
   simulations, 40.4 h of search-job wall time) show its 12 workers 98.7% busy; candidate generation, GA, ranking,
   archive and IPC overlapped in the coordinator (≈ 1.3%). Rung-1 fitting is 79.8% of evaluation time.
4. **Memory and GC:** ≈ 0.65 GiB RSS per worker; 12 workers ≈ 8 GiB; GC negligible. Door loading 2–6 s per process.
5. **Numeric profile:** binary64 prices, P&L, interest and marks; comparisons and data-dependent branches dominate; one
   FP64 division per flat minute (the dip test) and one interest computation per held session; strictly sequential,
   order-dependent drawdown trackers over 0.5–1 M marks per evaluation.

## 6. GPU suitability and the architecture chosen

**Structure of the work.** Each candidate is a chronological state machine over ≈ 0.7–1.1 M minute bars per book, with
data-dependent branching (arming, trailing buy, stops, holds, buffers, controls, gate episodes) and order-dependent
accounting and drawdown trackers. Nothing inside one candidate can be parallelized without changing semantics; candidates
are independent. **Parallelism = candidates × books** (the two D1 books are independent; the pool depends on all books'
trades; Growth is independent of D1).

| Question | Finding |
|---|---|
| Candidate-level parallelism | Ample in the optimizer: rung fitting issues 16–128 neighbours per centre, islands 32 children per generation, and Assignment 3 ran 64–128 lanes concurrently. The GPU needs thousands of concurrent candidates (see §8). |
| Divergence | All threads walk the same (session, minute) loop, so bar reads are warp-broadcast; state-dependent work (exit scans once per held session, arming tests while flat) diverges but is bounded. |
| Variable-length outputs | Fixed per-candidate capacities with an explicit overflow error (never truncation), compacted on the device before the copy back. |
| Memory | The two-symbol dataset is ≈ 85 MB (FULL) — fits in VRAM and nearly in L2. The v1 output layout costs ≈ 575 KB per candidate (trade and lot buffers), which **with vLLM resident caps a batch at ≈ 4,000 candidates**. |
| FP64 vs FP32 | Prices of 10–600 need ≈ 9–10 significant digits to the cent; FP32 has ≈ 7 → decision boundaries (stop touches, equality ties at grid prices, the 1e-12-scale threshold tests) would move. **FP32 is rejected**; the POC is binary64 throughout. The RTX 5090's FP64 rate (1/64 of FP32, ≈ 1.6 TFLOP/s measured) is not the bottleneck: the work is branch- and latency-bound, not FLOP-bound. |
| Narrow kernel offload vs wide evaluator | Offloading single loops (e.g. reference highs, the mark loop) would ship per-candidate state across PCIe per step; rejected. A **wide batched evaluator** (whole books and pool per candidate on the device) is the only shape with a plausible gain. |
| Host interface | **Separate server process with framed binary IPC** (chosen): a GPU fault cannot take down the optimizer, no node-gyp/ABI coupling, explicit versioning; costs a pipe copy (measured, §8). Rejected for Phase 1: an N-API addon (a device fault kills the worker; build coupling), Python/CuPy/Numba (a third language, no gain), WebGPU/Vulkan compute (no FP64 in WGSL). |
| Maintenance | A second implementation must follow every engine change; mitigated by bit-exact parity suites, source digests per kernel and capability bits (`GPU_PHASE2_PLAN.md` §9). Porting Growth (≈ 8,500 lines) is the largest cost and risk. |

**Chosen architecture (the brief's preferred one):** the CPU keeps all genetic/search/control logic; a batch GPU backend
evaluates candidates; the CPU engine stays canonical and operational; Strategy Lab is untouched.

## 7. The proof of concept

- **Slice (declared in the frozen protocol before coding):** both D1 books with the complete D1 machines and RC 1/RC 2
  risk controls, and the one-slot L0 shared-capital pool with Priority 3's default options, i.e. D1·GDX and D1·VGT
  competing with Growth·VGT for the $100,000 slot. **Growth·VGT is computed by the canonical CPU engine and its virtual
  trades are supplied to the GPU pool** (a hybrid vertical slice). The compact record is built by the unchanged CPU
  `recordOf` from the GPU's pool result. Feature matrix: `GPU_CPU_PARITY.md` §2.
- **Code (research only):** `src/gpu-phase1/cuda/gp1.h` (versioned binary interface v1, struct sizes asserted on both
  sides), `gp1_device.cuh` + `gp1_kernels.cuh` (line-for-line ports of `runD1BookRc2` with its book/exit/gate classes
  and of `runPool`), `gp1.cu` (server: dataset load with checksum, batch validation, capability check, VRAM budget, kernel
  launches, compaction, timing); `src/gpu-phase1/gpu.ts` (Node client: process, framing, encoding of the CPU's exact
  doubles, decoding by candidate ID, rebuilding `VBook`/`PoolResult`, the canonical record); `dataset.ts` (the CPU
  loader's exact arrays → versioned file). ≈ 1,570 lines of CUDA (interface 176, device helpers 347, kernels 662, server 385) and ≈ 810 lines of client TypeScript (client 657, dataset export 96, comparator 56).
- **Interface guarantees:** one GPU thread per (candidate, book) and per candidate for the pool, no cross-candidate
  reduction or atomic; results keyed by candidate ID; per-candidate errors mirror every CPU throw; unknown or unsupported
  feature bits refuse the whole batch; VRAM is budgeted before any allocation.

## 8. Benchmarks

Full tables: `GPU_BENCHMARKS.md`. Every GPU record's hash was compared with the CPU record's hash: **0 mismatches**
(apart from 4 explicit capacity refusals in one stress configuration, verified against the CPU).

| Workload (door) | CPU, production 12 workers | GPU total (batch 4,096) | Speed-up total | GPU kernel-only | Speed-up kernel-only |
|---|---:|---:|---:|---:|---:|
| Growth fixed, median (D24) | 200.2 ev/s | 977.4 ev/s | **4.88×** | 1,557 ev/s | 7.78× |
| Growth fixed, median (D24, batch 8,192, 256-trade caps) | 202.6 | 1,394.6 | **6.88×** | 2,977 | 14.69× |
| Growth fixed, heavy D1 (D24) | 140.5 | 824.2 | **5.87×** | 1,377 | 9.80× |
| Growth fixed, median (FULL 2016–2026) | 166.3 | 812.6 | **4.89×** | 1,275 | 7.67× |
| Growth fixed, median (D19) | 450.3 | 2,120.6 | **4.71×** | 3,887 | 8.63× |
| Growth fixed, median (W-CRASH window) | 826.2 | 4,111.5 | **4.98×** | 12,349 | 14.95× |
| **Joint genome, hybrid end to end (D24)** | 93.9 | 154.6 | **1.65×** | — | — |
| Joint genome, hybrid, 14 workers (D24) | 94.3 | 157.0 | **1.67×** | — | — |
| Joint genome, heavy D1, hybrid (D24) | 76.6 | 151.1 | **1.97×** | — | — |

- "Total" includes encoding, the IPC pipe, host↔device copies, kernels, compaction, decoding, rebuilding the CPU objects
  and the canonical record; "kernel-only" is CUDA-event time of the D1 and pool kernels.
- Small batches lose to the CPU (batch 64: 0.13×; 256: 0.5×); break-even ≈ 600–700 candidates per call on D24.
- At batch 4,096, client-side decode + record is ≈ 32% of the GPU wall time; the pipe and copies ≈ 5%.
- Cold start ≈ 0.25 s (server, CUDA context, dataset export and upload) versus 4.4 s per CPU worker to parse a door.
- GPU power 119–133 W median (peak 195 W of 600 W), ≤ 53 °C: the device is far from saturated.

## 9. Projected study runtimes (from measured fractions)

From measured fractions (`GPU_BENCHMARKS.md` §6.2), not from theoretical TFLOPS:

| Scenario | Speed-up basis | Assignment 3-sized study (44 h 24 min today) | Assignment 2-sized study (31 h today) |
|---|---|---:|---:|
| Hybrid as measured (GPU D1 + pool, CPU Growth), today's VRAM | measured 1.65–1.97× (joint) / 4.7–5.9× (Growth fixed) | **≈ 22.5–27 h** | **≈ 5.3–6.6 h** |
| Hybrid with a memory-lean layout (batch 8,192) | measured 6.9× (Growth fixed); joint unchanged (CPU-Growth bound) | ≈ 22.5–27 h | ≈ 4.5 h |
| Growth also on the GPU, at the D1 book's measured GPU efficiency | **extrapolated** 5.7–6.4× (batch 4,096) to 8–10× (8,192, then the single-threaded record path binds) | ≈ 4.5–8 h | ≈ 4.5 h |
| Growth on the GPU at half that efficiency | extrapolated 3.5–4.5× | ≈ 10–13 h | ≈ 4.5 h |

Fixed costs (candidate generation, GA, archive, barriers) are ≈ 1.3% today and run concurrently; they stay small up to
the ≈ 3,000 evaluations/s where the coordinator's single-threaded record path would bind. **Is it worth it?** A hybrid
backend alone roughly halves joint searches and cuts Growth-fixed searches 5–7×, for moderate engineering on a slice that
already has bit-exact parity. The larger joint-search gain needs the Growth port, which is the dominant engineering
cost and risk and must earn its continuation at its first checkpoint.

## 10. Recommendation for Phase 2

**CONDITIONAL GO, gated** (full plan: `GPU_PHASE2_PLAN.md`):

1. **Phase 2a — hybrid production backend (lower risk):** memory-lean D1 + pool evaluator (≥ 20,000 candidates per call
   in 2.5 GB), pool options for qualification/validation, `--backend cpu|gpu|auto` with capability negotiation and CPU
   fallback, a batched `GpuPool` in the optimizer, full parity re-run, a fixed-seed mini-optimization identical on both
   backends, independent CPU verification of shortlisted/borderline candidates, Strategy Lab regression. Expected:
   joint searches ≈ 1.7–2×, Growth-fixed searches ≈ 5–7× (measured basis).
2. **Phase 2b — Growth on the GPU (the big step), only after Checkpoint A:** first tranche = the reference identities'
   Growth structures; **stop** if its measured GPU cost cannot deliver the agreed end-to-end target (e.g. ≥ 3×) on an
   Assignment 3-shaped job.
3. **User decisions first:** the VRAM policy for vLLM during GPU research (U1), whether to port Growth (U2), maintenance
   acceptance (U3), and whether the deferred risk-envelope pilot simply runs on the CPU now (≈ 0.6–1.3 h; U4).

Phase 2 must end with its own self-contained implementation, parity, performance and original-conversation handoff
bundle (`GPU_PHASE2_PLAN.md` §8).

## 11. Limitations (stated plainly)

1. **Partial coverage.** Only the D1 books (with RC 1/RC 2) and the L0 pool run on the GPU. **Growth is not ported**;
   full New L0 / N/original reproduction *with Growth on the GPU* is deferred to Phase 2. Pool options (period
   drawdowns, detail logs, blackouts, later funding start, whole shares, tie-order override, mark recording), RC event
   logs, the detailed record, the swing/breakeven D1 variants, L1/L2 lifecycles, shadow eligibility and the
   trading-session hold unit are not supported (explicit errors). **No full-feature-parity claim is made.**
2. **VRAM-capped batches.** With vLLM resident, batches were limited to 4,096 (8,192 with tighter capacities); the GPU
   was far from saturated, so the measured speed-ups are a floor for the approach at this co-tenancy, and the slope
   beyond 8,192 was not measured.
3. **No kernel optimization** beyond correctness (no shared-memory staging, register tuning or warp cooperation);
   per-thread latency (≈ 1.3 s per D24 book) dominates.
4. **No sanitizer evidence.** The PyPI `compute-sanitizer` 13.2.87 could not instrument any process on Apollo. Memory
   safety rests on bit-exact parity over 28,171 adversarial-fixture virtual trades and 1,658 market-data subjects and on the negative tests; an
   out-of-bounds read that never changes a result cannot be excluded until Phase 2 runs the full toolkit's sanitizer.
5. **Bounded orchestration, not the optimizer.** The hybrid test reproduces rung-1-shaped dispatch with the canonical
   Growth path and records; the Assignment 3 search itself (GA, archive, barriers) was not run on a GPU backend.
6. **Co-tenancy.** vLLM was idle during all runs; GPU performance under vLLM inference load was not measured.
7. **Coordinator.** The client's decode + canonical record is single-threaded (0.32 ms per candidate, ≈ 32% of the GPU
   wall time at batch 4,096) and would bind at ≈ 3,000 evaluations/s.
8. **Measurement gaps.** CPU energy was not measurable; the GPU server's own host RSS was not measured separately; the
   display's effect was observed (no watchdog, no issue noticed) but not instrumented.
9. **One host, one driver.** Determinism and parity were shown on this RTX 5090 with driver 595.91.07 and CUDA 13.2;
   other GPUs, drivers or compiler versions need the parity suite re-run.
10. **A client bug was found and fixed during benchmarking** (quadratic response buffering); its pre-fix record is kept
    in `results/s5/pre-fix/`, and every final record was re-run on the fixed build.
11. **Projections beyond measured scenarios are extrapolations** (Growth on the GPU), labelled as such.

## 12. Records, code and commits

| Kind | Path | Note |
|---|---|---|
| Protocol, adoption, freeze | `PROTOCOL.md` (sha256 `17176116…`), `STANDARD_ADOPTION.json`, `results/protocol-freeze.json` (sealed, 0444), `results/seals.jsonl`, `AMENDMENTS.md` (none) | frozen before any real-data run |
| CPU baseline | `results/s1/components.json`, `results/s1/cpu-pool-{D24,D19,FULL}.json` | |
| Parity | `results/s4/parity-*.json` (13 files, one build), `parity-fixtures.json`, `negative.json`; `first-pass/` (an earlier build, same outcomes) | each carries the binary and source sha256 |
| Benchmarks | `results/s5/*.json`, `slice-D24-median-8192-capacity-check.json`; `pre-fix/` | |
| Tables | `results/tables/*.csv`, `summary.json` | |
| Door log | `results/doors.jsonl` | every door opening of this study |
| Code | `src/gpu-phase1/` (incl. `cuda/`, `tests/`), `tools/gpu-phase1/` | research only; no other `src/` file edited |
| Build | `research/gpu-phase1-feasibility/build/gp1` (git-ignored) sha256 `b3bcccdbc87bd1a31f3a708e6f9870a7e23ea78a4305a7847f96e3d78a3d7051` | rebuild: `RUN_COMMANDS.md` |
| Tests | `npm test`: 1,680 tests, 1,669 pass, the 7 known pre-existing failures, 4 skipped (3 new tests, all passing, including a live GPU parity test) | log `results/logs/npm-test.log` (git-ignored) |
| Branch / commits | branch `research/gpu-phase1-feasibility` from `6afbfe67`; protocol commit `dcc70df7`; result commits in `GPU_RESEARCH_HANDOFF.md` §7 | not merged into `main` |
