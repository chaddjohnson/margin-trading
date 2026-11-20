# Claude Code — GPU Phase 4: Concurrency, Batching, Final Acceptance and Research Handoff

## Mission

GPU Phase 3 is complete: the accepted RTX 5090 evaluation engine is merged into `main`, reproduces the canonical CPU engine bit-for-bit on the tested scope, and accelerates a representative D1 + Growth joint search approximately **10×** versus the original CPU optimizer. The next assignment is a **short, controlled concurrency and batching investigation**, followed by any narrowly justified corrective work, final acceptance, and a portable handoff.

**The purpose is to learn how best to use Apollo's RTX 5090 for independent optimization jobs:** maximum single-study speed versus maximum combined throughput across two, three, or four jobs. Do not assume that spare VRAM means spare compute capacity. Do not assume multiple concurrent jobs will improve throughput.

**Non-negotiable scope boundary:** The risk-envelope pilot belongs exclusively to the **original Margin Trading ChatGPT conversation**, not this branched GPU conversation. **Do NOT create, implement, optimize, run, preflight, adopt, qualify, or modify the risk-envelope pilot**. Do not use this assignment to change any trading rule, candidate, risk gate, search objective, genome, optimizer algorithm, or research finding. Do not deploy anything or contact a broker.

The current work has already been merged; **perform another merge into `main` only if Phase 4 introduces changes that genuinely require integration**, and only after acceptance. Restore the original intended working branch afterward. Produce a final portable ZIP for the original conversation.

## 0 — Read and verify the accepted Phase 3 state

Before work, read `CLAUDE.md`, current `OPTIMIZATION_STANDARD.md` (including the GPU-only rules), `docs/gpu/PARITY_CHECKLIST.md`, the complete GPU Phase 3 source and handoff, especially:

- `research/gpu-phase3/GPU_ENGINE_FINAL_HANDOFF.md`
- `research/gpu-phase3/GPU_PERFORMANCE_BEFORE_AFTER.md`
- `research/gpu-phase3/GPU_FINAL_PARITY_AND_ACCEPTANCE.md`
- `research/gpu-phase3/GPU_ENFORCEMENT_INTEGRITY.md`
- `research/gpu-phase3/GPU_INTEGRATION_AND_OPERATIONS.md`
- `research/gpu-phase3/GPU_PILOT_READINESS.md`
- `config/gpu-backend/acceptance.json` and its independent-verifier tooling.

Verify from the actual repository and remote, not merely this prompt:

- The accepted Phase 3 binary and source provenance, including the reported binary SHA-256 `06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23`.
- The reported accepted record SHA-256 `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214`; compare to a copy **outside Git**, and never treat regenerating a record together with its in-repository check as an independent tamper-proof validation.
- `main` contains the accepted implementation and the restored branch (previously `research/gpu-phase2`) contains it too. Check HEAD, clean worktree, active worktrees, unrelated jobs and any concurrent modifications. Do not overwrite work from other sessions.
- Exact Phase 3 performance reference: 1.242714 million Assignment 3 C19 joint-search evaluations in approximately **582–584 s** versus the original CPU **5,900.8 s**, and about **5.9 GiB VRAM** / **4.8 GiB host RSS** at batch 8,192 with eight host workers. These are baselines to **verify**, not goals to force.
- GPU cores/server were unchanged from Phase 2; Phase 3's primary change was the deterministic host-worker pipeline. Preserve it unless the evidence justifies a change.

Work on a dedicated Phase 4 research branch for benchmark harnesses/reports. Keep the accepted baseline immutably identifiable. **No broad GPU port, kernel redesign, or automatic multi-job scheduler is authorized by this prompt.**

## 1 — Preflight resources and define a fair benchmark protocol

Create and freeze a concise benchmark plan **before observing performance results**. Record hardware, GPU/driver/toolkit, display use, GPU server architecture, free/used VRAM, active local models/services, CPU/RAM availability, clocks/power settings, host worker configuration, batch settings, source/data hashes, thermal conditions and the existing acceptance status.

Apollo has an RTX 5090 with **32 GB of VRAM** and a Ryzen 7 9800X3D with **8 CPU cores / 16 threads**. A single accepted optimizer has previously used roughly 6–8 GB of VRAM. **Do not infer that four independent jobs will fit or run efficiently based on this alone.** Check actual free memory before each level. Retain a conservative GPU-memory reserve for the compositor/driver and other running activity, and bound host memory/CPU worker counts.

Do not reboot Apollo, change its display connection, change drivers, stop shared vLLM/LLM or other services, or interfere with another optimization session without explicit authorization. If available capacity is insufficient, report the limitation rather than forcing OOM. All GPU jobs must use the accepted backend and fail closed, with no silent CPU evaluation.

Benchmark **representative, fixed and reproducible** workloads drawn from real, previously sealed evaluation/search behavior:

1. A **joint D1·VGT + D1·GDX + Growth·VGT** workload with mutable Growth, representative of Assignment 3.
2. A **Growth-fixed D1 shared-capital** workload, representative of Assignment 2.
3. Where useful, a brief large-door/detailed-risk stress case that resembles future risk-metric workloads.

Use the same datasets, genome populations, cost assumptions, available doors, and candidate evaluation semantics for comparisons. Benchmark replays may use pre-existing sealed vectors/seeds or benchmark-only jobs, but must not generate or claim new strategy research findings. Save benchmark outputs and caches in **unique per-job namespaces** with no shared-write collisions.

Two complementary benchmark designs are required:

- **Fixed-total-work comparison:** Hold the aggregate number of candidate evaluations constant, allocate it fairly across the test setup, and compare total elapsed time. Explain any unavoidable optimizer/rounding differences when dividing work into multiple jobs.
- **Steady-state aggregate-throughput comparison:** Run identical independent jobs simultaneously long enough to reach representative steady state. Report their **combined evaluations per second**, each individual job's rate, variability and elapsed time. Distinguish improved aggregate throughput from faster completion of one job.

Use warm-up, at least repeated short measurements for decisive configurations, and record any thermal/clock drift. Keep tests short—**minutes, not multi-hour endurance runs**—unless an actual failure warrants targeted additional diagnostics. Do not repeat the previous eight-hour endurance campaign.

## 2 — Test one, two, three and four independent jobs

Benchmark, in order, with safety checks between steps:

| Concurrent independent optimizations | Required outcome |
|---|---|
| **1** | Accepted Phase 3 optimized single-job baseline |
| **2** | Aggregate throughput, per-job slowdown, resource contention |
| **3** | Does throughput continue improving or plateau? |
| **4** | Only if memory and CPU safety checks pass; quantify diminishing returns |

For each configuration measure and persist:

- Aggregate candidate evaluations/s, per-job evaluations/s, equivalent-work wall time, warm-up and run lengths, repeat variation.
- Peak and steady GPU VRAM by process, free VRAM/headroom, GPU compute occupancy/utilization proxies, memory-bandwidth utilization when observable, GPU power, temperature and clock behavior.
- CPU process/worker utilization, overall CPU load, main-thread event-loop activity, peak host RSS, I/O and archive overhead.
- GPU server/kernels and transfers timing, queue/scheduling delays, batch sizes and outstanding requests, context-switch or serialization effects where measurable.
- Any errors, capacity retries, queue stalls, GPU driver issues, result-order anomalies or unintended resource interference.

Use NVIDIA profiling counters (Nsight Systems / Nsight Compute / DCGM) **if available and safe**, but do not invent hardware-utilization percentages if the counters are unavailable. Clearly separate the GPU's actual compute activity from the fraction of wall time attributed to GPU execution.

**CPU worker oversubscription matters:** eight workers per job may be appropriate for one study but wasteful with three or four concurrent studies. Compare a small, predeclared matrix of worker allocations (such as total workers approximately respecting the eight physical / sixteen logical CPU cores) and explain why the winning allocation works. Bound total threads, RAM and GPU memory. Ensure each job uses independent search and archival state, and that the resource controls cannot permit one job to corrupt another.

If concurrency yields no measurable aggregate benefit or makes results unstable, conclude **one job at a time**. If two jobs are best, do not recommend three or four merely because they fit in memory.

## 3 — Compare against improved single-job batching

A separate single-job batching/control test is required, because better batching can outperform concurrency without the complexity of running multiple optimizer processes.

- Verify the currently accepted default: **batch 8,192, eight host workers**, on the relevant joint workload.
- Compare a reasonable bounded set of **supported batch sizes**, such as 4,096 / 8,192 / 16,384, respecting available memory and source-version acceptance.
- Preserve candidate order and optimizer search semantics. A batch-size change may alter timing; it must not alter any trade record, rank, selection, or qualification result.
- Note Phase 3's previously observed result: increasing one joint job to 16,384 **reduced kernel time but increased full optimizer wall time**, apparently due to lane round-trip latency. Recheck only as needed in the concurrency context; don't assume larger is better.
- If a multi-tenant or shared-GPU queue seems advantageous, quantify its potential and describe a minimal architecture, but **do not implement a complex scheduler without separate authorization**.

Produce two practical recommendations, even if they happen to be identical:

**Mode S — Maximum single-optimization performance**: batch size, host workers, GPU memory budget, expected throughput and latency.

**Mode A — Maximum aggregate throughput**: optimal simultaneous job count, per-job batch sizes/workers, capacity limits, expected overall throughput, and effect on individual-job completion time.

Distinguish baseline measurements from projections. Avoid projecting a 2× aggregate improvement simply because two jobs run.

## 4 — Correctness, isolation and acceptance

Concurrency and batching must be **performance-only**. They must not change the canonical optimizer, searches, strategy engines, Growth/D1 features, RC1/RC2, pool funding, money math, stop precedence, interest, research risk metrics, or fitness/selection semantics.

- Compare deterministic output and complete candidate-record hashes against canonical CPU or accepted sealed reference records for each configuration. Validate not just net P&L, but trades/fills, funded decisions, drawdown, risk-envelope evidence, fitness, ranking and finalist identity where applicable.
- Validate deterministic proposals/seeds, batch ordering, optimizer promotions, checkpoint/restart behavior and archive isolation under concurrent operation.
- Test worker crashes, GPU service failures and memory/resource refusals **without deliberately endangering other jobs**. Fail closed; no silent fallback to CPU in official optimization.
- Benchmark-only diagnostic execution must be separately labeled and must not claim to be an official newly optimized strategy result.
- Inspect the known outstanding root TypeScript error in `src/gpu-backend/hostPipeline.ts:196` (`Cannot find name 'Transferable'`). **Resolve it cleanly and narrowly** if it is still present, without `any`, disabling checks or changing runtime behavior. This is engineering cleanup, not trading research. Because the file is pinned, renew acceptance after the final source change.
- Maintain the independent acceptance verifier and out-of-band acceptance hash check. If any pinned host/codec/enforcement source or binary changes, follow the full relevant versioned `docs/gpu/PARITY_CHECKLIST.md` process (parity, sanitizer as applicable, negative/tamper tests, fixed-seed mini-optimization, sealed-job replay, fresh acceptance record) **once on the final candidate**, with targeted tests during implementation. Do not demand an additional eight-hour test; use one bounded 30–60-minute reliability check where required by the approved current protocol.
- If the accepted engine is unchanged except for non-executable benchmark reports, verify that the existing acceptance remains valid; **do not regenerate or repin acceptance unnecessarily**.
- Keep the recorded acceptance source digests and enforcement-integrity protections intact; no change may weaken official GPU-only checks or the canonical CPU reference path. The Strategy Lab CPU simulation remains unchanged.

A measured speed advantage does not justify losing bit-exact parity, correctness, determinism, reproducibility, or full existing features. If a change produces consequential mismatches, revert it and retain the accepted Phase 3 implementation.

## 5 — Conditional final integration and branch restoration

The Phase 3 GPU implementation is **already merged and accepted in `main`**. Do not manufacture a second merge if Phase 4 makes no code changes.

If the optional TypeScript fix or any justified narrow performance code change is made:

1. Commit it on the dedicated Phase 4 research branch, preserve provenance and avoid unrelated working-tree changes.
2. Pass the full required **fresh final acceptance** on the changed source, benchmark for regressions and complete a focused source/integrity review.
3. Only then perform a **non-destructive merge to `main`**, respecting current remote history, outstanding branches, existing research pins, and the repository's review convention. Never force-push, rewrite history or update frozen research artifacts.
4. Verify the accepted binary, policy gate, checks and canonical Strategy Lab engine from the **merged `main`**.
5. Restore the intended pre-Phase-4 research working branch (verify which branch that actually is; Phase 3 reported `research/gpu-phase2`) and explicitly bring in the accepted `main` changes so that branch contains the final GPU engine. Confirm Git status is clean and that the remote reflects the result.

If benchmarks alone are created, preserve the report on its own research branch and integrate documentation/report changes according to the repository's normal review process only where appropriate. Clearly distinguish **new source merge**, **report-only integration**, and **no merge required**.

## 6 — Portable final handoff for the original ChatGPT conversation

Produce a self-contained ZIP suitable for review in the **original Margin Trading conversation**, with at least:

1. `GPU_CONCURRENCY_FINAL_HANDOFF.md` — concise summary, results, speed/throughput verdict, recommendation and exact outstanding decisions.
2. `GPU_CONCURRENCY_BENCHMARKS.md` — full 1/2/3/4-job and batching matrices, repetitions, wall time, aggregate and per-job evaluations/s, and utilization/VRAM/power/temperature figures with collection methods.
3. `GPU_CONCURRENCY_CORRECTNESS.md` — parity, deterministic ordering, isolation, failure, restart and test results.
4. `GPU_ACCEPTANCE_AND_MERGE.md` — old/new acceptance state, digest/integrity checks, relevant test outcome, all Git revisions, and whether a final merge actually occurred.
5. `GPU_OPERATING_RECOMMENDATIONS.md` — how to schedule future independent research jobs safely (without launching any), including optimal workers/batches/concurrency, headroom and fail-closed conditions.
6. Machine-readable `CSV`/`JSON` benchmark summaries, protocol, amendments, manifests, `CHECKSUMS.sha256` and portable reproducibility commands.

Provide the ZIP's **exact path on Apollo**, its SHA-256, the repository paths/commits, and a concise user-facing summary. Keep an independent copy of the acceptance SHA-256 outside the repository to the extent supported by the user's chosen workflow. Verify the handoff bundle hashes before delivery.

**Explicitly state: “Risk-envelope pilot NOT STARTED.”** Do not run pilot preflights, change its constraints, create its study branch/protocol, implement pilot-specific evaluation delivery, or invoke any of its optimizer commands. The earlier `GPU_PILOT_READINESS.md` identifies a separate, as-yet-unimplemented route to expose principal-loss and banked-capital envelopes to the official search. **That integration belongs exclusively to a later pilot assignment authorized from the original ChatGPT conversation.** This concurrency assignment must leave it untouched.

## Success criterion

A reliable, reproducible measurement of whether **2, 3 or 4 simultaneous GPU optimizations improve aggregate throughput over one optimized study**, a recommendation for best single-job and aggregate-throughput configurations, bit-exact correctness and resource isolation, clean handling of any justified code changes and final acceptance, and a complete portable handoff—**with no strategy changes and no risk-envelope pilot started**.
