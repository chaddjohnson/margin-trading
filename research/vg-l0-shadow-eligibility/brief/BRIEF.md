# Claude Code — New L0 Shadow-Position Eligibility: Implementation and Comprehensive Optimization

## Mission

Conduct a comprehensive research study to determine whether **shadow-position entry eligibility** can improve our frozen **“New L0 primary: VGT + GDX”** shared-capital strategy.

This study must implement the new allocator feature, test its effects independently, and perform four substantial optimization tracks to investigate both optimization architecture and incumbent-parameter bias.

**Do not replace New L0, deploy a strategy, or modify live trading behavior.** This is research. A new candidate can be nominated, but adoption requires a subsequent user decision.

Complete the assignment, including implementation, experiments, documentation, and final reporting, unless a material blocker prevents scientifically valid execution.

Read `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md`, `docs/research/methods/NEW_L0_METHOD.md`, all relevant research protocols, and applicable repository instructions before beginning.

---

# Phase 0 — Preserve Previous Research and Establish the Baseline

## 0.1 Preserve the trading-session study

The completed trading-session study is on:

`research/vg-l0-session-hold`

Its findings favored the original calendar-day New L0 configuration.

The study produced valuable reusable documentation and reproducibility artifacts, particularly:

- `docs/research/methods/NEW_L0_METHOD.md`, documenting NL0 methodology version 1.0.0.
- Optimization Standard 2.1.0 and its associated documentation.
- The completed trading-session study's protocol, report, and reproducibility artifacts.

Preserve the research branch and its history.

Integrate the reusable methodology documentation, applicable optimization-standard updates, and appropriate research records into `main` through a clean, scoped documentation-focused integration.

**Do not merge the experimental trading-session engine changes merely to preserve the documentation.**

Before integrating, inspect the current Git state and check for subsequent changes, active worktrees, and conflicts.

Do not overwrite unrelated changes.

If a clean integration into `main` is not possible, prepare a dedicated documentation-only integration branch or PR and report the remaining action. Do not force a merge.

## 0.2 Preserve historical integrity checks

The trading-session study reported that its engine changes altered code fingerprints used by older research studies.

Do not weaken, remove, bypass, or silently repin historical integrity checks to make them pass.

Historical studies must remain reproducible and verifiable against their original pinned revisions.

Retain the experimental implementation on its research branch unless there is a separate, justified reason to integrate it.

Any future compatibility mechanism must distinguish historical executable identities from newer implementations.

## 0.3 Freeze New L0

Identify the exact frozen candidate:

**New L0 primary: VGT + GDX**

Its active strategy components are:

1. VGT D1 (Dip Recovery).
2. GDX D1 (Dip Recovery).
3. VGT Growth.

**GDX Growth is OFF and is not part of this study.**

Recover and verify:

- Every phenotype parameter.
- Enabled and disabled strategy rules.
- Allocator priorities and event ordering.
- Entry and exit semantics.
- Capital-pool rules.
- Position sizing.
- Costs and margin-interest assumptions.
- Data sources, hashes, and corporate-action adjustments.
- Original training and validation results.

Use the existing frozen New L0 configuration as the primary control.

Historical results reported by the previous study were approximately:

- Full-history net: $479,605.18.
- Full-history maximum drawdown: $20,385.99.
- Fixed shared capital: $100,000.
- Margin interest: 11%.
- Trading costs: 5 basis points per side.

Verify these values from the actual frozen artifacts.

The historical control must reproduce exactly under the equivalent data, execution, and accounting configuration before the new experiments begin.

Calendar-day maximum holding periods must remain the default throughout this study.

---

# Phase 1 — Implement Shadow-Position Entry Eligibility

## 1.1 Concept

Currently, a valid entry signal may be rejected because another strategy occupies the shared capital pool.

The proposed mechanism allows a rejected signal to remain eligible while its hypothetical position is still active.

Example:

1. GDX D1 occupies the capital pool.
2. VGT D1 generates a valid entry signal.
3. Its entry is rejected because capital is unavailable.
4. The allocator continues simulating that VGT trade as a shadow position.
5. GDX exits, releasing the capital.
6. If the VGT shadow position is still hypothetically open, VGT becomes eligible for a real entry.
7. If selected, VGT enters using the current executable market price.
8. The real trade begins with completely new trading state.

The shadow position never reserves capital and never preempts an existing funded position.

## 1.2 Exact eligibility rules

Implement the following behavior:

- Every rejected entry that qualifies under the original strategy rules may establish a shadow-position eligibility episode.
- The hypothetical trade follows the strategy's original entry and exit mechanics.
- Shadow exit conditions continue to be evaluated while capital is unavailable.
- Eligibility terminates when the hypothetical trade exits.
- Eligibility also terminates when the opportunity is consumed by a real funded entry.
- When capital becomes available, active eligible shadow positions may compete for funding.
- A delayed real entry must occur at the first genuinely executable opportunity permitted by the allocator.
- The allocator must respect all existing signal restrictions and execution rules.
- Shadow eligibility must not create duplicate positions or bypass the existing one-slot capital constraint.

Do not introduce an arbitrary expiration interval. The shadow position's actual hypothetical exit determines its eligibility lifetime.

If the original strategy's rules permit a position to remain open for an extended period, eligibility may likewise persist while the hypothetical position remains active.

## 1.3 Real trade state must be independent

A delayed real entry must initialize:

- Actual entry timestamp.
- Actual execution price.
- Cost basis and shares.
- Trailing-stop state.
- Holding-period clock.
- Profit/loss accounting.
- Accrued interest.
- Loss restrictions and other applicable trade-state mechanisms.

**Never inherit hypothetical profits, losses, stop levels, holding duration, or previous execution prices from the shadow position.**

The real trade starts when capital becomes available and the delayed entry actually executes.

Subsequent real exit decisions must be based on that real trade's independent state.

The hypothetical shadow position must not later force the funded position to close merely because the original hypothetical trade would have exited.

## 1.4 Reuse existing infrastructure

Investigate the existing virtual/shadow trade engines before implementing anything.

Relevant prior research includes:

- Study 8's `virtual_trades.csv` infrastructure.
- Existing D1 shared-margin allocator and virtual-book state machines.
- Priority 3/5 pooled replay infrastructure.
- Strategy Lab's pooled-result exporter.
- Previously implemented Growth entry-eligibility mechanisms.

Prefer reusing established virtual-position simulation semantics rather than duplicating the trading logic.

Clearly distinguish:

1. Rejected entry signals.
2. Hypothetical shadow positions.
3. Persistent eligibility.
4. Actual funded positions.

Implement this as an allocator-level capability rather than rewriting the D1 and Growth entry algorithms.

## 1.5 Three independent ON/OFF filters

The feature must be independently configurable for:

| Component | Shadow eligibility |
|---|---|
| VGT D1 | ON / OFF |
| GDX D1 | ON / OFF |
| VGT Growth | ON / OFF |

There are eight possible combinations.

All three toggles must be available to the optimizer as structural parameters.

Default all toggles to **OFF**, preserving New L0's existing behavior.

Do not add GDX Growth to the active strategy set.

## 1.6 Allocator competition and chronology

Define deterministic handling for:

- Multiple simultaneously active shadow positions.
- Shadow eligibility and fresh entry signals competing at the same instant.
- Multiple books using the same symbol.
- Same-minute funded exits and eligibility checks.
- Hypothetical exits occurring at or near the instant capital is released.
- Multiple rejected signals associated with an existing shadow position.
- Shadow state overlapping with an actual funded position.
- Rejected entries whose eligibility expires while the pool remains occupied.

Preserve New L0's existing priority and same-instant ordering rules wherever applicable.

Any additional tie-breaking rule must be explicit, deterministic, causally correct, and fixed before optimization.

Do not let the optimizer change priority rules during this study.

Prevent lookahead and accidental same-bar execution using information unavailable at the execution instant.

## 1.7 Persist shadow-trade diagnostics

Research results must provide enough information to reconstruct what happened to every relevant shadow opportunity.

Persist, as appropriate:

- Strategy and symbol.
- Original signal timestamp and decision price.
- Rejection reason and capital-pool occupant.
- Hypothetical entry and exit timestamps/prices.
- Hypothetical exit reason.
- Eligibility start/end.
- Whether eligibility persisted until the pool became available.
- Whether the opportunity received a delayed real entry.
- Actual delayed execution timestamp and price.
- Reasons for non-funding, including competing entries.
- Realized funded-trade P&L and drawdown.

Use the repository's existing machine-readable research conventions.

Keep these records distinct from actual funded-trade results.

Avoid producing unnecessary duplicate logs or excessively large intermediate artifacts.

## 1.8 Verification tests

Add deterministic tests for all important state transitions and chronology cases.

Include the previously investigated VGT example as a regression case:

- VGT D1 rejected signal: December 20, 2022.
- Its hypothetical position exited: January 4, 2023.
- Exit reason: maximum hold.
- GDX capital occupancy continued beyond that hypothetical exit.

That rejected VGT position **must not** remain eligible for a delayed entry on April 19, 2023.

Verify this against the exact historical phenotype and dataset before using it as a regression anchor.

Also test genuinely persistent shadow positions that remain active when funding becomes available.

Confirm that all three toggles OFF reproduces New L0's original event chronology, trades, P&L, and drawdown exactly.

Do not proceed to optimization until implementation parity and correctness tests pass.

---

# Phase 2 — Fixed-Parameter Shadow-Eligibility Comparison

Keep all original New L0 phenotype parameters frozen.

Evaluate all eight ON/OFF combinations of the three eligibility filters.

No strategy parameter re-optimization is permitted in this phase.

The goal is to isolate the direct effect of enabling eligibility for different strategy combinations.

Report:

- Net profit.
- Maximum drawdown.
- Annual performance.
- Trade count.
- Shadow opportunities generated.
- Shadow opportunities recovered.
- Recovered-entry P&L and drawdown.
- Waiting duration before actual entry.
- Capital utilization.
- Trades displaced by recovered entries.
- Net incremental value from each filter and their interactions.

Use complete chronological shared-capital replay.

Do not estimate incremental profit by adding standalone shadow-trade returns.

Perform initial comparisons on training data. Preserve validation access restrictions until the optimization procedures and finalists have been frozen.

**Important:** These fixed-parameter results must not be used to eliminate any of the eight combinations from subsequent from-scratch optimization.

The fixed-parameter experiment is diagnostic, not a search-space pruning procedure.

---

# Phase 3 — Four Independent Optimization Tracks

We want to investigate two separate questions:

1. Does starting from New L0's existing parameters constrain the search?
2. Is fully joint optimization better than optimizing D1 first and Growth afterward?

Perform all four tracks:

| Track | Starting point | Optimization architecture |
|---|---|---|
| A1 | Incumbent-informed | Fully joint |
| A2 | Incumbent-informed | Sequential |
| B1 | From scratch | Fully joint |
| B2 | From scratch | Sequential |

Each track must have its own substantial, predeclared computational budget.

Neither optimization architecture nor starting-point family should be unfairly disadvantaged.

## 3.1 Methodology

Use the successful original New L0 optimization methodology as the foundation.

Refer to:

`docs/research/methods/NEW_L0_METHOD.md`

Pay particular attention to:

- Priority 3B's broad and informed-joint optimization.
- Priority 5B's subsequent optimization and refinement.
- Parameter-domain definitions.
- Sampling and search algorithms.
- Search-stage ordering.
- Exploration/refinement budget allocation.
- Candidate-selection criteria.
- Robustness tests.
- Chronological validation.
- Reproducibility requirements.

Preserve the original methodology wherever applicable.

The four-track design is an explicitly authorized experimental extension, not permission to replace the original search methods with arbitrary alternatives.

Document every necessary adaptation before execution.

## 3.2 Track A1 — Incumbent-informed joint optimization

Start from the existing successful New L0 phenotype vectors and relevant historical finalists.

Optimize simultaneously:

- VGT D1 parameter vector.
- GDX D1 parameter vector.
- VGT Growth parameter vector.
- VGT D1 eligibility toggle.
- GDX D1 eligibility toggle.
- VGT Growth eligibility toggle.

Candidates must be evaluated as complete shared-capital portfolios.

All three parameter vectors and all three toggles must be mutable within joint optimization proposals.

Use the incumbent-informed methodology established by Priority 3B/5B.

Do not limit the search entirely to small local perturbations. Preserve the original method's applicable exploration stages.

## 3.3 Track A2 — Incumbent-informed sequential optimization

Use successful historical D1 and Growth configurations as starting points.

**Step 1: D1 pair**

Jointly optimize:

- VGT D1.
- GDX D1.
- Their two eligibility toggles.

Evaluate them as a two-strategy shared-capital pool.

**Step 2: Growth integration**

Freeze the selected D1 parameters and toggles.

Optimize:

- VGT Growth parameter vector.
- VGT Growth eligibility toggle.

Evaluate every Growth candidate against the complete shared-capital portfolio containing the frozen D1 pair.

**Do not optimize Growth solely for standalone profitability.**

Use predeclared finalist-selection rules for the first step. If multiple D1 finalists are carried into Growth integration, define their number and selection criteria in advance and account for their evaluation budgets.

No D1 parameters may change during Growth integration.

## 3.4 Track B1 — From-scratch joint optimization

This is particularly important.

Perform an independent, broad optimization without using New L0 or other historically successful parameter vectors as preferred starting points.

Optimize all three strategies and three eligibility toggles simultaneously.

Requirements:

- Use the original broad strategy parameter domains.
- Use the original Priority 3B-style global exploration methods.
- Use independent random seeds.
- Do not inject incumbent-derived candidates into the fresh search.
- Do not center sampling around historical winners.
- Do not narrow search bounds based on earlier New L0 results.
- Include all eight eligibility combinations in predeclared initial exploration coverage.
- Preserve diverse phenotype families for refinement under the original methodology.

The search must be capable of discovering substantially different configurations designed around shadow eligibility from the beginning.

After the search, compare its finalists against New L0, but do not use New L0 to steer the fresh search.

## 3.5 Track B2 — From-scratch sequential optimization

Use the same independent broad-search philosophy as B1.

**Step 1: Fresh D1 pair**

Jointly optimize VGT D1 and GDX D1, including their two eligibility toggles.

Do not seed the search with VG #2 Balanced or New L0 parameters.

**Step 2: Fresh Growth integration**

Freeze the selected D1 pair.

Optimize VGT Growth and its eligibility toggle against the complete shared-capital portfolio containing those D1 strategies.

Do not preferentially seed Growth #4 or other historically successful Growth configurations.

Preserve the original broad parameter domains and applicable search methods.

Use precommitted selection criteria and stage budgets.

---

# Phase 4 — Optimization Budgets and Search Fairness

This research should receive a substantial computational budget.

The previous investigation established approximately:

- Priority 3B: 5.83 million evaluations across its broader search.
- Priority 5B New L0 arm: approximately 489,695 requested evaluations.
- Trading-session follow-up: approximately 1.46 million requested evaluations.

These figures are references, not substitutes for recovering the exact original records.

## 4.1 Recover equivalent historical effort

Before running the new searches, identify:

- Original broad-search evaluation counts.
- Actual executed proposals.
- Unique parameter configurations.
- Cache hits and repeated evaluations.
- Refinement evaluations.
- Search seeds and restarts.
- Pruning and stopping rules.
- Stage-level computational effort.

Distinguish genuine search effort from raw accounting totals.

## 4.2 Independent track budgets

Create an explicit budget for A1, A2, B1, and B2.

Requirements:

1. Every track receives an independent budget.
2. Comparable tracks receive comparable effective search effort.
3. Fresh tracks must not receive smaller budgets than their incumbent-informed counterparts merely because they start without good seeds.
4. Both from-scratch tracks should target at least the original Priority 3B-scale broad-search effort (approximately 5.83 million evaluations, subject to verifying what work is comparable).
5. Preserve the original exploration/refinement balance within each applicable search method.
6. Give each sequential track sufficient budget for both D1 and Growth stages.
7. Do not fund one track by prematurely terminating another.
8. Use multiple independent search seeds.
9. Track actual executed work, not merely configured budgets.

The purpose is rigorous comparative research, not minimizing runtime at the expense of search quality.

If compute resources or execution guards make the intended budgets infeasible, document the exact blocker. Do not silently reduce budgets or claim an underfunded track received an equivalent search.

## 4.3 Fair structural-parameter coverage

The three eligibility toggles are discrete structural parameters.

At the beginning of each optimization track, ensure adequate, predeclared coverage of all eight combinations.

Do not let parameter-space dimensionality or incumbent-seed bias determine which combinations receive almost all exploration effort.

After the initial balanced coverage, the original search algorithm may allocate further effort based on its predefined selection rules.

Record search coverage and performance by eligibility combination.

## 4.4 Search-space parity

Maintain the same:

- Eligible strategy parameter families.
- Numerical parameter bounds.
- Cost assumptions.
- Holding-period semantics.
- Capital-pool rules.
- Evaluation windows.
- Risk constraints.
- Data sources.
- Robustness standards.

The comparison must distinguish the effects of:

- Incumbent seeding.
- Joint versus sequential optimization.
- Shadow eligibility.
- Changes in strategy parameter values.

Do not modify unrelated rules to make a candidate perform better.

---

# Phase 5 — Validation and Robustness

Follow the current `OPTIMIZATION_STANDARD.md` and the applicable NL0 methodology.

## 5.1 Historical windows

Use the established partitions:

- Training: 2016–2024.
- Validation: 2025–2026, through the available verified dataset endpoint.

Use chronological development folds within training according to the established methodology.

All optimization, model selection, search-space decisions, and candidate promotion must occur without consulting final-period results.

Freeze finalists and selection criteria before validation.

The 2025–2026 period has been examined in previous research. It is therefore a **previously inspected historical validation period**, not a pristine holdout.

Report that limitation explicitly.

Do not re-optimize in response to validation results.

## 5.2 Risk constraints

Preserve the repository's existing risk standards, including the $35,000 drawdown ceiling and the applicable neighborhood robustness requirements.

Do not weaken risk limits to promote a higher-profit candidate.

Assess:

- Center maximum drawdown.
- Intratrade/mark-to-market drawdown.
- Neighborhood drawdown distributions.
- p90 and p95 drawdown.
- Worst-10% mean drawdown.
- Drawdown-ceiling breach frequency and severity.
- Worst individual trade.
- Worst adverse excursion.
- Concentration of profits in individual trades or market episodes.
- Chronological walk-forward performance.
- Parameter stability.

The previous study found that its walk-forward procedure exceeded the drawdown ceiling.

We must not overlook that weakness simply because a new candidate produces a higher historical net profit.

## 5.3 Selection criteria

Preserve the original NL0 selection methodology wherever applicable.

Do not select candidates by historical profit alone.

Evaluate profitability, drawdown, robustness, chronological stability, and capital utilization together.

Preserve materially different finalists where warranted.

A candidate may be interesting without qualifying for adoption.

No automatic replacement of New L0 is authorized.

---

# Phase 6 — Unified Comparative Evaluation

Compare the following:

1. Frozen New L0, all shadow filters OFF.
2. The seven other fixed-parameter eligibility combinations.
3. A1 finalist(s).
4. A2 finalist(s).
5. B1 finalist(s).
6. B2 finalist(s).

Use the same historical data and accounting rules.

For each finalist, report:

| Metric | Required |
|---|---|
| Training net profit | Yes |
| Validation net profit | Yes |
| Full-history net profit | Yes |
| Gross profit and costs | Yes |
| Maximum drawdown | Yes |
| Annual profit and drawdown | Yes |
| Trade count and win rate | Yes |
| Capital utilization | Yes |
| Recovered shadow entries | Yes |
| Recovered-entry net P&L | Yes |
| Displaced trades/opportunities | Yes |
| Neighborhood robustness | Yes |
| Chronological walk-forward results | Yes |
| Risk-ceiling breach frequency and severity | Yes |
| Optimized eligibility toggle configuration | Yes |

Also provide per-strategy attribution for:

- VGT D1.
- GDX D1.
- VGT Growth.

## 6.1 Evaluate eligibility directly

Determine:

- Which strategy benefits most from shadow eligibility?
- Which combinations produce negative incremental value?
- Whether eligibility benefits Growth and D1 differently.
- Whether recovered opportunities displace more profitable later trades.
- Whether longer capital occupancy increases drawdown.
- Whether recovered trades produce meaningful incremental profit across different market regimes.
- Whether shadow opportunities contribute disproportionately to one exceptional year.

## 6.2 Evaluate optimization architecture

Compare A1 versus A2 and B1 versus B2.

Determine whether fully joint optimization produces better results than sequential D1-then-Growth optimization.

Also compare A1 versus B1 and A2 versus B2.

Determine whether incumbent-informed searching outperforms genuinely fresh searching, or whether it constrains discovery.

Compare phenotype differences, not only aggregate metrics.

Explain where parameter values, eligibility toggles, and capital allocation differ materially.

## 6.3 Distinguish genuine improvements from search artifacts

Investigate whether reported gains arise from:

- New shadow-position entries.
- Improved original strategy parameters.
- Different capital occupancy.
- Avoided or displaced trades.
- Changes in which strategy receives funding.
- A small number of highly profitable historical events.
- Parameter instability or possible overfitting.

Do not attribute the entire improvement to shadow eligibility if other jointly optimized parameters contributed.

Use controlled ablation/replay comparisons where necessary to explain the outcome.

---

# Phase 7 — Documentation, Artifacts, and Preservation

Produce complete, reproducible research deliverables.

## 7.1 Implementation documentation

Document:

- Shadow-position lifecycle.
- Eligibility activation and expiration.
- Real-position initialization.
- Capital-release event ordering.
- Multiple eligible shadows.
- Priority and tie-breaking rules.
- Independent toggles and their defaults.
- Behavioral differences from the original allocator.

## 7.2 Optimization protocol

Persist a precommitted protocol containing:

- Exact search spaces.
- Parameter bounds.
- Toggle treatment.
- Stage definitions.
- Search algorithms.
- Random seeds.
- Budgets and allocation.
- Selection criteria.
- Risk gates.
- Validation restrictions.
- Reproducibility manifests.
- Code and data hashes.

Follow repository conventions for versioning and standard adoption.

## 7.3 Results

Persist:

- All eight fixed-parameter comparisons.
- Four optimization-track records.
- Relevant finalist phenotypes.
- Shadow and funded trade ledgers.
- Annual and per-strategy statistics.
- Robustness results.
- Chronological validation results.
- Budget accounting.
- Full comparative tables.
- Final recommendation and limitations.

Use Markdown and machine-readable files according to the optimization standard's reporting rules.

Do not create unnecessary visual reports.

## 7.4 Git and research isolation

Perform implementation and optimization in a dedicated research branch, isolated from frozen historical studies.

Do not overwrite existing research results.

Commit and push completed work according to repository conventions.

Preserve the original New L0 configuration.

Do not merge experimental shadow-eligibility engine changes into `main` or deploy any candidate without explicit authorization.

The documentation-preservation work from Phase 0 is separate from this restriction.

---

# Phase 8 — Record the Next Research Decision

After this study, we may conduct a separate from-scratch optimization comparing calendar-day and trading-session maximum holding periods.

**Do not perform that experiment now.**

Record the following as an explicit unresolved decision in the research roadmap:

> After reviewing the shadow-position eligibility study, decide whether the subsequent from-scratch calendar-day versus trading-session comparison should:
>
> A. Hold the selected shadow-eligibility configuration fixed under both holding-period conventions, or
>
> B. Allow the three eligibility toggles to be optimized independently under both conventions.
>
> The two holding-period conventions must receive symmetric treatment. This decision belongs to the user and must be revisited after the shadow-eligibility results are reviewed.

Do not assume either option has already been selected.

Do not begin the subsequent holding-period study without further authorization.

---

# Final Deliverables

Provide a comprehensive final report answering:

1. Was shadow eligibility implemented correctly and without changing the frozen baseline?
2. Which of the eight fixed-parameter eligibility configurations performed best?
3. Did shadow eligibility improve profitability or drawdown without re-optimization?
4. Did joint optimization outperform sequential optimization?
5. Did from-scratch optimization discover materially different or better phenotypes than incumbent-informed optimization?
6. Which individual eligibility toggles were selected, and why?
7. How much improvement came specifically from recovered opportunities?
8. What opportunities were displaced or lost because recovered positions occupied capital?
9. How robust were the winners to parameter perturbations and chronological changes?
10. Did any candidate satisfy the established risk and robustness requirements?
11. Is any candidate sufficiently supported to warrant consideration as a replacement for New L0?
12. What important uncertainty or overfitting risk remains?

Include a final comparison table covering the frozen New L0 baseline, all four optimization tracks, and their selected finalists.

Conclude with an evidence-based recommendation. Do not automatically deploy or adopt a winner.

## Critical Requirements

- Preserve the original New L0 methodology, parameters, and results.
- Preserve calendar-day holding periods throughout this study.
- Keep the active combination limited to VGT D1, GDX D1, and VGT Growth.
- Implement three independent shadow-eligibility toggles.
- Default all toggles OFF.
- Verify exact baseline parity.
- Test all eight fixed-parameter combinations.
- Perform all four optimization tracks.
- Use genuine from-scratch exploration in B1 and B2.
- Use full chronological shared-capital replay for every candidate.
- Allocate substantial, independent, fairly matched optimization budgets.
- Follow the current optimization standard and NL0 methodology.
- Preserve chronological validation discipline.
- Do not weaken risk requirements.
- Do not use validation results to steer optimization.
- Persist complete research artifacts and shadow-trade diagnostics.
- Preserve the trading-session research and integrate its reusable documentation appropriately.
- Keep experimental code changes isolated until reviewed.
- Record the future calendar-versus-session decision without making it.
- Do not deploy or replace New L0 without explicit authorization.

## Overall Objective

We want to determine whether shadow-position entry eligibility can make the **VGT D1 + GDX D1 + VGT Growth** shared-capital portfolio materially better than New L0.

We also want a credible answer to whether the best results come from:

- Joint or sequential optimization.
- Incumbent-informed or genuinely fresh searches.
- Different combinations of shadow-eligibility filters.

The purpose is not merely to find a higher historical net profit.

It is to discover whether a demonstrably better, robust, reproducible shared-capital strategy exists—and to understand precisely why it performs better.
