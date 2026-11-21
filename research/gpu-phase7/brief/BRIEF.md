# Claude Code — GPU Risk-Envelope Pilot Prerequisites and Readiness Verification

## Objective

Prepare the Margin Trading repository on Apollo for our previously approved GPU-accelerated risk-envelope optimization pilot.

**This assignment is strictly for prerequisites, integration, verification, and pilot preparation. Do not execute the research pilot.**

The RTX 5090 GPU backend has already been implemented, validated, accepted, and merged through GPU Phase 6. A separate repository storage-cleanup effort has also been completed since that handoff.

We now need to ensure the updated repository, archived research data, GPU evaluation interface, risk metrics, and optimization infrastructure are ready to conduct the pilot correctly.

The overriding requirements are:

1. Preserve the existing CPU/GPU evaluation parity.
2. Preserve all existing D1, Growth, allocator, and optimization functionality.
3. Preserve the frozen New L0 and N/original research results.
4. Implement the missing pilot-specific risk-metric integration without changing trading behavior.
5. Renew GPU acceptance when required.
6. Prepare a complete, reviewable pilot protocol.
7. **Stop before executing the actual pilot.**

Read all applicable repository instructions and optimization standards before beginning.

---

## 1. Authoritative documentation

Repository:

`/home/chad/projects/margin-trading`

First inspect:

- `CLAUDE.md`
- Current `OPTIMIZATION_STANDARD.md`
- `docs/research/methods/NEW_L0_METHOD.md`
- `docs/gpu/README.md`
- `docs/gpu/PARITY_CHECKLIST.md`
- `config/gpu-backend/acceptance.json`
- `research/gpu-phase5/PILOT_HANDOFF_ONLY.md`
- `research/gpu-phase6/GPU_INFRASTRUCTURE_HARDENING_REPORT.md`
- Relevant research from `research/vg-l0-risk-metrics/`
- Assignment 3's optimizer, candidate archives, and research protocols.

The previous GPU handoff was titled:

`ORIGINAL_MARGIN_TRADING_GPU_HANDOFF_AND_PILOT_PREREQUISITES.md`

Follow its requirements wherever they remain applicable. Verify all technical assertions against the current repository and runtime rather than assuming the earlier commit hashes or acceptance state remain current.

The original New L0 optimization methodology and the GPU-only requirements of Optimization Standard 3.0.0 (or the verified current successor) must remain authoritative.

Do not introduce a different optimization algorithm or change existing fitness methodology as an incidental part of this assignment.

---

## 2. Important: Repository cleanup was completed

A separate Claude session recently performed a major local-storage cleanup.

The cleanup recovered approximately 322 GiB by removing obsolete material and compressing archived research data.

The cleanup research branch was:

`cleanup/storage-2026-11-21`

Verify its actual current integration and commit history against the repository.

### 2.1 Compressed Assignment 3 archives

The cleanup preserved Assignment 3's candidate-population archives but compressed them with Zstandard.

There are **14 Assignment 3 candidate-population SQLite archives now stored as `.sqlite.zst` files**.

The cleanup also compressed other historical SQLite archives. Do not assume those are required for this assignment.

Before conducting any pilot preparation or historical audit that requires direct SQLite access:

1. Locate the relevant compressed archives.
2. Inspect the cleanup manifests and verification records.
3. Identify which archives are actually required.
4. Restore those archives to an isolated temporary location.
5. Verify restored file hashes and SQLite integrity against the cleanup records.
6. Use the restored copies for read-only research and verification.
7. Preserve the original compressed archives unchanged.

A typical restoration command is:

```bash id="lq5q90"
zstd -d archive.sqlite.zst -o /path/to/scratch/archive.sqlite
```

Use the actual paths and commands appropriate to the repository.

**Do not decompress every historical archive unnecessarily.**

Do not restore archives into their original repository locations if doing so would interfere with the cleanup, Git state, caches, or existing research.

Preserve the cleanup's recovery records and rollback bundles.

### 2.2 Verify post-cleanup GPU integrity

The cleanup conversation reported successful GPU and research regression verification, including CPU/GPU parity and Strategy Lab checks.

However, those checks do not replace the new pilot-specific acceptance work.

Verify whether the cleanup changed:

- Git commit or branch identity.
- GPU acceptance dependencies.
- GPU source or binary hashes.
- Dataset caches.
- Research archive availability.
- Official optimizer launch paths.
- Relevant build dependencies.

Do not assume an acceptance record remains valid merely because the GPU binary still executes.

---

## 3. Phase A — Verify the current GPU environment

Inspect the actual Apollo environment.

Verify:

- Current Git HEAD, `main`, active branches and worktrees.
- Clean or understood working-tree state.
- Existing running optimization jobs.
- RTX 5090 device identity and available VRAM.
- NVIDIA driver and CUDA toolkit.
- Node.js and V8 versions.
- Accepted GPU executable and hashes.
- GPU acceptance record and external acceptance pins.
- Official GPU execution gate.
- Existing CPU reference implementation.
- Dataset identity and corporate-action adjustments.

### Mandatory runtime requirement

All official GPU optimization processes, relevant CPU references, and applicable Strategy Lab execution paths must use:

`node --no-maglev`

The GPU handoff identified an intermittent V8/Maglev numerical-corruption problem.

Do not remove, weaken, or bypass this protection.

### GPU execution model

Preserve:

- GPU-only official optimization.
- Fail-closed behavior when acceptance is invalid.
- No silent CPU fallback.
- `openOfficialGpuSession` → `GpuPool` → `EvalLab`.
- Existing job isolation, checkpointing, and deterministic resume.
- Official launch through the repository's documented npm/runner entrypoints.

Do not invent alternative launch commands that bypass the official gate.

Do not perform general GPU performance engineering unless a necessary pilot-specific integration reveals a correctness problem.

The monitor may remain connected directly to the RTX 5090. No graphics-configuration change or reboot is requested.

---

## 4. Phase B — Implement pilot-specific risk-metric integration

The previous GPU handoff identified one important missing capability.

The GPU evaluator already calculates several risk quantities required by the pilot, including trade principal losses and banked-capital drawdowns.

However, the official `GpuPool` and `EvalLab` interfaces do not yet expose all those quantities to the optimizer's search and qualification pipeline.

Investigate the actual implementation, particularly:

- `src/gpu-backend/pool.ts`
- `src/gpu-backend/lab.ts`
- Their manifests, archive identities, cache keys, and acceptance dependencies.
- The canonical CPU risk-metric implementation.

### Required implementation

Implement the smallest clean, backward-compatible interface necessary to make the required risk metrics available to official GPU optimization research.

The interface must support:

1. Conventional marked-to-market maximum drawdown.
2. Maximum individual funded-trade principal loss.
3. Maximum banked-capital drawdown.
4. Relevant marked and liquidation-equivalent variants.
5. Consistent normalization against the correct capital denominators.
6. Associated metadata needed for verification and reproducibility.

The existing research metric specifications are authoritative for precise definitions.

### Compatibility requirements

- Keep the original evaluation record unchanged when the optional risk data is not requested.
- Avoid changing trading signals, entries, exits, or position state.
- Avoid modifying existing CUDA trading kernels unless strictly necessary.
- Preserve existing D1/Growth/allocator feature coverage.
- Preserve historical candidate rankings and optimization results when the new capability is disabled.
- Give records with different requested risk outputs distinct, stable cache/archive identities.
- Treat missing required risk fields, unsupported capability combinations, invalid values, and metadata mismatches explicitly and fail closed.
- Do not introduce silent numerical approximations or reduced precision.

Prefer centralized qualification logic so CPU and GPU do not develop different interpretations of the same risk policies.

### Numerical verification

For identical candidate configurations, compare CPU and GPU:

- Trade chronology.
- Execution prices.
- Realized and marked P&L.
- Margin interest.
- Conventional drawdown.
- Principal loss.
- Banked-capital drawdown.
- Qualification decisions.
- Fitness inputs and rankings.

Require exact supported parity, with no unexplained consequential differences.

Pay particular attention to candidates close to risk thresholds.

---

## 5. Phase C — Prepare the approved risk-envelope pilot

**Prepare the research protocol and implementation plan, but do not run the pilot.**

### 5.1 Research scope

The strategy combination remains:

- VGT D1.
- GDX D1.
- VGT Growth.

One shared, fixed-capital trading slot.

GDX Growth remains OFF.

Keep:

- Calendar-day holding-period semantics.
- Existing strategy exit behavior.
- Existing shared-capital allocator rules.
- Shadow-position delayed-entry eligibility OFF.
- Existing transaction-cost and margin-interest conventions.
- Current supported D1/Growth risk controls.

New L0 remains the immutable historical benchmark.

N/original remains the preferred research challenger, but must not be automatically adopted.

### 5.2 Approved risk-envelope comparison

Use a fixed $100,000 initial trading allocation for the primary research.

| Constraint | Original control | Experimental |
|---|---|---|
| Maximum marked DD | 35% of initial allocation | **40% of initial allocation** |
| Maximum individual principal loss | Original research convention | **25% of funded trade principal** |
| Maximum banked-capital DD | Original research convention | **25% of initial allocation** |

For the $100,000 research allocation, the experimental thresholds are:

- Marked DD: $40,000.
- Individual principal loss: $25,000.
- Banked-capital DD: $25,000.

These are optimizer qualification constraints, **not executable stop-loss rules**.

### Important denominators

The 40% marked-DD threshold means 40% of the original $100,000 trading allocation.

It does **not** mean 40% of the strategy's peak historical equity.

The individual principal-loss threshold uses each trade's funded entry principal.

The banked-capital drawdown threshold uses the initial trading allocation.

Document these definitions precisely and test them.

### 5.3 Search methodology

The pilot will compare the original research envelope against the experimental envelope.

Prepare the implementation plan so risk qualification can affect all appropriate search stages, including:

- Initial screening.
- Fitness and feasibility assessment.
- Candidate promotion.
- Refinement.
- Neighborhood qualification.
- Final selection.

Do not implement a superficial final-ranking adjustment while leaving earlier $35,000 filters in place.

Preserve the original NL0 exploration/refinement methodology and candidate-diversity safeguards unless an explicitly documented experimental deviation is approved.

Keep the original NL0 and experimental RA1 selectors available for controlled comparisons.

Do not silently promote the previously tested P2 selector.

### 5.4 Pilot computational budget

The approved pilot-scale budget is approximately:

**300,000–500,000 evaluations total.**

Focus on the original research's C21 and C24 historical cutoffs.

Prepare an exact proposed allocation across:

- Original and experimental arms.
- Search stages.
- Historical cutoffs.
- Independent random seeds.
- Refinement.
- Qualification and neighborhood testing.

Ensure the comparison is fair and that budget asymmetry cannot manufacture a winner.

Estimate execution time using measured accepted-GPU throughput.

Prefer one official GPU job for the relatively small pilot unless the protocol identifies genuinely independent concurrent jobs with demonstrable benefit.

**Do not start these jobs.**

### 5.5 Validation discipline

Follow the established optimization standard.

The earlier historical regimes—including 2020 and 2022—and the 2025–2026 period have already been inspected during previous research.

Treat chronological comparisons as retrospective evidence where applicable.

Do not describe previously examined history as a pristine holdout.

Predefine the evaluation windows, data doors, candidate-selection criteria, and validation restrictions.

Do not use validation performance to revise candidate selection after results are observed.

---

## 6. Phase D — Prepare alternative drawdown-policy diagnostics

The user approved additional diagnostic comparisons.

These are **not additional optimization searches or trading exit rules** in this assignment.

Prepare specifications for evaluating the same candidate populations under three alternative policies.

### D1 — Percentage of peak equity

Evaluate conventional drawdown relative to historical peak strategy equity.

Clarify the equity basis, denominator, path chronology, and handling of accumulated banked profits.

### D2 — Capped hybrid

Investigate a drawdown allowance combining:

- A floor relative to initial allocation.
- A component related to peak strategy equity.
- A hard upper cap relative to initial allocation.

One previously discussed illustrative formula was:

```text id="y3tswd"
allowedDD = min(0.60 × C0, max(0.40 × C0, 0.30 × Epeak))
```

Here, `C0` is the original trading allocation and `Epeak` is the appropriate historically attained strategy-equity peak.

These numerical coefficients are illustrative, **not approved permanent risk thresholds**.

Define candidate formulas and explain their behavior for representative historical scenarios.

### D3 — Profit-component-aware qualification

Distinguish drawdown attributable to:

- Previously unrealized-profit giveback.
- Losses below funded principal.
- Erosion of previously banked profits.

Use the established causal accounting and attribution definitions.

Do not simply subtract summary values in a way that double-counts or incorrectly attributes losses.

### Diagnostic requirements

All three policies must:

- Be evaluated on common candidate populations.
- Remain nonbinding during the approved initial pilot.
- Preserve the existing trades and exit rules.
- Have documented formulas, denominators and edge cases.
- Be compared separately from the primary experimental envelope.

If the diagnostics identify promising excluded candidate regions, recommend a separately authorized and appropriately funded optimization afterward.

Do not silently enlarge this pilot's optimization budget or narrow its original scope.

---

## 7. Phase E — Position-size normalization checks

Prepare controlled checks at:

- $100,000.
- $250,000.
- $500,000.

The purpose is to verify that percentage-based constraints scale correctly.

At $500,000, for example:

- 40% marked-DD budget = $200,000.
- 25% individual principal-loss budget = $125,000.
- 25% banked-capital-DD budget = $125,000.

This does not imply those absolute losses would be acceptable for live deployment.

Verify proportional behavior under the existing model, accounting for any actual nonlinearities or precision effects.

Do not launch three independent genetic optimizations.

Account-level margin-maintenance risk remains a separate illustrative assessment, not a new official pilot fitness constraint.

---

## 8. Phase F — CPU/GPU parity and acceptance renewal

After implementing the pilot-specific metric interface, determine the required GPU acceptance campaign from the authoritative checklist.

Assume the previous GPU acceptance may become stale because the modified interfaces are within the pinned evaluation dependency graph.

Perform the necessary verification, including:

- Existing no-risk evaluation parity.
- New risk-metric parity.
- Threshold-boundary and invalid-value tests.
- Representative D1/Growth feature coverage.
- Fixed-seed mini-optimizer and ranking parity.
- Candidate promotion/qualification parity.
- Sealed historical candidate reproduction.
- Negative and tamper testing.
- Sanitizer checks.
- Deterministic checkpoint and resume.
- Bounded reliability testing.
- Strategy Lab regression tests.

Use the accepted toolchain and required `--no-maglev` runtime.

A small, fixed-seed optimizer parity test is permitted **solely as engineering verification**. It is not part of the research pilot and must not be treated as pilot evidence.

Do not weaken the required acceptance campaign or add unnecessary general performance engineering.

If the implementation changes accepted evaluation dependencies, obtain a new valid `ACCEPTED` record and preserve the required independent acceptance pin.

### Required baseline checks

Reproduce the historical New L0 and N/original results with the same verified data, accounting, and execution conventions.

Investigate any unexpected differences.

Confirm that Strategy Lab remains operational and its existing simulation functions are unaffected.

If acceptance cannot be renewed successfully, report the blocker. Do not bypass enforcement or silently substitute a CPU research run.

---

## 9. Phase G — Prepare a reviewable pilot protocol

Produce a proposed research protocol that we can inspect and approve before actual pilot execution.

It must include:

1. Research questions and hypotheses.
2. Exact risk metrics and normalization.
3. Original and experimental arms.
4. Alternative diagnostic policies.
5. Parameter domains and selection methodology.
6. Search-stage implementation plan.
7. Exact proposed evaluation budgets and seeds.
8. Candidate retention and diversification rules.
9. Chronological evaluation windows and data doors.
10. Robustness and tail-risk reporting.
11. Treatment of unrestricted or open-ended Growth configurations.
12. Cost and interest stress tests.
13. $250k/$500k scaling checks.
14. Reproducibility and artifact-retention requirements.
15. Proposed acceptance, qualification and go/no-go criteria.
16. Expected GPU resources and compute time.
17. Proposed official execution commands and isolated job identities.

Do not invent user approval for unresolved methodological decisions.

Provide a concise decision register identifying anything that must be settled before the pilot is authorized.

The protocol may be prepared and committed for review, but it must not initiate pilot evaluation or automatically promote its experimental rules into the permanent optimization standard.

---

## 10. Git and implementation safety

Use an appropriately isolated research branch based on the verified post-cleanup GPU-enabled repository.

Avoid overlapping worktrees or modifications from other sessions.

Preserve:

- Frozen New L0 research.
- N/original research.
- Assignment 3 compressed candidate populations.
- Previous GPU Phase 6 evidence.
- Existing acceptance history.
- Research manifests and hashes.
- Strategy Lab functionality.
- The current optimization methodology.

Keep reusable backend integration changes distinct from pilot-specific fitness and selection changes.

Do not merge experimental pilot selection/fitness rules into `main`.

If shared backend changes require merging or acceptance renewal across branches, document the integration plan and maintain the correct acceptance boundary. Do not force an unsafe merge.

Do not delete or overwrite historical artifacts to save space.

Do not reboot or shut down Apollo as part of this assignment.

---

## 11. Required deliverables

Produce a self-contained readiness package.

At minimum:

### A. `PREREQUISITES_READY.md`

A concise executive report stating whether the infrastructure is ready for pilot execution.

Include successful checks, failures, caveats and remaining decisions.

### B. Risk-metric integration specification

Document all new or modified evaluation interfaces, schemas, units, cache identities, compatibility guarantees and error handling.

### C. CPU/GPU parity report

Provide numerical comparison evidence, selected candidate records, threshold-edge tests and any discrepancies.

### D. GPU acceptance evidence

Provide acceptance status, source/binary hashes, environment details, external pin verification and executed acceptance commands.

### E. Pilot protocol for review

A complete proposed protocol with explicitly unresolved decisions.

### F. Repository and archive restoration report

Describe:

- Actual post-cleanup Git revisions.
- Compressed archives inspected.
- Archives temporarily restored.
- Hash and SQLite verification.
- Temporary storage usage.
- Preservation of compressed originals.
- Final Git/working-tree status.

### G. Execution plan

Provide exact proposed official pilot commands, job names, paths, budget allocations and expected resource use.

**Do not execute those commands.**

### H. Machine-readable readiness manifest

Include code/data hashes, environment identity, accepted backend, required fields, test outcomes, protocol status, blockers and whether pilot execution is authorized.

### I. Portable ZIP handoff

Package the relevant reports, specifications, protocol and evidence into a ZIP suitable for review in the original Margin Trading ChatGPT conversation.

Do not include enormous datasets or unnecessary archive copies.

---

## 12. Final readiness gate

Before declaring readiness, confirm all of the following:

- Verified post-cleanup repository lineage.
- Correct handling of the compressed Assignment 3 archives.
- Preserved historical New L0 and N/original results.
- Correct pilot risk-metric delivery.
- Exact supported CPU/GPU parity.
- Valid GPU acceptance.
- Correct percentage normalization and denominators.
- Preserved original optimization search behavior.
- No unexpected Strategy Lab regressions.
- Clean or fully explained Git state.
- Reproducible official job configuration.
- A complete pilot protocol ready for user review.
- No actual pilot optimization started.

If any requirement is unmet, identify the specific blocker and do not claim full readiness.

**Most importantly: The user must review and approve the readiness package before the actual pilot starts.**

## Final instruction

Complete the prerequisite engineering and verification work, produce the readiness package, and stop.

Do not start the 300,000–500,000-evaluation risk-envelope pilot.

Do not automatically modify the permanent optimization standard, nominate a replacement for New L0, or deploy any strategy.

Finish your final response with this exact line:

**PILOT NOT STARTED — awaiting original-conversation review and separate authorization**
