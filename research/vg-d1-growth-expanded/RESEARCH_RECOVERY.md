# RESEARCH RECOVERY — Priority 3B: larger VGT + GDX D1/Growth pooled search with C4 as the preferred benchmark

## Top screen

- **Updated:** 2026-11-09T18:35Z (UTC, from the clock). **Status: INCOMPLETE** — about to freeze the protocol. Pilot
  complete (every path; interruption tests identical), engineering gates sealed (`results/parity/parity.json`
  `49b203c5…c799`: 233 checks, 0 failed), control manifest sealed (`CONTROL_MANIFEST.json` `2ed9cec0…41dc`).
- **Task:** `brief/BRIEF.md` (sha256 `803df2048c5443ebf7c8918caec7603d8cc9f1908082336d52a1685c870e4188`, 190 lines, read in
  full). Backend only; L0 only; one exclusive funded slot; C4 = preferred benchmark and fallback.
- **Branch:** `research/vg-d1-growth-expanded` (main checkout, no worktree), from `8c20f855`.
- **Authority:** `PROTOCOL.md` (re-adopted 2026-11-09T18:33:20Z, sha `79494d1e67d7…`), `AMENDMENTS.md` (R1–R4),
  `STANDARD_ADOPTION.json` (standard 2.0.0 `2005a88c…0105`, scope optimization); preflight PASS.
- **Running processes:** none.
- **Next steps:** commit (pre-freeze) → `npm run vg-exp -- freeze-protocol` → commit the freeze → launch the study chain
  as unit `vgexp-chain` (`RUN_COMMANDS.md`) → while it runs: report drafting; after it: diagnostics →
  freeze-selection → commit → validate → tables → report → full npm test (contained, PATH set) → commit and push.

## Environment

- Repository root `/home/chad/projects/margin-trading`; Node v24.21.0 at
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`; host 8 cores / 16 threads, 59 GiB.
- Canonical data unchanged (verified 2026-11-09 by `npm run vg-exp -- doors`): VGT `2ee06310…412e`, GDX `77dba9b2…5049`,
  both ending 2026-10-30T23:59Z; doors = Priority 3's pinned prefixes in `.cache/vg-d1-growth-joint/doors/`.
- Code: `src/vg-d1-growth-expanded/` (`npm run vg-exp -- <command>`): context, config (space), fitness, search, budgets,
  controls, lab/workers/worker, stages, folds, qualify, parity, diagnostics, final, freeze, doors, launch, bench,
  commands, main; tests `tests/config.test.ts` (18 pass). Reuses Priority 3's engine unchanged (evaluation digest
  `147cad7c…4e88`), 5A's subject loader and archived-instrument reconstruction, 3A's observer and tail statistics.

## Pilot and bench (engineering only; cache `.cache/vg-d1-growth-expanded/pilot/`)

- Bench (D24, rung-1 mix of random configurations of every cell, 3,264 evaluations, after warm-up): 8 workers 75.8/s
  (5.1 GiB), 12 → 77.6 (7.7 GiB), 14 → 78.7 (8.9 GiB), 16 → 78.5 (10.2 GiB); 16 with book cache 256 → 78.1; 16 with
  GC every 32 → 73.8. **Chosen: 14 workers, GC 64, cache 48.** Only 3 of 192 random centres were plausible.
- Pilot p1 (old trigger key; superseded) and ref: P18 independent search (8 lanes concurrently, 52,975 fresh, 4 min,
  peak 6.9 GiB); informed search (20,566 fresh, 1.7 min); qualification running.

## Decisions written into the draft protocol

- Inclusion choice V/G/B; 8 independent cells (V 25%, G 25%, B 50%); same-instant order fixed D1-first (AD2);
  centre-first fidelity (AD7); protected both-Growth stratum (AD4); fresh confirmation decides qualification, the
  archived Priority 3 instrument is report-only (§8.5); budgets 131,072 base / 196,608 cap per independent cutoff (AD9);
  informed fixed-D1 and joint lanes at C24; C4 labels + replacement candidate + prudent-recommendation rule (§9.4).
- Pre-freeze protocol changes so far (to be listed as R amendments): R1 the extension trigger's "new behaviour" became a
  new funded-component pattern in the cell (the pilot showed the gate × eligibility × funded key fired on combinatorics
  alone); R2 the declaration that diagnostics/frozen-selection/validation/table code may be completed after the freeze
  (§14); R3 the archived instrument also runs at the pilot's P18 (code only).

## Do not rerun / guards

- Never modify `src/vg-d1-growth-joint/`, `src/vg-d1-growth-diagnostic/`, `src/vg-growth-funding-lifecycle/` or any
  completed study's records. Pilot jobs always carry `--pilot NAME` (job names `pilot-NAME-…`).
