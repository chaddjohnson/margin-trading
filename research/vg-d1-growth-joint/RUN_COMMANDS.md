# Run commands — Priority 3 (vg-d1-growth-joint)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `vgjoint.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a
time, through `launch`; their logs go to `results/logs/<unit>.log`. Sealed stages refuse a rerun.

```
# engineering (no study record except where stated)
npm run research-preflight -- --study research/vg-d1-growth-joint
npm run vg-joint -- doors                       # builds and verifies the byte-prefix doors (both symbols)
npm run vg-joint -- parity --dry                # dry parity (cache only)
npm run vg-joint -- launch --unit vgjoint-parity --wait -- parity      # sealed results/parity/parity.json
bash research/vg-d1-growth-joint/chains/pilot.sh                      # the pilot (pilot budgets; cache outputs)
npm run vg-joint -- bench --door D24 --centres 192 --workers 15 --label s-w15   # (through launch, as in the pilot)
npm run vg-joint -- freeze-protocol             # sealed results/protocol-freeze.json (then commit)

# the study chain: C19 → C21 → C23 (fold selections committed before their slices), sequential, C24 arms D, B, C,
# the Growth-pair selection, the C24 qualification and the diagnostics
bash research/vg-d1-growth-joint/chains/study.sh > research/vg-d1-growth-joint/results/logs/study-chain.log 2>&1

# by hand, after inspection: the frozen selection (commit it), then the one-time validation (commit it)
npm run vg-joint -- launch --unit vgjoint-freeze-selection --wait -- freeze-selection
git add research/vg-d1-growth-joint/FROZEN_SELECTION.json research/vg-d1-growth-joint/results/seals.jsonl && git commit
npm run vg-joint -- launch --unit vgjoint-validate --wait -- validate --workers 15

# integrity and tables
npm run vg-joint -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-joint/tables.ts
```

Single stages (as the chain runs them):

```
npm run vg-joint -- launch --unit vgjoint-search-C19-indep --wait -- search --cutoff C19 --arm indep --workers 15
npm run vg-joint -- launch --unit vgjoint-qualify-C19 --wait -- qualify --cutoff C19 --workers 15
npm run vg-joint -- launch --unit vgjoint-eval-C19 --wait -- fold-eval --cutoff C19 --workers 15
npm run vg-joint -- launch --unit vgjoint-sequential --wait -- sequential --workers 15
npm run vg-joint -- launch --unit vgjoint-search-C24-gpair --wait -- search --cutoff C24 --arm gpair --workers 15
npm run vg-joint -- launch --unit vgjoint-qualify-gpair-C24 --wait -- qualify-gpair --cutoff C24 --workers 15
npm run vg-joint -- launch --unit vgjoint-search-C24-informed --wait -- search --cutoff C24 --arm informed --workers 15
npm run vg-joint -- launch --unit vgjoint-qualify-C24 --wait -- qualify --cutoff C24 --workers 15
npm run vg-joint -- launch --unit vgjoint-diagnostics --wait -- diagnostics --workers 15
```

Resume: rerunning the same command resumes an interrupted search or qualification from its job archive
(`.cache/vg-d1-growth-joint/jobs/<job>/archive.sqlite`); a completed stage refuses to rerun. A worker death fails the job
(exit 1); a pressure stop or SIGTERM exits 75; neither restarts on its own.
