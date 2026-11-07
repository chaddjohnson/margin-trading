# Run commands — growth140-vgt-s8m

Run everything from the repository root (`/home/chad/projects/margin-trading`), Node 24.21.0 (`.node-version`).
`N=npm run growth140-s8m --` below; `L` launches a stage in a transient systemd user service with the job's
resource contract (MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0, KillMode=mixed, no restart, log
`results/runlogs/<unit>.log`):

```bash
L() { unit=$1; shift; npm run -s growth140-s8m -- launch --unit "$unit" -- "$@"; }   # add --wait to block
```

## Before the search

```bash
$N build-dev                       # the development prefix file (verifies the canonical prefix sha256)
$N pilot                           # engineering pilot phases A–F (each its own unit; ≈ 20 min)
$N pilot2                          # supplementary pilot phases: qualification and validation stop/resume
$N memory-report pilot-a pilot-a-qualify pilot-b pilot-c pilot-d pilot-e pilot-parity --out research/growth140-vgt-s8m/results/pilot/memory-summary.json
$N freeze-protocol                 # results/protocol_freeze.json — then commit
L growth140-s8m-parity parity --workers 4            # P1: worker path vs the browser runner (development dates)
```

## Search (fresh start) and resume

```bash
L growth140-s8m-search search --job search --workers 12           # fresh start (refuses if the job exists)
L growth140-s8m-search-r1 search --job search --workers 12 --resume   # after any stop (75), SIGTERM or SIGKILL
systemctl --user status growth140-s8m-search.service               # identity, memory, PID
systemctl --user stop growth140-s8m-search.service                 # graceful: checkpoint, exit 75
```

The resumed job continues from `.cache/growth140-vgt-s8m/jobs/search/checkpoint.json` (or `.prev`), verifies its
pins (protocol, code closure, data) and reproduces the uninterrupted computation (pilot phases D and E).

## Qualification, freeze, validation

```bash
L growth140-s8m-qualify qualify --workers 12                       # rerun the same command to resume
$N freeze-selection                                                # FROZEN_SELECTION.json (read-only) — then commit
L growth140-s8m-validate validate --workers 12                     # once; rerun the same command to resume
```

## Checks

```bash
$N verify                          # protocol, code closure and data pins
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/growth140-vgt-s8m/tests/study.test.ts
```
