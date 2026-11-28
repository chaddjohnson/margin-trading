# Claude Code — Stage B: Replicated GPU Risk-Envelope Comparison (P0 vs P3)

## Authorization and limits

**This assignment is authorized to implement and execute Stage B research.** It is a controlled comparison of the frozen original NL0 risk policy with the previously investigated 40/25/30 envelope. Do not adopt a strategy, change the permanent optimization standard, merge research code into `main`, deploy anything, or access a broker.

The user has made **up to nine hours of overnight compute time available**. This is a **hard execution window, not a target to consume**. Use the extra capacity only to improve the scientific quality of this predeclared comparison. Do not expand parameter domains, change fitness rules, add new risk thresholds, or chase an apparently winning result. If the study finishes sooner, stop.

**Primary design decision:** Increase Stage B replication from the originally proposed 8 new paired replicates per cell/cutoff to **16 new paired replicates** (R3–R18), using the same existing per-lane schedules, algorithms and 41,000-evaluation cap. This improves precision without privileging an arm or changing its optimizer.

**Additional chronological evidence:** Include the previously optional **C19** cutoff (2016–2019 development → 2020–2021 subsequent interval) as a *precommitted secondary analysis*, provided the existing official door, evaluator, and protocol can support it with verified semantics and without modifying strategy behavior. Give it the same 16 new paired replicates per cell. Before freezing the protocol or beginning any search, profile/estimate the full design and check compatibility. If C19 would require material engine changes, violate historical integrity, or make the nine-hour window implausible, **omit C19 before any research results are examined** and document that decision and why. C21/C24 remain the primary prespecified comparison either way. Never add or remove cutoffs based on observed profitability.

The first output of this assignment must be a frozen, versioned research protocol with exact chosen cutoffs, lane matrix, seed identities, expected and hard evaluation bounds, budgets, stopping rules and chronological decision gates. **Do not start optimization until the protocol and its amendment rules are committed.**

## 1. Read and verify source material first

Repository: `/home/chad/projects/margin-trading` (verify actual location).

Start with `CLAUDE.md` and the current applicable optimization standard. Then read all of:

- `research/vg-l0-risk-envelope-sensitivity/READ_FIRST.md`
- `research/vg-l0-risk-envelope-sensitivity/STAGE_B_OPTION.md`
- `research/vg-l0-risk-envelope-sensitivity/REPORT.md`
- `research/vg-l0-risk-envelope-sensitivity/POLICY_MATRIX.md`
- `research/vg-l0-risk-envelope-sensitivity/PROTOCOL.md`
- `research/vg-l0-risk-envelope-sensitivity/DECISION_REGISTER.md`
- The completed risk-envelope pilot's `READ_FIRST.md`, `PROTOCOL.md`, `REPORT.md`, `AMENDMENTS.md`, and relevant sealed results
- `docs/research/methods/NEW_L0_METHOD.md`
- GPU acceptance, official optimization, parity and operations documentation, including the Phase 7 evidence
- The Stage A `STAGE_B_OPTION.md` referenced methodology and candidate-population definitions

Verify the current Git lineage, branch, working tree, existing jobs, data identity, compressed archive availability and accepted GPU record. Work in a dedicated research branch/worktree from the appropriate **accepted Phase 7 / pilot / Stage A lineage**. Do not silently switch to `main` or run official research against a stale or invalid acceptance record. Preserve every existing sealed research artifact and its immutable history.

Follow the required `node --no-maglev` runtime in all applicable execution paths. Never bypass the official GPU acceptance gate or silently fall back to CPU for official optimization. CPU may be used only for explicit diagnostic/parity verification.

## 2. Research question and policies

**Question:** Across genuinely new, paired search seeds, can the P3 envelope select candidates with risk-adjusted profitability **not materially worse** than P0, and does it show a credible benefit in principal/banked-capital risk or subsequent chronological behavior?

Two search arms only:

| Arm | Frozen qualification policy |
|---|---|
| **P0 / CTRL** | `nl0-control@1.0.0`: marked-to-market DD ≤ **35% of initial trading allocation (C0)** |
| **P3 / EXP-30** | `sens-p3-40-25-30@1.0.0`: marked DD ≤ **40% C0**; maximum trade principal loss (liquidation basis) ≤ **25% of funded trade principal**; banked-capital DD (liquidation basis) ≤ **30% C0** |

Use the fixed $100,000 shared-capital slot, with the exact existing historical cost, interest, execution and allocator conventions. **These thresholds are optimizer qualification limits, not executable stop losses.** Apply each policy at every appropriate feasibility, promotion, refinement, neighborhood and qualification stage. Preserve the existing selection objectives (including net, robust profit and p90 marked-DD), search schedules, parameter domains, candidate diversity and all applicable NL0/Assignment 3 methods. Do not change trading mechanics, D1/Growth rules, stop handling, holding-period conventions, shadow eligibility, or symbol/strategy composition.

Active combination: **VGT D1 + GDX D1 + VGT Growth**, with **GDX Growth OFF**, original calendar-day holding convention and original allocator. New L0 and N/original are **descriptive frozen benchmarks**, not seeds, finalists automatically eligible for nomination, or search targets.

Do not add P4 (banked DD 35%), P1 (marked DD 40% only), or other policies to the **optimization**. Their existing Stage A read-only results may be summarized as context. No threshold tuning based on Stage B outcomes.

## 3. Matched search design and use of the overnight compute window

Use precisely the original Stage B proposal's two structural cells:

- `GA0.VA0`
- `GB0.VD1`

And initially the two primary historical cutoffs:

- **C21**, with its strictly subsequent 2022–2023 interval
- **C24**, with its strictly subsequent 2025–2026 interval

Precommit the optional additional **C19** secondary cutoff only if the preflight criteria in the authorization section are satisfied, using its verified 2020–2021 subsequent interval.

Use **R3–R18 (16 genuinely new paired replicates)** for every selected cutoff and both cells. The two arms must share the corresponding seed identity, with no arm-dependent component. Historical R1/R2 remain comparison context only and **must not** enter the primary Stage B decision statistic or be used as candidate seeds.

- For C21/C24: `2 arms × 2 cutoffs × 2 cells × 16 replicates = 128 lanes`.
- With C19: `2 arms × 3 cutoffs × 2 cells × 16 replicates = 192 lanes`.

**Do not increase evaluations per lane.** Retain the original NL0/Assignment 3 broad lane algorithm, per-stage budgets, island/refinement policies, neighborhood draws, pruning, stopping rules, costs, qualification draws and final selection convention. If workload changes, distinguish new computational effort from cache hits and requested versus executed evaluations.

The earlier Stage B proposal projected ~1.15M evaluations and ~2.1 GPU-hours for 8 replicates at C21/C24. Doubling replication implies roughly twice that work; adding C19 increases it further. **These are estimates, not a guarantee.** Before running, recompute actual forecasts using current accepted-GPU throughput, archive-hit assumptions and the deterministic maximum, including engineering gates, qualification, chronological replays, reporting, and ZIP packaging.

### Hard safety ceilings

- **Nine hours maximum from the start of the actual overnight execution window to the completion or orderly suspension of execution**. Reserve time for verification and final packaging; do not fill the window with extra optimization just because time remains.
- Use the existing per-lane 41,000-evaluation cap and derive/record the precise total hard evaluation bound for the frozen lane matrix. Do not replace this with an unreasoned arbitrary bound.
- No automatic extension to extra seeds, structural cells, or cutoffs after seeing results.
- If an engineering blocker, loss of GPU acceptance, parity disagreement or unanticipated resource problem occurs, **fail closed and report it**; do not substitute a shorter, biased one-arm run.
- Order and checkpoint paired lanes so each completed unit includes both arms with the same cutoff/cell/replicate. If nearing the hard time limit, stop at a paired checkpoint; disclose the resulting underpowered or incomplete status and avoid representing partial data as the fully preregistered study. Any optional progress monitoring must be blinded to profitability/selection outcomes when making operational decisions.

The goal is **more reliable evidence**, especially across independent seeds and multiple historical regimes, not maximizing the number of evaluations.

## 4. Precommitted statistical comparisons

Preserve the original Stage B decision rubric from `STAGE_B_OPTION.md`, while correctly updating sample sizes for 16 new replicates:

1. For each cutoff/cell/replicate pair, calculate `D = P3 best qualified center net − P0 best qualified center net` using the existing, documented per-lane definition. Explicitly define handling when a lane has no qualified candidate **before** running; do not discard failures or invent profitable substitutes.
2. **Non-inferiority:** lower one-sided 90% paired-bootstrap confidence bound for mean D must exceed **−$5,000 at both C21 and C24**.
3. **Superiority:** mean D > **+$2,500** at both primary cutoffs, with each lower one-sided 90% bound > 0.
4. Report arm-wise best profits, distribution of seed-level outcomes, qualification rates, drawdowns, principal losses, banked-capital drawdowns and uncertainty. Do not infer superiority from one winner.
5. Report the NL0/P0 selector and **original RA1** on identical candidates and qualification draws. If an envelope-adapted RA1 is also included, label it as a **separate descriptive selector**, never silently call it the original RA1 and never substitute it into primary statistics.
6. Report the pooled-shortlist statistic and the pilot's $2,500 materiality margin, separately from the paired-lane statistic.
7. For C19, if included, report its analogous paired results **as predeclared secondary evidence**, not as a substitute for either C21 or C24 passing the primary conditions.

Treat the historical intervals as **previously inspected retrospective evidence**, not clean holdouts. Precommit and seal each cutoff's selected candidates and execution/data identities before opening its subsequent interval. Preserve the single-opening and seal/commit data-door discipline, and report any limit on chronological independence. Do not adjust policies, search rules, or selection after viewing intervals.

The original 35% method remains authoritative until a separate user adoption decision. Passing non-inferiority is evidence for considering P3, **not an automatic standard change**. P3 could be valuable with similar profit and materially stronger principal/banked-capital behavior; quantify that benefit rather than assuming it.

## 5. Verification and reproducibility gates

Before official Stage B optimization, perform the relevant pilot/Phase 7 engineering gates:

- Confirm accepted-GPU record and independent pin for the actual branch, binary and evaluation dependencies.
- Preserve official execution via `openOfficialGpuSession` → `GpuPool` → `EvalLab` with no silent fallback.
- Confirm exact CPU/GPU parity on representative historical configurations, risk envelopes, threshold-boundary cases and invalid-state cases.
- Reproduce the P0/CTRL reference behavior and sealed historical lane evidence, including R1/R2 diagnostics, without treating those old seeds as new replicates.
- Test P3 feasibility at every search and qualification stage, especially BD at **30%**, individual principal loss at **25%**, and correct percentage denominators.
- Confirm deterministic seed pairing, archive/checkpoint identity, resumed-job determinism and fail-closed behavior.
- Run the required optimization-standard preflight and check Strategy Lab nonregression. Do not alter production strategy logic or frozen configurations.

If implementing Stage B modifies pinned GPU acceptance dependencies, rerun the complete required acceptance campaign and update verified pins **before** official optimization. Never bypass or weaken acceptance to save time. Do not include acceptance reengineering in the nine-hour research budget without first honestly adjusting the pre-run design; safety gates outrank use of the overnight window.

Use the source-of-truth documented CLI entrypoints rather than invented shortcuts; isolate job output paths, checkpoint/restart state and external cache dependencies. Keep huge archives local and protected. Restore any compressed Assignment 3 populations only if required, using isolated scratch and hash/SQLite integrity verification.

## 6. Research interpretation and risk reporting

At minimum, report for each arm and cutoff:

- Requested, computed and unique evaluations; cache hits; elapsed wall/GPU time; per-seed outcome distribution and search-stage coverage.
- Center net and robustness distributions, all neighborhood p90/p95/tail metrics, breaches and severity.
- Maximum marked-equity DD; worst trade principal loss; banked-capital DD (both marked and liquidation where supported); profit giveback; capital occupancy; trade counts and participation.
- Which constraints independently bind, and the cases where 40%-marked-DD admission is offset by 25%-principal or 30%-banked qualification.
- Common-candidate counterfactual qualification alongside actual search-path differences; distinguish selection/eligibility effects from RNG-driven exploration.
- Subsequent-period net and DD, labeled retrospective, with the originally precommitted chronological risk tests; do not use them to choose a threshold after the fact.
- The historical New L0 and N/original benchmarks as descriptive references, not fresh independent evidence.
- Any search that hit the per-lane budget before convergence; no inference that more seeds guaranteed global optimality.

Do not overstate the scientific value of additional computation: multiple paired seeds reduce sampling variability, but this is still repeated optimization on already studied VGT/GDX history. The aim is to determine whether P3 is a defensible alternative, not to prove future live profitability.

## 7. Completion, branch, and portable ZIP handoff

Work on a dedicated Stage B research branch/worktree. Preserve the original pilot, Stage A audit, New L0, N/original, NL0 1.0.0, optimization standard, accepted GPU record, Strategy Lab and `main`. Commit the preregistered protocol **before** search, then code/tests, then sealed selections and reports in the required order. Push and verify branch identity. Do not merge or deploy.

Produce a portable, SHA-256-verifiable ZIP handoff that can be uploaded directly to the original Margin Trading ChatGPT conversation. It must be self-contained for human review (without copying giant datasets or SQLite archives), and include:

1. `READ_FIRST.md` with executive result, exact branch and commit, reading order, important limitations and decisions requested.
2. Frozen `PROTOCOL.md`, amendments, standard-adoption manifest, seed/budget matrix, data-door record and source hashes.
3. `REPORT.md` with the primary paired-seed tests, uncertainty, non-inferiority/superiority verdicts, risk trade-offs and retrospective chronological comparisons.
4. Complete relevant result tables (CSV/JSON/Markdown) with seed-level and cutoff-level details, qualified finalists and common-population comparisons.
5. Parity and GPU acceptance evidence, engineering gates, nonregression and any incidents.
6. Search budget/compute accounting, checkpoint/resume provenance, and commands to reproduce the study.
7. An explicit decision register: whether P3 merits adoption, more narrowly motivated follow-up, or return to P0 and staged trailing-stop work.
8. A `MANIFEST.sha256` for all handoff files and verification instructions. Verify the ZIP after assembly. Include no secrets, large historical market datasets, or unnecessary cache copies.

The final response must identify the ZIP path and summarize the result without requiring screenshots. Explicitly report if any preregistered runs or checks were incomplete, and preserve both favorable and unfavorable outcomes.

## Final instruction

**Execute Stage B under the frozen protocol, up to the justified and preregistered limits above.** This assignment authorizes **research only**. Do not adopt P3, replace New L0/N/original, modify the permanent optimization standard, deploy a strategy, or access Vanguard or any broker. A negative or inconclusive result is fully acceptable.
