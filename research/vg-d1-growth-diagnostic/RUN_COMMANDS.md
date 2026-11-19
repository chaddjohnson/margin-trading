# Run commands — Priority 3A (vg-d1-growth-diagnostic)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `vgdiag.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time,
through `launch`; their logs go to `results/logs/<unit>.log` (git-ignored). Sealed stages refuse a rerun.

```
npm run research-preflight -- --study research/vg-d1-growth-diagnostic
npm run vg-diag -- manifest --dry-run          # print the manifest
npm run vg-diag -- manifest                    # seal DIAGNOSTIC_MANIFEST.json (once)
npm run vg-diag -- freeze                      # seal results/protocol-freeze.json (once), then commit both

npm run vg-diag -- launch --unit vgdiag-R --wait -- stage R    # reproduce + participation (D24)
npm run vg-diag -- launch --unit vgdiag-S --wait -- stage S    # search and promotion audit (archives)
npm run vg-diag -- launch --unit vgdiag-N --wait -- stage N    # neighbourhoods + draw replays (archives, D24)
npm run vg-diag -- launch --unit vgdiag-P --wait -- stage P    # the frozen probes (D24)
npm run vg-diag -- launch --unit vgdiag-F --wait -- stage F    # the retrospective FULL replay (guarded)

npm run vg-diag -- verify                      # every sealed record against results/seals.jsonl
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-diagnostic/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-d1-growth-diagnostic/tests/*.test.ts
```

Resume: a stage writes its sealed record only at its end; an interrupted stage leaves nothing and reruns from its start
with the same inputs (deterministic). A completed stage refuses to rerun.
