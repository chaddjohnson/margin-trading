# Brief (verbatim, received 2026-11-27 ~19:15Z)

# Assignment 1 of 2 — Research Date Boundaries: Remediation and Strategy Lab Integration

## 1. Context

Continue the work completed on:

- Branch: `feature/research-date-boundaries`
- Reported HEAD: `9d2eaec4`
- Previous assignment documentation: `docs/data-updates/2026-11-27/`
- Primary report: `docs/data-updates/2026-11-27/REPORT.md`
- Verified commands: `docs/data-updates/2026-11-27/RUN_COMMANDS.md`

Read the previous assignment's reports, implementation, tests, and relevant repository documentation before proceeding.

The previous assignment successfully established:

- One canonical minute-level data file per security.
- Explicit, versioned research date ranges.
- Immutable research range R1.
- Development through December 31, 2024.
- Formal validation through October 30, 2026.
- Historical byte-prefix preservation and verification.
- Market data vintage tracking.
- Optimization standard 4.0.0.
- Updated VGT and GDX data through November 25, 2026.
- A manual evaluation runner supporting research, all, and custom windows.
- Exact reproduction of the historical N/original results.
- An extended manual N/original evaluation through November 25.

These changes are accepted in principle.

However, several outstanding implementation, compatibility, and usability issues need to be resolved before final GPU re-acceptance and integration into `main`.

This is the first of two assignments.

## 2. Objectives and Priorities

Execute the following work in priority order, subject to technical dependencies:

| Priority | Task |
|---|---|
| P0 | Repository state, active research, and cross-branch compatibility audit |
| P1 | Strategy Lab portfolio date selection and extended trade visualization |
| P1 | Effective execution date reporting |
| P2 | Historical research reproducibility improvements |
| P2 | Restore normal `npm run app` functionality |
| P2 | Clarify the optimization standard's treatment of post-validation evidence |
| P3 | Comprehensive implementation verification and preparation for final acceptance |

The most important user-facing objective is to allow me to run N/original in Strategy Lab using all available market data and visually inspect its newly generated trades.

Do not perform final GPU re-acceptance or merge into `main` during this assignment.

---

## 3. P0 — Repository State and Cross-Branch Compatibility

Before making further changes, establish the current repository and execution environment.

Investigate:

- Current branch and HEAD.
- Local and remote branch status.
- Uncommitted changes.
- Active Git worktrees.
- Active research branches.
- Running optimization or research processes.
- CPU/GPU acceptance records and their current validity.
- Risk-envelope pilot implementation and readiness branches.
- Any active research processes that depend on the canonical market data files.

The canonical market data files are Git-ignored. Consequently, switching Git branches does not necessarily restore the historical market data expected by those branches.

The previous assignment appended data to VGT and GDX. Determine whether this has affected, or could affect:

- `main`.
- Active research branches.
- Existing worktrees.
- Ongoing optimization processes.
- Historical whole-file hash checks.
- Historical data doors.
- GPU acceptance verification.
- Existing CPU/GPU parity checks.
- Risk-envelope pilot readiness and execution.

Pay particular attention to active or recently approved research that may depend on the previous canonical file lengths or hashes.

### Requirements

- Do not interrupt ongoing optimization or research processes.
- Do not overwrite another branch's uncommitted changes.
- Do not truncate or roll back the updated canonical market data files.
- Do not duplicate the canonical datasets merely to accommodate older branches.
- Do not modify active research branches without a compelling, documented reason and separate authorization.
- Do not invalidate sealed historical evidence.
- Do not weaken existing integrity checks.

Where compatibility issues exist, identify a safe resolution using the existing historical-prefix and vintage mechanisms wherever practical.

Distinguish between:

1. Issues that can be resolved on `feature/research-date-boundaries`.
2. Issues that require integration of the feature branch.
3. Issues requiring changes to other active branches.
4. Issues requiring a historical reproduction environment.
5. Issues that must be deferred until Assignment 2.

Document the findings and any unresolved cross-branch dependencies.

---

## 4. P1 — Strategy Lab Portfolio Date Selection

### 4.1 Objective

Strategy Lab currently supports all-data and custom-date evaluations for individual securities, but portfolio evaluations remain restricted to their fixed historical benchmark window.

I want portfolio evaluations to support equivalent date-selection functionality.

For example, I should be able to select N/original, choose All, execute the portfolio, and inspect its trades through the latest common complete trading session available for VGT and GDX.

This functionality must not be specific to N/original.

### 4.2 Supported evaluation windows

Support the following portfolio evaluation modes:

| Mode | Behavior |
|---|---|
| Research | Evaluate using the portfolio's applicable historical research window. |
| All | Evaluate using the entire available dataset through the latest common complete trading session. |
| Custom | Evaluate using explicitly selected start and end dates. |

Reuse the existing Strategy Lab date-selection controls, conventions, backend interfaces, and visual design wherever possible.

Avoid introducing an alternative date-selection architecture solely for portfolios.

Preserve existing saved configurations and their behavior. Existing historical benchmark configurations must continue to resolve to their original windows unless the user deliberately selects another window.

The Research option must respect the applicable portfolio's historical research range. Do not silently substitute R1 for a portfolio whose originating research protocol established a different historical window.

### 4.3 Generality

Investigate all currently supported Strategy Lab portfolio types.

Implement a shared solution for supported portfolios rather than hardcoding functionality for VGT/GDX or N/original.

If particular historical portfolio types cannot safely support extended or custom windows, explicitly identify them and explain the limitation. Do not display a selectable mode that cannot actually be executed correctly.

### 4.4 Backend integration

Reuse the existing manual evaluation infrastructure where appropriate, including the runner introduced in the previous assignment:

```bash
npm run manual-eval -- --subject "N/original" --window all
```

Investigate whether the underlying execution functionality can be shared directly between the CLI and Strategy Lab.

Prefer a common typed execution interface over duplicating simulation logic.

Ensure that:

- Strategy Lab and CLI use equivalent execution semantics.
- The same portfolio configuration and parameters are used.
- Execution assumptions remain unchanged.
- Manual evaluation does not modify the portfolio's registered phenotype or benchmark definition.
- Manual access to extended data does not grant optimization or formal validation workflows unrestricted data access.

### 4.5 Multi-security data coverage

For portfolios requiring multiple securities:

- Determine the latest common complete trading session.
- Do not silently use inconsistent data endpoints.
- Do not fabricate missing prices or sessions.
- Do not silently evaluate a requested date beyond available coverage.
- Clearly communicate when a requested endpoint differs from the effective endpoint.
- Preserve the existing exchange calendar and session semantics.

### 4.6 Continuous simulation and custom windows

Preserve the continuous causal simulation semantics established for N/original in the previous assignment.

When using All, execution must continue through the historical research cutoff without resetting state.

Preserve applicable:

- Open positions.
- Entry eligibility.
- Shadow eligibility.
- Reference highs.
- Pending or armed setups.
- Trailing stops.
- Continuation windows.
- Loss restrictions.
- Shared capital allocation.
- Accrued interest.
- All other relevant strategy and allocator state.

For custom portfolio date ranges, investigate and document the existing execution and warm-up conventions.

For manual analysis of sealed historical portfolios, I generally prefer a continuous historical simulation with the requested reporting window applied to its resulting state and performance, rather than an artificial cold start at the requested start date.

However, do not silently change the semantics of existing evaluation modes. Clearly distinguish continuous-history reporting from isolated-window execution wherever both exist.

### 4.7 Visualization requirements

The extended portfolio runs must integrate with Strategy Lab's existing visualization functionality.

I should be able to inspect:

- Entry and exit markers on charts.
- Newly opened and closed positions.
- Trades spanning the historical validation cutoff.
- Trade-level realized and unrealized P&L.
- Equity curves.
- Drawdown curves.
- Individual constituent strategy activity.
- Portfolio-level performance statistics.
- Open positions and relevant final state, wherever currently supported.

Preserve existing chart interactions and usability.

Do not create a separate visualization system for manual portfolio evaluations.

### 4.8 N/original acceptance case

Use N/original as the primary integration acceptance case.

Based on the previous assignment, the expected reference results are:

| Metric | Research window | All available data |
|---|---:|---:|
| End date | 2026-10-30 | 2026-11-25 |
| Net profit | $482,700.73 | $477,002.83 |
| Maximum marked drawdown | $20,385.99 | $25,794.56 |
| Lots | 44 | 46 |
| Margin interest | $72,509.59 | $73,232.88 |
| Transaction costs | $4,630.40 | $4,875.26 |

These are reference values from the previous assignment, not values to hardcode.

If the canonical dataset has legitimately been extended again since that assignment, separately reproduce the November 25 reference using the appropriate bounded input, then evaluate the currently available data.

The extended chart and trade ledger must include:

- Lot 44: GDX, entered October 23 and carried across the validation cutoff; subsequently exited November 10.
- Lot 45: GDX, exited via its protective stop on November 20.
- Lot 46: VGT.

Verify the actual trade details against the previous manual evaluation artifacts.

The reported incremental November contribution of Lot 44 must not be incorrectly presented as its lifetime trade profit.

Confirm that the Strategy Lab execution matches the CLI execution, including the trade ledger and risk metrics, to the precision required by the existing parity methodology.

### 4.9 User-facing availability

Once the Strategy Lab implementation and relevant verification are complete, make the updated application available through my existing Strategy Lab access mechanism if this can be done safely without affecting ongoing research or other active services.

Investigate the established application hosting and deployment conventions before doing so.

Do not unnecessarily restart unrelated services.

Do not merge into `main` merely to make the feature available.

If a feature-branch build, separate deployment, or another established mechanism is required, use the safest appropriate approach.

If deployment would require disruptive infrastructure changes or separate authorization, provide the exact verified commands and explain the blocker.

My immediate objective is to open Strategy Lab, select N/original, choose All, and inspect the new trades.

---

## 5. P1 — Effective Execution Date Reporting

The previous assignment identified that Strategy Lab run views display the requested window rather than the effective execution window.

Correct this behavior.

Where applicable, distinguish:

- Requested start date.
- Requested end date.
- Effective simulation start date.
- Effective simulation end date.
- Effective reporting start date.
- Effective reporting end date.
- Available market data coverage.

Do not unnecessarily clutter the interface.

The primary displayed date range should accurately represent the results the user is viewing.

Additional execution and warm-up details can be shown through existing metadata, tooltips, or expandable details if appropriate.

For example, selecting All must not display a nominal future endpoint when the latest actual common trading session is November 25, 2026.

Ensure that exported results and persisted run metadata also record the effective dates where appropriate.

Update relevant cache identities so that different evaluation windows and data vintages cannot incorrectly resolve to the same cached result.

---

## 6. P2 — Historical Research Reproducibility

The previous assignment reported that some older completed studies now refuse execution at HEAD because they independently verify the SHA-256 hash of the entire canonical market data file.

Their original historical bytes remain intact, but the canonical files now contain additional rows.

I would prefer older studies to remain reproducible at HEAD wherever reasonably practical.

### 6.1 Inventory

Identify affected studies and categorize their dependencies.

For each affected study, determine:

- Original expected dataset coverage.
- Expected file length and hash, if available.
- Whether its expected historical input is an exact prefix of the current canonical file.
- Whether the relevant metadata already exists in the vintage registry.
- Whether a shared loader or resolver is used.
- Whether the study has independent whole-file hash checks.
- Whether the study is otherwise executable at HEAD.
- Whether the study remains reproducible at its original commit.

Distinguish actual observed reproduction failures from potential failures inferred from source inspection.

### 6.2 Compatibility mechanism

Investigate whether the existing historical-prefix or vintage resolver can provide a common, safe solution.

Prefer:

- Shared historical-input resolution.
- Explicit historical byte lengths and hashes.
- Verification of the exact historical input before parsing.
- Bounded reads of the existing canonical files.
- Existing archive or frozen-source mechanisms where appropriate.

Avoid:

- Creating permanent copies of canonical market data.
- Hardcoding unrelated study-specific exceptions into general loaders.
- Broadly rewriting completed research programs.
- Replacing meaningful integrity checks with permissive checks.
- Modifying sealed research manifests or results.

Where an older program legitimately requires the original complete historical file representation, determine whether a temporary, verified reconstruction mechanism is appropriate. Any such mechanism must be exceptional, reproducible, and must not introduce another permanent canonical dataset.

Do not automatically migrate every older research program if doing so would create substantial implementation risk.

### 6.3 Historical integrity

Preserve:

- Exact historical prices and timestamps.
- Exact historical dataset hashes over the applicable bytes.
- Historical execution behavior.
- Golden-master expectations.
- Historical candidate configurations.
- Existing sealed evidence.
- Original research date boundaries.

Do not rerun historical optimization or formal validation stages merely to demonstrate compatibility.

Use existing deterministic replay, parity, golden-master, and integrity verification mechanisms where appropriate.

### 6.4 Practical fallback

Where HEAD compatibility is impractical or would require invasive changes to historical research code, retain and document a verified commit-specific reproduction procedure.

The procedure must explain how the original expected data input is obtained and verified despite the canonical file having subsequently grown.

Provide a clear inventory distinguishing:

- Studies reproducible at HEAD.
- Studies restored to HEAD compatibility by this assignment.
- Studies intentionally requiring their original commit.
- Studies with unresolved reproduction issues.

---

## 7. P2 — Restore `npm run app`

The previous assignment reported that `npm run app` fails during its lint pre-step because generated Strategy Lab build files exist within other studies' cached directories.

Restore normal operation of the standard application command.

Investigate:

- Current lint configuration.
- Generated build output directories.
- Research cache directories.
- Existing ignore conventions.
- Why generated files are included in lint traversal.

Prefer narrowly appropriate lint exclusions for generated artifacts and research caches rather than deleting files.

Do not:

- Disable linting.
- Exclude maintained source code merely to suppress genuine lint failures.
- Delete potentially valuable research caches.
- Modify unrelated research artifacts.
- Suppress newly introduced source-code errors.

Verify that the normal `npm run app` entry point works again, using a non-destructive invocation appropriate to the application.

Document any remaining unrelated lint or application issues.

---

## 8. P2 — Optimization Standard Clarification

The previous assignment introduced optimization standard 4.0.0, including wording that manual runs on newer data are never research evidence.

I agree with the intended separation between formal historical research and manual evaluation, but the wording is overly restrictive.

Newer data must not be used to contaminate the existing historical research process. However, newly arriving market observations may provide valuable prospective evidence about a strategy that was genuinely frozen before those observations became available.

Clarify the standard to distinguish the following evidence categories.

### 8.1 Formal historical research

Includes:

- Optimization.
- Qualification.
- Candidate selection.
- Formal validation.
- Validation-neighborhood robustness testing.
- Other decision-bearing evaluations authorized by a historical research protocol.

These remain restricted to explicitly authorized date ranges.

Newly appended market data must not automatically extend those ranges.

### 8.2 Manual post-validation evaluation

Manual evaluation of an existing configuration against newly appended data is permitted.

Such evaluation:

- Does not extend formal validation.
- Does not automatically become optimization or qualification evidence.
- Must be clearly labeled.
- Must record the actual date range and data provenance.
- Must not silently influence the parameters, rules, or acceptance criteria of ongoing historical research.

Merely running a configuration against newer historical data does not establish that the evaluation is genuinely prospective.

### 8.3 Prospective performance evidence

A prospective evaluation may constitute legitimate research evidence when the necessary conditions are satisfied.

These should include, as applicable:

- The strategy or portfolio configuration was frozen before the relevant market observations became available.
- The complete decision-bearing configuration is recorded, including execution and allocator assumptions.
- The evaluation methodology and applicable acceptance criteria were established in advance where decision-bearing claims are intended.
- The provenance and timing of both configuration freeze and market observations are verifiable.
- Evaluation is causal.
- Results are not selectively reported.
- Strategy changes, if any, are explicitly versioned.
- Subsequent observations are not retrospectively represented as having been untouched before a configuration change.
- The evidence is reported separately from the original historical validation window.

Distinguish between:

1. An informal manual post-validation backtest.
2. A properly controlled prospective shadow evaluation.
3. Actual live trading performance.

These are not interchangeable evidence categories.

Do not retroactively classify N/original's November evaluation as a formally controlled prospective study unless the required provenance and methodological conditions can actually be established.

The objective is to prevent data leakage and retrospective selection while preserving the ability to collect legitimate forward-performance evidence.

### 8.4 Standard governance

Follow the repository's existing standard versioning, adoption, compatibility, and amendment procedures.

Determine whether this clarification requires a new standard version.

Do not edit an immutable or previously adopted standard version in place if repository governance prohibits doing so.

Preserve historical study adoption records.

Update applicable preflight checks, compliance documentation, and tests where necessary.

Do not begin a new prospective monitoring study during this assignment.

---

## 9. GPU Acceptance and Risk-Envelope Compatibility

The previous assignment correctly reported that GPU acceptance is STALE on `feature/research-date-boundaries` because files covered by the acceptance record were modified.

Final GPU re-acceptance is intentionally deferred until Assignment 2.

During this assignment:

- Investigate all GPU-related implications of the additional changes.
- Identify affected acceptance pins and verification mechanisms.
- Verify that historical bounded inputs remain equivalent to the accepted historical inputs.
- Investigate compatibility with the risk-envelope pilot.
- Preserve the existing fail-closed behavior.
- Ensure stale acceptance cannot be mistaken for valid acceptance.
- Run appropriate non-official deterministic CPU/GPU parity checks where useful and safe.
- Clearly distinguish diagnostic parity results from official GPU acceptance.

Do not:

- Perform official GPU re-acceptance.
- Generate a replacement acceptance record.
- Bypass stale-acceptance gates.
- Modify acceptance records to make them appear valid.
- Launch official GPU optimization jobs under stale acceptance.
- Start the risk-envelope pilot.
- Perform new strategy optimization.

Assignment 2 will explicitly authorize the fixed-seed engineering optimization required by the official GPU re-acceptance procedure.

The objective now is to complete the remaining implementation work so that the acceptance can be performed once against the final intended code state.

---

## 10. Verification and Regression Testing

Add or extend automated tests covering all new functionality and relevant compatibility concerns.

### 10.1 Strategy Lab

Verify:

- Historical portfolio evaluation remains unchanged.
- All-data portfolio evaluation includes appended market data.
- Custom portfolio evaluation respects its documented semantics.
- Effective dates are displayed correctly.
- Requested dates and effective dates are distinguished where necessary.
- Multi-security coverage is handled correctly.
- Trades crossing historical research boundaries are represented correctly.
- Newly appended trades appear in charts and trade ledgers.
- Portfolio execution matches CLI execution.
- Saved portfolio configurations remain compatible.
- Cache keys distinguish date windows and data vintages.
- Newly extended data cannot return stale historical results.
- Existing single-security evaluations remain unaffected.
- Existing chart functionality remains unaffected.

Use N/original as the primary end-to-end acceptance case, together with representative additional portfolio configurations.

### 10.2 Research integrity

Verify:

- R1 remains immutable.
- Formal optimization and validation boundaries remain unchanged.
- Extended manual data access does not leak into optimization or formal validation workflows.
- Historical input verification remains exact.
- Existing sealed records remain unchanged.
- Existing historical portfolio results remain reproducible.
- Historical-prefix verification rejects altered historical data.
- Standard adoption and preflight checks behave correctly.
- Historical study compatibility mechanisms do not weaken integrity requirements.

### 10.3 Application functionality

Run applicable:

- Type checking.
- Linting.
- Unit tests.
- Integration tests.
- Strategy Lab tests.
- Browser-based end-to-end tests, including Playwright where established.
- Production builds.
- Existing portfolio parity checks.
- Relevant historical reproducibility checks.

Where useful, capture screenshots demonstrating the extended N/original evaluation and trade visualization.

### 10.4 Existing test failures

The previous assignment reported:

- 1,890 tests passed.
- 10 tests failed.
- 4 tests skipped.
- Seven known pre-existing failures.
- Three stale-GPU-acceptance failures.

Re-establish the actual baseline before attributing failures.

Investigate and categorize remaining failures.

Do not automatically treat a failure as pre-existing merely because the previous report described it that way.

Where practical, resolve pre-existing failures that directly concern this assignment.

Unrelated failures should be documented rather than prompting uncontrolled scope expansion.

Stale-GPU-acceptance failures are expected to remain until Assignment 2, provided their behavior is correct.

Do not weaken tests or modify expected historical results merely to obtain a passing suite.

---

## 11. Deliverables

Create a dedicated documentation directory consistent with the existing repository's documentation conventions.

Include the following deliverables, combining files where appropriate.

### 11.1 Implementation report

Document:

- Starting repository state.
- Scope completed.
- Architectural decisions.
- Changes made and their rationale.
- Existing functionality reused.
- New functionality introduced.
- Deviations from this assignment.
- Unresolved issues and limitations.

### 11.2 Strategy Lab verification

Document:

- Supported portfolio evaluation modes.
- How to select and execute each mode.
- How requested and effective dates are represented.
- How to run N/original using all available data.
- CLI and Strategy Lab parity results.
- Historical and extended N/original results.
- Verification of the newly appended trades.
- Application build and deployment status.
- Screenshots where practical.

Provide clear, concise user-facing instructions for opening N/original in Strategy Lab and viewing the new trades.

### 11.3 Historical compatibility report

Document:

- Affected studies.
- Identified whole-file hash dependencies.
- Historical compatibility mechanisms.
- Studies reproducible at HEAD.
- Studies requiring their original commits.
- Verified reproduction commands.
- Unresolved reproduction issues.

### 11.4 Cross-branch compatibility report

Document:

- Active and relevant branches.
- Active worktrees and research processes.
- Effects of the appended canonical data.
- Required integration or compatibility changes.
- Risk-envelope pilot compatibility.
- Potential merge conflicts or dependencies.
- Any user decisions required before proceeding.

### 11.5 Test and integrity report

Document:

- Baseline test results.
- Final test results.
- New test coverage.
- Remaining failures and skipped tests.
- Historical integrity verification.
- Strategy Lab build and application verification.
- Diagnostic CPU/GPU parity, if performed.
- Confirmation that sealed historical artifacts remain unchanged.

### 11.6 Assignment 2 readiness

Provide a precise readiness checklist for final GPU re-acceptance and integration.

Identify:

- Outstanding GPU acceptance requirements.
- Relevant acceptance commands.
- Required fixed-seed optimization checks.
- Applicable CPU/GPU parity checks.
- Acceptance record and integrity dependencies.
- Branch reconciliation requirements.
- Remaining integration blockers.
- Any changes still needed before acceptance.

Provide verified commands wherever possible.

Do not execute Assignment 2.

---

## 12. Git and Repository Requirements

Continue on `feature/research-date-boundaries` unless a compelling technical reason requires a different approach.

Preserve the previous assignment's work.

Requirements:

- Make coherent, reviewable commits.
- Do not amend or rewrite previously pushed commits.
- Do not commit generated caches, large market data files, or unrelated artifacts.
- Do not modify sealed research artifacts.
- Commit all intended implementation and documentation changes.
- Push the completed feature branch.
- Verify that the remote branch matches the final local HEAD.
- Report the final commit hash.
- Report final Git status.
- Do not merge into `main`.
- Do not merge into other official research branches.

If integration dependencies arise, document them for Assignment 2.

---

## 13. Scope Restrictions

Do not:

- Change N/original's phenotype parameters.
- Modify D1 or Growth strategy logic.
- Change shared capital allocation behavior.
- Re-optimize any strategy or portfolio.
- Expand the R1 development or validation date ranges.
- Use post-validation data for historical candidate selection.
- Start new research studies.
- Start the risk-envelope pilot.
- Perform official GPU re-acceptance.
- Bypass GPU acceptance requirements.
- Duplicate canonical market data.
- Create additional permanent physical data partitions.
- Delete historical research evidence.
- Interrupt active research processes.
- Perform unnecessary refactoring.
- Merge into `main`.

Prefer the smallest robust and maintainable implementation that satisfies the requirements.

Where existing functionality is already correct, verify and reuse it.

---

## 14. Definition of Done

This assignment is complete when:

- Strategy Lab can execute N/original using the entire available dataset.
- I can inspect the newly appended trades through the existing Strategy Lab graphical interface.
- Supported portfolios have appropriate research, all-data, and custom-date evaluation modes.
- Effective execution dates are accurately reported.
- Historical N/original results remain unchanged.
- Strategy Lab and CLI execution results reconcile.
- Older research reproducibility is preserved or has a documented, verified reproduction mechanism.
- The normal application command works.
- The optimization standard properly distinguishes historical research, manual evaluation, and controlled prospective evidence.
- Cross-branch compatibility has been investigated and outstanding issues are documented.
- Relevant implementation and regression tests pass, apart from explicitly identified and justified outstanding failures.
- GPU acceptance remains correctly marked STALE until Assignment 2.
- All intended changes are committed and pushed.
- Nothing has been merged into `main`.

The final report should clearly distinguish completed work, unresolved issues, and decisions requiring my authorization.

Prioritize making the updated N/original evaluation usable in Strategy Lab. Do not unnecessarily defer that user-facing functionality until final GPU acceptance.
