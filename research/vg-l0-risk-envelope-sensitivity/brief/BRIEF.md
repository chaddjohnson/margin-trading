# Claude Code — Stage A: Read-Only Risk-Envelope Sensitivity Audit

## Assignment and decision boundary

Conduct a **carefully controlled, retrospective sensitivity audit** of the completed GPU-accelerated New L0 risk-envelope pilot. The objective is to determine whether the experimental **25% banked-capital drawdown (BD) limit was unnecessarily restrictive**, and how the original 35% marked-drawdown rule compares with alternative, separately constrained risk envelopes on **the same already-evaluated candidate configurations**.

**Do not run a new genetic optimization, generate new phenotypes, tune strategy parameters, change the D1/Growth trading rules, change the official optimization standard, adopt a candidate, or deploy anything.** This is Stage A only. A replicated Stage B GPU optimization may be proposed, but **must not be executed without separate authorization**.

The user has authorized investigating BD ceilings of **25%, 30%, and 35%**, with 35% the highest banked-capital threshold in this study. The user has **not** approved a permanent change to any constraint. Treat the original NL0 method as the reference and N/original as a preferred research challenger, not as a production replacement.

Read all applicable `CLAUDE.md`, repository instructions, the current `OPTIMIZATION_STANDARD.md`, the versioned `NEW_L0_METHOD.md`, and the completed pilot's frozen protocol **before doing analysis**. Start specifically with:

- `research/vg-l0-risk-envelope-pilot/READ_FIRST.md`
- `research/vg-l0-risk-envelope-pilot/PROTOCOL.md`
- `research/vg-l0-risk-envelope-pilot/REPORT.md`
- `research/vg-l0-risk-envelope-pilot/DECISION_REGISTER.md`
- `research/vg-l0-risk-envelope-pilot/AMENDMENTS.md`
- `research/vg-l0-risk-envelope-pilot/results/tables/TABLES.md` and `summary.json`
- `research/vg-l0-risk-envelope-pilot/results/analysis/census-C21.json` and `census-C24.json`
- `research/vg-l0-risk-envelope-pilot/results/qualification/`, `results/search/`, `results/selection/`, and recorded diagnostic data
- `src/risk-envelope/policy.ts`, `src/risk-envelope/diagnostics.ts`, and the pilot's qualification/fitness implementation
- The preserved archived Assignment 3 search records where additional historical candidate detail is genuinely required.

The completed pilot was on `research/vg-l0-risk-envelope-pilot` (last reported commit `7f69d0d2`); **verify the live repository state instead of assuming these references remain current**. The authoritative pilot used the accepted GPU backend, C21 and C24 cutoffs, cells `GA0.VA0` and `GB0.VD1`, R1/R2 lanes, two arms (CTRL and EXP), one common $100,000 funded slot, and 291,392 requested research evaluations. Its outcome was *worse* by the frozen rule. Do not rewrite this outcome or retroactively reinterpret its protocol.

## 1. Definitions, normalization, and comparability

Use the canonical metric definitions in the repository, not improvised equivalents:

- **Marked conventional DD**: the strict maximum peak-to-trough drawdown in marked strategy net equity, reported as dollars or divided by initial trading allocation `C0`.
- **Individual funded-trade principal loss (PL)**: the worst liquidation-equivalent loss below each lot's funded entry principal, with the existing accounting of costs and interest. Use the authoritative `principalLossLiquidation` field for binding sensitivity comparisons; report its marked counterpart separately.
- **Banked-capital drawdown (BD)**: maximum decline from the historical high of realized/banked net profit to the current liquidation-equivalent portfolio value, using `bankedDdLiquidation` for the policy comparison. It can occur during one position and is **not** synonymous with a streak of consecutive realized losses. Report marked BD separately.
- **Initial allocation**: `C0 = $100,000`, one fixed noncompounding slot. A 40% marked-DD ceiling means `$40,000` **of initial allocation**, not 40% of peak equity. PL's denominator is each funded lot's entry principal; BD's denominator is `C0`.
- **Boundary**: a value exactly equal to its limit passes. Compare unrounded dollar values, not displayed rounded percentages.
- **Neighborhood qualification**: respect the original qualification instrument and its p90 convention; explicitly distinguish CTRL's historical cent-rounded DD rule and EXP's unrounded p90 rules. Investigate borderline differences rather than silently normalizing them away.

The user's question concerns the **banked-capital limit**. The experiment must not confound it with changes to exit stops, maximum-hold duration, strategy components, allocator priority, GPU/CPU behavior, search algorithm, or validation methodology.

## 2. Predeclare the policy comparison matrix

Prepare and record the following policy definitions **before computing comparative results**. Use the same assessed metric bases, time window, datasets and candidate vectors for each policy.

| Policy | Marked maximum DD / C0 | Trade principal loss / funded principal | Banked-capital DD / C0 | Purpose |
|---|---:|---:|---:|---|
| P0: original NL0 control | 35% | No separate gate | No separate gate | Unchanged reference |
| P1: 40%-only | 40% | No separate gate | No separate gate | Isolate marked-DD relaxation |
| P2: earlier experimental | 40% | 25% | 25% | Reproduce completed pilot |
| P3: proposed 30%-BD | 40% | 25% | **30%** | Principal protection with less restrictive banked gate |
| P4: proposed 35%-BD | 40% | 25% | **35%** | Upper authorized banked sensitivity |
| P5: PL-only | 40% | 25% | No separate gate | Isolate the PL constraint |
| P6: BD25-only | 40% | No separate gate | 25% | Isolate banked constraint |
| P7: BD30-only | 40% | No separate gate | 30% | Isolate banked constraint at 30% |
| P8: BD35-only | 40% | No separate gate | 35% | Isolate banked constraint at 35% |

P0–P4 are the primary decision comparisons. P5–P8 are **diagnostic ablations**, included to distinguish effects and interactions. Do not treat them as nine independent optimization studies or promote one as a new standard.

At `C0 = $100,000`, P3 represents `$40k marked DD / $25k PL / $30k BD`; P4 represents `$40k / $25k / $35k`. Do not consider BD ceilings above 35% in this assignment. The user may revisit that later if evidence warrants it.

Use **the current risk-metric and selection definitions**. If an original policy's qualification requires extra non-risk gates (Q1–Q6), preserve those gates exactly. The only intended counterfactual is substituting the declared risk-envelope policy, not changing other selection criteria.

## 3. Establish the common archived candidate population

This analysis must not be based solely on top finalists or narrative tables.

1. Inventory the complete available candidate records in the **original CTRL and EXP pilot search archives** at **C21 and C24**, and their candidate-generation stages (screen, rung/island, refinement endpoint, shortlist, confirmation neighborhood, qualification).
2. Build a **deduplicated union** of candidate configurations evaluated by either arm at each cutoff, using stable phenotype/configuration signatures and verified data/code identities. Retain source provenance (CTRL/EXP, cell, R1/R2, stage, seed, job archive, candidate ID) so it is possible to trace every configuration back to the original research.
3. Distinguish **unique evaluated phenotype vectors**, repeated archive evaluations, search-stage centers, fully measured risk records, qualified finalists, and neighborhood perturbations. Do not merge these categories or present them as interchangeable observations.
4. Verify whether the complete original population and its risk-envelope metrics are recoverable from `.cache/vg-l0-risk-envelope-pilot/` and the sealed research records. The ZIP handoff contains selected reports and summaries; **do not mistake the bundled 222 C21 / 196 C24 diagnostic centers for the entire genetic search space**.
5. If required, inspect compressed Assignment 3 `.sqlite.zst` candidate-population archives. Restore **only** necessary databases into isolated scratch storage, validate source and restored hashes/SQLite integrity, use read-only connections, and leave compressed originals unchanged. Follow the repository cleanup restoration instructions.
6. If risk metrics or qualification-neighborhood observations are missing for specific already-evaluated configurations, first determine whether they can be recovered from existing sealed runs/cache. Limited **deterministic replays of exactly those fixed configurations** may be used solely to fill audit gaps, with recorded hashes, parity and evaluation counts. They are not new search, mutation, optimization or selection. Do not rerun full optimizer lanes as a shortcut.
7. If full population coverage is impossible without major recomputation or modifying the existing engine, report the precise limitation and complete the defensible narrower audit. Do not silently extrapolate shortlist findings to all proposals.

Where data exist, reconstruct the original P0 and P2 qualification results **exactly** and compare against the sealed pilot records. Investigate any discrepancy before interpreting new policies.

## 4. Run strictly read-only counterfactual qualification

For each **same** candidate at each cutoff, calculate P0–P8 eligibility on its recorded development-history metrics. This is **rescore/requalification of archived evaluations**, not another search.

### 4.1 Center-level analysis

Produce, by cutoff, cell, seed, arm-of-origin and relevant search stage:

- Unique profitable, funded candidates with a complete required risk record.
- Counts and percentages passing each policy.
- A side-by-side overlap/confusion matrix for each policy against P0 and P2: both pass, P0-only/P2-only, alternative-only, neither.
- Failure reasons: marked DD, PL, BD, combinations; identify the **binding metric** and distance from threshold in dollars and percent of `C0`.
- Maximum and distribution of center net profits among passing candidates; not just counts.
- Entries newly admitted as DD moves from 35% to 40%, and entries excluded because banked DD is above 25%, 30%, or 35%.
- Newly admitted **giveback-dominated** candidates, distinguishing profit giveback from principal and banked erosion using the audited attribution specification.
- Bounded versus open-ended Growth participation and any exceptional risk behavior.

Report the original C24 control winner (approximately `$218,842` center net, `$25,818` center marked DD, `$15,626` center BD, and **$26,313 confirmation p90 BD**) as a regression/example case; confirm exact values and whether each policy admits it **at the center and after full qualification**. Do not use this one favorable case to choose the new banked threshold.

### 4.2 Neighborhood and full qualification analysis

For candidates with valid recorded confirmation-neighborhood draws, recompute the applicable risk criteria at the **same perturbation vectors, radii, seeds, and history**. Use each policy's p90 DD/PL/BD limits as defined; keep Q1–Q6's other gates, robustness requirements, diversity, and selection metrics unchanged.

Report:

- Center pass versus neighborhood p90 pass versus overall Q1–Q6 pass.
- p50/p90/p95 and worst observed marked DD, PL and BD (liquidation basis where appropriate).
- Breach frequency, **excess magnitude**, and worst-10%-mean risk, not just binary status.
- Which candidates are rescued or disqualified by changing only the banked limit to 30% or 35%.
- Best qualified center profit, robust profit and trade/risk characteristics, **within this fixed common candidate set**.
- Whether the 25% PL gate begins to bind independently when BD is 30% or 35%.
- Cases where marked BD exceeds conventional marked DD because of partial sales; preserve the metric specification rather than assuming an ordering that the ledger does not guarantee.

Be precise about what is knowable: requalifying archived candidates can establish **eligibility changes**; it cannot demonstrate which new parameter regions the genetic optimizer would have explored under a different gate or what a newly optimized finalist would earn.

### 4.3 Attribution of the original failure

Separate three effects rather than mixing them:

1. **Constraint effect**: the same vector's qualification changes under P0/P2/P3/P4 and ablations.
2. **Search-path effect**: CTRL and EXP explored different vectors after divergent qualification/selection events.
3. **Selection effect**: NL0 P0/RA1 outcomes differ even when the same candidate set is supplied.

Do not claim that the entire pilot shortfall was caused by the 25% BD limit unless supported by a matched-candidate counterfactual. Do not treat the candidate recovered by a looser gate as evidence that an optimizer running that gate would have discovered it.

## 5. Profitability, drawdown, and chronological context

Reapply, only where historical data and complete records already exist, the original **NL0/P0** and **RA1-original** candidate-ranking logic to identical, newly qualified archived populations, labelling these as **counterfactual selectors**. Do not tune RA1 thresholds or introduce new selector variants in this assignment.

Compare:

- Profit and marked-DD/PL/BD outcomes of the selected candidates in the common development window.
- Trade count, capital occupancy, and dependence on a small number of exceptional trades.
- Parameter-neighborhood stability and behavior near thresholds.
- Any previously recorded **subsequent historical intervals** (C21 → 2022–2023; C24 → 2025–2026). Clearly label these **retrospective, previously inspected**, and do not use them to optimize the threshold choice. Reuse sealed results where possible; if a selected candidate has no valid later record, state `not evaluated` rather than inventing one.

Keep New L0 and N/original as **descriptive historical benchmarks**. Do not inject them into independent candidate searches (there are none here) or treat their already-known results as an independent selection test.

## 6. Optional alternative-risk-policy context (no new policy tuning)

Provide concise context from the existing pilot for:

- Pure peak-equity drawdown (% of previous peak strategy equity).
- Capped hybrid (the previously illustrated `40/30/60` allowance).
- Profit-component-aware diagnostic attribution.

Do **not** optimize or adjust those coefficients now. They previously admitted almost all recorded candidates, so the immediate task is to isolate the banked-capital gate. If the new sensitivity results imply a meaningful reason to revisit one of these alternative approaches, list it as a **separate future study**.

Do not implement or test new trading exit rules, staged trailing stops, changes to Growth's existing trailing behavior, or profit-retention stops.

## 7. Decision criteria and Stage B recommendation

After the audit, provide a **conditional, evidence-based recommendation** on whether a newly replicated GPU search is warranted. Specifically address:

1. Is 25% BD excessively restrictive, and does raising it to 30% or 35% materially increase **qualified candidate quality**, not just candidate counts?
2. Are PL and BD redundant under each tested policy? Does PL become separately binding when BD increases?
3. Does the 40% marked-DD relaxation actually admit desirable high-profit, manageable-principal-risk configurations, and do they remain robust around their parameters?
4. How much of the completed pilot's disappointing result can be explained by gates versus search-path/seed effects?
5. Which **smallest defensible** set of policies should receive a genuinely replicated search? (The original 35% control must remain included.)
6. What independent seed count, matched budgets, search-stage coverage, and chronological safeguards would be appropriate? Provide a proposed design and **measured** GPU-time estimate if reliable throughput evidence exists. Do not run that study.
7. Is the evidence weak/inconclusive enough that we should pause risk-envelope research and return to staged trailing-stop work instead?

Do not declare 30% or 35% banked DD optimal simply because it recovers the known `$218,842` candidate. The thresholds were considered after seeing the pilot, so this audit is **exploratory and retrospective**, not unbiased prospective validation.

The outcome **“no further optimization justified” is acceptable**. Preserve the original 35% method as the authoritative reference unless and until a later study plus user approval changes it.

## 8. Engineering and research safety

- **No new genetic search, no parameter optimization, no new candidates, no Strategy Lab changes, no trading-rule changes.**
- Existing research and its integrity seals are immutable. Do not edit, repin, weaken or bypass them.
- Preserve accepted GPU infrastructure and the fail-closed official gate; do not modify CUDA kernels, CPU reference logic, `GpuPool`, `EvalLab`, production finance code or the risk-metric definition to force a desired answer.
- If deterministic fixed-candidate replay is essential, use the documented verified evaluation path and `node --no-maglev`; do not claim an unofficial analysis is an official GPU optimization. Check CPU/GPU parity where relevant.
- Do not invalidate or renew GPU acceptance unnecessarily. If the current branch does not support a needed read-only analysis, create a narrow, isolated research script/worktree rather than changing the production evaluation closure.
- Do not rerun or overwrite already sealed optimization stages. Do not delete original caches or compressed archives.
- Do not alter `main`, frozen New L0, N/original, `OPTIMIZATION_STANDARD.md`, or the versioned NL0 method.
- Make the new sensitivity study a **separate research-only branch/worktree** if storing durable outputs in the repository. Report source branch/commit, current branch/commit, any files created, and whether GPU acceptance remains valid on that lineage. Producing new report/table artifacts is permitted; **research inputs remain read-only**.
- No broker access, order execution, live trading, automatic deployment, or prospective automation.

## 9. Required deliverables

Produce a complete but concise, reviewable research package containing:

1. **`READ_FIRST.md`** — one-page executive conclusion, what was actually analyzed, evidence grades and unresolved decisions.
2. **`REPORT.md`** — methods, population coverage, all policy comparisons, qualification/robustness results, explanation of pilot differences, and Stage B go/no-go recommendation.
3. **`POLICY_MATRIX.md`** — exact P0–P8 policy definitions, metric bases, denominators, rounding and boundary behavior.
4. **`POPULATION_AND_PROVENANCE.md`** — candidate source inventory, deduplication, missing data, archive restoration, hashes and limitations.
5. **Machine-readable tables** (CSV/JSON) — candidate-level policy outcomes, cutoff/cell/stage aggregates, gate failures, neighborhood results, top excluded/recovered configurations, and reproducibility metadata.
6. **`METHOD_AND_CHECKS.md`** — exact read-only commands/scripts, original-policy reproduction checks and any fixed-candidate parity results.
7. **`DECISION_REGISTER.md`** — recommendations for 25% versus 30% versus 35%, what would require new optimization, and items requiring the user's future approval.
8. **`AMENDMENTS.md`** — any deviations from the predeclared analysis, including missing artifacts or necessary extra deterministic replays.
9. **`STAGE_B_OPTION.md`** — a proposed replicated GPU optimization protocol **only if justified** (or a written rationale for not proceeding), without executing it.
10. **Portable ZIP handoff for this conversation** — include the reports, tables, scripts/specifications essential to independent review, plus a SHA-256 file manifest, branch/commit identifiers, and an explicit reading order. Exclude raw market data, large databases, caches, and copied sealed optimization archives. Verify the ZIP's checksum manifest before delivery.

Keep the new report outputs separate from the original pilot's sealed results. If you commit/push the new research branch, follow repository conventions and verify the remote; do not merge into `main`.

## 10. Final instruction

Complete **Stage A only**. Explain what the existing evidence supports and what only a new optimization could determine.

**Do not begin Stage B automatically, regardless of whether the sensitivity results look favorable.** We will review your portable ZIP handoff and explicitly authorize any subsequent GPU optimization in a separate assignment.

End your final response with this exact statement:

**STAGE A COMPLETE — NO NEW OPTIMIZATION RUN — awaiting review and separate Stage B authorization**
