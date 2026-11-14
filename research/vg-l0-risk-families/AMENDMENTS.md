# AMENDMENTS — Assignment 2: D1 risk-control families and risk-aware candidate selection

Append-only. Each entry: ID, UTC time, the change, why, which results existed, and its effect. Entries before the freeze
(R…) record draft edits of the protocol; entries after it (A…) are amendments under standard §0.2; operational changes
(worker counts, caches) are O… entries. No criterion is loosened once results it governs exist.

## R1 — 2026-11-14T02:11Z — draft edits after the pre-registration commit `bbe5c2aa` (before the freeze)

- **Changes.** (1) `final.ts`: the pilot's validation stand-in (door D19) uses the pilot cutoff 2018-12-31 as its
  boundary instead of 2024-12-31 (a pilot-only path; the study path is unchanged). (2) `stages.ts`: an engineering
  override `VGL0RF_PILOT_BUDGET=study` lets a pilot run the study's per-lane schedule on its four pilot cells (cost
  calibration; pilot only). (3) `PROTOCOL.md` §8 and §14: the measured bench and calibration figures, 12 workers, the
  chain. No box, rule, threshold, quota, budget or cell changed.
- **Results existing.** Stage V (sealed, 0 failures), the full `npm test`, the bench, the straight pilot, the
  interruption tests and the calibration (pilot outputs in the cache; only timings, counts and pass/fail were read). No
  study search has run. The evaluation digest is unchanged since stage V (`6bc03fec…`).
