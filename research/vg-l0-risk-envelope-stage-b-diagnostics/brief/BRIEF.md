# Claude Code — Stage B Final Diagnostics: Search-Archive Census and Profit-Giveback Decomposition

## Assignment and authorization

Complete the **two outstanding report-only diagnostics** from the finished, sealed **Stage B RES-B 1.0.0 P0-versus-P3 risk-envelope study**. These are Priority 2 of our current Margin Trading roadmap, to be completed **before** the D1/Growth trailing-stop audit and staged trailing-stop research.

**You are authorized to run the bounded diagnostic/replay work described below, produce reports, commit and push an isolated research branch, and create a portable ZIP handoff. You are NOT authorized to launch a new genetic optimization, alter a strategy or its exits, revisit or revise Stage B selection, update optimization standards, adopt P3, deploy anything, or merge into `main`.**

The preregistered Stage B verdict is **P3 non-inferior and superior on the specified paired training-profit test**, but its broader research recommendation was **not to adopt P3** because its apparent advantage came largely from permitting higher conventional marked drawdown without demonstrated principal-loss or banked-capital risk improvement, and its retrospective next intervals were unfavorable. **Neither diagnostic may change that frozen verdict.**

Your primary question is:

> **How much of the additional drawdown associated with P3's selected phenotypes was giveback of unrealized profits on winning positions, versus erosion of previously banked profit or loss of original capital?**

Your second question is:

> **Across every candidate actually visited by the Stage B search, what changed between P0 and P3 in qualification, profitability, risk, and coverage of the search space?**

Please investigate these questions critically, distinguishing facts supported by the archived records from inference. No outcome is presupposed.

---

## 1. Read authoritative sources first

Repository (verify the actual path):

`/home/chad/projects/margin-trading`

Read all applicable repository instructions and the current optimization standard, including `CLAUDE.md`, **before** executing anything. Then read the following Stage B materials **in order**:

1. `research/vg-l0-risk-envelope-stage-b/READ_FIRST.md`
2. `research/vg-l0-risk-envelope-stage-b/PROTOCOL.md`, especially §10 (report-only analyses), and `DECISION_REGISTER.md` (U3)
3. `research/vg-l0-risk-envelope-stage-b/REPORT.md`, `results/analysis/TABLES.md`, and `results/analysis/SUPPLEMENT.md`
4. `research/vg-l0-risk-envelope-stage-b/AMENDMENTS.md`, especially D1 (diagnostics omitted because the execution window had ended)
5. `research/vg-l0-risk-envelope-stage-b/RESEARCH_RECOVERY.md`, `EXECUTION_PLAN.md`, sealed `results/selection/`, `results/qualification/`, and archive manifests
6. Existing diagnostic implementations:
   - `tools/vg-l0-risk-envelope-stage-b/census.ts`
   - `tools/vg-l0-risk-envelope-stage-b/giveback.ts`
   - `tools/vg-l0-risk-envelope-pilot/diag-core.ts` and the established D3 causal drawdown decomposition definitions
7. Relevant GPU acceptance and runtime instructions (`docs/gpu/`, official execution policy, acceptance pins).

The final Stage B branch was reported as `research/vg-l0-risk-envelope-stage-b` at commit `1c1f9e72` (verify actual identity, ancestry and clean state). Work from an appropriate **new isolated diagnostics branch/worktree**, not by editing sealed research history. Preserve the original Stage B branch, the Stage A and pilot branches, `main`, New L0, and N/original.

### Preserved historical context

- **P0:** original NL0 risk envelope, marked drawdown ≤ **35% of original trading allocation**.
- **P3:** marked drawdown ≤ **40% of original allocation**, liquidation-basis trade principal loss ≤ **25% of funded trade principal**, liquidation-basis banked-capital drawdown ≤ **30% of original allocation**.
- Three cutoffs: **C19 secondary**, **C21 primary**, **C24 primary**.
- 32 paired search lanes per cutoff (96 pairs total); one shared $100,000 trading slot.
- Stage B already sealed its search, qualification, selections, paired statistics, and interval comparisons. Historical periods have been examined previously; do not call them pristine out-of-sample tests.

---

## 2. Safety, immutability and resource controls

1. **Do not run any new optimization or candidate search.** The search census must have **zero new evaluations** and use only existing archive hits; the giveback diagnostic may perform only the bounded, pre-existing **CPU reference replays** necessary for risk attribution.
2. The approximately **18 GB of git-ignored Stage B job archives** under `research/vg-l0-risk-envelope-stage-b/cache/jobs/` are valuable evidence. **Do not remove, truncate, compact or modify them.** Do not touch any sealed historical files or archived GPU records. Verify necessary hashes and identities before and after processing.
3. The existing census tool copies each search SQLite archive to a scratch location and refuses cache misses. **Inspect and test this behavior before running on real records.** Ensure an archive miss fails explicitly rather than scheduling an evaluation. Run one cutoff at a time if needed; verify adequate free space and avoid duplicating all archives simultaneously.
4. Where working on compressed `.sqlite.zst` archives is necessary, restore only required copies in isolated scratch storage, verify hashes and SQLite integrity, and preserve compressed originals. Do not restore unrelated Assignment 3 archives gratuitously.
5. Run CPU/Node diagnostics with the required **`node --no-maglev`** execution regime and the repository's documented diagnostic-purpose permissions. Do **not** launch a GPU research optimization or alter the official accepted GPU binary, GPU evaluation code, pins, or acceptance policy.
6. Treat any discovered script defect as a diagnosable issue: record the failure, fix only the minimally necessary diagnostic code on the isolated branch, add a regression test, and rerun. No changes to metric definitions, policy gates, seeds, data doors, sealed selection criteria, or frozen results.
7. Write derived reports only in a clearly marked **new, unsealed diagnostic namespace** or other documented nonhistorical location. Never overwrite earlier report data or make an original sealed artifact writable. Confirm that any added analysis files cannot be mistaken for official Stage B search evidence.
8. Keep all work **research-only**. No broker access, live orders, automatic adoption, model changes, Strategy Lab trading-rule edits, or merges into `main`.

---

## 3. Diagnostic A — Complete search-archive census

Execute and independently verify the existing `census.ts` design from Stage B's frozen protocol §10, for **C19, C21 and C24**.

### Required coverage

- Both P0/CTRL and P3/EXP30 search arms.
- Every original search lane, cell and replicate.
- Every requested **screen and rung-centre** candidate covered by the existing census definition; deduplicate by canonical configuration identity, while retaining which arm/stage/lane requested it.
- Use **the full existing search archives**, not just finalists or shortlists.
- Replayed lane summaries must agree with the sealed Stage B search records. Report coverage and any exclusions explicitly.

### Required measurements

For each cutoff, report at minimum:

- Total requests, unique centres, profitable/funded centres, and overlap between arms.
- P0-only, P3-only, both-qualified and neither-qualified counts **on the identical candidate set**, including counts broken down by originating arm.
- Screening/rung feasibility, qualification failures, and which limits were binding: 35% marked DD, 40% marked DD, 25% trade principal loss, 30% banked-capital DD.
- Number of candidates with DD in **(35%, 40%]** of initial allocation; how many P3 admits and how many its additional gates exclude.
- Whether *any* configurations pass P0 but fail P3; whether P3's principal-loss and banked-capital gates materially constrain the actual searched populations.
- Highest centre net under each policy on a common configuration population, plus distributions/quantiles where supported. **Do not confuse best plausible centres with fully qualified finalists.**
- Search-stage attribution: identify whether any apparent gain is from changed **eligibility** versus different **search paths**; use established Stage B attribution logic and label any approximation.
- Distinguish centre qualification from neighborhood p90/finalist qualification throughout.

### Validation

The replay must fail on missing archive data, mismatched archive identity, altered original archive hash, or discrepancies with sealed lane results. Report actual replay/archive counts and clear evidence of **zero new evaluations**.

---

## 4. Diagnostic B — Profit-giveback and capital-loss decomposition

Execute and validate the existing `giveback.ts` design for **C19, C21 and C24**, using bounded CPU reference replays of the selected **lane representatives in both arms and each cutoff's pooled primaries**.

This must answer the distinction the user cares about: **a trade that gives back substantial unrealized profit while remaining profitable is not the same capital-loss event as a trade that loses invested principal.** Conventional marked drawdown still matters for account-equity volatility and margin headroom; do not discard or relabel it.

### Required definitions and attribution

Use the repository's existing causal D3/accounting definitions and report them clearly:

- **Unbanked-profit giveback:** decline in unrealized profit previously attained by an open position.
- **Banked-profit erosion:** erosion of previously realized/banked gains.
- **Starting-capital loss:** loss extending below the original account/principal baseline under the defined D3 partition.
- **Individual trade principal loss:** excursion below each trade's funded cost basis, with the model's specified costs and interest.
- **Conventional marked portfolio drawdown**, **liquidation-basis drawdown**, and the existing banked-capital risk metrics.

Do **not** use 'principal loss', 'starting-capital loss', and 'banked-capital drawdown' interchangeably. Define each in the report in terms of the implementation and make clear whether it is a trade or portfolio metric.

### Required analysis

1. Reproduce net, marked DD and all four available envelope values from the CPU diagnostic and compare with the corresponding official sealed GPU qualification records **to the cent**, for each replayed configuration. Any mismatch blocks substantive conclusions until resolved.
2. For every representative, calculate the D3 marked-DD decomposition and lot-level profit giveback, peak unrealized profit, worst trade net, exposure/occupancy, and whether its maximum DD episode was predominantly giveback or capital erosion.
3. Report P0 versus P3 for paired seeds and each cutoff: mean, median, quantiles, meaningful dispersion/intervals, counts and percentages of giveback-dominated candidates, and differences in capital loss versus giveback. Preserve the study's pairing and do not pool nested cutoffs as statistically independent samples.
4. Analyze the **incremental marked drawdown observed among P3 selections**: to what extent is it attributable to profitable-trade giveback, banked-profit erosion, or principal/starting-capital loss? Report actual dollar and proportional amounts; identify representative trades/episodes where possible.
5. Where different arms' maximum drawdowns occur on different dates or trades, **do not subtract their decompositions as though they describe the same episode**. Report arm-level decompositions, paired statistical differences and comparable event-specific illustrations separately.
6. Distinguish positions that ultimately realized a profit despite giving back gains from those that ended at a principal loss. Explain how stop activation, gaps and capital occupancy may affect the interpretation, but do not invent unrecorded execution details.
7. Compare the results against New L0 and N/original as **descriptive frozen benchmarks if the required verified records are available**. Never allow those benchmarks to influence the original Stage B selections.
8. Answer explicitly whether the new evidence **materially changes our interpretation** of P3. This is an interpretive supplement, **not** a retroactive replacement for the preregistered Stage B verdict.

Report any limitations of the existing diagnostic scripts (for example, whether they cover only finalist representatives and not every neighborhood draw); do not quietly claim broader coverage.

---

## 5. Research integrity and statistical interpretation

- Preserve the Stage B preregistered outcome label and its negative adoption recommendation in the original report. Report diagnostic results as **post hoc, report-only supplements**.
- Explicitly separate **selection-population differences**, **qualified-finalist outcomes**, **trade-level risk decomposition**, and **subsequent historical interval behavior**.
- Do not propose a new winning risk threshold based on this same previously inspected data. A follow-up research idea may be described as a hypothesis for future testing, not as a validated methodology.
- Do not add genetic search seeds, risk envelopes, new training intervals, changed stop rules, or other optimization knobs.
- State plainly if any computed results weaken the case for P3, strengthen a narrower hypothesis about profitable givebacks, or leave the overall question unresolved.
- Confirm preservation of Strategy Lab behavior and accepted GPU runtime identity, with proportionate nonregression checks for a report-only assignment. If a full suite is run and still has the existing seven known failures, document that accurately.

---

## 6. Reporting and decision support

Produce a concise executive report, full supporting diagnostics and machine-readable records.

### Executive questions to answer

1. **Does P3 mostly allow greater profit giveback, or greater capital erosion?** Quantify by cutoff and paired candidates.
2. How many actual searched configurations pass only P3, pass only P0, both, or neither? Which risk limits bind in practice?
3. Are P3's higher conventional DD and neighborhood DD largely attributable to winning-trade giveback, or is there evidence of materially worse downside exposure?
4. Do the reports reveal a credible reason to revisit a profit-component-aware selector in future research, or do they support closing the risk-envelope work and proceeding to staged trailing stops?
5. What important evidence remains unavailable without **new** independent data or a separate, preauthorized search?

### Decision register

Provide recommendations, but do not implement the decisions:

- Keep P0 as the current standard or recommend future reconsideration, supported by specific evidence.
- Whether the risk-envelope investigation should now close.
- Whether to proceed immediately to **Priority 3: audit D1/Growth trailing-stop capabilities**, followed by **Priority 4: staged trailing-stop implementation and properly funded optimization**.
- Whether and when the original ~18 GB Stage B job archives could safely be compressed or cleaned **after** preservation checks and user review. Do not delete them within this assignment.

Retain New L0 as the official frozen reference and N/original as the preferred research challenger. No adoption or deployment decisions are authorized.

---

## 7. Deliverables and portable ZIP handoff — mandatory

Create an isolated research namespace for these report-only follow-ups. Include at least:

- `READ_FIRST.md` — what was done, headline findings, limitations, exact reading order and recommended next decision.
- `REPORT.md` — full analysis answering the executive questions above.
- `CENSUS_REPORT.md` and per-cutoff machine-readable census records.
- `GIVEBACK_REPORT.md` and per-cutoff machine-readable decomposition and paired statistics.
- `VERIFICATION.md` — original archive hashes before/after, replay-to-sealed comparisons, number of new evaluations (**zero for census**), CPU/GPU parity, relevant tests and incident handling.
- `AMENDMENTS.md` — append-only deviations and any diagnostic code corrections, with impact and evidence.
- `DECISION_REGISTER.md` — proposed decisions, explicitly **not adopted**.
- `RESEARCH_RECOVERY.md` — branch/commit, commands, archive identities and reproducibility notes.
- Selected summary tables and data schemas sufficient to inspect the conclusions independently.
- `MANIFEST.sha256` covering every included ZIP payload file, plus an integrity-verification summary.

**Package the above into a portable ZIP** intended to be uploaded directly into the original Margin Trading ChatGPT conversation. Make the ZIP self-contained for human review, but exclude giant SQLite archives, market data, local caches, compiled artifacts and credentials. Include source paths and hashes so those underlying records can be retrieved on Apollo if needed.

Verify checksums after producing the ZIP. Commit and push the new isolated research branch according to repository conventions; report its exact commit and verify local/remote equality. Keep `main` and the original Stage B research branch unchanged. Delete only newly created disposable scratch copies *after* verifying results and preserving the originals; log what was removed.

**The final Claude response must identify the ZIP filename and path and state that no new genetic optimization was performed.**

---

## 8. Explicit stop conditions

Stop and report the blocker instead of improvising if:

- Required original archives are absent or fail integrity checks.
- The census cannot reproduce the sealed search lanes without making new evaluation requests.
- CPU diagnostic financial results disagree materially with the authoritative archived GPU records.
- A needed fix would require changing sealed methodology, official GPU kernels, accepted optimization code, or research-selection rules.
- Resource constraints prevent a complete audited result within this assignment.

**Do not initiate a successor optimization or any staged trailing-stop implementation in this assignment.** Those are separate priorities requiring our review.

**Success criterion:** Both deferred diagnostics are complete and reproducible, with transparent caveats and a portable checksum-verified ZIP handoff. The sealed Stage B verdict, all frozen strategies, and the optimization methodology are unchanged.
