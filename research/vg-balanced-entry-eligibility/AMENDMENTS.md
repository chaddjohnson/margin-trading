# AMENDMENTS — vg-balanced-entry-eligibility (append-only)

Entries R* precede the protocol freeze; entries E* follow it. Success criteria are never loosened here.

## R1 — Phase A field-name defect (pre-freeze, before any rule depended on the audit)

The first Phase A run (2026-11-07T23:01Z) read `trigger` and `trailingLow` from the signal record, which has neither
(they are on the refused shadow trade), so its band and invalidation checks compared against `undefined` and reported
no invalidations and no selectable cases. Seen at once in the row dump; fixed in `audit.ts` (read them from the
shadow trade) and rerun at 23:02Z. Only the corrected output (`results/audit/phase-a.json`) is used. No rule was
changed.

## R2 — Report-only engine options added after Phase A (pre-freeze)

`engine.ts` gained `invalidation: 'minute close' | 'none'` for PROTOCOL.md §9's report-only invalidation sensitivity
(default and protocol rule: `'minute low'`, the pre-audit behaviour), and the evaluation layer passes the report
periods. Neither changes a funding decision of the protocol configurations. OFF parity was rerun afterwards through
both the plain configuration and the study's own evaluation path (`evaluate.ts`, periods on): exact on D19, D21, D23,
D24 and FULL (`results/parity/off-parity.json`), runner files byte-identical (`runner-format-parity.json`).

## R3 — Period tracker start defect found by the unit tests (pre-freeze)

A report period whose first session is at or before the run's first trading session (e.g. `2016`, `development`)
never started its reset-drawdown tracker. Fixed (`startPeriods(..., initial)`); covered by the period-accounting test.
Report-only; no funding decision depends on it. The code was then formatted with the repository's Prettier
configuration (no semantic change), and parity rerun (R2).
