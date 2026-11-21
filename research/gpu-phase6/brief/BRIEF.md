Claude Code — Final GPU Infrastructure Hardening: Maglev Protection and Concurrent Job Isolation
Objective
Complete the remaining GPU infrastructure hardening identified following Phase 5.
The accepted GPU engine is already merged into `main`. This assignment addresses two remaining improvements:

1. Extend the `--no-maglev` runtime protection to Strategy Lab and legacy CPU research/evaluation processes.
2. Implement reliable, automatic directory and namespace isolation for simultaneous optimization jobs.

Both changes must be implemented, tested, and merged into `main` once all required verification and acceptance gates pass.
Do not implement, prepare, configure, or run the risk-envelope pilot. That research belongs exclusively to the original ChatGPT conversation.
1. Extend Maglev protection
GPU Phase 5 reproduced intermittent numerical corruption associated with V8's Maglev compiler under Node.js 24.21.0.
The official GPU optimizer already enforces `node --no-maglev`.
Extend equivalent protection to:

* Strategy Lab's Node.js server.
* Legacy CPU research and evaluation runners.
* Relevant child processes and worker threads.
* Any other Node.js entrypoints that execute the affected strategy, simulation, or financial calculation code.

Requirements

1. Inspect all affected execution paths, startup scripts, process launchers, and worker configurations.
2. Ensure relevant processes run with `--no-maglev`.
3. Do not rely on `NODE_OPTIONS` to carry this flag.
4. Preserve compatibility with the existing application startup and development workflows.
5. Ensure direct execution paths cannot silently bypass the intended protection where enforcement is required.
6. Do not modify trading algorithms, numerical formulas, strategy behavior, or optimization methodology.
7. Add focused regression tests demonstrating the runtime protection.
8. Verify CPU simulation results remain identical to the sealed historical records.

The solution must be maintainable and should avoid unnecessary duplication of runtime-launch logic.
2. Implement automatic concurrent-job directory isolation
GPU Phase 4 established that two independent optimization processes can improve total throughput on Apollo.
Phase 5 also implemented atomic dataset-cache publishing, eliminating the observed partial-read problem.
However, we want automatic and reliable isolation of job outputs and dataset-cache directories, rather than relying on researchers to configure everything manually.
Requirements
Each independent optimization job should receive:

* A unique job identity.
* A dedicated research-output namespace.
* A dedicated dataset-cache directory by default.
* Independent checkpoint and recovery artifacts.
* Independent logs and diagnostic records.
* Safe ownership or locking rules that prevent competing processes from writing to the same job state.

The implementation must:

1. Preserve the existing atomic dataset-cache publication mechanism.
2. Automatically derive or allocate safe per-job directories.
3. Prevent accidental collisions between concurrently executing jobs.
4. Permit legitimate interruption and resumption of an existing job without treating its own checkpoint as a conflicting job.
5. Reject conflicting job identities or ownership rather than silently overwriting results.
6. Ensure one job's failure or cancellation cannot corrupt another job's artifacts.
7. Preserve deterministic optimization results, search ordering, and random-seed behavior.
8. Avoid unnecessarily duplicating large immutable historical market-data files.
9. Maintain backward compatibility with existing research configurations and sealed historical studies.
10. Document cleanup, recovery, configuration overrides, and concurrency usage.

Separate per-job directories should be the normal default, not something users must remember to configure.
Shared caches may remain supported where explicitly configured and proven safe, but they must not undermine the default isolation model.
Do not create separate Git worktrees or duplicate the entire repository for each optimization job. This requirement concerns runtime data, caches, checkpoints, logs, and results.
3. Concurrency and correctness testing
Conduct focused tests using representative real optimization workloads.
At minimum, verify:

* One optimization executes normally.
* Two independent optimizations can execute simultaneously.
* Each receives its own output and cache namespace.
* Neither job can overwrite the other's checkpoints, results, or logs.
* Simultaneous dataset-cache exports are safe.
* Reusing an active job identity is rejected appropriately.
* A deliberately terminated job does not corrupt the other.
* Interrupted jobs can resume correctly.
* Concurrent results match their corresponding isolated reference runs.
* CPU/GPU parity and fixed-seed optimizer determinism remain intact.
* Strategy Lab continues operating normally.

Include crash and interruption tests, but keep them bounded.
Do not perform another eight-hour endurance test. Use targeted reliability testing proportional to the changes.
4. GPU acceptance and regression verification
Before integration:

1. Run the relevant TypeScript, build, unit, integration, and Strategy Lab browser tests.
2. Perform targeted numerical parity and sealed-result reproduction.
3. Verify all affected processes use the correct Node.js runtime flags.
4. Verify deterministic CPU/GPU optimizer behavior.
5. Confirm historical research files and their integrity checks remain unchanged.
6. Run the applicable GPU compatibility and acceptance checks.
7. If any pinned dependency changes, renew GPU acceptance according to Optimization Standard 3.0.0 and its current acceptance requirements.
8. Preserve the external acceptance reference hash and document any new acceptance record.

Do not weaken, bypass, or waive acceptance requirements.
If verification reveals an unexplained consequential discrepancy, investigate it before merging.
Record pre-existing test failures separately from regressions introduced by this assignment.
No reboot or disruptive machine-wide configuration changes without explicit authorization.
5. Integration into `main`
This assignment explicitly authorizes the final integration after successful verification.
Claude should:

1. Inspect the current Git state and verify the accepted Phase 5 baseline.
2. Implement the changes in an appropriately isolated branch.
3. Review the complete diff for unintended modifications.
4. Verify that neither trading behavior nor optimization methodology changed.
5. Complete all relevant tests and GPU acceptance requirements.
6. Merge the validated changes into `main` using the repository's normal safe integration procedure.
7. Push `main` and verify the remote revision.
8. Restore `research/gpu-phase2` as the intended working branch, ensuring it includes the accepted changes and has a clean working tree.
9. Verify the accepted GPU backend operates correctly from the restored branch.
10. Preserve historical research artifacts, branches, and out-of-repository acceptance records.

Do not force-push, rewrite history, overwrite concurrent changes, or merge incomplete work.
If any required acceptance gate fails, do not merge. Report the blocker and preserve the accepted Phase 5 implementation.
6. Final report and handoff
Produce a concise Markdown report covering:

* Runtime entrypoints inspected and updated.
* How `--no-maglev` is enforced.
* Job-directory and cache-isolation design.
* Configuration and usage examples for one and two concurrent optimizations.
* Concurrency, crash, resume, and cache-safety tests.
* Numerical parity and sealed-result verification.
* Strategy Lab regression testing.
* GPU acceptance status and hashes.
* Files changed and Git merge revisions.
* Any known limitations or remaining risks.

Create a portable handoff ZIP containing the report and relevant verification evidence.
The report must explicitly confirm:
GPU infrastructure hardening completed. Risk-envelope pilot NOT STARTED.
Final requirements

* Preserve the canonical CPU engine and accepted GPU functionality.
* Preserve all D1, Growth, allocator, financial, and optimization behavior.
* No trading-rule, fitness-function, parameter-search, or candidate-selection changes.
* No unnecessary performance refactoring.
* No automatic new research studies.
* No risk-envelope pilot implementation or execution.
* No automatic deployment of trading strategies.
* No changes to the GPU's numerical precision or accepted CUDA algorithms.
* Merge only after successful verification and acceptance.

Success criterion: Strategy Lab and legacy CPU runners are protected against the identified Maglev defect, concurrent GPU optimizations use automatically isolated and recoverable job directories, CPU/GPU parity remains intact, all changes are accepted and merged into `main`, and the intended research branch is restored cleanly.
