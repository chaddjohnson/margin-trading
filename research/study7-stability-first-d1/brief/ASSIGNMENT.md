# Claude Code assignment — Study 7: Stability-first D1 optimization, GDX standalone, and smaller shared-margin ETF pools

## Mission and instructions to Claude

Execute a **complete, rigorous, computationally substantial** research study in the existing TypeScript/Node.js margin-trading repository. The user wants **high/great net profit *and* genuine robustness**, not an inert, almost-never-trading configuration whose parameter neighborhood has trivial drawdowns. Find economically attractive **broad profitable regions** of D1 parameter space, rather than exceptional single-vector historical peaks.

The research MUST include:

1. **GDX standalone D1**: explicitly reexamine and, where warranted, re-optimize GDX for stability-first economic profitability. Include the previously optimized standalone GDX candidate(s), the standalone behavior of B5's `portfolioAware` GDX, and any older Study 5 GDX candidates as controls, with exact provenance. The prior GDX standalone work generated impressive center profits but lacked a passing neighborhood risk gate. **Verify the earlier numbers and selection status from repository records; do not take numbers from an AI conversation as authoritative.** Do not silently promote an old rejected candidate.
2. **VGT standalone D1**: retain the registered `primary` phenotype and the B1 control unchanged. Audit its already-strong evidence before deciding whether an additional standalone VGT optimization is informative. A newly tuned VGT standalone challenger is **optional**, not automatically preferable and not a required source of redundant massive compute. Its existing phenotype passed Study 6's comparable neighborhood risk gate in every tested replicate. **Do allow VGT's phenotype parameters to change inside separately optimized *shared pools***; standalone robustness does not establish pooled optimality.
3. **Frozen-subset research, with NO retuning**: use the registered phenotype of each included ETF and unchanged `shadow` single-slot allocator for:
   - B1 = VGT only (one-book control);
   - VGT + GDX;
   - VGT + XBI + XRT;
   - VGT + XBI + XRT + GDX (the no-KRE combination);
   - frozen B5 = VGT + XBI + XRT + KRE + GDX (five-book control).
4. **Pool-level stability-first reoptimization from the beginning**, with greatest emphasis on **VGT+GDX** and **VGT+XBI+XRT**. Include the four-book no-KRE pool as a predeclared secondary candidate (not just a negative-control afterthought). Allow all eight registered D1 parameters to vary per member *jointly with the shared pool's actual funded-trade outcomes*; never use summed standalone ETF P&L as pooled P&L. Existing frozen subsets and reoptimized subsets must be compared with identical economic/execution assumptions.
5. **Rigorous validation and independent robustness confirmation** of multiple behaviorally distinct candidates, with an honest `no candidate qualified` outcome when warranted.

This is a **new, separate research study**. It must not rewrite the D1 strategy rules, modify the allocator's semantics, relax risk limits to manufacture winners, change ETF membership beyond the specified test cases, or replace frozen registered phenotypes. No live trading, broker actions, production deployment, merge to `main`, or changes to the actual portfolio.

## User workflow: Claude manages the task without unnecessary interruptions

The user **prefers a single Claude prompt and Claude-managed execution**, as in prior studies, and is willing to let local numerical optimization run overnight—even 5–10+ additional hours—when there is a scientifically useful reason. **Do not cut necessary experiments, shorten mandatory robustness batteries, reduce fidelity, skip validation, or take silent shortcuts merely to reduce wall-clock time or Claude usage.** Correctness, reproducibility and completeness take priority.

- Use local, independently running Node.js/TypeScript CPU processes/worker threads to perform substantial optimization, caching, validation and numerical aggregation. A long local compute run is **not** itself a reason to ask for permission.
- Prefer a minimal number of Claude model interactions while the numeric workers run; Claude should initiate, manage, monitor appropriately, recover from failures and then analyze completed results. Do **not** skip essential analysis or make model-free judgment calls that require reasoning merely to save tokens.
- **Do not ask the user for approval just because a job may take hours, because token usage is uncertain, or because routine optimization is expensive in CPU time.** Ask **only** if you establish with high confidence that a necessary additional work phase will itself cause **materially greater Claude-model usage than a normal comparable project prompt** (for example, it genuinely requires a large series of active LLM reasoning/review cycles rather than long-running local calculation). Explain exactly why and what would consume tokens. Otherwise continue autonomously.
- Claude Code may have tool/session/runtime limitations. Do not promise zero-token waiting or guarantee completion in one session. Build durable jobs with persistent checkpoints, machine-readable completion markers, logs and a recovery command so computation survives context/session interruption. Prefer waiting on the process with low-overhead tooling rather than frequent LLM-driven polling. Never pretend a task was completed if it was only queued.
- An overnight runtime **allowance is not an instruction to use all available hours**. Do more computation only where a predeclared test shows plausible value: more search coverage, an uncertain fitness ranking, wider exploration of distinct viable regions, or improved Monte Carlo precision. Don't run enormous extra searches just to try to beat a failed holdout.

## Phase 0 — Repository inventory, prior evidence, integrity and study branch

Inspect `CLAUDE.md`, any context-recovery instructions, the currently checked out branch/worktrees, the current tree, `package.json`, and the real engine/CLI APIs before implementing anything. Locate, read and use (paths may differ; verify):

- `src/app/allIn-trailingBuy-postExitContinuation.ts`, D1 architecture and phenotype registry;
- `src/portfolio-aware-d1/` trace caching / N-book engine, `src/pools/`, `src/study5-gdx-b5-three-etf/`, and `src/study6-b5-kre-robustness/`;
- `config/phenotypes/D1/{VGT,GDX,XBI,XRT,KRE}.json`, `config/pools/{B4,B5}.json`;
- `research/study6-b5-kre-robustness-2026-10/` or its actual path: `PROTOCOL.md`, `BASELINE_AND_B1_B5_AUDIT.md`, `KRE_SENSITIVITY.md`, `JOINT_INTERACTIONS.md`, `CANDIDATE_ROBUSTNESS.md`, `RECOMMENDATION.md`, and sealed machine-readable records;
- earlier **GDX D1 standalone optimization/robustness research**, particularly `research/study5-gdx-d1-b5-three-etf-2026-10/`, `research/portfolio-aware-d1-optimization/`, and their exact GDX vector IDs, ledgers, neighborhood results, training/validation boundaries and rejected/near-miss reasons;
- `research/vgt-standalone-vs-pooled-robustness/`, `research/vgt-d1-refinement/`, `research/d1-robust-pool-discovery/`, `research/d1-diverse-pool-discovery/`, `research/joint-16-etf-d1/` and relevant methodological critiques. **Prior large neighborhood-driven search studies already exist and failed to nominate a candidate. Extract their actual lessons rather than reinventing or blindly repeating them.**
- `research/prospective-b4-b5-shadow/` and its immutable forward-observation records.

Verify the installed scripts and real file names instead of assuming older reports are exact. Use a new isolated `research/study7-stability-first-d1/`, `src/study7-stability-first-d1/`, and research-only config namespace, or equivalent uniquely named paths. Create a **new research branch** based on the most appropriate commit containing the verified Study 6 / required engine tools; don't silently lose the unmerged Study 6 code or alter its sealed research artifacts. Do not touch unrelated user changes. Commit and push **this research branch only** after verification, without PR or merge; document commit IDs, source/data hashes and dirty-tree exclusions.

The canonical data historically ended 2026-10-29 for VGT/XBI/XRT/KRE/GDX; **verify actual end dates and append-only integrity**. All market data through that date and previous Study 5/6 results have already been exposed to this research program. Treat retrospective years and the 2026-10-14–29 recent slice honestly as **inspected**, not pristine final holdout or prospective alpha. Never modify the frozen prospective observation system or contaminate its measurements with newly optimized phenotypes.

Before outcome-bearing optimization, write a **precommitted/frozen protocol** containing choices, fixed search spaces, eligibility/economic gates, exact sample distributions/radii, training folds, chronology rules, objectives, budgets and any allowable triggers for extra compute. Freeze code/seed and data provenance. Explicitly document how this study differs from prior failed neighborhood-optimization studies. If an independent methodology review finds a critical issue, resolve it **before** the protocol/outcome freeze; do not adapt the design to observed validation results.

## Economic environment and no-lookahead invariants

- Exactly **one funded $100,000 margin lot** across a pool at a time, fixed notional, **no compounding**, independent shadow books and the existing first-executable signal / same-minute tie rule. Do not switch to preemption, splitting capital, new filters, priority tuning, new stops, position sizing, or other D1 rule changes.
- Margin interest **11% simple annually**, 365-day basis, $100,000 lot; **5 bps per side** base friction; real causal 0/2/10/20-bps and 8%/14% financing sensitivities, plus specified execution slippage/fill sensitivity. Keep stop-at-stop / gapped opening logic of the canonical engine. Trading friction and margin interest must enter path-dependent exit logic correctly, not be subtracted after generating a different path.
- Preserve each D1 parameter's existing quantized grid and legal box. Predeclare radius definitions and boundary handling. Favor both `clip` and `in-box` sensitivity diagnostics, especially near parameter bounds; do not present one as independent proof.
- Always report **minute maximum drawdown** and daily drawdown; keep the primary **$35,000 minute-DD ceiling per $100,000 slot** (strict `< $35k` where previous risk gate requires it). This is a historical gate, not an enforceable future stop-loss and not a portfolio-equity percentage.
- Preserve chronological state: highs, trailing buy, continuation, stops, entry eligibility, accrued interest, margin occupancy and pool reservations carry across period boundaries. Prevent any future-bar leakage or retrospective reselection.
- Use a fixed common-period comparison, with boundary marking accounting for open trades. Distinguish realized from marked unrealized P&L.
- The actual 60/40 VOOG/VGT core and 20%-equity margin overlay are **not** the fitness environment. They are not licensed for live implementation; do not run a production/deployment decision on the strength of fixed-slot findings.

## Phase A — Frozen phenotype subsets and historical mechanism diagnosis (NO tuning)

Evaluate the five specified frozen setups across the available verified historical dates with matching costs and data. Audit historical profit, exposure, funded and refused trades, years/regimes, maximum minute/daily DD, borrowing capital-days, median and lower-tail returns, per-book contributions and displacement chains. For each pool:

1. Compare the exact center and risk/economic metrics.
2. Assess one-book-at-a-time perturbations, all-parameter joint perturbations, and **dimension-matched** alternatives (equal perturbed coordinate count/scale where possible), using precommitted sampling and Monte Carlo replicates. A 40-D B5 joint sample and an 8-D B1 sample are **not** automatically evidence of equal difficulty.
3. Quantify *funded-trade sequence* instability and signal competition, particularly March 2020 and re-entry patterns in 2022–2023. Separate perturbation-induced changes to a book's own P&L from changed pool funding/blocking.
4. Check whether the smaller pools actually exhibit a plateau; **do not assume** removing KRE necessarily improves pool risk.

Save the Phase A results as a read-only baseline before tuning anything. Don't select the primary optimization objectives, windows, or pool rankings retrospectively from these results; the protocol already fixes them. It is fine to use Phase A as descriptive context and comparison.

## Phase B — Stability-first optimization is active FROM THE START

Perform a serious multi-objective, neighborhood-driven search, **not** a conventional center-profit optimizer with only a final robustness veto. Prioritize the two specified smaller pools plus GDX standalone. Existing B1 is a frozen control. For pooled experiments, fitness is the **actual causal funded-pool** result; optimize the included books' eight registered D1 parameters jointly. The four-book no-KRE pool has a separately fixed, reasonably sized secondary budget.

### Robust economic fitness (not "perfect stability with no trades")

For a candidate vector/pool `theta`, estimate its neighborhood distribution using shared random offsets (common random numbers for fair ranking). Drive selection with **constrained Pareto optimization** over:

- **High center net P&L**, after 11% interest and 5bps-per-side friction; profit is important, not an afterthought.
- **High neighborhood median net P&L** and **high neighborhood p10 net P&L**; prioritize profitable plateaus.
- **Low neighborhood p90 minute drawdown**, **high neighborhood pass rate below $35,000**, and suitably controlled center DD.
- **Credible economy per borrowed-capital-year / dollar-day**, not merely whole-decade nominal profit.
- **Activity and breadth**: sufficient *independent trade opportunities / market episodes*, reasonable distributed occupancy and successful years/regimes, avoiding trivial 0- or 1-trade solutions, and bounded concentration in top trades or one exceptional year. Do not force churn to meet a raw trade-count target.
- **Evidence of profitable re-entry across market environments** without making selected performance hinge on one favorable capital-contention sequence.

**Preference ordering:** Among strategies that satisfy robustness and economic eligibility, prefer the **more profitable, risk-efficient** strategies. A highly robust candidate with good/great returns is preferable to an almost perfectly stable candidate with weak returns. Keep risk gates meaningful, but **do not require retaining 90% or 95% of B5's extraordinarily favorable historical center profit**; this would defeat the goal of discovering a stable but moderately profitable region. Predeclare economically defensible minimum return/activity/concentration floors based on training-side controls and borrowing opportunity cost, not post-hoc desired winners. Report weaker candidates descriptively if all fail.

Do not use only a weighted score susceptible to scale choices. Use feasibility/constraints plus Pareto frontiers or equivalent multi-objective ranking. Analyze sensitivity to trade-count thresholds and whether a near-zero-trading strategy is exploiting the risk metric. Report center/median ratio, neighborhood p10, neighborhood p90 DD and neighborhood pass rate for every finalist. Avoid treating a near-zero center-to-neighborhood gap alone as favorable.

### Multi-fidelity compute allocation, with value and overfit controls

Run a benchmark/pilot on **training data only** to estimate throughput, memory and the marginal precision of neighborhood fitness. Then lock an executable tier schedule. As a starting engineering target (adjust and freeze **before** observing substantive optimization outcomes):

- Cheap broad candidate generation: evaluate centers, and small 8–16-point neighborhoods for *economically plausible* configurations; preserve low-profit-but-viable diversity as well as high profit.
- Middle rungs: ~32–64 perturbations per promising candidate with diverse base vectors / trade sequences.
- Advanced regional exploration: ~128+ perturbations for competitively viable regions, with local refinement against **neighborhood fitness** itself—not solely the center.
- Independent confirmation: 128–256+ newly reserved offsets/seeds and multiple radius/boundary designs **not used in selection or refinement**, per finalist, with sufficient replicate precision to interpret results near the 90% gate.

The numerical tiers above are **provisional engineering suggestions**; freeze actual sizes based on benchmarking and statistical precision *before outcome-bearing runs*. Use common random numbers **within** a comparison rung, but don't recycle exactly the same finite perturbation sample as the only objective throughout all phases. Distinguish optimization noise from true profit differences with paired comparisons and independent seeds. Make total search multiplicity explicit.

**Extra computation is permitted only if useful.** Predeclare training-only triggers for intensification: e.g., materially incomplete coverage of distinct profitable regions, eligible candidates' rankings within Monte Carlo uncertainty, high fitness improvements still occurring across successive independent exploration islands, or unresolved robust-but-profitable Pareto regions. Allow a substantial local CPU budget, potentially >10 hours, when such triggers fire. Otherwise stop when predefined saturation or no-eligible-region criteria are met. **Never** trigger extra optimization because a validation/confirmation result was poor, and never retune candidates after looking at their confirmation or retrospective evaluation. Don't repeatedly keep trying seeds until one passes.

Predeclare/measure value of each compute escalation (more *information*, not only more trials). When extra sampling is proposed, distinguish variance reduction around a fixed candidate from increasing the number of searched candidates; the former can improve precision, while the latter increases selection/multiple-testing exposure.

### Cache and checkpoint rigor

Investigate and use correct, deterministic:

- Per-symbol/per-vector **virtual-trade trace caching** (for independent shadow-book traces).
- Canonical full-pool replay caching keyed by ordered active books, vector signatures, data hashes, simulator version/semantic hashes, costs, interest, stop/fill settings, dates, warm-up and any state-bearing input.
- Exact-vector and behaviorally equivalent replay deduplication when justified.
- Persisted optimizer/random-stream state, selections, evaluated-point records, progress, manifests and worker recovery.

Cache must be **semantics-preserving**, not merely fast. Build parity checks with the authoritative N-book engine, including under changed costs/interest/fill assumptions, and enforce correct invalidation. Never substitute a frictionless trace where friction affects a stop or a funded trade. Include deterministic restart tests and no-lookahead/invariance tests. Reuse previous Study 5/6 infrastructure where its integrity can be verified rather than reimplementing it.

## Phase C — GDX standalone and VGT-specific research obligations

### GDX standalone — MANDATORY, full effort

Treat GDX as an explicit distinct standalone research track, not merely as an optional member of VGT+GDX or an existing B5 book. Verify the historical standalone GDX optimization and Study 5 near-miss(s), their exact trade counts, center net/DD, neighborhood median/p10, 90%-gate failure and evaluation window. Include the registered B5 GDX `portfolioAware` phenotype and prior standalone-first GDX phenotype as unchanged controls. Preserve their distinct roles and **never** confuse standalone book profits with GDX's actually funded B5 contribution.

Optimize GDX standalone under the SAME robust-economic-fitness principle: profitable neighborhoods, strong absolute economics, center and tail drawdown, independent episodes and trade frequency, chronological selection. Preserve multiple divergent GDX finalist vectors (e.g., more active/strong return, balanced plateau, lower DD) only if they are genuinely distinct. Analyze why prior high-center-profit GDX candidates failed neighborhood gates. Evaluate whether GDX can **independently** attain stable, economically meaningful D1 behavior without silently relaxing the drawdown gate.

For the VGT+GDX pool, do **joint** pool-level optimization and report whether a stable standalone GDX region translates into stable *funded-pool* performance. Standalone superiority is not sufficient.

### VGT — PRESERVE proven control; optional standalone exploration

Study 6's B1 (VGT `primary` alone, 5bps) passed the comparable $35k neighborhood gate: center DD ~$19,534, 100% of tested N1 neighbors below $35k, p90 ~$28–29k; it has substantial positive historical net P&L. Preserve it unchanged and give it equal-cost control status.

VGT standalone **does not require a full expensive re-optimization by default**. Perform a training-only diagnostic of whether it exhibits a meaningful profit-versus-risk opportunity gap—relative to its already-stable primary phenotype—large enough to justify a *precommitted* standalone challenger track. A modest additional standalone search is permissible for this diagnostic, but don't spend many hours searching an already strong neighborhood without evidence of upside. **Do not let VGT's existing robustness prevent reoptimizing VGT jointly inside the two- and three-book pools**; its optimal role under capital contention could differ. New VGT variants are research-only and must pass independent validation just like GDX variants. Report explicitly whether optimizing VGT separately was warranted and why.

## Phase D — Chronological and independent validation without leakage

Use **nested, reproducible walk-forward selection**: each outer fold runs its own optimizer and its own training-only neighborhood selection, then freezes a bounded behaviorally distinct shortlist before seeing the fold's subsequent evaluation period. A candidate selected on the full 2016–2026 run must never be called independently validated by slicing its already-seen performance into years. Do not use later market bars in precomputed trace features, cached decisions or hyperparameter tuning.

Suggested historically comparable split (verify folds, event count and feasibility before freezing): development 2017-06-15–2021-12-31, retrospective validation 2022–2023, later descriptive/blocked inspection 2024–2026-10-29; additionally use multiple outer rolling/expanding folds with feasible independent dip-event counts. State carry/warm-up across boundaries without permitting future information. If early folds lack enough trades to give meaningful confirmation, **report insufficient evidence rather than weakening the gate or re-labeling data**. Check that any 2024–2026 evaluation is authorized under the existing project's research evidence policy; no research phenotype should be silently run in an old study's barred data door.

All periods up through October 29, 2026 are known to the analyst, including the reasons earlier candidates failed. **Label the entire program retrospective**: nested chronology is useful as a procedural overfit check but does not magically create independent market histories. Real prospective inference requires fresh post-freeze observations. No optimization choices may use 2024–2026 information; if inspected later, it is a one-time labeled diagnostic for frozen nominees, never a rescue/tuning loop. Do not overwrite or redefine pre-existing prospective B4/B5 measurements.

**Robustness confirmation MUST be independent of optimization samples and decisions** (separate seeds/radii, candidate hashes frozen before opening), and include:

- full-dimensional joint tests and one-book-at-a-time tests;
- dimension-matched comparisons, at least one alternative step radius and clip vs in-box boundaries;
- cost/interest/stop/slippage sensitivities;
- paired comparison with frozen B1/B5 and frozen subset controls;
- trade-sequence, occupied-slot displacement and realized/marked P&L reconciliation;
- independent trade/event breadth, profit retention, drawdown tails and selection multiplicity.

Compare multiple promising finalists but keep predeclared rules for selecting any nominee. A **no-nomination** result is valid and must not trigger retroactive rule changes, extra validation peeks, a later search round, or a reduced risk gate.

## Phase E — Deliverables, verification and decision report

Create complete reproducible records under the Study 7 namespace:

1. `PROTOCOL.md` with frozen pre-run goals, risk/economic gates, data access, seeds, budgets, training-only extra-compute triggers and timing benchmark; research-plan comparison with prior studies.
2. `BASELINES_AND_FIXED_SUBSETS.md`: five frozen configurations side by side, including center, neighborhood metrics, equal-dimensional tests and capital contention.
3. `GDX_STANDALONE.md`: baseline controls, new search, multiple finalists, center and neighborhood economics, training/validation and rejection/acceptance reasoning.
4. `VGT_CONTROL_AND_ROLE.md`: precise B1 robustness evidence, standalone reoptimization decision, and VGT's role within each joint pool.
5. `OPTIMIZATION_AND_COMPUTE.md`: objective formulations, candidate eligibility, search coverage, all search/perturbation counts, compute budget use, cache hit rates, wall/CPU time, seeds, checkpoints and triggers. Explicitly show whether longer local computation produced better information or merely more trials.
6. `NEIGHBORHOOD_ROBUSTNESS.md`: every finalist's median/p10 net, p90 DD, pass rate, replications, boundary effects, near-zero-trade guards, and center/neighborhood gaps.
7. `WALK_FORWARD_AND_VALIDATION.md`: each outer fold's pre-freeze training optimizer, winner list, out-of-fold results, retrospectively inspected caveat and independent confirmation; anti-overfit analyses including multiple-testing warnings.
8. `TRADE_SEQUENCING.md`: episodes, funded/displaced lots, single-slot interactions, major DD decompositions and counterfactual controls.
9. `EXECUTION_AND_INTEGRITY.md`: engine parity, test results, deterministic resumption, cache invalidation proof, costs/interest sensitivity, data hashes and complete regression checks.
10. `RECOMMENDATION.md`: **clear ranking** of strong/high-profit robust nominees vs modest-profit stable variants vs frozen B1/B5, precise gating failures, practical trade-offs, and a clear `none` option. Separate the study's own mechanical nomination from the analyst's evidence-weighted assessment. Avoid claims of predictive probabilities.
11. `RUN_COMMANDS.md` and `RESEARCH_RECOVERY.md`: exact verified commands, progress/resume, process status, last finished stage, run outputs, commit IDs and verification steps; export candidate configurations in **research-only** paths and preserve all relevant trade ledgers.
12. Machine-readable JSON/CSV manifests for *all* candidates evaluated and selected, independent confirmation records and hashes, audit logs, original protocols, regression/validation artifacts and precise source version. No fabricated aggregate tables.

**Completion gate:** Do not call the study complete if mandatory work is missing. If resource/session limits interrupt the workflow, commit/checkpoint all completed work and clearly state what remains, without silently omitting anything. Do not present an optimization as successful merely because the highest-scoring center made a lot of historical money. Finish with a concise summary suitable for review by ChatGPT and the user, including links/paths to these reports and the exact research branch/commit.

## Priority and scientific interpretation

The study should answer, in this order:

1. **Is GDX standalone capable of a genuinely profitable, broad and acceptable-risk D1 neighborhood?** If not, how and why does it fail?
2. **Do VGT+GDX or VGT+XBI+XRT become historically more stable using the existing frozen phenotypes?** What do full-dimensional and dimension-matched perturbations say?
3. **Can direct neighborhood-fitness-driven joint pool optimization find configurations with strong *and* stable economics, including moderate-profit plateaus conventional center-profit screens could miss?**
4. **Is the registered VGT primary a strong enough standalone control that further standalone VGT optimization adds little, while allowing different VGT parameters in a shared pool?**
5. **Do any improvements persist under chronological testing and independently reserved perturbation confirmation, without another overfit peak?**
6. **Was the extra local computation beneficial?** Document evidence and diminishing returns. Stop for a scientific reason, not a wall-clock or Claude-token shortcut.

The user's desired end state is **a highly stable strategy with good or great profit**, not the perfectly stable strategy with almost no useful profit. If evidence does not support such a strategy, report that directly, preserve frozen B1 and B5, and recommend prospective research-only observation rather than unearned deployment confidence.
