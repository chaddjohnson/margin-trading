# Amendments — bounded optimization-process audit (optimization-process-audit)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.

## Before the freeze

(none)

## After the freeze

### A1 — 2026-11-10T23:05Z — the G7 check mis-read the sealed encoding of non-finite values (engineering; no result changed)

- **What happened.** `results/stage1/reproduction.json` (sealed 2026-11-10T23:04:47Z) records 94 checks: G1–G6 pass
  (88 checks, including every published fold outcome and sequential path to the cent) and all 6 G7 checks fail. The
  G7 check read the subjects' sealed search records with plain `JSON.parse`; those records store an unmeasured
  neighbourhood's robust net and p90 DD as the strings `"__-Inf"` / `"__Inf"` (the subjects' store encoding), which
  the check compared with `null` instead of −∞ / +∞.
- **Change.** `g7Checks` decodes the sealed records with the subjects' own `decode` and compares exactly; the corrected
  G7 is sealed separately as `results/stage1/g7-recheck.json` (archive scan only, no fresh simulation). The failed
  record stays sealed and is reported. Dependent stages require either 0 failures in `reproduction.json`, or failures
  only in G7 **and** a committed G7 recheck with 0 failures (`assertParity`).
- **Results that existed.** The protocol freeze, the archive scans, the inventory and the reproduction record. A scratch
  check before this entry decoded the six sealed search records and found **0 mismatches in 3,571 entries**.
- **Effect.** None on any measurement, gate threshold or later stage; it corrects a comparison in the harness.
