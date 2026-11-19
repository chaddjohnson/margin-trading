# Priority 3A — explain missing GDX Growth participation and neighborhood risk

## Assignment

Complete a **bounded backend diagnostic** of Priority 3 before we choose the next optimization or change pooling behavior. Answer:

1. Why did the newly optimized VGT+GDX Growth pools mostly fund only VGT, although the existing Growth #4 + GDX Growth pair funded both?
2. How much is attributable to signals/filters, actual capital competition, unfunded virtual positions, search coverage, or promotion/selection rules?
3. For the unchanged combinations below, are the modest neighborhood p90 drawdown overages isolated threshold misses or symptoms of meaningful weaknesses?
4. Should we next run a larger Priority 3 search, or bring forward a bounded comparison of funding behavior from Priority 5?

Investigate and report; do not launch Priority 3B, Priority 4 or a funding-aware optimization. Preserve current shadow-trade semantics. Do not invent a new winning phenotype, retune against validation, or rewrite Priority 3's classification.

The user accepts both unchanged four-component combinations as candidates for further consideration despite their modest p90 overages. This is **not** authorization to raise the $35,000 center drawdown budget, invent a universal p90 tolerance, accept all neighboring losses, or relabel the completed study's failed gate as passed.

Proceed autonomously through this diagnostic, its documentation changes, checks, commit and push. Resolve routine choices yourself; present concrete findings and recommended next steps at completion rather than asking for routine permission.

## 1. Read and preserve the evidence

Locate the Apollo margin-trading repository and inspect the branch, worktree and applicable instructions. Use an isolated branch and a new directory, preferably `research/vg-d1-growth-diagnostic/`. Preserve unrelated changes, completed studies, their sealed artifacts and the optimization standard version they adopted.

Read:

- `CLAUDE.md`, `AGENTS.md`, and the linked context-recovery guide.
- `docs/research/OPTIMIZATION_STANDARD.md`, its registered versions, protocol template, preflight implementation and `ROADMAP.md`.
- `research/vg-d1-growth-joint/`: the brief, protocol, amendments, report, recovery record, control manifest, frozen selection, qualification/validation tables, search coverage, diagnostics, archive/cache manifests and source implementation.
- The relevant records from `vgt-d1-growth-joint`, `vgt-d1-growth-separate-pooled`, `growth140-vgt-stable`, Study 8 and `vg-balanced-entry-eligibility`.

Use exact parameter vectors, configuration identities, data hashes, execution conventions and seeds from those records. Do not infer settings from rounded summaries. Copy the present brief into the diagnostic's records. Adopt the applicable registered standard with scope `diagnostic`, freeze a diagnostic protocol/manifest and pass the research preflight before substantive work. Record any justified adaptations.

Everything runs **in the backend on Apollo**. Do not launch, operate, modify or query Strategy Lab, its HTTP endpoints, browser, preview cache or application database. Canonical engine imports and existing research archives are appropriate. Backend tables and a few useful charts are sufficient.

## 2. Subjects and known reproduction targets

At minimum compare these frozen subjects:

- **A:** unchanged VG #2 Balanced + VGT Growth #4 + the existing GDX Growth configuration transcribed in Priority 3 Appendix A.
- **B:** unchanged VG #2 Balanced + VGT Growth `08500a60ec56cfae` + the same GDX Growth configuration.
- **C:** unchanged VG #2 Balanced + VGT Growth #4, with no GDX Growth component.
- **D:** VG #2 Balanced alone.
- The fixed Growth-only pairs #4 + Appendix A and 08500a60 + Appendix A.
- Priority 3's informed primary, independent primary and staged primary.
- All 12 shortlisted newly searched Growth pairs and all 16 independent C24 joint finalists for participation accounting. Verify those counts against the records; disclose any distinction between shortlist, qualified members and reporting-role holders.

VG #2 is the paired VGT+GDX D1 configuration `S8-VG-F24-3` / `s8-vg-balanced`. Appendix A is the earlier browser-selected GDX Growth configuration, reconstructed in Priority 3 as `07cac3329fc7a520`. #4 is VGT Growth, not a GDX phenotype. Do not confuse the three different sources.

Priority 3 harmonized targets, through 2026-10-30:

| Subject | Development net | Validation net | Full marked net | Full minute DD |
|---|---:|---:|---:|---:|
| A | $310,383.36 | $139,887.46 | $450,270.82 | $21,536.85 |
| B | $291,868.34 | $117,030.20 | $408,898.55 | $20,801.07 |
| C | $302,785.91 | $99,081.34 | $401,867.24 | $21,536.85 |
| D | $268,487.02 | $74,688.80 | $343,175.82 | $21,303.61 |

Known development confirmation statistics (384 perturbations):

| Subject | p90 DD | Breach share above $35,000 | Mean excess among breaches | Worst DD |
|---|---:|---:|---:|---:|
| A | $36,277.63 | 13.3% | $4,096.67 | $55,963.54 |
| B | $35,131.47 | 10.9% | $3,674.16 | $55,963.54 |
| C | $24,448.95 | 1.3% | $8,665.93 | $51,376.11 |
| D | $24,889.27 | 1.3% | $6,478.55 | $46,682.59 |
| Informed primary | $27,369.13 | 2.6% | $42,916.79 | $103,278.13 |

A and B failed the original Q3 neighborhood rule but passed the reported validation tests. C passed the reported development and validation checks but was a three-component control, outside the final four-component selectable set. The informed primary passed development qualification and failed validation. Keep these separate from the user's willingness to consider A and B.

Confirm monetary rounding and definitions. Do not tune settings to force a match. Distinguish native VG #2 arming (2017-06-15) from Priority 3's harmonized earlier arming; use the latter for the main matched diagnostic, with the bridge clearly stated. Known values are verification targets, not permission to use validation to optimize.

## 3. Dates, scope and bounded execution

- Main diagnosis and all new parameter probes: **2016-01-04 through 2024-12-31**.
- **2025-01-02 through 2026-10-30**: retrospective explanation of already frozen subjects and already examined results. Freeze the exact subjects and questions before replaying this window. Do not select or rank new settings from it.
- Continuous accounting across the boundary. Period net is the change in marked net; report reset period DD and whole-run DD separately.
- One fixed $100,000 shared principal budget, no compounding, original 5 bps per-side costs and 11% simple interest conventions. Preserve the exclusive slot, reservations, canonical fills, virtual lifecycle and partial-exit rules.

This is a retrospective diagnostic on **previously examined history**, not independent validation or an optimization study. Do not repeat chronological searches or the broad optimizer.

Start with the existing evaluation archives, perturbation vectors and funded/virtual ledgers. Scan archives with bounded memory. Freeze a replay/probe manifest with explicit counts, deterministic selection rules and stopping limits before additional runs. The default ceiling is **4,000 fresh development simulations and 64 full-history simulations**, including regenerated missing archived evaluations; reuse cached evidence wherever possible. New one-factor/interaction probes are a subset capped at **256 configurations**. These are ceilings, not targets. If that cannot resolve a question, report precisely what remains unknown and the additional work needed; do not silently convert the diagnostic into a larger search.

Do not rerun every archived center. Full causal reconstruction is needed only for the frozen controls and a bounded, reproducibly selected set of revealing refusal and drawdown episodes. Attribute cases from existing evidence rather than searching for a flattering replacement candidate.

## 4. Diagnose GDX Growth's participation

### A. Separate the stages at which participation disappears

For each shortlisted Growth pair and independent joint finalist, show a funnel for **each symbol**, distinguishing:

1. Historical data/warm-up availability and time the virtual book is flat or invested.
2. Raw entry conditions/crossings and canonical actionable decisions while eligible to decide.
3. Filter blocks, eligibility arming/expiry/invalidation, continuation decisions and pending orders.
4. Funding requests, accepted requests, refusals and actual fills.
5. Funded episodes, principal-days, exposure, profit, holding time and end-of-period state.

For refusals, identify the actual funded component or pending reservation, the reason and the time. In Growth-only pools the competing component is another Growth book; in four-component pools distinguish D1 from Growth competition. Do not generalize a four-component explanation to the Growth-only search.

Count both all available opportunities and independent market episodes. Do not infer continuous VGT occupancy merely because GDX has zero funded lots. Report actual time invested and idle time, separately from virtual time invested.

### B. Quantify shadow-state suppression without changing the engine

For each refused GDX virtual trade in the chosen cases, reconstruct:

- Original decision/fill times and which real position prevented funding.
- Actual capital-release times and subsequent occupations/reservations.
- The virtual trade's exit, and the next canonical GDX decision.
- Overlap between actual idle-capital intervals and the still-open unfunded GDX virtual position.
- Any observable price-based conditions/crossings during those intervals and the required lookback/filter state.

Distinguish **a raw condition**, **a potential crossing**, **a valid state-dependent entry decision**, and **a funded fill**. A condition true while virtually invested is not automatically a missed valid trade. Eligibility, rearming, continuation and pending-order state can depend on previous events.

A read-only diagnostic observer may calculate completed-data predicates and timing facts. It must not change the execution state, invent fills or book hypothetical profit. If determining a fresh actionable decision requires a funding-aware lifecycle, mark that counterfactual **unresolved pending a separate implementation**, rather than claiming that the original engine would definitely have entered.

Report actual-capital blocking and extra waiting from virtual state separately. Disclose overlapping intervals and avoid double-counting. A long idle interval is evidence of potential architectural relevance, not proof of a profitable missed trade. Do not sum unfunded standalone profits as achievable portfolio improvement.

### C. Audit the search and promotion process

Trace existing archived configurations through screening, feasibility, promotion, neighborhood qualification and shortlist selection. Compare candidates that funded both Growth symbols with VGT-only and GDX-only funded cases.

Report:

- How many of each kind were proposed, evaluated, feasible, promoted and shortlisted, by entry-family structure and gate/eligibility/exit choices.
- Whether both-symbol-funded candidates were competitive in center profit, DD and neighborhood statistics.
- Whether they were rejected for actual weakness, hard gates, limited promotion slots, structural coverage or exhausted budgets.
- Whether long VGT holds dominated funding, and which GDX parameters/filters produced few opportunities.
- Whether the existing Growth pair's structure was represented and explored meaningfully in the independent and informed arms. Keep its informed provenance explicit; exact absence from an independent lane is not itself an error.

Use the existing Growth-only #4 + Appendix A pair as an important counterexample: its reported full net was $173,158.78 with $21,972.42 DD and both symbols funded. Compare development performance and trade timing, not just full-history profit. Explain why the optimizer favored its own candidates under its frozen objectives and evidence.

Do not conclude that no stable GDX phenotype exists merely because GDX was unfunded in most finalists. Conversely, a minority of profitable dual-funded configurations does not establish general superiority. Archive scans must not produce a newly selected validation winner.

## 5. Diagnose neighborhood drawdown failures

Reconstruct A, B, C and D's original perturbation instruments exactly, plus the informed primary's contrasting severe failures. Verify parameter radii, scopes, seeds, clipping, inactive dimensions, categorical treatment and identical-ledger duplicates. A cross-configuration comparison is only meaningful with those differences disclosed.

For the original draws, report center, median, p90, p95 and worst DD; the share above $35,000; mean excess conditional on breach; **mean DD in the worst 10% of draws**; and profit statistics. Define quantiles and the worst-10% calculation precisely. These additional statistics are diagnostic/report-only, not new qualification gates. Perturbation frequencies are not estimates of the probability of future market losses.

Explain the apparent contrast: the informed primary passed Q3 with rare but very severe breaches, whereas A and B failed with more frequent but generally smaller breaches. Do not describe one as unconditionally safer based on p90 alone.

Identify the parameter changes and event sequences behind representative failures:

- Mild threshold crossings near $35,000, intermediate failures and the worst cases.
- Concentration by D1/Growth, VGT/GDX, entry family, stop, maximum losing hold, eligibility, retention and continuation settings.
- The first divergence from the center's funded ledger: changed signal, changed exit, longer hold, displaced trade, cost/interest accumulation or open loss.
- Whether severe losses repeat across many nearby settings or depend on a narrow interaction.
- How much sensitivity comes from the GDX initial-stop distance and other active numeric settings. Keep the categorical initial-stop-OFF stress separate from small numerical perturbations; disabling a protective rule is not equivalent to nudging its distance.

Use bounded one-factor and selected two-factor diagnostic replays only where archived multivariate draws cannot identify a mechanism. Predeclare the grid/radius and case-selection rule, keep all results, and do not keep adjusting values until they pass. Diagnostic probes are not replacement phenotypes and receive no new validation sweep.

Explain what accepting A or B's modest p90 miss would and would not accept in the rest of its neighborhood. Include uncertainty from finite draws and the dependence on perturbation radius. Do not claim B is decisively safer because it missed by fewer dollars, or A is preferable just because its full-history center profit is higher.

## 6. Decide the next research question, not a new winner

Deliver a mechanism-based recommendation:

| Evidence | Possible next step |
|---|---|
| Competitive dual-funded Growth regions were underexplored or lost during promotion | Priority 3B with protected exploration/promotion of these regions and a larger measured budget |
| Parameter interactions or holding periods explain poor coordination | Priority 3B focused on those interactions while preserving broad discovery |
| Significant idle-capital/virtual-position overlap suggests the current lifecycle is a material restriction | Recommend moving a bounded current-versus-funding-aware comparison from Priority 5 ahead of 3B |
| Both architecture and search limitations matter | Recommend testing the architectural question first, then optimizing under a clearly chosen model |
| GDX participation is consistently detrimental under the tested conditions | Report that finding; do not force trades to make both symbols appear useful |

Support the recommendation with concrete dates, frequencies, durations, ledgers and risk mechanisms. State what the diagnostic cannot establish. Do not invent a profitable counterfactual trade sequence to justify moving Priority 5.

If recommending early architecture work, propose a bounded next-study specification: unchanged phenotypes, current shadow behavior as control, explicitly defined funding-aware behavior, matched capital/execution, portfolio accounting, and subsequent broader optimization only if warranted. **Do not implement or execute that alternative in this task.** The user will review the recommendation first.

If recommending a larger search, specify which regions need protection, how both-symbol participation would be explored without forcing equal shares or rewarding trades for their own sake, what proposal/evaluation budgets would increase, and what development-only stopping evidence would be used. Do not run it now.

## 7. Update the process documentation explicitly

The user requires agreed optimization-process changes to live in the authoritative documentation, not only in this report or prompt. Read current documents first, preserve their organization, and distinguish enacted policy from proposed future changes.

Record the following agreed decisions in the appropriate standard/guidance, protocol template and roadmap:

1. **Candidate consideration versus formal qualification:** A and B remain user-accepted candidates for investigation despite their historical Q3 failures. Keep separate fields for the original gate verdict, descriptive evidence, and user-directed consideration. This is not automatic approval for deployment or a new global risk threshold.
2. **Severity as well as frequency:** future risk reviews should show breach severity and worst-tail summaries alongside p90. Add the explicitly defined worst-10% mean DD as report-only guidance/template output. Do not introduce an unapproved hard gate or numeric tolerance. Preserve the current $35,000 center budget.
3. **Participation attribution:** when a pooled search suppresses a component, explain signals, filtering, real capital competition, virtual-state waiting and search/promotion attrition separately.
4. **Protected investigation:** multi-symbol Growth studies should explicitly consider protected exploration of both-symbol-funded configurations, alongside unconstrained portfolio comparisons. This is exploration guidance, not a requirement for equal activity or a mandatory winning configuration with every component funded. Exact budgets and promotion treatment must be frozen per study.
5. **Decision-dependent sequencing:** Priority 3A comes next; it may recommend bringing forward the relevant bounded portion of Priority 5 before 3B. No automatic reordering or execution of those future studies.

Apply the standard's version/change-log/registry process to actual standard edits, classify the version change by its existing rules, and update linked templates/preflight expectations where necessary. Existing studies retain their pinned versions and original results. Pin this diagnostic to the appropriate version and record any migration explicitly; do not retroactively alter completed studies. Check that new and historical adoption records behave as intended.

Any additional hard risk thresholds, changed ranking formulas or architecture changes discovered to be desirable are **proposals for user review**, not enacted policy. Explain precisely what the recommendation would change before asking for agreement. Do not reinterpret willingness to consider $131.47 or $1,277.63 p90 overages as permission to set a new blanket ceiling.

Confirm the standing commit-and-push preference remains in `CLAUDE.md` and linked agent instructions. Do not ask again at routine completion.

## 8. Resource limits, checks and delivery

Use existing proven infrastructure. All heavy concurrent work shares aggregate **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0** containment outside Claude/tmux. Apollo has 64 GB RAM; the ceilings are not consumption targets. Bound caches/queues, stream archives, persist results and checkpoint progress. No OOM restart loop. Reuse verified worker settings unless measurement warrants an operational change. Do not launch a broad tuning benchmark for this bounded diagnostic.

Instrumentation must be observational: verify that enabling it leaves all original funded decisions, fills, ledgers and metrics unchanged. Test the new attribution and summary calculations meaningfully, reconcile interval counts and money, verify original seals and stop dependent work on an unexplained mismatch. Keep pre-existing failures separate from regressions.

Deliver:

- A concise `REPORT.md` answering all four assignment questions, with evidence links and a recommended sequence.
- A complete participation funnel and refusal/idle/virtual-state timeline table for the specified subjects; representative dated examples.
- The archive-coverage and promotion audit, including what could not be recovered.
- A/B/C/D and informed-primary risk comparisons, severity statistics, representative failure traces, and all bounded probe results.
- Frozen diagnostic manifest, adoption record, protocol, amendments, reproducible commands, archive hashes and recovery checkpoint.
- A documentation change summary: enacted changes, registered standard version, preserved historical classifications and proposals awaiting review.

Update the roadmap to:

1. D1 entry eligibility — complete.
2. VGT-only D1 + Growth and follow-up — complete.
3. Initial VGT+GDX D1 + Growth study — complete, with its original result preserved.
   - **3A:** this diagnostic, with actual status and findings.
   - **3B:** larger-budget VGT+GDX search, conditional on review of 3A and any recommended early architecture comparison.
4. GDX-only D1 + Growth — not started.
5. Alternative pooling/funding behavior — not started; relevant bounded comparison may be brought forward only after review.
6. Growth for other ETFs — not started.

Commit task-related code, documentation and appropriate research artifacts, then push the dedicated branch to its configured remote without routine confirmation. Verify the remote commit and report branch/hash. Preserve unrelated work; do not force-push, merge, deploy, publish externally or alter user application data. If a concrete blocker prevents a safe push, preserve the work and explain it.

Finish with a direct explanation of why GDX was unfunded, what A/B's neighborhood failures mean, and **which next task you recommend and why**. Do not start that task automatically.
