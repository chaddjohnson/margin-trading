# Priority 3 — D1 + Growth for VGT and GDX in one shared capital pool

## Assignment and authorization

Implement and complete Priority 3: optimize a combined **D1 + Growth system trading VGT and GDX through one shared $100,000 capital pool**. Execute the research in the backend on Apollo, following the repository's optimization standard. Complete implementation, verification, search, qualification, frozen validation and reporting. Stop for review afterward; do not start Priority 4 automatically.

The user wants both strategy families in the combined product. The four enabled components are D1–VGT, D1–GDX, Growth–VGT and Growth–GDX, with separate parameter vectors. Evaluate their actual funded portfolio, never the sum of independent backtests. Verify actual participation by family and symbol; report any component that receives no funding or has negligible or negative causal contribution. Do not impose equal allocations, profits, trade counts, or arbitrary minimum activity. Single-family systems are controls, not substitutes for the requested combined result.

The objective is higher net profit with credible stability within **maximum minute drawdown of $35,000, measured against one fixed $100,000 principal budget**. This is 35% of the fixed budget, not 35% of peak equity. Historical compliance is not a future drawdown guarantee.

Proceed autonomously through the authorized work. Resolve routine implementation and study-specific choices before freezing the protocol. A negative result is a valid completion. Do not repeatedly request permission for the searches, documentation, ordinary fixes, commit or push already authorized here.

## 1. Read, preserve and adopt

Locate the Apollo repository and inspect its branch, working tree and applicable instructions. Use an isolated research branch/worktree, preferably `research/vg-d1-growth-joint`, and a new study directory such as `research/vg-d1-growth-joint/`. Bring required prior research into that branch through normal, non-destructive Git operations; do not assume all prior branches have been merged into main.

Read in full:

- `CLAUDE.md`, `AGENTS.md` and `docs/claude/context-recovery.md`.
- `docs/research/OPTIMIZATION_STANDARD.md`, its version registry, `STUDY_PROTOCOL_TEMPLATE.md` and `ROADMAP.md`.
- Study 8's methodology, protocol, optimizer, canonical runners, selections and VG #2 Balanced configuration.
- `research/growth140-vgt-stable/`, including the complete settings and evidence for `08500a60ec56cfae`.
- `research/growth140-vgt-s8m/` and the canonical Growth #4 configuration.
- `research/vg-balanced-entry-eligibility/` for accounting, displacement and operational lessons.
- `research/vgt-d1-growth-joint/` and its engine, protocol, immutable controls, selection and results.
- `research/vgt-d1-growth-separate-pooled/`, especially its report and comparison manifest.

Read the implementation behind the records, not only their summaries. Preserve completed studies and their sealed artifacts. Do not rewrite historical protocols to fit new rules.

Adopt the current registered optimization standard, record its version/hash and the study protocol in `STANDARD_ADOPTION.json`, and pass the existing research preflight before substantive research stages. Integrate the preflight into the new runner. Use the existing protocol template and amendment/version procedures. Do not silently change the global standard. This brief resolves the current scope decisions; it is not authorization to weaken the standard after seeing results.

### Persistent delivery instruction — fix the earlier omission

Record the following standing preference prominently in `CLAUDE.md`, with the applicable link from `AGENTS.md` and delivery instructions:

> At completion, commit task-related work and push the task's branch to its configured remote without asking for routine confirmation. This applies to research, documentation and negative results. Stage only task-related changes, preserve unrelated work, and exclude secrets and inappropriate large data artifacts. Verify the push and report branch and commit. If a concrete problem prevents a safe push, preserve the work and explain the blocker. Do not force-push, merge into main, deploy, or publish outside the repository without separate authorization.

Reconcile obsolete routine-push-confirmation instructions. This request authorizes recording the preference now and committing/pushing this study at completion.

## 2. Backend only; preserve the current pooling behavior

All evaluation and optimization must use backend code, canonical data and command-line research runners. Do not operate, launch, modify or use Strategy Lab, its HTTP endpoints, Interactive Preview, preview cache or browser automation. Importing its canonical engine modules directly is appropriate. Backend-generated report charts are allowed; keep them secondary to the research.

**Preserve the current independent virtual-book/shadow-trade semantics throughout Priority 3.** A refused entry still starts the component's virtual trade. Funding does not feed back into that book. The component waits for the virtual exit before generating subsequent decisions under its canonical rules. Freed capital does not replay the refusal or turn it into a delayed purchase. Explain this clearly in the report and test it explicitly.

The user intentionally deferred alternative pooling and funding behavior until Priority 5. Do not implement funding-aware flat state after refusal, new reassessment triggers, delayed funding of virtual trades, preemption, reserved-capital schemes, or new position-sharing architectures in this study. Do not describe the existing virtual lifecycle as an accidental implementation bug.

Use **architecture A, one exclusive funded slot**, as the primary combined architecture, consistent with VG #2 and the strongest Priority 2 benchmarks. Preserve canonical reservations, execution timing and no-preemption rules. Freeze an exact deterministic ordering for simultaneous decisions across the four books. Existing deterministic priority choices may be evaluated on development if explicitly included in the protocol; preserve the original ordering for unchanged controls. Do not introduce a new opportunity-ranking model. Existing architecture B evidence may be referenced, but redesigning or searching capacity-sharing schemes belongs to Priority 5.

Growth's **native entry eligibility may be ON or OFF** in its parameter search. It operates within Growth's canonical virtual lifecycle; it does not preserve a pool-refused purchase for later funding. D1's added delayed-entry eligibility remains OFF following Priority 1. Canonical partial exits, trend retention, continuation rules and initial stops remain legitimate Growth phenotype options. A partial exit does not open a second funded slot under A while any funded remainder remains.

## 3. Dates, economics and provenance

- Development/backtest, optimization and all selection: **2016-01-04 through 2024-12-31**.
- Validation: **2025-01-01 through 2026-10-30**, using actual sessions (first session 2025-01-02).
- Verify that VGT and GDX both have complete canonical data through the common endpoint. If not, use the common complete earlier endpoint and disclose it. Do not silently extend the endpoint or imply all of calendar 2026 exists.
- Continuous simulation across the development/validation boundary; no liquidation or state reset. Validation net is the change in marked net from the 2024 year-end close. Report reset validation DD and whole-run DD separately.
- One fixed $100,000 principal budget, no compounding or second family budget. Reuse the verified 5 bps per side and 11% simple annual interest conventions, exact day count and canonical fill rules. Document shares, dividends, splits, warm-up and arming dates.
- Reproduce native controls before harmonizing assumptions. In particular, VG #2's native arming date is 2017-06-15; do not silently change it and still claim native parity. Freeze one common convention for fair comparison and report the native-to-harmonized bridge.

This validation history has already been examined. Say **“validation on previously examined history, not an untouched holdout.”** Record known incumbent outcomes and their selection histories. Do not use new validation results to choose settings, architecture, ranking, search extensions or a replacement primary. Freeze and commit the shortlist, primary, roles and validation plan before opening new validation results. Initial parity and pilots can use development data; compare known full-history targets at the final validation stage without using them to steer the search.

## 4. Required comparison arms

**Combining unchanged phenotypes and refining phenotypes are separate experiments.** Do not overwrite the former with the latter or assume refinement must improve it.

### A. Existing controls and unchanged combinations

Preserve and reproduce:

1. **VG #2 Balanced**, the jointly optimized VGT+GDX D1 pool: alias `s8-vg-balanced`, configuration `S8-VG-F24-3`, sourced from `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`. It is not Study 7's similarly named pool. Keep its paired vectors and allocator conventions together.
2. Growth #4, canonical ID `420cd989e4fa7749`, and Growth `08500a60ec56cfae` for VGT. Extract complete effective vectors from verified repository artifacts; never reconstruct them from a few quoted parameters.
3. The existing VGT-only combinations: shipped D1 primary + Growth #4, and shipped D1 primary + Growth 08500a60, under their frozen Priority 2 architecture A conventions. They are external scope comparators, not four-component systems.
4. **Unchanged expanded combinations:** VG #2's two D1 books plus the existing Growth books in the final shared allocator. Include one version with VGT Growth #4 and one with VGT Growth 08500a60. A previously browser-selected GDX Growth configuration is transcribed in Appendix A as a reproducibility target and informed control. Recover its complete canonical effective vector and verify it before use. Do not fabricate missing settings or treat its full-history selection as independent discovery.

If the Appendix A configuration cannot be reproduced, document why. Still run the verified three-component controls (VG #2 plus each VGT Growth incumbent), clearly labelled as such. Do not silently invent a GDX incumbent or block all independent research over an unavailable optional archive. The mandatory canonical engine and verified-control parity gates still apply.

Freeze the control manifest and unchanged combinations before examining their new pooled results. Their original phenotype vectors stay immutable, even if the joint-refinement arm later finds useful changes.

### B. Optimize a Growth VGT+GDX pool, then combine as-is

Jointly optimize **both Growth symbol vectors together** on their executed Growth-only shared-pool result. This is a paired ETF optimization, not two standalone ETF winners added together. Protect Rise and breakout coverage, with meaningful gate, eligibility and exit variation.

Select a small, explicitly bounded Growth shortlist on development, with actual-profit, robust-profit and balanced representatives under the frozen rules. Then pool those unchanged Growth pairs with the **unchanged VG #2 D1 pair**, using the final single shared $100,000 allocator. Report the Growth-only result and the combined result separately. Any selection among these combined systems uses development only and is part of the disclosed staged procedure.

No fresh standalone D1 optimization is required merely to construct this informed staged benchmark; VG #2 already supplies the paired D1 incumbent. This does not prove it is the optimal D1 partner for Growth.

### C. Informed four-component joint refinement

Seed a separate informed arm with the unchanged controls and staged combinations. Allow all four phenotype vectors to move within the frozen space, including both D1 vectors. The objective is the **actual final pooled result**. Explore nearby regions and broader mutations; do not merely jiggle one parameter around a winner.

Preserve every as-is seed as a control. Report whether joint refinement improves profit, risk or neighborhood stability, and quantify the trade-off. Refinement is an experiment, not a promised improvement or a requirement to replace the unchanged system.

### D. Independent four-component joint search

Run broad joint discovery with its own budget and provenance. Do not seed it with later-selected incumbents or narrow its ranges around their known results. Components need not be profitable alone to enter this arm. All scoring uses actual funded trades in the common pool.

Run the standard's independent chronological procedure tests as described below. Keep them separate from incumbent-informed evidence.

### Comparison and fallback rules

Compare A, B, C and D under the same evaluation, economics and risk definitions. Disclose both incremental compute and inherited search effort: Study 8's historical effort is not free matched-budget evidence. Match new search budgets where making direct method comparisons; if not matched, state that limitation. Do not claim universal method superiority from one period or one pair.

The combined informed selectable set must include qualified unchanged combined controls and staged combinations, as well as qualified refined candidates. Freeze a no-improvement fallback or include them directly under the same selection rule. A D1-only incumbent remains a benchmark even though it cannot satisfy the combined-product requirement. If no combined configuration qualifies, report no qualified combined result; do not rename a D1-only system as the requested product.

## 5. Objectives, qualification and search coverage

Apply the standard's actual-profit, robust-profit, balanced and lower-drawdown roles and four-dimensional Pareto reporting. **Use actual marked net profit as the primary rank among qualifying combined candidates**, with a deterministic tie-break frozen in the protocol. Robust-profit and balanced selections must be shown alongside it. Do not quietly substitute a robust-first winner for the actual-profit role.

Before search, specify the exact engineering, center-risk and neighborhood qualification gates, radii and independent confirmation procedure, using the existing standard and tested study instruments. Center DD must stay within $35,000. Include neighborhood lower-tail profit and upper-tail DD in qualification; justify exact thresholds before observing candidate results. Do not add activity floors, largest-winner caps, annual-profit floors, equal-family contribution rules or a new bespoke breach-rate veto because the last pair had a 7% breach share. Report the breach share, severity and worst drawdown prominently. Never relax gates after results to admit an incumbent or new winner. Incumbents failing a gate remain disclosed controls.

Use Study 8's appropriate machinery: broad quasi-random exploration, multiple independent evolutionary islands, multiobjective promotion, successive neighborhood fidelity, local refinement and a diverse shortlist. Preserve actual-profit promotion alongside robust ranking. Protect both symbols' relevant Growth structures, including mixed Rise/breakout pairs, gate ON/OFF, native eligibility and complementary exit configurations. D1's eight effective parameters per symbol are mutable in the joint arms.

Use exact incumbent values on the fine grid; canonicalize inactive genes and group identical funded ledgers. Report coverage and attrition by structure rather than advertising a large total dominated by neighborhood draws. Do not require standalone success for joint-search admission.

Budget the study in **distinct new center proposals and fresh backend evaluations**, separately for Growth-pair discovery, unchanged staged evaluation, informed joint refinement, independent joint discovery, neighborhoods and earlier folds. Size a substantial but bounded search from measured pilot throughput. Do not copy the previous 768-proposal-per-island cap without assessing coverage of this larger space. Freeze explicit extension triggers and maximum caps before search, using development progress only. Report the actual stopping reason; budget exhaustion is not convergence.

Use independent seeds for final neighborhood confirmation, with the standard's default 384 confirmation draws unless a justified study-specific adaptation is recorded before results. Report both whole-pool and family/symbol perturbation scopes, narrow/wide radii, clipping, distinct configurations and changed ledgers. Separate numerical parameter stability from categorical toggles and chronological evidence.

## 6. Chronological testing and final validation

The main optimization remains 2016–2024 and final validation remains 2025–2026. Earlier slices are additional tests inside development, not a replacement for that split.

Repeat the complete independent search and selection at the standard's earlier cutoffs, ordinarily through 2019, 2021 and 2023, before evaluating the following 2020–2021, 2022–2023 and 2024 slices. Use the prescribed equal budgets across comparable cutoffs; freeze selections before the next slice opens. Preserve continuous accounting and explicitly define the sequential policy's transition/exit costs.

Do not seed an earlier cutoff with VG #2, #4, 08500a60, the Appendix A GDX selection, or a final C24 Growth pair. Those settings were selected with later data in view. The informed staged path may be evaluated descriptively but cannot claim independent chronological support. To make a chronological method claim about staged versus joint discovery, the staged path must regenerate every learned component using only each cutoff's data and matched budgets. Do not silently substitute known incumbents to avoid that work; if this extra procedure comparison is outside the frozen budget, limit the claim instead.

Report failed folds and failed sequential risk limits even if final neighborhood results look attractive. Freeze final C24 selections and reporting roles before final validation. Validate those selections and the controls once under the frozen plan; report failure without a rescue search. A better validation score does not authorize swapping the primary.

## 7. Engine verification and operational safety

Reuse and extend the tested pool replay and canonical adapters where possible. Prove backend parity for the D1 pair, each Growth symbol and the VGT combined controls, plus representative random configurations. Check minute-level causality and shorter-prefix invariance. If engine conventions differ, stop dependent stages and resolve the difference rather than optimizing an approximation.

Test cross-symbol calendar alignment, minute ordering, next-session entry reservations, deterministic simultaneous decisions, independent virtual and funded positions, actual capital limits, interest, partial exits, exits on gaps, year boundaries, open remainders and period/whole-run DD. Verify that single-component and single-family reductions reproduce their canonical runners. Explicitly test an unfunded virtual trade that persists after actual capital becomes free. Preserve that behavior by design.

Apollo has 64 GB RAM. The research may use more than earlier studies when that improves measured throughput, but **all concurrent heavy processes must share aggregate containment at MemoryHigh=44G, MemoryMax=48G and MemorySwapMax=0**, outside Claude/tmux. Never launch multiple uncapped or separately capped 48G workloads whose total can exhaust the host.

Benchmark several safe worker/cache settings on representative development work. Measure throughput, CPU saturation, I/O, aggregate memory and external/typed-array use; select the fastest stable configuration with host headroom. These limits are ceilings, not memory-use targets. Use bounded queues/caches, disk archives, deterministic checkpoints, tested worker garbage collection/recycling, and a pre-limit pressure guard. Node old-space limits alone are insufficient.

Pilot graceful interruption, abrupt worker failure and abrupt unit termination. Resume to identical results; failures must checkpoint/fail promptly, not hang or repeatedly restart after OOM. Keep a current recovery document with code/data hashes, commands, job IDs and precise next steps. On parity failure, halt all dependent jobs until resolved. Run relevant tests and distinguish pre-existing failures from regressions.

## 8. Results and required explanation

Provide one clear table for development, validation and full history, with proper currency formatting, comparing:

- VG #2 D1-only and Growth-only paired controls;
- unchanged fixed combined controls;
- the staged as-is combination;
- informed joint refinement;
- independent joint primary;
- the final frozen primary and other reporting roles;
- the existing VGT-only combinations, clearly labelled as a smaller-universe comparison.

For each, report full effective settings and identity, net P&L and realized/unrealized split, maximum minute DD in dollars and percent of fixed budget, drawdown dates/recovery, lots and win/loss counts, exposure, holding periods, interest, execution costs, open remainders and funding refusals. Count partial exits separately from full trade episodes so they do not inflate apparent independent wins.

Explain funded-trade chronology and capital displacement by family and symbol. Distinguish booked profits from causal family/component-removal reruns. Show the largest winning episode and its removal stress, idle capacity during unfunded virtual holds, and opportunity conflicts. An unfunded trade's standalone profit is descriptive, not profit the pool could freely add. Report whether same-time ordering actually changes trades.

Show neighborhood distributions, breach tails and chronological verdicts alongside center results. Include search coverage, budgets, consumed extensions, stopping reasons, memory/throughput measurements, parity, tests, amendments, data provenance and limitations. Charts may illustrate equity paths, drawdowns and holding periods but should not delay the core deliverables.

Answer explicitly:

1. Did a combined system improve on VG #2 under the frozen risk and qualification rules?
2. Did newly optimized combinations beat the unchanged combined benchmarks?
3. Did joint refinement improve on the same staged settings left unchanged, and at what risk/robustness cost?
4. Did both families and both ETFs meaningfully contribute? Which components displaced valuable opportunities?
5. Did the independent selection procedure work chronologically, separately from the final candidate's neighborhood stability?
6. Which result, if any, merits further investigation, and what remains unsupported?

## 9. Deliver, update the roadmap, commit and push

Deliver the protocol/adoption/freeze records, append-only amendments, canonical fixtures and full parameter exports, frozen selection, comparison tables and trade ledgers, reproducible runner commands, archive manifest/hashes, recovery instructions and a concise report. Keep large archives according to repository conventions; never silently omit the information needed to reproduce them.

Update `docs/research/ROADMAP.md` to the user's agreed order:

1. D1 entry eligibility — complete.
2. VGT D1 + Growth and its separate-then-pooled follow-up — complete.
3. **This study:** VGT+GDX D1 + Growth, with actual status and conclusion.
4. GDX-only D1 + Growth — not started.
5. Compare alternative pooling and funding behavior — not started. This includes actual-position state, persistent refused opportunities, reassessment on capital release and allocation alternatives. Preserve the current behavior through Priorities 3 and 4.
6. Explore Growth for other ETFs — not started.

Record the user's decision to defer funding-behavior changes and retain the as-is benchmark alongside joint refinement. Do not start any later priority automatically.

Commit task-related code, docs and appropriate artifacts, push the research branch without routine confirmation, verify the remote commit and report it. Do not merge or deploy. Finish with the research conclusion, selected settings/artifact paths, checks, resource use, limitations and the review points before Priority 4.

## Appendix A — previously observed GDX Growth control (informed only)

Source: the user's earlier `GDX Growth trial ledger.md`, selected preview `PV-3a29190f20a3c844263b3d4e9d17f6f7e1e7c28a8d864481c32fab0505a6610f` from R-000040. This is a historical browser-selected configuration, not an independently validated optimizer result. Do not reopen the preview or use HTTP/browser tools. Recover from backend archives if available, or map this active-setting transcription to the canonical Growth 1.4.0 schema and verify defaults explicitly.

| Setting | Value |
|---|---|
| Symbol / signal resolution | GDX / 1d regular-session bars |
| Entry | Rise from recent low |
| Advance / recent-low lookback | 3% / 22 bars |
| Entry trend filter | ON, price change over 30 sessions, minimum return −2% |
| Persistent entry eligibility | ON, time-limited, maximum age 20 sessions |
| Drawdown Recovery Gate | ON; lookback 60 sessions; decline 10%; retracement 49%; confirmation 2 sessions |
| Trailing stop | 7% |
| Maximum losing hold | OFF; its buffered intraday loss rule inactive |
| Initial risk stop | ON, 2 × ATR(20) |
| Trend retention / partial exit | OFF |
| Continuation | ON, shallow pullback + recovery |
| Continuation window | 60 sessions |
| Uptrend SMA / slope period / minimum rise | 50 bars / 10 bars / 0% |
| Pullback minimum / maximum / recovery | 1.5% / 8% / 2% |
| Standalone principal / compounding | $100,000 / none |
| Costs / interest | 5 bps per side / 11% simple annual, 365-day basis |

Previously reported native standalone figures for 2016-01-04 through 2026-10-30: **$141,157.37 net, $17,709.96 maximum minute DD, 19 closed trades (17 wins, 2 losses), flat at the end**. These are reproduction targets, not promised pooled results. Verify the whole effective vector, warm-up, dates, data and execution assumptions. Record any discrepancy; do not tune parameters to force a numerical match. Keep this control and its information out of independent search and earlier-cutoff seeds.
