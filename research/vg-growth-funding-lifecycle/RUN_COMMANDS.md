# Run commands — Priority 5A (vg-growth-funding-lifecycle)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `vgflc.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time,
through `launch` (logs in `results/logs/<unit>.log`, git-ignored). Sealed stages refuse a rerun; an interrupted stage
resumes from its job archive when relaunched with the same command.

```
npm run research-preflight -- --study research/vg-growth-funding-lifecycle
npm run vg-life -- manifest --dry-run                 # print the study manifest
npm run vg-life -- manifest                           # seal STUDY_MANIFEST.json (once)
npm run vg-life -- freeze                             # seal results/protocol-freeze.json (once), then commit

# engineering pilots (before the freeze): uninterrupted, SIGTERM, killed worker, killed unit; then compare
npm run vg-life -- launch --unit vgflc-pilot-ref --wait -- pilot ref
npm run vg-life -- launch --unit vgflc-pilot-grace1 --wait -- pilot grace --sigterm-after 30
npm run vg-life -- launch --unit vgflc-pilot-grace2 --wait -- pilot grace
npm run vg-life -- pilot-compare ref grace

npm run vg-life -- launch --unit vgflc-V --wait -- stage V     # verification gates (D24, D23)
npm run vg-life -- launch --unit vgflc-C --wait -- stage C     # development centres (43 subjects × 3 arms)
npm run vg-life -- launch --unit vgflc-N --wait -- stage N     # matched neighbourhoods (core matrix)
npm run vg-life -- launch --unit vgflc-S --wait -- stage S     # standalone instrument
npm run vg-life -- stage P                                     # development verdicts (no simulation)
git commit …                                                   # the development records
npm run vg-life -- full-manifest                               # seal FULL_MANIFEST.json, then commit it
npm run vg-life -- launch --unit vgflc-F --wait -- stage F     # FULL centres (behind the committed guard)

npm run vg-life -- verify                                      # every sealed record against results/seals.jsonl
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-growth-funding-lifecycle/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-growth-funding-lifecycle/tests/*.test.ts
npm run vg-life -- launch --unit vgflc-npm-test --wait -- npm-test   # the full suite, contained, with the shell's PATH
```
