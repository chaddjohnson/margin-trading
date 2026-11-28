# AMENDMENTS — RES-A 1.0.0 (append-only)

Each entry: ID, UTC time, the change, why, which results existed, its effect. The predeclared policy matrix and analysis
plan (`POLICY_MATRIX.md`, `PROTOCOL.md`) are never loosened after the results they govern exist.

- **N1 (2026-11-22, at predeclaration; a disclosure, not a change).** The brief names the pilot's caches as
  `.cache/vg-l0-risk-envelope-pilot/`; the pilot actually keeps them (git-ignored) in
  `research/vg-l0-risk-envelope-pilot/cache/` (its `context.ts cacheDir`). The audit reads them there, through copies in
  `.cache/vg-l0-risk-envelope-sensitivity/`. No result existed.
- **N2 (2026-11-22T16:10Z; a clarification before any comparative result was computed).** (a) The decision rubric's
  stage-level item (PROTOCOL.md §6.4) compares centres at **rung 3** — the 128-draw fidelity whose feasibility the
  shortlists use (rung-3 fits and refinement endpoints) — with rungs 1 (16 draws) and 2 (64 draws) reported beside it.
  (b) The G1 set (§5) is operationalized as every id carrying a sealed lane tag `r3` (feasible or infeasible) or
  `refinement endpoint` in either arm's sealed lane results, minus the qualification members. Only the population and
  qualification replays had run (zero evaluations; reproduction checks, no policy comparison).
- **N3 (2026-11-22T16:36Z; a disclosure about reporting resolution, no criterion changed).** The canonical record stores
  `dd` (and `net`) to the cent, while the envelope values are full binary64. Ordering statements between BD and DD
  (POLICY_MATRIX §2, "no ordering is assumed") are therefore counted beyond half a cent, and the PL ≤ BD identity beyond
  1e-6. The raw comparisons are reported beside them (`analysis-C2x.json` `centre.ordering`). No policy verdict uses a
  tolerance: every gate compares the stored values exactly (`value ≤ limit`).
- **N4 (2026-11-22T16:36Z; a disclosure of the executed replay volumes, within the predeclared caps).** G1: 40
  configurations per cutoff (cap 80), 30,880 CPU evaluations. G2: 1,534 (C21) and 1,704 (C24) centres (cap 8,000 per
  cutoff), each replayed by two engine passes (the canonical `evaluate()` record for parity and one pooled replay for the
  path), so 6,476 engine passes. G3: 512 evaluations. In total 37,868 CPU engine passes (cap 70,000). Every CPU record
  equals the archived GPU record bit for bit. The binding-metric tie-break (DD, then PL, then BD) labels PL = BD ties as
  "PL" under P2, where both limits are $25,000; REPORT §4.3 says so.
