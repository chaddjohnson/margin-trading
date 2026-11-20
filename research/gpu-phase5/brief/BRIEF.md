# Claude Code — Final GPU Engineering: Parity Root Cause, Atomic Cache, Performance Audit, Acceptance and Integration

## Mission

Finish the outstanding GPU-engine engineering work on Apollo **without changing trading behavior, optimization decisions, or the approved research methodology**. This follows the completed GPU Phase 3 implementation and Phase 4 concurrency investigation.

The order of priorities is non-negotiable:

1. **Investigate and resolve the unexplained Phase 4 CPU/GPU detailed-record parity discrepancy.** Establish reliable attribution and correct any demonstrated defect. You may use an additional expert coding/review model or agent (including *Fable*, if actually available and supported) to conduct an independent investigation, but its conclusions must be verified against code and reproducible evidence.
2. **Fix the concurrent dataset-export race** with a safe atomic-publication mechanism while retaining independent cache/job namespaces.
3. **Profile the accepted GPU path for implementation-only performance improvements.** Apply only well-supported, low-risk improvements that produce measured end-to-end benefits with unchanged outputs; avoid speculative rewrites.
4. **Perform proportionate but decisive CPU/GPU parity, determinism, security, memory, and integration verification.** No another eight-hour endurance test. Never waive a correctness gate merely to finish the assignment.
5. **Merge into `main` only if a freshly accepted implementation passes the applicable policy and integration gates.** Otherwise retain the accepted Phase 3 engine in `main` and preserve all investigation work separately.
6. **Produce a portable, self-contained final ZIP handoff** to bring to the original Margin Trading ChatGPT conversation.

**Strict boundary: Do not implement, configure, schedule, launch or run the 35% versus 40%/25%/25% risk-envelope pilot.** The pilot is owned exclusively by the original ChatGPT conversation after this GPU initiative is closed and reviewed there. Do not modify its protocol or optimize any new trading candidate here.

## 0 — Read the source artifacts, verify provenance, and isolate work

Before coding, read the current repository instructions (`CLAUDE.md`, the registered Optimization Standard 3.0.0 or verified successor, GPU engineering/acceptance documentation) and the Phase 3 and Phase 4 records **in full**, especially:

- `research/gpu-phase4/GPU_CONCURRENCY_FINAL_HANDOFF.md`
- `research/gpu-phase4/GPU_CONCURRENCY_CORRECTNESS.md`
- `research/gpu-phase4/GPU_ACCEPTANCE_AND_MERGE.md`
- `research/gpu-phase4/GPU_OPERATING_RECOMMENDATIONS.md`
- Phase 4's frozen `PROTOCOL.md`, append-only `AMENDMENTS.md`, raw parity records, hashes, exact failing candidate metadata and `results/parity/final/SUMMARY.json`.
- `research/gpu-phase3/GPU_ENGINE_FINAL_HANDOFF.md`, its accepted benchmark/parity evidence, `GPU_INTEGRATION_AND_OPERATIONS.md`, and the GPU pilot-readiness document (read-only context; **do not act on pilot instructions**).
- `tools/gpu-backend/verify-acceptance.sh` and all tools/policy/code referenced by the compatibility digest and acceptance generator.

**Verify** branch tips and code paths against live Git; do not assume historical screenshot hashes are current. The Phase 4 handoff reported:

| Reference | Reported state; verify independently |
|---|---|
| Phase 3 accepted `main`, `research/gpu-phase2`, `research/gpu-phase3` | `3a52cc63` at the Phase 4 report cutoff |
| Phase 4 investigation branch | `research/gpu-phase4`, reported `0ac3e4e2`; unaccepted/unmerged |
| Phase 3 acceptance hash, recorded externally | `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` |
| Phase 4 candidate binary | `b01f4362383526c78d0621d1573dc9937bb1a85711e23cfd375670d19fa7441e` |

Check for other active worktrees, uncommitted changes, background jobs, unavailable external caches, and data/record permissions. Develop on a **dedicated isolated research branch** rooted in the appropriate verified Phase 4 lineage, preserving the original Phase 3 accepted state. Never force-push, reset another session's work, repin sealed results, or rewrite prior protocol records.

Do not alter the GPU driver, BIOS, desktop/display configuration, system clock, or local LLM services without a demonstrated need and explicit approval. A **reboot is not authorized**; if a host RAM test requires one, provide the exact optional procedure and continue with nondestructive testing.

Record an initial provenance/baseline manifest, exact commands, data hashes, compiler/toolchain/driver versions and reproducible baseline metrics. Preserve the outside-of-repository acceptance digest as an independent integrity reference; do not silently replace it.

---

## 1 — Root-cause investigation: one unrepeatable parity event

**Investigate the original evidence; do not assume the GPU was wrong.** The Phase 4 campaign reported **1 mismatched candidate out of 146,356**, with all earlier campaigns clean. The anchor is:

- Campaign/run: **`D24-fund`**.
- Candidate: **`O-fund:coarse:28`**.
- Mismatch: **detailed-record hash only**; virtual books, pooled trade/lot chronology, daily series and risk-envelope inputs reportedly matched.
- A same-candidate rerun and extensive subsequent CPU/GPU attempts were identical; the defect was **not reproduced or attributed**.
- The Phase 4 TypeScript change at `src/gpu-backend/hostPipeline.ts:196` used Node's `Transferable` type and reportedly emitted **byte-identical JavaScript**, so it has not been established as the cause.

### 1.1 Preserve and extend diagnostic evidence

Recover the original per-run artifacts, input candidate vector, dataset/door, cost/execution options, RNG state, CPU worker context, GPU batch identity, complete output schema, hashes and raw record fields. Preserve original results (including the failure) without rewriting them.

Use the enhanced attribution instrumentation already present in Phase 4, then strengthen it if necessary so **the first differing field can be identified even if the mismatch occurs only once**. On failure, capture both CPU and GPU pre-rerun record hashes and the original serialized/structured records where feasible, plus a separately labeled re-evaluation of each side. Do not overwrite initial evidence with successful retries.

Inspect the **detailed-record construction and comparison path**, including:

- CPU cached evaluation versus recomputation, worker/thread isolation, reused state, object mutability, memoization and cache-key identity.
- GPU host-side book/pool/RC reduction and serialization, transfer buffer lifecycle, typed-array ownership, shared/pooled buffers and worker-thread result ordering.
- Canonical field ordering, array ordering, serialization of `-0`, `NaN`, `undefined`, absent optional fields, precision/rounding, stable ties and hash input bytes.
- Possible uninitialized or stale memory, concurrency/race bugs, CPU worker nondeterminism, and dataset-cache effects.
- Differences between **actual economic/trade output** and hashes of diagnostic metadata, including any redundant or unused fields. Never discard a mismatching field simply because it doesn't affect P&L without proving its contract and logging the explicit change.

The Phase 4 report noted that original GPU output was a deterministic reduction while the CPU detailed record was generated by a distinct **cached worker evaluation**. Verify that architecture and test both sides, not only CUDA.

### 1.2 Targeted reproduction and independent review

Use the exact `D24-fund` configuration, relevant predecessor sequences, mixed batch sizes, reordered inputs, CPU worker counts (including 0/1/12 as applicable), GPU host workers, restarts, cache cold/warm paths and concurrent independent processes. Prefer targeted experiments with high diagnostic coverage over huge generic batches.

An independent second code review is authorized. If *Fable* is available and suitable, use it to challenge the leading hypotheses; otherwise use available review agents/models without claiming an unavailable capability. Keep original CPU/GPU logs and source code as the authority, not reviewer speculation.

Run suitable **bounded** device/host diagnostics: CUDA compute-sanitizer memcheck, racecheck, initcheck and synccheck; a GPU VRAM stress check that doesn't jeopardize other work; host-memory checks that can run safely without reboot; event/error logs; transfer and serialization stress. Document what checks can and cannot rule out on a non-ECC GeForce RTX 5090 and non-ECC host RAM. No destructive tests and no unauthorized reboot.

### 1.3 Resolution and correctness gate

If a root cause is found, implement the **smallest causal fix** and add a regression that would fail on the original bug. Re-run affected investigations and the full relevant acceptance campaign. If the problem is diagnostic-record nondeterminism, identify its precise source and still preserve contract-level output identity; never silently substitute a looser hash or ignore a field.

If the root cause remains unproven, state the remaining hypotheses and evidence. A fresh clean parity campaign is **additional evidence, not proof that the original issue has been resolved**. Do not accept a zero-tolerance exception, loosen parity comparison, silently discard the original mismatch, or generate a misleading acceptance record.

**Mandatory fallback if unresolved:** retain the already accepted Phase 3 implementation in `main`, preserve Phase 4's valuable concurrency benchmarks and any unmerged engineering work on a research branch, and report the blocker for user review. This does **not** remove the ability to run two independent GPU optimizations concurrently on the accepted Phase 3 engine.

Do not merge unaccepted engine modifications.

---

## 2 — Atomic dataset-cache export and concurrent-job isolation

Phase 4 found `src/gpu-backend/dataset.ts` writes `<cacheDir>/<door>.gb2ds` directly. When multiple processes export the same dataset into one cache directory, **34 of 100** loads were refused for incomplete/size-mismatched data; **zero incorrect datasets were accepted**. Fix this race without altering dataset bytes, price transforms, research semantics or hashes.

Requirements:

1. Write into a unique temporary path **in the same filesystem/directory as the target**, per process/job/export invocation; prevent collisions and symlink/path surprises.
2. Complete the write, close/flush as appropriate, validate schema/length/checksum/content identity, then atomically publish using a justified rename/compare-or-publish protocol. Readers must see either a previously completed valid dataset or the newly completed valid dataset, **never a partial file**.
3. Address simultaneous writers: identical expected content should be safely reusable; differing hashes, data revisions or schema versions must produce an **explicit conflict/invalid-cache error**, not silent last-writer-wins acceptance of different data under one identity.
4. Define behavior on crash before publication, power-loss caveats, stale temporary files, cleanup, existing corrupt/incomplete target, concurrent readers and resumed jobs. Preserve fail-closed behavior.
5. Preserve **separate per-job dataset cache directories and unique research job namespaces** as the recommended operating practice even after atomic publication. Do not introduce cross-job archive writing or reuse live job names.
6. Verify deterministic dataset contents and canonical CPU/GPU equality before and after the change. A cache implementation change must never become a market-data change.

Test multiple simultaneous readers/writers, forced termination mid-export, restarts, matching and conflicting source identities, interrupted cleanup, and the original 4 × 25 concurrent-load reproduction. Keep test data isolated. If implementing a cross-process lock is necessary for correctness, justify it and avoid unbounded waiting/deadlock.

This is an **engineering hardening change**, not permission to build a shared GPU broker, CUDA MPS configuration, or a new optimizer scheduler.

---

## 3 — Profile-driven, behavior-preserving performance audit

The user authorizes a **focused code-efficiency review**, analogous to empirically comparing alternative Node.js loop/array implementations. Do not rewrite the optimizer wholesale or optimize based on syntax preference alone.

### 3.1 Measure first

Profile representative workloads on Apollo using the accepted Phase 3 engine and, separately, the candidate research branch:

- A large **joint D1 + Growth** search (Assignment 3-like; the main beneficiary of Phase 3).
- A **Growth-fixed** search (Assignment 2-like).
- A smaller/batch-limited optimization to expose overhead.
- Where meaningful, single-job mode **batch 8,192 / eight host workers** and two independent jobs with separated namespaces. Do not spend hours repeating the already completed 1–4 concurrency study unless new changes affect scheduling.

Use wall-clock component breakdowns, CPU profiles/flamegraphs, allocation/GC evidence, transfers, GPU utilization and memory bandwidth (label driver counters and limitations), and full-job evaluations per second. Capture exact test environment, warmed/cold states, repeated timings, noise and hashes.

Investigate likely hot paths such as:

- Node.js encoding and decoding loops, typed arrays, allocations, binary marshaling, buffer reuse/copies.
- Worker-thread transfers, queue discipline, backpressure, redundant serialization and waits.
- Optimizer orchestration and independent-lane scheduling **only if changes preserve proposal order, RNG consumption, tie-breaking and archive identity**.
- Research archive writing and dataset load overhead.
- CUDA register pressure/spills and record reduction **as diagnostics**, not a mandate to port extra GPU logic or modify kernels.

### 3.2 Apply only justified improvements

For each proposed change: benchmark before/after (prefer paired, repeated, realistic trials), calculate impact on end-to-end job time, assess maintenance and parity risk, make **one small reversible change**, and run focused correctness/determinism tests before stacking changes.

Keep optimizations with material, repeatable end-to-end benefit and low complexity. Reject microbenchmark-only wins that do not improve actual jobs. If profiling shows little useful headroom, stop optimizing and retain the already excellent Phase 3 engine.

**Prohibited:** `fast-math`, changed floating-point precision/reduction order without exact parity, altered stochastic search/fitness/qualification rules, changed D1/Growth/allocator semantics, undocumented cache relaxation, skipped records, missing features, weaker acceptance, silent CPU fallback, and changes that modify search history or reproducible outputs.

Do not implement a shared-GPU queue, CUDA MPS, a new job scheduler, or GPU kernel rewrites merely for speculative speedup. Their possible benefits were already documented in Phase 4 and require separate authorization if justified.

---

## 4 — Final correctness, acceptance and safety tests (bounded, not superficial)

Run validation after **the final combined implementation**, not only after each intermediate change. Follow the actual registered optimization standard and `docs/gpu/PARITY_CHECKLIST.md`; preserve the zero-mismatch policy.

Required evidence:

- Exact CPU/GPU parity for the official feature matrix, real historical market doors, D1/RC1/RC2/Growth controls, pooled funding decisions, trades and exit reasons, position states, prices, interest, net, minute drawdown, principal-loss and banked-capital-risk inputs, and detailed records.
- At least the established Phase 4 parity-campaign scope (the earlier campaign compared **146,356 candidates**) or an equivalent *predeclared, adequately justified* scope with targeted extra coverage of the original failure. **Zero unexplained mismatches.** Record both sides' original field values if anything fails.
- Full-job/research-seal replays, fixed-seed mini optimization, identical candidate proposals, rankings, promotions, refinement, qualification, final verdict, archive hashes, and interrupted/resumed determinism across host worker counts and batch sizes.
- CUDA sanitizer checks appropriate to any changed device or memory path; host memory/transfer tests; robust failure injection and per-job fail-closed isolation under concurrency.
- Acceptance/tamper/negative suite against official entrypoints, including policy/source/acceptance hash sensitivity, no hidden bypass, verified binary rebuild and out-of-repository acceptance pin.
- Atomic dataset-cache race regression and concurrency namespace isolation. Verify two jobs cannot corrupt each other's inputs or archives.
- Root TypeScript compilation, relevant unit/integration tests, Strategy Lab unit/browser tests, and original canonical CPU research parity. Distinguish seven known baseline test failures from new failures.
- At least a **bounded representative reliability run** (approximately 30–60 minutes, or equivalent meaningful evaluation volumes) for the final accepted configuration; do **not** repeat an eight-hour endurance run. If a bug or diagnostic demands additional testing, describe it and justify the narrow extension without treating duration as proof of correctness.
- Benchmark final end-to-end performance against the accepted Phase 3 implementation, including CPU baseline where useful. A faster microbenchmark alone does not justify acceptance.

Do not change or weaken registered acceptance standards to manufacture a pass. If any required parity gate fails, the final implementation is **NOT ACCEPTED** until resolved or a subsequent explicit user decision under repository policy. No assumed exceptions.

### Historical sealed-file protection

Phase 4 found that Git branch switching can clear filesystem read-only bits on historical sealed research files even while Git content hashes remain unchanged. Inventory sealed files using their actual manifests (`seals.jsonl` and applicable pins), verify contents against recorded hashes, and safely restore the intended protection for affected files only. Do not `chmod` the entire research tree blindly; don't alter content or unrelated permissions. Document the limitation and how to re-verify protection after subsequent branch switches.

---

## 5 — Conditional merge into `main` and restored branch

Only after a **complete passing acceptance** and repo-policy-compliant integration review:

1. Commit and push the accepted engineering changes and fresh acceptance record on the isolated research branch. Verify artifact hashes and retain the approved external digest independently from repository history.
2. Review the diff against the accepted Phase 3 branch: scope, performance/correctness changes, data/cache behavior, integrity boundaries, schema and version changes, tests, no modified trading rules or research records, and no suspicious generated artifacts/secrets.
3. Perform a non-destructive, normal Git merge into `main` following the documented GPU integration procedure; **do not force-push or bypass review gates**.
4. Repeat the independent post-merge verification, including reproducible binary build and acceptance hash verification, research preflights, CPU closure and Strategy Lab tests.
5. Push verified `main`. Restore the user's intended work branch (reportedly `research/gpu-phase2`) and safely fast-forward/integrate the accepted `main` changes if appropriate, leaving the checkout clean. Verify acceptance from that restored branch too; preserve prior commit ancestry and note any changes to read-only filesystem protection.

If parity cannot be resolved or any gate fails:

- **Do not merge unaccepted engine code into `main`.**
- Verify `main` still contains the previously accepted Phase 3 implementation and that its independent acceptance digest remains valid.
- Keep the Phase 4 benchmarking and this investigation in the research lineage, with their reports, performance findings and unresolved issues intact.
- Preserve concurrent operation using the already accepted Phase 3 engine: one job for fastest turnaround, or two **independent jobs** (batch 8,192, eight workers each) for higher aggregate throughput with distinct cache and job namespaces.
- Report precisely what would be needed for a future acceptance cycle. Do not unilaterally approve a one-event exception.

Do not describe an unmerged or unaccepted type-only fix, cache improvement, or performance patch as production ready.

---

## 6 — Portable handoff for the original ChatGPT conversation

Create a **self-contained ZIP** with clear read-first instructions and verifiable manifest/checksums (avoid bundling huge raw market archives or sensitive credentials). It must include:

- `GPU_FINAL_HANDOFF.md`: status, accepted version/hash, actual merged `main` revision or explicit unmerged fallback, restored branch, risks/limitations, and the clear statement **“RISK-ENVELOPE PILOT NOT STARTED.”**
- `PARITY_ROOT_CAUSE.md`: original failure case, captured evidence, verified cause/fix or unresolved diagnosis, attribution limitations, and correct historical verdict (do not erase the prior failure).
- `ATOMIC_CACHE_AND_CONCURRENCY.md`: implementation, regression tests, job isolation and recommended 1-job/2-job operating modes.
- `PERFORMANCE_AUDIT.md`: hotspot profiles, all attempted optimizations (accepted/rejected), paired micro/end-to-end benchmarks, CPU/GPU comparisons and hardware metrics.
- `GPU_ACCEPTANCE_REPORT.md`: detailed checks, candidate counts, per-gate verdict, sanitizer, safety tests, reproducibility, hashes and integrity evidence.
- `MERGE_AND_RESTORE.md`: commit hashes, post-merge verification, source fingerprint and policy pin, or the exact reason no merge occurred.
- `PILOT_HANDOFF_ONLY.md`: **context for the original conversation**, identifying the accepted GPU backend and its limitations. Mention that a later pilot-specific host-path/risk-policy change may require a fresh acceptance, but **do not implement or start the pilot here**.
- Supporting CSV/JSON metrics, test logs, protocol, amendments, reproducible commands, artifact manifest and SHA-256 checksum file.

Commit/push this research bundle where safe, and optionally also place it in a known local handoff location on Apollo. Provide its exact path and the command to copy it. The original conversation should be able to assess readiness without relying on this chat's state.

## Final response required from Claude

Answer concisely but substantively:

1. **Did you identify and resolve the exact parity mismatch?** What was the demonstrable root cause? If not, what evidence is missing?
2. **Is the final GPU engine newly accepted?** Give acceptance digest and policy gates, or clearly say **NOT ACCEPTED**.
3. **Was atomic cache publication implemented and proven under concurrent writers/readers?** Are isolated job namespaces still required?
4. **Which performance changes were retained?** Measured end-to-end speedup versus Phase 3, and which changes were rejected.
5. **Was `main` merged and verified?** Which branch is now checked out? If not merged, does Phase 3 remain accepted and operable?
6. **What is the recommended concurrency setting** under the current accepted engine?
7. **Where is the final handoff ZIP**, what is its SHA-256, and exactly what does the original conversation need to decide before the pilot?

### Success criteria

**Success with integration:** root cause resolved with evidence, no unexplained parity discrepancies, atomic cache verified, performance improvements supported by measurements, a fresh passing acceptance, safe merge and branch restoration, and a portable final handoff.

**Acceptable fallback:** if root cause or parity acceptance is not resolved, produce a complete, candid investigation and benchmark report while leaving the **accepted Phase 3 engine in `main` untouched and fully usable**, including its measured two-job concurrency capability. No exception, no unaccepted merge, and **no risk-envelope pilot activity**.
