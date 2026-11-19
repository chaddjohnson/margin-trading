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

## E1 — Pilot findings: pool failure path; pilot option (post-freeze, infrastructure only)

The S5 pilot's first abrupt-termination test showed that a worker dying with a task in flight would leave the pool's
run loop waiting for that task. `pool.ts` now drops a dead worker's in-flight tasks before failing the job, and
`job.ts` starts the workers inside the same commit-and-checkpoint failure path. `commands.ts` gained the pilot's
`--set grid` option. None of these files is in the evaluation-code digest (the archived records' binding is
unchanged, `03bbcafa…4bce`); no funding rule, selection rule or criterion changed. Verified by pilot-kill-b and
pilot-sigterm (`results/pilot/PILOT.md`).

## E2 — Diagnostics, frozen-selection and validation code written after the protocol freeze (implementation only)

`diagnostics.ts` (PROTOCOL.md §9), `validate.ts` (§10) and their commands were written after the freeze, after the
fold selections were sealed (all four: OFF) and, for `validate.ts`, after the development diagnostics ran. They
implement the frozen specifications; they are not in the evaluation-code digest, and `freeze-selection` refuses to run
unless the digest still equals the frozen `03bbcafa…4bce`. Two specification details resolved here, both before the
validation opened: (a) with no role holder at C24, §10's report-only perturbations use the reference configuration
(VGT+GDX, A 20, E 5%) — its confirmation draws with the §6 seed formula `('confirm', 'C24', 'VGT+GDX', 20, 50)` and
the 128-point D1 confirmation stress; (b) the diagnostics also report VGT A 20 E 5% (it shares the reference's ledger
on D24). No rule or criterion changed.
