# Claude Code — GPU Acceleration Phase 2: Complete Parity, Mandatory GPU Optimization, and Verified Performance

## Mission

**Implement Phase 2 of the Apollo RTX 5090 GPU acceleration initiative.** Phase 1 established an exact CUDA proof of concept for D1/RC1/RC2 plus the shared-capital pool, with Growth still evaluated on the CPU. Now complete the optimizer integration, implement and verify GPU Growth and the remaining supported optimizer features, establish a **permanent repository-wide CPU/GPU parity policy**, and enforce **GPU-only strategy evaluation for every official optimization**.

The user's requirements supersede any contradictory defaults or CPU-fallback provisions in the earlier Phase 2 proposal:

1. **Official optimization MUST use the NVIDIA GPU for all historical strategy simulations that contribute to fitness, qualification, candidate promotion, refinement, robustness/perturbation testing, and optimization validation.** CPU orchestration (genome generation, NSGA-II, queues, record reductions from GPU-generated evidence, ranking, reporting) is permitted. CPU *strategy simulation substituted for GPU evaluation* is prohibited.
2. **No automatic CPU fallback in an official optimization — ever.** Unsupported features, stale GPU code, device errors, exhausted VRAM, failed parity, kernel failure, broken telemetry or inability to prove GPU execution MUST **fail closed**. Do not run for hours/days on CPU without an explicit refusal.
3. **CPU/GPU functional and numerical parity must be mandatory for every future change to D1, Growth, allocator, exit/entry/risk-control logic, and any evaluation-dependent risk accounting.** The authoritative implementation remains **TypeScript/CPU**; the accelerated evaluator is **CUDA C++**. Do not migrate the trading engine to Python or a shared C++ source in this assignment.
4. **Write the mandatory policy into the root `CLAUDE.md` (read at every Claude Code session) AND the actual repository optimization standard**, with versioning, referenced engineering checklists, executable enforcement and tests. Documentation without enforcement is insufficient.
5. **Complete all feature support required by the existing official optimization research domain**, not merely the two frozen reference candidates. Silent approximations, reduced precision, dropping a rule, or substituting simplified historical execution are forbidden.
6. The previous Qwen/vLLM model has been **removed** from Apollo and approximately 28 GB of previously allocated VRAM was released. **Re-measure actual free memory**; do not size or restrict the implementation around the outdated 2.5–2.8 GiB budget. Do not reinstall or restart local language models. Leave the monitor on the RTX 5090; no reboot, display-output change, driver change, or modification of unrelated projects without a demonstrated need and explicit permission.
7. Do **not** launch the deferred 40% / 25% / 25% risk-envelope research pilot, change any trading strategy, revise fitness/optimization rules, deploy trades, or merge experimental GPU engine code into `main` as part of this assignment.
8. Produce a **portable final handoff bundle** with measured speedups, actual memory/throughput metrics, complete parity evidence, policy adoption status, limitations and clear readiness verdict, suitable for review in the original ChatGPT Margin Trading conversation.

This assignment is **Phase 2a plus a gated Phase 2b Growth port**. Complete both if correctness and technical feasibility gates pass. If a gate fails, preserve verified partial work and explain exactly what prevents acceptance; **never waive parity to obtain a speedup** and never claim a CPU/GPU hybrid is compliant with the new official GPU-only policy.

## 0. Read, verify, and establish a clean working state

Before changing anything, read the complete repository instructions and relevant source material, including:

- Root `CLAUDE.md`, nested Claude instructions, `OPTIMIZATION_STANDARD.md` (currently understood as version 2.2.0, but verify exact location/version), its templates and any adoption/versioning rules.
- `research/gpu-phase1-feasibility/GPU_PHASE1_REPORT.md`.
- `research/gpu-phase1-feasibility/GPU_CPU_PARITY.md`.
- `research/gpu-phase1-feasibility/GPU_BENCHMARKS.md`.
- `research/gpu-phase1-feasibility/GPU_PHASE2_PLAN.md` **as a technical starting point**, but explicitly override its `auto`/CPU-fallback/default-CPU provisions for official optimization.
- `research/gpu-phase1-feasibility/GPU_RESEARCH_HANDOFF.md`, `PROTOCOL.md`, `notes/feature-matrix.md`, `MANIFEST.json`, and Phase 1's source/metric archives.
- Applicable original New L0 methodology and all current D1, Growth 1.4.0, RC1/RC2, allocator, pooled optimization, risk-metric, GPU client and Strategy Lab contracts.

**Phase 1 reference:** `research/gpu-phase1-feasibility` was reported committed/pushed. Relevant paths were `src/gpu-phase1/` and `tools/gpu-phase1/`; Phase 1 recorded 1,658 real-data and 960 synthetic exact-parity subjects for its D1-plus-pool slice, and hybrid speedups of 1.65–1.97× for joint searches. Confirm those from the records and existing repository; do not assume current Git HEAD or filenames are unchanged.

Before work:

- Inspect `git status`, active branches/worktrees, remote commits, concurrent sessions, dirty/untracked files and background optimizer jobs. Do not clobber other work.
- Develop on a **dedicated Phase 2 research branch** (a worktree is optional if the user prefers one checkout and there is no conflict). Preserve frozen research archives and source hashes. Commit/record separate stages.
- Record Apollo's GPU UUID, driver/runtime/compiler/toolchain versions, CPU, OS, VRAM, free/used VRAM, GPU processes, desktop GPU use, host RAM, swap and existing GPU backend versions; check that vLLM is no longer resident rather than assuming it.
- Work in the `margin-trading` repository and its own scoped toolchain/install paths. **Do not modify the distinct `ai-trading` project, other containers, system display configuration or unrelated infrastructure.** Install the required development/sanitizer tools in user space when feasible, with a reproducible uninstall manifest.
- Preserve the TypeScript/CPU engine as the definitive reference implementation and Strategy Lab's CPU execution path.

Produce an initial `PHASE2_SCOPE_AND_FEATURE_MATRIX.md` that traces **every active official research feature** through its CPU source, GPU implementation, parity fixture and backend capability bit. Use the Phase 1 43-item matrix as a starting point, not a final completeness claim. Include parameter ranges and conditional variants that optimizers can generate, as well as features used by subsequent qualification and validation steps. Newly added risk-envelope metrics must be included to the extent they require historical evaluation data.

## 1. Institute the permanent mandatory policy — documentation plus code

### 1.1 Exact policy requirements

Create a concise, prominent, **mandatory** section in the root `CLAUDE.md`, with links to the normative engineering and optimization-standard requirements. Add the full normative text to `OPTIMIZATION_STANDARD.md` using the repository's required **version/adoption mechanism**. If a new standard version is needed, choose it according to actual repository rules; do not silently rewrite the semantics of a frozen study's standard. Update templates, protocol preflight, contribution/PR checklists and developer instructions accordingly.

Include all of these mandatory statements in substance:

- **GPU-required official optimization.** Every historical strategy evaluation affecting optimization decisions or qualification/robustness/optimization validation MUST execute on a verified CUDA-capable GPU evaluator. The genetic search/control plane may remain on CPU. CPU processing of results from GPU evaluations is allowed; CPU replay used as independent **parity/diagnostic verification** is allowed, but it must never be silently substituted as the official scoring source.
- **No CPU fallback.** If no GPU, unsupported candidate feature, insufficient memory, incompatible engine digest, failed self-test, lost device/server, invalid returned data, or failed parity is detected, the official optimization MUST stop (or checkpoint then terminate) with an explicit actionable error. Never `--backend=auto` fallback, CPU worker substitution, or quietly mixed execution. If a partial CPU/GPU hybrid exists for development/testing, it must be explicitly marked **noncompliant and forbidden for official optimization**.
- **Always-visible backend identity.** Require manifest, logs, progress and every task/batch execution receipt to identify the actual GPU device UUID, kernel/binary digest, capability set, GPU-executed task count, CPU-scored historical evaluation count (must be **zero**), and preflight result.
- **Preflight is obligatory for every official run** and must verify current device, live CUDA kernel execution, parity validity, source-digest compatibility, required features for *the whole reachable search space*, and available memory. A configuration merely requesting GPU is **not** proof of GPU execution.
- **Continuous runtime enforcement.** Monitor GPU evaluation receipts, counters, completion/health and hardware telemetry; detect unexpected CPU evaluation or loss of GPU progress, then fail closed. The optimizer must never keep evaluating on CPU while displaying a GPU label.
- **Parity with every strategy change.** Changes to entry, exit, D1, Growth, filters, risk controls, cost/interest, same-bar/fill semantics, pooled allocator, eligibility, and any evaluation dependency require corresponding CUDA updates and exact-or-strictly-reconciled CPU/GPU tests **before merging or using the feature for official research**.
- **Stale-port protection.** The GPU backend must carry a verifiable compatibility manifest of CPU source/data schema hashes, compiler flags and capability versions. A relevant CPU implementation change invalidates the GPU acceptance record until regenerated and re-tested; stale capability bits must cause an error, not fallback.
- **Safe exceptions.** CPU evaluation remains permissible for Strategy Lab, deterministic diagnostics, controlled benchmark baselines, CPU reference reproduction, and CPU/GPU parity testing. These must be **explicitly categorized as non-official optimization work**. No automatic exception to GPU-required official runs; any actual policy exception needs the user's explicit approval before execution.
- **Activation gate.** The GPU-only policy is immediately the required direction for new official research, but do not falsely claim an accepted implementation while Phase 2 is incomplete. **Block official optimization until all requisite parity and GPU enforcement gates pass.** Phase 2's bounded CPU/GPU comparison jobs are engineering tests, not official strategy optimization studies.
- **No change to historical results.** Completed research stays on its original pinned code and standards; never alter original records to make new backends appear compatible.

**Resolve any apparent conflict between documentation and code by strengthening enforcement**. In particular, prior Phase 2 guidance proposing `--backend cpu|gpu|auto` with default CPU and per-task CPU fallback for unsupported features is **superseded** for official optimization. You may retain explicit CPU test/diagnostic commands, but official entrypoints MUST be GPU-only/fail-closed.

### 1.2 Enforcement at every entrypoint

Audit **all actual optimizer launch paths**, not only one CLI: npm scripts, TypeScript CLI entrypoints, workers, research harnesses, replays used for gating/selection, resumed jobs, validation jobs, study scripts, and any UI-triggered optimization endpoints if they exist. Ensure no alternate command silently bypasses the GPU policy.

Implement a single authoritative backend-policy gate or equivalent shared enforcement that:

1. Differentiates an **official optimization** from a documented diagnostic/parity/benchmark run using an explicit, auditable execution purpose. Do not rely merely on an easily forgotten CLI default.
2. Refuses official runs with an absent/CPU/auto-selected evaluator, undocumented GPU identity, partial CPU fallback, or unknown execution purpose where the optimizer could perform official candidate search.
3. Checks **all possible conditional features** reachable from the study's parameter/structure domains, not only the starting seed or first batch. Re-checks per task at runtime against negotiated capability bits.
4. Performs a **real GPU kernel smoke evaluation**, validates receipt and parity on representative precommitted candidates before large work begins, and logs an attestation with the study run ID.
5. Fails before expensive exploration if the device, parity, capability, policy or expected telemetry is unavailable. At runtime, checkpoints safely and stops immediately if a forbidden CPU evaluation or GPU health/capability issue occurs.
6. On resume/restart, repeats all preflight checks and records a new compatible backend attestation; do not resume silently under a different backend, kernel or data identity.
7. Records per-batch backend receipts in the research archive, and verifies a conservation invariant (eligible tasks submitted = GPU-evaluated tasks successfully returned + explicitly failed tasks; CPU-evaluated tasks for official scoring = **0**).
8. Displays periodic progress with actual GPU strategy evaluations, effective evaluation throughput, GPU UUID, allocated/peak VRAM, device utilization/power where available, and errors, rather than a misleading `GPU enabled` boolean. **Low utilization alone isn't proof of fallback**; use verified kernel receipts and execution counts as the authoritative evidence.

Include tests that deliberately disable CUDA, mismatch source hashes, submit an unsupported Growth parameter structure, simulate an OOM, kill the GPU server during a search, forge a stale capability manifest, force a CPU backend selection, attempt a resume with the wrong binary, and attempt a non-GPU evaluation from an optimizer worker. Every official run MUST refuse or terminate **without silently evaluating that candidate on CPU**. No misleading success or partial results.

### 1.3 Documentation integration and versioning

Implement both policy and enforcement **as part of this Phase 2 assignment**. Commit normative docs with a distinct documented change record, tests, and specific requirements for all future Claude sessions. For future-merge enforcement, establish a repo-supported required test/CI preflight or equivalent mandatory review gate so modifications to CPU strategy source cannot be accepted without their matching GPU parity evidence.

The user explicitly authorizes **policy documentation** in root `CLAUDE.md` and the optimization standard. Keep experimental GPU engine code on its research branch pending review. If a clean **documentation-only** integration into `main` is allowed by repository conventions and does not conflict with other work, perform it separately; otherwise prepare an unmerged, clearly reviewable documentation-only branch/PR and say exactly what's left. Never merge GPU engine code to `main` automatically. Do not claim docs are active in other checkouts until actually integrated there.

## 2. Phase 2a — Complete D1/RC/allocator GPU evaluator and optimizer integration

### 2.1 Build from the existing proven code

Continue the Phase 1 CUDA C++ evaluator rather than writing a separate unrelated trading engine. Maintain TypeScript as the authoritative reference. Retain the existing CPU optimizer's genome parsing, candidate generation, Sobol/Latin search, NSGA-II, neighborhoods, rungs, stop/extend decisions, selection, ranking, archive, random streams and stable tie-breaking **unchanged**.

Provide the optimizer's existing `Pool.run(tasks, onResult)`-style boundary (verify actual current API) through a GPU evaluator pool that batches candidates across work lanes, returns keyed results preserving order-independent determinism and feeds **the canonical record/fitness code** exactly the same evidence as the CPU path. A CPU record-reduction or ranking stage is permissible when operating on GPU-produced historical simulation results; **CPU simulation of Growth or D1 as part of an official candidate evaluation is not**.

Support qualification, validation, all historical data doors, default and nondefault pool options, record modes, exact detailed trade/funding/risk logs, cost/interest/slippage stress configurations, and the risk metrics required by the approved but deferred **40%/25%/25%** pilot. Do not change the risk-envelope rule, optimizer criteria or budgets.

### 2.2 Scope and feature matrix

At minimum inspect and implement or explicitly account for the CPU features enumerated in Phase 1's matrix, including:

- D1 deep entry, trailing-buy, swing entry if reachable, continuation, tracked-high, hold unit actually in the active code, loss/buffer rules, profit-only and breakeven stop policies if reachable, execution and gap behavior.
- RC1/RC2: unconditional protective stops, next-session/entry-day activation, hold legacy/disabled/progress-extended, prolonged-decline gate, all conditional genes, fills, counts and event/detail rows.
- One-slot L0 allocator, tie/priority modes, partial exits, refusal semantics, mark-to-market DD, reservation chronology, reset/period DD, blackouts, reporting start, whole-share versus fractional options, peak/trough and detailed ledgers.
- Cost-rate and interest stresses; drawdown, maximum adverse excursion, banked-capital and principal-loss inputs, exposure/giveback metrics where required by scoring/qualification or retrospective validation.
- Full-data, chronological-fold, regime and synthetic stress modes using the CPU loader's **identical adjusted source prices and event chronology**.

Any supported feature must match its CPU counterpart **bit-exactly wherever technically attainable**. Phase 1 attained zero-tolerance parity for its covered slice; do not silently lower that standard. If a feature cannot achieve bitwise parity, investigate numeric order and semantics and report the specific 1-ULP/precision causes. A consequential difference in trade decisions, candidate fitness, gates or selection blocks acceptance; do not approve economically approximate results.

### 2.3 Memory/performance engineering

Re-profile with the **current free VRAM**, not with the prior 28 GB vLLM allocation. Improve batch memory layout, candidate arena/buffering, transfer protocol and kernel efficiency based on measured bottlenecks. Do not weaken exactness or bounds checking to gain speed.

Retain binary64 and Phase 1's verified compilation/arithmetical constraints unless changing them is independently proven bit-exact. If moving to a compact/fused streaming evaluator, prove it matches every reference and stress scenario. Detect integer/capacity overflow and partial GPU result corruption explicitly.

Provision a compatible full CUDA toolkit in user space where feasible so `compute-sanitizer` (memcheck and relevant other modes) and profiling tools **actually run and cover the real kernels**. The Phase 1 sanitizer couldn't instrument processes: a working memory-safety test is a Phase 2 acceptance requirement. If tools genuinely cannot execute, report a blocking deficiency and do not claim full GPU acceptance merely because trade outputs match.

**Checkpoint A:** D1/RC/allocator and optimization integration are correct and benchmarked. This is an **engineering checkpoint**, not authorization for any official joint optimization while Growth still runs on CPU. A Phase 2a hybrid that evaluates Growth on CPU may be used for **diagnostic comparison/benchmarking only**; it does not meet the user's GPU-only requirement and cannot be activated as the official research backend.

## 3. Phase 2b — Port Growth 1.4.0 completely to CUDA with gated verification

Growth was the major missing piece in Phase 1: its CPU evaluation accounted for approximately 50–64% of joint-search work. Implement a genuine GPU Growth virtual book that handles the **full set of configurations reachable by the current official Growth optimizer**, including not only New L0's phenotype.

### 3.1 Feature tranches with parity at each gate

Read the actual source and identify all structures and conditional genes. The Phase 1 plan listed an approximately 8,500-line TypeScript Growth engine with Rise/breakout entries, trend and eligibility filters, drawdown-recovery gate, per-minute evaluations, trailing stops, maximum hold, intraday loss buffers, ATR initial stops, partial-sale retention, continuation methods and stress handling. Confirm exact current functionality.

Suggested sequence:

1. **Growth tranche 1:** New L0 and N/original reference structures, complete D24/FULL funded/virtual records using GPU Growth, and a measured Growth kernel cost per candidate. Run exhaustive parity, including 2020/2022/2025 market episodes.
2. **Growth tranche 2:** Remaining prevalent conditional structures in the Assignment 3 archives, including independent eligibility policies, trend filters, recovery and exit configurations.
3. **Growth tranche 3:** Remaining reachable structures, including breakout entries, retention/partial fills, alternative continuation methods and all stress/diagnostic variants. No unported reachable official optimization feature may remain at acceptance.

Use a precise CPU/GPU feature matrix with tests for every tranche. Mirror floating-point operation order, TS percentage construction, tolerance comparisons, rolling sums and intrabar event ordering exactly. No FP32 shortcuts, sampling fewer minutes, simplified eligibility or different partial-fill accounting.

### 3.2 Gated continuation

After tranche 1, calculate **measured** GPU Growth time/evaluation and a defensible **projected full-joint end-to-end acceleration** against the 12-worker CPU reference. The previously discussed target is **at least 3× end-to-end** for an Assignment 3-shaped workload, ideally 5× or higher.

- If correctness is clean and the measurements credibly support >=3×, continue through complete feature coverage.
- If the measured projection is lower or the technical cost becomes disproportionate, **stop and document the decision gate**. Do not fake speedup or silently drop Growth features. Because official optimization requires every evaluation on the GPU, a stopped Growth port means Phase 2 remains **not accepted** and official GPU optimization stays blocked pending the user's decision.
- Never relax parity or shift CPU Growth evaluations into official optimization just to satisfy a performance target.

**Checkpoint B:** All reachable D1/Growth/allocator features needed by official research execute on GPU, pass exact parity and memory-safety tests, and are available through the mandatory-GPU optimizer path. Anything not covered must be listed as *blocked/noncompliant*, not CPU-fallback-compliant.

## 4. Verification: strategy parity, fixed-seed optimizer identity and failure safety

Use the CPU engine only as the independent **reference** in tests and diagnostics. When the official optimizer operates, its decision-relevant historical evaluations must originate from the GPU.

### 4.1 Broad CPU/GPU trading equivalence

- On identical market data, candidate genomes, seeds, costs, controls and boundaries, compare each D1 and Growth **virtual trade**, actual funded lot, partial fill, exit reason/time/price, signal, rejection, capital reservation, mark, year/episode statistic, accrual, drawdown, MAE, principal/banked loss, giveback and detailed record.
- Include C19/C21/C23/C24/FULL doors, quiet/crash/bear/trend windows, 2020/2022/2025 episodes, all valid structural families, conditional Growth variants, price-gap/holiday/missing-minute/close-print scenarios, margin-interest and transaction-cost stresses, and all qualification/validation modes.
- Match complete New L0 and N/original FULL and development ledgers to sealed artifacts with **Growth executed on the GPU**. Phase 1's hybrid reproduction does not satisfy this gate.
- Preserve parity at batch sizes 1, 7, 13, 16, 32, 50, 64, 128 and large batches, random task ordering, server restarts and repeated runs. Verify no completion-order-dependent search behavior.
- The Phase 1 plan proposed >=100,000 seeded random Assignment 3 genomes plus adversarial fixtures and the original New L0, N/original, IJ1, C4 and other significant research finalists. Execute appropriately broad coverage, record the exact tested genome distribution, and disclose any coverage gaps instead of asserting all possible states were exercised.

### 4.2 Fixed-seed optimizer equivalence

Execute a bounded, **non-official parity-only mini-optimization** on both CPU and GPU using precisely the same approved/test fixture configuration. Compare:

- Genome proposal sequence and IDs.
- Every returned evaluation record/hash and fitness input.
- Constraint/gate decisions, ranks, Pareto dominance and tie-breaking.
- Stage promotion, NSGA-II islands, refinement and neighborhood/perturbation outcomes.
- Finalist identities, best values, archive rows, checkpoints and recovery behavior.

Require identical search outcomes. Any mismatch, including a candidate near a risk/fitness threshold, blocks acceptance. Do not claim reproducibility merely because aggregate net profit happens to match.

### 4.3 Runtime enforcement and negative tests

Prove the official optimizer refuses CPU evaluation from all known launch paths and stops promptly on GPU failure. Negative tests must include:

- No GPU; wrong GPU; failed CUDA kernel smoke test.
- Feature/mode reachable in the search domain but not in the GPU capability set.
- GPU kernel binary stale relative to TypeScript source.
- GPU OOM, killed server, incomplete/corrupted batch response, invalid timestamps, runtime fault.
- Mid-run attempt to route one candidate to CPU.
- Resume with a changed GPU/kernel/source/config fingerprint.
- Inability to retrieve trustworthy backend receipts/heartbeat for the actual GPU evaluator.

A safely checkpointed error is acceptable. **A continued CPU optimizer scoring workload is not.** Test that resumed jobs revalidate before any new evaluations.

### 4.4 Reliability and system regression

- Run a >=24-hour continuous GPU test representative of production batch sizes, with periodic parity sampling, repeatability checks, monitored VRAM/host-RAM trends, GPU temperature/power and stable job progress. This is engineering stress, not strategy discovery.
- Run a working CUDA sanitizer on representative kernels and test for memory errors, uninitialized memory and out-of-bounds behavior. Record full tool versions and executed modes.
- Run relevant TypeScript/build/static checks, scoped GPU tests and the repository's full test suite, reporting known pre-existing failures separately.
- Verify Strategy Lab still runs its **existing CPU evaluator**, with its charting and simulations untouched. No regression to recent drag-to-measure UI fixes; do not edit research outputs or `state/strategy-lab/`.
- Validate no system-wide driver/display alteration, reboot, unapproved service modification, or interference with another project.

**Final parity acceptance:** zero consequential CPU/GPU differences; exact comparisons to the extent demonstrated by Phase 1. If parity isn't achieved for a reachable official feature, official GPU optimization is **not approved**.

## 5. Measure speed, memory, throughput and real workload time — after freeing VRAM

Benchmarks are required deliverables, not optional estimates. Re-measure using current actual memory (with Qwen/vLLM absent); do not recycle the Phase 1 2.8-GiB-cap measurements as current results.

### 5.1 Fair measurement protocol

- Compare against the actual **12-worker production CPU** setup and unchanged dataset/candidate sets.
- Record warm/cold starts, 3+ timed repetitions when practical, batch sizes, dataset sizes, compilation/runtime versions, GPU background processes, per-component times, candidate fitness/ledger hashes and resource caps.
- Separate GPU kernel time, host/device transfer, Node client decode, CPU postprocessing, job orchestration and full end-to-end optimization throughput. Do not report kernel-only speedup as total job acceleration.
- Measure D1-only/Growth-fixed, joint D1+Growth (Growth on GPU), and complete optimizer jobs. Include qualification/robustness overhead, not only the broad screening path.
- Record actual and peak GPU VRAM, host RAM, swap, kernel occupancy/utilization, power, GPU temperature and throughput for multiple safe batch sizes. Report safely supported maximum batch size and memory-per-candidate with measurement methodology.
- Profile bottlenecks that limit speedup, and explain whether the GPU kernel, transfers, Growth divergence, scheduler, CPU record path or other components dominate.

### 5.2 Requested runtime estimates

Provide **measured-derived** runtime ranges, not unsupported promises, for:

- The approved 300k–500k-evaluation risk-envelope pilot (including candidate-generation and qualification overhead and the experimental 35% control versus 40%/25%/25% constraint arms).
- An original Priority 3B-scale ~5.83-million-evaluation run.
- An Assignment 3-scale ~17.5-million-evaluation fully joint run (historically ~44.4 CPU hours).
- A larger ~34-million-evaluation family/qualification workload (historically ~31 CPU hours in a different search mix).
- Any relevant future staged trailing-stop and TSLA/MSFT study projections, with clear caveats about unknown workloads and data availability.

Report actual end-to-end CPU/GPU speedups, range across populations, optimization overhead, and limits of extrapolation. **Distinguish measurements from estimates**. The minimum aspirational joint speedup is >=3×; >=5× is preferred, but correctness is non-negotiable.

### 5.3 Monitor and display hardware

Leave the physical monitor connected to RTX 5090 and Ubuntu's current display setup unchanged. Test with desktop use as presently configured; record whether the compositor's small VRAM/compute load affects batch throughput. Recommend moving to iGPU **only if** measurements show a material benefit and a safe migration path; do not change display wiring/BIOS or reboot without separate authorization.

## 6. Future-proofing: every strategy change requires parity

In addition to the normative policy under §1, implement a durable engineering workflow covering:

- A **single maintained feature matrix** linking each TypeScript trading feature, CUDA counterpart, source digest, tests and research capabilities.
- A required change checklist for D1, Growth, pooled allocator, stop/fill semantics, financing/risk math and new conditional genome parameters.
- Verification that changing a mirrored TypeScript source invalidates previously accepted CUDA artifacts; kernels must be revalidated when compiled source/binary/compiler options change.
- A mandatory test/merge gate that requires updated CPU reference tests, GPU parity fixtures, full relevant CPU/GPU feature testing, compatibility manifest and a GPU-execution integration test before merging affected changes. Where CI hardware lacks NVIDIA GPU, define a **required GPU-capable Apollo verification/attestation step**; a CPU-only CI green check must not be represented as complete parity.
- An explicit migration process for genuinely new features not yet ported: the feature can exist for CPU diagnostics/Strategy Lab, but **official optimization involving it is blocked** until GPU support and parity are complete. Don't silently omit that feature from an optimization's reachable genome.
- A compatibility and provenance scheme for optimizer snapshots, research manifests, CUDA binary hashes, GPU device IDs and exact data loader versions.
- Review instructions that every new Claude Code session sees by reading **root `CLAUDE.md`**, with links to precise standards and commands.

This policy is intended to prevent weeks of future performance/validation drift. Avoid promising that a code hash alone proves semantic parity; source-digest checks and runtime comparison suites are complementary requirements.

## 7. Scope exclusions and study integrity

- No modifications to D1/Growth/allocator trading rules, phenotype vectors, optimizer objective/fitness, ranking, selection, random streams, search budgets or risk gates.
- No reduced precision/approximation or replacing CPU TypeScript with Python.
- No silent fallback to CPU on official optimization, and **no exceptions simply because the GPU is busy**.
- No Strategy Lab GPU rewrite; it remains on CPU.
- No execution of the approved risk-envelope pilot or future staged trailing-stop, TSLA or MSFT optimization before Phase 2 acceptance and explicit research authorization.
- No altering frozen research results or existing historical engine fingerprints to pass parity.
- No automatic merge of experimental GPU backend to `main`, production deployment, broker orders, background automation or unapproved system changes.
- No attempt to claim a Phase 2a hybrid is an accepted GPU-only official optimizer.

If complete parity is temporarily infeasible, stop with a precise capability-gap report and request a user decision instead of silently compromising the requirements.

## 8. Mandatory final files, reporting and original-conversation handoff

Save a full research record in an isolated, versioned Phase 2 namespace, for example `research/gpu-phase2/`, using repository reporting conventions. Produce at least:

1. `GPU_PHASE2_REPORT.md` — executive verdict, completed implementation, applicable source commits, policy activation status, limitations, unresolved blockers, and no-change evidence for strategies/optimizer methods.
2. `GPU_PHASE2_FEATURE_MATRIX.md` — complete CPU/GPU capability matrix for reachable official optimization features, including every Growth family and stress/qualification variant.
3. `GPU_PHASE2_PARITY.md` — exact reference/candidate/ledger/fitness parity evidence, fixed-seed optimization comparison, edge cases and negative tests, with linked machine-readable files.
4. `GPU_PHASE2_BENCHMARKS.md` — actual CPU/GPU measurements, speedups, total job time, free/peak VRAM, RAM, power and rate-limiting components; measured-derived time projections for the requested workloads.
5. `GPU_PHASE2_POLICY_AND_ENFORCEMENT.md` — precise root `CLAUDE.md` and optimization-standard policy changes, version/adoption status, fail-closed implementation, preflight/runtime attestations, tests, CI/merge gate and proof that stale/unsupported GPU work is blocked.
6. `GPU_PHASE2_OPERATIONS.md` — documented commands to build/install the CUDA backend, run official GPU-only optimization preflight, run CPU diagnostics/parity, monitor progress, verify backend and logs, resume checkpoints, and safely recover from failures. Show commands based on **actual implemented CLI**, not fictional flags.
7. `GPU_PHASE2_HANDOFF.md` — a **self-contained explanation for the original ChatGPT Margin Trading conversation**, including decisions made, requirements satisfied/missing, measured speedups, feature parity, policy status, concerns, and next actions. This is the **first document the user should forward**.
8. Versioned `PROTOCOL.md`, `MANIFEST.json` (paths, hashes, branch/commit, device/toolchain/data identity), run command logs, complete source list and machine-readable parity/benchmark/preflight/counter evidence.
9. A single `gpu-phase2-report-bundle.zip` containing the portable documents, machine-readable tables and manifest with checksums, **without large market-data sets, secrets, CUDA toolchain binaries or unnecessary raw research archives**. Verify ZIP integrity and list its exact Apollo path and copy command in the final reply.

Commit and push the Phase 2 research branch as permitted by repo conventions; verify the pushed remote state. Keep a clean, transparent distinction between **documentation-only integration** (if safely applied) and **experimental GPU code not merged to main**.

The final Claude response MUST explicitly answer:

- Is **every official optimization evaluation demonstrably GPU-executed**, with CPU fallback impossible in the enforced official path?
- Does the whole optimizer refuse to start before expensive work when GPU/device/parity/capabilities are unavailable?
- Is **Growth fully GPU-supported**, including all reachable structural and conditional variants?
- Are the authoritative CPU TypeScript and CUDA C++ engines **bit-exact** (or do any specifically documented nontrivial differences remain)?
- Do fixed-seed CPU and GPU mini-optimizations select exactly the same candidates, fitness results and finalists?
- Are root `CLAUDE.md` and `OPTIMIZATION_STANDARD.md` updated and actually available to future Claude sessions, and what merges/approvals remain?
- What are the **measured** end-to-end speedups and actual peak VRAM/RAM use now that vLLM is gone?
- What are the projected runtimes for the risk-envelope pilot and major future studies?
- Can the user safely authorize official GPU optimization of the deferred pilot **now**, or is acceptance blocked? If blocked, state the exact blockers and do not start the pilot.

## Final non-negotiable acceptance condition

**An official optimization must never spend days evaluating historical candidates on the CPU because GPU acceleration was unavailable, stale or incomplete.** Prove the intended backend by executing real GPU kernels in preflight, attest each optimization batch, reject every CPU-scored historical evaluation, detect capability/parity drift, and fail closed immediately on any violation.

**Maintain TypeScript as the canonical strategy engine and Strategy Lab evaluator; keep CUDA as the complete, synchronized, parity-gated optimization evaluator. Same strategies, same research rules, same decisions — only faster computation.**
