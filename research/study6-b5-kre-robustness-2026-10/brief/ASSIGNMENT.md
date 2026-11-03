# Claude Code Research Assignment: Audit and Improve B5 Robustness (KRE Diagnosis + Controlled Phenotype Optimization)

## Goal

Conduct a rigorous **diagnose-then-improve** study of the existing **frozen five-ETF B5** shared-margin pool (**VGT, KRE, GDX, XBI, XRT**). Preserve all goals of the original audit: determine whether frozen B5 passes the same neighborhood risk standards used to reject Study 5 candidates; identify whether and how KRE `lowDd` creates drawdown fragility; verify B1 separately if it exists; trace trade-level causes and execution sensitivity; and provide reproducible reports/commands.

**New additional goal:** After the frozen-model diagnostic is completed and its results are locked, **try to produce more robust B5 candidate phenotypes** while maintaining high net profit. Seek stable neighborhoods, lower drawdowns and reasonable profit retention, not merely a single attractive parameter vector. You may optimize **existing phenotype parameter values only**; do **not** change D1 strategy logic, B5 allocation/priority/queue/funding rules, trading or stop mechanics, position sizing model, costs, or ETF membership. Do not replace any frozen configuration. Optimized configs are research-only and must be separately named.

The target maximum **minute-sampled drawdown is strictly below $35,000 (35% of the fixed $100,000 allocation)** for the center candidate **and** the prespecified neighborhood robustness criteria. A lower drawdown is preferable, but it must not be obtained trivially by suppressing almost all trading or abandoning profitability. Look for a few honest, distinct candidate trade-offs if the evidence supports them; **a no-nomination outcome is acceptable and preferred over overfitting**.

**Do not conduct any actual-portfolio / VOOG-VGT core / 20%-of-equity margin evaluation.** This assignment concerns only the existing fixed-$100,000 shared-margin strategy research model.

## Essential context and source-of-truth documents

Read the repository's current `CLAUDE.md` and project/research safety instructions before operating. Locate and inspect, as applicable:

- Frozen B5 pool config (`config/pools/B5.json`) and associated frozen books/phenotypes.
- Study 5 report directory: `research/study5-gdx-d1-b5-three-etf-2026-10/` (including `PROTOCOL.md`, `ROBUSTNESS.md`, `RECOMMENDATION.md`, `POOL_B5_THREE_ETF_RESULTS.md`, `FROZEN_SELECTION.json`, and underlying results).
- Earlier B4/B5 robustness and prospective-shadow audits, including freeze/protocol documents, original **B5 optimization methodology/search code**, data pins, and prior B5 neighborhood risk analyses.
- The authoritative pool engine, replay/simulation code, minute drawdown implementation, market-data metadata, and current run commands.

Prior Study 5 evidence to **verify, not assume**:

1. Five-ETF frozen B5 (VGT/KRE/GDX/XBI/XRT) had **$486,207.77** net and approximately **$26,509.97** maximum minute drawdown through **2026-10-13**; through **2026-10-29** the source report says approximately **$484,636.97** net, with an open GDX lot.
2. The *restricted three-ETF B5 ablation* (VGT/KRE/GDX) had only **24%** of joint N1 neighbors under $35,000 maximum minute drawdown, and **62%** under $35,000 when varying KRE alone. **These are not measured five-ETF B5 results** and must never be presented as such.
3. Study 5 says previous audits found **full frozen B5** failed neighborhood robustness, but does not provide the full comparable five-ETF neighborhood statistics in its summary. Recover earlier evidence and/or independently audit the actual five-ETF B5.
4. Study 5 identifies KRE `lowDd` near the entry-threshold bound (X about 29.9%), 3.1% trailing stop, four-day hold as a potentially fragile component. Test whether that causal diagnosis survives analysis in the full five-ETF pool.
5. The user also asked if **“B1”** passes robustness. Treat **B1 as a literal name**: check whether a distinct B1 configuration/benchmark exists. If yes, report whether its robustness has been tested under genuinely comparable definitions; if no, explain that it cannot be verified. **Do not silently reinterpret B1 as B5.** Keep the main investigation centered on frozen B5.

## Strict scope and safety constraints

- Preserve all **original frozen B5 and B1** files, trading logic, allocator behavior, priority/tie-breaking, fills, interest, friction, market data and provenance. Never overwrite a freeze, pin, golden result, benchmark or existing research record. Create **new versioned candidate configurations** and reports only.
- Permitted changes in the *later optimization phase* are **existing D1 phenotype parameters and per-ETF combinations already supported by B5**. Stay within documented valid bounds. Keep the five-ETF pool membership and capital competition unchanged. Do not change engine code to alter outcomes or add a dynamic regime filter, new stop, new risk overlay, position-sizing change, ETF removal/addition, or new allocation policy. Diagnostic instrumentation/independently verified research code is allowed.
- Keep the **original five ETFs** in the primary B5 audit: VGT, KRE, GDX, XBI, XRT. Three-ETF results may serve as secondary controls but not proxies for full B5 robustness.
- Reuse the existing study's fixed-$100,000 trade/pool allocation, **11% margin interest** and **5 bps per-side friction** as the primary assumption, verifying the exact engine semantics. Report minute-sampled maximum drawdown in dollars and as a percentage of the $100,000 allocation. Risk ceiling: **strictly below $35,000 (35%)**.
- Distinguish the **center configuration passing** from **the neighboring configurations passing**. A center DD of $26.5k is not evidence that its neighborhood is safe.
- Do not change the **at least 90% of N1 neighbors strictly under $35k minute DD**, **N1 p90 DD < $35k**, and **center DD < $35k** requirements in reaction to results. These are the primary Study 5-style risk gates. Audit their comparability to the prior studies and pre-register their precise calculation; do not invent a retrospective passing threshold. Also report profit-neighborhood robustness separately.
- Historical periods through 2026-10-29 are **exposed** for these models; label them *retrospective research*, not a genuinely unseen final holdout. Do not claim forward edge from reusing exposed years. Optimization is now permitted **only within a strictly budgeted, preregistered, chronology-respecting candidate search**; no open-ended or post-hoc searches.
- Work in a clean new research branch if feasible; respect the user's pre-existing uncommitted changes. Prefer new isolated research modules/reports; no production behavior changes. Avoid large binary outputs or massive generated files in Git.
- Stop and disclose if important reproduction checks fail, rather than tuning until results match.

## Phase 0: Pre-register both the diagnostic and improvement protocols

Before evaluating new perturbation results **or searching any new candidate**, write and freeze `PROTOCOL.md` for both parts of this study, including:

- precise hypotheses and alternative explanations;
- exact fixed B5 configuration/hash, dataset paths/dates/hashes, replay implementation, costs, drawdown calculation and analytical window;
- deterministic perturbation radii, parameter grid, boundary policy, random seeds, sample sizes and sampling design;
- chosen diagnostics/plots/tables, definitions and interpretation standards;
- two separate stages, **Part A frozen diagnosis** followed by **Part B bounded improvement**; exact stage gates and when optimizer access is allowed;
- full candidate search spaces, algorithms, tuning budgets, date-split logic, scoring/selection rules, acceptable profit-loss trade-offs, neighborhood rules, seeds, and stopping criteria **before any candidate search**;
- prohibitions on modifying hypotheses, rules, gates or date splits after seeing results;
- a disclosure/decision ledger for any later amendments.

**Reproduce Study 5 N1 definitions wherever feasible**, including one-at-a-time probes (±1 and ±2 steps), deterministic Latin-hypercube N1 (128 joint samples for the full pool and 64 per-book samples), and N2 at a larger radius as *non-decisive context*. For the **five-ETF** B5 pool, joint perturbations span **all five books' registered parameters** (not only the three books or the original Study 5 24 parameters). If a direct comparable five-book N1 protocol exists from earlier audits, present it alongside the Study 5-style remeasurement rather than silently changing the setup. Report boundary clipping and duplicate samples: KRE's entry parameter is near the permitted maximum, so this matters.

Use enough *predeclared* replicate sampling seeds for a reasonable Monte Carlo sensitivity check (e.g., 3–5 deterministic N1 sets), but **do not choose the most favorable seed**. For candidate selection, use a separate preregistered set of neighborhood samples from those used during search; reserve at least one additional seed set for a final robustness confirmation after the shortlist is frozen. Report variability in pass fractions/p90 DD and all clipping/duplicate effects. Use identical full-run chronology for each comparable replay.

## Phase 1: Verify baseline and existing robustness evidence

1. Locate current data files, ensure complete sessions through **2026-10-29**, compare data pins/hashes and verify that prior data through 2026-10-13 are unchanged, if that can be established.
2. Run the frozen B5 at its historic pinned endpoint and current endpoint and reconcile net, minute DD, daily DD, interest, friction, trade count and open-position accounting. Preserve exact 2026-10-13 anchor reproduction and explain discrepancies.
3. Recover the actual frozen **five-ETF B5** neighborhood test results from previous B4/B5 studies (not just Study 5's restricted-pool figures). Show source filenames, dates, exact protocol, perturbation counts, p90 DD, share under $35k, and whether the results are comparable to Study 5's newer risk gate.
4. If there is a distinct `B1`, independently identify its status, frozen rules, and any apples-to-apples robustness tests. Give a clear answer: **passes / fails / not demonstrated**, with evidence. Do not devote a new full optimization to B1.
5. Where supported, cross-check the fast diagnostic engine against the authoritative simulation; explicitly verify fill rules, interest, capital contention, and minute DD on sampled perturbations.

**Required answer:** Does full five-ETF B5 itself pass the same 90%-of-neighbors / p90-below-$35k gate? Give exact figures, a clear verdict, and any methodological caveats. Separately answer B1 with the available evidence.

## Phase 2: Isolate KRE's contribution to sensitivity

Run **diagnostics only** around frozen B5 **and freeze their results before starting any optimization**; no parameter tuning or candidate selection in this phase:

### A. One-book-at-a-time neighborhood analysis

Vary **KRE alone**, hold the other four books exactly frozen, and compute:

- center net / minute DD / daily DD and each neighbor's net, DD, interest, gross profit, friction, occupancy, funded/refused trade counts;
- median, p10/p90, worst DD, % of neighbors below $35k, center percentile, and how many neighbors are duplicates because of clipping;
- identify which individual parameter offsets drive $35k breaches and which do not: entry X, trailing-buy Y, trailing stop, maximum hold, lookback L, intraday-loss buffer, continuation pullback P and continuation window W;
- sensitivity around the 29.9% entry parameter at the upper boundary: explicitly evaluate asymmetry, clipping, alternate predeclared in-bound step sizes, and whether the apparent fragility is sampling-induced;
- the dates/price paths of the worst drawdown excursions, with both peak-to-trough timing and positions held;
- comparison to one-book-only perturbations of **VGT, GDX, XBI, XRT** on the exact same pool/time/engine;
- report both *profit plateau* and *risk plateau*, not just nominal total net profit.

### B. Joint neighborhood and interactions

Run the predeclared **five-book joint N1** audit and identify whether KRE-alone fragility predicts joint fragility. Quantify interactions using **fixed, preregistered** paired perturbations (e.g. KRE+GDX, KRE+VGT, KRE+XBI, KRE+XRT), instead of searching for winning combinations. Report whether the main determinant is direct price risk, queue contention, changed opportunity allocation, or chronology/path dependence.

### C. Event- and trade-level causal attribution

For each major >$35k-DD perturbation (or a small representative set selected by a **predeclared** rule):

1. Show the **earliest divergence** from frozen B5 (arming, entry decision, fill, exit, or blocked/funded order).
2. Trace the affected capital-occupancy chain, including positions in *other* ETFs that were newly funded, refused or displaced because KRE's timing changed.
3. Show the exact **peak and trough timestamps**, contribution of each held ETF at each point, realized/unrealized P&L at both endpoints, margin interest, and changes relative to frozen B5.
4. Identify whether the increased DD comes from **KRE's own adverse excursion**, an ETF that KRE enabled or displaced, a gap/stop implementation effect, or multiple compounding events.
5. Provide at least the **five most explanatory** independent failure episodes (deduplicate scenarios tracing to the same underlying episode), using short chronological event ledgers.
6. Highlight 2020 COVID panic, the 2022 bear-market path, and any 2025–2026 episodes *only if the actual trace shows them to be relevant*. Do not fabricate causal relationships.

Important: global maximum drawdown is path-dependent and **not** additive across trades. Avoid summing isolated trade drawdowns or misattributing a drawdown that changes because one earlier trade changes the whole future sequence.

### D. Diagnostic ablations (not automatically candidate strategies)

To isolate cause, run a few **frozen, preregistered counterfactuals** such as: full B5 with the KRE book disabled, and full B5 with KRE signals recorded but prevented from funding. Use only if mechanically supported and report them as *causal diagnostics*, not as recommended portfolio removals. The improvement phase must retain all five ETFs. Keep all other books/rules unchanged. Any differences in P&L or DD must be decomposed into lost KRE trades and other books' changed opportunity sets. If these scenarios are equivalent in the engine, report that rather than manufacturing a distinction.

## Phase 3: Frozen baseline execution sensitivity

Before optimization, perform consistent controlled sensitivity checks on frozen B5 and representative KRE-risk-neighbors:

- execution friction (e.g. 0, 2, 5, 10, 20 bps as supported);
- margin interest (e.g. 8%, 11%, 14%);
- intraday stop fill versus next-tradable-price or next-open gap and conservative 10/25-bps additional stop slippage, only if the engine implements these clearly;
- year-by-year / major event windows, plus leave-one-year-out *diagnostics* that preserve path dependence and proper warm-up semantics;
- inspect concentration of net profit and drawdown in a few trades/episodes;
- clarify if a robust-looking center is simply far from an exposed failure because the sample path is narrow.

Do not mix different execution assumptions in the same ranking and do not call these alternative realities new independent holdouts.

## Phase 4: Lock diagnostic findings and candidate-study design

**Produce and freeze a diagnostic checkpoint before beginning any optimization.** The checkpoint must contain:

1. **B1** status (if identifiable): passes / fails / not demonstrated under a comparable gate.
2. **Full five-ETF frozen B5** status: exact center DD and comparable five-book neighborhood pass fraction, p90 DD, profit dispersion, and any methodological limitations (not the three-ETF proxy).
3. KRE's **causal** contribution: whether KRE is really the weak link; parameter-specific failure directions; named risk episodes and the effect of queue/capital contention across all five books.
4. Comparison against VGT/GDX/XBI/XRT single-book sensitivity and joint book interactions, plus interest/friction/fill sensitivity.
5. A read-only, reproducible baseline manifest with config/data/code hashes, commands, and diagnostics. Commit or otherwise cryptographically checkpoint this state so optimization results cannot silently rewrite the original analysis.

Do not force a KRE-first conclusion if other books or interactions are causally more important. **Only then** proceed to the new improvement phase below.

## Phase 5: Preregistered, controlled B5 robustness improvement

### A. Objectives, constraints, and benchmarks

Maintain **full five-ETF B5** throughout optimization. Compare every candidate to the *same frozen five-ETF B5* under the same dates, $100k fixed allocation, 11% annual interest, 5 bps per-side friction, and authoritative allocator/execution rules. Also include an unoptimized KRE-disabled scenario only as a diagnostic reference, never as a qualifying five-ETF candidate.

Pre-register **all** quantitative gates and ranking criteria before evaluating candidates. At minimum:

- **Hard risk gate:** center maximum **minute** DD < $35,000, **at least 90% of N1 neighbors** have minute DD < $35,000, and N1 **p90 minute DD < $35,000**. If these two neighborhood requirements differ due to quantile conventions, resolve and document *before search*; do not count duplicates from clipping as independent successes.
- **Primary objective:** robust risk-adjusted **net profitability after interest and friction**, including median and low-quantile neighborhood net P&L, not just center net profit.
- **Secondary objectives:** lower center DD and p90 neighborhood DD, retain a high proportion of frozen B5's net profit, reasonable interest/occupancy, limited concentration in one episode, stable across years/folds, and interpretable parameters away from brittle boundaries.
- **Profit discipline:** clearly report actual and percentage profit sacrifices versus frozen B5. Use **90% / 95% / 100% of frozen B5 net** as *predeclared comparison reference lines*, not retroactively movable hard pass criteria. Avoid declaring a very-low-return strategy “better” solely because DD decreased. Include a Pareto frontier of profit vs risk; select only candidates that genuinely improve robustness by a meaningful margin and have an acceptable economic trade-off.
- **Comparability:** report absolute DD dollars and DD as % of fixed $100k allocation; also report net profit / DD, drawdown dates and paths, number of trades, profit per unit of capital occupancy, exposure/interest, and opportunities blocked/funded.
- **Disqualification:** no candidate may be endorsed for breaching a frozen risk gate, demonstrating fragile validation performance, relying mainly on 2020/2025 windfalls, or trading so infrequently that its DD is artificially small. Pre-register objective minimum activity/coverage diagnostics, but do not arbitrarily impose a profitability threshold after the fact.

**Do not weaken the risk gates merely because frozen B5 itself fails them.** Report a clearly marked *partial improvement* if no fully qualifying candidate exists. A strong historical center is not equivalent to a robustness-qualified nominee.

### B. Reconstruct the original B5 search *and* try safer methods

First locate, document and **faithfully reproduce** the original optimization process that produced frozen B5 phenotypes: search ordering, feasible bounds, objective, ETF priority and capital-competition handling, sampling/refinement schedule, cost levels, and stopping rules. If its original implementation is unavailable, document that rather than falsely claiming reproduction.

Then run **both**, each within budgets fixed up front:

1. **Original-B5-method search:** use the faithfully reconstructed method as a controlled search track with the same D1/B5 rules and valid phenotype knobs, but score the resulting candidates against the new risk and validation requirements. Retain full trace and clearly distinguish historically original methods from any changes made for this study.
2. **Robustness-first search:** use a deterministic limited-budget method such as bounded coordinate/local neighborhood searches, multi-objective Pareto exploration, perturbation-aware ranking, or a modest multi-start search on a preregistered grid. Prefer **broad stable parameter plateaus** to isolated optima; explicitly penalize low neighborhood profit, high p90 DD, excessive parameter-boundary dependence and performance concentration. Use **successive halving** or another predeclared screening method to avoid full neighborhood tests on every clearly inferior vector, then run exact authoritative checks on survivors.

**Search sequence** (unless the frozen diagnostic evidence strongly supports changing it; any change must be decided and documented before searching):

- **Track K (KRE-focused):** optimize KRE's **existing** phenotype parameters while freezing VGT/GDX/XBI/XRT exactly at B5. Search local neighborhoods first, then only bounded wider regions justified by diagnostics. This tests whether B5 can become more robust without destabilizing every book.
- **Track J (limited joint):** only if KRE-only candidates fail to achieve acceptable profit/robustness, permit a **small, preregistered** joint search involving KRE and the other one or two most causally important books. Do not simultaneously search all five full parameter spaces with an open-ended optimizer. If full five-book joint optimization is considered indispensable, require a finite precommitted budget, staged selection, and explicit multiplicity/overfitting warnings.
- **Track O (original-method):** include original B5-style optimization as a separate comparator track even if Track K or J appears successful. The user explicitly wants this method **as well as** improved robustness-oriented approaches, not one in place of the other.

Remain within the existing parameters: entry threshold X, trailing-buy Y, trailing stop, maximum losing hold, lookback L, intraday-loss buffer, continuation pullback P, continuation window W, and any other B5 phenotype knob that genuinely exists and is verified. Do not make up knobs or implicitly change the allocator. Use integer sessions/days and boundary rules correctly. Preserve materially distinct alternatives rather than selecting 20 nearly identical vectors.

### C. Chronological selection, validation, and overfit controls

Every historical session through **2026-10-29** has now been exposed by prior studies, so **no historical period can honestly be called a pristine holdout**. Nevertheless, use a strict chronology to reduce *within-study* leakage, disclose the remaining adaptive/reuse bias, and freeze final selections before viewing the later reporting windows:

- Suggested primary windows (verify exact eligible dates/warm-up): **development 2017-06-15–2021-12-31**, **validation 2022-01-01–2023-12-31**, **retrospective final stress 2024-01-01–2026-10-13**, and **recent 2026-10-14–2026-10-29** separately (12 new completed sessions). The latter is far too short to provide meaningful independent validation, and has now been inspected. **Preserve continuity/path dependence at boundaries**; never reset holdings/interest/indicators or splice independently optimized period P&Ls into a fictitious portfolio.
- Optimize only on the **development** period. Use validation to rank among **pre-identified shortlist candidates**, not to restart searching or move the grid. Freeze candidate selection after validation. Open the already-exposed final period only **once per frozen candidate shortlist** for an explicitly retrospective stress check. Report the recent segment separately. Do not retune after seeing these outcomes.
- Add preregistered **earlier walk-forward folds** / anchored train-select-test repeats where data permit, purged of impossible warm-up leakage and without reusing test observations for within-fold selection. Summarize stability of chosen parameter regions and net performance, *not* only the best single fold. Acknowledge that rolling folds reuse history and cannot create fresh independent market events.
- Use chronological objective checks on **net profit per year**, left-tail/median profit, max minute DD, concentration, capital utilization and opportunity sequencing. Include 2020 recovery and 2022 downturn stress; do not select specifically for those periods.
- Quantify model-selection risk (e.g., PBO/CSCV **only when methodologically valid for the available paths/folds**), bootstrap/block or episode-level uncertainty where defensible, and measure validation-to-development degradation. Explain limitations given low independent event counts and dependent ETF returns. Do not use naive random shuffling of minute rows or claim a precise predictive win probability.
- Reserve **independent perturbation seeds not used for search** for post-selection neighborhood confirmation; do not choose favorable seeds. Stress full five-ETF book interactions, parameter boundary effects, stop slippage, margin rate, and costs consistently across center and neighbors. Where a candidate only narrowly passes a noisy 90% threshold, classify the verdict as marginal rather than robustly established.

### D. Final candidate verification and comparison

Once the shortlist is frozen, perform authoritative exact-engine replay (or demonstrated bit/cent parity) for frozen B5 and each finalist. Report all periods and the **full continuous chronological path**, risk gates both on the development/validation stages and retrospectively on full history, plus individual-book and **joint five-book** perturbation results. Compare with a predeclared *out-of-neighborhood larger N2* sensitivity set as diagnostic context, not as a new movable selection gate.

Produce at most **3 distinct research nominations**, if any: (i) most robust qualifying candidate, (ii) strongest profit-retention candidate that also qualifies, (iii) best balanced candidate that qualifies. Omit categories with no credible candidate; **no nomination** if all fail. Include a Pareto table across original B5, KRE-only candidates, limited-joint candidates, and the original-method track. Label near-misses explicitly as **research-only, not recommendations**.

For every finalist, show the **entire five-ETF parameter vector**, not only KRE changes; provide isolated named config/phenotype files and **verified copy/paste commands** to rerun the pooled strategy, neighborhood checks and worst-drawdown traces. Quantify what changed vs frozen B5 and which parameters/episodes explain the risk difference. Re-run the same profit/risk comparison against the B5 pinned endpoint **2026-10-13** and current **2026-10-29** endpoint, preserving append-only data audit.

### E. Go / no-go decision

Make a defensible recommendation among:

1. **Qualified robustness improvement:** one or more candidates pass preregistered gates with sufficiently retained profits and stable validation/walk-forward behavior;
2. **Partial improvement only:** improved center/p90 DD or neighbor coverage but still fails a hard risk gate or gives up too much profit; or
3. **No credible improvement:** frozen B5 remains the benchmark and all new configs stay research-only.

Never make an improved backtest sound like proof of future safety. **Do not merge or deploy** any optimized phenotype without explicit user review and approval.

## Deliverables

Create a dated, self-contained audit directory under `research/`, with:

- `README.md` — executive verdicts, study scope, exact commands, limitations.
- `PROTOCOL.md` — frozen two-stage diagnostic + optimization protocols, seeds, time splits, budgets, objective/gates and data-exposure notes.
- `DIAGNOSTIC_CHECKPOINT.md` and manifest — locked baseline findings produced **before** parameter search.
- `BASELINE_AND_B1_B5_AUDIT.md` — exact historic/current reproduction, B1 verification, five-ETF B5 gate and earlier-audit comparison.
- `KRE_SENSITIVITY.md` — single-book and parameter-specific attribution with robust tables/plots if available.
- `JOINT_INTERACTIONS.md` — five-book and paired perturbation findings, complete risk-gate metrics.
- `DRAWDOWN_EVENT_LEDGER.md` — earliest-divergence and peak-to-trough causal walkthroughs.
- `EXECUTION_SENSITIVITY.md` — friction/interest/stop-fill diagnostics.
- `ORIGINAL_B5_METHOD_REPRODUCTION.md` — original optimization reconstruction, parity/reproduction evidence, and controlled comparison track.
- `OPTIMIZATION_SEARCH.md` — preregistered search space, budgets, candidate counts, selection flow, overfit checks and failures.
- `CANDIDATE_ROBUSTNESS.md` — center and neighborhood profit/DD, validations, p90, five-book interactions, Pareto frontier, and rejection reasons.
- `RECOMMENDATION.md` — precise audit verdict plus at most three **research-only** candidate nominations if (and only if) they qualify, otherwise no nomination.
- `RUN_COMMANDS.md` — **verified** copy/paste commands to rerun original frozen five-ETF B5, its pinned endpoint, KRE-only and full B5 joint N1 diagnostics, causal event traces, original-method search, bounded improvement tracks, and any research-only candidate pool configs. No invented run results.
- machine-readable deterministic parameters/results (JSON/CSV), candidate manifests with **all 5 ETF phenotypes**, rejected and accepted candidates and reasons, plus relevant tests, without bloating version control.

## Quality gates and workflow

- Use the authoritative executable behavior as the source of truth. Every reported key statistic should be reproducible from artifacts.
- Validate sample consistency, unit conventions (percentage points vs proportions), < vs <= $35k strict inequality, sessions vs calendar days, boundary clipping, exact profit accounting, and open positions. Do not let search choose a lucky neighborhood seed or reuse a reporting period for a later retune.
- Give reproducible exact CLI commands; **actually execute representative commands** and report their exit statuses rather than inventing them.
- Run relevant unit/integration tests and ensure no regressions to B5 anchors. If prior golden tests rely on old CSV checksums, identify proper pinning versus mismatches; do not erase test protections just to pass.
- Preserve developer working changes; make all new code/tests/report generation isolated. Commit and push a dedicated research branch **only after** inspection, with clear commit hashes and no unrelated changes; do not merge or open a PR without approval.
- Final console response: (1) B1 verdict, (2) actual five-ETF frozen B5 neighborhood-gate verdict, (3) top causal KRE findings with numbers, (4) B5 improvement attempts by original-B5 and robustness-first methods, including *failed* trials, (5) quantified center vs neighborhood comparisons and any qualified **research-only** nominations, (6) files/commits, (7) **verified copy/paste baseline and candidate rerun commands**, and (8) recommendation, limitations, and explicit no-deployment status.

**Core principle:** First discover and freeze *why* existing B5 is fragile; **then** test whether limited, transparent phenotype changes produce *genuinely broader robust parameter regions* with economically worthwhile profit. Do not manufacture a pass by changing gates, cherry-picking periods/seeds, or overfitting more historical data.
