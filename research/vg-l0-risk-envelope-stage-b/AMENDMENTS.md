# AMENDMENTS — Stage B RES-B 1.0.0 (append-only)

The rules are in PROTOCOL.md §17.
- **Entry fields.** Each entry gives an ID, the UTC time (from `date -u`), the change, why, which results existed at
  the time, and its effect.
- **Before the freeze.** `P*` entries may refine only the implementation. They never change an arm, cell, cutoff,
  replicate set, statistic, margin, budget or the window.
- **After the freeze.** There are three kinds of entry:
  - `D*` are disclosures: incidents and test or script defects;
  - `O*` are operational changes that select nothing;
  - `A*` are code defect fixes. Each has a sealed, committed `results/amendments/A<n>.json` whose digest chain starts
    from the frozen digest.
- **What may never change.** Criteria are never loosened. No arm, cell, cutoff, replicate, policy, statistic, margin or
  threshold is added, removed or changed once a result it governs exists.

The protocol was preregistered with this file at commit `59493083` (2026-11-22T21:26:55Z, pushed).

- **P1 (2026-11-22T21:45Z, pre-freeze; a disclosure, no change).** The standard's read time is wrong in two places:
  `PROTOCOL.md` §0 ("read in full 2026-11-22T21:25Z") and `STANDARD_ADOPTION.json` `readAt` (`2026-11-22T21:25:00Z`).
  Both were estimated, not taken from the clock. The standard was read in full before the first clock reading after
  it, 2026-11-22T21:21:18Z (`date -u`), and the brief at 21:14Z. Likewise, the first `RESEARCH_RECOVERY.md` top screen
  ("Updated 22:10Z") was an estimate, corrected there. The adoption time `2026-11-22T21:26:35Z` was taken from the
  clock. No criterion, design element or result is affected. No Stage B evaluation existed.
- **P2 (2026-11-22T21:45Z, pre-freeze; implementation refinements within PROTOCOL.md, no design change).**
  - (a) The door guard takes an injectable record state, so the fold-order and FULL-once rules are unit-tested on a
    synthetic state (`tests/doors.test.ts`). The guard semantics are as in PROTOCOL.md §9.
  - (b) The selection record seals the lane values, the 32 pairs and the paired statistic of §1 (`stats.ts
    primaryOf`) at selection time, before the cutoff's next door opens. The analysis tool only reads it.
  - (c) The launch rule of §13 is enforced in code (`stages.ts launchGuard`). The forecast is the expected requested
    evaluations at Phase 7's 8-lane rate scaled by door sessions; after the first fold, the previous search's measured
    rate scaled by door sessions, ÷ 1.5; plus the qualification and interval at the pilot's measured qualification
    rate, plus 10 minutes. A resumed search is not re-gated.
  - (d) E3's threshold-edge subjects are written by `tools/vg-l0-risk-envelope-stage-b/edge-subjects.py`: 500 per
    door, nearest to BD $30k (150), PL $25k (150), DD $40k (100) and DD $35k (100). They are drawn from Stage A's
    replayed pilot populations, sha256 `230ee6c7…` (C21) and `71078c00…` (C24), and added to Phase 7's 1,000 edge
    subjects per door.
- **D1 (2026-11-23T06:40:54Z; a disclosure after every official stage, no criterion or result affected) — the execution window and
  the report-only diagnostics.**
  - Every official stage ran inside the nine-hour window: E2, search, qualification, selection and interval for
    C19, C21 and C24, and the one FULL validation. The first official job started at 2026-11-22T21:56:09Z and the last
    sealed record (`results/intervals/C24.json`) was committed at 23:06:57Z. All three folds were launched far inside the
    04:30Z launch rule.
  - The interactive session then stood idle, awaiting continuation, until 2026-11-23T06:37Z, past the 06:14Z hard end.
    On the user's instruction to continue, the remaining non-evaluating work was done after the window. That work is the
    analysis of the sealed records (`analyze.ts`, and the new supplementary `supplement.py`), the reports, the
    regression and the ZIP.
  - Following PROTOCOL §10 ("performed after the official stages if the window allows; otherwise disclosed as not
    performed"), the two report-only CPU diagnostics were **not performed**. They are the search-archive census
    (`tools/vg-l0-risk-envelope-stage-b/census.ts`) and the profit-giveback replay
    (`tools/vg-l0-risk-envelope-stage-b/giveback.ts`). Both are committed, untested on real records, and await a
    separate decision by the user.
  - No evaluation of any kind influenced, or ran after, the sealed decision statistic. The statistic was sealed in
    each selection record at selection time.
- **D2 (2026-11-23T06:40:54Z; a disclosure) — Strategy Lab nonregression timing.** The brief (§5) lists the Strategy Lab nonregression
  check among the gates before official optimization. PROTOCOL §12 scheduled it in the final regression instead, and
  it ran there, after the official stages.
  - Stage B adds no file under `apps/` and changes no evaluation-manifest, enforcement or engine file, so official
    evaluations could not depend on Strategy Lab. `results/regression/integrity-diff.txt` checks this, and E1/E6
    showed the acceptance pins matching the tree.
  - The final regression is the verification of record.
