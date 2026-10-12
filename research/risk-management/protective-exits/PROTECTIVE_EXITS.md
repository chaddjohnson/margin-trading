<!-- Saved by the coordinator. Research agent 3 returned this report as text because the harness blocked subagents from
writing report files. The content is the agent's, unedited. Its numbers were cross-checked against the coordinator's
independent re-implementation (comparison/independent_verification.json). -->

# Protective loss exits (experiment `protective_exits`)

Research agent 3 of 5. This follows SPEC.md section 3 with the frozen engine and metrics, unmodified. Configurations were fixed in advance, and no parameter was changed after seeing results.

**In one line:** all three protective stops lower net profit on all four datasets (by $5.3k–$100.7k) and raise max drawdown in 11 of 12 cases. The matched-exposure controls, which are essentially the baseline because exposure is unchanged, beat every variant. **Preliminary classification: Unpromising.**

**Files** (in `research/risk-management/protective-exits/`):
- `strategies.py`: the `Baseline`, `ProtectiveStop` (B, C) and `EarlyDeterioration` (D) classes, all built on the `extra_stops` hook.
- `run.py`: runs 4 configs × 4 datasets through `metrics.run_config` and computes the experiment-specific `extra` data. It writes `results/` and asserts that A_baseline reproduces the baseline.
- `verify.py`: re-derives every protective fill from the raw OHLC independently. It writes `results/verification.json` and `results/spot_checks.txt`.
- `report_tables.py`: renders every table below from `results/summary.json`.
- `results/summary.json`, plus `results/trades/` and `results/daily/` (`<dataset>__<config>.csv`), and `results/baseline_reproduction.json`.

To reproduce: `PYTHONDONTWRITEBYTECODE=1 $PY run.py && $PY verify.py && $PY report_tables.py` (about 3 seconds).

## 1. Configuration and exact implementation

| Config | Protective sell stop | Active sessions |
|---|---|---|
| A_baseline | none | – |
| B_protective_stop_8pct | entry × 0.92 | every session after the entry session |
| C_protective_stop_10pct | entry × 0.90 | every session after the entry session |
| D_early_deterioration_5pct_5sessions | entry × 0.95 | entry+1 … entry+5 (trading sessions, inclusive) |

**Common definitions**
- **Entry price:** the close of the entry session (`e.pos.entry_price`). With no add-on lots, this equals the average cost.
- **The level never moves.** It is independent of the profit-conditional trailing stop.
- **Unchanged rules:** the trailing stop, the 15-day loss exit, the $100k size, the entry signal and immediate re-entry.
- **Hook output:** `extra_stops(e, i)` returns `[('protective stop', level)]` when active, otherwise `[]`. The level depends only on the entry close and on i − entry_i, so there is no look-ahead.

**Order of events in session i, for a position held since before session i (engine semantics, unmodified):**

1. **Before the open.**
   - The trailing stop is active only if selling at it would be profitable after interest accrued through session i.
   - The protective level is fixed. D returns no level outside its window.
   - The hook is never consulted on the entry session itself.
2. **At the open,** triggers are checked in this order:
   - (a) the 15-day loss exit (held ≥ 15 calendar days and a sale at the open would lose);
   - (b) an active trailing stop that the open gaps through;
   - (c) a protective stop with open ≤ level.

   Any trigger means one sale at the open. The first trigger is recorded as `reason` and the others go in `also`. A protective-only gap is recorded as `protective stop gap`, filled at the open below the level.
3. **During the session,** if the low reaches the active trailing stop and/or the protective level, the highest level fills.
   - An active trailing stop is always above breakeven, so it is always above every protective level and wins.
   - Otherwise, the protective stop fills exactly at its level (`protective stop`). There is one fill per session.
4. **If there is no exit,** the post-entry high and low and the trailing level are updated.
5. **At the close,** there is no re-entry in the exit session.
   - The earliest re-entry is at the close of i+1, if the close is ≥ 10% below the 90-session high.
   - A re-entry is a fresh $100k position with a new level, a new 15-day clock and a new trailing stop.

**Assumptions**
- Daily adjusted OHLC.
- Intraday fills happen exactly at the level, with no slippage; gap fills happen exactly at the open.
- There are no commissions.

**What counts as a protective exit:** a closed trade whose reason is `protective stop` or `protective stop gap`. Three coincident cases, where another trigger filled at the same open or at a higher level, are excluded (see Q1).

**The open position at the end** counts as the "next trade" after a protective exit.

## 2. Verification

**A_baseline reproduction.** For all four datasets, the A_baseline record matches the frozen baseline exactly:
- the metrics record is identical to `baseline/results/summary.json`;
- the matched-control record is identical too;
- `trades/<ds>__A_baseline.csv` and `daily/<ds>__A_baseline.csv` are byte-identical to the baseline's.

The result is recorded in `results/baseline_reproduction.json` and asserted in `run.py`.

**Determinism.** `run.py` runs each config twice: once in a pre-run that computes the extra data, and once through `run_config`. It asserts that the two runs are identical. The divergence episodes (§8) sum to the net difference within 1e-6, and this is asserted.

**`verify.py`.** It checks all 841 variant trades, including the 215 protective exits, against raw OHLC without using the engine:
- no fill on the entry session, and none outside D's window;
- no missed trigger: on every earlier active session, the low stayed above the level;
- gap fills equal the open with open ≤ level;
- intraday fills equal the level, with open > level ≥ low;
- other exits on sessions that reached the level are explained by another trigger;
- P&L = shares × exit − 100,000 − 100,000 × 11% × days / 365;
- trades before the first protective exit are identical to the baseline's.

**Result: 0 problems.**

**Spot checks** (`results/spot_checks.txt`):

| # | Dataset / config | Entry close | Level | Exit session O / H / L / C | Fill | P&L | Next |
|---|---|---|---|---|---|---:|---|
| 1 | VGT_2016_2026 B | 2020-03-13 26.3260 (3,798.53 sh) | 24.2199 | 2020-03-16 23.1649 / 24.7590 / 22.7741 / 22.7754 | **gap at open 23.1649** | −12,097.93 (interest 90.41) | re-entry 03-17 @ 24.1464, stopped out 03-18, −8,030 |
| 2 | QQQ_2016_2026 B | 2025-04-01 472.70 | 434.884 | 2025-04-04 438.14 / 440.37 / 422.67 / 422.67 | **intraday at level 434.884** | −8,090.41 | re-entry 04-07 @ 423.69, +1,163 |
| 3 | QQQ_2016_2026 C | 2022-04-28 321.554 | 289.3986 | 2022-05-11 292.563 / 298.105 / 285.223 / 286.093 (earlier lows 289.897 and 290.732 stayed above the level) | intraday 289.3986 | −10,391.78 (13 days) | re-entry 05-12 @ 285.417 |
| 4 | QQQ_2016_2026 D | 2024-08-02 446.733 | 424.3963 | 2024-08-05 422.801 / 440.302 / 421.548 / 433.413 | **gap at open 422.801** | −5,447.53 | re-entry 08-06 @ 437.555 (+3.5%) |
| 5 | VGT_2016_2026 D | 2025-04-11 64.7395 | 61.5025 | 2025-04-21 (entry+5, last active session) 61.8818 / 61.9926 / 60.3484 / 61.2060 | intraday 61.5025 | −5,301.37 | re-entry 04-22 @ 62.712 → +40,644 |
| 6 | VGT_2016_2026 D | 2018-12-11 20.6809 | 19.6469 | lows first reach the level on 12-19 (entry+6) | **correctly no exit** | maximum-hold exit, −11,539 | – |
| 7 | QQQ_2016_2026 D | 2020-02-27 198.936 | 188.9892 | lows first reach the level on 03-09 (entry+7) | **correctly no exit** | maximum-hold exit, −9,486 | – |
| 8 | VGT_2005_2015 B | 2010-02-04 5.4694 | 5.0318 | 2010-05-06 6.0702 / 6.1159 / 4.8385 / 5.8842 | trailing stop at 5.9637 (higher) fills first; protective listed in `also` | +6,294.91 | – |

## 3. Standard metrics

"nr" means not recovered.

### VGT_2005_2015
| Metric | A | B 8% | C 10% | D 5%/5s |
|---|---:|---:|---:|---:|
| Net profit | 11,602 | -14,862 | -16,667 | 6,306 |
| Δ net vs A | +0 | -26,465 | -28,269 | -5,296 |
| Realized / unrealized | 5,872 / 5,731 | -23,622 / 8,760 | -25,427 / 8,760 | -2,454 / 8,760 |
| Margin interest | 71,575 | 71,545 | 71,575 | 71,395 |
| Closed trades (W/L) | 47 (13/34) | 51 (13/38) | 50 (13/37) | 54 (12/42) |
| Win rate | 28% | 25% | 26% | 22% |
| Avg win / avg loss | 7,751 / -2,791 | 7,455 / -3,172 | 8,049 / -3,515 | 9,266 / -2,706 |
| Largest win / loss | 21,725 / -20,604 | 21,725 / -8,392 | 21,725 / -11,767 | 33,093 / -7,087 |
| Max drawdown | 73,404 | 95,147 | 94,952 | 87,566 |
| Max DD / $100k | 73% | 95% | 95% | 88% |
| Peak → trough | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-03-05 |
| Profit / max DD | 0.16 | -0.16 | -0.18 | 0.07 |
| Max consecutive losses | 6 | 6 | 6 | 9 |
| Lowest cumulative P&L | -49,713 | -71,457 | -71,262 | -63,876 |
| Longest underwater (days) | 3002 (nr) | 3002 (nr) | 3002 (nr) | 3002 (nr) |
| Worst day | -8,276 (2008-09-29) | -8,276 (2008-09-29) | -10,090 (2015-08-24) | -7,605 (2008-12-01) |
| Avg borrowed (all sessions) | 61,340 | 61,228 | 61,265 | 61,115 |
| % sessions exposed | 61% | 61% | 61% | 61% |
| Margin dollar-days ($M·d) | 237.5 | 237.4 | 237.5 | 236.9 |
| Net per $1M dollar-days | 49 | -63 | -70 | 27 |

### QQQ_1999_2015
| Metric | A | B 8% | C 10% | D 5%/5s |
|---|---:|---:|---:|---:|
| Net profit | -2,886 | -103,557 | -64,608 | -37,660 |
| Δ net vs A | +0 | -100,671 | -61,722 | -34,774 |
| Realized / unrealized | -12,257 / 9,371 | -113,547 / 9,990 | -74,598 / 9,990 | -47,650 / 9,990 |
| Margin interest | 124,858 | 124,466 | 124,466 | 123,321 |
| Closed trades (W/L) | 108 (38/70) | 130 (43/87) | 123 (44/79) | 152 (47/105) |
| Win rate | 35% | 33% | 36% | 31% |
| Avg win / avg loss | 8,971 / -5,045 | 8,319 / -5,417 | 8,422 / -5,635 | 8,314 / -4,175 |
| Largest win / loss | 57,832 / -21,715 | 52,100 / -10,216 | 57,832 / -15,217 | 57,832 / -9,788 |
| Max drawdown | 149,561 | 235,055 | 196,770 | 165,371 |
| Max DD / $100k | 150% | 235% | 197% | 165% |
| Peak → trough | 2000-03-27 → 2002-09-30 | 2000-03-27 → 2009-03-09 | 2000-03-27 → 2009-03-05 | 2000-03-27 → 2009-03-05 |
| Profit / max DD | -0.02 | -0.44 | -0.33 | -0.23 |
| Max consecutive losses | 8 | 9 | 8 | 10 |
| Lowest cumulative P&L | -102,735 | -188,229 | -149,945 | -124,190 |
| Fell below −$100k | True | True | True | True |
| Longest underwater (days) | 5757 (nr) | 5757 (nr) | 5757 (nr) | 5757 (nr) |
| Worst day | -9,288 (2001-04-20) | -10,174 (2001-04-20) | -10,174 (2001-04-20) | -9,994 (2001-04-20) |
| Avg borrowed (all sessions) | 67,620 | 67,124 | 67,289 | 66,675 |
| % sessions exposed | 68% | 67% | 67% | 67% |
| Margin dollar-days ($M·d) | 414.3 | 413.0 | 413.0 | 409.2 |
| Net per $1M dollar-days | -7 | -251 | -156 | -92 |

### VGT_2016_2026
| Metric | A | B 8% | C 10% | D 5%/5s |
|---|---:|---:|---:|---:|
| Net profit | 161,772 | 122,956 | 119,107 | 110,447 |
| Δ net vs A | +0 | -38,816 | -42,666 | -51,326 |
| Margin interest | 73,233 | 73,022 | 73,293 | 72,841 |
| Closed trades (W/L) | 45 (17/28) | 50 (19/31) | 47 (17/30) | 56 (18/38) |
| Win rate | 38% | 38% | 36% | 32% |
| Avg win / avg loss | 14,622 / -3,100 | 13,704 / -4,433 | 14,272 / -4,118 | 14,249 / -3,843 |
| Largest win / loss | 50,533 / -11,151 | 48,014 / -12,098 | 48,537 / -12,098 | 48,537 / -11,539 |
| Max drawdown | 38,323 | 64,530 | 57,257 | 47,841 |
| Peak → trough | 2021-04-15 → 2022-10-14 | 2019-07-24 → 2020-03-23 | 2019-07-24 → 2020-04-01 | 2019-07-24 → 2020-04-01 |
| Profit / max DD | 4.22 | 1.91 | 2.08 | 2.31 |
| Max consecutive losses | 4 | 5 | 4 | 6 |
| Lowest cumulative P&L | -7,070 | -26,723 | -27,835 | -24,362 |
| Longest underwater (days) | 790 | 824 | 960 | 972 |
| Worst day | -13,421 (2020-03-16) | -12,098 (2020-03-16) | -12,098 (2020-03-16) | -13,421 (2020-03-16) |
| Avg borrowed (all) | 66,640 | 66,401 | 66,561 | 66,162 |
| % sessions exposed | 67% | 66% | 67% | 66% |
| Margin dollar-days ($M·d) | 243.0 | 242.3 | 243.2 | 241.7 |
| Net per $1M dollar-days | 666 | 507 | 490 | 457 |

All four configs have realized = net and unrealized = 0 here.

### QQQ_2016_2026
| Metric | A | B 8% | C 10% | D 5%/5s |
|---|---:|---:|---:|---:|
| Net profit | 116,388 | 81,210 | 97,228 | 91,988 |
| Δ net vs A | +0 | -35,179 | -19,160 | -24,400 |
| Realized / unrealized | 103,991 / 12,398 | 68,812 / 12,398 | 84,831 / 12,398 | 79,590 / 12,398 |
| Margin interest | 62,595 | 62,504 | 62,595 | 67,507 |
| Closed trades (W/L) | 35 (15/20) | 39 (15/24) | 37 (15/22) | 43 (17/26) |
| Win rate | 43% | 38% | 41% | 40% |
| Avg win / avg loss | 12,128 / -3,896 | 12,604 / -5,010 | 11,879 / -4,243 | 10,863 / -4,042 |
| Largest win / loss | 52,700 / -10,297 | 52,700 / -11,885 | 47,901 / -11,885 | 47,353 / -11,499 |
| Max drawdown | 39,237 | 61,321 | 37,728 | 50,203 |
| Peak → trough | 2021-09-07 → 2022-12-28 | 2021-09-07 → 2022-12-28 | 2019-07-26 → 2020-03-23 | 2021-09-07 → 2022-12-28 |
| Profit / max DD | 2.97 | 1.32 | 2.58 | 1.83 |
| Max consecutive losses | 4 | 4 | 4 | 6 |
| Lowest cumulative P&L | -8,254 | -16,174 | -19,548 | -12,480 |
| Longest underwater (days) | 1395 | 1702 | 1409 | 1492 |
| Worst day | -8,732 (2020-03-12) | -9,547 (2020-03-16) | -10,090 (2020-03-16) | -8,732 (2020-03-12) |
| Avg borrowed (all) | 57,023 | 56,864 | 56,944 | 61,401 |
| % sessions exposed | 57% | 57% | 57% | 61% |
| Margin dollar-days ($M·d) | 207.7 | 207.4 | 207.7 | 224.0 |
| Net per $1M dollar-days | 560 | 392 | 468 | 411 |

**Summary of the standard metrics**
- **Net profit is lower** in all 12 cases.
- **Max drawdown is higher** in 11 of 12. The exception is C on QQQ_2016_2026 (−$1.5k).
- **Profit/DD is lower** in all 12.
- **Exposure is almost unchanged.** Dollar-days move between −1.2% and +0.1%. The exception is D on QQQ_2016_2026 (+7.8%): a displaced re-entry on 2024-08-06 was held until 2025-02-28 while the baseline was flat.
- **There are more trades:** 2–44 extra closed trades per case.
- **The largest single loss shrinks only in the 2005–2015 datasets.** In both 2016–2026 datasets, every variant's largest loss exceeds the baseline's:
  - for B and C, because of gap fills in March 2020;
  - for D, because of displaced maximum-hold trades.

## 4. Matched-exposure comparison

The control is a full baseline run at a fixed size X = $100k × variant dollar-days ÷ baseline dollar-days. Re-entry is immediate, so X ≈ $100k throughout.

| Dataset | Config | Exposure | Control size | Profit | Control profit | Δ profit | Max DD | Control DD | Δ DD | P/DD | Control P/DD | Δ P/DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 1.000 | 99,958 | -14,862 | 11,598 | -26,460 | 95,147 | 73,373 | +21,775 | -0.16 | 0.16 | -0.31 |
| VGT_2005_2015 | C | 1.000 | 100,000 | -16,667 | 11,602 | -28,269 | 94,952 | 73,404 | +21,548 | -0.18 | 0.16 | -0.33 |
| VGT_2005_2015 | D | 0.997 | 99,747 | 6,306 | 11,573 | -5,267 | 87,566 | 73,218 | +14,348 | 0.07 | 0.16 | -0.09 |
| QQQ_1999_2015 | B | 0.997 | 99,686 | -103,557 | -2,877 | -100,680 | 235,055 | 149,092 | +85,963 | -0.44 | -0.02 | -0.42 |
| QQQ_1999_2015 | C | 0.997 | 99,686 | -64,608 | -2,877 | -61,731 | 196,770 | 149,092 | +47,679 | -0.33 | -0.02 | -0.31 |
| QQQ_1999_2015 | D | 0.988 | 98,769 | -37,660 | -2,850 | -34,810 | 165,371 | 147,720 | +17,651 | -0.23 | -0.02 | -0.21 |
| VGT_2016_2026 | B | 0.997 | 99,712 | 122,956 | 161,306 | -38,350 | 64,530 | 38,213 | +26,317 | 1.91 | 4.22 | -2.32 |
| VGT_2016_2026 | C | 1.001 | 100,082 | 119,107 | 161,906 | -42,799 | 57,257 | 38,355 | +18,903 | 2.08 | 4.22 | -2.14 |
| VGT_2016_2026 | D | 0.995 | 99,465 | 110,447 | 160,907 | -50,460 | 47,841 | 38,118 | +9,723 | 2.31 | 4.22 | -1.91 |
| QQQ_2016_2026 | B | 0.999 | 99,856 | 81,210 | 116,220 | -35,011 | 61,321 | 39,180 | +22,142 | 1.32 | 2.97 | -1.64 |
| QQQ_2016_2026 | C | 1.000 | 100,000 | 97,228 | 116,388 | -19,160 | 37,728 | 39,237 | -1,509 | 2.58 | 2.97 | -0.39 |
| QQQ_2016_2026 | D | 1.078 | 107,848 | 91,988 | 125,522 | -33,534 | 50,203 | 42,316 | +7,888 | 1.83 | 2.97 | -1.13 |

- **Against its control, every variant:**
  - earns less;
  - has a larger drawdown in 11 of 12 cases;
  - has a lower profit/DD in all 12.
- **There is no risk reduction per dollar of margin.** The variants use the same margin and get strictly worse results.

## 5. Bear markets

| Dataset | Window | Config | Period P&L | Max DD in window | Interest | Closed | Losing | Largest loss | Avg loss | Sum of losses | Sum of wins | Prot. exits | Avg borrowed |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2007-09 | A | -38,496 | 73,404 | 21,879 | 23 | 16 | -20,604 | -4,622 | -73,956 | 46,512 | 0 | 66,005 |
| VGT_2005_2015 | 2007-09 | B | -60,239 | 95,147 | 21,759 | 27 | 20 | -8,392 | -4,593 | -91,854 | 42,667 | 8 | 65,476 |
| VGT_2005_2015 | 2007-09 | C | -60,044 | 94,952 | 21,789 | 26 | 19 | -11,767 | -5,231 | -99,380 | 50,388 | 7 | 65,608 |
| VGT_2005_2015 | 2007-09 | D | -42,071 | 87,566 | 21,608 | 30 | 24 | -7,087 | -3,665 | -87,962 | 56,943 | 13 | 65,079 |
| QQQ_1999_2015 | 2000-02 | A | -91,629 | 149,561 | 28,630 | 56 | 36 | -20,200 | -6,989 | -251,611 | 161,106 | 0 | 87,899 |
| QQQ_1999_2015 | 2000-02 | B | -152,094 | 203,835 | 28,178 | 73 | 49 | -10,216 | -6,846 | -335,443 | 184,472 | 35 | 85,638 |
| QQQ_1999_2015 | 2000-02 | C | -136,254 | 192,660 | 28,268 | 67 | 43 | -15,217 | -7,392 | -317,872 | 182,741 | 22 | 86,436 |
| QQQ_1999_2015 | 2000-02 | D | -108,802 | 164,988 | 27,515 | 88 | 61 | -9,484 | -5,017 | -306,031 | 198,352 | 45 | 84,043 |
| QQQ_1999_2015 | 2007-09 | A | 20,931 | 70,759 | 32,066 | 21 | 15 | -21,715 | -5,110 | -76,647 | 40,360 | 0 | 96,825 |
| QQQ_1999_2015 | 2007-09 | B | -13,150 | 101,808 | 32,066 | 25 | 19 | -9,572 | -5,414 | -102,874 | 38,605 | 10 | 96,296 |
| QQQ_1999_2015 | 2007-09 | C | 12,326 | 79,364 | 31,975 | 24 | 17 | -10,301 | -5,433 | -92,361 | 47,470 | 5 | 96,429 |
| QQQ_1999_2015 | 2007-09 | D | 14,923 | 76,767 | 31,644 | 30 | 23 | -9,788 | -4,060 | -93,381 | 51,086 | 10 | 95,635 |
| VGT_2016_2026 | 2022 | A | -23,643 | 34,856 | 9,644 | 13 | 10 | -11,151 | -3,883 | -38,829 | 16,127 | 0 | 90,438 |
| VGT_2016_2026 | 2022 | B | -29,613 | 38,359 | 9,734 | 14 | 11 | -8,332 | -4,073 | -44,799 | 16,127 | 2 | 90,040 |
| VGT_2016_2026 | 2022 | C | -30,356 | 41,569 | 9,734 | 14 | 11 | -10,392 | -3,781 | -41,594 | 12,179 | 1 | 90,040 |
| VGT_2016_2026 | 2022 | D | -32,386 | 43,697 | 9,614 | 16 | 13 | -7,208 | -3,659 | -47,572 | 16,127 | 5 | 89,243 |
| QQQ_2016_2026 | 2022 | A | -26,320 | 33,932 | 9,764 | 13 | 10 | -10,297 | -4,097 | -40,970 | 16,269 | 0 | 90,438 |
| QQQ_2016_2026 | 2022 | B | -48,405 | 50,635 | 9,764 | 15 | 12 | -10,741 | -5,164 | -61,968 | 15,182 | 3 | 89,641 |
| QQQ_2016_2026 | 2022 | C | -24,071 | 31,683 | 9,825 | 13 | 10 | -10,392 | -3,872 | -38,722 | 16,269 | 1 | 90,438 |
| QQQ_2016_2026 | 2022 | D | -37,286 | 42,334 | 9,644 | 17 | 14 | -7,098 | -3,710 | -51,937 | 16,269 | 6 | 88,845 |

Tally against A, over 5 windows per config:

| Config | Largest loss smaller | More losing trades | Larger sum of losses | Worse period P&L | Larger window DD |
|---|---:|---:|---:|---:|---:|
| B | 4 | 5 | 5 | 5 | 5 |
| C | 4 | 4 | 4 | 4 | 4 |
| D | 5 | 5 | 5 | 5 | 5 |

- **The only exception** is C on QQQ in 2022: P&L −$24.1k vs −$26.3k, and DD $31.7k vs $33.9k. This comes from one exit (2022-05-11, −$10.4k, which replaced a −$10.3k baseline loss) and a slightly better re-entry sequence (+$2.2k).
- **The worst case is QQQ 2000–2002 under B:**
  - the largest loss halved (−$10.2k vs −$20.2k);
  - but 35 stop-outs added 13 losing trades;
  - the sum of losses rose by $84k;
  - period P&L fell from −$91.6k to −$152.1k;
  - window DD rose from $149.6k to $203.8k.

## 6. Recovery participation

| Dataset | Window | Config | Period P&L | Δ vs A | P&L of trades entered (n) | Δ vs A |
|---|---|---|---:|---:|---:|---:|
| VGT_2005_2015 | 2009 | A / B / C | 15,518 | 0 | 21,725 (1) | 0 |
| VGT_2005_2015 | 2009 | D | 29,314 | +13,796 | 33,093 (1) | +11,368 |
| QQQ_1999_2015 | 2003 | all | 18,291 | 0 | 15,116 (3) | 0 |
| QQQ_1999_2015 | 2009 | A / C / D | 66,522 | 0 | 57,832 (1) | 0 |
| QQQ_1999_2015 | 2009 | B | 59,998 | -6,524 | 52,100 (1) | -5,731 |
| VGT_2016_2026 | 2020 | A | 48,081 | 0 | 59,322 (5) | 0 |
| VGT_2016_2026 | 2020 | B | 42,699 | -5,382 | 52,617 (6) | -6,705 |
| VGT_2016_2026 | 2020 | C | 38,022 | -10,059 | 47,940 (5) | -11,382 |
| VGT_2016_2026 | 2020 | D | 35,688 | -12,392 | 46,929 (6) | -12,392 |
| VGT_2016_2026 | 2023 | all | 44,468 | 0 | 42,695 (3) | 0 |
| VGT_2016_2026 | 2025 | A / B / C | 39,671 | 0 | 36,838 (3) | 0 |
| VGT_2016_2026 | 2025 | D | 34,530 | -5,142 | 28,246 (6) | -8,592 |
| QQQ_2016_2026 | 2020 | A | 63,718 | 0 | 61,124 (5) | 0 |
| QQQ_2016_2026 | 2020 | B | 46,006 | -17,711 | 52,960 (5) | -8,164 |
| QQQ_2016_2026 | 2020 | C | 48,139 | -15,579 | 55,636 (5) | -5,488 |
| QQQ_2016_2026 | 2020 | D | 53,250 | -10,468 | 50,656 (6) | -10,468 |
| QQQ_2016_2026 | 2023 | all | 25,111 | 0 | 22,266 (2) | 0 |
| QQQ_2016_2026 | 2025 | A | 19,964 | 0 | 19,964 (2) | 0 |
| QQQ_2016_2026 | 2025 | B / C / D | 18,534 / 16,534 / 19,223 | -1,430 / -3,430 / -742 | 18,534 / 16,534 / 19,223 (3) | same |

- **2003 and 2023 are unaffected:** no stop-outs fell in those windows.
- **2020 is worse for every variant** (−$5.4k to −$17.7k), for two reasons:
  - the tail of the March 2020 stop-out chains falls inside the window, which starts on 2020-03-16;
  - the 2020 winner was smaller: VGT $48.0k–$48.5k vs $50.5k, and QQQ C $47.9k and D $47.4k vs $52.7k. B kept QQQ's winner identical, so its −$17.7k is entirely the chain tail.
- **2025 is slightly worse or unchanged.**
- **2009, B on QQQ (−$6.5k):** a stop-out on 2009-03-02 moved the winner's entry to 2009-03-03 at a higher price, so it made $52.1k instead of $57.8k.
- **2009, D on VGT (+$13.8k):** a displaced entry on 2009-03-09, the low, earned $33.1k instead of $21.7k. This is path luck.

## 7. Experiment-specific questions

### Q1. Protective-stop exits: total, average loss and largest loss

| Config | Dataset | Exits | Gap / intraday | Total P&L | Avg | Largest loss | Avg exit vs entry | Avg sessions held | Coincident |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B | VGT_2005_2015 | 9 | 0 / 9 | -73,477 | -8,164 | -8,392 | -8% | 3.67 | 1 |
| B | QQQ_1999_2015 | 46 | 6 / 40 | -383,841 | -8,344 | -10,216 | -8% | 4.72 | 0 |
| B | VGT_2016_2026 | 9 | 5 / 4 | -84,544 | -9,394 | -12,098 | -9% | 3.67 | 0 |
| B | QQQ_2016_2026 | 8 | 3 / 5 | -73,198 | -9,150 | -11,885 | -9% | 5.12 | 0 |
| C | VGT_2005_2015 | 8 | 1 / 7 | -83,003 | -10,375 | -11,767 | -10% | 4.75 | 1 |
| C | QQQ_1999_2015 | 28 | 2 / 26 | -286,367 | -10,227 | -10,485 | -10% | 4.89 | 1 |
| C | VGT_2016_2026 | 5 | 3 / 2 | -56,422 | -11,284 | -12,098 | -11% | 5.00 | 0 |
| C | QQQ_2016_2026 | 4 | 1 / 3 | -42,458 | -10,614 | -11,885 | -10% | 5.75 | 0 |
| D | VGT_2005_2015 | 14 | 2 / 12 | -73,696 | -5,264 | -7,087 | -5% | 1.86 | 0 |
| D | QQQ_1999_2015 | 58 | 11 / 47 | -312,672 | -5,391 | -8,588 | -5% | 2.43 | 0 |
| D | VGT_2016_2026 | 16 | 6 / 10 | -97,395 | -6,087 | -9,693 | -6% | 2.75 | 0 |
| D | QQQ_2016_2026 | 10 | 4 / 6 | -55,083 | -5,508 | -7,402 | -5% | 2.80 | 0 |

- **Counts:** 72 exits for B, 45 for C and 98 for D. Gap fills at the open account for 14, 7 and 23 of them.
- **All protective exits lost money,** which is guaranteed by construction.
- **Average losses** are about the nominal level plus interest: 8–9%, 10–11% and 5–6%. Gaps add to this, mostly in 2016–2026 (Feb–Mar 2020).
- **Coincident cases, excluded from the counts:**
  - VGT B and C on 2010-05-06: the trailing stop filled first;
  - QQQ C on 2001-09-17: the maximum-hold exit and the protective gap fired at the same open.

**What the baseline was holding when each stop fired:**

| Config | Dataset | Prot. exits | Baseline flat | Baseline trade later won | of which ≥ $10k | Baseline trade later lost |
|---|---|---:|---:|---:|---:|---:|
| B | VGT05 / QQQ99 / VGT16 / QQQ16 | 9 / 46 / 9 / 8 | 0 / 3 / 1 / 1 | 2 / 4 / 0 / 1 | 0 / 1 / 0 / 0 | 7 / 39 / 8 / 6 |
| C | same order | 8 / 28 / 5 / 4 | 0 / 2 / 1 / 1 | 3 / 3 / 0 / 0 | 0 / 2 / 0 / 0 | 5 / 23 / 4 / 3 |
| D | same order | 14 / 58 / 16 / 10 | 0 / 7 / 0 / 0 | 3 / 5 / 2 / 1 | 0 / 2 / 1 / 1 | 11 / 46 / 14 / 9 |

175 of the 215 exits (81%) cut a baseline trade that went on to lose. The stops were usually "right", and the results were still worse.

### Q2. Re-entries within 5 sessions

| Config | Dataset | Exits | Re-entered ≤ 5 sessions | Next session | Re-entry < exit price | Avg / median re-entry vs exit | P&L of re-entry trades | W / L | Re-entry stopped out again |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B | VGT_2005_2015 | 9 | 9 | 9 | 4 | +2.1% / +0.9% | -26,507 | 4 / 5 | 5 |
| B | QQQ_1999_2015 | 46 | 46 | 46 | 19 | +1.7% / +0.9% | -103,520 | 13 / 33 | 28 |
| B | VGT_2016_2026 | 9 | 9 | 8 | 2 | +4.0% / +5.1% | -17,022 | 3 / 6 | 4 |
| B | QQQ_2016_2026 | 8 | 8 | 8 | 3 | +2.6% / +3.5% | 41,735 | 3 / 5 | 2 |
| C | VGT_2005_2015 | 8 | 8 | 8 | 2 | +2.9% / +2.6% | -18,756 | 4 / 4 | 4 |
| C | QQQ_1999_2015 | 28 | 28 | 28 | 9 | +1.6% / +1.9% | -40,286 | 13 / 15 | 13 |
| C | VGT_2016_2026 | 5 | 5 | 5 | 1 | +5.9% / +6.4% | 10,184 | 1 / 4 | 3 |
| C | QQQ_2016_2026 | 4 | 4 | 4 | 2 | +2.3% / +2.4% | -9,497 | 1 / 3 | 1 |
| D | VGT_2005_2015 | 14 | 14 | 14 | 6 | +1.7% / +0.7% | -24,177 | 4 / 10 | 8 |
| D | QQQ_1999_2015 | 58 | 58 | 56 | 26 | +0.4% / +0.5% | -86,470 | 17 / 41 | 31 |
| D | VGT_2016_2026 | 16 | 16 | 15 | 4 | +2.0% / +2.8% | 49,064 | 4 / 12 | 7 |
| D | QQQ_2016_2026 | 10 | 10 | 10 | 4 | +1.7% / +1.8% | 39,570 | 3 / 7 | 3 |

- **All 215 exits were followed by a re-entry within 5 sessions,** and 211 re-entered the next session. The 10% entry signal is still on after a further 5–10% fall.
- **Only 82 of the 215 re-entries (38%) were cheaper than the sale.** This is a whipsaw cost.
  - Example: VGT gap-filled at 26.7885 on 2020-02-28, closed that day at 28.1354, and re-entered on 03-03 at 28.5311.

### Q3. Repeated stop-outs

| Config | Dataset | Consecutive pairs | Chains ≥ 2 | Longest | Longest chain (P&L) |
|---|---|---:|---:|---:|---|
| B | VGT_2005_2015 | 5 | 2 | 5 | 2008-09-23→10-22 (−40,693) |
| B | QQQ_1999_2015 | 28 | 7 | 9 | 2001-01-29→04-03 (−75,358) |
| B | VGT_2016_2026 | 4 | 1 | 5 | 2020-02-25→03-18 (−49,947) |
| B | QQQ_2016_2026 | 2 | 1 | 3 | 2020-02-27→03-18 (−29,462) |
| C | VGT_2005_2015 | 4 | 2 | 4 | 2008-09-23→10-23 (−42,129) |
| C | QQQ_1999_2015 | 13 | 5 | 8 | 2001-01-29→04-03 (−81,932) |
| C | VGT_2016_2026 | 3 | 1 | 4 | 2020-02-25→03-23 (−46,031) |
| C | QQQ_2016_2026 | 1 | 1 | 2 | 2020-02-27→03-16 (−21,975) |
| D | VGT_2005_2015 | 8 | 3 | 5 | 2008-09-23→10-14 (−27,448) |
| D | QQQ_1999_2015 | 31 | 7 | 8 | 2000-03-30→05-09 (−46,696); 2001-01-29→03-09 (−41,111); 2002-05-23→07-01 (−42,152) |
| D | VGT_2016_2026 | 7 | 4 | 4 | 2022-04-28→05-20 (−20,573) |
| D | QQQ_2016_2026 | 3 | 1 | 4 | 2022-04-28→05-20 (−20,573) |

- **Totals:** 39 pairs for B, 21 for C and 49 for D (109 in all). The longest chains are 9, 8 and 8 trades. The full chain lists are in `extra.repeated_stopouts`.
- **The per-trade loss cap becomes a per-leg loss with no limit on the number of legs.**

### Q4. Cumulative bear losses. Does reducing individual losses reduce cumulative drawdown?

**No.** Across the 15 window × config cases:
- the largest loss is smaller in 13;
- there are more losing trades in 14;
- the sum of losses is larger in 14;
- period P&L is worse in 14;
- window DD is larger in 14 (§5).

The average loss barely moves, while the count of losses rises.

Specific effects:
- QQQ_1999_2015 lowest cumulative P&L: −$102.7k becomes −$188.2k (B), −$149.9k (C) and −$124.2k (D).
- Window DD:
  - VGT 2007–09: $73.4k becomes $95.1k / $95.0k / $87.6k;
  - QQQ 2000–02: $149.6k becomes $203.8k / $192.7k / $165.0k;
  - VGT 2022: $34.9k becomes $38.4k / $41.6k / $43.7k;
  - QQQ 2022: $33.9k becomes $50.6k / $31.7k / $42.3k.

### Q5. Major baseline winners (≥ $10k) interrupted

| Config | Dataset | Baseline winner (P&L) | Protective exit | Overlapping variant trades | Variant P&L | Δ |
|---|---|---|---|---|---:|---:|
| B | QQQ99 | 2000-05-22→06-23 (11,446) | 2000-05-22 (missed entry) | 05-11→05-22 prot −8,332; 05-23→06-23 trailing +21,697 | 13,365 | +1,919 |
| B | QQQ99 | 2001-01-02→01-05 (12,260) | 2001-01-05 | 2000-12-20→01-02 trailing +2,747; 01-03→01-05 prot −8,060 | -5,313 | -17,573 |
| C | QQQ99 | 2000-05-22→06-23 (11,446) | 2000-05-24 | prot −10,060; 05-25→06-23 +17,122 | 7,062 | -4,384 |
| C | QQQ99 | 2001-01-02→01-05 (12,260) | 2001-01-05 | +2,747; prot −10,060 | -7,313 | -19,573 |
| D | QQQ99 | 2000-05-22→06-23 (11,446) | 2000-05-23 | prot −5,030; 05-24→06-23 +14,499 | 9,469 | -1,977 |
| D | QQQ99 | 2001-01-02→01-05 (12,260) | 2001-01-05 | +2,747; prot −5,060 | -2,313 | -14,573 |
| D | VGT16 | 2025-04-11→11-14 (35,713) | 2025-04-21 | prot −5,301; 04-22→11-14 +40,644 | 35,342 | -371 |
| D | QQQ16 | 2020-03-19→09-04 (52,700) | 2020-03-23 | prot −5,121; 03-24→09-04 +47,353 | 42,232 | -10,468 |

"Missed entry" means the stop-out happened on the baseline's entry session, so the variant could not enter that day.

Of the 31 baseline winners ≥ $10k:

| Config | Identical | Interrupted | Displaced by an earlier stop-out |
|---|---:|---:|---:|
| B | 22 | 2 | 7 |
| C | 24 | 2 | 5 |
| D | 20 | 4 | 7 |

- **Displacements range from −$12.5k to +$11.5k per winner.** The details are in `extra.all_major_baseline_winners`.
- **The variant usually re-entered the next day and caught most of the move.**
- **The costly case is Jan 2001 on QQQ.** An earlier stop-out had shifted the sequence, so the variant entered on 01-03, after the +16.9% rate-cut rally, and was then stopped out.
- **Damage to the big winners is a minor part of the deterioration.** Most of it comes from the stop-out chains.

### Q6. Profitability and drawdown after financing

| Dataset | Config | Gross (before interest) | Interest (Δ) | Net (Δ) | Max DD (Δ) | P/DD |
|---|---|---:|---:|---:|---:|---:|
| VGT_2005_2015 | A | 83,178 | 71,575 | 11,602 | 73,404 | 0.16 |
| VGT_2005_2015 | B / C / D | 56,683 / 54,909 / 77,701 | −30 / 0 / −181 | −26,465 / −28,269 / −5,296 | +21,744 / +21,548 / +14,162 | −0.16 / −0.18 / 0.07 |
| QQQ_1999_2015 | A | 121,972 | 124,858 | −2,886 | 149,561 | −0.02 |
| QQQ_1999_2015 | B / C / D | 20,909 / 59,858 / 85,660 | −392 / −392 / −1,537 | −100,671 / −61,722 / −34,774 | +85,494 / +47,209 / +15,810 | −0.44 / −0.33 / −0.23 |
| VGT_2016_2026 | A | 235,005 | 73,233 | 161,772 | 38,323 | 4.22 |
| VGT_2016_2026 | B / C / D | 195,978 / 192,400 / 183,288 | −211 / +60 / −392 | −38,816 / −42,666 / −51,326 | +26,207 / +18,934 / +9,518 | 1.91 / 2.08 / 2.31 |
| QQQ_2016_2026 | A | 178,983 | 62,595 | 116,388 | 39,237 | 2.97 |
| QQQ_2016_2026 | B / C / D | 143,714 / 159,823 / 159,495 | −90 / 0 / +4,912 | −35,179 / −19,160 / −24,400 | +22,085 / −1,509 / +10,967 | 1.32 / 2.58 / 1.83 |

- **There is no financing saving,** because capital is redeployed the next day.
- **The entire trading shortfall reaches net profit.**

## 8. Dependence on a few trades or one event

**Method.** Trades identical in both runs (same entry session, exit session and exit price) cancel out. The rest are grouped into episodes: connected components of overlapping [entry, exit] spans across both runs.
- Episode deltas sum exactly to the net difference.
- Each episode begins with both runs entering on the same session. The first-trade effect compares the stop-out with the baseline's outcome of that same entry; the sequence effect is everything after it.

| Config | Dataset | Net Δ | Episodes (worse / better) | Worst episode | Best episode | Net Δ excl. worst | Net Δ excl. worst 3 | Σ first-trade / Σ sequence |
|---|---|---:|---|---|---|---:|---:|---|
| B | VGT05 | −26,465 | 4 (3/1) | 2008-09-23→10-15 −15,774 | +52 | −10,690 | +52 | +309 / −26,773 |
| B | QQQ99 | −100,671 | 15 (12/3) | 2008-09-05→10-15 −23,966 | 2000-09-27→12-07 +15,202 | −76,705 | −33,480 | −21,978 / −78,694 |
| B | VGT16 | −38,816 | 6 (5/1) | 2020-02-25→03-16 −30,638 | 2018-12 +8,385 | −8,178 | +2,416 | −17,796 / −21,020 |
| B | QQQ16 | −35,179 | 5 (4/1) | 2020-02-27→03-18 −20,111 | 2018-12 +8,447 | −15,068 | +7,017 | −7,316 / −27,863 |
| C | VGT05 | −28,269 | 4 (3/1) | 2008-09-23→10-15 −15,180 | +2,944 | −13,090 | +2,944 | −9,247 / −19,022 |
| C | QQQ99 | −61,722 | 13 (10/3) | 2000-12-14→2001-01-05 −23,429 | 2000-09-27→12-07 +20,363 | −38,293 | −8,715 | −19,381 / −42,341 |
| C | VGT16 | −42,666 | 3 (3/0) | 2020-02-25→03-16 −24,571 | – | −18,095 | 0 | −11,674 / −30,992 |
| C | QQQ16 | −19,160 | 3 (2/1) | 2020-02-27→09-04 −17,978 | 2022-04-28→06-10 +2,248 | −1,182 | 0 | −7,125 / −12,035 |
| D | VGT05 | −5,296 | 5 (4/1) | 2008-09-23→11-18 −6,288 | 2009-01-13→07-08 +5,098 | +992 | +4,047 | +4,843 / −10,139 |
| D | QQQ99 | −34,774 | 20 (15/5) | 2001-09-05→10-05 −14,408 | 2001-01-29→04-20 +20,536 | −20,367 | +5,652 | +18,272 / −53,047 |
| D | VGT16 | −51,326 | 9 (8/1) | 2020-02-25→03-11 −14,144 | +98 | −37,182 | −15,949 | −64,770 / +13,444 |
| D | QQQ16 | −24,400 | 6 (5/1) | 2020-03-19→09-04 −10,468 | 2024-08→2025-02 +2,070 | −13,932 | −1,236 | −64,952 / +40,551 |

**Trades responsible**
- **VGT_2016_2026, B:** four consecutive gap-fill stop-outs from 2020-02-25 to 03-16 (−8.8k, −9.2k, −11.9k, −12.1k), against the baseline's −8.8k and −2.4k.
- **QQQ_2016_2026, B:** 2020-02-27 to 03-18 (gaps of −11.9k and −9.5k, then −8.0k) and 2022-01-19 to 04-11 (−18.6k).
- **VGT_2005_2015, B:** four stop-outs from 2008-09-23 to 10-15 (−32.5k), against the baseline's −20.6k followed by +3.9k.
- **QQQ_1999_2015, B:**
  - Sep–Oct 2008, 5 stop-outs, −24.0k;
  - Apr 2000, 3 stop-outs totalling −24.4k, where the baseline lost only −0.6k;
  - Jan 2001 (Q5), −19.4k.
- **2015-08-24 ETF flash crash:** VGT's low was 8.65 against a close of 10.86. Every config sold and re-entered higher, costing $4.7k (B, VGT) to $8.5k (C, QQQ).
- **Episodes where variants did better:**
  - Dec 2018 under B, +8.4k on each 2016–2026 dataset: the re-entry on 12-24 hit the low;
  - QQQ Sep–Dec 2000 under B and C: +15.2k and +20.4k;
  - D on QQQ in Q1 2001: +20.5k.

  These come from the same mechanism, re-entry timing luck.

**How concentrated the damage is**
- **Removing the worst episode** leaves 11 of 12 cases worse. Only D on VGT05 turns positive, at +$1k.
- **Removing the worst three** brings several cases to about zero, while B on QQQ99 (−33.5k) and D on VGT16 (−15.9k) stay clearly negative.
- **The damage sits in fast-decline episodes:** Sep–Nov 2008, Feb–Mar 2020, Apr 2000 / Q1 2001 and 2022.
  - These episodes occur in every dataset, and they are exactly where a protective stop is supposed to help.
  - Elsewhere the effect is roughly neutral.
- **For B and C, the sequence effect (re-entries) dominates.**
- **For D in 2016–2026, the first-trade effect is dominated by cutting the 2020 winner**, and the next-day re-entry largely recaptures it.

## 9. Preliminary classification: Unpromising

**Historical observations (market data)**
- Stop-outs cluster in fast declines: 2000–02, Sep–Nov 2008, Feb–Mar 2020, 2022, Aug 2024 and Apr 2025.
- Large opening gaps:
  - VGT opened at 23.16 on 2020-03-16, after a 26.33 close;
  - QQQ opened at 176.13 on 2020-03-12, below the previous day's low;
  - QQQ opened at 87.38 on 2015-08-24, after a 94.96 close.
- On 2015-08-24, VGT fell about 20% intraday.
- After a 5–10% fall from an entry that was already ≥ 10% below the 90-session high, the entry signal is necessarily still on.

**Backtest calculations**
- Net profit vs baseline (VGT05 / QQQ99 / VGT16 / QQQ16):
  - B: −26.5k / −100.7k / −38.8k / −35.2k;
  - C: −28.3k / −61.7k / −42.7k / −19.2k;
  - D: −5.3k / −34.8k / −51.3k / −24.4k.
- Max DD is higher in 11 of 12 cases. Profit/DD is lower in all 12. The controls dominate.
- All 215 stop-outs were followed by a re-entry within 5 sessions.
- There are 109 back-to-back stop-outs.
- In bear windows, total losses and DD are worse in 14 of 15 cases.

**Inferences (not separately tested)**
- **With unchanged immediate re-entry, a stop converts one open loss into a realised loss plus a new full-size position.** Exposure is unchanged, and losses are counted per leg instead of per decline.
- **The 15-day exit already caps time in a loser.** The price stop fires mostly in the most volatile sessions, where gaps (fills below the level) and reversals (re-entries above the sale) are largest.
- **Tighter stops (D) fire more often.** Their early protection is given back through re-entries.
- **No dataset shows a robust benefit.**

**Hypotheses (outside scope, untested)**
- A stop paired with a re-entry delay or confirmation might behave differently. That would be a combination with experiment 4, which the spec forbids here.
- A volatility-scaled level might avoid the 2020 gap clusters.

**Limitations**
- Intraday fills are assumed at the exact level, with no slippage, commissions or spreads. On 2015-08-24 real stop orders filled far lower. The variants make 2–44 extra trades, so realistic costs would make them look worse still.
- Daily bars on adjusted prices hide the intraday path.
- The four datasets are two correlated ETFs that share the same crashes.
- Only one threshold was tested per config.
- Results are path-dependent: the episode decomposition is exact in total, but it does not give a per-trade counterfactual.

**Classification: Unpromising.**
- The idea fails its purpose: bear-window cumulative losses and drawdowns get worse.
- It costs profit on every dataset, with no financing offset.
- A control at the same exposure dominates it.
- The cause is mechanistic and appears on every dataset.

## 10. Parameters for a later, separately authorised robustness study (not run)

- **Stop distance and reference price:** 8%, 10% and 5%, measured from the entry close or from the average cost.
- **D's window length,** in sessions or in calendar days.
- **The fill model:** slippage below the level, plus per-trade costs.
- **A cooldown after a protective exit.** This interacts with the re-entry rule, so it is a combination that needs authorisation.
- **The interaction with the 15-day maximum hold.**
- **Out-of-sample testing** on non-technology ETFs or other periods.
