# Eight-ETF D1 parameter research with a sealed 2024–2025 holdout

A research program (2026-10-23) that takes the shipped **D1** strategy
(`src/app/allIn-trailingBuy-postExitContinuation.ts`, unchanged) and asks, for each of **XBI, IWM, XRT, KRE, XLY, IWN,
XLF, XLE** separately on Alpaca one-minute data: what does unchanged D1 do, what do its eight numerical parameters do
when searched on 2016–2023 only, and do the development picks survive one sealed look at 2024-01-02 → 2025-10-16?
Fixed $100,000 per entry, 11% margin interest, no compounding, no shared pool, no allocator.

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — preregistered splits, eligibility, box, budget, folds, selection rule, freeze and
   holdout procedure; amendments at the end.
2. [DATA_AUDIT.md](DATA_AUDIT.md) — the nine files (hashes, rows, sessions, coverage, liquidity, corporate actions).
3. [BASELINE_REPRODUCTION.md](BASELINE_REPRODUCTION.md) — VGT $183,043.82 / $19,330.69 / 20 reproduced to the cent;
   unchanged D1 on the eight tickers through 2023 with trade-by-trade file parity.
4. [OPTIMIZATION_RESULTS.md](OPTIMIZATION_RESULTS.md) — coverage, phenotypes, box edges, the walk-forward of the rule.
5. [FROZEN_SELECTION.md](FROZEN_SELECTION.md) + [FROZEN_CANDIDATES.json](FROZEN_CANDIDATES.json) — the manifest
   (hash `d3645e1e…`) written before any 2024–2025 figure existed.
6. [HOLDOUT_RESULTS.md](HOLDOUT_RESULTS.md) — the one sealed evaluation, all eight tickers, with the cautions.
7. [STRATEGY_COMPARISON.md](STRATEGY_COMPARISON.md) — development versus holdout, phenotypes, the cross-sector
   chronology (descriptive only).
8. [ROBUSTNESS_AND_RISK.md](ROBUSTNESS_AND_RISK.md) — drawdown, concentration, plateau, cost/fill sensitivity, data.
9. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, commands, tests, determinism, look-ahead checks.
10. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — what merits forward validation, what does not, what a pool would need.

## Dates (exact)

| Window | Sessions | Notes |
|---|---|---|
| Warm-up | 2016-01-04 → 2017-06-14 | lookbacks only; nothing arms |
| Eligibility | from **2017-06-15** (index 365 on every file) | the D1 convention of the earlier programs, applied to every ticker |
| Development | 2017-06-15 → **2023-12-29** (last 2023 session) | the only data any search or selection saw; the dataset is physically truncated there |
| Holdout | **2024-01-02 → 2025-10-16** (450 sessions) | the last session common to the eight files; the files hold no later bar; evaluated once on 2026-10-23T13:22:49Z, repeated once as a recorded determinism check |

## Main results (one sealed look; see the cautions in HOLDOUT_RESULTS.md §4)

| Ticker | Unchanged D1, development: net / minute DD / entries | Primary nomination, development | Holdout 2024-01-02 → 2025-10-16: D1 → primary |
|---|---|---|---|
| XBI | $35,145 / $68,829 / 45 | $151,799 / $27,885 / 24 (X 29.1%, stop 10.4%, hold 3) | −$745 (2) → +$54,247 (1 open position) |
| IWM | $13,778 / $39,694 / 12 | $120,856 / $14,910 / 38 (X 27.3%, stop 3.3%, hold 11) | +$29,105 (1 open) → +$13,783 (3) |
| XRT | $41,132 / $41,800 / 34 | $145,468 / $23,383 / 24 (X 24.4%, stop 7.7%, hold 9) | +$20,597 (3) → +$20,261 (2) |
| KRE | $4,950 / $55,799 / 32 | $171,785 / $26,271 / 70 (X 29.9%, stop 3.1%, hold 5) | +$15,012 (6) → +$23,262 (5) |
| XLY | $72,921 / $29,065 / 17 | $112,490 / $16,972 / 30 (X 21.3%, stop 3.1%, hold 10) | +$21,788 (2, 1 open) → −$3,360 (3) |
| IWN | $20,255 / $41,879 / 10 | $111,181 / $16,875 / 38 (X 24.9%, stop 3.1%, hold 5) | +$10,155 (1) → +$6,158 (3) |
| XLF | $20,729 / $32,211 / 14 | $121,499 / $17,071 / 30 (X 25.4%, stop 4.0%, hold 8) | $0 (no trade) → $0 (no trade) |
| XLE | $26,974 / $72,402 / 32 | $154,448 / $24,861 / 23 (X 28.0%, stop 6.5%, hold 4) | $0 (no trade) → $0 (no trade) |

- Unchanged D1 breaches the $35,000 minute-sampled screen on six of eight tickers in development; the hold-day loss
  exit dominates its trades.
- The search (4,096 Sobol + five chronological NSGA-II folds + plateau probes per ticker, ~20,000 runs each) found
  plateau candidates raising the development net by $40k–$167k at $11k–$28k drawdown on every ticker, mostly tight-stop
  scalp phenotypes on the box's 3% stop edge. The selection rule walked forward (2020–2023) passed on five tickers and
  failed on XLY, XLF, XLE.
- In the holdout almost nothing traded (one episode, April 2025; XLF and XLE never armed). The primaries beat D1 on
  XBI (one unrealized trade) and KRE, tied on XRT, lost on IWM, XLY, IWN. Totals: controls +$95,912, primaries
  +$114,351 (+$60,104 without XBI's open position), low-DD alternates +$56,092. **The development gains did not
  generalize as a set**; no deployment recommendation is made.

## Reproducing

Node 24. Every command verifies the data hashes recorded by the audit.

```
npm run multi-etf-d1 -- audit        # results/audit/
npm run multi-etf-d1 -- parity       # results/baseline/VGT/
npm run multi-etf-d1 -- benchmark    # results/baseline/<TICKER>/, benchmark.md
npm run multi-etf-d1 -- profile      # results/profile/profile.json
npm run multi-etf-d1 -- search       # results/search/<TICKER>/, results/selection/<TICKER>/   (~12 min, 9 workers)
npm run multi-etf-d1 -- freeze       # FROZEN_CANDIDATES.json, FROZEN_SELECTION.md (refuses to overwrite)
npm run multi-etf-d1 -- holdout      # results/holdout/ (refuses a second run without --rerun-reason)
npm run multi-etf-d1 -- report       # results/tables/
npm test                             # the whole suite; this program's tests are src/multi-etf-d1/tests/
```

`search` resumes from `results/search/<TICKER>/evaluations.jsonl` (git-ignored, ~75 MB per ticker) and refuses to
rerun a completed ticker unless its directory is deleted. `--workers 0` runs in-process.

## Results directory

| Path | Content |
|---|---|
| `results/audit/` | per-ticker audit JSON, `summary.json`, `hashes.json`, `DATA_AUDIT_TABLES.md` |
| `results/baseline/` | `VGT/` (file output, engine detail, `parity.json/.md`), `<TICKER>/d1-development/`, `d1-file-native/`, `file-output/`, `benchmark.json/.md` |
| `results/profile/` | throughput and the budget |
| `results/search/<TICKER>/` | `search.json` (Sobol, GA, every fold's selection and probed candidates), `evaluations.jsonl` and `candidates.csv` (local only) |
| `results/selection/<TICKER>/` | `selection.json`, `selection.md`, `pareto.csv`, `control/`, `primary/`, `alternate-lowDd/` (trades.csv, daily.csv, summary.json; development run) |
| `results/holdout/` | `holdout.json`, `HOLDOUT_TABLES.md`, `attempts.json`, `<TICKER>/<role>/` (the full continuous run 2016 → 2025-10-16, trades tagged development / spanning / holdout) |
| `results/tables/` | the Markdown tables the reports quote |

Every number in the reports comes from a file under `results/`.
