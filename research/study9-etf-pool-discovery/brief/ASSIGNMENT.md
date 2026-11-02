# Claude Code assignment — Study 9, Phase A: Broad ETF-Pool Discovery (S0–S3)

**Status:** New authorized research assignment. **Do the research and produce the requested reports now.** This assignment covers data refresh, a bounded but broad discovery screen, and actual shared-slot complementarity analysis. **Stop at the human review checkpoint before any full joint-parameter optimization (S4–S6).** The user intends to authorize a substantial second phase after reviewing your evidence; Phase A is not a substitute for that phase.

**User's objective:** Find ETF combinations that may ultimately support **materially higher, economically consistent net profits** than the current D1 pools while retaining broad, stable parameter neighborhoods and acceptable drawdown risk. Profitability matters at least as much as achieving an extremely high neighborhood pass rate once a credible risk floor is satisfied. Do not merely assemble sector-diverse baskets; assess their incremental effect in the actual one-funded-slot allocator.

## 0. Read and reconcile project context before any edits

Read `CLAUDE.md` and all repository instructions in full. Locate and read the existing canonical sources, including (paths may vary; inspect, do not assume):

- `research/study8-archive-audit/FUTURE_ETF_POOL_DISCOVERY_DESIGN.md`, `RECOMMENDATION.md`, `ARCHIVE_INVENTORY.md`, `outputs/etf-inventory.*`, and relevant audit reports;
- Study 8's frozen `PROTOCOL.md`, `RECOMMENDATION.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `CHRONOLOGICAL_VALIDATION.md`, `SEARCH_AND_COMPUTE.md`, `BASELINES_AND_PARITY.md`, `RUN_COMMANDS.md`, `FROZEN_SELECTION.json`, and research configuration registry;
- The Study 7 / Study 8 shared-slot engine, D1 rulebook, optimizer and research-runner adapters;
- Existing 61-ETF standalone, complementarity, duplicate-signal, allocation and historical pool-discovery studies, including their negative findings and limitations;
- The Alpaca SIP minute-data downloader, metadata, adjustment/corporate-action pipeline, partitions, splits, trading calendar and dataset auditing utilities.

Inventory git state (`branch`, `HEAD`, `git status`, remotes) before any changes. Current work is expected to derive from `research/study8-expanded-regime-d1` after the seven-strategy runner and archive audit. Do not overwrite personal/uncommitted changes, especially `config/market-events/*` and unusual untracked files. Do not create a second worktree without a concrete need and an explicit explanation; use a distinct research branch if appropriate and keep the user's regular checkout usable. **No commits, pushes, merges, pull requests, deployment, or changes to live/prospective trading without separate explicit user authorization.** The user has previously authorized such actions on other assignments; that authorization does not carry forward automatically.

The audit design is a *starting point*, not infallible authority. If it conflicts with this brief, explain the deviation before execution in a frozen protocol, and preserve the archived original. Do not silently alter the Study 8 methodology. Run routine local computation, tests, data refresh and research without repeated permission requests; ask only for genuinely missing broker credentials/permissions, unavoidable destructive changes, or material methodological decisions not specified here.

## 1. Non-negotiable research contracts

### 1.1 Engine and economics

Keep **D1 entry, exit, post-exit continuation and all other trading rules unchanged**. Keep the shared-slot behavior unchanged: one fixed funded **$100,000** position at a time; no compounding; one slot; no simultaneous funded lots; losing or refused signals and the shadow-book state follow the authoritative engine; actual first-eligible execution and existing tie/reservation rules; no discretionary priorities or preemption. Use **11% annual simple margin interest** (365-day basis), **5 bps per side** transaction friction and the authoritative gap-aware stop implementation as the base case. Stress costs and fills as in Study 8. Do not sum standalone returns and pretend they are pooled performance.

For full Phase B, every selected ETF book's **eight D1 parameters will be jointly optimized from scratch** on its pool's actual executed shared-slot replay. **Do not reuse or seed from previously optimized pooled phenotypes**, including Study 5–8 phenotypes. Incumbents are immutable **controls**, not optimization seeds. Phase A may run a fixed, prespecified *generic nonoptimized* grid or broad deterministic design of D1 vectors as a cheap measurement instrument; document that this is screening, **not** a full optimization or a final fitness comparison. Any old phenotype used as a comparator must be visibly labeled and kept out of candidate generation.

### 1.2 Preserve Study 8's fitness function **exactly**, for future Phase B

**Do not revise any objective, penalty, gating constraint, perturbation radius, strategy parameter box, fill rule, or eligibility definition in Study 8.** In Phase B the optimization will retain the four objectives:

1. Maximize center net profit/year.
2. Maximize neighborhood median net profit/year.
3. Maximize neighborhood p10 net profit/year.
4. Minimize neighborhood p90 **minute** drawdown.

Study 8's profit-role ranking uses `robustProfit = 0.5 * neighborhoodMedianNet + 0.5 * neighborhoodP10Net` (annualized where appropriate). Retain its risk, economics, trade/episode activity, per-book participation, cost/fill stress, best-year/top-lot concentration and qualification constraints. Study 8 required center minute DD **strictly less than $35,000**, neighborhood DD pass share ≥90% and neighborhood p90 DD < $35,000. Do not silently change any of that.

**User's research preference, applied after the unchanged fitness computation:** prefer **95–100%** neighborhood pass share; consider **93–95% only with an explicitly compelling advantage in neighborhood median and p10 net, center net, historical validation, drawdown margin and execution stresses**; <93% is not a preferred research nominee. A 95% measurement is not a 95% future-safety probability. Do not treat 99–100% as inherently preferable to 95% if the latter earns materially more with sound risk and validation. At cheap 16-point screens, **do not assign 93/95% classifications**: insufficient resolution. The numerical 95% preference is a later high-precision assessment filter, **not** a modification to the original Study 8 fitness or its 90% feasibility gate.

Only propose a fitness modification **in a separate report**, with evidence, pros/cons and effects; do not implement one. The user requires an explicit discussion before Claude changes fitness rules.

### 1.3 Candidate universe and families

Start with the **61 canonical ETF symbols** documented in the repository's existing universe registry (there may be 64 files, of which 61 were canonical). Re-audit coverage and eligibility; do not assume all 61 remain usable. Explain any exclusions transparently, do not silently substitute tickers, and do not add a blanket constraint requiring either VGT or GDX.

Test combinations with **2, 3, 4 or 5 ETFs** initially. Explicitly inventory plausible **6+ book groups** in a report-only expansion queue, with evidence for why they might merit later study; do not optimize them in Phase A. For each size, allocate equal *planned proposal/replay budgets* to these four families, with deterministic and documented handling where a family has fewer possible unique groups:

- **V-only anchor:** includes VGT, excludes GDX (e.g., VGT + XLF + IWM).
- **G-only anchor:** includes GDX, excludes VGT.
- **Both:** includes VGT and GDX.
- **Neither:** contains neither VGT nor GDX.

Avoid duplicate pools and treat nearly identical entry-timing exposures as one *opportunity source* for diversification/budgeting, using the repository's established overlap evidence, but avoid over-pruning: high correlation alone is not an automatic rejection if the actual incremental replay or an alternative D1 vector reveals distinct funded opportunities. Preserve a documented exploratory quota for nonobvious or borderline combinations.

Reference benchmarks, at identical accounting conventions and time windows: **Study 8 VG #2 balanced** (`s8-vg-balanced`, user's current preferred candidate), Study 8 VG #1 profit, frozen B1 VGT `primary`, frozen B5, and relevant smaller-subset controls. Study 8 #2's status as the user's preference must **not** bias the proposals toward its parameters or ETF selection. Keep incumbent benchmark configurations frozen.

### 1.4 Temporal partitions and exposure

- **Training / selection / discovery and any Phase B optimization:** strictly no later than **2024-12-31**, starting 2016-01-04, with Study 8 arming and warm-up conventions. A data file physically containing later bars is not permission to expose those bars to a training process.
- **2025-01-02 through 2026-10-29:** previously inspected, **retrospective chronological evaluation only**. Do not use its profits, risks, event-specific outcomes or rankings to choose ETFs, pools or parameters, enlarge a budget, or revise screening. A later gate may veto a frozen candidate without reranking it.
- **2026-10-30 through latest completed session**, refreshed in S0: preserve as a **separate later evaluation slice**. Whether it counts as genuinely uninspected historical evidence depends on prior project exposure and whether candidate definitions/rules were locked before inspecting it. **Do not call already elapsed bars prospective just because the study hasn't read them.** True prospective observation begins after configurations and all decision rules are frozen and subsequent trading sessions occur.
- For later evaluations, replay **continuously from 2016**; carry open lots, accrued interest, drawdown high-water marks, continuation and shadow-book state through the boundaries without resets. Report **incremental period P&L, test-window peak-to-trough minute DD, and cumulative whole-run DD** separately. Do not conflate high correlation of cumulative train/test robustness with independent incremental test risk.
- In **Phase A**, do not run/test/rank newly proposed pools on **any post-2024 period**. Do not open the 2025–latest new-candidate evaluation door. Data-refresh integrity auditing may read end-date/coverage metadata and completeness, but must not compute or expose strategy performance after 2024. For historical benchmark parity, use pre-existing sealed reference numbers rather than recomputing post-2024 results in Phase A.

## 2. Work structure and research freeze

Create a separate namespaced `research/study9-etf-pool-discovery/` (adjust to project conventions), including a prespecified `PROTOCOL.md`, `DATA_MANIFEST.md`, `AMENDMENTS.md`, `README.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, code/configs, and structured CSV/JSON tables. A naming variation is acceptable if consistently documented. Pin source code, engine, universe definitions, D1 rulebook, 2016–2024 historical data snapshot and derived trading calendars/adjustment manifests with SHA-256, and record all seeds, search budgets, attempted pools, rejected pools, thresholds, and dates.

Before S1 makes economic measurements, freeze the candidate-generation and analysis plan: each family's budget, fixed screening vector designs, sampling streams, grouping/duplicate rules, promotion/coverage rules, historical folds, training-only selection metrics, contribution scoring, risk safeguards, number of final proposals, and confidence labels. Use a tamper-evident local record with stage gates and log deviations. This is a new study namespace; **never reopen, rewrite or invalidate Study 8's sealed doors, hashes or selection**, and never re-run Study 8's optimization. Preserve and use existing reliable engine code, with parity checks; no alternative backtest engine without demonstrated cent/lot parity.

Provide resumable, deterministic computation with isolated cache directories and provenance. The Study 8 ~14 GB cache is gone; **do not recreate that entire cache**. This study may create fresh, properly documented caches for only its own deterministic screening/replay work, preserving intermediate data needed for audit. Do not discard these caches without explicit request or a written retention policy. All generated outputs must be non-destructive, and no market data should leak into Git inadvertently.

## 3. S0 — Refresh and validate all ETF minute data (do this first)

Use the repository's **existing Alpaca SIP** incremental download and adjustment pipeline; inspect it before invoking it, and reuse rate-limit/retry/checkpoint mechanisms. Respect account entitlement and API access; do not print tokens or credentials in logs. Do not use external unverified prices as a silent substitute. If broker credentials or access genuinely fail, finish the local-data inventory and explain the blocker, rather than fabricate downloaded data.

1. Inventory 64 available files versus the canonical 61; verify identity, metadata, first/last sessions, hashes, size, frequency, timezone, regular/early-close trading calendar and historical availability.
2. **Download/append through the latest complete available US market session for every eligible ETF.** Do not include today's incomplete trading session. Support independent per-symbol retry/resume, atomic finalization, consistency of `data/<SYMBOL>/data.csv` and metadata, and fail-closed handling of partial or corrupted updates. Avoid redownloading all 2016+ bars unless genuinely necessary.
3. **Preserve the original Study 8 vintage** and exact historical content/hashes for benchmark reproducibility. If the repository's canonical `data/` files must be appended, maintain an immutable prior-vintage snapshot or equivalent byte-identical restoration/provenance path before writing, and verify that old benchmark periods can be reproduced. Never edit the original historical prefix merely to attach new bars. If a historical correction is necessary, quarantine and version it separately rather than overwriting old values silently.
4. Check session coverage and missing/sparse bars (notably previously flagged VOOG, EDV, IYT, VPU, KIE, QUAL, IGV), duplicate/out-of-order minutes, regular vs extended-hours boundaries, DST, early closes, invalid OHLCV, suspicious stale prices, zero/near-zero volume behavior, split/reverse-split histories and adjusted-price continuity. Distinguish legitimately illiquid ETFs from data corruption. **No fabricated forward-fill trades or implied liquidity.** Report whether each ETF is genuinely comparable in the same joint replay window.
5. Reconcile all ETFs to a common eligible historical calendar and latest *complete common session* for evaluations; retain per-symbol coverage and explicitly explain exclusions or session truncation. Do not require all symbols to be equally liquid; instead quantify confidence and exclude untradeable/incomplete bars from executable signals according to existing engine rules.
6. Freeze the resulting **versioned data-vintage manifest** with per-file SHA-256, prior-vintage hashes, new-bar counts, update intervals, session quality flags, split and distribution manifests, and exact command/version used. Use only the ≤2024-12-31 projection for training computations. Secure post-2024 partitions from accidental access in optimizer code, logs and caches.
7. If data freshness is limited by subscription/provider availability, document actual latest common complete session without assuming a date.

**Deliverable S0:** `DATA_AND_UNIVERSE_AUDIT.md`, per-symbol CSV/JSON, immutable data-vintage manifest, explicit eligibility decisions and leakage tests. Do not modify `config/market-events/*` uncommitted user files; read them safely if necessary, record divergence, and preserve frozen benchmark parity.

## 4. S1 — Broad, low-cost standalone opportunity screening (training only)

- Use the original canonical universe, with documented eligibility and duplication treatment; preserve a diversity-stratified audit of excluded/ineligible names.
- Screen using a **small fixed, predeclared generic D1 parameter design** within Study 8's registered eight-parameter ranges, capped at **64 standalone screening vectors per ETF** (or a tighter justified cap fixed before results). Do not mine previously optimized phenotype registries to seed candidate vectors. Include broad parameter coverage rather than optimizing each ETF to its maximum from the outset. Reuse valid low-cost engine traces if existing codes permit, not exposed performance data.
- Compute after-interest/cost center net and profit per year, lots/episodes, capital occupancy, minute/daily DD, event and best-year/top-lot concentration, preliminary neighborhood median/p10 and 16-/64-point uncertainty diagnostics, using training years only. Do not use 16-point percentages as proof of 95% robustness.
- Rank *opportunity sources*, not ticker counts. Preserve multiple potential sources across asset classes and high-volatility episodes. Show whether an ETF generates economically distinct events beyond the incumbent VGT and GDX paths.
- Run predetermined expanding training folds where affordable, with time-block and event-family summaries restricted to pre-2025 history; avoid mistaking 2020 opportunities for recurring, independent opportunity frequency. Include a report of materially weak but distinct ETFs that deserve exploration for joint synergies.

**Deliverable S1:** full per-symbol measurements and screening funnels; top opportunities **and** a protected diversity/exploration list. Report candidate proposals before stronger pruning.

## 5. S2 — Signal timing, collision and complementary opportunities (training only)

- Calculate entry decision overlap and timing offsets, distinct economic episode counts, regime/sector concentration, return and D1 equity-curve correlations, cross-ETF duplicate evidence, strategy occupancy, and idle-slot opportunity. Compare against **all four family anchor policies**, not just B5. Because there is no native anchor for the "neither" family, use **multiple prespecified training-only generic seed anchors**, or a symmetric candidate-pair method, to avoid smuggling VGT/GDX into that family.
- Explicitly report capital-slot contention: new eligible trades, accepted trades, blocked trades, displacement of incumbent trades, and changes in duration/financing/risk. Count market-wide shock episodes so correlated ETFs do not masquerade as many independent opportunities.
- Diagnose opportunity overlap under more than one **generic** D1 vector (bounded, predefined), since one arbitrary vector can miss real complementarity. Do not alter the D1 rules or re-optimize at this stage.
- Allocate comparable screening effort to all four family × size strata. Predeclare rules for deriving **up to 12 candidate ETFs per family** for S3, but also preserve **at least 20–25% of the proposal/replay budget for exploratory or counterintuitive candidates** that might become valuable only after joint optimization. Document if this quota cannot be filled because the universe or data is invalid.
- Do not eliminate ETFs exclusively because marginal trades are poor against *frozen B5*, or because center correlation is high. Make duplicate-opportunity decisions on grounded event/slot evidence.

**Deliverable S2:** pairwise overlap/collision matrices, event-family attributions, four-family opportunity map, and transparent acceptance/exclusion/exploration tables.

## 6. S3 — Actual marginal shared-slot replay, bounded pool discovery (training only)

- Construct and replay pooled combinations with **2–5 ETF books**, maintaining all four families, fair computational coverage and a hard, prespecified proposal budget. Use the authoritative **single-slot** allocator (not summed standalone results). Choose the candidate anchors and proposal schedule *before* viewing performance. A balanced predeclared program may use greedy additions, pairwise swaps, bounded beam search and random/diversity-stratified exploratory proposals. Compare multiple independent, generic vector assignments for shortlisted groupings, but do not perform full joint-parameter optimization.
- Within each family × pool size, preserve up to **three primary candidates** (up to 48 total across four families and four sizes) in a frozen, training-only nomination table. Reserve named exploration slots within these limits (or add an explicitly separate, fixed small exploratory queue) to avoid selection strictly by apparent fixed-vector marginal profit. **Do not assume a bad fixed-parameter marginal contribution proves that joint optimization will fail.**
- For each proposal, compute: center net/yr, neighborhood median and p10 net/yr (with precision and uncertainty noted), p90 minute DD, share below $35k only with interpretable sampling precision, minute/daily DD, trades and episodes per book, equity occupancy, interest, friction, refused and displaced signals, incremental accepted lots, effect of removing each book, and any concentration in one year or market event. Include lower-precision initial screens and higher-precision **training-only** checks for the finalists, with independent seed families and enough samples to avoid 16-point claims of 95% robustness.
- Assess adding/removing a book by rerunning the *actual allocator*. For final selected 2–5 book pools, enumerate the **≤32 exact subsets** for contribution attribution when computationally reasonable, including the empty subset as a zero-P&L reference; label Shapley-style contributions as *conditional on the fixed vector choices*, not intrinsic ETF alpha. Distinguish standalone trade quality from funded-slot interaction profit and displacement costs.
- Compare each pool against its own size, family, exposure cluster and frozen comparator at *identical* accounting conventions and training periods. Show meaningful incremental economic improvement, not only improvement over a weak anchor. Every new pool must be considered against VG #2 balanced, VG #1, B1 and B5 under compatible full-history training-only metrics, noting incumbent hindsight/exposure and historic data-vintage differences. Do **not** use their post-2024 numbers for promotion.
- Report robustness at **95% preferred**, **93–95% conditional**, **90–93% diagnostic**, but **do not enforce high-precision threshold classification where screening precision is insufficient**. Exclude obviously dangerous center DD above $35k from core finalists, while retaining exceptional borderline groups in a separate explicitly non-nominated exploratory queue where justified. Final Study 8 confirmation and qualification tests are Phase B, not shortcuts to conclude Phase A success.
- Quantify search multiplicity and false discovery risk; use deterministic seeds and at least two independent time-based training diagnostics. Prepare a strong *negative result* if no new economically complementary combinations emerge rather than fill the quota with weak pools.

**Deliverable S3:** per-size/family proposal ledger and complete tested/rejected counts; actual shared-slot P&L and drawdowns; marginal contribution and leave-one-out/subset tables; ≤48 primary prospective joint-optimization candidate pools; protected exploratory queue; and a **recommended ≤8-pool first batch** for full joint optimization. Show at least one alternate set that changes composition, so the user can approve a different diversity/profit trade-off without a new search.

## 7. Review checkpoint: STOP before expensive full optimization

At the end of S0–S3 **stop**. Do not run the Study 8 NSGA-II optimizer or any equivalent large joint parameter search, do not perform S4–S6, do not read 2025+ strategy results for new pools, do not claim a candidate has passed the full Study 8 384-point gate. The user and ChatGPT will inspect S0–S3 before selecting the final optimization workload.

Produce a concrete **Phase B proposal**, but do not execute it:

- A prioritized list of **≤8 pools** to jointly optimize from scratch, plus a reserve of exploratory alternatives, covering the four families if supported by evidence. Any missing family must be explained.
- The expected cost and compute budget per pool (16, 24, 32 or 40 D), seed families and deterministic restart plan. For reference, Study 8's 30 track×fold searches consumed ~55 CPU-hours in aggregate; calculate a new estimate from the actual machine and S0–S3 profiling, not wishful assumptions. Allow substantial local compute once approved.
- Study 8's **unchanged** four-objective fitness and qualification, neighborhood confirmation, full-dimensional and count-matched diagnostics, stress tests, multiplicity/PBO, and expanding-window tests. **Fresh per-pool joint optimization from scratch**, no previously optimized pool phenotypes used as seeds.
- Separate, predefined 2016–2024 optimization, exposed 2025–2026-10-29 comparison, and post-2026-10-29 refreshed-data evaluation slice, with explicit data doors, first/last complete sessions, continuous state carry-over and no post-test tuning/re-ranking. Indicate that true live prospective proof only accrues after freeze, in subsequent sessions.
- A plan for **data-vintage comparability**, ensuring any differences from Study 8's frozen data are disclosed; changes in price history must not be mistaken for optimizer improvements.
- Full-run P&L and per-window incremental P&L, minute/daily DD, test-window incremental DD, median and p10 profitability, 95% preference with 93–95% exception, per-book contribution, liquidity/gaps and slot contention.
- Explicit experimental decision gates: the user should be able to approve batch size, ETF families, the exploration quota and the unmodified fitness function, or to stop if discovery yields no credible incremental economic opportunity.

## 8. Quality checks and mandatory final report

1. Engineering parity against authoritative replay for training-only standalone and multi-book cases, at multiple costs/stresses; cent/lot-level reconciliation; lookahead tests at 2024 cutoff, e.g., deliberately append future price bars and prove training results/hash keys are unchanged. Do not alter existing sealed studies to force parity.
2. Independent read-only methodology/code review before the Phase A protocol is frozen, plus a fresh final read-only audit (separate agent/context if your environment permits). Record problems and fixes, and whether any post-freeze amendment occurred. Avoid using test-window results for this review.
3. Reproducibility: commands, code/dataset hashes, deterministic run/stop/resume, exact proposal list and counts, stored caches, point budgets, failure logs, incomplete data and hard limitations. If a substage cannot finish, report honestly what was done and why; do not fabricate completion or secretly broaden the scope.
4. Report five concrete outputs: `DATA_AND_UNIVERSE_AUDIT.md`, `STANDALONE_SCREEN.md`, `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md`, `POOL_MARGINAL_CONTRIBUTION.md`, `PHASE_B_OPTIMIZATION_PROPOSAL.md`, plus `RECOMMENDATION.md`, `RUN_COMMANDS.md`, and machine-readable CSV/JSON result tables.
5. The executive summary must state whether credible new pool families were found, what training-side economic/risk evidence supports each, where fixed-vector limitations make the ranking uncertain, and exactly what still requires full joint optimization. Compare against historical frozen controls without implying an independent validation result. Say plainly if the negative findings from earlier 61-ETF studies still dominate.
6. Do not deploy or call this a live-ready strategy. No margin use, orders or broker trades.
7. At completion, provide a concise user-facing summary: dataset freshness, valid eligible ETF count, how many combinations screened, best per-family candidate groups, why they appear complementary, expected optimization cost, notable risks, and the exact files/commands to inspect. End with an explicit **request for the user's approval to proceed to Phase B full joint optimization**. Do **not** commit/push without the user's separate authorization as required by `CLAUDE.md`.

### Success criterion

The assignment succeeds if it produces an **auditable, deterministic, causally valid and economically meaningful shortlist of ETF pools (or a well-supported negative result)** while preserving the original Study 8 rules, frozen historical benchmarks and truly post-training data boundaries. Full joint optimization is the deliberately separate next assignment, **not** something you may quietly skip forever or launch before the user's review.
