# Claude Code — Apollo RTX 5090 GPU Acceleration, Phase 1: Feasibility and Proof of Concept

## Mission

Investigate whether we can **substantially accelerate the existing `ai-trading` research optimizer on Apollo's NVIDIA RTX 5090**, while preserving the optimizer's algorithms, complete trading semantics, research standards, reproducibility, and Strategy Lab functionality.

**This is Phase 1 of a two-assignment initiative.** Phase 1 must profile the CPU implementation, prepare the GPU development environment, design the least-invasive architecture, implement a representative real-workload GPU proof of concept, validate it rigorously against the CPU engine, and measure realistic acceleration. It must conclude with a documented **go/no-go recommendation** and a detailed Phase 2 implementation plan.

**Do not undertake a wholesale GPU port, integrate a GPU backend into the canonical research pipeline, or run official optimizations during Phase 1.** Phase 2 will be separately authorized only after we review your evidence.

The user explicitly permits installation of the necessary development dependencies on Apollo, but does **not** authorize changes that could damage existing research, operating-system availability, or the existing CPU environment. Leave the monitor connected to the RTX 5090 for now. Do not move the display to the AMD iGPU unless measurement demonstrates a compelling benefit and the user explicitly approves the change.

At completion, provide a **portable report bundle** that can be uploaded to a different ChatGPT conversation for independent review. The reports must stand on their own without requiring access to this conversation.

## 0. Establish authoritative project context and isolation

First inspect `CLAUDE.md`, all applicable repository instructions, `OPTIMIZATION_STANDARD.md`, the versioned New L0 methodology, the latest D1/Growth/allocator optimizer documentation, and the actual source code. Verify paths and versions rather than assuming they match older documentation.

Expected workstation context (verify before relying on it):

- Host: **Apollo**, Ubuntu, AMD Ryzen 7 9800X3D, 64 GB system RAM.
- GPU: **NVIDIA GeForce RTX 5090, 32 GB VRAM**.
- Primary codebase: TypeScript/Node and associated research workers; market data includes VGT and GDX minute bars, with research spanning 2016–2026.
- The optimizer includes D1 Dip Recovery, Growth, a chronological shared-capital allocator, and multi-stage / genetic optimization (including previously documented Priority 3B/5B methodology).
- Strategy Lab uses existing simulation capabilities and **must remain functional**.

Before changes:

1. Inspect `git status`, branches, active worktrees, running processes, research jobs, Docker services, and GPU workloads. Do not overwrite work from concurrent sessions.
2. Use a **dedicated GPU research branch and preferably a Git worktree**. Untracked/ignored market data may not be present in a worktree; use verified read-only access paths without duplicating or corrupting source datasets.
3. Record source commit, repository hashes, relevant dataset/config fingerprints, driver/toolchain state, and initial workstation inventory.
4. Avoid interference with existing local LLMs, Strategy Lab, or scheduled work. Coordinate compute/VRAM use, but don't silently stop user services or make persistent unrelated system changes.
5. Keep all GPU experiments and outputs in a new, uniquely named research directory; do not modify sealed studies, results, or reference configs.

## 1. Establish a trustworthy performance baseline

Profile representative **actual optimizer workloads**, not artificial arithmetic benchmarks.

Measure, with reproducible commands and deterministic candidate sets:

- End-to-end optimizer runtime and the proportion attributable to strategy evaluation versus candidate generation, search mechanics, ranking/selection, neighborhoods, data loading, serialization, and I/O.
- Cost of a D1 VGT simulation, D1 GDX simulation, Growth VGT simulation, and complete **three-book shared-capital portfolio** replay; distinguish standalone books from pooled chronological work.
- Throughput at different candidate batch sizes and parameter distributions, including unusually branch-heavy configurations, long-held positions, and risk controls.
- Single-worker versus current production CPU-worker configuration, CPU utilization, memory footprint, garbage collection, worker orchestration overhead, caching, and disk/data bottlenecks.
- How much of the workload involves `Number` / IEEE-754 binary64 calculations, integer state, timestamps, conditional rules, and order-dependent reductions.

Use representative historical subperiods covering a strong trend, crash/recovery, extended drawdown, and quieter market conditions. Include the full dataset where feasible without running a new full genetic research campaign. Do not tune or select trading parameters based on performance results.

Report the exact baseline timing methodology: warm-up, repetitions, CPU worker count, caches, CPU/GPU load, and whether preparation or data-transfer time is included. Preserve the existing CPU engine as the **canonical reference**.

## 2. Evaluate GPU suitability and architectural options

Analyze the real computational structure and identify what can be accelerated without losing semantics:

- Candidate-level parallelism versus inherently chronological per-candidate state transitions.
- Divergent branching across D1 and Growth phenotypes and shared-capital funding decisions.
- Variable-length trade histories, conditional parameters, trailing-stop/hold/continuation state, minute-event ordering, and margin accounting.
- GPU memory layout, batch sizes, data staging, host-device transfer overhead, and work scheduling with 32 GB VRAM.
- Precision/performance tradeoffs, **especially FP64 versus FP32**, and any limitations of RTX 5090 double-precision throughput.
- Optional offloading of only narrow expensive kernels versus a wider batched evaluator.
- Maintenance cost and feature-drift risk if a second implementation of the trading engine is introduced.

Compare practical approaches (e.g., CUDA C++ worker called from Node, native binding versus subprocess/IPC, or another well-justified backend). Choose an architecture based on measured workload properties, not generic GPU marketing specifications.

**Preferred architecture to investigate:** retain existing CPU genetic/search/control logic and accelerate the **candidate fitness evaluation** through a batch GPU backend. The original CPU backend remains operational and authoritative; Strategy Lab continues to use its existing simulator unless later explicitly changed.

Do **not** change genetic algorithms, randomness, parameter domains, stages/rungs, candidate advancement, sorting/tie breaks, risk gates, objective functions, search budgets, or any trading rule to make the GPU look faster.

## 3. Prepare the GPU development environment safely

Verify the installed NVIDIA driver, CUDA compatibility, actual device capability, usable toolchain, and Ubuntu support. Install only the tools/dependencies required for the proof of concept, using supported, pinned versions where practical.

- Record exactly what was installed/changed and why.
- Avoid destabilizing the working NVIDIA driver, display stack, Docker configuration, or existing local AI inference setup.
- Do not change display cable routing, BIOS iGPU settings, boot configuration, or primary graphics without user approval.
- If a reboot or driver replacement is unavoidable, explain the reason, expected impact, and recovery steps before requesting it; preserve remote SSH/Tailscale recovery capability.
- Keep dependencies and build instructions reproducible. Do not commit vendor binaries, NVIDIA libraries, drivers, or unrelated build artifacts into Git.

Demonstrate that the GPU is usable for real computation before beginning the strategy evaluator proof of concept.

## 4. Implement a real-workload GPU proof of concept

Build a **bounded, representative, research-isolated prototype** that evaluates many independent candidate configurations on the GPU.

Requirements:

1. Use actual historical input data and actual strategy semantics from the repository, not a toy buy/sell algorithm that omits stops, interest, or funding rules.
2. Prefer a small **end-to-end vertical slice** that exercises meaningful chronological trading state and, if feasible, D1/Growth competition for the shared capital pool. If the full three-book allocator is too large for Phase 1, explicitly isolate a representative narrower slice and show precisely which semantics/features it covers or omits.
3. Preserve chronological order *within each candidate*, while parallelizing *across candidates*.
4. Keep CPU-side candidate generation, genome interpretation, ranking, random streams, and selection behavior unchanged.
5. Use financial precision sufficient to preserve actual decision boundaries. **Do not quietly replace CPU double-precision arithmetic with single precision, approximate prices, reduced-resolution data, simplified intrabar behavior, or changed accounting.** If the hardware cannot provide competitive speed at acceptable fidelity, report that as a negative feasibility result.
6. Ensure stable mapping from candidate ID to GPU output, regardless of asynchronous batch completion; do not rely on nondeterministic reductions or result arrival order.
7. Do not alter the production simulator or optimizer to accommodate the prototype. A thin adapter, separate executable, or isolated interface is preferable for Phase 1.
8. Document unsupported features and why they are excluded. **Do not label the proof of concept “full feature parity” unless it actually supports everything.**

Use a clear, versioned interface for input datasets, candidate vectors, outputs, error handling, and reproducibility. The next phase must be able to build on this without sacrificing existing features.

## 5. CPU/GPU correctness and parity gates — required before performance claims

Create an explicit **feature matrix** listing every currently supported D1, Growth, and shared-capital feature—including recently added risk controls, calendar-day hold semantics, conditional genes, cost/interest rules, continuation, virtual/shadow bookkeeping where relevant, portfolio occupancy, and execution timing. Mark each as **CPU baseline / POC covered / Phase 2 remaining**.

For the implemented POC slice, compare against the authoritative CPU engine using the **same immutable historical bars, exact candidate vectors, relevant configurations, and seed/candidate ordering**. Include normal and adversarial cases:

- Long and short holds, profitable and losing exits, unresolved open positions at dataset boundaries.
- Protective, conditional trailing, and maximum-hold exits; loss restrictions, re-entry and continuation where applicable.
- Weekends, holidays, gaps through stop levels, identical-price/equality boundaries, and timestamps near cutoffs.
- Margin interest, transaction fees, net versus gross P&L, mark-to-market drawdown, and other fitness components.
- Shared-capital conflicts, rejected signals, funding priority, and same-minute ordering where the slice supports them.
- Candidate values near qualification thresholds, near-ties in selection fitness, and diverse optimizer genes.

Compare **event-level decisions and sequences**, not just aggregate profits. For supported features, require matching position entries/exits, timestamps, execution prices, exit reasons, pool occupation/funding, and qualification outcomes. Reconcile summary results to the cent wherever the canonical accounting supports that precision.

Any floating-point mismatch must be quantified, traced to its source, and evaluated for whether it changes **trades, stops, eligibility, fitness rankings, or research selection**. Document the tolerance used for pure numeric comparisons, but **do not conceal consequential differences behind a tolerance**.

Repeat parity tests across different batch sizes and multiple runs; compare deterministic output and ordering. Include negative tests for malformed input, insufficient VRAM, unsupported feature flags, and GPU failure; errors must not produce silently plausible but incorrect results.

**Acceptance gate:** If Phase 1 cannot demonstrate decision-level parity on its representative slice, label the POC **not ready** and do not recommend full integration merely because it is faster.

Use New L0 and N/original as **frozen reference identities** and, where the POC supports their complete feature sets, compare their full ledgers as additional acceptance cases. Otherwise explicitly defer **full New L0/N/original reproduction** to Phase 2. Do not falsely claim full portfolio parity based on partial POC coverage.

## 6. Rigorous, honest performance benchmarks

Only after correctness testing, compare equivalent GPU/CPU workloads and record:

- CPU reference wall time using the current production worker count.
- GPU **kernel-only** time and **total evaluation time**, including transfers, batch building, launch/IPC overhead, synchronization, output reconstruction, and errors/retries.
- End-to-end optimizer throughput or a faithful bounded orchestration test, including work the GPU does **not** accelerate.
- Speedup at realistic candidate batch sizes, data spans, and D1/Growth/allocator configurations; both median and worst-case workloads.
- Peak GPU VRAM, total system RAM, GPU utilization, CPU load, energy/thermal stability when measurable, and effect of desktop display and other GPU processes.
- Determinism across runs, process restarts and candidate ordering.
- Cold versus warm caches and any compilation/JIT preparation time, reported distinctly.

Do not compare one GPU against a deliberately under-threaded CPU baseline, or exclude transfer overhead from an “end-to-end” speedup claim. Use repeatable benchmark commands and keep raw timing/measurement artifacts.

Assess whether the expected gain is large enough to repay engineering complexity over future multi-day optimizations. A **3–5× end-to-end speedup** is a useful *aspiration*, not a guaranteed or mandatory outcome. If results are materially below that, recommend whether the implementation is still worth completing.

Explicitly project whole-study runtimes using **measured fractions of accelerated versus unaccelerated work**, not GPU theoretical TFLOPS or assumed kernel speed alone. A GPU implementation that is slower, numerically inaccurate, or difficult to maintain is an acceptable **no-go** conclusion.

## 7. Decide on Phase 2 — do not execute it yet

End with a clear determination:

- **GO:** sufficient representative parity and plausible worthwhile end-to-end acceleration.
- **CONDITIONAL GO:** fixable correctness/coverage/performance issues, with concrete gating work.
- **NO-GO:** insufficient speedup, precision/feature-parity constraints, or excessive maintenance cost.

If GO or CONDITIONAL GO, propose a complete **Phase 2 implementation specification**, including:

1. GPU support for the full D1, Growth, and shared-capital evaluator and all currently used phenotype/risk-control variants.
2. The exact adaptation boundary between CPU search logic and GPU candidate simulation; full CPU fallback.
3. Backend selection interface (`cpu`, `gpu`, `auto` or repo-consistent equivalent) without breaking existing commands.
4. Versioned feature-capability negotiation: unsupported configurations must **explicitly fall back to CPU or fail**, never silently run altered logic.
5. Event-level and cent-level CPU/GPU parity gates for full New L0, N/original, and diverse qualification/perturbation cases.
6. A reproducible fixed-seed mini-optimization comparison, including all candidate IDs, fitness, ranks, gates, advancement and selected finalists.
7. Full benchmark/reliability and stress testing, including long-running GPU jobs, VRAM pressure, worker failure and restarts.
8. Strategy Lab regression tests confirming the existing interactive simulator remains unaffected.
9. Research protocol/versioning integration and clear backend identity in the manifests so GPU studies remain auditable.
10. Independent CPU verification of final shortlisted candidates and any borderline decisions, with no silent promotion after mismatches.

Do not assume that acceptable POC parity proves the complete engine has been ported correctly. Phase 2 requires its own comprehensive acceptance process.

## 8. Portable reports for the original ChatGPT conversation

**This deliverable is particularly important.** The user is working on the GPU initiative in a fork of a longer Margin Trading conversation. When this assignment is complete, they will bring your results back to the original conversation, which may not be able to inspect Apollo directly.

Produce the following self-contained, human-readable files in your isolated GPU research area:

- `GPU_PHASE1_REPORT.md` — executive summary, confirmed architecture, environment setup, profiling, parity results, benchmarks, go/no-go verdict, and limitations.
- `GPU_CPU_PARITY.md` — feature-coverage matrix, exact tests and input sets, discrepancies, event-level reconciliation, numerical tolerances, and commands to reproduce.
- `GPU_BENCHMARKS.md` — raw and summarized timings, meaningful CPU baseline, GPU overheads, VRAM and system usage, projected full-study speedups, and environment details.
- `GPU_PHASE2_PLAN.md` — complete phase-two implementation/verification plan with dependencies, risk gates, and acceptance criteria.
- `GPU_RESEARCH_HANDOFF.md` — **a concise, standalone handoff written specifically for the original ChatGPT conversation**, summarizing decisions needed and the state of the project. Include all relevant commit IDs, paths, exact covered/unsupported features, and unambiguous performance/accuracy conclusions.

Create a portable **ZIP containing these Markdown reports, relevant small CSV/JSON metrics and a manifest**; exclude raw market datasets, generated binaries, proprietary packages, and giant logs. Print both the ZIP path and a concise final summary in your response. If an accessible user-download path is available, provide it. If not, give the user the exact Apollo path and the command required to copy it to their own computer.

The future Phase 2 assignment must similarly produce a final self-contained implementation, parity, performance and original-conversation handoff bundle. State this explicitly in the Phase 2 plan.

## 9. Safety and acceptance boundaries

- **Do not run the pending 40% marked-DD / 25% trade-principal-loss / 25% banked-capital-DD risk-envelope pilot.** It is deferred until the GPU initiative has been reviewed and accepted, or until we explicitly choose to run it on the CPU.
- **Do not change the pilot's fitness, risk constraints, search budgets, inputs, or methodology.** GPU acceleration must change execution speed only.
- Do not modify financial semantics, D1/Growth/allocator strategies, stop ordering, random candidate generation, data adjustments, or sealed research artifacts.
- Do not interfere with Strategy Lab or replace its CPU simulation engine.
- Preserve working CPU optimization throughout and ensure safe rollback of any environment or repository changes.
- Install necessary CUDA tooling safely but do not alter GPU display/BIOS routing without approval.
- Document and commit the research-only implementation and reports on the isolated branch according to project conventions; do not merge into `main` or declare the GPU production-ready.
- A slower or incomplete GPU implementation is an acceptable outcome; **incorrect research results are not**.

## Success criterion

Phase 1 is successful if it produces a **measured, reproducible feasibility verdict** for accelerating our *actual* optimizer, a real representative CUDA proof of concept with **demonstrated CPU-equivalent trading behavior for every feature it claims to cover**, and a realistic complete Phase 2 plan. Full feature parity is a **Phase 2 acceptance requirement** and must not be claimed prematurely.

**The guiding principle: same strategy, same optimizer, same research decisions—potentially faster execution.**
