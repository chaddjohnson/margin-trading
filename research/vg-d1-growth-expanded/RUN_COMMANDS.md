# Run commands — Priority 3B (vg-d1-growth-expanded)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `vgexp.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time,
through `launch` (logs in `results/logs/<unit>.log`, git-ignored). Sealed stages refuse a rerun; an interrupted stage
resumes from its job archive (`.cache/vg-d1-growth-expanded/jobs/<job>/archive.sqlite`) when relaunched with the same
command. Every stage checks the preflight, the sealed engineering gates, the committed freeze and the evaluation digest.

```
npm run research-preflight -- --study research/vg-d1-growth-expanded
npm run vg-exp -- doors                                   # canonical files, door pins, endpoint
npm run vg-exp -- launch --unit vgexp-pilot-bench-w14 --wait -- bench --door D24 --centres 192 --workers 14 --label w14
bash research/vg-d1-growth-expanded/chains/pilot.sh ref    # every stage path on pilot budgets (P18 on D19)
bash research/vg-d1-growth-expanded/chains/pilot.sh interrupt   # graceful / worker kill / unit kill + pilot-compare
npm run vg-exp -- launch --unit vgexp-parity --wait -- parity   # sealed results/parity/parity.json (E1–E7)
npm run vg-exp -- control-manifest                        # sealed CONTROL_MANIFEST.json
npm run vg-exp -- freeze-protocol                         # sealed results/protocol-freeze.json (then commit)

# the study chain (as its own unit, outside the slice; it launches the heavy units one at a time inside it):
systemd-run --user --unit=vgexp-chain --collect -p KillMode=mixed --working-directory=/home/chad/projects/margin-trading \
  -p StandardOutput=append:/home/chad/projects/margin-trading/research/vg-d1-growth-expanded/results/logs/study-chain.log \
  -p StandardError=append:/home/chad/projects/margin-trading/research/vg-d1-growth-expanded/results/logs/study-chain.log \
  /bin/bash research/vg-d1-growth-expanded/chains/study.sh

# single stages (as the chain runs them)
npm run vg-exp -- launch --unit vgexp-search-C19-indep --wait -- search --cutoff C19 --arm indep --workers 14
npm run vg-exp -- launch --unit vgexp-qualify-C19 --wait -- qualify --cutoff C19 --workers 14
npm run vg-exp -- launch --unit vgexp-eval-C19 --wait -- fold-eval --cutoff C19 --workers 14
npm run vg-exp -- launch --unit vgexp-sequential --wait -- sequential --workers 14
npm run vg-exp -- launch --unit vgexp-search-C24-indep --wait -- search --cutoff C24 --arm indep --workers 14
npm run vg-exp -- launch --unit vgexp-search-C24-informed --wait -- search --cutoff C24 --arm informed --workers 14
npm run vg-exp -- launch --unit vgexp-qualify-C24 --wait -- qualify --cutoff C24 --workers 14

# after the chain: diagnostics, the frozen selection (commit it), the one-time validation
npm run vg-exp -- launch --unit vgexp-diagnostics --wait -- diagnostics --workers 14
npm run vg-exp -- launch --unit vgexp-freeze-selection --wait -- freeze-selection --workers 14
git add research/vg-d1-growth-expanded/FROZEN_SELECTION.json research/vg-d1-growth-expanded/results/seals.jsonl && git commit
npm run vg-exp -- launch --unit vgexp-validate --wait -- validate --workers 14

# integrity, tables and tests
npm run vg-exp -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-expanded/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-d1-growth-expanded/tests/*.test.ts
```
