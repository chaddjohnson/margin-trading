# Priority 5A, brought forward — funding behavior and fixed portfolio combinations

## Assignment and user decisions

Implement and run a **bounded comparison of funding behavior using unchanged phenotypes**, before the larger Priority 3B optimization. Priority 3A is complete. The user has agreed to bring forward this relevant part of Priority 5, while keeping the existing model as the benchmark.

One purpose of the roadmap is to determine which shared-capital combination works, including:

- VGT+GDX D1 + GDX-only Growth;
- VGT+GDX D1 + VGT-only Growth;
- VGT+GDX D1 + VGT+GDX Growth.

All three are legitimate subjects. Do not exclude a three-component system simply because it lacks one Growth book. Both strategy families must be represented in a combined system; equal activity or funding every possible component is not the objective.

This task must also provide a **matched standalone neighborhood assessment** of the existing GDX Growth configuration and VGT Growth #4 and 08500a60. The user also wants a dedicated **standalone GDX Growth optimization under the improved process**. Record that as the first stage of Priority 4, followed by GDX D1+Growth optimization. It is worthwhile research, not something this fixed-phenotype comparison can replace. Do not launch that search or Priority 3B in this task.

Proceed through implementation, protocol freeze, verification, bounded evaluation, reporting, documentation, commit and push. Stop for review afterward. Resolve routine engineering choices autonomously. Negative or inconclusive results are valid completions.

## 1. Reporting preference — no visuals

**Use written analysis, Markdown tables and machine-readable results only. Do not create charts, plots, SVGs, screenshots, images, dashboards, HTML visual reports, PDFs or other visual artifacts. Do not spend time rendering or inspecting report graphics.** The user explicitly requested this preference for future work.

Record it in the persistent project/reporting instructions and applicable research documentation/template, reconciling older instructions that permit or request charts. Preserve existing artifacts; do not delete old visuals. Update the standard's registered version/change log if changing that document, using its governance rules. This reporting preference is authorized now; it does not need another approval question.

## 2. Repository, evidence and governance

Locate the Apollo margin-trading repository; inspect current work, instructions and branch dependencies. Use a dedicated branch/worktree and new study directory, preferably `research/vg-growth-funding-lifecycle/`. Preserve unrelated work, application data, sealed studies and their historical classifications.

Read in full the applicable `CLAUDE.md`, `AGENTS.md`, context-recovery guide, current registered `docs/research/OPTIMIZATION_STANDARD.md` (Priority 3A introduced 1.1.0), protocol template and roadmap. Read the actual records and implementation from:

- `research/vg-d1-growth-diagnostic/`, especially REPORT.md §1–§5, refusal timelines, archive audit, neighborhood evidence and source observer;
- `research/vg-d1-growth-joint/`, including its pool engine, fixtures, control manifest, frozen selections and parity checks;
- `research/vgt-d1-growth-joint/` and `research/vgt-d1-growth-separate-pooled/`;
- Study 8's VG #2 Balanced and canonical D1 allocator;
- the canonical Growth engine and `growth140-vgt-stable` evidence for 08500a60;
- the Priority 1 eligibility study, particularly the difference between a delayed trade's own profit and its portfolio displacement cost.

Copy this brief into the new study. Adopt the applicable standard, create the protocol/adoption manifest, and pass the research preflight. This is a **fixed-arm architecture comparison and diagnostic, without a parameter search**. Do not repeat full historical-cutoff optimization searches simply because this experiment implements new behavior. Record the scope and any standard departure explicitly, citing this brief's bounded-comparison instruction; do not claim chronological reliability of a search procedure that was not tested here.

Freeze exact subjects, lifecycle rules, diagnostics, perturbations, budgets, comparisons and interpretation rules before substantive performance results. Engineering pilots must not tune rules from profits. Preserve amendments and stop dependent work on parity failure.

Everything runs in the **backend on Apollo**. Do not launch, operate, modify or query Strategy Lab, its HTTP endpoints, browser, preview cache or application database. Use canonical engine modules directly and existing research artifacts. No broker access, deployment or live trading.

## 3. What Priority 3A established, and what remains unknown

Keep the causal distinctions intact:

- Most selected GDX Growth books produced few or no decisions because of their filters/gates; their few decisions often met genuinely occupied capital.
- Initial coverage of GDX-funded configurations was substantial. Do not assume that missing broad coverage explains the result.
- A short GDX trade could refuse a long VGT Growth trade, after which the unfunded VGT position kept the book virtually invested for hundreds of actual idle sessions. This can penalize admitting GDX in the optimizer's development objective.
- The Rise-entry VGT books had almost no new crossings during some of those idle periods. Merely remaining flat does not necessarily create an entry. Preserving an opportunity is a different rule and must be tested separately.
- Neither the diagnostic nor this brief establishes that any alternative will make more money. Extra trades can displace better trades.

The present experiment tests those mechanisms. It must not inherit a hypothetical position's entry price, profitable exit, high-water mark, holding age or continuation rights.

## 4. Fixed subjects and exact identities

Extract full effective configurations, enabled masks, defaults, source hashes and conventions from verified records. Do not rebuild phenotypes from partial prose. Use:

- VG #2 Balanced: `S8-VG-F24-3` / `s8-vg-balanced`, its paired VGT and GDX D1 vectors unchanged.
- VGT Growth #4: `420cd989e4fa7749`.
- VGT Growth 08500a60: `08500a60ec56cfae`.
- Existing GDX Growth, Priority 3 Appendix A: `07cac3329fc7a520`.
- Shipped VGT D1 primary, as used in Priority 2's controls.

Freeze and evaluate the following core portfolio matrix:

| Label | D1 books | Growth books |
|---|---|---|
| D | VG #2 VGT+GDX | None; D1-only control |
| E — newly emphasized | VG #2 VGT+GDX | Existing GDX only |
| C4 | VG #2 VGT+GDX | VGT #4 only |
| C85 | VG #2 VGT+GDX | VGT 08500a60 only |
| A | VG #2 VGT+GDX | VGT #4 + existing GDX |
| B | VG #2 VGT+GDX | VGT 08500a60 + existing GDX |
| GP4 | None | VGT #4 + existing GDX |
| GP85 | None | VGT 08500a60 + existing GDX |
| V4 | Shipped VGT primary | VGT #4 |
| V85 | Shipped VGT primary | VGT 08500a60 |

Also evaluate the existing GDX Growth, VGT #4 and VGT 08500a60 **alone**, each on its own fixed $100,000 budget, as separate comparisons; never add their profits to represent a pool.

Include Priority 3's informed primary, independent primary and staged primary as fixed mechanism controls. Carry the 12 searched Growth-pair finalists and 16 independent joint finalists through center-level participation comparisons where distinct after deduplication. These additional subjects need not all receive expensive neighborhoods. Their identities are fixed from the archives, not selected anew by this experiment's performance.

Known L0 full-history targets under Priority 3's harmonized conventions:

| Subject | Marked net | Maximum minute DD |
|---|---:|---:|
| D | $343,175.82 | $21,303.61 |
| C4 | $401,867.24 | $21,536.85 |
| C85 | $339,905.35 | $19,821.14 |
| A | $450,270.82 | $21,536.85 |
| B | $408,898.55 | $20,801.07 |
| V4 | $271,525.33 | $19,534.41 |
| V85 | $252,359.65 | $19,556.63 |
| GDX Growth alone | $141,157.37 | $17,709.96 |
| VGT #4 alone | $145,468.46 | $14,578.10 |
| VGT 08500a60 alone | $160,974.09 | $19,344.80 |

E has encouraging development component-removal evidence, but its full-history and neighborhood results are not established by the supplied summary. Compute them; do not infer them by subtracting booked profits. Confirm whether an exact archived causal replay exists and reuse it only if the effective configuration and conventions match.

## 5. Three lifecycle arms; change Growth first

For this bounded experiment, **change Growth's response to funding refusal only**. D1's canonical shadow lifecycle remains unchanged in every arm. This isolates the Growth mechanism identified in 3A and preserves VG #2 as an exact control. Be explicit: it does not test a completely funding-aware D1+Growth engine. Changes to D1's refusal lifecycle and other allocation designs remain in the rest of Priority 5.

### L0 — current model, exact control

Preserve both families' existing virtual-book behavior. A refused Growth entry proceeds as an unfunded virtual position; that book waits for its virtual exit. Freed capital never revives the refusal. Reproduce prior ledgers and metrics exactly.

### L1 — Growth responds to actual funding; fresh canonical opportunities only

If a Growth entry request is refused for lack of capital, no invested position or funded order is created in that Growth book. It remains flat and may subsequently decide only under its canonical signal, gate, eligibility and continuation rules. **No extra capital-release signal or automatic purchase is introduced.**

Audit the existing capacity hook, including `capital_unavailable`, before reusing it. Trace the precise refusal transition. In particular:

- Does refusal consume a pending opportunity or leave it eligible under an existing policy? Does it alter crossing/rearming state? Document and test this; do not accidentally implement L2 inside L1.
- For this arm, a pool-refused decision is consumed as an entry attempt and is not queued for funding retries. A later entry must arise from a fresh canonical opportunity or another independently valid canonical trigger. Preserve future rearming/renewal rules explicitly; do not reset indicators merely to manufacture a crossing.
- Native eligibility still applies to opportunities delayed by filters before a funding request. Distinguish that from retrying an already refused request.
- Only actual fills create entry price, position size, holding age, stops, post-entry highs and realized outcome. A hypothetical profitable exit cannot open a continuation window or supply other post-exit state.
- Keep observing market data causally while flat. No entry price or stop may depend on what would have happened to the refused position.

Audit whether the capacity hook matches these semantics; implement a bounded adapter/state-machine change if it does not. Do not claim that deleting rejected trades from a cached standalone ledger implements L1. Subsequent decisions must evolve from the new causal state on the merged timeline.

### L2 — L1 plus one explicitly bounded preserved opportunity

Test a separate retry policy for a **valid Growth base-entry request refused because the pool is occupied**. This is an experimental entry-policy addition, not unchanged native eligibility. Include refused base entries originating from native latched opportunities; keep continuation-entry refusals under L1 in this first experiment to avoid adding another new continuation policy.

Use one fixed policy, with no grid or optimization of its settings:

- Preserve at most one refused opportunity per Growth book, keeping its origin and rejection timestamps, original decision price and relevant causal setup state.
- Maximum age: **20 trading sessions from the original refused decision**. Do not renew this clock because capital remains unavailable or because another request fails. If the originating setup has an earlier native expiry, retain that earlier bound.
- Maximum price extension at reconsideration: **5% above the original refused decision price**. This is a price guard at the new decision, not a promise about a later opening gap or an order filled at the old price.
- Reassess on the book's ordinary completed signal-bar schedule while flat, with the pool actually available. Capital release merely makes funding possible; it does not itself create an immediate fill.
- Require the currently valid entry predicate, adequate history, applicable trend/recovery gates and the retained setup's invalidation rules. The historical crossing is what was preserved; do not require a new crossing for this same opportunity, and do not confuse a true predicate with an unconditional buy instruction.
- Freeze exact predicate, invalidation, expiry and priority behavior for Rise and breakout before results. Where the native engine has no retained-setup rule, specify a conservative causal rule explicitly rather than inventing it while examining outcomes.
- A fresh canonical entry decision has precedence; funding it consumes any retained opportunity. Clear retained state on its expiry, invalidation, actual entry or otherwise terminal outcome. Prevent duplicate requests/orders.
- On a valid new decision, reserve capital and fill at the next eligible actual trade under canonical execution rules. Initialize the actual position from that fill. Never backdate it or inherit a virtual trade's high, age, stop or exit.

The 20-session and 5% constants are fixed experimental design choices, not optimized values or a new production default. Report their limitations and do not change them after seeing performance. Implement L2 consistently even where the frozen phenotype has native eligibility OFF; label this deliberate extra policy in every result. Do not alter the phenotype JSON to conceal the lifecycle override.

## 6. Shared accounting and state-machine verification

Across L0/L1/L2 keep the exclusive funded slot, $100,000 principal limit, no compounding, no preemption, costs, interest, reservations, canonical event ordering, symbol/family tie priority and partial-exit capacity semantics unchanged. A retained funded remainder still occupies the slot. An actual position is never terminated merely to help a competing signal.

Use the same calendar, minute data and arming conventions as Priority 3 for primary comparisons. Reproduce native VG #2 separately to explain the native-to-harmonized bridge. No invented fills in missing data.

Before performance evaluation, prove:

- L0 parity for the historical controls and representative configurations, with no changes to sealed prior records.
- D1-only D is identical across arms; standalone Growth is identical where the allocator never refuses a valid entry. Investigate any difference, including one caused by same-instant exit/reservation ordering, instead of assuming it harmless.
- Single-book and single-family reductions, accounting reconciliation and strict capital limits.
- Synthetic cases for refusal followed by release, zero new crossings, a fresh crossing, native eligibility, breakout decisions, expiry, invalidation, repeated refusal, next-open gaps, tied requests, pending orders, partial remainders and year boundaries.
- No continuation rights from unfunded hypothetical profits; no use of future bars; stable decisions on shortened data prefixes.
- Event traces identify the first divergence from L0 and reconcile the subsequent actual funded portfolio.

Stop dependent stages on unexplained mismatch. Test new behavior meaningfully; distinguish known failures from regressions, and ensure containment units include the executable PATH required by the test runner.

## 7. Windows, frozen evaluation and interpretation

- Development/backtest: **2016-01-04 through 2024-12-31**.
- Validation reporting: **2025-01-02 through 2026-10-30**, the verified common complete endpoint. Do not imply unavailable later dates were tested.
- Continuous run and state across the boundary. Validation net is the change in marked net from the 2024 year-end close. Show both reset validation DD and full-run DD.
- Existing data and incumbents have already been examined: label this a retrospective comparison, not an untouched holdout.

Freeze all three arms and subject identities before development evaluation; freeze and commit the full-history evaluation manifest before opening new validation results. Carry the prespecified arms through reporting rather than choosing the best-looking validation configuration. Use development evidence for any provisional recommendation; validation can challenge that recommendation but cannot trigger a new rule, rescue search or revised retry parameters.

There is no parameter optimization, no new phenotype selection and no full search at historical cutoffs in this task. Describe any development-based architecture preference as provisional evidence on known configurations. Failure under fixed phenotypes does not prove that an architecture could never work after optimization; improvement on one informed subject does not establish a universally better method.

Center minute DD remains compared with **$35,000 on the fixed $100,000 budget**. Preserve A and B's original failed Q3 labels and the user's acceptance of them for consideration. Do not discard their comparison rows, automatically fail the experiment because of a modest p90 overage, invent a new tolerance, or claim a future drawdown guarantee.

## 8. Matched neighborhoods and standalone assessment

For E, C4, C85, A, B, GP4, GP85, V4 and V85, run the same frozen **384-draw development parameter instrument** under each lifecycle. Reuse identical effective parameter draws across L0/L1/L2; compare paired changes. Hold the lifecycle and L2 policy constants fixed. Changes in parameter dimensionality between different portfolio combinations must be disclosed.

Keep D's neighborhood as a reference; its result should not change across arms. Regenerate archived evaluations only when they cannot be reused with verified identity/conventions.

Separately assess standalone existing GDX Growth, VGT #4 and VGT 08500a60 using a common, explicitly specified family-level instrument: the same distribution, compatible relative/grid radii, sample count, seeds, boundary treatment and rules for inactive/categorical parameters. Because the active vectors differ, disclose the remaining mismatch. Freeze this instrument before results; do not move radii to flatter a subject. If reproducing an older instrument as well, label those figures separately.

Report median and p10 net; median, p90, p95, worst and worst-10%-mean minute DD; breach frequency and conditional severity; clipping; distinct parameter vectors and ledgers; and sensitivity to radius where already available or within the bounded manifest. Parameter perturbation frequencies are not future-market loss probabilities. Do not present ordinary independent-sample confidence intervals as exact for dependent Latin-hypercube draws; state assumptions or report dispersion without unsupported precision.

Give a direct answer: which standalone configuration has stronger *matched* local stability evidence, what trades drive the differences, and what remains unknown about standalone GDX discovery. None may be called the globally best standalone phenotype from this test.

## 9. Budget, resources and recovery

This task includes real engine work but remains a bounded comparison. Reuse existing artifacts and cache exact identical evaluations. Freeze a countable run plan before substantive stages. Default ceilings: **20,000 fresh development simulations and 200 full-history center simulations**. No full-history neighborhood sweep, no evolutionary/random search, and no tuning of the L2 constants. These ceilings cover the core neighborhoods, parity/reproduction work and fixed center comparisons; operational retries must be disclosed. Do not consume a ceiling merely because it exists.

Core subjects and standalone assessment take precedence over optional radius/extra-finalist neighborhoods. If the budget cannot cover optional work, disclose that before running it; do not silently reduce the required 384-draw confirmations or launch a broad search.

Apollo has 64 GB RAM. All heavy concurrent jobs share aggregate **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0** containment outside Claude/tmux. Retain bounded queues/caches, disk archives, deterministic checkpoints and worker-failure handling. Use more resources only where useful and measured; do not allocate memory to fill RAM. Test graceful stop and worker/unit failure with identical resumption. No OOM restart loop.

## 10. Required report — tables and explanation only

Provide readable paired tables by portfolio and lifecycle, for development, validation and full history:

- Net marked P&L, realized/unrealized split, minute DD in dollars and percent of fixed budget, peak/trough/recovery dates.
- Funded episodes and wins/losses, partial exits separately, exposure, interest/costs, holdings at the endpoint.
- Requests, refusals, retries, expired/invalidated opportunities, fills by source and component.
- Idle-capital time, time occupied by actual positions, and the elimination or persistence of unfunded virtual holds.
- Neighborhood comparisons and risk severity, with paired gains/losses against L0.

Explain the specific VGT 2016 and 2020 refusal episodes from Priority 3A. Did L1 produce a fresh opportunity? Did L2 preserve a still-valid one? What price/time actually filled, which stops/exits followed, and which later D1/Growth trades were displaced? Do not attribute all extra-trade profit to the lifecycle without rerunning the complete portfolio.

Explicitly answer:

1. Under unchanged phenotypes, which of **VG #2 + GDX Growth**, **VG #2 + VGT Growth**, and **VG #2 + both Growth books** has the strongest profit/risk evidence under each lifecycle?
2. Does changing Growth's refusal lifecycle help, hurt or do little? Separate fresh-signal effects from L2's deliberate preserved-opportunity rule.
3. Did admitting GDX become less costly to VGT without displacing more valuable D1 trades?
4. Does E offer a useful simpler alternative to A/B/C4/C85? Do not assume its encouraging development ablation generalizes.
5. How does standalone GDX Growth's matched neighborhood compare with VGT #4 and 08500a60?
6. Which lifecycle(s), if any, deserve optimization in 3B? Are results sufficient to recommend one, or should multiple models remain explicit comparison arms?
7. What is the scope of the planned standalone GDX Growth search and how will its winner be evaluated as a potential pooled component without assuming standalone superiority implies pooled superiority?

Report negative outcomes and uncertainty plainly. More trades, greater GDX participation or fewer idle sessions are explanatory metrics, not success criteria by themselves. Do not force all four components to trade to manufacture diversification.

## 11. Documentation, roadmap and delivery

Document the new lifecycle rules as experimental study-specific policies, with state transitions and source references. Do not silently change the production/canonical default. The accepted sequencing supersedes the old blanket deferral: **the bounded Growth-lifecycle comparison is now authorized before 3B**; automatic replacement of the current model is not.

Update the roadmap to:

1. D1 entry eligibility — complete.
2. VGT D1+Growth and follow-up — complete.
3. Initial VGT+GDX study and 3A diagnostic — complete.
   - **Current: Priority 5A, brought forward:** this bounded funding-behavior/portfolio comparison and standalone neighborhood assessment.
   - **Next, subject to review: Priority 3B:** larger-budget portfolio optimization using the evidence from 5A; retain all three portfolio combinations as meaningful alternatives rather than excluding a missing Growth book by definition.
4. **4A: dedicated standalone GDX Growth optimization**, followed by **4B: GDX-only D1+Growth optimization**. Use 2016–2024 for all optimization/selection and frozen 2025–2026 validation, under the current standard, with independent discovery and informed refinement around the existing GDX control. Do not start either here.
5. Remaining alternative pooling/funding work, including D1 funding-aware state and allocation/capacity alternatives if still worthwhile — not started.
6. Other ETFs for Growth — not started.

Record the user-authorized expanded objective of comparing the three portfolio combinations, the standalone GDX search, the brought-forward comparison and the no-visuals preference. Update the authoritative standard/template where appropriate through registered versions and change logs; preserve completed studies' pinned versions. New hard risk thresholds or a production lifecycle change require a concrete proposal for review, not unilateral adoption.

Deliver the protocol/adoption/freeze manifest, exact subject vectors, implementation and tests, machine-readable results, Markdown report/tables, amendments, archive hashes, reproducible commands and recovery checkpoint. Verify historical seals and note any missing optional evidence.

Commit task-related code, docs and appropriate artifacts; **push the research branch without routine confirmation**, verify remote/local commit equality and report branch/hash. Preserve unrelated work; do not force-push, merge into main, deploy, publish externally or modify the user's application data. Explain any concrete blocker rather than asking generic permission.

Finish with the findings and the specific next task recommended. Do not automatically begin 3B, 4A, 4B or further Priority 5 work.
