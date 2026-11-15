# RESEARCH_RECOVERY — Assignment 3: New L0 risk-aware successor, full joint optimization

## Top screen

- **Updated (UTC):** 2026-11-15T18:46Z (from `date -u`).
- **Status:** **INCOMPLETE.** Stage: **the study chain is running** (`chains/chain1.sh` as unit `vgl0fj-chain1`, started
  2026-11-15T13:27:08Z). **C19 complete** (selection committed `cdd37dc2`, fold evaluation `3d489a73`, 13:27Z → 18:44Z);
  C21 Track I `broad1` (step `c201`) started 18:44:15Z. Protocol FROZEN; stage V sealed (0 failed).
- **Authority:** brief `brief/BRIEF.md` `5620330a…`; protocol `PROTOCOL.md` **`ec9de0d623e3…`** frozen by
  `results/protocol-freeze.json` (`869ae1a7e68052e0fc210230a51d1400a8838ac0913131d36cf93137af97b739`, commit `2a56e9b6`,
  2026-11-15T13:26:59Z); amendments R1, R2 (both before the freeze), no post-freeze amendment; standard 2.2.0
  (`0085cff2…`), NL0 1.0.0 (`9b387bb4…`). Evaluation digest `2aeeee42decc…`, decision digest `fbf9fc671883…`.
- **Running processes:** `vgl0fj-chain1.service` (the chain; log `research/vg-l0-full-joint/results/logs/chain1.log`);
  it launches one stage unit at a time (`vgl0fj-<C>-<step>`, log `results/logs/<unit>.log`, memory
  `results/memory/<job>.jsonl`). Check: `systemctl --user is-active vgl0fj-chain1`; `tail results/logs/chain1.log`.
- **Next step:** wait for the chain (expected ≈ 50 h: C19 ≈ 6 h, C21 ≈ 8 h, C23 ≈ 11 h, C24 Track I ≈ 12 h + Track N
  ≈ 12 h, then the frozen selection and FULL once; C19 broad1 ran at ≈ 196 fresh/s, 6.7 GiB). The report-only tooling is
  written and committed (`934a8c5a`, `tools/vg-l0-full-joint/`: analyses, replays, tail, tables; dry-tested on the
  pilot's records with `VGL0FJ_TOOLS_DIR=<pilot dir> VGL0FJ_TOOLS_CUTS=P18`). After the validation: `analyses.ts all`,
  `replays.ts folds`, `replays.ts finalists`, `replays.ts ledgers`, `tail.ts`, `tables.ts`, then REPORT.md.
- **If the chain stopped:** read the last `start [id]` / `end [id] … exit` lines; a non-zero step left a resumable
  archive. Resume with the SAME command from that step (never edit `chain1.sh` while it runs):
  `R=/home/chad/projects/margin-trading; systemd-run --user --unit=vgl0fj-chain1b --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" -p StandardOutput=append:$R/research/vg-l0-full-joint/results/logs/chain1.log -p StandardError=append:$R/research/vg-l0-full-joint/results/logs/chain1.log --working-directory=$R /bin/bash $R/research/vg-l0-full-joint/chains/chain1.sh <step id>`
  (a sealed stage refuses to rerun; an interrupted job replays its archive exactly; exit 75 = a requested stop, e.g. the
  36 GiB pressure threshold).

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree), branch `research/vg-l0-full-joint` from
  `73d3a748` (the verified tip of `research/vg-l0-risk-families` = its remote; contains `main` = `108c241b`, untouched).
- Commits: `8b762e6e` pre-registration draft; `bcc166d4` stage V sealed + test report; `45a47409` protocol final draft;
  `2a56e9b6` freeze; `f7b58ab5` checkpoint; `934a8c5a` report-only tooling. The chain commits each sealed block itself (avoid manual commits while a chain commit may run).
- Node v24.21.0; slice `vgl0fj.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); 12 workers; Growth cache 48, D1 cache 64.
- `results/logs/` is git-ignored by a global pattern: force-add the logs at completion (`git add -f`), as Assignment 2 did.

## Stages

| Stage | Status | Record (sha256 prefix) | Notes |
|---|---|---|---|
| Implementation + tests | complete | — | gaps 24/24, space 13/13, select 7/7 (Assignment 2's 36 sealed primaries re-derived) |
| Stage V | complete, sealed | `results/parity/parity.json` `0e8ca216…` | 0 failed of 18,091 checks; 3,075 simulations; 328 s |
| Full `npm test` | complete | `results/logs/npm-test.log` | 1,654 tests, 1,643 pass, the 7 known failures, 4 skipped |
| Bench, pilot, interruption tests, calibration | complete | cache `.cache/vg-l0-full-joint/pilot/` | 97–99 evals/s flat 10–16 workers; resumptions identical; R_N = 4 |
| Freeze | complete, sealed | `results/protocol-freeze.json` `869ae1a7…` | commit `2a56e9b6` |
| C19 Track I broad1 / broad2 | complete, sealed | `results/search/C19/broad{1,2}.json` | broad1 98 min, 1.24 M fresh, 0 resource-guard stops, 14 lanes at the 6-island cap |
| C19 qualify / plan / refine / qualify / select / fold | complete, sealed, committed | `results/folds/C19/` | refine plan 13 cells; selection `cdd37dc2` before D21 opened; fold `3d489a73` |
| C21 | **running** (c201 broad1) | `results/search/C21/`, `results/folds/C21/` | |
| C23, sequential | not started | `results/folds/C23/`, `results/folds/sequential.json` | |
| C24 Track I, Track N (informed1/2, 64 lanes), qualify, select | not started | `results/search/C24/`, `results/folds/C24/` | |
| Frozen selection, validation (FULL once) | not started | `FROZEN_SELECTION.json`, `results/validation/validation.json` | |
| Report-only diagnostics, tables, REPORT | not started | `results/diagnostics/`, `results/tables/` | tooling in `tools/vg-l0-full-joint/` |

## Guards

- **Do not rerun** stage V, the freeze or any sealed stage (they refuse). Do not edit the protocol (amendments only).
- FULL opens only through the validation stage after `FROZEN_SELECTION.json` is sealed and committed (the stage V AD3
  exception is closed: a search record now exists).
- Do not edit any earlier study's files. No merge into `main`, no deployment, no broker access. Push at completion
  (standing preference), unsandboxed with retries; verify with `git ls-remote`.

## Disclosures (so far)

- Stage V dry runs opened FULL for New L0 under legacy defaults only (AD3), three times, plus the sealed run.
- AMENDMENTS R1 (stage V V3(b) revised before the freeze) and R2 (pilot measurements, a pilot-only guard fix).
- Engineering diagnostics on D24 (`.cache/vg-l0-full-joint/reach-diag*.ts`): counts only.
- The full `npm test` reads whole data files (as in Assignment 2); it feeds no decision.
