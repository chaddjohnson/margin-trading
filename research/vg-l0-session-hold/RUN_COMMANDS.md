# Run commands — New L0 trading-session re-optimization (vg-l0-session-hold)

Every command runs from the repository root (`/home/chad/projects/margin-trading`). Heavy stages run as transient
systemd user units inside `vgl0sh.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0):

```
npm run vg-l0sh -- launch --unit <unit> --wait -- <stage command>
```

Study logs go to `research/vg-l0-session-hold/results/logs/<unit>.log` (git-ignored); engineering units (names
containing `pilot`, `bench` or `dry`) log to `.cache/vg-l0-session-hold/logs/`. Sealed stages refuse to rerun; an
interrupted stage resumes from its job archive (`.cache/vg-l0-session-hold/jobs/<job>/`) when the same command is
relaunched. Stages are chained fail-fast.

## Phases 1–3 (before the protocol; read-only for every other study)

```
node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=6144 tools/vg-l0-session-hold/recover-original.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 tools/vg-l0-session-hold/backward-compat.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/lib/tests/tradingSessions.test.ts \
  src/shared-margin-portfolio/tests/holdUnit.test.ts src/growth-trading/tests/holdUnit.test.ts src/vg-d1-growth-joint/tests/holdUnit.test.ts
```

(Run each inside a contained unit, e.g. `systemd-run --user --unit=vgl0sh-recover --collect --wait -p MemoryMax=16G
-p MemorySwapMax=0 -p WorkingDirectory=$PWD <absolute node> …`.)

## Checks

```
npm run research-preflight -- --study research/vg-l0-session-hold
npm run vg-l0sh -- verify                 # every sealed record against results/seals.jsonl
npm run vg-l0sh -- doors                  # canonical files, prefix door pins, endpoint
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-session-hold/tests/*.test.ts
```

## Engineering (before the freeze)

```
npm run vg-l0sh -- launch --unit vgl0sh-parity-dry --wait -- parity --dry-run           # stage V, not sealed
npm run vg-l0sh -- launch --unit vgl0sh-bench-w14 --wait -- bench --door D24 --centres 96 --workers 14 --label w14 --warm 2 --units ses
bash research/vg-l0-session-hold/chains/pilot.sh                                       # every stage on P18 + interruption tests
npm run vg-l0sh -- control-manifest                                                     # sealed CONTROL_MANIFEST.json
npm run vg-l0sh -- launch --unit vgl0sh-parity --wait -- parity                         # sealed stage V
npm run vg-l0sh -- freeze-protocol                                                      # sealed results/protocol-freeze.json (then commit)
```

## Study stages (after the freeze is committed)

As run: `research/vg-l0-session-hold/chains/chain1.sh` (fail-fast; log `results/logs/chain1.log`). The equivalent
individual commands:

```
# C19, C21, C23 (in this order; commit each selection before its fold evaluation)
npm run vg-l0sh -- launch --unit vgl0sh-C19-search --wait -- search --cutoff C19 --arm indep
npm run vg-l0sh -- launch --unit vgl0sh-C19-qualify --wait -- qualify --cutoff C19
git add research/vg-l0-session-hold/results && git commit -m "…C19 selection sealed"
npm run vg-l0sh -- launch --unit vgl0sh-C19-crosstest --wait -- crosstest --cutoff C19
npm run vg-l0sh -- launch --unit vgl0sh-C19-fold --wait -- fold-eval --cutoff C19
# … the same for C21 and C23
npm run vg-l0sh -- launch --unit vgl0sh-sequential --wait -- sequential

# C24
npm run vg-l0sh -- launch --unit vgl0sh-C24-search-indep --wait -- search --cutoff C24 --arm indep
npm run vg-l0sh -- launch --unit vgl0sh-C24-search-informed --wait -- search --cutoff C24 --arm informed
npm run vg-l0sh -- launch --unit vgl0sh-C24-qualify --wait -- qualify --cutoff C24
npm run vg-l0sh -- launch --unit vgl0sh-C24-crosstest --wait -- crosstest --cutoff C24
npm run vg-l0sh -- launch --unit vgl0sh-diagnostics --wait -- diagnostics
npm run vg-l0sh -- launch --unit vgl0sh-freeze-selection --wait -- freeze-selection   # sealed FROZEN_SELECTION.json — commit it before the validation
npm run vg-l0sh -- launch --unit vgl0sh-validate --wait -- validate
node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 tools/vg-l0-session-hold/tables.ts
```
