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

(No entries yet. The protocol was preregistered with this file at the commit recorded in `RESEARCH_RECOVERY.md`.)
