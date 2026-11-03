# Amendments (append-only)

The frozen protocol (`PROTOCOL_FREEZE.json`, body `5438e105…`) is never edited. Each amendment below records its time
(UTC, from `date -u`), whether any outcome had been seen, what changes, and why. The machine-readable twin is
`results/amendments.jsonl`.

## A1 — 2026-10-29T00:19:04Z — contract clarifications from reference-engine parity (pre-outcome)

**Status when written:** no Stage 1b mechanism had run on market data (only `audit`, which runs no strategy, was
sealed). The independent reference engine (`reviews/REFERENCE_AUTHOR_NOTES.md`) and the fast engine were compared on
**synthetic** markets only; their differences exposed one fast-engine defect and five underspecified points of
`ENGINE_CONTRACT.md`. These clarifications are binding for both engines from now on; nothing here is informed by an
outcome.

1. **Marks at fills (contract §8 vs PROTOCOL §3.3 "at each fill").** A fill that leaves the account flat (a stop, a
   close-decided exit, a transition) is marked at the fill, as contract §2 states; entry, trim, conversion and ZR reset
   fills are **not** marked at the fill — the bar's minute close (and the session close) marks them. This is Stage 1's
   engine convention (its parity anchor) and the reading of PROTOCOL §3.3's "at each fill" for Stage 1b.
2. **XS arming (contract §5 vs PROTOCOL §4.2 "C > F(1−b)").** The floor is armed after a held close at which E05's out
   is 0 (C ≥ F(1−b), or no swing low confirmed yet). The two readings differ only at exact equality or before the first
   confirmed swing low (a later-confirmed swing low lies below the price by construction).
3. **The `sessions` stall hurdle** (Stage 1's X6b, parity-only) is Stage 1's fixed 0.11 × T/252, whatever the run's
   rate. (Fast engine corrected; it had used the run's rate.)
4. **ZR segment labels.** The first segment is kind `first`, rule `fresh`; later segments are kind `reentry`, rule
   `resize` (Stage 1's C-ALR convention).
5. **Conversions** are not re-entry opportunities and do not count in `reentries`.
6. **Fields of an open trade at the end and of a trade with no held close** (not compared in parity): exitIndex = exitBar
   = −1, exitTime NaN, exitRaw = C_end, exitPrice = C_end (1 − c), stopLevel = the level, sessionsHeld = end − entry + 1;
   peakProfit −∞ and peakGross 0 until the first held close.
7. **Fast-engine defect corrected (not a contract change):** a window's dollar-days now credit the overnight from b to
   b+1 to the window (b, e] as contract §9 states (the fast engine had credited it to the previous window).

## A2 — 2026-10-29T01:13:38Z — final-audit findings recorded (post-outcome; descriptive only; no rerun)

**Status when written:** every stage sealed; outcomes seen. Nothing in this amendment changes a sealed record, a
criterion or the verdict; no stage is rerun.

1. **Event-ledger defect (final audit F4).** In the sealed `events` arrays, exit-type rows (exit, transition, conversion,
   end) record S and G before the fill and a mark that double-counts the sold shares; the correct post-fill values are
   S = 0, G = 0 and mark = M − interest. The field is descriptive; no rubric item, table or report uses it.
2. **Fixtures F4, F9, F12, F18 were not built, F13/F15/F20 only in part (final audit F1)**, and several §8–§10 diagnostics
   were not produced by the sealed stages (final audit F2). They are disclosed in `IMPLEMENTATION_AUDIT.md` §8; the
   diagnostics that can be computed from sealed payloads were added read-only to `results/tables/diagnostics.md`.
3. Report statements corrected per final audit F5 (13 items); margins per F9 added to the final report.
