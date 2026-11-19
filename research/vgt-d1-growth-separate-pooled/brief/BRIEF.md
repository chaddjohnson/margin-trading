# Priority 2 follow-up — missing pooled comparison and a durable optimization standard

## Assignment

Complete two tasks before we proceed to Priority 3:

1. Run the missing **backend comparison of the newly standalone-optimized VGT D1 and Growth configurations pooled together**, using the already frozen Priority 2 selections. This is a bounded retrospective diagnostic, not another broad optimization.
2. Formalize our optimization process in repository documentation, including the improvements below, and establish a repository instruction/preflight workflow so future optimization work—including Priority 3—reads, identifies and follows that standard. Future agreed process changes must update these documents through explicit versioned amendments.

Do both tasks, deliver the results and documentation, and stop for review. **Do not start Priority 3 or a new search.**

Everything runs purely in the backend on Apollo: code, canonical data, headless research scripts and CLI runners. Do not operate, launch, modify or use Strategy Lab, its HTTP endpoints, Interactive Preview or browser automation. Backend-generated report charts are fine.

Inspect the current repository, branch, applicable instructions and user changes before acting. Preserve prior studies, frozen records, user work and saved application data. Use a dedicated branch/worktree as appropriate. Do not deploy, merge, push or publish without separate session authorization. Do not overwrite prior protocols to make them appear compliant with the new standard.

## References to inspect

Locate and read the actual records and implementation, including:

- `research/vgt-d1-growth-joint/{REPORT,PROTOCOL,AMENDMENTS}.md`, `FROZEN_SELECTION.json`, qualification, validation and search records, and `src/vgt-d1-growth-joint/`.
- Study 8's protocol, optimizer, runner and frozen selections, especially VG #2 Balanced.
- `research/growth140-vgt-stable/`, especially the study that found `08500a60ec56cfae`, its selection, perturbations and chronological results.
- `research/vg-balanced-entry-eligibility/`, especially capital displacement and its bounded execution infrastructure.
- Existing repository optimization guidelines, `CLAUDE.md`, `AGENTS.md` and linked instructions. Integrate with their organization instead of creating conflicting parallel rules.

Prior findings are evidence, not permission to tune against validation outcomes.

## Task A — the missing frozen-pair comparison

### Identify the exact pair

Resolve the **new standalone-optimized** configurations from Priority 2's committed frozen selection and qualification records. The report labels them:

- D1 alone: `C24/d1only#1 top`.
- Growth alone: `C24/gonly/breakout/off#1 top`.

Do not substitute the older shipped D1 `primary`, the VGT component of VG #2, Growth #4, or Growth `08500a60`. Those are separate controls. Verify identities and export the full effective parameter vectors and source hashes before evaluation. These two configurations were selected separately on 2016–2024; do not replace either with a better-looking member based on known validation outcomes.

### Freeze the comparison manifest before running it

Primary diagnostic: those two unchanged parameter vectors under Priority 2's **architecture A**, one exclusive $100,000 slot, D1-first for same-time decisions, and all other Priority 2 execution/accounting conventions unchanged.

Prespecified sensitivities only:

- A with Growth-first same-time priority.
- B 100%/100%, both priority choices.
- B 50%/50%, both priority choices.

There are six architecture/priority cases including the primary. Canonicalize behaviorally equivalent cases. Do not expand the grid or select a new winner after viewing the results. B sensitivities do not change either phenotype or justify a second independent $100,000 budget.

Use the existing verified pool engine, actual funding decisions, each family's canonical virtual-book lifecycle, costs, interest and continuous marks. Do not add the standalone profits or assume all virtual trades can be funded. Do not introduce delayed D1 eligibility, new allocation rules or funding-aware signal lifecycles.

### Dates and controls

- Backtest/development: **2016-01-04 through 2024-12-31**.
- Validation reporting: **2025-01-01 through 2026-10-30**, using actual trading sessions and verified complete data.
- Continuous full run across the boundary; no liquidation or state reset. Validation profit is the change in marked equity from the 2024 close. Show reset validation DD and whole-run DD separately.
- Use the same harmonized start/warm-up, $100,000 principal budget, 5 bps per side and 11% simple interest conventions as Priority 2. Verify them from source.

This is **a retrospective comparison on previously examined history**, not fresh independent validation or a new test of an untouched holdout. Report development, validation and full history, without tuning in response.

Compare with the frozen joint primary, each of the two newly optimized families alone, the older fixed D1 + #4 and D1 + `08500a60` combinations, and their relevant standalone controls. Reuse verified exact matching archived results where possible. Do not rerun expensive searches.

### Evidence

Report net profit, realized/unrealized split, maximum minute DD in dollars and percent of the fixed $100,000, trades and wins/losses, exposure, interest/costs, family contributions, open positions, simultaneous holdings and funding refusals. Use proper currency formatting.

For the primary diagnostic pair, run the same development neighborhood instrument used in Priority 2, including 384 independently seeded confirmation perturbations of both families, and compare on matched definitions. Freeze the perturbation manifest first; use it only for reporting, not selecting replacements. No additional validation perturbation sweep is needed for this bounded follow-up.

Explain trade displacement and newly funded trades versus the joint primary and fixed combinations. Include causal family-removal comparisons, separating these from booked family profits. Identify whether architecture or priority sensitivities actually alter trades. Distinguish price-path differences from simple position-size scaling.

Answer explicitly:

1. Did the newly separately optimized pair outperform the frozen joint primary after being pooled?
2. Did it improve on either fixed incumbent combination?
3. How do neighborhood results compare?
4. What does this single matched comparison suggest about independent-then-pooled versus joint optimization, and what can it not establish given different compute budgets and selection provenance?

Verify all totals and preserve the original frozen selection. Do not relabel a retrospective diagnostic as the study's new primary.

## Task B — formalize the optimization standard

Create or consolidate a clear authoritative standard, for example `docs/research/OPTIMIZATION_STANDARD.md`, with a versioned change log and a concise study-protocol template. Adapt names to existing repository conventions. Record what is mandatory, what must be specified per study, what is report-only, and what requires a documented amendment. Include exact definitions or references, not slogans such as “optimize robustly.”

The current standard must include:

### 1. Date separation and provenance

All optimization, refinement, architecture selection, ETF selection, thresholds and ranking choices use **2016–2024** only. **2025–2026** is for validation of frozen selections. Record each study's actual common complete endpoint; do not imply unavailable dates were tested.

Freeze primary, shortlist, reporting roles, validation tests and any validation perturbations before opening new validation results. Never choose a new winner by validation profit. A failure does not authorize another search on the same validation outcomes. Label previously examined history honestly and record prior knowledge. Preserve continuous state/marks across boundaries.

Repeat the full search/selection at earlier cutoffs entirely inside development. Distinguish independent cutoff searches from informed searches seeded with later-selected settings. Report procedure failures even when a final candidate has a good neighborhood. Do not silently change an active frozen study when the global standard changes.

### 2. Objectives and candidate retention

The current user's risk budget is maximum minute DD **≤ $35,000 on one fixed $100,000 principal budget**, not 35% of peak account equity. Preserve actual net profit as a central objective while assessing neighborhood risk and stability. Historical compliance is not a guarantee of future drawdown.

Maintain separate development-selected roles for:

- actual center profit within the risk constraints;
- neighborhood-robust profit;
- balanced profit/risk;
- lower drawdown where useful.

Keep a Pareto set involving actual profit, actual DD, neighborhood lower-tail profit and upper-tail DD. Do not let one robustness statistic erase profitable alternatives during early promotion. Freeze an explicit primary-selection rule before results; a study must state whether its primary prioritizes actual profit, robust profit or a defined compromise. Do not present the label “optimal” without that qualification.

Avoid arbitrary activity, annual-profit, largest-winner or equal-component-profit vetoes. Report evidence strength, episode concentration and causal removal stresses. If a combined strategy is the objective, verify real participation without imposing equal shares or high minimum trade counts. Identify token participation and negative causal contributions explicitly.

### 3. Incumbents and method comparisons

Always retain exact incumbent configurations as controls. In an **informed** study, include qualifying incumbents in the selectable set or define an explicit no-improvement fallback; an optimizer must be allowed to retain a known stronger configuration. Do not quietly replace it with a weaker new phenotype merely because the latter emerged from search. Explain compromises where a new candidate improves robustness but lowers actual profit.

Keep informed searches separate from independent discovery. Protect independent chronological evidence from later-selected seeds.

Where relevant, compare:

- existing fixed configurations pooled;
- separately optimized components pooled;
- fully jointly optimized components;
- staged initialization followed by joint refinement.

Use identical capital, execution and cost assumptions. Freeze matched evaluation rules and disclose compute differences. Do not claim superiority of an optimization method from a single favorable historical pair.

### 4. Search coverage, budget and stopping

Use Study 8's broad quasi-random exploration, independent evolutionary islands, multiobjective promotion, successive robustness rungs and local refinement where appropriate to the problem's size. Enumerate genuinely small spaces instead.

Define explicit budgets in **distinct candidate proposals** as well as backend evaluations; distinguish centers, neighbors, earlier folds, retries and cache hits. Report structural coverage, inactive dimensions, duplicate ledgers and promotion reasons. Give meaningful coverage to entry families, filters, exits and permitted allocation structures. Do not filter pooled candidates solely by standalone profitability.

Use both broad independent discovery and clearly labeled incumbent-informed refinement, with exact incumbent values and adequate local resolution. Respect parameter dependencies and behavioral equivalences.

Freeze a bounded, development-only extension policy before search: progress in profit/risk frontiers, robust objective and new distinct behavior can trigger additional islands/refinement up to declared caps. Monitor progress per unit of compute. **Budget exhausted is not convergence.** Record which stopping condition occurred. Pilot timing informs the budget but must not silently shrink the study into a different level of search; disclose material changes and their coverage implications.

### 5. Verification and robustness

Require canonical parity, causal data access, accounting reconciliation, single-family identities and realistic execution stresses before large searches. Optimization evaluates the full funded portfolio, including refusals, displaced trades, partial repayment and interest—not sums of standalone trade profits.

Specify perturbation radii, distributions, boundary treatment, categorical changes, dependent settings and normalization. Use independent confirmation seeds; report clipping and how many draws change trades. Distinguish local stability from chronological reliability. A p90 neighborhood-DD constraint can allow some breaches; disclose their frequency, severity and worst drawdown rather than requiring every exploratory neighbor to pass by default.

Document native-to-harmonized convention changes, especially start dates and friction. Test capital limits, reservations, simultaneous events, independent exits, partial shares, year boundaries, period DD and open remainders. Preserve failed tests and amendments; stop dependent work on parity failure.

### 6. Memory, throughput and recoverability

Apollo has **64 GB RAM**. The user welcomes more resource use when it improves throughput safely. Approximately 6–10 GB measured usage is not itself a limitation or defect; do not allocate memory merely to fill RAM.

Retain **MemoryHigh=44G and MemoryMax=48G** for the aggregate isolated research workload, leaving Claude/tmux and host services outside it. These are ceilings, not targets. A larger worker count or useful bounded cache may use more than prior studies, but only after measurement. Do not launch multiple independent 48G jobs without a common aggregate cap.

During future optimization pilots, benchmark several safe worker counts and cache sizes on representative backend work. Measure throughput, CPU saturation, aggregate RSS/cgroup memory, external/typed-array use, I/O and headroom. Choose the fastest stable configuration; do not assume RAM is the bottleneck or that more workers always help. Leave headroom for other host workloads and stop dispatching before a hard limit. Changes above the established hard cap require separate approval; normal tuning within it is authorized.

Bound queues/caches, persist results to disk, checkpoint RNG/search state, and test graceful interruption and abrupt worker/unit termination with identical resumption. A worker failure must fail/checkpoint rather than hang. No automatic OOM restart loop. Node old-space limits alone do not cap typed arrays or aggregate memory.

### 7. Versioned governance and mandatory read workflow

Add a concise, prominently placed instruction to the repository's actual **`CLAUDE.md`** requiring Claude to read the authoritative standard and applicable study protocol before any new optimization or material continuation. Link it from existing research/developer instructions, including `AGENTS.md` where applicable. Preserve unrelated instructions; avoid duplicate conflicting copies. If one file is absent, follow repository convention and create the minimal appropriate instruction file.

Each new study must record an “optimization standard read and adopted” entry containing the standard path, version, SHA-256, read/adoption timestamp, study protocol hash, date split, objective/roles, risk denominator, budget and deviations. The study-specific protocol must distinguish justified adaptations from departures requiring user agreement.

For new research runners and future Priority 3, require a lightweight preflight check for this manifest before starting a substantive optimization. Include a reusable checker/template if practical, with tests for missing manifests and mismatched hashes. This is a scope-limited research safeguard; do not retrofit or break every historical runner. It verifies declared adoption, not that an agent truly understood the document; do not claim it can guarantee agent behavior.

When the user agrees a process change, update the standard and changelog with rationale, evidence, effective version and implications. Studies pin their adopted version. Continuing a frozen study after an update must either retain its pinned standard or record an explicit amendment; never rewrite history or silently migrate its rules.

## Roadmap and planning clarification

Record in the roadmap that **VG #2 Balanced is already a jointly optimized VGT+GDX D1 pool**, alias `s8-vg-balanced`, configuration `S8-VG-F24-3`. Preserve its complete paired D1 phenotype vectors, allocator conventions and provenance—not merely two independently chosen D1 books.

For the future staged Priority 3 approach, we can reuse VG #2 as the D1 incumbent and newly optimize a **VGT+GDX Growth pool**. That avoids requiring a fresh D1 search simply to build an initial staged benchmark. The resulting final combined system still has **one shared $100,000 pool**, not $100,000 for each strategy family.

This reuse is not a perfectly matched-budget comparison of optimization methods: VG #2 comes from an earlier search. Label it accordingly. Priority 3's later design should include the staged system as a benchmark and informed seed, plus full four-component joint refinement and an independent joint search. The final shared-pool evaluation must account for conflicts that separate family pools could not anticipate. Do not fix final D1 parameters permanently just because an incumbent exists.

Do not implement or run these future optimizations now. Complete Task A and the standard first, then return for review.

## Deliverables

- A separate follow-up report and immutable comparison manifest with exact frozen pair settings, six cases, controls, neighborhoods and the primary comparison's funded-trade explanation; backend machine-readable results and reproducible commands.
- The authoritative optimization standard, change log, study template, repository instruction links and the adoption/preflight mechanism with meaningful checks.
- A concise summary of documentation changes and how Claude will be directed to read them on future optimization tasks. State any enforcement limitations honestly.
- An updated roadmap: Priorities 1 and 2 complete; this follow-up complete or blocked with reason; **Priority 3 pending review**.
- Report observed resource use for this bounded task. Do not launch a broad tuning benchmark or waste memory just to demonstrate permission to use more.

Finish with the comparison conclusion, exact artifact paths, branch, verification results, and the decision points before Priority 3. Do not execute Priority 3 automatically.
