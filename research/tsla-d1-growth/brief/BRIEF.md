# Claude Code — Priority 6: TSLA D1 + Growth Research, with Priority 5 Archive Preservation

## Mission and authorization

Execute the next approved Margin Trading research initiative **end to end**:

1. **Safely compress and preserve Priority 5's approximately 196 GB of official GPU job archives**, then audit—but do not indiscriminately delete—the other approximately 22.6 GB of caches.
2. **Acquire, validate, and freeze TSLA historical SIP minute data**, including correct corporate-action adjustments and consistent treatment of market sessions.
3. **Audit the available D1 and Growth strategy/exit functionality** and precommit an appropriate TSLA-specific optimization protocol.
4. **Optimize TSLA D1 and TSLA Growth independently**, evaluate their fixed combination, and perform both **joint** and **D1-first sequential** shared-capital optimizations.
5. Perform rigorous risk, parameter-neighborhood, chronological, execution, and GPU/CPU verification; produce a complete portable, checksum-verified ZIP handoff.

This assignment is authorized to perform real optimization and substantial GPU computation **after** its source-data, engineering, acceptance, and protocol-freeze gates pass. A small or arbitrary compute budget is not desired: invest enough in diverse search and independent replication to get useful answers, extend exploration under predefined convergence rules where justified, and stop when evidence of diminishing returns makes further computation unproductive.

**Research only. Do not deploy, trade, contact a broker, replace a frozen candidate, silently merge into `main`, or begin the MSFT study.**

Read this entire prompt, including its final success criteria, before working. Read `CLAUDE.md`, the current `docs/research/OPTIMIZATION_STANDARD.md`, its protocol template and version registry, `docs/research/methods/NEW_L0_METHOD.md`, `docs/gpu/PARITY_CHECKLIST.md`, `docs/gpu/FEATURE_MATRIX.md`, and the relevant canonical-data, split-adjustment, research-workflow and GPU-operation documentation first. Follow the **verified current versions**, not assumed old paths or commits.

---

## 0. Recover the current repository and the preceding study

Repository: `/home/chad/projects/margin-trading` (verify actual path).

The most recent completed project was Priority 5, a 44.6-million-evaluation joint search of D1·VGT + D1·GDX + Growth·VGT. Its sealed conclusion was **no material successor**. Preserve these identities:

- **N/original:** preferred VGT/GDX research incumbent, not deployed.
- **New L0:** immutable VGT/GDX historical benchmark.
- **I1:** separate S1-enabled research comparator; preserve its sealed results, but do not import S1 into TSLA research without an explicit, separately authorized protocol.
- **P0:** original 35% maximum marked-minute drawdown **relative to the fixed initial trading allocation**; not 35% of peak equity.

The Priority 5 handoff identifies the study as `research/vg-l0-n-successor/` and the research branch as `research/vg-l0-n-original-successor` (reported final commit `dc023c3b`). **Verify** its present Git lineage, sealed artifacts, job manifest and completion; do not assume that branch is checked out now. The portable source handoff includes `READ_FIRST.md`, `OMITTED_ARTIFACTS.md`, `DECISION_REGISTER.md`, and `RESEARCH_RECOVERY.md`.

Before any code changes:

- Inspect `git status`, active worktrees, other running processes, current branch and accepted GPU source/binary record.
- Protect frozen studies and avoid modifying unrelated work or historical sealed records.
- Establish a new dedicated TSLA research branch on a compatible accepted-GPU lineage. Keep implementation, raw data, temporary outputs, and research artifacts isolated according to repository conventions. Do not force a branch checkout over dirty work.
- Identify the old Priority 5 archive manifest at `research/vg-l0-n-successor/reports/diagnostics/job-archives.sha256` or its verified current equivalent.
- Write a short recovery/inventory record before irreversible storage operations.

### 0A. Preserve and compress the approximately 196 GB of official Priority 5 archives

Priority 5 reported **29 SQLite job archives**, approximately **196 GB total**, under `research/vg-l0-n-successor/cache/jobs/`; the entire ignored study cache was approximately **218.6 GB**. The user explicitly wants the official archives compressed safely to recover disk space. Do this before importing TSLA data or launching expensive GPU research.

Requirements:

1. Locate the exact archive files and verify each original file's size and SHA-256 against the Priority 5 manifest. Confirm that no optimizer, writer, SQLite process, or other running task can modify them.
2. Check available storage, I/O capacity and whether compression can safely proceed without starving the system or active workloads. Prefer per-file, restartable, atomic Zstandard compression instead of creating a single enormous monolithic archive.
3. Preserve the SQLite file identities and original relative paths in a restoration manifest. Record the Zstandard version, compression options, SHA-256 of each original, SHA-256 of each compressed file, sizes and ratios.
4. Verify every compressed file with `zstd -t` (or equivalent), **and verify a streamed decompression SHA-256 against the original hash**. For representative archives, restore to isolated scratch and perform SQLite `PRAGMA integrity_check`, required schema/row-count checks and a reproducibility smoke test. If space permits, broaden the restore integrity checks.
5. Only after a specific archive passes all required verification, no reader needs the original, and a documented restore command is verified, may its **original uncompressed ignored cache copy** be deleted to reclaim space. Make deletions per-file, restartable and logged. Never delete the verified compressed copy or its manifests.
6. Do **not** change tracked research records, old seals, optimization code, acceptance pins, or stored results to accommodate compression. Do not falsely claim exact historical reproducibility if needed artifacts are missing.
7. Audit the other approximately 22.6 GB of ignored engineering, pilot, diagnostics and other caches by path, size, regenerability, likely future usefulness, and dependency. **Report recommended candidates for removal; do not delete these other caches in this assignment** unless their removal is independently authorized by applicable existing cleanup instructions. Keep recent/useful caches.
8. Preserve sufficient disk headroom for the TSLA data import and GPU jobs. If archive hashes fail, scratch space is insufficient, or a reader requires original archives, stop that destructive operation and report the exact blocker rather than taking shortcuts.

Deliver a `STORAGE_PRESERVATION_REPORT.md`, compressed manifest, restoration instructions, actual bytes recovered and post-cleanup verification. Repeat the relevant historical-research and GPU-acceptance checks after the archive work.

---

## 1. Study boundary: TSLA only

**This study trades only TSLA.** It is not a Tesla/Microsoft portfolio, not an extension of the VGT/GDX shared-capital strategy, and not an ETF-stock mixed pool.

Study the following:

- **TSLA D1 standalone:** fully optimized Dip Recovery strategy on TSLA.
- **TSLA Growth standalone:** fully optimized Growth strategy on TSLA.
- **Fixed combined TSLA D1 + TSLA Growth:** combine selected independently optimized phenotypes with one shared slot, **without re-optimizing** their parameters in that arm.
- **Joint TSLA D1 + TSLA Growth:** optimize both strategy parameter vectors together, scoring the entire one-slot chronological portfolio.
- **Sequential TSLA D1 then Growth:** optimize the D1 component, freeze its chosen phenotype, then optimize Growth **against the full shared-capital portfolio containing the frozen D1**; do not optimize Growth only on standalone returns in the second step.

These are distinct scientific questions. Report both standalone outcomes and the actual combined outcomes. Never sum standalone P&L to approximate a pooled strategy.

Use the established research convention of a **fixed $100,000 trade notional/one exclusive funded capital slot**, no compounding unless an explicitly approved existing protocol requires otherwise; modeled 5 bps/side execution costs and 11% simple margin interest, subject to confirming the current canonical conventions. P0's historical 35% marked-DD budget is **35% of the initial $100,000 allocation**, i.e. $35,000. Express scalable constraints as percentages, but do not silently replace them with percentages of running peak equity. Report principal loss, banked-capital DD, profit giveback, tail risk, financing and margin considerations as separate measures.

Keep original calendar-day holding semantics, the existing chronological allocator, signal/funding priority and execution order. Shadow-position delayed-entry eligibility remains OFF. S1 staged trailing stops remain OFF. Do not add TSLA to New L0, change any frozen VGT/GDX phenotype, or introduce an unapproved new entry/exit family.

---

## 2. Obtain and verify historical TSLA minute data **before searching**

The repo previously did not contain TSLA's full historical minute dataset. Confirm the current state rather than assuming this is still true.

- Prefer the existing **Alpaca SIP 1-minute OHLCV** source and the repository's canonical loader/market-data conventions. Verify the currently available entitlement, API credentials through approved secure environment mechanisms, coverage, rate limits, licensing, and costs. **Do not expose credentials or purchase a new paid service without authorization.**
- Obtain the maximum verified continuous coverage suitable for the study, ideally starting at the original 2016-01-04 research start and extending through the common complete endpoint used by the current VGT/GDX work (historically 2026-10-30). Determine the **actual** obtainable endpoint from TSLA data; never invent missing dates or silently fill price bars.
- Verify regular NYSE trading sessions and ET/UTC conversion, holidays, halts, early closes, missing or duplicate minute bars, outliers, data completeness, stable sorting, and exact first/last timestamps.
- **Audit all applicable TSLA corporate actions and splits using authoritative event records** and verify adjustment direction and share units. Ensure no double split-adjustment or mismatch between downloaded prices and the canonical engine. If vendor prices are adjusted, document how the loader handles them. Spot-check prices around every historical split against an independent authoritative source where feasible.
- Ensure the canonical data is internally consistent at the same price basis across D1 and Growth, including share counts, fills, cost basis, stops and P&L. Use existing corporate-action adjustment pipelines rather than inventing new transformations.
- Make a machine-readable `TSLA_DATA_AUDIT.json` and Markdown report with source, entitlement, dates, session coverage, missingness, split records, hashes, prices basis, reproducible fetch commands, API quota/cost accounting, and quality blockers.
- Perform **train-only** descriptive suitability analysis: dip/recovery episode counts, uptrend opportunities, signal density, holding-duration feasibility, extreme gaps, corporate-action effects and liquidity. Do not use future prices to form signals or tune strategy/search choices.

**Data-door discipline:** Physically isolate allowed price data by stage and cutoff before searching. The end of the data file may be inspected for timestamp/coverage, but do not expose validation price/return outcomes to any optimization/selection. The standard's 2016–2024 development and 2025–2026 validation framework is the starting point; verify the actual endpoint. Precommit chronological fold cutoffs and selection criteria before accessing the next-period performance. The 2025–2026 market period has been repeatedly studied in the broader project; label it appropriately rather than calling it a pristine, truly independent final holdout.

If the approved data source cannot deliver an adequately complete and validated TSLA research set, **do not run expensive optimization on a silently incomplete substitute**. Deliver the completed storage and data audit, document the exact issue and the least invasive remedy, and stop rather than fabricating coverage.

---

## 3. Audit D1/Growth functionality and define the allowed TSLA genomes

Before optimizing, inspect the **actual current engine**, which may include research-only branches or versioned variants. Establish which D1 and Growth parameters, toggles and exit families are available through the authoritative CPU code and accepted GPU evaluator.

Specifically audit:

- D1 dip entry, buy execution, continuation, profit-conditional trailing stop, stop timing, material-loss restrictions, reset/re-entry rules, calendar maximum hold and optional already-supported downside controls.
- Growth signal generation, trend filters, eligibility, continuation, initial protective stop, trailing stop, maximum-hold switches, buffered exits, partial retention, and their interactions.
- The exact behavior when an **open-ended Growth** configuration has both its maximum hold and initial protective stop disabled. Do not automatically forbid it if it is a legitimate existing option; provide explicit stress and capital-occupancy analysis, and ensure protected and unrestricted structures receive fair predeclared consideration.
- Same-symbol D1/Growth signal collisions, event precedence, shared-slot occupancy, rejected signals and deterministic tie resolution.
- Which options were evaluated on GPU in Phase 7 versus which would require versioned implementation and renewed acceptance. **Do not activate S1 or unmerged experimental stop logic merely because source files exist.**

The TSLA study must preserve all legitimate and supported D1/Growth functionality. Do not omit a difficult feature to simplify CUDA, shrink a parameter domain around previously successful VGT/GDX phenotypes, or silently change exit semantics.

If the current intended strategy family cannot be represented with the accepted GPU backend, perform the required scoped engineering, authoritative CPU tests, CUDA parity work and acceptance renewal **before** searching; if correct parity cannot be demonstrated, stop and report. Do not replace exact functionality with an approximation.

Use the original reference phenotypes (including New L0/N/original settings) only as **clearly labeled external controls when sensible**, never as preferential seeds in a purported from-scratch TSLA search. TSLA's parameters should be discovered from its own development history.

---

## 4. Freeze the TSLA research protocol **before any optimization**

Create a versioned, reproducible protocol from the current optimization-standard template and record the standard-adoption manifest. Keep a read-only snapshot of the prepared data and hashes. Follow NL0's proven search algorithms and design safeguards where transferable, but **explicitly document all adaptations** necessary for a different underlying, two-book, same-symbol pool and standalone experiments.

Predeclare:

1. All candidate families and switches, their numerical domains and sampling distributions; behavior for impossible/inert combinations; treatment of structural variants.
2. Standalone D1 and Growth search budgets and selection criteria.
3. Fixed-combination evaluation policy, how standalone finalists are paired, how many pairs are carried, and how to avoid opportunistic cherry-picking.
4. Full joint search stages, from-scratch global exploration, independent seeds, diversity, local refinement, and neighborhood evaluation.
5. D1-first sequential search, D1 finalist freezing, Growth integration search and shared-pool scoring.
6. Clear search-budget and comparable-effort methodology, including cost differences for single-book and pooled evaluations; ensure no track is unfairly underfunded.
7. Search stopping and **convergence-driven extension rules**, specified before results. Budget-bound lanes and behavior-class coverage must be disclosed separately from true improvement saturation.
8. Candidate-ranking methods and tie rules: original NL0/P0 selection as the reference; **RA1 as a separately labeled experimental selector on identical candidate populations** if compatible. Do not automatically promote RA1 or retrospectively adjust its thresholds based on TSLA results.
9. Risk constraints, minute marked DD, neighborhood p90/p95 and worst-tail metrics, principal-loss/banked-capital diagnostics, gap/slippage/interest stresses and profit giveback.
10. Chronological folds, exact data doors, warm-up and boundary-state carry, selection seals, validation schedule and previously examined-history disclosures.
11. Precommitted advancement, qualification, non-inferiority and material-successor criteria. **No qualifying candidate** must remain a legitimate outcome.
12. Baseline comparison to TSLA buy-and-hold and meaningful standalone/fixed-pool controls, consistently normalized for exposure, financing and costs. Do not claim a leveraged active strategy is superior based on inappropriate notional or lookahead comparisons.
13. GPU job identities, resource/memory budgets, no-Maglev runtime, error handling, checkpoint/resume, archive retention and portable delivery.

Commit/push the protocol and its hashes **before executing the governed searches**. Any subsequent change requires the standard's append-only amendment and evidence disclosure; no retroactive alteration of risk gates to make a favorite candidate qualify.

### Computational effort

The user explicitly authorizes **substantial GPU computing** when it has a reasonable prospect of improving coverage or evidence. Use the actual accepted RTX 5090 throughput and Priority 5 convergence lessons to set suitably generous budgets; *do not cap the study to a fixed number of days merely to finish early*.

Use broad exploration and multiple independent seeds for both D1 and Growth. The smaller two-book TSLA search space is **not** a reason to perform a token-sized search. Search original parameter domains, not only a neighborhood of VGT/GDX's incumbents. Distribute compute across strategy families and search modes fairly. Precommit performance/coverage-based extension triggers and a finite safety/resource hard cap, then use extensions when they genuinely improve quality. Stop when measured convergence makes more evaluations unlikely to help; report all unresolved coverage limitations. More compute must never justify validation leakage or methodological changes after results are seen.

---

## 5. Engineering and CPU/GPU correctness gates (mandatory)

Before optimization, and whenever a compatibility/enforcement dependency changes:

- Verify current GPU acceptance and out-of-band pin under the current source tree and actual RTX 5090 device; use the repository's official `openOfficialGpuSession → GpuPool → EvalLab` path and required `node --no-maglev` runtime.
- Treat the CPU/TypeScript evaluator as the **authoritative behavior** and CUDA as its parity-gated accelerator. Execute the full applicable `docs/gpu/PARITY_CHECKLIST.md` campaign, including new same-symbol D1/Growth combinations, TSLA splits, all enabled risk/stop families, boundary behavior, gap-through-stop fills, costs, interest, risk metrics, multi-book chronology and candidate qualification.
- Compare candidate-level trades, timestamps, prices, cost and interest, funded/rejected events, P&L, drawdown, and ranking. Require zero unexplained consequential mismatches; exact supported equality wherever the engine requires it. Do not average away discrepancies.
- Verify fixed-seed optimizer behavior, candidate ordering, checkpoint/resume, tamper/negative cases and official job attestation. Renew GPU acceptance after pinned source changes; fail closed. **No silent CPU fallback for official optimization.**
- Verify New L0 and N/original sealed benchmark reproduction on their original datasets, where required by change-impact scope, without modifying the old results.
- Run required unit/integration tests, research preflight and Strategy Lab typecheck/tests/portfolio parity, ensuring Strategy Lab's **CPU simulation path and saved results remain unaffected**.
- Record engine/source/data hashes, acceptance record, parity and all test outcomes. Do not start official TSLA optimization until these gates pass.

Archive compression from Phase 0 must not be treated as evidence that CPU/GPU trading behavior changed; verify it independently without weakening acceptance requirements.

---

## 6. Execute the research, chronologically and reproducibly

Complete each stage and preserve its sealed record before proceeding:

### Stage A — TSLA standalone D1

Perform a properly funded, from-scratch D1 optimization on TSLA. Test the full predeclared supported D1 family/parameter space, including relevant optional downside controls where authorized and supported. Maintain structural and phenotype diversity; report candidates rejected or qualified under risk gates. Preserve a primary and genuinely distinct alternates when supported by the frozen rules. Include training-only independent replicates, neighborhood risk and local refinements.

### Stage B — TSLA standalone Growth

Perform an equally rigorous independent TSLA Growth search, including the supported and precommitted exit controls. Preserve protected and unrestricted Growth structures as separately analyzable variants. Report open-position exposure, gap susceptibility, trend dependence, profit giveback, and genuine downside exposure. Do not favor Growth based on sparse spectacular winners alone.

### Stage C — Fixed D1 + Growth combination

Using the independently selected, frozen standalone vectors, evaluate the predeclared pair(s) in one exclusive $100,000 slot with the actual common TSLA chronology. No additional numerical tuning in this arm. Report displacements, capital-occupancy conflicts, accepted/rejected signals, contributions by strategy and whether the combination adds value relative to standalone alternatives.

### Stage D — Fully joint D1 + Growth optimization

Optimize the **D1 and Growth parameter vectors together**, including any permitted structural switches, with each candidate evaluated against the full shared-slot portfolio. Use independent global exploration and applicable NL0-style informed refinement if predeclared, with transparent provenance of all seeds. Compare against standalone and fixed-combined results; preserve distinct finalist phenotypes rather than collapsing to one high-profit cluster.

### Stage E — D1-first sequential optimization

Choose and freeze D1 finalists under a precommitted rule, then optimize Growth against that **frozen D1 + Growth shared-capital portfolio**. Do not let D1 drift during the Growth step. If multiple D1 finalists advance, specify the count and budget before seeing Growth results. Compare fairly with joint optimization; avoid claiming the architecture itself won merely because it received more evaluations or easier search conditions.

### Stage F — Chronological qualification and final-period assessment

Across the predeclared cutoffs, reconstruct **what the entire selection procedure would have selected using only earlier data**, then replay into the next period without retuning. Carry causal state across boundaries and distinguish reset DD from full-history DD. Apply the standard's binding chronological verdict and neighborhood stress requirements.

Finalize the candidate slate and provenance **before** opening later validation returns. Treat 2025–2026 as previously examined broader-market history; acknowledge selection bias and the absence of a prospective unseen trading period. Run validation once under the sealed protocol, with no revision to finalist selection based on its outcome. Perform stress tests and post-selection diagnostics only in permitted report-only ways.

For all stages, persist actual funded trades, unrealized mark series or reproducible minute risk records, open positions, costs, interest, risk events, drawdown components, capital utilization, and mutually displaced opportunities. Separate profit attributable to parameter changes from profit attributable to a different allocator chronology. Do not mistake giveback of unrealized gains for loss below principal.

---

## 7. Required scientific comparisons and reporting

Provide a single transparent comparison of:

- TSLA D1 standalone finalist(s).
- TSLA Growth standalone finalist(s).
- Fixed combined D1 + Growth portfolio(s).
- Fully joint-optimized D1 + Growth portfolio(s).
- Sequentially optimized D1-first + Growth portfolio(s).
- Relevant original/legacy and buy-and-hold controls, with honest financing/exposure normalization.

Report **development, chronological fold, and final-period evidence separately**. For each candidate and approach, include: net and gross P&L, interest and trading costs, marked minute DD normalized to initial trading allocation, worst realized and worst marked principal loss, banked-capital DD, profit giveback, margin/liquidation scenarios (illustrative only), trade count, duration, win rate, per-family contribution, utilization/occupancy, displacement and missed-opportunity attribution, annual/episode results, worst trades, parameter vectors, neighborhood median/p10/p90/p95 and extreme-tail risk, robustness to costs and slippage, and search effort/coverage/convergence.

Distinguish center results from perturbation distributions. Treat overfitting, rare-trade dependence and structurally unbounded exposure as risk disclosures; do not claim a theoretical stop is a guaranteed loss cap. Explicitly explain cases where a profitable exit still produces significant conventional peak-to-trough drawdown.

Apply the **same strategy selection rules to all methods** where a fair comparison is possible. If any numerical win stems from changing evaluation basis or data coverage rather than genuine strategy improvement, report it explicitly. Do not promote a candidate that fails binding risk/chronological gates without the user's separate decision.

Do **not** automatically combine TSLA with MSFT, VGT, GDX or the user's investment portfolio. That is a future, separate research question.

---

## 8. Preservation, Git and storage discipline

- Run on a dedicated research branch based on an accepted current GPU lineage. Do not merge into `main` or modify unrelated frozen studies.
- Keep raw TSLA data and large job caches in the correct git-ignored locations; commit metadata, manifests, protocol, results, reports and reproducibility instructions appropriate to repository policy. Keep actual secrets and licensed raw market data out of the handoff.
- Check available disk before each high-volume stage. Do not allow official job archives to consume uncontrolled space. Use safe archive compression only when all relevant jobs have completed and the files can be restored bit-identically, with checksums and manifests.
- Preserve Priority 5's compressed job archives and the restoration procedure. No recursive cleanup commands against shared research directories.
- Preserve every sealed result, append-only amendments, branch and commit identities, accepted GPU record, positive/negative parity evidence, and data-door log.
- Commit and push completed study materials and verify remote commit equals local. No force push or alteration of historical selection seals.

---

## 9. Portable handoff — mandatory

Deliver a **self-contained, checksum-verified portable ZIP** for review in the original Margin Trading ChatGPT conversation. The ZIP must not contain enormous raw minute datasets, SQLite job archives, CUDA binaries, credentials or dependencies that can be recovered by reference.

Required contents:

1. `READ_FIRST.md` — concise executive summary, actual study result and exact reading order.
2. `REPORT.md` — full evidence and conclusions.
3. `DECISION_REGISTER.md` — precommitted choices, adaptations, outstanding user decisions.
4. `PROTOCOL.md`, standard-adoption manifest, freeze hashes, amendments and door records.
5. `TSLA_DATA_AUDIT.md`/`.json`, corporate-actions/split verification, data hashes and source coverage.
6. `STORAGE_PRESERVATION_REPORT.md`, original/compressed Priority 5 archive manifests, verification and restoration instructions, other-cache audit and recovered storage metrics.
7. Standalone D1 and Growth reports; fixed combined, joint and sequential reports; finalist phenotype vectors and comparison tables.
8. Chronological validation, parameter-neighborhood distributions, tail-risk, cost/slippage/gap tests, and attribution results.
9. Search-budget and convergence report with per-stage counts, seeds, actual GPU time, performance-based extensions, budget-bound/coverage-limited lanes and stopping rationale.
10. GPU parity, acceptance and engineering regression reports, including Strategy Lab non-regression.
11. `RESEARCH_RECOVERY.md`, precise reproduction commands, environment/code/data hashes, job archive pointers and restore requirements.
12. `SHA256SUMS.txt`, package identity with exact Git commit and SHA-256, ZIP integrity verification and a secrets scan.

Keep useful results in Markdown tables and machine-readable files. **No visual report artifacts unless the user separately requests them.** State clearly which evidence is retrospective, independently chronological, report-only, or prospective.

---

## 10. Acceptance and final success criteria

A valid completed assignment must establish:

- The Priority 5 official archives are safely compressed and hash/restore verified, with actual disk savings reported; other caches audited without indiscriminate deletion.
- TSLA historical minute data and corporate actions are verified and reproducible; missing/uncertain data are disclosed rather than hidden.
- A frozen, versioned and standards-compliant research protocol was committed before optimization.
- All five required TSLA research approaches were performed on comparable data and correct shared-capital semantics (or an exact scientific blocker is documented).
- Sufficient independent exploration and local refinement were performed, with convergence-based budget extensions and clear stopping evidence.
- All official optimization passed accepted GPU enforcement and CPU/GPU parity, including any added TSLA-specific functionality; Strategy Lab remains unaffected.
- Qualification and subsequent-period assessments followed chronology, and the final-period data were not used to tune the search retrospectively.
- No legacy benchmark, active trading strategy, broker account or `main` was changed or deployed.
- A complete portable, checksum-verified ZIP handoff was produced and pushed for review.

**Complete the actual TSLA optimization when the prerequisites pass. Do not stop after merely drafting the protocol.** If a material data, parity or research-integrity blocker makes the optimization unsound, stop safely and report the blocker with whatever valid earlier phases have been completed. Do not invent a result or bypass a gate.

**Final user-facing response:** Summarize the archive-compression outcome, TSLA data coverage, standalone/joint/sequential results, chronological/risk qualifications, GPU parity/convergence, Git branch/commit, and link/path to the portable ZIP. Finish by stating explicitly that no strategy was adopted or deployed and MSFT was not started.
