# Margin Trading

This project backtests different strategies for margin trading.

## Market data

Each symbol has **one canonical file** of one-minute OHLCV bars, and one shared metadata file holds the date
boundaries of the logical partitions:

```text
data/
  partitions.json        # partition boundaries (versioned in git; the rest of data/ is local)
  VGT/data.csv           # every bar of VGT, oldest first
  XBI/data.csv
  ...
```

Every `data.csv` is **headerless and comma-delimited**, six fields, one bar per row, in strictly ascending time order:

```text
"2016-01-04T14:30:00Z",106.31,106.31,105.77,105.77,21114
```

The columns are the bar's start time (ISO 8601 UTC, quoted as exported), open, high, low, close and volume, as
downloaded from Alpaca (SIP feed, raw prices, extended hours included; strategies keep the regular session, see
`src/lib/session.ts`). `src/lib/csv.ts` defines the format and refuses a header row, pipe-delimited rows, wrong field
counts, non-numeric values, non-UTC times and rows out of order. Bytes are never rewritten: no resampling,
interpolation, adjustment or delimiter change.

### Partitions

A partition is a **date interval of the canonical file**, never a separate file. `data/partitions.json`:

```json
{
  "schemaVersion": 1,
  "timezone": "America/New_York",
  "partitions": {
    "training": { "start": "2016-01-01", "end": "2023-12-31" },
    "holdout": { "start": "2024-01-01", "end": "2025-10-16" },
    "final": { "start": "2025-10-17", "end": null },
    "all": { "start": null, "end": null }
  }
}
```

| Partition  | New York trading dates (inclusive) | Use                                                         |
| ---------- | ---------------------------------- | ----------------------------------------------------------- |
| `training` | 2016-01-01 through 2023-12-31      | the default; the only partition optimizers may read         |
| `holdout`  | 2024-01-01 through 2025-10-16      | explicit manual evaluation                                  |
| `final`    | 2025-10-17 through the last row    | explicit manual evaluation                                  |
| `all`      | every row of the file              | one continuous backtest over the whole history              |

Dates are **New York trading dates**: a bar belongs to the date of its timestamp in New York, daylight saving
included, so an evening bar at 00:30 UTC belongs to the previous date. `null` leaves a side unbounded; it never admits
invalid rows. `src/lib/partitions.ts` validates the file strictly: the schema version, the time zone, real
`YYYY-MM-DD` dates, `training`, `holdout` and `final` consecutive without gaps or overlaps (only training may start
and final may end unbounded), `all` unbounded, and no unknown keys. Every row of a canonical file must fall into one
of the three segments; a row outside them (before 2016) fails the file's checks rather than being dropped. The file
has no symbol-specific content, and its sha256 is recorded by every partition run.

### Adding, refreshing and verifying symbols

```bash
scripts/download.sh KRE                              # all bars 2016-01-04 → today into data/KRE.csv (Alpaca SIP, raw)
npm run datasets -- import KRE                       # data/KRE.csv → data/KRE/data.csv
npm run datasets -- import KRE --replace             # a refreshed full download replacing the existing file
scripts/download.sh KRE 2026-10-14                   # only the sessions after the canonical file's last date …
npm run datasets -- append KRE                       # … appended to data/KRE/data.csv
npm run datasets -- verify                           # re-scan every canonical file against partitions.json
npm run datasets -- config                           # validate and print partitions.json
```

`scripts/download.sh <SYMBOL> [start] [end]` needs `ALPACA_API_KEY` and `ALPACA_SECRET_KEY` in the environment (for
example `set -a; . ./.env; set +a`); the dates are inclusive and the end defaults to today (UTC). Until 2026-10-24 the
end date was fixed at 2026-10-13, which is why every canonical file ends on that date. `data/download.sh` runs the
same script from `data/`.

`import` parses every row (`src/data-partition/scan.ts`), writes the data rows exactly to a temporary file beside the
target (a header row, if any, is left out), checks its sha256 and renames it into place; the download is then removed
unless `--keep-source`. Duplicate timestamps, rows out of order, malformed rows and rows outside the partitions fail
the symbol and leave everything as it was. Missing NYSE sessions, sparse sessions, bars on closed days, intraday
gaps and inconsistent OHLC values are reported but do not fail. A replacement needs `--replace` and reports, per
partition, whether its rows changed (normally only `final`). `--dry-run` checks without writing. Reports go to
`data/<SYMBOL>/dataset-report.json` and `data/datasets-<command>-run.json`. A new symbol needs nothing else:
partitions are dates, not files.

`npm run datasets -- migrate [SYMBOL ...] [--dry-run]` converted the former layout
(`data/<SYMBOL>/{training,holdout,final,all}/data.csv`, 2026-10-23) to the canonical one on 2026-10-24: for each
symbol it proved `all` = training ‖ holdout ‖ final byte for byte, scanned `all`, checked that each physical file held
exactly the rows partitions.json assigns to it, copied `all` to `data/<SYMBOL>/data.csv` through a verified temporary
file, and only then removed the four files. It is rerunnable (an interrupted migration resumes; a migrated symbol is
re-verified), writes `data/partitions.json` if it is missing, and keeps every original file of a symbol that fails.
Its record is `data/<SYMBOL>/migration-report.json` and `data/datasets-migration-2026-10-24.log`.

`append` takes a download of only the newest sessions: rows up to the canonical file's last bar must be byte-identical
to it (a revised history needs `import --replace`), the rest are appended, the combined file is scanned in full, and
the training and holdout rows must be unchanged before it replaces the canonical file.

### Corporate actions: splits and distributions

The minute files hold **raw** prices, so a share split appears as a price jump. `config/market-events/splits.json`
records each split with its issuer source (so far VGT 8:1 and VOOG 6:1, effective 2026-04-21, from Vanguard's
2026-03-24 press release). A partition run, and the allocator's `--dataset` path, **forward-adjust** across a
recorded split: prices from the effective date on × ratio, volumes ÷ ratio, and per-share distributions from that date
on × ratio, so the run stays in the share units of its first session. Shares are fractional, so position values, cost
bases and P&L are exactly those of holding the multiplied shares: the split moves nothing and makes no signal, and a
run that doesn't span a split is unchanged. Prices reported after a split are in pre-split units (VGT about 8× its
quote). `npm run market-events -- verify` checks each recorded split against the data's overnight move and lists the
split-sized moves no split explains: XLE, XLU and XLY (2025-12-05, about 2:1) and XOP (2020-03-30, about 1:4) are not
recorded, so partition runs of those symbols across those dates still read raw prices.

The allocator's portfolio mode books VGT and VOOG distributions (the core and, by the frozen convention, open VGT
lots) on the ex-date for the shares then held, pays them on the pay date and reinvests them in the same ETF; XBI, XRT
and KRE distributions are not modelled, as in the frozen protocol. `config/market-events/distributions.csv` is the
frozen protocol's ledger verbatim (ex-dates through 2025-10-13, amounts derived from adjusted prices) followed by the
issuer's own history (Vanguard, `investor.vanguard.com/vmf/api/<TICKER>/distribution`; under T+1 settlement the ex-date
is the listed record date), with the raw responses kept under `config/market-events/raw/`. Its manifest records each
source's URL, retrieval time and hash, and the coverage date (the retrieval date). Refresh and check it with

```bash
npm run market-events -- update                      # fetch the issuer histories (no credentials), rebuild, validate
npm run market-events -- update --offline config/market-events/raw/<snapshot>   # rebuild from a stored snapshot
npm run market-events -- verify                      # same bytes from the sources, rules, splits against the data
```

Validation refuses duplicates, non-positive amounts, pay dates before ex-dates, ex-dates off the NYSE calendar, a gap
of more than a quarter between distributions or before the coverage date, and yields outside one quarter's plausible
range (which catches split-unit mistakes). The frozen ledger file and its pinned hash are never changed.

### Running a strategy

The strategy entry points take a partition after the symbol; without one they read `training`:

```bash
npm run app -- allIn-trailingBuy VGT            # training
npm run app -- allIn-trailingBuy VGT training
npm run app -- allIn-trailingBuy VGT holdout
npm run app -- allIn-trailingBuy VGT final
npm run app -- allIn-trailingBuy VGT all
```

Only those four names are accepted. The remaining arguments keep their positions (`[start date] [end date] [data
file] [output dir] ...`; see each file's usage comment), so the older forms work unchanged: dates after the symbol
(`VGT 2019-01-02 2023-12-29`, within training), a partition name in the data-file slot (`VGT - - holdout`), or an
explicit file path. Dates narrow the partition and must lie inside it (`VGT holdout 2023-12-01` is refused). Giving
both a partition and a data file is refused, and so is a former partition path such as `data/VGT/holdout/data.csv`.
Every run prints the dataset and its window, for example

```text
Dataset: VGT holdout (data/VGT/data.csv; data/partitions.json holdout = 2024-01-01 → 2025-10-16, sha256 43893f3d…); data sha256 d8e6991d…
Evaluation: VGT holdout (isolated partition), 2024-01-02 → 2025-10-16, 450 sessions; warm-up 90 of 90 sessions (…)
```

and `summary.json` records the same in `dataset` (partition, effective dates, warm-up, hashes, mode).

### Warm-up, isolated partitions and continuous runs

- **`all` is one continuous backtest**: positions, trailing stops, setups, restrictions, reference highs, interest
  and drawdowns carry across the former partition boundaries. It is not three runs added together.
- **`training`, `holdout` and `final` are isolated evaluations** that start flat. Before the window the strategy reads
  up to its lookback of strictly earlier sessions from the same canonical file (`src/lib/evaluation.ts`): the
  `tickWindowSize` sessions of the reference high (and `swingLookback` for the swing-low file). Those sessions are
  **observational only**: no orders, fills, positions, interest, P&L, trade counts, marks or drawdown, and they are not
  reported. The arming guard counts them, so after a full warm-up the window's first session can arm; with less
  history (training starts at the file's first row) entries wait inside the window, as a cold start always did, and
  the run reports the shortfall. Nothing after the window's last date is read.
- **Not warmed up**, because it exists only through trades: open positions and their stops, armed or pending setups
  (arming requires being flat, which an isolated run can't know before its window), loss restrictions, correction
  episodes (episodeLatch, episodeBudget, troughRecovery: an episode starts at a deep arming), post-exit continuation
  windows (they need a profitable exit) and buffered-loss carry. A dip that began before the window arms on the first
  window minute that meets the condition, and its trailing low starts there.
- So a `holdout` or `final` run is **not** the matching segment of an `all` run, and is not expected to equal it. For
  figures of one continuous run attributed to periods, use the period report of a `--phenotype` run
  (`config/phenotypes/README.md`).
- An **explicit data file** keeps the original semantics: its sessions filtered by the dates, no partition and no
  warm-up. The frozen research programs use this path.
- Changed behaviour, audited: a partition run with a start date (for example `VGT 2019-01-02 2023-12-29`) now warms
  up from the sessions before that date instead of starting cold. A whole `training` or `all` run has no earlier
  sessions and is unchanged: all 22 minute strategy files reproduce their previous training outputs file for file.

### The multi-ETF allocator's datasets

`npm run multi-etf-allocator` keeps its frozen protocol (`research/multi-etf-allocator/PROTOCOL.md`) as the default:
without `--dataset`, `fixed` and `portfolio` run on the archived legacy files (below) with their pinned hashes,
truncated at `protocol.commonEnd` (2025-10-13), arming from 2017-06-15, as frozen. An explicit evaluation on the
canonical files adds `--dataset`:

```bash
npm run multi-etf-allocator -- portfolio --policy shadow --config all-lowDd --dataset all
npm run multi-etf-allocator -- portfolio --policy shadow --config all-lowDd --dataset all --end 2025-10-13   # parity
npm run multi-etf-allocator -- portfolio --policy shadow --config all-lowDd --dataset training
npm run multi-etf-allocator -- fixed --policy shadow --config all-lowDd --dataset holdout --dry-run
```

`fixed` is one fixed $100,000 pool per lot; `portfolio` the $300,000 VOOG/VGT margin account (initially $180,000 VOOG
and $120,000 VGT) that borrows 20% of its equity at each funded decision, reinvests profits 60/40 in VOOG/VGT and funds
losses by proportional core sales.
With `--dataset`, every member (VOOG and the books' symbols) is read over the same New York window with the same
warm-up (the books' longest lookback) and the calendars must agree session by session; `all` has no `commonEnd`
truncation; books arm from the window's first session or 2017-06-15, whichever is later; accounting (the portfolio's
funding, P&L, interest, drawdown) starts at the close of the window's first session, as the protocol starts at the
close of 2016-01-04 (so `--dataset all` is one continuous run from that close, with no reset at 2024-01-01 or
2025-10-17); recorded splits are forward-adjusted. The portfolio mode reads the verified distribution ledger (above)
and refuses a window that ends after its coverage; `--allow-uncovered-distributions` runs anyway and is recorded as
such, and is never needed while the ledger is up to date (`npm run market-events -- update`). Fixed mode books no
distributions. `--end YYYY-MM-DD` ends the window earlier inside the partition: a diagnostic for comparing with an
earlier endpoint. `--dataset all --end 2025-10-13` reproduces the frozen `C-all-lowDd-shadow` run file for file (every
CSV byte-identical; `src/multi-etf-allocator/tests/datasetParity.test.ts`). Results go to `evaluations/multi-etf-allocator/<dataset>/<run key>/` (git-ignored; `--out DIR` to choose, never
under `research/`) with `evaluation.json`: windows, sparse-session counts, data/partitions/distribution/config/phenotype
hashes, ledger coverage, splits and split-adjusted distributions, the D1 definition check, the command line, the git
revision and the access mode, plus `segments.csv`: the development, holdout, final and full periods of the one
continuous run (opening and closing equity, strategy P&L, interest, dividends, lots, and both the largest-dollar and the
largest-percentage daily drawdown). The summary's `dailyDrawdownPercent` and `minuteDrawdownPercent` are the depth of
the largest-**dollar** episode (the frozen engine's convention), not the largest percentage fall; `evaluation.json`'s
`drawdowns` holds both maxima independently, daily and minute-sampled, each with its peak, trough and recovery (see
below). `--dry-run` prints the record without running.

`fixed` and `portfolio` (frozen or `--dataset`) print a readable report rather than JSON, and write it to `report.txt`
beside the run's files (`--json` prints the summary JSON instead; the JSON, CSV and ledger files are unchanged):
strategy, mode, dataset and period; for the portfolio the starting and ending equity, total return and CAGR; funded,
closed, winning and losing trades; realized, unrealized and net profit and margin interest; the maximum daily and
minute drawdowns; per-symbol funded lots and profit; and, with `--dataset`, the period table
(`src/multi-etf-allocator/runReport.ts`). In the portfolio the largest dollar and the largest peak-to-trough percent
drawdown are two independent measures of marked equity (the engine's `Tracker` and `PercentTracker`, the latter at
every close and every minute mark), generally different episodes: for All-lowDd on `all`, $594,129 (25.20% below its
peak, 2025) and 34.55% ($252,851, March 2020) daily, $689,419 and 36.92% minute-sampled. In the fixed mode the
allocation is constant, so its percentage is a capital-allocation reference and the same episode as the dollar
maximum.
The frozen studies (`run`, `all`, `stress`, `parity`, `audit`, `audit-ledger`, `illustration`, `final-validation`)
refuse `--dataset`. `--dataset training` reproduces the frozen engine on the archived files truncated at 2023-12-29
exactly (every summary field and daily row).

### Holdout safeguards

- Optimizers and parameter searches read only `training`, although all four partitions share one file:
  `optimizationDataset` / `assertOptimizationPartition` (`src/lib/dataset.ts`) refuse `holdout`, `final` and `all`,
  and so does the loader itself for a request with `access: 'optimization'` (`src/lib/evaluation.ts`), before any
  data is read; every window report records its access mode. No optimizer command line takes a data file or a
  partition: the completed programs read their fixed, archived research inputs (below) with their own frozen
  development/holdout splits. Warm-up history never widens a window: every result, metric and decision comes from
  the window's sessions.
- Manual backtests may read any partition. Using `holdout`, `final` or `all` results to choose or tune parameters
  makes them part of the tuning data, so they no longer measure out-of-sample performance; keep final-period results
  out of optimization reports and strategy selection.
- VGT's 2024–2025 period was inspected by earlier VGT programs, so it is not a sealed holdout for VGT.

### Legacy research inputs and reproducibility

- The completed programs under `research/` ran on earlier files such as `data/VGT/VGT-2016-2025-1-minute.csv`, whose
  sha256 their documents and code pin. Those bytes are kept, verified, in a read-only archive outside the live data:
  `data/archive/legacy-research-inputs/<SYMBOL>/<legacy name>`, listed with hashes, the research files pinning them
  and their derivation in `config/archive/legacy-research-inputs.json`. Each legacy minute file is a byte prefix of
  today's canonical file (the old downloads ended 2025-10-13 or 2025-10-16, before `final`); the daily
  `VGT-2016-2026.csv` is a line range of the trailing-buy research's pinned daily file.
  `npm run legacy-archive -- build [SYMBOL ...]` rebuilds them from those sources and refuses any mismatch (or a row in
  `final`); `verify` and `list` check and list them.
- The frozen programs read their inputs from the archive (`legacyResearchFile`, `src/lib/archive.ts`) and still check
  their pinned hashes; nothing falls back to the canonical files. The archive is never a default for new work.
- Strategy files edited only in their dataset plumbing still pass a research pin of their bytes:
  `checkStrategyDefinition` (`src/lib/frozenSource.ts`) reads the pinned revision from git, applies exactly the
  documented plumbing edits and requires the result to equal the current file byte for byte; any other change fails.
- Pipe-delimited daily bars (`YYYY-MM-DD|open|high|low|close|volume`) remain only for the Stooq cache in
  `data/stooq/` (the multi-asset optimizer, `src/optimizer/`) and the trailing-buy research's files in
  `data/trailing-buy-entry/` (`src/trailing-buy/`), read by `loadCsvBacktestData`. `allIn-original`,
  `allIn-optimizable`, `ladderUp` and `ladderDown` read daily files that are not present
  (`data/VOOG/VOOG-2016-2026.csv`, `data/VGT/VGT-2005-2026.csv`, `data/VGT/VGT-2026.csv`, `data/QQQ/QQQ-1999-2015.csv`;
  only `VGT-2016-2026.csv` is in the archive); the minute partitions don't apply to them.

## Phenotypes

Strategies can run named, symbol-specific parameter sets kept as JSON under `config/phenotypes/`, for example
`npm run app -- allIn-trailingBuy-postExitContinuation KRE --phenotype primary`. See
[config/phenotypes/README.md](config/phenotypes/README.md).
