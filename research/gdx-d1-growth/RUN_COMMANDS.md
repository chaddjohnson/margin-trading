# Run commands — P8-GDX (from the repository root `/home/chad/projects/margin-trading`)

All Node processes start as `node --no-maglev …` (the npm scripts do). Official stages run only through
`npm run gdx8 -- <command>` (`src/gpu-backend/officialRunner.ts`: purpose official-optimization, the study preflight, the
official GPU gate in every evaluating stage). Non-official tools declare `GPU_POLICY_PURPOSE`.

## Phase 0 — the identity-join module (engineering; complete)

```bash
git switch -c research/gdx-d1-growth 421e4c87                      # P6-TSLA's final commit (accepted GPU Phase 7 lineage)
git cherry-pick -x aca31b5fd595850050ca629ef3ac9208a84c9894         # the module and its tests only → a33c6ff1
git diff aca31b5f HEAD -- src/research-outcome                     # empty: byte-identical
git merge-tree --write-tree --merge-base=aca31b5f^ main aca31b5f   # dry run onto main: clean (report only; main untouched)
GPU_POLICY_PURPOSE=parity-test node --no-maglev --test src/research-outcome/tests/identityJoin.test.ts   # 12/12
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7
```

## Phase 1 — data (complete; nothing downloaded or bought)

```bash
P1=$(date -u -d 2006-05-01 +%s); P2=$(date -u -d 2025-01-01 +%s)
curl -sS -m 60 -A "Mozilla/5.0" -o research/gdx-d1-growth/cache/independent/yahoo-GDX-daily-2006-2024.json \
  "https://query1.finance.yahoo.com/v8/finance/chart/GDX?period1=$P1&period2=$P2&interval=1d&events=div%7Csplit&includeAdjustedClose=true"
for c in pins audit suitability; do GPU_POLICY_PURPOSE=diagnostic node --no-maglev --max-old-space-size=12288 --experimental-transform-types \
  --disable-warning=ExperimentalWarning src/gpu-backend/legacyRunner.ts gdx8-data tools/gdx-d1-growth/data.ts $c; done
```

## Phase 2–4 — engineering gates, the pilot, the freeze (non-official)

```bash
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-d1-growth/derive.ts   # search.ts
GPU_POLICY_PURPOSE=parity-test npm run gdx8-eng -- e1
GPU_POLICY_PURPOSE=parity-test npm run gdx8-eng -- e2
tools/gdx-d1-growth/launch.sh gdx8-e3 $PWD/research/gdx-d1-growth/cache/logs/e3.log --wait -- \
  /usr/bin/env GPU_POLICY_PURPOSE=parity-test $(command -v npm) run gdx8-eng -- e3
/bin/bash research/gdx-d1-growth/chains/gates.sh            # E4, E5, E6 and the pilot (lanes + summary), fail-fast
GPU_POLICY_PURPOSE=parity-test npm run gdx8-port -- test   # portfolio tool engineering test (D24, the three references; cache only)
tools/gdx-d1-growth/launch.sh gdx8-tests $PWD/research/gdx-d1-growth/cache/logs/tests.log --wait -- /bin/bash $PWD/research/gdx-d1-growth/chains/tests.sh
python3 -I tools/gdx-d1-growth/tests-record.py              # writes E7-tests.json, E8-regression.json
python3 -I tools/gdx-d1-growth/adoption.py --repo . --adopted <UTC>
npm run research-preflight -- --study research/gdx-d1-growth
npm run gdx8 -- gates
npm run gdx8 -- freeze
```

## Phase 3/6 — the official chain (fail-fast, idempotent, resumable)

```bash
tools/gdx-d1-growth/launch.sh gdx8-chain $PWD/research/gdx-d1-growth/cache/logs/chain.log -- /bin/bash $PWD/research/gdx-d1-growth/chains/chain.sh
# a single stage (as the chain runs it), e.g.:
npm run gdx8 -- search --cutoff C19 --arm D --part broad [--resume]
npm run gdx8 -- round --cutoff C19 --arm D --k 1
npm run gdx8 -- qualify --cutoff C19 --arm D --stage broad
npm run gdx8 -- search --cutoff C24 --arm D --part informed
npm run gdx8 -- qualify --cutoff C24 --arm D --stage informed
npm run gdx8 -- pairs-informed --cutoff C24
npm run gdx8 -- qualify --cutoff C24 --arm C --stage fixed-informed
npm run gdx8 -- ledger
GPU_POLICY_PURPOSE=official-optimization npm run gdx8 -- verify      # every seal re-hashed (no evaluation)
```

## Phase 5–7 — report-only diagnostics, the total-portfolio stage, reports and the handoff (after the outcome)

```bash
# independent distribution events for the portfolio stage (after the sealed outcome)
P1=$(date -u -d 2016-01-01 +%s); P2=$(date -u -d 2026-11-01 +%s)
for s in VOOG VGT GDX; do curl -sS -m 60 -A "Mozilla/5.0" -o research/gdx-d1-growth/cache/independent/yahoo-$s-dividends-2016-2026.json \
  "https://query1.finance.yahoo.com/v8/finance/chart/$s?period1=$P1&period2=$P2&interval=1mo&events=div%7Csplit"; done
tools/gdx-d1-growth/launch.sh gdx8-port $PWD/research/gdx-d1-growth/cache/logs/port.log --wait -- \
  /usr/bin/env GPU_POLICY_PURPOSE=diagnostic $(command -v npm) run gdx8-port -- run
# the four report-only diagnostics in one contained, fail-fast unit (as executed 2026-11-27; equivalent to the two lines below)
tools/gdx-d1-growth/launch.sh gdx8-diag $PWD/research/gdx-d1-growth/cache/logs/diag.log --wait -- /bin/bash $PWD/tools/gdx-d1-growth/diag.sh
#   for c in bh tail lots; do GPU_POLICY_PURPOSE=diagnostic npm run gdx8-diag -- $c; done
#   tools/gdx-d1-growth/launch.sh gdx8-nbhd … -- /usr/bin/env GPU_POLICY_PURPOSE=diagnostic $(command -v npm) run gdx8-diag -- nbhd
# independent outcome reconciliation and its mutation tests (scratch copies; any scratch directory)
python3 -I tools/gdx-d1-growth/reconcile.py
python3 -I tools/gdx-d1-growth/reconcile-mutations.py <scratch dir>
GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-d1-growth/analyze.ts
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-d1-growth/tables-md.ts
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-d1-growth/arm-reports.ts
python3 -I tools/gdx-d1-growth/gpu-jobs.py; python3 -I tools/gdx-d1-growth/search-report.py
python3 -I tools/gdx-d1-growth/portfolio-md.py   # TOTAL_PORTFOLIO_COMPARISON.md (narrative reports/narrative/PORTFOLIO.md + tables)
python3 -I tools/gdx-d1-growth/final-md.py       # FINAL_CANDIDATES.md and OUTCOME_IDENTITY_RECONCILIATION.md
# after the commit is pushed and `git ls-remote origin research/gdx-d1-growth` equals HEAD:
/bin/bash tools/gdx-d1-growth/bundle.sh <scratch dir> <remote-verified HEAD>
```
