# Run commands — growth140-vgt-stable

Run everything from the repository root (`/home/chad/projects/margin-trading`), Node 24.21.0 (`.node-version`).
`N` is `npm run -s growth140-stable --`. `L` launches a stage in a transient systemd user service inside
`growth140-stable.slice` (MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0 on the slice and on the unit; KillMode=mixed;
Restart=no; log `results/runlogs/<unit>.log`):

```bash
N() { npm run -s growth140-stable -- "$@"; }
L() { unit=$1; shift; npm run -s growth140-stable -- launch --unit "$unit" -- "$@"; }   # add --wait after --unit X to block
```

Every evaluating stage resumes by rerunning the **same command** (its checkpoint and archive are in
`.cache/growth140-vgt-stable/jobs/<job>/`). A sealed output refuses a rerun.

## Before the freeze

```bash
N build-doors                                   # results/doors-pins.json (D19, D21, D23, D24)
N pilot                                         # engineering pilot A–G (each phase its own unit)
L growth140-stable-bench-d24-14 bench --door D24 --workers 14   # and 8 / 12 / 16, and --door D19
N memory-report pilot-search-C19 … --out research/growth140-vgt-stable/results/pilot/memory-summary.json
N freeze-protocol                               # results/protocol_freeze.json — then commit
```

## Development stages (in order)

```bash
L growth140-stable-parity parity --workers 4             # P0: browser parity, door causality, archive reuse
N audit                                                  # archive only: results/audit/audit.json, audit-candidates.json
L growth140-stable-audit-reeval audit-reeval --workers 14
L growth140-stable-sensitivity sensitivity --workers 14
N seeds                                                  # results/seeds/SEEDS.json (mechanical)
for C in C19 C21 C23; do
  L growth140-stable-search-$C search --cutoff $C --workers 14
  L growth140-stable-qualify-$C qualify --cutoff $C --workers 14
  N freeze-fold --cutoff $C                              # results/folds/$C/FOLD_SELECTION.json — commit
  L growth140-stable-evaluate-$C evaluate-fold --cutoff $C --workers 14
done
N sequential                                             # results/folds/sequential.json (the procedure decision)
L growth140-stable-search-C24 search --cutoff C24 --workers 14
L growth140-stable-qualify-C24 qualify --cutoff C24 --workers 14
N final-select                                           # FROZEN_SELECTION.json (read-only) — commit before final
```

## The final comparison (once)

```bash
L growth140-stable-final final --workers 14             # #4 full-history parity first; FULL door
```

## Monitoring and checks

```bash
systemctl --user list-units 'growth140-stable*'          # running units
systemctl --user show growth140-stable.slice -p MemoryHigh -p MemoryMax -p MemorySwapMax
systemctl --user stop <unit>.service                     # graceful: checkpoint, exit 75; rerun the command to resume
N verify                                                 # protocol, code closure, door and data pins
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/growth140-vgt-stable/tests/study.test.ts
```

## The chains actually run (fail-fast; `chains/`)

- `chains/chain2.sh` (14:43–14:52Z): P0 parity, audit re-evaluation, sensitivity, seeds — after incident O1 (the first
  chain, log `chains/chain1.log`, did not stop on P0's failure; see AMENDMENTS.md O1).
- `chains/chain3.sh` (14:53–18:27Z): for C19, C21, C23 — search, qualify, freeze-fold, git commit, evaluate-fold; then
  sequential; then the C24 search and qualification. Host check before every launch. Log `chains/chain3.log`.
- Then `npm run -s growth140-stable -- final-select`, the commit, and
  `npm run -s growth140-stable -- launch --unit growth140-stable-final --wait -- final --workers 14`.
- Afterwards: `tools/growth140-vgt-stable/tables.ts`, `tools/growth140-vgt-stable/export-archive.ts <jobs…>`,
  `memory-report … --out research/growth140-vgt-stable/results/memory-summary-study.json`, and the full `npm test` in a
  capped unit (`results/runlogs/npm-test.log`).
