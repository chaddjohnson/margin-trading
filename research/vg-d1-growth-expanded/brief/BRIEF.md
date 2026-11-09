# Priority 3B — Larger VGT + GDX D1/Growth search, with C4 as the preferred benchmark

## Assignment and authorization

Complete Priority 3B: a substantial, larger-budget **backend optimization of D1 + Growth for VGT and GDX in one shared capital pool**, using the current funding lifecycle, L0. Implement, verify, search, qualify, freeze, validate, report, commit and push the research branch. Stop for review afterward. Do not start Priority 4A, 4B or another allocation study automatically.

The user's current preferred configuration is **C4: VG #2 Balanced's VGT+GDX D1 pair plus VGT Growth #4, with GDX Growth disabled**. Preserve it exactly as the preferred benchmark and no-improvement fallback. This preference authorizes research, not deployment. Do not modify C4's archived phenotype or quietly replace it with a newly optimized approximation.

The practical question is whether a new configuration can improve on C4's profit and stability under the actual shared pool. A higher historical profit alone does not establish a better or safer replacement. Maintain separate profit, robust-profit, balanced and lower-drawdown roles, and make their trade-offs explicit.

Proceed autonomously through this assignment. Routine implementation decisions, pilot sizing, fixes, research execution, documentation, commit and push are authorized. Negative results are valid. Ask only if a concrete unresolved issue prevents correct execution within this scope.

## 1. Read the evidence and adopt the standard

Locate the Apollo repository and inspect the working tree, applicable instructions and branch ancestry. Use a separate branch and study directory, suggested name `research/vg-d1-growth-expanded`. Preserve unrelated work and all completed studies. Prior research may be on unmerged branches; recover dependencies through normal, non-destructive Git operations.

Read in full:

- `CLAUDE.md`, `AGENTS.md` and the applicable context-recovery instructions.
- `docs/research/OPTIMIZATION_STANDARD.md`, its version registry, `STUDY_PROTOCOL_TEMPLATE.md` and `ROADMAP.md`.
- `research/vg-growth-funding-lifecycle/REPORT.md`, protocol, amendments, manifests and the relevant result tables and engine code.
- `research/vg-d1-growth-diagnostic/REPORT.md` and its causal and risk diagnostics.
- `research/vg-d1-growth-joint/` protocol, report, actual budgets, controls, selections, optimizer and pooled engine.
- Relevant Study 8 methodology and code, the Growth stable study, and the VGT joint/separate-pooled studies, sufficient to verify provenance, configuration identities and accounting.

The current registered optimization standard is **2.0.0**. Verify the actual current version, read it fully, record its version/hash and protocol adoption, and integrate `research-preflight` into every substantive stage. Do not merely declare compliance: verify that the runner implements the rules. Freeze and commit the protocol before substantive search.

Record this brief and the user's C4 preference in the new study and roadmap. Keep the persistent instructions to read the standard before optimization, use no visuals, and commit/push on completion. Update any genuinely changed process documentation through the standard's version procedure; do not rewrite old studies or introduce an unapproved global risk rule. Study-specific budgets and choices belong in this study's protocol.

## 2. Backend only; preserve L0 and the allocator

Use canonical data and backend runners only. Do not open, start, operate or modify Strategy Lab, its HTTP endpoints, Interactive Preview, preview cache or database. Do not use browser automation. Direct imports of canonical engine modules are appropriate.

Preserve **L0**, including independent virtual books after an unfunded decision, canonical virtual exits and continuation rights. Funding does not feed back into either family's signal lifecycle. Freed capital does not revive a refused purchase. Do not use L1, L2, the canonical capacity hook or another funding-aware substitute.

Use the verified **one exclusive funded slot**, one fixed $100,000 principal budget, no compounding, no preemption and no simultaneous funded positions. Preserve reservations, canonical execution timing and deterministic ordering from the harmonized Priority 3/5A controls. A partial exit does not release a second slot while a funded remainder remains. Do not add reservations by family, sharing, dynamic sizing, opportunity ranking or allocation searches here; those remain Priority 5.

Growth's native eligibility, recovery gate, trend filters, partial exits, retention, continuation and initial stops remain legitimate phenotype search options. Native eligibility is distinct from replaying a pool-refused entry. D1's added delayed-entry eligibility remains OFF.

Priority 5A found no consistent benefit from the two tested funding-aware alternatives on unchanged settings. That supports using L0 here; it does not prove every alternative lifecycle is inferior.

## 3. Dates, economics and data boundaries

- **Development and all selection:** 2016-01-04 through 2024-12-31.
- **Validation:** 2025-01-02 through 2026-10-30, using the common complete sessions available for both ETFs. Verify hashes and completeness. If this endpoint cannot be reproduced, document the discrepancy before dependent work; do not silently extend to later dates.
- Use physically restricted, verified data doors for each cutoff. No selection or extension decision reads validation rows.
- Maintain continuous state across boundaries. No forced liquidation or reset at year-end. Validation net is the change in marked net from the 2024 year-end close. Report reset-period and whole-run maximum minute DD separately.
- Reuse verified economics: fixed $100,000 principal, 5 bps per side, zero commission and 11% simple annual interest with the canonical day-count convention. Preserve split, dividend, fill and mark conventions.
- The risk budget is **maximum minute DD ≤ $35,000**, 35% of fixed principal, not 35% of peak equity. Do not describe it as a guaranteed future loss cap.
- Reproduce native VG #2 before the harmonized comparison. Its native D1 arming date is 2017-06-15. Use the already verified Priority 3/5A harmonized arming convention for matched research comparisons; document the exact native-to-harmonized bridge.

All 2025–2026 results are **validation on previously examined history, not an untouched holdout**. Disclose the prior results and the informed choice of C4. New validation outcomes must not change the primary, shortlist, budget, ranges, rules or reporting roles.

## 4. Exact controls and the three legitimate combinations

Recover complete effective configuration vectors and allocator settings from verified backend artifacts. Do not reconstruct phenotypes from abbreviated prose.

Identities to verify:

- VG #2 Balanced: `s8-vg-balanced`, `S8-VG-F24-3`, the jointly optimized VGT+GDX D1 pair. Do not confuse it with Study 7's similarly named pool or the shipped standalone VGT D1 primary.
- VGT Growth #4: `420cd989e4fa7749`.
- VGT Growth candidate: `08500a60ec56cfae`.
- Existing GDX Growth, Appendix A: `07cac3329fc7a520`.

Keep these unchanged controls visible:

| Label | Composition |
|---|---|
| D | VG #2 D1 only |
| **C4** | **VG #2 + VGT Growth #4; GDX Growth OFF — preferred benchmark** |
| C85 | VG #2 + VGT Growth 08500a60; GDX Growth OFF |
| E | VG #2 + existing GDX Growth; VGT Growth OFF |
| A | VG #2 + VGT Growth #4 + existing GDX Growth |
| B | VG #2 + VGT Growth 08500a60 + existing GDX Growth |

Retain Priority 3's informed and independent primaries as historical comparisons. Reference the VGT-only combinations where useful, but do not confuse them with C4/C85.

C4's known L0 targets under the harmonized conventions are:

| Window | Marked net P&L | Maximum minute DD |
|---|---:|---:|
| Development 2016–2024 | $302,785.91 | $17,332.09 |
| Validation 2025–2026-10-30 | $99,081.34 | $21,536.85 |
| Full history through 2026-10-30 | $401,867.24 | $21,536.85 |

Its archived development confirmation statistics include median net $244,936.82, p10 net $202,108.24, p90 DD $24,448.95 and 1.3% of draws above $35,000. Reproduce archived statistics with the archived instrument; new independent confirmation draws need not give identical quantiles. Check known full-history targets only in the frozen final stage, not as search feedback.

The search must permit all three Growth inclusion choices alongside the two D1 books:

1. VGT Growth only — C4/C85 structure.
2. GDX Growth only — E structure.
3. Both VGT and GDX Growth — A/B structure.

Both D1 and Growth must actually receive capital for a combined candidate. Do not require every enabled book to trade, equal activity or a high minimum count. Report unfunded and token components. A configuration is not excluded merely because one Growth book is disabled. D1-only remains a control, not a substitute for the requested combined strategy.

## 5. Search design: optimize the portfolio directly

Score actual funded pooled replays, including refusals, displaced trades, open marks, interest and costs. Never sum standalone backtests or screen pooled components out solely for poor standalone profit.

Run two clearly separated approaches:

**Informed search, C24:** start with exact C4, C85, E, A, B and relevant prior development-selected candidates. Preserve every unchanged seed. Include a focused C4 neighborhood investigation and broader mutations across all three inclusion choices. Maintain a lane with VG #2's two D1 vectors frozen while optimizing its Growth partners, and a lane allowing the D1 vectors and enabled Growth vectors to change jointly. This directly tests whether adding/refining Growth is enough and whether changing the D1 partners helps. Give both meaningful declared budgets. The user has approved refinement as an additional experiment, not modification of the benchmark itself.

**Independent search:** broad joint discovery across the three inclusion choices, with both D1 vectors and enabled Growth vectors mutable. Use independent seeds and broad justified ranges, not incumbent-derived initializations or ranges. Run the same complete procedure at C19, C21, C23 and C24. Later-selected incumbents must not enter the earlier searches. Distinguish independence of configuration discovery from the broader research design, which is informed by previously examined history.

Use the appropriate Study 8 machinery: broad quasi-random screening, multiple evolutionary islands, multiobjective promotion, successive neighborhood fidelity, local refinement and a diverse shortlist. Avoid multiplying weak variants of the same funded ledger.

Protect coverage across inclusion choice, Rise/breakout structures, recovery gate ON/OFF, eligibility and meaningful exits. Reserve an explicit search and promotion allocation for **both-Growth-symbol configurations that actually fund both books**, alongside unconstrained exploration. These still compete on portfolio profit, risk and stability. More trades or GDX participation alone are not successes. Do not force a four-book winner.

Make exact incumbent values representable, including fine settings such as 45% recovery and the existing loss buffers. Canonicalize inactive dimensions. Report distinct configurations and distinct funded ledgers separately. Explore timing and holding-period interactions, not just local changes to the GDX trailing stop.

Priority 5A showed that refusing a VGT trend entry can matter more than idle time afterward. Investigate this through full pooled outcomes and causal removal replays; do not tune to named future dates or add hand-coded exclusions for known winning episodes.

A fresh standalone GDX Growth optimization remains **Priority 4A**, separately commissioned. This does not freeze GDX Growth here: its parameters must be searched directly as a pooled component now.

## 6. A genuinely larger, bounded compute budget

Audit the actual Priority 3 proposal counts before setting the new budget. Its independent schedule had 16,384 screened centers plus 12,288 base island proposals per cutoff, up to 16,384 island proposals with extensions, plus local refinement. Its headline 1.78 million evaluations included neighbors and earlier cutoffs. All C24 searches exhausted their caps with extension triggers still active.

The planning target for 3B is **at least four times the prior comparable distinct-center exploration**, not four times the number of neighborhood evaluations. A concrete starting plan is approximately **131,072 distinct base proposals per independent cutoff**, with development-triggered extensions up to approximately **262,144**, plus a separately budgeted substantial informed search. Split the base across the three inclusion choices so each receives meaningful coverage; do not spend nearly everything on the largest or currently best class.

These are planning targets, not a license for an unbounded run. Benchmark representative workloads and several worker/cache choices, then freeze exact attainable counts, per-class floors, refinement budgets, total evaluation caps and estimated duration. If measured constraints require a materially smaller plan, explain the reduction and coverage implications explicitly before search; do not silently revert to Priority 3's small island budgets. Use the fastest stable resource configuration within the approved limits. A multi-hour or overnight run is acceptable; do not shorten it merely to finish the conversational turn.

Use the same independent base schedule, extension policy and maximum caps at every cutoff. Actual extensions may differ because development progress differs; report that. Freeze development-only extension triggers, progress checks and stagnation criteria. Include center-profit/frontier progress and new behavior alongside robust-objective progress. Preserve profit-ranked promotion alongside robustness-ranked promotion.

Count centers, local refinements, neighbors by rung, confirmation, chronological work, retries and cache hits separately. Report evaluation time as well as counts. Cache reuse must include exact data, code and economics identities. Never count old archive reads as new exploration. A cap reached with continuing improvement means **budget-bound**, not converged.

## 7. Qualification, roles and C4 fallback

Freeze exact gates and role formulas before search. Use the established center and neighborhood qualification framework: positive center net, center DD ≤ $35,000, independent confirmation p90 DD ≤ $35,000, confirmation p10 net > 0, the established doubled-cost check, and actual participation by both strategy families. Verify the exact implementations against the prior protocol. Do not infer a breach-count gate from an interpolated p90 quantile.

The user accepts considering A/B despite small historical neighborhood threshold misses. Keep A, B and E as controls and informed seeds even where they fail a gate. Preserve the original verdict, subsequent evidence and user-directed consideration as separate fields. Do not invent a new numeric tolerance or use this preference to raise the $35,000 center budget. Show promising near-misses in a separate table with their exact failure and severity; do not silently discard them or label them qualified.

Maintain actual-profit, robust-profit, balanced and lower-drawdown roles. Rank on the selection families; independent confirmation decides qualification, not ranking. Keep C4 and every qualifying unchanged control selectable under the same rules. Use **highest development center net among qualified candidates** as the formal actual-profit primary, with deterministic tie-breaks. Preserve C4 as the user's preferred fallback if no credible improvement is demonstrated; report any mismatch between the formal profit primary and the prudent recommendation.

Do not automatically recommend replacement merely because the formal primary earns more. Show paired differences from C4 in center net/DD, neighborhood median/p10/p90, cost stresses and chronological evidence. Separate “higher-profit trade-off,” “stronger local stability,” “dominates on the stated metrics” and “supported across later periods.” If fresh confirmation unexpectedly fails C4, disclose it and retain its preferred-benchmark status without declaring it newly qualified.

No minimum-activity, annual-profit, largest-winner-share or equal-component-profit vetoes. Report evidence strength and dependence on individual episodes. Rare but severe neighborhood losses must remain prominent: p95 DD, worst-10% mean, mean excess, worst DD and finite-draw uncertainty. These are report-only under the current standard; do not quietly make them new ranking inputs or gates.

## 8. Neighborhoods, stresses and chronological evidence

Use matched selection instruments and independent confirmation, ordinarily 3 × 128 = 384 draws. Freeze the bounded shortlist before confirmation. Do not repeatedly resample until a favored candidate passes or tune candidates to confirmation outcomes.

Preserve the archived instrument for reproducibility and like-for-like comparisons. Also use fresh confirmation seeds not consumed by this search or prior decisions. Compare all controls and finalists under the same new instrument. Specify radii, grids, clipping, dependencies and de-duplication; distinguish numeric perturbations from categorical toggles. Report whole-pool, family/symbol, half-radius and wider-radius scopes, active dimensions and the number of changed ledgers. Explain dimension and clipping differences across the three inclusion choices.

Perform the standard execution/interest stresses, component-removal reruns and largest-episode stress. Interpret displacement through complete replays, not the sum of hypothetical missed profits. Attribute signals, filter blocks, eligibility expiration, capital refusals by occupant, virtual waiting and promotion attrition for any unfunded book.

Repeat the complete independent search/selection at earlier cutoffs, then evaluate its frozen choices on 2020–2021, 2022–2023 and 2024. Freeze selections before opening the next slice. Specify executable transition rules and costs for the sequential policy. These tests supplement, rather than replace, the main 2016–2024 / 2025–2026 split.

Only the independent procedure supplies chronological procedure evidence. Informed refinement around C4 and other later-selected controls is descriptive. Do not claim a chronological comparison of staged versus joint optimization unless every learned component of each procedure is regenerated at each cutoff with comparable budgets. That extra method contest is not required here; limit claims instead.

Freeze and commit final primary, shortlist, roles, gates and validation tests before opening validation. Report all frozen results, including failures. Do not promote a different validation winner or begin a rescue search.

## 9. Verification, containment and recovery

Reuse tested engines and adapters rather than replacing them unnecessarily. Before large runs, seal canonical parity, accounting reconciliation and prefix-causality checks. Verify exact L0 behavior, both single-family reductions, the three inclusion choices, random configurations, reservations, same-time ordering, partial exits, gap execution, year boundaries and open remainders. A parity failure stops all dependent stages until resolved and re-verified.

Apollo has 64 GB RAM. All concurrent heavy jobs must share an aggregate systemd slice with **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0**, with Claude/tmux outside it. Do not launch several independently capped 48G jobs without a parent aggregate limit. More memory is welcome if measured throughput improves; filling RAM is not a goal.

Benchmark workers, CPU, I/O, external/ArrayBuffer memory and aggregate memory. Keep queues/caches bounded; persist results incrementally; checkpoint RNG and search state at least once a minute and at generation boundaries. Stop dispatch below the hard memory limit with headroom. Use proven garbage-collection/worker recycling where necessary. Node heap caps alone do not limit typed arrays. No OOM restart loops.

Test graceful interruption, abrupt worker death and whole-unit termination, then identical resumption. A dead worker must not leave a hung job. Freeze operational settings and log operational amendments. Preserve checkpoints across long runs instead of restarting searches after a conversational interruption.

## 10. Deliverables and completion

Deliver **written analysis, Markdown tables and machine-readable records only**. No charts, plots, SVGs, screenshots, HTML dashboards, PDFs or rendering work. Preserve old visual artifacts without regenerating them.

Include:

- Protocol, adoption manifest, amendments, engine/data/config identities, reproducible commands and recovery instructions.
- Complete effective JSON settings for every frozen finalist, control and inclusion choice, including inactive flags and allocator settings.
- Development, validation and full-history tables: marked and realized net, open P&L, maximum minute DD in dollars and percent of fixed principal, exposure/principal-days, funded trades, wins/losses, holding periods and partial-exit activity.
- A comparison against **C4 first**, then E, A, B, C85 and D. Format dollar values with commas and two decimals. Avoid reporting partial fills as independent winning episodes.
- Selection and independent confirmation evidence, risk severity, costs, causal contribution, displacement and participation audits.
- Search coverage, proposal/evaluation budgets, progress, stopping reasons, historical cutoff outcomes and all limitations. Record protocol changes and any integrity incidents candidly.

Answer explicitly:

1. Did any qualified candidate improve on C4, and by which measures? Is it a credible replacement or a higher-risk profit trade-off?
2. Which Growth inclusion choice worked best under each frozen role? Did GDX Growth contribute causally rather than merely trade?
3. Did keeping VG #2 fixed work as well as changing its D1 vectors? Did refinement improve on the unchanged seeds?
4. Did the larger search find new useful funded behavior, or mainly refine known regions? Was it still budget-bound?
5. Did the independent selection procedure work at earlier cutoffs? Did the frozen selections pass validation?
6. What does the evidence imply for standalone GDX Growth optimization in 4A and GDX-only D1+Growth in 4B?

Update the roadmap: 5A reviewed, 3B completed with the actual outcome, C4 recorded as the user's preferred incumbent unless later explicitly changed. Preserve the next order: **4A standalone GDX Growth → 4B GDX-only D1+Growth → remaining Priority 5 funding/allocation work → Priority 6 other ETFs**.

Run relevant tests and the required suite, distinguishing existing failures from regressions. Commit task-related work and push the research branch automatically; verify remote/local agreement and report branch and commit. Do not ask routine permission to push. If a concrete blocker prevents it, preserve work and explain. Do not merge into main, force-push, deploy or modify production defaults.

Stop after delivering this study for review. Keeping C4 is a valid successful research outcome if the new evidence does not justify changing it.
