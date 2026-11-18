# RUN_COMMANDS — vg-l0-risk-metrics

Run from the repository root (`/home/chad/projects/margin-trading`) on branch `research/vg-l0-risk-metrics`, Node v24.21.0
(`.node-version`). `N` below stands for
`node --max-old-space-size=16384 --experimental-transform-types --disable-warning=ExperimentalWarning`. Every stage
runner checks the adoption preflight and the frozen protocol hash, writes write-once sealed JSON into `results/`
(sha256 in `results/seals.jsonl`) and refuses to overwrite a sealed record; `--dry` prints instead of sealing. Heavy runs
went into transient systemd user units in `vgl0rm.slice` (slice limits set with
`systemctl --user set-property --runtime vgl0rm.slice MemoryHigh=44G MemoryMax=48G MemorySwapMax=0`).

```
npm run research-preflight -- --study research/vg-l0-risk-metrics          # standard 2.2.0, scope diagnostic
$N --test src/vg-l0-risk-metrics/tests/*.test.ts                           # 23 tests (synthetic + historical)
npx tsc --noEmit -p tsconfig.json                                           # repository typecheck
$N tools/vg-l0-risk-metrics/freeze.ts                                       # sealed protocol freeze (done once)
$N tools/vg-l0-risk-metrics/baseline.ts                                     # Stage 0: G0 parity (results/baseline/parity.json)
$N tools/vg-l0-risk-metrics/audit.ts centres                                # Stage 3: 51 candidates on FULL
research/vg-l0-risk-metrics/chains/stage3-nbhd.sh "New L0" "N/original" "N/RA1" "L/RA1" "L/original" "F/original" "F/RA1" "B/RA1" "New L0@FULL" "N/original@FULL"
                                                                             # Stage 3: regenerated selection families (as systemd units)
$N tools/vg-l0-risk-metrics/audit.ts windows-v2                             # Stage 3 correction (amendment A3)
$N tools/vg-l0-risk-metrics/exclusions.ts scan                              # Stage 4: screens and centres from the archives (read-only)
$N tools/vg-l0-risk-metrics/exclusions.ts compare                           # Stage 4: unbiased screens; Track N
$N tools/vg-l0-risk-metrics/exclusions.ts replay                            # Stage 4: bounded replays of excluded centres
for c in C19 C21 C23 C24; do $N tools/vg-l0-risk-metrics/population.ts $c; done   # Stage 5: member replays (G5a)
$N tools/vg-l0-risk-metrics/select.ts select                                # Stage 5: selectors (G5b)
$N tools/vg-l0-risk-metrics/select.ts folds                                 # Stage 5: fold paths (G5c), attribution, C24 rows
$N tools/vg-l0-risk-metrics/margin-scenarios.ts grid                        # Stage 2: scenario grid
$N tools/vg-l0-risk-metrics/margin-scenarios.ts overlay                     # Stage 2: illustrative historical overlay
$N tools/vg-l0-risk-metrics/tables.ts                                       # results/tables/*.csv + MANIFEST.json (rerunnable)
```

A systemd launch as used for the member replays (one per cutoff):

```
systemd-run --user --unit=vgl0rm-members-C21 --slice=vgl0rm.slice --collect -p MemoryHigh=44G -p MemoryMax=48G \
  -p MemorySwapMax=0 -p KillMode=mixed -E HOME="$HOME" \
  -p StandardOutput=append:$PWD/research/vg-l0-risk-metrics/results/logs/members-C21.log \
  -p StandardError=append:$PWD/research/vg-l0-risk-metrics/results/logs/members-C21.log --working-directory=$PWD \
  /home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --max-old-space-size=16384 \
  --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-metrics/population.ts C21
```

Seal verification: every line of `results/seals.jsonl` names a file and its sha256 (`sha256sum <file>`); the audited
studies' seals: `npm run vg-l0fj -- verify`.
