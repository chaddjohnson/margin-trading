# Complementary ETFs for the frozen All-lowDd D1 allocator (2026-10-24)

Can one or two further ETFs, each with its own D1 phenotype, add **executable** shared-pool value to the frozen
All-lowDd shadow allocator when its capital would otherwise sit idle? A bounded three-stage study of GDX, XOP, EWZ,
TLT (high priority) and XLE, XLU, GLD (lower priority).

**Answer: no addition.** The predeclared training-only screen selected none of the seven: the dips that occur while
the All-lowDd pool is idle are few and do not pay for 11% financing and 5 bps costs once their single best episode is
removed, and the profitable dips coincide with the existing books' trades. Minute-level D1 diagnostics agree (every
candidate's fundable trades displace more baseline P&L than they add). Nothing was optimized, no allocator scenario
exists, nothing was promoted. The required corporate-action repair was completed: XOP's 1:4 reverse split and the
XLE/XLU/XLY 2:1 splits are now verified, recorded and tested on both evaluation paths. See
[RECOMMENDATION.md](RECOMMENDATION.md).

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — every rule, threshold and gate, frozen (sha256 `4b7c6e94…`) before any candidate
   figure existed.
2. [DATA_AND_CORPORATE_ACTION_AUDIT.md](DATA_AND_CORPORATE_ACTION_AUDIT.md) — the 16 canonical files, their windows,
   the six splits (evidence, registry, continuity), invariance tests, the discontinuity scan, distributions, affected
   earlier work.
3. [OPPORTUNITY_SCREEN.md](OPPORTUNITY_SCREEN.md) — Stage A: all seven candidates against the predeclared rubric, and
   the post hoc minute-level diagnostics.
4. [OPTIMIZATION_AND_FREEZE.md](OPTIMIZATION_AND_FREEZE.md) + [FROZEN_CANDIDATES.json](FROZEN_CANDIDATES.json) —
   Stage B (nothing to optimize) and the frozen null outcome (manifest `ae035671…`).
5. [INCREMENTAL_ALLOCATOR_RESULTS.md](INCREMENTAL_ALLOCATOR_RESULTS.md) — Stage C: the old-horizon regression gate
   (exact) and the baseline; no additive scenario.
6. [HOLDOUT_AND_FINAL.md](HOLDOUT_AND_FINAL.md) — nothing of a candidate was evaluated after training.
7. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, tests, commands, unchanged frozen artifacts.
8. [RECOMMENDATION.md](RECOMMENDATION.md) — the decision memo.

## Reproducing

Node 24, the canonical files `data/<SYMBOL>/data.csv` (no physical partition files exist; windows come from
`data/partitions.json`). Every command below was run for this study, in this order:

```bash
npm run datasets -- verify                         # 16 canonical files against data/partitions.json
npm run market-events -- verify                    # the distribution ledger and all six recorded splits
npm run complementary-etf-d1 -- audit              # results/audit/: coverage, splits, discontinuities, liquidity
npm run complementary-etf-d1 -- freeze-protocol    # once (refuses again): results/protocol_freeze.json
npm run complementary-etf-d1 -- screen             # Stage A, training only: results/stageA/
npm run complementary-etf-d1 -- diagnose           # post hoc D1 diagnostics, training only: results/stageA-diagnostics/
npm run complementary-etf-d1 -- parity             # D1 file = research engine on each candidate's training data
npm run complementary-etf-d1 -- regression         # the four frozen controls on --dataset all --end 2025-10-13
npm run complementary-etf-d1 -- freeze-candidates  # once (refuses again): FROZEN_CANDIDATES.json
npm run complementary-etf-d1 -- stage-c            # verifies the manifest; no candidate → nothing unlocked
npm test                                           # includes this study's tests and the new split tests
```

`screen`, `diagnose` and `parity` read only the training partition, through `optimizationDataset` /
`loadDatasetSessions({ access: 'optimization' })`, which refuses holdout, final and all before reading. `regression`
is the only command here that reads past 2023 (to 2025-10-13, the frozen protocol's old horizon) and only for the
frozen controls. Every result is deterministic: a full rerun reproduced every JSON record (apart from timestamps)
and every CSV byte for byte.

**Isolated windows versus one continuous run.** A `training`, `holdout` or `final` run (standalone strategy or
allocator `--dataset`) is isolated: observational warm-up from earlier sessions, then a flat start. Period figures of
an ongoing portfolio come from one continuous `--dataset all` run attributed to the windows (`segments.csv`), never
from isolated runs added together. Without `--dataset` the allocator runs its frozen protocol on the pinned legacy
archive (`npm run legacy-archive -- verify`); that default is unchanged.

## Results directory

| Path | Content |
|---|---|
| `results/protocol_freeze.json` | the protocol's sha256, time and git state at its freeze |
| `results/audit/` | `audit.json`, `AUDIT_TABLES.md` |
| `results/stageA/` | `screen.json`, `SCREEN_TABLES.md`, `proxies/<ETF>-p15.csv` and `-p20.csv`, `episodes/<ETF>.csv`, `baseline-fixed-training/` (the All-lowDd training pool run) |
| `results/stageA-diagnostics/` | `diagnostics.json`, `DIAGNOSTICS.md`, `d1-trades.csv` (every classified D1 trade) |
| `results/parity/` | `parity.json`, `<ETF>/file-output/` (the D1 file's own outputs on training) |
| `results/regression/` | `regression.json`, `<control>/` (the four canonical-path runs) |
| `results/stageC/status.json` | the manifest check: no candidate, nothing run |
