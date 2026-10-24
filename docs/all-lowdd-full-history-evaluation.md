# All-lowDd shadow portfolio on the full canonical history (2026-10-24)

The evaluation of the frozen `C-all-lowDd-shadow` portfolio (VGT primary + XBI/XRT/KRE lowDd, one shared margin pool,
20%-of-equity sizing, the $300,000 VOOG/VGT core) over the whole canonical minute history, with the data and
corporate-action work it needed. Nothing was tuned: the configuration, phenotypes and engine rules are the frozen
protocol's. Command:

```bash
npm run multi-etf-allocator -- portfolio --policy shadow --config all-lowDd --dataset all
```

Output: `evaluations/multi-etf-allocator/all/C-all-lowDd-shadow-all/` (git-ignored; `evaluation.json`, `segments.csv`
and the engine's usual files). Exit status 0; no `--allow-uncovered-distributions`.

## 1. Inputs and their coverage

**Minute data.** VOOG, VGT, XBI, XRT and KRE each cover 2,710 identical NYSE sessions, 2016-01-04 → 2026-10-13, with no
missing sessions; VOOG has 1,798 sparse sessions (under half their regular minutes), the others none.

| Symbol | Canonical sha256 |
|---|---|
| VOOG | `a7aa42aeebd9e83f94368f0ee7761410ffacf734524f3cc7655af32354de51ab` |
| VGT | `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` |
| XBI | `9afecc0606330d68ca12f7b0c331f75a150f64d0dad2e6ff910538a667b0c031` |
| XRT | `ca0fdc6a4c77a97d047bb710bcefc24fe7fdbd0dc117794725008b33700a0752` |
| KRE | `40e7bd6c72c1dffb343b265bed16d69c964ba5bee81ad297a15e6d8a5607e01a` |

`data/partitions.json` sha256 `43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6`.

**Why the data end on 2026-10-13.** `data/download.sh` passed a fixed `end=2026-10-13` to Alpaca for every symbol, so
all 16 canonical files end there; no download through 2026-10-22 ever reached the repository. The script now takes
`[start] [end]` (end defaulting to today) and lives, versioned, in `scripts/download.sh`; `npm run datasets -- append`
adds a download of only the newest sessions. No Alpaca credentials were available here, so no bars were downloaded;
**2026-10-13 is the last valuation date, as accepted.**

**Splits.** The raw minute files show VGT 809.13 → 101.57 and VOOG 460.46 → 77.25 overnight on 2026-04-21: Vanguard's
2026-03-24 press release documents an 8:1 (VGT) and 6:1 (VOOG) split effective that day. Without an adjustment the
portfolio would book an 85% loss of its core and the VGT book would read a crash. As approved, `--dataset` runs are
forward-adjusted (`config/market-events/splits.json`, sha256 `7c98f4a7…`): from 2026-04-21 prices × ratio, volumes
÷ ratio, distributions × ratio, so the run is in pre-split units throughout. Checks: the adjusted overnight move is
+0.42% (VGT) and +0.66% (VOOG); on 2026-04-21 the core shares are unchanged and equity moves −0.39% (rank 1,848 of
2,708 daily moves); no virtual trade or signal of any book in April–May 2026; synthetically, a split run equals the
unsplit economy at every lot, cost basis, daily equity and dividend (`src/multi-etf-allocator/tests/dataset.test.ts`).
XLE, XLU, XLY (2025-12-05, ~2:1) and XOP (2020-03-30, ~1:4) also split; they are not in this portfolio and not recorded.

**Distributions.** The portfolio books VGT and VOOG distributions (core holdings and open VGT lots) on the ex-date,
pays them on the pay date and reinvests them in the same ETF; prices are raw, so the ex-date drop and the cash offset
each other and nothing is counted twice. XBI/XRT/KRE distributions are not modelled (the frozen convention, kept). The
new ledger `config/market-events/distributions.csv` (86 rows, sha256
`3b4342eb7cdbb270d78a355576c2098d7692caae3ae0550bcbeb64d7a7528259`) is the frozen ledger's 78 rows verbatim (ex-dates
through 2025-10-13; the frozen file and its pin `30adf087…` untouched) plus 8 rows from Vanguard's own distribution
history (`investor.vanguard.com/vmf/api/<TICKER>/distribution`, retrieved 2026-10-24T08:41:47Z, raw responses
`config/market-events/raw/vanguard-2026-10-24T084147Z/`, VGT `b8e923d8…`, VOOG `3eb36e6e…`):

| ETF | Ex-date (= record date, T+1) | Pay date | Published $/share | In pre-split units |
|---|---|---|---|---|
| VGT | 2025-12-17 | 2025-12-19 | 0.7570 | 0.7570 |
| VOOG | 2025-12-22 | 2025-12-24 | 0.5818 | 0.5818 |
| VGT | 2026-03-24 | 2026-03-26 | 0.7438 | 0.7438 |
| VOOG | 2026-03-24 | 2026-03-26 | 0.5815 | 0.5815 |
| VGT | 2026-06-24 | 2026-06-26 | 0.1384 | 1.1072 |
| VOOG | 2026-06-24 | 2026-06-26 | 0.0881 | 0.5286 |
| VGT | 2026-09-23 | 2026-09-25 | 0.1465 | 1.1720 |
| VOOG | 2026-09-23 | 2026-09-25 | 0.1050 | 0.6300 |

The issuer history overlaps the frozen ledger on 2025-06-26 and 2025-09-24: same ex- and pay dates, amounts within
0.07% (the frozen ones were derived from adjusted prices). Coverage is the retrieval date, 2026-10-24, past the last
valuation date. `npm run market-events -- verify` rebuilds the ledger byte for byte from its sources and validates it
(no missing quarter, duplicates, bad dates, non-positive amounts, implausible yields). Other corporate actions: no
other split-sized move in the five symbols' data; Vanguard lists no capital-gain distributions in the period.

## 2. Historical comparability (the acceptance gate)

| | Frozen protocol (committed) | Frozen reproduction (archived inputs, today) | `--dataset all --end 2025-10-13` (canonical, new ledger) |
|---|---|---|---|
| Period | 2016-01-04 → 2025-10-13 | same | same |
| Ending equity | $2,891,290.87 | $2,891,290.87 | $2,891,290.87 |
| Strategy net (realized + unrealized) | $641,595.87 ($466,988.70 + $174,607.17) | same | same |
| Interest | $85,394.19 | same | same |
| Funded lots / virtual trades | 75 / 145 | same | same |
| Daily drawdown (largest-$ episode) | $594,128.83, 25.2% | same | same |

All 13 output CSVs of the evaluation-mode run (trades, daily equity, account ledger, signals, virtual trades, refusals,
margin, monthly, annual, …) are **byte-identical** to the committed frozen artifacts and to the reproduction;
`summary.json` differs only in the run key and label. The full run's first 2,458 daily rows, 472 ledger events, 145
signals, 70 refusals and every trade closed by 2025-10-13 are byte-identical to the run that stops there (no
look-ahead). `src/multi-etf-allocator/tests/datasetParity.test.ts` keeps this as a test.

## 3. Full-history result (2016-01-04 → 2026-10-13)

One continuous run: funded at the close of 2016-01-04, books arming from 2017-06-15, nothing reset at 2024-01-01 or
2025-10-17.

- Ending equity **$3,661,933.45** from $300,000 (+1,120.6%, CAGR 26.1%).
- Strategy net **$629,310.27**, all realized (76 lots closed, none open): gross $737,366.34 − interest $108,056.07.
  47 wins, 29 losses; 147 virtual trades, 76 funded, 71 refused (pool occupied).
- Dividends received $102,868.07. Exposure 45.5% of sessions (1,067); average principal $237,014, maximum $593,251;
  maximum debt/equity 0.228; lowest daily equity/LMV 0.817.
- By ETF: VGT 14 lots +$309,716; XBI 17 +$93,398; XRT 6 +$31,531; KRE 39 +$194,665.
- Drawdowns: largest-dollar daily episode $594,129 (25.2%, 2025-01-23 → 2025-04-08); minute-sampled largest-dollar
  episode $689,419 (29.1%, 2025-01-24 → 2025-04-07); **largest percentage fall of daily equity 34.6%
  (2020-02-19 → 2020-03-23)**. The summary's percent fields follow the frozen engine's convention (depth of the
  largest-dollar episode); a minute-sampled largest-percentage fall is not measured.
- After the old endpoint: the VGT lot open on 2025-10-13 (marked +$174,607.17) closed 2025-11-07 by its trailing stop
  for +$166,219.23; one more lot, XRT 2025-11-12 → 2026-03-03 (maximum hold), −$3,897.66. So
  641,595.87 − (174,607.17 − 166,219.23) − 3,897.66 = 629,310.27, the full net, exactly.

Period attribution of the same run (`segments.csv`; not isolated backtests, which start flat and differ):

| Period | Dates | Equity | Return | Strategy P&L | Interest | Dividends | Lots in | Largest % fall (daily) |
|---|---|---|---|---|---|---|---|---|
| development | 2016-01-05 → 2023-12-29 | $300,000 → $1,700,903 | +467.0% | +$471,679 | $63,547 | $65,509 | 71 | 34.6% (2020-02-19 → 2020-03-23) |
| holdout | 2024-01-02 → 2025-10-16 | $1,700,903 → $2,866,785 | +68.5% | +$165,715 | $22,185 | $22,424 | 4 | 25.2% (2025-01-23 → 2025-04-08) |
| final | 2025-10-17 → 2026-10-13 | $2,866,785 → $3,661,933 | +27.7% | −$8,083 | $22,324 | $14,935 | 1 | 16.0% (2025-10-29 → 2026-03-30) |
| full | 2016-01-05 → 2026-10-13 | $300,000 → $3,661,933 | +1,120.6% | +$629,310 | $108,056 | $102,868 | 76 | 34.6% |

The final period's equity gain is almost entirely the VOOG/VGT core and its dividends; the strategy lost $8,083 there
(the VGT lot's mark fell from 2025-10-16 to its exit, and the XRT lot lost). This is reported, not acted on: no
parameter changes follow from it.

## 4. Accounting checks

- The program's independent ledger audit (`auditRun`, from the exported files only: inventories, assets − liabilities =
  equity at every event and close, entries move no cash, lot interest and net, Σ net = realized, one receivable per
  ex-date, pool limits, maintenance requirements): **29,322 checks, 0 failures** (full run); 26,842 checks, 0 failures
  (the 2025-10-13 run).
- No NaN in any output. `closest_approaches.csv` carries `Infinity` in the two-factor shock columns where no shock of
  the funded ETF alone can cause a call, exactly as the frozen file does.
- Provenance in `evaluation.json`: command line, git HEAD e8bfe39f (dirty working tree: this work, uncommitted), config
  sha256 `4df4940b…`, phenotypes VGT `3e77a419…`, XBI `453c4fd0…`, XRT `d7b7f222…`, KRE `6b8889e2…`, the D1 definition
  check ("dataset plumbing only"), data, partitions and ledger hashes, splits and adjusted distributions, coverage.

## 5. Changes in this work (uncommitted)

New: `src/lib/corporateActions.ts`, `config/market-events/` (splits, ledger, manifest, raw snapshot),
`src/market-events/{ledger,cli}.ts` and `src/app/marketEvents.ts` (`npm run market-events`),
`src/multi-etf-allocator/segments.ts`, `scripts/download.sh`, tests (`src/lib/tests/corporateActions.test.ts`,
`src/market-events/tests/ledger.test.ts`, `src/multi-etf-allocator/tests/datasetParity.test.ts`, new cases in the
allocator dataset and datasets tests), this report. Modified: `src/lib/evaluation.ts` (split adjustment in partition
runs), `src/lib/partitions.ts` (an invalid month no longer throws `RangeError`), `src/lib/index.ts`,
`src/multi-etf-allocator/{dataset,cli}.ts` (ledger, splits, `--end`, coverage only where distributions are booked,
segments, record), `src/data-partition/{canonical,cli}.ts` (`append`), `package.json`, `README.md`. Local only:
`data/download.sh` (now a wrapper), the evaluation outputs. Nothing under `research/` was modified.

## 6. Remaining limitations

- Bars after 2026-10-13 are not in the data. To extend: put `ALPACA_API_KEY`/`ALPACA_SECRET_KEY` in the environment,
  `for s in VOOG VGT XBI XRT KRE; do scripts/download.sh $s 2026-10-14; npm run datasets -- append $s; done`, then
  `npm run market-events -- update` if the run's end passes the ledger's coverage, and rerun the command.
- XBI/XRT/KRE distributions are not modelled (frozen convention; lots in those ETFs miss their payouts).
- Prices reported after 2026-04-21 are in pre-split units (VGT about 8×, VOOG 6× their quotes).
- XLE/XLU/XLY/XOP splits are unrecorded; partition runs of those symbols across them read raw prices (listed by
  `npm run market-events -- verify`).
- A minute-sampled largest-percentage drawdown is not measured.
