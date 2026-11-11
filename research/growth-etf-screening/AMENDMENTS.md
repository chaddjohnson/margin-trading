# Amendments — Priority 7A (growth-etf-screening)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.

## Before the freeze

### R1 — 2026-11-11T20:42:53Z — XLF moved to the untested list (an unadjusted corporate-action discontinuity in development)

- **Change.** A study rule D3b is added to the universe rules: no unadjusted corporate-action discontinuity in
  development — an overnight move ≥ 15% (Study 9's audit threshold) that coincides with a documented split, special
  distribution or spin-off not represented in the canonical price convention. Every ≥ 15% overnight move the
  development scan listed is classified in `results/universe/R1-corporate-action-discontinuities.json` (sealed,
  `f9deab14…2a87`): eight are market moves (EWZ 2017-05-18; the March 2020 moves of EWZ, ILF, XLE, XLF and XOP) and stay;
  one is a corporate action: **XLF on 2016-09-19, −18.1%** (close $23.62 → open $19.35), the special dividend in kind of
  0.139146 XLRE shares ($4.44356 per XLF share; ex-date 2016-09-19; OCC/MIAX information memo 39575; the GICS
  real-estate carve-out). XLF joins GDXJ, OIH and XLRE on the untested list; the eligible universe is **60 ETFs** (VGT
  and GDX among them as controls).
- **Why.** The canonical convention is price only and the repository registers no adjustment for this distribution
  (`config/market-events/` has splits for every symbol and distributions for VGT and VOOG only). A Growth book holding
  XLF across 2016-09-19 would book an ≈ $18,800 loss no holder suffered, and the "rise from recent low" scanner, trend
  filters and moving averages would read an artificial 18% low for up to a year. Interpolating or back-adjusting one
  fund would be a new, fund-specific data convention (the brief: do not quietly change distribution assumptions); the
  brief's prescribed treatment is the separate untested list.
- **Results that existed.** The sealed universe manifest (`UNIVERSE_MANIFEST.json` `d6267bcb…89a9`, which lists XLF as
  eligible under D1–D5 and records the move in its development scan) and the door manifest. No strategy had been run on
  any ETF; no performance figure existed.
- **Effect.** 60 eligible ETFs instead of 61. The sealed universe manifest is not rewritten; every stage reads the
  eligible set from the R1 record.

### R2 — 2026-11-11T21:09Z (approximate: appended between the 21:08:32Z and 21:10:15Z unit starts; first typed as an estimated 21:12Z) — the resource contract from the bench (engineering; before the freeze)

- **Change.** §13's execution settings: **W = 8** child-process workers per ETF job, **K = 2** ETF jobs at a time within
  a unit (16 workers in all), workers started all at once (start batch 8), a full GC every 256 evaluations or above
  256 MiB of ArrayBuffers, book cache 256, dispatch stop at 36 GiB.
- **Why.** The bench (`results/pilot/PILOT.md`; XLK D24, 192 random centres with 8 neighbours each): 139.5 evaluations/s
  at 8 workers, 132.7 at 12, 136.7 at 14 and 129.5 at 16 — CPU-bound on the 8 physical cores (56 ms of worker time per
  evaluation at 8 workers, 88–120 ms with hyperthreads); peak job cgroup 4.0–7.9 GiB. A real ETF job has stage barriers
  (screen, generations, rungs), so two concurrent jobs keep the cores busy: the study-size pilot (P18, XLK and TLT
  concurrently) used ≈ 6.7 of 8 workers per job on average (13.4 of 16) at a 5.4 GiB peak.
- **Results that existed.** Engineering only (the sealed universe, door, transfer and parity records; the bench; pilot
  mechanics on P18).
- **Effect.** Operational settings only; budgets, rules and gates unchanged.

### R3 — 2026-11-11T21:09Z (approximate, as R2) — pilot findings fixed before the freeze (engineering)

- **Change.** (1) `stages.ts` `etfShortlist`: the seed-alternative slot takes the other seed's highest-centre-net pick
  that is distinct (the first acceptable one), not only its single best pick (found by the new unit test; the
  protocol's §7.1 wording follows). (2) The single-ETF entry points (`screen --symbol`, `transfer --symbol`) run the
  stage guards and refuse a symbol outside the run's eligible universe. (3) The pilot can run the study's budgets on
  P18 (`--pilot-budget study`) for sizing. (4) The first worker-kill and unit-kill tests (pilot budgets) ended before
  the kill took effect (each XLK job took ≈ 8 s and no worker reached 120 evaluations) — void; all three interruption
  tests were repeated on a study-size job (`results/pilot/PILOT.md`).
- **Why.** Pilot and unit-test findings (`results/pilot/PILOT.md`).
- **Results that existed.** Engineering only (pilot P18 records in the cache).
- **Effect.** Selection mechanics as the protocol intends; no evaluation, gate, budget or rule changes. The adoption
  manifest is re-adopted with the protocol's final sha256.

### R4 — 2026-11-11T21:11Z (re-adopted 21:11:37Z by the clock) — distinct island proposals; the pilot repeated on the final code (engineering)

- **Change.** (1) `search.ts`: an island child identical to a centre already screened in its lane is a duplicate, not a
  new distinct proposal (4A's lanes excluded only the rung-1 archive), so every lane's 96 island proposals are new.
  (2) The pilot's straight run, the study-size sizing reference and all three interruption tests are repeated on the
  final code (`ref2`, `size2`, `int3-*`). The earlier unit-kill attempt (`int2-unit`) is void: both of its units stopped
  at the preflight because the protocol draft was edited (§13 settings, R2) while it ran — no evaluation took place.
- **Why.** Code review before the freeze; a valid interruption test needs unchanged code and protocol.
- **Results that existed.** Engineering only (pilot P18 records in the cache; the earlier pilot outputs are kept, not
  used).
- **Effect.** Exact proposal accounting; no gate, budget or rule changes.

## After the freeze

### A1 — 2026-11-11T22:19Z — a mislabelled report field in the sealed sequential record (report-only; no rerun)

- **What.** In `results/folds/sequential.json`, each policy part's `sliceDd` is the reset minute DD of the member's D24
  replay from the boundary close to **2024-12-31** (the D24 door's end), not to the slice end (e.g. GDX's C19 part reads
  $52,559.77; its sealed fold evaluation on D21 — the slice 2020–2021 — reads $26,605.80). `folds.ts` `sliceRun` cuts
  the marks and the slice P&L at the slice end but takes the period drawdown from the engine's boundary period, which
  runs to the door's end.
- **Effect on results.** None on any verdict, net or sequential drawdown: the sequential DD is computed from the marks
  cut at the slice end, and every slice P&L was cross-checked to the cent against the sealed fold evaluations (the stage
  would have failed otherwise). The validation stage's use of the same function is correct (its slice ends at the door's
  end). The sealed record is not rewritten; the report and the tables take every slice reset DD from the sealed fold
  evaluations (`results/folds/<cut>/evaluation.json`), whose doors end at the slice end.
- **Results that existed.** The C19, C21 and C23 selections and fold evaluations (sealed and committed) and the
  sequential record (sealed); C24 screens running.
- **No rerun, no rule or code change.**
