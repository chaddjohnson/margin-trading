# Claude Opus 5.5 — New D1 research: diversity-preserving ETF-pool discovery and chronological robustness

**Model:** Claude Opus 5.5, **Extra High** effort.
**Assignment:** Implement and execute **one new, bounded, preregistered research study** in the Margin Trading repository. Work within the present Claude coding session if possible, using durable on-disk checkpoints between stages. Use independent code/method reviews if separate agents are available.
**Status:** This is a **new study**, not a continuation, amendment, rerun, or rescue of the completed robust-D1 study. Do not place orders, connect a broker, or commit unless explicitly requested.

## Immediate prerequisite — make context recovery a permanent project instruction

**Do this before any extensive research implementation or expensive search.** The recovery procedure is not just for this assignment: I want Claude Code to follow it automatically in **future sessions for this repository**, without me pasting the same instructions again. Establish the project-wide instruction once, then obey it throughout this assignment. Do **not** modify my user-wide Claude settings or unrelated projects.

1. Inspect the existing root `CLAUDE.md`, `.claude/CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, and any existing project instructions or guidance before writing. Honor the current hierarchy; preserve every existing instruction. Check for an existing recovery/compaction policy so you **extend it rather than create contradictory duplicate instructions**.
2. Create **`docs/claude/context-recovery.md`** as a tracked, durable **general-purpose Claude Code working procedure**. If an equivalent existing canonical doc exists, extend it and use its real path instead; do not maintain two competing sources. The procedure must cover all substantial, multi-step repo work (research, builds, migrations, long code edits), not just this trading study. Short chat answers and trivial edits need no elaborate checkpoint.
3. Add a **short, clearly marked instruction near the beginning of the repository's root `CLAUDE.md`** that uses Claude Code's supported **file-import syntax** (outside backticks/fenced blocks), for example:

   `- For any substantial multi-stage task, follow @docs/claude/context-recovery.md. At session start and after any context compaction, reread that guide and the task's on-disk recovery checkpoint before executing work.`

   `@docs/claude/context-recovery.md` must resolve relative to `CLAUDE.md`; it is an **import**, not a decorative Markdown link. The imported guide should be present in the session's project context on startup. If no root `CLAUDE.md` exists, create a concise one that respects any existing `.claude/CLAUDE.md` / `AGENTS.md` practices. Avoid duplicating, overriding, replacing, or destructively reorganizing existing instructions, and keep the root file concise. If the agent/client uses a different instruction-discovery mechanism, verify the supported equivalent and document it; do not falsely claim an ordinary link auto-loads a file.

4. The permanent guide must define a standard **task-local `RESEARCH_RECOVERY.md` / `WORK_RECOVERY.md` checkpoint** (use the task's existing conventional filename; for this study the exact file is `research/d1-diverse-pool-discovery/RESEARCH_RECOVERY.md`). It must require checkpoints at substantial milestones, not merely when context is nearly full. The guide must distinguish **project-wide behavior** from **task-specific state**: never append volatile research results, secrets, personal paths, or huge logs to root `CLAUDE.md` or the shared guide.
5. **Verify the wiring** by checking the actual file paths, import syntax, consistency with existing project rules and Git ignore behavior. Report exactly which files changed, whether they are Git-tracked / newly untracked, and the impact on a future session in this same checkout. As a lightweight check, inspect the repo instructions using a fresh context/session if a supported, non-invasive way exists; otherwise explicitly say this remains a startup-load expectation rather than claim you tested a new session. No need to start a second full research agent to do so.
6. This prompt **authorizes creating/updating repository instruction files** but does **not** authorize running `git commit`, pushing, merging or modifying global user-level instructions. Leave the instruction files ready for me to review and commit. Explain that an uncommitted file is visible to future sessions using this same checkout, but must be committed separately if I want it available across fresh worktrees/clones/branches.

The guide must contain the following _operational contract_, worded clearly and concretely (these are requirements, not optional suggestions):

- **At the start of a substantial task:** read the repository-level instructions; locate or create a task-specific recovery checkpoint, inspect existing frozen protocols / decision logs, and identify safe restart boundaries. Record current branch, working tree, baseline hashes where relevant, artifact locations, and expected outputs. Do not rerun a completed study merely because its session is new.
- **Continuous checkpoints:** after each significant milestone (protocol freeze, data ingestion/validation, implementation gate, optimization round, sealed selection, full evaluation, final audit), write and verify the checkpoint **on disk**. Include stage status (`not started`, `running`, `complete`, `blocked`), exact commands with working directory and runtime, immutable record hashes, protocol/amendment head, random seeds, budgets, data-access cutoffs, Git state, active process IDs or task IDs, logs, outputs, and explicit **do-not-rerun** and next-step guards. Record which artifacts are on disk versus only in memory. Keep sensitive values out of it.
- **At approximately 90% of context use, IF a reliable utilization percentage is visible to Claude**, or whenever the UI warns of a near-full context, or before another large research stage in an already-long session: **proactively refresh and verify the checkpoint**. Do not invent a precise percentage, falsely claim to monitor the UI, or poll undocumented context APIs. Do not depend on reaching 90%: unexpected compaction may happen earlier.
- **Before automatic or manual compaction:** finish the current bounded operation **if safe and practical** and seal its results; otherwise log the still-running command, subprocess/session identifiers, durable logs and recovery path. Verify output files, hashes, locks and frozen stage records. Never kill a background optimizer simply to compact. If compaction is imminent, prioritize saving critical state over finishing an expensive round. Do not launch the next costly stage until the checkpoint is safe if compaction is expected.
- **Compaction control is host-dependent:** Claude may be unable to initiate `/compact` itself in a desktop or remote harness. If a manual UI command is available to the user, suggest a safe checkpoint; otherwise rely on automatic compaction. **Never claim compaction occurred, promise to prevent it, or assume 90% will always be observed.** Do not globally disable automatic compaction or block it with a hook merely to preserve context.
- **Immediately after compaction, an interruption, or a new session:** **explicitly reread** `CLAUDE.md` (and its imported recovery guide), the task-local checkpoint, the authoritative protocol plus amendments, and existing sealed stage manifests; check current background processes and stage outputs. Validate hashes/status before any write. Then resume **only** the next authorized incomplete stage, respecting freezes and train/validation/holdout access doors. If a process may still be running, inspect it before launching a duplicate. If a round is not resumable mid-stage, use its original exact config/seed only if rerun is necessary; label the rerun.
- **Failure mode:** if the current state cannot be independently reconstructed or a freeze/integrity check fails, **stop and report the blocker**. Do not silently regenerate records, reopen validation windows, change criteria, rewrite a sealed outcome, or reconstruct decisions from conversational memory.
- **Optional hooks:** If Claude Code's documented local `SessionStart`, `PreCompact` or `PostCompact` hooks are available, inspect whether the repository already has one and assess whether a _small, secure, non-blocking_ repo-scoped hook could help with checkpoint reminders or logging. Do not install new hooks or edit global settings without explaining them and getting my approval. Hooks do not grant the model a reliable 90% context signal or automatically turn an unwritten reasoning state into a checkpoint. Any hook must avoid printing secrets, storing conversation transcripts indiscriminately, interfering with background jobs, or blocking automatic compaction.

**Verification/reporting:** Show me the exact `CLAUDE.md` import line and the durable guide path in your first implementation checkpoint. Treat this standard recovery procedure as active from the moment it is created, **including after compaction**. It is a reusable repository rule, not an instruction I should have to paste in every future session.

---

## 0. What I want answered

My margin-trading strategy uses independent D1 virtual books on ETFs competing for **one causally allocated shared margin pool**. I want to discover whether a meaningfully different ETF subset, with jointly chosen D1 parameters, offers better and more repeatable trading performance than my frozen benchmarks.

The recent expanded-universe study did **not** advance a new configuration. That result stands. But the study demonstrated that the _search and shortlist mechanism itself_ became concentrated on one family, failing to explore or assess many available combinations. This assignment is to correct those structural weaknesses and examine whether **time-aware selection** adds information beyond local parameter-neighborhood smoothness.

**Do not assume VGT, GDX, or any incumbent is mandatory; do not exclude VGT.** Every eligible ETF, including VGT and VOOG, must have the same legitimate opportunity to appear in trading pools. The long-term portfolio always remains **60% VOOG / 40% VGT**; that is independent of margin-trading-book membership.

Primary research questions:

1. Can a rigorously diversity-preserving search deliver **meaningfully more coverage of the eligible ETF/subset space** than the previous study, rather than converging prematurely around B5 descendants?
2. Does protecting diverse pool families reveal credible candidates missed by the old pooled-top-300 / single-linkage shortlist?
3. Can we improve **chronological generalization of the selection procedure**, not merely flatness of profits under parameter nudges?
4. Are the resulting executable shared-pool combinations better than the frozen controls on a **risk-aware, economically meaningful, and honest evidence basis**?
5. If the answer is no, identify **why**, preserve that result and stop. No rule loosening or repeated searches until something passes.

A technically successful project can conclude **no advancement**. A broad search, by itself, does **not** establish statistical discovery or probable future returns.

## 1. Source material: read, cross-check and treat as historical evidence

Before changing code or drafting the new protocol, inspect the **actual repository files**. Especially:

- `research/d1-robust-pool-discovery/README.md`
- `research/d1-robust-pool-discovery/PROTOCOL.md`
- `research/d1-robust-pool-discovery/APPROVED_DEVIATIONS_FROM_FABLE.md`
- `research/d1-robust-pool-discovery/RECOMMENDATION.md`
- `research/d1-robust-pool-discovery/WALK_FORWARD_RESULTS.md`
- `research/d1-robust-pool-discovery/SEARCH_COVERAGE.md`
- `research/d1-robust-pool-discovery/POOL_FAMILIES_AND_REFINEMENT.md`
- `research/d1-robust-pool-discovery/NEIGHBORHOOD_ROBUSTNESS.md`
- `research/d1-robust-pool-discovery/PILOT_CALIBRATION.md`
- `research/d1-robust-pool-discovery/CACHE_AND_CAUSAL_PARITY.md`
- `research/d1-robust-pool-discovery/IMPLEMENTATION_AUDIT.md`
- `research/d1-robust-pool-discovery/DATA_AND_UNIVERSE_AUDIT.md`
- `research/d1-robust-pool-discovery/HOLDOUT_FINAL_RESULTS.md`
- `research/d1-robust-pool-discovery/RETROSPECTIVE_R1_R4.md`
- `research/d1-robust-pool-discovery/FROZEN_SELECTION.json`, `results/audit/universe.json`, and relevant sealed records / machine-readable logs
- The earlier `research/joint-16-etf-d1/` and `research/portfolio-aware-d1-optimization/` reports and frozen manifests, as useful for control provenance
- `research/d1-robust-design-review/` (Fable's nine Phase 1 methodological documents), for the design rationale; they are not a license to ignore the subsequently approved and executed protocol.
- Actual code under `src/d1-robust/`, `src/joint-16-etf-d1/`, `src/portfolio-aware-d1/`, `src/multi-etf-d1/`, `src/multi-etf-allocator/`, `src/lib/`, the N-book engine, CLI registrations, data and corporate-actions tools.

**Observed facts from the completed study (verify from source; do not silently reinterpret):**

- 48 newly ingested ETF datasets, 61 eligible symbols across one calendar, **2016-01-04 to 2026-10-13**, and all original 16 were eligible. GDXJ, OIH were late cohort and XLRE excluded under that study's data rules.
- 96,000 discovery configurations across fold-a/fold-b/final arms. Final unseeded and seeded discovery ran **24,000 each**.
- The intended per-symbol coverage floors were **not met** for **29** final unseeded and **25** seeded symbols, respectively. A fixed 15% reserve and 100-evaluations-per-served-symbol top-up could not remedy undercoverage.
- Final-round pooling admitted the seeded arm's entire leading shortlist; **no unseeded candidate reached the pooled top 300**. Diversity provisions could not operate on the candidates they never saw.
- **Single-linkage clustering chained 295 feasible configurations into one family**, giving one finalist; fold-b's robust arm similarly collapsed 298 into a single family.
- Fold-b's sole robust finalist failed the individual-book contribution gate because removing XRT improved the score by **$1,897**, yet refinement accepted changes only above **$5,000**. No robust pick was frozen for fold-b.
- In fold-a, robust J picked **EDV + GDX + KRE**, validating at **+$4,189** (40th percentile among controls). Peak Q picked **EWZ + GDX**, validating at **−$30,323** (3rd percentile). Fold-b peak Q validated at **−$39,158** (0th percentile). G-WF failed; no advancement.
- The final seeded descendant **GDX + KRE + XBI + XLE** had center training net ~$309,743, neighborhood median ~$291,440 vs B5 ~$210,556, but was **not nominated** and **never evaluated after 2023** in that study.
- B4 and B5 are established controls. On `all` at 5 bps, B4's fixed net is **$284,244.74**, portfolio ending equity **$3,608,484.05**, daily max DD **34.65%**; B5's fixed net **$486,207.77**, portfolio ending equity **$5,410,976.72**, daily max DD **29.67%**. The fixed-pool B5 full-history minute DD is **$26,509.97**. These are reproduction anchors, not projected returns.
- The old study reported **658 full-engine/replay parity comparisons with zero differences**, full frozen-controls reproduction, and a passing **521-test** suite. It ran on Node **v24.21.0**, with an M1 Pro, 10 CPU cores, 16 GB RAM, approximately 8 worker threads.
- Retrospective R1 and R4 `all` runs were done already; their post-training fixed net was ~$70,350 and ~$71,058, below B5's ~$97,719. Do **not** rerun or relabel those as independent validation.
- The neighborhood instrument made optimized centers flatter **with respect to parameter changes**, but neither its pilot nor the limited walk-forward supported claiming time robustness. The in-sample neighborhood P50 did not materially predict later years among random controls.

Use these as constraints on a **new method**, not excuses to override the previous sealed result. Document any discrepancies between these summaries and current files.

## 2. Hard boundaries and research ethics

1. **Never modify** the prior studies' frozen protocols, manifests, research results, archived candidate vectors, or existing frozen D1 phenotype JSONs. Do not repin or recompute old manifest hashes, or call their completed optimization stages again. New work goes in its own namespace, e.g. `research/d1-diverse-pool-discovery/`, `src/d1-diverse/`, and `src/app/diverseD1.ts` with a distinct npm script. Preserve all previous outputs and identities.
2. Existing repository code has frozen **source-manifest checks spanning `src/**/*.ts`**. Adding new `src` code can make an old stage's freeze check fail even though nothing in the frozen study is corrupted. Choose a **separate Git worktree or branch/isolation scheme** that keeps the immutable historical study checkable at its original code state. Document old/new source hashes and the comparison mechanism. Do not remove/relax legacy guards to make the new study work. The new study must have its **own** source/data/protocol freeze and checks.
3. All 61 currently eligible ETFs are potential trading instruments, including **VGT and VOOG**. Reaudit under the _previously frozen_ eligibility rules; do not disqualify a symbol because of weak profit, correlation, overlap, sector, prior non-selection, or the expectation that another ETF is better.
4. Do not automatically extend existing data, change prices, truncate more dates, add new ETF symbols, or download later bars. For this experiment reuse the verified existing canonical data and fixed horizon through **2026-10-13**. New trading evidence after that date should remain available for a **separately specified future forward test**. If a critical integrity issue requires data repair, stop and document it rather than modifying frozen data.
5. Training selection is limited to data through **2023-12-29**, with physically truncated subwindows for any chronological walk-forward. Preserve `data/SYMBOL/data.csv`, `data/partitions.json`, corporate-action normalization, and exact trading-date logic.
6. The 2020–2023 chronological validation dates and 2024–2026 holdout/final dates **have already been inspected by this research program**. New fold results on those same dates are useful **method-comparison diagnostics**, not statistically fresh out-of-sample confirmation. Label them accurately. Never describe a pooled bootstrap over parameter nudges as a confidence interval on future alpha or market paths.
7. The 2024–2026 segments are **not available to any optimizer or adaptive design decision**. If qualified configurations are selected and frozen under the new protocol, a _single, explicitly preregistered, blocking-only historical confirmation_ may inspect those data; no reverse engineering, follow-up re-search, or selection by post-2023 outcome. If the procedure/evidence gates fail, make no candidate evaluation beyond training.
8. **No standalone optimization track.** Standalone/virtual-trade diagnostics can be recorded but must not be used as an eligibility gate. Fitness must be on **actual causally fundable shared-pool trades**.
9. Underlying portfolio remains a **$300,000 starting portfolio, 60% VOOG / 40% VGT**, with a dynamic borrow allocation of 20% of current equity for the separate compounded portfolio simulation. An ETF can be both a core holding and an additional margin lot; account for these holdings separately. No mandatory trading books.
10. Preserve the existing causal shadow semantics (one funded position/reservation at a time, virtual books continue independently; new funded entries only on fresh qualified signals), deterministic tie resolution, exactly the existing D1 eight-parameter definitions/grid, fills, splits, calendar, interest and slippage conventions unless a deviation is explicitly justified, written, independently tested and frozen **before outcomes**.
11. Primary fitness and research-quality comparison: fixed **$100,000 non-compounded shared pool**, **11% simple annual margin interest**, **5 basis points execution friction per side**, not Vanguard commission (online ETF commission is $0). Cost sensitivities at **0/2/5/10 bps per side**. Dynamic 20%-equity portfolio evaluated separately and reported.
12. Hard **center fixed-pool minute-sampled maximum drawdown ≤ $35,000** at 5 and 10 bps at the candidate gate; **portfolio maximum daily percentage drawdown ≤ 35%**, ideally ≤ 30%. Report **portfolio minute** percentage drawdown separately. Keep neighborhood-tail sensitivity visible but don't reintroduce an uncalibrated, universally binding plateau-retention gate.
13. No broker access, trading, auto-deployment, orders, credential exposure, or commits. Security issues from the previous execution (contact email sent in SEC User-Agent; ingestion attempt-record reconstruction) must **not be repeated**. New downloading is not part of this assignment.
14. Preserve a complete, inspectable **no-advancement** outcome, including where and why every possible finalist stopped.

## 3. What is and is not being claimed

This is a **design-repair and new scientific comparison**:

- An improved **search-coverage mechanism** could identify other profitable ETF families, but additional optimization still increases multiple-testing bias.
- A smoother parameter neighborhood need not imply future persistence; test that hypothesis rather than assume it.
- Chronological folds are tests of the _procedure_, with state carried across the boundary, not a declaration that a specific full-training winner has been out-of-sample validated.
- Even a configuration beating B5 in smoothed 2016–2023 training is not automatically superior to B5 live; B5 itself was selected with historical knowledge. Its extra GDX gain after training was heavily concentrated in two trades.
- Technical parity and deterministic execution support backtest _correctness_, not economic predictability.

Explicitly state these limitations in the protocol, selection record and final report. Do not overstate IRR/CAGR expectations.

## 4. First deliverable: a NEW protocol, frozen before any outcome

Create `research/d1-diverse-pool-discovery/PROTOCOL.md` and a machine-readable `context.ts` that agrees with it exactly. Also create `DESIGN_DECISIONS_AND_PRIOR_EVIDENCE.md` explaining each new rule and **why it was chosen without looking at outcomes of this new study**. Cross-reference Fable's proposal, the amended October 25 robust-D1 protocol, and the diagnostic defects documented in the recommendation and coverage reports.

**Two-stage commitment:**

- Before calculating any **new candidate P&L, neighbor medians, or validation performance**, commit to the entire algorithmic design on disk (rules, seeded RNG streams, quotas, family method, chronological objectives, gates, budgets, fallback, controls, evidence labels, data cutoff, tie rule), record a content hash and conduct an **independent design/code review**. This commitment is an immutable research artifact, **not necessarily a Git commit**.
- Reaudit data/code, run zero-P&L unit-cost benchmarks and engine parity checks; then freeze the executable protocol + exact eligible universe + code manifest + compute tier. The only post-commit changes permitted should be independently reviewed technical fixes made **before the affected stage emits any outcome**, logged with a hash chain. If an outcome was already exposed, fail closed or create a wholly new study, never silently amend economic or selection rules.

Before running search, output a concise `DESIGN_DIFF.md` and run tests showing that the four old structural failures are **impossible by construction** in the new pipeline. Do not simply copy the previous protocol, change four constants and rerun.

Use one Claude assignment for design and implementation. The **frozen new protocol on disk is authoritative** if context compacts. Before beginning expensive work, follow the project's persistent `CLAUDE.md` → `docs/claude/context-recovery.md` instructions and initialize this study's `RESEARCH_RECOVERY.md`. Update and verify it at **every sealed stage**, at near-full context warnings (approximately 90% **when measurable**), and before any expected compaction; after compaction **reread the guide, protocol and checkpoint**. Never restart a sealed stage or duplicate a running process. Complete and seal a running expensive stage before compaction _when practical_, but preserve its recovery details if compaction happens mid-run.

## 5. Correct the exploratory coverage problem structurally

The last search had 61 eligible ETFs, but 25–29 final-arm symbols failed its stated coverage floor even after top-up. This time, _design the budget from the floors_, not the reverse.

### 5.1 Explicit, testable coverage contracts

Predeclare per-arm and per-fold minimum coverage in terms of:

- Number of **unique evaluated configurations containing each symbol**.
- Number of **distinct eight-parameter vectors** evaluated for each symbol.
- Diversity of its **co-members** and subset sizes (a symbol appearing 1,000 times only alongside GDX does not constitute broad exploration).
- Counts of _center-feasible_, _neighborhood-scored_, _promoted_ and _finally assessed_ candidates per symbol, distinguished clearly; a symbol with few feasible configurations is not necessarily an exploration failure.
- Coverage across all major **size bands** (e.g. 1; 2–3; 4–6; 7–11; 12–16; >16 books), including genuinely empty-of-incumbents starts. Do not prohibit membership sets larger than 16, but allocate their effort in accordance with the one-funded-lot capacity and prior risk evidence. No fixed incumbent base.
- Category/partner co-occurrence counts (rates/credit, real assets, non-US, sector, factor/size), used to ensure mechanism exploration, **never** to require a category in a winner.

For a concrete starting scale, consider **at least 600 unique sampled configurations and 225 vectors per eligible symbol in each full-history arm**, plus explicit partner and cardinality diversity. This is a _candidate design target, not permission to assume a 15% reserve achieves it_. Compute the minimum feasible budget and work from it. The protocol must choose exact final and fold quotas and budgets **before running outcomes**. Fold quotas may be proportionally smaller but must still be attainable and reported.

### 5.2 Quota fulfillment must be built in, not an afterthought

Use a **stratified/quota-led coverage scheduler**, possibly reserving a substantial deterministic portion of the search budget _up front_, before evolutionary selection. Ensure that it:

- Constructs a guaranteed schedule of unique configurations with symbol/vector/partner/cardinality coverage before the runs begin, or explicitly proves its budget can meet those quotas by construction.
- Covers each symbol with varied co-members and vectors using seeded designs rather than repeatedly sampling the same genome.
- Protects core-free subsets (those excluding all B5 members), configurations including VGT, configurations excluding VGT, and configurations with/without GDX as **coverage examples**, not admission privileges.
- Meets quotas regardless of which lineages are profitable, subject to independent data-integrity failures. Do not let a scarce reserve go to exhausted alphabetically earlier symbols while others remain unexamined.
- Prevents deterministic duplicate/cache hits from being falsely counted as unique effort.
- If resource constraints make the intended quota infeasible, adjust the **budget/tier before** P&L is seen, or stop and report an **incomplete breadth study**; do **not** quietly lower quotas after observing results.

Test this scheduler on synthetic universes of 16, 61 and 75 ETFs with skewed profitability, forced early convergence and exhausted budget. Assert **all required per-symbol quotas and cardinality/co-member coverage are satisfied** before any winner can be nominated.

### 5.3 Avoid flooding the profitable frontier with low-information samples

A coverage quota is **not** a quota of profitable symbols or of finalists. Distinguish exploratory samples from quality ranking. Search may favor a few good symbols, but it may not make the rest invisible. Include a diversity-preserving archive with a quality floor **defined without hindsight of final performance**; record how many opportunities were sampled in each part of the landscape.

## 6. Fix the separate-arm and family-collapse defects

### 6.1 Never pool top-N before arm-specific preservation

Run at least the following independent starting regimes where compute allows:

- **Unseeded, truly broad search:** no B1/B4/B5/R1/R4/finalist vectors imported into the fold-search libraries; no mandatory membership.
- **Benchmark-seeded search:** legitimate B1/B4/B5 anchors with no binding priority, every member modifiable/removable, all 61 symbols addable.
- Optional **stratified exploration arm** for underrepresented mechanisms or non-incumbent subsets, with the same underlying fitness, separately identifiable and without results-based special pleading.

Maintain **separate discovery archives and promotion quotas for each arm**. Form family shortlists within arms first. Only then merge a **protected set of arm/family representatives** for final comparison, preserving a predeclared minimum number of _credible_ representatives from each arm if any satisfy center hard constraints. A low-scoring arm can still be examined as exploratory research; it does **not** automatically qualify for promotion to a live candidate.

The earlier unseeded winner (FXI SLV XLI XLK, score ~$199k) must not be retrospectively installed as a candidate or used to tune a new rule; it is evidence of how the prior top-300 merge suppressed that arm.

### 6.2 Replace single linkage with genuine diversity control

Do **not** cluster by unconstrained single linkage. Select one of these (decide and document **before** evaluating candidates):

- **Complete-linkage**, with a meaningful maximum within-family separation; or
- **Medoid/leader-based constrained clustering**, where every member must be sufficiently close to its representative under a fixed membership-plus-behavior metric.

The metric should consider **membership (Jaccard)**, **funded-trade overlap/timing**, and optionally regime-attribution similarities. Document how sparse vectors, ties, undefined correlations and zero funded lots are handled. Do not use future bars to create a cluster feature inside a fold.

Require _structurally different_ families to remain distinct. Prevent near-duplicate genomes from monopolizing slots. Define a predeclared **maximum family capacity / representative diversity** and ensure that single-linkage transitive chains cannot merge all candidates. The code must pass adversarial examples: A similar to B, B similar to C, A not similar to C => A and C **cannot** silently become one homogeneous family.

Have at least **several independently refined finalists** whenever there are several legitimately different center-feasible families. If only one exists, report that as an empirical result with arm-specific archives rather than a consequence of a broken clustering algorithm.

### 6.3 Promotion should not become another hidden exclusion gate

- Protect per-arm slots **before** global ranking.
- Allow multiple configurations of one ETF membership if they have materially different execution behavior or parameter basins.
- Consider pool size and no-incumbent families as diversity axes, without automatically declaring them good.
- Record every pre/post-clustering loss of a candidate and the exact reason for dismissal.
- Test synthetic archives where the seeded arm owns the top 300 ranks and the unseeded arm contains several distinctly feasible but lower-scoring families. The unseeded families must **still be assessed to the predeclared research depth**.

## 7. Align refinement with the final member-contribution gate

The previous optimizer retained XRT when removing it improved a score by only $1,897, because refinement required an improvement exceeding $5,000. The final rule required **every** member to have strictly positive smoothed marginal contribution, so the only fold-b robust finalist failed and there was no selection.

Fix the _mechanical mismatch_, not the outcome:

1. Retain a material improvement threshold for expensive exploratory **parameter updates** if useful.
2. Add a distinct, obligatory **member-pruning pass** _before independent final assessment_: evaluate the contribution of removing every included ETF **under the same objective, perturbation distribution and causal allocator**; if a book has **nonpositive** marginal contribution (with a predeclared treatment of estimation uncertainty), remove it even when the difference is smaller than $5,000; re-evaluate, and repeat until the defined member condition holds or a max iteration cap is met.
3. The final gate and the pruning pass **must use coherent definitions**. Sampling draws for refinement/pruning and independent confirmation must be separated, with explicit handling of near-zero/noisy contributions (e.g., conservative labeling, more draws, or an uncertainty band established _before_ results). Do **not** peek at the confirmation batch, prune based on it, and then retest on the same batch while calling it independent.
4. After pruning, allow local parameter re-refinement for remaining members _within the preregistered budget_, without importing held-out data. Test one-book, near-zero-contribution, and cascading-prune cases.
5. Report leave-one-out deltas, changes in funded/blocked trades, and the trade-off between retaining an occasional complementary book versus simplifying the pool.

A gate that fails is still allowed to fail; don't alter thresholds after observing a near miss. This redesign must simply prevent needless mechanical contradictions _before_ confirmation.

## 8. Test chronological robustness directly, not just neighborhood flatness

The previous study showed a real limitation: **parameter smoothness did not imply time persistence**. We should test a new time-aware selection objective rather than merely optimizing a smoother version of historical peak profit.

### 8.1 Prespecified objectives, with a fair comparison

Create **two primary research arms with matched or clearly disclosed compute budgets and identical data/causal execution rules**:

- **J / neighborhood reference:** the previous study's risk-aware, $100,000 fixed-pool neighborhood score (P50, per-book penalty and softly penalized neighborhood drawdown), implemented under the **repaired diversity/search pipeline**.
- **T / temporal-aware candidate:** a **predeclared** score that retains neighborhood robustness but also penalizes temporal fragility (e.g. dependence on one market episode, weak lower-period net, or excessive trade clustering). Use an implementable, bounded formulation that operates **only on information within the search window** and avoids data-mining weights from known validation years.

A simpler raw-peak Q control may be run at an explicitly bounded budget to anchor the previous results, but **do not divert the majority of compute back into the standalone or peak-only optimization**. If making a scientific claim that T beats J, both must have a comparable search/selection process and budget; if not, grade it as exploratory.

Develop T from an _a priori_ hypothesis, not observed fold outcomes. Define exactly which time partitions, scale adjustments, absolute/relative risk thresholds, and objective penalties are used. Give each stage and confirmation its own RNG label. Avoid giving T preferential candidate selection rules that J lacks; the major change between arms should be the **score**, not the selection machinery.

Potential measures (select only a small, justified set):

- Per-year and per-predefined-regime strategy P&L measured using **continuous state attribution**, normalized for unequal window lengths and trade counts.
- Net profit or profit/drawdown on sequential subperiods inside the search window; reward a positive typical subperiod and penalize especially negative ones without turning a single weak quarter into an uncalibrated universal veto.
- Fraction of total profit contributed by the top one/two funded trades or one regime; use a _soft_ concentration adjustment, not an arbitrary hard cap.
- Agreement across modest changes in time-window start/end, without illegally loading bars after the fold cutoff. Distinguish a window diagnostic from actual forward validation.

Be alert that the early fold search has few D1-eligible years and few funded trades. An elaborate temporal objective can be dominated by noise. Prefer a parsimonious, interpretable T definition. If data cannot support meaningful temporal segmentation in early folds, explicitly describe the limitation and choose a predeclared fallback—not a post-outcome adjustment.

### 8.2 Walk-forward: preserve chronological causality and honest evidence labels

Keep the established two chronological procedures unless a stronger design is justified **before any new outcome**:

- Fold a: optimize through **2020-06-30**, freeze picks, then evaluate **2020-07-01 to 2021-12-31** continuously.
- Fold b: optimize through **2021-12-31**, freeze picks, then evaluate **2022-01-01 to 2023-12-29** continuously.
- Full development round: optimize through **2023-12-29**.

Physical truncation at each search date; no later bars in optimizer traces; per-window cache keys; write-once `PICKS.json` before opening validation; carry open positions/stops/interest and portfolio state across each boundary. Preserve flat-start validation as a secondary diagnostic only. Test mutation of post-cutoff bars leaves picks and archives byte-identical.

**Both folds have been inspected already across past studies.** Report their outcomes as **reused historical walk-forward diagnostics**, not fresh/independent testing at the programme level. Distinguish a fold with **no eligible pick** from a fold where a picked strategy lost money. Show the number of valid finalists, pick rules, raw/temporal scores, costs, trade counts, borrowing utilization and validation drawdowns.

Predefine the procedure-level _promotion rule_ from the fold results before running either fold. It should distinguish (a) search machinery failed to produce enough varied candidates, (b) a candidate failed economic gates, and (c) a selected candidate failed forward performance. Do not repeat the previous error of concluding time failure when only a small member-marginal gate prevented any pick; report it separately. It is acceptable to require actual favorable validation evidence before nominating a new strategy, but do not inflate the number of trials or add folds until a favorable pick appears.

If no T or J pick meets the preregistered procedure gate, finish **only the allowed exploratory training study**, declare **no advancement**, and do **not** evaluate any novel configuration on the inspected 2024–2026 periods.

### 8.3 Regime change is a substantive uncertainty, not a parameter to tune away

The 2016–2023 chronology contains COVID, recovery, and inflation/rate shocks; 2024–2026 had different conditions and was heavily inspected. Explain whether either selection method displays _stable signs and reasonable downside_ across the two internal forward windows, not only across parameter nudges. No method is assumed to produce the B5 historical 26–31% CAGR in the future.

## 9. Joint subset-and-parameter optimization, not isolated per-symbol fitting

Every evaluated candidate is a **membership subset plus eight D1 grid parameters per member**. Optimize these variables **jointly in the shared allocator**, including adding, removing, swapping members and refining incumbent parameters. A previously frozen ETF vector can be used as a labeled seed in its dedicated seeded arm, but must be modifiable and removable; never require VGT/XBI/XRT/KRE/GDX as a base.

Maintain a diversity-preserving archive through the full process. Be cautious with high-dimensional genetic operations over 61 symbols: the vast combinatorial space cannot be exhausted, and failure to find a combination is not proof it does not exist. Seed strata so small and medium groups get meaningful trials; still sample large groups and report their outcomes rather than excluding by presumption.

Once broad families are identified, jointly refine their parameters and membership. Candidate evaluation always recomputes **actual fundable trades** by full chronological allocator replay; cached virtual traces are allowed only with strong field-for-field parity to the full minute engine. Never allocate funds based on knowing a future trade's profit. Use trace keys covering canonical data hashes, window, corporate actions, parameter vector, cost, settings and code revision.

**Do not run a parallel standalone-ETF optimizer.** Standalone results may help explain why a symbol is useful or harmful, but cannot eliminate a symbol from the search.

## 10. Budget and computational effort: allow substantial work, but make it finite

I authorize a **substantial multihour, multicore study** if useful. Don't cut candidate diversity to save a few minutes, and don't simply pour time into extra generations of an algorithm that has already converged. First make the search scheduler, family selection and coverage work correctly.

Suggested structure (final constants to be decided, recorded and frozen before results):

1. **Calibration/design tests:** synthetic universes and unit-cost benchmarks _without candidate outcome visibility_.
2. **Quota-led exploration:** a nontrivial, precomputed portion of each arm's budget guaranteeing broad ETF/parameter/co-member and membership-size coverage.
3. **Independent search:** J and T objectives with independent unseeded and benchmark-seeded starts, protected archives and promotion allocations, with fixed deterministic per-arm budgets.
4. **Promotion and refinement:** enough independent families to test genuinely distinct pool compositions, with higher-quality neighborhood estimates than initial discovery. Include the membership-prune pass before independent assessment.
5. **Independent assessments:** enough draw precision to distinguish economic effects, with common random numbers across configurations and separate independent confirmation batches. Use paired differences, correct cost sensitivity, minimum activity and drawdown constraints; do not treat parameter-draw bootstrap intervals as market generalization intervals.
6. **Chronological procedure checks**, then final full-training selection only if allowed by the precommitted protocol.

Aim to be materially more comprehensive than the last **24,000-per-final-arm** study where diversification failed, with a **predeclared total upper bound** (for example 2–4× its discovery effort if unit-cost and RAM tests support it), and a safe fallback chosen entirely from timing/memory tests **before any candidate P&L**. The user has permitted substantial CPU time; do not impose an arbitrary shallow top-2/top-3 ETF promotion filter. On the documented M1 Pro (10 cores, 16 GB) prefer bounded worker pools (often 6–8 workers), a reproducible reduction order and an enforceable memory ceiling (e.g. ~13 GB). Provide a budget table with per-arm totals, quota costs, islands, families, neighbor replays, validation runs, and expected resource use. Keep the study finite and stop when the frozen budgets end.

Do **not** give yourself permission to change a budget based on early winner quality, whether GDX appears, validation results, or the number of profitable candidates. An infeasible resource estimate triggers the predeclared fallback or an honest stop.

## 11. Economic accounting and acceptance rules

Keep separate and clearly labeled:

**A. Fixed-margin pool (primary optimization instrument):** $100,000 per funded lot; one lot at a time; 11% annual margin interest; costs at 0/2/5/10 bps **per side** as modeled execution friction (not a broker commission); daily and minute maximum drawdown (dollars and percent); realized/unrealized net; ledger by trade, ETF, period, net and gross, interest, costs, missed/refused entries, concentration and time in market; constant sizing, no profit compounding.

**B. Compounded core-plus-margin portfolio (secondary risk/wealth evaluation):** start $300k at 60% VOOG / 40% VGT; dynamically trade with margin capital up to 20% of marked equity, one funded position at a time; correct borrowing, interest, distributions, expenses, price/unit adjustment, baseline core, splits; report full portfolio ending equity, annualized return/CAGR (where appropriate), **maximum daily % DD** and separately maximum **minute % DD**, matched borrowed-dollar-days and return comparisons with the core-only baseline.

**Risk:** center fixed $35k maximum minute DD at 5 and 10 bps; compounded portfolio daily ≤35% (≤30% preferred, (30%,35%] requires materially better economics). Preserve 5-bps baseline; 0/2/10 sensitivity. Show drawdown neighborhoods as descriptive and/or predeclared soft penalties, without substituting expected value for worst center risk. If a member is thinly traded, report capacity constraints, executions delayed because of sparse minutes, and participation in 5-minute dollar volume. Avoid adding a thin but superficially profitable member without disclosure.

**Dividends:** prior study's primary _symmetric_ lot convention omits ETF-lot cash dividends for all trading books, while the core receives verified VOOG/VGT distributions. The _frozen_ convention credits VGT lots and reproduces prior B4/B5 numbers. Neither is a complete symmetric total-return model. Use the same comparisons and explain the limitation; if promising finalists contain bond/income-heavy ETFs, attempt the predeclared verified dividend-history sensitivity or bound the omission, and flag any potential ranking reversal. Never fabricate missing distributions. Check no execution cost is double charged.

**Benchmark comparison:** always report B1 VGT alone, B4 All-lowDd (VGT/XBI/XRT/KRE), B5 All-lowDd + GDX (`portfolioAware`), and C0 60/40 core-only. These are frozen benchmarks—not mandatory books. R1/R4 and the October 25 training-only finalist are inspected, non-advancing historical references, **not new validation candidates**. Never silently overwrite the old benchmark or promote a prior non-nominee by relabeling it.

**Membership contribution:** score net and risk effects of deleting each book, attribution of lost/funded opportunities and whether its presence meaningfully improves portfolio performance. Distinguish a book that contributes little net from one that protects against drawdown. Pruning and nomination rules must be internally coherent and independent of the confirmation sample.

## 12. Independent assessment and evidence thresholds

Before any search, define **specific, mechanistically justified** final gates; do not import the failed 75% retention ratio. Retain the key safeguards that still make sense: center risk, cost sensitivity, continuous time accounting, economic materiality, credible funded-trade activity, member contribution, coverage/capacity, immutable selection and explicit confirm gates.

Avoid three specific problems from earlier research:

1. **Requiring uncalibrated neighborhood percentile feasibility** when random-controls and B5 do not meet it.
2. **Confusing absolute neighborhood MAD with the standard error of a _paired difference_**. Use paired common-draw bootstrap uncertainty, while explicitly limiting its interpretation to parameter-perturbation noise on the historical path.
3. **Tie-breaking across a large objective interval purely by alphabetic key.** The old fold-a rule selected EDV/GDX/KRE rather than EDV/GDX/XRT despite an S gap of ~$6,493 because it treated anything within $12,500 as a tie. The other member performed better later but with huge drawdown; do not use that future result to select a new tie rule. Predeclare a rational scalar ranking and narrow exact tie handling, with sensitivity/uncertainty reporting rather than allowing arbitrary key order to override substantial score differences.

There must be a transparent report for candidates rejected on: data, center risk, capacity, activity, trade concentration, member pruning, smoothed economic score, temporal procedure result, final risk, or historical-blocking-only check. A flat neighborhood alone is **never** sufficient to advance a configuration.

If a candidate passes the development and procedure-level gates, write a **sealed selection manifest** before opening any 2024–2026 data for it. Then apply a preregistered **blocking-only** check once (plus byte-identical confirm allowed) on the inspected periods, with the same continuous state conventions and 0/2/5/10 bps costs, and **no re-ranking or rescue**. Do not claim true forward E4 evidence from those dates. Reserve the actual post-2026-10-13 period for future research after this study.

## 13. Correctness, reproducibility and adversarial tests

The earlier study already had strong engineering controls. Preserve them and expand tests for the new research components.

- **Reproduce frozen B1/B4/B5/C0 control records** to the cent on the same canonical data and costs, both fixed and portfolio, under the appropriate dividend convention. Revalidate no change in the engine's core trading semantics.
- **Full engine/replay parity** at several pool sizes (1, 2, 4, 8, 12, 16, 24+), split symbols, thin-minute ETFs, open trades, both fold cuts, and B5. Zero unexplained differences before any cached optimization.
- **Causality/lookahead:** a change in a later exit cannot change earlier funded decisions; window barriers prevent optimization from loading post-cutoff bars. Mutate post-cutoff fixture bars and verify picks/search archives remain byte-identical.
- **Coverage:** synthetic tests make a dominant seeded family monopolize global ranks. Verify the unseeded arm still gets its precommitted candidate assessments, and every symbol meets its quota irrespective of rank.
- **Clustering:** A≈B and B≈C but A far from C must not produce a single falsely homogeneous family; clustered representatives must be genuinely distinct in membership and/or funded behavior.
- **Member pruning:** the −$1,897-type case is recognized as a mechanically removable harmful member under the new predeclared rule; but do not bake XRT's real historical vector/result into the actual optimizer or test fixture as a target. Test cascading deletions, zero/negative marginals, near-zero uncertainty, and finalist revalidation after pruning.
- **Confirmation independence:** holdout confirmation batches must not have contributed to search, ranking, pruning, or the choice of final candidate. Same for 2024–2026 results.
- **No-advancement path:** no holdout/final candidate loads when evidence rules fail; the sealed record captures exactly why. A final result must not rely on undeclared data or a manual rescue.
- **Determinism:** record Node/runtime versions, Git state, code/data hashes, seeds, worker count, deterministic evaluation order and output checksums; byte-identical re-run on a representative subset. Tests, typecheck, lint and immutable-file audits all pass before the final report.
- **Security:** no secret values in output, no broker calls, no new downloads; do not repeat the SEC contact-email exposure. No modifications to old sealed records or canonical data.

Use an independent reviewer that did not author the code, preferably **before the protocol freeze, before opening any validation window, and before selection freeze**. Have the reviewer verify both correctness **and that the diversification machinery actually preserves alternatives**. Record all review findings and their timing. Technical fixes must be controlled and cannot retroactively modify economic hypotheses or gates.

## 13A. Long-running sessions: checkpointer and compaction acceptance tests

The **project-wide instruction setup at the beginning of this prompt is a required deliverable**, not merely advice. Demonstrate during this very study that the reusable workflow actually works:

1. Create the task-local `research/d1-diverse-pool-discovery/RESEARCH_RECOVERY.md` **before** long-running work. Its top screen should state the exact current stage, frozen-protocol path/hash, complete/incomplete stages, any process running, and next command. Put detailed reproducibility references below; do not copy entire logs or sensitive environmental values.
2. After **every** one of the execution-order stages in §15, update and verify the checkpoint, including the explicit `do-not-rerun` status and every new immutable artifact's location/checksum. During stages with multiple sealed folds or search rounds, check in at each round, not just the overall stage end. Report which commands can resume mid-stage and which need a deterministic complete-stage replay.
3. At a **reliably observable ~90% context threshold** (not a guessed number), or immediately upon a near-full-window warning, refresh the checkpoint before initiating more costly work. When the threshold cannot be measured, refresh it before lengthy tool sequences and whenever an operation finishes. If Claude cannot invoke manual compaction in the active client, **do not report failure**; tell the user how to compact at a safe boundary, or allow automatic compaction to proceed.
4. On any return after compaction or interruption, **read the durable project guide, the recovery checkpoint, the frozen protocol and amendment chain first**. Verify outcomes and live/background process state before proceeding; do not substitute conversation summary for on-disk truth. Record in the checkpoint that recovery was performed and what was verified. Do not restart or alter a stage just because its subprocess no longer has visible chat output.
5. Exercise the recovery procedure on a **safe synthetic or already-completed fixture**: snapshot the checkpoint, simulate rereading it from a fresh context without running candidate research, and verify that it specifies one unambiguous next action and distinguishes sealed results from active/uncheckpointed results. This is a documentation/operational test, not authorization to rerun research or force a context compaction.
6. In the final audit, verify that `CLAUDE.md` imports the general guide, that the guide describes **all** of the above and does not conflict with existing instructions, and that the study's checkpoint is complete. Record both paths and Git status. Do not auto-commit these files.

**Scope:** This project-wide rule applies to future Claude sessions operating inside this repository. It is not installed globally for other unrelated projects unless I specifically request a global policy. This setup is intended to reduce manual reminders, but cannot guarantee prevention of an unexpected harness-driven compaction or a lost unpersisted process.

## 14. Outputs and acceptance deliverables

New outputs only under `research/d1-diverse-pool-discovery/` (and a new dedicated source namespace), with machine-readable records and human-readable summaries. At minimum:

- `README.md`: goals, research status, commands, outcome, evidence grades, new/old study boundaries.
- `PROTOCOL.md`, `DESIGN_DIFF.md`, `DESIGN_DECISIONS_AND_PRIOR_EVIDENCE.md` and a write-once `PROTOCOL_FREEZE.json` including the method, audited universe, compute budget and source/data hashes.
- `BASELINE_AND_PARITY.md`: verified benchmark values, full engine vs cache parity, time-window barriers and source isolation.
- `COVERAGE_AND_DIVERSITY.md`: actual vs required per-symbol and per-arm quotas; numbers of distinct vectors, partner/category combinations, membership-size bands; percentage of budget spent on exploration vs selective search; evidence of protection for all arms.
- `FAMILY_SELECTION.md`: membership and behavior distances, clusters, representatives, arm provenance, refinement history and accepted member changes; show no single-linkage chain collapse.
- `CHRONOLOGICAL_METHOD_COMPARISON.md`: J vs T (and any predeclared Q control), fit/validation dates, all picks **including no-pick folds**, validation profits, trade counts, minute DD, percentiles against controls, annual/regime attribution, exact go/no-go procedure rules.
- `NEIGHBORHOOD_AND_RISK.md`: E0 center, E1 independently measured P50/Q25, drawdown neighborhoods and feasible shares, second perturbation amplitude, selection/confirmation independence, paired differences and intervals.
- `FINAL_CANDIDATES_AND_GATES.md`: multiple diverse finalists where legitimately available; exact reasons for every rejection; fixed-pool results and 20%-portfolio risk results.
- `FROZEN_SELECTION.json` (write-once, even if none nominated), `HISTORICAL_CONFIRMATION.md` (only if authorized and qualified; otherwise explicitly no candidate data read after training).
- `IMPLEMENTATION_AUDIT.md`: code and data hashes, branch/worktree isolation, unit/performance budgets and actuals, all tests, independent reviews, replay parity, code changes, known limitations.
- `RECOMMENDATION.md`: explicit adopt-for-forward-testing versus retain B5/B4; **never** claim a new strategy is proven, or that historical CAGR is the expected IRR.
- `RESEARCH_RECOVERY.md`: durable instructions to continue after context compaction without rerunning completed stages or losing intermediate results.
- **Permanent project instructions:** verify root `CLAUDE.md` imports `docs/claude/context-recovery.md` (or the verified canonical equivalent), provide the short import excerpt, and explicitly distinguish the reusable guide from the task-local `RESEARCH_RECOVERY.md`. List their Git state and leave them ready for a user-authorized commit.
- Machine-readable per-trial/member/period metrics and trade ledgers for finalists, with exact seeds, paths, and hashes. Preserve expensive archives to disk, but use Git ignore conventions for regenerable large logs and ensure immutable record manifests cover them.

**The report MUST include a compact table comparing the old and new search designs**: coverage floor achieved? number of distinct assessed families? proportion from each arm? number of genuinely different shortlisted memberships? fold pick/validation results? number of qualified candidates? It is unacceptable to call the study a success merely for adding more configurations while still producing a near-monopoly shortlist.

## 15. Execution order and stopping conditions

Follow this sequence without asking me for routine approvals:

1. **First install and verify the permanent project-level context/recovery procedure:** inspect existing Claude instructions, write `docs/claude/context-recovery.md` (or the verified canonical equivalent), add the supported import to root `CLAUDE.md` without overwriting other instructions, and create the task-local `RESEARCH_RECOVERY.md`. Then read the source reports and audit the repository/current branch; capture baseline hashes and old study status.
2. Write the complete new protocol + method/coverage specifications; resolve any ambiguity **before running candidate results**; obtain independent design review if available.
3. Implement and test the coverage scheduler, family clustering, separate arm selection, contribution-pruning logic, and temporal-aware objective on **synthetic fixtures**; verify the old failure cases are impossible under the new control flow.
4. Conduct runtime/memory benchmarks without outcomes; select and freeze the budget/tier, exact eligible 61-symbol universe, protocol, code manifest and random seeds.
5. Verify controls, causal parity, accounting, temporal data doors and research isolation. **Fail closed** on unexplained differences.
6. Complete the **chronological procedure experiments** with sealed picks before opening their respective validation bars. Never modify methods/gates because a fold result is unfavorable.
7. Run the full 2016–2023 candidate search and protected multigroup promotion/refinement under the locked budget. Report robust-vs-temporal objectives, multiple distinct families, and all gates.
8. Freeze a selection record (including **no advancement**), then use independent reporting/confirmation draws and any **preauthorized** blocking-only evaluation on the previously inspected 2024–2026 data. If the procedure gate fails or no finalist qualifies, do not read post-2023 bars for candidates.
9. Independent implementation audit, including persistent-instruction import/recovery verification, and report. No post-hoc rule adjustments. Stop.

**Important design detail:** If the old fold-b no-pick defect is resolved and the new pipeline now produces an eligible pick, that is only a _new methodology tested on already inspected years_, not proof of predictive alpha. Do not imply we've gained independent samples simply by rerunning the folds with repaired code.

At completion, give me:

- Your result and whether anything may be considered an **optional forward-test candidate**, or whether B5 remains the leading candidate and B4 the default.
- A concise table of J-versus-T walk-forward results and the same $100k vs portfolio comparisons we have used.
- The ETF families explored and the actual coverage attained.
- Exact benchmark-reproduction and causal-parity checks, cost/dividend limitations, and what the remaining financial uncertainty is.
- Links/paths to `README.md`, `RECOMMENDATION.md`, `CHRONOLOGICAL_METHOD_COMPARISON.md`, `COVERAGE_AND_DIVERSITY.md`, `FROZEN_SELECTION.json`, and `IMPLEMENTATION_AUDIT.md`.
- The Git state and confirmation that prior frozen records were not changed and no broker/order action was taken. Report the created/updated root `CLAUDE.md` import and the permanent `docs/claude/context-recovery.md` guide, and confirm the task-local checkpoint can support subsequent sessions.

**The central goal is not to make another winner appear. It is to make the search scientifically more informative and less structurally biased, while preserving the ability to reject an entire study when performance does not generalize.**
