# All-lowDd shadow: execution-cost and tail-risk validation

Focused final check (2026-10-23) of the **All-lowDd shadow allocator** (VGT primary, XBI/XRT/KRE lowDd, shadow
policy) against **VGT D1 alone**, in the fixed $100,000 pool and the $300,000 VOOG/VGT portfolio borrowing 20% of
equity, at 11% simple interest. No phenotype, rule, policy or fraction was changed or chosen.

**These are post hoc results on history that was already inspected (2016-01-04 → 2025-10-13).** They are not
out-of-sample validation. The report labels each number as one of three kinds:

- **historical**: the observed path.
- **cost sensitivity**: the observed path with a hypothetical per-side cost.
- **hypothetical stress**: a named gap applied to the observed path.

Machine-readable outputs are in `results/final-validation/`. To regenerate them, run
`npm run multi-etf-allocator -- final-validation` (about 150 s).

## Verdict

**All-lowDd shadow remains the leading multi-ETF candidate.** Its advantage over VGT D1 holds up under costs: its
trade list does not change at 2 or 5 bps. It stays ahead on profit per dollar of drawdown and at matched borrowing.
Its fixed-pool historical drawdown stays under $35k at every cost level.

The study also found a **critical reporting issue that changes the answer on the 30% portfolio-drawdown tolerance.**
The earlier reports give the compounded "maximum daily drawdown" as 25.3% (B) and 25.2% (All-lowDd). Those figures
are the percentage depth of the largest *dollar* drawdown, which happened in 2025. The largest *percentage*
drawdown happened in March 2020:

- **32.7%** for B.
- **34.6%** for All-lowDd.
- 31.6% for unleveraged buy-and-hold over the same March 2020 window (33.9% in 2022).

Both strategies, and the core alone, have historically exceeded 30% (§6).

| Decision question | Answer |
|---|---|
| 1. Meaningful profit advantage after costs? | **Yes.** Fixed pool: +$111,632 at 0 bps → +$99,852 at 10 bps. Portfolio: +$545,019 → +$473,969 ending equity. |
| 2. Competitive profit per dollar of drawdown? | **Yes.** Fixed-pool net ÷ max minute drawdown: 10.54 vs 9.47 at 0 bps, 9.49 vs 9.06 at 10 bps. |
| 3. Does the advantage survive matched borrowing? | **Yes.** At 10% and 15% of equity, All-lowDd is +$110,753 / +$179,230 over B at the same borrowing-dollar-days at 0 bps, and +$89,945 / +$145,088 at 10 bps. |
| 4. Fixed-pool drawdown within $35k? | **Historically yes:** $27,968 (0 bps) to $29,350 (10 bps). **Under hypothetical stress, no:** a 10% overnight gap on either March 2020 KRE lot gives $36,248–$37,163, and a 15% gap gives $40,845–$41,761. VGT D1 alone stays at or below $32,707 under the same gaps. |
| 5. Compounded drawdown consistent with ~30%? | **No, and neither is B.** True maximum percentage daily drawdown: 34.6% (All-lowDd) vs 32.7% (B), both 2020-02-19 → 2020-03-23. The unleveraged core alone fell 31.6% in that window. All-lowDd adds about 1.9 points. |
| 6. Do the targeted scenarios reveal a new risk? | **Not a new kind of risk, but the fixed pool has less headroom.** Every stressed lot's stop was inactive when the gap hit, so the full gap became the loss and the lot exited at the maximum hold. This matches the earlier static grid. What is new is that All-lowDd's historical drawdown leaves only $7k of room under $35k, against $15.7k for VGT D1. |

## 1. Baseline reproduction (historical)

All four runs reproduce the committed catalogue (`results/scenario_summary.json`) exactly, including the
virtual-trade signatures. Source: `results/final-validation/baseline_reproduction.json`. The VGT D1 cost runs also
equal the earlier `results/stress/sensitivities.csv` rows to the cent.

| Metric | VGT D1 alone | All-lowDd shadow |
|---|---:|---:|
| Fixed-pool net profit | $183,043.82 | $294,675.77 |
| Fixed-pool max minute drawdown | $19,330.69 | $27,968.03 |
| Compounded ending equity | $2,346,272.33 | $2,891,290.87 |
| Compounded max daily drawdown, **as reported earlier** (the largest $ drawdown's depth) | 25.3% (2025-01-23 → 04-08) | 25.2% (same) |
| Compounded max daily drawdown, **largest percentage** | **32.7%** (2020-02-19 → 03-23) | **34.6%** (same) |

## 2. Execution costs (cost sensitivity)

Costs apply per side to every lot fill and every core purchase or sale except dividend reinvestment. They run
through the engine, so they change the books' net-profit tests for stop activation and buffered losses. **The
basis-point levels are assumptions; no bid-ask quote data was measured.**

"Costs" below means the spread dollars paid: shares × raw price × bps on each side. The change in net is slightly
different from the costs paid, for two reasons:

- Cost-adjusted stop levels move some exit prices.
- In the portfolio, smaller equity compounds into smaller later lots.

### 2.1 Fixed $100,000 pool

| bps per side | VGT D1 net | Max minute / daily DD | Costs | Trades (W/L) | Net ÷ minute DD | All-lowDd net | Max minute / daily DD | Costs | Virtual / funded trades (W/L) | Net ÷ minute DD | All-lowDd − VGT |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | $183,044 | $19,331 / $15,611 | $0 | 20 (14/5) | 9.47 | $294,676 | $27,968 / $24,575 | $0 | 145 / 75 (46/28) | 10.54 | **+$111,632** |
| 2 | $182,188 | $19,412 / $15,694 | $813 | 20 (14/5) | 9.39 | $291,977 | $28,245 / $24,852 | $3,037 | 145 / 75 (46/28) | 10.34 | **+$109,789** |
| 5 | $180,904 | $19,534 / $15,817 | $2,031 | 20 (14/5) | 9.26 | $287,323 | $28,659 / $25,268 | $7,589 | 145 / 75 (46/28) | 10.03 | **+$106,419** |
| 10 | $178,767 | $19,738 / $16,022 | $4,060 | 20 (13/6) | 9.06 | $278,619 | $29,350 / $25,960 | $15,170 | 144 / 75 (43/31) | 9.49 | **+$99,852** |

### 2.2 Compounded portfolio (20% of equity)

"Max % DD" is the largest percentage fall of daily closing equity. Minute-level depth would be at least as large.

| bps | B end equity | B max % DD | B costs | B borrowing $-days | All-lowDd end equity | All-lowDd max % DD | All-lowDd costs | All-lowDd borrowing $-days | All-lowDd − B |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | $2,346,272 | 32.73% | $0 | 185.5M | $2,891,291 | 34.55% | $0 | 283.4M | **+$545,019** |
| 2 | $2,342,543 | 32.75% | $1,504 | 185.3M | $2,876,085 | 34.58% | $7,117 | 282.6M | **+$533,542** |
| 5 | $2,336,965 | 32.77% | $3,754 | 185.1M | $2,849,893 | 34.64% | $17,695 | 281.2M | **+$512,928** |
| 10 | $2,327,701 | 32.81% | $7,487 | 184.7M | $2,801,670 | 34.74% | $35,051 | 278.0M | **+$473,969** |

Other portfolio figures at 0 → 10 bps:

- **Strategy net:** B $314,382 → $305,227; All-lowDd $641,596 → $593,374.
- **Overlay minute drawdown:** B $40,402 → $40,584; All-lowDd $54,028 → $56,421.
- **Minimum equity ÷ LMV:** 82.0% (B) and 81.7% (All-lowDd) at every cost level.
- **Margin calls:** none.
- **Trades:** the same counts and win/loss splits as the fixed pool.

### 2.3 Matched borrowing utilization (cost sensitivity)

At each cost level, B's 10/15/20/25% ladder is interpolated at All-lowDd's borrowing-dollar-days, using the method
of `results/tables/matched_utilization.md`. All-lowDd at 20% lies beyond B's ladder, so its comparison is an
extrapolation. Source: `results/final-validation/matched_utilization.csv`.

| bps | All-lowDd at 10%: end / $-days | B at the same $-days | Difference | All-lowDd at 15%: end / $-days | B at the same $-days | Difference | At 20% (extrapolated) |
|---:|---|---:|---:|---|---:|---:|---:|
| 0 | $2,276,138 / 124.9M | $2,165,385 | **+$110,753** | $2,566,638 / 199.4M | $2,387,409 | **+$179,230** | +$256,539 |
| 2 | $2,270,128 / 124.7M | $2,162,696 | **+$107,433** | $2,556,494 / 199.0M | $2,382,740 | **+$173,754** | +$248,536 |
| 5 | $2,259,744 / 124.4M | $2,158,546 | **+$101,198** | $2,538,992 / 198.3M | $2,375,458 | **+$163,534** | +$233,688 |
| 10 | $2,240,505 / 123.6M | $2,150,560 | **+$89,945** | $2,506,669 / 196.5M | $2,361,581 | **+$145,088** | +$206,940 |

The extra borrowing earns more than B's ladder at every cost level, so this is not just more leverage. It does cost
somewhat more percentage drawdown:

- All-lowDd at 10%: 33.1% vs B at 10%: 33.1%.
- All-lowDd at 15%: 33.8–34.0% vs B at 15%: 32.7–32.8%.

### 2.4 Attribution of the cost effects

Source: `results/final-validation/cost_attribution.csv`.

- **The trade sequence is unchanged at 2 and 5 bps.** Every virtual trade of all four books and every funded lot
  is identical to the zero-cost run. The whole deterioration is direct cost on the same trades.
- **At 10 bps there is one change, in the KRE book:**
  - One funded lot: KRE 2023-10-05 now exits 2023-10-09 at the maximum hold for +$73. At zero cost it exited
    2023-10-12 on the trailing stop for +$1,229. The change is −$1,156 in the fixed pool and −$3,287 in the
    portfolio.
  - Three unfunded April 2020 KRE virtual trades become two. The pool was held by VGT then, so nothing funded
    changes.
  - Three small winners become small losers: 46/28 → 43/31.
  - VGT D1 has one similar flip: 14/5 → 13/6.
- **Where the 10-bps fixed-pool deterioration comes from (−$16,057):**

  | | Change | Note |
  |---|---:|---|
  | KRE | −$8,893 | 55%; 39 of the 75 lots and 52% of the spread paid |
  | XBI | −$3,080 | |
  | VGT | −$3,044 | |
  | XRT | −$1,039 | |

  In the portfolio, strategy net falls by $48,222: KRE −$26,224, VGT −$11,816, XBI −$7,365, XRT −$2,818.
- **Contrast with all-primary.** The earlier finding that "the allocator's edge is cost-fragile"
  (`STRESS_AND_EXECUTION_COSTS.md` §2) was about **all-primary**: 2 bps cost it $26,639 in the fixed pool and cut its
  virtual trades from 146 to 139, through KRE-primary 3.1% stops sitting at their activation threshold. All-lowDd loses
  only $2,699 at 2 bps and changes no trades. **All-lowDd's costs are proportional to how often it trades, not
  fragile:** about $200 of round-trip cost per lot at 10 bps.

## 3. Overnight gaps (hypothetical stress)

**Design.**

- **Lots stressed.** For each strategy: the two largest portfolio lots, gapped at the first open after entry, and the
  two worst fixed-pool adverse excursions, gapped at the open of their worst session. Listed in
  `results/final-validation/gap_targets.csv`. For VGT D1 one lot is both a largest lot and a worst excursion, so it
  has three; All-lowDd has four.
- **Gap sizes.** 10% and 15% on the funded ETF.
- **ETF-specific case.** Every other security is unchanged; a VGT gap also moves the VGT core, since it is the same
  security.
- **Correlated case.** Every other security (VOOG, the VGT core, the other sector ETFs) falls by half the gap: 5% or
  7.5%.
- **Recomputation.** The whole later path is shifted and recomputed: stops, exits, signals and sizes. End-equity
  changes therefore include the permanent price shift. The table reports the lot, the gap day and drawdowns, not end
  equity.

All rows are in `results/final-validation/gap_runs.csv`.

**In every case the lot's stop was inactive when the gap hit,** so no stop filled at the gapped open. D1 activates
its stop only once a fill at the stop would net a profit. Each lot carried the full gap to its maximum-hold exit,
1–5 sessions later. No run produced a margin call. The lowest equity ÷ LMV was 79.9%.

### 3.1 Fixed pool (one lot at a time)

The correlated case changes nothing for the stressed lot here. It only alters later virtual decisions.

| Strategy | Lot (gap date) | Lot net: actual → 10% → 15% | Max minute DD: actual → 10% → 15% |
|---|---|---|---|
| VGT D1 | VGT 2025-04-11 (04-14) | −$2,141 → −$11,957 → −$16,865 | $19,331 → $19,858 → $24,764 |
| VGT D1 | VGT 2025-04-04 (04-07) | +$1,252 → −$1,960 → −$7,423 | $19,331 → $25,880 → $30,474 |
| VGT D1 | VGT 2020-03-12 (03-18) | −$3,447 → −$13,127 → −$17,966 | $19,331 → $28,249 → $32,707 |
| All-lowDd | VGT 2025-04-11 (04-14) | −$2,141 → −$11,957 → −$16,865 | $27,968 unchanged (April 2025 episode $24,046 at 15%) |
| All-lowDd | VGT 2025-04-04 (04-07) | +$1,252 → −$1,960 → −$7,423 | $27,968 unchanged (episode $21,453) |
| All-lowDd | KRE 2020-03-09 (03-12) | −$8,167 → −$17,362 → −$21,960 | $27,968 → **$37,163** (correlated $36,248) → **$41,761** ($40,845) |
| All-lowDd | KRE 2020-03-18 (03-19) | −$10,004 → −$19,019 → −$23,526 | $27,968 → **$36,983** → **$41,490** |

A gap adds about the same dollars to either strategy's drawdown. All-lowDd breaches $35k because its March 2020
drawdown is already $8.6k deeper.

### 3.2 Compounded portfolio

"ETF only / correlated" pairs show the two correlation cases.

| Strategy | Lot (principal, gap date) | Lot net: actual → 10% → 15% | Gap-day equity change: 10% (ETF only / correlated) | 15% | Max % daily DD: actual → 10% (ETF only / correlated) → 15% |
|---|---|---|---|---|---|
| B | VGT 2025-04-11 ($309,885, 04-14) | −$6,633 → −$37,052 → −$52,261 | −$96,913 / −$137,805 | −$151,857 / −$213,195 | 32.7% → 32.7 / 32.7% → 32.7 / 32.8% |
| B | VGT 2025-04-04 ($299,009, 04-07) | +$3,744 → −$5,860 → −$22,196 | −$94,176 / −$131,812 | −$144,378 / −$200,831 | 32.7% → 32.7 / 32.7% → 33.0 / **36.0%** |
| B | VGT 2020-03-12 ($110,604, 03-18) | −$3,813 → −$14,519 → −$19,872 | −$60,026 / −$73,900 | −$77,573 / −$98,384 | 32.7% → 37.3 / 39.1% → 39.6 / **42.3%** |
| All-lowDd | VGT 2025-04-11 ($382,621, 04-14) | −$8,190 → −$45,749 → −$64,528 | −$114,954 / −$167,793 | −$180,435 / −$259,693 | 34.6% unchanged |
| All-lowDd | VGT 2025-04-04 ($369,201, 04-07) | +$4,623 → −$7,235 → −$27,406 | −$111,871 / −$160,509 | −$171,695 / −$244,651 | 34.6% → 34.6 / 34.6% → 34.6 / **35.7%** |
| All-lowDd | KRE 2020-03-09 ($117,433, 03-12) | −$9,590 → −$20,389 → −$25,788 | −$75,216 / −$101,774 | −$80,182 / −$120,019 | 34.6% → 35.8 / 39.0% → 36.4 / **41.3%** |
| All-lowDd | KRE 2020-03-18 ($102,153, 03-19) | −$10,219 → −$19,428 → −$24,032 | −$3,745 / −$29,632 | −$8,793 / −$47,624 | 34.6% → 35.8 / 39.2% → 36.4 / **41.5%** |

**What the gaps show:**

- **2025 drawdown episode.** Measured from the pre-gap peak, a 15% correlated gap takes the April 2025 drawdown to
  32.6–35.7% for All-lowDd and 32.8–36.0% for B. The two strategies are equivalent in percentage terms: All-lowDd's
  lots are larger in dollars, but so is its equity.
- **March 2020 positions.** Gaps of the same size give 35.8–41.5% for All-lowDd's KRE lots and 37.3–42.3% for B's
  VGT lot.
- **Largest single-lot loss.** −$64,528 (15% gap, VGT lot of $382,621), which is 3.3% of equity at entry. The
  earlier static grid (`results/stress/entry_shocks.csv`, 75 lots) gives the same −$45,749 for a 10% gap. Its worst
  10% equity losses are 6.8% / 9.4% / 12.1% of equity at correlation 0 / 0.5 / 1, against B's 6.9% / 9.5% / 12.1%.

## 4. March 2020 (historical)

Window 2020-02-19 → 2020-06-30. Sources: `results/final-validation/march2020_{summary,lots,refusals}.csv`.

| | VGT D1 fixed | All-lowDd fixed | B portfolio | All-lowDd portfolio |
|---|---:|---:|---:|---:|
| Drawdown in the episode | $15,611 daily / $19,331 minute | $24,575 daily / $27,968 minute | 32.7% | 34.6% |
| Trough | 2020-03-16 | 2020-03-23 | 2020-03-23 | 2020-03-23 |
| Recovered the pre-crash peak | 2020-03-26 | 2020-04-14 | 2020-06-01 | 2020-06-05 |
| Change over the window | +$34,098 | +$21,179 | +$52,236 | +$31,247 |
| Funded lots / stop exits | 5 / 4 | 9 / 7 | 5 / 4 | 9 / 7 |

- **Was capital tied up when VGT had better opportunities?** Barely. Only one VGT signal was refused in the window:
  2020-03-12, while KRE lot 4 held the pool. That VGT trade lost $3,447 in VGT D1 alone. Both runs funded the two
  strong VGT rebound trades: +$9,125 (03-23 → 04-01) and +$51,420 (04-02 → 09-04). After 03-23 the occupation ran
  the other way: VGT lots 9–10 held the pool and 23 sector signals were refused (hypothetical outcomes in the refusal
  file).
- **What the $12.9k shortfall is made of.** All-lowDd replaced VGT's −$3,447 lot with five sector lots totalling
  −$16,368:

  | Lot | Net | Exit |
  |---|---:|---|
  | KRE | −$8,167 | maximum hold |
  | XBI | −$515 | stop |
  | KRE | +$2,719 | stop |
  | XBI | −$401 | stop |
  | KRE | −$10,004 | maximum hold |

- **Did the tight stops help or hurt?** They helped. The three sector lots whose stops activated exited between −$515
  and +$2,719. Both large losses (−$8,167 and −$10,004) came from KRE lots whose stops **never activated**, which
  exited at the maximum hold. With hindsight the stopped XBI lots missed a large rebound (XBI +64–74% by 06-30), but
  recapturing that would take a new rule, which is out of scope.
- **Recovery.** The fixed pool took 12 more trading days to recover than VGT D1 (04-14 vs 03-26). The portfolio
  recovered 4 trading days after B (06-05 vs 06-01).

## 5. Losing streaks (historical and cost sensitivity)

Funded lots in exit order. Source: `results/final-validation/losing_streaks.csv`.

| bps | VGT D1 fixed: worst streak | All-lowDd fixed: worst streak | All-lowDd portfolio |
|---:|---|---|---|
| 0 | 1 lot, −$3,447 | **6 KRE lots, −$10,949** (2023-03-21 → 05-02) | 6 lots, −$27,872 |
| 2 | 1 lot, −$3,486 | 6 lots, −$11,185 | −$28,383 |
| 5 | 1 lot, −$3,544 | 6 lots, −$11,539 | −$29,106 |
| 10 | 1 lot, −$3,641 (longest: 2 lots, −$1,356) | 6 lots, −$12,128 | −$30,291 |

- The worst streak happened during the 2023 regional-bank stress: six KRE losses of $836–$2,949 each.
- It is 39% of the fixed-pool maximum drawdown and does not set it.
- Costs do not lengthen the streak. They add about $200 per lot at 10 bps, $1,179 over the streak.
- In the portfolio the streak drives the overlay's own largest minute drawdown ($54,028 in March–May 2023), not the
  account's.
- No cost level turns consecutive losses into a materially larger drawdown.

## 6. Critical issue: the percentage drawdown metric

`Tracker` in `src/multi-etf-allocator/engine.ts`, inherited from the shared-margin study's ledger, keeps the largest
**dollar** drawdown and reports that episode's percentage as `dailyDrawdownPercent` / `minuteDrawdownPercent`. In
a compounding account the largest dollar drawdown is late (2025) and shallower in percent than March 2020.

| Account | Reported (the largest $ drawdown's depth) | Largest percentage drawdown (daily close) |
|---|---:|---:|
| A: 60/40 buy and hold | 33.9% (2021-12 → 2022-10) | 33.9% (same); 31.6% in March 2020 |
| B: VGT D1 at 20% | 25.3% | **32.7%** (2020-02-19 → 03-23) |
| C: All-lowDd shadow at 20% | 25.2% | **34.6%** (same) |
| C: all-primary shadow at 20% | 25.2% | 34.5% (same) |

- **What changes:** the 30% tolerance answer, and any statement that the allocator's drawdown is "the core's" 25%.
  This affects the "daily DD" columns of `COMPOUNDED_PORTFOLIO_RESULTS.md` and `README.md`, and the
  "B at the same DD" column of `results/tables/matched_utilization.md`. The same applies to
  `research/vgt-shared-margin-portfolio/`, which quotes B at 25.3%.
- **What does not change:** dollar P&L, dollar drawdowns, margin distances, the fixed-pool figures (which are in
  dollars), or any ranking.
- **Where the correct metric is:** `max_percent_daily_dd` in this study's `cost_runs.csv` and `gap_runs.csv`.
  Minute-level percentage depth was not computed; it is at least the daily figure.
- **What was not changed:** the frozen reports and the engine were left as they are.
- **What to do:** quote the true percentage figure wherever the 30% tolerance is assessed. This is a reporting
  correction, not new research.

**What it means for the tolerance.** Historically, the 20% overlay on the 60/40 core is a 33–35% drawdown structure.
The unleveraged core alone fell 31.6% in March 2020. All-lowDd adds about 1.9 points over B, and lowering the
fraction does little:

| Fraction | All-lowDd | B |
|---:|---:|---:|
| 10% | 33.1% | 33.1% |
| 15% | 33.8% | 32.7% |

Meeting a 30% tolerance would need a different core or allocation. That is outside this assignment, and nothing is
proposed here.

## 7. Assessment

1. **Leading candidate: yes.** All-lowDd keeps 89% of its fixed-pool advantage and 87% of its portfolio advantage at
   10 bps, with almost no change to its trade sequence. On costs it is clearly more robust than all-primary.
2. **Risk per dollar: competitive.** Its fixed-pool net ÷ drawdown leads VGT D1 at every cost level. At matched
   borrowing it adds $90k–$179k.
3. **Drawdown thresholds.**
   - Fixed pool: historically within $35k at every cost level.
   - Portfolio: 34.6%, above 30%. B is also above at 32.7%, and so is the unleveraged core.
4. **Tail risk: no new kind of risk.** The binding mechanism is D1's inactive stop on a losing lot, which takes any
   gap in full. In the fixed pool, All-lowDd's thinner headroom means a 10% sector gap on a March 2020 lot crosses
   $35k. The same gap on VGT D1 does not.
5. **Still open from the earlier program:** Vanguard's 30-day rule for newly bought Vanguard ETFs, as published,
   blocks funding VGT lots on margin (`VANGUARD_MARGIN_RISK.md`). It was not investigated here, per the assignment.

**Only one issue is genuinely critical, and it needs a reporting correction, not more research:** the percentage
drawdown figure used to judge the 30% tolerance (§6). No further optimization or stress testing is recommended.
