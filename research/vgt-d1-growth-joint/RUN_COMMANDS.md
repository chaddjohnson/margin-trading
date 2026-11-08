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
