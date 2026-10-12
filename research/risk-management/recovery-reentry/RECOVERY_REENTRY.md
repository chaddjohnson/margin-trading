# Recovery-confirmed re-entry (experiment 4, `recovery_reentry`)

**Preliminary classification: Unpromising.** All 12 variant/dataset combinations earn less than the baseline (−$6.6k to −$117.7k). All 12 also earn less than their matched-exposure controls, and all 12 have a lower profit/DD than their control. Max drawdown is worse than the baseline in 10 of 12 cases and worse than the control in 11 of 12. The confirmation rules do cut losses on the repeated losing re-entries they block, but in every case they give up more on the rebound winners they delay or miss.

Reproduce (about 2 seconds in total):

```
PY=<venv python>; export PYTHONDONTWRITEBYTECODE=1
cd research/risk-management/recovery-reentry
$PY run.py          # results/summary.json, trades/, daily/, events/, matching/, shadow/, recovery/
$PY verify.py       # results/verification.txt (baseline reproduction, independent replay, spot checks)
$PY tables.py       # every table in this report, as markdown
```

---

## 1. Configuration and exact implementation

| Config | Confirmation required after a losing exit at session x (latched, then cleared by the next entry) |
|---|---|
| `A_baseline` | none (plain `engine.Strategy`) |
| `B_two_positive_closes` | sessions j−1 and j, both after x, each with a positive close-to-close return: close_j > close_{j−1} > close_{j−2}. The earliest is j = x+2. |
| `C_close_above_sma10` | some j > x with close_j > SMA10_j, where SMA10_j = mean(close_{j−9..j}). The earliest is j = x+1. |
| `D_recovery_3pct_from_low` | some j > x with close_j ≥ 1.03 × min(close_x..close_j). The low includes the exit session's close. The earliest is j = x+1. |

The code is in `strategies.py`. The rules are pure functions of the close array, x and j, and use closes through session j only. The class `RecoveryConfirmed` uses three hooks of the frozen engine:

- **`on_exit(e, i, trade)`:**
  - If `trade['profit'] < 0` (net of interest), it arms the requirement with x = i and the latch cleared.
  - On a profitable or exactly break-even exit, it clears any requirement.
  - An open position at the end is not a closed trade and arms nothing.
- **`entry_allowed(e, i)`:** the engine calls this only on a session where the strategy is flat (and did not exit) and the original 10% signal holds at the close.
  - If nothing is armed, it returns True (baseline behaviour, including before the dataset's first entry).
  - Otherwise it first evaluates the rule at session i's own close and latches it if satisfied. It then returns the latch.
  - A False return skips that session's entry permanently, so there are no retroactive entries.
- **`on_session_end(e, i)`:**
  - If a position was opened at this close, the requirement is used up and cleared.
  - Otherwise it evaluates the rule at session i's close (if i > x) and latches it.
  - The latch is therefore maintained on every session, including sessions without a signal. Once satisfied, it stays satisfied until the next entry.

**Chronology within a session i** (engine order, unchanged):
1. If a position was carried in: open-time exits (15-day loss exit, trailing-stop gap), then the intraday trailing stop.
   - An exit calls `on_exit`, so a losing exit arms the requirement during session x itself.
   - The engine never re-enters on an exit session.
   - The rule is never evaluated at session x, because it needs j > x.
2. If the strategy was flat at the start of i: at the close, it checks the 10% signal (close ≥ 10% below the highest high of the previous 90 sessions), then `entry_allowed` (the latch, including session i's own close).
   - If both hold, it buys $100,000 at the close.
3. Mark to market, then `on_session_end`: it clears the requirement if an entry was made, or else evaluates and latches the rule.

**Assumptions** (all within SPEC.md's fixed interpretation):
- "Positive return" and "close above SMA10" are strict inequalities. An unchanged close (0.00%) does not count; see spot check B2. The 3% test is inclusive (≥).
- SMA10 may include closes from before x; the spec defines it as closes j−9..j. SMA10 is unavailable for j < 9. That never occurred: 0 sessions on every dataset.
- Confirmation uses closes only, never intraday highs or lows.
- The latch has no expiry. A satisfied latch waits indefinitely for the next 10% signal.
- Everything else is the baseline: size ($100k fixed), the trailing stop, the 15-day loss exit, interest (11% simple, per calendar day) and the no-re-entry-on-exit-session rule.
- No look-ahead: the decision at session i uses closes through i, and the entry is at i's close, exactly as in the baseline.

---

## 2. Verification

### 2.1 `A_baseline` reproduces the frozen baseline exactly

The check is `verify.py`, with its output in `results/verification.txt`. For every dataset, the `metrics` and `matched_control` dicts of `A_baseline` equal those in `baseline/results/summary.json` exactly, after the same JSON serialisation. The trades and daily CSVs are also byte-identical to the baseline's.

| Dataset | Net (A = baseline) | Max DD (A = baseline) | metrics | matched_control | trades CSV | daily CSV |
|---|---:|---:|---|---|---|---|
| VGT_2005_2015 | 11,602.49 | 73,403.62 | identical | identical | identical | identical |
| QQQ_1999_2015 | −2,885.66 | 149,561.06 | identical | identical | identical | identical |
| VGT_2016_2026 | 161,772.50 | 38,323.32 | identical | identical | identical | identical |
| QQQ_2016_2026 | 116,388.45 | 39,236.60 | identical | identical | identical | identical |

`baseline/CHECKSUMS.txt` still verifies: every file reports OK.

### 2.2 Independent replay of the confirmation logic

`verify.py` re-derives every entry decision from the variant's trade list and the price file alone, using a separate state machine that never touches the engine. It checks three things:
- every variant entry had the 10% signal and a satisfied latch;
- every flat signal session with the latch satisfied produced an entry;
- the list of blocked signal sessions is identical to the one the engine recorded.

All 12 variant runs pass with zero discrepancies. The blocked signal-session counts were:

| | B | C | D |
|---|---:|---:|---:|
| VGT_2005_2015 | 98 | 87 | 102 |
| QQQ_1999_2015 | 265 | 223 | 252 |
| VGT_2016_2026 | 80 | 80 | 108 |
| QQQ_2016_2026 | 66 | 89 | 84 |

`analysis.py` also asserts three properties on every run:
- a variant trade that enters on a baseline entry session is the identical trade (same exit, same P&L);
- every variant entry falls inside exactly one baseline trade span;
- the P&L decompositions of section 7 sum exactly to the net difference.

### 2.3 Spot checks (closes, confirmation state, sizes, fills)

`results/verification.txt` prints, for the first three blocked post-loss signals of every config on every dataset (36 cases), each session from the exit to the entry. Each row shows the close, return, 10% signal, SMA10 (C), running low and close/low ratio (D), and latch state.

Every entry below is $100,000 at the session close (shares = 100,000 ÷ close). "Signal" means the 10% entry signal was present.

**B: two positive closes**

- **B1. VGT_2005_2015.** The losing exit was 2006-06-07 (−$543), at a close of 4.9992.

  | Date | Close | Return | Signal | Latched |
  |---|---:|---:|---|---|
  | 06-08 | 4.9592 | −0.80% | Y | blocked |
  | 06-09 | 4.9340 | −0.51% | Y | blocked |
  | 06-12 | 4.8407 | −1.89% | Y | blocked |
  | 06-13 | 4.8047 | −0.74% | Y | blocked |
  | 06-14 | 4.8612 | +1.18% | Y | blocked (one up close) |
  | 06-15 | 4.9938 | +2.73% | Y | **latched**, entry |

  - Fill: 20,024.83 shares at 4.9938.
  - Exit: 2006-07-03 at the open, 5.0080, by the 15-day loss exit after 18 days. Interest was $542.47 and P&L −$257.71.
  - On its own path, the baseline had bought 06-08 at 4.9592 (−$437.54).
- **B2. QQQ_1999_2015.** The losing exit was 2000-05-22 (−$11,253), at a close of 69.1964.

  | Date | Close | Return | Signal | Latched |
  |---|---:|---:|---|---|
  | 05-23 | 63.4294 | −8.33% | Y | blocked |
  | 05-24 | 67.4019 | +6.26% | Y | blocked |
  | 05-25 | 65.9207 | −2.20% | Y | blocked |
  | 05-26 | 65.9207 | 0.00% | Y | blocked (not positive) |
  | 05-30 | 72.5374 | +10.04% | Y | blocked |
  | 05-31 | 70.4768 | −2.84% | Y | blocked |
  | 06-01 | 74.0714 | +5.10% | Y | blocked |
  | 06-02 | 79.3722 | +7.16% | Y | **latched**, entry |

  - Fill: 1,259.89 shares at 79.3722, which is 25.1% above the first blocked signal close.
  - Exit: 2000-06-19 at 79.7129 by the loss exit, for −$83.09.
  - The baseline bought on 05-22 itself at 69.1964 and made +$11,446.
- **B3. VGT_2016_2026: the latch holding across sessions without a signal.** The losing exit was 2018-10-26 (−$1,903).
  - 10-29: close 20.9912, −1.65%, signal Y, blocked.
  - 10-30: close 21.2591, +1.28%, signal Y, blocked.
  - 10-31: close 21.7818, +2.46%, no signal. The latch was satisfied, but there was nothing to buy.
  - 11-01 to 11-09: no signal; the latch stayed satisfied.
  - 11-12: close 21.1983, signal Y. Entry: 4,717.36 shares.
  - Exit: 11-27 at 20.5455 by the loss exit, for −$3,531.55.
- **B4. VGT_2016_2026: a signal lapse.** The losing exit was 2023-01-03, for −$142.90. That trade went from 39.40 to 39.52: the price gain was smaller than the $452 of interest.
  - 01-04 +0.43%, 01-05 −2.07% and 01-06 +2.86%: each blocked (signal Y).
  - 01-09: +1.25%, latched. But the close was now only 9.6% below the 90-day high, so there was no signal.
  - The next signal came on 2023-09-21, at 50.94 (+30.8%).
  - The baseline bought on 01-04 at 38.95 and held until 08-09, for +$28,006.

**C: close above SMA10**

- **C1. VGT_2005_2015, 2006-06-07 exit.** Closes stayed below SMA10 from 06-08 to 06-14; for example, 06-14 closed at 4.8612 against an SMA10 of 4.9866. On 06-15, the close of 4.9938 was above the SMA10 of 4.9673, so it latched and entered. The fill and outcome are as in B1.
- **C2. QQQ_1999_2015.** The losing exit was 2000-04-14 (−$20,200), at a close of 68.1420.
  - 04-17: +11.52% to 75.9890, still below the SMA10 of 81.3101. Blocked.
  - 04-18 (78.0035 vs 80.4680), 04-19, 04-20 and 04-24 (71.8481 vs 76.3949): blocked.
  - 04-25: 76.6988, above the SMA10 of 75.5765. Latched; entry of 1,303.80 shares.
  - Exit: 05-10 at 71.5330 by the loss exit, for −$7,187.
  - The baseline bought 04-17 at 75.9890 (−$626).
- **C3. QQQ_1999_2015.** The losing exit was 2000-07-27 (−$3,860).
  - Six sessions were blocked, from 07-28 (73.6562 vs 81.4740) to 08-04 (76.4041 vs 77.1568).
  - 08-07: 78.2112, above the SMA10 of 76.9241. Entry.
  - Exit: 09-08 at 80.7498 by the trailing stop, for +$2,281.
  - The baseline bought 07-28 at 73.6562 and made +$8,365.

**D: +3% from the post-exit low**

- **D1. VGT_2005_2015.** The losing exit was 2006-07-03 (−$258).
  - 17 signal sessions were blocked. The close/low ratio stayed below 1.03; it reached 1.0199 on 07-19 and 1.0249 on 07-26, and the low was reset to 4.6357 on 07-21.
  - 07-28: 4.8209 / 4.6357 = 1.0399. Latched; entry of 20,743.19 shares at 4.8209, 3.0% *below* the first-signal close.
  - Result: −$423.34. This is the same trade the baseline made on 07-28.
- **D2. QQQ_1999_2015.** The losing exit was 2000-05-03 (−$626), at a close of 75.5561.
  - 05-05: ratio 1.0260, below 1.03. Blocked.
  - 05-08 to 05-10: new lows, down to 67.6163.
  - 05-11: 71.7405 / 67.6163 = 1.0610. Entry.
  - Exit: 05-26 at 65.9207 by the loss exit, for −$8,564.
  - The baseline bought 05-04 at 75.7160 (−$6,672).
- **D3. QQQ_1999_2015.** The losing exit was 2000-07-28 (−$6,860), at a close of 73.6562.
  - 07-31: ratio 1.0296, just short of 1.03. Blocked.
  - 08-02: new low of 73.5007.
  - 08-03: 76.6811 / 73.5007 = 1.0433. Entry.
  - Exit: 09-08 at 80.7498 by the trailing stop, for +$4,221.
  - The baseline bought 07-28 at 73.6562 (+$8,365).
- **D4. VGT_2005_2015: confirmation buying a bear-market rally.** The losing exit was 2008-10-08 (−$20,604), at a close of 4.1822.
  - 10-09 (4.0767) and 10-10 (4.0372): signal Y, blocked.
  - 10-13: +10.97% to 4.4799, ratio 1.1097. Latched; entry of 22,321.83 shares at 4.4799.
  - Exit: 10-28 at 3.7732 by the loss exit, for −$16,228.
  - The baseline bought 10-09 at 4.0767, and its trailing stop gapped on 10-15 for +$3,866. That single blocked entry made a $20.1k difference.

---

## 3. Standard metrics (metrics.standard_metrics, sections A–C)

### VGT_2005_2015

| Metric | A | B | C | D |
|---|---:|---:|---:|---:|
| Net profit | 11,602 | 5,024 | -7,850 | -49,486 |
| Δ net vs A | 0 | -6,579 | -19,453 | -61,088 |
| Realized / unrealized | 5,872 / 5,731 | 5,024 / 0 | -7,850 / 0 | -49,486 / 0 |
| Margin interest | 71,575 | 68,290 | 64,855 | 59,008 |
| Closed trades (W/L) | 47 (13/34) | 37 (11/26) | 39 (8/31) | 40 (8/32) |
| Win rate | 28% | 30% | 21% | 20% |
| Avg win / avg loss | 7,751 / -2,791 | 6,776 / -2,673 | 10,658 / -3,004 | 8,868 / -3,764 |
| Largest win / loss | 21,725 / -20,604 | 18,174 / -20,604 | 25,190 / -18,755 | 16,571 / -20,604 |
| Max drawdown | 73,404 | 66,689 | 75,633 | 103,711 |
| Peak → trough | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-03-09 | 2007-07-19 → 2009-01-20 | 2007-07-19 → 2009-03-09 |
| Profit / max DD | 0.16 | 0.08 | -0.10 | -0.48 |
| Max consecutive losses | 6 | 5 | 12 | 9 |
| Lowest cumulative P&L | -49,713 | -31,999 | -51,080 | -78,619 |
| Fell below −$100k | False | False | False | False |
| Longest underwater (days) | 3002 (not recovered) | 3002 (not recovered) | 3002 (not recovered) | 3002 (not recovered) |
| Worst day | -8,276 (2008-09-29) | -8,276 (2008-09-29) | -7,918 (2008-09-29) | -8,276 (2008-09-29) |
| Avg borrowed (all sessions) | 61,340 | 58,383 | 55,651 | 50,449 |
| % sessions exposed | 61% | 58% | 56% | 50% |
| Margin dollar-days ($M·d) | 237.5 | 226.6 | 215.2 | 195.8 |
| Net per $1M dollar-days | 49 | 22 | -36 | -253 |

### QQQ_1999_2015

| Metric | A | B | C | D |
|---|---:|---:|---:|---:|
| Net profit | -2,886 | -57,975 | -120,547 | -80,458 |
| Δ net vs A | 0 | -55,089 | -117,662 | -77,573 |
| Realized / unrealized | -12,257 / 9,371 | -64,977 / 7,002 | -120,547 / 0 | -80,458 / 0 |
| Margin interest | 124,858 | 108,764 | 97,312 | 97,192 |
| Closed trades (W/L) | 108 (38/70) | 88 (28/60) | 88 (25/63) | 89 (30/59) |
| Win rate | 35% | 32% | 28% | 34% |
| Avg win / avg loss | 8,971 / -5,045 | 7,730 / -4,690 | 9,050 / -5,505 | 7,600 / -5,228 |
| Largest win / loss | 57,832 / -21,715 | 45,745 / -21,234 | 48,064 / -20,200 | 40,770 / -20,200 |
| Max drawdown | 149,561 | 176,975 | 222,137 | 194,407 |
| Peak → trough | 2000-03-27 → 2002-09-30 | 2000-03-27 → 2003-03-31 | 2000-03-27 → 2008-12-01 | 2000-03-27 → 2009-03-09 |
| Profit / max DD | -0.02 | -0.33 | -0.54 | -0.41 |
| Max consecutive losses | 8 | 10 | 8 | 9 |
| Lowest cumulative P&L | -102,735 | -130,149 | -175,311 | -147,581 |
| Fell below −$100k | True | True | True | True |
| Longest underwater (days) | 5757 (not recovered) | 5757 (not recovered) | 5757 (not recovered) | 5757 (not recovered) |
| Worst day | -9,288 (2001-04-20) | -8,707 (2001-04-20) | -8,707 (2001-04-20) | -9,350 (2001-04-20) |
| Avg borrowed (all sessions) | 67,620 | 58,780 | 52,730 | 52,399 |
| % sessions exposed | 68% | 59% | 53% | 52% |
| Margin dollar-days ($M·d) | 414.3 | 360.9 | 322.9 | 322.5 |
| Net per $1M dollar-days | -7 | -161 | -373 | -249 |

### VGT_2016_2026

| Metric | A | B | C | D |
|---|---:|---:|---:|---:|
| Net profit | 161,772 | 104,522 | 84,228 | 108,987 |
| Δ net vs A | 0 | -57,251 | -77,544 | -52,786 |
| Realized / unrealized | 161,772 / 0 | 104,522 / 0 | 84,228 / 0 | 96,291 / 12,696 |
| Margin interest | 73,233 | 60,153 | 59,279 | 57,592 |
| Closed trades (W/L) | 45 (17/28) | 36 (13/23) | 39 (11/28) | 37 (12/25) |
| Win rate | 38% | 36% | 28% | 32% |
| Avg win / avg loss | 14,622 / -3,100 | 13,617 / -3,152 | 15,937 / -3,253 | 14,806 / -3,255 |
| Largest win / loss | 50,533 / -11,151 | 48,491 / -13,561 | 48,537 / -11,151 | 38,445 / -13,561 |
| Max drawdown | 38,323 | 34,363 | 63,748 | 43,444 |
| Peak → trough | 2021-04-15 → 2022-10-14 | 2024-12-16 → 2025-04-21 | 2020-09-02 → 2022-12-07 | 2021-04-15 → 2022-12-07 |
| Profit / max DD | 4.22 | 3.04 | 1.32 | 2.51 |
| Max consecutive losses | 4 | 6 | 8 | 6 |
| Lowest cumulative P&L | -7,070 | -1,978 | 0 | 0 |
| Fell below −$100k | False | False | False | False |
| Longest underwater (days) | 790 | 1153 | 1384 | 1656 |
| Worst day | -13,421 (2020-03-16) | -9,819 (2020-09-03) | -9,824 (2020-09-03) | -13,577 (2020-03-16) |
| Avg borrowed (all sessions) | 66,640 | 54,857 | 53,941 | 52,588 |
| % sessions exposed | 67% | 55% | 54% | 53% |
| Margin dollar-days ($M·d) | 243.0 | 199.6 | 196.7 | 191.1 |
| Net per $1M dollar-days | 666 | 524 | 428 | 570 |

### QQQ_2016_2026

| Metric | A | B | C | D |
|---|---:|---:|---:|---:|
| Net profit | 116,388 | 97,758 | 86,311 | 81,063 |
| Δ net vs A | 0 | -18,630 | -30,077 | -35,326 |
| Realized / unrealized | 103,991 / 12,398 | 85,361 / 12,398 | 73,913 / 12,398 | 68,665 / 12,398 |
| Margin interest | 62,595 | 58,616 | 55,392 | 57,923 |
| Closed trades (W/L) | 35 (15/20) | 31 (13/18) | 31 (11/20) | 32 (13/19) |
| Win rate | 43% | 42% | 35% | 41% |
| Avg win / avg loss | 12,128 / -3,896 | 12,356 / -4,182 | 12,912 / -3,406 | 10,908 / -3,849 |
| Largest win / loss | 52,700 / -10,297 | 47,353 / -13,510 | 47,353 / -12,682 | 37,809 / -13,510 |
| Max drawdown | 39,237 | 58,362 | 53,173 | 59,020 |
| Peak → trough | 2021-09-07 → 2022-12-28 | 2021-09-07 → 2022-12-28 | 2021-09-07 → 2022-12-07 | 2021-09-07 → 2022-12-07 |
| Profit / max DD | 2.97 | 1.68 | 1.62 | 1.37 |
| Max consecutive losses | 4 | 7 | 7 | 5 |
| Lowest cumulative P&L | -8,254 | 0 | 0 | 0 |
| Fell below −$100k | False | False | False | False |
| Longest underwater (days) | 1395 | 1702 | 1701 | 1722 |
| Worst day | -8,732 (2020-03-12) | -8,732 (2020-03-12) | -8,732 (2020-03-12) | -8,732 (2020-03-12) |
| Avg borrowed (all sessions) | 57,023 | 53,681 | 50,617 | 52,925 |
| % sessions exposed | 57% | 54% | 51% | 53% |
| Margin dollar-days ($M·d) | 207.7 | 194.5 | 183.8 | 192.2 |
| Net per $1M dollar-days | 560 | 503 | 470 | 422 |

Average borrowed while invested is $100,000 in every run, because the size is fixed. A "lowest cumulative P&L" of 0 means the variant never went below its starting level.

---

## 4. Matched-exposure control (metrics.matched_control)

The control is a complete baseline run at a fixed size X = $100k × (variant dollar-days ÷ baseline dollar-days).

| Dataset | Cfg | Exposure | Control size | Net | Ctrl net | Δ net | Max DD | Ctrl DD | Δ DD | P/DD | Ctrl P/DD | Δ P/DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 0.954 | 95,411 | 5,024 | 11,070 | -6,046 | 66,689 | 70,035 | -3,345 | 0.08 | 0.16 | -0.08 |
| VGT_2005_2015 | C | 0.906 | 90,611 | -7,850 | 10,513 | -18,363 | 75,633 | 66,511 | 9,122 | -0.10 | 0.16 | -0.26 |
| VGT_2005_2015 | D | 0.824 | 82,442 | -49,486 | 9,565 | -59,051 | 103,711 | 60,515 | 43,195 | -0.48 | 0.16 | -0.64 |
| QQQ_1999_2015 | B | 0.871 | 87,111 | -57,975 | -2,514 | -55,461 | 176,975 | 130,284 | 46,691 | -0.33 | -0.02 | -0.31 |
| QQQ_1999_2015 | C | 0.779 | 77,939 | -120,547 | -2,249 | -118,298 | 222,137 | 116,566 | 105,571 | -0.54 | -0.02 | -0.52 |
| QQQ_1999_2015 | D | 0.778 | 77,842 | -80,458 | -2,246 | -78,212 | 194,407 | 116,422 | 77,985 | -0.41 | -0.02 | -0.39 |
| VGT_2016_2026 | B | 0.821 | 82,140 | 104,522 | 132,880 | -28,358 | 34,363 | 31,479 | 2,884 | 3.04 | 4.22 | -1.18 |
| VGT_2016_2026 | C | 0.809 | 80,947 | 84,228 | 130,949 | -46,721 | 63,748 | 31,021 | 32,726 | 1.32 | 4.22 | -2.90 |
| VGT_2016_2026 | D | 0.786 | 78,642 | 108,987 | 127,221 | -18,234 | 43,444 | 30,138 | 13,306 | 2.51 | 4.22 | -1.71 |
| QQQ_2016_2026 | B | 0.936 | 93,645 | 97,758 | 108,992 | -11,233 | 58,362 | 36,743 | 21,619 | 1.68 | 2.97 | -1.29 |
| QQQ_2016_2026 | C | 0.885 | 88,493 | 86,311 | 102,996 | -16,684 | 53,173 | 34,722 | 18,451 | 1.62 | 2.97 | -1.34 |
| QQQ_2016_2026 | D | 0.925 | 92,537 | 81,063 | 107,703 | -26,640 | 59,020 | 36,308 | 22,711 | 1.37 | 2.97 | -1.59 |

**Calculation.** The rules reduce exposure by 5–22%. Simply holding the baseline at that smaller size would have done better in every case:
- **Profit:** higher by $6.0k–$118.3k.
- **Profit/DD:** higher in all 12 cases.
- **Drawdown:** lower in 11 of 12 cases.

The single drawdown win is VGT_2005_2015 B, at −$3.3k against its control, but that comes with $6.0k less profit and a profit/DD of 0.08 against 0.16. None of the variants improves risk-adjusted results beyond what simple deleveraging gives.

---

## 5. Bear markets (calendar windows)

| Dataset | Window | Cfg | Period P&L | Δ vs A | Max DD in window | Δ DD vs A | Interest | Closed | Losing | Largest loss | Avg borrowed |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2007-2009 | A | -38,496 | 0 | 73,404 | 0 | 21,879 | 23 | 16 | -20,604 | 66,005 |
| VGT_2005_2015 | 2007-2009 | B | -30,692 | 7,804 | 66,689 | -6,714 | 20,523 | 17 | 12 | -20,604 | 61,640 |
| VGT_2005_2015 | 2007-2009 | C | -36,563 | 1,933 | 75,633 | 2,229 | 20,312 | 17 | 14 | -18,755 | 61,376 |
| VGT_2005_2015 | 2007-2009 | D | -66,980 | -28,484 | 103,711 | 30,307 | 20,132 | 20 | 16 | -20,604 | 60,714 |
| QQQ_1999_2015 | 2000-2002 | A | -91,629 | 0 | 149,561 | 0 | 28,630 | 56 | 36 | -20,200 | 87,899 |
| QQQ_1999_2015 | 2000-2002 | B | -127,709 | -36,080 | 174,632 | 25,071 | 22,784 | 45 | 29 | -21,234 | 69,016 |
| QQQ_1999_2015 | 2000-2002 | C | -156,685 | -65,057 | 213,494 | 63,933 | 24,351 | 45 | 30 | -20,200 | 75,133 |
| QQQ_1999_2015 | 2000-2002 | D | -116,735 | -25,107 | 163,825 | 14,264 | 24,592 | 47 | 31 | -20,200 | 75,000 |
| QQQ_1999_2015 | 2007-2009 | A | 20,931 | 0 | 70,759 | 0 | 32,066 | 21 | 15 | -21,715 | 96,825 |
| QQQ_1999_2015 | 2007-2009 | B | 37,760 | 16,829 | 46,878 | -23,881 | 29,595 | 15 | 11 | -7,952 | 89,418 |
| QQQ_1999_2015 | 2007-2009 | C | 8,781 | -12,151 | 74,973 | 4,214 | 29,414 | 15 | 11 | -18,321 | 89,021 |
| QQQ_1999_2015 | 2007-2009 | D | 11,388 | -9,543 | 65,730 | -5,029 | 23,115 | 14 | 10 | -15,963 | 69,841 |
| VGT_2016_2026 | 2022 | A | -23,643 | 0 | 34,856 | 0 | 9,644 | 13 | 10 | -11,151 | 90,438 |
| VGT_2016_2026 | 2022 | B | -19,939 | 3,704 | 26,150 | -8,706 | 7,715 | 11 | 9 | -9,310 | 72,908 |
| VGT_2016_2026 | 2022 | C | -48,907 | -25,264 | 52,944 | 18,087 | 8,047 | 14 | 13 | -11,151 | 72,908 |
| VGT_2016_2026 | 2022 | D | -31,607 | -7,964 | 36,296 | 1,439 | 7,142 | 12 | 11 | -11,151 | 66,135 |
| QQQ_2016_2026 | 2022 | A | -26,320 | 0 | 33,932 | 0 | 9,764 | 13 | 10 | -10,297 | 90,438 |
| QQQ_2016_2026 | 2022 | B | -45,445 | -19,125 | 47,803 | 13,872 | 7,926 | 12 | 10 | -13,510 | 74,900 |
| QQQ_2016_2026 | 2022 | C | -42,114 | -15,795 | 42,615 | 8,683 | 7,504 | 13 | 12 | -12,682 | 68,526 |
| QQQ_2016_2026 | 2022 | D | -47,961 | -21,641 | 48,462 | 14,530 | 7,444 | 13 | 11 | -13,510 | 68,924 |

**Calculation.** The rules should help most in bear markets, but they did not do so consistently. Of the 15 config × bear-window cells, period P&L improved in 4 and within-window drawdown improved in 4:
- **Improved:**
  - VGT 2007–09 B (P&L and DD) and C (P&L only);
  - QQQ 2007–09 B (P&L and DD) and D (DD only);
  - VGT 2022 B (P&L and DD).
- **Worse:** QQQ 2000–02 (the deepest bear in the data) and QQQ 2022, for every config.

Interest and average borrowing fall in every bear window, so the variants were less invested. Even so, they lost more in 11 of the 15 cells.

---

## 6. Recovery windows: absolute P&L and P&L relative to the baseline

| Dataset | Window | Cfg | Period P&L | Δ vs A | P&L of trades entered (n) | Max DD in window | Avg borrowed |
|---|---|---|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2009 | A | 15,518 | 0 | 21,725 (1) | 10,278 | 41,315 |
| VGT_2005_2015 | 2009 | B | 15,832 | 314 | 14,473 (1) | 9,714 | 39,906 |
| VGT_2005_2015 | 2009 | C | 25,190 | 9,673 | 25,190 (1) | 10,542 | 38,967 |
| VGT_2005_2015 | 2009 | D | 17,930 | 2,412 | 16,571 (1) | 9,875 | 40,376 |
| QQQ_1999_2015 | 2003 | A | 18,291 | 0 | 15,116 (3) | 13,900 | 57,540 |
| QQQ_1999_2015 | 2003 | B | 3,055 | -15,236 | 3,055 (5) | 16,996 | 50,000 |
| QQQ_1999_2015 | 2003 | C | 12,646 | -5,644 | 12,646 (4) | 9,287 | 46,429 |
| QQQ_1999_2015 | 2003 | D | 9,767 | -8,524 | 9,767 (4) | 11,454 | 46,032 |
| QQQ_1999_2015 | 2009 | A | 66,522 | 0 | 57,832 (1) | 10,133 | 99,531 |
| QQQ_1999_2015 | 2009 | B | 56,925 | -9,596 | 45,745 (1) | 9,460 | 96,714 |
| QQQ_1999_2015 | 2009 | C | 59,400 | -7,122 | 48,064 (1) | 9,591 | 97,183 |
| QQQ_1999_2015 | 2009 | D | 51,515 | -15,006 | 40,770 (1) | 9,183 | 99,531 |
| VGT_2016_2026 | 2020 | A | 48,081 | 0 | 59,322 (5) | 21,530 | 97,537 |
| VGT_2016_2026 | 2020 | B | 61,933 | 13,853 | 59,745 (3) | 15,717 | 84,236 |
| VGT_2016_2026 | 2020 | C | 45,924 | -2,157 | 45,924 (3) | 14,850 | 73,892 |
| VGT_2016_2026 | 2020 | D | 46,893 | -1,187 | 49,699 (3) | 15,853 | 85,222 |
| VGT_2016_2026 | 2023 | A | 44,468 | 0 | 42,695 (3) | 14,494 | 83,600 |
| VGT_2016_2026 | 2023 | B | 16,462 | -28,006 | 14,689 (2) | 4,219 | 24,000 |
| VGT_2016_2026 | 2023 | C | 42,756 | -1,712 | 41,781 (3) | 14,417 | 82,800 |
| VGT_2016_2026 | 2023 | D | 14,711 | -29,758 | 13,709 (2) | 1,957 | 20,800 |
| VGT_2016_2026 | 2025 | A | 39,671 | 0 | 36,838 (3) | 13,922 | 96,842 |
| VGT_2016_2026 | 2025 | B | 31,266 | -8,405 | 32,715 (2) | 15,580 | 95,789 |
| VGT_2016_2026 | 2025 | C | 27,534 | -12,137 | 24,701 (3) | 13,229 | 95,263 |
| VGT_2016_2026 | 2025 | D | 20,382 | -19,289 | 21,831 (3) | 17,484 | 94,737 |
| QQQ_2016_2026 | 2020 | A | 63,718 | 0 | 61,124 (5) | 17,767 | 98,030 |
| QQQ_2016_2026 | 2020 | B | 57,690 | -6,028 | 55,104 (3) | 17,226 | 84,729 |
| QQQ_2016_2026 | 2020 | C | 43,430 | -20,288 | 43,430 (3) | 17,303 | 74,384 |
| QQQ_2016_2026 | 2020 | D | 47,592 | -16,125 | 45,006 (4) | 16,388 | 86,207 |
| QQQ_2016_2026 | 2023 | A | 25,111 | 0 | 22,266 (2) | 9,550 | 33,600 |
| QQQ_2016_2026 | 2023 | B | 23,335 | -1,776 | 20,490 (2) | 9,395 | 32,400 |
| QQQ_2016_2026 | 2023 | C | 23,177 | -1,934 | 21,090 (2) | 9,451 | 32,800 |
| QQQ_2016_2026 | 2023 | D | 23,177 | -1,934 | 21,090 (2) | 9,451 | 32,800 |
| QQQ_2016_2026 | 2025 | A | 19,964 | 0 | 19,964 (2) | 12,893 | 84,737 |
| QQQ_2016_2026 | 2025 | B | 16,029 | -3,935 | 16,029 (2) | 12,801 | 83,158 |
| QQQ_2016_2026 | 2025 | C | 15,222 | -4,742 | 15,222 (2) | 11,185 | 81,579 |
| QQQ_2016_2026 | 2025 | D | 13,055 | -6,909 | 13,055 (2) | 10,985 | 79,474 |

**Calculation.** Recovery-window P&L is lower than the baseline in 23 of 27 config × window cells. The four exceptions are VGT 2009 B/C/D and VGT 2020 B; section 7.6 explains them trade by trade. The two largest shortfalls are VGT 2023 B (−$28.0k) and D (−$29.8k): those variants were flat almost all year (average borrowed $24k and $21k against $84k).

---

## 7. Experiment-specific questions

### How variant trades are matched to baseline trades

The code is in `analysis.py`, and the per-trade tables are `results/matching/<dataset>__<config>.csv`.

1. **Entry matching** (used for Q1 and the counts in Q2–Q3). With fixed size and no other hooks, a trade's whole outcome depends only on its entry session. A variant trade that enters on a baseline entry session is therefore the identical trade (asserted).
   - Each baseline trade k occupies the span [entry_k, exit_k]. Spans are disjoint, and the price-only 10% signal makes the baseline enter on every flat, non-exit session. So every variant entry lies inside exactly one baseline span (asserted).
   - Each baseline trade is classified as:
     - **identical:** the variant entered the same session;
     - **later entry:** the variant's first entry in the span is later;
     - **no entry:** the variant made no entry inside the span.
   - The variant's state at the baseline entry session gives the reason:
     - **blocked:** flat with the signal, but the latch was unsatisfied (the direct effect of the rule);
     - **holding:** still in an earlier, divergent position (an indirect effect);
     - **exited:** it exited that session (an indirect effect).
2. **P&L comparison by time window** (used for every P&L comparison in Q2–Q6 and section 8). Attributing a whole variant trade to one baseline trade produces offsetting artifacts when one variant trade spans several baseline trades. In VGT 2020 B, for example, it shows +$49k on one span and −$51k on the next.
   - Instead, for each baseline trade we compare its P&L, which equals the baseline's mark-to-market change over [entry_k, exit_k] (asserted), with the variant's mark-to-market change over the same window, whatever positions it held. We also record **coverage**: the share of the baseline trade's sessions at which the variant was also invested.
   - The remainder is the variant's P&L while the baseline was flat. Exactly: variant net − baseline net = Σ_k (variant window P&L_k − baseline P&L_k) + variant P&L while the baseline was flat (asserted).
3. **First-order (shadow) check.** On the *baseline's own* path, would the rule have confirmed each post-loss baseline entry by that entry's close? This isolates the rule's selectivity from path divergence.

### 7.0 Where the net difference comes from

| Dataset | Cfg | Net Δ vs A | Δ during baseline winners | Δ during baseline losers (closed) | Variant P&L while baseline flat |
|---|---|---:|---:|---:|---:|
| VGT_2005_2015 | B | -6,579 | -24,135 | -811 | 18,367 |
| VGT_2005_2015 | C | -19,453 | -29,161 | 3,618 | 6,090 |
| VGT_2005_2015 | D | -61,088 | -46,299 | -20,236 | 5,447 |
| QQQ_1999_2015 | B | -55,089 | -128,576 | 79,080 | -5,594 |
| QQQ_1999_2015 | C | -117,662 | -120,927 | 23,190 | -19,924 |
| QQQ_1999_2015 | D | -77,573 | -118,019 | 50,559 | -10,112 |
| VGT_2016_2026 | B | -57,251 | -70,007 | 18,237 | -5,481 |
| VGT_2016_2026 | C | -77,544 | -82,887 | 15,186 | -9,843 |
| VGT_2016_2026 | D | -52,786 | -73,504 | 13,734 | 6,984 |
| QQQ_2016_2026 | B | -18,630 | -23,039 | 12,682 | -8,273 |
| QQQ_2016_2026 | C | -30,077 | -45,204 | 19,526 | -4,400 |
| QQQ_2016_2026 | D | -35,326 | -38,741 | 11,084 | -7,669 |

During baseline losing trades, the variants lose less in 10 of 12 cases. During baseline winning trades, they earn less in all 12, by more than they saved.

### Q1. Entries delayed or eliminated relative to the baseline

Confirmation events on the variant's own path:

| Dataset | Cfg | Losing exits | Sessions exit→confirm (mean/med/max) | Losing exits whose first signal was blocked | Blocked signal sessions | Mean sessions first signal→entry (blocked events) | Median entry close vs first-signal close | Of blocked: entered on the confirming session / signal lapsed | Lapsed: median / max sessions to entry |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 26 | 5.2 / 5 / 17 | 23 | 98 | 4.5 | +1.0% | 20 / 3 | 6.5 / 7 |
| VGT_2005_2015 | C | 31 | 4.0 / 3 / 14 | 23 | 87 | 8.3 | +1.4% | 17 / 6 | 10 / 71 |
| VGT_2005_2015 | D | 32 | 5.4 / 3 / 26 | 29 | 102 | 32.2 | +1.9% | 21 / 8 | 21 / 666 |
| QQQ_1999_2015 | B | 60 | 5.7 / 5 / 15 | 55 | 265 | 7.1 | +0.9% | 51 / 4 | 6.5 / 120 |
| QQQ_1999_2015 | C | 63 | 4.8 / 4 / 18 | 42 | 223 | 11.5 | +1.3% | 35 / 7 | 14 / 120 |
| QQQ_1999_2015 | D | 59 | 5.4 / 4 / 19 | 46 | 252 | 9.0 | +1.1% | 40 / 6 | 6 / 109 |
| VGT_2016_2026 | B | 23 | 5.1 / 4 / 13 | 19 | 80 | 17.7 | +1.2% | 13 / 6 | 16.5 / 179 |
| VGT_2016_2026 | C | 28 | 4.1 / 2 / 14 | 16 | 80 | 20.9 | +3.2% | 12 / 4 | 68.5 / 121 |
| VGT_2016_2026 | D | 25 | 6.2 / 5 / 18 | 21 | 108 | 20.8 | +1.6% | 15 / 6 | 16.5 / 190 |
| QQQ_2016_2026 | B | 18 | 4.7 / 3 / 16 | 17 | 66 | 5.2 | +1.2% | 16 / 1 | 23 / 23 |
| QQQ_2016_2026 | C | 20 | 5.5 / 4 / 15 | 14 | 89 | 12.2 | +2.7% | 13 / 1 | 84 / 84 |
| QQQ_2016_2026 | D | 19 | 5.5 / 4 / 15 | 16 | 84 | 6.6 | +1.3% | 15 / 1 | 23 / 23 |

**Signal lapsed** means the 10% signal had disappeared by the time the latch was satisfied, so the entry waited for a new 10% dip. Every losing exit was eventually confirmed. At most one per run remained without a re-entry at the end of the data, because no signal came.

Entry matching against the baseline's trades:

| Dataset | Cfg | Baseline trades | Identical | Later entry (blocked/holding/exited) | No entry (blocked/holding/exited) | Variant trades | Variant entries not on a baseline entry |
|---|---|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 48 | 16 | 20 (14/6/0) | 12 (2/10/0) | 37 | 21 |
| VGT_2005_2015 | C | 48 | 15 | 23 (10/12/1) | 10 (3/7/0) | 39 | 24 |
| VGT_2005_2015 | D | 48 | 16 | 23 (13/6/4) | 9 (4/5/0) | 40 | 24 |
| QQQ_1999_2015 | B | 109 | 35 | 51 (39/6/6) | 23 (3/19/1) | 89 | 54 |
| QQQ_1999_2015 | C | 109 | 37 | 48 (28/16/4) | 24 (6/16/2) | 88 | 51 |
| QQQ_1999_2015 | D | 109 | 41 | 47 (29/14/4) | 21 (5/14/2) | 89 | 48 |
| VGT_2016_2026 | B | 45 | 20 | 15 (13/2/0) | 10 (3/7/0) | 36 | 16 |
| VGT_2016_2026 | C | 45 | 23 | 13 (9/4/0) | 9 (7/2/0) | 39 | 16 |
| VGT_2016_2026 | D | 45 | 19 | 17 (12/5/0) | 9 (5/4/0) | 38 | 19 |
| QQQ_2016_2026 | B | 36 | 16 | 15 (12/2/1) | 5 (1/4/0) | 32 | 16 |
| QQQ_2016_2026 | C | 36 | 16 | 14 (9/4/1) | 6 (4/2/0) | 32 | 16 |
| QQQ_2016_2026 | D | 36 | 17 | 14 (9/5/0) | 5 (2/3/0) | 33 | 16 |

The "baseline trades" count includes an open position at the end.

First-order check on the baseline path:

| Dataset | Cfg | Baseline entries after a loss | Would be blocked | Blocked losers (P&L) | Blocked winners (P&L) | Allowed losers | Allowed winners |
|---|---|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 34 | 30 | 19 (-42,811) | 11 (80,458) | 4 | 0 |
| VGT_2005_2015 | C | 34 | 21 | 12 (-16,497) | 9 (46,440) | 11 | 2 |
| VGT_2005_2015 | D | 34 | 29 | 19 (-43,299) | 10 (75,840) | 4 | 1 |
| QQQ_1999_2015 | B | 70 | 66 | 43 (-253,094) | 23 (244,951) | 3 | 1 |
| QQQ_1999_2015 | C | 70 | 55 | 34 (-195,091) | 21 (229,152) | 12 | 3 |
| QQQ_1999_2015 | D | 70 | 60 | 39 (-210,758) | 21 (224,958) | 7 | 3 |
| VGT_2016_2026 | B | 27 | 24 | 14 (-54,098) | 10 (162,585) | 2 | 1 |
| VGT_2016_2026 | C | 27 | 19 | 9 (-29,357) | 10 (162,585) | 7 | 1 |
| VGT_2016_2026 | D | 27 | 22 | 12 (-40,806) | 10 (160,651) | 4 | 1 |
| QQQ_2016_2026 | B | 20 | 19 | 11 (-49,291) | 8 (71,920) | 1 | 0 |
| QQQ_2016_2026 | C | 20 | 15 | 8 (-39,215) | 7 (46,496) | 4 | 1 |
| QQQ_2016_2026 | D | 20 | 17 | 10 (-38,994) | 7 (60,918) | 2 | 1 |

**Answer.**
- **The first post-loss signal is usually blocked.** It is blocked in 57–94% of the variants' losing exits. The median confirmation arrives 2–5 sessions after the exit.
- **Few baseline entries are kept intact.** Only 31–51% of the baseline's trades survive as identical trades. Most of the rest are entered later, on average 3–6 sessions later and at a median close 0.9–3.2% higher. 5–24 per run are eliminated. In 9 of 12 runs, most eliminations come from a divergent earlier position ("holding") rather than a direct block.
- **Why so many entries are blocked.** The baseline re-enters on the session right after a losing exit in 136 of 151 post-loss cases (90%), while the 10% signal is still on.
  - B can never confirm that early (the earliest is x+2), so it blocks 88–95% of post-loss baseline entries.
  - C and D confirm on x+1 only after a strong close, so they block 62–86%.
- **Signal lapses.** In 1–8 events per run, the latch was satisfied only after the 10% signal had lapsed, so the entry slipped by weeks or months. Across the 12 runs, 9 such lapses ended in an entry more than 10% above the first blocked close.

### Q2. Repeated losing trades avoided

A repeated loser is a closed baseline loser whose previous baseline trade also lost.

| Dataset | Cfg | n | Eliminated | Later | Identical | Baseline P&L | Variant P&L in same windows | Δ | Variant flat throughout | Mean coverage |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 23 | 5 | 14 | 4 | -59,751 | -62,285 | -2,534 | 0 | 75% |
| VGT_2005_2015 | C | 23 | 2 | 16 | 5 | -59,751 | -65,283 | -5,532 | 2 | 75% |
| VGT_2005_2015 | D | 23 | 6 | 13 | 4 | -59,751 | -71,127 | -11,376 | 3 | 67% |
| QQQ_1999_2015 | B | 46 | 15 | 27 | 4 | -256,807 | -186,773 | 70,034 | 2 | 67% |
| QQQ_1999_2015 | C | 46 | 10 | 30 | 6 | -256,807 | -236,566 | 20,241 | 3 | 67% |
| QQQ_1999_2015 | D | 46 | 12 | 28 | 6 | -256,807 | -218,771 | 38,036 | 3 | 65% |
| VGT_2016_2026 | B | 16 | 5 | 9 | 2 | -55,243 | -36,348 | 18,895 | 2 | 54% |
| VGT_2016_2026 | C | 16 | 3 | 6 | 7 | -55,243 | -45,938 | 9,305 | 2 | 73% |
| VGT_2016_2026 | D | 16 | 3 | 10 | 3 | -55,243 | -47,390 | 7,852 | 2 | 56% |
| QQQ_2016_2026 | B | 12 | 3 | 7 | 2 | -52,065 | -37,617 | 14,447 | 0 | 61% |
| QQQ_2016_2026 | C | 12 | 2 | 7 | 3 | -52,065 | -40,466 | 11,599 | 1 | 68% |
| QQQ_2016_2026 | D | 12 | 2 | 8 | 2 | -52,065 | -41,840 | 10,225 | 1 | 53% |

The "eliminated" column counts entries the variant never made inside that baseline trade's span. It can still hold a position over part of that window, from an earlier entry. "Flat throughout" counts the windows in which the variant held no position at all.

**Answer.**
- **Losses are reduced, but rarely avoided outright.** Over the windows of repeated losers, the variant lost less in 9 of 12 cases: by $7.9k–$70.0k, and most for QQQ_1999_2015 B. But the variant was completely out of the market for only 0–3 such losers per run, and its mean coverage of their windows stayed at 53–75%.
- **The losses usually happen anyway, at a different price.** In most cases the variant entered a few sessions later, at a slightly higher price, during the same decline.
- **VGT_2005_2015 is worse with every rule.** The variants lost $2.5k–$11.4k *more* than the baseline during these windows. Case D4 is the extreme example: buying the 2008-10-13 rally day turned a +$3.9k baseline trade into −$16.2k.

### Q3. Profitable rebound entries delayed or missed

A rebound winner is a baseline winner entered right after a baseline loss.

| Dataset | Cfg | n | Eliminated | Later | Identical | Baseline P&L | Variant P&L in same windows | Δ | Variant flat throughout | Mean coverage |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 11 | 6 | 5 | 0 | 80,458 | 56,323 | -24,135 | 2 | 77% |
| VGT_2005_2015 | C | 11 | 6 | 5 | 0 | 80,458 | 51,297 | -29,161 | 2 | 68% |
| VGT_2005_2015 | D | 11 | 2 | 8 | 1 | 80,458 | 34,159 | -46,299 | 1 | 65% |
| QQQ_1999_2015 | B | 24 | 5 | 18 | 1 | 249,946 | 143,676 | -106,270 | 2 | 77% |
| QQQ_1999_2015 | C | 24 | 6 | 16 | 2 | 249,946 | 143,854 | -106,092 | 2 | 76% |
| QQQ_1999_2015 | D | 24 | 6 | 16 | 2 | 249,946 | 137,416 | -112,530 | 2 | 79% |
| VGT_2016_2026 | B | 11 | 5 | 4 | 2 | 177,778 | 108,677 | -69,100 | 2 | 75% |
| VGT_2016_2026 | C | 11 | 4 | 6 | 1 | 177,778 | 101,195 | -76,583 | 3 | 62% |
| VGT_2016_2026 | D | 11 | 4 | 6 | 1 | 177,778 | 113,449 | -64,329 | 2 | 75% |
| QQQ_2016_2026 | B | 8 | 2 | 6 | 0 | 71,920 | 54,229 | -17,691 | 1 | 84% |
| QQQ_2016_2026 | C | 8 | 2 | 6 | 0 | 71,920 | 32,063 | -39,856 | 2 | 68% |
| QQQ_2016_2026 | D | 8 | 2 | 5 | 1 | 71,920 | 46,116 | -25,803 | 0 | 89% |

**Answer.**
- **Almost every rebound winner is delayed or missed.** Only 0–2 per run are taken as identical trades. Over the rebound winners' windows, the variants captured 42–75% of the baseline's profit and gave up $17.7k–$112.5k.
- **Rebound winners were missed entirely.** The variant was completely out of the market for 0–3 per run. The largest such misses are both signal lapses after a near-zero loss, in VGT_2016_2026:
  - 2023-01-04 → 08-09 (+$28.0k), missed by B and D;
  - 2026-03-26 → 06-05 (+$31.1k), missed by B and C.
- **The same pattern holds over all baseline winners.** The variants earned $23.0k–$128.6k less (see section 7.0).

### Q4. Profit sacrificed by entering later

These are baseline trades the variant entered later *because the latch blocked* the baseline's entry session.

| Dataset | Cfg | n | Mean delay (sessions) | Median entry-price premium | Winners: baseline → variant | Losers: baseline → variant | Net Δ |
|---|---|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | B | 14 | 4.07 | +1.4% | 3: 4,936 → 2,037 | 11: -21,053 → -24,378 | -6,224 |
| VGT_2005_2015 | C | 10 | 4.50 | +2.9% | 3: 25,760 → 9,240 | 7: -13,589 → -17,210 | -20,142 |
| VGT_2005_2015 | D | 13 | 2.85 | +3.1% | 5: 39,376 → 9,850 | 8: -26,760 → -34,532 | -37,298 |
| QQQ_1999_2015 | B | 39 | 3.33 | +2.2% | 17: 197,763 → 115,381 | 22: -100,104 → -113,846 | -96,124 |
| QQQ_1999_2015 | C | 28 | 4.61 | +2.2% | 12: 133,791 → 65,139 | 16: -50,789 → -76,851 | -94,715 |
| QQQ_1999_2015 | D | 29 | 4.76 | +1.5% | 9: 65,736 → 26,235 | 20: -75,126 → -94,342 | -58,718 |
| VGT_2016_2026 | B | 13 | 5.62 | +1.0% | 5: 70,068 → 59,297 | 8: -28,334 → -27,364 | -9,800 |
| VGT_2016_2026 | C | 9 | 3.22 | +2.8% | 4: 51,534 → 35,128 | 5: -5,570 → -16,336 | -27,172 |
| VGT_2016_2026 | D | 12 | 6.42 | +1.4% | 4: 105,820 → 84,280 | 8: -18,597 → -35,114 | -38,057 |
| QQQ_2016_2026 | B | 12 | 5.42 | +0.9% | 5: 82,202 → 68,589 | 7: -31,989 → -25,800 | -7,424 |
| QQQ_2016_2026 | C | 9 | 4.00 | +1.2% | 4: 80,277 → 64,921 | 5: -20,059 → -24,387 | -19,684 |
| QQQ_2016_2026 | D | 9 | 6.33 | +1.2% | 3: 16,710 → 3,802 | 6: -18,566 → -19,967 | -14,309 |

**Answer.**
- **Delayed entries cost money in every run:** −$6.2k to −$96.1k.
- **Delays hurt in two ways.** The price premium (median +0.9% to +3.1%) cuts the profit on winners. In 10 of 12 runs, the variant also lost *more* than the baseline over the windows of losers it entered late. A higher entry makes it more likely that the price is below cost 15 days later, which triggers the loss exit.
- **The delay rarely helps.** The only runs where late entry into losers helped were VGT_2016_2026 B and QQQ_2016_2026 B.

### Q5. Maximum cumulative drawdown and bear-market performance

| Dataset | A | B (Δ) | C (Δ) | D (Δ) |
|---|---:|---:|---:|---:|
| VGT_2005_2015 | 73,404 | 66,689 (−6,715) | 75,633 (+2,229) | 103,711 (+30,307) |
| QQQ_1999_2015 | 149,561 | 176,975 (+27,414) | 222,137 (+72,576) | 194,407 (+44,846) |
| VGT_2016_2026 | 38,323 | 34,363 (−3,960) | 63,748 (+25,425) | 43,444 (+5,121) |
| QQQ_2016_2026 | 39,237 | 58,362 (+19,125) | 53,173 (+13,936) | 59,020 (+19,783) |

**Answer.**
- **Max drawdown improved in only 2 of 12 runs:** B on VGT_2005_2015 and B on VGT_2016_2026.
  - Against the matched controls, only VGT_2005_2015 B is better, by $3.3k.
  - For VGT_2016_2026 B, the baseline's worst period (2021–22) is milder: the 2022 window DD is $26.2k vs $34.9k, mostly from the smaller loss on the 2022-04-28 trade (−$2.3k vs −$11.2k). B's own max DD ($34.4k) falls in Dec 2024 – Apr 2025 instead.
- **The worst cumulative low gets deeper on QQQ_1999_2015.** The baseline's lowest point was −$102.7k; the variants reach −$130.1k (B), −$175.3k (C) and −$147.6k (D).
- **Bear windows: see section 5.** The variants do worse in the 2000–02 and QQQ 2022 bears. They help only in parts of 2007–09 and VGT 2022, and almost only with rule B.

### Q6. Recovery participation: 2003, Mar 2009, Apr 2020, Jan 2023, Apr 2025

The table lists each baseline trade held in a recovery window. Each cell gives three things:
- how the variant's entry matched the baseline trade;
- coverage, i.e. the share of the baseline trade's sessions at which the variant was invested;
- the variant's P&L over the baseline trade's window.

"same" means the identical trade, "late+k" means the variant's first entry came k sessions later, and "none" means no entry in that span. With "none", the variant can still be invested from an earlier entry.

**VGT_2005_2015**

| Window | Baseline trade | Baseline P&L | B | C | D |
|---|---|---:|---|---|---|
| 2009 | 2009-02-23 → 2009-03-10 | -4,883 | late+2, 82%, -3,225 | late+11, 0%, 0 | late+2, 82%, -3,225 |
| 2009 | 2009-03-11 → 2009-07-08 | 21,725 | late+5, 95%, 14,729 | none, 100%, 22,431 | late+4, 96%, 16,826 |

**QQQ_1999_2015**

| Window | Baseline trade | Baseline P&L | B | C | D |
|---|---|---:|---|---|---|
| 2003 | 2002-12-30 → 2003-01-17 | 2,051 | late+3, 77%, -1,892 | late+2, 85%, -801 | late+2, 85%, -801 |
| 2003 | 2003-01-21 → 2003-02-05 | -3,238 | late+6, 45%, -4,435 | none, 0%, 0 | none, 0%, 0 |
| 2003 | 2003-02-06 → 2003-03-05 | -64 | late+7, 89%, -5,523 | late+6, 67%, -982 | late+7, 61%, -3,861 |
| 2003 | 2003-03-06 → 2003-08-05 | 18,419 | late+5, 89%, 14,156 | late+5, 89%, 14,156 | late+5, 89%, 14,156 |
| 2009 | 2009-02-19 → 2009-03-06 | -7,907 | none, 0%, 0 | none, 0%, 0 | late+3, 82%, -9,999 |
| 2009 | 2009-03-09 → 2010-01-29 | 57,832 | late+2, 99%, 45,745 | late+1, 100%, 48,064 | late+3, 100%, 47,190 |

**VGT_2016_2026**

| Window | Baseline trade | Baseline P&L | B | C | D |
|---|---|---:|---|---|---|
| 2020 | 2020-03-17 → 2020-04-02 | -795 | late+6, 50%, 229 | late+5, 58%, 249 | none, 75%, 3,406 |
| 2020 | 2020-04-03 → 2020-09-04 | 50,533 | none, 100%, 49,903 | none, 100%, 49,931 | late+1, 99%, 38,445 |
| 2020 | 2020-09-08 → 2020-09-24 | -2,556 | same, 100%, -2,556 | same, 100%, -2,556 | same, 100%, -2,556 |
| 2020 | 2020-09-25 → 2020-10-28 | -58 | late+23, 0%, 0 | same, 100%, -58 | late+23, 0%, 0 |
| 2020 | 2020-10-29 → 2021-02-23 | 12,197 | none, 100%, 12,420 | none, 0%, 0 | none, 100%, 12,420 |
| 2023 | 2023-01-04 → 2023-08-09 | 28,006 | none, 0%, 0 | late+2, 99%, 27,092 | none, 0%, 0 |
| 2023 | 2023-09-21 → 2023-10-06 | -503 | same, 100%, -503 | same, 100%, -503 | same, 100%, -503 |
| 2023 | 2023-10-20 → 2024-04-18 | 15,193 | same, 100%, 15,193 | same, 100%, 15,193 | late+8, 93%, 14,212 |
| 2025 | 2025-03-19 → 2025-04-03 | -7,843 | late+3, 73%, -11,292 | same, 100%, -7,843 | late+3, 73%, -11,292 |
| 2025 | 2025-04-04 → 2025-04-10 | 3,216 | none, 50%, 3,487 | late+3, 25%, -4,529 | late+3, 75%, -1,042 |
| 2025 | 2025-04-11 → 2025-11-14 | 35,713 | late+1, 99%, 34,807 | late+9, 99%, 29,409 | late+13, 97%, 26,539 |
| 2025 | 2025-11-20 → 2026-02-05 | -2,092 | same, 100%, -2,092 | same, 100%, -2,092 | same, 100%, -2,092 |

**QQQ_2016_2026**

| Window | Baseline trade | Baseline P&L | B | C | D |
|---|---|---:|---|---|---|
| 2020 | 2020-03-16 → 2020-03-18 | 134 | none, 0%, 0 | none, 0%, 0 | late+1, 50%, -3,063 |
| 2020 | 2020-03-19 → 2020-09-04 | 52,700 | late+3, 97%, 47,353 | late+3, 97%, 47,353 | late+12, 98%, 39,762 |
| 2020 | 2020-09-08 → 2020-09-24 | -3,443 | same, 100%, -3,443 | same, 100%, -3,443 | same, 100%, -3,443 |
| 2020 | 2020-09-25 → 2020-10-29 | -479 | late+23, 4%, 1,721 | same, 100%, -479 | late+23, 4%, 1,721 |
| 2020 | 2020-10-30 → 2021-02-23 | 12,212 | none, 100%, 12,082 | none, 0%, 0 | none, 100%, 12,082 |
| 2023 | 2023-01-04 → 2023-03-02 | 6,879 | late+3, 92%, 5,103 | late+2, 95%, 5,704 | late+2, 95%, 5,704 |
| 2023 | 2023-10-26 → 2024-04-19 | 15,387 | same, 100%, 15,387 | same, 100%, 15,387 | same, 100%, 15,387 |
| 2025 | 2025-04-01 → 2025-04-16 | -5,459 | late+1, 91%, -7,136 | late+6, 45%, -4,893 | late+6, 45%, -4,893 |
| 2025 | 2025-04-17 → 2025-11-20 | 25,424 | late+3, 98%, 22,568 | late+5, 99%, 20,163 | late+9, 97%, 17,996 |

**Answer, event by event.** Did each variant hold the baseline's recovery winners, and what did it earn?

- **2003 (QQQ).**
  - The baseline's winner was 2003-03-06 → 08-05, entered at 20.77 for +$18.4k.
  - All three variants were blocked and bought on 03-13 at 21.72 (−$618). They re-entered on 04-09 at 21.59, held until 08-05 (+$14.8k), and captured $14.2k over the baseline trade's window.
  - B also lost more in Jan–Feb (three late losers), so its full-window 2003 P&L was $3.1k against $18.3k.
- **March 2009.**
  - QQQ: the baseline bought the low on 03-09 at 22.33 and made +$57.8k. B bought on 03-11 at 24.07 (+$45.7k), C on 03-10 at 23.72 (+$48.1k), and D on 03-12 at 24.88 (+$40.8k). All three held the whole rally but earned $9.8k–$17.1k less.
  - VGT: the baseline bought 03-11 at 3.49 (+$21.7k). B bought 03-18 at 3.71 (+$14.5k) and D bought 03-17 at 3.64 (+$16.6k).
  - C *beat* the baseline (+$25.2k). It was flat and confirmed on 2009-03-10, the session on which the baseline was exiting its previous trade. The baseline cannot re-enter on an exit session, so C bought one session earlier, at 3.39. This is a path artifact, not evidence that the rule works.
- **April 2020.**
  - VGT: B and C bought 03-24/25 at 24.5 and held to 09-04 (+$48.5k), against the baseline's −$0.8k and +$50.5k pair. That is near-full participation; B's +$13.9k window advantage partly reflects avoiding the baseline's 03-12 → 03-16 trade, which included the −$13.4k day on 03-16. D bought 03-13 (−$5.0k) and then 04-06 at 26.34 (+$38.4k).
  - QQQ: the baseline bought 03-19 at 171.87 (+$52.7k). B and C bought 03-24 at 178.07 (+$47.4k). D bought 04-06 at 190.50, 10.8% higher (+$37.8k).
- **January 2023.**
  - VGT: the baseline bought 01-04 at 38.95 (+$28.0k). B and D held no position from Jan to Sep 2023, earning $0. This was a signal lapse after a −$143 interest-only loss (spot check B4). C bought 01-06 at 39.23 (+$27.1k).
  - QQQ: the variants bought 01-06 or 01-09 (+$5.1k–$5.7k against +$6.9k).
- **April 2025.**
  - VGT: the baseline's +$35.7k winner (04-11 at 64.74) became +$34.8k for B (04-14 at 65.20), +$29.3k for C (04-25 at 68.03) and +$26.4k for D (05-01 at 69.59).
  - B and D had also bought on 03-24 at 71.53, a late entry into the falling market, and lost −$13.6k. That is worse than the baseline's −$7.8k on its 03-19 trade.
  - QQQ: +$22.6k / +$17.7k / +$15.6k for B / C / D, against +$25.4k.

**Summary.** The variants almost always held a position during the baseline's big recovery winners (coverage 89–100%), with one exception: VGT 2023 under B and D. But they entered 1–13 sessions later at higher prices, so they captured about 68–99% of each winner. The one case of full or better capture (VGT 2009 C) is a path artifact.

---

## 8. Dependence on a few trades or one event

These are the largest baseline-trade windows by Δ (variant window P&L − baseline P&L), from `results/matching/*.csv` and `tables.py`.

- **VGT_2016_2026 B (−$57.3k) is concentrated in two events.**
  - 2023-01-04 → 08-09: Δ −$28.0k.
  - 2026-03-26 → 06-05: Δ −$31.1k.
  - Together they make −$59.1k. Without them, B would be roughly level with the baseline (+$1.8k).
  - Both are signal lapses after near-zero losses of −$143 and −$111, where the price gain was smaller than the interest.
  - The largest improvements were the 2022-04-28 trade (+$8.9k) and the 2018-12-07 trade (+$7.6k).
- **VGT_2016_2026 C (−$77.5k).**
  - 2026-03-26: −$31.1k, the same lapse.
  - 2020-10-29 → 2021-02-23: −$12.2k. C was flat while the baseline earned +$12.2k.
  - 2025-04-04: −$7.7k.
  - Excluding the worst window still leaves −$46.5k.
- **VGT_2016_2026 D (−$52.8k).**
  - 2023 lapse: −$28.0k.
  - 2020-04-03 winner entered late: −$12.1k.
  - 2020-03-12 entry replaced by 03-13: −$11.1k.
  - Excluding the worst window leaves −$24.8k.
- **QQQ_1999_2015 (B −$55.1k, C −$117.7k, D −$77.6k): broad-based.**
  - The three worst windows sum to only −$38k to −$46k.
  - Large improvements exist but are outweighed:
    - B avoided most of the 2008-09-23 loss (+$21.0k) and the 2001-03-20 loss (+$14.7k).
    - C avoided the 2001-02-14 loss (+$18.7k).
  - The worst windows include the 2008-10-09 rally entry for C and D (−$18.3k each), the missed 2011-11-23 winner for B and C (−$13.6k), and the March 2009 winner entered late (−$12.1k for B).
- **QQQ_2016_2026 (−$18.6k to −$35.3k): broad-based.** No window exceeds −$12.9k. The largest is D's 12-session-late entry into the 2020 winner.
- **VGT_2005_2015.**
  - B's −$6.6k is close to zero: excluding its worst window (the March 2009 winner entered late, −$7.0k) leaves +$0.4k.
  - B's max-DD improvement (−$6.7k) comes from many small 2008 differences, such as the 2008-10-16 loss avoided (+$2.9k) and the 2009-02-02 loss reduced (+$3.4k).
  - D's −$61.1k includes the 2008-10-13 rally entry (−$15.5k in the 10-09 window, −$6.2k in the next).

The deterioration does not depend on one event for QQQ_1999_2015, QQQ_2016_2026, VGT_2016_2026 C/D or VGT_2005_2015 C/D. Only VGT_2016_2026 B hinges on two events, and those two arise from the same structural mechanism.

---

## 9. Preliminary classification: **Unpromising**

### Historical observations (price data, independent of the strategy)

- The 2000–02, 2008 and 2022 declines each contain long stretches in which the close stays ≥ 10% below the 90-day high, interrupted by sharp one- to three-day bounces that later fail. Examples are 2000-04-17 (+11.5% on QQQ), 2000-05-30 (+10.0%) and 2008-10-13 (+11.0% on VGT).
- Similar bounces also start the lasting recoveries: March 2009, March 2020 and April 2025, the last including the +12–13.5% day on 2025-04-09.

### Backtest calculations (this experiment)

- **Baseline facts.** The baseline's losing trades come in runs of up to 4–8 in a row, mostly in those declines. It re-enters on the session right after a losing exit in 136 of 151 cases (90%), while the 10% signal is still on. 31 of its 152 losers were profitable before interest; these "interest-only" losers also arm the confirmation requirement.
- **Profit and risk vs the baseline and the controls.** Net profit fell in 12 of 12 runs, by $6.6k–$117.7k. Profit is below the matched control in 12 of 12 runs, and profit/DD below the control in 12 of 12. Max DD is worse than the baseline in 10 of 12 runs and worse than the control in 11 of 12.
- **The first post-loss signal is usually blocked.** The rules blocked the first post-loss signal in 57–94% of losing exits. Confirmation took a median of 2–5 sessions, and the entry close was a median 0.9–3.2% higher.
- **The rules are not selective on the baseline path.** They would have blocked 62–95% of post-loss baseline entries. The blocked winners' P&L exceeded the blocked losers' |P&L| in 11 of 12 cases: for example, VGT_2016_2026 B blocks −$54k of losers and +$163k of winners. In the twelfth case (QQQ_1999_2015 B) the two are roughly equal, $245k vs $253k.
- **Losses are reduced, gains reduced more.** During baseline losers, the variants lost less in 10 of 12 cases (up to +$79k). During baseline winners, they lost $23k–$129k of profit in all 12.
- **Recovery participation is late, and sometimes missing.** The variants held the major recovery winners but entered 1–13 sessions late, capturing about 68–99%. They missed the 2023 VGT rally entirely under B and D.

### Inferences (drawn from the calculations; not separately tested)

- **The confirmations do not discriminate.** Two up closes, a close above SMA10, or +3% off the post-exit low occur within a few sessions in both failing bear-market rallies and genuine recoveries. They therefore delay winners and losers alike.
- **The delay itself is costly.** It shifts the entry to a higher price, which reduces winners. It can also make losers worse: buying after the bounce (D4, B2) leaves less room before the 15-day loss exit.
- **Signal lapses add a tail risk.** In V-shaped recoveries, the confirming rally can lift the price out of the 10% zone, and with no retroactive entry the strategy waits for the next dip. That cost VGT_2016_2026 about $59k in two events.
- **Lower exposure is not lower risk here.** The exposure reduction (5–22%) did not translate into lower drawdown. The matched controls show that pure deleveraging gives a better profit/DD in every case.

### Hypotheses (not tested here)

- The arming condition (any net loss, including interest-only losses) may cause much of the damage. Whether a materiality threshold would change the conclusion is a robustness question, not part of this predefined screen.
- The 2008-style improvements (QQQ 2007–09 B) may reflect how a 2-session delay happened to interact with the specific crash days, rather than a repeatable effect.

### Limitations

- Four datasets, of which two pairs overlap heavily (VGT/QQQ, both tech-heavy, over overlapping years). The 2005–2015 and 1999–2015 periods share 2007–09.
- The results are path-dependent. A one-session shift changes every later trade (the 2009 VGT C artifact), so per-trade attributions are descriptive, not causal. The time-window decomposition is exact in total, but it attributes P&L to calendar windows, not to decisions.
- Close-only confirmations, entries at the close, no slippage or commissions, and a fixed 11% interest rate, all as in the baseline.
- Predefined rules only: no parameter was varied, so nothing is known about nearby settings.

**Classification rationale.** The idea's premise is to avoid repeated losing re-entries without missing recoveries. The losing re-entries are only partially avoided, and the losses that are avoided are smaller than the recovery profits given up. This holds in every dataset, for every rule, both in absolute terms and against matched exposure. No dataset/config combination is better on both profit and drawdown than its matched control. **Unpromising.**

---

## 10. Parameters to flag for a later, separately authorised robustness study (not run)

- **Arming threshold:** currently any closed trade with net P&L < $0, interest included. Candidates are a loss materiality threshold, or excluding losses caused only by interest.
- **Confirmation definitions:** the number of consecutive up closes (2), the SMA length (10), the recovery percentage (3%), and strict versus inclusive comparisons.
- **Latch lifetime:** currently unlimited. Possible variants:
  - expiry after N sessions;
  - re-arming after a new low.
- **Signal interplay:** the 10% / 90-session entry signal is fixed by the baseline. The signal-lapse effect depends on it, because confirmation and a rising close jointly turn the signal off.
- **Entry timing:** close-of-session entry on the confirming bar, compared with the next open (not considered; the baseline enters at the close).

---

### Files (all under `research/risk-management/recovery-reentry/`)

| File | Contents |
|---|---|
| `strategies.py` | `A_baseline`, `B_two_positive_closes`, `C_close_above_sma10` and `D_recovery_3pct_from_low` classes, plus the rule functions |
| `run.py` | runs every config × dataset through `metrics.run_config` and writes `summary.json` with `extra` |
| `analysis.py` | trade matching, time-window decomposition, first-order check, recovery participation, `extra` summary |
| `verify.py` | baseline reproduction, independent replay and spot checks; writes `results/verification.txt` |
| `tables.py` | regenerates the tables in this report |
| `results/summary.json` | standard records plus `extra`: confirmation stats, matching, first-order check, per-event list |
| `results/trades/`, `results/daily/` | standard trade and daily series per (dataset, config) |
| `results/events/` | one row per losing exit: confirmation date, blocked sessions and dates, entry, price vs first signal |
| `results/matching/` | one row per baseline trade: classification, reason, delay, coverage, window P&L, overlapping variant trades |
| `results/shadow/` | the first-order check per post-loss baseline entry |
| `results/recovery/` | baseline trades held in each recovery window, with the variant's participation |
