# Run commands — Priority 3C (c4-gdx-growth-partner)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `c4gdx.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time,
through `launch` (logs in `results/logs/<unit>.log`, git-ignored). Sealed stages refuse a rerun; an interrupted stage
resumes from its job archive (`.cache/c4-gdx-growth-partner/jobs/<job>/archive.sqlite`) when relaunched with the same
command. Every stage checks the preflight, the sealed engineering gates, the sealed audit, the committed freeze and the
evaluation digest.

```
npm run research-preflight -- --study research/c4-gdx-growth-partner
npm run c4gdx -- doors                                    # canonical files, door pins, endpoint
npm run c4gdx -- control-manifest                         # sealed CONTROL_MANIFEST.json (before any evaluation)
npm run c4gdx -- audit                                    # sealed results/audit/archive-audit.json
npm run c4gdx -- launch --unit c4gdx-pilot-bench-L-w14 --wait -- bench --door D24 --centres 384 --workers 14 --label L-w14 --warm 6
bash research/c4-gdx-growth-partner/chains/pilot.sh ref        # every stage path on pilot budgets (P18 on D19)
bash research/c4-gdx-growth-partner/chains/pilot.sh interrupt  # graceful / worker kill / unit kill + pilot-compare
npm run c4gdx -- launch --unit c4gdx-parity --wait -- parity    # sealed results/parity/parity.json (E1–E8)
npm run c4gdx -- plan                                     # the per-cutoff proposal plans and evaluation caps
npm run c4gdx -- freeze-protocol                          # sealed results/protocol-freeze.json (then commit)

# the study chain (as its own unit, outside the slice; it launches the heavy units one at a time inside it):
systemd-run --user --unit=c4gdx-chain --collect -p KillMode=mixed --working-directory=/home/chad/projects/margin-trading \
  -p StandardOutput=append:/home/chad/projects/margin-trading/research/c4-gdx-growth-partner/results/logs/study-chain.log \
  -p StandardError=append:/home/chad/projects/margin-trading/research/c4-gdx-growth-partner/results/logs/study-chain.log \
  /bin/bash research/c4-gdx-growth-partner/chains/study.sh

# single stages (as the chain runs them)
npm run c4gdx -- launch --unit c4gdx-search-C19 --wait -- search --cutoff C19 --workers 14
npm run c4gdx -- launch --unit c4gdx-qualify-C19 --wait -- qualify --cutoff C19 --workers 14
npm run c4gdx -- launch --unit c4gdx-eval-C19 --wait -- fold-eval --cutoff C19 --workers 14
npm run c4gdx -- launch --unit c4gdx-sequential --wait -- sequential --workers 14
npm run c4gdx -- launch --unit c4gdx-search-C24 --wait -- search --cutoff C24 --workers 14
npm run c4gdx -- launch --unit c4gdx-qualify-C24 --wait -- qualify --cutoff C24 --workers 14
npm run c4gdx -- launch --unit c4gdx-transfers --wait -- transfers --workers 14
npm run c4gdx -- launch --unit c4gdx-diagnostics --wait -- diagnostics --workers 14
npm run c4gdx -- launch --unit c4gdx-freeze-selection --wait -- freeze-selection --workers 14
git add research/c4-gdx-growth-partner/FROZEN_SELECTION.json research/c4-gdx-growth-partner/results/seals.jsonl && git commit
npm run c4gdx -- launch --unit c4gdx-validate --wait -- validate --workers 14

# integrity, tables and tests
npm run c4gdx -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/c4-gdx-growth-partner/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/c4-gdx-growth-partner/tests/*.test.ts
```
