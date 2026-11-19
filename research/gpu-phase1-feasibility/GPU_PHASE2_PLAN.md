# GPU acceleration Phase 2 — implementation and verification plan (proposed; not started)

Self-contained plan for the second assignment of the RTX 5090 initiative. It builds on the Phase 1 proof of concept
(`research/gpu-phase1-feasibility/`, branch `research/gpu-phase1-feasibility`) and **must not start without the user's
separate authorization**. Phase 1's verdict, evidence and limits are in `GPU_PHASE1_REPORT.md`; this plan does not
assume that Phase 1's partial parity proves anything about the parts it did not port.

**Guiding principle (unchanged): same strategy, same optimizer, same research decisions — potentially faster
execution.** The CPU engine remains the canonical reference; the GPU is an optional execution backend whose every
supported configuration must reproduce the CPU's records bit for bit, and whose unsupported configurations fall back to
the CPU or fail explicitly.

## 0. Starting point (from Phase 1)

| Phase 1 result | Value | Record |
|---|---|---|
| Verdict | **CONDITIONAL GO** | `GPU_PHASE1_REPORT.md` §1 |
| Parity of the slice (D1 books + RC 1/RC 2 + L0 pool; Growth supplied by the CPU) | bit-exact on 1,658 market-data subjects × ≥ 5 runs, 960 adversarial fixtures, New L0 and N/original full ledgers (hybrid), six execution stresses; 28/28 failure cases explicit | `GPU_CPU_PARITY.md` |
| Speed, Growth fixed (Assignment 2-shaped) | 4.7–5.9× the production CPU at batch 4,096 (≈ 2.4 GB VRAM), 6.9× at 8,192; kernel-only 7.5–15× | `GPU_BENCHMARKS.md` §4 |
| Speed, joint genome (Assignment 3-shaped), hybrid | **1.65–1.97× end to end** (CPU Growth is the bound) | `GPU_BENCHMARKS.md` §6.1 |
| Binding constraints | VRAM per candidate (≈ 575 KB in v1) with vLLM resident; per-thread latency (≈ 1.3 s per D24 book) → thousands of candidates per call needed; Growth on the CPU; the single-threaded record path (0.32 ms per candidate) | `GPU_BENCHMARKS.md` §5 |
| Code to build on | `src/gpu-phase1/` (client, dataset export, comparator, CPU reference pool), `src/gpu-phase1/cuda/` (interface v1, kernels, server), `tools/gpu-phase1/` (parity, fixtures, negative tests, benchmarks, tables, toolchain installer) | branch `research/gpu-phase1-feasibility` |
| Toolchain | CUDA 13.2.86 wheels in a user-space venv (`tools/gpu-phase1/install-toolchain.sh`); driver unchanged. **Add the full CUDA 13.2 runfile toolkit (user space) for compute-sanitizer and Nsight Compute** — the PyPI sanitizer could not instrument processes on Apollo | `GPU_PHASE1_REPORT.md` §11 |

## 1. Decisions the user must take before Phase 2 starts

| # | Decision | Why it matters | Phase 1 evidence |
|---|---|---|---|
| U1 | **VRAM policy:** keep vLLM (≈ 28 GB) resident and give GPU research ≈ 2.5 GB, or stop/limit vLLM during GPU research runs (user action, never automatic) | Batch size per GPU call is VRAM-bound in the current layout; occupancy and throughput rise with batch size | §5 of `GPU_BENCHMARKS.md` (scaling with batch size; ≈ 575 KB per candidate in the v1 layout) |
| U2 | **Scope of the GPU engine:** Growth port (needed for any large end-to-end gain on Assignment 3-style joint searches) versus D1 + pool only (useful when Growth is fixed or cached, as in Assignment 2-style studies) | Growth is 50–64% of a joint evaluation's CPU time; without it the end-to-end gain is bounded (Amdahl) | `GPU_BENCHMARKS.md` §2, §6 |
| U3 | **Maintenance acceptance:** a second, bit-exact implementation of the D1, RC and pool engines (and Growth, if U2) must change in lockstep with every future engine change, guarded by the parity suite | Feature drift is the main long-term risk | §9 below |
| U4 | Whether the deferred 40% / 25% / 25% risk-envelope pilot waits for Phase 2 or runs on the CPU | It is explicitly deferred; Phase 2 must not change its fitness, constraints, budgets, inputs or methodology | brief §9 |
| U5 | Display: keep the monitor on the RTX 5090 (Phase 1 found no kernel watchdog and no need to move it) | Long kernels share the GPU with the desktop compositor | `GPU_BENCHMARKS.md` §7 |

## 2. Architecture (the adaptation boundary)

- **CPU (unchanged):** genome decoding, Sobol/Latin screens, NSGA-II islands, neighbourhood generation (common random
  numbers), rung fitting, promotion, refinement, the SQLite archive and its keys, caches, random streams, sorting and tie
  breaks, risk gates, fitness, qualification, selection, folds, validation, reports. **No change to any rule.**
- **GPU (backend):** candidate evaluation only — the D1 virtual books with RC 1/RC 2 controls, the Growth virtual book
  (if U2), the one-slot L0 pool, and (optionally, §3.6) the compact record's reductions.
- **Boundary:** the existing evaluation call `evaluate(door, quad, controls, options) → SRec`
  (`src/vg-l0-risk-families/evaluate.ts`) and its job-level `Pool.run(tasks, onResult)` contract
  (`src/vg-l0-full-joint/workers.ts`). Phase 2 adds a `GpuPool` with the **same** `run(tasks, onResult)` API that
  accumulates tasks across lanes into device batches, evaluates them, and returns each record keyed by its task key —
  so the search, archive and barriers see exactly the CPU pool's contract.
- **Process model:** keep Phase 1's separate server process (framed IPC; a GPU fault can never corrupt the optimizer's
  state; the job checkpoints and resumes). Move bulk payloads from the pipe to shared memory (`/dev/shm`) when profiling
  shows the pipe matters (Phase 1: see `GPU_BENCHMARKS.md` §4 for the measured transfer/decode share).
- **Fallback:** any task whose features are not in the server's capability set is evaluated by the existing CPU workers
  in the same job (a hybrid pool), with the reason recorded; a server failure fails or checkpoints the job (no silent
  retry on the CPU with a different result path, no automatic restart loop — standard §6.4).

## 3. Work packages

### 3.1 Interface v2, backend selection and capability negotiation
- Protocol v2: versioned batch/result formats (Phase 1's v1 is the base), a capability handshake (`INFO` lists the
  feature bits, the engine-source digests the kernels were ported from, and the binary sha256).
- Backend option on every runner and CLI: `--backend cpu|gpu|auto` (default `cpu`, so existing commands are
  unchanged). `auto` = GPU iff the server answers, the capability set covers the study's options, and the start-up
  self-test (a pinned parity mini-set) passes; otherwise CPU, with the reason logged.
- **Capability negotiation:** the client computes each task's feature bits; any bit outside the server's set routes the
  task to the CPU (hybrid) or fails the job when the protocol declares the GPU mandatory. Never silently altered logic.

### 3.2 Memory-lean device layout (removes the VRAM ceiling)
- Replace fixed-capacity per-candidate trade and lot buffers (v1: ≈ 575 KB per candidate) by either
  (a) compact records (a D1 trade needs ≈ 128 B, not 280 B) in a per-batch arena with exact offsets, or preferably
  (b) a **fused streaming evaluator**: both D1 books and the pool advance together minute by minute in one thread, the
  pool consuming each book's decisions and fills as they occur, with O(1) state per candidate and the compact record's
  accumulators (ledger signature inputs, years, episodes, per-book stats) built incrementally.
- Target: ≥ 50,000 candidates per call within 2.5 GB (U1 = keep vLLM), so occupancy, not memory, limits throughput.
- Gate: identical records (G3) for every Phase 1 subject set; throughput measured against Phase 1's slice numbers.

### 3.3 Kernel efficiency
- Stage each session's bars (≤ 391 minutes × 5 doubles ≈ 15.6 KB) in shared memory per block: every thread of a block
  walks the same session, so loads are paid once per block instead of per thread from L2.
- Warp-cooperative exit scans (stop / buffer / protective triggers) with the CPU's first-hit semantics preserved.
- Register pressure (Phase 1: 178 registers in the D1 kernel) and occupancy tuning; profile with Nsight Compute
  (to be installed in user space like the Phase 1 toolchain).
- Every optimization re-runs the full parity suite; no precision change (binary64 only, `--fmad=false`).

### 3.4 The Growth engine on the GPU (if U2)
- Growth 1.4.0 is ≈ 8,500 lines of TypeScript (`src/growth-trading/`): Rise and breakout entries, five trend filters,
  five eligibility policies, the drawdown recovery gate (per-minute observations), trailing stop, maximum hold, intraday
  loss buffer, ATR initial stop, retention partial sales, four continuation methods, daily signal bars, stress handling.
- Port in **feature tranches**, each with its own bit-exact gate and capability bits (unported structures stay on the
  CPU through the hybrid pool):
  1. the structures of the frozen references (New L0: Rise, `time_limited` eligibility, drawdown gate, trailing stop,
     maximum hold, ATR initial stop, `classic_d1` continuation; N/original likewise) — the identities' full ledgers then
     reproduce **without** CPU Growth;
  2. the remaining structures in order of their share in Assignment 3's archives (measured from its sealed archives
     before porting);
  3. breakout entry, retention, the other continuation methods.
- Numerics to mirror exactly: percent conversions `Number(\`${p}e-2\`)` versus `1 + x/100` (computed on the host and
  passed as doubles), the 1e-12 relative tolerances of the Rise scan, naive O(L) SMA/ATR sums in their exact summation
  order, minute-of-day `Math.floor`.

### 3.5 Pool options for qualification and validation
- Period (reset) drawdowns (validation), detail mode (funding log, lot MAE/best marks: the detailed record and §5.9
  disclosures), blackouts (top-episode stress), later funding start, whole shares (report-only), explicit tie order
  (diagnostics), mark recording. Each as a capability bit with its own parity gate.

### 3.6 Record path
- Keep `recordOf` on the CPU (it is 0.5% of a CPU evaluation) unless the coordinator becomes the bottleneck at the new
  throughput; then move its reductions to the device with a bit-exact gate on the full `Rec` (Phase 1 measured the
  client's decode + record cost per candidate: `GPU_BENCHMARKS.md` §4).

### 3.7 Optimizer integration (no rule changes)
- `GpuPool` gathers tasks across lanes (A3 queues 4,096-task chunks; rung fitting, islands and refinement already issue
  batches of 16–128 neighbours per centre and populations of 32 per island; across 64–128 concurrent lanes that is
  thousands of tasks in flight). Extension and stopping decisions stay at barriers, so trajectories do not depend on
  completion order (Phase 1 G5: outputs independent of batch composition and order).
- Archive, keys, caches and code digests: the evaluation digest gains the GPU binary sha256, protocol version and
  capability set; records are byte-identical, and each archive row records its backend.

## 4. Verification and acceptance criteria (all must hold)

| # | Gate | Acceptance |
|---|---|---|
| V1 | Parity, every supported feature | bit-exact (zero tolerance) for every virtual trade, funded lot, fill, decision, mark-derived drawdown and the full record, on D19, D21, D23, D24, FULL and the regime windows, for ≥ 100,000 seeded random Assignment 3 genomes, every RC family / gate / activation, every Growth structure claimed, every stress option, and the adversarial fixture generator extended to Growth |
| V2 | Reference identities | New L0 and N/original: full ledgers, funding logs, every mark change and the sealed figures to the cent, **with Growth on the GPU** (if U2), on D24 and FULL; plus IJ1, C4, C4-refined and Assignment 3's finalists |
| V3 | Fixed-seed mini-optimization | a bounded Assignment 3-shaped job (e.g. one cutoff, 4 cells × 1 replicate at a reduced schedule) run twice, CPU backend and GPU backend, from the same seeds: identical proposal sequences, candidate IDs, evaluation records (hash per row), fitness, ranks, gates, promotions, extension decisions, refinement endpoints and finalists |
| V4 | Independent CPU verification | every shortlisted/qualified candidate and every borderline decision (a gate within $1 of its threshold; a rank or promotion decided by a margin within the record's rounding) re-evaluated on the CPU before it is sealed; any mismatch fails the job (**no silent promotion**) |
| V5 | Determinism | identical outputs across batch sizes, orders, process restarts, repeated runs and two CUDA driver sessions |
| V6 | Failure behaviour | Phase 1's G6 suite extended: VRAM pressure, a killed server mid-job (checkpoint and identical resume), a device trap, a worker death in the hybrid pool, malformed and unsupported inputs |
| V7 | Reliability | ≥ 24 h continuous GPU job at production batch sizes with no error, stable temperature/power, and bounded host memory |
| V8 | Strategy Lab regression | Strategy Lab's unit and e2e suites pass unchanged; its interactive simulator still uses the CPU engine; `state/strategy-lab/` untouched |
| V9 | Repository suite | the full `npm test` equals the pre-Phase-2 baseline plus the new tests (known pre-existing failures listed) |
| V10 | Performance | end-to-end throughput on an Assignment 3-shaped bounded job measured against the production CPU configuration (12 workers): **stop and report** if the Phase 2 target agreed with the user (e.g. ≥ 3× end-to-end) is not reached at a checkpoint (§6) |

## 5. Research-protocol integration
- The optimization standard is unchanged by a backend (records are identical); a study using the GPU backend declares it
  in its protocol and adoption manifest (backend, binary sha256, capability set), and its manifests and archives record
  the backend per evaluation, so GPU studies stay auditable.
- Frozen and completed studies are never re-run or re-hashed on the GPU.
- The deferred risk-envelope pilot runs only when the user chooses, with its fitness, constraints, budgets, inputs and
  methodology unchanged; the backend can change only its wall time.

## 6. Sequencing, dependencies and risk gates

Each step ends with a sealed record and a checkpoint; a failed gate stops the dependent steps and is reported (a
slower or narrower result is acceptable; an incorrect one is not).

| Step | Work | Depends on | Gate to continue | Rough effort |
|---|---|---|---|---|
| 2a.1 | Toolchain additions (full CUDA 13.2 toolkit in user space: compute-sanitizer, Nsight Compute); compute-sanitizer memcheck/initcheck clean on the Phase 1 kernels | — | sanitizer clean | small |
| 2a.2 | Interface v2, capability negotiation, `--backend cpu\|gpu\|auto` (default cpu) | 2a.1 | existing commands unchanged; unsupported features route to the CPU or fail | small–medium |
| 2a.3 | Memory-lean D1 + pool evaluator (§3.2), kernel efficiency (§3.3) | 2a.1 | V1 parity on every Phase 1 set; ≥ 20,000 candidates per call within 2.5 GB; measured throughput vs Phase 1 | medium |
| 2a.4 | Pool options needed by qualification and validation (§3.5); RC detail logs; the detailed record | 2a.3 | V1 for each option | medium |
| 2a.5 | `GpuPool` + hybrid fallback in the optimizer (§3.7), parallel record path if the coordinator binds | 2a.4 | V3 fixed-seed mini-optimization identical; V5, V6 | medium |
| **Checkpoint A** | **Hybrid production backend** (GPU D1 + pool, CPU Growth): Assignment 3-shaped studies ≈ 1.7–2×, Growth-fixed studies ≈ 5–7× | 2a.* | V1–V9 pass; the user decides whether to continue to 2b | — |
| 2b.1 | Growth tranche 1: the structures of New L0 and N/original (§3.4) | Checkpoint A, U2 | V1 bit-exact on those structures; V2 with Growth on the GPU; **measured Growth kernel cost per candidate**: continue only if the projected end-to-end speed-up on an Assignment 3-shaped job is ≥ the agreed target (e.g. 3×) | large |
| 2b.2 | Growth tranches 2–3 (remaining structures by archive share; breakout, retention, continuation methods) | 2b.1 | V1 per tranche; unported structures stay on the CPU | large |
| **Checkpoint B** | Full GPU evaluator for the supported structures; V1–V10 on a bounded Assignment 3-shaped job; the Phase 2 bundle (§8) | 2b.* | acceptance: all of §4 | — |

Dependencies outside the code: U1 (VRAM policy) before 2a.3 is sized; U2 (Growth port) before 2b; U3 (maintenance) before
Checkpoint A is adopted for production studies. Risks: Growth's divergent control flow and per-minute observations may
port at lower GPU efficiency than the D1 book (Phase 1's projection band, `GPU_BENCHMARKS.md` §6.2); engine changes during
Phase 2 (mitigated by mirrored-source digests, §9); VRAM contention with vLLM; the coordinator becoming the bottleneck at
high throughput.

## 7. Out of scope for Phase 2
- Changing any trading rule, optimizer rule, random stream, budget, gate or objective; FP32 or reduced-precision paths;
  approximate prices or reduced-resolution data; GPU use inside Strategy Lab; merging to `main` or deployment without
  separate authorization.

## 8. Deliverables (mandatory)
Phase 2 must end, like Phase 1, with a **self-contained implementation, parity, performance and original-conversation
handoff bundle**: `GPU_PHASE2_REPORT.md`, `GPU_PHASE2_PARITY.md`, `GPU_PHASE2_BENCHMARKS.md`, `GPU_PHASE2_HANDOFF.md`
(written for the original ChatGPT conversation), machine-readable metrics, and a ZIP with a manifest, plus the commit and
push of the research branch (no merge to `main`).

## 9. Maintenance model
- One engine change → one parity run: the CUDA port carries, per kernel, the sha256 of the TypeScript files it mirrors;
  the client refuses (capability bit off) when a mirrored file's digest changes until the port is updated and the parity
  suite re-passes.
- The parity suite (Phase 1's `tools/gpu-phase1/parity*.ts`, extended) runs in CI-like fashion before any GPU study.
- Unported or changed features always fall back to the CPU (never "approximately the same").
