# Priority 7A — Bounded Growth suitability screening across other ETFs

## Assignment

Proceed with the next approved roadmap item: **Growth for other ETFs**. Complete its first stage: a bounded backend screening that identifies which ETFs, if any, deserve a separate focused Growth optimization. Include a modest, comparable search per eligible ETF; do not judge an ETF solely by applying a VGT phenotype unchanged.

The question is: **Which additional ETFs offer credible Growth candidates under the same accounting and risk budget, with evidence beyond one fortunate historical episode?** A small development-selected shortlist, or no demonstrated opportunity, is a valid result. This is not authorization to find a desired winner by indefinitely increasing search effort.

Priority 6's five-candidate Strategy Lab viewer is complete and has been reviewed. Preserve its working service, code, catalog, data, saved runs and caches. Mark Priority 6 reviewed in the roadmap, Priority 7A active and subsequently complete, and focused optimization as Priority 7B pending review. Priority 4B and broader allocation experiments remain deferred; the short-term dip-recovery project remains concluded. Do not start them.

Use a new branch and study namespace such as `research/growth-etf-screening`. Inspect current history; start from a verified revision that includes Priority 6 and the latest research instructions. Use an isolated checkout if necessary to avoid changing files under the running Strategy Lab service. Complete the study, commit and push automatically, then stop for review. No merge, force-push, live deployment or trading.

## Read and freeze

Read applicable CLAUDE.md, AGENTS.md, context-recovery instructions, the complete current registered `docs/research/OPTIMIZATION_STANDARD.md`, its template and registry, and `docs/research/ROADMAP.md`. Adopt the standard with scope optimization, write the protocol and adoption manifest, pass preflight, and guard substantive runner stages in code. Maintain a recoverable checkpoint.

Read the reports/protocols/amendments and relevant implementation from:

- `research/growth140-vgt-stable/`;
- `research/gdx-growth-standalone/`;
- `research/optimization-process-audit/`, including its proposed reporting improvements;
- `research/vg-lifecycle-matched-optimization/`;
- the canonical Growth engine, data documentation and Study 8 methodology.

Reuse established tooling, schemas, archives, data doors and parity checks. Do not reopen or rewrite completed studies. Read historical manifests at their pinned commits if a current source-tree hash differs.

An earlier user-supplied `ETF_Algorithm_Suitability_Research_Prompt.md` was referenced in a separate conversation. It was unavailable at its former desktop path when this brief was prepared. If a repository copy exists, read it as supporting context. Do not claim to have read it otherwise, and do not block this self-contained assignment on it. Its suggestions are hypotheses, not instructions to expand into other trading algorithms or a general internet research report.

The optimization standard is unchanged. Do not adopt the process audit's failed experimental ranking formulas or introduce new global activity, concentration or tail-severity gates. Record study-specific choices before outcomes.

## Universe and data audit

Start with the existing local ETF data inventory, rather than choosing symbols from their recent returns. At brief preparation it included:

`AGG DBC EDV EEM EFA EMB EWJ EWW EWY EWZ FXI GDX GDXJ GLD HYG IAU IBB IEF IEMG IGV IJH IJR ILF INDA IWD IWF IWM IWN IYT KBE KIE KRE LQD MTUM OIH QUAL RSP SHY SLV SMH SPLV TIP TLT USMV VGK VGT VIG VOOG VPU XBI XHB XLB XLE XLF XLI XLK XLP XLRE XLU XLV XLY XME XOP XRT`.

This is an inventory to verify, not a claim that every directory has eligible data. BTCUSDT and non-symbol directories are outside this ETF study. Do not add leveraged/inverse products, crypto or other instruments opportunistically. Verify instrument identity and historical availability from repository metadata and, where necessary, official fund documentation. Avoid choosing ETFs by current popularity or 2025–2026 performance.

Create a universe manifest before performance screening: symbol, asset/category, inception/history, available session/minute coverage, corporate actions, canonical price convention, data hash, prior research exposure, eligibility and explicit exclusion reason. Use all eligible inventoried ETFs under the same frozen rules; do not quietly cherry-pick a favorable subset. VGT and GDX remain controls, not new discoveries.

Require comparable 2016–2024 history and canonical intraday marks adequate for minute DD. Audit session completeness, timezone/calendar, splits, suspicious discontinuities and missing bars. Do not interpolate missing crisis data into plausible results, substitute daily DD, manufacture pre-inception history or silently use unequal start dates. Put insufficient-history/data products in a separate untested list for later consideration. Do not overwrite canonical files or download a new large dataset as part of this task.

Group ETFs by broad exposure and document close substitutes and overlapping market episodes. Do not mistake several correlated technology funds for independent confirmations. The universe is a present repository inventory and may have survivorship/availability bias; disclose it. Historical cutoff tests cannot erase hindsight in the choice of universe or research design.

Development-only path characteristics such as trend persistence, reversals, gaps and rebound behavior may explain results. They are descriptive unless an exact selection role is frozen in advance. No untested sector narrative is an exclusion criterion or proof that Growth should work.

## Dates, accounting and scope

- Development/search/ETF and phenotype choices: **2016-01-04 through 2024-12-31**.
- Validation: **2025-01-02 through 2026-10-30**, subject to verified common complete coverage. Report any unavailable symbol separately; do not silently shift the requested endpoint or compare unequal windows.
- Validation is on previously examined history where applicable, not an untouched holdout. Record prior symbol/window exposure and informed seed provenance.
- Metadata and completeness checks may inspect timestamps and hashes for endpoint verification; no validation strategy results or price-path selection before the frozen final stage.
- Fixed **$100,000 principal**, no compounding, canonical 5 bps per side, 11% simple annual interest and fractional shares. Maximum minute DD budget **$35,000**, 35% of fixed principal, not peak equity.
- Standalone Growth per ETF, under the canonical current model/L0. Preserve actual engine semantics, eligibility, continuation, stops, partial exits, warm-up and session units. No D1 optimization, multi-ETF pool search, capacity changes or L1/L2 work.
- Every ETF simulation is an alternative use of the same budget. Never sum results across ETFs as an achievable portfolio.

Use daily signals with canonical execution and minute marking, as in the existing Growth studies. Verify conventions for all instruments. Do not quietly change borrowing, dividends, distributions or total-return assumptions to favor a category. State precisely what the data/engine includes and omits, especially for bonds and distribution-heavy funds.

Preserve state across year boundaries. Validation P&L is marked-net change from the 2024-12-31 close of a continuous replay; report reset validation DD and whole-run DD separately. No forced liquidation or account restart at the boundary.

## Screening search — equal opportunity, bounded cost

Run a small independent search for each eligible ETF at each of C19, C21, C23 and C24. Use identical parameter ranges, grids, proposal allowances, seeds, qualification rules and neighborhood definitions across comparable ETF searches. Range adjustments for an instrument-specific engineering constraint must be justified before results, not fitted to its price path.

Planning budget:

- **1,024 distinct center proposals per ETF per cutoff**, shared across two paired search seeds, with protected Rise and breakout cells and meaningful gate/eligibility/exit diversity.
- Up to **2,048 proposals per ETF per cutoff** under a frozen extension rule. For fair comparisons, use synchronized extension rounds for the comparable independent searches, or retain and report an equal-budget checkpoint separately from any extensions.
- A small, separately counted informed transfer lane at C24, using the same predeclared set of exact existing Growth vectors for every ETF. Include original VGT #4, VGT 08500a60, C4-refined's VGT book, the new L0 primary's VGT book and relevant frozen GDX examples. These are transfer hypotheses; their performance cannot eliminate an ETF before its independent search.
- **Hard ceiling: 2 million fresh backend simulations**, including pilots, parity, centers, neighbors, earlier cutoffs, stresses and validation. Cache hits are counted separately. No automatic second campaign.

Pilot representative real throughput and memory first. Before freezing, size the selection/confirmation shortlist and rung fidelities so the whole eligible universe, required cutoffs and final verification fit the ceiling. If necessary reduce proposal counts symmetrically with a documented coverage limitation; do not spend the budget on early symbols and abandon later ones. Reserve confirmation and reporting work before assigning search capacity. Report estimated runtime after the pilot, and proceed within this authorized bound without a routine permission request.

Use the established screen, promotion, evolutionary/refinement machinery where practical. Protect center-profit alternatives alongside robustness and structural diversity. Include exact incumbent values, respect inactive genes, canonicalize identities and report distinct funded ledgers. Avoid millions of evaluations on equivalent settings.

Informed transfers/refinements stay separate from independent discovery and never enter a historical cutoff as later-informed seeds. VGT/GDX known controls receive their required native reproduction; do not confuse a portfolio's P&L with the standalone Growth book extracted from it. Reproduce known full-history targets only at the final authorized validation stage.

This is screening, not an exhaustive optimization. A weak result means no promising result found under this budget, not that Growth cannot work for that ETF. Budget exhaustion and extension stopping are not convergence.

## Selection and historical tests

Freeze the following before outcomes:

1. Candidate qualification and the standard's actual-profit, robust-profit, balanced and lower-DD roles; keep the four-objective Pareto set. Use actual net profit centrally, with qualification and risk evidence alongside it. Use the existing applicable gate definitions rather than inventing new activity/concentration vetoes.
2. A transparent ETF-shortlisting rule based only on development results. Return at most **three new ETFs** recommended for a possible focused 7B, plus controls and near misses. Preserve both profit and robustness evidence; describe correlated finalists explicitly. Do not force a shortlist when none qualifies.
3. The complete procedure for choosing a primary ETF/phenotype at each historical cutoff. ETF choice is part of optimization: repeat the entire eligible-universe screen and selection using only data through that cutoff, then seal/commit before the next period opens. Do not select C24's winning ETFs first and backfill earlier-cutoff tests on those alone.
4. Sequential-policy transition semantics and the standard's chronological verdict, including the possibility of no qualified selection and a documented cash fallback. Account explicitly for positions at transitions and any liquidation costs; do not splice reset equity curves or choose the best ETF in each later slice retrospectively.
5. Final candidate exports, validation tests, stresses, report-only perturbations and stopping conditions.

Evaluate C19 choices in 2020–2021, C21 choices in 2022–2023 and C23 choices in 2024. Separate ETF-specific evidence from whether the overall selection procedure worked. A good final phenotype does not erase a failed chronological procedure. Treat the fixed present-day universe and already-known history as limitations even when cutoff data access is correct.

Use independent fresh confirmation draws (normally 384) for promoted candidates. Smaller early rungs are screening estimates only. Keep confirmation seeds out of ranking, use common perturbations across comparable candidates, and report clipping, duplicate configurations, distinct ledgers and categorical sensitivity. Local parameter stability is not evidence of stability across market regimes.

Report largest-episode dependence and how often neighbors recapture the same episode; include the standard's causal episode stress. Sparse profitable systems stay eligible but must be described as sparse. Report p10/median net, p90/p95 DD, breach share and uncertainty, mean breach excess, worst-10% mean and worst DD. Do not equate perturbation breach frequency with probability of future loss, or treat tiny p90 differences as decisive.

Include execution/financing stresses under the standard. A simple buy-and-hold reference may contextualize each ETF only with clearly comparable cash/financing assumptions; label any separately unlevered reference. It must not silently become a new gate. No optimization of that benchmark.

## Final validation and practical conclusions

Seal and commit the ETF shortlist, exact phenotype vectors, roles and validation plan before evaluating 2025–2026 strategy outcomes. Freeze the export set small enough to support a complete report; disclose the total symbols/configurations tried. Evaluate the frozen selections and controls once under the declared plan. Do not swap in a different ETF or phenotype because its validation looks better, and do not expand search after seeing disappointing validation.

A predeclared development futility rule may stop without new validation if nothing merits it. Report that outcome rather than manufacturing a finalist.

The immediate recommendation concerns **whether a focused 7B is warranted**, not whether to add an ETF to a live or pooled portfolio. Report all shortlisted validation outcomes, including inactivity, losses and drawdown failures. If validation fails, do not use this same window to tune a rescue. Any further 7B design and its already-examined-data limitations require review.

Provide a report-only account of how finalist trading periods overlap VGT Growth and the known portfolios' busy periods if readily available from frozen data. Such overlap is a hypothesis about complementarity, not proof of incremental pooled profit. Do not add a standalone winner to C4, C4-refined or the new L0 primary without a later complete shared-pool rerun. Standalone weakness also does not prove that an ETF could never contribute in a pool.

## Correctness, resources and isolation

Before substantive screening verify engine parity against the canonical Growth runner on controls and varied configurations, causal-prefix equality, accounting and partial-exit behavior, boundary marks, session alignment and corporate actions. A parity or data failure stops dependent stages; never score a failed evaluation as a successful or zero-risk configuration. Reuse tested infrastructure; add meaningful tests for new multi-symbol/data-selection logic.

All research stays in backend runners. Do not use Strategy Lab's browser, endpoints, Interactive Preview, cache or database for optimization. Do not modify its five presets or restart its running service. No charts, screenshots, SVGs, dashboards, PDFs or visual reports; deliver Markdown and machine-readable records.

Apollo has 64 GB RAM. Use the fastest stable measured worker/cache setup with **one aggregate research boundary: MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0**. Claude/tmux and Strategy Lab remain outside. Account for other running jobs; these are ceilings, not targets. Bound queues and typed-array/cache retention; write results incrementally. Test deterministic recovery after graceful stop, worker death and whole-unit kill, and duplicate concurrent evaluation keys. No hanging jobs or OOM restart loop.

Record source/data hashes, seeds, actual versus planned budgets, center proposals versus all simulations, per-ETF structural coverage, stopping causes and memory/throughput. Preserve failed records and amendments. Keep recoverable archives outside git with manifests and hashes; commit portable exact configurations and required evidence.

## Delivery and review gate

Deliver protocol/adoption, universe/data audit, search coverage, exact frozen selections and parameters, per-ETF development comparison, chronological paths, validation results if opened, confirmation/stress evidence, archive manifest, reproducible commands and recovery notes. Dollar values must use commas and two decimals.

Answer plainly:

1. Which new ETFs, if any, warrant focused Growth work, and why?
2. Did ETF-specific optimization find something that fixed VGT/GDX phenotype transfers missed?
3. Are promising results broad across episodes and seeds, or locally stable capture of one episode?
4. Did the complete ETF-and-phenotype selection procedure work at earlier cutoffs within the $35,000 budget?
5. How did frozen finalists behave in 2025–2026, and what remains unproven?
6. Is further work justified, or should this line stop? What is the precise proposed scope of 7B, without launching it?

Update the roadmap with Priority 6 reviewed, Priority 7A's actual result and 7B pending user review. Keep all existing candidate identities and prior verdicts unchanged. Commit and push task-related changes automatically, verify remote/local agreement, report branch/commit and any genuine blocker. Do not merge, deploy, add new Strategy Lab presets or start 7B automatically.
