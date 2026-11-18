# Claude Code — Risk Metrics and Optimization Methodology (Pre-Optimization Assignment)

## Mission

Our Strategy Lab drag-to-measure bug has been fixed. The next priority is **risk-metric reconstruction and optimizer-methodology research**, **before** we authorize another expensive VGT/GDX optimization or begin TSLA/MSFT optimization.

We have learned that our existing maximum drawdown (MDD) measures the decline from a prior **marked-to-market equity peak**. That is a legitimate measure of portfolio volatility and exposure, but it **does not mean the entire decline was a loss of original invested principal**. An appreciated $100,000 position could rise to $250,000 and exit at $210,000: it gives back $40,000 from its peak, yet realizes approximately $110,000 profit before costs. We want to distinguish those outcomes rigorously while still recognizing that an unrealized-profit giveback reduces **current collateral value** and can reduce margin headroom.

The research goal is to establish whether the existing NL0 optimization and selection process systematically undervalues profitable, well-managed phenotypes by conflating **principal loss**, **profit giveback**, and **margin-liquidation exposure**—and to design and test a better procedure *without tuning it to produce a preferred historical winner*.

**This assignment is analysis, metric implementation, controlled selector research, and methodological design. It is NOT another multimillion-evaluation optimization.** Do not change trading rules, optimize new phenotype vectors, adopt/deploy a strategy, issue broker orders, or replace New L0. No automatic change to the canonical optimization fitness function or mandatory research standard is authorized. Prepare a versioned, evidence-backed proposal for our review and for a later separately authorized successor search.

Read the complete repository instructions before beginning, including `CLAUDE.md`, the currently registered `OPTIMIZATION_STANDARD.md` (at least 2.2.0), `docs/research/methods/NEW_L0_METHOD.md` (NL0 1.0.0), the original Priority 3B/5B protocols, the walk-forward diagnostic, Assignment 2, and Assignment 3's full-joint research. Start with the verified research paths and artifacts, especially:

- `research/vg-l0-full-joint/REPORT.md`, `PROTOCOL.md`, `TEST_REPORT.md`, its selection records, candidates, trades, minute marks, and results tables.
- `research/vg-l0-risk-families/REPORT.md` and its selector comparisons.
- `research/vg-l0-walk-forward-diagnostic/REPORT.md` and supporting evidence.
- The sealed frozen New L0 configuration and exact `N/original` candidate from Assignment 3.
- The current margin, accounting, corporate-action, allocator and valuation code and applicable data-access conventions.

Paths are starting points; verify their existence, hashes and actual content. Do not infer implementation from summaries.

---

## Stage 0 — Provenance, isolation and baseline preservation

1. Inspect Git status, active branches/worktrees, upstream changes and ongoing work. Create an isolated research branch/worktree without overwriting another session's edits. Keep ignored minute-market data accessible through verified paths rather than assuming worktrees copy it.
2. Verify exact code/data/config fingerprints, date coverage, trade-ledger schema, selection-policy implementations and access restrictions. Use frozen artifacts and original pinned commits for historical parity.
3. Reproduce the **frozen New L0** reference exactly before implementing metrics. Published anchors, for the existing verified 2016-01-04–2026-10-30 dataset: **$479,605.18 net, $20,385.99 maximum minute MDD, 46 funded lots**. Development through 2024: $382,721.46 net. Historical economics: fixed $100,000 funded slot, 5 bps per side, 11% simple interest, original corporate-action and fill conventions. Do not alter any of these assumptions in the reference replay.
4. Recover **N/original** (`GD1.VB0`, verify actual exact identity) as an independently named *research finalist*, not the adopted benchmark. Expected reported full-history figures: **$482,700.73 net / $20,385.99 MDD**; 2025–2026 net approximately $94,669.70 versus New L0's $96,883.72; confirm all figures from sealed records. N/original was incumbent-informed and has no independent chronological qualification.
5. Preserve the original NL0 fitness/selection pipeline and RA1 thresholds unchanged as comparison arms. No silent repinning, migration or changes to frozen reports. All historical 2020–2026 periods have been repeatedly examined; label the evidence retrospective.

**Gate:** Exact baseline parity and source provenance documented. If parity fails, stop substantive selector comparisons and explain the discrepancy rather than inventing a reconciliation.

---

## Stage 1 — Define and implement separate, mathematically precise risk metrics

Implement reusable **research-only** metric calculations (prefer pure functions and immutable source data) and clear data dictionaries. Specify the numerator, denominator, sampling interval, start/end events, transaction-cost treatment, interest accrual, corporate-action basis, open-position marking, and treatment of cross-boundary/carrying trades for every quantity. Use the existing minute-bar chronology and execution conventions. Do not mislabel P&L or net equity metrics.

### 1.1 Conventional marked-equity maximum drawdown — retain intact

- Current portfolio account/strategy equity mark from prior historical peak to subsequent trough, including unrealized position changes and previously banked profits, under the existing cash/borrowing ledger and marking conventions.
- Preserve the **existing** $35,000 historical maximum-DD ceiling as the **unchanged reference policy** and separately report p90, p95, worst and worst-10%-mean DD across parameter neighborhoods.
- A marked-to-market drawdown is not synonymous with a loss below the entry principal, but it is a real change in account collateral value and may affect margin capacity.

### 1.2 Trade-level principal loss

For every funded lot, calculate:

- Its original **invested/funded principal** (respect the actual ledger; do not assume the marked market value equals cost basis when entry friction is modeled).
- Net liquidation-equivalent value at each valid time while open, incorporating appropriate exit costs and accrued financing without double counting.
- **Maximum adverse dollar loss below its funded entry principal**, both intratrade and at realized exit. Report 0 when a trade never falls below that reference. Include the worst gap-through-stop fill and the worst realized losing trade.
- MAE using the engine's canonical definition as a separate published field; identify and explain differences from the new principal-loss measure.
- Loss in dollars and as a percentage of **that trade's entry principal**, not a historical peak value.

A losing trade may recover before exit: preserve its worst historical exposure, not only final realized profit.

### 1.3 Portfolio-level principal and banked-equity risk

These must be **separate** from trade-level principal loss:

- **Starting-capital floor shortfall:** largest marked or liquidation-equivalent deficit below the initial research account capital, with a clearly specified cash/debt convention and capital contributions/withdrawals excluded or treated explicitly.
- **Realized-equity drawdown:** decline from the previous *banked/closed-trade equity* high-water mark using a consistent cash ledger. Show exact timestamps and how carried positions are handled. This measures erosion of previously realized capital/profits, but is not necessarily loss below initial principal.
- Sequences of realized losing trades and cumulative net loss over declining episodes, with intervening profits accounted for (do **not** simply sum all losing trades and label it realized drawdown).
- Trade-count, exposure duration and maximum adverse excursions for loss clusters.

The distinction between losing principal on an individual $100,000 funded trade, falling below starting account equity, and drawing down from accumulated realized profits must be explicit throughout reporting.

### 1.4 Unrealized-profit giveback

For each trade and the portfolio where causally definable, report:

- Maximum marked unrealized profit reached, after clearly specified cost and financing treatment.
- Maximum subsequent decline from that peak, and peak-to-exit giveback, including trades that end profitably.
- The portion of giveback occurring while value remains **above break-even** versus any later deterioration **below principal**; do not double-count that deterioration as both principal loss and protected gain.
- Results normalized by entry principal and by attained unrealized gains, with reasonable handling of zero/negative profit.
- The fraction of training profit attributable to open lots at a cutoff and the size of the largest open lot relative to its funded principal.

Do not assume a portfolio MDD decomposes arithmetically into sums of per-trade givebacks and principal losses: timing, cash, interest and multiple books can make that false. Provide timestamped attribution where possible and identify unmatched residuals.

### 1.5 Stop-aware *conditional* profit protection

For open positions at each relevant cutoff, measure the protection offered by the **actual active exit state**:

- Whether a trailing or initial protective stop is armed, its effective threshold and executable precedence, including cases where the stop is inactive while the trade loses.
- Hypothetical exit value **at the stop level** and under realistic gap/slippage/halt stress; distinguish these clearly. Stops are **not guaranteed fills or loss caps**.
- Conditional profit protected at a modeled executable stop, remaining profit-at-risk, and downside to principal under stressed fills.
- No invented stop protection for trades without an actual executable stop. In particular, audit open-ended Growth states (`maximumHold` OFF, `istop` OFF, profit-conditional trailing protection).

A large, still-open winner should **not automatically be judged risky merely because its market value is above 1.5× principal or its profit exceeds 25% of historical net**. Those are the existing RA1 screens to benchmark, not assumptions to bake into the new risk calculation.

### 1.6 Test requirements

Create deterministic synthetic and historical regression cases, including:

- $100k → $250k → $210k: $40k conventional peak giveback, $110k realized gain before costs, **$0 trade principal loss**.
- $100k → $60k: $40k principal loss and $40k equity DD in the simplified one-lot case.
- A winner that gives back profit, then crosses below break-even: two concepts remain separate without double counting.
- Multiple closed losses separated by winners; profit still open at a cutoff; carried trades; shared-pool transitions.
- Partial exits or non-standard position states if the current engine supports them.
- Stops activating after entry, entry-day activation, late stops, overnight gaps and halt/first-tradable-minute handling; no lookahead.
- Interest accrual over weekends and holidays; price adjustments; exact accounting reconciliation.

Require deterministic repeatability, independent sample calculations, and numerical reconciliation to the established ledger. Document limitations of minute OHLCV and intrabar ordering.

---

## Stage 2 — Model real margin headroom separately from the isolated strategy

We agree on three distinct dimensions: **principal-loss risk**, **profit giveback**, and **margin-liquidation risk**. The third cannot be inferred from the isolated fixed-$100k trading-slot drawdown alone.

Create a **parameterized, research-only account-level margin-risk model**, not a broker execution system.

It should accept, with units and documented defaults (not assumptions about the user's actual account):

- Current collateral positions and prices/quantities, cash, funded trading position, outstanding debt, accrued interest, additional withdrawals or cash flows if modeled.
- Per-security maintenance requirements or documented scenario assumptions, marginability and concentration/house add-ons where supportable.
- Stress changes in the securities, including joint core-portfolio and traded-ETF moves, concentration stress, adverse overnight gaps and changing maintenance percentages.
- A configurable **illustrative** VOOG/VGT 60/40 core scenario where useful, not a claim about the account's current holdings or actual Vanguard lending terms.

Report at minimum:

- Current securities market value; equity = market value + relevant cash − total borrowing/liabilities.
- Maintenance requirement and **maintenance excess / shortfall** under the stated model; equity ratio where meaningful.
- Headroom in dollars and percentage points; shock size or scenario that first causes a modeled deficiency, *when calculable*.
- Consequences of declines from previous peaks even if positions remain profitable relative to cost basis.
- Sensitivity to debt level, simultaneous market shocks and house-maintenance changes, with forced-liquidation or margin-call treatment clearly caveated.

Verify applicable Vanguard policy claims from reliable current source material **if source access is available** and record citations and access date. Otherwise use clearly labeled illustrative maintenance scenarios, not invented actual requirements. Do **not** infer that the broker's maintenance test is a high-water-mark drawdown or a principal-loss test. Do not represent the research model as a reliable prediction of when Vanguard will issue a call or liquidate.

If verified account positions, effective maintenance rates, distribution records or corporate actions are missing, produce **scenario results only** and state what prevents a defensible account-specific conclusion. No brokerage connection or account actions are authorized.

---

## Stage 3 — Retrospective metric audit of existing candidates

Before proposing new fitness objectives, compute the new risk metrics on **existing sealed, immutable phenotypes** and their funded trade / minute mark histories. At minimum compare:

1. Frozen **New L0** (official baseline).
2. **N/original** (the provisionally favored research finalist; not adopted).
3. **N/RA1**, if reproducible from the frozen artifacts.
4. **L/RA1**, **F/RA1**, **F/original** and other materially different Assignment 2/3 finalists when provenance permits.
5. The earlier RA1-selected Assignment 2 finalist if needed for an informative contrast; label it separately from N/original.

Report on identical date windows and cost assumptions:

- Historical net profit (development, previously examined 2025–2026 and full); annual net; funded trades; utilization.
- Conventional minute MDD and its peak/trough dates; trade principal-loss max and distributions; starting-capital floor; realized-equity drawdown; giveback and open exposure.
- Margin-risk results **only** under explicitly stated common account scenarios, never confused with standalone portfolio metrics.
- Worst episodes (including 2020, 2022, 2025), loss clusters and whether the original $35k MDD gates fail because of protected profit giveback, trade losses below principal, or both.
- Actual active trailing/protective-stop state and plausible stressed realizations.
- Parameter-neighborhood distributions for the new metrics using existing perturbed candidate records where available; do not claim neighborhood findings if only center-run data exist.
- Concrete, trade-level explanation of N/original versus New L0 differences, including GDX's decline-gate effect and the small 2025–2026 validation shortfall. Do not silently favor either candidate.

Prefer stored traces. If missing fields require deterministic **replays of fixed historical candidate vectors**, run the narrowest read-only/backtest-only replays necessary and record their exact resource usage and outputs. No phenotype parameter searches, new optimizer islands, broad random parameter generation or additional historical data purchases.

---

## Stage 4 — Audit where risk enters the optimization process

Trace **all stages** of NL0/RA1 candidate discovery and selection in code and records, not merely the final rank:

1. Parameter domains and initial sampling.
2. Search-stage objective/fitness and dominance/Pareto comparisons.
3. Early feasibility and hard-risk gates.
4. Pruning and promotion between stages.
5. Refinement target selection and local neighborhood tests.
6. Chronological fold nomination, confirmation and validation rules.
7. Final research qualification and deployability verdict.

For each stage identify exactly how conventional MDD, trade losses, open exposure, profit, costs, occupancy and current RA1 cutoff restrictions affect which candidates can survive.

**Critical question:** Could a phenotype with excellent realized profitability, tolerable principal-loss risk, and high protected unrealized gains have been discarded early because its conventional peak-to-trough MDD exceeded $35k? Establish with concrete examples and numbers if supported, and distinguish demonstrable exclusions from speculation. Also identify cases where relaxing MDD would admit unacceptable **margin-headroom** or total-equity risk.

Do not claim that changing the final fitness function alone can recover phenotypes already pruned by upstream gates. Specify what a later properly controlled search would have to change at each affected stage.

---

## Stage 5 — Design and compare revised selection policies (no major optimization)

Prepare explicit, versioned *experimental* alternatives alongside the historical controls:

- **P0 / NL0-original:** exact unmodified selector and original $35k marked-equity MDD qualification.
- **P1 / RA1:** exact unmodified experimental selector, including its actual S1–S4 tests and open-lot concentration rules.
- **P2 / capital-and-stop-aware:** a proposed selector that distinguishes losses below trade principal from profitable-trade giveback, accounts for actual stop state and exposure, and preserves portfolio MDD/margin headroom as material risks.
- If scientifically useful, **P2a / MDD-hard** and **P2b / alternative constraint** variants to isolate the effect of changing the drawdown gate rather than mixing that change with scoring weights.

### Methodological requirements

1. **Predeclare** every P2 formula, normalization, allowable threshold, tie-breaker and tradeoff *before* running its retrospective comparisons. Choose initial rules from sound definitions and explicit design objectives, not by tuning them to the known winners or 2020/2022/2025 results.
2. Treat previously discussed **$25,000 preferred / $35,000 maximum per-trade principal-loss** figures as *candidate research scenarios*, not already-approved permanent safety limits. Do not silently treat them as proven safe. Present alternatives and sensitivity transparently.
3. Do not weaken or remove the original $35,000 conventional MDD gate from P0/P1. In an experimental relaxed-MDD variant, quantify changed outcomes **and** enforce/assess explicit principal-loss and margin-scenario protections; do not claim margin risk disappears merely because the loss is from paper profits.
4. Avoid arbitrary automatic bans on large *protected* unrealized winners. Conversely, do not assume the stated stop price is guaranteed realizable; apply gap execution and collateral stresses.
5. Keep candidate-generation population, dates, accounting and candidate evidence **identical** across P0, P1 and P2. A selector should not quietly receive a larger search or privileged input history.
6. Compute fold-specific ranking only from that fold's legitimately available training-cutoff evidence, with carried states handled correctly. Any look-ahead leakage or use of next-period results to set P2 thresholds must be disclosed as a retrospective design failure, not concealed.
7. Compare candidate changes, net, principal-loss distributions, marked MDD, giveback, margin scenarios and subsequent chronological behavior—not one profit figure alone. Preserve risk/return Pareto alternatives.
8. Re-evaluate the **same existing candidate populations** from Assignment 2/3, where their archived evidence supports the new metrics. Do not launch new genetic searches to generate a favorable sample. If precomputed records lack some required information, either do bounded deterministic replays or label the comparison incomplete.
9. Report which previously high-performing candidates RA1 rejected *solely or mainly* for open-position size/concentration and whether a stop-aware evaluation genuinely changes their risk assessment.
10. Treat 2020–2026 as repeatedly inspected **retrospective history**. Better historical fold performance is evidence for further research, not independent proof of future generalization.

Develop a practical, scientifically justified recommendation for **which constraints should be hard gates, which should be Pareto objectives, and which should remain diagnostics**. Address the risk of overconstraining genuine profit-taking strategies and the risk of admitting leveraged strategies with poor account-level survivability.

---

## Stage 6 — Proposed optimization-method update and next research protocol

Based on the analysis, deliver a **proposed versioned methodology** for a future New L0/N/original successor search. This is a design deliverable, **not permission to execute that search**.

Include:

- Precise formulas and reproducible implementation hooks for all risk inputs.
- Where each risk objective or constraint acts in Sobol/global exploration, genetic search, pruning, multiobjective fitness, local refinement, neighborhoods and final ranking.
- How to preserve NL0 1.0.0's successful sampling, exploration/refinement balance, budgets and diverse phenotype preservation while changing fitness/qualification fairly.
- A design for a **shared-capital joint** VGT D1 + GDX D1 + VGT Growth follow-up, using **incumbent-informed** seeds (New L0, N/original and relevant finalists) and **independent broad from-scratch** exploration, with separately allocated, appropriate budgets and no hidden cross-seeding.
- Common calendar-day maximum-hold baseline; D1 controls selectable as supported by the approved implementation. Growth·GDX and shadow delayed-entry remain OFF unless a later assignment explicitly expands the scope.
- Separate profit and downside objectives and the limitations of all $35k thresholds; independent account-margin scenarios not confused with the historical fixed-slot ledger.
- Predefined chronological selection and failures that cannot be turned into deployable claims by changing thresholds after seeing the results.
- Preservation of 2025–2026 as **previously examined**, not virgin validation, and a future prospective monitoring protocol for any final nominee.
- Research-budget and computational estimates grounded in past measured evaluations, specifying where any new metric computation may increase cost.
- **Decision points explicitly requiring user approval:** whether to change conventional MDD's binding role; principal-loss thresholds; margin scenarios/maintenance assumptions; which experimental selection formula, if any, is approved; whether to start the next multi-million-evaluation optimization; and when any research code or standard update might be merged.

Prepare the proposed changes as a research document/amendment alongside the existing optimization standard, with a precise diff or patch proposal if useful. **Do not directly alter or register a new mandatory `OPTIMIZATION_STANDARD.md` version, update the canonical optimizer's selection defaults, or merge experimental code into `main` without explicit later approval.** The existing standards and frozen NL0 methodology remain the controls.

---

## Stage 7 — Deliverables, QA and reporting

Produce the following in a dedicated versioned research directory:

1. `PROTOCOL.md` — scope, frozen definitions, evidence sources, metric formulas and precommitted selector experiment design; any changes logged as amendments.
2. `BASELINE_AND_PROVENANCE.md` — verified New L0/N/original identities, hashes, data lineage and parity records.
3. `METRIC_SPECIFICATION.md` — all definitions, accounting conventions and precise distinctions among marked DD, trade principal loss, realized-equity drawdown, giveback and broker-margin risk.
4. `IMPLEMENTATION_AND_TESTS.md` — metric-code locations, test coverage, independent arithmetic checks, causality, cost reconciliation and reproducibility.
5. `CANDIDATE_RISK_AUDIT.md` — comparative tables, per-trade examples, episode attributions, growth/open-lot stop states and margin scenario sensitivity.
6. `SELECTION_PIPELINE_AUDIT.md` — where the historical optimizer may have rejected legitimate protected winners or admitted underprotected exposure.
7. `SELECTOR_COMPARISON.md` — P0/P1/P2 on identical archived candidate populations, limitations and chronological results.
8. `PROPOSED_METHOD.md` — recommended (but unadopted) optimization revisions, alternative threshold scenarios, exact future-study protocol skeleton and approval gates.
9. `REPORT.md` — concise executive result, evidence for and against proposed changes, unresolved decisions and a clear **go/no-go recommendation for authorizing a later successor optimization**.
10. Machine-readable candidate/trade/metric and comparison tables, manifests, seeds and deterministic commands as applicable.

Use the current reporting standard: Markdown and machine-readable tables, no unnecessary charts/visual reports. Keep archives and frozen source artifacts unchanged. Commit and push the isolated research work according to repository conventions, while clearly labeling any proposed rule as *experimental and not adopted*. Preserve any diagnostic code changes only in their research namespace/branch. **No `main` merge, brokerage action, trading-system deployment, new data purchase or automated task scheduling.**

### Final questions to answer

- How much of New L0's and N/original's historical conventional MDD came from profit giveback versus trade principal loss? Is an exact decomposition possible on the actual marked portfolio path?
- What are their maximum trade-level principal losses, realized-equity drawdowns, open-profit givebacks and conditional protected gains?
- Does N/original still appear preferable after these additional metrics and clearly labeled margin scenarios?
- Were any strong existing candidates screened out primarily due to profitable marked-equity giveback? Which ones, at which selection stage, and with what account-risk tradeoff?
- Does P2 select materially different candidates than NL0/RA1 on the **same** historical candidate populations? Are any advantages robust enough to justify a future large search?
- Which risk dimensions should be binding, which should influence Pareto/fitness, and which should remain descriptive? What is the rationale, without post-hoc tuning?
- What exactly must change in the optimizer—not just the final ranking—to implement the agreed philosophy correctly?
- What remains unknowable without future market data, actual account collateral and effective broker requirements?
- What user decisions are required before the next optimizer modification and large-scale search?

## Success criterion

Deliver a **verified, reproducible and decision-ready risk-metric/selection-methodology study** that separates principal erosion from profit giveback without ignoring marked account equity or margin capacity, and that can guide a better *future* joint optimization. **Do not optimize new phenotypes, promote N/original, replace New L0, or claim the new rules are proven safe.**
