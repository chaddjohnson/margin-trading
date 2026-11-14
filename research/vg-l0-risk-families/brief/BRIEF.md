# Claude Code — Assignment 2: D1 Risk-Control Families and Risk-Aware Candidate Selection

## Mission and authorization

**Execute Assignment 2 of the New L0 risk-aware successor research program.** Assignment 1 completed the research-isolated risk-control foundation and adopted Optimization Standard 2.2.0. This assignment must (1) finish and verify an optional *entry-day protective-stop activation* mode, (2) conduct a fair, adequately funded optimization and comparison of the D1 risk-control families, and (3) compare the original New L0 candidate-selection methodology against a precommitted risk-aware alternative **on the same candidate populations**.

This is the *research and methodology* assignment (previously planned as Stages 3–4). **Do not execute Assignment 3's comprehensive re-optimization of all three strategy parameter vectors, choose a production replacement, deploy trades, or merge experimental engine code into `main`.** Produce the evidence, verified infrastructure, and a reproducible handoff for that separate assignment.

The user has approved:

- All three Assignment 1 controls: an unconditional protective loss stop, configurable maximum-hold policies, and a prolonged-decline entry gate.
- Researching **entry-day protective stops** as an independently selectable alternative to the existing next-session activation convention.
- Broad structural coverage of **all 64 base combinations** of the two D1 books' exit-family/decline-gate choices before focusing optimization on a subset; do not narrow to the handoff's proposed symmetric-only S1 or S3 design without explicitly reporting a resource blocker.
- Appropriately optimizing numerical strategy and control parameters for each structure, rather than transplanting incumbent New L0 values into new rule families.
- Substantial computational budgets, independent search seeds, faithful reuse of the Priority 3B/5B optimization methodology, controlled candidate-selection comparisons, and strong chronological/tail-risk analysis. A multiday run is acceptable.
- A **study-specific**, documented experimental use of otherwise report-only exposure/risk diagnostics in an alternative candidate-selection rule. This is **not** permission to silently rewrite Optimization Standard 2.2.0 or impose these experimental thresholds on other studies.

Do the work in this assignment, not merely write a proposal. If a prerequisite cannot be satisfied honestly, finish all valid independent work, preserve it, and document the precise blocker rather than substituting an underpowered or scientifically invalid result.

---

## 0 — Read the exact source of truth; safeguard the repository

Read **in full, before implementation or searching**:

1. `CLAUDE.md` and all relevant repository instructions.
2. `docs/research/OPTIMIZATION_STANDARD.md` **2.2.0**, its protocol/adoption templates, preflight rules, and applicable versioning/exception procedures.
3. `docs/research/methods/NEW_L0_METHOD.md` (**NL0 1.0.0**), including the actual Priority 3B broad search and Priority 5B incumbent-informed refinement stages and their budget-accounting distinctions.
4. `research/vg-l0-risk-controls-foundation/ASSIGNMENT2_HANDOFF.md`, `SPECIFICATION.md` (**RC 1**), `PROTOCOL.md`, `REPORT.md`, `TEST_REPORT.md`, `BASELINE_MANIFEST.md`, `AMENDMENTS.md`, and `RESEARCH_RECOVERY.md`.
5. `research/vg-l0-walk-forward-diagnostic/REPORT.md` and the prior trading-session and shadow-eligibility studies' relevant methodological conclusions.
6. The actual implementation, particularly `src/d1-risk-controls/`, Priority 3's pooled simulator and the frozen New L0 phenotypes and optimizer infrastructure.

Check actual Git branches, clean/dirty state, commits and running worktrees. The prior foundation's experimental code is on `research/vg-l0-risk-controls-foundation` (reported latest `26014af1`); documentation-only Standard 2.2.0 was integrated into `main` (reported `108c241b`). **Verify the current state; do not assume these references are still HEAD.** Work on a dedicated new research branch/worktree based on the verified foundation, preserving all original artifacts and unrelated concurrent work.

Recover and reproduce the **frozen New L0** baseline before changing anything:

- Active books: **D1·VGT + D1·GDX + Growth·VGT**; Growth·GDX OFF.
- One fixed funded $100,000 slot; original chronological allocator and same-instant priority.
- Original D1 calendar-day maximum-hold behavior, original Growth rules, and shadow-position *delayed-entry eligibility OFF*.
- Modeled 5 bps cost per side, 11% simple interest accrued by calendar days, and original execution conventions.
- Historical anchor: **$479,605.18 net, $20,385.99 minute-level maximum drawdown, 46 funded lots** through the verified 2026-10-30 endpoint. Match the actual sealed record, including trades, decisions and minute marks, not only these summary numbers.

Treat New L0 as an immutable reference, **not** as an independently validated production strategy. Its earlier parameter choices used subsequently viewed market history.

---

## 1 — Extend the protective stop to optionally activate on the entry day

### 1.1 Required feature

RC 1's unconditional protective stop triggers only for positions already open at the beginning of a trading session. Preserve this convention as the **default / legacy activation mode**. Add a separately configurable and optimizable **entry-day activation mode** for each protected D1 book:

- **Next-session activation:** existing RC 1 behavior, unchanged.
- **Entry-day activation:** after a real/hypothetical entry has *actually filled*, the protective loss stop may trigger during that same trading session, using only price observations demonstrably occurring **after the fill**.

This mode applies to the *unconditional protective loss stop only*. Do not silently authorize same-day legacy trailing-stop, maximum-hold, buffer, or unrelated exits. The protective stop remains a fixed threshold below the **raw entry execution price** and is active regardless of whether the position was ever profitable.

### 1.2 Causal execution and price ambiguity

Define the exact eligible first observation from the existing fill mechanism, with synthetic demonstrations for entries at a minute opening trade, entries at a closing print, first/last minute of the session, and delayed fills. Never use a minute's pre-fill high/low to infer a post-fill stop hit. If minute-bar OHLC cannot establish whether a low occurred after the entry, conservatively exclude that ambiguous portion or use a separately justified deterministic rule; do not manufacture tick-level sequencing.

Preserve the existing RC 1 stop-fill conventions for later eligible observations: gaps and minute opens through the threshold fill at that observed opening price; otherwise use the configured stop-level/next-open assumption with appropriate costs/slippage. Document threshold equality, competing exits, session boundaries, holidays, missing prints and split adjustments.

A protective stop **is not a guaranteed loss cap**. Even same-session protection cannot eliminate gap and execution risk. Report this limitation prominently.

### 1.3 Isolation and compatibility

- Version the changed behavioral specification as **RC 2** (or the repository's prescribed next compatible version). Do **not** mutate RC 1 semantics under the same version.
- Preserve old configurations, legacy identities, cache keys, data hashes, code pins and result reproduction. The new activation property must have a canonical identity only when non-default and be inactive/masked where the protective stop is OFF.
- Add independent activation settings for D1·VGT and D1·GDX. Do not change Growth's exit behavior.
- Re-run the full Assignment 1 parity and correctness gates and newly added tests for entry-day activation, including same-session adverse moves and an 8% protective threshold exceeded by a larger actual gap loss.
- If restoring parity would require editing a frozen historical engine or weakening integrity checks, stop and report the conflict.

**The implementation must pass correctness/parity tests before the research optimizer is permitted to evaluate its performance.** Never set numerical search boxes in response to early real-data performance observations.

---

## 2 — Pre-register a scientifically fair protocol *before* searching

Create a new study namespace and a fully specified `PROTOCOL.md` using the 2.2.0 study template. Commit the protocol and implementation/reference manifests **before looking at optimized results or future-fold performance**.

Precommit:

- The research questions and hypotheses, including possible failure/null outcomes.
- Exact datasets, verified hashes/coverage, market events, position accounting, benchmark identity and partition-door policy.
- All structural cells, valid/invalid combinations, numerical search bounds/grids, conditional genes, neighborhoods and random-seed policy.
- Search algorithms/stages, budget per structural cell and seed, actual-evaluation accounting, qualification and promotion quotas, replication, caps, stopping/extension and memory/disk guards.
- The **old selection rule** and **one primary experimental risk-aware rule**, with exact computation, units, missing-data handling, tie-breaking and allowed input fields; optional *secondary* risk-aware policies only if defined in advance and explicitly distinguished from the primary.
- Chronological fold definitions, future-data access controls, robustness/stress procedures, validation gating, comparison metrics, and selection consequences.
- Rules for choosing configurations to advance to dedicated refinement **without prematurely discarding entire structurally distinct families**.
- Which results constitute exploratory retrospective evidence versus independent evidence.

No selection-rule, budget, risk-threshold, or search-space changes in response to a viewed outcome without a logged amendment, provenance, and the applicable restart/requalification under the standard. Do not retrospectively represent an amended procedure as preregistered.

### 2.1 Structures: include all 64 RC 1 base combinations

For **each of D1·VGT and D1·GDX**, independently enumerate:

| Exit family | Protective stop | Maximum hold |
|---|---|---|
| A — legacy | OFF | Legacy calendar-day maximum hold |
| B — protected | ON | Legacy calendar-day maximum hold |
| C — protected, unlimited hold | ON | Disabled maximum hold |
| D — progress-extended hold | ON | Bounded adaptive hold |

Cross each with prolonged-decline gate **OFF/ON**. This yields **8 base structures per book and 8 × 8 = 64 two-book base structural cells**. The two books must not be forced to use identical exit structures or gate states. An unlimited hold without independent protective-stop protection is invalid.

In the original **64-cell base comparison**, use RC 1's next-session protective-stop activation for stop-enabled families. This maintains a clean original-mechanics reference.

### 2.2 Add entry-day activation without confusing the 64-cell accounting

Entry-day activation is a **conditional structural dimension** when a book's protective stop is ON. It is **not** one of the 64 RC 1 base cells.

- Design a separate, **pre-budgeted, balanced activation study** comparing next-session versus entry-day activation across protected families B/C/D for both symbols, including asymmetric onset combinations. Do not use one globally fixed onset mode or only try it on New L0's parameters.
- If fully crossing onset mode with every applicable structure is computationally feasible, the augmented design has **14 per-book combinations, 14 × 14 = 196 portfolio structural configurations** (A with gate ON/OFF: 2; B/C/D with two onset modes and gate ON/OFF: 12). Avoid mistakenly describing all 196 as having received 64-cell-equivalent optimization if that is not what ran.
- It is acceptable to use a clearly labelled nested/stratified activation screen with protected equal coverage and deeper, predeclared follow-up for distinct outcomes, provided the protocol explains what is and is not exhaustively covered. A disappointing small initial screen is **not** sufficient reason to permanently eliminate an onset family without its required numerical optimization.
- Archive structural and activation provenance for every candidate. Inactive onset genes must not change behavioral identity or consume duplicated optimization budget.

### 2.3 Numerical parameters and search boxes

Every structural cell receives meaningful **joint optimization of both D1 books' ordinary D1 genes and the active control genes**, while VGT Growth's original New L0 phenotype is **frozen in Assignment 2** (but its funding conflicts and performance remain part of every pooled evaluation). Do not multiply the number of studies by optimizing each strategy in isolation and adding results.

The Assignment 1 handoff proposed *nonbinding* research boxes for stop distance (3–25%), progress threshold (1–15%), adaptive extended hold (base+3 to 60 days), gate loss count K (1–4), recovery fraction (10–100%) and gate cooldown (5–250 sessions). **Audit these against the RC 2 engineering validity limits, numerical discretization and the original D1 parameter domains before precommitting.** These are reasonable starting proposals, **not evidence that one range is optimal**. Do not use future results to adjust them.

Respect conditional gene activity: e.g., under family C, `maximumHoldDays` and the age-dependent loss buffer are inactive; inactive parameters are masked in optimizer identity, evaluation cache, selection and neighborhood analysis. Keep true numerical D1 trailing-stop parameters distinct from the new unconditional protective-stop distance.

Include properly declared neighborhood radii for the control parameters, separate structural toggles from numeric perturbations, and document boundary effects. Maintain the original NL0 search machinery (quasi-random broad screens, NSGA-II stages, rungs, refinement, qualification), adapting explicitly to discrete cells rather than silently inventing a different optimizer.

---

## 3 — Structural optimization: protected broad coverage then qualified refinement

### 3.1 Fair broad coverage

Run independent broad exploration of all 64 base structural cells, per applicable development cutoff, with **explicit equal minimum budget per cell** and multiple reproducible seeds. Do not restrict the search to symmetric families or those near New L0. Do not pre-eliminate families using fixed-parameter New L0 results or standalone trade profitability.

A planning floor to consider is **at least 512 broad quasi-random proposals per cell per cutoff per replicate, with two independent replicates**, plus comparable qualification and later stages. If a different minimum is scientifically warranted by the actual NL0 stage schedule and throughput pilot, document the justification and exact budget *before* searching. This number is a planning floor, not proof of adequate coverage by itself. Carry the actual stage-level evaluation counts, unique candidates, cache hits, and pruning costs into the report.

Use a small throughput-only pilot for resource sizing. Pilot performance results may not change search boxes, rankers, quotas, or family selection. A fixed computation budget consumed is not a claim of convergence; label prematurely halted lanes and unsearched regions.

### 3.2 Complete comparable qualification

Every cell must have a fair opportunity to advance at least a small precommitted quota of its strongest diverse candidates through the **same** relevant NL0 Q1–Q6 gates and the current standard's robustness tests. Use complete pooled chronological replay, historical margin costs, minute-level mark-to-market drawdowns and explicit portfolio occupancy.

Maintain candidate diversity and risk-aware alternatives. Do not discard an entire control family merely because its first few sampled parameter settings perform poorly. Record which structures fail due to intrinsic validity constraints versus poor observed metrics.

### 3.3 Dedicated refinement and activation study

After broad qualification, use **predeclared and separately budgeted** focused searches for promising *structurally distinct* families, including asymmetric VGT/GDX combinations. Selection into refinement must obey frozen criteria, minimum representation/coverage rules and a known computational cap. Preserve both low-drawdown and profit-oriented qualified alternatives where supported.

Conduct the independently budgeted entry-day activation comparison from §2.2. Its candidate populations and budgets must be transparently comparable, and numerical parameters must be allowed to adjust when activation changes. Avoid comparing a fully optimized next-session variant against a same-session variant holding incompatible parameters fixed and calling it definitive.

### 3.4 Search-lane provenance

A truly independent lane must not be seeded from New L0, VG #2 Balanced, C4, IJ1 or other winners selected using later years. If you add an incumbent-informed lane as a controlled secondary comparison, prebudget it separately, label it, prevent it from displacing independent coverage, and retain the standard's **“no independent chronological test”** qualification for informed selections.

Preserve the Priority 3B/5B methodology as a reference, with explicit adaptations for active controls, discrete structures, new activation mode and computational costs. Do not alter the original NL0 code, configuration, historical artifacts or optimizer record.

---

## 4 — Compare original versus risk-aware *selection*, holding candidate populations fixed

Separately test whether better **selection** (not merely new trading mechanics) improves chronological performance.

Use the **same archived candidates and same cutoff-specific fitness/robustness evidence** under both selectors, without allowing either selection method to launch additional searches. Precommit an auditable two-by-two design:

| Mechanics available | Original NL0 selection | Experimental risk-aware selection |
|---|---|---|
| Legacy D1 family A (gate OFF, original stop onset) | Original selection/control | Selection-method effect only |
| Eligible new D1 families and decline-gate/activation choices | Mechanics effect only | Mechanics + selection effect |

Use only evidence legitimately available **at that fold's training cutoff** to rank or screen candidates. The subsequent walk-forward slice, 2025–2026, and later sealed results **must not** enter ranking formulas, parameter domains, selection heuristics, or rule revisions.

### 4.1 Define the two selection rules

- **Original:** Reproduce NL0's historic feasible-candidate gates, profit/robustness criteria, ranking and tie-breaking without reinterpreting them.
- **Experimental:** Define **one primary, simple, deterministic risk-aware ranker** before examining its results. It must balance profitability against risks implicated in the diagnostic: open-lot profit concentration, give-back/exposure at the cutoff, adverse-excursion severity, tail/neighborhood risk and capital occupancy, *without* converting profit into an arbitrary unexamined score. Specify the exact algebra/lexicographic ordering, units, constraints and missing-data behavior. Treat the $35,000 drawdown ceiling as the existing **historical research** constraint, not a future guaranteed cap.

Standard 2.2.0 §5.9 makes exposure statistics report-only by default. The user has authorized a **scoped experimental departure for this study only** so that explicitly precommitted §5.9-derived inputs may inform the experimental selection rule. Register that departure under the standard's amendment/adoption process. **Do not silently change 2.2.0 globally or weaken any existing [M] requirement.** The ranker may not use next-slice neighborhood outcomes, future drawdowns, or other post-cutoff information for selection; those remain *evaluation-only*.

Use identical historical per-side cost/interest assumptions and the same candidate population within each comparison cell. Archive each winner's candidate ID, vector, risk configuration, selection evidence and the exact reason the competing selector ranked it differently.

### 4.2 Distinguish rule effects

Separate, using controlled replays or ablation where possible:

- gains from the new trade-exit/entry mechanisms,
- gains from changing D1 numeric parameters,
- gains from using a different selection rule,
- changes in which strategy is funded or displaced,
- the role of same-session stop activation,
- tail-risk reduction versus profit sacrificed.

Do not claim that the selection ranker improves generalization because it happened to pick a stronger candidate in one previously examined slice. Report all development folds, failure frequency, and uncertainty.

---

## 5 — Chronological robustness, downside stress and comparison with New L0

### 5.1 Chronology and leakage

Follow NL0's precommitted C19/C21/C23/C24 development cutoffs and fold doors, plus additional folds **only if** they receive a full comparable search and are predeclared. Use 2016–2024 as the principal development window. Respect the causal train-before-test rule for every fold, including continuous open positions, warm-up and allocator state at boundaries.

**2020, 2022 and 2025–2026 have been repeatedly inspected.** Historical walk-forward results on these periods remain useful retrospective procedural stress evidence, **not virgin out-of-sample proof**. Do not claim these are pristine holdouts because they were excluded from one particular fit. No iterative adjustments after viewing later-period results without a documented new protocol and appropriately qualified evidence.

Where the repository's final-period gate allows a final 2025–2026 comparison, freeze parameters, primary selector, finalists, qualification rules, exact reports and hashes before opening it; evaluate once and do not use the output to tune this study. Report dataset endpoint precisely. If this cannot be enforced, label final-period results retrospective and do not claim independent validation.

### 5.2 Binding chronological consequence

Adopt Standard 2.2.0's default in the frozen protocol: **a failed chronological verdict gives “no chronological support; not a deployment-qualified candidate without the user's explicit decision.”** This is a qualification label/consequence, not a hidden scoring input. An incumbent-informed candidate also carries its required independence caveat.

Specify in advance what constitutes a **qualifying successor candidate** versus a research-only improvement, with feasible risk constraints, chronological verdict and comparison against the frozen New L0 profitability/drawdown frontier. “No qualifying successor” is a valid, fully successful outcome of the research.

### 5.3 Required diagnostics and stresses

For every fold-selected primary and notable structurally distinct finalist, provide Standard 2.2.0 §5.9 disclosures:

- share of cutoff training profit still unrealized in open lots;
- largest open lot's market-value multiple, unrealized risk and realized give-back;
- per-lot MAE and worst loss, with trade-level attribution to D1·VGT/D1·GDX/Growth·VGT;
- D1 hold-window tail stress on a declared reference history;
- training-selected parameter neighborhood replayed on the **following** chronological slice, with the evaluation used only as retrospective evidence.

Also report p90/p95 drawdown, worst-10% mean drawdown, breach frequency/severity against $35,000, profit concentration by episode, multi-year performance, occupancy/displaced trades, re-entries in prolonged downturns, and the relative contribution of protective stop, adaptive/disabled hold and decline gate.

Stresses: 10/20 bps transaction costs, 14% interest, +25 bps protective/trailing stop slippage, next-open stop execution, 2020 crash, 2022 prolonged bear, and controlled removals of D1 books and Growth to identify which mechanism drives drawdown. Report **severe gap-through-stop losses** and the limitation that neither stop distance nor historical max DD is a guaranteed portfolio loss ceiling.

### 5.4 Tail-stress reference data: choose defensibly, no paid purchase

First inspect available repository datasets and access rights for **pre-2016 VGT/GDX history**. If reliable disjoint pre-2016 daily or minute data are already available or obtainable lawfully without a paid purchase, validate splits, coverage, timestamps and price basis and use them for a clearly labeled hold-window stress appropriate to their frequency. **Do not fabricate minute-level fills from daily OHLC**, and do not claim a daily-bar approximation has minute precision.

If this data is not available, use an explicitly labeled **retrospective/in-sample 2016–2024 stress** plus synthetic gap/regime scenarios; optionally include a clearly identified peer proxy, with disclosed limitations. **Do not purchase data, loosen quality checks, or hold up otherwise valid research solely to acquire older history without further user authorization.** Record any future data-acquisition decision separately.

---

## 6 — Research outputs, auditability and handoff to Assignment 3

Produce at least:

1. **RC 2 specification and implementation:** versioned entry-day protective-stop choice, semantics, compatibility and synthetic tests; full non-regression gates with all controls default/OFF.
2. **Frozen Assignment 2 protocol:** actual structures, 64-base-cell plus onset design, numerical domains/grids, active-gene logic, seed policy, objective/ranking formulas, risk gates, budgets, qualified promotion rules, chronological consequence, data/provenance hashes, and adopted exceptions.
3. **Executed structural optimization records:** per-cell and per-seed search/qualification/refinement budgets, candidates and phenotype vectors, archived robust metrics, active control settings, center and neighborhood results, and named reproducible commands.
4. **Activation-mode study:** next-session versus post-fill same-session stops, including per-book asymmetry and gap/causality tests and explicit admission of any partial coverage.
5. **Selection-method study:** original/risk-aware 2×2 on identical candidate archives and fold-by-fold winners, with exact ranking evidence, differences, limitations and stress outcomes.
6. **Portfolio-level report:** comparison with frozen New L0, risk/return trade-offs, shadow/virtual versus funded accounting as appropriate, drawdown episodes, displaced trades, year/regime attribution, and clear uncertainty.
7. **Reproducibility:** scripts/commands, datasets, code hashes, manifests, artifacts, logs, exact executed budget and restart/recovery notes; ensure standard's textual/table reporting constraints are followed (no unnecessary visuals).
8. **Assignment 3 handoff:** identify the most defensible structural families and selection methodology for a later, user-authorized **full joint optimization of D1·VGT + D1·GDX + Growth·VGT**, including fresh and incumbent-informed lanes and adequate budgets. Carry forward alternative finalists where evidence warrants. Make clear which conclusions do **not** justify pruning whole structural regions.
9. **Repository status:** a clean research branch with committed/pushed work where safe, a concise report of pre-existing vs new test failures, and explicit inventory of anything *not* merged to `main`.

**Assignment 3 is out of scope.** Do not jointly optimize Growth's numerical phenotype with both D1 books in this assignment. Do not replace New L0, change production execution, introduce GDX Growth or shadow-position delayed-entry eligibility, or automatically merge the experimental engine to `main`.

Keep the separate Strategy Lab percentage-drag chart bug and future TSLA/MSFT research out of scope. Do not silently begin the previously deferred calendar-day versus trading-session from-scratch comparison. All D1 maximum-hold calculations in this research remain **calendar-day based** when the hold is enabled; financing interest remains accrued by calendar days.

---

## Final questions to answer

1. Can the new post-fill, same-session protective stop be implemented and verified without a backward-compatibility or lookahead defect?
2. Which D1 exit families and decline-gate settings remain competitive after **proper parameter optimization**, including asymmetric VGT/GDX pairs?
3. Does earlier protective-stop activation improve tail behavior enough to justify its additional structural complexity and potential early exits?
4. Does any family reduce the severe pre-hold D1 losses and repeated bear-market entries without displacing too much profitable pooled activity?
5. On *identical candidate populations*, does the precommitted risk-aware selector improve subsequent chronological risk or sacrifice profit without clear benefit?
6. How sensitive are conclusions to parameter neighborhoods, regime changes, open-profit concentration, execution assumptions and budget/search coverage?
7. Which findings genuinely qualify as candidate evidence, which are retrospective diagnostics, and where is the evidence inadequate?
8. Which mechanisms and selection rule should Assignment 3 investigate with fully joint three-phenotype optimization, and why?
9. Is **“no qualifying successor”** the correct result of this stage? If so, state it explicitly instead of manufacturing a winner.

**Success criterion:** A reproducible, adequately funded and transparently qualified structural/mechanics-versus-selection comparison, preserving every historical baseline, with a verified entry-day stop option and a defensible user-reviewable handoff to Assignment 3. The purpose is to improve *risk evidence and search reliability*, not simply maximize retrospective net profit.
