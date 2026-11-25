# Run commands — P6-TSLA (from the repository root `/home/chad/projects/margin-trading`)

All Node processes start as `node --no-maglev …` (the npm scripts do). Official stages run only through
`npm run tsla -- <command>` (`src/gpu-backend/officialRunner.ts`: purpose official-optimization, the study preflight, the
official GPU gate in every evaluating stage). Non-official tools declare `GPU_POLICY_PURPOSE`.

## Phase 0A — Priority 5 archive preservation (complete)

```bash
python3 -I research/tsla-d1-growth/storage/tools/p5zstd.py inventory --repo . --out research/tsla-d1-growth/storage/INVENTORY.json
systemd-run --user --unit=tsla-p5-zstd --collect -p MemoryMax=8G -p Restart=no \
  -p StandardOutput=append:$PWD/.cache/tsla-d1-growth/logs/p5-zstd.log -p StandardError=append:$PWD/.cache/tsla-d1-growth/logs/p5-zstd.log \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory=$PWD /bin/bash $PWD/research/tsla-d1-growth/storage/tools/chain.sh $PWD
python3 -I research/tsla-d1-growth/storage/tools/p5zstd.py compress --repo . --inventory research/tsla-d1-growth/storage/INVENTORY.json \
  --actions research/tsla-d1-growth/storage/ACTIONS.jsonl --scratch .cache/tsla-d1-growth/storage-scratch --job C24-qualify-informed
python3 -I research/tsla-d1-growth/storage/tools/p5zstd.py final --repo . --inventory research/tsla-d1-growth/storage/INVENTORY.json \
  --actions research/tsla-d1-growth/storage/ACTIONS.jsonl --out research/tsla-d1-growth/storage/POST_VERIFY.json
python3 -I research/tsla-d1-growth/storage/tools/other_caches.py --repo . --out research/tsla-d1-growth/storage/OTHER_CACHE_AUDIT.json
```

## Phase 2 — TSLA data (complete)

```bash
( set -a; . ./.env; set +a; OUTPUT_DIR=data scripts/download.sh TSLA 2016-01-04 2026-10-30 ) > research/tsla-d1-growth/cache/logs/download.log 2>&1
npm run datasets -- import TSLA --dry-run
npm run datasets -- import TSLA --keep-source
npm run datasets -- verify TSLA
rm -- data/TSLA.csv                       # after its sha256 was re-checked equal to the canonical rows
npm run market-events -- verify           # lists the two TSLA gaps as UNRECORDED (the central ledger is not changed)
for c in pins audit suitability; do GPU_POLICY_PURPOSE=diagnostic node --no-maglev --max-old-space-size=12288 --experimental-transform-types \
  --disable-warning=ExperimentalWarning src/gpu-backend/legacyRunner.ts tsla-data tools/tsla-d1-growth/data.ts $c; done
```

## Phase 5 — engineering gates and the pilot (non-official)

```bash
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/tsla-d1-growth/derive.ts   # search.ts
GPU_POLICY_PURPOSE=parity-test npm run tsla-eng -- e1
GPU_POLICY_PURPOSE=parity-test npm run tsla-eng -- e2
for g in e3 e4 e5 e6; do tools/tsla-d1-growth/launch.sh tsla-$g $PWD/research/tsla-d1-growth/cache/logs/$g.log --wait -- \
  /usr/bin/env GPU_POLICY_PURPOSE=parity-test $(command -v npm) run tsla-eng -- $g; done
tools/tsla-d1-growth/launch.sh tsla-pilot $PWD/research/tsla-d1-growth/cache/logs/pilot.log --wait -- \
  /usr/bin/env GPU_POLICY_PURPOSE=benchmark $(command -v npm) run tsla-eng -- pilot --step lanes
GPU_POLICY_PURPOSE=benchmark npm run tsla-eng -- pilot --step summary
# E7 + E8: the study's and the reused suites, npm test, tsc, eslint, every preflight, Strategy Lab (parity, typecheck, lint,
# Vitest, scratch build, Playwright e2e with one rerun), state/strategy-lab fingerprinted; then the recorder
tools/tsla-d1-growth/launch.sh tsla-tests $PWD/research/tsla-d1-growth/cache/logs/tests.log --wait -- /bin/bash $PWD/research/tsla-d1-growth/chains/tests.sh
( cd apps/strategy-lab && STRATEGY_LAB_STATIC_DIR=$PWD/../../research/tsla-d1-growth/cache/strategy-lab-scratch/dist npx playwright test \
  > ../../research/tsla-d1-growth/results/engineering/tests/strategy-lab-e2e-rerun2.txt 2>&1 )   # (and -rerun3: AMENDMENTS.md E1)
python3 -I tools/tsla-d1-growth/tests-record.py      # writes E7-tests.json, E8-regression.json
npm run research-preflight -- --study research/tsla-d1-growth
npm run tsla -- gates
npm run tsla -- freeze
```

## Phase 6 — the official chain (fail-fast, idempotent, resumable)

```bash
tools/tsla-d1-growth/launch.sh tsla-chain $PWD/research/tsla-d1-growth/cache/logs/chain.log -- /bin/bash $PWD/research/tsla-d1-growth/chains/chain.sh
# a single stage (as the chain runs it), e.g.:
npm run tsla -- search --cutoff C19 --arm D --part broad [--resume]
npm run tsla -- round --cutoff C19 --arm D --k 1
npm run tsla -- qualify --cutoff C19 --arm D --stage broad
npm run tsla -- ledger
npm run tsla -- verify      # every seal re-hashed
```

## Phase 7 — report-only diagnostics, tables, reports and the handoff (after the outcome)

```bash
# report-only diagnostics of the frozen subjects (non-official; the door guard refuses FULL before the committed validation)
for c in bh tail lots; do GPU_POLICY_PURPOSE=diagnostic npm run tsla-diag -- $c; done
tools/tsla-d1-growth/launch.sh tsla-nbhd $PWD/research/tsla-d1-growth/cache/logs/nbhd.log --wait -- \
  /usr/bin/env GPU_POLICY_PURPOSE=diagnostic $(command -v npm) run tsla-diag -- nbhd
# (engineering test of the same tool during the chain, on D19 with C19's selection; outputs in cache/diag-test only)
for c in bh tail lots nbhd; do TSLA_DIAG_TEST=D19 GPU_POLICY_PURPOSE=diagnostic npm run tsla-diag -- $c; done
# tables (JSON, CSV, Markdown) and the per-arm reports from the sealed records
GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/tsla-d1-growth/analyze.ts
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/tsla-d1-growth/tables-md.ts
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/tsla-d1-growth/arm-reports.ts
# totals of the official GPU jobs (attestations, parity mini-sets, receipts; exit 0 only if every job is complete with
# 0 CPU-scored, 0 failed and 0 failed attestation checks) → reports/tables/gpu-jobs.json, GPU_JOBS.md
python3 -I tools/tsla-d1-growth/gpu-jobs.py
# SEARCH_AND_CONVERGENCE_REPORT.md = reports/narrative/SEARCH.md + tables from search-summary.json, lanes.csv, gpu-jobs.json
python3 -I tools/tsla-d1-growth/search-report.py
# this study's job archives: verification of every compressed archive (read-only)
python3 -I research/tsla-d1-growth/storage/tools/jobzstd.py final --repo . --actions research/tsla-d1-growth/storage/TSLA_JOB_ACTIONS.jsonl \
  --out research/tsla-d1-growth/storage/TSLA_JOB_POST_VERIFY.json
# the handoff ZIP: after the final commit is pushed and git ls-remote equals HEAD
tools/tsla-d1-growth/bundle.sh <scratch dir> $(git rev-parse HEAD)
```
