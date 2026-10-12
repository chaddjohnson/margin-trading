# Staged entries (experiment 5, `staged_entries`)

Research agent 5 of 5. Frozen engine and metrics used unmodified; every number below is produced by `run.py`
(results/summary.json, trades/, daily/, positions/), `verify.py` (results/verification.txt) and `report_tables.py`
(tables). Reproduce from this directory with
`PYTHONDONTWRITEBYTECODE=1 $PY run.py && $PY verify.py && $PY report_tables.py`.

**Bottom line.** Neither staged-entry rule improves on simply running the baseline at a smaller fixed size.
- **B (second tranche after two positive closes)** adds in 82–95% of positions, usually within 2–5 sessions and
  slightly above the initial price. It is worse than its matched control on every dataset, for profit (−$5.6k to
  −$57.2k), max drawdown (+$5.2k to +$42.9k) and profit/DD.
- **C (second tranche after a close 3% above entry)** halves every losing position that never bounces 3%. It pays
  for that with a higher cost basis on every winner, and with earlier loss exits once a position has been added
  to. It trails its control on 3 of 4 datasets; its one gain (QQQ 2016–2026, +$5.0k) comes from a single
  March-2020 episode, and its max drawdown is never below the control's.
- **Preliminary classification:** B **Unpromising**, C **Unpromising** (details in §9).

---

## 1. Configuration and exact implementation

| Config | Initial tranche (signal close) | Second tranche ($50,000, at a close) | Max borrowed |
|---|---|---|---|
| `A_baseline` | $100,000 | none | $100,000 |
| `B_staged_two_positive_closes` | $50,000 | first session j with j−1 > entry, close_j > close_{j−1} **and** close_{j−1} > close_{j−2} | $100,000 |
| `C_staged_3pct_recovery` | $50,000 | first session j > entry with close_j ≥ 1.03 × initial entry close | $100,000 |

**Implementation** (`strategies.py`):
- Only two hooks are used. `entry_size` returns the $50,000 initial tranche. `add_on` returns $50,000 once the rule
  is met, and 0 otherwise.
- "At most one add" is enforced by `len(e.pos.lots) == 1`. The classes are therefore stateless, and `run.py`
  asserts that two runs of the same configuration are identical.
- The entry signal, exits, interest and the stop are entirely the frozen engine's.

**Chronological order inside session i for a position opened before i** (engine order, unchanged):
1. **Before the open.** The stop level L is fixed from information through session i−1: 0.92 × max(entry close,
   highs of sessions entry+1 … i−1), never lowered. The stop is *active* only if selling the **aggregate** position
   at L would be profitable after the **per-lot** interest accrued through session i's date.
2. **At the open.**
   - Loss exit: if at least 15 calendar days have passed since the **initial** entry and selling the aggregate
     position at the open loses money, everything is sold at the open.
   - Otherwise, an active stop that the open gaps through fills at the open.
3. **Intraday.** An active stop fills at L once the low reaches it. Every exit sells **both lots together** at one
   price; there are no partial exits.
4. **At the close, only if the position did not exit in session i.** The add rule is evaluated using closes
   through i (no look-ahead). If it holds, $50,000 is bought at close_i as lot 2. Lot 2 accrues interest from that
   date (none on the purchase day) and cannot cause an exit in session i.
5. **After the close.**
   - The post-entry high is updated with high_i, and L = max(L, 0.92 × high).
   - **The add never resets or lowers L, and never restarts the 15-day clock.**
6. **Mark-to-market.** Realized P&L, plus the open position at the close, minus accrued per-lot interest.

**Entry session.** When flat, and not on a session in which a position exited, the 10% dip signal buys $50,000 at
that close. No add is possible on the entry session, because the engine calls `add_on` only for a position that
existed before the session. B's earliest add is therefore entry+2; C's is entry+1.

**Assumptions and interpretations** (fixed before any variant was run):
- **"Positive return" is strict.**
  - An unchanged close does not count for B. Unchanged closes occurred on 11, 24, 2 and 0 sessions inside B
    positions (VGT 05–15, QQQ 99–15, VGT 16–26, QQQ 16–26).
  - Session entry+1's return is measured against the entry close.
- **C's threshold is the initial entry close**, not the average cost. There were no near-ties: no close inside a C
  position was within 1e-7 of 1.03×.
- **The add is unconditional on the position's P&L or stop state.**
- **Reporting thresholds** (not strategy parameters):
  - major winner = baseline closed trade with net profit ≥ $10,000, the same threshold as experiment 3;
  - major loser = baseline closed trade with net profit ≤ −$5,000.
- **Matching variant to baseline trades.**
  - A variant position is matched to the baseline trade with the **same entry session**.
  - When the sequences diverge, the baseline trade is compared with all **overlapping** variant positions.
  - For attribution (§8), trades are grouped into **episodes**: connected components of overlapping holding
    intervals across both sequences.
    - Each episode's control P&L = exposure ratio × baseline P&L. This is exact, because the control is the baseline
      run at a fixed smaller size, with identical trades and P&L linear in size.
    - The episode sums reproduce the summary's control differences exactly (§8).

## 2. Verification (results/verification.txt — OVERALL: PASS)

1. **A_baseline reproduces the frozen baseline exactly** on all four datasets.
   - The `metrics` and `matched_control` dicts are identical to baseline/results/summary.json.
   - The trades and daily CSVs are byte-identical.
   - baseline/ checksums were re-verified after the runs: all OK.
2. **An independent replica**, written from SPEC.md in plain Python against the raw CSV files with no engine code,
   reproduces **every trade of all three configs on all four datasets**: entry, add session, exit session, reason,
   fill price, and net P&L to 1e-6. Mismatches: 0.
3. **Lot P&L reconciliation.** For every position, Σ per-lot P&L equals the aggregate trade P&L (max error 3e-11).
   The sum of all lot P&L equals net profit for every config and dataset.
4. **No-add positions.** Every position without an add whose exit matches the baseline's earns exactly half the
   baseline P&L (max deviation 0.0), confirming that size alone never changes a no-add trade.
5. **Hand-checked traces.** 17 positions were traced (all PASS), covering:
   - the largest winner with an add;
   - an add below the initial price;
   - a loss exit caused by the add;
   - a stop blocked by the add;
   - an open position at the end;
   - a position with no add.

   Four worked examples:

| Case | Lots (date @ price × $) | Avg cost | Exit session: stop L, activation, fill | Per-lot P&L (interest) | Sum = engine |
|---|---|---|---|---|---|
| VGT 16–26 B, entry 2020-04-03 (late add +11%) | 2020-04-03 @24.2742 × 50k (2,059.80 sh); add 2020-04-09 @26.9545 × 50k (1,854.98 sh) after closes 26.1398 < 26.8896 < 26.9545 | 25.5442 (+5.23%) | 2020-09-04: L = 0.92 × 40.9427 (high 2020-09-02) = 37.667284; breakeven 26.71 → active; low 36.0259 ≤ L → **fill 37.667284** | lot 1 +25,266.53 (154 d, 2,320.55); lot 2 +17,641.84 (148 d, 2,230.14) | +42,908.37 ✓ (baseline +50,533.06) |
| VGT 16–26 B, entry 2022-09-15 (add below initial) | 40.8981 × 50k; add 2022-09-28 @39.2892 (0.961×) | 40.0775 (−2.01%) | 2022-09-30: L = 0.92 × 41.4762 = 38.158104 (**not reset by the add**); inactive (aggregate breakeven 40.18); day 15, aggregate P&L at open −5,102.80 → **loss exit at open 38.1351** | lot 1 −3,603.93 (15 d, 226.03); lot 2 −1,498.86 (2 d, 30.14) | −5,102.80 ✓ (baseline −7,207.87) |
| QQQ 16–26 C, entry 2020-09-24 (stop blocked by add) | 258.134 × 50k; add 2020-09-28 @269.634 ≥ 1.03 × 258.134 = 265.878 | 263.7587 (+2.18%) | 2020-10-29: L = 0.92 × 289.33 = 266.1836; aggregate breakeven 266.38 → **inactive** (P&L at L −75.16; lot 1 alone would be active); open 265.575 → aggregate loss → **loss exit at open** | lot 1 +913.91 (35 d, 527.40); lot 2 −1,219.81 (31 d, 467.12) | −305.90 ✓ |
| QQQ 16–26 C, entry 2020-03-16 (decisive episode) | 163.79 × 50k; add 2020-03-17 @176.182 (1.076×) | 169.7602 (+3.65%) | On 2020-03-18, L = 0.92 × 178.379 = 164.10868. Baseline breakeven 163.89 → active, low 161.359 → baseline sold at 164.10868 (+134). Variant breakeven 169.84 → **inactive, held**. Exit 2020-09-04 at L = 0.92 × 294.782 = 271.19944 | lot 1 +30,196.99 (172 d, 2,591.78); lot 2 +24,388.99 (171 d, 2,576.71) | +54,585.98 ✓ |

## 3. Standard metrics (sections A–C)

### VGT_2005_2015
| Metric | A baseline | B two positive closes | C 3% recovery |
|---|---:|---:|---:|
| Net profit | 11,602 | -13,233 | -4,060 |
| Realized / unrealized | 5,872 / 5,731 | -18,166 / 4,933 | -8,233 / 4,172 |
| Margin interest | 71,575 | 59,762 | 59,747 |
| Closed trades (W/L) | 47 (13/34) | 48 (11/37) | 50 (7/43) |
| Win rate | 28% | 23% | 14% |
| Avg win / avg loss | 7,751 / -2,791 | 6,600 / -2,453 | 11,033 / -1,988 |
| Largest win / loss | 21,725 / -20,604 | 25,683 / -21,420 | 27,416 / -15,977 |
| Max drawdown | 73,404 | 66,512 | 65,743 |
| Peak → trough | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-03-09 |
| Profit / max DD | 0.16 | -0.20 | -0.06 |
| Max consecutive losses | 6 | 6 | 11 |
| Lowest cumulative P&L | -49,713 | -41,294 | -43,098 |
| Longest underwater (days) | 3002 (not recovered) | 3002 (not recovered) | 3002 (not recovered) |
| Worst day | -8,276 (2008-09-29) | -8,190 (2008-09-29) | -7,833 (2008-12-01) |
| Avg borrowed, all sessions | 61,340 | 51,254 | 51,123 |
| Avg borrowed, while invested | 100,000 | 91,728 | 88,701 |
| % sessions exposed | 61% | 56% | 58% |
| Margin dollar-days ($M·d) | 237.5 | 198.3 | 198.2 |
| Net profit per $1M dollar-days | 49 | -67 | -20 |

### QQQ_1999_2015
| Metric | A baseline | B two positive closes | C 3% recovery |
|---|---:|---:|---:|
| Net profit | -2,886 | -59,470 | -16,509 |
| Realized / unrealized | -12,257 / 9,371 | -67,656 / 8,187 | -23,774 / 7,264 |
| Margin interest | 124,858 | 98,141 | 100,040 |
| Closed trades (W/L) | 108 (38/70) | 114 (29/85) | 115 (29/86) |
| Win rate | 35% | 25% | 25% |
| Avg win / avg loss | 8,971 / -5,045 | 7,836 / -3,470 | 8,573 / -3,167 |
| Largest win / loss | 57,832 / -21,715 | 51,788 / -22,567 | 52,948 / -16,864 |
| Max drawdown | 149,561 | 160,423 | 121,738 |
| Peak → trough | 2000-03-27 → 2002-09-30 | 2000-03-27 → 2009-03-05 | 2000-03-27 → 2009-03-05 |
| Profit / max DD | -0.02 | -0.37 | -0.14 |
| Max consecutive losses | 8 | 13 | 14 |
| Lowest cumulative P&L | -102,735 | -119,461 | -76,582 |
| Longest underwater (days) | 5757 (not recovered) | 5757 (not recovered) | 5757 (not recovered) |
| Worst day | -9,288 (2001-04-20) | -9,350 (2001-04-20) | -8,997 (2001-04-20) |
| Avg borrowed, all sessions | 67,620 | 53,285 | 54,195 |
| Avg borrowed, while invested | 100,000 | 88,830 | 85,912 |
| % sessions exposed | 68% | 60% | 63% |
| Margin dollar-days ($M·d) | 414.3 | 325.6 | 331.9 |
| Net profit per $1M dollar-days | -7 | -183 | -50 |

### VGT_2016_2026
| Metric | A baseline | B two positive closes | C 3% recovery |
|---|---:|---:|---:|
| Net profit | 161,772 | 129,096 | 125,983 |
| Realized / unrealized | 161,772 / 0 | 129,096 / 0 | 125,983 / 0 |
| Margin interest | 73,233 | 62,700 | 60,666 |
| Closed trades (W/L) | 45 (17/28) | 47 (16/31) | 47 (14/33) |
| Win rate | 38% | 34% | 30% |
| Avg win / avg loss | 14,622 / -3,100 | 13,327 / -2,714 | 14,318 / -2,257 |
| Largest win / loss | 50,533 / -11,151 | 42,908 / -10,089 | 43,229 / -6,854 |
| Max drawdown | 38,323 | 47,114 | 40,445 |
| Peak → trough | 2021-04-15 → 2022-10-14 | 2021-02-12 → 2022-10-14 | 2021-02-12 → 2022-10-14 |
| Profit / max DD | 4.22 | 2.74 | 3.11 |
| Max consecutive losses | 4 | 5 | 5 |
| Lowest cumulative P&L | -7,070 | -14,856 | -12,576 |
| Longest underwater (days) | 790 | 1036 | 1034 |
| Worst day | -13,421 (2020-03-16) | -9,440 (2020-09-03) | -14,321 (2020-03-16) |
| Avg borrowed, all sessions | 66,640 | 57,146 | 55,076 |
| Avg borrowed, while invested | 100,000 | 94,317 | 90,602 |
| % sessions exposed | 67% | 61% | 61% |
| Margin dollar-days ($M·d) | 243.0 | 208.1 | 201.3 |
| Net profit per $1M dollar-days | 666 | 621 | 626 |

### QQQ_2016_2026
| Metric | A baseline | B two positive closes | C 3% recovery |
|---|---:|---:|---:|
| Net profit | 116,388 | 83,414 | 100,500 |
| Realized / unrealized | 103,991 / 12,398 | 73,171 / 10,243 | 89,915 / 10,585 |
| Margin interest | 62,595 | 47,888 | 51,353 |
| Closed trades (W/L) | 35 (15/20) | 36 (13/23) | 37 (13/24) |
| Win rate | 43% | 36% | 35% |
| Avg win / avg loss | 12,128 / -3,896 | 11,301 / -3,206 | 11,078 / -2,254 |
| Largest win / loss | 52,700 / -10,297 | 50,026 / -11,687 | 54,586 / -11,687 |
| Max drawdown | 39,237 | 44,545 | 32,461 |
| Peak → trough | 2021-09-07 → 2022-12-28 | 2021-02-12 → 2022-10-14 | 2021-02-12 → 2022-10-14 |
| Profit / max DD | 2.97 | 1.87 | 3.10 |
| Max consecutive losses | 4 | 4 | 5 |
| Lowest cumulative P&L | -8,254 | -14,908 | -14,130 |
| Longest underwater (days) | 1395 | 1680 | 1398 |
| Worst day | -8,732 (2020-03-12) | -8,550 (2020-09-03) | -8,808 (2020-09-03) |
| Avg borrowed, all sessions | 57,023 | 43,852 | 46,817 |
| Avg borrowed, while invested | 100,000 | 93,548 | 90,920 |
| % sessions exposed | 57% | 47% | 51% |
| Margin dollar-days ($M·d) | 207.7 | 158.9 | 170.4 |
| Net profit per $1M dollar-days | 560 | 525 | 590 |

**Observations from the tables:**
- **Max drawdown in 2016–2026.** Both variants have a *higher* max drawdown than the full-size baseline on VGT
  2016–2026 (B 47.1k, C 40.4k vs 38.3k), and B also on QQQ 2016–2026 (44.5k vs 39.2k), despite 15–24% less
  exposure. Their drawdown peak moves from 2021-04/09 to 2021-02-12 because they underperform in the 2021 chop
  (§8).
- **Win rates fall and losing streaks lengthen** (C: 11 and 14 vs 6 and 8 on the older datasets), because adds
  turn scratch trades into small losses (§7).

## 4. Matched-exposure comparison

| Dataset | Cfg | Exposure | Control size | Exp profit | Ctrl profit | Δ profit | Exp max DD | Ctrl max DD | Δ DD | Exp P/DD | Ctrl P/DD | Δ P/DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 0.835 | 83,495 | -13,233 | 9,687 | -22,920 | 66,512 | 61,288 | 5,224 | -0.20 | 0.16 | -0.36 |
| VGT_2005_2015 | C | 0.835 | 83,474 | -4,060 | 9,685 | -13,745 | 65,743 | 61,273 | 4,470 | -0.06 | 0.16 | -0.22 |
| QQQ_1999_2015 | B | 0.786 | 78,602 | -59,470 | -2,268 | -57,201 | 160,423 | 117,559 | 42,864 | -0.37 | -0.02 | -0.35 |
| QQQ_1999_2015 | C | 0.801 | 80,123 | -16,509 | -2,312 | -14,197 | 121,738 | 119,833 | 1,905 | -0.14 | -0.02 | -0.12 |
| VGT_2016_2026 | B | 0.856 | 85,617 | 129,096 | 138,505 | -9,409 | 47,114 | 32,811 | 14,303 | 2.74 | 4.22 | -1.48 |
| VGT_2016_2026 | C | 0.828 | 82,840 | 125,983 | 134,012 | -8,029 | 40,445 | 31,747 | 8,699 | 3.11 | 4.22 | -1.11 |
| QQQ_2016_2026 | B | 0.765 | 76,505 | 83,414 | 89,042 | -5,629 | 44,545 | 30,018 | 14,528 | 1.87 | 2.97 | -1.09 |
| QQQ_2016_2026 | C | 0.820 | 82,041 | 100,500 | 95,487 | 5,013 | 32,461 | 32,190 | 271 | 3.10 | 2.97 | 0.13 |

- **B is worse than its control on all 4 datasets**, on profit, max DD and profit/DD alike.
- **C is worse on profit in 3 of 4.** Its max DD is worse in **all 4** (by +$0.3k to +$8.7k), and its profit/DD is
  worse in 3 of 4.
- C's only positive row (QQQ 2016–2026: +$5.0k profit, +0.13 P/DD, DD +$0.3k) depends on one episode (§8).
- **There is no evidence of drawdown reduction beyond deleveraging.**

## 5. Bear markets

Absolute window statistics (window P&L includes interest; "P&L of trades entered" counts trades opened in the
window):

| Dataset | Window | Cfg | Period P&L | Δ vs A | Max DD in window | Interest | Trades closed | Losing | Largest loss | Avg borrowed | P&L of trades entered (n) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2007-2009 | A | -38,496 |  | 73,404 | 21,879 | 23 | 16 | -20,604 | 66,005 | -39,737 (22) |
| VGT_2005_2015 | 2007-2009 | B | -27,030 | 11,466 | 66,512 | 19,212 | 23 | 17 | -21,420 | 57,738 | -28,506 (22) |
| VGT_2005_2015 | 2007-2009 | C | -25,322 | 13,174 | 65,743 | 18,821 | 24 | 21 | -15,977 | 56,415 | -26,447 (23) |
| QQQ_1999_2015 | 2000-2002 | A | -91,629 |  | 149,561 | 28,630 | 56 | 36 | -20,200 | 87,899 | -88,454 (57) |
| QQQ_1999_2015 | 2000-2002 | B | -77,570 | 14,059 | 120,130 | 22,738 | 54 | 36 | -19,843 | 69,747 | -76,634 (55) |
| QQQ_1999_2015 | 2000-2002 | C | -52,556 | 39,073 | 103,978 | 21,638 | 54 | 37 | -16,864 | 66,356 | -51,439 (55) |
| QQQ_1999_2015 | 2007-2009 | A | 20,931 |  | 70,759 | 32,066 | 21 | 15 | -21,715 | 96,825 | 6,341 (21) |
| QQQ_1999_2015 | 2007-2009 | B | 1,286 | -19,645 | 79,799 | 21,819 | 23 | 21 | -22,567 | 66,336 | -10,296 (24) |
| QQQ_1999_2015 | 2007-2009 | C | 9,521 | -11,410 | 74,608 | 27,575 | 24 | 21 | -9,907 | 83,333 | -4,543 (24) |
| VGT_2016_2026 | 2022 | A | -23,643 |  | 34,856 | 9,644 | 13 | 10 | -11,151 | 90,438 | -22,845 (14) |
| VGT_2016_2026 | 2022 | B | -31,992 | -8,349 | 38,337 | 8,453 | 14 | 11 | -9,926 | 79,084 | -31,202 (15) |
| VGT_2016_2026 | 2022 | C | -27,823 | -4,179 | 32,193 | 7,338 | 15 | 12 | -6,854 | 67,530 | -27,424 (16) |
| QQQ_2016_2026 | 2022 | A | -26,320 |  | 33,932 | 9,764 | 13 | 10 | -10,297 | 90,438 | -25,561 (14) |
| QQQ_2016_2026 | 2022 | B | -31,298 | -4,978 | 35,324 | 8,152 | 14 | 11 | -8,922 | 76,295 | -30,919 (15) |
| QQQ_2016_2026 | 2022 | C | -21,065 | 5,255 | 28,436 | 7,112 | 15 | 12 | -5,149 | 65,538 | -20,686 (16) |

Against the **matched control** (a complete FixedSize run at the control size, evaluated with `metrics.window_stats`):

| Dataset | Window | Cfg | Variant P&L | Control P&L | Δ P&L | Variant window DD | Control window DD | Δ DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2007-2009 | B | -27,030 | -32,142 | 5,112 | 66,512 | 61,288 | 5,224 |
| VGT_2005_2015 | 2007-2009 | C | -25,322 | -32,134 | 6,812 | 65,743 | 61,273 | 4,470 |
| QQQ_1999_2015 | 2000-2002 | B | -77,570 | -72,022 | -5,547 | 120,130 | 117,559 | 2,571 |
| QQQ_1999_2015 | 2000-2002 | C | -52,556 | -73,416 | 20,860 | 103,978 | 119,833 | -15,855 |
| QQQ_1999_2015 | 2007-2009 | B | 1,286 | 16,452 | -15,166 | 79,799 | 55,618 | 24,181 |
| QQQ_1999_2015 | 2007-2009 | C | 9,521 | 16,771 | -7,250 | 74,608 | 56,694 | 17,913 |
| VGT_2016_2026 | 2022 | B | -31,992 | -20,243 | -11,749 | 38,337 | 29,843 | 8,494 |
| VGT_2016_2026 | 2022 | C | -27,823 | -19,586 | -8,237 | 32,193 | 28,875 | 3,318 |
| QQQ_2016_2026 | 2022 | B | -31,298 | -20,136 | -11,162 | 35,324 | 25,959 | 9,364 |
| QQQ_2016_2026 | 2022 | C | -21,065 | -21,593 | 528 | 28,436 | 27,838 | 598 |

- **B** beats its control in only one bear window (VGT 2007–09 P&L), and has a larger window drawdown in all five.
  - In 2022 and in QQQ 2007–09, the second tranche bought into bear-market rallies that failed.
  - It then turned those positions into larger loss exits.
- **C** does what the idea intends in the deepest bear, QQQ 2000–2002: −$52.6k vs −$73.4k for the control, with a
  window drawdown $15.9k smaller.
  - In that window, 16 of the 19 major baseline losers (all matched) never bounced 3% and were held at half size.
  - The gain is not repeated: C trails the control in QQQ 2007–09 (−$7.3k) and VGT 2022 (−$8.2k), and is flat in
    QQQ 2022 (+$0.5k).
  - Its overall QQQ 1999–2015 max drawdown (121.7k, peak 2000-03-27 → trough **2009**-03-05) is still larger than
    the control's (119.8k). C keeps losing after 2002 (2003 recovery, 2004–2008), so its trough simply moves later.

## 6. Recovery participation

| Dataset | Window | Cfg | Period P&L | Δ vs A (ratio) | P&L of trades entered (n) | Δ entered vs A | Control P&L | Δ vs control |
|---|---|---|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2009 | A | 15,518 |  | 21,725 (1) |  |  |  |
| VGT_2005_2015 | 2009 | B | 23,157 | 7,639 (149%) | 25,683 (1) | 3,959 | 12,957 | 10,201 |
| VGT_2005_2015 | 2009 | C | 26,179 | 10,661 (169%) | 27,416 (1) | 5,692 | 12,953 | 13,225 |
| QQQ_1999_2015 | 2003 | A | 18,291 |  | 15,116 (3) |  |  |  |
| QQQ_1999_2015 | 2003 | B | 13,362 | -4,929 (73%) | 12,426 (3) | -2,690 | 14,377 | -1,015 |
| QQQ_1999_2015 | 2003 | C | 7,169 | -11,122 (39%) | 6,051 (5) | -9,065 | 14,655 | -7,487 |
| QQQ_1999_2015 | 2009 | A | 66,522 |  | 57,832 (1) |  |  |  |
| QQQ_1999_2015 | 2009 | B | 61,724 | -4,798 (93%) | 51,788 (1) | -6,043 | 52,288 | 9,436 |
| QQQ_1999_2015 | 2009 | C | 62,961 | -3,561 (95%) | 52,948 (1) | -4,884 | 53,299 | 9,661 |
| VGT_2016_2026 | 2020 | A | 48,081 |  | 59,322 (5) |  |  |  |
| VGT_2016_2026 | 2020 | B | 49,476 | 1,396 (103%) | 54,006 (5) | -5,316 | 41,165 | 8,311 |
| VGT_2016_2026 | 2020 | C | 42,205 | -5,875 (88%) | 47,713 (4) | -11,609 | 39,830 | 2,376 |
| VGT_2016_2026 | 2023 | A | 44,468 |  | 42,695 (3) |  |  |  |
| VGT_2016_2026 | 2023 | B | 42,476 | -1,992 (96%) | 40,701 (3) | -1,995 | 38,072 | 4,404 |
| VGT_2016_2026 | 2023 | C | 39,324 | -5,144 (88%) | 37,901 (3) | -4,795 | 36,837 | 2,487 |
| VGT_2016_2026 | 2025 | A | 39,671 |  | 36,838 (3) |  |  |  |
| VGT_2016_2026 | 2025 | B | 35,927 | -3,744 (91%) | 35,430 (3) | -1,408 | 33,965 | 1,961 |
| VGT_2016_2026 | 2025 | C | 34,904 | -4,767 (88%) | 32,715 (3) | -4,123 | 32,863 | 2,041 |
| QQQ_2016_2026 | 2020 | A | 63,718 |  | 61,124 (5) |  |  |  |
| QQQ_2016_2026 | 2020 | B | 62,503 | -1,215 (98%) | 59,919 (5) | -1,205 | 48,747 | 13,756 |
| QQQ_2016_2026 | 2020 | C | 64,564 | 847 (101%) | 62,000 (4) | 876 | 52,275 | 12,290 |
| QQQ_2016_2026 | 2023 | A | 25,111 |  | 22,266 (2) |  |  |  |
| QQQ_2016_2026 | 2023 | B | 22,957 | -2,154 (91%) | 20,481 (2) | -1,785 | 19,211 | 3,746 |
| QQQ_2016_2026 | 2023 | C | 20,393 | -4,718 (81%) | 17,903 (2) | -4,363 | 20,601 | -209 |
| QQQ_2016_2026 | 2025 | A | 19,964 |  | 19,964 (2) |  |  |  |
| QQQ_2016_2026 | 2025 | B | 20,312 | 348 (102%) | 20,312 (2) | 348 | 15,273 | 5,039 |
| QQQ_2016_2026 | 2025 | C | 18,853 | -1,111 (94%) | 19,539 (1) | -425 | 16,379 | 2,474 |

**Relative to the baseline**, recovery participation is mostly preserved but reduced:
- B: 73–103% of baseline window P&L, except VGT 2009 (149%);
- C: 81–101%, with two exceptions:
  - QQQ 2003 at 39%: C took 5 entries in 2003 vs 3 for the baseline, after sequence divergence;
  - VGT 2009 at 169%: C happened to enter on 2009-03-06 at 3.27565, three sessions before the baseline's
    2009-03-11 entry at 3.4865, after a divergent sequence. On 2009-02-17, an add-raised breakeven triggered a loss
    exit three days before the baseline's. The baseline was still holding its 2009-02-23 trade on 2009-03-06.

**Relative to the matched control**, the variants participate *more* in most recovery windows (B 8 of 9, C 7 of
9; the exceptions are QQQ 2003 for both, and QQQ 2023 for C at −$0.2k). A rebound trade
reaches the add condition within a few sessions, so recovery winners run at the full $100,000 while the control
runs at $77–86k. This is the intended mechanism, and it does work in recoveries. It is outweighed by what the same
mechanism does in failed rallies (§5, §7, §8).

## 7. Staged-entry questions

| Dataset | Cfg | Positions | Q1: with 2nd tranche | Q2: sessions to add (mean / median / max) | Q2: calendar days (mean / median) | Q3: avg final capital per position | Q3: avg borrowed while invested | Q3: avg borrowed, all sessions (A) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 49 | 40 (82%) | 4.12 / 4 / 10 | 5.95 / 6 | 90,816 | 91,728 | 51,254 (61,340) |
| VGT_2005_2015 | C | 51 | 32 (63%) | 4.38 / 3 / 16 | 6.62 / 5 | 81,373 | 88,701 | 51,123 |
| QQQ_1999_2015 | B | 115 | 99 (86%) | 4.30 / 4 / 11 | 6.17 / 6 | 93,043 | 88,830 | 53,285 (67,620) |
| QQQ_1999_2015 | C | 116 | 70 (60%) | 3.60 / 3 / 15 | 5.26 / 4 | 80,172 | 85,912 | 54,195 |
| VGT_2016_2026 | B | 47 | 44 (94%) | 3.55 / 2.5 / 10 | 5.36 / 4.5 | 96,809 | 94,317 | 57,146 (66,640) |
| VGT_2016_2026 | C | 47 | 32 (68%) | 3.97 / 3 / 12 | 5.75 / 5 | 84,043 | 90,602 | 55,076 |
| QQQ_2016_2026 | B | 37 | 35 (95%) | 4.03 / 3 / 10 | 6.20 / 5 | 97,297 | 93,548 | 43,852 (57,023) |
| QQQ_2016_2026 | C | 38 | 27 (71%) | 4.44 / 3 / 12 | 6.67 / 5 | 85,526 | 90,920 | 46,817 |

Counts include the position open at the end. B's earliest add (entry+2) occurred in 8/40, 28/99, 22/44 and 13/35
of its adds; C's earliest (entry+1) in 8/32, 16/70, 8/32 and 4/27. About three quarters of all adds come within 5
sessions.

### Q4. Maximum drawdown and profitability after financing

All figures are net of margin interest. Interest falls with exposure: B 47.9–98.1k, C 51.4–100.0k, vs A 62.6–124.9k.

| Dataset | A net / max DD | B net / max DD | C net / max DD |
|---|---:|---:|---:|
| VGT_2005_2015 | 11,602 / 73,404 | −13,233 / 66,512 | −4,060 / 65,743 |
| QQQ_1999_2015 | −2,886 / 149,561 | −59,470 / 160,423 | −16,509 / 121,738 |
| VGT_2016_2026 | 161,772 / 38,323 | 129,096 / 47,114 | 125,983 / 40,445 |
| QQQ_2016_2026 | 116,388 / 39,237 | 83,414 / 44,545 | 100,500 / 32,461 |

- Both variants **turn VGT 2005–2015 from a profit into a loss**.
- B makes the QQQ 1999–2015 loss 20× larger.
- In absolute terms, max drawdown is lower than the baseline's on VGT 2005–2015 (both), QQQ 1999–2015 (C) and
  QQQ 2016–2026 (C), and higher elsewhere. Against the matched control (§4), it is never lower.

### Q5. Major winners where the second tranche came late

Baseline trades with net profit ≥ $10,000. "Δ vs base" = overlapping variant P&L − baseline P&L.

**VGT_2005_2015**
| Cfg | Baseline trade | Base P&L | Variant exit | Add date | Add / initial | Sessions to add | Variant P&L | Lot 1 | Lot 2 | Overlapping variant P&L (n) | Δ vs base |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| B | 2006-08-15 → 2007-08-10 | 12,293 | no same-entry trade |  | — | — | — | — | — | 15,498 (1) | 3,205 |
| B | 2009-03-11 → 2009-07-08 | 21,725 | no same-entry trade |  | — | — | — | — | — | 25,683 (1) | 3,959 |
| B | 2010-08-31 → 2011-03-15 | 18,141 | no same-entry trade |  | — | — | — | — | — | 15,377 (1) | -2,764 |
| B | 2011-11-23 → 2012-05-08 | 13,722 | 2011-12-16 (maximum hold) | 2011-12-01 | 1.069 | 5 | -131 | 1,547 | -1,678 | -131 (1) | -13,854 |
| C | 2006-08-15 → 2007-08-10 | 12,293 | 2007-08-10 (trailing stop) | 2006-08-28 | 1.030 | 9 | 10,695 | 6,147 | 4,548 | 10,695 (1) | -1,599 |
| C | 2009-03-11 → 2009-07-08 | 21,725 | no same-entry trade |  | — | — | — | — | — | 27,416 (1) | 5,692 |
| C | 2010-08-31 → 2011-03-15 | 18,141 | no same-entry trade |  | — | — | — | — | — | 15,377 (1) | -2,764 |
| C | 2011-11-23 → 2012-05-08 | 13,722 | no same-entry trade |  | — | — | — | — | — | 11,820 (2) | -1,903 |

**QQQ_1999_2015**
| Cfg | Baseline trade | Base P&L | Variant exit | Add date | Add / initial | Sessions to add | Variant P&L | Lot 1 | Lot 2 | Overlapping variant P&L (n) | Δ vs base |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| B | 2000-01-28 → 2000-03-14 | 23,182 | 2000-03-14 (trailing stop) | 2000-02-01 | 1.071 | 2 | 19,117 | 11,591 | 7,526 | 19,117 (1) | -4,065 |
| B | 2000-05-22 → 2000-06-23 | 11,446 | 2000-06-23 (trailing stop) | 2000-06-02 | 1.147 | 8 | 4,406 | 5,723 | -1,317 | 4,406 (1) | -7,040 |
| B | 2001-01-02 → 2001-01-05 | 12,260 | 2001-01-05 (trailing stop) | — | — | — | 6,130 | 6,130 | 0 | 6,130 (1) | -6,130 |
| B | 2001-01-08 → 2001-01-26 | 10,477 | 2001-01-26 (trailing stop gap) | 2001-01-11 | 1.082 | 3 | 6,322 | 5,239 | 1,084 | 6,322 (1) | -4,155 |
| B | 2001-04-05 → 2001-04-20 | 19,787 | no same-entry trade |  | — | — | — | — | — | 20,642 (1) | 855 |
| B | 2001-10-30 → 2001-12-13 | 17,865 | 2001-12-13 (trailing stop) | 2001-11-01 | 1.059 | 2 | 14,590 | 8,932 | 5,658 | 14,590 (1) | -3,275 |
| B | 2002-10-07 → 2002-11-11 | 21,285 | no same-entry trade |  | — | — | — | — | — | 12,490 (1) | -8,795 |
| B | 2003-03-06 → 2003-08-05 | 18,419 | no same-entry trade |  | — | — | — | — | — | 16,758 (2) | -1,661 |
| B | 2006-08-04 → 2007-08-15 | 15,204 | no same-entry trade |  | — | — | — | — | — | -1,154 (2) | -16,358 |
| B | 2009-03-09 → 2010-01-29 | 57,832 | 2010-01-29 (trailing stop) | 2009-03-11 | 1.078 | 2 | 51,788 | 28,916 | 22,873 | 51,788 (1) | -6,043 |
| B | 2010-08-26 → 2011-03-16 | 19,221 | no same-entry trade |  | — | — | — | — | — | 13,550 (2) | -5,671 |
| B | 2011-11-23 → 2012-05-16 | 13,616 | 2011-12-16 (maximum hold) | 2011-12-01 | 1.065 | 5 | -464 | 1,294 | -1,757 | -464 (1) | -14,080 |
| C | 2000-01-28 → 2000-03-14 | 23,182 | 2000-03-14 (trailing stop) | 2000-01-31 | 1.043 | 1 | 20,665 | 11,591 | 9,074 | 20,665 (1) | -2,517 |
| C | 2000-05-22 → 2000-06-23 | 11,446 | 2000-06-23 (trailing stop) | 2000-05-30 | 1.048 | 5 | 8,978 | 5,723 | 3,255 | 8,978 (1) | -2,468 |
| C | 2001-01-02 → 2001-01-05 | 12,260 | 2001-01-05 (trailing stop) | 2001-01-03 | 1.169 | 1 | 4,172 | 6,130 | -1,958 | 4,172 (1) | -8,088 |
| C | 2001-01-08 → 2001-01-26 | 10,477 | 2001-01-26 (trailing stop gap) | 2001-01-10 | 1.051 | 2 | 7,800 | 5,239 | 2,562 | 7,800 (1) | -2,677 |
| C | 2001-04-05 → 2001-04-20 | 19,787 | 2001-04-20 (trailing stop) | 2001-04-10 | 1.067 | 3 | 16,088 | 9,894 | 6,195 | 16,088 (1) | -3,699 |
| C | 2001-10-30 → 2001-12-13 | 17,865 | 2001-12-13 (trailing stop) | 2001-11-01 | 1.059 | 2 | 14,590 | 8,932 | 5,658 | 14,590 (1) | -3,275 |
| C | 2002-10-07 → 2002-11-11 | 21,285 | 2002-11-11 (trailing stop) | 2002-10-10 | 1.046 | 3 | 18,657 | 10,643 | 8,014 | 18,657 (1) | -2,628 |
| C | 2003-03-06 → 2003-08-05 | 18,419 | no same-entry trade |  | — | — | — | — | — | 9,187 (3) | -9,231 |
| C | 2006-08-04 → 2007-08-15 | 15,204 | 2007-08-15 (trailing stop) | 2006-08-16 | 1.044 | 8 | 12,697 | 7,602 | 5,095 | 12,697 (1) | -2,507 |
| C | 2009-03-09 → 2010-01-29 | 57,832 | 2010-01-29 (trailing stop) | 2009-03-10 | 1.062 | 1 | 52,948 | 28,916 | 24,032 | 52,948 (1) | -4,884 |
| C | 2010-08-26 → 2011-03-16 | 19,221 | no same-entry trade |  | — | — | — | — | — | 15,930 (2) | -3,291 |
| C | 2011-11-23 → 2012-05-16 | 13,616 | 2011-12-16 (maximum hold) | 2011-11-30 | 1.058 | 4 | -146 | 1,294 | -1,439 | -146 (1) | -13,762 |

**VGT_2016_2026**
| Cfg | Baseline trade | Base P&L | Variant exit | Add date | Add / initial | Sessions to add | Variant P&L | Lot 1 | Lot 2 | Overlapping variant P&L (n) | Δ vs base |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| B | 2018-12-26 → 2019-05-13 | 17,127 | 2019-05-13 (trailing stop) | 2019-01-02 | 1.017 | 4 | 16,224 | 8,564 | 7,660 | 16,224 (1) | -904 |
| B | 2020-04-03 → 2020-09-04 | 50,533 | 2020-09-04 (trailing stop) | 2020-04-09 | 1.110 | 4 | 42,908 | 25,267 | 17,642 | 42,908 (1) | -7,625 |
| B | 2020-10-29 → 2021-02-23 | 12,197 | 2021-02-23 (trailing stop) | 2020-11-03 | 0.997 | 3 | 12,434 | 6,099 | 6,335 | 12,434 (1) | 237 |
| B | 2023-01-04 → 2023-08-09 | 28,006 | 2023-08-09 (trailing stop) | 2023-01-09 | 1.020 | 3 | 26,768 | 14,003 | 12,765 | 26,768 (1) | -1,238 |
| B | 2023-10-20 → 2024-04-18 | 15,193 | 2024-04-18 (trailing stop) | 2023-10-24 | 1.009 | 2 | 14,712 | 7,596 | 7,116 | 14,712 (1) | -481 |
| B | 2024-04-19 → 2024-07-24 | 14,049 | 2024-07-24 (trailing stop) | 2024-04-23 | 1.030 | 2 | 12,384 | 7,025 | 5,360 | 12,384 (1) | -1,665 |
| B | 2025-04-11 → 2025-11-14 | 35,713 | 2025-11-14 (trailing stop gap) | 2025-04-15 | 1.011 | 2 | 35,009 | 17,857 | 17,152 | 35,009 (1) | -704 |
| B | 2026-03-26 → 2026-06-05 | 31,094 | 2026-06-05 (trailing stop) | 2026-04-01 | 1.015 | 4 | 30,184 | 15,547 | 14,637 | 30,184 (1) | -910 |
| C | 2018-12-26 → 2019-05-13 | 17,127 | 2019-05-13 (trailing stop) | 2019-01-09 | 1.043 | 9 | 14,858 | 8,564 | 6,294 | 14,858 (1) | -2,270 |
| C | 2020-04-03 → 2020-09-04 | 50,533 | no same-entry trade |  | — | — | — | — | — | 43,229 (1) | -7,304 |
| C | 2020-10-29 → 2021-02-23 | 12,197 | 2021-02-23 (trailing stop) | 2020-11-04 | 1.037 | 4 | 10,244 | 6,099 | 4,146 | 10,244 (1) | -1,953 |
| C | 2023-01-04 → 2023-08-09 | 28,006 | 2023-08-09 (trailing stop) | 2023-01-11 | 1.044 | 5 | 25,286 | 14,003 | 11,283 | 25,286 (1) | -2,720 |
| C | 2023-10-20 → 2024-04-18 | 15,193 | 2024-04-18 (trailing stop) | 2023-11-03 | 1.044 | 10 | 12,866 | 7,596 | 5,270 | 12,866 (1) | -2,327 |
| C | 2024-04-19 → 2024-07-24 | 14,049 | 2024-07-24 (trailing stop) | 2024-04-23 | 1.030 | 2 | 12,384 | 7,025 | 5,360 | 12,384 (1) | -1,665 |
| C | 2025-04-11 → 2025-11-14 | 35,713 | no same-entry trade |  | — | — | — | — | — | 34,039 (2) | -1,674 |
| C | 2026-03-26 → 2026-06-05 | 31,094 | 2026-06-05 (trailing stop) | 2026-04-07 | 1.032 | 7 | 29,197 | 15,547 | 13,650 | 29,197 (1) | -1,897 |

**QQQ_2016_2026**
| Cfg | Baseline trade | Base P&L | Variant exit | Add date | Add / initial | Sessions to add | Variant P&L | Lot 1 | Lot 2 | Overlapping variant P&L (n) | Δ vs base |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| B | 2018-12-26 → 2019-05-29 | 11,001 | 2019-05-29 (trailing stop) | 2019-01-02 | 1.016 | 4 | 10,211 | 5,501 | 4,710 | 10,211 (1) | -790 |
| B | 2020-03-19 → 2020-09-04 | 52,700 | 2020-09-04 (trailing stop) | 2020-03-24 | 1.036 | 3 | 50,026 | 26,350 | 23,676 | 50,026 (1) | -2,674 |
| B | 2020-10-30 → 2021-02-23 | 12,212 | 2021-02-23 (trailing stop) | 2020-11-03 | 1.020 | 2 | 11,164 | 6,106 | 5,058 | 11,164 (1) | -1,048 |
| B | 2023-10-26 → 2024-04-19 | 15,387 | 2024-04-19 (trailing stop) | 2023-10-30 | 1.016 | 2 | 14,490 | 7,693 | 6,796 | 14,490 (1) | -897 |
| B | 2025-04-17 → 2025-11-20 | 25,424 | 2025-11-20 (trailing stop) | 2025-04-23 | 1.024 | 3 | 23,996 | 12,712 | 11,284 | 23,996 (1) | -1,428 |
| B | 2026-03-27 → 2026-06-09 | 20,198 | 2026-06-09 (trailing stop) | 2026-04-01 | 1.039 | 3 | 17,997 | 10,099 | 7,898 | 17,997 (1) | -2,201 |
| C | 2018-12-26 → 2019-05-29 | 11,001 | 2019-05-29 (trailing stop) | 2019-01-07 | 1.037 | 7 | 9,120 | 5,501 | 3,619 | 9,120 (1) | -1,882 |
| C | 2020-03-19 → 2020-09-04 | 52,700 | no same-entry trade |  | — | — | — | — | — | 54,586 (1) | 1,886 |
| C | 2020-10-30 → 2021-02-23 | 12,212 | 2021-02-23 (trailing stop) | 2020-11-04 | 1.065 | 3 | 8,754 | 6,106 | 2,648 | 8,754 (1) | -3,459 |
| C | 2023-10-26 → 2024-04-19 | 15,387 | 2024-04-19 (trailing stop) | 2023-11-01 | 1.039 | 4 | 13,229 | 7,693 | 5,535 | 13,229 (1) | -2,158 |
| C | 2025-04-17 → 2025-11-20 | 25,424 | no same-entry trade |  | — | — | — | — | — | 19,539 (1) | -5,884 |
| C | 2026-03-26 → 2026-06-09 | 20,198 | 2026-06-09 (trailing stop) | 2026-04-01 | 1.039 | 3 | 17,997 | 10,099 | 7,898 | 17,997 (1) | -2,201 |

Totals over the major winners (Σ overlapping variant − Σ baseline):

| Cfg | VGT 05–15 | QQQ 99–15 | VGT 16–26 | QQQ 16–26 |
|---|---:|---:|---:|---:|
| B | −9,455 (4 winners) | −76,418 (12) | −13,289 (8) | −9,038 (6) |
| C | −574 (4) | −59,027 (12) | −21,809 (8) | −13,698 (6) |

How the late tranche costs money on winners:
- **Higher cost basis.** On matched winners with an add, the mean add/initial ratio was:
  - B: 1.069, 1.084, 1.026, 1.025;
  - C: 1.030, 1.065, 1.038, 1.045.

  Lot 2 therefore earned less than the baseline's second half (lot 2 − base/2) by an average of:
  - B: −$8.5k, −$5.5k, −$1.7k, −$1.5k per winner;
  - C: −$1.6k, −$4.1k, −$2.1k, −$2.4k.

  The costliest cases are adds after a sharp first-day jump: QQQ 2001-01-02 C added at 1.169× (−$8.1k); VGT
  2020-04-03 B at 1.110× (−$7.6k); QQQ 2000-05-22 B at 1.147× after 8 sessions (−$7.0k).
- **Lost winners.** The add raised the breakeven and the 15-day loss exit fired, so the whole winner was lost:
  - QQQ 2011-11-23: on 2011-12-16 (day 23), the open was 48.707.
    - The aggregate breakeven was 48.93 under B and 48.78 under C, so the position exited at about scratch
      (B −$464, C −$146).
    - The initial lot alone had a breakeven of 47.49, so the baseline held to 2012-05-16 for +$13.6k.
  - VGT 2011-11-23 (B), the same day: −$131 vs +$13.7k.
  - QQQ 2021-03-04 (C, below the threshold but in §8): exit 2021-03-19 at 303.896, under an aggregate breakeven
    of 304.01 → −$39, vs the baseline's +$9.6k held to 2021-10-04.
- **Sequence shifts.** A loss exit moved by one session changes the next entry date. B's 2006 QQQ sequence never
  re-entered on the baseline's 2006-08-04 signal: −$1.2k over that span vs +$15.2k for the baseline.
- **The few positive cases are path luck from divergent sequences**, not from the add rule:
  - VGT 2009: the variants entered on 2009-03-06, which the baseline could not, because it was still in a trade;
  - QQQ 2020 C: see §8.

### Q6. Major losers where the reduced initial exposure saved money

Baseline trades with net profit ≤ −$5,000; Σ Δ = Σ overlapping variant P&L − Σ baseline P&L.

| Cfg | VGT 05–15 | QQQ 99–15 | VGT 16–26 | QQQ 16–26 |
|---|---:|---:|---:|---:|
| B: losers / matched / no add | 4 / 4 / 1 | 25 / 14 / 4 | 7 / 6 / 0 | 7 / 7 / 0 |
| B: Σ Δ (saved) | +9,812 | +57,121 | −740 | +1,332 |
| C: losers / matched / no add | 4 / 4 / 3 | 25 / 21 / 18 | 7 / 7 / 6 | 7 / 6 / 5 |
| C: Σ Δ (saved) | +16,645 | +101,368 | +23,458 | +42,105 |

- **C saves money on major losers as intended.**
  - In 32 of the 38 matched major losers, the price never closed 3% above entry, so the loss was exactly halved.
  - Examples:
    - VGT 2008-09-23: −$10.3k vs −$20.6k;
    - QQQ 2000-03-30: −$10.1k vs −$20.2k;
    - QQQ 2001-09-05: −$8.8k vs −$17.5k.
  - **Every C position without an add was a losing trade (91 of 91 across the four datasets).** C is, in effect,
    "half size on trades that never bounce 3%".
  - The savings are partly lost where a bounce came first and then failed. Lot 2 was then bought 3–6% higher, and
    the loss was larger than the baseline's:
    - QQQ 2001-03-02: −$14.1k vs −$11.8k;
    - QQQ 2001-03-20: −$16.9k vs −$14.4k;
    - VGT 2008-11-03: −$16.0k vs −$14.6k;
    - QQQ 2020-02-27: −$11.7k vs −$9.5k.
- **B saves little on matched losers.** Two consecutive up closes almost always occur during a failing dip (5 of
  31 matched losers had no add).
  - Its savings come mainly from adds made *below* the initial price, which lower the cost basis: VGT 2022-09-15
    added at 0.961× (+$2.1k); QQQ 2022-09-14 at 0.947× (+$2.8k).
  - The rest comes from sequence divergence (QQQ 2001-03-20: +$32.3k, path luck; see §8).

### How the addition changes the cost basis, stop eligibility and the exit

- **Cost basis.**
  - With equal dollar tranches, the average cost is the harmonic mean of the two prices:
    100,000 / (50,000/p₁ + 50,000/p₂).
  - Among positions with an add, the average cost rose by:
    - B: +0.70%, +1.06%, +1.01%, +0.99% (add/initial mean 1.015–1.022; 6–22 adds per dataset were below p₁);
    - C: +2.00%, +2.31%, +2.27%, +2.05% (add/initial mean 1.041–1.048; never below 1.030 by construction).
  - Lot 2 accrues less interest because it is held for fewer days. That offsets only a few basis points.
- **Stop eligibility.**
  - The stop level is unchanged by the add, but activation requires L > aggregate breakeven (cost plus per-lot
    interest per share), so an add above p₁ makes activation harder.
  - The add blocked a stop that lot 1 alone would have activated:

    | Cfg | VGT 05–15 | QQQ 99–15 | VGT 16–26 | QQQ 16–26 |
    |---|---:|---:|---:|---:|
    | B: positions (sessions) | 9 (39) | 29 (154) | 8 (29) | 9 (63) |
    | C: positions (sessions) | 12 (113) | 30 (210) | 16 (123) | 14 (114) |

  - A blocked stop cuts both ways:
    - Bad: QQQ 2020-09-24 C (trace above) lost the protective stop and left via the loss exit.
    - Good, once: QQQ 2020-03-16 C, held through the March 2020 whipsaw (§8).
  - The opposite case exists for adds below p₁. QQQ 2001-02-14 B added at 0.908×, which lowered the breakeven to
    46.45, below the stale stop of 47.18. The "profit-conditional" stop became active while the price was already
    below it, and the position gapped out at the next open (43.70) for a **trailing-stop exit at a −$5,934 loss**.
    This is the only such case; under the frozen semantics it is legitimate, and here it happened to save money.
- **Exit.**
  - The higher breakeven makes the 15-day loss exit fire on opens where the initial lot alone would still be in
    profit. Exits caused by the add:
    - B: 10, 21, 10, 7;
    - C: 17, 19, 10, 9.

    These match the number of positions where the add turned a winning lot 1 into a losing position:
    - B: 10, 21, 10, 7;
    - C: 18, 19, 10, 9.
  - Among positions matched to a baseline entry, the exit changed in 9/18/9/6 (B) and 9/16/9/9 (C). Most of these
    were **earlier** exits: B 7, 12, 9, 6; C 7, 11, 7, 8.
  - The effect on the initial half (Σ lot 1 − base/2 over the changed exits) is small, except in QQQ 2016–2026:
    - B: +$0k, +$10.2k, −$1.0k, −$5.2k;
    - C: +$6.4k, +$8.2k, +$4.7k, **+$33.9k**. The +$33.9k is almost entirely the 2020-03-16 trade.
  - The larger, systematic cost comes from the **second tranche's worse price**. Over matched positions with an
    add and an unchanged exit, Σ(lot 2 − base/2) was:
    - B: −$7.2k, −$52.0k, −$21.1k, −$21.2k;
    - C: −$22.3k, −$87.7k, −$30.7k, −$26.0k.

**Exposure efficiency of each tranche** (dollar-days = lot interest ÷ (11%/365)):

| Dataset | Cfg | Lot-1 $M·d | Σ lot-1 P&L | Lot-1 P&L per $1M·d | Lot-2 $M·d | Σ lot-2 P&L | Lot-2 P&L per $1M·d | Baseline P&L per $1M·d |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 108.0 | 2,073 | 19 | 90.2 | -15,306 | -170 | 49 |
| VGT_2005_2015 | C | 111.9 | 9,220 | 82 | 86.3 | -13,280 | -154 | 49 |
| QQQ_1999_2015 | B | 183.3 | 4,792 | 26 | 142.3 | -64,262 | -452 | -7 |
| QQQ_1999_2015 | C | 193.2 | 3,981 | 21 | 138.7 | -20,490 | -148 | -7 |
| VGT_2016_2026 | B | 110.5 | 86,675 | 784 | 97.5 | 42,422 | 435 | 666 |
| VGT_2016_2026 | C | 111.0 | 82,871 | 746 | 90.2 | 43,111 | 478 | 666 |
| QQQ_2016_2026 | B | 85.3 | 58,391 | 685 | 73.6 | 25,022 | 340 | 560 |
| QQQ_2016_2026 | C | 94.0 | 64,902 | 690 | 76.3 | 35,598 | 466 | 560 |

- **The second tranche is the least productive capital** in all 8 config/dataset pairs. Its P&L per dollar-day is
  below the baseline's average and below lot 1's in every case, and it is negative in both 2005–2015 datasets.
- Positions with an add were profitable only 29% of the time (B, 218 adds) and 41% (C, 161 adds). Neither a 3%
  bounce nor two up closes separates the dips that recover from the ones that fail.

## 8. Dependence on a few trades or one event

**Method.** Trades are grouped into episodes: connected sets of overlapping holding periods across the variant and
baseline sequences.
- Δ vs control = variant P&L − exposure × baseline P&L. The sums equal the summary's control differences exactly.

| Dataset | Cfg | Δ vs control | Best episode (Δ) | Worst episode (Δ) | Δ excl. best | Δ excl. worst | Episodes +/− |
|---|---|---:|---|---|---:|---:|---:|
| VGT_2005_2015 | B | −22,920 | 2009-02-02 (+9,124) | 2011-11-23 (−11,589) | −32,044 | −11,331 | 15 / 22 |
| VGT_2005_2015 | C | −13,745 | 2009-02-02 (+12,029) | 2011-06-13 (−7,810) | −25,774 | −5,936 | 17 / 17 |
| QQQ_1999_2015 | B | −57,201 | 2001-02-14 (+24,752) | 2006-05-23 (−17,755) | −81,954 | −39,446 | 24 / 47 |
| QQQ_1999_2015 | C | −14,197 | 1999-05-24 (+8,162) | 2008-08-01 (−12,991) | −22,359 | −1,206 | 48 / 40 |
| VGT_2016_2026 | B | −9,409 | 2025-04-11 (+4,432) | 2018-04-02 (−6,677) | −13,841 | −2,732 | 18 / 22 |
| VGT_2016_2026 | C | −8,029 | 2022-04-28 (+3,662) | 2022-05-16 (−8,266) | −11,691 | +237 | 22 / 16 |
| QQQ_2016_2026 | B | −5,629 | 2020-03-19 (+9,708) | 2021-03-04 (−7,722) | −15,337 | +2,093 | 16 / 17 |
| QQQ_2016_2026 | C | **+5,013** | **2020-03-16 (+11,240)** | 2021-03-04 (−7,941) | **−6,227** | +12,954 | 17 / 12 |

**Trades responsible:**
- **C's only gain vs its control (QQQ 2016–2026) is one episode.**
  - The 2020-03-16 entry added at 176.182 the next day (1.076×), which raised the breakeven to 169.84.
  - On 2020-03-18, the baseline's stop (164.10868, active because the baseline breakeven was 163.89) filled at a
    $134 profit. The baseline re-entered on 2020-03-19 at 171.87 (+$52.7k).
  - The variant's stop was inactive, so it simply held at full size until 2020-09-04 (+$54.6k), against a control
    episode of 0.82 × $52.8k.
  - Without this episode, C trails its control by $6.2k on QQQ 2016–2026 as well. A stop that happened to be
    blocked during a whipsaw is not a repeatable property of the rule; on 2020-09-24 the same blocking produced a
    loss exit.
- **C's largest deteriorations** are the trades where the add raised the breakeven so that a later winner was
  exited at about scratch:
  - QQQ 2021-03-04: −$7.9k vs control;
  - QQQ 2011-11-23: −$11.1k;
  - VGT 2022-05-16 and 2011-06-13: re-entry sequences around failed adds, −$8.3k and −$7.8k;
  - QQQ 2008-08-01 → 2009: a diverged 10-trade sequence, −$13.0k.
- **B's largest single contribution** is path luck: QQQ 2001-02-14 (+$24.8k).
  - An add below the initial price triggered the early gap-out described in §7.
  - That shifted every later entry, so B entered on 2001-04-03 at 29.39 instead of 2001-04-05 at 31.63.
- **B's deterioration is broad** (47 of 71 episodes negative on QQQ 1999–2015).
  - Its profit shortfall survives removing the single worst episode on 3 of 4 datasets. On QQQ 2016–2026 it
    becomes +$2.1k without 2021-03-04.
  - B's max drawdown is worse than the control's on all four datasets regardless.
- **In 2016–2026, |Δ| for B and C is the size of one or two episodes.** In those datasets the sign of the result
  vs control is decided by individual path-dependent trades. That is noise, not a demonstrated effect.

## 9. Preliminary classification

**B_staged_two_positive_closes: Unpromising. C_staged_3pct_recovery: Unpromising.**

**Historical observations** (facts about the price history):
- After a ≥10% dip from the 90-session high, QQQ and VGT very often post two consecutive up closes within a few
  sessions. B's condition was met before an exit in 82–95% of positions, after a median of 2.5–4 sessions.
- A close 3% above the dip-entry close (C's condition) came before an exit in 60–71% of positions, after a median
  of 3 sessions.
- These conditions occurred during the failed bear-market rallies of 2000–2002, 2008 and 2022, as well as in the
  2003, 2009, 2020, 2023 and 2025 recoveries.
- No C position that went without the second tranche (no close ≥ 3% above entry while open) ended profitable
  (0 of 91).

**Backtest calculations** (engine outputs, §3–§8):
- **Versus the matched control:**
  - B: profit, max DD and profit/DD worse on 4 of 4 datasets (Δ profit −$5.6k to −$57.2k; Δ DD +$5.2k to +$42.9k).
  - C: profit worse on 3 of 4 (−$8.0k to −$14.2k; +$5.0k on QQQ 2016–2026); max DD worse on 4 of 4 (+$0.3k to
    +$8.7k); profit/DD worse on 3 of 4.
- **Versus the full baseline:** both variants earn less on every dataset. Max DD is lower on VGT 2005–2015 (both),
  QQQ 1999–2015 (C) and QQQ 2016–2026 (C); it is higher elsewhere.
- **Tranche efficiency:** the second tranche earns less per dollar-day than the baseline average in 8 of 8 pairs.
- **Bear windows:** C beats its control in QQQ 2000–02 (+$20.9k, window DD −$15.9k) and VGT 2007–09 (+$6.8k). It
  trails in QQQ 2007–09 (−$7.3k) and VGT 2022 (−$8.2k), and is flat in QQQ 2022.
- **Recovery windows:** the variants beat their controls in most windows (B 8 of 9, C 7 of 9).

**Hypotheses** (not tested here):
- A bounce condition measured over 1–5 sessions after a dip is too weak a signal to separate recoveries from
  bear-market rallies in these ETFs. A slower confirmation might separate them better, at the cost of a still higher
  cost basis.
- The cost of staged entry is structural in this exit design. Any add above p₁ raises the breakeven that both the
  profit-conditional stop and the 15-day loss exit are measured against. Adds above the initial price therefore
  shorten some winners and convert scratch trades into losses.

**Inferences:**
- **Staged entry does not reduce risk beyond what holding less capital does.** Holding a constant ~80% of the
  position (the matched control) achieves the same or better risk-adjusted results with no extra rules.
- C's protective effect on deep, persistent declines is real (QQQ 2000–02). It does not persist across the cycle:
  the same dataset's overall max DD is larger than the control's.
- The one dataset where C beats its control does so because of one blocked stop in March 2020.

**Limitations:**
- QQQ and VGT are highly correlated technology-heavy ETFs, so the four datasets are roughly two independent
  histories (1999/2005–2015 and 2016–2026).
- There are few major winners per dataset (4–12), and results are strongly path-dependent: one-session shifts in a
  loss exit change later entries.
- The model has no commissions, slippage or borrow-rate changes, and fills at the close and open as the engine
  defines them. Prices are adjusted closes used as given.
- The `extra` drawdown and exposure comparisons inherit the matched-control construction, which equalizes margin
  dollar-days, not peak borrowing. Peak borrowing is the same $100,000 in all configs.
- The reporting thresholds for major winners and losers ($10k / −$5k) are descriptive choices. Changing them would
  not change any metric.

## 10. Parameters to flag for a later, separately authorised robustness study (not run)

- Tranche split (50/50) and the number of tranches (at most one add).
- B: the number of confirming up closes (2), the strict vs non-strict positive-return definition, and any time
  limit on the add window.
- C: the recovery threshold (3%) and its reference price (initial entry close vs post-entry low or average cost).
- Whether stop activation and the 15-day loss exit should be measured on the initial lot, or should restart at the
  add. This is an engine-semantics question, outside the current frozen hooks, which use the aggregate position.
- Whether to allow adds below the initial price, or below the current stop level (the QQQ 2001-02-14 gap-out case).
- Sensitivity to the 90-session window, the 10% entry dip, the 8% trail and the 15-day loss exit, which interact
  directly with the add timing.
