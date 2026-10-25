# Unrestricted 16-ETF subset selection with joint portfolio-aware D1 optimization (2026-10-25)

Which nonempty subset of the 16 ETF datasets (`EWZ GDX GLD IWM IWN KRE TLT VGT VOOG XBI XLE XLF XLU XLY XOP XRT`), each
member with its own eight D1 parameters, gives the best robust result as **one causal shared-margin pool**? Membership
and parameters were searched jointly; no book was mandatory. One bounded study: a neutral library of 1,045 vectors on
every ETF, 26,597 unrestricted discovery evaluations (16 greedy paths, 8 NSGA-II islands), 9,916 joint-refinement
evaluations, a 20-configuration robustness battery, preregistered gates, one freeze.

**Answer: no new combination advances; the frozen benchmarks are retained** (B5 All-lowDd + GDX as the optional forward
test, B4 All-lowDd as the default). Every shortlisted configuration — and every benchmark, B5 included — failed the
preregistered joint-parameter plateau gate: one small step of every parameter of every member leaves a median of only
20–73% of the training net (B5 55%), against the 75% required. The best training result, **{XBI, XRT, KRE, GDX}**
(B5's books without VGT, $467,806 vs B5's $388,489 at a lower drawdown), failed that gate alone; its edge is a re-timed
2020 built mostly from earlier studies' training-optimized vectors, it is the maximum of 36,513 correlated trials, and it
was not evaluated on later data. No subset of 12 or more ETFs met the $35,000 drawdown limit. See
[RECOMMENDATION.md](RECOMMENDATION.md).

## Key figures (training 2016-01-04 → 2023-12-29, fixed $100,000 per lot, 5 bps per side)

| Configuration | Net | Minute DD | Joint-neighbourhood median ÷ net | 20% portfolio max % DD (daily / minute) | Training gates |
|---|---:|---:|---:|---|---|
| B1 VGT D1 alone | $135,359 | $19,534 | 0.70 | 32.78% / 35.21% | fails T6, T8, T9 |
| B4 All-lowDd | $242,196 | $28,659 | 0.58 | 34.65% / 37.01% | fails T6, T7, T8, T9 |
| B5 All-lowDd + GDX | $388,489 | $26,510 | 0.55 | 29.67% / 31.09% | fails T6, T8 |
| R1 XBI XRT KRE GDX (best of the search) | $467,806 | $21,626 | 0.53 | 29.01% / 30.33% | fails T6 only |
| R5 XBI XRT GDX IWN XLY | $398,276 | $17,281 | 0.56 | 27.21% / 28.54% | fails T6, T8 |
| R4 XBI KRE GDX XLF | $371,690 | $21,691 | 0.67 | 29.01% / 30.42% | fails T6, T8 |

The benchmarks' continuous full-history results (inspected earlier, reproduced to the cent) are in
[HOLDOUT_FINAL_RESULTS.md](HOLDOUT_FINAL_RESULTS.md); nothing of this study was evaluated after training.

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — every rule, budget, gate and threshold, frozen (sha256 `2314dfbf…`,
   2026-10-25T06:52:12Z) before any 16-ETF candidate figure; no amendment.
2. [DATA_AND_ENGINE_AUDIT.md](DATA_AND_ENGINE_AUDIT.md) — the 16 datasets, splits, VOOG's sparse bars, distributions, the
   doors, the benchmarks reproduced exactly.
3. [CACHE_AND_CAUSAL_PARITY.md](CACHE_AND_CAUSAL_PARITY.md) — the reused engines, why traces are shared across subsets,
   lookahead immunity, 268 parity comparisons with 0 differences, determinism.
4. [SEARCH_COVERAGE.md](SEARCH_COVERAGE.md) — budgets declared and used, all 16 ETFs' coverage, cardinalities, operators,
   where the leaders came from, multiple comparisons.
5. [JOINT_SEARCH_RESULTS.md](JOINT_SEARCH_RESULTS.md) — the shortlist, the gates, the leading configuration and its
   timing interaction, the plateau finding, the dependence questions.
6. [FROZEN_SELECTION.json](FROZEN_SELECTION.json) — the one-time manifest: outcome "no advancement", 0 nominees
   (manifest `699e2186…`, 2026-10-25T07:34:26Z).
7. [HOLDOUT_FINAL_RESULTS.md](HOLDOUT_FINAL_RESULTS.md) — why nothing was evaluated; the benchmarks for orientation.
8. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, tests, parity, determinism, untouched frozen files,
   limitations.
9. [RECOMMENDATION.md](RECOMMENDATION.md).

## Runbook (every command was run for this study, in this order)

Node 23.6 as run (`npm run` scripts use `--experimental-transform-types`), the canonical `data/<SYMBOL>/data.csv` files,
windows from `data/partitions.json`.

```bash
npm run joint-16-etf-d1 -- freeze-protocol    # once: results/protocol_freeze.json (refuses a second time)
npm run joint-16-etf-d1 -- audit              # 1. verify the canonical inputs: verifiers, calendars, splits, coverage
npm run joint-16-etf-d1 -- controls           # 1. reproduce B1/B4/B5/C0 on training and the full history
npm run joint-16-etf-d1 -- parity             # 2. engine/cache parity P0–P2 (blocks the search on any difference)
npm run joint-16-etf-d1 -- search             # 3. the training-only search: library, discovery, refinement, robustness
npm run joint-16-etf-d1 -- diagnostics        #    post hoc, non-decisional explanation of the gate outcome
npm run joint-16-etf-d1 -- determinism        # 2./3. re-run Stages L and D and compare their logs byte for byte
npm run joint-16-etf-d1 -- freeze-selection   # 4. once: FROZEN_SELECTION.json (refuses a second time)
npm run joint-16-etf-d1 -- evaluate           # 4. once (here: records that no nominee exists); --confirm re-runs
npm run joint-16-etf-d1 -- tables             # results/tables/*.md
npm test
```

5. A frozen configuration on any partition, without touching `research/` or any phenotype (results to
   `evaluations/joint-16-etf-d1/`): `npm run joint-16-etf-d1 -- run --config B5 --mode fixed --dataset all --cost 5`
   and `--mode portfolio` (B1, B4, B5 and C0 are the only frozen configurations; they reproduce $486,207.77 / $26,509.97
   and $5,410,976.72 / 29.67% for B5).

**Data permissions.** `search`, `diagnostics` and `determinism` read the training partition only, through
`loadNUniverse({ partition: 'training', access: 'optimization' })`, refused for any later partition before a byte is
read. `audit` reads every row for integrity only. `controls` reads `all` for the benchmark members only
(`benchmarkUniverse`, which refuses any other symbol). `evaluate` and `run` read `all` only after
`FROZEN_SELECTION.json`'s body hash verifies.

## Results directory

| Path | Content |
|---|---|
| `results/protocol_freeze.json` | the protocol's and context's sha256, time and git state at the freeze |
| `results/audit/audit.json` | the integrity audit (verifiers, hashes, splits, calendars, coverage) |
| `results/controls/controls.json` | the benchmark reproduction, training and full history, against the previous records |
| `results/parity/parity.json` | every P0–P2 comparison with its difference count, checks and timings |
| `results/library/` | `library.json` (design, controls, per-ETF coverage); `library.jsonl` (every ETF × vector trace record; git-ignored) |
| `results/discovery/` | `discovery.json` (greedy paths, island logs, migrations, coverage); `evaluations.jsonl` (every configuration; git-ignored) |
| `results/refine/` | `refine.json` (contenders, trajectories, lot changes); `evaluations.jsonl` (git-ignored) |
| `results/robust/robust.json` | the 23 batteries, B5's ladder, the gates, scores, (empty) nominations, rolling-origin, coverage |
| `results/diagnostics/diagnostics.json` | unoptimized neighbourhoods, zero-perturbation and perturbed parity, loss attribution |
| `results/determinism/determinism.json` | the byte-for-byte re-run check |
| `results/evaluation/evaluation.json` | the no-advancement record |
| `results/tables/` | generated Markdown tables |

The git-ignored logs (≈ 91 MB) are deterministic: `search` regenerates them byte for byte (their sha256 values are in
FROZEN_SELECTION.json `records`).
