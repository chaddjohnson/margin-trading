# Strategy comparison: standalone, combined and portfolio-wide

Three views of the same candidates, with the evidence grade of each figure. Sources:
`results/parity/parity.json` (standalone, fixed $100,000), `results/scenario_summary.csv` and
`results/tables/scenario_comparison.md` (portfolio), `results/tables/strategy_statistics.md`,
`results/comparator/matched_borrowing_B.json`.

## 1. Standalone, fixed $100,000, noncompounded (reproduced)

The legacy frame of every earlier program. Common eligibility 2017-06-15, 11%, stop fills at the level.

| Strategy | Net | Minute DD | Daily DD | Net / minute DD | Trades | W/L | Worst trade | Worst excursion | Exposure | Evidence |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| D1 | $183,044 | $19,331 | $15,611 | 9.47 | 20 (1 open) | 14/5 | −$3,447 | −$11,003 | 36.5% | reproduced; parameters in-sample from three earlier programs |
| Gross-breakeven D1 (B2) | $183,044 | $19,331 | $15,611 | 9.47 | 20 (1 open) | 14/5 | −$3,447 | −$11,003 | 36.5% | identical trades on this history; cleaner rule |
| D1 P 8.6% (B3) | $182,842 | $18,990 | $15,194 | 9.63 | 20 (1 open) | 14/5 | −$3,447 | −$11,003 | 36.5% | one continuation entry differs; plateau neighbour |
| Swing-low C2 | $114,478 | $16,706 | $12,600 | 6.85 | 32 | 26/6 | −$5,326 | −$10,682 | 21.4% | in-sample refinement, not credited by the earlier program |
| Set 2 (regression) | $150,630 | $21,183 | $16,577 | 7.11 | 14 (1 open) | 10/3 | −$3,447 | −$11,003 | 23% | reproduced |

Worst excursion here is the earlier program's definition (minute closes); this program's `strategy_statistics.md`
uses minute lows (D1 −$11,003 → −$24,954 in dynamic dollars at 20%).

## 2. Portfolio-wide, $300,000 60/40 VOOG/VGT, 20% of equity per entry, profits compounded (computed)

| Scenario | End equity | Increment over A | CAGR | Daily max DD | Minute max DD | Strategy net | Interest | Min equity/LMV | Net increment per $ of interest |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A — buy and hold | $1,784,588 | — | 20.01% | $386,774 (33.9%) | $434,474 (28.0%) | — | — | 100% | — |
| B — D1 | $2,346,272 | +$561,684 (+31.5%) | 23.42% | $484,116 (25.3%) | $561,090 (29.3%) | +$314,382 | $55,902 | 82.0% | 10.0 |
| B2 — gross-breakeven D1 | $2,346,272 | +$561,684 | 23.42% | $484,116 (25.3%) | $561,090 (29.3%) | +$314,382 | $55,902 | 82.0% | 10.0 |
| B3 — D1 P 8.6% | $2,345,129 | +$560,541 | 23.42% | $483,877 (25.3%) | $560,813 (29.3%) | +$313,512 | $55,906 | 82.0% | 10.0 |
| S — swing-low | $2,196,707 | +$412,119 (+23.1%) | 22.59% | $503,358 (26.3%) | $578,645 (30.2%) | +$197,122 | $37,191 | 81.8% | 11.1 |
| P3 — split 10/10 | $2,273,611 | +$489,023 | 23.02% | $492,573 (25.8%) | $567,836 (29.6%) | +$257,111 | $46,673 | 82.3% | 10.5 |
| P2 / P4 — first wins, hold | $2,376,575 | +$591,987 | 23.58% | $514,086 (26.3%) | $591,054 (30.2%) | +$361,178 | $91,360 | 78.9% | 6.5 |
| P1 — D1 displaces | $2,383,061 | +$598,473 | 23.62% | $515,970 (26.3%) | $593,261 (30.1%) | +$374,054 | $92,763 | 81.9% | 6.5 |
| P5-T1 / T2a — takeover | $2,419,970 | +$635,382 | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,352 | $92,302 | 80.7% | 6.9 |
| P5-T2b — takeover, clock restarted | $2,457,294 | +$672,706 | 24.01% | $532,038 (26.3%) | $611,723 (30.1%) | +$407,700 | $93,925 | 79.7% | 7.2 |
| P2c — first wins, cancel | $2,493,788 | +$709,200 | 24.19% | $542,002 (26.3%) | $623,148 (30.2%) | +$416,369 | $78,848 | 81.8% | 9.0 |
| P2s — first wins, paper book | $2,567,929 | +$783,341 (+43.9%) | 24.57% | $558,017 (26.3%) | $641,584 (30.2%) | +$447,899 | $87,493 | 81.8% | 9.0 |

Every margin scenario's maximum drawdown is the 2025-01/04 episode (A's is 2022, 33.9%: the margin scenarios'
2022 drawdowns are smaller in percent because D1 made money in 2022 and their equity entered the year higher).
Percent drawdowns of the margin scenarios are within one point of each other; the dollar drawdowns scale with
equity.

### The return / drawdown frontier

Daily drawdown percent against CAGR, all scenarios 2016-01-04 → 2025-10-13:

| Daily max DD % | Scenarios ordered by CAGR |
|---|---|
| 22.7–22.8% | B-noreinvest 21.86%, B-fixed100k 21.16% (profits not compounded) |
| 24.7% | B-rebalance 22.92% |
| 25.0–25.3% | B-f10 21.72%, B-f15 22.57%, **B / B2 / B3 23.42%** |
| 25.5% | B-f25 24.27% |
| 25.8% | P3 23.02% |
| 26.3% | S 22.59%, P2/P4 23.58%, P1 23.62%, P5-T1 23.81%, P5-T2b 24.01%, P2c 24.19%, P2s 24.57% |
| 33.9% | A 20.01% |

Within one drawdown point, B-f25 (D1 at 25%) sits at 24.27% CAGR and P2s at 24.57%: raising D1's allocation by
five points buys about the same CAGR as adding swing-low under the most favourable semantics, with 20 trades
instead of 38, $72k of interest instead of $87k, and no second strategy to run — but with a lower minimum
equity/LMV (78.4% vs 81.8%) and a larger single-lot loss exposure. Neither is a validated improvement; both are
exposure trades on the same inspected history.

## 3. Exposure versus timing (comparator)

`results/comparator/matched_borrowing_B.json`: a constant VGT margin lot held from 2017-06-15 with the same
borrowing-dollar-days as B ($185.5M, i.e. a constant principal of $60,977) at 11%:

| | Increment over A | Daily max DD |
|---|---:|---:|
| Matched passive lot | +$208,962 | 37.0% |
| B with profits kept in cash (B-noreinvest) | +$287,431 | 22.7% |
| B (profits compounded into core) | +$561,684 | 25.3% |

Half of B's increment over A is the compounding of realized profits into the 60/40 core (+$274,253); the other
half (+$287,431) is the strategy's own P&L less its financing, which is $78k more than a passive lot with the same
average borrowing and with a far smaller drawdown. That is the value of the timing of borrowing on this history,
not evidence that the timing will persist. For P2s the comparator is +$327,055 against +$783,341.

## 4. Evidence-grade summary

| Claim | Grade |
|---|---|
| D1 / B2 / B3 / swing-low standalone figures | reproduced to the cent against the files and the earlier engine |
| A's end equity | reproduced (0.75 × the committed $400k study) |
| B, B2, B3, S, P1–P5 portfolio results | computed on observed data; one inspected history; parameters frozen but in-sample |
| B2 = B, P4 = P2, P5-T1 = P5-T2a | computed identities with mechanical explanations (SHARED_MARGIN_POLICIES.md §2) |
| Semantics spread $30k–$222k | predeclared sensitivity; shows the result depends on a deployment definition |
| Allocation, interest, cost, fill sensitivities | predeclared sensitivities (DEPLOYMENT_RISK.md) |
| Gap and correlated shocks | named hypothetical stress, not forecasts |
| Broker requirements 35% / 50% | assumption from a published disclosure, unverified for the account |
| Any claim of future outperformance | none made |
