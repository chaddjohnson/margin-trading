# Claude Code — Investigate Walk-Forward Robustness Failures in New L0 Research

## Objective

Investigate **why the optimization and candidate-selection procedures underlying “New L0 primary: VGT + GDX” repeatedly fail chronological walk-forward drawdown tests**, despite the final frozen New L0 candidate exhibiting relatively low historical drawdown.

This is a **diagnostic, root-cause investigation**, not another optimization study. Identify what happened, distinguish bugs from genuine market/strategy limitations, and recommend specific, evidence-supported improvements to future optimization methodology.

**Do not re-optimize strategies, change their parameters, implement new trading rules, modify the allocator, or deploy anything.** Do not start the Strategy Lab chart fix or the planned TSLA/MSFT studies. We will review this investigation first, and its findings will inform those separate assignments.

Read `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md`, `docs/research/methods/NEW_L0_METHOD.md` (NL0 1.0.0), the relevant protocols and amendments, and all applicable repository instructions before proceeding.

## 1. Recover and verify the failed walk-forward experiments

Investigate at least these prior studies and their **actual sealed results**, including their source-code revisions, parameter-selection procedures, datasets, folds, and risk accounting:

| Research | Reported chronological outcome to verify |
|---|---|
| Original New L0 / Priority 3B–5B reference procedure | Approximately **−$29,358 net**, **$67,214 max drawdown** |
| Trading-session hold follow-up (`research/vg-l0-session-hold/`) | Approximately **+$25,238 net**, **$58,867 max drawdown** for its independent procedure |
| Shadow-eligibility, B1 fresh joint (`research/vg-l0-shadow-eligibility/`) | Approximately **+$71,407 net**, **$80,475 max drawdown** |
| Shadow-eligibility, B2 fresh sequential | Approximately **−$11,517 net**, **$74,307 max drawdown** |

These figures are investigation anchors, **not an instruction to assume they are correct or directly comparable**. Verify their definitions, date ranges, costs, drawdown resets/carry, selection boundaries, and how each sequential path was constructed. Identify any other directly relevant failed chronological tests.

The historical drawdown ceiling is **$35,000 per fixed $100,000 shared-capital slot**, measured under the applicable minute-level marked-equity convention. Confirm the exact convention used in each study.

**Crucial distinction:** The frozen New L0 candidate itself reports approximately **$20,386 full-history maximum drawdown**. That candidate was selected with knowledge of later historical data. Its performance on earlier slices is *descriptive*, **not an honest out-of-sample walk-forward test**. Do not conflate the frozen incumbent's retrospective track record with the ability of a historical optimization procedure to select good candidates using only information available at each earlier cutoff.

For each experiment, reconstruct:

- Train/selection interval, subsequent evaluation interval, and exact market-data boundary.
- Whether the test re-optimized at each cutoff or merely replayed a fixed phenotype.
- Optimizer, stages, seeds, budget, and selected phenotype IDs/parameter vectors.
- Candidate ranking and qualification gates applied **before** opening the next slice.
- Whether D1 VGT, D1 GDX, and VGT Growth were jointly or sequentially selected; which parameters or toggles were fixed.
- Shared-capital, execution, transaction-cost, margin-interest, and drawdown definitions.
- The per-fold results and the continuous/sequential aggregate, reconciled to the published totals.
- Which comparisons are valid, and which are confounded by different rules, objectives, budgets, or known-history exposure.

Preserve original code and sealed results. Use the source version appropriate to each completed study rather than making old studies appear to match a newer engine by altering their fingerprints or protocols.

## 2. Reconstruct the actual drawdown failures, trade by trade

For each failed walk-forward path, find **when and why** the drawdown exceeded $35,000.

Build a chronological event-level account covering the major drawdown episodes, especially the **2020–2021 and 2022–2023 evaluation slices**, wherever those slices apply.

Report, using existing ledgers and replay facilities where possible:

- Drawdown start, trough, recovery/end, peak-to-trough amount, and the correct minute-level equity accounting.
- Actual funded trades, symbols, strategy families, entry/exit timestamps, net P&L, interest, and maximum adverse excursions contributing to each episode.
- Pool occupancy and any competing or rejected signals that materially affected the path.
- Whether losses came from one extreme trade, a sequence of losses, concentration in one market episode, or an allocator displacement cascade.
- Which exit mechanisms mattered: maximum hold, trailing stop, continuation, Growth retention/filter logic, and other rules actually enabled in the selected phenotype.
- Whether the failure was driven more by the D1 pair, Growth, or interactions across the shared capital pool.
- How the selected parameters differed from New L0 and from other training-qualified candidates.

**Do not add standalone trade P&Ls together and call that the pooled effect.** When testing a causal hypothesis about capital competition, use complete chronological replay or clearly label a cheaper attribution as descriptive only.

If existing artifacts cannot explain an episode, perform a **small, targeted, reproducible diagnostic replay** using the correct pinned code and original data. Do not launch broad searches or parameter optimizations.

## 3. Determine why the optimizer selected those candidates

Trace each failed fold's winning phenotype **back through the original selection process**. Investigate which mechanisms permitted it to qualify despite its later drawdown.

Specifically test these hypotheses, without assuming any is true:

1. **Limited or unrepresentative training episodes:** Too few independent dip/recovery or Growth opportunities, with one exceptional period dominating fitness.
2. **Regime sensitivity:** Earlier training conditions differ materially from the subsequent bear, rebound, sideways, or other market environments.
3. **Parameter instability:** The search favors narrow optima or phenotype families that change materially across folds or seeds.
4. **Objective/gate mismatch:** Selection rewards net profit or local robustness in ways that inadequately constrain subsequent maximum drawdown, tail severity, exposure, holding time, or opportunity cost.
5. **Local robustness versus chronological robustness:** Nearby parameter settings perform consistently on the same historical events but fail on different future events.
6. **Shared-capital effects:** Individually plausible books compete for one funded slot, displacing later trades or changing the loss sequence.
7. **Search and selection effects:** Large candidate counts, multiple comparisons, stage promotion, early stopping, seeded versus fresh searches, or candidate-ranking rules favor historical noise.
8. **Accounting or implementation defects:** Incorrect fold boundaries, warm-up, state carry, maximum-hold semantics, corporate-action adjustments, mark-to-market drawdown, execution chronology, leakage, or risk checks.

For each suspected cause, distinguish **directly verified**, **strongly supported but not proven**, **not supported**, and **unresolved**. Include concrete source references and numerical evidence rather than generic explanations of overfitting.

In particular, explain why candidates can pass their **pre-selection center and neighborhood risk gates** yet exceed the $35,000 limit on genuinely subsequent slices. If there is no bug, say so explicitly: a historical drawdown limit is a research filter, not a guarantee of future drawdown.

## 4. Test methodological explanations without launching a new search

Use existing candidate archives, folds, seeds, diagnostics, and already-computed neighborhood results as far as possible.

Useful comparisons include:

- Fold winners versus the other **already evaluated** qualified candidates at that same cutoff.
- Profit-first versus lower-drawdown/robust candidate roles, where those roles were actually computed and sealed.
- Changes in rank and parameters across independent seeds or chronological cutoffs.
- Trade count, number of independent profitable episodes, and concentration of net profit in the largest trades.
- Tail-drawdown statistics and breach severity versus the original selection metrics.
- Informed versus fresh searches, **only when data access and budget differences permit a fair interpretation**.
- The original calendar-hold and trading-session procedures, **without attributing their entire performance gap to one variable when other settings differ**.

Clearly distinguish **retrospective diagnostics** from valid precommitted out-of-sample evidence. Do not select an apparent winner using information from a subsequent slice and then present it as if it could have been selected at the earlier cutoff.

No new multimillion-evaluation optimization runs. No tuning against 2025–2026. The 2025–2026 period has already been examined repeatedly and is **not a pristine holdout**.

## 5. Recommend concrete improvements, ordered by evidence and value

Present an evidence-based diagnosis and an actionable shortlist of potential changes to **future research methodology**. Possibilities may include improved walk-forward promotion gates, minimum independent-event requirements, tail-risk criteria, cross-regime checks, selection penalties for profit concentration, or a better treatment of parameter/seed instability—but recommend only what your findings justify.

For every recommendation, specify:

- The observed failure it addresses.
- Evidence that it plausibly addresses that failure.
- Whether it affects the optimizer, selection/qualification process, risk evaluation, execution engine, or underlying strategy rules.
- What existing results can test it, and what **future precommitted experiment** would be needed for proper evaluation.
- Risks and trade-offs, including reduced participation or profitability and additional overfitting from inventing new gates after inspecting failures.
- Estimated relative implementation effort and computational cost (qualitative is sufficient).

Distinguish **correctable software defects**, **research-method limitations**, and **fundamental uncertainty about future market behavior**.

Do not modify `OPTIMIZATION_STANDARD.md` or NL0 1.0.0 automatically. If a change appears warranted, propose the exact narrowly scoped amendment for **our review first**. Do not rewrite New L0's frozen method to imply a new rule existed historically.

## 6. Deliverables and constraints

Produce a concise but technically rigorous Markdown report in a **new, isolated research namespace**, with supporting machine-readable tables or small diagnostic scripts only where needed. Use the repository's existing reporting and reproducibility conventions; no plots or visual reports unless explicitly required by the applicable standard or an already authorized protocol.

The report must contain:

1. **Executive conclusion:** The most likely reasons for the failures and confidence in each.
2. **Experiment audit:** Comparable versus noncomparable walk-forward studies, exact folds, candidate provenance, and reconciled risk metrics.
3. **Trade-level failure chronology:** The largest drawdown episodes and their causal contributors.
4. **Selection-process diagnosis:** Why the failed fold phenotypes were chosen and passed the then-applicable gates.
5. **Bug audit:** Specific implementation/accounting issues found, or affirmative evidence against the suspected issues.
6. **Ranked recommendations:** Concrete proposed improvements with benefits, costs, and testable hypotheses.
7. **Next-study implications:** Which safeguards should be settled before optimizing D1 + Growth for **TSLA** and **MSFT**.
8. **Explicit limitations:** Already-inspected history, limited independent events, hindsight selection, and any missing artifacts.

Use reproducible file paths, source line references, experiment IDs, hashes, and exact commands. When the evidence is insufficient, state what is missing and what can and cannot be concluded.

Keep all investigation work isolated from `main`, frozen research artifacts, and any running Strategy Lab instance. Do not alter or deploy strategy code. If diagnostic scripts or reports are committed, use a dedicated research branch and repository conventions; do not merge it automatically. Avoid resource-heavy concurrent activity that could interfere with other work.

**Stop at diagnosis and recommendations.** Do not implement fixes to strategy rules, adjust risk thresholds, change optimizer behavior, or start additional optimization until the user has reviewed the findings.

## Final question to answer

**Why did the historical optimizer repeatedly produce fold-selected VGT D1 + GDX D1 + VGT Growth portfolios whose subsequent drawdowns exceeded $35,000, and what, if anything, should we change in the optimization methodology before applying it to TSLA and MSFT?**
