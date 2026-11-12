# Research recovery checkpoint — New L0 trading-session hold re-optimization (vg-l0-session-hold)

## Top screen

- **Updated:** 2026-11-12T03:25Z (UTC, from the clock). **Status: INCOMPLETE — the protocol is FROZEN (03:24:11Z) and
  committed with this checkpoint; the study chain `chains/chain1.sh` is next (C19 → C21 → C23 → sequential → C24 →
  cross-test → diagnostics → frozen selection (commit) → validation (commit)).**
- **Task:** the user's brief "New L0 Trading-Session Re-Optimization" (`brief/BRIEF.md`, sha256
  `df4856db43331f9054916ac479cebfa7f187c9181c5aa663b0ec2179287c2bd2`, 462 lines, read in full through "Final Priority").
- **Branch:** `research/vg-l0-session-hold` (main checkout), from `a1a9675d`; commits `6eb85160` (Phases 1–2),
  `e3b0ae37` (Phase 3), then the freeze commit (this checkpoint's commit).
- **Authority:** `PROTOCOL.md` sha256 `50e441c33a26ca645692cbca075347e6ac813aff1222342ee27f8fa9bb8c00e3` (frozen
  03:24:11Z); `AMENDMENTS.md` head R2 (`103032c0…`); standard 2.1.0 (`ac5c2c69…`); reference method NL0 1.0.0
  (`9b387bb4…`); `results/protocol-freeze.json` `c2c85256…`; `results/parity/parity.json` `9f6bd2a2…` (705 checks, 0
  failed); `CONTROL_MANIFEST.json` `b2f47d5b…`; evaluation digest `a38174fa…`; Priority 3 digest now `781d7e49…`
  (historical `147cad7c…`, AD12); closure digest `45803fb6…` (266 files).
- **Running:** nothing yet (the chain starts after this commit).
- **Next command:** `R=/home/chad/projects/margin-trading; (cd $R && bash research/vg-l0-session-hold/chains/chain1.sh >
  $R/research/vg-l0-session-hold/results/logs/chain1.log 2>&1; echo "CHAIN EXIT $?" >> $R/research/vg-l0-session-hold/results/logs/chain1.log)`
  in the background; a chain stopped mid-way is relaunched with the same script (sealed stages refuse to rerun, so
  remove the completed steps from a COPY of the script or run the remaining commands from RUN_COMMANDS.md; an
  interrupted stage resumes from its job archive).
- **Do not:** edit `chains/chain1.sh` while it runs (bash reads scripts incrementally — see Disclosures); rerun a sealed
  stage; open FULL before `FROZEN_SELECTION.json` is committed (the guard refuses).

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
| Study chain (C19 → … → validation) | not started | `bash research/vg-l0-session-hold/chains/chain1.sh` | `results/…`, `FROZEN_SELECTION.json` | each stage resumes from its job archive when relaunched with the same command; sealed stages refuse |

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
