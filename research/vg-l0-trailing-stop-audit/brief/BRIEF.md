# Claude Code — Priority 3: D1/Growth Trailing-Stop Audit and Staged-Stop Research Design

## Assignment and boundary

This is **Priority 3** in the Margin Trading research roadmap. Audit the existing trailing-stop and related exit mechanisms for the frozen **New L0 primary: VGT + GDX** portfolio and the **N/original** challenger. Determine whether a genuinely new, profit-activated staged trailing-stop mechanism is warranted and, if so, propose an implementation and research design for **Priority 4**.

**This is an audit and design assignment—not implementation or optimization.** Do not modify trading or optimizer behavior, write production code, run a genetic search, adopt a strategy, or deploy anything. The user will review the findings and separately authorize Priority 4. A negative conclusion (the proposed mechanism duplicates existing functionality or has insufficient rationale) is valid.

### Active strategy scope

- **VGT D1 (Dip Recovery)**
- **GDX D1 (Dip Recovery)**
- **VGT Growth**
- One shared funded-capital slot and the existing deterministic allocator
- **GDX Growth remains OFF** for this study

Do not add TSLA, MSFT, or other securities, and do not change the frozen portfolio configuration. The later TSLA/MSFT studies and the separate additional-securities program are out of scope.

### Research principles already agreed with the user

1. Protect substantial profits where doing so genuinely improves **whole-portfolio** outcomes; do not assume tighter exits are inherently better.
2. Avoid premature exits that prevent large trends or recoveries. Investigate activation thresholds and trailing distances together; **do not hardcode illustrative values** such as +25% activation or a 7% stop.
3. Preserve legacy single-stage behavior as an explicit control and permit the optimizer to select **OFF** if staged stops do not help.
4. Use sufficient computational effort in later authorized searches. Prioritize search coverage, independent seeds, robustness, and convergence evidence over arbitrary runtime limits. The verified RTX 5090 GPU evaluator is available, subject to full feature parity and acceptance.
5. Distinguish **trade-execution rules** from **optimizer risk-qualification rules**. Staged trailing stops would alter trading behavior; alternative drawdown envelopes do not.
6. Keep **P0**—the existing 35% maximum marked drawdown measured relative to the **initial trading allocation**—as the current reference. The P3 40% / 25% / 30% risk envelope was studied but **not adopted**. Continue separately reporting principal loss, banked-capital drawdown, and profit giveback.
7. Preserve New L0 and N/original as frozen comparators. N/original is a preferred research challenger, **not an adopted replacement**.
8. Previously inspected historical periods, including 2020–2022 and 2025–2026, are **not pristine out-of-sample evidence**. Label retrospective tests accordingly; avoid validation-driven rule tuning.

## Phase 0 — Read authoritative sources and establish provenance

Read `CLAUDE.md` and all applicable repository instructions before doing anything else. Then locate and read the current authoritative versions of:

- `OPTIMIZATION_STANDARD.md` (verify its current version; do not presume an old version is current)
- `docs/research/methods/NEW_L0_METHOD.md`
- GPU operations, acceptance and parity documentation (`docs/gpu/` and corresponding verified manifests)
- Frozen New L0 and N/original phenotype manifests and source runs
- D1, Growth, shared-capital allocator and Strategy Lab trading/execution documentation
- The completed risk-envelope Stage A, Stage B and Stage B final diagnostics, especially their profit-giveback decomposition and search-census findings
- Relevant D1 risk-control and Growth trading studies, including any separate research branches whose functionality has **not** been merged

Inspect the actual Git status and current base revision. Check which risk-control modules and GPU features are present in the current branch and which are available only on research branches. **Do not silently treat unmerged experimental code as production functionality.**

Document a compact evidence map: source path, function/line range, revision or study, and what it establishes. Distinguish verified current behavior, historical behavior, and proposed behavior.

The frozen benchmark history previously reported for New L0 was approximately $479,605.18 net, $20,385.99 full-history maximum marked drawdown and 46 funded lots (2016–October 2026, fixed $100,000 slot); N/original was approximately $482,700.73 net. These are contextual reference figures, **not substitutes for checking authoritative artifacts**. Do not run full data replays merely to restate them.

## Phase 1 — Exhaustive current exit-mechanics audit

For **each** active strategy (VGT D1, GDX D1, VGT Growth), establish precisely:

1. How the existing trailing-stop price is calculated, initialized, updated, ratcheted, and triggered. Identify whether it trails session highs, closes, intraday observations, or another source.
2. Whether a trailing stop is profit-conditioned, whether it can be active while a trade is losing, and whether other initial or unconditional protective stops exist.
3. Exactly when each stop becomes eligible (entry minute, subsequent minute, entry session, next session, etc.). Verify actual code rather than assuming the same semantics across D1 and Growth.
4. How max-hold policies work (including calendar-day semantics for the frozen D1 candidate, Growth variants, optional/no-hold cases, and any experimentally implemented D1 adaptive or disabled hold policies).
5. How stop checks interact with trend exits, maximum hold, continuation entries, lower-price re-entry, material-loss restrictions, recovery reset, decline gates, partial fills, and any existing protective-stop extension. Be explicit about **precedence** and state transitions.
6. How gaps, opening prints, missing bars, market sessions, split adjustments, intra-minute ambiguity, fees, and financing affect actual execution and realized net P&L.
7. Whether there are already **multiple stop stages**, conditional tightening, stop floors, activation/profit thresholds, or related functionality that makes a proposed staged-stop mechanism redundant or partially available.
8. How state is represented and serialized in the CPU reference, CUDA/GPU evaluator, shared-capital replay, research manifests, and Strategy Lab. Note any implementation mismatches or unimplemented optional paths.
9. Whether a real stop change can affect future **entry eligibility, capital occupancy, and displaced trades**, not only the profit on the current trade.

Produce a compact side-by-side D1-versus-Growth behavioral matrix, plus a causal event timeline for each representative stop/exit situation. Cite exact source functions and evidence for each assertion.

**Do not infer that Growth has no protection:** prior studies included Growth initial-stop and maximum-hold choices, and some selected phenotypes deliberately disabled them. Verify the present feature set and actual New L0/N/original settings.

## Phase 2 — Explain the profit-giveback opportunity without overstating it

Use existing **archived** risk-envelope diagnostics and selected-trade ledgers to identify what we can verify about profit giveback under the current exit rules.

Specifically:

- Distinguish marked equity drawdown, principal loss, erosion of banked profits, and unrealized-profit giveback. Do not conflate them.
- Identify representative profitable VGT D1, GDX D1 and VGT Growth trades (if available) where a trailing/trend exit surrendered previously accrued profits. Show dates, values, stop levels, and execution assumptions only when grounded in records.
- Distinguish avoidable-looking giveback from **gaps that bypassed intended levels** and from normal price noise that a tighter stop might convert into premature exit.
- Establish whether the risk-envelope diagnostics support a structural hypothesis, rather than treating their retrospective decomposition as evidence that a staged stop would necessarily improve total net profit.
- State what existing artifacts can answer directly and what would require new authorized simulation or search.

Use read-only artifact inspection and small deterministic calculations only if helpful. **No new genetic optimization, broad candidate evaluation, or retrospective tuning of thresholds.**

## Phase 3 — Propose staged trailing-stop designs

Based on the code audit, develop **at least two technically distinct, nonredundant design options**, if supported. For example:

- **Profit-activated tightening of the existing price trailing stop:** existing trailing distance before a specified unrealized-gain threshold, then a separately configurable tighter distance.
- **More than one stage or a monotone staged stop floor:** only if code architecture, search complexity and expected benefit justify it.
- **A percentage-of-profit-retained exit:** include only as a separate alternative if worth comparing; distinguish its early-trade tightness from a percentage-of-price trailing stop, and define how a minimum activation threshold avoids triggering at tiny gains.

Do **not** assume any particular design or parameter values will be beneficial. Recommend the smallest sensible design for an initial experiment. Explicitly decide whether it should augment or replace existing stop logic, and document how it interacts with legacy stops, initial loss stops, and other exits.

For each option specify:

- Exact formulas, denominators, units and time anchors: gain relative to entry, peak unrealized gain, trailing distance as a fraction of peak price, etc.
- Activating event and whether it uses net-of-cost profit, gross price appreciation, session close, minute data or another causal observation.
- Parameter domains to consider **for future approval**, with rationale for bounds rather than arbitrary favorite values.
- Whether the initial trailing distance is an existing phenotype gene or a new one; avoid duplicate control dimensions.
- Same-session/next-session activation policy; order of checking a new high, updating the stop, and observing the stop trigger.
- How a stop ratchets and is never inadvertently loosened. Explain whether transitioning stages may immediately trigger an exit.
- Gap-through-stop execution, partial fills, exits on the same minute, and insufficient-liquidity limitations.
- Behavior after reset, continuation, a position restart, and interactions with D1 versus Growth.
- Categorical `OFF` mode with **exact** legacy parity, versioned phenotype serialization and correct research provenance.
- The difference between adding a new trading exit and modifying P0 risk qualification (which is **out of scope** for this new rule).

Include numerical examples, especially one early-stage position with a tiny gain and one substantial long-term winner, showing how proposed logic avoids arbitrary premature exits. Also identify scenarios where it could **harm** profitability or utilization.

## Phase 4 — GPU integration and correctness design for Priority 4

Determine whether and how the accepted GPU evaluation backend would need to change. **Do not implement the change in this assignment.**

Produce a scoped integration plan preserving:

- CPU reference semantics and existing Strategy Lab simulations.
- Complete shared-capital event ordering and historical costs.
- CPU/GPU trade-event and financial parity, including boundary cases and `Number`/floating-point implications.
- Valid acceptance records, dependency pins, and `node --no-maglev` where required by current instructions.
- No silent CPU fallback in official GPU optimization.
- Deterministic candidate enumeration, seed usage, checkpoint/resume and cache identity.
- Existing frozen studies' code fingerprints and archived research; if new code changes acceptance dependencies, plan a full renewed acceptance campaign.

Specify minimal, maintainable module boundaries and tests for threshold equality, session boundaries, gaps, same-minute transitions, profit resets, interactions with all currently enabled D1/Growth options, invalid gene combinations, and the `OFF` legacy control.

If GPU implementation would require substantial duplicated strategy logic or unverified behavior, say so and propose a way to control that engineering risk before authorization.

## Phase 5 — Research and optimization plan for Priority 4 (proposal only)

Propose a **pre-registrable, adequately funded** research plan, not a run. It must test the actual causal mechanism and be able to find that keeping it OFF is best.

At minimum specify:

1. **Controls:** frozen New L0, N/original, original single-stage behavior, and identical phenotypes with staged stop ON where structurally possible. Keep P0 35% of initial trading allocation as the reference research risk envelope.
2. **Strategy scope:** VGT D1, GDX D1 and VGT Growth; independently configurable staged-stop state for each. Do not automatically add GDX Growth.
3. **Controlled ablations:** fixed-parameter OFF/ON comparisons to isolate the rule's effect before a full search.
4. **Optimization:** properly optimize the new rule's activation and trailing genes **jointly with interacting existing parameters**; evaluate the complete shared-capital portfolio and record displaced opportunities, not additive standalone profits.
5. **Search architecture:** document whether incumbent-informed and broad from-scratch searches, joint versus sequential optimization, or staged structural screening are justified. Preserve the lessons about incumbent bias and search-path dependence. Recommend fairness controls and adequate exploration of OFF and ON, including meaningfully distinct phenotypes.
6. **Compute:** estimate an initial benchmark and a search budget from the accepted RTX 5090's *measured* throughput for this specific workload. The user authorizes substantial compute where it improves the study. Distinguish budget exhaustion from convergence and explain when to extend or stop. Do not choose a small budget just for speed or a large one merely to exhaust resources.
7. **Metrics:** profit net of financing/costs, conventional marked DD (as **% of initial allocation**), actual trade principal loss (relative to funded principal), banked-capital DD (relative to initial allocation), profit giveback in dollars and % of peak profit, protected profit under active stops, capital occupancy, trade count, drawdown tail percentiles/breach frequency, worst trade, and cost/gap sensitivity. Do not collapse these distinct metrics into a single misleading number.
8. **Validation:** bounded neighborhoods, perturbation robustness, chronological walk-forward, regime and loss-tail analysis, and previously inspected 2025–2026 reporting explicitly labeled as retrospective. Freeze selection before opening later periods. No repeated selection informed by those periods.
9. **Comparison rules:** predefine what counts as a material improvement, which risk constraints remain binding, how risk-adjusted trade-offs are weighed, what constitutes nonqualification, and why any promising finalist merits a subsequent successor study.
10. **Research artifacts:** complete versioned manifests, candidate populations, search budget accounting, exact trade ledgers, acceptance/parity evidence and a portable ZIP handoff.

Do not silently broaden this audit into Priority 4. The user must approve the exact rule family and experimental protocol before implementation or optimization.

## Phase 6 — Recommendations and decision register

Answer clearly:

- What existing functionality already resembles staged trailing stops?
- What gap, if any, merits implementing a new optional rule?
- Which minimal design do you recommend testing first and why?
- Which design would you **not** test yet and why?
- What could cause a staged stop to improve individual profit retention but worsen total shared-capital results?
- Is the CPU/GPU implementation path feasible without sacrificing existing capabilities?
- What unresolved design choices need the user's approval?
- What computational effort would be scientifically meaningful, based on available benchmark evidence?
- Should we authorize Priority 4, modify the design, or stop this line of research?

Also note future roadmap dependencies without starting them: comprehensive N/original successor optimization, separate TSLA D1/Growth and MSFT D1/Growth studies, and a later new conversation for additional securities. Do not change their scope or priority without a recommendation clearly labeled as such.

## Repository and safety requirements

- **Read-only with respect to source, engines, datasets, frozen research, optimizer standards, GPU acceptance and Strategy Lab.** Writing new audit documents and a handoff ZIP under a dedicated research/audit namespace is permitted.
- Do not change strategy rules, optimizer selection logic, capital limits, or time conventions.
- Do not run a genetic optimizer, mass parameter search, or a new validation campaign.
- Do not merge to `main`, repin historical hashes, weaken integrity checks, or deploy anything.
- If the repository has simultaneous active work, avoid touching shared state. Use a safe branch/worktree for deliverable files if appropriate, but ensure access to any required Git-ignored research artifacts without duplicating huge caches.
- Do not assume compressed archives are already extracted. Restore only necessary archived artifacts into isolated scratch space with hash and SQLite-integrity checks, then clean temporary copies without changing compressed originals.
- Verify existing source, test and file paths before referencing them in the report. Distinguish facts from inferences and proposals.

## Required deliverables

Write a concise but sufficiently technical **portable research handoff** containing:

1. `READ_FIRST.md` — recommended reading order and executive conclusions.
2. `AUDIT_REPORT.md` — source-based D1/Growth exit architecture, exact current rules, overlap with staged stops, and evidence of giveback.
3. `SOURCE_MAP.md` — file/function/line references, versions and branch provenance.
4. `STAGED_STOP_DESIGN_OPTIONS.md` — alternative designs, formulas, examples, edge cases, minimal recommendation and excluded alternatives.
5. `GPU_PARITY_AND_INTEGRATION_PLAN.md` — implementation architecture and acceptance/parity gate proposal.
6. `PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md` — complete **proposed, not authorized** optimization design, budgets, search/selection rules, tests and outcome gates.
7. `DECISION_REGISTER.md` — what must be decided by the user before Priority 4.
8. `VERIFICATION_REPORT.md` — exact files reviewed, hashes if applicable, tests run (if any), and confirmation that no optimization/trading implementation was executed.
9. `SHA256SUMS.txt` — hashes of every included handoff file.
10. A portable **ZIP** containing the above, with extraction/checksum verification. Exclude huge datasets, SQLite archives, GPU build products, caches and unrelated source trees; reference them by verifiable local paths and hashes instead.

Commit/push the **research documentation only** on an isolated branch if repository conventions permit; otherwise explain why not. Report branch and commit identifiers and leave `main` unchanged.

## Final outcome

Conclude with an evidence-based recommendation and an explicit statement that this was **audit/design only**.

**PRIORITY 4 NOT STARTED — awaiting review and separate authorization**
