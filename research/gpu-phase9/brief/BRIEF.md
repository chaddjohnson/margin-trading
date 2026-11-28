# Assignment 2 of 2 — Final Integration, GPU Re-acceptance, and Strategy Lab Service

## 1. Context and authorization

Continue the research-date-boundaries work completed in Assignment 1.

- Feature branch: `feature/research-date-boundaries`
- Reported final Assignment 1 commit: `f2c414ef` (remote reportedly verified equal).
- Original feature implementation commit: `9d2eaec4`.
- Original report directory: `docs/data-updates/2026-11-27/`.
- Assignment 1 report directory: `docs/data-updates/2026-11-27-assignment-1/`.
- Read `REPORT.md`, `ASSIGNMENT_2_READINESS.md`, the verified commands, compatibility findings, test evidence, screenshots where relevant, and the actual implementation before making changes.

The user accepts the Assignment 1 results in principle and authorizes the following work:

1. Reconcile and integrate the research-date-boundaries feature into `main` after successful acceptance.
2. Conditionally integrate `research/vg-l0-staged-trailing-stop` **only if its implementation has already been independently accepted and the combined implementation is demonstrably safe and compatible**. This is authorization to integrate an engine capability, not to adopt a new strategy or phenotype.
3. Integrate `fix/tsla-outcome-identity-join` after verifying the fix, resolving conflicts correctly, and testing the combined behavior.
4. Investigate and safely resolve the six remaining reported legacy test failures where practical.
5. Perform the official GPU re-acceptance procedure, including the required small, fixed-seed engineering mini-optimization. This explicitly supersedes Assignment 1's prohibition on that particular acceptance exercise.
6. Install and enable Strategy Lab as a permanent service after successful integration, preserving the existing application state, authentication, and access mechanism.
7. Verify risk-envelope pilot compatibility and readiness without launching the pilot.

Do not treat any of these authorizations as permission to change trading strategy rules or parameters, launch new research, weaken integrity controls, or interrupt ongoing jobs.

## 2. Required starting baseline

Assignment 1 reported:

- One canonical minute-data file per symbol, with explicit versioned research boundaries in `config/research/date-ranges.json`.
- R1 development: 2016-01-04 through 2024-12-31; formal validation: 2025-01-01 through 2026-10-30, inclusive exchange dates (first trading session in 2025 is January 2).
- VGT and GDX data through 2026-11-25, with historical prefixes preserved exactly.
- Optimization standard 5.0.0, distinguishing formal historical research, informational manual post-validation evaluation, pre-registered prospective shadow studies, and live trading.
- Portfolio Research, All, and Custom evaluation modes; Custom defaults to continuous-history reporting and also supports an explicitly selected cold start where appropriate.
- A common execution module for Strategy Lab and `npm run manual-eval`.
- Effective dates shown in run views; single-symbol charts bounded by the run's actual coverage.
- An exact historical-input reconstruction tool for completed studies whose sealed code checks whole-file hashes.
- `npm run app` works; its applicable lint scope reportedly covers 414 files without errors. Repository-wide lint still reports approximately 150 older errors in completed research code, including sealed code.
- Main test suite: 1,909 total, 1,896 passed, nine failed, four skipped (six legacy failures reportedly associated with missing lowercase `allin-original.ts`; three expected stale-GPU-acceptance failures).
- Strategy Lab: 334/334 unit tests and 83/83 browser tests passed.
- Diagnostic GPU/CPU parity: 102/102 matched for the research window and 102/102 for all available data, on the previously accepted binary; this is not official acceptance.
- GPU acceptance on the feature branch is deliberately STALE.
- Strategy Lab is currently hosted from the feature branch via a temporary user unit named `strategy-lab`, at the usual address `http://apollo:4317/`. It will not survive a reboot as currently configured.
- Strategy Lab portfolios on `main` reportedly fail with the appended data until the feature is integrated.

Treat these as reported baselines, not substitutes for verification. Re-establish the actual state before modifying it. If newer commits, data, services, or active jobs exist, preserve them and document the differences. Do not fetch additional market data as part of this assignment unless separately authorized; if someone else has already appended data, verify and account for it rather than reverting it.

### N/original reference results

These are acceptance references from the previous assignments, not hardcoded expected production outputs:

| Metric | Research through 2026-10-30 | All data through 2026-11-25 |
|---|---:|---:|
| Net profit | $482,700.73 | $477,002.83 |
| Maximum marked-equity drawdown | $20,385.99 | $25,794.56 |
| Lots | 44 | 46 |
| Margin interest | $72,509.59 | $73,232.88 |
| Transaction costs | $4,630.40 | $4,875.26 |

Post-validation contribution (November 2–25): −$5,697.90. The November period is informational manual evaluation, not formal validation or a pre-registered prospective study. N/original's reported freeze date was November 17, after the first November sessions.

| Lot | Lifetime net | Contribution after October 30 | Exit |
|---|---:|---:|---|
| P-44, GDX (entered October 23) | +$5,483.48 | +$11,048.24 | Trailing stop, November 10 |
| P-45, GDX | −$16,225.15 | −$16,225.15 | Protective stop, November 20 |
| P-46, VGT | −$520.99 | −$520.99 | Trailing stop (gap), November 25 |

Reproduce the exact previous records with the same execution assumptions. If the canonical files now extend beyond November 25, first reproduce the bounded November 25 run, then separately verify the latest All run. Do not interpret additional performance, tune parameters, or change historical evidence as part of this assignment.

## 3. Execution sequence and hard gates

Use the following order, allowing safe technical adjustments where documented:

| Stage | Work |
|---|---|
| A | Inventory repository, active jobs, branches, service, data and acceptance state; establish baseline and rollback plan |
| B | Verify eligibility of optional staged-stop integration; verify TSLA identity fix; reconcile authorized changes on an isolated integration branch/worktree |
| C | Resolve relevant legacy failures; test combined implementation, historical integrity, research boundaries, Strategy Lab, and risk-envelope readiness |
| D | Freeze the intended integration tree and acceptance inputs; execute official GPU re-acceptance |
| E | Verify all acceptance gates on the exact candidate for `main`, then integrate and verify final `main` |
| F | Install or migrate the permanent Strategy Lab service, verify operation and rollback procedures, and publish final documentation |

**Do not run official GPU acceptance until all intended acceptance-covered source/configuration changes are complete.** Do not merge an unaccepted official GPU execution path into `main`. If a later change invalidates the accepted pins, re-run the required official acceptance against the new intended final state before integration, rather than weakening verification.

The optional staged-stop branch must not become an artificial blocker for the core research-date-boundaries work: if it cannot pass the independent acceptance and compatibility gates, exclude it, report the reason, and proceed with the safe core and other verified changes. If a necessary core gate fails, stop before promotion, preserve evidence and report the blocker.

## 4. Stage A — Repository and operational safety audit

Inspect the actual local and remote state of:

- `main` and `feature/research-date-boundaries`.
- `research/vg-l0-staged-trailing-stop` (reported Phase 8 acceptance, Growth engine 1.5.0).
- `fix/tsla-outcome-identity-join` (reported conflict in `identityJoin.ts`).
- Relevant risk-envelope pilot readiness/implementation branches and any other active official research branches.
- Active worktrees, uncommitted changes, background processes, CPU/GPU jobs, GPU allocation and resource constraints.
- Canonical market-data files, historical prefixes, vintage registry, shared and study-specific data doors, and current acceptance records.
- The existing Strategy Lab service/unit, live build, configuration, state, authentication, and port binding.

Identify the ancestry and exact commits intended for integration, including any transitive dependencies. Distinguish shared market data from worktree-local data and caches. Verify that appending data has not silently broken active jobs or other branches. Do not assume Git checkout restores Git-ignored data.

Establish a safe integration worktree/branch based on the appropriate current `main` lineage. Do not disturb ongoing research, change its input files, overwrite local changes, force-push, or rewrite published history. Do not check out another branch over the running service's working tree. Do not terminate GPU jobs to make resources available. Coordinate acceptance resource usage with existing jobs; if safe resources are unavailable, record a blocker rather than interfering or bypassing controls.

Record baseline test results and verified input hashes. Prepare a rollback plan for the candidate integration, GPU acceptance state, and Strategy Lab service deployment. Keep the existing working feature-branch service available until a replacement is ready, subject to safe service transition. Preserve user data and avoid copying large canonical files unnecessarily.

## 5. Stage B — Conditional branch integration

### 5.1 Staged trailing stops: optional, gated integration

The user approves integration only if it will not compromise existing functionality, research integrity, or accepted strategies. Absolute absence of future bugs cannot be proven; provide concrete, testable non-regression evidence rather than assurances.

Before integrating `research/vg-l0-staged-trailing-stop`:

1. Read its implementation, protocol, engineering/research reports, independent review or acceptance artifacts, Phase 8 GPU acceptance record, and known limitations.
2. Verify that the exact implementation revision proposed for integration was independently accepted according to the repository's existing governance. A self-authored implementation report, a passing test suite alone, or a stale acceptance record is not sufficient. Distinguish independent implementation review, research findings, and GPU acceptance. Do not claim independent acceptance if it cannot be established; do not manufacture a reviewer sign-off.
3. Verify that the branch has a clean dependency chain suitable for integration. Audit its diff against the common base, including incidental changes, engine versioning, schema migrations, optimizer search spaces, GPU ABI/kernel changes, and acceptance pins.
4. Confirm that staged stops are an opt-in capability and that every existing registered, sealed, or production/reference phenotype continues to use its original execution behavior. Do not enable staged stops by default, change default parameter resolution, expand active study search spaces, or promote research candidates merely by merging the capability.
5. Verify backward compatibility of existing Growth configurations and engine dispatch, serialization, identity and cache semantics, CPU/GPU behavior, Strategy Lab, and risk-envelope calculations. If an engine version change affects historical reproduction, preserve the original engine/version path rather than silently reinterpret old phenotypes.
6. Verify historical parity for N/original, New L0, relevant Growth and D1 controls, and other established compatibility fixtures. Include both strategy-state/decision traces and economic outputs, not just aggregate P&L.
7. Verify opt-in staged-stop behavior using already established test fixtures and previously accepted reference cases. Check causal stop activation/ratcheting, gap fills, execution ordering and interaction with risk metrics wherever those mechanisms are affected. Do not launch a new staged-stop research study or optimize its parameters.
8. Confirm compatibility with the date-boundary changes, standard versioning, historical vintage resolution, TSLA identity fix, and risk-envelope infrastructure.

If all these conditions pass, integrate the independently accepted capability and its required compatible dependencies into the candidate. Keep research-only phenotypes research-only. If any condition fails, omit the branch from this release or revert its candidate integration without disturbing its original branch. Document which gate failed, whether a follow-up is necessary, and whether its exclusion affects the core release.

Do not integrate unrelated exploratory work or cherry-pick only selected pieces of the staged-stop implementation if doing so would invalidate the independent acceptance or create an unreviewed combination. The final combined implementation must undergo the full official GPU acceptance regardless of the previous Phase 8 record.

### 5.2 TSLA outcome identity fix

Verify `fix/tsla-outcome-identity-join` against its underlying problem, reported evidence, and regression tests before integration.

- Establish the intended behavior and exact identity semantics, including why the fix is needed.
- Inspect the reported conflict in `identityJoin.ts` and all relevant callers, types and data structures.
- Resolve the conflict semantically, preserving both the TSLA correction and any date-boundary, staged-stop, or GPU/risk-related changes that are intended to coexist.
- Verify joins and identity keys with existing regression fixtures, including applicable duplicate, missing, ambiguous, or mismatched identities; failures must be explicit, not silently mapped to unrelated outcomes.
- Verify that results for previously correct configurations remain unchanged, and explain any intentional TSLA correction separately. Do not rewrite or relabel sealed historical results to account for a bug fix.
- Check whether existing artifacts produced by the defective path need a provenance warning. Report affected scope without launching a new TSLA optimization.

If the fix cannot be safely reconciled, do not discard functionality or force a merge to satisfy this assignment. Document the blocker and preserve the branch. Proceed with a safe core integration only if the unresolved TSLA issue is demonstrably independent and does not invalidate required acceptance gates; otherwise stop before promotion.

### 5.3 Risk-envelope branch reconciliation

Audit the relationship between the candidate, the risk-envelope readiness implementation, and any staged-stop dependencies. Determine whether the readiness branch already contains required infrastructure or needs a compatible integration/rebase in the future.

Integrate only independently authorized, necessary, reviewed dependencies. Do not silently merge the entire risk-envelope pilot branch, start pilot jobs, authorize its research protocol, or alter its approved risk limits. The goal is to preserve compatibility and establish precisely what remains necessary to run the pilot safely once separately authorized.

## 6. Stage C — Legacy tests, combined non-regression, and research integrity

### 6.1 Six reported legacy test failures

Reproduce the failures from the actual baseline. Investigate the missing lowercase `allin-original.ts` reference, including case-sensitive Linux paths, historical source naming, frozen-source reconstruction, archive manifests and applicable callers.

Prefer a minimal, correct compatibility fix that preserves historical source provenance. Do not create a speculative replacement strategy, fabricate missing source, change a sealed source or golden expected result, suppress the tests, or broaden skips to hide failures.

Where exact source is recoverable from Git history or an established verified archive, use the repository's existing frozen-source mechanisms. If missing source cannot be recovered exactly, document the affected tests, evidence, and reproduction limitations rather than inventing a substitute. Resolve all six if practical and safe. A remaining verified unrelated legacy limitation may be reported as such, but no new, unexplained or acceptance-relevant failure may be waived.

Preserve `npm run app` functionality and its correct lint scope. Do not undertake a repository-wide cleanup of sealed or unrelated historical code simply to eliminate pre-existing lint errors.

### 6.2 Research date boundaries and data integrity

Confirm the combined implementation retains all Assignment 1 behavior:

- One canonical market-data file per symbol.
- Immutable R1 and its explicit date ranges; historical studies retain their own frozen ranges.
- Optimization, qualification and formal validation cannot read unauthorized future prices, including via warm-up, alternate code paths, GPU exports, neighborhood robustness, or caches.
- Historical prefix and vintage hashes are verified before bounded data use; modified historical bytes fail closed.
- Appending data cannot implicitly change historical research ranges or sealed results.
- Manual full-data and custom-date evaluations remain available, distinct from formal research.
- Optimization standard 5.0.0 remains effective (or a legitimate successor only if already authorized under repository governance); historical adoptions and seals remain intact.
- Historical reproduction tooling still works using verified historical inputs at the appropriate commit without permanent canonical duplication.
- Existing sealed evidence, study artifacts, archives and historical configurations are not rewritten.

Run the established historical integrity and parity checks. Verify at least the two previously demonstrated historical reproduction cases, `vg-l0-full-joint` (reported 47 seals) and Priority 2 (reported byte-identical door pins), along with any additional cases directly affected by integration. Avoid reopening sealed holdouts or rerunning completed research selection merely to test compatibility.

### 6.3 Strategy and portfolio regression

Verify the unchanged N/original and New L0 reference configurations and relevant D1/Growth baselines on their appropriate pinned datasets. Where applicable, compare:

- Exact phenotype identities and parameter vectors.
- Trade, fill, stop, and allocator decisions.
- Eligibility and shadow eligibility state.
- Open/closed positions and continuation windows.
- Equity marks, P&L, interest, costs and drawdowns.
- Risk-envelope metrics and denominator conventions.
- CPU/GPU numerical and decision parity according to the established acceptance standard.

Check that the combined source does not accidentally select a staged-stop configuration or otherwise change the existing production/reference phenotype behavior. If an expected change is intentional (e.g. the TSLA identity bug fix), isolate it from unrelated strategy behavior and document the affected scope.

### 6.4 Strategy Lab regression and parity

Verify:

- Research, All, and supported Custom portfolio windows remain available and accurate.
- Continuous versus cold-start semantics are explicit and unchanged from Assignment 1.
- Effective dates, common complete-session endpoints, and data provenance are correctly displayed and recorded.
- CLI/Strategy Lab parity, including lots crossing the cutoff, equity and drawdown curves, P&L attribution, and trade chart markers.
- Historical and extended N/original reference results in Section 2; period filtering after October 30; the three November lots; fill-to-chart navigation.
- Cache identity separates relevant code/engine, data vintage, portfolio configuration and window semantics; no stale results are returned following relevant changes.
- Saved runs and portfolio configurations remain compatible; single-security behavior is unchanged.
- Existing authentication, state storage and service configuration are not compromised.

Run relevant unit, integration, Playwright/browser, build, type-check and lint checks. Verify `npm run app` using the established non-destructive invocation. Do not claim a browser or deployment check if only source inspection was performed.

### 6.5 Risk-envelope pilot readiness

Verify the combined implementation preserves the pilot's existing metric definitions, percent normalization, fixed allocation denominators, chronological decisions, and official GPU authorization path. Specifically inspect the existing approved or proposed pilot configuration rather than reconstructing it from this prompt.

Use established deterministic fixtures, parity and preflight checks to establish compatibility. Confirm the status of required protocol adoption, job configuration, GPU acceptance, branch dependencies, and any remaining blockers. If the pilot was already blocked on missing code or an unapproved execution manifest, report that accurately; do not fabricate readiness or implement an entire pilot as a side effect of this assignment.

**Do not launch a risk-envelope pilot optimization.** The only optimization authorized here is the fixed-seed official GPU engineering acceptance exercise described below.

## 7. Stage D — Official GPU re-acceptance

After all intended implementation and compatibility changes are complete, freeze the final candidate source/configuration state before executing official acceptance.

### 7.1 Acceptance plan

Read `ASSIGNMENT_2_READINESS.md` and the authoritative repository GPU acceptance procedure, including any Phase 6/7/8 requirements applicable to the final combined implementation. Do not guess commands, budgets, or acceptance thresholds. Identify the exact source/configuration pins, data doors, accepted engine variants, binary/export hashes, hardware/device requirements, fixtures, and required evidence.

Document the acceptance-covered candidate tree, environment, GPU device, Node/runtime version and relevant settings. Verify the pinned historical GPU input is byte-identical to the expected historical export. If staged-stop integration is included, use the acceptance scope covering that implementation as well as the existing supported paths. Do not narrow acceptance to an older engine simply because its previous record is easier to reproduce.

Confirm that executing the required workload will not interfere with existing jobs or exceed safe resource limits. Preserve acceptance records on other branches and do not repurpose them as evidence for a different source tree.

### 7.2 Authorized engineering optimization

The user explicitly authorizes the small fixed-seed mini-optimization required by the official GPU re-acceptance protocol, together with all other required engineering parity and verification stages.

This authorization is limited to the established acceptance workload, using its predetermined fixtures, seed, budget, inputs, and pass/fail criteria. Its purpose is to verify engineering equivalence, not to discover or select profitable configurations.

- Do not use extended post-R1 market data for any optimization or decision-bearing research.
- Do not expand the search budget beyond the established acceptance requirements or launch unrelated studies.
- Do not promote acceptance-generated candidates, modify phenotypes, or feed results into ongoing research selection.
- If the established acceptance protocol requires additional workload materially outside the authorized fixed-seed engineering scope, report the discrepancy rather than silently expanding this assignment.

### 7.3 Official verification

Run the complete applicable official acceptance sequence, not merely a diagnostic GPU comparison. Follow the established requirements for CPU/GPU parity, numerical precision, search decision equivalence, candidate ordering, risk metrics, binary rebuild, device verification, input pins and any out-of-band verification/pinning. Preserve original evidence and official record lineage.

Use the repository's established mechanism for generating and verifying the new acceptance record. Do not hand-edit a stale record, change expected hashes to match unverified content, disable gates, or weaken numerical acceptance tolerances.

Required final evidence:

- Applicable official acceptance stages passed.
- Official acceptance record reports ACCEPTED and the authoritative verifier reports VERIFIED for the intended final implementation.
- Official execution gate opens for correctly authorized, supported jobs and rejects stale/altered/unauthorized contexts.
- Previously expected stale-acceptance test failures resolve through real acceptance, not suppression.
- All required acceptance records are traceable to their exact code, binary, input and environment identities.

If the official acceptance fails, preserve logs and the failing evidence, diagnose and correct within the approved scope, and rerun the applicable complete acceptance procedure for the changed state. If it cannot be resolved safely, do not promote the candidate into `main`.

## 8. Stage E — Final integration into `main`

### 8.1 Pre-promotion gate

Before modifying `main`, verify all of the following against the actual candidate and latest remote `main`:

- Approved branch changes reconciled; optional staged-stop inclusion or exclusion explicitly justified.
- No unintended strategy/phenotype/allocator changes or modifications to sealed evidence.
- Historical data prefixes and date boundaries remain exact.
- N/original and relevant baseline replays reconcile.
- Research and manual-evaluation access controls remain effective.
- Relevant tests and builds pass, with no new, unexplained, or acceptance-relevant failures. Any remaining unrelated legacy failure has a documented baseline, cause, scope and rationale for not repairing it.
- Official GPU acceptance is valid for the actual intended resulting source/configuration state.
- Risk-envelope compatibility and outstanding requirements are documented.
- Safe service deployment and rollback plans are available.
- Active research jobs and other worktrees are protected.

If `main` advanced during this assignment, inspect and reconcile the new commits safely. Do not assume an acceptance record remains valid following a merge/rebase. Use a candidate tree that matches the actual intended integration state, and verify any commit-sensitive pins according to repository governance. If the intended merge changes acceptance-covered inputs, repeat the required acceptance before promotion. Prefer a promotion strategy that preserves the already accepted tree and satisfies commit identity requirements where possible.

### 8.2 Merge and post-merge verification

The user authorizes merging into `main` and pushing the accepted result **only after the required gates pass**.

- Use the repository's established integration conventions. Preserve traceability to the original branches and reports.
- Do not force-push, rewrite published history, delete branches, or silently integrate unrelated work.
- Verify the final local and remote `main` commit and tree.
- Run the authoritative GPU verifier against the actual final `main`, including the official gate check; do not rely solely on a pre-merge branch result.
- Re-run critical historical and Strategy Lab smoke/parity checks on final `main`.
- Verify `main` now reads the extended canonical files without breaking historical portfolio evaluations.
- Confirm the final accepted record and required artifacts are available through the established mechanism, including any local/device-specific dependencies; do not commit secrets, machine credentials or prohibited large artifacts.

If post-promotion verification unexpectedly fails, fail closed immediately, do not launch official GPU jobs, and follow the documented safe recovery/revert procedure without rewriting remote history or disturbing active work. Report the exact final state. Do not claim integration success unless the final `main` itself verifies.

## 9. Stage F — Permanent Strategy Lab service on Apollo

After final `main` has passed the required verification, install or migrate Strategy Lab from the current temporary unit to the repository's established permanent service mechanism.

The previously reported command is:

```bash
npm --prefix apps/strategy-lab run service:install -- --enable
```

Verify the actual current command, unit contents and supported options before running it. Use established service tooling rather than introducing a separate hosting architecture unnecessarily.

### Requirements

- Run from a deliberately selected, verified build of the accepted `main` implementation, not a mutable research worktree or an arbitrary stale `dist`.
- Preserve the existing URL/address (`http://apollo:4317/`), port, intended network/VPN accessibility, authentication/token, persistent application state, saved configurations and relevant data paths.
- Do not weaken network binding, authentication, firewall, or token handling. Do not print secret tokens into reports, logs, screenshots or commits.
- Ensure the service is enabled and starts automatically at boot without requiring an interactive login, using the established system/user service mechanism. If a user unit requires lingering, verify its current setting and use the minimum necessary change if permitted; do not make unrelated privileged system changes or request credentials in logs. If a privileged step is genuinely required and unavailable, document the exact blocker and commands for the user.
- Ensure automatic recovery from unexpected process failure using the established appropriate restart policy, without creating an uncontrolled restart loop.
- Avoid duplicate instances or a port collision with the temporary unit. Inspect the previous service, prepare the replacement build first, and perform a controlled minimal-disruption transition. Do not stop unrelated units, jobs, or containers.
- Preserve state and prepare a safe rollback to the known working feature-branch service or previous verified build. Avoid destructive state migrations; if any migration is necessary, verify recoverability before deployment.
- Do not reboot Apollo just to demonstrate boot persistence, especially if research jobs are running.

### Service verification

Verify actual service status, enablement, effective executable/build identity, configured restart behavior, logs, state paths and network binding. Test the service from the available intended access path; distinguish local HTTP checks from a real remote/browser check if the latter is unavailable. Use a controlled service restart only if safe to confirm persistent state and recovery; verify boot configuration without claiming that an actual reboot occurred.

Confirm the following URL works with the existing authentication mechanism:

```text
http://apollo:4317/#/portfolio/n-original?window=all
```

Verify the Research/All/Custom modes and November trade visualization on the deployed build, including the post-cutoff positions filter and fill-to-chart navigation. The historical benchmark and extended run must continue matching the reference figures for the corresponding endpoints.

Provide concise instructions for service status, logs, restart, stop/start and safe recovery, using verified commands. Explain whether the permanent unit replaces the temporary unit and whether a reboot is required for anything (do not perform one).

## 10. Final reports and deliverables

Create a dedicated Assignment 2 documentation directory consistent with the earlier assignments, for example `docs/data-updates/2026-11-27-assignment-2/` if appropriate. Use the actual execution date and repository conventions where necessary. Do not rewrite Assignment 1's completed report or sealed study artifacts.

Provide a consolidated `REPORT.md` and supporting evidence/command files as appropriate, including:

### A. Integration and branch disposition

- Starting and final local/remote commits and tree identities.
- Branch ancestry, integrated commit ranges, conflict resolutions, and dependencies.
- Explicit INCLUDE or EXCLUDE decision for staged trailing stops, the independent acceptance evidence, compatibility tests, and exact reasons.
- TSLA identity fix disposition and regression evidence.
- Risk-envelope branch relationship and remaining dependencies.
- Active jobs/worktrees and confirmation of non-interference, or any exceptions.

### B. Tests and historical integrity

- Baseline versus final test counts (passed, failed, skipped); identify each remaining failure or skip and its origin.
- Disposition of all six reported legacy failures and the three stale-acceptance failures.
- Unit/integration/browser/build/type-check/lint results and `npm run app` verification.
- Historical prefix/vintage and seal verification; historical reproduction commands and outcomes.
- N/original, New L0, and relevant strategy parity results; note any intentional TSLA-only differences.
- Confirmation that historical research ranges, phenotype identities and sealed evidence remain unchanged.

### C. Official GPU acceptance

- Exact acceptance procedure and commands executed, fixed-seed mini-optimization scope, environment and candidate identity.
- Acceptance stage results, relevant CPU/GPU comparisons, required parity and risk-metric checks.
- Acceptance record identity, pin verification, status and official gate status on final `main`.
- Any failed attempts and corrective changes, with preserved evidence.
- Remaining acceptance limitations, if any; distinguish official results from diagnostics.

### D. Strategy Lab deployment

- Permanent service installation and enablement status, actual build/commit, and state/authentication preservation.
- Existing access URL and instructions for using N/original All and viewing November trades.
- Deployment and browser/HTTP verification results; clearly distinguish verified boot configuration from an actual reboot test.
- Verified service management and rollback commands.

### E. Risk-envelope pilot readiness

- Compatibility checks completed, actual readiness status, and explicit remaining blockers or required actions.
- Whether additional branch integration, protocol adoption, acceptance records, or job configuration remains necessary.
- Confirmation that no pilot or other research optimization was launched.

### F. Final status and repeatable commands

Provide a verified `RUN_COMMANDS.md` or equivalent for key acceptance, historical reproduction, Strategy Lab service, and manual portfolio evaluation operations, including:

```bash
npm run manual-eval -- --subject "N/original" --window research
npm run manual-eval -- --subject "N/original" --window all
```

Verify the exact syntax for a custom window reproducing the November 25 endpoint and any additional flags needed. Do not fabricate command results.

Summarize completed work, exclusions, known residual issues, deviations, user decisions (if genuinely necessary), and whether `main` is safe for official GPU work. Report final Git status and remote verification. Commit and push intended documentation and implementation changes using the established workflow; verify whether any documentation-only post-acceptance commit affects acceptance pins, and re-verify the actual final `main` after all commits. Keep acceptance evidence and service reports free of secrets.

## 11. Scope restrictions

Do not:

- Change D1, Growth, New L0, N/original, or other existing phenotype parameters or their effective execution behavior. The separately accepted, optional staged-stop engine capability may be integrated only under Section 5.1, without activating it in existing phenotypes.
- Adopt staged trailing stops as a production strategy, change existing search spaces/defaults, or promote new configurations.
- Perform any strategy optimization except the specifically authorized official fixed-seed GPU acceptance exercise.
- Launch the risk-envelope pilot, new TSLA studies, new prospective studies, or other research work.
- Expand R1 or retrospectively alter a study's validation, acceptance criteria or evidence classification.
- Use post-validation data for optimization, qualification or formal historical validation.
- Modify sealed historical research records, fabricate missing historical inputs, weaken integrity checks, or hide failed tests.
- Create additional permanent canonical data files or partitions; truncate/rewrite canonical data to accommodate another branch.
- Interrupt active research jobs, force-push or overwrite another worktree's changes.
- Merge an unaccepted official GPU execution path into `main`, bypass official acceptance, or claim that a diagnostic GPU run constitutes acceptance.
- Make unrelated infrastructure changes, reboot Apollo, expose authentication secrets, or weaken Strategy Lab access controls.
- Expand scope into unrelated refactoring or historical lint cleanup.

## 12. Definition of done

The assignment is successful when:

1. Research-date-boundaries functionality is safely integrated into final remote `main`.
2. The staged-stop capability is either integrated with documented independent acceptance and combined non-regression evidence, or explicitly excluded because its safety gate was not satisfied. Existing phenotypes remain unchanged in either case.
3. The TSLA identity fix is safely integrated and verified, or a genuine blocker is explicitly reported without compromising the accepted core implementation.
4. The six remaining legacy failures have been investigated and safely resolved where possible; no new, unexplained or acceptance-relevant failures remain.
5. Official GPU re-acceptance is complete, including the authorized fixed-seed engineering optimization, and the authoritative verifier confirms valid acceptance on final `main`.
6. Historical dataset boundaries, exact historical inputs, results, sealed evidence and research governance remain intact.
7. N/original and relevant reference strategies reproduce their established results; extended manual evaluation remains available in Strategy Lab and the CLI.
8. Strategy Lab is running from the accepted implementation as a permanent enabled service, with existing state/authentication preserved and recovery behavior verified to the extent safely possible. Any unavoidable operational blocker is explicitly identified.
9. Risk-envelope pilot compatibility and actual remaining readiness requirements are documented, without launching the pilot.
10. All intended changes and reports are committed and pushed, final remote state is verified, and the final acceptance record remains valid after all commits.

Do not treat the optional branch or service installation as reasons to force unsafe changes. If a required promotion gate cannot be satisfied, leave the feature/integration branch in a safe, documented state, preserve the working Strategy Lab deployment, and report precisely what prevents completion rather than declaring success.
