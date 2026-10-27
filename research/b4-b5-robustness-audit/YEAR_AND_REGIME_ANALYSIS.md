# Workstream B — dependence on years and market regimes

**Source and method:**
- The two continuous `all` base runs of each pool (fixed and portfolio, frozen conventions) and C0.
- Attribution is **marked to market**: the change of the fixed pool's `strategyMark` (realized plus unrealized,
  net of accrued interest), or of portfolio equity, from the last close of one period to the last close of the next.
  Lots open across a boundary are therefore split by their marks, not booked in their exit year.
- Realized net by exit year is shown beside it, for contrast only.

Machine-readable results:
- `results/B_yearly.csv`;
- `results/B_regimes.csv`;
- `results/analysis.json` (keys `B`, `C.bridge`).

**Partial years:**
- 2016 cannot trade.
- 2017 trades only from 2017-06-15 (arming).
- 2026 runs to 2026-10-13.

## Calendar years — B4

| Year | Status | Fixed MTM change | Share of total | Interest accrued | Lots entered | Realized (by exit year) | Open at year end | Deepest fixed daily DD in year | Portfolio return | C0 return | Δ incremental wealth vs C0 | Deepest portfolio % DD in year |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| 2016 | no trading (arming from 2017-06-15) | $0 | 0.0% | $0 | 0 | $0 | — | $0 | 11.5% | 11.5% | +$0 | 10.2% |
| 2017 | partial eligibility (from 2017-06-15) | $0 | 0.0% | $0 | 0 | $0 | — | $0 | 31.3% | 31.3% | +$0 | 3.3% |
| 2018 | full | $3,642 | 1.3% | $301 | 1 | $0 | VGT | $3,636 | 1.7% | 0.9% | +$3,117 | 22.6% |
| 2019 | full | $32,319 | 11.4% | $8,468 | 1 | $20,250 | VGT | $9,103 | 46.4% | 38.7% | +$35,711 | 19.5% |
| 2020 | full | $77,765 | 27.4% | $10,277 | 14 | $79,089 | VGT | $25,268 | 55.1% | 39.3% | +$118,657 | 34.6% |
| 2021 | full | $15,696 | 5.5% | $5,184 | 6 | $25,799 | KRE | $14,848 | 35.4% | 31.2% | +$92,083 | 10.6% |
| 2022 | full | $57,017 | 20.1% | $7,233 | 20 | $61,300 | — | $13,811 | −21.7% | −29.6% | +$34,408 | 27.0% |
| 2023 | full | $55,757 | 19.6% | $5,605 | 29 | $55,757 | — | $15,284 | 56.0% | 41.1% | +$277,513 | 24.7% |
| 2024 | full | −$419 | −0.1% | $121 | 1 | −$419 | — | $2,823 | 32.5% | 32.4% | +$184,259 | 13.9% |
| 2025 | full | $45,679 | 16.1% | $7,956 | 4 | $43,227 | XRT | $17,163 | 29.9% | 21.9% | +$339,967 | 25.2% |
| 2026 | partial (to 2026-10-13) | −$3,211 | −1.1% | $1,868 | 0 | −$760 | — | $11,849 | 25.0% | 26.5% | +$243,000 | 16.0% |

## Calendar years — B5

| Year | Status | Fixed MTM change | Share of total | Interest accrued | Lots entered | Realized (by exit year) | Open at year end | Deepest fixed daily DD in year | Portfolio return | C0 return | Δ incremental wealth vs C0 | Deepest portfolio % DD in year |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| 2016 | no trading (arming from 2017-06-15) | $0 | 0.0% | $0 | 0 | $0 | — | $0 | 11.5% | 11.5% | +$0 | 10.2% |
| 2017 | partial eligibility (from 2017-06-15) | $0 | 0.0% | $0 | 0 | $0 | — | $0 | 31.3% | 31.3% | +$0 | 3.3% |
| 2018 | full | $3,642 | 0.7% | $301 | 1 | $0 | VGT | $3,636 | 1.7% | 0.9% | +$3,117 | 22.6% |
| 2019 | full | $32,319 | 6.6% | $8,468 | 1 | $20,250 | VGT | $9,103 | 46.4% | 38.7% | +$35,711 | 19.5% |
| 2020 | full | $165,888 | 34.1% | $9,011 | 32 | $167,211 | VGT | $23,789 | 88.4% | 39.3% | +$335,805 | 29.7% |
| 2021 | full | $15,696 | 3.2% | $5,184 | 6 | $25,799 | KRE | $14,848 | 35.5% | 31.2% | +$169,285 | 10.6% |
| 2022 | full | $84,884 | 17.5% | $7,836 | 21 | $89,168 | — | $13,874 | −17.4% | −29.6% | +$41,690 | 26.4% |
| 2023 | full | $86,060 | 17.7% | $6,992 | 21 | $86,060 | — | $12,295 | 64.9% | 41.1% | +$568,395 | 20.6% |
| 2024 | full | $24,162 | 5.0% | $1,989 | 2 | $24,162 | — | $5,058 | 38.9% | 32.4% | +$522,256 | 13.9% |
| 2025 | full | $45,679 | 9.4% | $7,956 | 4 | $43,227 | XRT | $17,163 | 29.9% | 21.9% | +$618,362 | 25.1% |
| 2026 | partial (to 2026-10-13) | $27,878 | 5.7% | $5,093 | 6 | $30,330 | — | $22,563 | 32.1% | 26.5% | +$836,587 | 15.2% |

**Reading:**
- **B4.** The largest single year is 2020 (27.4%) of total fixed net, and the top two are 2020 + 2022 (47.4%).
  Negative years: 2024, 2026.
- **B5.** The largest single year is 2020 (34.1%), and the top two are 2020 + 2023 (51.8%). Negative years:
  none.
- **Gate B.** Neither pool crosses the 50% single-year threshold, so gate B (year part) raises no flag.
- **Quiet stretches.** In both pools, profit arrives in bursts tied to deep sector dips. 2024 and 2026 contributed
  nothing or less to B4. GDX alone made those years positive for B5.

## Leave-one-year-out (attribution only)

These figures subtract one year's marked-to-market contribution from the continuous run's total. **They are not
backtests:**
- no bar was deleted;
- no paths were joined;
- no peak was reset.

Removing a year from history would change every later state (reference highs, setups, the shared slot), so a real
counterfactual cannot be defined without changing the strategy.

| Year removed (attribution only) | B4 total without the year | B4 ÷ full | B5 total without the year | B5 ÷ full | B5 − B4 without the year |
|---|---:|---:|---:|---:|---:|
| 2016 | $284,245 | 100.0% | $486,208 | 100.0% | $201,963 |
| 2017 | $284,245 | 100.0% | $486,208 | 100.0% | $201,963 |
| 2018 | $280,602 | 98.7% | $482,565 | 99.3% | $201,963 |
| 2019 | $251,926 | 88.6% | $453,889 | 93.4% | $201,963 |
| 2020 | $206,479 | 72.6% | $320,320 | 65.9% | $113,841 |
| 2021 | $268,549 | 94.5% | $470,512 | 96.8% | $201,963 |
| 2022 | $227,228 | 79.9% | $401,323 | 82.5% | $174,095 |
| 2023 | $228,487 | 80.4% | $400,147 | 82.3% | $171,660 |
| 2024 | $284,663 | 100.1% | $462,046 | 95.0% | $177,382 |
| 2025 | $238,566 | 83.9% | $440,529 | 90.6% | $201,963 |
| 2026 | $287,456 | 101.1% | $458,330 | 94.3% | $170,874 |

Without its best year (2020), B4 keeps 73% of its total and B5 66%. Both stay strongly positive under every single-year
exclusion, so the history is not dominated by one year. It is, however, concentrated in the deep-dip years 2020,
2022 and 2023.

## B5 − B4 by year

The fixed-pool difference totals $201,963. B5 and B4 are identical until GDX's first funded lot in March 2020,
so every difference falls in 2020 or later.

| Year | B5 − B4 fixed MTM | Share of the total difference | B5 − B4 portfolio equity change |
|---|---:|---:|---:|
| 2016 | +$0 | 0.0% | +$0 |
| 2017 | +$0 | 0.0% | +$0 |
| 2018 | +$0 | 0.0% | +$0 |
| 2019 | +$0 | 0.0% | +$0 |
| 2020 | +$88,122 | 43.6% | +$217,148 |
| 2021 | +$0 | 0.0% | +$77,202 |
| 2022 | +$27,868 | 13.8% | +$7,282 |
| 2023 | +$30,303 | 15.0% | +$290,882 |
| 2024 | +$24,581 | 12.2% | +$337,998 |
| 2025 | +$0 | 0.0% | +$278,395 |
| 2026 | +$31,089 | 15.4% | +$593,587 |

- The largest year is 2020 ($88,122, 43.6%): under the 50% threshold.
- Of the remainder, 2022, 2023, 2024 and 2026 each add $25k–31k. 2021 and 2025 add nothing.
- The portfolio difference keeps growing in years with no fixed difference (2021, 2025), because the larger B5
  account compounds the same percentage returns.

## Regimes (pre-registered, mechanical: VOOG closes, ≥ 15% falls)

Windows run close to close:
- **stress:** peak → trough;
- **rebound:** trough → recovery.

There are also the "2023 recovery" and "2026 partial" calendar windows, and three ≥ 10% corrections shown for context.

| Window | Dates (close → close) | B4 fixed | B5 fixed | B5 − B4 | B4 / B5 interest | B4 / B5 lots entered | B4 / B5 lot-days | Worst MAE B4 / B5 | Portfolio B4 | Portfolio B5 | C0 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 Q4 selloff — stress | 2018-10-01 → 2018-12-24 | −$3,636 | −$3,636 | +$0 | $90 / $90 | 1 / 1 | 3 / 3 | −3.6% / −3.6% | −22.5% | −22.5% | −22.0% |
| 2018 Q4 selloff — rebound | 2018-12-24 → 2019-04-23 | +$32,932 | +$32,932 | +$0 | $3,616 / $3,616 | 0 / 0 | 120 / 120 | n/a / n/a | +39.3% | +39.3% | +32.1% |
| 2020 crash — stress | 2020-02-19 → 2020-03-23 | −$25,268 | +$32,609 | +$57,877 | $784 / $663 | 7 / 6 | 26 / 22 | −17.9% / −17.9% | −34.6% | −26.8% | −31.6% |
| 2020 crash — rebound | 2020-03-23 → 2020-07-02 | +$45,194 | +$85,327 | +$40,133 | $3,014 / $2,592 | 1 / 12 | 100 / 86 | −1.2% / −7.7% | +59.7% | +73.6% | +49.1% |
| 2022 bear market — stress | 2021-12-27 → 2022-10-14 | +$53,008 | +$59,578 | +$6,570 | $5,636 / $6,088 | 19 / 20 | 187 / 202 | −7.8% / −7.8% | −27.0% | −26.0% | −33.9% |
| 2022 bear market — rebound | 2022-10-14 → 2024-03-20 | +$58,975 | +$124,776 | +$65,801 | $7,444 / $10,066 | 31 / 24 | 247 / 334 | −9.8% / −5.5% | +82.8% | +106.4% | +64.1% |
| 2025 selloff — stress | 2025-02-19 → 2025-04-08 | −$4,483 | −$4,483 | +$0 | $121 / $121 | 1 / 1 | 4 / 4 | −8.3% / −8.3% | −25.1% | −25.0% | −24.6% |
| 2025 selloff — rebound | 2025-04-08 → 2025-06-24 | +$31,479 | +$31,479 | +$0 | $2,260 / $2,260 | 2 / 2 | 75 / 75 | −2.0% / −2.0% | +40.3% | +40.1% | +33.7% |
| 2023 recovery (calendar 2023) | 2022-12-30 → 2023-12-29 | +$55,757 | +$86,060 | +$30,303 | $5,605 / $6,992 | 29 / 21 | 186 / 232 | −9.8% / −5.5% | +56.0% | +64.9% | +41.1% |
| 2026 partial (to 2026-10-13) | 2025-12-31 → 2026-10-13 | −$3,211 | +$27,878 | +$31,089 | $1,868 / $5,093 | 0 / 6 | 62 / 169 | n/a / −11.7% | +25.0% | +32.1% | +26.5% |
| ≥10% correction 2020-09 | 2020-09-02 → 2020-09-23 | −$16,011 | −$4,495 | +$11,516 | $301 / $181 | 3 / 2 | 10 / 6 | −5.7% / −5.7% | −13.4% | −12.5% | −11.7% |
| ≥10% correction 2024-07/08 | 2024-07-10 → 2024-08-05 | +$0 | +$0 | +$0 | $0 / $0 | 0 / 0 | 0 / 0 | n/a / n/a | −13.9% | −13.9% | −14.0% |
| ≥10% correction 2025-10 → 2026-03 | 2025-10-29 → 2026-03-30 | −$11,849 | −$7,608 | +$4,242 | $3,616 / $3,948 | 1 / 2 | 120 / 131 | −5.8% / −5.8% | −16.0% | −15.2% | −15.1% |

| Regime (stress + rebound) | B5 − B4 fixed MTM | Share of the total difference |
|---|---:|---:|
| R1 | +$0 | 0.0% |
| R2 | +$98,010 | 48.5% |
| R3 | +$72,371 | 35.8% |
| R4 | +$0 | 0.0% |

- **Largest regime share.** The 2020 crash and its rebound (R2) produce 48.5% of B5's advantage
  (marked to market): just under gate C's 50% threshold. The 2022 bear market and its long rebound (R3) produce most of
  the rest.
- **Selloff months themselves.** Both pools gain in the 2022 stress window (fixed pool +$53k / +$60k, while the core
  fell). They lose little in the 2018 and 2025 stress windows. That is the counter-cyclical character of a dip-buying
  overlay: it arms on deep sector falls and is paid on the rebound.
- **The 2022 size is parameter-specific.** The median joint neighbour makes only $7,348 (B4) and
  $6,178 (B5) in calendar 2022 (`PARAMETER_STABILITY.md`).
- **Up to 13 March 2020 both pools traded identically.** That includes the KRE lot of 9 March, a −$8.3k maximum-hold
  loss.
- **From 16 March the paths diverge.**
  - B5's GDX book won the slot: GDX lots of 16–18, 19–20 and 23–27 March added +$37.4k, +$10.9k and +$16.1k.
  - B4 cycled through brief XBI and KRE lots instead, including the KRE lot of 18 March (−$10.1k).
  - Fixed-pool result in the stress window: B4 −$25.3k, B5 +$32.6k.
  - Portfolio result: B4 −34.6% and B5 −26.8%, against C0's −31.6%.
- **The divergence persists into April.** GDX held the slot on 1–15 April 2020 (+$27.6k), so B5 missed B4's best
  trade, VGT 2 April → 4 September 2020 (+$51.3k).
- **R3 and 2026.** The 2022 rebound (R3r) adds +$65.8k to B5 through GDX lots in 2022–2024. 2026 adds +$31.1k.

## In-sample uncertainty: stationary block bootstrap

This is a diagnostic only. It resamples the 2,345 daily fixed-pool marked-to-market changes from
arming to the end:
- blocks have a geometric mean length of 21 sessions;
- there are 5,000 resamples;
- B4 and B5 use the same indices (paired).

It assumes stationarity and dependence shorter than the blocks. It reshuffles the same inspected history, so **it is
not validation** and it says nothing about selection bias.

| Series (fixed pool, daily MTM changes) | Actual total | Resampled median | 5th – 95th pct | 25th – 75th pct | Resamples ≤ 0 |
|---|---:|---:|---:|---:|---:|
| B4 | $284,245 | $283,036 | $183,672 – $383,927 | $244,367 – $322,198 | 0.00% |
| B5 | $486,208 | $475,608 | $322,008 – $671,836 | $410,250 – $549,060 | 0.00% |
| B5 − B4 (paired) | $201,963 | $192,623 | $65,125 – $364,785 | $135,296 – $256,987 | 0.42% |

Reshuffling the same days in blocks leaves B5 − B4 positive in all but 0.42% of resamples (5th
percentile $65,125). Given the history, the difference is therefore not one lucky ordering of days. Whether
the history itself repeats is a separate question.

## Assessment

- **Positive performance is reasonably spread.** Gate B raises no flag. Every leave-one-year-out total stays above
  $200k (B4) or $320k (B5).
- **But it is episodic.** Gains cluster in a handful of deep-dip windows (2020, 2022–2023, 2025).
- **B5's advantage clusters even more:**
  - its largest year is 2020 ($88,122, 43.6%);
  - one regime provides 48.5%;
  - the rest arrives at about $25–30k per year from GDX in 2022–2024 and 2026.

  It is not driven by one year, but it rests on about two episodes and a few GDX trades (see `TRADE_CONCENTRATION.md`).
