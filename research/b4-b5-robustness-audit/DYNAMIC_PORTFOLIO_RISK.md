# Workstream F — the dynamic portfolio, the no-margin control and total risk

The same engine runs three accounts over the same window (2016-01-04 → 2026-10-13 (2710 sessions; books arm from 2017-06-15)):
- **C0:** the no-margin control. A $300,000 buy-and-hold core, 60% VOOG / 40% VGT, never rebalanced. VOOG/VGT
  distributions are reinvested in the same ETF.
- **B4** and **B5:** the same core plus the frozen margin overlay. Each funded trade borrows 20% of marked equity at
  the decision, in one shared slot. Profits are reinvested 60/40 into the core, and losses are funded by core sales.
  The frozen dividend convention applies.

**What is modelled:**
- Reg T and the U35 house requirement are checked at entry. A failing entry is refused; none was.
- Interest is 11% simple on the borrowed principal.
- Splits are forward-adjusted.

**What is not modelled:**
- maintenance calls, forced liquidation and broker house-rule changes;
- the Vanguard 30-day no-loan-value rule for newly bought VGT/VOOG;
- distributions of XBI/XRT/KRE/GDX lots.

Maintenance-margin ratios are **measured passively** (below) as proximity only.

**Two drawdown definitions:**
- **Portfolio drawdowns** are the largest fall from the running peak of total marked equity, in two forms: daily
  close and minute-sampled. They are never the fixed-pool drawdowns (% of a $100,000 notional) in the other reports.
- **Dollar drawdowns** are the engine's largest-dollar episodes. In a compounding account they fall in late,
  high-equity years, and they are not the same episodes as the percentage maxima.

Machine-readable results:
- `results/F_portfolio.csv`;
- `results/F_drawdown_episodes.csv`.

## Results

| Run | End equity | Total return | CAGR | vs C0 | Max daily % DD | Δ vs C0 | Max minute % DD | Δ vs C0 | CAGR ÷ daily DD | Time with lot | Max principal | Max debt ÷ equity |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C0 | $2,279,769 | 660% | 20.71% | — | 33.89% | — | 35.76% | — | 0.61 | 0.0% | $0 | 0.000 |
| B4 | $3,608,484 | 1103% | 25.97% | +$1,328,715 | 34.65% | +0.75 pp | 37.01% | +1.25 pp | 0.75 | 45.5% | $584,683 | 0.228 |
| B5 | $5,410,977 | 1704% | 30.80% | +$3,131,208 | 29.67% | −4.22 pp | 31.09% | −4.68 pp | 1.04 | 51.2% | $990,071 | 0.228 |
| B4 symmetric dividends | $3,592,822 | 1098% | 25.92% | +$1,313,053 | 34.65% | +0.76 pp | 37.02% | +1.26 pp | 0.75 | 45.5% | $582,236 | 0.228 |
| B5 symmetric dividends | $5,390,600 | 1697% | 30.75% | +$3,110,831 | 29.67% | −4.22 pp | 31.09% | −4.67 pp | 1.04 | 51.2% | $986,338 | 0.228 |
| B4 C1 | $3,069,321 | 923% | 24.09% | +$789,552 | 34.27% | +0.38 pp | 36.64% | +0.88 pp | 0.70 | 34.8% | $496,592 | 0.228 |
| B4 C2 | $2,782,179 | 827% | 22.97% | +$502,410 | 34.66% | +0.77 pp | 37.01% | +1.25 pp | 0.66 | 34.8% | $451,626 | 0.229 |
| B4 C3 | $2,629,970 | 777% | 22.32% | +$350,201 | 34.86% | +0.97 pp | 37.21% | +1.44 pp | 0.64 | 33.7% | $426,747 | 0.229 |
| B5 C1 | $4,504,770 | 1402% | 28.59% | +$2,225,001 | 29.04% | −4.86 pp | 30.63% | −5.13 pp | 0.98 | 41.4% | $826,793 | 0.228 |
| B5 C2 | $3,995,568 | 1232% | 27.17% | +$1,715,799 | 30.02% | −3.87 pp | 32.41% | −3.35 pp | 0.90 | 41.4% | $736,823 | 0.229 |
| B5 C3 | $3,710,818 | 1137% | 26.30% | +$1,431,049 | 30.93% | −2.96 pp | 33.29% | −2.47 pp | 0.85 | 40.3% | $685,136 | 0.229 |

C1–C3 are the combined adverse cost scenarios (`COST_AND_EXECUTION_STRESS.md`). The symmetric rows credit no lot
with dividends.

## Drawdown episodes (daily close; five deepest per account)

| Run | Rank | Peak close | Trough close | Recovered | Depth % | Depth $ | Sessions to trough | Sessions underwater |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C0 | 1 | 2021-12-27 | 2022-10-14 | 2024-01-19 | 33.89% | $386,774 | 202 | 518 |
| C0 | 2 | 2020-02-19 | 2020-03-23 | 2020-06-10 | 31.62% | $214,074 | 23 | 78 |
| C0 | 3 | 2025-01-23 | 2025-04-08 | 2025-06-24 | 24.70% | $381,488 | 52 | 104 |
| C0 | 4 | 2018-10-03 | 2018-12-24 | 2019-04-03 | 21.99% | $116,236 | 56 | 124 |
| C0 | 5 | 2025-10-29 | 2026-03-30 | 2026-04-17 | 15.13% | $284,424 | 103 | 116 |
| B4 | 1 | 2020-02-19 | 2020-03-23 | 2020-06-05 | 34.65% | $253,460 | 23 | 75 |
| B4 | 2 | 2021-12-27 | 2022-10-14 | 2023-06-12 | 27.02% | $377,015 | 202 | 366 |
| B4 | 3 | 2025-01-23 | 2025-04-08 | 2025-05-16 | 25.21% | $586,149 | 52 | 79 |
| B4 | 4 | 2018-10-03 | 2018-12-24 | 2019-03-15 | 22.58% | $119,348 | 56 | 111 |
| B4 | 5 | 2025-10-29 | 2026-03-30 | 2026-04-17 | 16.02% | $484,444 | 103 | 116 |
| B5 | 1 | 2020-02-19 | 2020-03-12 | 2020-04-14 | 29.67% | $217,040 | 16 | 38 |
| B5 | 2 | 2021-12-27 | 2022-06-16 | 2023-04-13 | 26.45% | $448,132 | 119 | 325 |
| B5 | 3 | 2025-01-23 | 2025-04-08 | 2025-05-16 | 25.13% | $828,788 | 52 | 79 |
| B5 | 4 | 2018-10-03 | 2018-12-24 | 2019-03-15 | 22.58% | $119,348 | 56 | 111 |
| B5 | 5 | 2025-10-29 | 2026-03-30 | 2026-04-16 | 15.22% | $652,685 | 103 | 115 |

## Margin proximity (passive measures; no calls modelled)

The table gives the minimum ratio of equity to the requirement under each passive schedule. Values above 1.0 mean the
requirement was met throughout. The schedules are those of the frozen allocator (`src/multi-etf-allocator/margin.ts`):
- **U35/U50/U60:** a uniform 35/50/60% on every holding. U35 is Vanguard's published general house requirement.
- **L50/L60:** 50/60% on the funded ETF and 35% elsewhere.
- **G50/G60:** 50/60% on the sector-fund group (the VGT core and lots, XBI, XRT, KRE) and 35% on VOOG.

The 60% variants are hypothetical stresses.

| Run | U35 | U50 | U60 | L50 | L60 | G50 | G60 | U60 minimum date |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | 2.33 | 1.63 | 1.36 | 1.89 | 1.68 | 1.88 | 1.66 | 2020-03-12 |
| B5 | 2.33 | 1.63 | 1.36 | 1.90 | 1.69 | 1.89 | 1.67 | 2020-03-12 |
| B4 symmetric dividends | 2.33 | 1.63 | 1.36 | 1.89 | 1.68 | 1.88 | 1.67 | 2020-03-12 |
| B5 symmetric dividends | 2.33 | 1.63 | 1.36 | 1.90 | 1.69 | 1.89 | 1.67 | 2020-03-12 |
| B4 C1 | 2.33 | 1.63 | 1.36 | 1.89 | 1.68 | 1.88 | 1.66 | 2020-03-12 |
| B4 C2 | 2.33 | 1.63 | 1.36 | 1.89 | 1.67 | 1.87 | 1.65 | 2026-03-02 |
| B4 C3 | 2.33 | 1.63 | 1.36 | 1.89 | 1.67 | 1.87 | 1.65 | 2026-03-02 |
| B5 C1 | 2.33 | 1.63 | 1.36 | 1.90 | 1.69 | 1.88 | 1.66 | 2020-03-12 |
| B5 C2 | 2.33 | 1.63 | 1.36 | 1.90 | 1.69 | 1.88 | 1.66 | 2026-03-02 |
| B5 C3 | 2.33 | 1.63 | 1.36 | 1.90 | 1.68 | 1.88 | 1.66 | 2026-03-02 |

- **Requirements were never close to binding.** At its closest (12 March 2020) the account still had
  1.36× the 60%-uniform requirement and 2.33× the 35% one.
- **Leverage stayed low.** Borrowing never exceeded 0.228 of equity (one lot at 20% of equity, plus drift).
- This is **not** proof of survival under a real broker. House requirements on concentrated sector ETFs can be raised
  without notice exactly in a crash. The engine sells no core to meet a call it does not model.

## Against the 30% preference and the 35% tolerance

| Pool | Max daily % DD (base, C1–C3) | Max minute % DD (base, C1–C3) | D35 (> 35%) | D30 (> 30%) | Base daily vs C0 | Base minute vs C0 | D+ (worse than C0) |
|---|---:|---:|---:|---:|---:|---:|---:|
| B4 | 34.86% | 37.21% | **FLAG** | **FLAG** | +0.75 pp | +1.25 pp | **FLAG** |
| B5 | 30.93% | 33.29% | no flag | **FLAG** | −4.22 pp | −4.68 pp | no flag |

- **The core alone breaches both lines.** The unleveraged core falls 33.89% at the daily close and
  35.76% minute-sampled in the 2022 bear market, and 31.62% in March 2020. A 60/40
  VOOG/VGT core cannot meet a 30% maximum-drawdown objective on this history, with or without an overlay.
  The relevant question is therefore the **incremental** risk the overlay adds.
- **B4 adds drawdown.**
  - Its worst episode is March 2020: 34.65% daily and 37.01% minute. That is worse than C0's worst
    on both measures (+0.75 pp daily, +1.25 pp minute), and worse than C0's own March-2020 episode by about 3 pp.
  - The minute measure exceeds 35%, so **D35, D30 and D+ flags**.
  - In exchange, B4 ends +$1,328,715 above C0.
  - Under C1–C3 the drawdown stays at 34–35% daily and 37% minute while the incremental wealth shrinks (C3:
    +$350,201). So the risk does not fall when the reward does.
- **B5 historically lowers the core's drawdown.**
  - 29.67% daily and 31.09% minute, about 4–5 pp better than C0. **No D35 and no D+ flag**, but a
    **D30 flag**: the minute measure is above 30%, and so are the C2/C3 daily measures (30.93% under C3).
  - B5 ends +$3,131,208 above C0.
  - **This is the frozen point only.** Its median joint parameter neighbour has a 35.2% daily
    drawdown, and 55% of neighbours exceed 35% (`PARAMETER_STABILITY.md`). The reduction is
    produced by two things:
    - the March-2020 slot sequence, in which GDX traded instead of KRE (`TRADE_CONCENTRATION.md`);
    - the frozen pool's large 2022 gains (next point).
  - Plan for C0-like drawdowns of about 34–37% with B5, not 30%.
- **At the frozen parameters, both overlays cushioned 2022.** They made money during the bear market (mostly brief XBI
  dip trades), and both pools' 2022 drawdowns (27.02% / 26.45%) are smaller than C0's
  (33.89%).
- **That cushion does not survive parameter perturbation either.**
  - The frozen pools made $57,017 (B4) and $84,884 (B5) in 2022. The median joint neighbour
    made $7,348 and $6,178.
  - For 118 of 128 B5 neighbours, the worst portfolio drawdown is the 2022 bear market itself, at about
    C0's depth or deeper (see `PARAMETER_STABILITY.md`).
  - So **both** of B5's historical drawdown advantages, in March 2020 and in 2022, belong to the exact frozen
    parameters, not to the strategy family.

## Incremental wealth versus incremental risk

| | End equity | CAGR | vs C0 | Max daily % DD | Max minute % DD |
|---|---:|---:|---:|---:|---:|
| C0 | $2,279,769 | 20.7% | — | 33.89% | 35.76% |
| B4 | $3,608,484 | 26.0% | +$1,328,715 | 34.65% | 37.01% |
| B5 | $5,410,977 | 30.8% | +$3,131,208 | 29.67% | 31.09% |

- **The wealth gains are large**, because overlay profits are reinvested in a core that compounded at about 21% a year
  over 2016–2026.
- **Most of the gap is compounding, not trading profit.** B4's fixed-pool net is $284k, but its portfolio ends $1.33M
  above C0. That reflects 2016–2026 equity returns as much as the overlay itself, and it would shrink with a weaker
  core.
- **The overlay's own risk cost is real but bounded:**
  - one funded lot at 20% of equity;
  - no stop below entry;
  - the worst single lot historically lost 2.02% (KRE 2020-03-18, −$10,296) (B4) and 1.65% (KRE 2020-03-09, −$9,692) (B5) of the equity at its
    decision.

  A gap larger than any in this history inside a lot's hold would cost proportionally more. For example, a 30%
  overnight fall in the funded ETF costs about 6% of equity on top of the core's own fall.
