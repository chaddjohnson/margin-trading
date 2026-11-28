# Claude Code — GPU Risk-Envelope Pilot: Authorized Implementation, Execution, and Review Handoff

## Mission and authorization

The original Margin Trading conversation has reviewed the **GPU Phase 7 risk-envelope readiness package** and **authorizes implementation and execution of the bounded risk-envelope pilot** described in `research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md`, subject to the explicit decisions and refinements below.

This is **pilot research, not strategy adoption or deployment**. Complete the necessary pilot-specific engineering, pass the prescribed gates, freeze and execute the pilot, analyze the results, and provide a self-contained, checksum-verified ZIP handoff for the original ChatGPT conversation. Do not merge experimental pilot code or methodology into `main`, change frozen New L0/N/original, access a broker, or start any broader successor optimization.

The prior readiness assignment ended with `PILOT NOT STARTED`. **That restriction is superseded solely for this specifically authorized pilot.** No additional approval is needed to execute the agreed, precommitted study after its engineering gates pass. A material blocker, changed scope, invalid acceptance, or unexpected budget overrun must stop execution rather than trigger a workaround.

### First reading — source-of-truth order

From `/home/chad/projects/margin-trading`, read in full before doing implementation or optimization:

1. `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md` (GPU-required version 3.0.0, or verify any newer version), and `docs/research/methods/NEW_L0_METHOD.md` (NL0 1.0.0).
2. `research/gpu-phase7/PREREQUISITES_READY.md`, `READINESS_MANIFEST.json`, `PARITY_REPORT.md`, `ACCEPTANCE_EVIDENCE.md`, `RISK_METRIC_INTEGRATION_SPEC.md`, `RESTORATION_REPORT.md`, `AMENDMENTS.md`, and `INTEGRATION_PLAN.md`.
3. `research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md`, `DECISION_REGISTER.md`, `IMPLEMENTATION_PLAN.md`, `EXECUTION_PLAN.md`, `DIAGNOSTICS_SPEC.md`, and `SCALING_CHECKS.md`.
4. The original optimization and risk-method records needed to establish methodology and control parity, especially Assignment 3 sealed results, `research/vg-l0-risk-metrics/`, and the existing RA1 selector implementation.
5. `docs/gpu/PARITY_CHECKLIST.md`, `docs/gpu/README.md`, and documented official GPU launch/acceptance procedures.

Treat the Phase 7 documents as the baseline **proposal**, not an already approved protocol. Apply the decisions in this assignment, resolve and record them, and freeze the final protocol **before** any outcome-producing pilot search. If the live repository conflicts with a statement in the handoff, verify the actual state, document the discrepancy, and do not guess.

## 1. Explicit user decisions — resolve the decision register

The user approved the previous review's recommended choices **D-1 through D-13**, including the two refinements below; approved pilot execution **D-0**; and prefers **D-14: work on the accepted Phase 7 research lineage without merging into `main`**. D-15 was completed by the readiness assignment. Record all decisions in the study decision register as approved, with this authorization's provenance.

| Decision | Authorized resolution |
|---|---|
| **D-0** | **Authorize** this specific pilot, after engineering gates and protocol freeze. |
| **D-1** | **Two predeclared structural cells:** legacy `GA0.VA0` and the outcome-independent, hash-selected `GB0.VD1`; two independent replicates per cell, per cutoff and arm. Do not substitute better-known cells after seeing results. |
| **D-2** | **Expected ~270k–380k evaluations; authorize up to 700,000 as a contingency ceiling.** Preserve the proposed schedules. **Remove the suggested 450k early-stop rule.** The 700k cap is not a target or permission for arbitrary extra exploration. |
| **D-3** | Apply the new individual principal-loss and banked-capital DD gates on the **liquidation basis**, and also report their marked-basis values. |
| **D-4** | For neighborhood/rung feasibility and Q3 require **p90 of each of the three relevant risk metrics** to satisfy that arm's limits. |
| **D-5** | Do **not** add a special low-principal-loss/high-giveback promotion reserve; keep the established NL0 search shares. |
| **D-6** | Preserve the original NL0 multiobjective island objectives and search/selection mechanics; only the experimental policy's feasibility and violation calculations change. |
| **D-7** | New L0 and N/original are **descriptive, frozen benchmarks**, never injected into independent search or selectable as search candidates. No informed lane in this pilot. |
| **D-8, refined** | Compare **original RA1** (S4 limit **35% of C0**; unchanged) with **envelope-adapted RA1** (S4 **40% of C0** only under EXP). In CTRL, original RA1 uses 35%. Label results separately. Both versions select from the **same already-generated candidate population**; no extra optimization lanes. Preserve the NL0/P0 selector as another comparison. |
| **D-9** | Keep bounded and open-ended Growth configurations eligible with the existing genome; **label and report** their behavior separately, without changing search domains. |
| **D-10** | Experimental Q5 at 10 bps must satisfy the **entire EXP envelope** plus positive center net, not only marked DD. Control Q5 remains unchanged. |
| **D-11** | Liquidation-basis conventional DD (`DD^L`) remains a **report-only CPU diagnostic**. Do not port it to CUDA for this pilot. |
| **D-12, expanded for D-8** | Evaluate the chronological next-slice outcomes of **every distinct selected primary** from both arms and all authorized selector variants, including original and adapted RA1. Retain the original eight comparisons and add any additional distinct EXP RA1-adapted primaries; de-duplicate identical vectors while preserving selector attribution. |
| **D-13** | D1 peak-equity DD, D2 capped hybrid, and D3 profit-component-aware views are **nonbinding diagnostics only**. Their illustrative coefficients are not adopted risk thresholds; never use them to guide or change search decisions. |
| **D-14** | **Do not merge into or push `main`.** Execute on the accepted Phase 7 research lineage, preferably an appropriately isolated descendant pilot research branch/worktree if it passes the official acceptance/integrity requirements. Preserve the acceptance record and out-of-band pin. |
| **D-15** | Resolved: the two temporary restored Assignment 3 SQLite copies were deleted after verification; compressed originals are preserved. Restore to scratch again only if genuinely needed, then clean up. |

### Budget interpretation (important)

- Track **configured, requested, fresh, cached, and completed evaluations** separately per arm, lane, cutoff, search, qualification, and subsequent slice. The **700,000 ceiling applies to the total requested pilot research evaluations**, including qualification and retrospective slice work, not merely search evaluations; record nonbinding CPU diagnostics and engineering verification separately and transparently.
- The readiness protocol's approximate worst case is **695,200 search-plus-qualification evaluations**, before subsequent slices. Extra RA1-adapted selections may add a small amount. Verify a deterministic upper bound **before** launching and ensure the complete approved plan fits **≤ 700,000**. Deduplicate identical candidate replays where legitimate. Never alter the two arms' underlying search schedules or remove evaluations asymmetrically to make the accounting fit.
- If the verified deterministic bound cannot fit, stop **before** pilot search and report the arithmetic and minimal necessary decision. Do not silently exceed 700k, shorten one arm, prune a selector, or shift its evaluation work into an uncounted category.
- A realized total below 300k is acceptable if it follows the frozen schedules; **do not add evaluations just to reach a quota**.

## 2. Exact research question and authorized risk policies

Test whether replacing the conventional NL0 **35%-of-initial-allocation marked-DD gate** with a **40% marked DD / 25% funded-trade principal loss / 25% banked-capital DD** envelope changes discovery and qualification of profitable, robust shared-capital phenotypes.

The original policy and the experimental policy must use identical data, search algorithm, seeds, stage scheduling, costs, and execution rules. Only the specified risk constraints and their required feasibility treatment may differ.

For the **fixed $100,000 trading allocation (C0)**:

| Risk measure | CTRL: NL0 legacy | EXP: approved pilot |
|---|---|---|
| Marked-to-market conventional maximum drawdown | ≤ **35% of C0** = $35,000 | ≤ **40% of C0** = $40,000 |
| Max individual funded-trade principal loss | Existing control treatment; report | ≤ **25% of that trade's funded entry principal** = $25,000 for a $100k slot, **liquidation basis** |
| Max banked-capital drawdown | Existing control treatment; report | ≤ **25% of C0** = $25,000, **liquidation basis** |

**Denominators must be explicit and correct.** The 35%/40% marked-DD limits are relative to **initial C0**, **not peak strategy equity**. The new limits are **optimizer eligibility constraints, not stops or trade-exit rules**. A value exactly at a limit passes. Compute decisions on unrounded quantities. Reuse `src/risk-envelope/policy.ts` (`nl0-control`, `re-40-25-25`) as the single canonical interpretation.

The experimental policy is **not a simple relaxation** of the control: it can admit giveback-dominated proposals with marked DD between $35k and $40k, but can also reject proposals the control accepts because of principal-loss or banked-capital limits. **Preserve and emphasize both directions.** Report the overlap as `both pass / CTRL-only / EXP-only / neither`, with attributable rejection reasons, throughout the pipeline.

## 3. Strategy scope and fixed assumptions

- Exactly **VGT D1 + GDX D1 + VGT Growth**, jointly evaluated through **one $100,000 shared-funded slot**. Growth GDX is OFF.
- **Calendar-day** maximum-hold semantics; existing D1/Growth families, allocator ordering, capital competition, continuation/re-entry rules, execution prices, stops, and existing optional risk-control genome. Shadow delayed-entry eligibility remains OFF.
- Existing costs **5 bps per side**, margin interest **11%**, and identical corporate-action/data adjustments and pinned doors. No new entry/exit policy or structural risk-control mechanism.
- Reuse Assignment 3's **92-gene genome**, original broad search schedule, seeds and candidate-diversity rules. No new optimization objective, extra phenotype family, trade priority, or Growth restriction.
- NL0 original selection methodology remains the reference. RA1 original and adapted are *comparison selectors*, not retroactive permanent standard changes.
- All final historical comparisons with New L0 and N/original are observational. Neither benchmark is automatically promoted or deployed.

## 4. Protocol freeze and stages of execution

**No outcome-producing search before the following are done:**

1. Verify current Git/branch state, clean worktree, active jobs, GPU acceptance status, accepted binary, dataset hashes, restored-archive provenance, and `node --no-maglev` enforcement. No Apollo reboot or display reconfiguration.
2. Reconcile `PROTOCOL_PROPOSED.md`, `DECISION_REGISTER.md`, and `EXECUTION_PLAN.md` with the approvals above (notably 700k, both RA1 variants, and D-14). Assign a new version/protocol ID and preserve the earlier proposed files as history or record an auditable transition; do not rewrite historical seals.
3. Precommit the study standard-adoption manifest (`scope: optimization`, `evaluationBackend: gpu-required`), search domains, cells, seeds, schedules, gate thresholds, budget accounting, candidate selection order, retrospective doors, artifact paths, diagnostics, and no-go rules. Record method deviations in `AMENDMENTS.md` before outcomes.
4. Commit and push the frozen protocol/decisions **on the isolated research branch** before running the pilot. Confirm current acceptance remains valid for that committed tree. Do not merge into `main`.

### Four independent search blocks

Run in the prescribed order/barrier discipline:

- `C21 CTRL`, `C21 EXP` using door **D21** (2016-01-04 through 2021-12-31).
- `C24 CTRL`, `C24 EXP` using door **D24** (2016-01-04 through 2024-12-31).
- Each arm: **2 cells × R1/R2**, total **four lanes per (cutoff, arm)** and **16 search lanes** overall. Exact paired seed keys must be the Assignment 3 original keys; **do not include arm identity in the seed**.
- The CTRL lanes, when envelope output is stripped, must reproduce the corresponding sealed Assignment 3 lane histories and outcomes before EXP search proceeds. The two arms have the same configured schedules, progression rules, promotion shares, diversity, and refinement logic.

For both arms, request `risk: true` on every official evaluation and retain its distinct archive identity. CTRL must **not consume the new metrics in fitness or eligibility**, even though they are delivered and reported.

### Make the envelope bind throughout the pipeline

Implement the pilot under `src/vg-l0-risk-envelope-pilot/` as specified in the Phase 7 `IMPLEMENTATION_PLAN.md`. Prefer thin, tested wrappers/refactoring over duplicating or altering historical optimizers; **never edit Assignment 3/2/Priority 3 frozen source**. The arm's policy must control:

1. Initial plausibility screening and constrained violation.
2. Screen promotion and diversity-aware constrained ranking.
3. Rung-1 island feasibility and **p90 neighborhood** qualification for each applicable metric.
4. Extension/hypervolume references and subsequent island/rung viability.
5. Refinement acceptance and shortlist feasibility.
6. Confirmation-neighborhood qualification Q1–Q6.
7. Final selection eligibility and cost-stress Q5.

Preserve original NL0 island objectives **(-net, -robust, p90 marked DD)**, search operators, distributions, extension triggers, and $2,000 refinement rule. For EXP, change only feasibility/constraint violation and the marked-DD reference bound as authorized. The absence of a fixed `35000`/`economics.ceiling` shortcut in any EXP pilot stage must be verified by tests, not merely claimed.

### Qualification, selection, and validation

- Preserve Q1 positive center net; Q2 center envelope; Q3 independent **3×128 confirmation neighborhoods** with p90 tests on marked DD, liquidation-basis principal loss and liquidation-basis banked DD; Q4 p10 net > 0; Q5 positive net plus full arm envelope at **10 bps per side**; Q6 both D1 and Growth funded at center.
- For each (cutoff, arm) independently, select P0 (NL0 original highest center net) and RA1-original; for EXP also select RA1-adapted. **Only RA1 S4's drawdown ceiling differs** between its original and adapted version; preserve all other RA1 screens and ranking semantics unchanged. Rank/select on **identical candidate populations**, and report cases where original and adapted pick the same phenotype.
- Freeze and commit selected phenotypes, roles, ranks, code/data hashes and validation access manifest **before** opening subsequent doors.
- C21's historical next slice: **2022-01-03–2023-12-29**, accessed through **D23** after C21 selection freeze; use continuous causal runs, reset slice drawdown at the cutoff boundary as specified, and report the exact basis.
- C24's subsequent interval: **2025-01-02–2026-10-30**, through **FULL**, opened **once only after** sealed C24 selection/manifest commit and door authorization. Do not peek or tune from these results.
- These dates have already been studied extensively; label **retrospective / previously inspected**, never pristine holdout or independent future validation. This pilot cannot establish deployment qualification or automatically replace New L0.

## 5. Alternative drawdown policies — diagnostic only

Run all three **after search**, using the **same recorded candidate populations** of both arms, without altering exit behavior, fitness, qualification, promotion, or selection. Refer to `DIAGNOSTICS_SPEC.md` for exact causal definitions, interval decomposition and accounting.

- **D1 — Peak-equity percentage DD:** maximum over chronological times of `(runningPeakEquity − equity) / runningPeakEquity` (not dollar MDD divided by an unrelated peak). The 40% comparator is **illustrative/nonbinding**.
- **D2 — Capped hybrid:** illustrative permitted DD of `min(0.60*C0, max(0.40*C0, 0.30*Epeak))`, evaluated at the relevant peak, with utilization and regime labels. Coefficients are **not approved constraints**.
- **D3 — Profit-component-aware attribution:** distinguish unbanked gain giveback, banked-profit erosion, and decline below starting capital, plus funded-lot principal-loss/giveback, without double-counting or conflating lot and account partitions. An illustrative 25%/25% qualification may be reported **nonbinding**.

Where feasible, report each diagnostic on both marked and liquidation bases, and identify excluded-but-promising structures. **Do not start an extra hybrid-policy optimizer, change limits, or add profit-retention exits.** If a diagnostic looks promising, recommend a separately authorized study.

Also include conventional liquidation-basis drawdown (`DD^L`) as a **CPU-only report-only** diagnostic. Do not treat that as a GPU capability gap for the authorized research gates, and do not silently evaluate official pilot fitness on CPU.

## 6. Scaling, gap, exposure, and margin diagnostics

- Verify percentage normalization at **$100k, $250k and $500k**, without independent large optimizations for each allocation. Assess frozen primaries and benchmarks with proportional CPU diagnostic replays; report exact denominators, threshold equivalents, trade identity and rounding/precision differences.
- Preserve report-only cost/interest stresses: **20 bps**, **14% interest**, **25 bps stop slippage**, **next-open stop execution**; Q5 **10 bps** remains binding under each arm's own envelope.
- Report gap-through-stop and D1 hold-window tail stresses, marked and liquidation-based risk, p90/p95/worst/worst-10%-mean of the three relevant metrics, neighborhood breach shares and uncertainty, traded notional/duration and capital occupancy.
- Classify open-ended versus bounded Growth as reporting strata; no automatic structural exclusions.
- Full Vanguard account maintenance and liquidation risk cannot be inferred from the $100k fixed-slot simulation. Treat account-level margin examples as **illustrative**, separate from the approved optimizer gates. No broker connections.

## 7. Engineering and GPU acceptance — mandatory fail-closed gates

Retain the accepted Phase 7 infrastructure; the previously accepted backend provided the four risk-envelope values through `openOfficialGpuSession` → `GpuPool` → `EvalLab` and matched **144,795/144,795** parity subjects, with an exact **1,242,714-evaluation** Assignment 3 replay. This is the foundation, **not an exemption from pilot-specific verification**.

Implement and pass **E1–E6** before official EXP evaluation:

- **E1:** Live Phase 7 `ACCEPTED` record, independent verifier and out-of-band pin all valid for the actual branch and pinned sources/binary; enforce `node --no-maglev` and official GPU-only execution with no silent CPU fallback.
- **E2:** Every chosen CTRL pilot lane, cutoff and seed equals the corresponding sealed Assignment 3 reference in events, evaluated proposals, selection/fitness and metrics when the new `envelope` is stripped.
- **E3:** Small fixed-seed CPU/GPU mini-pilot comparisons of **both** arms, including all delivered risk fields, decisions, rankings, threshold-edge records, deterministic interruption/resume, and archive identities. These are engineering checks, not outcome-producing pilot search.
- **E4:** Stage-wiring tests show that e.g. DD $38k flips from CTRL fail to EXP pass when PL/BD ≤25k, whereas PL $26k or BD $26k flips from CTRL pass (when DD ≤35k) to EXP fail; include exact-boundary tests and static tests preventing a hidden hardcoded 35k eligibility check. Test Q5 and p90 on all three metrics.
- **E5:** Standard-adoption and research-preflight pass with `evaluationBackend: gpu-required` and correctly pinned NL0 method, data doors, hash manifests and documented departures.
- **E6:** Official GPU gate and attestation open for **both D21 and D24** on the committed pilot lineage; verify permitted D23/FULL sequencing when later used.

If new pilot source changes the accepted evaluation/enforcement dependency closure, **do not circumvent stale acceptance**. Perform the official required acceptance renewal and fresh out-of-band verification before running. Record exact binaries, source hashes, environment, acceptance SHA, device identity, probes, and every deviation. No silent CPU fallback, altered kernels, reduced numerical precision, or relaxed parity standards.

Keep Strategy Lab's simulation engine and historical records unchanged. Run relevant typecheck, test suites and Strategy Lab regressions. Distinguish pre-existing known failures from newly introduced failures; a consequential new failure blocks research.

## 8. Execution discipline and resource limits

- Use the official GPU runner, immutable per-job identity, transactionally sealed checkpoints, reproducible resume, telemetry and signed attestations; respect `research/vg-l0-risk-envelope-pilot/EXECUTION_PLAN.md`, updated with the approved decisions. Never launch through a raw bypass of the official acceptance gate.
- Run a job per cutoff (two arms with paired seeds), preferably **sequentially**, as Phase 7 measured only ~5% benefit from cutoff concurrency. Concurrency is optional only if it maintains isolation, reproducibility, correct door ordering, and equivalent budgets.
- Respect resource limits. Phase 7 measured approximately 4.8 GB VRAM for one job, 9.2 GB for two, and an estimated **16–23 min of GPU evaluation time** for expected pilot work (up to ~42 min worst case); treat these as estimates, not guarantees. Monitor actual GPU/host memory, stage timing, archives, and disk growth.
- Preserve original `.sqlite.zst` Assignment 3 populations. The pilot's official run is not supposed to need their SQLite copies; restore only if a defined audit or E2 genuinely requires them, into isolated scratch, verify hashes/integrity, then remove the temporary copies after verifying originals remain unchanged.
- Preserve original seeds, schedule, populations and stages even if results seem disappointing. Do not conduct adaptive searches based on validation, go beyond the 700k budget or secretly run additional pilot arms.
- Seal and commit immutable search and qualification records before selections; seal and commit C21/C24 selections **before** the next historical door is opened; no branch merges into `main`.

## 9. Required outcome analysis and decision criteria

Produce a careful comparison that distinguishes **more profitable phenotypes from more permissive qualification**:

1. **Search coverage:** count proposed/evaluated/qualified/selected candidates by arm, cutoff, cell, replicate, stage, structural family and Growth boundedness. Report independent search diversity and the rates of rejection for each individual risk metric.
2. **Policy disagreement:** both-pass, CTRL-only, EXP-only, neither, with exact reasons, including `DD in ($35k,$40k] with PL/BD passes` and `DD ≤$35k but PL/BD fails`. Do not describe EXP as universally safer or looser.
3. **Candidate quality:** center net, robust net, p10 net, marked DD, trade PL (marked and liquidation), banked DD (marked and liquidation), giveback components, worst trade, tail distributions, capital occupancy, trade count and displacement.
4. **Original versus adapted RA1:** for the same EXP population, compare NL0/P0, RA1 S4=35%, and RA1 S4=40%; label threshold adaptation and show whether nominations differ. For CTRL, compare NL0/P0 and original RA1. No extra search seeds are authorized by this comparison.
5. **Chronological outcomes:** C21→2022–2023 and C24→2025–2026 results for all distinct frozen selectors/primaries; maintain honest retrospective evidence grades, drawdown and tail metrics. Do not use these data to modify the study.
6. **Alternative-policy diagnostics:** D1, D2, D3 counts, candidate examples, financial implications and whether a *separate* optimization would be warranted.
7. **Scaling and account risk:** $100k/$250k/$500k proportional checks, with account-level margin caveats.
8. **Uncertainty:** matched search effort, seed variation, risk-regime concentration, threshold sensitivity, prior inspection, sample-size limits, and any incomplete/budget-bound lanes.

The pilot hypotheses in the proposed protocol include a **>$2,500 center-net** C21 or C24 improvement and a C21 next-slice DD noninferiority margin of **$5,000**; keep these predeclared and accurately report whether each succeeds. Treat the hypothesis results as evidence, not automatic adoption criteria.

Report one of: **experimental improvement, approximately equivalent, worse, or inconclusive**. If EXP appears better, propose whether a larger N/original successor search is worthwhile; if not, recommend keeping the original method. Even strong retrospective pilot results do **not** authorize changing the permanent optimization standard, deploying a strategy or replacing New L0/N/original.

## 10. Versioning, Git, and final portable ZIP handoff (mandatory)

- Work on the **accepted Phase 7 research lineage**, with an appropriately named pilot branch. Record the verified base SHA, Phase 7 acceptance record, branch/head, environmental and dataset hashes. **Do not modify or push `main`**, overwrite historical studies, or change any source previously sealed by Assignment 3.
- Version and preserve the pre-execution protocol, amendments (including any corrections to erroneous test scripts), risk policies, code changes, budgets, seeds, manifests, checked input hashes, stage outcomes, source/acceptance digests, and all pilot evaluations/receipts. Keep large caches/archives out of Git according to repository rules but retain them for audit until user review.
- Report test failures honestly and preserve original failed records and fixes. Never silently relax a failed criterion after seeing an outcome; stop and request review if the change could affect research selection or acceptance.
- Commit and push the final research branch, verify the remote commit, and report the precise status of `main` and working tree. **No adoption, live trading, broker actions, or deployment.**

### Required portable ZIP package

Claude must **always provide a single self-contained, checksum-verified ZIP research handoff** suitable for direct upload into the original Margin Trading ChatGPT conversation. Use a short readable archive name, e.g. `vg-l0-risk-envelope-pilot-results.zip`, with a `READ_FIRST.md` giving reading order and executive conclusions.

Include, at minimum:

- `READ_FIRST.md` / executive summary and full `REPORT.md`.
- Frozen `PROTOCOL.md`, finalized decision register and precommit evidence, standard-adoption/preflight report and `AMENDMENTS.md`.
- Engineering gates E1–E6, CPU/GPU parity/acceptance verification and Strategy Lab regression evidence.
- Per-stage search/evaluation/budget accounting, qualification and selector comparisons, and complete machine-readable summary tables sufficient for independent review.
- Key candidate phenotypes/IDs and trade/risk ledgers, principal-loss/giveback/banked-DD and neighborhood/chronological results, D1–D3 diagnostics and scaling summaries.
- `RESEARCH_RECOVERY.md`, exact official commands, Git branch/commit and code/data/acceptance hashes, limitations, remaining decisions and a **SHA-256 manifest** covering package contents.

Exclude huge minute datasets, original `.sqlite.zst` populations and enormous per-evaluation caches; instead include reliable relative paths, hashes and instructions to reproduce them on Apollo. Verify the ZIP manifest after packaging. Provide a direct ZIP path or link to the user, optionally a separately readable report.

## Final instructions

1. **You are authorized to implement and run this bounded pilot** after all required gates, protocol freeze, and acceptance checks pass, within **700,000 total pilot research evaluations**.
2. **Do not** turn diagnostic alternative risk policies into active search arms, introduce new trading exit rules, enlarge the structure universe, retrain from validation, merge to `main`, or adopt any new strategy.
3. If anything material blocks parity, integrity, acceptance, budget or execution, **stop with a useful verified partial report**, preserving all completed and sealed work. Do not bypass controls to finish.
4. Finish with an evidence-based assessment of whether the revised risk envelope merits a separately authorized full successor optimization, and a **portable ZIP handoff** for review.

**The desired result is not a preordained experimental victory. It is a fair, reproducible, GPU-accelerated test of whether distinguishing principal-loss and banked-capital risks from profitable-trade giveback improves the configurations our optimizer can discover.**
