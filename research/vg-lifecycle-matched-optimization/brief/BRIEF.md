# Matched optimization under L0, L1 and L2 funding lifecycles

## Assignment and authorization

Complete one bounded backend study answering: **When the D1 + Growth portfolio is optimized separately for each Growth funding lifecycle, can L1 or L2 produce a useful improvement over a freshly optimized L0 portfolio?** Separate the direct effect of a lifecycle from the effect of the settings optimized for it and their interaction.

The user approved this experiment after clarifying the limitation of Priority 5A: it changed funding behavior while keeping phenotypes unchanged. That experiment supported keeping L0 for those configurations; it did not compare the best portfolios the same search could find under each lifecycle. The completed process audit tested three ranking changes, not these funding approaches. Its recommendation to defer funding research reflected the earlier brief, before this subsequent approval.

Use a new task branch/directory such as `research/vg-lifecycle-matched-optimization`. Implement, verify, freeze, run the bounded study, report, commit and push; then stop for review. No live deployment or automatic next study. Preserve completed studies, sealed records, unrelated changes and other running jobs.

This is a specific experimental comparison, not authorization for another unrestricted optimization campaign. A negative or inconclusive result is a valid completion. Do not claim that funding changes must cure the chronological failures identified by the audit.

## Read, adopt and preserve

Read applicable CLAUDE.md and AGENTS.md; the full current registered optimization standard, registry, template and roadmap; and the following reports, protocols, amendments, exact configuration sources and relevant code:

- `research/vg-growth-funding-lifecycle/` — Priority 5A's implemented L0/L1/L2 specifications, tests and results;
- `research/optimization-process-audit/`, including `POLICIES.md` and `PROCESS_PROPOSAL.md`;
- `research/vg-d1-growth-expanded/` — 3B, independent/informed lanes and C4-refined;
- `research/vg-d1-growth-joint/` — canonical pooled engine and controls;
- `research/c4-gdx-growth-partner/` and `research/gdx-growth-standalone/` — participation, provenance and eligibility lessons.

Use committed dependencies in an isolated task checkout where needed. Read large files in sections so nothing is truncated. Adopt the current standard (last reviewed version 2.0.0), write the protocol and adoption hashes, and pass preflight before governed stages.

Do not adopt the audit's failed tail-severity, best-year-excluded or top-episode-excluded ranking formulas. Keep current qualification and role rules, explicitly specified for this study. Incorporate the audit's useful observations as reporting, not new vetoes: episode dependence, parameter clipping, sparse decisions and the difference between local stability and subsequent-period performance.

Correct the misleading eligibility documentation generalization, if still present: eligibility ON need not equal OFF without a trend filter when minimum strength exceeds the Rise trigger. Verify against the complete policy semantics and canonical tests, including other eligibility policies; do not replace one overbroad claim with another. This is a documentation correction, not an engine change. Any edit to the optimization standard itself must follow registered versioning; no global selection-rule change is authorized here. Study-specific diagnostics can be recorded in the protocol without changing the standard.

## Portfolio scope and controls

The subject is **VGT + GDX D1 and Growth in one shared portfolio**, under the existing exclusive-slot architecture and actual pooled replay. D1–VGT and D1–GDX remain enabled. Search Growth inclusion as three protected structures: VGT only, GDX only, or both. Do not require GDX Growth to contribute merely to call a result successful; disclose unfunded/token components. A selected combined candidate must genuinely fund D1 and Growth, without equal activity or arbitrary trade-count floors.

Optimize D1 and enabled Growth parameter vectors against the actual funded portfolio in every lifecycle. Use identical permissible search spaces, inclusion structures and execution priority conventions across arms. This is not standalone optimization followed by adding profits. Freeze deterministic same-instant priority, using the verified incumbent convention; do not introduce allocation optimization as another variable.

Two distinct lanes per lifecycle:

1. **Independent discovery:** broad canonical spaces, no later-selected incumbent seeds or range narrowing, repeated at the historical cutoffs below. These lanes support the conditional chronological comparison.
2. **Incumbent-informed discovery/refinement at C24:** identical seed lists and budgets in all three arms, centered on C4, C4-refined and a small predeclared set of structurally diverse existing combinations. All vectors, including D1, may adapt under the same bounds. Clearly label provenance; do not mix these results into an independent chronological claim.

Controls, loaded exactly from sealed sources:

- **VG #2 Balanced**, D1 VGT+GDX, `S8-VG-F24-3` / `s8-vg-balanced`, Growth OFF.
- **C4:** VG #2 D1 vectors + original VGT Growth #4, GDX Growth OFF.
- **C4-refined:** 3B `C24/informed-fixed#1 profit`, VG #2 D1 unchanged + refined VGT Growth, GDX Growth OFF. It is not `informed-joint#1`. Its VGT vector differs from original #4 in 17 settings, not just two.
- A small fixed set from 5A that actually exercised refusals, including a both-Growth-symbol combination, to verify mechanisms and reproduce old outcomes. These are research controls, not adopted portfolios.

Reproduce known development results and native-to-harmonized bridges before use; postpone known full-history target reproduction until the frozen final stage. L0 must receive a fresh matched search; do not compare optimized L1/L2 only against an old L0 candidate. Retain qualifying incumbents or the standard's frozen fallback. Include D1-only as a comparator and allow the conclusion that no combined candidate improves it, without pretending a Growth-disabled result answers the combined-strategy question.

The user has declined the 3C GDX addition. Do not change that status. Preserve original C4 and C4-refined unchanged as controls, regardless of any experimental refinements.

## Exact funding behaviors — reuse 5A, do not invent variants

Use the complete verified Priority 5A protocol and implementation, not these shorthand descriptions alone:

- **L0:** current virtual-book model. A refused Growth entry becomes an unfunded virtual position; it waits for its virtual exit. Include existing virtual continuation semantics exactly.
- **L1:** actual-funding model. A refused Growth request leaves no order or position and consumes that attempted opportunity. Later entries require fresh canonical opportunities. No manufactured Rise crossing, silent native-eligibility retry, inherited hypothetical entry price/high/holding age, or continuation rights from an unfunded profit. Market observation continues causally.
- **L2:** L1 plus at most one preserved refused **base** opportunity per Growth book, using 5A's exact **20-session/5%** rules, native expiry bounds, invalidation, supersession, gate checks, daily reassessment, priority and current-price execution. Refused continuations follow L1. No replay of the original price or reset of the opportunity clock while waiting.

Keep **L2's policy constants fixed** in this experiment. Optimizing strategy phenotypes under L2 is authorized; optimizing its expiry/extension policy would be a separate design dimension and is not part of this matched first test. Native Growth eligibility and its phenotype parameters remain searchable, identically across arms. Clearly distinguish native eligibility from L2's funding-refusal preservation.

**D1's shadow/funding behavior stays unchanged in every arm.** L1/L2 apply only to Growth, just as in 5A. No reserved capital, simultaneous shared allocations, preemption, forced replacement or early liquidation for another strategy. Partial exits retain the exclusive slot until the remainder closes, under the verified current rules.

One fixed $100,000 principal, no compounding, 5 bps/side and 11% simple annual interest; retain canonical prices, signal resolution, execution, reservations and minute marks. Risk budget: maximum minute DD ≤ $35,000, 35% of fixed principal, not peak equity. Report additional equity-based percentages only with explicit denominators.

## Matched search and bounded effort

Use the established quasi-random screen, evolutionary islands, multiobjective promotion, neighborhood rungs and refinement. Protect Rise/breakout, meaningful gate/eligibility/exit structures and both-symbol exploration; preserve profit-based promotion alongside robustness. Use canonicalization and funded-ledger deduplication, with actual coverage counts.

Freeze matching budgets, candidate-generation method, neighborhood fidelity, selection rules and evaluation conditions before results. Use paired random seeds and common initial proposal designs where possible; subsequent adaptive proposals may diverge by lifecycle, as they should. Use at least two search seeds within each arm to expose search variability, and report seed-level results.

Planning allocation:

| Lane | Base new center proposals | Maximum |
|---|---:|---:|
| Independent, per lifecycle per cutoff (C19, C21, C23, C24) | 8,192 | 16,384 |
| Informed, per lifecycle at C24 | 4,096 | 8,192 |

Across three lifecycles this is **110,592 base proposals**, up to **221,184**. Use a hard total planning ceiling of **3 million fresh backend simulations**, including centers, neighborhoods, parity, diagnostics, cross-tests and final evaluation. Archive hits are separate. Pilot real L1/L2 throughput, which may differ from L0, before freezing the operational budget.

If the planning values do not fit the cap/runtime, reduce all comparable arms symmetrically before freeze and report the coverage implications. Do not quietly give L0 more evaluations because it is cheaper. Reserve sufficient effort for verification and fresh confirmation before allocating search. Archive audit alone is not a substitute for the matched search.

Use synchronized extension rounds: if any lifecycle meets the frozen development-only progress trigger, give all three comparable arms the same extra proposal allowance, up to their common cap. Keep independent/informed budgets separate. No validation-based extension, extra seeds after disappointment, or extra tuning of the favored lifecycle. Report matched center proposals and actual backend costs; equal proposals do not imply identical CPU time.

Stop at the declared cap, lack of progress under the common policy, a resource guard or a declared validity/futility condition. Budget exhaustion is not convergence. Do not launch a larger second experiment automatically.

## Dates and chronological evidence

- All optimization, refinement, ranking and choices: **2016-01-04 through 2024-12-31**.
- Frozen validation: **2025-01-02 through 2026-10-30**, after verifying complete canonical data for both symbols. Do not extend dates silently.
- This is previously examined history, not an untouched holdout. Existing known outcomes and informed seeds must be disclosed.

Use physical data doors and hashes. Preserve actual and virtual positions and state continuously across period boundaries; report validation marked-net change from year-end 2024, reset validation DD and full-run DD separately.

Repeat the entire independent search/selection separately under each lifecycle at C19, C21 and C23, evaluating the frozen picks in 2020–2021, 2022–2023 and 2024. Commit each selection before its next slice opens. Use common budgets across cutoffs and lifecycles. Earlier-cutoff ranges/seeds must not inherit later-selected phenotypes. If independence cannot be defended, label the specific limitation rather than presenting an informed test as independent.

Construct separate continuous sequential policy paths for L0, L1 and L2 using verified transition semantics. Do not choose the winning lifecycle retrospectively in each slice and splice those winners into a fictitious achievable portfolio. No fourth adaptive lifecycle-switching policy is authorized. Account for transitions, open lots, costs and reservations exactly; show peak/trough/recovery and the positions causing major DDs.

## Selection, confirmation and cross-testing

Use the standard's actual-profit, robust-profit, balanced and lower-drawdown roles. Freeze exact formulas and common gates. **Primary selection: highest development center net among qualified candidates**, with the qualifying-incumbent fallback in informed lanes; also preserve the independent primary and other roles. A no-qualified-candidate result is allowed. No activity or concentration veto, automatic worst-episode deletion, new tail-severity gate or arbitrary requirement to trade every year.

Use separate selection and fresh independent confirmation families, ordinarily 384 draws, with matching per-gene perturbations across lifecycles. Report p10/median net, p90/p95 DD, breach frequency/uncertainty, mean excess and worst-10% mean/worst DD. Preserve original qualification verdicts; do not require strict superiority on every noisy metric to describe an attractive trade-off. Do not claim a tiny estimated p90 difference establishes superiority.

Freeze a small comparable export set per lifecycle, chosen from development roles and structural diversity, before cross-testing. Required comparisons:

1. **Fixed controls × L0/L1/L2:** reproduce the direct effect found in 5A, plus exact newer controls such as C4-refined.
2. **Own-lifecycle winners:** compare what equal-budget optimization finds separately under each model.
3. **Full cross-test matrix:** run every frozen exported phenotype unchanged under all three lifecycles. A row is one exact phenotype; columns are L0/L1/L2. This separates lifecycle effects from phenotype effects and their interaction. Use matched neighborhood draws for the principal cross-comparisons, not just center results.

Freeze these policies in advance. Cross-tests are report-only and cannot trigger further tuning or swapping the primary. Export corresponding independent role holders at earlier cutoffs for the same bounded matrix. Distinguish practical informed results from independently searched comparisons.

Keep all common engine/accounting assumptions fixed. Verify every exported identity. If a book gets no funding or has no refusals, explain why lifecycle equality is unsurprising; do not count identical behavior as evidence of an improved funding rule.

Before outcomes, define evidence labels: repeatable improvement, conditional profit/risk trade-off, no material difference, harmful, or inconclusive. An overall claim requires more than a favorable C24 center: consider matched-seed variability, development neighborhoods, repeated subsequent periods and whether the fixed $35,000 budget holds. A failed chronological path remains a failure even if the final informed candidate looks attractive. Report all arms; do not reclassify the winner after validation.

## Mechanism and audit lessons

For selected candidates and meaningful differences, report the causal chain:

- signals, filter/eligibility outcomes and fresh versus continuation decisions;
- real refusals and the occupant causing each;
- L0 virtual holding versus real capital idle time;
- L1 fresh opportunities and L2 retained opportunities, expiry, invalidation and eventual fills;
- Growth P&L gained/lost, D1/VGT/GDX trades displaced or newly admitted, costs and exposure.

Hypothetical trade profits are not an achievable sum. A late entry uses the actual later price, stop initialization and holding clock. Explicitly determine whether the optimized alternative changed entry selectivity/continuation/exits to exploit its lifecycle, or merely found a different lucky historical episode.

Report neighborhood episode overlap and profit concentration beside parameter stability for principal role holders, reusing detailed training outputs where available. Overlapping leading episodes alone do not prove total dependence: show profit contribution as well, with sensible handling of negative or near-zero denominators. Disclose clipped parameters/draws and distinct ledgers. Do not introduce the audit proposal's 80% overlap as a universal qualification threshold.

Investigate eligibility semantics with the verified rule, not an assumed fix. A sparse strategy can be valid, but identical inactivity in its neighbors is not evidence of profit persistence across regimes. Audit findings are reporting/interpretation guidance; failed experimental rankings remain unadopted.

## Verification and resources

Before large runs reproduce L0 against canonical and archived results, and L1/L2 against 5A. Test standalone no-refusal identities, D1-only identity, causal-prefix equality, capital/interest reconciliation, simultaneous decisions, reservations, partial exits, year boundaries, gaps, minimum-strength eligibility and native-eligibility refusal consumption, L2 supersession/expiry, and continuation rights only from actual funded exits in L1/L2.

If reusing 5A's fixed-point/oracle replay implementation, verify convergence, uniqueness against the independent causal reference, prefix equivalence and failure detection across varied random searched configurations. A non-convergent or mismatched evaluation is an explicit engine failure, never a favorable fitness or an unreported skipped candidate. A parity failure stops dependent stages. Do not compare optimized arms on different approximations or minute-DD fidelity.

Apollo has 64 GB RAM. Benchmark safe worker counts/cache sizes, including the more expensive lifecycles. All simultaneous heavy work must share aggregate **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0**, with Claude/tmux outside and headroom for other host processes. Never launch three separately capped 48G workloads without aggregate containment. More memory is welcome when throughput improves, not as a usage target.

Bound queues/caches, persist results, checkpoint RNG/search state at least once a minute, and verify identical recovery after graceful stop, worker death and whole-unit kill. Test duplicate concurrent evaluation keys. No OOM restart loops; heap limits alone do not cap external/typed-array memory. Report actual resources and stopping causes per arm.

## Final evaluation and delivery

Before opening any new validation outcomes, seal and commit all C24 selections, cross-test subjects, validation tests and report-only perturbations. Evaluate continuously through the endpoint once; no tuning feedback or validation-selected replacement. A predeclared futility stop may avoid unnecessary validation, but must be symmetric and cannot use poor L1/L2 fixed-control results alone to cancel their optimization—the purpose is to allow adaptation.

Backend only: no Strategy Lab, its browser/UI, endpoints, cache or database. No charts, screenshots, SVGs, dashboards, HTML visual reports or PDFs. Deliver Markdown analysis/tables and machine-readable artifacts, properly formatted dollars and complete parameters.

Deliver protocol/adoption, amendments, exact phenotype/lifecycle identities, frozen selections, search coverage and counts, cross-test matrices, trade attribution, code/data hashes, archive manifest, reproducible commands and recovery checkpoint. Report development, validation and full-history net/DD separately, plus exposure, holding periods, trades/episodes and open marks.

Answer directly:

1. Did optimization for L1 or L2 improve on freshly optimized L0 under matched effort?
2. Was any gain a repeatable lifecycle benefit, phenotype adaptation, their interaction, search variability, or concentration in one episode?
3. Did the earlier-cutoff selection paths improve and stay within budget?
4. Did altered Growth participation displace more valuable D1 or VGT opportunities?
5. What should remain the research baseline, and what remains uncertain? Do not imply deployment approval.
6. What does this change about the next Growth-for-other-ETFs stage?

Update the roadmap: process audit complete; this matched lifecycle experiment is the approved next study, separate from the failed ranking-formula audit. Priority 5A remains complete and unchanged. **After this study's review, Growth suitability screening for other ETFs is the next planned stage, followed by focused optimization of promising ETFs.** Priority 4B and broader allocation/reassessment/preemption studies remain deferred and are not prerequisites for the ETF stage. Nothing starts automatically.

Commit task-related work and **push the branch without routine confirmation**, verify remote/local agreement, and report a genuine blocker if completion/push is impossible. Do not merge, deploy, force-push or include unrelated work. Stop for user review.
