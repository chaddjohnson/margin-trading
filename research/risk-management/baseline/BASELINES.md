# Baselines — reproduction and data verification

Coordinator deliverable 1. All numbers below are generated from `results/*.json` by `write_baselines_md.py`.

## 1. Reproduction of the four reference baselines

The authoritative implementation is `src/app/allIn.ts` (commit dc2f8c2, unchanged). That file currently hardcodes `data/${symbol}/${symbol}-1999-2015.csv`, so it cannot load the VGT 2004–2015 file or either 2016–2026 file as committed. For verification it was copied to `reference/allIn_reference.ts` with one change: the data file is passed as a parameter (see the diff at the top of that file). It was run with `node --experimental-transform-types` (`reference/run_reference.ts`).

The Python research engine (`engine.py`) was then compared with it trade by trade: entry date, exit date and net P&L to the dollar for every closed trade, the open position, and the totals.

| Dataset | Range | TS net | Python net | TS max DD | Python max DD | TS interest | Python interest | Closed trades | Open at end | Trade mismatches | Result |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| VGT_2005_2015 | 2005-02-25 → 2015-10-07 | 11,602 | 11,602 | 73,404 | 73,404 | 71,575 | 71,575 | 47 | yes | 0 | **exact match** |
| QQQ_1999_2015 | 1999-03-10 → 2015-12-31 | -2,886 | -2,886 | 149,561 | 149,561 | 124,858 | 124,858 | 108 | yes | 0 | **exact match** |
| VGT_2016_2026 | 2016-10-07 → 2026-10-06 | 161,772 | 161,772 | 38,323 | 38,323 | 73,233 | 73,233 | 45 | no | 0 | **exact match** |
| QQQ_2016_2026 | 2016-10-07 → 2026-10-07 | 116,388 | 116,388 | 39,237 | 39,237 | 62,595 | 62,595 | 35 | yes | 0 | **exact match** |
| QQQ_2016_2026 | 2016-10-07 → 2026-10-06 | 116,710 | 116,710 | 39,237 | 39,237 | 62,564 | 62,564 | 35 | yes | 0 | **exact match** |

All four reference values reproduce exactly.
- **VGT 2005–2015:** $11,602 / $73,404.
- **QQQ 1999–2015:** −$2,886 / $149,561.
- **VGT 2016–2026:** $161,772 / $38,323.
- **QQQ 2016–2026:** $116,710 / $39,237, with an end date of 2026-10-06.

**QQQ 2016–2026 date range.** The data file extends one session further, to 2026-10-07. As required, experiments use the full file, which gives **$116,388**. The −$322 difference is the open position marked at one more close, with one more day of interest. Max drawdown is unchanged.

**Open positions at the end.** Three datasets end with a position open: VGT 2005–2015, QQQ 1999–2015 and QQQ 2016–2026. Net profit includes its unrealized P&L at the last close, net of accrued interest, consistently with allIn.ts.

## 2. Data verification

| Dataset | File | First | Last | Rows | Duplicate dates | Gaps > 5 days | Non-positive prices | OHLC-inconsistent rows | Zero-range rows | Largest daily moves | SMA200 first available |
|---|---|---|---|---:|---:|---|---:|---:|---:|---|---|
| VGT_2005_2015 | `data/VGT/VGT-2004-2015.csv` | 2005-02-25 | 2015-10-07 | 2672 | 0 | none | 0 | 0 | 0 | 2008-10-13 +11.0%; 2008-10-28 +10.3%; 2008-09-29 -8.0% | 2005-12-08 |
| QQQ_1999_2015 | `data/QQQ/QQQ-1999-2015.csv` | 1999-03-10 | 2015-12-31 | 4231 | 0 | 2001-09-17 | 0 | 0 | 0 | 2001-01-03 +16.9%; 2000-01-07 +12.4%; 2008-10-13 +12.1% | 1999-12-22 |
| VGT_2016_2026 | `data/VGT/VGT-2016-2026.csv` | 2016-10-07 | 2026-10-06 | 2512 | 0 | none | 0 | 0 | 0 | 2020-03-16 -13.5%; 2025-04-09 +13.5%; 2020-03-13 +11.0% | 2017-07-25 |
| QQQ_2016_2026 | `data/QQQ/QQQ-2016-2026.csv` | 2016-10-07 | 2026-10-07 | 2513 | 0 | none | 0 | 0 | 0 | 2025-04-09 +12.0%; 2020-03-16 -12.0%; 2020-03-12 -9.2% | 2017-07-25 |

- **Market closure gap.** The only gap over 5 days is the post-9/11 closure (2001-09-11 to 2001-09-17).
- **Large moves.** The largest moves are real market events: Jan 2001 rate cut, Oct 2008, Mar 2020, Apr 9 2025.
- **File name vs contents.** The file named `VGT-2004-2015.csv` actually starts on 2005-02-25.
- **Price adjustment.** Prices appear split- and dividend-adjusted, and are used as given, as in allIn.ts.
- **Warm-up.** No data before each file's first date exists in the repository. Indicators that need history (for example SMA200) are unavailable until enough sessions have accumulated; experiments must use their specified fallback and report how often it applies. The baseline's own 90-session high uses a shorter window during the first 90 sessions, exactly as allIn.ts does.

## 3. Research engine

- **Files:** `engine.py` (replica plus extension hooks) and `metrics.py` (standard metrics, windows, matched controls, output writing). Both are frozen and read-only during the experiments; their SHA-256 values are in `CHECKSUMS.txt`.
- **Hooks:** `entry_size`, `entry_allowed`, `extra_stops`, `add_on`, `on_exit`, `on_session_end`. They are inert by default.
- **Hook tests** (`test_engine.py`):
  - An unreachable extra stop and a zero add-on both reproduce the baseline exactly.
  - A $50k fixed size produces exactly half the profit and drawdown with identical trades. Profit-conditional activation and the loss exit depend only on the sign of P&L, so position size never changes the trade sequence.
  - Margin dollar-days equal total interest ÷ (11% ÷ 365) exactly, and full-range window statistics equal the totals.
- **Assumptions introduced for extensions** (none affect the baseline):
  - Extra sell stops fill at the open if the open is at or below them. Otherwise, the highest level the session low reaches fills, because price must pass higher levels first; no high/low ordering is assumed. There is one fill per session.
  - Add-on lots are bought at the close, accrue their own interest, cannot trigger an exit in their purchase session, and never reset or lower the stop.

## 4. Baseline standard metrics

| Metric | VGT_2005_2015 | QQQ_1999_2015 | VGT_2016_2026 | QQQ_2016_2026 |
|---|---:|---:|---:|---:|
| Net profit | 11,602 | -2,886 | 161,772 | 116,388 |
| Realized / unrealized | 5,872 / 5,731 | -12,257 / 9,371 | 161,772 / 0 | 103,991 / 12,398 |
| Margin interest | 71,575 | 124,858 | 73,233 | 62,595 |
| Closed trades (W/L) | 47 (13/34) | 108 (38/70) | 45 (17/28) | 35 (15/20) |
| Win rate | 28% | 35% | 38% | 43% |
| Avg win / avg loss | 7,751 / -2,791 | 8,971 / -5,045 | 14,622 / -3,100 | 12,128 / -3,896 |
| Largest win / loss | 21,725 / -20,604 | 57,832 / -21,715 | 50,533 / -11,151 | 52,700 / -10,297 |
| Max drawdown | 73,404 | 149,561 | 38,323 | 39,237 |
| Max DD / $100k | 73% | 150% | 38% | 39% |
| Peak → trough | 2007-07-19 → 2009-03-09 | 2000-03-27 → 2002-09-30 | 2021-04-15 → 2022-10-14 | 2021-09-07 → 2022-12-28 |
| Profit / max DD | 0.16 | -0.02 | 4.22 | 2.97 |
| Max consecutive losses | 6 | 8 | 4 | 4 |
| Lowest cumulative P&L | -49,713 | -102,735 | -7,070 | -8,254 |
| Fell below −$100k | False | True | False | False |
| Longest underwater (days) | 3002 (not recovered) | 5757 (not recovered) | 790 | 1395 |
| Worst day | -8,276 (2008-09-29) | -9,288 (2001-04-20) | -13,421 (2020-03-16) | -8,732 (2020-03-12) |
| Avg borrowed (all sessions) | 61,340 | 67,620 | 66,640 | 57,023 |
| Avg borrowed (while invested) | 100,000 | 100,000 | 100,000 | 100,000 |
| % sessions exposed | 61% | 68% | 67% | 57% |
| Margin dollar-days | $237.5M·d | $414.3M·d | $243.0M·d | $207.7M·d |
| Net profit per $1M dollar-days | 49 | -7 | 666 | 560 |

### Bear-market windows (calendar boundaries)

Period P&L is the change in cumulative P&L across the window. Window drawdown is peak-to-trough inside it.

| Dataset | Window | Period P&L | Max DD in window | Interest | Trades closed | Losing | Largest loss | Avg borrowed |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2007-2009 | -38,496 | 73,404 | 21,879 | 23 | 16 | -20,604 | 66,005 |
| QQQ_1999_2015 | 2000-2002 | -91,629 | 149,561 | 28,630 | 56 | 36 | -20,200 | 87,899 |
| QQQ_1999_2015 | 2007-2009 | 20,931 | 70,759 | 32,066 | 21 | 15 | -21,715 | 96,825 |
| VGT_2016_2026 | 2022 | -23,643 | 34,856 | 9,644 | 13 | 10 | -11,151 | 90,438 |
| QQQ_2016_2026 | 2022 | -26,320 | 33,932 | 9,764 | 13 | 10 | -10,297 | 90,438 |

### Recovery windows

| Dataset | Window | Period P&L | P&L of trades entered in window (n) |
|---|---|---:|---:|
| VGT_2005_2015 | 2009 (2009-03-01..2009-12-31) | 15,518 | 21,725 (1) |
| QQQ_1999_2015 | 2003 (2003-01-01..2003-12-31) | 18,291 | 15,116 (3) |
| QQQ_1999_2015 | 2009 (2009-03-01..2009-12-31) | 66,522 | 57,832 (1) |
| VGT_2016_2026 | 2020 (2020-03-16..2020-12-31) | 48,081 | 59,322 (5) |
| VGT_2016_2026 | 2023 (2023-01-01..2023-12-31) | 44,468 | 42,695 (3) |
| VGT_2016_2026 | 2025 (2025-04-01..2025-12-31) | 39,671 | 36,838 (3) |
| QQQ_2016_2026 | 2020 (2020-03-16..2020-12-31) | 63,718 | 61,124 (5) |
| QQQ_2016_2026 | 2023 (2023-01-01..2023-12-31) | 25,111 | 22,266 (2) |
| QQQ_2016_2026 | 2025 (2025-04-01..2025-12-31) | 19,964 | 19,964 (2) |

## 5. Reproducing

```
PY=<python with pandas numpy scipy tabulate>
cd research/risk-management/baseline
$PY validate_reference.py   # TS vs Python, trade by trade
$PY test_engine.py         # hook and accounting tests
$PY verify_data.py         # data checks
$PY run_baseline.py        # writes results/
$PY write_baselines_md.py  # regenerates this file
```
