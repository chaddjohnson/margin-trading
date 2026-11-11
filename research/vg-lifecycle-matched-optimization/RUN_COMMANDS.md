# Run commands — Priority 5B (vg-lifecycle-matched-optimization)

Every command runs from the repository root (`/home/chad/projects/margin-trading`). Heavy stages run as transient
systemd user units inside `vglmo.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0):

```
npm run vg-lmo -- launch --unit <unit> --wait -- <stage command>
```

Study logs go to `research/vg-lifecycle-matched-optimization/results/logs/<unit>.log`; engineering units (names containing
`pilot`, `bench` or `dry`) log to `.cache/vg-lifecycle-matched-optimization/logs/`. Sealed stages refuse to rerun; an
interrupted stage resumes from its job archive (`.cache/vg-lifecycle-matched-optimization/jobs/<job>/`) when the same
command is relaunched. Stages are chained fail-fast (each step's exit status is tested before the next starts).

## Checks

```
npm run research-preflight -- --study research/vg-lifecycle-matched-optimization
npm run vg-lmo -- verify                 # every sealed record against results/seals.jsonl
npm run vg-lmo -- doors                  # canonical files, prefix door pins, endpoint
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-lifecycle-matched-optimization/tests/*.test.ts
```

## Engineering (before the freeze)

```
npm run vg-lmo -- launch --unit vglmo-parity-dry --wait -- parity --dry-run            # stage V, not sealed
npm run vg-lmo -- launch --unit vglmo-bench-w14 --wait -- bench --door D24 --centres 96 --workers 14 --label w14 --warm 2
npm run vg-lmo -- launch --unit vglmo-pilot-s1 --wait -- search --cutoff P18 --arm indep --pilot <name>   # … every stage with --pilot
npm run vg-lmo -- pilot-compare <ref> <other> …                                         # identical lane results
npm run vg-lmo -- control-manifest                                                      # sealed CONTROL_MANIFEST.json
npm run vg-lmo -- launch --unit vglmo-parity --wait -- parity                           # sealed stage V
npm run vg-lmo -- freeze-protocol                                                       # sealed results/protocol-freeze.json (then commit)
```

## Study stages (after the freeze is committed)

As run: `research/vg-lifecycle-matched-optimization/chains/chain1.sh` (fail-fast; C19 → C21 → C23 → sequential → C24
searches, qualification, cross-test, diagnostics; it commits each fold selection before its slice; log
`results/logs/chain1.log`; the first start failed on amendment A1, `results/logs/chain1.failed-A1.log`), then
`freeze-selection`, the commit, and `validate`. The equivalent individual commands:

```
# C19, C21, C23 (in this order; commit each selection before its fold evaluation)
npm run vg-lmo -- launch --unit vglmo-C19-search --wait -- search --cutoff C19 --arm indep
npm run vg-lmo -- launch --unit vglmo-C19-qualify --wait -- qualify --cutoff C19
git add research/vg-lifecycle-matched-optimization/results && git commit -m "…C19 selection sealed"
npm run vg-lmo -- launch --unit vglmo-C19-crosstest --wait -- crosstest --cutoff C19
npm run vg-lmo -- launch --unit vglmo-C19-fold --wait -- fold-eval --cutoff C19
# … the same for C21 and C23
npm run vg-lmo -- launch --unit vglmo-sequential --wait -- sequential

# C24
npm run vg-lmo -- launch --unit vglmo-C24-search-indep --wait -- search --cutoff C24 --arm indep
npm run vg-lmo -- launch --unit vglmo-C24-search-informed --wait -- search --cutoff C24 --arm informed
npm run vg-lmo -- launch --unit vglmo-C24-qualify --wait -- qualify --cutoff C24
npm run vg-lmo -- launch --unit vglmo-C24-crosstest --wait -- crosstest --cutoff C24
npm run vg-lmo -- launch --unit vglmo-diagnostics --wait -- diagnostics
npm run vg-lmo -- freeze-selection        # sealed FROZEN_SELECTION.json — commit it before the validation
npm run vg-lmo -- launch --unit vglmo-validate --wait -- validate
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-lifecycle-matched-optimization/tables.ts
```

## Supplementary (report-only, outside the frozen plan)

```
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-lifecycle-matched-optimization/c19-l2-mechanism.ts
```
