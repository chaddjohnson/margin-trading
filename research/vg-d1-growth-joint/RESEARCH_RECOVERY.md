# RESEARCH RECOVERY — Priority 3: VGT + GDX, D1 + Growth in one shared $100,000 pool

## Top screen

- **Updated:** 2026-11-09T00:18Z (UTC, from the clock). **Status: INCOMPLETE — stage 3 (pilot PASSED; parity SEALED 495/0;
  protocol final, re-adopted; about to freeze and launch the study chain).**
- **Brief:** `research/vg-d1-growth-joint/brief/BRIEF.md`, sha256
  `4554b859e71eda0cbb66ba8dc2c085ab38c208c6facff9fd8fb7c2a03513aac7` (210 lines, read in full through Appendix A).
  Authorizes implementation, research, the CLAUDE.md delivery instruction, commit and push of this branch without
  routine confirmation (no merge, no deploy, no force-push).
- **Branch:** `research/vg-d1-growth-joint` (main checkout), from `d61e6bea`. Commits so far: `1c867708` (engine,
  parity harness, tests, sealed control manifest).
- **Authority:** `PROTOCOL.md` (draft; adopted in `STANDARD_ADOPTION.json` at 2026-11-08T23:39:07Z with sha256
  `b3f30793…9898`; any later edit before the freeze must re-adopt: update `protocol.sha256`/`adoptedAt` and add an
  `R*` entry to `AMENDMENTS.md`). Standard 1.0.0 (`8c38ac15…639d`). Preflight PASS at 23:39Z.
- **Running:** nothing. The pilot chain finished `PILOT-DONE` at 00:14:06Z (`results/pilot/PILOT.md`); parity sealed
  `results/parity/parity.json` at 00:15:59Z (495 checks, 0 failed).
- **Next steps (in order):** (1) pilot passes → write `results/pilot/PILOT.md` (timings, memory, equality booleans);
  (2) seal parity: `npm run vg-joint -- launch --unit vgjoint-parity --wait -- parity` (must be 0 failures on the
  final code); (3) final protocol touches → re-adopt → preflight; (4) `freeze-protocol` and COMMIT; (5) launch
  `chains/study.sh` (log `results/logs/study-chain.log`); (6) by hand: freeze-selection, inspect, commit, validate,
  commit; (7) report, roadmap, tests, memory, commit, push.

## Environment

- Host apollo (AMD Ryzen 7 9800X3D, 8 cores / 16 threads, 59 GiB RAM visible, swap full from other workloads).
- Node v24.21.0 (`.node-version`); absolute path for units:
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node` (main.ts `launch` uses process.execPath).
- Canonical data (git-ignored): `data/VGT/data.csv` sha256 `2ee06310…412e`, `data/GDX/data.csv` sha256
  `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049`; both 2,723 sessions 2016-01-04 → 2026-10-30.
- Doors: `.cache/vg-d1-growth-joint/doors/{GDX,VGT}-D{19,21,23,24}.csv` (pins in `src/vg-d1-growth-joint/context.ts`).
- Working tree: study files under `research/vg-d1-growth-joint/` and `src/vg-d1-growth-joint/`, `package.json`
  (`vg-joint` script), `CLAUDE.md`/`AGENTS.md`/`docs/claude/context-recovery.md` (the delivery instruction). Nothing
  else changed.

## Sealed / fixed so far

- `CONTROL_MANIFEST.json` sha256 `0f40efd76aec8ec10a504fb2cf508891a572061df51db065363a910fb68adaa1` (sealed
  2026-11-08T23:09:00Z, committed `1c867708`) — before any pooled result of a combined control.
- `fixtures/controls.json` sha256 `6659569e…dffa`.
- Appendix A identity `07cac3329fc7a520` (transcription mapping; no backend archive; its full-history target is
  compared at validation only).

## Engineering facts (measured)

- Dry parity (`.cache/vg-d1-growth-joint/parity-dry/dry1-*.json`, pre-format code): 495 checks, 0 failed. VG #2 native
  D24 = $260,223.13 / $17,280.74 / 36 lots / 14 refusals (= Study 8 sealed); harmonized $268,487.02 / $20,801.07 / 45
  lots (first entry 2016-12-19); Priority 2 sealed VGT combos reproduced to the cent.
- Tests: `tests/pool.test.ts` 11/11, `tests/space.test.ts` 9/9.
- Bench (`.cache/vg-d1-growth-joint/pilot/bench.jsonl`; PROTOCOL §13.4): ≈ 50 evaluations/s at 12–16 workers with GC
  every 8; 64.3/s at 15 workers with GC every 64 (9.5 GiB peak). Chosen: 15 workers, GC 64 (AMENDMENTS R1).

## Guards

- Do not run any study stage before `results/protocol-freeze.json` is sealed and committed (the runner refuses).
- Do not open FULL before `FROZEN_SELECTION.json` is committed (the door refuses without the guard).
- Never edit `CONTROL_MANIFEST.json` or any sealed record.

## Disclosures (so far)

- The dry parity computed the Growth controls (Appendix A included) alone on D19/D24 and VG #2's D1 pair (known
  incumbents); no combined control was evaluated before the manifest was sealed.
- The pilot evaluates controls and combined controls on development doors with pilot budgets (cache outputs; only
  timings, memory, counts and equality booleans are read).
