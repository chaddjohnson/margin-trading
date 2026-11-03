# Claude Code research assignment: GDX standalone D1 + B5 re-optimization (VGT/KRE/GDX only)

**Suggested model:** Claude Opus 5.5, **Extra High (`xhigh`) effort**.  
**Working project:** `~/projects/ai-trading` (verify actual checkout).  
**Nature of task:** Execute a defensible, reproducible research program, implement configuration/CLI support where needed, run the experiments, and deliver usable commands and research artifacts. **Do not merely propose experiments.**

## 0. Objective and non-negotiable constraints

Conduct **two linked studies**:

1. **Standalone GDX D1 phenotype research:** Run the existing D1 strategy on GDX with a fixed $100,000 position size, optimize its *existing parameters*, and seek multiple genuinely robust GDX phenotypes with high net P&L and low minute-sampled maximum drawdown. Use proper chronological out-of-sample testing, perturbation, and neighborhood-median analysis.
2. **Three-ETF B5 pool optimization:** Starting from the existing frozen B5 allocator, restrict the eligible universe to **VGT, KRE, GDX**. Exclude **XBI and XRT completely**. Re-run the historical B5 optimization methodology as faithfully as possible, **and additionally** investigate improved/safer optimization and validation methods. Optimize the existing phenotype parameters and their joint interaction in the shared pool. Seek strong and stable pool phenotypes, especially for GDX, without sacrificing robustness.

**DO NOT CHANGE the D1 trading rules, B5 allocator rules, execution semantics, risk accounting, entry/exit mechanisms, or priority/capital-allocation policy.** Parameter optimization within the existing permitted D1 parameter schema is allowed. Do not add novel trading rules, new indicators, conditional stop systems, discretionary interventions, per-trade exceptions, or modified margin policy. Do not optimize by reinterpreting or rewriting the simulator. If an implementation defect is uncovered, isolate it, document it, and obtain an exact controlled baseline reconciliation before using the corrected implementation; do not silently change the research baseline.

**Primary hard risk ceiling:** minute-sampled maximum drawdown **strictly below $35,000 (35% of the fixed $100,000 reference allocation)**. Report daily drawdown too, but do not use daily DD as a substitute for minute DD. Targets are *historical research constraints*, not guarantees of future risk. Favor a margin below the ceiling (e.g., robust candidates materially below 35%) rather than candidates that barely pass on one slice. Do not assume an apparently attractive parameter set is viable if its robust neighboring configurations commonly exceed the limit.

**Optimization objective:** maximize **net** dollar P&L **after margin interest and transaction/friction assumptions**, subject to drawdown and robustness constraints. Also examine profit/DD tradeoffs, exposure, opportunity costs, and performance consistency. Do not select a fragile single-run maximum as the recommended phenotype.

## 1. Read the repository and reconstruct provenance before any optimization

1. Read root `CLAUDE.md`, imported research/context recovery instructions, and relevant current docs. Read the exact D1 implementation, phenotype config loader, standalone runner, B5 pool configuration, allocator, previous B5 optimizer, research scripts, reporting, and tests. Check Git branch/status and preserve unrelated user changes.
2. **Identify the exact historical B5 optimizer**, its original search procedure, parameter ranges/grids/distributions, sequencing, constraints, objective, data partitions, costs, shortlist selection, pool chronology, and frozen candidate provenance. Read prior research and output files; do not infer the procedure from labels. Produce `METHOD_RECONSTRUCTION.md` with file paths/commits and any unresolved differences. If the old machinery cannot run unchanged, explain exactly why and build the smallest compatible adapter, not a different algorithm mislabeled as the original.
3. Inspect the full current data inventories for `data/GDX/data.csv`, `data/VGT/data.csv`, and `data/KRE/data.csv` and relevant metadata. The user **recently appended approximately a week of bars** to each ETF. Determine precise first/last timestamp, session count, adjustment conventions, timezone, intraday completeness, duplicates, gaps, stale bars, and SHA-256 of each exact input. Check corporate actions/splits and whether historical adjustments changed due to append. **Do not truncate to the former 2026-10-13 endpoint by habit**. Use latest verified valid bars; record actual endpoint.
4. Compare the current input hashes and ranges with frozen B5 and previous D1/GDX research profiles. If historical data changed, reconcile the source of resulting baseline differences. Never attribute a strategy difference to optimization when it could be a changed CSV, adjustments, warmup, split, cost, or execution profile.
5. Identify the current runnable CLI syntax by inspecting package scripts/argument parsing. Do not guess syntax or claim a command works until you have executed it.

### Known benchmarks/context to verify, not assume

- Frozen B5 traditionally contains **VGT, XBI, XRT, KRE, GDX**; fixed, non-compounding **$100,000 shared margin**; **11% annual margin interest**; **5 bps per side** friction in the pool research; preserved entry/exit ordering and allocator priority. Historical full-history net about **$486,207.77** and maximum minute DD about **$26,509.97** were previously reported. These are *reference values on earlier data*, not expected results after appended data.
- D1 standalone runner has previously used: `npm run app -- allIn-trailingBuy-postExitContinuation VGT all --phenotype primary`; verify the GDX equivalent and whether an explicit config/phenotype file is necessary.
- Historical B5 pool entry point has been reported as `npm run pools -- fixed B5`; inspect before stating final commands.
- A prior portfolio-aware GDX candidate reportedly used `X=27.4%`, `Y=0.4%`, `stop=7.1%`, `hold=18 days`, `L=100 sessions`, `buffer=3.6%`, `P=19.1%`, `W=81 sessions`. Verify provenance, include as a benchmark if compatible, and **do not let a previously selected candidate contaminate ostensibly new validation**.
- VGT D1 primary historically used `X=21.6%`, `Y=0.3%`, `stop=7.3%`, `hold=8 days`, `L=74 sessions`, `buffer=2.9%`, `P=9%`, `W=60 sessions`. Do not overwrite its registered phenotype.

## 2. Rigorous research design and out-of-sample discipline

**Before looking at candidate holdout performance, write and freeze a research protocol** (`PROTOCOL.md`): exact data fingerprint, chronological partitions, allowed parameters/ranges, optimization budgets, risk metrics, selection ranking, tie-breakers, neighboring perturbation geometry, robust acceptance conditions, and one-time final-evaluation procedure. Record seeds and software revision.

### Dataset partitioning

- Use **strictly chronological**, non-overlapping **development/train**, **validation/model-selection**, and **final evaluation** periods. Select practical boundaries using GDX's actual history and numbers of informative drawdown/recovery events; explain the regime coverage and sample-size limitations. Do not use randomized minute-bar or trade splitting.
- Do parameter search **only on training/development**. Use validation to choose among **predeclared** search families/shortlists and robust parameter plateaus; avoid repeatedly optimizing to validation. Strongly consider rolling/expanding-origin walk-forward folds entirely inside the development and validation portion, with multiple regimes, before selecting a final candidate.
- **Critical limitation:** prior project research has already inspected at least portions of **2024–2025** and other later historical data. Therefore do **not** label those periods a clean sealed holdout merely because a CSV is named `holdout`. Audit which spans have already influenced previous model decisions. If no genuinely unobserved block remains, call the last segment a **previously exposed final evaluation / retrospective stress test**, not an unbiased final holdout. Recommend genuine forward paper trading for new evidence.
- The **newly appended week is not an adequate holdout by itself** and must not be used to tune parameters. Note whether the new bars were viewed/used in previous work; report its results separately as a very short recent slice, not statistical validation.
- A candidate should be locked before the one-time final-period run. **No tuning after final inspection.** If it fails, report the failure and freeze it; any next iteration is a separate, explicitly labeled research cycle that consumes the former final period as observed data.
- Respect pre-window indicator warmup and earlier historical state. Ensure no future data leaks into lookback/high-water marks, continuation eligibility, or fills. Explicitly specify the treatment of positions/eligibility states crossing train/validation boundaries, and avoid training on outcomes that resolve within the next fold unless handled consistently with chronology. Do not reset live state at artificial period boundaries when computing a continuous pool replay.
- Keep train/validation results comparable across candidates and avoid selection distorted by different trading opportunities/end dates. Show both per-period change in marked equity and independently initialized period results where useful, labeled distinctly.

### Statistical and engineering safeguards

- No look-ahead, future-informed trade fills, mid-minute trigger assumptions, or survivorship cherry-picking.
- Reject invalid/partial data sessions rather than extrapolating them silently. Verify no ETF split, price adjustment, or session artifact creates spurious 2020/2026 profits.
- Document the number of candidate evaluations and effective search dimensions; account for multiple-testing/data-mining bias. Prefer constrained, economically plausible search domains, coarse-to-local search, multi-seed replicates, and broad regions over enormous winner-take-all grids.
- Maintain a strict distinction between **research discovery**, **validation/model selection**, and **previously exposed final stress results** in every table.
- Include a no-improvement outcome as an acceptable, valuable result. **Do not force a nomination** if no candidate clears robust criteria.

## 3. Study A — standalone GDX D1 optimization

1. Establish standalone GDX baseline using the current implementation and full current data, then capture comparable chronological train/validation slices. Include any prior GDX B5 phenotype and D1 sensible/default phenotype(s) as fixed controls, clearly labeled.
2. Keep the existing D1 entry, trailing-buy, profit-conditioned trailing stop, maximum loss hold, buffered intraday loss, continuation and all other logic **unchanged**. Optimize the *existing registered parameters only*, using their real bounds/types and semantics:
   - `targetPercentChange` (`X`)
   - `trailingBuyPercentage` (`Y`)
   - `trailingStopPercentage` (`stop`)
   - `maximumHoldDays` (`hold`)
   - `tickWindowSize` (`L`)
   - `intradayLossBuffer` (`buffer`)
   - `pullback` (`P`)
   - `continuationWindow` (`W`)
   Confirm actual names and any ETF-specific schema in code. Do not enable/disable mechanisms or change rules unless such differences are already lawful phenotype parameters in D1, and clearly disclose them.
3. Search broadly **within the precommitted training budget** for multiple high-quality regions using a defensible method (e.g., reproducible space-filling/random or quasi-random screening, multi-start local refinement, limited targeted grid in promising neighborhoods). Avoid fitting specifically to the exceptional March–April 2020 rebound.
4. Inspect why the March 16–18, 2020 GDX exit occurred; report the selected candidates' trade-by-trade evolution through that period as **diagnostics only**. Compare the full March–April sequence including reentries, capital occupancy, giveback and net profit. Do not rank candidates by their single March 2020 result.
5. **Perturbation testing (required):** For each shortlisted phenotype, perturb every optimized dimension by precommitted relative/absolute steps, including ±1 and ±2 plausible increments where appropriate; include single-parameter and a reproducible multivariate perturbation sample. Respect discrete integer session/day values and feasible ranges. Report P&L, minute DD, failure frequency, catastrophic tails, number of positive perturbations, and sensitivity plots/tables.
6. **Neighborhood median testing (required):** Define a reproducible local hyper-rectangle/hypersphere (or controlled LHS/Halton neighborhood) around each candidate, evaluated on train **and validation** without fine-tuning from validation. At least report **median** and 10th/90th quantiles of net P&L, median and 90th percentile minute DD, fraction below $35k DD, and profit/DD robustness. A strong candidate sits inside a broad plateau with reasonably stable neighbors, not at one isolated spike. Record the sampling budget, deterministic seed, and definition of distance.
7. Additional checks: leave-one-calendar-year/regime out of development analysis; bear-market/rally/crash segmented contribution; block bootstrap or contiguous-session stress/replay **only if statistically meaningful and without destroying strategy chronology**; higher cost/interest sensitivity (e.g., 8%, 11%, 14% interest as secondary stress, with 11% unchanged as primary); stop-fill slippage/gap stress; exposure duration, concentration in the largest 1–3 trades, and drawdowns **during** open positions. Do not pretend resampled bars produce a valid market history if they don't.
8. Nominate **several** well-supported phenotypes when evidence permits: e.g., highest robust net, lower-DD defensive, balanced. Give exact parameter vectors, dataset-wise results, neighborhood medians, caveats, and immutable config/provenance. If none qualifies, state that plainly.
9. Add **a user-runnable standalone command** for each nominated GDX phenotype and a baseline command. Verify commands really execute and use the current extended CSV. Prefer existing CLI conventions; make the smallest clean additions necessary to expose new phenotypes without replacing `primary`/frozen names.

## 4. Study B — rebuild/optimize B5 with ONLY VGT + KRE + GDX

### First isolate the ETF-exclusion effect

**Must perform these three distinct comparisons** on the same current data and cost assumptions, without conflating changes:

| Control/study | Eligible ETFs | ETF phenotypes | Purpose |
|---|---|---|---|
| **B5-original-frozen** | VGT, XBI, XRT, KRE, GDX | exactly frozen B5 | historical control, replay on current data |
| **B5-3ETF-frozen-ablation** | **VGT, KRE, GDX** | same respective frozen B5 phenotypes | isolate effect of excluding XBI/XRT **without retuning** |
| **B5-3ETF-reoptimized** | **VGT, KRE, GDX** | newly researched existing-rule parameter vectors | incremental value of retuning in restricted pool |

Do not modify original B5 or its original phenotype registry. Never permit XBI/XRT in a three-ETF run, including fallback, candidate initialization, shadow signals, capital constraints, or report aggregation, unless explicitly called out as a separately labeled diagnostic. Cross-check actual trade symbols in output.

### Recreate original B5 search AND improve upon it

1. **Track 1 — faithful B5 methodology.** Re-run the prior B5 optimization approach on the **restricted three-ETF universe**, with the actual old stages, search spaces, fitness criteria, sequential/joint steps, tie-breakers, costs, and risk limits reconstructed from code/research. Adapt its chronological data partitioning to the defensible protocol above if the prior research leaked into final samples, and document that necessary change explicitly. Compare like-for-like outputs where possible. Do not simply take the old GDX phenotype and call that reoptimization.
2. **Track 2 — robust supplemental methods (required).** In addition to Track 1, conduct at least two feasible, complementary techniques:
   - **Low-dimensional, staged / coordinate optimization:** freeze other ETFs, tune GDX, then KRE and VGT, iterate with a limited budget; follow with a small **joint** search to capture interactions. Randomize coordinate order and use multiple seeds to check path dependence. Do not assume the locally best standalone GDX always wins in the pool.
   - **Robust region / plateau selection:** explore local parameter neighborhoods around promising Track 1 and staged candidates, rank by validation-reliable net P&L *and* neighborhood median/tail/worst-DD feasibility, and compare Pareto-efficient profit-versus-DD candidates. Use a predeclared robust fitness rule and guard against cherry-picking.
   - If resources permit and grounded in the actual codebase, a modest multiobjective/Bayesian/evolutionary **proposal generator** with strict fixed evaluation budget and independent verification is optional. It must not replace faithful Track 1 or validated neighborhood testing.
3. **Joint portfolio effects matter.** Model all events in exact timestamp order with a single fixed $100k shared margin pool, actual B5 priority/capital occupancy, existing fills, fees, 11% borrowing cost and no compounding. An opportunity blocked by an existing position is **not** an executed trade. Keep intraday/minute chronology, tie-breaks, and warmup identical to frozen B5. Do not assume the standalone net-P&L optimum is the portfolio optimum.
4. Pay special attention to the user's hypothesis: **XRT trade #88** held approximately **2025-11-12 09:39 → 2026-03-03 09:31**, net **−$759.64** (prior report), possibly blocked attractive GDX opportunities. Produce an event-level **blocked-opportunity / counterfactual capital audit**:
   - Identify exactly which GDX/KRE/VGT entry eligibility, orders, and fills were suppressed while XRT (or XBI) occupied margin under frozen B5.
   - Re-run the frozen 3-ETF ablation to determine which entries actually occur and how their exits change future eligibility.
   - Analyze that XRT interval in detail, including new GDX entries **if any**, their time-to-exit, interest, realized/unrealized P&L, and subsequent displacement effects. **Do not invent hypothetical profits** based on signals alone or attribute all B5 difference to that trade.
   - Differentiate margin blockage from candidate not eligible, priority competition among remaining ETFs, post-exit continuation state, and data availability.
5. Optimize **all three ETF phenotypes as warranted** to improve shared-pool net P&L and robust DD; give GDX especially thorough attention, but do not lock VGT/KRE arbitrarily or force GDX to consume capital. Assess standalone GDX shortlist transferability **as a starting seed**, not as a forced final selection.
6. Enforce **minute DD < $35k** as a hard risk gate in the selected pool, and report robustness failure rates across local perturbations and development folds. Prefer ample cushion and stable neighbor performance. Avoid winning by becoming excessively inactive: report occupancy, entry opportunities, realized trades, ETF contribution and concentration, blocked-signal ledger, and recent-period performance.
7. Include multiple candidates if supported: highest robust profit, balanced profit/DD, conservative/low DD. If a restricted-pool candidate cannot outperform frozen B5, report that honestly. Being better than the *three-ETF ablation* but worse than five-ETF B5 is a meaningful distinction.

## 5. Evaluation/reporting standard for BOTH studies

For every baseline and nominated phenotype/pool, provide a clearly labeled table with:

- Exact config/parameter ID, Git SHA, CSV SHA-256 and actual date range (including newly appended sessions).
- In-sample, validation, and final/previously exposed period net P&L; **full-history net** as a descriptive replay, not as the selection criterion.
- Gross P&L, 11% margin interest, friction/cost, **net** P&L, trade count, win/loss, median/mean trade net, exposure/capital occupancy, and time in market.
- **Max minute DD ($ and % of $100,000)**, max daily DD ($ and %), DD dates, time underwater/recovery if available, largest single-trade adverse excursion, and risk-limit breaches.
- Neighborhood **median net P&L**, p10/p90 profit, median/90th-percentile minute DD, fraction of neighbors passing <35%, and local perturbation stability (including whether the center itself is an outlier).
- Return concentration and leave-one-year/regime sensitivity. For the pool, per-ETF profit/trades/interest, selected vs blocked events, and order-dependence.
- Any changes in ordering versus baseline, key counterexamples, costs/interest/slippage sensitivity, and explicit caveats.

**Data discipline:** labels such as `holdout`, `final`, `forward`, `all`, and `validation` must reflect actual chronological exposure. Explain any difference between a *continuous chained* run's period attribution and separately reset runs. Distinguish trade-level DD, standalone marked-equity DD, and shared-pool minute DD. Do not silently redefine the denominator.

**Performance sanity tests:** compare sample trade entry/exit events to frozen engine, test no forward leakage, verify friction and interest accounting, no duplicated fills, consistent timestamp sequencing, proper handling of missing minutes/overnight gaps, partial data, warmup, continuation anchor and stop activation. Confirm the dataset endpoint includes the recent append and the reporting reflects it. Use regression tests where code changes are necessary.

## 6. Deliverables and reproducibility

Create a dated, versioned research directory (follow repository conventions; e.g., `research/gdx-d1-b5-three-etf-2026-10/`) containing:

- `PROTOCOL.md` — precommitted splits, search ranges/budgets, score/constraints, anti-overfit rules.
- `DATA_AUDIT.md` — CSV ranges, append details, hashes, splits, corporate actions, source changes.
- `METHOD_RECONSTRUCTION.md` — how original B5 optimized, evidence paths, exact faithful reproduction and departures.
- `STANDALONE_GDX_RESULTS.md` — baselines, full shortlist, final phenotypes, detailed trade/equity DD diagnostics.
- `POOL_B5_THREE_ETF_RESULTS.md` — 5-ETF baseline, restricted frozen ablation, original-method 3-ETF reoptimization, supplemental robust variants, comparison.
- `BLOCKED_OPPORTUNITY_AUDIT.md` — actual XRT #88 case plus blocked opportunity traces, especially GDX.
- `ROBUSTNESS.md` — perturbations, neighborhood medians/distributions, fold/year analysis, sensitivity.
- `RECOMMENDATION.md` — candidates, profitability/DD tradeoffs, remaining limitations, whether any is safe enough to nominate; no forced winner.
- `RUN_COMMANDS.md` — tested copy/paste commands to rerun standalone GDX baseline and each named candidate, original B5, 3-ETF frozen ablation, and each 3-ETF optimized pool; state exact environment and options. **Commands must use existing/verified runner syntax.**
- Machine-readable `json`/`csv` tables and logs for every evaluated shortlist, deterministic seeds, hashes, parameters, and run manifests; avoid overwriting earlier research results.
- Only minimal necessary implementation/config/CLI changes with tests. Preserve frozen B5, VGT primary, existing GDX phenotype and original benchmarks. Use **new distinct configuration and phenotype names**, not renaming old ones. Keep a separate Git branch/commits following repo policy; never silently merge. If external orchestration context requires approval, preserve the user's manual review gate.

If computationally intensive, implement **checkpointing and resumable stages**. Give genuinely useful completed results within the available resources rather than marking unrun experiments as completed. Do not set arbitrary time or evaluation cutoffs without disclosing them. Use controlled CPU parallelism and cache safely; no nondeterministic contamination of shared research output. Complete as much of both workstreams as possible before final reporting; distinguish completed and pending items clearly.

## 7. Acceptance tests before declaring completion

- [ ] Frozen B5 still runs identically on a pinned historical data snapshot; any current-data differences are explained.
- [ ] Exactly VGT/KRE/GDX appear in every restricted-pool execution and candidate result.
- [ ] Both original-method and supplemental pool optimization **actually executed**.
- [ ] Standalone GDX optimization **actually executed** with search, perturbations, neighborhood medians and chronological validation.
- [ ] Data split exposure/leakage is documented honestly, especially inspected 2024–25 and appended 2026 bars.
- [ ] No changes to D1/B5 strategy, allocator/priority, stop/fill mechanics, margin assumptions, or source historical files.
- [ ] All nominees respect **minute DD < $35,000** on specified evaluation and robust risk checks; failures clearly shown.
- [ ] GDX 2020 exits and XRT #88 blocking hypothesis analyzed chronologically rather than by hindsight.
- [ ] Provenance, parameter values, risk metrics and neighborhood distributions are reproducible.
- [ ] User-runnable standalone GDX and restricted B5 pool commands are **executed successfully**, printed in final response, and recorded in `RUN_COMMANDS.md`.

## 8. Final response to the user

Conclude with **an executive research summary**, not a wall of logs:

1. What was actually run, the latest data endpoint, source hashes, and split/holdout status.
2. Baseline comparisons and the causal benefit or cost of excluding XBI/XRT *before retuning*.
3. Top 2–4 GDX standalone candidates and top 2–4 restricted-pool candidates (if genuinely supported), with **net profit, minute DD, robust neighborhood medians, and validation results**.
4. Whether GDX received additional legitimate opportunities when XRT trade #88 was absent, with the exact events.
5. Best recommended candidate **or explicit no-nomination** and why; what is still unproven and what forward testing would add.
6. **Exact copy/paste shell commands** for the standalone GDX and restricted pooled ETF tests, plus frozen controls, verified in the current checkout.
7. Links/paths to all research reports and code/config changes, test results, and Git branch/commit(s).

**Do not alter the rules to engineer a prettier backtest. Do not make full-history top profit the selection objective. Stability, genuine out-of-sample discipline, and transparent failure reporting are as important as profit.**
