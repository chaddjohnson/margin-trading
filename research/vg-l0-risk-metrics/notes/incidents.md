# Incidents and disclosures (append-only working log; carried into IMPLEMENTATION_AND_TESTS.md and REPORT.md)

- 2026-11-18T05:54–05:55Z — Stage 3 neighbourhood gate failures (nothing sealed): N/original and F/RA1 on D24 stopped at
  the regenerated-family parity gate with 1-cent differences (p90 DD $28,425.32 vs sealed $28,425.33; $24,396.87 vs
  $24,396.88; worst-10% means equal). Cause: the audited instrument takes its statistics over cent-rounded record DDs
  (Priority 3's `recordOf` rounds), this tool over unrounded rebuilt DDs. Fix: the gate now takes the quantiles over
  cent-rounded DDs (the audited instrument's convention); the comparison stays exact to the cent. The New L0,
  L/original and F/original families had already passed under the stricter unrounded comparison. Relaunched as units
  vgl0rm-nbhd-c/d at 06:05:15Z (log start lines).
- 2026-11-18T06:06:53Z (file mtimes, UTC) — while the Stage 3 neighbourhood units (vgl0rm-nbhd-c/d, started 06:05:15Z)
  and the Stage 5 member units (vgl0rm-members-C19…C24, started 06:06:23Z) were running, `tools/vg-l0-risk-metrics/population.ts` was refactored
  (its `membersOf` moved, unchanged, to the new `src/vg-l0-risk-metrics/archive.ts`). Node had already loaded the
  modules, so the runs executed the code as it was at their start; but `codeDigest()` was evaluated when each record was
  written, so those records' `code.digest` hashes the tree at their END. The replay and metric modules (engine.ts,
  metrics.ts, stops.ts, bundle.ts, audit.ts' nbhd path) did not change during those runs. From 06:07:10Z `codeDigest` is
  computed once at process start (common.ts), so a record carries the digest of the code it started with.
