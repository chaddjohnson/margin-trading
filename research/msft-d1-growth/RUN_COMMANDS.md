# Run commands — P9-MSFT (from the repository root `/home/chad/projects/margin-trading`)

All Node processes start as `node --no-maglev …` (the npm scripts do). Official stages run only through
`npm run msft9 -- <command>` (`src/gpu-backend/officialRunner.ts`: purpose official-optimization, the study preflight, the
official GPU gate in every evaluating stage). Non-official tools declare `GPU_POLICY_PURPOSE`.

## Phase 0 — lineage and the evaluator (complete)

```bash
git switch -c research/msft-d1-growth main                         # main = ef0014bc (standard 5.0.0, GPU Phase 9, TSLA/GDX code)
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/msft-d1-growth/derive.ts   # search.ts
```

## Phase 1 — data (complete; existing Alpaca SIP entitlement, nothing bought)

```bash
( set -a; . ./.env; set +a; OUTPUT_DIR=data scripts/download.sh MSFT 2016-01-04 2026-10-30 ) > research/msft-d1-growth/cache/logs/download.log 2>&1
npm run datasets -- import MSFT --dry-run
npm run datasets -- import MSFT --keep-source
npm run datasets -- verify MSFT
rm data/MSFT.csv                                                   # after sha256(data/MSFT.csv) = sha256(data/MSFT/data.csv)
npm run datasets -- prefix MSFT --through 2026-10-30               # the standard 4.0.0 data pin (= the whole file)
P1=$(date -u -d 1986-03-13 +%s); P2=$(date -u -d 2025-01-01 +%s)
curl -sS -m 60 -A "Mozilla/5.0" -o research/msft-d1-growth/cache/independent/yahoo-MSFT-daily-1986-2024.json \
  "https://query1.finance.yahoo.com/v8/finance/chart/MSFT?period1=$P1&period2=$P2&interval=1d&events=div%7Csplit&includeAdjustedClose=true"
for c in pins audit suitability; do GPU_POLICY_PURPOSE=diagnostic node --no-maglev --max-old-space-size=12288 --experimental-transform-types \
  --disable-warning=ExperimentalWarning src/gpu-backend/legacyRunner.ts msft9-data tools/msft-d1-growth/data.ts $c; done
```

## Phase 2–4 — engineering gates, the pilot, the freeze (non-official)

```bash
GPU_POLICY_PURPOSE=parity-test npm run msft9-eng -- e1
GPU_POLICY_PURPOSE=parity-test npm run msft9-eng -- e2
tools/msft-d1-growth/launch.sh msft9-e3 $PWD/research/msft-d1-growth/cache/logs/e3.log --wait -- \
  /usr/bin/env GPU_POLICY_PURPOSE=parity-test $(command -v npm) run msft9-eng -- e3
/bin/bash research/msft-d1-growth/chains/gates.sh                  # E4, E5, E6 and the pilot (lanes + summary), fail-fast
python3 -I tools/msft-d1-growth/adoption.py --repo . --adopted <UTC>
npm run research-preflight -- --study research/msft-d1-growth
tools/msft-d1-growth/launch.sh msft9-tests $PWD/research/msft-d1-growth/cache/logs/tests.log --wait -- /bin/bash $PWD/research/msft-d1-growth/chains/tests.sh
npm run msft9 -- gates
npm run msft9 -- freeze
```

## Phase 5 — the official chain (fail-fast, idempotent, resumable; one cutoff per launch)

```bash
tools/msft-d1-growth/launch.sh msft9-chain-C19 $PWD/research/msft-d1-growth/cache/logs/chain-C19.log --wait -- /bin/bash $PWD/research/msft-d1-growth/chains/chain.sh C19
# … then C21, C23, C24 the same way (the chain refuses a cutoff whose predecessor is not sealed and committed)
# a single stage (as the chain runs it), e.g.:
npm run msft9 -- search --cutoff C19 --arm D --part broad [--resume]
npm run msft9 -- round --cutoff C19 --arm D --k 1
npm run msft9 -- qualify --cutoff C19 --arm D --stage broad
npm run msft9 -- ledger
GPU_POLICY_PURPOSE=official-optimization npm run msft9 -- verify      # every seal re-hashed (no evaluation)
```

## Phase 6–8 — report-only diagnostics, reports and the handoff (after the outcome)

Recorded when executed (this file is extended, never rewritten for the earlier phases).
