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
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/tsla-d1-growth/tests/*.test.ts' --test-reporter=tap > research/tsla-d1-growth/cache/logs/E7.tap
GPU_POLICY_PURPOSE=parity-test npm run tsla-eng -- record --gate E7 --log research/tsla-d1-growth/cache/logs/E7.tap --known 0
npm test -- --test-reporter=tap > research/tsla-d1-growth/cache/logs/E8.tap   # then record --gate E8 --known <n>
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
