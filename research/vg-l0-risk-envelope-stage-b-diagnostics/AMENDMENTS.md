# AMENDMENTS — RES-BD 1.0.0 (append-only)

These are the deviations, incidents and diagnostic-code corrections after the diagnostic plan (`PROTOCOL.md`) was
committed.
- **Entry fields.** Each entry gives an ID, the UTC time (from `date -u`), what changed and why, which results existed
  at the time, its impact and its evidence.
- **Kinds.** `D*` entries are disclosures, incidents and tool defects with their fixes. `O*` entries are operational
  changes that select nothing.
- **Never changed by an entry:** Stage B's metric definitions, policy gates, seeds, doors, sealed selection criteria or
  frozen results.

The plan was committed before any diagnostic tool ran on a real Stage B record (see `RESEARCH_RECOVERY.md`).
