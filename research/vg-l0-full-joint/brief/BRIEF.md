# Claude Code — Assignment 3: New L0 Risk-Aware Successor, Full Joint Optimization

## Mission and authorization

Execute **Assignment 3** of the New L0 risk-aware successor research program: a rigorous, reproducible, **full joint optimization** of the existing three-book shared-capital portfolio:

1. **D1 · VGT**
2. **D1 · GDX**
3. **Growth · VGT**

Unlike Assignment 2, **none of these three strategy parameter vectors is frozen** in the new joint searches. Optimize the D1 parameters, eligible D1 risk-control structures and parameters, and **Growth · VGT's complete applicable Growth 1.4.0 genome jointly**. Each candidate must be scored using one causal, chronological, shared-capital replay—not by adding standalone strategy profits.

The objective is to seek a successor that preserves as much of New L0's profitability as possible **while demonstrating materially stronger downside-risk characteristics and credible chronological selection evidence**. A lower-profit but better-supported risk profile can be preferable. **“No qualifying successor” is a valid, successful research result.**

This assignment includes actual implementation, protocol freeze, optimization, validation, reporting, and commits of the isolated research work. **Do not adopt, deploy, merge experimental engine changes into `main`, change production trading settings, or replace the frozen New L0 candidate.** Final adoption requires an explicit subsequent user decision.

Read the full current repository instructions and source artifacts before planning or executing anything, particularly:

- `CLAUDE.md` and `docs/research/OPTIMIZATION_STANDARD.md` (registered version 2.2.0, or the currently applicable newer version if verified).
- `docs/research/methods/NEW_L0_METHOD.md` (reference **NL0 1.0.0**).
- `research/vg-l0-risk-families/REPORT.md`, `ASSIGNMENT3_HANDOFF.md`, `PROTOCOL.md`, `SPECIFICATION_RC2.md`, `TEST_REPORT.md`, `AMENDMENTS.md`, and `RESEARCH_RECOVERY.md`.
- Assignment 1's RC 1 specification and its frozen baseline and parity records; the original Priority 3B and Priority 5B optimization artifacts.
- All applicable repository data-access, protocol-freezing, optimization-standard adoption, and research-isolation requirements.

**Treat Assignment 2's handoff as source evidence and a proposal, not an already authorized or frozen Assignment 3 protocol.** The user has approved the full-joint direction and the research safeguards below. Reconstruct actual code/API details from the repository rather than guessing them.

---

## 0 — Research provenance, isolation, and frozen control

### 0.1 Establish a clean starting point

- Verify the current Git checkout, working tree, active worktrees, remote state, available branches, and the latest audited tip of `research/vg-l0-risk-families`. Do not assume a screenshot commit is the current tip.
- Create a **dedicated Assignment 3 research branch or worktree** from the appropriate verified research lineage. Keep uncommitted work from other sessions isolated; never overwrite it.
- Preserve Assignment 1 and 2 research artifacts and hashes. Do not edit their sealed protocols, reports, standard pins, or original RC 1 files.
- Reuse the tested RC 2 engine, `src/d1-risk-controls-rc2/`, rather than copying or rewriting D1 execution logic without need.
- The legacy New L0, Study 8, Priority 3B/5B, shadow-eligibility, and other frozen historical studies must retain their original identities and integrity checks. Never bypass, weaken, or silently repin those checks.

### 0.2 Frozen New L0 baseline

Verify from sealed source artifacts—not just this prompt—the New L0 configuration, trade ledger, funding decisions, historical data hashes, and accounting conventions. The expected reference figures on the existing verified dataset are:

| Window | Frozen New L0 net | Frozen New L0 maximum minute DD |
|---|---:|---:|
| 2016–2024 development | $382,721.46 | $19,459.83 |
| 2016-01-04 through 2026-10-30 full history | $479,605.18 | $20,385.99 |

The full-history run contains **46 funded lots**. It uses **one fixed $100,000 shared-capital slot**, historical **11% simple margin interest** and **5 bps per side** trading costs, with the established minute-level execution and corporate-action conventions. Reproduce the sealed baseline exactly at the relevant accounting and event levels, including its funded/denied decisions and mark-to-market behavior.

**Keep original calendar-day maximum-hold semantics** for every enabled hold in this assignment. Do not repeat the calendar-day versus trading-session experiment.

### 0.3 Fixed study scope

- D1·VGT, D1·GDX and Growth·VGT only. **Growth·GDX remains OFF.**
- **Shadow-position delayed-entry eligibility remains OFF**; do not mix it into this study.
- Do not optimize symbols, capital fraction, allocator priorities, same-instant priority ordering, core holdings, leverage policy, or transaction-cost assumptions.
- Keep the shared-capital allocation engine and Growth rule family consistent with the verified source configuration except for the explicitly authorized D1 risk controls and optimizer adaptations.
- No new pre-2016 data are required or authorized. Do not block the study on pre-2016 availability, purchase data, or present same-period proxies as independent evidence.
- TSLA/MSFT optimization and the Strategy Lab drag-to-measure UI bug are separate assignments and **out of scope**.

---

## 1 — Verify engineering readiness before optimization

Before any search, verify or complete the adapter from RC 2 and the pooled allocator to the **fully mutable three-book joint genome**. Write tests first for any new integration behavior.

Required equivalence and correctness checks:

1. **All optional controls at legacy defaults** reproduce frozen New L0 exactly, including the complete trade ledger, funding log, minute marks and risk metrics.
2. Original RC 1 behavior remains byte/evaluation-identical where RC 2 is not selected; next-session RC 2 semantics remain equal to RC 1.
3. Entry-day protective-stop activation sees **only post-fill observations**, handles fill-minute lows and later minutes causally, and preserves gap-through-stop behavior. It is not a guaranteed loss limit.
4. Both D1 books independently honor their chosen controls; no cross-book mutation, double funding, noncausal filling or duplicate position state.
5. Changing Growth genes genuinely changes **Growth's executable signals and state**, not merely a reported phenotype vector. Confirm valid conditional-genome activation/masking, serialization, evaluation identities and caching.
6. Complete portfolio P&L, transaction costs, calendar-day interest, mark-to-market drawdown, carried state and same-minute event ordering reconcile with the original engine.
7. Determinism, worker/restart reproducibility, data-doors, optimizer identity/hash masking, split adjustments and prior study digests remain intact.
8. All relevant existing and new tests pass, with existing unrelated failures documented separately; no regressions.

Do not interpret a protective stop that never fires in historical samples as proven risk protection. Test synthetic −10%, −20% and −30% gap scenarios and relevant halt/illiquidity limitations.

Any material execution or accounting defect must be fixed, independently tested and documented **before** the protocol/search is frozen. A post-freeze change requires a recorded amendment and the applicable rerun/restart procedure; never silently rewrite a sealed research stage.

---

## 2 — Freeze a complete, auditable study protocol

Before searching or opening results that could influence decisions, author and commit an **Assignment 3 protocol**, an adoption manifest, reproducibility manifest, data and code pins, execution budgets, and selection procedures. Follow `OPTIMIZATION_STANDARD.md` 2.2.0 and NL0 1.0.0 unless a specific verified newer standard governs.

Document exactly:

- Study hypotheses and the baseline, controls, structural families and allowed ranges.
- Four development cutoffs and their chronological next-period evaluation windows.
- Every active/conditional gene, units, parameter boxes, sampling method, grid/masking rules and neighborhood radii.
- Structural and Growth strata coverage; random seed policy; per-lane stage order and quotas.
- Independent versus informed lanes, provenance rules, stage-level budgets, qualification gates, refinements, promotion and stopping conditions.
- The original NL0 selector and the **unchanged RA1 experimental selector** on identical candidate populations.
- Chronological success criteria, consequence of failure, successor qualification rule and exact reporting schema.
- Final-period access gate, data/decision fingerprints, amendment policy, checkpoint/resume and resource limits.

**No changes to selection thresholds, risk gates, parameter boxes, or search allocation after viewing performance** unless handled as a clearly separate, transparently retrospectively designed subsequent study. Never tune RA1 to eliminate its known March 2020 breach.

### 2.1 Structural risk-control genome

Each D1 book independently selects one of the four RC 1/RC 2 families already implemented:

| Family | Holding policy | Unconditional protective stop |
|---|---|---|
| **A** | Legacy calendar-day maximum hold | OFF |
| **B** | Legacy calendar-day maximum hold | ON |
| **C** | Maximum hold disabled | ON (required) |
| **D** | Bounded progress-extended/adaptive calendar-day hold | ON |

Independently for each D1 book, retain:

- The original **eight D1 numerical genes** and valid associated conditional genes.
- The prolonged-decline entry gate **OFF/ON**, including eligible **K**, recovery fraction and session cooldown parameters.
- The protective stop's distance where ON.
- Protective-stop activation **`next-session` / `entry-day`**, as a **per-book conditional categorical gene** where valid—not as a separately budgeted Cartesian duplication of every structural cell.
- Adaptive progress threshold and extended hold where applicable; invalid or inactive genes must be masked and cannot create artificial duplicate phenotypes.

The base cross-product is **4 VGT families × 4 GDX families × 2 VGT gate states × 2 GDX gate states = 64 structural cells**. Preserve **all 64** with minimum protected initial coverage, including asymmetric pairs. No family, decline-gate state or activation state may be excluded just because Assignment 2's historical finalists favored another structure. Keep the gate's K levels stratified and fair.

**Family C may never disable both maximum hold and the protective loss stop.** Disabling hold does not guarantee finite exposure; report real holding-duration distributions, capital occupancy, interest drag and tail stresses.

### 2.2 Full Growth genome

Optimize **Growth·VGT's entire valid Growth 1.4.0 genome**, reported in the handoff as **8 structural and 50 conditional numerical genes** (verify exact current code). Respect conditional parameters and the established Growth structural strata, including Rise, breakout, gates and *Growth's own internal eligibility settings* where applicable.

**Growth's internal signal/entry-eligibility genes are not the allocator's rejected-shadow-position eligibility feature.** The latter remains OFF.

Do not transplant New L0's Growth phenotype into every independent candidate. Growth was frozen in Assignment 2, making those walk-forward portfolio results only *conditionally independent*. Assignment 3 must explicitly remove that limitation for its **fresh/independent** tracks.

### 2.3 Parameter ranges and fairness

Reuse Assignment 2's precommitted, audited D1/control parameter boxes and NL0's documented Growth domains by default. Do not redesign boxes in light of Assignment 2's winners. Any technical invalidities or genuine version changes must be resolved with a pre-search audit and a transparent, frozen adaptation.

Conditional dimensions should consume search/perturbation budget only when active. Keep distinct categorical structures from numeric perturbations and explicitly report clipped/boundary candidates and duplicate trade paths.

---

## 3 — Search architecture: independent chronology plus incumbent-informed comparison

Use the actual NL0 1.0.0 / Priority 3B/5B mechanics: broad low-discrepancy coverage, appropriate NSGA-II islands, progressive neighborhood rungs, phenotype diversity, qualification, and informed refinement. Preserve stage order and relative effort where applicable; document every necessary adaptation to the larger joint genome. **Do not substitute a simpler optimizer just to finish quickly.**

### 3.1 Track I — fresh, independent, full-joint search

At **each cutoff C19, C21, C23 and C24**, jointly search D1·VGT, D1·GDX and Growth·VGT, including all enabled controls. Use only data available as of that cutoff and independent random seeds; do not seed from New L0, VG #2, C4, C4-refined, IJ1 or any other vectors selected using later history.

- Allocate equal minimum exploratory effort to the **64 D1 structural cells** at each cutoff.
- Within each cell give predeclared, protected coverage to relevant Growth structural strata, decline-gate K values, and the per-book stop-activation states. No structure or Growth family receives zero initial coverage because historical incumbents happened to favor something else.
- Preserve diverse center-profit, robust-profit and lower-drawdown nominees rather than refining only the highest historical net.
- Perform **same-cutoff local refinement**, seeded only from that cutoff's own eligible candidates, using a frozen selection scheme with structural and Growth-family diversity safeguards. It is part of each cutoff's independent procedure, not an excuse to introduce later-selected seeds.
- Keep all 64 family/gate cells eligible throughout protected exploration. Any subsequent refinement reduction must use **precommitted** qualification and coverage rules, not subjective post-result pruning.

**Budget:** The handoff proposes at least NL0's independent V-cell schedule **× 2 replicates per 64 cells per cutoff**, approximately **2.5–3 million evaluations per cutoff** on the earlier per-evaluation accounting, **plus separately budgeted qualification and same-cutoff refinement**. Growth's mutable genome may increase execution cost substantially. Use these numbers as a **floor/proposal to verify with a study-fidelity throughput pilot**, not as a claim that a certain number of evaluations ensures convergence.

Account separately for genuine proposals, unique phenotypes, actual pooled simulations, neighborhood/qualification evaluations, cache hits, retries and time. Document if any lane is resource-guard bound rather than converged; do not claim a capped lane converged.

### 3.2 Track N — incumbent-informed, full-joint search

At **C24 only**, perform a substantial, **separately budgeted** NL0-informed search. Seed from verified New L0 lineage candidates (e.g., New L0, C4, C4-refined and IJ1), projecting each onto the valid D1 risk-control structures using a **precommitted** control-parameter seed grid; ensure this is not restricted to tiny perturbations around the incumbent.

- Jointly mutate/refine **both D1 books and Growth·VGT** plus the active risk-control genes.
- Preserve meaningful representation of all structural families, activation choices and Growth strata; avoid excessive concentration on New L0's known behavior.
- Use the documented NL0 informed-lane search/refinement stages, with multiple independent replicates; the handoff proposes **at least four**, subject to an auditable workload/fidelity pilot.
- Give Track N its **own** budget, without reducing Track I's promised coverage or refinement.
- At C24, make Track I and Track N **comparable in effective evaluation/search effort where methodologically meaningful**, with transparent matching and residual limitations. Do not equate unlike work merely because both use the same raw evaluation count.
- Label all Track N results **“incumbent-informed; no independent chronological test”**. Never retrospectively construct an independent C19/C21/C23 procedure from later-selected incumbent seeds.

A candidate may outperform the reference in historical profit and still lack independent selection evidence; report that distinction prominently.

### 3.3 Resource controls, readiness pilot and recovery

Use Apollo's available resources conservatively, honoring the repo's tested CPU/RAM limits and project workload isolation. The previous study executed about **34.21 million pooled simulations** over its complete structural search and encountered **117–155 resource-bound lanes per cutoff** from C21 onward. Address that bottleneck in the proposed budget and job-cap design, but do not claim more compute alone will fix chronological robustness.

Run a **performance/engineering-only** study-fidelity pilot before the protocol freeze to size workers, memory, per-lane costs, stop guards, checkpoints and disk usage. Do not use pilot profitability to adjust search domains, selection thresholds or favored families.

Require deterministic checkpoint/resume after interruption, stage seals, separate independent and informed budgets, reproducible commands, and safe continuation without recomputing or overwriting prior sealed results. Runtime of several days is acceptable; **do not reduce the scope solely to finish sooner**. If a necessary budget is infeasible, report the precise constraint and stop rather than silently underfunding a comparator.

---

## 4 — Compare candidate-selection procedures on **identical populations**

For each cutoff and each relevant lane/population, apply two **frozen, equally reported** selection policies to the **same qualified candidates and same cutoff-available evidence**:

**Original NL0 selector:** Exactly the qualified highest-center-net `actual-profit` selection with its verified NL0 tie-breaking, qualification and robustness requirements.

**Experimental RA1:** Reuse Assignment 2's precise algorithm, unchanged, rather than reinterpreting it. Its four screens are:

1. Open lot market-value multiple ≤ **1.50×** original principal.
2. Open-lot marked-profit concentration ≤ **25%** of positive training net.
3. Worst per-funded-lot MAE ≥ **−$17,500**.
4. Selection-neighborhood worst-10% mean drawdown ≤ **$35,000**.

Rank lexicographically by **fewest failed screens**, then the **lowest training capital occupancy** within the **5% conservative-training-net band** of that group's best, followed by the documented tie-breakers. Conservative net treats unrealized positive open-lot profit as unbooked for this purpose. Confirm the exact edge-case semantics from Assignment 2's code and frozen protocol. **Do not tune or soften any of these thresholds** based on the known 2020 failure.

- NL0 remains the **canonical historical reference method**. RA1 remains a **co-equal experimental comparison arm** for this assignment, **not automatically the new permanent primary**.
- Standard 2.2.0's exposure diagnostics are report-only by default. Register a **study-scoped, precommitted departure** permitting RA1 to use them for selection, as Assignment 2 did. Do not change the standard globally during this search.
- Both selectors must see exactly the same candidate population, qualification gates and cutoff evidence. **Neither selector may order extra simulations or conduct a separate tailored search.**
- Keep the original Q1–Q6 gates (or their currently verified exact equivalent), the $35,000 historical drawdown ceiling and neighborhood acceptance criteria. A stop is not a guaranteed dollar-loss cap.
- Include RA2 (conservative-net only) as a **secondary ablation** if it can be supported without compromising the core independent/informed budgets; do not let it influence the main search.
- Predefine and report how original and RA1 winners differ, including trade timing, occupancy, risk-concentration inputs, lost/displaced trades, and realized versus unrealized P&L.

**At minimum**, compare the legacy-structure population against the full structural population under both selectors, plus independent and informed C24 populations where scientifically comparable. Record which combinations have genuinely independent chronological selection paths and which do not. Do not call data reuse a new out-of-sample test.

---

## 5 — Chronological development, selection and validation

### 5.1 Data partitions and chronology

Retain the verified partitions:

- **Development/search:** 2016–2024, with the NL0 **C19, C21, C23, C24** cutoff/door protocol.
- At C19, select using data through 2019, then evaluate the subsequent **2020–2021** slice.
- At C21, select using data through 2021, then evaluate **2022–2023**.
- At C23, select using data through 2023, then evaluate **2024**.
- At C24, use full development data through 2024 to select/freeze finalists.
- **Final historical check:** verified **2025–2026** dataset endpoint (previous studies ended **2026-10-30**); open only after all finalist choices, selectors, risk criteria, hashes, protocols and analyses affecting selection are frozen and sealed.

All replays must remain continuous across cutoff boundaries, with causal warm-up, open positions, corporate actions, costs, accrued interest and pool occupancy handled without lookahead. Do not restart or manufacture independent state at slice boundaries. Commit/seal **each cutoff's selected procedure before opening the following slice**.

All 2016–2026 historical years, especially 2020, 2022 and 2025–2026, have been previously examined in this research program. The walk-forwards are **retrospective procedural tests**, and 2025–2026 is **previously inspected validation history**, **not a pristine holdout**. More folds or seeds do not create truly independent market histories.

### 5.2 Binding chronological verdict and qualification

Precommit the exact procedure-level verdict using Standard 2.2.0's default: **failure of chronological qualification means “no chronological support; not deployment-qualified without the user's explicit decision.”** This is a consequence/label, not a post-hoc fitness term or a license to weaken risk gates.

At minimum, a procedure's sequence must have an actual candidate at each fold, **positive sequential net** and **maximum minute DD ≤ $35,000**. Preserve any stronger currently applicable standard and the historic NL0 successor/non-domination requirements. State whether each procedure is independently or conditionally supported; do not grant a 2020–2024 walk-forward verdict to a C24-only informed lane.

Precommit a clear definition of **“qualifying successor”** requiring all applicable training/confirmation gates, an eligible chronological verdict, New L0 comparisons, and frozen final-historical checks. Include an explicit **“no qualifying successor”** outcome and preserve compelling but nonqualifying research candidates separately.

### 5.3 Stress, neighborhood and generalization diagnostics

For every fold primary and meaningful C24 finalist report, with per-book and portfolio attribution:

- Center net, realized/unrealized split, funded lots, worst loss, worst MAE, session-level and minute-level drawdown, costs/interest and occupancy.
- Selection vs confirmation neighborhood performance: median/p10 profit, robust profit, p90/p95 DD, worst-10% mean DD, worst DD, breach share with Wilson intervals, mean excess and parameter/structure sensitivity.
- Next-slice replay of the training-selected neighborhood, fully separated from **selection inputs**.
- Largest open-lot market-value multiple, share of training net still unrealized, subsequent give-back, exposure duration and portfolio concentration.
- Severe single-lot loss and repeated D1 decline-entry behavior around the 2020 and 2022 regimes; exact funded/displaced entry chronology.
- 0/5/10/20 bps and/or currently mandated cost scenarios; 11% baseline and 14% interest stress; realistic stop slippage and next-open/gap-through-stop fills, per the adopted standard/protocol.
- For the disabled-maximum-hold family: longest holds, open positions at cutoffs/end, cumulative financing cost, hypothetical loss exposure under sustained declines and conditions that make a protective stop fire or fail to contain the loss.
- In-sample hold-window stress on available 2016–2024 VGT/GDX history, **same-period peer proxies only as labeled diagnostics if already present**, and clearly labeled synthetic adverse scenarios. No pre-2016 downloads or claim that proxies are independent validation.
- Causal ablations separating **new mechanics**, **changed D1 parameters**, **changed Growth parameters**, **changed allocator occupancy**, and **candidate selection**. Include controls disabled/reverted and Growth frozen at New L0 for attribution only—not for candidate nomination.
- Clear error bars / search-seed variability and boundary-parameter dependence. Distinguish resource-bound unfinished search from genuine convergence.

**Risk-aware selection may have improved retrospective walks in Assignment 2 but did not satisfy the ceiling** (+$100,002 sequential net / $39,855 DD). Do not call the current study validated merely because its own folds improve on that record. Record how many distinct adverse events actually support a conclusion.

---

## 6 — Final head-to-head comparison and selection provenance

Provide a consistent table comparing:

1. **Frozen New L0** (unchanged controls, original Growth phenotype).
2. Assignment 2's documented relevant research finalists and selectors (e.g., F/original and F/RA1), clearly labeled **Growth-frozen and conditional**.
3. Assignment 3 **independent** full-joint candidates chosen by the original NL0 rule.
4. Assignment 3 **independent** full-joint candidates chosen by RA1.
5. Assignment 3 **incumbent-informed** full-joint candidates chosen by the original rule and by RA1, with **no independent chronological test** labels.
6. Meaningfully distinct low-drawdown or structurally different finalists, with their provenance and qualification status.

Give training (2016–2024), retrospective chronological path (2020–2024), previously inspected final-period (2025–2026), and full-history net and minute DD, with trade counts and sample sizes. Report neighborhood p90/p95, worst-tail DD, worst perturbation, loss severity, exposure, financing drag, and capital utilization.

Answer these questions explicitly:

- Does **optimizing Growth jointly** with both D1 books and their risk controls help beyond Assignment 2's frozen-Growth results?
- Do **independent** searches find a fundamentally different robust region, or do informed searches retain an advantage from the preselected incumbent?
- Does **RA1** improve selected outcomes on identical populations without relying on leakage or changing its thresholds?
- Which D1 families, activation modes, decline gates, and Growth structures are selected, and how frequently across seeds and folds?
- Are profits attributable to one extended hold, one exceptional rebound, or unrealized exposure at the cutoff?
- How many cutoffs/chronological paths meet the $35,000 historical ceiling, and what specifically causes any breach?
- Is any finalist sufficiently robust and qualified to warrant **consideration**, not automatic adoption, as a successor to New L0?

Do not select winners by full-history net alone. Preserve the profitability–risk frontier and meaningful low-DD alternatives. A slightly lower historical net with demonstrably better risk evidence may be preferable, but only under the precommitted qualification rules. **No deployment or automatic replacement.**

---

## 7 — Deliverables, reproducibility, and handoff

Produce within a dedicated Assignment 3 research namespace:

- `PROTOCOL.md`, standard adoption manifest, initial data/code/budget checksums, freeze record, and append-only amendment log.
- Engineering/parity report confirming New L0 exact reproduction and joint Growth-genome/RC 2 causality.
- Full per-cutoff **independent** search ledgers, seeds, strata and coverage; separate **informed** search ledgers; transparent stage-level execution and resource/budget accounting.
- Frozen selection records and **NL0 vs RA1** comparisons on identical qualified candidate populations, with candidate IDs, vectors, selection evidence and failed screens.
- Walk-forward fold selections, sealed chronological next-slice results, procedure-level consequence/verdicts and qualification/independence labels.
- Final frozen finalists, full-history/previously examined validation results, trade and capital-pool event ledgers, neighborhood/stress/ablation tables, and provenance-complete phenotype configuration manifests.
- `REPORT.md`, `RESEARCH_RECOVERY.md`, exact rerun commands, code/data hashes, current resource state, limitations and a clear next-step recommendation.
- An explicit **Assignment 3 conclusion**: a qualifying successor (research nomination only), or no qualifying successor. Include practical implications for New L0, while preserving it untouched.
- A note that any **prospective paper/shadow comparison** requires a separately authorized setup and future unseen observations. Do not schedule continuous monitoring, create live orders or claim prospective evidence now.

Use the repository standard's **Markdown, tables and machine-readable output only** (no charts or graphics unless separately authorized). Preserve full sealed artifacts, do not overwrite earlier studies, and commit/push the completed isolated research according to repo conventions; do not modify or merge into `main`. Maintain checkpoints for multiday execution and report any material blocker with completed reproducible partial results instead of pretending completion.

### Success criterion

Assignment 3 succeeds if it faithfully implements and thoroughly evaluates the **full-joint three-book risk-aware successor search**, compares the **original NL0 and unchanged experimental RA1 selectors** on identical populations, preserves independent versus incumbent-informed provenance, produces defensible chronological/robustness evidence, and leaves the frozen New L0 and production systems unchanged—**even if no successor qualifies**.
