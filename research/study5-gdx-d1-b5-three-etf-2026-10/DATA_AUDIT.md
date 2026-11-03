# Data audit — Study 5 (GDX standalone D1; B5 restricted to VGT/KRE/GDX)

Generated from `results/data-audit/data-audit.json` (script `scripts/data_audit.py`, read-only over the canonical
files; run 2026-10-30 ≈20:24Z) and the repository's own verification reports `data/<SYMBOL>/dataset-report.json`
(`npm run datasets -- verify`, run by the user 2026-10-30 ≈18:41–18:44Z after the append). Nothing under `data/` was
written by this study.

## 1. Inputs (exact bytes used by every run of this study)

Format: headerless six-field UTC minute OHLCV (`README.md`, "Market data"), Alpaca SIP, **raw** prices (no dividend
or split adjustment in the file; recorded splits are forward-adjusted at load by `src/lib/corporateActions.ts`),
extended hours included in the file; strategies keep the regular session 09:30–16:00 ET.

| Symbol | File | Bytes | Rows | SHA-256 (current file) | First bar (UTC) | Last bar (UTC) | NYSE sessions |
|---|---|---:|---:|---|---|---|---:|
| GDX | `data/GDX/data.csv` | 79,996,839 | 1,489,753 | `134b74506f190f43a9118366bc626e697e92e9ea6302a8da6aa4bf85b76e50b6` | 2016-01-04T11:15:00Z | 2026-10-29T23:57:00Z | 2,722 |
| VGT | `data/VGT/data.csv` | 53,357,534 | 934,959 | `624e4094a988bd0136ce3aeaafbbe6b47afa3e6be400d656d6096890b3e7e41a` | 2016-01-04T13:00:00Z | 2026-10-29T23:58:00Z | 2,722 |
| KRE | `data/KRE/data.csv` | 60,230,261 | 1,131,568 | `fd7ab8aa365cbb8673163b7d7a8e0f7d980c36baae4b3b495f2a847a41ae9ee6` | 2016-01-04T13:51:00Z | 2026-10-29T23:55:00Z | 2,722 |
| XBI (control only) | `data/XBI/data.csv` | 63,382,315 | 1,180,065 | `83b71f75a58a01c891218ae4ba6ac18f60e6b40e4efb8bca3657a19145920cbc` | 2016-01-04T09:00:00Z | 2026-10-29T23:59:00Z | 2,722 |
| XRT (control only) | `data/XRT/data.csv` | 56,442,438 | 1,073,016 | `c625ca57b1bf6219dab2b3f95636cd83f7f885d5aba03b2934ac1d9f414a079c` | 2016-01-04T14:30:00Z | 2026-10-29T20:57:00Z | 2,722 |

`data/partitions.json` sha256 `43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6` (unchanged; it
defines the repository's generic `training`/`holdout`/`final` labels, which this study does **not** use as its own
splits; see PROTOCOL.md §3). Time zone of every session/date in this study: America/New_York.

## 2. The append (2026-10-30T18:40:39Z, `npm run datasets -- append`, record `data/datasets-append-run.json`)

| Symbol | Rows through 2026-10-13 | SHA-256 of that prefix | = frozen B5 pin (`config/pools/B5.json`) | Appended rows | Appended sessions |
|---|---:|---|---|---:|---|
| GDX | 1,481,880 | `86ce101fede1a412dd452fcc29dc87b69ade4ad67629230172fde878b7c2c320` | **yes** | 7,873 | 2026-10-14 → 2026-10-29 (12) |
| VGT | 928,192 | `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` | **yes** | 6,767 | same 12 |
| KRE | 1,126,493 | `40e7bd6c72c1dffb343b265bed16d69c964ba5bee81ad297a15e6d8a5607e01a` | **yes** | 5,075 | same 12 |
| XBI | 1,174,798 | `9afecc0606330d68ca12f7b0c331f75a150f64d0dad2e6ff910538a667b0c031` | **yes** | 5,267 | same 12 |
| XRT | 1,068,251 | `ca0fdc6a4c77a97d047bb710bcefc24fe7fdbd0dc117794725008b33700a0752` | **yes** | 4,765 | same 12 |

- The append was strictly additive: every byte through the last 2026-10-13 bar equals the file the frozen B5 anchors
  were computed on (recomputed here, not taken from the append record). The append tool's own proof agrees ("0
  overlapping rows identical …; training and holdout unchanged"). **No historical bar, adjustment or session changed.**
  Any difference between a current-data replay and a frozen B5 figure is therefore attributable only to the 12 new
  sessions (and, for a run whose endpoint falls inside an open position, to marks).
- VOOG was **not** appended (it still ends 2026-10-13, sha256 `a7aa42ae…` = frozen pin). This study uses the fixed
  $100,000 pool only, which does not read VOOG; the 20% portfolio mode is out of scope (PROTOCOL.md §1).
- The 12 appended sessions are complete for GDX, VGT and KRE: 390 regular-session bars each, first bar 09:30, last
  15:59, no intraday gap, no stale run longer than one bar. XBI (2026-10-23: 389 bars) and XRT (2026-10-26: 387,
  10-28: 388, 10-29: 389) have single missing minutes (normal for those books; controls only).
- GDX regular-session closes over the appended sessions: 83.41, 86.925, 87.695, 86.49, 86.13, 86.69, 81.72, 80.21,
  81.025, 83.13, 83.95, 81.34 (no split-sized move; largest close-to-open move −3.4% on 2026-10-22).
- **Exposure:** no earlier study read these bars (the prospective B4/B5 protocol froze before any post-2026-10-13 bar
  existed and records zero observations; `research/prospective-b4-b5-shadow/`). They are outside every search of this
  study and are reported only as a separately labelled 12-session recent slice, never as validation.

## 3. Integrity of the full history

- Repository verification (`dataset-report.json`, status `verified` for all five): 2,722 expected NYSE sessions,
  2,722 with regular bars, **no missing session, no bar on a closed day, no duplicate, no out-of-order row, no malformed
  row, no inconsistent OHLC**; the only anomaly class is "bars after 1:00 p.m. on early-close days" (13–21 days per
  symbol; regular-session logic uses the exchange calendar's early closes).
- Independent scan (this study): 0 duplicate timestamps and 0 out-of-order rows in each file. Sessions with fewer
  than 300 regular bars: GDX 20, KRE 21, XBI 21, XRT 21 — all early-close half days; VGT 618 (thin early-2016 trading
  and VGT's generally lower minute coverage, median 84.6% per the repository report; known since the multi-ETF audit,
  unchanged by the append). Longest intraday gap inside a regular session: GDX 56 min (2024-12-24, half day), KRE 177
  min (2016-11-25, half day), VGT 95 min (2019-11-29, half day). Longest run of identical flat bars: GDX 6, KRE 8,
  VGT 3 minutes. GDX's March 2020 crash sessions have 15-minute opening gaps (2020-03-09/12/16/18), noted for the
  March 2020 exit diagnostic.
- **Corporate actions.** Registered splits (`config/market-events/splits.json`, sha256 `e5bde427…`): VGT 8:1
  effective 2026-04-21 (the −87.45% raw overnight move; forward-adjusted at load). None for GDX, KRE, XBI or XRT. The
  largest unexplained overnight moves are market moves, not splits: GDX +13.5% (2020-03-24), −11.7% (2020-03-16),
  +9.6% (2016-06-24, Brexit), −8.8% (2020-03-12), −8.3% (2026-01-30); KRE −14.0% (2020-03-16), −12.6% (2023-03-13,
  regional-bank failures). D1 lots are price-only (distributions not credited; the frozen convention for non-VGT books
  and for the fixed pool), so an ex-dividend drop is a price move — the bias is against the strategy and small at GDX's
  yield.
- Because the append is additive and no history changed, the 2020 and 2026 profits of any run cannot come from an
  adjustment artefact; the only adjustment in play is VGT's registered 2026 split, forward-adjusted by the shared loader
  (`loadNUniverse`) that every path here uses; the study's full-history replays equal the pools CLI's runs to the
  cent (`RUN_COMMANDS.md`).

## 4. GDX market history (descriptive; daily regular-session closes; used only to place the partition boundaries)

| Year | First close | Max | Min | Last close |
|---|---:|---:|---:|---:|
| 2016 | 14.10 | 31.30 | 12.50 | 20.88 |
| 2017 | 21.74 | 25.58 | 21.10 | 23.23 |
| 2018 | 23.81 | 24.62 | 17.57 | 21.12 |
| 2019 | 21.05 | 30.95 | 20.17 | 29.29 |
| 2020 | 29.33 | 44.50 | 18.98 | 36.02 |
| 2021 | 38.51 | 39.69 | 28.90 | 32.02 |
| 2022 | 31.25 | 40.87 | 21.89 | 28.65 |
| 2023 | 29.64 | 35.84 | 25.91 | 31.02 |
| 2024 | 30.58 | 44.08 | 25.79 | 33.93 |
| 2025 | 35.33 | 91.27 | 34.57 | 85.79 |
| 2026 (→10-29) | 85.77 | 115.87 | 70.74 | 81.34 |

Peak-to-trough close declines of at least 20% from a running all-time high: 2016-08-02 → 2018-09-11 (−43.9%,
recovered 2020-04-22, containing the 2018 slide and the March 2020 crash low); 2020-08-05 → 2022-09-26 (−50.8%,
recovered 2025-03-17: the 2021 drift and the 2022 bear); 2026-02-27 → 2026-07-20 (−38.9%, not recovered by
2026-10-29). D1 arms on declines from a rolling L-session high, not from the all-time high, so it sees many more
(shallower, shorter) episodes than these three; their counts per partition are in PROTOCOL.md §3.
