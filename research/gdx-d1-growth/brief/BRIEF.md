# Claude Code — Priority 8: GDX-Only D1 + Growth Research and Matched Total-Portfolio Comparison

## Mission and authorization

Execute a comprehensive, **GDX-only** research program to determine whether D1, Growth, or a shared-capital combination of the two can provide a profitable, robust alternative to the existing **N/original** VGT/GDX trading portfolio. A central objective is to determine whether trading only GDX on margin reduces the risk of a long-term investment portfolio already allocated **60% VOOG / 40% VGT**.

**This is a complete execution assignment**, not merely a research plan. Complete the engineering prerequisite, precommit the study protocol, obtain/verify necessary data, conduct the appropriately funded GPU searches, evaluate risk and total-portfolio outcomes, and produce a portable verified ZIP handoff. Stop if a genuine correctness, data, acceptance, or research-integrity blocker prevents a valid result.

The user explicitly authorizes substantial GPU computing where it adds research value. Do not economize by prematurely terminating worthwhile searches, but precommit objective stopping/extension criteria and distinguish convergence from budget exhaustion. No strategy may be adopted, merged into production, transmitted to a broker, or deployed by this assignment.

**Scope is GDX only.** Do **not** add MSFT, TSLA, VGT, or other ETFs to the new trading pool. VGT and VOOG appear only in the separately required frozen benchmark and underlying-investment-portfolio comparisons. This study takes priority over the separate future MSFT study.

Read all applicable repository instructions first, including `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md` (including GPU version requirements), `docs/research/methods/NEW_L0_METHOD.md`, GPU acceptance and parity documents, and the completed TSLA study's protocol. Establish the actual current code, branch, dataset, and acceptance lineage rather than assuming paths or commit hashes remain unchanged.

---

## Phase 0 — Integrate the reusable TSLA outcome-reporting fix safely

The prior engineering task `fix/tsla-outcome-identity-join` is complete. Its findings and artifact are in `docs/engineering/tsla-outcome-identity-fix/`, and its portable handoff is `tsla-outcome-identity-fix-handoff.zip`.

The bug was a final-outcome validation join using a mutable display/governance `label`. The reusable fix is a fail-closed identity join on **(arm, id)**, in `src/research-outcome/identityJoin.ts`, introduced in the isolated module commit:

`aca31b5fd595850050ca629ef3ac9208a84c9894`

1. Inspect the current repository and determine whether this generic helper is already present.
2. If it is absent, review and integrate **only the reusable generic module and its tests**, using a clean, appropriately scoped cherry-pick of that commit where safe. The previous handoff reported a clean dry-run onto `main`; re-verify against the current revision. If another accepted research lineage is the correct study base, integrate into that lineage instead, preserving GPU acceptance and research provenance. Do not merge the entire TSLA fix branch or the unmerged TSLA research history merely to acquire the helper.
3. Do not replace, regenerate, amend, repin, or rewrite the 163 sealed TSLA artifacts. Its official outcome remains historical. The corrected outcome is a **report-only** reconstruction; the headline is still *NO QUALIFYING TSLA CANDIDATE*.
4. The new GDX study must use stable `(arm, id)` identity for final selection/outcome and **fail closed** on missing, duplicate, cross-arm, malformed, or conflicting validation records. Create regression tests and a stable-ID reconciliation/replay test under GDX's own protocol.
5. Verify clean Git lineage, relevant tests, GPU acceptance impact, and unchanged existing strategy behavior. If the integration touches a pinned GPU dependency, perform the required acceptance renewal; never bypass the official gate.

Keep this engineering fix distinct in commit history from the new GDX research. Do not merge experimental trading changes into `main`.

---

## Phase 1 — Recover data and frozen controls

### 1.1 GDX market data

- Locate the canonical Alpaca **SIP one-minute** GDX files and the existing verified GDX research data. Prefer already available, validated files; acquire any genuinely missing historical minutes through the authorized existing data workflow. Do not buy data or subscribe to new services without user approval.
- Audit coverage through the verified historical endpoint (expected common comparison horizon **2016-01-04 through 2026-10-30**, but confirm actual records), ascending UTC minute starts, duplicate and malformed rows, gaps, NYSE calendar and early closes, corporate actions, and split/dividend price basis.
- **Only scheduled regular-session bars and the official closing print may affect signals, stops, fills, and marks.** Raw premarket/after-hours rows may be retained but must be ignored by trading simulations. Model overnight gaps through next regular-session execution correctly; no fictional premarket fills. Preserve sparse observed bars; do not manufacture trades for missing minutes.
- Verify all data inputs by hash and coverage; if GDX Growth's canonical data differs from D1's, reconcile the scales and event calendars before comparison. Use the same source/version across arms wherever feasible.

### 1.2 Frozen baselines

Reproduce, without modifying the original files or source configurations:

- **N/original**: VGT D1 + GDX D1 + VGT Growth, existing shared capital, all original rules. Reference: approximately **$482,700.73** historical net and **$20,385.99** maximum marked drawdown with a $100,000 trading slot.
- **New L0**: original immutable portfolio. Reference: approximately **$479,605.18** net and **$20,385.99** marked drawdown.
- Existing GDX D1 standalone reference phenotypes, if valid and comparable; label their provenance and do not assume old historical outcomes are a controlled comparison.
- **Ablation:** replay N/original with both VGT books disabled, **keeping its exact GDX D1 phenotype unchanged**. This is a fixed configuration, not a new search. Clearly show how the chronology and funding change when the VGT components are absent.

Confirm frozen cost, notional, interest, capital-pool, priority, execution, event ordering, hold clocks, and eligibility rules. Preserve P0 / the original **35% maximum marked drawdown relative to the fixed initial trading allocation**. At a $100,000 slot, that is $35,000; do not mistakenly use 35% of peak portfolio equity. Existing calendar-day hold semantics remain unchanged. Staged trailing stops S1 are **OFF**; shadow-delayed-entry eligibility is **OFF**. Do not introduce new trading algorithms or future-aware signals.

---

## Phase 2 — Precommit a valid research and portfolio protocol

Before any new optimization or final-period performance access, write and freeze a reproducible protocol covering:

- Exact historical data partitions and access doors, warm-up, open-position carry and mark treatment.
- Strategy/phenotype parameter domains, feature toggles already supported, structural exclusions, and common trading economics.
- Separate budgets, initial global coverage, seed lists, island/refinement allocations, candidate diversity, extension criteria, diminishing-return/convergence tests, and stopping rules for each research arm.
- P0 objective and risk/robustness standards, including the **35% of initial trading allocation** cap, separate trade principal loss, banked-capital drawdown, peak-to-trough equity drawdown and profit giveback reporting.
- Same-minutes/same-symbol D1 versus Growth signal ordering and allocator conflict behavior, including how refused signals are treated.
- Eligibility/qualification and final-candidate selection. Precommit the outcome logic (immutable `(arm,id)` join). Document the known TSLA outcome-join defect and prevention tests.
- A chronology-aware procedure selection test using earlier cutoffs and subsequent windows, along with exact decision consequences if it fails. All windows previously examined by our program must be explicitly labeled **retrospective**, not pristine holdouts.
- A **total-portfolio comparison protocol** with fixed initial-investment-equity assumptions, 60% VOOG/40% VGT rebalancing/dividend policy, overlay sizing, costs, interest, cash-flow assumptions, and comparable risk statistics across arms. See Phase 5.

Use the established NL0/Priority 5/TSLA search algorithms faithfully. Do not silently change the fitness function to make GDX attractive. If a precommitted adaptation is required for a single-symbol two-book pool, document it separately. Do not use final-period portfolio results to steer candidate selection.

The user permits generous GPU resources: estimate actual work from measured throughput and parameter-space size, and allow objective, precommitted **convergence-driven extensions**. Meaningful improvements in diversity/search coverage are worthwhile; more compute is not automatically worthwhile when further search stops yielding useful evidence. Record every lane still budget-limited, and do not present budget exhaustion as true convergence.

---

## Phase 3 — Five GDX-only research architectures

Evaluate the following **separate, predefined research arms**, modeled after the completed TSLA study. Every arm uses only GDX price data and, where funded, **one shared $100,000 margin-funded slot**. No two real funded positions may overlap.

| Arm | Strategy configuration | Research method |
|---|---|---|
| **D** | GDX D1 standalone | Broad independent optimization of D1 parameters and eligible existing rules |
| **G** | GDX Growth standalone | Broad independent optimization of Growth parameters and eligible existing rules |
| **C** | GDX D1 + Growth fixed pair | Combine predeclared independently optimized D1/Growth finalists, without retuning pair parameters |
| **J** | GDX D1 + Growth fully joint | Joint optimization of both phenotype vectors on complete single-slot replay |
| **S** | GDX D1-first sequential | Optimize D1 first, freeze its parameters, then optimize Growth against the **full shared-capital GDX pool**, not Growth in isolation |

Requirements:

1. GDX Growth must receive genuinely substantial from-scratch exploration. Previous studies found it less compelling than D1, but this is a hypothesis to test, **not** grounds for pruning Growth before a fair search.
2. Use the original engine/feature families; permit already-supported bounded and open-ended Growth settings where the current official standard allows them, with explicit stress and downside reporting. No new protective stops or staged trading rules invented in this study.
3. Include incumbent-informed candidates from prior GDX D1 and GDX Growth research as **controls or separately labeled seeded lanes**, without displacing or constraining independent global searches. All controls must be versioned and sourced.
4. In the fixed pair, choose the number and selection of candidate pairings **before** validation; avoid a retrospective combinatorial search on the final period.
5. Joint J proposals must truly mutate D1 and Growth together and score full pool chronology, not add independent P&Ls.
6. Sequential S must retain the D1 vector selected in the first stage while scoring every Growth proposal against the complete pool. Different D1 first-stage finalists may be carried only under predeclared rules and accounted-for budgets.
7. Search comparison should not be distorted by unequal CPU/GPU methods, search budgets, seed coverage, or inconsistent data accounting. Document deliberate architectural differences.
8. All selected candidates must undergo neighborhood perturbations, meaningful trade/episode attribution, annual profit and risk reporting, capital utilization, and cost/slippage/interest stress tests.

Do not classify a development winner as deployment-qualified if its precommitted chronological test fails. **No qualifying candidate** is a valid result.

---

## Phase 4 — Mandatory accepted GPU execution and correctness gates

Use Apollo's official accepted RTX 5090 optimization backend and documented execution path, with `node --no-maglev` wherever required. The accepted CPU implementation remains the authoritative reference.

Before searches:

- Verify the current accepted GPU record and independent pin; fail closed on invalid acceptance.
- Confirm the integrated identity-join helper does not change evaluation fingerprints or research guards unexpectedly.
- Reproduce frozen N/original and New L0 trades and metrics; verify GDX-only ablation accounting.
- Compare representative CPU/GPU GDX D1, GDX Growth and pooled histories at **event/trade level**: entry and exit instants/prices, stops, funding decisions, costs, interest, net, drawdown, and selection/qualification fields.
- Test same-symbol competing signals, priority, gaps, partial session/closing-print rules, open trades at partition boundaries, and different Growth exit modes.
- Perform representative fixed-seed mini-optimization and check candidate ordering/ranking and threshold behavior.

Official research search may begin **only after all required engineering and acceptance gates pass**. Any consequential discrepancy must be investigated and resolved. No reduced-precision workaround or silent CPU fallback. Maintain exact original P0 algorithm/selection semantics and sealed historical controls.

The user authorizes substantial GPU budget and precommitted extensions, but no changes to risk thresholds solely to get a positive result. Record requested versus fresh evaluations, cache hits, actual runtime, VRAM, saturation/throughput and convergence per arm.

---

## Phase 5 — The essential matched 60% VOOG / 40% VGT portfolio comparison

**This is a first-class research output, not an optional appendix.** A GDX-only alternative may earn less in the trading sleeve yet be preferable in the user's overall portfolio. Conversely, GDX-only may earn **more** than N/original; do not impose a profitability ceiling or prefer a lower-profit result by assumption.

### 5.1 Compare the same underlying investment portfolio in every scenario

Construct matched retrospective historical portfolios over a common verified period:

1. **Core only:** 60% VOOG + 40% VGT, without an overlay.
2. **Core + N/original:** exactly that same core portfolio plus its original VGT D1, GDX D1 and VGT Growth margin-funded overlay.
3. **Core + GDX D1 standalone:** same core plus the funded GDX D1 overlay.
4. **Core + GDX Growth standalone:** same core plus the funded GDX Growth overlay.
5. **Core + GDX D1 + Growth combined finalists:** same core plus qualified fixed/joint/sequential finalists (at minimum the selected primary of each and material lower-risk alternates).
6. Optionally add the **GDX-only N/original D1 ablation** and **Core + New L0** as fixed references.

Every comparison must share **identical initial core equity, 60/40 definition and rebalance rule, dates, market data, transaction/financing conventions, overlay trade notional, accounting basis, contribution/withdrawal assumptions, and margin-maintenance scenarios**. Avoid comparing a bare trading-$100k result with a total-portfolio risk number derived under a different notional or borrowing assumption.

### 5.2 Core asset and distribution data

Verify canonical VOOG and VGT histories, corporate actions, stock splits, market calendars and distribution coverage. Use a coherent total-return or distribution-and-reinvestment treatment; do not double-count dividends and never synthesize missing cash distributions. Disclose whether 60/40 is initially allocated and allowed to drift or periodically rebalanced; precommit a primary convention and optionally show a matched sensitivity alternative.

If complete validated distribution or adjustment data are unavailable, **do not quietly invent returns**. Complete all technically valid trading-slot research and clearly identify the blocked portfolio comparisons, missing data and safe repair path. Do not bypass portfolio data guards merely to obtain a result.

### 5.3 Funding and interest — no double counting

Model a fixed **$100,000 funded trading position** when a strategy uses the slot. Distinguish position market value, margin debt, original/core equity, accumulated realized trading profits, financing charges and distributions. Prevent accounting the existing 11% trading-interest deduction twice when consolidating trade ledgers into a total-account equity curve. Specify when borrowed principal is drawn and repaid and how cash proceeds are handled.

Use a clearly predeclared normalized primary core-equity scenario (for example, **$500,000 initial core equity and a $100,000 maximum overlay position**); report it as illustrative and **not** a verified statement of the user's present brokerage balance. Include sensitivity to different borrowing/initial-equity ratios where possible. If a different initial amount is required by the existing research standard, document and use it consistently.

Report both the absolute funded-slot profitability comparison and an appropriately normalized **per invested-dollar or borrowing-dollar-day** comparison. N/original and GDX-only may have different time-in-market and borrowing utilization; do not pretend those differences disappear when margin notional is equal.

### 5.4 Risk metrics and genuine cross-portfolio benefit

On aligned historical equity curves report:

- Total portfolio net terminal wealth and cumulative returns, both absolute and incremental versus core-only.
- Total portfolio maximum marked-equity drawdown (absolute and % of appropriate peak), peak-to-trough dates and duration.
- Total portfolio annual returns/drawdowns and worst drawdown episodes, including 2020 and 2022 and periods of strong VGT/GDX divergence.
- Worst individual trade principal loss, banked-capital drawdown, aggregate overlay profit giveback and total-account equity giveback; keep their distinct definitions.
- Maximum borrowing, loan-to-market-value and equity/maintenance headroom under transparent stress assumptions.
- Diversification/concentration of exposure, covariance and overlapping drawdown episodes of core and overlay; do not assume GDX is a hedge simply because it is non-technology.
- Historical stress scenarios involving technology-specific declines, broad-equity crashes and GDX/gold-miner selloffs; state scenario assumptions and clearly separate hypothetical stresses from historical observations.
- Effect on portfolio risk **when the overlay is in GDX instead of VGT**, including dates when N/original adds correlated VGT exposure to an already technology-heavy core.

Actual Vanguard margin maintenance depends on current eligible collateral, debt, house requirements and concentration rules. Use clearly sourced/verified requirements if available; present alternative conservative maintenance scenarios as illustrations and **do not claim an actual account margin call or guaranteed safety without actual broker-specific account data**. If the source evidence is insufficient, state the limitation.

### 5.5 Decision basis

Compare GDX-only and N/original along two separate axes:

- **Trading sleeve:** net profit, drawdown, principal losses, robustness, utilization and chronology.
- **Whole investment portfolio:** incremental terminal wealth, total-portfolio drawdown, maintenance headroom and concentration under exactly matched core and leverage assumptions.

Do not require GDX-only to beat N/original's **$482,700.73** historical trading net to be worth investigating; a meaningful, robust reduction in total-portfolio risk could justify lower trading profit. Equally, if GDX-only exceeds that profit, report and consider it fairly. Never claim superiority based solely on its sector label or on one favorable historical episode.

---

## Phase 6 — Chronological validation, neighborhoods, and attribution

Follow the currently pinned optimization standard and appropriate TSLA/NL0 precedent, including:

1. Earlier-cutoff independent train → next-period procedure testing (2016–2019 → 2020–2021, etc., as precommitted by the actual data doors), preserving all causal state and realistic exit behavior across boundaries.
2. A final **2016–2024** development selection followed by a single sealed evaluation on verified **2025–2026** data. These years are **previously examined historical validation**, not a pristine holdout.
3. Separate development and final portfolio comparisons; all data access and finalized selection must be recorded so no final-period information changes search or ranking.
4. Cost and gap stress, alternative 10 bps per-side costs, higher interest, next-open adverse fills where supported, and liquidity/capacity considerations relevant to GDX.
5. Robust neighborhood metrics including p90/p95 marked DD, worst-10% mean DD, robust net/p10 profit, trade principal losses, banked-capital DD, breach frequency and severity, and episode concentration.
6. Clear attribution of performance from D1, Growth, allocator displacement, and shared-symbol conflicts. Compare fixed D1 ablation and the fully optimized alternatives without confusing them.
7. Where appropriate, exposure/risk qualification of the full VOOG/VGT-plus-overlay portfolio separate from isolated slot qualification. Do not silently use portfolio hindsight to choose strategy parameters.

Preserve the precommitted **35% of initial trading allocation** P0 marked drawdown research criterion. A risk breach in chronological testing must be reported as such, even if a candidate earns a high historical profit. A no-deployment-qualified result is valid.

---

## Phase 7 — Outcome integrity and permanent research record

- Write an immutable finalist identity record for every arm and candidate, carrying `(arm, id)` through frozen selections and validation. The final outcome must match by this identity, not by mutable display/status labels. Missing or conflicting matches cause an explicit failure.
- Preserve the actual candidate, validation and outcome records, with reconciliation checks and exact criterion traces. Don't allow a silent `validation: null` masquerade as strategy failure.
- Produce a precommitted decision outcome and independent verification; do not revise thresholds, rankings or finalist definitions after seeing 2025–2026.
- Retain complete histories of the final trading and core-plus-overlay portfolio curves sufficient to reproduce the claimed risk metrics.
- Do not overwrite New L0, N/original, TSLA, GPU or Priority 5 sealed records. Use a separate research branch/worktree and isolated cache/job paths.
- Protect accepted GPU identity; preserve all required research integrity and reproducibility guards. Report any pre-existing failures separately rather than silently changing pinned expectations.
- Provide exact code/data/content hashes, acceptance record, seed/budget tables, executed commands, performance logs and signed/parity decisions.
- No automatic adoption, deployment, broker access, orders, SMS alerts, live service, or merge into `main`.

### Portable handoff package (mandatory)

Deliver a single portable, checksum-verified ZIP file containing, at minimum:

- `READ_FIRST.md` with executive conclusions and reading order.
- `REPORT.md`, `PROTOCOL.md`, `DECISION_REGISTER.md`, `AMENDMENTS.md`, reproducibility instructions and research-source mapping.
- Data coverage and adjustment audit, baseline reproduction, GPU acceptance/parity evidence, compute budgets and convergence reports.
- Standalone, fixed-pair, joint and sequential finalist tables; chronological/validation and neighborhood/risk reports; outcome identity reconciliation.
- **Matched total-portfolio comparison:** core-only, core + N/original and core + GDX-only finalists, including the actual assumptions, risk decomposition, margin scenarios and annual/equity attribution.
- Small machine-readable result summaries, key trade lists, and a machine-readable manifest of Git revision, data hashes, accepted binary and artifacts.
- SHA-256 manifest covering the bundle, ZIP integrity test and a secrets/privacy scan.

Exclude huge market-data files, raw GPU archives, SQLite caches, binaries, or credentials. Keep the full research archives on Apollo with safe compression/restore instructions where appropriate. Provide both the ZIP path within the repository and a stable copy in the established local GPU handoff folder.

## Final questions to answer

1. Can GDX D1 standalone, GDX Growth standalone, or their pooled combinations become chronologically qualified, robust trading candidates?
2. Does GDX Growth contribute measurable incremental value beyond GDX D1, after capital contention and costs?
3. Does independently optimized GDX-only ever outperform N/original in the fixed $100,000 trading slot? If not, how large is the trade-off?
4. Under the **same** 60% VOOG / 40% VGT investment core, does switching from N/original to GDX-only reduce total-account drawdown or margin risk? By how much, in both absolute and relative terms?
5. Is a lower trading return justified by material and sufficiently credible portfolio diversification? Are there regimes in which GDX-only is worse?
6. Did the search achieve predefined convergence/coverage criteria, or did meaningful areas remain budget-limited?
7. What uncertainty remains due to repeated inspection of 2016–2026 history, distributions, broker margin assumptions and model execution limitations?
8. Does any configuration merit **further research consideration**? No production adoption is authorized.

**Complete this end-to-end study after the protocol and engineering gates pass. Do not ask for ordinary compute-budget confirmation for precommitted searches/extensions. Stop and report true correctness or data-integrity blockers rather than inventing missing evidence.**

**GDX STUDY COMPLETE — RESEARCH ONLY — NO STRATEGY ADOPTED OR DEPLOYED**
