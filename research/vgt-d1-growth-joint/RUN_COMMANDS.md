# RUN_COMMANDS — vgt-d1-growth-joint

Run every command from the repository root `/home/chad/projects/margin-trading` (the engines and the Study 8 resolver
read repository-relative files at import time). Node v24.21.0 (`.node-version`). Heavy stages run in transient
systemd user units inside `vgtjoint.slice` (MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0, re-applied before every
launch), one at a time:

```
npm run vgt-joint -- launch --unit <unit> --wait -- <command> [options]     # log: results/logs/<unit>.log
```

`npm run vgt-joint -- <command>` runs the same entry point without a unit (light commands only).

| Stage | Command | Output | Rerun? |
|---|---|---|---|
| S1 doors | `npm run vgt-joint -- doors` | `.cache/vgt-d1-growth-joint/doors/VGT-D{19,21,23,24}.csv`, `results/doors-pins.json` | deterministic (pins checked) |
| S1 fixtures | `npm run vgt-joint -- fixtures` | `fixtures/controls.json` | deterministic |
| S2 pilot | `bash research/vgt-d1-growth-joint/chains/pilot.sh`, then `chains/pilot2.sh` | `.cache/vgt-d1-growth-joint/pilot/`, `results/logs/pilot-*.log` | `pilot-` jobs only |
| S3 parity | `launch --unit vgtj-parity --wait -- parity` | `results/parity/parity.json` (sealed) | **refuses** once sealed |
| S4 freeze | `npm run vgt-joint -- freeze-protocol`, then commit | `results/protocol-freeze.json` (read-only) | **refuses** a second freeze |
| S5–S7 chain | `bash research/vgt-d1-growth-joint/chains/study.sh` (C19, C21, C23: search → qualify → commit → fold-eval; sequential; C24 search → qualify; diagnostics) | `results/search/C*/search.json`, `results/folds/C*/{selection,evaluation}.json`, `results/folds/sequential.json`, `results/diagnostics/D24/` (all sealed) | each stage **refuses** once sealed; an interrupted search or qualification resumes from its archive when rerun with the same command |
| S8 frozen selection | `npm run vgt-joint -- freeze-selection`, then commit | `FROZEN_SELECTION.json` (read-only) | **refuses** if it exists |
| S9 validation | `launch --unit vgtj-validate --wait -- validate --workers 6` | `results/validation/validation.json` (sealed), ledgers | **one opening**; refuses once sealed |
| S10 tests | `node --experimental-transform-types --test src/vgt-d1-growth-joint/tests/*.test.ts`; the full suite in a unit | `results/logs/npm-test.log` | safe |

**Interrupted jobs.** A job stops gracefully (exit 75) on SIGTERM/SIGINT or memory pressure; a worker death fails it
(exit 1) after committing. In either case first check `systemctl --user is-active <unit>` and the unit's log, then
rerun the same command: archived evaluations are read back, never recomputed, and the replay reproduces the
uninterrupted run. The chain is fail-fast: rerun it after fixing the cause; completed stages refuse to rerun, so it must
be restarted from the first incomplete stage (edit a copy of the chain, never delete a sealed record).

## Executed (2026-11-08, UTC)

| Time | Stage | Command (unit) | Result |
|---|---|---|---|
| 07:42–07:59 | pilot part 1 | `chains/pilot.sh` (units `vgtj-pilot-{a,b,c,d}-*`) | A=B=C=D; stop exit 75; worker death exit 1 after 20 s |
| 07:59–08:47 | pilot part 2 | `chains/pilot2.sh` (X1–X3, E, F, bench) and `validate --pilot e` (`vgtj-pilot-g-validate`) | all as expected |
| 08:00, 08:49, 08:52 | parity | `launch --unit vgtj-parity[-2,-3] --wait -- parity [--name parity-2|parity-3]` | 341/341 each; `parity-3.json` is the frozen code's |
| 08:52 | freeze | `npm run vgt-joint -- freeze-protocol`; commit `3bc7856` | protocol sha256 `7a680692…` |
| 08:52–13:02 | study chain | `systemd-run --user --unit=vgtj-chain --slice=vgtjoint.slice … bash chains/study.sh` | C19 `a5ad22ad`, C21 `eda1578a`, C23 `72c13b56`, sequential `ad6edb44`, C24 + diagnostics `00be6975`; `CHAIN-DONE` |
| 13:03 | frozen selection | `npm run vgt-joint -- freeze-selection`; commit `3ed30ff0` | `FROZEN_SELECTION.json` sha256 `e677e894…` |
| 13:03 | validation (once) | `launch --unit vgtj-validate --wait -- validate --workers 8` | sealed; primary +$22,251.64 |
| 13:05– | tests | `systemd-run … --unit=vgtj-npm-test … npm test` | `results/logs/npm-test.log` |
| after | tables, charts | `node --experimental-transform-types tools/vgt-d1-growth-joint/tables.ts`; `charts.ts <ledgers> <out> <title> <NN=…> 2024-12-31`; `example.ts > results/diagnostics/partial-release-synthetic.json` | report helpers |
