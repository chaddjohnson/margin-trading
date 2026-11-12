# Claude Code — New L0 Trading-Session Re-Optimization

## Objective

We have completed Priority 7 and are ready for the next optimization study.

Our target is the existing Strategy Lab candidate:

**“New L0 primary: VGT + GDX”**

This candidate was discovered through a highly successful optimization process. We want to reproduce that process as faithfully as possible, but investigate whether measuring maximum holding periods in **trading sessions rather than calendar days** produces better performance.

There are two major objectives:

1. **Recover, verify, and permanently document the exact optimization methodology that produced New L0.**
2. **Use that methodology, with an equal or greater optimization budget, to re-optimize the same VGT/GDX D1/Growth combination using trading-session holding periods.**

This is a focused follow-up study, not a new broad strategy-discovery effort.

Read `CLAUDE.md`, `OPTIMIZATION_STANDARD.md`, and all other applicable repository instructions before beginning.

---

## Phase 1 — Recover the Original New L0 Optimization

Find the research run that produced:

**New L0 primary: VGT + GDX**

Inspect its source code, research artifacts, configuration, execution records, reports, and any associated optimization documentation.

### 1.1 Establish the exact candidate

Identify and preserve:

- The exact VGT and GDX strategy components, including which D1 and Growth phenotypes are active.
- Every phenotype parameter and enabled/disabled rule.
- Shared-capital allocation rules, priorities, and conflict resolution.
- Position sizing and capital-pool constraints.
- Transaction, margin-interest, and P&L accounting.
- Data sources, date ranges, and execution assumptions.
- Any other settings required to reproduce the original candidate.

Produce a reproducible baseline configuration. Do not assume that all four symbol/strategy combinations are enabled without verifying the original run.

### 1.2 Recover the optimization methodology

Determine exactly how the original optimization was performed.

Investigate:

1. The sequence of optimization stages.
2. Parameter search spaces, distributions, and sampling methods.
3. Exploration and refinement procedures.
4. Candidate generation, ranking, and selection.
5. Any search diversification or phenotype clustering.
6. How candidates advanced or were eliminated between stages.
7. Profitability, drawdown, and other objective functions.
8. Hard constraints and acceptance criteria.
9. Robustness and stability checks.
10. Training/validation separation and leakage safeguards.
11. Random seeds and reproducibility mechanisms.
12. The exact computational/search budget.

Recover the **actual executed procedure**, not merely the intended process described in planning documents.

Use the original executable code and research artifacts as the primary evidence.

### 1.3 Recover the original search budget

Establish, as accurately as possible:

- Evaluations per stage.
- Total evaluations.
- Distinct phenotype configurations examined.
- Number of search iterations, restarts, or generations.
- Budgets allocated to exploration versus refinement.
- Compute time, where recorded.
- Any pruning or early termination policies.

Distinguish between configured budgets and actual executed work.

Do not estimate the original budget from the number of final candidates alone.

Where evidence is incomplete, document the uncertainty explicitly.

### 1.4 Verify reproducibility

Confirm that the recovered configuration and methodology correspond to the original New L0 results.

Where feasible, reproduce the frozen candidate's historical performance using the existing backtesting infrastructure.

Investigate and explain any discrepancies before proceeding.

Do not silently substitute a newer or different implementation.

---

## Phase 2 — Permanently Document and Lock In the Methodology

**This phase must be completed before beginning the new optimization.**

We want the successful New L0 optimization procedure preserved in the repository so that future research can reproduce it.

Review the existing optimization documentation, particularly `OPTIMIZATION_STANDARD.md`.

Update the appropriate documentation and, if warranted, create a dedicated reference document for the New L0 optimization methodology.

Document:

- Exact optimization stages and execution order.
- Parameter search mechanisms.
- Exploration/refinement allocation.
- Candidate-selection methodology.
- Risk and drawdown constraints.
- Budget requirements and stage allocations.
- Validation discipline.
- Robustness requirements.
- Reproducibility requirements.
- Actual commands, configurations, and artifact locations.
- Lessons from the original optimization that are supported by evidence.

### Documentation requirements

Clearly distinguish:

- **Verified historical behavior:** Supported directly by source code or execution artifacts.
- **Reconstructed behavior:** Reasonably inferred but not directly verified.
- **New requirements:** Explicit decisions for future research rather than claims about the original study.

Do not retroactively describe an idealized process as though it was actually executed.

Reconcile the recovered methodology with the existing optimization standard. Do not inadvertently weaken or override established safeguards.

Where the original methodology contains reusable practices, incorporate them appropriately into the optimization documentation.

Where something is specific to New L0, preserve it in a dedicated, versioned reference protocol rather than unnecessarily imposing it on all future studies.

The final documentation should make the methodology independently reproducible by a future Claude session.

**Preserve a stable reference version of this methodology before the new research begins.**

---

## Phase 3 — Introduce Trading-Session Holding Periods

The existing D1 implementation has historically interpreted `maximumHoldDays` as calendar days.

We want to investigate trading-session semantics.

### Required behavior

Under the new experimental mode:

- Holding periods are measured in actual market trading sessions.
- Weekends and exchange holidays do not count.
- Session counting follows the correct market calendar.
- Entry-session counting and exit timing must be explicitly defined and tested.
- The existing conditions that activate maximum-hold exits must remain unchanged.
- D1 and Growth must be supported wherever the selected phenotypes use maximum-hold rules.

The only intended behavioral change is the unit used to measure elapsed holding time.

For example, a 15-session limit should represent 15 trading sessions rather than 15 calendar days.

### Backward compatibility

**Do not change the behavior of existing frozen strategies or research results.**

Implement the new semantics as an explicitly selectable experimental configuration.

The original calendar-day behavior must remain available and continue producing the same results.

Add focused tests covering:

- Weekends.
- Market holidays.
- Entries near holidays.
- Entry-session counting.
- Exact expiration boundaries.
- Missing market data versus genuine non-trading sessions.
- Preservation of the existing exit-condition semantics.

Do not introduce unrelated changes to entry rules, trailing stops, continuation rules, allocation logic, or trading costs.

---

## Phase 4 — Reproduce the New L0 Optimization Methodology

Now perform a focused re-optimization.

### 4.1 Fixed strategy scope

Use **only the VGT/GDX D1/Growth combination that produced New L0**.

Do not reopen the broader ETF discovery process.

Preserve:

- The same symbols.
- The same active strategy families.
- The same strategy architecture.
- The same shared-capital allocator.
- The same allocation priorities and conflict rules.
- The same relevant parameter families.
- The same financial and execution assumptions.

Allow the existing tunable parameters to be re-optimized, including the numerical maximum-hold values.

Changing the holding-period unit can alter the optimal values of interacting parameters, so do not restrict the optimization to maximum-hold values alone.

However, **do not introduce new strategy rules or parameter families**.

### 4.2 Preserve the original optimization process

This is critical.

Reuse the methodology recovered and documented in Phases 1–2.

Preserve its:

- Search algorithms.
- Stage ordering.
- Sampling methods and distributions.
- Exploration/refinement balance.
- Parameter-selection procedures.
- Candidate-ranking methodology.
- Advancement and elimination criteria.
- Risk constraints.
- Robustness requirements.
- Validation safeguards.

Do not substitute a different optimization philosophy.

In particular, do not arbitrarily increase phenotype exploration at the expense of refinement, or vice versa.

If the original methodology used a particular allocation of computational effort between stages, preserve that allocation proportionally wherever applicable.

Some original stages may have involved choosing ETFs or strategy combinations. Those discovery stages are no longer needed because our scope is fixed. Document their omission and how their budget is reassigned using the original search methodology.

### 4.3 Equal or greater optimization budget

**The new optimization must receive at least the same effective computational/search budget as the original New L0 optimization, preferably greater.**

The narrower symbol and strategy scope is not justification for reducing the overall optimization effort.

Instead, concentrate the available budget on the selected combination while preserving the original optimization structure.

Requirements:

1. Recover the original budget from actual records.
2. Establish an explicit new budget before running.
3. Match or exceed the original total search effort.
4. Match or exceed comparable stage-level search effort.
5. Preserve the original balance among exploration, refinement, and other applicable stages.
6. Account for repeated, cached, pruned, or otherwise non-equivalent evaluations.
7. Document the original and new budgets side by side.

Do not silently reduce the budget for speed.

Do not claim budget equivalence if the underlying evidence is insufficient.

If the original budget cannot be recovered exactly, document the supported lower bounds and establish a defensible, conservative budget that exceeds them.

The objective is a comparably rigorous or more exhaustive execution of the **same proven optimization process**.

---

## Phase 5 — Controlled Experiments

Evaluate three configurations.

### A — Frozen New L0 baseline

Original calendar-day holding periods.

Original frozen parameters.

Original shared-capital allocation behavior.

This is the historical control.

### B — Direct trading-session conversion

Identical parameters and allocation rules to A, but using trading-session holding periods.

No re-optimization.

This isolates the direct effect of changing the holding-period convention.

### C — Trading-session re-optimization

Trading-session holding periods.

Newly optimized parameters using the recovered New L0 methodology and equal or greater budget.

This measures what the new holding-period convention can achieve after appropriate optimization.

### Optimization partitions

Follow the applicable repository optimization standard, using:

- **Training: 2016–2024**
- **Validation: 2025–2026**

All parameter searching, candidate ranking, and selection must use training data only.

Do not consult validation performance to adjust the optimization or select between competing candidates.

Once final candidates are frozen, evaluate the validation period.

If the validation period has been used in earlier research, acknowledge that it is a previously examined historical holdout rather than claiming it is pristine.

Do not repeatedly tune in response to validation outcomes.

### Shared-capital replay

All candidate evaluations must use a complete chronological simulation of the actual shared-capital allocator.

Do not combine independently optimized trade profits arithmetically.

Account for:

- Capital occupancy.
- Competing signals.
- Rejected entries.
- Displaced opportunities.
- Realistic entry/exit chronology.
- Margin costs and other existing accounting conventions.
- Portfolio-level drawdown.

Keep the existing entry eligibility behavior unchanged.

**Do not implement shadow-position entry eligibility or incorporate other unrelated allocator enhancements into this study.**

---

## Phase 6 — Compare Results

Produce a detailed comparison of A, B, and C.

Report separately for training, validation, and full history.

Include:

| Metric | A: Baseline | B: Conversion | C: Re-optimized |
|---|---|---|---|
| Net profit | | | |
| Gross profit | | | |
| Margin interest/costs | | | |
| Maximum drawdown | | | |
| Number of trades | | | |
| Win rate | | | |
| Average holding duration (sessions) | | | |
| Capital utilization | | | |
| Training net | | | |
| Validation net | | | |

Also report:

- Annual profit and drawdown.
- Intratrade/mark-to-market drawdown where supported.
- Worst individual trades.
- Performance by symbol and strategy family.
- Changes in trade entry/exit chronology.
- Capital-pool conflicts and missed opportunities.
- Which trades were extended or shortened by the new time convention.
- How the optimized parameters changed.
- Evidence of overfitting or instability.

Compare C against both A and B.

Distinguish improvement from the holding-period convention itself from improvement attributable to re-optimization.

Use the repository's established optimization and reporting standards for additional metrics and diagnostics.

### Candidate selection

Apply the original New L0 candidate-selection methodology.

Do not simply choose the highest-profit configuration if it violates the original risk or robustness criteria.

Preserve multiple finalist phenotypes if the original process requires or supports that.

---

## Phase 7 — Deliverables and Research Preservation

Produce:

### 1. Locked optimization methodology

Permanent documentation explaining the recovered New L0 optimization procedure, with evidence and reproducibility instructions.

### 2. Original baseline manifest

The exact original candidate configuration and frozen baseline performance.

### 3. New optimization protocol

A reproducible record of the trading-session experiment, including:

- Scope and parameter spaces.
- Search methodology.
- Random seeds.
- Search budget.
- Execution stages.
- Commands and configuration.
- Deviations from the original methodology, if any.

### 4. Optimization results

Persist all required research artifacts, candidate results, trade histories, metrics, and diagnostics according to the existing research standards.

### 5. Comparison report

A comprehensive A/B/C comparison covering training, validation, risk, performance, and trade-level differences.

### 6. Final recommendation

Determine whether:

- Calendar-day holding periods remain preferable.
- Trading-session holding periods improve the original fixed phenotype.
- Trading-session re-optimization produces a meaningfully better portfolio.
- Improvements are credible across training and validation.
- The new candidate deserves consideration for eventual deployment.

Do not automatically replace the existing New L0 candidate.

Preserve the original as a frozen benchmark.

---

## Execution and Quality Requirements

- Follow all applicable repository instructions and optimization standards.
- Verify the original research provenance before changing optimization behavior.
- Complete and preserve methodology documentation before running the new search.
- Keep the original calendar-day implementation and historical results intact.
- Make experimental holding-period semantics explicit and independently testable.
- Reuse existing strategy engines and optimization infrastructure wherever possible.
- Avoid lookahead bias and validation leakage.
- Use deterministic, reproducible research configurations.
- Check for conflicting working-tree changes before editing.
- Keep research outputs isolated from existing frozen results.
- Do not introduce unrelated strategy enhancements.
- Do not silently change the optimization methodology to improve apparent results.
- Record any unavoidable deviations and their justification.
- Do not stop at a plan: execute the optimization and produce the results, unless a material blocker prevents a scientifically valid comparison.

## Final Priority

**The most important requirement is methodological fidelity.**

We believe the optimization process that produced New L0 was particularly effective.

Our goal is not to invent a better optimization process during this experiment.

Our goal is to **recover that process, preserve it permanently in the repository, and execute it again with at least as much optimization effort**, restricted to the existing VGT/GDX D1/Growth combination and using trading-session maximum holding periods.

The final comparison should tell us whether that single conceptual change, combined with faithful re-optimization, produces a better shared-capital trading strategy.
