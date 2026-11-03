# Portfolio-aware D1 optimization of complementary ETF books (2026-10-24)

Can a D1 book on GDX, XOP, EWZ, TLT, XLE, XLU or GLD — its eight D1 parameters chosen **standalone-first** (Track S)
or for its **incremental executable effect on the shared pool** (Track P) — improve the frozen **All-lowDd shadow**
allocator (VGT `primary`, XBI/XRT/KRE `lowDd`)? One bounded study: a common 512-vector pool on all seven candidates,
up to three finalists refined by both tracks with equal budgets, at most eight configurations, one freeze, one
continuous evaluation.

**Answer.** Under the frozen rules one configuration was accepted: **All-lowDd plus a portfolio-aware D1 book on GDX**
(X 27.4% Y 0.4% stop 7.1% hold 18 L 100 buffer 3.6% P 19.1% W 81). Fixed $100k at 5 bps: +$146,293 on training
(in-sample), **+$24,581 in the holdout and +$31,089 in the final window** (one continuous run, no S0 lot displaced
after 2023); 20% portfolio +8.1 / +7.3 points of return in holdout / final and a lower historical maximum drawdown
(29.67% vs 34.65% daily). The evidence is thin — seven post-training GDX lots, two of which carry the gain, in a
strong gold-miner market — so it is an **optional addition for a forward test**, and All-lowDd unchanged remains
defensible. The other nominee (XOP) lost its training gain entirely after 2023. Portfolio-aware selection beat
standalone-first selection on every finalist in training and on GDX out of sample. See
[RECOMMENDATION.md](RECOMMENDATION.md).

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — every rule, budget, gate and threshold, frozen (sha256 `ba67af02…`,
   2026-10-24T14:54:55Z) before any candidate figure was computed.
2. [DATA_AND_BASELINE_AUDIT.md](DATA_AND_BASELINE_AUDIT.md) — data, splits, distributions, the reproduced controls.
3. [CACHE_VS_FULL_ENGINE.md](CACHE_VS_FULL_ENGINE.md) — the N-book engine, the cached replay, the parity gates.
4. [OPPORTUNITY_MAP.md](OPPORTUNITY_MAP.md) — the S0 pool's minute-level occupancy and each candidate's real D1
   phenotypes against it.
5. [CANDIDATE_D1_SEARCH.md](CANDIDATE_D1_SEARCH.md) — the common pool on all seven candidates, both tracks, the
   finalist rule.
6. [PORTFOLIO_AWARE_OPTIMIZATION.md](PORTFOLIO_AWARE_OPTIMIZATION.md) — Stage B (the two tracks' searches and robust
   selections) and Stage C (configurations, training gates).
7. [FROZEN_SELECTION.json](FROZEN_SELECTION.json) — the one-time manifest written before any evaluation.
8. [HOLDOUT_FINAL_RESULTS.md](HOLDOUT_FINAL_RESULTS.md) — the continuous `all` evaluation.
9. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — code, tests, parity, determinism, untouched frozen files.
10. [RECOMMENDATION.md](RECOMMENDATION.md).

## Runbook (every command was run for this study, in this order)

Node 24 (`npm run` scripts use `--experimental-transform-types`), the canonical files `data/<SYMBOL>/data.csv`
(windows from `data/partitions.json`).

```bash
npm run portfolio-aware-d1 -- freeze-protocol     # once: results/protocol_freeze.json (refuses a second time)
npm run portfolio-aware-d1 -- audit               # datasets/market-events/legacy-archive verify, calendars, splits, coverage
npm run portfolio-aware-d1 -- controls            # the §9 controls: legacy path, canonical path, full history, S0 training
npm run portfolio-aware-d1 -- parity              # gates E1–E3 (frozen = N-book engine; replay = N-book engine)
npm run portfolio-aware-d1 -- stage-a             # the common pool on 7 ETFs × 4 costs; the finalist rule
npm run portfolio-aware-d1 -- opportunity-map     # descriptive map (S0 occupancy, declines, representative phenotypes)
npm run portfolio-aware-d1 -- stage-b             # both tracks' NSGA-II per finalist, robust selection, E4
npm run portfolio-aware-d1 -- stage-c             # configurations, full-engine training runs (both modes), gates
npm run portfolio-aware-d1 -- freeze-selection    # once: FROZEN_SELECTION.json (refuses a second time)
npm run portfolio-aware-d1 -- evaluate            # once: the continuous `all` evaluation after the manifest verifies
npm run portfolio-aware-d1 -- evaluate --confirm  # the deterministic confirmation re-run
npm run portfolio-aware-d1 -- post-hoc            # non-decisional: every post-training signal of the new books
npm run portfolio-aware-d1 -- tables stage-a opportunity stage-b stage-c evaluation   # results/tables/*.md
npm test
```

**Data permissions.** `stage-a`, `opportunity-map`, `stage-b` and `stage-c` read the training partition only, through
`loadDatasetSessions({ access: 'optimization' })`, which refuses any other partition before a byte is read
(`src/portfolio-aware-d1/data.ts`, `trainingUniverse`). `audit` reads every row for integrity only. `controls` and
`parity` read `all` for **S0 and VGT alone** (no candidate; `baselineUniverse` cannot load one). `evaluate` reads `all`
for the frozen configurations only after `FROZEN_SELECTION.json`'s body hash verifies (`evaluationUniverse`).

**Fixed and portfolio modes.** Every configuration runs on the N-book engine (`src/portfolio-aware-d1/nbook/`):
`mode: 'fixed'` is the $100,000 pool (one lot at a time, simple 11% interest, no compounding); `mode: 'portfolio'` is
the $300,000 60/40 VOOG/VGT account borrowing 20% of current equity per lot, profits reinvested 60/40, losses funded
by proportional core sales, VGT/VOOG distributions from the verified ledger. The fast path (traces + replay) exists
for the fixed mode only and is used for search; everything reported for a configuration comes from the full engine.

**Isolated windows versus one continuous run.** Holdout and final figures are attributions of one continuous `all`
run (every position, setup, stop, continuation window, debt and drawdown carried across 2024-01-01 and 2025-10-17),
never isolated backtests added together.

## Results directory

| Path | Content |
|---|---|
| `results/protocol_freeze.json` | the protocol's sha256, time and git state at the freeze |
| `results/audit/audit.json` | the integrity audit |
| `results/controls/` | `controls.json`; `legacy-runs/<key>/` the frozen writer's CSVs (byte-identical to the committed ones) |
| `results/parity/parity.json` | every E1–E3 comparison with its difference count and timings |
| `results/stageA/` | `pool.json` (the design and controls), `evaluations/<ETF>.jsonl` (every vector × cost, both modes), `run.json`, `finalists.json` |
| `results/opportunity/` | `opportunity.json`, `s0-lots.csv`, `s0-signals.csv`, `representative-trades.csv` |
| `results/stageB/<ETF>/track-<S\|P>/` | `evaluations.jsonl`, `probes.jsonl`, `search.json`, `selection.json`; `champions.json` |
| `results/stageC/` | `stageC.json` (design, runs, ladder, gates, E4), `runs/<config>/*-lots.csv` |
| `results/evaluation/` | `evaluation.json`, `confirmation.json`, `bridges/<config>.csv`, `runs/<config>/*-{lots,daily}.csv` |
| `results/tables/` | generated Markdown tables |

Git-ignored but kept on disk (deterministic and regenerable, ~90 MB): `results/stageA/evaluations/*.jsonl`,
`results/stageB/*/track-*/*.jsonl`, and `results/controls/legacy-runs/` (byte-identical to the committed frozen runs).

After the study, `npm run portfolio-aware-d1 -- run --config <key> --mode fixed|portfolio --dataset
training|holdout|final|all --cost <bps>` runs any frozen configuration (results to
`evaluations/portfolio-aware-d1/`, never into `research/`), and the accepted GDX book is registered as
`config/phenotypes/D1/GDX.json` (`--phenotype portfolioAware`).
