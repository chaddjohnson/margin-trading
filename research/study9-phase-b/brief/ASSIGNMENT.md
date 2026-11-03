# Claude Code assignment — Study 9 Phase B: Seven-Pool From-Scratch Joint D1 Optimization and Stability Audit

**Authorization:** The user has explicitly approved this **seven-pool Phase B research assignment**, including the two exploratory additions described below. Execute the complete research workflow in this brief now, within the repository's normal permissions and resource limits. **Do not ask again whether to proceed with the planned local CPU-intensive optimization.** Do not commit, push, merge, open a PR, deploy, or modify live/prospective trading without a *separate explicit request*, as required by `CLAUDE.md`. This approval is for local research execution, not Git publication or trading.

**Central objective:** Discover whether a *new, jointly reoptimized D1 shared-margin ETF pool* can materially exceed the profitability of our established research candidates—especially **Study 8 VG #2 balanced**, the user's current favorite—while maintaining a broad, economically profitable parameter neighborhood, strictly acceptable drawdowns, satisfactory chronological performance, and credible fills. **Profit matters**; do not rank strategies by neighborhood-pass percentage alone. Conversely, do not accept a high-profit but fragile configuration. No new nominee is an acceptable outcome.

**Scope:** Seven **fixed ETF membership sets**, full fresh joint optimization of **all eight D1 parameters per ETF** for each set, **five expanding-window training/evaluation folds**, Study 8's **unchanged** optimization methodology and qualification/test gates, pre-test freezing, independent audits, one-time retrospective evaluation, risk/execution diagnostics, reproducible local runners, final reports, and an explicit recommendation. **Do not start another ETF-membership search**, add an eighth pool, or change the fitness function. The four ETF discovery families and Phase A are already complete and sealed.

## 0. Read the authoritative repository artifacts; inventory before touching anything

1. Read the entire root `CLAUDE.md` and any project recovery policies. Inventory `git branch`, HEAD, status, remote, untracked and user-modified files. Work from the existing `research/study9-etf-pool-discovery` lineage; create a distinct Phase B research branch/namespace without disturbing its sealed Phase A history or any existing user modifications. Prefer the existing main checkout; do not create or remove worktrees merely for convenience. Do not checkout/reset/clean over pending changes.
2. Read, in full, the **actual** files under `research/study9-etf-pool-discovery/`: `PROTOCOL.md`, `RECOMMENDATION.md`, `PHASE_B_OPTIMIZATION_PROPOSAL.md`, `POOL_MARGINAL_CONTRIBUTION.md`, `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md`, `STANDALONE_SCREEN.md`, `DATA_AND_UNIVERSE_AUDIT.md`, `DATA_MANIFEST.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, `AMENDMENTS.md`, `results/s3/nominations.json`, and the relevant machine-readable proposal, runner, integrity, and data-vintage records. Read the Phase A review and selection audit. The **Phase A sealed record is read-only**.
3. Read Study 8's actual sealed `PROTOCOL.md` (especially chronology, C1–C7, neighborhood geometry, NSGA-II schedule, Q1–Q8/E1–E3, T1–T7, role ranking, independent seeds, engineering parity and test reporting), `FROZEN_SELECTION.json`, `RECOMMENDATION.md`, `CHRONOLOGICAL_VALIDATION.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `SEARCH_AND_COMPUTE.md`, `BASELINES_AND_PARITY.md`, `RISK_AND_TRADE_SEQUENCING.md`, `RUN_COMMANDS.md`, optimizer code, fixed-pool engine, D1 engine/rules, and local `study8-run` interface. Read earlier frozen B1/B5 baseline and registry definitions where referenced. **The repository's frozen numerical rulebook, not a paraphrase in this brief, is authoritative.**
4. Verify Stage A's SHA-256 chain with the existing read-only verification command, its training projection and 61 eligible ETFs, and its retained data vintages. Study 9 Phase A reports all 64 canonical local minute files refreshed through **2026-10-30**, a physically truncated, read-only 2016–2024 training projection at `data/vintages/study9-train-2024/`, and 61 eligible ETFs. Inspect real paths and hashes rather than assuming the checkout has not changed. **Do not rerun sealed Phase A stages.** Retain Phase A's ~1.1 GB point cache; do not delete it or any other repository cache as cleanup.
5. Preserve user modifications, especially `config/market-events/distributions.csv`, `distributions.manifest.json`, `config/market-events/raw/`, `.DS_Store` and `._.DS_Store`. The fixed-slot engine does not book distributions; do not silently stage/edit the user's files to make old pins pass. No live broker usage or orders. No internet search is necessary; existing local Alpaca data and canonical code suffice. If data integrity fails, report the blocker instead of repairing history without authorization.
6. Write `brief/ASSIGNMENT.md` or equivalent containing **this complete brief**, and a purpose-built `RESEARCH_RECOVERY.md` updated during long runs. The user prefers end-to-end Claude execution: do not pause at ordinary implementation, optimization, qualification, validation or report milestones. Stop only for a genuinely blocking permission/credential/destructive choice, or if an unresolved scientific integrity failure makes continuation invalid. Respect the no-commit/push rule.

## 1. Exactly seven approved ETF pools (the membership sets are frozen)

| Research track ID (suggested) | ETF membership (exact set) | Books | Free D1 dimensions | Research role |
|---|---|---:|---:|---|
| `G4-ILF` | **KRE + GDX + ILF + MTUM** | 4 | 32 | Leading G-family Phase A discovery; generic robust ≈ $25.9k/yr; 90.9% share, liquidity/edge risk |
| `G4-EWW` | **KRE + EWW + GDX + MTUM** | 4 | 32 | Approved G-family reserve; generic robust ≈ $27.2k/yr, ~90% share; MTUM failed the Phase A ≥ $1k/yr marginal-book gate |
| `N3-EDV` | **EDV + IWM + XLF** | 3 | 24 | Alternative economic drivers; generic robust ≈ $10.0k/yr and 97.1% share |
| `N2-SMH` | **SMH + XHB** | 2 | 16 | Stable compact pool; generic robust ≈ $10.0k/yr and 96.1% share |
| `V3-IWM` | **VGT + IWM + XLF** | 3 | 24 | VGT-anchored alternative; generic robust ≈ $9.3k/yr and 97.9% share |
| `N2-EDV` | **EDV + XHB** | 2 | 16 | Alternative rates/housing economy; generic robust ≈ $9.8k/yr and 92.2% share |
| `VG3-IWM` | **VGT + GDX + IWM** | 3 | 24 | **Explicit user-approved exploratory VG-family test**; generic ≈ $12.7k/yr, ~89% share; below Phase A feasibility but included to test generic-screen false negatives |

These Phase A figures are **training-only generic-vector screening measurements**, NOT expected optimized returns, nor acceptable final risk statistics. The seventh track was not a Phase A nominee: record its user-approved addition as a **prespecified deviation from Phase A's recommended batch**, **not** a post-test rescue. The second track is the explicitly approved option-D reserve. The original five plus these two form the **entire approved search universe**. Do not silently substitute a stronger-looking eighth set after encountering results.

**From scratch means from scratch:** For each track and each training fold, jointly optimize **all** of that pool's D1 parameters; do not freeze any book at its previously selected VGT/GDX/KRE/other phenotype; do not seed search islands, per-book screens or refinement with Study 5–8 incumbents, Study 9 Phase A generic vectors, or previously optimized cross-pool phenotypes. It is permissible and required to reuse Study 8's **algorithm** for fresh per-book screening, Sobol candidate generation, Latin hypercube coverage, NSGA-II, and local refinement, provided every starting vector is newly generated with the fixed **Study 9 Phase B** seed namespace. The existing phenotype vectors can be evaluated as **immutable, separately labeled controls only**.

## 2. Hard economic and D1 execution contracts — unchanged

- Use the authoritative D1 trailing-buy/post-exit-continuation engine and its existing registered eight-parameter grid/box, trailing activation, hold periods, state, fill and re-entry rules. Do not change entry/exit logic, parameter ranges, quantization, opportunity definitions, or treatment of refused signals.
- Execute in the authoritative N-book allocator: **one $100,000 fixed funded slot** shared across the entire membership set, **no compounding, no simultaneous funded positions, no leverage multipliers**, first executable signal wins under the actual deterministic engine tie/order rules; other books' shadow/virtual signals continue as originally defined. No priority, preemption, dynamic position sizing or multi-slot policy changes.
- Funding: **11% simple annual interest on borrowed principal** under the existing day-count convention. Trading friction: **5 basis points per side**. Regular-session minute bars with the existing adjustment, stop and gap-open semantics. Avoid hypothetical close fills if the engine instead fills at the next eligible trade.
- All net results must include trading friction and interest, and distinguish closed-trade realized P&L from marked-to-market open positions. Drawdown is **minute-marked net** under the existing tracker, with daily DD additionally reported. The $35,000 threshold is a *backtest screening rule*, not a broker-enforceable stop or a 35% portfolio risk guarantee.
- Preserve all controls and baseline engine source. Reuse/prove exact parity rather than fork or rewrite trading logic. Keep all original frozen Phase A/Study 8/prospective research records and control configs unchanged.

## 3. Fitness: copy the Study 8 algorithm literally; apply the user's preferred robustness band only afterward

**Do not change the fitness function, penalty formula, candidate feasible region, parameter bounds, neighborhood radius, risk gates, training activity requirements or selection roles without first obtaining user approval.** If implementation requires a correction that would alter a numeric research rule, stop and ask; do not call an outcome-aware repair a bug fix.

Study 8's four constrained Pareto objectives (for orientation; implement by importing the actual code) are:

1. **Maximize center net profit per training year**.
2. **Maximize parameter-neighborhood median net profit per training year**.
3. **Maximize parameter-neighborhood P10 net profit per training year**.
4. **Minimize parameter-neighborhood P90 minute drawdown**.

Its profitability-oriented ranking statistic is `robustProfit = (neighborhoodMedianNet + neighborhoodP10Net)/2`, annualized. **Profit is a first-class goal**; 99–100% pass rates are not inherently superior to a substantially more profitable 95–98% candidate once all applicable constraints and validation gates pass.

Import Study 8 constraints **C1–C7** literally, including strict center DD below $35k, training neighborhood share ≥ 90% and P90 DD below $35k, minimum activity/episodes and each book's participation, neighborhood median ≥ $10k/yr and P10 positive, ≥ $11k per occupied $100k-year, largest-lot/best-year/ex-best-year concentration limits. Retain the actual code's definitions for `y`, episode, lot-year, and partial-year concentration; compare the implemented rules with the sealed Study 8 rulebook. Retain qualifications **Q1/Q2/Q2b/Q4–Q8 and E1–E3** (with Study 8's historical interpretation of Q3), including in-box checks, active-economy and robust-mean-retention checks, plus center execution stresses. Do not substitute a weighted return/DD score or a coarse center DD cutoff for the true constraints.

**User's preferred evaluation bands, not a rewritten optimizer:**

- **Preferred:** ≥ **95%** neighborhood pass rate under the decisive confirmation/test instrument; sufficient profitability, lower-tail performance, drawdown margin and chronological results still mandatory.
- **Conditional exception:** **93% to <95%** ONLY for a compelling, explicitly quantified profitability and risk case with competitive validation, including no serious weakness in independent seed families, in-box checks or execution stresses.
- **Diagnostic:** 90% to <93%; qualifies only under Study 8's unchanged *mechanical* rule, but is **not recommended as the user's preferred selection**.
- **Below 90%:** fails Study 8's mechanical C2/Q2/T2 criteria as applicable.

Keep the distinction among **mechanical training nomination**, **retrospective test status**, and **user-preference economic ranking**. Do not reorder a frozen pre-test nominee or swap configurations based on later-window performance. If the highest-ranked mechanically qualified candidate violates the user's 95% preference, report it transparently and discuss alternative preselected roles; never call an ex-post favorite an independently selected winner. Report the neighborhood share with sample size, separate seed families and one-sided Wilson lower confidence bound. Sampled perturbations are not a probability of future loss avoidance.

## 4. Parameter perturbation, independent confirmation and side diagnostics

Reuse the exact Study 8 high-dimensional neighborhood design: N1 clipped joint Latin hypercube over **all `8 × bookCount` coordinates**, Study 8's quantization/grid/clipping, radius (in original coordinate units): target X ±1.0 percentage point, trailing buy Y ±0.2 point, stop ±1.0 point, maximum hold ±2 days, lookback L ±10, loss buffer ±1.0 point, post-exit pullback P ±1.0 point, continuation window W ±20. The existing numeric source wins if shorthand here is imperfect.

- Multi-fidelity **16 → 64 → 128** independent stage neighborhoods; select on independent training seeds and confirm with **3 × 128 ≈ 384 unique** points. Use the frozen Study 8 sample and selection schedule; do not inflate apparent precision by counting duplicates.
- Retain mandatory **in-box** (2 × 128) gate for near-bound coordinates; count-matched **k = 8** decisive E3 comparison; report 0.5r and 1.5r, norm-matched and per-book perturbations, k = 16 and behaviorally relevant dimensions, clipping mass, parameter-bound effects and per-family disagreement.
- For every selected role holder and incumbent, show median, P10, P90, minimum, percent profitable, share below $35k, and each neighborhood's worst drawdown. Include dimension-matched summaries because a 16-D pool and a 32-D pool have different simultaneous perturbation exposure.
- Measure trade-sequence stability *and* economics: funding-lot Jaccard, refused and displaced trades, added trades, median neighbor P&L among low-overlap sequences. Distinguish "different trades, similar aggregate profits" from "small perturbations destroy profit".
- A global neighborhood pass percentage is cumulative historical simulator robustness, **not a claim that later-period drawdowns are independent**. Separately report drawdown episodes **within the test period**, including inherited positions and continuous high-water state, without resetting strategy state at a date cut.

## 5. Search methodology, budgets, and a complete execution plan

For **each of the seven pools × five chronological folds**, run Study 8's full optimizer and independent per-track search schedule, including:

- fresh per-book feasible/plausible candidate screens, independent Sobol design and joint Latin-hypercube coverage;
- NSGA-II constrained multi-objective optimization, at least Study 8's four independently seeded islands with frozen **T1 hypervolume-extension rule** up to the original cap; rung 1–3 promotion; independent seed-family remeasurement; local coordinate refinement; Pareto coverage/crowding; behaviorally distinct shortlist (maximum six) and roles `profit`, `robust`, `balanced`, `extra`;
- fair dimension-scaled proposal and neighborhood budgets using **`s(d)=max(1,d/16)`** with the same per-island/rung/shortlist schedule as Study 8. Apply the original predeclared **T1 saturation, T2 uncertainty, T3 coverage** triggers, and disclose limits/undercoverage rather than silently shorten a difficult search;
- exact deterministic RNG namespace **`study9-phase-b`**, with stable labels incorporating membership set/track, fold, stage and island, separate from Study 8 and Phase A; don't reuse prior test seeds for training promotions;
- a cache key that binds pool membership and ordering, each book's entire vector, training window/data-prefix hashes, splits, engine/import-closure source hashes, costs, interest, fills, neighborhoods, grid and phase. New research results live in a new namespace; no Study 8 or Phase A sealed record may be rewritten.

**Estimated computation for the approved seven pools, all five folds:**

| Category | Count | Estimated CPU-hours, including qualification/tests |
|---|---:|---:|
| 16-D (SMH+XHB; EDV+XHB) | 2 | 2 × ~6 = ~12 |
| 24-D (EDV+IWM+XLF; VGT+IWM+XLF; VGT+GDX+IWM) | 3 | 3 × ~9 = ~27 |
| 32-D (the two KRE+GDX four-book variants) | 2 | 2 × ~19 = ~38 |
| **Total** | **7 pools × 5 folds = 35 search jobs** | **~77 CPU-hours** |

These are planning estimates from Study 8 and Study 9 Phase A, **not a computation cap or guarantee**. A prior proposal estimated ~49 CPU-hours for the five approved nominations and ~68 including the G-family reserve; the extra VG exploration brings the rough total to ~77. The 8-physical-core/16-thread system may take many wall-clock hours; island saturation extensions and pool behavior can raise compute substantially. Run pilots for throughput only, freeze budgets/triggers *before seeing full economic results*, use controlled parallelism (avoid memory contention), checkpoint/resume and a watchdog. **Do not stop early merely because the initial estimate was reached** when the frozen protocol requires more work. Do not consume arbitrary extra search runs to chase a better validation result either. Report number of configurations, distinct centers, fresh neighborhood replays, CPU-hours, wall time, saturation events, fronts, PBO, and restarts.

Local CPU computation should proceed through completion without repeated user approval. Avoid expensive Claude-model chatter for routine batch monitoring: use scripts and sparse deterministic progress polling. Don't promise async completion; do the work as part of this Claude task. If resource constraints make completion infeasible, preserve reproducible partial results and accurately identify the missing stages. **No ad hoc optimization of ETF membership or fitness.**

## 6. Chronological design: freeze selections before any later-window access

Preserve Study 8's five-fold protocol **literally** (subject only to changing the approved track IDs and seed namespace):

| Fold | Training end | Evaluation window | Purpose |
|---|---|---|---|
| F19 | 2019-12-31 | 2020–2021 | Tests unseen COVID crash regime |
| F20 | 2020-12-31 | 2021–2022 | Tests unseen 2022 bear regime |
| F21 | 2021-12-31 | 2022–2023 | Essential bear/re-entry stress diagnostic |
| F23 | 2023-12-29 | Calendar 2024 | Sparse-opportunity diagnostic |
| **F24** | **2024-12-31** | **2025-01-02 → 2026-10-29** | Primary retrospective chronological test |

All folds start the same common history as the authoritative engine; arming date 2017-06-15, accounting from 2016-01-04. For the four earlier folds, preserve Study 8's exact end sessions and yTest definitions rather than approximate a window. The optimizer, screening, in-sample confirmation, constraints, initial rankings, selection and full global F24 ranking must use **only training-door data for their fold**, not a reweighted average with the later period.

**Data-door isolation:** For F19/F20/F21/F23/F24 search and qualification, physically or logically load only bars through each fold's training end. Reuse Study 9 Phase A's physically truncated 2024 training projection and validated, no-lookahead door or a strictly pinned child door. Fail closed if any optimization/search call requests post-2024 data. In particular, do **not** use Phase A's data refresh on 2025–2026 to inform ETF membership changes or parameter selection. Cache keys must include fold-specific prefix hashes. Add malicious appended-future-data tests demonstrating byte-identical training decisions, marks, search-point evaluations and cache identities.

**Freeze order:**

1. Inventory/engineering parity, independent methodology and implementation review, small timing-only pilot; write and freeze the new **pre-search protocol** and its approved seven-pool list, numeric rulebook, compute schedule/triggers, role definitions, risk/economic gates, test-door plan and data hashes. All amendments thereafter append-only with integrity disclosures.
2. Execute and seal all **35 searches** (and any prespecified trigger extensions). Run training-only qualification/confirmation on all shortlists. Store complete search archives, point caches and trade ledger references; *do not delete caches*. Seal qualification.
3. Produce and seal `FROZEN_SELECTION.json` holding all training-only shortlisted candidate IDs/vectors, roles, training qualification, ranking, negative/empty slots, controls, and hash chain. Do not reopen the search or promote additional candidates because a later outcome looks disappointing.
4. Perform a **fresh, read-only pre-test independent audit**, with a written PASS/CLEARED result for leakage, seed independence, source/data hashes, C/Q/E constraints, inclusion of the exploratory VG track, engine parity, and freezing. No test door can open before it clears.
5. Open test doors **once in Study 8's order**: F19, F20, F21, F23, then F24. Complete T1–T7 for all prespecified shortlisted candidates and the study controls; verify an identical deterministic confirmation rerun as allowed by Study 8. **Test outcomes only veto; never re-optimize, rerank or substitute.** Preserve failed candidates and their reasons.
6. After test records are sealed, evaluate the **2026-10-30** session as a **separate single-session later-data slice**—not part of the primary T1–T7 selection gates and not a meaningful statistical holdout. Do not infer generalization or use it to amend selection. If the canonical dataset includes newer sessions by execution time, do **not** silently expand this fixed block; record any genuinely later sessions and reserve them for forward observation under frozen rules instead.

**Important exposure:** The 2025–2026 market period through 2026-10-29 has already been inspected by Studies 5–9, and KRE/GDX's broad paths are especially familiar. Hence this is **retrospective chronological persistence**, not independent out-of-sample proof. Study 9 Phase A had not computed post-2024 pool results, but that does not cleanse earlier project exposure. Treat F19–F23 failures as informative about regime vulnerability. If data-vintage changes mean post-2026-10-13 bars for 56 symbols were new to Phase A, record that fact without calling an already elapsed evaluation a live prospective test. Genuine prospectivity begins only with sessions uninspected *after* configuration/rules are frozen and kept frozen.

For each fold and especially F24, calculate both full-run cumulative figures and **incremental period** P&L/risks: inherited open lots, state carry-over, interest, high-water marks, per-window marked P&L, 2025 and 2026 separately, test-window high-to-low DD, independent neighborhood test-window profit distribution and DD, and cumulative neighborhood pass rates. Do not conflate cumulative drawdown stability with independent prediction of the later-window drawdown.

## 7. Engineering and numerical correctness are hard gates

Before economic conclusions, reproduce Study 8/9 Phase A pre-cutoff controls and the N-book allocator at exact parity:

- Verify Phase A chain and train-data pins before start; its sealed S0–S3 records are **immutable**. Validate the `data/vintages/study9-train-2024/` projection, current canonical data prefixes and all relevant ETF session calendars. **Use Phase A's already refreshed minute data**; do not download fresh post-2024 bars or recut the 2024 training universe as part of this locked retrospective study unless a genuine data-integrity blocker is diagnosed and a separately approved new study is created.
- Test fast per-book traces and pooled replay vs the authoritative allocator for **2-, 3-, and 4-book** sets, including all seven actual memberships, multiple newly generated vectors and perturbations, ties/refusals, two costs, next-open and gap-stop stresses, early and final training windows and continuous runs through the test end. Reconcile *every material* field: entry/exit timing/price, accepted/refused and shadow trades, P&L, interest, friction, equity marks, daily/minute DD, open lots. Zero unexplained differences.
- Reproduce frozen B1/B5, frozen subsets and Study 8 VG #1/#2 at their **sealed** end dates and accounting conventions, especially #2's config `S8-VG-F24-3`/runner alias `s8-vg-balanced` (confirm against manifest); compare training-window results to Phase A's pinned comparators. Preserve all incumbent config bytes.
- Validate no-lookahead on every fold by truncation plus adversarial post-cutoff synthetic crash bars. Prove deterministic random seeds, cache portability/resume correctness, old/new engine parity, and no hidden post-2024 lookups via metadata, annual attribution or data timestamps.
- Run synthetic and integration tests, type checking, lint, inherited suite when appropriate. Classify pre-existing failures/cancellations rather than claim blanket green. Independent methodology review **before freeze**, independent **pre-test** read-only audit before test-door opening, independent **final** read-only audit after reporting; resolve or clearly disclose engineering-only amendments. If a numeric rule or sealed input would change, stop rather than silently correct it.
- Protect user-modified `config/market-events/*` and untracked files; document the existing distribution-pin mismatch without reverting user files. The fixed-slot allocator does not use distributions, so do not let an unrelated pre-existing checksum error become a pretext to alter baselines.

## 8. Risk realism and ETF-level economics (report-only unless inherited Study 8 gates)

The study is evaluating **margin-funded** trades. Report baseline and stresses using the same Study 8 Q7/T4 and appendix sensitivity machinery: 5 bps per side / 11% base; 10 and 20 bps, 8% and 14% interest, next-open stop fill, +10/+25 bps stop slippage, alternative arming-date sensitivities, and any canonical additional tests. Costs and slippage are not optional to make a pool look attractive.

- **Liquidity:** ILF is marked *thin* in Phase A (≈ $31.6M median training daily dollar volume; a $100k lot ≈ 2.9× median minute-bar dollar volume). EDV has sparse historical minutes. Explicitly show per-ETF bar participation, trade size relative to observed bar liquidity, gaps, number and dollar magnitude of stop-through-open fills, lack of available next-bar execution, and any held position during missing regular-session bars. Distinguish "accounting passes the modeled fill stress" from "realistically executable with $100k size". Evaluate report-only liquidity-aware participation caps/delays/partial fills if the engine supports them without altering historical rules; otherwise quantify feasible lower-size fills and state what cannot be inferred from minute OHLCV. **Do not quietly change the base engine.**
- **Risk:** for each winning role and each control, report 5 worst intra-trade MAEs, max single-lot loss, worst 5 cumulative minute-drawdown episodes with peak/trough and trade attribution, overnight gaps, consecutive losses, 2020/2022/2023/2025/2026 event behavior, worst calendar year, ex-best-year profit, top-lot contribution, and per-book profit and drawdown effects.
- **True pool complementarity after optimization:** rerun every leave-one-out subset and, for 2–4-book pools, all `2^n ≤16` membership subsets under the **selected vectors held fixed**, capturing accepted vs refused signals, displaced trades, contribution and Shapley attribution. The contribution is *conditional* on vectors and shared-slot order, not intrinsic ETF alpha. Identify ETFs that contribute little or negative *incremental* net despite making standalone money, and the effect of changing them on pool drawdown/interest. Do **not** remove books and retroactively claim a newly discovered pool as a selected track; record possible improvements for separate future research.
- **Market event concentration and generality:** show results ex-2020, 2020 alone and per-year, early vs late training periods, 2022 drawdown/reentry, 2025 and 2026 GDX, and how much profit comes from a small number of synchronized market-wide events. A lower point-estimate DD after adding another book does not guarantee the protection is structurally persistent.
- **Portfolio context, limited:** distinguish the $35k margin-slot risk ceiling from the user's combined 60% VOOG / 40% VGT core portfolio risk; this task does **not** authorize a full dynamic-portfolio deployment simulation or a change to margin borrowings. Any insight about a possible portfolio impact should be clearly caveated as non-modeled.

## 9. Frozen controls, economic comparisons and research conclusions

Measure every new role holder against, at minimum, these **unchanged** control configurations on like-for-like windows, costs and seed families:

1. **Study 8 VG #2 balanced** — **the user's current favorite and the primary economic comparator**; confirmed reference `S8-VG-F24-3` / `s8-vg-balanced` if verified against sealed files.
2. Study 8 VG #1 profit (`s8-vg-profit` / sealed ID, verify exact alias).
3. Frozen standalone VGT B1 (`vgt-primary`).
4. Frozen original five-book B5 (`b5-frozen`).
5. Other relevant existing matched-set frozen subsets and Study 8 pool role candidates (e.g., VXRG/VXRKG/VXR) as non-decisional context, where available.

Controls must not seed optimization. Preserve their selection/exposure history and correct for dataset-vintage differences. Report the fixed-slot net and drawdown plus robust annualized medians/P10, P90 DD, sample pass rates, test-window P&L, stress performance, capital occupancy, incremental lots and block-bootstrap comparisons on **identical periods**. Study 8 training history is in-sample for its own candidates; B1/B5 were hindsight-selected relative to 2025–2026. Do not call differences causal evidence for pool membership, or use test results to pick parameters.

**A new strategy is economically compelling only if** it is a mechanically qualified and retrospectively persistent candidate with broad neighborhoods (preferably ≥95%), strong center/median/P10 profits, adequate activity, positive economic contributions after capital contention, credible fills, and a **meaningful, uncertainty-aware advantage** over VG #2 or another valuable control. A large training profit alone is insufficient. A marginally higher center profit bought by worse neighborhood economics or substantially poorer validation is not preferable. Bootstrap intervals that overlap zero must be reported as inconclusive. Do **not** require an arbitrary new winner: valid outcomes include a better pool, a stable but less profitable alternative, or no improvement.

Report three separate decisions:

- **Mechanical protocol nomination** in the prespecified F24 training-only order restricted to T-pass/ambiguous, exactly as Study 8 requires, even if it is not the user's favorite.
- **User-preference assessment** applying the 95% standard and conditional 93–95% exception, comparing all preselected roles without changing the mechanical ranking. Explicitly label any ex-post preference as descriptive, not untouched selection.
- **Deployment decision: research only, NOT DEPLOYED.** Do not propose actual margin orders or claim proven live robustness. Explain the required truly prospective follow-up.

## 10. Reproducibility, runnable configurations, complete trade ledgers

Implement usable CLI commands for **each of the seven membership sets and every preserved nominated/role-holder configuration**, plus controls, following the existing `study8-run` style but in a distinct Study 9 Phase B namespace. Implement only after the selection records are sealed and the test stage is complete; do not let runner features leak testing data to the optimizer.

Required operator experience (names illustrative; print **verified exact commands** in `RUN_COMMANDS.md`):

```bash
npm run study9b-run -- list
npm run study9b-run -- run <sealed-candidate-alias>
npm run study9b-run -- compare <alias-A> <alias-B> <control-alias>
npm run study9b-run -- compare --all
```

- `list` must display full ETF membership, research track, role, training rank, precise config ID, test gate status and research-only label. Provide useful aliases for the **best training-selected passing** candidate of every pool and separate `profit` / `robust` / `balanced` role aliases where distinct. Avoid claiming one exists if a track had no qualified role.
- A run without `--end` uses the **latest complete common local session across all its book files**, not an arbitrary Study 8/9 study end; historical `--end YYYY-MM-DD` must work. Optional `--cost-bps`, output directory, compare and quiet flags, if supported by the shared runner. When extending beyond sealed dates, label reconciliation **not applicable**, not PASS; don't run fresh post-freeze data as part of optimization selection.
- Each run reports complete realized/unrealized and gross/net P&L, interest and friction, full-history minute/daily drawdowns ($ and % of $100k with peak/trough/recovery), individual book metrics, trades/episodes/occupancy, refused signals and reasons, fill types, win rate/profit factor, 2025/2026 period attribution, and exact data-vintage/source hashes.
- Export `runner-summary.txt`, `lots.txt` (clear per-lot human-readable ledger), `lots.csv`, `lots.json` (field definitions and unavailable fields), `trades.csv` / `.json`, `signals.csv`, `daily.csv`, `monthly.csv`, `yearly.csv`, `runner.json`, and comparison files such as `compare.md`, `compare.csv`, `compare-yearly.csv`, `compare.json`. Missing tick-level/commission/order IDs must be flagged rather than fabricated.
- Per lot: source ETF, setup, decision and fill timestamps/prices, exit trigger/decision/fill, share quantity, gross, friction, accrued margin interest, realized or unrealized net, holding duration, exit reason, worst MAE/time, best MFE/time if derivable with exactly reconciled engine marks, and the state of the open lot at the evaluation cutoff. Recompute MFE/MAE from the authoritative minute marks only when consistent with the engine's own MAE and count; document partial information.
- **Prove reconciliation** to the sealed Phase B results for every role holder, control and lot at the fixed sealed 2026-10-29 / 5 bps baseline, with 0 material mismatches; when a sealed per-lot ledger is absent, do not falsely report lot-level PASS. Test incomplete days, future dates, invalid dates, duplicate output dirs, new data appends and changed historical prefixes; reserve output directories atomically (the Study 8 runner already resolved its own collision bug). Changes must not break existing `study8-run` or `study7-run` commands.

The runner should be reliable and useful even if all seven optimization tracks fail qualification: preserve explicitly labeled research/diagnostic configs only if the frozen protocol permits, and never masquerade an unqualified config as nominated.

## 11. Outputs to create and how to report findings

Create `research/study9-phase-b/` (or an equally distinctive established repo convention), `src/study9-phase-b/`, and `src/study9b-runners/`, keeping existing namespaces intact.

**Core files:**

- `README.md` — what was done, status, limits, how to navigate, decisive findings.
- `PROTOCOL.md` — frozen pre-search procedure and exact deltas from Study 8 and the Phase A proposal (seven approved memberships and new seed namespace only; preserve numeric fitness).
- `AMENDMENTS.md` — append-only explanations of any post-freeze engineering changes, with exposure and effects.
- `RESEARCH_RECOVERY.md` — checkpoint with branch/HEAD, pins, chain head, door state, known data vintage, stages completed, live process and safe resume commands.
- `SEARCH_AND_COMPUTE.md` — per-track/fold budgets, search coverage, saturation, Pareto frontiers, population diversity, uncertainty, runtime and PBO.
- `TRAINING_QUALIFICATION.md` — selection evidence, qualification Q/E results, 95/93 bands and reasons for failures.
- `NEIGHBORHOOD_ROBUSTNESS.md` — 384-point pass shares, Wilson bounds, p90 DD, median/p10 profit, independent seeds, clipping, in-box, count-matched and 0.5r/1.5r.
- `CHRONOLOGICAL_VALIDATION.md` — all five folds, F24 test doors, post-2024 exposed window, 2026-10-30 slice, test-window vs cumulative DD, rank predictiveness and complete fail reasons.
- `POOL_COMPLEMENTARITY_AND_LEDGER.md` — interactions, per-book/subset and Shapley, refused/displaced signals, contribution to DD and trade-sequence variability.
- `EXECUTION_RISK_AND_LIQUIDITY.md` — all gap/slippage/stress results, ILF and EDV, data sparsity, volume participation.
- `BASELINES_AND_PARITY.md` — byte/lot/cent exact comparisons with frozen Study 8 and authoritative engine, all leakage tests and known inherited failures.
- `RECOMMENDATION.md` — **mechanical selection, economic assessment, evidence confidence, no-deployment decision**, compare explicitly to VG #2 and state if no new pool beats it.
- `RUN_COMMANDS.md` — verified exact research and local-runner commands, prerequisites, outputs, and no-rerun instructions for sealed stages.
- `FROZEN_SELECTION.json` plus manifest of selected/unselected candidates, immutable hashes, independent review reports, machine-readable per-configuration/per-epoch/per-lot CSV/JSON, retained point caches and fully reproducible seed derivation.

**Seal and verification:** Use the same write-once stage order and hash chain as Study 8; chain phases protocol → parity → search → qualify → selection → pre-test audit → five tests → test confirmation → final reporting. Every phase records file/data/code hashes, RNG seed label scheme, and gate results. A failed or altered prior sealed stage blocks later stages. A cryptographic hash chain is an integrity aid, **not** a digital signature or proof of independently untouched data. All serious findings must originate in machine-readable records rather than handwritten numbers. Independent methodology review, read-only pre-test audit, and final review should each leave a report in `reviews/`.

**Final answer to the user** should include: seven pools and statuses, validated data dates, exact CPU/wall times and counts, mechanical nominee and user-preferred candidates (if any), training and 2025–2026 profit+DD+neighborhood metrics (median/P10/share and confidence), comparison to VG #2/B1/B5, 2026-10-30 separately, deployment limitations, issues/changes, all runnable commands, Git status, and what should happen next. If the study establishes no materially better stable pool, say so plainly. Do not make unbounded promises or silently postpone essential work.

## 12. Hard prohibitions / decision boundary

**DO NOT:**

- change the eight D1 trading rules, margin-slot engine, interest or execution defaults, optimizer fitness, parameter bounds, perturbation geometry, qualification or test thresholds;
- import earlier optimized phenotypes as search seeds, hand-pick a winner from 2025–2026 data, or rerun failed optimization after inspecting a test outcome;
- edit any sealed Study 8, Study 9 Phase A, B1/B5 or prospective-trading records; rerun Phase A write-once stages; delete caches; force-pass hashes by modifying user files;
- add or replace ETF membership sets outside the **seven approved**; claim the exploratory VG pool was an original Phase A nominee;
- open a post-training strategy-data door before the full selection and independent pre-test audit are sealed;
- call historical perturbation pass percentages probabilities of future risk, call 2025–2026 an untouched holdout, or call 2026-10-30 one session a conclusive prospective study;
- stage, commit, push, merge, open a PR, or place live orders without a separate explicit user instruction.

**Success** is not finding a winner at all costs. Success is a trustworthy completed seven-pool optimization with the same methodological discipline as Study 8, a reproducible comparison against **VG #2 balanced** and the other frozen controls, a clear assessment of the 95% preference, and enough traceable evidence for the user to decide whether to begin prospective research observation or whether the original VG #2 remains the better candidate.
