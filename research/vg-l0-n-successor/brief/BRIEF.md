# Claude Code — Priority 5: Comprehensive N/original Successor Optimization

## Mission and authorization

Conduct a comprehensive, reproducible **GPU-accelerated joint optimization of VGT D1 + GDX D1 + VGT Growth** to investigate whether a materially stronger and more robust successor exists to the current **N/original** research phenotype.

The user authorizes **substantial computing effort**. Do not artificially constrain the search to a short runtime or stop with large portions of the search unfinished merely because a previously used island/evaluation cap was reached. Use the established optimization methodology, accurately measure progress, and precommit sufficiently generous **convergence-driven extensions** before opening research results. More compute is authorized when it has a scientifically defensible opportunity to improve coverage, stability, or convergence—not merely to overfit training data.

**This assignment authorizes the research, including protocol preparation, verification, GPU optimization, validation of frozen selections, reporting, committing and pushing the research branch, and delivering a portable handoff. It does NOT authorize adopting any candidate, changing official strategy configurations, merging into `main`, deploying a strategy, or contacting a broker.**

A result of **no qualifying successor** is acceptable and must be reported plainly.

Read this assignment in full before beginning, including its final acceptance criteria. Follow `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md`, the registered `NEW_L0_METHOD.md` (NL0 1.0.0), the GPU parity/acceptance documentation, and all relevant repository instructions. Verify their current paths, versions and hashes rather than assuming older screenshots or summaries are authoritative.

---

## 1. Confirm the research baseline, scope and provenance

The research portfolio is exactly:

1. **D1 VGT** (Dip Recovery)
2. **D1 GDX** (Dip Recovery)
3. **Growth VGT**

They share **one exclusive funded-capital slot**. GDX Growth is OFF and must not be introduced. Do not add new securities or expand this into a multi-stock portfolio.

### Frozen comparison candidates

| Role | Candidate | Treatment |
|---|---|---|
| **Primary incumbent / informed starting point** | **N/original** | Use its exact documented genes as the principal incumbent seed; independently verify provenance and historical reproduction |
| **Immutable original benchmark** | **New L0 primary: VGT + GDX** | Fixed comparison only; never alter its phenotypes or historical artifacts |
| **Secondary research comparison** | **I1 — New L0 with staged trailing stops** (from Priority 4) | Preserve as a fixed, explicitly S1-enabled external benchmark; **do not** optimize around it or add its S1 genes to this search |

N/original is preferred as the informed starting point because its historical neighborhood risk measures were stronger than New L0's; it is **not automatically adopted**. I1 is a fixed comparator, not an additional independent optimization track. Keeping it for comparison must not double the search budget.

Recover exact immutable configurations, candidate IDs, source commits, datasets and result hashes from their authoritative studies before proceeding. Do not silently substitute a similarly named candidate.

Historical reference values to **verify**, not assume:

- New L0: approximately **$479,605.18** full-history net, **$20,385.99** maximum marked drawdown.
- N/original: approximately **$482,700.73** full-history net, **$20,385.99** maximum marked drawdown.
- I1: approximately **$494,374** full-history net, with similar recorded maximum marked drawdown; retrieve exact sealed figures and methodology before using it.

### Rules that remain fixed

- **P0**: conventional minute-sampled marked-equity maximum drawdown **35% of the initial fixed trading allocation**. With the canonical $100,000 slot this means **$35,000**, not 35% of peak equity.
- Existing **calendar-day maximum-hold semantics**.
- **S1 staged trailing stops OFF** for every newly searched candidate. Do not search activation thresholds or stage-two trailing distances in this study.
- **Shadow-position delayed-entry eligibility OFF**.
- Preserve the existing, supported D1/Growth strategy families, parameter domains, optional risk-control configurations, financial assumptions, capital-allocation priority, exit ordering and event chronology as established by the authorized Assignment 3 / NL0-style joint search. Do not invent or introduce a new rule family.
- Retain the original trade sizing, margin interest, per-side transaction costs, stop execution assumptions and corporate-action treatment; verify their canonical values in code/manifests.
- Principal-loss, banked-capital drawdown, profit giveback, liquidation-basis risk, gap/slippage and modeled margin exposure remain **separate reported diagnostics** unless the current authoritative P0 standard explicitly makes any one of them binding. Do **not** silently apply rejected experimental P2/P3 risk envelopes or the proposed peak-equity/hybrid qualification policies.

Confirm the actual parameter/genome space (historically the S1-OFF joint space was described as 92 genes in Priority 4), including structural switches, inactive dimensions, categorical combinations, canonical repair and candidate identity. Preserve all existing feature coverage within this scope; any intentional restriction or removal requires explicit, recorded justification **before the search**.

### Source studies and prior findings

Inspect at least:

- Original Priority 3B joint optimization and Priority 5B New L0 lineage.
- Registered `docs/research/methods/NEW_L0_METHOD.md` and methods registry.
- Priority 5 / Assignment 3 full-joint risk-aware optimization and its N/original results.
- Priority 4 staged trailing-stop audit and completed S1 research (`research/vg-l0-staged-stop/`), including its budget and convergence telemetry.
- Phase 7/8 GPU acceptance and official optimization infrastructure.
- The risk-envelope P0/P3 pilot and subsequent sensitivity/Stage B diagnostics, as context only—not as permission to change P0.

**Priority 4 is already completed.** Its sealed outcome was `INCONCLUSIVE (budget)` for S1 and its recommendation was S1 OFF. Do not reopen S1 development or resolve the two historical Growth-code-integrity test failures by weakening frozen identity checks. If the research branch requires an engine variant with S1 capability, force S1 OFF and prove exact baseline identity. I1 must be evaluated/reported in its original sealed context, not redefined as an S1-OFF phenotype.

---

## 2. Phase A — Recover how the optimizer searched and why lanes remained budget-limited

**Before writing or freezing the new optimization protocol**, perform a focused evidence reconstruction of actual search behavior and effective budgets.

Recover from executed logs, optimizer source and archived telemetry—not planning prose alone:

1. The NL0 1.0.0 search pipeline: quasi-random/global screens, NSGA-II islands, promotion, neighborhood rungs, refinement, diverse shortlist, candidate roles and final qualification.
2. The original Priority 3B **approximately 5.83-million-evaluation** search: what those evaluations actually comprised, which portions were comparable to this three-book portfolio, the number of distinct proposals, executed rounds, archive hits and original seed policy.
3. Priority 5B's incumbent-informed stages and actual refinement/exploration split.
4. Assignment 3's independent and incumbent-informed search: actual proposals, unique simulations, cutoff schedules, seeds, stopping reasons and comparative results.
5. Priority 4's **S1-OFF control** and S1-enabled search telemetry: at C21/C24, nearly half the S1-enabled lanes remained capped after extension; determine exactly which stages and structural regions exhausted their budgets, and distinguish these from ordinarily stopped OFF lanes. The S1-enabled genome is **not** the search space for this assignment, so do not assume it needs the same budget.
6. Per-stage GPU throughput, memory usage, job overhead and the impact of concurrent versus sequential jobs on the accepted current backend.
7. Whether existing optimizer extensions were limited by island count, refinement moves, breadth of global sampling, structural coverage, resource guards or genuine lack of improvement.

Produce a **budget-and-convergence evidence report** before launching any large optimization. Quantify for each relevant precedent:

- configured versus executed proposals;
- unique canonical/behavioral phenotypes;
- requested evaluations versus fresh GPU computations and cache hits;
- islands, generations, refinements and neighborhood evaluations;
- independent random seeds;
- budget-bound fraction by cell/fold/track;
- last-round progress, objective/hypervolume improvement and candidate diversity;
- stopping reason, including whether it represents actual stagnation or merely a hard cap;
- actual GPU time and peak VRAM.

**Do not describe budget exhaustion as convergence.** Do not infer an optimal configuration from a search that merely ran out of allocated evaluations.

---

## 3. Phase B — Specify and freeze a generously funded search protocol

Author a protocol in a **new, isolated research namespace**. Name and version it according to repository conventions. Register the required optimization-standard adoption and the exact NL0 reference-method ID/version/hash.

The protocol must be **sealed and committed before any large search** and must define all search algorithms, parameters, data doors, seeds, candidate roles, budgets, stopping conditions, risk gates, validation rules and acceptance criteria.

### 3.1 Two distinct search tracks

**Track F — Independent from-scratch joint discovery**

- Optimize all three books' existing numerical parameters and allowed original structural/categorical switches **jointly**.
- Use the registered NL0 broad-search procedures and full original parameter domains.
- Use independent, predeclared random seeds, properly distributed coverage and diverse structural strata.
- **Do not seed** from New L0, N/original, I1 or later-selected finalists; do not center the search around their neighborhoods or use their outcomes to prune ranges.
- Repeat the complete frozen selection procedure at chronological earlier cutoffs, using only information available up to each cutoff. This track provides the study's independent chronological procedure evidence.

**Track N — N/original-informed joint discovery and refinement**

- Seed precisely from **N/original** and, if methodologically necessary, other explicitly identified *pre-existing, already authorized incumbent-informed inputs* with their provenance stated before optimization.
- Preserve NL0's informed search machinery, fine parameter resolution, broad exploration and refinement, with exact candidate representability on the optimization grid.
- All three active strategy books' parameters may vary together within the permitted original genome.
- Keep it separately labelled **incumbent-informed**, because N/original was chosen using previously examined history. Do not claim that its earlier-cutoff outcomes constitute independent walk-forward evidence.
- Do not add a separate search seeded from I1 or New L0 merely to create extra winners. Both remain benchmarks.

The search must not reduce this to standalone D1 followed by independent Growth addition. **Every candidate's objective is computed by complete chronological shared-capital replay**, including funded-entry competition, rejected signals, capital occupancy, costs, financing, and all downstream displacement effects.

### 3.2 Preserve the proven methodology

Maintain the original algorithm families, sampling distributions, exploration/refinement balance, qualification roles, neighborhood tests, risk gates, and candidate-diversity rules wherever applicable.

Document the exact mapping from Priority 3B/5B stages to the new fixed three-book scope, including any omitted stages and how their budget is reassigned under the **same method**.

Do not replace the optimizer with a different search philosophy just because GPU computing is faster. Do not add experimental S1, P3, profit-relative stops, new holdings semantics, different allocator priority or other changes. Optimization improvements should come from **better search coverage and parameter discovery under fixed strategy behavior**.

### 3.3 A genuinely sufficient compute budget

The user explicitly authorizes **substantial GPU time** and prefers allowing the optimizer to reach its own documented stopping conditions when that can improve the evidence. This is not a request to burn compute needlessly.

Establish budgets from the recovered evidence and measured GPU throughput. Requirements:

1. **Do not underfund independent broad discovery.** Its effective search effort must be defensible against the original Priority 3B broad search, not merely against the narrower Priority 5B informed arm. State the comparison in common units and provide an evidence-based reason for the initial budget.
2. **Give Track N an independently sufficient budget.** It must not be starved to subsidize Track F. Preserve the historical informed exploration/refinement proportions unless a pre-search, clearly justified adaptation is needed.
3. Use **multiple independent seeds** and enough coverage across permitted structural families and distinct phenotype regions; retain exploration of rare but legitimate profitable behaviors.
4. Use convergence-driven extensions whose triggers and caps are predeclared, using **development data only**. Triggers may include continuing Pareto-frontier progress, improvement in robust net, genuinely new funded-trade signatures, successful discovery of underexplored structural classes, or a materially high share of budget-bound lanes.
5. Track **progress per unit of compute** and repeatability across independent seeds. More evaluations are not inherently better if improvements have plateaued or all additional candidates are duplicates.
6. Choose initial island/generation/refinement caps high enough that the study is unlikely to repeat Priority 4's approximately 48% budget-bound-lane outcome. Where supported by the code, allow **multiple predeclared extension rounds** rather than a single insufficient 1.5× extension.
7. Define quantitative stop conditions: demonstrated stagnation across predeclared rounds, adequate structural coverage, completion of confirmation neighborhoods, and an acceptable residual budget-bound fraction, with justified tolerances. A safety/resource ceiling may remain, but it must not masquerade as convergence.
8. Distinguish `budget exhausted`, `extension cap reached`, `stagnation`, `no eligible improvements`, `duplicate/behaviorally equivalent`, `user stop` and `resource/operational failure` in the records.
9. Do not use **2025–2026 validation outcomes**, or previously known historical profits of New L0/N/original, to trigger extensions, tweak candidate rankings or increase the budget after results arrive.
10. Precommit a response if a substantial fraction of lanes remains budget-bound despite all planned extensions: report this limitation accurately, preserve the search, and avoid declaring convergence. A further search is a separate methodological decision unless the extension was already approved and frozen in the protocol.

There is **no arbitrary 9-hour or fixed-day deadline** for this assignment. Do not prematurely stop a promising, budget-bound search solely to finish quickly. Likewise, do not run indefinitely: record prudent finite operational safeguards, checkpointing, cancellation conditions and precommitted stopping rules.

The protocol must report the **planned and maximum effective budgets** for each track, fold and search stage, together with approximate GPU time. Any estimates are planning figures, not a commitment that an unconverged search is finished.

### 3.4 Data and chronological governance

Use the repository's verified primary development window, historically **2016–2024**, with its exact market-data hashes and last eligible sessions. Follow the current standard's required earlier development cutoffs (normally C19, C21 and C23, plus final C24), or provide a documented, pre-search equivalence to the original NL0 procedure.

- Search/parameter choice only on eligible training data for the relevant cutoff.
- One sealed fold selection **before** opening its subsequent chronological slice.
- Maintain continuous warm-up, virtual states, open positions, interest accrual and allocator occupancy across boundaries; do not liquidate or reset at cutoffs unless canonical rules require it.
- Apply the standard's frozen chronological verdict and the consequence of failure. A candidate that lacks sufficient independent chronological support is **not deployment-qualified without the user's explicit decision**.
- **2025–2026 is previously examined validation history**, not a pristine holdout. Open it only after the final selections, ranks, risk criteria and code/data identifiers have been sealed and committed. Evaluate it once for the final frozen slate; no validation-driven iteration.
- Do not manufacture additional independence by treating already inspected periods as fresh out-of-sample evidence.

---

## 4. Phase C — Engineering, GPU parity and acceptance gates

Before official optimization, verify the actual repository state, data doors, relevant source branches, GPU acceptance record, and research protocol identity.

**The TypeScript/CPU evaluator remains the correctness reference. The GPU is the accepted official accelerator.** Optimization Standard 3.0.0 (or its verified successor) mandates GPU-only official evaluations and CPU/GPU parity.

### Mandatory checks

- Reproduce New L0 and N/original at their frozen historical data endpoints, including funded trades, net, marked maximum DD, cost/interest and relevant risk metrics.
- Verify the S1-OFF path is precisely equivalent to the original trading behavior for all allowed candidate configurations, not just one incumbent.
- Verify fixed candidate vectors and fixed-seed mini-optimizations: deterministic candidate ordering, rankings, promotion, qualification, checkpoint/resume and consistent event chronology.
- Confirm D1 VGT/GDX and Growth VGT have complete feature coverage on the GPU, including the original D1 risk-control and Growth exit options that the frozen search domain actually permits.
- Verify accounting, 35%-of-initial-capital DD qualification, other required risk values, gap stops, trading costs and interest on CPU versus GPU, especially close to decision boundaries.
- Verify the current GPU acceptance record and its out-of-band pin against **the exact current source and executable dependency graph**. Any evaluation-dependency change must renew acceptance under the authoritative parity checklist; never use a stale record.
- Use `node --no-maglev` on every applicable official process.
- Official optimization must use `openOfficialGpuSession` → `GpuPool` → `EvalLab`, fail closed, with **no silent CPU fallback**.
- Validate the relevant research/standard preflights and Strategy Lab simulation/portfolio regression. Do not change Strategy Lab production behavior.
- Preserve historical byte/code identity tests. The two previously declared Priority 5A code-pin failures associated with the S1 research branch must not be suppressed, silently updated or misrepresented as trading-parity defects. Avoid introducing S1 code changes into the new branch if not required.

If a gate fails, resolve the cause and repeat the affected verification before research; stop and report if correct parity and acceptance cannot be established. Never trade correctness for speed or skip coverage because a GPU feature is inconvenient.

### Source branch choice

Choose a reproducible, isolated research branch from an appropriate **accepted GPU-capable, S1-OFF reference revision**. Verify its ancestry, maintained risk-metric interfaces, N/original phenotype loading and accepted binary. If the only suitable branch contains staged-stop code, ensure S1 is forced OFF and its code identity/acceptance are handled transparently; do not merge S1 experimental changes into `main` merely to run Priority 5.

Do not alter historical sealed records, modify the frozen NL0 method, weaken code-fingerprint checks, or merge into `main` automatically.

---

## 5. Phase D — Execute the complete joint optimization

Proceed end to end **after** the protocol is frozen and the engineering gates pass. The user has authorized substantial compute and execution; no additional confirmation is required for ordinary predeclared search stages or extensions.

### Independent track

Run Track F's complete, precommitted global screens and islands, with all necessary qualifying rungs, refined diverse shortlists and chronological fold replications. Maintain protected structural representation and log actual candidate counts, unique ledgers, losses/benefits per strategy, and capital-pool occupancy.

### Incumbent-informed track

Run Track N separately, beginning from N/original with the existing, proven informed method. Search beyond trivial local numerical jitter while retaining fidelity to the permitted original genome and NL0 search algorithm. Do not constrain N/original to stay near its starting values if the original method permits meaningful movement.

### Budget extensions

Apply only the **precommitted** extensions when their development-only triggers fire. Keep the per-lane stopping policy deterministic under varied GPU batching and worker concurrency. Save checkpoints and complete event logs. Do not select a winner from partial results caused by a failure, interrupted worker or missed qualification stage.

### Evaluate and retain distinct finalists

Apply the standard's original roles and gates to every eligible candidate, not profit alone. Preserve materially distinct candidates, including actual-profit, robust-profit, balanced and lower-drawdown alternatives when supported. Do not allow all finalists to be near-duplicates of one N/original seed, or preserve superficially diverse genomes with identical funded-trade paths without noting their equivalence.

If a strategy book is rarely funded, explicitly report whether this represents legitimate complementarity, a weak component, or allocator crowding-out. Do not award profit from unfunded hypothetical trades or combine standalone P&Ls arithmetically.

---

## 6. Phase E — Robustness, downside risk, attribution and chronological testing

For the finalists and the original fixed benchmarks, assess all relevant **full shared-capital** metrics, using a common, clearly defined accounting basis.

### Profit and portfolio behavior

- Development net profit, previously inspected validation net and full-history net, with exact endpoints.
- Gross P&L, transaction costs, margin interest, realized versus open/marked P&L.
- Annual and regime/episode results; trade count, holding duration, win rate and funded exposure by strategy.
- Capital utilization, rejected signals, overlapping demand, displaced opportunities, funded-lot chronology and funding decisions.
- Concentration in the largest trades and known 2020/2022 episodes.

### Risk decomposition (report all distinctly)

- Conventional minute-sampled **marked-to-market maximum DD** in dollars and as a fraction of the original fixed allocation (the P0 binding ceiling).
- Individual trade **maximum principal loss** (marked and liquidation-equivalent where supported), and worst realized losing trade.
- **Banked-capital drawdown**, separating loss of accumulated realized/banked profit from ordinary profit giveback.
- Unrealized-profit **giveback**, dollars and percentage of peak accrued profit, with exact trade-level attribution where available.
- Open-profit share of training net, open-lot value-to-principal multiple, stop protection versus possible gap fills.
- p90/p95 and worst-10% mean risk statistics; worst perturbation, breaches above the P0 35% limit, and near-boundary sensitivity.
- Report-only account/margin-maintenance scenarios with explicit collateral assumptions; no claim that fixed-slot results guarantee Vanguard margin safety.

### Neighborhoods and stress tests

- Apply the established **selection and independent confirmation neighborhood families**, with transparent seeds and parameter radii, including structural switches and their proper inactive-gene masking.
- Include 0/2/5/10/20 bps per-side cost sensitivity as supported, 11% reference/14% interest stress, next-open/gap-through-stop and slippage stress where canonical implementations support them.
- Audit tail behavior of D1 maximum-hold losses, prolonged-decline re-entry sequences, Growth open-ended exposure and capital-pool interactions.
- Report parameter stability, favorable-parameter plateau breadth, across-seed repeatability, and objective-frontier diversity.

### Chronological procedure tests

- Repeat the full **independent** search-and-select procedure at the predeclared development cutoffs and examine subsequent chronological slices without lookahead.
- Re-run the selected **training neighborhoods** on their subsequent slices to distinguish local robustness from changing-regime fragility.
- Report procedure-level failures, worst periods, drawdown gates and open-position carry at cutoffs.
- Informed Track N has **no independent chronological validation by construction**. Label it accordingly rather than borrowing Track F's fold verdict.
- Use the existing optimization standard's precommitted qualification/consequence rules. A positive historical profit is not sufficient to claim deployment suitability.

**Do not change thresholds, parameter domains, search budgets or selection rules in response to the previously examined validation period.**

---

## 7. Phase F — Candidate comparisons and decision quality

Compare the frozen reference slate with the new results:

| Candidate | Status | Required interpretation |
|---|---|---|
| **New L0** | Frozen benchmark | Original historical reference; not an independent validation control |
| **N/original** | Preferred incumbent | Exact incumbent configuration, not automatically adopted |
| **I1 (New L0 + staged S1)** | Frozen secondary comparator only | S1-enabled historical research variant; never misrepresent it as part of this S1-OFF search |
| **Track F finalists** | Newly discovered independent candidates | Judge profit, risk, neighborhood and chronological procedure behavior |
| **Track N finalists** | Newly informed-refined candidates | Judge profit, risk and neighborhoods; explicitly flag historical seed/validation exposure |

The report must distinguish:

- True optimizer search improvements from simple changes of candidate evaluation basis.
- Numerical parameter improvement versus a change in funded-trade chronology.
- Realized-profit gains from unrealized mark effects.
- Center profitability from robust profits and loss tails.
- Historical gain from genuine independent prospective evidence (which we do **not** yet possess).
- Search progress from added compute versus research overfitting.

Where no new candidate materially improves the trade-off, retain N/original as the preferred research incumbent and New L0 as the frozen benchmark. Do not manufacture a successor to justify the computational expense.

Define **material improvement and uncertainty criteria before optimization**, using the established methodology and a justified significance/economic relevance threshold. Do not accept a few thousand dollars of extra cumulative historical profit as conclusive if the risk or chronological evidence is weaker.

### Final recommendation

Produce an evidence-based recommendation among:

1. A successor worthy of **consideration only**, with explicit risks and support level.
2. Keep **N/original** as preferred challenger and New L0 frozen.
3. No qualifying successor; recommend a distinct next research hypothesis rather than another unexplained budget expansion.

**Do not adopt or deploy any candidate.**

---

## 8. Execution safety and reproducibility

- Before executing, inspect current Git checkout, running jobs, worktrees and working-tree cleanliness. Do not overwrite another session's work.
- Use isolated worktree/branch and independent GPU job namespaces. Avoid conflicting writes to shared archives/databases, Strategy Lab data or existing research directories.
- Preserve all previous sealed and compressed research artifacts, including the archived Assignment 3 populations and the Priority 4 handoff. Restore compressed files only when actually needed, to verified scratch locations, without mutating originals.
- Record source/data/acceptance hashes, exact node/toolchain/CUDA versions, seeds, job identities, candidate schemas, parameters, batches, workers and runtime flags.
- Follow official GPU-only research workflow, attestations, data doors and resumable checkpoint policy.
- Preserve `--no-maglev` and out-of-band GPU acceptance verification.
- Keep large raw job archives available on Apollo until results are reviewed. Avoid unnecessary repository bloat; handoff should reference enormous datasets/archives by hash and recovery instructions.
- Commit and push the isolated research branch with reproducibility information, without merging experimental changes into `main`.
- Maintain Markdown and machine-readable reporting per Optimization Standard 3.0.0; do not create charts or visual research reports unless separately authorized.

---

## 9. Required portable ZIP handoff

Create a small, self-contained **portable ZIP handoff** at the end, with checksum verification and a stable reading order. This is a standing requirement for our Margin Trading research.

It must contain, at minimum:

1. **`READ_FIRST.md`** — concise findings, recommendation, how to inspect the bundle, what was intentionally omitted.
2. **`DECISION_REGISTER.md`** — accepted scope decisions, justified deviations, outstanding user decisions.
3. **`REPORT.md`** — full research narrative, results and limitations.
4. **`PROTOCOL.md`** and protocol-freeze/standard-adoption evidence.
5. **`METHOD_AND_BUDGET_RECONSTRUCTION.md`** — original NL0/3B/5B/Assignment 3/Priority 4 budget evidence and adaptations.
6. **`SEARCH_AND_CONVERGENCE_REPORT.md`** — per-fold/track/lane seed counts, proposals, unique evaluations, island/refinement progression, stop reasons, budget-bound fraction and extension triggers.
7. **`GPU_PARITY_AND_ACCEPTANCE.md`** — CPU reference parity, acceptance/pin identity, negative checks, Strategy Lab regression.
8. **`ROBUSTNESS_AND_RISK.md`** — neighborhoods, principal losses, giveback, banked drawdown, gaps and stresses.
9. **`CHRONOLOGICAL_VALIDATION.md`** — independent fold verdicts and previously-inspected validation disclosure.
10. **`FINAL_CANDIDATES.md`** — all finalist phenotype vectors/IDs/flags, roles, scores, trade-signature provenance and reproduction commands.
11. **`AMENDMENTS.md`**, `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md` and relevant machine-readable tables/manifests.
12. **`SHA256SUMS.txt`** covering every packaged evidence file, with all checksums verified after assembling the archive.

Include exact Git branch/commit and remote verification. Include source excerpts/patches or pointers needed to audit the study, but exclude enormous market data and caches. List omitted artifacts by path, hash and restoration/reproduction instructions. Verify `zip -T` (or equivalent), all checksums after extraction, and a secrets scan before delivering the ZIP.

If substantial job archives are retained locally, state their size and recommend verified compression/cleanup **only after user review**. Do not delete material necessary to reproduce the study.

---

## 10. Final acceptance criteria

The assignment is complete only when:

- [ ] Historical NL0 and recent study budget/convergence behavior has been reconstructed from executed evidence.
- [ ] The full search protocol, effective budgets, convergence-driven extension rules, cutoffs, seeds and thresholds were **frozen before searching**.
- [ ] The independent and N/original-informed joint searches were completed according to that protocol, or any remaining budget-bound/failed stages were clearly disclosed without false convergence claims.
- [ ] The permitted scope remained exactly VGT D1 + GDX D1 + VGT Growth, **S1 OFF**, P0 35% of initial allocation, calendar-day holds and current allocator semantics.
- [ ] CPU/GPU feature coverage, parity, acceptance and official fail-closed execution were verified; there was no silent CPU fallback.
- [ ] New L0 and N/original historical results reproduce, and I1 is used only as a frozen external comparator.
- [ ] Earlier-cutoff chronology, risk, neighborhoods, cost stresses and previously examined validation history are handled without leakage.
- [ ] All finalist roles, genuine profit/risk trade-offs and qualification outcomes are reported, including **no qualifying successor** if applicable.
- [ ] Existing research artifacts and Strategy Lab remain unchanged and functional.
- [ ] No adoption, deployment, broker action, automatic merge or rewriting of frozen results occurred.
- [ ] A complete, portable, checksum-verified ZIP handoff was committed/pushed and prepared for the user's review.

End your final response with a clear statement that **Priority 5 is complete or precisely what remains blocked; no strategy has been adopted or deployed; the user must review the handoff before any successor decision.**
