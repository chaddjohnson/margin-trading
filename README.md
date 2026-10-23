# Margin Trading

This project backtests different strategies for margin trading.

## Market data

Strategies read one-minute OHLCV bars from one file per symbol and partition:

```text
data/<SYMBOL>/<partition>/data.csv
```

| Partition  | New York trading dates (inclusive)    | Use                                                         |
| ---------- | ------------------------------------- | ----------------------------------------------------------- |
| `training` | 2016-01-01 through 2023-12-31         | the default; the only partition optimizers may read         |
| `holdout`  | 2024-01-01 through 2025-10-16         | explicit manual evaluation                                  |
| `final`    | 2025-10-17 onward                     | explicit manual evaluation                                  |
| `all`      | the three above, in order             | one continuous series for a single backtest across them all |

Every file is **headerless and comma-delimited**, one bar per row, in ascending time order:

```text
"2016-01-04T14:30:00Z",106.31,106.31,105.77,105.77,21114
```

The columns are the bar's start time (ISO 8601 UTC, quoted as exported), open, high, low, close and volume, as
downloaded from Alpaca (SIP feed, raw prices, extended hours included; strategies keep the regular session, see
`src/lib/session.ts`). `src/lib/csv.ts` defines the format and refuses a header row, pipe-delimited rows, wrong field
counts, non-numeric values, non-UTC times and rows out of order. `all` is a physical file written by the partitioning
script: the training, holdout and final rows concatenated byte for byte, not something assembled at run time. The
boundaries above exist only in the partitioning script (`src/data-partition/scan.ts`); code selects a dataset by
name through `src/lib/dataset.ts`.

### Adding or refreshing a symbol

1. Download the bars to `data/<SYMBOL>.csv`, for example with `cd data && ./download.sh <SYMBOL>` (it writes
   `<SYMBOL>.csv` in the current directory and needs `ALPACA_API_KEY` and `ALPACA_SECRET_KEY`).
2. Run `npm run partition-data` to partition every `data/<SYMBOL>.csv` there, or `npm run partition-data -- KRE XBI`
   for some of them.

For each symbol the script parses every row as CSV, assigns it the New York trading date of its timestamp (daylight
saving included), and writes the four files to a temporary directory. It then checks them from disk: each file
parses with the application's loader and stays inside its dates, the row counts add up, and the bytes of training,
holdout and final concatenated are the bytes of `all` and of the source's data rows (without a header, `all` is the
source file exactly). Only then are the files moved into place, checked once more, and the source deleted.

Duplicate timestamps, rows out of order, malformed rows and rows outside the partitions (before 2016) fail the
symbol: nothing is sorted, dropped or repaired, the source is kept and existing files are untouched. A header row is
left out. Missing NYSE sessions, bars on closed days, intraday gaps, thin coverage and inconsistent OHLC values are
reported but do not fail. The report is printed, saved per symbol in `data/<SYMBOL>/partition-report.json`, and for
the run in `data/partition-run.json`.

The script is safe to rerun. Existing files with identical content are left alone; different ones are refused
unless `--replace` is given, so a refreshed download shows which partitions changed (normally only `final` and
`all`). `--keep-source` keeps `data/<SYMBOL>.csv`. `npm run partition-data -- verify [SYMBOL ...]` re-checks files
already in place, from `all`.

### Running a strategy

The strategy entry points take a partition after the symbol; without one they read `training`:

```bash
npm run app -- allIn-trailingBuy VGT            # training
npm run app -- allIn-trailingBuy VGT training
npm run app -- allIn-trailingBuy VGT holdout
npm run app -- allIn-trailingBuy VGT final
npm run app -- allIn-trailingBuy VGT all
```

Unknown partitions are refused. The remaining arguments keep their positions (`[start date] [end date] [data file]
[output dir] ...`; see each file's usage comment), so the older forms work unchanged: `npm run app --
allIn-trailingBuy VGT 2016-10-07 2023-12-29` (training), a partition name in the data-file slot (`VGT - - holdout`),
or an explicit file path. Giving both a partition and a data file is refused. Every run prints the selected dataset,
for example `Dataset: VGT holdout (data/VGT/holdout/data.csv)`, and `summary.json` records the file.

`all` runs as **one continuous backtest**: positions, trailing stops, reference highs, margin interest and drawdown
carry across the former partition boundaries. It is not three runs added together.

A partition run is isolated: it starts flat, and its warm-up (the strategy's `tickWindowSize` sessions before the
first entry can arm, 90 sessions in `allIn-trailingBuy.ts`) is taken from the partition's own first sessions, so
about the first four months of `holdout` or `final` cannot trade. Nothing earlier is loaded. The same holds for a
start date, which filters sessions before the warm-up. A `holdout` run therefore differs from the 2024–2025 part of
an `all` run; for figures with state carried across a boundary, use the period report of a `--phenotype` run on
`all` (`config/phenotypes/README.md`). Loading prior sessions for indicator warm-up only would change backtest
semantics and is not implemented.

### Holdout safeguards

- Optimizers and research programs read market data through `optimizationDatasetFile` (`src/lib/dataset.ts`), which
  accepts only `training` and refuses `holdout`, `final` and `all`.
- Manual backtests may read any partition. Using `holdout`, `final` or `all` results to choose or tune parameters
  makes them part of the tuning data, so they no longer measure out-of-sample performance; keep final-period results
  out of optimization reports and strategy selection.
- VGT's 2024–2025 period was inspected by earlier VGT programs, so it is not a sealed holdout for VGT.

### Legacy data and research archives

- The completed programs under `research/` (and their code in `src/<program>/`) ran on earlier files such as
  `data/VGT/VGT-2016-2025-1-minute.csv`, which are no longer in `data/`. Their documents keep those names and
  hashes as provenance. Their code now reads the training partitions; wherever a program checks its data (or its
  frozen code, including `src/lib/`) against recorded hashes, it refuses rather than mixing datasets, so their
  frozen stages (holdouts, final evaluations) cannot be rerun on the new files.
- Pipe-delimited daily bars (`YYYY-MM-DD|open|high|low|close|volume`) remain only for the Stooq cache in
  `data/stooq/` (the multi-asset optimizer, `src/optimizer/`) and the trailing-buy research's files in
  `data/trailing-buy-entry/` (`src/trailing-buy/`), read by `loadCsvBacktestData`. `allIn-original`,
  `allIn-optimizable`, `ladderUp` and `ladderDown` read daily files (`data/<SYMBOL>/<SYMBOL>-2016-2026.csv`) that are
  no longer present; the minute partitions don't apply to them.

## Phenotypes

Strategies can run named, symbol-specific parameter sets kept as JSON under `config/phenotypes/`, for example
`npm run app -- allIn-trailingBuy-postExitContinuation KRE --phenotype primary`. See
[config/phenotypes/README.md](config/phenotypes/README.md).
