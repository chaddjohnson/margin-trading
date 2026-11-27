# READ FIRST — TSLA outcome-reporting identity fix (pre-GDX engineering assignment)

**Status: COMPLETE. TSLA REPORTING FIX COMPLETE — HISTORICAL RESEARCH UNCHANGED — GDX STUDY NOT STARTED.**

- **Branch:** `fix/tsla-outcome-identity-join`, from `research/tsla-d1-growth` at `421e4c87` (the Priority 6 handoff).
- **Fix commit:** `70f8bdf14712924fe02985515537b111e00a5edd`. It is preceded by the module commit
  `aca31b5fd595850050ca629ef3ac9208a84c9894`, which only adds `src/research-outcome/` and can be cherry-picked onto
  `main`. The handoff commit after the fix commit adds this ZIP; check it with
  `git ls-remote origin fix/tsla-outcome-identity-join`. Nothing is merged into `main`.
- **Engineering only.** No strategy evaluation, search, optimization, data door, trading, broker contact or deployment.
  Neither the GDX study nor the MSFT study was started.

## The problem

Priority 6's outcome code joined the sealed validation rows to the C24 finalists by `label`. `preDetermination` had
already replaced each finalist's `label` with a governance label ("development-qualified, NO chronological support: …"),
so no row matched. The code turned every missing row into `validation: null` and `c: false` without any error.

The sealed `research/tsla-d1-growth/results/outcome.json` therefore lists no validation for any of the 17 finalists and an
empty development-only list (disclosure D1, decision U6). The **verdict was not affected**: every architecture failed its
chronological test, so no finalist could be a candidate whatever the join returned.

## The fix

- **A new, generic module `src/research-outcome/identityJoin.ts`.** It joins finalists to validation records by the
  stable identity **(arm, id)** and fails closed (`IdentityJoinError`) on a missing, duplicate, cross-arm or conflicting
  identity, or on malformed V1–V3.
- **`src/tsla-d1-growth/outcome.ts`** uses it:
  - `label` keeps its sealed meaning (the governance label);
  - new, explicit `candidateLabel` and `governanceLabel` fields;
  - candidate and development-only lists by candidate label, in canonical order.
- **37 new tests:** 12 for the generic join; 16 synthetic outcome tests; 9 read-only replays of the sealed TSLA records.
- **Unchanged:** every rule, threshold, metric, evaluator and pinned dependency.

## The corrected result (report-only)

`replay/outcome.corrected.report-only.json` gives:

- every finalist joined to exactly its own validation row;
- **NO QUALIFYING TSLA CANDIDATE** (unchanged);
- development-qualified without chronological support: the **G** primary `C24/G/refine/G.h2.s1/R101#1 profit` and the
  **C** primary `C24/C/pair DF1×GF3`;
- the D, J and S primaries fail V1.

This is identical to the manual D1 reconstruction (`reports/tables/outcome-join.json`). The sealed outcome and every
other file under `research/` are byte-identical to `421e4c87`.

## Reading order

1. `READ_FIRST.md` (this file).
2. `REPORT.md`: the defect, the fix, before and after, the schema, the untouched sealed research, the code-digest
   consequence.
3. `OUTCOME_RECONCILIATION.md`: all 17 finalists, sealed versus corrected; the identity accounting; the 18 replay checks.
4. `TEST_REPORT.md`: commands, expected and actual results, the known pre-existing failures, and the CPU/GPU and
   Strategy Lab non-regression evidence.
5. `SOURCE_DIFF.md`, then `source.patch` and `source/`: the scoped patch and every new or changed file (plus the pre-fix
   `outcome.ts`).
6. `DECISION_REGISTER.md`: decisions taken, the **integration decisions for you** (I1: bring the module to `main` by
   cherry-pick; do not merge the branch), and what is carried forward to the GDX study.
7. `RESEARCH_RECOVERY.md`: branch, commits, artifacts and the exact reproduction commands.
8. `VERIFICATION.md`, `SHA256SUMS.txt`, `IDENTITY.txt`, `BRIEF.md` (the assignment), `WORK_RECOVERY.md` (the
   checkpoint), `evidence/` (logs and fingerprints), `reference/` (byte copies of the five sealed TSLA inputs, for
   independent checking).
