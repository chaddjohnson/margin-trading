# AMENDMENTS — gpu-phase6 (append-only)

Each entry: ID, UTC time, the change, why, which results existed, its effect. None so far.

## A1 — 2026-11-21T10:11:25Z — Strategy Lab's portfolio parity reads the FULL canonical files

- **Change.** PROTOCOL.md §4 says FULL and the validation window are not opened; gate E7 also names Strategy Lab's
  portfolio parity (`apps/strategy-lab/scripts/portfolio-parity.ts`), which replays the five frozen pooled candidates of
  its catalog on ONE FULL door (Priority 3's FULL loader, quiet, read-only) and compares every figure, lot and funding
  decision with their archived records. §4 is amended: that one script, and only it, reads FULL.
- **Why.** It is Strategy Lab's own established regression procedure for its runner path (Priority 6), the strongest
  available check that Strategy Lab's CPU results under `--no-maglev` equal sealed records (brief §1.8, §3 "Strategy
  Lab continues operating normally"). It makes no decision: the candidates are frozen, their 2025–2026 outcomes are
  archived and were examined long ago; nothing is selected, ranked or tuned.
- **Results existing.** None of E7's Strategy Lab part (the campaign was at step C2/C3; no portfolio parity has run).
- **Effect.** One extra read of FULL by a non-research script; no gate or criterion changes.
