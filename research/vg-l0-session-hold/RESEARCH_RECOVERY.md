# Research recovery checkpoint — New L0 trading-session hold re-optimization (vg-l0-session-hold)

## Top screen

- **Updated:** 2026-11-12T03:05Z (UTC, from the clock). **Status: INCOMPLETE — Phases 1–2 complete (recovery,
  development reproduction, reference method NL0 1.0.0, standard 2.1.0) and committed; Phase 3 (session-hold engine
  option) next.**
- **Task:** the user's brief "New L0 Trading-Session Re-Optimization" (`brief/BRIEF.md`, sha256
  `df4856db43331f9054916ac479cebfa7f187c9181c5aa663b0ec2179287c2bd2`, 462 lines, read in full through "Final Priority").
- **Branch:** `research/vg-l0-session-hold` (main checkout), from `a1a9675d` (end of Priority 7A).
- **Authority:** the brief; `docs/research/OPTIMIZATION_STANDARD.md` 2.0.0 (read in full 2026-11-12T02:20Z); the
  protocol does not exist yet.
- **Running processes:** none.
- **Phase 1 record:** `recovery/original-recovery.json` (tool `tools/vg-l0-session-hold/recover-original.ts`, unit
  `vgl0sh-recover`, 56 s, 641 in-process evaluations on D24): New L0's centre = 5B's sealed record in all 33 fields;
  5B's confirmation and selection statistics reproduced to the cent. FULL not opened.
- **Phase 2:** `docs/research/methods/NEW_L0_METHOD.md` NL0 1.0.0 (registry `docs/research/methods/methods.versions.json`);
  standard 2.1.0 (§3.5, §4.8; registry updated; preflight checks a declared `referenceMethod` pin; 20 preflight tests
  pass).
- **Next step:** Phase 3 — the explicit trading-session hold option in the engine, its tests, and the
  calendar-default backward-compatibility verification against archived 5B records.

## Findings so far (on disk in the sources named; to be written into `recovery/` and the method document)

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

- None yet.
