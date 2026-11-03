# Phase 3B: the three frozen depth-conditional entry policies

Exactly three conditional policies were specified in [PROTOCOL.md](PROTOCOL.md) §7 before any result existed. Each was run as a complete, path-dependent backtest (no stitching of trades) under both stop models, both stop fills and all four cost levels, on the warm-start continuous run.

| Policy | SHALLOW (2.5–5%) | MODERATE (5–10%) | DEEP (10–15%) | EXTREME (≥ 15%) |
|---|---|---|---|---|
| `BAND_STABILIZE` | `CLOSE_1M` | `STABLE_15` | `STABLE_30` | `STABLE_30` ∧ `REBOUND_05` |
| `BAND_PERSIST` | `CLOSE_1M` | `PERSIST_15` | `PERSIST_30` | `STABLE_30` |
| `BAND_LATE_DEEP` | `CLOSE_1M` | `STABLE_15` | `CLOSE_1M` | `CLOSE_1M` |

How the state machine works (implementation in `src/intraday-study/policies.ts`, tested in `tests/policies.test.ts`, independently replayed in [replay/](replay/REPLAY_REPORT.md)):

- **Eligible minutes.** Intraday branches use minutes completed between 10:00 ET and one minute before the close.
- **Band runs.** A band run is a sequence of qualifying minutes in one band. It restarts from scratch whenever the band changes or qualification is lost, and no time, high or low is ever credited across bands. A missing minute resets the run's timers but keeps its trough.
- **`CLOSE_1M` branches** fire only at the incumbent's final decision, using that decision's band.
- **Fixed rules** are carried over unchanged: one entry per session, the restriction gate at every candidate, fills, and exits.

**Short answer:**

- **None of the three improves on the incumbent** under either stop model:
  - `BAND_LATE_DEEP`, the "don't buy deep declines early" control, is closest. With the daily stop it is −$8,517, which is within the range of single-episode noise.
  - `BAND_STABILIZE` and `BAND_PERSIST` lose $45k–$55k (daily stop) and $24k–$31k (minute stop).
- **They beat their own unconditional constituents** by $8k–$70k. This happens because they keep the close-time rule for SHALLOW dips, where unconditional early entry does most of its damage. It is evidence for the close rule, not for depth conditioning.

## 1. Results against the incumbent with the same stop model (5 bp, `stop` fill unless noted)

<!-- include: tables/conditional_summary.md -->
| Policy | Stop | Trades | Losing trades / net | Winning trades / net | Net 5 bp | Δ vs CLOSE_1M (stop fill) | Δ (next-open) | Δ 20 bp | Minute DD stop / next-open | Daily DD | Interest | Turnover | Sessions held | Years + | Ensemble median Δ (starts > 0) | 2024–25 flat-start Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | daily | 171 | 57 / −$146,597 | 114 / $332,769 | $186,172 | — | — | — | $25,914 / $25,914 | $21,934 | $62,564 | $34.5M | 1604 | — | — | — |
| `BAND_STABILIZE` | daily | 176 | 68 / −$175,555 | 108 / $316,286 | $140,731 | −$45,441 | −$45,627 | −$46,873 | $25,625 / $25,634 | $22,970 | $61,901 | $35.4M | 1594 | 3/10 | −$31,729 (0/29) | −$11,622 |
| `BAND_PERSIST` | daily | 177 | 67 / −$183,986 | 110 / $314,818 | $130,831 | −$55,341 | −$55,289 | −$57,058 | $27,906 / $27,890 | $27,113 | $62,022 | $35.6M | 1600 | 3/10 | −$43,512 (0/29) | −$12,001 |
| `BAND_LATE_DEEP` | daily | 173 | 59 / −$152,329 | 114 / $329,985 | $177,656 | −$8,517 | −$8,494 | −$9,106 | $25,914 / $25,914 | $21,934 | $63,981 | $34.9M | 1636 | 5/10 | −$3,899 (12/29) | +$670 |
| `CLOSE_1M` | minute | 176 | 57 / −$155,437 | 119 / $339,367 | $183,930 | — | — | — | $27,721 / $27,902 | $24,285 | $61,690 | $35.5M | 1596 | — | — | — |
| `BAND_STABILIZE` | minute | 185 | 66 / −$175,746 | 119 / $335,333 | $159,587 | −$24,343 | −$25,066 | −$27,008 | $28,091 / $28,122 | $28,018 | $61,630 | $37.2M | 1595 | 4/10 | −$17,135 (5/29) | +$4,902 |
| `BAND_PERSIST` | minute | 187 | 68 / −$187,748 | 119 / $341,020 | $153,272 | −$30,658 | −$31,924 | −$33,914 | $25,270 / $25,678 | $24,830 | $61,751 | $37.6M | 1605 | 4/10 | −$23,025 (4/29) | +$3,412 |
| `BAND_LATE_DEEP` | minute | 176 | 59 / −$161,434 | 117 / $327,217 | $165,783 | −$18,147 | −$18,285 | −$18,121 | $27,721 / $27,902 | $24,285 | $62,745 | $35.4M | 1616 | 3/10 | −$13,459 (6/29) | +$674 |
<!-- /include -->

Classification under the predeclared rules ([tables/classification.md](tables/classification.md)): all six conditional × stop-model comparisons with `CLOSE_1M` are **"argues against"**, because Δnet ≤ 0 under both fills.

Minute DD is never worse than the incumbent's by more than $2.5k, and stays below $30,000 at 5 bp for all three under both stop models. Across all stop-model, fill and cost scenarios, the worst minute DD is:

- `BAND_LATE_DEEP`: $28.8k, the same as the incumbent's own worst ($28.8k, minute stop, `next-open`, 20 bp);
- `BAND_STABILIZE`: $36.9k (minute stop, `next-open`, 20 bp);
- `BAND_PERSIST`: $41.4k (daily stop, `next-open`, 20 bp).

The last two breach the $30k gate only at 10–20 bp/side. `BAND_STABILIZE` does so with the minute stop; `BAND_PERSIST` with the daily stop, and with the minute stop at 20 bp. See [tables/risk_gate.md](tables/risk_gate.md).

**Where the shortfall comes from:**

- **More and larger losing trades.** `CLOSE_1M` has 57 losing trades (−$146.6k) with the daily stop. `BAND_STABILIZE` has 68 (−$175.6k) and `BAND_PERSIST` 67 (−$184.0k), while their winners add slightly less than the incumbent's.
- **Not better entries.** On average their MODERATE-band entries are no cheaper than the close fill: +0.13%, −0.10% and +0.33% price improvement. Their EXTREME entries pay 0.56%–0.82% more.
- **Not faster exits.** The exits are identical rules under the daily stop.
- **`BAND_LATE_DEEP`** has 59 losers (−$152.3k) and the same 114 winners count (+$330.0k vs +$332.8k).

**Does the pattern survive `next-open` and costs?** Yes, unchanged. Δ moves by less than $1.3k between fills, and by at most $3.3k between 5 and 20 bp.

## 2. Against the underlying unconditional mechanisms

<!-- include: tables/conditional_vs_constituents.md -->
| Conditional policy | Stop model | Constituent | Δ net (stop) | Δ net (next-open) | Δ minute DD (stop) | Years + |
|---|---:|---:|---:|---:|---:|---:|
| `BAND_STABILIZE` | daily | `STABLE_15` | +$7,979 | +$6,893 | −$5,647 | 6/10 |
| `BAND_STABILIZE` | daily | `STABLE_30` | +$38,236 | +$37,809 | −$2,020 | 6/10 |
| `BAND_STABILIZE` | daily | `REBOUND_05` | +$10,951 | +$9,824 | −$8,660 | 5/10 |
| `BAND_STABILIZE` | minute | `STABLE_15` | +$24,008 | +$24,130 | −$3,182 | 6/10 |
| `BAND_STABILIZE` | minute | `STABLE_30` | +$31,353 | +$31,004 | +$1,364 | 7/10 |
| `BAND_STABILIZE` | minute | `REBOUND_05` | +$23,834 | +$23,525 | +$299 | 5/10 |
| `BAND_PERSIST` | daily | `PERSIST_15` | +$23,973 | +$23,666 | −$8,116 | 6/10 |
| `BAND_PERSIST` | daily | `PERSIST_30` | +$45,867 | +$46,018 | −$9,319 | 8/10 |
| `BAND_PERSIST` | daily | `STABLE_30` | +$28,336 | +$28,147 | +$260 | 7/10 |
| `BAND_PERSIST` | minute | `PERSIST_15` | +$39,869 | +$39,787 | −$4,652 | 7/10 |
| `BAND_PERSIST` | minute | `PERSIST_30` | +$70,188 | +$69,966 | −$13,756 | 8/10 |
| `BAND_PERSIST` | minute | `STABLE_30` | +$25,038 | +$24,146 | −$1,457 | 7/10 |
| `BAND_LATE_DEEP` | daily | `STABLE_15` | +$44,903 | +$44,026 | −$5,358 | 8/10 |
| `BAND_LATE_DEEP` | minute | `STABLE_15` | +$30,204 | +$30,911 | −$3,551 | 6/10 |
<!-- /include -->

Every conditional policy beats each of its constituents, under both stop models and both fills.

**Why:** the conditional policies replace intraday buying of SHALLOW dips by the close rule. That is the band where Phase 1 found the bulk of the early-entry losses (−$34k to −$71k per unconditional policy). This comparison measures *how much less early buying* they do. It does not measure a benefit from conditioning on depth: relative to the pure close rule, the remaining early buying (MODERATE/DEEP/EXTREME) still loses.

## 3. Stop-model interaction

<!-- include: tables/conditional_interaction.md -->
| Policy | Entry effect, daily stop | Entry effect, minute stop | Stop effect | Stop effect on CLOSE_1M | Interaction (stop effect − CLOSE_1M stop effect) |
|---|---:|---:|---:|---:|---:|
| `BAND_STABILIZE` | −$45,441 | −$24,343 | +$18,855 | −$2,243 | +$21,098 |
| `BAND_PERSIST` | −$55,341 | −$30,658 | +$22,440 | −$2,243 | +$24,683 |
| `BAND_LATE_DEEP` | −$8,517 | −$18,147 | −$11,873 | −$2,243 | −$9,630 |
| `FIRST_0935` | −$61,580 | −$64,716 | −$5,378 | −$2,243 | −$3,135 |
| `FIRST_1000` | −$79,227 | −$55,874 | +$21,110 | −$2,243 | +$23,353 |
| `FIRST_1200` | −$71,827 | −$69,196 | +$388 | −$2,243 | +$2,631 |
| `FIRST_1400` | −$66,096 | −$59,656 | +$4,197 | −$2,243 | +$6,439 |
| `PERSIST_15` | −$79,314 | −$70,527 | +$6,544 | −$2,243 | +$8,786 |
| `PERSIST_30` | −$101,208 | −$100,846 | −$1,881 | −$2,243 | +$361 |
| `STABLE_15` | −$53,420 | −$48,350 | +$2,827 | −$2,243 | +$5,069 |
| `STABLE_30` | −$83,677 | −$55,696 | +$25,738 | −$2,243 | +$27,981 |
| `REBOUND_03` | −$71,729 | −$68,488 | +$999 | −$2,243 | +$3,241 |
| `REBOUND_05` | −$56,392 | −$48,177 | +$5,972 | −$2,243 | +$8,215 |
<!-- /include -->

- **`BAND_STABILIZE` and `BAND_PERSIST`** gain $18.9k and $22.4k from the minute stop, against −$2.2k for `CLOSE_1M`: an interaction of about +$21k to +$25k. With it, their entry deficit falls to −$24k and −$31k, but does not close.
- **`BAND_LATE_DEEP`** loses $11.9k from the minute stop. Its stop effect is worse than the incumbent's.
- **Under the predeclared stop criteria**, the minute stop "supports" for `BAND_STABILIZE` and `BAND_PERSIST`, relative to themselves with the daily stop. Neither then reaches the incumbent with the daily stop: $159.6k and $153.3k, against $186.2k.

## 4. Years, difficult regimes and the forward segment

For each policy, the gap to the incumbent is driven by one or two years:

| Policy | Stop | Losing years | Gaining years |
|---|---|---|---|
| `BAND_STABILIZE` | daily | 2022 (−$27.7k), 2019 (−$12.9k), 2025 (−$11.6k) | 2023 (+$8.4k), 2020 (+$6.0k) |
| `BAND_PERSIST` | daily | 2022 (−$32.7k), 2018 (−$17.5k) | 2020 (+$8.9k), 2023 (+$6.5k) |
| `BAND_LATE_DEEP` | daily | 2020 (−$9.0k), 2018 (−$5.1k) | 2025 (+$4.0k), 2023 (+$3.3k) |
| `BAND_STABILIZE` | minute | 2022 (−$35.1k) | 2020 (+$13.4k), 2023 (+$13.1k) |
| `BAND_PERSIST` | minute | 2022 (−$28.6k) | 2020 (+$13.0k), 2023 (+$7.4k) |
| `BAND_LATE_DEEP` | minute | 2020 (−$13.8k), 2018 (−$5.1k) | 2025 (+$4.0k) |

`BAND_LATE_DEEP` with the daily stop is positive in 5/10 years, and its 2022 is +$0.8k. Full tables: [tables/entry_years_daily.md](tables/entry_years_daily.md), [tables/entry_years_minute.md](tables/entry_years_minute.md).

In the difficult regimes ([tables/entry_regimes_daily.md](tables/entry_regimes_daily.md)):

- `BAND_STABILIZE` and `BAND_PERSIST` gain +$16.5k and +$17.0k in **February–April 2020**, and lose −$27.7k and −$32.7k in **2022**. They also lose in Q4 2018 and spring 2025.
- `BAND_LATE_DEEP` is within ±$0.9k of the incumbent in every named regime except DD15 (+$4.7k).

In the 2024–25 segment (previously inspected, not out-of-sample):

- With the daily stop, the conditional policies are −$11.6k, −$12.0k and +$0.7k.
- With the minute stop they are +$4.9k, +$3.4k and +$0.7k. That is not enough to change any conclusion, and the segment was not used to select anything.

## 5. Top causes of divergence from the baseline

Full timelines are in [DIVERGENCE_ANALYSIS.md](DIVERGENCE_ANALYSIS.md) and the complete episode list in [results/divergence_episodes.csv](results/divergence_episodes.csv).

| Policy (daily stop) | Largest positive episode | Largest negative episode | Δ without the largest positive episode | Ensemble median Δ (starts > 0) |
|---|---|---|---:|---:|
| `BAND_STABILIZE` | 2020-03-09 +$21,167 (EXTREME rebound in the crash) | 2022-05-20 −$17,468 | −$66,608 | −$31,729 (0/29) |
| `BAND_PERSIST` | 2020-03-09 +$20,901 | 2022-04-14 −$14,543 | −$76,242 | −$43,512 (0/29) |
| `BAND_LATE_DEEP` | 2025-05-22 +$3,981 | 2020-09-04 −$10,774 | −$12,497 | −$3,899 (12/29) |

`BAND_LATE_DEEP` differs from the incumbent only through its MODERATE `STABLE_15` entries: 24 episodes, of which 13 are positive, for a net −$8,517.

- **Excluding its single worst episode** (2020-09-04) would leave about +$2.3k. Excluding its best leaves −$12.5k.
- **Across the 29 staggered starts** the median is −$3.9k, with 12 of 29 positive.

This is the profile of a difference indistinguishable from zero, not of an improvement. Its predeclared category is "argues against" (Δ ≤ 0 under both fills).

## 6. Phase 3B answers

**Do any of the three frozen policies improve profitability without materially increasing minute drawdown, spread across years rather than one crash?** No.

- None improves net P&L against the incumbent under either stop model, either fill or any cost level.
- Their minute drawdown stays near the incumbent's ($25.3k–$28.1k at 5 bp).
- `BAND_STABILIZE`/`BAND_PERSIST`'s main source of gains relative to the incumbent is the 2020 crash, and they lose more than that in 2022.

**Do they reduce harmful early exposure without sacrificing the baseline's rebounds?**

- **They reduce early exposure** compared with the unconditional rules, by keeping SHALLOW dips at the close.
- **They still give up money** relative to never buying early. The MODERATE/DEEP/EXTREME early entries they keep lose on balance outside February–April 2020.
- **The cleanest test of "don't buy large corrections early"** is `BAND_LATE_DEEP`. It is indistinguishable from the incumbent: −$8.5k, 12/29 starts positive. Its only difference is buying stabilised MODERATE dips intraday, which adds nothing.

**Is there enough evidence to justify testing a depth-conditional mechanism in a later optimization project?** No. The evidence points the other way:

- **No band shows a repeatable early-entry benefit**, so conditioning on depth only chooses *where* to lose less than the unconditional rules.
- **Each band adds parameters** (two boundaries, a mechanism and a duration per band) for at most four independent extreme-decline episodes. That would add degrees of freedom and fragility, and invite fitting to March 2020.

See [CONCLUSIONS_AND_NEXT_STEPS.md](CONCLUSIONS_AND_NEXT_STEPS.md).
