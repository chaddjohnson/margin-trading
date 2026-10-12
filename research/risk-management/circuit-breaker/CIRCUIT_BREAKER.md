# Circuit breaker: cumulative-drawdown position-size tiers

Experiment `circuit_breaker` (SPEC.md §2). Configs: `A_baseline` and `B_drawdown_tiers`. All numbers come from
`results/summary.json`, produced by `run.py`; `make_tables.py` formats them.

**Bottom line.** The breaker cuts absolute max drawdown by 23–59% on all four datasets. However, it does no better
than simply trading a smaller fixed size with the same margin exposure:
- Its profit/drawdown is below the baseline's (and the control's) on three of four datasets.
- Its max drawdown is higher than the matched control's on three of four.
- On QQQ 1999–2015 it stayed at the $25k tier from 2000-10-09 to the end of the data (15.2 years).
- It earned only 25% of the baseline's P&L in the 2003 and 2009 recoveries.

**Preliminary classification: Unpromising.**

---

## 1. Configuration and exact implementation

### Configurations

| Config | Entry size |
|---|---|
| `A_baseline` | $100,000 (frozen baseline; all hooks inert) |
| `B_drawdown_tiers` | from the strategy's own drawdown as of the previous completed session (table below) |

| Drawdown at previous close (DD) | B entry size |
|---|---:|
| DD < $10,000 | $100,000 |
| $10,000 ≤ DD < $20,000 | $75,000 |
| $20,000 ≤ DD < $30,000 | $50,000 |
| DD ≥ $30,000 | $25,000 |

### Implementation

`strategies.py`:
- `DrawdownTiers.entry_size(e, i)` returns `tier_size(e.dd_prev)`.
- `Baseline.entry_size` returns $100,000.
- Both log the drawdown and peak each decision saw. `on_session_end` only records the closing drawdown for logging and
  changes nothing that the engine reads.
- No other hook is overridden, and the engine and metrics are imported unmodified.

**Drawdown.** The engine's continuous daily mark-to-market P&L is: cumulative realized P&L + (shares × close −
investment − accrued interest) for any open position. The peak starts at 0, includes unrealized highs, and never
resets. DD = peak − MTM. The engine sets `e.dd_prev` at the end of each session, so during session *i* it holds
session *i*−1's closing value.

### Chronology within session *i* (engine order, unchanged)

1. **Entry check (before exits).** The engine checks for an entry if no position was carried into session *i* and
   close*ᵢ* is at least 10% below the highest high of sessions *i*−90 … *i*−1.
   - It then calls `entry_size`. B reads `e.dd_prev`, which is DD at close *i*−1.
   - That value already includes the realized result of every earlier trade. A trade that exited in session *i*−1 or
     earlier is in it, and there is never an entry in an exit session.
   - The buy is at close*ᵢ*: shares = size ÷ close*ᵢ*. Interest accrues from this date.
2. **Exit evaluation.** This applies only if a position was carried into session *i*:
   - At the open: the 15-calendar-day loss exit, or a trailing-stop gap fill.
   - Otherwise intraday: a trailing-stop fill at its level.
   - One fill only.
3. **Mark at the close.** The engine marks MTM*ᵢ*, sets peak = max(peak, MTM*ᵢ*) and DD*ᵢ* = peak − MTM*ᵢ*. DD*ᵢ*
   becomes `e.dd_prev` for session *i*+1.

### Assumptions and their consequences

- **The one-session lag loses no information.** The strategy is flat throughout an entry session, and a new position
  is marked at its own entry close with zero interest. So DD at the entry close always equals DD at the prior close.
  This was verified for every entry: the maximum difference is 3×10⁻¹¹ dollars.
- **Boundaries.** Each tier's lower bound is inclusive. For example, DD = $20,000.00 → $50k.
- **Fixed size.** The size is fixed at entry: no add-ons and no resizing while a position is open. Trading is never
  suspended: every baseline signal is taken.
- **Peak definition.** The peak includes *unrealized* highs. Giving back open profit therefore counts as drawdown and
  can shrink the next entry even after a winning trade.
  - **VGT 2005–2015:** the first trade peaked at +$19,856 unrealized (2006-01-11) and closed at +$6,014. The next
    entry, on 2006-05-23, was therefore sized at $75k (DD $13,842).
  - **QQQ 1999–2015:** the peak is the open-position high on 2000-03-27, the dot-com top.
- **Size never changes the trade sequence.** Stop activation and the loss exit depend only on the sign of P&L, which
  is scale-invariant. B therefore takes exactly A's trades, each scaled by size ÷ $100k (verified in §2.4).
  - Max consecutive losses, win rate, trade counts and exposure % are identical by construction.
  - Every difference between A and B is Σ (size ÷ $100k − 1) × A's trade P&L, which makes attribution exact (§8).

### Files

| Path | Content |
|---|---|
| `strategies.py` | `Baseline`, `DrawdownTiers` and `tier_size` |
| `run.py` | Runs both configs on all four datasets via `metrics.run_config`; computes `extra`, all checks, and the A-vs-frozen-baseline assertions |
| `make_tables.py` | Formats the tables in this report |
| `results/summary.json` | Standard records plus `extra` |
| `results/trades/`, `results/daily/` | Standard outputs |
| `results/entries/<ds>__<config>.csv` | Each entry's prior-session DD, peak, tier and size, with B and A P&L |
| `results/tiers/<ds>__<config>.csv` | Per-session MTM, peak, DD, the tier implied for the next session, and the size held |

The `extra` block in `summary.json` holds:
- tier time and entries per tier;
- trap spells and drawdown episodes;
- positions held in recovery windows;
- attribution, losing streaks and the max-DD path split by size held;
- the checks and the entry log.

Run: `PYTHONDONTWRITEBYTECODE=1 <python> run.py`, then `<python> make_tables.py`.

---

## 2. Verification

### 2.1 A_baseline reproduces the frozen baseline exactly

`run.py` asserts all of the following, and they pass for all four datasets:
- `metrics` and `matched_control` in my `summary.json` are equal (Python `==` on the parsed JSON) to
  `baseline/results/summary.json`;
- my `trades/` and `daily/` CSVs equal the baseline's (`DataFrame.equals`).

`baseline/CHECKSUMS.txt` verified OK before and after the runs.

### 2.2 Spot-checks of B entries

`spot_check.py` recomputes each entry from the raw price CSV and the written daily series, without importing the
engine:
1. the 90-session high and the dip;
2. the prior-session DD as running max(0, MTM) − MTM;
3. the tier;
4. shares = size ÷ close;
5. interest = size × 11% × days ÷ 365;
6. P&L = shares × exit − size − interest.

Every value matches the engine to the cent.

| Dataset | Entry (close) | Prior session: MTM / peak / DD | Tier → size | Shares | Exit (reason) | Interest | P&L |
|---|---|---|---|---:|---|---:|---:|
| VGT_2016_2026 | 2020-03-12 @ 23.7130 (dip 27.4%) | 03-11: 4,528 / 22,752 / **18,225** | $75k | 3,162.82 | 2020-03-16 @ 23.1649 (trailing-stop gap) | 90.41 | −1,823.95 |
| VGT_2016_2026 | 2020-03-17 @ 24.1464 | 03-16: 2,704 / 22,752 / **20,048** | $50k | 2,070.70 | 2020-04-02 @ 24.0709 (maximum hold) | 241.10 | −397.43 |
| VGT_2016_2026 | 2020-04-03 @ 24.2742 | 04-02: 2,306 / 22,752 / **20,446** | $50k | 2,059.80 | 2020-09-04 @ 37.6673 (trailing stop) | 2,320.55 | +25,266.53 (A: +50,533) |
| VGT_2016_2026 | 2020-09-08 @ 36.0054 | 09-04: 27,573 / 33,758 / **6,185** | $100k | 2,777.36 | 2020-09-24 @ 35.2588 (maximum hold) | 482.19 | −2,555.77 |
| QQQ_2016_2026 | 2025-04-01 @ 472.70 | 03-31: 45,030 / 64,905 / **19,874** | $75k | 158.66 | 2025-04-16 @ 449.03 (maximum hold) | 339.04 | −4,094.59 |
| QQQ_2016_2026 | 2025-04-17 @ 444.10 | 04-16: 40,936 / 64,905 / **23,969** | $50k | 112.59 | 2025-11-20 @ 586.0492 (trailing stop) | 3,269.86 | +12,711.81 (A: +25,424) |
| QQQ_1999_2015 | 2009-03-09 @ 22.3304 | 03-06: −13,587 / 46,826 / **60,413** | $25k | 1,119.55 | 2010-01-29 @ 37.4383 (trailing stop) | 2,456.16 | +14,457.88 (A: +57,832) |
| VGT_2005_2015 | 2008-09-23 @ 5.1572 | 09-22: −3,111 / 19,856 / **22,966** | $50k | 9,695.20 | 2008-10-08 @ 4.1179 (maximum hold) | 226.03 | −10,302.15 (A: −20,604) |

**How the tier moves between consecutive entries.**
- **VGT 2016–2026, March 2020:**
  - The 2020-03-11 exit pushed DD from $9,378 to $18,225: $100k → $75k.
  - The next exit, on 2020-03-16, pushed it to $20,048: $75k → $50k.
- **QQQ 2016–2026, April 2025:** the 2025-04-16 loss moved DD from $19,874 to $23,969, so the large 2025-04-17 winner
  was taken at $50k.

**Tier check over all entries.** `run.py` recomputes the tier of every B entry from the written daily drawdown at
session *entry*−1: zero mismatches across 48 + 109 + 45 + 36 entries. Every A entry is $100k.

### 2.3 Realized losses are not double-counted (question 7)

`run.py: continuity_check` rebuilds the daily MTM series independently from the trade list and prices:
- the sum of profits of trades closed by session *k*;
- plus shares × close*ₖ* − investment − accrued interest for the open position.

It then tests five things:

| Test | Result (all 8 runs) |
|---|---|
| max \|engine MTM − rebuilt MTM\| | ≤ 1.5×10⁻¹¹ |
| On every exit session (47 / 108 / 45 / 35): daily change vs shares × (exit price − previous close) − one step of interest | max difference ≤ 2.0×10⁻¹¹ |
| Final MTM − net profit | 0.0 |
| Sum of daily changes − net profit | ≤ 1.3×10⁻¹¹ |
| MTM on flat sessions vs cumulative realized P&L | max difference 0.0 |

So on an exit day the series moves only by that day's price change. The realized loss has already been marked in day
by day, and is not added again. Two concrete examples:

| Trade | Realized P&L | MTM before entry → MTM at exit | Change over trade life | MTM change on exit day | Of which: shares × (exit − prev close) | Interest (one step) | DD after exit → next size |
|---|---:|---|---:|---:|---:|---:|---|
| VGT_2005_2015 B, 2008-09-23 → 2008-10-08, $50k | −10,302.15 | −3,110.60 → −13,412.76 | **−10,302.15** | −974.80 | −959.73 | −15.07 | $33,269 → $25k |
| QQQ_1999_2015 B, 2000-03-30 → 2000-04-14, $100k | −20,199.56 | 40,110.93 → 19,911.37 | **−20,199.56** | −1,836.80 | −1,806.67 | −30.14 | $26,915 → $50k |

In both cases MTM on the following session is unchanged while flat.

### 2.4 Scaling identity

For every dataset, B has exactly A's entry indices, exit indices and exit prices. Each B trade's P&L equals A's
P&L × size ÷ $100k, to within 2.2×10⁻¹¹ dollars.

---

## 3. Standard metrics (sections A–C)

### VGT_2005_2015 (2005-02-25 → 2015-10-07)

| Metric | A_baseline | B_drawdown_tiers |
|---|---:|---:|
| Net profit | 11,602 | −606 |
| Realized / unrealized | 5,872 / 5,731 | −3,471 / 2,865 |
| Margin interest | 71,575 | 41,325 |
| Closed trades (W/L) | 47 (13/34) | 47 (13/34) |
| Win rate | 28% | 28% |
| Avg win / avg loss | 7,751 / −2,791 | 3,217 / −1,332 |
| Largest win / loss | 21,725 / −20,604 | 9,220 / −10,302 |
| Max drawdown | 73,404 | 39,900 |
| Peak → trough | 2007-07-19 → 2009-03-09 | 2006-01-11 → 2009-03-09 |
| Profit / max DD | 0.16 | −0.02 |
| Max consecutive losses | 6 | 6 |
| Max bear-episode DD | 73,404 | 39,316 |
| Lowest cumulative P&L | −49,713 | −20,045 |
| Fell below −$100k | no | no |
| Longest underwater (days) | 3,002 (not recovered) | 3,556 (not recovered) |
| Worst day | −8,276 (2008-09-29) | −4,138 (2008-09-29) |
| Avg borrowed: all sessions / while invested | 61,340 / 100,000 | 35,376 / 57,672 |
| % sessions exposed | 61% | 61% |
| Margin dollar-days | $237.5M·d | $137.1M·d |
| Net profit per $1M dollar-days | 49 | −4 |

### QQQ_1999_2015 (1999-03-10 → 2015-12-31)

| Metric | A_baseline | B_drawdown_tiers |
|---|---:|---:|
| Net profit | −2,886 | 9,764 |
| Realized / unrealized | −12,257 / 9,371 | 7,421 / 2,343 |
| Margin interest | 124,858 | 35,946 |
| Closed trades (W/L) | 108 (38/70) | 108 (38/70) |
| Win rate | 35% | 35% |
| Avg win / avg loss | 8,971 / −5,045 | 3,125 / −1,591 |
| Largest win / loss | 57,832 / −21,715 | 23,182 / −20,200 |
| Max drawdown | 149,561 | 62,025 |
| Peak → trough | 2000-03-27 → 2002-09-30 | 2000-03-27 → 2002-09-30 |
| Profit / max DD | −0.02 | 0.16 |
| Max consecutive losses | 8 | 8 |
| Max bear-episode DD | 149,561 | 62,025 |
| Lowest cumulative P&L | −102,735 | −15,199 |
| Fell below −$100k | **yes** | no |
| Longest underwater (days) | 5,757 (not recovered) | 5,757 (not recovered) |
| Worst day | −9,288 (2001-04-20) | −6,891 (2000-01-06) |
| Avg borrowed: all sessions / while invested | 67,620 / 100,000 | 19,517 / 28,862 |
| % sessions exposed | 68% | 68% |
| Margin dollar-days | $414.3M·d | $119.3M·d |
| Net profit per $1M dollar-days | −7 | 82 |

### VGT_2016_2026 (2016-10-07 → 2026-10-06)

| Metric | A_baseline | B_drawdown_tiers |
|---|---:|---:|
| Net profit | 161,772 | 103,542 |
| Realized / unrealized | 161,772 / 0 | 103,542 / 0 |
| Margin interest | 73,233 | 54,842 |
| Closed trades (W/L) | 45 (17/28) | 45 (17/28) |
| Win rate | 38% | 38% |
| Avg win / avg loss | 14,622 / −3,100 | 9,985 / −2,364 |
| Largest win / loss | 50,533 / −11,151 | 26,785 / −8,847 |
| Max drawdown | 38,323 | 29,283 |
| Peak → trough | 2021-04-15 → 2022-10-14 | 2021-04-15 → 2022-10-14 |
| Profit / max DD | 4.22 | 3.54 |
| Max consecutive losses | 4 | 4 |
| Max bear-episode DD (2022) | 34,856 | 24,179 |
| Lowest cumulative P&L | −7,070 | −1,631 |
| Fell below −$100k | no | no |
| Longest underwater (days) | 790 | 1,009 |
| Worst day | −13,421 (2020-03-16) | −10,066 (2020-03-16) |
| Avg borrowed: all sessions / while invested | 66,640 / 100,000 | 49,861 / 74,821 |
| % sessions exposed | 67% | 67% |
| Margin dollar-days | $243.0M·d | $182.0M·d |
| Net profit per $1M dollar-days | 666 | 569 |

### QQQ_2016_2026 (2016-10-07 → 2026-10-07)

| Metric | A_baseline | B_drawdown_tiers |
|---|---:|---:|
| Net profit | 116,388 | 81,194 |
| Realized / unrealized | 103,991 / 12,398 | 68,796 / 12,398 |
| Margin interest | 62,595 | 44,686 |
| Closed trades (W/L) | 35 (15/20) | 35 (15/20) |
| Win rate | 43% | 43% |
| Avg win / avg loss | 12,128 / −3,896 | 8,218 / −2,723 |
| Largest win / loss | 52,700 / −10,297 | 39,525 / −7,723 |
| Max drawdown | 39,237 | 30,283 |
| Peak → trough | 2021-09-07 → 2022-12-28 | 2021-09-07 → 2022-12-28 |
| Profit / max DD | 2.97 | 2.68 |
| Max consecutive losses | 4 | 4 |
| Max bear-episode DD (2022) | 33,932 | 23,633 |
| Lowest cumulative P&L | −8,254 | −4,789 |
| Fell below −$100k | no | no |
| Longest underwater (days) | 1,395 | 1,688 |
| Worst day | −8,732 (2020-03-12) | −6,549 (2020-03-12) |
| Avg borrowed: all sessions / while invested | 57,023 / 100,000 | 40,758 / 71,476 |
| % sessions exposed | 57% | 57% |
| Margin dollar-days | $207.7M·d | $148.3M·d |
| Net profit per $1M dollar-days | 560 | 548 |

---

## 4. Matched-exposure comparison

The control is a complete baseline run at a fixed size X, chosen so that its margin dollar-days equal B's
(`metrics.matched_control`).

A fixed size scales profit and drawdown linearly, so **the control's profit/DD always equals the baseline's**.
"B vs control" on profit/DD is therefore also "B vs A".

| Dataset | B exposure vs A | Control size | B net | Control net | Δ net (B − ctrl) | B max DD | Control max DD | Δ DD (B − ctrl) | B P/DD | Control P/DD | Δ P/DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 0.577 | 57,737 | −606 | 6,699 | **−7,305** | 39,900 | 42,381 | **−2,481** | −0.02 | 0.16 | **−0.17** |
| QQQ_1999_2015 | 0.288 | 28,790 | 9,764 | −831 | **+10,595** | 62,025 | 43,058 | **+18,967** | 0.16 | −0.02 | **+0.18** |
| VGT_2016_2026 | 0.749 | 74,887 | 103,542 | 121,146 | **−17,605** | 29,283 | 28,699 | **+583** | 3.54 | 4.22 | **−0.69** |
| QQQ_2016_2026 | 0.714 | 71,389 | 81,194 | 83,089 | **−1,895** | 30,283 | 28,011 | **+2,272** | 2.68 | 2.97 | **−0.29** |

- **Profit:** B earns less than its control in 3 of 4 datasets.
- **Drawdown:**
  - B's max drawdown is *higher* than its control's in 3 of 4 datasets.
  - The exception is VGT 2005–2015, where it is lower by $2,481 (6%), with a worse profit.
- **Profit/DD:** B is worse in 3 of 4.
- **QQQ 1999–2015:** the one profit/DD "improvement" (−0.02 → 0.16) comes with a drawdown $19k *worse* than equal
  exposure at a fixed size.

**Why B's drawdown exceeds the control's.** The breaker only reacts at the next entry, and a single $100k baseline
trade can lose up to $20.6k–$21.7k. So the first $20–30k of every drawdown is taken at or near full size. Splitting
B's max-drawdown path by the size held (`extra.max_dd_by_size_held`):

| Dataset | B max-DD path | Lost while holding $100k | $75k | $50k | $25k |
|---|---|---:|---:|---:|---:|
| VGT_2005_2015 | 2006-01-11 → 2009-03-09: −39,900 | −19,934 (106 sessions) | −5,341 (437) | −7,993 (13) | −6,632 (94) |
| QQQ_1999_2015 | 2000-03-27 → 2002-09-30: −62,025 | **−26,915 (13 sessions)** | — | −8,897 (94) | −26,213 (466) |
| VGT_2016_2026 | 2021-04-15 → 2022-10-14: −29,283 | −10,015 (18) | −15,340 (75) | −3,927 (101) | — |
| QQQ_2016_2026 | 2021-09-07 → 2022-12-28: −30,283 | −10,686 (19) | −15,964 (75) | −3,632 (149) | — |

**QQQ 1999–2015 detail.** In April 2000, 43% of B's eventual max drawdown came in 13 sessions at $100k:
- the give-back of the open winner from the 2000-03-27 peak;
- the −$20,200 trade of 2000-03-30 → 2000-04-14.

A uniform $28.8k position never takes that hit.

---

## 5. Bear markets

Window P&L is the change in cumulative P&L across the window. The DD is peak-to-trough inside the window. Trades
are counted by exit date.

| Dataset | Window | Config | Period P&L | Max DD in window | Interest | Trades closed | Losing | Largest loss | Avg borrowed |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2007–2009 | A | −38,496 | 73,404 | 21,879 | 23 | 16 | −20,604 | 66,005 |
| VGT_2005_2015 | 2007–2009 | B | −24,592 | 39,316 | 12,673 | 23 | 16 | −10,302 | 38,062 |
| QQQ_1999_2015 | 2000–2002 | A | −91,629 | 149,561 | 28,630 | 56 | 36 | −20,200 | 87,899 |
| QQQ_1999_2015 | 2000–2002 | B | −19,381 | 62,025 | 10,013 | 56 | 36 | −20,200 | 30,785 |
| QQQ_1999_2015 | 2007–2009 | A | +20,931 | 70,759 | 32,066 | 21 | 15 | −21,715 | 96,825 |
| QQQ_1999_2015 | 2007–2009 | B | +5,233 | 17,690 | 8,016 | 21 | 15 | −5,429 | 24,206 |
| VGT_2016_2026 | 2022 | A | −23,643 | 34,856 | 9,644 | 13 | 10 | −11,151 | 90,438 |
| VGT_2016_2026 | 2022 | B | −16,935 | 24,179 | 5,628 | 13 | 10 | −8,363 | 52,689 |
| QQQ_2016_2026 | 2022 | A | −26,320 | 33,932 | 9,764 | 13 | 10 | −10,297 | 90,438 |
| QQQ_2016_2026 | 2022 | B | −18,481 | 23,633 | 5,703 | 13 | 10 | −7,723 | 52,689 |

The breaker does what it is designed to do inside bears:
- smaller period losses in the four losing windows (−36%, −79%, −28% and −30% vs A);
- smaller in-window drawdowns (−30% to −75%);
- less interest.

**QQQ 2000–2002.** The largest loss is unchanged (−$20,200) because that trade was entered at $100k, before the
breaker had triggered.

**QQQ 2007–2009.** This was a profitable window for A (+$20.9k). B kept only $5.2k of it, because it entered 2007 at
the $25k tier, still in drawdown from 2000.

---

## 6. Recovery participation

| Dataset | Window | A period P&L | B period P&L | B − A | B ÷ A | A: P&L of entries (n) | B: P&L of entries (n) | B avg borrowed |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| VGT_2005_2015 | 2009 (03-01..12-31) | 15,518 | 3,879 | −11,638 | 25% | 21,725 (1) | 5,431 (1) | 10,329 |
| QQQ_1999_2015 | 2003 | 18,291 | 4,573 | −13,718 | 25% | 15,116 (3) | 3,779 (3) | 14,385 |
| QQQ_1999_2015 | 2009 (03-01..12-31) | 66,522 | 16,630 | −49,891 | 25% | 57,832 (1) | 14,458 (1) | 24,883 |
| VGT_2016_2026 | 2020 (03-16..12-31) | 48,081 | 26,567 | −21,514 | 55% | 59,322 (5) | 34,453 (5) | 68,227 |
| VGT_2016_2026 | 2023 | 44,468 | 26,150 | −18,318 | 59% | 42,695 (3) | 25,020 (3) | 47,800 |
| VGT_2016_2026 | 2025 (04-01..12-31) | 39,671 | 30,801 | −8,870 | 78% | 36,838 (3) | 27,105 (3) | 76,316 |
| QQQ_2016_2026 | 2020 (03-16..12-31) | 63,718 | 47,788 | −15,929 | 75% | 61,124 (5) | 45,843 (5) | 73,522 |
| QQQ_2016_2026 | 2023 | 25,111 | 12,556 | −12,556 | 50% | 22,266 (2) | 11,133 (2) | 16,800 |
| QQQ_2016_2026 | 2025 (04-01..12-31) | 19,964 | 8,617 | −11,347 | 43% | 19,964 (2) | 8,617 (2) | 43,816 |

- **Every recovery window:** B earns less than A, $8.9k to $49.9k less.
- **2003 and 2009:** B earned exactly 25% of A's P&L, because every position in those windows was $25k.
- **2016–2026:** 43%–78%.
- **Relative to B's full-period exposure** vs A (QQQ 1999–2015 0.29, VGT 2005–2015 0.58, VGT 2016–2026 0.75,
  QQQ 2016–2026 0.71):
  - B participates in the recoveries *less* than its average exposure in 7 of 9 windows: 25% vs 0.29 and 0.58
    pre-2015; VGT 2020 55% and 2023 59% vs 0.75; QQQ 2023 50% and 2025 43% vs 0.71.
  - The exceptions are VGT 2025 (78%) and QQQ 2020 (75%).

---

## 7. Experiment-specific questions

### Q1. Maximum drawdown and maximum consecutive losses

| Dataset | Max DD A → B | Change | Max consecutive losses (A = B) | Longest streak $ loss A → B | Costliest streak A → B |
|---|---|---:|---:|---|---|
| VGT_2005_2015 | 73,404 → 39,900 | −46% | 6 | −11,190 → −9,915 | −20,604 → −10,302 (one trade, at $50k) |
| QQQ_1999_2015 | 149,561 → 62,025 | −59% | 8 | −52,934 → −13,234 (all at $25k) | −59,322 → −23,849 |
| VGT_2016_2026 | 38,323 → 29,283 | −24% | 4 | −16,492 → −12,845 | −17,990 → −13,218 |
| QQQ_2016_2026 | 39,237 → 30,283 | −23% | 4 | −12,680 → −6,340 | −19,650 → −14,148 |

- **Max consecutive losses** are identical by construction: the same trades, scaled.
- **Dollar cost of streaks:** lower in B.
- **B's max DD in 2016–2026** sits just below or at the $30k threshold (29.3k, 30.3k). It reached the $25k tier for
  exactly one session (QQQ, 2022-12-29), with no entry.

### Q2. Time in each tier and entries per tier

**Time in tier.** Each decision session (sessions 2 … n) gets the tier implied by DD at the previous close. For A,
the tiers are what its own drawdown *would* imply. They are informational only; A never resizes.

| Dataset | Config | $100k | $75k | $50k | $25k |
|---|---|---:|---:|---:|---:|
| VGT_2005_2015 | B | 567 (21.2%) | 393 (14.7%) | 1,166 (43.7%) | 545 (20.4%) |
| VGT_2005_2015 | A (implied) | 548 (20.5%) | 1,199 (44.9%) | 269 (10.1%) | 655 (24.5%) |
| QQQ_1999_2015 | B | 266 (6.3%) | 10 (0.2%) | 113 (2.7%) | **3,841 (90.8%)** |
| QQQ_1999_2015 | A (implied) | 267 (6.3%) | 46 (1.1%) | 78 (1.8%) | 3,839 (90.8%) |
| VGT_2016_2026 | B | 1,638 (65.2%) | 656 (26.1%) | 217 (8.6%) | 0 |
| VGT_2016_2026 | A (implied) | 1,612 (64.2%) | 668 (26.6%) | 161 (6.4%) | 70 (2.8%) |
| QQQ_2016_2026 | B | 1,097 (43.7%) | 1,005 (40.0%) | 409 (16.3%) | 1 (0.0%) |
| QQQ_2016_2026 | A (implied) | 1,393 (55.5%) | 711 (28.3%) | 307 (12.2%) | 101 (4.0%) |

**Entries per tier (B).** Each cell shows the count, then (in brackets) the same trades' P&L at the baseline $100k
and that P&L per trade, which is the per-$100k quality of entries taken in each tier.

| Dataset | $100k | $75k | $50k | $25k |
|---|---:|---:|---:|---:|
| VGT_2005_2015 | 3 (−78; −26/trade) | 14 (−7,122; −509) | 10 (+453; +45) | 21 (+18,349; +874) |
| QQQ_1999_2015 | 7 (+19,911; +2,844) | 0 | 7 (−17,793; −2,542) | 95 (−5,004; −53) |
| VGT_2016_2026 | 13 (+21,329; +1,641) | 20 (+47,965; +2,398) | 12 (+92,479; **+7,707**) | 0 |
| QQQ_2016_2026 | 4 (+30,026; +7,507) | 20 (+31,947; +1,597) | 12 (+54,415; +4,535) | 0 |

- **Entries cluster in the reduced tiers.** For example, QQQ 2016–2026 spent 43.7% of sessions in the $100k tier,
  but only 4 of its 36 entries (11%) were at $100k. VGT 2016–2026: 65% of sessions, but 29% of entries.
  - The 10% dip entry signal fires when the market has just fallen, which is also when a long-only dip buyer's own
    drawdown is elevated. The breaker binds exactly when the strategy trades.
- **In both 2016–2026 datasets,** entries in the $50k tier were, per $100k, the *most* profitable or second most
  profitable group. The breaker shrank its best trades.
- **Pre-2015:** the deepest tier had positive per-trade quality on VGT (+$874) and was roughly flat on QQQ (−$53).
  - The only group where downsizing clearly avoided bad trades is QQQ's $50k tier in 2000 (−$2,542 per trade).

### Q3. Recovery time after the major drawdowns

These are underwater episodes reaching at least $10k: peak → trough → first close regaining the peak. "DD < $10k"
is when B returns to full size.

| Dataset | Config | Peak (P&L) | Trough | Depth | Recovered | Peak → recovery (days) | Trough → recovery (days) | DD back < $10k (days after trough) |
|---|---|---|---|---:|---|---:|---:|---|
| VGT_2005_2015 | A | 2006-01-11 (19,856) | 2006-07-21 | 21,680 | 2007-07-06 | 541 | 350 | 2006-10-12 (83) |
| VGT_2005_2015 | A | 2007-07-19 (23,690) | 2009-03-09 | 73,404 | not recovered | 3,002+ | 2,403+ | 2012-03-13 (1,100) |
| VGT_2005_2015 | B | 2006-01-11 (19,856) | 2009-03-09 | 39,900 | **not recovered** | 3,556+ | 2,403+ | **never** |
| QQQ_1999_2015 | A | 2000-03-27 (46,826) | 2002-09-30 | 149,561 | not recovered | 5,757+ | 4,840+ | never |
| QQQ_1999_2015 | B | 2000-03-27 (46,826) | 2002-09-30 | 62,025 | not recovered | 5,757+ | 4,840+ | **never** |
| VGT_2016_2026 | A | 2018-09-04 (22,752) | 2019-01-03 | 29,822 | 2019-04-23 | 231 | 110 | 54 |
| VGT_2016_2026 | A | 2019-07-24 (29,422) | 2020-03-23 | 28,969 | 2020-05-08 | 289 | 46 | 22 |
| VGT_2016_2026 | B | 2018-09-04 (22,752) | 2019-01-03 | 24,383 | 2020-07-20 | **685** | 564 | 109 |
| VGT_2016_2026 | A | 2021-04-15 (79,730) | 2022-10-14 | 38,323 | 2023-06-14 | 790 | 243 | 223 |
| VGT_2016_2026 | B | 2021-04-15 (49,002) | 2022-10-14 | 29,283 | 2024-01-19 | **1,009** | 462 | 243 |
| QQQ_2016_2026 | A | 2018-08-29 (18,117) | 2019-01-03 | 26,371 | 2019-07-24 | 329 | 202 | 71 |
| QQQ_2016_2026 | A | 2019-07-26 (18,180) | 2020-03-12 | 23,564 | 2020-04-14 | 263 | 33 | 25 |
| QQQ_2016_2026 | B | 2018-08-29 (18,117) | 2020-03-12 | 22,906 | 2020-05-11 | **621** | 60 | 27 |
| QQQ_2016_2026 | A | 2021-09-07 (80,768) | 2022-12-28 | 39,237 | 2025-07-03 | 1,395 | 918 | 387 |
| QQQ_2016_2026 | B | 2021-09-07 (64,905) | 2022-12-28 | 30,283 | 2026-04-22 | **1,688** | 1,211 | **992** |

B's drawdowns are shallower in dollars but last longer in every comparable case:
- **2018:** B did not recover its 2018 peak before the 2020 crash, so the 2018 and 2020 drawdowns merged into one
  episode (685 vs 231 days on VGT, 621 vs 329 on QQQ).
- **2021–22:** 1,009 vs 790 days (VGT) and 1,688 vs 1,395 days (QQQ).
- **QQQ 2016–2026 full size:** B returned to full size 992 days after the 2022 trough, against 387 for A's implied
  tier. Between 2022-01-19 and 2026-07-29 every B entry was at $75k or $50k.
- **VGT 2005–2015:** B never regained its 2006 peak at all.
  - In 2006 its drawdown reached $19.7k, just under the $20k threshold, so it spent the 2006–07 recovery at $75k.
  - It came within $585 of the 2006 peak on 2007-07-19 (the day of A's own peak), but never exceeded it before the
    2008 crash.
  - A recovered the same 2006 drawdown in 541 days.

### Q4. Position sizes during the 2003, 2009, 2020, 2023 and 2025 recoveries

| Window | Dataset | B DD at window start | B entries in the window: date → size (B P&L vs A P&L) |
|---|---|---:|---|
| 2003 | QQQ_1999_2015 | 56,928 | 01-21 → $25k (−809 vs −3,238); 02-06 → $25k (−16 vs −64); 03-06 → **$25k (+4,605 vs +18,419)**. Held into the window: the 2002-12-30 entry, $25k |
| 2009 | QQQ_1999_2015 | 59,589 | 03-09 → **$25k (+14,458 vs +57,832)** |
| 2009 | VGT_2005_2015 | 38,051 | 03-11 → **$25k (+5,431 vs +21,725)** |
| 2020 | VGT_2016_2026 | 9,983 | 03-17 → $50k (−397 vs −795); 04-03 → **$50k (+25,267 vs +50,533)**; 09-08, 09-25, 10-29 → $100k |
| 2020 | QQQ_2016_2026 | 19,374 | 03-16 → $75k; 03-19 → **$75k (+39,525 vs +52,700)**; 09-08, 09-25, 10-30 → $75k |
| 2023 | VGT_2016_2026 | 26,950 | 01-04 → **$50k (+14,003 vs +28,006)**; 09-21 → $75k; 10-20 → $75k (+11,394 vs +15,193) |
| 2023 | QQQ_2016_2026 | 29,168 | 01-04 → $50k (+3,440 vs +6,879); 10-26 → **$50k (+7,693 vs +15,387)** |
| 2025 | VGT_2016_2026 | 14,898 | 04-04 → $75k; 04-11 → **$75k (+26,785 vs +35,713)**; 11-20 → $100k |
| 2025 | QQQ_2016_2026 | 19,874 | 04-01 → $75k (−4,095 vs −5,459); 04-17 → **$50k (+12,712 vs +25,424)** |

The single largest recovery trade in every window was taken at a reduced size: $25k, $50k or $75k.

**Exact thresholds decided some of these.**
- The VGT entry of 2020-04-03 is the baseline's largest winner on that dataset. It was sized at $50k because DD was
  $20,446, just **$446** over the $20k threshold.
- The QQQ entry of 2020-03-19 got $75k at DD $19,273, **$727** under the threshold.

### Q5. Does it get trapped at low exposure?

Spells are counted over decision sessions in the $50k/$25k tiers (DD at the previous close ≥ $20k).

| Dataset | B: sessions in $50k/$25k | Longest $50k/$25k spell | Longest $25k spell | Ever back to $100k after first entering $50k/$25k? | Tier at data end |
|---|---:|---|---|---|---|
| VGT_2005_2015 | 1,711 (64%) | 2008-09-05 → 2012-02-28, 876 sessions / 1,272 days, then exits | 2008-10-08 → 2010-10-15, 510 sessions / 740 days | **no** (first entered 2008-03-28) | $50k |
| QQQ_1999_2015 | 3,954 (94%) | **2000-04-13 → 2015-12-31, 3,954 sessions / 5,740 days; never exits** | 2000-10-09 → 2015-12-31, 3,831 sessions / 5,561 days; never exits | **no** | $25k |
| VGT_2016_2026 | 217 (9%) | 2022-08-29 → 2023-02-02, 109 sessions / 158 days | none | yes | $100k |
| QQQ_2016_2026 | 410 (16%) | 2022-08-22 → 2023-11-14, 311 sessions / 450 days | 1 session (2022-12-29) | yes | $100k |

**QQQ 1999–2015: trapped permanently.**
- B's drawdown stayed at or above $30k from 2000-10-06 onward. After 2003 it never fell below $35,924 (the best, on
  2015-11-03).
- From 2000-10-09 to the last session (15.2 years), all 94 of its entries were at $25k. That is 94 of its 109
  entries in total.
- It ends with DD $37,062. Returning to full size (DD < $10k) would require a further +$27.1k of P&L, earned at
  $25k, then $50k, then $75k sizes. That is about $62k of baseline-equivalent ($100k) profit. From the 2002 trough to
  the end of 2015, B gained $25.0k in 13 years.

**VGT 2005–2015: trapped at reduced size.**
- From the close of 2008-01-08 onward, B's DD never fell below $10k. The closest was $10,400 on 2008-01-10; after the
  2009 trough the best was $17,335, on 2012-09-14. So its last $100k entry was 2008-01-04.
- It spent 64% of all sessions at $50k or $25k, and ends the data at $50k.

**2016–2026:** not trapped. B exits the reduced tiers within 158 days (VGT) and 450 days (QQQ). However, on QQQ it
did not regain full size until 2025-09-15.

### Q6. Does it protect capital but prevent recovery?

**Pre-2015 datasets: yes, on both counts.**

| Dataset | Lowest cumulative P&L A → B | Gain from that low to the end of data A → B | B's share of A's recovery |
|---|---|---|---:|
| VGT_2005_2015 | −49,713 → −20,045 | +61,315 → +19,439 | 32% |
| QQQ_1999_2015 | −102,735 → −15,199 | +99,849 → +24,963 | 25% |

- **Protection:** B kept QQQ well above −$100k, and roughly halved or better the bear-window losses (§5).
- **Recovery:** it then participated in the recoveries at a quarter to a third of the baseline. The never-resetting
  peak kept it at reduced size for the rest of each dataset.
- **Overall:**
  - On VGT 2005–2015 the protection cost more than it saved: −$606 vs +$11,602.
  - On QQQ 1999–2015 it netted +$12.6k vs A. That is the small difference between $241.8k saved on losing trades and
    $229.2k forgone on winners (§8).

**2016–2026: partly.** The drawdowns were mild enough that B never reached the $25k tier, and it returned to full
size. Even so:
- it earned 43–78% of A in the recovery windows;
- it lost 36% (VGT) and 30% (QQQ) of A's net profit for a 23–24% drawdown cut;
- it did worse than a constant smaller size on both profit and drawdown (§4).

### Q7. No double-counting

Verified; see §2.3. The daily P&L series is continuous across all 470 exits in the eight runs (A and B). A trade's
realized P&L equals the sum of its daily MTM changes. It is not added again at exit.

---

## 8. Dependence on a few trades or one event

B takes exactly A's trades, so B − A = Σ (size ÷ $100k − 1) × A's P&L, trade by trade.

| Dataset | Reduced-size trades | B − A | Saved on A's losing trades | Forgone on A's winning trades |
|---|---:|---:|---:|---:|
| VGT_2005_2015 | 45 of 48 | −12,208 | +49,599 | −61,808 |
| QQQ_1999_2015 | 102 of 109 | +12,649 | +241,805 | −229,155 |
| VGT_2016_2026 | 32 of 45 | −58,231 | +20,606 | −78,836 |
| QQQ_2016_2026 | 32 of 36 | −35,194 | +23,455 | −58,650 |

Largest single contributors (B size; A P&L → B P&L; difference):

- **VGT_2005_2015.**
  - Costs: 2009-03-11 ($25k; 21,725 → 5,431; −16,293); 2010-08-31 ($25k; 18,141 → 4,535; −13,606); 2011-11-23 ($50k;
    −6,861).
  - Gains: 2008-11-03 ($25k; −14,585 → −3,646; +10,939); 2008-09-23 ($50k; −20,604 → −10,302; +10,302).
  - The net −$12.2k is driven by the post-2009 recovery winners being taken at $25k.
- **QQQ_1999_2015.**
  - Costs: **2009-03-09 ($25k; 57,832 → 14,458; −43,374)**; 2002-10-07 (−15,964); 2001-04-05 (−14,841); 2010-08-26
    (−14,416); 2003-03-06 (−13,814).
  - Gains: 2008-09-23 (+16,286); 2001-02-14 (+14,021); 2001-09-05 (+13,149); 2001-03-20 (+10,819); 2001-01-29
    (+10,812).
  - The +$12.6k net is about 5% of either gross figure, so it is fragile: the single 2009-03-09 trade alone (−$43.4k)
    is 3.4 times the net.
  - It also depends on the dataset starting 13 months before the dot-com top. B traded at $100k through the 1999
    run-up, setting its peak (+$46.8k), and only then downsized.
- **VGT_2016_2026.**
  - One trade, **2020-04-03 at $50k (50,533 → 25,267), explains −$25,267, or 43% of the −$58.2k.**
  - Next: 2023-01-04 at $50k (−14,003), 2025-04-11 at $75k (−8,928), 2018-12-26 at $50k (−8,564).
  - The largest gain is +$3,604 (2022-09-15).
- **QQQ_2016_2026.**
  - The 2020-03-19 trade at $75k (−13,175) and the 2025-04-17 trade at $50k (−12,712) explain 73% of the −$35.2k.
  - The largest gain is +$3,549 (2022-09-14).

**Pattern.** The breaker's gains are many small savings on bear-market losers. Its costs are concentrated in the one
or two large rebound winners per recovery, which by construction occur when the strategy's drawdown is deepest.

---

## 9. Preliminary classification: **Unpromising**

### Historical observations (from the price data, not the backtest)

- QQQ's adjusted close fell 83.0% from 2000-03-27 to 2002-10-09, and 53.4% from 2007-10-31 to 2008-11-20.
- VGT fell 54.8% over 2007-10-31 → 2008-11-20.
- Both fell 35.1% in 2021–22.
- Sharp rebounds followed the late-2002, early-2009, March-2020, late-2022 and early-April-2025 lows.

### Backtest calculations

- **Absolute drawdown.** B cuts max DD by 46%, 59%, 24% and 23%, and losses in the losing bear windows by
  28%–79%. It keeps QQQ
  1999–2015 above −$100k (lowest point −$15.2k vs −$102.7k).
- **Profit.**
  - B's net profit is lower than A's on 3 of 4 datasets: −$12.2k, −$58.2k and −$35.2k. It is higher on QQQ 1999–2015
    (+$12.6k).
  - Profit/DD is lower on 3 of 4: −0.17, −0.69 and −0.29; it is +0.18 on QQQ 1999–2015.
- **Matched-exposure control.**
  - B earns less on 3 of 4 datasets.
  - B's max DD is higher on 3 of 4 (+$583, +$2,272, +$18,967), and lower only on VGT 2005–2015 (−$2,481).
- **Recovery windows.** B earns 25% of A in 2003 and 2009, and 43%–78% in 2020/2023/2025.
- **Trapping.**
  - QQQ 1999–2015 is at $25k from 2000-10-09 to the end (15.2 years) and never exits.
  - VGT 2005–2015 never returns to $100k after January 2008, and ends at $50k.
- **Trade quality by tier.** In the 2016–2026 datasets, per $100k, the entries B took at $50k were its most or second
  most profitable group.

### Inferences (drawn from the calculations above)

- **Absolute drawdown.** The breaker reduces it mainly by reducing average exposure. Equal exposure at a constant
  size reduces drawdown about as much or more, and keeps more profit. So the drawdown measure adds no risk-adjusted
  value on these data.
- **Structural minimum drawdown.** It cannot limit the first $20–30k of a drawdown, because a single full-size trade
  can lose about $20k before the next entry is resized. In each dataset, 34–50% of B's max drawdown accrued while
  holding $100k.
- **Pro-cyclical sizing.** Because the peak never resets, sizing is pro-cyclical with respect to the strategy's own
  equity. It is smallest exactly when the dip-buying signal produces its largest winners, the post-bear rebounds.
- **Start-date dependence.** The one dataset where profit/DD improves (QQQ 1999–2015) owes it to a specific path: a
  profitable full-size run-up in 1999, then a multi-year bear. The result depends on where the dataset starts
  relative to the market peak.

### Hypotheses (not tested here)

- **Mean reversion of the strategy's equity.** For a long-only dip-buying strategy, the strategy's own drawdown is
  highest near market lows, where the strategy's forward returns are highest. If so, de-risking based on the equity
  curve is systematically counterproductive for this strategy, not just on these samples.
- **A resetting or decaying peak.** A peak that resets, or a drawdown measured over a rolling window, might avoid the
  multi-year traps. This would be a new configuration and was not run.

### Limitations

- **Few independent episodes.** There are effectively three or four distinct bear/recovery episodes, on two highly
  correlated tech ETFs. VGT and QQQ 2016–2026 are close to duplicates (both fell 35.1% in 2021–22).
- **Absolute thresholds.** The thresholds are fixed dollar amounts, not scaled to price volatility, account equity or
  time. Results hinge on small margins at the boundaries (the $446 and $727 cases in Q4).
- **The matched control is ex post.** Its fixed size is chosen to equal B's realized dollar-days, which a trader
  could not know in advance. It isolates the timing of exposure, not a tradable alternative.
- **Path dependence.** The never-resetting peak makes outcomes depend on the dataset's start date.
  - VGT 2005–2015's peak comes from its first trade's unrealized high.
  - QQQ 1999–2015's peak comes from the dot-com top.
- **Open positions at the end.** Three datasets end with an open position, marked at the last close. There is no
  account-equity, margin-call or tax modelling, as in the baseline.

**Classification rationale.**
- On the decisive test (beyond deleveraging), B fails in 3 of 4 datasets. In the fourth it gains profit but has a
  worse drawdown.
- It shows the trap the specification asked about: 15 years at minimum size on QQQ, and 7.7 years without full size
  on VGT 2005–2015.
- It forgoes 22–75% of recovery-window P&L.

The drawdown reductions are real in absolute terms, but they are matched or beaten by simply trading smaller.

---

## 10. Parameters to flag for a later, separately authorised robustness study (not run)

1. **Tier thresholds:** $10k / $20k / $30k. Results are sensitive at the boundaries; two decisive 2020 entries were
   within $750 of $20k.
2. **Tier sizes:** $75k / $50k / $25k, including the depth of the floor tier.
3. **Peak definition:**
   - never reset (as specified) vs reset after a new high or after N sessions;
   - a rolling-window peak;
   - a decaying drawdown.
4. **Drawdown basis:** MTM including give-back of open profit (as specified) vs realized-only vs closed-trade equity.
5. **Scaling:** thresholds as a % of the base size, of a volatility measure, or of account equity, instead of fixed
   dollars.
6. **Start-date sensitivity:** the same rule run from staggered start dates, because the peak is initialised at the
   dataset's start.
7. **Additional instruments and periods** that are less correlated with VGT and QQQ, to obtain more independent
   bear/recovery episodes.
