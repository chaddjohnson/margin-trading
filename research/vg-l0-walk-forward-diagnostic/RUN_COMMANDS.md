# RUN_COMMANDS — walk-forward robustness failure investigation

Every command runs from the repository root. Sealed records refuse to be rewritten; `--dry` writes an unsealed copy to
`$WFD_SCRATCH/dry/…` instead (a check before sealing). Replays ran in transient systemd user units in `vgwfd.slice`;
`NODE` is the absolute Node path (`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`).

```
# preflight (standard 2.1.0, scope diagnostic)
npm run research-preflight -- --study research/vg-l0-walk-forward-diagnostic

# S1 protocol freeze (once, before any replay)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/freeze.ts

# G1, G2, G4 and D2 (records and fold mark caches only)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/gates.ts

# D3/D4/D8/G3: fold primaries of 5B L0, B1, B2 and the New L0 control (this checkout's code)
systemd-run --user --unit=vgwfd-replay-primaries --slice=vgwfd.slice --collect --wait \
  -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed \
  --working-directory="$PWD" -p StandardOutput=append:"$PWD/research/vg-l0-walk-forward-diagnostic/results/logs/replay-primaries.log" \
  -p StandardError=append:"$PWD/research/vg-l0-walk-forward-diagnostic/results/logs/replay-primaries.log" \
  "$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/replay.ts

# the trading-session study's code lives only on its branch: a temporary detached worktree with COPIED door files
WT=<scratch dir>/wt-ses
git worktree add --detach "$WT" 18674b39
mkdir -p "$WT/.cache/vg-d1-growth-joint/doors" && cp .cache/vg-d1-growth-joint/doors/*.csv "$WT/.cache/vg-d1-growth-joint/doors/"
ln -s "$PWD/node_modules" "$WT/node_modules"

# D3/D4/D8/G3 session primaries; D7 neighbourhoods; D6 evaluated rows (each in its own unit, one at a time, as above,
# with -E WFD_SES_WT="$WT")
#   tools/vg-l0-walk-forward-diagnostic/replay-ses.ts
#   tools/vg-l0-walk-forward-diagnostic/neighbours.ts
#   tools/vg-l0-walk-forward-diagnostic/alternatives.ts

# D5 selection trace, D8 checks, D9 regimes (records / data only)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/selection.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/d8.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/regimes.ts

# D10 coverage check (unit as above)
#   tools/vg-l0-walk-forward-diagnostic/coverage.ts

# tables and summary from the sealed records (regenerated, not sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/tables.ts

# afterwards
git worktree remove --force "$WT"
```

Verify the sealed records: `sha256sum` of each file listed in `results/seals.jsonl` equals its recorded sha256.
