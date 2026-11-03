# Amendments (append-only)

The frozen protocol (`PROTOCOL_FREEZE.json`, body `9c82742a…`) is never edited. Each amendment below records its time
(UTC, from `date -u`), whether any outcome had been seen, what changes, and why. The machine-readable twin is
`results/amendments.jsonl`.

## A1 — 2026-10-29T15:46:53Z — contract clarifications from reference-engine authoring (pre-outcome)

**Status when written:** no Stage 1c strategy had run on market data (only `audit`, which runs no strategy, was sealed).
The independent reference (`reviews/REFERENCE_AUTHOR_NOTES.md`) and the fast engine were compared on synthetic markets
only (`reviews/PARITY_DEVELOPMENT_LOG.md`). These clarifications are binding for both engines; none is informed by an
outcome.

1. **`releaseEntry` needs a cooldown of at least one session** (notes C1; contract §11.2 read literally would flag a
   decision at the exit session under C = 0). With C ≥ 1 nothing changes; with C = 0 (never searched — B's box is
   1–60) B is now identical to no B in every field, as §11.2 and §15 state. The fast engine was aligned to this reading.
2. **Mode `open` with no delayed bar, and the A check's "exitBar = −1" condition** (notes C4, C5): when the session has
   no trade at open + delay, mode `open` decides on the opening print and sells by the fallback; the check runs iff
   exitBar = −1. Unreachable on the data (every session has bars and the delays are ≤ 5 minutes); stated for
   completeness.
3. **Offset of a minute fill under a delay with a missing minute** (notes item 2): the offset is a time difference to the
   scheduled opening-fill bar; a minute fill that lands on that bar has offset 0 (eligible on day N). The contract's
   phrase "an in-session minute-rule fill has offset > 0" describes the normal case.
4. **Minute-rule `cBlocks`** count only when Stage 1b's `allowed` holds (the own condition is evaluated only then),
   once per session; a session can show a C block and a later entry (notes C2, C3). This is how both engines count.
5. **"Any fill consumes R"** (PROTOCOL §8.2) and "every entry fill consumes R" (contract §11.1) are the same rule: trims
   and exits are not entries and never consume it; conversions consume it and are not filtered by B or C (notes C9).

## A2 — 2026-10-29T17:01:56Z — descriptive disclosure after outcomes (no rerun, no criterion changed)

**Status when written:** every stage sealed; outcomes seen. Nothing here changes a sealed record, a criterion or the
verdict.

1. **The `C-ALR|reset` control path is degenerate** (all zeros in `results/payloads/evaluate/paths.json.gz`): the
   engine runs the ZR monthly-rebalanced reference only as a single-policy run (Stage 1b's design), so a multi-item
   annual-reset schedule of ZR policies never enters. Stage 1b never ran this row. No rubric item uses it — item (g)'s
   controls are C-SMA, C-DON, C-TSM and C-STOP (flat-start and annual reset), and the exposure-matched benchmark uses
   C-ALR flat-start, which reproduces Stage 1b's sealed value exactly (+$54,502 / $47,576), as does C-SMA flat-start.
   The row is omitted from the report tables.

## A3 — 2026-10-29T17:31:45Z — descriptive disclosure after outcomes (no rerun, no criterion changed)

**Status when written:** every stage sealed; outcomes seen; raised by the final audit (`reviews/FINAL_AUDIT.md`
finding 5). Nothing here changes a sealed record, a criterion or the verdict.

1. **The `C-ALZ1|reset` control path is degenerate**: it is identical to `C-AL|reset` (same path hash `d73b5c1a…`;
   +$71,331, no trims, peak gross $152,700). `evaluate.ts` builds every annual-reset control with
   `controlResetSchedule(ds, name, [Z0, Z0, Z0, Z0])`, and that sizing override replaces C-ALZ1's Z1 trimming in each
   item, so the row is the always-long Z0 path again. No rubric item uses it — item (g) uses C-SMA, C-DON, C-TSM and
   C-STOP, and the exposure-matched benchmark uses C-ALR flat-start. `C-ALZ1|flat` is unaffected (its Z1 trims
   appear in the path). The row is omitted from the report tables, like A2's C-ALR reset row.
