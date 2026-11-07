# RUN_COMMANDS — vg-balanced-entry-eligibility

Run every command from the repository root `/home/chad/projects/margin-trading` (the engine and the Study 8 resolver
read repository-relative files at import time). Node v24.21.0. Each heavy stage runs in its own transient systemd
user unit; set these first:

```
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
R=/home/chad/projects/margin-trading
U() { systemd-run --user --wait --pipe --collect --quiet --unit=$1 -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed --working-directory=$R $NODE --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=4096 src/vg-balanced-entry-eligibility/main.ts "${@:2}"; }
```

`npm run vg-eligibility -- <command> …` is the same entry point without the unit. The executed order is below; all
times are UTC on 2026-11-07.

| Stage | Command | Output | Rerun? |
|---|---|---|---|
| S1 control (existing runner) | `systemd-run … $NODE … src/study8-runners/main.ts run s8-vg-balanced --end 2024-12-31 --quiet` (also with `--end 2026-10-30` and `--end 2026-10-29`) | `evaluations/study8-runs/…`, copied to `results/control/runner-*` | read-only; safe |
| S2 doors | `U vgbe-s2-doors build-doors` | `.cache/…/doors/D19…D24`, `results/doors-pins.json` | deterministic |
| S2 parity | `U vgbe-s2-parity parity` and `U vgbe-s2-runner-parity runner-parity` | `results/parity/off-parity.json`, `runner-format-parity.json` | safe |
| S3 Phase A | `U vgbe-s3-audit audit` | `results/audit/phase-a.json`, `phase-a-refusals.csv` | safe (descriptive) |
| S4 freeze | `$NODE --experimental-transform-types src/vg-balanced-entry-eligibility/main.ts freeze` | `results/protocol-freeze.json` (read-only) | **refuses** a second freeze |
| S5 pilot | `U vgbe-pilot-straight pilot pilot-straight --workers 2`; `U … pilot pilot-restart --workers 2 --stop-after 5` (exit 75), then again without `--stop-after`; `U … pilot pilot-grid-straight --workers 2 --set grid`; kill or SIGTERM tests on `pilot-kill-b` / `pilot-sigterm` (`--workers 1 --set grid`, background unit, `kill -9 <worker pid>` or `systemctl --user stop <unit>` after ≥ 5 completed, then rerun); `U … compare-jobs <a> <b> [--set grid]` | `results/pilot/` | `pilot-` jobs only |
| S6 searches | `U vgbe-s6-search-C19 search C19 --workers 6`, then C21, C23, C24 (check the exit status before the next) | `results/folds/C*/selection.json` (sealed), `candidates.csv` | **refuses** once sealed; an interrupted search resumes from its archives |
| S7 fold evaluations | `U vgbe-s7-eval-C19 eval-fold C19 --workers 1`, then C21, C23 | `results/folds/C*/evaluation.json` (sealed) | refuses once sealed |
| S8 diagnostics | `U vgbe-s8-diagnostics diagnostics D24 --workers 6` | `results/diagnostics/D24/` | report-only; archives make a rerun cheap |
| S9 frozen selection | `$NODE --experimental-transform-types src/vg-balanced-entry-eligibility/main.ts freeze-selection`, then commit | `FROZEN_SELECTION.json` (read-only) | **refuses** if it exists or the code digest moved |
| S10 validation | `U vgbe-s10-validate validate --workers 6` | `results/validation/` (sealed) | **one opening**; refuses once sealed |
| S11 example | `U vgbe-s11-example example explore 9` | `results/diagnostics/D24/examples/explore-9/` | report-only |
| S11 charts | `node --experimental-transform-types tools/vg-balanced-entry-eligibility/charts.ts` | `results/charts/charts.html` | safe |
| S11 tests | `node --experimental-transform-types --test src/vg-balanced-entry-eligibility/tests/*.test.ts`; full suite `systemd-run … /bin/bash -c "PATH=…:$PATH npm test"` | `results/logs/npm-test.log` | safe |

**Interrupted jobs.** A job stops gracefully (exit 75) on SIGTERM/SIGINT or memory pressure. A worker crash fails the
job (exit 1) after committing and checkpointing. In either case, rerun the same command: archived records are read
back, never recomputed. Check `systemctl --user is-active <unit>` and the unit's log before relaunching anything.
