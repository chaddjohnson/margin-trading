# Run commands — Priority 4A (gdx-growth-standalone)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `gdxg.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time,
through `launch` (logs in `results/logs/<unit>.log`, git-ignored). Sealed stages refuse a rerun; an interrupted stage
resumes from its job archive (`.cache/gdx-growth-standalone/jobs/<job>/archive.sqlite`) when relaunched with the same
command. Every stage checks the preflight, the sealed engineering gates, the sealed control manifest, the committed
freeze and the evaluation digest.

```
npm run research-preflight -- --study research/gdx-growth-standalone
npm run gdxg -- doors                                     # canonical files, door pins (endpoint 2026-10-30)
npm run gdxg -- control-manifest                          # sealed CONTROL_MANIFEST.json (before any evaluation)
npm run gdxg -- launch --unit gdxg-parity --wait -- parity  # sealed results/parity/parity.json (E1–E7)
npm run gdxg -- launch --unit gdxg-pilot-bench-w12-gc256-b --wait --env GDXG_GC_EVERY=256 -- bench --door D24 --centres 384 --workers 12 --label w12-gc256-b --warm 8
PILOT=ref bash research/gdx-growth-standalone/chains/pilot.sh ref        # every stage path on pilot budgets (P18 on D19)
bash research/gdx-growth-standalone/chains/pilot.sh interrupt            # graceful / worker kill / unit kill + compare + dup-keys
npm run gdxg -- plan                                      # the per-cutoff proposal plans and evaluation caps
npm run gdxg -- freeze-protocol                           # sealed results/protocol-freeze.json (then commit)

# the study chain (its own unit, outside the slice; it launches the heavy units one at a time inside it):
systemd-run --user --unit=gdxg-chain --collect -p KillMode=mixed --working-directory=/home/chad/projects/margin-trading \
  -p StandardOutput=append:/home/chad/projects/margin-trading/research/gdx-growth-standalone/results/logs/study-chain.log \
  -p StandardError=append:/home/chad/projects/margin-trading/research/gdx-growth-standalone/results/logs/study-chain.log \
  /bin/bash research/gdx-growth-standalone/chains/study.sh

# single stages (as the chain runs them)
npm run gdxg -- launch --unit gdxg-search-C19 --wait -- search --cutoff C19 --lane independent --workers 12
npm run gdxg -- launch --unit gdxg-qualify-C19 --wait -- qualify --cutoff C19 --workers 12
git add research/gdx-growth-standalone/results/folds/C19/selection.json … && git commit   # before the slice opens
npm run gdxg -- launch --unit gdxg-eval-C19 --wait -- fold-eval --cutoff C19 --workers 12
#   … C21, C23 the same …
npm run gdxg -- launch --unit gdxg-sequential --wait -- sequential --workers 12
npm run gdxg -- launch --unit gdxg-search-C24 --wait -- search --cutoff C24 --lane independent --workers 12
npm run gdxg -- launch --unit gdxg-search-C24-informed --wait -- search --cutoff C24 --lane informed --workers 12
npm run gdxg -- launch --unit gdxg-qualify-C24 --wait -- qualify --cutoff C24 --workers 12
npm run gdxg -- launch --unit gdxg-diagnostics --wait -- diagnostics --workers 12
npm run gdxg -- launch --unit gdxg-freeze-selection --wait -- freeze-selection --workers 12
git add research/gdx-growth-standalone/FROZEN_SELECTION.json research/gdx-growth-standalone/results && git commit
npm run gdxg -- launch --unit gdxg-validate --wait -- validate --workers 12               # FULL, once

# integrity, tables and tests
npm run gdxg -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-growth-standalone/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gdx-growth-standalone/tests/*.test.ts
```
