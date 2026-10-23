# Data audit

Generated inputs: `results/audit/<TICKER>.json` (machine-readable audit per ticker, including VGT), `results/audit/summary.json`,
`results/audit/hashes.json` (the SHA-256 every later command verifies) and `results/audit/DATA_AUDIT_TABLES.md`, all written by
`npm run multi-etf-d1 -- audit` on 2026-10-23 before any strategy run of this program. The tables below are those files' tables.

## 1. What was audited and how

Every one of the nine minute files (the eight tickers and the VGT control) was read row by row with a tolerant parser
(`src/multi-etf-d1/audit.ts`, `auditRows`): timestamps (UTC suffix, ascending order, duplicates), prices (NaN, zero or
negative, open/high/low/close consistency), volume, and the New York wall-clock class of each row (regular session
9:30–16:00, the 16:00 closing print, extended hours). The rows were then grouped into sessions exactly as the strategy
files group them (`groupMarketSessions`: regular-session minutes plus the closing print, extended hours dropped, early
closes at 13:00 from the calendar in `src/lib/session.ts`), and each session was checked for its bar count against the
390 (or 210) regular minutes, its closing print, zero-range bars and minute volume. A common trading calendar was built
from the nine files (a date is a session when at least five files have one) to find missing sessions. Overnight gaps of
at least 10% were listed in both windows as corporate-action candidates. Return-like statistics (declines from the
rolling 74-session high, daily moves, intraday ranges, minute outliers) were computed on the development window only,
as evidence for the search bounds; the holdout window was inspected for existence, counts, missing or sparse sessions
and corporate-action-sized gaps only. No strategy, signal or parameter-dependent quantity was computed anywhere.

Source: Alpaca Market Data v2, SIP feed, `timeframe=1Min`, `adjustment=raw`, `start=2016-01-04`, `end=2025-10-16`
(`data/download-ohlcv.sh`, which the user ran for the eight tickers on 2026-10-22/23). Columns: ISO-8601 UTC minute
start, open, high, low, close, volume; no header, no trade counts.

## 2. Verdict

All eight files are **valid**: the loader accepts every one (no non-UTC, unsorted, duplicate or unparsable row), no
zero or negative price, no inconsistent OHLC row, 2,462 sessions each from 2016-01-04 to 2025-10-16 with no missing and
no sparse session, the common eligibility session 2017-06-15 present at index 365 in every file (as in the VGT file),
and the holdout window 2024-01-02 → 2025-10-16 complete (450 sessions). The common holdout end is **2025-10-16**: the
intended 2025-12-31 is truncated by data availability (the files end there), not by choice; no file holds a bar after
2025-10-16 and no 2026 bar exists. VGT ends on 2025-10-13 and is the regression control only.

## 3. Corporate actions and the price basis

- Prices are **raw** for every file: no split or dividend adjustment, so the eight tickers and the VGT control share
  the D1 baseline's price-only basis. None of the eight ETFs split in the window (no overnight gap of split size).
- The one material corporate action is **XLF on 2016-09-19**: a −18.1% overnight gap (23.62 → 19.35) with no
  comparable market move, consistent with the September 2016 real-estate (XLRE) spin-off distribution to XLF holders.
  It lies before the common eligibility session; `results/baseline/benchmark.md` shows that after 2017-06-15 the
  rolling reference high is never a pre-distribution high for any lookback in the search box (0 affected sessions for
  L = 150…250), so no arming decision of this program sees the artificial gap. The file's own arming convention
  (from session 74) *does* arm on it (two XLF trades in 2016–2017, `BASELINE_REPRODUCTION.md`), one reason the
  eligibility gate is applied to every ticker. XLF was not blocked and its prices were not adjusted.
- Every other gap of at least 10% is a market event present across tickers on the same dates: 2020-03-09 (XLE, the
  oil-price collapse), 2020-03-16 (IWM, XRT, KRE, XLY, XLF, XLE, VGT), 2020-11-09 (KRE, XLE, the vaccine rally),
  2021-01-27 (XRT, the retail-stock squeeze) and 2023-03-13/14 (KRE, the regional-bank crisis).
- **Distributions**: all eight ETFs pay quarterly distributions (XBI's are negligible, XLE's and KRE's the largest) and
  the ex-distribution drops are price moves in the data, exactly as for VGT. The repository holds no per-share
  distribution history for these tickers, so no total-return sensitivity was computed; every figure in this program is
  price-only and comparable across the nine files on that basis. A trade held across an ex-date loses the distribution
  in these backtests and pays no tax on it; the effect per trade is at most a quarterly yield (well under 1% of the
  position) and is the same direction for every ticker.

## 4. Execution plausibility (observed data quality, not an execution-cost model)

- Liquidity by median minute volume on the development window: XLF 74k, IWM 39k, XLE 32k, KRE 11k, XBI 9k, XLY 7k,
  XRT 6k, IWN 1.5k shares; VGT itself 0.8k. Zero-range minutes (open = high = low = close): IWN 13% (17% in the
  holdout), XRT 3%, the others ≤ 1%; VGT 26%. IWN and VGT have the same kind of thin minute tape; the other six are
  denser than the VGT the D1 rules were built on. Mean minute coverage is ≥ 99.6% for all but IWN (93%) and VGT (84%).
- Fills in this program are the observed opening trade of the minute after a decision (or the stop level), as in D1.
  A minute's open is an observed price, not evidence that an order of $100,000 would have filled there; on IWN and
  XRT the thinner tape makes that proxy weaker. The predeclared sensitivities (2/5/10 bps per side, next-open stop
  fills) are hypothetical cost assumptions reported in `ROBUSTNESS_AND_RISK.md`, not measured spreads.
- Sessions without a closing print (1–3 per file in development, 0–2 in the holdout): the last regular minute's close is
  the official close, as the strategy files do. Rows after 13:00 on early-close days are dropped by the grouping.

## 5. Tables (from `results/audit/DATA_AUDIT_TABLES.md`)

## Files

| Ticker | File | SHA-256 | Bytes | Rows | First row (UTC) | Last row (UTC) | Loader accepts |
|---|---|---|---:|---:|---|---|---|
| XBI | `data/XBI/XBI-2016-2025-1-minute.csv` | `ad5521e33b53fa15…` | 56,711,171 | 1,062,561 | 2016-01-04T09:00:00Z | 2025-10-16T23:57:00Z | yes |
| IWM | `data/IWM/IWM-2016-2025-1-minute.csv` | `e94869c669a5b0ad…` | 88,590,387 | 1,567,189 | 2016-01-04T09:00:00Z | 2025-10-16T23:59:00Z | yes |
| XRT | `data/XRT/XRT-2016-2025-1-minute.csv` | `c7c591557cc58576…` | 51,033,068 | 970,417 | 2016-01-04T14:30:00Z | 2025-10-16T23:53:00Z | yes |
| KRE | `data/KRE/KRE-2016-2025-1-minute.csv` | `5f8b2a284a862fdc…` | 54,242,088 | 1,021,018 | 2016-01-04T13:51:00Z | 2025-10-16T23:58:00Z | yes |
| XLY | `data/XLY/XLY-2016-2025-1-minute.csv` | `b58e2fbcd15d3b6a…` | 54,639,593 | 980,846 | 2016-01-04T13:44:00Z | 2025-10-16T20:35:00Z | yes |
| IWN | `data/IWN/IWN-2016-2025-1-minute.csv` | `aea1d2bb792bdc56…` | 49,610,795 | 890,198 | 2016-01-04T14:29:00Z | 2025-10-16T21:30:00Z | yes |
| XLF | `data/XLF/XLF-2016-2025-1-minute.csv` | `d6cc7fe9f0d4ebdf…` | 65,310,649 | 1,203,031 | 2016-01-04T09:00:00Z | 2025-10-16T23:53:00Z | yes |
| XLE | `data/XLE/XLE-2016-2025-1-minute.csv` | `e8adb598f40cdd95…` | 62,648,110 | 1,173,446 | 2016-01-04T11:39:00Z | 2025-10-16T23:50:00Z | yes |
| VGT | `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a…` | 46,207,832 | 809,490 | 2016-01-04T13:00:00Z | 2025-10-13T23:07:00Z | yes |

## Row sanity

| Ticker | Non-UTC | Unsorted | Duplicates | Unparsable | Non-positive price | Bad OHLC | Zero volume | Regular (9:30-16:00) | Closing (16:00) | Extended hours | Rows after 2025-12-31 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 954,692 | 2,445 | 105,424 | 0 |
| IWM | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 957,896 | 2,448 | 606,845 | 0 |
| XRT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 953,519 | 2,441 | 14,457 | 0 |
| KRE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 956,110 | 2,442 | 62,466 | 0 |
| XLY | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 956,162 | 2,441 | 22,243 | 0 |
| IWN | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 883,405 | 2,439 | 4,354 | 0 |
| XLF | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 957,281 | 2,446 | 243,304 | 0 |
| XLE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 957,212 | 2,445 | 213,789 | 0 |
| VGT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 797,156 | 2,436 | 9,898 | 0 |

## Sessions and coverage

| Ticker | Sessions | First | Last | 2017-06-15 present | Development sessions (→ 2023) | Dev missing | Dev sparse | Dev mean coverage | Holdout sessions (2024 →) | Holdout first | Holdout last | Holdout missing | Holdout sparse | Holdout mean coverage |
|---|---:|---|---|---|---:|---:|---:|---:|---:|---|---|---:|---:|---:|
| XBI | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.7% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| IWM | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 100.0% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| XRT | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.6% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 99.8% |
| KRE | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.9% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| XLY | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 99.9% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 99.9% |
| IWN | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 92.8% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 90.2% |
| XLF | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 100.0% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| XLE | 2462 | 2016-01-04 | 2025-10-16 | yes (index 365) | 2012 | 0 | 0 | 100.0% | 450 | 2024-01-02 | 2025-10-16 | 0 | 0 | 100.0% |
| VGT | 2459 | 2016-01-04 | 2025-10-13 | yes (index 365) | 2012 | 0 | 0 | 83.8% | 447 | 2024-01-02 | 2025-10-13 | 3 | 0 | 81.7% |

Common holdout end: **2025-10-16** (the last session every one of the eight files has).

## Liquidity and bar quality

| Ticker | Window | Median bars/session | Min bars/session | Without closing print | Early closes | Zero-range bars | Median minute volume | Minutes < 100 shares |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| XBI | development | 390 | 205 | 1 | 15 | 0.9% | 9,108 | 0 |
| XBI | holdout | 390 | 210 | 0 | 4 | 0.0% | 14,421 | 0 |
| IWM | development | 390 | 210 | 1 | 15 | 0.0% | 38,679 | 0 |
| IWM | holdout | 390 | 210 | 0 | 4 | 0.0% | 46,550 | 0 |
| XRT | development | 390 | 207 | 2 | 15 | 3.3% | 5,750 | 0 |
| XRT | holdout | 390 | 208 | 0 | 4 | 1.8% | 5,737 | 0 |
| KRE | development | 390 | 209 | 2 | 15 | 1.1% | 11,228 | 0 |
| KRE | holdout | 390 | 210 | 0 | 4 | 0.2% | 18,160 | 0 |
| XLY | development | 390 | 209 | 2 | 15 | 1.0% | 7,162 | 0 |
| XLY | holdout | 390 | 207 | 0 | 4 | 0.4% | 6,053 | 0 |
| IWN | development | 372 | 162 | 2 | 15 | 13.1% | 1,522 | 0 |
| IWN | holdout | 356 | 191 | 2 | 4 | 17.2% | 1,098 | 0 |
| XLF | development | 390 | 210 | 1 | 15 | 0.0% | 73,786 | 0 |
| XLF | holdout | 390 | 210 | 0 | 4 | 0.0% | 57,632.5 | 0 |
| XLE | development | 390 | 210 | 1 | 15 | 0.0% | 32,058 | 0 |
| XLE | holdout | 390 | 210 | 0 | 4 | 0.0% | 22,348 | 0 |
| VGT | development | 327 | 134 | 3 | 15 | 26.3% | 803 | 0 |
| VGT | holdout | 315 | 175 | 2 | 4 | 28.9% | 861 | 0 |

## Overnight gaps of at least 10% (corporate-action candidates, both windows)

| Ticker | Window | Date | Previous close | Open | Gap | Session volume |
|---|---|---|---:|---:|---:|---:|
| IWM | development | 2020-03-16 | 119.71 | 105.47 | -11.9% | 52,296,492 |
| XRT | development | 2020-03-16 | 32.74 | 29.31 | -10.5% | 6,509,253 |
| XRT | development | 2021-01-27 | 81.43 | 89.76 | 10.2% | 31,695,460 |
| KRE | development | 2020-03-16 | 37.64 | 32.38 | -14.0% | 8,505,464 |
| KRE | development | 2023-03-13 | 50.69 | 44.32 | -12.6% | 91,278,623 |
| KRE | development | 2020-11-09 | 41.36 | 45.76 | 10.6% | 24,481,946 |
| KRE | development | 2023-03-14 | 44.45 | 49.15 | 10.6% | 62,223,999 |
| XLY | development | 2020-03-16 | 102.30 | 91.38 | -10.7% | 8,273,466 |
| XLF | development | 2016-09-19 | 23.62 | 19.35 | -18.1% | 44,024,443 |
| XLF | development | 2020-03-16 | 23.05 | 19.35 | -16.1% | 103,925,400 |
| XLE | development | 2020-03-09 | 42.50 | 35.07 | -17.5% | 57,213,381 |
| XLE | development | 2020-03-16 | 32.19 | 27.95 | -13.2% | 38,293,247 |
| XLE | development | 2020-11-09 | 28.93 | 32.23 | 11.4% | 95,374,217 |
| VGT | development | 2020-03-16 | 219.63 | 193.27 | -12.0% | 1,875,066 |

## Development-window price statistics (2016-01-04 → 2023-12-29; search-bound evidence, no strategy)

| Ticker | Deepest decline from rolling 74-session high | ≥10% | ≥15% | ≥20% | ≥25% | ≥30% | ≥40% | Median |daily return| | P95 |daily return| | Median intraday range | Gaps ≥ 5% | Minute outliers (>3%) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 36.7% on 2022-05-11 | 824 | 495 | 316 | 175 | 64 | 0 | 1.29% | 4.36% | 2.45% | 7 | 0 |
| IWM | 41.4% on 2020-03-23 | 428 | 196 | 77 | 42 | 22 | 3 | 0.76% | 2.85% | 1.40% | 9 | 2 |
| XRT | 42.0% on 2020-03-23 | 685 | 378 | 186 | 73 | 20 | 4 | 0.96% | 3.43% | 1.74% | 11 | 7 |
| KRE | 52.6% on 2020-03-23 | 659 | 379 | 214 | 149 | 125 | 45 | 1.00% | 4.17% | 1.95% | 19 | 5 |
| XLY | 34.1% on 2020-03-18 | 351 | 220 | 97 | 38 | 7 | 0 | 0.63% | 2.87% | 1.17% | 7 | 3 |
| IWN | 44.8% on 2020-03-23 | 410 | 176 | 73 | 56 | 43 | 9 | 0.73% | 2.87% | 1.37% | 7 | 2 |
| XLF | 43.9% on 2020-03-23 | 398 | 193 | 116 | 55 | 35 | 1 | 0.68% | 2.85% | 1.27% | 12 | 6 |
| XLE | 62.0% on 2020-03-23 | 673 | 327 | 212 | 117 | 62 | 36 | 0.93% | 3.71% | 1.79% | 12 | 5 |
| VGT | 32.2% on 2020-03-23 | 359 | 175 | 67 | 14 | 3 | 0 | 0.71% | 3.09% | 1.28% | 7 | 0 |

Deepest decline from the rolling 74-session high by development year:

| Ticker | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 33.8% | 13.9% | 34.0% | 27.0% | 33.2% | 29.9% | 36.7% | 26.2% |
| IWM | 14.5% | 6.5% | 26.8% | 23.0% | 41.4% | 13.2% | 22.8% | 18.4% |
| XRT | 13.8% | 15.3% | 26.5% | 21.0% | 42.0% | 23.3% | 30.8% | 21.6% |
| KRE | 20.3% | 13.4% | 30.6% | 25.0% | 52.6% | 16.8% | 23.1% | 44.8% |
| XLY | 11.2% | 4.6% | 22.1% | 17.4% | 34.1% | 10.8% | 29.9% | 19.7% |
| IWN | 11.6% | 7.0% | 25.2% | 21.4% | 44.8% | 12.4% | 19.5% | 18.2% |
| XLF | 22.7% | 9.5% | 23.3% | 19.2% | 43.9% | 9.0% | 23.2% | 16.6% |
| XLE | 14.8% | 13.0% | 31.3% | 26.1% | 62.0% | 19.2% | 27.7% | 17.4% |
| VGT | 12.1% | 5.8% | 24.3% | 22.4% | 32.2% | 11.3% | 26.4% | 13.7% |

## Verdicts

- **XBI**: valid; warnings: development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **IWM**: valid; warnings: development: overnight gap of -11.9% on 2020-03-16 (corporate-action candidate; verify); development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **XRT**: valid; warnings: development: overnight gap of -10.5% on 2020-03-16 (corporate-action candidate; verify); development: overnight gap of 10.2% on 2021-01-27 (corporate-action candidate; verify); development: 2 sessions without a closing print (the last regular minute's close is the official close)
- **KRE**: valid; warnings: development: overnight gap of -14.0% on 2020-03-16 (corporate-action candidate; verify); development: overnight gap of -12.6% on 2023-03-13 (corporate-action candidate; verify); development: overnight gap of 10.6% on 2020-11-09 (corporate-action candidate; verify); development: overnight gap of 10.6% on 2023-03-14 (corporate-action candidate; verify); development: 2 sessions without a closing print (the last regular minute's close is the official close)
- **XLY**: valid; warnings: development: overnight gap of -10.7% on 2020-03-16 (corporate-action candidate; verify); development: 2 sessions without a closing print (the last regular minute's close is the official close)
- **IWN**: valid; warnings: development: 2 sessions without a closing print (the last regular minute's close is the official close); holdout: 2 sessions without a closing print (the last regular minute's close is the official close)
- **XLF**: valid; warnings: development: overnight gap of -18.1% on 2016-09-19 (corporate-action candidate; verify); development: overnight gap of -16.1% on 2020-03-16 (corporate-action candidate; verify); development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **XLE**: valid; warnings: development: overnight gap of -17.5% on 2020-03-09 (corporate-action candidate; verify); development: overnight gap of -13.2% on 2020-03-16 (corporate-action candidate; verify); development: overnight gap of 11.4% on 2020-11-09 (corporate-action candidate; verify); development: 1 sessions without a closing print (the last regular minute's close is the official close)
- **VGT**: valid; warnings: development: overnight gap of -12.0% on 2020-03-16 (corporate-action candidate; verify); development: 3 sessions without a closing print (the last regular minute's close is the official close); holdout: 3 calendar sessions missing (2025-10-14, 2025-10-15, 2025-10-16); holdout: 2 sessions without a closing print (the last regular minute's close is the official close)

