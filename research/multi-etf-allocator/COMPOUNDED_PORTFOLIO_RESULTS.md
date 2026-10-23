# Mode B — dynamic 20%-of-equity compounded portfolio

$300,000 at the 2016-01-04 close: $180,000 VOOG (101.89, the last regular trade; no VOOG closing print that day) and
$120,000 VGT (closing print 106.61), no cash, no debt. When the allocator admits a trade it borrows **20% of
consolidated equity at the decision minute** in the selected ETF (one shared budget, not 20% per symbol); at the exit
the lot repays principal and interest, a positive net buys VOOG 60% / VGT 40% at the earliest executable trades, a
negative net is funded by proportional core sales. 11% simple interest; VGT/VOOG distributions reinvested (VGT lots
entitled, credited to core VGT); sector lots price-only; no costs, no taxes. 2016-01-04 → 2025-10-13. Exploratory,
inspected history. Sources: `results/tables/portfolio.md`, `portfolio_annual.md`, `portfolio_monthly.md`,
`matched_utilization.md`, `sensitivities.md`, `results/runs/principal/{A,B,C-*}/`.

## 1. Headline: A, B and the main allocator runs

| | A — 60/40 buy and hold | B — VGT D1 alone | C all-primary / shadow | C all-primary / split | C all-lowDd / shadow | C all-lowDd / split |
|---|---:|---:|---:|---:|---:|---:|
| End equity | $1,784,588 | $2,346,272 | **$2,608,223** | $2,510,234 | $2,891,291 | $2,653,068 |
| vs A | — | +$561,684 | +$823,635 | +$725,646 | +$1,106,703 | +$868,480 |
| vs B | — | — | **+$261,951** | +$163,961 | +$545,019 | +$306,796 |
| CAGR (9.78 years) | 20.01% | 23.42% | 24.77% | 24.28% | 26.09% | 24.98% |
| Daily max DD | $386,774 (33.9%) | $484,116 (25.3%) | $536,086 (25.2%) | $501,900 (24.6%) | $594,129 (25.2%) | $541,014 (24.6%) |
| DD peak → trough (recovered) | 2021-12-27 → 2022-10-14 (2024-01-19) | 2025-01-23 → 2025-04-08 (2025-05-16) | same as B (2025-05-16) | same (2025-06-03) | same (2025-05-16) | same (2025-06-03) |
| Minute-sampled DD (forward-filled marks) | $434,474 (28.0%) | $561,090 (29.3%) | $622,024 (29.2%) | $587,723 (28.8%) | $689,419 (29.1%) | $633,632 (28.7%) |
| Strategy net (realized + open) | — | $314,382 ($172,969 + $141,413) | $502,594 ($345,099 + $157,495) | $434,784 | $641,596 ($466,989 + $174,607) | $457,072 |
| Strategy DD, dynamic dollars (daily / minute) | — | $28,108 / $40,402 | $59,494 / $63,245 | $31,748 / $36,933 | $36,722 / $54,028 | $21,660 / $26,925 |
| Margin interest | — | $55,902 | $83,391 | $67,724 | $85,394 | $55,861 |
| Distributions received (of which VGT lots) | $67,393 | $81,341 ($4,464) | $81,997 ($2,974) | $80,393 ($2,244) | $87,933 ($3,791) | $84,675 ($2,327) |
| Funded lots (W/L, open) | 0 | 20 (14/5, 1) | 74 (40/33, 1) | 97 (54/41, 2) | 75 (46/28, 1) | 125 (76/48, 1) |
| Largest / average principal | — | $309,885 / $185,110 | $345,123 / $216,839 | $166,481 / $104,887 | $382,621 / $232,264 | $183,607 / $104,982 |
| Worst trade / worst adverse excursion | — | −$6,633 / −$24,555 | −$22,768 / −$27,348 | −$11,216 / −$13,092 | −$11,406 / −$30,320 | −$5,597 / −$14,123 |
| Max LMV ÷ equity (date) | 1.00× | 1.219× (2020-03-16) | 1.224× (2020-03-12) | 1.205× (2022-10-14) | 1.224× (2020-03-12) | 1.205× (2022-06-13) |
| Max debt ÷ equity | 0 | 21.9% | 22.8% | 20.8% | 22.8% | 20.8% |
| Min equity ÷ LMV, daily / minute | 100% | 82.0% / 81.3% | 81.7% / 80.9% | 83.0% / 82.1% | 81.7% / 81.7% | 83.0% / 82.1% |
| Sessions with a lot open (eligible) | 0 | 36.5% | 47.6% | 53.1% | 46.6% | 49.1% |
| Borrowing-dollar-days | 0 | 185.5M | 276.7M | 224.7M | 283.4M | 185.4M |
| Core turnover | $0 | $215,738 | $665,560 | $475,028 | $697,407 | $559,925 |
| End VOOG / VGT (core + lots) share of LMV | 47.7% / 52.3% | 40.6% / 59.4% | 42.5% / 57.5% | 42.0% / 49.8%¹ | 42.6% / 57.4% | 46.3% / 53.7% |

¹ The split ends with two lots open (VGT and a sector lot).

All 28 predeclared C runs (8 combinations × shadow/priority/split, plus the cancel/hold controls of the two main
ones) end above B, from +$90,900 (all-primary/cancel) to +$575,927 (all-lowDd/priority), and every one has a daily
maximum drawdown of 24.6–25.2% against B's 25.3% (`results/tables/portfolio.md`, `strategy_comparison.md`).

## 2. Matched risk and capital utilization

The portfolio drawdown is the **core's** (VOOG/VGT 2025-01-23 → 2025-04-08 in B and every C run; 2022 in A); the
lots change it by tenths of a point. Matching on drawdown is therefore nearly uninformative: B's own drawdown moves
only from 25.0% to 25.5% as its borrowed fraction goes from 10% to 25%. The meaningful match is **borrowing**: B is
run at 10/15/20/25% of equity (risk-only) and each allocator point is compared with B at the same
borrowing-dollar-days (`results/tables/matched_utilization.md`).

| B ladder | 10% | 15% | 20% | 25% |
|---|---:|---:|---:|---:|
| End equity | $2,049,137 | $2,193,434 | $2,346,272 | $2,508,066 |
| Borrowing-dollar-days | 86.3M | 134.2M | 185.5M | 240.4M |
| Min equity ÷ LMV | 90.2% | 85.9% | 82.0% | 78.4% |

| Allocator point | End equity | Borrowing $-days | B at the same $-days | Difference |
|---|---:|---:|---:|---:|
| all-primary/shadow at 10% | $2,162,978 | 126.3M | $2,169,799 | **−$6,821** |
| all-primary/shadow at 15% | $2,376,693 | 198.3M | $2,384,111 | **−$7,418** |
| all-primary/shadow at 20% | $2,608,223 | 276.7M | $2,615,160 (linear extrapolation beyond B's 25% point) | **−$6,937** |
| all-lowDd/shadow at 10% | $2,276,138 | 124.9M | $2,165,385 | +$110,753 |
| all-lowDd/shadow at 15% | $2,566,638 | 199.4M | $2,387,409 | +$179,230 |
| all-lowDd/shadow at 20% | $2,891,291 | 283.4M | $2,634,752 (extrapolated) | +$256,539 |

**For the main configuration the +$261,951 over B is explained by borrowing ~49% more dollar-days, not by better
timing per borrowed dollar**: at matched borrowing the all-primary allocator is $6.8k–$7.5k *below* VGT D1 alone at every fraction (10%, 15%, and 20%/25% against B's extrapolated line). The low-DD
combination is above B at matched borrowing (+$111k / +$179k); it is one of eight configurations, a predeclared
sensitivity, on inspected data, and its edge depends on tight-stop sector phenotypes that §4 shows are cost-fragile.
By the rule of PROTOCOL.md §12 (beat B in end equity *and* at matched borrowing-dollar-days and matched drawdown), the
main allocator **does not improve** the compounded portfolio.

## 3. Year by year (`results/tables/portfolio_annual.md`)

| Year | A | B | C all-primary / shadow | C all-lowDd / shadow | A return | B | C primary | C lowDd |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2016 | $334,475 | $334,475 | $334,475 | $334,475 | 11.5% | 11.5% | 11.5% | 11.5% |
| 2017 | $439,021 | $439,021 | $439,021 | $439,021 | 31.3% | 31.3% | 31.3% | 31.3% |
| 2018 | $443,190 | $446,352 | $443,953 | $446,352 | 0.9% | 1.7% | 1.1% | 1.7% |
| 2019 | $614,760 | $653,794 | $646,683 | $653,794 | 38.7% | 46.5% | 45.7% | 46.5% |
| 2020 | $856,441 | $1,013,231 | $965,514 | $1,017,187 | 39.3% | 55.0% | 49.3% | 55.6% |
| 2021 | $1,123,700 | $1,335,552 | $1,345,979 | $1,379,391 | 31.2% | 31.8% | 39.4% | 35.6% |
| 2022 | $791,250 | $980,859 | $969,819 | $1,083,711 | −29.6% | −26.6% | −27.9% | −21.4% |
| 2023 | $1,116,262 | $1,380,571 | $1,536,046 | $1,700,903 | 41.1% | 40.8% | 58.4% | 57.0% |
| 2024 | $1,477,931 | $1,829,174 | $2,034,071 | $2,254,871 | 32.4% | 32.5% | 32.4% | 32.6% |
| 2025 (to 10-13) | $1,784,588 | $2,346,272 | $2,608,223 | $2,891,291 | 20.7% | 28.3% | 28.2% | 28.2% |

No strategy trades before 2017-06-15. The all-primary allocator is *behind* B at the end of 2018, 2019, 2020 and 2022
(the 2020 shortfall, $47,717, is the cost of VGT's 2020 trades displaced by sector lots) and moves ahead only with
2021 and 2023 (the KRE/XRT trades of the 2023 regional-bank stress and its rebound). Monthly series:
`results/runs/principal/*/monthly.csv`; the five worst months of each run: `results/tables/portfolio_monthly.md`.

## 4. Sensitivities that change the comparison (`results/tables/sensitivities.md`)

| Variant | B end equity (vs B) | C all-primary / shadow (vs C) | C − B |
|---|---:|---:|---:|
| base | $2,346,272 | $2,608,223 | +$261,951 |
| 2 bps per side | $2,342,543 (−$3,729) | $2,471,149 (**−$137,074**) | +$128,606 |
| 5 bps | $2,336,965 (−$9,308) | $2,449,124 (−$159,099) | +$112,159 |
| 10 bps | $2,327,701 (−$18,571) | $2,373,292 (−$234,931) | +$45,591 |
| 25 bps | $2,153,645 (−$192,628) | $2,197,308 (−$410,916; daily DD **37.0%**, 2021-12-27 → 2022-10-14) | +$43,663 |
| next-open stop fills | $2,347,854 (+$1,582) | $2,600,772 (−$7,452) | +$252,918 |
| +50 bps on stop fills | $2,316,552 (−$29,720) | $2,403,985 (−$204,238) | +$87,433 |
| 8% interest | $2,380,245 (+$33,972) | $2,662,067 (+$53,843) | +$281,822 |
| 14% interest | $2,312,738 (−$33,535) | $2,437,012 (−$171,212) | +$124,274 |
| Vanguard Standard tiers, /360, monthly capitalization | $2,345,691 (−$581) | $2,608,858 (+$635) | +$263,167 |
| Vanguard Preferred 7% proxy above $1M equity | $2,364,300 (+$18,028) | $2,642,613 (+$34,390) | +$278,313 |
| every lot price-only | $2,334,276 (−$11,996) | $2,600,442 (−$7,781) | +$266,166 |
| full 60/40 rebalance after each exit | $2,254,816 (−$91,457) | $2,516,183 (−$92,040) | +$261,367 |

Two bps per side halves the allocator's advantage over B; at 10 bps it is +$45,591 and at 25 bps the cost-changed
trade list takes the account through the 2022 bear market with losing levered lots, a 37.0% drawdown, deeper than
buy-and-hold's 33.9%. The tight-stop sector phenotypes' profit tests are marginal enough that tiny costs change
which trades exist (146 → 139 virtual trades at 2 bps). B's trades are unchanged below 25 bps.

## 5. Concentration, dividends, taxes and total return

- **Concentration**: VGT (core plus any VGT lot) ends at 57–59% of LMV in B and the C runs because the core is never
  rebalanced and VGT outgrew VOOG. The sector-fund group (VGT + XBI/XRT/KRE) peaks at 59.2% of LMV in all-primary/shadow
  versus 59.5% for VGT alone in B: a sector lot replaces VGT exposure rather than adding to it, but VGT already makes
  the core a single-sector-concentrated account. VOOG and VGT overlap heavily (daily return correlation 0.97, `results/overlap/correlations.csv`);
  no constituent look-through data is in the repository, so concentration is reported by symbol and group only.
- **Dividends**: core distributions are identical in method across runs ($81–88k); VGT lots receive theirs, sector lots
  none (price-only). The omitted sector distributions are bounded at $4,319 / $8,637 / $12,956 for all-primary at an
  assumed 1/2/3% yield (`results/stress/sector_yield_bound.csv`, an analytic bound, not documented cash flows); the
  symmetric "every lot price-only" variant moves B by −$11,996 and C by −$7,781.
- **Taxes are not modelled.** C realizes many more short-term gains and losses (74 lots versus 20) and turns over three
  times B's core ($665,560 versus $215,738, mostly loss funding and reinvestment). After-tax results in a taxable
  account would favour B relative to C; the size depends on the account type and is not estimated here.
- **Total return**: core distributions are reinvested, so A and B are total-return on the core; sector lots are
  price-only, which understates C slightly (bounded above).

## 6. Verdict for the compounded portfolio

On inspected 2016–2025 data every predeclared allocator run ends above VGT D1 alone at the same core drawdown, but
the main configuration's +$261,951 comes from **more time on margin** (276.7M versus 185.5M borrowing-dollar-days); at
matched borrowing it is −$7k versus B. Its advantage halves at 2 bps of execution cost and nearly disappears at
10 bps, and it displaces VGT's own strongest trades. The low-DD combination is the exception on this history, with
the same caveats of selection on inspected data and cost fragility. The compounded result is therefore **not
evidence that adding XBI/XRT/KRE improves the VGT D1 portfolio**.
