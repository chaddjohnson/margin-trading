# Claude Code — TSLA Outcome-Reporting Identity Fix (Pre-GDX Engineering Assignment)

## Mission and scope

Correct the **post-seal outcome-reporting defect** identified in Priority 6, `research/tsla-d1-growth/`, without changing any frozen TSLA trading research, optimizer decisions, or historical results. This is a narrowly scoped engineering and verification assignment. **Do not start the GDX-only study, any genetic optimization, or any trading deployment.**

The subsequent research priority is an independent **GDX-only D1 + Growth study**, before MSFT. That future study must compare both GDX-only and **N/original** against the **same underlying 60% VOOG / 40% VGT core portfolio**, as well as compare their isolated trading-slot metrics. This is a requirement for the **next** assignment, not authorization to perform that research here. A GDX-only result need not exceed N/original's trading profit to be considered worthwhile if it demonstrably reduces whole-portfolio risk; exceeding it is welcome too.

Start by reading `CLAUDE.md`, the applicable optimization standard and GPU-integrity documentation, and the actual Priority 6 source and sealed artifacts. In particular, read:

- `research/tsla-d1-growth/READ_FIRST.md`
- `research/tsla-d1-growth/REPORT.md`
- `research/tsla-d1-growth/PROTOCOL.md` (especially §12)
- `research/tsla-d1-growth/AMENDMENTS.md` (especially disclosure D1)
- `research/tsla-d1-growth/DECISION_REGISTER.md` (especially U6)
- `research/tsla-d1-growth/results/FROZEN_SELECTION.json` (or its verified actual location)
- `research/tsla-d1-growth/results/validation/validation.json`
- `research/tsla-d1-growth/results/outcome.json`
- `research/tsla-d1-growth/reports/tables/outcome-join.json`
- `src/tsla-d1-growth/outcome.ts`
- `tools/tsla-d1-growth/outcome-join.py`
- Relevant existing tests and research record/seal utilities.

Verify all paths and identities against the live repository; do not assume the current checkout is the same commit as the handoff. The TSLA research was completed on `research/tsla-d1-growth` (handoff reported commit `421e4c87`), with its original sealed outcome frozen earlier. Record the actual current branch, HEAD, working-tree status, and hashes before modifications.

## 1. Reconstruct the exact defect

The documented defect is specific:

- `preDetermination` constructs finalists with stable candidate `id` and `arm` and then replaces each finalist's **`label`** with a human-readable *governance/status label*.
- `outcomeOf` subsequently attempts to join validation records using `row.label === finalist.label && row.arm === finalist.arm`.
- This mutable-label join fails. The sealed `results/outcome.json` therefore contains `validation: null` for finalists and omits the *development-qualified without chronological support* list.
- The separate report-only join by finalist **ID** reconstructed the expected governance result: **no qualifying TSLA candidate**, with the **Growth standalone (G)** and **fixed D1/Growth pair (C)** C24 primaries recorded as development-qualified but without chronological support. D, J and S failed their validation V1 requirement.

Inspect the actual types, invariants and record schemas before editing. Reproduce the failure with a focused test. Confirm that the chronology gate already failed for all five architectures, so the bug did **not** change the binding no-successor conclusion.

## 2. Implement the minimal robust fix

Update the outcome-assembly code to match validation records to finalists through **stable, immutable identity**, not display labels. Use the verified canonical identity—typically `(arm, finalist.id)`—rather than candidate names, changed status labels, array order, or fuzzy matching.

Requirements:

1. Preserve the precommitted Priority 6 qualification and outcome rules, all numerical thresholds, and the meaning of the existing output fields.
2. A finalist must match **exactly one** corresponding validation record when that record is expected. Fail clearly on missing, duplicate, conflicting, or mismatched identities; do not silently translate a failed join into `validation: null` and `c: false`.
3. Verify per-arm uniqueness and that no validation record is accidentally consumed by two finalists. Handle distinct roles referring to one underlying finalist appropriately according to the existing schema.
4. Keep human-readable status/governance labels separate from stable identity. Preserve backwards compatibility for consumers wherever possible; document any necessary output-schema adjustment.
5. Make the fix deterministic, narrow, and reusable by future TSLA-style or MSFT/GDX studies without copying the bug.
6. Do not alter strategy signals, trading state, chronological event order, transaction costs, margin accounting, risk metrics, parameter domains, optimization algorithms, or candidate selection.
7. Do not change the accepted CPU/GPU evaluation implementation or pinned dependencies unless strictly unavoidable. If an evaluation dependency changes, follow the full GPU parity and acceptance procedure; no silent bypass.

Prefer a small patch in `src/tsla-d1-growth/outcome.ts` plus focused tests. Avoid a broad refactor.

## 3. Test the actual governance behavior

Add regression tests for at least:

- A finalist whose original candidate label differs from its overwritten governance label still joins correctly by identity.
- Every intended finalist receives the correct V1/V2/V3 flags and `c` result.
- The `developmentOnly` list includes the G and C primaries when replaying the sealed TSLA evidence, and D/J/S fail the expected validation condition.
- Missing, duplicate and cross-arm/mismatched validation identities fail closed rather than yielding a misleading outcome.
- Multiple finalist roles attached to one identity do not cause duplicate records or incorrect outcome classification.
- Reordering finalists and validation rows does not change results.
- The exact original **NO QUALIFYING TSLA CANDIDATE** verdict is preserved.
- Any reusable outcome code has corresponding tests so the defect cannot recur in the next independent stock/ETF research study.

Use deterministic synthetic fixtures for failure modes, then an **isolated, read-only report-only replay** from the original sealed TSLA finalist/validation inputs. Cross-check the replay against `reports/tables/outcome-join.json` and the manual reconstruction documented in disclosure D1. Avoid re-evaluating strategies or reopening market-data doors unnecessarily.

**Do not regenerate, overwrite, replace, repin, or unseal** `results/outcome.json`, any other completed Priority 6 sealed artifact, or frozen source/data manifests. The original defective outcome is historical evidence and must remain intact. Write corrected demonstration/reconciliation outputs only to a clearly marked **new, unsealed engineering-report directory**, using nonconflicting paths and provenance labels.

## 4. Regression, integrity, and integration checks

Perform the relevant repository-supported checks, including:

- Focused outcome-unit and integration tests.
- Type checking, linting, and the full test suite; identify the **known pre-existing failures** separately from any new failures.
- All applicable research preflight and sealed-artifact integrity checks.
- Strategy Lab unit and browser tests and portfolio parity, to the extent required by the current project's standards; do not alter its live state or distribution.
- Relevant existing CPU/GPU parity and acceptance verification. If this is demonstrably a research-report-only change outside the accepted evaluation dependency graph, document that conclusion with file/hash evidence rather than needlessly recertifying the CUDA backend.
- Reproducibility of the corrected report-only outcome on a second clean run.

The original TSLA research must remain numerically and chronologically unchanged, as must New L0 and N/original.

## 5. Git workflow and research preservation

Work from the verified Priority 6 lineage on a **dedicated bugfix branch or isolated worktree**. Inspect active worktrees and existing changes first. Do not overwrite unrelated work, force-push, or merge into `main` without explicit authorization.

Record the starting and ending commit hashes, changed paths, amendment/engineering-fix notes, executed checks, and any unavoidable deviations. Preserve the original frozen TSLA study and all compressed research archives. Commit and push the isolated patch when verification passes.

## 6. Required delivery: portable ZIP handoff

Deliver a compact, self-contained, checksum-verified ZIP suitable for upload into the original Margin Trading ChatGPT conversation. Exclude large data, binaries, compressed job archives, credentials, and unnecessary caches. Include:

1. `READ_FIRST.md` explaining the problem, exact fix, and reading order.
2. `REPORT.md` with before/after behavior and explicit confirmation that the sealed research outcome remains untouched.
3. `SOURCE_DIFF.md` or an appropriately scoped patch and list of source references.
4. `TEST_REPORT.md` with commands, expected and actual results, known failures, and CPU/GPU/Strategy Lab nonregression evidence.
5. `OUTCOME_RECONCILIATION.md` showing corrected validation identities, G/C development-only classification, unchanged no-successor verdict, and the report-only output location.
6. `RESEARCH_RECOVERY.md` with branch, commits, artifacts, and reproduction commands.
7. `DECISION_REGISTER.md` with any outstanding integration decisions and explicit recommendation on merging the small bugfix (without merging unrelated TSLA research).
8. `SHA256SUMS.txt` and a verified extraction/checksum report.

Put the branch and commit identifier in the handoff. Provide the exact ZIP path and a concise final summary.

## 7. Success criteria and stop condition

The assignment is complete when the outcome join uses immutable identity; failed/mismatched joins cannot silently masquerade as failed validation; the sealed TSLA outcome remains unchanged; the G/C development-only classification is correctly reproduced in a separate engineering artifact; all relevant tests and integrity gates pass with no new unexplained regressions; and the portable ZIP handoff is produced and verified.

**Do not start GDX optimization, MSFT optimization, a new TSLA search, paper trading, broker activity, or strategy deployment.** The very next research assignment after this engineering fix will be the separately authorized GDX-only D1/Growth study, with symmetric whole-portfolio comparisons against the same 60% VOOG / 40% VGT core plus N/original.

End with a clear declaration: **TSLA REPORTING FIX COMPLETE — HISTORICAL RESEARCH UNCHANGED — GDX STUDY NOT STARTED**, or report a precise blocker if any acceptance criterion cannot be met.
