# GDX data audit (brief Phase 1.1; `GDX_DATA_AUDIT.json`; written before the protocol freeze)

**Verdict: the canonical GDX file is complete and consistent for 2016-01-04 → 2026-10-30. No blocker.** One disclosed
finding: the program's closing-print proxy differs from the official close on two March 2020 sessions (§4).

## 1. Source and identity

| Item | Value |
|---|---|
| File | `data/GDX/data.csv`: the program's existing canonical GDX file. Nothing was downloaded, bought or subscribed for this study |
| Vendor, feed | Alpaca Markets Data API v2, SIP (consolidated, all US exchanges), 1-minute bars, raw prices |
| Rows, bytes | 1,490,494 rows; 80,036,100 bytes |
| sha256 | `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049` |
| First / last row (UTC) | 2016-01-04T11:15Z / 2026-10-30T23:59Z |
| Canonical verification | `npm run datasets -- verify GDX` (`data/GDX/dataset-report.json`, 2026-11-02): verified; 0 malformed, out-of-order, duplicate, out-of-range or inconsistent rows. The only anomaly is "bars after 1:00 p.m. on 21 early-close days"; these are post-close rows that the session grouping ignores |
| Same data as the benchmarks | Gate E2: this study's GDX door equals the GDX slot of N/original's own VGT/GDX door, bar by bar, on D24 and FULL |

## 2. Coverage, calendar and completeness

| | Development 2016-01-04 → 2024-12-31 | Validation 2025-01-02 → 2026-10-30 |
|---|---:|---:|
| NYSE sessions expected / present | 2,264 / 2,264 | 459 / 459 |
| Missing or extra sessions | 0 / 0 | 0 / 0 |
| Early closes (calendar / data) | 18 / 18 | 3 / 3 |
| Scheduled regular minutes | 879,720 | 178,470 |
| Minute bars present | 879,521 | 178,470 |
| Missing regular minutes | 199 (0.02 %) | 0 |
| Sessions missing > 5 minutes | 6 | 0 |
| Gaps of ≥ 5 minutes inside a session | 6: 2016-02-02 (9 min), the four March-2020 market-wide 15-minute circuit-breaker halts (2020-03-09, -12, -16, -18: 14 missing minutes each) and 2021-05-05 (5 min) | 0 |
| Duplicate, out-of-order, inconsistent OHLC bars | 0, 0, 0 | 0, 0, 0 |
| Sessions with a closing print | 2,263 of 2,264 | 459 of 459 |
| Minute close-to-close moves > 5 % | 2 | 0 |

The minute timestamps are ascending UTC minute starts. Sparse minutes are kept as they are and never filled. Halts are kept;
no fill is manufactured inside a gap.

## 3. Regular session and closing print only

The canonical session grouping (`src/lib/session.ts`) keeps only the scheduled regular session (09:30 → 16:00 New York
time, 13:00 on early closes; DST handled) and treats the first trade of the scheduled close minute as the closing print.
Pre-market and post-market rows stay in the file but never become a bar, a signal, a stop, a fill or a mark. Overnight
gaps reach the engine only through the next regular-session price: a stop gapped through fills at the open, and there is
no fictional pre-market fill.

## 4. Disclosed finding: the closing-print proxy on two crash sessions

Compared with an independent consolidated daily close (Yahoo Finance; split-adjusted, not dividend-adjusted;
2006-05-22 → 2024-12-31 only, so no 2025–2026 data was requested), 2,262 of 2,264 development closes agree within 1 %
(p99 0.19 %):

| Session | Our close (the proxy) | Last regular trade | Independent close | Difference |
|---|---:|---:|---:|---:|
| 2020-03-18 | 20.71 | 20.715 | 19.68 | 5.2 % |
| 2020-03-17 | 25.19 | 25.28 | 25.50 | 1.2 % |

The proxy is the open of the scheduled close minute's bar. On these two crash sessions the official auction print lay
elsewhere in that minute's range: 19.64–20.75 on 2020-03-18 (105 M shares in the minute) and 25.19–25.50 on 2020-03-17.
This is the frozen data path of every study in the program, including N/original and New L0, and of the accepted GPU
evaluator. It is **disclosed, not repaired**: repairing it would change the evaluation code and every benchmark.
It can affect a mark or a close-anchored signal on those two sessions only.

## 5. Corporate actions and price basis

- **Splits: none in the window.** The central ledger `config/market-events/splits.json` (sha256-pinned in the door pins)
  lists no GDX event. No raw overnight move falls outside [−40 %, +60 %]; the largest development moves are real market
  moves: 2020-03-24 +13.7 %, 2020-03-16 −11.8 %, 2016-06-24 +9.5 %, 2020-03-12 −8.8 %, 2016-02-11 +7.1 %. Yahoo lists no
  GDX split since 2006. A GDX event appearing in the central ledger would fail the doors closed.
- **Distributions:** GDX pays one distribution a year, in December. The ex-dates and amounts since 2016 come from the
  independent source: 2016-12-19 $0.055, 2017-12-18 $0.176, 2018-12-20 $0.105, 2019-12-23 $0.191, 2020-12-21 $0.190,
  2021-12-20 $0.535, 2022-12-19 $0.476, 2023-12-18 $0.500 and 2024-12-23 $0.403. The 2025–2026 events are fetched at the
  portfolio stage, after the outcome.
- **Price basis: raw prices, price-only P&L.** This is the frozen convention of every strategy in the program: a trading
  lot held over an ex-date is not credited the distribution, and the ex-date price drop is part of its P&L. The effect is
  reported only in the portfolio stage (PROTOCOL §15.7) and is never written into the trading results.

## 6. Doors

| Door | Through | Sessions | Rows | sha256 (prefix) |
|---|---|---:|---:|---|
| D19 | 2019-12-31 | 1,006 | 512,707 | `528786451a8fa1ab…` |
| D21 | 2021-12-31 | 1,511 | 781,678 | `3f98c79b4f8d20b5…` |
| D23 | 2023-12-29 | 2,012 | 1,047,761 | `a9ea93aaace8f2a7…` (= the canonical training partition) |
| D24 | 2024-12-31 | 2,264 | 1,189,831 | `f78dbe2a1f88666b…` |
| FULL | 2026-10-30 | 2,723 | 1,490,494 | `77dba9b21c4b6849…` (= the canonical file) |

Each door is a byte prefix of the canonical file, verified by size, sha256 and last row before parsing
(`data/DOOR_PINS.json`, sha256 `6c9a9167…`). Gate E2 shows that each door equals the canonical partition path session by
session and bar by bar, and that each shorter door is a prefix of the next.

## 7. The core's data (portfolio stage)

VOOG and VGT (`data/VOOG/data.csv`, `data/VGT/data.csv`) use the same session calendar. Both have the central 2026-04-21
splits (VOOG 6:1, VGT 8:1) and the central distribution ledger. They are audited inside the portfolio stage
(`reports/portfolio/portfolio.json`: sessions, splits, and every ledger distribution checked against an independent
source).
