# Portfolio simulation: the $300,000 VOOG/VGT account, 2016-01-04 → 2025-10-13

Track IV of the brief. Every figure comes from the files named beside it under `results/`; the commands that
produce them are `npm run shared-margin -- run`, `-- comparator`, `-- audit-ledger` and `-- report`. Evidence
grades: **reproduced** (equals a committed earlier figure), **computed** (this ledger on observed prices),
**sensitivity** (a predeclared variation), **comparator** (a constructed benchmark, not a validation of skill).
Everything is an inspected historical backtest on data every earlier program has already examined.

## 1. Methodology (PROTOCOL.md §2–§4)

- **Start**: $300,000 at the 2016-01-04 close. VGT's closing print 106.61 buys 1,125.5980 shares for $120,000;
  VOOG has no closing print that day, so its last regular trade 101.89 buys 1,766.6111 shares for $180,000. No
  cash, no debt. Fractional shares at full precision (scenario B-whole is the whole-share sensitivity).
- **Dividends**: the 78-record VOOG/VGT distribution ledger (39 each, 2016-03-21 → 2025-09-24, derived by the
  earlier `vgt-portfolio-margin` study from the raw/adjusted price ratio; three 2016 VOOG amounts and all pay
  dates estimated). Shares held at the previous close are entitled on the ex-date; the receivable is paid on the
  pay date and buys the same ETF at that session's close into core. Dividends on an open margin lot go to core
  VGT and are reported separately (B: $4,464 of $81,341 total dividends; `results/scenarios/B/dividends.csv`).
- **Margin lots**: every entry borrows **20% of equity measured at the decision minute** (VGT at the decision
  minute's close, VOOG at the close of its last completed minute, lots at the decision price, liabilities with
  interest through the session date). The principal buys `principal / fill price` shares at the strategy's own
  fill. 11% simple interest per calendar day from the entry session date, a liability while it accrues, paid
  from the proceeds at exit. Borrowing adds equal assets and liabilities: equity is unchanged at the entry.
- **Exit booking**: proceeds repay principal and interest; `net = proceeds − principal − interest` equals the
  strategy's own trade profit. A positive net buys VOOG (60%) and VGT (40%) at the earliest causally executable
  trades after the exit fill — VGT at the next minute's opening trade (or the closing print, or the next
  session's open), VOOG at its own first trade at or after the same time. A loss is funded by selling core VOOG
  and VGT in proportion to their market values at the same executable trades. Existing holdings are never
  rebalanced in the primary policy (`B-rebalance` is the sensitivity).
- **Not modelled**: taxes, fees, deposits, withdrawals, spreads and slippage (DEPLOYMENT_RISK.md carries the
  cost grid), month-end interest capitalization (PROTOCOL.md amendment A3).
- **Eligibility**: no strategy may arm before session 365, **2017-06-15**. Between the 2016-01-04 close and
  2017-06-14 every scenario is buy-and-hold; the first margin trade of any scenario is swing-low's 2018-02-09
  entry (S and the C scenarios) and D1's 2018-12-21 entry (B, B2, B3). The year-by-year tables therefore show
  identical 2016 and 2017 rows for every scenario.
- **End**: 2025-10-13. An open lot is marked at the close with its accrued interest as a liability; its
  unrealized profit is never reinvested.
- **Sampling**: daily-close figures are exact and are the headline. Minute-sampled figures use every minute
  either ETF traded, each at its last observed trade (VOOG forward-filled, never interpolated; VOOG trades in a
  median 149 of 390 minutes) and are labelled "minute-sampled".

## 2. Headline results

From `results/tables/scenario_comparison.md` (`results/scenario_summary.csv`). CAGR over the exact span of
9.774 years (2016-01-04 → 2025-10-13). "vs A" is the end-equity increment over buy-and-hold.

| Scenario | End equity | vs A | CAGR | Daily max DD (peak→trough, recovered) | Minute-sampled max DD | Strategy net (realized + unrealized) | Trades | Interest | Dividends | Min equity/LMV | Max LMV/equity | Core turnover | Grade |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| A — buy and hold 60/40 | $1,784,588 | — | 20.01% | $386,774 (33.9%), 2021-12-27→2022-10-14, recovered 2024-01-19 | $434,474 (28.0%) | — | 0 | $0 | $67,393 | 100% | 1.000× | $0 | reproduced (0.75 × the committed $400k study) |
| B — D1, 20% | $2,346,272 | +$561,684 (31.5%) | 23.42% | $484,116 (25.3%), 2025-01-23→2025-04-08, recovered 2025-05-16 | $561,090 (29.3%) | +$314,382 (+$172,969 + $141,413 open) | 20, 1 open | $55,902 | $81,341 | 82.0% (2020-03-16) | 1.219× | $215,738 | computed |
| B2 — gross-breakeven D1 | $2,346,272 | +$561,684 (31.5%) | 23.42% | $484,116 (25.3%), same dates | $561,090 (29.3%) | +$314,382 | 20, 1 open | $55,902 | $81,341 | 82.0% | 1.219× | $215,738 | computed; identical to B to the cent |
| B3 — D1 with P 8.6% | $2,345,129 | +$560,541 (31.4%) | 23.42% | $483,877 (25.3%), same dates | $560,813 (29.3%) | +$313,512 | 20, 1 open | $55,906 | $81,338 | 82.0% | 1.219× | $217,682 | computed; −$1,143 vs B |
| S — swing-low alone | $2,196,707 | +$412,119 (23.1%) | 22.59% | $503,358 (26.3%), 2025-02-18→2025-04-08, recovered 2025-06-24 | $578,645 (30.2%) | +$197,122 (all realized) | 32 | $37,191 | $78,295 | 81.8% (2018-12-24) | 1.222× | $262,633 | computed |
| P1 — D1 priority (displacement) | $2,383,061 | +$598,473 (33.5%) | 23.62% | $515,970 (26.3%), 2025-02-18→2025-04-08 | $593,261 (30.1%) | +$374,054 | 48, 1 open | $92,763 | $83,871 | 81.9% | 1.220× | $500,056 | computed |
| P2 — first signal wins (hold) | $2,376,575 | +$591,987 (33.2%) | 23.58% | $514,086 (26.3%), 2025-02-18→2025-04-08 | $591,054 (30.2%) | +$361,178 | 40, 1 open | $91,360 | $84,017 | 78.9% (2020-03-23) | 1.267× | $450,818 | computed |
| P2c — first signal wins (cancel) | $2,493,788 | +$709,200 (39.7%) | 24.19% | $542,002 (26.3%) | $623,148 (30.2%) | +$416,369 | 37, 1 open | $78,848 | $84,387 | 81.8% | 1.222× | $372,311 | computed (semantics sensitivity) |
| P2s — first signal wins (shadow) | $2,567,929 | +$783,341 (43.9%) | 24.57% | $558,017 (26.3%) | $641,584 (30.2%) | +$447,899 | 38, 1 open | $87,493 | $86,472 | 81.8% | 1.222× | $400,356 | computed (semantics sensitivity) |
| P3 — dedicated split 10% + 10% | $2,273,611 | +$489,023 (27.4%) | 23.02% | $492,573 (25.8%) | $567,836 (29.6%) | +$257,111 | 52, 1 open | $46,673 | $79,857 | 82.3% | 1.215× | $240,791 | computed |
| P4 — dynamic sharing | $2,376,575 | +$591,987 (33.2%) | 23.58% | $514,086 (26.3%) | $591,054 (30.2%) | +$361,178 | 40, 1 open | $91,360 | $84,017 | 78.9% | 1.267× | $450,818 | computed; identical trades to P2 |
| P5-T1 — D1 takeover, continuous accounting | $2,419,970 | +$635,382 (35.6%) | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,352 | 43, 1 open | $92,302 | $84,471 | 80.7% (2020-03-12) | 1.239× | $479,474 | computed |
| P5-T2a — takeover, reset reference | $2,419,970 | +$635,382 (35.6%) | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,352 | 43, 1 open | $92,302 | $84,471 | 80.7% | 1.239× | $479,474 | computed; identical to T1 |
| P5-T2b — takeover, reset + restarted hold clock | $2,457,294 | +$672,706 (37.7%) | 24.01% | $532,038 (26.3%) | $611,723 (30.1%) | +$407,700 | 41, 1 open | $93,925 | $85,228 | 79.7% | 1.255× | $457,442 | computed (sensitivity) |
| P5-T1-B2 — takeover with gross-breakeven D1 | $2,419,724 | +$635,136 (35.6%) | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,177 | 43, 1 open | $92,301 | $84,471 | 80.7% | 1.239× | $479,634 | computed |

Three identities deserve a sentence each. **B2 equals B to the cent**: the gross-breakeven latch and D1's
re-decided net-profit test chose the same exit on every one of the 20 trades, as the earlier program found
(BASELINE_REPRODUCTION.md §2; DEPLOYMENT_RISK.md §8 says where they would differ). **P4 equals P2**: under the
dynamic rule the first entrant always takes the whole 20% allowance and there are no top-ups, so the second
strategy is always refused — dynamic sharing degenerates to first-signal-wins. **P5-T1 equals P5-T2a**: every
transferred swing lot was either in loss (D1's net-profit stop is inactive below cost whatever the reference
high) or had both the T1 and the T2 stop below cost, so the maximum-hold exit decided every transferred lot
identically; T2b differs only because its hold clock restarts at the takeover (SHARED_MARGIN_POLICIES.md).

## 3. Year by year

`results/tables/annual.md`, from `results/annual_portfolio.csv`. Year-end equity and the year's return; 2016 runs
from the 2016-01-04 close, 2025 ends 2025-10-13. No strategy trades before 2017-06-15.

### Equity by scenario

| Year | A | B | B2 | B3 | S | P2 | P3 | P4 | P5-T1 | P5-T2a |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) | $334,475 (11.5%) |
| 2017 | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) | $439,021 (31.3%) |
| 2018 | $443,190 (0.9%) | $446,352 (1.7%) | $446,352 (1.7%) | $446,352 (1.7%) | $451,175 (2.8%) | $451,175 (2.8%) | $448,772 (2.2%) | $451,175 (2.8%) | $450,634 (2.6%) | $450,634 (2.6%) |
| 2019 | $614,760 (38.7%) | $653,794 (46.5%) | $653,794 (46.5%) | $653,794 (46.5%) | $647,039 (43.4%) | $671,846 (48.9%) | $650,483 (44.9%) | $671,846 (48.9%) | $669,184 (48.5%) | $669,184 (48.5%) |
| 2020 | $856,441 (39.3%) | $1,013,231 (55.0%) | $1,013,231 (55.0%) | $1,014,042 (55.1%) | $943,733 (45.9%) | $999,711 (48.8%) | $978,566 (50.4%) | $999,711 (48.8%) | $990,286 (48.0%) | $990,286 (48.0%) |
| 2021 | $1,123,700 (31.2%) | $1,335,552 (31.8%) | $1,335,552 (31.8%) | $1,336,621 (31.8%) | $1,271,240 (34.7%) | $1,366,249 (36.7%) | $1,303,978 (33.3%) | $1,366,249 (36.7%) | $1,353,384 (36.7%) | $1,353,384 (36.7%) |
| 2022 | $791,250 (-29.6%) | $980,859 (-26.6%) | $980,859 (-26.6%) | $980,387 (-26.7%) | $915,095 (-28.0%) | $936,349 (-31.5%) | $948,208 (-27.3%) | $936,349 (-31.5%) | $954,805 (-29.5%) | $954,805 (-29.5%) |
| 2023 | $1,116,262 (41.1%) | $1,380,571 (40.8%) | $1,380,571 (40.8%) | $1,379,897 (40.8%) | $1,331,983 (45.6%) | $1,361,646 (45.4%) | $1,357,332 (43.1%) | $1,361,646 (45.4%) | $1,388,005 (45.4%) | $1,388,005 (45.4%) |
| 2024 | $1,477,931 (32.4%) | $1,829,174 (32.5%) | $1,829,174 (32.5%) | $1,828,284 (32.5%) | $1,809,194 (35.8%) | $1,850,009 (35.9%) | $1,820,920 (34.2%) | $1,850,009 (35.9%) | $1,886,020 (35.9%) | $1,886,020 (35.9%) |
| 2025 | $1,784,588 (20.7%) | $2,346,272 (28.3%) | $2,346,272 (28.3%) | $2,345,129 (28.3%) | $2,196,707 (21.4%) | $2,376,575 (28.5%) | $2,273,611 (24.9%) | $2,376,575 (28.5%) | $2,419,970 (28.3%) | $2,419,970 (28.3%) |

### A — buy and hold

| Year | Equity | Return | Core VOOG | Core VGT | Lot MTM | Debt (principal) | Accrued interest | Cum. interest | Strategy realized (year) | Strategy unrealized | Cum. dividends | Cash | Receivables | Entries/exits | Max DD in year | Min equity/LMV |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 (2016-12-30) | $334,475 | 11.5% | $195,804 | $138,671 | $0 | $0 | $0 | $0 | +$0 | +$0 | $4,551 | −$0 | $0 | 0/0 | $30,474 | 100.0% |
| 2017 (2017-12-29) | $439,021 | 31.3% | $248,915 | $190,106 | $0 | $0 | $0 | $0 | +$0 | +$0 | $9,605 | −$0 | $0 | 0/0 | $13,142 | 100.0% |
| 2018 (2018-12-31) | $443,190 | 0.9% | $248,378 | $194,812 | $0 | $0 | $0 | $0 | +$0 | +$0 | $15,399 | −$0 | $0 | 0/0 | $116,236 | 100.0% |
| 2019 (2019-12-31) | $614,760 | 38.7% | $325,202 | $289,557 | $0 | $0 | $0 | $0 | +$0 | +$0 | $22,676 | −$0 | $0 | 0/0 | $45,341 | 100.0% |
| 2020 (2020-12-31) | $856,441 | 39.3% | $433,615 | $422,826 | $0 | $0 | $0 | $0 | +$0 | +$0 | $29,953 | −$0 | $0 | 0/0 | $214,074 | 100.0% |
| 2021 (2021-12-31) | $1,123,700 | 31.2% | $572,102 | $551,598 | $0 | $0 | $0 | $0 | +$0 | +$0 | $36,520 | −$0 | $0 | 0/0 | $88,722 | 100.0% |
| 2022 (2022-12-30) | $791,250 | -29.6% | $403,427 | $387,823 | $0 | $0 | $0 | $0 | +$0 | +$0 | $43,778 | −$0 | $0 | 0/0 | $378,197 | 100.0% |
| 2023 (2023-12-29) | $1,116,262 | 41.1% | $524,244 | $592,018 | $0 | $0 | $0 | $0 | +$0 | +$0 | $53,435 | −$0 | $0 | 0/0 | $113,000 | 100.0% |
| 2024 (2024-12-31) | $1,477,931 | 32.4% | $712,382 | $765,549 | $0 | $0 | $0 | $0 | +$0 | +$0 | $61,463 | −$0 | $0 | 0/0 | $199,775 | 100.0% |
| 2025 (2025-10-13) | $1,784,588 | 20.7% | $851,153 | $933,435 | $0 | $0 | $0 | $0 | +$0 | +$0 | $67,393 | −$0 | $0 | 0/0 | $381,488 | 100.0% |

### B — D1 only

| Year | Equity | Return | Core VOOG | Core VGT | Lot MTM | Debt (principal) | Accrued interest | Cum. interest | Strategy realized (year) | Strategy unrealized | Cum. dividends | Cash | Receivables | Entries/exits | Max DD in year | Min equity/LMV |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 (2016-12-30) | $334,475 | 11.5% | $195,804 | $138,671 | $0 | $0 | $0 | $0 | +$0 | +$0 | $4,551 | −$0 | $0 | 0/0 | $30,474 | 100.0% |
| 2017 (2017-12-29) | $439,021 | 31.3% | $248,915 | $190,106 | $0 | $0 | $0 | $0 | +$0 | +$0 | $9,605 | −$0 | $0 | 0/0 | $13,142 | 100.0% |
| 2018 (2018-12-31) | $446,352 | 1.7% | $248,378 | $194,812 | $89,006 | $85,586 | $258 | $258 | +$0 | +$3,162 | $15,399 | −$0 | $0 | 1/0 | $119,307 | 82.7% |
| 2019 (2019-12-31) | $653,794 | 46.5% | $337,155 | $299,436 | $131,152 | $109,083 | $4,865 | $8,554 | +$17,438 | +$17,203 | $23,988 | $0 | $0 | 1/1 | $53,502 | 83.2% |
| 2020 (2020-12-31) | $1,013,231 | 55.0% | $508,976 | $479,280 | $201,201 | $172,891 | $3,335 | $19,606 | +$83,773 | +$24,975 | $32,856 | −$0 | $0 | 5/5 | $239,550 | 82.0% |
| 2021 (2021-12-31) | $1,335,552 | 31.8% | $694,578 | $640,973 | $0 | $0 | $0 | $26,314 | +$29,324 | +$0 | $40,997 | $0 | $0 | 1/2 | $117,135 | 83.4% |
| 2022 (2022-12-30) | $980,859 | -26.6% | $514,125 | $466,734 | $0 | $0 | $0 | $38,551 | +$45,324 | +$0 | $51,097 | $0 | $0 | 9/9 | $427,604 | 82.7% |
| 2023 (2023-12-29) | $1,380,571 | 40.8% | $668,094 | $712,478 | $0 | $0 | $0 | $38,551 | +$0 | +$0 | $63,134 | $0 | $0 | 0/0 | $138,902 | 100.0% |
| 2024 (2024-12-31) | $1,829,174 | 32.5% | $907,856 | $921,318 | $0 | $0 | $0 | $38,551 | +$0 | +$0 | $73,042 | $0 | $0 | 0/0 | $246,626 | 100.0% |
| 2025 (2025-10-13) | $2,346,272 | 28.3% | $1,083,104 | $1,121,756 | $460,039 | $302,751 | $15,876 | $55,902 | −$2,890 | +$141,413 | $81,341 | $0 | $0 | 3/2 | $484,116 | 82.7% |

### B2 — gross-breakeven D1

| Year | Equity | Return | Core VOOG | Core VGT | Lot MTM | Debt (principal) | Accrued interest | Cum. interest | Strategy realized (year) | Strategy unrealized | Cum. dividends | Cash | Receivables | Entries/exits | Max DD in year | Min equity/LMV |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 (2016-12-30) | $334,475 | 11.5% | $195,804 | $138,671 | $0 | $0 | $0 | $0 | +$0 | +$0 | $4,551 | −$0 | $0 | 0/0 | $30,474 | 100.0% |
| 2017 (2017-12-29) | $439,021 | 31.3% | $248,915 | $190,106 | $0 | $0 | $0 | $0 | +$0 | +$0 | $9,605 | −$0 | $0 | 0/0 | $13,142 | 100.0% |
| 2018 (2018-12-31) | $446,352 | 1.7% | $248,378 | $194,812 | $89,006 | $85,586 | $258 | $258 | +$0 | +$3,162 | $15,399 | −$0 | $0 | 1/0 | $119,307 | 82.7% |
| 2019 (2019-12-31) | $653,794 | 46.5% | $337,155 | $299,436 | $131,152 | $109,083 | $4,865 | $8,554 | +$17,438 | +$17,203 | $23,988 | $0 | $0 | 1/1 | $53,502 | 83.2% |
| 2020 (2020-12-31) | $1,013,231 | 55.0% | $508,976 | $479,280 | $201,201 | $172,891 | $3,335 | $19,606 | +$83,773 | +$24,975 | $32,856 | −$0 | $0 | 5/5 | $239,550 | 82.0% |
| 2021 (2021-12-31) | $1,335,552 | 31.8% | $694,578 | $640,973 | $0 | $0 | $0 | $26,314 | +$29,324 | +$0 | $40,997 | $0 | $0 | 1/2 | $117,135 | 83.4% |
| 2022 (2022-12-30) | $980,859 | -26.6% | $514,125 | $466,734 | $0 | $0 | $0 | $38,551 | +$45,324 | +$0 | $51,097 | $0 | $0 | 9/9 | $427,604 | 82.7% |
| 2023 (2023-12-29) | $1,380,571 | 40.8% | $668,094 | $712,478 | $0 | $0 | $0 | $38,551 | +$0 | +$0 | $63,134 | $0 | $0 | 0/0 | $138,902 | 100.0% |
| 2024 (2024-12-31) | $1,829,174 | 32.5% | $907,856 | $921,318 | $0 | $0 | $0 | $38,551 | +$0 | +$0 | $73,042 | $0 | $0 | 0/0 | $246,626 | 100.0% |
| 2025 (2025-10-13) | $2,346,272 | 28.3% | $1,083,104 | $1,121,756 | $460,039 | $302,751 | $15,876 | $55,902 | −$2,890 | +$141,413 | $81,341 | $0 | $0 | 3/2 | $484,116 | 82.7% |

### B3 — D1 with P 8.6%

| Year | Equity | Return | Core VOOG | Core VGT | Lot MTM | Debt (principal) | Accrued interest | Cum. interest | Strategy realized (year) | Strategy unrealized | Cum. dividends | Cash | Receivables | Entries/exits | Max DD in year | Min equity/LMV |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 (2016-12-30) | $334,475 | 11.5% | $195,804 | $138,671 | $0 | $0 | $0 | $0 | +$0 | +$0 | $4,551 | −$0 | $0 | 0/0 | $30,474 | 100.0% |
| 2017 (2017-12-29) | $439,021 | 31.3% | $248,915 | $190,106 | $0 | $0 | $0 | $0 | +$0 | +$0 | $9,605 | −$0 | $0 | 0/0 | $13,142 | 100.0% |
| 2018 (2018-12-31) | $446,352 | 1.7% | $248,378 | $194,812 | $89,006 | $85,586 | $258 | $258 | +$0 | +$3,162 | $15,399 | −$0 | $0 | 1/0 | $119,307 | 82.7% |
| 2019 (2019-12-31) | $653,794 | 46.5% | $337,155 | $299,436 | $131,152 | $109,083 | $4,865 | $8,554 | +$17,438 | +$17,203 | $23,988 | $0 | $0 | 1/1 | $53,502 | 83.2% |
| 2020 (2020-12-31) | $1,014,042 | 55.1% | $509,435 | $479,612 | $201,362 | $173,029 | $3,337 | $19,613 | +$84,325 | +$24,995 | $32,863 | $0 | $0 | 5/5 | $239,154 | 82.0% |
| 2021 (2021-12-31) | $1,336,621 | 31.8% | $695,203 | $641,419 | $0 | $0 | $0 | $26,326 | +$29,348 | +$0 | $41,011 | $0 | $0 | 1/2 | $117,227 | 83.4% |
| 2022 (2022-12-30) | $980,387 | -26.7% | $513,924 | $466,464 | $0 | $0 | $0 | $38,565 | +$43,945 | +$0 | $51,109 | $0 | $0 | 9/9 | $429,123 | 82.7% |
| 2023 (2023-12-29) | $1,379,897 | 40.8% | $667,833 | $712,064 | $0 | $0 | $0 | $38,565 | +$0 | +$0 | $63,140 | $0 | $0 | 0/0 | $138,831 | 100.0% |
| 2024 (2024-12-31) | $1,828,284 | 32.5% | $907,501 | $920,783 | $0 | $0 | $0 | $38,565 | +$0 | +$0 | $73,043 | $0 | $0 | 0/0 | $246,504 | 100.0% |
| 2025 (2025-10-13) | $2,345,129 | 28.3% | $1,082,680 | $1,121,105 | $459,817 | $302,604 | $15,868 | $55,906 | −$2,888 | +$141,345 | $81,338 | $0 | $0 | 3/2 | $483,877 | 82.7% |

### P5-T1 — D1 takeover (T1)

| Year | Equity | Return | Core VOOG | Core VGT | Lot MTM | Debt (principal) | Accrued interest | Cum. interest | Strategy realized (year) | Strategy unrealized | Cum. dividends | Cash | Receivables | Entries/exits | Max DD in year | Min equity/LMV |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 (2016-12-30) | $334,475 | 11.5% | $195,804 | $138,671 | $0 | $0 | $0 | $0 | +$0 | +$0 | $4,551 | −$0 | $0 | 0/0 | $30,474 | 100.0% |
| 2017 (2017-12-29) | $439,021 | 31.3% | $248,915 | $190,106 | $0 | $0 | $0 | $0 | +$0 | +$0 | $9,605 | −$0 | $0 | 0/0 | $13,142 | 100.0% |
| 2018 (2018-12-31) | $450,634 | 2.6% | $250,035 | $195,358 | $89,001 | $83,635 | $126 | $2,050 | +$2,985 | +$5,241 | $15,495 | $0 | $0 | 5/4 | $123,229 | 81.8% |
| 2019 (2019-12-31) | $669,184 | 48.5% | $346,096 | $305,478 | $134,253 | $111,663 | $4,980 | $12,409 | +$27,710 | +$17,610 | $24,576 | $0 | $0 | 2/2 | $56,599 | 83.0% |
| 2020 (2020-12-31) | $990,286 | 48.0% | $497,573 | $468,303 | $196,645 | $168,976 | $3,259 | $23,707 | +$58,415 | +$24,410 | $33,798 | $0 | $0 | 6/6 | $268,174 | 80.7% |
| 2021 (2021-12-31) | $1,353,384 | 36.7% | $707,466 | $645,918 | $0 | $0 | $0 | $37,985 | +$72,846 | +$0 | $42,213 | $0 | $0 | 3/4 | $114,479 | 83.2% |
| 2022 (2022-12-30) | $954,805 | -29.5% | $503,634 | $451,171 | $0 | $0 | $0 | $55,357 | +$3,840 | +$0 | $52,644 | $0 | $0 | 16/16 | $467,850 | 81.6% |
| 2023 (2023-12-29) | $1,388,005 | 45.4% | $657,244 | $691,739 | $277,676 | $233,931 | $4,723 | $62,146 | +$4,249 | +$39,022 | $65,358 | $0 | $0 | 3/2 | $135,305 | 83.0% |
| 2024 (2024-12-31) | $1,886,020 | 35.9% | $952,558 | $933,463 | $0 | $0 | $0 | $68,812 | +$80,761 | +$0 | $75,435 | $0 | $0 | 2/3 | $239,397 | 82.8% |
| 2025 (2025-10-13) | $2,419,970 | 28.3% | $1,137,480 | $1,136,527 | $474,842 | $312,492 | $16,387 | $92,302 | −$2,416 | +$145,963 | $84,471 | $0 | $0 | 6/5 | $523,920 | 82.1% |

### P2 — first signal wins

| Year | Equity | Return | Core VOOG | Core VGT | Lot MTM | Debt (principal) | Accrued interest | Cum. interest | Strategy realized (year) | Strategy unrealized | Cum. dividends | Cash | Receivables | Entries/exits | Max DD in year | Min equity/LMV |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2016 (2016-12-30) | $334,475 | 11.5% | $195,804 | $138,671 | $0 | $0 | $0 | $0 | +$0 | +$0 | $4,551 | −$0 | $0 | 0/0 | $30,474 | 100.0% |
| 2017 (2017-12-29) | $439,021 | 31.3% | $248,915 | $190,106 | $0 | $0 | $0 | $0 | +$0 | +$0 | $9,605 | −$0 | $0 | 0/0 | $13,142 | 100.0% |
| 2018 (2018-12-31) | $451,175 | 2.8% | $254,048 | $198,512 | $90,599 | $91,598 | $386 | $2,062 | +$9,744 | −$1,386 | $15,495 | $0 | $0 | 4/3 | $123,229 | 81.8% |
| 2019 (2019-12-31) | $671,846 | 48.9% | $347,011 | $307,156 | $134,781 | $112,101 | $5,000 | $12,973 | +$21,023 | +$17,679 | $24,658 | $0 | $0 | 3/3 | $57,778 | 82.4% |
| 2020 (2020-12-31) | $999,711 | 48.8% | $501,347 | $473,722 | $198,509 | $170,578 | $3,290 | $24,539 | +$60,059 | +$24,641 | $33,957 | $0 | $0 | 4/4 | $269,125 | 78.9% |
| 2021 (2021-12-31) | $1,366,249 | 36.7% | $712,930 | $653,319 | $0 | $0 | $0 | $38,953 | +$73,537 | +$0 | $42,454 | $0 | $0 | 3/4 | $115,592 | 83.2% |
| 2022 (2022-12-30) | $936,349 | -31.5% | $491,871 | $444,478 | $0 | $0 | $0 | $54,432 | −$26,343 | +$0 | $52,775 | $0 | $0 | 15/15 | $500,413 | 81.3% |
| 2023 (2023-12-29) | $1,361,646 | 45.4% | $641,906 | $681,464 | $272,367 | $229,458 | $4,633 | $61,091 | +$4,168 | +$38,276 | $65,234 | $0 | $0 | 3/2 | $132,860 | 83.0% |
| 2024 (2024-12-31) | $1,850,009 | 35.9% | $930,578 | $919,431 | $0 | $0 | $0 | $67,630 | +$79,217 | +$0 | $75,122 | $0 | $0 | 2/3 | $234,917 | 82.8% |
| 2025 (2025-10-13) | $2,376,575 | 28.5% | $1,118,599 | $1,124,988 | $467,770 | $317,555 | $17,226 | $91,360 | +$6,786 | +$132,988 | $84,017 | $0 | $0 | 6/5 | $514,086 | 82.1% |

### Reading B's years

- **2016–2017**: identical to A in every scenario; nothing may arm before 2017-06-15, and D1's first arming
  does not come before the 2018 Q4 decline anyway.
- **2018**: one entry, 2018-12-21 at 160.42 with $85,586 (20.0% of $427,929 equity at the decision), open at
  year-end with +$3,162 unrealized; the year's minimum equity/LMV is 82.7%.
- **2019**: that lot exits 2019-05-13 at 200.02 (+$17,438); the continuation entry of 2019-08-05 ($109,083) is
  open at year-end (+$17,203). B ends the year $39,034 above A.
- **2020**: five entries, five exits, **+$83,773 realized** — the 2020-04-02 → 2020-09-04 lot alone made
  $56,352 (51.4% on its $109,593 principal) — and the 2020-10-28 lot open at year-end (+$24,975). B's equity
  passes $1.0M against A's $856,441.
- **2021**: one entry, two exits (+$29,324), flat from 2021-05-11 on. B's year matches A's (31.8% vs 31.2%).
- **2022**: **nine entries, nine exits, +$45,324 realized in a −26.6% year (A: −29.6%)**. Four of the nine
  were maximum-hold losses (−$2,350, −$2,131, −$6,457, and the +$261 scratch); the 2022-07-05 → 2022-08-26
  lot made $21,331 and the 2022-11-04 → 2022-12-15 lot $12,587. The year's maximum drawdown inside B is
  $427,604 against A's $378,197 — more dollars because B's equity was larger, a smaller fraction because D1 was
  net positive.
- **2023–2024**: no entries. D1's rolling reference high never produced a 21.6% decline and no profitable exit
  opened a continuation window after 2022-12-15 (the finding of `research/vgt-recovery-eligibility`). The
  equity differences from A in these years (+$264,309 at the end of 2023, +$351,243 at the end of 2024) are
  the compounding of the core bought with earlier profits, nothing else.
- **2025**: three entries (2025-04-04, 2025-04-11, 2025-04-22 at $299,009 / $309,885 / $302,751 principal,
  all 20.0% of equity), two exits (+$3,744, −$6,633), and the 2025-04-22 lot still open on 2025-10-13 at
  755.49: **+$141,413 unrealized, counted in equity and not reinvested**. B's maximum drawdown of the whole
  run is in this year: $484,116 = 25.3% from the 2025-01-23 close to the 2025-04-08 close, recovered by
  2025-05-16 (the equity reached the 2025-01-23 level again). The lot was opened on 2025-04-22, after the
  trough.

A's maximum drawdown is the 2022 bear market (33.9%, 2021-12-27 → 2022-10-14, recovered 2024-01-19); B's is
2025 because B's 2022 drawdown, $427,604, is about 32% of its late-2021 peak and smaller in percent than A's: B's
equity going into 2022 was 19% larger and D1 added $45,324 during the fall. Both years' figures are in the
"Max DD in year" column above; the minute-sampled maximum of B ($561,090 = 29.3%, 2025-01-24 14:53Z →
2025-04-07 13:42Z, VOOG forward-filled) is a labelled diagnostic.

## 4. The 20 D1 trades under dynamic sizing

`results/tables/trades_B.md` (from `results/scenarios/B/trades.csv`). The entries and exits are exactly D1's
file trades (BASELINE_REPRODUCTION.md); only the principal changes with equity. "Adverse excursion" is the most
negative minute-low mark of the lot net of interest.

| # | Owner | Setup | Entry | Price | Principal (% equity) | Exit | Price | Reason | Days | Interest | Net | Return | Adverse excursion |
| ---: | --- | --- | --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | d1 | deep | 2018-12-21 17:35Z | 160.42 | $85,586 (20.0%) | 2019-05-13 | 200.02 | trailing stop | 143 | $3,688 | +$17,438 | 20.4% | −$3,118 |
| 2 | d1 | continuation | 2019-08-05 19:12Z | 203.65 | $109,083 (20.0%) | 2020-02-24 | 252.18 | trailing stop gap | 203 | $6,674 | +$19,322 | 17.7% | −$188 |
| 3 | d1 | continuation | 2020-02-28 14:32Z | 226.94 | $121,368 (20.0%) | 2020-03-06 | 232.86 | trailing stop | 7 | $256 | +$2,910 | 2.4% | −$1,086 |
| 4 | d1 | deep | 2020-03-12 13:32Z | 205.22 | $110,604 (20.0%) | 2020-03-20 | 198.64 | maximum hold | 8 | $267 | −$3,813 | -3.4% | −$12,170 |
| 5 | d1 | deep | 2020-03-23 13:33Z | 185.73 | $98,645 (20.0%) | 2020-04-01 | 203.18 | trailing stop | 9 | $268 | +$9,001 | 9.1% | −$3,335 |
| 6 | d1 | deep | 2020-04-02 13:33Z | 202.36 | $109,593 (20.0%) | 2020-09-04 | 315.87 | trailing stop | 155 | $5,119 | +$56,352 | 51.4% | −$1,311 |
| 7 | d1 | continuation | 2020-10-28 14:09Z | 304.01 | $172,891 (20.0%) | 2021-02-23 | 354.79 | trailing stop | 118 | $6,148 | +$22,731 | 13.1% | −$5,348 |
| 8 | d1 | continuation | 2021-03-05 16:31Z | 337.17 | $192,862 (20.0%) | 2021-05-11 | 355.50 | trailing stop gap | 67 | $3,894 | +$6,593 | 3.4% | −$349 |
| 9 | d1 | deep | 2022-03-14 18:35Z | 367.27 | $216,159 (20.0%) | 2022-04-07 | 398.20 | trailing stop | 24 | $1,563 | +$16,641 | 7.7% | −$771 |
| 10 | d1 | continuation | 2022-04-26 19:45Z | 366.26 | $218,246 (20.0%) | 2022-05-06 | 363.42 | maximum hold | 10 | $658 | −$2,350 | -1.1% | −$2,934 |
| 11 | d1 | deep | 2022-05-12 13:42Z | 332.71 | $197,222 (20.0%) | 2022-06-10 | 342.66 | trailing stop | 29 | $1,724 | +$4,172 | 2.1% | −$3,825 |
| 12 | d1 | deep | 2022-06-13 13:34Z | 328.51 | $195,209 (20.0%) | 2022-06-21 | 325.72 | maximum hold | 8 | $471 | −$2,131 | -1.1% | −$9,002 |
| 13 | d1 | deep | 2022-06-22 13:32Z | 324.92 | $193,098 (20.0%) | 2022-07-01 | 326.24 | maximum hold | 9 | $524 | +$261 | 0.1% | −$2,700 |
| 14 | d1 | deep | 2022-07-05 13:34Z | 322.29 | $192,719 (20.0%) | 2022-08-26 | 363.01 | trailing stop | 52 | $3,020 | +$21,331 | 11.1% | −$401 |
| 15 | d1 | continuation | 2022-09-16 14:03Z | 329.27 | $202,624 (20.0%) | 2022-09-26 | 319.77 | maximum hold | 10 | $611 | −$6,457 | -3.2% | −$9,006 |
| 16 | d1 | deep | 2022-10-10 15:14Z | 306.40 | $187,769 (20.0%) | 2022-11-03 | 310.69 | trailing stop | 24 | $1,358 | +$1,270 | 0.7% | −$9,230 |
| 17 | d1 | deep | 2022-11-04 13:54Z | 306.91 | $186,874 (20.0%) | 2022-12-15 | 331.37 | trailing stop | 41 | $2,309 | +$12,587 | 6.7% | −$2,028 |
| 18 | d1 | deep | 2025-04-04 13:46Z | 491.58 | $299,009 (20.0%) | 2025-04-10 | 498.62 | trailing stop | 6 | $541 | +$3,744 | 1.3% | −$24,954 |
| 19 | d1 | deep | 2025-04-11 13:36Z | 507.00 | $309,885 (20.0%) | 2025-04-21 | 497.68 | maximum hold | 10 | $934 | −$6,633 | -2.1% | −$7,040 |
| 20 | d1 | deep | 2025-04-22 13:38Z | 497.19 | $302,751 (20.0%) | open | 755.49 | open | 174 | $15,876 | +$141,413 | 46.7% | −$113 |

Strategy statistics for B (`results/tables/strategy_statistics.md`): 14 wins / 5 losses on the 19 closed trades,
best +$56,352, worst −$6,633, worst adverse excursion −$24,954 (the 2025-04-04 lot during the 2025-04-07 open),
strategy-only drawdown $28,108 daily / $40,402 minute-sampled in dynamic dollars (B-fixed100k: $15,611 /
$19,331 per $100,000, the brief's reference), exposure 36.5% of eligible sessions, borrowing dollar-days
$185.49M, average principal $185,110, maximum $309,885.

## 5. Attribution controls: what the compounding is worth

`results/tables/scenario_comparison.md`, core-policy section (sensitivities on B).

| Scenario | End equity | vs A | vs B | Daily max DD | Strategy net | Turnover | What it isolates |
|---|---:|---:|---:|---:|---:|---:|---|
| B (primary: profits reinvested 60/40, no rebalance) | $2,346,272 | +$561,684 | — | $484,116 (25.3%) | +$314,382 | $215,738 | — |
| B-noreinvest (profits kept as cash, losses still funded from core) | $2,072,019 | +$287,431 | −$274,253 | $387,960 (22.7%) | +$302,390 | $20,602 | **reinvesting the profits into the core is worth +$274,253 of B's increment**; the strategy's own net barely changes (−$11,992, from smaller later equity and so smaller lots) |
| B-fixed100k (legacy: $100,000 per entry, profits in cash) | $1,959,043 | +$174,455 | −$387,229 | $382,469 (22.8%) | +$183,044 | $10,943 | reproduces the earlier programs' $183,044 / $15,611 / $19,331 figures inside the account |
| B-rebalance (full 60/40 core rebalance after every exit) | $2,254,816 | +$470,228 | −$91,456 | $455,089 (24.7%) | +$309,014 | $330,355 | the rebalance sells the faster-growing VGT core on every exit: lower drawdown, lower end equity, 53% more turnover; in a taxable account every rebalance realizes gains, so the after-tax gap would be wider |
| B-whole (whole shares, residual cash) | $2,323,196 | +$538,608 | −$23,076 | $476,416 (25.1%) | +$312,805 | $211,146 | share rounding leaves cash idle ($16,235 at the end) and buys slightly fewer shares; the cost is 1% of B's end equity |

Of B's +$561,684 over A: +$302,390 is the strategy's net on the dynamically sized lots when profits are kept in
cash (B-noreinvest's own increment is +$287,431 because its lots are sized on a smaller equity and cash earns
nothing), and the rest is the core growth bought with the reinvested profits. The $141,413 unrealized on the open
lot is in every B figure.

## 6. Exposure versus timing: the matched borrowing-dollar-days comparator

`results/comparator/matched_borrowing_B.json` and `matched_borrowing_P2s.json` (`npm run shared-margin --
comparator [--scenario P2s]`). **Comparator grade.** A constant VGT margin lot is bought at the first trade of
the first eligible session (2017-06-15, 141.38) and held to 2025-10-13 at 11%, sized so that its principal ×
calendar days equals the scenario's realized borrowing-dollar-days; its mark is added to A's daily equity.

| | Constant principal | Shares | Interest to 2025-10-13 | Lot mark at end | Comparator increment over A | Comparator daily max DD | Scenario increment over A | Scenario daily max DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B (185.49M dollar-days over 3,042 days) | $60,977 | 431.30 | $55,902 | +$208,962 | +$208,962 | $463,398 (37.0%) | +$561,684 | $484,116 (25.3%) |
| P2s (290.32M dollar-days) | $95,437 | 675.04 | $87,493 | +$327,055 | +$327,055 | $506,700 (38.6%) | +$783,341 | $558,017 (26.3%) |

The same average borrowing held passively in VGT over the same period would have added $208,962 to A with a
37.0% drawdown (the passive lot rides the 2022 bear in full). B added $561,684 with a 25.3% drawdown, and the
cleaner strategy-only comparison — B-noreinvest's +$287,431 against the comparator's +$208,962 — still favours
the timed lots by $78,469 with a 22.7% drawdown. So on this history most of B's increment is not explained by
the average extra VGT exposure; it comes from when the exposure was on (2020-04 → 2020-09, 2022, 2025-04 →) and
from compounding the profits. The comparator credits no lot dividends (a small understatement) and is a single
constructed benchmark on an inspected history, not evidence of predictive skill.

## 7. Leverage, margin cushion and broker constraints

`results/scenario_summary.csv`; the rules are PROTOCOL.md §4.3.

| Measure | B | Note |
|---|---:|---|
| Maximum LMV ÷ equity | 1.219× (2020-03-16) | one lot of 20% of equity on an unleveraged core |
| Maximum debt ÷ equity | 21.9% | principal plus accrued interest |
| Minimum equity ÷ LMV, daily closes | 82.0% (2020-03-16) | FINRA minimum 25%, Vanguard's published house figure 35%, its concentrated-position figure 50% |
| Minimum equity ÷ LMV, minute-sampled (VOOG forward-filled) | 81.3% (2020-03-18 18:27Z) | |
| Reg T initial-margin declines | 0 | checked at every entry |
| Forced sales with maintenance at 25% / 35% / 50% (B-m25 / B-m35 / B-m50) | 0 / 0 / 0 | the three runs are identical to B |

No historical balance sheet came within 30 points of the strictest requirement considered. The binding risk is
the size of a loss on a ~$300,000 lot, not a margin call; DEPLOYMENT_RISK.md quantifies both under named shocks.

## 8. Reconciliation

- **Identity at every event.** `assets − liabilities = equity` is recomputed after every ledger event
  (tolerance $0.01) and at every session close; cash, core shares and lot shares may never go negative. B's
  ledger has 3,916 events (`results/scenarios/B/ledger.csv`); all 19 principal scenarios reconciled.
- **Independent audit** (`npm run shared-margin -- audit-ledger`, `results/audit/ledger_audit.json`): share
  counts and cash rebuilt from the events' deltas, equity from the logged prices, every lot's interest and net
  from first principles, each distribution's entitlement from the previous close's holdings, the daily balance
  sheet, and each lot's principal against the configured fraction. Checks / failures: A 3,324 / 0; B 3,916 / 0;
  B2 3,916 / 0; B3 3,916 / 0; S 4,204 / 0; P1 4,686 / 0; P2 4,486 / 0; P2c 4,371 / 0; P2s 4,406 / 0;
  P3 4,796 / 0; P4 4,486 / 0; P5-T1 4,633 / 0; P5-T2a 4,633 / 0; P5-T2b 4,571 / 0; P5-T1-B2 4,633 / 0;
  B-rebalance 3,916 / 0; B-noreinvest 3,776 / 0; B-fixed100k 3,776 / 0; B-whole 3,916 / 0.

### Worked example: a profitable lot (B lot 6, `results/scenarios/B/ledger.csv`)

| Event (UTC) | ETF | Shares | Price | Cash Δ | Cash after | Principal | Accrued interest | Equity after | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 2020-04-02 13:33 entry | VGT | +541.5730 | 202.36 | $0.00 | $0.00 | $109,592.72 | $0.00 | $547,957.25 | principal $109,592.72 = 20.00% of the $547,963.61 equity at the 13:32 decision; the lot and the loan are equal, equity unchanged |
| 2020-09-04 13:30 exit | VGT | −541.5730 | 315.866 | +$56,352.45 | $56,352.45 | $0.00 | $0.00 | $899,663.59 | trailing stop; proceeds $171,064.50 repay $109,592.72 principal + $5,119.33 interest (155 days); net +$56,352.45 stays in cash |
| 2020-09-04 13:31 reinvest | VOOG | +157.2626 | 215.00 | −$33,811.47 | $22,540.98 | $0.00 | $0.00 | $900,873.61 | 60% of the net at VOOG's first trade after the exit minute |
| 2020-09-04 13:31 reinvest | VGT | +71.0747 | 317.145 | −$22,540.98 | $0.00 | $0.00 | $0.00 | $900,604.10 | 40% at VGT's next minute open |

Equity moves between the rows only through prices (the exit minute's VGT 315.87 → the 13:31 marks); the cash
leg nets to zero after the two reinvestments.

### Worked example: a losing lot (B lot 15)

| Event (UTC) | ETF | Shares | Price | Cash Δ | Cash after | Principal | Funding payable | Equity after | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 2022-09-16 14:03 entry | VGT | +615.3720 | 329.27 | $0.00 | $0.00 | $202,623.53 | $0.00 | $1,012,944.27 | 20.00% of $1,013,117.66 at the decision |
| 2022-09-26 13:31 exit | VGT | −615.3720 | 319.77 | $0.00 | $0.00 | $0.00 | $6,456.68 | $972,269.37 | maximum hold at the trade after the open; proceeds $196,777.50 fall $6,456.68 short of principal + $610.65 interest; the shortfall is a payable until core sales settle it |
| 2022-09-26 13:32 fund loss | VOOG | −15.8269 | 215.365 | $0.00 | $0.00 | $0.00 | $3,048.13 | $973,199.66 | proportional to core market values; the proceeds settle the payable |
| 2022-09-26 13:32 fund loss | VGT | −9.5328 | 319.75 | $0.00 | $0.00 | $0.00 | $0.00 | $972,793.87 | payable cleared, cash never negative |

### End of the data

B on 2025-10-13 (`results/scenario_summary.csv` end fields): cash $0.00, receivables $0.00, outstanding
principal $302,750.61, accrued interest $15,875.74, lot market value $460,039 (608.9283 shares at 755.49),
unrealized +$141,413 **counted in the $2,346,272 equity and not reinvested**. Realized strategy profit over the
run $172,969; paid interest $40,026 plus the $15,876 accrued = $55,902 total interest.

## 9. Limitations

- **Dividend ledger precision** (`results/audit/data_audit.json`): re-deriving the ledger from the present
  adjusted daily files with 3-session medians matches 35 of the 36 VGT ex-dates with adjusted data (the ledger's
  2020-03-10 appears as 2020-03-09) and 35 of 35 VOOG ex-dates (VOOG's 2024-03-22 $0.30 step is below the
  detection threshold); individual amounts differ by up to about 4%, the sum of absolute differences is 0.48%
  (VGT) and 0.57% (VOOG) of the ledger amounts; the three 2016 VOOG amounts and every pay date are estimates.
  Total dividends are 3.8% of A's end equity, so the effect on any comparison is far below the differences
  between scenarios.
- **VOOG sparsity**: 403 sessions without a closing print (including 2016-01-04), a median 149 traded minutes;
  the minute-sampled drawdowns and the VOOG sizing price are forward-filled last trades, labelled as such.
- **Raw prices, no corporate actions beyond the ledger**: no splits occurred in the window.
- **Taxes**: none. Every D1 exit is a short-term gain or loss; in a taxable account 2020's +$83,773 and 2022's
  +$45,324 realized would be taxed at ordinary rates, and the rebalance sensitivity would realize long-term
  gains on the core as well. Results would be lower than shown.
- **Execution**: no spreads, slippage or commissions in the principal runs; DEPLOYMENT_RISK.md shows 2–25 bps
  per side cost $3,729 to $192,627 of end equity.
- **Inspected history**: 2018, 2020, 2022, 2023 and 2024–2025 were examined by the earlier programs that
  produced D1 and swing-low; nothing here is an out-of-sample test, and the 2025-04 trades sit in the window
  the earlier programs labelled "previously inspected / reused".
