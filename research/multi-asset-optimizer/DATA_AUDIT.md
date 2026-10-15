# Data audit: Stooq daily OHLCV for the 21 required targets

Generated 2026-10-15T09:56:04.266Z from `data/stooq/manifest.json` (copied to [data/stooq-manifest.json](data/stooq-manifest.json); full machine-readable audit in [data/data-audit.json](data/data-audit.json)). Transform version `stooq-transform-v1`.

## Acquisition outcome

The pipeline first requests each symbol's Stooq historical-data page (`https://stooq.com/q/d/?f=20050101&t=<end>&s=<symbol>.us&c=1`) to follow its "Download data in csv file..." link. **Every HTTP request was refused** during preparation; the responses recorded were:

- `http_error: HTTP 403`

In an earlier manual probe with a browser user agent, both the page and the `q/d/l/` CSV endpoint returned a JavaScript proof-of-work "verify your browser" page instead of data. That is an access control, and the pipeline does not try to defeat it. A blocked response is recorded as `blocked`, never as a missing symbol.

Every symbol was therefore taken from the **Stooq bulk daily archive** already on disk (`/Users/chad/development/personal/trading/data/d_us_txt.zip`, sha256 `e3c0c5719b17d29fc9ef9247c323c7aebcee38271bb6f9320f8c4825aee5fb94`, members dated 2026-09-09). This is Stooq data, not another provider. Each member file is saved unmodified under `data/stooq/raw/<SYMBOL>/`, and its header row is removed and its columns mapped to the repository format (see the transformation section). **Consequence: the series end on 2026-09-08, not on the requested end date**, so the final holdout runs from 2024-01-01 to that date.

To use fresh page downloads instead, save each symbol's CSV from the page's "Download data in csv file..." link in a browser into `data/stooq/inbox/` (Stooq names it `<symbol>_us_d.csv`), then run `npm run optimizer -- prepare-data --refresh --offline`. The same header-removal and `;` → `|` conversion, parity check and manifest apply.

## Required universe (21 symbols)

| Symbol | Group | Status | Source | First | Last | Sessions | Missing vs SPY (≤2023 / holdout) | Extra | OHLC issues | Jumps >25% (≤2023) | Median $ volume 2014–2023 | Warmup before 2014 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| VGT | Technology-heavy / software ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $99.2M | 2227 |
| XLK | Technology-heavy / software ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $752.3M | 2227 |
| QQQ | Technology-heavy / software ETFs | ok | stooq-bulk-archive | 1999-03-10 | 2026-09-08 | 6916 | 0 / 0 | 1 | 0 | 0 | $6177.3M | 3727 |
| IGV | Technology-heavy / software ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $80.2M | 2227 |
| VOOG | Broad US market / large-cap growth ETFs | ok | stooq-bulk-archive | 2010-09-14 | 2026-09-08 | 4019 | 0 / 0 | 0 | 0 | 0 | $11.1M | 830 |
| VOO | Broad US market / large-cap growth ETFs | ok | stooq-bulk-archive | 2010-09-14 | 2026-09-08 | 4019 | 0 / 0 | 0 | 0 | 0 | $708.2M | 830 |
| SPY | Broad US market / large-cap growth ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $23674.7M | 2227 |
| SMH | Semiconductor ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $471.9M | 2227 |
| SOXX | Semiconductor ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5417 | 0 / 0 | 1 | 0 | 0 | $112.8M | 2228 |
| VUG | Diversified growth ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $123.0M | 2227 |
| SCHG | Diversified growth ETFs | ok | stooq-bulk-archive | 2009-12-11 | 2026-09-08 | 4208 | 0 / 0 | 0 | 0 | 0 | $31.9M | 1019 |
| IWF | Diversified growth ETFs | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $244.0M | 2227 |
| XLY | Consumer discretionary ETF | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $532.1M | 2227 |
| IWN | US small-cap value ETF | ok | stooq-bulk-archive | 2005-02-25 | 2026-09-08 | 5416 | 0 / 0 | 0 | 0 | 0 | $139.8M | 2227 |
| NVDA | Individual stocks | ok | stooq-bulk-archive | 1999-01-22 | 2026-09-08 | 6948 | 0 / 0 | 1 | 0 | 11 | $2550.2M | 3759 |
| AAPL | Individual stocks | ok | stooq-bulk-archive | 1984-09-07 | 2026-09-08 | 10581 | 0 / 0 | 1 | 0 | 3 | $7027.7M | 7392 |
| MSFT | Individual stocks | ok | stooq-bulk-archive | 1986-03-13 | 2026-09-08 | 10198 | 0 / 0 | 1 | 0 | 1 | $3098.0M | 7009 |
| AMD | Individual stocks | ok | stooq-bulk-archive | 1983-03-21 | 2026-09-08 | 10952 | 0 / 0 | 1 | 0 | 9 | $1620.2M | 7763 |
| META | Individual stocks | ok | stooq-bulk-archive | 2012-05-18 | 2026-09-08 | 3596 | 0 / 0 | 0 | 0 | 2 | $3488.1M | 407 |
| GOOGL | Individual stocks | ok | stooq-bulk-archive | 2004-08-19 | 2026-09-08 | 5548 | 0 / 0 | 1 | 0 | 0 | $2038.4M | 2359 |
| AMZN | Individual stocks | ok | stooq-bulk-archive | 1997-05-16 | 2026-09-08 | 7368 | 0 / 0 | 1 | 0 | 8 | $5830.1M | 4179 |

### Per-window eligibility

| Symbol | stress | fold-2019:train | fold-2019:validation | fold-2020:train | fold-2020:validation | fold-2021:train | fold-2021:validation | fold-2022:train | fold-2022:validation | fold-2023:train | fold-2023:validation | final-2014-2023:train | holdout |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| VGT | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| XLK | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| QQQ | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| IGV | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| VOOG | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| VOO | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| SPY | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| SMH | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| SOXX | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| VUG | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| SCHG | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| IWF | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| XLY | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| IWN | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| NVDA | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| AAPL | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| MSFT | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| AMD | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| META | partial | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| GOOGL | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |
| AMZN | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible | eligible |

Notes on partial or unavailable windows:

- **VGT stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **XLK stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **IGV stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **VOOG stress**: partial, data starts 2010-09-14; the stress test starts once a candidate has its full lookback of history.
- **VOO stress**: partial, data starts 2010-09-14; the stress test starts once a candidate has its full lookback of history.
- **SPY stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **SMH stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **SOXX stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **VUG stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **SCHG stress**: partial, data starts 2009-12-11; the stress test starts once a candidate has its full lookback of history.
- **IWF stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **XLY stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **IWN stress**: partial, data starts 2005-02-25; the stress test starts once a candidate has its full lookback of history.
- **META stress**: partial, data starts 2012-05-18; the stress test starts once a candidate has its full lookback of history.

### Inclusion decisions

- **VGT**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **XLK**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **QQQ**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **IGV**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **VOOG**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **VOO**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **SPY**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **SMH**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **SOXX**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **VUG**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **SCHG**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **IWF**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **XLY**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **IWN**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **NVDA**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15. 11 close-to-close or open-gap moves above 25% on or before 2023-12-31 (possible unadjusted corporate action or genuine crash); inspect before trusting results.
- **AAPL**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15. 3 close-to-close or open-gap moves above 25% on or before 2023-12-31 (possible unadjusted corporate action or genuine crash); inspect before trusting results.
- **MSFT**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15. 1 close-to-close or open-gap moves above 25% on or before 2023-12-31 (possible unadjusted corporate action or genuine crash); inspect before trusting results.
- **AMD**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15. 9 close-to-close or open-gap moves above 25% on or before 2023-12-31 (possible unadjusted corporate action or genuine crash); inspect before trusting results.
- **META**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15. 2 close-to-close or open-gap moves above 25% on or before 2023-12-31 (possible unadjusted corporate action or genuine crash); inspect before trusting results.
- **GOOGL**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15.
- **AMZN**: included in every walk-forward fold, the final shortlist and the holdout. Warnings: Bulk archive dated 2026-09-09: history ends at 2026-09-08, before the requested end 2026-10-15. 8 close-to-close or open-gap moves above 25% on or before 2023-12-31 (possible unadjusted corporate action or genuine crash); inspect before trusting results.

## Raw versus processed parity

After every write the processed file is re-read with `loadCsvBacktestData` (src/lib/csv.ts), the loader the optimizer uses, and every session is compared with the values parsed independently from the raw file.

| Symbol | Raw file | Raw sha256 | Processed sha256 | Rows | Mismatches |
|---|---|---|---|---|---|
| VGT | `data/stooq/raw/VGT/bulk-52f9f51ecd8c.txt` | `52f9f51ecd8c164b…` | `22710f54023a64de…` | 5416 | 0 |
| XLK | `data/stooq/raw/XLK/bulk-1c5ae66727a1.txt` | `1c5ae66727a1eb62…` | `b389819721b6b5d6…` | 5416 | 0 |
| QQQ | `data/stooq/raw/QQQ/bulk-796c6f723217.txt` | `796c6f7232170e08…` | `b0f57cc41cc4d967…` | 6916 | 0 |
| IGV | `data/stooq/raw/IGV/bulk-71991634e945.txt` | `71991634e94580d8…` | `f18ddadd675e3527…` | 5416 | 0 |
| VOOG | `data/stooq/raw/VOOG/bulk-31e498ecc1cc.txt` | `31e498ecc1cc1b7b…` | `6e533dda7d25bef2…` | 4019 | 0 |
| VOO | `data/stooq/raw/VOO/bulk-07303b386f7e.txt` | `07303b386f7e22b7…` | `9a3b172ed16e93f0…` | 4019 | 0 |
| SPY | `data/stooq/raw/SPY/bulk-137bcfe10fb6.txt` | `137bcfe10fb641e0…` | `8e678c8dffcf63ba…` | 5416 | 0 |
| SMH | `data/stooq/raw/SMH/bulk-69f590f6e22e.txt` | `69f590f6e22e8138…` | `cffb952ddad29502…` | 5416 | 0 |
| SOXX | `data/stooq/raw/SOXX/bulk-2de24c80c0bb.txt` | `2de24c80c0bbc77b…` | `d8244b3e3105f098…` | 5417 | 0 |
| VUG | `data/stooq/raw/VUG/bulk-e2932596d5c7.txt` | `e2932596d5c748d0…` | `c2b0f5aa186c4fda…` | 5416 | 0 |
| SCHG | `data/stooq/raw/SCHG/bulk-16ce6aa77e6d.txt` | `16ce6aa77e6d2b14…` | `723735db0cf34022…` | 4208 | 0 |
| IWF | `data/stooq/raw/IWF/bulk-314b8f3de84a.txt` | `314b8f3de84a69a0…` | `9aa074a6ff2258ce…` | 5416 | 0 |
| XLY | `data/stooq/raw/XLY/bulk-ea91a9c46490.txt` | `ea91a9c46490f913…` | `8f9944e38fad7d96…` | 5416 | 0 |
| IWN | `data/stooq/raw/IWN/bulk-507d2f118026.txt` | `507d2f118026c6f4…` | `5089cb8ce789b40d…` | 5416 | 0 |
| NVDA | `data/stooq/raw/NVDA/bulk-82fc67602cf5.txt` | `82fc67602cf5e694…` | `889e4620e2d45045…` | 6948 | 0 |
| AAPL | `data/stooq/raw/AAPL/bulk-bcbe65018c4b.txt` | `bcbe65018c4b2a81…` | `4968864df5b021c4…` | 10581 | 0 |
| MSFT | `data/stooq/raw/MSFT/bulk-884bfd8db39a.txt` | `884bfd8db39ab733…` | `677f36d46c2544a5…` | 10198 | 0 |
| AMD | `data/stooq/raw/AMD/bulk-3cd70d2e89ea.txt` | `3cd70d2e89ea65c8…` | `920424f3426a7749…` | 10952 | 0 |
| META | `data/stooq/raw/META/bulk-a2182a7e19a7.txt` | `a2182a7e19a768d1…` | `d7133cc11fa9b49a…` | 3596 | 0 |
| GOOGL | `data/stooq/raw/GOOGL/bulk-d4589bf2a3cd.txt` | `d4589bf2a3cd17b5…` | `08b6e1a32c21dc71…` | 5548 | 0 |
| AMZN | `data/stooq/raw/AMZN/bulk-ea68b71e9844.txt` | `ea68b71e9844b8ce…` | `585c98f3a886d435…` | 7368 | 0 |

## Transformation

- **Page CSV** (HTTP or inbox): exactly the first row (the header `Date,Open,High,Low,Close,Volume`) is removed. With `;` as the delimiter, every `;` in the data rows becomes `|`; with `,`, rows go through a CSV parser and are re-joined with `|`, so a quoted value can never be split. LF and CRLF endings and a missing final newline are accepted; a repeated header, blank rows or non-numeric fields are rejected.
- **Bulk archive TXT** (used here): the header row `<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>` is removed; ticker and period (`D`) are checked; `YYYYMMDD` becomes `YYYY-MM-DD`; TIME and OPENINT are dropped. The source is comma-delimited, so the `;` → `|` replacement does not apply and the rows go through the explicit field mapping instead.
- Output: headerless `YYYY-MM-DD|open|high|low|close|volume`, ascending, numeric text kept verbatim (no rounding), written atomically to `data/stooq/processed/<SYMBOL>/<SYMBOL>-stooq-daily.csv`. Existing files under `data/<SYMBOL>/` are never touched.

## Corporate actions and price convention

Assumption recorded in the manifest: Stooq back-adjusts its daily history for splits and, judging by the evidence below, distributions; Stooq does not document the method, so the convention is labeled unverified. Volume is split-adjusted (fractional values appear).

**VGT** (raw closing prints from `data/VGT/VGT-2016-2025-1-minute.csv` vs Stooq closes, last session of each year through 2023-12-31):

| Date | Raw close | Stooq close | Raw / Stooq |
|---|---|---|---|
| 2016-12-30 | 121.50 | 14.0034 | 8.6765 |
| 2017-12-29 | 164.73 | 19.1964 | 8.5813 |
| 2018-12-31 | 166.83 | 19.6701 | 8.4814 |
| 2019-12-31 | 244.85 | 29.2349 | 8.3753 |
| 2020-12-31 | 353.79 | 42.6952 | 8.2864 |
| 2021-12-31 | 458.17 | 55.6972 | 8.2261 |
| 2022-12-30 | 319.41 | 39.1575 | 8.1571 |
| 2023-12-29 | 484.00 | 59.777 | 8.0968 |

The raw/Stooq ratio drifts by 7.2% across year ends, falling over time: Stooq prices are back-adjusted for distributions as well as splits.

**VOOG** (raw closing prints from `data/VOOG/VOOG-2016-2025-1-minute.csv` vs Stooq closes, last session of each year through 2023-12-31):

| Date | Raw close | Stooq close | Raw / Stooq |
|---|---|---|---|
| 2016-12-30 | 109.23 | 16.6399 | 6.5643 |
| 2017-12-29 | 136.96 | 21.159 | 6.4729 |
| 2018-12-31 | 135.00 | 21.1202 | 6.3920 |
| 2019-12-31 | 174.38 | 27.65 | 6.3067 |
| 2020-12-31 | 230.08 | 36.872 | 6.2400 |
| 2021-12-31 | 301.74 | 48.6558 | 6.2015 |
| 2022-12-30 | 210.94 | 34.3132 | 6.1475 |
| 2023-12-29 | 270.79 | 44.5925 | 6.0725 |

The raw/Stooq ratio drifts by 8.1% across year ends, falling over time: Stooq prices are back-adjusted for distributions as well as splits.

Implications: back-adjusted prices fold distributions into price, so (1) backtested P&L includes dividends as if reinvested in the price path; the original strategy does not model dividends separately and is applied to these prices unchanged, (2) a trailing stop or dip computed on adjusted prices can differ slightly from one on the prices a broker would show, around ex-dividend dates, and (3) early adjusted prices and volumes are scaled, so dollar-volume figures are approximate. All 21 series come from the same source and convention; nothing is spliced across sources.

## Existing repository files compared (research period only)

| Symbol | File | Overlapping sessions ≤ research end | Identical | Differing | Examples |
|---|---|---|---|---|---|
| VGT | `data/VGT/VGT-2005-2015.csv` | 2672 | 2672 | 0 |  |
| VGT | `data/VGT/VGT-2005-2026-2.csv` | 4743 | 4743 | 0 |  |
| VGT | `data/VGT/VGT-2005-2026.csv` | 4490 | 4490 | 0 |  |
| VGT | `data/VGT/VGT-2016-2026.csv` | 1819 | 1819 | 0 |  |
| QQQ | `data/QQQ/QQQ-1999-2015.csv` | 4231 | 4231 | 0 |  |
| QQQ | `data/QQQ/QQQ-2016-2026.csv` | 1819 | 1819 | 0 |  |
| VOOG | `data/VOOG/VOOG-2016-2026.csv` | 1819 | 1819 | 0 |  |
| SOXX | `data/SOXX/SOXX-2016-2026.csv` | 1819 | 1819 | 0 |  |

## Jumps above 25% (research period)

| Symbol | Date | Close change | Open gap |
|---|---|---|---|
| NVDA | 2000-03-07 | 42.5% | 28.3% |
| NVDA | 2000-03-13 | 26.6% | -9.3% |
| NVDA | 2000-03-14 | -26.2% | -0.6% |
| NVDA | 2000-12-22 | 25.6% | 8.0% |
| NVDA | 2001-01-03 | 30.7% | -3.2% |
| NVDA | 2002-07-31 | -31.8% | -27.2% |
| NVDA | 2003-05-09 | 33.1% | 17.4% |
| NVDA | 2004-08-06 | -35.3% | -30.5% |
| NVDA | 2008-07-03 | -30.7% | -28.0% |
| NVDA | 2016-11-11 | 29.8% | 17.3% |
| NVDA | 2023-05-25 | 24.4% | 26.1% |
| AAPL | 1996-07-18 | 23.7% | 27.5% |
| AAPL | 1997-08-06 | 33.3% | 27.7% |
| AAPL | 2000-09-29 | -51.8% | -47.3% |
| MSFT | 1987-10-19 | -30.0% | -5.0% |
| AMD | 1987-10-19 | -36.1% | -11.1% |
| AMD | 1992-06-18 | -37.9% | -37.0% |
| AMD | 1994-03-10 | 26.9% | 1.1% |
| AMD | 2001-07-06 | -27.4% | -17.9% |
| AMD | 2002-10-03 | -32.4% | -17.5% |
| AMD | 2002-10-17 | 24.1% | 39.5% |
| AMD | 2002-10-21 | 26.1% | 7.5% |
| AMD | 2005-01-11 | -26.2% | -17.4% |
| AMD | 2016-04-22 | 52.3% | 21.8% |
| META | 2013-07-25 | 29.6% | 26.5% |
| META | 2022-02-03 | -26.4% | -24.3% |
| AMZN | 2001-01-03 | 26.5% | -1.9% |
| AMZN | 2001-03-05 | 26.2% | 23.8% |
| AMZN | 2001-04-09 | 33.6% | 41.5% |
| AMZN | 2001-11-14 | 30.2% | 4.7% |
| AMZN | 2001-11-26 | 34.5% | 8.3% |
| AMZN | 2002-01-22 | 24.0% | 25.4% |
| AMZN | 2007-04-25 | 26.9% | 18.8% |
| AMZN | 2009-10-23 | 26.8% | 18.7% |

## Missing and extra sessions

Sessions are compared with SPY's dates from the same source. For sessions after the research end, only counts are reported. An *extra* session is a date the symbol has and SPY lacks: 2011-02-17, a regular NYSE session, is missing from SPY and from every series here except SOXX, which only affects pre-2014 history (stress-test and warmup sessions).

- **QQQ**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **SOXX**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **NVDA**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **AAPL**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **MSFT**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **AMD**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **GOOGL**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).
- **AMZN**: 0 missing (0 on or before 2023-12-31; examples none), 1 extra (2011-02-17).

## Bias and limitations

- **Survivorship and selection**: the 21 targets were chosen in 2026 and are all instruments that exist and are prominent today. Single stocks such as NVDA, META, AMD and AMZN are known long-run winners, so any dip-buying result on them is inflated by hindsight selection.
- **Inception and truncation**: the bulk archive starts most ETFs on 2005-02-25 even where the fund is older, which limits the 2005–2013 stress window. VOO and VOOG (2010), SCHG (2009) and META (2012) have only partial or no stress history. None of this is backfilled.
- **Correlation**: VGT, XLK, QQQ, IGV, VOOG, VUG, SCHG, IWF and the large-cap stocks are heavily overlapping; agreement among them is not independent confirmation.
- **Liquidity**: all 21 are highly liquid in 2014–2023; fills at the close or a stop price are still idealized (see STRATEGY_BASELINE.md).

