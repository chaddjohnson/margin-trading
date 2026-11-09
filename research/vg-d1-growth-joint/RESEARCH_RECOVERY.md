# RESEARCH RECOVERY — Priority 3: VGT + GDX, D1 + Growth in one shared $100,000 pool

## Top screen

- **Updated:** 2026-11-09T03:21Z (UTC, from the clock). **Status: INCOMPLETE — stage 4 (the study chain is RUNNING: the folds
  C19–C23 and the sequential verdict are sealed and committed; C24 arm D running).**
- **Brief:** `research/vg-d1-growth-joint/brief/BRIEF.md`, sha256
  `4554b859e71eda0cbb66ba8dc2c085ab38c208c6facff9fd8fb7c2a03513aac7` (210 lines, read in full through Appendix A).
  Authorizes implementation, research, the CLAUDE.md delivery instruction, commit and push of this branch without
  routine confirmation (no merge, no deploy, no force-push).
- **Branch:** `research/vg-d1-growth-joint` (main checkout), from `d61e6bea`. Commits so far: `1c867708` (engine,
  parity harness, tests, sealed control manifest).
- **Authority:** `PROTOCOL.md` (draft; adopted in `STANDARD_ADOPTION.json` at 2026-11-08T23:39:07Z with sha256
  `b3f30793…9898`; any later edit before the freeze must re-adopt: update `protocol.sha256`/`adoptedAt` and add an
  `R*` entry to `AMENDMENTS.md`). Standard 1.0.0 (`8c38ac15…639d`). Preflight PASS at 23:39Z.
- **Frozen:** `results/protocol-freeze.json` sha256 `69d30c4183850698b138b1d9f168d7704c0ef83a6709f205b8829867090eb704`
  (2026-11-09T00:16:54Z; protocol `f9f8b79a…cbfc8`; evaluation digest `147cad7c…4e88` = the sealed parity's; closure
  225 files, digest `f7fc49aa…e69b`; gitHead `6cf50085`), committed `634c75a0`. O1 (chain as a unit) committed
  `6d528c9d`. Parity sealed 495/0 (00:15:59Z). Pilot PASSED (`results/pilot/PILOT.md`).
- **Running:** the study chain, systemd user unit **`vgjoint-chain`** (started 2026-11-09T00:17:13Z;
  `/bin/bash research/vg-d1-growth-joint/chains/study.sh`), log `results/logs/study-chain.log`. It launches one heavy
  unit at a time (`vgjoint-search-<C>-<arm>`, `vgjoint-qualify-<C>`, `vgjoint-eval-<C>`, `vgjoint-sequential`,
  `vgjoint-qualify-gpair-C24`, `vgjoint-diagnostics`; logs `results/logs/<unit>.log`) and COMMITS the fold selections
  and C24 records itself (do not write the git index while it runs: use `git --no-optional-locks status`). It ends with
  `CHAIN-DONE` or `CHAIN-FAILED at …`. Check: `systemctl --user list-units 'vgjoint-*'`; `tail
  results/logs/study-chain.log`; a job's progress: `.cache/vg-d1-growth-joint/jobs/<job>/progress.json`.
  **If the chain unit died but a stage unit still runs, do not relaunch; wait. To resume after a failure: fix, then
  relaunch the same systemd-run command (it skips stages whose sealed record exists; an interrupted search resumes
  from its archive).**
- **Chain launch command (for a resume):** `systemd-run --user --unit=vgjoint-chain --collect -p KillMode=mixed -p
  StandardOutput=append:/home/chad/projects/margin-trading/research/vg-d1-growth-joint/results/logs/study-chain.log -p
  StandardError=append:/home/chad/projects/margin-trading/research/vg-d1-growth-joint/results/logs/study-chain.log
  --working-directory=/home/chad/projects/margin-trading /bin/bash
  /home/chad/projects/margin-trading/research/vg-d1-growth-joint/chains/study.sh`
- **Next steps (in order):** (1) wait for `CHAIN-DONE` (≈ 5–7 h); (2) by hand: `npm run vg-joint -- launch --unit
  vgjoint-freeze-selection --wait -- freeze-selection`, inspect `FROZEN_SELECTION.json`, COMMIT it with seals.jsonl;
  (3) `npm run vg-joint -- launch --unit vgjoint-validate --wait -- validate --workers 15`, commit; (4) tables
  (`tools/vg-d1-growth-joint/tables.ts`), REPORT.md, ROADMAP, full npm test (contained unit), memory notes; commit;
  push (CLAUDE.md delivery instruction; `git push origin research/vg-d1-growth-joint` outside the sandbox, verify with
  `git ls-remote`).

## Stage table (the study chain; sealed records, `npm run vg-joint -- verify` rechecks them)

| Stage | Unit | Time (UTC) | Record | Commit |
|---|---|---|---|---|
| C19 arm-D search | vgjoint-search-C19-indep | 00:17 → 00:56 (39 min) | results/search/C19/indep.json | 686e9075 |
| C19 qualification | vgjoint-qualify-C19 | 00:56 → 00:59 | results/folds/C19/selection.json (15/15 qualified) | 686e9075 (before the slice) |
| C19 fold evaluation | vgjoint-eval-C19 | 00:59 | results/folds/C19/evaluation.json | (next chain commit) |
| C21 arm-D search | vgjoint-search-C21-indep | 00:59 → 01:54 (55 min) | results/search/C21/indep.json | dc611c07 |
| C21 qualification | vgjoint-qualify-C21 | 01:54 → 01:58 | results/folds/C21/selection.json | dc611c07 (before the slice) |
| C21 fold evaluation | vgjoint-eval-C21 | 01:58 | results/folds/C21/evaluation.json | 99d8d161 |
| C23 arm-D search | vgjoint-search-C23-indep | 01:58 → 03:14 (76 min; 350,673 fresh) | results/search/C23/indep.json | 1eb54415 |
| C23 qualification | vgjoint-qualify-C23 | 03:14 → 03:19 | results/folds/C23/selection.json | 1eb54415 (before the slice) |
| C23 fold evaluation, sequential | vgjoint-eval-C23, vgjoint-sequential | 03:19 | results/folds/C23/evaluation.json, results/folds/sequential.json | 99d8d161 |
| C24 arm D → arm B → B selection → arm C → qualification → diagnostics | chain | from 03:19 | — | — |

**Sealed chronological verdict (arm D): chronologically UNSUPPORTED** — fold primaries C19 `GDX-rise_VGT-breakout#1
profit`, C21 `GDX-breakout_VGT-breakout#1 profit`, C23 `GDX-rise_VGT-rise#1 profit`; slices −$29,723 / −$33,880 /
+$2,258; sequential net −$61,544.61, sequential minute DD $102,257.90. Every role's sequence also lost and breached.

Resume semantics: a search or qualification interrupted mid-stage resumes from its job archive when the same command
reruns (identical result, pilot-tested); a sealed stage refuses to rerun; the chain skips sealed stages.

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
