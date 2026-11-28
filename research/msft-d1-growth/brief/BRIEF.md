# Claude Code — Priority 9: MSFT D1 + Growth, Comprehensive GPU Research

## Mission and authorization

Execute the approved **independent Microsoft (MSFT) D1 + Growth research study end to end**, using the established Margin Trading infrastructure, optimization standards, and accepted RTX 5090 evaluator.

The study must:

1. Recover and verify the current repository, the completed TSLA and GDX research, and the reusable outcome-identity fix.
2. Obtain and rigorously audit **MSFT Alpaca SIP 1-minute data** and corporate actions before optimizing.
3. Audit the existing D1 and Growth functionality for MSFT, preserving all supported strategy and exit behaviors.
4. Perform **five approaches**: D1 standalone, Growth standalone, fixed combination of the independently optimized phenotypes, fully joint D1 + Growth optimization, and D1-first sequential optimization with Growth optimized against the frozen D1 shared-capital pool.
5. Use substantial, fairly allocated **GPU search budgets**, multiple independent seeds, explicit convergence criteria, chronological walk-forward qualification, parameter-neighborhood testing, and complete risk reporting.
6. Produce a portable, checksum-verified **ZIP handoff**, including the frozen protocol, outcomes, code/data identities, results, diagnostics, verification and outstanding decisions.

**This prompt authorizes implementation and the full optimization**, following successful preflight, data, protocol-freeze and CPU/GPU gates. It is not a preparatory-only assignment. The user authorizes substantial compute when it improves coverage or confidence, but do not spend compute merely to exhaust an arbitrary time allowance.

**Research only. Do not trade, contact a broker, deploy, adopt a candidate, merge experimental trading logic into `main`, or start the planned additional-stocks/ETFs study. Do not combine MSFT with TSLA, VGT, GDX or any other security in this assignment.**

Read this entire prompt, including the final acceptance criteria. Read `CLAUDE.md` and the repository's current authoritative `OPTIMIZATION_STANDARD.md` (including its version and adoption instructions), protocol template, `docs/research/methods/NEW_L0_METHOD.md`, GPU acceptance/parity/operations documents, and relevant data, corporate-action, research and study-recovery documentation. Verify actual current paths and commits instead of blindly using old examples.

---

## Phase 0 — Recover lineage and reuse verified research tooling

Repository expected at `/home/chad/projects/margin-trading`; verify it.

Before altering anything:

- Inspect Git HEAD, `main`, active worktrees, uncommitted changes, current processes, free disk space, accepted GPU record, pinned binaries, and the usable research-toolchain branch.
- Read the completed TSLA study at `research/tsla-d1-growth/` and its `READ_FIRST.md`, `PROTOCOL.md`, `OUTCOME`/`DECISION_REGISTER`/`RESEARCH_RECOVERY` documentation.
- Read the completed GDX-only study at `research/gdx-d1-growth/`, especially `READ_FIRST.md`, `PROTOCOL.md`, `OUTCOME_IDENTITY_RECONCILIATION.md`, `GPU_PARITY_AND_ACCEPTANCE.md`, `SEARCH_AND_CONVERGENCE_REPORT.md`, and its explicit adaptations.
- Read the TSLA outcome-identity engineering fix and verify that the reusable immutable-identity join module is available and correct. The GDX lineage reports that commit `aca31b5f` was integrated without merging the entire TSLA fix branch; verify current state and **do not cherry-pick it again if already present**.
- Prefer the best verified, current accepted-GPU source lineage containing the required D1/Growth framework and identity join. Establish a new **isolated MSFT research branch** without disturbing research branches, existing caches, seals or worktrees.

### Outcome identity and report correctness

The TSLA study exposed a reporting defect: mutable labels were used to join final validation records, silently producing `validation: null`. The corrected approach joins by immutable candidate identity (e.g. `(population, id)` or the verified schema's stable arm/id equivalent) and **fails closed** for missing, duplicated, cross-population or inconsistent matches.

Use the verified reusable module (`src/research-outcome/identityJoin.ts` or its current equivalent) for the MSFT outcome. Require an independent post-seal reconciler and deliberately forged/misaligned record tests. Never rewrite historical TSLA or GDX outcome seals to address MSFT reporting.

### Historical benchmarks and scope

Preserve, as immutable external references only:

- **New L0** — frozen VGT/GDX benchmark.
- **N/original** — preferred VGT/GDX research incumbent.
- **I1** — separate experimental staged trailing-stop candidate, not an authorized part of this MSFT strategy search.
- Previous TSLA and GDX research outcomes, including their negative chronological findings.

These are contextual comparison references; do not seed the **independent MSFT broad search** with their winning vectors or silently turn them into a cross-security pooled strategy. If any transfer or informed references are used for descriptive control runs, clearly isolate and label them and do not let them contaminate independent chronology.

---

## Phase 1 — Acquire and verify MSFT market data

This is a blocking prerequisite for optimization.

1. Check whether a canonical `data/MSFT/data.csv` already exists. If missing or incomplete, use the user's **existing Alpaca SIP entitlement** and the repository's verified ingestion workflow to obtain MSFT consolidated 1-minute OHLCV bars. Do not purchase services, expose credentials, or silently switch to IEX or a different feed.
2. Target the **common historical endpoint 2026-10-30** and the program's usual start 2016-01-04, so MSFT evidence can be compared under identical chronology with TSLA and GDX research. Audit the actual verified coverage. If additional more recent data are available, do not mix them into this frozen research period without a separately documented, preapproved role and data door.
3. Preserve the canonical **one-file-per-symbol** dataset convention. Apply explicit training, cutoff, warmup and final-period ranges through metadata/data doors; do not create arbitrary differently truncated permanent files or use all data implicitly for optimization.
4. Inspect the corporate-action ledger and independently verify MSFT's relevant splits or reverse splits in this window. **Do not assume there are none; verify.** Apply the canonical split-adjustment rules exactly once and test price continuity, adjusted shares/volumes, market-value identities and causal data access. Distinguish split adjustment from dividends; do not double count either.
5. Audit for missing sessions, missing minute bars, duplicates, sorting, timestamp/DST conventions, NYSE closures, early closes, halts, suspicious bars, outliers, sparse activity, opening gaps, closing auction, and any material discrepancies versus trustworthy independent daily references. Report unusual historical issues rather than silently repairing them.
6. **Keep raw pre-market/after-hours bars if provided, but exclude them from strategy signals, highs/lows, stops, marks and executions** through the established `groupMarketSessions` regular-hours semantics. Include the official closing-print proxy where required by the existing engine, and handle early closing sessions. Overnight price changes enter through the next executable regular-session opening gap; do not simulate pre-market executions.
7. Verify the source is appropriate for the simulator's minute-bar execution assumptions. Missing minute bars are not fabricated; do not claim tick-by-tick precision.
8. Identify whether MSFT dividends introduce an important difference from TSLA: historical **trading-overlay profits remain price-only under the existing engine** unless the authoritative methodology explicitly includes distributions. Disclose the implications for comparisons and buy-and-hold controls; do not silently introduce MSFT dividends into funded-lot P&L or financing calculations.
9. Freeze file hashes, data-door prefixes, metadata, complete endpoint, split ledger hashes and data audit before searching.

If material required data cannot be obtained or verified, **do not run official optimization**. Report the exact blocker and preserve valid completed work.

---

## Phase 2 — Fixed trading rules and independent research boundary

Study MSFT **alone**, using one exclusive **$100,000 fixed-notional trading slot**, no compounding, the established 5 bps trading cost per executed side, and 11% simple margin interest by calendar day unless the verified canonical protocol requires an identical existing variant. Use the existing D1/Growth allocator, fill semantics, same-instant ordering, state transitions and interest accounting. **Never add standalone profits together** to represent a shared-capital result.

Use five research arms:

| Arm | Study | Description |
|---|---|---|
| **D** | D1 standalone | Independently optimize Dip Recovery on MSFT, Growth disabled |
| **G** | Growth standalone | Independently optimize Growth on MSFT, D1 disabled |
| **C** | Fixed D1 + Growth | Combine independently selected D and G phenotypes in one exclusive slot, with **no additional parameter optimization** |
| **J** | Fully joint | Optimize the numerical and eligible structural parameters of both MSFT D1 and MSFT Growth together, fitness computed on the complete shared-slot chronological replay |
| **S** | Sequential D1 → Growth | Optimize and freeze D1 first, then optimize Growth against the **full shared-capital portfolio containing the frozen D1**; D1 parameters must not move during this step |

All combined arms must attribute real funded trades, competing signals, denied opportunities, displaced trades, and capital occupancy. Preserve the chronological state machine, including the possibility of no candidate or no qualifying D1 finalists.

### Risk and exit controls

- **P0 reference criterion:** maximum minute marked drawdown **35% of the fixed initial trading allocation**, $35,000 at $100,000. It is **not** 35% of peak equity and does not guarantee a live loss cap. Percentage-normalize scalable research constraints without changing their meaning.
- Maintain original **calendar-day** holding-period semantics, realistic gap-through-stop behavior, costs and interest.
- Keep shadow-position delayed-entry eligibility **OFF** and experimental S1 staged trailing stops **OFF**. Do not add a new trailing-stop or giveback rule in this assignment.
- Audit and preserve the existing supported D1 risk-control families and Growth exit structures, including optional initial ATR stops, maximum holds and permitted open-ended Growth. Keep protected and unrestricted alternatives fairly represented; report open-ended exposure explicitly rather than automatically disqualifying it without a precommitted rule.
- Record trade principal-loss exposure, banked-capital drawdown, profit giveback, marked equity risk, worst trades, gap fills and financing as distinct measures. Do not treat unrealized-profit giveback as a principal loss.
- Do not adjust the $35,000 risk gate to help MSFT qualify, or retroactively make a research-only risk metric binding. RA1 and other experimental selectors may be calculated on **identical candidate sets as report-only diagnostics**, while the original authorized NL0/P0 selector remains the official selector unless the current standard explicitly authorizes otherwise.

### Research comparators

Use MSFT buy-and-hold (financed and unfinanced, with clearly disclosed distribution assumptions), and selected frozen reference phenotype controls if supported, as *descriptive* context. No MSFT+TSLA combined portfolio, MSFT+VGT/GDX overlay, or modeled 60/40 VOOG/VGT base-portfolio selection in this study. Those would require a separately approved experiment.

---

## Phase 3 — Precommit a rigorous optimization protocol

Recover the **actual** prior search methodology and its executed budgets from the TSLA/GDX/NL0 records. Reuse the established algorithms, parameter domains, categorical cell definitions, screening, Sobol sampling, NSGA-II/islands, selection, neighborhood, refinement, seed identity, data-door and chronological procedures wherever applicable. Do not replace the proven process with a new heuristic merely because the security is MSFT.

Before official optimization, write and commit a frozen protocol, standard-adoption manifest, budget schedule, risk qualification, expected evidence and stop conditions. It must specify:

1. The five arms and exact parameter/structural search domains, with categorical coverage and proper masking of inactive genes.
2. **Equal and adequate search effort for comparable methods**, accounting for larger Growth genomes and D1-first sequential search costs. Independent D, G, J and S tracks must not be disadvantaged by any separate informed/control lanes.
3. Multiple independent search seeds, independent global exploration, diversity of behavioral phenotypes, selection stages, refinement, neighborhood tests and finalist promotion rules.
4. Initial per-cell budgets derived from measured TSLA/GDX throughput and seed dispersion, plus the *actual* previous research effort (TSLA ≈44.16M evaluations; GDX ≈76.97M). These values are references, not required MSFT evaluation totals.
5. **Predeclared, convergence-driven extensions** when lanes still improve or reveal distinct promising behavioral regions. State hard engineering safety caps and resource guards, but do not stop a useful scientific search solely because of an arbitrary short runtime deadline. Distinguish budget exhaustion, numerical convergence, behavioral coverage saturation and genuine robustness evidence.
6. A fair same-population NL0 versus RA1 *diagnostic* comparison if available without contaminating the official selector.
7. Thresholds for sufficient independent trades/episodes, concentration of gains, eligibility and participation for D, G, and combined arms. **Do not lower trade-count/risk requirements simply because MSFT is less volatile or has fewer qualifying D1 opportunities**. No qualified candidate is an acceptable finding.
8. Development/final-period data partitions and exact causal walk-forward folds (prefer C19→2020–2021, C21→2022–2023, C23→2024, C24→2025–2026 if valid). Freeze each earlier-cutoff selection before reading its following period. Keep final selection sealed before opening the final period.
9. Cost/interest/slippage and gap-execution stresses, percentile neighborhood checks, principal-loss, banked-capital, giveback and annual/regime diagnostics.
10. A **precommitted final outcome and architecture comparison** with explicit materiality requirements and binding chronological consequence, independent of how profitable MSFT looks on the development period.
11. Full, reproducible GPU job identities, acceptance pins, seed derivation, caching/checkpointing, artifact locations, archive retention/compression plan, and a portable handoff plan.

If a necessary security-specific change to a parameter domain or selection requirement appears justified, document it as a new study-specific design decision **before seeing results**, including why it is necessary and how it affects comparability. Do not optimize the research protocol itself against observed MSFT validation returns.

---

## Phase 4 — Engineering and accepted-GPU verification gates

These gates must pass **before any official MSFT optimization**.

- Verify the official GPU backend is accepted on the chosen source lineage, with current acceptance record, independent verifier, out-of-band pin, device and binary. Every official job must use the repository's documented accepted GPU session, fail closed, and provide attestation. **No silent CPU fallback.**
- Use the required `node --no-maglev` runtime throughout official evaluation/references according to the GPU documentation.
- MSFT data-door parity: exact regular-session groupings, corporate actions, price scales, cutoff prefixes, final-window exclusions, entry/exit chronology and opening-gap behavior.
- Establish **CPU/GPU parity** across all arm types and eligible structural cells, including MSFT-specific data, edge thresholds, stop activation, interest, risk envelopes, funding priority, partial exits and open positions. Compare trade/funding ledgers and all decision-relevant numerical fields, not just aggregate profit; investigate any mismatch.
- Verify exact reproduction of frozen New L0/N/original on their original data as a nonregression check when relevant to the changed code closure, without altering seals or results.
- Verify reusable outcome identity join and independent outcome reconciliation on missing/duplicate/cross-arm candidate identities. Record a regression specifically preventing the TSLA `validation: null` defect.
- Test deterministic pause/resume, job interruption, candidate ordering, fixed-seed mini-search parity, checkpoint identity, negative/tamper cases and archive write integrity.
- Run required unit/integration suites, research preflights and Strategy Lab typecheck, unit, browser and portfolio parity. Preserve Strategy Lab's standalone CPU simulation capability and saved results.
- Record hashes of all code/data/metadata/acceptance artifacts. **Renew GPU acceptance if changed files invalidate the accepted evaluation closure.** Do not bypass pinned historical integrity checks.

If any consequential gate fails, stop official research until corrected and reverified; do not waive correctness to gain speed.

---

## Phase 5 — Execute and preserve the full research

After the protocol and all engineering gates pass, proceed through the complete study, not merely a pilot.

### 5A. Standalone D1

From-scratch independent optimization of D1 MSFT on the full precommitted parameter and risk-control space. Preserve meaningful structural diversity and independent seeds. Report signal scarcity, losing dip clusters, maximum-hold exposures and whether dip episodes span enough independent years/market regimes to support qualification.

### 5B. Standalone Growth

From-scratch independent optimization of Growth MSFT using all precommitted supported exit/entry structures, including protected and open-ended variants. Account for prolonged trends, high open-profit concentration, adverse market regimes and gaps. Do not let a single enormous winner satisfy robustness requirements by itself.

### 5C. Fixed combined pair

Without retuning the standalone phenotypes, evaluate all predeclared admissible D1/Growth finalist pairings with the actual one-slot allocator. Analyze capital occupancy, displaced entries, signal priority, contribution of each family and whether the pair adds value beyond the better standalone choice.

### 5D. Fully joint optimization

Independently search both D1 and Growth together in each proposal, with the full shared-slot replay and complete numerical/structural phenotype mutation. Compare all relevant risk objectives, participation and opportunity displacement against the fixed pair and standalones. Permit the valid conclusion that joint optimization adds no value.

### 5E. Sequential D1 → Growth

Use precommitted eligible D1 finalists, freeze their vectors and structures, then search Growth against each frozen D1 in the shared-slot portfolio. Ensure the second-stage objective is **pooled net/risk**, not standalone Growth profit. Report fair budget comparison to fully joint and the actual number of D1 finalists carried.

### 5F. Chronological qualification and final period

At each predeclared historical cutoff, redo the entire permitted selection procedure using only data available through that cutoff; seal its selected IDs/parameters/protocol, then replay into the next slice without retuning. Carry causal position state across boundaries and report both reset-slice and whole-run drawdown. Label previously inspected 2020/2022/2025–2026 history as **retrospective**, not pristine holdout or fresh prospective proof.

Keep the 2025–2026 period isolated until the final C24 selection is frozen and committed. Open once for validation under predeclared gates, with no post-validation search changes. If a valid candidate fails the chronology requirement, classify it appropriately as **development-qualified only, not independently deployment-qualified**. A finding of **NO QUALIFYING MSFT CANDIDATE** is a valid research outcome.

### Search-budget and convergence discipline

The user explicitly authorizes substantial GPU compute where it may improve scientific reliability. Prior research found material variability among independent seeds even when individual lanes stopped under their own convergence rules. Therefore:

- Audit seed dispersion and coverage per arm, cutoff, structural cell and replicate round.
- Apply precommitted extensions where ongoing progress justifies them; do not starve Growth or the joint arm because their search space is larger.
- Distinguish positive in-sample improvements from chronologically supported improvements; additional evaluations cannot create genuinely unseen historical regimes.
- Report requested, actual, unique and cached evaluations separately, along with job/GPU time, memory, jobs, budget-bound lanes, coverage-limited lanes, stop reasons and any extensions not used.
- Do not change budgets, search domains or the winning criterion in response to final-period outcomes.

---

## Phase 6 — Analysis and final comparisons

Produce one coherent comparison table for D, G, C, J and S covering:

- Development 2016–2024 net and marked-DD.
- Chronologically chained 2020–2024 net, drawdown and qualification result.
- 2025–2026 validation net, reset-DD and whole-run DD; full-history net and DD.
- Gross/interest/cost decomposition; funded trades, win rate, trade durations, turnover and capital occupancy.
- Individual principal loss, max banked-capital DD, peak-to-trough giveback, worst open losing positions and extreme gap fills.
- Neighborhood p10/median/p90/p95 profit and risk, share of perturbations exceeding the 35%-of-initial-allocation ceiling, seed stability and worst-tail results.
- Per-strategy contribution and displaced-opportunity analysis for combined strategies.
- Chronological episode and annual contribution, profit concentration, lookahead and data limitations, financing sensitivity, stop slippage, and any meaningful MSFT-specific corporate-action/distribution effects.
- Materiality/robustness decision against the better standalone candidate, between J and S, and against corresponding fixed combinations, following the frozen rule.

Also provide transparent buy-and-hold comparisons under equivalent exposure/financing assumptions. Do not compare an unfinanced MSFT buy-and-hold to a continuously borrowed $100,000 strategy without disclosing the difference.

**Important:** A profitable trade can have a substantial marked-equity drawdown caused by giveback of unrealized gains. Report this separately from loss below principal. A stop level is not a guaranteed execution-price cap. Do not treat any retrospective risk ceiling as a live risk guarantee.

Preserve alternate phenotypes if genuinely distinct and supported, but do not retroactively label an attractive development-only result as qualified merely because it nearly passed the chronological drawdown limit.

---

## Phase 7 — Storage, Git and immutable research records

- Work in a dedicated research branch with scoped changes. Do not silently merge into `main`, overwrite sealed TSLA/GDX/New L0/N/original records or alter unrelated research standards.
- Keep raw MSFT SIP data, GPU binaries and large job archives out of Git in canonical ignored paths; commit metadata, manifests, tests and reports according to existing standards.
- Inspect free disk space and expected official-job growth before each major search phase. Compress **completed** MSFT job SQLite archives individually with verified Zstandard, streaming/restoration hashes and representative SQLite integrity/row-count checks, only after writers stop. Preserve original compressed archives, manifests and restore commands; delete originals only when safely verified and idle. Do not automatically delete unrelated caches.
- Reuse existing verified Priority 5/TSLA/GDX archive-restoration procedures and retain compressed research evidence. If space or performance becomes a blocker, report and stop the risky operation rather than damaging research artifacts.
- Preserve append-only amendments, complete search job and data-door logs, freeze and acceptance hashes, outcome/selection identities and the entire reproducibility path.
- Commit and push the completed branch when safe, verify local/remote HEAD agreement, and deliver a clean or fully explained Git state. No force pushes.

---

## Phase 8 — Mandatory portable ZIP handoff

Produce a **self-contained, checksum-verified ZIP** suitable for direct upload to the original Margin Trading ChatGPT conversation. Include `READ_FIRST.md` and specify its reading order.

Required files or equivalent documented study-standard names:

1. `READ_FIRST.md`, executive outcome and evidence labels.
2. `REPORT.md`, `COMPARISON.md`, `DECISION_REGISTER.md` and clear go/no-go recommendations.
3. `PROTOCOL.md`, `PROTOCOL_FREEZE.json`, standard-adoption manifest, amendments, data-door logs, selection/outcome artifacts and full source/data identities.
4. `MSFT_DATA_AUDIT.md` and machine-readable audit; Alpaca source coverage and split/corporate-action verification with hashes.
5. `FUNCTIONALITY_AUDIT.md` describing D1/Growth structures, exit controls, parity and preserved semantics.
6. Standalone D1 and Growth, fixed combined, fully joint and sequential research reports, with exact finalist vectors and IDs.
7. `CHRONOLOGICAL_VALIDATION.md`, `ROBUSTNESS_AND_RISK.md`, annual/episode/cost/gap/neighborhood diagnostics and per-strategy attribution.
8. `SEARCH_AND_CONVERGENCE_REPORT.md` with stage budgets, seed dispersion, extensions, convergence/budget status, and actual GPU resources.
9. `GPU_PARITY_AND_ACCEPTANCE.md`, tests, negative/tamper evidence, Strategy Lab nonregression and outcome-identity reconciliation.
10. `STORAGE_PRESERVATION_REPORT.md` for any large archives, plus manifest/hashes/restoration instructions.
11. `RESEARCH_RECOVERY.md`, exact reproduction commands, study/source Git commit, runner configuration, datasets and omitted-artifact locations.
12. `IDENTITY.txt`, `OMITTED_ARTIFACTS.md`, `SHA256SUMS.txt`; ZIP integrity check and secrets/personal-information scan.

Include compact machine-readable results and the necessary report tables; do not include huge licensed market datasets, job SQLite archives, binaries, node_modules or secrets. Do not create visual charts unless explicitly requested. Test extraction and verify **every listed hash** after packaging. Preserve the ZIP and a handoff copy in the documented host handoff directory if available.

---

## Final acceptance criteria

The assignment is complete only if:

- MSFT data, early closes, splits, session hours, and data-door chronology are verified and reproducible.
- The five approaches were evaluated under one consistent portfolio and risk methodology, with sufficient precommitted compute and transparent convergence reporting.
- Every required CPU/GPU correctness, acceptance, negative, outcome-identity and Strategy Lab gate passed or a material blocker was transparently recorded.
- Historical frozen research remains intact, including sealed TSLA and GDX results.
- The chronological/validation evidence is accurately distinguished from development results and previously inspected history.
- The output is a research-only result, which may legitimately be **no qualifying candidate**.
- Complete, reproducible results and a checksum-verified ZIP handoff are committed/pushed on a research branch, with no strategy adopted, deployed, traded, or merged into `main`.

**Proceed end to end after the data, protocol and engineering gates pass. No further confirmation is required for ordinary preregistered search extensions. If a material correctness/integrity blocker occurs, stop and report rather than silently weakening a safeguard.**

End your final response with the research verdict, branch/commit, and exact portable ZIP location; explicitly state that **no trading strategy was automatically adopted or deployed**.
