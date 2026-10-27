# Data audit — BTCUSDT minute bars

Sealed record: `results/audit/DATA_AUDIT.json` (body `f3076ac7…252dd7`), recomputed and matched by
`npm run btc-d1 -- data-audit`. Code: `src/btcusdt-d1/raw.ts` (byte-level parser, exact decimal conversion),
`audit.ts` (quality counts only: no returns or volatility over the whole history), `snapshot.ts` (snapshot rules).

## 1. What exists

Searched only `data/` (the project's rule). The only BTC file is `data/BTCUSDT/BTCUSDT-2017-2026.csv`: no metadata,
partition entry, derived file or README accompanies it; `data/partitions.json` has no BTC entry and
`docs/canonical-dataset-migration.md` notes it was left outside the ETF layout. It is git-ignored (`/data/*`) and
was never modified by this study.

| Property | Value |
|---|---|
| Size | 451,326,328 bytes, 4,736,573 lines, no header, LF line ends, no malformed line |
| sha256 | `dd91a2b36d1ea513167861b916723e65ffaeb3f2cc8deefe44e3993c0298de83` |
| Format | 10 fields separated by `\|` |
| Time | field 1, UNIX **seconds**, UTC, start of the minute; 2017-08-17T04:00:00Z → 2026-08-25T09:33:00Z |
| Prices | fields 2–5 open/high/low/close, USDT per BTC, at most 2 decimals |
| Volumes | field 6 base volume (BTC, 6 decimals to 2021, 5 from 2022), field 9 quote volume (USDT), field 8 taker-buy base volume (BTC), field 7 taker-buy quote volume (USDT), field 10 trade count |
| Venue / product | **unverified**: nothing local names a venue. The listing date (2017-08-17), field layout (a Binance kline without its close time), precision changes and maintenance-style outages are consistent with Binance spot BTCUSDT, which is an inference, not provenance. No derivatives field (funding, open interest, mark price) exists. |

Field meanings were verified, not assumed: for all 4,712,548 rows with volume, quote volume / base volume (the
minute's VWAP) lies inside [low, high]; for all 4,676,438 rows with taker buys, taker-buy quote / taker-buy base lies
inside [low, high]; taker-buy volumes never exceed the totals.

## 2. Integrity

| Check | Result |
|---|---|
| Duplicate or out-of-order timestamps | 0 / 0 |
| Non-positive prices; low > min(open, close); high < max(open, close); high < low | 0; 0; 0; 0 |
| Negative volumes; non-integer trade counts | 0; 0 |
| Rows with 0 trades | 24,025 (23,696 in 2017), every one flat at the previous close with zero volume |
| Rows with trades but zero volume | 0 |
| Timestamps not on a minute boundary | 21,602 in two segments (below) |
| Gaps (missing minutes between rows) | 34; 30 of ≥ 60 minutes; 1 of ≥ 1 day |
| One-minute close moves > 5% / > 10% | 22 / 0 |
| One-minute high/low ranges > 10% | 5 (2018-01-16, 2020-03-12 ×2, 2020-03-13, …) |

**Irregular timestamps.** 2017-12-04T06:00:20Z → 2017-12-18T10:00:20Z (20,401 rows at :20 s) and
2018-02-09T09:59:14Z → 2018-02-10T05:59:14Z (1,201 rows at :14 s), the second directly after the longest outage
(2018-02-08T00:28Z → 2018-02-09T09:59Z, 2,010 missing minutes). These rows are not minute-aligned bars; re-timing them
would be a repair, so the study history starts after them (§4).

**Missing minutes versus quiet minutes.** The source writes a row for a minute without trades (zero trades, flat at
the previous close), so a missing row is a minute with no record at all: a venue outage or maintenance, not a lack of
trades. The gaps look like maintenance windows (e.g. 2018-06-26 01:59 → 12:00, 2019-05-15 02:59 → 13:00, 2019-08-15
01:59 → 10:00) with price changes across them under 0.25%. Inside the study history there are 26 gaps of ≥ 60
minutes (5,878 missing minutes, the longest 600); 2022–2026 have 80 missing minutes in all (2023-03-24) and the
holdout window (2024-07-01 →) none.

**Extreme moves.** The largest one-minute moves are the 2020-03-12/13 crash (ranges to 11.7%, thousands of trades per
minute, consecutive bars consistent) and thin August–September 2017 prints (before the study history). None is an
isolated single-bar spike reversing to the prior level with negligible trades, so no bar is excluded as a bad print.

**Day coverage.** 3,296 calendar days, none without rows: 3,260 complete (1,440 rows), 5 with 1,380–1,439, 28 with
720–1,379, 2 with fewer (2018-02-08, and the partial last day 2026-08-25). The first day, 2017-08-17, starts at 04:00.

**Liquidity.** The largest minute quote volume is 259.9 million USDT (2024-12-05T22:28Z); the most trades in a minute
213,107 (2025-10-10T21:20Z). In the development span the median minute quote volume was about 110,000 USDT in 2018
and 2019 (46% of minutes below 100,000 USDT), 304,000 in 2020, 1.4 million in 2021–2022, 667,000 in 2023 and 910,000
in the first half of 2024. A 100,000 USDT market order was therefore about a typical 2018–2019 minute's entire
volume: the 5 bps principal impact is optimistic for those years. Every fill's participation is reported as a
capacity warning; the 10 and 20 bps impact scenarios are the sensitivity.

## 3. Snapshot (pinned once)

| Item | Value |
|---|---|
| Rule | snapshot end = 00:00 UTC of the last row's day, unless that row is the day's 23:59 minute (then the day is complete and kept) |
| Snapshot end | 2026-08-25T00:00:00Z (the last row is 2026-08-25T09:33Z; that day's 574 rows are excluded) |
| Raw prefix | first 451,271,344 bytes, sha256 `ed0d359a7bdb86c18f7aa6a73fef8a0bdb689d6ddcd0b3441ec47b79a08e7b76` |

Rows appended to the file later leave the prefix hash unchanged; `verify` and every outcome stage check it. Once the
audit is sealed, `npm run btc-d1 -- snapshot` reads only the sealed prefix and must reproduce the sealed definition,
and `data-audit` on a grown file verifies the prefix instead of re-auditing the new bytes.

## 4. Canonical series (staged in the research namespace)

| Item | Value |
|---|---|
| Rule | history start = 00:00 UTC of the first day after the last non-minute-aligned row before the snapshot end |
| History | 2018-02-11T00:00:00Z → 2026-08-24T23:59:00Z (3,117 UTC days) |
| Raw rows in history | 4,482,565 |
| Zero-trade rows dropped | 329 (no trade price; never a fill or a mark) |
| Canonical bars | 4,482,236, columns time/open/high/low/close/volume/quote volume/trades, float64 |
| Series sha256 | `cb7c9cdc097bd2b92a06cdfb771b916f6c2e1c1e8c975c84a979c490d15283f8` |
| Location | `research/btcusdt-d1/cache/btcusdt-d1-snapshot-v1.{bin,json}` (git-ignored; `npm run btc-d1 -- snapshot` rebuilds it byte-identically) |

The transformation is a filter only: no value is changed, no row is added, no minute is filled. Loading fails closed
unless every canonical bar is a minute-aligned traded minute after the previous one with 0 < low ≤ min(open, close)
≤ max(open, close) ≤ high (the fast replay's day-level skips depend on it). The parser marks a line malformed on an
empty field or any byte other than digits, '.', a leading '-' and '\r' (none in this file).

## 5. Regime coverage

The history spans the 2018 bear market, the 2019 recovery, the March 2020 crash, the 2020–2021 advance, the 2022
decline, the 2023–2024 recovery and the 2024–2026 period (the holdout). Per the outcome-blind rule, no return or
volatility statistic was computed to choose the split; the split uses only the first and last days (PROTOCOL.md §4).
