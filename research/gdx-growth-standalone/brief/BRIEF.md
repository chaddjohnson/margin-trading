# Priority 4A — Standalone GDX Growth optimization

## Assignment and authorization

Complete a backend optimization study answering: **Can Growth produce a profitable GDX-only phenotype with a stable parameter neighborhood and credible performance across successive periods, within the agreed risk budget?**

This is a dedicated standalone GDX Growth search. It is not another search for a partner to VGT or D1. Optimize the actual GDX Growth account with no other strategy or symbol competing for capital. Implement, verify, freeze the protocol, run the bounded searches and chronological repeats, qualify candidates, freeze selections, evaluate validation, report, commit and push. Stop for the user's review afterward. Do not automatically begin Priority 4B or another study.

The user approved proceeding on 2026-11-10 after reviewing Priority 3C. Record these decisions accurately:

- Priority 3C is reviewed and complete. The user declined to adopt its additional GDX Growth partner, particularly because the earlier-cutoff selections underperformed their GDX-off baselines. Preserve its results and candidate records; non-adoption does not mean all candidates failed qualification.
- `C4-refined` is the accepted alias for Priority 3B's `C24/informed-fixed#1 profit`, not a different candidate. It contains unchanged VG #2 Balanced D1–VGT and D1–GDX plus the refined VGT Growth phenotype, with GDX Growth OFF. Original C4 instead uses original VGT Growth #4. Preserve both as separate research baselines. Do not infer a deployment instruction or a final choice between them.
- The next research sequence is **4A standalone GDX Growth → 4B GDX-only D1 + Growth → remaining Priority 5 funding/allocation and optimization-process investigation → Priority 6 other ETFs**.
- The separate short-term dip-recovery project is complete with no interesting results, according to the user. Do not restart it.

Use a new task branch and namespace, such as `research/gdx-growth-standalone`. Preserve completed studies, sealed artifacts, unrelated changes and active jobs. Start from committed dependencies that contain the current standard and relevant verified runners. Do not reset another checkout or assume the checked-out branch contains all dependencies. Work autonomously within this brief; no routine permission requests for the authorized stages or completion push.

## Read and adopt the current process

Before implementation or optimization, read in full:

1. Applicable `CLAUDE.md` and `AGENTS.md` instructions.
2. `docs/research/OPTIMIZATION_STANDARD.md`, its version registry, `STUDY_PROTOCOL_TEMPLATE.md`, and `ROADMAP.md`. The latest reviewed standard is 2.0.0; verify the actual registered current version.
3. The reports, protocols, amendments, exact configuration sources and relevant tables from:
   - `research/vg-growth-funding-lifecycle/` — especially the standalone comparisons and the scope of the approved 4A/4B work;
   - `research/c4-gdx-growth-partner/` — Priority 3C, including exact settings and chronological results;
   - `research/vg-d1-growth-expanded/` — Priority 3B, coverage and budget lessons;
   - `research/growth140-vgt-stable/` — neighborhood and chronological lessons, not a source of independent GDX seeds.
4. Study 8's methodology and the reusable search, canonical Growth, parity and containment implementations relevant to this task.

Write the protocol from the template, pin the standard version and hashes in `STANDARD_ADOPTION.json`, and pass the research preflight before governed stages. Read long files in bounded sections so nothing is silently truncated.

Do not silently rewrite the optimization standard. This brief specifies this study's scope, ranking and reporting under its existing rules. Any actual process change must be documented, versioned and reflected in companion docs according to the standard; do not introduce new mandatory risk or concentration thresholds. The broader process investigation remains scheduled for Priority 5.

## Exact scope, controls and accounting

Use canonical Growth behavior, currently Growth 1.4.0, and record the exact engine/code identity. No D1, VGT, extra ETFs, external indicators, new strategy logic, leverage optimization, or new funding lifecycle. Use the current L0 execution/lifecycle conventions where applicable. Do not modify the production engine merely to improve research outcomes.

One fixed **$100,000 principal budget**, no compounding; **5 bps per side and 11% simple annual interest**, with canonical sizing, partial exits, repayments, reservations, marks and execution. Preserve the engine's existing signal resolution and minute-based accounting. Document native versus harmonized start, arming, warm-up and price-adjustment conventions. Do not artificially suppress opportunities to match a prior pooled trade calendar.

Controls:

- **Existing GDX Growth Appendix A**, identity `07cac3329fc7a520`, reconstructed only from verified backend artifacts and complete settings. Its previously reported native full-history result was $141,157.37 net, $17,709.96 maximum minute DD and 19 trades, flat at the end. Verify definitions and endpoint rather than forcing a match under different conventions. Reproduce development parity first; reproduce the full-history target only at the frozen final stage.
- A small, predeclared set of existing GDX Growth vectors from Priorities 3B and 3C, evaluated **standalone**. Select this set from documented development roles/structural diversity, not known validation winners. Treat these as informed controls/seeds. Their prior pooled profits are not standalone targets.
- Cash/no position as the zero-profit, zero-DD reference. If no phenotype qualifies, “no supported standalone candidate” is an allowed result; do not manufacture a winner.

Existing VGT Growth #4 and `08500a60ec56cfae` are methodological context, not GDX performance benchmarks that must be beaten. Do not import their post-cutoff information into an independent GDX lane.

Export complete raw and effective parameter vectors, inactive-field treatment, identities and source provenance. Use sealed configuration loaders, never abbreviated report prose. The earlier description of C4-refined as changing only a trend filter and trailing stop was incomplete: its VGT vector differs in 17 settings, including initial stop OFF. Preserve that correction in the roadmap/context documentation if still needed; do not alter its recorded results.

## Dates, data access and chronological testing

- **Development/backtest and all optimization:** 2016-01-04 through 2024-12-31.
- **Validation:** 2025-01-02 through 2026-10-30, subject to verified complete canonical GDX data. Do not silently extend the endpoint to new dates or imply November–December 2026 was tested.
- Use physical data doors, hashes and access logs. Establish the endpoint without inspecting validation performance.
- Preserve continuous positions and strategy state across boundaries. Validation P&L is the marked change from the 2024-12-31 close. Report reset validation DD and full continuous-run DD separately. Any standalone restart experiment must be clearly separate and cannot replace continuous validation.
- Repeat the **complete independent search and selection** at C19, C21 and C23, with training limited to each cutoff and evaluation on 2020–2021, 2022–2023 and 2024 respectively. Use the same independent-lane base budgets and extension policy at each cutoff. Freeze and commit each selection before opening its next slice.
- Define the sequential policy, transition treatment, costs and risk verdict before results. Carry real exposure through transitions using the standard's verified method; do not sum slice profits or drawdowns with incompatible initial states. Report each selected configuration, each slice and the sequential path. For major DDs provide peak, trough and recovery timestamps, positions responsible and whether recovery occurred.

Keep **independent** and **informed** discovery separate. Independent seeds, parameter ranges and promotions cannot be derived from settings chosen using data after the relevant cutoff. Audit shared search schemas and repair code for such contamination. Later-selected incumbents may be shown as informed comparators, but cannot enter the independent chronological policy. If an independence condition cannot be met, disclose the limitation rather than making an independence claim.

The 2025–2026 window is **validation on previously examined history, not an untouched holdout**. Final candidates may be new, but the instrument, design and prior outcomes are already known. Do not tune, re-rank, replace the frozen primary or enlarge search budgets after seeing validation results.

## Search design and compute budget

Use the established Study 8-style approach where appropriate: broad quasi-random screening, multiple independent evolutionary islands, multiobjective promotion, progressively stronger neighborhood tests, local refinement and a diverse shortlist. Reuse verified infrastructure; this does not require a new optimizer.

Maintain two separately accounted lanes:

1. **Independent broad discovery:** canonical Growth parameter ranges not narrowed around known winners. Protect Rise and breakout entry families and meaningful combinations of trend filtering, drawdown-recovery gating, native persistent entry eligibility, continuation, initial-stop structure, trailing stops, losing-hold limits and trend retention/partial exits. Include OFF alternatives where valid.
2. **Informed discovery/refinement:** existing GDX Appendix A and the declared prior GDX configurations, with fine local resolution plus broader mutations. Make every incumbent's exact effective vector representable. Do not simply optimize around the single most profitable historical trade.

Apply the canonical parameter dependencies. Do not count changes to inactive settings as new candidates. Record distinct effective vectors and distinct funded ledgers. Protect both actual-profit promotion and structural diversity so a robustness statistic cannot eliminate an entire entry family before adequate exploration. Search all meaningful existing options within a declared coverage plan, not every Cartesian combination. Report omissions and reasons.

**Planning budget, subject to measured pilot sizing before freeze:**

| Lane | Base new distinct center proposals | Maximum with progress-triggered extensions |
|---|---:|---:|
| Independent, at each of C19, C21, C23 and C24 | 16,384 per cutoff | 32,768 per cutoff |
| Informed, C24 only | 8,192 | 16,384 |

This is 73,728 base proposals across the study, at most 147,456 with all extensions. Divide budgets across seeds and structural groups; informed work does not consume the independent allocation. Declare a total backend-evaluation cap covering centers, neighborhoods, controls, stresses, chronological work and final confirmation. Plan around **4 million fresh evaluations maximum**, then verify feasibility using pilot throughput. These are planning values, not a reason to weaken confirmation or silently turn the study into a tiny screen. Document any justified pre-freeze adjustment and its coverage/runtime implications; after freezing, follow the amendment rules. Do not expand into another unrestricted multi-day search.

Freeze development-only progress triggers, exact budgets and stopping rules. Use frontier progress, robust-objective progress and new distinct feasible behavior as appropriate. Count proposals, neighborhoods, cache hits, retries and fold work separately. A budget-limited island is not proof of convergence. Show where the useful results originated and what remained insufficiently explored.

## Selection, risk and strength of evidence

Preserve the **$35,000 maximum minute DD ceiling on fixed $100,000 principal**. Label this as 35% of fixed principal, not peak equity. Follow the current standard's qualification framework, with exact formulas and thresholds frozen before searching. No new arbitrary activity floors, annual-profit floors, concentration caps or equal-profit rules.

Use the standard's actual-profit, robust-profit, balanced and lower-drawdown roles and retain the qualified Pareto set. **For this study, the formal primary is the highest development center net among qualified configurations**, including qualifying informed controls in the informed comparison. Also identify the independent lane's own primary for chronological assessment. Maintain a qualifying-incumbent fallback under the same rule, and explicitly report when no candidate qualifies. The robust and balanced roles are substantive alternatives, not merely appendix entries.

Do **not** make beating a control on every metric an additional eligibility or recommendation gate. Strict dominance is a descriptive classification. A candidate can be qualified and offer more profit at somewhat greater neighborhood risk; another can sacrifice some profit for stronger stability. Report both without calling either a universal improvement. Preserve each original gate verdict. Tiny p90 differences within finite-draw uncertainty are not decisive evidence of superiority or inferiority, and do not authorize an invented numeric tolerance or retroactive relabeling.

Neighborhood testing must use separate selection and fresh independent confirmation seeds, ordinarily 384 confirmation draws, with the standard's small/normal/wide radii and full disclosure of clipping, dependencies and distinct ledgers. Freeze the shortlist before confirmation and never keep resampling until a candidate passes. Match perturbation instruments across controls and candidates where comparable; do not directly compare quantiles generated under different instruments as though they were identical.

Report:

- Center net, median/p10 neighborhood net and robust net;
- Center DD, neighborhood p90/p95 DD, worst-10% mean DD, breach frequency and uncertainty, mean excess and worst DD;
- Distinct trades and independent market episodes, wins/losses, holding periods, exposure, time under water and open marks;
- The largest winning episode's contribution, and a causal no-new-funding rerun for that episode, rather than merely subtracting its booked profit;
- Cost/interest/execution stresses under the standard, and sensitivity to meaningful optional-feature toggles as report-only diagnostics;
- Reasons for sparse decisions: signals, filters, eligibility expiry/invalidation and existing-position occupancy. Standalone GDX has no VGT/D1 capital competitor—do not recycle pooled explanations.

Neighborhood stability and chronological reliability must receive **separate verdicts**. A smooth neighborhood on one history is not evidence that the selection procedure generalizes. Profits concentrated in a few gold rallies require an explicit limitation, not automatic rejection. A winning final candidate does not erase failed earlier-cutoff selections. Conversely, a failed sequential selection path is not falsely attributed as the historical DD of a particular final phenotype.

## Freeze and final evaluation

Before validation, seal and commit exact primary/role-holder configurations, a small diverse shortlist, all controls, qualification decisions, validation tests and any validation perturbations. Freeze any additional report-only comparisons at the same time.

Evaluate the frozen set once on the continuous full history. Show development, validation and full-run results side by side, with realized/open P&L and minute DD definitions reconciled. Passing validation and beating a comparator are different questions; report both. No validation-driven replacement of the primary. Keep unsuccessful outcomes and errors visible.

Do not optimize or select a pooled use in this study. A good standalone GDX phenotype is **not** evidence it improves C4-refined, original C4, VG #2 or a GDX D1 pool. Export a small development-selected set of candidates, with complete settings and evidence, for Priority 4B and any later authorized pooled comparison. Do not adopt the declined Priority 3C GDX partner by another name. Its vector may remain a labelled research control/informed seed, not an approved addition.

## Verification, safe resources and recovery

Use the canonical Growth engine or an adapter proven to match it. Before large runs verify trade-by-trade parity for controls and diverse random configurations, causal prefix equivalence, costs/interest, minute drawdowns, split adjustments, reservations, partial exits, remaining-position exits, open endpoints and year-boundary accounting. A parity failure stops all dependent stages. Separate pre-existing repository test failures from new regressions.

Apollo has 64 GB RAM; use more if it measurably improves safe throughput. Benchmark worker counts and bounded cache sizes, then choose the fastest stable configuration. Report CPU, memory, external/ArrayBuffer use and I/O. Do not allocate memory merely to fill RAM.

All heavy study jobs must share safe aggregate containment: **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0**, with Claude/tmux outside the research slice. Inspect other actual workloads first. Multiple separately capped 48G jobs are not safe aggregate containment. Preserve other jobs and leave system headroom; do not raise the cap. Use unique job/cache/output identities and a pressure stop below the hard limit.

Persist results incrementally; bound caches and pending work; checkpoint RNG/search state at least once per minute. Verify identical resumption after graceful stop, whole-unit kill and worker death. Test duplicate concurrent evaluation keys, the hang fixed in Priority 3C. No automatic OOM restart loops. Node heap limits alone do not cap typed-array memory. Reuse proven worker recycling/GC where appropriate.

## Deliverables and finish

**Backend only.** Do not start or operate Strategy Lab, HTTP preview endpoints, browser automation, its cache or database. **No visuals:** no charts, images, screenshots, SVGs, dashboards, HTML reports or PDFs. Deliver readable Markdown analysis/tables and JSON/CSV artifacts only. No report-rendering work.

Deliver protocol/adoption, amendments, README, REPORT, recovery checkpoint, exact runnable commands, frozen selections, complete effective configurations, data/code hashes, per-stage budgets and archive manifest. Use proper dollar formatting and unambiguous trial names. Keep large regenerable archives outside git with hashes and recovery paths.

Lead the report by answering:

1. Did standalone GDX Growth yield any qualified, useful phenotype? Which role holders offer the best observed profit/risk trade-offs?
2. How do they compare with Appendix A on matched standalone center, neighborhood and validation evidence?
3. Did the independent selection procedure work across earlier cutoffs? When and why did its worst DD occur?
4. Are the profits broad across episodes or dependent on a few trades? Which filters and exit choices explain the behavior?
5. Which exact candidates should be carried into 4B, and what remains unknown about their pooled contribution?
6. Was search stopped by stagnation, lack of progress, budget, or a resource guard?

Update the roadmap and context-recovery documents with the user's 3C non-adoption decision, accepted C4-refined alias, 4A results and the next review point. Correct any misleading blanket statement that every 3C GDX partner added nothing in validation: some added $1,766.52, though the user still declined adoption. Preserve sealed study records; add clarifications rather than rewriting historical verdicts.

Keep **4B GDX-only D1 + Growth** pending this review. It should compare unchanged combinations and any authorized joint optimization through actual pooled reruns, not sums of standalone profits. Keep the remaining Priority 5 investigation and Priority 6 ETF work pending as agreed.

Run the required tests and preflight. Commit task-related work and **push the task branch automatically at completion**, verifying remote/local agreement. Do not merge into main, deploy, force-push, or include unrelated changes. If a genuine blocker prevents completion or push, report it precisely and preserve recovery instructions. A negative research result is a valid completed study. Stop after delivery for user review.
