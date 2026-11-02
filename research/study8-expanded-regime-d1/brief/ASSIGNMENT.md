# Claude Code research assignment — Study 8: Expanded-regime stability-first D1 reoptimization (2016–2024 train, 2025–2026 retrospective evaluation)

## Mission and decision standard

Conduct a **new, complete, reproducible, retrospective research study** of the existing D1 trading architecture, optimizing on all available historical data **through 2024-12-31**, and evaluating locked research nominees **once** on **2025-01-02 through 2026-10-29** (or the verified last common session if different, recorded before any search). The purpose is to test whether including the COVID crash, the 2022 bear market, the 2023 recovery and 2024 materially improves the **temporal durability of profitable parameter neighborhoods** over Study 7's shorter training windows.

This is *not* an instruction to deploy, make trades, overwrite registered phenotypes, or modify any frozen strategy. Research may freely optimize NEW copies of the parameters of the frozen architectures. Preserve every original configuration and the existing prospective B4/B5 system byte-for-byte.

**Core question:** Can GDX alone, VGT alone, or a jointly optimized two-, three-, four-, or five-ETF D1 shared-slot pool earn economically substantial net profits with acceptable minute drawdowns and broad, robust parameter neighborhoods, and retain acceptable results in 2025–2026 after selection on 2016–2024?

A defensible **no qualifying candidate** is an acceptable final result. Do not force a nomination. Prefer **high profit with strong robustness** over nearly inactive or merely stable, low-yield phenotypes. Profit, neighborhood economics, downside risk, trading breadth, and chronological persistence must all matter.

## 1. Tracks: FULL reoptimization of all six architectures

Run each as a separate, properly budgeted search track. For every pooled track, **optimize all eight D1 parameters of every member jointly against actual executed pooled results**, not a sum of standalone results.

| Track | Composition | Free D1 parameters | Requirement |
|---|---|---:|---|
| G | GDX standalone | 8 | Full optimization; not only diagnostic |
| V | VGT standalone | 8 | Full optimization, even though Study 7's optional VC trigger did not fire |
| VG | VGT + GDX | 16 | Full joint optimization |
| VXR | VGT + XBI + XRT | 24 | Full joint optimization |
| VXRG | VGT + XBI + XRT + GDX | 32 | Full joint optimization |
| VXRKG / B5-reoptimized | VGT + XBI + XRT + KRE + GDX | 40 | Full joint optimization; KRE and all other books independently adjustable within the shared-slot search |

**No duplicate tracks.** “VGT standalone” and “frozen B1 / VGT D1 standalone” are the same architecture but represent *new challengers versus an immutable existing control*. Likewise, “frozen B5” is the immutable control of the five-book architecture, not a separate eighth optimizer. Study 7's #1 VG profit, #2 VG robust, #5 VG balanced, and #6 VXR profit are **existing research controls**, not the same thing as the new Study 8 search; do not silently reseed the new search from them if their parameters used any information later than that fold's training cutoff.

Every strategy uses D1 rules unchanged. Only the existing eight D1 parameters may vary; no new indicators, entry/exit logic, allocation priority, preemption, position sizing, leverage, execution trick, or market-specific rule may be introduced. Use Study 7's exact parameter grids and allowable boxes unless a verifiable implementation inconsistency requires a pre-search documented correction.

### Immutable comparators

- Registered B1: VGT `primary`, standalone.
- Registered B5: all five frozen D1 books, original one-slot policy.
- Frozen VG, VXR and VXRG subsets using B5's registered constituent phenotypes.
- Registered standalone GDX `portfolioAware`; Study 5 GDX near-miss controls, if correctly comparable and provenance-verifiable.
- Study 7's completed, sealed research candidates (#1, #2, #5 VG; #6 VXR; and its nominated GDX standalone phenotypes) **as retrospective reference only**. Their existing results must not be relabelled out-of-sample. If used in any direct comparison on 2025–2026, disclose that they were selected with 2022–2023 and exposed later years in the research program; ensure they cannot leak into Study 8's training-independent candidate selection.

Ensure exact apples-to-apples run settings when comparing to baselines (the ordinary standalone `npm run app` path may use **0 bps**, unlike the Study 7 fixed pool's **5 bps per side**).

## 2. Start with a forensic preflight and a frozen protocol

### Latest repository state — completed local runners (read this before branch operations)

The user has **already completed** the separate Study 7 local-runner assignment. At the start of Study 8, inspect and verify its actual checkout state; the following is the reported result, not permission to assume every file is committed:

- Current checkout: `tools/study7-local-runners`, created from `research/study7-stability-first-d1` at `544c268`. **The runner work is uncommitted**: `src/study7-runners/`, two research-only configurations in `config/research-pools/study7-local-runners/`, and a `study7-run` script added to `package.json`. The user's `config/market-events/distributions.*` edits and untracked raw files remain untouched.
- Existing verified runner: `npm run study7-run -- list`; `npm run study7-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]`; `npm run study7-run -- compare --all`. Baseline: fixed $100,000 single slot, 11% simple interest, 5 bps per side, last available session 2026-10-29. Outputs under `evaluations/study7-runs/` include full trade ledgers, CSV/JSON signals and daily/monthly/yearly summaries, with output isolation and provenance.
- Eleven standard aliases: `vg-profit`, `vg-robust`, `vg-balanced`, `vxr-profit`, `vgt-primary`, `gdx-profit`, `gdx-balanced`, `gdx-robust`, `vg-frozen`, `gdx-portfolio-aware`, `b5-frozen`; optional `gdx-study5-nearmiss1`. The runner reportedly reproduced the Study 7 final record to the cent for all aliases on the default dataset and passed eight new tests, static checks and inherited Study 7/pools checks except pre-existing skips. **Verify rather than trusting its output without checking.**
- Example exact research mapping: `vg-profit` = `S7-VG-L-19`; `vg-robust` = `S7-VG-L-21`; `vg-balanced` = `S7-VG-L-20`; `vxr-profit` = `S7-VXR-L-31`. Read the actual selection manifest for all other names and parameters.

**Branch and dirty-worktree safety:** Inspect `git status`, `git diff`, untracked paths and `CLAUDE.md` before any checkout, worktree creation, staging, or cleanup. Preserve the uncommitted runner implementation **as-is** and preserve every other user change. Prefer a new isolated Study 8 worktree from the last verified Study 7 commit when feasible, while leaving the runner checkout untouched; if the large untracked market-data files are unavailable in a new worktree, establish a safe, verified **read-only data access** path without copying or altering canonical data. Alternatively, create the Study 8 branch in the existing checkout only if Git operations safely retain the entire dirty state and no files are overwritten. Explicitly record which approach was used. Never discard, stash, auto-commit, stage, reset, clean or relocate another task's files merely to make the study branch look clean.

**Reuse policy:** Use the unchanged authoritative pools engine and existing runner where technically possible. Prefer extending the **new Study 8 research namespace** with a slim adapter/alias registry rather than copying the Study 7 runner or forking its trading logic. If the uncommitted runner is not available inside the study worktree, keep the study executable through the existing verified N-book research CLI and document exact commands; do not depend on uncommitted files in another worktree or silently reimplement a redundant runner. Study 8 must still export usable, verified trade ledgers and run commands for its own candidates.

**Git authorization is explicit:** The current repository's `CLAUDE.md` reportedly requires a separate explicit user request before **commits or pushes**. This Study 8 assignment does **not** grant that request. Do all required implementation, research, tests, independent review, reporting and complete runnable outputs locally, without asking for routine approval. Do **not commit, push, merge, open a PR, or change the existing runner branch**. At the end, report the new Study 8 files and ask separately whether the user wishes to commit/push them. This Git restriction must not be allowed to defeat the research protocol: use cryptographic digests, write-once manifests, protected stage ordering, and a verified hash chain as the **study freeze**, even though the records are uncommitted. For each phase record its SHA-256 and verify it before advancing; fail closed on any mismatch. If repository conventions strictly require Git commits to seal, implement an equivalent independently verifiable local seal rather than pausing the entire job for permission. Report that a local hash-seal is not a remote/commit-backed immutable record.

Inspect the current repository/branch, `package.json`, Study 7's entire `PROTOCOL.md`, `RECOMMENDATION.md`, `OPTIMIZATION_AND_COMPUTE.md`, `WALK_FORWARD_AND_VALIDATION.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `EXECUTION_AND_INTEGRITY.md`, `AMENDMENTS.md`, and available source/CLI/records. Reuse working implementations rather than gratuitously rewriting them. Locate Study 7's source under `src/study7-stability-first-d1/` and the earlier causal N-book engine, trace cache, replay, perturbation, CSCV/PBO and event-attribution utilities.

Create a **new** isolated research branch or worktree (suggested `research/study8-expanded-regime-d1`) and study namespace (`research/study8-expanded-regime-d1/`, `src/study8-expanded-regime-d1/`, `config/research-pools/study8-expanded-regime-d1/`). Retain users' uncommitted changes. Record exact Git base, data hashes, split/distribution files and source code digests. Never overwrite a previous sealed study or its records.

Before searching or seeing *any* new Study 8 optimization, validation, or nominee statistics, write and seal a detailed, executable **study-specific protocol**, including:

1. Research questions, hypotheses and the six tracks; immutable controls and unchanged D1/shared-slot contracts.
2. Exact training and test boundaries, historical folds, access restrictions, acceptance criteria, stress scenarios, perturbation distributions, sample counts, seeds, concentration/activity/economic gates, candidate ranking and no-nomination logic.
3. Per-track fair search budgets, normalization for 8/16/24/32/40 dimensions, the multi-fidelity ladder, local refinement, compute extensions and deterministic saturation/stop rules.
4. The one-time 2025–2026 evaluation rule, including what constitutes a retrospective pass, failure or ambiguous result. Predeclare the primary ranking from training data alone; test outcomes may **veto**, not reorder or rescue nominees.
5. Independent reviewer/methodology audit of the proposed protocol and code, with critical/major findings resolved **before** freezing and running the decisive study.
6. Data-access doors and proof that no search process or its caches can ingest bars after its own training cutoff.
7. Paths, commands, record hashes, checkpoints, source tests, execution/stress parity and reproducible reports.

Record pre-freeze pilots **only for timing, engineering verification and selecting precision budgets**, and disclose if any pilot economic outcome was viewed or affected a design choice. Do not adapt fitness gates to make existing configurations pass. If an unavoidable correction is needed after freezing, use an append-only, timestamped amendment with exposure and impact; never silently mutate the protocol.

## 3. Chronology: preserve Study 7's diagnostics, add expanded training

### PRIMARY new experiment (the user's central request)

- **Training / optimization:** historical data 2016-01-04 through **2024-12-31**. Maintain Study 7's D1 arming start **2017-06-15** and warm-up; account for the complete historical state.
- **Locked later-period evaluation:** **2025-01-02 through 2026-10-29**, once after the full shortlist, research-only nominee IDs, role assignments, risk gates and all ranking/acceptance rules are **sealed in hash-verified write-once records**. Do not require a Git commit to satisfy this gate when the repository prohibits unapproved commits.
- This is a **retrospective chronological test on previously inspected market history**, *not* an untouched or statistically independent holdout. Explicitly distinguish an algorithmically closed test door from previously unknown market information.
- Carry positions, high-water marks, pending order/reservation state, post-loss entry restrictions, shadow-book state, accumulated interest and mark-to-market accounting **continuously across December 2024**. DO NOT liquidate or reset on Jan 1, 2025. A continuous causal replay through the test end is required; attribute test-period results by differences in marked P&L at period boundaries.
- Report **2025**, **2026 YTD through 2026-10-29**, and their combined period separately; 2026 is a **partial year** and must not be silently excluded from concentration/leave-one-year-out analyses. Test-period profits, drawdowns, episode counts and neighbor median/p10 must be reported, not merely whole-history aggregates dominated by training gains.

### Additional expanding-window diagnostics

Repeat a **procedure-level** chronological test using the same optimizer and selection machinery, with training ending:

- 2019-12-31, evaluation 2020–2021 (Study 7 F19 analogue);
- 2020-12-31, evaluation 2021–2022 (F20 analogue);
- 2021-12-31, evaluation 2022–2023 (M analogue: essential stress test);
- 2023-12-29, evaluation calendar 2024 (new intermediate fold);
- 2024-12-31, evaluation 2025–2026 (PRIMARY).

Each fold's optimizer must be *trained and selected only on data available at its fold cutoff*, with fresh fold identities and isolated caches. Each fold has its own candidate shortlist, not one final set replayed backward. No earlier fold's later-period outcomes may feed that fold's parameter selection. Report the fold-by-fold qualification rates, decade/regime differences and whether broader training actually improves persistence. These are **retrospective procedural diagnostics**, not independent repeated trials. If running older folds creates a conflict with the primary test's one-time embargo, run all searches and freeze all shortlists **before opening any evaluation window**, then evaluate them in a documented order. This also prevents one failed fold from triggering post-hoc changes to another fold.

**Critical anti-leakage rule:** The new 2025–2026 evaluation never changes the parameter bounds, fitness, folds, seeds, activity floors, thresholds, search effort, selection order, or which candidate is preferred. There is no “failed validation → reoptimize and recheck the same years” loop. A test failure stays a failure. New research after the test would require a new study, and the studied years would be marked exposed.

## 4. Same Study 7 engine and accounting

Use and independently verify Study 7's established causal conventions:

- One **fixed $100,000** shared margin-funded slot; no compounding and no simultaneous funded positions; an ETF's independent shadow book continues its virtual state even when a signal cannot be funded.
- Fund the first executable eligible signal; use the unchanged same-minute tie rule, reservations and no preemption.
- **11% simple annual margin interest** on borrowed capital; baseline **5 basis points per side**; stops fill under the same original assumptions including gapped-open handling. Financing and friction must influence strategy state where they do today, not merely post-process P&L.
- Record realized and unrealized P&L separately, max **minute-sampled** and daily-sampled mark-to-market DD, time of drawdown and trade-level contribution. Risk ceiling: **strictly below $35,000 minute DD per $100,000**. This is a backtest screening rule, **not** an enforceable live stop-loss guarantee.
- Compute fully executable shared-pool results and refused signals, not sums of constituent standalone profits.
- Preserve 2016-01-04 initial accounting, 2017-06-15 arming and the full historical warm-up rules.

Baseline execution stress designs should match Study 7: 0/2/5/10/20 bps per-side friction; interest 8/11/14%; stop-fill next-open alternative; +10/+25 bps slippage (where relevant); later arming-date sensitivities. State which stresses are gating and which are diagnostic. Check fill assumptions and gap risk rather than asserting they approximate live Vanguard execution exactly.

## 5. Neighborhood perturbation instrument: reuse Study 7, do not reinvent

Use Study 7's **N1 joint clipped Latin hypercube** and original radii on every book:

- X target drawdown: ±1.0 percentage point;
- Y trailing buy: ±0.2 percentage point;
- trailing stop: ±1.0 percentage point;
- maximum hold: ±2 calendar days;
- L lookback: ±10 sessions;
- buffered-loss setting: ±1.0 percentage point;
- continuation pullback P: ±1.0 percentage point;
- continuation window W: ±20 sessions.

Use Study 7's exact grids, quantization, clipping/in-box behavior, deduplication and deterministic seeded samples. **Full-dimensional joint perturbation** is the decisive portfolio gate. Include:

- At least three independent **128-point confirmation** families (approximately 384 unique neighbors); report each family, pooled results and one-sided Wilson lower bounds;
- independently reserved perturbation seeds for search/rung 1, rung 2, rung 3, refinement, selection, confirmation, and final evaluation;
- **in-box** independent samples for boundary-adjacent candidates;
- **0.5× and 1.5× radius**, **dimension-matched k=8** (and k=16 for wider pools), **norm-matched sqrt(8/d)** and **one-book-at-a-time** designs;
- center net, neighbor median/p10 net, neighbor p90 DD, share with DD under $35k, neighbor profit consistency, center/median gap, trades/episodes per neighbor, and p90/median changes across historical regimes.

Do not mistake a parameter-neighborhood pass percentage for a probability of future market safety. A 40-D pool has greater simultaneous perturbation opportunity than an 8-D standalone; report dimension-matched views alongside full-dimensional decisive gates. Quantify parameter-bound clipping. If seeds/radii/design are altered for technical reasons, document the divergence before decisive runs, **do not claim exact Study 7 comparability**.

## 6. Fitness: robust PROFIT, not stability through inactivity

Retain Study 7's **constrained Pareto** fitness from the first serious promotion stage:

1. MAX center net profit **per training year**;
2. MAX neighborhood **median** net profit per training year;
3. MAX neighborhood **p10** net profit per training year;
4. MIN neighborhood **p90 minute DD**;
5. Require the historical neighborhood share below $35k to meet the study gate; do not substitute a vague weighted score.

Retain Study 7's center DD, sample pass rate ≥90%, p90 DD < $35k, minimum economically meaningful net/yr and positive p10, funded-trade/episode/year breadth, per-book participation, net per occupied capital-year, top-trade concentration, best-year concentration and ex-best-year profitability requirements. Study 7's defaults (e.g. median net ≥$10k/year, p10 >0, ≥$11k per occupied $100k-year, top lot ≤25% of center net, best year ≤75%, ex-best-year economy ≥$5k/year, 1.5 lots and 0.5 episodes per year) are the starting rulebook. Prefer **retaining them literally** for comparability; any mathematically necessary duration scaling must be specified before optimization and disclosed alongside literal Study 7 results.

A strategy that barely trades is **not** automatically robust in the relevant sense; a strategy that takes many unproductive trades is not better either. Count independent trade episodes, economic yield per occupied capital year, losses during unfavorable regimes and meaningful profit outside the single best event. Preserve diversity across profitable regions rather than retaining only the top-center-profit configurations. Preserve profit, robustness and balanced roles; include additional Pareto candidates when they are genuinely behaviorally distinct, subject to a prespecified cap.

**Profit is important:** If two candidates pass the full robustness and economic gates, favor the more profitable one on the training-defined tradeoff. Do not choose a perfectly stable low-profit configuration over a highly stable strong-profit configuration merely to maximize neighborhood pass rate from 99% to 100%.

## 7. Search schedule, compute budgets, and genuine value of extra compute

Use Study 7's machinery: Sobol/per-book screens; joint Latin-hypercube coverage for >16 dimensions; multi-fidelity neighborhood sizes **16 → 64 → 128** with independent seeds; independent NSGA-II islands; local coordinate refinement evaluated on neighborhoods; constrained Pareto selection and crowding; behavioral de-duplication; independent selection and confirmation. Preserve analogous budgets and fidelity for the same-sized Study 7 tracks, scaling fairly for the newly full-sized VGT (8-D) and five-book (40-D) tracks.

**Do not shortchange the five-book optimizer simply because it is more expensive.** Give it an adequate predeclared budget with dimension-appropriate proposals and diversity coverage. Nor should any track receive infinite tries: use Study 7's training-only hypervolume saturation/uncertainty/coverage triggers, with predetermined caps, to extend searches when additional computation could materially improve coverage or precision. Report search totals, front improvements, saturation and whether extensions changed the shortlist. Deduplicate and cache verified per-book virtual traces and exact pool replays; include dataset/engine/fill/cost/interest/parameter/grid/door identity in cache keys.

Local CPU compute may run for **many hours** if the information value is credible. Prioritize correct experiments, thoroughness and independent verification over a short wall-clock duration. It is not necessary to ask approval merely because a Node.js optimization lasts 5–10+ hours. **Claude should manage the assignment end to end**, including launching, monitoring completion, analyzing results and writing reports. Avoid unnecessary model-token-heavy per-batch micromanagement, but **do not skip required analysis, safety checks, reviews, or validation**. Only request user approval if Claude can establish with high confidence that proceeding requires an unusually large increase in active Claude-model usage, not merely local CPU time; otherwise proceed. Do not claim to know exact remaining Claude allowance. Persistent checkpoints, deterministic restart, sensible limited process polling, and no-progress timeouts should prevent a stalled job consuming an entire night.

Crucially, more optimization across the same historical time series creates more selection pressure. Do not describe fresh perturbation *seeds* as fresh market histories; track all candidate multiplicity and include CSCV/PBO and return-rank chronological diagnostics. Once the predefined saturation/precision gates are satisfied, stop—even if some CPU hours remain available.

## 8. Freeze and one-time 2025–2026 evaluation

Before unlocking the final/2025–2026 door:

- Seal all six tracks' primary 2016–2024 search archives, selection evidence, shortlist IDs, optimizer candidate parameters, their roles, final accepted economic/risk thresholds and **training-only global ranking**.
- Seal the full selection including **no nominee** or partial shortlists if appropriate. Produce a SHA-256/hash-chain manifest and make the data-door refuse evaluation without it. A cryptographic signature is optional and must not be falsely claimed without a real signing key; hashes alone establish integrity checks, not external notarization. Git commits are **not** required or authorized for this freeze.
- Run a read-only independent audit of selection integrity, seeded confirmation independence, candidate multiplicity, leakage constraints, accounting parity and exact controls.

Then evaluate all locked nominees/shortlists and comparators **once** on a continuous 2016–2026 simulation. A deterministic independent confirmation rerun may be allowed solely to detect computational mistakes; it may not change rankings, parameters or criteria. Report both whole-history and **incremental 2025–2026** net, median neighbor net and p10, max DD, adverse excursions, number of new funded lots and years, 2025 and 2026 YTD separately, and economic contribution versus B1/B5. Every nomination must satisfy the **predeclared** primary test gates: an acceptable center and independently sampled joint-neighborhood DD, positive and economically meaningful **test-period** results, resistance to baseline cost/interest/fill stresses, and training-defined activity/concentration requirements. Keep Study 7's Q/F/E gates substantively intact; any new test-period economics and risk thresholds must be explicitly defined **before the search**, not selected by looking at 2025–2026 outcomes.

A selection trained on 2016–2024 that passes 2025–2026 should be labelled **retrospectively chronologically persistent / research-only**, not independently validated for trading. A configuration that fails is rejected without rescues, even if another one could be chosen post hoc by inspecting its test P&L.

Report a **separate, non-decisional** comparison of all candidates against Study 7's #1, #2, #5 and #6 as historical research references. Distinguish when Study 8's additional regime coverage explains improvements and when a result is mostly a selected historical peak. Include explicit limitations from the 2020 crash, 2022 gold-miner reentry path, 2025 tariff episode, 2026 GDX drawdowns and any other measured event without retroactively changing fitness to target them.

## 9. Causal engineering correctness and verification

Required before relying on outputs:

- Fast virtual-trace and fixed-pool replay **bit-for-bit or numerically exact** on ledger, funded lots, virtual events, interest, friction, both DDs, and period marks against authoritative N-book engine, under all major track sizes including **five ETFs** and several perturbed vectors, on both training and full horizons; 0 material differences.
- Baseline B1/B5 control reproduction through **2026-10-13** and **2026-10-29** within original conventions, with explicit integrity checks. Study 7 documented B5 $486,207.77 at 2026-10-13 and $484,636.97 at 2026-10-29; compare against source records rather than embedding unverified hard-coded assumptions. Check frozen VG/VXR/VXRG, registered GDX and Study 7 role candidates where available.
- No lookahead: truncated-training runs reproduce identical pre-cutoff decisions, fills and marks from full-history replays; opening a forbidden data door must fail closed.
- Independent cache invalidation and deterministic stop/restart/resume tests; no effects from stale or cross-fold caches; source hashes pinned.
- All unit/integration/static checks; inherited known failures separately identified rather than described as all green. Independent methodology review and final audit of the most important numerical and chronological claims.
- Verify the prospectively frozen historical prefix (original cutoff 2026-10-13). Study 7's data through 2026-10-29 was already inspected; do not call the 12 post-10/13 observations independent after Studies 5–7.
- No broker/API changes, margin orders or actual execution. Any user-modified market-event files remain untouched.

## 10. Deliverables, convenient CLI, and reproducibility

Produce a complete research package under the new namespace:

1. `README.md` — exact study purpose, evidence grade, all tracks and succinct answer.
2. `PROTOCOL.md` and freeze/hash records; `AMENDMENTS.md` append-only if needed.
3. `BASELINES_AND_PARITY.md`, `SEARCH_AND_COMPUTE.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `CHRONOLOGICAL_VALIDATION.md`, `RISK_AND_TRADE_SEQUENCING.md`, `RECOMMENDATION.md`, `EXECUTION_AND_INTEGRITY.md`, `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md` (names may differ slightly but all content required).
4. Machine-readable sealed records for every fold, track, archive, finalist, independent confirmation, validation and one-time full-history test. Export human-readable tables comparing all tracks' original frozen control, best new profit/robust/balanced role, net, drawdowns, neighborhood medians/p10/p90, pass rates, funded trade episodes and period attributions.
5. Runnable **research-only** configurations for shortlisted candidates, with stable IDs, full parameters, provenance, data/code hashes, training selection rank, chronological status, and explicit labels **NOT DEPLOYED**. **The `study7-run` tool already exists locally:** verify and reuse its tested CLI/output conventions where available; do not rebuild it unnecessarily or overwrite its alias map. Add separate `study8-run` aliases or a Study 8-scoped adapter for new candidates as needed, with commands to list, inspect and run one or several fixed-$100k candidates with optional `--end`, `--cost-bps`, `--out`, returning full per-trade ledgers (entry/exit time and fill, reason, realized/unrealized net, interest, friction, symbol, max DD) and comparable summary tables. Ensure a user can run current data without silently changing the frozen study evidence; provenance reconciliation to sealed research records is **not applicable** when the end date/cost differs from those records, rather than a false PASS. Do not overwrite sealed outputs when a run is repeated.
6. `COMPARE` command or documented script to compare at least G, V, VG, VXR, VXRG, VXRKG against B1 and B5 with exact 5 bps / 11% accounting, including date cutoffs and CLI usage examples.
7. Include specific **executed and verified** terminal commands for the best research candidates from all six tracks and the frozen controls, and explain whether commands run from the new branch or `main`.
8. **Do not commit or push without the user’s separate explicit approval**, as required by `CLAUDE.md` and the newest runner report. Finish Study 8 completely in a research-only branch/worktree with local hash-verified seals, no merge or PR, no live deployment, and no modification to frozen configs/prospective records. Preserve the still-uncommitted `tools/study7-local-runners` changes and all other user work. Record exact Git base hashes, dirty-worktree files and the new uncommitted study outputs. Only after the full study is finished may you ask whether to commit/push Study 8 and/or the separate runner work.

The final user-facing report should separate:

- **Mechanical protocol results** (including per-fold qualification failures and all cutoff-specific metrics);
- **Economic judgment** (large-profit and robust plateau versus inert/low-profit region);
- **Evidence confidence** (training in-sample, retrospective forward chronological, no genuinely unseen 2025–2026 history);
- **Decision** (research nomination or none, with realistic risks and a clean prospective follow-up plan after the last inspected session).

**Do not optimize only until something looks impressive. Do not soften thresholds after failures. Do not treat a successful 2025–2026 replay as proof of a future edge. But do complete the full specified research, including the VGT and five-book tracks, before concluding that no improvement exists within this bounded search.**
