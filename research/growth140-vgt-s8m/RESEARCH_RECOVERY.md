# Research recovery checkpoint — growth140-vgt-s8m (Growth 1.4.0 VGT, Study 8–style, memory-bounded)

## Top screen

- **Updated:** 2026-11-07T13:01Z (UTC, from the clock). **Status: INCOMPLETE.**
- **Current stage:** 6 — selection FROZEN 13:01:40Z (`FROZEN_SELECTION.json` sha256
  `0064deba9f371863b2e5a1626a3c004bc016149a4d3430ad6b8a583a94e19bce`, chmod 444); committing it, then `validate`
  (the full door has not been opened). Search complete 12:58:51Z (`results/search/search.json` `222ccf50…fc26`);
  qualification complete 13:01:18Z (`results/qualify/qualify.json` `b2e505b9…03e8`). Primary candidate:
  `ec124684b6466d77` (profit role, rank 1, tier modest).
- **Authority:** `PROTOCOL.md` sha256 `ae3bfa41d5c264c3e1ebba99a8631636d548f19ef0c98ef53ec08fc53a47bac6`;
  `results/protocol_freeze.json` `0200033cb9605e9b9f4f642cad43b241546dbaec77feb6070eba26cdc952810a`; code closure
  `2da66c39e229d6c1ab7298aa589ee6201b8f5db2499ba3d48f19e9c12162fcc6` (108 files), engine digest `5ec0cc7e…7d8e`;
  `AMENDMENTS.md` `2ea1f402…1ae7` (no amendments); brief `brief/BRIEF.md` `9146b7f0…21c2`.
- **Running processes:** none.
- **Next commands:** commit and push the frozen selection; then
  `npm run -s growth140-s8m -- launch --unit growth140-s8m-validate --wait -- validate --workers 12` (once; a stopped run
  is resumed by the same command, which reuses its archive).
- **User instruction 2026-11-07 ≈11:05Z:** MemoryHigh=44G, MemoryMax=48G permitted (replaces the brief's 20G/24G).

## Environment

- Repository `/home/chad/projects/margin-trading` (main checkout; no other worktree). Branch
  `research/growth-vgt-study8`, based on `7c7bcab` (the user's revert of the failed attempt `dd2f07f`).
- Node 24.21.0 at `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node` (systemd units need
  the absolute path; `process.execPath` is used). systemd 259; user manager with memory/cpu/pids delegated.
- Host: Ryzen 7 9800X3D, 8 cores / 16 threads; MemTotal 62,313,736 kB; swap 8 GB fully used by other workloads
  (vLLM ≈ 3.6 GB swapped, mongod).
- Study namespace: `research/growth140-vgt-s8m/`, `src/growth140-vgt-s8m/`, `tools/growth140-vgt-s8m/` (post-freeze
  report helper, outside the pinned closure), cache `.cache/growth140-vgt-s8m/` (git-ignored: dev prefix file, job
  archives, pilot outputs).

## Data

- `data/VGT/data.csv` sha256 `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` (935,608 rows,
  2016-01-04T13:00Z → 2026-10-30T23:59Z). Development prefix `.cache/growth140-vgt-s8m/dev/VGT-dev.csv`: 743,918 rows,
  42,469,694 bytes, sha256 `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb`, last row
  2024-12-31T21:11Z (rebuild: `npm run growth140-s8m -- build-dev`).
- `data/partitions.json` `43893f3d…a6`, `config/market-events/splits.json` `e5bde427…a2`.

## Stage table

| Stage | Command (repo root) | Status | Output | Resume semantics |
|---|---|---|---|---|
| Probes, fixture tests | scratchpad / units test1, test2a/b | complete (engineering) | MEMORY.md §2 | — |
| Pilot A–F | `npm run growth140-s8m -- pilot` | complete 11:37Z (16.7 min) | `results/pilot/pilot-driver.json`; B/C/D/E identical to A | — |
| Pilot F′ parity | `launch … parity --pilot --job pilot-parity-b` | complete 11:38Z, PASSED | `results/pilot/pilot-parity-b.json` | — |
| Pilot A3/G restart | `pilot2`, units a2u/a3c/a3d | complete 11:44Z, identical | `results/pilot/pilot-restart-checks.json` | — |
| Protocol freeze | `freeze-protocol` | complete 11:47:25Z | `results/protocol_freeze.json` | write-once |
| P1 parity | `launch --unit growth140-s8m-parity -- parity --workers 4` | complete 11:49:23Z, PASSED | `results/parity/parity.json` | write-once (rerun only by amendment) |
| Search | `launch --unit growth140-s8m-search -- search --job search --workers 12` | complete 12:58:51Z (69 min, 427,894 fresh, peak 8.38 GiB) | `results/search/search.json`, archive `.cache/growth140-vgt-s8m/jobs/search/` | `--resume` from checkpoint (exact) |
| Qualify | `launch --unit growth140-s8m-qualify -- qualify --workers 12` | complete 13:01:18Z (6 qualified; roles profit/robust/balanced/extra1) | `results/qualify/qualify.json` | rerun same command (archive) |
| Freeze selection | `freeze-selection`, then commit | complete 13:01:40Z | `FROZEN_SELECTION.json` (444) | write-once |
| Validate | `launch --unit growth140-s8m-validate -- validate --workers 12` | not started | `results/validation/validation.json` | rerun same command (archive); door once |

## Search progress (from the log and checkpoint)

- Screen 11:53:03Z: 16,384 distinct configurations, 3,142 plausible, 2,560 promoted (≈ 87 evaluations/s, 12 workers).
- Rung 1 on the screen 12:00:49Z: 0/2,560 feasible (every one fails C5 median ≥ $10k/yr; 99% C7 top trade ≤ 25%).
- Island 0 12:14:22Z: 32 generations, 5,120 new, stop budget, hv 1.434e8, 1,645 rung-1 feasible.
- Islands 1–3: 1,382 / 865 / 1,470 rung-1 feasible; T1 not fired (4 islands); archive 23,040 configurations, 5,362
  rung-1 feasible; rung 2 112/192 feasible; rung 3 47/48; refinement accepted no move; T2 fired (8 re-scored).
- Memory: cgroup peak 8.38 GiB (memory.peak), workers ≤ 710 MiB, coordinator ≤ 371 MiB, no memory events.

## Memory diagnosis (summary; MEMORY.md has the detail)

- Incident: global OOM 10:26:09 UTC (11:26:09 CET) of PID 388644 = the failed attempt's
  `node … src/growth-vgt-study8/main.ts search` (14 worker threads), ≈ 27 s after its door opened, anon-rss 55.9 GB.
- Mechanism measured: ≈ 28 MB of ArrayBuffers per canonical run, not bounded by V8 old-space limits (one worker
  thread with `maxOldGenerationSizeMb: 3072` reached 5.3 GB ArrayBuffers / 6.9 GB RSS); `gc()` cadence bounds it.
- Pilot: ≈ 0.5 GiB per added worker; 12 workers peak 6.52 GiB; no memory events; swap 0. Pressure threshold 16 GiB.

## Guards

- Do not rerun completed pilot phases; do not reuse any pilot archive or the failed attempt's anything.
- Never read 2025–2026 bars before `FROZEN_SELECTION.json` is committed; the full door opens only in `validate`.
- #4 is a fixed control only (never seeds, ranges or refinement starts).
- Leave `state/strategy-lab/`, `apps/strategy-lab/dist` and the browser untouched.
- Do not run the full `npm test` (it reads all data) before validation; run `src/growth140-vgt-s8m/tests/` only.
- After the freeze: `PROTOCOL.md` is never edited; code changes need an AMENDMENTS.md entry and `acknowledge-code`.

## Disclosures

- The pilot and probes opened the development door before the freeze (engineering figures only; pilot outputs with
  development figures of pilot configurations stay unread in `.cache/growth140-vgt-s8m/pilot-out/`).
- Pilot F's first run (`results/pilot/pilot-parity.json`) differed only in the ISO time format of trade rows; fixed in
  `engine.ts` (`…:00Z`) before F′, A3 and G. Phases A–E ran on code that differs from the frozen code only by that
  format, the qualification stop hook, the validation pilot mode, a refactor of the carried-in split and the 16 GiB
  pressure default (none changes an evaluation).
