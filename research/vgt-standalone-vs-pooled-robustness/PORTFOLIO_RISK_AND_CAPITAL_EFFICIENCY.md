<!-- Rendered by `npm run vgt-robustness -- report` from templates/PORTFOLIO_RISK_AND_CAPITAL_EFFICIENCY.md and results/analysis.json; edit the template, not this file. -->
# Portfolio risk and capital efficiency

**The account.** The same account is used for all four configurations:
- **core:** $300,000 at 60% VOOG / 40% VGT, never liquidated to fund exposure;
- **borrowing:** each funded lot borrows 20% of marked equity at the decision, at 11% simple interest and 5 bps per
  side;
- **reinvestment:** profits are reinvested 60/40, and losses are funded by core sales;
- **dividends:** the frozen convention.

**What is not modelled.** Maintenance ratios are passive; there are no margin calls and no forced sales.

**Drawdown measures.** Drawdowns are running-peak percentages of total equity, either at the daily close or sampled
every minute. The dollar figure is the fall at that depth. Fixed-pool figures ($100k) are reported separately and never
mixed with these.

**The 30% and 35% thresholds are historical evaluation thresholds, not risk bounds.** The core alone (C0) breached
30% without any leverage: 33.89% daily and 35.76% minute, 2021-12-27 → 2022-10-14.

## 1. The four portfolios at the frozen parameters

| Configuration | End equity | Total return | CAGR | vs C0 (wealth) | vs C0 (CAGR) | Max daily % DD ($ at that depth) | Max minute % DD ($) | Δ daily / minute vs C0 | Worst episode: peak → trough → recovery |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S (VGT-primary standalone) | $2,958,026 | 886% | 23.67% | +$678,257 | +2.95 pp | 32.78% ($239,781) | 35.21% ($258,204) | −1.12 pp / −0.55 pp | 2020-02-19 → 2020-03-23 → 2020-06-01 |
| B4 | $3,608,484 | 1103% | 25.97% | +$1,328,715 | +5.26 pp | 34.65% ($253,460) | 37.01% ($271,416) | +0.75 pp / +1.25 pp | 2020-02-19 → 2020-03-23 → 2020-06-05 |
| B5 | $5,410,977 | 1704% | 30.80% | +$3,131,208 | +10.08 pp | 29.67% ($217,040) | 31.09% ($227,935) | −4.22 pp / −4.68 pp | 2020-02-19 → 2020-03-12 → 2020-04-14 |
| C0 (core only) | $2,279,769 | 660% | 20.71% | +$0 | +0.00 pp | 33.89% ($386,774) | 35.76% ($408,401) | +0.00 pp / +0.00 pp | 2021-12-27 → 2022-10-14 → 2024-01-19 |

**S (standalone VGT):**
- **Wealth:** adds +$678,257 over C0 (CAGR 23.67% against 20.71%).
- **Drawdown:** **lowers** the core's maximum drawdown on both measures (−1.12 pp daily, −0.55 pp
  minute):
  - its worst episode moves from C0's 2022 bear market to the March-2020 crash (2020-02-19 →
    2020-03-23, recovered 2020-06-01);
  - its 2022 episode is 2021-12-27 → 2022-10-14, 32.38%, smaller than C0's because S's 2022 lots made money.
- **The 35% threshold:** S still exceeds 35% on the minute measure (35.21%).

**The pools:**
- **B4** adds more wealth (+$1,328,715) but **deepens** the core's drawdown (+0.75 pp / +1.25 pp).
- **B5** adds the most (+$3,131,208) and has the shallowest drawdown (29.67% / 31.09%) at the frozen
  point.
  - That depth survives perturbing any single book's eight parameters: the per-book medians range from
    29.7% to 32.4%.
  - It does not survive perturbing all 40 together (§4; the prior audit).

**The three deepest daily-close episodes of each:**

| Configuration | Rank | Peak → trough | Recovery | Depth | $ at depth | Sessions to trough | Sessions under water |
|---|---:|---:|---:|---:|---:|---:|---:|
| S (VGT-primary standalone) | 1 | 2020-02-19 → 2020-03-23 | 2020-06-01 | 32.78% | $239,781 | 23 | 71 |
| S (VGT-primary standalone) | 2 | 2021-12-27 → 2022-10-14 | 2023-12-13 | 32.38% | $438,428 | 202 | 494 |
| S (VGT-primary standalone) | 3 | 2025-01-23 → 2025-04-08 | 2025-06-03 | 25.33% | $482,594 | 52 | 90 |
| B4 | 1 | 2020-02-19 → 2020-03-23 | 2020-06-05 | 34.65% | $253,460 | 23 | 75 |
| B4 | 2 | 2021-12-27 → 2022-10-14 | 2023-06-12 | 27.02% | $377,015 | 202 | 366 |
| B4 | 3 | 2025-01-23 → 2025-04-08 | 2025-05-16 | 25.21% | $586,149 | 52 | 79 |
| B5 | 1 | 2020-02-19 → 2020-03-12 | 2020-04-14 | 29.67% | $217,040 | 16 | 38 |
| B5 | 2 | 2021-12-27 → 2022-06-16 | 2023-04-13 | 26.45% | $448,132 | 119 | 325 |
| B5 | 3 | 2025-01-23 → 2025-04-08 | 2025-05-16 | 25.13% | $828,788 | 52 | 79 |
| C0 (core only) | 1 | 2021-12-27 → 2022-10-14 | 2024-01-19 | 33.89% | $386,774 | 202 | 518 |
| C0 (core only) | 2 | 2020-02-19 → 2020-03-23 | 2020-06-10 | 31.62% | $214,074 | 23 | 78 |
| C0 (core only) | 3 | 2025-01-23 → 2025-04-08 | 2025-06-24 | 24.70% | $381,488 | 52 | 104 |

## 2. Capital efficiency

| Configuration | Fixed net | Lots | Lot-days | Time with a lot | Net per lot | Fixed net per $1M borrowing-days | Net ÷ fixed minute DD | Portfolio borrowing-days ($M) | Portfolio wealth vs C0 per $1M borrowing-days | Δ CAGR per pp of max daily DD | Max principal (÷ equity) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S (VGT-primary standalone) | $176,260 | 21 | 1,208 | 35% | $8,393 | $1,459 | 9.02 | 227 | $2,992 | 0.090 pp | $448,482 (21.9%) |
| B4 | $284,245 | 76 | 1,560 | 46% | $3,740 | $1,822 | 9.92 | 355 | $3,739 | 0.152 pp | $584,683 (22.8%) |
| B5 | $486,208 | 94 | 1,753 | 51% | $5,172 | $2,774 | 18.34 | 607 | $5,158 | 0.340 pp | $990,071 (22.8%) |

- **S has the highest profit per lot** ($8,393), and holds a lot only 35% of eligible sessions.
- **It earns the least per borrowed dollar-day.**
  - Fixed: $1,459 per $1M dollar-days, against B4 $1,822 and B5 $2,774.
  - Portfolio: $2,992 against $3,739 and $5,158.
  - Its long VGT holds (median 18 sessions, up to 139) tie up borrowing for modest per-day returns.
- **Its lower activity does not buy better capital efficiency on this history.** It buys fewer moving parts and a
  smaller footprint.
- **Fixed net ÷ fixed minute drawdown:** S 9.02, B4 9.92, B5 18.34.

## 3. VGT duplication and concentration

S's overlay buys only VGT, which the core already holds at 40% of initial value. The VGT share below is core VGT
plus VGT lots, as a share of long market value. "Max VGT exposure ÷ equity" counts both.

| Configuration | Mean VGT share of long market value | Max VGT share | Mean while a VGT lot is open | Max VGT exposure ÷ equity | Max VGT lot ÷ equity | Sessions with a VGT lot |
|---|---:|---:|---:|---:|---:|---:|
| C0 (core only) | 47.8% | 55.6% | — | 55.6% | 0.0% | 0 |
| S (VGT-primary standalone) | 49.7% | 59.8% | 56.6% | 69.6% | 20.3% | 832 |
| B4 | 47.3% | 57.8% | 55.9% | 67.8% | 20.2% | 687 |
| B5 | 45.4% | 56.7% | 55.1% | 66.7% | 20.2% | 584 |

- **While a VGT lot is open, S lifts the account's VGT share to 56.6% on average.** The maximum is
  59.8%, against C0's 55.6%.
- **Total VGT exposure reaches 69.6% of equity.**
- **The pools dilute this.** Part of their borrowing goes to XBI, XRT, KRE and GDX.
- **The risk is real but unmodelled.** In a VGT-specific (technology-sector) shock, S's account is more concentrated
  than C0's, and S's overlay adds to the core's own VGT exposure rather than diversifying it.

## 4. Neighbourhoods: what happens when the parameters are not exactly right

| Design (seed 1 unless stated) | Median end equity | Median vs C0 | Median daily % DD | Daily > 35% | Median minute % DD |
|---|---:|---:|---:|---:|---:|
| S joint 8-D, seed 1 (S's own full uncertainty) | $2,703,986 | +$424,217 | 34.1% | 11% | 36.4% |
| S joint 8-D, seed 2 | $2,702,651 | +$422,883 | 33.9% | 5% | 36.1% |
| S matched 8-D (64) | $2,727,446 | +$447,677 | 34.1% | 6% | 36.3% |
| B4, VGT book only (32) | $3,474,775 | +$1,195,006 | 34.0% | 3% | 36.0% |
| B5, VGT book only (32) | $5,165,780 | +$2,886,011 | 29.7% | 0% | 31.7% |
| B4 system-level 32-D, seed 1 (B4's own full uncertainty) | $2,758,498 | +$478,729 | 35.3% | 56% | 37.4% |
| B5 system-level 40-D, seed 1 (B5's own full uncertainty) | $3,299,287 | +$1,019,518 | 35.2% | 55% | 37.2% |
| B5 system-level 40-D, seed 2 | $3,218,599 | +$938,830 | 35.7% | 59% | 37.6% |

**How to read these medians.** Each configuration's own full-uncertainty median is its in-sample central estimate when
all of its parameters are uncertain. They are not forecasts, and they are optimistic, because the plateau itself was
chosen on this history.

- **B5 keeps its wealth lead** (+$1,019,518 against S's
  +$424,217). But its median drawdown (35.2%) is
  above S's (34.1%). About half of B5's neighbours exceed 35%, against about one in ten of
  S's.
  - These are 40-D and 8-D neighbourhoods, which is not like-for-like.
  - When only VGT's eight parameters move, B5 keeps 29.7% and S rises to about
    34.1%.
- **B4 and S have about the same incremental wealth** at their own-neighbourhood medians
  (+$478,729 against +$424,217). B4 has the higher
  drawdown.
- **Against C0's 33.89%,** S's median neighbour sits at about C0's level (34.1% for seed 1
  and 33.9% for seed 2). The pools' own-neighbourhood medians are above it.

## 5. S under stress and the dividend sensitivity

| S portfolio | End equity | vs C0 | Daily % DD | Minute % DD |
|---|---:|---:|---:|---:|
| base | $2,958,026 | +$678,257 | 32.78% | 35.21% |
| C1 | $2,714,554 | +$434,785 | 32.85% | 35.15% |
| C2 | $2,611,755 | +$331,986 | 33.85% | 36.11% |
| C3 | $2,589,328 | +$309,560 | 33.98% | 36.24% |
| symmetric dividends | $2,941,552 | +$661,783 | 32.78% | 35.21% |

- **Dividends.** Under the symmetric convention (no lot credited), S loses the $4,929 of VGT
  distributions its open lots received. The difference is immaterial.

## 6. Margin proximity (passive) and unmodelled broker risk

These are the minimum equity ÷ requirement under each passive schedule, over the run. Below 1.0 would mean a call
under that schedule; none is modelled.

| Configuration | U35 | U50 | U60 | L50 | L60 | G50 | G60 |
|---|---:|---:|---:|---:|---:|---:|---:|
| S (VGT-primary standalone) | 2.32× | 1.63× | 1.35× | 1.87× | 1.66× | 1.87× | 1.66× |
| B4 | 2.33× | 1.63× | 1.36× | 1.89× | 1.68× | 1.88× | 1.66× |
| B5 | 2.33× | 1.63× | 1.36× | 1.90× | 1.69× | 1.89× | 1.67× |
| C0 (core only) | 2.86× | 2.00× | 1.67× | 2.86× | 2.86× | 2.31× | 2.04× |

The three overlays are within a few hundredths of each other. C0 borrows nothing, so its ratios are higher. At 20%
borrowing on this core, no overlay came near a requirement in this history.

**Not modelled, and they matter more for S than for the pools:**
- **Vanguard's 30-day rule.** Newly bought Vanguard ETFs (VGT, VOOG) are not marginable for 30 days. **Every** S lot
  is a new VGT purchase, so its loan value cannot support the position at first. The B4/B5 lots in XBI, XRT, KRE and
  GDX are not Vanguard ETFs.
- **Concentration.** A single-sector book adds to the core's technology exposure (§3).
- **Gaps.** D1 has no protective stop. A lot bought into a collapse is closed only by the 8-day hold. S's worst
  intraday excursion was −10.8% in March 2020.
- **House requirements.** These can be raised in a crash.

**Not modelled for any configuration:**
- margin calls and forced sales;
- quote-level fills;
- capacity at the late-history lot sizes (the "max principal" column of §2).

None of this is a safety certification.
