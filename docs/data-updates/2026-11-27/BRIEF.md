# Brief (the user's message of 2026-11-27, verbatim)

Recorded on disk so that a later session, and the records that cite it, can rely on it (docs/claude/context-recovery.md
§2.2). It is the authorization for this task's changes (standard 4.0.0, the research date ranges R1, the VGT/GDX
append through the latest complete session, the manual N/original run).

---

# Explicit Research Date Boundaries and Continuously Updated Market Data

## 1. Objective

I want to be able to continuously update our canonical minute-level market data without automatically extending the data used for optimization or formal validation.

At the same time, I want to be able to manually backtest any existing strategy, phenotype, or portfolio configuration against the entire available dataset, including newly appended market data.

The immediate objective is to update the VGT and GDX datasets and evaluate the unchanged N/original portfolio configuration through the latest completed trading session.

This should be implemented as a general capability, not something specific to N/original, VGT, or GDX.

## 2. Architectural Requirements

Preserve the existing canonical data architecture:

- One canonical minute-level data file per security.
- `data/<SYMBOL>/data.csv`
- No additional physical dataset partitions.
- No separate forward-evaluation data files.
- No duplication of canonical market data.
- No unnecessary new abstractions or architectural redesign.

Optimization and validation boundaries should be defined through explicit date ranges, independently of the actual coverage of the underlying canonical files.

The intended behavior is:

| Operation | Start | End |
|---|---|---|
| Optimization | Explicit date | Explicit date |
| Formal validation | Explicit date | Explicit date |
| Manual full-dataset backtesting | Earliest available session | Latest available complete session |
| Manual custom-date backtesting | User-specified date | User-specified date |

Appending market data must never implicitly extend an optimization or formal validation window.

Preserve the existing logical dataset and partition infrastructure wherever appropriate. Do not introduce a new partition merely to distinguish newly appended data.

## 3. Audit the Existing Implementation

Before making changes or downloading additional market data, thoroughly investigate the current implementation.

Relevant locations may include, but are not limited to:

- `data/partitions.json`
- `src/lib/partitions.ts`
- `src/lib/dataset.ts`
- `src/lib/evaluation.ts`
- `src/lib/csv.ts`
- The canonical dataset import and verification tooling.
- The current optimization standard and its enforcement mechanisms.
- Research-specific data loaders, data doors, and dataset manifests.
- CPU and GPU optimization and validation pathways.
- Strategy Lab's server-side dataset loading, backtesting, and caching mechanisms.
- N/original's originating research study and subsequent evaluations.

Determine:

1. The actual current last complete trading session available for VGT and GDX.
2. The exact date ranges used by the most recent relevant optimization and validation workflows.
3. Whether formal validation already has an explicitly enforced end date.
4. Whether any validation workflows dynamically derive their endpoint from the latest available market data, the end of a calendar year, or the end of the underlying file.
5. Whether appending additional market data would affect the reproducibility of existing research.
6. Whether existing full-file hashes, prefix hashes, cached data doors, dataset manifests, or cache keys would cause historical research or verification workflows to fail following an append.
7. Whether Strategy Lab already supports unrestricted manual full-dataset backtesting and custom date ranges.
8. Whether any relevant implementation differences exist between CPU and GPU execution paths.

I initially believed that the existing data ended on October 23, 2026. However, previous research documentation indicates that VGT and GDX had complete minute data through October 30, 2026.

Verify this directly rather than relying on either date.

Document the findings before proceeding with implementation.

## 4. Explicit Research Date Ranges

For research following our current optimization methodology, the anticipated date ranges are:

- Optimization: January 4, 2016 – December 31, 2024.
- Validation: January 2, 2025 – October 30, 2026.

The validation endpoint is provisional and must be reconciled with the actual existing data coverage, N/original's originating research, and the current research methodology.

If the audit reveals a different existing or appropriate validation endpoint, document the discrepancy and the rationale for the applicable date. Do not silently expand any established validation period.

The important requirement is that the formal validation endpoint be explicit, fixed, and independent of future market data updates.

### Implementation requirements

- Reuse existing configuration and dataset infrastructure wherever possible.
- Establish a shared, authoritative definition of the applicable default research date ranges if one does not already exist.
- Avoid scattering duplicate hardcoded date ranges throughout the codebase.
- Ensure research-specific protocols can retain their own explicitly defined date ranges.
- Preserve earlier walk-forward folds and historical research windows.
- Do not retroactively change completed or sealed studies.
- Do not automatically advance the validation endpoint when market data is refreshed.
- Require explicit authorization to extend the formal research dataset.
- Ensure optimizers cannot accidentally access validation or post-validation price data.
- Ensure formal validation and validation-neighborhood robustness evaluations cannot accidentally access post-validation data.

Use consistent exchange-session date semantics, including the America/New_York timezone, holidays, early closes, and inclusive date boundaries.

The effective boundaries must be enforced at the data-access level, not merely by filtering reported results after execution.

Preserve the existing causal warm-up and state-carrying semantics applicable to each research workflow.

## 5. Optimization Standard

Review the current optimization standard and update it where necessary to establish the following requirements:

- Optimization and formal validation must use explicitly defined date ranges.
- Those date ranges must be established before the relevant research begins.
- The existence of newer market data must not implicitly change those ranges.
- Manual backtesting against newer data is permitted but must remain distinct from formal optimization, candidate selection, qualification, and validation.
- Newly appended data must not be used to adjust strategy rules, parameter ranges, phenotypes, allocator behavior, or research acceptance criteria without separate authorization.
- Research protocols and manifests must record their effective date ranges and sufficient dataset provenance to support reproducibility.

Preserve all existing methodological safeguards.

Do not weaken the existing research integrity requirements to accommodate continuously updated data.

## 6. Historical Research Reproducibility

A particularly important requirement is that updating canonical data files must not break historical research reproducibility.

Investigate the implications of appending data for:

- SHA-256 dataset hashes.
- Byte-prefix hashes.
- Frozen research manifests.
- Cached data doors.
- Archived research inputs.
- CPU/GPU parity verification.
- GPU acceptance and integrity records.
- Golden-master tests.
- Previously sealed optimization results.
- Strategy Lab portfolio parity.

Where appropriate, use the existing bounded-input or byte-prefix verification mechanisms to verify that the exact historical input remains unchanged even when additional rows exist in the canonical file.

Do not simply remove or weaken integrity checks that currently rely on whole-file hashes.

Ensure that cache identities distinguish relevant date ranges and data versions, preventing stale results from being returned for newly extended manual backtests.

No previously sealed research results should be modified or regenerated merely because the canonical datasets have been extended.

## 7. Strategy Lab and Manual Execution

I want to be able to manually run any supported strategy, phenotype, or portfolio configuration using:

1. The explicitly defined historical research date range.
2. All available market data.
3. A custom start and end date.

Investigate whether these capabilities already exist.

If they do, verify that they behave correctly after the market data update. Do not redesign the interface or introduce redundant functionality.

If changes are necessary, implement the smallest coherent changes required.

For a multi-security portfolio such as N/original, full-dataset execution should use the latest common complete trading session for all required securities. Do not silently simulate one security using stale prices while another has more recent data.

Ensure that the effective execution date range is clearly reported.

Selecting all available data for manual backtesting must not grant optimization or formal research workflows unrestricted access to those same dates.

## 8. Update VGT and GDX Market Data

After the research boundaries and reproducibility protections have been verified or implemented, update the canonical VGT and GDX minute-level datasets.

Use the established Alpaca SIP data acquisition and import workflow.

The target is the latest completed US equity trading session as of the execution of this assignment.

As of November 27, 2026, before the US market opens, the anticipated latest completed session is November 25, 2026, because November 26 was Thanksgiving. Verify the exchange calendar and actual available coverage.

Requirements:

- Append only the necessary missing data.
- Preserve the existing historical data byte-for-byte wherever possible.
- Verify historical prefix hashes before and after the update.
- Preserve the existing CSV format and timestamp conventions.
- Detect duplicate, missing, or out-of-order timestamps.
- Verify complete exchange-session coverage.
- Correctly handle holidays, early closes, daylight saving time, and extended-hours data according to existing conventions.
- Preserve the existing price-adjustment and corporate-action semantics.
- Verify relevant split and distribution metadata where applicable.
- Do not silently rewrite previously examined historical prices.
- Do not import data for unrelated securities as part of this assignment.

If historical corrections are discovered that would alter pinned research inputs, document them and preserve the original research inputs. Do not silently apply corrections that invalidate historical reproducibility.

## 9. Execute N/original Against the Updated Dataset

Once the data has been updated and all relevant integrity checks pass, execute the existing N/original configuration using the complete available VGT and GDX history.

Use its exact existing configuration, including:

- All constituent strategies.
- All phenotype parameters.
- Entry eligibility behavior.
- Shadow eligibility behavior, if applicable.
- Allocator priorities and shared capital semantics.
- Execution assumptions.
- Transaction costs.
- Margin interest.
- Position sizing.
- Drawdown calculation methodology.

Do not optimize, retune, or otherwise modify N/original.

Use its established reference execution assumptions so that the results are directly comparable with the previous evaluation.

Perform a continuous causal simulation from the established historical starting point through the latest common complete trading session.

Do not reset strategy state at the validation cutoff.

Preserve any applicable:

- Open positions.
- Armed or pending setups.
- Shadow positions.
- Trailing stops.
- Reference highs.
- Loss restrictions.
- Continuation windows.
- Allocator state.
- Accrued margin interest.

Report the following separately:

### A. Historical research window

Performance through the existing applicable validation cutoff.

### B. Newly available period

Performance attributable exclusively to the period after that cutoff.

Use changes in marked net equity to attribute P&L across the boundary correctly, including positions that span the boundary.

### C. Entire available dataset

Combined performance through the latest common complete trading session.

For each applicable period, report:

- Net profit.
- Gross trading profit.
- Margin interest.
- Transaction costs.
- Maximum marked-equity drawdown.
- Maximum trade-principal loss.
- Maximum banked-capital drawdown.
- Trade count.
- Win rate.
- Realized and unrealized P&L.
- Open positions at the endpoint.

Use the established risk metric definitions and identify whether period drawdowns are measured from a reset period-specific peak or from the continuous historical equity peak.

Also provide a detailed trade and position ledger for the newly appended period, including positions opened before the cutoff that remained active afterward.

Compare the updated results with the previously recorded N/original results and explain any differences.

Clearly label the newly appended period as a manual post-validation evaluation, not an extension of the formal validation dataset.

## 10. Tests and Verification

Add or extend automated regression tests as appropriate.

At minimum, demonstrate that:

1. Appending market data does not change the effective optimization date range.
2. Appending market data does not change the effective validation date range.
3. Previously recorded historical results remain reproducible.
4. Manual full-dataset backtesting includes newly appended data.
5. Manual custom-date backtesting correctly respects its requested boundaries.
6. Optimization cannot access data beyond its authorized cutoff.
7. Formal validation cannot access data beyond its authorized cutoff.
8. Historical dataset integrity checks remain meaningful following an append.
9. CPU and GPU execution respect the same applicable data boundaries.
10. Strategy Lab does not return stale cached results following a data update.
11. Multi-security evaluations correctly determine the common complete endpoint.
12. The continuous historical trade and state trajectory remains unchanged before the historical cutoff when newer data is appended.

Account for expected endpoint-dependent differences, such as open-position marking, without weakening checks on the historical trajectory.

Use synthetic fixtures where appropriate to verify access restrictions without exposing additional market prices to optimization workflows.

Run the relevant existing tests, type checking, linting, and integration checks.

Do not run a new optimization merely to test these infrastructure changes.

## 11. Deliverables

Provide a comprehensive final report covering:

### Existing behavior

- Actual pre-update VGT and GDX data coverage.
- Existing optimization and validation date ranges.
- Whether validation was already explicitly bounded.
- Any discovered dynamic endpoint behavior.
- Relevant architectural and reproducibility findings.

### Implementation

- Changes made and their rationale.
- The authoritative location of the applicable research date ranges.
- How those ranges can be deliberately changed in the future.
- How manual full-dataset and custom-date executions work.
- How historical dataset integrity is preserved.
- Any changes to the optimization standard.

### Market data

- Previous and updated coverage for VGT and GDX.
- Number of appended rows and trading sessions.
- Historical prefix verification results.
- Relevant data-quality findings.

### N/original evaluation

- Historical results.
- Post-validation results.
- Combined results.
- Comparison against the previously recorded results.
- Detailed trade ledger for the newly available period.
- Current strategy and portfolio state at the final available session.

### Verification

- Tests executed and their results.
- Historical parity and reproducibility verification.
- Any unresolved issues, limitations, or risks.
- Files changed and final Git status.
- Verified commands for repeating the market data update and manually running N/original against either the historical research window or all available data.

## 12. Scope Restrictions

Do not:

- Create additional physical market data partitions.
- Duplicate canonical datasets.
- Introduce a separate forward-evaluation partition.
- Change strategy logic or phenotype parameters.
- Re-optimize N/original or any other strategy.
- Modify allocator behavior.
- Extend existing sealed validation windows.
- Use newly appended data for optimization, qualification, or formal validation.
- Weaken existing integrity or methodological safeguards.
- Introduce unnecessary Strategy Lab UI changes.
- Delete historical research artifacts.
- Perform unrelated refactoring.

Prefer the smallest robust implementation that satisfies the requirements.

If the existing architecture already supports a requirement correctly, verify and document that behavior rather than reimplementing it.

The fundamental objective is to maintain a continuously extensible canonical market dataset while keeping optimization and formal validation windows explicitly bounded, reproducible, and independently controlled.
