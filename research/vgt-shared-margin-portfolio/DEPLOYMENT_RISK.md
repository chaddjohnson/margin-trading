# Deployment risk (Track III)

How the frozen D1 (and its gross-breakeven variant B2) behaves under dynamic 20%-of-equity sizing when fills,
gaps, costs, interest, broker rules and position size are varied. Nothing in this document is a forecast: the
observed-history figures are inspected backtests, the sensitivities are predeclared variations of one input, and
the stress cases are named hypothetical shocks imposed on the observed path. Every table below is copied from a
file under `results/` (named in each caption); `npm run shared-margin -- stress` and `-- run` regenerate them.

## 1. What is frozen, what is varied, and how to read the grades

Frozen throughout: D1's entry and exit logic (X 21.6%, Y 0.3%, L 74, stop 7.3%, hold 8 days, buffer 2.9%, P 9%,
W 60), B2's gross-breakeven latch, the 2017-06-15 eligibility, the $300,000 60/40 start, the primary core policy
(profits reinvested 60/40, losses funded by proportional core sales). Varied, one input at a time: the price path
(gaps), fill prices (costs, stop fills), the interest rate, the maintenance requirement, and the borrowed fraction.

| Grade | Meaning | Where it appears |
|---|---|---|
| computed | the ledger on the observed 2016-01-04 → 2025-10-13 data | scenario B, B2 and their margin ratios |
| sensitivity | one predeclared input changed, observed path | costs, stop fills, rates, allocation, maintenance thresholds |
| stress | a named hypothetical shock applied to the observed path | gap tables, correlated falls, full-path re-runs |
| assumption | a broker, spread or fill figure not verified against an account or a tape | 35% / 50% house rules, basis-point costs, stop-level fills |

## 2. Gap-through-stop tests

**Method.** For every lot of scenario B (20) and B2 (20), VGT is multiplied by (1 − g), g ∈ {5, 10, 20, 30}%,
from the open of a chosen session onwards, and the lot is replayed under its frozen exit rules on the shifted path
(`src/shared-margin-portfolio/replay.ts`). Three sessions are chosen per lot: (a) the session after the entry,
when D1's stop is still inactive; (b) the first session on which the stop is eligible (14 of the 20 lots ever
reach one); (c) the session of the deepest portfolio drawdown while the lot was open. VOOG falls ρ·g with
ρ ∈ {0, 0.5, 1}. A stop gapped through fills at the gapped open, never at the crossed level; a stop that is
inactive leaves the maximum-hold exit to sell at the next trade after the open on the hold day. The portfolio hit
uses the ledger row of the previous close: core VGT and the lot fall by g, VOOG by ρ·g, debt is unchanged.
1,176 rows in `results/stress/stress_gaps.csv`.

### 2.1 Summary (scenario B; `results/tables/stress_gaps_summary.md`)

| Case | Gap | VOOG fall | Lots | Worst equity loss | Worst equity loss % | Worst lot net (shocked) | Worst lot loss % of equity | Lowest equity/LMV | Breaches 25/35/50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| after entry (stop inactive) | 5% | 0% | 20 | $54,559 | 3.4% | −$21,843 | 1.8% | 82.4% | 0/0/0 |
| after entry (stop inactive) | 5% | 5% | 20 | $95,173 | 6.0% | −$21,843 | 1.8% | 82.0% | 0/0/0 |
| after entry (stop inactive) | 10% | 0% | 20 | $109,118 | 6.9% | −$37,052 | 2.8% | 81.9% | 0/0/0 |
| after entry (stop inactive) | 10% | 10% | 20 | $190,346 | 12.1% | −$37,052 | 2.8% | 81.0% | 0/0/0 |
| after entry (stop inactive) | 20% | 0% | 20 | $218,236 | 13.8% | −$67,470 | 4.8% | 80.7% | 0/0/0 |
| after entry (stop inactive) | 20% | 20% | 20 | $380,692 | 24.1% | −$67,470 | 4.8% | 78.6% | 0/0/0 |
| after entry (stop inactive) | 30% | 0% | 20 | $327,353 | 20.7% | −$97,889 | 6.8% | 79.4% | 0/0/0 |
| after entry (stop inactive) | 30% | 15% | 20 | $449,196 | 28.4% | −$97,889 | 6.8% | 77.6% | 0/0/0 |
| after entry (stop inactive) | 30% | 30% | 20 | $571,039 | 36.2% | −$97,889 | 6.8% | 75.6% | 0/0/0 |
| first active stop | 5% | 0% | 14 | $56,237 | 3.4% | −$1,345 | 0.1% | 83.8% | 0/0/0 |
| first active stop | 10% | 0% | 14 | $112,474 | 6.8% | −$17,040 | 1.0% | 83.4% | 0/0/0 |
| first active stop | 20% | 0% | 14 | $224,949 | 13.6% | −$48,430 | 3.0% | 82.3% | 0/0/0 |
| first active stop | 30% | 0% | 14 | $337,423 | 20.4% | −$79,820 | 4.9% | 81.1% | 0/0/0 |
| first active stop | 30% | 30% | 14 | $586,522 | 35.6% | −$79,820 | 4.9% | 77.6% | 0/0/0 |
| deepest core drawdown while open | 10% | 10% | 15 | $185,490 | 12.1% | −$37,052 | 2.8% | 80.4% | 0/0/0 |
| deepest core drawdown while open | 20% | 20% | 15 | $370,980 | 24.3% | −$67,470 | 4.9% | 78.0% | 0/0/0 |
| deepest core drawdown while open | 30% | 30% | 15 | $556,470 | 36.4% | −$97,889 | 6.9% | 74.9% | 0/0/0 |

The B2 rows are identical except for rounding of the ratio in the second decimal (the two variants hold the same
lots and the latch and the net rule are both eligible or both inactive on every shock session tested). The
complete 72-row table is in the source file.

**Findings.**

- **No breach.** Across all 1,176 rows no gap up to 30% in both ETFs takes equity ÷ LMV below 50%, let alone 35%
  or 25%. The lowest ratio reached is 74.9% (the 2020-03-12 lot, 30% fall in both ETFs on 2020-03-20). A 20%-of-
  equity lot on an unleveraged core means debt is at most about 22% of equity; the cushion is structural.
- **Worst lot loss:** −$97,889 on the 2025-04-11 lot ($309,885 principal) after a 30% VGT gap on 2025-04-14 while
  the stop was inactive; the maximum-hold exit sells on 2025-04-21 at 348.37 against a 507.00 cost. That is 6.9% of
  the pre-shock equity. Historically the same lot lost $6,633.
- **Worst equity loss:** 36.4% ($556,470 on the 2020-03-12 lot's deepest-drawdown session with a 30% fall in both
  ETFs). With VOOG unshocked (ρ = 0) a 30% VGT gap costs 20.4–20.7% of equity; the lot adds roughly 7 points to
  the core's loss.
- **Inactive stop versus active stop.** While the stop is inactive (every lot's first sessions) a 10% gap leaves the
  lot to the maximum hold: all 20 lots exit by maximum hold with a median shocked net of −$10,008 and a worst of
  −$37,052. When the stop is active, a gap sells at the open as a gapped stop: at 5% the worst lot net is −$1,345
  (most lots still exit in profit), at 10% −$17,040, at 20% −$48,430, at 30% −$79,820. The stop limits but does not
  bound the loss; the gap itself is the loss.

### 2.2 The 25 worst outcomes (`results/tables/stress_gaps_worst.md`, excerpt)

| Scenario | Lot | Entry | Case | Shock date | Stop active? | Gap | VOOG fall | Pre-shock equity | Equity after gap | Equity/LMV after | Lot exit | Reason | Lot net shocked | Lot net historical |
| --- | ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: |
| B | 19 | 2025-04-11 @507.00 | after entry (stop inactive) | 2025-04-14 | false | 30% | 0% | $1,593,577 | $1,266,224 | 80.3% | 2025-04-21 @348.37 | maximum hold | −$97,889 | −$6,633 |
| B | 19 | 2025-04-11 @507.00 | after entry (stop inactive) | 2025-04-14 | false | 30% | 30% | $1,593,577 | $1,022,539 | 76.7% | 2025-04-21 @348.37 | maximum hold | −$97,889 | −$6,633 |
| B | 19 | 2025-04-11 @507.00 | deepest core drawdown while open | 2025-04-21 | false | 30% | 30% | $1,544,456 | $987,985 | 76.1% | 2025-04-21 @348.37 | maximum hold | −$97,889 | −$6,633 |
| B | 18 | 2025-04-04 @491.58 | first active stop | 2025-04-10 | true | 30% | 0% | $1,644,189 | $1,309,206 | 81.4% | 2025-04-10 @361.24 | trailing stop gap | −$79,820 | +$3,744 |
| B | 18 | 2025-04-04 @491.58 | first active stop | 2025-04-10 | true | 30% | 30% | $1,644,189 | $1,061,095 | 78.0% | 2025-04-10 @361.24 | trailing stop gap | −$79,820 | +$3,744 |

The B2 rows duplicate the B rows for the same lots. The 2025 lots dominate because they are the largest (about
$300,000 of principal on $1.5–1.6 million of equity), not because the 2025 path is special.

### 2.3 Five different "largest losses", and the $35,000 screen

These are distinct quantities and are reported separately throughout (`results/tables/strategy_statistics.md`,
`results/scenario_summary.csv`):

| Quantity | B (dynamic 20%) | B-fixed100k (legacy, $100,000 per entry) | Grade |
|---|---:|---:|---|
| Largest realized losing trade | −$6,633 (2025-04-11 → 2025-04-21, maximum hold) | −$3,447 | computed |
| Largest intratrade adverse excursion (minute lows, net of interest) | −$24,954 | −$11,003 | computed |
| Largest stand-alone strategy drawdown (realized + marked lots) | $28,108 daily / $40,402 minute-sampled | $15,611 / $19,331 | computed |
| Largest combined portfolio drawdown | $484,116 = 25.3% daily, 2025-01-23 → 2025-04-08 (recovered 2025-05-16); $561,090 = 29.3% minute-sampled, VOOG forward-filled | $382,469 = 22.8% / $438,722 = 26.1% | computed |
| Maximum potential loss under a named stress | lot −$97,889, equity −36.4% (30% fall in both ETFs) | — | stress |

Scenario A's own drawdown is $386,774 = 33.9% (2021-12-27 → 2022-10-14): B's largest portfolio drawdown is
*smaller in percentage* than A's because B's equity entered 2022 higher and the 2022 D1 trades were nearly flat
(+$45,324 realized in 2022). The $35,000 historical drawdown ceiling of the earlier programs applied to a
standalone $100,000 allocation; its normalized equivalent here is the B-fixed100k row ($15,611 daily / $19,331
minute-sampled, unchanged from the earlier reports). It must not be read as a dollar cap on a compounded
$300,000 → $2.3 million portfolio whose lots reach $310,000; the dynamic-dollar strategy drawdown is $28,108 /
$40,402 and the portfolio-level drawdown is in the hundreds of thousands in every scenario, including A.

## 3. Execution costs (`results/tables/scenario_comparison.md`, deployment sensitivities)

A per-side cost of c basis points is applied to every fill except dividend reinvestment: lot buys at price × (1 + c),
sells at price × (1 − c), and the same on core reinvestment, loss funding and liquidation. Commission $0 (Vanguard
charges none for online ETF trades). No spread was measured; the grid is hypothetical.

| Scenario | End equity | vs A | Strategy net | Trades | W/L | Interest |
|---|---:|---:|---:|---:|---:|---:|
| B (0 bps) | $2,346,272 | +$561,684 | +$314,382 | 20 | 14/5 | $55,902 |
| B-cost2 | $2,342,543 | +$557,955 | +$312,543 | 20 | 14/5 | $55,854 |
| B-cost5 | $2,336,965 | +$552,376 | +$309,792 | 20 | 14/5 | $55,782 |
| B-cost10 | $2,327,701 | +$543,113 | +$305,227 | 20 | 13/6 | $55,664 |
| B-cost25 | $2,153,645 | +$369,057 | +$237,346 | 18 | 10/7 | $42,201 |

Up to 10 bps the cost is close to linear (about −$1,900 of end equity per basis point) and the trade list is
unchanged, though at 10 bps one exit flips from a small win to a small loss. At 25 bps the strategy's own tests
change: fewer shares per dollar of principal lower every mark, the net-profit stop activates later and the
buffered-loss threshold is reached sooner, so two trades disappear (18 instead of 20) and the win/loss count falls
to 10/7. Costs are not an additive haircut; they feed D1's decision rules.

## 4. Intrabar uncertainty (stop fills)

The files assume a stop crossed within a minute fills at the stop level. The `next-open` rule fills at the next
minute's opening trade, and two stress variants add 10 and 50 bps of adverse slippage to every stop fill.

| Scenario | End equity | Strategy net | Realized | Strategy DD daily / minute |
|---|---:|---:|---:|---:|
| B (stop level) | $2,346,272 | +$314,382 | +$172,969 | $28,108 / $40,402 |
| B-nextopen | $2,347,854 | +$315,060 | +$173,551 | $28,512 / $40,467 |
| B-nextopen-slip10 | $2,341,880 | +$312,146 | +$170,999 | $28,746 / $40,576 |
| B-nextopen-slip50 | $2,318,121 | +$300,566 | +$160,860 | $29,668 / $41,005 |
| B2-nextopen | $2,347,854 | +$315,060 | +$173,551 | $28,512 / $40,467 |

On this history the next-open fill is marginally *better* than the stop level (+$1,582 of end equity): stops were
mostly crossed on minutes that closed near the level. 50 bps of adverse stop slippage costs $28,151 of end equity.
B2-nextopen equals B-nextopen exactly: the latch and the net rule select the same stop sessions regardless of the
fill convention. None of this identifies the true intrabar queue; minute bars show that trading crossed a level,
not the price a stop-market order received.

## 5. Margin-account constraints

| Rule | Level | Status in this study | Grade |
|---|---|---|---|
| Reg T initial margin | debt ≤ 50% of LMV after a purchase | checked at every entry; 0 declines in every scenario | regulation |
| FINRA Rule 4210 maintenance | equity ≥ 25% of LMV | never approached | regulation |
| Vanguard house maintenance | 35% for "most marginable securities" | from Vanguard's margin risk disclosure as retrieved 2026-10-22; not verified against an account agreement; Vanguard states it may raise it without notice | assumption |
| Vanguard concentrated positions | 50% or higher | plausibly applicable: the account is 40–52% VGT and the lot is VGT, so a single-sector concentration test could be met | assumption |
| Forced liquidation (this study's rule) | below m at a close → at the next open sell the lot(s), then core proportionally, until equity ÷ LMV ≥ m + 5 points | generic, illustrative; a forced lot exit opens no continuation window | assumption |

Historical result (computed): B-m25, B-m35 and B-m50 are identical to B — no forced sale ever triggers. The
lowest daily equity ÷ LMV of B is 82.0% on 2020-03-16; the lowest minute-sampled value is 81.3% at 2020-03-18
18:27Z (VOOG forward-filled); the highest LMV ÷ equity is 1.219× and the highest debt ÷ equity 21.9%. The
account spends 36.5% of eligible sessions with a lot and the rest unleveraged.

## 6. Correlated stress from the balance sheet (`results/tables/stress_correlated.md`)

Uniform one-day falls in both ETFs applied to the ledger at the named close. "Fall to reach m" solves
`equity' = m × LMV'` for a uniform fall; "sale after −30%" is the forced liquidation needed to restore m + 5
points after a 30% fall (zero in every row).

| Scenario | Date | Context | Equity | LMV | Debt | Equity/LMV | Fall to 25% / 35% / 50% | Equity after −20% / −30% / −40% / −50% | Equity/LMV after −30% / −50% |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B | 2020-03-16 | lowest equity ÷ LMV of the run | $505,837 | $616,574 | $110,737 | 82.0% | 76.1% / 72.4% / 64.1% | $382,522 / $320,865 / $259,208 / $197,550 | 74.3% / 64.1% |
| B | 2025-10-13 | highest debt of the run | $2,346,272 | $2,664,899 | $318,626 | 88.0% | 84.1% / 81.6% / 76.1% | $1,813,293 / $1,546,803 / $1,280,313 / $1,013,823 | 82.9% / 76.1% |
| B | 2018-12-24 | lowest equity ÷ LMV of 2018 | $409,286 | $494,949 | $85,663 | 82.7% | 76.9% / 73.4% / 65.4% | $310,296 / $260,801 / $211,306 / $161,811 | 75.3% / 65.4% |
| B | 2021-03-08 | lowest equity ÷ LMV of 2021 | $973,138 | $1,166,174 | $193,037 | 83.4% | 77.9% / 74.5% / 66.9% | $739,903 / $623,286 / $506,668 / $390,051 | 76.4% / 66.9% |
| B | 2022-06-16 | lowest equity ÷ LMV of 2022 | $934,433 | $1,129,819 | $195,386 | 82.7% | 76.9% / 73.4% / 65.4% | $708,470 / $595,488 / $482,506 / $369,524 | 75.3% / 65.4% |
| B | 2025-04-08 | lowest equity ÷ LMV of 2025 | $1,427,697 | $1,727,066 | $299,370 | 82.7% | 76.9% / 73.3% / 65.3% | $1,082,283 / $909,577 / $736,870 / $564,163 | 75.2% / 65.3% |
| B-f25 | 2020-03-16 | lowest equity ÷ LMV of the run | $512,341 | $653,120 | $140,780 | 78.4% | 71.3% / 66.8% / 56.9% | $381,717 / $316,405 / $251,092 / $185,780 | 69.2% / 56.9% |
| B-f25 | 2025-10-13 | highest debt of the run | $2,508,066 | $2,927,556 | $419,489 | 85.7% | 80.9% / 78.0% / 71.3% | $1,922,555 / $1,629,800 / $1,337,044 / $1,044,288 | 79.5% / 71.3% |
| B-f25 | 2025-04-08 | lowest equity ÷ LMV of 2025 | $1,500,985 | $1,895,312 | $394,326 | 79.2% | 72.3% / 68.0% / 58.4% | $1,121,923 / $932,392 / $742,861 / $553,330 | 70.3% / 58.4% |
| P3 | 2018-12-24 | lowest equity ÷ LMV of the run | $411,347 | $499,823 | $88,476 | 82.3% | 76.4% / 72.8% / 64.6% | $311,382 / $261,400 / $211,418 / $161,435 | 74.7% / 64.6% |
| P3 | 2025-04-09 | highest debt of the run | $1,634,307 | $1,932,669 | $298,362 | 84.6% | 79.4% / 76.2% / 69.1% | $1,247,773 / $1,054,507 / $861,240 / $667,973 | 77.9% / 69.1% |

From B's worst historical balance sheet a uniform 64.1% fall would be needed to reach a 50% requirement, 72.4%
for 35% and 76.1% for 25%; at 25% borrowing the same figures are 56.9% / 66.8% / 71.3%. A 50% fall in both ETFs
from the worst day leaves B at $197,550 of equity (−61%), still at a 64.1% ratio. The exposure is the loss, not
the margin call. Years without a lot (2016–2017, 2023–2024) have a 100% ratio and no debt.

## 7. Full-path shock re-runs (`results/tables/stress_full_path.md`)

The whole VGT and VOOG series are multiplied by (1 − g) from the session after the two anchor entries (the largest
lot, 2025-04-11, and the 2020-03-12 lot) and scenario B is re-run with forced liquidation below 35% or 50%. After
the shock the rolling highs, later signals and sizes all follow the shifted path, so these runs show how a shock
propagates, not what the strategy "would have made".

| Run | Shock date | Gap | Maintenance | Shocked lot exit (reason, net) | Forced sales | End equity | vs B | Daily max DD | Min equity/LMV | Trades | Strategy net |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shock-2025-04-14-g10 | 2025-04-14 | 10% | 35% / 50% | 2025-04-21 (maximum hold, −$37,052) | 0 | $2,064,165 | −$282,107 | $595,580 (31.2%) | 81.4% | 20 | +$266,923 |
| shock-2025-04-14-g20 | 2025-04-14 | 20% | 35% / 50% | 2025-04-21 (maximum hold, −$67,470) | 0 | $1,782,023 | −$564,250 | $775,909 (40.6%) | 79.1% | 20 | +$219,465 |
| shock-2025-04-14-g30 | 2025-04-14 | 30% | 35% / 50% | 2025-04-21 (maximum hold, −$97,889) | 0 | $1,499,830 | −$846,443 | $956,238 (50.0%) | 76.1% | 20 | +$172,007 |
| shock-2020-03-13-g10 | 2020-03-13 | 10% | 35% / 50% | 2020-03-20 (maximum hold, −$14,519) | 0 | $2,073,502 | −$272,771 | $427,442 (25.3%) | 80.1% | 20 | +$270,745 |
| shock-2020-03-13-g20 | 2020-03-13 | 20% | 35% / 50% | 2020-03-20 (maximum hold, −$25,224) | 0 | $1,800,191 | −$546,082 | $370,674 (25.3%) | 77.6% | 20 | +$227,073 |
| shock-2020-03-13-g30 | 2020-03-13 | 30% | 35% / 50% | 2020-03-20 (maximum hold, −$35,930) | 0 | $1,526,100 | −$820,172 | $417,667 (57.1%) | 74.4% | 20 | +$183,349 |

The 35% and 50% runs are identical: no forced sale occurs in any of them. The end-equity cost is almost entirely
the permanent repricing of the core (a 10% permanent shock to both ETFs removes about 12% of end equity in both
anchors); the lot's share is the −$14,519 to −$97,889 shown. The 30% shock after 2025-04-11 turns B's observed
25.3% drawdown into a 50.0% drawdown from the 2025-01-23 peak, and the 2020 30% shock produces a 57.1% drawdown
from the 2020-02-19 peak. These are the consequences of the named shock on a leveraged-by-20% account, not
estimates of their probability.

## 8. Interest: financing versus exit timing (`results/tables/stress_interest.md`)

| Scenario | From rate | To rate | Net at from-rate | Financing-only net (same trades, recomputed interest) | Actual net at to-rate | Financing effect | Timing effect | Exits changed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B | 11% | 8% | +$314,382 | +$329,627 | +$332,534 | +$15,246 | +$2,906 | 0 |
| B | 11% | 14% | +$314,382 | +$299,136 | +$296,506 | −$15,246 | −$2,630 | 0 |
| B2 | 11% | 8% | +$314,382 | +$329,627 | +$332,534 | +$15,246 | +$2,906 | 0 |
| B2 | 11% | 14% | +$314,382 | +$299,136 | +$296,506 | −$15,246 | −$2,630 | 0 |

Three points of rate move the strategy net by about $15,246 of pure financing on the realized trades. The further
±$2,600–2,900 "timing" effect comes with zero changed exit sessions: it is the different interest accrued on the
open 2025-04-22 lot and the slightly different principal sizes that follow from compounding, not a changed
decision. D1 and B2 coincide at 8%, 11% and 14% because on this history the net-profit stop never became
eligible or ineligible on a session where the gross-breakeven latch disagreed.

Where the two rules diverge, by construction: D1 re-decides each session whether a fill at the stop level would
be profitable *after interest through that date*; on a long-held position whose stop sits just above cost, accruing
interest can switch the stop off again (this happened once on D1's history, 2021-04-05, harmlessly) and a higher
rate switches it off sooner. B2's latch is irreversible once the level reaches the entry price, so interest never
disables it; the price of that is a latched stop that can sell at a small net loss (the stop level is above the
gross cost but below cost plus interest). The 2023 trough trade of the previous program, whose fate depended on
8% versus 11% interest under the net rule, is documented in
`research/vgt-d1-refinement/results/diagnostics/stop_semantics.md`. Neither rule is categorically safer: D1's can
leave a position unprotected longer at high rates; B2's can realize small net losses at any rate.

## 9. Borrowed-allocation sensitivity (`results/tables/scenario_comparison.md`, `strategy_statistics.md`)

| Scenario | f | End equity | vs A | CAGR | Daily max DD | Minute max DD | Min equity/LMV (daily / minute) | Max LMV/equity | Strategy net | Strategy DD daily / minute | Worst trade | Worst adverse excursion | Interest | Max principal |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A | 0% | $1,784,588 | — | 20.01% | $386,774 (33.9%) | $434,474 (28.0%) | 100% | 1.000× | — | — | — | — | $0 | — |
| B-f10 | 10% | $2,049,137 | +$264,549 | 21.72% | $430,152 (25.0%) | $494,280 (28.6%) | 90.2% / 89.8% | 1.109× | +$145,930 | $12,635 / $18,211 | −$2,979 | −$11,221 | $26,005 | $139,171 |
| B-f15 | 15% | $2,193,434 | +$408,846 | 22.57% | $456,442 (25.2%) | $526,767 (28.9%) | 85.9% / 85.3% | 1.164× | +$227,187 | $19,993 / $28,777 | −$4,716 | −$17,752 | $40,440 | $220,320 |
| **B** | **20%** | **$2,346,272** | **+$561,684** | **23.42%** | **$484,116 (25.3%)** | **$561,090 (29.3%)** | **82.0% / 81.3%** | **1.219×** | **+$314,382** | **$28,108 / $40,402** | **−$6,633** | **−$24,954** | **$55,902** | **$309,885** |
| B-f25 | 25% | $2,508,066 | +$723,478 | 24.27% | $513,234 (25.5%) | $597,347 (29.6%) | 78.4% / 77.5% | 1.275× | +$407,838 | $37,028 / $53,153 | −$8,743 | −$32,869 | $72,442 | $408,427 |

The trade list is the same 20 trades at every f (sizing never changes a decision). Each 5-point step in f adds
roughly $150,000 of end equity and removes roughly 3.7–4 points of minimum equity ÷ LMV; the portfolio drawdown
percentage barely moves (25.0% → 25.5%) because the 2025 drawdown is dominated by the core, while the strategy's
own dollar drawdown, worst trade and adverse excursion scale almost linearly with f.

**Is 20% imprudent on this evidence?** Not from a margin-call standpoint: at 20% and even at 25%, no historical
balance sheet, no 30% gap and no 50% uniform fall reaches a 50% requirement (§2, §6, §7). The binding risk is the
dollar size of a single adverse lot. At the end of the data one lot of $302,751 principal is open on $2.35 million
of equity; a 30% gap against it would cost about $98,000 (6.9% of equity) before the maximum hold could sell, and
the core would lose far more in the same event. Reducing f to 10% halves every strategy-side figure (worst
excursion −$11,221, strategy drawdown $18,211) at the cost of $297,000 of end equity relative to 20%; raising it to
25% buys $162,000 for 3.6 points of cushion and a −$32,869 excursion. The choice is a loss-tolerance decision, not
one the data settles; the evidence does not call 20% imprudent, and it does not reward 25% with anything but
proportionally larger exposure.

## 10. The fixed-$100,000 legacy control

| Scenario | End equity | vs A | Strategy net | Realized / unrealized | Strategy DD daily / minute | Worst trade | Worst adverse excursion | Interest |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B-fixed100k | $1,959,043 | +$174,455 | +$183,044 | +$136,334 / +$46,709 | $15,611 / $19,331 | −$3,447 | −$11,003 | $33,362 |

This row is the earlier programs' D1 ($183,044 / $19,331, 20 entries) sitting inside the $300,000 portfolio with
profits held as cash; it ties this study to `research/vgt-d1-refinement/`. Every primary figure above uses dynamic
equity-based sizing instead.

## 11. What remains hypothetical or unverified

- Vanguard's 35% house maintenance requirement and its 50% concentrated-position rule are taken from a retrieved
  disclosure; the account's actual agreement, whether a 60/40 VOOG/VGT account with a VGT lot would be classified
  as concentrated, and Vanguard's right to raise requirements without notice were not verified. The forced-
  liquidation sequence (lot first, then core, restore m + 5 points at the next open) is this study's rule, not a
  broker's.
- Margin interest: 11% simple on a 365-day year, accrued per calendar day and paid at exit, as in the strategy
  files; Vanguard's tiered, floating schedule, monthly capitalization and settlement-fund interaction are not
  modelled. 8% and 14% are sensitivities only.
- Spreads, slippage and commissions: no VGT or VOOG spread was measured; the 2–25 bps grid is hypothetical, and
  VOOG's thin trading (median 149 traded minutes a session) makes its reinvestment fills less reliable than VGT's.
- Stop fills: the stop-level fill, the next-open fill and the 10/50 bps variants bound, but do not identify, the
  intrabar price a stop-market order would have received in a fast market; a gap through the stop fills at the
  open in every case here, and real opens can be worse.
- Gap and correlated shocks are imposed on the observed path at named dates with named sizes; they say nothing
  about their likelihood, and the full-path re-runs change every later signal.
- No taxes (short-term realized gains and dividends would be taxable in a taxable account), no advisory fees, no
  deposits or withdrawals, fractional shares at full precision (whole-share sensitivity: B-whole, −$23,076 of end
  equity), and the distribution ledger is derived from adjusted prices to about ±1%.
- Everything is one inspected history of 2016–2025 VGT and VOOG; none of it is evidence of the strategy's future
  edge.
