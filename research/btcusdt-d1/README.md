# BTCUSDT spot D1 study

**Question.** Can the existing D1 trailing-buy strategy, adapted to BTCUSDT spot one-minute bars (UTC days, a
100,000 USDT cash account, no leverage, fees and impact on both sides), make positive net trading profit with a
minute-sampled drawdown of at most 35% and 35,000 USDT, robustly across parameters, costs and later chronology?

**Answer: no viable phenotype was identified.** The preregistered walk-forward failed both folds:

- **Fold A:** the pick lost 29,145 USDT, with a 70,457 USDT drawdown, in the 2022 decline.
- **Fold B:** the picks made no trade in 2023–2024.

The procedure gate therefore failed, and the final holdout (2024-07-01 → 2026-08-24) was **never evaluated**. Under
the 35,000 USDT risk reference, almost all feasible vectors were "crash-buyers" (92–99.8% arm only after a fall of
40% or more; every vector that passed all gates armed after a 45.4–59.6% fall), and their behaviour depended on the
regime.

**What the verdict depends on.** The study gated drawdown at 35% of the account's running peak **and** at
35,000 USDT, the user's 35,000-per-100,000 reference, preregistered before the freeze. The USDT ceiling is the
stricter of the two: 35–45% of searched vectors stayed within 35%, but only 5.4–8.1% within 35,000 USDT. That
ceiling is what pushed the selections to crash-buyers, and so to the fold B picks that never traded. Fold A fails
either way: its pick lost money at every cost level and under every stop convention. Details: [FINAL_COMPARISON_AND_RECOMMENDATION.md](FINAL_COMPARISON_AND_RECOMMENDATION.md).

**Evidence limits.**
- In-sample results are heavily selected: 95–98% of all 68,500 searched vectors per window were profitable.
- The folds are reused, publicly known history, not prospective evidence.
- There is no locked-holdout evidence.
- The venue is unverified (consistent with Binance spot).
- USDT, venue and order-book risks are not modelled.
- No BTC buy-and-hold benchmark is computed anywhere (the user's instruction).

## Documents

| File | Contents |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) | the frozen design: data, clock, chronology, box, costs, selection, gates, records |
| [DATA_AUDIT.md](DATA_AUDIT.md) | the raw file, field verification, integrity, gaps, snapshot and canonical series |
| [BTC_CLOCK_AND_EXECUTION.md](BTC_CLOCK_AND_EXECUTION.md) | ETF D1 versus BTC D1, the state machine, fills, USDT accounting, stop limits |
| [ENGINE_PARITY_AND_TESTS.md](ENGINE_PARITY_AND_TESTS.md) | reference/fast parity, lookahead mutation, cheats, tests, isolation |
| [SEARCH_AND_NEIGHBORHOOD.md](SEARCH_AND_NEIGHBORHOOD.md) | budgets, coverage, distributions, frontier, shortlists, neighbourhoods, picks |
| [CHRONOLOGICAL_VALIDATION.md](CHRONOLOGICAL_VALIDATION.md) | both folds, every gate test, attribution; the holdout stayed sealed |
| [FINAL_COMPARISON_AND_RECOMMENDATION.md](FINAL_COMPARISON_AND_RECOMMENDATION.md) | BTC D1 variants, evidence classes, verdict, recommendation, limits |
| [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) | self-audit and the final independent audit with dispositions |
| [reviews/](reviews/) | the independent pre-freeze review, its follow-up and every disposition |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | the task checkpoint (Git provenance, stages, hashes, guards) |
| `PROTOCOL_FREEZE.json`, `results/**/*.json` | sealed write-once records (`bodyHash`); `results/*/archive.jsonl.gz` every evaluated vector (on disk, git-ignored; sha256 in each `SELECTION.json`) |
| `coordinator/brief_original.md` | the assignment |

Code: `src/btcusdt-d1/` (reference engine `engine.ts`, fast replay `fast.ts`, data `raw.ts`/`snapshot.ts`, clock
`calendar.ts`, search `space.ts`/`select.ts`/`evaluate.ts`, gates and stages `stages.ts`, door `door.ts`, records
`records.ts`, CLI `cli.ts`, tests `tests/`). Phenotypes: `config/research-phenotypes/btcusdt-d1/*.json` (written from
the sealed records; all research-only, doors through 2024-06-30). Run outputs: git-ignored `evaluations/btcusdt-d1/`.

## Commands

Node v24.21.0 (`export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`), from the
repository root. No network, no credentials, no `.env`. Each command below was run; terminal outputs are in
`results/demo/`.

```bash
npm run btc-d1 -- data-audit                  # recompute the audit from the raw file; must match the sealed record
npm run btc-d1 -- verify                      # snapshot, freeze, every sealed record, phenotypes, holdout status, B4/B5 freeze
npm run btc-d1 -- list                        # the 10 phenotypes with their doors
npm run btc-d1 -- show final-r1               # one phenotype's JSON
npm run btc-d1 -- fixed final-r1              # development span 2019-02-11 → 2024-06-30, every funded trade
npm run btc-d1 -- fixed final-r2 --end 2022-12-31
npm run btc-d1 -- fixed fold-a-r1 --dataset fold-a-validation   # = the sealed fold A validation (continuous run)
npm run btc-d1 -- fixed diagnostic-vgt-d1 --mode fixed --dataset development   # analytical fixed notional, top-ups shown
npm run btc-d1 -- fixed final-r1 --fee 20 --impact 10 --stop low              # other cost and stop assumptions
npm run btc-d1 -- compare                     # BTC D1 phenotypes side by side on their permitted dates
npm run btc-d1 -- tables fold-a               # markdown tables from the sealed records
```

`fixed` prints every funded trade and the account reconciliation, and writes `report.txt`, `trades.csv`,
`trades.json` and `summary.json` to `evaluations/btcusdt-d1/<id>_<start>_<end>_<costs>_<mode>/`. Options: `--start`
and `--end` (UTC dates, inclusive), `--dataset development|fold-a-selection|fold-a-validation|fold-b-selection|
fold-b-validation`, `--flat`, `--fee`, `--impact`, `--stop adverse|stop|low`, `--mode cash|fixed`, and `--out` (a
directory under `evaluations/btcusdt-d1/`).

**Data door.** Every phenotype may be run only through 2024-06-30. The door is derived from the sealed records,
never from the phenotype file. These are refused with the latest permitted minute (2024-06-30T23:59:00Z) printed;
each refusal is recorded in `results/demo/refusal-*.txt`:

```bash
npm run btc-d1 -- fixed final-r1 --dataset all
npm run btc-d1 -- fixed final-r1 --dataset holdout
npm run btc-d1 -- fixed fold-b-r1 --end 2025-01-15
npm run btc-d1 -- compare --dataset all
```

Unknown or forged phenotype ids are also refused, and so are outputs outside `evaluations/btcusdt-d1/`.

Stage commands are complete and sealed:
- `freeze`, `fold`, `gate`, `final` and `holdout` refuse to rerun; `holdout` also refuses because the gate failed.
- `phenotypes` is idempotent and refuses different content.
- `snapshot` rebuilds the identical cache from the sealed prefix.
- `parity` and `benchmark` are pre-freeze evidence. A new run would write a labelled record (e.g. `PARITY-r3.json`) and
  never overwrite one.
