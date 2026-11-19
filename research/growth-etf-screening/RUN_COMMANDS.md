# Run commands — Priority 7A (growth-etf-screening)

Every command runs from the repository root (`/home/chad/projects/margin-trading`) with Node v24.21.0. Heavy stages run
as transient systemd user units inside `getf.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time,
through `launch` (logs in `results/logs/<unit>.log`, git-ignored). Sealed records refuse a rerun; an interrupted ETF job
resumes from its archive (`.cache/growth-etf-screening/jobs/<job>/archive.sqlite`) when the same command is rerun; a
completed ETF job is skipped. Every stage checks the preflight, the universe (R1), the committed protocol freeze, the
sealed engineering gates, the sealed transfer manifest and the evaluation digest.

```
npm run research-preflight -- --study research/growth-etf-screening
npm run getf -- universe                     # sealed UNIVERSE_MANIFEST.json + results/doors/DOORS.json (no strategy run)
npm run getf -- universe-r1                  # sealed amendment R1 (XLF untested): the 60-ETF eligible universe
npm run getf -- transfer-manifest            # sealed TRANSFER_MANIFEST.json (9 exact vectors, from their sealed sources)
npm run getf -- launch --unit getf-parity -- parity        # sealed results/parity/parity.json (E1–E8, every ETF)

# the pilot (engineering only; pilot names; outputs in .cache/growth-etf-screening/pilot/)
npm run getf -- launch --unit getf-pilot-bench-w8 --wait --env GETF_GC_EVERY=256 -- bench --symbol XLK --centres 192 --workers 8 --label w8 --warm 8
#   … w12, w14, w16, w12-sb12 (GETF_START_BATCH=12)
npm run getf -- launch --unit getf-pilot-ref-screen --wait -- screen --cutoff P18 --pilot ref --symbols IJR,GDX,TLT,XLK --concurrency 2 --workers 8
#   … select, fold-eval, sequential, transfer, final-select, diagnostics with --pilot ref --symbols IJR,GDX,TLT,XLK
npm run getf -- launch --unit getf-pilot-size-screen --wait -- screen --cutoff P18 --pilot size --pilot-budget study --symbols XLK,TLT --concurrency 2 --workers 8
bash <scratch>/interrupt.sh                 # graceful stop / worker kill / unit kill + pilot-compare + dup-keys (see results/pilot/PILOT.md)

npm run getf -- plan                         # the plan check: ledger + every remaining worst case ≤ 2,000,000
npm run getf -- freeze-protocol              # sealed results/protocol-freeze.json (then commit)

# the study chain (its own unit, outside the slice; it launches the heavy units one at a time inside it and commits
# each cutoff's selection before its slice opens):
systemd-run --user --unit=getf-chain --collect -p KillMode=mixed --working-directory=/home/chad/projects/margin-trading \
  -E W=8 -E K=2 \
  -p StandardOutput=append:/home/chad/projects/margin-trading/research/growth-etf-screening/results/logs/study-chain.log \
  -p StandardError=append:/home/chad/projects/margin-trading/research/growth-etf-screening/results/logs/study-chain.log \
  /bin/bash research/growth-etf-screening/chains/study.sh

# single stages (as the chain runs them)
npm run getf -- launch --unit getf-screen-C19 --wait -- screen --cutoff C19 --concurrency 2 --workers 8
npm run getf -- launch --unit getf-select-C19 --wait -- select --cutoff C19
git add research/growth-etf-screening/results/folds/C19/selection.json research/growth-etf-screening/results/{search,qualify}/C19 … && git commit
npm run getf -- launch --unit getf-eval-C19 --wait -- fold-eval --cutoff C19
#   … C21, C23 the same …
npm run getf -- launch --unit getf-sequential --wait -- sequential
npm run getf -- launch --unit getf-screen-C24 --wait -- screen --cutoff C24 --concurrency 2 --workers 8
npm run getf -- launch --unit getf-transfer --wait -- transfer --concurrency 2 --workers 8
npm run getf -- launch --unit getf-final-select --wait -- final-select
npm run getf -- launch --unit getf-diagnostics --wait -- diagnostics --workers 8
npm run getf -- launch --unit getf-freeze-selection --wait -- freeze-selection
git add research/growth-etf-screening/FROZEN_SELECTION.json research/growth-etf-screening/results && git commit
npm run getf -- launch --unit getf-validate --wait -- validate --workers 8          # FULL, once

# integrity, compute, tables and tests
npm run getf -- verify
npm run getf -- ledger
npm run getf -- audit-compute --write        # results/archive-manifest.json (archives kept outside git)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/growth-etf-screening/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/growth-etf-screening/tests/*.test.ts
```
