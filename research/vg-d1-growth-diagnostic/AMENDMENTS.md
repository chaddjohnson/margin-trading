# Amendments — Priority 3A (vg-d1-growth-diagnostic)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.


## After the freeze

### A1 — 2026-11-09T13:57:52Z — stage N compares both records in the same encoding; code acknowledgements

- **Change.** (1) Stage N's reproduction check compared this run's record *encoded* (non-finite numbers as the
  strings `"__NaN"` etc., the sealed JSON's form) with the archived record *decoded* (the archive's reader turns those
  strings back into `NaN`). It now encodes both sides (`firstDifference(plain(ob.rec), plain(d.rec))`). (2) Stages
  accept a code digest other than the frozen one only if `results/code-acknowledgements.jsonl` acknowledges it and
  cites an amendment of this file.
- **Why.** The first run of stage N stopped (exit 1, nothing sealed) on `.ddRecoveryT: "__NaN" ≠ null`: a draw whose
  drawdown had not recovered by the end has `NaN` on both sides; the comparator, not the engine, differed. The fix
  makes the check exactly as strict as stage R's (every other field still compared to the bit).
- **Results that existed.** R (`results/development/participation.json`) and S (`results/archive/audit.json`), sealed
  under the frozen digest `129f5619c9726487031ee0fc9d793b380af85532f261975a0eef7638e9b8bbd6`; R compares against the
  sealed JSON's encoded form already and S compares no records, so neither is affected. Stage N had written nothing.
- **Effect.** The diagnostic digest becomes `10d86a221e997a1ab9c215b85f48b41f6f45fc87771976cf21835f29cbf970ce`
  (acknowledged). No definition, subject, ceiling, selection rule or probe design changes. Stage N reruns from its
  start (the failed attempt's ~10 replays are not counted in any sealed record; disclosed here).
