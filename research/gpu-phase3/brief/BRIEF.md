# Claude Code — GPU Phase 3: Host-Pipeline Acceleration, Final Acceptance, Merge, and Handoff

## Mission

Complete the remaining **GPU engine and performance-engineering work** on Apollo **before** any risk-envelope pilot begins. Start from the verified, accepted Phase 2 CPU/GPU implementation and improve the **end-to-end optimization throughput** without sacrificing trading-engine correctness, research capabilities, deterministic optimizer behavior, or maintainability.

**This is the final GPU engineering assignment. It is not a trading-research assignment.** When the work is finished, obtain fresh final acceptance, review and merge the accepted GPU implementation into `main` under the repository's normal safeguards, then restore the Git branch that was active before the integration (and explain how the original research branch can obtain the GPU code). Produce a portable, self-contained **report ZIP** to give to the **original ChatGPT Margin Trading conversation**.

**Do not start, implement, search, optimize, validate, or otherwise run the approved risk-envelope pilot here.** That pilot belongs exclusively to the original ChatGPT conversation from which this conversation was branched. Do not make the next research-policy decision on the user's behalf.

The user authorizes reasonable source changes, local development tools and testing on Apollo. The user does **not** authorize changes to unrelated projects, trading strategies, trading parameters, live trading, broker access, the Ubuntu display/driver/BIOS, shutdown or reboot, or destructive cleanup of research results.

### Core acceptance principle

> **Same strategy, same optimizer, same candidates, same fitness and qualification decisions, same historical results — only faster.**

The TypeScript/CPU evaluation remains the canonical reference. The accepted CUDA backend is the official accelerator under Optimization Standard 3.0.0. Keep Strategy Lab's CPU evaluator and UI functionality intact.

---

## 0. Read the existing accepted GPU implementation and record Git state

Before changing anything, read `CLAUDE.md`, the registered `docs/research/OPTIMIZATION_STANDARD.md` (especially 3.0.0 §9), `docs/gpu/README.md`, `docs/gpu/PARITY_CHECKLIST.md`, `docs/gpu/FEATURE_MATRIX.md`, and the actual source and test files.

**Read all major Phase 2 reports**, in particular:

- `research/gpu-phase2/GPU_PHASE2_HANDOFF.md`
- `GPU_PHASE2_REPORT.md`, `GPU_PHASE2_BENCHMARKS.md`, `GPU_PHASE2_PARITY.md`
- `GPU_PHASE2_POLICY_AND_ENFORCEMENT.md`, `GPU_PHASE2_OPERATIONS.md`
- `PHASE2_SCOPE_AND_FEATURE_MATRIX.md`, `PROTOCOL.md`, `AMENDMENTS.md`, `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md`
- The accepted `config/gpu-backend/acceptance.json`, entrypoint registry, supporting benchmark/parity/optimizer/negative/sanitizer artifacts, and Phase 2 source/build manifests.

Verify that the report contents and actual repository state agree. Do not assume paths or commit IDs from a screenshot are current. The Phase 2 report described a pushed `research/gpu-phase2` branch, an accepted GPU binary, documentation and Standard 3.0.0 on `main`, and experimental code **not yet merged**. Confirm those facts.

Capture and record **before doing anything**:

1. Current branch, HEAD, working-tree and index status, untracked/ignored files, outstanding pushes, all worktrees, and whether other sessions are editing the repository.
2. `main` and `research/gpu-phase2` refs, merge base, documentation differences, submodules if any, and branch protection/PR requirements.
3. Existing CPU and CUDA binary/source fingerprints, official acceptance manifest and device identity.
4. Current GPU processes and VRAM availability **without stopping unrelated services**; CPU/RAM limits and data locations.
5. The exact branch the user wants to be back on after the merge. If this is not inferable from the initial checkout and repository state, preserve the initial branch and provide explicit safe commands for restoring any other research branch. **Do not guess, overwrite or force-switch an active worktree.**

Use a dedicated feature branch (and a separate worktree only when it improves isolation). Avoid broad file moves, history rewriting or touching sealed studies. Keep all new benchmark logs under a distinct, versioned GPU engineering research namespace, not in an existing sealed Phase 2 result directory.

### Phase 2 baselines to verify (not assumptions to silently force)

The archived Phase 2 handoff reported:

- Accepted full D1 + Growth GPU evaluator, bit-exact on 144,795 campaign candidate evaluations, complete sealed job replays and 48 Assignment 3 finalists.
- Fixed-seed CPU/GPU optimizer and interrupted/resumed GPU searches identical.
- CUDA memcheck, racecheck, initcheck, synccheck clean; the previously accepted **8-hour endurance run** was completed with zero observed errors.
- End-to-end Assignment 3 C19 search **5,900.8 seconds CPU vs 1,130.6 seconds GPU (5.22×)**, on production-like batches.
- GPU-server kernels/transfers ≈ **347 s**, Node.js encode ≈ **160 s**, decode/reduction ≈ **291 s**, optimizer/archive logic ≈ **332 s** of the measured GPU run.
- Small batches may be slower on GPU. Capacity, feature coverage, receipt verification and optimizer state are enforced by the accepted official path.

These numbers are baseline measurements to reproduce on the actual current code/data/hardware before comparing improved implementations. The claim that there is enough parallelism for **10–15× end-to-end** is a **hypothesis**, not a guaranteed target. In particular, GPU-server time does not prove hardware utilization, and CPU phases may not overlap perfectly.

---

## 1. Stage 1 — Profile, design, and freeze the engineering measurement plan

Profile the real production-style optimizer jobs — **not merely a synthetic CUDA microbenchmark** — to establish how much time is spent in:

- Candidate generation, deterministic optimizer state changes, ranking and selection.
- Request encoding and input serialization.
- GPU submission, kernel execution, transfers and wait time.
- Decode, record reconstruction, aggregation and canonical CPU risk reduction.
- Qualification, archive preparation, compression/filesystem work, logging and checkpoint/resume.
- Synchronization, host-to-GPU queuing, backpressure, memory and garbage collection.

Use representative **Growth-mutable joint search** (Assignment 3-shaped) and **Growth-fixed** (Assignment 2-shaped) workloads; include a small-batch control. Preserve identical candidate vectors, seeds, doors, expenses and feature options between versions. Capture repeated runs, hardware state and warm-up to avoid misleading cache or thermal effects.

Write a short **implementation plan and benchmark protocol** before modifying the performance path. Clearly distinguish measured timings, bottleneck hypotheses, throughput potential and return on added complexity. Define correctness and performance gates, test commands, resource limits, and rollback points. Do not use strategy performance as an engineering decision input.

### Engineering priority order

**Priority A (mandatory first):** Parallelize/overlap Node.js request encoding and result decoding/reduction safely, where profiling shows it is worthwhile.

**Priority B (conditional):** Parallelize only **independent** optimizer-lane scheduling, archive preparation and other host-side work when Priority A leaves measured, separable overhead.

**Priority C (defer by default):** Port compact record reduction to CUDA, tune Growth kernel register pressure/spills, change CUDA memory layout, or otherwise modify accepted trading kernels **only if post-A/B profiling demonstrates a material additional benefit that justifies a new GPU-level parity and sanitizer burden**. Do not pursue this merely to chase a 20× or 30× headline.

A valid outcome is stopping after Priority A if further changes would introduce disproportionate complexity or correctness risk.

---

## 2. Stage 2 — Implement safe worker-thread/pipeline acceleration

Preserve the accepted optimization algorithm and evaluation result contract. Optimize the **host pipeline**, not the strategy or search methodology.

Potential techniques to evaluate and implement (choose after measuring):

- Node.js `worker_threads` for batched request encoding and decoding/reduction.
- Transferable `ArrayBuffer` / `SharedArrayBuffer` or equivalent bounded memory ownership, avoiding unnecessary copies and races.
- A bounded, explicitly backpressured pipeline where encoding of batch N+1, GPU evaluation of batch N, and decoding of batch N−1 overlap when safe.
- Deterministic multi-stage queues with stable batch and candidate IDs, ordered results and clear cancellation semantics.
- Worker startup/reuse, termination, crash propagation, memory accounting and error reporting.
- Explicit controls for worker count, outstanding batches and VRAM/host RAM budgets, with sensible defaults grounded in measured data.

### Mandatory deterministic semantics

**Completion order must not change optimization order.** Regardless of worker scheduling, preserve:

1. Seeded RNG consumption, genotype generation, Sobol/NSGA-II islands, advancement, refinement, early stopping and all optimization-stage decisions.
2. Input candidate ordering, output candidate IDs, serialized result ordering, stable sort/tie-breaking, duplicate handling and archive layout.
3. Floating-point operation order wherever it affects canonical CPU record reductions; no associative aggregation rearrangement that changes bitwise results or thresholds.
4. Exact trade chronology, fills, position state, interest, costs, drawdowns, principal-loss and banked-capital calculations, fitness and all qualification outcomes.
5. Study/work-unit origin, GPU device/binary/compatibility bindings, nonces, receipts, submitted/returned/failed conservation and CPU-scored-evaluations count of zero in official runs.
6. Deterministic restart/resume: no evaluation lost, duplicated, reordered, partially committed or silently regenerated with different RNG state.
7. Failure of any worker or GPU batch must fail closed or follow an explicitly tested GPU-only retry path. **No CPU fallback or mixed backend in an official optimization** under current Standard 3.0.0.

Do not expand or shrink the genome, skip an expensive rule, turn off a risk metric, reduce numerical precision, simplify Growth, or change allocator behavior in the name of speed. If a proposed optimization fails to preserve the required parity, revert or isolate it, investigate and rerun the affected tests.

### Interoperability and Strategy Lab

The **existing CPU evaluator is authoritative and remains accessible for CPU reference, diagnostics and Strategy Lab**. The accelerated GPU backend is optional in non-official contexts only to the extent allowed by the registered policy. New host workers must not interfere with Strategy Lab APIs, file outputs, on-disk state, charting or UI. Do not require GPU acceleration for Strategy Lab's normal simulations.

---

## 3. Stage 3 — Optional host-side orchestration improvement

After Stage 2 is verified and benchmarked, re-profile the total end-to-end job.

If optimizer orchestration and archive preparation remain a substantial serial bottleneck, consider isolating **independent islands, stages or pure I/O preparation** on worker threads. Favor moving blocking serialization, checksum, compression or filesystem preparation off the main event loop over altering the semantic optimizer state machine.

Explicit constraints:

- Do **not** parallelize dependent genetic selection or mutation steps in ways that alter when/which random numbers are consumed.
- Keep one canonical authority for state transitions, advancement, rank assignment, tie-breaking and checkpoint commits.
- Preserve stable output and deterministic replay regardless of parallel lane completion order.
- Do not change number of evaluations, parameter search methods, time windows, drawdown definitions, study budgets or selection results.
- Benchmarks must show a worthwhile improvement **after accounting for scheduling and memory overhead**. If not, keep the simpler implementation.

Do not port this logic onto CUDA merely to move more code to the GPU. Optimizer orchestration is branch-heavy and may be a worse fit for GPU threads than for CPU workers.

---

## 4. Stage 4 — Harden GPU acceptance, enforcement and trust boundaries

The Phase 2 compatibility digest covered the canonical CPU evaluator, CUDA sources and selected host-path dependencies. It did **not clearly cover every enforcement, acceptance-generator, preflight and registry dependency**. The user explicitly authorizes fixing this before merge.

Audit `src/gpu-backend/`, `src/research-standard/`, `tools/gpu-backend/`, `tools/gpu-phase2/`, `config/gpu-backend/`, `package.json`, relevant CI/PR/adoption automation, `CLAUDE.md`, and Standard 3.0.0 §9. Verify exact current files rather than assuming the names exhaust the dependency graph.

### Required integrity coverage

- The official execution entrypoint, `openOfficialGpuSession`, pool and lab binding.
- CPU official-run refusal, allowed non-official purposes, and no `auto`/implicit CPU fallback.
- Reachable-domain capability derivation, registry audit and rejection of out-of-domain features.
- Source/build compatibility digest and any **new worker files, loaders, scripts, flags and paths** that can change requests, results or execution policy.
- The acceptance validator, preflight tools, manifest-generation code, negative-test paths and runtime proof/attestation logic.
- Acceptance record's evidence hashes, device UUID, server binary, source identity, execution receipts and signed/hashed release references as appropriate.
- Merging and running from the `main` commit must not create an unverified policy bypass or inadvertently bless a stale binary.

**Do not use a circular, self-issued hash as evidence of tamper-proof enforcement.** Identify the actual root of trust: a reviewed Git commit/CI provenance, protected branch or other independently pinned verifier. If the repository lacks an independent trust anchor, document the limit honestly and implement reasonable fail-closed and CI controls without claiming cryptographic security it does not have.

### Negative/tamper tests

Prove at least that critical changes are detected or explicitly blocked: modified worker encoder/decoder, altered CPU-official refusal, acceptance verification disabled, altered manifest generator/evidence digest, forged/stale acceptance, unsupported strategy feature, different GPU UUID/binary, missing device, bad receipt, missing completed batch, partial archive, forced mixed CPU scoring, and modified official entrypoint/registry.

Prefer test-isolated temporary copies or sandboxes. Restore everything after mutation tests. No production result or sealed manifest may be modified to manufacture a passing test.

If a policy choice in Standard 3.0.0 needs refinement, document the proposed amendment and obtain the required approval. Do not silently relax the mandatory GPU-only rule or historical research-standard pins.

---

## 5. Stage 5 — Efficient, rigorous final verification (NO new eight-hour test)

The user **does not authorize additional 8-hour or 24-hour endurance tests** for these further acceleration changes. The accepted Phase 2 eight-hour run remains durable evidence for *unchanged* components; do not claim it verifies newly modified code automatically.

Use **targeted verification after each stage**, then **one comprehensive final acceptance campaign** for the finished implementation. The intent is strong correctness evidence with shorter wall time, not a reduced parity standard.

### Targeted checks after each modification

- Unit and integration tests for affected code, including buffer ownership, worker crashes, cancellation, backpressure, ordering, timeout and restarts.
- On identical candidate inputs, bit-exact CPU/GPU comparisons of both D1 books, the complete Growth 1.4.0 genome and conditional rules, L0 allocator, risk evidence, canonical reductions and output serialization.
- Representative 2016–2026 New L0 and N/original reproducibility (full trade/funding/minute-mark evidence, not just total net); relevant full-year and crisis slices, RC1/RC2 controls, stress fills and cutoff behavior.
- Fixed-seed mini-optimizer comparisons including proposals, fitness, ranks, promotions, finalists, exact archive/candidate identities and interrupted/resumed executions.
- Repeated tests across batch sizes, worker counts (including 1), restarts, reversed/shuffled input order, and forced worker/GPU errors.
- Strategy Lab targeted and E2E regression tests; verify no change to its live state or normal CPU simulation behavior.

### Final acceptance campaign, once after all changes

1. Full applicable Phase 2 parity checklist, including both strategy families, reachability/capability matrix, original cost/execution variants, RC controls, margin/risk fields, short and long data doors, and boundary cases.
2. At least one complete sealed optimizer-job replay against CPU evidence with the **same seeds and exact search history**; compare final and intermediate results. Include a substantial fixed-seed interrupted/resumed GPU job.
3. CUDA memory/race/init/sync checks **if GPU kernels, buffers, transfers or memory handling changed**; run the required scope of checks even when only host workers change if buffers can be mishandled.
4. Fail-closed enforcement and tamper/negative tests, including the newly covered policy files and worker pipeline.
5. Several repeatable real-workload end-to-end benchmarks against the **accepted Phase 2 version and the original CPU baseline**, with no selective reporting of favorable runs.
6. One **bounded 30–60 minute sustained reliability run** on the final code, covering representative large batches, backpressure, resource telemetry, repeated parity samples, error counters and deterministic progress. Explicitly reuse Phase 2's eight-hour evidence for unchanged kernels. Longer endurance requires new user approval; do not quietly extend the run.
7. Full relevant TypeScript/lint/build/tests, Strategy Lab unit/E2E, and GPU official preflight. Distinguish existing failures from regressions.
8. Generate a **new acceptance record only after these tests pass**. It must bind the final worker/host path, CUDA binary, canonical CPU sources, enforcement code and all evidence to the correct Git revision and GPU device.

**If there is a consequential mismatch, race, nondeterministic search result, false acceptance, or unfixable memory issue, do not approve or merge the affected implementation.** Fix and re-test the relevant work; if it remains blocked, preserve the last accepted baseline and report a partial/failed upgrade. Never redefine equality tolerances or disable a failing gate to obtain an acceptance label.

Do not equate having 30–60 minutes of sustained operation with a guarantee of long-run safety; report that limitation honestly. Correctness coverage and independent evidence matter more than raw endurance hours.

---

## 6. Stage 6 — Performance verdict and complexity budget

Assess the improvements as **engineering investments**:

| Result | How to interpret |
|---|---|
| Measured ≈ 10–15× overall versus original 12-worker CPU optimizer | Excellent if exact parity and maintainability remain satisfactory |
| Measured ≈ 8–10× | Still potentially worthwhile with limited worker complexity |
| Small gain over accepted 5.22× | Prefer retaining simple accepted Phase 2 design unless added code has a compelling purpose |
| Regression, parity failure or nondeterminism | Reject or revert that improvement regardless of theoretical speed |

No speedup target overrides correctness. Quote measured end-to-end throughput and **measured wall time**, not just GPU kernel throughput or estimated “GPU busy” percentage. Compare Growth-mutable, Growth-fixed and small-batch workloads, disclose CPU-side bottlenecks and resource use, and mark extrapolations distinctly from measurements.

Stop performance work when further incremental changes are not justified. **Do not delay completion indefinitely trying to reach 20–30×.**

---

## 7. Stage 7 — Integration review, safe merge into `main`, and branch restoration

The user explicitly wants **all completed accepted GPU engine and performance work merged into `main` before the pilot**. Standard 3.0.0 documentation may already be on `main`, while code currently resides on `research/gpu-phase2`. Verify and reconcile rather than making assumptions.

### Integration procedure

1. Audit the complete diff from the correct merge base, including accepted Phase 2 engine, new performance work, worker/integrity enforcement, scripts, tests, docs, configuration, generated artifacts and unintended files.
2. Validate there is no strategy, optimization fitness or selection change; no accidental inclusion of large raw data, secrets, local CUDA toolkit, transient benchmark artifacts, binaries that shouldn't be versioned, or unrelated project changes.
3. Confirm the merged `main` tree builds, tests, satisfies all applicable research preflights and can run the accepted GPU official gate. A new merge commit can alter paths or digests; **regenerate/reverify acceptance when necessary** for the final actual tree. Do not manually modify acceptance hashes to hide differences.
4. Where repo policy allows direct merge, perform a **non-destructive, reviewed integration**. Where branch protection or conflicts require a PR/review, prepare the integration, report precisely what approval remains, and **do not bypass protections**. Do not claim `main` was merged if it was not.
5. Push and verify remote refs, commit SHAs and clean status; preserve Phase 1/2 research branches and all frozen reports.
6. **Restore the exact user branch active at the start of this assignment** (unless safely impossible due to concurrent work), without discarding changes. Merely switching to an older branch does not make the GPU implementation available there. If the original research branch must inherit the merge, integrate the accepted `main` history into it **safely and explicitly**, or prepare a clearly specified fresh research-branch alternative. **Do not implement or run the pilot while doing this.**
7. Record the exact `main` SHA, final research-branch SHA, whether the restored branch contains GPU code, and the commands/procedure for the original ChatGPT conversation to start the **separately authorized pilot** from the correct integrated revision.

Keep the existing CPU backend for Strategy Lab, diagnostics and explicit non-official CPU reference runs. Preserve the official GPU-only enforcement policy as currently adopted unless a separate approved revision says otherwise.

### Scope boundary for the deferred risk-envelope pilot

You may perform a **read-only compatibility review** of the intended pilot feature dependencies, including the existing principal-loss and banked-capital inputs, and document whether source changes would require a fresh GPU acceptance. But:

- **Do not implement new pilot selection policies or constraints in this GPU task.**
- **Do not initiate any pilot research search, simulation campaign, qualification, result review or optimization.**
- **Do not adopt or modify the pilot protocol, risk thresholds, fitness function or study standard beyond GPU engineering integration.**
- **Do not create the pilot's official study manifest or preflight attestation as though launch were authorized.**

For reference only, the original conversation approved a pilot comparing the legacy 35%-of-initial-capital marked-DD control with an experimental 40% marked-DD / 25% principal-loss / 25% banked-capital-DD envelope, plus later diagnostic drawdown policies and proportional-scaling checks. These are **context for feature compatibility**, not instructions to execute them here. The **original conversation** owns the pilot's exact protocol and go/no-go decision.

---

## 8. Final handoff bundle for the original ChatGPT conversation

Produce a **portable self-contained ZIP** of the final engineering reports and evidence summaries (not market-data files, model weights, secrets, CUDA toolkit binaries or giant archives). The user must be able to bring this ZIP into the **original Margin Trading ChatGPT conversation** and allow a separate reviewer to evaluate acceptance before the pilot.

Include, at minimum:

1. **`GPU_ENGINE_FINAL_HANDOFF.md`** — start here: outcome, measured speedup, accepted/rejected improvements, exact parity status, why CPU/GPU equivalence is credible, safety constraints, merge status, and explicit **“Risk-envelope pilot NOT STARTED.”**
2. **`GPU_PERFORMANCE_BEFORE_AFTER.md`** — Phase 2 and final timing breakdowns, CPU baseline, repeated real-job benchmarks, workload-dependent speedups, host/GPU utilization and unresolved bottlenecks.
3. **`GPU_FINAL_PARITY_AND_ACCEPTANCE.md`** — scope, tested candidate population, byte-/bit-exactness, optimizer sequence equality, CPU fallback policy, failure tests, sanitizer and bounded endurance results, residual limitations, final compatible binary/source hashes and acceptance record.
4. **`GPU_ENFORCEMENT_INTEGRITY.md`** — complete enforcement trust-boundary audit, covered paths, noncovered limitations and concrete tamper/negative tests.
5. **`GPU_INTEGRATION_AND_OPERATIONS.md`** — branch/commit graph, merge evidence, current checkout, safe research-branch transition, build/preflight/run steps for official GPU research, failure/recovery and CUDA environment notes.
6. **`GPU_PILOT_READINESS.md`** — specific compatibility status and **what remains for the original conversation to authorize/implement/test**; no pilot run, no implied authorization.
7. **`MANIFEST.json` and `CHECKSUMS.sha256`** — file inventory, provenance, report versions and verifiable checksums; include small machine-readable benchmark/parity summaries and command logs as appropriate.

Place the durable bundle in a clearly named repository research location and record its exact absolute path. Commit/push portable reports as appropriate under repository conventions. Provide in Claude's final answer a way for the user to retrieve the ZIP from Apollo and, if supported in the current environment, a directly downloadable artifact. Never invent a sandbox path.

In the final answer, report **what was actually completed versus merely proposed**, particularly whether the GPU implementation was successfully merged into `main`, whether the originally checked-out branch was restored, and whether acceptance binds to the final merged code. Include the principal evidence and limitations in text so the user can understand the status without opening the entire ZIP.

### Final success criterion

**All beneficial, verified GPU performance-engineering work completed; accepted CUDA engine and host-pipeline code safely integrated into `main`; original branch restored with a verified path to accepted GPU functionality; CPU and Strategy Lab retained; deterministic parity, policy enforcement and bounded reliability checks passed; self-contained handoff bundle produced; and the risk-envelope pilot remains entirely untouched for the original ChatGPT conversation.**

If any of these gates fail, stop at the last verified state, preserve work and provide a truthful blocker report instead of claiming success.
