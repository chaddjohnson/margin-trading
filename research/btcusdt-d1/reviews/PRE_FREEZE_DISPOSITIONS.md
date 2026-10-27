# Pre-freeze review — dispositions

Review: `PRE_FREEZE_REVIEW.md` (independent read-only subagent, 2026-10-27T00:46Z, before the freeze and before any
optimisation outcome). Every major finding was fixed, none waived. All changes were made before the freeze; the
engine changes were re-proved by a labelled parity rerun (`results/parity/PARITY-r2.json`, body `7663f900…`: 205
runs, 0 differences, maximum money difference 0, 7,462 trades; 0 mutation violations including truncation; both
deliberate cheats caught).

| # | Disposition | Where |
|---|---|---|
| M1 | **Fixed.** The fold gate (and the holdout gate) now applies every selection test that works out of sample: net > 0 at the principal costs, at the conservative costs and with worst-case stops; net minus the largest positive trade net > 0; minute peak-to-trough ≤ 35% **and ≤ 35,000 USDT** (removes the inflated-equity loophole); entries ≥ ⌈3/yr⌉ (fold A 4, fold B 5). | `stages.ts outOfSampleGate`, `protocol.ts foldGate`, PROTOCOL §8 |
| M2 | **Fixed.** "low" is now min(stop, trigger low, next traded minute's open), so it never fills above "adverse" (test `probes.test.ts`). The V-shaped-minute limit of "adverse" is documented; G5 and the fold gate require profit under "low". | `engine.ts`, `fast.ts`, `costs.ts`, PROTOCOL §3.4, BTC_CLOCK §5 |
| M3 | **Fixed.** Shortlist admission needs exposure-day distance ≥ 0.1 from every admitted vector and fewer than 6 admitted vectors per refinement lineage; skip counts are recorded. | `select.ts`, `protocol.ts shortlistRule`, PROTOCOL §7.4 |
| M4 | **Fixed.** G1 gains the 35,000 USDT minute-drawdown ceiling; new G6: net > 0 in ≥ 2 of 3 consecutive subperiods. Daily drawdown (never above the minute one), the trade distribution beyond G1/G2 and capacity are declared report-only with the reason. | `select.ts`, `evaluate.ts subperiodsOf`, PROTOCOL §7 |
| M5 | **Fixed (wording).** The rule now reads "month start containing history start + ⌊0.6/0.8 × 2,332⌋"; the dates are unchanged and come from the pre-outcome `calendar.ts` (`35e5b26e…`). | PROTOCOL §4 |
| M6 | **Fixed.** `parity` writes `PARITY-rN.json` labelled reruns; `freeze` refuses unless the latest parity record's hashes equal the current engine closure (11 files). | `stages.ts latestParity/runFreezeStage`, `records.ts engineClosure` |
| M7 | **Fixed.** No amendment path: outcome-critical files must equal the freeze byte for byte; only report-only files (CLI, report, tables, phenotypes, tests) may change and `verify` lists them. Every outcome record carries the freeze body hash, outcome-code digest and procedure hash; the gate checks VALIDATION ↔ PICKS ↔ frozen code. | `records.ts`, `stages.ts`, `cli.ts verify` |
| M8 | **Fixed.** `fixed`/`compare` derive the door from the sealed records (gate pass + HOLDOUT.json + membership and grid equality in the sealed PICKS; the diagnostic grid must equal the unchanged vector); unknown or mismatched ids are refused; the JSON door is display only and `verify` checks it. | `cli.ts sealedDoor` |
| m1 | **Fixed.** A last-minute adverse/worst stop now sells at the next day's first trade (min(limit, that open)), like a carried buffered sale. | `engine.ts`, `fast.ts`, tests |
| m2 | **Documented.** Single-bar hold day: no exit that day (no such day in the history). | BTC_CLOCK §3 |
| m3 | **Fixed.** Empty fields and foreign bytes mark a line malformed (test `data.test.ts`). | `raw.ts` |
| m4 | **Fixed.** The irregular-row rule reads only rows before the snapshot end; `snapshot` rebuilds from the sealed prefix and must reproduce the sealed definition (verified: byte-identical series); `data-audit` on a grown file verifies the prefix. | `snapshot.ts`, `cli.ts` |
| m5 | **Fixed.** A last row at 23:59 keeps its (complete) day; the wording is exact. No effect on this file. | `snapshot.ts`, DATA_AUDIT §3 |
| m6 | **Fixed.** `assertValidSeries` fails closed on any invalid OHLC, misaligned or non-increasing time, or zero-trade bar, on build and load. | `snapshot.ts` |
| m7 | **Documented.** If a crash leaves a partial stage (archive/SELECTION without PICKS), the stage's partial files are set aside under a dated name and the stage rerun deterministically with the same seeds, labelled in the checkpoint; nothing downstream can have read them. | RESEARCH_RECOVERY §5 |
| m8 | **Fixed.** The holdout stage refuses when the final selection has no pick. | `stages.ts` |
| m9 | **Fixed.** Gate cross-checks; `verify` checks every phenotype against the sealed door and grid, including the diagnostic. | `stages.ts`, `cli.ts` |
| m10 | **Fixed.** `compare` applies each phenotype's sealed door (a holdout request is refused, not silently dropped); `fixed --dataset <window>` reports that window of the same continuous run the sealed validation used (arming 2019-02-11) unless `--flat`. | `cli.ts`, `report.ts` |
| m11 | **Fixed.** Outputs only under `evaluations/btcusdt-d1/`. | `report.ts` |
| m12 | **Fixed.** `phenotypes` refuses after a passing gate until the holdout record exists. | `cli.ts` |
| m13 | **Fixed.** Coverage counts fills after missing minutes (`>`), positions held across ≥ 60-minute gaps (300), stop gaps (55), carried entries and sales. | `stages.ts` |
| m14 | **Fixed.** A second cheat (same-day high in the reference high; caught at 8 of 24 real cutoffs) and a truncation mutation (0 violations) were added. | `mutation.ts`, tests, PARITY-r2 |
| m15 | **Fixed (wording):** "two largest positive trade nets". | PROTOCOL §7.2 |
| m16 | **Fixed.** The freeze binds BTC_CLOCK_AND_EXECUTION.md and DATA_AUDIT.md and checks the npm script, imports map and lockfile. | `records.ts` |
| m17 | **Documented, report-only.** Capacity flags (fills > 25% of minute volume) are reported; no order-book model exists to gate on; the 10/20 bps impact scenarios and G4 (20 + 10) are the sensitivity. | PROTOCOL §7, DATA_AUDIT §2 |
| m18 | **Fixed.** The reviewer's eight probes are in the suite (`tests/probes.test.ts`; the two stop-fill probes restated for the corrected rules). | tests |
| m19 | **Fixed.** The pre-diagnostic `params.ts` was reconstructed byte for byte (`coordinator/pre-diagnostic/params.ts.txt`, sha256 `663bbbb9…` = the recorded hash); it differs from the frozen file only in whitespace. | coordinator/ |
| n1–n5 | Noted; n5's stale `./split.ts` reference fixed. Logs under `results/logs/` and `results/baseline/` are git-ignored by the root `.gitignore` (`logs/`, `*.log`); their key lines are copied into RESEARCH_RECOVERY.md. | — |

## Follow-up verification (reviewer, 2026-10-27T01:16Z) — dispositions

The follow-up confirmed every original fix and found no engine regression. Its findings, all fixed before the freeze
(none touches the engine closure, so `PARITY-r2.json` still tests the frozen engine code):

| # | Disposition | Where |
|---|---|---|
| F1 | **Fixed.** The single-trade test subtracts the larger of the largest positive entered-trade net and the in-window contribution of a carried-in position (window net minus the entered trades' nets; cash changes only through trades). Unit tests: the reviewer's case (+30,677 from a carried-in position, no profitable entry) now fails. | `stages.ts outOfSampleGate`, `tests/gates.test.ts`, PROTOCOL §8 |
| F2 | **Fixed.** The door (`sealedDoor`, `resolveDates`) moved to the outcome-critical `door.ts`; `fixed` and `compare` run the freeze guard once the freeze exists. | `door.ts`, `cli.ts` |
| minor | §7.3 now says the seeds come from the feasible (G1+G2+G6) vectors; the §4 note moved below the table; `describeNoPick` names G6; the sealed gate summary includes `g6`; `tables.ts` wording; the freeze refuses a parity record that is not clean (any difference, ledger problem, mutation violation or uncaught cheat); the gate stage checks PICKS' stamp and the holdout stage checks the gate's and the final PICKS' stamps. | `PROTOCOL.md`, `stages.ts`, `tables.ts` |
