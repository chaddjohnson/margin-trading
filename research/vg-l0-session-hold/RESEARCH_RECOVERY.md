# Research recovery checkpoint — New L0 trading-session hold re-optimization (vg-l0-session-hold)

## Top screen

- **Updated:** 2026-11-12T07:11Z (UTC, from the clock). **Status: COMPLETE — every stage sealed (27 records verify);
  report written; committed and pushed (see Push). Follow-up gate: the user's review (nothing starts automatically; New
  L0 stays the frozen benchmark; no replacement, catalog change or deployment).**
- **Task:** the user's brief "New L0 Trading-Session Re-Optimization" (`brief/BRIEF.md`, sha256
  `df4856db43331f9054916ac479cebfa7f187c9181c5aa663b0ec2179287c2bd2`).
- **Branch:** `research/vg-l0-session-hold` (main checkout), from `a1a9675d`.
- **Authority:** `PROTOCOL.md` `50e441c3…` (frozen 03:24:11Z, `6eebe8fc`); `AMENDMENTS.md` head R2; standard 2.1.0
  (`ac5c2c69…`); reference method NL0 1.0.0 (`9b387bb4…`).
- **Outcome:** calendar-day holds remain preferable. A (New L0, cal) development $382,721.46 / validation $96,883.72 /
  full $479,605.18; B (New L0, ses) $340,857.79 / $97,846.00 / $438,703.79 (fails Q3); C (`C24/ses/informed/R3#1
  profit`, cfg `787c566e42550ed4`) $373,676.67 / $88,765.28 / $462,441.95. Frozen labels: B vs A harmful, C vs A
  harmful, C vs B conditional profit/risk trade-off. Session procedure chronologically unsupported (+$25,237.54, DD
  $58,866.62).
- **Deliverables (sha256 prefix):** REPORT.md `a0a7d9b3…` (and `results/tables/*.md`, `summary.json`: unsealed reporting);
  FROZEN_SELECTION.json `b17421ba…`; results/validation/validation.json `f474c421…`; results/folds/sequential.json
  `e36d47c4…`; results/folds/C24/selection.json `f5c6c052…`; results/crosstest/C24/matrix.json `4cc139f6…`;
  results/diagnostics/diagnostics.json `401e40d2…`; results/search/C24/{indep `f4a87868…`, informed `0b5b01db…`};
  results/parity/parity.json `9f6bd2a2…`; results/protocol-freeze.json `c2c85256…`; recovery/original-recovery.json,
  recovery/backward-compat.json; docs/research/methods/NEW_L0_METHOD.md `9b387bb4…`; docs/research/OPTIMIZATION_STANDARD.md
  2.1.0 `ac5c2c69…`; report-only: results/post/strategy-lab-parity.json `f3425ebc…` (5/5 Strategy Lab candidates verified
  after the engine change), results/supplementary/missed-opportunities.json `66a40485…`.
- **Tests:** full `npm test` (unit `vgl0sh-npm-test`, after the validation): 1,475 tests, 1,464 pass, 7 fail = the known
  pre-existing set (6 × `allin-original.ts`, Study 7 data-end), 4 skipped; this study added 39 passing tests.
- **Push:** `git push -u origin research/vg-l0-session-hold` (new remote branch, no force, outside the sandbox, first
  attempt, 2026-11-12T07:11:39Z); `git ls-remote` at 07:11:45Z: branch = `8604463382b2dc74df94a2e968b9952691f2bc26` (=
  local); `origin/main` = `aa5754d4…` (unchanged). This record follows as its own commit, pushed the same way. No merge,
  no deployment. Unit and chain logs (`results/logs/`, git-ignored) and job archives (`.cache/`) are local only.
- **Running processes:** none.
- **Do not rerun:** any sealed stage (they refuse); the validation ran once.

## Stage table

| Stage | Status | Command (repository root) | Output / record | Resume semantics |
|---|---|---|---|---|
| Phase 1 recovery | complete (02:29–02:30Z) | `systemd-run … tools/vg-l0-session-hold/recover-original.ts` (unit `vgl0sh-recover`, 56 s, 641 in-process evaluations on D24) | `recovery/original-recovery.json` (New L0 centre = 5B in 33 fields; 5B confirmation p10 $209,723.47 / p90 DD $30,182.14 and selection robust $227,908.52 reproduced) | rerun is read-only and idempotent |
| Phase 2 method + standard | complete, committed `6eb85160` | — | `docs/research/methods/NEW_L0_METHOD.md` NL0 1.0.0 (`9b387bb4…`), standard 2.1.0 (`ac5c2c69…`), preflight `referenceMethod` check (20 tests pass) | — |
| Phase 3 engine option | complete, committed `e3b0ae37` | `tools/vg-l0-session-hold/backward-compat.ts` (unit `vgl0sh-backcompat2`, 133 s) | `recovery/backward-compat.json`: 1,500 / 1,500 archived 5B L0 records identical; 125 interleavings stable; 5,037 hold exits obey the age invariant; 275 synthetic engine tests pass | — |
| Stage V dry run | complete (03:03–03:05Z, not sealed) | `npm run vg-l0sh -- launch --unit vgl0sh-parity-dry --wait -- parity --dry-run` | log `.cache/vg-l0-session-hold/logs/vgl0sh-parity-dry.log`: 705 checks, 0 failed, 1,338 simulations | rerun freely |
| Bench | complete (03:05–03:07Z) | `bench --door D24 --centres 96 --workers {12,14,16} --label w{12,14,16} --warm 2 --units ses` | `.cache/vg-l0-session-hold/pilot/bench/w*.json`: 95.6 / 96.8 / 95.4 evaluations/s, peak 7.5 / 8.8 / 10.0 GiB → 14 workers | engineering only |
| Pilot | complete (03:07:56–03:21:00Z; resumed once from s4) | `bash research/vg-l0-session-hold/chains/pilot.sh [s4]` | `.cache/vg-l0-session-hold/pilot/`: every stage path passed; `pilot-compare ref straight sigterm wkill unitkill` → identical lane results; logs `.cache/vg-l0-session-hold/logs/pilot-chain*.log` | engineering only |
| Control manifest | sealed 03:14:20Z | `npm run vg-l0sh -- control-manifest` | `CONTROL_MANIFEST.json` `b2f47d5b…` | write-once |
| Stage V | sealed 03:24:03Z | `npm run vg-l0sh -- launch --unit vgl0sh-parity --wait -- parity` | `results/parity/parity.json` `9f6bd2a2…`: 705 checks, 0 failed (G1 8, G2 2 incl. 1,000 archived 5B records identical, G3 48, G4 36, G5 540, G6 32, G7 2, G8 36, G9 1), 1,338 simulations | write-once |
| Protocol freeze | sealed 03:24:11Z | `npm run vg-l0sh -- freeze-protocol` | `results/protocol-freeze.json` `c2c85256…` | write-once |
| C19 search (indep) | complete 03:24:46 → 03:49:41Z (24.9 min), sealed, committed `9636812e` | chain1 | `results/search/C19/indep.json`: 28,928 proposals, 65 islands, 4 extension rounds then triggers not met, 4,884 refinement moves, 304,047 requested, 313,462 fresh, 2,695 hits | sealed: refuses |
| C19 qualify | complete 03:49:41 → 03:53:09Z, sealed, committed `9636812e` | chain1 | `results/folds/C19/selection.json`: 60 members, 59 qualified; fold primary `C19/ses/indep/R6/V1#1 profit` $123,812.69; 39,060 fresh | sealed: refuses |
| C19 cross-test + fold | complete 03:53Z, committed `fbb55417` | chain1 | slice 2020–2021: fold primary +$45,828.28 (slice DD $55,449.12); New L0 cal $171,402.70 / ses $159,766.65 | sealed |
| C21 search, qualify | complete 03:53:39 → 04:29:49Z, committed | chain1 | 26,880 proposals, 276,504 requested, 286,101 fresh (31.6 min); 60/60 qualified; fold primary `C21/ses/indep/R1/V3#1 profit` $240,514.68 | sealed |
| C21 cross-test + fold | complete 04:30:29Z, committed `00a65a96` | chain1 | slice 2022–2023: fold primary −$25,018.62 (DD $57,489.79); New L0 cal $87,238.48 / ses $85,660.40 | sealed |
| C23 search, qualify, cross-test, fold | complete 04:30:29 → 05:14:44Z, committed `8bc749cd` | chain1 | 31,488 proposals, 252,267 requested, 261,553 fresh (37.2 min, 5 extension rounds); 59/60 qualified; fold primary `C23/ses/indep/R5/V2#1 profit` $201,920.45; slice 2024: +$4,627.88 (DD $20,299.72); New L0 cal $44,110.10 / ses $15,460.57 | sealed |
| Sequential | complete 05:14:45Z, committed `baeffe09` | chain1 | `results/folds/sequential.json`: session procedure +$25,237.54, sequential DD $58,866.62 — **chronologically unsupported**; same selections under cal +$75,529.19 / $47,761.66 (cross row); New L0 fixed: ses $260,887.62 / $23,473.39, cal $302,751.28 / $19,459.83 (descriptive) | sealed |
| C24 independent search | complete 05:14:45 → 06:00:29Z (45.7 min), sealed (committed with the C24 qualification) | chain1 | 33,024 proposals, 271,412 requested, 280,575 fresh, 5 extension rounds; best shortlisted centre `C24/ses/indep/R3/V3` profit $247,744.92 | sealed |
| C24 informed search | complete 06:00:29 → 06:48:54Z (48.4 min), committed `d589a842` | chain1 | 12,570 proposals (6 × 559 designs + 6 × 4 × 384), 11,605 refinement moves, 355,437 requested, 239,309 fresh, 116,113 hits; extension stopped by the resource guard (192,938 + 13,056 + 180,000 > 370,000: budget-bound) | sealed |
| C24 qualify | complete 06:48:54 → 07:01:36Z, committed `d589a842` | chain1 | 98 selectable / 110 members; **primary C `C24/ses/informed/R3#1 profit` $373,676.67 / DD $20,374.21** (conf p10 $203,987.88, p90 DD $27,574.23); independent primary `C24/ses/indep/R3/V3#1 profit`; A (cal NL0) $382,721.46 qualified; B (ses NL0) $340,857.79 fails Q3 (p90 $37,684.14); every control fails Q3 under ses; 65,745 fresh | sealed |
| C24 cross-test + diagnostics | complete 07:01:36 → 07:04:29Z, committed `6831518f` | chain1 | `results/crosstest/C24/matrix.json` (7,730 fresh), `results/diagnostics/diagnostics.json` (657 in-process simulations) | sealed |
| Frozen selection | sealed 07:04:30Z, committed `8ae00df8` before FULL | chain1 | `FROZEN_SELECTION.json`: C, A, B, roles, labels B vs A harmful, C vs A harmful, C vs B conditional trade-off | sealed |
| Validation (FULL, once) | complete 07:04:30 → 07:05:17Z, committed `59b68357` | chain1 | `results/validation/validation.json`: 37/40 rows pass V1–V3; known targets (New L0, C4, C4-refined, D, VG #2 native) reproduced exactly; 72 in-process + 512 neighbour simulations | sealed; ran once |
| Post-validation (report-only) | complete 07:05–07:13Z | `tools/vg-l0-session-hold/missed.ts`; `apps/strategy-lab/scripts/portfolio-parity.ts --out results/post/strategy-lab-parity.json`; FULL calendar check (both files: 2,723 sessions, 0 non-NYSE dates, 0 missing sessions); `tools/vg-l0-session-hold/tables.ts`; full `npm test` | see the top screen | idempotent | `bash research/vg-l0-session-hold/chains/chain1.sh` | `results/…`, `FROZEN_SELECTION.json` | each stage resumes from its job archive when relaunched with the same command; sealed stages refuse |

## Environment

- Node 24.21.0 (`.node-version`), absolute path `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`;
  16 logical CPUs; 59 GiB RAM visible. Canonical data `data/VGT/data.csv` `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049` (Priority 3's pins; verified by stage V's door loads).
- Containment: slice `vgl0sh.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) via `npm run vg-l0sh -- launch`.

## Phase 1–3 findings (written into `recovery/` and `docs/research/methods/NEW_L0_METHOD.md`)

- New L0 primary = Priority 5B (`research/vg-lifecycle-matched-optimization/`) `C24/L0/informed/R1#1 profit`, cfg
  `67cfdd9b62d1e16f`, Priority 3 quad `a2e385640ca61012`; structure V (D1·GDX + D1·VGT + Growth·VGT; Growth·GDX OFF).
- It was an NSGA-II island child of the informed lane L0 R1 (not one of the 481 seed designs: regenerated with 5B's
  code), the lane's highest feasible rung-3 centre; its profit refinement start found no move gaining ≥ $2,000.
- It is a close relative of 3B's formal primary `informed-joint#1` (`940fdaf770eedc9d`, an informed seed of 5B):
  D1·GDX P 157→152, W 12→10; D1·VGT X 238→237, stop 74→73, W 52→41; Growth·VGT recovery confirmation 4→5, classic
  rebound 2.6→3.01; development +$557.67.
- Hold semantics today: D1 (`src/shared-margin-portfolio/strategy.ts` ExitManager) and Growth
  (`src/growth-trading/optionalRules.ts` evaluator, and the same ExitManager through `exitParamsOf`) compute
  `(sTime[s] − holdTimestamp) / 86,400` calendar days; the hold gates the maximum-hold loss exit at the open and the
  buffered intraday loss.

## Disclosures

- **A checkpoint timestamp was first written ahead of the clock** ("07:13Z" before 07:12Z); corrected to the clock time
  when the push was recorded.
- **Pilot interruption by a protocol edit (engineering only, 03:13Z).** The R1 edit of the draft protocol changed its
  sha256 while the straight pilot was running; the pilot's cross-test step then refused to start (preflight: mismatched
  protocol hash), exactly as the guard intends. The protocol was re-adopted (`readopt`, 03:13:30Z) and the pilot resumed
  from s4; s1–s3 (sealed pilot records in the cache) were not rerun. No study stage existed.
- **A running script was edited (engineering only, 03:17Z).** `chains/pilot.sh` was edited while bash executed it; bash
  read one garbled fragment (`line 38: -pilot: command not found`, harmless) and resynchronized; every pilot step ran and
  the identical-lane check passed. The `expect_stop` helper logged `exit 0` for the interrupted runs because `$?` was
  read after a `$(date)` substitution; the job logs show the real outcomes (exit 75 stop; worker SIGKILL failure; unit
  SIGKILL). Fixed in the script for later use. The study chain is never edited while it runs.
- **Search refactor before the freeze (03:14Z).** The refinement-start rule was extracted into the pure, unit-tested
  `refinementStarts` (search.ts; behaviour-preserving). The pilot's straight independent search ran the previous text;
  its interruption runs the new one, so `pilot-compare … straight …` checks the equivalence.
